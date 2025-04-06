import express, { Router } from "express";
import { Request, Response } from "express";
import { datastore } from "../datastore";
import { QuizPack } from "../../shared/types/quiz";

const router = Router();

interface PackParams {
  pack_id: string;
}

/**
 * GET /:pack_id
 * Retrieve a quiz pack by ID
 */
router.get("/:pack_id", async (req: Request, res: Response) => {
  try {
    const { pack_id } = req.params;

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
 * PUT /:pack_id
 * Update a quiz pack by ID
 */
router.put("/:pack_id", async (req: Request, res: Response) => {
  try {
    const { pack_id } = req.params;
    const quizPackData = req.body as QuizPack;

    // Verify the pack exists first
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
