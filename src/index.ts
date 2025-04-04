import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  VoiceConnection,
  entersState,
  AudioPlayer,
} from "@discordjs/voice";
import {
  Client,
  GatewayIntentBits,
  Message,
  VoiceState,
  TextChannel,
} from "discord.js";
import { MusicQuizDatastore, QuizPack, QuizEntry } from "./types/quiz";
import ytdl from "ytdl-core";
import dotenv from "dotenv";
import { MusicQuizSQLiteDatastore } from "./types/sqlite-datastore";

// Load environment variables
dotenv.config();

interface GameState {
  isActive: boolean;
  currentRound: number;
  scores: Map<string, number>;
  currentPack?: QuizPack;
  currentEntry?: QuizEntry;
  textChannel?: TextChannel;
}

// Create client with proper intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

// Store active connections, players and game states
const connections = new Map<string, VoiceConnection>();
const players = new Map<string, AudioPlayer>();
const gameStates = new Map<string, GameState>();

// Initialize datastore
// TODO: Use remote storage
const datastore: MusicQuizDatastore = new MusicQuizSQLiteDatastore(
  "./sample.sqlite3"
);

client.once("ready", () => {
  console.log(`Bot is online as ${client.user?.tag}!`);
});

async function startQuiz(message: Message, packNameExploded: string[]) {
  let packName = packNameExploded.join(" ");
  const guildId = message.guild?.id;
  if (!guildId) return;

  // Get quiz pack
  const packs = await datastore.listQuizPacks();
  const pack = packs.find(
    (p: QuizPack) => p.name.toLowerCase() === packName.toLowerCase()
  );

  if (!pack) {
    return message.reply(
      `Quiz pack "${packName}" not found. Use !quiz list to see available packs.`
    );
  }

  // Initialize game state
  const gameState: GameState = {
    isActive: true,
    currentRound: 0,
    scores: new Map(),
    currentPack: pack,
    textChannel: message.channel as TextChannel,
  };
  gameStates.set(guildId, gameState);

  // Join voice channel
  const connection = joinVoiceChannel({
    channelId: message.member!.voice.channel!.id,
    guildId: guildId,
    adapterCreator: message.guild!.voiceAdapterCreator,
  });

  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play,
    },
  });

  connections.set(guildId, connection);
  players.set(guildId, player);
  connection.subscribe(player);

  // Announce quiz start
  if (message.channel instanceof TextChannel) {
    message.channel.send(
      `🎮 Starting quiz with pack: **${pack.name}**\n\n**Rules:**\n- Listen to the song clip\n- Type the song name or artist in the chat\n- First correct answer gets a point\n- After all rounds, the player with the most points wins!`
    );
  }

  // Start first round after a short delay
  setTimeout(() => playNextRound(guildId), 5000);
}

async function playNextRound(guildId: string) {
  const gameState = gameStates.get(guildId);
  if (!gameState || !gameState.currentPack) return;

  if (gameState.currentRound >= gameState.currentPack.entries.length) {
    // Quiz is finished
    endQuiz(guildId);
    return;
  }

  const entry = gameState.currentPack.entries[gameState.currentRound];
  gameState.currentEntry = entry;

  // Create YouTube stream
  const stream = ytdl(`https://www.youtube.com/watch?v=${entry.ytVideoId}`, {
    filter: "audioonly",
    begin: entry.songStart * 1000, // Convert to milliseconds
  });

  const resource = createAudioResource(stream);
  const player = players.get(guildId);

  if (player) {
    player.play(resource);

    // Stop playing after duration
    setTimeout(() => {
      player.stop();
    }, entry.playDuration * 1000);
  }

  if (gameState.textChannel) {
    gameState.textChannel.send(
      `🎵 Round ${gameState.currentRound + 1}/${
        gameState.currentPack.entries.length
      } - Start guessing!`
    );
  }
}

function endQuiz(guildId: string) {
  const gameState = gameStates.get(guildId);
  if (!gameState) return;

  // Display final scores
  let scoreMessage = "🏆 Final Scores:\n";
  const sortedScores = [...gameState.scores.entries()].sort(
    ([, a], [, b]) => b - a
  );

  if (sortedScores.length === 0) {
    scoreMessage += "No one scored any points!";
  } else {
    sortedScores.forEach(([userId, score], index) => {
      scoreMessage += `${index + 1}. <@${userId}>: ${score} points\n`;
    });
  }

  if (gameState.textChannel) {
    gameState.textChannel.send(scoreMessage);
  }

  // Cleanup
  connections.get(guildId)?.destroy();
  connections.delete(guildId);
  players.delete(guildId);
  gameStates.delete(guildId);
}

// Handle message commands
client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!quiz")) return;

  const args = message.content.slice(6).trim().split(/ +/);
  const subcommand = args.shift()?.toLowerCase();

  const guildId = message.guild?.id;
  if (!guildId) return;

  switch (subcommand) {
    case "start":
      if (!message.member?.voice.channel) {
        return message.reply(
          "You need to be in a voice channel to start a quiz!"
        );
      }

      if (!args[0]) {
        return message.reply("Please specify a quiz pack name!");
      }

      await startQuiz(message, args.slice(0));
      break;

    case "stop":
      if (gameStates.has(guildId)) {
        endQuiz(guildId);
        message.reply("Quiz stopped!");
      } else {
        message.reply("No active quiz to stop!");
      }
      break;

    case "scores":
      const gameState = gameStates.get(guildId);
      if (!gameState || !gameState.isActive) {
        return message.reply("No active quiz!");
      }

      let scoreMessage = "Current Scores:\n";
      const sortedScores = [...gameState.scores.entries()].sort(
        ([, a], [, b]) => b - a
      );

      if (sortedScores.length === 0) {
        scoreMessage += "No one has scored yet!";
      } else {
        sortedScores.forEach(([userId, score]) => {
          scoreMessage += `<@${userId}>: ${score} points\n`;
        });
      }

      if (message.channel instanceof TextChannel) {
        message.channel.send(scoreMessage);
      }
      break;

    case "list":
      const packs = await datastore.listQuizPacks();
      if (packs.length === 0) {
        return message.reply("No quiz packs available!");
      }

      const packList = packs
        .map((pack: QuizPack) => `- **${pack.name}**: ${pack.description}`)
        .join("\n");
      if (message.channel instanceof TextChannel) {
        message.channel.send(`Available quiz packs:\n${packList}`);
      }
      break;

    case "help":
      const helpMessage = `
**Music Quiz Bot Commands:**
\`!quiz start [pack_name]\` - Start a new quiz with the specified pack
\`!quiz stop\` - End the current quiz session
\`!quiz scores\` - Show current scores
\`!quiz list\` - List available quiz packs
\`!quiz help\` - Show this help message
      `;
      if (message.channel instanceof TextChannel) {
        message.channel.send(helpMessage);
      }
      break;

    default:
      message.reply(
        "Unknown command. Use `!quiz help` to see available commands."
      );
  }
});

// Handle answer checking
client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;

  const guildId = message.guild?.id;
  if (!guildId) return;

  const gameState = gameStates.get(guildId);
  if (!gameState?.isActive || !gameState.currentEntry) return;

  const answer = message.content.toLowerCase();
  const correctAnswers = gameState.currentEntry.possibleAnswers.map((a) =>
    a.toLowerCase()
  );

  if (correctAnswers.includes(answer)) {
    // Update score
    const currentScore = gameState.scores.get(message.author.id) || 0;
    gameState.scores.set(message.author.id, currentScore + 1);

    // Announce correct answer
    if (message.channel instanceof TextChannel) {
      message.channel.send(
        `🎉 ${message.author} got it right! The song was "${gameState.currentEntry.canonicalName}" by ${gameState.currentEntry.performer}`
      );
    }

    // Move to next round
    gameState.currentRound++;

    // Wait a moment before starting the next round
    setTimeout(() => playNextRound(guildId), 3000);
  }
});

// Handle disconnection cleanup
client.on("voiceStateUpdate", (oldState: VoiceState, newState: VoiceState) => {
  if (
    oldState.channelId &&
    !newState.channelId &&
    oldState.channel?.members.size === 1 &&
    oldState.channel.members.first()?.user.bot
  ) {
    const guildId = oldState.guild.id;
    endQuiz(guildId);
  }
});

// Login to Discord
client.login(process.env.BOT_TOKEN);
