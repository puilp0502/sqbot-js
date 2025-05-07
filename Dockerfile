FROM node:20

WORKDIR /app

# Install ffmpeg and pipx
RUN apt-get update && apt-get install -y ffmpeg pipx 

# Copy package.json and pnpm-lock.yaml files
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the code
COPY . .

# Build TypeScript files
RUN pnpm run build

# Default environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/sqbot.sqlite3

# Create a non-root user to run the application
RUN groupadd -r sqbot && useradd -r -g sqbot -m -d /home/sqbot -s /sbin/nologin sqbot && \
    mkdir -p /app/data && \
    chown -R sqbot:sqbot /app

USER sqbot

# Install yt-dlp
RUN pipx install yt-dlp
# Set yt-dlp binary path as environment variable
ENV YTDLP_PATH=/home/sqbot/.local/bin/yt-dlp

# Create volume for data persistence
VOLUME /app/data

# Expose port for API
EXPOSE $PORT

# Default command (can be overridden at runtime)
CMD ["node", "--trace-warnings", "dist/api/index.js"]
