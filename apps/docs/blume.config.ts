import { defineConfig } from "blume";
import { obsidian } from "blume-obsidian";

// The docs eat their own dogfood twice: this site is built with Blume, and its
// content is an Obsidian vault (./vault) ingested by the very source this
// package implements. Open ./vault in Obsidian to see the "before"; the
// deployed site is the "after".
export default defineConfig({
  content: {
    sources: [{ source: obsidian({ vault: "vault" }), type: "custom" }],
  },
  description: "Publish an Obsidian vault with Blume. No export step.",
  github: {
    dir: "apps/docs",
    owner: "rbadillap",
    repo: "blume-obsidian",
  },
  title: "blume-obsidian",
});
