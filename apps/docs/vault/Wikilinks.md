---
description: Obsidian links become route links at build time.
sidebar:
  order: 1
---

Obsidian resolves `[[Name]]` by note name, unique across the vault. This source does the same, then rewrites each link to the note's route.

This very sentence links back to [[index|the introduction]] — check the sidebar URL it produces.

Supported today:

```md
[[Note]]            → [Note](/note)
[[Note|Alias]]      → [Alias](/note)
[[Note#Heading]]    → [Note](/note#heading)
```

An unresolved link degrades to plain text with a build warning instead of failing your build. Comments like this one are stripped: %%you can't read this on the site%% — open this note in Obsidian to see it.
