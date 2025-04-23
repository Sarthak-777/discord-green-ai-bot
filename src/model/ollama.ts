import { ChatOllama } from '@langchain/ollama';

const model = new ChatOllama({
  model: 'llama3.1:8b',
  temperature: 0.7,
});

export default model;
