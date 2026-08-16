# Scratch Coach

A Codio Custom Assistant (Virtual Coach) that helps middle school students with their Scratch projects. Follows the same single-`index.js` pattern as the other Milton Academy coaches (see the `coaches/` workspace CLAUDE.md).

## What makes this coach different

Scratch projects are `.sb3` files — ZIP archives containing a `project.json` block graph, which is useless to an LLM as-is. This coach:

1. **Finds `.sb3` files** in the assignment workspace via `codioIDE.workspace.getFileTree()` (up to 3, skipping dotfiles/dot-directories; loose `project.json` files are also picked up).
2. **Unpacks them in the browser with zero dependencies** — a minimal built-in ZIP reader (central-directory parser) plus the browser-native `DecompressionStream("deflate-raw")` API. No CDN scripts (Codio's CSP could block them), no build step.
3. **Converts the block graph to scratchblocks-style text** — hat blocks, nested C-blocks with `end`, operators, variables, lists, broadcasts, dropdown menus, the Pen extension, and custom blocks (`define jump (height)`), with a generic fallback for any opcode not in the map.
4. Sends that text to the LLM in `<project>` tags on the first message (custom `context` properties are invisible to the model — a known Codio quirk).

The system prompt tells the model that students see colorful blocks, not text, so it describes fixes in block-language ("snap a *wait* block inside your forever loop"), and enforces the shared pedagogical rules (no complete solutions, ≤2-3 block suggestions, Socratic for design questions, direct for bug diagnosis).

### `readFile` binary handling

`codioIDE.workspace.readFile()`'s return type for binary files is undocumented, so `toBytes()` accepts `Uint8Array`, `ArrayBuffer`, `Blob`, base64 strings, and latin-1 binary strings. **Caveat:** if Codio decodes binary files as UTF-8 text before returning them, the deflate stream is corrupted and unpacking will fail — the coach then degrades gracefully and asks the student to describe their scripts. If that happens in practice, the fix is to find the binary read option in the Codio client API (check https://codio.github.io/client/).

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
