import {
  VoiceConnection,
  AudioPlayer,
  joinVoiceChannel,
  createAudioPlayer,
  NoSubscriberBehavior,
  createAudioResource,
} from "@discordjs/voice";
import { TextChannel, Message, VoiceChannel } from "discord.js";
import { QuizPack, QuizEntry } from "../shared/types/quiz";
import { YtDlp } from "ytdlp-nodejs";
import { createStreamBridge } from "../utils";

export class GameState {
  private isActive: boolean = false;
  private currentRound: number = 0;
  private scores: Map<string, number> = new Map();
  private connection?: VoiceConnection;
  private player?: AudioPlayer;
  private roundTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly guildId: string,
    private readonly pack: QuizPack,
    private readonly textChannel: TextChannel,
    private readonly ytDlp: YtDlp
  ) {
    this.guildId = guildId;
    this.textChannel = textChannel;
    this.ytDlp = ytDlp;

    // Randomize the quiz pack entries order
    this.pack = {
      ...pack,
      entries: [...pack.entries].sort(() => Math.random() - 0.5),
    };
    console.log(this.pack);
  }

  // Computed property
  private get currentEntry(): QuizEntry | undefined {
    if (this.currentRound >= this.pack.entries.length) return undefined;
    return this.pack.entries[this.currentRound];
  }

  async start(voiceChannel: VoiceChannel, adapterCreator: any): Promise<void> {
    this.isActive = true;
    await this.setupVoiceConnection(voiceChannel, adapterCreator);

    await this.textChannel.send(
      `🎮 **${this.pack.name}** 플레이리스트로 게임을 시작합니다!\n
**규칙:**
- 재생되는 노래를 잘 들어주세요.
- 채팅으로 노래 제목을 맞취주세요.
- 첫번째로 정답을 맞춘 사람이 점수를 획득합니다.
- 가장 많은 점수를 획득한 플레이어가 승리합니다!`
    );

    this.roundTimeout = setTimeout(() => this.playNextRound(), 5000);
  }

  private async setupVoiceConnection(
    voiceChannel: VoiceChannel,
    adapterCreator: any
  ): Promise<void> {
    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: this.guildId,
      adapterCreator: adapterCreator,
    });

    this.player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });

    this.connection.subscribe(this.player);
  }

  private async playNextRound(): Promise<void> {
    if (!this.currentEntry) {
      await this.end();
      return;
    }

    await this.playCurrentEntry();
    await this.textChannel.send(
      `🎵 문제 ${this.currentRound + 1}/${this.pack.entries.length}`
    );
  }

  private async playCurrentEntry(): Promise<void> {
    if (!this.currentEntry || !this.player) return;

    const playDuration =
      this.currentEntry.playDuration > 0 ? this.currentEntry.playDuration : 60; // Default to 60 seconds max
    try {
      const stream = await this.createAudioStream(this.currentEntry);
      const resource = createAudioResource(stream);
      this.player.play(resource);
    } catch (error) {
      console.error(error);
      await this.textChannel.send(
        `ℹ️ 재생할 수 없는 노래를 건너뜁니다. (Video ID: ${this.currentEntry.ytVideoId})`
      );
      this.player.stop();
      this.currentRound++;
      this.playNextRound();
      return;
    }

    this.roundTimeout = setTimeout(
      () => this.timeoutCurrentRound(),
      playDuration * 1000
    );
  }

  private async createAudioStream(entry: QuizEntry) {
    const sectionSpec = GameState.calculateSectionSpec(entry);
    const ytdlpStream = this.ytDlp.stream(
      `https://www.youtube.com/watch?v=${entry.ytVideoId}`,
      {
        format: "bestaudio",
        downloadSections: sectionSpec,
        forceKeyframesAtCuts: true,
        postprocessorArgs: {
          af: ["loudnorm"],
        },
      }
    );

    const duplexStream = createStreamBridge();
    ytdlpStream.pipe(duplexStream);
    return duplexStream;
  }

  static calculateSectionSpec(entry: QuizEntry): string {
    const sectionStart = entry.songStart || 0;
    let sectionEnd = "";
    if (entry.playDuration > 0) {
      sectionEnd = `${sectionStart + entry.playDuration}`;
    }
    return `*${sectionStart}-${sectionEnd}`;
  }

  async checkAnswer(message: Message): Promise<boolean> {
    if (!this.isActive || !this.currentEntry) return false;

    const answer = message.content.toLowerCase();
    if (GameState.isCorrectAnswer(answer, this.currentEntry)) {
      if (this.roundTimeout) {
        clearTimeout(this.roundTimeout);
      }

      // Update score
      const currentScore = this.scores.get(message.author.id) || 0;
      this.scores.set(message.author.id, currentScore + 1);

      // Announce and advance
      await this.textChannel.send(
        `🎉 ${message.author}님이 정답을 맞췄습니다! 정답은 ${this.currentEntry.performer} - "${this.currentEntry.canonicalName}"였습니다!`
      );

      this.currentRound++;
      this.roundTimeout = setTimeout(() => this.playNextRound(), 3000);
      return true;
    }

    return false;
  }

  static isCorrectAnswer(answer: string, entry: QuizEntry): boolean {
    const possibleAnswers = GameState.generatePossibleAnswers(entry);
    return possibleAnswers.has(answer);
  }

  static generatePossibleAnswers(entry: QuizEntry): Set<string> {
    const answers = [entry.canonicalName, ...entry.possibleAnswers];
    return answers.reduce((acc, x) => {
      let lowercase = x.toLowerCase();
      let withoutSpacing = x.replace(/\s+/g, "");
      acc.add(lowercase);
      acc.add(withoutSpacing);
      acc.add(withoutSpacing.toLowerCase());
      acc.add(x);
      return acc;
    }, new Set<string>());
  }

  private async timeoutCurrentRound(): Promise<void> {
    if (!this.currentEntry) return;

    if (this.player) {
      this.player.stop();
    }

    const answerText = `\n정답은: ${this.currentEntry.performer} - "${this.currentEntry.canonicalName}"`;
    const teaser =
      this.currentRound + 1 < this.pack.entries.length
        ? "\n\n다음 노래가 곧 재생됩니다!"
        : "";

    await this.textChannel.send(`➡️ 시간 초과!${answerText}${teaser}`);

    this.currentRound++;
    this.roundTimeout = setTimeout(() => this.playNextRound(), 3000);
  }

  async end(): Promise<void> {
    this.isActive = false;

    if (this.roundTimeout) {
      clearTimeout(this.roundTimeout);
    }

    // Announce results and cleanup in one method
    let scoreMessage = "🏆 최종 점수:\n";
    const sortedScores = [...this.scores.entries()].sort(
      ([, a], [, b]) => b - a
    );

    if (sortedScores.length === 0) {
      scoreMessage += "아무도 점수를 획득하지 못했습니다!";
    } else {
      scoreMessage += sortedScores
        .map(
          ([userId, score], index) =>
            `${index + 1}. <@${userId}>: ${score} points\n`
        )
        .join("");
    }

    await this.textChannel.send(scoreMessage);

    this.connection?.destroy();
    this.connection = undefined;
    this.player = undefined;
  }

  isGameActive(): boolean {
    return this.isActive;
  }

  getScores(): Map<string, number> {
    return new Map(this.scores);
  }
}
