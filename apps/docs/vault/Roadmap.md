---
description: What the source covers, and what's next.
sidebar:
  order: 2
---

| Obsidian syntax | Status |
| --- | --- |
| `[[wikilinks]]`, aliases, `#heading` anchors | Done |
| `%%comments%%` (single-line) | Done |
| Filename-as-title fallback | Done |
| Callouts `> [!note]` → Blume Callout | Planned |
| Embeds `![[image.png]]` → served assets | Planned |
| Multi-line `%%comments%%` | Planned |
| Backlink graph as a build artifact | Planned |

The package mirrors the file layout of Blume's built-in sources (`src/core/sources/obsidian.ts`), so adopting it into Blume core is a file copy plus a schema entry — see the README.
