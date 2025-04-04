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

// Implementation example (you would replace this with your actual implementation)
class MusicQuizFirestoreDatastore implements MusicQuizDatastore {
  listQuizPacks(): Promise<QuizPack[]> {
      throw new Error("Method not implemented.");
  }
  // Implementation would go here
  async getQuizPack(quizPackId: string): Promise<QuizPack | null> {
    // Example implementation
    // In reality, this would query your database
    try {
      // Query Firestore, MongoDB, or other database
      // const doc = await firestore.collection('quizPacks').doc(quizPackId).get();
      // return doc.exists ? doc.data() as QuizPack : null;

      // Placeholder return
      return {
        id: quizPackId,
        name: "2000s Hits",
        description: "Popular songs from the 2000s",
        createdAt: new Date(),
        updatedAt: new Date(),
        entries: [],
      };
    } catch (error) {
      console.error("Error fetching quiz pack:", error);
      return null;
    }
  }

  // Implement other methods...
}

// Export the interfaces and implementation
export { QuizEntry, QuizPack, MusicQuizDatastore, MusicQuizFirestoreDatastore };
