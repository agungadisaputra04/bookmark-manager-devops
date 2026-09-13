FROM node:24-bookworm-slim

LABEL org.opencontainers.image.source="https://github.com/agungadisaputra04/bookmark-manager-devops"

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev \
    && npm cache clean --force

COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node migrations ./migrations

USER node

EXPOSE 3000

CMD ["npm", "start"]