// Shared try-first / teacher-handoff tests. This file is byte-identical in every
// teaching coach repo: it reads COACH_ID from ../index.js and has nothing coach-specific.
// If you change it, change it in all seven coaches at once.
// Run: node test/try-first.test.js   (Node 18+, no dependencies)
// All content below is invented.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const src = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");
const COACH_ID = (src.match(/const COACH_ID = "([^"]+)"/) || [])[1];
const LOG = ".coach-log.json";

let failures = 0;
function check(label, cond) {
  if (cond) console.log("  ok  " + label);
  else { console.error("  FAIL " + label); failures++; }
}
function section(n, title) { console.log("\n" + n + ". " + title); }

// ---- a tiny Scratch project, rebuilt per revision so the files fingerprint can change ----
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function makeSb3(rev) {
  const target = (isStage, name, blocks) => ({
    isStage, name, variables: {}, lists: {}, broadcasts: {}, blocks, comments: {},
    currentCostume: 0, costumes: [{ name: isStage ? "backdrop1" : "costume1" }], sounds: []
  });
  const json = Buffer.from(JSON.stringify({
    targets: [
      target(true, "Stage", {}),
      target(false, "Sprite" + rev, { b1: { opcode: "event_whenflagclicked", next: null, parent: null, inputs: {}, fields: {}, topLevel: true, x: 0, y: 0 } })
    ],
    meta: { semver: "3.0.0" }
  }));
  const data = zlib.deflateRawSync(json);
  const name = Buffer.from("project.json");
  const crc = crc32(json);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6); local.writeUInt16LE(8, 8);
  local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(json.length, 22); local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(8, 10);
  central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(json.length, 24); central.writeUInt16LE(name.length, 28);
  const cdOffset = 30 + name.length + data.length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(46 + name.length, 12); eocd.writeUInt32LE(cdOffset, 16);
  return Buffer.concat([local, name, data, central, name, eocd]).toString("base64");
}

// ---- one coach instance per conversation (coaches hold module-level state) ----
// turns: [{ q, label, edit, reply, empty, throws, ctxFail }]
function boot(turns, opts) {
  opts = opts || {};
  const state = { rev: 0, ctxFail: false };
  const cap = { asks: [], askOpts: [], writes: [], inputs: 0, fs: {}, turn: -1, snapshot: null };
  if (opts.seed !== undefined) cap.fs[LOG] = typeof opts.seed === "string" ? opts.seed : JSON.stringify(opts.seed);
  else cap.fs[LOG] = "[]";
  const seeded = cap.fs[LOG];
  const py = () => 'print("hello rev=' + state.rev + '")\n';
  const html = () => "<h1>Hi rev=" + state.rev + "</h1>\n";
  const css = () => "h1 { color: red; } /* rev=" + state.rev + " */\n";
  const ctxFiles = () => [
    { path: "main.py", content: py() },
    { path: "index.html", content: html() },
    { path: "style.css", content: css() }
  ];
  const codioIDE = {
    coachBot: {
      register(id, label, cb) { cap.cb = cb; },
      async getContext() {
        if (state.ctxFail) throw new Error("context unavailable");
        return { files: ctxFiles(), guidesPage: { content: "Guide: make a small project." }, assignmentData: { name: "Test Assignment" } };
      },
      async input() {
        const i = cap.inputs++;
        if (i < turns.length) {
          const t = turns[i];
          if (t.edit) state.rev++;
          state.ctxFail = !!t.ctxFail;
          return t.q;
        }
        if (i === turns.length && opts.onClose) await opts.onClose(cap);
        throw new Error("closed");
      },
      async ask(payload, options) {
        cap.askOpts.push(JSON.stringify(options));
        cap.asks.push(JSON.parse(JSON.stringify(payload)));
        cap.turn = cap.asks.length - 1;
        const t = turns[cap.turn] || {};
        if (opts.askDelay) await new Promise(r => setTimeout(r, opts.askDelay)); // like a real ask(): takes time
        if (t.throws) throw new Error("ask failed");
        if (t.empty) return { result: "" };
        return { result: t.reply !== undefined ? t.reply : "[[" + (t.label || "other") + "]]\nReply " + (cap.turn + 1) + "." };
      },
      write(text) { cap.writes.push({ turn: cap.turn, text: String(text) }); },
      showMenu() {}, showThinkingAnimation() {}, hideThinkingAnimation() {},
      MESSAGE_ROLES: { ASSISTANT: "assistant", USER: "user" }
    },
    files: {
      async getStructure() {
        const tree = { "main.py": 1, "index.html": 1, "style.css": 1, "project.sb3": 1 };
        if (cap.fs[LOG] !== undefined) tree[LOG] = 1;
        return tree;
      },
      async getContent(p) {
        if (Object.prototype.hasOwnProperty.call(cap.fs, p)) return cap.fs[p];
        if (p === "main.py") return py();
        if (p === "index.html") return html();
        if (p === "style.css") return css();
        throw new Error("no such file");
      },
      async getContentBase64(p) {
        if (/\.sb3$/i.test(p)) return makeSb3(state.rev);
        throw new Error("no such file");
      },
      async add(p, content) { if (opts.hangWrites) return new Promise(() => {}); cap.fs[p] = content; },
      async deleteFiles(paths) { if (opts.hangWrites) return new Promise(() => {}); for (const p of paths) delete cap.fs[p]; }
    }
  };
  const window = { codioIDE };
  new Function("window", src)(window);
  return {
    cap, window, seeded,
    T: window.__coachTest,
    async run() { await cap.cb(); return cap; }
  };
}

// Helpers over a finished run
function logOf(cap) { try { return JSON.parse(cap.fs[LOG]); } catch (e) { return null; } }
function lastEntry(cap) { const l = logOf(cap); return l && l[l.length - 1]; }
function replyWrite(cap, i) { const w = cap.writes.find(x => x.turn === i); return w ? w.text : null; }
function block(cap, i) {
  const c = cap.asks[i].messages[0].content;
  const m = c.match(/<recent_questions>[\s\S]*?<\/recent_questions>/);
  return m ? m[0] : "";
}
function turnsOf(n, f) { const a = []; for (let i = 0; i < n; i++) a.push(Object.assign({ q: "question " + (i + 1) }, f(i))); return a; }
const handoffWrites = (cap, T) => cap.writes.filter(w => w.text.indexOf(T.HANDOFF_MESSAGE) !== -1);
const daysAgo = d => new Date(Date.now() - d * 86400000).toISOString();

(async () => {
  console.log("try-first tests for coach id: " + COACH_ID);
  if (!COACH_ID) { console.error("could not read COACH_ID from index.js"); process.exit(1); }
  const probe = boot([], {});
  const T0 = probe.T;
  if (!T0) { console.error("window.__coachTest is missing in index.js"); process.exit(1); }
  const N = T0.HANDOFF_AFTER_TRY_FIRST;
  const R = T0.HANDOFF_REPEAT_AFTER;
  const HM = T0.HANDOFF_MESSAGE;
  const STRICT_AT = 10; // STRICT_SESSION_QUESTIONS backstop

  // all "other" labels: normal help until the backstop at question 10, then try-first
  const longTurns = n => turnsOf(n, () => ({ label: "other" }));

  // ---------------------------------------------------------------- 1
  section(1, "N try-first replies, then the handoff");
  const h1 = boot(longTurns(STRICT_AT + N + 2));
  const c1 = await h1.run();
  const hq = STRICT_AT + N - 1; // 0-based turn index of question 10+N
  const w1 = replyWrite(c1, hq);
  check("write for question " + (STRICT_AT + N) + " ends with HANDOFF_MESSAGE", w1 !== null && w1.endsWith(HM));
  check("it starts with the model's own text", w1.startsWith("Reply " + (hq + 1) + "."));
  const e1 = lastEntry(c1);
  check("modes has exactly one handoff, at that turn", e1.modes.filter(m => m === "handoff").length === 1 && e1.modes[hq] === "handoff");
  check("the " + N + " turns before it were try-first", e1.modes.slice(hq - N, hq).every(m => m === "try-first"));
  check("log has handoff true, handoffAt and reason session", e1.handoff === true && e1.handoffAt === hq && e1.handoffReason === "session");
  check("strict stays true and is never released", e1.strict === true && e1.strictReleased === false);
  check("ask() options are exactly { stream: false, preventMenu: true }", c1.askOpts.every(o => o === JSON.stringify({ stream: false, preventMenu: true })));

  // ---------------------------------------------------------------- 2
  section(2, "once only, then after-handoff");
  check("exactly one write contains HANDOFF_MESSAGE", handoffWrites(c1, T0).length === 1);
  check("later modes are after-handoff", e1.modes.slice(hq + 1).length > 0 && e1.modes.slice(hq + 1).every(m => m === "after-handoff"));
  check("the next block says the student was already told", /already told this student/.test(block(c1, hq + 1)));
  check("the handoff turn's own block does not say that yet", !/already told this student/.test(block(c1, hq)));

  // ---------------------------------------------------------------- 3
  section(3, "survives trimming");
  const h3 = boot(longTurns(STRICT_AT + N + 14));
  const c3 = await h3.run();
  const lastAsk = c3.asks.length - 1;
  const msgs3 = c3.asks[lastAsk].messages;
  check("the handoff reply has been trimmed out of messages", !msgs3.some(m => String(m.content).indexOf(HM) !== -1));
  check("still exactly one handoff write", handoffWrites(c3, T0).length === 1);
  check("the block still says the student was told", /already told this student/.test(block(c3, lastAsk)));
  check("every later mode is after-handoff", lastEntry(c3).modes.slice(hq + 1).every(m => m === "after-handoff"));

  // ---------------------------------------------------------------- 4
  section(4, "handoff-turn block lists the HANDOFF instruction");
  const b4 = block(c1, hq);
  check("all three labels get the HANDOFF turn instruction", (b4.match(/- \[\[(ask|attempt|other)\]\]: HANDOFF turn:/g) || []).length === 3);
  check("it tells the model not to mention the teacher and not to check", /do not mention their teacher/.test(b4) && /Do not check their change/.test(b4));

  // ---------------------------------------------------------------- 5
  section(5, "an attempt stays normal; the handoff waits for the next try-first turn");
  // With N this high the backstop is already on by the time N try-first replies exist, so
  // exercise modeRule directly with a synthetic session that has N try-first replies.
  const syn5 = { coach: COACH_ID, started: new Date().toISOString(), exchanges: 5,
    questions: ["a", "b", "c", "d", "e"], labels: ["ask", "ask", "ask", "ask"],
    modes: Array.from({ length: N }, () => "try-first"), contextFingerprints: [] };
  const r5 = h1.T.modeRule([syn5], syn5);
  check("with N try-first replies so far, asks get the handoff", r5.ask === "handoff" && r5.other === "handoff" && r5.handoffReason === "session");
  check("an attempt in that state is still normal", r5.attempt === "normal");
  const syn5b = Object.assign({}, syn5, { modes: Array.from({ length: N - 1 }, () => "try-first") });
  const r5b = h1.T.modeRule([syn5b], syn5b);
  check("one reply short of N: still try-first, no handoff", r5b.ask === "try-first" && r5b.handoffReason === null);
  const c5 = await boot(turnsOf(8, i => ({ label: "ask" }))).run();
  check("the model's labels still switch try-first on at question 3", lastEntry(c5).modes[1] === "normal" && lastEntry(c5).modes[2] === "try-first");
  check("no handoff text before N try-first replies", handoffWrites(c5, T0).length === 0);

  // ---------------------------------------------------------------- 6
  section(6, "empty reply on the handoff turn");
  const t6 = longTurns(STRICT_AT + N + 3);
  t6[hq] = Object.assign({}, t6[hq], { empty: true });
  const c6 = await boot(t6).run();
  const e6 = lastEntry(c6);
  check("the failed turn shows the retry message and no handoff", /didn't get an answer/.test(replyWrite(c6, hq)) && replyWrite(c6, hq).indexOf(HM) === -1);
  check("nothing recorded for it: no handoff yet in the next block", /HANDOFF turn:/.test(block(c6, hq + 1)) && !/already told this student/.test(block(c6, hq + 1)));
  check("the handoff is delivered on the next turn", replyWrite(c6, hq + 1).endsWith(HM) && e6.modes[hq + 1] === "handoff");
  check("handoffAt points at that later turn; failedReplies counted", e6.handoffAt === hq + 1 && e6.failedReplies === 1);
  check("only one handoff write overall", handoffWrites(c6, T0).length === 1);

  // ---------------------------------------------------------------- 7
  section(7, "cross-session repeat handoff");
  const prior = (started, coach, handoff) => [{
    coach: coach, started: started, updated: started, ended: started, coachVersion: "0.0.0", exchanges: 1,
    questions: ["an earlier invented question"], labels: ["other"], modes: ["normal"], contextFingerprints: [],
    failedReplies: 0, strict: handoff, strictReason: handoff ? "backstop" : null, strictReleased: false,
    handoff: handoff, handoffAt: handoff ? 0 : null, handoffReason: handoff ? "session" : null
  }];
  const t7 = turnsOf(R + 6, () => ({ label: "ask" })); // try-first from question 3
  const c7 = await boot(t7, { seed: prior(daysAgo(1), COACH_ID, true) }).run();
  const e7 = lastEntry(c7);
  const at7 = 2 + R; // 0-based: try-first at 2..(1+R), handoff next
  check("handoff arrives after " + R + " try-first replies", e7.modes[at7] === "handoff" && e7.modes.slice(2, at7).every(m => m === "try-first"));
  check("reason is repeat", e7.handoffReason === "repeat" && replyWrite(c7, at7).endsWith(HM));
  const t7c = t7.slice(0, at7 + 2); // short enough that the normal threshold is not reached
  const c7b = await boot(t7c, { seed: prior(daysAgo(15), COACH_ID, true) }).run();
  check("an earlier handoff 15 days back does not lower the threshold", handoffWrites(c7b, T0).length === 0 && lastEntry(c7b).modes[at7] === "try-first");
  const c7c = await boot(t7c, { seed: prior(daysAgo(1), "some-other-coach", true) }).run();
  check("another coach's earlier handoff does not count", handoffWrites(c7c, T0).length === 0 && lastEntry(c7c).modes[at7] === "try-first");

  // ---------------------------------------------------------------- 8
  section(8, "history copy and tag hygiene");
  const hist = c1.asks[hq + 1].messages.find(m => m.role === "assistant" && String(m.content).indexOf(HM) !== -1);
  check("history copy of the handoff reply starts with its tag and includes the message", !!hist && /^\[\[(ask|attempt|other)\]\]\n/.test(hist.content) && hist.content.endsWith(HM));
  check("no write ever contains [[", [c1, c3, c6, c7].every(c => c.writes.every(w => w.text.indexOf("[[") === -1)));
  const tg = h1.T.readModeTag("**[[ask]]** What did you try?");
  check("readModeTag strips and labels", tg.label === "ask" && tg.text === "What did you try?");
  check("historyReply(tagged, shown) uses the shown text", h1.T.historyReply({ label: "other", text: "a" }, "b") === "[[other]]\nb" && h1.T.historyReply({ label: null, text: "a" }) === "[[other]]\na");

  // ---------------------------------------------------------------- 9
  section(9, "check streak");
  const mk9 = f => turnsOf(7, f);
  // turns 2..4 are asks right after an edit
  const c9 = await boot(mk9(i => ({ label: "ask", edit: i >= 1 && i <= 4 }))).run();
  check("the files-changed note reaches the model after an edit", /^\(Note: the student's files have changed/.test(c9.asks[1].messages[c9.asks[1].messages.length - 1].content));
  check("two edit-then-ask turns: no streak line yet", !/check an edit/.test(block(c9, 3)));
  check("three in a row: the streak line appears with the number 3", /check an edit 3 times in a row/.test(block(c9, 4)));
  const c9a = await boot(mk9(i => ({ label: i === 4 ? "attempt" : "ask", edit: i >= 1 && i <= 4 }))).run();
  check("an attempt resets the streak", /check an edit 3 times in a row/.test(block(c9a, 4)) && !/check an edit/.test(block(c9a, 5)));
  const c9b = await boot(mk9(i => ({ label: "ask", edit: i >= 1 && i <= 3 }))).run();
  check("an ask with no file change resets the streak", /check an edit 3 times in a row/.test(block(c9b, 4)) && !/check an edit/.test(block(c9b, 5)));

  // ---------------------------------------------------------------- 10
  section(10, "last turn is saved without a bye (P1)");
  // ask() takes real time (30 ms), as in Codio. With an instant mock the earlier saves are still
  // draining and mask a missing post-reply queueSave.
  let snap = null;
  const t10 = turnsOf(3, () => ({ label: "ask" }));
  await boot(t10, { askDelay: 30, onClose: async cap => { await new Promise(r => setTimeout(r, 80)); snap = JSON.parse(cap.fs[LOG]); } }).run();
  const s10 = snap && snap[snap.length - 1];
  check("before any bye, the saved log has a label and mode for every answered question",
    !!s10 && s10.questions.length === 3 && s10.labels.length === 3 && s10.modes.length === 3 && s10.labels.every(l => !!l) && s10.modes.every(m => !!m));
  check("and a fingerprint for each", !!s10 && s10.contextFingerprints.length === 3);
  // one turn: the first-turn call site
  let snap1 = null;
  await boot(turnsOf(1, () => ({ label: "ask" })), { askDelay: 30, onClose: async cap => { await new Promise(r => setTimeout(r, 80)); snap1 = JSON.parse(cap.fs[LOG]); } }).run();
  const s10b = snap1 && snap1[snap1.length - 1];
  check("one-turn session: the first reply's label and mode are saved before any bye",
    !!s10b && s10b.questions.length === 1 && s10b.labels.length === 1 && s10b.modes.length === 1 && !!s10b.labels[0] && !!s10b.modes[0]);
  // a write that never finishes must not block the turn loop
  const h10c = boot(turnsOf(3, () => ({ label: "other" })), { askDelay: 5, hangWrites: true });
  const done10c = h10c.run().then(() => "done", () => "done");
  await Promise.race([done10c, new Promise(r => setTimeout(r, 1500))]);
  check("hanging log writes: turn 2 and turn 3 still get answers", h10c.cap.asks.length === 3 && replyWrite(h10c.cap, 1) === "Reply 2." && replyWrite(h10c.cap, 2) === "Reply 3.");

  // ---------------------------------------------------------------- 11
  section(11, "context refresh failure keeps files but refreshes the block (P4)");
  const t11 = turnsOf(4, i => ({ label: "other", edit: i >= 1, ctxFail: i === 2 }));
  const c11 = await boot(t11).run();
  const strip = c => c.replace(/<recent_questions>[\s\S]*?<\/recent_questions>/, "<rq/>");
  const m2 = c11.asks[1].messages[0].content, m3 = c11.asks[2].messages[0].content;
  check("turn 3's first message still has turn 2's files and guide", strip(m2) === strip(m3));
  check("but its recent_questions block is current", block(c11, 2) !== block(c11, 1) && /In this session: 3\./.test(block(c11, 2)));
  check("the [current] line is the new question", /\[current\] question 3\b/.test(block(c11, 2)) && !/\[current\] question 2\b/.test(block(c11, 2)));
  check("the coach still answered turn 3 and the next turn", replyWrite(c11, 2) === "Reply 3." && replyWrite(c11, 3) === "Reply 4.");
  check("the failed refresh is logged", lastEntry(c11).contextFingerprints.some(f => f && f.refreshFailed === true));
  const RB = h1.T.refreshRecentBlock;
  check("refreshRecentBlock leaves text without a block unchanged", RB("no block here", [], { coach: COACH_ID, questions: [], exchanges: 0 }) === "no block here");

  // ---------------------------------------------------------------- 12
  section(12, "the 50-question log cap (P5)");
  const c12 = await boot(longTurns(52)).run();
  const b12 = block(c12, 51);
  check("question 52 is not logged (cap is 50)", lastEntry(c12).questions.length === 50 && lastEntry(c12).exchanges === 52);
  check("the block has no [current] line pointing at an old question", b12.indexOf("[current]") === -1);
  check("its last listed question is the real 51st-answered one, not dropped", /\n\d+\. \[[a-z?]+\] question 50\n/.test(b12 + "\n"));
  const T12 = c12.asks.length; // sanity: all 52 asked
  check("all 52 questions got an answer", T12 === 52);
  const syn = { coach: COACH_ID, started: new Date().toISOString(), exchanges: 52, questions: Array.from({ length: 50 }, (_, i) => "q" + (i + 1)), labels: Array.from({ length: 50 }, () => "ask"), modes: [], contextFingerprints: [] };
  const rule12 = h1.T.modeRule([syn], syn);
  check("modeRule counts the right prior items when the current one is not logged", rule12.recent.hasCurrent === false && rule12.recent.items.length === 50);

  // ---------------------------------------------------------------- 13
  section(13, "logging off (corrupt log)");
  const h13 = boot(longTurns(STRICT_AT + N + 3), { seed: "{ this is not json" });
  const c13 = await h13.run();
  check("handoff still fires once", handoffWrites(c13, T0).length === 1 && replyWrite(c13, hq).endsWith(HM));
  check("the corrupt log file is untouched", c13.fs[LOG] === h13.seeded);

  // ---------------------------------------------------------------- 14
  section(14, "old behavior kept");
  const t14 = turnsOf(5, i => ({ label: ["ask", "ask", "ask", "attempt", "ask"][i] }));
  const e14 = lastEntry(await boot(t14).run());
  check("ask, ask, ask gives try-first on the third", e14.modes[0] === "normal" && e14.modes[1] === "normal" && e14.modes[2] === "try-first");
  check("an attempt releases it, and the next ask is normal", e14.modes[3] === "normal" && e14.modes[4] === "normal" && e14.strictReleased === true);
  const e14b = lastEntry(await boot(longTurns(STRICT_AT)).run());
  check("backstop: question 10 is try-first whatever the label", e14b.modes.slice(0, STRICT_AT - 1).every(m => m === "normal") && e14b.modes[STRICT_AT - 1] === "try-first" && e14b.strictReason === "backstop");

  // ---------------------------------------------------------------- 15
  section(15, "prompt wording and message hygiene");
  const sp = c1.asks[0].systemPrompt;
  check("prompt has the tightened attempt wording", /THIS message says in their own words something new they tried or think/.test(sp) && /The note that their files changed is not enough on its own/.test(sp));
  check("prompt treats check-ins as asks", /A check-in right after an edit is an ask too/.test(sp));
  check("prompt has the after-handoff and handoff bullets", /After-handoff help:/.test(sp) && /HANDOFF turn: follow the instruction/.test(sp));
  check("prompt has the where-not-what rule", /Say where, not what\./.test(sp));
  check("prompt still says never mention a mode, limit or count, and never refuse", /Never mention a mode, a limit or how many questions they've asked, and never refuse/.test(sp));
  check("HANDOFF_MESSAGE has no digits and no mode or limit talk", !/\d/.test(HM) && !/\bmode\b|\blimit/i.test(HM));
  check("HANDOFF_MESSAGE points to the teacher", /teacher/.test(HM));

  console.log(failures ? "\n" + failures + " FAILED" : "\nall passed");
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
