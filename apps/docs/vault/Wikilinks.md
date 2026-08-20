---
description: Obsidian links become route links at build time.
sidebar:
  order: 1
---

Obsidian resolves `[[Name]]` by note name, unique across the vault. This source does the same, then rewrites each link to the note's route.

This very sentence links back to [[index|the introduction]] — check the sidebar URL it produces.

What this site's build emits today:

```md
[[Note]]            → [Note](/note)
[[Note|label]]      → [label](/note)
[[Note#Heading]]    → [Heading](/note#heading)
```

The link text follows Obsidian's own precedence: an explicit `|label` wins, then the heading, then the note name. That `|label` is *custom link text* — a different feature from Obsidian's `aliases` frontmatter property, which this source does not resolve.

An unresolved link degrades to plain text with a build warning instead of failing your build. Comments like this one are stripped: %%you can't read this on the site%% — open this note in Obsidian to see it.

## In the proposed core source

The in-core implementation proposed upstream keeps this syntax and changes how targets are resolved: anchors come from Blume's own heading pass rather than a hand-rolled slug, `[[#Heading]]` addresses a heading in the note you are writing, and note names match across Unicode normalization forms. None of that runs on this site — see [[Roadmap]] for the full list.
