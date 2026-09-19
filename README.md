# Spring Boot to TypeScript: the companion repository

Two applications answering the same endpoint, so you can see one stack beside
the other:

| | | |
|---|---|---|
| Spring Boot 4.1.1, Java 21 | `GET http://localhost:8080/health` | `{"status":"UP"}` |
| NestJS on Node 24.21.0 | `GET http://localhost:3000/health` | `{"status":"UP"}` |

Every version below was checked on a real machine on 2026-09-19 and the output
recorded in `VERIFIED-INSTALL-LOG.md`. Nothing here was written from memory.

## Prerequisites

| Tool | Version used | Why this one |
|---|---|---|
| Node.js | **24.21.0** | The current LTS at the time of recording, September 2026 |
| npm | **11.19.0** | Ships with that Node, not installed separately |
| TypeScript | **7.0.2** | Project-local, never global |
| Java | **21** | LTS, and what Spring Boot 4 supports |
| Maven | 3.9.11, or the bundled `./mvnw` | The wrapper means you need not install Maven |
| Docker | 29.7.2 | Only needed for the compose path below |

The repository pins Node in `.nvmrc`, so `nvm use` in the project root puts you
on the right version with no arguments.

## The Node path, in ten steps, ending at a verified endpoint

```bash
git clone <this repo> && cd spring-to-node   # 1
nvm install && nvm use                       # 2  reads .nvmrc -> 24.21.0
node --version && npm --version              # 3  v24.21.0, 11.19.0
cd nestjs-api                                # 4
npm install                                  # 5  reads package-lock.json
npm test                                     # 6  vitest, 2 passing
npm run build                                # 7  TypeScript -> dist/
ls dist                                      # 8  the JavaScript Node will run
npm run start:dev                            # 9  watch mode
curl -i http://localhost:3000/health         # 10 HTTP/1.1 200, {"status":"UP"}
```

Step 8 is the one that matters. Open `dist/main.js` and look: the types are
gone. Node never sees TypeScript.

## The Spring Boot path

```bash
cd spring-boot-api
./mvnw test                                  # 2 passing
./mvnw spring-boot:run
curl -i http://localhost:8080/health         # HTTP/1.1 200, {"status":"UP"}
```

## Both at once, with Docker

```bash
docker compose up --build
curl -i http://localhost:8080/health
curl -i http://localhost:3000/health
```

## Platform notes

**macOS** the sequence above is exactly what was run.
**Linux** identical, with nvm installed from its own install script.
**Windows** use nvm-windows, or WSL2 and follow the Linux path. `./mvnw`
becomes `mvnw.cmd` in PowerShell and CMD.

## A note on ports

`main.ts` reads `process.env.PORT ?? 3000`. If something already holds 3000,
`PORT=3005 npm run start:dev` moves it without editing a file. That happened
during the verification run and is worth knowing before it happens to you.

## Which artifact came from which run

`artifacts/` holds output the machine actually produced, not output written by
hand, and one file needs a label or it reads as a contradiction.

**`idempotency.json` is the AFTER run.** It reports one payment created from
fifty concurrent requests, which is the fixed behaviour. The opening of the
video shows the same command producing FIFTY payments, and that run is not in
this directory because the second run overwrote it. That is the arc of the
whole video: the same command, unchanged, before and after the constraint.

To reproduce the BEFORE state for yourself:

    # 1. take the guarantee out
    docker compose exec postgres psql -U postgres -d payments_node \
      -c 'ALTER TABLE payments DROP CONSTRAINT payments_idempotency_key_key;'
    # 2. comment out the lookup in
    #    nestjs-api/src/payments/payments.service.ts
    docker compose up -d --build nestjs-api
    # 3. run the identical command
    node load/idempotency-load.mjs

You will get a number in the dozens rather than fifty exactly, because the
figure depends on how the runtime interleaves on your machine. Fifty is what
this machine produced on 2026-09-19 and it is the number on screen.

**`node` in that file is the HOST runtime**, v22.22.2, which is what runs the
load generator. It is not the runtime under test. The applications run in
containers on Node 24.21.0 and Java 25, which is what the Dockerfiles pin and
what the video says.

## The blocking artifact is the second run too

`artifacts/blocking.json` holds the run **with the work moved to a worker
thread**: nineteen health checks served during the heavy request, p95 15.3ms,
and the heavy request itself at 552ms. Those are the figures the video quotes
for the fixed version, and they are reproducible from this file.

The FIRST run, the one where the handler blocks the event loop, is not in this
directory because the second run overwrote it. On the day it produced: one
health check served during the heavy request, p95 432ms on Node, against eleven
checks and p95 35.1ms on Spring, with the heavy request at 455ms.

To reproduce the blocking version, point the load generator at the synchronous
endpoint instead of the worker one:

    node load/blocking-load.mjs --path /receipts/sign

Your absolute numbers will differ with your machine. The shape will not: Node
stops serving and Spring gets slower.

**The Spring figures are measured, not asserted**, but they came from the same
overwritten run, so treat the exact milliseconds as this machine on that day
rather than as a benchmark.
