FROM node:20-alpine
ARG PORT=3000
ARG NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN chown -R node:node /app

ENV PORT=${PORT}
ENV NODE_ENV=${NODE_ENV}

EXPOSE ${PORT}

USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["npm", "start"]