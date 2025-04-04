import { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource,
  NoSubscriberBehavior,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  VoiceConnection,
  entersState,
  AudioPlayer
} from '@discordjs/voice';
import { createReadStream } from 'fs';
import { 
  Client, 
  GatewayIntentBits, 
  Message, 
  VoiceChannel,
  VoiceState
} from 'discord.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create client with proper intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
});

// Store active connections and players
const connections = new Map<string, VoiceConnection>();
const players = new Map<string, AudioPlayer>();

client.once('ready', () => {
  console.log(`Bot is online as ${client.user?.tag}!`);
});

client.on('messageCreate', async (message: Message) => {
  // Ignore messages from bots
  if (message.author.bot) return;
  
  // Parse command
  if (!message.content.startsWith('!')) return;
  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();
  
  // Check if user is in a voice channel
  if (!message.member?.voice.channel) {
    return message.reply('You need to be in a voice channel first!');
  }
  
  const guildId = message.guild?.id;
  if (!guildId) return;
  
  switch (command) {
    case 'join':
      // Join voice channel
      const connection = joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: guildId,
        adapterCreator: message.guild.voiceAdapterCreator,
      });
      
      // Create a new audio player
      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play,
        },
      });
      
      // Store connection and player for later use
      connections.set(guildId, connection);
      players.set(guildId, player);
      
      // Subscribe connection to player
      connection.subscribe(player);
      
      // Handle connection state changes
      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          // Try to reconnect
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch (error) {
          // Cleanup if reconnection fails
          connection.destroy();
          connections.delete(guildId);
          players.delete(guildId);
        }
      });
      
      message.reply('Joined your voice channel!');
      break;
      
    case 'leave':
      // Check if bot is in a voice channel
      if (!connections.has(guildId)) {
        return message.reply('I\'m not in a voice channel!');
      }
      
      // Destroy connection and cleanup
      connections.get(guildId)?.destroy();
      connections.delete(guildId);
      players.delete(guildId);
      
      message.reply('Left the voice channel!');
      break;
      
    case 'play':
      // Check if a sound name was provided
      if (!args[0]) {
        return message.reply('Please specify a sound to play!');
      }
      
      const soundName = args[0].toLowerCase();
      
      // Map sound name to file path
      let soundPath: string;
      switch (soundName) {
        case 'welcome':
          soundPath = './sounds/welcome.wav';
          break;
        case 'music':
          soundPath = './sounds/music.wav';
          break;
        default:
          return message.reply('Unknown sound. Available sounds: welcome, music');
      }
      
      // Join channel if not already connected
      if (!connections.has(guildId)) {
        const newConnection = joinVoiceChannel({
          channelId: message.member.voice.channel.id,
          guildId: guildId,
          adapterCreator: message.guild.voiceAdapterCreator,
        });
        
        const newPlayer = createAudioPlayer({
          behaviors: {
            noSubscriber: NoSubscriberBehavior.Play,
          },
        });
        
        connections.set(guildId, newConnection);
        players.set(guildId, newPlayer);
        
        newConnection.subscribe(newPlayer);
      }
      
      // Create the audio resource
      const resource = createAudioResource(createReadStream(soundPath));
      
      // Stop any current audio and play the new one
      const currentPlayer = players.get(guildId);
      if (currentPlayer) {
        currentPlayer.stop();
        currentPlayer.play(resource);
      }
      
      message.reply(`Now playing: ${soundName}`);
      break;
      
    case 'stop':
      // Check if bot is playing something
      if (!players.has(guildId)) {
        return message.reply('Nothing is playing right now!');
      }
      
      // Stop the player
      players.get(guildId)?.stop();
      message.reply('Stopped playback!');
      break;
      
    case 'pause':
      // Check if bot is playing something
      if (!players.has(guildId)) {
        return message.reply('Nothing is playing right now!');
      }
      
      // Pause the player
      players.get(guildId)?.pause();
      message.reply('Paused playback!');
      break;
      
    case 'resume':
      // Check if bot is playing something
      if (!players.has(guildId)) {
        return message.reply('Nothing is playing right now!');
      }
      
      // Resume the player
      players.get(guildId)?.unpause();
      message.reply('Resumed playback!');
      break;
  }
});

// Handle player state changes
client.on('voiceStateUpdate', (oldState: VoiceState, newState: VoiceState) => {
  // Check if the bot should disconnect (everyone left)
  if (oldState.channelId && 
      !newState.channelId && 
      oldState.channel?.members.size === 1 && 
      oldState.channel.members.first()?.user.bot) {
    
    const guildId = oldState.guild.id;
    
    if (connections.has(guildId)) {
      connections.get(guildId)?.destroy();
      connections.delete(guildId);
      players.delete(guildId);
      console.log(`Left ${oldState.channel.name} because everyone left.`);
    }
  }
});

// Login to Discord
client.login(process.env.BOT_TOKEN); 