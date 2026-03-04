import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { MusicQuizDatastore } from "../../shared/types/quiz";

const router = Router();

function getDatastore(req: Request): MusicQuizDatastore {
  return req.app.locals.datastore as MusicQuizDatastore;
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || "dev-secret-change-me";
}

/**
 * GET /auth/discord
 * Redirects to Discord OAuth2 authorize URL
 */
router.get("/discord", (req: Request, res: Response) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    res.status(500).json({ error: "Discord OAuth not configured" });
    return;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify email",
  });

  res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});

/**
 * GET /auth/discord/callback
 * Exchanges code for access token, fetches user info, issues JWT
 */
router.get("/discord/callback", async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Missing authorization code" });
    return;
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

  if (!clientId || !clientSecret || !redirectUri) {
    res.status(500).json({ error: "Discord OAuth not configured" });
    return;
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      res.status(400).json({ error: "Failed to exchange code for token" });
      return;
    }

    const tokenData = await tokenResponse.json() as { access_token: string };

    // Fetch Discord user info
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userResponse.ok) {
      res.status(400).json({ error: "Failed to fetch Discord user info" });
      return;
    }

    const discordUser = await userResponse.json() as { id: string; username: string; email?: string };

    // Upsert user in database
    const datastore = getDatastore(req);
    const user = await datastore.getOrCreateUser(
      discordUser.id,
      discordUser.username,
      discordUser.email || ""
    );

    // Issue JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    // Redirect to frontend with token
    res.redirect(`${corsOrigin}/login/callback?token=${token}`);
  } catch (error) {
    console.error("Discord OAuth error:", error);
    res.status(500).json({ error: "OAuth authentication failed" });
  }
});

/**
 * GET /auth/me
 * Returns current user info from JWT (requires valid JWT, any role)
 */
router.get("/me", async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string; role: string };
    const datastore = getDatastore(req);
    const user = await datastore.getUserById(decoded.userId);

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      discordId: user.discordId,
      discordUsername: user.discordUsername,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

export { router as authRouter };
