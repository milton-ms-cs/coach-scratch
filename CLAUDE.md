# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Scratch Coach — a Codio Custom Assistant (Virtual Coach) that helps middle school students debug their Scratch (`.sb3`) projects. It runs inside Codio's browser IDE via the `codioIDE.coachBot` API. The whole coach is `index.js` (an IIFE) plus `metadata.json`; there is no build step, no dependencies, and no package.json.

This is one of eight coaches in the `coaches/` workspace. **Read the parent `../CLAUDE.md` first** — it documents the shared coach architecture, the `coachBot` API surface, its critical quirks (e.g. `stream`/`modelSettings` are unsupported; custom `context` properties are invisible to the LLM so content must be appended to the user message), the release-per-change deployment flow, and the pedagogical constraints all coaches enforce. This file covers only what is specific to coach-scratch.

## Public repo: no student data, ever

This repository is public, because Codio installs extensions from GitHub. Never commit anything that comes from a real student: names, emails, IDs, their code, questions, transcripts, `.coach-log.json` contents or rows from Codio exports. Paraphrased or "anonymized" snippets count too. Prompt examples and test fixtures must be made up from scratch. Git history is permanent, so check `git diff --cached` before every commit. Full rule: the parent `../CLAUDE.md`.

## Commands

```bash
node --check index.js          # syntax check
node test/run-test.js          # unpacker/renderer tests plus conversation-loop tests (stubbed codioIDE)
```

There is no test runner/framework — `test/run-test.js` is a hand-rolled Node script that stubs `window.codioIDE`, `eval`s `index.js`, and asserts against a `mustContain` list of expected scratchblocks lines. To add a test case, edit `test/fixture/project.json` and the assertions, then regenerate the fixture zip:

```bash
cd test/fixture && zip -X ../test.sb3 project.json
```

Node 18+ is required — the test relies on the same native `DecompressionStream` the browser uses. The harness also builds extra `.sb3` fixtures in memory (a tiny stored-zip writer), so no extra fixture files are needed. It drives `onButtonPress` through a stubbed `codioIDE` to test exit matching, empty replies, the files-changed note, fingerprints, project ordering and the "Not shown" line. `index.js` exposes `window.__scratchCoachTest` (unpacker, renderer, `isExitMessage`, `getScratchProjectsText`, `systemPrompt`, ...) solely for this harness; it is unused inside Codio.

## Architecture

The distinguishing problem this coach solves: a `.sb3` file is a ZIP containing a `project.json` block graph, which is meaningless to an LLM as-is. Everything below turns it into readable scratchblocks-style text, entirely in-browser with **zero dependencies** (Codio's CSP can block CDN scripts). The pipeline, in order:

1. **`collectProjectPaths(structure)`** — walks `codioIDE.files.getStructure()` for `.sb3` files (and loose `project.json`), skipping dot-files/dirs. `getScratchProjectsText(latestMessage, openPaths)` tries the conventional `project.sb3` path only when the structure didn't list one, dedupes by basename, reads up to 8 projects (`MAX_PROJECTS`) within a 100k-char total budget (30k per project, marked `(cut off after N characters)`), and ranks them: projects named in the student's latest message (whole word, 3+ chars), then files open in the editor, then alphabetical. Ranking only decides what fits; the projects are DISPLAYED sorted by path so the fingerprint doesn't change when only the ranking does. Empty files show as `(empty file)`; non-string or timed-out reads (every files/getContext call is wrapped in `withTimeout`) go on the Not shown line. Anything left out (over the cap or budget, or unreadable) goes on a final `Not shown (too long to include, or couldn't be read): ...` line. Unpacked projects are cached by path + base64 length + `fingerprint()` so an unchanged `.sb3` isn't re-inflated every turn.
2. **`readProjectText(F, path)`** — reads `.sb3` files as base64 via `codioIDE.files.getContentBase64()`; **`toBytes(raw)`** then decodes that base64 into a `Uint8Array` (it also handles `Uint8Array`/`ArrayBuffer`/`Blob`/latin-1, kept for the `getContent()` text path).
3. **`extractProjectJson(bytes)`** — a minimal ZIP central-directory reader that locates `project.json` and inflates it via `inflateRaw()` (native `DecompressionStream("deflate-raw")`). Handles stored (method 0) and deflate (method 8).
4. **`renderProject(project)`** — converts the block graph to text. `renderStack` follows `.next` pointers; `renderBlockLine` handles C-blocks (indent + `end`, plus `else` for `control_if_else`); `renderReporter`/`renderInput` render nested reporters inline. Opcodes map through the `OPCODES` template table (`{PLACEHOLDER}` → filled from `block.inputs`/`block.fields`); unknown opcodes fall back to `genericText`. Custom blocks (`procedures_definition`/`procedures_call`) are reconstructed from `mutation.proccode`.

`buildContextMessage(question, isRefresh, latestMessage)` builds the `<project>` + `<guide>` message from a fresh `getContext()` and a fresh project read. It runs on the first turn and again **before every follow-up ask()**, replacing `messages[0]`; if the refresh fails the old context is kept. The first turn ends with "The student says: ...", a refresh ends with a note naming the first question so it isn't mistaken for the current one. The text inside `<project>` is saved as `lastFilesBlock`; its fingerprint is logged per turn in `contextFingerprints` and, when it changed, the next user message starts with "(Note: the student's files have changed since your last reply.)". The files-changed baseline is `lastAnsweredHash`, advanced only after a non-empty reply; a failed refresh (including a failed `getContext()`) keeps the previous `messages[0]` and logs `{len:null, hash:null, changed:false, refreshFailed:true}`. If the context can't be built at all, a `(I couldn't read the student's files just now.)` block is used. If the first reply failed (empty `messages`), the next input becomes the new first question with full context. Message history is trimmed to `messages[0]` + the last 8 messages.

Other shared behaviours (identical across coaches): `isExitMessage()` for goodbyes (also checked on the first message), empty/failed replies never enter history, `loadSessionHistory()` returns null on a failed read so the shared log is never overwritten, blank input is ignored.

### File access: use `codioIDE.files`, nothing else

Verified live in Codio (Aug 2026), and the reason v1.0.0–v1.0.4 silently failed in the IDE:

- **`codioIDE.workspace` does not exist** in the Custom Assistant runtime (`getFileTree`/`readFile` are undefined). Earlier versions targeted it and always hit the "describe your blocks" fallback.
- **`coachBot.getContext().files` only lists *open editor* files** — in a Scratch project that's the Scratch GUI, so it's an empty array; it never contains the `.sb3`.
- The supported channel is the **`codioIDE.files`** namespace: `getStructure()`, `getContent(path)`, `getContentBase64(path)`. Reference: <https://codio.github.io/client/codioIDE.files.html>.
- **`getStructure()` returns a name→value map** (file value = a leaf like `1`; directory value = a nested map), *not* an array of nodes. `collectProjectPaths()` handles both that map shape and the legacy `{name,type,children}` shape — both are covered by tests in `test/run-test.js`.
- **Read `.sb3` as base64.** A plain/UTF-8 read corrupts the deflate stream (high bytes become U+FFFD); `getContentBase64()` round-trips raw bytes intact.

### Things that will trip you up

- **`OPCODES` is a hand-maintained map.** When Scratch adds/changes blocks, unmapped opcodes silently degrade to `genericText`. If a rendered block looks wrong, check for a missing/incorrect template entry — and if it's a new C-block, it must also be added to `C_BLOCKS` or its body won't be indented/closed.
- **`collectUsedDataIds` matters for correctness, not cosmetics.** Scratch auto-creates a `my variable` in every project, so *declared ≠ used*. Variables/lists not referenced by any block are annotated `(not used in any script)` so the LLM doesn't chase phantom state. The test asserts both the annotated and un-annotated forms.
- **Graceful degradation is a feature.** Every discovery/read/unpack path is wrapped so that a corrupt/unreadable file, an unavailable `codioIDE.files` API, or a bad byte stream results in a "ask the student to describe their scripts" message rather than a crash. Preserve this when editing `getScratchProjectsText` (it returns `{ok, text}`; a refresh with `ok:false` throws so the previous context is kept).
- **Block-language only in LLM output.** The system prompt requires the model to describe fixes as visual blocks ("snap a *wait* block inside your forever loop"), never as scratchblocks text — students see colorful blocks, not the text representation the model reads.

### Try-first help (strict mode): the model labels, the code decides

Each reply starts with a hidden tag labelling the student's CURRENT message: `[[ask]]` (wants the next step, code or a check), `[[attempt]]` (shows or describes their own try) or `[[other]]`. The code keeps those labels in the box's `.coach-log.json` and decides the help: try-first when this would be the 3rd ask in the last 5 questions since the last attempt (`TRY_FIRST_ASKS`/`TRY_FIRST_WINDOW`), sticky until an attempt, and always at 10 questions in a session (`STRICT_SESSION_QUESTIONS`, reason `backstop`). `modeRule()` works this out and `recentQuestionsBlock()` tells the model, BEFORE it replies, which help each label gets this turn ("- [[ask]]: TRY-FIRST help"). The block lists this coach's own sessions within `STRICT_WORKSPACE_DAYS` (14), the last 10 questions with labels, the last marked `[current]`. It sits after `</guide>`, outside `<project>`, so it never touches the files fingerprint, the files-changed note or the .sb3 cache.

`TRY_FIRST_PROMPT` is always in the system prompt. Because `ask()` streams by default, every ask runs with `{ stream: false, preventMenu: true }` and the coach shows the reply itself: `readModeTag()` strips the tag (tolerating `**`, backticks, `#`, one closing bracket, extra words; a missing tag means `other`), then `write()`. The tag is hidden from the student but KEPT in the chat history (`historyReply()`) so the model keeps tagging. A reply that is only a tag takes the empty-reply path. Log fields on the session entry: `labels` (line up with `questions`), `modes` (`normal`/`try-first`, one per answered turn), `strict`, `strictReason` (`model` or `backstop`), `strictReleased`. All on the existing non-awaited `queueSave`. The log is per box (one student, one assignment). The block is shared verbatim across coaches (not vibe-coder). `loadSessionHistory()` also treats an empty `getStructure()` map as "unknown", never "no log yet".

### Version banner / easter egg

`VERSION` is a constant at the top of `index.js` and is printed on every button press. Typing `version` at any input prompt reprints it — used to confirm a release actually propagated in Codio. Keep `VERSION` in sync with the GitHub release tag on every deploy.
