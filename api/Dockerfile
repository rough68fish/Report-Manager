FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./

# Development stage — includes devDependencies, runs tsx watch
FROM base AS development
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

# Build stage — compiles TypeScript
FROM base AS build
RUN npm ci --omit=dev
COPY . .
RUN npm run build

# Production stage — lean runtime image
FROM node:22-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3001
CMD ["node", "dist/index.js"]
