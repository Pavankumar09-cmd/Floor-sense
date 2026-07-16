FROM node:20-slim

# Install python3 and build tools needed for better-sqlite3 build compilation
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 5000
EXPOSE 5001

CMD ["npm", "run", "dev"]
