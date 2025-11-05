import passport from "passport";
import { Strategy as DiscordStrategy, Profile } from "passport-discord";
import { MusicQuizSQLiteDatastore } from "../../shared/database/sqlite";

export function configurePassport(datastore: MusicQuizSQLiteDatastore) {
  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const DISCORD_CALLBACK_URL = process.env.DISCORD_CALLBACK_URL || "http://localhost:3001/auth/discord/callback";

  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    console.warn(
      "Warning: DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET are not set. Discord OAuth will not be available."
    );
    return passport;
  }

  // Configure Discord OAuth strategy
  passport.use(
    new DiscordStrategy(
      {
        clientID: DISCORD_CLIENT_ID,
        clientSecret: DISCORD_CLIENT_SECRET,
        callbackURL: DISCORD_CALLBACK_URL,
        scope: ["identify", "email"],
      },
      async (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: (error: any, user?: any) => void
      ) => {
        try {
          // Upsert user in database
          const userId = await datastore.upsertUser({
            discordId: profile.id,
            username: profile.username || "Unknown",
            discriminator: profile.discriminator || "0",
            avatar: profile.avatar || undefined,
            email: profile.email || undefined,
          });

          // Fetch the full user object
          const user = await datastore.getUserById(userId);

          done(null, user);
        } catch (error) {
          console.error("Error during Discord OAuth:", error);
          done(error);
        }
      }
    )
  );

  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await datastore.getUserById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  return passport;
}
