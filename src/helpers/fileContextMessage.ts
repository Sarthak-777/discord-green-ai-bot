import { Message, MessageCollector } from 'discord.js';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { PPTXLoader } from '@langchain/community/document_loaders/fs/pptx';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OllamaEmbeddings } from '@langchain/ollama';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import model from '../model/ollama';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { fileContextPrompt } from '../config/prompts';
import { Document } from '@langchain/core/documents';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { TextLoader } from 'langchain/document_loaders/fs/text';

const handleTxtFile = async (filePath: string) => {
  const loader = new TextLoader(filePath);
  const documents = await loader.load();
  return handleFileProcessing(documents);
};

const handlePdfFile = async (filePath: string) => {
  const loader = new PDFLoader(filePath);
  const documents = await loader.load();
  return handleFileProcessing(documents);
};

const handlePptxFile = async (filePath: string) => {
  const loader = new PPTXLoader(filePath);
  const documents = await loader.load();
  return handleFileProcessing(documents);
};

const handleDocFile = async (filePath: string) => {
  const loader = new DocxLoader(filePath, {
    type: 'doc',
  });
  const documents = await loader.load();
  return handleFileProcessing(documents);
};

const handleDocxFile = async (filePath: string) => {
  const loader = new DocxLoader(filePath);
  const documents = await loader.load();
  return handleFileProcessing(documents);
};

const handleFileProcessing = async (
  documents: Document<Record<string, any>>[]
) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 2000,
    chunkOverlap: 300,
  });
  const splitDocs = await splitter.splitDocuments(documents || []);

  console.log('Creating vector store...');
  const embeddings = new OllamaEmbeddings({
    model: 'nomic-embed-text',
  });
  const vectorStore = await MemoryVectorStore.fromDocuments(
    splitDocs,
    embeddings
  );
  const retriever = vectorStore.asRetriever({
    k: 3,
    searchType: 'similarity',
  });

  return retriever;
};

const handleFileExt = (fileExt: string, filePath: string) => {
  switch (fileExt) {
    case '.txt':
      return handleTxtFile(filePath);
    case '.pdf':
      return handlePdfFile(filePath);
    case '.doc':
      return handleDocFile(filePath);
    case '.docx':
      return handleDocxFile(filePath);
    case '.pptx':
      return handlePptxFile(filePath);
    default:
      console.log('Unsupported file type');
  }
};

function splitResponse(text: string, maxLength: number = 1900): string[] {
  const chunks: string[] = [];

  for (let i = 0; i < text.length; i += maxLength) {
    chunks.push(text.substring(i, i + maxLength));
  }

  return chunks;
}

const handleQuestions = async (
  retrievalChain: any,
  message: Message,
  processingMsg: Message
) => {
  await processingMsg.edit(
    '✅ File processed! You can now ask questions about the content. Type `exit` to end the session.'
  );

  const filter = (m: Message) =>
    m.author.id === message.author.id && m.channelId === message.channelId;
  const collector = new MessageCollector(message.channel, {
    filter,
    time: 900000,
  });

  let isProcessing = false;

  collector.on('collect', async (msg: Message) => {
    if (isProcessing) return;

    const question = msg.content.trim();

    if (question.toLowerCase() === 'exit') {
      await msg.reply('Ending Q&A session. Goodbye!');
      collector.stop();
      return;
    }

    isProcessing = true;

    const replyMsg = await msg.reply('🔍 Processing your question...');

    try {
      const response = await retrievalChain.invoke({
        input: question,
      });

      if (response.answer && response.answer.length > 0) {
        if (response.answer.length > 2000) {
          await replyMsg.delete().catch(() => {});
          const chunks = splitResponse(response.answer);
          for (const chunk of chunks) {
            await msg.reply(chunk);
          }
        } else {
          await msg.reply(response.answer);
        }
      } else {
        await msg.reply(
          "I couldn't find relevant information in the document to answer your question."
        );
      }
    } catch (error) {
      console.error('Error answering question:', error);
      await msg.reply(
        'Sorry, I encountered an error while processing your question.'
      );
    } finally {
      isProcessing = false;
    }
  });

  collector.on('end', () => {
    if (!isProcessing) {
      processingMsg.edit(
        '❌ Q&A session ended due to inactivity. Type `!file` to start again.'
      );
    }
  });
};

const handleFileCommand = async (message: Message) => {
  const chain = await createStuffDocumentsChain({
    llm: model,
    prompt: fileContextPrompt,
  });

  if (message.attachments.size === 0) {
    await message.reply('Please attach a file to summarize.');
    return;
  }
  const processingMsg = await message.reply('Processing your file...');
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  const attachment = message.attachments.first();
  if (!attachment) {
    await processingMsg.edit('No valid attachment found.');
    return;
  }
  const filePath = path.join(tempDir, attachment.name);

  try {
    const response = await axios({
      method: 'GET',
      url: attachment.url,
      responseType: 'arraybuffer',
    });
    fs.writeFileSync(filePath, Buffer.from(response.data));

    const fileExt = path.extname(attachment.name).toLowerCase();
    const retriever = await handleFileExt(fileExt, filePath);
    if (!retriever) {
      await processingMsg.edit(
        'Unsupported file type or error processing the file.'
      );
      return;
    }
    const retrievalChain = await createRetrievalChain({
      combineDocsChain: chain,
      retriever: retriever,
    });

    console.log('Ready to answer your questions...');
    handleQuestions(retrievalChain, message, processingMsg);
  } catch (e) {
    console.error('Error downloading file:', e);
    await processingMsg.edit('Error downloading the file. Please try again.');
    return;
  }
};

export { handleFileCommand };
