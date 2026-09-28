FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src
COPY scripts ./scripts

RUN mkdir -p public/uploads && chown -R node:node public
USER node

EXPOSE 3000
CMD ["node", "src/server.js"]
