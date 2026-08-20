---
description: What the prototype covers, what the proposed core source adds, and what neither does yet.
sidebar:
  order: 2
---

There are two implementations. **The prototype** is the package in this repository, and it is what this site runs. **The proposed core source** is an in-core `type: "obsidian"` source proposed upstream to Blume; it shares this design and origin, and adds three rounds of review on top. It cannot run here, because it uses Blume APIs that are not in a published release yet.

## What the prototype does

| Obsidian syntax | Status |
| --- | --- |
| `[[wikilinks]]` resolved by note name | Done |
| Custom link text, `[[Note\|label]]` | Done |
| `[[Note#Heading]]` anchors | Done |
| `%%comments%%` (single-line) | Done |
| Filename-as-title fallback | Done |

## What the proposed core source corrects

Each of these is a case the prototype gets wrong, so this site gets it wrong too. A vault of plain ASCII note names — like this one — never hits them.

| Case | Prototype | Proposed |
| --- | --- | --- |
| Non-Latin filenames (`日本語.md`) | Slug collapses to empty, collides at `/` | Routes correctly |
| Accented filenames (`Café.md`) | Publishes at `/caf` | Publishes at `/café` |
| macOS NFD filename, NFC wikilink | No match, link degrades | Matches |
| A note with `slug:` in frontmatter | Link points at the filename route | Link points at the published route |
| Heading anchors | Hand-rolled slug | Blume's own `extractHeadings` |
| `[[#Heading]]` in the current note | Left as literal text | Resolved |
| Code spans with `` `` `` delimiters, or spanning lines | Wikilinks inside get rewritten | Left verbatim |
| ` ``` ` inside a `~~~` fence | Closes the fence | Stays content |
| Two notes sharing a name | Silently picks one | Picks the first and warns |
| `prefix` written `/notes/` | Produces `//notes//note` | Normalized |

## What neither does yet

| Feature | Note |
| --- | --- |
| Callouts `> [!note]` → Blume Callout | Planned |
| Embeds `![[image.png]]` → served assets | Planned |
| Multi-line `%%comments%%` | Planned |
| The `aliases` frontmatter property | Planned. Obsidian's `aliases` is a distinct feature from `[[Note\|label]]`, which is custom link text |
| Backlink graph as a build artifact | Planned |
| i18n and versioned-content routing | Needs a core API for deriving an entry's final route |
| Git `lastModified` dates for notes | Needs the vault to bound the git scan |
| Headings that contain Markdown | Blume derives the manifest anchor and the rendered id differently, so a link to such a heading may land on the page rather than the section |
