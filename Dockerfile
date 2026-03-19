# Root Dockerfile for Render deployment
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy server package files
COPY server/package*.json ./server/
RUN cd server && npm ci --only=production

# Copy server source code
COPY server/ ./server/

WORKDIR /usr/src/app/server

EXPOSE 5001
CMD ["node", "index.js"]
