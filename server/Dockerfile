FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the TypeScript project
RUN npm run build

EXPOSE 5001

# Push the Prisma schema to make sure the SQLite database is ready, then start the server
CMD ["sh", "-c", "npx prisma db push && npm run start"]
