import {
  Client,
  GatewayIntentBits,
  Message,
  VoiceState,
  TextChannel,
  ChannelType,
} from "discord.js";
import { MusicQuizDatastore, QuizPack } from "../shared/types/quiz";
import dotenv from "dotenv";
import { MusicQuizSQLiteDatastore } from "../shared/database/sqlite";
import { YtDlp } from "ytdlp-nodejs";
import { GameState } from "./GameState";

// Load environment variables
dotenv.config();

// Create client with proper intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

// Store active games
const activeGames = new Map<string, GameState>();

// Initialize datastore
// TODO: Use remote storage
const datastore: MusicQuizDatastore = new MusicQuizSQLiteDatastore(
  "./sample.sqlite3"
);

// Initialize YTDLP provider
const ytDlp = new YtDlp({
  // TODO: figure out why autodetection is not working
  binaryPath: process.env.YTDLP_PATH || "/Users/frank/.local/bin/yt-dlp",
});

client.once("ready", () => {
  console.log(`Bot is online as ${client.user?.tag}!`);
});

// Handle message commands
client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!quiz")) return;

  const args = message.content.slice(6).trim().split(/ +/);
  const subcommand = args.shift()?.toLowerCase();

  const guildId = message.guild?.id;
  if (!guildId) return;

  const game = activeGames.get(guildId);

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

      if (game) {
        if (game.isGameActive()) {
          return message.reply("이미 진행중인 게임이 있습니다!");
        } else {
          // the game has ended; do deferred cleanup
          activeGames.delete(guildId);
        }
      }

      const packName = args.join(" ");
      const pack = await datastore.getQuizPack(packName);
      if (!pack) {
        return message.reply(
          `플레이리스트 ID "${packName}"을/를 찾을 수 없습니다. !quiz list 를 통해 사용 가능한 플레이리스트를 확인할 수 있습니다.`
        );
      }

      try {
        const game = new GameState(
          guildId,
          pack,
          message.channel as TextChannel,
          ytDlp
        );
        activeGames.set(guildId, game);

        if (
          !message.member?.voice.channel ||
          message.member.voice.channel.type !== ChannelType.GuildVoice
        ) {
          throw new Error("Invalid voice channel type");
        }

        await game.start(
          message.member.voice.channel,
          message.guild!.voiceAdapterCreator
        );
      } catch (error) {
        console.error(error);
        message.reply("게임을 시작하는 중 오류가 발생했습니다.");
        activeGames.delete(guildId);
      }
      break;

    case "stop":
      if (game) {
        await game.end();
        activeGames.delete(guildId);
        message.reply("게임 종료됨!");
      } else {
        message.reply("현재 진행중인 게임이 없습니다!");
      }
      break;

    case "scores":
      const currentGame = activeGames.get(guildId);
      if (!currentGame || !currentGame.isGameActive()) {
        return message.reply("현재 진행중인 게임이 없습니다!");
      }

      const scores = currentGame.getScores();
      let scoreMessage = "현재 점수:\n";
      const sortedScores = [...scores.entries()].sort(([, a], [, b]) => b - a);

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
\`!quiz start [플레이리스트 ID]\` - 지정된 플레이리스트를 가지고 새 게임을 시작합니다.
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
        "잘못된 명령어입니다. `!quiz help`를 통해 사용 가능한 명령어를 확인하세요."
      );
  }
});

// Handle answer checking
client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;

  const guildId = message.guild?.id;
  if (!guildId) return;

  const game = activeGames.get(guildId);
  if (game?.isGameActive()) {
    await game.checkAnswer(message);
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
    const game = activeGames.get(guildId);
    if (game) {
      game.end();
      activeGames.delete(guildId);
    }
  }
});

// Login to Discord
client.login(process.env.BOT_TOKEN);
