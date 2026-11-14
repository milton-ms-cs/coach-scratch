#!/usr/bin/env node
// Prints the coach-starter comment line for each .sb3 given, using the coach's own
// renderer (index.js), so the curriculum pin tool and the coach can never disagree.
//
//   node tools/starter-fingerprint.js A.sb3 [more.sb3 ...]        one comment per line
//   node tools/starter-fingerprint.js --json A.sb3 [more.sb3 ...]  [{name,version,len,hash,comment}]
//
// Exit 1 (message on stderr) if any file is unreadable; the others are still printed.
// No dependencies; Node 18+ (the coach unpacks with the native DecompressionStream).

const fs = require("fs");
const path = require("path");

global.window = { codioIDE: { coachBot: { register: function() {}, MESSAGE_ROLES: { ASSISTANT: "assistant" } } } };
// Indirect eval so index.js runs in global scope, exactly as in test/run-test.js.
(0, eval)(fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8"));
const t = global.window.__scratchCoachTest;

(async function() {
  const args = process.argv.slice(2);
  const json = args.indexOf("--json") >= 0;
  const files = args.filter(function(a) { return a !== "--json"; });
  if (!files.length) {
    console.error("usage: node starter-fingerprint.js [--json] file.sb3 [more.sb3 ...]");
    process.exit(2);
  }
  const out = [];
  let failed = false;
  for (const f of files) {
    try {
      const bytes = new Uint8Array(fs.readFileSync(f));
      const text = t.renderProject(JSON.parse(await t.extractProjectJson(bytes)));
      const fp = t.starterFingerprint(text);
      const name = path.basename(f);
      if (name.indexOf("--") >= 0) throw new Error("file name contains '--'");
      const comment = "<!-- coach-starter: v" + t.STARTER_FP_VERSION + " sb3 " + fp.len + "-" + fp.hash + " " + name + " -->";
      out.push({ name: name, version: t.STARTER_FP_VERSION, len: fp.len, hash: fp.hash, comment: comment });
    } catch (e) {
      failed = true;
      console.error("starter-fingerprint: " + f + ": " + (e && e.message ? e.message : e));
    }
  }
  if (json) console.log(JSON.stringify(out));
  else out.forEach(function(o) { console.log(o.comment); });
  if (failed) process.exit(1);
})();
