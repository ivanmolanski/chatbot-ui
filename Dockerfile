# Chatbot-UI — Railway Docker build
# Pinned to Node 26.7.0 to match package.json engines / .nvmrc.
# A Dockerfile present in the repo root forces Railway to use the
# Docker build path instead of the (currently failing) Express
# auto-deploy layer.

FROM node:26.7.0-slim

# Avoid interactive prompts during package installs
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    NODE_ENV=production

WORKDIR /app

# Install build tooling required by some native modules (sharp, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy manifest first for better layer caching
COPY package.json package-lock.json ./

# Install dependencies (lockfile present → reproducible install)
RUN npm ci

# Copy application source
COPY . .

# Build the Next.js production bundle
RUN npm run build

# Next.js reads the port from the PORT env var injected by Railway
ENV PORT=3000
EXPOSE 3000

# Health check endpoint is implemented at /health (app/health/route.ts)
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["npm", "run", "start"]
