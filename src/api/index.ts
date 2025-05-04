import express, { Request, Response, NextFunction, Application } from "express";
import cors from "cors";
import { quizPackRouter } from "./routes/quizPack";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";
import { MusicQuizDatastore } from "../shared/types/quiz";
import { datastore as defaultDatastore } from "./datastore";

// Load environment variables from .env file
dotenv.config();

// Retrieve credentials from environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error(
    "Error: ADMIN_USERNAME and ADMIN_PASSWORD must be set in environment variables."
  );
  process.exit(1); // Exit if credentials are not set
}

// Convert stored credentials to buffers once
const storedUsernameBuffer = Buffer.from(ADMIN_USERNAME);
const storedPasswordBuffer = Buffer.from(ADMIN_PASSWORD);

// Basic Authentication middleware
const basicAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Restricted Area"');
    res.status(401).send("Authentication required.");
    return;
  }

  const credentialsBase64 = authHeader.split(" ")[1];
  let credentials;
  try {
    credentials = Buffer.from(credentialsBase64, "base64").toString("utf-8");
  } catch (e) {
    // Handle potential errors during base64 decoding
    res.setHeader("WWW-Authenticate", 'Basic realm="Restricted Area"');
    res.status(400).send("Invalid base64 encoding in authorization header.");
    return;
  }

  const [username, password] = credentials.split(":");

  if (!username || password === undefined) {
    // Handle case where decoding or splitting fails or password is empty
    res.setHeader("WWW-Authenticate", 'Basic realm="Restricted Area"');
    res.status(401).send("Invalid authentication format.");
    return;
  }

  const providedUsernameBuffer = Buffer.from(username);
  const providedPasswordBuffer = Buffer.from(password);

  // Constant-time comparison
  // 1. Check length equality first (itself a constant-time operation for buffers)
  // 2. Use crypto.timingSafeEqual for the actual comparison
  // Ensure buffers have the same length before timingSafeEqual to prevent errors
  const isUsernameMatch =
    storedUsernameBuffer.length === providedUsernameBuffer.length &&
    crypto.timingSafeEqual(storedUsernameBuffer, providedUsernameBuffer);

  const isPasswordMatch =
    storedPasswordBuffer.length === providedPasswordBuffer.length &&
    crypto.timingSafeEqual(storedPasswordBuffer, providedPasswordBuffer);

  if (isUsernameMatch && isPasswordMatch) {
    // Authentication successful
    next();
  } else {
    // Authentication failed
    res.setHeader("WWW-Authenticate", 'Basic realm="Restricted Area"');
    res.status(401).send("Invalid credentials.");
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
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  // Use routes - Apply auth middleware ONLY to /api routes
  app.use("/api", basicAuth, quizPackRouter);
  
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
