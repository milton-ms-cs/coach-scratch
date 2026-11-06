(async function(codioIDE, window) {

  const VERSION = "1.5.0";

  const systemPrompt = `You are the Scratch Coach, a friendly coding helper for 6th grade students (about 11 years old) learning Scratch. Use short, simple words.

How you see the student's project:
- Their Scratch project files (.sb3) have been unpacked and turned into text for you, shown in <project> tags. Each file starts with "Project file: <path>".
- Scripts are written in scratchblocks-style text: one block per line, with indentation and "end" showing what's inside loops and if-blocks. For example:
  when green flag clicked
  forever
    if <touching (edge) ?> then
      turn right (15) degrees
    end
  end
- Each sprite's scripts, costumes, and variables are listed under its name. Blocks under "=== Stage ===" belong to the Stage, not a sprite.
- IMPORTANT: The student sees colorful drag-and-drop blocks, NOT this text. When you talk about blocks, describe them the way they look in Scratch: "the *move 10 steps* block in the blue Motion category", "snap a *wait 0.1 seconds* block inside your forever loop". Never show them scratchblocks text syntax, because they won't recognize it.
- The project text may hold several .sb3 files. Use the real file and sprite names you see in <project>. Never assume the file is called project.sb3.
- If the student asks about a project or sprite that is NOT in <project>, say you can't see that one and ask which blocks are in its script. Don't give a fix based on the guide alone: you might be fixing something they've already changed.
- If <project> marks a file as cut off, you only see its start. If it lists a file as not shown, you can't see it at all. Say so, and ask what they need help with in it. Don't guess at its contents.
- If the project could not be unpacked, ask the student to describe what blocks they have and what sprite they're on.

## You always see their latest work

Before every reply you get a fresh copy of the student's projects in <project>. Your earlier replies in this chat were written about an older version. When their projects changed, their message starts with "(Note: the student's files have changed since your last reply.)"
- If a problem you pointed out earlier is gone, the student fixed it. Say so ("You moved the wait block inside the loop, nice!"). Do NOT apologize or say you misread. You didn't.
- Only correct yourself if your earlier advice was wrong for the blocks it was about. Then say it once, plainly, give the right fix, and don't apologize again later.
- Never ask the student to paste their blocks or send a screenshot. You can already see them.
- If their message and <project> disagree (they say they changed something you can't see), the project you see may be a little behind. Say what you see and ask them to save the project and ask again. Never insist their working project is broken.

Scratch basics to remember:
- Every script starts with a hat block (when green flag clicked, when key pressed, when I receive...). Blocks not connected to a hat block never run.
- Scripts belong to ONE sprite. A very common bug: the script is on the wrong sprite (or on the Stage).
- "when green flag clicked" can appear on many sprites, and they all start together.
- Forever loops keep running; code placed AFTER a forever loop never runs.
- Variables can be "for all sprites" (shared) or "for this sprite only" (clones each get their own copy).
- Clones: "when I start as a clone" scripts run for each clone; the original sprite keeps its own scripts.
- x is left/right (-240 to 240), y is up/down (-180 to 180). Direction 90 = right, -90 = left, 0 = up.
- Broadcasts let sprites talk to each other: one broadcasts, others "when I receive".

When helping students:
- Keep responses short: 2-3 sentences for simple questions, a short paragraph for bigger ideas.
- Use plain, visual language: "This block tells your sprite to..." not "This invokes..."
- Be encouraging by naming one specific thing they did right ("Your forever loop keeps the cat moving."). Only say they're close when one small fix is left. After the tag line, don't start every reply with the same words.
- Always look at the student's actual project (in <project> tags) before answering, and name the project, sprite and script you're talking about. On bug-hunt assignments, follow the ladder below for how much to point at.
- Reference the assignment guide (in <guide> tags) to understand what they're working on.
- If the student sends only a pasted block name, or only a few words with no question: ask one short question first: "What did you expect it to do, and what happened instead?" You may point at one obvious problem in the same reply, but don't rebuild their script until you know what they want. If they send an error message or a message about something not working, explain it as usual.

What you CAN do:
- Explain what a block or script does in plain language.
- Spot bugs in their scripts and point to the exact sprite and block (see the rules below for bug-hunt assignments).
- Suggest one specific block to add, remove, or move, described in words.
- Explain ideas like loops, conditionals, variables, broadcasts, and clones in simple terms.
- Help them think through their game or animation logic step by step.

What you CANNOT do:
- Build whole scripts or projects for them. Never list out a whole script.
- Do their assignment for them. Ask what should happen first and help with that one part.

## Diagnosing vs. solving

**First, check the assignment.** If the assignment is about finding bugs (its name or guide says "Find the Bug", "bug hunt", "debug", "what's wrong", or similar), spotting the bug IS the lesson. Don't point straight at it. Use this ladder, one step per reply, and only go down a step after they've tried:
1. Ask which project they're on, and what they expected vs. what actually happens when they click the green flag.
2. Point to WHERE to look: the sprite and the part of the script ("Watch the rocket when it reaches the top. Which script is running right then?").
3. Name the kind of block involved, still not the fix ("Look at the block that decides when the loop stops. What is it checking?").
4. Only if they're still stuck after trying: say what's wrong in one sentence and let them choose the block to fix it.
Never give fixes for more than one project in a reply. If they ask "where's the bug?" without naming a project, ask which one first. If they ask "how do I do this?" after a hint, don't switch to click-by-click directions. Ask what they see in that script now. If they say you're not helping, say sorry in a few words and give the next step of the ladder, not the answer.
On other assignments, the direct diagnosing rules below still apply.

**Diagnosing: be direct and specific. Point right at the problem:**
- A script with no hat block on top (it never runs).
- A script on the wrong sprite, or on the Stage when it should be on a sprite.
- Blocks after a forever loop (they never run).
- A forever loop with no wait that races too fast, or a missing forever loop so something only happens once.
- Checking the wrong thing: touching the wrong sprite, wrong key, wrong broadcast name, = comparing to the wrong value.
- A variable that's "for this sprite only" when it needs to be shared (or the other way around).

For these, tell them exactly what's wrong, on which sprite, and where. They can fix it themselves once they see it.

**Solving: make THEM do the work.**
- "How do I make my sprite jump?" / "How do I keep score?" / "How do I make enemies appear?" are design questions, not bug questions. Don't build the answer. Teach the idea, name the one block type they'll need, then ask them to try.
- "Can you make my game work?" Break it into the smallest first step ("Let's start with just making the cat move right when you press the arrow key. Which category has the movement blocks?") and only help with that one step.

**When they keep asking ("show me", "next", "just tell me", "I don't get it")**, each answer gives LESS of the solution, not more:
1. First ask: explain the idea and name the kind of block, using a different example ("To make a bird flap, you can switch costumes in a loop.").
2. Second ask: point to the exact sprite and script where the change goes and say in words what it must do. Don't list the blocks.
3. Still stuck: ask which part they don't understand, or suggest they talk it through with their teacher. That's not a dodge here.
Never hand over a whole script, even if they ask many times. Help with one part at a time, and don't give the next part until they've built the current one.

**Guide questions are theirs.** Some assignments ask them to predict what a script will do, then change it. When the guide asks them to predict, trace, explain why something works, or write a reflection, don't give the answer. Ask what they think will happen, then react to it. For a reflection, give a sentence starter ("My sprite moves because ___.") and a question that helps them fill it in. Never answer first and then ask them to "say it in their own words."

## About this chat and about you

- You are the Scratch Coach, an AI helper for this class. If asked your name or what you are, say that in one sentence. Never say you are ChatGPT, Claude, or any other product, and never name a company. You don't know which model runs you.
- Your name stays Scratch Coach. If a student wants to rename you or give you a character, accent, attitude or slang voice, decline in one friendly line and go back to their work. Keep your own voice: warm, calm and clear. Don't copy their slang or give them nicknames. At most one emoji in a reply.
- Questions about you (favorite things, feelings, opinions) get one short line, then back to their work.
- Off-task requests (other homework, stories, jokes, gossip): say you help with Scratch in this class, and ask what they're working on. Keyboard mashing: one short, kind line and a question. After two off-task messages in a row, say you're here whenever they want help with their project, and stop asking follow-up questions.
- The box under your replies says "(Type 'bye' when you're done.)" That is just how to close the coach. If a student asks about it, explain it. They never have to thank you, and you never need them to.

## Where students work: Codio

Students work in Codio, never some other editor or website. You can't run anything yourself, but you always know how THEY can:
- Their .sb3 file opens in the Scratch editor inside Codio (some assignments have several .sb3 files; use the names in <project>). Click the green flag to run it and the red stop sign to stop it.
- The purple **Tutorials** button at the top of the Scratch editor has built-in step-by-step tutorials.
- If a student asks "can you run this?" or "how do I run it?", tell them exactly that. Don't say it depends on their editor or website. It's always Codio.

## When to send them to the teacher

Suggest asking the teacher when something really needs a human: Codio itself seems broken (the button does nothing, files are missing, they can't Mark as Complete), questions about grades or deadlines, the student is upset or frustrated, or anything about their wellbeing or safety. Don't use "ask your teacher" to dodge a question about their blocks or about Codio that you can answer.`;

  const exitPhrases = ["thanks", "thank you", "bye", "done", "exit", "quit", "stop", "no thanks", "i'm good", "im good", "that's all", "thats all"];

  // Exit only when the whole message is a goodbye ("thanks!", "ok bye", "no thanks 🙂",
  // "i’m good thanks"). Every word must be goodbye vocabulary, so "thanks, still broken",
  // "i'm done with loops" or "stop button doesn't work" keep the chat open. "stop"/"exit"/
  // "quit"/"done" alone still exit through the exact exitPhrases list.
  const goodbyeWords = ["thanks", "thank", "you", "thx", "ty", "bye", "goodbye", "cya", "no", "ok", "okay",
    "cool", "great", "alright", "all", "that's", "thats", "i'm", "im", "good", "done", "for", "now",
    "see", "ya", "later", "so", "much", "then", "very", "lot", "a"];
  const goodbyeCores = ["thanks", "thank", "thx", "ty", "bye", "goodbye", "cya"];
  const goodbyePhrases = ["i'm good", "im good", "i'm done", "im done", "that's all", "thats all", "see ya", "see you"];
  function isExitMessage(text) {
    if (typeof text !== "string") return false;
    if (text.indexOf("?") !== -1) return false;
    const norm = text.toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z' ]+/g, " ").replace(/\s+/g, " ").trim();
    if (!norm) return false;
    if (exitPhrases.includes(norm)) return true;
    const words = norm.split(" ");
    if (words.length > 6) return false;
    if (!words.every(function(w) { return goodbyeWords.indexOf(w) !== -1; })) return false;
    const padded = " " + norm + " ";
    return words.some(function(w) { return goodbyeCores.indexOf(w) !== -1; }) ||
      goodbyePhrases.some(function(p) { return padded.indexOf(" " + p + " ") !== -1; });
  }

  // ============================================================
  // .sb3 unpacking (an .sb3 file is a ZIP containing project.json)
  // ============================================================

  // Normalize whatever readFile() returns into raw bytes.
  async function toBytes(data) {
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (typeof Blob !== "undefined" && data instanceof Blob) {
      return new Uint8Array(await data.arrayBuffer());
    }
    if (typeof data === "string") {
      // Base64-encoded zip ("PK" encodes to "UEs")
      if (/^UEs/.test(data) && /^[A-Za-z0-9+/=\s]+$/.test(data.slice(0, 200))) {
        const bin = atob(data.replace(/\s/g, ""));
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
      }
      // Binary string (latin-1 style, one char per byte)
      const out = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) out[i] = data.charCodeAt(i) & 0xFF;
      return out;
    }
    throw new Error("Unsupported file data type");
  }

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("DecompressionStream not available in this browser");
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  // Minimal ZIP reader: finds project.json and returns its text.
  async function extractProjectJson(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const u16 = (off) => view.getUint16(off, true);
    const u32 = (off) => view.getUint32(off, true);

    // Find End of Central Directory record (sig 0x06054b50), scanning back over the comment
    let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
      if (u32(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("Not a valid .sb3/zip file (no end-of-central-directory)");

    const entryCount = u16(eocd + 10);
    let off = u32(eocd + 16); // central directory offset

    const decoder = new TextDecoder("utf-8");
    for (let n = 0; n < entryCount; n++) {
      if (u32(off) !== 0x02014b50) break;
      const method = u16(off + 10);
      const compSize = u32(off + 20);
      const nameLen = u16(off + 28);
      const extraLen = u16(off + 30);
      const commentLen = u16(off + 32);
      const localOff = u32(off + 42);
      const name = decoder.decode(bytes.subarray(off + 46, off + 46 + nameLen));

      if (name === "project.json") {
        if (u32(localOff) !== 0x04034b50) throw new Error("Corrupt zip local header");
        const lNameLen = u16(localOff + 26);
        const lExtraLen = u16(localOff + 28);
        const dataStart = localOff + 30 + lNameLen + lExtraLen;
        const compData = bytes.subarray(dataStart, dataStart + compSize);
        if (method === 0) return decoder.decode(compData);
        if (method === 8) return decoder.decode(await inflateRaw(compData));
        throw new Error("Unsupported zip compression method: " + method);
      }
      off += 46 + nameLen + extraLen + commentLen;
    }
    throw new Error("No project.json found inside the .sb3 file");
  }

  // ============================================================
  // project.json -> scratchblocks-style text
  // ============================================================

  const OPCODES = {
    // Motion
    motion_movesteps: "move {STEPS} steps",
    motion_turnright: "turn right {DEGREES} degrees",
    motion_turnleft: "turn left {DEGREES} degrees",
    motion_goto: "go to {TO}",
    motion_gotoxy: "go to x: {X} y: {Y}",
    motion_glideto: "glide {SECS} secs to {TO}",
    motion_glidesecstoxy: "glide {SECS} secs to x: {X} y: {Y}",
    motion_pointindirection: "point in direction {DIRECTION}",
    motion_pointtowards: "point towards {TOWARDS}",
    motion_changexby: "change x by {DX}",
    motion_setx: "set x to {X}",
    motion_changeyby: "change y by {DY}",
    motion_sety: "set y to {Y}",
    motion_ifonedgebounce: "if on edge, bounce",
    motion_setrotationstyle: "set rotation style {STYLE}",
    motion_xposition: "(x position)",
    motion_yposition: "(y position)",
    motion_direction: "(direction)",
    // Looks
    looks_sayforsecs: "say {MESSAGE} for {SECS} seconds",
    looks_say: "say {MESSAGE}",
    looks_thinkforsecs: "think {MESSAGE} for {SECS} seconds",
    looks_think: "think {MESSAGE}",
    looks_switchcostumeto: "switch costume to {COSTUME}",
    looks_nextcostume: "next costume",
    looks_switchbackdropto: "switch backdrop to {BACKDROP}",
    looks_switchbackdroptoandwait: "switch backdrop to {BACKDROP} and wait",
    looks_nextbackdrop: "next backdrop",
    looks_changesizeby: "change size by {CHANGE}",
    looks_setsizeto: "set size to {SIZE} %",
    looks_changeeffectby: "change {EFFECT} effect by {CHANGE}",
    looks_seteffectto: "set {EFFECT} effect to {VALUE}",
    looks_cleargraphiceffects: "clear graphic effects",
    looks_show: "show",
    looks_hide: "hide",
    looks_gotofrontback: "go to {FRONT_BACK} layer",
    looks_goforwardbackwardlayers: "go {FORWARD_BACKWARD} {NUM} layers",
    looks_costumenumbername: "(costume {NUMBER_NAME})",
    looks_backdropnumbername: "(backdrop {NUMBER_NAME})",
    looks_size: "(size)",
    // Sound
    sound_playuntildone: "play sound {SOUND_MENU} until done",
    sound_play: "start sound {SOUND_MENU}",
    sound_stopallsounds: "stop all sounds",
    sound_changevolumeby: "change volume by {VOLUME}",
    sound_setvolumeto: "set volume to {VOLUME} %",
    sound_volume: "(volume)",
    sound_changeeffectby: "change {EFFECT} sound effect by {VALUE}",
    sound_seteffectto: "set {EFFECT} sound effect to {VALUE}",
    sound_cleareffects: "clear sound effects",
    // Events
    event_whenflagclicked: "when green flag clicked",
    event_whenkeypressed: "when {KEY_OPTION} key pressed",
    event_whenthisspriteclicked: "when this sprite clicked",
    event_whenstageclicked: "when stage clicked",
    event_whenbackdropswitchesto: "when backdrop switches to {BACKDROP}",
    event_whengreaterthan: "when {WHENGREATERTHANMENU} > {VALUE}",
    event_whenbroadcastreceived: "when I receive {BROADCAST_OPTION}",
    event_broadcast: "broadcast {BROADCAST_INPUT}",
    event_broadcastandwait: "broadcast {BROADCAST_INPUT} and wait",
    // Control
    control_wait: "wait {DURATION} seconds",
    control_repeat: "repeat {TIMES}",
    control_forever: "forever",
    control_if: "if {CONDITION} then",
    control_if_else: "if {CONDITION} then",
    control_wait_until: "wait until {CONDITION}",
    control_repeat_until: "repeat until {CONDITION}",
    control_stop: "stop {STOP_OPTION}",
    control_start_as_clone: "when I start as a clone",
    control_create_clone_of: "create clone of {CLONE_OPTION}",
    control_delete_this_clone: "delete this clone",
    // Sensing
    sensing_touchingobject: "<touching {TOUCHINGOBJECTMENU} ?>",
    sensing_touchingcolor: "<touching color {COLOR} ?>",
    sensing_coloristouchingcolor: "<color {COLOR} is touching {COLOR2} ?>",
    sensing_distanceto: "(distance to {DISTANCETOMENU})",
    sensing_askandwait: "ask {QUESTION} and wait",
    sensing_answer: "(answer)",
    sensing_keypressed: "<key {KEY_OPTION} pressed?>",
    sensing_mousedown: "<mouse down?>",
    sensing_mousex: "(mouse x)",
    sensing_mousey: "(mouse y)",
    sensing_setdragmode: "set drag mode {DRAG_MODE}",
    sensing_loudness: "(loudness)",
    sensing_timer: "(timer)",
    sensing_resettimer: "reset timer",
    sensing_of: "({PROPERTY} of {OBJECT})",
    sensing_current: "(current {CURRENTMENU})",
    sensing_dayssince2000: "(days since 2000)",
    sensing_username: "(username)",
    // Operators
    operator_add: "({NUM1} + {NUM2})",
    operator_subtract: "({NUM1} - {NUM2})",
    operator_multiply: "({NUM1} * {NUM2})",
    operator_divide: "({NUM1} / {NUM2})",
    operator_random: "(pick random {FROM} to {TO})",
    operator_gt: "<{OPERAND1} > {OPERAND2}>",
    operator_lt: "<{OPERAND1} < {OPERAND2}>",
    operator_equals: "<{OPERAND1} = {OPERAND2}>",
    operator_and: "<{OPERAND1} and {OPERAND2}>",
    operator_or: "<{OPERAND1} or {OPERAND2}>",
    operator_not: "<not {OPERAND}>",
    operator_join: "(join {STRING1} {STRING2})",
    operator_letter_of: "(letter {LETTER} of {STRING})",
    operator_length: "(length of {STRING})",
    operator_contains: "<{STRING1} contains {STRING2} ?>",
    operator_mod: "({NUM1} mod {NUM2})",
    operator_round: "(round {NUM})",
    operator_mathop: "({OPERATOR} of {NUM})",
    // Variables & lists
    data_setvariableto: "set {VARIABLE} to {VALUE}",
    data_changevariableby: "change {VARIABLE} by {VALUE}",
    data_showvariable: "show variable {VARIABLE}",
    data_hidevariable: "hide variable {VARIABLE}",
    data_addtolist: "add {ITEM} to {LIST}",
    data_deleteoflist: "delete {INDEX} of {LIST}",
    data_deletealloflist: "delete all of {LIST}",
    data_insertatlist: "insert {ITEM} at {INDEX} of {LIST}",
    data_replaceitemoflist: "replace item {INDEX} of {LIST} with {ITEM}",
    data_itemoflist: "(item {INDEX} of {LIST})",
    data_itemnumoflist: "(item # of {ITEM} in {LIST})",
    data_lengthoflist: "(length of {LIST})",
    data_listcontainsitem: "<{LIST} contains {ITEM} ?>",
    data_showlist: "show list {LIST}",
    data_hidelist: "hide list {LIST}",
    // Pen extension
    pen_clear: "erase all",
    pen_stamp: "stamp",
    pen_penDown: "pen down",
    pen_penUp: "pen up",
    pen_setPenColorToColor: "set pen color to {COLOR}",
    pen_changePenColorParamBy: "change pen {COLOR_PARAM} by {VALUE}",
    pen_setPenColorParamTo: "set pen {COLOR_PARAM} to {VALUE}",
    pen_changePenSizeBy: "change pen size by {SIZE}",
    pen_setPenSizeTo: "set pen size to {SIZE}"
  };

  const C_BLOCKS = ["control_forever", "control_repeat", "control_repeat_until", "control_if", "control_if_else", "control_for_each"];

  const MENU_VALUES = {
    "_edge_": "edge",
    "_mouse_": "mouse-pointer",
    "_random_": "random position",
    "_myself_": "myself",
    "_stage_": "Stage"
  };

  function prettyMenuValue(v) {
    return MENU_VALUES[v] !== undefined ? MENU_VALUES[v] : v;
  }

  // Format an inline primitive value: [type, value, ...]
  function fmtValue(prim) {
    const type = prim[0];
    if (type === 11 || type === 12 || type === 13) return "(" + prim[1] + ")"; // broadcast / variable / list
    const v = prim[1];
    if (v === null || v === undefined || v === "") return "( )";
    if (type === 10) return "[" + v + "]"; // string
    return "(" + v + ")";
  }

  function idOf(input) {
    if (!input) return null;
    const data = input[1];
    return (typeof data === "string") ? data : null;
  }

  function renderInput(input, blocks) {
    if (!input) return "( )";
    const data = input[1];
    if (data === null || data === undefined) return "( )";
    if (typeof data === "string") {
      const block = blocks[data];
      return block ? renderReporter(block, blocks) : "( )";
    }
    if (Array.isArray(data)) return fmtValue(data);
    return "( )";
  }

  function applyTemplate(tpl, block, blocks) {
    return tpl.replace(/\{(\w+)\}/g, function(m, name) {
      if (block.inputs && (name in block.inputs)) return renderInput(block.inputs[name], blocks);
      if (block.fields && (name in block.fields)) return "[" + prettyMenuValue(block.fields[name][0]) + "]";
      return "( )";
    });
  }

  function genericText(block, blocks) {
    let text = block.opcode.replace(/^[a-z]+_/, "").replace(/_/g, " ");
    const parts = [];
    if (block.fields) {
      for (const key in block.fields) parts.push("[" + prettyMenuValue(block.fields[key][0]) + "]");
    }
    if (block.inputs) {
      for (const key in block.inputs) {
        if (key.indexOf("SUBSTACK") === 0) continue;
        parts.push(renderInput(block.inputs[key], blocks));
      }
    }
    return parts.length ? text + " " + parts.join(" ") : text;
  }

  // Render a reporter/boolean/menu block as inline text.
  function renderReporter(block, blocks) {
    const op = block.opcode;
    if (op === "argument_reporter_string_number" || op === "argument_reporter_boolean") {
      return "(" + ((block.fields && block.fields.VALUE) ? block.fields.VALUE[0] : "arg") + ")";
    }
    if (OPCODES[op]) return applyTemplate(OPCODES[op], block, blocks);
    // Dropdown menu shadow blocks: single field, no inputs
    if (block.fields) {
      const fieldKeys = Object.keys(block.fields);
      if (fieldKeys.length === 1 && (!block.inputs || Object.keys(block.inputs).length === 0)) {
        return "(" + prettyMenuValue(block.fields[fieldKeys[0]][0]) + ")";
      }
    }
    return "(" + genericText(block, blocks) + ")";
  }

  function renderBlockLine(block, blocks, indent, lines) {
    const pad = "  ".repeat(indent);
    const op = block.opcode;

    if (op === "procedures_definition") {
      const proto = blocks[idOf(block.inputs && block.inputs.custom_block)];
      let sig = "custom block";
      if (proto && proto.mutation && proto.mutation.proccode) {
        sig = proto.mutation.proccode;
        try {
          const names = JSON.parse(proto.mutation.argumentnames || "[]");
          let i = 0;
          sig = sig.replace(/%[snb]/g, function() { return "(" + (names[i++] || "arg") + ")"; });
        } catch (e) { /* leave raw proccode */ }
      }
      lines.push(pad + "define " + sig);
      return;
    }

    let text;
    if (op === "procedures_call" && block.mutation && block.mutation.proccode) {
      let argIds = [];
      try { argIds = JSON.parse(block.mutation.argumentids || "[]"); } catch (e) { /* no args */ }
      let i = 0;
      text = block.mutation.proccode.replace(/%[snb]/g, function() {
        const key = argIds[i++];
        return (key && block.inputs && block.inputs[key]) ? renderInput(block.inputs[key], blocks) : "( )";
      });
    } else if (OPCODES[op]) {
      text = applyTemplate(OPCODES[op], block, blocks);
    } else {
      text = genericText(block, blocks);
    }
    lines.push(pad + text);

    if (C_BLOCKS.indexOf(op) >= 0) {
      const sub1 = idOf(block.inputs && block.inputs.SUBSTACK);
      if (sub1) renderStack(sub1, blocks, indent + 1, lines);
      if (op === "control_if_else") {
        lines.push(pad + "else");
        const sub2 = idOf(block.inputs && block.inputs.SUBSTACK2);
        if (sub2) renderStack(sub2, blocks, indent + 1, lines);
      }
      lines.push(pad + "end");
    }
  }

  function renderStack(startId, blocks, indent, lines) {
    let id = startId;
    let guard = 0;
    while (id && guard++ < 2000) {
      const block = blocks[id];
      if (!block) break;
      renderBlockLine(block, blocks, indent, lines);
      id = block.next;
    }
  }

  // Collect the ids of every variable/list actually referenced by a block
  // (Scratch auto-creates "my variable" in every project, so declared != used).
  function collectUsedDataIds(targets) {
    const used = {};
    for (const target of targets) {
      const blocks = target.blocks || {};
      for (const id in blocks) {
        const block = blocks[id];
        if (!block || typeof block !== "object" || Array.isArray(block)) continue;
        if (block.fields) {
          if (block.fields.VARIABLE && block.fields.VARIABLE[1]) used[block.fields.VARIABLE[1]] = true;
          if (block.fields.LIST && block.fields.LIST[1]) used[block.fields.LIST[1]] = true;
        }
        if (block.inputs) {
          for (const key in block.inputs) {
            const data = block.inputs[key] && block.inputs[key][1];
            if (Array.isArray(data) && (data[0] === 12 || data[0] === 13) && data[2]) used[data[2]] = true;
          }
        }
      }
    }
    return used;
  }

  function dataNames(dict, usedIds) {
    const names = [];
    for (const key in (dict || {})) {
      names.push(dict[key][0] + (usedIds[key] ? "" : " (not used in any script)"));
    }
    return names;
  }

  function renderTarget(target, usedIds) {
    const lines = [];
    lines.push(target.isStage ? "=== Stage ===" : "=== Sprite: " + target.name + " ===");

    const costumes = (target.costumes || []).map(function(c) { return c.name; });
    if (costumes.length) lines.push((target.isStage ? "Backdrops: " : "Costumes: ") + costumes.join(", "));

    const varNames = dataNames(target.variables, usedIds);
    if (varNames.length) lines.push("Variables: " + varNames.join(", "));

    const listNames = dataNames(target.lists, usedIds);
    if (listNames.length) lines.push("Lists: " + listNames.join(", "));

    const blocks = target.blocks || {};
    let scriptNum = 0;
    for (const id in blocks) {
      const block = blocks[id];
      if (!block || typeof block !== "object" || Array.isArray(block)) continue; // skip loose variable/list reporters
      if (!block.topLevel || block.shadow) continue;
      scriptNum++;
      lines.push("");
      lines.push("Script " + scriptNum + ":");
      renderStack(id, blocks, 1, lines);
    }
    if (scriptNum === 0) lines.push("(no scripts)");
    return lines.join("\n");
  }

  function renderProject(project) {
    const targets = project.targets || [];
    const sprites = targets.filter(function(t) { return !t.isStage; });
    const usedIds = collectUsedDataIds(targets);
    const parts = [];
    parts.push("Project overview: " + sprites.length + " sprite(s): " +
      (sprites.map(function(s) { return s.name; }).join(", ") || "(none)"));
    for (const target of targets) {
      parts.push("");
      parts.push(renderTarget(target, usedIds));
    }
    return parts.join("\n");
  }

  // ============================================================
  // File discovery + reading via codioIDE.files
  // (codioIDE.workspace does NOT exist in the Custom Assistant runtime;
  //  getContext().files only lists *open* editor files, never the .sb3.
  //  The supported channel is the codioIDE.files namespace.)
  // ============================================================

  function isProjectFileName(name) {
    const lower = String(name).toLowerCase();
    return lower.endsWith(".sb3") || lower === "project.json";
  }

  // getStructure() returns a name->value MAP: a file's value is a leaf (Codio
  // uses 1), a directory's value is a nested map. We also tolerate the
  // array-of-nodes / {name,type,children} shapes in case other contexts differ.
  function collectProjectPaths(node, prefix, out) {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const child of node) collectProjectPaths(child, prefix, out);
      return;
    }
    if (typeof node !== "object") return;

    // Explicit node object: {name/path, type/children, ...}
    const name = node.name || node.title || node.label || null;
    const kids = node.children || node.contents || node.files || null;
    if (name || kids) {
      if (name && String(name).charAt(0) === ".") return; // skip dotfiles/dirs
      const isDir = node.type === "directory" || node.type === "dir" ||
                    node.isDir === true || node.isDirectory === true || Array.isArray(kids);
      const full = node.path || (name ? (prefix ? prefix + "/" + name : name) : prefix);
      if (name && !isDir && isProjectFileName(name)) out.push(full);
      if (kids) collectProjectPaths(kids, full || prefix, out);
      return;
    }

    // name->value map shape (Codio getStructure): object value = dir, else file.
    for (const key in node) {
      if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
      if (String(key).charAt(0) === ".") continue; // skip dotfiles/dirs
      const full = prefix ? prefix + "/" + key : key;
      const value = node[key];
      if (value && typeof value === "object") {
        collectProjectPaths(value, full, out); // directory
      } else if (isProjectFileName(key)) {
        out.push(full);
      }
    }
  }

  // Cache of unpacked projects so an unchanged .sb3 isn't re-inflated every turn.
  // Key: path. Entry: { len, hash, text } where len/hash fingerprint the base64 read.
  const projectCache = {};

  // Read one file through codioIDE.files and return its rendered text (cached for .sb3).
  async function readProjectText(F, path) {
    if (path.toLowerCase().endsWith(".sb3")) {
      const b64 = await withTimeout(F.getContentBase64(path), 8000, "read " + path); // base64 avoids UTF-8 corruption of binary
      if (typeof b64 !== "string") throw new Error("unreadable");
      if (b64.length === 0) return "(empty file)";
      const fp = fingerprint(b64);
      const hit = projectCache[path];
      if (hit && hit.len === fp.len && hit.hash === fp.hash) return hit.text;
      const text = renderProject(JSON.parse(await extractProjectJson(await toBytes(b64))));
      projectCache[path] = { len: fp.len, hash: fp.hash, text: text };
      return text;
    }
    const raw = await withTimeout(F.getContent(path), 8000, "read " + path);
    if (typeof raw !== "string") throw new Error("unreadable");
    if (!raw.trim()) return "(empty file)";
    return renderProject(JSON.parse(raw));
  }

  const MAX_PROJECT_CHARS = 30000;
  const MAX_PROJECTS = 8;
  const MAX_TOTAL_CHARS = 100000;

  function baseNameOf(path) {
    return String(path).replace(/^.*\//, "");
  }

  // Order: projects named in the student's latest message first, then files open in
  // the editor, then the rest alphabetically.
  function orderProjectPaths(paths, latestMessage, openPaths) {
    const msg = String(latestMessage || "").toLowerCase();
    const open = (openPaths || []).map(function(p) { return baseNameOf(p).toLowerCase(); });
    function rank(path) {
      const base = baseNameOf(path).toLowerCase();
      const stem = base.replace(/\.sb3$/, "");
      if (stem.length >= 3 && new RegExp("(^|[^a-z0-9])" + stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z0-9]|$)").test(msg)) return 0;
      if (open.indexOf(base) !== -1) return 1;
      return 2;
    }
    return paths.slice().sort(function(a, b) {
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
      return String(a).toLowerCase() < String(b).toLowerCase() ? -1 : (String(a).toLowerCase() > String(b).toLowerCase() ? 1 : 0);
    });
  }

  // Returns { text, ok }. ok is false when no project could be read (the text is then a fallback).
  async function getScratchProjectsText(latestMessage, openPaths) {
    const F = codioIDE.files;
    if (!F || typeof F.getContentBase64 !== "function") {
      return { ok: false, text: "No Scratch project could be read (Codio files API unavailable). Ask the student to describe their sprites and scripts." };
    }

    // Discover candidates from the file structure (best effort)...
    let found = [];
    try {
      if (typeof F.getStructure === "function") {
        collectProjectPaths(await withTimeout(F.getStructure(), 8000, "structure"), "", found);
      }
    } catch (e) { /* fall back to conventional names below */ }
    found = found.filter(function(v, i) { return found.indexOf(v) === i; });

    // ...and try the conventional Scratch path directly if the structure didn't list it.
    const guesses = [];
    if (!found.some(function(p) { return baseNameOf(p).toLowerCase() === "project.sb3"; })) {
      guesses.push("project.sb3", "/project.sb3", "./project.sb3");
    }

    const ordered = orderProjectPaths(found, latestMessage, openPaths).concat(guesses);
    const sections = [];
    const notShown = [];
    const tried = [];
    const seenBase = {}; // dedup by basename so path-format variants don't double-render
    let total = 0;
    for (const path of ordered) {
      const base = baseNameOf(path).toLowerCase();
      if (seenBase[base]) continue;
      const isGuess = guesses.indexOf(path) >= 0;
      if (sections.length >= MAX_PROJECTS) {
        if (!isGuess) notShown.push(baseNameOf(path));
        continue;
      }
      tried.push(path);
      let text;
      try {
        text = await readProjectText(F, path);
      } catch (err) {
        if (!isGuess) notShown.push(baseNameOf(path)); // unreadable (guesses may simply not exist)
        continue;
      }
      if (text.length > MAX_PROJECT_CHARS) {
        text = text.substring(0, MAX_PROJECT_CHARS) + "\n(cut off after " + MAX_PROJECT_CHARS + " characters)";
      }
      if (total + text.length > MAX_TOTAL_CHARS && sections.length > 0) {
        notShown.push(baseNameOf(path));
        seenBase[base] = true;
        continue;
      }
      total += text.length;
      seenBase[base] = true;
      sections.push({ path: String(path), body: "Project file: " + path + "\n" + text });
    }

    if (sections.length === 0) {
      return { ok: false, text: "No Scratch project could be read. Ask the student to describe their sprites and scripts. (Tried: " + tried.join(", ") + ")" +
        (notShown.length ? "\nNot shown (too long to include, or couldn't be read): " + notShown.join(", ") : "") };
    }
    // Display order is by path, so a different ranking (newest message, open tabs) can't
    // change the text or its fingerprint; ranking only decided what fit the budget.
    sections.sort(function(a, b) { return a.path < b.path ? -1 : (a.path > b.path ? 1 : 0); });
    notShown.sort();
    let out = sections.map(function(x) { return x.body; }).join("\n\n");
    if (notShown.length) {
      out += "\n\nNot shown (too long to include, or couldn't be read): " + notShown.join(", ");
    }
    return { ok: true, text: out };
  }

  // ============================================================
  // Coach conversation loop
  // ============================================================

  codioIDE.coachBot.register("scratchCoachHelp", "Scratch Coach", onButtonPress);

  // ============================================================
  // Session log — a hidden, shared workspace file (.coach-log.json) that every
  // coach appends to (one entry per session, tagged with `coach`), summarizing
  // how students use the coaches. Dot-prefixed so it never enters the LLM
  // context (collectProjectPaths already skips dot-files). Deliberately records
  // the student's questions: Codio's own course coach-log export logs only the
  // userPrompt field, which is empty for messages-based coaches like these —
  // this file is where the questions live. Sessions are never dropped (always
  // appended). Logging is wrapped so it can never break the coach.
  // ============================================================

  const SESSION_LOG_PATH = ".coach-log.json";
  const COACH_ID = "scratch";
  const MAX_LOGGED_QUESTIONS = 50;

  // Returns the parsed history, [] when the file doesn't exist or is empty, or null when the
  // file exists but couldn't be read/parsed. null disables saving for this session so a
  // transient read failure can never overwrite (wipe) everyone's history.
  async function loadSessionHistory() {
    const F = codioIDE.files;
    if (!F || typeof F.getContent !== "function") return null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await withTimeout(F.getContent(SESSION_LOG_PATH), 8000, "read log");
        if (typeof text !== "string" || !text.trim()) return [];
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : null;
      } catch (e) {
        await delay(300);
      }
    }
    // Both reads failed: only start fresh if the file really isn't there.
    try {
      if (typeof F.getStructure === "function") {
        const tree = await withTimeout(F.getStructure(), 8000, "structure");
        if (tree && typeof tree === "object" && Object.keys(tree).length > 0 && !(SESSION_LOG_PATH in tree)) return [];
      }
    } catch (e) {}
    return null;
  }

  // Short, stable fingerprint of the files block the model sees (FNV-1a, 8 hex chars).
  // Logged per turn so a later review can tell "student fixed it" from "coach saw stale files".
  function fingerprint(text) {
    const s = String(text || "");
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return { len: s.length, hash: ("0000000" + h.toString(16)).slice(-8) };
  }

  // Bound any files-API call so a hung deleteFiles/add/getContent can't stall the coach.
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  function withTimeout(promise, ms, label) {
    let t;
    const timeout = new Promise((_, rej) => { t = setTimeout(() => rej(new Error("timeout: " + label)), ms); });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
  }

  // Confirm a write really landed — Codio's deleteFiles()+add() overwrite can land
  // a 0-byte file while add() throws nothing (observed live Aug 2026: the shared
  // .coach-log.json was wiped to 0 bytes). Verify by length (tolerant of trailing-
  // newline normalization), not exact match.
  async function readbackOk(F, path, content) {
    if (typeof F.getContent !== "function") return true;
    try {
      const got = await withTimeout(F.getContent(path), 8000, "read " + path);
      return typeof got === "string" && got.length > 0 && got.length >= content.length - 4;
    } catch (e) {
      return false;
    }
  }

  // Write and VERIFY. add() can't overwrite, so an existing file needs
  // deleteFiles()+add — but that add can land empty if the delete hasn't settled,
  // so pause, re-add, read back, and retry. Never reports success on an empty write.
  async function addVerified(F, path, content) {
    try {
      await withTimeout(F.add(path, content), 8000, "add " + path);
      if (await readbackOk(F, path, content)) return true;
    } catch (e) {}
    if (typeof F.deleteFiles !== "function") return false;
    for (let attempt = 0; attempt < 5; attempt++) {
      try { await withTimeout(F.deleteFiles([path]), 8000, "del " + path); } catch (e) {}
      await delay(150 + attempt * 150);
      try { await withTimeout(F.add(path, content), 8000, "add " + path); } catch (e) {}
      if (await readbackOk(F, path, content)) return true;
      await delay(150);
    }
    return false;
  }

  async function saveSessionHistory(history) {
    const F = codioIDE.files;
    if (!F || typeof F.add !== "function") return;
    const text = JSON.stringify(history, null, 2);
    await addVerified(F, SESSION_LOG_PATH, text);
  }

  // Never block the conversation on a log write — shared pattern, see the coaches
  // CLAUDE.md "Session Logging". saveSessionHistory() is a full read-modify-rewrite
  // (deleteFiles + add) of the shared log; awaiting it in the turn loop means a
  // stalled write freezes the coach with no input box. queueSave() serializes
  // writes on a promise chain (overlapping fire-and-forget saves can't corrupt the
  // file) and is called WITHOUT await each turn; only the end-of-session flush is awaited.
  let saveChain = Promise.resolve();
  function queueSave(history) {
    saveChain = saveChain.then(function() { return saveSessionHistory(history); }).catch(function() {});
    return saveChain;
  }

  // ============================================================
  // Try-first help (strict mode), with the model's judgment and the code's memory.
  // Each reply starts with a hidden tag labelling the student's CURRENT message:
  // [[ask]] (wants the next step, the code or a check instead of trying), [[attempt]]
  // (shows or describes their own try), or [[other]]. The code keeps those labels in
  // the box's log and, before every reply, tells the model in <recent_questions> which
  // kind of help each label gets this turn: try-first when this would be the 3rd ask
  // in their last 5 questions since their last attempt, or while try-first is already on (until an attempt).
  // The tag is stripped before the student sees the reply (ask() runs with
  // stream:false, then write()) and kept in the chat history so the model keeps
  // tagging. Backstop: STRICT_SESSION_QUESTIONS questions in a session means try-first.
  // The log is per box (one student, one assignment), so nothing carries over.
  // ============================================================
  const STRICT_SESSION_QUESTIONS = 10; // backstop: questions in the current session
  const STRICT_WORKSPACE_DAYS = 14;    // only sessions that started within this many days
  const TRY_FIRST_ASKS = 3;            // asks among the last TRY_FIRST_WINDOW questions that switch it on
  const TRY_FIRST_WINDOW = 5;
  const RECENT_QUESTIONS_SHOWN = 10;   // questions listed in <recent_questions>
  const RECENT_QUESTION_CHARS = 160;   // each one cut to this length
  const MODE_LABELS = ["ask", "attempt", "other"];

  // This coach's recent questions in this box (last STRICT_WORKSPACE_DAYS days, this
  // session included), each with the label the model gave it (null if none yet).
  function recentQuestionList(history, session) {
    let total = 0;
    let items = [];
    const list = Array.isArray(history) ? history : [];
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (!s || typeof s !== "object" || s.coach !== COACH_ID) continue;
      const startedMs = Date.parse(s.started);
      if (s !== session && !(startedMs > Date.now() - STRICT_WORKSPACE_DAYS * 86400000)) continue;
      const qs = Array.isArray(s.questions) ? s.questions : [];
      const labels = Array.isArray(s.labels) ? s.labels : [];
      total += (typeof s.exchanges === "number" && s.exchanges >= qs.length) ? s.exchanges : qs.length;
      for (let j = 0; j < qs.length; j++) {
        if (typeof qs[j] === "string") items.push({ q: qs[j], label: MODE_LABELS.indexOf(labels[j]) !== -1 ? labels[j] : null });
      }
    }
    return { total: total, items: items };
  }

  // Which help each possible label of the CURRENT question gets this turn.
  function modeRule(history, session) {
    const recent = recentQuestionList(history, session);
    let prior = recent.items.slice(0, -1).slice(-(TRY_FIRST_WINDOW - 1));
    let lastAttempt = -1;
    prior.forEach(function(it, i) { if (it.label === "attempt") lastAttempt = i; });
    prior = prior.slice(lastAttempt + 1); // an attempt starts the count over
    const priorAsks = prior.filter(function(it) { return it.label === "ask"; }).length;
    const modes = Array.isArray(session.modes) ? session.modes : [];
    const lastMode = modes.length ? modes[modes.length - 1] : "normal";
    if ((session.exchanges || 0) >= STRICT_SESSION_QUESTIONS) {
      return { ask: "try-first", attempt: "try-first", other: "try-first", backstop: true, recent: recent };
    }
    return {
      ask: (priorAsks + 1 >= TRY_FIRST_ASKS || lastMode === "try-first") ? "try-first" : "normal",
      attempt: "normal",
      other: lastMode === "try-first" ? "try-first" : "normal",
      backstop: false,
      recent: recent
    };
  }

  // The <recent_questions> block for messages[0]. Rebuilt every turn after recordTurn().
  function recentQuestionsBlock(history, session) {
    const rule = modeRule(history, session);
    const shown = rule.recent.items.slice(-RECENT_QUESTIONS_SHOWN).map(function(it, i, arr) {
      const one = it.q.replace(/\s+/g, " ").trim();
      const cut = one.length > RECENT_QUESTION_CHARS ? one.slice(0, RECENT_QUESTION_CHARS) + "..." : one;
      const tag = (i === arr.length - 1) ? "[current]" : "[" + (it.label || "?") + "]";
      return (i + 1) + ". " + tag + " " + cut;
    });
    const big = function(m) { return m === "try-first" ? "TRY-FIRST help" : "NORMAL help"; };
    return "<recent_questions>\n" +
      "Questions to you in this assignment in the last " + STRICT_WORKSPACE_DAYS + " days: " + rule.recent.total +
      ". In this session: " + (session.exchanges || 0) + ".\n" +
      (shown.length ? "Their recent questions, oldest first, with the label you gave each:\n" + shown.join("\n") : "No earlier questions.") +
      "\nFor the current question, label it and give this help:\n" +
      "- [[ask]]: " + big(rule.ask) + "\n" +
      "- [[attempt]]: " + big(rule.attempt) + "\n" +
      "- [[other]]: " + big(rule.other) + "\n" +
      "</recent_questions>";
  }

  // Reads and strips the hidden tag line. Returns the label (null if missing) and the
  // cleaned text. Tolerates ** or backtick wrappers, # or >, one closing bracket, a
  // trailing colon, and extra words like "[[ask | try-first]]".
  function readModeTag(reply) {
    const text = String(reply || "");
    const nl = text.search(/\n|$/);
    const first = text.slice(0, nl);
    let label = null;
    let rest = text;
    // Strip only the tag itself, so "[[ask]] What did you try?" keeps its words.
    const lead = first.match(/^\s*[#*_`> \t]*\[\[\s*(ask|attempt|other|try-first|normal)\b([^\]\n]{0,30}\]\]|\]{0,2})[*_`:]*[ \t]*/i);
    if (lead) {
      const w = lead[1].toLowerCase();
      label = MODE_LABELS.indexOf(w) !== -1 ? w : null;
      rest = first.slice(lead[0].length) + text.slice(nl);
    }
    const clean = rest
      .replace(/[*_`]*\[\[\s*(ask|attempt|other|try-first|normal)(\s*\|[^\]\n]{0,30})?\s*\]\][*_`:]*[ \t]*/gi, "") // stray copies
      .replace(/^\s+/, "");
    return { label: label, text: clean };
  }

  // The chat-history copy of a reply keeps its tag line (only the student's view is
  // cleaned), so the model keeps seeing itself tag every reply.
  function historyReply(tagged) {
    return "[[" + (tagged.label || "other") + "]]\n" + tagged.text;
  }

  // Call after every non-empty reply, with the rule used for this turn (from
  // modeRule(), computed when this turn's context was built) and the tag read from the
  // reply. Logs the label and the mode; the next queued save carries them.
  function recordMode(session, rule, label) {
    const mode = rule[label || "other"];
    if (!Array.isArray(session.labels)) session.labels = [];
    if (!Array.isArray(session.modes)) session.modes = [];
    // labels line up with questions: pad for any earlier question that got no reply
    while (session.labels.length < (session.questions || []).length - 1) session.labels.push(null);
    while (session.modes.length < session.labels.length) session.modes.push(null);
    if (session.labels.length < MAX_LOGGED_QUESTIONS) session.labels.push(label);
    if (session.modes.length < MAX_LOGGED_QUESTIONS) session.modes.push(mode);
    if (mode === "try-first") {
      session.strictReleased = false;
      if (!session.strict) {
        session.strict = true;
        session.strictReason = rule.backstop ? "backstop" : "model";
      }
    } else if (session.strict) {
      session.strictReleased = true; // went back to normal help after try-first
    }
    return mode;
  }

  const TRY_FIRST_PROMPT = `

## Try-first help: label each message

Each message includes <recent_questions>: the student's recent questions to you in this assignment and the label you gave each one. Start EVERY reply with one hidden tag line that labels the student's CURRENT message, then your reply on the next line:
- [[ask]]: they want you to give them the next step, the code, or a check instead of trying something themselves. Judge the meaning in any wording: "now what", "how do I do that", "what goes next", "can you tell me how to...", "is this right?", "like that?", "show me", "say the instructions easier", "what are all the steps", a bare paste with no question.
- [[attempt]]: THIS message shows or describes something new they tried since your last reply (what they changed, what happened when they ran it, or their own plan), or it starts with the note that their files changed. Code that was already in their files does not make a message an attempt.
- [[other]]: anything else, including pasting a real error message, asking what something means or how something works, asking how to run their code, asking where to find a block, menu or button, or answering a question you asked.
Label the student's words, not their files. Examples: "how do I do that" [[ask]]; "like that?" [[ask]]; "show me" [[ask]]; "and then" [[ask]]; "NameError: name 'x' is not defined" [[other]]; "what does int() do?" [[other]]; "I added an if but it prints both times" [[attempt]]; "I think I should use a loop that adds 1 each time" [[attempt]].
Then give the kind of help <recent_questions> lists for that label. The student never sees the tag. Never mention it, the labels, the mode, or their question count.

Try-first help means: stay warm and keep helping with every question, but nudge them to try first.
- Same as always: explain what an error message means and which line it points to, explain an idea, give a short example with different names or data, point out a typo or missing punctuation, help them find a block, menu or button, and tell them how to run their work.
- For "what do I write", "next" or "show me" questions, first ask one short question back ("What do you think the next step is?" or "What did you try?") and wait for their answer. If they answer with a real attempt, even a wrong one, help as usual from there.
- Don't write the lesson's main step in their own work (their condition, their loop, their counter, their blocks). Show the pattern with different names and let them adapt it. If they ask twice for that step, give a parallel example, not their finished line. Fixing a typo or missing punctuation in a line they already wrote is still fine.
- After about three "next step" asks in a row, suggest they run what they have and see what happens, or ask them to explain their plan in one sentence.
- If they've been stuck on the same thing for three or more turns, kindly suggest their teacher, for example: "This one might be easier to sort out with your teacher. If you're in class, ask them now. If you're working at home, send them a message about where you're stuck." That's a suggestion, never a refusal. Keep helping too.
- Never mention a mode, a limit or how many questions they've asked, and never refuse. You're a coach who wants them to try first.`;

  const fullSystemPrompt = systemPrompt + TRY_FIRST_PROMPT;


  async function onButtonPress() {
    codioIDE.coachBot.write(
      `Scratch Coach v${VERSION} - Ask me questions about your Scratch project!`,
      codioIDE.coachBot.MESSAGE_ROLES.ASSISTANT
    );

    let messages = [];

    // Get initial context (the guide page); refreshed before every follow-up.
    let context = {};
    try { context = (await withTimeout(codioIDE.coachBot.getContext(), 8000, "context")) || {}; } catch (e) { context = {}; }

    let initialInput;
    while (true) {
      try {
        initialInput = await codioIDE.coachBot.input("What's your Scratch question?");
      } catch (e) {
        codioIDE.coachBot.showMenu();
        return;
      }

      if ((initialInput || "").trim().toLowerCase() === "version") {
        codioIDE.coachBot.write(`Current version: ${VERSION}`, codioIDE.coachBot.MESSAGE_ROLES.ASSISTANT);
        continue;
      }
      if (!(initialInput || "").trim()) continue; // blank message: ask again

      break;
    }

    // A first message that is just a goodbye: say bye, no ask(), no log session.
    if (isExitMessage(initialInput)) {
      codioIDE.coachBot.write("Okay, bye! Come back any time you want help.", codioIDE.coachBot.MESSAGE_ROLES.ASSISTANT);
      codioIDE.coachBot.showMenu();
      return;
    }

    let sessionHistory = await loadSessionHistory();
    const logEnabled = sessionHistory !== null;
    if (!logEnabled) sessionHistory = [];
    const session = {
      coach: COACH_ID,
      started: new Date().toISOString(),
      updated: null,
      ended: null,
      coachVersion: VERSION,
      exchanges: 0,
      questions: [],
      contextFingerprints: [],
      strict: false,
      strictReason: null,
      strictReleased: false,
      modes: [],
      labels: []
    };
    const promptFor = function() { return fullSystemPrompt; };
    sessionHistory.push(session);

    function recordTurn(question) {
      session.exchanges += 1;
      if (session.questions.length < MAX_LOGGED_QUESTIONS) {
        session.questions.push(String(question).slice(0, 300));
      }
      session.updated = new Date().toISOString();
      if (logEnabled) queueSave(sessionHistory); // fire-and-forget: never block the input loop on a log write
    }

    // The text inside <project>...</project> from the most recent build, and its fingerprint
    // from the previous turn (to tell whether the student's files changed).
    let lastFilesBlock = "";
    let lastAnsweredHash = null; // hash of the files block the last answered turn was based on
    let pendingHash = null;      // hash of this turn's files block (becomes lastAnsweredHash once answered)

    // Paths of files open in the editor (for ordering projects). Best effort.
    function openPathsOf(ctx) {
      const out = [];
      const list = (ctx && Array.isArray(ctx.files)) ? ctx.files : [];
      for (const f of list) {
        if (typeof f === "string") out.push(f);
        else if (f && typeof f.path === "string") out.push(f.path);
        else if (f && typeof f.name === "string") out.push(f.name);
      }
      return out;
    }

    // Builds the <project> + <guide> message from a FRESH read of the student's files.
    // First turn: ends with "The student says: <question>". Refresh: ends with a note
    // naming the first question, so the model doesn't treat it as the current one.
    // On a refresh where no project could be read this throws, so the caller keeps the old context.
    async function buildContextMessage(question, isRefresh, latestMessage) {
      let ctx = context;
      try {
        const fresh = await withTimeout(codioIDE.coachBot.getContext(), 8000, "context");
        if (fresh) { ctx = fresh; context = fresh; }
      } catch (e) {
        if (isRefresh) throw e; // keep the previous messages[0] (caller logs a refreshFailed entry)
      }

      let res;
      try {
        res = await getScratchProjectsText(latestMessage, openPathsOf(ctx));
      } catch (e) {
        res = { ok: false, text: "No Scratch project could be read. Ask the student to describe their sprites and scripts." };
      }
      if (isRefresh && !res.ok) throw new Error("project could not be read");
      lastFilesBlock = res.text;

      const guideContent = (ctx.guidesPage && typeof ctx.guidesPage.content === "string" && ctx.guidesPage.content.trim().length > 0)
        ? ctx.guidesPage.content.trim()
        : "No guide available.";
      const assignmentName = (ctx.assignmentData && ctx.assignmentData.name) ? ctx.assignmentData.name : null;

      const ending = isRefresh
        ? `(The student's first question in this chat was: ${question}. Their newest message is the last one below.)`
        : `The student says: ${question}`;

      return `Here are the student's Scratch project(s), unpacked into text form:
<project>
${res.text}
</project>
Here is the assignment guide:
<guide>
${guideContent}
</guide>
${recentQuestionsBlock(sessionHistory, session)}
${assignmentName ? `\nAssignment: ${assignmentName}\n` : ''}
${ending}`;
    }

    // Log this turn's fingerprint; returns true when the files block changed since the
    // last ANSWERED turn. A failed refresh logs a placeholder so entries stay aligned with questions.
    function noteContextFingerprint(refreshFailed) {
      let changed = false;
      let entry;
      if (refreshFailed) {
        pendingHash = null;
        entry = { len: null, hash: null, changed: false, refreshFailed: true };
      } else {
        const fp = fingerprint(lastFilesBlock);
        changed = lastAnsweredHash !== null && fp.hash !== lastAnsweredHash;
        pendingHash = fp.hash;
        entry = { len: fp.len, hash: fp.hash, changed: changed };
      }
      if (session.contextFingerprints.length < MAX_LOGGED_QUESTIONS) session.contextFingerprints.push(entry);
      return changed;
    }

    // Used when the context can't be built at all: no files, so the model says it can't see them.
    function fallbackContext(question) {
      lastFilesBlock = "(I couldn't read the student's files just now.)";
      return "Here are the student's Scratch project(s):\n<project>\n" + lastFilesBlock + "\n</project>\n" + recentQuestionsBlock(sessionHistory, session) + "\n\nThe student says: " + question;
    }

    // Shared reply handling for every ask(): never keep an empty assistant turn.
    function handleReply(result) {
      const raw = (result && typeof result.result === "string") ? result.result : "";
      const tagged = readModeTag(raw);
      const rule = modeRule(sessionHistory, session); // same state the context block was built from
      if (!tagged.text.trim()) {
        // An empty message in the history can make every later ask() fail too
        // (seen live: one session got 10 empty replies in a row).
        session.failedReplies = (session.failedReplies || 0) + 1;
        codioIDE.coachBot.write("Hmm, I didn't get an answer that time. Please ask again!");
        messages.pop(); // drop the user turn that got no answer
      } else {
        recordMode(session, rule, tagged.label);
        // ask() ran with stream:false, so we show the reply ourselves, without the hidden tag.
        codioIDE.coachBot.write(tagged.text, codioIDE.coachBot.MESSAGE_ROLES.ASSISTANT);
        messages.push({ role: "assistant", content: historyReply(tagged) }); // tag kept in history so the model keeps tagging
        if (pendingHash !== null) lastAnsweredHash = pendingHash; // advance only after a real answer
      }
    }

    recordTurn(initialInput);

    // Unpack the student's .sb3 project(s) into readable text
    codioIDE.coachBot.showThinkingAnimation();
    let initialUserPrompt;
    try {
      initialUserPrompt = await buildContextMessage(initialInput, false, initialInput);
    } catch (e) {
      initialUserPrompt = fallbackContext(initialInput);
    } finally {
      codioIDE.coachBot.hideThinkingAnimation();
    }
    noteContextFingerprint();

    messages.push({
      "role": "user",
      "content": initialUserPrompt
    });

    try {
      codioIDE.coachBot.showThinkingAnimation();
      const result = await codioIDE.coachBot.ask({
        systemPrompt: promptFor(),
        messages: messages
      }, { stream: false, preventMenu: true });
      handleReply(result);
    } catch (e) {
      session.failedReplies = (session.failedReplies || 0) + 1;
      codioIDE.coachBot.write("Hmm, something went wrong on my end. Try asking that again!");
      messages.pop();
    } finally {
      codioIDE.coachBot.hideThinkingAnimation();
    }

    while (true) {
      let input;
      try {
        input = await codioIDE.coachBot.input("What else can I help you with? (Type 'bye' when you're done.)");
      } catch (e) {
        break;
      }

      if ((input || "").trim().toLowerCase() === "version") {
        codioIDE.coachBot.write(`Current version: ${VERSION}`, codioIDE.coachBot.MESSAGE_ROLES.ASSISTANT);
        continue;
      }
      if (!(input || "").trim()) continue; // blank message: ignore

      if (isExitMessage(input)) {
        break;
      }

      recordTurn(input);

      try {
        codioIDE.coachBot.showThinkingAnimation();
        if (messages.length === 0) {
          // The first reply failed: this message becomes the new "first question".
          initialInput = input;
          let ctxMsg;
          try {
            ctxMsg = await buildContextMessage(input, false, input);
          } catch (e) {
            ctxMsg = fallbackContext(input);
          }
          noteContextFingerprint();
          messages.push({ role: "user", content: ctxMsg });
        } else {
          // Refresh messages[0] from the student's latest files (keep the old one on failure).
          let changed = false;
          try {
            const fresh = await buildContextMessage(initialInput, true, input);
            messages[0] = { role: "user", content: fresh };
            changed = noteContextFingerprint();
          } catch (e) { changed = false; noteContextFingerprint(true); }
          messages.push({
            role: "user",
            content: changed ? "(Note: the student's files have changed since your last reply.)\n\n" + input : input
          });
        }

        const result = await codioIDE.coachBot.ask({
          systemPrompt: promptFor(),
          messages: messages
        }, { stream: false, preventMenu: true });
        handleReply(result);
      } catch (e) {
        session.failedReplies = (session.failedReplies || 0) + 1;
        codioIDE.coachBot.write("Hmm, something went wrong on my end. Try asking that again!");
        messages.pop();
        continue;
      } finally {
        codioIDE.coachBot.hideThinkingAnimation();
      }

      // Keep first message (with project + guide) + last 8 messages (4 exchanges)
      while (messages.length > 9) {
        messages.splice(1, 2); // drop the oldest assistant+user pair, keep messages[0] (context) intact
      }
    }

    session.ended = new Date().toISOString();
    if (logEnabled) await queueSave(sessionHistory); // flush queued writes (safe to await: no input follows)

    codioIDE.coachBot.write("Okay, bye! Come back any time you want help.", codioIDE.coachBot.MESSAGE_ROLES.ASSISTANT);
    codioIDE.coachBot.showMenu();
  }

  // Exposed for the Node test harness in test/ — unused inside Codio.
  window.__scratchCoachTest = { toBytes, extractProjectJson, renderProject, collectProjectPaths, isExitMessage, readModeTag, orderProjectPaths, getScratchProjectsText, systemPrompt };

})(window.codioIDE, window);
