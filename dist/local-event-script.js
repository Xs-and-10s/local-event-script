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
function cancelAnimations(el) {
  for (const anim of el.getAnimations()) {
    anim.cancel();
  }
}
async function animateAll(els, keyframes, options) {
  if (els.length === 0) return;
  els.forEach(cancelAnimations);
  await Promise.all(
    els.map((el) => el.animate(keyframes, options).finished)
  );
}
function slideKeyframes(dir, entering) {
  const distance = "60px";
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
      els.forEach(cancelAnimations);
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
      let els = queryAll(selector, host).filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== "none" && style.visibility !== "hidden";
      });
      if (els.length === 0) return;
      const gap = parseMs(opts["gap"], 20);
      const reverse = String(opts["direction"] ?? "") === "reverse";
      const to = opts["to"] ?? "left";
      if (reverse) els = [...els].reverse();
      els.forEach(cancelAnimations);
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
  if (/^(cubic-bezier|steps|linear)\(/.test(node.raw)) return node.raw;
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
      const resolvedSrc = new URL(opts.src, document.baseURI).href;
      const mod = await import(
        /* @vite-ignore */
        resolvedSrc
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL21vZHVsZXMvYnVpbHRpbi9hbmltYXRpb24udHMiLCAiLi4vc3JjL3J1bnRpbWUvZXhlY3V0b3IudHMiLCAiLi4vc3JjL3J1bnRpbWUvcmVnaXN0cnkudHMiLCAiLi4vc3JjL21vZHVsZXMvdHlwZXMudHMiLCAiLi4vc3JjL3BhcnNlci9zdHJpcEJvZHkudHMiLCAiLi4vc3JjL3BhcnNlci9yZWFkZXIudHMiLCAiLi4vc3JjL3BhcnNlci90b2tlbml6ZXIudHMiLCAiLi4vc3JjL3BhcnNlci9wYXJzZXIudHMiLCAiLi4vc3JjL3BhcnNlci9pbmRleC50cyIsICIuLi9zcmMvcnVudGltZS93aXJpbmcudHMiLCAiLi4vc3JjL3J1bnRpbWUvc2NvcGUudHMiLCAiLi4vc3JjL3J1bnRpbWUvb2JzZXJ2ZXIudHMiLCAiLi4vc3JjL3J1bnRpbWUvc2lnbmFscy50cyIsICIuLi9zcmMvZWxlbWVudHMvTG9jYWxFdmVudFNjcmlwdC50cyIsICIuLi9zcmMvZWxlbWVudHMvTG9jYWxDb21tYW5kLnRzIiwgIi4uL3NyYy9lbGVtZW50cy9PbkV2ZW50LnRzIiwgIi4uL3NyYy9lbGVtZW50cy9PblNpZ25hbC50cyIsICIuLi9zcmMvZWxlbWVudHMvTGlmZWN5Y2xlLnRzIiwgIi4uL3NyYy9lbGVtZW50cy9Vc2VNb2R1bGUudHMiLCAiLi4vc3JjL2RhdGFzdGFyL3BsdWdpbi50cyIsICIuLi9zcmMvaW5kZXgudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogUGhhc2UgNzogQnVpbHQtaW4gYW5pbWF0aW9uIG1vZHVsZVxuICpcbiAqIEFsbCBwcmltaXRpdmVzIHVzZSB0aGUgV2ViIEFuaW1hdGlvbnMgQVBJIChlbGVtZW50LmFuaW1hdGUoKS5maW5pc2hlZClcbiAqIHNvIHRoZXkgaW50ZWdyYXRlIHdpdGggTEVTJ3MgYXN5bmMtdHJhbnNwYXJlbnQgYHRoZW5gIHNlcXVlbmNpbmc6XG4gKlxuICogICBmYWRlLWluICNzcGxhc2ggMjAwbXMgZWFzZS1vdXQgYW5kXG4gKiAgIHNsaWRlLXVwICNzcGxhc2ggMTgwbXMgZWFzZS1vdXRcbiAqICAgdGhlbiBmaXJlIHNwbGFzaDpyZWFkeSAgICAgICAgICBcdTIxOTAgb25seSBmaXJlcyBhZnRlciBCT1RIIGFuaW1hdGlvbnMgY29tcGxldGVcbiAqXG4gKiBgYW5kYCBcdTIxOTIgUHJvbWlzZS5hbGwgKGNvbmN1cnJlbnQpXG4gKiBgdGhlbmAgXHUyMTkyIHNlcXVlbnRpYWwgYXdhaXQgb24gLmZpbmlzaGVkXG4gKlxuICogVGhlIGV4ZWN1dG9yIGF3YWl0cyBlYWNoIExFU1ByaW1pdGl2ZSByZXR1cm4gdmFsdWUsIHNvIGFuaW1hdGlvblxuICogY29tcGxldGlvbiBpcyBuYXR1cmFsbHkgc2VyaWFsaXplZCB3aXRob3V0IGFueSBzZXRUaW1lb3V0IGhhY2tzLlxuICovXG5cbmltcG9ydCB0eXBlIHsgTEVTTW9kdWxlLCBMRVNQcmltaXRpdmUgfSBmcm9tICcuLi90eXBlcy5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBVdGlsaXR5OiBxdWVyeSBhbGwgbWF0Y2hpbmcgZWxlbWVudHMgd2l0aGluIHRoZSBob3N0IHNjb3BlXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gcXVlcnlBbGwoc2VsZWN0b3I6IHN0cmluZywgaG9zdDogRWxlbWVudCk6IEVsZW1lbnRbXSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgcm9vdCA9IGhvc3QuZ2V0Um9vdE5vZGUoKSBhcyBEb2N1bWVudCB8IFNoYWRvd1Jvb3RcbiAgICBjb25zdCBzY29wZSA9IHJvb3QgaW5zdGFuY2VvZiBEb2N1bWVudCA/IHJvb3QgOiByb290Lm93bmVyRG9jdW1lbnQgPz8gZG9jdW1lbnRcbiAgICByZXR1cm4gQXJyYXkuZnJvbShzY29wZS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSlcbiAgfSBjYXRjaCB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTOmFuaW1hdGlvbl0gSW52YWxpZCBzZWxlY3RvcjogXCIke3NlbGVjdG9yfVwiYClcbiAgICByZXR1cm4gW11cbiAgfVxufVxuXG4vKipcbiAqIENhbmNlbCBhbGwgcnVubmluZyBXZWIgQW5pbWF0aW9ucyBvbiBhbiBlbGVtZW50IGJlZm9yZSBzdGFydGluZyBhIG5ldyBvbmUuXG4gKiBUaGlzIHByZXZlbnRzIHRoZSBvbmUtZnJhbWUgZmxhc2ggdGhhdCBvY2N1cnMgd2hlbiBhIGZpbGw6Zm9yd2FyZHMgYW5pbWF0aW9uXG4gKiBpcyBpbnRlcnJ1cHRlZCBcdTIwMTQgd2l0aG91dCBjYW5jZWxsYXRpb24sIHRoZSBlbGVtZW50IGJyaWVmbHkgcmV2ZXJ0cyB0byBpdHNcbiAqIHVuLWFuaW1hdGVkIHN0YXRlIGFzIHRoZSBvbGQgQW5pbWF0aW9uIGlzIHJlcGxhY2VkLlxuICovXG5mdW5jdGlvbiBjYW5jZWxBbmltYXRpb25zKGVsOiBFbGVtZW50KTogdm9pZCB7XG4gIGZvciAoY29uc3QgYW5pbSBvZiAoZWwgYXMgSFRNTEVsZW1lbnQpLmdldEFuaW1hdGlvbnMoKSkge1xuICAgIGFuaW0uY2FuY2VsKClcbiAgfVxufVxuXG4vKiogQXdhaXRzIGFsbCBBbmltYXRpb24uZmluaXNoZWQgcHJvbWlzZXMuIFJldHVybnMgaW1tZWRpYXRlbHkgaWYgbm8gZWxlbWVudHMgbWF0Y2hlZC4gKi9cbmFzeW5jIGZ1bmN0aW9uIGFuaW1hdGVBbGwoXG4gIGVsczogRWxlbWVudFtdLFxuICBrZXlmcmFtZXM6IEtleWZyYW1lW10sXG4gIG9wdGlvbnM6IEtleWZyYW1lQW5pbWF0aW9uT3B0aW9uc1xuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChlbHMubGVuZ3RoID09PSAwKSByZXR1cm5cbiAgLy8gQ2FuY2VsIGFueSBpbi1wcm9ncmVzcyBvciBmaWxsOmZvcndhcmRzIGFuaW1hdGlvbnMgZmlyc3Qgc28gd2Ugc3RhcnQgY2xlYW4uXG4gIGVscy5mb3JFYWNoKGNhbmNlbEFuaW1hdGlvbnMpXG4gIGF3YWl0IFByb21pc2UuYWxsKFxuICAgIGVscy5tYXAoZWwgPT4gKGVsIGFzIEhUTUxFbGVtZW50KS5hbmltYXRlKGtleWZyYW1lcywgb3B0aW9ucykuZmluaXNoZWQpXG4gIClcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBEaXJlY3Rpb24gaGVscGVyc1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbnR5cGUgRGlyZWN0aW9uID0gJ2xlZnQnIHwgJ3JpZ2h0JyB8ICd1cCcgfCAnZG93bidcblxuZnVuY3Rpb24gc2xpZGVLZXlmcmFtZXMoZGlyOiBEaXJlY3Rpb24sIGVudGVyaW5nOiBib29sZWFuKTogS2V5ZnJhbWVbXSB7XG4gIGNvbnN0IGRpc3RhbmNlID0gJzYwcHgnXG4gIGNvbnN0IHRyYW5zbGF0aW9uczogUmVjb3JkPERpcmVjdGlvbiwgc3RyaW5nPiA9IHtcbiAgICBsZWZ0OiAgYHRyYW5zbGF0ZVgoLSR7ZGlzdGFuY2V9KWAsXG4gICAgcmlnaHQ6IGB0cmFuc2xhdGVYKCR7ZGlzdGFuY2V9KWAsXG4gICAgdXA6ICAgIGB0cmFuc2xhdGVZKC0ke2Rpc3RhbmNlfSlgLFxuICAgIGRvd246ICBgdHJhbnNsYXRlWSgke2Rpc3RhbmNlfSlgLFxuICB9XG4gIGNvbnN0IHRyYW5zbGF0ZSA9IHRyYW5zbGF0aW9uc1tkaXJdXG4gIGlmIChlbnRlcmluZykge1xuICAgIHJldHVybiBbXG4gICAgICB7IG9wYWNpdHk6IDAsIHRyYW5zZm9ybTogdHJhbnNsYXRlIH0sXG4gICAgICB7IG9wYWNpdHk6IDEsIHRyYW5zZm9ybTogJ25vbmUnIH0sXG4gICAgXVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBbXG4gICAgICB7IG9wYWNpdHk6IDEsIHRyYW5zZm9ybTogJ25vbmUnIH0sXG4gICAgICB7IG9wYWNpdHk6IDAsIHRyYW5zZm9ybTogdHJhbnNsYXRlIH0sXG4gICAgXVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gQ29yZSBwcmltaXRpdmVzXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgZmFkZUluOiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIF9vcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBhd2FpdCBhbmltYXRlQWxsKGVscyxcbiAgICBbeyBvcGFjaXR5OiAwIH0sIHsgb3BhY2l0eTogMSB9XSxcbiAgICB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdmb3J3YXJkcycgfVxuICApXG59XG5cbmNvbnN0IGZhZGVPdXQ6IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgX29wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLFxuICAgIFt7IG9wYWNpdHk6IDEgfSwgeyBvcGFjaXR5OiAwIH1dLFxuICAgIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9XG4gIClcbn1cblxuY29uc3Qgc2xpZGVJbjogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBvcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IGZyb20gPSAob3B0c1snZnJvbSddIGFzIERpcmVjdGlvbiB8IHVuZGVmaW5lZCkgPz8gJ3JpZ2h0J1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgYXdhaXQgYW5pbWF0ZUFsbChlbHMsIHNsaWRlS2V5ZnJhbWVzKGZyb20sIHRydWUpLCB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdmb3J3YXJkcycgfSlcbn1cblxuY29uc3Qgc2xpZGVPdXQ6IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCB0byA9IChvcHRzWyd0byddIGFzIERpcmVjdGlvbiB8IHVuZGVmaW5lZCkgPz8gJ2xlZnQnXG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBhd2FpdCBhbmltYXRlQWxsKGVscywgc2xpZGVLZXlmcmFtZXModG8sIGZhbHNlKSwgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnIH0pXG59XG5cbmNvbnN0IHNsaWRlVXA6IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgX29wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLCBzbGlkZUtleWZyYW1lcygndXAnLCB0cnVlKSwgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnIH0pXG59XG5cbmNvbnN0IHNsaWRlRG93bjogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBfb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgYXdhaXQgYW5pbWF0ZUFsbChlbHMsIHNsaWRlS2V5ZnJhbWVzKCdkb3duJywgZmFsc2UpLCB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdmb3J3YXJkcycgfSlcbn1cblxuLyoqXG4gKiBwdWxzZSBcdTIwMTQgYnJpZWYgc2NhbGUgKyBvcGFjaXR5IHB1bHNlIHRvIGRyYXcgYXR0ZW50aW9uIHRvIHVwZGF0ZWQgaXRlbXMuXG4gKiBVc2VkIGZvciBEMyBcInVwZGF0ZVwiIHBoYXNlOiBpdGVtcyB3aG9zZSBjb250ZW50IGNoYW5nZWQgZ2V0IGEgdmlzdWFsIHBpbmcuXG4gKi9cbmNvbnN0IHB1bHNlOiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIF9vcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBhd2FpdCBhbmltYXRlQWxsKGVscywgW1xuICAgIHsgb3BhY2l0eTogMSwgICAgdHJhbnNmb3JtOiAnc2NhbGUoMSknIH0sXG4gICAgeyBvcGFjaXR5OiAwLjc1LCB0cmFuc2Zvcm06ICdzY2FsZSgxLjAzKScsIG9mZnNldDogMC40IH0sXG4gICAgeyBvcGFjaXR5OiAxLCAgICB0cmFuc2Zvcm06ICdzY2FsZSgxKScgfSxcbiAgXSwgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnbm9uZScgfSlcbn1cblxuLyoqXG4gKiBzdGFnZ2VyLWVudGVyIFx1MjAxNCBydW5zIHNsaWRlSW4gb24gZWFjaCBtYXRjaGVkIGVsZW1lbnQgaW4gc2VxdWVuY2UsXG4gKiBvZmZzZXQgYnkgYGdhcGAgbWlsbGlzZWNvbmRzIGJldHdlZW4gZWFjaC5cbiAqXG4gKiBPcHRpb25zOlxuICogICBnYXA6IE5tcyAgIFx1MjAxNCBkZWxheSBiZXR3ZWVuIGVhY2ggZWxlbWVudCAoZGVmYXVsdDogNDBtcylcbiAqICAgZnJvbTogZGlyICBcdTIwMTQgJ2xlZnQnIHwgJ3JpZ2h0JyB8ICd1cCcgfCAnZG93bicgKGRlZmF1bHQ6ICdyaWdodCcpXG4gKlxuICogQWxsIGFuaW1hdGlvbnMgYXJlIHN0YXJ0ZWQgdG9nZXRoZXIgKFByb21pc2UuYWxsKSBidXQgZWFjaCBoYXMgYW5cbiAqIGluY3JlYXNpbmcgYGRlbGF5YCBcdTIwMTQgdGhpcyBnaXZlcyB0aGUgc3RhZ2dlciBlZmZlY3Qgd2hpbGUga2VlcGluZ1xuICogdGhlIHRvdGFsIFByb21pc2Utc2V0dGxlZCB0aW1lID0gZHVyYXRpb24gKyAobi0xKSAqIGdhcC5cbiAqL1xuY29uc3Qgc3RhZ2dlckVudGVyOiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIG9wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGlmIChlbHMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICBjb25zdCBnYXAgID0gcGFyc2VNcyhvcHRzWydnYXAnXSBhcyBzdHJpbmcgfCBudW1iZXIgfCB1bmRlZmluZWQsIDQwKVxuICBjb25zdCBmcm9tID0gKG9wdHNbJ2Zyb20nXSBhcyBEaXJlY3Rpb24gfCB1bmRlZmluZWQpID8/ICdyaWdodCdcblxuICBlbHMuZm9yRWFjaChjYW5jZWxBbmltYXRpb25zKVxuICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBlbHMubWFwKChlbCwgaSkgPT5cbiAgICAgIChlbCBhcyBIVE1MRWxlbWVudCkuYW5pbWF0ZShcbiAgICAgICAgc2xpZGVLZXlmcmFtZXMoZnJvbSwgdHJ1ZSksXG4gICAgICAgIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJywgZGVsYXk6IGkgKiBnYXAgfVxuICAgICAgKS5maW5pc2hlZFxuICAgIClcbiAgKVxufVxuXG4vKipcbiAqIHN0YWdnZXItZXhpdCBcdTIwMTQgcnVucyBzbGlkZU91dCBvbiBlYWNoIG1hdGNoZWQgZWxlbWVudCBpbiBzZXF1ZW5jZS5cbiAqXG4gKiBPcHRpb25zOlxuICogICBnYXA6IE5tcyAgICAgICAgICBcdTIwMTQgZGVsYXkgYmV0d2VlbiBlYWNoIGVsZW1lbnQgKGRlZmF1bHQ6IDIwbXMpXG4gKiAgIGRpcmVjdGlvbjogcmV2ZXJzZSBcdTIwMTQgcHJvY2VzcyBlbGVtZW50cyBpbiByZXZlcnNlIG9yZGVyXG4gKiAgIHRvOiBkaXIgICAgICAgICAgIFx1MjAxNCBleGl0IGRpcmVjdGlvbiAoZGVmYXVsdDogJ2xlZnQnKVxuICovXG5jb25zdCBzdGFnZ2VyRXhpdDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBvcHRzLCBob3N0KSA9PiB7XG4gIC8vIEZpbHRlciB0byBvbmx5IGVsZW1lbnRzIHRoYXQgYXJlIGFjdHVhbGx5IHZpc2libGUgXHUyMDE0IHNraXAgaGlkZGVuL2FscmVhZHktZXhpdGVkIG9uZXNcbiAgbGV0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KS5maWx0ZXIoZWwgPT4ge1xuICAgIGNvbnN0IHN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWwgYXMgSFRNTEVsZW1lbnQpXG4gICAgcmV0dXJuIHN0eWxlLmRpc3BsYXkgIT09ICdub25lJyAmJiBzdHlsZS52aXNpYmlsaXR5ICE9PSAnaGlkZGVuJ1xuICB9KVxuICBpZiAoZWxzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgY29uc3QgZ2FwICAgICA9IHBhcnNlTXMob3B0c1snZ2FwJ10gYXMgc3RyaW5nIHwgbnVtYmVyIHwgdW5kZWZpbmVkLCAyMClcbiAgY29uc3QgcmV2ZXJzZSA9IFN0cmluZyhvcHRzWydkaXJlY3Rpb24nXSA/PyAnJykgPT09ICdyZXZlcnNlJ1xuICBjb25zdCB0byAgICAgID0gKG9wdHNbJ3RvJ10gYXMgRGlyZWN0aW9uIHwgdW5kZWZpbmVkKSA/PyAnbGVmdCdcblxuICBpZiAocmV2ZXJzZSkgZWxzID0gWy4uLmVsc10ucmV2ZXJzZSgpXG5cbiAgZWxzLmZvckVhY2goY2FuY2VsQW5pbWF0aW9ucylcbiAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgZWxzLm1hcCgoZWwsIGkpID0+XG4gICAgICAoZWwgYXMgSFRNTEVsZW1lbnQpLmFuaW1hdGUoXG4gICAgICAgIHNsaWRlS2V5ZnJhbWVzKHRvLCBmYWxzZSksXG4gICAgICAgIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJywgZGVsYXk6IGkgKiBnYXAgfVxuICAgICAgKS5maW5pc2hlZFxuICAgIClcbiAgKVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFV0aWxpdHk6IHBhcnNlIGEgbWlsbGlzZWNvbmQgdmFsdWUgZnJvbSBhIHN0cmluZyBsaWtlIFwiNDBtc1wiIG9yIGEgbnVtYmVyXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gcGFyc2VNcyh2YWw6IHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgZmFsbGJhY2s6IG51bWJlcik6IG51bWJlciB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCB8fCB2YWwgPT09IG51bGwpIHJldHVybiBmYWxsYmFja1xuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHJldHVybiB2YWxcbiAgY29uc3QgbSA9IFN0cmluZyh2YWwpLm1hdGNoKC9eKFxcZCsoPzpcXC5cXGQrKT8pbXMkLylcbiAgaWYgKG0pIHJldHVybiBwYXJzZUZsb2F0KG1bMV0hKVxuICBjb25zdCBuID0gcGFyc2VGbG9hdChTdHJpbmcodmFsKSlcbiAgcmV0dXJuIE51bWJlci5pc05hTihuKSA/IGZhbGxiYWNrIDogblxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIE1vZHVsZSBleHBvcnRcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5jb25zdCBhbmltYXRpb25Nb2R1bGU6IExFU01vZHVsZSA9IHtcbiAgbmFtZTogJ2FuaW1hdGlvbicsXG4gIHByaW1pdGl2ZXM6IHtcbiAgICAnZmFkZS1pbic6ICAgICAgIGZhZGVJbixcbiAgICAnZmFkZS1vdXQnOiAgICAgIGZhZGVPdXQsXG4gICAgJ3NsaWRlLWluJzogICAgICBzbGlkZUluLFxuICAgICdzbGlkZS1vdXQnOiAgICAgc2xpZGVPdXQsXG4gICAgJ3NsaWRlLXVwJzogICAgICBzbGlkZVVwLFxuICAgICdzbGlkZS1kb3duJzogICAgc2xpZGVEb3duLFxuICAgICdwdWxzZSc6ICAgICAgICAgcHVsc2UsXG4gICAgJ3N0YWdnZXItZW50ZXInOiBzdGFnZ2VyRW50ZXIsXG4gICAgJ3N0YWdnZXItZXhpdCc6ICBzdGFnZ2VyRXhpdCxcbiAgfSxcbn1cblxuZXhwb3J0IGRlZmF1bHQgYW5pbWF0aW9uTW9kdWxlXG4iLCAiaW1wb3J0IHR5cGUge1xuICBMRVNOb2RlLCBFeHByTm9kZSwgU2VxdWVuY2VOb2RlLCBQYXJhbGxlbE5vZGUsXG4gIFNldE5vZGUsIEVtaXROb2RlLCBCcm9hZGNhc3ROb2RlLCBXYWl0Tm9kZSxcbiAgQ2FsbE5vZGUsIEJpbmROb2RlLCBNYXRjaE5vZGUsIFRyeU5vZGUsIEFuaW1hdGlvbk5vZGUsXG59IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuaW1wb3J0IHR5cGUgeyBQYXR0ZXJuTm9kZSB9IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuaW1wb3J0IHsgTEVTU2NvcGUgfSBmcm9tICcuL3Njb3BlLmpzJ1xuaW1wb3J0IHR5cGUgeyBDb21tYW5kUmVnaXN0cnkgfSBmcm9tICcuL3JlZ2lzdHJ5LmpzJ1xuaW1wb3J0IHR5cGUgeyBNb2R1bGVSZWdpc3RyeSB9IGZyb20gJ0Btb2R1bGVzL3R5cGVzLmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEV4ZWN1dGlvbiBjb250ZXh0IFx1MjAxNCBldmVyeXRoaW5nIHRoZSBleGVjdXRvciBuZWVkcywgcGFzc2VkIGRvd24gdGhlIGNhbGwgdHJlZVxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBpbnRlcmZhY2UgTEVTQ29udGV4dCB7XG4gIC8qKiBMb2NhbCB2YXJpYWJsZSBzY29wZSBmb3IgdGhlIGN1cnJlbnQgY2FsbCBmcmFtZSAqL1xuICBzY29wZTogTEVTU2NvcGVcbiAgLyoqIFRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBob3N0IGVsZW1lbnQgXHUyMDE0IHVzZWQgYXMgcXVlcnlTZWxlY3RvciByb290ICovXG4gIGhvc3Q6IEVsZW1lbnRcbiAgLyoqIENvbW1hbmQgZGVmaW5pdGlvbnMgcmVnaXN0ZXJlZCBieSA8bG9jYWwtY29tbWFuZD4gY2hpbGRyZW4gKi9cbiAgY29tbWFuZHM6IENvbW1hbmRSZWdpc3RyeVxuICAvKiogQW5pbWF0aW9uIGFuZCBvdGhlciBwcmltaXRpdmUgbW9kdWxlcyAqL1xuICBtb2R1bGVzOiBNb2R1bGVSZWdpc3RyeVxuICAvKiogUmVhZCBhIERhdGFzdGFyIHNpZ25hbCB2YWx1ZSBieSBuYW1lICh3aXRob3V0ICQgcHJlZml4KSAqL1xuICBnZXRTaWduYWw6IChuYW1lOiBzdHJpbmcpID0+IHVua25vd25cbiAgLyoqIFdyaXRlIGEgRGF0YXN0YXIgc2lnbmFsIHZhbHVlIGJ5IG5hbWUgKHdpdGhvdXQgJCBwcmVmaXgpICovXG4gIHNldFNpZ25hbDogKG5hbWU6IHN0cmluZywgdmFsdWU6IHVua25vd24pID0+IHZvaWRcbiAgLyoqIERpc3BhdGNoIGEgbG9jYWwgQ3VzdG9tRXZlbnQgb24gdGhlIGhvc3QgKGJ1YmJsZXM6IGZhbHNlKSAqL1xuICBlbWl0TG9jYWw6IChldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHZvaWRcbiAgLyoqIERpc3BhdGNoIGEgRE9NLXdpZGUgQ3VzdG9tRXZlbnQgKGJ1YmJsZXM6IHRydWUsIGNvbXBvc2VkOiB0cnVlKSAqL1xuICBicm9hZGNhc3Q6IChldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHZvaWRcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBNYWluIGV4ZWN1dG9yXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBFeGVjdXRlcyBhIExFU05vZGUgQVNUIGluIHRoZSBnaXZlbiBjb250ZXh0LlxuICpcbiAqIEFzeW5jIHRyYW5zcGFyZW5jeTogZXZlcnkgc3RlcCBpcyBhd2FpdGVkIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciBpdFxuICogaXMgc3luY2hyb25vdXMgb3IgcmV0dXJucyBhIFByb21pc2UuIFRoZSBhdXRob3IgbmV2ZXIgd3JpdGVzIGBhd2FpdGAuXG4gKiBUaGUgYHRoZW5gIGNvbm5lY3RpdmUgaW4gTEVTIHNvdXJjZSBtYXBzIHRvIHNlcXVlbnRpYWwgYGF3YWl0YCBoZXJlLlxuICogVGhlIGBhbmRgIGNvbm5lY3RpdmUgbWFwcyB0byBgUHJvbWlzZS5hbGxgLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZShub2RlOiBMRVNOb2RlLCBjdHg6IExFU0NvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgc3dpdGNoIChub2RlLnR5cGUpIHtcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBTZXF1ZW5jZTogQSB0aGVuIEIgdGhlbiBDIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3NlcXVlbmNlJzpcbiAgICAgIGZvciAoY29uc3Qgc3RlcCBvZiAobm9kZSBhcyBTZXF1ZW5jZU5vZGUpLnN0ZXBzKSB7XG4gICAgICAgIGF3YWl0IGV4ZWN1dGUoc3RlcCwgY3R4KVxuICAgICAgfVxuICAgICAgcmV0dXJuXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgUGFyYWxsZWw6IEEgYW5kIEIgYW5kIEMgKFByb21pc2UuYWxsKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdwYXJhbGxlbCc6XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbCgobm9kZSBhcyBQYXJhbGxlbE5vZGUpLmJyYW5jaGVzLm1hcChiID0+IGV4ZWN1dGUoYiwgY3R4KSkpXG4gICAgICByZXR1cm5cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBzZXQgJHNpZ25hbCB0byBleHByIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3NldCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIFNldE5vZGVcbiAgICAgIGNvbnN0IHZhbHVlID0gZXZhbEV4cHIobi52YWx1ZSwgY3R4KVxuICAgICAgY3R4LnNldFNpZ25hbChuLnNpZ25hbCwgdmFsdWUpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgZW1pdCBldmVudDpuYW1lIFtwYXlsb2FkXSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdlbWl0Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgRW1pdE5vZGVcbiAgICAgIGNvbnN0IHBheWxvYWQgPSBuLnBheWxvYWQubWFwKHAgPT4gZXZhbEV4cHIocCwgY3R4KSlcbiAgICAgIGN0eC5lbWl0TG9jYWwobi5ldmVudCwgcGF5bG9hZClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBicm9hZGNhc3QgZXZlbnQ6bmFtZSBbcGF5bG9hZF0gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnYnJvYWRjYXN0Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQnJvYWRjYXN0Tm9kZVxuICAgICAgY29uc3QgcGF5bG9hZCA9IG4ucGF5bG9hZC5tYXAocCA9PiBldmFsRXhwcihwLCBjdHgpKVxuICAgICAgY3R4LmJyb2FkY2FzdChuLmV2ZW50LCBwYXlsb2FkKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIHdhaXQgTm1zIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3dhaXQnOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBXYWl0Tm9kZVxuICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG4ubXMpKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIGNhbGwgY29tbWFuZDpuYW1lIFthcmdzXSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdjYWxsJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQ2FsbE5vZGVcbiAgICAgIGNvbnN0IGRlZiA9IGN0eC5jb21tYW5kcy5nZXQobi5jb21tYW5kKVxuICAgICAgaWYgKCFkZWYpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBbTEVTXSBVbmtub3duIGNvbW1hbmQ6IFwiJHtuLmNvbW1hbmR9XCJgKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgLy8gRXZhbHVhdGUgZ3VhcmQgXHUyMDE0IGZhbHN5ID0gc2lsZW50IG5vLW9wIChub3QgYW4gZXJyb3IsIG5vIHJlc2N1ZSlcbiAgICAgIGlmIChkZWYuZ3VhcmQpIHtcbiAgICAgICAgY29uc3QgcGFzc2VzID0gZXZhbEd1YXJkKGRlZi5ndWFyZCwgY3R4KVxuICAgICAgICBpZiAoIXBhc3Nlcykge1xuICAgICAgICAgIGNvbnNvbGUuZGVidWcoYFtMRVNdIGNvbW1hbmQgXCIke24uY29tbWFuZH1cIiBndWFyZCByZWplY3RlZGApXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gQnVpbGQgY2hpbGQgc2NvcGU6IGJpbmQgYXJncyBpbnRvIGl0XG4gICAgICBjb25zdCBjaGlsZFNjb3BlID0gY3R4LnNjb3BlLmNoaWxkKClcbiAgICAgIGNvbnN0IGV2YWxlZEFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge31cbiAgICAgIGZvciAoY29uc3QgW2tleSwgZXhwck5vZGVdIG9mIE9iamVjdC5lbnRyaWVzKG4uYXJncykpIHtcbiAgICAgICAgZXZhbGVkQXJnc1trZXldID0gZXZhbEV4cHIoZXhwck5vZGUsIGN0eClcbiAgICAgIH1cblxuICAgICAgLy8gQXBwbHkgYXJnIGRlZmF1bHRzIGZyb20gZGVmIChQaGFzZSAyIEFyZ0RlZiBwYXJzaW5nIFx1MjAxNCBzaW1wbGlmaWVkIGhlcmUpXG4gICAgICBmb3IgKGNvbnN0IGFyZ0RlZiBvZiBkZWYuYXJncykge1xuICAgICAgICBpZiAoIShhcmdEZWYubmFtZSBpbiBldmFsZWRBcmdzKSAmJiBhcmdEZWYuZGVmYXVsdCkge1xuICAgICAgICAgIGV2YWxlZEFyZ3NbYXJnRGVmLm5hbWVdID0gZXZhbEV4cHIoYXJnRGVmLmRlZmF1bHQsIGN0eClcbiAgICAgICAgfVxuICAgICAgICBjaGlsZFNjb3BlLnNldChhcmdEZWYubmFtZSwgZXZhbGVkQXJnc1thcmdEZWYubmFtZV0gPz8gbnVsbClcbiAgICAgIH1cblxuICAgICAgY29uc3QgY2hpbGRDdHg6IExFU0NvbnRleHQgPSB7IC4uLmN0eCwgc2NvcGU6IGNoaWxkU2NvcGUgfVxuICAgICAgYXdhaXQgZXhlY3V0ZShkZWYuYm9keSwgY2hpbGRDdHgpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgbmFtZSA8LSBAdmVyYiAndXJsJyBbYXJnc10gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnYmluZCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIEJpbmROb2RlXG4gICAgICBjb25zdCB7IHZlcmIsIHVybCwgYXJncyB9ID0gbi5hY3Rpb25cbiAgICAgIGNvbnN0IGV2YWxlZEFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge31cbiAgICAgIGZvciAoY29uc3QgW2tleSwgZXhwck5vZGVdIG9mIE9iamVjdC5lbnRyaWVzKGFyZ3MpKSB7XG4gICAgICAgIGV2YWxlZEFyZ3Nba2V5XSA9IGV2YWxFeHByKGV4cHJOb2RlLCBjdHgpXG4gICAgICB9XG5cbiAgICAgIGxldCByZXN1bHQ6IHVua25vd25cbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9IGF3YWl0IHBlcmZvcm1BY3Rpb24odmVyYiwgdXJsLCBldmFsZWRBcmdzLCBjdHgpXG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgLy8gUHJvcGFnYXRlIHNvIGVuY2xvc2luZyB0cnkvcmVzY3VlIGNhbiBjYXRjaCBpdFxuICAgICAgICB0aHJvdyBlcnJcbiAgICAgIH1cblxuICAgICAgY3R4LnNjb3BlLnNldChuLm5hbWUsIHJlc3VsdClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBtYXRjaCBzdWJqZWN0IC8gYXJtcyAvIC9tYXRjaCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdtYXRjaCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIE1hdGNoTm9kZVxuICAgICAgY29uc3Qgc3ViamVjdCA9IGV2YWxFeHByKG4uc3ViamVjdCwgY3R4KVxuXG4gICAgICBmb3IgKGNvbnN0IGFybSBvZiBuLmFybXMpIHtcbiAgICAgICAgY29uc3QgYmluZGluZ3MgPSBtYXRjaFBhdHRlcm5zKGFybS5wYXR0ZXJucywgc3ViamVjdClcbiAgICAgICAgaWYgKGJpbmRpbmdzICE9PSBudWxsKSB7XG4gICAgICAgICAgLy8gQ3JlYXRlIGNoaWxkIHNjb3BlIHdpdGggcGF0dGVybiBiaW5kaW5nc1xuICAgICAgICAgIGNvbnN0IGFybVNjb3BlID0gY3R4LnNjb3BlLmNoaWxkKClcbiAgICAgICAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhiaW5kaW5ncykpIHtcbiAgICAgICAgICAgIGFybVNjb3BlLnNldChrLCB2KVxuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBhcm1DdHg6IExFU0NvbnRleHQgPSB7IC4uLmN0eCwgc2NvcGU6IGFybVNjb3BlIH1cbiAgICAgICAgICBhd2FpdCBleGVjdXRlKGFybS5ib2R5LCBhcm1DdHgpXG4gICAgICAgICAgcmV0dXJuICAgLy8gRmlyc3QgbWF0Y2hpbmcgYXJtIHdpbnMgXHUyMDE0IG5vIGZhbGx0aHJvdWdoXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSBtYXRjaDogbm8gYXJtIG1hdGNoZWQgc3ViamVjdDonLCBzdWJqZWN0KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIHRyeSAvIHJlc2N1ZSAvIGFmdGVyd2FyZHMgLyAvdHJ5IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3RyeSc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIFRyeU5vZGVcbiAgICAgIGxldCB0aHJldyA9IGZhbHNlXG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGV4ZWN1dGUobi5ib2R5LCBjdHgpXG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgdGhyZXcgPSB0cnVlXG4gICAgICAgIGlmIChuLnJlc2N1ZSkge1xuICAgICAgICAgIC8vIEJpbmQgdGhlIGVycm9yIGFzIGAkZXJyb3JgIGluIHRoZSByZXNjdWUgc2NvcGVcbiAgICAgICAgICBjb25zdCByZXNjdWVTY29wZSA9IGN0eC5zY29wZS5jaGlsZCgpXG4gICAgICAgICAgcmVzY3VlU2NvcGUuc2V0KCdlcnJvcicsIGVycilcbiAgICAgICAgICBjb25zdCByZXNjdWVDdHg6IExFU0NvbnRleHQgPSB7IC4uLmN0eCwgc2NvcGU6IHJlc2N1ZVNjb3BlIH1cbiAgICAgICAgICBhd2FpdCBleGVjdXRlKG4ucmVzY3VlLCByZXNjdWVDdHgpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gTm8gcmVzY3VlIGNsYXVzZSBcdTIwMTQgcmUtdGhyb3cgc28gb3V0ZXIgdHJ5IGNhbiBjYXRjaCBpdFxuICAgICAgICAgIHRocm93IGVyclxuICAgICAgICB9XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBpZiAobi5hZnRlcndhcmRzKSB7XG4gICAgICAgICAgLy8gYWZ0ZXJ3YXJkcyBhbHdheXMgcnVucyBpZiBleGVjdXRpb24gZW50ZXJlZCB0aGUgdHJ5IGJvZHlcbiAgICAgICAgICAvLyAoZ3VhcmQgcmVqZWN0aW9uIG5ldmVyIHJlYWNoZXMgaGVyZSBcdTIwMTQgc2VlIGBjYWxsYCBoYW5kbGVyIGFib3ZlKVxuICAgICAgICAgIGF3YWl0IGV4ZWN1dGUobi5hZnRlcndhcmRzLCBjdHgpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRocmV3ICYmICFuLnJlc2N1ZSkge1xuICAgICAgICAvLyBBbHJlYWR5IHJlLXRocm93biBhYm92ZSBcdTIwMTQgdW5yZWFjaGFibGUsIGJ1dCBUeXBlU2NyaXB0IG5lZWRzIHRoaXNcbiAgICAgIH1cbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBhbmltYXRpb24gcHJpbWl0aXZlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ2FuaW1hdGlvbic6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIEFuaW1hdGlvbk5vZGVcbiAgICAgIGNvbnN0IHByaW1pdGl2ZSA9IGN0eC5tb2R1bGVzLmdldChuLnByaW1pdGl2ZSlcblxuICAgICAgaWYgKCFwcmltaXRpdmUpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGN0eC5tb2R1bGVzLmhpbnRGb3Iobi5wcmltaXRpdmUpKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgLy8gUmVzb2x2ZSBzZWxlY3RvciBcdTIwMTQgc3Vic3RpdHV0ZSBhbnkgbG9jYWwgdmFyaWFibGUgcmVmZXJlbmNlc1xuICAgICAgY29uc3Qgc2VsZWN0b3IgPSByZXNvbHZlU2VsZWN0b3Iobi5zZWxlY3RvciwgY3R4KVxuXG4gICAgICAvLyBFdmFsdWF0ZSBvcHRpb25zXG4gICAgICBjb25zdCBvcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIGV4cHJOb2RlXSBvZiBPYmplY3QuZW50cmllcyhuLm9wdGlvbnMpKSB7XG4gICAgICAgIG9wdGlvbnNba2V5XSA9IGV2YWxFeHByKGV4cHJOb2RlLCBjdHgpXG4gICAgICB9XG5cbiAgICAgIC8vIEF3YWl0IHRoZSBhbmltYXRpb24gXHUyMDE0IHRoaXMgaXMgdGhlIGNvcmUgb2YgYXN5bmMgdHJhbnNwYXJlbmN5OlxuICAgICAgLy8gV2ViIEFuaW1hdGlvbnMgQVBJIHJldHVybnMgYW4gQW5pbWF0aW9uIHdpdGggYSAuZmluaXNoZWQgUHJvbWlzZS5cbiAgICAgIC8vIGB0aGVuYCBpbiBMRVMgc291cmNlIGF3YWl0cyB0aGlzIG5hdHVyYWxseS5cbiAgICAgIGF3YWl0IHByaW1pdGl2ZShzZWxlY3Rvciwgbi5kdXJhdGlvbiwgbi5lYXNpbmcsIG9wdGlvbnMsIGN0eC5ob3N0KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIHJhdyBleHByZXNzaW9uIChlc2NhcGUgaGF0Y2ggLyB1bmtub3duIHN0YXRlbWVudHMpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ2V4cHInOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBFeHByTm9kZVxuICAgICAgaWYgKG4ucmF3LnRyaW0oKSkge1xuICAgICAgICAvLyBFdmFsdWF0ZSBhcyBhIEpTIGV4cHJlc3Npb24gZm9yIHNpZGUgZWZmZWN0c1xuICAgICAgICAvLyBUaGlzIGhhbmRsZXMgdW5rbm93biBwcmltaXRpdmVzIGFuZCBmdXR1cmUga2V5d29yZHMgZ3JhY2VmdWxseVxuICAgICAgICBldmFsRXhwcihuLCBjdHgpXG4gICAgICB9XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgYWN0aW9uIChiYXJlIEBnZXQgZXRjLiBub3QgaW5zaWRlIGEgYmluZCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnYWN0aW9uJzoge1xuICAgICAgLy8gQmFyZSBhY3Rpb25zIHdpdGhvdXQgYmluZCBqdXN0IGZpcmUgYW5kIGRpc2NhcmQgdGhlIHJlc3VsdFxuICAgICAgY29uc3QgbiA9IG5vZGVcbiAgICAgIGF3YWl0IHBlcmZvcm1BY3Rpb24obi52ZXJiLCBuLnVybCwge30sIGN0eClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGRlZmF1bHQ6IHtcbiAgICAgIGNvbnN0IGV4aGF1c3RpdmU6IG5ldmVyID0gbm9kZVxuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSBVbmtub3duIG5vZGUgdHlwZTonLCAoZXhoYXVzdGl2ZSBhcyBMRVNOb2RlKS50eXBlKVxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEV4cHJlc3Npb24gZXZhbHVhdGlvblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogRXZhbHVhdGVzIGEgcmF3IEpTIGV4cHJlc3Npb24gc3RyaW5nIGluIGEgc2FuZGJveGVkIGNvbnRleHQgdGhhdFxuICogZXhwb3NlcyBzY29wZSBsb2NhbHMgYW5kIERhdGFzdGFyIHNpZ25hbHMgdmlhIGEgUHJveHkuXG4gKlxuICogU2lnbmFsIGFjY2VzczogYCRmZWVkU3RhdGVgIFx1MjE5MiByZWFkcyB0aGUgYGZlZWRTdGF0ZWAgc2lnbmFsXG4gKiBMb2NhbCBhY2Nlc3M6ICBgZmlsdGVyYCAgICBcdTIxOTIgcmVhZHMgZnJvbSBzY29wZVxuICpcbiAqIFRoZSBzYW5kYm94IGlzIGludGVudGlvbmFsbHkgc2ltcGxlIGZvciBQaGFzZSAzLiBBIHByb3BlciBzYW5kYm94XG4gKiAoQ1NQLWNvbXBhdGlibGUsIG5vIGV2YWwgZmFsbGJhY2spIGlzIGEgZnV0dXJlIGhhcmRlbmluZyB0YXNrLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXZhbEV4cHIobm9kZTogRXhwck5vZGUsIGN0eDogTEVTQ29udGV4dCk6IHVua25vd24ge1xuICBpZiAoIW5vZGUucmF3LnRyaW0oKSkgcmV0dXJuIHVuZGVmaW5lZFxuXG4gIC8vIEZhc3QgcGF0aDogc2ltcGxlIHN0cmluZyBsaXRlcmFsXG4gIGlmIChub2RlLnJhdy5zdGFydHNXaXRoKFwiJ1wiKSAmJiBub2RlLnJhdy5lbmRzV2l0aChcIidcIikpIHtcbiAgICByZXR1cm4gbm9kZS5yYXcuc2xpY2UoMSwgLTEpXG4gIH1cbiAgLy8gRmFzdCBwYXRoOiBudW1iZXIgbGl0ZXJhbFxuICBjb25zdCBudW0gPSBOdW1iZXIobm9kZS5yYXcpXG4gIGlmICghTnVtYmVyLmlzTmFOKG51bSkgJiYgbm9kZS5yYXcudHJpbSgpICE9PSAnJykgcmV0dXJuIG51bVxuICAvLyBGYXN0IHBhdGg6IGJvb2xlYW5cbiAgaWYgKG5vZGUucmF3ID09PSAndHJ1ZScpICByZXR1cm4gdHJ1ZVxuICBpZiAobm9kZS5yYXcgPT09ICdmYWxzZScpIHJldHVybiBmYWxzZVxuICBpZiAobm9kZS5yYXcgPT09ICdudWxsJyB8fCBub2RlLnJhdyA9PT0gJ25pbCcpIHJldHVybiBudWxsXG5cbiAgLy8gXHUyNTAwXHUyNTAwIEZhc3QgcGF0aHMgZm9yIGNvbW1vbiBhbmltYXRpb24vb3B0aW9uIHZhbHVlIHBhdHRlcm5zIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAvLyBUaGVzZSBhcmUgbm90IHZhbGlkIEpTIGV4cHJlc3Npb25zIGJ1dCBhcHBlYXIgYXMgYW5pbWF0aW9uIG9wdGlvbiB2YWx1ZXMuXG4gIC8vIFJldHVybiB0aGVtIGFzIHN0cmluZ3Mgc28gdGhlIGFuaW1hdGlvbiBtb2R1bGUgY2FuIGludGVycHJldCB0aGVtIGRpcmVjdGx5LlxuICBpZiAoL15cXGQrKFxcLlxcZCspP21zJC8udGVzdChub2RlLnJhdykpIHJldHVybiBub2RlLnJhdyAgICAgICAgICAgICAgICAgICAvLyBcIjIwbXNcIiwgXCI0MG1zXCJcbiAgaWYgKC9eW2EtekEtWl1bYS16QS1aMC05Xy1dKiQvLnRlc3Qobm9kZS5yYXcpKSByZXR1cm4gbm9kZS5yYXcgICAgICAgICAgICAvLyBcInJldmVyc2VcIiwgXCJyaWdodFwiLCBcImVhc2Utb3V0XCJcbiAgaWYgKC9eKGN1YmljLWJlemllcnxzdGVwc3xsaW5lYXIpXFwoLy50ZXN0KG5vZGUucmF3KSkgcmV0dXJuIG5vZGUucmF3ICAgICAgLy8gXCJjdWJpYy1iZXppZXIoMC4yMiwxLDAuMzYsMSlcblxuICB0cnkge1xuICAgIC8vIEJ1aWxkIGEgZmxhdCBvYmplY3Qgb2YgYWxsIGFjY2Vzc2libGUgbmFtZXM6XG4gICAgLy8gLSBTY29wZSBsb2NhbHMgKGlubmVybW9zdCB3aW5zKVxuICAgIC8vIC0gRGF0YXN0YXIgc2lnbmFscyB2aWEgJC1wcmVmaXggc3RyaXBwaW5nXG4gICAgY29uc3Qgc2NvcGVTbmFwc2hvdCA9IGN0eC5zY29wZS5zbmFwc2hvdCgpXG5cbiAgICAvLyBFeHRyYWN0IHNpZ25hbCByZWZlcmVuY2VzIGZyb20gdGhlIGV4cHJlc3Npb24gKCRuYW1lIFx1MjE5MiBuYW1lKVxuICAgIGNvbnN0IHNpZ25hbE5hbWVzID0gWy4uLm5vZGUucmF3Lm1hdGNoQWxsKC9cXCQoW2EtekEtWl9dXFx3KikvZyldXG4gICAgICAubWFwKG0gPT4gbVsxXSEpXG5cbiAgICBjb25zdCBzaWduYWxzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHNpZ25hbE5hbWVzKSB7XG4gICAgICBzaWduYWxzW25hbWVdID0gY3R4LmdldFNpZ25hbChuYW1lKVxuICAgIH1cblxuICAgIC8vIFJld3JpdGUgJG5hbWUgXHUyMTkyIF9fc2lnX25hbWUgaW4gdGhlIGV4cHJlc3Npb24gc28gd2UgY2FuIHBhc3Mgc2lnbmFsc1xuICAgIC8vIGFzIHBsYWluIHZhcmlhYmxlcyAoYXZvaWRzICQgaW4gSlMgaWRlbnRpZmllcnMpXG4gICAgbGV0IHJld3JpdHRlbiA9IG5vZGUucmF3XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHNpZ25hbE5hbWVzKSB7XG4gICAgICByZXdyaXR0ZW4gPSByZXdyaXR0ZW4ucmVwbGFjZUFsbChgJCR7bmFtZX1gLCBgX19zaWdfJHtuYW1lfWApXG4gICAgfVxuXG4gICAgLy8gUHJlZml4IHNpZ25hbCB2YXJzIGluIHRoZSBiaW5kaW5nIG9iamVjdFxuICAgIGNvbnN0IHNpZ0JpbmRpbmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgZm9yIChjb25zdCBbaywgdl0gb2YgT2JqZWN0LmVudHJpZXMoc2lnbmFscykpIHtcbiAgICAgIHNpZ0JpbmRpbmdzW2BfX3NpZ18ke2t9YF0gPSB2XG4gICAgfVxuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLW5ldy1mdW5jXG4gICAgY29uc3QgZm4gPSBuZXcgRnVuY3Rpb24oXG4gICAgICAuLi5PYmplY3Qua2V5cyhzY29wZVNuYXBzaG90KSxcbiAgICAgIC4uLk9iamVjdC5rZXlzKHNpZ0JpbmRpbmdzKSxcbiAgICAgIGByZXR1cm4gKCR7cmV3cml0dGVufSlgXG4gICAgKVxuICAgIHJldHVybiBmbihcbiAgICAgIC4uLk9iamVjdC52YWx1ZXMoc2NvcGVTbmFwc2hvdCksXG4gICAgICAuLi5PYmplY3QudmFsdWVzKHNpZ0JpbmRpbmdzKVxuICAgIClcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTXSBFeHByZXNzaW9uIGV2YWwgZXJyb3I6ICR7SlNPTi5zdHJpbmdpZnkobm9kZS5yYXcpfWAsIGVycilcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cbn1cblxuLyoqXG4gKiBFdmFsdWF0ZXMgYSBndWFyZCBleHByZXNzaW9uIHN0cmluZyAoZnJvbSBjb21tYW5kIGBndWFyZGAgYXR0cmlidXRlKS5cbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ3VhcmQgcGFzc2VzIChjb21tYW5kIHNob3VsZCBydW4pLCBmYWxzZSB0byBzaWxlbnQtYWJvcnQuXG4gKi9cbmZ1bmN0aW9uIGV2YWxHdWFyZChndWFyZEV4cHI6IHN0cmluZywgY3R4OiBMRVNDb250ZXh0KTogYm9vbGVhbiB7XG4gIGNvbnN0IHJlc3VsdCA9IGV2YWxFeHByKHsgdHlwZTogJ2V4cHInLCByYXc6IGd1YXJkRXhwciB9LCBjdHgpXG4gIHJldHVybiBCb29sZWFuKHJlc3VsdClcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXR0ZXJuIG1hdGNoaW5nXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBBdHRlbXB0cyB0byBtYXRjaCBgc3ViamVjdGAgYWdhaW5zdCBgcGF0dGVybnNgLlxuICpcbiAqIFJldHVybnMgYSBiaW5kaW5ncyBtYXAgaWYgbWF0Y2hlZCAoZW1wdHkgbWFwIGZvciB3aWxkY2FyZC9saXRlcmFsIG1hdGNoZXMpLFxuICogb3IgbnVsbCBpZiB0aGUgbWF0Y2ggZmFpbHMuXG4gKlxuICogRm9yIHR1cGxlIHBhdHRlcm5zLCBgc3ViamVjdGAgaXMgbWF0Y2hlZCBlbGVtZW50LWJ5LWVsZW1lbnQuXG4gKiBGb3Igb3ItcGF0dGVybnMsIGFueSBhbHRlcm5hdGl2ZSBtYXRjaGluZyByZXR1cm5zIHRoZSBiaW5kaW5ncy5cbiAqL1xuZnVuY3Rpb24gbWF0Y2hQYXR0ZXJucyhcbiAgcGF0dGVybnM6IFBhdHRlcm5Ob2RlW10sXG4gIHN1YmplY3Q6IHVua25vd25cbik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbCB7XG4gIC8vIFNpbmdsZS1wYXR0ZXJuIChtb3N0IGNvbW1vbik6IG1hdGNoIGRpcmVjdGx5XG4gIGlmIChwYXR0ZXJucy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbWF0Y2hTaW5nbGUocGF0dGVybnNbMF0hLCBzdWJqZWN0KVxuICB9XG5cbiAgLy8gVHVwbGUgcGF0dGVybjogc3ViamVjdCBtdXN0IGJlIGFuIGFycmF5XG4gIGlmICghQXJyYXkuaXNBcnJheShzdWJqZWN0KSkge1xuICAgIC8vIFdyYXAgc2luZ2xlIHZhbHVlIGluIHR1cGxlIGZvciBlcmdvbm9taWNzXG4gICAgLy8gZS5nLiBgW2l0IG9rXWAgYWdhaW5zdCBhIHtvazogdHJ1ZSwgZGF0YTogLi4ufSByZXNwb25zZVxuICAgIHJldHVybiBtYXRjaFR1cGxlKHBhdHRlcm5zLCBzdWJqZWN0KVxuICB9XG5cbiAgcmV0dXJuIG1hdGNoVHVwbGUocGF0dGVybnMsIHN1YmplY3QpXG59XG5cbmZ1bmN0aW9uIG1hdGNoVHVwbGUoXG4gIHBhdHRlcm5zOiBQYXR0ZXJuTm9kZVtdLFxuICBzdWJqZWN0OiB1bmtub3duXG4pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IG51bGwge1xuICAvLyBGb3Igbm9uLWFycmF5IHN1YmplY3RzLCB0cnkgYmluZGluZyBlYWNoIHBhdHRlcm4gYWdhaW5zdCB0aGUgd2hvbGUgc3ViamVjdFxuICAvLyAoaGFuZGxlcyBgW2l0IG9rXWAgbWF0Y2hpbmcgYW4gb2JqZWN0IHdoZXJlIGBpdGAgPSBvYmplY3QsIGBva2AgPSBzdGF0dXMpXG4gIGNvbnN0IGJpbmRpbmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXR0ZXJucy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHBhdCA9IHBhdHRlcm5zW2ldIVxuXG4gICAgLy8gRm9yIHR1cGxlIHBhdHRlcm5zIGFnYWluc3Qgb2JqZWN0cywgd2UgZG8gYSBzdHJ1Y3R1cmFsIG1hdGNoOlxuICAgIC8vIGBbaXQgb2tdYCBhZ2FpbnN0IHtkYXRhOiAuLi4sIHN0YXR1czogJ29rJ30gYmluZHMgYGl0YCA9IGRhdGEsIGBva2AgPSAnb2snXG4gICAgLy8gVGhpcyBpcyBhIHNpbXBsaWZpY2F0aW9uIFx1MjAxNCBmdWxsIHN0cnVjdHVyYWwgbWF0Y2hpbmcgY29tZXMgaW4gYSBsYXRlciBwYXNzXG4gICAgY29uc3QgdmFsdWUgPSBBcnJheS5pc0FycmF5KHN1YmplY3QpXG4gICAgICA/IHN1YmplY3RbaV1cbiAgICAgIDogaSA9PT0gMCA/IHN1YmplY3QgOiB1bmRlZmluZWRcblxuICAgIGNvbnN0IHJlc3VsdCA9IG1hdGNoU2luZ2xlKHBhdCwgdmFsdWUpXG4gICAgaWYgKHJlc3VsdCA9PT0gbnVsbCkgcmV0dXJuIG51bGxcbiAgICBPYmplY3QuYXNzaWduKGJpbmRpbmdzLCByZXN1bHQpXG4gIH1cblxuICByZXR1cm4gYmluZGluZ3Ncbn1cblxuZnVuY3Rpb24gbWF0Y2hTaW5nbGUoXG4gIHBhdHRlcm46IFBhdHRlcm5Ob2RlLFxuICB2YWx1ZTogdW5rbm93blxuKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsIHtcbiAgc3dpdGNoIChwYXR0ZXJuLmtpbmQpIHtcbiAgICBjYXNlICd3aWxkY2FyZCc6XG4gICAgICByZXR1cm4ge30gICAvLyBBbHdheXMgbWF0Y2hlcywgYmluZHMgbm90aGluZ1xuXG4gICAgY2FzZSAnbGl0ZXJhbCc6XG4gICAgICByZXR1cm4gdmFsdWUgPT09IHBhdHRlcm4udmFsdWUgPyB7fSA6IG51bGxcblxuICAgIGNhc2UgJ2JpbmRpbmcnOlxuICAgICAgcmV0dXJuIHsgW3BhdHRlcm4ubmFtZV06IHZhbHVlIH0gICAvLyBBbHdheXMgbWF0Y2hlcywgYmluZHMgbmFtZSBcdTIxOTIgdmFsdWVcblxuICAgIGNhc2UgJ29yJzoge1xuICAgICAgZm9yIChjb25zdCBhbHQgb2YgcGF0dGVybi5wYXR0ZXJucykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBtYXRjaFNpbmdsZShhbHQsIHZhbHVlKVxuICAgICAgICBpZiAocmVzdWx0ICE9PSBudWxsKSByZXR1cm4gcmVzdWx0XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEhUVFAgYWN0aW9uXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBQZXJmb3JtcyBhbiBIVFRQIGFjdGlvbiAoQGdldCwgQHBvc3QsIGV0Yy4pLlxuICpcbiAqIFdoZW4gRGF0YXN0YXIgYWN0aW9ucyBhcmUgYXZhaWxhYmxlIGluIHRoZSBob3N0J3MgY29udGV4dCwgd2UgdHJpZ2dlclxuICogRGF0YXN0YXIncyBmZXRjaCBwaXBlbGluZSAod2hpY2ggaGFuZGxlcyBzaWduYWwgc2VyaWFsaXphdGlvbiwgU1NFXG4gKiByZXNwb25zZSBwcm9jZXNzaW5nLCBhbmQgaW5kaWNhdG9yIHNpZ25hbHMpLlxuICpcbiAqIEZhbGxzIGJhY2sgdG8gbmF0aXZlIGZldGNoIHdoZW4gRGF0YXN0YXIgaXMgbm90IHByZXNlbnQuXG4gKlxuICogTm90ZTogRGF0YXN0YXIncyBAZ2V0IC8gQHBvc3QgYXJlIGZpcmUtYW5kLWZvcmdldCAodGhleSBzdHJlYW0gU1NFIGJhY2tcbiAqIHRvIHBhdGNoIHNpZ25hbHMvZWxlbWVudHMpLiBGb3IgdGhlIGJpbmQgY2FzZSAoYHJlc3BvbnNlIDwtIEBnZXQgLi4uYClcbiAqIHdlIHVzZSBuYXRpdmUgZmV0Y2ggdG8gZ2V0IGEgUHJvbWlzZS1iYXNlZCBKU09OIHJlc3BvbnNlIHRoYXQgTEVTIGNhblxuICogYmluZCB0byBhIGxvY2FsIHZhcmlhYmxlLlxuICovXG5hc3luYyBmdW5jdGlvbiBwZXJmb3JtQWN0aW9uKFxuICB2ZXJiOiBzdHJpbmcsXG4gIHVybDogc3RyaW5nLFxuICBhcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgY3R4OiBMRVNDb250ZXh0XG4pOiBQcm9taXNlPHVua25vd24+IHtcbiAgY29uc3QgbWV0aG9kID0gdmVyYi50b1VwcGVyQ2FzZSgpXG5cbiAgbGV0IGZ1bGxVcmwgPSB1cmxcbiAgbGV0IGJvZHk6IHN0cmluZyB8IHVuZGVmaW5lZFxuXG4gIGlmIChtZXRob2QgPT09ICdHRVQnIHx8IG1ldGhvZCA9PT0gJ0RFTEVURScpIHtcbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKClcbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhhcmdzKSkge1xuICAgICAgcGFyYW1zLnNldChrLCBTdHJpbmcodikpXG4gICAgfVxuICAgIGNvbnN0IHFzID0gcGFyYW1zLnRvU3RyaW5nKClcbiAgICBpZiAocXMpIGZ1bGxVcmwgPSBgJHt1cmx9PyR7cXN9YFxuICB9IGVsc2Uge1xuICAgIGJvZHkgPSBKU09OLnN0cmluZ2lmeShhcmdzKVxuICB9XG5cbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChmdWxsVXJsLCB7XG4gICAgbWV0aG9kLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAnQWNjZXB0JzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgIH0sXG4gICAgLi4uKGJvZHkgPyB7IGJvZHkgfSA6IHt9KSxcbiAgfSlcblxuICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBbTEVTXSBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfSBmcm9tICR7bWV0aG9kfSAke3VybH1gKVxuICB9XG5cbiAgY29uc3QgY29udGVudFR5cGUgPSByZXNwb25zZS5oZWFkZXJzLmdldCgnY29udGVudC10eXBlJykgPz8gJydcbiAgaWYgKGNvbnRlbnRUeXBlLmluY2x1ZGVzKCdhcHBsaWNhdGlvbi9qc29uJykpIHtcbiAgICByZXR1cm4gYXdhaXQgcmVzcG9uc2UuanNvbigpXG4gIH1cbiAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLnRleHQoKVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFNlbGVjdG9yIHJlc29sdXRpb25cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFJlc29sdmVzIHZhcmlhYmxlIHJlZmVyZW5jZXMgaW4gYW4gYW5pbWF0aW9uIHNlbGVjdG9yLlxuICpcbiAqIEV4YW1wbGU6IGBbZGF0YS1pdGVtLWlkOiBpZF1gIHdoZXJlIGBpZGAgaXMgYSBsb2NhbCB2YXJpYWJsZVxuICogYmVjb21lcyBgW2RhdGEtaXRlbS1pZD1cIjEyM1wiXWAgYWZ0ZXIgc3Vic3RpdHV0aW9uLlxuICpcbiAqIFNpbXBsZSBhcHByb2FjaCBmb3IgUGhhc2UgMzogbG9vayBmb3IgYDogdmFybmFtZWAgcGF0dGVybnMgaW4gYXR0cmlidXRlXG4gKiBzZWxlY3RvcnMgYW5kIHN1YnN0aXR1dGUgZnJvbSBzY29wZS5cbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZVNlbGVjdG9yKHNlbGVjdG9yOiBzdHJpbmcsIGN0eDogTEVTQ29udGV4dCk6IHN0cmluZyB7XG4gIC8vIEhhbmRsZSBhdHRyaWJ1dGUgc2VsZWN0b3Igd2l0aCB2YXJpYWJsZTogW2RhdGEtaXRlbS1pZDogaWRdXG4gIHJldHVybiBzZWxlY3Rvci5yZXBsYWNlKC9cXFsoW15cXF1dKyk6XFxzKihcXHcrKVxcXS9nLCAoX21hdGNoLCBhdHRyLCB2YXJOYW1lKSA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSBjdHguc2NvcGUuZ2V0KHZhck5hbWUpID8/IGN0eC5nZXRTaWduYWwodmFyTmFtZSlcbiAgICByZXR1cm4gYFske2F0dHJ9PVwiJHtTdHJpbmcodmFsdWUpfVwiXWBcbiAgfSlcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBHdWFyZC1hd2FyZSBjb21tYW5kIGV4ZWN1dGlvbiAodXNlZCBieSBQaGFzZSA0IGV2ZW50IHdpcmluZylcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEV4ZWN1dGVzIGEgY29tbWFuZCBieSBuYW1lLCBjaGVja2luZyBpdHMgZ3VhcmQgZmlyc3QuXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGNvbW1hbmQgcmFuLCBmYWxzZSBpZiB0aGUgZ3VhcmQgcmVqZWN0ZWQgaXQuXG4gKlxuICogVGhpcyBpcyB0aGUgcHVibGljIEFQSSBmb3IgUGhhc2UgNCBldmVudCBoYW5kbGVycyB0aGF0IGNhbGwgY29tbWFuZHMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5Db21tYW5kKFxuICBuYW1lOiBzdHJpbmcsXG4gIGFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICBjdHg6IExFU0NvbnRleHRcbik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCBkZWYgPSBjdHguY29tbWFuZHMuZ2V0KG5hbWUpXG4gIGlmICghZGVmKSB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTXSBVbmtub3duIGNvbW1hbmQ6IFwiJHtuYW1lfVwiYClcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGlmIChkZWYuZ3VhcmQpIHtcbiAgICBpZiAoIWV2YWxHdWFyZChkZWYuZ3VhcmQsIGN0eCkpIHJldHVybiBmYWxzZVxuICB9XG5cbiAgY29uc3Qgc2NvcGUgPSBjdHguc2NvcGUuY2hpbGQoKVxuICBmb3IgKGNvbnN0IGFyZ0RlZiBvZiBkZWYuYXJncykge1xuICAgIHNjb3BlLnNldChhcmdEZWYubmFtZSwgYXJnc1thcmdEZWYubmFtZV0gPz8gbnVsbClcbiAgfVxuXG4gIGF3YWl0IGV4ZWN1dGUoZGVmLmJvZHksIHsgLi4uY3R4LCBzY29wZSB9KVxuICByZXR1cm4gdHJ1ZVxufVxuIiwgImltcG9ydCB0eXBlIHsgTEVTTm9kZSwgRXhwck5vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuLyoqIEEgc2luZ2xlIHR5cGVkIGFyZ3VtZW50IGRlZmluaXRpb24gZnJvbSBhcmdzPVwiW25hbWU6dHlwZSAgLi4uXVwiICovXG5leHBvcnQgaW50ZXJmYWNlIEFyZ0RlZiB7XG4gIG5hbWU6IHN0cmluZ1xuICAvKiogJ25pbCcgfCAnaW50JyB8ICdkZWMnIHwgJ3N0cicgfCAnYXJyJyB8ICdvYmonIHwgJ2Jvb2wnIHwgJ2R5bicgKi9cbiAgdHlwZTogc3RyaW5nXG4gIC8qKiBEZWZhdWx0IHZhbHVlIGV4cHJlc3Npb24sIGlmIHByb3ZpZGVkIChlLmcuIGF0dGVtcHQ6aW50PTApICovXG4gIGRlZmF1bHQ/OiBFeHByTm9kZVxufVxuXG4vKiogQSBmdWxseSBwYXJzZWQgPGxvY2FsLWNvbW1hbmQ+IGRlZmluaXRpb24uICovXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmREZWYge1xuICBuYW1lOiBzdHJpbmdcbiAgYXJnczogQXJnRGVmW11cbiAgLyoqIEd1YXJkIGV4cHJlc3Npb24gc3RyaW5nIFx1MjAxNCBldmFsdWF0ZWQgYmVmb3JlIGV4ZWN1dGlvbi4gRmFsc3kgPSBzaWxlbnQgbm8tb3AuICovXG4gIGd1YXJkPzogc3RyaW5nXG4gIC8qKiBUaGUgcGFyc2VkIGJvZHkgQVNUICovXG4gIGJvZHk6IExFU05vZGVcbiAgLyoqIFRoZSA8bG9jYWwtY29tbWFuZD4gRE9NIGVsZW1lbnQsIGtlcHQgZm9yIGVycm9yIHJlcG9ydGluZyAqL1xuICBlbGVtZW50OiBFbGVtZW50XG59XG5cbmV4cG9ydCBjbGFzcyBDb21tYW5kUmVnaXN0cnkge1xuICBwcml2YXRlIGNvbW1hbmRzID0gbmV3IE1hcDxzdHJpbmcsIENvbW1hbmREZWY+KClcblxuICByZWdpc3RlcihkZWY6IENvbW1hbmREZWYpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5jb21tYW5kcy5oYXMoZGVmLm5hbWUpKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgIGBbTEVTXSBEdXBsaWNhdGUgY29tbWFuZCBcIiR7ZGVmLm5hbWV9XCIgXHUyMDE0IHByZXZpb3VzIGRlZmluaXRpb24gb3ZlcndyaXR0ZW4uYCxcbiAgICAgICAgZGVmLmVsZW1lbnRcbiAgICAgIClcbiAgICB9XG4gICAgdGhpcy5jb21tYW5kcy5zZXQoZGVmLm5hbWUsIGRlZilcbiAgfVxuXG4gIGdldChuYW1lOiBzdHJpbmcpOiBDb21tYW5kRGVmIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kcy5nZXQobmFtZSlcbiAgfVxuXG4gIGhhcyhuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kcy5oYXMobmFtZSlcbiAgfVxuXG4gIG5hbWVzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmNvbW1hbmRzLmtleXMoKSlcbiAgfVxufVxuIiwgIi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gTEVTIE1vZHVsZSBzeXN0ZW1cbi8vXG4vLyBNb2R1bGVzIGV4dGVuZCB0aGUgc2V0IG9mIGFuaW1hdGlvbi9lZmZlY3QgcHJpbWl0aXZlcyBhdmFpbGFibGUgaW5cbi8vIDxsb2NhbC1jb21tYW5kPiBib2RpZXMuIFR3byBraW5kczpcbi8vXG4vLyAgIEJ1aWx0LWluOiAgPHVzZS1tb2R1bGUgdHlwZT1cImFuaW1hdGlvblwiPlxuLy8gICBVc2VybGFuZDogIDx1c2UtbW9kdWxlIHNyYz1cIi4vc2Nyb2xsLWVmZmVjdHMuanNcIj5cbi8vXG4vLyBCb3RoIHJlc29sdmUgdG8gYSBMRVNNb2R1bGUgYXQgcnVudGltZS5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEEgcHJpbWl0aXZlIGlzIGFuIGFzeW5jIG9wZXJhdGlvbiB0aGUgZXhlY3V0b3IgZGlzcGF0Y2hlcyBmb3IgQW5pbWF0aW9uTm9kZS5cbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3IgIENTUyBzZWxlY3RvciBzdHJpbmcgKGFscmVhZHkgcmVzb2x2ZWQgXHUyMDE0IG5vIHZhcmlhYmxlIHN1YnN0aXR1dGlvbiBuZWVkZWQgaGVyZSlcbiAqIEBwYXJhbSBkdXJhdGlvbiAgbWlsbGlzZWNvbmRzXG4gKiBAcGFyYW0gZWFzaW5nICAgIENTUyBlYXNpbmcgc3RyaW5nLCBlLmcuICdlYXNlLW91dCdcbiAqIEBwYXJhbSBvcHRpb25zICAga2V5L3ZhbHVlIG9wdGlvbnMgZnJvbSB0aGUgdHJhaWxpbmcgWy4uLl0gYmxvY2ssIGFscmVhZHkgZXZhbHVhdGVkXG4gKiBAcGFyYW0gaG9zdCAgICAgIHRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBlbGVtZW50ICh1c2VkIGFzIHF1ZXJ5U2VsZWN0b3Igcm9vdClcbiAqL1xuZXhwb3J0IHR5cGUgTEVTUHJpbWl0aXZlID0gKFxuICBzZWxlY3Rvcjogc3RyaW5nLFxuICBkdXJhdGlvbjogbnVtYmVyLFxuICBlYXNpbmc6IHN0cmluZyxcbiAgb3B0aW9uczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIGhvc3Q6IEVsZW1lbnRcbikgPT4gUHJvbWlzZTx2b2lkPlxuXG4vKiogVGhlIHNoYXBlIGEgdXNlcmxhbmQgbW9kdWxlIG11c3QgZXhwb3J0IGFzIGl0cyBkZWZhdWx0IGV4cG9ydC4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTEVTTW9kdWxlIHtcbiAgLyoqIEh1bWFuLXJlYWRhYmxlIG5hbWUgZm9yIGVycm9yIG1lc3NhZ2VzICovXG4gIG5hbWU6IHN0cmluZ1xuICBwcmltaXRpdmVzOiBSZWNvcmQ8c3RyaW5nLCBMRVNQcmltaXRpdmU+XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBSZWdpc3RyeSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZXhwb3J0IGNsYXNzIE1vZHVsZVJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBwcmltaXRpdmVzID0gbmV3IE1hcDxzdHJpbmcsIExFU1ByaW1pdGl2ZT4oKVxuICBwcml2YXRlIGxvYWRlZE1vZHVsZXM6IHN0cmluZ1tdID0gW11cblxuICByZWdpc3Rlcihtb2R1bGU6IExFU01vZHVsZSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgW25hbWUsIGZuXSBvZiBPYmplY3QuZW50cmllcyhtb2R1bGUucHJpbWl0aXZlcykpIHtcbiAgICAgIHRoaXMucHJpbWl0aXZlcy5zZXQobmFtZSwgZm4pXG4gICAgfVxuICAgIHRoaXMubG9hZGVkTW9kdWxlcy5wdXNoKG1vZHVsZS5uYW1lKVxuICAgIGNvbnNvbGUubG9nKGBbTEVTXSBtb2R1bGUgbG9hZGVkOiBcIiR7bW9kdWxlLm5hbWV9XCJgLCBPYmplY3Qua2V5cyhtb2R1bGUucHJpbWl0aXZlcykpXG4gIH1cblxuICBnZXQocHJpbWl0aXZlOiBzdHJpbmcpOiBMRVNQcmltaXRpdmUgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLnByaW1pdGl2ZXMuZ2V0KHByaW1pdGl2ZSlcbiAgfVxuXG4gIGhhcyhwcmltaXRpdmU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnByaW1pdGl2ZXMuaGFzKHByaW1pdGl2ZSlcbiAgfVxuXG4gIC8qKiBEZXYtbW9kZSBoZWxwOiB3aGljaCBtb2R1bGUgZXhwb3J0cyBhIGdpdmVuIHByaW1pdGl2ZT8gKi9cbiAgaGludEZvcihwcmltaXRpdmU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgLy8gV2lsbCBiZSBlbnJpY2hlZCBpbiBQaGFzZSA4IHdpdGggcGVyLW1vZHVsZSBwcmltaXRpdmUgbWFuaWZlc3RzLlxuICAgIHJldHVybiBgUHJpbWl0aXZlIFwiJHtwcmltaXRpdmV9XCIgbm90IGZvdW5kLiBMb2FkZWQgbW9kdWxlczogWyR7dGhpcy5sb2FkZWRNb2R1bGVzLmpvaW4oJywgJyl9XS4gRGlkIHlvdSBmb3JnZXQgPHVzZS1tb2R1bGUgdHlwZT1cImFuaW1hdGlvblwiPj9gXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIExvYWRlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqIEJ1aWx0LWluIG1vZHVsZSByZWdpc3RyeTogdHlwZSBuYW1lIFx1MjE5MiBpbXBvcnQgcGF0aCAqL1xuY29uc3QgQlVJTFRJTl9NT0RVTEVTOiBSZWNvcmQ8c3RyaW5nLCAoKSA9PiBQcm9taXNlPHsgZGVmYXVsdDogTEVTTW9kdWxlIH0+PiA9IHtcbiAgYW5pbWF0aW9uOiAoKSA9PiBpbXBvcnQoJy4vYnVpbHRpbi9hbmltYXRpb24uanMnKSxcbn1cblxuLyoqXG4gKiBSZXNvbHZlIGEgPHVzZS1tb2R1bGU+IGVsZW1lbnQgdG8gYSBMRVNNb2R1bGUgYW5kIHJlZ2lzdGVyIGl0LlxuICogQ2FsbGVkIGR1cmluZyBQaGFzZSAxIERPTSByZWFkaW5nIChQaGFzZSA4IGNvbXBsZXRlcyB0aGUgc3JjPSBwYXRoKS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRNb2R1bGUoXG4gIHJlZ2lzdHJ5OiBNb2R1bGVSZWdpc3RyeSxcbiAgb3B0czogeyB0eXBlPzogc3RyaW5nOyBzcmM/OiBzdHJpbmcgfVxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChvcHRzLnR5cGUpIHtcbiAgICBjb25zdCBsb2FkZXIgPSBCVUlMVElOX01PRFVMRVNbb3B0cy50eXBlXVxuICAgIGlmICghbG9hZGVyKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVNdIFVua25vd24gYnVpbHQtaW4gbW9kdWxlIHR5cGU6IFwiJHtvcHRzLnR5cGV9XCIuIEF2YWlsYWJsZTogJHtPYmplY3Qua2V5cyhCVUlMVElOX01PRFVMRVMpLmpvaW4oJywgJyl9YClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25zdCBtb2QgPSBhd2FpdCBsb2FkZXIoKVxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKG1vZC5kZWZhdWx0KVxuICAgIHJldHVyblxuICB9XG5cbiAgaWYgKG9wdHMuc3JjKSB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIFJlc29sdmUgcmVsYXRpdmUgcGF0aHMgYWdhaW5zdCB0aGUgcGFnZSBVUkwsIG5vdCB0aGUgYnVuZGxlIFVSTC5cbiAgICAgIC8vIFdpdGhvdXQgdGhpcywgJy4vc2Nyb2xsLWVmZmVjdHMuanMnIHJlc29sdmVzIHRvICcvZGlzdC9zY3JvbGwtZWZmZWN0cy5qcydcbiAgICAgIC8vIChyZWxhdGl2ZSB0byB0aGUgYnVuZGxlIGF0IC9kaXN0L2xvY2FsLWV2ZW50LXNjcmlwdC5qcykgaW5zdGVhZCBvZlxuICAgICAgLy8gJy9zY3JvbGwtZWZmZWN0cy5qcycgKHJlbGF0aXZlIHRvIHRoZSBIVE1MIHBhZ2UpLlxuICAgICAgY29uc3QgcmVzb2x2ZWRTcmMgPSBuZXcgVVJMKG9wdHMuc3JjLCBkb2N1bWVudC5iYXNlVVJJKS5ocmVmXG4gICAgICBjb25zdCBtb2QgPSBhd2FpdCBpbXBvcnQoLyogQHZpdGUtaWdub3JlICovIHJlc29sdmVkU3JjKVxuICAgICAgaWYgKCFtb2QuZGVmYXVsdCB8fCB0eXBlb2YgbW9kLmRlZmF1bHQucHJpbWl0aXZlcyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBbTEVTXSBNb2R1bGUgYXQgXCIke29wdHMuc3JjfVwiIGRvZXMgbm90IGV4cG9ydCBhIHZhbGlkIExFU01vZHVsZS4gRXhwZWN0ZWQ6IHsgbmFtZTogc3RyaW5nLCBwcmltaXRpdmVzOiBSZWNvcmQ8c3RyaW5nLCBGdW5jdGlvbj4gfWApXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgcmVnaXN0cnkucmVnaXN0ZXIobW9kLmRlZmF1bHQgYXMgTEVTTW9kdWxlKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihgW0xFU10gRmFpbGVkIHRvIGxvYWQgbW9kdWxlIGZyb20gXCIke29wdHMuc3JjfVwiOmAsIGVycilcbiAgICB9XG4gICAgcmV0dXJuXG4gIH1cblxuICBjb25zb2xlLndhcm4oJ1tMRVNdIDx1c2UtbW9kdWxlPiByZXF1aXJlcyBlaXRoZXIgdHlwZT0gb3Igc3JjPSBhdHRyaWJ1dGUuJylcbn1cbiIsICIvKipcbiAqIFN0cmlwcyB0aGUgYmFja3RpY2sgd3JhcHBlciBmcm9tIGEgbXVsdGktbGluZSBMRVMgYm9keSBzdHJpbmcgYW5kXG4gKiBub3JtYWxpemVzIGluZGVudGF0aW9uLCBwcm9kdWNpbmcgYSBjbGVhbiBzdHJpbmcgdGhlIHBhcnNlciBjYW4gd29yayB3aXRoLlxuICpcbiAqIENvbnZlbnRpb246XG4gKiAgIFNpbmdsZS1saW5lOiAgaGFuZGxlPVwiZW1pdCBmZWVkOmluaXRcIiAgICAgICAgICAgXHUyMTkyIFwiZW1pdCBmZWVkOmluaXRcIlxuICogICBNdWx0aS1saW5lOiAgIGRvPVwiYFxcbiAgICAgIHNldC4uLlxcbiAgICBgXCIgICAgICAgIFx1MjE5MiBcInNldC4uLlxcbi4uLlwiXG4gKlxuICogQWxnb3JpdGhtOlxuICogICAxLiBUcmltIG91dGVyIHdoaXRlc3BhY2UgZnJvbSB0aGUgcmF3IGF0dHJpYnV0ZSB2YWx1ZS5cbiAqICAgMi4gSWYgd3JhcHBlZCBpbiBiYWNrdGlja3MsIHN0cmlwIHRoZW0gXHUyMDE0IGRvIE5PVCBpbm5lci10cmltIHlldC5cbiAqICAgMy4gU3BsaXQgaW50byBsaW5lcyBhbmQgY29tcHV0ZSBtaW5pbXVtIG5vbi16ZXJvIGluZGVudGF0aW9uXG4gKiAgICAgIGFjcm9zcyBhbGwgbm9uLWVtcHR5IGxpbmVzLiBUaGlzIGlzIHRoZSBIVE1MIGF0dHJpYnV0ZSBpbmRlbnRhdGlvblxuICogICAgICBsZXZlbCB0byByZW1vdmUuXG4gKiAgIDQuIFN0cmlwIHRoYXQgbWFueSBsZWFkaW5nIGNoYXJhY3RlcnMgZnJvbSBldmVyeSBsaW5lLlxuICogICA1LiBEcm9wIGxlYWRpbmcvdHJhaWxpbmcgYmxhbmsgbGluZXMsIHJldHVybiBqb2luZWQgcmVzdWx0LlxuICpcbiAqIENydWNpYWxseSwgc3RlcCAyIGRvZXMgTk9UIGNhbGwgLnRyaW0oKSBvbiB0aGUgaW5uZXIgY29udGVudCBiZWZvcmVcbiAqIGNvbXB1dGluZyBpbmRlbnRhdGlvbi4gQW4gaW5uZXIgLnRyaW0oKSB3b3VsZCBkZXN0cm95IHRoZSBsZWFkaW5nXG4gKiB3aGl0ZXNwYWNlIG9uIGxpbmUgMSwgbWFraW5nIG1pbkluZGVudCA9IDAgYW5kIGxlYXZpbmcgYWxsIG90aGVyXG4gKiBsaW5lcyB1bi1kZS1pbmRlbnRlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwQm9keShyYXc6IHN0cmluZyk6IHN0cmluZyB7XG4gIGxldCBzID0gcmF3LnRyaW0oKVxuXG4gIC8vIFN0cmlwIGJhY2t0aWNrIHdyYXBwZXIgXHUyMDE0IGJ1dCBwcmVzZXJ2ZSBpbnRlcm5hbCB3aGl0ZXNwYWNlIGZvciBkZS1pbmRlbnRcbiAgaWYgKHMuc3RhcnRzV2l0aCgnYCcpICYmIHMuZW5kc1dpdGgoJ2AnKSkge1xuICAgIHMgPSBzLnNsaWNlKDEsIC0xKVxuICAgIC8vIERvIE5PVCAudHJpbSgpIGhlcmUgXHUyMDE0IHRoYXQga2lsbHMgdGhlIGxlYWRpbmcgaW5kZW50IG9uIGxpbmUgMVxuICB9XG5cbiAgY29uc3QgbGluZXMgPSBzLnNwbGl0KCdcXG4nKVxuICBjb25zdCBub25FbXB0eSA9IGxpbmVzLmZpbHRlcihsID0+IGwudHJpbSgpLmxlbmd0aCA+IDApXG4gIGlmIChub25FbXB0eS5sZW5ndGggPT09IDApIHJldHVybiAnJ1xuXG4gIC8vIEZvciBzaW5nbGUtbGluZSB2YWx1ZXMgKG5vIG5ld2xpbmVzIGFmdGVyIGJhY2t0aWNrIHN0cmlwKSwganVzdCB0cmltXG4gIGlmIChsaW5lcy5sZW5ndGggPT09IDEpIHJldHVybiBzLnRyaW0oKVxuXG4gIC8vIE1pbmltdW0gbGVhZGluZyB3aGl0ZXNwYWNlIGFjcm9zcyBub24tZW1wdHkgbGluZXNcbiAgY29uc3QgbWluSW5kZW50ID0gbm9uRW1wdHkucmVkdWNlKChtaW4sIGxpbmUpID0+IHtcbiAgICBjb25zdCBsZWFkaW5nID0gbGluZS5tYXRjaCgvXihcXHMqKS8pPy5bMV0/Lmxlbmd0aCA/PyAwXG4gICAgcmV0dXJuIE1hdGgubWluKG1pbiwgbGVhZGluZylcbiAgfSwgSW5maW5pdHkpXG5cbiAgY29uc3Qgc3RyaXBwZWQgPSBtaW5JbmRlbnQgPT09IDAgfHwgbWluSW5kZW50ID09PSBJbmZpbml0eVxuICAgID8gbGluZXNcbiAgICA6IGxpbmVzLm1hcChsaW5lID0+IGxpbmUubGVuZ3RoID49IG1pbkluZGVudCA/IGxpbmUuc2xpY2UobWluSW5kZW50KSA6IGxpbmUudHJpbVN0YXJ0KCkpXG5cbiAgLy8gRHJvcCBsZWFkaW5nIGFuZCB0cmFpbGluZyBibGFuayBsaW5lcyAodGhlIG5ld2xpbmVzIGFyb3VuZCBiYWNrdGljayBjb250ZW50KVxuICBsZXQgc3RhcnQgPSAwXG4gIGxldCBlbmQgPSBzdHJpcHBlZC5sZW5ndGggLSAxXG4gIHdoaWxlIChzdGFydCA8PSBlbmQgJiYgc3RyaXBwZWRbc3RhcnRdPy50cmltKCkgPT09ICcnKSBzdGFydCsrXG4gIHdoaWxlIChlbmQgPj0gc3RhcnQgJiYgc3RyaXBwZWRbZW5kXT8udHJpbSgpID09PSAnJykgZW5kLS1cblxuICByZXR1cm4gc3RyaXBwZWQuc2xpY2Uoc3RhcnQsIGVuZCArIDEpLmpvaW4oJ1xcbicpXG59XG4iLCAiaW1wb3J0IHR5cGUge1xuICBMRVNDb25maWcsXG4gIE1vZHVsZURlY2wsXG4gIENvbW1hbmREZWNsLFxuICBFdmVudEhhbmRsZXJEZWNsLFxuICBTaWduYWxXYXRjaGVyRGVjbCxcbiAgT25Mb2FkRGVjbCxcbiAgT25FbnRlckRlY2wsXG4gIE9uRXhpdERlY2wsXG59IGZyb20gJy4vY29uZmlnLmpzJ1xuaW1wb3J0IHsgc3RyaXBCb2R5IH0gZnJvbSAnLi9zdHJpcEJvZHkuanMnXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gVGFnIG5hbWUgXHUyMTkyIGhhbmRsZXIgbWFwXG4vLyBFYWNoIGhhbmRsZXIgcmVhZHMgYXR0cmlidXRlcyBmcm9tIGEgY2hpbGQgZWxlbWVudCBhbmQgcHVzaGVzIGEgdHlwZWQgZGVjbFxuLy8gaW50byB0aGUgY29uZmlnIGJlaW5nIGJ1aWx0LiBVbmtub3duIHRhZ3MgYXJlIGNvbGxlY3RlZCBmb3Igd2FybmluZy5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG50eXBlIEhhbmRsZXIgPSAoZWw6IEVsZW1lbnQsIGNvbmZpZzogTEVTQ29uZmlnKSA9PiB2b2lkXG5cbmNvbnN0IEhBTkRMRVJTOiBSZWNvcmQ8c3RyaW5nLCBIYW5kbGVyPiA9IHtcblxuICAndXNlLW1vZHVsZScoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IHR5cGUgPSBlbC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKT8udHJpbSgpID8/IG51bGxcbiAgICBjb25zdCBzcmMgID0gZWwuZ2V0QXR0cmlidXRlKCdzcmMnKT8udHJpbSgpICA/PyBudWxsXG5cbiAgICBpZiAoIXR5cGUgJiYgIXNyYykge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8dXNlLW1vZHVsZT4gaGFzIG5laXRoZXIgdHlwZT0gbm9yIHNyYz0gXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25maWcubW9kdWxlcy5wdXNoKHsgdHlwZSwgc3JjLCBlbGVtZW50OiBlbCB9KVxuICB9LFxuXG4gICdsb2NhbC1jb21tYW5kJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgbmFtZSA9IGVsLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgPz8gJydcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdkbycpPy50cmltKCkgICA/PyAnJ1xuXG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDxsb2NhbC1jb21tYW5kPiBtaXNzaW5nIHJlcXVpcmVkIG5hbWU9IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBpZiAoIWJvZHkpIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFU10gPGxvY2FsLWNvbW1hbmQgbmFtZT1cIiR7bmFtZX1cIj4gbWlzc2luZyByZXF1aXJlZCBkbz0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLmAsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uZmlnLmNvbW1hbmRzLnB1c2goe1xuICAgICAgbmFtZSxcbiAgICAgIGFyZ3NSYXc6IGVsLmdldEF0dHJpYnV0ZSgnYXJncycpPy50cmltKCkgID8/ICcnLFxuICAgICAgZ3VhcmQ6ICAgZWwuZ2V0QXR0cmlidXRlKCdndWFyZCcpPy50cmltKCkgPz8gbnVsbCxcbiAgICAgIGJvZHk6ICAgIHN0cmlwQm9keShib2R5KSxcbiAgICAgIGVsZW1lbnQ6IGVsLFxuICAgIH0pXG4gIH0sXG5cbiAgJ29uLWV2ZW50JyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgbmFtZSA9IGVsLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgICA/PyAnJ1xuICAgIGNvbnN0IGJvZHkgPSBlbC5nZXRBdHRyaWJ1dGUoJ2hhbmRsZScpPy50cmltKCkgPz8gJydcblxuICAgIGlmICghbmFtZSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tZXZlbnQ+IG1pc3NpbmcgcmVxdWlyZWQgbmFtZT0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTXSA8b24tZXZlbnQgbmFtZT1cIiR7bmFtZX1cIj4gbWlzc2luZyByZXF1aXJlZCBoYW5kbGU9IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC5gLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbmZpZy5vbkV2ZW50LnB1c2goeyBuYW1lLCBib2R5OiBzdHJpcEJvZHkoYm9keSksIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG5cbiAgJ29uLXNpZ25hbCcoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IG5hbWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpICAgPz8gJydcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdoYW5kbGUnKT8udHJpbSgpID8/ICcnXG5cbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPG9uLXNpZ25hbD4gbWlzc2luZyByZXF1aXJlZCBuYW1lPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVNdIDxvbi1zaWduYWwgbmFtZT1cIiR7bmFtZX1cIj4gbWlzc2luZyByZXF1aXJlZCBoYW5kbGU9IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC5gLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbmZpZy5vblNpZ25hbC5wdXNoKHtcbiAgICAgIG5hbWUsXG4gICAgICB3aGVuOiAgICBlbC5nZXRBdHRyaWJ1dGUoJ3doZW4nKT8udHJpbSgpID8/IG51bGwsXG4gICAgICBib2R5OiAgICBzdHJpcEJvZHkoYm9keSksXG4gICAgICBlbGVtZW50OiBlbCxcbiAgICB9KVxuICB9LFxuXG4gICdvbi1sb2FkJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tbG9hZD4gbWlzc2luZyByZXF1aXJlZCBydW49IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25maWcub25Mb2FkLnB1c2goeyBib2R5OiBzdHJpcEJvZHkoYm9keSksIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG5cbiAgJ29uLWVudGVyJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tZW50ZXI+IG1pc3NpbmcgcmVxdWlyZWQgcnVuPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uZmlnLm9uRW50ZXIucHVzaCh7XG4gICAgICB3aGVuOiAgICBlbC5nZXRBdHRyaWJ1dGUoJ3doZW4nKT8udHJpbSgpID8/IG51bGwsXG4gICAgICBib2R5OiAgICBzdHJpcEJvZHkoYm9keSksXG4gICAgICBlbGVtZW50OiBlbCxcbiAgICB9KVxuICB9LFxuXG4gICdvbi1leGl0JyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tZXhpdD4gbWlzc2luZyByZXF1aXJlZCBydW49IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25maWcub25FeGl0LnB1c2goeyBib2R5OiBzdHJpcEJvZHkoYm9keSksIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gcmVhZENvbmZpZyBcdTIwMTQgdGhlIHB1YmxpYyBlbnRyeSBwb2ludFxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogV2Fsa3MgdGhlIGRpcmVjdCBjaGlsZHJlbiBvZiBhIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGVsZW1lbnQgYW5kXG4gKiBwcm9kdWNlcyBhIHN0cnVjdHVyZWQgTEVTQ29uZmlnLlxuICpcbiAqIE9ubHkgZGlyZWN0IGNoaWxkcmVuIGFyZSByZWFkIFx1MjAxNCBuZXN0ZWQgZWxlbWVudHMgaW5zaWRlIGEgPGxvY2FsLWNvbW1hbmQ+XG4gKiBib2R5IGFyZSBub3QgY2hpbGRyZW4gb2YgdGhlIGhvc3QgYW5kIGFyZSBuZXZlciB2aXNpdGVkIGhlcmUuXG4gKlxuICogVW5rbm93biBjaGlsZCBlbGVtZW50cyBlbWl0IGEgY29uc29sZS53YXJuIGFuZCBhcmUgY29sbGVjdGVkIGluIGNvbmZpZy51bmtub3duXG4gKiBzbyB0b29saW5nIChlLmcuIGEgZnV0dXJlIExFUyBsYW5ndWFnZSBzZXJ2ZXIpIGNhbiByZXBvcnQgdGhlbS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRDb25maWcoaG9zdDogRWxlbWVudCk6IExFU0NvbmZpZyB7XG4gIGNvbnN0IGNvbmZpZzogTEVTQ29uZmlnID0ge1xuICAgIGlkOiAgICAgICBob3N0LmlkIHx8ICcobm8gaWQpJyxcbiAgICBtb2R1bGVzOiAgW10sXG4gICAgY29tbWFuZHM6IFtdLFxuICAgIG9uRXZlbnQ6ICBbXSxcbiAgICBvblNpZ25hbDogW10sXG4gICAgb25Mb2FkOiAgIFtdLFxuICAgIG9uRW50ZXI6ICBbXSxcbiAgICBvbkV4aXQ6ICAgW10sXG4gICAgdW5rbm93bjogIFtdLFxuICB9XG5cbiAgZm9yIChjb25zdCBjaGlsZCBvZiBBcnJheS5mcm9tKGhvc3QuY2hpbGRyZW4pKSB7XG4gICAgY29uc3QgdGFnID0gY2hpbGQudGFnTmFtZS50b0xvd2VyQ2FzZSgpXG4gICAgY29uc3QgaGFuZGxlciA9IEhBTkRMRVJTW3RhZ11cblxuICAgIGlmIChoYW5kbGVyKSB7XG4gICAgICBoYW5kbGVyKGNoaWxkLCBjb25maWcpXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEhUTUwgY29tbWVudHMgZG9uJ3QgYXBwZWFyIGluIC5jaGlsZHJlbiwgb25seSBpbiAuY2hpbGROb2Rlcy5cbiAgICAgIC8vIFNvIGV2ZXJ5dGhpbmcgaGVyZSBpcyBhIHJlYWwgZWxlbWVudCBcdTIwMTQgd2FybiBhbmQgY29sbGVjdC5cbiAgICAgIGNvbmZpZy51bmtub3duLnB1c2goY2hpbGQpXG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgIGBbTEVTXSBVbmtub3duIGNoaWxkIGVsZW1lbnQgPCR7dGFnfT4gaW5zaWRlIDxsb2NhbC1ldmVudC1zY3JpcHQgaWQ9XCIke2NvbmZpZy5pZH1cIj4gXHUyMDE0IGlnbm9yZWQuYCxcbiAgICAgICAgY2hpbGRcbiAgICAgIClcbiAgICB9XG4gIH1cblxuICByZXR1cm4gY29uZmlnXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gbG9nQ29uZmlnIFx1MjAxNCBzdHJ1Y3R1cmVkIGNoZWNrcG9pbnQgbG9nXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBMb2dzIGEgc3VtbWFyeSBvZiBhIHBhcnNlZCBMRVNDb25maWcuXG4gKiBQaGFzZSAxIGNoZWNrcG9pbnQ6IHlvdSBzaG91bGQgc2VlIHRoaXMgaW4gdGhlIGJyb3dzZXIgY29uc29sZS9kZWJ1ZyBsb2dcbiAqIHdpdGggYWxsIGNvbW1hbmRzLCBldmVudHMsIGFuZCBzaWduYWwgd2F0Y2hlcnMgY29ycmVjdGx5IGxpc3RlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvZ0NvbmZpZyhjb25maWc6IExFU0NvbmZpZyk6IHZvaWQge1xuICBjb25zdCBpZCA9IGNvbmZpZy5pZFxuICBjb25zb2xlLmxvZyhgW0xFU10gY29uZmlnIHJlYWQgZm9yICMke2lkfWApXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG1vZHVsZXM6ICAgJHtjb25maWcubW9kdWxlcy5sZW5ndGh9YCwgY29uZmlnLm1vZHVsZXMubWFwKG0gPT4gbS50eXBlID8/IG0uc3JjKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgY29tbWFuZHM6ICAke2NvbmZpZy5jb21tYW5kcy5sZW5ndGh9YCwgY29uZmlnLmNvbW1hbmRzLm1hcChjID0+IGMubmFtZSkpXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG9uLWV2ZW50OiAgJHtjb25maWcub25FdmVudC5sZW5ndGh9YCwgY29uZmlnLm9uRXZlbnQubWFwKGUgPT4gZS5uYW1lKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tc2lnbmFsOiAke2NvbmZpZy5vblNpZ25hbC5sZW5ndGh9YCwgY29uZmlnLm9uU2lnbmFsLm1hcChzID0+IHMubmFtZSkpXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG9uLWxvYWQ6ICAgJHtjb25maWcub25Mb2FkLmxlbmd0aH1gKVxuICBjb25zb2xlLmxvZyhgW0xFU10gICBvbi1lbnRlcjogICR7Y29uZmlnLm9uRW50ZXIubGVuZ3RofWAsIGNvbmZpZy5vbkVudGVyLm1hcChlID0+IGUud2hlbiA/PyAnYWx3YXlzJykpXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG9uLWV4aXQ6ICAgJHtjb25maWcub25FeGl0Lmxlbmd0aH1gKVxuXG4gIGlmIChjb25maWcudW5rbm93bi5sZW5ndGggPiAwKSB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTXSAgIHVua25vd24gY2hpbGRyZW46ICR7Y29uZmlnLnVua25vd24ubGVuZ3RofWAsIGNvbmZpZy51bmtub3duLm1hcChlID0+IGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpKSlcbiAgfVxuXG4gIC8vIExvZyBhIHNhbXBsaW5nIG9mIGJvZHkgc3RyaW5ncyB0byB2ZXJpZnkgc3RyaXBCb2R5IHdvcmtlZCBjb3JyZWN0bHlcbiAgaWYgKGNvbmZpZy5jb21tYW5kcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgZmlyc3QgPSBjb25maWcuY29tbWFuZHNbMF1cbiAgICBpZiAoZmlyc3QpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSAgIGZpcnN0IGNvbW1hbmQgYm9keSBwcmV2aWV3IChcIiR7Zmlyc3QubmFtZX1cIik6YClcbiAgICAgIGNvbnN0IHByZXZpZXcgPSBmaXJzdC5ib2R5LnNwbGl0KCdcXG4nKS5zbGljZSgwLCA0KS5qb2luKCdcXG4gICcpXG4gICAgICBjb25zb2xlLmxvZyhgW0xFU10gICB8ICR7cHJldmlld31gKVxuICAgIH1cbiAgfVxufVxuIiwgIi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gTEVTIFRva2VuaXplclxuLy9cbi8vIENvbnZlcnRzIGEgc3RyaXBCb2R5J2Qgc291cmNlIHN0cmluZyBpbnRvIGEgZmxhdCBhcnJheSBvZiBUb2tlbiBvYmplY3RzLlxuLy8gVG9rZW5zIGFyZSBzaW1wbHkgbm9uLWJsYW5rIGxpbmVzIHdpdGggdGhlaXIgaW5kZW50IGxldmVsIHJlY29yZGVkLlxuLy8gTm8gc2VtYW50aWMgYW5hbHlzaXMgaGFwcGVucyBoZXJlIFx1MjAxNCB0aGF0J3MgdGhlIHBhcnNlcidzIGpvYi5cbi8vXG4vLyBUaGUgdG9rZW5pemVyIGlzIGRlbGliZXJhdGVseSBtaW5pbWFsOiBpdCBwcmVzZXJ2ZXMgdGhlIHJhdyBpbmRlbnRhdGlvblxuLy8gaW5mb3JtYXRpb24gdGhlIHBhcnNlciBuZWVkcyB0byB1bmRlcnN0YW5kIGJsb2NrIHN0cnVjdHVyZS5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5leHBvcnQgaW50ZXJmYWNlIFRva2VuIHtcbiAgLyoqIENvbHVtbiBvZmZzZXQgb2YgdGhlIGZpcnN0IG5vbi13aGl0ZXNwYWNlIGNoYXJhY3RlciAobnVtYmVyIG9mIHNwYWNlcykgKi9cbiAgaW5kZW50OiBudW1iZXJcbiAgLyoqIFRyaW1tZWQgbGluZSBjb250ZW50IFx1MjAxNCBubyBsZWFkaW5nL3RyYWlsaW5nIHdoaXRlc3BhY2UgKi9cbiAgdGV4dDogc3RyaW5nXG4gIC8qKiAxLWJhc2VkIGxpbmUgbnVtYmVyIGluIHRoZSBzdHJpcHBlZCBzb3VyY2UgKGZvciBlcnJvciBtZXNzYWdlcykgKi9cbiAgbGluZU51bTogbnVtYmVyXG59XG5cbi8qKlxuICogQ29udmVydHMgYSBzdHJpcHBlZCBMRVMgYm9keSBzdHJpbmcgaW50byBhIFRva2VuIGFycmF5LlxuICogQmxhbmsgbGluZXMgYXJlIGRyb3BwZWQuIFRhYnMgYXJlIGV4cGFuZGVkIHRvIDIgc3BhY2VzIGVhY2guXG4gKlxuICogQHBhcmFtIHNvdXJjZSAgQSBzdHJpbmcgYWxyZWFkeSBwcm9jZXNzZWQgYnkgc3RyaXBCb2R5KCkgXHUyMDE0IG5vIGJhY2t0aWNrIHdyYXBwZXJzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9rZW5pemUoc291cmNlOiBzdHJpbmcpOiBUb2tlbltdIHtcbiAgY29uc3QgdG9rZW5zOiBUb2tlbltdID0gW11cbiAgY29uc3QgbGluZXMgPSBzb3VyY2Uuc3BsaXQoJ1xcbicpXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHJhdyA9IChsaW5lc1tpXSA/PyAnJykucmVwbGFjZSgvXFx0L2csICcgICcpXG4gICAgY29uc3QgdGV4dCA9IHJhdy50cmltKClcblxuICAgIC8vIFNraXAgYmxhbmsgbGluZXNcbiAgICBpZiAodGV4dC5sZW5ndGggPT09IDApIGNvbnRpbnVlXG5cbiAgICBjb25zdCBpbmRlbnQgPSByYXcubGVuZ3RoIC0gcmF3LnRyaW1TdGFydCgpLmxlbmd0aFxuXG4gICAgdG9rZW5zLnB1c2goe1xuICAgICAgaW5kZW50LFxuICAgICAgdGV4dCxcbiAgICAgIGxpbmVOdW06IGkgKyAxLFxuICAgIH0pXG4gIH1cblxuICByZXR1cm4gdG9rZW5zXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gSGVscGVycyB1c2VkIGJ5IGJvdGggdGhlIHRva2VuaXplciB0ZXN0cyBhbmQgdGhlIHBhcnNlclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIGB0ZXh0YCBlbmRzIHdpdGggYSBzdGFuZGFsb25lIGBhbmRgIHdvcmQuXG4gKiBVc2VkIGJ5IHRoZSBwYXJzZXIgdG8gZGV0ZWN0IHBhcmFsbGVsIGJyYW5jaGVzLlxuICpcbiAqIENhcmVmdWw6IFwiZW5nbGFuZFwiLCBcImJhbmRcIiwgXCJjb21tYW5kXCIgbXVzdCBOT1QgbWF0Y2guXG4gKiBXZSByZXF1aXJlIGEgd29yZCBib3VuZGFyeSBiZWZvcmUgYGFuZGAgYW5kIGVuZC1vZi1zdHJpbmcgYWZ0ZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbmRzV2l0aEFuZCh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIC9cXGJhbmQkLy50ZXN0KHRleHQpXG59XG5cbi8qKlxuICogU3RyaXBzIHRoZSB0cmFpbGluZyBgIGFuZGAgZnJvbSBhIGxpbmUgdGhhdCBlbmRzV2l0aEFuZC5cbiAqIFJldHVybnMgdGhlIHRyaW1tZWQgbGluZSBjb250ZW50IHdpdGhvdXQgaXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJpcFRyYWlsaW5nQW5kKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoL1xccythbmQkLywgJycpLnRyaW1FbmQoKVxufVxuXG4vKipcbiAqIEJsb2NrIHRlcm1pbmF0b3IgdG9rZW5zIFx1MjAxNCBzaWduYWwgdGhlIGVuZCBvZiBhIG1hdGNoIG9yIHRyeSBibG9jay5cbiAqIFRoZXNlIGFyZSBjb25zdW1lZCBieSB0aGUgYmxvY2stb3duaW5nIHBhcnNlciAocGFyc2VNYXRjaCAvIHBhcnNlVHJ5KSxcbiAqIG5vdCBieSBwYXJzZUJsb2NrIGl0c2VsZi5cbiAqL1xuZXhwb3J0IGNvbnN0IEJMT0NLX1RFUk1JTkFUT1JTID0gbmV3IFNldChbJy9tYXRjaCcsICcvdHJ5J10pXG5cbi8qKlxuICogS2V5d29yZHMgdGhhdCBlbmQgYSB0cnkgYm9keSBhbmQgc3RhcnQgYSByZXNjdWUvYWZ0ZXJ3YXJkcyBjbGF1c2UuXG4gKiBSZWNvZ25pemVkIG9ubHkgd2hlbiB0aGV5IGFwcGVhciBhdCB0aGUgc2FtZSBpbmRlbnQgbGV2ZWwgYXMgdGhlIGB0cnlgLlxuICovXG5leHBvcnQgY29uc3QgVFJZX0NMQVVTRV9LRVlXT1JEUyA9IG5ldyBTZXQoWydyZXNjdWUnLCAnYWZ0ZXJ3YXJkcyddKVxuIiwgImltcG9ydCB0eXBlIHtcbiAgTEVTTm9kZSwgRXhwck5vZGUsIFNlcXVlbmNlTm9kZSwgUGFyYWxsZWxOb2RlLFxuICBTZXROb2RlLCBFbWl0Tm9kZSwgQnJvYWRjYXN0Tm9kZSwgV2FpdE5vZGUsIENhbGxOb2RlLFxuICBCaW5kTm9kZSwgQWN0aW9uTm9kZSwgTWF0Y2hOb2RlLCBNYXRjaEFybSwgUGF0dGVybk5vZGUsXG4gIFRyeU5vZGUsIEFuaW1hdGlvbk5vZGUsXG59IGZyb20gJy4vYXN0LmpzJ1xuaW1wb3J0IHR5cGUgeyBUb2tlbiB9IGZyb20gJy4vdG9rZW5pemVyLmpzJ1xuaW1wb3J0IHtcbiAgZW5kc1dpdGhBbmQsIHN0cmlwVHJhaWxpbmdBbmQsXG4gIEJMT0NLX1RFUk1JTkFUT1JTLCBUUllfQ0xBVVNFX0tFWVdPUkRTLFxufSBmcm9tICcuL3Rva2VuaXplci5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBLbm93biBhbmltYXRpb24gcHJpbWl0aXZlIG5hbWVzIChyZWdpc3RlcmVkIGJ5IHRoZSBhbmltYXRpb24gbW9kdWxlKVxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmNvbnN0IEFOSU1BVElPTl9QUklNSVRJVkVTID0gbmV3IFNldChbXG4gICdmYWRlLWluJywgJ2ZhZGUtb3V0JywgJ3NsaWRlLWluJywgJ3NsaWRlLW91dCcsXG4gICdzbGlkZS11cCcsICdzbGlkZS1kb3duJywgJ3B1bHNlJyxcbiAgJ3N0YWdnZXItZW50ZXInLCAnc3RhZ2dlci1leGl0Jyxcbl0pXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gUGFyc2VyXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZXhwb3J0IGNsYXNzIExFU1BhcnNlciB7XG4gIHByaXZhdGUgcG9zID0gMFxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgdG9rZW5zOiBUb2tlbltdKSB7fVxuXG4gIHByaXZhdGUgcGVlayhvZmZzZXQgPSAwKTogVG9rZW4gfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLnRva2Vuc1t0aGlzLnBvcyArIG9mZnNldF1cbiAgfVxuXG4gIHByaXZhdGUgYWR2YW5jZSgpOiBUb2tlbiB7XG4gICAgY29uc3QgdCA9IHRoaXMudG9rZW5zW3RoaXMucG9zXVxuICAgIGlmICghdCkgdGhyb3cgbmV3IExFU1BhcnNlRXJyb3IoJ1VuZXhwZWN0ZWQgZW5kIG9mIGlucHV0JywgdW5kZWZpbmVkKVxuICAgIHRoaXMucG9zKytcbiAgICByZXR1cm4gdFxuICB9XG5cbiAgcHJpdmF0ZSBhdEVuZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5wb3MgPj0gdGhpcy50b2tlbnMubGVuZ3RoXG4gIH1cblxuICBwcml2YXRlIHRyeUNvbnN1bWUodGV4dDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgdCA9IHRoaXMucGVlaygpXG4gICAgaWYgKHQ/LnRleHQgPT09IHRleHQpIHsgdGhpcy5wb3MrKzsgcmV0dXJuIHRydWUgfVxuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEVudHJ5IHBvaW50IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHBhcnNlKCk6IExFU05vZGUge1xuICAgIGNvbnN0IG5vZGUgPSB0aGlzLnBhcnNlQmxvY2soLTEpXG4gICAgcmV0dXJuIG5vZGVcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBCbG9jayBwYXJzZXIgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgLyoqXG4gICAqIFBhcnNlcyBhbGwgc3RhdGVtZW50cyBhdCBpbmRlbnQgPiBiYXNlSW5kZW50LlxuICAgKlxuICAgKiBTdG9wcyB3aGVuIGl0IGVuY291bnRlcnM6XG4gICAqICAgLSBBIHRva2VuIHdpdGggaW5kZW50IDw9IGJhc2VJbmRlbnRcbiAgICogICAtIEEgYmxvY2sgdGVybWluYXRvciAoL21hdGNoLCAvdHJ5KSBcdTIwMTQgbGVmdCBmb3IgdGhlIHBhcmVudCB0byBjb25zdW1lXG4gICAqICAgLSBBIHRyeS1jbGF1c2Uga2V5d29yZCAocmVzY3VlLCBhZnRlcndhcmRzKSBhdCBpbmRlbnQgPD0gYmFzZUluZGVudFxuICAgKiAgIC0gRW5kIG9mIHRva2VuIHN0cmVhbVxuICAgKlxuICAgKiBSZXR1cm5zIGEgU2VxdWVuY2VOb2RlIGlmIG11bHRpcGxlIHN0ZXBzLCBvdGhlcndpc2UgdGhlIHNpbmdsZSBub2RlLlxuICAgKi9cbiAgcHJpdmF0ZSBwYXJzZUJsb2NrKGJhc2VJbmRlbnQ6IG51bWJlcik6IExFU05vZGUge1xuICAgIGNvbnN0IHN0ZXBzOiBMRVNOb2RlW10gPSBbXVxuXG4gICAgd2hpbGUgKCF0aGlzLmF0RW5kKCkpIHtcbiAgICAgIGNvbnN0IHQgPSB0aGlzLnBlZWsoKSFcblxuICAgICAgLy8gU3RvcDogd2UndmUgcmV0dXJuZWQgdG8gb3IgcGFzdCB0aGUgcGFyZW50IGJsb2NrJ3MgaW5kZW50XG4gICAgICBpZiAodC5pbmRlbnQgPD0gYmFzZUluZGVudCkgYnJlYWtcblxuICAgICAgLy8gU3RvcDogYmxvY2sgdGVybWluYXRvcnMgYXJlIGNvbnN1bWVkIGJ5IHRoZSBibG9jayBvcGVuZXIgKG1hdGNoL3RyeSlcbiAgICAgIGlmIChCTE9DS19URVJNSU5BVE9SUy5oYXModC50ZXh0KSkgYnJlYWtcblxuICAgICAgLy8gU3RvcDogdHJ5LWNsYXVzZSBrZXl3b3JkcyBlbmQgdGhlIGN1cnJlbnQgdHJ5IGJvZHlcbiAgICAgIGlmIChUUllfQ0xBVVNFX0tFWVdPUkRTLmhhcyh0LnRleHQpICYmIHQuaW5kZW50IDw9IGJhc2VJbmRlbnQgKyAyKSBicmVha1xuXG4gICAgICAvLyBcdTI1MDBcdTI1MDAgU2VxdWVudGlhbCBjb25uZWN0aXZlOiBzdGFuZGFsb25lIGB0aGVuYCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICAgIC8vIGB0aGVuYCBhbG9uZSBvbiBhIGxpbmUgaW50cm9kdWNlcyB0aGUgbmV4dCBzZXF1ZW50aWFsIHN0ZXAsXG4gICAgICAvLyB3aGljaCBpcyBhIGJsb2NrIGF0IGEgZGVlcGVyIGluZGVudCBsZXZlbC5cbiAgICAgIGlmICh0LnRleHQgPT09ICd0aGVuJykge1xuICAgICAgICBjb25zdCB0aGVuSW5kZW50ID0gdC5pbmRlbnRcbiAgICAgICAgdGhpcy5hZHZhbmNlKCkgLy8gY29uc3VtZSBgdGhlbmBcbiAgICAgICAgY29uc3QgbmV4dCA9IHRoaXMucGVlaygpXG4gICAgICAgIGlmIChuZXh0ICYmIG5leHQuaW5kZW50ID4gdGhlbkluZGVudCkge1xuICAgICAgICAgIGNvbnN0IHN0ZXAgPSB0aGlzLnBhcnNlQmxvY2sodGhlbkluZGVudClcbiAgICAgICAgICBzdGVwcy5wdXNoKHN0ZXApXG4gICAgICAgIH1cbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gXHUyNTAwXHUyNTAwIFNlcXVlbnRpYWwgY29ubmVjdGl2ZTogYHRoZW4gWGAgYXMgcHJlZml4IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgICAgLy8gYHRoZW4gY2FsbCBmb29gLCBgdGhlbiBlbWl0IGJhcmAsIGV0Yy5cbiAgICAgIC8vIFRoZSBgdGhlbmAgaXMganVzdCBhIHZpc3VhbCBzZXF1ZW5jZXIgXHUyMDE0IHRoZSByZXN0IG9mIHRoZSBsaW5lIGlzIHRoZSBzdGVwLlxuICAgICAgaWYgKHQudGV4dC5zdGFydHNXaXRoKCd0aGVuICcpKSB7XG4gICAgICAgIHRoaXMuYWR2YW5jZSgpXG4gICAgICAgIGNvbnN0IHJlc3QgPSB0LnRleHQuc2xpY2UoNSkudHJpbSgpXG4gICAgICAgIGNvbnN0IHN0ZXAgPSB0aGlzLnBhcnNlU2luZ2xlTGluZShyZXN0LCB0LmluZGVudCwgdClcbiAgICAgICAgc3RlcHMucHVzaChzdGVwKVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyBcdTI1MDBcdTI1MDAgUmVndWxhciBzdGF0ZW1lbnQgKHBvc3NpYmx5IGEgcGFyYWxsZWwgZ3JvdXApIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgICAgY29uc3Qgc3RtdCA9IHRoaXMucGFyc2VTdGF0ZW1lbnRPclBhcmFsbGVsKHQuaW5kZW50KVxuICAgICAgc3RlcHMucHVzaChzdG10KVxuICAgIH1cblxuICAgIHJldHVybiB0b1NlcXVlbmNlT3JTaW5nbGUoc3RlcHMpXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgUGFyYWxsZWwgZ3JvdXAgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgLyoqXG4gICAqIFBhcnNlcyBvbmUgc3RhdGVtZW50IG9yIGEgZ3JvdXAgb2YgcGFyYWxsZWwgc3RhdGVtZW50cyBjb25uZWN0ZWQgYnkgYGFuZGAuXG4gICAqXG4gICAqIExpbmVzIGVuZGluZyB3aXRoIGEgc3RhbmRhbG9uZSBgYW5kYCBpbmRpY2F0ZSB0aGF0IHRoZSBuZXh0IGxpbmUgcnVuc1xuICAgKiBjb25jdXJyZW50bHkuIEFsbCBwYXJhbGxlbCBicmFuY2hlcyBhcmUgd3JhcHBlZCBpbiBhIFBhcmFsbGVsTm9kZS5cbiAgICpcbiAgICogYGFuZGAtZ3JvdXBzIG9ubHkgYXBwbHkgd2l0aGluIHRoZSBzYW1lIGluZGVudCBsZXZlbC4gQSBkZWVwZXItaW5kZW50ZWRcbiAgICogbGluZSBhZnRlciBgYW5kYCBpcyBhbiBlcnJvciAod291bGQgaW5kaWNhdGUgYSBibG9jaywgYnV0IGBhbmRgIGlzXG4gICAqIGEgbGluZS1sZXZlbCBjb25uZWN0b3IsIG5vdCBhIGJsb2NrIG9wZW5lcikuXG4gICAqL1xuICBwcml2YXRlIHBhcnNlU3RhdGVtZW50T3JQYXJhbGxlbChibG9ja0luZGVudDogbnVtYmVyKTogTEVTTm9kZSB7XG4gICAgY29uc3QgYnJhbmNoZXM6IExFU05vZGVbXSA9IFtdXG5cbiAgICB3aGlsZSAoIXRoaXMuYXRFbmQoKSkge1xuICAgICAgY29uc3QgdCA9IHRoaXMucGVlaygpIVxuXG4gICAgICAvLyBTdG9wIGNvbmRpdGlvbnMgXHUyMDE0IHNhbWUgYXMgcGFyc2VCbG9jaydzXG4gICAgICBpZiAodC5pbmRlbnQgPCBibG9ja0luZGVudCkgYnJlYWtcbiAgICAgIGlmICh0LmluZGVudCA+IGJsb2NrSW5kZW50KSBicmVhayAgIC8vIHNob3VsZG4ndCBoYXBwZW4gaGVyZSwgc2FmZXR5IGd1YXJkXG4gICAgICBpZiAoQkxPQ0tfVEVSTUlOQVRPUlMuaGFzKHQudGV4dCkpIGJyZWFrXG4gICAgICBpZiAoVFJZX0NMQVVTRV9LRVlXT1JEUy5oYXModC50ZXh0KSkgYnJlYWtcbiAgICAgIGlmICh0LnRleHQgPT09ICd0aGVuJyB8fCB0LnRleHQuc3RhcnRzV2l0aCgndGhlbiAnKSkgYnJlYWtcblxuICAgICAgY29uc3QgaGFzQW5kID0gZW5kc1dpdGhBbmQodC50ZXh0KVxuICAgICAgY29uc3QgbGluZVRleHQgPSBoYXNBbmQgPyBzdHJpcFRyYWlsaW5nQW5kKHQudGV4dCkgOiB0LnRleHRcblxuICAgICAgdGhpcy5hZHZhbmNlKClcblxuICAgICAgY29uc3Qgc3RtdCA9IHRoaXMucGFyc2VTaW5nbGVMaW5lKGxpbmVUZXh0LCB0LmluZGVudCwgdClcbiAgICAgIGJyYW5jaGVzLnB1c2goc3RtdClcblxuICAgICAgaWYgKCFoYXNBbmQpIGJyZWFrXG4gICAgfVxuXG4gICAgaWYgKGJyYW5jaGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGV4cHIoJycpXG4gICAgaWYgKGJyYW5jaGVzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIGJyYW5jaGVzWzBdIVxuICAgIHJldHVybiB7IHR5cGU6ICdwYXJhbGxlbCcsIGJyYW5jaGVzIH0gc2F0aXNmaWVzIFBhcmFsbGVsTm9kZVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFNpbmdsZS1saW5lIGRpc3BhdGNoIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIC8qKlxuICAgKiBQYXJzZXMgYSBzaW5nbGUgc3RhdGVtZW50IGZyb20gaXRzIHRleHQgY29udGVudC5cbiAgICogVGhlIHRleHQgaGFzIGFscmVhZHkgaGFkIGB0aGVuIGAgcHJlZml4IGFuZCB0cmFpbGluZyBgIGFuZGAgc3RyaXBwZWQuXG4gICAqXG4gICAqIERpc3BhdGNoIG9yZGVyIG1hdHRlcnM6IG1vcmUgc3BlY2lmaWMgcGF0dGVybnMgbXVzdCBjb21lIGJlZm9yZSBnZW5lcmFsIG9uZXMuXG4gICAqL1xuICBwcml2YXRlIHBhcnNlU2luZ2xlTGluZSh0ZXh0OiBzdHJpbmcsIGluZGVudDogbnVtYmVyLCB0b2tlbjogVG9rZW4pOiBMRVNOb2RlIHtcbiAgICBjb25zdCBmaXJzdCA9IGZpcnN0V29yZCh0ZXh0KVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIEJsb2NrIGNvbnN0cnVjdHMgKGNvbnN1bWUgbXVsdGlwbGUgZm9sbG93aW5nIHRva2VucykgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgaWYgKGZpcnN0ID09PSAnbWF0Y2gnKSByZXR1cm4gdGhpcy5wYXJzZU1hdGNoKHRleHQsIGluZGVudCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAndHJ5JykgICByZXR1cm4gdGhpcy5wYXJzZVRyeShpbmRlbnQsIHRva2VuKVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIFNpbXBsZSBzdGF0ZW1lbnQgZGlzcGF0Y2ggXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgaWYgKGZpcnN0ID09PSAnc2V0JykgICAgICAgcmV0dXJuIHRoaXMucGFyc2VTZXQodGV4dCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAnZW1pdCcpICAgICAgcmV0dXJuIHRoaXMucGFyc2VFbWl0KHRleHQsIHRva2VuKVxuICAgIGlmIChmaXJzdCA9PT0gJ2Jyb2FkY2FzdCcpIHJldHVybiB0aGlzLnBhcnNlQnJvYWRjYXN0KHRleHQsIHRva2VuKVxuICAgIGlmIChmaXJzdCA9PT0gJ2NhbGwnKSAgICAgIHJldHVybiB0aGlzLnBhcnNlQ2FsbCh0ZXh0LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICd3YWl0JykgICAgICByZXR1cm4gdGhpcy5wYXJzZVdhaXQodGV4dCwgdG9rZW4pXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgQXN5bmMgYmluZDogYG5hbWUgPC0gQHZlcmIgJ3VybCcgW2FyZ3NdYCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAodGV4dC5pbmNsdWRlcygnIDwtICcpKSByZXR1cm4gdGhpcy5wYXJzZUJpbmQodGV4dCwgdG9rZW4pXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgQW5pbWF0aW9uIHByaW1pdGl2ZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAoQU5JTUFUSU9OX1BSSU1JVElWRVMuaGFzKGZpcnN0KSkgcmV0dXJuIHRoaXMucGFyc2VBbmltYXRpb24odGV4dCwgdG9rZW4pXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgVW5rbm93bjogc3RvcmUgYXMgcmF3IGV4cHJlc3Npb24gKGVzY2FwZSBoYXRjaCAvIGZ1dHVyZSBrZXl3b3JkcykgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gVW5rbm93biBzdGF0ZW1lbnQ6ICR7SlNPTi5zdHJpbmdpZnkodGV4dCl9YCwgdG9rZW4pXG4gICAgcmV0dXJuIGV4cHIodGV4dClcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBNYXRjaCBibG9jayBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwcml2YXRlIHBhcnNlTWF0Y2godGV4dDogc3RyaW5nLCBpbmRlbnQ6IG51bWJlciwgdG9rZW46IFRva2VuKTogTWF0Y2hOb2RlIHtcbiAgICAvLyBgdGV4dGAgaXMgZS5nLiBcIm1hdGNoIHJlc3BvbnNlXCIgb3IgXCJtYXRjaCAkZmVlZFN0YXRlXCJcbiAgICBjb25zdCBzdWJqZWN0UmF3ID0gdGV4dC5zbGljZSgnbWF0Y2gnLmxlbmd0aCkudHJpbSgpXG4gICAgY29uc3Qgc3ViamVjdDogRXhwck5vZGUgPSBleHByKHN1YmplY3RSYXcpXG4gICAgY29uc3QgYXJtczogTWF0Y2hBcm1bXSA9IFtdXG5cbiAgICB3aGlsZSAoIXRoaXMuYXRFbmQoKSkge1xuICAgICAgY29uc3QgdCA9IHRoaXMucGVlaygpIVxuXG4gICAgICAvLyAvbWF0Y2ggdGVybWluYXRlcyB0aGUgYmxvY2tcbiAgICAgIGlmICh0LnRleHQgPT09ICcvbWF0Y2gnKSB7XG4gICAgICAgIHRoaXMuYWR2YW5jZSgpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIC8vIE9ubHkgY29uc3VtZSBhcm0gbGluZXMgYXQgdGhlIGV4cGVjdGVkIGFybSBpbmRlbnQgKGluZGVudCArIDIpXG4gICAgICBpZiAodC5pbmRlbnQgPD0gaW5kZW50KSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIFVuY2xvc2VkIG1hdGNoIGJsb2NrIFx1MjAxNCBtaXNzaW5nIC9tYXRjaGAsIHRva2VuKVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICAvLyBQYXJzZSBhbiBhcm06IGBbcGF0dGVybl0gLT5gIG9yIGBbcGF0dGVybl0gLT4gYm9keWBcbiAgICAgIGlmICh0LnRleHQuc3RhcnRzV2l0aCgnWycpKSB7XG4gICAgICAgIGFybXMucHVzaCh0aGlzLnBhcnNlTWF0Y2hBcm0odC5pbmRlbnQsIHQpKVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyBTa2lwIHVuZXhwZWN0ZWQgbGluZXMgaW5zaWRlIG1hdGNoXG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBVbmV4cGVjdGVkIHRva2VuIGluc2lkZSBtYXRjaCBibG9jazogJHtKU09OLnN0cmluZ2lmeSh0LnRleHQpfWAsIHQpXG4gICAgICB0aGlzLmFkdmFuY2UoKVxuICAgIH1cblxuICAgIHJldHVybiB7IHR5cGU6ICdtYXRjaCcsIHN1YmplY3QsIGFybXMgfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZU1hdGNoQXJtKGFybUluZGVudDogbnVtYmVyLCB0b2tlbjogVG9rZW4pOiBNYXRjaEFybSB7XG4gICAgY29uc3QgdCA9IHRoaXMuYWR2YW5jZSgpIC8vIGNvbnN1bWUgdGhlIGFybSBsaW5lXG5cbiAgICAvLyBTcGxpdCBvbiBgIC0+YCB0byBzZXBhcmF0ZSBwYXR0ZXJuIGZyb20gYm9keVxuICAgIGNvbnN0IGFycm93SWR4ID0gdC50ZXh0LmluZGV4T2YoJyAtPicpXG4gICAgaWYgKGFycm93SWR4ID09PSAtMSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gTWF0Y2ggYXJtIG1pc3NpbmcgJy0+JzogJHtKU09OLnN0cmluZ2lmeSh0LnRleHQpfWAsIHQpXG4gICAgICByZXR1cm4geyBwYXR0ZXJuczogW3sga2luZDogJ3dpbGRjYXJkJyB9XSwgYm9keTogZXhwcignJykgfVxuICAgIH1cblxuICAgIGNvbnN0IHBhdHRlcm5SYXcgPSB0LnRleHQuc2xpY2UoMCwgYXJyb3dJZHgpLnRyaW0oKVxuICAgIGNvbnN0IGFmdGVyQXJyb3cgPSB0LnRleHQuc2xpY2UoYXJyb3dJZHggKyAzKS50cmltKCkgIC8vIGV2ZXJ5dGhpbmcgYWZ0ZXIgYC0+YFxuXG4gICAgY29uc3QgcGF0dGVybnMgPSBwYXJzZVBhdHRlcm5zKHBhdHRlcm5SYXcpXG5cbiAgICBsZXQgYm9keTogTEVTTm9kZVxuICAgIGlmIChhZnRlckFycm93Lmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIElubGluZSBhcm06IGBbJ2Vycm9yJ10gLT4gc2V0ICRmZWVkU3RhdGUgdG8gJ2Vycm9yJ2BcbiAgICAgIGJvZHkgPSB0aGlzLnBhcnNlU2luZ2xlTGluZShhZnRlckFycm93LCBhcm1JbmRlbnQsIHRva2VuKVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBNdWx0aS1saW5lIGFybTogYm9keSBpcyB0aGUgZGVlcGVyLWluZGVudGVkIGJsb2NrXG4gICAgICBib2R5ID0gdGhpcy5wYXJzZUJsb2NrKGFybUluZGVudClcbiAgICB9XG5cbiAgICByZXR1cm4geyBwYXR0ZXJucywgYm9keSB9XG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgVHJ5IGJsb2NrIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgcGFyc2VUcnkoaW5kZW50OiBudW1iZXIsIHRva2VuOiBUb2tlbik6IFRyeU5vZGUge1xuICAgIC8vIE5vdGU6IHRoZSBgdHJ5YCB0b2tlbiB3YXMgYWxyZWFkeSBjb25zdW1lZCBieSB0aGUgY2FsbGluZyBwYXJzZVN0YXRlbWVudE9yUGFyYWxsZWwuXG4gICAgLy8gRG8gTk9UIGNhbGwgdGhpcy5hZHZhbmNlKCkgaGVyZSBcdTIwMTQgdGhhdCB3b3VsZCBza2lwIHRoZSBmaXJzdCBib2R5IGxpbmUuXG5cbiAgICAvLyBQYXJzZSBib2R5IFx1MjAxNCBzdG9wcyBhdCByZXNjdWUvYWZ0ZXJ3YXJkcy8vdHJ5IGF0IHRoZSBzYW1lIGluZGVudCBsZXZlbFxuICAgIGNvbnN0IGJvZHkgPSB0aGlzLnBhcnNlQmxvY2soaW5kZW50KVxuXG4gICAgbGV0IHJlc2N1ZTogTEVTTm9kZSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZFxuICAgIGxldCBhZnRlcndhcmRzOiBMRVNOb2RlIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG5cbiAgICAvLyByZXNjdWUgY2xhdXNlIChvcHRpb25hbClcbiAgICBpZiAodGhpcy5wZWVrKCk/LnRleHQgPT09ICdyZXNjdWUnICYmIHRoaXMucGVlaygpPy5pbmRlbnQgPT09IGluZGVudCkge1xuICAgICAgdGhpcy5hZHZhbmNlKCkgLy8gY29uc3VtZSBgcmVzY3VlYFxuICAgICAgcmVzY3VlID0gdGhpcy5wYXJzZUJsb2NrKGluZGVudClcbiAgICB9XG5cbiAgICAvLyBhZnRlcndhcmRzIGNsYXVzZSAob3B0aW9uYWwpXG4gICAgaWYgKHRoaXMucGVlaygpPy50ZXh0ID09PSAnYWZ0ZXJ3YXJkcycgJiYgdGhpcy5wZWVrKCk/LmluZGVudCA9PT0gaW5kZW50KSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKSAvLyBjb25zdW1lIGBhZnRlcndhcmRzYFxuICAgICAgYWZ0ZXJ3YXJkcyA9IHRoaXMucGFyc2VCbG9jayhpbmRlbnQpXG4gICAgfVxuXG4gICAgLy8gQ29uc3VtZSAvdHJ5XG4gICAgaWYgKHRoaXMucGVlaygpPy50ZXh0ID09PSAnL3RyeScpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIFVuY2xvc2VkIHRyeSBibG9jayBcdTIwMTQgbWlzc2luZyAvdHJ5YCwgdG9rZW4pXG4gICAgfVxuXG4gICAgY29uc3QgdHJ5Tm9kZTogVHJ5Tm9kZSA9IHsgdHlwZTogJ3RyeScsIGJvZHkgfVxuICAgIGlmIChyZXNjdWUgICAgIT09IHVuZGVmaW5lZCkgdHJ5Tm9kZS5yZXNjdWUgICAgID0gcmVzY3VlXG4gICAgaWYgKGFmdGVyd2FyZHMgIT09IHVuZGVmaW5lZCkgdHJ5Tm9kZS5hZnRlcndhcmRzID0gYWZ0ZXJ3YXJkc1xuICAgIHJldHVybiB0cnlOb2RlXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgU2ltcGxlIHN0YXRlbWVudCBwYXJzZXJzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgcGFyc2VTZXQodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBTZXROb2RlIHtcbiAgICAvLyBgc2V0ICRzaWduYWwgdG8gZXhwcmBcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXnNldFxccytcXCQoXFx3KylcXHMrdG9cXHMrKC4rKSQvKVxuICAgIGlmICghbSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gTWFsZm9ybWVkIHNldCBzdGF0ZW1lbnQ6ICR7SlNPTi5zdHJpbmdpZnkodGV4dCl9YCwgdG9rZW4pXG4gICAgICByZXR1cm4geyB0eXBlOiAnc2V0Jywgc2lnbmFsOiAnPz8nLCB2YWx1ZTogZXhwcih0ZXh0KSB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnc2V0JyxcbiAgICAgIHNpZ25hbDogbVsxXSEsXG4gICAgICB2YWx1ZTogZXhwcihtWzJdIS50cmltKCkpLFxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VFbWl0KHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogRW1pdE5vZGUge1xuICAgIC8vIGBlbWl0IGV2ZW50Om5hbWUgW3BheWxvYWQsIC4uLl1gIG9yIGBlbWl0IGV2ZW50Om5hbWVgXG4gICAgY29uc3QgeyBuYW1lLCBwYXlsb2FkIH0gPSBwYXJzZUV2ZW50TGluZSh0ZXh0LnNsaWNlKCdlbWl0Jy5sZW5ndGgpLnRyaW0oKSwgdG9rZW4pXG4gICAgcmV0dXJuIHsgdHlwZTogJ2VtaXQnLCBldmVudDogbmFtZSwgcGF5bG9hZCB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQnJvYWRjYXN0KHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogQnJvYWRjYXN0Tm9kZSB7XG4gICAgY29uc3QgeyBuYW1lLCBwYXlsb2FkIH0gPSBwYXJzZUV2ZW50TGluZSh0ZXh0LnNsaWNlKCdicm9hZGNhc3QnLmxlbmd0aCkudHJpbSgpLCB0b2tlbilcbiAgICByZXR1cm4geyB0eXBlOiAnYnJvYWRjYXN0JywgZXZlbnQ6IG5hbWUsIHBheWxvYWQgfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUNhbGwodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBDYWxsTm9kZSB7XG4gICAgLy8gYGNhbGwgY29tbWFuZDpuYW1lIFthcmc6IHZhbHVlLCAuLi5dYCBvciBgY2FsbCBjb21tYW5kOm5hbWVgXG4gICAgY29uc3QgbSA9IHRleHQubWF0Y2goL15jYWxsXFxzKyhbXlxcc1xcW10rKVxccyooPzpcXFsoLispXFxdKT8kLylcbiAgICBpZiAoIW0pIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIE1hbGZvcm1lZCBjYWxsIHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7IHR5cGU6ICdjYWxsJywgY29tbWFuZDogJz8/JywgYXJnczoge30gfVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogJ2NhbGwnLFxuICAgICAgY29tbWFuZDogbVsxXSEsXG4gICAgICBhcmdzOiBwYXJzZUFyZ0xpc3QobVsyXSA/PyAnJyksXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZVdhaXQodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBXYWl0Tm9kZSB7XG4gICAgLy8gYHdhaXQgMzAwbXNgIG9yIGB3YWl0IChhdHRlbXB0ICsgMSkgKiA1MDBtc2BcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXndhaXRcXHMrKC4rPyltcyQvKVxuICAgIGlmICghbSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gTWFsZm9ybWVkIHdhaXQgc3RhdGVtZW50OiAke0pTT04uc3RyaW5naWZ5KHRleHQpfWAsIHRva2VuKVxuICAgICAgcmV0dXJuIHsgdHlwZTogJ3dhaXQnLCBtczogMCB9XG4gICAgfVxuICAgIGNvbnN0IG1zRXhwciA9IG1bMV0hLnRyaW0oKVxuICAgIC8vIFNpbXBsZSBsaXRlcmFsXG4gICAgY29uc3QgbGl0ZXJhbCA9IE51bWJlcihtc0V4cHIpXG4gICAgaWYgKCFOdW1iZXIuaXNOYU4obGl0ZXJhbCkpIHJldHVybiB7IHR5cGU6ICd3YWl0JywgbXM6IGxpdGVyYWwgfVxuICAgIC8vIEV4cHJlc3Npb24gXHUyMDE0IHN0b3JlIGFzIDAgd2l0aCB0aGUgZXhwcmVzc2lvbiBhcyBhIGNvbW1lbnQgKGV4ZWN1dG9yIHdpbGwgZXZhbClcbiAgICAvLyBQaGFzZSAzIHdpbGwgaGFuZGxlIGR5bmFtaWMgZHVyYXRpb25zIHByb3Blcmx5XG4gICAgcmV0dXJuIHsgdHlwZTogJ3dhaXQnLCBtczogMCB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQmluZCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IEJpbmROb2RlIHtcbiAgICAvLyBgbmFtZSA8LSBAdmVyYiAndXJsJyBbYXJnc11gXG4gICAgY29uc3QgbSA9IHRleHQubWF0Y2goL14oXFx3KylcXHMrPC1cXHMrQChcXHcrKVxccysnKFteJ10rKSdcXHMqKD86XFxbKC4rKVxcXSk/JC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgYmluZCBzdGF0ZW1lbnQ6ICR7SlNPTi5zdHJpbmdpZnkodGV4dCl9YCwgdG9rZW4pXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnYmluZCcsXG4gICAgICAgIG5hbWU6ICc/PycsXG4gICAgICAgIGFjdGlvbjogeyB0eXBlOiAnYWN0aW9uJywgdmVyYjogJ2dldCcsIHVybDogJycsIGFyZ3M6IHt9IH0sXG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IGFjdGlvbjogQWN0aW9uTm9kZSA9IHtcbiAgICAgIHR5cGU6ICdhY3Rpb24nLFxuICAgICAgdmVyYjogbVsyXSEudG9Mb3dlckNhc2UoKSxcbiAgICAgIHVybDogbVszXSEsXG4gICAgICBhcmdzOiBwYXJzZUFyZ0xpc3QobVs0XSA/PyAnJyksXG4gICAgfVxuICAgIHJldHVybiB7IHR5cGU6ICdiaW5kJywgbmFtZTogbVsxXSEsIGFjdGlvbiB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQW5pbWF0aW9uKHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogQW5pbWF0aW9uTm9kZSB7XG4gICAgLy8gYHByaW1pdGl2ZSBzZWxlY3RvciBkdXJhdGlvbiBlYXNpbmcgW29wdGlvbnNdYFxuICAgIC8vIEV4YW1wbGVzOlxuICAgIC8vICAgc3RhZ2dlci1lbnRlciAuZmVlZC1pdGVtICAxMjBtcyBlYXNlLW91dCBbZ2FwOiA0MG1zICBmcm9tOiByaWdodF1cbiAgICAvLyAgIHB1bHNlIC5mZWVkLWl0ZW0uaXMtdXBkYXRlZCAgMzAwbXMgZWFzZS1pbi1vdXRcbiAgICAvLyAgIHNsaWRlLW91dCBbZGF0YS1pdGVtLWlkOiBpZF0gIDE1MG1zIGVhc2UtaW4gW3RvOiByaWdodF1cblxuICAgIC8vIFRva2VuaXplOiBzcGxpdCBvbiB3aGl0ZXNwYWNlIGJ1dCBwcmVzZXJ2ZSBbLi4uXSBncm91cHNcbiAgICBjb25zdCBwYXJ0cyA9IHNwbGl0QW5pbWF0aW9uTGluZSh0ZXh0KVxuXG4gICAgY29uc3QgcHJpbWl0aXZlID0gcGFydHNbMF0gPz8gJydcbiAgICBjb25zdCBzZWxlY3RvciAgPSBwYXJ0c1sxXSA/PyAnJ1xuICAgIGNvbnN0IGR1cmF0aW9uU3RyID0gcGFydHNbMl0gPz8gJzBtcydcbiAgICBjb25zdCBlYXNpbmcgICAgPSBwYXJ0c1szXSA/PyAnZWFzZSdcbiAgICBjb25zdCBvcHRpb25zU3RyID0gcGFydHNbNF0gPz8gJycgIC8vIG1heSBiZSBhYnNlbnRcblxuICAgIGNvbnN0IGR1cmF0aW9uTXMgPSBwYXJzZUludChkdXJhdGlvblN0ciwgMTApXG5cbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogJ2FuaW1hdGlvbicsXG4gICAgICBwcmltaXRpdmUsXG4gICAgICBzZWxlY3RvcixcbiAgICAgIGR1cmF0aW9uOiBOdW1iZXIuaXNOYU4oZHVyYXRpb25NcykgPyAwIDogZHVyYXRpb25NcyxcbiAgICAgIGVhc2luZyxcbiAgICAgIG9wdGlvbnM6IHBhcnNlQW5pbWF0aW9uT3B0aW9ucyhvcHRpb25zU3RyKSxcbiAgICB9XG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXR0ZXJuIHBhcnNpbmdcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFBhcnNlcyBhIHBhdHRlcm4gZ3JvdXAgbGlrZSBgW2l0ICAgb2sgICBdYCwgYFtuaWwgIGVycm9yXWAsIGBbX11gLFxuICogYFsnZXJyb3InXWAsIGBbMCB8IDEgfCAyXWAuXG4gKlxuICogUmV0dXJucyBhbiBhcnJheSBvZiBQYXR0ZXJuTm9kZSBcdTIwMTQgb25lIHBlciBlbGVtZW50IGluIHRoZSB0dXBsZSBwYXR0ZXJuLlxuICogRm9yIG9yLXBhdHRlcm5zIChgMCB8IDEgfCAyYCksIHJldHVybnMgYSBzaW5nbGUgT3JQYXR0ZXJuTm9kZS5cbiAqL1xuZnVuY3Rpb24gcGFyc2VQYXR0ZXJucyhyYXc6IHN0cmluZyk6IFBhdHRlcm5Ob2RlW10ge1xuICAvLyBTdHJpcCBvdXRlciBicmFja2V0c1xuICBjb25zdCBpbm5lciA9IHJhdy5yZXBsYWNlKC9eXFxbfFxcXSQvZywgJycpLnRyaW0oKVxuXG4gIC8vIENoZWNrIGZvciBvci1wYXR0ZXJuOiBjb250YWlucyBgIHwgYFxuICBpZiAoaW5uZXIuaW5jbHVkZXMoJyB8ICcpIHx8IGlubmVyLmluY2x1ZGVzKCd8JykpIHtcbiAgICBjb25zdCBhbHRlcm5hdGl2ZXMgPSBpbm5lci5zcGxpdCgvXFxzKlxcfFxccyovKS5tYXAocCA9PiBwYXJzZVNpbmdsZVBhdHRlcm4ocC50cmltKCkpKVxuICAgIHJldHVybiBbeyBraW5kOiAnb3InLCBwYXR0ZXJuczogYWx0ZXJuYXRpdmVzIH1dXG4gIH1cblxuICAvLyBUdXBsZSBwYXR0ZXJuOiBzcGFjZS1zZXBhcmF0ZWQgZWxlbWVudHNcbiAgLy8gVXNlIGEgY3VzdG9tIHNwbGl0IHRvIGhhbmRsZSBtdWx0aXBsZSBzcGFjZXMgKGFsaWdubWVudCBwYWRkaW5nKVxuICByZXR1cm4gaW5uZXIudHJpbSgpLnNwbGl0KC9cXHN7Mix9fFxccyg/PVxcUykvKS5maWx0ZXIocyA9PiBzLnRyaW0oKSlcbiAgICAubWFwKHAgPT4gcGFyc2VTaW5nbGVQYXR0ZXJuKHAudHJpbSgpKSlcbn1cblxuZnVuY3Rpb24gcGFyc2VTaW5nbGVQYXR0ZXJuKHM6IHN0cmluZyk6IFBhdHRlcm5Ob2RlIHtcbiAgaWYgKHMgPT09ICdfJykgICByZXR1cm4geyBraW5kOiAnd2lsZGNhcmQnIH1cbiAgaWYgKHMgPT09ICduaWwnKSByZXR1cm4geyBraW5kOiAnbGl0ZXJhbCcsIHZhbHVlOiBudWxsIH1cblxuICAvLyBTdHJpbmcgbGl0ZXJhbDogJ3ZhbHVlJ1xuICBpZiAocy5zdGFydHNXaXRoKFwiJ1wiKSAmJiBzLmVuZHNXaXRoKFwiJ1wiKSkge1xuICAgIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IHMuc2xpY2UoMSwgLTEpIH1cbiAgfVxuXG4gIC8vIE51bWJlciBsaXRlcmFsXG4gIGNvbnN0IG4gPSBOdW1iZXIocylcbiAgaWYgKCFOdW1iZXIuaXNOYU4obikpIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IG4gfVxuXG4gIC8vIEJvb2xlYW5cbiAgaWYgKHMgPT09ICd0cnVlJykgIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IHRydWUgfVxuICBpZiAocyA9PT0gJ2ZhbHNlJykgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogZmFsc2UgfVxuXG4gIC8vIEV2ZXJ5dGhpbmcgZWxzZSBpcyBhIGJpbmRpbmcgKGNhcHR1cmVzIHRoZSB2YWx1ZSBmb3IgdXNlIGluIHRoZSBib2R5KVxuICByZXR1cm4geyBraW5kOiAnYmluZGluZycsIG5hbWU6IHMgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEFyZ3VtZW50IGxpc3QgcGFyc2luZ1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogUGFyc2VzIGBrZXk6IHZhbHVlICBrZXkyOiB2YWx1ZTJgIGZyb20gaW5zaWRlIGEgWy4uLl0gYXJndW1lbnQgYmxvY2suXG4gKiBWYWx1ZXMgYXJlIHN0b3JlZCBhcyBFeHByTm9kZSAoZXZhbHVhdGVkIGF0IHJ1bnRpbWUpLlxuICovXG5mdW5jdGlvbiBwYXJzZUFyZ0xpc3QocmF3OiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCBFeHByTm9kZT4ge1xuICBpZiAoIXJhdy50cmltKCkpIHJldHVybiB7fVxuXG4gIGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgRXhwck5vZGU+ID0ge31cblxuICAvLyBTcGxpdCBvbiBgICBgIChkb3VibGUtc3BhY2UgdXNlZCBhcyBzZXBhcmF0b3IgaW4gTEVTIHN0eWxlKVxuICAvLyBidXQgYWxzbyBoYW5kbGUgc2luZ2xlIGAgIGtleTogdmFsdWVgIGVudHJpZXNcbiAgLy8gU2ltcGxlIHJlZ2V4OiBgd29yZDogcmVzdF91bnRpbF9uZXh0X3dvcmQ6YFxuICBjb25zdCBwYWlycyA9IHJhdy50cmltKCkuc3BsaXQoLyg/PD1cXFMpXFxzezIsfSg/PVxcdykvKVxuICBmb3IgKGNvbnN0IHBhaXIgb2YgcGFpcnMpIHtcbiAgICBjb25zdCBjb2xvbklkeCA9IHBhaXIuaW5kZXhPZignOicpXG4gICAgaWYgKGNvbG9uSWR4ID09PSAtMSkgY29udGludWVcbiAgICBjb25zdCBrZXkgICA9IHBhaXIuc2xpY2UoMCwgY29sb25JZHgpLnRyaW0oKVxuICAgIGNvbnN0IHZhbHVlID0gcGFpci5zbGljZShjb2xvbklkeCArIDEpLnRyaW0oKVxuICAgIGlmIChrZXkpIHJlc3VsdFtrZXldID0gZXhwcih2YWx1ZSlcbiAgfVxuXG4gIHJldHVybiByZXN1bHRcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBFdmVudCBsaW5lIHBhcnNpbmc6IGBldmVudDpuYW1lIFtwYXlsb2FkLi4uXWBcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5mdW5jdGlvbiBwYXJzZUV2ZW50TGluZShcbiAgcmF3OiBzdHJpbmcsXG4gIHRva2VuOiBUb2tlblxuKTogeyBuYW1lOiBzdHJpbmc7IHBheWxvYWQ6IEV4cHJOb2RlW10gfSB7XG4gIC8vIGBmZWVkOmRhdGEtcmVhZHlgIG9yIGBmZWVkOmRhdGEtcmVhZHkgWyRmZWVkSXRlbXNdYCBvciBgZmVlZDplcnJvciBbJGVycm9yXWBcbiAgY29uc3QgYnJhY2tldElkeCA9IHJhdy5pbmRleE9mKCdbJylcbiAgaWYgKGJyYWNrZXRJZHggPT09IC0xKSB7XG4gICAgcmV0dXJuIHsgbmFtZTogcmF3LnRyaW0oKSwgcGF5bG9hZDogW10gfVxuICB9XG4gIGNvbnN0IG5hbWUgPSByYXcuc2xpY2UoMCwgYnJhY2tldElkeCkudHJpbSgpXG4gIGNvbnN0IHBheWxvYWRSYXcgPSByYXcuc2xpY2UoYnJhY2tldElkeCArIDEsIHJhdy5sYXN0SW5kZXhPZignXScpKS50cmltKClcblxuICAvLyBQYXlsb2FkIGVsZW1lbnRzIGFyZSBjb21tYSBvciBzcGFjZSBzZXBhcmF0ZWQgZXhwcmVzc2lvbnNcbiAgY29uc3QgcGF5bG9hZDogRXhwck5vZGVbXSA9IHBheWxvYWRSYXdcbiAgICA/IHBheWxvYWRSYXcuc3BsaXQoLyxcXHMqfFxcc3syLH0vKS5tYXAocyA9PiBleHByKHMudHJpbSgpKSkuZmlsdGVyKGUgPT4gZS5yYXcpXG4gICAgOiBbXVxuXG4gIHJldHVybiB7IG5hbWUsIHBheWxvYWQgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEFuaW1hdGlvbiBsaW5lIHBhcnNpbmdcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFNwbGl0cyBhbiBhbmltYXRpb24gbGluZSBpbnRvIGl0cyBzdHJ1Y3R1cmFsIHBhcnRzLCBwcmVzZXJ2aW5nIFsuLi5dIGdyb3Vwcy5cbiAqXG4gKiBJbnB1dDogIGBzdGFnZ2VyLWVudGVyIC5mZWVkLWl0ZW0gIDEyMG1zIGVhc2Utb3V0IFtnYXA6IDQwbXMgIGZyb206IHJpZ2h0XWBcbiAqIE91dHB1dDogWydzdGFnZ2VyLWVudGVyJywgJy5mZWVkLWl0ZW0nLCAnMTIwbXMnLCAnZWFzZS1vdXQnLCAnW2dhcDogNDBtcyAgZnJvbTogcmlnaHRdJ11cbiAqL1xuZnVuY3Rpb24gc3BsaXRBbmltYXRpb25MaW5lKHRleHQ6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW11cbiAgbGV0IGN1cnJlbnQgPSAnJ1xuICBsZXQgaW5CcmFja2V0ID0gMFxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdGV4dC5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGNoID0gdGV4dFtpXSFcbiAgICBpZiAoY2ggPT09ICdbJykge1xuICAgICAgaW5CcmFja2V0KytcbiAgICAgIGN1cnJlbnQgKz0gY2hcbiAgICB9IGVsc2UgaWYgKGNoID09PSAnXScpIHtcbiAgICAgIGluQnJhY2tldC0tXG4gICAgICBjdXJyZW50ICs9IGNoXG4gICAgfSBlbHNlIGlmIChjaCA9PT0gJyAnICYmIGluQnJhY2tldCA9PT0gMCkge1xuICAgICAgaWYgKGN1cnJlbnQudHJpbSgpKSBwYXJ0cy5wdXNoKGN1cnJlbnQudHJpbSgpKVxuICAgICAgY3VycmVudCA9ICcnXG4gICAgfSBlbHNlIHtcbiAgICAgIGN1cnJlbnQgKz0gY2hcbiAgICB9XG4gIH1cbiAgaWYgKGN1cnJlbnQudHJpbSgpKSBwYXJ0cy5wdXNoKGN1cnJlbnQudHJpbSgpKVxuICByZXR1cm4gcGFydHNcbn1cblxuLyoqXG4gKiBQYXJzZXMgYW5pbWF0aW9uIG9wdGlvbnMgZnJvbSBhIGBba2V5OiB2YWx1ZSAga2V5MjogdmFsdWUyXWAgc3RyaW5nLlxuICogVGhlIG91dGVyIGJyYWNrZXRzIGFyZSBpbmNsdWRlZCBpbiB0aGUgaW5wdXQuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlQW5pbWF0aW9uT3B0aW9ucyhyYXc6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIEV4cHJOb2RlPiB7XG4gIGlmICghcmF3LnRyaW0oKSkgcmV0dXJuIHt9XG4gIC8vIFN0cmlwIG91dGVyIGJyYWNrZXRzXG4gIGNvbnN0IGlubmVyID0gcmF3LnJlcGxhY2UoL15cXFt8XFxdJC9nLCAnJykudHJpbSgpXG4gIHJldHVybiBwYXJzZUFyZ0xpc3QoaW5uZXIpXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gVXRpbGl0aWVzXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gZXhwcihyYXc6IHN0cmluZyk6IEV4cHJOb2RlIHtcbiAgcmV0dXJuIHsgdHlwZTogJ2V4cHInLCByYXcgfVxufVxuXG5mdW5jdGlvbiBmaXJzdFdvcmQodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHRleHQuc3BsaXQoL1xccysvKVswXSA/PyAnJ1xufVxuXG5mdW5jdGlvbiB0b1NlcXVlbmNlT3JTaW5nbGUoc3RlcHM6IExFU05vZGVbXSk6IExFU05vZGUge1xuICBpZiAoc3RlcHMubGVuZ3RoID09PSAwKSByZXR1cm4gZXhwcignJylcbiAgaWYgKHN0ZXBzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIHN0ZXBzWzBdIVxuICByZXR1cm4geyB0eXBlOiAnc2VxdWVuY2UnLCBzdGVwcyB9IHNhdGlzZmllcyBTZXF1ZW5jZU5vZGVcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXJzZSBlcnJvclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBjbGFzcyBMRVNQYXJzZUVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcsIHB1YmxpYyByZWFkb25seSB0b2tlbjogVG9rZW4gfCB1bmRlZmluZWQpIHtcbiAgICBjb25zdCBsb2MgPSB0b2tlbiA/IGAgKGxpbmUgJHt0b2tlbi5saW5lTnVtfTogJHtKU09OLnN0cmluZ2lmeSh0b2tlbi50ZXh0KX0pYCA6ICcnXG4gICAgc3VwZXIoYFtMRVM6cGFyc2VyXSAke21lc3NhZ2V9JHtsb2N9YClcbiAgICB0aGlzLm5hbWUgPSAnTEVTUGFyc2VFcnJvcidcbiAgfVxufVxuIiwgImltcG9ydCB7IHN0cmlwQm9keSB9IGZyb20gJy4vc3RyaXBCb2R5LmpzJ1xuaW1wb3J0IHsgdG9rZW5pemUgfSBmcm9tICcuL3Rva2VuaXplci5qcydcbmltcG9ydCB7IExFU1BhcnNlciB9IGZyb20gJy4vcGFyc2VyLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNOb2RlIH0gZnJvbSAnLi9hc3QuanMnXG5cbmV4cG9ydCB7IExFU1BhcnNlciwgTEVTUGFyc2VFcnJvciB9IGZyb20gJy4vcGFyc2VyLmpzJ1xuZXhwb3J0IHsgdG9rZW5pemUsIGVuZHNXaXRoQW5kLCBzdHJpcFRyYWlsaW5nQW5kIH0gZnJvbSAnLi90b2tlbml6ZXIuanMnXG5leHBvcnQgeyBzdHJpcEJvZHkgfSBmcm9tICcuL3N0cmlwQm9keS5qcydcbmV4cG9ydCB0eXBlIHsgVG9rZW4gfSBmcm9tICcuL3Rva2VuaXplci5qcydcbmV4cG9ydCAqIGZyb20gJy4vYXN0LmpzJ1xuZXhwb3J0ICogZnJvbSAnLi9jb25maWcuanMnXG5cbi8qKlxuICogUGFyc2UgYSByYXcgTEVTIGJvZHkgc3RyaW5nIChmcm9tIGEgZG89LCBoYW5kbGU9LCBvciBydW49IGF0dHJpYnV0ZSlcbiAqIGludG8gYSB0eXBlZCBBU1Qgbm9kZS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBwdWJsaWMgZW50cnkgcG9pbnQgZm9yIFBoYXNlIDI6XG4gKiAgIC0gU3RyaXBzIGJhY2t0aWNrIHdyYXBwZXIgYW5kIG5vcm1hbGl6ZXMgaW5kZW50YXRpb24gKHN0cmlwQm9keSlcbiAqICAgLSBUb2tlbml6ZXMgaW50byBsaW5lcyB3aXRoIGluZGVudCBsZXZlbHMgKHRva2VuaXplKVxuICogICAtIFBhcnNlcyBpbnRvIGEgdHlwZWQgTEVTTm9kZSBBU1QgKExFU1BhcnNlcilcbiAqXG4gKiBAdGhyb3dzIExFU1BhcnNlRXJyb3Igb24gdW5yZWNvdmVyYWJsZSBzeW50YXggZXJyb3JzIChjdXJyZW50bHkgc29mdC13YXJucyBpbnN0ZWFkKVxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VMRVMocmF3OiBzdHJpbmcpOiBMRVNOb2RlIHtcbiAgY29uc3Qgc3RyaXBwZWQgPSBzdHJpcEJvZHkocmF3KVxuICBjb25zdCB0b2tlbnMgICA9IHRva2VuaXplKHN0cmlwcGVkKVxuICBjb25zdCBwYXJzZXIgICA9IG5ldyBMRVNQYXJzZXIodG9rZW5zKVxuICByZXR1cm4gcGFyc2VyLnBhcnNlKClcbn1cbiIsICIvKipcbiAqIFBoYXNlIDQ6IHdpcmVzIHRoZSBwYXJzZWQgY29uZmlnIGludG8gbGl2ZSBydW50aW1lIGJlaGF2aW9yLlxuICpcbiAqIFJlc3BvbnNpYmlsaXRpZXM6XG4gKiAgIDEuIFJlZ2lzdGVyIGFsbCA8bG9jYWwtY29tbWFuZD4gcGFyc2VkIGRlZnMgaW50byB0aGUgQ29tbWFuZFJlZ2lzdHJ5XG4gKiAgIDIuIEF0dGFjaCBDdXN0b21FdmVudCBsaXN0ZW5lcnMgb24gdGhlIGhvc3QgZm9yIGVhY2ggPG9uLWV2ZW50PlxuICogICAzLiBXaXJlIDxvbi1sb2FkPiB0byBmaXJlIGFmdGVyIERPTSBpcyByZWFkeVxuICogICA0LiBCdWlsZCB0aGUgTEVTQ29udGV4dCB1c2VkIGJ5IHRoZSBleGVjdXRvclxuICpcbiAqIDxvbi1zaWduYWw+IGFuZCA8b24tZW50ZXI+Lzxvbi1leGl0PiBhcmUgd2lyZWQgaW4gUGhhc2UgNS82LlxuICovXG5cbmltcG9ydCB7IGV4ZWN1dGUsIGV2YWxFeHByIH0gZnJvbSAnLi9leGVjdXRvci5qcydcbmltcG9ydCB7IExFU1Njb3BlIH0gZnJvbSAnLi9zY29wZS5qcydcbmltcG9ydCB0eXBlIHsgQ29tbWFuZFJlZ2lzdHJ5IH0gZnJvbSAnLi9yZWdpc3RyeS5qcydcbmltcG9ydCB0eXBlIHsgTW9kdWxlUmVnaXN0cnkgfSBmcm9tICdAbW9kdWxlcy90eXBlcy5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29uZmlnIH0gZnJvbSAnQHBhcnNlci9jb25maWcuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcbmltcG9ydCB7IHBhcnNlTEVTIH0gZnJvbSAnQHBhcnNlci9pbmRleC5qcydcblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZWRXaXJpbmcge1xuICBjb21tYW5kczogIEFycmF5PHsgbmFtZTogc3RyaW5nOyBndWFyZDogc3RyaW5nIHwgbnVsbDsgYXJnc1Jhdzogc3RyaW5nOyBib2R5OiBMRVNOb2RlIH0+XG4gIGhhbmRsZXJzOiAgQXJyYXk8eyBldmVudDogc3RyaW5nOyBib2R5OiBMRVNOb2RlIH0+XG4gIHdhdGNoZXJzOiAgQXJyYXk8eyBzaWduYWw6IHN0cmluZzsgd2hlbjogc3RyaW5nIHwgbnVsbDsgYm9keTogTEVTTm9kZSB9PlxuICBsaWZlY3ljbGU6IHtcbiAgICBvbkxvYWQ6ICBMRVNOb2RlW11cbiAgICBvbkVudGVyOiBBcnJheTx7IHdoZW46IHN0cmluZyB8IG51bGw7IGJvZHk6IExFU05vZGUgfT5cbiAgICBvbkV4aXQ6ICBMRVNOb2RlW11cbiAgfVxufVxuXG4vKiogQnVpbGRzIGEgTEVTQ29udGV4dCBmb3IgdGhlIGhvc3QgZWxlbWVudC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENvbnRleHQoXG4gIGhvc3Q6IEVsZW1lbnQsXG4gIGNvbW1hbmRzOiBDb21tYW5kUmVnaXN0cnksXG4gIG1vZHVsZXM6IE1vZHVsZVJlZ2lzdHJ5LFxuICBzaWduYWxzOiB7IGdldDogKGs6IHN0cmluZykgPT4gdW5rbm93bjsgc2V0OiAoazogc3RyaW5nLCB2OiB1bmtub3duKSA9PiB2b2lkIH1cbik6IGltcG9ydCgnLi9leGVjdXRvci5qcycpLkxFU0NvbnRleHQge1xuICBjb25zdCBzY29wZSA9IG5ldyBMRVNTY29wZSgpXG5cbiAgY29uc3QgZW1pdExvY2FsID0gKGV2ZW50OiBzdHJpbmcsIHBheWxvYWQ6IHVua25vd25bXSkgPT4ge1xuICAgIGNvbnNvbGUubG9nKGBbTEVTXSBlbWl0IFwiJHtldmVudH1cImAsIHBheWxvYWQubGVuZ3RoID8gcGF5bG9hZCA6ICcnKVxuICAgIGhvc3QuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoZXZlbnQsIHtcbiAgICAgIGRldGFpbDogeyBwYXlsb2FkIH0sXG4gICAgICBidWJibGVzOiBmYWxzZSxcbiAgICAgIGNvbXBvc2VkOiBmYWxzZSxcbiAgICB9KSlcbiAgfVxuXG4gIGNvbnN0IGJyb2FkY2FzdCA9IChldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHtcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gYnJvYWRjYXN0IFwiJHtldmVudH1cImAsIHBheWxvYWQubGVuZ3RoID8gcGF5bG9hZCA6ICcnKVxuICAgIGhvc3QuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoZXZlbnQsIHtcbiAgICAgIGRldGFpbDogeyBwYXlsb2FkIH0sXG4gICAgICBidWJibGVzOiB0cnVlLFxuICAgICAgY29tcG9zZWQ6IHRydWUsXG4gICAgfSkpXG4gIH1cblxuICByZXR1cm4ge1xuICAgIHNjb3BlLFxuICAgIGhvc3QsXG4gICAgY29tbWFuZHMsXG4gICAgbW9kdWxlcyxcbiAgICBnZXRTaWduYWw6IHNpZ25hbHMuZ2V0LFxuICAgIHNldFNpZ25hbDogc2lnbmFscy5zZXQsXG4gICAgZW1pdExvY2FsLFxuICAgIGJyb2FkY2FzdCxcbiAgfVxufVxuXG4vKipcbiAqIFJlZ2lzdGVycyBhbGwgcGFyc2VkIGNvbW1hbmRzIGludG8gdGhlIHJlZ2lzdHJ5LlxuICogQ2FsbGVkIG9uY2UgZHVyaW5nIF9pbml0LCBiZWZvcmUgYW55IGV2ZW50cyBhcmUgd2lyZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckNvbW1hbmRzKFxuICB3aXJpbmc6IFBhcnNlZFdpcmluZyxcbiAgcmVnaXN0cnk6IENvbW1hbmRSZWdpc3RyeVxuKTogdm9pZCB7XG4gIGZvciAoY29uc3QgY21kIG9mIHdpcmluZy5jb21tYW5kcykge1xuICAgIC8vIFBhcnNlIGFyZ3NSYXcgaW50byBBcmdEZWZbXSAoc2ltcGxpZmllZCBcdTIwMTQgZnVsbCBhcmcgcGFyc2luZyBpbiBQaGFzZSAyIHJlZmluZW1lbnQpXG4gICAgY29uc3QgYXJncyA9IHBhcnNlQXJnc1JhdyhjbWQuYXJnc1JhdylcbiAgICBjb25zdCBkZWY6IGltcG9ydCgnLi9yZWdpc3RyeS5qcycpLkNvbW1hbmREZWYgPSB7XG4gICAgICBuYW1lOiBjbWQubmFtZSxcbiAgICAgIGFyZ3MsXG4gICAgICBib2R5OiBjbWQuYm9keSxcbiAgICAgIGVsZW1lbnQ6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xvY2FsLWNvbW1hbmQnKSxcbiAgICB9XG4gICAgaWYgKGNtZC5ndWFyZCkgZGVmLmd1YXJkID0gY21kLmd1YXJkXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoZGVmKVxuICB9XG4gIGNvbnNvbGUubG9nKGBbTEVTXSByZWdpc3RlcmVkICR7d2lyaW5nLmNvbW1hbmRzLmxlbmd0aH0gY29tbWFuZHNgKVxufVxuXG4vKipcbiAqIEF0dGFjaGVzIGV2ZW50IGxpc3RlbmVycyBvbiB0aGUgaG9zdCBmb3IgYWxsIDxvbi1ldmVudD4gaGFuZGxlcnMuXG4gKiBSZXR1cm5zIGEgY2xlYW51cCBmdW5jdGlvbiB0aGF0IHJlbW92ZXMgYWxsIGxpc3RlbmVycy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpcmVFdmVudEhhbmRsZXJzKFxuICB3aXJpbmc6IFBhcnNlZFdpcmluZyxcbiAgaG9zdDogRWxlbWVudCxcbiAgZ2V0Q3R4OiAoKSA9PiBpbXBvcnQoJy4vZXhlY3V0b3IuanMnKS5MRVNDb250ZXh0XG4pOiAoKSA9PiB2b2lkIHtcbiAgY29uc3QgY2xlYW51cHM6IEFycmF5PCgpID0+IHZvaWQ+ID0gW11cblxuICBmb3IgKGNvbnN0IGhhbmRsZXIgb2Ygd2lyaW5nLmhhbmRsZXJzKSB7XG4gICAgY29uc3QgbGlzdGVuZXIgPSAoZTogRXZlbnQpID0+IHtcbiAgICAgIGNvbnN0IGN0eCA9IGdldEN0eCgpXG4gICAgICAvLyBFeHBvc2UgZXZlbnQgZGV0YWlsIGluIHNjb3BlXG4gICAgICBjb25zdCBoYW5kbGVyU2NvcGUgPSBjdHguc2NvcGUuY2hpbGQoKVxuICAgICAgY29uc3QgZGV0YWlsID0gKGUgYXMgQ3VzdG9tRXZlbnQpLmRldGFpbCA/PyB7fVxuICAgICAgaGFuZGxlclNjb3BlLnNldCgnZXZlbnQnLCBlKVxuICAgICAgaGFuZGxlclNjb3BlLnNldCgncGF5bG9hZCcsIGRldGFpbC5wYXlsb2FkID8/IFtdKVxuICAgICAgY29uc3QgaGFuZGxlckN0eCA9IHsgLi4uY3R4LCBzY29wZTogaGFuZGxlclNjb3BlIH1cblxuICAgICAgZXhlY3V0ZShoYW5kbGVyLmJvZHksIGhhbmRsZXJDdHgpLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFtMRVNdIEVycm9yIGluIGhhbmRsZXIgZm9yIFwiJHtoYW5kbGVyLmV2ZW50fVwiOmAsIGVycilcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgaG9zdC5hZGRFdmVudExpc3RlbmVyKGhhbmRsZXIuZXZlbnQsIGxpc3RlbmVyKVxuICAgIGNsZWFudXBzLnB1c2goKCkgPT4gaG9zdC5yZW1vdmVFdmVudExpc3RlbmVyKGhhbmRsZXIuZXZlbnQsIGxpc3RlbmVyKSlcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gd2lyZWQgZXZlbnQgaGFuZGxlcjogXCIke2hhbmRsZXIuZXZlbnR9XCJgKVxuICB9XG5cbiAgcmV0dXJuICgpID0+IGNsZWFudXBzLmZvckVhY2goZm4gPT4gZm4oKSlcbn1cblxuLyoqXG4gKiBGaXJlcyBhbGwgPG9uLWxvYWQ+IGJvZGllcy5cbiAqIENhbGxlZCBhZnRlciBjb21tYW5kcyBhcmUgcmVnaXN0ZXJlZCBhbmQgZXZlbnQgaGFuZGxlcnMgYXJlIHdpcmVkLFxuICogc28gZW1pdC9jYWxsIHN0YXRlbWVudHMgaW4gb24tbG9hZCBjYW4gcmVhY2ggdGhlaXIgdGFyZ2V0cy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpcmVPbkxvYWQoXG4gIHdpcmluZzogUGFyc2VkV2lyaW5nLFxuICBnZXRDdHg6ICgpID0+IGltcG9ydCgnLi9leGVjdXRvci5qcycpLkxFU0NvbnRleHRcbik6IFByb21pc2U8dm9pZD4ge1xuICBmb3IgKGNvbnN0IGJvZHkgb2Ygd2lyaW5nLmxpZmVjeWNsZS5vbkxvYWQpIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZXhlY3V0ZShib2R5LCBnZXRDdHgoKSlcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tMRVNdIEVycm9yIGluIG9uLWxvYWQ6JywgZXJyKVxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEFyZyBwYXJzaW5nIChzaW1wbGlmaWVkIFx1MjAxNCBmdWxsIHR5cGUtY2hlY2tlZCB2ZXJzaW9uIGluIFBoYXNlIDIgcmVmaW5lbWVudClcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5pbXBvcnQgdHlwZSB7IEFyZ0RlZiB9IGZyb20gJy4vcmVnaXN0cnkuanMnXG5pbXBvcnQgdHlwZSB7IEV4cHJOb2RlIH0gZnJvbSAnQHBhcnNlci9hc3QuanMnXG5cbmZ1bmN0aW9uIHBhcnNlQXJnc1JhdyhyYXc6IHN0cmluZyk6IEFyZ0RlZltdIHtcbiAgaWYgKCFyYXcudHJpbSgpKSByZXR1cm4gW11cbiAgLy8gU3RyaXAgb3V0ZXIgYnJhY2tldHM6IFwiW2Zyb206c3RyICB0bzpzdHIgIGF0dGVtcHQ6aW50PTBdXCIgXHUyMTkyIFwiZnJvbTpzdHIgIHRvOnN0ciAgYXR0ZW1wdDppbnQ9MFwiXG4gIGNvbnN0IGlubmVyID0gcmF3LnJlcGxhY2UoL15cXFt8XFxdJC9nLCAnJykudHJpbSgpXG4gIGlmICghaW5uZXIpIHJldHVybiBbXVxuXG4gIHJldHVybiBpbm5lci5zcGxpdCgvXFxzezIsfXxcXHMoPz1cXHcrOikvKS5tYXAocyA9PiBzLnRyaW0oKSkuZmlsdGVyKEJvb2xlYW4pLm1hcChwYXJ0ID0+IHtcbiAgICAvLyBgbmFtZTp0eXBlPWRlZmF1bHRgIG9yIGBuYW1lOnR5cGVgXG4gICAgY29uc3QgZXFJZHggPSBwYXJ0LmluZGV4T2YoJz0nKVxuICAgIGNvbnN0IGNvbG9uSWR4ID0gcGFydC5pbmRleE9mKCc6JylcbiAgICBpZiAoY29sb25JZHggPT09IC0xKSByZXR1cm4geyBuYW1lOiBwYXJ0LCB0eXBlOiAnZHluJyB9XG5cbiAgICBjb25zdCBuYW1lID0gcGFydC5zbGljZSgwLCBjb2xvbklkeCkudHJpbSgpXG4gICAgY29uc3QgcmVzdCA9IHBhcnQuc2xpY2UoY29sb25JZHggKyAxKVxuXG4gICAgaWYgKGVxSWR4ID09PSAtMSkge1xuICAgICAgcmV0dXJuIHsgbmFtZSwgdHlwZTogcmVzdC50cmltKCkgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0eXBlID0gcGFydC5zbGljZShjb2xvbklkeCArIDEsIGVxSWR4KS50cmltKClcbiAgICAgIGNvbnN0IGRlZmF1bHRSYXcgPSBwYXJ0LnNsaWNlKGVxSWR4ICsgMSkudHJpbSgpXG4gICAgICBjb25zdCBkZWZhdWx0RXhwcjogRXhwck5vZGUgPSB7IHR5cGU6ICdleHByJywgcmF3OiBkZWZhdWx0UmF3IH1cbiAgICAgIHJldHVybiB7IG5hbWUsIHR5cGUsIGRlZmF1bHQ6IGRlZmF1bHRFeHByIH1cbiAgICB9XG4gIH0pXG59XG4iLCAiLyoqXG4gKiBMRVNTY29wZSBcdTIwMTQgYSBzaW1wbGUgbGV4aWNhbGx5LXNjb3BlZCB2YXJpYWJsZSBzdG9yZS5cbiAqXG4gKiBFYWNoIGNvbW1hbmQgaW52b2NhdGlvbiBnZXRzIGEgZnJlc2ggY2hpbGQgc2NvcGUuXG4gKiBNYXRjaCBhcm0gYmluZGluZ3MgYWxzbyBjcmVhdGUgYSBjaGlsZCBzY29wZSBsaW1pdGVkIHRvIHRoYXQgYXJtJ3MgYm9keS5cbiAqIFNpZ25hbCByZWFkcy93cml0ZXMgZ28gdGhyb3VnaCB0aGUgRGF0YXN0YXIgYnJpZGdlLCBub3QgdGhpcyBzY29wZS5cbiAqL1xuZXhwb3J0IGNsYXNzIExFU1Njb3BlIHtcbiAgcHJpdmF0ZSBsb2NhbHMgPSBuZXcgTWFwPHN0cmluZywgdW5rbm93bj4oKVxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGFyZW50PzogTEVTU2NvcGUpIHt9XG5cbiAgZ2V0KG5hbWU6IHN0cmluZyk6IHVua25vd24ge1xuICAgIGlmICh0aGlzLmxvY2Fscy5oYXMobmFtZSkpIHJldHVybiB0aGlzLmxvY2Fscy5nZXQobmFtZSlcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQ/LmdldChuYW1lKVxuICB9XG5cbiAgc2V0KG5hbWU6IHN0cmluZywgdmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICB0aGlzLmxvY2Fscy5zZXQobmFtZSwgdmFsdWUpXG4gIH1cblxuICBoYXMobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMubG9jYWxzLmhhcyhuYW1lKSB8fCAodGhpcy5wYXJlbnQ/LmhhcyhuYW1lKSA/PyBmYWxzZSlcbiAgfVxuXG4gIC8qKiBDcmVhdGUgYSBjaGlsZCBzY29wZSBpbmhlcml0aW5nIGFsbCBsb2NhbHMgZnJvbSB0aGlzIG9uZS4gKi9cbiAgY2hpbGQoKTogTEVTU2NvcGUge1xuICAgIHJldHVybiBuZXcgTEVTU2NvcGUodGhpcylcbiAgfVxuXG4gIC8qKiBTbmFwc2hvdCBhbGwgbG9jYWxzIChmb3IgZGVidWdnaW5nIC8gZXJyb3IgbWVzc2FnZXMpLiAqL1xuICBzbmFwc2hvdCgpOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XG4gICAgY29uc3QgYmFzZSA9IHRoaXMucGFyZW50Py5zbmFwc2hvdCgpID8/IHt9XG4gICAgZm9yIChjb25zdCBbaywgdl0gb2YgdGhpcy5sb2NhbHMpIGJhc2Vba10gPSB2XG4gICAgcmV0dXJuIGJhc2VcbiAgfVxufVxuIiwgIi8qKlxuICogUGhhc2UgNWE6IEludGVyc2VjdGlvbk9ic2VydmVyIHdpcmluZ1xuICpcbiAqIE9uZSBzaGFyZWQgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgaXMgY3JlYXRlZCBwZXIgPGxvY2FsLWV2ZW50LXNjcmlwdD4gaG9zdC5cbiAqIEl0IHdhdGNoZXMgdGhlIGhvc3QgZWxlbWVudCBpdHNlbGYgKG5vdCBpdHMgY2hpbGRyZW4pLlxuICpcbiAqIG9uLWVudGVyOiBmaXJlcyB3aGVuIHRoZSBob3N0IGNyb3NzZXMgaW50byB0aGUgdmlld3BvcnRcbiAqICAgLSBFYWNoIDxvbi1lbnRlcj4gaGFzIGFuIG9wdGlvbmFsIGB3aGVuYCBndWFyZCBldmFsdWF0ZWQgYXQgZmlyZSB0aW1lXG4gKiAgIC0gTXVsdGlwbGUgPG9uLWVudGVyPiBjaGlsZHJlbiBhcmUgYWxsIGNoZWNrZWQgaW4gZGVjbGFyYXRpb24gb3JkZXJcbiAqXG4gKiBvbi1leGl0OiBmaXJlcyB3aGVuIHRoZSBob3N0IGxlYXZlcyB0aGUgdmlld3BvcnRcbiAqICAgLSBBbHdheXMgZmlyZXMgdW5jb25kaXRpb25hbGx5IChubyBgd2hlbmAgZ3VhcmQgb24gb24tZXhpdClcbiAqICAgLSBNdWx0aXBsZSA8b24tZXhpdD4gY2hpbGRyZW4gYWxsIGZpcmVcbiAqXG4gKiBUaGUgb2JzZXJ2ZXIgaXMgZGlzY29ubmVjdGVkIGluIGRpc2Nvbm5lY3RlZENhbGxiYWNrIHZpYSB0aGUgcmV0dXJuZWQgY2xlYW51cCBmbi5cbiAqL1xuXG5pbXBvcnQgeyBleGVjdXRlLCBldmFsRXhwciB9IGZyb20gJy4vZXhlY3V0b3IuanMnXG5pbXBvcnQgdHlwZSB7IExFU0NvbnRleHQgfSBmcm9tICcuL2V4ZWN1dG9yLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNOb2RlIH0gZnJvbSAnQHBhcnNlci9hc3QuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgT25FbnRlckRlY2wge1xuICB3aGVuOiBzdHJpbmcgfCBudWxsXG4gIGJvZHk6IExFU05vZGVcbn1cblxuLyoqXG4gKiBBdHRhY2hlcyBhbiBJbnRlcnNlY3Rpb25PYnNlcnZlciB0byB0aGUgaG9zdCBlbGVtZW50LlxuICpcbiAqIEByZXR1cm5zIEEgY2xlYW51cCBmdW5jdGlvbiB0aGF0IGRpc2Nvbm5lY3RzIHRoZSBvYnNlcnZlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpcmVJbnRlcnNlY3Rpb25PYnNlcnZlcihcbiAgaG9zdDogRWxlbWVudCxcbiAgb25FbnRlcjogT25FbnRlckRlY2xbXSxcbiAgb25FeGl0OiBMRVNOb2RlW10sXG4gIGdldEN0eDogKCkgPT4gTEVTQ29udGV4dCxcbik6ICgpID0+IHZvaWQge1xuICBpZiAob25FbnRlci5sZW5ndGggPT09IDAgJiYgb25FeGl0Lmxlbmd0aCA9PT0gMCkge1xuICAgIC8vIE5vdGhpbmcgdG8gb2JzZXJ2ZSBcdTIwMTQgc2tpcCBjcmVhdGluZyB0aGUgSU8gZW50aXJlbHlcbiAgICByZXR1cm4gKCkgPT4ge31cbiAgfVxuXG4gIGxldCB3YXNJbnRlcnNlY3Rpbmc6IGJvb2xlYW4gfCBudWxsID0gbnVsbFxuXG4gIGNvbnN0IG9ic2VydmVyID0gbmV3IEludGVyc2VjdGlvbk9ic2VydmVyKFxuICAgIChlbnRyaWVzKSA9PiB7XG4gICAgICAvLyBJTyBmaXJlcyBvbmNlIGltbWVkaWF0ZWx5IG9uIGF0dGFjaCB3aXRoIHRoZSBjdXJyZW50IHN0YXRlLlxuICAgICAgLy8gV2UgdHJhY2sgYHdhc0ludGVyc2VjdGluZ2AgdG8gYXZvaWQgc3B1cmlvdXMgb24tZXhpdCBvbiBmaXJzdCB0aWNrLlxuICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgICAgIGNvbnN0IG5vd0ludGVyc2VjdGluZyA9IGVudHJ5LmlzSW50ZXJzZWN0aW5nXG5cbiAgICAgICAgaWYgKG5vd0ludGVyc2VjdGluZyAmJiB3YXNJbnRlcnNlY3RpbmcgIT09IHRydWUpIHtcbiAgICAgICAgICAvLyBFbnRlcmVkIHZpZXdwb3J0XG4gICAgICAgICAgd2FzSW50ZXJzZWN0aW5nID0gdHJ1ZVxuICAgICAgICAgIGhhbmRsZUVudGVyKG9uRW50ZXIsIGdldEN0eClcbiAgICAgICAgfSBlbHNlIGlmICghbm93SW50ZXJzZWN0aW5nICYmIHdhc0ludGVyc2VjdGluZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgIC8vIEV4aXRlZCB2aWV3cG9ydCAob25seSBhZnRlciB3ZSd2ZSBiZWVuIGluIGl0KVxuICAgICAgICAgIHdhc0ludGVyc2VjdGluZyA9IGZhbHNlXG4gICAgICAgICAgaGFuZGxlRXhpdChvbkV4aXQsIGdldEN0eClcbiAgICAgICAgfSBlbHNlIGlmICh3YXNJbnRlcnNlY3RpbmcgPT09IG51bGwpIHtcbiAgICAgICAgICAvLyBGaXJzdCB0aWNrIFx1MjAxNCByZWNvcmQgc3RhdGUgYnV0IGRvbid0IGZpcmUgZXhpdCBmb3IgaW5pdGlhbGx5LW9mZi1zY3JlZW5cbiAgICAgICAgICB3YXNJbnRlcnNlY3RpbmcgPSBub3dJbnRlcnNlY3RpbmdcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgLy8gRGVmYXVsdCB0aHJlc2hvbGQ6IGZpcmUgd2hlbiBhbnkgcGl4ZWwgb2YgdGhlIGhvc3QgZW50ZXJzL2V4aXRzXG4gICAgICB0aHJlc2hvbGQ6IDAsXG4gICAgfVxuICApXG5cbiAgb2JzZXJ2ZXIub2JzZXJ2ZShob3N0KVxuICBjb25zb2xlLmxvZygnW0xFU10gSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgYXR0YWNoZWQnLCAoaG9zdCBhcyBIVE1MRWxlbWVudCkuaWQgfHwgaG9zdC50YWdOYW1lKVxuXG4gIHJldHVybiAoKSA9PiB7XG4gICAgb2JzZXJ2ZXIuZGlzY29ubmVjdCgpXG4gICAgY29uc29sZS5sb2coJ1tMRVNdIEludGVyc2VjdGlvbk9ic2VydmVyIGRpc2Nvbm5lY3RlZCcpXG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRW50ZXIoZGVjbHM6IE9uRW50ZXJEZWNsW10sIGdldEN0eDogKCkgPT4gTEVTQ29udGV4dCk6IHZvaWQge1xuICBjb25zdCBjdHggPSBnZXRDdHgoKVxuXG4gIGZvciAoY29uc3QgZGVjbCBvZiBkZWNscykge1xuICAgIC8vIEV2YWx1YXRlIGB3aGVuYCBndWFyZCBcdTIwMTQgaWYgYWJzZW50LCBhbHdheXMgZmlyZXNcbiAgICBpZiAoZGVjbC53aGVuKSB7XG4gICAgICBjb25zdCBwYXNzZXMgPSBCb29sZWFuKGV2YWxFeHByKHsgdHlwZTogJ2V4cHInLCByYXc6IGRlY2wud2hlbiB9LCBjdHgpKVxuICAgICAgaWYgKCFwYXNzZXMpIHtcbiAgICAgICAgY29uc29sZS5sb2coYFtMRVNdIG9uLWVudGVyIGd1YXJkIHJlamVjdGVkOiAke2RlY2wud2hlbn1gKVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgIH1cblxuICAgIGV4ZWN1dGUoZGVjbC5ib2R5LCBjdHgpLmNhdGNoKGVyciA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbTEVTXSBFcnJvciBpbiBvbi1lbnRlcjonLCBlcnIpXG4gICAgfSlcbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVFeGl0KGJvZGllczogTEVTTm9kZVtdLCBnZXRDdHg6ICgpID0+IExFU0NvbnRleHQpOiB2b2lkIHtcbiAgY29uc3QgY3R4ID0gZ2V0Q3R4KClcblxuICBmb3IgKGNvbnN0IGJvZHkgb2YgYm9kaWVzKSB7XG4gICAgZXhlY3V0ZShib2R5LCBjdHgpLmNhdGNoKGVyciA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbTEVTXSBFcnJvciBpbiBvbi1leGl0OicsIGVycilcbiAgICB9KVxuICB9XG59XG4iLCAiLyoqXG4gKiBQaGFzZSA1YjogU2lnbmFsIHdhdGNoZXIgd2lyaW5nXG4gKlxuICogPG9uLXNpZ25hbD4gcmVhY3RzIHdoZW5ldmVyIGEgbmFtZWQgRGF0YXN0YXIgc2lnbmFsIGNoYW5nZXMuXG4gKiBUaGUgYHdoZW5gIGd1YXJkIGlzIHJlLWV2YWx1YXRlZCBvbiBldmVyeSBjaGFuZ2UgXHUyMDE0IGlmIGZhbHN5LCB0aGVcbiAqIGhhbmRsZSBib2R5IGRvZXMgbm90IHJ1biAobm90IGFuIGVycm9yLCBqdXN0IGZpbHRlcmVkIG91dCkuXG4gKlxuICogSW4gUGhhc2UgNSB3ZSB1c2UgYSBzaW1wbGUgbG9jYWwgbm90aWZpY2F0aW9uIHBhdGg6IHdoZW5ldmVyXG4gKiBMb2NhbEV2ZW50U2NyaXB0Ll9zZXRTaWduYWwoKSB3cml0ZXMgYSB2YWx1ZSwgaXQgY2FsbHMgaW50b1xuICogbm90aWZ5U2lnbmFsV2F0Y2hlcnMoKS4gVGhpcyBoYW5kbGVzIHRoZSBmYWxsYmFjayAobm8gRGF0YXN0YXIpIGNhc2UuXG4gKlxuICogUGhhc2UgNiByZXBsYWNlcyB0aGUgbm90aWZpY2F0aW9uIHBhdGggd2l0aCBEYXRhc3RhcidzIGVmZmVjdCgpIHN5c3RlbSxcbiAqIHdoaWNoIGlzIG1vcmUgZWZmaWNpZW50IChiYXRjaGVkLCBkZWR1cGVkLCByZWFjdGl2ZSBncmFwaC1hd2FyZSkuXG4gKlxuICogVGhlIHdhdGNoZXIgZmlyZXMgdGhlIGJvZHkgYXN5bmNocm9ub3VzbHkgKG5vbi1ibG9ja2luZykgdG8gbWF0Y2hcbiAqIHRoZSBiZWhhdmlvdXIgb2YgRGF0YXN0YXIncyByZWFjdGl2ZSBlZmZlY3RzLlxuICovXG5cbmltcG9ydCB7IGV4ZWN1dGUsIGV2YWxFeHByIH0gZnJvbSAnLi9leGVjdXRvci5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29udGV4dCB9IGZyb20gJy4vZXhlY3V0b3IuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuZXhwb3J0IGludGVyZmFjZSBTaWduYWxXYXRjaGVyRGVjbCB7XG4gIC8qKiBTaWduYWwgbmFtZSB3aXRoICQgcHJlZml4OiBcIiRmZWVkU3RhdGVcIiAqL1xuICBzaWduYWw6IHN0cmluZ1xuICAvKiogT3B0aW9uYWwgZ3VhcmQgZXhwcmVzc2lvbiBcdTIwMTQgbnVsbCBtZWFucyBhbHdheXMgZmlyZXMgKi9cbiAgd2hlbjogc3RyaW5nIHwgbnVsbFxuICBib2R5OiBMRVNOb2RlXG59XG5cbi8qKlxuICogQ2hlY2tzIGFsbCBzaWduYWwgd2F0Y2hlcnMgdG8gc2VlIGlmIGFueSBzaG91bGQgZmlyZSBmb3IgdGhlXG4gKiBnaXZlbiBzaWduYWwgbmFtZSBjaGFuZ2UuXG4gKlxuICogQ2FsbGVkIGZyb20gTG9jYWxFdmVudFNjcmlwdC5fc2V0U2lnbmFsKCkgYWZ0ZXIgZXZlcnkgd3JpdGUuXG4gKiBBbHNvIGNhbGxlZCBmcm9tIFBoYXNlIDYgRGF0YXN0YXIgZWZmZWN0KCkgc3Vic2NyaXB0aW9ucy5cbiAqXG4gKiBAcGFyYW0gY2hhbmdlZFNpZ25hbCAgVGhlIHNpZ25hbCBuYW1lICp3aXRob3V0KiB0aGUgJCBwcmVmaXhcbiAqIEBwYXJhbSB3YXRjaGVycyAgICAgICBBbGwgb24tc2lnbmFsIGRlY2xhcmF0aW9ucyBmb3IgdGhpcyBMRVMgaW5zdGFuY2VcbiAqIEBwYXJhbSBnZXRDdHggICAgICAgICBSZXR1cm5zIHRoZSBjdXJyZW50IGV4ZWN1dGlvbiBjb250ZXh0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RpZnlTaWduYWxXYXRjaGVycyhcbiAgY2hhbmdlZFNpZ25hbDogc3RyaW5nLFxuICB3YXRjaGVyczogU2lnbmFsV2F0Y2hlckRlY2xbXSxcbiAgZ2V0Q3R4OiAoKSA9PiBMRVNDb250ZXh0XG4pOiB2b2lkIHtcbiAgZm9yIChjb25zdCB3YXRjaGVyIG9mIHdhdGNoZXJzKSB7XG4gICAgLy8gTm9ybWFsaXplOiBzdHJpcCBsZWFkaW5nICQgZm9yIGNvbXBhcmlzb25cbiAgICBjb25zdCB3YXRjaGVkS2V5ID0gd2F0Y2hlci5zaWduYWwucmVwbGFjZSgvXlxcJC8sICcnKVxuXG4gICAgaWYgKHdhdGNoZWRLZXkgIT09IGNoYW5nZWRTaWduYWwpIGNvbnRpbnVlXG5cbiAgICBjb25zdCBjdHggPSBnZXRDdHgoKVxuXG4gICAgLy8gRXZhbHVhdGUgYHdoZW5gIGd1YXJkXG4gICAgaWYgKHdhdGNoZXIud2hlbikge1xuICAgICAgY29uc3QgcGFzc2VzID0gQm9vbGVhbihldmFsRXhwcih7IHR5cGU6ICdleHByJywgcmF3OiB3YXRjaGVyLndoZW4gfSwgY3R4KSlcbiAgICAgIGlmICghcGFzc2VzKSBjb250aW51ZVxuICAgIH1cblxuICAgIC8vIEZpcmUgdGhlIGJvZHkgYXN5bmNocm9ub3VzbHkgXHUyMDE0IGRvbid0IGJsb2NrIHRoZSBzaWduYWwgd3JpdGUgcGF0aFxuICAgIGV4ZWN1dGUod2F0Y2hlci5ib2R5LCBjdHgpLmNhdGNoKGVyciA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKGBbTEVTXSBFcnJvciBpbiBvbi1zaWduYWwgXCIke3dhdGNoZXIuc2lnbmFsfVwiOmAsIGVycilcbiAgICB9KVxuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIERhdGFzdGFyLWNvbXBhdGlibGUgZWZmZWN0IHN1YnNjcmlwdGlvbiBmb3Igb25lIHNpZ25hbCB3YXRjaGVyLlxuICogVXNlZCBpbiBQaGFzZSA2IHdoZW4gRGF0YXN0YXIgaXMgcHJlc2VudC5cbiAqXG4gKiBAcGFyYW0gd2F0Y2hlciAgIFRoZSBvbi1zaWduYWwgZGVjbGFyYXRpb25cbiAqIEBwYXJhbSBlZmZlY3QgICAgRGF0YXN0YXIncyBlZmZlY3QoKSBmdW5jdGlvblxuICogQHBhcmFtIGdldEN0eCAgICBSZXR1cm5zIHRoZSBjdXJyZW50IGV4ZWN1dGlvbiBjb250ZXh0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXJlU2lnbmFsV2F0Y2hlclZpYURhdGFzdGFyKFxuICB3YXRjaGVyOiBTaWduYWxXYXRjaGVyRGVjbCxcbiAgZWZmZWN0OiAoZm46ICgpID0+IHZvaWQpID0+IHZvaWQsXG4gIGdldEN0eDogKCkgPT4gTEVTQ29udGV4dFxuKTogdm9pZCB7XG4gIGVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgY3R4ID0gZ2V0Q3R4KClcblxuICAgIC8vIFJlYWRpbmcgdGhlIHNpZ25hbCBpbnNpZGUgYW4gZWZmZWN0KCkgYXV0by1zdWJzY3JpYmVzIHVzIHRvIGl0XG4gICAgY29uc3Qgc2lnbmFsS2V5ID0gd2F0Y2hlci5zaWduYWwucmVwbGFjZSgvXlxcJC8sICcnKVxuICAgIGN0eC5nZXRTaWduYWwoc2lnbmFsS2V5KSAvLyBzdWJzY3JpcHRpb24gc2lkZS1lZmZlY3RcblxuICAgIGlmICh3YXRjaGVyLndoZW4pIHtcbiAgICAgIGNvbnN0IHBhc3NlcyA9IEJvb2xlYW4oZXZhbEV4cHIoeyB0eXBlOiAnZXhwcicsIHJhdzogd2F0Y2hlci53aGVuIH0sIGN0eCkpXG4gICAgICBpZiAoIXBhc3NlcykgcmV0dXJuXG4gICAgfVxuXG4gICAgZXhlY3V0ZSh3YXRjaGVyLmJvZHksIGN0eCkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFtMRVNdIEVycm9yIGluIG9uLXNpZ25hbCBcIiR7d2F0Y2hlci5zaWduYWx9XCIgKERhdGFzdGFyKTpgLCBlcnIpXG4gICAgfSlcbiAgfSlcbn1cbiIsICJpbXBvcnQgeyBDb21tYW5kUmVnaXN0cnkgfSBmcm9tICdAcnVudGltZS9yZWdpc3RyeS5qcydcbmltcG9ydCB7IE1vZHVsZVJlZ2lzdHJ5LCBsb2FkTW9kdWxlIH0gZnJvbSAnQG1vZHVsZXMvdHlwZXMuanMnXG5pbXBvcnQgeyByZWFkQ29uZmlnLCBsb2dDb25maWcgfSBmcm9tICdAcGFyc2VyL3JlYWRlci5qcydcbmltcG9ydCB7IHBhcnNlTEVTIH0gZnJvbSAnQHBhcnNlci9pbmRleC5qcydcbmltcG9ydCB7IGJ1aWxkQ29udGV4dCwgcmVnaXN0ZXJDb21tYW5kcywgd2lyZUV2ZW50SGFuZGxlcnMsIGZpcmVPbkxvYWQsIHR5cGUgUGFyc2VkV2lyaW5nIH0gZnJvbSAnQHJ1bnRpbWUvd2lyaW5nLmpzJ1xuaW1wb3J0IHsgd2lyZUludGVyc2VjdGlvbk9ic2VydmVyIH0gZnJvbSAnQHJ1bnRpbWUvb2JzZXJ2ZXIuanMnXG5pbXBvcnQgeyBub3RpZnlTaWduYWxXYXRjaGVycywgd2lyZVNpZ25hbFdhdGNoZXJWaWFEYXRhc3RhciB9IGZyb20gJ0BydW50aW1lL3NpZ25hbHMuanMnXG5pbXBvcnQgdHlwZSB7IExFU0NvbmZpZyB9IGZyb20gJ0BwYXJzZXIvY29uZmlnLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNOb2RlIH0gZnJvbSAnQHBhcnNlci9hc3QuanMnXG5pbXBvcnQgdHlwZSB7IExFU0NvbnRleHQgfSBmcm9tICdAcnVudGltZS9leGVjdXRvci5qcydcblxuZXhwb3J0IGNsYXNzIExvY2FsRXZlbnRTY3JpcHQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIHJlYWRvbmx5IGNvbW1hbmRzID0gbmV3IENvbW1hbmRSZWdpc3RyeSgpXG4gIHJlYWRvbmx5IG1vZHVsZXMgID0gbmV3IE1vZHVsZVJlZ2lzdHJ5KClcblxuICBwcml2YXRlIF9jb25maWc6ICBMRVNDb25maWcgfCBudWxsICA9IG51bGxcbiAgcHJpdmF0ZSBfd2lyaW5nOiAgUGFyc2VkV2lyaW5nIHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBfY3R4OiAgICAgTEVTQ29udGV4dCB8IG51bGwgPSBudWxsXG5cbiAgLy8gQ2xlYW51cCBmbnMgYWNjdW11bGF0ZWQgZHVyaW5nIF9pbml0IFx1MjAxNCBhbGwgY2FsbGVkIGluIF90ZWFyZG93blxuICBwcml2YXRlIF9jbGVhbnVwczogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXVxuXG4gIC8vIFNpbXBsZSBmYWxsYmFjayBzaWduYWwgc3RvcmUgKERhdGFzdGFyIGJyaWRnZSByZXBsYWNlcyByZWFkcy93cml0ZXMgaW4gUGhhc2UgNilcbiAgcHJpdmF0ZSBfc2lnbmFsczogTWFwPHN0cmluZywgdW5rbm93bj4gPSBuZXcgTWFwKClcblxuICAvLyBEYXRhc3RhciBicmlkZ2UgKHBvcHVsYXRlZCBpbiBQaGFzZSA2IHZpYSBhdHRyaWJ1dGUgcGx1Z2luKVxuICBwcml2YXRlIF9kc0VmZmVjdDogKChmbjogKCkgPT4gdm9pZCkgPT4gdm9pZCkgfCB1bmRlZmluZWQgPSB1bmRlZmluZWRcbiAgcHJpdmF0ZSBfZHNTaWduYWw6ICg8VD4obmFtZTogc3RyaW5nLCBpbml0PzogVCkgPT4geyB2YWx1ZTogVCB9KSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZFxuXG4gIGdldCBjb25maWcoKTogIExFU0NvbmZpZyB8IG51bGwgICAgeyByZXR1cm4gdGhpcy5fY29uZmlnIH1cbiAgZ2V0IHdpcmluZygpOiAgUGFyc2VkV2lyaW5nIHwgbnVsbCB7IHJldHVybiB0aGlzLl93aXJpbmcgfVxuICBnZXQgY29udGV4dCgpOiBMRVNDb250ZXh0IHwgbnVsbCAgIHsgcmV0dXJuIHRoaXMuX2N0eCB9XG5cbiAgc3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMoKTogc3RyaW5nW10geyByZXR1cm4gW10gfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIHF1ZXVlTWljcm90YXNrKCgpID0+IHRoaXMuX2luaXQoKSlcbiAgfVxuXG4gIGRpc2Nvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIHRoaXMuX3RlYXJkb3duKClcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBJbnRlcm5hbCBsaWZlY3ljbGUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBhc3luYyBfaW5pdCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPGxvY2FsLWV2ZW50LXNjcmlwdD4gaW5pdGlhbGl6aW5nJywgdGhpcy5pZCB8fCAnKG5vIGlkKScpXG5cbiAgICAvLyBQaGFzZSAxOiBET00gXHUyMTkyIGNvbmZpZ1xuICAgIHRoaXMuX2NvbmZpZyA9IHJlYWRDb25maWcodGhpcylcbiAgICBsb2dDb25maWcodGhpcy5fY29uZmlnKVxuXG4gICAgLy8gUGhhc2UgODogbG9hZCBtb2R1bGVzIGJlZm9yZSBwYXJzaW5nIHNvIHByaW1pdGl2ZSBuYW1lcyByZXNvbHZlXG4gICAgYXdhaXQgdGhpcy5fbG9hZE1vZHVsZXModGhpcy5fY29uZmlnKVxuXG4gICAgLy8gUGhhc2UgMjogcGFyc2UgYm9keSBzdHJpbmdzIFx1MjE5MiBBU1RcbiAgICB0aGlzLl93aXJpbmcgPSB0aGlzLl9wYXJzZUFsbCh0aGlzLl9jb25maWcpXG5cbiAgICAvLyBQaGFzZSA0OiBidWlsZCBjb250ZXh0LCByZWdpc3RlciBjb21tYW5kcywgd2lyZSBldmVudCBoYW5kbGVyc1xuICAgIHRoaXMuX2N0eCA9IGJ1aWxkQ29udGV4dChcbiAgICAgIHRoaXMsXG4gICAgICB0aGlzLmNvbW1hbmRzLFxuICAgICAgdGhpcy5tb2R1bGVzLFxuICAgICAgeyBnZXQ6IGsgPT4gdGhpcy5fZ2V0U2lnbmFsKGspLCBzZXQ6IChrLCB2KSA9PiB0aGlzLl9zZXRTaWduYWwoaywgdikgfVxuICAgIClcblxuICAgIHJlZ2lzdGVyQ29tbWFuZHModGhpcy5fd2lyaW5nLCB0aGlzLmNvbW1hbmRzKVxuXG4gICAgdGhpcy5fY2xlYW51cHMucHVzaChcbiAgICAgIHdpcmVFdmVudEhhbmRsZXJzKHRoaXMuX3dpcmluZywgdGhpcywgKCkgPT4gdGhpcy5fY3R4ISlcbiAgICApXG5cbiAgICAvLyBQaGFzZSA1YTogSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgZm9yIG9uLWVudGVyIC8gb24tZXhpdFxuICAgIHRoaXMuX2NsZWFudXBzLnB1c2goXG4gICAgICB3aXJlSW50ZXJzZWN0aW9uT2JzZXJ2ZXIoXG4gICAgICAgIHRoaXMsXG4gICAgICAgIHRoaXMuX3dpcmluZy5saWZlY3ljbGUub25FbnRlcixcbiAgICAgICAgdGhpcy5fd2lyaW5nLmxpZmVjeWNsZS5vbkV4aXQsXG4gICAgICAgICgpID0+IHRoaXMuX2N0eCFcbiAgICAgIClcbiAgICApXG5cbiAgICAvLyBQaGFzZSA1Yjogc2lnbmFsIHdhdGNoZXJzXG4gICAgLy8gSWYgRGF0YXN0YXIgaXMgY29ubmVjdGVkIHVzZSBpdHMgcmVhY3RpdmUgZWZmZWN0KCkgc3lzdGVtO1xuICAgIC8vIG90aGVyd2lzZSB0aGUgbG9jYWwgX3NldFNpZ25hbCBwYXRoIGNhbGxzIG5vdGlmeVNpZ25hbFdhdGNoZXJzIGRpcmVjdGx5LlxuICAgIGlmICh0aGlzLl9kc0VmZmVjdCkge1xuICAgICAgZm9yIChjb25zdCB3YXRjaGVyIG9mIHRoaXMuX3dpcmluZy53YXRjaGVycykge1xuICAgICAgICB3aXJlU2lnbmFsV2F0Y2hlclZpYURhdGFzdGFyKHdhdGNoZXIsIHRoaXMuX2RzRWZmZWN0LCAoKSA9PiB0aGlzLl9jdHghKVxuICAgICAgfVxuICAgICAgY29uc29sZS5sb2coYFtMRVNdIHdpcmVkICR7dGhpcy5fd2lyaW5nLndhdGNoZXJzLmxlbmd0aH0gc2lnbmFsIHdhdGNoZXJzIHZpYSBEYXRhc3RhcmApXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSB3aXJlZCAke3RoaXMuX3dpcmluZy53YXRjaGVycy5sZW5ndGh9IHNpZ25hbCB3YXRjaGVycyAobG9jYWwgZmFsbGJhY2spYClcbiAgICB9XG5cbiAgICAvLyBQaGFzZSA2OiBEYXRhc3RhciBicmlkZ2UgZnVsbCBhY3RpdmF0aW9uIFx1MjAxNCBjb21pbmcgbmV4dFxuXG4gICAgLy8gb24tbG9hZCBmaXJlcyBsYXN0LCBhZnRlciBldmVyeXRoaW5nIGlzIHdpcmVkXG4gICAgYXdhaXQgZmlyZU9uTG9hZCh0aGlzLl93aXJpbmcsICgpID0+IHRoaXMuX2N0eCEpXG5cbiAgICBjb25zb2xlLmxvZygnW0xFU10gcmVhZHk6JywgdGhpcy5pZCB8fCAnKG5vIGlkKScpXG4gIH1cblxuICBwcml2YXRlIF90ZWFyZG93bigpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPGxvY2FsLWV2ZW50LXNjcmlwdD4gZGlzY29ubmVjdGVkJywgdGhpcy5pZCB8fCAnKG5vIGlkKScpXG4gICAgZm9yIChjb25zdCBjbGVhbnVwIG9mIHRoaXMuX2NsZWFudXBzKSBjbGVhbnVwKClcbiAgICB0aGlzLl9jbGVhbnVwcyA9IFtdXG4gICAgdGhpcy5fY29uZmlnICAgPSBudWxsXG4gICAgdGhpcy5fd2lyaW5nICAgPSBudWxsXG4gICAgdGhpcy5fY3R4ICAgICAgPSBudWxsXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgU2lnbmFsIHN0b3JlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgX2dldFNpZ25hbChuYW1lOiBzdHJpbmcpOiB1bmtub3duIHtcbiAgICAvLyBQaGFzZSA2OiBwcmVmZXIgRGF0YXN0YXIgc2lnbmFsIHRyZWUgd2hlbiBicmlkZ2UgaXMgY29ubmVjdGVkXG4gICAgaWYgKHRoaXMuX2RzU2lnbmFsKSB7XG4gICAgICB0cnkgeyByZXR1cm4gdGhpcy5fZHNTaWduYWwobmFtZSkudmFsdWUgfSBjYXRjaCB7IC8qIGZhbGwgdGhyb3VnaCAqLyB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9zaWduYWxzLmdldChuYW1lKVxuICB9XG5cbiAgcHJpdmF0ZSBfc2V0U2lnbmFsKG5hbWU6IHN0cmluZywgdmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICBjb25zdCBwcmV2ID0gdGhpcy5fc2lnbmFscy5nZXQobmFtZSlcbiAgICB0aGlzLl9zaWduYWxzLnNldChuYW1lLCB2YWx1ZSlcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gJCR7bmFtZX0gPWAsIHZhbHVlKVxuXG4gICAgLy8gUGhhc2UgNjogd3JpdGUgdGhyb3VnaCB0byBEYXRhc3RhcidzIHJlYWN0aXZlIGdyYXBoXG4gICAgaWYgKHRoaXMuX2RzU2lnbmFsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBzaWcgPSB0aGlzLl9kc1NpZ25hbDx1bmtub3duPihuYW1lLCB2YWx1ZSlcbiAgICAgICAgc2lnLnZhbHVlID0gdmFsdWVcbiAgICAgIH0gY2F0Y2ggeyAvKiBzaWduYWwgbWF5IG5vdCBleGlzdCBpbiBEYXRhc3RhciB5ZXQgKi8gfVxuICAgIH1cblxuICAgIC8vIFBoYXNlIDViOiBub3RpZnkgbG9jYWwgc2lnbmFsIHdhdGNoZXJzIChmYWxsYmFjayBwYXRoIHdoZW4gRGF0YXN0YXIgYWJzZW50KVxuICAgIGlmIChwcmV2ICE9PSB2YWx1ZSAmJiB0aGlzLl93aXJpbmcgJiYgdGhpcy5fY3R4ICYmICF0aGlzLl9kc0VmZmVjdCkge1xuICAgICAgbm90aWZ5U2lnbmFsV2F0Y2hlcnMobmFtZSwgdGhpcy5fd2lyaW5nLndhdGNoZXJzLCAoKSA9PiB0aGlzLl9jdHghKVxuICAgIH1cbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBNb2R1bGUgbG9hZGluZyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwcml2YXRlIGFzeW5jIF9sb2FkTW9kdWxlcyhjb25maWc6IExFU0NvbmZpZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmIChjb25maWcubW9kdWxlcy5sZW5ndGggPT09IDApIHJldHVyblxuICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgY29uZmlnLm1vZHVsZXMubWFwKGRlY2wgPT5cbiAgICAgICAgbG9hZE1vZHVsZSh0aGlzLm1vZHVsZXMsIHtcbiAgICAgICAgICAuLi4oZGVjbC50eXBlID8geyB0eXBlOiBkZWNsLnR5cGUgfSA6IHt9KSxcbiAgICAgICAgICAuLi4oZGVjbC5zcmMgID8geyBzcmM6ICBkZWNsLnNyYyAgfSA6IHt9KSxcbiAgICAgICAgfSkuY2F0Y2goZXJyID0+IGNvbnNvbGUud2FybignW0xFU10gTW9kdWxlIGxvYWQgZmFpbGVkOicsIGVycikpXG4gICAgICApXG4gICAgKVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFBhcnNlIGFsbCBib2RpZXMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBfcGFyc2VBbGwoY29uZmlnOiBMRVNDb25maWcpOiBQYXJzZWRXaXJpbmcge1xuICAgIGxldCBvayA9IDAsIGZhaWwgPSAwXG5cbiAgICBjb25zdCB0cnlQYXJzZSA9IChib2R5OiBzdHJpbmcsIGxhYmVsOiBzdHJpbmcpOiBMRVNOb2RlID0+IHtcbiAgICAgIHRyeSB7IG9rKys7IHJldHVybiBwYXJzZUxFUyhib2R5KSB9XG4gICAgICBjYXRjaCAoZSkge1xuICAgICAgICBmYWlsKytcbiAgICAgICAgY29uc29sZS5lcnJvcihgW0xFU10gUGFyc2UgZXJyb3IgaW4gJHtsYWJlbH06YCwgZSlcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogJ2V4cHInLCByYXc6ICcnIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB3aXJpbmc6IFBhcnNlZFdpcmluZyA9IHtcbiAgICAgIGNvbW1hbmRzOiBjb25maWcuY29tbWFuZHMubWFwKGQgPT4gKHtcbiAgICAgICAgbmFtZTogZC5uYW1lLCBndWFyZDogZC5ndWFyZCwgYXJnc1JhdzogZC5hcmdzUmF3LFxuICAgICAgICBib2R5OiB0cnlQYXJzZShkLmJvZHksIGBjb21tYW5kIFwiJHtkLm5hbWV9XCJgKSxcbiAgICAgIH0pKSxcbiAgICAgIGhhbmRsZXJzOiBjb25maWcub25FdmVudC5tYXAoZCA9PiAoe1xuICAgICAgICBldmVudDogZC5uYW1lLFxuICAgICAgICBib2R5OiB0cnlQYXJzZShkLmJvZHksIGBvbi1ldmVudCBcIiR7ZC5uYW1lfVwiYCksXG4gICAgICB9KSksXG4gICAgICB3YXRjaGVyczogY29uZmlnLm9uU2lnbmFsLm1hcChkID0+ICh7XG4gICAgICAgIHNpZ25hbDogZC5uYW1lLCB3aGVuOiBkLndoZW4sXG4gICAgICAgIGJvZHk6IHRyeVBhcnNlKGQuYm9keSwgYG9uLXNpZ25hbCBcIiR7ZC5uYW1lfVwiYCksXG4gICAgICB9KSksXG4gICAgICBsaWZlY3ljbGU6IHtcbiAgICAgICAgb25Mb2FkOiAgY29uZmlnLm9uTG9hZC5tYXAoZCA9PiB0cnlQYXJzZShkLmJvZHksICdvbi1sb2FkJykpLFxuICAgICAgICBvbkVudGVyOiBjb25maWcub25FbnRlci5tYXAoZCA9PiAoeyB3aGVuOiBkLndoZW4sIGJvZHk6IHRyeVBhcnNlKGQuYm9keSwgJ29uLWVudGVyJykgfSkpLFxuICAgICAgICBvbkV4aXQ6ICBjb25maWcub25FeGl0Lm1hcChkID0+IHRyeVBhcnNlKGQuYm9keSwgJ29uLWV4aXQnKSksXG4gICAgICB9LFxuICAgIH1cblxuICAgIGNvbnN0IHRvdGFsID0gb2sgKyBmYWlsXG4gICAgY29uc29sZS5sb2coYFtMRVNdIHBhcnNlcjogJHtva30vJHt0b3RhbH0gYm9kaWVzIHBhcnNlZCBzdWNjZXNzZnVsbHkke2ZhaWwgPiAwID8gYCAoJHtmYWlsfSBlcnJvcnMpYCA6ICcnfWApXG4gICAgcmV0dXJuIHdpcmluZ1xuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIERhdGFzdGFyIGJyaWRnZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBjb25uZWN0RGF0YXN0YXIoZm5zOiB7XG4gICAgZWZmZWN0OiAoZm46ICgpID0+IHZvaWQpID0+IHZvaWRcbiAgICBzaWduYWw6IDxUPihuYW1lOiBzdHJpbmcsIGluaXQ/OiBUKSA9PiB7IHZhbHVlOiBUIH1cbiAgfSk6IHZvaWQge1xuICAgIHRoaXMuX2RzRWZmZWN0ID0gZm5zLmVmZmVjdFxuICAgIHRoaXMuX2RzU2lnbmFsID0gZm5zLnNpZ25hbFxuICAgIGNvbnNvbGUubG9nKCdbTEVTXSBEYXRhc3RhciBicmlkZ2UgY29ubmVjdGVkJywgdGhpcy5pZClcbiAgfVxuXG4gIGRpc2Nvbm5lY3REYXRhc3RhcigpOiB2b2lkIHtcbiAgICB0aGlzLl9kc0VmZmVjdCA9IHVuZGVmaW5lZFxuICAgIHRoaXMuX2RzU2lnbmFsID0gdW5kZWZpbmVkXG4gIH1cblxuICBnZXQgZHNFZmZlY3QoKSB7IHJldHVybiB0aGlzLl9kc0VmZmVjdCB9XG4gIGdldCBkc1NpZ25hbCgpICB7IHJldHVybiB0aGlzLl9kc1NpZ25hbCB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFB1YmxpYyBBUEkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgLyoqIEZpcmUgYSBuYW1lZCBsb2NhbCBldmVudCBpbnRvIHRoaXMgTEVTIGluc3RhbmNlIGZyb20gb3V0c2lkZS4gKi9cbiAgZmlyZShldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10gPSBbXSk6IHZvaWQge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoZXZlbnQsIHtcbiAgICAgIGRldGFpbDogeyBwYXlsb2FkIH0sIGJ1YmJsZXM6IGZhbHNlLCBjb21wb3NlZDogZmFsc2UsXG4gICAgfSkpXG4gIH1cblxuICAvKiogQ2FsbCBhIGNvbW1hbmQgYnkgbmFtZSBmcm9tIG91dHNpZGUgKGUuZy4gYnJvd3NlciBjb25zb2xlLCB0ZXN0cykuICovXG4gIGFzeW5jIGNhbGwoY29tbWFuZDogc3RyaW5nLCBhcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLl9jdHgpIHsgY29uc29sZS53YXJuKCdbTEVTXSBub3QgaW5pdGlhbGl6ZWQgeWV0Jyk7IHJldHVybiB9XG4gICAgY29uc3QgeyBydW5Db21tYW5kIH0gPSBhd2FpdCBpbXBvcnQoJ0BydW50aW1lL2V4ZWN1dG9yLmpzJylcbiAgICBhd2FpdCBydW5Db21tYW5kKGNvbW1hbmQsIGFyZ3MsIHRoaXMuX2N0eClcbiAgfVxuXG4gIC8qKiBSZWFkIGEgc2lnbmFsIHZhbHVlIGRpcmVjdGx5IChmb3IgZGVidWdnaW5nKS4gKi9cbiAgc2lnbmFsKG5hbWU6IHN0cmluZyk6IHVua25vd24ge1xuICAgIHJldHVybiB0aGlzLl9nZXRTaWduYWwobmFtZSlcbiAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ2xvY2FsLWV2ZW50LXNjcmlwdCcsIExvY2FsRXZlbnRTY3JpcHQpXG4iLCAiLyoqXG4gKiA8bG9jYWwtY29tbWFuZD4gXHUyMDE0IGRlZmluZXMgYSBuYW1lZCwgY2FsbGFibGUgY29tbWFuZCB3aXRoaW4gYSA8bG9jYWwtZXZlbnQtc2NyaXB0Pi5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBuYW1lICAgIFJlcXVpcmVkLiBDb21tYW5kIG5hbWUsIGNvbG9uLW5hbWVzcGFjZWQ6IFwiZmVlZDpmZXRjaFwiXG4gKiAgIGFyZ3MgICAgT3B0aW9uYWwuIFR5cGVkIGFyZ3VtZW50IGxpc3Q6IFwiW2Zyb206c3RyICB0bzpzdHJdXCJcbiAqICAgZ3VhcmQgICBPcHRpb25hbC4gSlMgZXhwcmVzc2lvbiBcdTIwMTQgZmFsc3kgPSBzaWxlbnQgbm8tb3AsIG5vIHJlc2N1ZS9hZnRlcndhcmRzXG4gKiAgIGRvICAgICAgUmVxdWlyZWQuIExFUyBib2R5IChiYWNrdGljay1xdW90ZWQgZm9yIG11bHRpLWxpbmUpXG4gKlxuICogVGhpcyBlbGVtZW50IGlzIHB1cmVseSBkZWNsYXJhdGl2ZSBcdTIwMTQgaXQgaG9sZHMgZGF0YS5cbiAqIFRoZSBob3N0IDxsb2NhbC1ldmVudC1zY3JpcHQ+IHJlYWRzIGl0IGR1cmluZyBQaGFzZSAxIGFuZCByZWdpc3RlcnNcbiAqIHRoZSBwYXJzZWQgQ29tbWFuZERlZiBpbiBpdHMgQ29tbWFuZFJlZ2lzdHJ5LlxuICpcbiAqIE5vdGU6IDxjb21tYW5kPiB3YXMgYSBkZXByZWNhdGVkIEhUTUw1IGVsZW1lbnQgXHUyMDE0IHdlIHVzZSA8bG9jYWwtY29tbWFuZD5cbiAqIHRvIHNhdGlzZnkgdGhlIGN1c3RvbSBlbGVtZW50IGh5cGhlbiByZXF1aXJlbWVudCBhbmQgYXZvaWQgdGhlIGNvbGxpc2lvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIExvY2FsQ29tbWFuZCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEF0dHJpYnV0ZSBhY2Nlc3NvcnMgKHR5cGVkLCB0cmltbWVkKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBnZXQgY29tbWFuZE5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICAvKiogUmF3IGFyZ3Mgc3RyaW5nIGUuZy4gXCJbZnJvbTpzdHIgIHRvOnN0cl1cIiBcdTIwMTQgcGFyc2VkIGJ5IFBoYXNlIDIgKi9cbiAgZ2V0IGFyZ3NSYXcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ2FyZ3MnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICAvKiogR3VhcmQgZXhwcmVzc2lvbiBzdHJpbmcgXHUyMDE0IGV2YWx1YXRlZCBieSBydW50aW1lIGJlZm9yZSBleGVjdXRpb24gKi9cbiAgZ2V0IGd1YXJkRXhwcigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ2d1YXJkJyk/LnRyaW0oKSA/PyBudWxsXG4gIH1cblxuICAvKiogUmF3IExFUyBib2R5IFx1MjAxNCBtYXkgYmUgYmFja3RpY2std3JhcHBlZCBmb3IgbXVsdGktbGluZSAqL1xuICBnZXQgZG9Cb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdkbycpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIC8vIFBoYXNlIDA6IHZlcmlmeSBlbGVtZW50IGlzIHJlY29nbml6ZWQuXG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxsb2NhbC1jb21tYW5kPiByZWdpc3RlcmVkOicsIHRoaXMuY29tbWFuZE5hbWUgfHwgJyh1bm5hbWVkKScpXG4gIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdsb2NhbC1jb21tYW5kJywgTG9jYWxDb21tYW5kKVxuIiwgIi8qKlxuICogPG9uLWV2ZW50PiBcdTIwMTQgc3Vic2NyaWJlcyB0byBhIG5hbWVkIEN1c3RvbUV2ZW50IGRpc3BhdGNoZWQgd2l0aGluIHRoZSBMRVMgaG9zdC5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBuYW1lICAgIFJlcXVpcmVkLiBFdmVudCBuYW1lOiBcImZlZWQ6aW5pdFwiLCBcIml0ZW06ZGlzbWlzc2VkXCJcbiAqICAgaGFuZGxlICBSZXF1aXJlZC4gTEVTIGJvZHkgXHUyMDE0IHNpbmdsZS1saW5lIChubyBiYWNrdGlja3MpIG9yIG11bHRpLWxpbmUgKGJhY2t0aWNrcylcbiAqXG4gKiBQaGFzZSA0IHdpcmVzIGEgQ3VzdG9tRXZlbnQgbGlzdGVuZXIgb24gdGhlIGhvc3QgZWxlbWVudC5cbiAqIEV2ZW50cyBmaXJlZCBieSBgZW1pdGAgbmV2ZXIgYnViYmxlOyBvbmx5IGhhbmRsZXJzIHdpdGhpbiB0aGUgc2FtZVxuICogPGxvY2FsLWV2ZW50LXNjcmlwdD4gc2VlIHRoZW0uIFVzZSBgYnJvYWRjYXN0YCB0byBjcm9zcyB0aGUgYm91bmRhcnkuXG4gKi9cbmV4cG9ydCBjbGFzcyBPbkV2ZW50IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBnZXQgZXZlbnROYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCduYW1lJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgLyoqIFJhdyBMRVMgaGFuZGxlIGJvZHkgKi9cbiAgZ2V0IGhhbmRsZUJvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ2hhbmRsZScpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8b24tZXZlbnQ+IHJlZ2lzdGVyZWQ6JywgdGhpcy5ldmVudE5hbWUgfHwgJyh1bm5hbWVkKScpXG4gIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1ldmVudCcsIE9uRXZlbnQpXG4iLCAiLyoqXG4gKiA8b24tc2lnbmFsPiBcdTIwMTQgcmVhY3RzIHdoZW5ldmVyIGEgbmFtZWQgRGF0YXN0YXIgc2lnbmFsIGNoYW5nZXMgdmFsdWUuXG4gKlxuICogQXR0cmlidXRlczpcbiAqICAgbmFtZSAgICBSZXF1aXJlZC4gU2lnbmFsIHJlZmVyZW5jZTogXCIkZmVlZFN0YXRlXCIsIFwiJGZlZWRJdGVtc1wiXG4gKiAgIHdoZW4gICAgT3B0aW9uYWwuIEd1YXJkIGV4cHJlc3Npb24gXHUyMDE0IG9ubHkgZmlyZXMgaGFuZGxlIHdoZW4gdHJ1dGh5XG4gKiAgIGhhbmRsZSAgUmVxdWlyZWQuIExFUyBib2R5XG4gKlxuICogUGhhc2UgNiB3aXJlcyB0aGlzIHRvIERhdGFzdGFyJ3MgZWZmZWN0KCkgc3lzdGVtLlxuICogVW50aWwgRGF0YXN0YXIgaXMgY29ubmVjdGVkLCBmYWxscyBiYWNrIHRvIHBvbGxpbmcgKFBoYXNlIDYgZGVjaWRlcykuXG4gKlxuICogVGhlIGB3aGVuYCBndWFyZCBpcyByZS1ldmFsdWF0ZWQgb24gZXZlcnkgc2lnbmFsIGNoYW5nZS5cbiAqIEd1YXJkIGZhaWx1cmUgaXMgbm90IGFuIGVycm9yIFx1MjAxNCB0aGUgaGFuZGxlIHNpbXBseSBkb2VzIG5vdCBydW4uXG4gKi9cbmV4cG9ydCBjbGFzcyBPblNpZ25hbCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgLyoqIFNpZ25hbCBuYW1lIGluY2x1ZGluZyAkIHByZWZpeDogXCIkZmVlZFN0YXRlXCIgKi9cbiAgZ2V0IHNpZ25hbE5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICAvKiogU2lnbmFsIG5hbWUgd2l0aG91dCAkIHByZWZpeCwgZm9yIERhdGFzdGFyIEFQSSBjYWxscyAqL1xuICBnZXQgc2lnbmFsS2V5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuc2lnbmFsTmFtZS5yZXBsYWNlKC9eXFwkLywgJycpXG4gIH1cblxuICBnZXQgd2hlbkV4cHIoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCd3aGVuJyk/LnRyaW0oKSA/PyBudWxsXG4gIH1cblxuICBnZXQgaGFuZGxlQm9keSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnaGFuZGxlJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxvbi1zaWduYWw+IHJlZ2lzdGVyZWQ6JywgdGhpcy5zaWduYWxOYW1lIHx8ICcodW5uYW1lZCknKVxuICB9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnb24tc2lnbmFsJywgT25TaWduYWwpXG4iLCAiLyoqXG4gKiA8b24tbG9hZD4gXHUyMDE0IGZpcmVzIGl0cyBgcnVuYCBib2R5IG9uY2Ugd2hlbiB0aGUgaG9zdCBjb25uZWN0cyB0byB0aGUgRE9NLlxuICpcbiAqIFRpbWluZzogaWYgZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gJ2NvbXBsZXRlJywgZmlyZXMgaW1tZWRpYXRlbHkgaW5cbiAqIGNvbm5lY3RlZENhbGxiYWNrICh2aWEgcXVldWVNaWNyb3Rhc2spLiBPdGhlcndpc2Ugd2FpdHMgZm9yIERPTUNvbnRlbnRMb2FkZWQuXG4gKlxuICogUnVsZTogbGlmZWN5Y2xlIGhvb2tzIGFsd2F5cyBmaXJlIGV2ZW50cyAoYGVtaXRgKSwgbmV2ZXIgY2FsbCBjb21tYW5kcyBkaXJlY3RseS5cbiAqIFRoaXMga2VlcHMgdGhlIHN5c3RlbSB0cmFjZWFibGUgXHUyMDE0IGV2ZXJ5IGNvbW1hbmQgaW52b2NhdGlvbiBoYXMgYW4gZXZlbnQgaW4gaXRzIGhpc3RvcnkuXG4gKlxuICogQXR0cmlidXRlczpcbiAqICAgcnVuICAgUmVxdWlyZWQuIFNpbmdsZS1saW5lIExFUyBib2R5ICh1c3VhbGx5IGp1c3QgYGVtaXQgZXZlbnQ6bmFtZWApXG4gKi9cbmV4cG9ydCBjbGFzcyBPbkxvYWQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIGdldCBydW5Cb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdydW4nKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPG9uLWxvYWQ+IHJlZ2lzdGVyZWQsIHJ1bjonLCB0aGlzLnJ1bkJvZHkpXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogPG9uLWVudGVyPiBcdTIwMTQgZmlyZXMgd2hlbiB0aGUgaG9zdCA8bG9jYWwtZXZlbnQtc2NyaXB0PiBlbnRlcnMgdGhlIHZpZXdwb3J0LlxuICpcbiAqIFVzZXMgYSBzaW5nbGUgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgc2hhcmVkIGFjcm9zcyBhbGwgPG9uLWVudGVyPi88b24tZXhpdD5cbiAqIGNoaWxkcmVuIG9mIHRoZSBzYW1lIGhvc3QgKFBoYXNlIDUgY3JlYXRlcyBpdCBvbiB0aGUgaG9zdCBlbGVtZW50KS5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICB3aGVuICBPcHRpb25hbC4gR3VhcmQgZXhwcmVzc2lvbiBcdTIwMTQgb25seSBmaXJlcyBydW4gd2hlbiB0cnV0aHkuXG4gKiAgICAgICAgICBQYXR0ZXJuOiBgd2hlbj1cIiRmZWVkU3RhdGUgPT0gJ3BhdXNlZCdcImBcbiAqICAgcnVuICAgUmVxdWlyZWQuIFNpbmdsZS1saW5lIExFUyBib2R5LlxuICovXG5leHBvcnQgY2xhc3MgT25FbnRlciBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgZ2V0IHdoZW5FeHByKCk6IHN0cmluZyB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnd2hlbicpPy50cmltKCkgPz8gbnVsbFxuICB9XG5cbiAgZ2V0IHJ1bkJvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8b24tZW50ZXI+IHJlZ2lzdGVyZWQsIHdoZW46JywgdGhpcy53aGVuRXhwciA/PyAnYWx3YXlzJylcbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiA8b24tZXhpdD4gXHUyMDE0IGZpcmVzIHdoZW4gdGhlIGhvc3QgPGxvY2FsLWV2ZW50LXNjcmlwdD4gZXhpdHMgdGhlIHZpZXdwb3J0LlxuICpcbiAqIE5vIGB3aGVuYCBndWFyZCBcdTIwMTQgZXhpdCBhbHdheXMgZmlyZXMgdW5jb25kaXRpb25hbGx5LlxuICogKElmIHlvdSBuZWVkIGNvbmRpdGlvbmFsIGV4aXQgYmVoYXZpb3IsIHB1dCB0aGUgY29uZGl0aW9uIGluIHRoZSBoYW5kbGVyLilcbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBydW4gICBSZXF1aXJlZC4gU2luZ2xlLWxpbmUgTEVTIGJvZHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBPbkV4aXQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIGdldCBydW5Cb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdydW4nKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPG9uLWV4aXQ+IHJlZ2lzdGVyZWQsIHJ1bjonLCB0aGlzLnJ1bkJvZHkpXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFJlZ2lzdHJhdGlvbiBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1sb2FkJywgIE9uTG9hZClcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnb24tZW50ZXInLCBPbkVudGVyKVxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1leGl0JywgIE9uRXhpdClcbiIsICIvKipcbiAqIDx1c2UtbW9kdWxlPiBcdTIwMTQgZGVjbGFyZXMgYSB2b2NhYnVsYXJ5IGV4dGVuc2lvbiBhdmFpbGFibGUgdG8gPGxvY2FsLWNvbW1hbmQ+IGJvZGllcy5cbiAqXG4gKiBNdXN0IGFwcGVhciBiZWZvcmUgYW55IDxsb2NhbC1jb21tYW5kPiBpbiB0aGUgPGxvY2FsLWV2ZW50LXNjcmlwdD4uXG4gKiBUaGUgaG9zdCByZWFkcyA8dXNlLW1vZHVsZT4gY2hpbGRyZW4gZmlyc3QgKFBoYXNlIDgpIGFuZCByZWdpc3RlcnNcbiAqIHRoZWlyIHByaW1pdGl2ZXMgaW50byBpdHMgTW9kdWxlUmVnaXN0cnkgYmVmb3JlIHBhcnNpbmcgY29tbWFuZCBib2RpZXMuXG4gKlxuICogQXR0cmlidXRlcyAoaW5kZXBlbmRlbnQsIGNvbWJpbmFibGUpOlxuICogICB0eXBlICAgQnVpbHQtaW4gbW9kdWxlIG5hbWU6IFwiYW5pbWF0aW9uXCJcbiAqICAgc3JjICAgIFVSTC9wYXRoIHRvIGEgdXNlcmxhbmQgbW9kdWxlIEVTIG1vZHVsZTogIFwiLi9zY3JvbGwtZWZmZWN0cy5qc1wiXG4gKiAgICAgICAgICBUaGUgbW9kdWxlIG11c3QgZXhwb3J0IGEgZGVmYXVsdCBjb25mb3JtaW5nIHRvIExFU01vZHVsZTpcbiAqICAgICAgICAgIHsgbmFtZTogc3RyaW5nLCBwcmltaXRpdmVzOiBSZWNvcmQ8c3RyaW5nLCBMRVNQcmltaXRpdmU+IH1cbiAqXG4gKiBFeGFtcGxlczpcbiAqICAgPHVzZS1tb2R1bGUgdHlwZT1cImFuaW1hdGlvblwiPjwvdXNlLW1vZHVsZT5cbiAqICAgPHVzZS1tb2R1bGUgc3JjPVwiLi9zY3JvbGwtZWZmZWN0cy5qc1wiPjwvdXNlLW1vZHVsZT5cbiAqICAgPHVzZS1tb2R1bGUgc3JjPVwiLi9zcHJpbmctcGh5c2ljcy5qc1wiPjwvdXNlLW1vZHVsZT5cbiAqXG4gKiB0eXBlPSBhbmQgc3JjPSBtYXkgYXBwZWFyIHRvZ2V0aGVyIG9uIG9uZSBlbGVtZW50IGlmIHRoZSB1c2VybGFuZCBtb2R1bGVcbiAqIHdhbnRzIHRvIGRlY2xhcmUgaXRzIHR5cGUgaGludCBmb3IgdG9vbGluZyAobm90IGN1cnJlbnRseSByZXF1aXJlZCkuXG4gKi9cbmV4cG9ydCBjbGFzcyBVc2VNb2R1bGUgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIC8qKiBCdWlsdC1pbiBtb2R1bGUgdHlwZSBlLmcuIFwiYW5pbWF0aW9uXCIgKi9cbiAgZ2V0IG1vZHVsZVR5cGUoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCd0eXBlJyk/LnRyaW0oKSA/PyBudWxsXG4gIH1cblxuICAvKiogVXNlcmxhbmQgbW9kdWxlIFVSTCBlLmcuIFwiLi9zY3JvbGwtZWZmZWN0cy5qc1wiICovXG4gIGdldCBtb2R1bGVTcmMoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdzcmMnKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnN0IGRlc2MgPSB0aGlzLm1vZHVsZVR5cGVcbiAgICAgID8gYHR5cGU9XCIke3RoaXMubW9kdWxlVHlwZX1cImBcbiAgICAgIDogdGhpcy5tb2R1bGVTcmNcbiAgICAgICAgPyBgc3JjPVwiJHt0aGlzLm1vZHVsZVNyY31cImBcbiAgICAgICAgOiAnKG5vIHR5cGUgb3Igc3JjKSdcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPHVzZS1tb2R1bGU+IGRlY2xhcmVkOicsIGRlc2MpXG4gIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd1c2UtbW9kdWxlJywgVXNlTW9kdWxlKVxuIiwgIi8qKlxuICogUGhhc2UgNjogRGF0YXN0YXIgYXR0cmlidXRlIHBsdWdpblxuICpcbiAqIFJlZ2lzdGVycyA8bG9jYWwtZXZlbnQtc2NyaXB0PiBhcyBhIERhdGFzdGFyIGF0dHJpYnV0ZSBwbHVnaW4gc28gdGhhdDpcbiAqXG4gKiAgIDEuIERhdGFzdGFyJ3MgZWZmZWN0KCkgYW5kIHNpZ25hbCgpIHByaW1pdGl2ZXMgYXJlIGhhbmRlZCB0byB0aGUgaG9zdFxuICogICAgICBlbGVtZW50LCBlbmFibGluZyBwcm9wZXIgcmVhY3RpdmUgc2lnbmFsIHdhdGNoaW5nIHZpYSB0aGUgZGVwZW5kZW5jeVxuICogICAgICBncmFwaCByYXRoZXIgdGhhbiBtYW51YWwgbm90aWZpY2F0aW9uLlxuICpcbiAqICAgMi4gU2lnbmFsIHdyaXRlcyBmcm9tIGBzZXQgJHggdG8geWAgaW4gTEVTIHByb3BhZ2F0ZSBpbnRvIERhdGFzdGFyJ3NcbiAqICAgICAgcm9vdCBvYmplY3Qgc28gZGF0YS10ZXh0LCBkYXRhLXNob3csIGV0Yy4gdXBkYXRlIHJlYWN0aXZlbHkuXG4gKlxuICogICAzLiAkLXByZWZpeGVkIHNpZ25hbHMgaW4gTEVTIGV4cHJlc3Npb25zIHJlc29sdmUgZnJvbSBEYXRhc3RhcidzIHJvb3QsXG4gKiAgICAgIGdpdmluZyBMRVMgZnVsbCByZWFkIGFjY2VzcyB0byBhbGwgRGF0YXN0YXIgc3RhdGUuXG4gKlxuICogICA0LiBTaWduYWwgd2F0Y2hlcnMgb24tc2lnbmFsIGFyZSByZS13aXJlZCB0aHJvdWdoIERhdGFzdGFyJ3MgZWZmZWN0KClcbiAqICAgICAgc3lzdGVtIGZvciBwcm9wZXIgYmF0Y2hpbmcgYW5kIGRlZHVwbGljYXRpb24uXG4gKlxuICogTEVTIHdvcmtzIHdpdGhvdXQgRGF0YXN0YXIgKHN0YW5kYWxvbmUgbW9kZSkuIFRoZSBicmlkZ2UgaXMgcHVyZWx5IGFkZGl0aXZlLlxuICovXG5cbmltcG9ydCB0eXBlIHsgTG9jYWxFdmVudFNjcmlwdCB9IGZyb20gJ0BlbGVtZW50cy9Mb2NhbEV2ZW50U2NyaXB0LmpzJ1xuaW1wb3J0IHsgd2lyZVNpZ25hbFdhdGNoZXJWaWFEYXRhc3RhciB9IGZyb20gJ0BydW50aW1lL3NpZ25hbHMuanMnXG5cbmxldCBicmlkZ2VSZWdpc3RlcmVkID0gZmFsc2VcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlZ2lzdGVyRGF0YXN0YXJCcmlkZ2UoKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChicmlkZ2VSZWdpc3RlcmVkKSByZXR1cm5cblxuICB0cnkge1xuICAgIGNvbnN0IGRhdGFzdGFyID0gYXdhaXQgaW1wb3J0KCdkYXRhc3RhcicpXG4gICAgY29uc3QgeyBhdHRyaWJ1dGUgfSA9IGRhdGFzdGFyXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgUmVnaXN0ZXIgYXMgYSBEYXRhc3RhciBhdHRyaWJ1dGUgcGx1Z2luIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIC8vIE1hdGNoZXMgZWxlbWVudHMgd2l0aCBhIGBkYXRhLWxvY2FsLWV2ZW50LXNjcmlwdGAgYXR0cmlidXRlIE9SICh2aWFcbiAgICAvLyBuYW1lIG1hdGNoaW5nKSB0aGUgPGxvY2FsLWV2ZW50LXNjcmlwdD4gY3VzdG9tIGVsZW1lbnQgaXRzZWxmIHdoZW5cbiAgICAvLyBEYXRhc3RhciBzY2FucyB0aGUgRE9NLlxuICAgIC8vXG4gICAgLy8gVGhlIG5hbWUgJ2xvY2FsLWV2ZW50LXNjcmlwdCcgY2F1c2VzIERhdGFzdGFyIHRvIGFwcGx5IHRoaXMgcGx1Z2luXG4gICAgLy8gdG8gYW55IGVsZW1lbnQgd2l0aCBkYXRhLWxvY2FsLWV2ZW50LXNjcmlwdD1cIi4uLlwiIGluIHRoZSBET00uXG4gICAgLy8gV2UgYWxzbyBwYXRjaCA8bG9jYWwtZXZlbnQtc2NyaXB0PiBkaXJlY3RseSBpbiB0aGUgTXV0YXRpb25PYnNlcnZlclxuICAgIC8vIHBhdGggdmlhIHRoZSBob3N0IGVsZW1lbnQncyBjb25uZWN0ZWRDYWxsYmFjay5cbiAgICBhdHRyaWJ1dGUoe1xuICAgICAgbmFtZTogJ2xvY2FsLWV2ZW50LXNjcmlwdCcsXG4gICAgICByZXF1aXJlbWVudDoge1xuICAgICAgICBrZXk6ICdkZW5pZWQnLFxuICAgICAgICB2YWx1ZTogJ2RlbmllZCcsXG4gICAgICB9LFxuICAgICAgYXBwbHkoeyBlbCwgZWZmZWN0LCBzaWduYWwgfSkge1xuICAgICAgICBjb25zdCBob3N0ID0gZWwgYXMgTG9jYWxFdmVudFNjcmlwdFxuXG4gICAgICAgIC8vIFBoYXNlIDZhOiBoYW5kIERhdGFzdGFyJ3MgcmVhY3RpdmUgcHJpbWl0aXZlcyB0byB0aGUgaG9zdFxuICAgICAgICBob3N0LmNvbm5lY3REYXRhc3Rhcih7IGVmZmVjdCwgc2lnbmFsIH0pXG5cbiAgICAgICAgLy8gUGhhc2UgNmI6IGlmIHRoZSBob3N0IGlzIGFscmVhZHkgaW5pdGlhbGl6ZWQgKHdpcmluZyByYW4gYmVmb3JlXG4gICAgICAgIC8vIERhdGFzdGFyIGF0dHJpYnV0ZSBwbHVnaW4gZmlyZWQpLCByZS13aXJlIHNpZ25hbCB3YXRjaGVycyB0aHJvdWdoXG4gICAgICAgIC8vIERhdGFzdGFyJ3MgZWZmZWN0KCkgZm9yIHByb3BlciByZWFjdGl2aXR5XG4gICAgICAgIGNvbnN0IHdpcmluZyA9IGhvc3Qud2lyaW5nXG4gICAgICAgIGlmICh3aXJpbmcgJiYgd2lyaW5nLndhdGNoZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IHdhdGNoZXIgb2Ygd2lyaW5nLndhdGNoZXJzKSB7XG4gICAgICAgICAgICB3aXJlU2lnbmFsV2F0Y2hlclZpYURhdGFzdGFyKHdhdGNoZXIsIGVmZmVjdCwgKCkgPT4gaG9zdC5jb250ZXh0ISlcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc29sZS5sb2coYFtMRVM6ZGF0YXN0YXJdIHJlLXdpcmVkICR7d2lyaW5nLndhdGNoZXJzLmxlbmd0aH0gc2lnbmFsIHdhdGNoZXJzIHZpYSBEYXRhc3RhciBlZmZlY3QoKWApXG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZygnW0xFUzpkYXRhc3Rhcl0gYXR0cmlidXRlIHBsdWdpbiBhcHBsaWVkIHRvJywgZWwuaWQgfHwgZWwudGFnTmFtZSlcblxuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgIGhvc3QuZGlzY29ubmVjdERhdGFzdGFyKClcbiAgICAgICAgICBjb25zb2xlLmxvZygnW0xFUzpkYXRhc3Rhcl0gYXR0cmlidXRlIHBsdWdpbiBjbGVhbmVkIHVwJywgZWwuaWQgfHwgZWwudGFnTmFtZSlcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9KVxuXG4gICAgYnJpZGdlUmVnaXN0ZXJlZCA9IHRydWVcbiAgICBjb25zb2xlLmxvZygnW0xFUzpkYXRhc3Rhcl0gYnJpZGdlIHJlZ2lzdGVyZWQnKVxuXG4gIH0gY2F0Y2gge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSBydW5uaW5nIGluIHN0YW5kYWxvbmUgbW9kZSAoRGF0YXN0YXIgbm90IGF2YWlsYWJsZSknKVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gU2lnbmFsIGludGVncmF0aW9uIHV0aWxpdGllc1xuLy8gVXNlZCBieSBleGVjdXRvci50cyB3aGVuIERhdGFzdGFyIGlzIHByZXNlbnRcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFJlYWRzIGEgc2lnbmFsIHZhbHVlIGZyb20gRGF0YXN0YXIncyByb290IG9iamVjdC5cbiAqIEZhbGxzIGJhY2sgdG8gdW5kZWZpbmVkIGlmIERhdGFzdGFyIGlzIG5vdCBhdmFpbGFibGUuXG4gKlxuICogVGhpcyBpcyBjYWxsZWQgYnkgdGhlIExFU0NvbnRleHQuZ2V0U2lnbmFsIGZ1bmN0aW9uIHdoZW4gdGhlIERhdGFzdGFyXG4gKiBicmlkZ2UgaXMgY29ubmVjdGVkLCBnaXZpbmcgTEVTIGV4cHJlc3Npb25zIGFjY2VzcyB0byBhbGwgRGF0YXN0YXIgc2lnbmFscy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWREYXRhc3RhclNpZ25hbChcbiAgbmFtZTogc3RyaW5nLFxuICBkc1NpZ25hbDogKDxUPihuYW1lOiBzdHJpbmcsIGluaXQ/OiBUKSA9PiB7IHZhbHVlOiBUIH0pIHwgdW5kZWZpbmVkXG4pOiB1bmtub3duIHtcbiAgaWYgKCFkc1NpZ25hbCkgcmV0dXJuIHVuZGVmaW5lZFxuICB0cnkge1xuICAgIHJldHVybiBkc1NpZ25hbChuYW1lKS52YWx1ZVxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cbn1cblxuLyoqXG4gKiBXcml0ZXMgYSB2YWx1ZSB0byBEYXRhc3RhcidzIHNpZ25hbCB0cmVlLlxuICogVGhpcyB0cmlnZ2VycyBEYXRhc3RhcidzIHJlYWN0aXZlIGdyYXBoIFx1MjAxNCBhbnkgZGF0YS10ZXh0LCBkYXRhLXNob3csXG4gKiBkYXRhLWNsYXNzIGF0dHJpYnV0ZXMgYm91bmQgdG8gdGhpcyBzaWduYWwgd2lsbCB1cGRhdGUgYXV0b21hdGljYWxseS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlRGF0YXN0YXJTaWduYWwoXG4gIG5hbWU6IHN0cmluZyxcbiAgdmFsdWU6IHVua25vd24sXG4gIGRzU2lnbmFsOiAoPFQ+KG5hbWU6IHN0cmluZywgaW5pdD86IFQpID0+IHsgdmFsdWU6IFQgfSkgfCB1bmRlZmluZWRcbik6IHZvaWQge1xuICBpZiAoIWRzU2lnbmFsKSByZXR1cm5cbiAgdHJ5IHtcbiAgICBjb25zdCBzaWcgPSBkc1NpZ25hbDx1bmtub3duPihuYW1lLCB2YWx1ZSlcbiAgICBzaWcudmFsdWUgPSB2YWx1ZVxuICB9IGNhdGNoIHtcbiAgICAvLyBTaWduYWwgbWF5IG5vdCBleGlzdCB5ZXQgXHUyMDE0IGl0IHdpbGwgYmUgY3JlYXRlZCBieSBkYXRhLXNpZ25hbHMgb24gdGhlIGhvc3RcbiAgfVxufVxuIiwgIi8qKlxuICogbG9jYWwtZXZlbnQtc2NyaXB0IFx1MjAxNCBtYWluIGVudHJ5IHBvaW50XG4gKlxuICogSW1wb3J0IG9yZGVyIG1hdHRlcnMgZm9yIGN1c3RvbSBlbGVtZW50IHJlZ2lzdHJhdGlvbjpcbiAqICAgMS4gSG9zdCBlbGVtZW50IGZpcnN0IChMb2NhbEV2ZW50U2NyaXB0KVxuICogICAyLiBDaGlsZCBlbGVtZW50cyB0aGF0IHJlZmVyZW5jZSBpdFxuICogICAzLiBEYXRhc3RhciBicmlkZ2UgbGFzdCAob3B0aW9uYWwgXHUyMDE0IGZhaWxzIGdyYWNlZnVsbHkgaWYgRGF0YXN0YXIgYWJzZW50KVxuICpcbiAqIFVzYWdlIHZpYSBpbXBvcnRtYXAgKyBzY3JpcHQgdGFnOlxuICpcbiAqICAgPHNjcmlwdCB0eXBlPVwiaW1wb3J0bWFwXCI+XG4gKiAgICAge1xuICogICAgICAgXCJpbXBvcnRzXCI6IHtcbiAqICAgICAgICAgXCJkYXRhc3RhclwiOiBcImh0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9naC9zdGFyZmVkZXJhdGlvbi9kYXRhc3RhckB2MS4wLjAtUkMuOC9idW5kbGVzL2RhdGFzdGFyLmpzXCJcbiAqICAgICAgIH1cbiAqICAgICB9XG4gKiAgIDwvc2NyaXB0PlxuICogICA8c2NyaXB0IHR5cGU9XCJtb2R1bGVcIiBzcmM9XCIvZGlzdC9sb2NhbC1ldmVudC1zY3JpcHQuanNcIj48L3NjcmlwdD5cbiAqXG4gKiBXaXRob3V0IHRoZSBpbXBvcnRtYXAgKG9yIHdpdGggZGF0YXN0YXIgYWJzZW50KSwgTEVTIHJ1bnMgaW4gc3RhbmRhbG9uZSBtb2RlOlxuICogYWxsIGN1c3RvbSBlbGVtZW50cyB3b3JrLCBEYXRhc3RhciBzaWduYWwgd2F0Y2hpbmcgYW5kIEBhY3Rpb24gcGFzc3Rocm91Z2hcbiAqIGFyZSB1bmF2YWlsYWJsZS5cbiAqL1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgQ3VzdG9tIGVsZW1lbnRzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gRWFjaCBpbXBvcnQgcmVnaXN0ZXJzIGl0cyBlbGVtZW50KHMpIGFzIGEgc2lkZSBlZmZlY3QuXG5cbmV4cG9ydCB7IExvY2FsRXZlbnRTY3JpcHQgfSBmcm9tICdAZWxlbWVudHMvTG9jYWxFdmVudFNjcmlwdC5qcydcbmV4cG9ydCB7IExvY2FsQ29tbWFuZCB9ICAgICBmcm9tICdAZWxlbWVudHMvTG9jYWxDb21tYW5kLmpzJ1xuZXhwb3J0IHsgT25FdmVudCB9ICAgICAgICAgIGZyb20gJ0BlbGVtZW50cy9PbkV2ZW50LmpzJ1xuZXhwb3J0IHsgT25TaWduYWwgfSAgICAgICAgIGZyb20gJ0BlbGVtZW50cy9PblNpZ25hbC5qcydcbmV4cG9ydCB7IE9uTG9hZCwgT25FbnRlciwgT25FeGl0IH0gZnJvbSAnQGVsZW1lbnRzL0xpZmVjeWNsZS5qcydcbmV4cG9ydCB7IFVzZU1vZHVsZSB9ICAgICAgICBmcm9tICdAZWxlbWVudHMvVXNlTW9kdWxlLmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgVHlwZSBleHBvcnRzIChmb3IgVHlwZVNjcmlwdCBjb25zdW1lcnMpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuZXhwb3J0IHR5cGUgeyBMRVNOb2RlIH0gICAgICAgICAgICAgICAgICAgZnJvbSAnQHBhcnNlci9hc3QuanMnXG5leHBvcnQgdHlwZSB7IExFU01vZHVsZSwgTEVTUHJpbWl0aXZlIH0gICBmcm9tICdAbW9kdWxlcy90eXBlcy5qcydcbmV4cG9ydCB0eXBlIHsgQ29tbWFuZERlZiwgQXJnRGVmIH0gICAgICAgIGZyb20gJ0BydW50aW1lL3JlZ2lzdHJ5LmpzJ1xuZXhwb3J0IHsgTEVTU2NvcGUgfSAgICAgICAgICAgICAgICAgICAgICAgZnJvbSAnQHJ1bnRpbWUvc2NvcGUuanMnXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBEYXRhc3RhciBicmlkZ2UgKG9wdGlvbmFsKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIER5bmFtaWMgaW1wb3J0IHNvIHRoZSBidW5kbGUgd29ya3Mgd2l0aG91dCBEYXRhc3RhciBwcmVzZW50LlxuaW1wb3J0IHsgcmVnaXN0ZXJEYXRhc3RhckJyaWRnZSB9IGZyb20gJ0BkYXRhc3Rhci9wbHVnaW4uanMnXG5yZWdpc3RlckRhdGFzdGFyQnJpZGdlKClcbmV4cG9ydCB0eXBlIHsgTEVTQ29uZmlnLCBDb21tYW5kRGVjbCwgRXZlbnRIYW5kbGVyRGVjbCwgU2lnbmFsV2F0Y2hlckRlY2wsXG4gICAgICAgICAgICAgIE9uTG9hZERlY2wsIE9uRW50ZXJEZWNsLCBPbkV4aXREZWNsLCBNb2R1bGVEZWNsIH0gZnJvbSAnQHBhcnNlci9jb25maWcuanMnXG5leHBvcnQgeyByZWFkQ29uZmlnLCBsb2dDb25maWcgfSBmcm9tICdAcGFyc2VyL3JlYWRlci5qcydcbmV4cG9ydCB7IHN0cmlwQm9keSB9ICAgICAgICAgICAgIGZyb20gJ0BwYXJzZXIvc3RyaXBCb2R5LmpzJ1xuZXhwb3J0IHsgcGFyc2VMRVMsIExFU1BhcnNlciwgTEVTUGFyc2VFcnJvciB9IGZyb20gJ0BwYXJzZXIvaW5kZXguanMnXG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBdUJBLFNBQVMsU0FBUyxVQUFrQixNQUEwQjtBQUM1RCxNQUFJO0FBQ0YsVUFBTSxPQUFPLEtBQUssWUFBWTtBQUM5QixVQUFNLFFBQVEsZ0JBQWdCLFdBQVcsT0FBTyxLQUFLLGlCQUFpQjtBQUN0RSxXQUFPLE1BQU0sS0FBSyxNQUFNLGlCQUFpQixRQUFRLENBQUM7QUFBQSxFQUNwRCxRQUFRO0FBQ04sWUFBUSxLQUFLLHNDQUFzQyxRQUFRLEdBQUc7QUFDOUQsV0FBTyxDQUFDO0FBQUEsRUFDVjtBQUNGO0FBUUEsU0FBUyxpQkFBaUIsSUFBbUI7QUFDM0MsYUFBVyxRQUFTLEdBQW1CLGNBQWMsR0FBRztBQUN0RCxTQUFLLE9BQU87QUFBQSxFQUNkO0FBQ0Y7QUFHQSxlQUFlLFdBQ2IsS0FDQSxXQUNBLFNBQ2U7QUFDZixNQUFJLElBQUksV0FBVyxFQUFHO0FBRXRCLE1BQUksUUFBUSxnQkFBZ0I7QUFDNUIsUUFBTSxRQUFRO0FBQUEsSUFDWixJQUFJLElBQUksUUFBTyxHQUFtQixRQUFRLFdBQVcsT0FBTyxFQUFFLFFBQVE7QUFBQSxFQUN4RTtBQUNGO0FBUUEsU0FBUyxl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
