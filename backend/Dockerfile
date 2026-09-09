FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy Prisma schema
COPY prisma ./prisma

# ✅ FIX: Provide a dummy DATABASE_URL so Prisma can generate the client during build
ENV DATABASE_URL="postgresql://user:password@localhost:5432/dummy"
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Build the TypeScript code (prisma generate will succeed now because ENV is set)
RUN npm run build

EXPOSE 5000

# Start the application (The real DATABASE_URL from docker-compose will be used here!)
CMD ["npm", "start"]