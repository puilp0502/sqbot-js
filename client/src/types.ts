export interface QuizEntry {
  id: string; // UUID
  performer: string;
  canonicalName: string;
  possibleAnswers: string[];
  ytVideoId: string;
  songStart: number; // in seconds
  playDuration: number; // in seconds
}

export interface QuizPack {
  id: string; // UUID
  name: string;
  description: string;
  tags: string[];
  playCount: number;
  createdAt: Date;
  updatedAt: Date;
  entries: QuizEntry[];
}
