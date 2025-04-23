import { Message, TextChannel } from 'discord.js';
import { conversationQAPrompt } from '../config/prompts';
import model from '../model/ollama';
import { StringOutputParser } from '@langchain/core/output_parsers';
import fetchMessages from './getMessages';

const channelMessageCache: Map<string, Message[]> = new Map();
const CACHE_LIMIT = 500;

async function getMessagesForContext(
  channel: TextChannel,
  limit: number = 100
): Promise<Message[]> {
  const channelId = channel.id;
  let cachedMessages = channelMessageCache.get(channelId) || [];

  if (cachedMessages.length >= limit) {
    return cachedMessages.slice(cachedMessages.length - limit);
  } else {
    const messages = await fetchMessages(channel, limit);
    channelMessageCache.set(channelId, messages);
    return messages;
  }
}

export function updateMessageCache(message: Message) {
  if (!message.channel.isTextBased()) return;

  const channelId = message.channel.id;
  let channelCache = channelMessageCache.get(channelId) || [];

  channelCache.push(message);

  if (channelCache.length > CACHE_LIMIT) {
    channelCache = channelCache.slice(channelCache.length - CACHE_LIMIT);
  }

  channelMessageCache.set(channelId, channelCache);
}

export async function handleAskCommand(message: Message) {
  if (!message.channel.isTextBased()) return;

  const question = message.content.substring('!ask'.length).trim();

  if (!question) {
    await message.reply(
      'Please include a question. For example: `!ask What was decided about the project deadline?`'
    );
    return;
  }

  await message.reply('Searching conversation history for an answer...');

  try {
    const channel = message.channel as TextChannel;
    const messages = await getMessagesForContext(channel, 100);

    if (messages.length === 0) {
      await message.reply('No conversation history found to answer from.');
      return;
    }

    const messagesText = messages
      .filter((msg) => !msg.author.bot)
      .map((msg) => `${msg.author.username}: ${msg.content}`)
      .reverse()
      .join('\n');

    const chain = conversationQAPrompt
      .pipe(model)
      .pipe(new StringOutputParser());
    const answer = await chain.invoke({
      messages: messagesText,
      question: question,
    });

    await message.reply(`**Question:** ${question}\n\n**Answer:** ${answer}`);
  } catch (error) {
    console.error('Error answering question:', error);
    await message.reply(
      'Sorry, I had trouble answering your question. Please try again later.'
    );
  }
}
