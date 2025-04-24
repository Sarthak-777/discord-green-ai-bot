import * as dotenv from 'dotenv';
import { Events } from 'discord.js';
import discordClient from './config/discordConfig';
import {
  handleSummarizeCommand,
  handleUserSummaryCommand,
} from './helpers/summarizeMessage';
import {
  handleAskCommand,
  updateMessageCache,
} from './helpers/getMessageHistory';
import { handleFileCommand } from './helpers/fileContextMessage';
import { handleSuggestRoleCommand } from './helpers/suggestRole';
import { handleWriteContentCommand } from './helpers/writeContentCommand';

dotenv.config();

discordClient.once(Events.ClientReady, () => {
  if (discordClient.user) {
    console.log(`Logged in as ${discordClient.user.tag}`);
  } else {
    console.error('Client user is null.');
  }
});

discordClient.on(Events.MessageCreate, async (message) => {
  updateMessageCache(message);
  if (message.author.bot) return;

  if (message.content.startsWith('!summarize')) {
    await handleSummarizeCommand(message);
  }

  if (message.content.startsWith('!userSummary')) {
    await handleUserSummaryCommand(message);
  }

  if (message.content.startsWith('!ask')) {
    await handleAskCommand(message);
  }

  if (message.content.startsWith('!file')) {
    await handleFileCommand(message);
  }

  if (message.content.startsWith('!suggestRole')) {
    await handleSuggestRoleCommand(message);
  }

  if (message.content.startsWith('!write')) {
    await handleWriteContentCommand(message);
  }

  if (message.content.startsWith('!help')) {
    await message.reply(
      'Available commands: `!summarize`, `!userSummary`, `!ask`, `!file`, `!suggestRole`, `!write`, ``!help`'
    );
  }
});

discordClient.login(process.env.DISCORD_TOKEN);
