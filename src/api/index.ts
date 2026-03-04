import express, { Request, Response, NextFunction, Application } from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { quizPackRouter } from "./routes/quizPack";
import { authRouter } from "./routes/auth";
import path from "path";
import dotenv from "dotenv";
import { MusicQuizDatastore } from "../shared/types/quiz";
import { datastore as defaultDatastore } from "./datastore";

// Load environment variables from .env file
dotenv.config();

function getJwtSecret(): string {
  return process.env.JWT_SECRET || "dev-secret-change-me";
}

// JWT Authentication middleware — verifies token and attaches user info (no role check)
const jwtAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string; role: string };

    // Attach user info to request
    (req as any).user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
};

/**
 * Create an Express application with the given datastore
 * This allows for dependency injection, particularly useful for testing
 */
export function createApp(datastore: MusicQuizDatastore = defaultDatastore): Application {
  // Create Express application
  const app = express();

  // Store datastore in app.locals for global access
  app.locals.datastore = datastore;

  // Middleware
  app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  }));
  app.use(express.json({ limit: "10mb" }));

  // Auth routes — no auth required
  app.use("/auth", authRouter);

  // API routes — JWT required (any authenticated user)
  app.use("/api", jwtAuth, quizPackRouter);

  return app;
}

// Use default datastore for the main app instance
const app = createApp();

// Define port
const PORT = process.env.PORT || 3001;

// Start server
function startServer() {
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
  });
}

// For direct execution
if (require.main === module) {
  startServer();
}

export { app, startServer };
