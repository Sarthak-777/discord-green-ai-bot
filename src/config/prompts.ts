import { ChatPromptTemplate } from '@langchain/core/prompts';

const generalSummaryPrompt = ChatPromptTemplate.fromTemplate(`
    You are a helpful Discord bot that summarizes conversations. Below is a chat history:
    
    {messages}
    
    Please provide a clear, concise summary of the main discussion points, decisions, and important information from this conversation.
    `);

const userSpecificSummaryPrompt = ChatPromptTemplate.fromTemplate(`
    You are a helpful Discord bot that analyzes user messages. Below are messages from a specific user:
    
    Username: {username}
    Messages:
    {messages}
    
    Please provide a summary of the main points, contributions, and patterns in this user's messages.
    `);

const conversationQAPrompt = ChatPromptTemplate.fromTemplate(`
        You are a helpful Discord bot that can answer questions about conversation history. 
        Below is the recent conversation history:
        
        {messages}
        
        Based on the conversation above, please answer the following question:
        Question: {question}
        
        If the question cannot be answered based on the provided conversation history, 
        politely state that you don't have enough information to answer accurately.
        `);

const fileContextPrompt = ChatPromptTemplate.fromTemplate(`
          You are a helpful assistant that only provides answers based on the document provided by the user. Your response will be associated with only the document provided by the user.
          Answer the user's question.
          Context: {context}
          Question: {input}
      `);

export {
  generalSummaryPrompt,
  userSpecificSummaryPrompt,
  conversationQAPrompt,
  fileContextPrompt,
};
