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
function queryAll(selector, host) {
  try {
    const root = host.getRootNode();
    const scope = root instanceof Document ? root : root.ownerDocument ?? document;
    return Array.from(scope.querySelectorAll(selector));
  } catch {
    console.warn(`[LES:animation] Invalid selector: "${selector}"`);
    return [];
  }
}
async function animateAll(els, keyframes, options) {
  if (els.length === 0) return;
  await Promise.all(
    els.map((el) => el.animate(keyframes, options).finished)
  );
}
function slideKeyframes(dir, entering) {
  const distance = "40px";
  const translations = {
    left: `translateX(-${distance})`,
    right: `translateX(${distance})`,
    up: `translateY(-${distance})`,
    down: `translateY(${distance})`
  };
  const translate = translations[dir];
  if (entering) {
    return [
      { opacity: 0, transform: translate },
      { opacity: 1, transform: "none" }
    ];
  } else {
    return [
      { opacity: 1, transform: "none" },
      { opacity: 0, transform: translate }
    ];
  }
}
function parseMs(val, fallback) {
  if (val === void 0 || val === null) return fallback;
  if (typeof val === "number") return val;
  const m = String(val).match(/^(\d+(?:\.\d+)?)ms$/);
  if (m) return parseFloat(m[1]);
  const n = parseFloat(String(val));
  return Number.isNaN(n) ? fallback : n;
}
var fadeIn, fadeOut, slideIn, slideOut, slideUp, slideDown, pulse, staggerEnter, staggerExit, animationModule, animation_default;
var init_animation = __esm({
  "src/modules/builtin/animation.ts"() {
    "use strict";
    fadeIn = async (selector, duration, easing, _opts, host) => {
      const els = queryAll(selector, host);
      await animateAll(
        els,
        [{ opacity: 0 }, { opacity: 1 }],
        { duration, easing, fill: "forwards" }
      );
    };
    fadeOut = async (selector, duration, easing, _opts, host) => {
      const els = queryAll(selector, host);
      await animateAll(
        els,
        [{ opacity: 1 }, { opacity: 0 }],
        { duration, easing, fill: "forwards" }
      );
    };
    slideIn = async (selector, duration, easing, opts, host) => {
      const from = opts["from"] ?? "right";
      const els = queryAll(selector, host);
      await animateAll(els, slideKeyframes(from, true), { duration, easing, fill: "forwards" });
    };
    slideOut = async (selector, duration, easing, opts, host) => {
      const to = opts["to"] ?? "left";
      const els = queryAll(selector, host);
      await animateAll(els, slideKeyframes(to, false), { duration, easing, fill: "forwards" });
    };
    slideUp = async (selector, duration, easing, _opts, host) => {
      const els = queryAll(selector, host);
      await animateAll(els, slideKeyframes("up", true), { duration, easing, fill: "forwards" });
    };
    slideDown = async (selector, duration, easing, _opts, host) => {
      const els = queryAll(selector, host);
      await animateAll(els, slideKeyframes("down", false), { duration, easing, fill: "forwards" });
    };
    pulse = async (selector, duration, easing, _opts, host) => {
      const els = queryAll(selector, host);
      await animateAll(els, [
        { opacity: 1, transform: "scale(1)" },
        { opacity: 0.75, transform: "scale(1.03)", offset: 0.4 },
        { opacity: 1, transform: "scale(1)" }
      ], { duration, easing, fill: "none" });
    };
    staggerEnter = async (selector, duration, easing, opts, host) => {
      const els = queryAll(selector, host);
      if (els.length === 0) return;
      const gap = parseMs(opts["gap"], 40);
      const from = opts["from"] ?? "right";
      await Promise.all(
        els.map(
          (el, i) => el.animate(
            slideKeyframes(from, true),
            { duration, easing, fill: "forwards", delay: i * gap }
          ).finished
        )
      );
    };
    staggerExit = async (selector, duration, easing, opts, host) => {
      let els = queryAll(selector, host);
      if (els.length === 0) return;
      const gap = parseMs(opts["gap"], 20);
      const reverse = String(opts["direction"] ?? "") === "reverse";
      const to = opts["to"] ?? "left";
      if (reverse) els = [...els].reverse();
      await Promise.all(
        els.map(
          (el, i) => el.animate(
            slideKeyframes(to, false),
            { duration, easing, fill: "forwards", delay: i * gap }
          ).finished
        )
      );
    };
    animationModule = {
      name: "animation",
      primitives: {
        "fade-in": fadeIn,
        "fade-out": fadeOut,
        "slide-in": slideIn,
        "slide-out": slideOut,
        "slide-up": slideUp,
        "slide-down": slideDown,
        "pulse": pulse,
        "stagger-enter": staggerEnter,
        "stagger-exit": staggerExit
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
  if (/^\d+(\.\d+)?ms$/.test(node.raw)) return node.raw;
  if (/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(node.raw)) return node.raw;
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

// src/runtime/observer.ts
init_executor();
function wireIntersectionObserver(host, onEnter, onExit, getCtx) {
  if (onEnter.length === 0 && onExit.length === 0) {
    return () => {
    };
  }
  let wasIntersecting = null;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const nowIntersecting = entry.isIntersecting;
        if (nowIntersecting && wasIntersecting !== true) {
          wasIntersecting = true;
          handleEnter(onEnter, getCtx);
        } else if (!nowIntersecting && wasIntersecting === true) {
          wasIntersecting = false;
          handleExit(onExit, getCtx);
        } else if (wasIntersecting === null) {
          wasIntersecting = nowIntersecting;
        }
      }
    },
    {
      // Default threshold: fire when any pixel of the host enters/exits
      threshold: 0
    }
  );
  observer.observe(host);
  console.log("[LES] IntersectionObserver attached", host.id || host.tagName);
  return () => {
    observer.disconnect();
    console.log("[LES] IntersectionObserver disconnected");
  };
}
function handleEnter(decls, getCtx) {
  const ctx = getCtx();
  for (const decl of decls) {
    if (decl.when) {
      const passes = Boolean(evalExpr({ type: "expr", raw: decl.when }, ctx));
      if (!passes) {
        console.log(`[LES] on-enter guard rejected: ${decl.when}`);
        continue;
      }
    }
    execute(decl.body, ctx).catch((err) => {
      console.error("[LES] Error in on-enter:", err);
    });
  }
}
function handleExit(bodies, getCtx) {
  const ctx = getCtx();
  for (const body of bodies) {
    execute(body, ctx).catch((err) => {
      console.error("[LES] Error in on-exit:", err);
    });
  }
}

// src/runtime/signals.ts
init_executor();
function notifySignalWatchers(changedSignal, watchers, getCtx) {
  for (const watcher of watchers) {
    const watchedKey = watcher.signal.replace(/^\$/, "");
    if (watchedKey !== changedSignal) continue;
    const ctx = getCtx();
    if (watcher.when) {
      const passes = Boolean(evalExpr({ type: "expr", raw: watcher.when }, ctx));
      if (!passes) continue;
    }
    execute(watcher.body, ctx).catch((err) => {
      console.error(`[LES] Error in on-signal "${watcher.signal}":`, err);
    });
  }
}
function wireSignalWatcherViaDatastar(watcher, effect, getCtx) {
  effect(() => {
    const ctx = getCtx();
    const signalKey = watcher.signal.replace(/^\$/, "");
    ctx.getSignal(signalKey);
    if (watcher.when) {
      const passes = Boolean(evalExpr({ type: "expr", raw: watcher.when }, ctx));
      if (!passes) return;
    }
    execute(watcher.body, ctx).catch((err) => {
      console.error(`[LES] Error in on-signal "${watcher.signal}" (Datastar):`, err);
    });
  });
}

// src/elements/LocalEventScript.ts
var LocalEventScript = class extends HTMLElement {
  commands = new CommandRegistry();
  modules = new ModuleRegistry();
  _config = null;
  _wiring = null;
  _ctx = null;
  // Cleanup fns accumulated during _init — all called in _teardown
  _cleanups = [];
  // Simple fallback signal store (Datastar bridge replaces reads/writes in Phase 6)
  _signals = /* @__PURE__ */ new Map();
  // Datastar bridge (populated in Phase 6 via attribute plugin)
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
      { get: (k) => this._getSignal(k), set: (k, v) => this._setSignal(k, v) }
    );
    registerCommands(this._wiring, this.commands);
    this._cleanups.push(
      wireEventHandlers(this._wiring, this, () => this._ctx)
    );
    this._cleanups.push(
      wireIntersectionObserver(
        this,
        this._wiring.lifecycle.onEnter,
        this._wiring.lifecycle.onExit,
        () => this._ctx
      )
    );
    if (this._dsEffect) {
      for (const watcher of this._wiring.watchers) {
        wireSignalWatcherViaDatastar(watcher, this._dsEffect, () => this._ctx);
      }
      console.log(`[LES] wired ${this._wiring.watchers.length} signal watchers via Datastar`);
    } else {
      console.log(`[LES] wired ${this._wiring.watchers.length} signal watchers (local fallback)`);
    }
    await fireOnLoad(this._wiring, () => this._ctx);
    console.log("[LES] ready:", this.id || "(no id)");
  }
  _teardown() {
    console.log("[LES] <local-event-script> disconnected", this.id || "(no id)");
    for (const cleanup of this._cleanups) cleanup();
    this._cleanups = [];
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
    if (this._dsSignal) {
      try {
        const sig = this._dsSignal(name, value);
        sig.value = value;
      } catch {
      }
    }
    if (prev !== value && this._wiring && this._ctx && !this._dsEffect) {
      notifySignalWatchers(name, this._wiring.watchers, () => this._ctx);
    }
  }
  // ─── Module loading ───────────────────────────────────────────────────────
  async _loadModules(config) {
    if (config.modules.length === 0) return;
    await Promise.all(
      config.modules.map(
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
  // ─── Public API ───────────────────────────────────────────────────────────
  /** Fire a named local event into this LES instance from outside. */
  fire(event, payload = []) {
    this.dispatchEvent(new CustomEvent(event, {
      detail: { payload },
      bubbles: false,
      composed: false
    }));
  }
  /** Call a command by name from outside (e.g. browser console, tests). */
  async call(command, args = {}) {
    if (!this._ctx) {
      console.warn("[LES] not initialized yet");
      return;
    }
    const { runCommand: runCommand2 } = await Promise.resolve().then(() => (init_executor(), executor_exports));
    await runCommand2(command, args, this._ctx);
  }
  /** Read a signal value directly (for debugging). */
  signal(name) {
    return this._getSignal(name);
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
    const datastar = await import("datastar");
    const { attribute } = datastar;
    attribute({
      name: "local-event-script",
      requirement: {
        key: "denied",
        value: "denied"
      },
      apply({ el, effect, signal }) {
        const host = el;
        host.connectDatastar({ effect, signal });
        const wiring = host.wiring;
        if (wiring && wiring.watchers.length > 0) {
          for (const watcher of wiring.watchers) {
            wireSignalWatcherViaDatastar(watcher, effect, () => host.context);
          }
          console.log(`[LES:datastar] re-wired ${wiring.watchers.length} signal watchers via Datastar effect()`);
        }
        console.log("[LES:datastar] attribute plugin applied to", el.id || el.tagName);
        return () => {
          host.disconnectDatastar();
          console.log("[LES:datastar] attribute plugin cleaned up", el.id || el.tagName);
        };
      }
    });
    bridgeRegistered = true;
    console.log("[LES:datastar] bridge registered");
  } catch {
    console.log("[LES] running in standalone mode (Datastar not available)");
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL21vZHVsZXMvYnVpbHRpbi9hbmltYXRpb24udHMiLCAiLi4vc3JjL3J1bnRpbWUvZXhlY3V0b3IudHMiLCAiLi4vc3JjL3J1bnRpbWUvcmVnaXN0cnkudHMiLCAiLi4vc3JjL21vZHVsZXMvdHlwZXMudHMiLCAiLi4vc3JjL3BhcnNlci9zdHJpcEJvZHkudHMiLCAiLi4vc3JjL3BhcnNlci9yZWFkZXIudHMiLCAiLi4vc3JjL3BhcnNlci90b2tlbml6ZXIudHMiLCAiLi4vc3JjL3BhcnNlci9wYXJzZXIudHMiLCAiLi4vc3JjL3BhcnNlci9pbmRleC50cyIsICIuLi9zcmMvcnVudGltZS93aXJpbmcudHMiLCAiLi4vc3JjL3J1bnRpbWUvc2NvcGUudHMiLCAiLi4vc3JjL3J1bnRpbWUvb2JzZXJ2ZXIudHMiLCAiLi4vc3JjL3J1bnRpbWUvc2lnbmFscy50cyIsICIuLi9zcmMvZWxlbWVudHMvTG9jYWxFdmVudFNjcmlwdC50cyIsICIuLi9zcmMvZWxlbWVudHMvTG9jYWxDb21tYW5kLnRzIiwgIi4uL3NyYy9lbGVtZW50cy9PbkV2ZW50LnRzIiwgIi4uL3NyYy9lbGVtZW50cy9PblNpZ25hbC50cyIsICIuLi9zcmMvZWxlbWVudHMvTGlmZWN5Y2xlLnRzIiwgIi4uL3NyYy9lbGVtZW50cy9Vc2VNb2R1bGUudHMiLCAiLi4vc3JjL2RhdGFzdGFyL3BsdWdpbi50cyIsICIuLi9zcmMvaW5kZXgudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogUGhhc2UgNzogQnVpbHQtaW4gYW5pbWF0aW9uIG1vZHVsZVxuICpcbiAqIEFsbCBwcmltaXRpdmVzIHVzZSB0aGUgV2ViIEFuaW1hdGlvbnMgQVBJIChlbGVtZW50LmFuaW1hdGUoKS5maW5pc2hlZClcbiAqIHNvIHRoZXkgaW50ZWdyYXRlIHdpdGggTEVTJ3MgYXN5bmMtdHJhbnNwYXJlbnQgYHRoZW5gIHNlcXVlbmNpbmc6XG4gKlxuICogICBmYWRlLWluICNzcGxhc2ggMjAwbXMgZWFzZS1vdXQgYW5kXG4gKiAgIHNsaWRlLXVwICNzcGxhc2ggMTgwbXMgZWFzZS1vdXRcbiAqICAgdGhlbiBmaXJlIHNwbGFzaDpyZWFkeSAgICAgICAgICBcdTIxOTAgb25seSBmaXJlcyBhZnRlciBCT1RIIGFuaW1hdGlvbnMgY29tcGxldGVcbiAqXG4gKiBgYW5kYCBcdTIxOTIgUHJvbWlzZS5hbGwgKGNvbmN1cnJlbnQpXG4gKiBgdGhlbmAgXHUyMTkyIHNlcXVlbnRpYWwgYXdhaXQgb24gLmZpbmlzaGVkXG4gKlxuICogVGhlIGV4ZWN1dG9yIGF3YWl0cyBlYWNoIExFU1ByaW1pdGl2ZSByZXR1cm4gdmFsdWUsIHNvIGFuaW1hdGlvblxuICogY29tcGxldGlvbiBpcyBuYXR1cmFsbHkgc2VyaWFsaXplZCB3aXRob3V0IGFueSBzZXRUaW1lb3V0IGhhY2tzLlxuICovXG5cbmltcG9ydCB0eXBlIHsgTEVTTW9kdWxlLCBMRVNQcmltaXRpdmUgfSBmcm9tICcuLi90eXBlcy5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBVdGlsaXR5OiBxdWVyeSBhbGwgbWF0Y2hpbmcgZWxlbWVudHMgd2l0aGluIHRoZSBob3N0IHNjb3BlXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gcXVlcnlBbGwoc2VsZWN0b3I6IHN0cmluZywgaG9zdDogRWxlbWVudCk6IEVsZW1lbnRbXSB7XG4gIHRyeSB7XG4gICAgLy8gU2VhcmNoIGZyb20gdGhlIGRvY3VtZW50IHJvb3Qgc28gYW5pbWF0aW9uIHRhcmdldHMgY2FuIGJlIGFueXdoZXJlIGluXG4gICAgLy8gdGhlIERPTSBcdTIwMTQgbm90IGp1c3QgaW5zaWRlIHRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBob3N0IGVsZW1lbnQuXG4gICAgLy8gVGhpcyBtaXJyb3JzIGhvdyBDU1Mgc2VsZWN0b3JzIHdvcms6IHNjb3BlIGlzIHRoZSBkb2N1bWVudCwgbm90IGEgc3VidHJlZS5cbiAgICBjb25zdCByb290ID0gaG9zdC5nZXRSb290Tm9kZSgpIGFzIERvY3VtZW50IHwgU2hhZG93Um9vdFxuICAgIGNvbnN0IHNjb3BlID0gcm9vdCBpbnN0YW5jZW9mIERvY3VtZW50ID8gcm9vdCA6IHJvb3Qub3duZXJEb2N1bWVudCA/PyBkb2N1bWVudFxuICAgIHJldHVybiBBcnJheS5mcm9tKHNjb3BlLnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKVxuICB9IGNhdGNoIHtcbiAgICBjb25zb2xlLndhcm4oYFtMRVM6YW5pbWF0aW9uXSBJbnZhbGlkIHNlbGVjdG9yOiBcIiR7c2VsZWN0b3J9XCJgKVxuICAgIHJldHVybiBbXVxuICB9XG59XG5cbi8qKiBBd2FpdHMgYWxsIEFuaW1hdGlvbi5maW5pc2hlZCBwcm9taXNlcy4gUmV0dXJucyBpbW1lZGlhdGVseSBpZiBubyBlbGVtZW50cyBtYXRjaGVkLiAqL1xuYXN5bmMgZnVuY3Rpb24gYW5pbWF0ZUFsbChcbiAgZWxzOiBFbGVtZW50W10sXG4gIGtleWZyYW1lczogS2V5ZnJhbWVbXSxcbiAgb3B0aW9uczogS2V5ZnJhbWVBbmltYXRpb25PcHRpb25zXG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKGVscy5sZW5ndGggPT09IDApIHJldHVyblxuICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBlbHMubWFwKGVsID0+IChlbCBhcyBIVE1MRWxlbWVudCkuYW5pbWF0ZShrZXlmcmFtZXMsIG9wdGlvbnMpLmZpbmlzaGVkKVxuICApXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gRGlyZWN0aW9uIGhlbHBlcnNcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG50eXBlIERpcmVjdGlvbiA9ICdsZWZ0JyB8ICdyaWdodCcgfCAndXAnIHwgJ2Rvd24nXG5cbmZ1bmN0aW9uIHNsaWRlS2V5ZnJhbWVzKGRpcjogRGlyZWN0aW9uLCBlbnRlcmluZzogYm9vbGVhbik6IEtleWZyYW1lW10ge1xuICBjb25zdCBkaXN0YW5jZSA9ICc0MHB4J1xuICBjb25zdCB0cmFuc2xhdGlvbnM6IFJlY29yZDxEaXJlY3Rpb24sIHN0cmluZz4gPSB7XG4gICAgbGVmdDogIGB0cmFuc2xhdGVYKC0ke2Rpc3RhbmNlfSlgLFxuICAgIHJpZ2h0OiBgdHJhbnNsYXRlWCgke2Rpc3RhbmNlfSlgLFxuICAgIHVwOiAgICBgdHJhbnNsYXRlWSgtJHtkaXN0YW5jZX0pYCxcbiAgICBkb3duOiAgYHRyYW5zbGF0ZVkoJHtkaXN0YW5jZX0pYCxcbiAgfVxuICBjb25zdCB0cmFuc2xhdGUgPSB0cmFuc2xhdGlvbnNbZGlyXVxuICBpZiAoZW50ZXJpbmcpIHtcbiAgICByZXR1cm4gW1xuICAgICAgeyBvcGFjaXR5OiAwLCB0cmFuc2Zvcm06IHRyYW5zbGF0ZSB9LFxuICAgICAgeyBvcGFjaXR5OiAxLCB0cmFuc2Zvcm06ICdub25lJyB9LFxuICAgIF1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gW1xuICAgICAgeyBvcGFjaXR5OiAxLCB0cmFuc2Zvcm06ICdub25lJyB9LFxuICAgICAgeyBvcGFjaXR5OiAwLCB0cmFuc2Zvcm06IHRyYW5zbGF0ZSB9LFxuICAgIF1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIENvcmUgcHJpbWl0aXZlc1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmNvbnN0IGZhZGVJbjogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBfb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgYXdhaXQgYW5pbWF0ZUFsbChlbHMsXG4gICAgW3sgb3BhY2l0eTogMCB9LCB7IG9wYWNpdHk6IDEgfV0sXG4gICAgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnIH1cbiAgKVxufVxuXG5jb25zdCBmYWRlT3V0OiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIF9vcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBhd2FpdCBhbmltYXRlQWxsKGVscyxcbiAgICBbeyBvcGFjaXR5OiAxIH0sIHsgb3BhY2l0eTogMCB9XSxcbiAgICB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdmb3J3YXJkcycgfVxuICApXG59XG5cbmNvbnN0IHNsaWRlSW46IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBmcm9tID0gKG9wdHNbJ2Zyb20nXSBhcyBEaXJlY3Rpb24gfCB1bmRlZmluZWQpID8/ICdyaWdodCdcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLCBzbGlkZUtleWZyYW1lcyhmcm9tLCB0cnVlKSwgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnIH0pXG59XG5cbmNvbnN0IHNsaWRlT3V0OiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIG9wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgdG8gPSAob3B0c1sndG8nXSBhcyBEaXJlY3Rpb24gfCB1bmRlZmluZWQpID8/ICdsZWZ0J1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgYXdhaXQgYW5pbWF0ZUFsbChlbHMsIHNsaWRlS2V5ZnJhbWVzKHRvLCBmYWxzZSksIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9KVxufVxuXG5jb25zdCBzbGlkZVVwOiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIF9vcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBhd2FpdCBhbmltYXRlQWxsKGVscywgc2xpZGVLZXlmcmFtZXMoJ3VwJywgdHJ1ZSksIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9KVxufVxuXG5jb25zdCBzbGlkZURvd246IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgX29wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLCBzbGlkZUtleWZyYW1lcygnZG93bicsIGZhbHNlKSwgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnIH0pXG59XG5cbi8qKlxuICogcHVsc2UgXHUyMDE0IGJyaWVmIHNjYWxlICsgb3BhY2l0eSBwdWxzZSB0byBkcmF3IGF0dGVudGlvbiB0byB1cGRhdGVkIGl0ZW1zLlxuICogVXNlZCBmb3IgRDMgXCJ1cGRhdGVcIiBwaGFzZTogaXRlbXMgd2hvc2UgY29udGVudCBjaGFuZ2VkIGdldCBhIHZpc3VhbCBwaW5nLlxuICovXG5jb25zdCBwdWxzZTogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBfb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgYXdhaXQgYW5pbWF0ZUFsbChlbHMsIFtcbiAgICB7IG9wYWNpdHk6IDEsICAgIHRyYW5zZm9ybTogJ3NjYWxlKDEpJyB9LFxuICAgIHsgb3BhY2l0eTogMC43NSwgdHJhbnNmb3JtOiAnc2NhbGUoMS4wMyknLCBvZmZzZXQ6IDAuNCB9LFxuICAgIHsgb3BhY2l0eTogMSwgICAgdHJhbnNmb3JtOiAnc2NhbGUoMSknIH0sXG4gIF0sIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ25vbmUnIH0pXG59XG5cbi8qKlxuICogc3RhZ2dlci1lbnRlciBcdTIwMTQgcnVucyBzbGlkZUluIG9uIGVhY2ggbWF0Y2hlZCBlbGVtZW50IGluIHNlcXVlbmNlLFxuICogb2Zmc2V0IGJ5IGBnYXBgIG1pbGxpc2Vjb25kcyBiZXR3ZWVuIGVhY2guXG4gKlxuICogT3B0aW9uczpcbiAqICAgZ2FwOiBObXMgICBcdTIwMTQgZGVsYXkgYmV0d2VlbiBlYWNoIGVsZW1lbnQgKGRlZmF1bHQ6IDQwbXMpXG4gKiAgIGZyb206IGRpciAgXHUyMDE0ICdsZWZ0JyB8ICdyaWdodCcgfCAndXAnIHwgJ2Rvd24nIChkZWZhdWx0OiAncmlnaHQnKVxuICpcbiAqIEFsbCBhbmltYXRpb25zIGFyZSBzdGFydGVkIHRvZ2V0aGVyIChQcm9taXNlLmFsbCkgYnV0IGVhY2ggaGFzIGFuXG4gKiBpbmNyZWFzaW5nIGBkZWxheWAgXHUyMDE0IHRoaXMgZ2l2ZXMgdGhlIHN0YWdnZXIgZWZmZWN0IHdoaWxlIGtlZXBpbmdcbiAqIHRoZSB0b3RhbCBQcm9taXNlLXNldHRsZWQgdGltZSA9IGR1cmF0aW9uICsgKG4tMSkgKiBnYXAuXG4gKi9cbmNvbnN0IHN0YWdnZXJFbnRlcjogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBvcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBpZiAoZWxzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgY29uc3QgZ2FwICA9IHBhcnNlTXMob3B0c1snZ2FwJ10gYXMgc3RyaW5nIHwgbnVtYmVyIHwgdW5kZWZpbmVkLCA0MClcbiAgY29uc3QgZnJvbSA9IChvcHRzWydmcm9tJ10gYXMgRGlyZWN0aW9uIHwgdW5kZWZpbmVkKSA/PyAncmlnaHQnXG5cbiAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgZWxzLm1hcCgoZWwsIGkpID0+XG4gICAgICAoZWwgYXMgSFRNTEVsZW1lbnQpLmFuaW1hdGUoXG4gICAgICAgIHNsaWRlS2V5ZnJhbWVzKGZyb20sIHRydWUpLFxuICAgICAgICB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdmb3J3YXJkcycsIGRlbGF5OiBpICogZ2FwIH1cbiAgICAgICkuZmluaXNoZWRcbiAgICApXG4gIClcbn1cblxuLyoqXG4gKiBzdGFnZ2VyLWV4aXQgXHUyMDE0IHJ1bnMgc2xpZGVPdXQgb24gZWFjaCBtYXRjaGVkIGVsZW1lbnQgaW4gc2VxdWVuY2UuXG4gKlxuICogT3B0aW9uczpcbiAqICAgZ2FwOiBObXMgICAgICAgICAgXHUyMDE0IGRlbGF5IGJldHdlZW4gZWFjaCBlbGVtZW50IChkZWZhdWx0OiAyMG1zKVxuICogICBkaXJlY3Rpb246IHJldmVyc2UgXHUyMDE0IHByb2Nlc3MgZWxlbWVudHMgaW4gcmV2ZXJzZSBvcmRlclxuICogICB0bzogZGlyICAgICAgICAgICBcdTIwMTQgZXhpdCBkaXJlY3Rpb24gKGRlZmF1bHQ6ICdsZWZ0JylcbiAqL1xuY29uc3Qgc3RhZ2dlckV4aXQ6IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgb3B0cywgaG9zdCkgPT4ge1xuICBsZXQgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGlmIChlbHMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICBjb25zdCBnYXAgICAgID0gcGFyc2VNcyhvcHRzWydnYXAnXSBhcyBzdHJpbmcgfCBudW1iZXIgfCB1bmRlZmluZWQsIDIwKVxuICBjb25zdCByZXZlcnNlID0gU3RyaW5nKG9wdHNbJ2RpcmVjdGlvbiddID8/ICcnKSA9PT0gJ3JldmVyc2UnXG4gIGNvbnN0IHRvICAgICAgPSAob3B0c1sndG8nXSBhcyBEaXJlY3Rpb24gfCB1bmRlZmluZWQpID8/ICdsZWZ0J1xuXG4gIGlmIChyZXZlcnNlKSBlbHMgPSBbLi4uZWxzXS5yZXZlcnNlKClcblxuICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBlbHMubWFwKChlbCwgaSkgPT5cbiAgICAgIChlbCBhcyBIVE1MRWxlbWVudCkuYW5pbWF0ZShcbiAgICAgICAgc2xpZGVLZXlmcmFtZXModG8sIGZhbHNlKSxcbiAgICAgICAgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnLCBkZWxheTogaSAqIGdhcCB9XG4gICAgICApLmZpbmlzaGVkXG4gICAgKVxuICApXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gVXRpbGl0eTogcGFyc2UgYSBtaWxsaXNlY29uZCB2YWx1ZSBmcm9tIGEgc3RyaW5nIGxpa2UgXCI0MG1zXCIgb3IgYSBudW1iZXJcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5mdW5jdGlvbiBwYXJzZU1zKHZhbDogc3RyaW5nIHwgbnVtYmVyIHwgdW5kZWZpbmVkLCBmYWxsYmFjazogbnVtYmVyKTogbnVtYmVyIHtcbiAgaWYgKHZhbCA9PT0gdW5kZWZpbmVkIHx8IHZhbCA9PT0gbnVsbCkgcmV0dXJuIGZhbGxiYWNrXG4gIGlmICh0eXBlb2YgdmFsID09PSAnbnVtYmVyJykgcmV0dXJuIHZhbFxuICBjb25zdCBtID0gU3RyaW5nKHZhbCkubWF0Y2goL14oXFxkKyg/OlxcLlxcZCspPyltcyQvKVxuICBpZiAobSkgcmV0dXJuIHBhcnNlRmxvYXQobVsxXSEpXG4gIGNvbnN0IG4gPSBwYXJzZUZsb2F0KFN0cmluZyh2YWwpKVxuICByZXR1cm4gTnVtYmVyLmlzTmFOKG4pID8gZmFsbGJhY2sgOiBuXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gTW9kdWxlIGV4cG9ydFxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmNvbnN0IGFuaW1hdGlvbk1vZHVsZTogTEVTTW9kdWxlID0ge1xuICBuYW1lOiAnYW5pbWF0aW9uJyxcbiAgcHJpbWl0aXZlczoge1xuICAgICdmYWRlLWluJzogICAgICAgZmFkZUluLFxuICAgICdmYWRlLW91dCc6ICAgICAgZmFkZU91dCxcbiAgICAnc2xpZGUtaW4nOiAgICAgIHNsaWRlSW4sXG4gICAgJ3NsaWRlLW91dCc6ICAgICBzbGlkZU91dCxcbiAgICAnc2xpZGUtdXAnOiAgICAgIHNsaWRlVXAsXG4gICAgJ3NsaWRlLWRvd24nOiAgICBzbGlkZURvd24sXG4gICAgJ3B1bHNlJzogICAgICAgICBwdWxzZSxcbiAgICAnc3RhZ2dlci1lbnRlcic6IHN0YWdnZXJFbnRlcixcbiAgICAnc3RhZ2dlci1leGl0JzogIHN0YWdnZXJFeGl0LFxuICB9LFxufVxuXG5leHBvcnQgZGVmYXVsdCBhbmltYXRpb25Nb2R1bGVcbiIsICJpbXBvcnQgdHlwZSB7XG4gIExFU05vZGUsIEV4cHJOb2RlLCBTZXF1ZW5jZU5vZGUsIFBhcmFsbGVsTm9kZSxcbiAgU2V0Tm9kZSwgRW1pdE5vZGUsIEJyb2FkY2FzdE5vZGUsIFdhaXROb2RlLFxuICBDYWxsTm9kZSwgQmluZE5vZGUsIE1hdGNoTm9kZSwgVHJ5Tm9kZSwgQW5pbWF0aW9uTm9kZSxcbn0gZnJvbSAnQHBhcnNlci9hc3QuanMnXG5pbXBvcnQgdHlwZSB7IFBhdHRlcm5Ob2RlIH0gZnJvbSAnQHBhcnNlci9hc3QuanMnXG5pbXBvcnQgeyBMRVNTY29wZSB9IGZyb20gJy4vc2NvcGUuanMnXG5pbXBvcnQgdHlwZSB7IENvbW1hbmRSZWdpc3RyeSB9IGZyb20gJy4vcmVnaXN0cnkuanMnXG5pbXBvcnQgdHlwZSB7IE1vZHVsZVJlZ2lzdHJ5IH0gZnJvbSAnQG1vZHVsZXMvdHlwZXMuanMnXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gRXhlY3V0aW9uIGNvbnRleHQgXHUyMDE0IGV2ZXJ5dGhpbmcgdGhlIGV4ZWN1dG9yIG5lZWRzLCBwYXNzZWQgZG93biB0aGUgY2FsbCB0cmVlXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZXhwb3J0IGludGVyZmFjZSBMRVNDb250ZXh0IHtcbiAgLyoqIExvY2FsIHZhcmlhYmxlIHNjb3BlIGZvciB0aGUgY3VycmVudCBjYWxsIGZyYW1lICovXG4gIHNjb3BlOiBMRVNTY29wZVxuICAvKiogVGhlIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGhvc3QgZWxlbWVudCBcdTIwMTQgdXNlZCBhcyBxdWVyeVNlbGVjdG9yIHJvb3QgKi9cbiAgaG9zdDogRWxlbWVudFxuICAvKiogQ29tbWFuZCBkZWZpbml0aW9ucyByZWdpc3RlcmVkIGJ5IDxsb2NhbC1jb21tYW5kPiBjaGlsZHJlbiAqL1xuICBjb21tYW5kczogQ29tbWFuZFJlZ2lzdHJ5XG4gIC8qKiBBbmltYXRpb24gYW5kIG90aGVyIHByaW1pdGl2ZSBtb2R1bGVzICovXG4gIG1vZHVsZXM6IE1vZHVsZVJlZ2lzdHJ5XG4gIC8qKiBSZWFkIGEgRGF0YXN0YXIgc2lnbmFsIHZhbHVlIGJ5IG5hbWUgKHdpdGhvdXQgJCBwcmVmaXgpICovXG4gIGdldFNpZ25hbDogKG5hbWU6IHN0cmluZykgPT4gdW5rbm93blxuICAvKiogV3JpdGUgYSBEYXRhc3RhciBzaWduYWwgdmFsdWUgYnkgbmFtZSAod2l0aG91dCAkIHByZWZpeCkgKi9cbiAgc2V0U2lnbmFsOiAobmFtZTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bikgPT4gdm9pZFxuICAvKiogRGlzcGF0Y2ggYSBsb2NhbCBDdXN0b21FdmVudCBvbiB0aGUgaG9zdCAoYnViYmxlczogZmFsc2UpICovXG4gIGVtaXRMb2NhbDogKGV2ZW50OiBzdHJpbmcsIHBheWxvYWQ6IHVua25vd25bXSkgPT4gdm9pZFxuICAvKiogRGlzcGF0Y2ggYSBET00td2lkZSBDdXN0b21FdmVudCAoYnViYmxlczogdHJ1ZSwgY29tcG9zZWQ6IHRydWUpICovXG4gIGJyb2FkY2FzdDogKGV2ZW50OiBzdHJpbmcsIHBheWxvYWQ6IHVua25vd25bXSkgPT4gdm9pZFxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIE1haW4gZXhlY3V0b3Jcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEV4ZWN1dGVzIGEgTEVTTm9kZSBBU1QgaW4gdGhlIGdpdmVuIGNvbnRleHQuXG4gKlxuICogQXN5bmMgdHJhbnNwYXJlbmN5OiBldmVyeSBzdGVwIGlzIGF3YWl0ZWQgcmVnYXJkbGVzcyBvZiB3aGV0aGVyIGl0XG4gKiBpcyBzeW5jaHJvbm91cyBvciByZXR1cm5zIGEgUHJvbWlzZS4gVGhlIGF1dGhvciBuZXZlciB3cml0ZXMgYGF3YWl0YC5cbiAqIFRoZSBgdGhlbmAgY29ubmVjdGl2ZSBpbiBMRVMgc291cmNlIG1hcHMgdG8gc2VxdWVudGlhbCBgYXdhaXRgIGhlcmUuXG4gKiBUaGUgYGFuZGAgY29ubmVjdGl2ZSBtYXBzIHRvIGBQcm9taXNlLmFsbGAuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBleGVjdXRlKG5vZGU6IExFU05vZGUsIGN0eDogTEVTQ29udGV4dCk6IFByb21pc2U8dm9pZD4ge1xuICBzd2l0Y2ggKG5vZGUudHlwZSkge1xuXG4gICAgLy8gXHUyNTAwXHUyNTAwIFNlcXVlbmNlOiBBIHRoZW4gQiB0aGVuIEMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnc2VxdWVuY2UnOlxuICAgICAgZm9yIChjb25zdCBzdGVwIG9mIChub2RlIGFzIFNlcXVlbmNlTm9kZSkuc3RlcHMpIHtcbiAgICAgICAgYXdhaXQgZXhlY3V0ZShzdGVwLCBjdHgpXG4gICAgICB9XG4gICAgICByZXR1cm5cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBQYXJhbGxlbDogQSBhbmQgQiBhbmQgQyAoUHJvbWlzZS5hbGwpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3BhcmFsbGVsJzpcbiAgICAgIGF3YWl0IFByb21pc2UuYWxsKChub2RlIGFzIFBhcmFsbGVsTm9kZSkuYnJhbmNoZXMubWFwKGIgPT4gZXhlY3V0ZShiLCBjdHgpKSlcbiAgICAgIHJldHVyblxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIHNldCAkc2lnbmFsIHRvIGV4cHIgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnc2V0Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgU2V0Tm9kZVxuICAgICAgY29uc3QgdmFsdWUgPSBldmFsRXhwcihuLnZhbHVlLCBjdHgpXG4gICAgICBjdHguc2V0U2lnbmFsKG4uc2lnbmFsLCB2YWx1ZSlcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBlbWl0IGV2ZW50Om5hbWUgW3BheWxvYWRdIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ2VtaXQnOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBFbWl0Tm9kZVxuICAgICAgY29uc3QgcGF5bG9hZCA9IG4ucGF5bG9hZC5tYXAocCA9PiBldmFsRXhwcihwLCBjdHgpKVxuICAgICAgY3R4LmVtaXRMb2NhbChuLmV2ZW50LCBwYXlsb2FkKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIGJyb2FkY2FzdCBldmVudDpuYW1lIFtwYXlsb2FkXSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdicm9hZGNhc3QnOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBCcm9hZGNhc3ROb2RlXG4gICAgICBjb25zdCBwYXlsb2FkID0gbi5wYXlsb2FkLm1hcChwID0+IGV2YWxFeHByKHAsIGN0eCkpXG4gICAgICBjdHguYnJvYWRjYXN0KG4uZXZlbnQsIHBheWxvYWQpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgd2FpdCBObXMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnd2FpdCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIFdhaXROb2RlXG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPihyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbi5tcykpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgY2FsbCBjb21tYW5kOm5hbWUgW2FyZ3NdIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ2NhbGwnOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBDYWxsTm9kZVxuICAgICAgY29uc3QgZGVmID0gY3R4LmNvbW1hbmRzLmdldChuLmNvbW1hbmQpXG4gICAgICBpZiAoIWRlZikge1xuICAgICAgICBjb25zb2xlLndhcm4oYFtMRVNdIFVua25vd24gY29tbWFuZDogXCIke24uY29tbWFuZH1cImApXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICAvLyBFdmFsdWF0ZSBndWFyZCBcdTIwMTQgZmFsc3kgPSBzaWxlbnQgbm8tb3AgKG5vdCBhbiBlcnJvciwgbm8gcmVzY3VlKVxuICAgICAgaWYgKGRlZi5ndWFyZCkge1xuICAgICAgICBjb25zdCBwYXNzZXMgPSBldmFsR3VhcmQoZGVmLmd1YXJkLCBjdHgpXG4gICAgICAgIGlmICghcGFzc2VzKSB7XG4gICAgICAgICAgY29uc29sZS5kZWJ1ZyhgW0xFU10gY29tbWFuZCBcIiR7bi5jb21tYW5kfVwiIGd1YXJkIHJlamVjdGVkYClcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBCdWlsZCBjaGlsZCBzY29wZTogYmluZCBhcmdzIGludG8gaXRcbiAgICAgIGNvbnN0IGNoaWxkU2NvcGUgPSBjdHguc2NvcGUuY2hpbGQoKVxuICAgICAgY29uc3QgZXZhbGVkQXJnczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fVxuICAgICAgZm9yIChjb25zdCBba2V5LCBleHByTm9kZV0gb2YgT2JqZWN0LmVudHJpZXMobi5hcmdzKSkge1xuICAgICAgICBldmFsZWRBcmdzW2tleV0gPSBldmFsRXhwcihleHByTm9kZSwgY3R4KVxuICAgICAgfVxuXG4gICAgICAvLyBBcHBseSBhcmcgZGVmYXVsdHMgZnJvbSBkZWYgKFBoYXNlIDIgQXJnRGVmIHBhcnNpbmcgXHUyMDE0IHNpbXBsaWZpZWQgaGVyZSlcbiAgICAgIGZvciAoY29uc3QgYXJnRGVmIG9mIGRlZi5hcmdzKSB7XG4gICAgICAgIGlmICghKGFyZ0RlZi5uYW1lIGluIGV2YWxlZEFyZ3MpICYmIGFyZ0RlZi5kZWZhdWx0KSB7XG4gICAgICAgICAgZXZhbGVkQXJnc1thcmdEZWYubmFtZV0gPSBldmFsRXhwcihhcmdEZWYuZGVmYXVsdCwgY3R4KVxuICAgICAgICB9XG4gICAgICAgIGNoaWxkU2NvcGUuc2V0KGFyZ0RlZi5uYW1lLCBldmFsZWRBcmdzW2FyZ0RlZi5uYW1lXSA/PyBudWxsKVxuICAgICAgfVxuXG4gICAgICBjb25zdCBjaGlsZEN0eDogTEVTQ29udGV4dCA9IHsgLi4uY3R4LCBzY29wZTogY2hpbGRTY29wZSB9XG4gICAgICBhd2FpdCBleGVjdXRlKGRlZi5ib2R5LCBjaGlsZEN0eClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBuYW1lIDwtIEB2ZXJiICd1cmwnIFthcmdzXSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdiaW5kJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQmluZE5vZGVcbiAgICAgIGNvbnN0IHsgdmVyYiwgdXJsLCBhcmdzIH0gPSBuLmFjdGlvblxuICAgICAgY29uc3QgZXZhbGVkQXJnczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fVxuICAgICAgZm9yIChjb25zdCBba2V5LCBleHByTm9kZV0gb2YgT2JqZWN0LmVudHJpZXMoYXJncykpIHtcbiAgICAgICAgZXZhbGVkQXJnc1trZXldID0gZXZhbEV4cHIoZXhwck5vZGUsIGN0eClcbiAgICAgIH1cblxuICAgICAgbGV0IHJlc3VsdDogdW5rbm93blxuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgcGVyZm9ybUFjdGlvbih2ZXJiLCB1cmwsIGV2YWxlZEFyZ3MsIGN0eClcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBQcm9wYWdhdGUgc28gZW5jbG9zaW5nIHRyeS9yZXNjdWUgY2FuIGNhdGNoIGl0XG4gICAgICAgIHRocm93IGVyclxuICAgICAgfVxuXG4gICAgICBjdHguc2NvcGUuc2V0KG4ubmFtZSwgcmVzdWx0KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIG1hdGNoIHN1YmplY3QgLyBhcm1zIC8gL21hdGNoIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ21hdGNoJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgTWF0Y2hOb2RlXG4gICAgICBjb25zdCBzdWJqZWN0ID0gZXZhbEV4cHIobi5zdWJqZWN0LCBjdHgpXG5cbiAgICAgIGZvciAoY29uc3QgYXJtIG9mIG4uYXJtcykge1xuICAgICAgICBjb25zdCBiaW5kaW5ncyA9IG1hdGNoUGF0dGVybnMoYXJtLnBhdHRlcm5zLCBzdWJqZWN0KVxuICAgICAgICBpZiAoYmluZGluZ3MgIT09IG51bGwpIHtcbiAgICAgICAgICAvLyBDcmVhdGUgY2hpbGQgc2NvcGUgd2l0aCBwYXR0ZXJuIGJpbmRpbmdzXG4gICAgICAgICAgY29uc3QgYXJtU2NvcGUgPSBjdHguc2NvcGUuY2hpbGQoKVxuICAgICAgICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKGJpbmRpbmdzKSkge1xuICAgICAgICAgICAgYXJtU2NvcGUuc2V0KGssIHYpXG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGFybUN0eDogTEVTQ29udGV4dCA9IHsgLi4uY3R4LCBzY29wZTogYXJtU2NvcGUgfVxuICAgICAgICAgIGF3YWl0IGV4ZWN1dGUoYXJtLmJvZHksIGFybUN0eClcbiAgICAgICAgICByZXR1cm4gICAvLyBGaXJzdCBtYXRjaGluZyBhcm0gd2lucyBcdTIwMTQgbm8gZmFsbHRocm91Z2hcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIG1hdGNoOiBubyBhcm0gbWF0Y2hlZCBzdWJqZWN0OicsIHN1YmplY3QpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgdHJ5IC8gcmVzY3VlIC8gYWZ0ZXJ3YXJkcyAvIC90cnkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAndHJ5Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgVHJ5Tm9kZVxuICAgICAgbGV0IHRocmV3ID0gZmFsc2VcblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZXhlY3V0ZShuLmJvZHksIGN0eClcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICB0aHJldyA9IHRydWVcbiAgICAgICAgaWYgKG4ucmVzY3VlKSB7XG4gICAgICAgICAgLy8gQmluZCB0aGUgZXJyb3IgYXMgYCRlcnJvcmAgaW4gdGhlIHJlc2N1ZSBzY29wZVxuICAgICAgICAgIGNvbnN0IHJlc2N1ZVNjb3BlID0gY3R4LnNjb3BlLmNoaWxkKClcbiAgICAgICAgICByZXNjdWVTY29wZS5zZXQoJ2Vycm9yJywgZXJyKVxuICAgICAgICAgIGNvbnN0IHJlc2N1ZUN0eDogTEVTQ29udGV4dCA9IHsgLi4uY3R4LCBzY29wZTogcmVzY3VlU2NvcGUgfVxuICAgICAgICAgIGF3YWl0IGV4ZWN1dGUobi5yZXNjdWUsIHJlc2N1ZUN0eClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBObyByZXNjdWUgY2xhdXNlIFx1MjAxNCByZS10aHJvdyBzbyBvdXRlciB0cnkgY2FuIGNhdGNoIGl0XG4gICAgICAgICAgdGhyb3cgZXJyXG4gICAgICAgIH1cbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIGlmIChuLmFmdGVyd2FyZHMpIHtcbiAgICAgICAgICAvLyBhZnRlcndhcmRzIGFsd2F5cyBydW5zIGlmIGV4ZWN1dGlvbiBlbnRlcmVkIHRoZSB0cnkgYm9keVxuICAgICAgICAgIC8vIChndWFyZCByZWplY3Rpb24gbmV2ZXIgcmVhY2hlcyBoZXJlIFx1MjAxNCBzZWUgYGNhbGxgIGhhbmRsZXIgYWJvdmUpXG4gICAgICAgICAgYXdhaXQgZXhlY3V0ZShuLmFmdGVyd2FyZHMsIGN0eClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAodGhyZXcgJiYgIW4ucmVzY3VlKSB7XG4gICAgICAgIC8vIEFscmVhZHkgcmUtdGhyb3duIGFib3ZlIFx1MjAxNCB1bnJlYWNoYWJsZSwgYnV0IFR5cGVTY3JpcHQgbmVlZHMgdGhpc1xuICAgICAgfVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIGFuaW1hdGlvbiBwcmltaXRpdmUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnYW5pbWF0aW9uJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQW5pbWF0aW9uTm9kZVxuICAgICAgY29uc3QgcHJpbWl0aXZlID0gY3R4Lm1vZHVsZXMuZ2V0KG4ucHJpbWl0aXZlKVxuXG4gICAgICBpZiAoIXByaW1pdGl2ZSkge1xuICAgICAgICBjb25zb2xlLndhcm4oY3R4Lm1vZHVsZXMuaGludEZvcihuLnByaW1pdGl2ZSkpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICAvLyBSZXNvbHZlIHNlbGVjdG9yIFx1MjAxNCBzdWJzdGl0dXRlIGFueSBsb2NhbCB2YXJpYWJsZSByZWZlcmVuY2VzXG4gICAgICBjb25zdCBzZWxlY3RvciA9IHJlc29sdmVTZWxlY3RvcihuLnNlbGVjdG9yLCBjdHgpXG5cbiAgICAgIC8vIEV2YWx1YXRlIG9wdGlvbnNcbiAgICAgIGNvbnN0IG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge31cbiAgICAgIGZvciAoY29uc3QgW2tleSwgZXhwck5vZGVdIG9mIE9iamVjdC5lbnRyaWVzKG4ub3B0aW9ucykpIHtcbiAgICAgICAgb3B0aW9uc1trZXldID0gZXZhbEV4cHIoZXhwck5vZGUsIGN0eClcbiAgICAgIH1cblxuICAgICAgLy8gQXdhaXQgdGhlIGFuaW1hdGlvbiBcdTIwMTQgdGhpcyBpcyB0aGUgY29yZSBvZiBhc3luYyB0cmFuc3BhcmVuY3k6XG4gICAgICAvLyBXZWIgQW5pbWF0aW9ucyBBUEkgcmV0dXJucyBhbiBBbmltYXRpb24gd2l0aCBhIC5maW5pc2hlZCBQcm9taXNlLlxuICAgICAgLy8gYHRoZW5gIGluIExFUyBzb3VyY2UgYXdhaXRzIHRoaXMgbmF0dXJhbGx5LlxuICAgICAgYXdhaXQgcHJpbWl0aXZlKHNlbGVjdG9yLCBuLmR1cmF0aW9uLCBuLmVhc2luZywgb3B0aW9ucywgY3R4Lmhvc3QpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgcmF3IGV4cHJlc3Npb24gKGVzY2FwZSBoYXRjaCAvIHVua25vd24gc3RhdGVtZW50cykgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnZXhwcic6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIEV4cHJOb2RlXG4gICAgICBpZiAobi5yYXcudHJpbSgpKSB7XG4gICAgICAgIC8vIEV2YWx1YXRlIGFzIGEgSlMgZXhwcmVzc2lvbiBmb3Igc2lkZSBlZmZlY3RzXG4gICAgICAgIC8vIFRoaXMgaGFuZGxlcyB1bmtub3duIHByaW1pdGl2ZXMgYW5kIGZ1dHVyZSBrZXl3b3JkcyBncmFjZWZ1bGx5XG4gICAgICAgIGV2YWxFeHByKG4sIGN0eClcbiAgICAgIH1cbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBhY3Rpb24gKGJhcmUgQGdldCBldGMuIG5vdCBpbnNpZGUgYSBiaW5kKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdhY3Rpb24nOiB7XG4gICAgICAvLyBCYXJlIGFjdGlvbnMgd2l0aG91dCBiaW5kIGp1c3QgZmlyZSBhbmQgZGlzY2FyZCB0aGUgcmVzdWx0XG4gICAgICBjb25zdCBuID0gbm9kZVxuICAgICAgYXdhaXQgcGVyZm9ybUFjdGlvbihuLnZlcmIsIG4udXJsLCB7fSwgY3R4KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgZGVmYXVsdDoge1xuICAgICAgY29uc3QgZXhoYXVzdGl2ZTogbmV2ZXIgPSBub2RlXG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIFVua25vd24gbm9kZSB0eXBlOicsIChleGhhdXN0aXZlIGFzIExFU05vZGUpLnR5cGUpXG4gICAgfVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gRXhwcmVzc2lvbiBldmFsdWF0aW9uXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBFdmFsdWF0ZXMgYSByYXcgSlMgZXhwcmVzc2lvbiBzdHJpbmcgaW4gYSBzYW5kYm94ZWQgY29udGV4dCB0aGF0XG4gKiBleHBvc2VzIHNjb3BlIGxvY2FscyBhbmQgRGF0YXN0YXIgc2lnbmFscyB2aWEgYSBQcm94eS5cbiAqXG4gKiBTaWduYWwgYWNjZXNzOiBgJGZlZWRTdGF0ZWAgXHUyMTkyIHJlYWRzIHRoZSBgZmVlZFN0YXRlYCBzaWduYWxcbiAqIExvY2FsIGFjY2VzczogIGBmaWx0ZXJgICAgIFx1MjE5MiByZWFkcyBmcm9tIHNjb3BlXG4gKlxuICogVGhlIHNhbmRib3ggaXMgaW50ZW50aW9uYWxseSBzaW1wbGUgZm9yIFBoYXNlIDMuIEEgcHJvcGVyIHNhbmRib3hcbiAqIChDU1AtY29tcGF0aWJsZSwgbm8gZXZhbCBmYWxsYmFjaykgaXMgYSBmdXR1cmUgaGFyZGVuaW5nIHRhc2suXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBldmFsRXhwcihub2RlOiBFeHByTm9kZSwgY3R4OiBMRVNDb250ZXh0KTogdW5rbm93biB7XG4gIGlmICghbm9kZS5yYXcudHJpbSgpKSByZXR1cm4gdW5kZWZpbmVkXG5cbiAgLy8gRmFzdCBwYXRoOiBzaW1wbGUgc3RyaW5nIGxpdGVyYWxcbiAgaWYgKG5vZGUucmF3LnN0YXJ0c1dpdGgoXCInXCIpICYmIG5vZGUucmF3LmVuZHNXaXRoKFwiJ1wiKSkge1xuICAgIHJldHVybiBub2RlLnJhdy5zbGljZSgxLCAtMSlcbiAgfVxuICAvLyBGYXN0IHBhdGg6IG51bWJlciBsaXRlcmFsXG4gIGNvbnN0IG51bSA9IE51bWJlcihub2RlLnJhdylcbiAgaWYgKCFOdW1iZXIuaXNOYU4obnVtKSAmJiBub2RlLnJhdy50cmltKCkgIT09ICcnKSByZXR1cm4gbnVtXG4gIC8vIEZhc3QgcGF0aDogYm9vbGVhblxuICBpZiAobm9kZS5yYXcgPT09ICd0cnVlJykgIHJldHVybiB0cnVlXG4gIGlmIChub2RlLnJhdyA9PT0gJ2ZhbHNlJykgcmV0dXJuIGZhbHNlXG4gIGlmIChub2RlLnJhdyA9PT0gJ251bGwnIHx8IG5vZGUucmF3ID09PSAnbmlsJykgcmV0dXJuIG51bGxcblxuICAvLyBcdTI1MDBcdTI1MDAgRmFzdCBwYXRocyBmb3IgY29tbW9uIGFuaW1hdGlvbi9vcHRpb24gdmFsdWUgcGF0dGVybnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gIC8vIFRoZXNlIGFyZSBub3QgdmFsaWQgSlMgZXhwcmVzc2lvbnMgYnV0IGFwcGVhciBmcmVxdWVudGx5IGFzIG9wdGlvbiB2YWx1ZXM6XG4gIC8vICAgXCIyMG1zXCIgXHUyMTkyIGR1cmF0aW9uIGxpdGVyYWwgKHJldHVybmVkIGFzLWlzIGZvciBwYXJzZU1zKCkgdG8gaGFuZGxlKVxuICAvLyAgIFwicmV2ZXJzZVwiLCBcInJpZ2h0XCIsIFwibGVmdFwiLCBcInVwXCIsIFwiZG93blwiIFx1MjE5MiBkaXJlY3Rpb24ga2V5d29yZHNcbiAgLy8gICBBbnkgYmFyZSB3b3JkIChubyBzcGFjZXMsIG5vIG9wZXJhdG9ycykgXHUyMTkyIHJldHVybiBhcyBzdHJpbmdcbiAgaWYgKC9eXFxkKyhcXC5cXGQrKT9tcyQvLnRlc3Qobm9kZS5yYXcpKSByZXR1cm4gbm9kZS5yYXcgICAvLyBkdXJhdGlvbiBsaXRlcmFsXG4gIGlmICgvXlthLXpBLVpdW2EtekEtWjAtOV8tXSokLy50ZXN0KG5vZGUucmF3KSkgcmV0dXJuIG5vZGUucmF3ICAvLyBiYXJlIGlkZW50aWZpZXJcblxuICB0cnkge1xuICAgIC8vIEJ1aWxkIGEgZmxhdCBvYmplY3Qgb2YgYWxsIGFjY2Vzc2libGUgbmFtZXM6XG4gICAgLy8gLSBTY29wZSBsb2NhbHMgKGlubmVybW9zdCB3aW5zKVxuICAgIC8vIC0gRGF0YXN0YXIgc2lnbmFscyB2aWEgJC1wcmVmaXggc3RyaXBwaW5nXG4gICAgY29uc3Qgc2NvcGVTbmFwc2hvdCA9IGN0eC5zY29wZS5zbmFwc2hvdCgpXG5cbiAgICAvLyBFeHRyYWN0IHNpZ25hbCByZWZlcmVuY2VzIGZyb20gdGhlIGV4cHJlc3Npb24gKCRuYW1lIFx1MjE5MiBuYW1lKVxuICAgIGNvbnN0IHNpZ25hbE5hbWVzID0gWy4uLm5vZGUucmF3Lm1hdGNoQWxsKC9cXCQoW2EtekEtWl9dXFx3KikvZyldXG4gICAgICAubWFwKG0gPT4gbVsxXSEpXG5cbiAgICBjb25zdCBzaWduYWxzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHNpZ25hbE5hbWVzKSB7XG4gICAgICBzaWduYWxzW25hbWVdID0gY3R4LmdldFNpZ25hbChuYW1lKVxuICAgIH1cblxuICAgIC8vIFJld3JpdGUgJG5hbWUgXHUyMTkyIF9fc2lnX25hbWUgaW4gdGhlIGV4cHJlc3Npb24gc28gd2UgY2FuIHBhc3Mgc2lnbmFsc1xuICAgIC8vIGFzIHBsYWluIHZhcmlhYmxlcyAoYXZvaWRzICQgaW4gSlMgaWRlbnRpZmllcnMpXG4gICAgbGV0IHJld3JpdHRlbiA9IG5vZGUucmF3XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHNpZ25hbE5hbWVzKSB7XG4gICAgICByZXdyaXR0ZW4gPSByZXdyaXR0ZW4ucmVwbGFjZUFsbChgJCR7bmFtZX1gLCBgX19zaWdfJHtuYW1lfWApXG4gICAgfVxuXG4gICAgLy8gUHJlZml4IHNpZ25hbCB2YXJzIGluIHRoZSBiaW5kaW5nIG9iamVjdFxuICAgIGNvbnN0IHNpZ0JpbmRpbmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgZm9yIChjb25zdCBbaywgdl0gb2YgT2JqZWN0LmVudHJpZXMoc2lnbmFscykpIHtcbiAgICAgIHNpZ0JpbmRpbmdzW2BfX3NpZ18ke2t9YF0gPSB2XG4gICAgfVxuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLW5ldy1mdW5jXG4gICAgY29uc3QgZm4gPSBuZXcgRnVuY3Rpb24oXG4gICAgICAuLi5PYmplY3Qua2V5cyhzY29wZVNuYXBzaG90KSxcbiAgICAgIC4uLk9iamVjdC5rZXlzKHNpZ0JpbmRpbmdzKSxcbiAgICAgIGByZXR1cm4gKCR7cmV3cml0dGVufSlgXG4gICAgKVxuICAgIHJldHVybiBmbihcbiAgICAgIC4uLk9iamVjdC52YWx1ZXMoc2NvcGVTbmFwc2hvdCksXG4gICAgICAuLi5PYmplY3QudmFsdWVzKHNpZ0JpbmRpbmdzKVxuICAgIClcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTXSBFeHByZXNzaW9uIGV2YWwgZXJyb3I6ICR7SlNPTi5zdHJpbmdpZnkobm9kZS5yYXcpfWAsIGVycilcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cbn1cblxuLyoqXG4gKiBFdmFsdWF0ZXMgYSBndWFyZCBleHByZXNzaW9uIHN0cmluZyAoZnJvbSBjb21tYW5kIGBndWFyZGAgYXR0cmlidXRlKS5cbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ3VhcmQgcGFzc2VzIChjb21tYW5kIHNob3VsZCBydW4pLCBmYWxzZSB0byBzaWxlbnQtYWJvcnQuXG4gKi9cbmZ1bmN0aW9uIGV2YWxHdWFyZChndWFyZEV4cHI6IHN0cmluZywgY3R4OiBMRVNDb250ZXh0KTogYm9vbGVhbiB7XG4gIGNvbnN0IHJlc3VsdCA9IGV2YWxFeHByKHsgdHlwZTogJ2V4cHInLCByYXc6IGd1YXJkRXhwciB9LCBjdHgpXG4gIHJldHVybiBCb29sZWFuKHJlc3VsdClcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXR0ZXJuIG1hdGNoaW5nXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBBdHRlbXB0cyB0byBtYXRjaCBgc3ViamVjdGAgYWdhaW5zdCBgcGF0dGVybnNgLlxuICpcbiAqIFJldHVybnMgYSBiaW5kaW5ncyBtYXAgaWYgbWF0Y2hlZCAoZW1wdHkgbWFwIGZvciB3aWxkY2FyZC9saXRlcmFsIG1hdGNoZXMpLFxuICogb3IgbnVsbCBpZiB0aGUgbWF0Y2ggZmFpbHMuXG4gKlxuICogRm9yIHR1cGxlIHBhdHRlcm5zLCBgc3ViamVjdGAgaXMgbWF0Y2hlZCBlbGVtZW50LWJ5LWVsZW1lbnQuXG4gKiBGb3Igb3ItcGF0dGVybnMsIGFueSBhbHRlcm5hdGl2ZSBtYXRjaGluZyByZXR1cm5zIHRoZSBiaW5kaW5ncy5cbiAqL1xuZnVuY3Rpb24gbWF0Y2hQYXR0ZXJucyhcbiAgcGF0dGVybnM6IFBhdHRlcm5Ob2RlW10sXG4gIHN1YmplY3Q6IHVua25vd25cbik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbCB7XG4gIC8vIFNpbmdsZS1wYXR0ZXJuIChtb3N0IGNvbW1vbik6IG1hdGNoIGRpcmVjdGx5XG4gIGlmIChwYXR0ZXJucy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbWF0Y2hTaW5nbGUocGF0dGVybnNbMF0hLCBzdWJqZWN0KVxuICB9XG5cbiAgLy8gVHVwbGUgcGF0dGVybjogc3ViamVjdCBtdXN0IGJlIGFuIGFycmF5XG4gIGlmICghQXJyYXkuaXNBcnJheShzdWJqZWN0KSkge1xuICAgIC8vIFdyYXAgc2luZ2xlIHZhbHVlIGluIHR1cGxlIGZvciBlcmdvbm9taWNzXG4gICAgLy8gZS5nLiBgW2l0IG9rXWAgYWdhaW5zdCBhIHtvazogdHJ1ZSwgZGF0YTogLi4ufSByZXNwb25zZVxuICAgIHJldHVybiBtYXRjaFR1cGxlKHBhdHRlcm5zLCBzdWJqZWN0KVxuICB9XG5cbiAgcmV0dXJuIG1hdGNoVHVwbGUocGF0dGVybnMsIHN1YmplY3QpXG59XG5cbmZ1bmN0aW9uIG1hdGNoVHVwbGUoXG4gIHBhdHRlcm5zOiBQYXR0ZXJuTm9kZVtdLFxuICBzdWJqZWN0OiB1bmtub3duXG4pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IG51bGwge1xuICAvLyBGb3Igbm9uLWFycmF5IHN1YmplY3RzLCB0cnkgYmluZGluZyBlYWNoIHBhdHRlcm4gYWdhaW5zdCB0aGUgd2hvbGUgc3ViamVjdFxuICAvLyAoaGFuZGxlcyBgW2l0IG9rXWAgbWF0Y2hpbmcgYW4gb2JqZWN0IHdoZXJlIGBpdGAgPSBvYmplY3QsIGBva2AgPSBzdGF0dXMpXG4gIGNvbnN0IGJpbmRpbmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXR0ZXJucy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHBhdCA9IHBhdHRlcm5zW2ldIVxuXG4gICAgLy8gRm9yIHR1cGxlIHBhdHRlcm5zIGFnYWluc3Qgb2JqZWN0cywgd2UgZG8gYSBzdHJ1Y3R1cmFsIG1hdGNoOlxuICAgIC8vIGBbaXQgb2tdYCBhZ2FpbnN0IHtkYXRhOiAuLi4sIHN0YXR1czogJ29rJ30gYmluZHMgYGl0YCA9IGRhdGEsIGBva2AgPSAnb2snXG4gICAgLy8gVGhpcyBpcyBhIHNpbXBsaWZpY2F0aW9uIFx1MjAxNCBmdWxsIHN0cnVjdHVyYWwgbWF0Y2hpbmcgY29tZXMgaW4gYSBsYXRlciBwYXNzXG4gICAgY29uc3QgdmFsdWUgPSBBcnJheS5pc0FycmF5KHN1YmplY3QpXG4gICAgICA/IHN1YmplY3RbaV1cbiAgICAgIDogaSA9PT0gMCA/IHN1YmplY3QgOiB1bmRlZmluZWRcblxuICAgIGNvbnN0IHJlc3VsdCA9IG1hdGNoU2luZ2xlKHBhdCwgdmFsdWUpXG4gICAgaWYgKHJlc3VsdCA9PT0gbnVsbCkgcmV0dXJuIG51bGxcbiAgICBPYmplY3QuYXNzaWduKGJpbmRpbmdzLCByZXN1bHQpXG4gIH1cblxuICByZXR1cm4gYmluZGluZ3Ncbn1cblxuZnVuY3Rpb24gbWF0Y2hTaW5nbGUoXG4gIHBhdHRlcm46IFBhdHRlcm5Ob2RlLFxuICB2YWx1ZTogdW5rbm93blxuKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsIHtcbiAgc3dpdGNoIChwYXR0ZXJuLmtpbmQpIHtcbiAgICBjYXNlICd3aWxkY2FyZCc6XG4gICAgICByZXR1cm4ge30gICAvLyBBbHdheXMgbWF0Y2hlcywgYmluZHMgbm90aGluZ1xuXG4gICAgY2FzZSAnbGl0ZXJhbCc6XG4gICAgICByZXR1cm4gdmFsdWUgPT09IHBhdHRlcm4udmFsdWUgPyB7fSA6IG51bGxcblxuICAgIGNhc2UgJ2JpbmRpbmcnOlxuICAgICAgcmV0dXJuIHsgW3BhdHRlcm4ubmFtZV06IHZhbHVlIH0gICAvLyBBbHdheXMgbWF0Y2hlcywgYmluZHMgbmFtZSBcdTIxOTIgdmFsdWVcblxuICAgIGNhc2UgJ29yJzoge1xuICAgICAgZm9yIChjb25zdCBhbHQgb2YgcGF0dGVybi5wYXR0ZXJucykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBtYXRjaFNpbmdsZShhbHQsIHZhbHVlKVxuICAgICAgICBpZiAocmVzdWx0ICE9PSBudWxsKSByZXR1cm4gcmVzdWx0XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEhUVFAgYWN0aW9uXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBQZXJmb3JtcyBhbiBIVFRQIGFjdGlvbiAoQGdldCwgQHBvc3QsIGV0Yy4pLlxuICpcbiAqIFdoZW4gRGF0YXN0YXIgYWN0aW9ucyBhcmUgYXZhaWxhYmxlIGluIHRoZSBob3N0J3MgY29udGV4dCwgd2UgdHJpZ2dlclxuICogRGF0YXN0YXIncyBmZXRjaCBwaXBlbGluZSAod2hpY2ggaGFuZGxlcyBzaWduYWwgc2VyaWFsaXphdGlvbiwgU1NFXG4gKiByZXNwb25zZSBwcm9jZXNzaW5nLCBhbmQgaW5kaWNhdG9yIHNpZ25hbHMpLlxuICpcbiAqIEZhbGxzIGJhY2sgdG8gbmF0aXZlIGZldGNoIHdoZW4gRGF0YXN0YXIgaXMgbm90IHByZXNlbnQuXG4gKlxuICogTm90ZTogRGF0YXN0YXIncyBAZ2V0IC8gQHBvc3QgYXJlIGZpcmUtYW5kLWZvcmdldCAodGhleSBzdHJlYW0gU1NFIGJhY2tcbiAqIHRvIHBhdGNoIHNpZ25hbHMvZWxlbWVudHMpLiBGb3IgdGhlIGJpbmQgY2FzZSAoYHJlc3BvbnNlIDwtIEBnZXQgLi4uYClcbiAqIHdlIHVzZSBuYXRpdmUgZmV0Y2ggdG8gZ2V0IGEgUHJvbWlzZS1iYXNlZCBKU09OIHJlc3BvbnNlIHRoYXQgTEVTIGNhblxuICogYmluZCB0byBhIGxvY2FsIHZhcmlhYmxlLlxuICovXG5hc3luYyBmdW5jdGlvbiBwZXJmb3JtQWN0aW9uKFxuICB2ZXJiOiBzdHJpbmcsXG4gIHVybDogc3RyaW5nLFxuICBhcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgY3R4OiBMRVNDb250ZXh0XG4pOiBQcm9taXNlPHVua25vd24+IHtcbiAgY29uc3QgbWV0aG9kID0gdmVyYi50b1VwcGVyQ2FzZSgpXG5cbiAgbGV0IGZ1bGxVcmwgPSB1cmxcbiAgbGV0IGJvZHk6IHN0cmluZyB8IHVuZGVmaW5lZFxuXG4gIGlmIChtZXRob2QgPT09ICdHRVQnIHx8IG1ldGhvZCA9PT0gJ0RFTEVURScpIHtcbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKClcbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhhcmdzKSkge1xuICAgICAgcGFyYW1zLnNldChrLCBTdHJpbmcodikpXG4gICAgfVxuICAgIGNvbnN0IHFzID0gcGFyYW1zLnRvU3RyaW5nKClcbiAgICBpZiAocXMpIGZ1bGxVcmwgPSBgJHt1cmx9PyR7cXN9YFxuICB9IGVsc2Uge1xuICAgIGJvZHkgPSBKU09OLnN0cmluZ2lmeShhcmdzKVxuICB9XG5cbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChmdWxsVXJsLCB7XG4gICAgbWV0aG9kLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgIH0sXG4gICAgLi4uKGJvZHkgPyB7IGJvZHkgfSA6IHt9KSxcbiAgfSlcblxuICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBbTEVTXSBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfSBmcm9tICR7bWV0aG9kfSAke3VybH1gKVxuICB9XG5cbiAgY29uc3QgY29udGVudFR5cGUgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnY29udGVudC10eXBlJykgPz8gJydcbiAgaWYgKGNvbnRlbnRUeXBlLmluY2x1ZGVzKCdhcHBsaWNhdGlvbi9qc29uJykpIHtcbiAgICByZXR1cm4gYXdhaXQgcmVzcG9uc2UuanNvbigpXG4gIH1cbiAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLnRleHQoKVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFNlbGVjdG9yIHJlc29sdXRpb25cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFJlc29sdmVzIHZhcmlhYmxlIHJlZmVyZW5jZXMgaW4gYW4gYW5pbWF0aW9uIHNlbGVjdG9yLlxuICpcbiAqIEV4YW1wbGU6IGBbZGF0YS1pdGVtLWlkOiBpZF1gIHdoZXJlIGBpZGAgaXMgYSBsb2NhbCB2YXJpYWJsZVxuICogYmVjb21lcyBgW2RhdGEtaXRlbS1pZD1cIjEyM1wiXWAgYWZ0ZXIgc3Vic3RpdHV0aW9uLlxuICpcbiAqIFNpbXBsZSBhcHByb2FjaCBmb3IgUGhhc2UgMzogbG9vayBmb3IgYDogdmFybmFtZWAgcGF0dGVybnMgaW4gYXR0cmlidXRlXG4gKiBzZWxlY3RvcnMgYW5kIHN1YnN0aXR1dGUgZnJvbSBzY29wZS5cbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZVNlbGVjdG9yKHNlbGVjdG9yOiBzdHJpbmcsIGN0eDogTEVTQ29udGV4dCk6IHN0cmluZyB7XG4gIC8vIEhhbmRsZSBhdHRyaWJ1dGUgc2VsZWN0b3Igd2l0aCB2YXJpYWJsZTogW2RhdGEtaXRlbS1pZDogaWRdXG4gIHJldHVybiBzZWxlY3Rvci5yZXBsYWNlKC9cXFsoW15cXF1dKyk6XFxzKihcXHcrKVxcXS9nLCAoX21hdGNoLCBhdHRyLCB2YXJOYW1lKSA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSBjdHguc2NvcGUuZ2V0KHZhck5hbWUpID8/IGN0eC5nZXRTaWduYWwodmFyTmFtZSlcbiAgICByZXR1cm4gYFske2F0dHJ9PVwiJHtTdHJpbmcodmFsdWUpfVwiXWBcbiAgfSlcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBHdWFyZC1hd2FyZSBjb21tYW5kIGV4ZWN1dGlvbiAodXNlZCBieSBQaGFzZSA0IGV2ZW50IHdpcmluZylcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEV4ZWN1dGVzIGEgY29tbWFuZCBieSBuYW1lLCBjaGVja2luZyBpdHMgZ3VhcmQgZmlyc3QuXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGNvbW1hbmQgcmFuLCBmYWxzZSBpZiB0aGUgZ3VhcmQgcmVqZWN0ZWQgaXQuXG4gKlxuICogVGhpcyBpcyB0aGUgcHVibGljIEFQSSBmb3IgUGhhc2UgNCBldmVudCBoYW5kbGVycyB0aGF0IGNhbGwgY29tbWFuZHMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5Db21tYW5kKFxuICBuYW1lOiBzdHJpbmcsXG4gIGFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICBjdHg6IExFU0NvbnRleHRcbik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCBkZWYgPSBjdHguY29tbWFuZHMuZ2V0KG5hbWUpXG4gIGlmICghZGVmKSB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTXSBVbmtub3duIGNvbW1hbmQ6IFwiJHtuYW1lfVwiYClcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGlmIChkZWYuZ3VhcmQpIHtcbiAgICBpZiAoIWV2YWxHdWFyZChkZWYuZ3VhcmQsIGN0eCkpIHJldHVybiBmYWxzZVxuICB9XG5cbiAgY29uc3Qgc2NvcGUgPSBjdHguc2NvcGUuY2hpbGQoKVxuICBmb3IgKGNvbnN0IGFyZ0RlZiBvZiBkZWYuYXJncykge1xuICAgIHNjb3BlLnNldChhcmdEZWYubmFtZSwgYXJnc1thcmdEZWYubmFtZV0gPz8gbnVsbClcbiAgfVxuXG4gIGF3YWl0IGV4ZWN1dGUoZGVmLmJvZHksIHsgLi4uY3R4LCBzY29wZSB9KVxuICByZXR1cm4gdHJ1ZVxufVxuIiwgImltcG9ydCB0eXBlIHsgTEVTTm9kZSwgRXhwck5vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuLyoqIEEgc2luZ2xlIHR5cGVkIGFyZ3VtZW50IGRlZmluaXRpb24gZnJvbSBhcmdzPVwiW25hbWU6dHlwZSAgLi4uXVwiICovXG5leHBvcnQgaW50ZXJmYWNlIEFyZ0RlZiB7XG4gIG5hbWU6IHN0cmluZ1xuICAvKiogJ25pbCcgfCAnaW50JyB8ICdkZWMnIHwgJ3N0cicgfCAnYXJyJyB8ICdvYmonIHwgJ2Jvb2wnIHwgJ2R5bicgKi9cbiAgdHlwZTogc3RyaW5nXG4gIC8qKiBEZWZhdWx0IHZhbHVlIGV4cHJlc3Npb24sIGlmIHByb3ZpZGVkIChlLmcuIGF0dGVtcHQ6aW50PTApICovXG4gIGRlZmF1bHQ/OiBFeHByTm9kZVxufVxuXG4vKiogQSBmdWxseSBwYXJzZWQgPGxvY2FsLWNvbW1hbmQ+IGRlZmluaXRpb24uICovXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmREZWYge1xuICBuYW1lOiBzdHJpbmdcbiAgYXJnczogQXJnRGVmW11cbiAgLyoqIEd1YXJkIGV4cHJlc3Npb24gc3RyaW5nIFx1MjAxNCBldmFsdWF0ZWQgYmVmb3JlIGV4ZWN1dGlvbi4gRmFsc3kgPSBzaWxlbnQgbm8tb3AuICovXG4gIGd1YXJkPzogc3RyaW5nXG4gIC8qKiBUaGUgcGFyc2VkIGJvZHkgQVNUICovXG4gIGJvZHk6IExFU05vZGVcbiAgLyoqIFRoZSA8bG9jYWwtY29tbWFuZD4gRE9NIGVsZW1lbnQsIGtlcHQgZm9yIGVycm9yIHJlcG9ydGluZyAqL1xuICBlbGVtZW50OiBFbGVtZW50XG59XG5cbmV4cG9ydCBjbGFzcyBDb21tYW5kUmVnaXN0cnkge1xuICBwcml2YXRlIGNvbW1hbmRzID0gbmV3IE1hcDxzdHJpbmcsIENvbW1hbmREZWY+KClcblxuICByZWdpc3RlcihkZWY6IENvbW1hbmREZWYpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5jb21tYW5kcy5oYXMoZGVmLm5hbWUpKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgIGBbTEVTXSBEdXBsaWNhdGUgY29tbWFuZCBcIiR7ZGVmLm5hbWV9XCIgXHUyMDE0IHByZXZpb3VzIGRlZmluaXRpb24gb3ZlcndyaXR0ZW4uYCxcbiAgICAgICAgZGVmLmVsZW1lbnRcbiAgICAgIClcbiAgICB9XG4gICAgdGhpcy5jb21tYW5kcy5zZXQoZGVmLm5hbWUsIGRlZilcbiAgfVxuXG4gIGdldChuYW1lOiBzdHJpbmcpOiBDb21tYW5kRGVmIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kcy5nZXQobmFtZSlcbiAgfVxuXG4gIGhhcyhuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kcy5oYXMobmFtZSlcbiAgfVxuXG4gIG5hbWVzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmNvbW1hbmRzLmtleXMoKSlcbiAgfVxufVxuIiwgIi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gTEVTIE1vZHVsZSBzeXN0ZW1cbi8vXG4vLyBNb2R1bGVzIGV4dGVuZCB0aGUgc2V0IG9mIGFuaW1hdGlvbi9lZmZlY3QgcHJpbWl0aXZlcyBhdmFpbGFibGUgaW5cbi8vIDxsb2NhbC1jb21tYW5kPiBib2RpZXMuIFR3byBraW5kczpcbi8vXG4vLyAgIEJ1aWx0LWluOiAgPHVzZS1tb2R1bGUgdHlwZT1cImFuaW1hdGlvblwiPlxuLy8gICBVc2VybGFuZDogIDx1c2UtbW9kdWxlIHNyYz1cIi4vc2Nyb2xsLWVmZmVjdHMuanNcIj5cbi8vXG4vLyBCb3RoIHJlc29sdmUgdG8gYSBMRVNNb2R1bGUgYXQgcnVudGltZS5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEEgcHJpbWl0aXZlIGlzIGFuIGFzeW5jIG9wZXJhdGlvbiB0aGUgZXhlY3V0b3IgZGlzcGF0Y2hlcyBmb3IgQW5pbWF0aW9uTm9kZS5cbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3IgIENTUyBzZWxlY3RvciBzdHJpbmcgKGFscmVhZHkgcmVzb2x2ZWQgXHUyMDE0IG5vIHZhcmlhYmxlIHN1YnN0aXR1dGlvbiBuZWVkZWQgaGVyZSlcbiAqIEBwYXJhbSBkdXJhdGlvbiAgbWlsbGlzZWNvbmRzXG4gKiBAcGFyYW0gZWFzaW5nICAgIENTUyBlYXNpbmcgc3RyaW5nLCBlLmcuICdlYXNlLW91dCdcbiAqIEBwYXJhbSBvcHRpb25zICAga2V5L3ZhbHVlIG9wdGlvbnMgZnJvbSB0aGUgdHJhaWxpbmcgWy4uLl0gYmxvY2ssIGFscmVhZHkgZXZhbHVhdGVkXG4gKiBAcGFyYW0gaG9zdCAgICAgIHRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBlbGVtZW50ICh1c2VkIGFzIHF1ZXJ5U2VsZWN0b3Igcm9vdClcbiAqL1xuZXhwb3J0IHR5cGUgTEVTUHJpbWl0aXZlID0gKFxuICBzZWxlY3Rvcjogc3RyaW5nLFxuICBkdXJhdGlvbjogbnVtYmVyLFxuICBlYXNpbmc6IHN0cmluZyxcbiAgb3B0aW9uczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIGhvc3Q6IEVsZW1lbnRcbikgPT4gUHJvbWlzZTx2b2lkPlxuXG4vKiogVGhlIHNoYXBlIGEgdXNlcmxhbmQgbW9kdWxlIG11c3QgZXhwb3J0IGFzIGl0cyBkZWZhdWx0IGV4cG9ydC4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTEVTTW9kdWxlIHtcbiAgLyoqIEh1bWFuLXJlYWRhYmxlIG5hbWUgZm9yIGVycm9yIG1lc3NhZ2VzICovXG4gIG5hbWU6IHN0cmluZ1xuICBwcmltaXRpdmVzOiBSZWNvcmQ8c3RyaW5nLCBMRVNQcmltaXRpdmU+XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBSZWdpc3RyeSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZXhwb3J0IGNsYXNzIE1vZHVsZVJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBwcmltaXRpdmVzID0gbmV3IE1hcDxzdHJpbmcsIExFU1ByaW1pdGl2ZT4oKVxuICBwcml2YXRlIGxvYWRlZE1vZHVsZXM6IHN0cmluZ1tdID0gW11cblxuICByZWdpc3Rlcihtb2R1bGU6IExFU01vZHVsZSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgW25hbWUsIGZuXSBvZiBPYmplY3QuZW50cmllcyhtb2R1bGUucHJpbWl0aXZlcykpIHtcbiAgICAgIHRoaXMucHJpbWl0aXZlcy5zZXQobmFtZSwgZm4pXG4gICAgfVxuICAgIHRoaXMubG9hZGVkTW9kdWxlcy5wdXNoKG1vZHVsZS5uYW1lKVxuICAgIGNvbnNvbGUubG9nKGBbTEVTXSBtb2R1bGUgbG9hZGVkOiBcIiR7bW9kdWxlLm5hbWV9XCJgLCBPYmplY3Qua2V5cyhtb2R1bGUucHJpbWl0aXZlcykpXG4gIH1cblxuICBnZXQocHJpbWl0aXZlOiBzdHJpbmcpOiBMRVNQcmltaXRpdmUgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLnByaW1pdGl2ZXMuZ2V0KHByaW1pdGl2ZSlcbiAgfVxuXG4gIGhhcyhwcmltaXRpdmU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnByaW1pdGl2ZXMuaGFzKHByaW1pdGl2ZSlcbiAgfVxuXG4gIC8qKiBEZXYtbW9kZSBoZWxwOiB3aGljaCBtb2R1bGUgZXhwb3J0cyBhIGdpdmVuIHByaW1pdGl2ZT8gKi9cbiAgaGludEZvcihwcmltaXRpdmU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgLy8gV2lsbCBiZSBlbnJpY2hlZCBpbiBQaGFzZSA4IHdpdGggcGVyLW1vZHVsZSBwcmltaXRpdmUgbWFuaWZlc3RzLlxuICAgIHJldHVybiBgUHJpbWl0aXZlIFwiJHtwcmltaXRpdmV9XCIgbm90IGZvdW5kLiBMb2FkZWQgbW9kdWxlczogWyR7dGhpcy5sb2FkZWRNb2R1bGVzLmpvaW4oJywgJyl9XS4gRGlkIHlvdSBmb3JnZXQgPHVzZS1tb2R1bGUgdHlwZT1cImFuaW1hdGlvblwiPj9gXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIExvYWRlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqIEJ1aWx0LWluIG1vZHVsZSByZWdpc3RyeTogdHlwZSBuYW1lIFx1MjE5MiBpbXBvcnQgcGF0aCAqL1xuY29uc3QgQlVJTFRJTl9NT0RVTEVTOiBSZWNvcmQ8c3RyaW5nLCAoKSA9PiBQcm9taXNlPHsgZGVmYXVsdDogTEVTTW9kdWxlIH0+PiA9IHtcbiAgYW5pbWF0aW9uOiAoKSA9PiBpbXBvcnQoJy4vYnVpbHRpbi9hbmltYXRpb24uanMnKSxcbn1cblxuLyoqXG4gKiBSZXNvbHZlIGEgPHVzZS1tb2R1bGU+IGVsZW1lbnQgdG8gYSBMRVNNb2R1bGUgYW5kIHJlZ2lzdGVyIGl0LlxuICogQ2FsbGVkIGR1cmluZyBQaGFzZSAxIERPTSByZWFkaW5nIChQaGFzZSA4IGNvbXBsZXRlcyB0aGUgc3JjPSBwYXRoKS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRNb2R1bGUoXG4gIHJlZ2lzdHJ5OiBNb2R1bGVSZWdpc3RyeSxcbiAgb3B0czogeyB0eXBlPzogc3RyaW5nOyBzcmM/OiBzdHJpbmcgfVxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChvcHRzLnR5cGUpIHtcbiAgICBjb25zdCBsb2FkZXIgPSBCVUlMVElOX01PRFVMRVNbb3B0cy50eXBlXVxuICAgIGlmICghbG9hZGVyKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVNdIFVua25vd24gYnVpbHQtaW4gbW9kdWxlIHR5cGU6IFwiJHtvcHRzLnR5cGV9XCIuIEF2YWlsYWJsZTogJHtPYmplY3Qua2V5cyhCVUlMVElOX01PRFVMRVMpLmpvaW4oJywgJyl9YClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25zdCBtb2QgPSBhd2FpdCBsb2FkZXIoKVxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKG1vZC5kZWZhdWx0KVxuICAgIHJldHVyblxuICB9XG5cbiAgaWYgKG9wdHMuc3JjKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG1vZCA9IGF3YWl0IGltcG9ydCgvKiBAdml0ZS1pZ25vcmUgKi8gb3B0cy5zcmMpXG4gICAgICBpZiAoIW1vZC5kZWZhdWx0IHx8IHR5cGVvZiBtb2QuZGVmYXVsdC5wcmltaXRpdmVzICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBjb25zb2xlLndhcm4oYFtMRVNdIE1vZHVsZSBhdCBcIiR7b3B0cy5zcmN9XCIgZG9lcyBub3QgZXhwb3J0IGEgdmFsaWQgTEVTTW9kdWxlLiBFeHBlY3RlZDogeyBuYW1lOiBzdHJpbmcsIHByaW1pdGl2ZXM6IFJlY29yZDxzdHJpbmcsIEZ1bmN0aW9uPiB9YClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICByZWdpc3RyeS5yZWdpc3Rlcihtb2QuZGVmYXVsdCBhcyBMRVNNb2R1bGUpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBbTEVTXSBGYWlsZWQgdG8gbG9hZCBtb2R1bGUgZnJvbSBcIiR7b3B0cy5zcmN9XCI6YCwgZXJyKVxuICAgIH1cbiAgICByZXR1cm5cbiAgfVxuXG4gIGNvbnNvbGUud2FybignW0xFU10gPHVzZS1tb2R1bGU+IHJlcXVpcmVzIGVpdGhlciB0eXBlPSBvciBzcmM9IGF0dHJpYnV0ZS4nKVxufVxuIiwgIi8qKlxuICogU3RyaXBzIHRoZSBiYWNrdGljayB3cmFwcGVyIGZyb20gYSBtdWx0aS1saW5lIExFUyBib2R5IHN0cmluZyBhbmRcbiAqIG5vcm1hbGl6ZXMgaW5kZW50YXRpb24sIHByb2R1Y2luZyBhIGNsZWFuIHN0cmluZyB0aGUgcGFyc2VyIGNhbiB3b3JrIHdpdGguXG4gKlxuICogQ29udmVudGlvbjpcbiAqICAgU2luZ2xlLWxpbmU6ICBoYW5kbGU9XCJlbWl0IGZlZWQ6aW5pdFwiICAgICAgICAgICBcdTIxOTIgXCJlbWl0IGZlZWQ6aW5pdFwiXG4gKiAgIE11bHRpLWxpbmU6ICAgZG89XCJgXFxuICAgICAgc2V0Li4uXFxuICAgIGBcIiAgICAgICAgXHUyMTkyIFwic2V0Li4uXFxuLi4uXCJcbiAqXG4gKiBBbGdvcml0aG06XG4gKiAgIDEuIFRyaW0gb3V0ZXIgd2hpdGVzcGFjZSBmcm9tIHRoZSByYXcgYXR0cmlidXRlIHZhbHVlLlxuICogICAyLiBJZiB3cmFwcGVkIGluIGJhY2t0aWNrcywgc3RyaXAgdGhlbSBcdTIwMTQgZG8gTk9UIGlubmVyLXRyaW0geWV0LlxuICogICAzLiBTcGxpdCBpbnRvIGxpbmVzIGFuZCBjb21wdXRlIG1pbmltdW0gbm9uLXplcm8gaW5kZW50YXRpb25cbiAqICAgICAgYWNyb3NzIGFsbCBub24tZW1wdHkgbGluZXMuIFRoaXMgaXMgdGhlIEhUTUwgYXR0cmlidXRlIGluZGVudGF0aW9uXG4gKiAgICAgIGxldmVsIHRvIHJlbW92ZS5cbiAqICAgNC4gU3RyaXAgdGhhdCBtYW55IGxlYWRpbmcgY2hhcmFjdGVycyBmcm9tIGV2ZXJ5IGxpbmUuXG4gKiAgIDUuIERyb3AgbGVhZGluZy90cmFpbGluZyBibGFuayBsaW5lcywgcmV0dXJuIGpvaW5lZCByZXN1bHQuXG4gKlxuICogQ3J1Y2lhbGx5LCBzdGVwIDIgZG9lcyBOT1QgY2FsbCAudHJpbSgpIG9uIHRoZSBpbm5lciBjb250ZW50IGJlZm9yZVxuICogY29tcHV0aW5nIGluZGVudGF0aW9uLiBBbiBpbm5lciAudHJpbSgpIHdvdWxkIGRlc3Ryb3kgdGhlIGxlYWRpbmdcbiAqIHdoaXRlc3BhY2Ugb24gbGluZSAxLCBtYWtpbmcgbWluSW5kZW50ID0gMCBhbmQgbGVhdmluZyBhbGwgb3RoZXJcbiAqIGxpbmVzIHVuLWRlLWluZGVudGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RyaXBCb2R5KHJhdzogc3RyaW5nKTogc3RyaW5nIHtcbiAgbGV0IHMgPSByYXcudHJpbSgpXG5cbiAgLy8gU3RyaXAgYmFja3RpY2sgd3JhcHBlciBcdTIwMTQgYnV0IHByZXNlcnZlIGludGVybmFsIHdoaXRlc3BhY2UgZm9yIGRlLWluZGVudFxuICBpZiAocy5zdGFydHNXaXRoKCdgJykgJiYgcy5lbmRzV2l0aCgnYCcpKSB7XG4gICAgcyA9IHMuc2xpY2UoMSwgLTEpXG4gICAgLy8gRG8gTk9UIC50cmltKCkgaGVyZSBcdTIwMTQgdGhhdCBraWxscyB0aGUgbGVhZGluZyBpbmRlbnQgb24gbGluZSAxXG4gIH1cblxuICBjb25zdCBsaW5lcyA9IHMuc3BsaXQoJ1xcbicpXG4gIGNvbnN0IG5vbkVtcHR5ID0gbGluZXMuZmlsdGVyKGwgPT4gbC50cmltKCkubGVuZ3RoID4gMClcbiAgaWYgKG5vbkVtcHR5Lmxlbmd0aCA9PT0gMCkgcmV0dXJuICcnXG5cbiAgLy8gRm9yIHNpbmdsZS1saW5lIHZhbHVlcyAobm8gbmV3bGluZXMgYWZ0ZXIgYmFja3RpY2sgc3RyaXApLCBqdXN0IHRyaW1cbiAgaWYgKGxpbmVzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIHMudHJpbSgpXG5cbiAgLy8gTWluaW11bSBsZWFkaW5nIHdoaXRlc3BhY2UgYWNyb3NzIG5vbi1lbXB0eSBsaW5lc1xuICBjb25zdCBtaW5JbmRlbnQgPSBub25FbXB0eS5yZWR1Y2UoKG1pbiwgbGluZSkgPT4ge1xuICAgIGNvbnN0IGxlYWRpbmcgPSBsaW5lLm1hdGNoKC9eKFxccyopLyk/LlsxXT8ubGVuZ3RoID8/IDBcbiAgICByZXR1cm4gTWF0aC5taW4obWluLCBsZWFkaW5nKVxuICB9LCBJbmZpbml0eSlcblxuICBjb25zdCBzdHJpcHBlZCA9IG1pbkluZGVudCA9PT0gMCB8fCBtaW5JbmRlbnQgPT09IEluZmluaXR5XG4gICAgPyBsaW5lc1xuICAgIDogbGluZXMubWFwKGxpbmUgPT4gbGluZS5sZW5ndGggPj0gbWluSW5kZW50ID8gbGluZS5zbGljZShtaW5JbmRlbnQpIDogbGluZS50cmltU3RhcnQoKSlcblxuICAvLyBEcm9wIGxlYWRpbmcgYW5kIHRyYWlsaW5nIGJsYW5rIGxpbmVzICh0aGUgbmV3bGluZXMgYXJvdW5kIGJhY2t0aWNrIGNvbnRlbnQpXG4gIGxldCBzdGFydCA9IDBcbiAgbGV0IGVuZCA9IHN0cmlwcGVkLmxlbmd0aCAtIDFcbiAgd2hpbGUgKHN0YXJ0IDw9IGVuZCAmJiBzdHJpcHBlZFtzdGFydF0/LnRyaW0oKSA9PT0gJycpIHN0YXJ0KytcbiAgd2hpbGUgKGVuZCA+PSBzdGFydCAmJiBzdHJpcHBlZFtlbmRdPy50cmltKCkgPT09ICcnKSBlbmQtLVxuXG4gIHJldHVybiBzdHJpcHBlZC5zbGljZShzdGFydCwgZW5kICsgMSkuam9pbignXFxuJylcbn1cbiIsICJpbXBvcnQgdHlwZSB7XG4gIExFU0NvbmZpZyxcbiAgTW9kdWxlRGVjbCxcbiAgQ29tbWFuZERlY2wsXG4gIEV2ZW50SGFuZGxlckRlY2wsXG4gIFNpZ25hbFdhdGNoZXJEZWNsLFxuICBPbkxvYWREZWNsLFxuICBPbkVudGVyRGVjbCxcbiAgT25FeGl0RGVjbCxcbn0gZnJvbSAnLi9jb25maWcuanMnXG5pbXBvcnQgeyBzdHJpcEJvZHkgfSBmcm9tICcuL3N0cmlwQm9keS5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBUYWcgbmFtZSBcdTIxOTIgaGFuZGxlciBtYXBcbi8vIEVhY2ggaGFuZGxlciByZWFkcyBhdHRyaWJ1dGVzIGZyb20gYSBjaGlsZCBlbGVtZW50IGFuZCBwdXNoZXMgYSB0eXBlZCBkZWNsXG4vLyBpbnRvIHRoZSBjb25maWcgYmVpbmcgYnVpbHQuIFVua25vd24gdGFncyBhcmUgY29sbGVjdGVkIGZvciB3YXJuaW5nLlxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbnR5cGUgSGFuZGxlciA9IChlbDogRWxlbWVudCwgY29uZmlnOiBMRVNDb25maWcpID0+IHZvaWRcblxuY29uc3QgSEFORExFUlM6IFJlY29yZDxzdHJpbmcsIEhhbmRsZXI+ID0ge1xuXG4gICd1c2UtbW9kdWxlJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgdHlwZSA9IGVsLmdldEF0dHJpYnV0ZSgndHlwZScpPy50cmltKCkgPz8gbnVsbFxuICAgIGNvbnN0IHNyYyAgPSBlbC5nZXRBdHRyaWJ1dGUoJ3NyYycpPy50cmltKCkgID8/IG51bGxcblxuICAgIGlmICghdHlwZSAmJiAhc3JjKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDx1c2UtbW9kdWxlPiBoYXMgbmVpdGhlciB0eXBlPSBub3Igc3JjPSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbmZpZy5tb2R1bGVzLnB1c2goeyB0eXBlLCBzcmMsIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG5cbiAgJ2xvY2FsLWNvbW1hbmQnKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCBuYW1lID0gZWwuZ2V0QXR0cmlidXRlKCduYW1lJyk/LnRyaW0oKSA/PyAnJ1xuICAgIGNvbnN0IGJvZHkgPSBlbC5nZXRBdHRyaWJ1dGUoJ2RvJyk/LnRyaW0oKSAgID8/ICcnXG5cbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPGxvY2FsLWNvbW1hbmQ+IG1pc3NpbmcgcmVxdWlyZWQgbmFtZT0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTXSA8bG9jYWwtY29tbWFuZCBuYW1lPVwiJHtuYW1lfVwiPiBtaXNzaW5nIHJlcXVpcmVkIGRvPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuYCwgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25maWcuY29tbWFuZHMucHVzaCh7XG4gICAgICBuYW1lLFxuICAgICAgYXJnc1JhdzogZWwuZ2V0QXR0cmlidXRlKCdhcmdzJyk/LnRyaW0oKSAgPz8gJycsXG4gICAgICBndWFyZDogICBlbC5nZXRBdHRyaWJ1dGUoJ2d1YXJkJyk/LnRyaW0oKSA/PyBudWxsLFxuICAgICAgYm9keTogICAgc3RyaXBCb2R5KGJvZHkpLFxuICAgICAgZWxlbWVudDogZWwsXG4gICAgfSlcbiAgfSxcblxuICAnb24tZXZlbnQnKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCBuYW1lID0gZWwuZ2V0QXR0cmlidXRlKCduYW1lJyk/LnRyaW0oKSAgID8/ICcnXG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgnaGFuZGxlJyk/LnRyaW0oKSA/PyAnJ1xuXG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDxvbi1ldmVudD4gbWlzc2luZyByZXF1aXJlZCBuYW1lPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVNdIDxvbi1ldmVudCBuYW1lPVwiJHtuYW1lfVwiPiBtaXNzaW5nIHJlcXVpcmVkIGhhbmRsZT0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLmAsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uZmlnLm9uRXZlbnQucHVzaCh7IG5hbWUsIGJvZHk6IHN0cmlwQm9keShib2R5KSwgZWxlbWVudDogZWwgfSlcbiAgfSxcblxuICAnb24tc2lnbmFsJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgbmFtZSA9IGVsLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgICA/PyAnJ1xuICAgIGNvbnN0IGJvZHkgPSBlbC5nZXRBdHRyaWJ1dGUoJ2hhbmRsZScpPy50cmltKCkgPz8gJydcblxuICAgIGlmICghbmFtZSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tc2lnbmFsPiBtaXNzaW5nIHJlcXVpcmVkIG5hbWU9IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBpZiAoIWJvZHkpIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFU10gPG9uLXNpZ25hbCBuYW1lPVwiJHtuYW1lfVwiPiBtaXNzaW5nIHJlcXVpcmVkIGhhbmRsZT0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLmAsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uZmlnLm9uU2lnbmFsLnB1c2goe1xuICAgICAgbmFtZSxcbiAgICAgIHdoZW46ICAgIGVsLmdldEF0dHJpYnV0ZSgnd2hlbicpPy50cmltKCkgPz8gbnVsbCxcbiAgICAgIGJvZHk6ICAgIHN0cmlwQm9keShib2R5KSxcbiAgICAgIGVsZW1lbnQ6IGVsLFxuICAgIH0pXG4gIH0sXG5cbiAgJ29uLWxvYWQnKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdydW4nKT8udHJpbSgpID8/ICcnXG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDxvbi1sb2FkPiBtaXNzaW5nIHJlcXVpcmVkIHJ1bj0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGNvbmZpZy5vbkxvYWQucHVzaCh7IGJvZHk6IHN0cmlwQm9keShib2R5KSwgZWxlbWVudDogZWwgfSlcbiAgfSxcblxuICAnb24tZW50ZXInKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdydW4nKT8udHJpbSgpID8/ICcnXG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDxvbi1lbnRlcj4gbWlzc2luZyByZXF1aXJlZCBydW49IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25maWcub25FbnRlci5wdXNoKHtcbiAgICAgIHdoZW46ICAgIGVsLmdldEF0dHJpYnV0ZSgnd2hlbicpPy50cmltKCkgPz8gbnVsbCxcbiAgICAgIGJvZHk6ICAgIHN0cmlwQm9keShib2R5KSxcbiAgICAgIGVsZW1lbnQ6IGVsLFxuICAgIH0pXG4gIH0sXG5cbiAgJ29uLWV4aXQnKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdydW4nKT8udHJpbSgpID8/ICcnXG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDxvbi1leGl0PiBtaXNzaW5nIHJlcXVpcmVkIHJ1bj0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGNvbmZpZy5vbkV4aXQucHVzaCh7IGJvZHk6IHN0cmlwQm9keShib2R5KSwgZWxlbWVudDogZWwgfSlcbiAgfSxcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyByZWFkQ29uZmlnIFx1MjAxNCB0aGUgcHVibGljIGVudHJ5IHBvaW50XG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBXYWxrcyB0aGUgZGlyZWN0IGNoaWxkcmVuIG9mIGEgPGxvY2FsLWV2ZW50LXNjcmlwdD4gZWxlbWVudCBhbmRcbiAqIHByb2R1Y2VzIGEgc3RydWN0dXJlZCBMRVNDb25maWcuXG4gKlxuICogT25seSBkaXJlY3QgY2hpbGRyZW4gYXJlIHJlYWQgXHUyMDE0IG5lc3RlZCBlbGVtZW50cyBpbnNpZGUgYSA8bG9jYWwtY29tbWFuZD5cbiAqIGJvZHkgYXJlIG5vdCBjaGlsZHJlbiBvZiB0aGUgaG9zdCBhbmQgYXJlIG5ldmVyIHZpc2l0ZWQgaGVyZS5cbiAqXG4gKiBVbmtub3duIGNoaWxkIGVsZW1lbnRzIGVtaXQgYSBjb25zb2xlLndhcm4gYW5kIGFyZSBjb2xsZWN0ZWQgaW4gY29uZmlnLnVua25vd25cbiAqIHNvIHRvb2xpbmcgKGUuZy4gYSBmdXR1cmUgTEVTIGxhbmd1YWdlIHNlcnZlcikgY2FuIHJlcG9ydCB0aGVtLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZENvbmZpZyhob3N0OiBFbGVtZW50KTogTEVTQ29uZmlnIHtcbiAgY29uc3QgY29uZmlnOiBMRVNDb25maWcgPSB7XG4gICAgaWQ6ICAgICAgIGhvc3QuaWQgfHwgJyhubyBpZCknLFxuICAgIG1vZHVsZXM6ICBbXSxcbiAgICBjb21tYW5kczogW10sXG4gICAgb25FdmVudDogIFtdLFxuICAgIG9uU2lnbmFsOiBbXSxcbiAgICBvbkxvYWQ6ICAgW10sXG4gICAgb25FbnRlcjogIFtdLFxuICAgIG9uRXhpdDogICBbXSxcbiAgICB1bmtub3duOiAgW10sXG4gIH1cblxuICBmb3IgKGNvbnN0IGNoaWxkIG9mIEFycmF5LmZyb20oaG9zdC5jaGlsZHJlbikpIHtcbiAgICBjb25zdCB0YWcgPSBjaGlsZC50YWdOYW1lLnRvTG93ZXJDYXNlKClcbiAgICBjb25zdCBoYW5kbGVyID0gSEFORExFUlNbdGFnXVxuXG4gICAgaWYgKGhhbmRsZXIpIHtcbiAgICAgIGhhbmRsZXIoY2hpbGQsIGNvbmZpZylcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSFRNTCBjb21tZW50cyBkb24ndCBhcHBlYXIgaW4gLmNoaWxkcmVuLCBvbmx5IGluIC5jaGlsZE5vZGVzLlxuICAgICAgLy8gU28gZXZlcnl0aGluZyBoZXJlIGlzIGEgcmVhbCBlbGVtZW50IFx1MjAxNCB3YXJuIGFuZCBjb2xsZWN0LlxuICAgICAgY29uZmlnLnVua25vd24ucHVzaChjaGlsZClcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgYFtMRVNdIFVua25vd24gY2hpbGQgZWxlbWVudCA8JHt0YWd9PiBpbnNpZGUgPGxvY2FsLWV2ZW50LXNjcmlwdCBpZD1cIiR7Y29uZmlnLmlkfVwiPiBcdTIwMTQgaWdub3JlZC5gLFxuICAgICAgICBjaGlsZFxuICAgICAgKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjb25maWdcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBsb2dDb25maWcgXHUyMDE0IHN0cnVjdHVyZWQgY2hlY2twb2ludCBsb2dcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIExvZ3MgYSBzdW1tYXJ5IG9mIGEgcGFyc2VkIExFU0NvbmZpZy5cbiAqIFBoYXNlIDEgY2hlY2twb2ludDogeW91IHNob3VsZCBzZWUgdGhpcyBpbiB0aGUgYnJvd3NlciBjb25zb2xlL2RlYnVnIGxvZ1xuICogd2l0aCBhbGwgY29tbWFuZHMsIGV2ZW50cywgYW5kIHNpZ25hbCB3YXRjaGVycyBjb3JyZWN0bHkgbGlzdGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9nQ29uZmlnKGNvbmZpZzogTEVTQ29uZmlnKTogdm9pZCB7XG4gIGNvbnN0IGlkID0gY29uZmlnLmlkXG4gIGNvbnNvbGUubG9nKGBbTEVTXSBjb25maWcgcmVhZCBmb3IgIyR7aWR9YClcbiAgY29uc29sZS5sb2coYFtMRVNdICAgbW9kdWxlczogICAke2NvbmZpZy5tb2R1bGVzLmxlbmd0aH1gLCBjb25maWcubW9kdWxlcy5tYXAobSA9PiBtLnR5cGUgPz8gbS5zcmMpKVxuICBjb25zb2xlLmxvZyhgW0xFU10gICBjb21tYW5kczogICR7Y29uZmlnLmNvbW1hbmRzLmxlbmd0aH1gLCBjb25maWcuY29tbWFuZHMubWFwKGMgPT4gYy5uYW1lKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tZXZlbnQ6ICAke2NvbmZpZy5vbkV2ZW50Lmxlbmd0aH1gLCBjb25maWcub25FdmVudC5tYXAoZSA9PiBlLm5hbWUpKVxuICBjb25zb2xlLmxvZyhgW0xFU10gICBvbi1zaWduYWw6ICR7Y29uZmlnLm9uU2lnbmFsLmxlbmd0aH1gLCBjb25maWcub25TaWduYWwubWFwKHMgPT4gcy5uYW1lKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tbG9hZDogICAke2NvbmZpZy5vbkxvYWQubGVuZ3RofWApXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG9uLWVudGVyOiAgJHtjb25maWcub25FbnRlci5sZW5ndGh9YCwgY29uZmlnLm9uRW50ZXIubWFwKGUgPT4gZS53aGVuID8/ICdhbHdheXMnKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tZXhpdDogICAke2NvbmZpZy5vbkV4aXQubGVuZ3RofWApXG5cbiAgaWYgKGNvbmZpZy51bmtub3duLmxlbmd0aCA+IDApIHtcbiAgICBjb25zb2xlLndhcm4oYFtMRVNdICAgdW5rbm93biBjaGlsZHJlbjogJHtjb25maWcudW5rbm93bi5sZW5ndGh9YCwgY29uZmlnLnVua25vd24ubWFwKGUgPT4gZS50YWdOYW1lLnRvTG93ZXJDYXNlKCkpKVxuICB9XG5cbiAgLy8gTG9nIGEgc2FtcGxpbmcgb2YgYm9keSBzdHJpbmdzIHRvIHZlcmlmeSBzdHJpcEJvZHkgd29ya2VkIGNvcnJlY3RseVxuICBpZiAoY29uZmlnLmNvbW1hbmRzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBmaXJzdCA9IGNvbmZpZy5jb21tYW5kc1swXVxuICAgIGlmIChmaXJzdCkge1xuICAgICAgY29uc29sZS5sb2coYFtMRVNdICAgZmlyc3QgY29tbWFuZCBib2R5IHByZXZpZXcgKFwiJHtmaXJzdC5uYW1lfVwiKTpgKVxuICAgICAgY29uc3QgcHJldmlldyA9IGZpcnN0LmJvZHkuc3BsaXQoJ1xcbicpLnNsaWNlKDAsIDQpLmpvaW4oJ1xcbiAgJylcbiAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSAgIHwgJHtwcmV2aWV3fWApXG4gICAgfVxuICB9XG59XG4iLCAiLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBMRVMgVG9rZW5pemVyXG4vL1xuLy8gQ29udmVydHMgYSBzdHJpcEJvZHknZCBzb3VyY2Ugc3RyaW5nIGludG8gYSBmbGF0IGFycmF5IG9mIFRva2VuIG9iamVjdHMuXG4vLyBUb2tlbnMgYXJlIHNpbXBseSBub24tYmxhbmsgbGluZXMgd2l0aCB0aGVpciBpbmRlbnQgbGV2ZWwgcmVjb3JkZWQuXG4vLyBObyBzZW1hbnRpYyBhbmFseXNpcyBoYXBwZW5zIGhlcmUgXHUyMDE0IHRoYXQncyB0aGUgcGFyc2VyJ3Mgam9iLlxuLy9cbi8vIFRoZSB0b2tlbml6ZXIgaXMgZGVsaWJlcmF0ZWx5IG1pbmltYWw6IGl0IHByZXNlcnZlcyB0aGUgcmF3IGluZGVudGF0aW9uXG4vLyBpbmZvcm1hdGlvbiB0aGUgcGFyc2VyIG5lZWRzIHRvIHVuZGVyc3RhbmQgYmxvY2sgc3RydWN0dXJlLlxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBpbnRlcmZhY2UgVG9rZW4ge1xuICAvKiogQ29sdW1uIG9mZnNldCBvZiB0aGUgZmlyc3Qgbm9uLXdoaXRlc3BhY2UgY2hhcmFjdGVyIChudW1iZXIgb2Ygc3BhY2VzKSAqL1xuICBpbmRlbnQ6IG51bWJlclxuICAvKiogVHJpbW1lZCBsaW5lIGNvbnRlbnQgXHUyMDE0IG5vIGxlYWRpbmcvdHJhaWxpbmcgd2hpdGVzcGFjZSAqL1xuICB0ZXh0OiBzdHJpbmdcbiAgLyoqIDEtYmFzZWQgbGluZSBudW1iZXIgaW4gdGhlIHN0cmlwcGVkIHNvdXJjZSAoZm9yIGVycm9yIG1lc3NhZ2VzKSAqL1xuICBsaW5lTnVtOiBudW1iZXJcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhIHN0cmlwcGVkIExFUyBib2R5IHN0cmluZyBpbnRvIGEgVG9rZW4gYXJyYXkuXG4gKiBCbGFuayBsaW5lcyBhcmUgZHJvcHBlZC4gVGFicyBhcmUgZXhwYW5kZWQgdG8gMiBzcGFjZXMgZWFjaC5cbiAqXG4gKiBAcGFyYW0gc291cmNlICBBIHN0cmluZyBhbHJlYWR5IHByb2Nlc3NlZCBieSBzdHJpcEJvZHkoKSBcdTIwMTQgbm8gYmFja3RpY2sgd3JhcHBlcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b2tlbml6ZShzb3VyY2U6IHN0cmluZyk6IFRva2VuW10ge1xuICBjb25zdCB0b2tlbnM6IFRva2VuW10gPSBbXVxuICBjb25zdCBsaW5lcyA9IHNvdXJjZS5zcGxpdCgnXFxuJylcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgcmF3ID0gKGxpbmVzW2ldID8/ICcnKS5yZXBsYWNlKC9cXHQvZywgJyAgJylcbiAgICBjb25zdCB0ZXh0ID0gcmF3LnRyaW0oKVxuXG4gICAgLy8gU2tpcCBibGFuayBsaW5lc1xuICAgIGlmICh0ZXh0Lmxlbmd0aCA9PT0gMCkgY29udGludWVcblxuICAgIGNvbnN0IGluZGVudCA9IHJhdy5sZW5ndGggLSByYXcudHJpbVN0YXJ0KCkubGVuZ3RoXG5cbiAgICB0b2tlbnMucHVzaCh7XG4gICAgICBpbmRlbnQsXG4gICAgICB0ZXh0LFxuICAgICAgbGluZU51bTogaSArIDEsXG4gICAgfSlcbiAgfVxuXG4gIHJldHVybiB0b2tlbnNcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBIZWxwZXJzIHVzZWQgYnkgYm90aCB0aGUgdG9rZW5pemVyIHRlc3RzIGFuZCB0aGUgcGFyc2VyXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgYHRleHRgIGVuZHMgd2l0aCBhIHN0YW5kYWxvbmUgYGFuZGAgd29yZC5cbiAqIFVzZWQgYnkgdGhlIHBhcnNlciB0byBkZXRlY3QgcGFyYWxsZWwgYnJhbmNoZXMuXG4gKlxuICogQ2FyZWZ1bDogXCJlbmdsYW5kXCIsIFwiYmFuZFwiLCBcImNvbW1hbmRcIiBtdXN0IE5PVCBtYXRjaC5cbiAqIFdlIHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5IGJlZm9yZSBgYW5kYCBhbmQgZW5kLW9mLXN0cmluZyBhZnRlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuZHNXaXRoQW5kKHRleHQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gL1xcYmFuZCQvLnRlc3QodGV4dClcbn1cblxuLyoqXG4gKiBTdHJpcHMgdGhlIHRyYWlsaW5nIGAgYW5kYCBmcm9tIGEgbGluZSB0aGF0IGVuZHNXaXRoQW5kLlxuICogUmV0dXJucyB0aGUgdHJpbW1lZCBsaW5lIGNvbnRlbnQgd2l0aG91dCBpdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwVHJhaWxpbmdBbmQodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvXFxzK2FuZCQvLCAnJykudHJpbUVuZCgpXG59XG5cbi8qKlxuICogQmxvY2sgdGVybWluYXRvciB0b2tlbnMgXHUyMDE0IHNpZ25hbCB0aGUgZW5kIG9mIGEgbWF0Y2ggb3IgdHJ5IGJsb2NrLlxuICogVGhlc2UgYXJlIGNvbnN1bWVkIGJ5IHRoZSBibG9jay1vd25pbmcgcGFyc2VyIChwYXJzZU1hdGNoIC8gcGFyc2VUcnkpLFxuICogbm90IGJ5IHBhcnNlQmxvY2sgaXRzZWxmLlxuICovXG5leHBvcnQgY29uc3QgQkxPQ0tfVEVSTUlOQVRPUlMgPSBuZXcgU2V0KFsnL21hdGNoJywgJy90cnknXSlcblxuLyoqXG4gKiBLZXl3b3JkcyB0aGF0IGVuZCBhIHRyeSBib2R5IGFuZCBzdGFydCBhIHJlc2N1ZS9hZnRlcndhcmRzIGNsYXVzZS5cbiAqIFJlY29nbml6ZWQgb25seSB3aGVuIHRoZXkgYXBwZWFyIGF0IHRoZSBzYW1lIGluZGVudCBsZXZlbCBhcyB0aGUgYHRyeWAuXG4gKi9cbmV4cG9ydCBjb25zdCBUUllfQ0xBVVNFX0tFWVdPUkRTID0gbmV3IFNldChbJ3Jlc2N1ZScsICdhZnRlcndhcmRzJ10pXG4iLCAiaW1wb3J0IHR5cGUge1xuICBMRVNOb2RlLCBFeHByTm9kZSwgU2VxdWVuY2VOb2RlLCBQYXJhbGxlbE5vZGUsXG4gIFNldE5vZGUsIEVtaXROb2RlLCBCcm9hZGNhc3ROb2RlLCBXYWl0Tm9kZSwgQ2FsbE5vZGUsXG4gIEJpbmROb2RlLCBBY3Rpb25Ob2RlLCBNYXRjaE5vZGUsIE1hdGNoQXJtLCBQYXR0ZXJuTm9kZSxcbiAgVHJ5Tm9kZSwgQW5pbWF0aW9uTm9kZSxcbn0gZnJvbSAnLi9hc3QuanMnXG5pbXBvcnQgdHlwZSB7IFRva2VuIH0gZnJvbSAnLi90b2tlbml6ZXIuanMnXG5pbXBvcnQge1xuICBlbmRzV2l0aEFuZCwgc3RyaXBUcmFpbGluZ0FuZCxcbiAgQkxPQ0tfVEVSTUlOQVRPUlMsIFRSWV9DTEFVU0VfS0VZV09SRFMsXG59IGZyb20gJy4vdG9rZW5pemVyLmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEtub3duIGFuaW1hdGlvbiBwcmltaXRpdmUgbmFtZXMgKHJlZ2lzdGVyZWQgYnkgdGhlIGFuaW1hdGlvbiBtb2R1bGUpXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgQU5JTUFUSU9OX1BSSU1JVElWRVMgPSBuZXcgU2V0KFtcbiAgJ2ZhZGUtaW4nLCAnZmFkZS1vdXQnLCAnc2xpZGUtaW4nLCAnc2xpZGUtb3V0JyxcbiAgJ3NsaWRlLXVwJywgJ3NsaWRlLWRvd24nLCAncHVsc2UnLFxuICAnc3RhZ2dlci1lbnRlcicsICdzdGFnZ2VyLWV4aXQnLFxuXSlcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXJzZXJcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5leHBvcnQgY2xhc3MgTEVTUGFyc2VyIHtcbiAgcHJpdmF0ZSBwb3MgPSAwXG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSB0b2tlbnM6IFRva2VuW10pIHt9XG5cbiAgcHJpdmF0ZSBwZWVrKG9mZnNldCA9IDApOiBUb2tlbiB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMudG9rZW5zW3RoaXMucG9zICsgb2Zmc2V0XVxuICB9XG5cbiAgcHJpdmF0ZSBhZHZhbmNlKCk6IFRva2VuIHtcbiAgICBjb25zdCB0ID0gdGhpcy50b2tlbnNbdGhpcy5wb3NdXG4gICAgaWYgKCF0KSB0aHJvdyBuZXcgTEVTUGFyc2VFcnJvcignVW5leHBlY3RlZCBlbmQgb2YgaW5wdXQnLCB1bmRlZmluZWQpXG4gICAgdGhpcy5wb3MrK1xuICAgIHJldHVybiB0XG4gIH1cblxuICBwcml2YXRlIGF0RW5kKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnBvcyA+PSB0aGlzLnRva2Vucy5sZW5ndGhcbiAgfVxuXG4gIHByaXZhdGUgdHJ5Q29uc3VtZSh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB0ID0gdGhpcy5wZWVrKClcbiAgICBpZiAodD8udGV4dCA9PT0gdGV4dCkgeyB0aGlzLnBvcysrOyByZXR1cm4gdHJ1ZSB9XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgRW50cnkgcG9pbnQgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcGFyc2UoKTogTEVTTm9kZSB7XG4gICAgY29uc3Qgbm9kZSA9IHRoaXMucGFyc2VCbG9jaygtMSlcbiAgICByZXR1cm4gbm9kZVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEJsb2NrIHBhcnNlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKipcbiAgICogUGFyc2VzIGFsbCBzdGF0ZW1lbnRzIGF0IGluZGVudCA+IGJhc2VJbmRlbnQuXG4gICAqXG4gICAqIFN0b3BzIHdoZW4gaXQgZW5jb3VudGVyczpcbiAgICogICAtIEEgdG9rZW4gd2l0aCBpbmRlbnQgPD0gYmFzZUluZGVudFxuICAgKiAgIC0gQSBibG9jayB0ZXJtaW5hdG9yICgvbWF0Y2gsIC90cnkpIFx1MjAxNCBsZWZ0IGZvciB0aGUgcGFyZW50IHRvIGNvbnN1bWVcbiAgICogICAtIEEgdHJ5LWNsYXVzZSBrZXl3b3JkIChyZXNjdWUsIGFmdGVyd2FyZHMpIGF0IGluZGVudCA8PSBiYXNlSW5kZW50XG4gICAqICAgLSBFbmQgb2YgdG9rZW4gc3RyZWFtXG4gICAqXG4gICAqIFJldHVybnMgYSBTZXF1ZW5jZU5vZGUgaWYgbXVsdGlwbGUgc3RlcHMsIG90aGVyd2lzZSB0aGUgc2luZ2xlIG5vZGUuXG4gICAqL1xuICBwcml2YXRlIHBhcnNlQmxvY2soYmFzZUluZGVudDogbnVtYmVyKTogTEVTTm9kZSB7XG4gICAgY29uc3Qgc3RlcHM6IExFU05vZGVbXSA9IFtdXG5cbiAgICB3aGlsZSAoIXRoaXMuYXRFbmQoKSkge1xuICAgICAgY29uc3QgdCA9IHRoaXMucGVlaygpIVxuXG4gICAgICAvLyBTdG9wOiB3ZSd2ZSByZXR1cm5lZCB0byBvciBwYXN0IHRoZSBwYXJlbnQgYmxvY2sncyBpbmRlbnRcbiAgICAgIGlmICh0LmluZGVudCA8PSBiYXNlSW5kZW50KSBicmVha1xuXG4gICAgICAvLyBTdG9wOiBibG9jayB0ZXJtaW5hdG9ycyBhcmUgY29uc3VtZWQgYnkgdGhlIGJsb2NrIG9wZW5lciAobWF0Y2gvdHJ5KVxuICAgICAgaWYgKEJMT0NLX1RFUk1JTkFUT1JTLmhhcyh0LnRleHQpKSBicmVha1xuXG4gICAgICAvLyBTdG9wOiB0cnktY2xhdXNlIGtleXdvcmRzIGVuZCB0aGUgY3VycmVudCB0cnkgYm9keVxuICAgICAgaWYgKFRSWV9DTEFVU0VfS0VZV09SRFMuaGFzKHQudGV4dCkgJiYgdC5pbmRlbnQgPD0gYmFzZUluZGVudCArIDIpIGJyZWFrXG5cbiAgICAgIC8vIFx1MjUwMFx1MjUwMCBTZXF1ZW50aWFsIGNvbm5lY3RpdmU6IHN0YW5kYWxvbmUgYHRoZW5gIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgICAgLy8gYHRoZW5gIGFsb25lIG9uIGEgbGluZSBpbnRyb2R1Y2VzIHRoZSBuZXh0IHNlcXVlbnRpYWwgc3RlcCxcbiAgICAgIC8vIHdoaWNoIGlzIGEgYmxvY2sgYXQgYSBkZWVwZXIgaW5kZW50IGxldmVsLlxuICAgICAgaWYgKHQudGV4dCA9PT0gJ3RoZW4nKSB7XG4gICAgICAgIGNvbnN0IHRoZW5JbmRlbnQgPSB0LmluZGVudFxuICAgICAgICB0aGlzLmFkdmFuY2UoKSAvLyBjb25zdW1lIGB0aGVuYFxuICAgICAgICBjb25zdCBuZXh0ID0gdGhpcy5wZWVrKClcbiAgICAgICAgaWYgKG5leHQgJiYgbmV4dC5pbmRlbnQgPiB0aGVuSW5kZW50KSB7XG4gICAgICAgICAgY29uc3Qgc3RlcCA9IHRoaXMucGFyc2VCbG9jayh0aGVuSW5kZW50KVxuICAgICAgICAgIHN0ZXBzLnB1c2goc3RlcClcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyBcdTI1MDBcdTI1MDAgU2VxdWVudGlhbCBjb25uZWN0aXZlOiBgdGhlbiBYYCBhcyBwcmVmaXggXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgICAvLyBgdGhlbiBjYWxsIGZvb2AsIGB0aGVuIGVtaXQgYmFyYCwgZXRjLlxuICAgICAgLy8gVGhlIGB0aGVuYCBpcyBqdXN0IGEgdmlzdWFsIHNlcXVlbmNlciBcdTIwMTQgdGhlIHJlc3Qgb2YgdGhlIGxpbmUgaXMgdGhlIHN0ZXAuXG4gICAgICBpZiAodC50ZXh0LnN0YXJ0c1dpdGgoJ3RoZW4gJykpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICAgICAgY29uc3QgcmVzdCA9IHQudGV4dC5zbGljZSg1KS50cmltKClcbiAgICAgICAgY29uc3Qgc3RlcCA9IHRoaXMucGFyc2VTaW5nbGVMaW5lKHJlc3QsIHQuaW5kZW50LCB0KVxuICAgICAgICBzdGVwcy5wdXNoKHN0ZXApXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIFx1MjUwMFx1MjUwMCBSZWd1bGFyIHN0YXRlbWVudCAocG9zc2libHkgYSBwYXJhbGxlbCBncm91cCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgICBjb25zdCBzdG10ID0gdGhpcy5wYXJzZVN0YXRlbWVudE9yUGFyYWxsZWwodC5pbmRlbnQpXG4gICAgICBzdGVwcy5wdXNoKHN0bXQpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRvU2VxdWVuY2VPclNpbmdsZShzdGVwcylcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBQYXJhbGxlbCBncm91cCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKipcbiAgICogUGFyc2VzIG9uZSBzdGF0ZW1lbnQgb3IgYSBncm91cCBvZiBwYXJhbGxlbCBzdGF0ZW1lbnRzIGNvbm5lY3RlZCBieSBgYW5kYC5cbiAgICpcbiAgICogTGluZXMgZW5kaW5nIHdpdGggYSBzdGFuZGFsb25lIGBhbmRgIGluZGljYXRlIHRoYXQgdGhlIG5leHQgbGluZSBydW5zXG4gICAqIGNvbmN1cnJlbnRseS4gQWxsIHBhcmFsbGVsIGJyYW5jaGVzIGFyZSB3cmFwcGVkIGluIGEgUGFyYWxsZWxOb2RlLlxuICAgKlxuICAgKiBgYW5kYC1ncm91cHMgb25seSBhcHBseSB3aXRoaW4gdGhlIHNhbWUgaW5kZW50IGxldmVsLiBBIGRlZXBlci1pbmRlbnRlZFxuICAgKiBsaW5lIGFmdGVyIGBhbmRgIGlzIGFuIGVycm9yICh3b3VsZCBpbmRpY2F0ZSBhIGJsb2NrLCBidXQgYGFuZGAgaXNcbiAgICogYSBsaW5lLWxldmVsIGNvbm5lY3Rvciwgbm90IGEgYmxvY2sgb3BlbmVyKS5cbiAgICovXG4gIHByaXZhdGUgcGFyc2VTdGF0ZW1lbnRPclBhcmFsbGVsKGJsb2NrSW5kZW50OiBudW1iZXIpOiBMRVNOb2RlIHtcbiAgICBjb25zdCBicmFuY2hlczogTEVTTm9kZVtdID0gW11cblxuICAgIHdoaWxlICghdGhpcy5hdEVuZCgpKSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy5wZWVrKCkhXG5cbiAgICAgIC8vIFN0b3AgY29uZGl0aW9ucyBcdTIwMTQgc2FtZSBhcyBwYXJzZUJsb2NrJ3NcbiAgICAgIGlmICh0LmluZGVudCA8IGJsb2NrSW5kZW50KSBicmVha1xuICAgICAgaWYgKHQuaW5kZW50ID4gYmxvY2tJbmRlbnQpIGJyZWFrICAgLy8gc2hvdWxkbid0IGhhcHBlbiBoZXJlLCBzYWZldHkgZ3VhcmRcbiAgICAgIGlmIChCTE9DS19URVJNSU5BVE9SUy5oYXModC50ZXh0KSkgYnJlYWtcbiAgICAgIGlmIChUUllfQ0xBVVNFX0tFWVdPUkRTLmhhcyh0LnRleHQpKSBicmVha1xuICAgICAgaWYgKHQudGV4dCA9PT0gJ3RoZW4nIHx8IHQudGV4dC5zdGFydHNXaXRoKCd0aGVuICcpKSBicmVha1xuXG4gICAgICBjb25zdCBoYXNBbmQgPSBlbmRzV2l0aEFuZCh0LnRleHQpXG4gICAgICBjb25zdCBsaW5lVGV4dCA9IGhhc0FuZCA/IHN0cmlwVHJhaWxpbmdBbmQodC50ZXh0KSA6IHQudGV4dFxuXG4gICAgICB0aGlzLmFkdmFuY2UoKVxuXG4gICAgICBjb25zdCBzdG10ID0gdGhpcy5wYXJzZVNpbmdsZUxpbmUobGluZVRleHQsIHQuaW5kZW50LCB0KVxuICAgICAgYnJhbmNoZXMucHVzaChzdG10KVxuXG4gICAgICBpZiAoIWhhc0FuZCkgYnJlYWtcbiAgICB9XG5cbiAgICBpZiAoYnJhbmNoZXMubGVuZ3RoID09PSAwKSByZXR1cm4gZXhwcignJylcbiAgICBpZiAoYnJhbmNoZXMubGVuZ3RoID09PSAxKSByZXR1cm4gYnJhbmNoZXNbMF0hXG4gICAgcmV0dXJuIHsgdHlwZTogJ3BhcmFsbGVsJywgYnJhbmNoZXMgfSBzYXRpc2ZpZXMgUGFyYWxsZWxOb2RlXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgU2luZ2xlLWxpbmUgZGlzcGF0Y2ggXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgLyoqXG4gICAqIFBhcnNlcyBhIHNpbmdsZSBzdGF0ZW1lbnQgZnJvbSBpdHMgdGV4dCBjb250ZW50LlxuICAgKiBUaGUgdGV4dCBoYXMgYWxyZWFkeSBoYWQgYHRoZW4gYCBwcmVmaXggYW5kIHRyYWlsaW5nIGAgYW5kYCBzdHJpcHBlZC5cbiAgICpcbiAgICogRGlzcGF0Y2ggb3JkZXIgbWF0dGVyczogbW9yZSBzcGVjaWZpYyBwYXR0ZXJucyBtdXN0IGNvbWUgYmVmb3JlIGdlbmVyYWwgb25lcy5cbiAgICovXG4gIHByaXZhdGUgcGFyc2VTaW5nbGVMaW5lKHRleHQ6IHN0cmluZywgaW5kZW50OiBudW1iZXIsIHRva2VuOiBUb2tlbik6IExFU05vZGUge1xuICAgIGNvbnN0IGZpcnN0ID0gZmlyc3RXb3JkKHRleHQpXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgQmxvY2sgY29uc3RydWN0cyAoY29uc3VtZSBtdWx0aXBsZSBmb2xsb3dpbmcgdG9rZW5zKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAoZmlyc3QgPT09ICdtYXRjaCcpIHJldHVybiB0aGlzLnBhcnNlTWF0Y2godGV4dCwgaW5kZW50LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICd0cnknKSAgIHJldHVybiB0aGlzLnBhcnNlVHJ5KGluZGVudCwgdG9rZW4pXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgU2ltcGxlIHN0YXRlbWVudCBkaXNwYXRjaCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAoZmlyc3QgPT09ICdzZXQnKSAgICAgICByZXR1cm4gdGhpcy5wYXJzZVNldCh0ZXh0LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICdlbWl0JykgICAgICByZXR1cm4gdGhpcy5wYXJzZUVtaXQodGV4dCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAnYnJvYWRjYXN0JykgcmV0dXJuIHRoaXMucGFyc2VCcm9hZGNhc3QodGV4dCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAnY2FsbCcpICAgICAgcmV0dXJuIHRoaXMucGFyc2VDYWxsKHRleHQsIHRva2VuKVxuICAgIGlmIChmaXJzdCA9PT0gJ3dhaXQnKSAgICAgIHJldHVybiB0aGlzLnBhcnNlV2FpdCh0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBBc3luYyBiaW5kOiBgbmFtZSA8LSBAdmVyYiAndXJsJyBbYXJnc11gIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGlmICh0ZXh0LmluY2x1ZGVzKCcgPC0gJykpIHJldHVybiB0aGlzLnBhcnNlQmluZCh0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBBbmltYXRpb24gcHJpbWl0aXZlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGlmIChBTklNQVRJT05fUFJJTUlUSVZFUy5oYXMoZmlyc3QpKSByZXR1cm4gdGhpcy5wYXJzZUFuaW1hdGlvbih0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBVbmtub3duOiBzdG9yZSBhcyByYXcgZXhwcmVzc2lvbiAoZXNjYXBlIGhhdGNoIC8gZnV0dXJlIGtleXdvcmRzKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBVbmtub3duIHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICByZXR1cm4gZXhwcih0ZXh0KVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIE1hdGNoIGJsb2NrIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgcGFyc2VNYXRjaCh0ZXh0OiBzdHJpbmcsIGluZGVudDogbnVtYmVyLCB0b2tlbjogVG9rZW4pOiBNYXRjaE5vZGUge1xuICAgIC8vIGB0ZXh0YCBpcyBlLmcuIFwibWF0Y2ggcmVzcG9uc2VcIiBvciBcIm1hdGNoICRmZWVkU3RhdGVcIlxuICAgIGNvbnN0IHN1YmplY3RSYXcgPSB0ZXh0LnNsaWNlKCdtYXRjaCcubGVuZ3RoKS50cmltKClcbiAgICBjb25zdCBzdWJqZWN0OiBFeHByTm9kZSA9IGV4cHIoc3ViamVjdFJhdylcbiAgICBjb25zdCBhcm1zOiBNYXRjaEFybVtdID0gW11cblxuICAgIHdoaWxlICghdGhpcy5hdEVuZCgpKSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy5wZWVrKCkhXG5cbiAgICAgIC8vIC9tYXRjaCB0ZXJtaW5hdGVzIHRoZSBibG9ja1xuICAgICAgaWYgKHQudGV4dCA9PT0gJy9tYXRjaCcpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgLy8gT25seSBjb25zdW1lIGFybSBsaW5lcyBhdCB0aGUgZXhwZWN0ZWQgYXJtIGluZGVudCAoaW5kZW50ICsgMilcbiAgICAgIGlmICh0LmluZGVudCA8PSBpbmRlbnQpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gVW5jbG9zZWQgbWF0Y2ggYmxvY2sgXHUyMDE0IG1pc3NpbmcgL21hdGNoYCwgdG9rZW4pXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIC8vIFBhcnNlIGFuIGFybTogYFtwYXR0ZXJuXSAtPmAgb3IgYFtwYXR0ZXJuXSAtPiBib2R5YFxuICAgICAgaWYgKHQudGV4dC5zdGFydHNXaXRoKCdbJykpIHtcbiAgICAgICAgYXJtcy5wdXNoKHRoaXMucGFyc2VNYXRjaEFybSh0LmluZGVudCwgdCkpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIFNraXAgdW5leHBlY3RlZCBsaW5lcyBpbnNpZGUgbWF0Y2hcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIFVuZXhwZWN0ZWQgdG9rZW4gaW5zaWRlIG1hdGNoIGJsb2NrOiAke0pTT04uc3RyaW5naWZ5KHQudGV4dCl9YCwgdClcbiAgICAgIHRoaXMuYWR2YW5jZSgpXG4gICAgfVxuXG4gICAgcmV0dXJuIHsgdHlwZTogJ21hdGNoJywgc3ViamVjdCwgYXJtcyB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlTWF0Y2hBcm0oYXJtSW5kZW50OiBudW1iZXIsIHRva2VuOiBUb2tlbik6IE1hdGNoQXJtIHtcbiAgICBjb25zdCB0ID0gdGhpcy5hZHZhbmNlKCkgLy8gY29uc3VtZSB0aGUgYXJtIGxpbmVcblxuICAgIC8vIFNwbGl0IG9uIGAgLT5gIHRvIHNlcGFyYXRlIHBhdHRlcm4gZnJvbSBib2R5XG4gICAgY29uc3QgYXJyb3dJZHggPSB0LnRleHQuaW5kZXhPZignIC0+JylcbiAgICBpZiAoYXJyb3dJZHggPT09IC0xKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYXRjaCBhcm0gbWlzc2luZyAnLT4nOiAke0pTT04uc3RyaW5naWZ5KHQudGV4dCl9YCwgdClcbiAgICAgIHJldHVybiB7IHBhdHRlcm5zOiBbeyBraW5kOiAnd2lsZGNhcmQnIH1dLCBib2R5OiBleHByKCcnKSB9XG4gICAgfVxuXG4gICAgY29uc3QgcGF0dGVyblJhdyA9IHQudGV4dC5zbGljZSgwLCBhcnJvd0lkeCkudHJpbSgpXG4gICAgY29uc3QgYWZ0ZXJBcnJvdyA9IHQudGV4dC5zbGljZShhcnJvd0lkeCArIDMpLnRyaW0oKSAgLy8gZXZlcnl0aGluZyBhZnRlciBgLT5gXG5cbiAgICBjb25zdCBwYXR0ZXJucyA9IHBhcnNlUGF0dGVybnMocGF0dGVyblJhdylcblxuICAgIGxldCBib2R5OiBMRVNOb2RlXG4gICAgaWYgKGFmdGVyQXJyb3cubGVuZ3RoID4gMCkge1xuICAgICAgLy8gSW5saW5lIGFybTogYFsnZXJyb3InXSAtPiBzZXQgJGZlZWRTdGF0ZSB0byAnZXJyb3InYFxuICAgICAgYm9keSA9IHRoaXMucGFyc2VTaW5nbGVMaW5lKGFmdGVyQXJyb3csIGFybUluZGVudCwgdG9rZW4pXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE11bHRpLWxpbmUgYXJtOiBib2R5IGlzIHRoZSBkZWVwZXItaW5kZW50ZWQgYmxvY2tcbiAgICAgIGJvZHkgPSB0aGlzLnBhcnNlQmxvY2soYXJtSW5kZW50KVxuICAgIH1cblxuICAgIHJldHVybiB7IHBhdHRlcm5zLCBib2R5IH1cbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBUcnkgYmxvY2sgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBwYXJzZVRyeShpbmRlbnQ6IG51bWJlciwgdG9rZW46IFRva2VuKTogVHJ5Tm9kZSB7XG4gICAgLy8gTm90ZTogdGhlIGB0cnlgIHRva2VuIHdhcyBhbHJlYWR5IGNvbnN1bWVkIGJ5IHRoZSBjYWxsaW5nIHBhcnNlU3RhdGVtZW50T3JQYXJhbGxlbC5cbiAgICAvLyBEbyBOT1QgY2FsbCB0aGlzLmFkdmFuY2UoKSBoZXJlIFx1MjAxNCB0aGF0IHdvdWxkIHNraXAgdGhlIGZpcnN0IGJvZHkgbGluZS5cblxuICAgIC8vIFBhcnNlIGJvZHkgXHUyMDE0IHN0b3BzIGF0IHJlc2N1ZS9hZnRlcndhcmRzLy90cnkgYXQgdGhlIHNhbWUgaW5kZW50IGxldmVsXG4gICAgY29uc3QgYm9keSA9IHRoaXMucGFyc2VCbG9jayhpbmRlbnQpXG5cbiAgICBsZXQgcmVzY3VlOiBMRVNOb2RlIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG4gICAgbGV0IGFmdGVyd2FyZHM6IExFU05vZGUgfCB1bmRlZmluZWQgPSB1bmRlZmluZWRcblxuICAgIC8vIHJlc2N1ZSBjbGF1c2UgKG9wdGlvbmFsKVxuICAgIGlmICh0aGlzLnBlZWsoKT8udGV4dCA9PT0gJ3Jlc2N1ZScgJiYgdGhpcy5wZWVrKCk/LmluZGVudCA9PT0gaW5kZW50KSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKSAvLyBjb25zdW1lIGByZXNjdWVgXG4gICAgICByZXNjdWUgPSB0aGlzLnBhcnNlQmxvY2soaW5kZW50KVxuICAgIH1cblxuICAgIC8vIGFmdGVyd2FyZHMgY2xhdXNlIChvcHRpb25hbClcbiAgICBpZiAodGhpcy5wZWVrKCk/LnRleHQgPT09ICdhZnRlcndhcmRzJyAmJiB0aGlzLnBlZWsoKT8uaW5kZW50ID09PSBpbmRlbnQpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpIC8vIGNvbnN1bWUgYGFmdGVyd2FyZHNgXG4gICAgICBhZnRlcndhcmRzID0gdGhpcy5wYXJzZUJsb2NrKGluZGVudClcbiAgICB9XG5cbiAgICAvLyBDb25zdW1lIC90cnlcbiAgICBpZiAodGhpcy5wZWVrKCk/LnRleHQgPT09ICcvdHJ5Jykge1xuICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gVW5jbG9zZWQgdHJ5IGJsb2NrIFx1MjAxNCBtaXNzaW5nIC90cnlgLCB0b2tlbilcbiAgICB9XG5cbiAgICBjb25zdCB0cnlOb2RlOiBUcnlOb2RlID0geyB0eXBlOiAndHJ5JywgYm9keSB9XG4gICAgaWYgKHJlc2N1ZSAgICAhPT0gdW5kZWZpbmVkKSB0cnlOb2RlLnJlc2N1ZSAgICAgPSByZXNjdWVcbiAgICBpZiAoYWZ0ZXJ3YXJkcyAhPT0gdW5kZWZpbmVkKSB0cnlOb2RlLmFmdGVyd2FyZHMgPSBhZnRlcndhcmRzXG4gICAgcmV0dXJuIHRyeU5vZGVcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBTaW1wbGUgc3RhdGVtZW50IHBhcnNlcnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBwYXJzZVNldCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IFNldE5vZGUge1xuICAgIC8vIGBzZXQgJHNpZ25hbCB0byBleHByYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9ec2V0XFxzK1xcJChcXHcrKVxccyt0b1xccysoLispJC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgc2V0IHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7IHR5cGU6ICdzZXQnLCBzaWduYWw6ICc/PycsIHZhbHVlOiBleHByKHRleHQpIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdzZXQnLFxuICAgICAgc2lnbmFsOiBtWzFdISxcbiAgICAgIHZhbHVlOiBleHByKG1bMl0hLnRyaW0oKSksXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUVtaXQodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBFbWl0Tm9kZSB7XG4gICAgLy8gYGVtaXQgZXZlbnQ6bmFtZSBbcGF5bG9hZCwgLi4uXWAgb3IgYGVtaXQgZXZlbnQ6bmFtZWBcbiAgICBjb25zdCB7IG5hbWUsIHBheWxvYWQgfSA9IHBhcnNlRXZlbnRMaW5lKHRleHQuc2xpY2UoJ2VtaXQnLmxlbmd0aCkudHJpbSgpLCB0b2tlbilcbiAgICByZXR1cm4geyB0eXBlOiAnZW1pdCcsIGV2ZW50OiBuYW1lLCBwYXlsb2FkIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VCcm9hZGNhc3QodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBCcm9hZGNhc3ROb2RlIHtcbiAgICBjb25zdCB7IG5hbWUsIHBheWxvYWQgfSA9IHBhcnNlRXZlbnRMaW5lKHRleHQuc2xpY2UoJ2Jyb2FkY2FzdCcubGVuZ3RoKS50cmltKCksIHRva2VuKVxuICAgIHJldHVybiB7IHR5cGU6ICdicm9hZGNhc3QnLCBldmVudDogbmFtZSwgcGF5bG9hZCB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQ2FsbCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IENhbGxOb2RlIHtcbiAgICAvLyBgY2FsbCBjb21tYW5kOm5hbWUgW2FyZzogdmFsdWUsIC4uLl1gIG9yIGBjYWxsIGNvbW1hbmQ6bmFtZWBcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXmNhbGxcXHMrKFteXFxzXFxbXSspXFxzKig/OlxcWyguKylcXF0pPyQvKVxuICAgIGlmICghbSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gTWFsZm9ybWVkIGNhbGwgc3RhdGVtZW50OiAke0pTT04uc3RyaW5naWZ5KHRleHQpfWAsIHRva2VuKVxuICAgICAgcmV0dXJuIHsgdHlwZTogJ2NhbGwnLCBjb21tYW5kOiAnPz8nLCBhcmdzOiB7fSB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnY2FsbCcsXG4gICAgICBjb21tYW5kOiBtWzFdISxcbiAgICAgIGFyZ3M6IHBhcnNlQXJnTGlzdChtWzJdID8/ICcnKSxcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlV2FpdCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IFdhaXROb2RlIHtcbiAgICAvLyBgd2FpdCAzMDBtc2Agb3IgYHdhaXQgKGF0dGVtcHQgKyAxKSAqIDUwMG1zYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9ed2FpdFxccysoLis/KW1zJC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgd2FpdCBzdGF0ZW1lbnQ6ICR7SlNPTi5zdHJpbmdpZnkodGV4dCl9YCwgdG9rZW4pXG4gICAgICByZXR1cm4geyB0eXBlOiAnd2FpdCcsIG1zOiAwIH1cbiAgICB9XG4gICAgY29uc3QgbXNFeHByID0gbVsxXSEudHJpbSgpXG4gICAgLy8gU2ltcGxlIGxpdGVyYWxcbiAgICBjb25zdCBsaXRlcmFsID0gTnVtYmVyKG1zRXhwcilcbiAgICBpZiAoIU51bWJlci5pc05hTihsaXRlcmFsKSkgcmV0dXJuIHsgdHlwZTogJ3dhaXQnLCBtczogbGl0ZXJhbCB9XG4gICAgLy8gRXhwcmVzc2lvbiBcdTIwMTQgc3RvcmUgYXMgMCB3aXRoIHRoZSBleHByZXNzaW9uIGFzIGEgY29tbWVudCAoZXhlY3V0b3Igd2lsbCBldmFsKVxuICAgIC8vIFBoYXNlIDMgd2lsbCBoYW5kbGUgZHluYW1pYyBkdXJhdGlvbnMgcHJvcGVybHlcbiAgICByZXR1cm4geyB0eXBlOiAnd2FpdCcsIG1zOiAwIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VCaW5kKHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogQmluZE5vZGUge1xuICAgIC8vIGBuYW1lIDwtIEB2ZXJiICd1cmwnIFthcmdzXWBcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXihcXHcrKVxccys8LVxccytAKFxcdyspXFxzKycoW14nXSspJ1xccyooPzpcXFsoLispXFxdKT8kLylcbiAgICBpZiAoIW0pIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIE1hbGZvcm1lZCBiaW5kIHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdiaW5kJyxcbiAgICAgICAgbmFtZTogJz8/JyxcbiAgICAgICAgYWN0aW9uOiB7IHR5cGU6ICdhY3Rpb24nLCB2ZXJiOiAnZ2V0JywgdXJsOiAnJywgYXJnczoge30gfSxcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgYWN0aW9uOiBBY3Rpb25Ob2RlID0ge1xuICAgICAgdHlwZTogJ2FjdGlvbicsXG4gICAgICB2ZXJiOiBtWzJdIS50b0xvd2VyQ2FzZSgpLFxuICAgICAgdXJsOiBtWzNdISxcbiAgICAgIGFyZ3M6IHBhcnNlQXJnTGlzdChtWzRdID8/ICcnKSxcbiAgICB9XG4gICAgcmV0dXJuIHsgdHlwZTogJ2JpbmQnLCBuYW1lOiBtWzFdISwgYWN0aW9uIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VBbmltYXRpb24odGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBBbmltYXRpb25Ob2RlIHtcbiAgICAvLyBgcHJpbWl0aXZlIHNlbGVjdG9yIGR1cmF0aW9uIGVhc2luZyBbb3B0aW9uc11gXG4gICAgLy8gRXhhbXBsZXM6XG4gICAgLy8gICBzdGFnZ2VyLWVudGVyIC5mZWVkLWl0ZW0gIDEyMG1zIGVhc2Utb3V0IFtnYXA6IDQwbXMgIGZyb206IHJpZ2h0XVxuICAgIC8vICAgcHVsc2UgLmZlZWQtaXRlbS5pcy11cGRhdGVkICAzMDBtcyBlYXNlLWluLW91dFxuICAgIC8vICAgc2xpZGUtb3V0IFtkYXRhLWl0ZW0taWQ6IGlkXSAgMTUwbXMgZWFzZS1pbiBbdG86IHJpZ2h0XVxuXG4gICAgLy8gVG9rZW5pemU6IHNwbGl0IG9uIHdoaXRlc3BhY2UgYnV0IHByZXNlcnZlIFsuLi5dIGdyb3Vwc1xuICAgIGNvbnN0IHBhcnRzID0gc3BsaXRBbmltYXRpb25MaW5lKHRleHQpXG5cbiAgICBjb25zdCBwcmltaXRpdmUgPSBwYXJ0c1swXSA/PyAnJ1xuICAgIGNvbnN0IHNlbGVjdG9yICA9IHBhcnRzWzFdID8/ICcnXG4gICAgY29uc3QgZHVyYXRpb25TdHIgPSBwYXJ0c1syXSA/PyAnMG1zJ1xuICAgIGNvbnN0IGVhc2luZyAgICA9IHBhcnRzWzNdID8/ICdlYXNlJ1xuICAgIGNvbnN0IG9wdGlvbnNTdHIgPSBwYXJ0c1s0XSA/PyAnJyAgLy8gbWF5IGJlIGFic2VudFxuXG4gICAgY29uc3QgZHVyYXRpb25NcyA9IHBhcnNlSW50KGR1cmF0aW9uU3RyLCAxMClcblxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnYW5pbWF0aW9uJyxcbiAgICAgIHByaW1pdGl2ZSxcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgZHVyYXRpb246IE51bWJlci5pc05hTihkdXJhdGlvbk1zKSA/IDAgOiBkdXJhdGlvbk1zLFxuICAgICAgZWFzaW5nLFxuICAgICAgb3B0aW9uczogcGFyc2VBbmltYXRpb25PcHRpb25zKG9wdGlvbnNTdHIpLFxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFBhdHRlcm4gcGFyc2luZ1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogUGFyc2VzIGEgcGF0dGVybiBncm91cCBsaWtlIGBbaXQgICBvayAgIF1gLCBgW25pbCAgZXJyb3JdYCwgYFtfXWAsXG4gKiBgWydlcnJvciddYCwgYFswIHwgMSB8IDJdYC5cbiAqXG4gKiBSZXR1cm5zIGFuIGFycmF5IG9mIFBhdHRlcm5Ob2RlIFx1MjAxNCBvbmUgcGVyIGVsZW1lbnQgaW4gdGhlIHR1cGxlIHBhdHRlcm4uXG4gKiBGb3Igb3ItcGF0dGVybnMgKGAwIHwgMSB8IDJgKSwgcmV0dXJucyBhIHNpbmdsZSBPclBhdHRlcm5Ob2RlLlxuICovXG5mdW5jdGlvbiBwYXJzZVBhdHRlcm5zKHJhdzogc3RyaW5nKTogUGF0dGVybk5vZGVbXSB7XG4gIC8vIFN0cmlwIG91dGVyIGJyYWNrZXRzXG4gIGNvbnN0IGlubmVyID0gcmF3LnJlcGxhY2UoL15cXFt8XFxdJC9nLCAnJykudHJpbSgpXG5cbiAgLy8gQ2hlY2sgZm9yIG9yLXBhdHRlcm46IGNvbnRhaW5zIGAgfCBgXG4gIGlmIChpbm5lci5pbmNsdWRlcygnIHwgJykgfHwgaW5uZXIuaW5jbHVkZXMoJ3wnKSkge1xuICAgIGNvbnN0IGFsdGVybmF0aXZlcyA9IGlubmVyLnNwbGl0KC9cXHMqXFx8XFxzKi8pLm1hcChwID0+IHBhcnNlU2luZ2xlUGF0dGVybihwLnRyaW0oKSkpXG4gICAgcmV0dXJuIFt7IGtpbmQ6ICdvcicsIHBhdHRlcm5zOiBhbHRlcm5hdGl2ZXMgfV1cbiAgfVxuXG4gIC8vIFR1cGxlIHBhdHRlcm46IHNwYWNlLXNlcGFyYXRlZCBlbGVtZW50c1xuICAvLyBVc2UgYSBjdXN0b20gc3BsaXQgdG8gaGFuZGxlIG11bHRpcGxlIHNwYWNlcyAoYWxpZ25tZW50IHBhZGRpbmcpXG4gIHJldHVybiBpbm5lci50cmltKCkuc3BsaXQoL1xcc3syLH18XFxzKD89XFxTKS8pLmZpbHRlcihzID0+IHMudHJpbSgpKVxuICAgIC5tYXAocCA9PiBwYXJzZVNpbmdsZVBhdHRlcm4ocC50cmltKCkpKVxufVxuXG5mdW5jdGlvbiBwYXJzZVNpbmdsZVBhdHRlcm4oczogc3RyaW5nKTogUGF0dGVybk5vZGUge1xuICBpZiAocyA9PT0gJ18nKSAgIHJldHVybiB7IGtpbmQ6ICd3aWxkY2FyZCcgfVxuICBpZiAocyA9PT0gJ25pbCcpIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IG51bGwgfVxuXG4gIC8vIFN0cmluZyBsaXRlcmFsOiAndmFsdWUnXG4gIGlmIChzLnN0YXJ0c1dpdGgoXCInXCIpICYmIHMuZW5kc1dpdGgoXCInXCIpKSB7XG4gICAgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogcy5zbGljZSgxLCAtMSkgfVxuICB9XG5cbiAgLy8gTnVtYmVyIGxpdGVyYWxcbiAgY29uc3QgbiA9IE51bWJlcihzKVxuICBpZiAoIU51bWJlci5pc05hTihuKSkgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogbiB9XG5cbiAgLy8gQm9vbGVhblxuICBpZiAocyA9PT0gJ3RydWUnKSAgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogdHJ1ZSB9XG4gIGlmIChzID09PSAnZmFsc2UnKSByZXR1cm4geyBraW5kOiAnbGl0ZXJhbCcsIHZhbHVlOiBmYWxzZSB9XG5cbiAgLy8gRXZlcnl0aGluZyBlbHNlIGlzIGEgYmluZGluZyAoY2FwdHVyZXMgdGhlIHZhbHVlIGZvciB1c2UgaW4gdGhlIGJvZHkpXG4gIHJldHVybiB7IGtpbmQ6ICdiaW5kaW5nJywgbmFtZTogcyB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gQXJndW1lbnQgbGlzdCBwYXJzaW5nXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBQYXJzZXMgYGtleTogdmFsdWUgIGtleTI6IHZhbHVlMmAgZnJvbSBpbnNpZGUgYSBbLi4uXSBhcmd1bWVudCBibG9jay5cbiAqIFZhbHVlcyBhcmUgc3RvcmVkIGFzIEV4cHJOb2RlIChldmFsdWF0ZWQgYXQgcnVudGltZSkuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlQXJnTGlzdChyYXc6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIEV4cHJOb2RlPiB7XG4gIGlmICghcmF3LnRyaW0oKSkgcmV0dXJuIHt9XG5cbiAgY29uc3QgcmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCBFeHByTm9kZT4gPSB7fVxuXG4gIC8vIFNwbGl0IG9uIGAgIGAgKGRvdWJsZS1zcGFjZSB1c2VkIGFzIHNlcGFyYXRvciBpbiBMRVMgc3R5bGUpXG4gIC8vIGJ1dCBhbHNvIGhhbmRsZSBzaW5nbGUgYCAga2V5OiB2YWx1ZWAgZW50cmllc1xuICAvLyBTaW1wbGUgcmVnZXg6IGB3b3JkOiByZXN0X3VudGlsX25leHRfd29yZDpgXG4gIGNvbnN0IHBhaXJzID0gcmF3LnRyaW0oKS5zcGxpdCgvKD88PVxcUylcXHN7Mix9KD89XFx3KS8pXG4gIGZvciAoY29uc3QgcGFpciBvZiBwYWlycykge1xuICAgIGNvbnN0IGNvbG9uSWR4ID0gcGFpci5pbmRleE9mKCc6JylcbiAgICBpZiAoY29sb25JZHggPT09IC0xKSBjb250aW51ZVxuICAgIGNvbnN0IGtleSAgID0gcGFpci5zbGljZSgwLCBjb2xvbklkeCkudHJpbSgpXG4gICAgY29uc3QgdmFsdWUgPSBwYWlyLnNsaWNlKGNvbG9uSWR4ICsgMSkudHJpbSgpXG4gICAgaWYgKGtleSkgcmVzdWx0W2tleV0gPSBleHByKHZhbHVlKVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEV2ZW50IGxpbmUgcGFyc2luZzogYGV2ZW50Om5hbWUgW3BheWxvYWQuLi5dYFxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIHBhcnNlRXZlbnRMaW5lKFxuICByYXc6IHN0cmluZyxcbiAgdG9rZW46IFRva2VuXG4pOiB7IG5hbWU6IHN0cmluZzsgcGF5bG9hZDogRXhwck5vZGVbXSB9IHtcbiAgLy8gYGZlZWQ6ZGF0YS1yZWFkeWAgb3IgYGZlZWQ6ZGF0YS1yZWFkeSBbJGZlZWRJdGVtc11gIG9yIGBmZWVkOmVycm9yIFskZXJyb3JdYFxuICBjb25zdCBicmFja2V0SWR4ID0gcmF3LmluZGV4T2YoJ1snKVxuICBpZiAoYnJhY2tldElkeCA9PT0gLTEpIHtcbiAgICByZXR1cm4geyBuYW1lOiByYXcudHJpbSgpLCBwYXlsb2FkOiBbXSB9XG4gIH1cbiAgY29uc3QgbmFtZSA9IHJhdy5zbGljZSgwLCBicmFja2V0SWR4KS50cmltKClcbiAgY29uc3QgcGF5bG9hZFJhdyA9IHJhdy5zbGljZShicmFja2V0SWR4ICsgMSwgcmF3Lmxhc3RJbmRleE9mKCddJykpLnRyaW0oKVxuXG4gIC8vIFBheWxvYWQgZWxlbWVudHMgYXJlIGNvbW1hIG9yIHNwYWNlIHNlcGFyYXRlZCBleHByZXNzaW9uc1xuICBjb25zdCBwYXlsb2FkOiBFeHByTm9kZVtdID0gcGF5bG9hZFJhd1xuICAgID8gcGF5bG9hZFJhdy5zcGxpdCgvLFxccyp8XFxzezIsfS8pLm1hcChzID0+IGV4cHIocy50cmltKCkpKS5maWx0ZXIoZSA9PiBlLnJhdylcbiAgICA6IFtdXG5cbiAgcmV0dXJuIHsgbmFtZSwgcGF5bG9hZCB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gQW5pbWF0aW9uIGxpbmUgcGFyc2luZ1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogU3BsaXRzIGFuIGFuaW1hdGlvbiBsaW5lIGludG8gaXRzIHN0cnVjdHVyYWwgcGFydHMsIHByZXNlcnZpbmcgWy4uLl0gZ3JvdXBzLlxuICpcbiAqIElucHV0OiAgYHN0YWdnZXItZW50ZXIgLmZlZWQtaXRlbSAgMTIwbXMgZWFzZS1vdXQgW2dhcDogNDBtcyAgZnJvbTogcmlnaHRdYFxuICogT3V0cHV0OiBbJ3N0YWdnZXItZW50ZXInLCAnLmZlZWQtaXRlbScsICcxMjBtcycsICdlYXNlLW91dCcsICdbZ2FwOiA0MG1zICBmcm9tOiByaWdodF0nXVxuICovXG5mdW5jdGlvbiBzcGxpdEFuaW1hdGlvbkxpbmUodGV4dDogc3RyaW5nKTogc3RyaW5nW10ge1xuICBjb25zdCBwYXJ0czogc3RyaW5nW10gPSBbXVxuICBsZXQgY3VycmVudCA9ICcnXG4gIGxldCBpbkJyYWNrZXQgPSAwXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0ZXh0Lmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY2ggPSB0ZXh0W2ldIVxuICAgIGlmIChjaCA9PT0gJ1snKSB7XG4gICAgICBpbkJyYWNrZXQrK1xuICAgICAgY3VycmVudCArPSBjaFxuICAgIH0gZWxzZSBpZiAoY2ggPT09ICddJykge1xuICAgICAgaW5CcmFja2V0LS1cbiAgICAgIGN1cnJlbnQgKz0gY2hcbiAgICB9IGVsc2UgaWYgKGNoID09PSAnICcgJiYgaW5CcmFja2V0ID09PSAwKSB7XG4gICAgICBpZiAoY3VycmVudC50cmltKCkpIHBhcnRzLnB1c2goY3VycmVudC50cmltKCkpXG4gICAgICBjdXJyZW50ID0gJydcbiAgICB9IGVsc2Uge1xuICAgICAgY3VycmVudCArPSBjaFxuICAgIH1cbiAgfVxuICBpZiAoY3VycmVudC50cmltKCkpIHBhcnRzLnB1c2goY3VycmVudC50cmltKCkpXG4gIHJldHVybiBwYXJ0c1xufVxuXG4vKipcbiAqIFBhcnNlcyBhbmltYXRpb24gb3B0aW9ucyBmcm9tIGEgYFtrZXk6IHZhbHVlICBrZXkyOiB2YWx1ZTJdYCBzdHJpbmcuXG4gKiBUaGUgb3V0ZXIgYnJhY2tldHMgYXJlIGluY2x1ZGVkIGluIHRoZSBpbnB1dC5cbiAqL1xuZnVuY3Rpb24gcGFyc2VBbmltYXRpb25PcHRpb25zKHJhdzogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgRXhwck5vZGU+IHtcbiAgaWYgKCFyYXcudHJpbSgpKSByZXR1cm4ge31cbiAgLy8gU3RyaXAgb3V0ZXIgYnJhY2tldHNcbiAgY29uc3QgaW5uZXIgPSByYXcucmVwbGFjZSgvXlxcW3xcXF0kL2csICcnKS50cmltKClcbiAgcmV0dXJuIHBhcnNlQXJnTGlzdChpbm5lcilcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBVdGlsaXRpZXNcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5mdW5jdGlvbiBleHByKHJhdzogc3RyaW5nKTogRXhwck5vZGUge1xuICByZXR1cm4geyB0eXBlOiAnZXhwcicsIHJhdyB9XG59XG5cbmZ1bmN0aW9uIGZpcnN0V29yZCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdGV4dC5zcGxpdCgvXFxzKy8pWzBdID8/ICcnXG59XG5cbmZ1bmN0aW9uIHRvU2VxdWVuY2VPclNpbmdsZShzdGVwczogTEVTTm9kZVtdKTogTEVTTm9kZSB7XG4gIGlmIChzdGVwcy5sZW5ndGggPT09IDApIHJldHVybiBleHByKCcnKVxuICBpZiAoc3RlcHMubGVuZ3RoID09PSAxKSByZXR1cm4gc3RlcHNbMF0hXG4gIHJldHVybiB7IHR5cGU6ICdzZXF1ZW5jZScsIHN0ZXBzIH0gc2F0aXNmaWVzIFNlcXVlbmNlTm9kZVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFBhcnNlIGVycm9yXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZXhwb3J0IGNsYXNzIExFU1BhcnNlRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZywgcHVibGljIHJlYWRvbmx5IHRva2VuOiBUb2tlbiB8IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IGxvYyA9IHRva2VuID8gYCAobGluZSAke3Rva2VuLmxpbmVOdW19OiAke0pTT04uc3RyaW5naWZ5KHRva2VuLnRleHQpfSlgIDogJydcbiAgICBzdXBlcihgW0xFUzpwYXJzZXJdICR7bWVzc2FnZX0ke2xvY31gKVxuICAgIHRoaXMubmFtZSA9ICdMRVNQYXJzZUVycm9yJ1xuICB9XG59XG4iLCAiaW1wb3J0IHsgc3RyaXBCb2R5IH0gZnJvbSAnLi9zdHJpcEJvZHkuanMnXG5pbXBvcnQgeyB0b2tlbml6ZSB9IGZyb20gJy4vdG9rZW5pemVyLmpzJ1xuaW1wb3J0IHsgTEVTUGFyc2VyIH0gZnJvbSAnLi9wYXJzZXIuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICcuL2FzdC5qcydcblxuZXhwb3J0IHsgTEVTUGFyc2VyLCBMRVNQYXJzZUVycm9yIH0gZnJvbSAnLi9wYXJzZXIuanMnXG5leHBvcnQgeyB0b2tlbml6ZSwgZW5kc1dpdGhBbmQsIHN0cmlwVHJhaWxpbmdBbmQgfSBmcm9tICcuL3Rva2VuaXplci5qcydcbmV4cG9ydCB7IHN0cmlwQm9keSB9IGZyb20gJy4vc3RyaXBCb2R5LmpzJ1xuZXhwb3J0IHR5cGUgeyBUb2tlbiB9IGZyb20gJy4vdG9rZW5pemVyLmpzJ1xuZXhwb3J0ICogZnJvbSAnLi9hc3QuanMnXG5leHBvcnQgKiBmcm9tICcuL2NvbmZpZy5qcydcblxuLyoqXG4gKiBQYXJzZSBhIHJhdyBMRVMgYm9keSBzdHJpbmcgKGZyb20gYSBkbz0sIGhhbmRsZT0sIG9yIHJ1bj0gYXR0cmlidXRlKVxuICogaW50byBhIHR5cGVkIEFTVCBub2RlLlxuICpcbiAqIFRoaXMgaXMgdGhlIHB1YmxpYyBlbnRyeSBwb2ludCBmb3IgUGhhc2UgMjpcbiAqICAgLSBTdHJpcHMgYmFja3RpY2sgd3JhcHBlciBhbmQgbm9ybWFsaXplcyBpbmRlbnRhdGlvbiAoc3RyaXBCb2R5KVxuICogICAtIFRva2VuaXplcyBpbnRvIGxpbmVzIHdpdGggaW5kZW50IGxldmVscyAodG9rZW5pemUpXG4gKiAgIC0gUGFyc2VzIGludG8gYSB0eXBlZCBMRVNOb2RlIEFTVCAoTEVTUGFyc2VyKVxuICpcbiAqIEB0aHJvd3MgTEVTUGFyc2VFcnJvciBvbiB1bnJlY292ZXJhYmxlIHN5bnRheCBlcnJvcnMgKGN1cnJlbnRseSBzb2Z0LXdhcm5zIGluc3RlYWQpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUxFUyhyYXc6IHN0cmluZyk6IExFU05vZGUge1xuICBjb25zdCBzdHJpcHBlZCA9IHN0cmlwQm9keShyYXcpXG4gIGNvbnN0IHRva2VucyAgID0gdG9rZW5pemUoc3RyaXBwZWQpXG4gIGNvbnN0IHBhcnNlciAgID0gbmV3IExFU1BhcnNlcih0b2tlbnMpXG4gIHJldHVybiBwYXJzZXIucGFyc2UoKVxufVxuIiwgIi8qKlxuICogUGhhc2UgNDogd2lyZXMgdGhlIHBhcnNlZCBjb25maWcgaW50byBsaXZlIHJ1bnRpbWUgYmVoYXZpb3IuXG4gKlxuICogUmVzcG9uc2liaWxpdGllczpcbiAqICAgMS4gUmVnaXN0ZXIgYWxsIDxsb2NhbC1jb21tYW5kPiBwYXJzZWQgZGVmcyBpbnRvIHRoZSBDb21tYW5kUmVnaXN0cnlcbiAqICAgMi4gQXR0YWNoIEN1c3RvbUV2ZW50IGxpc3RlbmVycyBvbiB0aGUgaG9zdCBmb3IgZWFjaCA8b24tZXZlbnQ+XG4gKiAgIDMuIFdpcmUgPG9uLWxvYWQ+IHRvIGZpcmUgYWZ0ZXIgRE9NIGlzIHJlYWR5XG4gKiAgIDQuIEJ1aWxkIHRoZSBMRVNDb250ZXh0IHVzZWQgYnkgdGhlIGV4ZWN1dG9yXG4gKlxuICogPG9uLXNpZ25hbD4gYW5kIDxvbi1lbnRlcj4vPG9uLWV4aXQ+IGFyZSB3aXJlZCBpbiBQaGFzZSA1LzYuXG4gKi9cblxuaW1wb3J0IHsgZXhlY3V0ZSwgZXZhbEV4cHIgfSBmcm9tICcuL2V4ZWN1dG9yLmpzJ1xuaW1wb3J0IHsgTEVTU2NvcGUgfSBmcm9tICcuL3Njb3BlLmpzJ1xuaW1wb3J0IHR5cGUgeyBDb21tYW5kUmVnaXN0cnkgfSBmcm9tICcuL3JlZ2lzdHJ5LmpzJ1xuaW1wb3J0IHR5cGUgeyBNb2R1bGVSZWdpc3RyeSB9IGZyb20gJ0Btb2R1bGVzL3R5cGVzLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNDb25maWcgfSBmcm9tICdAcGFyc2VyL2NvbmZpZy5qcydcbmltcG9ydCB0eXBlIHsgTEVTTm9kZSB9IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuaW1wb3J0IHsgcGFyc2VMRVMgfSBmcm9tICdAcGFyc2VyL2luZGV4LmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlZFdpcmluZyB7XG4gIGNvbW1hbmRzOiAgQXJyYXk8eyBuYW1lOiBzdHJpbmc7IGd1YXJkOiBzdHJpbmcgfCBudWxsOyBhcmdzUmF3OiBzdHJpbmc7IGJvZHk6IExFU05vZGUgfT5cbiAgaGFuZGxlcnM6ICBBcnJheTx7IGV2ZW50OiBzdHJpbmc7IGJvZHk6IExFU05vZGUgfT5cbiAgd2F0Y2hlcnM6ICBBcnJheTx7IHNpZ25hbDogc3RyaW5nOyB3aGVuOiBzdHJpbmcgfCBudWxsOyBib2R5OiBMRVNOb2RlIH0+XG4gIGxpZmVjeWNsZToge1xuICAgIG9uTG9hZDogIExFU05vZGVbXVxuICAgIG9uRW50ZXI6IEFycmF5PHsgd2hlbjogc3RyaW5nIHwgbnVsbDsgYm9keTogTEVTTm9kZSB9PlxuICAgIG9uRXhpdDogIExFU05vZGVbXVxuICB9XG59XG5cbi8qKiBCdWlsZHMgYSBMRVNDb250ZXh0IGZvciB0aGUgaG9zdCBlbGVtZW50LiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ29udGV4dChcbiAgaG9zdDogRWxlbWVudCxcbiAgY29tbWFuZHM6IENvbW1hbmRSZWdpc3RyeSxcbiAgbW9kdWxlczogTW9kdWxlUmVnaXN0cnksXG4gIHNpZ25hbHM6IHsgZ2V0OiAoazogc3RyaW5nKSA9PiB1bmtub3duOyBzZXQ6IChrOiBzdHJpbmcsIHY6IHVua25vd24pID0+IHZvaWQgfVxuKTogaW1wb3J0KCcuL2V4ZWN1dG9yLmpzJykuTEVTQ29udGV4dCB7XG4gIGNvbnN0IHNjb3BlID0gbmV3IExFU1Njb3BlKClcblxuICBjb25zdCBlbWl0TG9jYWwgPSAoZXZlbnQ6IHN0cmluZywgcGF5bG9hZDogdW5rbm93bltdKSA9PiB7XG4gICAgY29uc29sZS5sb2coYFtMRVNdIGVtaXQgXCIke2V2ZW50fVwiYCwgcGF5bG9hZC5sZW5ndGggPyBwYXlsb2FkIDogJycpXG4gICAgaG9zdC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudChldmVudCwge1xuICAgICAgZGV0YWlsOiB7IHBheWxvYWQgfSxcbiAgICAgIGJ1YmJsZXM6IGZhbHNlLFxuICAgICAgY29tcG9zZWQ6IGZhbHNlLFxuICAgIH0pKVxuICB9XG5cbiAgY29uc3QgYnJvYWRjYXN0ID0gKGV2ZW50OiBzdHJpbmcsIHBheWxvYWQ6IHVua25vd25bXSkgPT4ge1xuICAgIGNvbnNvbGUubG9nKGBbTEVTXSBicm9hZGNhc3QgXCIke2V2ZW50fVwiYCwgcGF5bG9hZC5sZW5ndGggPyBwYXlsb2FkIDogJycpXG4gICAgaG9zdC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudChldmVudCwge1xuICAgICAgZGV0YWlsOiB7IHBheWxvYWQgfSxcbiAgICAgIGJ1YmJsZXM6IHRydWUsXG4gICAgICBjb21wb3NlZDogdHJ1ZSxcbiAgICB9KSlcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc2NvcGUsXG4gICAgaG9zdCxcbiAgICBjb21tYW5kcyxcbiAgICBtb2R1bGVzLFxuICAgIGdldFNpZ25hbDogc2lnbmFscy5nZXQsXG4gICAgc2V0U2lnbmFsOiBzaWduYWxzLnNldCxcbiAgICBlbWl0TG9jYWwsXG4gICAgYnJvYWRjYXN0LFxuICB9XG59XG5cbi8qKlxuICogUmVnaXN0ZXJzIGFsbCBwYXJzZWQgY29tbWFuZHMgaW50byB0aGUgcmVnaXN0cnkuXG4gKiBDYWxsZWQgb25jZSBkdXJpbmcgX2luaXQsIGJlZm9yZSBhbnkgZXZlbnRzIGFyZSB3aXJlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyQ29tbWFuZHMoXG4gIHdpcmluZzogUGFyc2VkV2lyaW5nLFxuICByZWdpc3RyeTogQ29tbWFuZFJlZ2lzdHJ5XG4pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBjbWQgb2Ygd2lyaW5nLmNvbW1hbmRzKSB7XG4gICAgLy8gUGFyc2UgYXJnc1JhdyBpbnRvIEFyZ0RlZltdIChzaW1wbGlmaWVkIFx1MjAxNCBmdWxsIGFyZyBwYXJzaW5nIGluIFBoYXNlIDIgcmVmaW5lbWVudClcbiAgICBjb25zdCBhcmdzID0gcGFyc2VBcmdzUmF3KGNtZC5hcmdzUmF3KVxuICAgIGNvbnN0IGRlZjogaW1wb3J0KCcuL3JlZ2lzdHJ5LmpzJykuQ29tbWFuZERlZiA9IHtcbiAgICAgIG5hbWU6IGNtZC5uYW1lLFxuICAgICAgYXJncyxcbiAgICAgIGJvZHk6IGNtZC5ib2R5LFxuICAgICAgZWxlbWVudDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbG9jYWwtY29tbWFuZCcpLFxuICAgIH1cbiAgICBpZiAoY21kLmd1YXJkKSBkZWYuZ3VhcmQgPSBjbWQuZ3VhcmRcbiAgICByZWdpc3RyeS5yZWdpc3RlcihkZWYpXG4gIH1cbiAgY29uc29sZS5sb2coYFtMRVNdIHJlZ2lzdGVyZWQgJHt3aXJpbmcuY29tbWFuZHMubGVuZ3RofSBjb21tYW5kc2ApXG59XG5cbi8qKlxuICogQXR0YWNoZXMgZXZlbnQgbGlzdGVuZXJzIG9uIHRoZSBob3N0IGZvciBhbGwgPG9uLWV2ZW50PiBoYW5kbGVycy5cbiAqIFJldHVybnMgYSBjbGVhbnVwIGZ1bmN0aW9uIHRoYXQgcmVtb3ZlcyBhbGwgbGlzdGVuZXJzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2lyZUV2ZW50SGFuZGxlcnMoXG4gIHdpcmluZzogUGFyc2VkV2lyaW5nLFxuICBob3N0OiBFbGVtZW50LFxuICBnZXRDdHg6ICgpID0+IGltcG9ydCgnLi9leGVjdXRvci5qcycpLkxFU0NvbnRleHRcbik6ICgpID0+IHZvaWQge1xuICBjb25zdCBjbGVhbnVwczogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXVxuXG4gIGZvciAoY29uc3QgaGFuZGxlciBvZiB3aXJpbmcuaGFuZGxlcnMpIHtcbiAgICBjb25zdCBsaXN0ZW5lciA9IChlOiBFdmVudCkgPT4ge1xuICAgICAgY29uc3QgY3R4ID0gZ2V0Q3R4KClcbiAgICAgIC8vIEV4cG9zZSBldmVudCBkZXRhaWwgaW4gc2NvcGVcbiAgICAgIGNvbnN0IGhhbmRsZXJTY29wZSA9IGN0eC5zY29wZS5jaGlsZCgpXG4gICAgICBjb25zdCBkZXRhaWwgPSAoZSBhcyBDdXN0b21FdmVudCkuZGV0YWlsID8/IHt9XG4gICAgICBoYW5kbGVyU2NvcGUuc2V0KCdldmVudCcsIGUpXG4gICAgICBoYW5kbGVyU2NvcGUuc2V0KCdwYXlsb2FkJywgZGV0YWlsLnBheWxvYWQgPz8gW10pXG4gICAgICBjb25zdCBoYW5kbGVyQ3R4ID0geyAuLi5jdHgsIHNjb3BlOiBoYW5kbGVyU2NvcGUgfVxuXG4gICAgICBleGVjdXRlKGhhbmRsZXIuYm9keSwgaGFuZGxlckN0eCkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgW0xFU10gRXJyb3IgaW4gaGFuZGxlciBmb3IgXCIke2hhbmRsZXIuZXZlbnR9XCI6YCwgZXJyKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBob3N0LmFkZEV2ZW50TGlzdGVuZXIoaGFuZGxlci5ldmVudCwgbGlzdGVuZXIpXG4gICAgY2xlYW51cHMucHVzaCgoKSA9PiBob3N0LnJlbW92ZUV2ZW50TGlzdGVuZXIoaGFuZGxlci5ldmVudCwgbGlzdGVuZXIpKVxuICAgIGNvbnNvbGUubG9nKGBbTEVTXSB3aXJlZCBldmVudCBoYW5kbGVyOiBcIiR7aGFuZGxlci5ldmVudH1cImApXG4gIH1cblxuICByZXR1cm4gKCkgPT4gY2xlYW51cHMuZm9yRWFjaChmbiA9PiBmbigpKVxufVxuXG4vKipcbiAqIEZpcmVzIGFsbCA8b24tbG9hZD4gYm9kaWVzLlxuICogQ2FsbGVkIGFmdGVyIGNvbW1hbmRzIGFyZSByZWdpc3RlcmVkIGFuZCBldmVudCBoYW5kbGVycyBhcmUgd2lyZWQsXG4gKiBzbyBlbWl0L2NhbGwgc3RhdGVtZW50cyBpbiBvbi1sb2FkIGNhbiByZWFjaCB0aGVpciB0YXJnZXRzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmlyZU9uTG9hZChcbiAgd2lyaW5nOiBQYXJzZWRXaXJpbmcsXG4gIGdldEN0eDogKCkgPT4gaW1wb3J0KCcuL2V4ZWN1dG9yLmpzJykuTEVTQ29udGV4dFxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGZvciAoY29uc3QgYm9keSBvZiB3aXJpbmcubGlmZWN5Y2xlLm9uTG9hZCkge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBleGVjdXRlKGJvZHksIGdldEN0eCgpKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcignW0xFU10gRXJyb3IgaW4gb24tbG9hZDonLCBlcnIpXG4gICAgfVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gQXJnIHBhcnNpbmcgKHNpbXBsaWZpZWQgXHUyMDE0IGZ1bGwgdHlwZS1jaGVja2VkIHZlcnNpb24gaW4gUGhhc2UgMiByZWZpbmVtZW50KVxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmltcG9ydCB0eXBlIHsgQXJnRGVmIH0gZnJvbSAnLi9yZWdpc3RyeS5qcydcbmltcG9ydCB0eXBlIHsgRXhwck5vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuZnVuY3Rpb24gcGFyc2VBcmdzUmF3KHJhdzogc3RyaW5nKTogQXJnRGVmW10ge1xuICBpZiAoIXJhdy50cmltKCkpIHJldHVybiBbXVxuICAvLyBTdHJpcCBvdXRlciBicmFja2V0czogXCJbZnJvbTpzdHIgIHRvOnN0ciAgYXR0ZW1wdDppbnQ9MF1cIiBcdTIxOTIgXCJmcm9tOnN0ciAgdG86c3RyICBhdHRlbXB0OmludD0wXCJcbiAgY29uc3QgaW5uZXIgPSByYXcucmVwbGFjZSgvXlxcW3xcXF0kL2csICcnKS50cmltKClcbiAgaWYgKCFpbm5lcikgcmV0dXJuIFtdXG5cbiAgcmV0dXJuIGlubmVyLnNwbGl0KC9cXHN7Mix9fFxccyg/PVxcdys6KS8pLm1hcChzID0+IHMudHJpbSgpKS5maWx0ZXIoQm9vbGVhbikubWFwKHBhcnQgPT4ge1xuICAgIC8vIGBuYW1lOnR5cGU9ZGVmYXVsdGAgb3IgYG5hbWU6dHlwZWBcbiAgICBjb25zdCBlcUlkeCA9IHBhcnQuaW5kZXhPZignPScpXG4gICAgY29uc3QgY29sb25JZHggPSBwYXJ0LmluZGV4T2YoJzonKVxuICAgIGlmIChjb2xvbklkeCA9PT0gLTEpIHJldHVybiB7IG5hbWU6IHBhcnQsIHR5cGU6ICdkeW4nIH1cblxuICAgIGNvbnN0IG5hbWUgPSBwYXJ0LnNsaWNlKDAsIGNvbG9uSWR4KS50cmltKClcbiAgICBjb25zdCByZXN0ID0gcGFydC5zbGljZShjb2xvbklkeCArIDEpXG5cbiAgICBpZiAoZXFJZHggPT09IC0xKSB7XG4gICAgICByZXR1cm4geyBuYW1lLCB0eXBlOiByZXN0LnRyaW0oKSB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHR5cGUgPSBwYXJ0LnNsaWNlKGNvbG9uSWR4ICsgMSwgZXFJZHgpLnRyaW0oKVxuICAgICAgY29uc3QgZGVmYXVsdFJhdyA9IHBhcnQuc2xpY2UoZXFJZHggKyAxKS50cmltKClcbiAgICAgIGNvbnN0IGRlZmF1bHRFeHByOiBFeHByTm9kZSA9IHsgdHlwZTogJ2V4cHInLCByYXc6IGRlZmF1bHRSYXcgfVxuICAgICAgcmV0dXJuIHsgbmFtZSwgdHlwZSwgZGVmYXVsdDogZGVmYXVsdEV4cHIgfVxuICAgIH1cbiAgfSlcbn1cbiIsICIvKipcbiAqIExFU1Njb3BlIFx1MjAxNCBhIHNpbXBsZSBsZXhpY2FsbHktc2NvcGVkIHZhcmlhYmxlIHN0b3JlLlxuICpcbiAqIEVhY2ggY29tbWFuZCBpbnZvY2F0aW9uIGdldHMgYSBmcmVzaCBjaGlsZCBzY29wZS5cbiAqIE1hdGNoIGFybSBiaW5kaW5ncyBhbHNvIGNyZWF0ZSBhIGNoaWxkIHNjb3BlIGxpbWl0ZWQgdG8gdGhhdCBhcm0ncyBib2R5LlxuICogU2lnbmFsIHJlYWRzL3dyaXRlcyBnbyB0aHJvdWdoIHRoZSBEYXRhc3RhciBicmlkZ2UsIG5vdCB0aGlzIHNjb3BlLlxuICovXG5leHBvcnQgY2xhc3MgTEVTU2NvcGUge1xuICBwcml2YXRlIGxvY2FscyA9IG5ldyBNYXA8c3RyaW5nLCB1bmtub3duPigpXG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwYXJlbnQ/OiBMRVNTY29wZSkge31cblxuICBnZXQobmFtZTogc3RyaW5nKTogdW5rbm93biB7XG4gICAgaWYgKHRoaXMubG9jYWxzLmhhcyhuYW1lKSkgcmV0dXJuIHRoaXMubG9jYWxzLmdldChuYW1lKVxuICAgIHJldHVybiB0aGlzLnBhcmVudD8uZ2V0KG5hbWUpXG4gIH1cblxuICBzZXQobmFtZTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIHRoaXMubG9jYWxzLnNldChuYW1lLCB2YWx1ZSlcbiAgfVxuXG4gIGhhcyhuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5sb2NhbHMuaGFzKG5hbWUpIHx8ICh0aGlzLnBhcmVudD8uaGFzKG5hbWUpID8/IGZhbHNlKVxuICB9XG5cbiAgLyoqIENyZWF0ZSBhIGNoaWxkIHNjb3BlIGluaGVyaXRpbmcgYWxsIGxvY2FscyBmcm9tIHRoaXMgb25lLiAqL1xuICBjaGlsZCgpOiBMRVNTY29wZSB7XG4gICAgcmV0dXJuIG5ldyBMRVNTY29wZSh0aGlzKVxuICB9XG5cbiAgLyoqIFNuYXBzaG90IGFsbCBsb2NhbHMgKGZvciBkZWJ1Z2dpbmcgLyBlcnJvciBtZXNzYWdlcykuICovXG4gIHNuYXBzaG90KCk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcbiAgICBjb25zdCBiYXNlID0gdGhpcy5wYXJlbnQ/LnNuYXBzaG90KCkgPz8ge31cbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiB0aGlzLmxvY2FscykgYmFzZVtrXSA9IHZcbiAgICByZXR1cm4gYmFzZVxuICB9XG59XG4iLCAiLyoqXG4gKiBQaGFzZSA1YTogSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgd2lyaW5nXG4gKlxuICogT25lIHNoYXJlZCBJbnRlcnNlY3Rpb25PYnNlcnZlciBpcyBjcmVhdGVkIHBlciA8bG9jYWwtZXZlbnQtc2NyaXB0PiBob3N0LlxuICogSXQgd2F0Y2hlcyB0aGUgaG9zdCBlbGVtZW50IGl0c2VsZiAobm90IGl0cyBjaGlsZHJlbikuXG4gKlxuICogb24tZW50ZXI6IGZpcmVzIHdoZW4gdGhlIGhvc3QgY3Jvc3NlcyBpbnRvIHRoZSB2aWV3cG9ydFxuICogICAtIEVhY2ggPG9uLWVudGVyPiBoYXMgYW4gb3B0aW9uYWwgYHdoZW5gIGd1YXJkIGV2YWx1YXRlZCBhdCBmaXJlIHRpbWVcbiAqICAgLSBNdWx0aXBsZSA8b24tZW50ZXI+IGNoaWxkcmVuIGFyZSBhbGwgY2hlY2tlZCBpbiBkZWNsYXJhdGlvbiBvcmRlclxuICpcbiAqIG9uLWV4aXQ6IGZpcmVzIHdoZW4gdGhlIGhvc3QgbGVhdmVzIHRoZSB2aWV3cG9ydFxuICogICAtIEFsd2F5cyBmaXJlcyB1bmNvbmRpdGlvbmFsbHkgKG5vIGB3aGVuYCBndWFyZCBvbiBvbi1leGl0KVxuICogICAtIE11bHRpcGxlIDxvbi1leGl0PiBjaGlsZHJlbiBhbGwgZmlyZVxuICpcbiAqIFRoZSBvYnNlcnZlciBpcyBkaXNjb25uZWN0ZWQgaW4gZGlzY29ubmVjdGVkQ2FsbGJhY2sgdmlhIHRoZSByZXR1cm5lZCBjbGVhbnVwIGZuLlxuICovXG5cbmltcG9ydCB7IGV4ZWN1dGUsIGV2YWxFeHByIH0gZnJvbSAnLi9leGVjdXRvci5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29udGV4dCB9IGZyb20gJy4vZXhlY3V0b3IuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuZXhwb3J0IGludGVyZmFjZSBPbkVudGVyRGVjbCB7XG4gIHdoZW46IHN0cmluZyB8IG51bGxcbiAgYm9keTogTEVTTm9kZVxufVxuXG4vKipcbiAqIEF0dGFjaGVzIGFuIEludGVyc2VjdGlvbk9ic2VydmVyIHRvIHRoZSBob3N0IGVsZW1lbnQuXG4gKlxuICogQHJldHVybnMgQSBjbGVhbnVwIGZ1bmN0aW9uIHRoYXQgZGlzY29ubmVjdHMgdGhlIG9ic2VydmVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2lyZUludGVyc2VjdGlvbk9ic2VydmVyKFxuICBob3N0OiBFbGVtZW50LFxuICBvbkVudGVyOiBPbkVudGVyRGVjbFtdLFxuICBvbkV4aXQ6IExFU05vZGVbXSxcbiAgZ2V0Q3R4OiAoKSA9PiBMRVNDb250ZXh0LFxuKTogKCkgPT4gdm9pZCB7XG4gIGlmIChvbkVudGVyLmxlbmd0aCA9PT0gMCAmJiBvbkV4aXQubGVuZ3RoID09PSAwKSB7XG4gICAgLy8gTm90aGluZyB0byBvYnNlcnZlIFx1MjAxNCBza2lwIGNyZWF0aW5nIHRoZSBJTyBlbnRpcmVseVxuICAgIHJldHVybiAoKSA9PiB7fVxuICB9XG5cbiAgbGV0IHdhc0ludGVyc2VjdGluZzogYm9vbGVhbiB8IG51bGwgPSBudWxsXG5cbiAgY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIoXG4gICAgKGVudHJpZXMpID0+IHtcbiAgICAgIC8vIElPIGZpcmVzIG9uY2UgaW1tZWRpYXRlbHkgb24gYXR0YWNoIHdpdGggdGhlIGN1cnJlbnQgc3RhdGUuXG4gICAgICAvLyBXZSB0cmFjayBgd2FzSW50ZXJzZWN0aW5nYCB0byBhdm9pZCBzcHVyaW91cyBvbi1leGl0IG9uIGZpcnN0IHRpY2suXG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgICAgY29uc3Qgbm93SW50ZXJzZWN0aW5nID0gZW50cnkuaXNJbnRlcnNlY3RpbmdcblxuICAgICAgICBpZiAobm93SW50ZXJzZWN0aW5nICYmIHdhc0ludGVyc2VjdGluZyAhPT0gdHJ1ZSkge1xuICAgICAgICAgIC8vIEVudGVyZWQgdmlld3BvcnRcbiAgICAgICAgICB3YXNJbnRlcnNlY3RpbmcgPSB0cnVlXG4gICAgICAgICAgaGFuZGxlRW50ZXIob25FbnRlciwgZ2V0Q3R4KVxuICAgICAgICB9IGVsc2UgaWYgKCFub3dJbnRlcnNlY3RpbmcgJiYgd2FzSW50ZXJzZWN0aW5nID09PSB0cnVlKSB7XG4gICAgICAgICAgLy8gRXhpdGVkIHZpZXdwb3J0IChvbmx5IGFmdGVyIHdlJ3ZlIGJlZW4gaW4gaXQpXG4gICAgICAgICAgd2FzSW50ZXJzZWN0aW5nID0gZmFsc2VcbiAgICAgICAgICBoYW5kbGVFeGl0KG9uRXhpdCwgZ2V0Q3R4KVxuICAgICAgICB9IGVsc2UgaWYgKHdhc0ludGVyc2VjdGluZyA9PT0gbnVsbCkge1xuICAgICAgICAgIC8vIEZpcnN0IHRpY2sgXHUyMDE0IHJlY29yZCBzdGF0ZSBidXQgZG9uJ3QgZmlyZSBleGl0IGZvciBpbml0aWFsbHktb2ZmLXNjcmVlblxuICAgICAgICAgIHdhc0ludGVyc2VjdGluZyA9IG5vd0ludGVyc2VjdGluZ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAvLyBEZWZhdWx0IHRocmVzaG9sZDogZmlyZSB3aGVuIGFueSBwaXhlbCBvZiB0aGUgaG9zdCBlbnRlcnMvZXhpdHNcbiAgICAgIHRocmVzaG9sZDogMCxcbiAgICB9XG4gIClcblxuICBvYnNlcnZlci5vYnNlcnZlKGhvc3QpXG4gIGNvbnNvbGUubG9nKCdbTEVTXSBJbnRlcnNlY3Rpb25PYnNlcnZlciBhdHRhY2hlZCcsIChob3N0IGFzIEhUTUxFbGVtZW50KS5pZCB8fCBob3N0LnRhZ05hbWUpXG5cbiAgcmV0dXJuICgpID0+IHtcbiAgICBvYnNlcnZlci5kaXNjb25uZWN0KClcbiAgICBjb25zb2xlLmxvZygnW0xFU10gSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgZGlzY29ubmVjdGVkJylcbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVFbnRlcihkZWNsczogT25FbnRlckRlY2xbXSwgZ2V0Q3R4OiAoKSA9PiBMRVNDb250ZXh0KTogdm9pZCB7XG4gIGNvbnN0IGN0eCA9IGdldEN0eCgpXG5cbiAgZm9yIChjb25zdCBkZWNsIG9mIGRlY2xzKSB7XG4gICAgLy8gRXZhbHVhdGUgYHdoZW5gIGd1YXJkIFx1MjAxNCBpZiBhYnNlbnQsIGFsd2F5cyBmaXJlc1xuICAgIGlmIChkZWNsLndoZW4pIHtcbiAgICAgIGNvbnN0IHBhc3NlcyA9IEJvb2xlYW4oZXZhbEV4cHIoeyB0eXBlOiAnZXhwcicsIHJhdzogZGVjbC53aGVuIH0sIGN0eCkpXG4gICAgICBpZiAoIXBhc3Nlcykge1xuICAgICAgICBjb25zb2xlLmxvZyhgW0xFU10gb24tZW50ZXIgZ3VhcmQgcmVqZWN0ZWQ6ICR7ZGVjbC53aGVufWApXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgfVxuXG4gICAgZXhlY3V0ZShkZWNsLmJvZHksIGN0eCkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tMRVNdIEVycm9yIGluIG9uLWVudGVyOicsIGVycilcbiAgICB9KVxuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUV4aXQoYm9kaWVzOiBMRVNOb2RlW10sIGdldEN0eDogKCkgPT4gTEVTQ29udGV4dCk6IHZvaWQge1xuICBjb25zdCBjdHggPSBnZXRDdHgoKVxuXG4gIGZvciAoY29uc3QgYm9keSBvZiBib2RpZXMpIHtcbiAgICBleGVjdXRlKGJvZHksIGN0eCkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tMRVNdIEVycm9yIGluIG9uLWV4aXQ6JywgZXJyKVxuICAgIH0pXG4gIH1cbn1cbiIsICIvKipcbiAqIFBoYXNlIDViOiBTaWduYWwgd2F0Y2hlciB3aXJpbmdcbiAqXG4gKiA8b24tc2lnbmFsPiByZWFjdHMgd2hlbmV2ZXIgYSBuYW1lZCBEYXRhc3RhciBzaWduYWwgY2hhbmdlcy5cbiAqIFRoZSBgd2hlbmAgZ3VhcmQgaXMgcmUtZXZhbHVhdGVkIG9uIGV2ZXJ5IGNoYW5nZSBcdTIwMTQgaWYgZmFsc3ksIHRoZVxuICogaGFuZGxlIGJvZHkgZG9lcyBub3QgcnVuIChub3QgYW4gZXJyb3IsIGp1c3QgZmlsdGVyZWQgb3V0KS5cbiAqXG4gKiBJbiBQaGFzZSA1IHdlIHVzZSBhIHNpbXBsZSBsb2NhbCBub3RpZmljYXRpb24gcGF0aDogd2hlbmV2ZXJcbiAqIExvY2FsRXZlbnRTY3JpcHQuX3NldFNpZ25hbCgpIHdyaXRlcyBhIHZhbHVlLCBpdCBjYWxscyBpbnRvXG4gKiBub3RpZnlTaWduYWxXYXRjaGVycygpLiBUaGlzIGhhbmRsZXMgdGhlIGZhbGxiYWNrIChubyBEYXRhc3RhcikgY2FzZS5cbiAqXG4gKiBQaGFzZSA2IHJlcGxhY2VzIHRoZSBub3RpZmljYXRpb24gcGF0aCB3aXRoIERhdGFzdGFyJ3MgZWZmZWN0KCkgc3lzdGVtLFxuICogd2hpY2ggaXMgbW9yZSBlZmZpY2llbnQgKGJhdGNoZWQsIGRlZHVwZWQsIHJlYWN0aXZlIGdyYXBoLWF3YXJlKS5cbiAqXG4gKiBUaGUgd2F0Y2hlciBmaXJlcyB0aGUgYm9keSBhc3luY2hyb25vdXNseSAobm9uLWJsb2NraW5nKSB0byBtYXRjaFxuICogdGhlIGJlaGF2aW91ciBvZiBEYXRhc3RhcidzIHJlYWN0aXZlIGVmZmVjdHMuXG4gKi9cblxuaW1wb3J0IHsgZXhlY3V0ZSwgZXZhbEV4cHIgfSBmcm9tICcuL2V4ZWN1dG9yLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNDb250ZXh0IH0gZnJvbSAnLi9leGVjdXRvci5qcydcbmltcG9ydCB0eXBlIHsgTEVTTm9kZSB9IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIFNpZ25hbFdhdGNoZXJEZWNsIHtcbiAgLyoqIFNpZ25hbCBuYW1lIHdpdGggJCBwcmVmaXg6IFwiJGZlZWRTdGF0ZVwiICovXG4gIHNpZ25hbDogc3RyaW5nXG4gIC8qKiBPcHRpb25hbCBndWFyZCBleHByZXNzaW9uIFx1MjAxNCBudWxsIG1lYW5zIGFsd2F5cyBmaXJlcyAqL1xuICB3aGVuOiBzdHJpbmcgfCBudWxsXG4gIGJvZHk6IExFU05vZGVcbn1cblxuLyoqXG4gKiBDaGVja3MgYWxsIHNpZ25hbCB3YXRjaGVycyB0byBzZWUgaWYgYW55IHNob3VsZCBmaXJlIGZvciB0aGVcbiAqIGdpdmVuIHNpZ25hbCBuYW1lIGNoYW5nZS5cbiAqXG4gKiBDYWxsZWQgZnJvbSBMb2NhbEV2ZW50U2NyaXB0Ll9zZXRTaWduYWwoKSBhZnRlciBldmVyeSB3cml0ZS5cbiAqIEFsc28gY2FsbGVkIGZyb20gUGhhc2UgNiBEYXRhc3RhciBlZmZlY3QoKSBzdWJzY3JpcHRpb25zLlxuICpcbiAqIEBwYXJhbSBjaGFuZ2VkU2lnbmFsICBUaGUgc2lnbmFsIG5hbWUgKndpdGhvdXQqIHRoZSAkIHByZWZpeFxuICogQHBhcmFtIHdhdGNoZXJzICAgICAgIEFsbCBvbi1zaWduYWwgZGVjbGFyYXRpb25zIGZvciB0aGlzIExFUyBpbnN0YW5jZVxuICogQHBhcmFtIGdldEN0eCAgICAgICAgIFJldHVybnMgdGhlIGN1cnJlbnQgZXhlY3V0aW9uIGNvbnRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdGlmeVNpZ25hbFdhdGNoZXJzKFxuICBjaGFuZ2VkU2lnbmFsOiBzdHJpbmcsXG4gIHdhdGNoZXJzOiBTaWduYWxXYXRjaGVyRGVjbFtdLFxuICBnZXRDdHg6ICgpID0+IExFU0NvbnRleHRcbik6IHZvaWQge1xuICBmb3IgKGNvbnN0IHdhdGNoZXIgb2Ygd2F0Y2hlcnMpIHtcbiAgICAvLyBOb3JtYWxpemU6IHN0cmlwIGxlYWRpbmcgJCBmb3IgY29tcGFyaXNvblxuICAgIGNvbnN0IHdhdGNoZWRLZXkgPSB3YXRjaGVyLnNpZ25hbC5yZXBsYWNlKC9eXFwkLywgJycpXG5cbiAgICBpZiAod2F0Y2hlZEtleSAhPT0gY2hhbmdlZFNpZ25hbCkgY29udGludWVcblxuICAgIGNvbnN0IGN0eCA9IGdldEN0eCgpXG5cbiAgICAvLyBFdmFsdWF0ZSBgd2hlbmAgZ3VhcmRcbiAgICBpZiAod2F0Y2hlci53aGVuKSB7XG4gICAgICBjb25zdCBwYXNzZXMgPSBCb29sZWFuKGV2YWxFeHByKHsgdHlwZTogJ2V4cHInLCByYXc6IHdhdGNoZXIud2hlbiB9LCBjdHgpKVxuICAgICAgaWYgKCFwYXNzZXMpIGNvbnRpbnVlXG4gICAgfVxuXG4gICAgLy8gRmlyZSB0aGUgYm9keSBhc3luY2hyb25vdXNseSBcdTIwMTQgZG9uJ3QgYmxvY2sgdGhlIHNpZ25hbCB3cml0ZSBwYXRoXG4gICAgZXhlY3V0ZSh3YXRjaGVyLmJvZHksIGN0eCkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFtMRVNdIEVycm9yIGluIG9uLXNpZ25hbCBcIiR7d2F0Y2hlci5zaWduYWx9XCI6YCwgZXJyKVxuICAgIH0pXG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgRGF0YXN0YXItY29tcGF0aWJsZSBlZmZlY3Qgc3Vic2NyaXB0aW9uIGZvciBvbmUgc2lnbmFsIHdhdGNoZXIuXG4gKiBVc2VkIGluIFBoYXNlIDYgd2hlbiBEYXRhc3RhciBpcyBwcmVzZW50LlxuICpcbiAqIEBwYXJhbSB3YXRjaGVyICAgVGhlIG9uLXNpZ25hbCBkZWNsYXJhdGlvblxuICogQHBhcmFtIGVmZmVjdCAgICBEYXRhc3RhcidzIGVmZmVjdCgpIGZ1bmN0aW9uXG4gKiBAcGFyYW0gZ2V0Q3R4ICAgIFJldHVybnMgdGhlIGN1cnJlbnQgZXhlY3V0aW9uIGNvbnRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpcmVTaWduYWxXYXRjaGVyVmlhRGF0YXN0YXIoXG4gIHdhdGNoZXI6IFNpZ25hbFdhdGNoZXJEZWNsLFxuICBlZmZlY3Q6IChmbjogKCkgPT4gdm9pZCkgPT4gdm9pZCxcbiAgZ2V0Q3R4OiAoKSA9PiBMRVNDb250ZXh0XG4pOiB2b2lkIHtcbiAgZWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBjdHggPSBnZXRDdHgoKVxuXG4gICAgLy8gUmVhZGluZyB0aGUgc2lnbmFsIGluc2lkZSBhbiBlZmZlY3QoKSBhdXRvLXN1YnNjcmliZXMgdXMgdG8gaXRcbiAgICBjb25zdCBzaWduYWxLZXkgPSB3YXRjaGVyLnNpZ25hbC5yZXBsYWNlKC9eXFwkLywgJycpXG4gICAgY3R4LmdldFNpZ25hbChzaWduYWxLZXkpIC8vIHN1YnNjcmlwdGlvbiBzaWRlLWVmZmVjdFxuXG4gICAgaWYgKHdhdGNoZXIud2hlbikge1xuICAgICAgY29uc3QgcGFzc2VzID0gQm9vbGVhbihldmFsRXhwcih7IHR5cGU6ICdleHByJywgcmF3OiB3YXRjaGVyLndoZW4gfSwgY3R4KSlcbiAgICAgIGlmICghcGFzc2VzKSByZXR1cm5cbiAgICB9XG5cbiAgICBleGVjdXRlKHdhdGNoZXIuYm9keSwgY3R4KS5jYXRjaChlcnIgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcihgW0xFU10gRXJyb3IgaW4gb24tc2lnbmFsIFwiJHt3YXRjaGVyLnNpZ25hbH1cIiAoRGF0YXN0YXIpOmAsIGVycilcbiAgICB9KVxuICB9KVxufVxuIiwgImltcG9ydCB7IENvbW1hbmRSZWdpc3RyeSB9IGZyb20gJ0BydW50aW1lL3JlZ2lzdHJ5LmpzJ1xuaW1wb3J0IHsgTW9kdWxlUmVnaXN0cnksIGxvYWRNb2R1bGUgfSBmcm9tICdAbW9kdWxlcy90eXBlcy5qcydcbmltcG9ydCB7IHJlYWRDb25maWcsIGxvZ0NvbmZpZyB9IGZyb20gJ0BwYXJzZXIvcmVhZGVyLmpzJ1xuaW1wb3J0IHsgcGFyc2VMRVMgfSBmcm9tICdAcGFyc2VyL2luZGV4LmpzJ1xuaW1wb3J0IHsgYnVpbGRDb250ZXh0LCByZWdpc3RlckNvbW1hbmRzLCB3aXJlRXZlbnRIYW5kbGVycywgZmlyZU9uTG9hZCwgdHlwZSBQYXJzZWRXaXJpbmcgfSBmcm9tICdAcnVudGltZS93aXJpbmcuanMnXG5pbXBvcnQgeyB3aXJlSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgfSBmcm9tICdAcnVudGltZS9vYnNlcnZlci5qcydcbmltcG9ydCB7IG5vdGlmeVNpZ25hbFdhdGNoZXJzLCB3aXJlU2lnbmFsV2F0Y2hlclZpYURhdGFzdGFyIH0gZnJvbSAnQHJ1bnRpbWUvc2lnbmFscy5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29uZmlnIH0gZnJvbSAnQHBhcnNlci9jb25maWcuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29udGV4dCB9IGZyb20gJ0BydW50aW1lL2V4ZWN1dG9yLmpzJ1xuXG5leHBvcnQgY2xhc3MgTG9jYWxFdmVudFNjcmlwdCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgcmVhZG9ubHkgY29tbWFuZHMgPSBuZXcgQ29tbWFuZFJlZ2lzdHJ5KClcbiAgcmVhZG9ubHkgbW9kdWxlcyAgPSBuZXcgTW9kdWxlUmVnaXN0cnkoKVxuXG4gIHByaXZhdGUgX2NvbmZpZzogIExFU0NvbmZpZyB8IG51bGwgID0gbnVsbFxuICBwcml2YXRlIF93aXJpbmc6ICBQYXJzZWRXaXJpbmcgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIF9jdHg6ICAgICBMRVNDb250ZXh0IHwgbnVsbCA9IG51bGxcblxuICAvLyBDbGVhbnVwIGZucyBhY2N1bXVsYXRlZCBkdXJpbmcgX2luaXQgXHUyMDE0IGFsbCBjYWxsZWQgaW4gX3RlYXJkb3duXG4gIHByaXZhdGUgX2NsZWFudXBzOiBBcnJheTwoKSA9PiB2b2lkPiA9IFtdXG5cbiAgLy8gU2ltcGxlIGZhbGxiYWNrIHNpZ25hbCBzdG9yZSAoRGF0YXN0YXIgYnJpZGdlIHJlcGxhY2VzIHJlYWRzL3dyaXRlcyBpbiBQaGFzZSA2KVxuICBwcml2YXRlIF9zaWduYWxzOiBNYXA8c3RyaW5nLCB1bmtub3duPiA9IG5ldyBNYXAoKVxuXG4gIC8vIERhdGFzdGFyIGJyaWRnZSAocG9wdWxhdGVkIGluIFBoYXNlIDYgdmlhIGF0dHJpYnV0ZSBwbHVnaW4pXG4gIHByaXZhdGUgX2RzRWZmZWN0OiAoKGZuOiAoKSA9PiB2b2lkKSA9PiB2b2lkKSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZFxuICBwcml2YXRlIF9kc1NpZ25hbDogKDxUPihuYW1lOiBzdHJpbmcsIGluaXQ/OiBUKSA9PiB7IHZhbHVlOiBUIH0pIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG5cbiAgZ2V0IGNvbmZpZygpOiAgTEVTQ29uZmlnIHwgbnVsbCAgICB7IHJldHVybiB0aGlzLl9jb25maWcgfVxuICBnZXQgd2lyaW5nKCk6ICBQYXJzZWRXaXJpbmcgfCBudWxsIHsgcmV0dXJuIHRoaXMuX3dpcmluZyB9XG4gIGdldCBjb250ZXh0KCk6IExFU0NvbnRleHQgfCBudWxsICAgeyByZXR1cm4gdGhpcy5fY3R4IH1cblxuICBzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpOiBzdHJpbmdbXSB7IHJldHVybiBbXSB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgcXVldWVNaWNyb3Rhc2soKCkgPT4gdGhpcy5faW5pdCgpKVxuICB9XG5cbiAgZGlzY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgdGhpcy5fdGVhcmRvd24oKVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEludGVybmFsIGxpZmVjeWNsZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwcml2YXRlIGFzeW5jIF9pbml0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBpbml0aWFsaXppbmcnLCB0aGlzLmlkIHx8ICcobm8gaWQpJylcblxuICAgIC8vIFBoYXNlIDE6IERPTSBcdTIxOTIgY29uZmlnXG4gICAgdGhpcy5fY29uZmlnID0gcmVhZENvbmZpZyh0aGlzKVxuICAgIGxvZ0NvbmZpZyh0aGlzLl9jb25maWcpXG5cbiAgICAvLyBQaGFzZSA4OiBsb2FkIG1vZHVsZXMgYmVmb3JlIHBhcnNpbmcgc28gcHJpbWl0aXZlIG5hbWVzIHJlc29sdmVcbiAgICBhd2FpdCB0aGlzLl9sb2FkTW9kdWxlcyh0aGlzLl9jb25maWcpXG5cbiAgICAvLyBQaGFzZSAyOiBwYXJzZSBib2R5IHN0cmluZ3MgXHUyMTkyIEFTVFxuICAgIHRoaXMuX3dpcmluZyA9IHRoaXMuX3BhcnNlQWxsKHRoaXMuX2NvbmZpZylcblxuICAgIC8vIFBoYXNlIDQ6IGJ1aWxkIGNvbnRleHQsIHJlZ2lzdGVyIGNvbW1hbmRzLCB3aXJlIGV2ZW50IGhhbmRsZXJzXG4gICAgdGhpcy5fY3R4ID0gYnVpbGRDb250ZXh0KFxuICAgICAgdGhpcyxcbiAgICAgIHRoaXMuY29tbWFuZHMsXG4gICAgICB0aGlzLm1vZHVsZXMsXG4gICAgICB7IGdldDogayA9PiB0aGlzLl9nZXRTaWduYWwoayksIHNldDogKGssIHYpID0+IHRoaXMuX3NldFNpZ25hbChrLCB2KSB9XG4gICAgKVxuXG4gICAgcmVnaXN0ZXJDb21tYW5kcyh0aGlzLl93aXJpbmcsIHRoaXMuY29tbWFuZHMpXG5cbiAgICB0aGlzLl9jbGVhbnVwcy5wdXNoKFxuICAgICAgd2lyZUV2ZW50SGFuZGxlcnModGhpcy5fd2lyaW5nLCB0aGlzLCAoKSA9PiB0aGlzLl9jdHghKVxuICAgIClcblxuICAgIC8vIFBoYXNlIDVhOiBJbnRlcnNlY3Rpb25PYnNlcnZlciBmb3Igb24tZW50ZXIgLyBvbi1leGl0XG4gICAgdGhpcy5fY2xlYW51cHMucHVzaChcbiAgICAgIHdpcmVJbnRlcnNlY3Rpb25PYnNlcnZlcihcbiAgICAgICAgdGhpcyxcbiAgICAgICAgdGhpcy5fd2lyaW5nLmxpZmVjeWNsZS5vbkVudGVyLFxuICAgICAgICB0aGlzLl93aXJpbmcubGlmZWN5Y2xlLm9uRXhpdCxcbiAgICAgICAgKCkgPT4gdGhpcy5fY3R4IVxuICAgICAgKVxuICAgIClcblxuICAgIC8vIFBoYXNlIDViOiBzaWduYWwgd2F0Y2hlcnNcbiAgICAvLyBJZiBEYXRhc3RhciBpcyBjb25uZWN0ZWQgdXNlIGl0cyByZWFjdGl2ZSBlZmZlY3QoKSBzeXN0ZW07XG4gICAgLy8gb3RoZXJ3aXNlIHRoZSBsb2NhbCBfc2V0U2lnbmFsIHBhdGggY2FsbHMgbm90aWZ5U2lnbmFsV2F0Y2hlcnMgZGlyZWN0bHkuXG4gICAgaWYgKHRoaXMuX2RzRWZmZWN0KSB7XG4gICAgICBmb3IgKGNvbnN0IHdhdGNoZXIgb2YgdGhpcy5fd2lyaW5nLndhdGNoZXJzKSB7XG4gICAgICAgIHdpcmVTaWduYWxXYXRjaGVyVmlhRGF0YXN0YXIod2F0Y2hlciwgdGhpcy5fZHNFZmZlY3QsICgpID0+IHRoaXMuX2N0eCEpXG4gICAgICB9XG4gICAgICBjb25zb2xlLmxvZyhgW0xFU10gd2lyZWQgJHt0aGlzLl93aXJpbmcud2F0Y2hlcnMubGVuZ3RofSBzaWduYWwgd2F0Y2hlcnMgdmlhIERhdGFzdGFyYClcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coYFtMRVNdIHdpcmVkICR7dGhpcy5fd2lyaW5nLndhdGNoZXJzLmxlbmd0aH0gc2lnbmFsIHdhdGNoZXJzIChsb2NhbCBmYWxsYmFjaylgKVxuICAgIH1cblxuICAgIC8vIFBoYXNlIDY6IERhdGFzdGFyIGJyaWRnZSBmdWxsIGFjdGl2YXRpb24gXHUyMDE0IGNvbWluZyBuZXh0XG5cbiAgICAvLyBvbi1sb2FkIGZpcmVzIGxhc3QsIGFmdGVyIGV2ZXJ5dGhpbmcgaXMgd2lyZWRcbiAgICBhd2FpdCBmaXJlT25Mb2FkKHRoaXMuX3dpcmluZywgKCkgPT4gdGhpcy5fY3R4ISlcblxuICAgIGNvbnNvbGUubG9nKCdbTEVTXSByZWFkeTonLCB0aGlzLmlkIHx8ICcobm8gaWQpJylcbiAgfVxuXG4gIHByaXZhdGUgX3RlYXJkb3duKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBkaXNjb25uZWN0ZWQnLCB0aGlzLmlkIHx8ICcobm8gaWQpJylcbiAgICBmb3IgKGNvbnN0IGNsZWFudXAgb2YgdGhpcy5fY2xlYW51cHMpIGNsZWFudXAoKVxuICAgIHRoaXMuX2NsZWFudXBzID0gW11cbiAgICB0aGlzLl9jb25maWcgICA9IG51bGxcbiAgICB0aGlzLl93aXJpbmcgICA9IG51bGxcbiAgICB0aGlzLl9jdHggICAgICA9IG51bGxcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBTaWduYWwgc3RvcmUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBfZ2V0U2lnbmFsKG5hbWU6IHN0cmluZyk6IHVua25vd24ge1xuICAgIC8vIFBoYXNlIDY6IHByZWZlciBEYXRhc3RhciBzaWduYWwgdHJlZSB3aGVuIGJyaWRnZSBpcyBjb25uZWN0ZWRcbiAgICBpZiAodGhpcy5fZHNTaWduYWwpIHtcbiAgICAgIHRyeSB7IHJldHVybiB0aGlzLl9kc1NpZ25hbChuYW1lKS52YWx1ZSB9IGNhdGNoIHsgLyogZmFsbCB0aHJvdWdoICovIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3NpZ25hbHMuZ2V0KG5hbWUpXG4gIH1cblxuICBwcml2YXRlIF9zZXRTaWduYWwobmFtZTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIGNvbnN0IHByZXYgPSB0aGlzLl9zaWduYWxzLmdldChuYW1lKVxuICAgIHRoaXMuX3NpZ25hbHMuc2V0KG5hbWUsIHZhbHVlKVxuICAgIGNvbnNvbGUubG9nKGBbTEVTXSAkJHtuYW1lfSA9YCwgdmFsdWUpXG5cbiAgICAvLyBQaGFzZSA2OiB3cml0ZSB0aHJvdWdoIHRvIERhdGFzdGFyJ3MgcmVhY3RpdmUgZ3JhcGhcbiAgICBpZiAodGhpcy5fZHNTaWduYWwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHNpZyA9IHRoaXMuX2RzU2lnbmFsPHVua25vd24+KG5hbWUsIHZhbHVlKVxuICAgICAgICBzaWcudmFsdWUgPSB2YWx1ZVxuICAgICAgfSBjYXRjaCB7IC8qIHNpZ25hbCBtYXkgbm90IGV4aXN0IGluIERhdGFzdGFyIHlldCAqLyB9XG4gICAgfVxuXG4gICAgLy8gUGhhc2UgNWI6IG5vdGlmeSBsb2NhbCBzaWduYWwgd2F0Y2hlcnMgKGZhbGxiYWNrIHBhdGggd2hlbiBEYXRhc3RhciBhYnNlbnQpXG4gICAgaWYgKHByZXYgIT09IHZhbHVlICYmIHRoaXMuX3dpcmluZyAmJiB0aGlzLl9jdHggJiYgIXRoaXMuX2RzRWZmZWN0KSB7XG4gICAgICBub3RpZnlTaWduYWxXYXRjaGVycyhuYW1lLCB0aGlzLl93aXJpbmcud2F0Y2hlcnMsICgpID0+IHRoaXMuX2N0eCEpXG4gICAgfVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIE1vZHVsZSBsb2FkaW5nIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgYXN5bmMgX2xvYWRNb2R1bGVzKGNvbmZpZzogTEVTQ29uZmlnKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKGNvbmZpZy5tb2R1bGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICBjb25maWcubW9kdWxlcy5tYXAoZGVjbCA9PlxuICAgICAgICBsb2FkTW9kdWxlKHRoaXMubW9kdWxlcywge1xuICAgICAgICAgIC4uLihkZWNsLnR5cGUgPyB7IHR5cGU6IGRlY2wudHlwZSB9IDoge30pLFxuICAgICAgICAgIC4uLihkZWNsLnNyYyAgPyB7IHNyYzogIGRlY2wuc3JjICB9IDoge30pLFxuICAgICAgICB9KS5jYXRjaChlcnIgPT4gY29uc29sZS53YXJuKCdbTEVTXSBNb2R1bGUgbG9hZCBmYWlsZWQ6JywgZXJyKSlcbiAgICAgIClcbiAgICApXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgUGFyc2UgYWxsIGJvZGllcyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwcml2YXRlIF9wYXJzZUFsbChjb25maWc6IExFU0NvbmZpZyk6IFBhcnNlZFdpcmluZyB7XG4gICAgbGV0IG9rID0gMCwgZmFpbCA9IDBcblxuICAgIGNvbnN0IHRyeVBhcnNlID0gKGJvZHk6IHN0cmluZywgbGFiZWw6IHN0cmluZyk6IExFU05vZGUgPT4ge1xuICAgICAgdHJ5IHsgb2srKzsgcmV0dXJuIHBhcnNlTEVTKGJvZHkpIH1cbiAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgIGZhaWwrK1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbTEVTXSBQYXJzZSBlcnJvciBpbiAke2xhYmVsfTpgLCBlKVxuICAgICAgICByZXR1cm4geyB0eXBlOiAnZXhwcicsIHJhdzogJycgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHdpcmluZzogUGFyc2VkV2lyaW5nID0ge1xuICAgICAgY29tbWFuZHM6IGNvbmZpZy5jb21tYW5kcy5tYXAoZCA9PiAoe1xuICAgICAgICBuYW1lOiBkLm5hbWUsIGd1YXJkOiBkLmd1YXJkLCBhcmdzUmF3OiBkLmFyZ3NSYXcsXG4gICAgICAgIGJvZHk6IHRyeVBhcnNlKGQuYm9keSwgYGNvbW1hbmQgXCIke2QubmFtZX1cImApLFxuICAgICAgfSkpLFxuICAgICAgaGFuZGxlcnM6IGNvbmZpZy5vbkV2ZW50Lm1hcChkID0+ICh7XG4gICAgICAgIGV2ZW50OiBkLm5hbWUsXG4gICAgICAgIGJvZHk6IHRyeVBhcnNlKGQuYm9keSwgYG9uLWV2ZW50IFwiJHtkLm5hbWV9XCJgKSxcbiAgICAgIH0pKSxcbiAgICAgIHdhdGNoZXJzOiBjb25maWcub25TaWduYWwubWFwKGQgPT4gKHtcbiAgICAgICAgc2lnbmFsOiBkLm5hbWUsIHdoZW46IGQud2hlbixcbiAgICAgICAgYm9keTogdHJ5UGFyc2UoZC5ib2R5LCBgb24tc2lnbmFsIFwiJHtkLm5hbWV9XCJgKSxcbiAgICAgIH0pKSxcbiAgICAgIGxpZmVjeWNsZToge1xuICAgICAgICBvbkxvYWQ6ICBjb25maWcub25Mb2FkLm1hcChkID0+IHRyeVBhcnNlKGQuYm9keSwgJ29uLWxvYWQnKSksXG4gICAgICAgIG9uRW50ZXI6IGNvbmZpZy5vbkVudGVyLm1hcChkID0+ICh7IHdoZW46IGQud2hlbiwgYm9keTogdHJ5UGFyc2UoZC5ib2R5LCAnb24tZW50ZXInKSB9KSksXG4gICAgICAgIG9uRXhpdDogIGNvbmZpZy5vbkV4aXQubWFwKGQgPT4gdHJ5UGFyc2UoZC5ib2R5LCAnb24tZXhpdCcpKSxcbiAgICAgIH0sXG4gICAgfVxuXG4gICAgY29uc3QgdG90YWwgPSBvayArIGZhaWxcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gcGFyc2VyOiAke29rfS8ke3RvdGFsfSBib2RpZXMgcGFyc2VkIHN1Y2Nlc3NmdWxseSR7ZmFpbCA+IDAgPyBgICgke2ZhaWx9IGVycm9ycylgIDogJyd9YClcbiAgICByZXR1cm4gd2lyaW5nXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgRGF0YXN0YXIgYnJpZGdlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIGNvbm5lY3REYXRhc3RhcihmbnM6IHtcbiAgICBlZmZlY3Q6IChmbjogKCkgPT4gdm9pZCkgPT4gdm9pZFxuICAgIHNpZ25hbDogPFQ+KG5hbWU6IHN0cmluZywgaW5pdD86IFQpID0+IHsgdmFsdWU6IFQgfVxuICB9KTogdm9pZCB7XG4gICAgdGhpcy5fZHNFZmZlY3QgPSBmbnMuZWZmZWN0XG4gICAgdGhpcy5fZHNTaWduYWwgPSBmbnMuc2lnbmFsXG4gICAgY29uc29sZS5sb2coJ1tMRVNdIERhdGFzdGFyIGJyaWRnZSBjb25uZWN0ZWQnLCB0aGlzLmlkKVxuICB9XG5cbiAgZGlzY29ubmVjdERhdGFzdGFyKCk6IHZvaWQge1xuICAgIHRoaXMuX2RzRWZmZWN0ID0gdW5kZWZpbmVkXG4gICAgdGhpcy5fZHNTaWduYWwgPSB1bmRlZmluZWRcbiAgfVxuXG4gIGdldCBkc0VmZmVjdCgpIHsgcmV0dXJuIHRoaXMuX2RzRWZmZWN0IH1cbiAgZ2V0IGRzU2lnbmFsKCkgIHsgcmV0dXJuIHRoaXMuX2RzU2lnbmFsIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgUHVibGljIEFQSSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKiogRmlyZSBhIG5hbWVkIGxvY2FsIGV2ZW50IGludG8gdGhpcyBMRVMgaW5zdGFuY2UgZnJvbSBvdXRzaWRlLiAqL1xuICBmaXJlKGV2ZW50OiBzdHJpbmcsIHBheWxvYWQ6IHVua25vd25bXSA9IFtdKTogdm9pZCB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudChldmVudCwge1xuICAgICAgZGV0YWlsOiB7IHBheWxvYWQgfSwgYnViYmxlczogZmFsc2UsIGNvbXBvc2VkOiBmYWxzZSxcbiAgICB9KSlcbiAgfVxuXG4gIC8qKiBDYWxsIGEgY29tbWFuZCBieSBuYW1lIGZyb20gb3V0c2lkZSAoZS5nLiBicm93c2VyIGNvbnNvbGUsIHRlc3RzKS4gKi9cbiAgYXN5bmMgY2FsbChjb21tYW5kOiBzdHJpbmcsIGFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge30pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuX2N0eCkgeyBjb25zb2xlLndhcm4oJ1tMRVNdIG5vdCBpbml0aWFsaXplZCB5ZXQnKTsgcmV0dXJuIH1cbiAgICBjb25zdCB7IHJ1bkNvbW1hbmQgfSA9IGF3YWl0IGltcG9ydCgnQHJ1bnRpbWUvZXhlY3V0b3IuanMnKVxuICAgIGF3YWl0IHJ1bkNvbW1hbmQoY29tbWFuZCwgYXJncywgdGhpcy5fY3R4KVxuICB9XG5cbiAgLyoqIFJlYWQgYSBzaWduYWwgdmFsdWUgZGlyZWN0bHkgKGZvciBkZWJ1Z2dpbmcpLiAqL1xuICBzaWduYWwobmFtZTogc3RyaW5nKTogdW5rbm93biB7XG4gICAgcmV0dXJuIHRoaXMuX2dldFNpZ25hbChuYW1lKVxuICB9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnbG9jYWwtZXZlbnQtc2NyaXB0JywgTG9jYWxFdmVudFNjcmlwdClcbiIsICIvKipcbiAqIDxsb2NhbC1jb21tYW5kPiBcdTIwMTQgZGVmaW5lcyBhIG5hbWVkLCBjYWxsYWJsZSBjb21tYW5kIHdpdGhpbiBhIDxsb2NhbC1ldmVudC1zY3JpcHQ+LlxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIG5hbWUgICAgUmVxdWlyZWQuIENvbW1hbmQgbmFtZSwgY29sb24tbmFtZXNwYWNlZDogXCJmZWVkOmZldGNoXCJcbiAqICAgYXJncyAgICBPcHRpb25hbC4gVHlwZWQgYXJndW1lbnQgbGlzdDogXCJbZnJvbTpzdHIgIHRvOnN0cl1cIlxuICogICBndWFyZCAgIE9wdGlvbmFsLiBKUyBleHByZXNzaW9uIFx1MjAxNCBmYWxzeSA9IHNpbGVudCBuby1vcCwgbm8gcmVzY3VlL2FmdGVyd2FyZHNcbiAqICAgZG8gICAgICBSZXF1aXJlZC4gTEVTIGJvZHkgKGJhY2t0aWNrLXF1b3RlZCBmb3IgbXVsdGktbGluZSlcbiAqXG4gKiBUaGlzIGVsZW1lbnQgaXMgcHVyZWx5IGRlY2xhcmF0aXZlIFx1MjAxNCBpdCBob2xkcyBkYXRhLlxuICogVGhlIGhvc3QgPGxvY2FsLWV2ZW50LXNjcmlwdD4gcmVhZHMgaXQgZHVyaW5nIFBoYXNlIDEgYW5kIHJlZ2lzdGVyc1xuICogdGhlIHBhcnNlZCBDb21tYW5kRGVmIGluIGl0cyBDb21tYW5kUmVnaXN0cnkuXG4gKlxuICogTm90ZTogPGNvbW1hbmQ+IHdhcyBhIGRlcHJlY2F0ZWQgSFRNTDUgZWxlbWVudCBcdTIwMTQgd2UgdXNlIDxsb2NhbC1jb21tYW5kPlxuICogdG8gc2F0aXNmeSB0aGUgY3VzdG9tIGVsZW1lbnQgaHlwaGVuIHJlcXVpcmVtZW50IGFuZCBhdm9pZCB0aGUgY29sbGlzaW9uLlxuICovXG5leHBvcnQgY2xhc3MgTG9jYWxDb21tYW5kIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgQXR0cmlidXRlIGFjY2Vzc29ycyAodHlwZWQsIHRyaW1tZWQpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIGdldCBjb21tYW5kTmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIC8qKiBSYXcgYXJncyBzdHJpbmcgZS5nLiBcIltmcm9tOnN0ciAgdG86c3RyXVwiIFx1MjAxNCBwYXJzZWQgYnkgUGhhc2UgMiAqL1xuICBnZXQgYXJnc1JhdygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnYXJncycpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIC8qKiBHdWFyZCBleHByZXNzaW9uIHN0cmluZyBcdTIwMTQgZXZhbHVhdGVkIGJ5IHJ1bnRpbWUgYmVmb3JlIGV4ZWN1dGlvbiAqL1xuICBnZXQgZ3VhcmRFeHByKCk6IHN0cmluZyB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnZ3VhcmQnKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIC8qKiBSYXcgTEVTIGJvZHkgXHUyMDE0IG1heSBiZSBiYWNrdGljay13cmFwcGVkIGZvciBtdWx0aS1saW5lICovXG4gIGdldCBkb0JvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ2RvJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgLy8gUGhhc2UgMDogdmVyaWZ5IGVsZW1lbnQgaXMgcmVjb2duaXplZC5cbiAgICBjb25zb2xlLmxvZygnW0xFU10gPGxvY2FsLWNvbW1hbmQ+IHJlZ2lzdGVyZWQ6JywgdGhpcy5jb21tYW5kTmFtZSB8fCAnKHVubmFtZWQpJylcbiAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ2xvY2FsLWNvbW1hbmQnLCBMb2NhbENvbW1hbmQpXG4iLCAiLyoqXG4gKiA8b24tZXZlbnQ+IFx1MjAxNCBzdWJzY3JpYmVzIHRvIGEgbmFtZWQgQ3VzdG9tRXZlbnQgZGlzcGF0Y2hlZCB3aXRoaW4gdGhlIExFUyBob3N0LlxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIG5hbWUgICAgUmVxdWlyZWQuIEV2ZW50IG5hbWU6IFwiZmVlZDppbml0XCIsIFwiaXRlbTpkaXNtaXNzZWRcIlxuICogICBoYW5kbGUgIFJlcXVpcmVkLiBMRVMgYm9keSBcdTIwMTQgc2luZ2xlLWxpbmUgKG5vIGJhY2t0aWNrcykgb3IgbXVsdGktbGluZSAoYmFja3RpY2tzKVxuICpcbiAqIFBoYXNlIDQgd2lyZXMgYSBDdXN0b21FdmVudCBsaXN0ZW5lciBvbiB0aGUgaG9zdCBlbGVtZW50LlxuICogRXZlbnRzIGZpcmVkIGJ5IGBlbWl0YCBuZXZlciBidWJibGU7IG9ubHkgaGFuZGxlcnMgd2l0aGluIHRoZSBzYW1lXG4gKiA8bG9jYWwtZXZlbnQtc2NyaXB0PiBzZWUgdGhlbS4gVXNlIGBicm9hZGNhc3RgIHRvIGNyb3NzIHRoZSBib3VuZGFyeS5cbiAqL1xuZXhwb3J0IGNsYXNzIE9uRXZlbnQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIGdldCBldmVudE5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICAvKiogUmF3IExFUyBoYW5kbGUgYm9keSAqL1xuICBnZXQgaGFuZGxlQm9keSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnaGFuZGxlJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxvbi1ldmVudD4gcmVnaXN0ZXJlZDonLCB0aGlzLmV2ZW50TmFtZSB8fCAnKHVubmFtZWQpJylcbiAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ29uLWV2ZW50JywgT25FdmVudClcbiIsICIvKipcbiAqIDxvbi1zaWduYWw+IFx1MjAxNCByZWFjdHMgd2hlbmV2ZXIgYSBuYW1lZCBEYXRhc3RhciBzaWduYWwgY2hhbmdlcyB2YWx1ZS5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBuYW1lICAgIFJlcXVpcmVkLiBTaWduYWwgcmVmZXJlbmNlOiBcIiRmZWVkU3RhdGVcIiwgXCIkZmVlZEl0ZW1zXCJcbiAqICAgd2hlbiAgICBPcHRpb25hbC4gR3VhcmQgZXhwcmVzc2lvbiBcdTIwMTQgb25seSBmaXJlcyBoYW5kbGUgd2hlbiB0cnV0aHlcbiAqICAgaGFuZGxlICBSZXF1aXJlZC4gTEVTIGJvZHlcbiAqXG4gKiBQaGFzZSA2IHdpcmVzIHRoaXMgdG8gRGF0YXN0YXIncyBlZmZlY3QoKSBzeXN0ZW0uXG4gKiBVbnRpbCBEYXRhc3RhciBpcyBjb25uZWN0ZWQsIGZhbGxzIGJhY2sgdG8gcG9sbGluZyAoUGhhc2UgNiBkZWNpZGVzKS5cbiAqXG4gKiBUaGUgYHdoZW5gIGd1YXJkIGlzIHJlLWV2YWx1YXRlZCBvbiBldmVyeSBzaWduYWwgY2hhbmdlLlxuICogR3VhcmQgZmFpbHVyZSBpcyBub3QgYW4gZXJyb3IgXHUyMDE0IHRoZSBoYW5kbGUgc2ltcGx5IGRvZXMgbm90IHJ1bi5cbiAqL1xuZXhwb3J0IGNsYXNzIE9uU2lnbmFsIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAvKiogU2lnbmFsIG5hbWUgaW5jbHVkaW5nICQgcHJlZml4OiBcIiRmZWVkU3RhdGVcIiAqL1xuICBnZXQgc2lnbmFsTmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIC8qKiBTaWduYWwgbmFtZSB3aXRob3V0ICQgcHJlZml4LCBmb3IgRGF0YXN0YXIgQVBJIGNhbGxzICovXG4gIGdldCBzaWduYWxLZXkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5zaWduYWxOYW1lLnJlcGxhY2UoL15cXCQvLCAnJylcbiAgfVxuXG4gIGdldCB3aGVuRXhwcigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3doZW4nKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIGdldCBoYW5kbGVCb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdoYW5kbGUnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPG9uLXNpZ25hbD4gcmVnaXN0ZXJlZDonLCB0aGlzLnNpZ25hbE5hbWUgfHwgJyh1bm5hbWVkKScpXG4gIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1zaWduYWwnLCBPblNpZ25hbClcbiIsICIvKipcbiAqIDxvbi1sb2FkPiBcdTIwMTQgZmlyZXMgaXRzIGBydW5gIGJvZHkgb25jZSB3aGVuIHRoZSBob3N0IGNvbm5lY3RzIHRvIHRoZSBET00uXG4gKlxuICogVGltaW5nOiBpZiBkb2N1bWVudC5yZWFkeVN0YXRlID09PSAnY29tcGxldGUnLCBmaXJlcyBpbW1lZGlhdGVseSBpblxuICogY29ubmVjdGVkQ2FsbGJhY2sgKHZpYSBxdWV1ZU1pY3JvdGFzaykuIE90aGVyd2lzZSB3YWl0cyBmb3IgRE9NQ29udGVudExvYWRlZC5cbiAqXG4gKiBSdWxlOiBsaWZlY3ljbGUgaG9va3MgYWx3YXlzIGZpcmUgZXZlbnRzIChgZW1pdGApLCBuZXZlciBjYWxsIGNvbW1hbmRzIGRpcmVjdGx5LlxuICogVGhpcyBrZWVwcyB0aGUgc3lzdGVtIHRyYWNlYWJsZSBcdTIwMTQgZXZlcnkgY29tbWFuZCBpbnZvY2F0aW9uIGhhcyBhbiBldmVudCBpbiBpdHMgaGlzdG9yeS5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBydW4gICBSZXF1aXJlZC4gU2luZ2xlLWxpbmUgTEVTIGJvZHkgKHVzdWFsbHkganVzdCBgZW1pdCBldmVudDpuYW1lYClcbiAqL1xuZXhwb3J0IGNsYXNzIE9uTG9hZCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgZ2V0IHJ1bkJvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8b24tbG9hZD4gcmVnaXN0ZXJlZCwgcnVuOicsIHRoaXMucnVuQm9keSlcbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiA8b24tZW50ZXI+IFx1MjAxNCBmaXJlcyB3aGVuIHRoZSBob3N0IDxsb2NhbC1ldmVudC1zY3JpcHQ+IGVudGVycyB0aGUgdmlld3BvcnQuXG4gKlxuICogVXNlcyBhIHNpbmdsZSBJbnRlcnNlY3Rpb25PYnNlcnZlciBzaGFyZWQgYWNyb3NzIGFsbCA8b24tZW50ZXI+Lzxvbi1leGl0PlxuICogY2hpbGRyZW4gb2YgdGhlIHNhbWUgaG9zdCAoUGhhc2UgNSBjcmVhdGVzIGl0IG9uIHRoZSBob3N0IGVsZW1lbnQpLlxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIHdoZW4gIE9wdGlvbmFsLiBHdWFyZCBleHByZXNzaW9uIFx1MjAxNCBvbmx5IGZpcmVzIHJ1biB3aGVuIHRydXRoeS5cbiAqICAgICAgICAgIFBhdHRlcm46IGB3aGVuPVwiJGZlZWRTdGF0ZSA9PSAncGF1c2VkJ1wiYFxuICogICBydW4gICBSZXF1aXJlZC4gU2luZ2xlLWxpbmUgTEVTIGJvZHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBPbkVudGVyIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBnZXQgd2hlbkV4cHIoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCd3aGVuJyk/LnRyaW0oKSA/PyBudWxsXG4gIH1cblxuICBnZXQgcnVuQm9keSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxvbi1lbnRlcj4gcmVnaXN0ZXJlZCwgd2hlbjonLCB0aGlzLndoZW5FeHByID8/ICdhbHdheXMnKVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIDxvbi1leGl0PiBcdTIwMTQgZmlyZXMgd2hlbiB0aGUgaG9zdCA8bG9jYWwtZXZlbnQtc2NyaXB0PiBleGl0cyB0aGUgdmlld3BvcnQuXG4gKlxuICogTm8gYHdoZW5gIGd1YXJkIFx1MjAxNCBleGl0IGFsd2F5cyBmaXJlcyB1bmNvbmRpdGlvbmFsbHkuXG4gKiAoSWYgeW91IG5lZWQgY29uZGl0aW9uYWwgZXhpdCBiZWhhdmlvciwgcHV0IHRoZSBjb25kaXRpb24gaW4gdGhlIGhhbmRsZXIuKVxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIHJ1biAgIFJlcXVpcmVkLiBTaW5nbGUtbGluZSBMRVMgYm9keS5cbiAqL1xuZXhwb3J0IGNsYXNzIE9uRXhpdCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgZ2V0IHJ1bkJvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8b24tZXhpdD4gcmVnaXN0ZXJlZCwgcnVuOicsIHRoaXMucnVuQm9keSlcbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgUmVnaXN0cmF0aW9uIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ29uLWxvYWQnLCAgT25Mb2FkKVxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1lbnRlcicsIE9uRW50ZXIpXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ29uLWV4aXQnLCAgT25FeGl0KVxuIiwgIi8qKlxuICogPHVzZS1tb2R1bGU+IFx1MjAxNCBkZWNsYXJlcyBhIHZvY2FidWxhcnkgZXh0ZW5zaW9uIGF2YWlsYWJsZSB0byA8bG9jYWwtY29tbWFuZD4gYm9kaWVzLlxuICpcbiAqIE11c3QgYXBwZWFyIGJlZm9yZSBhbnkgPGxvY2FsLWNvbW1hbmQ+IGluIHRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0Pi5cbiAqIFRoZSBob3N0IHJlYWRzIDx1c2UtbW9kdWxlPiBjaGlsZHJlbiBmaXJzdCAoUGhhc2UgOCkgYW5kIHJlZ2lzdGVyc1xuICogdGhlaXIgcHJpbWl0aXZlcyBpbnRvIGl0cyBNb2R1bGVSZWdpc3RyeSBiZWZvcmUgcGFyc2luZyBjb21tYW5kIGJvZGllcy5cbiAqXG4gKiBBdHRyaWJ1dGVzIChpbmRlcGVuZGVudCwgY29tYmluYWJsZSk6XG4gKiAgIHR5cGUgICBCdWlsdC1pbiBtb2R1bGUgbmFtZTogXCJhbmltYXRpb25cIlxuICogICBzcmMgICAgVVJML3BhdGggdG8gYSB1c2VybGFuZCBtb2R1bGUgRVMgbW9kdWxlOiAgXCIuL3Njcm9sbC1lZmZlY3RzLmpzXCJcbiAqICAgICAgICAgIFRoZSBtb2R1bGUgbXVzdCBleHBvcnQgYSBkZWZhdWx0IGNvbmZvcm1pbmcgdG8gTEVTTW9kdWxlOlxuICogICAgICAgICAgeyBuYW1lOiBzdHJpbmcsIHByaW1pdGl2ZXM6IFJlY29yZDxzdHJpbmcsIExFU1ByaW1pdGl2ZT4gfVxuICpcbiAqIEV4YW1wbGVzOlxuICogICA8dXNlLW1vZHVsZSB0eXBlPVwiYW5pbWF0aW9uXCI+PC91c2UtbW9kdWxlPlxuICogICA8dXNlLW1vZHVsZSBzcmM9XCIuL3Njcm9sbC1lZmZlY3RzLmpzXCI+PC91c2UtbW9kdWxlPlxuICogICA8dXNlLW1vZHVsZSBzcmM9XCIuL3NwcmluZy1waHlzaWNzLmpzXCI+PC91c2UtbW9kdWxlPlxuICpcbiAqIHR5cGU9IGFuZCBzcmM9IG1heSBhcHBlYXIgdG9nZXRoZXIgb24gb25lIGVsZW1lbnQgaWYgdGhlIHVzZXJsYW5kIG1vZHVsZVxuICogd2FudHMgdG8gZGVjbGFyZSBpdHMgdHlwZSBoaW50IGZvciB0b29saW5nIChub3QgY3VycmVudGx5IHJlcXVpcmVkKS5cbiAqL1xuZXhwb3J0IGNsYXNzIFVzZU1vZHVsZSBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgLyoqIEJ1aWx0LWluIG1vZHVsZSB0eXBlIGUuZy4gXCJhbmltYXRpb25cIiAqL1xuICBnZXQgbW9kdWxlVHlwZSgpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3R5cGUnKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIC8qKiBVc2VybGFuZCBtb2R1bGUgVVJMIGUuZy4gXCIuL3Njcm9sbC1lZmZlY3RzLmpzXCIgKi9cbiAgZ2V0IG1vZHVsZVNyYygpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3NyYycpPy50cmltKCkgPz8gbnVsbFxuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc3QgZGVzYyA9IHRoaXMubW9kdWxlVHlwZVxuICAgICAgPyBgdHlwZT1cIiR7dGhpcy5tb2R1bGVUeXBlfVwiYFxuICAgICAgOiB0aGlzLm1vZHVsZVNyY1xuICAgICAgICA/IGBzcmM9XCIke3RoaXMubW9kdWxlU3JjfVwiYFxuICAgICAgICA6ICcobm8gdHlwZSBvciBzcmMpJ1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8dXNlLW1vZHVsZT4gZGVjbGFyZWQ6JywgZGVzYylcbiAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3VzZS1tb2R1bGUnLCBVc2VNb2R1bGUpXG4iLCAiLyoqXG4gKiBQaGFzZSA2OiBEYXRhc3RhciBhdHRyaWJ1dGUgcGx1Z2luXG4gKlxuICogUmVnaXN0ZXJzIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGFzIGEgRGF0YXN0YXIgYXR0cmlidXRlIHBsdWdpbiBzbyB0aGF0OlxuICpcbiAqICAgMS4gRGF0YXN0YXIncyBlZmZlY3QoKSBhbmQgc2lnbmFsKCkgcHJpbWl0aXZlcyBhcmUgaGFuZGVkIHRvIHRoZSBob3N0XG4gKiAgICAgIGVsZW1lbnQsIGVuYWJsaW5nIHByb3BlciByZWFjdGl2ZSBzaWduYWwgd2F0Y2hpbmcgdmlhIHRoZSBkZXBlbmRlbmN5XG4gKiAgICAgIGdyYXBoIHJhdGhlciB0aGFuIG1hbnVhbCBub3RpZmljYXRpb24uXG4gKlxuICogICAyLiBTaWduYWwgd3JpdGVzIGZyb20gYHNldCAkeCB0byB5YCBpbiBMRVMgcHJvcGFnYXRlIGludG8gRGF0YXN0YXInc1xuICogICAgICByb290IG9iamVjdCBzbyBkYXRhLXRleHQsIGRhdGEtc2hvdywgZXRjLiB1cGRhdGUgcmVhY3RpdmVseS5cbiAqXG4gKiAgIDMuICQtcHJlZml4ZWQgc2lnbmFscyBpbiBMRVMgZXhwcmVzc2lvbnMgcmVzb2x2ZSBmcm9tIERhdGFzdGFyJ3Mgcm9vdCxcbiAqICAgICAgZ2l2aW5nIExFUyBmdWxsIHJlYWQgYWNjZXNzIHRvIGFsbCBEYXRhc3RhciBzdGF0ZS5cbiAqXG4gKiAgIDQuIFNpZ25hbCB3YXRjaGVycyBvbi1zaWduYWwgYXJlIHJlLXdpcmVkIHRocm91Z2ggRGF0YXN0YXIncyBlZmZlY3QoKVxuICogICAgICBzeXN0ZW0gZm9yIHByb3BlciBiYXRjaGluZyBhbmQgZGVkdXBsaWNhdGlvbi5cbiAqXG4gKiBMRVMgd29ya3Mgd2l0aG91dCBEYXRhc3RhciAoc3RhbmRhbG9uZSBtb2RlKS4gVGhlIGJyaWRnZSBpcyBwdXJlbHkgYWRkaXRpdmUuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBMb2NhbEV2ZW50U2NyaXB0IH0gZnJvbSAnQGVsZW1lbnRzL0xvY2FsRXZlbnRTY3JpcHQuanMnXG5pbXBvcnQgeyB3aXJlU2lnbmFsV2F0Y2hlclZpYURhdGFzdGFyIH0gZnJvbSAnQHJ1bnRpbWUvc2lnbmFscy5qcydcblxubGV0IGJyaWRnZVJlZ2lzdGVyZWQgPSBmYWxzZVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVnaXN0ZXJEYXRhc3RhckJyaWRnZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKGJyaWRnZVJlZ2lzdGVyZWQpIHJldHVyblxuXG4gIHRyeSB7XG4gICAgY29uc3QgZGF0YXN0YXIgPSBhd2FpdCBpbXBvcnQoJ2RhdGFzdGFyJylcbiAgICBjb25zdCB7IGF0dHJpYnV0ZSB9ID0gZGF0YXN0YXJcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBSZWdpc3RlciBhcyBhIERhdGFzdGFyIGF0dHJpYnV0ZSBwbHVnaW4gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgLy8gTWF0Y2hlcyBlbGVtZW50cyB3aXRoIGEgYGRhdGEtbG9jYWwtZXZlbnQtc2NyaXB0YCBhdHRyaWJ1dGUgT1IgKHZpYVxuICAgIC8vIG5hbWUgbWF0Y2hpbmcpIHRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBjdXN0b20gZWxlbWVudCBpdHNlbGYgd2hlblxuICAgIC8vIERhdGFzdGFyIHNjYW5zIHRoZSBET00uXG4gICAgLy9cbiAgICAvLyBUaGUgbmFtZSAnbG9jYWwtZXZlbnQtc2NyaXB0JyBjYXVzZXMgRGF0YXN0YXIgdG8gYXBwbHkgdGhpcyBwbHVnaW5cbiAgICAvLyB0byBhbnkgZWxlbWVudCB3aXRoIGRhdGEtbG9jYWwtZXZlbnQtc2NyaXB0PVwiLi4uXCIgaW4gdGhlIERPTS5cbiAgICAvLyBXZSBhbHNvIHBhdGNoIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGRpcmVjdGx5IGluIHRoZSBNdXRhdGlvbk9ic2VydmVyXG4gICAgLy8gcGF0aCB2aWEgdGhlIGhvc3QgZWxlbWVudCdzIGNvbm5lY3RlZENhbGxiYWNrLlxuICAgIGF0dHJpYnV0ZSh7XG4gICAgICBuYW1lOiAnbG9jYWwtZXZlbnQtc2NyaXB0JyxcbiAgICAgIHJlcXVpcmVtZW50OiB7XG4gICAgICAgIGtleTogJ2RlbmllZCcsXG4gICAgICAgIHZhbHVlOiAnZGVuaWVkJyxcbiAgICAgIH0sXG4gICAgICBhcHBseSh7IGVsLCBlZmZlY3QsIHNpZ25hbCB9KSB7XG4gICAgICAgIGNvbnN0IGhvc3QgPSBlbCBhcyBMb2NhbEV2ZW50U2NyaXB0XG5cbiAgICAgICAgLy8gUGhhc2UgNmE6IGhhbmQgRGF0YXN0YXIncyByZWFjdGl2ZSBwcmltaXRpdmVzIHRvIHRoZSBob3N0XG4gICAgICAgIGhvc3QuY29ubmVjdERhdGFzdGFyKHsgZWZmZWN0LCBzaWduYWwgfSlcblxuICAgICAgICAvLyBQaGFzZSA2YjogaWYgdGhlIGhvc3QgaXMgYWxyZWFkeSBpbml0aWFsaXplZCAod2lyaW5nIHJhbiBiZWZvcmVcbiAgICAgICAgLy8gRGF0YXN0YXIgYXR0cmlidXRlIHBsdWdpbiBmaXJlZCksIHJlLXdpcmUgc2lnbmFsIHdhdGNoZXJzIHRocm91Z2hcbiAgICAgICAgLy8gRGF0YXN0YXIncyBlZmZlY3QoKSBmb3IgcHJvcGVyIHJlYWN0aXZpdHlcbiAgICAgICAgY29uc3Qgd2lyaW5nID0gaG9zdC53aXJpbmdcbiAgICAgICAgaWYgKHdpcmluZyAmJiB3aXJpbmcud2F0Y2hlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGZvciAoY29uc3Qgd2F0Y2hlciBvZiB3aXJpbmcud2F0Y2hlcnMpIHtcbiAgICAgICAgICAgIHdpcmVTaWduYWxXYXRjaGVyVmlhRGF0YXN0YXIod2F0Y2hlciwgZWZmZWN0LCAoKSA9PiBob3N0LmNvbnRleHQhKVxuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zb2xlLmxvZyhgW0xFUzpkYXRhc3Rhcl0gcmUtd2lyZWQgJHt3aXJpbmcud2F0Y2hlcnMubGVuZ3RofSBzaWduYWwgd2F0Y2hlcnMgdmlhIERhdGFzdGFyIGVmZmVjdCgpYClcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCdbTEVTOmRhdGFzdGFyXSBhdHRyaWJ1dGUgcGx1Z2luIGFwcGxpZWQgdG8nLCBlbC5pZCB8fCBlbC50YWdOYW1lKVxuXG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgaG9zdC5kaXNjb25uZWN0RGF0YXN0YXIoKVxuICAgICAgICAgIGNvbnNvbGUubG9nKCdbTEVTOmRhdGFzdGFyXSBhdHRyaWJ1dGUgcGx1Z2luIGNsZWFuZWQgdXAnLCBlbC5pZCB8fCBlbC50YWdOYW1lKVxuICAgICAgICB9XG4gICAgICB9LFxuICAgIH0pXG5cbiAgICBicmlkZ2VSZWdpc3RlcmVkID0gdHJ1ZVxuICAgIGNvbnNvbGUubG9nKCdbTEVTOmRhdGFzdGFyXSBicmlkZ2UgcmVnaXN0ZXJlZCcpXG5cbiAgfSBjYXRjaCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIHJ1bm5pbmcgaW4gc3RhbmRhbG9uZSBtb2RlIChEYXRhc3RhciBub3QgYXZhaWxhYmxlKScpXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBTaWduYWwgaW50ZWdyYXRpb24gdXRpbGl0aWVzXG4vLyBVc2VkIGJ5IGV4ZWN1dG9yLnRzIHdoZW4gRGF0YXN0YXIgaXMgcHJlc2VudFxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogUmVhZHMgYSBzaWduYWwgdmFsdWUgZnJvbSBEYXRhc3RhcidzIHJvb3Qgb2JqZWN0LlxuICogRmFsbHMgYmFjayB0byB1bmRlZmluZWQgaWYgRGF0YXN0YXIgaXMgbm90IGF2YWlsYWJsZS5cbiAqXG4gKiBUaGlzIGlzIGNhbGxlZCBieSB0aGUgTEVTQ29udGV4dC5nZXRTaWduYWwgZnVuY3Rpb24gd2hlbiB0aGUgRGF0YXN0YXJcbiAqIGJyaWRnZSBpcyBjb25uZWN0ZWQsIGdpdmluZyBMRVMgZXhwcmVzc2lvbnMgYWNjZXNzIHRvIGFsbCBEYXRhc3RhciBzaWduYWxzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZERhdGFzdGFyU2lnbmFsKFxuICBuYW1lOiBzdHJpbmcsXG4gIGRzU2lnbmFsOiAoPFQ+KG5hbWU6IHN0cmluZywgaW5pdD86IFQpID0+IHsgdmFsdWU6IFQgfSkgfCB1bmRlZmluZWRcbik6IHVua25vd24ge1xuICBpZiAoIWRzU2lnbmFsKSByZXR1cm4gdW5kZWZpbmVkXG4gIHRyeSB7XG4gICAgcmV0dXJuIGRzU2lnbmFsKG5hbWUpLnZhbHVlXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxufVxuXG4vKipcbiAqIFdyaXRlcyBhIHZhbHVlIHRvIERhdGFzdGFyJ3Mgc2lnbmFsIHRyZWUuXG4gKiBUaGlzIHRyaWdnZXJzIERhdGFzdGFyJ3MgcmVhY3RpdmUgZ3JhcGggXHUyMDE0IGFueSBkYXRhLXRleHQsIGRhdGEtc2hvdyxcbiAqIGRhdGEtY2xhc3MgYXR0cmlidXRlcyBib3VuZCB0byB0aGlzIHNpZ25hbCB3aWxsIHVwZGF0ZSBhdXRvbWF0aWNhbGx5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVEYXRhc3RhclNpZ25hbChcbiAgbmFtZTogc3RyaW5nLFxuICB2YWx1ZTogdW5rbm93bixcbiAgZHNTaWduYWw6ICg8VD4obmFtZTogc3RyaW5nLCBpbml0PzogVCkgPT4geyB2YWx1ZTogVCB9KSB8IHVuZGVmaW5lZFxuKTogdm9pZCB7XG4gIGlmICghZHNTaWduYWwpIHJldHVyblxuICB0cnkge1xuICAgIGNvbnN0IHNpZyA9IGRzU2lnbmFsPHVua25vd24+KG5hbWUsIHZhbHVlKVxuICAgIHNpZy52YWx1ZSA9IHZhbHVlXG4gIH0gY2F0Y2gge1xuICAgIC8vIFNpZ25hbCBtYXkgbm90IGV4aXN0IHlldCBcdTIwMTQgaXQgd2lsbCBiZSBjcmVhdGVkIGJ5IGRhdGEtc2lnbmFscyBvbiB0aGUgaG9zdFxuICB9XG59XG4iLCAiLyoqXG4gKiBsb2NhbC1ldmVudC1zY3JpcHQgXHUyMDE0IG1haW4gZW50cnkgcG9pbnRcbiAqXG4gKiBJbXBvcnQgb3JkZXIgbWF0dGVycyBmb3IgY3VzdG9tIGVsZW1lbnQgcmVnaXN0cmF0aW9uOlxuICogICAxLiBIb3N0IGVsZW1lbnQgZmlyc3QgKExvY2FsRXZlbnRTY3JpcHQpXG4gKiAgIDIuIENoaWxkIGVsZW1lbnRzIHRoYXQgcmVmZXJlbmNlIGl0XG4gKiAgIDMuIERhdGFzdGFyIGJyaWRnZSBsYXN0IChvcHRpb25hbCBcdTIwMTQgZmFpbHMgZ3JhY2VmdWxseSBpZiBEYXRhc3RhciBhYnNlbnQpXG4gKlxuICogVXNhZ2UgdmlhIGltcG9ydG1hcCArIHNjcmlwdCB0YWc6XG4gKlxuICogICA8c2NyaXB0IHR5cGU9XCJpbXBvcnRtYXBcIj5cbiAqICAgICB7XG4gKiAgICAgICBcImltcG9ydHNcIjoge1xuICogICAgICAgICBcImRhdGFzdGFyXCI6IFwiaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L2doL3N0YXJmZWRlcmF0aW9uL2RhdGFzdGFyQHYxLjAuMC1SQy44L2J1bmRsZXMvZGF0YXN0YXIuanNcIlxuICogICAgICAgfVxuICogICAgIH1cbiAqICAgPC9zY3JpcHQ+XG4gKiAgIDxzY3JpcHQgdHlwZT1cIm1vZHVsZVwiIHNyYz1cIi9kaXN0L2xvY2FsLWV2ZW50LXNjcmlwdC5qc1wiPjwvc2NyaXB0PlxuICpcbiAqIFdpdGhvdXQgdGhlIGltcG9ydG1hcCAob3Igd2l0aCBkYXRhc3RhciBhYnNlbnQpLCBMRVMgcnVucyBpbiBzdGFuZGFsb25lIG1vZGU6XG4gKiBhbGwgY3VzdG9tIGVsZW1lbnRzIHdvcmssIERhdGFzdGFyIHNpZ25hbCB3YXRjaGluZyBhbmQgQGFjdGlvbiBwYXNzdGhyb3VnaFxuICogYXJlIHVuYXZhaWxhYmxlLlxuICovXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBDdXN0b20gZWxlbWVudHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBFYWNoIGltcG9ydCByZWdpc3RlcnMgaXRzIGVsZW1lbnQocykgYXMgYSBzaWRlIGVmZmVjdC5cblxuZXhwb3J0IHsgTG9jYWxFdmVudFNjcmlwdCB9IGZyb20gJ0BlbGVtZW50cy9Mb2NhbEV2ZW50U2NyaXB0LmpzJ1xuZXhwb3J0IHsgTG9jYWxDb21tYW5kIH0gICAgIGZyb20gJ0BlbGVtZW50cy9Mb2NhbENvbW1hbmQuanMnXG5leHBvcnQgeyBPbkV2ZW50IH0gICAgICAgICAgZnJvbSAnQGVsZW1lbnRzL09uRXZlbnQuanMnXG5leHBvcnQgeyBPblNpZ25hbCB9ICAgICAgICAgZnJvbSAnQGVsZW1lbnRzL09uU2lnbmFsLmpzJ1xuZXhwb3J0IHsgT25Mb2FkLCBPbkVudGVyLCBPbkV4aXQgfSBmcm9tICdAZWxlbWVudHMvTGlmZWN5Y2xlLmpzJ1xuZXhwb3J0IHsgVXNlTW9kdWxlIH0gICAgICAgIGZyb20gJ0BlbGVtZW50cy9Vc2VNb2R1bGUuanMnXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBUeXBlIGV4cG9ydHMgKGZvciBUeXBlU2NyaXB0IGNvbnN1bWVycykgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5leHBvcnQgdHlwZSB7IExFU05vZGUgfSAgICAgICAgICAgICAgICAgICBmcm9tICdAcGFyc2VyL2FzdC5qcydcbmV4cG9ydCB0eXBlIHsgTEVTTW9kdWxlLCBMRVNQcmltaXRpdmUgfSAgIGZyb20gJ0Btb2R1bGVzL3R5cGVzLmpzJ1xuZXhwb3J0IHR5cGUgeyBDb21tYW5kRGVmLCBBcmdEZWYgfSAgICAgICAgZnJvbSAnQHJ1bnRpbWUvcmVnaXN0cnkuanMnXG5leHBvcnQgeyBMRVNTY29wZSB9ICAgICAgICAgICAgICAgICAgICAgICBmcm9tICdAcnVudGltZS9zY29wZS5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIERhdGFzdGFyIGJyaWRnZSAob3B0aW9uYWwpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gRHluYW1pYyBpbXBvcnQgc28gdGhlIGJ1bmRsZSB3b3JrcyB3aXRob3V0IERhdGFzdGFyIHByZXNlbnQuXG5pbXBvcnQgeyByZWdpc3RlckRhdGFzdGFyQnJpZGdlIH0gZnJvbSAnQGRhdGFzdGFyL3BsdWdpbi5qcydcbnJlZ2lzdGVyRGF0YXN0YXJCcmlkZ2UoKVxuZXhwb3J0IHR5cGUgeyBMRVNDb25maWcsIENvbW1hbmREZWNsLCBFdmVudEhhbmRsZXJEZWNsLCBTaWduYWxXYXRjaGVyRGVjbCxcbiAgICAgICAgICAgICAgT25Mb2FkRGVjbCwgT25FbnRlckRlY2wsIE9uRXhpdERlY2wsIE1vZHVsZURlY2wgfSBmcm9tICdAcGFyc2VyL2NvbmZpZy5qcydcbmV4cG9ydCB7IHJlYWRDb25maWcsIGxvZ0NvbmZpZyB9IGZyb20gJ0BwYXJzZXIvcmVhZGVyLmpzJ1xuZXhwb3J0IHsgc3RyaXBCb2R5IH0gICAgICAgICAgICAgZnJvbSAnQHBhcnNlci9zdHJpcEJvZHkuanMnXG5leHBvcnQgeyBwYXJzZUxFUywgTEVTUGFyc2VyLCBMRVNQYXJzZUVycm9yIH0gZnJvbSAnQHBhcnNlci9pbmRleC5qcydcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUF1QkEsU0FBUyxTQUFTLFVBQWtCLE1BQTBCO0FBQzVELE1BQUk7QUFJRixVQUFNLE9BQU8sS0FBSyxZQUFZO0FBQzlCLFVBQU0sUUFBUSxnQkFBZ0IsV0FBVyxPQUFPLEtBQUssaUJBQWlCO0FBQ3RFLFdBQU8sTUFBTSxLQUFLLE1BQU0saUJBQWlCLFFBQVEsQ0FBQztBQUFBLEVBQ3BELFFBQVE7QUFDTixZQUFRLEtBQUssc0NBQXNDLFFBQVEsR0FBRztBQUM5RCxXQUFPLENBQUM7QUFBQSxFQUNWO0FBQ0Y7QUFHQSxlQUFlLFdBQ2IsS0FDQSxXQUNBLFNBQ2U7QUFDZixNQUFJLElBQUksV0FBVyxFQUFHO0FBQ3RCLFFBQU0sUUFBUTtBQUFBLElBQ1osSUFBSSxJQUFJLFFBQU8sR0FBbUIsUUFBUSxXQUFXLE9BQU8sRUFBRSxRQUFRO0FBQUEsRUFDeEU7QUFDRjtBQVFBLFNBQVMsZUFBZSxLQUFnQixVQUErQjtBQUNyRSxRQUFNLFdBQVc7QUFDakIsUUFBTSxlQUEwQztBQUFBLElBQzlDLE1BQU8sZUFBZSxRQUFRO0FBQUEsSUFDOUIsT0FBTyxjQUFjLFFBQVE7QUFBQSxJQUM3QixJQUFPLGVBQWUsUUFBUTtBQUFBLElBQzlCLE1BQU8sY0FBYyxRQUFRO0FBQUEsRUFDL0I7QUFDQSxRQUFNLFlBQVksYUFBYSxHQUFHO0FBQ2xDLE1BQUksVUFBVTtBQUNaLFdBQU87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
