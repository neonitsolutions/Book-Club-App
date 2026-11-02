FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
# Keeps `next build` within the 4 GB Jenkins server (build stage only, not the runtime image)
ENV NODE_OPTIONS=--max-old-space-size=2048
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
# The app runs with plain `node`; npm, yarn and corepack are only build tools.
# Removing them keeps their bundled dependencies (and CVEs) out of production.
# apk upgrade pulls Alpine security fixes released after the base image was built.
RUN apk upgrade --no-cache && rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx \
      /usr/local/bin/corepack /usr/local/bin/yarn /usr/local/bin/yarnpkg /opt/yarn-*
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
