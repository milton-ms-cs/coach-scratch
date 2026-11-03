// Node test harness for the sb3 unpacker + project renderer in index.js.
// Usage: node test/run-test.js  (run from the repo root or anywhere)
// Requires Node 18+ (uses the same DecompressionStream API the browser uses).

const fs = require("fs");
const path = require("path");

// Stub the Codio environment so the IIFE in index.js can load.
global.window = {
  codioIDE: {
    coachBot: {
      register: function() {},
      MESSAGE_ROLES: { ASSISTANT: "assistant" }
    }
  }
};

const src = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
eval(src);

(async function() {
  const t = global.window.__scratchCoachTest;
  if (!t) {
    console.error("FAIL: index.js did not expose __scratchCoachTest");
    process.exit(1);
  }

  const sb3Path = path.join(__dirname, "test.sb3");
  if (!fs.existsSync(sb3Path)) {
    console.error("FAIL: test/test.sb3 missing. Regenerate with: cd test/fixture && zip ../test.sb3 project.json");
    process.exit(1);
  }

  // --- Test 1: unpack a real zip (Uint8Array path, deflate) ---
  const bytes = new Uint8Array(fs.readFileSync(sb3Path));
  const jsonText = await t.extractProjectJson(bytes);
  const project = JSON.parse(jsonText);
  const rendered = t.renderProject(project);
  console.log(rendered);
  console.log("\n----------------------------------------\n");

  const mustContain = [
    "=== Sprite: Cat ===",
    "when green flag clicked",
    "go to x: (0) y: (0)",
    "set [score] to [0]",
    "forever",
    "if <touching (edge) ?> then",
    "turn right (15) degrees",
    "change [score] by (1)",
    "else",
    "move (10) steps",
    "end",
    "wait (0.1) seconds",
    "when [space] key pressed",
    "broadcast (jump)",
    "when I receive [jump]",
    "repeat (10)",
    "change y by ((score) * (2))",
    "jump (50)",
    "define jump (height)",
    "change y by (height)",
    "Lists: high scores (not used in any script)",
    "Variables: score\n" // used variable gets no annotation
  ];
  let failures = 0;
  for (const needle of mustContain) {
    if (rendered.indexOf(needle) < 0) {
      console.error("FAIL: rendered output missing: " + needle);
      failures++;
    }
  }

  // --- Test 2: base64 string path (some readFile implementations return base64) ---
  const b64 = fs.readFileSync(sb3Path).toString("base64");
  const fromB64 = await t.extractProjectJson(await t.toBytes(b64));
  if (fromB64 !== jsonText) { console.error("FAIL: base64 path mismatch"); failures++; }

  // --- Test 3: binary (latin-1) string path ---
  const binStr = fs.readFileSync(sb3Path).toString("latin1");
  const fromBin = await t.extractProjectJson(await t.toBytes(binStr));
  if (fromBin !== jsonText) { console.error("FAIL: binary-string path mismatch"); failures++; }

  // --- Test 4: garbage input fails cleanly ---
  try {
    await t.extractProjectJson(new Uint8Array([1, 2, 3, 4, 5]));
    console.error("FAIL: garbage input did not throw");
    failures++;
  } catch (e) { /* expected */ }

  // --- Test 5: collectProjectPaths against Codio's real getStructure() shape ---
  // getStructure() returns a name->value MAP: file value = leaf (1), dir = nested map.
  // (This is the shape observed live in a Codio Scratch project.)
  const structure = {
    ".gitignore": 1,
    "project.sb3": 1,
    ".guides": { "img": { ".gitkeep": 1, "space-talk-pico-click.svg": 1 } },
    ".settings": 1,
    "extra": { "bonus.sb3": 1, "notes.txt": 1 }
  };
  const found = [];
  t.collectProjectPaths(structure, "", found);
  if (found.indexOf("project.sb3") < 0) {
    console.error("FAIL: collectProjectPaths missed root project.sb3 — found: " + JSON.stringify(found));
    failures++;
  }
  if (found.indexOf("extra/bonus.sb3") < 0) {
    console.error("FAIL: collectProjectPaths missed nested extra/bonus.sb3 — found: " + JSON.stringify(found));
    failures++;
  }
  if (found.indexOf("notes.txt") >= 0) {
    console.error("FAIL: collectProjectPaths picked up a non-project file (notes.txt)");
    failures++;
  }
  // Legacy array-of-nodes shape should still work.
  const nodeShape = [
    { name: "sub", type: "directory", children: [{ name: "game.sb3", type: "file" }] },
    { name: "readme.md", type: "file" }
  ];
  const found2 = [];
  t.collectProjectPaths(nodeShape, "", found2);
  if (found2.indexOf("sub/game.sb3") < 0) {
    console.error("FAIL: collectProjectPaths missed sub/game.sb3 in node-shape — found: " + JSON.stringify(found2));
    failures++;
  }

  // ============================================================
  // Conversation-loop tests (drive onButtonPress through a stubbed codioIDE)
  // ============================================================
  function check(cond, msg) { if (!cond) { console.error("FAIL: " + msg); failures++; } }

  // Minimal stored (uncompressed) zip with a single project.json, for generated fixtures.
  function crc32(buf) {
    let c, crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      c = (crc ^ buf[i]) & 0xFF;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      crc = (crc >>> 8) ^ c;
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function makeSb3(projectObj) {
    const data = Buffer.from(JSON.stringify(projectObj), "utf8");
    const name = Buffer.from("project.json");
    const crc = crc32(data);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28);
    const localPart = Buffer.concat([lh, name, data]);
    const cdPart = Buffer.concat([ch, name]);
    const eocd = Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10);
    eocd.writeUInt32LE(cdPart.length, 12); eocd.writeUInt32LE(localPart.length, 16);
    return Buffer.concat([localPart, cdPart, eocd]);
  }
  function tinyProject(spriteName, nScripts) {
    const blocks = {};
    for (let i = 0; i < nScripts; i++) {
      blocks["b" + i] = { opcode: "event_whenflagclicked", next: "m" + i, topLevel: true, parent: null, inputs: {}, fields: {} };
      blocks["m" + i] = { opcode: "motion_movesteps", next: null, topLevel: false, parent: "b" + i, inputs: { STEPS: [1, [4, "10"]] }, fields: {} };
    }
    return { targets: [
      { isStage: true, name: "Stage", variables: {}, lists: {}, blocks: {}, costumes: [] },
      { isStage: false, name: spriteName, variables: {}, lists: {}, blocks: blocks, costumes: [] }
    ] };
  }

  const fixtureBytes = fs.readFileSync(sb3Path);

  // Build a fresh stubbed environment, eval index.js, and return handles to drive it.
  // opts.files: { path: Buffer }, opts.inputs: [string | {text, before}], opts.ask(n, messages): result
  function makeEnv(opts) {
    const files = Object.assign({}, opts.files || {});
    const logFiles = {};
    if (opts.existingLog !== undefined) logFiles[".coach-log.json"] = opts.existingLog;
    const env = { asks: [], prompts: [], writes: [], inputPrompts: [], menu: 0, files: files, logFiles: logFiles, b64Reads: 0 };
    const inputs = (opts.inputs || []).slice();
    let callback = null;
    global.window = {
      codioIDE: {
        coachBot: {
          register: function(id, label, cb) { callback = cb; },
          MESSAGE_ROLES: { ASSISTANT: "assistant" },
          getContext: async function() { return { guidesPage: { content: opts.guide || "Make the cat move." }, assignmentData: { name: "Test Lesson" }, files: opts.openFiles || [] }; },
          input: async function(prompt) {
            env.inputPrompts.push(prompt);
            if (!inputs.length) throw new Error("no more input");
            const item = inputs.shift();
            if (typeof item === "object" && item !== null) { if (item.before) item.before(env); return item.text; }
            return item;
          },
          ask: async function(args, o) {
            if (!o || o.stream !== false || o.preventMenu !== true) throw new Error("ask() must be called with { stream: false, preventMenu: true }");
            env.prompts.push(args.systemPrompt);
            env.asks.push(JSON.parse(JSON.stringify(args.messages)));
            return opts.ask ? opts.ask(env.asks.length, args.messages) : { result: "reply " + env.asks.length };
          },
          write: function(t) { env.writes.push(t); },
          showMenu: function() { env.menu++; },
          showThinkingAnimation: function() {},
          hideThinkingAnimation: function() {}
        },
        files: {
          getStructure: async function() {
            const tree = {};
            Object.keys(files).forEach(function(k) { tree[k] = 1; });
            Object.keys(logFiles).forEach(function(k) { tree[k] = 1; });
            return tree;
          },
          getContentBase64: async function(p) {
            env.b64Reads++;
            if (!(p in files)) throw new Error("no such file " + p);
            return files[p].toString("base64");
          },
          getContent: async function(p) { if (p in logFiles) return logFiles[p]; throw new Error("no such file " + p); },
          add: async function(p, c) { if (p in logFiles) throw new Error("exists"); logFiles[p] = c; },
          deleteFiles: async function(ps) { ps.forEach(function(p) { delete logFiles[p]; }); }
        }
      }
    };
    eval(src);
    env.run = function() { return callback(); };
    env.log = function() { return logFiles[".coach-log.json"] ? JSON.parse(logFiles[".coach-log.json"]) : null; };
    env.test = global.window.__scratchCoachTest;
    return env;
  }

  const VER = /const VERSION = "([^"]+)"/.exec(src)[1];
  const NOTE = "(Note: the student's files have changed since your last reply.)";
  const lastUser = function(msgs) { return msgs[msgs.length - 1].content; };

  // --- isExitMessage ---
  {
    const env = makeEnv({});
    const ex = env.test.isExitMessage;
    ["thanks!", "ok bye", "Thank you", "no thanks 🙂", "bye", "done", "stop", "that's all", "thank you so much", "i\u2019m good thanks", "I'm good"].forEach(function(m) {
      check(ex(m) === true, "isExitMessage should exit on: " + m);
    });
    ["stop button doesn't work", "thanks, but why is the cat stuck?", "how do I stop the forever loop", "", "my sprite is done moving and won't turn around", "thanks for nothing, why?", "thanks still broken", "im done with loops", "im good at this", "thanks, but why?", "ok", "good"].forEach(function(m) {
      check(ex(m) === false, "isExitMessage should NOT exit on: " + m);
    });
    check(ex(null) === false && ex(undefined) === false, "isExitMessage handles null/undefined");
  }

  // --- first message is a goodbye: no ask, no log, menu shown ---
  {
    const env = makeEnv({ files: { "project.sb3": fixtureBytes }, inputs: ["thanks!"] });
    await env.run();
    check(env.asks.length === 0, "goodbye as first message must not call ask()");
    check(env.log() === null, "goodbye as first message must not create a log session");
    check(env.menu === 1, "goodbye as first message shows the menu");
  }

  // --- follow-up prompt text, version check, blank messages ---
  {
    const env = makeEnv({ files: { "project.sb3": fixtureBytes }, inputs: [" Version ", "why does my cat spin?", "   ", "VERSION", "ok bye"] });
    await env.run();
    check(env.inputPrompts.indexOf("What else can I help you with? (Type 'bye' when you're done.)") >= 0, "follow-up prompt text");
    check(env.inputPrompts[0] === "What's your Scratch question?", "first prompt unchanged");
    check(env.asks.length === 1, "version/blank/goodbye must not call ask() (got " + env.asks.length + ")");
    check(env.writes.some(function(w) { return w.indexOf("Current version: " + VER) >= 0; }), "version printed (trimmed, case-insensitive)");
  }

  // --- empty ask() result never enters history; failed first reply recovers with new question ---
  {
    const env = makeEnv({
      files: { "project.sb3": fixtureBytes },
      inputs: ["why does my cat spin?", "what about the score?", "and the jump script?", "bye"],
      ask: function(n) { return n === 1 ? { result: "" } : (n === 2 ? {} : { result: "real answer" }); }
    });
    await env.run();
    check(env.asks.length === 3, "three asks expected, got " + env.asks.length);
    check(env.writes.filter(function(w) { return w.indexOf("didn't get an answer") >= 0; }).length === 2, "empty replies write the retry message");
    const a2 = env.asks[1];
    check(a2.length === 1 && a2[0].content.indexOf("what about the score?") >= 0 && a2[0].content.indexOf("<project>") >= 0,
      "after a failed first reply the new question gets full context as the only message");
    check(a2[0].content.indexOf("The student says: what about the score?") >= 0 && a2[0].content.indexOf("first question in this chat") < 0, "the old first question is not presented as current after a failed first reply");
    const a3 = env.asks[2];
    check(a3.every(function(m) { return m.content && m.content.trim(); }), "no empty message in history");
    check(a3.length === 1, "failed replies leave no assistant turns (got " + a3.length + " messages)");
    const log = env.log();
    check(log && log[0].failedReplies === 2, "failedReplies logged (got " + (log && log[0].failedReplies) + ")");
  }

  // --- files-changed note only when the files block changes; fingerprints logged ---
  {
    const changedFixture = makeSb3(tinyProject("Rocket", 2));
    const env = makeEnv({
      files: { "project.sb3": fixtureBytes },
      existingLog: JSON.stringify([{ coach: "python", questions: ["old"] }]),
      inputs: ["why does my cat spin?", "still stuck", { text: "I changed it", before: function(e) { e.files["project.sb3"] = changedFixture; } }, "same again", "bye"]
    });
    await env.run();
    check(env.asks.length === 4, "four asks expected, got " + env.asks.length);
    check(lastUser(env.asks[0]).indexOf("(Note:") < 0, "no note on first turn");
    check(lastUser(env.asks[1]) === "still stuck", "no note when files unchanged");
    check(lastUser(env.asks[2]) === NOTE + "\n\nI changed it", "note present when files changed");
    check(env.asks[2][0].content.indexOf("Sprite: Rocket") >= 0, "messages[0] refreshed with the new project");
    check(lastUser(env.asks[3]) === "same again", "no note after the change was announced once");
    // refreshed first message must not present the old question as current
    check(env.asks[1][0].content.indexOf("The student says:") < 0, "refresh does not say 'The student says:'");
    check(env.asks[1][0].content.indexOf("first question in this chat was: why does my cat spin?") >= 0, "refresh names the first question");
    check(env.asks[0][0].content.indexOf("The student says: why does my cat spin?") >= 0, "first turn keeps 'The student says:'");
    const log = env.log();
    check(log.length === 2 && log[0].coach === "python", "existing log history preserved");
    const fps = log[1].contextFingerprints;
    check(Array.isArray(fps) && fps.length === 4, "contextFingerprints logged per turn (got " + JSON.stringify(fps) + ")");
    check(fps && fps.map(function(f) { return f.changed; }).join() === "false,false,true,false", "fingerprint changed flags: " + (fps && fps.map(function(f) { return f.changed; }).join()));
    check(fps && /^[0-9a-f]{8}$/.test(fps[0].hash) && fps[0].len > 0, "fingerprint shape");
    check(log[1].questions[2] === "I changed it", "logged question is the raw input");
  }

  // --- unreadable existing log disables saving (never wipes history) ---
  {
    const env = makeEnv({ files: { "project.sb3": fixtureBytes }, existingLog: "{not json", inputs: ["hi there", "bye"] });
    await env.run();
    check(env.logFiles[".coach-log.json"] === "{not json", "corrupt log is left untouched");
  }

  // --- 5-project fixture is fully included, shown in path order ---
  {
    const files = {};
    ["alpha", "bravo", "charlie", "delta", "echo"].forEach(function(n, i) { files[n + ".sb3"] = makeSb3(tinyProject("Sprite" + n, 1 + i)); });
    const env = makeEnv({ files: files, inputs: ["help with delta please", "bye"] });
    await env.run();
    const ctx = env.asks[0][0].content;
    ["alpha", "bravo", "charlie", "delta", "echo"].forEach(function(n) {
      check(ctx.indexOf("Project file: " + n + ".sb3") >= 0, "project " + n + " included");
    });
    check(ctx.indexOf("Not shown") < 0, "no 'Not shown' line when everything fits");
    check(ctx.indexOf("Project file: alpha.sb3") < ctx.indexOf("Project file: delta.sb3"), "projects are displayed in path order");
  }

  // --- ranking decides inclusion under the cap: named project, then open file, then alphabetical ---
  {
    const files = {};
    for (let i = 0; i < 10; i++) files["proj" + i + ".sb3"] = makeSb3(tinyProject("S" + i, 1));
    const env = makeEnv({ files: files, openFiles: [{ path: "proj8.sb3" }], inputs: ["the bug is in proj9 i think", "bye"] });
    await env.run();
    const ctx = env.asks[0][0].content;
    check(ctx.indexOf("Project file: proj9.sb3") >= 0, "named project is included under the cap");
    check(ctx.indexOf("Project file: proj8.sb3") >= 0, "open project is included under the cap");
    check(/Not shown \(too long to include, or couldn't be read\): proj6\.sb3, proj7\.sb3\b/.test(ctx), "lowest-ranked projects are left out: " + ctx.slice(-120));
    check(ctx.indexOf("Project file: proj0.sb3") < ctx.indexOf("Project file: proj9.sb3"), "display order is by path, not rank");
  }

  // --- stems match whole words only, and only when 3+ characters ---
  {
    const o = makeEnv({}).test.orderProjectPaths;
    const r = o(["a.sb3", "bug1.sb3", "bug10.sb3", "zed.sb3"], "is there a bug10 here", []);
    check(r[0] === "bug10.sb3", "whole-word stem match ranks first (got " + r[0] + ")");
    check(r.indexOf("a.sb3") > 0 && r.indexOf("bug1.sb3") > r.indexOf("bug10.sb3"), "short stem and partial word do not rank first");
  }

  // --- reordering the projects (new message names another one) does NOT trigger a false note ---
  {
    const files = {};
    ["alpha", "bravo", "charlie", "delta", "echo"].forEach(function(n, i) { files[n + ".sb3"] = makeSb3(tinyProject("Sprite" + n, 1 + i)); });
    const env = makeEnv({ files: files, inputs: ["where is the bug", "I think it is in delta", { text: "or in echo", before: function() {} }, "bye"] });
    await env.run();
    check(lastUser(env.asks[1]) === "I think it is in delta", "no files-changed note when only the ranking changed");
    check(lastUser(env.asks[2]) === "or in echo", "still no note");
    const fps = env.log()[0].contextFingerprints;
    check(fps.length === 3 && fps.every(function(f) { return f.changed === false; }), "fingerprints unchanged by reordering: " + JSON.stringify(fps));
  }

  // --- a failed turn keeps the baseline (retry still gets the note); refresh failure keeps entries aligned ---
  {
    const changed = makeSb3(tinyProject("Rocket", 2));
    const env = makeEnv({
      files: { "project.sb3": fixtureBytes },
      inputs: ["why does my cat spin?", { text: "I fixed it", before: function(e) { e.files["project.sb3"] = changed; } }, "I fixed it, really", { text: "and now?", before: function(e) { e.breakReads = true; } }, "bye"],
      ask: function(n) { return n === 2 ? { result: "" } : { result: "ok " + n }; }
    });
    const gb = global.window.codioIDE.files.getContentBase64;
    global.window.codioIDE.files.getContentBase64 = async function(p) { if (env.breakReads) throw new Error("boom"); return gb(p); };
    await env.run();
    check(lastUser(env.asks[1]).indexOf(NOTE) === 0, "note on the changed turn");
    check(lastUser(env.asks[2]).indexOf(NOTE) === 0, "retry after an empty reply still gets the note");
    check(env.asks[3].length >= 2 && lastUser(env.asks[3]) === "and now?", "refresh failure: plain message, previous context kept");
    const log = env.log()[0];
    check(log.contextFingerprints.length === log.questions.length, "fingerprints aligned with questions (" + log.contextFingerprints.length + " vs " + log.questions.length + ")");
    const last = log.contextFingerprints[log.contextFingerprints.length - 1];
    check(last.refreshFailed === true && last.hash === null && last.changed === false, "refresh failure placeholder entry");
  }

  // --- a hung file read on a follow-up turn doesn't freeze the coach ---
  {
    const env = makeEnv({ files: { "project.sb3": fixtureBytes }, inputs: ["hello cat", { text: "again", before: function(e) { e.hang = true; } }, "bye"] });
    const gb = global.window.codioIDE.files.getContentBase64;
    global.window.codioIDE.files.getContentBase64 = function(p) { return env.hang ? new Promise(function() {}) : gb(p); };
    const timer = setTimeout(function() { console.error("FAIL: coach hung on a stalled file read"); process.exit(1); }, 30000);
    await env.run();
    clearTimeout(timer);
    check(env.asks.length === 2, "stalled read: coach still answered (kept the old context)");
  }

  // --- empty .sb3 shows as empty; non-string read goes on Not shown; non-string guide is tolerated ---
  {
    const env = makeEnv({ files: { "empty.sb3": Buffer.alloc(0), "project.sb3": fixtureBytes }, guide: { not: "a string" }, inputs: ["hi", "bye"] });
    await env.run();
    const ctx = env.asks[0][0].content;
    check(ctx.indexOf("Project file: empty.sb3\n(empty file)") >= 0, "empty file shown as (empty file)");
    check(ctx.indexOf("<project>") >= 0 && ctx.indexOf("No guide available.") >= 0, "non-string guide does not lose the project");
  }
  {
    const env = makeEnv({ files: { "project.sb3": fixtureBytes, "bad.sb3": fixtureBytes }, inputs: ["hi", "bye"] });
    const gb = global.window.codioIDE.files.getContentBase64;
    global.window.codioIDE.files.getContentBase64 = async function(p) { return p === "bad.sb3" ? 42 : gb(p); };
    await env.run();
    check(/Not shown[^\n]*bad\.sb3/.test(env.asks[0][0].content), "non-string read goes on the Not shown line");
  }

  // --- first context build fails: the coach still answers with a "couldn't read" block ---
  {
    const env = makeEnv({ files: { "project.sb3": fixtureBytes }, inputs: ["hi", "bye"] });
    global.window.codioIDE.coachBot.getContext = async function() { throw new Error("no ctx"); };
    global.window.codioIDE.files.getStructure = async function() { throw new Error("no tree"); };
    global.window.codioIDE.files.getContentBase64 = async function() { throw new Error("no read"); };
    await env.run();
    check(env.asks.length === 1 && env.asks[0][0].content.indexOf("<project>") >= 0, "unreadable files: still asks, with a project block");
    check(env.menu === 1, "menu shown at the end");
  }

  // --- more than 8 files, and over the character budget: "Not shown" line ---
  {
    const files = {};
    for (let i = 0; i < 10; i++) files["p" + i + ".sb3"] = makeSb3(tinyProject("S" + i, 1));
    const env = makeEnv({ files: files, inputs: ["help", "bye"] });
    await env.run();
    const ctx = env.asks[0][0].content;
    check((ctx.match(/Project file:/g) || []).length === 8, "at most 8 projects read");
    check(/Not shown \(too long to include, or couldn't be read\): p8\.sb3, p9\.sb3/.test(ctx), "'Not shown' lists projects past the cap");
  }
  {
    const files = {};
    ["a", "b", "c", "d"].forEach(function(n) { files[n + ".sb3"] = makeSb3(tinyProject("Big" + n, 1500)); });
    files["tiny.sb3"] = makeSb3(tinyProject("Little", 1));
    const env = makeEnv({ files: files, inputs: ["help", "bye"] });
    await env.run();
    const ctx = env.asks[0][0].content;
    check(ctx.indexOf("(cut off after 30000 characters)") >= 0, "huge project is marked as cut off");
    check(ctx.indexOf("Project file: a.sb3") >= 0 && ctx.indexOf("Project file: c.sb3") >= 0, "three max-size projects fit the budget");
    check(/Not shown \(too long to include, or couldn't be read\): d\.sb3/.test(ctx), "over-budget projects go on the 'Not shown' line");
    check(ctx.length < 130000, "total context stays bounded (" + ctx.length + ")");
  }

  // --- unchanged .sb3 is served from the cache (no re-parse); a changed one is re-rendered ---
  {
    const env = makeEnv({ files: { "project.sb3": fixtureBytes } });
    const g = env.test.getScratchProjectsText;
    let parses = 0;
    const realParse = JSON.parse;
    JSON.parse = function(t) { if (typeof t === "string" && t.indexOf('"targets"') >= 0) parses++; return realParse.apply(JSON, arguments); };
    let r1, r2, r3;
    try {
      env.b64Reads = 0;
      r1 = await g("", []);
      r2 = await g("", []);
      const parsesAfterTwo = parses;
      check(parsesAfterTwo === 1, "two reads of unchanged bytes parse project.json once (got " + parsesAfterTwo + ")");
      check(env.b64Reads === 2, "file is still read each time to detect edits (got " + env.b64Reads + ")");
      env.files["project.sb3"] = makeSb3(tinyProject("Rocket", 1));
      r3 = await g("", []);
      check(parses === 2, "changed bytes are parsed again (got " + parses + ")");
    } finally { JSON.parse = realParse; }
    check(r1.ok && r1.text === r2.text, "cached read gives identical text");
    check(r3.text.indexOf("Sprite: Rocket") >= 0 && r3.text !== r1.text, "changed .sb3 is re-rendered, not served from cache");
  }

  // ============================================================
  // Try-first help: the model labels the CURRENT message ([[ask]]/[[attempt]]/[[other]]);
  // the code decides the help from the labels in the log and says so in <recent_questions>
  // ============================================================
  const iso = function(daysAgo) { return new Date(Date.now() - daysAgo * 86400000).toISOString(); };
  const scripted = function(replies) { return function(n) { return { result: replies[n - 1] }; }; };

  // tag parsing
  {
    const rt = makeEnv({}).test.readModeTag;
    const eq = function(r, label, text, name) { check(r.label === label && r.text === text, "readModeTag " + name + ": " + JSON.stringify(r)); };
    eq(rt("[[ask]]\nHi"), "ask", "Hi", "[[ask]]");
    eq(rt("**[[other]]**\nHi"), "other", "Hi", "bold");
    eq(rt("`[[ask | try-first]]`\nHi"), "ask", "Hi", "backticks with extra words");
    eq(rt("## [[attempt]\nHi"), "attempt", "Hi", "heading, one closing bracket");
    eq(rt("Just text"), null, "Just text", "missing tag");
    eq(rt("[[ask]]\nFirst. [[try-first]] second."), "ask", "First. second.", "stray tag mid-text");
    eq(rt("Use [[1,2]] here"), null, "Use [[1,2]] here", "[[1,2]] untouched");
    eq(rt("[[ask]]"), "ask", "", "tag only");
  }

  // end to end: tag never reaches write(); history keeps the tag; tag-only reply = empty-reply path
  {
    const env = makeEnv({
      files: { "project.sb3": fixtureBytes },
      inputs: ["next please", "ok so what now", "hello", "bye"],
      ask: scripted(["[[ask]]\nWhat do you think the next step is?", "**[[other]]**\nGreat, that works.", "[[attempt]]\n  "])
    });
    await env.run();
    check(env.writes.indexOf("What do you think the next step is?") >= 0 && env.writes.indexOf("Great, that works.") >= 0, "tag stripped before write()");
    check(env.writes.every(function(w) { return w.indexOf("[[") < 0; }), "no tag ever reaches write()");
    check(env.asks[1][1].content === "[[ask]]\nWhat do you think the next step is?", "history entry starts with its tag: " + JSON.stringify(env.asks[1][1]));
    check(env.asks[2][3].content === "[[other]]\nGreat, that works.", "history keeps the cleaned label for a decorated tag");
    check(env.writes.some(function(w) { return w.indexOf("didn't get an answer") >= 0; }), "tag-only reply uses the empty-reply path");
    check(env.asks.length === 3 && env.asks[2].length === 5, "tag-only reply not in history");
    const log = env.log()[0];
    check(log.failedReplies === 1 && log.labels.length === 2, "tag-only reply: failedReplies counted, no label logged");
    check(env.prompts.every(function(p) { return p.indexOf("## Try-first help: label each message") >= 0; }), "try-first prompt always present");
  }
  // missing tag = other, logged as such
  {
    const env = makeEnv({ files: { "project.sb3": fixtureBytes }, inputs: ["one", "bye"], ask: scripted(["Just text, no tag."]) });
    await env.run();
    check(env.writes.indexOf("Just text, no tag.") >= 0, "missing tag: shown as-is");
    check(env.asks.length === 1 && env.log()[0].labels[0] === null && env.log()[0].modes[0] === "normal", "missing tag treated as other/normal");
  }
  // chain: ask, ask, ask, other, attempt, ask
  {
    const env = makeEnv({
      files: { "project.sb3": fixtureBytes },
      inputs: ["how do I do that", "like that?", "show me", "what does this block mean for the cat", "I added a wait block inside the loop", "and then", "bye"],
      ask: scripted(["[[ask]]\nA", "[[ask]]\nB", "[[ask]]\nC", "[[other]]\nD", "[[attempt]]\nE", "[[ask]]\nF"])
    });
    await env.run();
    const log = env.log()[0];
    check(JSON.stringify(log.labels) === JSON.stringify(["ask", "ask", "ask", "other", "attempt", "ask"]), "labels logged: " + JSON.stringify(log.labels));
    check(JSON.stringify(log.modes) === JSON.stringify(["normal", "normal", "try-first", "try-first", "normal", "normal"]), "modes logged: " + JSON.stringify(log.modes));
    check(log.strict === true && log.strictReason === "model" && log.strictReleased === true, "strict fields: " + JSON.stringify([log.strict, log.strictReason, log.strictReleased]));
    const c2 = env.asks[1][0].content;
    check(c2.indexOf("1. [ask] how do I do that") >= 0 && c2.indexOf("2. [current] like that?") >= 0, "turn 2 lists turn 1 with its label and the current question");
    check(c2.indexOf("- [[ask]]: NORMAL help") >= 0 && c2.indexOf("- [[attempt]]: NORMAL help") >= 0 && c2.indexOf("- [[other]]: NORMAL help") >= 0, "turn 2 per-label help lines");
    const c3 = env.asks[2][0].content;
    check(c3.indexOf("- [[ask]]: TRY-FIRST help") >= 0 && c3.indexOf("- [[other]]: NORMAL help") >= 0, "turn 3: a third ask gets try-first");
    check(env.asks[3][0].content.indexOf("- [[other]]: TRY-FIRST help") >= 0, "turn 4: other stays try-first while it is on");
    check(env.asks[5][0].content.indexOf("- [[ask]]: NORMAL help") >= 0, "turn 6: the count restarts after an attempt");
  }
  // earlier sessions count when recent and same coach; old and other-coach ones don't
  {
    const mk = function(coach, daysAgo, qs, labels) { return { coach: coach, started: iso(daysAgo), exchanges: qs.length, questions: qs, labels: labels }; };
    const twoAsks = [mk("scratch", 1, ["what next", "and then"], ["ask", "ask"])];
    const env1 = makeEnv({ files: { "project.sb3": fixtureBytes }, existingLog: JSON.stringify(twoAsks), inputs: ["show me", "bye"], ask: scripted(["[[ask]]\nok"]) });
    await env1.run();
    check(env1.asks[0][0].content.indexOf("- [[ask]]: TRY-FIRST help") >= 0, "recent same-coach asks count toward try-first");
    const noCount = [mk("scratch", 30, ["what next", "and then"], ["ask", "ask"]), mk("python", 1, ["what next", "and then"], ["ask", "ask"])];
    const env2 = makeEnv({ files: { "project.sb3": fixtureBytes }, existingLog: JSON.stringify(noCount), inputs: ["show me", "bye"], ask: scripted(["[[ask]]\nok"]) });
    await env2.run();
    const c = env2.asks[0][0].content;
    check(c.indexOf("- [[ask]]: NORMAL help") >= 0 && c.indexOf("what next") < 0, "30-day-old and other-coach sessions don't count");
    check(c.indexOf("<recent_questions>") > c.indexOf("</guide>") && c.indexOf("<recent_questions>") > c.indexOf("</project>"), "recent_questions sits after </guide>, outside <project>");
  }
  // backstop: the 10th question in a session
  {
    const inputs = []; for (let i = 1; i <= 11; i++) inputs.push("what does the number " + i + " change in my cat sprite script");
    inputs.push("bye");
    const env = makeEnv({ files: { "project.sb3": fixtureBytes }, inputs: inputs, ask: function() { return { result: "[[other]]\nSure." }; } });
    await env.run();
    const big = function(c) { return (c.match(/TRY-FIRST help/g) || []).length; };
    check(big(env.asks[8][0].content) === 0, "backstop: not before the 10th question");
    check(big(env.asks[9][0].content) === 3, "backstop: the 10th question lists TRY-FIRST for all three labels");
    const log = env.log()[0];
    check(log.modes[9] === "try-first" && log.modes[8] === "normal", "backstop: mode logged as try-first from the 10th question");
    check(log.strict === true && log.strictReason === "backstop", "backstop reason logged: " + log.strictReason);
  }
  // recent_questions never changes the files fingerprint or fires the files-changed note
  {
    const env = makeEnv({ files: { "project.sb3": fixtureBytes }, inputs: ["why does my cat spin?", "and what about the score?", "bye"], ask: function() { return { result: "[[other]]\nok" }; } });
    await env.run();
    check(lastUser(env.asks[1]) === "and what about the score?", "a new question alone never fires the files-changed note");
    const fps = env.log()[0].contextFingerprints;
    check(fps.length === 2 && fps[0].hash === fps[1].hash && fps[1].changed === false, "files fingerprint unaffected by recent_questions");
  }
  // fallback context also carries recent_questions
  {
    const env = makeEnv({ files: { "project.sb3": fixtureBytes }, inputs: ["hi", "bye"] });
    global.window.codioIDE.coachBot.getContext = async function() { throw new Error("no ctx"); };
    global.window.codioIDE.files.getStructure = async function() { throw new Error("no tree"); };
    global.window.codioIDE.files.getContentBase64 = async function() { throw new Error("no read"); };
    await env.run();
    check(env.asks[0][0].content.indexOf("<recent_questions>") >= 0, "context with unreadable files still has recent_questions");
  }
  // unreadable log: still works, never writes
  {
    const env = makeEnv({ files: { "project.sb3": fixtureBytes }, existingLog: "{not json", inputs: ["hello cat", "bye"] });
    await env.run();
    check(env.asks.length === 1 && env.asks[0][0].content.indexOf("<recent_questions>") >= 0, "unreadable log: recent_questions built from this session");
    check(env.logFiles[".coach-log.json"] === "{not json", "unreadable log never written");
  }
  // the round-3 phrase list is gone
  check(src.indexOf("isNextStepAsk") < 0 && src.indexOf("updateStrict") < 0 && src.indexOf("STRICT_PROMPT") < 0 && src.indexOf("strictBackstopSuffix") < 0 && src.indexOf("STRICT_BACKSTOP_PROMPT") < 0, "phrase-list and round-4 backstop code removed");

  // S2: both reads fail and getStructure returns an empty map -> never treated as "no log yet"
  {
    const env = makeEnv({ files: { "project.sb3": fixtureBytes }, inputs: ["hello cat", "bye"] });
    global.window.codioIDE.files.getStructure = async function() { return {}; };
    await env.run();
    check(env.log() === null, "empty structure map + failed reads: log is not written");
  }

  // S4: a failed getContext() on a refresh keeps messages[0] and sends no files-changed note
  {
    const env = makeEnv({
      files: { "project.sb3": fixtureBytes },
      inputs: ["why does my cat spin?", { text: "still stuck on it", before: function() { global.window.codioIDE.coachBot.getContext = async function() { throw new Error("ctx down"); }; } }, "bye"]
    });
    await env.run();
    check(env.asks.length === 2, "refresh getContext failure: still answers");
    check(env.asks[1][0].content === env.asks[0][0].content, "refresh getContext failure: messages[0] unchanged");
    check(lastUser(env.asks[1]) === "still stuck on it", "refresh getContext failure: no files-changed note");
    const fps = env.log()[0].contextFingerprints;
    check(fps.length === 2 && fps[1].refreshFailed === true, "refresh getContext failure: refreshFailed entry logged");
  }

  // --- prompt content checks ---
  {
    const sp = makeEnv({}).test.systemPrompt;
    check(sp.indexOf("Their project.sb3 opens") < 0, "hard-coded project.sb3 line removed");
    check(sp.indexOf("Never assume the file is called project.sb3") >= 0, "prompt tells model not to assume project.sb3");
    check(sp.indexOf("Great question!") < 0 && sp.indexOf("I can't build that for you") < 0, "stock praise and canned refusal removed");
    check(sp.indexOf("—") < 0, "no em-dashes in the prompt");
    check(sp.indexOf("You always see their latest work") >= 0 && sp.indexOf("About this chat and about you") >= 0, "shared prompt blocks present");
    check(sp.indexOf("Find the Bug") >= 0, "debug-assignment ladder present");
  }

  if (failures) {
    console.error("\n" + failures + " test failure(s)");
    process.exit(1);
  }
  console.log("All tests passed.");
})();
