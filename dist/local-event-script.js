// src/runtime/registry.ts
var CommandRegistry = class {
  commands = /* @__PURE__ */ new Map();
  register(def) {
    if (this.commands.has(def.name)) {
      console.warn(
        `[LES] Duplicate command "${def.name}" \u2014 previous definition overwritten.`,
        def.element
      );
    }
    this.commands.set(def.name, def);
  }
  get(name) {
    return this.commands.get(name);
  }
  has(name) {
    return this.commands.has(name);
  }
  names() {
    return Array.from(this.commands.keys());
  }
};

// src/modules/types.ts
var ModuleRegistry = class {
  primitives = /* @__PURE__ */ new Map();
  loadedModules = [];
  register(module) {
    for (const [name, fn] of Object.entries(module.primitives)) {
      this.primitives.set(name, fn);
    }
    this.loadedModules.push(module.name);
    console.log(`[LES] module loaded: "${module.name}"`, Object.keys(module.primitives));
  }
  get(primitive) {
    return this.primitives.get(primitive);
  }
  has(primitive) {
    return this.primitives.has(primitive);
  }
  /** Dev-mode help: which module exports a given primitive? */
  hintFor(primitive) {
    return `Primitive "${primitive}" not found. Loaded modules: [${this.loadedModules.join(", ")}]. Did you forget <use-module type="animation">?`;
  }
};

// src/parser/stripBody.ts
function stripBody(raw) {
  let s = raw.trim();
  if (s.startsWith("`") && s.endsWith("`")) {
    s = s.slice(1, -1);
  }
  const lines = s.split("\n");
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length === 0) return "";
  if (lines.length === 1) return s.trim();
  const minIndent = nonEmpty.reduce((min, line) => {
    const leading = line.match(/^(\s*)/)?.[1]?.length ?? 0;
    return Math.min(min, leading);
  }, Infinity);
  const stripped = minIndent === 0 || minIndent === Infinity ? lines : lines.map((line) => line.length >= minIndent ? line.slice(minIndent) : line.trimStart());
  let start = 0;
  let end = stripped.length - 1;
  while (start <= end && stripped[start]?.trim() === "") start++;
  while (end >= start && stripped[end]?.trim() === "") end--;
  return stripped.slice(start, end + 1).join("\n");
}

// src/parser/reader.ts
var HANDLERS = {
  "use-module"(el, config) {
    const type = el.getAttribute("type")?.trim() ?? null;
    const src = el.getAttribute("src")?.trim() ?? null;
    if (!type && !src) {
      console.warn("[LES] <use-module> has neither type= nor src= \u2014 ignored.", el);
      return;
    }
    config.modules.push({ type, src, element: el });
  },
  "local-command"(el, config) {
    const name = el.getAttribute("name")?.trim() ?? "";
    const body = el.getAttribute("do")?.trim() ?? "";
    if (!name) {
      console.warn("[LES] <local-command> missing required name= attribute \u2014 ignored.", el);
      return;
    }
    if (!body) {
      console.warn(`[LES] <local-command name="${name}"> missing required do= attribute \u2014 ignored.`, el);
      return;
    }
    config.commands.push({
      name,
      argsRaw: el.getAttribute("args")?.trim() ?? "",
      guard: el.getAttribute("guard")?.trim() ?? null,
      body: stripBody(body),
      element: el
    });
  },
  "on-event"(el, config) {
    const name = el.getAttribute("name")?.trim() ?? "";
    const body = el.getAttribute("handle")?.trim() ?? "";
    if (!name) {
      console.warn("[LES] <on-event> missing required name= attribute \u2014 ignored.", el);
      return;
    }
    if (!body) {
      console.warn(`[LES] <on-event name="${name}"> missing required handle= attribute \u2014 ignored.`, el);
      return;
    }
    config.onEvent.push({ name, body: stripBody(body), element: el });
  },
  "on-signal"(el, config) {
    const name = el.getAttribute("name")?.trim() ?? "";
    const body = el.getAttribute("handle")?.trim() ?? "";
    if (!name) {
      console.warn("[LES] <on-signal> missing required name= attribute \u2014 ignored.", el);
      return;
    }
    if (!body) {
      console.warn(`[LES] <on-signal name="${name}"> missing required handle= attribute \u2014 ignored.`, el);
      return;
    }
    config.onSignal.push({
      name,
      when: el.getAttribute("when")?.trim() ?? null,
      body: stripBody(body),
      element: el
    });
  },
  "on-load"(el, config) {
    const body = el.getAttribute("run")?.trim() ?? "";
    if (!body) {
      console.warn("[LES] <on-load> missing required run= attribute \u2014 ignored.", el);
      return;
    }
    config.onLoad.push({ body: stripBody(body), element: el });
  },
  "on-enter"(el, config) {
    const body = el.getAttribute("run")?.trim() ?? "";
    if (!body) {
      console.warn("[LES] <on-enter> missing required run= attribute \u2014 ignored.", el);
      return;
    }
    config.onEnter.push({
      when: el.getAttribute("when")?.trim() ?? null,
      body: stripBody(body),
      element: el
    });
  },
  "on-exit"(el, config) {
    const body = el.getAttribute("run")?.trim() ?? "";
    if (!body) {
      console.warn("[LES] <on-exit> missing required run= attribute \u2014 ignored.", el);
      return;
    }
    config.onExit.push({ body: stripBody(body), element: el });
  }
};
function readConfig(host) {
  const config = {
    id: host.id || "(no id)",
    modules: [],
    commands: [],
    onEvent: [],
    onSignal: [],
    onLoad: [],
    onEnter: [],
    onExit: [],
    unknown: []
  };
  for (const child of Array.from(host.children)) {
    const tag = child.tagName.toLowerCase();
    const handler = HANDLERS[tag];
    if (handler) {
      handler(child, config);
    } else {
      config.unknown.push(child);
      console.warn(
        `[LES] Unknown child element <${tag}> inside <local-event-script id="${config.id}"> \u2014 ignored.`,
        child
      );
    }
  }
  return config;
}
function logConfig(config) {
  const id = config.id;
  console.log(`[LES] config read for #${id}`);
  console.log(`[LES]   modules:   ${config.modules.length}`, config.modules.map((m) => m.type ?? m.src));
  console.log(`[LES]   commands:  ${config.commands.length}`, config.commands.map((c) => c.name));
  console.log(`[LES]   on-event:  ${config.onEvent.length}`, config.onEvent.map((e) => e.name));
  console.log(`[LES]   on-signal: ${config.onSignal.length}`, config.onSignal.map((s) => s.name));
  console.log(`[LES]   on-load:   ${config.onLoad.length}`);
  console.log(`[LES]   on-enter:  ${config.onEnter.length}`, config.onEnter.map((e) => e.when ?? "always"));
  console.log(`[LES]   on-exit:   ${config.onExit.length}`);
  if (config.unknown.length > 0) {
    console.warn(`[LES]   unknown children: ${config.unknown.length}`, config.unknown.map((e) => e.tagName.toLowerCase()));
  }
  if (config.commands.length > 0) {
    const first = config.commands[0];
    if (first) {
      console.log(`[LES]   first command body preview ("${first.name}"):`);
      const preview = first.body.split("\n").slice(0, 4).join("\n  ");
      console.log(`[LES]   | ${preview}`);
    }
  }
}

// src/parser/tokenizer.ts
function tokenize(source) {
  const tokens = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const raw = (lines[i] ?? "").replace(/\t/g, "  ");
    const text = raw.trim();
    if (text.length === 0) continue;
    const indent = raw.length - raw.trimStart().length;
    tokens.push({
      indent,
      text,
      lineNum: i + 1
    });
  }
  return tokens;
}
function endsWithAnd(text) {
  return /\band$/.test(text);
}
function stripTrailingAnd(text) {
  return text.replace(/\s+and$/, "").trimEnd();
}
var BLOCK_TERMINATORS = /* @__PURE__ */ new Set(["/match", "/try"]);
var TRY_CLAUSE_KEYWORDS = /* @__PURE__ */ new Set(["rescue", "afterwards"]);

// src/parser/parser.ts
var ANIMATION_PRIMITIVES = /* @__PURE__ */ new Set([
  "fade-in",
  "fade-out",
  "slide-in",
  "slide-out",
  "slide-up",
  "slide-down",
  "pulse",
  "stagger-enter",
  "stagger-exit"
]);
var LESParser = class {
  constructor(tokens) {
    this.tokens = tokens;
  }
  pos = 0;
  peek(offset = 0) {
    return this.tokens[this.pos + offset];
  }
  advance() {
    const t = this.tokens[this.pos];
    if (!t) throw new LESParseError("Unexpected end of input", void 0);
    this.pos++;
    return t;
  }
  atEnd() {
    return this.pos >= this.tokens.length;
  }
  tryConsume(text) {
    const t = this.peek();
    if (t?.text === text) {
      this.pos++;
      return true;
    }
    return false;
  }
  // ─── Entry point ───────────────────────────────────────────────────────────
  parse() {
    const node = this.parseBlock(-1);
    return node;
  }
  // ─── Block parser ──────────────────────────────────────────────────────────
  /**
   * Parses all statements at indent > baseIndent.
   *
   * Stops when it encounters:
   *   - A token with indent <= baseIndent
   *   - A block terminator (/match, /try) — left for the parent to consume
   *   - A try-clause keyword (rescue, afterwards) at indent <= baseIndent
   *   - End of token stream
   *
   * Returns a SequenceNode if multiple steps, otherwise the single node.
   */
  parseBlock(baseIndent) {
    const steps = [];
    while (!this.atEnd()) {
      const t = this.peek();
      if (t.indent <= baseIndent) break;
      if (BLOCK_TERMINATORS.has(t.text)) break;
      if (TRY_CLAUSE_KEYWORDS.has(t.text) && t.indent <= baseIndent + 2) break;
      if (t.text === "then") {
        const thenIndent = t.indent;
        this.advance();
        const next = this.peek();
        if (next && next.indent > thenIndent) {
          const step = this.parseBlock(thenIndent);
          steps.push(step);
        }
        continue;
      }
      if (t.text.startsWith("then ")) {
        this.advance();
        const rest = t.text.slice(5).trim();
        const step = this.parseSingleLine(rest, t.indent, t);
        steps.push(step);
        continue;
      }
      const stmt = this.parseStatementOrParallel(t.indent);
      steps.push(stmt);
    }
    return toSequenceOrSingle(steps);
  }
  // ─── Parallel group ────────────────────────────────────────────────────────
  /**
   * Parses one statement or a group of parallel statements connected by `and`.
   *
   * Lines ending with a standalone `and` indicate that the next line runs
   * concurrently. All parallel branches are wrapped in a ParallelNode.
   *
   * `and`-groups only apply within the same indent level. A deeper-indented
   * line after `and` is an error (would indicate a block, but `and` is
   * a line-level connector, not a block opener).
   */
  parseStatementOrParallel(blockIndent) {
    const branches = [];
    while (!this.atEnd()) {
      const t = this.peek();
      if (t.indent < blockIndent) break;
      if (t.indent > blockIndent) break;
      if (BLOCK_TERMINATORS.has(t.text)) break;
      if (TRY_CLAUSE_KEYWORDS.has(t.text)) break;
      if (t.text === "then" || t.text.startsWith("then ")) break;
      const hasAnd = endsWithAnd(t.text);
      const lineText = hasAnd ? stripTrailingAnd(t.text) : t.text;
      this.advance();
      const stmt = this.parseSingleLine(lineText, t.indent, t);
      branches.push(stmt);
      if (!hasAnd) break;
    }
    if (branches.length === 0) return expr("");
    if (branches.length === 1) return branches[0];
    return { type: "parallel", branches };
  }
  // ─── Single-line dispatch ──────────────────────────────────────────────────
  /**
   * Parses a single statement from its text content.
   * The text has already had `then ` prefix and trailing ` and` stripped.
   *
   * Dispatch order matters: more specific patterns must come before general ones.
   */
  parseSingleLine(text, indent, token) {
    const first = firstWord(text);
    if (first === "match") return this.parseMatch(text, indent, token);
    if (first === "try") return this.parseTry(indent, token);
    if (first === "set") return this.parseSet(text, token);
    if (first === "emit") return this.parseEmit(text, token);
    if (first === "broadcast") return this.parseBroadcast(text, token);
    if (first === "call") return this.parseCall(text, token);
    if (first === "wait") return this.parseWait(text, token);
    if (text.includes(" <- ")) return this.parseBind(text, token);
    if (ANIMATION_PRIMITIVES.has(first)) return this.parseAnimation(text, token);
    console.warn(`[LES:parser] Unknown statement: ${JSON.stringify(text)}`, token);
    return expr(text);
  }
  // ─── Match block ───────────────────────────────────────────────────────────
  parseMatch(text, indent, token) {
    const subjectRaw = text.slice("match".length).trim();
    const subject = expr(subjectRaw);
    const arms = [];
    while (!this.atEnd()) {
      const t = this.peek();
      if (t.text === "/match") {
        this.advance();
        break;
      }
      if (t.indent <= indent) {
        console.warn(`[LES:parser] Unclosed match block \u2014 missing /match`, token);
        break;
      }
      if (t.text.startsWith("[")) {
        arms.push(this.parseMatchArm(t.indent, t));
        continue;
      }
      console.warn(`[LES:parser] Unexpected token inside match block: ${JSON.stringify(t.text)}`, t);
      this.advance();
    }
    return { type: "match", subject, arms };
  }
  parseMatchArm(armIndent, token) {
    const t = this.advance();
    const arrowIdx = t.text.indexOf(" ->");
    if (arrowIdx === -1) {
      console.warn(`[LES:parser] Match arm missing '->': ${JSON.stringify(t.text)}`, t);
      return { patterns: [{ kind: "wildcard" }], body: expr("") };
    }
    const patternRaw = t.text.slice(0, arrowIdx).trim();
    const afterArrow = t.text.slice(arrowIdx + 3).trim();
    const patterns = parsePatterns(patternRaw);
    let body;
    if (afterArrow.length > 0) {
      body = this.parseSingleLine(afterArrow, armIndent, token);
    } else {
      body = this.parseBlock(armIndent);
    }
    return { patterns, body };
  }
  // ─── Try block ─────────────────────────────────────────────────────────────
  parseTry(indent, token) {
    const body = this.parseBlock(indent);
    let rescue = void 0;
    let afterwards = void 0;
    if (this.peek()?.text === "rescue" && this.peek()?.indent === indent) {
      this.advance();
      rescue = this.parseBlock(indent);
    }
    if (this.peek()?.text === "afterwards" && this.peek()?.indent === indent) {
      this.advance();
      afterwards = this.parseBlock(indent);
    }
    if (this.peek()?.text === "/try") {
      this.advance();
    } else {
      console.warn(`[LES:parser] Unclosed try block \u2014 missing /try`, token);
    }
    const tryNode = { type: "try", body };
    if (rescue !== void 0) tryNode.rescue = rescue;
    if (afterwards !== void 0) tryNode.afterwards = afterwards;
    return tryNode;
  }
  // ─── Simple statement parsers ──────────────────────────────────────────────
  parseSet(text, token) {
    const m = text.match(/^set\s+\$(\w+)\s+to\s+(.+)$/);
    if (!m) {
      console.warn(`[LES:parser] Malformed set statement: ${JSON.stringify(text)}`, token);
      return { type: "set", signal: "??", value: expr(text) };
    }
    return {
      type: "set",
      signal: m[1],
      value: expr(m[2].trim())
    };
  }
  parseEmit(text, token) {
    const { name, payload } = parseEventLine(text.slice("emit".length).trim(), token);
    return { type: "emit", event: name, payload };
  }
  parseBroadcast(text, token) {
    const { name, payload } = parseEventLine(text.slice("broadcast".length).trim(), token);
    return { type: "broadcast", event: name, payload };
  }
  parseCall(text, token) {
    const m = text.match(/^call\s+([^\s\[]+)\s*(?:\[(.+)\])?$/);
    if (!m) {
      console.warn(`[LES:parser] Malformed call statement: ${JSON.stringify(text)}`, token);
      return { type: "call", command: "??", args: {} };
    }
    return {
      type: "call",
      command: m[1],
      args: parseArgList(m[2] ?? "")
    };
  }
  parseWait(text, token) {
    const m = text.match(/^wait\s+(.+?)ms$/);
    if (!m) {
      console.warn(`[LES:parser] Malformed wait statement: ${JSON.stringify(text)}`, token);
      return { type: "wait", ms: 0 };
    }
    const msExpr = m[1].trim();
    const literal = Number(msExpr);
    if (!Number.isNaN(literal)) return { type: "wait", ms: literal };
    return { type: "wait", ms: 0 };
  }
  parseBind(text, token) {
    const m = text.match(/^(\w+)\s+<-\s+@(\w+)\s+'([^']+)'\s*(?:\[(.+)\])?$/);
    if (!m) {
      console.warn(`[LES:parser] Malformed bind statement: ${JSON.stringify(text)}`, token);
      return {
        type: "bind",
        name: "??",
        action: { type: "action", verb: "get", url: "", args: {} }
      };
    }
    const action = {
      type: "action",
      verb: m[2].toLowerCase(),
      url: m[3],
      args: parseArgList(m[4] ?? "")
    };
    return { type: "bind", name: m[1], action };
  }
  parseAnimation(text, token) {
    const parts = splitAnimationLine(text);
    const primitive = parts[0] ?? "";
    const selector = parts[1] ?? "";
    const durationStr = parts[2] ?? "0ms";
    const easing = parts[3] ?? "ease";
    const optionsStr = parts[4] ?? "";
    const durationMs = parseInt(durationStr, 10);
    return {
      type: "animation",
      primitive,
      selector,
      duration: Number.isNaN(durationMs) ? 0 : durationMs,
      easing,
      options: parseAnimationOptions(optionsStr)
    };
  }
};
function parsePatterns(raw) {
  const inner = raw.replace(/^\[|\]$/g, "").trim();
  if (inner.includes(" | ") || inner.includes("|")) {
    const alternatives = inner.split(/\s*\|\s*/).map((p) => parseSinglePattern(p.trim()));
    return [{ kind: "or", patterns: alternatives }];
  }
  return inner.trim().split(/\s{2,}|\s(?=\S)/).filter((s) => s.trim()).map((p) => parseSinglePattern(p.trim()));
}
function parseSinglePattern(s) {
  if (s === "_") return { kind: "wildcard" };
  if (s === "nil") return { kind: "literal", value: null };
  if (s.startsWith("'") && s.endsWith("'")) {
    return { kind: "literal", value: s.slice(1, -1) };
  }
  const n = Number(s);
  if (!Number.isNaN(n)) return { kind: "literal", value: n };
  if (s === "true") return { kind: "literal", value: true };
  if (s === "false") return { kind: "literal", value: false };
  return { kind: "binding", name: s };
}
function parseArgList(raw) {
  if (!raw.trim()) return {};
  const result = {};
  const pairs = raw.trim().split(/(?<=\S)\s{2,}(?=\w)/);
  for (const pair of pairs) {
    const colonIdx = pair.indexOf(":");
    if (colonIdx === -1) continue;
    const key = pair.slice(0, colonIdx).trim();
    const value = pair.slice(colonIdx + 1).trim();
    if (key) result[key] = expr(value);
  }
  return result;
}
function parseEventLine(raw, token) {
  const bracketIdx = raw.indexOf("[");
  if (bracketIdx === -1) {
    return { name: raw.trim(), payload: [] };
  }
  const name = raw.slice(0, bracketIdx).trim();
  const payloadRaw = raw.slice(bracketIdx + 1, raw.lastIndexOf("]")).trim();
  const payload = payloadRaw ? payloadRaw.split(/,\s*|\s{2,}/).map((s) => expr(s.trim())).filter((e) => e.raw) : [];
  return { name, payload };
}
function splitAnimationLine(text) {
  const parts = [];
  let current = "";
  let inBracket = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "[") {
      inBracket++;
      current += ch;
    } else if (ch === "]") {
      inBracket--;
      current += ch;
    } else if (ch === " " && inBracket === 0) {
      if (current.trim()) parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}
function parseAnimationOptions(raw) {
  if (!raw.trim()) return {};
  const inner = raw.replace(/^\[|\]$/g, "").trim();
  return parseArgList(inner);
}
function expr(raw) {
  return { type: "expr", raw };
}
function firstWord(text) {
  return text.split(/\s+/)[0] ?? "";
}
function toSequenceOrSingle(steps) {
  if (steps.length === 0) return expr("");
  if (steps.length === 1) return steps[0];
  return { type: "sequence", steps };
}
var LESParseError = class extends Error {
  constructor(message, token) {
    const loc = token ? ` (line ${token.lineNum}: ${JSON.stringify(token.text)})` : "";
    super(`[LES:parser] ${message}${loc}`);
    this.token = token;
    this.name = "LESParseError";
  }
};

// src/parser/index.ts
function parseLES(raw) {
  const stripped = stripBody(raw);
  const tokens = tokenize(stripped);
  const parser = new LESParser(tokens);
  return parser.parse();
}

// src/elements/LocalEventScript.ts
var LocalEventScript = class extends HTMLElement {
  // ─── Public registries (other elements attach to these) ───────────────────
  commands = new CommandRegistry();
  modules = new ModuleRegistry();
  // ─── Phase 1: raw config ──────────────────────────────────────────────────
  _config = null;
  get config() {
    return this._config;
  }
  // ─── Phase 2: parsed ASTs ─────────────────────────────────────────────────
  _parsedCommands = [];
  _parsedHandlers = [];
  _parsedWatchers = [];
  _parsedLifecycle = {
    onLoad: [],
    onEnter: [],
    onExit: []
  };
  /** Inspect parsed ASTs in DevTools: $0.parsed */
  get parsed() {
    return {
      commands: this._parsedCommands,
      handlers: this._parsedHandlers,
      watchers: this._parsedWatchers,
      lifecycle: this._parsedLifecycle
    };
  }
  // ─── Datastar bridge (populated in Phase 6) ───────────────────────────────
  _dsEffect = void 0;
  _dsSignal = void 0;
  static get observedAttributes() {
    return [];
  }
  connectedCallback() {
    queueMicrotask(() => this._init());
  }
  disconnectedCallback() {
    this._teardown();
  }
  // ─── Internal lifecycle ───────────────────────────────────────────────────
  _init() {
    console.log("[LES] <local-event-script> initializing", this.id || "(no id)");
    this._config = readConfig(this);
    logConfig(this._config);
    this._parseAll(this._config);
  }
  _teardown() {
    console.log("[LES] <local-event-script> disconnected", this.id || "(no id)");
    this._config = null;
    this._parsedCommands = [];
    this._parsedHandlers = [];
    this._parsedWatchers = [];
  }
  // ─── Phase 2: parse all body strings ─────────────────────────────────────
  _parseAll(config) {
    let ok = 0;
    let fail = 0;
    this._parsedCommands = config.commands.map((decl) => {
      try {
        const body = parseLES(decl.body);
        ok++;
        return { name: decl.name, guard: decl.guard, argsRaw: decl.argsRaw, body };
      } catch (e) {
        fail++;
        console.error(`[LES] Parse error in command "${decl.name}":`, e);
        return { name: decl.name, guard: decl.guard, argsRaw: decl.argsRaw, body: { type: "expr", raw: "" } };
      }
    });
    this._parsedHandlers = config.onEvent.map((decl) => {
      try {
        const body = parseLES(decl.body);
        ok++;
        return { event: decl.name, body };
      } catch (e) {
        fail++;
        console.error(`[LES] Parse error in on-event "${decl.name}":`, e);
        return { event: decl.name, body: { type: "expr", raw: "" } };
      }
    });
    this._parsedWatchers = config.onSignal.map((decl) => {
      try {
        const body = parseLES(decl.body);
        ok++;
        return { signal: decl.name, when: decl.when, body };
      } catch (e) {
        fail++;
        console.error(`[LES] Parse error in on-signal "${decl.name}":`, e);
        return { signal: decl.name, when: decl.when, body: { type: "expr", raw: "" } };
      }
    });
    this._parsedLifecycle = {
      onLoad: config.onLoad.map((d) => {
        try {
          ok++;
          return parseLES(d.body);
        } catch {
          fail++;
          return { type: "expr", raw: "" };
        }
      }),
      onEnter: config.onEnter.map((d) => {
        try {
          ok++;
          return { when: d.when, body: parseLES(d.body) };
        } catch {
          fail++;
          return { when: d.when, body: { type: "expr", raw: "" } };
        }
      }),
      onExit: config.onExit.map((d) => {
        try {
          ok++;
          return parseLES(d.body);
        } catch {
          fail++;
          return { type: "expr", raw: "" };
        }
      })
    };
    const total = ok + fail;
    console.log(`[LES] parser: ${ok}/${total} bodies parsed successfully${fail > 0 ? ` (${fail} errors)` : ""}`);
    const fetchCmd = this._parsedCommands.find((c) => c.name === "feed:fetch");
    if (fetchCmd) {
      console.log("[LES] AST preview (feed:fetch):", JSON.stringify(fetchCmd.body, null, 2).slice(0, 800) + "\u2026");
    }
  }
  // ─── Datastar bridge (Phase 6) ────────────────────────────────────────────
  connectDatastar(fns) {
    this._dsEffect = fns.effect;
    this._dsSignal = fns.signal;
    console.log("[LES] Datastar bridge connected", this.id);
  }
  disconnectDatastar() {
    this._dsEffect = void 0;
    this._dsSignal = void 0;
  }
  get dsEffect() {
    return this._dsEffect;
  }
  get dsSignal() {
    return this._dsSignal;
  }
};
customElements.define("local-event-script", LocalEventScript);

// src/elements/LocalCommand.ts
var LocalCommand = class extends HTMLElement {
  // ─── Attribute accessors (typed, trimmed) ─────────────────────────────────
  get commandName() {
    return this.getAttribute("name")?.trim() ?? "";
  }
  /** Raw args string e.g. "[from:str  to:str]" — parsed by Phase 2 */
  get argsRaw() {
    return this.getAttribute("args")?.trim() ?? "";
  }
  /** Guard expression string — evaluated by runtime before execution */
  get guardExpr() {
    return this.getAttribute("guard")?.trim() ?? null;
  }
  /** Raw LES body — may be backtick-wrapped for multi-line */
  get doBody() {
    return this.getAttribute("do")?.trim() ?? "";
  }
  connectedCallback() {
    console.log("[LES] <local-command> registered:", this.commandName || "(unnamed)");
  }
};
customElements.define("local-command", LocalCommand);

// src/elements/OnEvent.ts
var OnEvent = class extends HTMLElement {
  get eventName() {
    return this.getAttribute("name")?.trim() ?? "";
  }
  /** Raw LES handle body */
  get handleBody() {
    return this.getAttribute("handle")?.trim() ?? "";
  }
  connectedCallback() {
    console.log("[LES] <on-event> registered:", this.eventName || "(unnamed)");
  }
};
customElements.define("on-event", OnEvent);

// src/elements/OnSignal.ts
var OnSignal = class extends HTMLElement {
  /** Signal name including $ prefix: "$feedState" */
  get signalName() {
    return this.getAttribute("name")?.trim() ?? "";
  }
  /** Signal name without $ prefix, for Datastar API calls */
  get signalKey() {
    return this.signalName.replace(/^\$/, "");
  }
  get whenExpr() {
    return this.getAttribute("when")?.trim() ?? null;
  }
  get handleBody() {
    return this.getAttribute("handle")?.trim() ?? "";
  }
  connectedCallback() {
    console.log("[LES] <on-signal> registered:", this.signalName || "(unnamed)");
  }
};
customElements.define("on-signal", OnSignal);

// src/elements/Lifecycle.ts
var OnLoad = class extends HTMLElement {
  get runBody() {
    return this.getAttribute("run")?.trim() ?? "";
  }
  connectedCallback() {
    console.log("[LES] <on-load> registered, run:", this.runBody);
  }
};
var OnEnter = class extends HTMLElement {
  get whenExpr() {
    return this.getAttribute("when")?.trim() ?? null;
  }
  get runBody() {
    return this.getAttribute("run")?.trim() ?? "";
  }
  connectedCallback() {
    console.log("[LES] <on-enter> registered, when:", this.whenExpr ?? "always");
  }
};
var OnExit = class extends HTMLElement {
  get runBody() {
    return this.getAttribute("run")?.trim() ?? "";
  }
  connectedCallback() {
    console.log("[LES] <on-exit> registered, run:", this.runBody);
  }
};
customElements.define("on-load", OnLoad);
customElements.define("on-enter", OnEnter);
customElements.define("on-exit", OnExit);

// src/elements/UseModule.ts
var UseModule = class extends HTMLElement {
  /** Built-in module type e.g. "animation" */
  get moduleType() {
    return this.getAttribute("type")?.trim() ?? null;
  }
  /** Userland module URL e.g. "./scroll-effects.js" */
  get moduleSrc() {
    return this.getAttribute("src")?.trim() ?? null;
  }
  connectedCallback() {
    const desc = this.moduleType ? `type="${this.moduleType}"` : this.moduleSrc ? `src="${this.moduleSrc}"` : "(no type or src)";
    console.log("[LES] <use-module> declared:", desc);
  }
};
customElements.define("use-module", UseModule);

// src/runtime/scope.ts
var LESScope = class _LESScope {
  constructor(parent) {
    this.parent = parent;
  }
  locals = /* @__PURE__ */ new Map();
  get(name) {
    if (this.locals.has(name)) return this.locals.get(name);
    return this.parent?.get(name);
  }
  set(name, value) {
    this.locals.set(name, value);
  }
  has(name) {
    return this.locals.has(name) || (this.parent?.has(name) ?? false);
  }
  /** Create a child scope inheriting all locals from this one. */
  child() {
    return new _LESScope(this);
  }
  /** Snapshot all locals (for debugging / error messages). */
  snapshot() {
    const base = this.parent?.snapshot() ?? {};
    for (const [k, v] of this.locals) base[k] = v;
    return base;
  }
};

// src/datastar/plugin.ts
var bridgeRegistered = false;
async function registerDatastarBridge() {
  if (bridgeRegistered) return;
  try {
    const { attribute } = await import("datastar");
    attribute({
      name: "local-event-script",
      // No key suffix expected (data-local-event-script, not data-local-event-script:key)
      requirement: {
        key: "denied",
        value: "denied"
      },
      apply({ el, effect, signal }) {
        const host = el;
        host.connectDatastar({ effect, signal });
        console.log("[LES:datastar] attribute plugin applied to", el.id || el);
        return () => {
          host.disconnectDatastar();
          console.log("[LES:datastar] attribute plugin cleaned up", el.id || el);
        };
      }
    });
    bridgeRegistered = true;
    console.log("[LES:datastar] bridge registered");
  } catch {
    console.log("[LES] Running in standalone mode (Datastar not found in importmap)");
  }
}

// src/index.ts
registerDatastarBridge();
export {
  LESParseError,
  LESParser,
  LESScope,
  LocalCommand,
  LocalEventScript,
  OnEnter,
  OnEvent,
  OnExit,
  OnLoad,
  OnSignal,
  UseModule,
  logConfig,
  parseLES,
  readConfig,
  stripBody
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3J1bnRpbWUvcmVnaXN0cnkudHMiLCAiLi4vc3JjL21vZHVsZXMvdHlwZXMudHMiLCAiLi4vc3JjL3BhcnNlci9zdHJpcEJvZHkudHMiLCAiLi4vc3JjL3BhcnNlci9yZWFkZXIudHMiLCAiLi4vc3JjL3BhcnNlci90b2tlbml6ZXIudHMiLCAiLi4vc3JjL3BhcnNlci9wYXJzZXIudHMiLCAiLi4vc3JjL3BhcnNlci9pbmRleC50cyIsICIuLi9zcmMvZWxlbWVudHMvTG9jYWxFdmVudFNjcmlwdC50cyIsICIuLi9zcmMvZWxlbWVudHMvTG9jYWxDb21tYW5kLnRzIiwgIi4uL3NyYy9lbGVtZW50cy9PbkV2ZW50LnRzIiwgIi4uL3NyYy9lbGVtZW50cy9PblNpZ25hbC50cyIsICIuLi9zcmMvZWxlbWVudHMvTGlmZWN5Y2xlLnRzIiwgIi4uL3NyYy9lbGVtZW50cy9Vc2VNb2R1bGUudHMiLCAiLi4vc3JjL3J1bnRpbWUvc2NvcGUudHMiLCAiLi4vc3JjL2RhdGFzdGFyL3BsdWdpbi50cyIsICIuLi9zcmMvaW5kZXgudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImltcG9ydCB0eXBlIHsgTEVTTm9kZSwgRXhwck5vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuLyoqIEEgc2luZ2xlIHR5cGVkIGFyZ3VtZW50IGRlZmluaXRpb24gZnJvbSBhcmdzPVwiW25hbWU6dHlwZSAgLi4uXVwiICovXG5leHBvcnQgaW50ZXJmYWNlIEFyZ0RlZiB7XG4gIG5hbWU6IHN0cmluZ1xuICAvKiogJ25pbCcgfCAnaW50JyB8ICdkZWMnIHwgJ3N0cicgfCAnYXJyJyB8ICdvYmonIHwgJ2Jvb2wnIHwgJ2R5bicgKi9cbiAgdHlwZTogc3RyaW5nXG4gIC8qKiBEZWZhdWx0IHZhbHVlIGV4cHJlc3Npb24sIGlmIHByb3ZpZGVkIChlLmcuIGF0dGVtcHQ6aW50PTApICovXG4gIGRlZmF1bHQ/OiBFeHByTm9kZVxufVxuXG4vKiogQSBmdWxseSBwYXJzZWQgPGxvY2FsLWNvbW1hbmQ+IGRlZmluaXRpb24uICovXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmREZWYge1xuICBuYW1lOiBzdHJpbmdcbiAgYXJnczogQXJnRGVmW11cbiAgLyoqIEd1YXJkIGV4cHJlc3Npb24gc3RyaW5nIFx1MjAxNCBldmFsdWF0ZWQgYmVmb3JlIGV4ZWN1dGlvbi4gRmFsc3kgPSBzaWxlbnQgbm8tb3AuICovXG4gIGd1YXJkPzogc3RyaW5nXG4gIC8qKiBUaGUgcGFyc2VkIGJvZHkgQVNUICovXG4gIGJvZHk6IExFU05vZGVcbiAgLyoqIFRoZSA8bG9jYWwtY29tbWFuZD4gRE9NIGVsZW1lbnQsIGtlcHQgZm9yIGVycm9yIHJlcG9ydGluZyAqL1xuICBlbGVtZW50OiBFbGVtZW50XG59XG5cbmV4cG9ydCBjbGFzcyBDb21tYW5kUmVnaXN0cnkge1xuICBwcml2YXRlIGNvbW1hbmRzID0gbmV3IE1hcDxzdHJpbmcsIENvbW1hbmREZWY+KClcblxuICByZWdpc3RlcihkZWY6IENvbW1hbmREZWYpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5jb21tYW5kcy5oYXMoZGVmLm5hbWUpKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgIGBbTEVTXSBEdXBsaWNhdGUgY29tbWFuZCBcIiR7ZGVmLm5hbWV9XCIgXHUyMDE0IHByZXZpb3VzIGRlZmluaXRpb24gb3ZlcndyaXR0ZW4uYCxcbiAgICAgICAgZGVmLmVsZW1lbnRcbiAgICAgIClcbiAgICB9XG4gICAgdGhpcy5jb21tYW5kcy5zZXQoZGVmLm5hbWUsIGRlZilcbiAgfVxuXG4gIGdldChuYW1lOiBzdHJpbmcpOiBDb21tYW5kRGVmIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kcy5nZXQobmFtZSlcbiAgfVxuXG4gIGhhcyhuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kcy5oYXMobmFtZSlcbiAgfVxuXG4gIG5hbWVzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmNvbW1hbmRzLmtleXMoKSlcbiAgfVxufVxuIiwgIi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gTEVTIE1vZHVsZSBzeXN0ZW1cbi8vXG4vLyBNb2R1bGVzIGV4dGVuZCB0aGUgc2V0IG9mIGFuaW1hdGlvbi9lZmZlY3QgcHJpbWl0aXZlcyBhdmFpbGFibGUgaW5cbi8vIDxsb2NhbC1jb21tYW5kPiBib2RpZXMuIFR3byBraW5kczpcbi8vXG4vLyAgIEJ1aWx0LWluOiAgPHVzZS1tb2R1bGUgdHlwZT1cImFuaW1hdGlvblwiPlxuLy8gICBVc2VybGFuZDogIDx1c2UtbW9kdWxlIHNyYz1cIi4vc2Nyb2xsLWVmZmVjdHMuanNcIj5cbi8vXG4vLyBCb3RoIHJlc29sdmUgdG8gYSBMRVNNb2R1bGUgYXQgcnVudGltZS5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEEgcHJpbWl0aXZlIGlzIGFuIGFzeW5jIG9wZXJhdGlvbiB0aGUgZXhlY3V0b3IgZGlzcGF0Y2hlcyBmb3IgQW5pbWF0aW9uTm9kZS5cbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3IgIENTUyBzZWxlY3RvciBzdHJpbmcgKGFscmVhZHkgcmVzb2x2ZWQgXHUyMDE0IG5vIHZhcmlhYmxlIHN1YnN0aXR1dGlvbiBuZWVkZWQgaGVyZSlcbiAqIEBwYXJhbSBkdXJhdGlvbiAgbWlsbGlzZWNvbmRzXG4gKiBAcGFyYW0gZWFzaW5nICAgIENTUyBlYXNpbmcgc3RyaW5nLCBlLmcuICdlYXNlLW91dCdcbiAqIEBwYXJhbSBvcHRpb25zICAga2V5L3ZhbHVlIG9wdGlvbnMgZnJvbSB0aGUgdHJhaWxpbmcgWy4uLl0gYmxvY2ssIGFscmVhZHkgZXZhbHVhdGVkXG4gKiBAcGFyYW0gaG9zdCAgICAgIHRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBlbGVtZW50ICh1c2VkIGFzIHF1ZXJ5U2VsZWN0b3Igcm9vdClcbiAqL1xuZXhwb3J0IHR5cGUgTEVTUHJpbWl0aXZlID0gKFxuICBzZWxlY3Rvcjogc3RyaW5nLFxuICBkdXJhdGlvbjogbnVtYmVyLFxuICBlYXNpbmc6IHN0cmluZyxcbiAgb3B0aW9uczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIGhvc3Q6IEVsZW1lbnRcbikgPT4gUHJvbWlzZTx2b2lkPlxuXG4vKiogVGhlIHNoYXBlIGEgdXNlcmxhbmQgbW9kdWxlIG11c3QgZXhwb3J0IGFzIGl0cyBkZWZhdWx0IGV4cG9ydC4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTEVTTW9kdWxlIHtcbiAgLyoqIEh1bWFuLXJlYWRhYmxlIG5hbWUgZm9yIGVycm9yIG1lc3NhZ2VzICovXG4gIG5hbWU6IHN0cmluZ1xuICBwcmltaXRpdmVzOiBSZWNvcmQ8c3RyaW5nLCBMRVNQcmltaXRpdmU+XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBSZWdpc3RyeSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZXhwb3J0IGNsYXNzIE1vZHVsZVJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBwcmltaXRpdmVzID0gbmV3IE1hcDxzdHJpbmcsIExFU1ByaW1pdGl2ZT4oKVxuICBwcml2YXRlIGxvYWRlZE1vZHVsZXM6IHN0cmluZ1tdID0gW11cblxuICByZWdpc3Rlcihtb2R1bGU6IExFU01vZHVsZSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgW25hbWUsIGZuXSBvZiBPYmplY3QuZW50cmllcyhtb2R1bGUucHJpbWl0aXZlcykpIHtcbiAgICAgIHRoaXMucHJpbWl0aXZlcy5zZXQobmFtZSwgZm4pXG4gICAgfVxuICAgIHRoaXMubG9hZGVkTW9kdWxlcy5wdXNoKG1vZHVsZS5uYW1lKVxuICAgIGNvbnNvbGUubG9nKGBbTEVTXSBtb2R1bGUgbG9hZGVkOiBcIiR7bW9kdWxlLm5hbWV9XCJgLCBPYmplY3Qua2V5cyhtb2R1bGUucHJpbWl0aXZlcykpXG4gIH1cblxuICBnZXQocHJpbWl0aXZlOiBzdHJpbmcpOiBMRVNQcmltaXRpdmUgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLnByaW1pdGl2ZXMuZ2V0KHByaW1pdGl2ZSlcbiAgfVxuXG4gIGhhcyhwcmltaXRpdmU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnByaW1pdGl2ZXMuaGFzKHByaW1pdGl2ZSlcbiAgfVxuXG4gIC8qKiBEZXYtbW9kZSBoZWxwOiB3aGljaCBtb2R1bGUgZXhwb3J0cyBhIGdpdmVuIHByaW1pdGl2ZT8gKi9cbiAgaGludEZvcihwcmltaXRpdmU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgLy8gV2lsbCBiZSBlbnJpY2hlZCBpbiBQaGFzZSA4IHdpdGggcGVyLW1vZHVsZSBwcmltaXRpdmUgbWFuaWZlc3RzLlxuICAgIHJldHVybiBgUHJpbWl0aXZlIFwiJHtwcmltaXRpdmV9XCIgbm90IGZvdW5kLiBMb2FkZWQgbW9kdWxlczogWyR7dGhpcy5sb2FkZWRNb2R1bGVzLmpvaW4oJywgJyl9XS4gRGlkIHlvdSBmb3JnZXQgPHVzZS1tb2R1bGUgdHlwZT1cImFuaW1hdGlvblwiPj9gXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIExvYWRlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqIEJ1aWx0LWluIG1vZHVsZSByZWdpc3RyeTogdHlwZSBuYW1lIFx1MjE5MiBpbXBvcnQgcGF0aCAqL1xuY29uc3QgQlVJTFRJTl9NT0RVTEVTOiBSZWNvcmQ8c3RyaW5nLCAoKSA9PiBQcm9taXNlPHsgZGVmYXVsdDogTEVTTW9kdWxlIH0+PiA9IHtcbiAgYW5pbWF0aW9uOiAoKSA9PiBpbXBvcnQoJy4vYnVpbHRpbi9hbmltYXRpb24uanMnKSxcbn1cblxuLyoqXG4gKiBSZXNvbHZlIGEgPHVzZS1tb2R1bGU+IGVsZW1lbnQgdG8gYSBMRVNNb2R1bGUgYW5kIHJlZ2lzdGVyIGl0LlxuICogQ2FsbGVkIGR1cmluZyBQaGFzZSAxIERPTSByZWFkaW5nIChQaGFzZSA4IGNvbXBsZXRlcyB0aGUgc3JjPSBwYXRoKS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRNb2R1bGUoXG4gIHJlZ2lzdHJ5OiBNb2R1bGVSZWdpc3RyeSxcbiAgb3B0czogeyB0eXBlPzogc3RyaW5nOyBzcmM/OiBzdHJpbmcgfVxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChvcHRzLnR5cGUpIHtcbiAgICBjb25zdCBsb2FkZXIgPSBCVUlMVElOX01PRFVMRVNbb3B0cy50eXBlXVxuICAgIGlmICghbG9hZGVyKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVNdIFVua25vd24gYnVpbHQtaW4gbW9kdWxlIHR5cGU6IFwiJHtvcHRzLnR5cGV9XCIuIEF2YWlsYWJsZTogJHtPYmplY3Qua2V5cyhCVUlMVElOX01PRFVMRVMpLmpvaW4oJywgJyl9YClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25zdCBtb2QgPSBhd2FpdCBsb2FkZXIoKVxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKG1vZC5kZWZhdWx0KVxuICAgIHJldHVyblxuICB9XG5cbiAgaWYgKG9wdHMuc3JjKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1vZCA9IGF3YWl0IGltcG9ydCgvKiBAdml0ZS1pZ25vcmUgKi8gb3B0cy5zcmMpXG4gICAgICBpZiAoIW1vZC5kZWZhdWx0IHx8IHR5cGVvZiBtb2QuZGVmYXVsdC5wcmltaXRpdmVzICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBjb25zb2xlLndhcm4oYFtMRVNdIE1vZHVsZSBhdCBcIiR7b3B0cy5zcmN9XCIgZG9lcyBub3QgZXhwb3J0IGEgdmFsaWQgTEVTTW9kdWxlLiBFeHBlY3RlZDogeyBuYW1lOiBzdHJpbmcsIHByaW1pdGl2ZXM6IFJlY29yZDxzdHJpbmcsIEZ1bmN0aW9uPiB9YClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICByZWdpc3RyeS5yZWdpc3Rlcihtb2QuZGVmYXVsdCBhcyBMRVNNb2R1bGUpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBbTEVTXSBGYWlsZWQgdG8gbG9hZCBtb2R1bGUgZnJvbSBcIiR7b3B0cy5zcmN9XCI6YCwgZXJyKVxuICAgIH1cbiAgICByZXR1cm5cbiAgfVxuXG4gIGNvbnNvbGUud2FybignW0xFU10gPHVzZS1tb2R1bGU+IHJlcXVpcmVzIGVpdGhlciB0eXBlPSBvciBzcmM9IGF0dHJpYnV0ZS4nKVxufVxuIiwgIi8qKlxuICogU3RyaXBzIHRoZSBiYWNrdGljayB3cmFwcGVyIGZyb20gYSBtdWx0aS1saW5lIExFUyBib2R5IHN0cmluZyBhbmRcbiAqIG5vcm1hbGl6ZXMgaW5kZW50YXRpb24sIHByb2R1Y2luZyBhIGNsZWFuIHN0cmluZyB0aGUgcGFyc2VyIGNhbiB3b3JrIHdpdGguXG4gKlxuICogQ29udmVudGlvbjpcbiAqICAgU2luZ2xlLWxpbmU6ICBoYW5kbGU9XCJlbWl0IGZlZWQ6aW5pdFwiICAgICAgICAgICBcdTIxOTIgXCJlbWl0IGZlZWQ6aW5pdFwiXG4gKiAgIE11bHRpLWxpbmU6ICAgZG89XCJgXFxuICAgICAgc2V0Li4uXFxuICAgIGBcIiAgICAgICAgXHUyMTkyIFwic2V0Li4uXFxuLi4uXCJcbiAqXG4gKiBBbGdvcml0aG06XG4gKiAgIDEuIFRyaW0gb3V0ZXIgd2hpdGVzcGFjZSBmcm9tIHRoZSByYXcgYXR0cmlidXRlIHZhbHVlLlxuICogICAyLiBJZiB3cmFwcGVkIGluIGJhY2t0aWNrcywgc3RyaXAgdGhlbSBcdTIwMTQgZG8gTk9UIGlubmVyLXRyaW0geWV0LlxuICogICAzLiBTcGxpdCBpbnRvIGxpbmVzIGFuZCBjb21wdXRlIG1pbmltdW0gbm9uLXplcm8gaW5kZW50YXRpb25cbiAqICAgICAgYWNyb3NzIGFsbCBub24tZW1wdHkgbGluZXMuIFRoaXMgaXMgdGhlIEhUTUwgYXR0cmlidXRlIGluZGVudGF0aW9uXG4gKiAgICAgIGxldmVsIHRvIHJlbW92ZS5cbiAqICAgNC4gU3RyaXAgdGhhdCBtYW55IGxlYWRpbmcgY2hhcmFjdGVycyBmcm9tIGV2ZXJ5IGxpbmUuXG4gKiAgIDUuIERyb3AgbGVhZGluZy90cmFpbGluZyBibGFuayBsaW5lcywgcmV0dXJuIGpvaW5lZCByZXN1bHQuXG4gKlxuICogQ3J1Y2lhbGx5LCBzdGVwIDIgZG9lcyBOT1QgY2FsbCAudHJpbSgpIG9uIHRoZSBpbm5lciBjb250ZW50IGJlZm9yZVxuICogY29tcHV0aW5nIGluZGVudGF0aW9uLiBBbiBpbm5lciAudHJpbSgpIHdvdWxkIGRlc3Ryb3kgdGhlIGxlYWRpbmdcbiAqIHdoaXRlc3BhY2Ugb24gbGluZSAxLCBtYWtpbmcgbWluSW5kZW50ID0gMCBhbmQgbGVhdmluZyBhbGwgb3RoZXJcbiAqIGxpbmVzIHVuLWRlLWluZGVudGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RyaXBCb2R5KHJhdzogc3RyaW5nKTogc3RyaW5nIHtcbiAgbGV0IHMgPSByYXcudHJpbSgpXG5cbiAgLy8gU3RyaXAgYmFja3RpY2sgd3JhcHBlciBcdTIwMTQgYnV0IHByZXNlcnZlIGludGVybmFsIHdoaXRlc3BhY2UgZm9yIGRlLWluZGVudFxuICBpZiAocy5zdGFydHNXaXRoKCdgJykgJiYgcy5lbmRzV2l0aCgnYCcpKSB7XG4gICAgcyA9IHMuc2xpY2UoMSwgLTEpXG4gICAgLy8gRG8gTk9UIC50cmltKCkgaGVyZSBcdTIwMTQgdGhhdCBraWxscyB0aGUgbGVhZGluZyBpbmRlbnQgb24gbGluZSAxXG4gIH1cblxuICBjb25zdCBsaW5lcyA9IHMuc3BsaXQoJ1xcbicpXG4gIGNvbnN0IG5vbkVtcHR5ID0gbGluZXMuZmlsdGVyKGwgPT4gbC50cmltKCkubGVuZ3RoID4gMClcbiAgaWYgKG5vbkVtcHR5Lmxlbmd0aCA9PT0gMCkgcmV0dXJuICcnXG5cbiAgLy8gRm9yIHNpbmdsZS1saW5lIHZhbHVlcyAobm8gbmV3bGluZXMgYWZ0ZXIgYmFja3RpY2sgc3RyaXApLCBqdXN0IHRyaW1cbiAgaWYgKGxpbmVzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIHMudHJpbSgpXG5cbiAgLy8gTWluaW11bSBsZWFkaW5nIHdoaXRlc3BhY2UgYWNyb3NzIG5vbi1lbXB0eSBsaW5lc1xuICBjb25zdCBtaW5JbmRlbnQgPSBub25FbXB0eS5yZWR1Y2UoKG1pbiwgbGluZSkgPT4ge1xuICAgIGNvbnN0IGxlYWRpbmcgPSBsaW5lLm1hdGNoKC9eKFxccyopLyk/LlsxXT8ubGVuZ3RoID8/IDBcbiAgICByZXR1cm4gTWF0aC5taW4obWluLCBsZWFkaW5nKVxuICB9LCBJbmZpbml0eSlcblxuICBjb25zdCBzdHJpcHBlZCA9IG1pbkluZGVudCA9PT0gMCB8fCBtaW5JbmRlbnQgPT09IEluZmluaXR5XG4gICAgPyBsaW5lc1xuICAgIDogbGluZXMubWFwKGxpbmUgPT4gbGluZS5sZW5ndGggPj0gbWluSW5kZW50ID8gbGluZS5zbGljZShtaW5JbmRlbnQpIDogbGluZS50cmltU3RhcnQoKSlcblxuICAvLyBEcm9wIGxlYWRpbmcgYW5kIHRyYWlsaW5nIGJsYW5rIGxpbmVzICh0aGUgbmV3bGluZXMgYXJvdW5kIGJhY2t0aWNrIGNvbnRlbnQpXG4gIGxldCBzdGFydCA9IDBcbiAgbGV0IGVuZCA9IHN0cmlwcGVkLmxlbmd0aCAtIDFcbiAgd2hpbGUgKHN0YXJ0IDw9IGVuZCAmJiBzdHJpcHBlZFtzdGFydF0/LnRyaW0oKSA9PT0gJycpIHN0YXJ0KytcbiAgd2hpbGUgKGVuZCA+PSBzdGFydCAmJiBzdHJpcHBlZFtlbmRdPy50cmltKCkgPT09ICcnKSBlbmQtLVxuXG4gIHJldHVybiBzdHJpcHBlZC5zbGljZShzdGFydCwgZW5kICsgMSkuam9pbignXFxuJylcbn1cbiIsICJpbXBvcnQgdHlwZSB7XG4gIExFU0NvbmZpZyxcbiAgTW9kdWxlRGVjbCxcbiAgQ29tbWFuZERlY2wsXG4gIEV2ZW50SGFuZGxlckRlY2wsXG4gIFNpZ25hbFdhdGNoZXJEZWNsLFxuICBPbkxvYWREZWNsLFxuICBPbkVudGVyRGVjbCxcbiAgT25FeGl0RGVjbCxcbn0gZnJvbSAnLi9jb25maWcuanMnXG5pbXBvcnQgeyBzdHJpcEJvZHkgfSBmcm9tICcuL3N0cmlwQm9keS5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBUYWcgbmFtZSBcdTIxOTIgaGFuZGxlciBtYXBcbi8vIEVhY2ggaGFuZGxlciByZWFkcyBhdHRyaWJ1dGVzIGZyb20gYSBjaGlsZCBlbGVtZW50IGFuZCBwdXNoZXMgYSB0eXBlZCBkZWNsXG4vLyBpbnRvIHRoZSBjb25maWcgYmVpbmcgYnVpbHQuIFVua25vd24gdGFncyBhcmUgY29sbGVjdGVkIGZvciB3YXJuaW5nLlxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbnR5cGUgSGFuZGxlciA9IChlbDogRWxlbWVudCwgY29uZmlnOiBMRVNDb25maWcpID0+IHZvaWRcblxuY29uc3QgSEFORExFUlM6IFJlY29yZDxzdHJpbmcsIEhhbmRsZXI+ID0ge1xuXG4gICd1c2UtbW9kdWxlJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgdHlwZSA9IGVsLmdldEF0dHJpYnV0ZSgndHlwZScpPy50cmltKCkgPz8gbnVsbFxuICAgIGNvbnN0IHNyYyAgPSBlbC5nZXRBdHRyaWJ1dGUoJ3NyYycpPy50cmltKCkgID8/IG51bGxcblxuICAgIGlmICghdHlwZSAmJiAhc3JjKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDx1c2UtbW9kdWxlPiBoYXMgbmVpdGhlciB0eXBlPSBub3Igc3JjPSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbmZpZy5tb2R1bGVzLnB1c2goeyB0eXBlLCBzcmMsIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG5cbiAgJ2xvY2FsLWNvbW1hbmQnKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCBuYW1lID0gZWwuZ2V0QXR0cmlidXRlKCduYW1lJyk/LnRyaW0oKSA/PyAnJ1xuICAgIGNvbnN0IGJvZHkgPSBlbC5nZXRBdHRyaWJ1dGUoJ2RvJyk/LnRyaW0oKSAgID8/ICcnXG5cbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPGxvY2FsLWNvbW1hbmQ+IG1pc3NpbmcgcmVxdWlyZWQgbmFtZT0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTXSA8bG9jYWwtY29tbWFuZCBuYW1lPVwiJHtuYW1lfVwiPiBtaXNzaW5nIHJlcXVpcmVkIGRvPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuYCwgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25maWcuY29tbWFuZHMucHVzaCh7XG4gICAgICBuYW1lLFxuICAgICAgYXJnc1JhdzogZWwuZ2V0QXR0cmlidXRlKCdhcmdzJyk/LnRyaW0oKSAgPz8gJycsXG4gICAgICBndWFyZDogICBlbC5nZXRBdHRyaWJ1dGUoJ2d1YXJkJyk/LnRyaW0oKSA/PyBudWxsLFxuICAgICAgYm9keTogICAgc3RyaXBCb2R5KGJvZHkpLFxuICAgICAgZWxlbWVudDogZWwsXG4gICAgfSlcbiAgfSxcblxuICAnb24tZXZlbnQnKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCBuYW1lID0gZWwuZ2V0QXR0cmlidXRlKCduYW1lJyk/LnRyaW0oKSAgID8/ICcnXG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgnaGFuZGxlJyk/LnRyaW0oKSA/PyAnJ1xuXG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDxvbi1ldmVudD4gbWlzc2luZyByZXF1aXJlZCBuYW1lPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVNdIDxvbi1ldmVudCBuYW1lPVwiJHtuYW1lfVwiPiBtaXNzaW5nIHJlcXVpcmVkIGhhbmRsZT0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLmAsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uZmlnLm9uRXZlbnQucHVzaCh7IG5hbWUsIGJvZHk6IHN0cmlwQm9keShib2R5KSwgZWxlbWVudDogZWwgfSlcbiAgfSxcblxuICAnb24tc2lnbmFsJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgbmFtZSA9IGVsLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgICA/PyAnJ1xuICAgIGNvbnN0IGJvZHkgPSBlbC5nZXRBdHRyaWJ1dGUoJ2hhbmRsZScpPy50cmltKCkgPz8gJydcblxuICAgIGlmICghbmFtZSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tc2lnbmFsPiBtaXNzaW5nIHJlcXVpcmVkIG5hbWU9IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBpZiAoIWJvZHkpIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFU10gPG9uLXNpZ25hbCBuYW1lPVwiJHtuYW1lfVwiPiBtaXNzaW5nIHJlcXVpcmVkIGhhbmRsZT0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLmAsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uZmlnLm9uU2lnbmFsLnB1c2goe1xuICAgICAgbmFtZSxcbiAgICAgIHdoZW46ICAgIGVsLmdldEF0dHJpYnV0ZSgnd2hlbicpPy50cmltKCkgPz8gbnVsbCxcbiAgICAgIGJvZHk6ICAgIHN0cmlwQm9keShib2R5KSxcbiAgICAgIGVsZW1lbnQ6IGVsLFxuICAgIH0pXG4gIH0sXG5cbiAgJ29uLWxvYWQnKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdydW4nKT8udHJpbSgpID8/ICcnXG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDxvbi1sb2FkPiBtaXNzaW5nIHJlcXVpcmVkIHJ1bj0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGNvbmZpZy5vbkxvYWQucHVzaCh7IGJvZHk6IHN0cmlwQm9keShib2R5KSwgZWxlbWVudDogZWwgfSlcbiAgfSxcblxuICAnb24tZW50ZXInKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdydW4nKT8udHJpbSgpID8/ICcnXG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDxvbi1lbnRlcj4gbWlzc2luZyByZXF1aXJlZCBydW49IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25maWcub25FbnRlci5wdXNoKHtcbiAgICAgIHdoZW46ICAgIGVsLmdldEF0dHJpYnV0ZSgnd2hlbicpPy50cmltKCkgPz8gbnVsbCxcbiAgICAgIGJvZHk6ICAgIHN0cmlwQm9keShib2R5KSxcbiAgICAgIGVsZW1lbnQ6IGVsLFxuICAgIH0pXG4gIH0sXG5cbiAgJ29uLWV4aXQnKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdydW4nKT8udHJpbSgpID8/ICcnXG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDxvbi1leGl0PiBtaXNzaW5nIHJlcXVpcmVkIHJ1bj0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGNvbmZpZy5vbkV4aXQucHVzaCh7IGJvZHk6IHN0cmlwQm9keShib2R5KSwgZWxlbWVudDogZWwgfSlcbiAgfSxcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyByZWFkQ29uZmlnIFx1MjAxNCB0aGUgcHVibGljIGVudHJ5IHBvaW50XG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBXYWxrcyB0aGUgZGlyZWN0IGNoaWxkcmVuIG9mIGEgPGxvY2FsLWV2ZW50LXNjcmlwdD4gZWxlbWVudCBhbmRcbiAqIHByb2R1Y2VzIGEgc3RydWN0dXJlZCBMRVNDb25maWcuXG4gKlxuICogT25seSBkaXJlY3QgY2hpbGRyZW4gYXJlIHJlYWQgXHUyMDE0IG5lc3RlZCBlbGVtZW50cyBpbnNpZGUgYSA8bG9jYWwtY29tbWFuZD5cbiAqIGJvZHkgYXJlIG5vdCBjaGlsZHJlbiBvZiB0aGUgaG9zdCBhbmQgYXJlIG5ldmVyIHZpc2l0ZWQgaGVyZS5cbiAqXG4gKiBVbmtub3duIGNoaWxkIGVsZW1lbnRzIGVtaXQgYSBjb25zb2xlLndhcm4gYW5kIGFyZSBjb2xsZWN0ZWQgaW4gY29uZmlnLnVua25vd25cbiAqIHNvIHRvb2xpbmcgKGUuZy4gYSBmdXR1cmUgTEVTIGxhbmd1YWdlIHNlcnZlcikgY2FuIHJlcG9ydCB0aGVtLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZENvbmZpZyhob3N0OiBFbGVtZW50KTogTEVTQ29uZmlnIHtcbiAgY29uc3QgY29uZmlnOiBMRVNDb25maWcgPSB7XG4gICAgaWQ6ICAgICAgIGhvc3QuaWQgfHwgJyhubyBpZCknLFxuICAgIG1vZHVsZXM6ICBbXSxcbiAgICBjb21tYW5kczogW10sXG4gICAgb25FdmVudDogIFtdLFxuICAgIG9uU2lnbmFsOiBbXSxcbiAgICBvbkxvYWQ6ICAgW10sXG4gICAgb25FbnRlcjogIFtdLFxuICAgIG9uRXhpdDogICBbXSxcbiAgICB1bmtub3duOiAgW10sXG4gIH1cblxuICBmb3IgKGNvbnN0IGNoaWxkIG9mIEFycmF5LmZyb20oaG9zdC5jaGlsZHJlbikpIHtcbiAgICBjb25zdCB0YWcgPSBjaGlsZC50YWdOYW1lLnRvTG93ZXJDYXNlKClcbiAgICBjb25zdCBoYW5kbGVyID0gSEFORExFUlNbdGFnXVxuXG4gICAgaWYgKGhhbmRsZXIpIHtcbiAgICAgIGhhbmRsZXIoY2hpbGQsIGNvbmZpZylcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSFRNTCBjb21tZW50cyBkb24ndCBhcHBlYXIgaW4gLmNoaWxkcmVuLCBvbmx5IGluIC5jaGlsZE5vZGVzLlxuICAgICAgLy8gU28gZXZlcnl0aGluZyBoZXJlIGlzIGEgcmVhbCBlbGVtZW50IFx1MjAxNCB3YXJuIGFuZCBjb2xsZWN0LlxuICAgICAgY29uZmlnLnVua25vd24ucHVzaChjaGlsZClcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgYFtMRVNdIFVua25vd24gY2hpbGQgZWxlbWVudCA8JHt0YWd9PiBpbnNpZGUgPGxvY2FsLWV2ZW50LXNjcmlwdCBpZD1cIiR7Y29uZmlnLmlkfVwiPiBcdTIwMTQgaWdub3JlZC5gLFxuICAgICAgICBjaGlsZFxuICAgICAgKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjb25maWdcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBsb2dDb25maWcgXHUyMDE0IHN0cnVjdHVyZWQgY2hlY2twb2ludCBsb2dcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIExvZ3MgYSBzdW1tYXJ5IG9mIGEgcGFyc2VkIExFU0NvbmZpZy5cbiAqIFBoYXNlIDEgY2hlY2twb2ludDogeW91IHNob3VsZCBzZWUgdGhpcyBpbiB0aGUgYnJvd3NlciBjb25zb2xlL2RlYnVnIGxvZ1xuICogd2l0aCBhbGwgY29tbWFuZHMsIGV2ZW50cywgYW5kIHNpZ25hbCB3YXRjaGVycyBjb3JyZWN0bHkgbGlzdGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9nQ29uZmlnKGNvbmZpZzogTEVTQ29uZmlnKTogdm9pZCB7XG4gIGNvbnN0IGlkID0gY29uZmlnLmlkXG4gIGNvbnNvbGUubG9nKGBbTEVTXSBjb25maWcgcmVhZCBmb3IgIyR7aWR9YClcbiAgY29uc29sZS5sb2coYFtMRVNdICAgbW9kdWxlczogICAke2NvbmZpZy5tb2R1bGVzLmxlbmd0aH1gLCBjb25maWcubW9kdWxlcy5tYXAobSA9PiBtLnR5cGUgPz8gbS5zcmMpKVxuICBjb25zb2xlLmxvZyhgW0xFU10gICBjb21tYW5kczogICR7Y29uZmlnLmNvbW1hbmRzLmxlbmd0aH1gLCBjb25maWcuY29tbWFuZHMubWFwKGMgPT4gYy5uYW1lKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tZXZlbnQ6ICAke2NvbmZpZy5vbkV2ZW50Lmxlbmd0aH1gLCBjb25maWcub25FdmVudC5tYXAoZSA9PiBlLm5hbWUpKVxuICBjb25zb2xlLmxvZyhgW0xFU10gICBvbi1zaWduYWw6ICR7Y29uZmlnLm9uU2lnbmFsLmxlbmd0aH1gLCBjb25maWcub25TaWduYWwubWFwKHMgPT4gcy5uYW1lKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tbG9hZDogICAke2NvbmZpZy5vbkxvYWQubGVuZ3RofWApXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG9uLWVudGVyOiAgJHtjb25maWcub25FbnRlci5sZW5ndGh9YCwgY29uZmlnLm9uRW50ZXIubWFwKGUgPT4gZS53aGVuID8/ICdhbHdheXMnKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tZXhpdDogICAke2NvbmZpZy5vbkV4aXQubGVuZ3RofWApXG5cbiAgaWYgKGNvbmZpZy51bmtub3duLmxlbmd0aCA+IDApIHtcbiAgICBjb25zb2xlLndhcm4oYFtMRVNdICAgdW5rbm93biBjaGlsZHJlbjogJHtjb25maWcudW5rbm93bi5sZW5ndGh9YCwgY29uZmlnLnVua25vd24ubWFwKGUgPT4gZS50YWdOYW1lLnRvTG93ZXJDYXNlKCkpKVxuICB9XG5cbiAgLy8gTG9nIGEgc2FtcGxpbmcgb2YgYm9keSBzdHJpbmdzIHRvIHZlcmlmeSBzdHJpcEJvZHkgd29ya2VkIGNvcnJlY3RseVxuICBpZiAoY29uZmlnLmNvbW1hbmRzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBmaXJzdCA9IGNvbmZpZy5jb21tYW5kc1swXVxuICAgIGlmIChmaXJzdCkge1xuICAgICAgY29uc29sZS5sb2coYFtMRVNdICAgZmlyc3QgY29tbWFuZCBib2R5IHByZXZpZXcgKFwiJHtmaXJzdC5uYW1lfVwiKTpgKVxuICAgICAgY29uc3QgcHJldmlldyA9IGZpcnN0LmJvZHkuc3BsaXQoJ1xcbicpLnNsaWNlKDAsIDQpLmpvaW4oJ1xcbiAgJylcbiAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSAgIHwgJHtwcmV2aWV3fWApXG4gICAgfVxuICB9XG59XG4iLCAiLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBMRVMgVG9rZW5pemVyXG4vL1xuLy8gQ29udmVydHMgYSBzdHJpcEJvZHknZCBzb3VyY2Ugc3RyaW5nIGludG8gYSBmbGF0IGFycmF5IG9mIFRva2VuIG9iamVjdHMuXG4vLyBUb2tlbnMgYXJlIHNpbXBseSBub24tYmxhbmsgbGluZXMgd2l0aCB0aGVpciBpbmRlbnQgbGV2ZWwgcmVjb3JkZWQuXG4vLyBObyBzZW1hbnRpYyBhbmFseXNpcyBoYXBwZW5zIGhlcmUgXHUyMDE0IHRoYXQncyB0aGUgcGFyc2VyJ3Mgam9iLlxuLy9cbi8vIFRoZSB0b2tlbml6ZXIgaXMgZGVsaWJlcmF0ZWx5IG1pbmltYWw6IGl0IHByZXNlcnZlcyB0aGUgcmF3IGluZGVudGF0aW9uXG4vLyBpbmZvcm1hdGlvbiB0aGUgcGFyc2VyIG5lZWRzIHRvIHVuZGVyc3RhbmQgYmxvY2sgc3RydWN0dXJlLlxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBpbnRlcmZhY2UgVG9rZW4ge1xuICAvKiogQ29sdW1uIG9mZnNldCBvZiB0aGUgZmlyc3Qgbm9uLXdoaXRlc3BhY2UgY2hhcmFjdGVyIChudW1iZXIgb2Ygc3BhY2VzKSAqL1xuICBpbmRlbnQ6IG51bWJlclxuICAvKiogVHJpbW1lZCBsaW5lIGNvbnRlbnQgXHUyMDE0IG5vIGxlYWRpbmcvdHJhaWxpbmcgd2hpdGVzcGFjZSAqL1xuICB0ZXh0OiBzdHJpbmdcbiAgLyoqIDEtYmFzZWQgbGluZSBudW1iZXIgaW4gdGhlIHN0cmlwcGVkIHNvdXJjZSAoZm9yIGVycm9yIG1lc3NhZ2VzKSAqL1xuICBsaW5lTnVtOiBudW1iZXJcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhIHN0cmlwcGVkIExFUyBib2R5IHN0cmluZyBpbnRvIGEgVG9rZW4gYXJyYXkuXG4gKiBCbGFuayBsaW5lcyBhcmUgZHJvcHBlZC4gVGFicyBhcmUgZXhwYW5kZWQgdG8gMiBzcGFjZXMgZWFjaC5cbiAqXG4gKiBAcGFyYW0gc291cmNlICBBIHN0cmluZyBhbHJlYWR5IHByb2Nlc3NlZCBieSBzdHJpcEJvZHkoKSBcdTIwMTQgbm8gYmFja3RpY2sgd3JhcHBlcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b2tlbml6ZShzb3VyY2U6IHN0cmluZyk6IFRva2VuW10ge1xuICBjb25zdCB0b2tlbnM6IFRva2VuW10gPSBbXVxuICBjb25zdCBsaW5lcyA9IHNvdXJjZS5zcGxpdCgnXFxuJylcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgcmF3ID0gKGxpbmVzW2ldID8/ICcnKS5yZXBsYWNlKC9cXHQvZywgJyAgJylcbiAgICBjb25zdCB0ZXh0ID0gcmF3LnRyaW0oKVxuXG4gICAgLy8gU2tpcCBibGFuayBsaW5lc1xuICAgIGlmICh0ZXh0Lmxlbmd0aCA9PT0gMCkgY29udGludWVcblxuICAgIGNvbnN0IGluZGVudCA9IHJhdy5sZW5ndGggLSByYXcudHJpbVN0YXJ0KCkubGVuZ3RoXG5cbiAgICB0b2tlbnMucHVzaCh7XG4gICAgICBpbmRlbnQsXG4gICAgICB0ZXh0LFxuICAgICAgbGluZU51bTogaSArIDEsXG4gICAgfSlcbiAgfVxuXG4gIHJldHVybiB0b2tlbnNcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBIZWxwZXJzIHVzZWQgYnkgYm90aCB0aGUgdG9rZW5pemVyIHRlc3RzIGFuZCB0aGUgcGFyc2VyXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgYHRleHRgIGVuZHMgd2l0aCBhIHN0YW5kYWxvbmUgYGFuZGAgd29yZC5cbiAqIFVzZWQgYnkgdGhlIHBhcnNlciB0byBkZXRlY3QgcGFyYWxsZWwgYnJhbmNoZXMuXG4gKlxuICogQ2FyZWZ1bDogXCJlbmdsYW5kXCIsIFwiYmFuZFwiLCBcImNvbW1hbmRcIiBtdXN0IE5PVCBtYXRjaC5cbiAqIFdlIHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5IGJlZm9yZSBgYW5kYCBhbmQgZW5kLW9mLXN0cmluZyBhZnRlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuZHNXaXRoQW5kKHRleHQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gL1xcYmFuZCQvLnRlc3QodGV4dClcbn1cblxuLyoqXG4gKiBTdHJpcHMgdGhlIHRyYWlsaW5nIGAgYW5kYCBmcm9tIGEgbGluZSB0aGF0IGVuZHNXaXRoQW5kLlxuICogUmV0dXJucyB0aGUgdHJpbW1lZCBsaW5lIGNvbnRlbnQgd2l0aG91dCBpdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwVHJhaWxpbmdBbmQodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvXFxzK2FuZCQvLCAnJykudHJpbUVuZCgpXG59XG5cbi8qKlxuICogQmxvY2sgdGVybWluYXRvciB0b2tlbnMgXHUyMDE0IHNpZ25hbCB0aGUgZW5kIG9mIGEgbWF0Y2ggb3IgdHJ5IGJsb2NrLlxuICogVGhlc2UgYXJlIGNvbnN1bWVkIGJ5IHRoZSBibG9jay1vd25pbmcgcGFyc2VyIChwYXJzZU1hdGNoIC8gcGFyc2VUcnkpLFxuICogbm90IGJ5IHBhcnNlQmxvY2sgaXRzZWxmLlxuICovXG5leHBvcnQgY29uc3QgQkxPQ0tfVEVSTUlOQVRPUlMgPSBuZXcgU2V0KFsnL21hdGNoJywgJy90cnknXSlcblxuLyoqXG4gKiBLZXl3b3JkcyB0aGF0IGVuZCBhIHRyeSBib2R5IGFuZCBzdGFydCBhIHJlc2N1ZS9hZnRlcndhcmRzIGNsYXVzZS5cbiAqIFJlY29nbml6ZWQgb25seSB3aGVuIHRoZXkgYXBwZWFyIGF0IHRoZSBzYW1lIGluZGVudCBsZXZlbCBhcyB0aGUgYHRyeWAuXG4gKi9cbmV4cG9ydCBjb25zdCBUUllfQ0xBVVNFX0tFWVdPUkRTID0gbmV3IFNldChbJ3Jlc2N1ZScsICdhZnRlcndhcmRzJ10pXG4iLCAiaW1wb3J0IHR5cGUge1xuICBMRVNOb2RlLCBFeHByTm9kZSwgU2VxdWVuY2VOb2RlLCBQYXJhbGxlbE5vZGUsXG4gIFNldE5vZGUsIEVtaXROb2RlLCBCcm9hZGNhc3ROb2RlLCBXYWl0Tm9kZSwgQ2FsbE5vZGUsXG4gIEJpbmROb2RlLCBBY3Rpb25Ob2RlLCBNYXRjaE5vZGUsIE1hdGNoQXJtLCBQYXR0ZXJuTm9kZSxcbiAgVHJ5Tm9kZSwgQW5pbWF0aW9uTm9kZSxcbn0gZnJvbSAnLi9hc3QuanMnXG5pbXBvcnQgdHlwZSB7IFRva2VuIH0gZnJvbSAnLi90b2tlbml6ZXIuanMnXG5pbXBvcnQge1xuICBlbmRzV2l0aEFuZCwgc3RyaXBUcmFpbGluZ0FuZCxcbiAgQkxPQ0tfVEVSTUlOQVRPUlMsIFRSWV9DTEFVU0VfS0VZV09SRFMsXG59IGZyb20gJy4vdG9rZW5pemVyLmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEtub3duIGFuaW1hdGlvbiBwcmltaXRpdmUgbmFtZXMgKHJlZ2lzdGVyZWQgYnkgdGhlIGFuaW1hdGlvbiBtb2R1bGUpXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgQU5JTUFUSU9OX1BSSU1JVElWRVMgPSBuZXcgU2V0KFtcbiAgJ2ZhZGUtaW4nLCAnZmFkZS1vdXQnLCAnc2xpZGUtaW4nLCAnc2xpZGUtb3V0JyxcbiAgJ3NsaWRlLXVwJywgJ3NsaWRlLWRvd24nLCAncHVsc2UnLFxuICAnc3RhZ2dlci1lbnRlcicsICdzdGFnZ2VyLWV4aXQnLFxuXSlcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXJzZXJcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5leHBvcnQgY2xhc3MgTEVTUGFyc2VyIHtcbiAgcHJpdmF0ZSBwb3MgPSAwXG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSB0b2tlbnM6IFRva2VuW10pIHt9XG5cbiAgcHJpdmF0ZSBwZWVrKG9mZnNldCA9IDApOiBUb2tlbiB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMudG9rZW5zW3RoaXMucG9zICsgb2Zmc2V0XVxuICB9XG5cbiAgcHJpdmF0ZSBhZHZhbmNlKCk6IFRva2VuIHtcbiAgICBjb25zdCB0ID0gdGhpcy50b2tlbnNbdGhpcy5wb3NdXG4gICAgaWYgKCF0KSB0aHJvdyBuZXcgTEVTUGFyc2VFcnJvcignVW5leHBlY3RlZCBlbmQgb2YgaW5wdXQnLCB1bmRlZmluZWQpXG4gICAgdGhpcy5wb3MrK1xuICAgIHJldHVybiB0XG4gIH1cblxuICBwcml2YXRlIGF0RW5kKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnBvcyA+PSB0aGlzLnRva2Vucy5sZW5ndGhcbiAgfVxuXG4gIHByaXZhdGUgdHJ5Q29uc3VtZSh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB0ID0gdGhpcy5wZWVrKClcbiAgICBpZiAodD8udGV4dCA9PT0gdGV4dCkgeyB0aGlzLnBvcysrOyByZXR1cm4gdHJ1ZSB9XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgRW50cnkgcG9pbnQgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcGFyc2UoKTogTEVTTm9kZSB7XG4gICAgY29uc3Qgbm9kZSA9IHRoaXMucGFyc2VCbG9jaygtMSlcbiAgICByZXR1cm4gbm9kZVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEJsb2NrIHBhcnNlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKipcbiAgICogUGFyc2VzIGFsbCBzdGF0ZW1lbnRzIGF0IGluZGVudCA+IGJhc2VJbmRlbnQuXG4gICAqXG4gICAqIFN0b3BzIHdoZW4gaXQgZW5jb3VudGVyczpcbiAgICogICAtIEEgdG9rZW4gd2l0aCBpbmRlbnQgPD0gYmFzZUluZGVudFxuICAgKiAgIC0gQSBibG9jayB0ZXJtaW5hdG9yICgvbWF0Y2gsIC90cnkpIFx1MjAxNCBsZWZ0IGZvciB0aGUgcGFyZW50IHRvIGNvbnN1bWVcbiAgICogICAtIEEgdHJ5LWNsYXVzZSBrZXl3b3JkIChyZXNjdWUsIGFmdGVyd2FyZHMpIGF0IGluZGVudCA8PSBiYXNlSW5kZW50XG4gICAqICAgLSBFbmQgb2YgdG9rZW4gc3RyZWFtXG4gICAqXG4gICAqIFJldHVybnMgYSBTZXF1ZW5jZU5vZGUgaWYgbXVsdGlwbGUgc3RlcHMsIG90aGVyd2lzZSB0aGUgc2luZ2xlIG5vZGUuXG4gICAqL1xuICBwcml2YXRlIHBhcnNlQmxvY2soYmFzZUluZGVudDogbnVtYmVyKTogTEVTTm9kZSB7XG4gICAgY29uc3Qgc3RlcHM6IExFU05vZGVbXSA9IFtdXG5cbiAgICB3aGlsZSAoIXRoaXMuYXRFbmQoKSkge1xuICAgICAgY29uc3QgdCA9IHRoaXMucGVlaygpIVxuXG4gICAgICAvLyBTdG9wOiB3ZSd2ZSByZXR1cm5lZCB0byBvciBwYXN0IHRoZSBwYXJlbnQgYmxvY2sncyBpbmRlbnRcbiAgICAgIGlmICh0LmluZGVudCA8PSBiYXNlSW5kZW50KSBicmVha1xuXG4gICAgICAvLyBTdG9wOiBibG9jayB0ZXJtaW5hdG9ycyBhcmUgY29uc3VtZWQgYnkgdGhlIGJsb2NrIG9wZW5lciAobWF0Y2gvdHJ5KVxuICAgICAgaWYgKEJMT0NLX1RFUk1JTkFUT1JTLmhhcyh0LnRleHQpKSBicmVha1xuXG4gICAgICAvLyBTdG9wOiB0cnktY2xhdXNlIGtleXdvcmRzIGVuZCB0aGUgY3VycmVudCB0cnkgYm9keVxuICAgICAgaWYgKFRSWV9DTEFVU0VfS0VZV09SRFMuaGFzKHQudGV4dCkgJiYgdC5pbmRlbnQgPD0gYmFzZUluZGVudCArIDIpIGJyZWFrXG5cbiAgICAgIC8vIFx1MjUwMFx1MjUwMCBTZXF1ZW50aWFsIGNvbm5lY3RpdmU6IHN0YW5kYWxvbmUgYHRoZW5gIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgICAgLy8gYHRoZW5gIGFsb25lIG9uIGEgbGluZSBpbnRyb2R1Y2VzIHRoZSBuZXh0IHNlcXVlbnRpYWwgc3RlcCxcbiAgICAgIC8vIHdoaWNoIGlzIGEgYmxvY2sgYXQgYSBkZWVwZXIgaW5kZW50IGxldmVsLlxuICAgICAgaWYgKHQudGV4dCA9PT0gJ3RoZW4nKSB7XG4gICAgICAgIGNvbnN0IHRoZW5JbmRlbnQgPSB0LmluZGVudFxuICAgICAgICB0aGlzLmFkdmFuY2UoKSAvLyBjb25zdW1lIGB0aGVuYFxuICAgICAgICBjb25zdCBuZXh0ID0gdGhpcy5wZWVrKClcbiAgICAgICAgaWYgKG5leHQgJiYgbmV4dC5pbmRlbnQgPiB0aGVuSW5kZW50KSB7XG4gICAgICAgICAgY29uc3Qgc3RlcCA9IHRoaXMucGFyc2VCbG9jayh0aGVuSW5kZW50KVxuICAgICAgICAgIHN0ZXBzLnB1c2goc3RlcClcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyBcdTI1MDBcdTI1MDAgU2VxdWVudGlhbCBjb25uZWN0aXZlOiBgdGhlbiBYYCBhcyBwcmVmaXggXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgICAvLyBgdGhlbiBjYWxsIGZvb2AsIGB0aGVuIGVtaXQgYmFyYCwgZXRjLlxuICAgICAgLy8gVGhlIGB0aGVuYCBpcyBqdXN0IGEgdmlzdWFsIHNlcXVlbmNlciBcdTIwMTQgdGhlIHJlc3Qgb2YgdGhlIGxpbmUgaXMgdGhlIHN0ZXAuXG4gICAgICBpZiAodC50ZXh0LnN0YXJ0c1dpdGgoJ3RoZW4gJykpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICAgICAgY29uc3QgcmVzdCA9IHQudGV4dC5zbGljZSg1KS50cmltKClcbiAgICAgICAgY29uc3Qgc3RlcCA9IHRoaXMucGFyc2VTaW5nbGVMaW5lKHJlc3QsIHQuaW5kZW50LCB0KVxuICAgICAgICBzdGVwcy5wdXNoKHN0ZXApXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIFx1MjUwMFx1MjUwMCBSZWd1bGFyIHN0YXRlbWVudCAocG9zc2libHkgYSBwYXJhbGxlbCBncm91cCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgICBjb25zdCBzdG10ID0gdGhpcy5wYXJzZVN0YXRlbWVudE9yUGFyYWxsZWwodC5pbmRlbnQpXG4gICAgICBzdGVwcy5wdXNoKHN0bXQpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRvU2VxdWVuY2VPclNpbmdsZShzdGVwcylcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBQYXJhbGxlbCBncm91cCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKipcbiAgICogUGFyc2VzIG9uZSBzdGF0ZW1lbnQgb3IgYSBncm91cCBvZiBwYXJhbGxlbCBzdGF0ZW1lbnRzIGNvbm5lY3RlZCBieSBgYW5kYC5cbiAgICpcbiAgICogTGluZXMgZW5kaW5nIHdpdGggYSBzdGFuZGFsb25lIGBhbmRgIGluZGljYXRlIHRoYXQgdGhlIG5leHQgbGluZSBydW5zXG4gICAqIGNvbmN1cnJlbnRseS4gQWxsIHBhcmFsbGVsIGJyYW5jaGVzIGFyZSB3cmFwcGVkIGluIGEgUGFyYWxsZWxOb2RlLlxuICAgKlxuICAgKiBgYW5kYC1ncm91cHMgb25seSBhcHBseSB3aXRoaW4gdGhlIHNhbWUgaW5kZW50IGxldmVsLiBBIGRlZXBlci1pbmRlbnRlZFxuICAgKiBsaW5lIGFmdGVyIGBhbmRgIGlzIGFuIGVycm9yICh3b3VsZCBpbmRpY2F0ZSBhIGJsb2NrLCBidXQgYGFuZGAgaXNcbiAgICogYSBsaW5lLWxldmVsIGNvbm5lY3Rvciwgbm90IGEgYmxvY2sgb3BlbmVyKS5cbiAgICovXG4gIHByaXZhdGUgcGFyc2VTdGF0ZW1lbnRPclBhcmFsbGVsKGJsb2NrSW5kZW50OiBudW1iZXIpOiBMRVNOb2RlIHtcbiAgICBjb25zdCBicmFuY2hlczogTEVTTm9kZVtdID0gW11cblxuICAgIHdoaWxlICghdGhpcy5hdEVuZCgpKSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy5wZWVrKCkhXG5cbiAgICAgIC8vIFN0b3AgY29uZGl0aW9ucyBcdTIwMTQgc2FtZSBhcyBwYXJzZUJsb2NrJ3NcbiAgICAgIGlmICh0LmluZGVudCA8IGJsb2NrSW5kZW50KSBicmVha1xuICAgICAgaWYgKHQuaW5kZW50ID4gYmxvY2tJbmRlbnQpIGJyZWFrICAgLy8gc2hvdWxkbid0IGhhcHBlbiBoZXJlLCBzYWZldHkgZ3VhcmRcbiAgICAgIGlmIChCTE9DS19URVJNSU5BVE9SUy5oYXModC50ZXh0KSkgYnJlYWtcbiAgICAgIGlmIChUUllfQ0xBVVNFX0tFWVdPUkRTLmhhcyh0LnRleHQpKSBicmVha1xuICAgICAgaWYgKHQudGV4dCA9PT0gJ3RoZW4nIHx8IHQudGV4dC5zdGFydHNXaXRoKCd0aGVuICcpKSBicmVha1xuXG4gICAgICBjb25zdCBoYXNBbmQgPSBlbmRzV2l0aEFuZCh0LnRleHQpXG4gICAgICBjb25zdCBsaW5lVGV4dCA9IGhhc0FuZCA/IHN0cmlwVHJhaWxpbmdBbmQodC50ZXh0KSA6IHQudGV4dFxuXG4gICAgICB0aGlzLmFkdmFuY2UoKVxuXG4gICAgICBjb25zdCBzdG10ID0gdGhpcy5wYXJzZVNpbmdsZUxpbmUobGluZVRleHQsIHQuaW5kZW50LCB0KVxuICAgICAgYnJhbmNoZXMucHVzaChzdG10KVxuXG4gICAgICBpZiAoIWhhc0FuZCkgYnJlYWtcbiAgICB9XG5cbiAgICBpZiAoYnJhbmNoZXMubGVuZ3RoID09PSAwKSByZXR1cm4gZXhwcignJylcbiAgICBpZiAoYnJhbmNoZXMubGVuZ3RoID09PSAxKSByZXR1cm4gYnJhbmNoZXNbMF0hXG4gICAgcmV0dXJuIHsgdHlwZTogJ3BhcmFsbGVsJywgYnJhbmNoZXMgfSBzYXRpc2ZpZXMgUGFyYWxsZWxOb2RlXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgU2luZ2xlLWxpbmUgZGlzcGF0Y2ggXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgLyoqXG4gICAqIFBhcnNlcyBhIHNpbmdsZSBzdGF0ZW1lbnQgZnJvbSBpdHMgdGV4dCBjb250ZW50LlxuICAgKiBUaGUgdGV4dCBoYXMgYWxyZWFkeSBoYWQgYHRoZW4gYCBwcmVmaXggYW5kIHRyYWlsaW5nIGAgYW5kYCBzdHJpcHBlZC5cbiAgICpcbiAgICogRGlzcGF0Y2ggb3JkZXIgbWF0dGVyczogbW9yZSBzcGVjaWZpYyBwYXR0ZXJucyBtdXN0IGNvbWUgYmVmb3JlIGdlbmVyYWwgb25lcy5cbiAgICovXG4gIHByaXZhdGUgcGFyc2VTaW5nbGVMaW5lKHRleHQ6IHN0cmluZywgaW5kZW50OiBudW1iZXIsIHRva2VuOiBUb2tlbik6IExFU05vZGUge1xuICAgIGNvbnN0IGZpcnN0ID0gZmlyc3RXb3JkKHRleHQpXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgQmxvY2sgY29uc3RydWN0cyAoY29uc3VtZSBtdWx0aXBsZSBmb2xsb3dpbmcgdG9rZW5zKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAoZmlyc3QgPT09ICdtYXRjaCcpIHJldHVybiB0aGlzLnBhcnNlTWF0Y2godGV4dCwgaW5kZW50LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICd0cnknKSAgIHJldHVybiB0aGlzLnBhcnNlVHJ5KGluZGVudCwgdG9rZW4pXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgU2ltcGxlIHN0YXRlbWVudCBkaXNwYXRjaCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAoZmlyc3QgPT09ICdzZXQnKSAgICAgICByZXR1cm4gdGhpcy5wYXJzZVNldCh0ZXh0LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICdlbWl0JykgICAgICByZXR1cm4gdGhpcy5wYXJzZUVtaXQodGV4dCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAnYnJvYWRjYXN0JykgcmV0dXJuIHRoaXMucGFyc2VCcm9hZGNhc3QodGV4dCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAnY2FsbCcpICAgICAgcmV0dXJuIHRoaXMucGFyc2VDYWxsKHRleHQsIHRva2VuKVxuICAgIGlmIChmaXJzdCA9PT0gJ3dhaXQnKSAgICAgIHJldHVybiB0aGlzLnBhcnNlV2FpdCh0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBBc3luYyBiaW5kOiBgbmFtZSA8LSBAdmVyYiAndXJsJyBbYXJnc11gIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGlmICh0ZXh0LmluY2x1ZGVzKCcgPC0gJykpIHJldHVybiB0aGlzLnBhcnNlQmluZCh0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBBbmltYXRpb24gcHJpbWl0aXZlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGlmIChBTklNQVRJT05fUFJJTUlUSVZFUy5oYXMoZmlyc3QpKSByZXR1cm4gdGhpcy5wYXJzZUFuaW1hdGlvbih0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBVbmtub3duOiBzdG9yZSBhcyByYXcgZXhwcmVzc2lvbiAoZXNjYXBlIGhhdGNoIC8gZnV0dXJlIGtleXdvcmRzKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBVbmtub3duIHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICByZXR1cm4gZXhwcih0ZXh0KVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIE1hdGNoIGJsb2NrIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgcGFyc2VNYXRjaCh0ZXh0OiBzdHJpbmcsIGluZGVudDogbnVtYmVyLCB0b2tlbjogVG9rZW4pOiBNYXRjaE5vZGUge1xuICAgIC8vIGB0ZXh0YCBpcyBlLmcuIFwibWF0Y2ggcmVzcG9uc2VcIiBvciBcIm1hdGNoICRmZWVkU3RhdGVcIlxuICAgIGNvbnN0IHN1YmplY3RSYXcgPSB0ZXh0LnNsaWNlKCdtYXRjaCcubGVuZ3RoKS50cmltKClcbiAgICBjb25zdCBzdWJqZWN0OiBFeHByTm9kZSA9IGV4cHIoc3ViamVjdFJhdylcbiAgICBjb25zdCBhcm1zOiBNYXRjaEFybVtdID0gW11cblxuICAgIHdoaWxlICghdGhpcy5hdEVuZCgpKSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy5wZWVrKCkhXG5cbiAgICAgIC8vIC9tYXRjaCB0ZXJtaW5hdGVzIHRoZSBibG9ja1xuICAgICAgaWYgKHQudGV4dCA9PT0gJy9tYXRjaCcpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgLy8gT25seSBjb25zdW1lIGFybSBsaW5lcyBhdCB0aGUgZXhwZWN0ZWQgYXJtIGluZGVudCAoaW5kZW50ICsgMilcbiAgICAgIGlmICh0LmluZGVudCA8PSBpbmRlbnQpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gVW5jbG9zZWQgbWF0Y2ggYmxvY2sgXHUyMDE0IG1pc3NpbmcgL21hdGNoYCwgdG9rZW4pXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIC8vIFBhcnNlIGFuIGFybTogYFtwYXR0ZXJuXSAtPmAgb3IgYFtwYXR0ZXJuXSAtPiBib2R5YFxuICAgICAgaWYgKHQudGV4dC5zdGFydHNXaXRoKCdbJykpIHtcbiAgICAgICAgYXJtcy5wdXNoKHRoaXMucGFyc2VNYXRjaEFybSh0LmluZGVudCwgdCkpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIFNraXAgdW5leHBlY3RlZCBsaW5lcyBpbnNpZGUgbWF0Y2hcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIFVuZXhwZWN0ZWQgdG9rZW4gaW5zaWRlIG1hdGNoIGJsb2NrOiAke0pTT04uc3RyaW5naWZ5KHQudGV4dCl9YCwgdClcbiAgICAgIHRoaXMuYWR2YW5jZSgpXG4gICAgfVxuXG4gICAgcmV0dXJuIHsgdHlwZTogJ21hdGNoJywgc3ViamVjdCwgYXJtcyB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlTWF0Y2hBcm0oYXJtSW5kZW50OiBudW1iZXIsIHRva2VuOiBUb2tlbik6IE1hdGNoQXJtIHtcbiAgICBjb25zdCB0ID0gdGhpcy5hZHZhbmNlKCkgLy8gY29uc3VtZSB0aGUgYXJtIGxpbmVcblxuICAgIC8vIFNwbGl0IG9uIGAgLT5gIHRvIHNlcGFyYXRlIHBhdHRlcm4gZnJvbSBib2R5XG4gICAgY29uc3QgYXJyb3dJZHggPSB0LnRleHQuaW5kZXhPZignIC0+JylcbiAgICBpZiAoYXJyb3dJZHggPT09IC0xKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYXRjaCBhcm0gbWlzc2luZyAnLT4nOiAke0pTT04uc3RyaW5naWZ5KHQudGV4dCl9YCwgdClcbiAgICAgIHJldHVybiB7IHBhdHRlcm5zOiBbeyBraW5kOiAnd2lsZGNhcmQnIH1dLCBib2R5OiBleHByKCcnKSB9XG4gICAgfVxuXG4gICAgY29uc3QgcGF0dGVyblJhdyA9IHQudGV4dC5zbGljZSgwLCBhcnJvd0lkeCkudHJpbSgpXG4gICAgY29uc3QgYWZ0ZXJBcnJvdyA9IHQudGV4dC5zbGljZShhcnJvd0lkeCArIDMpLnRyaW0oKSAgLy8gZXZlcnl0aGluZyBhZnRlciBgLT5gXG5cbiAgICBjb25zdCBwYXR0ZXJucyA9IHBhcnNlUGF0dGVybnMocGF0dGVyblJhdylcblxuICAgIGxldCBib2R5OiBMRVNOb2RlXG4gICAgaWYgKGFmdGVyQXJyb3cubGVuZ3RoID4gMCkge1xuICAgICAgLy8gSW5saW5lIGFybTogYFsnZXJyb3InXSAtPiBzZXQgJGZlZWRTdGF0ZSB0byAnZXJyb3InYFxuICAgICAgYm9keSA9IHRoaXMucGFyc2VTaW5nbGVMaW5lKGFmdGVyQXJyb3csIGFybUluZGVudCwgdG9rZW4pXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE11bHRpLWxpbmUgYXJtOiBib2R5IGlzIHRoZSBkZWVwZXItaW5kZW50ZWQgYmxvY2tcbiAgICAgIGJvZHkgPSB0aGlzLnBhcnNlQmxvY2soYXJtSW5kZW50KVxuICAgIH1cblxuICAgIHJldHVybiB7IHBhdHRlcm5zLCBib2R5IH1cbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBUcnkgYmxvY2sgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBwYXJzZVRyeShpbmRlbnQ6IG51bWJlciwgdG9rZW46IFRva2VuKTogVHJ5Tm9kZSB7XG4gICAgLy8gTm90ZTogdGhlIGB0cnlgIHRva2VuIHdhcyBhbHJlYWR5IGNvbnN1bWVkIGJ5IHRoZSBjYWxsaW5nIHBhcnNlU3RhdGVtZW50T3JQYXJhbGxlbC5cbiAgICAvLyBEbyBOT1QgY2FsbCB0aGlzLmFkdmFuY2UoKSBoZXJlIFx1MjAxNCB0aGF0IHdvdWxkIHNraXAgdGhlIGZpcnN0IGJvZHkgbGluZS5cblxuICAgIC8vIFBhcnNlIGJvZHkgXHUyMDE0IHN0b3BzIGF0IHJlc2N1ZS9hZnRlcndhcmRzLy90cnkgYXQgdGhlIHNhbWUgaW5kZW50IGxldmVsXG4gICAgY29uc3QgYm9keSA9IHRoaXMucGFyc2VCbG9jayhpbmRlbnQpXG5cbiAgICBsZXQgcmVzY3VlOiBMRVNOb2RlIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG4gICAgbGV0IGFmdGVyd2FyZHM6IExFU05vZGUgfCB1bmRlZmluZWQgPSB1bmRlZmluZWRcblxuICAgIC8vIHJlc2N1ZSBjbGF1c2UgKG9wdGlvbmFsKVxuICAgIGlmICh0aGlzLnBlZWsoKT8udGV4dCA9PT0gJ3Jlc2N1ZScgJiYgdGhpcy5wZWVrKCk/LmluZGVudCA9PT0gaW5kZW50KSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKSAvLyBjb25zdW1lIGByZXNjdWVgXG4gICAgICByZXNjdWUgPSB0aGlzLnBhcnNlQmxvY2soaW5kZW50KVxuICAgIH1cblxuICAgIC8vIGFmdGVyd2FyZHMgY2xhdXNlIChvcHRpb25hbClcbiAgICBpZiAodGhpcy5wZWVrKCk/LnRleHQgPT09ICdhZnRlcndhcmRzJyAmJiB0aGlzLnBlZWsoKT8uaW5kZW50ID09PSBpbmRlbnQpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpIC8vIGNvbnN1bWUgYGFmdGVyd2FyZHNgXG4gICAgICBhZnRlcndhcmRzID0gdGhpcy5wYXJzZUJsb2NrKGluZGVudClcbiAgICB9XG5cbiAgICAvLyBDb25zdW1lIC90cnlcbiAgICBpZiAodGhpcy5wZWVrKCk/LnRleHQgPT09ICcvdHJ5Jykge1xuICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gVW5jbG9zZWQgdHJ5IGJsb2NrIFx1MjAxNCBtaXNzaW5nIC90cnlgLCB0b2tlbilcbiAgICB9XG5cbiAgICBjb25zdCB0cnlOb2RlOiBUcnlOb2RlID0geyB0eXBlOiAndHJ5JywgYm9keSB9XG4gICAgaWYgKHJlc2N1ZSAgICAhPT0gdW5kZWZpbmVkKSB0cnlOb2RlLnJlc2N1ZSAgICAgPSByZXNjdWVcbiAgICBpZiAoYWZ0ZXJ3YXJkcyAhPT0gdW5kZWZpbmVkKSB0cnlOb2RlLmFmdGVyd2FyZHMgPSBhZnRlcndhcmRzXG4gICAgcmV0dXJuIHRyeU5vZGVcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBTaW1wbGUgc3RhdGVtZW50IHBhcnNlcnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBwYXJzZVNldCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IFNldE5vZGUge1xuICAgIC8vIGBzZXQgJHNpZ25hbCB0byBleHByYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9ec2V0XFxzK1xcJChcXHcrKVxccyt0b1xccysoLispJC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgc2V0IHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7IHR5cGU6ICdzZXQnLCBzaWduYWw6ICc/PycsIHZhbHVlOiBleHByKHRleHQpIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdzZXQnLFxuICAgICAgc2lnbmFsOiBtWzFdISxcbiAgICAgIHZhbHVlOiBleHByKG1bMl0hLnRyaW0oKSksXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUVtaXQodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBFbWl0Tm9kZSB7XG4gICAgLy8gYGVtaXQgZXZlbnQ6bmFtZSBbcGF5bG9hZCwgLi4uXWAgb3IgYGVtaXQgZXZlbnQ6bmFtZWBcbiAgICBjb25zdCB7IG5hbWUsIHBheWxvYWQgfSA9IHBhcnNlRXZlbnRMaW5lKHRleHQuc2xpY2UoJ2VtaXQnLmxlbmd0aCkudHJpbSgpLCB0b2tlbilcbiAgICByZXR1cm4geyB0eXBlOiAnZW1pdCcsIGV2ZW50OiBuYW1lLCBwYXlsb2FkIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VCcm9hZGNhc3QodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBCcm9hZGNhc3ROb2RlIHtcbiAgICBjb25zdCB7IG5hbWUsIHBheWxvYWQgfSA9IHBhcnNlRXZlbnRMaW5lKHRleHQuc2xpY2UoJ2Jyb2FkY2FzdCcubGVuZ3RoKS50cmltKCksIHRva2VuKVxuICAgIHJldHVybiB7IHR5cGU6ICdicm9hZGNhc3QnLCBldmVudDogbmFtZSwgcGF5bG9hZCB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQ2FsbCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IENhbGxOb2RlIHtcbiAgICAvLyBgY2FsbCBjb21tYW5kOm5hbWUgW2FyZzogdmFsdWUsIC4uLl1gIG9yIGBjYWxsIGNvbW1hbmQ6bmFtZWBcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXmNhbGxcXHMrKFteXFxzXFxbXSspXFxzKig/OlxcWyguKylcXF0pPyQvKVxuICAgIGlmICghbSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gTWFsZm9ybWVkIGNhbGwgc3RhdGVtZW50OiAke0pTT04uc3RyaW5naWZ5KHRleHQpfWAsIHRva2VuKVxuICAgICAgcmV0dXJuIHsgdHlwZTogJ2NhbGwnLCBjb21tYW5kOiAnPz8nLCBhcmdzOiB7fSB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnY2FsbCcsXG4gICAgICBjb21tYW5kOiBtWzFdISxcbiAgICAgIGFyZ3M6IHBhcnNlQXJnTGlzdChtWzJdID8/ICcnKSxcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlV2FpdCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IFdhaXROb2RlIHtcbiAgICAvLyBgd2FpdCAzMDBtc2Agb3IgYHdhaXQgKGF0dGVtcHQgKyAxKSAqIDUwMG1zYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9ed2FpdFxccysoLis/KW1zJC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgd2FpdCBzdGF0ZW1lbnQ6ICR7SlNPTi5zdHJpbmdpZnkodGV4dCl9YCwgdG9rZW4pXG4gICAgICByZXR1cm4geyB0eXBlOiAnd2FpdCcsIG1zOiAwIH1cbiAgICB9XG4gICAgY29uc3QgbXNFeHByID0gbVsxXSEudHJpbSgpXG4gICAgLy8gU2ltcGxlIGxpdGVyYWxcbiAgICBjb25zdCBsaXRlcmFsID0gTnVtYmVyKG1zRXhwcilcbiAgICBpZiAoIU51bWJlci5pc05hTihsaXRlcmFsKSkgcmV0dXJuIHsgdHlwZTogJ3dhaXQnLCBtczogbGl0ZXJhbCB9XG4gICAgLy8gRXhwcmVzc2lvbiBcdTIwMTQgc3RvcmUgYXMgMCB3aXRoIHRoZSBleHByZXNzaW9uIGFzIGEgY29tbWVudCAoZXhlY3V0b3Igd2lsbCBldmFsKVxuICAgIC8vIFBoYXNlIDMgd2lsbCBoYW5kbGUgZHluYW1pYyBkdXJhdGlvbnMgcHJvcGVybHlcbiAgICByZXR1cm4geyB0eXBlOiAnd2FpdCcsIG1zOiAwIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VCaW5kKHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogQmluZE5vZGUge1xuICAgIC8vIGBuYW1lIDwtIEB2ZXJiICd1cmwnIFthcmdzXWBcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXihcXHcrKVxccys8LVxccytAKFxcdyspXFxzKycoW14nXSspJ1xccyooPzpcXFsoLispXFxdKT8kLylcbiAgICBpZiAoIW0pIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIE1hbGZvcm1lZCBiaW5kIHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdiaW5kJyxcbiAgICAgICAgbmFtZTogJz8/JyxcbiAgICAgICAgYWN0aW9uOiB7IHR5cGU6ICdhY3Rpb24nLCB2ZXJiOiAnZ2V0JywgdXJsOiAnJywgYXJnczoge30gfSxcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgYWN0aW9uOiBBY3Rpb25Ob2RlID0ge1xuICAgICAgdHlwZTogJ2FjdGlvbicsXG4gICAgICB2ZXJiOiBtWzJdIS50b0xvd2VyQ2FzZSgpLFxuICAgICAgdXJsOiBtWzNdISxcbiAgICAgIGFyZ3M6IHBhcnNlQXJnTGlzdChtWzRdID8/ICcnKSxcbiAgICB9XG4gICAgcmV0dXJuIHsgdHlwZTogJ2JpbmQnLCBuYW1lOiBtWzFdISwgYWN0aW9uIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VBbmltYXRpb24odGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBBbmltYXRpb25Ob2RlIHtcbiAgICAvLyBgcHJpbWl0aXZlIHNlbGVjdG9yIGR1cmF0aW9uIGVhc2luZyBbb3B0aW9uc11gXG4gICAgLy8gRXhhbXBsZXM6XG4gICAgLy8gICBzdGFnZ2VyLWVudGVyIC5mZWVkLWl0ZW0gIDEyMG1zIGVhc2Utb3V0IFtnYXA6IDQwbXMgIGZyb206IHJpZ2h0XVxuICAgIC8vICAgcHVsc2UgLmZlZWQtaXRlbS5pcy11cGRhdGVkICAzMDBtcyBlYXNlLWluLW91dFxuICAgIC8vICAgc2xpZGUtb3V0IFtkYXRhLWl0ZW0taWQ6IGlkXSAgMTUwbXMgZWFzZS1pbiBbdG86IHJpZ2h0XVxuXG4gICAgLy8gVG9rZW5pemU6IHNwbGl0IG9uIHdoaXRlc3BhY2UgYnV0IHByZXNlcnZlIFsuLi5dIGdyb3Vwc1xuICAgIGNvbnN0IHBhcnRzID0gc3BsaXRBbmltYXRpb25MaW5lKHRleHQpXG5cbiAgICBjb25zdCBwcmltaXRpdmUgPSBwYXJ0c1swXSA/PyAnJ1xuICAgIGNvbnN0IHNlbGVjdG9yICA9IHBhcnRzWzFdID8/ICcnXG4gICAgY29uc3QgZHVyYXRpb25TdHIgPSBwYXJ0c1syXSA/PyAnMG1zJ1xuICAgIGNvbnN0IGVhc2luZyAgICA9IHBhcnRzWzNdID8/ICdlYXNlJ1xuICAgIGNvbnN0IG9wdGlvbnNTdHIgPSBwYXJ0c1s0XSA/PyAnJyAgLy8gbWF5IGJlIGFic2VudFxuXG4gICAgY29uc3QgZHVyYXRpb25NcyA9IHBhcnNlSW50KGR1cmF0aW9uU3RyLCAxMClcblxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnYW5pbWF0aW9uJyxcbiAgICAgIHByaW1pdGl2ZSxcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgZHVyYXRpb246IE51bWJlci5pc05hTihkdXJhdGlvbk1zKSA/IDAgOiBkdXJhdGlvbk1zLFxuICAgICAgZWFzaW5nLFxuICAgICAgb3B0aW9uczogcGFyc2VBbmltYXRpb25PcHRpb25zKG9wdGlvbnNTdHIpLFxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFBhdHRlcm4gcGFyc2luZ1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogUGFyc2VzIGEgcGF0dGVybiBncm91cCBsaWtlIGBbaXQgICBvayAgIF1gLCBgW25pbCAgZXJyb3JdYCwgYFtfXWAsXG4gKiBgWydlcnJvciddYCwgYFswIHwgMSB8IDJdYC5cbiAqXG4gKiBSZXR1cm5zIGFuIGFycmF5IG9mIFBhdHRlcm5Ob2RlIFx1MjAxNCBvbmUgcGVyIGVsZW1lbnQgaW4gdGhlIHR1cGxlIHBhdHRlcm4uXG4gKiBGb3Igb3ItcGF0dGVybnMgKGAwIHwgMSB8IDJgKSwgcmV0dXJucyBhIHNpbmdsZSBPclBhdHRlcm5Ob2RlLlxuICovXG5mdW5jdGlvbiBwYXJzZVBhdHRlcm5zKHJhdzogc3RyaW5nKTogUGF0dGVybk5vZGVbXSB7XG4gIC8vIFN0cmlwIG91dGVyIGJyYWNrZXRzXG4gIGNvbnN0IGlubmVyID0gcmF3LnJlcGxhY2UoL15cXFt8XFxdJC9nLCAnJykudHJpbSgpXG5cbiAgLy8gQ2hlY2sgZm9yIG9yLXBhdHRlcm46IGNvbnRhaW5zIGAgfCBgXG4gIGlmIChpbm5lci5pbmNsdWRlcygnIHwgJykgfHwgaW5uZXIuaW5jbHVkZXMoJ3wnKSkge1xuICAgIGNvbnN0IGFsdGVybmF0aXZlcyA9IGlubmVyLnNwbGl0KC9cXHMqXFx8XFxzKi8pLm1hcChwID0+IHBhcnNlU2luZ2xlUGF0dGVybihwLnRyaW0oKSkpXG4gICAgcmV0dXJuIFt7IGtpbmQ6ICdvcicsIHBhdHRlcm5zOiBhbHRlcm5hdGl2ZXMgfV1cbiAgfVxuXG4gIC8vIFR1cGxlIHBhdHRlcm46IHNwYWNlLXNlcGFyYXRlZCBlbGVtZW50c1xuICAvLyBVc2UgYSBjdXN0b20gc3BsaXQgdG8gaGFuZGxlIG11bHRpcGxlIHNwYWNlcyAoYWxpZ25tZW50IHBhZGRpbmcpXG4gIHJldHVybiBpbm5lci50cmltKCkuc3BsaXQoL1xcc3syLH18XFxzKD89XFxTKS8pLmZpbHRlcihzID0+IHMudHJpbSgpKVxuICAgIC5tYXAocCA9PiBwYXJzZVNpbmdsZVBhdHRlcm4ocC50cmltKCkpKVxufVxuXG5mdW5jdGlvbiBwYXJzZVNpbmdsZVBhdHRlcm4oczogc3RyaW5nKTogUGF0dGVybk5vZGUge1xuICBpZiAocyA9PT0gJ18nKSAgIHJldHVybiB7IGtpbmQ6ICd3aWxkY2FyZCcgfVxuICBpZiAocyA9PT0gJ25pbCcpIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IG51bGwgfVxuXG4gIC8vIFN0cmluZyBsaXRlcmFsOiAndmFsdWUnXG4gIGlmIChzLnN0YXJ0c1dpdGgoXCInXCIpICYmIHMuZW5kc1dpdGgoXCInXCIpKSB7XG4gICAgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogcy5zbGljZSgxLCAtMSkgfVxuICB9XG5cbiAgLy8gTnVtYmVyIGxpdGVyYWxcbiAgY29uc3QgbiA9IE51bWJlcihzKVxuICBpZiAoIU51bWJlci5pc05hTihuKSkgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogbiB9XG5cbiAgLy8gQm9vbGVhblxuICBpZiAocyA9PT0gJ3RydWUnKSAgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogdHJ1ZSB9XG4gIGlmIChzID09PSAnZmFsc2UnKSByZXR1cm4geyBraW5kOiAnbGl0ZXJhbCcsIHZhbHVlOiBmYWxzZSB9XG5cbiAgLy8gRXZlcnl0aGluZyBlbHNlIGlzIGEgYmluZGluZyAoY2FwdHVyZXMgdGhlIHZhbHVlIGZvciB1c2UgaW4gdGhlIGJvZHkpXG4gIHJldHVybiB7IGtpbmQ6ICdiaW5kaW5nJywgbmFtZTogcyB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gQXJndW1lbnQgbGlzdCBwYXJzaW5nXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBQYXJzZXMgYGtleTogdmFsdWUgIGtleTI6IHZhbHVlMmAgZnJvbSBpbnNpZGUgYSBbLi4uXSBhcmd1bWVudCBibG9jay5cbiAqIFZhbHVlcyBhcmUgc3RvcmVkIGFzIEV4cHJOb2RlIChldmFsdWF0ZWQgYXQgcnVudGltZSkuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlQXJnTGlzdChyYXc6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIEV4cHJOb2RlPiB7XG4gIGlmICghcmF3LnRyaW0oKSkgcmV0dXJuIHt9XG5cbiAgY29uc3QgcmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCBFeHByTm9kZT4gPSB7fVxuXG4gIC8vIFNwbGl0IG9uIGAgIGAgKGRvdWJsZS1zcGFjZSB1c2VkIGFzIHNlcGFyYXRvciBpbiBMRVMgc3R5bGUpXG4gIC8vIGJ1dCBhbHNvIGhhbmRsZSBzaW5nbGUgYCAga2V5OiB2YWx1ZWAgZW50cmllc1xuICAvLyBTaW1wbGUgcmVnZXg6IGB3b3JkOiByZXN0X3VudGlsX25leHRfd29yZDpgXG4gIGNvbnN0IHBhaXJzID0gcmF3LnRyaW0oKS5zcGxpdCgvKD88PVxcUylcXHN7Mix9KD89XFx3KS8pXG4gIGZvciAoY29uc3QgcGFpciBvZiBwYWlycykge1xuICAgIGNvbnN0IGNvbG9uSWR4ID0gcGFpci5pbmRleE9mKCc6JylcbiAgICBpZiAoY29sb25JZHggPT09IC0xKSBjb250aW51ZVxuICAgIGNvbnN0IGtleSAgID0gcGFpci5zbGljZSgwLCBjb2xvbklkeCkudHJpbSgpXG4gICAgY29uc3QgdmFsdWUgPSBwYWlyLnNsaWNlKGNvbG9uSWR4ICsgMSkudHJpbSgpXG4gICAgaWYgKGtleSkgcmVzdWx0W2tleV0gPSBleHByKHZhbHVlKVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEV2ZW50IGxpbmUgcGFyc2luZzogYGV2ZW50Om5hbWUgW3BheWxvYWQuLi5dYFxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIHBhcnNlRXZlbnRMaW5lKFxuICByYXc6IHN0cmluZyxcbiAgdG9rZW46IFRva2VuXG4pOiB7IG5hbWU6IHN0cmluZzsgcGF5bG9hZDogRXhwck5vZGVbXSB9IHtcbiAgLy8gYGZlZWQ6ZGF0YS1yZWFkeWAgb3IgYGZlZWQ6ZGF0YS1yZWFkeSBbJGZlZWRJdGVtc11gIG9yIGBmZWVkOmVycm9yIFskZXJyb3JdYFxuICBjb25zdCBicmFja2V0SWR4ID0gcmF3LmluZGV4T2YoJ1snKVxuICBpZiAoYnJhY2tldElkeCA9PT0gLTEpIHtcbiAgICByZXR1cm4geyBuYW1lOiByYXcudHJpbSgpLCBwYXlsb2FkOiBbXSB9XG4gIH1cbiAgY29uc3QgbmFtZSA9IHJhdy5zbGljZSgwLCBicmFja2V0SWR4KS50cmltKClcbiAgY29uc3QgcGF5bG9hZFJhdyA9IHJhdy5zbGljZShicmFja2V0SWR4ICsgMSwgcmF3Lmxhc3RJbmRleE9mKCddJykpLnRyaW0oKVxuXG4gIC8vIFBheWxvYWQgZWxlbWVudHMgYXJlIGNvbW1hIG9yIHNwYWNlIHNlcGFyYXRlZCBleHByZXNzaW9uc1xuICBjb25zdCBwYXlsb2FkOiBFeHByTm9kZVtdID0gcGF5bG9hZFJhd1xuICAgID8gcGF5bG9hZFJhdy5zcGxpdCgvLFxccyp8XFxzezIsfS8pLm1hcChzID0+IGV4cHIocy50cmltKCkpKS5maWx0ZXIoZSA9PiBlLnJhdylcbiAgICA6IFtdXG5cbiAgcmV0dXJuIHsgbmFtZSwgcGF5bG9hZCB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gQW5pbWF0aW9uIGxpbmUgcGFyc2luZ1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogU3BsaXRzIGFuIGFuaW1hdGlvbiBsaW5lIGludG8gaXRzIHN0cnVjdHVyYWwgcGFydHMsIHByZXNlcnZpbmcgWy4uLl0gZ3JvdXBzLlxuICpcbiAqIElucHV0OiAgYHN0YWdnZXItZW50ZXIgLmZlZWQtaXRlbSAgMTIwbXMgZWFzZS1vdXQgW2dhcDogNDBtcyAgZnJvbTogcmlnaHRdYFxuICogT3V0cHV0OiBbJ3N0YWdnZXItZW50ZXInLCAnLmZlZWQtaXRlbScsICcxMjBtcycsICdlYXNlLW91dCcsICdbZ2FwOiA0MG1zICBmcm9tOiByaWdodF0nXVxuICovXG5mdW5jdGlvbiBzcGxpdEFuaW1hdGlvbkxpbmUodGV4dDogc3RyaW5nKTogc3RyaW5nW10ge1xuICBjb25zdCBwYXJ0czogc3RyaW5nW10gPSBbXVxuICBsZXQgY3VycmVudCA9ICcnXG4gIGxldCBpbkJyYWNrZXQgPSAwXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0ZXh0Lmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY2ggPSB0ZXh0W2ldIVxuICAgIGlmIChjaCA9PT0gJ1snKSB7XG4gICAgICBpbkJyYWNrZXQrK1xuICAgICAgY3VycmVudCArPSBjaFxuICAgIH0gZWxzZSBpZiAoY2ggPT09ICddJykge1xuICAgICAgaW5CcmFja2V0LS1cbiAgICAgIGN1cnJlbnQgKz0gY2hcbiAgICB9IGVsc2UgaWYgKGNoID09PSAnICcgJiYgaW5CcmFja2V0ID09PSAwKSB7XG4gICAgICBpZiAoY3VycmVudC50cmltKCkpIHBhcnRzLnB1c2goY3VycmVudC50cmltKCkpXG4gICAgICBjdXJyZW50ID0gJydcbiAgICB9IGVsc2Uge1xuICAgICAgY3VycmVudCArPSBjaFxuICAgIH1cbiAgfVxuICBpZiAoY3VycmVudC50cmltKCkpIHBhcnRzLnB1c2goY3VycmVudC50cmltKCkpXG4gIHJldHVybiBwYXJ0c1xufVxuXG4vKipcbiAqIFBhcnNlcyBhbmltYXRpb24gb3B0aW9ucyBmcm9tIGEgYFtrZXk6IHZhbHVlICBrZXkyOiB2YWx1ZTJdYCBzdHJpbmcuXG4gKiBUaGUgb3V0ZXIgYnJhY2tldHMgYXJlIGluY2x1ZGVkIGluIHRoZSBpbnB1dC5cbiAqL1xuZnVuY3Rpb24gcGFyc2VBbmltYXRpb25PcHRpb25zKHJhdzogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgRXhwck5vZGU+IHtcbiAgaWYgKCFyYXcudHJpbSgpKSByZXR1cm4ge31cbiAgLy8gU3RyaXAgb3V0ZXIgYnJhY2tldHNcbiAgY29uc3QgaW5uZXIgPSByYXcucmVwbGFjZSgvXlxcW3xcXF0kL2csICcnKS50cmltKClcbiAgcmV0dXJuIHBhcnNlQXJnTGlzdChpbm5lcilcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBVdGlsaXRpZXNcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5mdW5jdGlvbiBleHByKHJhdzogc3RyaW5nKTogRXhwck5vZGUge1xuICByZXR1cm4geyB0eXBlOiAnZXhwcicsIHJhdyB9XG59XG5cbmZ1bmN0aW9uIGZpcnN0V29yZCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdGV4dC5zcGxpdCgvXFxzKy8pWzBdID8/ICcnXG59XG5cbmZ1bmN0aW9uIHRvU2VxdWVuY2VPclNpbmdsZShzdGVwczogTEVTTm9kZVtdKTogTEVTTm9kZSB7XG4gIGlmIChzdGVwcy5sZW5ndGggPT09IDApIHJldHVybiBleHByKCcnKVxuICBpZiAoc3RlcHMubGVuZ3RoID09PSAxKSByZXR1cm4gc3RlcHNbMF0hXG4gIHJldHVybiB7IHR5cGU6ICdzZXF1ZW5jZScsIHN0ZXBzIH0gc2F0aXNmaWVzIFNlcXVlbmNlTm9kZVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFBhcnNlIGVycm9yXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZXhwb3J0IGNsYXNzIExFU1BhcnNlRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZywgcHVibGljIHJlYWRvbmx5IHRva2VuOiBUb2tlbiB8IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IGxvYyA9IHRva2VuID8gYCAobGluZSAke3Rva2VuLmxpbmVOdW19OiAke0pTT04uc3RyaW5naWZ5KHRva2VuLnRleHQpfSlgIDogJydcbiAgICBzdXBlcihgW0xFUzpwYXJzZXJdICR7bWVzc2FnZX0ke2xvY31gKVxuICAgIHRoaXMubmFtZSA9ICdMRVNQYXJzZUVycm9yJ1xuICB9XG59XG4iLCAiaW1wb3J0IHsgc3RyaXBCb2R5IH0gZnJvbSAnLi9zdHJpcEJvZHkuanMnXG5pbXBvcnQgeyB0b2tlbml6ZSB9IGZyb20gJy4vdG9rZW5pemVyLmpzJ1xuaW1wb3J0IHsgTEVTUGFyc2VyIH0gZnJvbSAnLi9wYXJzZXIuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICcuL2FzdC5qcydcblxuZXhwb3J0IHsgTEVTUGFyc2VyLCBMRVNQYXJzZUVycm9yIH0gZnJvbSAnLi9wYXJzZXIuanMnXG5leHBvcnQgeyB0b2tlbml6ZSwgZW5kc1dpdGhBbmQsIHN0cmlwVHJhaWxpbmdBbmQgfSBmcm9tICcuL3Rva2VuaXplci5qcydcbmV4cG9ydCB7IHN0cmlwQm9keSB9IGZyb20gJy4vc3RyaXBCb2R5LmpzJ1xuZXhwb3J0IHR5cGUgeyBUb2tlbiB9IGZyb20gJy4vdG9rZW5pemVyLmpzJ1xuZXhwb3J0ICogZnJvbSAnLi9hc3QuanMnXG5leHBvcnQgKiBmcm9tICcuL2NvbmZpZy5qcydcblxuLyoqXG4gKiBQYXJzZSBhIHJhdyBMRVMgYm9keSBzdHJpbmcgKGZyb20gYSBkbz0sIGhhbmRsZT0sIG9yIHJ1bj0gYXR0cmlidXRlKVxuICogaW50byBhIHR5cGVkIEFTVCBub2RlLlxuICpcbiAqIFRoaXMgaXMgdGhlIHB1YmxpYyBlbnRyeSBwb2ludCBmb3IgUGhhc2UgMjpcbiAqICAgLSBTdHJpcHMgYmFja3RpY2sgd3JhcHBlciBhbmQgbm9ybWFsaXplcyBpbmRlbnRhdGlvbiAoc3RyaXBCb2R5KVxuICogICAtIFRva2VuaXplcyBpbnRvIGxpbmVzIHdpdGggaW5kZW50IGxldmVscyAodG9rZW5pemUpXG4gKiAgIC0gUGFyc2VzIGludG8gYSB0eXBlZCBMRVNOb2RlIEFTVCAoTEVTUGFyc2VyKVxuICpcbiAqIEB0aHJvd3MgTEVTUGFyc2VFcnJvciBvbiB1bnJlY292ZXJhYmxlIHN5bnRheCBlcnJvcnMgKGN1cnJlbnRseSBzb2Z0LXdhcm5zIGluc3RlYWQpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUxFUyhyYXc6IHN0cmluZyk6IExFU05vZGUge1xuICBjb25zdCBzdHJpcHBlZCA9IHN0cmlwQm9keShyYXcpXG4gIGNvbnN0IHRva2VucyAgID0gdG9rZW5pemUoc3RyaXBwZWQpXG4gIGNvbnN0IHBhcnNlciAgID0gbmV3IExFU1BhcnNlcih0b2tlbnMpXG4gIHJldHVybiBwYXJzZXIucGFyc2UoKVxufVxuIiwgImltcG9ydCB7IENvbW1hbmRSZWdpc3RyeSB9IGZyb20gJ0BydW50aW1lL3JlZ2lzdHJ5LmpzJ1xuaW1wb3J0IHsgTW9kdWxlUmVnaXN0cnkgfSBmcm9tICdAbW9kdWxlcy90eXBlcy5qcydcbmltcG9ydCB7IHJlYWRDb25maWcsIGxvZ0NvbmZpZyB9IGZyb20gJ0BwYXJzZXIvcmVhZGVyLmpzJ1xuaW1wb3J0IHsgcGFyc2VMRVMgfSBmcm9tICdAcGFyc2VyL2luZGV4LmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNDb25maWcgfSBmcm9tICdAcGFyc2VyL2NvbmZpZy5qcydcbmltcG9ydCB0eXBlIHsgTEVTTm9kZSB9IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuXG4vKipcbiAqIDxsb2NhbC1ldmVudC1zY3JpcHQ+IFx1MjAxNCB0aGUgaG9zdCBjdXN0b20gZWxlbWVudC5cbiAqXG4gKiBSZXNwb25zaWJpbGl0aWVzIChidWlsdCB1cCBhY3Jvc3MgcGhhc2VzKTpcbiAqICAgUGhhc2UgMCAgUmVnaXN0ZXIgYXMgY3VzdG9tIGVsZW1lbnQsIGV4cG9zZSB0eXBlZCBhdHRyaWJ1dGUgQVBJXG4gKiAgIFBoYXNlIDEgIFdhbGsgY2hpbGRyZW4gXHUyMTkyIGJ1aWxkIExFU0NvbmZpZywgbG9nIHN0cnVjdHVyZWQgb3V0cHV0XG4gKiAgIFBoYXNlIDIgIFBhcnNlIGFsbCBMRVMgYm9keSBzdHJpbmdzIFx1MjE5MiBBU1QgIFx1MjE5MCBjdXJyZW50XG4gKiAgIFBoYXNlIDMgIFJ1biB0aGUgZXhlY3V0b3JcbiAqICAgUGhhc2UgNCAgV2lyZSBjb21tYW5kIHJlZ2lzdHJ5ICsgZXZlbnQgbGlzdGVuZXJzXG4gKiAgIFBoYXNlIDUgIEF0dGFjaCBJbnRlcnNlY3Rpb25PYnNlcnZlciBmb3Igb24tZW50ZXIgLyBvbi1leGl0XG4gKiAgIFBoYXNlIDYgIENvbm5lY3QgRGF0YXN0YXIgcGx1Z2luIChlZmZlY3QsIHNpZ25hbClcbiAqICAgUGhhc2UgNyAgQWN0aXZhdGUgYW5pbWF0aW9uIG1vZHVsZVxuICogICBQaGFzZSA4ICBMb2FkIDx1c2UtbW9kdWxlPiBlbnRyaWVzXG4gKi9cblxuLyoqIFBhcnNlZCBjb21tYW5kOiBjb25maWcgZGVjbCArIGl0cyBjb21waWxlZCBBU1QgYm9keSAqL1xuaW50ZXJmYWNlIFBhcnNlZENvbW1hbmQge1xuICBuYW1lOiBzdHJpbmdcbiAgZ3VhcmQ6IHN0cmluZyB8IG51bGxcbiAgYXJnc1Jhdzogc3RyaW5nXG4gIGJvZHk6IExFU05vZGVcbn1cblxuLyoqIFBhcnNlZCBldmVudCBoYW5kbGVyOiBldmVudCBuYW1lICsgY29tcGlsZWQgQVNUIGhhbmRsZSBib2R5ICovXG5pbnRlcmZhY2UgUGFyc2VkRXZlbnRIYW5kbGVyIHtcbiAgZXZlbnQ6IHN0cmluZ1xuICBib2R5OiBMRVNOb2RlXG59XG5cbi8qKiBQYXJzZWQgc2lnbmFsIHdhdGNoZXI6IHNpZ25hbCBuYW1lICsgZ3VhcmQgKyBjb21waWxlZCBBU1QgaGFuZGxlIGJvZHkgKi9cbmludGVyZmFjZSBQYXJzZWRTaWduYWxXYXRjaGVyIHtcbiAgc2lnbmFsOiBzdHJpbmdcbiAgd2hlbjogc3RyaW5nIHwgbnVsbFxuICBib2R5OiBMRVNOb2RlXG59XG5cbmV4cG9ydCBjbGFzcyBMb2NhbEV2ZW50U2NyaXB0IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgUHVibGljIHJlZ2lzdHJpZXMgKG90aGVyIGVsZW1lbnRzIGF0dGFjaCB0byB0aGVzZSkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gIHJlYWRvbmx5IGNvbW1hbmRzID0gbmV3IENvbW1hbmRSZWdpc3RyeSgpXG4gIHJlYWRvbmx5IG1vZHVsZXMgID0gbmV3IE1vZHVsZVJlZ2lzdHJ5KClcblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgUGhhc2UgMTogcmF3IGNvbmZpZyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgcHJpdmF0ZSBfY29uZmlnOiBMRVNDb25maWcgfCBudWxsID0gbnVsbFxuICBnZXQgY29uZmlnKCk6IExFU0NvbmZpZyB8IG51bGwgeyByZXR1cm4gdGhpcy5fY29uZmlnIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgUGhhc2UgMjogcGFyc2VkIEFTVHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gIHByaXZhdGUgX3BhcnNlZENvbW1hbmRzOiAgUGFyc2VkQ29tbWFuZFtdICAgICAgICA9IFtdXG4gIHByaXZhdGUgX3BhcnNlZEhhbmRsZXJzOiAgUGFyc2VkRXZlbnRIYW5kbGVyW10gICA9IFtdXG4gIHByaXZhdGUgX3BhcnNlZFdhdGNoZXJzOiAgUGFyc2VkU2lnbmFsV2F0Y2hlcltdICA9IFtdXG4gIHByaXZhdGUgX3BhcnNlZExpZmVjeWNsZTogeyBvbkxvYWQ6IExFU05vZGVbXTsgb25FbnRlcjogQXJyYXk8eyB3aGVuOiBzdHJpbmcgfCBudWxsOyBib2R5OiBMRVNOb2RlIH0+OyBvbkV4aXQ6IExFU05vZGVbXSB9ID0ge1xuICAgIG9uTG9hZDogW10sIG9uRW50ZXI6IFtdLCBvbkV4aXQ6IFtdLFxuICB9XG5cbiAgLyoqIEluc3BlY3QgcGFyc2VkIEFTVHMgaW4gRGV2VG9vbHM6ICQwLnBhcnNlZCAqL1xuICBnZXQgcGFyc2VkKCkge1xuICAgIHJldHVybiB7XG4gICAgICBjb21tYW5kczogIHRoaXMuX3BhcnNlZENvbW1hbmRzLFxuICAgICAgaGFuZGxlcnM6ICB0aGlzLl9wYXJzZWRIYW5kbGVycyxcbiAgICAgIHdhdGNoZXJzOiAgdGhpcy5fcGFyc2VkV2F0Y2hlcnMsXG4gICAgICBsaWZlY3ljbGU6IHRoaXMuX3BhcnNlZExpZmVjeWNsZSxcbiAgICB9XG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgRGF0YXN0YXIgYnJpZGdlIChwb3B1bGF0ZWQgaW4gUGhhc2UgNikgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gIHByaXZhdGUgX2RzRWZmZWN0OiAoKGZuOiAoKSA9PiB2b2lkKSA9PiB2b2lkKSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZFxuICBwcml2YXRlIF9kc1NpZ25hbDogKDxUPihuYW1lOiBzdHJpbmcsIGluaXQ/OiBUKSA9PiB7IHZhbHVlOiBUIH0pIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG5cbiAgc3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMoKTogc3RyaW5nW10geyByZXR1cm4gW10gfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIHF1ZXVlTWljcm90YXNrKCgpID0+IHRoaXMuX2luaXQoKSlcbiAgfVxuXG4gIGRpc2Nvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIHRoaXMuX3RlYXJkb3duKClcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBJbnRlcm5hbCBsaWZlY3ljbGUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBfaW5pdCgpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPGxvY2FsLWV2ZW50LXNjcmlwdD4gaW5pdGlhbGl6aW5nJywgdGhpcy5pZCB8fCAnKG5vIGlkKScpXG5cbiAgICAvLyBQaGFzZSAxOiBET00gXHUyMTkyIGNvbmZpZ1xuICAgIHRoaXMuX2NvbmZpZyA9IHJlYWRDb25maWcodGhpcylcbiAgICBsb2dDb25maWcodGhpcy5fY29uZmlnKVxuXG4gICAgLy8gUGhhc2UgMjogY29uZmlnIGJvZHkgc3RyaW5ncyBcdTIxOTIgQVNUXG4gICAgdGhpcy5fcGFyc2VBbGwodGhpcy5fY29uZmlnKVxuXG4gICAgLy8gUGhhc2UgMzogZXhlY3V0b3Igd2lyaW5nICAoY29taW5nIG5leHQpXG4gICAgLy8gUGhhc2UgNDogZXZlbnQgbGlzdGVuZXJzICAoYWZ0ZXIgZXhlY3V0b3IpXG4gICAgLy8gUGhhc2UgNTogSW50ZXJzZWN0aW9uT2JzZXJ2ZXJcbiAgICAvLyBQaGFzZSA2OiBEYXRhc3RhciBicmlkZ2VcbiAgICAvLyBQaGFzZSA4OiBtb2R1bGUgbG9hZGluZ1xuICB9XG5cbiAgcHJpdmF0ZSBfdGVhcmRvd24oKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGRpc2Nvbm5lY3RlZCcsIHRoaXMuaWQgfHwgJyhubyBpZCknKVxuICAgIHRoaXMuX2NvbmZpZyA9IG51bGxcbiAgICB0aGlzLl9wYXJzZWRDb21tYW5kcyA9IFtdXG4gICAgdGhpcy5fcGFyc2VkSGFuZGxlcnMgPSBbXVxuICAgIHRoaXMuX3BhcnNlZFdhdGNoZXJzID0gW11cbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBQaGFzZSAyOiBwYXJzZSBhbGwgYm9keSBzdHJpbmdzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgX3BhcnNlQWxsKGNvbmZpZzogTEVTQ29uZmlnKTogdm9pZCB7XG4gICAgbGV0IG9rID0gMFxuICAgIGxldCBmYWlsID0gMFxuXG4gICAgLy8gQ29tbWFuZHNcbiAgICB0aGlzLl9wYXJzZWRDb21tYW5kcyA9IGNvbmZpZy5jb21tYW5kcy5tYXAoZGVjbCA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBib2R5ID0gcGFyc2VMRVMoZGVjbC5ib2R5KVxuICAgICAgICBvaysrXG4gICAgICAgIHJldHVybiB7IG5hbWU6IGRlY2wubmFtZSwgZ3VhcmQ6IGRlY2wuZ3VhcmQsIGFyZ3NSYXc6IGRlY2wuYXJnc1JhdywgYm9keSB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGZhaWwrK1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbTEVTXSBQYXJzZSBlcnJvciBpbiBjb21tYW5kIFwiJHtkZWNsLm5hbWV9XCI6YCwgZSlcbiAgICAgICAgcmV0dXJuIHsgbmFtZTogZGVjbC5uYW1lLCBndWFyZDogZGVjbC5ndWFyZCwgYXJnc1JhdzogZGVjbC5hcmdzUmF3LCBib2R5OiB7IHR5cGU6ICdleHByJyBhcyBjb25zdCwgcmF3OiAnJyB9IH1cbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gRXZlbnQgaGFuZGxlcnNcbiAgICB0aGlzLl9wYXJzZWRIYW5kbGVycyA9IGNvbmZpZy5vbkV2ZW50Lm1hcChkZWNsID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGJvZHkgPSBwYXJzZUxFUyhkZWNsLmJvZHkpXG4gICAgICAgIG9rKytcbiAgICAgICAgcmV0dXJuIHsgZXZlbnQ6IGRlY2wubmFtZSwgYm9keSB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGZhaWwrK1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbTEVTXSBQYXJzZSBlcnJvciBpbiBvbi1ldmVudCBcIiR7ZGVjbC5uYW1lfVwiOmAsIGUpXG4gICAgICAgIHJldHVybiB7IGV2ZW50OiBkZWNsLm5hbWUsIGJvZHk6IHsgdHlwZTogJ2V4cHInIGFzIGNvbnN0LCByYXc6ICcnIH0gfVxuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBTaWduYWwgd2F0Y2hlcnNcbiAgICB0aGlzLl9wYXJzZWRXYXRjaGVycyA9IGNvbmZpZy5vblNpZ25hbC5tYXAoZGVjbCA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBib2R5ID0gcGFyc2VMRVMoZGVjbC5ib2R5KVxuICAgICAgICBvaysrXG4gICAgICAgIHJldHVybiB7IHNpZ25hbDogZGVjbC5uYW1lLCB3aGVuOiBkZWNsLndoZW4sIGJvZHkgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBmYWlsKytcbiAgICAgICAgY29uc29sZS5lcnJvcihgW0xFU10gUGFyc2UgZXJyb3IgaW4gb24tc2lnbmFsIFwiJHtkZWNsLm5hbWV9XCI6YCwgZSlcbiAgICAgICAgcmV0dXJuIHsgc2lnbmFsOiBkZWNsLm5hbWUsIHdoZW46IGRlY2wud2hlbiwgYm9keTogeyB0eXBlOiAnZXhwcicgYXMgY29uc3QsIHJhdzogJycgfSB9XG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIExpZmVjeWNsZSBob29rc1xuICAgIHRoaXMuX3BhcnNlZExpZmVjeWNsZSA9IHtcbiAgICAgIG9uTG9hZDogIGNvbmZpZy5vbkxvYWQubWFwKGQgPT4geyB0cnkgeyBvaysrOyByZXR1cm4gcGFyc2VMRVMoZC5ib2R5KSB9IGNhdGNoIHsgZmFpbCsrOyByZXR1cm4geyB0eXBlOiAnZXhwcicgYXMgY29uc3QsIHJhdzogJycgfSB9IH0pLFxuICAgICAgb25FbnRlcjogY29uZmlnLm9uRW50ZXIubWFwKGQgPT4geyB0cnkgeyBvaysrOyByZXR1cm4geyB3aGVuOiBkLndoZW4sIGJvZHk6IHBhcnNlTEVTKGQuYm9keSkgfSB9IGNhdGNoIHsgZmFpbCsrOyByZXR1cm4geyB3aGVuOiBkLndoZW4sIGJvZHk6IHsgdHlwZTogJ2V4cHInIGFzIGNvbnN0LCByYXc6ICcnIH0gfSB9IH0pLFxuICAgICAgb25FeGl0OiAgY29uZmlnLm9uRXhpdC5tYXAoZCA9PiB7IHRyeSB7IG9rKys7IHJldHVybiBwYXJzZUxFUyhkLmJvZHkpIH0gY2F0Y2ggeyBmYWlsKys7IHJldHVybiB7IHR5cGU6ICdleHByJyBhcyBjb25zdCwgcmF3OiAnJyB9IH0gfSksXG4gICAgfVxuXG4gICAgY29uc3QgdG90YWwgPSBvayArIGZhaWxcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gcGFyc2VyOiAke29rfS8ke3RvdGFsfSBib2RpZXMgcGFyc2VkIHN1Y2Nlc3NmdWxseSR7ZmFpbCA+IDAgPyBgICgke2ZhaWx9IGVycm9ycylgIDogJyd9YClcblxuICAgIC8vIExvZyBhIHN0cnVjdHVyYWwgcHJldmlldyBvZiB0aGUgbW9zdCBjb21wbGV4IGJvZHlcbiAgICBjb25zdCBmZXRjaENtZCA9IHRoaXMuX3BhcnNlZENvbW1hbmRzLmZpbmQoYyA9PiBjLm5hbWUgPT09ICdmZWVkOmZldGNoJylcbiAgICBpZiAoZmV0Y2hDbWQpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdbTEVTXSBBU1QgcHJldmlldyAoZmVlZDpmZXRjaCk6JywgSlNPTi5zdHJpbmdpZnkoZmV0Y2hDbWQuYm9keSwgbnVsbCwgMikuc2xpY2UoMCwgODAwKSArICdcdTIwMjYnKVxuICAgIH1cbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBEYXRhc3RhciBicmlkZ2UgKFBoYXNlIDYpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIGNvbm5lY3REYXRhc3RhcihmbnM6IHtcbiAgICBlZmZlY3Q6IChmbjogKCkgPT4gdm9pZCkgPT4gdm9pZFxuICAgIHNpZ25hbDogPFQ+KG5hbWU6IHN0cmluZywgaW5pdD86IFQpID0+IHsgdmFsdWU6IFQgfVxuICB9KTogdm9pZCB7XG4gICAgdGhpcy5fZHNFZmZlY3QgPSBmbnMuZWZmZWN0XG4gICAgdGhpcy5fZHNTaWduYWwgPSBmbnMuc2lnbmFsXG4gICAgY29uc29sZS5sb2coJ1tMRVNdIERhdGFzdGFyIGJyaWRnZSBjb25uZWN0ZWQnLCB0aGlzLmlkKVxuICB9XG5cbiAgZGlzY29ubmVjdERhdGFzdGFyKCk6IHZvaWQge1xuICAgIHRoaXMuX2RzRWZmZWN0ID0gdW5kZWZpbmVkXG4gICAgdGhpcy5fZHNTaWduYWwgPSB1bmRlZmluZWRcbiAgfVxuXG4gIGdldCBkc0VmZmVjdCgpOiAoKGZuOiAoKSA9PiB2b2lkKSA9PiB2b2lkKSB8IHVuZGVmaW5lZCB7IHJldHVybiB0aGlzLl9kc0VmZmVjdCB9XG4gIGdldCBkc1NpZ25hbCgpOiAoPFQ+KG5hbWU6IHN0cmluZywgaW5pdD86IFQpID0+IHsgdmFsdWU6IFQgfSkgfCB1bmRlZmluZWQgeyByZXR1cm4gdGhpcy5fZHNTaWduYWwgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ2xvY2FsLWV2ZW50LXNjcmlwdCcsIExvY2FsRXZlbnRTY3JpcHQpXG4iLCAiLyoqXG4gKiA8bG9jYWwtY29tbWFuZD4gXHUyMDE0IGRlZmluZXMgYSBuYW1lZCwgY2FsbGFibGUgY29tbWFuZCB3aXRoaW4gYSA8bG9jYWwtZXZlbnQtc2NyaXB0Pi5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBuYW1lICAgIFJlcXVpcmVkLiBDb21tYW5kIG5hbWUsIGNvbG9uLW5hbWVzcGFjZWQ6IFwiZmVlZDpmZXRjaFwiXG4gKiAgIGFyZ3MgICAgT3B0aW9uYWwuIFR5cGVkIGFyZ3VtZW50IGxpc3Q6IFwiW2Zyb206c3RyICB0bzpzdHJdXCJcbiAqICAgZ3VhcmQgICBPcHRpb25hbC4gSlMgZXhwcmVzc2lvbiBcdTIwMTQgZmFsc3kgPSBzaWxlbnQgbm8tb3AsIG5vIHJlc2N1ZS9hZnRlcndhcmRzXG4gKiAgIGRvICAgICAgUmVxdWlyZWQuIExFUyBib2R5IChiYWNrdGljay1xdW90ZWQgZm9yIG11bHRpLWxpbmUpXG4gKlxuICogVGhpcyBlbGVtZW50IGlzIHB1cmVseSBkZWNsYXJhdGl2ZSBcdTIwMTQgaXQgaG9sZHMgZGF0YS5cbiAqIFRoZSBob3N0IDxsb2NhbC1ldmVudC1zY3JpcHQ+IHJlYWRzIGl0IGR1cmluZyBQaGFzZSAxIGFuZCByZWdpc3RlcnNcbiAqIHRoZSBwYXJzZWQgQ29tbWFuZERlZiBpbiBpdHMgQ29tbWFuZFJlZ2lzdHJ5LlxuICpcbiAqIE5vdGU6IDxjb21tYW5kPiB3YXMgYSBkZXByZWNhdGVkIEhUTUw1IGVsZW1lbnQgXHUyMDE0IHdlIHVzZSA8bG9jYWwtY29tbWFuZD5cbiAqIHRvIHNhdGlzZnkgdGhlIGN1c3RvbSBlbGVtZW50IGh5cGhlbiByZXF1aXJlbWVudCBhbmQgYXZvaWQgdGhlIGNvbGxpc2lvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIExvY2FsQ29tbWFuZCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEF0dHJpYnV0ZSBhY2Nlc3NvcnMgKHR5cGVkLCB0cmltbWVkKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBnZXQgY29tbWFuZE5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICAvKiogUmF3IGFyZ3Mgc3RyaW5nIGUuZy4gXCJbZnJvbTpzdHIgIHRvOnN0cl1cIiBcdTIwMTQgcGFyc2VkIGJ5IFBoYXNlIDIgKi9cbiAgZ2V0IGFyZ3NSYXcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ2FyZ3MnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICAvKiogR3VhcmQgZXhwcmVzc2lvbiBzdHJpbmcgXHUyMDE0IGV2YWx1YXRlZCBieSBydW50aW1lIGJlZm9yZSBleGVjdXRpb24gKi9cbiAgZ2V0IGd1YXJkRXhwcigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ2d1YXJkJyk/LnRyaW0oKSA/PyBudWxsXG4gIH1cblxuICAvKiogUmF3IExFUyBib2R5IFx1MjAxNCBtYXkgYmUgYmFja3RpY2std3JhcHBlZCBmb3IgbXVsdGktbGluZSAqL1xuICBnZXQgZG9Cb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdkbycpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIC8vIFBoYXNlIDA6IHZlcmlmeSBlbGVtZW50IGlzIHJlY29nbml6ZWQuXG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxsb2NhbC1jb21tYW5kPiByZWdpc3RlcmVkOicsIHRoaXMuY29tbWFuZE5hbWUgfHwgJyh1bm5hbWVkKScpXG4gIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdsb2NhbC1jb21tYW5kJywgTG9jYWxDb21tYW5kKVxuIiwgIi8qKlxuICogPG9uLWV2ZW50PiBcdTIwMTQgc3Vic2NyaWJlcyB0byBhIG5hbWVkIEN1c3RvbUV2ZW50IGRpc3BhdGNoZWQgd2l0aGluIHRoZSBMRVMgaG9zdC5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBuYW1lICAgIFJlcXVpcmVkLiBFdmVudCBuYW1lOiBcImZlZWQ6aW5pdFwiLCBcIml0ZW06ZGlzbWlzc2VkXCJcbiAqICAgaGFuZGxlICBSZXF1aXJlZC4gTEVTIGJvZHkgXHUyMDE0IHNpbmdsZS1saW5lIChubyBiYWNrdGlja3MpIG9yIG11bHRpLWxpbmUgKGJhY2t0aWNrcylcbiAqXG4gKiBQaGFzZSA0IHdpcmVzIGEgQ3VzdG9tRXZlbnQgbGlzdGVuZXIgb24gdGhlIGhvc3QgZWxlbWVudC5cbiAqIEV2ZW50cyBmaXJlZCBieSBgZW1pdGAgbmV2ZXIgYnViYmxlOyBvbmx5IGhhbmRsZXJzIHdpdGhpbiB0aGUgc2FtZVxuICogPGxvY2FsLWV2ZW50LXNjcmlwdD4gc2VlIHRoZW0uIFVzZSBgYnJvYWRjYXN0YCB0byBjcm9zcyB0aGUgYm91bmRhcnkuXG4gKi9cbmV4cG9ydCBjbGFzcyBPbkV2ZW50IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBnZXQgZXZlbnROYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCduYW1lJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgLyoqIFJhdyBMRVMgaGFuZGxlIGJvZHkgKi9cbiAgZ2V0IGhhbmRsZUJvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ2hhbmRsZScpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8b24tZXZlbnQ+IHJlZ2lzdGVyZWQ6JywgdGhpcy5ldmVudE5hbWUgfHwgJyh1bm5hbWVkKScpXG4gIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1ldmVudCcsIE9uRXZlbnQpXG4iLCAiLyoqXG4gKiA8b24tc2lnbmFsPiBcdTIwMTQgcmVhY3RzIHdoZW5ldmVyIGEgbmFtZWQgRGF0YXN0YXIgc2lnbmFsIGNoYW5nZXMgdmFsdWUuXG4gKlxuICogQXR0cmlidXRlczpcbiAqICAgbmFtZSAgICBSZXF1aXJlZC4gU2lnbmFsIHJlZmVyZW5jZTogXCIkZmVlZFN0YXRlXCIsIFwiJGZlZWRJdGVtc1wiXG4gKiAgIHdoZW4gICAgT3B0aW9uYWwuIEd1YXJkIGV4cHJlc3Npb24gXHUyMDE0IG9ubHkgZmlyZXMgaGFuZGxlIHdoZW4gdHJ1dGh5XG4gKiAgIGhhbmRsZSAgUmVxdWlyZWQuIExFUyBib2R5XG4gKlxuICogUGhhc2UgNiB3aXJlcyB0aGlzIHRvIERhdGFzdGFyJ3MgZWZmZWN0KCkgc3lzdGVtLlxuICogVW50aWwgRGF0YXN0YXIgaXMgY29ubmVjdGVkLCBmYWxscyBiYWNrIHRvIHBvbGxpbmcgKFBoYXNlIDYgZGVjaWRlcykuXG4gKlxuICogVGhlIGB3aGVuYCBndWFyZCBpcyByZS1ldmFsdWF0ZWQgb24gZXZlcnkgc2lnbmFsIGNoYW5nZS5cbiAqIEd1YXJkIGZhaWx1cmUgaXMgbm90IGFuIGVycm9yIFx1MjAxNCB0aGUgaGFuZGxlIHNpbXBseSBkb2VzIG5vdCBydW4uXG4gKi9cbmV4cG9ydCBjbGFzcyBPblNpZ25hbCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgLyoqIFNpZ25hbCBuYW1lIGluY2x1ZGluZyAkIHByZWZpeDogXCIkZmVlZFN0YXRlXCIgKi9cbiAgZ2V0IHNpZ25hbE5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICAvKiogU2lnbmFsIG5hbWUgd2l0aG91dCAkIHByZWZpeCwgZm9yIERhdGFzdGFyIEFQSSBjYWxscyAqL1xuICBnZXQgc2lnbmFsS2V5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuc2lnbmFsTmFtZS5yZXBsYWNlKC9eXFwkLywgJycpXG4gIH1cblxuICBnZXQgd2hlbkV4cHIoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCd3aGVuJyk/LnRyaW0oKSA/PyBudWxsXG4gIH1cblxuICBnZXQgaGFuZGxlQm9keSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnaGFuZGxlJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxvbi1zaWduYWw+IHJlZ2lzdGVyZWQ6JywgdGhpcy5zaWduYWxOYW1lIHx8ICcodW5uYW1lZCknKVxuICB9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnb24tc2lnbmFsJywgT25TaWduYWwpXG4iLCAiLyoqXG4gKiA8b24tbG9hZD4gXHUyMDE0IGZpcmVzIGl0cyBgcnVuYCBib2R5IG9uY2Ugd2hlbiB0aGUgaG9zdCBjb25uZWN0cyB0byB0aGUgRE9NLlxuICpcbiAqIFRpbWluZzogaWYgZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gJ2NvbXBsZXRlJywgZmlyZXMgaW1tZWRpYXRlbHkgaW5cbiAqIGNvbm5lY3RlZENhbGxiYWNrICh2aWEgcXVldWVNaWNyb3Rhc2spLiBPdGhlcndpc2Ugd2FpdHMgZm9yIERPTUNvbnRlbnRMb2FkZWQuXG4gKlxuICogUnVsZTogbGlmZWN5Y2xlIGhvb2tzIGFsd2F5cyBmaXJlIGV2ZW50cyAoYGVtaXRgKSwgbmV2ZXIgY2FsbCBjb21tYW5kcyBkaXJlY3RseS5cbiAqIFRoaXMga2VlcHMgdGhlIHN5c3RlbSB0cmFjZWFibGUgXHUyMDE0IGV2ZXJ5IGNvbW1hbmQgaW52b2NhdGlvbiBoYXMgYW4gZXZlbnQgaW4gaXRzIGhpc3RvcnkuXG4gKlxuICogQXR0cmlidXRlczpcbiAqICAgcnVuICAgUmVxdWlyZWQuIFNpbmdsZS1saW5lIExFUyBib2R5ICh1c3VhbGx5IGp1c3QgYGVtaXQgZXZlbnQ6bmFtZWApXG4gKi9cbmV4cG9ydCBjbGFzcyBPbkxvYWQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIGdldCBydW5Cb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdydW4nKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPG9uLWxvYWQ+IHJlZ2lzdGVyZWQsIHJ1bjonLCB0aGlzLnJ1bkJvZHkpXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogPG9uLWVudGVyPiBcdTIwMTQgZmlyZXMgd2hlbiB0aGUgaG9zdCA8bG9jYWwtZXZlbnQtc2NyaXB0PiBlbnRlcnMgdGhlIHZpZXdwb3J0LlxuICpcbiAqIFVzZXMgYSBzaW5nbGUgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgc2hhcmVkIGFjcm9zcyBhbGwgPG9uLWVudGVyPi88b24tZXhpdD5cbiAqIGNoaWxkcmVuIG9mIHRoZSBzYW1lIGhvc3QgKFBoYXNlIDUgY3JlYXRlcyBpdCBvbiB0aGUgaG9zdCBlbGVtZW50KS5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICB3aGVuICBPcHRpb25hbC4gR3VhcmQgZXhwcmVzc2lvbiBcdTIwMTQgb25seSBmaXJlcyBydW4gd2hlbiB0cnV0aHkuXG4gKiAgICAgICAgICBQYXR0ZXJuOiBgd2hlbj1cIiRmZWVkU3RhdGUgPT0gJ3BhdXNlZCdcImBcbiAqICAgcnVuICAgUmVxdWlyZWQuIFNpbmdsZS1saW5lIExFUyBib2R5LlxuICovXG5leHBvcnQgY2xhc3MgT25FbnRlciBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgZ2V0IHdoZW5FeHByKCk6IHN0cmluZyB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnd2hlbicpPy50cmltKCkgPz8gbnVsbFxuICB9XG5cbiAgZ2V0IHJ1bkJvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8b24tZW50ZXI+IHJlZ2lzdGVyZWQsIHdoZW46JywgdGhpcy53aGVuRXhwciA/PyAnYWx3YXlzJylcbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiA8b24tZXhpdD4gXHUyMDE0IGZpcmVzIHdoZW4gdGhlIGhvc3QgPGxvY2FsLWV2ZW50LXNjcmlwdD4gZXhpdHMgdGhlIHZpZXdwb3J0LlxuICpcbiAqIE5vIGB3aGVuYCBndWFyZCBcdTIwMTQgZXhpdCBhbHdheXMgZmlyZXMgdW5jb25kaXRpb25hbGx5LlxuICogKElmIHlvdSBuZWVkIGNvbmRpdGlvbmFsIGV4aXQgYmVoYXZpb3IsIHB1dCB0aGUgY29uZGl0aW9uIGluIHRoZSBoYW5kbGVyLilcbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBydW4gICBSZXF1aXJlZC4gU2luZ2xlLWxpbmUgTEVTIGJvZHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBPbkV4aXQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIGdldCBydW5Cb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdydW4nKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPG9uLWV4aXQ+IHJlZ2lzdGVyZWQsIHJ1bjonLCB0aGlzLnJ1bkJvZHkpXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFJlZ2lzdHJhdGlvbiBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1sb2FkJywgIE9uTG9hZClcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnb24tZW50ZXInLCBPbkVudGVyKVxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1leGl0JywgIE9uRXhpdClcbiIsICIvKipcbiAqIDx1c2UtbW9kdWxlPiBcdTIwMTQgZGVjbGFyZXMgYSB2b2NhYnVsYXJ5IGV4dGVuc2lvbiBhdmFpbGFibGUgdG8gPGxvY2FsLWNvbW1hbmQ+IGJvZGllcy5cbiAqXG4gKiBNdXN0IGFwcGVhciBiZWZvcmUgYW55IDxsb2NhbC1jb21tYW5kPiBpbiB0aGUgPGxvY2FsLWV2ZW50LXNjcmlwdD4uXG4gKiBUaGUgaG9zdCByZWFkcyA8dXNlLW1vZHVsZT4gY2hpbGRyZW4gZmlyc3QgKFBoYXNlIDgpIGFuZCByZWdpc3RlcnNcbiAqIHRoZWlyIHByaW1pdGl2ZXMgaW50byBpdHMgTW9kdWxlUmVnaXN0cnkgYmVmb3JlIHBhcnNpbmcgY29tbWFuZCBib2RpZXMuXG4gKlxuICogQXR0cmlidXRlcyAoaW5kZXBlbmRlbnQsIGNvbWJpbmFibGUpOlxuICogICB0eXBlICAgQnVpbHQtaW4gbW9kdWxlIG5hbWU6IFwiYW5pbWF0aW9uXCJcbiAqICAgc3JjICAgIFVSTC9wYXRoIHRvIGEgdXNlcmxhbmQgbW9kdWxlIEVTIG1vZHVsZTogIFwiLi9zY3JvbGwtZWZmZWN0cy5qc1wiXG4gKiAgICAgICAgICBUaGUgbW9kdWxlIG11c3QgZXhwb3J0IGEgZGVmYXVsdCBjb25mb3JtaW5nIHRvIExFU01vZHVsZTpcbiAqICAgICAgICAgIHsgbmFtZTogc3RyaW5nLCBwcmltaXRpdmVzOiBSZWNvcmQ8c3RyaW5nLCBMRVNQcmltaXRpdmU+IH1cbiAqXG4gKiBFeGFtcGxlczpcbiAqICAgPHVzZS1tb2R1bGUgdHlwZT1cImFuaW1hdGlvblwiPjwvdXNlLW1vZHVsZT5cbiAqICAgPHVzZS1tb2R1bGUgc3JjPVwiLi9zY3JvbGwtZWZmZWN0cy5qc1wiPjwvdXNlLW1vZHVsZT5cbiAqICAgPHVzZS1tb2R1bGUgc3JjPVwiLi9zcHJpbmctcGh5c2ljcy5qc1wiPjwvdXNlLW1vZHVsZT5cbiAqXG4gKiB0eXBlPSBhbmQgc3JjPSBtYXkgYXBwZWFyIHRvZ2V0aGVyIG9uIG9uZSBlbGVtZW50IGlmIHRoZSB1c2VybGFuZCBtb2R1bGVcbiAqIHdhbnRzIHRvIGRlY2xhcmUgaXRzIHR5cGUgaGludCBmb3IgdG9vbGluZyAobm90IGN1cnJlbnRseSByZXF1aXJlZCkuXG4gKi9cbmV4cG9ydCBjbGFzcyBVc2VNb2R1bGUgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIC8qKiBCdWlsdC1pbiBtb2R1bGUgdHlwZSBlLmcuIFwiYW5pbWF0aW9uXCIgKi9cbiAgZ2V0IG1vZHVsZVR5cGUoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCd0eXBlJyk/LnRyaW0oKSA/PyBudWxsXG4gIH1cblxuICAvKiogVXNlcmxhbmQgbW9kdWxlIFVSTCBlLmcuIFwiLi9zY3JvbGwtZWZmZWN0cy5qc1wiICovXG4gIGdldCBtb2R1bGVTcmMoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdzcmMnKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnN0IGRlc2MgPSB0aGlzLm1vZHVsZVR5cGVcbiAgICAgID8gYHR5cGU9XCIke3RoaXMubW9kdWxlVHlwZX1cImBcbiAgICAgIDogdGhpcy5tb2R1bGVTcmNcbiAgICAgICAgPyBgc3JjPVwiJHt0aGlzLm1vZHVsZVNyY31cImBcbiAgICAgICAgOiAnKG5vIHR5cGUgb3Igc3JjKSdcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPHVzZS1tb2R1bGU+IGRlY2xhcmVkOicsIGRlc2MpXG4gIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd1c2UtbW9kdWxlJywgVXNlTW9kdWxlKVxuIiwgIi8qKlxuICogTEVTU2NvcGUgXHUyMDE0IGEgc2ltcGxlIGxleGljYWxseS1zY29wZWQgdmFyaWFibGUgc3RvcmUuXG4gKlxuICogRWFjaCBjb21tYW5kIGludm9jYXRpb24gZ2V0cyBhIGZyZXNoIGNoaWxkIHNjb3BlLlxuICogTWF0Y2ggYXJtIGJpbmRpbmdzIGFsc28gY3JlYXRlIGEgY2hpbGQgc2NvcGUgbGltaXRlZCB0byB0aGF0IGFybSdzIGJvZHkuXG4gKiBTaWduYWwgcmVhZHMvd3JpdGVzIGdvIHRocm91Z2ggdGhlIERhdGFzdGFyIGJyaWRnZSwgbm90IHRoaXMgc2NvcGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBMRVNTY29wZSB7XG4gIHByaXZhdGUgbG9jYWxzID0gbmV3IE1hcDxzdHJpbmcsIHVua25vd24+KClcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBhcmVudD86IExFU1Njb3BlKSB7fVxuXG4gIGdldChuYW1lOiBzdHJpbmcpOiB1bmtub3duIHtcbiAgICBpZiAodGhpcy5sb2NhbHMuaGFzKG5hbWUpKSByZXR1cm4gdGhpcy5sb2NhbHMuZ2V0KG5hbWUpXG4gICAgcmV0dXJuIHRoaXMucGFyZW50Py5nZXQobmFtZSlcbiAgfVxuXG4gIHNldChuYW1lOiBzdHJpbmcsIHZhbHVlOiB1bmtub3duKTogdm9pZCB7XG4gICAgdGhpcy5sb2NhbHMuc2V0KG5hbWUsIHZhbHVlKVxuICB9XG5cbiAgaGFzKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmxvY2Fscy5oYXMobmFtZSkgfHwgKHRoaXMucGFyZW50Py5oYXMobmFtZSkgPz8gZmFsc2UpXG4gIH1cblxuICAvKiogQ3JlYXRlIGEgY2hpbGQgc2NvcGUgaW5oZXJpdGluZyBhbGwgbG9jYWxzIGZyb20gdGhpcyBvbmUuICovXG4gIGNoaWxkKCk6IExFU1Njb3BlIHtcbiAgICByZXR1cm4gbmV3IExFU1Njb3BlKHRoaXMpXG4gIH1cblxuICAvKiogU25hcHNob3QgYWxsIGxvY2FscyAoZm9yIGRlYnVnZ2luZyAvIGVycm9yIG1lc3NhZ2VzKS4gKi9cbiAgc25hcHNob3QoKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xuICAgIGNvbnN0IGJhc2UgPSB0aGlzLnBhcmVudD8uc25hcHNob3QoKSA/PyB7fVxuICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIHRoaXMubG9jYWxzKSBiYXNlW2tdID0gdlxuICAgIHJldHVybiBiYXNlXG4gIH1cbn1cbiIsICIvKipcbiAqIERhdGFzdGFyIGJyaWRnZSBcdTIwMTQgcmVnaXN0ZXJzIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGFzIGEgRGF0YXN0YXIgYXR0cmlidXRlIHBsdWdpbi5cbiAqXG4gKiBQaGFzZSAwOiBzdHViIHRoYXQgaW1wb3J0cyB0aGUgcmVnaXN0cmF0aW9uIGZ1bmN0aW9uIGFuZCBzZXRzIHVwIHRoZSBzaGFwZS5cbiAqIFBoYXNlIDY6IGZpbGxzIGluIHNpZ25hbCB3YXRjaGluZywgQGFjdGlvbiBwYXNzdGhyb3VnaCwgYW5kIHJlYWN0aXZlIGVmZmVjdCB3aXJpbmcuXG4gKlxuICogTEVTIGlzIGRlc2lnbmVkIHRvIHdvcmsgd2l0aG91dCBEYXRhc3RhciAoc3RhbmRhbG9uZSBjdXN0b20gZWxlbWVudHMgb25seSkuXG4gKiBUaGlzIGZpbGUgaXMgb25seSBpbXBvcnRlZCB3aGVuIERhdGFzdGFyIGlzIHByZXNlbnQgaW4gdGhlIGltcG9ydG1hcC5cbiAqIFRoZSBtYWluIGluZGV4LnRzIGNvbmRpdGlvbmFsbHkgaW1wb3J0cyBpdCB2aWEgYSB0cnkvY2F0Y2ggZHluYW1pYyBpbXBvcnQuXG4gKi9cbmltcG9ydCB0eXBlIHsgTG9jYWxFdmVudFNjcmlwdCB9IGZyb20gJ0BlbGVtZW50cy9Mb2NhbEV2ZW50U2NyaXB0LmpzJ1xuXG5sZXQgYnJpZGdlUmVnaXN0ZXJlZCA9IGZhbHNlXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWdpc3RlckRhdGFzdGFyQnJpZGdlKCk6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoYnJpZGdlUmVnaXN0ZXJlZCkgcmV0dXJuXG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGF0dHJpYnV0ZSB9ID0gYXdhaXQgaW1wb3J0KCdkYXRhc3RhcicpXG5cbiAgICBhdHRyaWJ1dGUoe1xuICAgICAgbmFtZTogJ2xvY2FsLWV2ZW50LXNjcmlwdCcsXG4gICAgICAvLyBObyBrZXkgc3VmZml4IGV4cGVjdGVkIChkYXRhLWxvY2FsLWV2ZW50LXNjcmlwdCwgbm90IGRhdGEtbG9jYWwtZXZlbnQtc2NyaXB0OmtleSlcbiAgICAgIHJlcXVpcmVtZW50OiB7XG4gICAgICAgIGtleTogJ2RlbmllZCcsXG4gICAgICAgIHZhbHVlOiAnZGVuaWVkJyxcbiAgICAgIH0sXG4gICAgICBhcHBseSh7IGVsLCBlZmZlY3QsIHNpZ25hbCB9KSB7XG4gICAgICAgIGNvbnN0IGhvc3QgPSBlbCBhcyBMb2NhbEV2ZW50U2NyaXB0XG5cbiAgICAgICAgLy8gUGhhc2UgNiB3aWxsIHdpcmUgc2lnbmFsIHdhdGNoaW5nIGFuZCBAYWN0aW9uIHBhc3N0aHJvdWdoIGhlcmUuXG4gICAgICAgIC8vIFBoYXNlIDA6IGp1c3QgY29ubmVjdCB0aGUgRGF0YXN0YXIgcHJpbWl0aXZlcyBzbyB0aGUgaG9zdCBrbm93c1xuICAgICAgICAvLyB0aGV5J3JlIGF2YWlsYWJsZS5cbiAgICAgICAgaG9zdC5jb25uZWN0RGF0YXN0YXIoeyBlZmZlY3QsIHNpZ25hbCB9KVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCdbTEVTOmRhdGFzdGFyXSBhdHRyaWJ1dGUgcGx1Z2luIGFwcGxpZWQgdG8nLCBlbC5pZCB8fCBlbClcblxuICAgICAgICAvLyBSZXR1cm4gY2xlYW51cCBmdW5jdGlvbiBcdTIwMTQgY2FsbGVkIHdoZW4gZWxlbWVudCBpcyByZW1vdmVkIGZyb20gRE9NLlxuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgIGhvc3QuZGlzY29ubmVjdERhdGFzdGFyKClcbiAgICAgICAgICBjb25zb2xlLmxvZygnW0xFUzpkYXRhc3Rhcl0gYXR0cmlidXRlIHBsdWdpbiBjbGVhbmVkIHVwJywgZWwuaWQgfHwgZWwpXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfSlcblxuICAgIGJyaWRnZVJlZ2lzdGVyZWQgPSB0cnVlXG4gICAgY29uc29sZS5sb2coJ1tMRVM6ZGF0YXN0YXJdIGJyaWRnZSByZWdpc3RlcmVkJylcbiAgfSBjYXRjaCB7XG4gICAgLy8gRGF0YXN0YXIgbm90IHByZXNlbnQgXHUyMDE0IExFUyBydW5zIGluIHN0YW5kYWxvbmUgbW9kZS5cbiAgICBjb25zb2xlLmxvZygnW0xFU10gUnVubmluZyBpbiBzdGFuZGFsb25lIG1vZGUgKERhdGFzdGFyIG5vdCBmb3VuZCBpbiBpbXBvcnRtYXApJylcbiAgfVxufVxuIiwgIi8qKlxuICogbG9jYWwtZXZlbnQtc2NyaXB0IFx1MjAxNCBtYWluIGVudHJ5IHBvaW50XG4gKlxuICogSW1wb3J0IG9yZGVyIG1hdHRlcnMgZm9yIGN1c3RvbSBlbGVtZW50IHJlZ2lzdHJhdGlvbjpcbiAqICAgMS4gSG9zdCBlbGVtZW50IGZpcnN0IChMb2NhbEV2ZW50U2NyaXB0KVxuICogICAyLiBDaGlsZCBlbGVtZW50cyB0aGF0IHJlZmVyZW5jZSBpdFxuICogICAzLiBEYXRhc3RhciBicmlkZ2UgbGFzdCAob3B0aW9uYWwgXHUyMDE0IGZhaWxzIGdyYWNlZnVsbHkgaWYgRGF0YXN0YXIgYWJzZW50KVxuICpcbiAqIFVzYWdlIHZpYSBpbXBvcnRtYXAgKyBzY3JpcHQgdGFnOlxuICpcbiAqICAgPHNjcmlwdCB0eXBlPVwiaW1wb3J0bWFwXCI+XG4gKiAgICAge1xuICogICAgICAgXCJpbXBvcnRzXCI6IHtcbiAqICAgICAgICAgXCJkYXRhc3RhclwiOiBcImh0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9naC9zdGFyZmVkZXJhdGlvbi9kYXRhc3RhckB2MS4wLjAtUkMuOC9idW5kbGVzL2RhdGFzdGFyLmpzXCJcbiAqICAgICAgIH1cbiAqICAgICB9XG4gKiAgIDwvc2NyaXB0PlxuICogICA8c2NyaXB0IHR5cGU9XCJtb2R1bGVcIiBzcmM9XCIvZGlzdC9sb2NhbC1ldmVudC1zY3JpcHQuanNcIj48L3NjcmlwdD5cbiAqXG4gKiBXaXRob3V0IHRoZSBpbXBvcnRtYXAgKG9yIHdpdGggZGF0YXN0YXIgYWJzZW50KSwgTEVTIHJ1bnMgaW4gc3RhbmRhbG9uZSBtb2RlOlxuICogYWxsIGN1c3RvbSBlbGVtZW50cyB3b3JrLCBEYXRhc3RhciBzaWduYWwgd2F0Y2hpbmcgYW5kIEBhY3Rpb24gcGFzc3Rocm91Z2hcbiAqIGFyZSB1bmF2YWlsYWJsZS5cbiAqL1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgQ3VzdG9tIGVsZW1lbnRzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gRWFjaCBpbXBvcnQgcmVnaXN0ZXJzIGl0cyBlbGVtZW50KHMpIGFzIGEgc2lkZSBlZmZlY3QuXG5cbmV4cG9ydCB7IExvY2FsRXZlbnRTY3JpcHQgfSBmcm9tICdAZWxlbWVudHMvTG9jYWxFdmVudFNjcmlwdC5qcydcbmV4cG9ydCB7IExvY2FsQ29tbWFuZCB9ICAgICBmcm9tICdAZWxlbWVudHMvTG9jYWxDb21tYW5kLmpzJ1xuZXhwb3J0IHsgT25FdmVudCB9ICAgICAgICAgIGZyb20gJ0BlbGVtZW50cy9PbkV2ZW50LmpzJ1xuZXhwb3J0IHsgT25TaWduYWwgfSAgICAgICAgIGZyb20gJ0BlbGVtZW50cy9PblNpZ25hbC5qcydcbmV4cG9ydCB7IE9uTG9hZCwgT25FbnRlciwgT25FeGl0IH0gZnJvbSAnQGVsZW1lbnRzL0xpZmVjeWNsZS5qcydcbmV4cG9ydCB7IFVzZU1vZHVsZSB9ICAgICAgICBmcm9tICdAZWxlbWVudHMvVXNlTW9kdWxlLmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgVHlwZSBleHBvcnRzIChmb3IgVHlwZVNjcmlwdCBjb25zdW1lcnMpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuZXhwb3J0IHR5cGUgeyBMRVNOb2RlIH0gICAgICAgICAgICAgICAgICAgZnJvbSAnQHBhcnNlci9hc3QuanMnXG5leHBvcnQgdHlwZSB7IExFU01vZHVsZSwgTEVTUHJpbWl0aXZlIH0gICBmcm9tICdAbW9kdWxlcy90eXBlcy5qcydcbmV4cG9ydCB0eXBlIHsgQ29tbWFuZERlZiwgQXJnRGVmIH0gICAgICAgIGZyb20gJ0BydW50aW1lL3JlZ2lzdHJ5LmpzJ1xuZXhwb3J0IHsgTEVTU2NvcGUgfSAgICAgICAgICAgICAgICAgICAgICAgZnJvbSAnQHJ1bnRpbWUvc2NvcGUuanMnXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBEYXRhc3RhciBicmlkZ2UgKG9wdGlvbmFsKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIER5bmFtaWMgaW1wb3J0IHNvIHRoZSBidW5kbGUgd29ya3Mgd2l0aG91dCBEYXRhc3RhciBwcmVzZW50LlxuaW1wb3J0IHsgcmVnaXN0ZXJEYXRhc3RhckJyaWRnZSB9IGZyb20gJ0BkYXRhc3Rhci9wbHVnaW4uanMnXG5yZWdpc3RlckRhdGFzdGFyQnJpZGdlKClcbmV4cG9ydCB0eXBlIHsgTEVTQ29uZmlnLCBDb21tYW5kRGVjbCwgRXZlbnRIYW5kbGVyRGVjbCwgU2lnbmFsV2F0Y2hlckRlY2wsXG4gICAgICAgICAgICAgIE9uTG9hZERlY2wsIE9uRW50ZXJEZWNsLCBPbkV4aXREZWNsLCBNb2R1bGVEZWNsIH0gZnJvbSAnQHBhcnNlci9jb25maWcuanMnXG5leHBvcnQgeyByZWFkQ29uZmlnLCBsb2dDb25maWcgfSBmcm9tICdAcGFyc2VyL3JlYWRlci5qcydcbmV4cG9ydCB7IHN0cmlwQm9keSB9ICAgICAgICAgICAgIGZyb20gJ0BwYXJzZXIvc3RyaXBCb2R5LmpzJ1xuZXhwb3J0IHsgcGFyc2VMRVMsIExFU1BhcnNlciwgTEVTUGFyc2VFcnJvciB9IGZyb20gJ0BwYXJzZXIvaW5kZXguanMnXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBdUJPLElBQU0sa0JBQU4sTUFBc0I7QUFBQSxFQUNuQixXQUFXLG9CQUFJLElBQXdCO0FBQUEsRUFFL0MsU0FBUyxLQUF1QjtBQUM5QixRQUFJLEtBQUssU0FBUyxJQUFJLElBQUksSUFBSSxHQUFHO0FBQy9CLGNBQVE7QUFBQSxRQUNOLDRCQUE0QixJQUFJLElBQUk7QUFBQSxRQUNwQyxJQUFJO0FBQUEsTUFDTjtBQUFBLElBQ0Y7QUFDQSxTQUFLLFNBQVMsSUFBSSxJQUFJLE1BQU0sR0FBRztBQUFBLEVBQ2pDO0FBQUEsRUFFQSxJQUFJLE1BQXNDO0FBQ3hDLFdBQU8sS0FBSyxTQUFTLElBQUksSUFBSTtBQUFBLEVBQy9CO0FBQUEsRUFFQSxJQUFJLE1BQXVCO0FBQ3pCLFdBQU8sS0FBSyxTQUFTLElBQUksSUFBSTtBQUFBLEVBQy9CO0FBQUEsRUFFQSxRQUFrQjtBQUNoQixXQUFPLE1BQU0sS0FBSyxLQUFLLFNBQVMsS0FBSyxDQUFDO0FBQUEsRUFDeEM7QUFDRjs7O0FDVE8sSUFBTSxpQkFBTixNQUFxQjtBQUFBLEVBQ2xCLGFBQWEsb0JBQUksSUFBMEI7QUFBQSxFQUMzQyxnQkFBMEIsQ0FBQztBQUFBLEVBRW5DLFNBQVMsUUFBeUI7QUFDaEMsZUFBVyxDQUFDLE1BQU0sRUFBRSxL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
