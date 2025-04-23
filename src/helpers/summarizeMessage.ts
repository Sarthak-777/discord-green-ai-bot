import { Message, TextChannel } from 'discord.js';
import {
  generalSummaryPrompt,
  userSpecificSummaryPrompt,
} from '../config/prompts';
import model from '../model/ollama';
import { StringOutputParser } from '@langchain/core/output_parsers';
import fetchMessages from './getMessages';

export async function handleSummarizeCommand(message: Message) {
  if (!message.channel.isTextBased()) return;

  const args = message.content.split(' ');
  const limit = args[1] ? parseInt(args[1]) : 100;

  await message.reply('Fetching and summarizing messages...');

  try {
    const channel = message.channel as TextChannel;
    const messages = await fetchMessages(channel, limit);

    if (messages.length === 0) {
      await message.reply('No messages found to summarize.');
      return;
    }

    const messagesText = messages
      .filter((msg) => !msg.author.bot)
      .map((msg) => `${msg.author.username}: ${msg.content}`)
      .reverse()
      .join('\n');

    console.log(messagesText);

    const chain = generalSummaryPrompt
      .pipe(model)
      .pipe(new StringOutputParser());
    const summary = await chain.invoke({
      messages: messagesText,
    });

    await message.reply(
      `**Summary of the last ${messages.length} messages:**\n${summary}`
    );
  } catch (error) {
    console.error('Error generating summary:', error);
    await message.reply(
      'Sorry, I had trouble generating a summary. Please try again later.'
    );
  }
}

export async function handleUserSummaryCommand(message: Message) {
  if (!message.channel.isTextBased()) return;

  const args = message.content.split(' ');
  if (args.length < 2) {
    await message.reply(
      'Please specify a username. For example: `!userSummary @username`'
    );
    return;
  }

  const targetUser = message.mentions.users.first();
  if (!targetUser) {
    await message.reply(
      'Could not find the specified user. Please mention them with @.'
    );
    return;
  }

  await message.reply(
    `Fetching and summarizing messages from ${targetUser.username}...`
  );

  try {
    const channel = message.channel as TextChannel;
    const allMessages = await fetchMessages(channel, 100);

    const userMessages = allMessages.filter(
      (msg) => msg.author.id === targetUser.id
    );

    if (userMessages.length === 0) {
      await message.reply(
        `No messages found from ${targetUser.username} in the recent history.`
      );
      return;
    }

    // Format messages for the prompt
    const messagesText = userMessages.map((msg) => msg.content).join('\n');

    // Generate summary using LangChain
    const chain = userSpecificSummaryPrompt
      .pipe(model)
      .pipe(new StringOutputParser());
    const summary = await chain.invoke({
      username: targetUser.username,
      messages: messagesText,
    });

    await message.reply(
      `**Summary of ${targetUser.username}'s messages:**\n${summary}`
    );
  } catch (error) {
    console.error('Error generating user summary:', error);
    await message.reply(
      'Sorry, I had trouble generating a summary. Please try again later.'
    );
  }
}
