# Changelog

## 5.10.21 - 2026-11-27

- Expand the local research prompt preset with explicit guidance for factual, educational, medical, psychological, cultural, and legal discussion of adult and age-restricted topics.
- Clarify that keywords such as “adult”, “pornography”, “sex”, and “nudity” must not trigger automatic refusal without interpreting the actual request.
- Add the `profiles` directory to the npm package contents so the preset ships with the published package.
- Document that this preset is a prompt template and is not automatically injected into DSH's primary chat-model requests by the current ModSearch plugin architecture.

# Changelog

## 5.10.20 - 2026-11-27

- Fix the floating traffic monitor close control: closing the expanded panel now returns to the compact desktop widget instead of leaving the panel open.
- Improve drag handling with pointer capture and click suppression after a drag; keep the widget position persistent.
- Label provider-compatible custom edge/CDN proxy URLs explicitly and document that arbitrary public CDN nodes are not assumed safe or automatically faster.

## 5.10.19 - 2026-11-27

- Known issue: the traffic-monitor icon opens the traffic panel, but the panel cannot currently be closed after opening. This issue is documented and remains unresolved in this version.

## 5.10.18 - 2026-11-24

- Add a compact, persistent live API traffic monitor to the DeepSeek Harness chat, with expandable details, draggable placement, and remembered layout.
- Guard the browser-only traffic widget when the plugin client is evaluated in a non-DOM test environment.
- Refresh the traffic monitor's visual direction toward the fourth sci-fi dashboard concept: dark glass panels, cyan highlights, and compact telemetry.

  "name": "@sususgh/modsearch-c",
  "version": "5.10.17",
  "description": "The strongest free web search plugin for coding agents. Plug-in web search, X search, and page fetch for models without native web access. Free out of the box: no signup, no API key (Firecrawl keyless, 1,000 free credits/month)",
  "type": "module",
  "bin": {
    "modsearch": "dist/main.js"
  },
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "lint": "biome lint",
    "format": "biome format --write",
    "release": "node scripts/release.mjs",
    "prepublishOnly": "pnpm build",
    "eval": "node evals/run.mjs",
    "eval:compare": "node evals/compare-engines.mjs",
    "docs:list": "node scripts/docs-list.js"
  },
  "files": [
    "dist",
    "docs",
    "skills/modsearch/SKILL.md",
    "skills/modsearch/scripts",
    "skills/modsearch/references",
    "CHANGELOG.md",
    "SECURITY.md",
    "dsh",
    "dashboard",
    "cordis.patch.yml"
  ],
  "keywords": [
    "search",
    "web-fetch",
    "cli",
    "llm",
    "agent",
    "agent-skill",
    "antigravity",
    "modsearch",
    "dsh-plugin",
    "deepseek-harness"
  ],
  "author": "Leon Liu",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/sususgh/modsearchA.git"
  },
  "bugs": {
    "url": "https://github.com/sususgh/modsearchA/issues"
  },
  "homepage": "https://github.com/sususgh/modsearchA#readme",
  "engines": {
    "node": ">=22.13"
  },
  "exports": {
    ".": "./dsh/index.js",
    "./dsh": "./dsh/index.js",
    "./client": "./dsh/client.js",
    "./package.json": "./package.json"
  },
  "dsh": {
    "bundle": {
      "patch": "./cordis.patch.yml"
    },
    "client": {
      "inject": [],
      "platform": "web",
      "immediately": true
    }
  },
  "dependencies": {
    "commander": "^13.1.0",
    "undici": "^7.30.2"
  },
  "devDependencies": {
    "@biomejs/biome": "2.5.7",
    "@types/node": "^22.19.7",
    "@vitest/coverage-v8": "3.2.4",
    "typescript": "^5.9.3",
    "vite": "^6.4.1",
    "vitest": "3.2.4"
  }
}
