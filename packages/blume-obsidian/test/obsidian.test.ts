import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { obsidianSource } from "../src/core/sources/obsidian.ts";

const fixture = (vault: string) =>
  obsidianSource(
    { vault },
    {
      cacheDir: join(import.meta.dir, ".cache"),
      mode: "build",
      projectRoot: import.meta.dir,
    }
  );

describe("obsidianSource", () => {
  test("loads every note in the vault", async () => {
    const { entries, diagnostics } = await fixture("fixtures/vault-basic").load();
    expect(entries.map((e) => e.ref)).toEqual([
      "Index.md",
      "guides/Getting Started.md",
    ]);
    // One warning: [[A Missing Note]] is intentionally unresolved.
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.severity).toBe("warning");
  });

  test("rewrites wikilinks by unique note name, with alias and heading", async () => {
    const { entries } = await fixture("fixtures/vault-basic").load();
    const index = entries.find((e) => e.ref === "Index.md");
    expect(index?.body.text).toContain("[Getting Started](/guides/getting-started)");
    expect(index?.body.text).toContain(
      "[the install steps](/guides/getting-started#install)"
    );
  });

  test("links to an index note land on the folder route, not /index", async () => {
    const { entries } = await fixture("fixtures/vault-basic").load();
    const guide = entries.find((e) => e.ref === "guides/Getting Started.md");
    expect(guide?.body.text).toContain("[Index](/)");
  });

  test("degrades unresolved wikilinks to plain text", async () => {
    const { entries } = await fixture("fixtures/vault-basic").load();
    const index = entries.find((e) => e.ref === "Index.md");
    expect(index?.body.text).toContain("A link to A Missing Note should");
    expect(index?.body.text).not.toContain("[[A Missing Note]]");
  });

  test("strips single-line %%comments%%", async () => {
    const { entries } = await fixture("fixtures/vault-basic").load();
    const index = entries.find((e) => e.ref === "Index.md");
    expect(index?.body.text).not.toContain("editor note");
  });

  test("leaves fenced code blocks verbatim", async () => {
    const { entries } = await fixture("fixtures/vault-basic").load();
    const index = entries.find((e) => e.ref === "Index.md");
    expect(index?.body.text).toContain("Inside a fence, [[Getting Started]] must stay verbatim.");
  });

  test("leaves inline code spans verbatim", async () => {
    const { entries } = await fixture("fixtures/vault-basic").load();
    const index = entries.find((e) => e.ref === "Index.md");
    expect(index?.body.text).toContain("Inline code like `[[Getting Started]]` must also stay verbatim.");
  });

  test("falls back to the filename as title, Obsidian-style", async () => {
    const { entries } = await fixture("fixtures/vault-basic").load();
    const index = entries.find((e) => e.ref === "Index.md");
    const guide = entries.find((e) => e.ref === "guides/Getting Started.md");
    expect(index?.data.title).toBe("Index");
    expect(guide?.data.title).toBe("Getting started");
  });

  test("stages entries with raw frontmatter and a stable hash", async () => {
    const { entries } = await fixture("fixtures/vault-basic").load();
    for (const entry of entries) {
      expect(entry.raw).toStartWith("---");
      expect(entry.hash).toBeTruthy();
    }
  });

  test("validate() throws a pointed error for a missing vault", () => {
    expect(() => fixture("fixtures/does-not-exist").validate?.()).toThrow(
      /does not exist/
    );
  });

  test("read() returns the staged raw text for a ref", async () => {
    const source = fixture("fixtures/vault-basic");
    await source.load();
    const raw = await source.read?.("guides/Getting Started.md");
    expect(raw).toContain("title: Getting started");
  });
});
