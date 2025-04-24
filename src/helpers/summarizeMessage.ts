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

  const processingMsg = await message.reply(
    `Fetching and summarizing messages from ${targetUser.username}...`
  );

  try {
    const channel = message.channel as TextChannel;
    const allMessages = await fetchMessages(channel, 100);

    const userMessages = allMessages.filter(
      (msg) => msg.author.id === targetUser.id
    );

    if (userMessages.length === 0) {
      await processingMsg.edit(
        `No messages found from ${targetUser.username} in the recent history.`
      );
      return;
    }

    const messagesText = userMessages.map((msg) => msg.content).join('\n');

    const chain = userSpecificSummaryPrompt
      .pipe(model)
      .pipe(new StringOutputParser());
    const summary = await chain.invoke({
      username: targetUser.username,
      messages: messagesText,
    });

    const header = `**Summary of ${targetUser.username}'s messages:**\n`;
    const maxContentLength = 2000 - header.length;

    if (summary.length <= maxContentLength) {
      await processingMsg.edit(`${header}${summary}`);
    } else {
      await processingMsg.edit(header);

      const chunks = splitTextIntoChunks(summary, 1900);

      for (const chunk of chunks) {
        if (message.channel.isTextBased()) {
          if (message.channel.isTextBased() && 'send' in message.channel) {
            await message.channel.send(chunk);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error generating user summary:', error);
    await processingMsg.edit(
      'Sorry, I had trouble generating a summary. Please try again later.'
    );
  }
}

function splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
  const chunks: string[] = [];

  let remainingText = text;

  while (remainingText.length > 0) {
    if (remainingText.length <= maxChunkSize) {
      chunks.push(remainingText);
      break;
    }

    // Find a good split point
    let splitIndex = remainingText.lastIndexOf('\n\n', maxChunkSize);
    if (splitIndex === -1 || splitIndex < maxChunkSize / 2) {
      splitIndex = remainingText.lastIndexOf('. ', maxChunkSize);
    }
    if (splitIndex === -1 || splitIndex < maxChunkSize / 2) {
      splitIndex = remainingText.lastIndexOf(' ', maxChunkSize);
    }
    if (splitIndex === -1) {
      splitIndex = maxChunkSize;
    }

    // Add the chunk and continue with remaining text
    chunks.push(remainingText.substring(0, splitIndex + 1));
    remainingText = remainingText.substring(splitIndex + 1);
  }

  return chunks;
}
