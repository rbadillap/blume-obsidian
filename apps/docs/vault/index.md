---
title: Introduction
description: Publish an Obsidian vault with Blume. No export step.
---

**blume-obsidian** is a content source for [Blume](https://useblume.dev): point it at your Obsidian vault and get a production docs site — wikilinks resolved, comments stripped, nothing exported or generated into your repo.

This site is the proof: everything you are reading lives in an Obsidian vault at `apps/docs/vault`. Open that folder in Obsidian and you'll see these exact notes, wikilinks and all.

Start with [[Wikilinks]], then see what's [[Roadmap|on the roadmap]].

```ts
// blume.config.ts
import { defineConfig } from "blume";
import { obsidian } from "blume-obsidian";

export default defineConfig({
  content: {
    sources: [{ source: obsidian({ vault: "vault" }), type: "custom" }],
  },
});
```
