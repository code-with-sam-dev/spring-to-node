# EPISODE 35. The Dockerfile most people write first: one stage, the full image, copy everything,
# then install. Kept to measure against, not to use.
FROM node:24.21.0
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
CMD ["node", "dist/main.js"]
