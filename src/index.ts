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
import dotenv from "dotenv";
import { MusicQuizSQLiteDatastore } from "./types/sqlite-datastore";
import { YtDlp } from "ytdlp-nodejs";
import { createStreamBridge } from "./utils";

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

// Initialize YTDLP provider
const ytDlp = new YtDlp({
  // TODO: figure out why autodetection is not working
  binaryPath: "/Users/frank/.local/bin/yt-dlp",
});

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
      `🎮 **${pack.name}** 플레이리스트로 게임을 시작합니다!\n
**규칙:**
- 재생되는 노래를 잘 들어주세요.
- 채팅으로 노래 제목을 맞취주세요.
- 첫번째로 정답을 맞춘 사람이 점수를 획득합니다.
- 가장 많은 점수를 획득한 플레이어가 승리합니다!`
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

  const sectionSpec = (() => {
    let sectionStart = entry.songStart || 0;
    let sectionEnd = "";
    if (entry.playDuration > 0) {
      sectionEnd = `${sectionStart + entry.playDuration}`;
    }
    return `*${sectionStart}-${sectionEnd}`;
  })();

  const ytdlpStream = ytDlp.stream(
    `https://www.youtube.com/watch?v=${entry.ytVideoId}`,
    {
      format: "bestaudio",
      downloadSections: sectionSpec,
      postprocessorArgs: {
        af: ["loudnorm"],
      },
    }
  );
  const duplexStream = createStreamBridge();
  ytdlpStream.pipe(duplexStream);

  const resource = createAudioResource(duplexStream);
  const player = players.get(guildId);

  if (player) {
    player.play(resource);

    const playDuration = entry.playDuration > 0 ? entry.playDuration : Infinity;
    // Stop playing after duration
    setTimeout(
      () => advanceWithoutWinning(guildId, "시간 초과"),
      Math.min(playDuration * 1000, 60000) // Cap max playtime at 60 seconds
    );
  }

  if (gameState.textChannel) {
    gameState.textChannel.send(
      `🎵 문제 ${gameState.currentRound + 1}/${
        gameState.currentPack.entries.length
      }`
    );
  }
}

function advanceWithoutWinning(guildId: string, reason: string) {
  const gameState = gameStates.get(guildId);
  if (!gameState || !gameState.currentPack) return;

  const player = players.get(guildId);
  if (player) {
    player.stop();
  }

  let answerText = "";
  if (gameState.currentEntry) {
    answerText = `\n정답은: ${gameState.currentEntry.performer} - "${gameState.currentEntry.canonicalName}"`;
  }
  let teaser = "";
  if (gameState.currentRound + 1 < gameState.currentPack.entries.length) {
    teaser = "\n\n다음 노래가 곧 재생됩니다!";
  }
  gameState.textChannel?.send(`➡️ ${reason}!${answerText}${teaser}`);

  // Move to next round
  gameState.currentRound++;

  // Wait a moment before starting the next round
  setTimeout(() => playNextRound(guildId), 3000);
}

function endQuiz(guildId: string) {
  const gameState = gameStates.get(guildId);
  if (!gameState) return;

  // Display final scores
  let scoreMessage = "🏆 최종 점수:\n";
  const sortedScores = [...gameState.scores.entries()].sort(
    ([, a], [, b]) => b - a
  );

  if (sortedScores.length === 0) {
    scoreMessage += "아무도 점수를 획득하지 못했습니다!";
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
          "음성 채널에 들어가 있어야 게임을 시작할 수 있습니다!"
        );
      }

      if (!args[0]) {
        return message.reply("플레이리스트 이름을 지정해주세요!");
      }

      await startQuiz(message, args.slice(0));
      break;

    case "stop":
      if (gameStates.has(guildId)) {
        endQuiz(guildId);
        message.reply("게임 종료됨!");
      } else {
        message.reply("현재 진행중인 게임이 없습니다!");
      }
      break;

    case "scores":
      const gameState = gameStates.get(guildId);
      if (!gameState || !gameState.isActive) {
        return message.reply("현재 진행중인 게임이 없습니다!");
      }

      let scoreMessage = "현재 점수:\n";
      const sortedScores = [...gameState.scores.entries()].sort(
        ([, a], [, b]) => b - a
      );

      if (sortedScores.length === 0) {
        scoreMessage += "아직 점수를 획득한 사람이 없습니다!";
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
        return message.reply("사용 가능한 플레이리스트가 없습니다!");
      }

      const packList = packs
        .map((pack: QuizPack) => `- **${pack.name}**: ${pack.description}`)
        .join("\n");
      if (message.channel instanceof TextChannel) {
        message.channel.send(`사용 가능한 플레이리스트:\n${packList}`);
      }
      break;

    case "help":
      const helpMessage = `
**SQBot 명령어:**
\`!quiz start [플레이리스트 명 또는 ID]\` - 지정된 플레이리스트를 가지고 새 게임을 시작합니다.
\`!quiz stop\` - 현재 진행중인 게임을 중단합니다.
\`!quiz scores\` - 현재 게임의 점수판을 표시합니다.
\`!quiz list\` - 사용 가능한 플레이리스트를 표시합니다.
\`!quiz help\` - 이 도움말을 표시합니다.
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
  const entry = gameState.currentEntry;
  let correctAnswers = [
    entry.canonicalName,
    ...gameState.currentEntry.possibleAnswers,
  ];
  // Generate possible acceptable answers
  let expandedAnswerSet = correctAnswers.reduce((acc, x) => {
    let lowercase = x.toLowerCase();
    let withoutSpacing = x.replace(" ", "");
    acc.add(lowercase);
    acc.add(withoutSpacing);
    acc.add(withoutSpacing.toLowerCase());
    acc.add(x);
    return acc;
  }, new Set());

  if (expandedAnswerSet.has(answer)) {
    // Update score
    const currentScore = gameState.scores.get(message.author.id) || 0;
    gameState.scores.set(message.author.id, currentScore + 1);

    // Announce correct answer
    if (message.channel instanceof TextChannel) {
      message.channel.send(
        `🎉 ${message.author}님이 정답을 맞췄습니다! 정답은 ${gameState.currentEntry.performer} - "${gameState.currentEntry.canonicalName}"였습니다!`
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
