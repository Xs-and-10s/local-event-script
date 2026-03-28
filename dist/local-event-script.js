var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/modules/builtin/animation.ts
var animation_exports = {};
__export(animation_exports, {
  default: () => animation_default
});
var STUB, animationModule, animation_default;
var init_animation = __esm({
  "src/modules/builtin/animation.ts"() {
    "use strict";
    STUB = (name) => async (selector, duration, easing, options, host) => {
      console.debug(`[LES:animation] ${name}("${selector}", ${duration}ms, ${easing})`, options, host);
    };
    animationModule = {
      name: "animation",
      primitives: {
        "fade-in": STUB("fade-in"),
        "fade-out": STUB("fade-out"),
        "slide-in": STUB("slide-in"),
        "slide-out": STUB("slide-out"),
        "slide-up": STUB("slide-up"),
        "slide-down": STUB("slide-down"),
        "pulse": STUB("pulse"),
        "stagger-enter": STUB("stagger-enter"),
        "stagger-exit": STUB("stagger-exit")
      }
    };
    animation_default = animationModule;
  }
});

// src/runtime/executor.ts
var executor_exports = {};
__export(executor_exports, {
  evalExpr: () => evalExpr,
  execute: () => execute,
  runCommand: () => runCommand
});
async function execute(node, ctx) {
  switch (node.type) {
    // ── Sequence: A then B then C ──────────────────────────────────────────
    case "sequence":
      for (const step of node.steps) {
        await execute(step, ctx);
      }
      return;
    // ── Parallel: A and B and C (Promise.all) ──────────────────────────────
    case "parallel":
      await Promise.all(node.branches.map((b) => execute(b, ctx)));
      return;
    // ── set $signal to expr ────────────────────────────────────────────────
    case "set": {
      const n = node;
      const value = evalExpr(n.value, ctx);
      ctx.setSignal(n.signal, value);
      return;
    }
    // ── emit event:name [payload] ──────────────────────────────────────────
    case "emit": {
      const n = node;
      const payload = n.payload.map((p) => evalExpr(p, ctx));
      ctx.emitLocal(n.event, payload);
      return;
    }
    // ── broadcast event:name [payload] ────────────────────────────────────
    case "broadcast": {
      const n = node;
      const payload = n.payload.map((p) => evalExpr(p, ctx));
      ctx.broadcast(n.event, payload);
      return;
    }
    // ── wait Nms ──────────────────────────────────────────────────────────
    case "wait": {
      const n = node;
      await new Promise((resolve) => setTimeout(resolve, n.ms));
      return;
    }
    // ── call command:name [args] ───────────────────────────────────────────
    case "call": {
      const n = node;
      const def = ctx.commands.get(n.command);
      if (!def) {
        console.warn(`[LES] Unknown command: "${n.command}"`);
        return;
      }
      if (def.guard) {
        const passes = evalGuard(def.guard, ctx);
        if (!passes) {
          console.debug(`[LES] command "${n.command}" guard rejected`);
          return;
        }
      }
      const childScope = ctx.scope.child();
      const evaledArgs = {};
      for (const [key, exprNode] of Object.entries(n.args)) {
        evaledArgs[key] = evalExpr(exprNode, ctx);
      }
      for (const argDef of def.args) {
        if (!(argDef.name in evaledArgs) && argDef.default) {
          evaledArgs[argDef.name] = evalExpr(argDef.default, ctx);
        }
        childScope.set(argDef.name, evaledArgs[argDef.name] ?? null);
      }
      const childCtx = { ...ctx, scope: childScope };
      await execute(def.body, childCtx);
      return;
    }
    // ── name <- @verb 'url' [args] ─────────────────────────────────────────
    case "bind": {
      const n = node;
      const { verb, url, args } = n.action;
      const evaledArgs = {};
      for (const [key, exprNode] of Object.entries(args)) {
        evaledArgs[key] = evalExpr(exprNode, ctx);
      }
      let result;
      try {
        result = await performAction(verb, url, evaledArgs, ctx);
      } catch (err) {
        throw err;
      }
      ctx.scope.set(n.name, result);
      return;
    }
    // ── match subject / arms / /match ──────────────────────────────────────
    case "match": {
      const n = node;
      const subject = evalExpr(n.subject, ctx);
      for (const arm of n.arms) {
        const bindings = matchPatterns(arm.patterns, subject);
        if (bindings !== null) {
          const armScope = ctx.scope.child();
          for (const [k, v] of Object.entries(bindings)) {
            armScope.set(k, v);
          }
          const armCtx = { ...ctx, scope: armScope };
          await execute(arm.body, armCtx);
          return;
        }
      }
      console.warn("[LES] match: no arm matched subject:", subject);
      return;
    }
    // ── try / rescue / afterwards / /try ───────────────────────────────────
    case "try": {
      const n = node;
      let threw = false;
      try {
        await execute(n.body, ctx);
      } catch (err) {
        threw = true;
        if (n.rescue) {
          const rescueScope = ctx.scope.child();
          rescueScope.set("error", err);
          const rescueCtx = { ...ctx, scope: rescueScope };
          await execute(n.rescue, rescueCtx);
        } else {
          throw err;
        }
      } finally {
        if (n.afterwards) {
          await execute(n.afterwards, ctx);
        }
      }
      if (threw && !n.rescue) {
      }
      return;
    }
    // ── animation primitive ────────────────────────────────────────────────
    case "animation": {
      const n = node;
      const primitive = ctx.modules.get(n.primitive);
      if (!primitive) {
        console.warn(ctx.modules.hintFor(n.primitive));
        return;
      }
      const selector = resolveSelector(n.selector, ctx);
      const options = {};
      for (const [key, exprNode] of Object.entries(n.options)) {
        options[key] = evalExpr(exprNode, ctx);
      }
      await primitive(selector, n.duration, n.easing, options, ctx.host);
      return;
    }
    // ── raw expression (escape hatch / unknown statements) ─────────────────
    case "expr": {
      const n = node;
      if (n.raw.trim()) {
        evalExpr(n, ctx);
      }
      return;
    }
    // ── action (bare @get etc. not inside a bind) ──────────────────────────
    case "action": {
      const n = node;
      await performAction(n.verb, n.url, {}, ctx);
      return;
    }
    default: {
      const exhaustive = node;
      console.warn("[LES] Unknown node type:", exhaustive.type);
    }
  }
}
function evalExpr(node, ctx) {
  if (!node.raw.trim()) return void 0;
  if (node.raw.startsWith("'") && node.raw.endsWith("'")) {
    return node.raw.slice(1, -1);
  }
  const num = Number(node.raw);
  if (!Number.isNaN(num) && node.raw.trim() !== "") return num;
  if (node.raw === "true") return true;
  if (node.raw === "false") return false;
  if (node.raw === "null" || node.raw === "nil") return null;
  try {
    const scopeSnapshot = ctx.scope.snapshot();
    const signalNames = [...node.raw.matchAll(/\$([a-zA-Z_]\w*)/g)].map((m) => m[1]);
    const signals = {};
    for (const name of signalNames) {
      signals[name] = ctx.getSignal(name);
    }
    let rewritten = node.raw;
    for (const name of signalNames) {
      rewritten = rewritten.replaceAll(`$${name}`, `__sig_${name}`);
    }
    const sigBindings = {};
    for (const [k, v] of Object.entries(signals)) {
      sigBindings[`__sig_${k}`] = v;
    }
    const fn = new Function(
      ...Object.keys(scopeSnapshot),
      ...Object.keys(sigBindings),
      `return (${rewritten})`
    );
    return fn(
      ...Object.values(scopeSnapshot),
      ...Object.values(sigBindings)
    );
  } catch (err) {
    console.warn(`[LES] Expression eval error: ${JSON.stringify(node.raw)}`, err);
    return void 0;
  }
}
function evalGuard(guardExpr, ctx) {
  const result = evalExpr({ type: "expr", raw: guardExpr }, ctx);
  return Boolean(result);
}
function matchPatterns(patterns, subject) {
  if (patterns.length === 1) {
    return matchSingle(patterns[0], subject);
  }
  if (!Array.isArray(subject)) {
    return matchTuple(patterns, subject);
  }
  return matchTuple(patterns, subject);
}
function matchTuple(patterns, subject) {
  const bindings = {};
  for (let i = 0; i < patterns.length; i++) {
    const pat = patterns[i];
    const value = Array.isArray(subject) ? subject[i] : i === 0 ? subject : void 0;
    const result = matchSingle(pat, value);
    if (result === null) return null;
    Object.assign(bindings, result);
  }
  return bindings;
}
function matchSingle(pattern, value) {
  switch (pattern.kind) {
    case "wildcard":
      return {};
    // Always matches, binds nothing
    case "literal":
      return value === pattern.value ? {} : null;
    case "binding":
      return { [pattern.name]: value };
    // Always matches, binds name → value
    case "or": {
      for (const alt of pattern.patterns) {
        const result = matchSingle(alt, value);
        if (result !== null) return result;
      }
      return null;
    }
  }
}
async function performAction(verb, url, args, ctx) {
  const method = verb.toUpperCase();
  let fullUrl = url;
  let body;
  if (method === "GET" || method === "DELETE") {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(args)) {
      params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) fullUrl = `${url}?${qs}`;
  } else {
    body = JSON.stringify(args);
  }
  const response = await fetch(fullUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    ...body ? { body } : {}
  });
  if (!response.ok) {
    throw new Error(`[LES] HTTP ${response.status} from ${method} ${url}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return await response.json();
  }
  return await response.text();
}
function resolveSelector(selector, ctx) {
  return selector.replace(/\[([^\]]+):\s*(\w+)\]/g, (_match, attr, varName) => {
    const value = ctx.scope.get(varName) ?? ctx.getSignal(varName);
    return `[${attr}="${String(value)}"]`;
  });
}
async function runCommand(name, args, ctx) {
  const def = ctx.commands.get(name);
  if (!def) {
    console.warn(`[LES] Unknown command: "${name}"`);
    return false;
  }
  if (def.guard) {
    if (!evalGuard(def.guard, ctx)) return false;
  }
  const scope = ctx.scope.child();
  for (const argDef of def.args) {
    scope.set(argDef.name, args[argDef.name] ?? null);
  }
  await execute(def.body, { ...ctx, scope });
  return true;
}
var init_executor = __esm({
  "src/runtime/executor.ts"() {
    "use strict";
  }
});

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
var BUILTIN_MODULES = {
  animation: () => Promise.resolve().then(() => (init_animation(), animation_exports))
};
async function loadModule(registry, opts) {
  if (opts.type) {
    const loader = BUILTIN_MODULES[opts.type];
    if (!loader) {
      console.warn(`[LES] Unknown built-in module type: "${opts.type}". Available: ${Object.keys(BUILTIN_MODULES).join(", ")}`);
      return;
    }
    const mod = await loader();
    registry.register(mod.default);
    return;
  }
  if (opts.src) {
    try {
      const mod = await import(
        /* @vite-ignore */
        opts.src
      );
      if (!mod.default || typeof mod.default.primitives !== "object") {
        console.warn(`[LES] Module at "${opts.src}" does not export a valid LESModule. Expected: { name: string, primitives: Record<string, Function> }`);
        return;
      }
      registry.register(mod.default);
    } catch (err) {
      console.error(`[LES] Failed to load module from "${opts.src}":`, err);
    }
    return;
  }
  console.warn("[LES] <use-module> requires either type= or src= attribute.");
}

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

// src/runtime/wiring.ts
init_executor();

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

// src/runtime/wiring.ts
function buildContext(host, commands, modules, signals) {
  const scope = new LESScope();
  const emitLocal = (event, payload) => {
    console.log(`[LES] emit "${event}"`, payload.length ? payload : "");
    host.dispatchEvent(new CustomEvent(event, {
      detail: { payload },
      bubbles: false,
      composed: false
    }));
  };
  const broadcast = (event, payload) => {
    console.log(`[LES] broadcast "${event}"`, payload.length ? payload : "");
    host.dispatchEvent(new CustomEvent(event, {
      detail: { payload },
      bubbles: true,
      composed: true
    }));
  };
  return {
    scope,
    host,
    commands,
    modules,
    getSignal: signals.get,
    setSignal: signals.set,
    emitLocal,
    broadcast
  };
}
function registerCommands(wiring, registry) {
  for (const cmd of wiring.commands) {
    const args = parseArgsRaw(cmd.argsRaw);
    const def = {
      name: cmd.name,
      args,
      body: cmd.body,
      element: document.createElement("local-command")
    };
    if (cmd.guard) def.guard = cmd.guard;
    registry.register(def);
  }
  console.log(`[LES] registered ${wiring.commands.length} commands`);
}
function wireEventHandlers(wiring, host, getCtx) {
  const cleanups = [];
  for (const handler of wiring.handlers) {
    const listener = (e) => {
      const ctx = getCtx();
      const handlerScope = ctx.scope.child();
      const detail = e.detail ?? {};
      handlerScope.set("event", e);
      handlerScope.set("payload", detail.payload ?? []);
      const handlerCtx = { ...ctx, scope: handlerScope };
      execute(handler.body, handlerCtx).catch((err) => {
        console.error(`[LES] Error in handler for "${handler.event}":`, err);
      });
    };
    host.addEventListener(handler.event, listener);
    cleanups.push(() => host.removeEventListener(handler.event, listener));
    console.log(`[LES] wired event handler: "${handler.event}"`);
  }
  return () => cleanups.forEach((fn) => fn());
}
async function fireOnLoad(wiring, getCtx) {
  for (const body of wiring.lifecycle.onLoad) {
    try {
      await execute(body, getCtx());
    } catch (err) {
      console.error("[LES] Error in on-load:", err);
    }
  }
}
function parseArgsRaw(raw) {
  if (!raw.trim()) return [];
  const inner = raw.replace(/^\[|\]$/g, "").trim();
  if (!inner) return [];
  return inner.split(/\s{2,}|\s(?=\w+:)/).map((s) => s.trim()).filter(Boolean).map((part) => {
    const eqIdx = part.indexOf("=");
    const colonIdx = part.indexOf(":");
    if (colonIdx === -1) return { name: part, type: "dyn" };
    const name = part.slice(0, colonIdx).trim();
    const rest = part.slice(colonIdx + 1);
    if (eqIdx === -1) {
      return { name, type: rest.trim() };
    } else {
      const type = part.slice(colonIdx + 1, eqIdx).trim();
      const defaultRaw = part.slice(eqIdx + 1).trim();
      const defaultExpr = { type: "expr", raw: defaultRaw };
      return { name, type, default: defaultExpr };
    }
  });
}

// src/elements/LocalEventScript.ts
var LocalEventScript = class extends HTMLElement {
  commands = new CommandRegistry();
  modules = new ModuleRegistry();
  _config = null;
  _wiring = null;
  _ctx = null;
  _cleanup = null;
  // ─── Simple fallback signal store (replaced by Datastar bridge in Phase 6) ─
  _signals = /* @__PURE__ */ new Map();
  // ─── Datastar bridge ───────────────────────────────────────────────────────
  _dsEffect = void 0;
  _dsSignal = void 0;
  get config() {
    return this._config;
  }
  get wiring() {
    return this._wiring;
  }
  get context() {
    return this._ctx;
  }
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
  async _init() {
    console.log("[LES] <local-event-script> initializing", this.id || "(no id)");
    this._config = readConfig(this);
    logConfig(this._config);
    await this._loadModules(this._config);
    this._wiring = this._parseAll(this._config);
    this._ctx = buildContext(
      this,
      this.commands,
      this.modules,
      {
        get: (k) => this._getSignal(k),
        set: (k, v) => this._setSignal(k, v)
      }
    );
    registerCommands(this._wiring, this.commands);
    this._cleanup = wireEventHandlers(
      this._wiring,
      this,
      () => this._ctx
    );
    await fireOnLoad(this._wiring, () => this._ctx);
    console.log("[LES] ready:", this.id || "(no id)");
  }
  _teardown() {
    console.log("[LES] <local-event-script> disconnected", this.id || "(no id)");
    this._cleanup?.();
    this._cleanup = null;
    this._config = null;
    this._wiring = null;
    this._ctx = null;
  }
  // ─── Signal store ─────────────────────────────────────────────────────────
  _getSignal(name) {
    if (this._dsSignal) {
      try {
        return this._dsSignal(name).value;
      } catch {
      }
    }
    return this._signals.get(name);
  }
  _setSignal(name, value) {
    const prev = this._signals.get(name);
    this._signals.set(name, value);
    console.log(`[LES] $${name} =`, value);
    if (prev !== value) {
      this._notifySignalWatchers(name, value);
    }
  }
  _notifySignalWatchers(name, _value) {
  }
  // ─── Module loading ───────────────────────────────────────────────────────
  async _loadModules(config) {
    const moduleDecls = config.modules;
    if (moduleDecls.length === 0) return;
    await Promise.all(
      moduleDecls.map(
        (decl) => loadModule(this.modules, {
          ...decl.type ? { type: decl.type } : {},
          ...decl.src ? { src: decl.src } : {}
        }).catch((err) => console.warn("[LES] Module load failed:", err))
      )
    );
  }
  // ─── Parse all bodies ─────────────────────────────────────────────────────
  _parseAll(config) {
    let ok = 0, fail = 0;
    const tryParse = (body, label) => {
      try {
        ok++;
        return parseLES(body);
      } catch (e) {
        fail++;
        console.error(`[LES] Parse error in ${label}:`, e);
        return { type: "expr", raw: "" };
      }
    };
    const wiring = {
      commands: config.commands.map((d) => ({
        name: d.name,
        guard: d.guard,
        argsRaw: d.argsRaw,
        body: tryParse(d.body, `command "${d.name}"`)
      })),
      handlers: config.onEvent.map((d) => ({
        event: d.name,
        body: tryParse(d.body, `on-event "${d.name}"`)
      })),
      watchers: config.onSignal.map((d) => ({
        signal: d.name,
        when: d.when,
        body: tryParse(d.body, `on-signal "${d.name}"`)
      })),
      lifecycle: {
        onLoad: config.onLoad.map((d) => tryParse(d.body, "on-load")),
        onEnter: config.onEnter.map((d) => ({ when: d.when, body: tryParse(d.body, "on-enter") })),
        onExit: config.onExit.map((d) => tryParse(d.body, "on-exit"))
      }
    };
    const total = ok + fail;
    console.log(`[LES] parser: ${ok}/${total} bodies parsed successfully${fail > 0 ? ` (${fail} errors)` : ""}`);
    return wiring;
  }
  // ─── Datastar bridge ───────────────────────────────────────────────────────
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
  /** Public API: fire a named event into this LES instance from outside */
  fire(event, payload = []) {
    this.dispatchEvent(new CustomEvent(event, {
      detail: { payload },
      bubbles: false,
      composed: false
    }));
  }
  /** Public API: call a command from outside (e.g. from browser console) */
  async call(command, args = {}) {
    if (!this._ctx) {
      console.warn("[LES] not initialized yet");
      return;
    }
    const { runCommand: runCommand2 } = await Promise.resolve().then(() => (init_executor(), executor_exports));
    await runCommand2(command, args, this._ctx);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL21vZHVsZXMvYnVpbHRpbi9hbmltYXRpb24udHMiLCAiLi4vc3JjL3J1bnRpbWUvZXhlY3V0b3IudHMiLCAiLi4vc3JjL3J1bnRpbWUvcmVnaXN0cnkudHMiLCAiLi4vc3JjL21vZHVsZXMvdHlwZXMudHMiLCAiLi4vc3JjL3BhcnNlci9zdHJpcEJvZHkudHMiLCAiLi4vc3JjL3BhcnNlci9yZWFkZXIudHMiLCAiLi4vc3JjL3BhcnNlci90b2tlbml6ZXIudHMiLCAiLi4vc3JjL3BhcnNlci9wYXJzZXIudHMiLCAiLi4vc3JjL3BhcnNlci9pbmRleC50cyIsICIuLi9zcmMvcnVudGltZS93aXJpbmcudHMiLCAiLi4vc3JjL3J1bnRpbWUvc2NvcGUudHMiLCAiLi4vc3JjL2VsZW1lbnRzL0xvY2FsRXZlbnRTY3JpcHQudHMiLCAiLi4vc3JjL2VsZW1lbnRzL0xvY2FsQ29tbWFuZC50cyIsICIuLi9zcmMvZWxlbWVudHMvT25FdmVudC50cyIsICIuLi9zcmMvZWxlbWVudHMvT25TaWduYWwudHMiLCAiLi4vc3JjL2VsZW1lbnRzL0xpZmVjeWNsZS50cyIsICIuLi9zcmMvZWxlbWVudHMvVXNlTW9kdWxlLnRzIiwgIi4uL3NyYy9kYXRhc3Rhci9wbHVnaW4udHMiLCAiLi4vc3JjL2luZGV4LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgdHlwZSB7IExFU01vZHVsZSwgTEVTUHJpbWl0aXZlIH0gZnJvbSAnLi4vdHlwZXMuanMnXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gQnVpbHQtaW4gYW5pbWF0aW9uIG1vZHVsZVxuLy9cbi8vIEFsbCBwcmltaXRpdmVzIHVzZSB0aGUgV2ViIEFuaW1hdGlvbnMgQVBJICguYW5pbWF0ZSgpLmZpbmlzaGVkKSBzbyB0aGV5XG4vLyBpbnRlZ3JhdGUgY2xlYW5seSB3aXRoIExFUydzIGFzeW5jLXRyYW5zcGFyZW50IGB0aGVuYCBzZXF1ZW5jaW5nLlxuLy9cbi8vIFBoYXNlIDcgZmlsbHMgaW4gdGhlIGltcGxlbWVudGF0aW9ucy4gUGhhc2UgMCBqdXN0IHJlZ2lzdGVycyB0aGUgbmFtZXNcbi8vIHNvIHRoZSBleGVjdXRvciBjYW4gZ2l2ZSBoZWxwZnVsIGVycm9ycyByYXRoZXIgdGhhbiBzaWxlbnQgbm8tb3BzLlxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmNvbnN0IFNUVUIgPSAobmFtZTogc3RyaW5nKTogTEVTUHJpbWl0aXZlID0+XG4gIGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgb3B0aW9ucywgaG9zdCkgPT4ge1xuICAgIGNvbnNvbGUuZGVidWcoYFtMRVM6YW5pbWF0aW9uXSAke25hbWV9KFwiJHtzZWxlY3Rvcn1cIiwgJHtkdXJhdGlvbn1tcywgJHtlYXNpbmd9KWAsIG9wdGlvbnMsIGhvc3QpXG4gICAgLy8gUGhhc2UgNyByZXBsYWNlcyB0aGlzIHN0dWIgd2l0aCByZWFsIFdlYiBBbmltYXRpb25zIEFQSSBjYWxsc1xuICB9XG5cbmNvbnN0IGFuaW1hdGlvbk1vZHVsZTogTEVTTW9kdWxlID0ge1xuICBuYW1lOiAnYW5pbWF0aW9uJyxcbiAgcHJpbWl0aXZlczoge1xuICAgICdmYWRlLWluJzogICAgICAgIFNUVUIoJ2ZhZGUtaW4nKSxcbiAgICAnZmFkZS1vdXQnOiAgICAgICBTVFVCKCdmYWRlLW91dCcpLFxuICAgICdzbGlkZS1pbic6ICAgICAgIFNUVUIoJ3NsaWRlLWluJyksXG4gICAgJ3NsaWRlLW91dCc6ICAgICAgU1RVQignc2xpZGUtb3V0JyksXG4gICAgJ3NsaWRlLXVwJzogICAgICAgU1RVQignc2xpZGUtdXAnKSxcbiAgICAnc2xpZGUtZG93bic6ICAgICBTVFVCKCdzbGlkZS1kb3duJyksXG4gICAgJ3B1bHNlJzogICAgICAgICAgU1RVQigncHVsc2UnKSxcbiAgICAnc3RhZ2dlci1lbnRlcic6ICBTVFVCKCdzdGFnZ2VyLWVudGVyJyksXG4gICAgJ3N0YWdnZXItZXhpdCc6ICAgU1RVQignc3RhZ2dlci1leGl0JyksXG4gIH0sXG59XG5cbmV4cG9ydCBkZWZhdWx0IGFuaW1hdGlvbk1vZHVsZVxuIiwgImltcG9ydCB0eXBlIHtcbiAgTEVTTm9kZSwgRXhwck5vZGUsIFNlcXVlbmNlTm9kZSwgUGFyYWxsZWxOb2RlLFxuICBTZXROb2RlLCBFbWl0Tm9kZSwgQnJvYWRjYXN0Tm9kZSwgV2FpdE5vZGUsXG4gIENhbGxOb2RlLCBCaW5kTm9kZSwgTWF0Y2hOb2RlLCBUcnlOb2RlLCBBbmltYXRpb25Ob2RlLFxufSBmcm9tICdAcGFyc2VyL2FzdC5qcydcbmltcG9ydCB0eXBlIHsgUGF0dGVybk5vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcbmltcG9ydCB7IExFU1Njb3BlIH0gZnJvbSAnLi9zY29wZS5qcydcbmltcG9ydCB0eXBlIHsgQ29tbWFuZFJlZ2lzdHJ5IH0gZnJvbSAnLi9yZWdpc3RyeS5qcydcbmltcG9ydCB0eXBlIHsgTW9kdWxlUmVnaXN0cnkgfSBmcm9tICdAbW9kdWxlcy90eXBlcy5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBFeGVjdXRpb24gY29udGV4dCBcdTIwMTQgZXZlcnl0aGluZyB0aGUgZXhlY3V0b3IgbmVlZHMsIHBhc3NlZCBkb3duIHRoZSBjYWxsIHRyZWVcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5leHBvcnQgaW50ZXJmYWNlIExFU0NvbnRleHQge1xuICAvKiogTG9jYWwgdmFyaWFibGUgc2NvcGUgZm9yIHRoZSBjdXJyZW50IGNhbGwgZnJhbWUgKi9cbiAgc2NvcGU6IExFU1Njb3BlXG4gIC8qKiBUaGUgPGxvY2FsLWV2ZW50LXNjcmlwdD4gaG9zdCBlbGVtZW50IFx1MjAxNCB1c2VkIGFzIHF1ZXJ5U2VsZWN0b3Igcm9vdCAqL1xuICBob3N0OiBFbGVtZW50XG4gIC8qKiBDb21tYW5kIGRlZmluaXRpb25zIHJlZ2lzdGVyZWQgYnkgPGxvY2FsLWNvbW1hbmQ+IGNoaWxkcmVuICovXG4gIGNvbW1hbmRzOiBDb21tYW5kUmVnaXN0cnlcbiAgLyoqIEFuaW1hdGlvbiBhbmQgb3RoZXIgcHJpbWl0aXZlIG1vZHVsZXMgKi9cbiAgbW9kdWxlczogTW9kdWxlUmVnaXN0cnlcbiAgLyoqIFJlYWQgYSBEYXRhc3RhciBzaWduYWwgdmFsdWUgYnkgbmFtZSAod2l0aG91dCAkIHByZWZpeCkgKi9cbiAgZ2V0U2lnbmFsOiAobmFtZTogc3RyaW5nKSA9PiB1bmtub3duXG4gIC8qKiBXcml0ZSBhIERhdGFzdGFyIHNpZ25hbCB2YWx1ZSBieSBuYW1lICh3aXRob3V0ICQgcHJlZml4KSAqL1xuICBzZXRTaWduYWw6IChuYW1lOiBzdHJpbmcsIHZhbHVlOiB1bmtub3duKSA9PiB2b2lkXG4gIC8qKiBEaXNwYXRjaCBhIGxvY2FsIEN1c3RvbUV2ZW50IG9uIHRoZSBob3N0IChidWJibGVzOiBmYWxzZSkgKi9cbiAgZW1pdExvY2FsOiAoZXZlbnQ6IHN0cmluZywgcGF5bG9hZDogdW5rbm93bltdKSA9PiB2b2lkXG4gIC8qKiBEaXNwYXRjaCBhIERPTS13aWRlIEN1c3RvbUV2ZW50IChidWJibGVzOiB0cnVlLCBjb21wb3NlZDogdHJ1ZSkgKi9cbiAgYnJvYWRjYXN0OiAoZXZlbnQ6IHN0cmluZywgcGF5bG9hZDogdW5rbm93bltdKSA9PiB2b2lkXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gTWFpbiBleGVjdXRvclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogRXhlY3V0ZXMgYSBMRVNOb2RlIEFTVCBpbiB0aGUgZ2l2ZW4gY29udGV4dC5cbiAqXG4gKiBBc3luYyB0cmFuc3BhcmVuY3k6IGV2ZXJ5IHN0ZXAgaXMgYXdhaXRlZCByZWdhcmRsZXNzIG9mIHdoZXRoZXIgaXRcbiAqIGlzIHN5bmNocm9ub3VzIG9yIHJldHVybnMgYSBQcm9taXNlLiBUaGUgYXV0aG9yIG5ldmVyIHdyaXRlcyBgYXdhaXRgLlxuICogVGhlIGB0aGVuYCBjb25uZWN0aXZlIGluIExFUyBzb3VyY2UgbWFwcyB0byBzZXF1ZW50aWFsIGBhd2FpdGAgaGVyZS5cbiAqIFRoZSBgYW5kYCBjb25uZWN0aXZlIG1hcHMgdG8gYFByb21pc2UuYWxsYC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGUobm9kZTogTEVTTm9kZSwgY3R4OiBMRVNDb250ZXh0KTogUHJvbWlzZTx2b2lkPiB7XG4gIHN3aXRjaCAobm9kZS50eXBlKSB7XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgU2VxdWVuY2U6IEEgdGhlbiBCIHRoZW4gQyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdzZXF1ZW5jZSc6XG4gICAgICBmb3IgKGNvbnN0IHN0ZXAgb2YgKG5vZGUgYXMgU2VxdWVuY2VOb2RlKS5zdGVwcykge1xuICAgICAgICBhd2FpdCBleGVjdXRlKHN0ZXAsIGN0eClcbiAgICAgIH1cbiAgICAgIHJldHVyblxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIFBhcmFsbGVsOiBBIGFuZCBCIGFuZCBDIChQcm9taXNlLmFsbCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAncGFyYWxsZWwnOlxuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoKG5vZGUgYXMgUGFyYWxsZWxOb2RlKS5icmFuY2hlcy5tYXAoYiA9PiBleGVjdXRlKGIsIGN0eCkpKVxuICAgICAgcmV0dXJuXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgc2V0ICRzaWduYWwgdG8gZXhwciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdzZXQnOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBTZXROb2RlXG4gICAgICBjb25zdCB2YWx1ZSA9IGV2YWxFeHByKG4udmFsdWUsIGN0eClcbiAgICAgIGN0eC5zZXRTaWduYWwobi5zaWduYWwsIHZhbHVlKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIGVtaXQgZXZlbnQ6bmFtZSBbcGF5bG9hZF0gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnZW1pdCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIEVtaXROb2RlXG4gICAgICBjb25zdCBwYXlsb2FkID0gbi5wYXlsb2FkLm1hcChwID0+IGV2YWxFeHByKHAsIGN0eCkpXG4gICAgICBjdHguZW1pdExvY2FsKG4uZXZlbnQsIHBheWxvYWQpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgYnJvYWRjYXN0IGV2ZW50Om5hbWUgW3BheWxvYWRdIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ2Jyb2FkY2FzdCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIEJyb2FkY2FzdE5vZGVcbiAgICAgIGNvbnN0IHBheWxvYWQgPSBuLnBheWxvYWQubWFwKHAgPT4gZXZhbEV4cHIocCwgY3R4KSlcbiAgICAgIGN0eC5icm9hZGNhc3Qobi5ldmVudCwgcGF5bG9hZClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCB3YWl0IE5tcyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICd3YWl0Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgV2FpdE5vZGVcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBuLm1zKSlcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBjYWxsIGNvbW1hbmQ6bmFtZSBbYXJnc10gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnY2FsbCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIENhbGxOb2RlXG4gICAgICBjb25zdCBkZWYgPSBjdHguY29tbWFuZHMuZ2V0KG4uY29tbWFuZClcbiAgICAgIGlmICghZGVmKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgW0xFU10gVW5rbm93biBjb21tYW5kOiBcIiR7bi5jb21tYW5kfVwiYClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIC8vIEV2YWx1YXRlIGd1YXJkIFx1MjAxNCBmYWxzeSA9IHNpbGVudCBuby1vcCAobm90IGFuIGVycm9yLCBubyByZXNjdWUpXG4gICAgICBpZiAoZGVmLmd1YXJkKSB7XG4gICAgICAgIGNvbnN0IHBhc3NlcyA9IGV2YWxHdWFyZChkZWYuZ3VhcmQsIGN0eClcbiAgICAgICAgaWYgKCFwYXNzZXMpIHtcbiAgICAgICAgICBjb25zb2xlLmRlYnVnKGBbTEVTXSBjb21tYW5kIFwiJHtuLmNvbW1hbmR9XCIgZ3VhcmQgcmVqZWN0ZWRgKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIEJ1aWxkIGNoaWxkIHNjb3BlOiBiaW5kIGFyZ3MgaW50byBpdFxuICAgICAgY29uc3QgY2hpbGRTY29wZSA9IGN0eC5zY29wZS5jaGlsZCgpXG4gICAgICBjb25zdCBldmFsZWRBcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIGV4cHJOb2RlXSBvZiBPYmplY3QuZW50cmllcyhuLmFyZ3MpKSB7XG4gICAgICAgIGV2YWxlZEFyZ3Nba2V5XSA9IGV2YWxFeHByKGV4cHJOb2RlLCBjdHgpXG4gICAgICB9XG5cbiAgICAgIC8vIEFwcGx5IGFyZyBkZWZhdWx0cyBmcm9tIGRlZiAoUGhhc2UgMiBBcmdEZWYgcGFyc2luZyBcdTIwMTQgc2ltcGxpZmllZCBoZXJlKVxuICAgICAgZm9yIChjb25zdCBhcmdEZWYgb2YgZGVmLmFyZ3MpIHtcbiAgICAgICAgaWYgKCEoYXJnRGVmLm5hbWUgaW4gZXZhbGVkQXJncykgJiYgYXJnRGVmLmRlZmF1bHQpIHtcbiAgICAgICAgICBldmFsZWRBcmdzW2FyZ0RlZi5uYW1lXSA9IGV2YWxFeHByKGFyZ0RlZi5kZWZhdWx0LCBjdHgpXG4gICAgICAgIH1cbiAgICAgICAgY2hpbGRTY29wZS5zZXQoYXJnRGVmLm5hbWUsIGV2YWxlZEFyZ3NbYXJnRGVmLm5hbWVdID8/IG51bGwpXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNoaWxkQ3R4OiBMRVNDb250ZXh0ID0geyAuLi5jdHgsIHNjb3BlOiBjaGlsZFNjb3BlIH1cbiAgICAgIGF3YWl0IGV4ZWN1dGUoZGVmLmJvZHksIGNoaWxkQ3R4KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIG5hbWUgPC0gQHZlcmIgJ3VybCcgW2FyZ3NdIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ2JpbmQnOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBCaW5kTm9kZVxuICAgICAgY29uc3QgeyB2ZXJiLCB1cmwsIGFyZ3MgfSA9IG4uYWN0aW9uXG4gICAgICBjb25zdCBldmFsZWRBcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIGV4cHJOb2RlXSBvZiBPYmplY3QuZW50cmllcyhhcmdzKSkge1xuICAgICAgICBldmFsZWRBcmdzW2tleV0gPSBldmFsRXhwcihleHByTm9kZSwgY3R4KVxuICAgICAgfVxuXG4gICAgICBsZXQgcmVzdWx0OiB1bmtub3duXG4gICAgICB0cnkge1xuICAgICAgICByZXN1bHQgPSBhd2FpdCBwZXJmb3JtQWN0aW9uKHZlcmIsIHVybCwgZXZhbGVkQXJncywgY3R4KVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIC8vIFByb3BhZ2F0ZSBzbyBlbmNsb3NpbmcgdHJ5L3Jlc2N1ZSBjYW4gY2F0Y2ggaXRcbiAgICAgICAgdGhyb3cgZXJyXG4gICAgICB9XG5cbiAgICAgIGN0eC5zY29wZS5zZXQobi5uYW1lLCByZXN1bHQpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgbWF0Y2ggc3ViamVjdCAvIGFybXMgLyAvbWF0Y2ggXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnbWF0Y2gnOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBNYXRjaE5vZGVcbiAgICAgIGNvbnN0IHN1YmplY3QgPSBldmFsRXhwcihuLnN1YmplY3QsIGN0eClcblxuICAgICAgZm9yIChjb25zdCBhcm0gb2Ygbi5hcm1zKSB7XG4gICAgICAgIGNvbnN0IGJpbmRpbmdzID0gbWF0Y2hQYXR0ZXJucyhhcm0ucGF0dGVybnMsIHN1YmplY3QpXG4gICAgICAgIGlmIChiaW5kaW5ncyAhPT0gbnVsbCkge1xuICAgICAgICAgIC8vIENyZWF0ZSBjaGlsZCBzY29wZSB3aXRoIHBhdHRlcm4gYmluZGluZ3NcbiAgICAgICAgICBjb25zdCBhcm1TY29wZSA9IGN0eC5zY29wZS5jaGlsZCgpXG4gICAgICAgICAgZm9yIChjb25zdCBbaywgdl0gb2YgT2JqZWN0LmVudHJpZXMoYmluZGluZ3MpKSB7XG4gICAgICAgICAgICBhcm1TY29wZS5zZXQoaywgdilcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgYXJtQ3R4OiBMRVNDb250ZXh0ID0geyAuLi5jdHgsIHNjb3BlOiBhcm1TY29wZSB9XG4gICAgICAgICAgYXdhaXQgZXhlY3V0ZShhcm0uYm9keSwgYXJtQ3R4KVxuICAgICAgICAgIHJldHVybiAgIC8vIEZpcnN0IG1hdGNoaW5nIGFybSB3aW5zIFx1MjAxNCBubyBmYWxsdGhyb3VnaFxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gbWF0Y2g6IG5vIGFybSBtYXRjaGVkIHN1YmplY3Q6Jywgc3ViamVjdClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCB0cnkgLyByZXNjdWUgLyBhZnRlcndhcmRzIC8gL3RyeSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICd0cnknOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBUcnlOb2RlXG4gICAgICBsZXQgdGhyZXcgPSBmYWxzZVxuXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBleGVjdXRlKG4uYm9keSwgY3R4KVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHRocmV3ID0gdHJ1ZVxuICAgICAgICBpZiAobi5yZXNjdWUpIHtcbiAgICAgICAgICAvLyBCaW5kIHRoZSBlcnJvciBhcyBgJGVycm9yYCBpbiB0aGUgcmVzY3VlIHNjb3BlXG4gICAgICAgICAgY29uc3QgcmVzY3VlU2NvcGUgPSBjdHguc2NvcGUuY2hpbGQoKVxuICAgICAgICAgIHJlc2N1ZVNjb3BlLnNldCgnZXJyb3InLCBlcnIpXG4gICAgICAgICAgY29uc3QgcmVzY3VlQ3R4OiBMRVNDb250ZXh0ID0geyAuLi5jdHgsIHNjb3BlOiByZXNjdWVTY29wZSB9XG4gICAgICAgICAgYXdhaXQgZXhlY3V0ZShuLnJlc2N1ZSwgcmVzY3VlQ3R4KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE5vIHJlc2N1ZSBjbGF1c2UgXHUyMDE0IHJlLXRocm93IHNvIG91dGVyIHRyeSBjYW4gY2F0Y2ggaXRcbiAgICAgICAgICB0aHJvdyBlcnJcbiAgICAgICAgfVxuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgaWYgKG4uYWZ0ZXJ3YXJkcykge1xuICAgICAgICAgIC8vIGFmdGVyd2FyZHMgYWx3YXlzIHJ1bnMgaWYgZXhlY3V0aW9uIGVudGVyZWQgdGhlIHRyeSBib2R5XG4gICAgICAgICAgLy8gKGd1YXJkIHJlamVjdGlvbiBuZXZlciByZWFjaGVzIGhlcmUgXHUyMDE0IHNlZSBgY2FsbGAgaGFuZGxlciBhYm92ZSlcbiAgICAgICAgICBhd2FpdCBleGVjdXRlKG4uYWZ0ZXJ3YXJkcywgY3R4KVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aHJldyAmJiAhbi5yZXNjdWUpIHtcbiAgICAgICAgLy8gQWxyZWFkeSByZS10aHJvd24gYWJvdmUgXHUyMDE0IHVucmVhY2hhYmxlLCBidXQgVHlwZVNjcmlwdCBuZWVkcyB0aGlzXG4gICAgICB9XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgYW5pbWF0aW9uIHByaW1pdGl2ZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdhbmltYXRpb24nOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBBbmltYXRpb25Ob2RlXG4gICAgICBjb25zdCBwcmltaXRpdmUgPSBjdHgubW9kdWxlcy5nZXQobi5wcmltaXRpdmUpXG5cbiAgICAgIGlmICghcHJpbWl0aXZlKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihjdHgubW9kdWxlcy5oaW50Rm9yKG4ucHJpbWl0aXZlKSlcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIC8vIFJlc29sdmUgc2VsZWN0b3IgXHUyMDE0IHN1YnN0aXR1dGUgYW55IGxvY2FsIHZhcmlhYmxlIHJlZmVyZW5jZXNcbiAgICAgIGNvbnN0IHNlbGVjdG9yID0gcmVzb2x2ZVNlbGVjdG9yKG4uc2VsZWN0b3IsIGN0eClcblxuICAgICAgLy8gRXZhbHVhdGUgb3B0aW9uc1xuICAgICAgY29uc3Qgb3B0aW9uczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fVxuICAgICAgZm9yIChjb25zdCBba2V5LCBleHByTm9kZV0gb2YgT2JqZWN0LmVudHJpZXMobi5vcHRpb25zKSkge1xuICAgICAgICBvcHRpb25zW2tleV0gPSBldmFsRXhwcihleHByTm9kZSwgY3R4KVxuICAgICAgfVxuXG4gICAgICAvLyBBd2FpdCB0aGUgYW5pbWF0aW9uIFx1MjAxNCB0aGlzIGlzIHRoZSBjb3JlIG9mIGFzeW5jIHRyYW5zcGFyZW5jeTpcbiAgICAgIC8vIFdlYiBBbmltYXRpb25zIEFQSSByZXR1cm5zIGFuIEFuaW1hdGlvbiB3aXRoIGEgLmZpbmlzaGVkIFByb21pc2UuXG4gICAgICAvLyBgdGhlbmAgaW4gTEVTIHNvdXJjZSBhd2FpdHMgdGhpcyBuYXR1cmFsbHkuXG4gICAgICBhd2FpdCBwcmltaXRpdmUoc2VsZWN0b3IsIG4uZHVyYXRpb24sIG4uZWFzaW5nLCBvcHRpb25zLCBjdHguaG9zdClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCByYXcgZXhwcmVzc2lvbiAoZXNjYXBlIGhhdGNoIC8gdW5rbm93biBzdGF0ZW1lbnRzKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdleHByJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgRXhwck5vZGVcbiAgICAgIGlmIChuLnJhdy50cmltKCkpIHtcbiAgICAgICAgLy8gRXZhbHVhdGUgYXMgYSBKUyBleHByZXNzaW9uIGZvciBzaWRlIGVmZmVjdHNcbiAgICAgICAgLy8gVGhpcyBoYW5kbGVzIHVua25vd24gcHJpbWl0aXZlcyBhbmQgZnV0dXJlIGtleXdvcmRzIGdyYWNlZnVsbHlcbiAgICAgICAgZXZhbEV4cHIobiwgY3R4KVxuICAgICAgfVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIGFjdGlvbiAoYmFyZSBAZ2V0IGV0Yy4gbm90IGluc2lkZSBhIGJpbmQpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ2FjdGlvbic6IHtcbiAgICAgIC8vIEJhcmUgYWN0aW9ucyB3aXRob3V0IGJpbmQganVzdCBmaXJlIGFuZCBkaXNjYXJkIHRoZSByZXN1bHRcbiAgICAgIGNvbnN0IG4gPSBub2RlXG4gICAgICBhd2FpdCBwZXJmb3JtQWN0aW9uKG4udmVyYiwgbi51cmwsIHt9LCBjdHgpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBkZWZhdWx0OiB7XG4gICAgICBjb25zdCBleGhhdXN0aXZlOiBuZXZlciA9IG5vZGVcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gVW5rbm93biBub2RlIHR5cGU6JywgKGV4aGF1c3RpdmUgYXMgTEVTTm9kZSkudHlwZSlcbiAgICB9XG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBFeHByZXNzaW9uIGV2YWx1YXRpb25cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEV2YWx1YXRlcyBhIHJhdyBKUyBleHByZXNzaW9uIHN0cmluZyBpbiBhIHNhbmRib3hlZCBjb250ZXh0IHRoYXRcbiAqIGV4cG9zZXMgc2NvcGUgbG9jYWxzIGFuZCBEYXRhc3RhciBzaWduYWxzIHZpYSBhIFByb3h5LlxuICpcbiAqIFNpZ25hbCBhY2Nlc3M6IGAkZmVlZFN0YXRlYCBcdTIxOTIgcmVhZHMgdGhlIGBmZWVkU3RhdGVgIHNpZ25hbFxuICogTG9jYWwgYWNjZXNzOiAgYGZpbHRlcmAgICAgXHUyMTkyIHJlYWRzIGZyb20gc2NvcGVcbiAqXG4gKiBUaGUgc2FuZGJveCBpcyBpbnRlbnRpb25hbGx5IHNpbXBsZSBmb3IgUGhhc2UgMy4gQSBwcm9wZXIgc2FuZGJveFxuICogKENTUC1jb21wYXRpYmxlLCBubyBldmFsIGZhbGxiYWNrKSBpcyBhIGZ1dHVyZSBoYXJkZW5pbmcgdGFzay5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV2YWxFeHByKG5vZGU6IEV4cHJOb2RlLCBjdHg6IExFU0NvbnRleHQpOiB1bmtub3duIHtcbiAgaWYgKCFub2RlLnJhdy50cmltKCkpIHJldHVybiB1bmRlZmluZWRcblxuICAvLyBGYXN0IHBhdGg6IHNpbXBsZSBzdHJpbmcgbGl0ZXJhbFxuICBpZiAobm9kZS5yYXcuc3RhcnRzV2l0aChcIidcIikgJiYgbm9kZS5yYXcuZW5kc1dpdGgoXCInXCIpKSB7XG4gICAgcmV0dXJuIG5vZGUucmF3LnNsaWNlKDEsIC0xKVxuICB9XG4gIC8vIEZhc3QgcGF0aDogbnVtYmVyIGxpdGVyYWxcbiAgY29uc3QgbnVtID0gTnVtYmVyKG5vZGUucmF3KVxuICBpZiAoIU51bWJlci5pc05hTihudW0pICYmIG5vZGUucmF3LnRyaW0oKSAhPT0gJycpIHJldHVybiBudW1cbiAgLy8gRmFzdCBwYXRoOiBib29sZWFuXG4gIGlmIChub2RlLnJhdyA9PT0gJ3RydWUnKSAgcmV0dXJuIHRydWVcbiAgaWYgKG5vZGUucmF3ID09PSAnZmFsc2UnKSByZXR1cm4gZmFsc2VcbiAgaWYgKG5vZGUucmF3ID09PSAnbnVsbCcgfHwgbm9kZS5yYXcgPT09ICduaWwnKSByZXR1cm4gbnVsbFxuXG4gIHRyeSB7XG4gICAgLy8gQnVpbGQgYSBmbGF0IG9iamVjdCBvZiBhbGwgYWNjZXNzaWJsZSBuYW1lczpcbiAgICAvLyAtIFNjb3BlIGxvY2FscyAoaW5uZXJtb3N0IHdpbnMpXG4gICAgLy8gLSBEYXRhc3RhciBzaWduYWxzIHZpYSAkLXByZWZpeCBzdHJpcHBpbmdcbiAgICBjb25zdCBzY29wZVNuYXBzaG90ID0gY3R4LnNjb3BlLnNuYXBzaG90KClcblxuICAgIC8vIEV4dHJhY3Qgc2lnbmFsIHJlZmVyZW5jZXMgZnJvbSB0aGUgZXhwcmVzc2lvbiAoJG5hbWUgXHUyMTkyIG5hbWUpXG4gICAgY29uc3Qgc2lnbmFsTmFtZXMgPSBbLi4ubm9kZS5yYXcubWF0Y2hBbGwoL1xcJChbYS16QS1aX11cXHcqKS9nKV1cbiAgICAgIC5tYXAobSA9PiBtWzFdISlcblxuICAgIGNvbnN0IHNpZ25hbHM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge31cbiAgICBmb3IgKGNvbnN0IG5hbWUgb2Ygc2lnbmFsTmFtZXMpIHtcbiAgICAgIHNpZ25hbHNbbmFtZV0gPSBjdHguZ2V0U2lnbmFsKG5hbWUpXG4gICAgfVxuXG4gICAgLy8gUmV3cml0ZSAkbmFtZSBcdTIxOTIgX19zaWdfbmFtZSBpbiB0aGUgZXhwcmVzc2lvbiBzbyB3ZSBjYW4gcGFzcyBzaWduYWxzXG4gICAgLy8gYXMgcGxhaW4gdmFyaWFibGVzIChhdm9pZHMgJCBpbiBKUyBpZGVudGlmaWVycylcbiAgICBsZXQgcmV3cml0dGVuID0gbm9kZS5yYXdcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2Ygc2lnbmFsTmFtZXMpIHtcbiAgICAgIHJld3JpdHRlbiA9IHJld3JpdHRlbi5yZXBsYWNlQWxsKGAkJHtuYW1lfWAsIGBfX3NpZ18ke25hbWV9YClcbiAgICB9XG5cbiAgICAvLyBQcmVmaXggc2lnbmFsIHZhcnMgaW4gdGhlIGJpbmRpbmcgb2JqZWN0XG4gICAgY29uc3Qgc2lnQmluZGluZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge31cbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhzaWduYWxzKSkge1xuICAgICAgc2lnQmluZGluZ3NbYF9fc2lnXyR7a31gXSA9IHZcbiAgICB9XG5cbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tbmV3LWZ1bmNcbiAgICBjb25zdCBmbiA9IG5ldyBGdW5jdGlvbihcbiAgICAgIC4uLk9iamVjdC5rZXlzKHNjb3BlU25hcHNob3QpLFxuICAgICAgLi4uT2JqZWN0LmtleXMoc2lnQmluZGluZ3MpLFxuICAgICAgYHJldHVybiAoJHtyZXdyaXR0ZW59KWBcbiAgICApXG4gICAgcmV0dXJuIGZuKFxuICAgICAgLi4uT2JqZWN0LnZhbHVlcyhzY29wZVNuYXBzaG90KSxcbiAgICAgIC4uLk9iamVjdC52YWx1ZXMoc2lnQmluZGluZ3MpXG4gICAgKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLndhcm4oYFtMRVNdIEV4cHJlc3Npb24gZXZhbCBlcnJvcjogJHtKU09OLnN0cmluZ2lmeShub2RlLnJhdyl9YCwgZXJyKVxuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxufVxuXG4vKipcbiAqIEV2YWx1YXRlcyBhIGd1YXJkIGV4cHJlc3Npb24gc3RyaW5nIChmcm9tIGNvbW1hbmQgYGd1YXJkYCBhdHRyaWJ1dGUpLlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBndWFyZCBwYXNzZXMgKGNvbW1hbmQgc2hvdWxkIHJ1biksIGZhbHNlIHRvIHNpbGVudC1hYm9ydC5cbiAqL1xuZnVuY3Rpb24gZXZhbEd1YXJkKGd1YXJkRXhwcjogc3RyaW5nLCBjdHg6IExFU0NvbnRleHQpOiBib29sZWFuIHtcbiAgY29uc3QgcmVzdWx0ID0gZXZhbEV4cHIoeyB0eXBlOiAnZXhwcicsIHJhdzogZ3VhcmRFeHByIH0sIGN0eClcbiAgcmV0dXJuIEJvb2xlYW4ocmVzdWx0KVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFBhdHRlcm4gbWF0Y2hpbmdcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEF0dGVtcHRzIHRvIG1hdGNoIGBzdWJqZWN0YCBhZ2FpbnN0IGBwYXR0ZXJuc2AuXG4gKlxuICogUmV0dXJucyBhIGJpbmRpbmdzIG1hcCBpZiBtYXRjaGVkIChlbXB0eSBtYXAgZm9yIHdpbGRjYXJkL2xpdGVyYWwgbWF0Y2hlcyksXG4gKiBvciBudWxsIGlmIHRoZSBtYXRjaCBmYWlscy5cbiAqXG4gKiBGb3IgdHVwbGUgcGF0dGVybnMsIGBzdWJqZWN0YCBpcyBtYXRjaGVkIGVsZW1lbnQtYnktZWxlbWVudC5cbiAqIEZvciBvci1wYXR0ZXJucywgYW55IGFsdGVybmF0aXZlIG1hdGNoaW5nIHJldHVybnMgdGhlIGJpbmRpbmdzLlxuICovXG5mdW5jdGlvbiBtYXRjaFBhdHRlcm5zKFxuICBwYXR0ZXJuczogUGF0dGVybk5vZGVbXSxcbiAgc3ViamVjdDogdW5rbm93blxuKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsIHtcbiAgLy8gU2luZ2xlLXBhdHRlcm4gKG1vc3QgY29tbW9uKTogbWF0Y2ggZGlyZWN0bHlcbiAgaWYgKHBhdHRlcm5zLmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBtYXRjaFNpbmdsZShwYXR0ZXJuc1swXSEsIHN1YmplY3QpXG4gIH1cblxuICAvLyBUdXBsZSBwYXR0ZXJuOiBzdWJqZWN0IG11c3QgYmUgYW4gYXJyYXlcbiAgaWYgKCFBcnJheS5pc0FycmF5KHN1YmplY3QpKSB7XG4gICAgLy8gV3JhcCBzaW5nbGUgdmFsdWUgaW4gdHVwbGUgZm9yIGVyZ29ub21pY3NcbiAgICAvLyBlLmcuIGBbaXQgb2tdYCBhZ2FpbnN0IGEge29rOiB0cnVlLCBkYXRhOiAuLi59IHJlc3BvbnNlXG4gICAgcmV0dXJuIG1hdGNoVHVwbGUocGF0dGVybnMsIHN1YmplY3QpXG4gIH1cblxuICByZXR1cm4gbWF0Y2hUdXBsZShwYXR0ZXJucywgc3ViamVjdClcbn1cblxuZnVuY3Rpb24gbWF0Y2hUdXBsZShcbiAgcGF0dGVybnM6IFBhdHRlcm5Ob2RlW10sXG4gIHN1YmplY3Q6IHVua25vd25cbik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbCB7XG4gIC8vIEZvciBub24tYXJyYXkgc3ViamVjdHMsIHRyeSBiaW5kaW5nIGVhY2ggcGF0dGVybiBhZ2FpbnN0IHRoZSB3aG9sZSBzdWJqZWN0XG4gIC8vIChoYW5kbGVzIGBbaXQgb2tdYCBtYXRjaGluZyBhbiBvYmplY3Qgd2hlcmUgYGl0YCA9IG9iamVjdCwgYG9rYCA9IHN0YXR1cylcbiAgY29uc3QgYmluZGluZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge31cblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHBhdHRlcm5zLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgcGF0ID0gcGF0dGVybnNbaV0hXG5cbiAgICAvLyBGb3IgdHVwbGUgcGF0dGVybnMgYWdhaW5zdCBvYmplY3RzLCB3ZSBkbyBhIHN0cnVjdHVyYWwgbWF0Y2g6XG4gICAgLy8gYFtpdCBva11gIGFnYWluc3Qge2RhdGE6IC4uLiwgc3RhdHVzOiAnb2snfSBiaW5kcyBgaXRgID0gZGF0YSwgYG9rYCA9ICdvaydcbiAgICAvLyBUaGlzIGlzIGEgc2ltcGxpZmljYXRpb24gXHUyMDE0IGZ1bGwgc3RydWN0dXJhbCBtYXRjaGluZyBjb21lcyBpbiBhIGxhdGVyIHBhc3NcbiAgICBjb25zdCB2YWx1ZSA9IEFycmF5LmlzQXJyYXkoc3ViamVjdClcbiAgICAgID8gc3ViamVjdFtpXVxuICAgICAgOiBpID09PSAwID8gc3ViamVjdCA6IHVuZGVmaW5lZFxuXG4gICAgY29uc3QgcmVzdWx0ID0gbWF0Y2hTaW5nbGUocGF0LCB2YWx1ZSlcbiAgICBpZiAocmVzdWx0ID09PSBudWxsKSByZXR1cm4gbnVsbFxuICAgIE9iamVjdC5hc3NpZ24oYmluZGluZ3MsIHJlc3VsdClcbiAgfVxuXG4gIHJldHVybiBiaW5kaW5nc1xufVxuXG5mdW5jdGlvbiBtYXRjaFNpbmdsZShcbiAgcGF0dGVybjogUGF0dGVybk5vZGUsXG4gIHZhbHVlOiB1bmtub3duXG4pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IG51bGwge1xuICBzd2l0Y2ggKHBhdHRlcm4ua2luZCkge1xuICAgIGNhc2UgJ3dpbGRjYXJkJzpcbiAgICAgIHJldHVybiB7fSAgIC8vIEFsd2F5cyBtYXRjaGVzLCBiaW5kcyBub3RoaW5nXG5cbiAgICBjYXNlICdsaXRlcmFsJzpcbiAgICAgIHJldHVybiB2YWx1ZSA9PT0gcGF0dGVybi52YWx1ZSA/IHt9IDogbnVsbFxuXG4gICAgY2FzZSAnYmluZGluZyc6XG4gICAgICByZXR1cm4geyBbcGF0dGVybi5uYW1lXTogdmFsdWUgfSAgIC8vIEFsd2F5cyBtYXRjaGVzLCBiaW5kcyBuYW1lIFx1MjE5MiB2YWx1ZVxuXG4gICAgY2FzZSAnb3InOiB7XG4gICAgICBmb3IgKGNvbnN0IGFsdCBvZiBwYXR0ZXJuLnBhdHRlcm5zKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IG1hdGNoU2luZ2xlKGFsdCwgdmFsdWUpXG4gICAgICAgIGlmIChyZXN1bHQgIT09IG51bGwpIHJldHVybiByZXN1bHRcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsXG4gICAgfVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gSFRUUCBhY3Rpb25cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFBlcmZvcm1zIGFuIEhUVFAgYWN0aW9uIChAZ2V0LCBAcG9zdCwgZXRjLikuXG4gKlxuICogRm9yIFBoYXNlIDM6IHVzZXMgbmF0aXZlIGZldGNoIGRpcmVjdGx5LlxuICogUGhhc2UgNiB3aWxsIHN3YXAgdGhpcyBmb3IgRGF0YXN0YXIncyBAYWN0aW9uIHN5c3RlbSB3aGVuIGF2YWlsYWJsZSxcbiAqIHdoaWNoIGFkZHMgc2lnbmFsIHNlcmlhbGl6YXRpb24sIFNTRSByZXNwb25zZSBoYW5kbGluZywgZXRjLlxuICpcbiAqIFJldHVybnMgdGhlIHBhcnNlZCBKU09OIHJlc3BvbnNlIGJvZHksIG9yIHRocm93cyBvbiBuZXR3b3JrL0hUVFAgZXJyb3IuXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHBlcmZvcm1BY3Rpb24oXG4gIHZlcmI6IHN0cmluZyxcbiAgdXJsOiBzdHJpbmcsXG4gIGFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICBjdHg6IExFU0NvbnRleHRcbik6IFByb21pc2U8dW5rbm93bj4ge1xuICBjb25zdCBtZXRob2QgPSB2ZXJiLnRvVXBwZXJDYXNlKClcblxuICBsZXQgZnVsbFVybCA9IHVybFxuICBsZXQgYm9keTogc3RyaW5nIHwgdW5kZWZpbmVkXG5cbiAgaWYgKG1ldGhvZCA9PT0gJ0dFVCcgfHwgbWV0aG9kID09PSAnREVMRVRFJykge1xuICAgIC8vIEFyZ3MgYXMgcXVlcnkgcGFyYW1zXG4gICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcygpXG4gICAgZm9yIChjb25zdCBbaywgdl0gb2YgT2JqZWN0LmVudHJpZXMoYXJncykpIHtcbiAgICAgIHBhcmFtcy5zZXQoaywgU3RyaW5nKHYpKVxuICAgIH1cbiAgICBjb25zdCBxcyA9IHBhcmFtcy50b1N0cmluZygpXG4gICAgaWYgKHFzKSBmdWxsVXJsID0gYCR7dXJsfT8ke3FzfWBcbiAgfSBlbHNlIHtcbiAgICBib2R5ID0gSlNPTi5zdHJpbmdpZnkoYXJncylcbiAgfVxuXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goZnVsbFVybCwge1xuICAgIG1ldGhvZCxcbiAgICBoZWFkZXJzOiB7XG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgJ0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICB9LFxuICAgIC4uLihib2R5ID8geyBib2R5IH0gOiB7fSksXG4gIH0pXG5cbiAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgIHRocm93IG5ldyBFcnJvcihgW0xFU10gSFRUUCAke3Jlc3BvbnNlLnN0YXR1c30gZnJvbSAke21ldGhvZH0gJHt1cmx9YClcbiAgfVxuXG4gIGNvbnN0IGNvbnRlbnRUeXBlID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpID8/ICcnXG4gIGlmIChjb250ZW50VHlwZS5pbmNsdWRlcygnYXBwbGljYXRpb24vanNvbicpKSB7XG4gICAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLmpzb24oKVxuICB9XG5cbiAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLnRleHQoKVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFNlbGVjdG9yIHJlc29sdXRpb25cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFJlc29sdmVzIHZhcmlhYmxlIHJlZmVyZW5jZXMgaW4gYW4gYW5pbWF0aW9uIHNlbGVjdG9yLlxuICpcbiAqIEV4YW1wbGU6IGBbZGF0YS1pdGVtLWlkOiBpZF1gIHdoZXJlIGBpZGAgaXMgYSBsb2NhbCB2YXJpYWJsZVxuICogYmVjb21lcyBgW2RhdGEtaXRlbS1pZD1cIjEyM1wiXWAgYWZ0ZXIgc3Vic3RpdHV0aW9uLlxuICpcbiAqIFNpbXBsZSBhcHByb2FjaCBmb3IgUGhhc2UgMzogbG9vayBmb3IgYDogdmFybmFtZWAgcGF0dGVybnMgaW4gYXR0cmlidXRlXG4gKiBzZWxlY3RvcnMgYW5kIHN1YnN0aXR1dGUgZnJvbSBzY29wZS5cbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZVNlbGVjdG9yKHNlbGVjdG9yOiBzdHJpbmcsIGN0eDogTEVTQ29udGV4dCk6IHN0cmluZyB7XG4gIC8vIEhhbmRsZSBhdHRyaWJ1dGUgc2VsZWN0b3Igd2l0aCB2YXJpYWJsZTogW2RhdGEtaXRlbS1pZDogaWRdXG4gIHJldHVybiBzZWxlY3Rvci5yZXBsYWNlKC9cXFsoW15cXF1dKyk6XFxzKihcXHcrKVxcXS9nLCAoX21hdGNoLCBhdHRyLCB2YXJOYW1lKSA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSBjdHguc2NvcGUuZ2V0KHZhck5hbWUpID8/IGN0eC5nZXRTaWduYWwodmFyTmFtZSlcbiAgICByZXR1cm4gYFske2F0dHJ9PVwiJHtTdHJpbmcodmFsdWUpfVwiXWBcbiAgfSlcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBHdWFyZC1hd2FyZSBjb21tYW5kIGV4ZWN1dGlvbiAodXNlZCBieSBQaGFzZSA0IGV2ZW50IHdpcmluZylcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEV4ZWN1dGVzIGEgY29tbWFuZCBieSBuYW1lLCBjaGVja2luZyBpdHMgZ3VhcmQgZmlyc3QuXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGNvbW1hbmQgcmFuLCBmYWxzZSBpZiB0aGUgZ3VhcmQgcmVqZWN0ZWQgaXQuXG4gKlxuICogVGhpcyBpcyB0aGUgcHVibGljIEFQSSBmb3IgUGhhc2UgNCBldmVudCBoYW5kbGVycyB0aGF0IGNhbGwgY29tbWFuZHMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5Db21tYW5kKFxuICBuYW1lOiBzdHJpbmcsXG4gIGFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICBjdHg6IExFU0NvbnRleHRcbik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCBkZWYgPSBjdHguY29tbWFuZHMuZ2V0KG5hbWUpXG4gIGlmICghZGVmKSB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTXSBVbmtub3duIGNvbW1hbmQ6IFwiJHtuYW1lfVwiYClcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGlmIChkZWYuZ3VhcmQpIHtcbiAgICBpZiAoIWV2YWxHdWFyZChkZWYuZ3VhcmQsIGN0eCkpIHJldHVybiBmYWxzZVxuICB9XG5cbiAgY29uc3Qgc2NvcGUgPSBjdHguc2NvcGUuY2hpbGQoKVxuICBmb3IgKGNvbnN0IGFyZ0RlZiBvZiBkZWYuYXJncykge1xuICAgIHNjb3BlLnNldChhcmdEZWYubmFtZSwgYXJnc1thcmdEZWYubmFtZV0gPz8gbnVsbClcbiAgfVxuXG4gIGF3YWl0IGV4ZWN1dGUoZGVmLmJvZHksIHsgLi4uY3R4LCBzY29wZSB9KVxuICByZXR1cm4gdHJ1ZVxufVxuIiwgImltcG9ydCB0eXBlIHsgTEVTTm9kZSwgRXhwck5vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuLyoqIEEgc2luZ2xlIHR5cGVkIGFyZ3VtZW50IGRlZmluaXRpb24gZnJvbSBhcmdzPVwiW25hbWU6dHlwZSAgLi4uXVwiICovXG5leHBvcnQgaW50ZXJmYWNlIEFyZ0RlZiB7XG4gIG5hbWU6IHN0cmluZ1xuICAvKiogJ25pbCcgfCAnaW50JyB8ICdkZWMnIHwgJ3N0cicgfCAnYXJyJyB8ICdvYmonIHwgJ2Jvb2wnIHwgJ2R5bicgKi9cbiAgdHlwZTogc3RyaW5nXG4gIC8qKiBEZWZhdWx0IHZhbHVlIGV4cHJlc3Npb24sIGlmIHByb3ZpZGVkIChlLmcuIGF0dGVtcHQ6aW50PTApICovXG4gIGRlZmF1bHQ/OiBFeHByTm9kZVxufVxuXG4vKiogQSBmdWxseSBwYXJzZWQgPGxvY2FsLWNvbW1hbmQ+IGRlZmluaXRpb24uICovXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmREZWYge1xuICBuYW1lOiBzdHJpbmdcbiAgYXJnczogQXJnRGVmW11cbiAgLyoqIEd1YXJkIGV4cHJlc3Npb24gc3RyaW5nIFx1MjAxNCBldmFsdWF0ZWQgYmVmb3JlIGV4ZWN1dGlvbi4gRmFsc3kgPSBzaWxlbnQgbm8tb3AuICovXG4gIGd1YXJkPzogc3RyaW5nXG4gIC8qKiBUaGUgcGFyc2VkIGJvZHkgQVNUICovXG4gIGJvZHk6IExFU05vZGVcbiAgLyoqIFRoZSA8bG9jYWwtY29tbWFuZD4gRE9NIGVsZW1lbnQsIGtlcHQgZm9yIGVycm9yIHJlcG9ydGluZyAqL1xuICBlbGVtZW50OiBFbGVtZW50XG59XG5cbmV4cG9ydCBjbGFzcyBDb21tYW5kUmVnaXN0cnkge1xuICBwcml2YXRlIGNvbW1hbmRzID0gbmV3IE1hcDxzdHJpbmcsIENvbW1hbmREZWY+KClcblxuICByZWdpc3RlcihkZWY6IENvbW1hbmREZWYpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5jb21tYW5kcy5oYXMoZGVmLm5hbWUpKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgIGBbTEVTXSBEdXBsaWNhdGUgY29tbWFuZCBcIiR7ZGVmLm5hbWV9XCIgXHUyMDE0IHByZXZpb3VzIGRlZmluaXRpb24gb3ZlcndyaXR0ZW4uYCxcbiAgICAgICAgZGVmLmVsZW1lbnRcbiAgICAgIClcbiAgICB9XG4gICAgdGhpcy5jb21tYW5kcy5zZXQoZGVmLm5hbWUsIGRlZilcbiAgfVxuXG4gIGdldChuYW1lOiBzdHJpbmcpOiBDb21tYW5kRGVmIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kcy5nZXQobmFtZSlcbiAgfVxuXG4gIGhhcyhuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kcy5oYXMobmFtZSlcbiAgfVxuXG4gIG5hbWVzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmNvbW1hbmRzLmtleXMoKSlcbiAgfVxufVxuIiwgIi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gTEVTIE1vZHVsZSBzeXN0ZW1cbi8vXG4vLyBNb2R1bGVzIGV4dGVuZCB0aGUgc2V0IG9mIGFuaW1hdGlvbi9lZmZlY3QgcHJpbWl0aXZlcyBhdmFpbGFibGUgaW5cbi8vIDxsb2NhbC1jb21tYW5kPiBib2RpZXMuIFR3byBraW5kczpcbi8vXG4vLyAgIEJ1aWx0LWluOiAgPHVzZS1tb2R1bGUgdHlwZT1cImFuaW1hdGlvblwiPlxuLy8gICBVc2VybGFuZDogIDx1c2UtbW9kdWxlIHNyYz1cIi4vc2Nyb2xsLWVmZmVjdHMuanNcIj5cbi8vXG4vLyBCb3RoIHJlc29sdmUgdG8gYSBMRVNNb2R1bGUgYXQgcnVudGltZS5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEEgcHJpbWl0aXZlIGlzIGFuIGFzeW5jIG9wZXJhdGlvbiB0aGUgZXhlY3V0b3IgZGlzcGF0Y2hlcyBmb3IgQW5pbWF0aW9uTm9kZS5cbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3IgIENTUyBzZWxlY3RvciBzdHJpbmcgKGFscmVhZHkgcmVzb2x2ZWQgXHUyMDE0IG5vIHZhcmlhYmxlIHN1YnN0aXR1dGlvbiBuZWVkZWQgaGVyZSlcbiAqIEBwYXJhbSBkdXJhdGlvbiAgbWlsbGlzZWNvbmRzXG4gKiBAcGFyYW0gZWFzaW5nICAgIENTUyBlYXNpbmcgc3RyaW5nLCBlLmcuICdlYXNlLW91dCdcbiAqIEBwYXJhbSBvcHRpb25zICAga2V5L3ZhbHVlIG9wdGlvbnMgZnJvbSB0aGUgdHJhaWxpbmcgWy4uLl0gYmxvY2ssIGFscmVhZHkgZXZhbHVhdGVkXG4gKiBAcGFyYW0gaG9zdCAgICAgIHRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBlbGVtZW50ICh1c2VkIGFzIHF1ZXJ5U2VsZWN0b3Igcm9vdClcbiAqL1xuZXhwb3J0IHR5cGUgTEVTUHJpbWl0aXZlID0gKFxuICBzZWxlY3Rvcjogc3RyaW5nLFxuICBkdXJhdGlvbjogbnVtYmVyLFxuICBlYXNpbmc6IHN0cmluZyxcbiAgb3B0aW9uczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIGhvc3Q6IEVsZW1lbnRcbikgPT4gUHJvbWlzZTx2b2lkPlxuXG4vKiogVGhlIHNoYXBlIGEgdXNlcmxhbmQgbW9kdWxlIG11c3QgZXhwb3J0IGFzIGl0cyBkZWZhdWx0IGV4cG9ydC4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTEVTTW9kdWxlIHtcbiAgLyoqIEh1bWFuLXJlYWRhYmxlIG5hbWUgZm9yIGVycm9yIG1lc3NhZ2VzICovXG4gIG5hbWU6IHN0cmluZ1xuICBwcmltaXRpdmVzOiBSZWNvcmQ8c3RyaW5nLCBMRVNQcmltaXRpdmU+XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBSZWdpc3RyeSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZXhwb3J0IGNsYXNzIE1vZHVsZVJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBwcmltaXRpdmVzID0gbmV3IE1hcDxzdHJpbmcsIExFU1ByaW1pdGl2ZT4oKVxuICBwcml2YXRlIGxvYWRlZE1vZHVsZXM6IHN0cmluZ1tdID0gW11cblxuICByZWdpc3Rlcihtb2R1bGU6IExFU01vZHVsZSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgW25hbWUsIGZuXSBvZiBPYmplY3QuZW50cmllcyhtb2R1bGUucHJpbWl0aXZlcykpIHtcbiAgICAgIHRoaXMucHJpbWl0aXZlcy5zZXQobmFtZSwgZm4pXG4gICAgfVxuICAgIHRoaXMubG9hZGVkTW9kdWxlcy5wdXNoKG1vZHVsZS5uYW1lKVxuICAgIGNvbnNvbGUubG9nKGBbTEVTXSBtb2R1bGUgbG9hZGVkOiBcIiR7bW9kdWxlLm5hbWV9XCJgLCBPYmplY3Qua2V5cyhtb2R1bGUucHJpbWl0aXZlcykpXG4gIH1cblxuICBnZXQocHJpbWl0aXZlOiBzdHJpbmcpOiBMRVNQcmltaXRpdmUgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLnByaW1pdGl2ZXMuZ2V0KHByaW1pdGl2ZSlcbiAgfVxuXG4gIGhhcyhwcmltaXRpdmU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnByaW1pdGl2ZXMuaGFzKHByaW1pdGl2ZSlcbiAgfVxuXG4gIC8qKiBEZXYtbW9kZSBoZWxwOiB3aGljaCBtb2R1bGUgZXhwb3J0cyBhIGdpdmVuIHByaW1pdGl2ZT8gKi9cbiAgaGludEZvcihwcmltaXRpdmU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgLy8gV2lsbCBiZSBlbnJpY2hlZCBpbiBQaGFzZSA4IHdpdGggcGVyLW1vZHVsZSBwcmltaXRpdmUgbWFuaWZlc3RzLlxuICAgIHJldHVybiBgUHJpbWl0aXZlIFwiJHtwcmltaXRpdmV9XCIgbm90IGZvdW5kLiBMb2FkZWQgbW9kdWxlczogWyR7dGhpcy5sb2FkZWRNb2R1bGVzLmpvaW4oJywgJyl9XS4gRGlkIHlvdSBmb3JnZXQgPHVzZS1tb2R1bGUgdHlwZT1cImFuaW1hdGlvblwiPj9gXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIExvYWRlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqIEJ1aWx0LWluIG1vZHVsZSByZWdpc3RyeTogdHlwZSBuYW1lIFx1MjE5MiBpbXBvcnQgcGF0aCAqL1xuY29uc3QgQlVJTFRJTl9NT0RVTEVTOiBSZWNvcmQ8c3RyaW5nLCAoKSA9PiBQcm9taXNlPHsgZGVmYXVsdDogTEVTTW9kdWxlIH0+PiA9IHtcbiAgYW5pbWF0aW9uOiAoKSA9PiBpbXBvcnQoJy4vYnVpbHRpbi9hbmltYXRpb24uanMnKSxcbn1cblxuLyoqXG4gKiBSZXNvbHZlIGEgPHVzZS1tb2R1bGU+IGVsZW1lbnQgdG8gYSBMRVNNb2R1bGUgYW5kIHJlZ2lzdGVyIGl0LlxuICogQ2FsbGVkIGR1cmluZyBQaGFzZSAxIERPTSByZWFkaW5nIChQaGFzZSA4IGNvbXBsZXRlcyB0aGUgc3JjPSBwYXRoKS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRNb2R1bGUoXG4gIHJlZ2lzdHJ5OiBNb2R1bGVSZWdpc3RyeSxcbiAgb3B0czogeyB0eXBlPzogc3RyaW5nOyBzcmM/OiBzdHJpbmcgfVxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChvcHRzLnR5cGUpIHtcbiAgICBjb25zdCBsb2FkZXIgPSBCVUlMVElOX01PRFVMRVNbb3B0cy50eXBlXVxuICAgIGlmICghbG9hZGVyKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVNdIFVua25vd24gYnVpbHQtaW4gbW9kdWxlIHR5cGU6IFwiJHtvcHRzLnR5cGV9XCIuIEF2YWlsYWJsZTogJHtPYmplY3Qua2V5cyhCVUlMVElOX01PRFVMRVMpLmpvaW4oJywgJyl9YClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25zdCBtb2QgPSBhd2FpdCBsb2FkZXIoKVxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKG1vZC5kZWZhdWx0KVxuICAgIHJldHVyblxuICB9XG5cbiAgaWYgKG9wdHMuc3JjKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1vZCA9IGF3YWl0IGltcG9ydCgvKiBAdml0ZS1pZ25vcmUgKi8gb3B0cy5zcmMpXG4gICAgICBpZiAoIW1vZC5kZWZhdWx0IHx8IHR5cGVvZiBtb2QuZGVmYXVsdC5wcmltaXRpdmVzICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBjb25zb2xlLndhcm4oYFtMRVNdIE1vZHVsZSBhdCBcIiR7b3B0cy5zcmN9XCIgZG9lcyBub3QgZXhwb3J0IGEgdmFsaWQgTEVTTW9kdWxlLiBFeHBlY3RlZDogeyBuYW1lOiBzdHJpbmcsIHByaW1pdGl2ZXM6IFJlY29yZDxzdHJpbmcsIEZ1bmN0aW9uPiB9YClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICByZWdpc3RyeS5yZWdpc3Rlcihtb2QuZGVmYXVsdCBhcyBMRVNNb2R1bGUpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBbTEVTXSBGYWlsZWQgdG8gbG9hZCBtb2R1bGUgZnJvbSBcIiR7b3B0cy5zcmN9XCI6YCwgZXJyKVxuICAgIH1cbiAgICByZXR1cm5cbiAgfVxuXG4gIGNvbnNvbGUud2FybignW0xFU10gPHVzZS1tb2R1bGU+IHJlcXVpcmVzIGVpdGhlciB0eXBlPSBvciBzcmM9IGF0dHJpYnV0ZS4nKVxufVxuIiwgIi8qKlxuICogU3RyaXBzIHRoZSBiYWNrdGljayB3cmFwcGVyIGZyb20gYSBtdWx0aS1saW5lIExFUyBib2R5IHN0cmluZyBhbmRcbiAqIG5vcm1hbGl6ZXMgaW5kZW50YXRpb24sIHByb2R1Y2luZyBhIGNsZWFuIHN0cmluZyB0aGUgcGFyc2VyIGNhbiB3b3JrIHdpdGguXG4gKlxuICogQ29udmVudGlvbjpcbiAqICAgU2luZ2xlLWxpbmU6ICBoYW5kbGU9XCJlbWl0IGZlZWQ6aW5pdFwiICAgICAgICAgICBcdTIxOTIgXCJlbWl0IGZlZWQ6aW5pdFwiXG4gKiAgIE11bHRpLWxpbmU6ICAgZG89XCJgXFxuICAgICAgc2V0Li4uXFxuICAgIGBcIiAgICAgICAgXHUyMTkyIFwic2V0Li4uXFxuLi4uXCJcbiAqXG4gKiBBbGdvcml0aG06XG4gKiAgIDEuIFRyaW0gb3V0ZXIgd2hpdGVzcGFjZSBmcm9tIHRoZSByYXcgYXR0cmlidXRlIHZhbHVlLlxuICogICAyLiBJZiB3cmFwcGVkIGluIGJhY2t0aWNrcywgc3RyaXAgdGhlbSBcdTIwMTQgZG8gTk9UIGlubmVyLXRyaW0geWV0LlxuICogICAzLiBTcGxpdCBpbnRvIGxpbmVzIGFuZCBjb21wdXRlIG1pbmltdW0gbm9uLXplcm8gaW5kZW50YXRpb25cbiAqICAgICAgYWNyb3NzIGFsbCBub24tZW1wdHkgbGluZXMuIFRoaXMgaXMgdGhlIEhUTUwgYXR0cmlidXRlIGluZGVudGF0aW9uXG4gKiAgICAgIGxldmVsIHRvIHJlbW92ZS5cbiAqICAgNC4gU3RyaXAgdGhhdCBtYW55IGxlYWRpbmcgY2hhcmFjdGVycyBmcm9tIGV2ZXJ5IGxpbmUuXG4gKiAgIDUuIERyb3AgbGVhZGluZy90cmFpbGluZyBibGFuayBsaW5lcywgcmV0dXJuIGpvaW5lZCByZXN1bHQuXG4gKlxuICogQ3J1Y2lhbGx5LCBzdGVwIDIgZG9lcyBOT1QgY2FsbCAudHJpbSgpIG9uIHRoZSBpbm5lciBjb250ZW50IGJlZm9yZVxuICogY29tcHV0aW5nIGluZGVudGF0aW9uLiBBbiBpbm5lciAudHJpbSgpIHdvdWxkIGRlc3Ryb3kgdGhlIGxlYWRpbmdcbiAqIHdoaXRlc3BhY2Ugb24gbGluZSAxLCBtYWtpbmcgbWluSW5kZW50ID0gMCBhbmQgbGVhdmluZyBhbGwgb3RoZXJcbiAqIGxpbmVzIHVuLWRlLWluZGVudGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RyaXBCb2R5KHJhdzogc3RyaW5nKTogc3RyaW5nIHtcbiAgbGV0IHMgPSByYXcudHJpbSgpXG5cbiAgLy8gU3RyaXAgYmFja3RpY2sgd3JhcHBlciBcdTIwMTQgYnV0IHByZXNlcnZlIGludGVybmFsIHdoaXRlc3BhY2UgZm9yIGRlLWluZGVudFxuICBpZiAocy5zdGFydHNXaXRoKCdgJykgJiYgcy5lbmRzV2l0aCgnYCcpKSB7XG4gICAgcyA9IHMuc2xpY2UoMSwgLTEpXG4gICAgLy8gRG8gTk9UIC50cmltKCkgaGVyZSBcdTIwMTQgdGhhdCBraWxscyB0aGUgbGVhZGluZyBpbmRlbnQgb24gbGluZSAxXG4gIH1cblxuICBjb25zdCBsaW5lcyA9IHMuc3BsaXQoJ1xcbicpXG4gIGNvbnN0IG5vbkVtcHR5ID0gbGluZXMuZmlsdGVyKGwgPT4gbC50cmltKCkubGVuZ3RoID4gMClcbiAgaWYgKG5vbkVtcHR5Lmxlbmd0aCA9PT0gMCkgcmV0dXJuICcnXG5cbiAgLy8gRm9yIHNpbmdsZS1saW5lIHZhbHVlcyAobm8gbmV3bGluZXMgYWZ0ZXIgYmFja3RpY2sgc3RyaXApLCBqdXN0IHRyaW1cbiAgaWYgKGxpbmVzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIHMudHJpbSgpXG5cbiAgLy8gTWluaW11bSBsZWFkaW5nIHdoaXRlc3BhY2UgYWNyb3NzIG5vbi1lbXB0eSBsaW5lc1xuICBjb25zdCBtaW5JbmRlbnQgPSBub25FbXB0eS5yZWR1Y2UoKG1pbiwgbGluZSkgPT4ge1xuICAgIGNvbnN0IGxlYWRpbmcgPSBsaW5lLm1hdGNoKC9eKFxccyopLyk/LlsxXT8ubGVuZ3RoID8/IDBcbiAgICByZXR1cm4gTWF0aC5taW4obWluLCBsZWFkaW5nKVxuICB9LCBJbmZpbml0eSlcblxuICBjb25zdCBzdHJpcHBlZCA9IG1pbkluZGVudCA9PT0gMCB8fCBtaW5JbmRlbnQgPT09IEluZmluaXR5XG4gICAgPyBsaW5lc1xuICAgIDogbGluZXMubWFwKGxpbmUgPT4gbGluZS5sZW5ndGggPj0gbWluSW5kZW50ID8gbGluZS5zbGljZShtaW5JbmRlbnQpIDogbGluZS50cmltU3RhcnQoKSlcblxuICAvLyBEcm9wIGxlYWRpbmcgYW5kIHRyYWlsaW5nIGJsYW5rIGxpbmVzICh0aGUgbmV3bGluZXMgYXJvdW5kIGJhY2t0aWNrIGNvbnRlbnQpXG4gIGxldCBzdGFydCA9IDBcbiAgbGV0IGVuZCA9IHN0cmlwcGVkLmxlbmd0aCAtIDFcbiAgd2hpbGUgKHN0YXJ0IDw9IGVuZCAmJiBzdHJpcHBlZFtzdGFydF0/LnRyaW0oKSA9PT0gJycpIHN0YXJ0KytcbiAgd2hpbGUgKGVuZCA+PSBzdGFydCAmJiBzdHJpcHBlZFtlbmRdPy50cmltKCkgPT09ICcnKSBlbmQtLVxuXG4gIHJldHVybiBzdHJpcHBlZC5zbGljZShzdGFydCwgZW5kICsgMSkuam9pbignXFxuJylcbn1cbiIsICJpbXBvcnQgdHlwZSB7XG4gIExFU0NvbmZpZyxcbiAgTW9kdWxlRGVjbCxcbiAgQ29tbWFuZERlY2wsXG4gIEV2ZW50SGFuZGxlckRlY2wsXG4gIFNpZ25hbFdhdGNoZXJEZWNsLFxuICBPbkxvYWREZWNsLFxuICBPbkVudGVyRGVjbCxcbiAgT25FeGl0RGVjbCxcbn0gZnJvbSAnLi9jb25maWcuanMnXG5pbXBvcnQgeyBzdHJpcEJvZHkgfSBmcm9tICcuL3N0cmlwQm9keS5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBUYWcgbmFtZSBcdTIxOTIgaGFuZGxlciBtYXBcbi8vIEVhY2ggaGFuZGxlciByZWFkcyBhdHRyaWJ1dGVzIGZyb20gYSBjaGlsZCBlbGVtZW50IGFuZCBwdXNoZXMgYSB0eXBlZCBkZWNsXG4vLyBpbnRvIHRoZSBjb25maWcgYmVpbmcgYnVpbHQuIFVua25vd24gdGFncyBhcmUgY29sbGVjdGVkIGZvciB3YXJuaW5nLlxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbnR5cGUgSGFuZGxlciA9IChlbDogRWxlbWVudCwgY29uZmlnOiBMRVNDb25maWcpID0+IHZvaWRcblxuY29uc3QgSEFORExFUlM6IFJlY29yZDxzdHJpbmcsIEhhbmRsZXI+ID0ge1xuXG4gICd1c2UtbW9kdWxlJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgdHlwZSA9IGVsLmdldEF0dHJpYnV0ZSgndHlwZScpPy50cmltKCkgPz8gbnVsbFxuICAgIGNvbnN0IHNyYyAgPSBlbC5nZXRBdHRyaWJ1dGUoJ3NyYycpPy50cmltKCkgID8/IG51bGxcblxuICAgIGlmICghdHlwZSAmJiAhc3JjKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDx1c2UtbW9kdWxlPiBoYXMgbmVpdGhlciB0eXBlPSBub3Igc3JjPSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbmZpZy5tb2R1bGVzLnB1c2goeyB0eXBlLCBzcmMsIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG5cbiAgJ2xvY2FsLWNvbW1hbmQnKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCBuYW1lID0gZWwuZ2V0QXR0cmlidXRlKCduYW1lJyk/LnRyaW0oKSA/PyAnJ1xuICAgIGNvbnN0IGJvZHkgPSBlbC5nZXRBdHRyaWJ1dGUoJ2RvJyk/LnRyaW0oKSAgID8/ICcnXG5cbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPGxvY2FsLWNvbW1hbmQ+IG1pc3NpbmcgcmVxdWlyZWQgbmFtZT0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTXSA8bG9jYWwtY29tbWFuZCBuYW1lPVwiJHtuYW1lfVwiPiBtaXNzaW5nIHJlcXVpcmVkIGRvPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuYCwgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25maWcuY29tbWFuZHMucHVzaCh7XG4gICAgICBuYW1lLFxuICAgICAgYXJnc1JhdzogZWwuZ2V0QXR0cmlidXRlKCdhcmdzJyk/LnRyaW0oKSAgPz8gJycsXG4gICAgICBndWFyZDogICBlbC5nZXRBdHRyaWJ1dGUoJ2d1YXJkJyk/LnRyaW0oKSA/PyBudWxsLFxuICAgICAgYm9keTogICAgc3RyaXBCb2R5KGJvZHkpLFxuICAgICAgZWxlbWVudDogZWwsXG4gICAgfSlcbiAgfSxcblxuICAnb24tZXZlbnQnKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCBuYW1lID0gZWwuZ2V0QXR0cmlidXRlKCduYW1lJyk/LnRyaW0oKSAgID8/ICcnXG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgnaGFuZGxlJyk/LnRyaW0oKSA/PyAnJ1xuXG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDxvbi1ldmVudD4gbWlzc2luZyByZXF1aXJlZCBuYW1lPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVNdIDxvbi1ldmVudCBuYW1lPVwiJHtuYW1lfVwiPiBtaXNzaW5nIHJlcXVpcmVkIGhhbmRsZT0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLmAsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uZmlnLm9uRXZlbnQucHVzaCh7IG5hbWUsIGJvZHk6IHN0cmlwQm9keShib2R5KSwgZWxlbWVudDogZWwgfSlcbiAgfSxcblxuICAnb24tc2lnbmFsJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgbmFtZSA9IGVsLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgICA/PyAnJ1xuICAgIGNvbnN0IGJvZHkgPSBlbC5nZXRBdHRyaWJ1dGUoJ2hhbmRsZScpPy50cmltKCkgPz8gJydcblxuICAgIGlmICghbmFtZSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tc2lnbmFsPiBtaXNzaW5nIHJlcXVpcmVkIG5hbWU9IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBpZiAoIWJvZHkpIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFU10gPG9uLXNpZ25hbCBuYW1lPVwiJHtuYW1lfVwiPiBtaXNzaW5nIHJlcXVpcmVkIGhhbmRsZT0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLmAsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uZmlnLm9uU2lnbmFsLnB1c2goe1xuICAgICAgbmFtZSxcbiAgICAgIHdoZW46ICAgIGVsLmdldEF0dHJpYnV0ZSgnd2hlbicpPy50cmltKCkgPz8gbnVsbCxcbiAgICAgIGJvZHk6ICAgIHN0cmlwQm9keShib2R5KSxcbiAgICAgIGVsZW1lbnQ6IGVsLFxuICAgIH0pXG4gIH0sXG5cbiAgJ29uLWxvYWQnKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdydW4nKT8udHJpbSgpID8/ICcnXG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDxvbi1sb2FkPiBtaXNzaW5nIHJlcXVpcmVkIHJ1bj0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGNvbmZpZy5vbkxvYWQucHVzaCh7IGJvZHk6IHN0cmlwQm9keShib2R5KSwgZWxlbWVudDogZWwgfSlcbiAgfSxcblxuICAnb24tZW50ZXInKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdydW4nKT8udHJpbSgpID8/ICcnXG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDxvbi1lbnRlcj4gbWlzc2luZyByZXF1aXJlZCBydW49IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25maWcub25FbnRlci5wdXNoKHtcbiAgICAgIHdoZW46ICAgIGVsLmdldEF0dHJpYnV0ZSgnd2hlbicpPy50cmltKCkgPz8gbnVsbCxcbiAgICAgIGJvZHk6ICAgIHN0cmlwQm9keShib2R5KSxcbiAgICAgIGVsZW1lbnQ6IGVsLFxuICAgIH0pXG4gIH0sXG5cbiAgJ29uLWV4aXQnKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdydW4nKT8udHJpbSgpID8/ICcnXG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDxvbi1leGl0PiBtaXNzaW5nIHJlcXVpcmVkIHJ1bj0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGNvbmZpZy5vbkV4aXQucHVzaCh7IGJvZHk6IHN0cmlwQm9keShib2R5KSwgZWxlbWVudDogZWwgfSlcbiAgfSxcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyByZWFkQ29uZmlnIFx1MjAxNCB0aGUgcHVibGljIGVudHJ5IHBvaW50XG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBXYWxrcyB0aGUgZGlyZWN0IGNoaWxkcmVuIG9mIGEgPGxvY2FsLWV2ZW50LXNjcmlwdD4gZWxlbWVudCBhbmRcbiAqIHByb2R1Y2VzIGEgc3RydWN0dXJlZCBMRVNDb25maWcuXG4gKlxuICogT25seSBkaXJlY3QgY2hpbGRyZW4gYXJlIHJlYWQgXHUyMDE0IG5lc3RlZCBlbGVtZW50cyBpbnNpZGUgYSA8bG9jYWwtY29tbWFuZD5cbiAqIGJvZHkgYXJlIG5vdCBjaGlsZHJlbiBvZiB0aGUgaG9zdCBhbmQgYXJlIG5ldmVyIHZpc2l0ZWQgaGVyZS5cbiAqXG4gKiBVbmtub3duIGNoaWxkIGVsZW1lbnRzIGVtaXQgYSBjb25zb2xlLndhcm4gYW5kIGFyZSBjb2xsZWN0ZWQgaW4gY29uZmlnLnVua25vd25cbiAqIHNvIHRvb2xpbmcgKGUuZy4gYSBmdXR1cmUgTEVTIGxhbmd1YWdlIHNlcnZlcikgY2FuIHJlcG9ydCB0aGVtLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZENvbmZpZyhob3N0OiBFbGVtZW50KTogTEVTQ29uZmlnIHtcbiAgY29uc3QgY29uZmlnOiBMRVNDb25maWcgPSB7XG4gICAgaWQ6ICAgICAgIGhvc3QuaWQgfHwgJyhubyBpZCknLFxuICAgIG1vZHVsZXM6ICBbXSxcbiAgICBjb21tYW5kczogW10sXG4gICAgb25FdmVudDogIFtdLFxuICAgIG9uU2lnbmFsOiBbXSxcbiAgICBvbkxvYWQ6ICAgW10sXG4gICAgb25FbnRlcjogIFtdLFxuICAgIG9uRXhpdDogICBbXSxcbiAgICB1bmtub3duOiAgW10sXG4gIH1cblxuICBmb3IgKGNvbnN0IGNoaWxkIG9mIEFycmF5LmZyb20oaG9zdC5jaGlsZHJlbikpIHtcbiAgICBjb25zdCB0YWcgPSBjaGlsZC50YWdOYW1lLnRvTG93ZXJDYXNlKClcbiAgICBjb25zdCBoYW5kbGVyID0gSEFORExFUlNbdGFnXVxuXG4gICAgaWYgKGhhbmRsZXIpIHtcbiAgICAgIGhhbmRsZXIoY2hpbGQsIGNvbmZpZylcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSFRNTCBjb21tZW50cyBkb24ndCBhcHBlYXIgaW4gLmNoaWxkcmVuLCBvbmx5IGluIC5jaGlsZE5vZGVzLlxuICAgICAgLy8gU28gZXZlcnl0aGluZyBoZXJlIGlzIGEgcmVhbCBlbGVtZW50IFx1MjAxNCB3YXJuIGFuZCBjb2xsZWN0LlxuICAgICAgY29uZmlnLnVua25vd24ucHVzaChjaGlsZClcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgYFtMRVNdIFVua25vd24gY2hpbGQgZWxlbWVudCA8JHt0YWd9PiBpbnNpZGUgPGxvY2FsLWV2ZW50LXNjcmlwdCBpZD1cIiR7Y29uZmlnLmlkfVwiPiBcdTIwMTQgaWdub3JlZC5gLFxuICAgICAgICBjaGlsZFxuICAgICAgKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjb25maWdcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBsb2dDb25maWcgXHUyMDE0IHN0cnVjdHVyZWQgY2hlY2twb2ludCBsb2dcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIExvZ3MgYSBzdW1tYXJ5IG9mIGEgcGFyc2VkIExFU0NvbmZpZy5cbiAqIFBoYXNlIDEgY2hlY2twb2ludDogeW91IHNob3VsZCBzZWUgdGhpcyBpbiB0aGUgYnJvd3NlciBjb25zb2xlL2RlYnVnIGxvZ1xuICogd2l0aCBhbGwgY29tbWFuZHMsIGV2ZW50cywgYW5kIHNpZ25hbCB3YXRjaGVycyBjb3JyZWN0bHkgbGlzdGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9nQ29uZmlnKGNvbmZpZzogTEVTQ29uZmlnKTogdm9pZCB7XG4gIGNvbnN0IGlkID0gY29uZmlnLmlkXG4gIGNvbnNvbGUubG9nKGBbTEVTXSBjb25maWcgcmVhZCBmb3IgIyR7aWR9YClcbiAgY29uc29sZS5sb2coYFtMRVNdICAgbW9kdWxlczogICAke2NvbmZpZy5tb2R1bGVzLmxlbmd0aH1gLCBjb25maWcubW9kdWxlcy5tYXAobSA9PiBtLnR5cGUgPz8gbS5zcmMpKVxuICBjb25zb2xlLmxvZyhgW0xFU10gICBjb21tYW5kczogICR7Y29uZmlnLmNvbW1hbmRzLmxlbmd0aH1gLCBjb25maWcuY29tbWFuZHMubWFwKGMgPT4gYy5uYW1lKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tZXZlbnQ6ICAke2NvbmZpZy5vbkV2ZW50Lmxlbmd0aH1gLCBjb25maWcub25FdmVudC5tYXAoZSA9PiBlLm5hbWUpKVxuICBjb25zb2xlLmxvZyhgW0xFU10gICBvbi1zaWduYWw6ICR7Y29uZmlnLm9uU2lnbmFsLmxlbmd0aH1gLCBjb25maWcub25TaWduYWwubWFwKHMgPT4gcy5uYW1lKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tbG9hZDogICAke2NvbmZpZy5vbkxvYWQubGVuZ3RofWApXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG9uLWVudGVyOiAgJHtjb25maWcub25FbnRlci5sZW5ndGh9YCwgY29uZmlnLm9uRW50ZXIubWFwKGUgPT4gZS53aGVuID8/ICdhbHdheXMnKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tZXhpdDogICAke2NvbmZpZy5vbkV4aXQubGVuZ3RofWApXG5cbiAgaWYgKGNvbmZpZy51bmtub3duLmxlbmd0aCA+IDApIHtcbiAgICBjb25zb2xlLndhcm4oYFtMRVNdICAgdW5rbm93biBjaGlsZHJlbjogJHtjb25maWcudW5rbm93bi5sZW5ndGh9YCwgY29uZmlnLnVua25vd24ubWFwKGUgPT4gZS50YWdOYW1lLnRvTG93ZXJDYXNlKCkpKVxuICB9XG5cbiAgLy8gTG9nIGEgc2FtcGxpbmcgb2YgYm9keSBzdHJpbmdzIHRvIHZlcmlmeSBzdHJpcEJvZHkgd29ya2VkIGNvcnJlY3RseVxuICBpZiAoY29uZmlnLmNvbW1hbmRzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBmaXJzdCA9IGNvbmZpZy5jb21tYW5kc1swXVxuICAgIGlmIChmaXJzdCkge1xuICAgICAgY29uc29sZS5sb2coYFtMRVNdICAgZmlyc3QgY29tbWFuZCBib2R5IHByZXZpZXcgKFwiJHtmaXJzdC5uYW1lfVwiKTpgKVxuICAgICAgY29uc3QgcHJldmlldyA9IGZpcnN0LmJvZHkuc3BsaXQoJ1xcbicpLnNsaWNlKDAsIDQpLmpvaW4oJ1xcbiAgJylcbiAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSAgIHwgJHtwcmV2aWV3fWApXG4gICAgfVxuICB9XG59XG4iLCAiLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBMRVMgVG9rZW5pemVyXG4vL1xuLy8gQ29udmVydHMgYSBzdHJpcEJvZHknZCBzb3VyY2Ugc3RyaW5nIGludG8gYSBmbGF0IGFycmF5IG9mIFRva2VuIG9iamVjdHMuXG4vLyBUb2tlbnMgYXJlIHNpbXBseSBub24tYmxhbmsgbGluZXMgd2l0aCB0aGVpciBpbmRlbnQgbGV2ZWwgcmVjb3JkZWQuXG4vLyBObyBzZW1hbnRpYyBhbmFseXNpcyBoYXBwZW5zIGhlcmUgXHUyMDE0IHRoYXQncyB0aGUgcGFyc2VyJ3Mgam9iLlxuLy9cbi8vIFRoZSB0b2tlbml6ZXIgaXMgZGVsaWJlcmF0ZWx5IG1pbmltYWw6IGl0IHByZXNlcnZlcyB0aGUgcmF3IGluZGVudGF0aW9uXG4vLyBpbmZvcm1hdGlvbiB0aGUgcGFyc2VyIG5lZWRzIHRvIHVuZGVyc3RhbmQgYmxvY2sgc3RydWN0dXJlLlxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBpbnRlcmZhY2UgVG9rZW4ge1xuICAvKiogQ29sdW1uIG9mZnNldCBvZiB0aGUgZmlyc3Qgbm9uLXdoaXRlc3BhY2UgY2hhcmFjdGVyIChudW1iZXIgb2Ygc3BhY2VzKSAqL1xuICBpbmRlbnQ6IG51bWJlclxuICAvKiogVHJpbW1lZCBsaW5lIGNvbnRlbnQgXHUyMDE0IG5vIGxlYWRpbmcvdHJhaWxpbmcgd2hpdGVzcGFjZSAqL1xuICB0ZXh0OiBzdHJpbmdcbiAgLyoqIDEtYmFzZWQgbGluZSBudW1iZXIgaW4gdGhlIHN0cmlwcGVkIHNvdXJjZSAoZm9yIGVycm9yIG1lc3NhZ2VzKSAqL1xuICBsaW5lTnVtOiBudW1iZXJcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhIHN0cmlwcGVkIExFUyBib2R5IHN0cmluZyBpbnRvIGEgVG9rZW4gYXJyYXkuXG4gKiBCbGFuayBsaW5lcyBhcmUgZHJvcHBlZC4gVGFicyBhcmUgZXhwYW5kZWQgdG8gMiBzcGFjZXMgZWFjaC5cbiAqXG4gKiBAcGFyYW0gc291cmNlICBBIHN0cmluZyBhbHJlYWR5IHByb2Nlc3NlZCBieSBzdHJpcEJvZHkoKSBcdTIwMTQgbm8gYmFja3RpY2sgd3JhcHBlcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b2tlbml6ZShzb3VyY2U6IHN0cmluZyk6IFRva2VuW10ge1xuICBjb25zdCB0b2tlbnM6IFRva2VuW10gPSBbXVxuICBjb25zdCBsaW5lcyA9IHNvdXJjZS5zcGxpdCgnXFxuJylcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgcmF3ID0gKGxpbmVzW2ldID8/ICcnKS5yZXBsYWNlKC9cXHQvZywgJyAgJylcbiAgICBjb25zdCB0ZXh0ID0gcmF3LnRyaW0oKVxuXG4gICAgLy8gU2tpcCBibGFuayBsaW5lc1xuICAgIGlmICh0ZXh0Lmxlbmd0aCA9PT0gMCkgY29udGludWVcblxuICAgIGNvbnN0IGluZGVudCA9IHJhdy5sZW5ndGggLSByYXcudHJpbVN0YXJ0KCkubGVuZ3RoXG5cbiAgICB0b2tlbnMucHVzaCh7XG4gICAgICBpbmRlbnQsXG4gICAgICB0ZXh0LFxuICAgICAgbGluZU51bTogaSArIDEsXG4gICAgfSlcbiAgfVxuXG4gIHJldHVybiB0b2tlbnNcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBIZWxwZXJzIHVzZWQgYnkgYm90aCB0aGUgdG9rZW5pemVyIHRlc3RzIGFuZCB0aGUgcGFyc2VyXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgYHRleHRgIGVuZHMgd2l0aCBhIHN0YW5kYWxvbmUgYGFuZGAgd29yZC5cbiAqIFVzZWQgYnkgdGhlIHBhcnNlciB0byBkZXRlY3QgcGFyYWxsZWwgYnJhbmNoZXMuXG4gKlxuICogQ2FyZWZ1bDogXCJlbmdsYW5kXCIsIFwiYmFuZFwiLCBcImNvbW1hbmRcIiBtdXN0IE5PVCBtYXRjaC5cbiAqIFdlIHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5IGJlZm9yZSBgYW5kYCBhbmQgZW5kLW9mLXN0cmluZyBhZnRlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuZHNXaXRoQW5kKHRleHQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gL1xcYmFuZCQvLnRlc3QodGV4dClcbn1cblxuLyoqXG4gKiBTdHJpcHMgdGhlIHRyYWlsaW5nIGAgYW5kYCBmcm9tIGEgbGluZSB0aGF0IGVuZHNXaXRoQW5kLlxuICogUmV0dXJucyB0aGUgdHJpbW1lZCBsaW5lIGNvbnRlbnQgd2l0aG91dCBpdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwVHJhaWxpbmdBbmQodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvXFxzK2FuZCQvLCAnJykudHJpbUVuZCgpXG59XG5cbi8qKlxuICogQmxvY2sgdGVybWluYXRvciB0b2tlbnMgXHUyMDE0IHNpZ25hbCB0aGUgZW5kIG9mIGEgbWF0Y2ggb3IgdHJ5IGJsb2NrLlxuICogVGhlc2UgYXJlIGNvbnN1bWVkIGJ5IHRoZSBibG9jay1vd25pbmcgcGFyc2VyIChwYXJzZU1hdGNoIC8gcGFyc2VUcnkpLFxuICogbm90IGJ5IHBhcnNlQmxvY2sgaXRzZWxmLlxuICovXG5leHBvcnQgY29uc3QgQkxPQ0tfVEVSTUlOQVRPUlMgPSBuZXcgU2V0KFsnL21hdGNoJywgJy90cnknXSlcblxuLyoqXG4gKiBLZXl3b3JkcyB0aGF0IGVuZCBhIHRyeSBib2R5IGFuZCBzdGFydCBhIHJlc2N1ZS9hZnRlcndhcmRzIGNsYXVzZS5cbiAqIFJlY29nbml6ZWQgb25seSB3aGVuIHRoZXkgYXBwZWFyIGF0IHRoZSBzYW1lIGluZGVudCBsZXZlbCBhcyB0aGUgYHRyeWAuXG4gKi9cbmV4cG9ydCBjb25zdCBUUllfQ0xBVVNFX0tFWVdPUkRTID0gbmV3IFNldChbJ3Jlc2N1ZScsICdhZnRlcndhcmRzJ10pXG4iLCAiaW1wb3J0IHR5cGUge1xuICBMRVNOb2RlLCBFeHByTm9kZSwgU2VxdWVuY2VOb2RlLCBQYXJhbGxlbE5vZGUsXG4gIFNldE5vZGUsIEVtaXROb2RlLCBCcm9hZGNhc3ROb2RlLCBXYWl0Tm9kZSwgQ2FsbE5vZGUsXG4gIEJpbmROb2RlLCBBY3Rpb25Ob2RlLCBNYXRjaE5vZGUsIE1hdGNoQXJtLCBQYXR0ZXJuTm9kZSxcbiAgVHJ5Tm9kZSwgQW5pbWF0aW9uTm9kZSxcbn0gZnJvbSAnLi9hc3QuanMnXG5pbXBvcnQgdHlwZSB7IFRva2VuIH0gZnJvbSAnLi90b2tlbml6ZXIuanMnXG5pbXBvcnQge1xuICBlbmRzV2l0aEFuZCwgc3RyaXBUcmFpbGluZ0FuZCxcbiAgQkxPQ0tfVEVSTUlOQVRPUlMsIFRSWV9DTEFVU0VfS0VZV09SRFMsXG59IGZyb20gJy4vdG9rZW5pemVyLmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEtub3duIGFuaW1hdGlvbiBwcmltaXRpdmUgbmFtZXMgKHJlZ2lzdGVyZWQgYnkgdGhlIGFuaW1hdGlvbiBtb2R1bGUpXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgQU5JTUFUSU9OX1BSSU1JVElWRVMgPSBuZXcgU2V0KFtcbiAgJ2ZhZGUtaW4nLCAnZmFkZS1vdXQnLCAnc2xpZGUtaW4nLCAnc2xpZGUtb3V0JyxcbiAgJ3NsaWRlLXVwJywgJ3NsaWRlLWRvd24nLCAncHVsc2UnLFxuICAnc3RhZ2dlci1lbnRlcicsICdzdGFnZ2VyLWV4aXQnLFxuXSlcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXJzZXJcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5leHBvcnQgY2xhc3MgTEVTUGFyc2VyIHtcbiAgcHJpdmF0ZSBwb3MgPSAwXG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSB0b2tlbnM6IFRva2VuW10pIHt9XG5cbiAgcHJpdmF0ZSBwZWVrKG9mZnNldCA9IDApOiBUb2tlbiB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMudG9rZW5zW3RoaXMucG9zICsgb2Zmc2V0XVxuICB9XG5cbiAgcHJpdmF0ZSBhZHZhbmNlKCk6IFRva2VuIHtcbiAgICBjb25zdCB0ID0gdGhpcy50b2tlbnNbdGhpcy5wb3NdXG4gICAgaWYgKCF0KSB0aHJvdyBuZXcgTEVTUGFyc2VFcnJvcignVW5leHBlY3RlZCBlbmQgb2YgaW5wdXQnLCB1bmRlZmluZWQpXG4gICAgdGhpcy5wb3MrK1xuICAgIHJldHVybiB0XG4gIH1cblxuICBwcml2YXRlIGF0RW5kKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnBvcyA+PSB0aGlzLnRva2Vucy5sZW5ndGhcbiAgfVxuXG4gIHByaXZhdGUgdHJ5Q29uc3VtZSh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB0ID0gdGhpcy5wZWVrKClcbiAgICBpZiAodD8udGV4dCA9PT0gdGV4dCkgeyB0aGlzLnBvcysrOyByZXR1cm4gdHJ1ZSB9XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgRW50cnkgcG9pbnQgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcGFyc2UoKTogTEVTTm9kZSB7XG4gICAgY29uc3Qgbm9kZSA9IHRoaXMucGFyc2VCbG9jaygtMSlcbiAgICByZXR1cm4gbm9kZVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEJsb2NrIHBhcnNlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKipcbiAgICogUGFyc2VzIGFsbCBzdGF0ZW1lbnRzIGF0IGluZGVudCA+IGJhc2VJbmRlbnQuXG4gICAqXG4gICAqIFN0b3BzIHdoZW4gaXQgZW5jb3VudGVyczpcbiAgICogICAtIEEgdG9rZW4gd2l0aCBpbmRlbnQgPD0gYmFzZUluZGVudFxuICAgKiAgIC0gQSBibG9jayB0ZXJtaW5hdG9yICgvbWF0Y2gsIC90cnkpIFx1MjAxNCBsZWZ0IGZvciB0aGUgcGFyZW50IHRvIGNvbnN1bWVcbiAgICogICAtIEEgdHJ5LWNsYXVzZSBrZXl3b3JkIChyZXNjdWUsIGFmdGVyd2FyZHMpIGF0IGluZGVudCA8PSBiYXNlSW5kZW50XG4gICAqICAgLSBFbmQgb2YgdG9rZW4gc3RyZWFtXG4gICAqXG4gICAqIFJldHVybnMgYSBTZXF1ZW5jZU5vZGUgaWYgbXVsdGlwbGUgc3RlcHMsIG90aGVyd2lzZSB0aGUgc2luZ2xlIG5vZGUuXG4gICAqL1xuICBwcml2YXRlIHBhcnNlQmxvY2soYmFzZUluZGVudDogbnVtYmVyKTogTEVTTm9kZSB7XG4gICAgY29uc3Qgc3RlcHM6IExFU05vZGVbXSA9IFtdXG5cbiAgICB3aGlsZSAoIXRoaXMuYXRFbmQoKSkge1xuICAgICAgY29uc3QgdCA9IHRoaXMucGVlaygpIVxuXG4gICAgICAvLyBTdG9wOiB3ZSd2ZSByZXR1cm5lZCB0byBvciBwYXN0IHRoZSBwYXJlbnQgYmxvY2sncyBpbmRlbnRcbiAgICAgIGlmICh0LmluZGVudCA8PSBiYXNlSW5kZW50KSBicmVha1xuXG4gICAgICAvLyBTdG9wOiBibG9jayB0ZXJtaW5hdG9ycyBhcmUgY29uc3VtZWQgYnkgdGhlIGJsb2NrIG9wZW5lciAobWF0Y2gvdHJ5KVxuICAgICAgaWYgKEJMT0NLX1RFUk1JTkFUT1JTLmhhcyh0LnRleHQpKSBicmVha1xuXG4gICAgICAvLyBTdG9wOiB0cnktY2xhdXNlIGtleXdvcmRzIGVuZCB0aGUgY3VycmVudCB0cnkgYm9keVxuICAgICAgaWYgKFRSWV9DTEFVU0VfS0VZV09SRFMuaGFzKHQudGV4dCkgJiYgdC5pbmRlbnQgPD0gYmFzZUluZGVudCArIDIpIGJyZWFrXG5cbiAgICAgIC8vIFx1MjUwMFx1MjUwMCBTZXF1ZW50aWFsIGNvbm5lY3RpdmU6IHN0YW5kYWxvbmUgYHRoZW5gIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgICAgLy8gYHRoZW5gIGFsb25lIG9uIGEgbGluZSBpbnRyb2R1Y2VzIHRoZSBuZXh0IHNlcXVlbnRpYWwgc3RlcCxcbiAgICAgIC8vIHdoaWNoIGlzIGEgYmxvY2sgYXQgYSBkZWVwZXIgaW5kZW50IGxldmVsLlxuICAgICAgaWYgKHQudGV4dCA9PT0gJ3RoZW4nKSB7XG4gICAgICAgIGNvbnN0IHRoZW5JbmRlbnQgPSB0LmluZGVudFxuICAgICAgICB0aGlzLmFkdmFuY2UoKSAvLyBjb25zdW1lIGB0aGVuYFxuICAgICAgICBjb25zdCBuZXh0ID0gdGhpcy5wZWVrKClcbiAgICAgICAgaWYgKG5leHQgJiYgbmV4dC5pbmRlbnQgPiB0aGVuSW5kZW50KSB7XG4gICAgICAgICAgY29uc3Qgc3RlcCA9IHRoaXMucGFyc2VCbG9jayh0aGVuSW5kZW50KVxuICAgICAgICAgIHN0ZXBzLnB1c2goc3RlcClcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyBcdTI1MDBcdTI1MDAgU2VxdWVudGlhbCBjb25uZWN0aXZlOiBgdGhlbiBYYCBhcyBwcmVmaXggXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgICAvLyBgdGhlbiBjYWxsIGZvb2AsIGB0aGVuIGVtaXQgYmFyYCwgZXRjLlxuICAgICAgLy8gVGhlIGB0aGVuYCBpcyBqdXN0IGEgdmlzdWFsIHNlcXVlbmNlciBcdTIwMTQgdGhlIHJlc3Qgb2YgdGhlIGxpbmUgaXMgdGhlIHN0ZXAuXG4gICAgICBpZiAodC50ZXh0LnN0YXJ0c1dpdGgoJ3RoZW4gJykpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICAgICAgY29uc3QgcmVzdCA9IHQudGV4dC5zbGljZSg1KS50cmltKClcbiAgICAgICAgY29uc3Qgc3RlcCA9IHRoaXMucGFyc2VTaW5nbGVMaW5lKHJlc3QsIHQuaW5kZW50LCB0KVxuICAgICAgICBzdGVwcy5wdXNoKHN0ZXApXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIFx1MjUwMFx1MjUwMCBSZWd1bGFyIHN0YXRlbWVudCAocG9zc2libHkgYSBwYXJhbGxlbCBncm91cCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgICBjb25zdCBzdG10ID0gdGhpcy5wYXJzZVN0YXRlbWVudE9yUGFyYWxsZWwodC5pbmRlbnQpXG4gICAgICBzdGVwcy5wdXNoKHN0bXQpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRvU2VxdWVuY2VPclNpbmdsZShzdGVwcylcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBQYXJhbGxlbCBncm91cCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKipcbiAgICogUGFyc2VzIG9uZSBzdGF0ZW1lbnQgb3IgYSBncm91cCBvZiBwYXJhbGxlbCBzdGF0ZW1lbnRzIGNvbm5lY3RlZCBieSBgYW5kYC5cbiAgICpcbiAgICogTGluZXMgZW5kaW5nIHdpdGggYSBzdGFuZGFsb25lIGBhbmRgIGluZGljYXRlIHRoYXQgdGhlIG5leHQgbGluZSBydW5zXG4gICAqIGNvbmN1cnJlbnRseS4gQWxsIHBhcmFsbGVsIGJyYW5jaGVzIGFyZSB3cmFwcGVkIGluIGEgUGFyYWxsZWxOb2RlLlxuICAgKlxuICAgKiBgYW5kYC1ncm91cHMgb25seSBhcHBseSB3aXRoaW4gdGhlIHNhbWUgaW5kZW50IGxldmVsLiBBIGRlZXBlci1pbmRlbnRlZFxuICAgKiBsaW5lIGFmdGVyIGBhbmRgIGlzIGFuIGVycm9yICh3b3VsZCBpbmRpY2F0ZSBhIGJsb2NrLCBidXQgYGFuZGAgaXNcbiAgICogYSBsaW5lLWxldmVsIGNvbm5lY3Rvciwgbm90IGEgYmxvY2sgb3BlbmVyKS5cbiAgICovXG4gIHByaXZhdGUgcGFyc2VTdGF0ZW1lbnRPclBhcmFsbGVsKGJsb2NrSW5kZW50OiBudW1iZXIpOiBMRVNOb2RlIHtcbiAgICBjb25zdCBicmFuY2hlczogTEVTTm9kZVtdID0gW11cblxuICAgIHdoaWxlICghdGhpcy5hdEVuZCgpKSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy5wZWVrKCkhXG5cbiAgICAgIC8vIFN0b3AgY29uZGl0aW9ucyBcdTIwMTQgc2FtZSBhcyBwYXJzZUJsb2NrJ3NcbiAgICAgIGlmICh0LmluZGVudCA8IGJsb2NrSW5kZW50KSBicmVha1xuICAgICAgaWYgKHQuaW5kZW50ID4gYmxvY2tJbmRlbnQpIGJyZWFrICAgLy8gc2hvdWxkbid0IGhhcHBlbiBoZXJlLCBzYWZldHkgZ3VhcmRcbiAgICAgIGlmIChCTE9DS19URVJNSU5BVE9SUy5oYXModC50ZXh0KSkgYnJlYWtcbiAgICAgIGlmIChUUllfQ0xBVVNFX0tFWVdPUkRTLmhhcyh0LnRleHQpKSBicmVha1xuICAgICAgaWYgKHQudGV4dCA9PT0gJ3RoZW4nIHx8IHQudGV4dC5zdGFydHNXaXRoKCd0aGVuICcpKSBicmVha1xuXG4gICAgICBjb25zdCBoYXNBbmQgPSBlbmRzV2l0aEFuZCh0LnRleHQpXG4gICAgICBjb25zdCBsaW5lVGV4dCA9IGhhc0FuZCA/IHN0cmlwVHJhaWxpbmdBbmQodC50ZXh0KSA6IHQudGV4dFxuXG4gICAgICB0aGlzLmFkdmFuY2UoKVxuXG4gICAgICBjb25zdCBzdG10ID0gdGhpcy5wYXJzZVNpbmdsZUxpbmUobGluZVRleHQsIHQuaW5kZW50LCB0KVxuICAgICAgYnJhbmNoZXMucHVzaChzdG10KVxuXG4gICAgICBpZiAoIWhhc0FuZCkgYnJlYWtcbiAgICB9XG5cbiAgICBpZiAoYnJhbmNoZXMubGVuZ3RoID09PSAwKSByZXR1cm4gZXhwcignJylcbiAgICBpZiAoYnJhbmNoZXMubGVuZ3RoID09PSAxKSByZXR1cm4gYnJhbmNoZXNbMF0hXG4gICAgcmV0dXJuIHsgdHlwZTogJ3BhcmFsbGVsJywgYnJhbmNoZXMgfSBzYXRpc2ZpZXMgUGFyYWxsZWxOb2RlXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgU2luZ2xlLWxpbmUgZGlzcGF0Y2ggXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgLyoqXG4gICAqIFBhcnNlcyBhIHNpbmdsZSBzdGF0ZW1lbnQgZnJvbSBpdHMgdGV4dCBjb250ZW50LlxuICAgKiBUaGUgdGV4dCBoYXMgYWxyZWFkeSBoYWQgYHRoZW4gYCBwcmVmaXggYW5kIHRyYWlsaW5nIGAgYW5kYCBzdHJpcHBlZC5cbiAgICpcbiAgICogRGlzcGF0Y2ggb3JkZXIgbWF0dGVyczogbW9yZSBzcGVjaWZpYyBwYXR0ZXJucyBtdXN0IGNvbWUgYmVmb3JlIGdlbmVyYWwgb25lcy5cbiAgICovXG4gIHByaXZhdGUgcGFyc2VTaW5nbGVMaW5lKHRleHQ6IHN0cmluZywgaW5kZW50OiBudW1iZXIsIHRva2VuOiBUb2tlbik6IExFU05vZGUge1xuICAgIGNvbnN0IGZpcnN0ID0gZmlyc3RXb3JkKHRleHQpXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgQmxvY2sgY29uc3RydWN0cyAoY29uc3VtZSBtdWx0aXBsZSBmb2xsb3dpbmcgdG9rZW5zKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAoZmlyc3QgPT09ICdtYXRjaCcpIHJldHVybiB0aGlzLnBhcnNlTWF0Y2godGV4dCwgaW5kZW50LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICd0cnknKSAgIHJldHVybiB0aGlzLnBhcnNlVHJ5KGluZGVudCwgdG9rZW4pXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgU2ltcGxlIHN0YXRlbWVudCBkaXNwYXRjaCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAoZmlyc3QgPT09ICdzZXQnKSAgICAgICByZXR1cm4gdGhpcy5wYXJzZVNldCh0ZXh0LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICdlbWl0JykgICAgICByZXR1cm4gdGhpcy5wYXJzZUVtaXQodGV4dCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAnYnJvYWRjYXN0JykgcmV0dXJuIHRoaXMucGFyc2VCcm9hZGNhc3QodGV4dCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAnY2FsbCcpICAgICAgcmV0dXJuIHRoaXMucGFyc2VDYWxsKHRleHQsIHRva2VuKVxuICAgIGlmIChmaXJzdCA9PT0gJ3dhaXQnKSAgICAgIHJldHVybiB0aGlzLnBhcnNlV2FpdCh0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBBc3luYyBiaW5kOiBgbmFtZSA8LSBAdmVyYiAndXJsJyBbYXJnc11gIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGlmICh0ZXh0LmluY2x1ZGVzKCcgPC0gJykpIHJldHVybiB0aGlzLnBhcnNlQmluZCh0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBBbmltYXRpb24gcHJpbWl0aXZlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGlmIChBTklNQVRJT05fUFJJTUlUSVZFUy5oYXMoZmlyc3QpKSByZXR1cm4gdGhpcy5wYXJzZUFuaW1hdGlvbih0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBVbmtub3duOiBzdG9yZSBhcyByYXcgZXhwcmVzc2lvbiAoZXNjYXBlIGhhdGNoIC8gZnV0dXJlIGtleXdvcmRzKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBVbmtub3duIHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICByZXR1cm4gZXhwcih0ZXh0KVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIE1hdGNoIGJsb2NrIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgcGFyc2VNYXRjaCh0ZXh0OiBzdHJpbmcsIGluZGVudDogbnVtYmVyLCB0b2tlbjogVG9rZW4pOiBNYXRjaE5vZGUge1xuICAgIC8vIGB0ZXh0YCBpcyBlLmcuIFwibWF0Y2ggcmVzcG9uc2VcIiBvciBcIm1hdGNoICRmZWVkU3RhdGVcIlxuICAgIGNvbnN0IHN1YmplY3RSYXcgPSB0ZXh0LnNsaWNlKCdtYXRjaCcubGVuZ3RoKS50cmltKClcbiAgICBjb25zdCBzdWJqZWN0OiBFeHByTm9kZSA9IGV4cHIoc3ViamVjdFJhdylcbiAgICBjb25zdCBhcm1zOiBNYXRjaEFybVtdID0gW11cblxuICAgIHdoaWxlICghdGhpcy5hdEVuZCgpKSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy5wZWVrKCkhXG5cbiAgICAgIC8vIC9tYXRjaCB0ZXJtaW5hdGVzIHRoZSBibG9ja1xuICAgICAgaWYgKHQudGV4dCA9PT0gJy9tYXRjaCcpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgLy8gT25seSBjb25zdW1lIGFybSBsaW5lcyBhdCB0aGUgZXhwZWN0ZWQgYXJtIGluZGVudCAoaW5kZW50ICsgMilcbiAgICAgIGlmICh0LmluZGVudCA8PSBpbmRlbnQpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gVW5jbG9zZWQgbWF0Y2ggYmxvY2sgXHUyMDE0IG1pc3NpbmcgL21hdGNoYCwgdG9rZW4pXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIC8vIFBhcnNlIGFuIGFybTogYFtwYXR0ZXJuXSAtPmAgb3IgYFtwYXR0ZXJuXSAtPiBib2R5YFxuICAgICAgaWYgKHQudGV4dC5zdGFydHNXaXRoKCdbJykpIHtcbiAgICAgICAgYXJtcy5wdXNoKHRoaXMucGFyc2VNYXRjaEFybSh0LmluZGVudCwgdCkpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIFNraXAgdW5leHBlY3RlZCBsaW5lcyBpbnNpZGUgbWF0Y2hcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIFVuZXhwZWN0ZWQgdG9rZW4gaW5zaWRlIG1hdGNoIGJsb2NrOiAke0pTT04uc3RyaW5naWZ5KHQudGV4dCl9YCwgdClcbiAgICAgIHRoaXMuYWR2YW5jZSgpXG4gICAgfVxuXG4gICAgcmV0dXJuIHsgdHlwZTogJ21hdGNoJywgc3ViamVjdCwgYXJtcyB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlTWF0Y2hBcm0oYXJtSW5kZW50OiBudW1iZXIsIHRva2VuOiBUb2tlbik6IE1hdGNoQXJtIHtcbiAgICBjb25zdCB0ID0gdGhpcy5hZHZhbmNlKCkgLy8gY29uc3VtZSB0aGUgYXJtIGxpbmVcblxuICAgIC8vIFNwbGl0IG9uIGAgLT5gIHRvIHNlcGFyYXRlIHBhdHRlcm4gZnJvbSBib2R5XG4gICAgY29uc3QgYXJyb3dJZHggPSB0LnRleHQuaW5kZXhPZignIC0+JylcbiAgICBpZiAoYXJyb3dJZHggPT09IC0xKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYXRjaCBhcm0gbWlzc2luZyAnLT4nOiAke0pTT04uc3RyaW5naWZ5KHQudGV4dCl9YCwgdClcbiAgICAgIHJldHVybiB7IHBhdHRlcm5zOiBbeyBraW5kOiAnd2lsZGNhcmQnIH1dLCBib2R5OiBleHByKCcnKSB9XG4gICAgfVxuXG4gICAgY29uc3QgcGF0dGVyblJhdyA9IHQudGV4dC5zbGljZSgwLCBhcnJvd0lkeCkudHJpbSgpXG4gICAgY29uc3QgYWZ0ZXJBcnJvdyA9IHQudGV4dC5zbGljZShhcnJvd0lkeCArIDMpLnRyaW0oKSAgLy8gZXZlcnl0aGluZyBhZnRlciBgLT5gXG5cbiAgICBjb25zdCBwYXR0ZXJucyA9IHBhcnNlUGF0dGVybnMocGF0dGVyblJhdylcblxuICAgIGxldCBib2R5OiBMRVNOb2RlXG4gICAgaWYgKGFmdGVyQXJyb3cubGVuZ3RoID4gMCkge1xuICAgICAgLy8gSW5saW5lIGFybTogYFsnZXJyb3InXSAtPiBzZXQgJGZlZWRTdGF0ZSB0byAnZXJyb3InYFxuICAgICAgYm9keSA9IHRoaXMucGFyc2VTaW5nbGVMaW5lKGFmdGVyQXJyb3csIGFybUluZGVudCwgdG9rZW4pXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE11bHRpLWxpbmUgYXJtOiBib2R5IGlzIHRoZSBkZWVwZXItaW5kZW50ZWQgYmxvY2tcbiAgICAgIGJvZHkgPSB0aGlzLnBhcnNlQmxvY2soYXJtSW5kZW50KVxuICAgIH1cblxuICAgIHJldHVybiB7IHBhdHRlcm5zLCBib2R5IH1cbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBUcnkgYmxvY2sgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBwYXJzZVRyeShpbmRlbnQ6IG51bWJlciwgdG9rZW46IFRva2VuKTogVHJ5Tm9kZSB7XG4gICAgLy8gTm90ZTogdGhlIGB0cnlgIHRva2VuIHdhcyBhbHJlYWR5IGNvbnN1bWVkIGJ5IHRoZSBjYWxsaW5nIHBhcnNlU3RhdGVtZW50T3JQYXJhbGxlbC5cbiAgICAvLyBEbyBOT1QgY2FsbCB0aGlzLmFkdmFuY2UoKSBoZXJlIFx1MjAxNCB0aGF0IHdvdWxkIHNraXAgdGhlIGZpcnN0IGJvZHkgbGluZS5cblxuICAgIC8vIFBhcnNlIGJvZHkgXHUyMDE0IHN0b3BzIGF0IHJlc2N1ZS9hZnRlcndhcmRzLy90cnkgYXQgdGhlIHNhbWUgaW5kZW50IGxldmVsXG4gICAgY29uc3QgYm9keSA9IHRoaXMucGFyc2VCbG9jayhpbmRlbnQpXG5cbiAgICBsZXQgcmVzY3VlOiBMRVNOb2RlIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG4gICAgbGV0IGFmdGVyd2FyZHM6IExFU05vZGUgfCB1bmRlZmluZWQgPSB1bmRlZmluZWRcblxuICAgIC8vIHJlc2N1ZSBjbGF1c2UgKG9wdGlvbmFsKVxuICAgIGlmICh0aGlzLnBlZWsoKT8udGV4dCA9PT0gJ3Jlc2N1ZScgJiYgdGhpcy5wZWVrKCk/LmluZGVudCA9PT0gaW5kZW50KSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKSAvLyBjb25zdW1lIGByZXNjdWVgXG4gICAgICByZXNjdWUgPSB0aGlzLnBhcnNlQmxvY2soaW5kZW50KVxuICAgIH1cblxuICAgIC8vIGFmdGVyd2FyZHMgY2xhdXNlIChvcHRpb25hbClcbiAgICBpZiAodGhpcy5wZWVrKCk/LnRleHQgPT09ICdhZnRlcndhcmRzJyAmJiB0aGlzLnBlZWsoKT8uaW5kZW50ID09PSBpbmRlbnQpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpIC8vIGNvbnN1bWUgYGFmdGVyd2FyZHNgXG4gICAgICBhZnRlcndhcmRzID0gdGhpcy5wYXJzZUJsb2NrKGluZGVudClcbiAgICB9XG5cbiAgICAvLyBDb25zdW1lIC90cnlcbiAgICBpZiAodGhpcy5wZWVrKCk/LnRleHQgPT09ICcvdHJ5Jykge1xuICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gVW5jbG9zZWQgdHJ5IGJsb2NrIFx1MjAxNCBtaXNzaW5nIC90cnlgLCB0b2tlbilcbiAgICB9XG5cbiAgICBjb25zdCB0cnlOb2RlOiBUcnlOb2RlID0geyB0eXBlOiAndHJ5JywgYm9keSB9XG4gICAgaWYgKHJlc2N1ZSAgICAhPT0gdW5kZWZpbmVkKSB0cnlOb2RlLnJlc2N1ZSAgICAgPSByZXNjdWVcbiAgICBpZiAoYWZ0ZXJ3YXJkcyAhPT0gdW5kZWZpbmVkKSB0cnlOb2RlLmFmdGVyd2FyZHMgPSBhZnRlcndhcmRzXG4gICAgcmV0dXJuIHRyeU5vZGVcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBTaW1wbGUgc3RhdGVtZW50IHBhcnNlcnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBwYXJzZVNldCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IFNldE5vZGUge1xuICAgIC8vIGBzZXQgJHNpZ25hbCB0byBleHByYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9ec2V0XFxzK1xcJChcXHcrKVxccyt0b1xccysoLispJC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgc2V0IHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7IHR5cGU6ICdzZXQnLCBzaWduYWw6ICc/PycsIHZhbHVlOiBleHByKHRleHQpIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdzZXQnLFxuICAgICAgc2lnbmFsOiBtWzFdISxcbiAgICAgIHZhbHVlOiBleHByKG1bMl0hLnRyaW0oKSksXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUVtaXQodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBFbWl0Tm9kZSB7XG4gICAgLy8gYGVtaXQgZXZlbnQ6bmFtZSBbcGF5bG9hZCwgLi4uXWAgb3IgYGVtaXQgZXZlbnQ6bmFtZWBcbiAgICBjb25zdCB7IG5hbWUsIHBheWxvYWQgfSA9IHBhcnNlRXZlbnRMaW5lKHRleHQuc2xpY2UoJ2VtaXQnLmxlbmd0aCkudHJpbSgpLCB0b2tlbilcbiAgICByZXR1cm4geyB0eXBlOiAnZW1pdCcsIGV2ZW50OiBuYW1lLCBwYXlsb2FkIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VCcm9hZGNhc3QodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBCcm9hZGNhc3ROb2RlIHtcbiAgICBjb25zdCB7IG5hbWUsIHBheWxvYWQgfSA9IHBhcnNlRXZlbnRMaW5lKHRleHQuc2xpY2UoJ2Jyb2FkY2FzdCcubGVuZ3RoKS50cmltKCksIHRva2VuKVxuICAgIHJldHVybiB7IHR5cGU6ICdicm9hZGNhc3QnLCBldmVudDogbmFtZSwgcGF5bG9hZCB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQ2FsbCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IENhbGxOb2RlIHtcbiAgICAvLyBgY2FsbCBjb21tYW5kOm5hbWUgW2FyZzogdmFsdWUsIC4uLl1gIG9yIGBjYWxsIGNvbW1hbmQ6bmFtZWBcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXmNhbGxcXHMrKFteXFxzXFxbXSspXFxzKig/OlxcWyguKylcXF0pPyQvKVxuICAgIGlmICghbSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gTWFsZm9ybWVkIGNhbGwgc3RhdGVtZW50OiAke0pTT04uc3RyaW5naWZ5KHRleHQpfWAsIHRva2VuKVxuICAgICAgcmV0dXJuIHsgdHlwZTogJ2NhbGwnLCBjb21tYW5kOiAnPz8nLCBhcmdzOiB7fSB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnY2FsbCcsXG4gICAgICBjb21tYW5kOiBtWzFdISxcbiAgICAgIGFyZ3M6IHBhcnNlQXJnTGlzdChtWzJdID8/ICcnKSxcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlV2FpdCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IFdhaXROb2RlIHtcbiAgICAvLyBgd2FpdCAzMDBtc2Agb3IgYHdhaXQgKGF0dGVtcHQgKyAxKSAqIDUwMG1zYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9ed2FpdFxccysoLis/KW1zJC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgd2FpdCBzdGF0ZW1lbnQ6ICR7SlNPTi5zdHJpbmdpZnkodGV4dCl9YCwgdG9rZW4pXG4gICAgICByZXR1cm4geyB0eXBlOiAnd2FpdCcsIG1zOiAwIH1cbiAgICB9XG4gICAgY29uc3QgbXNFeHByID0gbVsxXSEudHJpbSgpXG4gICAgLy8gU2ltcGxlIGxpdGVyYWxcbiAgICBjb25zdCBsaXRlcmFsID0gTnVtYmVyKG1zRXhwcilcbiAgICBpZiAoIU51bWJlci5pc05hTihsaXRlcmFsKSkgcmV0dXJuIHsgdHlwZTogJ3dhaXQnLCBtczogbGl0ZXJhbCB9XG4gICAgLy8gRXhwcmVzc2lvbiBcdTIwMTQgc3RvcmUgYXMgMCB3aXRoIHRoZSBleHByZXNzaW9uIGFzIGEgY29tbWVudCAoZXhlY3V0b3Igd2lsbCBldmFsKVxuICAgIC8vIFBoYXNlIDMgd2lsbCBoYW5kbGUgZHluYW1pYyBkdXJhdGlvbnMgcHJvcGVybHlcbiAgICByZXR1cm4geyB0eXBlOiAnd2FpdCcsIG1zOiAwIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VCaW5kKHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogQmluZE5vZGUge1xuICAgIC8vIGBuYW1lIDwtIEB2ZXJiICd1cmwnIFthcmdzXWBcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXihcXHcrKVxccys8LVxccytAKFxcdyspXFxzKycoW14nXSspJ1xccyooPzpcXFsoLispXFxdKT8kLylcbiAgICBpZiAoIW0pIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIE1hbGZvcm1lZCBiaW5kIHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdiaW5kJyxcbiAgICAgICAgbmFtZTogJz8/JyxcbiAgICAgICAgYWN0aW9uOiB7IHR5cGU6ICdhY3Rpb24nLCB2ZXJiOiAnZ2V0JywgdXJsOiAnJywgYXJnczoge30gfSxcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgYWN0aW9uOiBBY3Rpb25Ob2RlID0ge1xuICAgICAgdHlwZTogJ2FjdGlvbicsXG4gICAgICB2ZXJiOiBtWzJdIS50b0xvd2VyQ2FzZSgpLFxuICAgICAgdXJsOiBtWzNdISxcbiAgICAgIGFyZ3M6IHBhcnNlQXJnTGlzdChtWzRdID8/ICcnKSxcbiAgICB9XG4gICAgcmV0dXJuIHsgdHlwZTogJ2JpbmQnLCBuYW1lOiBtWzFdISwgYWN0aW9uIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VBbmltYXRpb24odGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBBbmltYXRpb25Ob2RlIHtcbiAgICAvLyBgcHJpbWl0aXZlIHNlbGVjdG9yIGR1cmF0aW9uIGVhc2luZyBbb3B0aW9uc11gXG4gICAgLy8gRXhhbXBsZXM6XG4gICAgLy8gICBzdGFnZ2VyLWVudGVyIC5mZWVkLWl0ZW0gIDEyMG1zIGVhc2Utb3V0IFtnYXA6IDQwbXMgIGZyb206IHJpZ2h0XVxuICAgIC8vICAgcHVsc2UgLmZlZWQtaXRlbS5pcy11cGRhdGVkICAzMDBtcyBlYXNlLWluLW91dFxuICAgIC8vICAgc2xpZGUtb3V0IFtkYXRhLWl0ZW0taWQ6IGlkXSAgMTUwbXMgZWFzZS1pbiBbdG86IHJpZ2h0XVxuXG4gICAgLy8gVG9rZW5pemU6IHNwbGl0IG9uIHdoaXRlc3BhY2UgYnV0IHByZXNlcnZlIFsuLi5dIGdyb3Vwc1xuICAgIGNvbnN0IHBhcnRzID0gc3BsaXRBbmltYXRpb25MaW5lKHRleHQpXG5cbiAgICBjb25zdCBwcmltaXRpdmUgPSBwYXJ0c1swXSA/PyAnJ1xuICAgIGNvbnN0IHNlbGVjdG9yICA9IHBhcnRzWzFdID8/ICcnXG4gICAgY29uc3QgZHVyYXRpb25TdHIgPSBwYXJ0c1syXSA/PyAnMG1zJ1xuICAgIGNvbnN0IGVhc2luZyAgICA9IHBhcnRzWzNdID8/ICdlYXNlJ1xuICAgIGNvbnN0IG9wdGlvbnNTdHIgPSBwYXJ0c1s0XSA/PyAnJyAgLy8gbWF5IGJlIGFic2VudFxuXG4gICAgY29uc3QgZHVyYXRpb25NcyA9IHBhcnNlSW50KGR1cmF0aW9uU3RyLCAxMClcblxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnYW5pbWF0aW9uJyxcbiAgICAgIHByaW1pdGl2ZSxcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgZHVyYXRpb246IE51bWJlci5pc05hTihkdXJhdGlvbk1zKSA/IDAgOiBkdXJhdGlvbk1zLFxuICAgICAgZWFzaW5nLFxuICAgICAgb3B0aW9uczogcGFyc2VBbmltYXRpb25PcHRpb25zKG9wdGlvbnNTdHIpLFxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFBhdHRlcm4gcGFyc2luZ1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogUGFyc2VzIGEgcGF0dGVybiBncm91cCBsaWtlIGBbaXQgICBvayAgIF1gLCBgW25pbCAgZXJyb3JdYCwgYFtfXWAsXG4gKiBgWydlcnJvciddYCwgYFswIHwgMSB8IDJdYC5cbiAqXG4gKiBSZXR1cm5zIGFuIGFycmF5IG9mIFBhdHRlcm5Ob2RlIFx1MjAxNCBvbmUgcGVyIGVsZW1lbnQgaW4gdGhlIHR1cGxlIHBhdHRlcm4uXG4gKiBGb3Igb3ItcGF0dGVybnMgKGAwIHwgMSB8IDJgKSwgcmV0dXJucyBhIHNpbmdsZSBPclBhdHRlcm5Ob2RlLlxuICovXG5mdW5jdGlvbiBwYXJzZVBhdHRlcm5zKHJhdzogc3RyaW5nKTogUGF0dGVybk5vZGVbXSB7XG4gIC8vIFN0cmlwIG91dGVyIGJyYWNrZXRzXG4gIGNvbnN0IGlubmVyID0gcmF3LnJlcGxhY2UoL15cXFt8XFxdJC9nLCAnJykudHJpbSgpXG5cbiAgLy8gQ2hlY2sgZm9yIG9yLXBhdHRlcm46IGNvbnRhaW5zIGAgfCBgXG4gIGlmIChpbm5lci5pbmNsdWRlcygnIHwgJykgfHwgaW5uZXIuaW5jbHVkZXMoJ3wnKSkge1xuICAgIGNvbnN0IGFsdGVybmF0aXZlcyA9IGlubmVyLnNwbGl0KC9cXHMqXFx8XFxzKi8pLm1hcChwID0+IHBhcnNlU2luZ2xlUGF0dGVybihwLnRyaW0oKSkpXG4gICAgcmV0dXJuIFt7IGtpbmQ6ICdvcicsIHBhdHRlcm5zOiBhbHRlcm5hdGl2ZXMgfV1cbiAgfVxuXG4gIC8vIFR1cGxlIHBhdHRlcm46IHNwYWNlLXNlcGFyYXRlZCBlbGVtZW50c1xuICAvLyBVc2UgYSBjdXN0b20gc3BsaXQgdG8gaGFuZGxlIG11bHRpcGxlIHNwYWNlcyAoYWxpZ25tZW50IHBhZGRpbmcpXG4gIHJldHVybiBpbm5lci50cmltKCkuc3BsaXQoL1xcc3syLH18XFxzKD89XFxTKS8pLmZpbHRlcihzID0+IHMudHJpbSgpKVxuICAgIC5tYXAocCA9PiBwYXJzZVNpbmdsZVBhdHRlcm4ocC50cmltKCkpKVxufVxuXG5mdW5jdGlvbiBwYXJzZVNpbmdsZVBhdHRlcm4oczogc3RyaW5nKTogUGF0dGVybk5vZGUge1xuICBpZiAocyA9PT0gJ18nKSAgIHJldHVybiB7IGtpbmQ6ICd3aWxkY2FyZCcgfVxuICBpZiAocyA9PT0gJ25pbCcpIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IG51bGwgfVxuXG4gIC8vIFN0cmluZyBsaXRlcmFsOiAndmFsdWUnXG4gIGlmIChzLnN0YXJ0c1dpdGgoXCInXCIpICYmIHMuZW5kc1dpdGgoXCInXCIpKSB7XG4gICAgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogcy5zbGljZSgxLCAtMSkgfVxuICB9XG5cbiAgLy8gTnVtYmVyIGxpdGVyYWxcbiAgY29uc3QgbiA9IE51bWJlcihzKVxuICBpZiAoIU51bWJlci5pc05hTihuKSkgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogbiB9XG5cbiAgLy8gQm9vbGVhblxuICBpZiAocyA9PT0gJ3RydWUnKSAgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogdHJ1ZSB9XG4gIGlmIChzID09PSAnZmFsc2UnKSByZXR1cm4geyBraW5kOiAnbGl0ZXJhbCcsIHZhbHVlOiBmYWxzZSB9XG5cbiAgLy8gRXZlcnl0aGluZyBlbHNlIGlzIGEgYmluZGluZyAoY2FwdHVyZXMgdGhlIHZhbHVlIGZvciB1c2UgaW4gdGhlIGJvZHkpXG4gIHJldHVybiB7IGtpbmQ6ICdiaW5kaW5nJywgbmFtZTogcyB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gQXJndW1lbnQgbGlzdCBwYXJzaW5nXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBQYXJzZXMgYGtleTogdmFsdWUgIGtleTI6IHZhbHVlMmAgZnJvbSBpbnNpZGUgYSBbLi4uXSBhcmd1bWVudCBibG9jay5cbiAqIFZhbHVlcyBhcmUgc3RvcmVkIGFzIEV4cHJOb2RlIChldmFsdWF0ZWQgYXQgcnVudGltZSkuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlQXJnTGlzdChyYXc6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIEV4cHJOb2RlPiB7XG4gIGlmICghcmF3LnRyaW0oKSkgcmV0dXJuIHt9XG5cbiAgY29uc3QgcmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCBFeHByTm9kZT4gPSB7fVxuXG4gIC8vIFNwbGl0IG9uIGAgIGAgKGRvdWJsZS1zcGFjZSB1c2VkIGFzIHNlcGFyYXRvciBpbiBMRVMgc3R5bGUpXG4gIC8vIGJ1dCBhbHNvIGhhbmRsZSBzaW5nbGUgYCAga2V5OiB2YWx1ZWAgZW50cmllc1xuICAvLyBTaW1wbGUgcmVnZXg6IGB3b3JkOiByZXN0X3VudGlsX25leHRfd29yZDpgXG4gIGNvbnN0IHBhaXJzID0gcmF3LnRyaW0oKS5zcGxpdCgvKD88PVxcUylcXHN7Mix9KD89XFx3KS8pXG4gIGZvciAoY29uc3QgcGFpciBvZiBwYWlycykge1xuICAgIGNvbnN0IGNvbG9uSWR4ID0gcGFpci5pbmRleE9mKCc6JylcbiAgICBpZiAoY29sb25JZHggPT09IC0xKSBjb250aW51ZVxuICAgIGNvbnN0IGtleSAgID0gcGFpci5zbGljZSgwLCBjb2xvbklkeCkudHJpbSgpXG4gICAgY29uc3QgdmFsdWUgPSBwYWlyLnNsaWNlKGNvbG9uSWR4ICsgMSkudHJpbSgpXG4gICAgaWYgKGtleSkgcmVzdWx0W2tleV0gPSBleHByKHZhbHVlKVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEV2ZW50IGxpbmUgcGFyc2luZzogYGV2ZW50Om5hbWUgW3BheWxvYWQuLi5dYFxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIHBhcnNlRXZlbnRMaW5lKFxuICByYXc6IHN0cmluZyxcbiAgdG9rZW46IFRva2VuXG4pOiB7IG5hbWU6IHN0cmluZzsgcGF5bG9hZDogRXhwck5vZGVbXSB9IHtcbiAgLy8gYGZlZWQ6ZGF0YS1yZWFkeWAgb3IgYGZlZWQ6ZGF0YS1yZWFkeSBbJGZlZWRJdGVtc11gIG9yIGBmZWVkOmVycm9yIFskZXJyb3JdYFxuICBjb25zdCBicmFja2V0SWR4ID0gcmF3LmluZGV4T2YoJ1snKVxuICBpZiAoYnJhY2tldElkeCA9PT0gLTEpIHtcbiAgICByZXR1cm4geyBuYW1lOiByYXcudHJpbSgpLCBwYXlsb2FkOiBbXSB9XG4gIH1cbiAgY29uc3QgbmFtZSA9IHJhdy5zbGljZSgwLCBicmFja2V0SWR4KS50cmltKClcbiAgY29uc3QgcGF5bG9hZFJhdyA9IHJhdy5zbGljZShicmFja2V0SWR4ICsgMSwgcmF3Lmxhc3RJbmRleE9mKCddJykpLnRyaW0oKVxuXG4gIC8vIFBheWxvYWQgZWxlbWVudHMgYXJlIGNvbW1hIG9yIHNwYWNlIHNlcGFyYXRlZCBleHByZXNzaW9uc1xuICBjb25zdCBwYXlsb2FkOiBFeHByTm9kZVtdID0gcGF5bG9hZFJhd1xuICAgID8gcGF5bG9hZFJhdy5zcGxpdCgvLFxccyp8XFxzezIsfS8pLm1hcChzID0+IGV4cHIocy50cmltKCkpKS5maWx0ZXIoZSA9PiBlLnJhdylcbiAgICA6IFtdXG5cbiAgcmV0dXJuIHsgbmFtZSwgcGF5bG9hZCB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gQW5pbWF0aW9uIGxpbmUgcGFyc2luZ1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogU3BsaXRzIGFuIGFuaW1hdGlvbiBsaW5lIGludG8gaXRzIHN0cnVjdHVyYWwgcGFydHMsIHByZXNlcnZpbmcgWy4uLl0gZ3JvdXBzLlxuICpcbiAqIElucHV0OiAgYHN0YWdnZXItZW50ZXIgLmZlZWQtaXRlbSAgMTIwbXMgZWFzZS1vdXQgW2dhcDogNDBtcyAgZnJvbTogcmlnaHRdYFxuICogT3V0cHV0OiBbJ3N0YWdnZXItZW50ZXInLCAnLmZlZWQtaXRlbScsICcxMjBtcycsICdlYXNlLW91dCcsICdbZ2FwOiA0MG1zICBmcm9tOiByaWdodF0nXVxuICovXG5mdW5jdGlvbiBzcGxpdEFuaW1hdGlvbkxpbmUodGV4dDogc3RyaW5nKTogc3RyaW5nW10ge1xuICBjb25zdCBwYXJ0czogc3RyaW5nW10gPSBbXVxuICBsZXQgY3VycmVudCA9ICcnXG4gIGxldCBpbkJyYWNrZXQgPSAwXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0ZXh0Lmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY2ggPSB0ZXh0W2ldIVxuICAgIGlmIChjaCA9PT0gJ1snKSB7XG4gICAgICBpbkJyYWNrZXQrK1xuICAgICAgY3VycmVudCArPSBjaFxuICAgIH0gZWxzZSBpZiAoY2ggPT09ICddJykge1xuICAgICAgaW5CcmFja2V0LS1cbiAgICAgIGN1cnJlbnQgKz0gY2hcbiAgICB9IGVsc2UgaWYgKGNoID09PSAnICcgJiYgaW5CcmFja2V0ID09PSAwKSB7XG4gICAgICBpZiAoY3VycmVudC50cmltKCkpIHBhcnRzLnB1c2goY3VycmVudC50cmltKCkpXG4gICAgICBjdXJyZW50ID0gJydcbiAgICB9IGVsc2Uge1xuICAgICAgY3VycmVudCArPSBjaFxuICAgIH1cbiAgfVxuICBpZiAoY3VycmVudC50cmltKCkpIHBhcnRzLnB1c2goY3VycmVudC50cmltKCkpXG4gIHJldHVybiBwYXJ0c1xufVxuXG4vKipcbiAqIFBhcnNlcyBhbmltYXRpb24gb3B0aW9ucyBmcm9tIGEgYFtrZXk6IHZhbHVlICBrZXkyOiB2YWx1ZTJdYCBzdHJpbmcuXG4gKiBUaGUgb3V0ZXIgYnJhY2tldHMgYXJlIGluY2x1ZGVkIGluIHRoZSBpbnB1dC5cbiAqL1xuZnVuY3Rpb24gcGFyc2VBbmltYXRpb25PcHRpb25zKHJhdzogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgRXhwck5vZGU+IHtcbiAgaWYgKCFyYXcudHJpbSgpKSByZXR1cm4ge31cbiAgLy8gU3RyaXAgb3V0ZXIgYnJhY2tldHNcbiAgY29uc3QgaW5uZXIgPSByYXcucmVwbGFjZSgvXlxcW3xcXF0kL2csICcnKS50cmltKClcbiAgcmV0dXJuIHBhcnNlQXJnTGlzdChpbm5lcilcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBVdGlsaXRpZXNcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5mdW5jdGlvbiBleHByKHJhdzogc3RyaW5nKTogRXhwck5vZGUge1xuICByZXR1cm4geyB0eXBlOiAnZXhwcicsIHJhdyB9XG59XG5cbmZ1bmN0aW9uIGZpcnN0V29yZCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdGV4dC5zcGxpdCgvXFxzKy8pWzBdID8/ICcnXG59XG5cbmZ1bmN0aW9uIHRvU2VxdWVuY2VPclNpbmdsZShzdGVwczogTEVTTm9kZVtdKTogTEVTTm9kZSB7XG4gIGlmIChzdGVwcy5sZW5ndGggPT09IDApIHJldHVybiBleHByKCcnKVxuICBpZiAoc3RlcHMubGVuZ3RoID09PSAxKSByZXR1cm4gc3RlcHNbMF0hXG4gIHJldHVybiB7IHR5cGU6ICdzZXF1ZW5jZScsIHN0ZXBzIH0gc2F0aXNmaWVzIFNlcXVlbmNlTm9kZVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFBhcnNlIGVycm9yXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZXhwb3J0IGNsYXNzIExFU1BhcnNlRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZywgcHVibGljIHJlYWRvbmx5IHRva2VuOiBUb2tlbiB8IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IGxvYyA9IHRva2VuID8gYCAobGluZSAke3Rva2VuLmxpbmVOdW19OiAke0pTT04uc3RyaW5naWZ5KHRva2VuLnRleHQpfSlgIDogJydcbiAgICBzdXBlcihgW0xFUzpwYXJzZXJdICR7bWVzc2FnZX0ke2xvY31gKVxuICAgIHRoaXMubmFtZSA9ICdMRVNQYXJzZUVycm9yJ1xuICB9XG59XG4iLCAiaW1wb3J0IHsgc3RyaXBCb2R5IH0gZnJvbSAnLi9zdHJpcEJvZHkuanMnXG5pbXBvcnQgeyB0b2tlbml6ZSB9IGZyb20gJy4vdG9rZW5pemVyLmpzJ1xuaW1wb3J0IHsgTEVTUGFyc2VyIH0gZnJvbSAnLi9wYXJzZXIuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICcuL2FzdC5qcydcblxuZXhwb3J0IHsgTEVTUGFyc2VyLCBMRVNQYXJzZUVycm9yIH0gZnJvbSAnLi9wYXJzZXIuanMnXG5leHBvcnQgeyB0b2tlbml6ZSwgZW5kc1dpdGhBbmQsIHN0cmlwVHJhaWxpbmdBbmQgfSBmcm9tICcuL3Rva2VuaXplci5qcydcbmV4cG9ydCB7IHN0cmlwQm9keSB9IGZyb20gJy4vc3RyaXBCb2R5LmpzJ1xuZXhwb3J0IHR5cGUgeyBUb2tlbiB9IGZyb20gJy4vdG9rZW5pemVyLmpzJ1xuZXhwb3J0ICogZnJvbSAnLi9hc3QuanMnXG5leHBvcnQgKiBmcm9tICcuL2NvbmZpZy5qcydcblxuLyoqXG4gKiBQYXJzZSBhIHJhdyBMRVMgYm9keSBzdHJpbmcgKGZyb20gYSBkbz0sIGhhbmRsZT0sIG9yIHJ1bj0gYXR0cmlidXRlKVxuICogaW50byBhIHR5cGVkIEFTVCBub2RlLlxuICpcbiAqIFRoaXMgaXMgdGhlIHB1YmxpYyBlbnRyeSBwb2ludCBmb3IgUGhhc2UgMjpcbiAqICAgLSBTdHJpcHMgYmFja3RpY2sgd3JhcHBlciBhbmQgbm9ybWFsaXplcyBpbmRlbnRhdGlvbiAoc3RyaXBCb2R5KVxuICogICAtIFRva2VuaXplcyBpbnRvIGxpbmVzIHdpdGggaW5kZW50IGxldmVscyAodG9rZW5pemUpXG4gKiAgIC0gUGFyc2VzIGludG8gYSB0eXBlZCBMRVNOb2RlIEFTVCAoTEVTUGFyc2VyKVxuICpcbiAqIEB0aHJvd3MgTEVTUGFyc2VFcnJvciBvbiB1bnJlY292ZXJhYmxlIHN5bnRheCBlcnJvcnMgKGN1cnJlbnRseSBzb2Z0LXdhcm5zIGluc3RlYWQpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUxFUyhyYXc6IHN0cmluZyk6IExFU05vZGUge1xuICBjb25zdCBzdHJpcHBlZCA9IHN0cmlwQm9keShyYXcpXG4gIGNvbnN0IHRva2VucyAgID0gdG9rZW5pemUoc3RyaXBwZWQpXG4gIGNvbnN0IHBhcnNlciAgID0gbmV3IExFU1BhcnNlcih0b2tlbnMpXG4gIHJldHVybiBwYXJzZXIucGFyc2UoKVxufVxuIiwgIi8qKlxuICogUGhhc2UgNDogd2lyZXMgdGhlIHBhcnNlZCBjb25maWcgaW50byBsaXZlIHJ1bnRpbWUgYmVoYXZpb3IuXG4gKlxuICogUmVzcG9uc2liaWxpdGllczpcbiAqICAgMS4gUmVnaXN0ZXIgYWxsIDxsb2NhbC1jb21tYW5kPiBwYXJzZWQgZGVmcyBpbnRvIHRoZSBDb21tYW5kUmVnaXN0cnlcbiAqICAgMi4gQXR0YWNoIEN1c3RvbUV2ZW50IGxpc3RlbmVycyBvbiB0aGUgaG9zdCBmb3IgZWFjaCA8b24tZXZlbnQ+XG4gKiAgIDMuIFdpcmUgPG9uLWxvYWQ+IHRvIGZpcmUgYWZ0ZXIgRE9NIGlzIHJlYWR5XG4gKiAgIDQuIEJ1aWxkIHRoZSBMRVNDb250ZXh0IHVzZWQgYnkgdGhlIGV4ZWN1dG9yXG4gKlxuICogPG9uLXNpZ25hbD4gYW5kIDxvbi1lbnRlcj4vPG9uLWV4aXQ+IGFyZSB3aXJlZCBpbiBQaGFzZSA1LzYuXG4gKi9cblxuaW1wb3J0IHsgZXhlY3V0ZSwgZXZhbEV4cHIgfSBmcm9tICcuL2V4ZWN1dG9yLmpzJ1xuaW1wb3J0IHsgTEVTU2NvcGUgfSBmcm9tICcuL3Njb3BlLmpzJ1xuaW1wb3J0IHR5cGUgeyBDb21tYW5kUmVnaXN0cnkgfSBmcm9tICcuL3JlZ2lzdHJ5LmpzJ1xuaW1wb3J0IHR5cGUgeyBNb2R1bGVSZWdpc3RyeSB9IGZyb20gJ0Btb2R1bGVzL3R5cGVzLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNDb25maWcgfSBmcm9tICdAcGFyc2VyL2NvbmZpZy5qcydcbmltcG9ydCB0eXBlIHsgTEVTTm9kZSB9IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuaW1wb3J0IHsgcGFyc2VMRVMgfSBmcm9tICdAcGFyc2VyL2luZGV4LmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlZFdpcmluZyB7XG4gIGNvbW1hbmRzOiAgQXJyYXk8eyBuYW1lOiBzdHJpbmc7IGd1YXJkOiBzdHJpbmcgfCBudWxsOyBhcmdzUmF3OiBzdHJpbmc7IGJvZHk6IExFU05vZGUgfT5cbiAgaGFuZGxlcnM6ICBBcnJheTx7IGV2ZW50OiBzdHJpbmc7IGJvZHk6IExFU05vZGUgfT5cbiAgd2F0Y2hlcnM6ICBBcnJheTx7IHNpZ25hbDogc3RyaW5nOyB3aGVuOiBzdHJpbmcgfCBudWxsOyBib2R5OiBMRVNOb2RlIH0+XG4gIGxpZmVjeWNsZToge1xuICAgIG9uTG9hZDogIExFU05vZGVbXVxuICAgIG9uRW50ZXI6IEFycmF5PHsgd2hlbjogc3RyaW5nIHwgbnVsbDsgYm9keTogTEVTTm9kZSB9PlxuICAgIG9uRXhpdDogIExFU05vZGVbXVxuICB9XG59XG5cbi8qKiBCdWlsZHMgYSBMRVNDb250ZXh0IGZvciB0aGUgaG9zdCBlbGVtZW50LiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ29udGV4dChcbiAgaG9zdDogRWxlbWVudCxcbiAgY29tbWFuZHM6IENvbW1hbmRSZWdpc3RyeSxcbiAgbW9kdWxlczogTW9kdWxlUmVnaXN0cnksXG4gIHNpZ25hbHM6IHsgZ2V0OiAoazogc3RyaW5nKSA9PiB1bmtub3duOyBzZXQ6IChrOiBzdHJpbmcsIHY6IHVua25vd24pID0+IHZvaWQgfVxuKTogaW1wb3J0KCcuL2V4ZWN1dG9yLmpzJykuTEVTQ29udGV4dCB7XG4gIGNvbnN0IHNjb3BlID0gbmV3IExFU1Njb3BlKClcblxuICBjb25zdCBlbWl0TG9jYWwgPSAoZXZlbnQ6IHN0cmluZywgcGF5bG9hZDogdW5rbm93bltdKSA9PiB7XG4gICAgY29uc29sZS5sb2coYFtMRVNdIGVtaXQgXCIke2V2ZW50fVwiYCwgcGF5bG9hZC5sZW5ndGggPyBwYXlsb2FkIDogJycpXG4gICAgaG9zdC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudChldmVudCwge1xuICAgICAgZGV0YWlsOiB7IHBheWxvYWQgfSxcbiAgICAgIGJ1YmJsZXM6IGZhbHNlLFxuICAgICAgY29tcG9zZWQ6IGZhbHNlLFxuICAgIH0pKVxuICB9XG5cbiAgY29uc3QgYnJvYWRjYXN0ID0gKGV2ZW50OiBzdHJpbmcsIHBheWxvYWQ6IHVua25vd25bXSkgPT4ge1xuICAgIGNvbnNvbGUubG9nKGBbTEVTXSBicm9hZGNhc3QgXCIke2V2ZW50fVwiYCwgcGF5bG9hZC5sZW5ndGggPyBwYXlsb2FkIDogJycpXG4gICAgaG9zdC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudChldmVudCwge1xuICAgICAgZGV0YWlsOiB7IHBheWxvYWQgfSxcbiAgICAgIGJ1YmJsZXM6IHRydWUsXG4gICAgICBjb21wb3NlZDogdHJ1ZSxcbiAgICB9KSlcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc2NvcGUsXG4gICAgaG9zdCxcbiAgICBjb21tYW5kcyxcbiAgICBtb2R1bGVzLFxuICAgIGdldFNpZ25hbDogc2lnbmFscy5nZXQsXG4gICAgc2V0U2lnbmFsOiBzaWduYWxzLnNldCxcbiAgICBlbWl0TG9jYWwsXG4gICAgYnJvYWRjYXN0LFxuICB9XG59XG5cbi8qKlxuICogUmVnaXN0ZXJzIGFsbCBwYXJzZWQgY29tbWFuZHMgaW50byB0aGUgcmVnaXN0cnkuXG4gKiBDYWxsZWQgb25jZSBkdXJpbmcgX2luaXQsIGJlZm9yZSBhbnkgZXZlbnRzIGFyZSB3aXJlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyQ29tbWFuZHMoXG4gIHdpcmluZzogUGFyc2VkV2lyaW5nLFxuICByZWdpc3RyeTogQ29tbWFuZFJlZ2lzdHJ5XG4pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBjbWQgb2Ygd2lyaW5nLmNvbW1hbmRzKSB7XG4gICAgLy8gUGFyc2UgYXJnc1JhdyBpbnRvIEFyZ0RlZltdIChzaW1wbGlmaWVkIFx1MjAxNCBmdWxsIGFyZyBwYXJzaW5nIGluIFBoYXNlIDIgcmVmaW5lbWVudClcbiAgICBjb25zdCBhcmdzID0gcGFyc2VBcmdzUmF3KGNtZC5hcmdzUmF3KVxuICAgIGNvbnN0IGRlZjogaW1wb3J0KCcuL3JlZ2lzdHJ5LmpzJykuQ29tbWFuZERlZiA9IHtcbiAgICAgIG5hbWU6IGNtZC5uYW1lLFxuICAgICAgYXJncyxcbiAgICAgIGJvZHk6IGNtZC5ib2R5LFxuICAgICAgZWxlbWVudDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbG9jYWwtY29tbWFuZCcpLFxuICAgIH1cbiAgICBpZiAoY21kLmd1YXJkKSBkZWYuZ3VhcmQgPSBjbWQuZ3VhcmRcbiAgICByZWdpc3RyeS5yZWdpc3RlcihkZWYpXG4gIH1cbiAgY29uc29sZS5sb2coYFtMRVNdIHJlZ2lzdGVyZWQgJHt3aXJpbmcuY29tbWFuZHMubGVuZ3RofSBjb21tYW5kc2ApXG59XG5cbi8qKlxuICogQXR0YWNoZXMgZXZlbnQgbGlzdGVuZXJzIG9uIHRoZSBob3N0IGZvciBhbGwgPG9uLWV2ZW50PiBoYW5kbGVycy5cbiAqIFJldHVybnMgYSBjbGVhbnVwIGZ1bmN0aW9uIHRoYXQgcmVtb3ZlcyBhbGwgbGlzdGVuZXJzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2lyZUV2ZW50SGFuZGxlcnMoXG4gIHdpcmluZzogUGFyc2VkV2lyaW5nLFxuICBob3N0OiBFbGVtZW50LFxuICBnZXRDdHg6ICgpID0+IGltcG9ydCgnLi9leGVjdXRvci5qcycpLkxFU0NvbnRleHRcbik6ICgpID0+IHZvaWQge1xuICBjb25zdCBjbGVhbnVwczogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXVxuXG4gIGZvciAoY29uc3QgaGFuZGxlciBvZiB3aXJpbmcuaGFuZGxlcnMpIHtcbiAgICBjb25zdCBsaXN0ZW5lciA9IChlOiBFdmVudCkgPT4ge1xuICAgICAgY29uc3QgY3R4ID0gZ2V0Q3R4KClcbiAgICAgIC8vIEV4cG9zZSBldmVudCBkZXRhaWwgaW4gc2NvcGVcbiAgICAgIGNvbnN0IGhhbmRsZXJTY29wZSA9IGN0eC5zY29wZS5jaGlsZCgpXG4gICAgICBjb25zdCBkZXRhaWwgPSAoZSBhcyBDdXN0b21FdmVudCkuZGV0YWlsID8/IHt9XG4gICAgICBoYW5kbGVyU2NvcGUuc2V0KCdldmVudCcsIGUpXG4gICAgICBoYW5kbGVyU2NvcGUuc2V0KCdwYXlsb2FkJywgZGV0YWlsLnBheWxvYWQgPz8gW10pXG4gICAgICBjb25zdCBoYW5kbGVyQ3R4ID0geyAuLi5jdHgsIHNjb3BlOiBoYW5kbGVyU2NvcGUgfVxuXG4gICAgICBleGVjdXRlKGhhbmRsZXIuYm9keSwgaGFuZGxlckN0eCkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgW0xFU10gRXJyb3IgaW4gaGFuZGxlciBmb3IgXCIke2hhbmRsZXIuZXZlbnR9XCI6YCwgZXJyKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBob3N0LmFkZEV2ZW50TGlzdGVuZXIoaGFuZGxlci5ldmVudCwgbGlzdGVuZXIpXG4gICAgY2xlYW51cHMucHVzaCgoKSA9PiBob3N0LnJlbW92ZUV2ZW50TGlzdGVuZXIoaGFuZGxlci5ldmVudCwgbGlzdGVuZXIpKVxuICAgIGNvbnNvbGUubG9nKGBbTEVTXSB3aXJlZCBldmVudCBoYW5kbGVyOiBcIiR7aGFuZGxlci5ldmVudH1cImApXG4gIH1cblxuICByZXR1cm4gKCkgPT4gY2xlYW51cHMuZm9yRWFjaChmbiA9PiBmbigpKVxufVxuXG4vKipcbiAqIEZpcmVzIGFsbCA8b24tbG9hZD4gYm9kaWVzLlxuICogQ2FsbGVkIGFmdGVyIGNvbW1hbmRzIGFyZSByZWdpc3RlcmVkIGFuZCBldmVudCBoYW5kbGVycyBhcmUgd2lyZWQsXG4gKiBzbyBlbWl0L2NhbGwgc3RhdGVtZW50cyBpbiBvbi1sb2FkIGNhbiByZWFjaCB0aGVpciB0YXJnZXRzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmlyZU9uTG9hZChcbiAgd2lyaW5nOiBQYXJzZWRXaXJpbmcsXG4gIGdldEN0eDogKCkgPT4gaW1wb3J0KCcuL2V4ZWN1dG9yLmpzJykuTEVTQ29udGV4dFxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGZvciAoY29uc3QgYm9keSBvZiB3aXJpbmcubGlmZWN5Y2xlLm9uTG9hZCkge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBleGVjdXRlKGJvZHksIGdldEN0eCgpKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcignW0xFU10gRXJyb3IgaW4gb24tbG9hZDonLCBlcnIpXG4gICAgfVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gQXJnIHBhcnNpbmcgKHNpbXBsaWZpZWQgXHUyMDE0IGZ1bGwgdHlwZS1jaGVja2VkIHZlcnNpb24gaW4gUGhhc2UgMiByZWZpbmVtZW50KVxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmltcG9ydCB0eXBlIHsgQXJnRGVmIH0gZnJvbSAnLi9yZWdpc3RyeS5qcydcbmltcG9ydCB0eXBlIHsgRXhwck5vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuZnVuY3Rpb24gcGFyc2VBcmdzUmF3KHJhdzogc3RyaW5nKTogQXJnRGVmW10ge1xuICBpZiAoIXJhdy50cmltKCkpIHJldHVybiBbXVxuICAvLyBTdHJpcCBvdXRlciBicmFja2V0czogXCJbZnJvbTpzdHIgIHRvOnN0ciAgYXR0ZW1wdDppbnQ9MF1cIiBcdTIxOTIgXCJmcm9tOnN0ciAgdG86c3RyICBhdHRlbXB0OmludD0wXCJcbiAgY29uc3QgaW5uZXIgPSByYXcucmVwbGFjZSgvXlxcW3xcXF0kL2csICcnKS50cmltKClcbiAgaWYgKCFpbm5lcikgcmV0dXJuIFtdXG5cbiAgcmV0dXJuIGlubmVyLnNwbGl0KC9cXHN7Mix9fFxccyg/PVxcdys6KS8pLm1hcChzID0+IHMudHJpbSgpKS5maWx0ZXIoQm9vbGVhbikubWFwKHBhcnQgPT4ge1xuICAgIC8vIGBuYW1lOnR5cGU9ZGVmYXVsdGAgb3IgYG5hbWU6dHlwZWBcbiAgICBjb25zdCBlcUlkeCA9IHBhcnQuaW5kZXhPZignPScpXG4gICAgY29uc3QgY29sb25JZHggPSBwYXJ0LmluZGV4T2YoJzonKVxuICAgIGlmIChjb2xvbklkeCA9PT0gLTEpIHJldHVybiB7IG5hbWU6IHBhcnQsIHR5cGU6ICdkeW4nIH1cblxuICAgIGNvbnN0IG5hbWUgPSBwYXJ0LnNsaWNlKDAsIGNvbG9uSWR4KS50cmltKClcbiAgICBjb25zdCByZXN0ID0gcGFydC5zbGljZShjb2xvbklkeCArIDEpXG5cbiAgICBpZiAoZXFJZHggPT09IC0xKSB7XG4gICAgICByZXR1cm4geyBuYW1lLCB0eXBlOiByZXN0LnRyaW0oKSB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHR5cGUgPSBwYXJ0LnNsaWNlKGNvbG9uSWR4ICsgMSwgZXFJZHgpLnRyaW0oKVxuICAgICAgY29uc3QgZGVmYXVsdFJhdyA9IHBhcnQuc2xpY2UoZXFJZHggKyAxKS50cmltKClcbiAgICAgIGNvbnN0IGRlZmF1bHRFeHByOiBFeHByTm9kZSA9IHsgdHlwZTogJ2V4cHInLCByYXc6IGRlZmF1bHRSYXcgfVxuICAgICAgcmV0dXJuIHsgbmFtZSwgdHlwZSwgZGVmYXVsdDogZGVmYXVsdEV4cHIgfVxuICAgIH1cbiAgfSlcbn1cbiIsICIvKipcbiAqIExFU1Njb3BlIFx1MjAxNCBhIHNpbXBsZSBsZXhpY2FsbHktc2NvcGVkIHZhcmlhYmxlIHN0b3JlLlxuICpcbiAqIEVhY2ggY29tbWFuZCBpbnZvY2F0aW9uIGdldHMgYSBmcmVzaCBjaGlsZCBzY29wZS5cbiAqIE1hdGNoIGFybSBiaW5kaW5ncyBhbHNvIGNyZWF0ZSBhIGNoaWxkIHNjb3BlIGxpbWl0ZWQgdG8gdGhhdCBhcm0ncyBib2R5LlxuICogU2lnbmFsIHJlYWRzL3dyaXRlcyBnbyB0aHJvdWdoIHRoZSBEYXRhc3RhciBicmlkZ2UsIG5vdCB0aGlzIHNjb3BlLlxuICovXG5leHBvcnQgY2xhc3MgTEVTU2NvcGUge1xuICBwcml2YXRlIGxvY2FscyA9IG5ldyBNYXA8c3RyaW5nLCB1bmtub3duPigpXG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwYXJlbnQ/OiBMRVNTY29wZSkge31cblxuICBnZXQobmFtZTogc3RyaW5nKTogdW5rbm93biB7XG4gICAgaWYgKHRoaXMubG9jYWxzLmhhcyhuYW1lKSkgcmV0dXJuIHRoaXMubG9jYWxzLmdldChuYW1lKVxuICAgIHJldHVybiB0aGlzLnBhcmVudD8uZ2V0KG5hbWUpXG4gIH1cblxuICBzZXQobmFtZTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIHRoaXMubG9jYWxzLnNldChuYW1lLCB2YWx1ZSlcbiAgfVxuXG4gIGhhcyhuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5sb2NhbHMuaGFzKG5hbWUpIHx8ICh0aGlzLnBhcmVudD8uaGFzKG5hbWUpID8/IGZhbHNlKVxuICB9XG5cbiAgLyoqIENyZWF0ZSBhIGNoaWxkIHNjb3BlIGluaGVyaXRpbmcgYWxsIGxvY2FscyBmcm9tIHRoaXMgb25lLiAqL1xuICBjaGlsZCgpOiBMRVNTY29wZSB7XG4gICAgcmV0dXJuIG5ldyBMRVNTY29wZSh0aGlzKVxuICB9XG5cbiAgLyoqIFNuYXBzaG90IGFsbCBsb2NhbHMgKGZvciBkZWJ1Z2dpbmcgLyBlcnJvciBtZXNzYWdlcykuICovXG4gIHNuYXBzaG90KCk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcbiAgICBjb25zdCBiYXNlID0gdGhpcy5wYXJlbnQ/LnNuYXBzaG90KCkgPz8ge31cbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiB0aGlzLmxvY2FscykgYmFzZVtrXSA9IHZcbiAgICByZXR1cm4gYmFzZVxuICB9XG59XG4iLCAiaW1wb3J0IHsgQ29tbWFuZFJlZ2lzdHJ5IH0gZnJvbSAnQHJ1bnRpbWUvcmVnaXN0cnkuanMnXG5pbXBvcnQgeyBNb2R1bGVSZWdpc3RyeSwgbG9hZE1vZHVsZSB9IGZyb20gJ0Btb2R1bGVzL3R5cGVzLmpzJ1xuaW1wb3J0IHsgcmVhZENvbmZpZywgbG9nQ29uZmlnIH0gZnJvbSAnQHBhcnNlci9yZWFkZXIuanMnXG5pbXBvcnQgeyBwYXJzZUxFUyB9IGZyb20gJ0BwYXJzZXIvaW5kZXguanMnXG5pbXBvcnQgeyBidWlsZENvbnRleHQgfSBmcm9tICdAcnVudGltZS93aXJpbmcuanMnXG5pbXBvcnQge1xuICByZWdpc3RlckNvbW1hbmRzLCB3aXJlRXZlbnRIYW5kbGVycywgZmlyZU9uTG9hZCxcbiAgdHlwZSBQYXJzZWRXaXJpbmcsXG59IGZyb20gJ0BydW50aW1lL3dpcmluZy5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29uZmlnIH0gZnJvbSAnQHBhcnNlci9jb25maWcuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29udGV4dCB9IGZyb20gJ0BydW50aW1lL2V4ZWN1dG9yLmpzJ1xuXG5leHBvcnQgY2xhc3MgTG9jYWxFdmVudFNjcmlwdCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgcmVhZG9ubHkgY29tbWFuZHMgPSBuZXcgQ29tbWFuZFJlZ2lzdHJ5KClcbiAgcmVhZG9ubHkgbW9kdWxlcyAgPSBuZXcgTW9kdWxlUmVnaXN0cnkoKVxuXG4gIHByaXZhdGUgX2NvbmZpZzogIExFU0NvbmZpZyB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgX3dpcmluZzogIFBhcnNlZFdpcmluZyB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgX2N0eDogICAgIExFU0NvbnRleHQgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIF9jbGVhbnVwOiAoKCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbFxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBTaW1wbGUgZmFsbGJhY2sgc2lnbmFsIHN0b3JlIChyZXBsYWNlZCBieSBEYXRhc3RhciBicmlkZ2UgaW4gUGhhc2UgNikgXHUyNTAwXG4gIHByaXZhdGUgX3NpZ25hbHM6IE1hcDxzdHJpbmcsIHVua25vd24+ID0gbmV3IE1hcCgpXG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIERhdGFzdGFyIGJyaWRnZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgcHJpdmF0ZSBfZHNFZmZlY3Q6ICgoZm46ICgpID0+IHZvaWQpID0+IHZvaWQpIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG4gIHByaXZhdGUgX2RzU2lnbmFsOiAoPFQ+KG5hbWU6IHN0cmluZywgaW5pdD86IFQpID0+IHsgdmFsdWU6IFQgfSkgfCB1bmRlZmluZWQgPSB1bmRlZmluZWRcblxuICBnZXQgY29uZmlnKCk6ICBMRVNDb25maWcgfCBudWxsICB7IHJldHVybiB0aGlzLl9jb25maWcgfVxuICBnZXQgd2lyaW5nKCk6ICBQYXJzZWRXaXJpbmcgfCBudWxsIHsgcmV0dXJuIHRoaXMuX3dpcmluZyB9XG4gIGdldCBjb250ZXh0KCk6IExFU0NvbnRleHQgfCBudWxsIHsgcmV0dXJuIHRoaXMuX2N0eCB9XG5cbiAgc3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMoKTogc3RyaW5nW10geyByZXR1cm4gW10gfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIHF1ZXVlTWljcm90YXNrKCgpID0+IHRoaXMuX2luaXQoKSlcbiAgfVxuXG4gIGRpc2Nvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIHRoaXMuX3RlYXJkb3duKClcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBJbnRlcm5hbCBsaWZlY3ljbGUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBhc3luYyBfaW5pdCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPGxvY2FsLWV2ZW50LXNjcmlwdD4gaW5pdGlhbGl6aW5nJywgdGhpcy5pZCB8fCAnKG5vIGlkKScpXG5cbiAgICAvLyBQaGFzZSAxOiBET00gXHUyMTkyIGNvbmZpZ1xuICAgIHRoaXMuX2NvbmZpZyA9IHJlYWRDb25maWcodGhpcylcbiAgICBsb2dDb25maWcodGhpcy5fY29uZmlnKVxuXG4gICAgLy8gUGhhc2UgODogbG9hZCBtb2R1bGVzIChkbyB0aGlzIGJlZm9yZSBwYXJzaW5nIHNvIHByaW1pdGl2ZSBuYW1lcyByZXNvbHZlKVxuICAgIGF3YWl0IHRoaXMuX2xvYWRNb2R1bGVzKHRoaXMuX2NvbmZpZylcblxuICAgIC8vIFBoYXNlIDI6IHBhcnNlIGJvZHkgc3RyaW5ncyBcdTIxOTIgQVNUXG4gICAgdGhpcy5fd2lyaW5nID0gdGhpcy5fcGFyc2VBbGwodGhpcy5fY29uZmlnKVxuXG4gICAgLy8gUGhhc2UgNDogYnVpbGQgY29udGV4dCArIHJlZ2lzdGVyIGNvbW1hbmRzICsgd2lyZSBldmVudCBoYW5kbGVyc1xuICAgIHRoaXMuX2N0eCA9IGJ1aWxkQ29udGV4dChcbiAgICAgIHRoaXMsXG4gICAgICB0aGlzLmNvbW1hbmRzLFxuICAgICAgdGhpcy5tb2R1bGVzLFxuICAgICAge1xuICAgICAgICBnZXQ6IChrKSA9PiB0aGlzLl9nZXRTaWduYWwoayksXG4gICAgICAgIHNldDogKGssIHYpID0+IHRoaXMuX3NldFNpZ25hbChrLCB2KSxcbiAgICAgIH1cbiAgICApXG5cbiAgICByZWdpc3RlckNvbW1hbmRzKHRoaXMuX3dpcmluZywgdGhpcy5jb21tYW5kcylcblxuICAgIHRoaXMuX2NsZWFudXAgPSB3aXJlRXZlbnRIYW5kbGVycyhcbiAgICAgIHRoaXMuX3dpcmluZyxcbiAgICAgIHRoaXMsXG4gICAgICAoKSA9PiB0aGlzLl9jdHghXG4gICAgKVxuXG4gICAgLy8gUGhhc2UgNTogSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgKG9uLWVudGVyIC8gb24tZXhpdCkgXHUyMDE0IGNvbWluZyBuZXh0XG4gICAgLy8gUGhhc2UgNjogRGF0YXN0YXIgc2lnbmFsIHdhdGNoZXJzIChvbi1zaWduYWwpIFx1MjAxNCBjb21pbmcgYWZ0ZXIgSU9cblxuICAgIC8vIEZpcmUgb24tbG9hZCBsYXN0IFx1MjAxNCBldmVyeXRoaW5nIGVsc2UgbXVzdCBiZSB3aXJlZCBmaXJzdFxuICAgIGF3YWl0IGZpcmVPbkxvYWQodGhpcy5fd2lyaW5nLCAoKSA9PiB0aGlzLl9jdHghKVxuXG4gICAgY29uc29sZS5sb2coJ1tMRVNdIHJlYWR5OicsIHRoaXMuaWQgfHwgJyhubyBpZCknKVxuICB9XG5cbiAgcHJpdmF0ZSBfdGVhcmRvd24oKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGRpc2Nvbm5lY3RlZCcsIHRoaXMuaWQgfHwgJyhubyBpZCknKVxuICAgIHRoaXMuX2NsZWFudXA/LigpXG4gICAgdGhpcy5fY2xlYW51cCA9IG51bGxcbiAgICB0aGlzLl9jb25maWcgID0gbnVsbFxuICAgIHRoaXMuX3dpcmluZyAgPSBudWxsXG4gICAgdGhpcy5fY3R4ICAgICA9IG51bGxcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBTaWduYWwgc3RvcmUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBfZ2V0U2lnbmFsKG5hbWU6IHN0cmluZyk6IHVua25vd24ge1xuICAgIC8vIFBoYXNlIDY6IGlmIERhdGFzdGFyIGlzIGNvbm5lY3RlZCwgcmVhZCBmcm9tIGl0cyBzaWduYWwgc3RvcmVcbiAgICBpZiAodGhpcy5fZHNTaWduYWwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kc1NpZ25hbChuYW1lKS52YWx1ZVxuICAgICAgfSBjYXRjaCB7IC8qIGZhbGwgdGhyb3VnaCB0byBsb2NhbCBzdG9yZSAqLyB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9zaWduYWxzLmdldChuYW1lKVxuICB9XG5cbiAgcHJpdmF0ZSBfc2V0U2lnbmFsKG5hbWU6IHN0cmluZywgdmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICBjb25zdCBwcmV2ID0gdGhpcy5fc2lnbmFscy5nZXQobmFtZSlcbiAgICB0aGlzLl9zaWduYWxzLnNldChuYW1lLCB2YWx1ZSlcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gJCR7bmFtZX0gPWAsIHZhbHVlKVxuICAgIC8vIFBoYXNlIDY6IHByb3BhZ2F0ZSB0byBEYXRhc3RhciBzaWduYWwgdHJlZVxuICAgIC8vIFBoYXNlIDU6IG5vdGlmeSBvbi1zaWduYWwgd2F0Y2hlcnNcbiAgICBpZiAocHJldiAhPT0gdmFsdWUpIHtcbiAgICAgIHRoaXMuX25vdGlmeVNpZ25hbFdhdGNoZXJzKG5hbWUsIHZhbHVlKVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX25vdGlmeVNpZ25hbFdhdGNoZXJzKG5hbWU6IHN0cmluZywgX3ZhbHVlOiB1bmtub3duKTogdm9pZCB7XG4gICAgLy8gUGhhc2UgNTogY2hlY2sgZWFjaCBvbi1zaWduYWwgd2F0Y2hlcidzIHdoZW4gZ3VhcmQgYW5kIGV4ZWN1dGUgaWYgaXQgcGFzc2VzXG4gICAgLy8gU3R1YmJlZCBoZXJlIFx1MjAxNCBQaGFzZSA1IGZpbGxzIHRoaXMgaW5cbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBNb2R1bGUgbG9hZGluZyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwcml2YXRlIGFzeW5jIF9sb2FkTW9kdWxlcyhjb25maWc6IExFU0NvbmZpZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IG1vZHVsZURlY2xzID0gY29uZmlnLm1vZHVsZXNcbiAgICBpZiAobW9kdWxlRGVjbHMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgbW9kdWxlRGVjbHMubWFwKGRlY2wgPT5cbiAgICAgICAgbG9hZE1vZHVsZSh0aGlzLm1vZHVsZXMsIHtcbiAgICAgICAgICAuLi4oZGVjbC50eXBlID8geyB0eXBlOiBkZWNsLnR5cGUgfSA6IHt9KSxcbiAgICAgICAgICAuLi4oZGVjbC5zcmMgID8geyBzcmM6ICBkZWNsLnNyYyAgfSA6IHt9KSxcbiAgICAgICAgfSkuY2F0Y2goZXJyID0+IGNvbnNvbGUud2FybignW0xFU10gTW9kdWxlIGxvYWQgZmFpbGVkOicsIGVycikpXG4gICAgICApXG4gICAgKVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFBhcnNlIGFsbCBib2RpZXMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBfcGFyc2VBbGwoY29uZmlnOiBMRVNDb25maWcpOiBQYXJzZWRXaXJpbmcge1xuICAgIGxldCBvayA9IDAsIGZhaWwgPSAwXG5cbiAgICBjb25zdCB0cnlQYXJzZSA9IChib2R5OiBzdHJpbmcsIGxhYmVsOiBzdHJpbmcpOiBMRVNOb2RlID0+IHtcbiAgICAgIHRyeSB7IG9rKys7IHJldHVybiBwYXJzZUxFUyhib2R5KSB9XG4gICAgICBjYXRjaCAoZSkgeyBmYWlsKys7IGNvbnNvbGUuZXJyb3IoYFtMRVNdIFBhcnNlIGVycm9yIGluICR7bGFiZWx9OmAsIGUpOyByZXR1cm4geyB0eXBlOiAnZXhwcicsIHJhdzogJycgfSB9XG4gICAgfVxuXG4gICAgY29uc3Qgd2lyaW5nOiBQYXJzZWRXaXJpbmcgPSB7XG4gICAgICBjb21tYW5kczogY29uZmlnLmNvbW1hbmRzLm1hcChkID0+ICh7XG4gICAgICAgIG5hbWU6IGQubmFtZSwgZ3VhcmQ6IGQuZ3VhcmQsIGFyZ3NSYXc6IGQuYXJnc1JhdyxcbiAgICAgICAgYm9keTogdHJ5UGFyc2UoZC5ib2R5LCBgY29tbWFuZCBcIiR7ZC5uYW1lfVwiYCksXG4gICAgICB9KSksXG4gICAgICBoYW5kbGVyczogY29uZmlnLm9uRXZlbnQubWFwKGQgPT4gKHtcbiAgICAgICAgZXZlbnQ6IGQubmFtZSxcbiAgICAgICAgYm9keTogdHJ5UGFyc2UoZC5ib2R5LCBgb24tZXZlbnQgXCIke2QubmFtZX1cImApLFxuICAgICAgfSkpLFxuICAgICAgd2F0Y2hlcnM6IGNvbmZpZy5vblNpZ25hbC5tYXAoZCA9PiAoe1xuICAgICAgICBzaWduYWw6IGQubmFtZSwgd2hlbjogZC53aGVuLFxuICAgICAgICBib2R5OiB0cnlQYXJzZShkLmJvZHksIGBvbi1zaWduYWwgXCIke2QubmFtZX1cImApLFxuICAgICAgfSkpLFxuICAgICAgbGlmZWN5Y2xlOiB7XG4gICAgICAgIG9uTG9hZDogIGNvbmZpZy5vbkxvYWQubWFwKGQgPT4gdHJ5UGFyc2UoZC5ib2R5LCAnb24tbG9hZCcpKSxcbiAgICAgICAgb25FbnRlcjogY29uZmlnLm9uRW50ZXIubWFwKGQgPT4gKHsgd2hlbjogZC53aGVuLCBib2R5OiB0cnlQYXJzZShkLmJvZHksICdvbi1lbnRlcicpIH0pKSxcbiAgICAgICAgb25FeGl0OiAgY29uZmlnLm9uRXhpdC5tYXAoZCA9PiB0cnlQYXJzZShkLmJvZHksICdvbi1leGl0JykpLFxuICAgICAgfSxcbiAgICB9XG5cbiAgICBjb25zdCB0b3RhbCA9IG9rICsgZmFpbFxuICAgIGNvbnNvbGUubG9nKGBbTEVTXSBwYXJzZXI6ICR7b2t9LyR7dG90YWx9IGJvZGllcyBwYXJzZWQgc3VjY2Vzc2Z1bGx5JHtmYWlsID4gMCA/IGAgKCR7ZmFpbH0gZXJyb3JzKWAgOiAnJ31gKVxuICAgIHJldHVybiB3aXJpbmdcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBEYXRhc3RhciBicmlkZ2UgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgY29ubmVjdERhdGFzdGFyKGZuczoge1xuICAgIGVmZmVjdDogKGZuOiAoKSA9PiB2b2lkKSA9PiB2b2lkXG4gICAgc2lnbmFsOiA8VD4obmFtZTogc3RyaW5nLCBpbml0PzogVCkgPT4geyB2YWx1ZTogVCB9XG4gIH0pOiB2b2lkIHtcbiAgICB0aGlzLl9kc0VmZmVjdCA9IGZucy5lZmZlY3RcbiAgICB0aGlzLl9kc1NpZ25hbCA9IGZucy5zaWduYWxcbiAgICBjb25zb2xlLmxvZygnW0xFU10gRGF0YXN0YXIgYnJpZGdlIGNvbm5lY3RlZCcsIHRoaXMuaWQpXG4gIH1cblxuICBkaXNjb25uZWN0RGF0YXN0YXIoKTogdm9pZCB7XG4gICAgdGhpcy5fZHNFZmZlY3QgPSB1bmRlZmluZWRcbiAgICB0aGlzLl9kc1NpZ25hbCA9IHVuZGVmaW5lZFxuICB9XG5cbiAgZ2V0IGRzRWZmZWN0KCkgeyByZXR1cm4gdGhpcy5fZHNFZmZlY3QgfVxuICBnZXQgZHNTaWduYWwoKSAgeyByZXR1cm4gdGhpcy5fZHNTaWduYWwgfVxuXG4gIC8qKiBQdWJsaWMgQVBJOiBmaXJlIGEgbmFtZWQgZXZlbnQgaW50byB0aGlzIExFUyBpbnN0YW5jZSBmcm9tIG91dHNpZGUgKi9cbiAgZmlyZShldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10gPSBbXSk6IHZvaWQge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoZXZlbnQsIHtcbiAgICAgIGRldGFpbDogeyBwYXlsb2FkIH0sIGJ1YmJsZXM6IGZhbHNlLCBjb21wb3NlZDogZmFsc2UsXG4gICAgfSkpXG4gIH1cblxuICAvKiogUHVibGljIEFQSTogY2FsbCBhIGNvbW1hbmQgZnJvbSBvdXRzaWRlIChlLmcuIGZyb20gYnJvd3NlciBjb25zb2xlKSAqL1xuICBhc3luYyBjYWxsKGNvbW1hbmQ6IHN0cmluZywgYXJnczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5fY3R4KSB7IGNvbnNvbGUud2FybignW0xFU10gbm90IGluaXRpYWxpemVkIHlldCcpOyByZXR1cm4gfVxuICAgIGNvbnN0IHsgcnVuQ29tbWFuZCB9ID0gYXdhaXQgaW1wb3J0KCdAcnVudGltZS9leGVjdXRvci5qcycpXG4gICAgYXdhaXQgcnVuQ29tbWFuZChjb21tYW5kLCBhcmdzLCB0aGlzLl9jdHgpXG4gIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdsb2NhbC1ldmVudC1zY3JpcHQnLCBMb2NhbEV2ZW50U2NyaXB0KVxuIiwgIi8qKlxuICogPGxvY2FsLWNvbW1hbmQ+IFx1MjAxNCBkZWZpbmVzIGEgbmFtZWQsIGNhbGxhYmxlIGNvbW1hbmQgd2l0aGluIGEgPGxvY2FsLWV2ZW50LXNjcmlwdD4uXG4gKlxuICogQXR0cmlidXRlczpcbiAqICAgbmFtZSAgICBSZXF1aXJlZC4gQ29tbWFuZCBuYW1lLCBjb2xvbi1uYW1lc3BhY2VkOiBcImZlZWQ6ZmV0Y2hcIlxuICogICBhcmdzICAgIE9wdGlvbmFsLiBUeXBlZCBhcmd1bWVudCBsaXN0OiBcIltmcm9tOnN0ciAgdG86c3RyXVwiXG4gKiAgIGd1YXJkICAgT3B0aW9uYWwuIEpTIGV4cHJlc3Npb24gXHUyMDE0IGZhbHN5ID0gc2lsZW50IG5vLW9wLCBubyByZXNjdWUvYWZ0ZXJ3YXJkc1xuICogICBkbyAgICAgIFJlcXVpcmVkLiBMRVMgYm9keSAoYmFja3RpY2stcXVvdGVkIGZvciBtdWx0aS1saW5lKVxuICpcbiAqIFRoaXMgZWxlbWVudCBpcyBwdXJlbHkgZGVjbGFyYXRpdmUgXHUyMDE0IGl0IGhvbGRzIGRhdGEuXG4gKiBUaGUgaG9zdCA8bG9jYWwtZXZlbnQtc2NyaXB0PiByZWFkcyBpdCBkdXJpbmcgUGhhc2UgMSBhbmQgcmVnaXN0ZXJzXG4gKiB0aGUgcGFyc2VkIENvbW1hbmREZWYgaW4gaXRzIENvbW1hbmRSZWdpc3RyeS5cbiAqXG4gKiBOb3RlOiA8Y29tbWFuZD4gd2FzIGEgZGVwcmVjYXRlZCBIVE1MNSBlbGVtZW50IFx1MjAxNCB3ZSB1c2UgPGxvY2FsLWNvbW1hbmQ+XG4gKiB0byBzYXRpc2Z5IHRoZSBjdXN0b20gZWxlbWVudCBoeXBoZW4gcmVxdWlyZW1lbnQgYW5kIGF2b2lkIHRoZSBjb2xsaXNpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2NhbENvbW1hbmQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBBdHRyaWJ1dGUgYWNjZXNzb3JzICh0eXBlZCwgdHJpbW1lZCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgZ2V0IGNvbW1hbmROYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCduYW1lJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgLyoqIFJhdyBhcmdzIHN0cmluZyBlLmcuIFwiW2Zyb206c3RyICB0bzpzdHJdXCIgXHUyMDE0IHBhcnNlZCBieSBQaGFzZSAyICovXG4gIGdldCBhcmdzUmF3KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdhcmdzJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgLyoqIEd1YXJkIGV4cHJlc3Npb24gc3RyaW5nIFx1MjAxNCBldmFsdWF0ZWQgYnkgcnVudGltZSBiZWZvcmUgZXhlY3V0aW9uICovXG4gIGdldCBndWFyZEV4cHIoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdndWFyZCcpPy50cmltKCkgPz8gbnVsbFxuICB9XG5cbiAgLyoqIFJhdyBMRVMgYm9keSBcdTIwMTQgbWF5IGJlIGJhY2t0aWNrLXdyYXBwZWQgZm9yIG11bHRpLWxpbmUgKi9cbiAgZ2V0IGRvQm9keSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnZG8nKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICAvLyBQaGFzZSAwOiB2ZXJpZnkgZWxlbWVudCBpcyByZWNvZ25pemVkLlxuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8bG9jYWwtY29tbWFuZD4gcmVnaXN0ZXJlZDonLCB0aGlzLmNvbW1hbmROYW1lIHx8ICcodW5uYW1lZCknKVxuICB9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnbG9jYWwtY29tbWFuZCcsIExvY2FsQ29tbWFuZClcbiIsICIvKipcbiAqIDxvbi1ldmVudD4gXHUyMDE0IHN1YnNjcmliZXMgdG8gYSBuYW1lZCBDdXN0b21FdmVudCBkaXNwYXRjaGVkIHdpdGhpbiB0aGUgTEVTIGhvc3QuXG4gKlxuICogQXR0cmlidXRlczpcbiAqICAgbmFtZSAgICBSZXF1aXJlZC4gRXZlbnQgbmFtZTogXCJmZWVkOmluaXRcIiwgXCJpdGVtOmRpc21pc3NlZFwiXG4gKiAgIGhhbmRsZSAgUmVxdWlyZWQuIExFUyBib2R5IFx1MjAxNCBzaW5nbGUtbGluZSAobm8gYmFja3RpY2tzKSBvciBtdWx0aS1saW5lIChiYWNrdGlja3MpXG4gKlxuICogUGhhc2UgNCB3aXJlcyBhIEN1c3RvbUV2ZW50IGxpc3RlbmVyIG9uIHRoZSBob3N0IGVsZW1lbnQuXG4gKiBFdmVudHMgZmlyZWQgYnkgYGVtaXRgIG5ldmVyIGJ1YmJsZTsgb25seSBoYW5kbGVycyB3aXRoaW4gdGhlIHNhbWVcbiAqIDxsb2NhbC1ldmVudC1zY3JpcHQ+IHNlZSB0aGVtLiBVc2UgYGJyb2FkY2FzdGAgdG8gY3Jvc3MgdGhlIGJvdW5kYXJ5LlxuICovXG5leHBvcnQgY2xhc3MgT25FdmVudCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgZ2V0IGV2ZW50TmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIC8qKiBSYXcgTEVTIGhhbmRsZSBib2R5ICovXG4gIGdldCBoYW5kbGVCb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdoYW5kbGUnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPG9uLWV2ZW50PiByZWdpc3RlcmVkOicsIHRoaXMuZXZlbnROYW1lIHx8ICcodW5uYW1lZCknKVxuICB9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnb24tZXZlbnQnLCBPbkV2ZW50KVxuIiwgIi8qKlxuICogPG9uLXNpZ25hbD4gXHUyMDE0IHJlYWN0cyB3aGVuZXZlciBhIG5hbWVkIERhdGFzdGFyIHNpZ25hbCBjaGFuZ2VzIHZhbHVlLlxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIG5hbWUgICAgUmVxdWlyZWQuIFNpZ25hbCByZWZlcmVuY2U6IFwiJGZlZWRTdGF0ZVwiLCBcIiRmZWVkSXRlbXNcIlxuICogICB3aGVuICAgIE9wdGlvbmFsLiBHdWFyZCBleHByZXNzaW9uIFx1MjAxNCBvbmx5IGZpcmVzIGhhbmRsZSB3aGVuIHRydXRoeVxuICogICBoYW5kbGUgIFJlcXVpcmVkLiBMRVMgYm9keVxuICpcbiAqIFBoYXNlIDYgd2lyZXMgdGhpcyB0byBEYXRhc3RhcidzIGVmZmVjdCgpIHN5c3RlbS5cbiAqIFVudGlsIERhdGFzdGFyIGlzIGNvbm5lY3RlZCwgZmFsbHMgYmFjayB0byBwb2xsaW5nIChQaGFzZSA2IGRlY2lkZXMpLlxuICpcbiAqIFRoZSBgd2hlbmAgZ3VhcmQgaXMgcmUtZXZhbHVhdGVkIG9uIGV2ZXJ5IHNpZ25hbCBjaGFuZ2UuXG4gKiBHdWFyZCBmYWlsdXJlIGlzIG5vdCBhbiBlcnJvciBcdTIwMTQgdGhlIGhhbmRsZSBzaW1wbHkgZG9lcyBub3QgcnVuLlxuICovXG5leHBvcnQgY2xhc3MgT25TaWduYWwgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIC8qKiBTaWduYWwgbmFtZSBpbmNsdWRpbmcgJCBwcmVmaXg6IFwiJGZlZWRTdGF0ZVwiICovXG4gIGdldCBzaWduYWxOYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCduYW1lJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgLyoqIFNpZ25hbCBuYW1lIHdpdGhvdXQgJCBwcmVmaXgsIGZvciBEYXRhc3RhciBBUEkgY2FsbHMgKi9cbiAgZ2V0IHNpZ25hbEtleSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnNpZ25hbE5hbWUucmVwbGFjZSgvXlxcJC8sICcnKVxuICB9XG5cbiAgZ2V0IHdoZW5FeHByKCk6IHN0cmluZyB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnd2hlbicpPy50cmltKCkgPz8gbnVsbFxuICB9XG5cbiAgZ2V0IGhhbmRsZUJvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ2hhbmRsZScpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8b24tc2lnbmFsPiByZWdpc3RlcmVkOicsIHRoaXMuc2lnbmFsTmFtZSB8fCAnKHVubmFtZWQpJylcbiAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ29uLXNpZ25hbCcsIE9uU2lnbmFsKVxuIiwgIi8qKlxuICogPG9uLWxvYWQ+IFx1MjAxNCBmaXJlcyBpdHMgYHJ1bmAgYm9keSBvbmNlIHdoZW4gdGhlIGhvc3QgY29ubmVjdHMgdG8gdGhlIERPTS5cbiAqXG4gKiBUaW1pbmc6IGlmIGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdjb21wbGV0ZScsIGZpcmVzIGltbWVkaWF0ZWx5IGluXG4gKiBjb25uZWN0ZWRDYWxsYmFjayAodmlhIHF1ZXVlTWljcm90YXNrKS4gT3RoZXJ3aXNlIHdhaXRzIGZvciBET01Db250ZW50TG9hZGVkLlxuICpcbiAqIFJ1bGU6IGxpZmVjeWNsZSBob29rcyBhbHdheXMgZmlyZSBldmVudHMgKGBlbWl0YCksIG5ldmVyIGNhbGwgY29tbWFuZHMgZGlyZWN0bHkuXG4gKiBUaGlzIGtlZXBzIHRoZSBzeXN0ZW0gdHJhY2VhYmxlIFx1MjAxNCBldmVyeSBjb21tYW5kIGludm9jYXRpb24gaGFzIGFuIGV2ZW50IGluIGl0cyBoaXN0b3J5LlxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIHJ1biAgIFJlcXVpcmVkLiBTaW5nbGUtbGluZSBMRVMgYm9keSAodXN1YWxseSBqdXN0IGBlbWl0IGV2ZW50Om5hbWVgKVxuICovXG5leHBvcnQgY2xhc3MgT25Mb2FkIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBnZXQgcnVuQm9keSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxvbi1sb2FkPiByZWdpc3RlcmVkLCBydW46JywgdGhpcy5ydW5Cb2R5KVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIDxvbi1lbnRlcj4gXHUyMDE0IGZpcmVzIHdoZW4gdGhlIGhvc3QgPGxvY2FsLWV2ZW50LXNjcmlwdD4gZW50ZXJzIHRoZSB2aWV3cG9ydC5cbiAqXG4gKiBVc2VzIGEgc2luZ2xlIEludGVyc2VjdGlvbk9ic2VydmVyIHNoYXJlZCBhY3Jvc3MgYWxsIDxvbi1lbnRlcj4vPG9uLWV4aXQ+XG4gKiBjaGlsZHJlbiBvZiB0aGUgc2FtZSBob3N0IChQaGFzZSA1IGNyZWF0ZXMgaXQgb24gdGhlIGhvc3QgZWxlbWVudCkuXG4gKlxuICogQXR0cmlidXRlczpcbiAqICAgd2hlbiAgT3B0aW9uYWwuIEd1YXJkIGV4cHJlc3Npb24gXHUyMDE0IG9ubHkgZmlyZXMgcnVuIHdoZW4gdHJ1dGh5LlxuICogICAgICAgICAgUGF0dGVybjogYHdoZW49XCIkZmVlZFN0YXRlID09ICdwYXVzZWQnXCJgXG4gKiAgIHJ1biAgIFJlcXVpcmVkLiBTaW5nbGUtbGluZSBMRVMgYm9keS5cbiAqL1xuZXhwb3J0IGNsYXNzIE9uRW50ZXIgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIGdldCB3aGVuRXhwcigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3doZW4nKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIGdldCBydW5Cb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdydW4nKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPG9uLWVudGVyPiByZWdpc3RlcmVkLCB3aGVuOicsIHRoaXMud2hlbkV4cHIgPz8gJ2Fsd2F5cycpXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogPG9uLWV4aXQ+IFx1MjAxNCBmaXJlcyB3aGVuIHRoZSBob3N0IDxsb2NhbC1ldmVudC1zY3JpcHQ+IGV4aXRzIHRoZSB2aWV3cG9ydC5cbiAqXG4gKiBObyBgd2hlbmAgZ3VhcmQgXHUyMDE0IGV4aXQgYWx3YXlzIGZpcmVzIHVuY29uZGl0aW9uYWxseS5cbiAqIChJZiB5b3UgbmVlZCBjb25kaXRpb25hbCBleGl0IGJlaGF2aW9yLCBwdXQgdGhlIGNvbmRpdGlvbiBpbiB0aGUgaGFuZGxlci4pXG4gKlxuICogQXR0cmlidXRlczpcbiAqICAgcnVuICAgUmVxdWlyZWQuIFNpbmdsZS1saW5lIExFUyBib2R5LlxuICovXG5leHBvcnQgY2xhc3MgT25FeGl0IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBnZXQgcnVuQm9keSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxvbi1leGl0PiByZWdpc3RlcmVkLCBydW46JywgdGhpcy5ydW5Cb2R5KVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBSZWdpc3RyYXRpb24gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnb24tbG9hZCcsICBPbkxvYWQpXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ29uLWVudGVyJywgT25FbnRlcilcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnb24tZXhpdCcsICBPbkV4aXQpXG4iLCAiLyoqXG4gKiA8dXNlLW1vZHVsZT4gXHUyMDE0IGRlY2xhcmVzIGEgdm9jYWJ1bGFyeSBleHRlbnNpb24gYXZhaWxhYmxlIHRvIDxsb2NhbC1jb21tYW5kPiBib2RpZXMuXG4gKlxuICogTXVzdCBhcHBlYXIgYmVmb3JlIGFueSA8bG9jYWwtY29tbWFuZD4gaW4gdGhlIDxsb2NhbC1ldmVudC1zY3JpcHQ+LlxuICogVGhlIGhvc3QgcmVhZHMgPHVzZS1tb2R1bGU+IGNoaWxkcmVuIGZpcnN0IChQaGFzZSA4KSBhbmQgcmVnaXN0ZXJzXG4gKiB0aGVpciBwcmltaXRpdmVzIGludG8gaXRzIE1vZHVsZVJlZ2lzdHJ5IGJlZm9yZSBwYXJzaW5nIGNvbW1hbmQgYm9kaWVzLlxuICpcbiAqIEF0dHJpYnV0ZXMgKGluZGVwZW5kZW50LCBjb21iaW5hYmxlKTpcbiAqICAgdHlwZSAgIEJ1aWx0LWluIG1vZHVsZSBuYW1lOiBcImFuaW1hdGlvblwiXG4gKiAgIHNyYyAgICBVUkwvcGF0aCB0byBhIHVzZXJsYW5kIG1vZHVsZSBFUyBtb2R1bGU6ICBcIi4vc2Nyb2xsLWVmZmVjdHMuanNcIlxuICogICAgICAgICAgVGhlIG1vZHVsZSBtdXN0IGV4cG9ydCBhIGRlZmF1bHQgY29uZm9ybWluZyB0byBMRVNNb2R1bGU6XG4gKiAgICAgICAgICB7IG5hbWU6IHN0cmluZywgcHJpbWl0aXZlczogUmVjb3JkPHN0cmluZywgTEVTUHJpbWl0aXZlPiB9XG4gKlxuICogRXhhbXBsZXM6XG4gKiAgIDx1c2UtbW9kdWxlIHR5cGU9XCJhbmltYXRpb25cIj48L3VzZS1tb2R1bGU+XG4gKiAgIDx1c2UtbW9kdWxlIHNyYz1cIi4vc2Nyb2xsLWVmZmVjdHMuanNcIj48L3VzZS1tb2R1bGU+XG4gKiAgIDx1c2UtbW9kdWxlIHNyYz1cIi4vc3ByaW5nLXBoeXNpY3MuanNcIj48L3VzZS1tb2R1bGU+XG4gKlxuICogdHlwZT0gYW5kIHNyYz0gbWF5IGFwcGVhciB0b2dldGhlciBvbiBvbmUgZWxlbWVudCBpZiB0aGUgdXNlcmxhbmQgbW9kdWxlXG4gKiB3YW50cyB0byBkZWNsYXJlIGl0cyB0eXBlIGhpbnQgZm9yIHRvb2xpbmcgKG5vdCBjdXJyZW50bHkgcmVxdWlyZWQpLlxuICovXG5leHBvcnQgY2xhc3MgVXNlTW9kdWxlIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAvKiogQnVpbHQtaW4gbW9kdWxlIHR5cGUgZS5nLiBcImFuaW1hdGlvblwiICovXG4gIGdldCBtb2R1bGVUeXBlKCk6IHN0cmluZyB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgndHlwZScpPy50cmltKCkgPz8gbnVsbFxuICB9XG5cbiAgLyoqIFVzZXJsYW5kIG1vZHVsZSBVUkwgZS5nLiBcIi4vc2Nyb2xsLWVmZmVjdHMuanNcIiAqL1xuICBnZXQgbW9kdWxlU3JjKCk6IHN0cmluZyB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnc3JjJyk/LnRyaW0oKSA/PyBudWxsXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBjb25zdCBkZXNjID0gdGhpcy5tb2R1bGVUeXBlXG4gICAgICA/IGB0eXBlPVwiJHt0aGlzLm1vZHVsZVR5cGV9XCJgXG4gICAgICA6IHRoaXMubW9kdWxlU3JjXG4gICAgICAgID8gYHNyYz1cIiR7dGhpcy5tb2R1bGVTcmN9XCJgXG4gICAgICAgIDogJyhubyB0eXBlIG9yIHNyYyknXG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDx1c2UtbW9kdWxlPiBkZWNsYXJlZDonLCBkZXNjKVxuICB9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgndXNlLW1vZHVsZScsIFVzZU1vZHVsZSlcbiIsICIvKipcbiAqIERhdGFzdGFyIGJyaWRnZSBcdTIwMTQgcmVnaXN0ZXJzIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGFzIGEgRGF0YXN0YXIgYXR0cmlidXRlIHBsdWdpbi5cbiAqXG4gKiBQaGFzZSAwOiBzdHViIHRoYXQgaW1wb3J0cyB0aGUgcmVnaXN0cmF0aW9uIGZ1bmN0aW9uIGFuZCBzZXRzIHVwIHRoZSBzaGFwZS5cbiAqIFBoYXNlIDY6IGZpbGxzIGluIHNpZ25hbCB3YXRjaGluZywgQGFjdGlvbiBwYXNzdGhyb3VnaCwgYW5kIHJlYWN0aXZlIGVmZmVjdCB3aXJpbmcuXG4gKlxuICogTEVTIGlzIGRlc2lnbmVkIHRvIHdvcmsgd2l0aG91dCBEYXRhc3RhciAoc3RhbmRhbG9uZSBjdXN0b20gZWxlbWVudHMgb25seSkuXG4gKiBUaGlzIGZpbGUgaXMgb25seSBpbXBvcnRlZCB3aGVuIERhdGFzdGFyIGlzIHByZXNlbnQgaW4gdGhlIGltcG9ydG1hcC5cbiAqIFRoZSBtYWluIGluZGV4LnRzIGNvbmRpdGlvbmFsbHkgaW1wb3J0cyBpdCB2aWEgYSB0cnkvY2F0Y2ggZHluYW1pYyBpbXBvcnQuXG4gKi9cbmltcG9ydCB0eXBlIHsgTG9jYWxFdmVudFNjcmlwdCB9IGZyb20gJ0BlbGVtZW50cy9Mb2NhbEV2ZW50U2NyaXB0LmpzJ1xuXG5sZXQgYnJpZGdlUmVnaXN0ZXJlZCA9IGZhbHNlXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWdpc3RlckRhdGFzdGFyQnJpZGdlKCk6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoYnJpZGdlUmVnaXN0ZXJlZCkgcmV0dXJuXG5cbiAgdHJ5IHtcbiAgICBjb25zdCB7IGF0dHJpYnV0ZSB9ID0gYXdhaXQgaW1wb3J0KCdkYXRhc3RhcicpXG5cbiAgICBhdHRyaWJ1dGUoe1xuICAgICAgbmFtZTogJ2xvY2FsLWV2ZW50LXNjcmlwdCcsXG4gICAgICAvLyBObyBrZXkgc3VmZml4IGV4cGVjdGVkIChkYXRhLWxvY2FsLWV2ZW50LXNjcmlwdCwgbm90IGRhdGEtbG9jYWwtZXZlbnQtc2NyaXB0OmtleSlcbiAgICAgIHJlcXVpcmVtZW50OiB7XG4gICAgICAgIGtleTogJ2RlbmllZCcsXG4gICAgICAgIHZhbHVlOiAnZGVuaWVkJyxcbiAgICAgIH0sXG4gICAgICBhcHBseSh7IGVsLCBlZmZlY3QsIHNpZ25hbCB9KSB7XG4gICAgICAgIGNvbnN0IGhvc3QgPSBlbCBhcyBMb2NhbEV2ZW50U2NyaXB0XG5cbiAgICAgICAgLy8gUGhhc2UgNiB3aWxsIHdpcmUgc2lnbmFsIHdhdGNoaW5nIGFuZCBAYWN0aW9uIHBhc3N0aHJvdWdoIGhlcmUuXG4gICAgICAgIC8vIFBoYXNlIDA6IGp1c3QgY29ubmVjdCB0aGUgRGF0YXN0YXIgcHJpbWl0aXZlcyBzbyB0aGUgaG9zdCBrbm93c1xuICAgICAgICAvLyB0aGV5J3JlIGF2YWlsYWJsZS5cbiAgICAgICAgaG9zdC5jb25uZWN0RGF0YXN0YXIoeyBlZmZlY3QsIHNpZ25hbCB9KVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCdbTEVTOmRhdGFzdGFyXSBhdHRyaWJ1dGUgcGx1Z2luIGFwcGxpZWQgdG8nLCBlbC5pZCB8fCBlbClcblxuICAgICAgICAvLyBSZXR1cm4gY2xlYW51cCBmdW5jdGlvbiBcdTIwMTQgY2FsbGVkIHdoZW4gZWxlbWVudCBpcyByZW1vdmVkIGZyb20gRE9NLlxuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgIGhvc3QuZGlzY29ubmVjdERhdGFzdGFyKClcbiAgICAgICAgICBjb25zb2xlLmxvZygnW0xFUzpkYXRhc3Rhcl0gYXR0cmlidXRlIHBsdWdpbiBjbGVhbmVkIHVwJywgZWwuaWQgfHwgZWwpXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfSlcblxuICAgIGJyaWRnZVJlZ2lzdGVyZWQgPSB0cnVlXG4gICAgY29uc29sZS5sb2coJ1tMRVM6ZGF0YXN0YXJdIGJyaWRnZSByZWdpc3RlcmVkJylcbiAgfSBjYXRjaCB7XG4gICAgLy8gRGF0YXN0YXIgbm90IHByZXNlbnQgXHUyMDE0IExFUyBydW5zIGluIHN0YW5kYWxvbmUgbW9kZS5cbiAgICBjb25zb2xlLmxvZygnW0xFU10gUnVubmluZyBpbiBzdGFuZGFsb25lIG1vZGUgKERhdGFzdGFyIG5vdCBmb3VuZCBpbiBpbXBvcnRtYXApJylcbiAgfVxufVxuIiwgIi8qKlxuICogbG9jYWwtZXZlbnQtc2NyaXB0IFx1MjAxNCBtYWluIGVudHJ5IHBvaW50XG4gKlxuICogSW1wb3J0IG9yZGVyIG1hdHRlcnMgZm9yIGN1c3RvbSBlbGVtZW50IHJlZ2lzdHJhdGlvbjpcbiAqICAgMS4gSG9zdCBlbGVtZW50IGZpcnN0IChMb2NhbEV2ZW50U2NyaXB0KVxuICogICAyLiBDaGlsZCBlbGVtZW50cyB0aGF0IHJlZmVyZW5jZSBpdFxuICogICAzLiBEYXRhc3RhciBicmlkZ2UgbGFzdCAob3B0aW9uYWwgXHUyMDE0IGZhaWxzIGdyYWNlZnVsbHkgaWYgRGF0YXN0YXIgYWJzZW50KVxuICpcbiAqIFVzYWdlIHZpYSBpbXBvcnRtYXAgKyBzY3JpcHQgdGFnOlxuICpcbiAqICAgPHNjcmlwdCB0eXBlPVwiaW1wb3J0bWFwXCI+XG4gKiAgICAge1xuICogICAgICAgXCJpbXBvcnRzXCI6IHtcbiAqICAgICAgICAgXCJkYXRhc3RhclwiOiBcImh0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9naC9zdGFyZmVkZXJhdGlvbi9kYXRhc3RhckB2MS4wLjAtUkMuOC9idW5kbGVzL2RhdGFzdGFyLmpzXCJcbiAqICAgICAgIH1cbiAqICAgICB9XG4gKiAgIDwvc2NyaXB0PlxuICogICA8c2NyaXB0IHR5cGU9XCJtb2R1bGVcIiBzcmM9XCIvZGlzdC9sb2NhbC1ldmVudC1zY3JpcHQuanNcIj48L3NjcmlwdD5cbiAqXG4gKiBXaXRob3V0IHRoZSBpbXBvcnRtYXAgKG9yIHdpdGggZGF0YXN0YXIgYWJzZW50KSwgTEVTIHJ1bnMgaW4gc3RhbmRhbG9uZSBtb2RlOlxuICogYWxsIGN1c3RvbSBlbGVtZW50cyB3b3JrLCBEYXRhc3RhciBzaWduYWwgd2F0Y2hpbmcgYW5kIEBhY3Rpb24gcGFzc3Rocm91Z2hcbiAqIGFyZSB1bmF2YWlsYWJsZS5cbiAqL1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgQ3VzdG9tIGVsZW1lbnRzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gRWFjaCBpbXBvcnQgcmVnaXN0ZXJzIGl0cyBlbGVtZW50KHMpIGFzIGEgc2lkZSBlZmZlY3QuXG5cbmV4cG9ydCB7IExvY2FsRXZlbnRTY3JpcHQgfSBmcm9tICdAZWxlbWVudHMvTG9jYWxFdmVudFNjcmlwdC5qcydcbmV4cG9ydCB7IExvY2FsQ29tbWFuZCB9ICAgICBmcm9tICdAZWxlbWVudHMvTG9jYWxDb21tYW5kLmpzJ1xuZXhwb3J0IHsgT25FdmVudCB9ICAgICAgICAgIGZyb20gJ0BlbGVtZW50cy9PbkV2ZW50LmpzJ1xuZXhwb3J0IHsgT25TaWduYWwgfSAgICAgICAgIGZyb20gJ0BlbGVtZW50cy9PblNpZ25hbC5qcydcbmV4cG9ydCB7IE9uTG9hZCwgT25FbnRlciwgT25FeGl0IH0gZnJvbSAnQGVsZW1lbnRzL0xpZmVjeWNsZS5qcydcbmV4cG9ydCB7IFVzZU1vZHVsZSB9ICAgICAgICBmcm9tICdAZWxlbWVudHMvVXNlTW9kdWxlLmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgVHlwZSBleHBvcnRzIChmb3IgVHlwZVNjcmlwdCBjb25zdW1lcnMpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuZXhwb3J0IHR5cGUgeyBMRVNOb2RlIH0gICAgICAgICAgICAgICAgICAgZnJvbSAnQHBhcnNlci9hc3QuanMnXG5leHBvcnQgdHlwZSB7IExFU01vZHVsZSwgTEVTUHJpbWl0aXZlIH0gICBmcm9tICdAbW9kdWxlcy90eXBlcy5qcydcbmV4cG9ydCB0eXBlIHsgQ29tbWFuZERlZiwgQXJnRGVmIH0gICAgICAgIGZyb20gJ0BydW50aW1lL3JlZ2lzdHJ5LmpzJ1xuZXhwb3J0IHsgTEVTU2NvcGUgfSAgICAgICAgICAgICAgICAgICAgICAgZnJvbSAnQHJ1bnRpbWUvc2NvcGUuanMnXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBEYXRhc3RhciBicmlkZ2UgKG9wdGlvbmFsKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIER5bmFtaWMgaW1wb3J0IHNvIHRoZSBidW5kbGUgd29ya3Mgd2l0aG91dCBEYXRhc3RhciBwcmVzZW50LlxuaW1wb3J0IHsgcmVnaXN0ZXJEYXRhc3RhckJyaWRnZSB9IGZyb20gJ0BkYXRhc3Rhci9wbHVnaW4uanMnXG5yZWdpc3RlckRhdGFzdGFyQnJpZGdlKClcbmV4cG9ydCB0eXBlIHsgTEVTQ29uZmlnLCBDb21tYW5kRGVjbCwgRXZlbnRIYW5kbGVyRGVjbCwgU2lnbmFsV2F0Y2hlckRlY2wsXG4gICAgICAgICAgICAgIE9uTG9hZERlY2wsIE9uRW50ZXJEZWNsLCBPbkV4aXREZWNsLCBNb2R1bGVEZWNsIH0gZnJvbSAnQHBhcnNlci9jb25maWcuanMnXG5leHBvcnQgeyByZWFkQ29uZmlnLCBsb2dDb25maWcgfSBmcm9tICdAcGFyc2VyL3JlYWRlci5qcydcbmV4cG9ydCB7IHN0cmlwQm9keSB9ICAgICAgICAgICAgIGZyb20gJ0BwYXJzZXIvc3RyaXBCb2R5LmpzJ1xuZXhwb3J0IHsgcGFyc2VMRVMsIExFU1BhcnNlciwgTEVTUGFyc2VFcnJvciB9IGZyb20gJ0BwYXJzZXIvaW5kZXguanMnXG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFZTSxNQU1BLGlCQWVDO0FBakNQO0FBQUE7QUFBQTtBQVlBLElBQU0sT0FBTyxDQUFDLFNBQ1osT0FBTyxVQUFVLFVBQVUsUUFBUSxTQUFTLFNBQVM7QUFDbkQsY0FBUSxNQUFNLG1CQUFtQixJQUFJLEtBQUssUUFBUSxNQUFNLFFBQVEsT0FBTyxNQUFNLEtBQUssU0FBUyxJQUFJO0FBQUEsSUFFakc7QUFFRixJQUFNLGtCQUE2QjtBQUFBLE1BQ2pDLE1BQU07QUFBQSxNQUNOLFlBQVk7QUFBQSxRQUNW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
