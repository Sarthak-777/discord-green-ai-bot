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
         You are a helpful AI assistant that answers questions based ONLY on the provided document context.

         CONTEXT:
         {context}

         QUESTION:
         {input}

         INSTRUCTIONS:
         1. Answer the question using ONLY information from the CONTEXT provided above.
         2. If the answer is not contained within the context, respond with "I don't have enough information in the document to answer this question" - do NOT make up an answer.
         3. Keep your answers concise, factual, and directly relevant to the question.
         4. If the context contains information that directly contradicts or corrects the question's assumptions, politely point this out.
         5. Do not reference that you're looking at a "context" or "documents" in your answer - simply provide the information as if you know it.
         6. If the context is technical, match the technical level in your response.
         7. If the question asks for a list or steps, format them as numbered points for clarity.

         Your answer:
      `);

const roleSuggestionPrompt = ChatPromptTemplate.fromTemplate(`
          You are a helpful assistant that suggests roles based on the user's messages.
          Below are the messages from the user:
          {messages}
          Please suggest roles based on the content of these messages without any description.
          List out the name of the roles without any description.
          If the user has not provided enough information to suggest a role, politely state that you don't have enough information to make a suggestion.`);

const writeContentPrompt = ChatPromptTemplate.fromTemplate(`
            You are a helpful assistant that writes content based on the user's request.
            Below is the user's request:
            {request}
            Please write the content based on the user's request with minimun 1000 characters and maximum 2000 characters.
            `);
export {
  generalSummaryPrompt,
  userSpecificSummaryPrompt,
  conversationQAPrompt,
  fileContextPrompt,
  roleSuggestionPrompt,
  writeContentPrompt,
};
