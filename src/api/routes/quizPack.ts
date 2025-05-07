import express, { Router, Request, Response, Application } from "express";
import { QuizPack, QuizPackSearchParams, MusicQuizDatastore } from "../../shared/types/quiz";
import { v4 as uuidv4 } from "uuid";

const router = Router();

/**
 * Helper function to get the datastore from the Express application
 */
function getDatastore(req: Request): MusicQuizDatastore {
  return req.app.locals.datastore as MusicQuizDatastore;
}

interface PackParams {
  pack_id: string;
}

/**
 * GET /tags
 * Get all available tags in the system
 */
router.get("/tags", async (req: Request, res: Response) => {
  try {
    const datastore = getDatastore(req);
    const tags = await datastore.getAllTags();
    res.json(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /search
 * Search for quiz packs with filtering, sorting and pagination
 */
router.get("/search", async (req: Request, res: Response) => {
  try {
    // Extract search parameters from query
    const searchParams: QuizPackSearchParams = {
      searchTerm: req.query.q as string,
      orderBy: req.query.orderBy as
        | "name"
        | "createdAt"
        | "updatedAt"
        | "playCount",
      orderDirection: req.query.orderDirection as "asc" | "desc",
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset
        ? parseInt(req.query.offset as string)
        : undefined,
    };

    // Handle tags (can be comma-separated string or array)
    if (req.query.tags) {
      if (Array.isArray(req.query.tags)) {
        searchParams.tags = req.query.tags as string[];
      } else {
        searchParams.tags = (req.query.tags as string)
          .split(",")
          .map((tag) => tag.trim());
      }
    }

    const datastore = getDatastore(req);
    const results = await datastore.searchQuizPacks(searchParams);
    res.json(results);
  } catch (error) {
    console.error("Error searching quiz packs:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /:pack_id
 * Retrieve a quiz pack by ID
 */
router.get("/pack/:pack_id", async (req: Request, res: Response) => {
  try {
    const { pack_id } = req.params;
    const datastore = getDatastore(req);
    const quizPack = await datastore.getQuizPack(pack_id);

    if (!quizPack) {
      res.status(404).json({ error: "Quiz pack not found" });
      return;
    }

    res.json(quizPack);
  } catch (error) {
    console.error("Error retrieving quiz pack:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /:pack_id/tags
 * Add tags to a quiz pack
 */
router.post("/pack/:pack_id/tags", async (req: Request, res: Response) => {
  try {
    const { pack_id } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      res.status(400).json({ error: "Tags must be an array of strings" });
      return;
    }

    // Get the quiz pack
    const datastore = getDatastore(req);
    const quizPack = await datastore.getQuizPack(pack_id);
    if (!quizPack) {
      res.status(404).json({ error: "Quiz pack not found" });
      return;
    }

    // Add the new tags to the existing ones, removing duplicates
    const uniqueTags = Array.from(new Set([...quizPack.tags, ...tags]));
    quizPack.tags = uniqueTags;

    // Update the quiz pack
    await datastore.updateQuizPack(pack_id, quizPack);

    res.status(200).json({ success: true, tags: uniqueTags });
  } catch (error) {
    console.error("Error adding tags:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * DELETE /:pack_id/tags/:tag_name
 * Remove a tag from a quiz pack
 */
router.delete(
  "/pack/:pack_id/tags/:tag_name",
  async (req: Request, res: Response) => {
    try {
      const { pack_id, tag_name } = req.params;

      // Get the quiz pack
      const datastore = getDatastore(req);
      const quizPack = await datastore.getQuizPack(pack_id);
      if (!quizPack) {
        res.status(404).json({ error: "Quiz pack not found" });
        return;
      }

      // Remove the tag
      quizPack.tags = quizPack.tags.filter((tag) => tag !== tag_name);

      // Update the quiz pack
      await datastore.updateQuizPack(pack_id, quizPack);

      res.status(200).json({ success: true, tags: quizPack.tags });
    } catch (error) {
      console.error("Error removing tag:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * POST /pack
 * Create a new quiz pack
 */
router.post("/pack", async (req: Request, res: Response) => {
  try {
    const quizPackData = req.body as Partial<QuizPack>;
    const datastore = getDatastore(req);

    // Generate a new UUID for the quiz pack
    const newPackId = uuidv4();

    // Create a new quiz pack with defaults
    const newQuizPack: QuizPack = {
      id: newPackId,
      name: quizPackData.name || "New Quiz Pack",
      description: quizPackData.description || "",
      tags: quizPackData.tags || [],
      playCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      entries: quizPackData.entries || []
    };

    // Add any entries if provided, ensuring each has an ID
    if (newQuizPack.entries.length > 0) {
      newQuizPack.entries = newQuizPack.entries.map(entry => ({
        ...entry,
        id: entry.id || uuidv4()
      }));
    }

    // Save the new quiz pack
    await datastore.updateQuizPack(newPackId, newQuizPack);

    // Return the newly created quiz pack
    res.status(201).json(newQuizPack);
  } catch (error) {
    console.error("Error creating quiz pack:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * PUT /:pack_id
 * Update a quiz pack by ID
 */
router.put("/pack/:pack_id", async (req: Request, res: Response) => {
  try {
    const { pack_id } = req.params;
    const quizPackData = req.body as QuizPack;

    // Verify the pack exists first
    const datastore = getDatastore(req);
    const existingPack = await datastore.getQuizPack(pack_id);
    if (!existingPack) {
      res.status(404).json({ error: "Quiz pack not found" });
      return;
    }

    // Ensure the ID in the URL matches the request body
    if (quizPackData.id !== pack_id) {
      res.status(400).json({
        error: "Quiz pack ID in request body does not match URL parameter",
      });
      return;
    }

    // Update timestamp
    quizPackData.updatedAt = new Date();

    // Update the quiz pack
    await datastore.updateQuizPack(pack_id, quizPackData);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating quiz pack:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export const quizPackRouter = router;
