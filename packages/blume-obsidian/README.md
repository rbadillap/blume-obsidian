# blume-obsidian

Obsidian vault content source for [Blume](https://useblume.dev). Point it at a vault, get a docs site — no export step, no generated files in your repo.

```bash
bun add blume-obsidian
```

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

## What it handles

| Obsidian syntax | Status |
| --- | --- |
| `[[wikilinks]]`, `[[note\|alias]]`, `[[note#heading]]` | ✅ Resolved by unique note name, like Obsidian |
| Links to `index` notes | ✅ Land on the folder route, not `/index` |
| `%%comments%%` (single-line) | ✅ Stripped |
| Code fences and inline code | ✅ Left verbatim |
| Missing `title` frontmatter | ✅ Falls back to the filename, Obsidian-style |
| Unresolved wikilinks | ✅ Degrade to plain text with a build warning |
| Callouts `> [!note]` | 🚧 Planned — will lower to Blume's Callout |
| Embeds `![[image.png]]` | 🚧 Planned — will copy into served assets |
| Backlink graph as build artifact | 🚧 Planned |

## Options

```ts
obsidian({
  vault: "vault",        // vault directory, relative to the project root
  prefix: "notes",       // optional: namespace routes under /notes/
  exclude: ["private"],  // optional: top-level folders to skip
})
```

Vault changes hot-reload in `blume dev`. `blume` is a peer dependency.

## Dogfooding

The [docs site](https://github.com/rbadillap/blume-obsidian) is built with Blume and its content is an Obsidian vault ingested by this very source — the vault is the demo, and the docs are the permanent integration test.

MIT © Ronny Badilla
