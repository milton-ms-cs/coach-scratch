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

  if (failures) {
    console.error("\n" + failures + " test failure(s)");
    process.exit(1);
  }
  console.log("All tests passed.");
})();
