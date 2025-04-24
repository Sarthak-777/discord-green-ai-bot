import { Message, TextChannel } from 'discord.js';
import fetchMessages from './getMessages';
import { roleSuggestionPrompt } from '../config/prompts';
import model from '../model/ollama';
import { StringOutputParser } from '@langchain/core/output_parsers';

export async function handleSuggestRoleCommand(message: Message) {
  if (!message.channel.isTextBased()) return;
  const args = message.content.split(' ');
  if (args.length < 2) {
    await message.reply(
      'Please specify a username. For example: `!suggestRole @username`'
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
    `Fetching messages from ${targetUser.username}...`
  );

  try {
    const channel = message.channel as TextChannel;
    const allMessages = await fetchMessages(channel, 100);

    const userMessages = allMessages.filter(
      (msg) => msg.author.id === targetUser.id
    );

    if (userMessages.length === 1) {
      await processingMsg.edit(
        `Insufficient messages found from ${targetUser.username} to suggest roles.`
      );
      return;
    }

    const messagesText = userMessages.map((msg) => msg.content).join('\n');
    const chain = roleSuggestionPrompt
      .pipe(model)
      .pipe(new StringOutputParser());

    const roles = await chain.invoke({
      username: targetUser.username,
      messages: messagesText,
    });

    await message.reply(
      `**Suggested roles for ${targetUser.username}:**\n${roles}`
    );
  } catch (error) {
    console.error('Error fetching messages:', error);
    await processingMsg.edit(
      'An error occurred while fetching messages. Please try again later.'
    );
  }
}
