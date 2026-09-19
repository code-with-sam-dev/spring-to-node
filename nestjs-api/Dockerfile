# Pinned to the exact LTS the course verified against, not :latest.
# A course that says "check your version" and then builds on a moving tag is
# teaching one thing and doing another.
FROM node:24.21.0-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24.21.0-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
