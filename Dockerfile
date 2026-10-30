# syntax=docker/dockerfile:1
# Production image for the hosted private beta: Node 24, native Stockfish 18 and SQLite on /data.
# Build:  docker build -t chesslab .
# Run:    docker run -p 8770:8770 -v chesslab-data:/data --env-file .env.production chesslab
# See docs/deploy-beta.md for the required settings. The image targets linux/amd64.
ARG NODE_VERSION=24.21.0

FROM node:${NODE_VERSION}-bookworm-slim AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY vite.config.mjs ./
COPY shared ./shared
COPY web ./web
RUN npm run build

# Official Stockfish 18 release binary, checked against a pinned SHA-256.
# Use --build-arg STOCKFISH_BUILD=sse41-popcnt on hosts without AVX2.
FROM node:${NODE_VERSION}-bookworm-slim AS stockfish
ARG STOCKFISH_BUILD=avx2
SHELL ["/bin/bash", "-o", "pipefail", "-c"]
WORKDIR /tmp/stockfish
RUN set -eu; \
    case "$STOCKFISH_BUILD" in \
      avx2) sum=536c0c2c0cf06450df0bfb5e876ef0d3119950703a8f143627f990c7b5417964 ;; \
      sse41-popcnt) sum=dea5016a6d9ab705e5697b093d882fca4677d84d8828f470ee33e76de33cf962 ;; \
      *) echo "STOCKFISH_BUILD must be avx2 or sse41-popcnt" >&2; exit 1 ;; \
    esac; \
    asset="stockfish-ubuntu-x86-64-$STOCKFISH_BUILD"; \
    node -e "fetch(process.argv[1]).then(async r=>{if(!r.ok)throw new Error('HTTP '+r.status);require('node:fs').writeFileSync('stockfish.tar',Buffer.from(await r.arrayBuffer()))}).catch(e=>{console.error(e.message);process.exit(1)})" \
      "https://github.com/official-stockfish/Stockfish/releases/download/sf_18/$asset.tar"; \
    echo "$sum  stockfish.tar" | sha256sum -c -; \
    tar -xf stockfish.tar; \
    install -D -m 0755 "stockfish/$asset" /out/stockfish18/stockfish; \
    install -D -m 0644 stockfish/Copying.txt /out/stockfish18/Copying.txt; \
    install -D -m 0644 stockfish/AUTHORS /out/stockfish18/AUTHORS; \
    version="$(/out/stockfish18/stockfish quit)"; \
    [[ "$version" == "Stockfish 18 "* ]] || { echo "Unexpected engine: $version" >&2; exit 1; }

FROM node:${NODE_VERSION}-bookworm-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8770 \
    CHESSLAB_DB=/data/chesslab.sqlite \
    CHESSLAB_EXPLORER=/data/explorer/catalogue.sqlite \
    CHESSLAB_PUZZLES=/data/puzzles/catalogue.sqlite \
    CHESSLAB_TABLEBASES=/data/tablebases/standard \
    CHESSLAB_ENGINES_DIR=/opt/chesslab/engines \
    STOCKFISH_PATH=/opt/chesslab/engines/stockfish18/stockfish
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY server ./server
COPY shared ./shared
COPY --from=web /app/web/dist ./web/dist
COPY --from=stockfish /out /opt/chesslab/engines
COPY docker/entrypoint.sh /usr/local/bin/chesslab-entrypoint
# Application files stay root-owned and read-only; the app writes only to the /data volume.
# The entrypoint gives /data to the node user and runs the server as node, never as root.
RUN mkdir -p /data && chown node:node /data
VOLUME ["/data"]
EXPOSE 8770
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||8770)+'/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
ENTRYPOINT ["chesslab-entrypoint"]
CMD ["node", "server/index.mjs"]
