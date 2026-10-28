# Deploying the station as an Apify Standby Actor

The station runs as a private Standby Actor named `haunted-command-station` on the `jaroslavhejlek` account. The page, the `/ws` stream and the art and sound files are served from one port by `server/main.ts`. The Actor starts it in dry-run mode: no `--live-dispatch`, no `--live-page`, no `--live-sky-warnings`, so the dispatch button can never post to Discord or page a phone, whoever has the link.

## What is in the box

| File | What it does |
|---|---|
| `.actor/actor.json` | Names the Actor, turns on Standby, and maps three environment variables to Apify secrets (`@parasailApiKey`, `@ydcApiKey`, `@oneSecret`) |
| `Dockerfile` | Four stages: the Vite build, the server's production `node_modules`, a Python 3.13 venv with CrewAI (through `uv`), and the runtime with the `one` CLI and `tini`. Base image, `pnpm`, `uv`, Python, `@withone/cli` and `tini` are pinned; the Python packages follow `requirements.txt`, where only `crewai` is exact |
| `.dockerignore` | Keeps `.env`, `.onerc`, `.venv`, `node_modules`, `reference/`, `out/`, `art/raw/`, `eval/` and other local-only files out of the build context |

The image holds no keys. The `Dockerfile` copies only the folders the station reads (`server`, `shared`, `pipeline`, `fixtures`, `snapshots`, `data/map`, `art/nightfall`, the built page), so a stray file in the repo cannot reach the image.

## Build and test locally

Use a port that nothing else is using. The station on 8666 and the build session on 8667 are taken.

```bash
docker build -t haunted-command-station:local .
```

Pass the three keys from your shell, never from a file. `-e NAME` with no value makes Docker read it from your environment. The Actor reads the You.com key as `YDC_API_KEY`; if your shell has it as `YOU_API_KEY` (the pipeline accepts both), map it as below:

```bash
docker run --rm --name hcs-test -p 8680:4321 \
  -e ACTOR_WEB_SERVER_PORT=4321 \
  -e PARASAIL_API_KEY -e YDC_API_KEY="${YDC_API_KEY:-$YOU_API_KEY}" -e ONE_SECRET \
  haunted-command-station:local
```

Open http://127.0.0.1:8680. Locally there is no token, and the page works without one. To test the page the way Standby opens it, add any value: http://127.0.0.1:8680/?token=test. The WebSocket, sounds and art then all carry `?token=test`.

The container builds the first Nightfall step on its own as it starts, so the station is composed by the time the page connects.

Measured on an Apple Silicon Mac (arm64; the platform builds for amd64 itself):

| What | Result |
|---|---|
| Image size | 1.87 GB on disk, 460 MB compressed (what a pull transfers) |
| Cold build | about 70 s with the layers uncached, 5 to 30 s after a source change |
| Start to first HTTP 200 | 0.4 to 1.4 s |
| First Nightfall station | about 18 to 25 s after the server answers (Parasail, CrewAI route, You.com, compose) |
| Later steps | 14 s for step 2 |
| Peak memory | about 315 MiB over two pipeline runs, a dispatch and a spoken dispatch (Standby's default is 1024 MB) |
| `docker stop` | 0.2 s, exit 143 (`tini` forwards SIGTERM) |

Check that no key is baked in. This lists the image's variables and greps its filesystem for each key value, printing file paths only:

```bash
docker image inspect haunted-command-station:local --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E 'KEY|SECRET|TOKEN' || echo "no key variables"
docker run --rm -e K="$PARASAIL_API_KEY" --entrypoint sh haunted-command-station:local -c 'grep -rIlF -- "$K" /app /home /etc /opt /usr/local 2>/dev/null | head -3'
```

## Deploy

### 1. Add the secrets (run these yourself)

They carry your keys, so they are not scripted. In a shell where the keys are set, they never show on screen (use `$YOU_API_KEY` for the second one if that is the name your shell has):

```bash
apify secrets add parasailApiKey "$PARASAIL_API_KEY"
apify secrets add ydcApiKey "${YDC_API_KEY:-$YOU_API_KEY}"
apify secrets add oneSecret "$ONE_SECRET"
```

`apify secrets add` stores them in the CLI's local secrets file. `apify push` sends them to the Actor as encrypted environment variables. If one is missing, `apify push` stops and names it.

### 2. Check what `apify push` will upload

`apify push` uploads the folder as source files, minus everything `.gitignore` and `.actorignore` match, and minus `.git`, `node_modules` and `storage`. It does not read `.dockerignore`. This list is what would go up, so make sure no secret is in it:

```bash
git ls-files --cached --others --exclude-standard | grep -E '(^|/)\.env|\.onerc|\.venv/|\.pem$|\.key$' || echo "no secrets in the upload"
```

`.env` and `.onerc` are in `.gitignore`, so they stay home. `.actorignore` keeps `proof/`, `docs/`, `scripts/` and the local-only folders out of the upload; the image reads none of them. It also keeps a clean clone under the size where the CLI sends inline source files, which the API otherwise refuses with `sourceFilesTooLarge`.

### 3. Push

```bash
apify push
```

This creates the private Actor on first push, uploads the source and starts a build on the platform.

### 4. Raise the Standby request limits

Each open WebSocket counts as an in-flight request. With the defaults (4 and 3), a handful of judges' tabs starts extra runs in separate containers, which do not share the station's state. Set 200 and 150:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X PUT "https://api.apify.com/v2/acts/jaroslavhejlek~haunted-command-station" \
  -H "Authorization: Bearer $APIFY_TOKEN" -H 'Content-Type: application/json' \
  -d '{"actorStandby":{"maxRequestsPerActorRun":200,"desiredRequestsPerActorRun":150}}'
```

It prints `200` on success. `$APIFY_TOKEN` stays in your shell; the command never prints it.

### 5. Open it

The Standby URL is in the Actor's settings (`standbyUrl`), usually `https://jaroslavhejlek--haunted-command-station.apify.actor`. Every request needs a token, and the page forwards the one it was opened with to its WebSocket, sounds and art:

```text
https://jaroslavhejlek--haunted-command-station.apify.actor/?token=<token>
```

For judges, make a scoped token that can only call this Actor, and revoke it after the event. The main token in a shared link lets anyone act as you. Never paste the token into a chat, a log or a commit.

## Deployed on 2026-10-28

| | |
|---|---|
| Actor | `jaroslavhejlek/haunted-command-station`, id `NDQXCJDv0iWSOU89Q`, private, build 0.1.1 |
| Console | https://console.apify.com/actors/NDQXCJDv0iWSOU89Q |
| Standby URL | https://jaroslavhejlek--haunted-command-station.apify.actor (needs `?token=`) |
| Standby settings | memory 1024 MB, idle timeout 300 s, `maxRequestsPerActorRun` 200, `desiredRequestsPerActorRun` 150 |
| Push and platform build | about 2 minutes (upload, then the Docker build on the platform) |
| Cold start (no run, first request) | 9.96 s to the first byte, 10.4 s with the 397 KB page. Run created after 1.5 s, image pull 8.6 s, server listening 0.2 s after the container started. A warm request takes 0.27 s |
| First station on a new run | about 26 s after the container started |
| Through the Standby URL | `/ws` opens in 0.3 s and replays the state; sounds, art and the map load with the token (200) and without it the platform answers 401; the second Nightfall step ran live |

The image pull is most of the cold start. Open the URL once before judging, and keep one tab open so the run is not stopped 5 minutes after the last viewer leaves.

To open the page without pasting the token anywhere, start a throwaway local redirect that reads it from the environment, point the browser at it, and stop it again:

```bash
python3 -I -c '
import os, http.server
LOC = "https://jaroslavhejlek--haunted-command-station.apify.actor/?token=" + os.environ["APIFY_TOKEN"]
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(302); self.send_header("Location", LOC); self.end_headers()
    def log_message(self, *a): pass
http.server.HTTPServer(("127.0.0.1", 8689), H).serve_forever()'
```

Then open http://127.0.0.1:8689/ and stop the command with Ctrl+C.

## Things to know

- **Cold start is about 9 to 13 seconds** for a small Actor (platform provisioning, not the image pull). This image is much larger than the probe's, so the first start after a pull is slower: measure it, and open the URL once before a demo to warm it.
- **The run dies 5 minutes after the last viewer leaves.** An open WebSocket keeps it alive. Keep one tab open while judging. After that it is a cold start again, and saved runs under `out/` are gone with the container.
- **Every cold start runs one pipeline.** The server builds the first Nightfall step as it starts, which spends one set of Parasail and You.com calls.
- **The page needs the token in the URL.** The platform strips it before the request reaches the server, and no cookie is set, so the server cannot add it for the page.
- **Dry run only.** To post for real, run the station locally with `--live-dispatch`. Do not add it to the `Dockerfile`.
