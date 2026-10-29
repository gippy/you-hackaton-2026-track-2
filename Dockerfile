# syntax=docker/dockerfile:1.7
#
# Haunted Command Station as an Apify Standby Actor.
#
# The image holds no keys. PARASAIL_API_KEY, YDC_API_KEY and ONE_SECRET come from the environment
# (Apify secrets on the platform, `docker run -e` locally). The "Call expert" buttons page through
# PagerDuty for real; set PAGING=off on the Actor to switch that off.
#
# Four stages: the page build, the production node_modules, the pipeline's Python venv, and the runtime
# that copies only what the station reads. Nothing outside these COPY lines reaches the image.

ARG NODE_IMAGE=node:24.22.1-bookworm-slim
ARG PNPM_VERSION=11.26.0
ARG UV_VERSION=0.13.6
ARG PYTHON_VERSION=3.13.13
ARG ONE_CLI_VERSION=2.9.2

# ---- the Vite build of web/ (JS and CSS are inlined into index.html) ----
FROM ${NODE_IMAGE} AS web
ARG PNPM_VERSION
RUN npm install --global pnpm@${PNPM_VERSION}
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY vite.config.ts ./
COPY shared ./shared
COPY web ./web
RUN pnpm run build

# ---- production node_modules for the server (ws, suncalc) ----
FROM ${NODE_IMAGE} AS node-deps
ARG PNPM_VERSION
RUN npm install --global pnpm@${PNPM_VERSION}
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ---- the pipeline's venv: Python 3.13 through uv, CrewAI 1.15.2 ----
FROM ghcr.io/astral-sh/uv:${UV_VERSION} AS uv

FROM ${NODE_IMAGE} AS python
ARG PYTHON_VERSION
COPY --from=uv /uv /usr/local/bin/uv
# The interpreter lives outside the venv, so the runtime stage can copy both to the same paths.
ENV UV_PYTHON_INSTALL_DIR=/opt/python \
    UV_PYTHON_PREFERENCE=only-managed \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy
WORKDIR /app
COPY requirements.txt ./
RUN uv venv --python ${PYTHON_VERSION} .venv \
 && uv pip install --python .venv/bin/python --requirement requirements.txt

# ---- runtime ----
FROM ${NODE_IMAGE} AS runtime
ARG ONE_CLI_VERSION
# tini is PID 1, so SIGTERM from `docker stop` or the Apify platform reaches node (a PID 1 node ignores it).
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini=0.19.0-1+b3 \
 && rm -rf /var/lib/apt/lists/*
# The One CLI reads ONE_SECRET from the environment and refuses Node older than 24.22.1.
RUN npm install --global @withone/cli@${ONE_CLI_VERSION} && npm cache clean --force

WORKDIR /app
COPY --from=python /opt/python /opt/python
COPY --from=python /app/.venv ./.venv
COPY --from=node-deps /app/node_modules ./node_modules
COPY package.json ./
COPY server ./server
COPY shared ./shared
COPY pipeline ./pipeline
COPY fixtures ./fixtures
COPY snapshots ./snapshots
COPY data/map ./data/map
COPY art/station ./art/station
COPY --from=web /app/web/dist ./web/dist

# out/ (saved runs, cached speech) and proof/ (ledgers) are written at run time, as the node user.
RUN .venv/bin/python -m compileall -q pipeline \
 && mkdir -p out proof \
 && chown -R node:node out proof
USER node

ENV NODE_ENV=production \
    CREWAI_TRACING_ENABLED=false \
    CREWAI_DISABLE_TELEMETRY=true \
    OTEL_SDK_DISABLED=true \
    ACTOR_WEB_SERVER_PORT=4321
EXPOSE 4321

# Apify sets ACTOR_WEB_SERVER_PORT (4321). `exec` replaces the shell with node, so tini's SIGTERM reaches it.
ENTRYPOINT ["tini", "--"]
# Opens on Nightfall step 1, so the story plays from its start; the operator steps on from there.
CMD ["sh", "-c", "exec node server/main.ts --host 0.0.0.0 --port $ACTOR_WEB_SERVER_PORT --no-browser --incident sim-nightfall-01"]
