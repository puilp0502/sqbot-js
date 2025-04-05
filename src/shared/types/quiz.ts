import { v4 as uuidv4 } from "uuid";

// Interface for a single quiz entry
interface QuizEntry {
  id: string; // UUID
  performer: string;
  canonicalName: string;
  possibleAnswers: string[];
  ytVideoId: string;
  songStart: number; // in seconds
  playDuration: number; // in seconds
}

// Interface for a quiz pack
interface QuizPack {
  id: string; // UUID
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  entries: QuizEntry[];
}

// Interface for the datastore
interface MusicQuizDatastore {
  // Get a quiz pack by ID
  getQuizPack(quizPackId: string): Promise<QuizPack | null>;

  // List all quiz packs
  listQuizPacks(): Promise<QuizPack[]>;
}

// Export the interfaces
export { QuizEntry, QuizPack, MusicQuizDatastore };
