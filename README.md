# Scratch Coach

A Codio Custom Assistant (Virtual Coach) that helps middle school students with their Scratch projects. Follows the same single-`index.js` pattern as the other Milton Academy coaches (see the `coaches/` workspace CLAUDE.md).

## What makes this coach different

Scratch projects are `.sb3` files — ZIP archives containing a `project.json` block graph, which is useless to an LLM as-is. This coach:

1. **Finds `.sb3` files** through the `codioIDE.files` namespace: `getStructure()` for discovery (plus a direct attempt at the conventional `project.sb3` path), skipping dotfiles/dot-directories; loose `project.json` files are also picked up.
2. **Reads the binary as base64** via `codioIDE.files.getContentBase64(path)`, then **unpacks it in the browser with zero dependencies** — a minimal built-in ZIP reader (central-directory parser) plus the browser-native `DecompressionStream("deflate-raw")` API. No CDN scripts (Codio's CSP could block them), no build step.
3. **Converts the block graph to scratchblocks-style text** — hat blocks, nested C-blocks with `end`, operators, variables, lists, broadcasts, dropdown menus, the Pen extension, and custom blocks (`define jump (height)`), with a generic fallback for any opcode not in the map.
4. Sends that text to the LLM in `<project>` tags on the first message (custom `context` properties are invisible to the model — a known Codio quirk).

### Why `codioIDE.files`, not `workspace` or `getContext().files`

Confirmed live in Codio (Aug 2026): `codioIDE.workspace` is **undefined** in the Custom Assistant runtime, and `coachBot.getContext().files` only lists files **open in the editor** — which in a Scratch project is the Scratch GUI, never the `.sb3` (so it comes back as an empty array). The supported channel is the `codioIDE.files` namespace (`getStructure`, `getContent`, `getContentBase64`). `getStructure()` returns a **name→value map** (a file's value is a leaf like `1`; a directory's value is a nested map) — not an array of nodes; `collectProjectPaths()` handles both shapes. Reading the `.sb3` as **base64** is essential: a plain-text/UTF-8 read corrupts the deflate stream, but base64 round-trips the raw bytes intact.

The system prompt tells the model that students see colorful blocks, not text, so it describes fixes in block-language ("snap a *wait* block inside your forever loop"), and enforces the shared pedagogical rules (no complete solutions, ≤2-3 block suggestions, Socratic for design questions, direct for bug diagnosis).

### Binary handling

`getContentBase64()` returns a base64 string, which `toBytes()` decodes via `atob` (it also still accepts `Uint8Array`, `ArrayBuffer`, `Blob`, and latin-1 binary strings, in case `getContent()` is ever used for a non-`.sb3` file). If discovery and reading both fail, the coach degrades gracefully and asks the student to describe their scripts. See the [`codioIDE.files` API](https://codio.github.io/client/codioIDE.files.html) for the namespace reference.

## Testing

```bash
node --check index.js      # syntax
node test/run-test.js      # unpacker + renderer against test/test.sb3
```

The test harness stubs `window.codioIDE`, loads `index.js`, and exercises the exact functions the browser runs (Node 18+ has the same `DecompressionStream`). Regenerate the fixture zip after editing `test/fixture/project.json`:

```bash
cd test/fixture && zip -X ../test.sb3 project.json
```

There's also a "version" easter egg: typing `version` at any input prompt prints the deployed version — useful for confirming a release actually propagated in Codio.

## Deployment

1. Edit `index.js` / `metadata.json`, run the tests, commit, push.
2. Create a new GitHub release with a semantic version tag (bump `VERSION` in `index.js` to match).
3. In Codio: Organization > Extensions > "Check for Updates".
