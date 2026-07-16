# blume-obsidian

Obsidian vault content source for [Blume](https://useblume.dev). Point it at a vault, get a docs site — no export step, no generated files in your repo.

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

**Status: skeleton.** Wikilinks (aliases, heading anchors), single-line `%%comments%%`, filename-as-title, unresolved-link degradation, and vault watching work. Callouts, embeds/attachments, multi-line comments, and the backlink graph are planned — see `apps/docs/vault/Roadmap.md`.

## Layout

```
packages/blume-obsidian/     the source package
  src/core/sources/obsidian.ts
apps/docs/                   docs site, built with Blume
  vault/                     an Obsidian vault — the docs content AND the live demo
```

The docs dogfood twice: the site is built with Blume, and its content is ingested from `apps/docs/vault` by this very source. Pathological cases (broken links, duplicate names) live in `packages/blume-obsidian/test/fixtures/`, not in the docs vault.

## Design notes

- **Tree mirror.** `src/core/sources/obsidian.ts` copies the layout and conventions of Blume's built-in sources. In-core adoption is: copy the file into `packages/blume/src/core/sources/`, swap the `blume/*` imports for the relative ones (`../frontmatter.ts`, `./cache.ts`, `./types.ts`), add an `obsidianSourceSchema` to the config union, and add a branch in `resolve.ts`. The `obsidian()` convenience wrapper (which self-builds a `SourceContext`, since `type: "custom"` sources get none) is deleted on adoption.
- **`blume` is a peer dependency.** The host project always has it; types come from `blume/sources/types.ts`, and the only runtime imports are the same two helpers built-in sources use (`frontmatter`, `hashText`).
- **Degrade, don't fail.** Unresolved wikilinks render as plain text with a build warning — same posture as Blume's own remote sources.

## Develop

```
bun install
bun test               # in packages/blume-obsidian
bun --bun run dev      # in apps/docs (Bun runtime; Node needs 22.12+)
```
