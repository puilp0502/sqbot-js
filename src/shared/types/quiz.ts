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
  tags: string[];
  playCount: number;
  createdAt: Date;
  updatedAt: Date;
  entries: QuizEntry[];
}

// Search parameters for quiz packs
interface QuizPackSearchParams {
  tags?: string[];
  searchTerm?: string; // For searching in name/description
  orderBy?: "name" | "createdAt" | "updatedAt" | "playCount";
  orderDirection?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

// Search results with pagination info
interface QuizPackSearchResults {
  quizPacks: QuizPack[];
  total: number;
  offset: number;
  limit: number;
}

// Interface for the datastore
interface MusicQuizDatastore {
  // Get a quiz pack by ID
  getQuizPack(quizPackId: string): Promise<QuizPack | null>;

  // List all quiz packs
  listQuizPacks(): Promise<QuizPack[]>;

  // Update quiz pack
  updateQuizPack(quizPackId: string, quizPack: QuizPack): Promise<undefined>;

  // Search for quiz packs with filtering, sorting and pagination
  searchQuizPacks(params: QuizPackSearchParams): Promise<QuizPackSearchResults>;

  // Increment play count for a quiz pack
  incrementPlayCount(quizPackId: string): Promise<boolean>;
}

// Export the interfaces
export {
  QuizEntry,
  QuizPack,
  MusicQuizDatastore,
  QuizPackSearchParams,
  QuizPackSearchResults,
};
