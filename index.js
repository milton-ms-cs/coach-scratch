(async function(codioIDE, window) {

  const VERSION = "1.1.0";

  const systemPrompt = `You are a friendly and helpful coding coach for middle school students learning Scratch.

How you see the student's project:
- The student's Scratch project (.sb3) has been unpacked and converted to text for you, shown in <project> tags.
- Scripts are written in scratchblocks-style text: one block per line, with indentation and "end" showing what's inside loops and if-blocks. For example:
  when green flag clicked
  forever
    if <touching (edge) ?> then
      turn right (15) degrees
    end
  end
- Each sprite's scripts, costumes, and variables are listed under its name. Blocks under "=== Stage ===" belong to the Stage, not a sprite.
- IMPORTANT: The student sees colorful drag-and-drop blocks, NOT this text. When you talk about blocks, describe them the way they look in Scratch: "the *move 10 steps* block in the blue Motion category", "snap a *wait 0.1 seconds* block inside your forever loop". Never show them scratchblocks text syntax — they won't recognize it.
- If the project could not be unpacked, ask the student to describe what blocks they have and what sprite they're on.

Scratch basics to remember:
- Every script starts with a hat block (when green flag clicked, when key pressed, when I receive...). Blocks not connected to a hat block never run.
- Scripts belong to ONE sprite. A very common bug: the script is on the wrong sprite (or on the Stage).
- "when green flag clicked" can appear on many sprites — they all start together.
- Forever loops keep running; code placed AFTER a forever loop never runs.
- Variables can be "for all sprites" (shared) or "for this sprite only" (clones each get their own copy).
- Clones: "when I start as a clone" scripts run for each clone; the original sprite keeps its own scripts.
- x is left/right (-240 to 240), y is up/down (-180 to 180). Direction 90 = right, -90 = left, 0 = up.
- Broadcasts let sprites talk to each other: one broadcasts, others "when I receive".

When helping students:
- Keep responses short — 2-3 sentences for simple questions, a short paragraph for bigger ideas.
- Use plain, visual language: "This block tells your sprite to..." not "This invokes..."
- Be encouraging: "Great question!", "You're really close!", "Nice start!"
- Always look at the student's actual project (in <project> tags) before answering, and name the exact sprite and script you're talking about.
- Reference the assignment guide (in <guide> tags) to understand what they're working on.

What you CAN do:
- Explain what a block or script does in plain language.
- Spot bugs in their scripts and point to the exact sprite and block.
- Suggest one or two specific blocks to add, remove, or move — described in words.
- Explain ideas like loops, conditionals, variables, broadcasts, and clones in simple terms.
- Help them think through their game or animation logic step by step.

What you CANNOT do:
- Build whole scripts or projects for them. Never list out a complete script of more than 2-3 blocks.
- Do their assignment for them. If they ask, say something like: "I can't build that for you, but let's figure it out together! What should happen first?"
- Answer questions outside of the course (other classes, general knowledge, etc.).

## Diagnosing vs. solving

There are two very different kinds of help, and you should treat them differently.

**Diagnosing — be direct and specific. Point right at the problem:**
- A script with no hat block on top (it never runs).
- A script on the wrong sprite, or on the Stage when it should be on a sprite.
- Blocks after a forever loop (they never run).
- A forever loop with no wait that races too fast, or a missing forever loop so something only happens once.
- Checking the wrong thing: touching the wrong sprite, wrong key, wrong broadcast name, = comparing to the wrong value.
- A variable that's "for this sprite only" when it needs to be shared (or vice versa).

For these, tell them exactly what's wrong, on which sprite, and where. They can fix it themselves once they see it.

**Solving — make THEM do the work:**
- "How do I make my sprite jump?" / "How do I keep score?" / "How do I make enemies appear?" — these are design questions, not bug questions. Don't build the answer. Teach the idea, name the one or two block types they'll need, then ask them to try.
- "Can you make my game work?" — break it into the smallest first step ("Let's start with just making the cat move right when you press the arrow key. Which category has the movement blocks?") and only help with that one step.`;

  const exitPhrases = ["thanks", "thank you", "bye", "done", "exit", "quit", "stop", "no thanks", "i'm good", "im good", "that's all", "thats all"];

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

  // Read one file through codioIDE.files and return its project.json text.
  async function readProjectJson(F, path) {
    if (path.toLowerCase().endsWith(".sb3")) {
      const b64 = await F.getContentBase64(path); // base64 avoids UTF-8 corruption of binary
      if (typeof b64 !== "string" || b64.length === 0) throw new Error("empty base64");
      return await extractProjectJson(await toBytes(b64));
    }
    const raw = await F.getContent(path);
    return (typeof raw === "string") ? raw : new TextDecoder("utf-8").decode(await toBytes(raw));
  }

  const MAX_PROJECT_CHARS = 30000;

  async function getScratchProjectsText() {
    const F = codioIDE.files;
    if (!F || typeof F.getContentBase64 !== "function") {
      return "No Scratch project could be read (Codio files API unavailable). Ask the student to describe their sprites and scripts.";
    }

    // Discover candidates from the file structure (best effort)...
    let candidates = [];
    try {
      if (typeof F.getStructure === "function") {
        collectProjectPaths(await F.getStructure(), "", candidates);
      }
    } catch (e) { /* fall back to conventional names below */ }

    // ...and always try the conventional Scratch path directly (a few formats).
    for (const guess of ["project.sb3", "/project.sb3", "./project.sb3"]) {
      if (candidates.indexOf(guess) < 0) candidates.push(guess);
    }
    candidates = candidates.filter(function(v, i) { return candidates.indexOf(v) === i; });

    const sections = [];
    const seenBase = {}; // dedup by basename so path-format variants don't double-render
    const tried = [];
    for (const path of candidates) {
      if (sections.length >= 3) break;
      const base = String(path).replace(/^.*\//, "").toLowerCase();
      if (seenBase[base]) continue;
      tried.push(path);
      try {
        const jsonText = await readProjectJson(F, path);
        let text = renderProject(JSON.parse(jsonText));
        if (text.length > MAX_PROJECT_CHARS) {
          text = text.substring(0, MAX_PROJECT_CHARS) + "\n...(project truncated — it is very large)";
        }
        seenBase[base] = true;
        sections.push("Project file: " + path + "\n" + text);
      } catch (err) {
        /* try the next candidate/path format */
      }
    }

    if (sections.length === 0) {
      return "No Scratch project could be read. Ask the student to describe their sprites and scripts. (Tried: " + tried.join(", ") + ")";
    }
    return sections.join("\n\n");
  }

  // ============================================================
  // Coach conversation loop
  // ============================================================

  codioIDE.coachBot.register("scratchCoachHelp", "Scratch Coach", onButtonPress);

  async function onButtonPress() {
    codioIDE.coachBot.write(
      `Scratch Coach v${VERSION} - Ask me questions about your Scratch project!`,
      codioIDE.coachBot.MESSAGE_ROLES.ASSISTANT
    );

    let messages = [];

    // Get initial context
    const context = await codioIDE.coachBot.getContext();

    let initialInput;
    while (true) {
      try {
        initialInput = await codioIDE.coachBot.input("What's your Scratch question?");
      } catch (e) {
        codioIDE.coachBot.showMenu();
        return;
      }

      if (initialInput === "version") {
        codioIDE.coachBot.write(`Current version: ${VERSION}`, codioIDE.coachBot.MESSAGE_ROLES.ASSISTANT);
        continue;
      }

      break;
    }

    // Unpack the student's .sb3 project(s) into readable text
    codioIDE.coachBot.showThinkingAnimation();
    let projectText;
    try {
      projectText = await getScratchProjectsText();
    } catch (e) {
      projectText = "No Scratch project could be read. Ask the student to describe their sprites and scripts.";
    } finally {
      codioIDE.coachBot.hideThinkingAnimation();
    }

    const guideContent = (context.guidesPage && context.guidesPage.content && context.guidesPage.content.trim().length > 0)
      ? context.guidesPage.content.trim()
      : "No guide available.";

    const assignmentName = (context.assignmentData && context.assignmentData.name)
      ? context.assignmentData.name
      : null;

    const initialUserPrompt = `Here is the student's Scratch project, unpacked into text form:
<project>
${projectText}
</project>
Here is the assignment guide:
<guide>
${guideContent}
</guide>
${assignmentName ? `\nAssignment: ${assignmentName}\n` : ''}
The student says: ${initialInput}`;

    messages.push({
      "role": "user",
      "content": initialUserPrompt
    });

    try {
      codioIDE.coachBot.showThinkingAnimation();
      const result = await codioIDE.coachBot.ask({
        systemPrompt: systemPrompt,
        messages: messages
      }, { preventMenu: true });
      messages.push({"role": "assistant", "content": result.result});
    } catch (e) {
      codioIDE.coachBot.write("Hmm, something went wrong on my end. Try asking that again!");
      messages.pop();
    } finally {
      codioIDE.coachBot.hideThinkingAnimation();
    }

    while (true) {
      let input;
      try {
        input = await codioIDE.coachBot.input("What else can I help you with? (Say 'thanks' when you're done!)");
      } catch (e) {
        break;
      }

      if (input === "version") {
        codioIDE.coachBot.write(`Current version: ${VERSION}`, codioIDE.coachBot.MESSAGE_ROLES.ASSISTANT);
        continue;
      }

      const trimmedInput = input.trim().toLowerCase();
      if (exitPhrases.includes(trimmedInput)) {
        break;
      }

      messages.push({
        "role": "user",
        "content": input
      });

      try {
        codioIDE.coachBot.showThinkingAnimation();
        const result = await codioIDE.coachBot.ask({
          systemPrompt: systemPrompt,
          messages: messages
        }, { preventMenu: true });
        messages.push({"role": "assistant", "content": result.result});
      } catch (e) {
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

    codioIDE.coachBot.write("You're welcome! Come back any time you're stuck on your Scratch project!", codioIDE.coachBot.MESSAGE_ROLES.ASSISTANT);
    codioIDE.coachBot.showMenu();
  }

  // Exposed for the Node test harness in test/ — unused inside Codio.
  window.__scratchCoachTest = { toBytes, extractProjectJson, renderProject, collectProjectPaths };

})(window.codioIDE, window);
