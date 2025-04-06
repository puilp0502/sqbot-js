import express from "express";
import cors from "cors";
import { quizPackRouter } from "./routes/quizPack";
import path from "path";

// Create Express application
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Use routes
app.use("/api", quizPackRouter);

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
