# Check out https://hub.docker.com/_/node to select a new base image
FROM docker.io/library/node:24-slim

# Install pnpm globally (faster and more disk-efficient than npm)
RUN npm install -g pnpm

# Set to a non-root built-in user `node`
USER node

# Create app directory (with user `node`)
RUN mkdir -p /home/node/app

WORKDIR /home/node/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND pnpm-lock.json/.yaml (are copied if exists)
# where available (npm@5+)
COPY --chown=node package*.json ./
COPY --chown=node pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Bundle app source code
COPY --chown=node . .

RUN npm run build

# Bind to all network interfaces so that it can be mapped to the host OS
ENV HOST=0.0.0.0 PORT=3000

EXPOSE ${PORT}
CMD [ "node", "." ]