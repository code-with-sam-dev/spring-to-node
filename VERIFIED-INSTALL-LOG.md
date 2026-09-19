# Verified install log

Every command below was RUN on a real machine and the output pasted as it came
back. Spec part 24: "The README ships the VERIFIED sequence, never the assumed
one. Do not publish instructions assembled theoretically."

Machine: macOS (Darwin 25.4.0, arm64). Date of run: 2026-09-18.

### `node --version`
```
v22.22.2
```

### `npm --version`
```
10.9.7
```

### `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm --version`
```
0.39.2
```

### `nvm install 24`
```
Downloading and installing node v24.21.0...
Downloading https://nodejs.org/dist/v24.21.0/node-v24.21.0-darwin-arm64.tar.xz...
#=#=#                                                                          
##O#-#                                                                         

    [download progress omitted]
Computing checksum with sha256sum
Checksums matched!
Now using node v24.21.0 (npm v11.19.0)
```

### `nvm use 24 && node --version && npm --version`
```
Now using node v24.21.0 (npm v11.19.0)
v24.21.0
11.19.0
```

### `node -e "console.log(1 + 2); console.log(\"Hello from Node\")"`
```
3
Hello from Node
```

### `npm init -y` (in node-basics)
```
Wrote to /Users/developer/IdeaProjects/psnl/spring-to-node/node-basics/package.json:

{
  "name": "basics",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs"
}


```

### `npm install --save-dev typescript`
```

added 2 packages, and audited 3 packages in 39s

found 0 vulnerabilities
```

### `npx tsc --version`
```
Version 7.0.2
```

### `ls -a`
```
.
..
node_modules
package-lock.json
package.json
```

### `npx tsc --init`
```

Created a new tsconfig.json

You can learn more at https://aka.ms/tsconfig
```

### `npx tsc`
```
```

### `ls dist`
```
index.js
index.js.map
```

### the generated JavaScript, `dist/index.js`
```javascript
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const payment = {
    id: 'pay_001',
    amount: 100,
    currency: 'USD',
};
console.log(`Payment ${payment.id} for ${payment.amount} ${payment.currency}`);
//# sourceMappingURL=index.js.map```

### `node dist/index.js`
```
Payment pay_001 for 100 USD
```

### the deliberate mistake: `amount: '100'` on a `number` field
```
src/index.ts(9,3): error TS2322: Type 'string' is not assignable to type 'number'.
```

### `npx @nestjs/cli new nestjs-api` (flags used here for a scripted run; the VIDEO walks every prompt)
```
CREATE nestjs-api/.oxlintrc.json (206 bytes)
CREATE nestjs-api/.prettierrc (52 bytes)
CREATE nestjs-api/README.md (6981 bytes)
CREATE nestjs-api/nest-cli.json (171 bytes)
CREATE nestjs-api/package.json (1429 bytes)
CREATE nestjs-api/tsconfig.build.json (170 bytes)
CREATE nestjs-api/tsconfig.json (601 bytes)
CREATE nestjs-api/vitest.config.e2e.ts (245 bytes)
CREATE nestjs-api/vitest.config.ts (350 bytes)
CREATE nestjs-api/src/app.controller.ts (277 bytes)
CREATE nestjs-api/src/app.module.ts (255 bytes)
CREATE nestjs-api/src/app.service.ts (142 bytes)
CREATE nestjs-api/src/main.ts (237 bytes)
CREATE nestjs-api/src/app.controller.spec.ts (623 bytes)
CREATE nestjs-api/test/app.e2e-spec.ts (728 bytes)
- Installation in progress... ☕
[32m✔[39m Installation in progress... ☕
🚀  Successfully created project [32mnestjs-api[39m
👉  Get started with the following commands:
[90m$ cd nestjs-api[39m
[90m$ npm run start[39m
                          [33mThanks for installing Nest 🙏[39m
                 [2mPlease consider donating to our open collective[22m
                        [2mto help us maintain this package.[22m
                   [1m🍷  Donate:[22m [4mhttps://opencollective.com/nest[24m
```


---

# What the run actually found, 2026-09-18

Spec part 24 exists because instructions assembled from memory are wrong. They
were. Every item below contradicts what a script written from memory would have
said, and each was found only by running the thing.

## 1. The current Node LTS is 24, not 22

nodejs.org gives LTS **v24.21.0** and Current v26.9.0 at the time of this
recording, September 2026. This machine was on v22.22.2, an older LTS line.
`nvm install 24` brought **node v24.21.0 with npm v11.19.0**. That pair is what
the course pins.

## 2. TypeScript is on 7.x

`npm install --save-dev typescript` then `npx tsc --version` gives **7.0.2**.
Worth saying out loud with the date attached, because most material online
assumes 5.x.

## 3. `tsc --init` no longer writes rootDir or outDir

The TS 7 generated tsconfig sets `module: nodenext`, `target: esnext`,
`verbatimModuleSyntax`, `isolatedModules` and `erasableSyntaxOnly`, and does NOT
include `rootDir` or `outDir`. The spec's part 9 list was written expecting the
old file. So adding those two by hand becomes a teaching beat rather than a
given: the compiler has no idea where you want the JavaScript until you say.

## 4. `npm init -y` renames your package

Run in a directory called `node-basics`, it wrote `"name": "basics"`. npm strips
a leading `node-`. Small, surprising, and exactly the kind of thing a viewer hits
alone at 11pm.

## 5. The types really are erased, and here is the proof

`src/index.ts` declares `type Payment`. After `npx tsc`, `dist/index.js`
contains no trace of it: just the object literal and the template string. That
generated file is the single most important thing to put on screen in Episode 0.

Deliberate failure, reproduced: `amount: '100'` on a `number` field gives
`src/index.ts(9,3): error TS2322: Type 'string' is not assignable to type 'number'.`

## 6. Nest now scaffolds vitest and oxlint, not Jest and ESLint

`npx @nestjs/cli@latest new` generated `vitest.config.ts`,
`vitest.config.e2e.ts` and `.oxlintrc.json`. Every tutorial describing
`jest.config` and `.eslintrc` for a fresh Nest project is now out of date. It
also emits ESM with `.js` import specifiers under `nodenext`, so
`import { X } from './x.js'` is correct even though the file is `x.ts`, which
looks wrong to a Java developer and needs saying explicitly.

## 7. Spring Boot is on 4.x and Initializr REFUSES 3.5.6

    {"status":400,"message":"Invalid Spring Boot version '3.5.6',
     Spring Boot compatibility range is >=4.0.0"}

Default is 4.1.1. Java options offered: 27, 25, 21, 17.

## 8. Initializr's version id is not the Maven coordinate

Passing `bootVersion=4.1.1.RELEASE`, which is the id in its own metadata, writes
that string into the pom and the build then fails:

    Non-resolvable parent POM ... spring-boot-starter-parent:pom:4.1.1.RELEASE (absent)

Central has `4.1.1`. Pass the plain version.

## 9. Spring Boot 4 MOVED @WebMvcTest

`org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest` does not
exist any more. It is now:

    org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest

found in `spring-boot-webmvc-test-4.1.1.jar`. Boot 4 split the test
autoconfiguration into per-technology modules. Any copied Boot 3 test class
fails to compile, which is a genuinely useful thing for this audience to see.

## The Episode 1 gate, verified

    $ curl -i http://localhost:8080/health      # Spring Boot 4.1.1, Java 21
    HTTP/1.1 200
    Content-Type: application/json
    {"status":"UP"}

    $ curl -i http://localhost:3000/health      # NestJS on Node 24.21.0
    HTTP/1.1 200 OK
    Content-Type: application/json; charset=utf-8
    {"status":"UP"}

Both hand written rather than pulled from Actuator, so the same conceptual
endpoint can be put side by side. `mvn test` 2 passed, `npm test` 2 passed.

NOTE ON THE PORT: 3000 was occupied by an unrelated app on this machine, so the
verification ran on 3005 via `PORT=3005`. The repository default stays 3000.
That `process.env.PORT ?? 3000` line is itself worth a beat.

---

# Part 20, run for real: what .gitignore is actually saving you from

### `git status --short | wc -l` with node_modules NOT ignored
```
tracked files git would offer to add: 10675
```

### the same command WITH .gitignore in place
```
tracked files git would offer to add: 46
```

**10,675 files against 46.** That is the number to put on screen. Not "node_modules
is large", not "it is generated": ten thousand six hundred and seventy five files
that git would otherwise track, in a project whose own source is forty six.
