import { Message } from 'discord.js';
import { writeContentPrompt } from '../config/prompts';
import model from '../model/ollama';
import { StringOutputParser } from '@langchain/core/output_parsers';

export const handleWriteContentCommand = async (message: Message) => {
  const userPrompt = message.content.slice('!write'.length).trim();

  const processingMsg = await message.reply(
    `📝 Working on writing content about: "${userPrompt}". This may take a moment...`
  );

  try {
    if (message.channel.isTextBased() && 'sendTyping' in message.channel) {
      await message.channel.sendTyping();
    }

    const chain = writeContentPrompt.pipe(model).pipe(new StringOutputParser());
    const content = await chain.invoke({
      request: userPrompt,
    });

    if (content.length <= 2000) {
      await processingMsg.edit(content);
    } else {
      // If content is longer than 2000 characters, split it and send multiple messages
      await processingMsg.edit(`Here's your content about "${userPrompt}":`);

      // Split content into chunks
      const chunks = splitTextIntoChunks(content, 1950);

      for (const chunk of chunks) {
        if (message.channel.isTextBased()) {
          if ('send' in message.channel) {
            await message.channel.send(chunk);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error writing content:', error);
    await processingMsg.edit(
      '❌ An error occurred while writing the content. Please try again later.'
    );
  }
};

function splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];

  // Try to split at paragraph or heading boundaries when possible
  let remainingText = text;

  while (remainingText.length > 0) {
    if (remainingText.length <= maxChunkSize) {
      chunks.push(remainingText);
      break;
    }

    // Try to find a good splitting point
    // First priority: Split at paragraph breaks
    let splitIndex = remainingText.lastIndexOf('\n\n', maxChunkSize);

    // Second priority: Split at headings
    if (splitIndex === -1 || splitIndex < maxChunkSize / 2) {
      const headingMatch = remainingText
        .substring(0, maxChunkSize)
        .lastIndexOf('\n#');
      if (headingMatch > maxChunkSize / 2) {
        splitIndex = headingMatch;
      }
    }

    // Third priority: Split at line breaks
    if (splitIndex === -1 || splitIndex < maxChunkSize / 2) {
      splitIndex = remainingText.lastIndexOf('\n', maxChunkSize);
    }

    // Fourth priority: Split at sentences
    if (splitIndex === -1 || splitIndex < maxChunkSize / 2) {
      splitIndex = remainingText.lastIndexOf('. ', maxChunkSize);
    }

    // Last resort: Split at a space
    if (splitIndex === -1 || splitIndex < maxChunkSize / 2) {
      splitIndex = remainingText.lastIndexOf(' ', maxChunkSize);
    }

    // If all else fails, just split at the max length
    if (splitIndex === -1) {
      splitIndex = maxChunkSize;
    }

    // Add the chunk
    chunks.push(remainingText.substring(0, splitIndex));

    // Update remaining text
    remainingText = remainingText.substring(splitIndex).trim();
  }

  return chunks;
}
