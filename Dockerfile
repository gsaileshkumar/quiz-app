FROM node:lts-alpine3.12

WORKDIR /app

# Install app dependencies
COPY package*.json ./

RUN rm -rf node_modules
RUN npm install -g npm@latest
RUN npm ci --only=production --silent

# Copy sources and build
COPY . .

EXPOSE 4000

CMD ["node", "index.js"]
