import express, { Request, Response, NextFunction } from "express";
import passport from "passport";

const router = express.Router();

// Login route - redirects to Discord OAuth
router.get("/discord", passport.authenticate("discord"));

// OAuth callback route
router.get(
  "/discord/callback",
  passport.authenticate("discord", {
    failureRedirect: process.env.FRONTEND_URL || "http://localhost:5173/login?error=auth_failed",
  }),
  (req: Request, res: Response) => {
    // Successful authentication, redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/?auth=success`);
  }
);

// Logout route
router.post("/logout", (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

// Get current user info
router.get("/me", (req: Request, res: Response): void => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const user = req.user as any;
  res.json({
    id: user.id,
    discordId: user.discordId,
    username: user.username,
    discriminator: user.discriminator,
    avatar: user.avatar,
    email: user.email,
  });
});

export { router as authRouter };
