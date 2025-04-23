import { Message, TextChannel } from 'discord.js';

export default async function fetchMessages(
  channel: TextChannel,
  limit: number = 100
): Promise<Message[]> {
  try {
    const messages = await channel.messages.fetch({ limit });
    return Array.from(messages.values());
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}
