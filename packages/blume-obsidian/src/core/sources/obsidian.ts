// Mirrors the layout and conventions of Blume's built-in sources
// (packages/blume/src/core/sources/*.ts) so a future in-core adoption is a file
// copy: the `blume/*` specifiers below become the relative imports the built-in
// sources already use (`../frontmatter.ts`, `./cache.ts`, `./types.ts`).
import { existsSync, watch as fsWatch } from "node:fs";
import { readdir, readFile } from "node:fs/promises";

import matter from "blume/core/frontmatter.ts";
import { hashText } from "blume/sources/cache.ts";
import type {
  ContentSource,
  SourceContext,
  SourceEntry,
  SourceLoadResult,
} from "blume/sources/types.ts";
import { basename, join, relative, resolve } from "pathe";

/** Options for the Obsidian vault source. */
export interface ObsidianSourceOptions {
  /** Top-level vault folders to skip, in addition to dot-folders. */
  exclude?: string[];
  /** Unique source name; defaults to `obsidian`. */
  name?: string;
  /** Namespaces the source's routes under `/<prefix>/`; e.g. `vault`. */
  prefix?: string;
  /** Vault directory, relative to the project root or absolute. */
  vault: string;
}

const MARKDOWN_FILE = /\.md$/iu;
/** `%%comment%%` on a single line; multi-line comments are a TODO. */
const OBSIDIAN_COMMENT = /%%.*?%%/gu;
/** `[[target]]`, `[[target|alias]]`, `[[target#heading]]`, `![[embed]]`. */
const WIKILINK =
  /(?<embed>!)?\[\[(?<target>[^\]|#\n]+)(?:#(?<heading>[^\]|\n]+))?(?:\|(?<alias>[^\]\n]+))?\]\]/gu;
const FENCE_LINE = /^ {0,3}(?:`{3,}|~{3,})/u;
const NON_SLUG = /[^a-z0-9]+/gu;
const EDGE_DASHES = /^-+|-+$/gu;

/** Slugify one route segment (`Getting Started` -> `getting-started`). */
const slugifySegment = (segment: string): string =>
  segment.toLowerCase().replaceAll(NON_SLUG, "-").replaceAll(EDGE_DASHES, "");

/**
 * Vault-relative file path to a route slug: segments slugged, `.md` dropped. A
 * trailing `index` segment is dropped too, mirroring Blume's route derivation
 * (`normalize.ts` `addRouteSegment`), so links to `index` notes land on the
 * folder's route (`/`, `/guides`) instead of a phantom `/index`.
 */
const pathToSlug = (rel: string): string => {
  const segments = rel
    .replace(MARKDOWN_FILE, "")
    .split("/")
    .map(slugifySegment)
    .filter(Boolean);
  if (segments.at(-1) === "index") {
    segments.pop();
  }
  return segments.join("/");
};

/**
 * Heading anchor slug. TODO: align with `github-slugger` (what Blume's
 * `extractHeadings` and the renderer use) before claiming anchor parity.
 */
const headingSlug = slugifySegment;

/**
 * Obsidian resolves `[[Name]]` by note name, unique across the whole vault —
 * not by path. Index lowercase basenames (and full relative paths, so
 * `[[folder/Name]]` also resolves) to route slugs.
 */
const buildNoteIndex = (files: string[]): Map<string, string> => {
  const index = new Map<string, string>();
  for (const rel of files) {
    const slug = pathToSlug(rel);
    index.set(rel.replace(MARKDOWN_FILE, "").toLowerCase(), slug);
    index.set(basename(rel).replace(MARKDOWN_FILE, "").toLowerCase(), slug);
  }
  return index;
};

interface TransformResult {
  text: string;
  /** Wikilink targets that resolved to no note in the vault. */
  unresolved: string[];
}

/** Split a line into code spans (`` `...` ``) and plain chunks. */
const CODE_SPAN = /(`+[^`]*`+)/u;

/** Rewrite one chunk's wikilinks and strip single-line comments. */
const transformChunk = (
  chunk: string,
  index: Map<string, string>,
  linkBase: string,
  unresolved: string[]
): string =>
  chunk.replaceAll(OBSIDIAN_COMMENT, "").replaceAll(WIKILINK, (...args) => {
    const groups = args.at(-1) as Record<string, string | undefined>;
    const target = (groups.target ?? "").trim();
    const label = groups.alias?.trim() || groups.heading?.trim() || target;
    // TODO(embeds): copy `![[file]]` attachments into the served assets dir and
    // rewrite to an image/link; passed through untouched for now.
    if (groups.embed) {
      return args[0] as string;
    }
    const slug = index.get(target.toLowerCase());
    if (slug === undefined) {
      unresolved.push(target);
      return label;
    }
    const anchor = groups.heading ? `#${headingSlug(groups.heading)}` : "";
    return `[${label}](${linkBase}/${slug}${anchor})`;
  });

/** Rewrite a line, leaving inline code spans (`` `[[x]]` ``) verbatim. */
const transformLine = (
  line: string,
  index: Map<string, string>,
  linkBase: string,
  unresolved: string[]
): string =>
  line
    .split(CODE_SPAN)
    .map((chunk, i) =>
      i % 2 === 1 ? chunk : transformChunk(chunk, index, linkBase, unresolved)
    )
    .join("");

/**
 * Transform an Obsidian-flavored body to Blume-ready Markdown: wikilinks become
 * route links, `%%comments%%` are stripped. Fenced code blocks and inline code
 * spans pass through verbatim — the same exclusion Blume's own
 * `extractHeadings` applies — so documentation *about* the syntax stays intact.
 * Callouts (`> [!note]`) pass through for now. TODO(callouts): lower to
 * Blume's Callout component.
 */
const transformBody = (
  body: string,
  index: Map<string, string>,
  linkBase: string
): TransformResult => {
  const unresolved: string[] = [];
  let inFence = false;
  const lines = body.split("\n").map((line) => {
    if (FENCE_LINE.test(line)) {
      inFence = !inFence;
      return line;
    }
    return inFence ? line : transformLine(line, index, linkBase, unresolved);
  });
  return { text: lines.join("\n"), unresolved };
};

/**
 * Lower one vault note to a staged Markdown entry. Frontmatter passes through;
 * a missing `title` falls back to the note's filename, which is how Obsidian
 * itself titles notes.
 */
const fileToEntry = (
  rel: string,
  absPath: string,
  source: string,
  index: Map<string, string>,
  linkBase: string
): { entry: SourceEntry; unresolved: string[] } => {
  const { content, data } = matter(source);
  const title =
    typeof data.title === "string"
      ? data.title
      : basename(rel).replace(MARKDOWN_FILE, "");
  const merged = { ...data, title };
  const { text, unresolved } = transformBody(content.trim(), index, linkBase);
  const raw = matter.stringify(`${text}\n`, merged);
  return {
    entry: {
      body: { format: "md", text },
      data: merged,
      hash: hashText(raw),
      raw,
      ref: rel,
      // An index note's link slug is "" (routes to the folder), but the entry
      // itself keeps `index` so Blume's own route derivation places the page.
      slug: pathToSlug(rel) || "index",
      sourcePath: absPath,
    },
    unresolved,
  };
};

/** Recursively list vault-relative `.md` paths, skipping dot/excluded dirs. */
const walkVault = async (
  dir: string,
  root: string,
  exclude: Set<string>
): Promise<string[]> => {
  const found: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") || exclude.has(entry.name)) {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      // oxlint-disable-next-line no-await-in-loop -- directory trees are shallow; parallelizing complicates ordering for no measurable win.
      found.push(...(await walkVault(full, root, exclude)));
    } else if (MARKDOWN_FILE.test(entry.name)) {
      found.push(relative(root, full));
    }
  }
  return found.sort();
};

/**
 * Obsidian vault content source. Reads a vault directly — no export step, no
 * generated files — lowering Obsidian's dialect (wikilinks, comments; callouts
 * and embeds are TODO) to Blume-ready Markdown at load time. Unresolved
 * wikilinks degrade to plain text with a warning rather than failing the build.
 */
export const obsidianSource = (
  options: ObsidianSourceOptions,
  ctx: SourceContext
): ContentSource => {
  const name = options.name ?? "obsidian";
  const vaultDir = resolve(ctx.projectRoot, options.vault);
  const exclude = new Set(options.exclude ?? []);
  const linkBase = options.prefix ? `/${options.prefix}` : "";
  let snapshot = new Map<string, SourceEntry>();

  const load = async (): Promise<SourceLoadResult> => {
    const files = await walkVault(vaultDir, vaultDir, exclude);
    const index = buildNoteIndex(files);
    const unresolved: string[] = [];
    const entries: SourceEntry[] = [];
    for (const rel of files) {
      // oxlint-disable-next-line no-await-in-loop -- entries are few and file reads are local; sequential keeps memory flat.
      const source = await readFile(join(vaultDir, rel), "utf-8");
      const lowered = fileToEntry(rel, join(vaultDir, rel), source, index, linkBase);
      entries.push(lowered.entry);
      unresolved.push(...lowered.unresolved);
    }
    snapshot = new Map(entries.map((entry) => [entry.ref, entry]));
    return {
      diagnostics:
        unresolved.length > 0
          ? [
              {
                code: "BLUME_SOURCE_UNAVAILABLE",
                message: `Source "${name}" found ${unresolved.length} unresolved wikilink(s) (${[...new Set(unresolved)].slice(0, 5).join(", ")}); rendered as plain text.`,
                severity: "warning",
              },
            ]
          : [],
      entries,
    };
  };

  const read = async (ref: string): Promise<string> => {
    const cached = snapshot.get(ref);
    if (cached) {
      return cached.raw ?? cached.body.text;
    }
    return await readFile(join(vaultDir, ref), "utf-8");
  };

  const validate = (): void => {
    if (!existsSync(vaultDir)) {
      throw new Error(
        `Source "${name}" points at "${vaultDir}", which does not exist. Set \`vault\` to your Obsidian vault directory.`
      );
    }
  };

  // `recursive` is supported on macOS and Windows; on Linux it needs Node 20+.
  const watch = (onChange: () => void): (() => void) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const watcher = fsWatch(vaultDir, { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(onChange, 100);
    });
    return () => {
      clearTimeout(timer);
      watcher.close();
    };
  };

  return { load, name, prefix: options.prefix, read, staged: true, validate, watch };
};

/**
 * Convenience factory for `blume.config.ts`'s `type: "custom"` slot, which
 * hands the source no runtime context (custom sources self-manage). Builds the
 * minimal `SourceContext` the core would inject; in-core adoption drops this
 * wrapper and threads the real one through `resolve.ts`.
 */
export const obsidian = (options: ObsidianSourceOptions): ContentSource =>
  obsidianSource(options, {
    cacheDir: resolve(process.cwd(), ".blume", "cache", options.name ?? "obsidian"),
    mode: "build",
    projectRoot: process.cwd(),
  });
