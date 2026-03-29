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
    els.map(
      (el) => el.animate(keyframes, options).finished.catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        throw err;
      })
    )
  );
}
function slideKeyframes(dir, entering) {
  const distance = "80px";
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
          ).finished.catch((err) => {
            if (err instanceof DOMException && err.name === "AbortError") return;
            throw err;
          })
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
          ).finished.catch((err) => {
            if (err instanceof DOMException && err.name === "AbortError") return;
            throw err;
          })
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
    // `@get '/api/feed' [filter: $activeFilter]`
    // Awaits the full SSE stream / JSON response from the server.
    // Datastar processes the SSE events (patch-elements, patch-signals) as
    // they arrive. The Promise resolves when the stream closes.
    // `then` in LES correctly waits for this before proceeding.
    case "action": {
      const n = node;
      const evaledArgs = {};
      for (const [key, exprNode] of Object.entries(n.args)) {
        evaledArgs[key] = evalExpr(exprNode, ctx);
      }
      await performAction(n.verb, n.url, evaledArgs, ctx);
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
      "Accept": "text/event-stream, application/json"
    },
    ...body ? { body } : {}
  });
  if (!response.ok) {
    throw new Error(`[LES] HTTP ${response.status} from ${method} ${url}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/event-stream")) {
    await consumeSSEStream(response, ctx);
    return void 0;
  }
  if (contentType.includes("application/json")) {
    return await response.json();
  }
  return await response.text();
}
async function consumeSSEStream(response, ctx) {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventType = "";
  let dataLines = [];
  const applyEvent = () => {
    if (!eventType || dataLines.length === 0) return;
    if (eventType === "datastar-patch-elements") {
      applyPatchElements(dataLines, ctx);
    } else if (eventType === "datastar-patch-signals") {
      applyPatchSignals(dataLines, ctx);
    }
    eventType = "";
    dataLines = [];
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      applyEvent();
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventType = line.slice("event:".length).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice("data:".length).trimStart());
      } else if (line === "") {
        applyEvent();
      }
    }
  }
}
function applyPatchElements(dataLines, ctx) {
  let selector = "";
  let mode = "outer";
  const htmlLines = [];
  for (const line of dataLines) {
    if (line.startsWith("selector ")) {
      selector = line.slice("selector ".length).trim();
      continue;
    }
    if (line.startsWith("mode ")) {
      mode = line.slice("mode ".length).trim();
      continue;
    }
    if (line.startsWith("elements ")) {
      htmlLines.push(line.slice("elements ".length));
      continue;
    }
    htmlLines.push(line);
  }
  const html = htmlLines.join("\n").trim();
  const target = selector ? document.querySelector(selector) : null;
  console.log(`[LES:sse] patch-elements mode=${mode} selector="${selector}" html.len=${html.length}`);
  if (mode === "remove") {
    const toRemove = selector ? Array.from(document.querySelectorAll(selector)) : [];
    toRemove.forEach((el) => el.remove());
    return;
  }
  if (mode === "append" && target) {
    const frag = parseHTML(html);
    target.append(frag);
    return;
  }
  if (mode === "prepend" && target) {
    const frag = parseHTML(html);
    target.prepend(frag);
    return;
  }
  if (mode === "inner" && target) {
    target.innerHTML = html;
    return;
  }
  if (mode === "outer" && target) {
    const frag = parseHTML(html);
    target.replaceWith(frag);
    return;
  }
  if (mode === "before" && target) {
    const frag = parseHTML(html);
    target.before(frag);
    return;
  }
  if (mode === "after" && target) {
    const frag = parseHTML(html);
    target.after(frag);
    return;
  }
  if (!selector && html) {
    const frag = parseHTML(html);
    for (const el of Array.from(frag.children)) {
      const id = el.id;
      if (id) {
        const existing = document.getElementById(id);
        if (existing) existing.replaceWith(el);
        else document.body.append(el);
      }
    }
  }
}
function parseHTML(html) {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content;
}
function applyPatchSignals(dataLines, ctx) {
  for (const line of dataLines) {
    if (!line.startsWith("signals ") && !line.startsWith("{")) continue;
    const jsonStr = line.startsWith("signals ") ? line.slice("signals ".length) : line;
    try {
      const signals = JSON.parse(jsonStr);
      for (const [key, value] of Object.entries(signals)) {
        ctx.setSignal(key, value);
        console.log(`[LES:sse] patch-signals $${key} =`, value);
      }
    } catch {
      console.warn("[LES:sse] Failed to parse patch-signals JSON:", jsonStr);
    }
  }
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
      if (tag.includes("-")) {
        console.warn(
          `[LES] Unknown child element <${tag}> inside <local-event-script id="${config.id}"> \u2014 ignored. Did you mean a LES element?`,
          child
        );
      }
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
    if (first.startsWith("@")) return this.parseAction(text, token);
    if (text.includes(" <- ")) return this.parseBind(text, token);
    if (ANIMATION_PRIMITIVES.has(first)) return this.parseAnimation(text, token);
    if (first.includes("-") && looksLikeAnimationCall(text)) {
      return this.parseAnimation(text, token);
    }
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
  parseAction(text, token) {
    const m = text.match(/^@(\w+)\s+'([^']+)'\s*(?:\[(.+)\])?$/);
    if (!m) {
      console.warn(`[LES:parser] Malformed action: ${JSON.stringify(text)}`, token);
      return { type: "action", verb: "get", url: "", args: {} };
    }
    return {
      type: "action",
      verb: m[1].toLowerCase(),
      url: m[2],
      args: parseArgList(m[3] ?? "")
    };
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
function looksLikeAnimationCall(text) {
  const parts = text.trim().split(/\s+/);
  if (parts.length < 2) return false;
  const second = parts[1] ?? "";
  return /^[.#\[]/.test(second) || // CSS selector
  /^\d+ms$/.test(second);
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
    this._seedSignalsFromAttributes();
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
  /**
   * Reads all data-signals:KEY="VALUE" attributes on the host element and
   * pre-populates the local _signals Map with their initial values.
   *
   * Datastar evaluates these as JS expressions (e.g. "'hidden'" → "hidden",
   * "0" → 0, "[]" → []). We do the same with a simple eval.
   *
   * This runs synchronously before any async operations so that the
   * IntersectionObserver — which may fire before Datastar connects — sees
   * the correct initial signal values when evaluating `when` guards.
   */
  _seedSignalsFromAttributes() {
    for (const attr of Array.from(this.attributes)) {
      const m = attr.name.match(/^data-(?:star-)?signals:(.+)$/);
      if (!m) continue;
      const key = m[1].replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
      try {
        const value = new Function(`return (${attr.value})`)();
        this._signals.set(key, value);
        console.log(`[LES] seeded $${key} =`, value);
      } catch {
        this._signals.set(key, attr.value);
        console.log(`[LES] seeded $${key} = (raw)`, attr.value);
      }
    }
  }
  _getSignal(name) {
    if (this._dsSignal) {
      try {
        return this._dsSignal(name).value;
      } catch {
      }
    }
    if (this._signals.has(name)) return this._signals.get(name);
    if (this._signals.has(name.toLowerCase())) return this._signals.get(name.toLowerCase());
    return void 0;
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL21vZHVsZXMvYnVpbHRpbi9hbmltYXRpb24udHMiLCAiLi4vc3JjL3J1bnRpbWUvZXhlY3V0b3IudHMiLCAiLi4vc3JjL3J1bnRpbWUvcmVnaXN0cnkudHMiLCAiLi4vc3JjL21vZHVsZXMvdHlwZXMudHMiLCAiLi4vc3JjL3BhcnNlci9zdHJpcEJvZHkudHMiLCAiLi4vc3JjL3BhcnNlci9yZWFkZXIudHMiLCAiLi4vc3JjL3BhcnNlci90b2tlbml6ZXIudHMiLCAiLi4vc3JjL3BhcnNlci9wYXJzZXIudHMiLCAiLi4vc3JjL3BhcnNlci9pbmRleC50cyIsICIuLi9zcmMvcnVudGltZS93aXJpbmcudHMiLCAiLi4vc3JjL3J1bnRpbWUvc2NvcGUudHMiLCAiLi4vc3JjL3J1bnRpbWUvb2JzZXJ2ZXIudHMiLCAiLi4vc3JjL3J1bnRpbWUvc2lnbmFscy50cyIsICIuLi9zcmMvZWxlbWVudHMvTG9jYWxFdmVudFNjcmlwdC50cyIsICIuLi9zcmMvZWxlbWVudHMvTG9jYWxDb21tYW5kLnRzIiwgIi4uL3NyYy9lbGVtZW50cy9PbkV2ZW50LnRzIiwgIi4uL3NyYy9lbGVtZW50cy9PblNpZ25hbC50cyIsICIuLi9zcmMvZWxlbWVudHMvTGlmZWN5Y2xlLnRzIiwgIi4uL3NyYy9lbGVtZW50cy9Vc2VNb2R1bGUudHMiLCAiLi4vc3JjL2RhdGFzdGFyL3BsdWdpbi50cyIsICIuLi9zcmMvaW5kZXgudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogUGhhc2UgNzogQnVpbHQtaW4gYW5pbWF0aW9uIG1vZHVsZVxuICpcbiAqIEFsbCBwcmltaXRpdmVzIHVzZSB0aGUgV2ViIEFuaW1hdGlvbnMgQVBJIChlbGVtZW50LmFuaW1hdGUoKS5maW5pc2hlZClcbiAqIHNvIHRoZXkgaW50ZWdyYXRlIHdpdGggTEVTJ3MgYXN5bmMtdHJhbnNwYXJlbnQgYHRoZW5gIHNlcXVlbmNpbmc6XG4gKlxuICogICBmYWRlLWluICNzcGxhc2ggMjAwbXMgZWFzZS1vdXQgYW5kXG4gKiAgIHNsaWRlLXVwICNzcGxhc2ggMTgwbXMgZWFzZS1vdXRcbiAqICAgdGhlbiBmaXJlIHNwbGFzaDpyZWFkeSAgICAgICAgICBcdTIxOTAgb25seSBmaXJlcyBhZnRlciBCT1RIIGFuaW1hdGlvbnMgY29tcGxldGVcbiAqXG4gKiBgYW5kYCBcdTIxOTIgUHJvbWlzZS5hbGwgKGNvbmN1cnJlbnQpXG4gKiBgdGhlbmAgXHUyMTkyIHNlcXVlbnRpYWwgYXdhaXQgb24gLmZpbmlzaGVkXG4gKlxuICogVGhlIGV4ZWN1dG9yIGF3YWl0cyBlYWNoIExFU1ByaW1pdGl2ZSByZXR1cm4gdmFsdWUsIHNvIGFuaW1hdGlvblxuICogY29tcGxldGlvbiBpcyBuYXR1cmFsbHkgc2VyaWFsaXplZCB3aXRob3V0IGFueSBzZXRUaW1lb3V0IGhhY2tzLlxuICovXG5cbmltcG9ydCB0eXBlIHsgTEVTTW9kdWxlLCBMRVNQcmltaXRpdmUgfSBmcm9tICcuLi90eXBlcy5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBVdGlsaXR5OiBxdWVyeSBhbGwgbWF0Y2hpbmcgZWxlbWVudHMgd2l0aGluIHRoZSBob3N0IHNjb3BlXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gcXVlcnlBbGwoc2VsZWN0b3I6IHN0cmluZywgaG9zdDogRWxlbWVudCk6IEVsZW1lbnRbXSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgcm9vdCA9IGhvc3QuZ2V0Um9vdE5vZGUoKSBhcyBEb2N1bWVudCB8IFNoYWRvd1Jvb3RcbiAgICBjb25zdCBzY29wZSA9IHJvb3QgaW5zdGFuY2VvZiBEb2N1bWVudCA/IHJvb3QgOiByb290Lm93bmVyRG9jdW1lbnQgPz8gZG9jdW1lbnRcbiAgICByZXR1cm4gQXJyYXkuZnJvbShzY29wZS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSlcbiAgfSBjYXRjaCB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTOmFuaW1hdGlvbl0gSW52YWxpZCBzZWxlY3RvcjogXCIke3NlbGVjdG9yfVwiYClcbiAgICByZXR1cm4gW11cbiAgfVxufVxuXG4vKipcbiAqIENhbmNlbCBhbGwgcnVubmluZyBXZWIgQW5pbWF0aW9ucyBvbiBhbiBlbGVtZW50IGJlZm9yZSBzdGFydGluZyBhIG5ldyBvbmUuXG4gKiBUaGlzIHByZXZlbnRzIHRoZSBvbmUtZnJhbWUgZmxhc2ggdGhhdCBvY2N1cnMgd2hlbiBhIGZpbGw6Zm9yd2FyZHMgYW5pbWF0aW9uXG4gKiBpcyBpbnRlcnJ1cHRlZCBcdTIwMTQgd2l0aG91dCBjYW5jZWxsYXRpb24sIHRoZSBlbGVtZW50IGJyaWVmbHkgcmV2ZXJ0cyB0byBpdHNcbiAqIHVuLWFuaW1hdGVkIHN0YXRlIGFzIHRoZSBvbGQgQW5pbWF0aW9uIGlzIHJlcGxhY2VkLlxuICovXG5mdW5jdGlvbiBjYW5jZWxBbmltYXRpb25zKGVsOiBFbGVtZW50KTogdm9pZCB7XG4gIGZvciAoY29uc3QgYW5pbSBvZiAoZWwgYXMgSFRNTEVsZW1lbnQpLmdldEFuaW1hdGlvbnMoKSkge1xuICAgIGFuaW0uY2FuY2VsKClcbiAgfVxufVxuXG4vKiogQXdhaXRzIGFsbCBBbmltYXRpb24uZmluaXNoZWQgcHJvbWlzZXMuIFJldHVybnMgaW1tZWRpYXRlbHkgaWYgbm8gZWxlbWVudHMgbWF0Y2hlZC4gKi9cbmFzeW5jIGZ1bmN0aW9uIGFuaW1hdGVBbGwoXG4gIGVsczogRWxlbWVudFtdLFxuICBrZXlmcmFtZXM6IEtleWZyYW1lW10sXG4gIG9wdGlvbnM6IEtleWZyYW1lQW5pbWF0aW9uT3B0aW9uc1xuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChlbHMubGVuZ3RoID09PSAwKSByZXR1cm5cbiAgLy8gQ2FuY2VsIGFueSBpbi1wcm9ncmVzcyBvciBmaWxsOmZvcndhcmRzIGFuaW1hdGlvbnMgZmlyc3Qgc28gd2Ugc3RhcnQgY2xlYW4uXG4gIGVscy5mb3JFYWNoKGNhbmNlbEFuaW1hdGlvbnMpXG4gIGF3YWl0IFByb21pc2UuYWxsKFxuICAgIGVscy5tYXAoZWwgPT4gKGVsIGFzIEhUTUxFbGVtZW50KS5hbmltYXRlKGtleWZyYW1lcywgb3B0aW9ucykuZmluaXNoZWRcbiAgICAgIC5jYXRjaCgoZXJyOiB1bmtub3duKSA9PiB7XG4gICAgICAgIC8vIEFib3J0RXJyb3IgaXMgZXhwZWN0ZWQgd2hlbiBjYW5jZWxBbmltYXRpb25zKCkgaW50ZXJydXB0cyBhIHJ1bm5pbmdcbiAgICAgICAgLy8gYW5pbWF0aW9uLiBTd2FsbG93IGl0IFx1MjAxNCB0aGUgbmV3IGFuaW1hdGlvbiBoYXMgYWxyZWFkeSBzdGFydGVkLlxuICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgRE9NRXhjZXB0aW9uICYmIGVyci5uYW1lID09PSAnQWJvcnRFcnJvcicpIHJldHVyblxuICAgICAgICB0aHJvdyBlcnJcbiAgICAgIH0pXG4gICAgKVxuICApXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gRGlyZWN0aW9uIGhlbHBlcnNcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG50eXBlIERpcmVjdGlvbiA9ICdsZWZ0JyB8ICdyaWdodCcgfCAndXAnIHwgJ2Rvd24nXG5cbmZ1bmN0aW9uIHNsaWRlS2V5ZnJhbWVzKGRpcjogRGlyZWN0aW9uLCBlbnRlcmluZzogYm9vbGVhbik6IEtleWZyYW1lW10ge1xuICBjb25zdCBkaXN0YW5jZSA9ICc4MHB4J1xuICBjb25zdCB0cmFuc2xhdGlvbnM6IFJlY29yZDxEaXJlY3Rpb24sIHN0cmluZz4gPSB7XG4gICAgbGVmdDogIGB0cmFuc2xhdGVYKC0ke2Rpc3RhbmNlfSlgLFxuICAgIHJpZ2h0OiBgdHJhbnNsYXRlWCgke2Rpc3RhbmNlfSlgLFxuICAgIHVwOiAgICBgdHJhbnNsYXRlWSgtJHtkaXN0YW5jZX0pYCxcbiAgICBkb3duOiAgYHRyYW5zbGF0ZVkoJHtkaXN0YW5jZX0pYCxcbiAgfVxuICBjb25zdCB0cmFuc2xhdGUgPSB0cmFuc2xhdGlvbnNbZGlyXVxuICBpZiAoZW50ZXJpbmcpIHtcbiAgICByZXR1cm4gW1xuICAgICAgeyBvcGFjaXR5OiAwLCB0cmFuc2Zvcm06IHRyYW5zbGF0ZSB9LFxuICAgICAgeyBvcGFjaXR5OiAxLCB0cmFuc2Zvcm06ICdub25lJyB9LFxuICAgIF1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gW1xuICAgICAgeyBvcGFjaXR5OiAxLCB0cmFuc2Zvcm06ICdub25lJyB9LFxuICAgICAgeyBvcGFjaXR5OiAwLCB0cmFuc2Zvcm06IHRyYW5zbGF0ZSB9LFxuICAgIF1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIENvcmUgcHJpbWl0aXZlc1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmNvbnN0IGZhZGVJbjogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBfb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgYXdhaXQgYW5pbWF0ZUFsbChlbHMsXG4gICAgW3sgb3BhY2l0eTogMCB9LCB7IG9wYWNpdHk6IDEgfV0sXG4gICAgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnIH1cbiAgKVxufVxuXG5jb25zdCBmYWRlT3V0OiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIF9vcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBhd2FpdCBhbmltYXRlQWxsKGVscyxcbiAgICBbeyBvcGFjaXR5OiAxIH0sIHsgb3BhY2l0eTogMCB9XSxcbiAgICB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdmb3J3YXJkcycgfVxuICApXG59XG5cbmNvbnN0IHNsaWRlSW46IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBmcm9tID0gKG9wdHNbJ2Zyb20nXSBhcyBEaXJlY3Rpb24gfCB1bmRlZmluZWQpID8/ICdyaWdodCdcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLCBzbGlkZUtleWZyYW1lcyhmcm9tLCB0cnVlKSwgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnIH0pXG59XG5cbmNvbnN0IHNsaWRlT3V0OiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIG9wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgdG8gPSAob3B0c1sndG8nXSBhcyBEaXJlY3Rpb24gfCB1bmRlZmluZWQpID8/ICdsZWZ0J1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgYXdhaXQgYW5pbWF0ZUFsbChlbHMsIHNsaWRlS2V5ZnJhbWVzKHRvLCBmYWxzZSksIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9KVxufVxuXG5jb25zdCBzbGlkZVVwOiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIF9vcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBhd2FpdCBhbmltYXRlQWxsKGVscywgc2xpZGVLZXlmcmFtZXMoJ3VwJywgdHJ1ZSksIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9KVxufVxuXG5jb25zdCBzbGlkZURvd246IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgX29wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLCBzbGlkZUtleWZyYW1lcygnZG93bicsIGZhbHNlKSwgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnIH0pXG59XG5cbi8qKlxuICogcHVsc2UgXHUyMDE0IGJyaWVmIHNjYWxlICsgb3BhY2l0eSBwdWxzZSB0byBkcmF3IGF0dGVudGlvbiB0byB1cGRhdGVkIGl0ZW1zLlxuICogVXNlZCBmb3IgRDMgXCJ1cGRhdGVcIiBwaGFzZTogaXRlbXMgd2hvc2UgY29udGVudCBjaGFuZ2VkIGdldCBhIHZpc3VhbCBwaW5nLlxuICovXG5jb25zdCBwdWxzZTogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBfb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgYXdhaXQgYW5pbWF0ZUFsbChlbHMsIFtcbiAgICB7IG9wYWNpdHk6IDEsICAgIHRyYW5zZm9ybTogJ3NjYWxlKDEpJyB9LFxuICAgIHsgb3BhY2l0eTogMC43NSwgdHJhbnNmb3JtOiAnc2NhbGUoMS4wMyknLCBvZmZzZXQ6IDAuNCB9LFxuICAgIHsgb3BhY2l0eTogMSwgICAgdHJhbnNmb3JtOiAnc2NhbGUoMSknIH0sXG4gIF0sIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ25vbmUnIH0pXG59XG5cbi8qKlxuICogc3RhZ2dlci1lbnRlciBcdTIwMTQgcnVucyBzbGlkZUluIG9uIGVhY2ggbWF0Y2hlZCBlbGVtZW50IGluIHNlcXVlbmNlLFxuICogb2Zmc2V0IGJ5IGBnYXBgIG1pbGxpc2Vjb25kcyBiZXR3ZWVuIGVhY2guXG4gKlxuICogT3B0aW9uczpcbiAqICAgZ2FwOiBObXMgICBcdTIwMTQgZGVsYXkgYmV0d2VlbiBlYWNoIGVsZW1lbnQgKGRlZmF1bHQ6IDQwbXMpXG4gKiAgIGZyb206IGRpciAgXHUyMDE0ICdsZWZ0JyB8ICdyaWdodCcgfCAndXAnIHwgJ2Rvd24nIChkZWZhdWx0OiAncmlnaHQnKVxuICpcbiAqIEFsbCBhbmltYXRpb25zIGFyZSBzdGFydGVkIHRvZ2V0aGVyIChQcm9taXNlLmFsbCkgYnV0IGVhY2ggaGFzIGFuXG4gKiBpbmNyZWFzaW5nIGBkZWxheWAgXHUyMDE0IHRoaXMgZ2l2ZXMgdGhlIHN0YWdnZXIgZWZmZWN0IHdoaWxlIGtlZXBpbmdcbiAqIHRoZSB0b3RhbCBQcm9taXNlLXNldHRsZWQgdGltZSA9IGR1cmF0aW9uICsgKG4tMSkgKiBnYXAuXG4gKi9cbmNvbnN0IHN0YWdnZXJFbnRlcjogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBvcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBpZiAoZWxzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgY29uc3QgZ2FwICA9IHBhcnNlTXMob3B0c1snZ2FwJ10gYXMgc3RyaW5nIHwgbnVtYmVyIHwgdW5kZWZpbmVkLCA0MClcbiAgY29uc3QgZnJvbSA9IChvcHRzWydmcm9tJ10gYXMgRGlyZWN0aW9uIHwgdW5kZWZpbmVkKSA/PyAncmlnaHQnXG5cbiAgZWxzLmZvckVhY2goY2FuY2VsQW5pbWF0aW9ucylcbiAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgZWxzLm1hcCgoZWwsIGkpID0+XG4gICAgICAoZWwgYXMgSFRNTEVsZW1lbnQpLmFuaW1hdGUoXG4gICAgICAgIHNsaWRlS2V5ZnJhbWVzKGZyb20sIHRydWUpLFxuICAgICAgICB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdmb3J3YXJkcycsIGRlbGF5OiBpICogZ2FwIH1cbiAgICAgICkuZmluaXNoZWQuY2F0Y2goKGVycjogdW5rbm93bikgPT4ge1xuICAgICAgICBpZiAoZXJyIGluc3RhbmNlb2YgRE9NRXhjZXB0aW9uICYmIGVyci5uYW1lID09PSAnQWJvcnRFcnJvcicpIHJldHVyblxuICAgICAgICB0aHJvdyBlcnJcbiAgICAgIH0pXG4gICAgKVxuICApXG59XG5cbi8qKlxuICogc3RhZ2dlci1leGl0IFx1MjAxNCBydW5zIHNsaWRlT3V0IG9uIGVhY2ggbWF0Y2hlZCBlbGVtZW50IGluIHNlcXVlbmNlLlxuICpcbiAqIE9wdGlvbnM6XG4gKiAgIGdhcDogTm1zICAgICAgICAgIFx1MjAxNCBkZWxheSBiZXR3ZWVuIGVhY2ggZWxlbWVudCAoZGVmYXVsdDogMjBtcylcbiAqICAgZGlyZWN0aW9uOiByZXZlcnNlIFx1MjAxNCBwcm9jZXNzIGVsZW1lbnRzIGluIHJldmVyc2Ugb3JkZXJcbiAqICAgdG86IGRpciAgICAgICAgICAgXHUyMDE0IGV4aXQgZGlyZWN0aW9uIChkZWZhdWx0OiAnbGVmdCcpXG4gKi9cbmNvbnN0IHN0YWdnZXJFeGl0OiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIG9wdHMsIGhvc3QpID0+IHtcbiAgLy8gRmlsdGVyIHRvIG9ubHkgZWxlbWVudHMgdGhhdCBhcmUgYWN0dWFsbHkgdmlzaWJsZSBcdTIwMTQgc2tpcCBoaWRkZW4vYWxyZWFkeS1leGl0ZWQgb25lc1xuICBsZXQgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpLmZpbHRlcihlbCA9PiB7XG4gICAgY29uc3Qgc3R5bGUgPSB3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZShlbCBhcyBIVE1MRWxlbWVudClcbiAgICByZXR1cm4gc3R5bGUuZGlzcGxheSAhPT0gJ25vbmUnICYmIHN0eWxlLnZpc2liaWxpdHkgIT09ICdoaWRkZW4nXG4gIH0pXG4gIGlmIChlbHMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICBjb25zdCBnYXAgICAgID0gcGFyc2VNcyhvcHRzWydnYXAnXSBhcyBzdHJpbmcgfCBudW1iZXIgfCB1bmRlZmluZWQsIDIwKVxuICBjb25zdCByZXZlcnNlID0gU3RyaW5nKG9wdHNbJ2RpcmVjdGlvbiddID8/ICcnKSA9PT0gJ3JldmVyc2UnXG4gIGNvbnN0IHRvICAgICAgPSAob3B0c1sndG8nXSBhcyBEaXJlY3Rpb24gfCB1bmRlZmluZWQpID8/ICdsZWZ0J1xuXG4gIGlmIChyZXZlcnNlKSBlbHMgPSBbLi4uZWxzXS5yZXZlcnNlKClcblxuICBlbHMuZm9yRWFjaChjYW5jZWxBbmltYXRpb25zKVxuICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBlbHMubWFwKChlbCwgaSkgPT5cbiAgICAgIChlbCBhcyBIVE1MRWxlbWVudCkuYW5pbWF0ZShcbiAgICAgICAgc2xpZGVLZXlmcmFtZXModG8sIGZhbHNlKSxcbiAgICAgICAgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnLCBkZWxheTogaSAqIGdhcCB9XG4gICAgICApLmZpbmlzaGVkLmNhdGNoKChlcnI6IHVua25vd24pID0+IHtcbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnIubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSByZXR1cm5cbiAgICAgICAgdGhyb3cgZXJyXG4gICAgICB9KVxuICAgIClcbiAgKVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFV0aWxpdHk6IHBhcnNlIGEgbWlsbGlzZWNvbmQgdmFsdWUgZnJvbSBhIHN0cmluZyBsaWtlIFwiNDBtc1wiIG9yIGEgbnVtYmVyXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gcGFyc2VNcyh2YWw6IHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgZmFsbGJhY2s6IG51bWJlcik6IG51bWJlciB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCB8fCB2YWwgPT09IG51bGwpIHJldHVybiBmYWxsYmFja1xuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHJldHVybiB2YWxcbiAgY29uc3QgbSA9IFN0cmluZyh2YWwpLm1hdGNoKC9eKFxcZCsoPzpcXC5cXGQrKT8pbXMkLylcbiAgaWYgKG0pIHJldHVybiBwYXJzZUZsb2F0KG1bMV0hKVxuICBjb25zdCBuID0gcGFyc2VGbG9hdChTdHJpbmcodmFsKSlcbiAgcmV0dXJuIE51bWJlci5pc05hTihuKSA/IGZhbGxiYWNrIDogblxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIE1vZHVsZSBleHBvcnRcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5jb25zdCBhbmltYXRpb25Nb2R1bGU6IExFU01vZHVsZSA9IHtcbiAgbmFtZTogJ2FuaW1hdGlvbicsXG4gIHByaW1pdGl2ZXM6IHtcbiAgICAnZmFkZS1pbic6ICAgICAgIGZhZGVJbixcbiAgICAnZmFkZS1vdXQnOiAgICAgIGZhZGVPdXQsXG4gICAgJ3NsaWRlLWluJzogICAgICBzbGlkZUluLFxuICAgICdzbGlkZS1vdXQnOiAgICAgc2xpZGVPdXQsXG4gICAgJ3NsaWRlLXVwJzogICAgICBzbGlkZVVwLFxuICAgICdzbGlkZS1kb3duJzogICAgc2xpZGVEb3duLFxuICAgICdwdWxzZSc6ICAgICAgICAgcHVsc2UsXG4gICAgJ3N0YWdnZXItZW50ZXInOiBzdGFnZ2VyRW50ZXIsXG4gICAgJ3N0YWdnZXItZXhpdCc6ICBzdGFnZ2VyRXhpdCxcbiAgfSxcbn1cblxuZXhwb3J0IGRlZmF1bHQgYW5pbWF0aW9uTW9kdWxlXG4iLCAiaW1wb3J0IHR5cGUge1xuICBMRVNOb2RlLCBFeHByTm9kZSwgU2VxdWVuY2VOb2RlLCBQYXJhbGxlbE5vZGUsXG4gIFNldE5vZGUsIEVtaXROb2RlLCBCcm9hZGNhc3ROb2RlLCBXYWl0Tm9kZSxcbiAgQ2FsbE5vZGUsIEJpbmROb2RlLCBNYXRjaE5vZGUsIFRyeU5vZGUsIEFuaW1hdGlvbk5vZGUsXG59IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuaW1wb3J0IHR5cGUgeyBQYXR0ZXJuTm9kZSB9IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuaW1wb3J0IHsgTEVTU2NvcGUgfSBmcm9tICcuL3Njb3BlLmpzJ1xuaW1wb3J0IHR5cGUgeyBDb21tYW5kUmVnaXN0cnkgfSBmcm9tICcuL3JlZ2lzdHJ5LmpzJ1xuaW1wb3J0IHR5cGUgeyBNb2R1bGVSZWdpc3RyeSB9IGZyb20gJ0Btb2R1bGVzL3R5cGVzLmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEV4ZWN1dGlvbiBjb250ZXh0IFx1MjAxNCBldmVyeXRoaW5nIHRoZSBleGVjdXRvciBuZWVkcywgcGFzc2VkIGRvd24gdGhlIGNhbGwgdHJlZVxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBpbnRlcmZhY2UgTEVTQ29udGV4dCB7XG4gIC8qKiBMb2NhbCB2YXJpYWJsZSBzY29wZSBmb3IgdGhlIGN1cnJlbnQgY2FsbCBmcmFtZSAqL1xuICBzY29wZTogTEVTU2NvcGVcbiAgLyoqIFRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBob3N0IGVsZW1lbnQgXHUyMDE0IHVzZWQgYXMgcXVlcnlTZWxlY3RvciByb290ICovXG4gIGhvc3Q6IEVsZW1lbnRcbiAgLyoqIENvbW1hbmQgZGVmaW5pdGlvbnMgcmVnaXN0ZXJlZCBieSA8bG9jYWwtY29tbWFuZD4gY2hpbGRyZW4gKi9cbiAgY29tbWFuZHM6IENvbW1hbmRSZWdpc3RyeVxuICAvKiogQW5pbWF0aW9uIGFuZCBvdGhlciBwcmltaXRpdmUgbW9kdWxlcyAqL1xuICBtb2R1bGVzOiBNb2R1bGVSZWdpc3RyeVxuICAvKiogUmVhZCBhIERhdGFzdGFyIHNpZ25hbCB2YWx1ZSBieSBuYW1lICh3aXRob3V0ICQgcHJlZml4KSAqL1xuICBnZXRTaWduYWw6IChuYW1lOiBzdHJpbmcpID0+IHVua25vd25cbiAgLyoqIFdyaXRlIGEgRGF0YXN0YXIgc2lnbmFsIHZhbHVlIGJ5IG5hbWUgKHdpdGhvdXQgJCBwcmVmaXgpICovXG4gIHNldFNpZ25hbDogKG5hbWU6IHN0cmluZywgdmFsdWU6IHVua25vd24pID0+IHZvaWRcbiAgLyoqIERpc3BhdGNoIGEgbG9jYWwgQ3VzdG9tRXZlbnQgb24gdGhlIGhvc3QgKGJ1YmJsZXM6IGZhbHNlKSAqL1xuICBlbWl0TG9jYWw6IChldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHZvaWRcbiAgLyoqIERpc3BhdGNoIGEgRE9NLXdpZGUgQ3VzdG9tRXZlbnQgKGJ1YmJsZXM6IHRydWUsIGNvbXBvc2VkOiB0cnVlKSAqL1xuICBicm9hZGNhc3Q6IChldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHZvaWRcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBNYWluIGV4ZWN1dG9yXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBFeGVjdXRlcyBhIExFU05vZGUgQVNUIGluIHRoZSBnaXZlbiBjb250ZXh0LlxuICpcbiAqIEFzeW5jIHRyYW5zcGFyZW5jeTogZXZlcnkgc3RlcCBpcyBhd2FpdGVkIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciBpdFxuICogaXMgc3luY2hyb25vdXMgb3IgcmV0dXJucyBhIFByb21pc2UuIFRoZSBhdXRob3IgbmV2ZXIgd3JpdGVzIGBhd2FpdGAuXG4gKiBUaGUgYHRoZW5gIGNvbm5lY3RpdmUgaW4gTEVTIHNvdXJjZSBtYXBzIHRvIHNlcXVlbnRpYWwgYGF3YWl0YCBoZXJlLlxuICogVGhlIGBhbmRgIGNvbm5lY3RpdmUgbWFwcyB0byBgUHJvbWlzZS5hbGxgLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZShub2RlOiBMRVNOb2RlLCBjdHg6IExFU0NvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgc3dpdGNoIChub2RlLnR5cGUpIHtcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBTZXF1ZW5jZTogQSB0aGVuIEIgdGhlbiBDIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3NlcXVlbmNlJzpcbiAgICAgIGZvciAoY29uc3Qgc3RlcCBvZiAobm9kZSBhcyBTZXF1ZW5jZU5vZGUpLnN0ZXBzKSB7XG4gICAgICAgIGF3YWl0IGV4ZWN1dGUoc3RlcCwgY3R4KVxuICAgICAgfVxuICAgICAgcmV0dXJuXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgUGFyYWxsZWw6IEEgYW5kIEIgYW5kIEMgKFByb21pc2UuYWxsKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdwYXJhbGxlbCc6XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbCgobm9kZSBhcyBQYXJhbGxlbE5vZGUpLmJyYW5jaGVzLm1hcChiID0+IGV4ZWN1dGUoYiwgY3R4KSkpXG4gICAgICByZXR1cm5cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBzZXQgJHNpZ25hbCB0byBleHByIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3NldCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIFNldE5vZGVcbiAgICAgIGNvbnN0IHZhbHVlID0gZXZhbEV4cHIobi52YWx1ZSwgY3R4KVxuICAgICAgY3R4LnNldFNpZ25hbChuLnNpZ25hbCwgdmFsdWUpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgZW1pdCBldmVudDpuYW1lIFtwYXlsb2FkXSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdlbWl0Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgRW1pdE5vZGVcbiAgICAgIGNvbnN0IHBheWxvYWQgPSBuLnBheWxvYWQubWFwKHAgPT4gZXZhbEV4cHIocCwgY3R4KSlcbiAgICAgIGN0eC5lbWl0TG9jYWwobi5ldmVudCwgcGF5bG9hZClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBicm9hZGNhc3QgZXZlbnQ6bmFtZSBbcGF5bG9hZF0gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnYnJvYWRjYXN0Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQnJvYWRjYXN0Tm9kZVxuICAgICAgY29uc3QgcGF5bG9hZCA9IG4ucGF5bG9hZC5tYXAocCA9PiBldmFsRXhwcihwLCBjdHgpKVxuICAgICAgY3R4LmJyb2FkY2FzdChuLmV2ZW50LCBwYXlsb2FkKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIHdhaXQgTm1zIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3dhaXQnOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBXYWl0Tm9kZVxuICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG4ubXMpKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIGNhbGwgY29tbWFuZDpuYW1lIFthcmdzXSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdjYWxsJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQ2FsbE5vZGVcbiAgICAgIGNvbnN0IGRlZiA9IGN0eC5jb21tYW5kcy5nZXQobi5jb21tYW5kKVxuICAgICAgaWYgKCFkZWYpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBbTEVTXSBVbmtub3duIGNvbW1hbmQ6IFwiJHtuLmNvbW1hbmR9XCJgKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgLy8gRXZhbHVhdGUgZ3VhcmQgXHUyMDE0IGZhbHN5ID0gc2lsZW50IG5vLW9wIChub3QgYW4gZXJyb3IsIG5vIHJlc2N1ZSlcbiAgICAgIGlmIChkZWYuZ3VhcmQpIHtcbiAgICAgICAgY29uc3QgcGFzc2VzID0gZXZhbEd1YXJkKGRlZi5ndWFyZCwgY3R4KVxuICAgICAgICBpZiAoIXBhc3Nlcykge1xuICAgICAgICAgIGNvbnNvbGUuZGVidWcoYFtMRVNdIGNvbW1hbmQgXCIke24uY29tbWFuZH1cIiBndWFyZCByZWplY3RlZGApXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gQnVpbGQgY2hpbGQgc2NvcGU6IGJpbmQgYXJncyBpbnRvIGl0XG4gICAgICBjb25zdCBjaGlsZFNjb3BlID0gY3R4LnNjb3BlLmNoaWxkKClcbiAgICAgIGNvbnN0IGV2YWxlZEFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge31cbiAgICAgIGZvciAoY29uc3QgW2tleSwgZXhwck5vZGVdIG9mIE9iamVjdC5lbnRyaWVzKG4uYXJncykpIHtcbiAgICAgICAgZXZhbGVkQXJnc1trZXldID0gZXZhbEV4cHIoZXhwck5vZGUsIGN0eClcbiAgICAgIH1cblxuICAgICAgLy8gQXBwbHkgYXJnIGRlZmF1bHRzIGZyb20gZGVmIChQaGFzZSAyIEFyZ0RlZiBwYXJzaW5nIFx1MjAxNCBzaW1wbGlmaWVkIGhlcmUpXG4gICAgICBmb3IgKGNvbnN0IGFyZ0RlZiBvZiBkZWYuYXJncykge1xuICAgICAgICBpZiAoIShhcmdEZWYubmFtZSBpbiBldmFsZWRBcmdzKSAmJiBhcmdEZWYuZGVmYXVsdCkge1xuICAgICAgICAgIGV2YWxlZEFyZ3NbYXJnRGVmLm5hbWVdID0gZXZhbEV4cHIoYXJnRGVmLmRlZmF1bHQsIGN0eClcbiAgICAgICAgfVxuICAgICAgICBjaGlsZFNjb3BlLnNldChhcmdEZWYubmFtZSwgZXZhbGVkQXJnc1thcmdEZWYubmFtZV0gPz8gbnVsbClcbiAgICAgIH1cblxuICAgICAgY29uc3QgY2hpbGRDdHg6IExFU0NvbnRleHQgPSB7IC4uLmN0eCwgc2NvcGU6IGNoaWxkU2NvcGUgfVxuICAgICAgYXdhaXQgZXhlY3V0ZShkZWYuYm9keSwgY2hpbGRDdHgpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgbmFtZSA8LSBAdmVyYiAndXJsJyBbYXJnc10gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnYmluZCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIEJpbmROb2RlXG4gICAgICBjb25zdCB7IHZlcmIsIHVybCwgYXJncyB9ID0gbi5hY3Rpb25cbiAgICAgIGNvbnN0IGV2YWxlZEFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge31cbiAgICAgIGZvciAoY29uc3QgW2tleSwgZXhwck5vZGVdIG9mIE9iamVjdC5lbnRyaWVzKGFyZ3MpKSB7XG4gICAgICAgIGV2YWxlZEFyZ3Nba2V5XSA9IGV2YWxFeHByKGV4cHJOb2RlLCBjdHgpXG4gICAgICB9XG5cbiAgICAgIGxldCByZXN1bHQ6IHVua25vd25cbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9IGF3YWl0IHBlcmZvcm1BY3Rpb24odmVyYiwgdXJsLCBldmFsZWRBcmdzLCBjdHgpXG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgLy8gUHJvcGFnYXRlIHNvIGVuY2xvc2luZyB0cnkvcmVzY3VlIGNhbiBjYXRjaCBpdFxuICAgICAgICB0aHJvdyBlcnJcbiAgICAgIH1cblxuICAgICAgY3R4LnNjb3BlLnNldChuLm5hbWUsIHJlc3VsdClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBtYXRjaCBzdWJqZWN0IC8gYXJtcyAvIC9tYXRjaCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdtYXRjaCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIE1hdGNoTm9kZVxuICAgICAgY29uc3Qgc3ViamVjdCA9IGV2YWxFeHByKG4uc3ViamVjdCwgY3R4KVxuXG4gICAgICBmb3IgKGNvbnN0IGFybSBvZiBuLmFybXMpIHtcbiAgICAgICAgY29uc3QgYmluZGluZ3MgPSBtYXRjaFBhdHRlcm5zKGFybS5wYXR0ZXJucywgc3ViamVjdClcbiAgICAgICAgaWYgKGJpbmRpbmdzICE9PSBudWxsKSB7XG4gICAgICAgICAgLy8gQ3JlYXRlIGNoaWxkIHNjb3BlIHdpdGggcGF0dGVybiBiaW5kaW5nc1xuICAgICAgICAgIGNvbnN0IGFybVNjb3BlID0gY3R4LnNjb3BlLmNoaWxkKClcbiAgICAgICAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhiaW5kaW5ncykpIHtcbiAgICAgICAgICAgIGFybVNjb3BlLnNldChrLCB2KVxuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBhcm1DdHg6IExFU0NvbnRleHQgPSB7IC4uLmN0eCwgc2NvcGU6IGFybVNjb3BlIH1cbiAgICAgICAgICBhd2FpdCBleGVjdXRlKGFybS5ib2R5LCBhcm1DdHgpXG4gICAgICAgICAgcmV0dXJuICAgLy8gRmlyc3QgbWF0Y2hpbmcgYXJtIHdpbnMgXHUyMDE0IG5vIGZhbGx0aHJvdWdoXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSBtYXRjaDogbm8gYXJtIG1hdGNoZWQgc3ViamVjdDonLCBzdWJqZWN0KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIHRyeSAvIHJlc2N1ZSAvIGFmdGVyd2FyZHMgLyAvdHJ5IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3RyeSc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIFRyeU5vZGVcbiAgICAgIGxldCB0aHJldyA9IGZhbHNlXG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGV4ZWN1dGUobi5ib2R5LCBjdHgpXG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgdGhyZXcgPSB0cnVlXG4gICAgICAgIGlmIChuLnJlc2N1ZSkge1xuICAgICAgICAgIC8vIEJpbmQgdGhlIGVycm9yIGFzIGAkZXJyb3JgIGluIHRoZSByZXNjdWUgc2NvcGVcbiAgICAgICAgICBjb25zdCByZXNjdWVTY29wZSA9IGN0eC5zY29wZS5jaGlsZCgpXG4gICAgICAgICAgcmVzY3VlU2NvcGUuc2V0KCdlcnJvcicsIGVycilcbiAgICAgICAgICBjb25zdCByZXNjdWVDdHg6IExFU0NvbnRleHQgPSB7IC4uLmN0eCwgc2NvcGU6IHJlc2N1ZVNjb3BlIH1cbiAgICAgICAgICBhd2FpdCBleGVjdXRlKG4ucmVzY3VlLCByZXNjdWVDdHgpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gTm8gcmVzY3VlIGNsYXVzZSBcdTIwMTQgcmUtdGhyb3cgc28gb3V0ZXIgdHJ5IGNhbiBjYXRjaCBpdFxuICAgICAgICAgIHRocm93IGVyclxuICAgICAgICB9XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBpZiAobi5hZnRlcndhcmRzKSB7XG4gICAgICAgICAgLy8gYWZ0ZXJ3YXJkcyBhbHdheXMgcnVucyBpZiBleGVjdXRpb24gZW50ZXJlZCB0aGUgdHJ5IGJvZHlcbiAgICAgICAgICAvLyAoZ3VhcmQgcmVqZWN0aW9uIG5ldmVyIHJlYWNoZXMgaGVyZSBcdTIwMTQgc2VlIGBjYWxsYCBoYW5kbGVyIGFib3ZlKVxuICAgICAgICAgIGF3YWl0IGV4ZWN1dGUobi5hZnRlcndhcmRzLCBjdHgpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRocmV3ICYmICFuLnJlc2N1ZSkge1xuICAgICAgICAvLyBBbHJlYWR5IHJlLXRocm93biBhYm92ZSBcdTIwMTQgdW5yZWFjaGFibGUsIGJ1dCBUeXBlU2NyaXB0IG5lZWRzIHRoaXNcbiAgICAgIH1cbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBhbmltYXRpb24gcHJpbWl0aXZlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ2FuaW1hdGlvbic6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIEFuaW1hdGlvbk5vZGVcbiAgICAgIGNvbnN0IHByaW1pdGl2ZSA9IGN0eC5tb2R1bGVzLmdldChuLnByaW1pdGl2ZSlcblxuICAgICAgaWYgKCFwcmltaXRpdmUpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGN0eC5tb2R1bGVzLmhpbnRGb3Iobi5wcmltaXRpdmUpKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgLy8gUmVzb2x2ZSBzZWxlY3RvciBcdTIwMTQgc3Vic3RpdHV0ZSBhbnkgbG9jYWwgdmFyaWFibGUgcmVmZXJlbmNlc1xuICAgICAgY29uc3Qgc2VsZWN0b3IgPSByZXNvbHZlU2VsZWN0b3Iobi5zZWxlY3RvciwgY3R4KVxuXG4gICAgICAvLyBFdmFsdWF0ZSBvcHRpb25zXG4gICAgICBjb25zdCBvcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIGV4cHJOb2RlXSBvZiBPYmplY3QuZW50cmllcyhuLm9wdGlvbnMpKSB7XG4gICAgICAgIG9wdGlvbnNba2V5XSA9IGV2YWxFeHByKGV4cHJOb2RlLCBjdHgpXG4gICAgICB9XG5cbiAgICAgIC8vIEF3YWl0IHRoZSBhbmltYXRpb24gXHUyMDE0IHRoaXMgaXMgdGhlIGNvcmUgb2YgYXN5bmMgdHJhbnNwYXJlbmN5OlxuICAgICAgLy8gV2ViIEFuaW1hdGlvbnMgQVBJIHJldHVybnMgYW4gQW5pbWF0aW9uIHdpdGggYSAuZmluaXNoZWQgUHJvbWlzZS5cbiAgICAgIC8vIGB0aGVuYCBpbiBMRVMgc291cmNlIGF3YWl0cyB0aGlzIG5hdHVyYWxseS5cbiAgICAgIGF3YWl0IHByaW1pdGl2ZShzZWxlY3Rvciwgbi5kdXJhdGlvbiwgbi5lYXNpbmcsIG9wdGlvbnMsIGN0eC5ob3N0KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIHJhdyBleHByZXNzaW9uIChlc2NhcGUgaGF0Y2ggLyB1bmtub3duIHN0YXRlbWVudHMpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ2V4cHInOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBFeHByTm9kZVxuICAgICAgaWYgKG4ucmF3LnRyaW0oKSkge1xuICAgICAgICAvLyBFdmFsdWF0ZSBhcyBhIEpTIGV4cHJlc3Npb24gZm9yIHNpZGUgZWZmZWN0c1xuICAgICAgICAvLyBUaGlzIGhhbmRsZXMgdW5rbm93biBwcmltaXRpdmVzIGFuZCBmdXR1cmUga2V5d29yZHMgZ3JhY2VmdWxseVxuICAgICAgICBldmFsRXhwcihuLCBjdHgpXG4gICAgICB9XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgYWN0aW9uIChiYXJlIEBnZXQgZXRjLiBub3QgaW5zaWRlIGEgYmluZCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgLy8gYEBnZXQgJy9hcGkvZmVlZCcgW2ZpbHRlcjogJGFjdGl2ZUZpbHRlcl1gXG4gICAgLy8gQXdhaXRzIHRoZSBmdWxsIFNTRSBzdHJlYW0gLyBKU09OIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlci5cbiAgICAvLyBEYXRhc3RhciBwcm9jZXNzZXMgdGhlIFNTRSBldmVudHMgKHBhdGNoLWVsZW1lbnRzLCBwYXRjaC1zaWduYWxzKSBhc1xuICAgIC8vIHRoZXkgYXJyaXZlLiBUaGUgUHJvbWlzZSByZXNvbHZlcyB3aGVuIHRoZSBzdHJlYW0gY2xvc2VzLlxuICAgIC8vIGB0aGVuYCBpbiBMRVMgY29ycmVjdGx5IHdhaXRzIGZvciB0aGlzIGJlZm9yZSBwcm9jZWVkaW5nLlxuICAgIGNhc2UgJ2FjdGlvbic6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlXG4gICAgICBjb25zdCBldmFsZWRBcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIGV4cHJOb2RlXSBvZiBPYmplY3QuZW50cmllcyhuLmFyZ3MpKSB7XG4gICAgICAgIGV2YWxlZEFyZ3Nba2V5XSA9IGV2YWxFeHByKGV4cHJOb2RlLCBjdHgpXG4gICAgICB9XG4gICAgICBhd2FpdCBwZXJmb3JtQWN0aW9uKG4udmVyYiwgbi51cmwsIGV2YWxlZEFyZ3MsIGN0eClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGRlZmF1bHQ6IHtcbiAgICAgIGNvbnN0IGV4aGF1c3RpdmU6IG5ldmVyID0gbm9kZVxuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSBVbmtub3duIG5vZGUgdHlwZTonLCAoZXhoYXVzdGl2ZSBhcyBMRVNOb2RlKS50eXBlKVxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEV4cHJlc3Npb24gZXZhbHVhdGlvblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogRXZhbHVhdGVzIGEgcmF3IEpTIGV4cHJlc3Npb24gc3RyaW5nIGluIGEgc2FuZGJveGVkIGNvbnRleHQgdGhhdFxuICogZXhwb3NlcyBzY29wZSBsb2NhbHMgYW5kIERhdGFzdGFyIHNpZ25hbHMgdmlhIGEgUHJveHkuXG4gKlxuICogU2lnbmFsIGFjY2VzczogYCRmZWVkU3RhdGVgIFx1MjE5MiByZWFkcyB0aGUgYGZlZWRTdGF0ZWAgc2lnbmFsXG4gKiBMb2NhbCBhY2Nlc3M6ICBgZmlsdGVyYCAgICBcdTIxOTIgcmVhZHMgZnJvbSBzY29wZVxuICpcbiAqIFRoZSBzYW5kYm94IGlzIGludGVudGlvbmFsbHkgc2ltcGxlIGZvciBQaGFzZSAzLiBBIHByb3BlciBzYW5kYm94XG4gKiAoQ1NQLWNvbXBhdGlibGUsIG5vIGV2YWwgZmFsbGJhY2spIGlzIGEgZnV0dXJlIGhhcmRlbmluZyB0YXNrLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXZhbEV4cHIobm9kZTogRXhwck5vZGUsIGN0eDogTEVTQ29udGV4dCk6IHVua25vd24ge1xuICBpZiAoIW5vZGUucmF3LnRyaW0oKSkgcmV0dXJuIHVuZGVmaW5lZFxuXG4gIC8vIEZhc3QgcGF0aDogc2ltcGxlIHN0cmluZyBsaXRlcmFsXG4gIGlmIChub2RlLnJhdy5zdGFydHNXaXRoKFwiJ1wiKSAmJiBub2RlLnJhdy5lbmRzV2l0aChcIidcIikpIHtcbiAgICByZXR1cm4gbm9kZS5yYXcuc2xpY2UoMSwgLTEpXG4gIH1cbiAgLy8gRmFzdCBwYXRoOiBudW1iZXIgbGl0ZXJhbFxuICBjb25zdCBudW0gPSBOdW1iZXIobm9kZS5yYXcpXG4gIGlmICghTnVtYmVyLmlzTmFOKG51bSkgJiYgbm9kZS5yYXcudHJpbSgpICE9PSAnJykgcmV0dXJuIG51bVxuICAvLyBGYXN0IHBhdGg6IGJvb2xlYW5cbiAgaWYgKG5vZGUucmF3ID09PSAndHJ1ZScpICByZXR1cm4gdHJ1ZVxuICBpZiAobm9kZS5yYXcgPT09ICdmYWxzZScpIHJldHVybiBmYWxzZVxuICBpZiAobm9kZS5yYXcgPT09ICdudWxsJyB8fCBub2RlLnJhdyA9PT0gJ25pbCcpIHJldHVybiBudWxsXG5cbiAgLy8gXHUyNTAwXHUyNTAwIEZhc3QgcGF0aHMgZm9yIGNvbW1vbiBhbmltYXRpb24vb3B0aW9uIHZhbHVlIHBhdHRlcm5zIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAvLyBUaGVzZSBhcmUgbm90IHZhbGlkIEpTIGV4cHJlc3Npb25zIGJ1dCBhcHBlYXIgYXMgYW5pbWF0aW9uIG9wdGlvbiB2YWx1ZXMuXG4gIC8vIFJldHVybiB0aGVtIGFzIHN0cmluZ3Mgc28gdGhlIGFuaW1hdGlvbiBtb2R1bGUgY2FuIGludGVycHJldCB0aGVtIGRpcmVjdGx5LlxuICBpZiAoL15cXGQrKFxcLlxcZCspP21zJC8udGVzdChub2RlLnJhdykpIHJldHVybiBub2RlLnJhdyAgICAgICAgICAgICAgICAgICAvLyBcIjIwbXNcIiwgXCI0MG1zXCJcbiAgaWYgKC9eW2EtekEtWl1bYS16QS1aMC05Xy1dKiQvLnRlc3Qobm9kZS5yYXcpKSByZXR1cm4gbm9kZS5yYXcgICAgICAgICAgICAvLyBcInJldmVyc2VcIiwgXCJyaWdodFwiLCBcImVhc2Utb3V0XCJcbiAgaWYgKC9eKGN1YmljLWJlemllcnxzdGVwc3xsaW5lYXIpXFwoLy50ZXN0KG5vZGUucmF3KSkgcmV0dXJuIG5vZGUucmF3ICAgICAgLy8gXCJjdWJpYy1iZXppZXIoMC4yMiwxLDAuMzYsMSlcblxuICB0cnkge1xuICAgIC8vIEJ1aWxkIGEgZmxhdCBvYmplY3Qgb2YgYWxsIGFjY2Vzc2libGUgbmFtZXM6XG4gICAgLy8gLSBTY29wZSBsb2NhbHMgKGlubmVybW9zdCB3aW5zKVxuICAgIC8vIC0gRGF0YXN0YXIgc2lnbmFscyB2aWEgJC1wcmVmaXggc3RyaXBwaW5nXG4gICAgY29uc3Qgc2NvcGVTbmFwc2hvdCA9IGN0eC5zY29wZS5zbmFwc2hvdCgpXG5cbiAgICAvLyBFeHRyYWN0IHNpZ25hbCByZWZlcmVuY2VzIGZyb20gdGhlIGV4cHJlc3Npb24gKCRuYW1lIFx1MjE5MiBuYW1lKVxuICAgIGNvbnN0IHNpZ25hbE5hbWVzID0gWy4uLm5vZGUucmF3Lm1hdGNoQWxsKC9cXCQoW2EtekEtWl9dXFx3KikvZyldXG4gICAgICAubWFwKG0gPT4gbVsxXSEpXG5cbiAgICBjb25zdCBzaWduYWxzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHNpZ25hbE5hbWVzKSB7XG4gICAgICBzaWduYWxzW25hbWVdID0gY3R4LmdldFNpZ25hbChuYW1lKVxuICAgIH1cblxuICAgIC8vIFJld3JpdGUgJG5hbWUgXHUyMTkyIF9fc2lnX25hbWUgaW4gdGhlIGV4cHJlc3Npb24gc28gd2UgY2FuIHBhc3Mgc2lnbmFsc1xuICAgIC8vIGFzIHBsYWluIHZhcmlhYmxlcyAoYXZvaWRzICQgaW4gSlMgaWRlbnRpZmllcnMpXG4gICAgbGV0IHJld3JpdHRlbiA9IG5vZGUucmF3XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHNpZ25hbE5hbWVzKSB7XG4gICAgICByZXdyaXR0ZW4gPSByZXdyaXR0ZW4ucmVwbGFjZUFsbChgJCR7bmFtZX1gLCBgX19zaWdfJHtuYW1lfWApXG4gICAgfVxuXG4gICAgLy8gUHJlZml4IHNpZ25hbCB2YXJzIGluIHRoZSBiaW5kaW5nIG9iamVjdFxuICAgIGNvbnN0IHNpZ0JpbmRpbmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgZm9yIChjb25zdCBbaywgdl0gb2YgT2JqZWN0LmVudHJpZXMoc2lnbmFscykpIHtcbiAgICAgIHNpZ0JpbmRpbmdzW2BfX3NpZ18ke2t9YF0gPSB2XG4gICAgfVxuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLW5ldy1mdW5jXG4gICAgY29uc3QgZm4gPSBuZXcgRnVuY3Rpb24oXG4gICAgICAuLi5PYmplY3Qua2V5cyhzY29wZVNuYXBzaG90KSxcbiAgICAgIC4uLk9iamVjdC5rZXlzKHNpZ0JpbmRpbmdzKSxcbiAgICAgIGByZXR1cm4gKCR7cmV3cml0dGVufSlgXG4gICAgKVxuICAgIHJldHVybiBmbihcbiAgICAgIC4uLk9iamVjdC52YWx1ZXMoc2NvcGVTbmFwc2hvdCksXG4gICAgICAuLi5PYmplY3QudmFsdWVzKHNpZ0JpbmRpbmdzKVxuICAgIClcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTXSBFeHByZXNzaW9uIGV2YWwgZXJyb3I6ICR7SlNPTi5zdHJpbmdpZnkobm9kZS5yYXcpfWAsIGVycilcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cbn1cblxuLyoqXG4gKiBFdmFsdWF0ZXMgYSBndWFyZCBleHByZXNzaW9uIHN0cmluZyAoZnJvbSBjb21tYW5kIGBndWFyZGAgYXR0cmlidXRlKS5cbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ3VhcmQgcGFzc2VzIChjb21tYW5kIHNob3VsZCBydW4pLCBmYWxzZSB0byBzaWxlbnQtYWJvcnQuXG4gKi9cbmZ1bmN0aW9uIGV2YWxHdWFyZChndWFyZEV4cHI6IHN0cmluZywgY3R4OiBMRVNDb250ZXh0KTogYm9vbGVhbiB7XG4gIGNvbnN0IHJlc3VsdCA9IGV2YWxFeHByKHsgdHlwZTogJ2V4cHInLCByYXc6IGd1YXJkRXhwciB9LCBjdHgpXG4gIHJldHVybiBCb29sZWFuKHJlc3VsdClcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXR0ZXJuIG1hdGNoaW5nXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBBdHRlbXB0cyB0byBtYXRjaCBgc3ViamVjdGAgYWdhaW5zdCBgcGF0dGVybnNgLlxuICpcbiAqIFJldHVybnMgYSBiaW5kaW5ncyBtYXAgaWYgbWF0Y2hlZCAoZW1wdHkgbWFwIGZvciB3aWxkY2FyZC9saXRlcmFsIG1hdGNoZXMpLFxuICogb3IgbnVsbCBpZiB0aGUgbWF0Y2ggZmFpbHMuXG4gKlxuICogRm9yIHR1cGxlIHBhdHRlcm5zLCBgc3ViamVjdGAgaXMgbWF0Y2hlZCBlbGVtZW50LWJ5LWVsZW1lbnQuXG4gKiBGb3Igb3ItcGF0dGVybnMsIGFueSBhbHRlcm5hdGl2ZSBtYXRjaGluZyByZXR1cm5zIHRoZSBiaW5kaW5ncy5cbiAqL1xuZnVuY3Rpb24gbWF0Y2hQYXR0ZXJucyhcbiAgcGF0dGVybnM6IFBhdHRlcm5Ob2RlW10sXG4gIHN1YmplY3Q6IHVua25vd25cbik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbCB7XG4gIC8vIFNpbmdsZS1wYXR0ZXJuIChtb3N0IGNvbW1vbik6IG1hdGNoIGRpcmVjdGx5XG4gIGlmIChwYXR0ZXJucy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbWF0Y2hTaW5nbGUocGF0dGVybnNbMF0hLCBzdWJqZWN0KVxuICB9XG5cbiAgLy8gVHVwbGUgcGF0dGVybjogc3ViamVjdCBtdXN0IGJlIGFuIGFycmF5XG4gIGlmICghQXJyYXkuaXNBcnJheShzdWJqZWN0KSkge1xuICAgIC8vIFdyYXAgc2luZ2xlIHZhbHVlIGluIHR1cGxlIGZvciBlcmdvbm9taWNzXG4gICAgLy8gZS5nLiBgW2l0IG9rXWAgYWdhaW5zdCBhIHtvazogdHJ1ZSwgZGF0YTogLi4ufSByZXNwb25zZVxuICAgIHJldHVybiBtYXRjaFR1cGxlKHBhdHRlcm5zLCBzdWJqZWN0KVxuICB9XG5cbiAgcmV0dXJuIG1hdGNoVHVwbGUocGF0dGVybnMsIHN1YmplY3QpXG59XG5cbmZ1bmN0aW9uIG1hdGNoVHVwbGUoXG4gIHBhdHRlcm5zOiBQYXR0ZXJuTm9kZVtdLFxuICBzdWJqZWN0OiB1bmtub3duXG4pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IG51bGwge1xuICAvLyBGb3Igbm9uLWFycmF5IHN1YmplY3RzLCB0cnkgYmluZGluZyBlYWNoIHBhdHRlcm4gYWdhaW5zdCB0aGUgd2hvbGUgc3ViamVjdFxuICAvLyAoaGFuZGxlcyBgW2l0IG9rXWAgbWF0Y2hpbmcgYW4gb2JqZWN0IHdoZXJlIGBpdGAgPSBvYmplY3QsIGBva2AgPSBzdGF0dXMpXG4gIGNvbnN0IGJpbmRpbmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXR0ZXJucy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHBhdCA9IHBhdHRlcm5zW2ldIVxuXG4gICAgLy8gRm9yIHR1cGxlIHBhdHRlcm5zIGFnYWluc3Qgb2JqZWN0cywgd2UgZG8gYSBzdHJ1Y3R1cmFsIG1hdGNoOlxuICAgIC8vIGBbaXQgb2tdYCBhZ2FpbnN0IHtkYXRhOiAuLi4sIHN0YXR1czogJ29rJ30gYmluZHMgYGl0YCA9IGRhdGEsIGBva2AgPSAnb2snXG4gICAgLy8gVGhpcyBpcyBhIHNpbXBsaWZpY2F0aW9uIFx1MjAxNCBmdWxsIHN0cnVjdHVyYWwgbWF0Y2hpbmcgY29tZXMgaW4gYSBsYXRlciBwYXNzXG4gICAgY29uc3QgdmFsdWUgPSBBcnJheS5pc0FycmF5KHN1YmplY3QpXG4gICAgICA/IHN1YmplY3RbaV1cbiAgICAgIDogaSA9PT0gMCA/IHN1YmplY3QgOiB1bmRlZmluZWRcblxuICAgIGNvbnN0IHJlc3VsdCA9IG1hdGNoU2luZ2xlKHBhdCwgdmFsdWUpXG4gICAgaWYgKHJlc3VsdCA9PT0gbnVsbCkgcmV0dXJuIG51bGxcbiAgICBPYmplY3QuYXNzaWduKGJpbmRpbmdzLCByZXN1bHQpXG4gIH1cblxuICByZXR1cm4gYmluZGluZ3Ncbn1cblxuZnVuY3Rpb24gbWF0Y2hTaW5nbGUoXG4gIHBhdHRlcm46IFBhdHRlcm5Ob2RlLFxuICB2YWx1ZTogdW5rbm93blxuKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsIHtcbiAgc3dpdGNoIChwYXR0ZXJuLmtpbmQpIHtcbiAgICBjYXNlICd3aWxkY2FyZCc6XG4gICAgICByZXR1cm4ge30gICAvLyBBbHdheXMgbWF0Y2hlcywgYmluZHMgbm90aGluZ1xuXG4gICAgY2FzZSAnbGl0ZXJhbCc6XG4gICAgICByZXR1cm4gdmFsdWUgPT09IHBhdHRlcm4udmFsdWUgPyB7fSA6IG51bGxcblxuICAgIGNhc2UgJ2JpbmRpbmcnOlxuICAgICAgcmV0dXJuIHsgW3BhdHRlcm4ubmFtZV06IHZhbHVlIH0gICAvLyBBbHdheXMgbWF0Y2hlcywgYmluZHMgbmFtZSBcdTIxOTIgdmFsdWVcblxuICAgIGNhc2UgJ29yJzoge1xuICAgICAgZm9yIChjb25zdCBhbHQgb2YgcGF0dGVybi5wYXR0ZXJucykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBtYXRjaFNpbmdsZShhbHQsIHZhbHVlKVxuICAgICAgICBpZiAocmVzdWx0ICE9PSBudWxsKSByZXR1cm4gcmVzdWx0XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEhUVFAgYWN0aW9uXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBQZXJmb3JtcyBhbiBIVFRQIGFjdGlvbiAoQGdldCwgQHBvc3QsIGV0Yy4pLlxuICpcbiAqIFdoZW4gRGF0YXN0YXIgYWN0aW9ucyBhcmUgYXZhaWxhYmxlIGluIHRoZSBob3N0J3MgY29udGV4dCwgd2UgdHJpZ2dlclxuICogRGF0YXN0YXIncyBmZXRjaCBwaXBlbGluZSAod2hpY2ggaGFuZGxlcyBzaWduYWwgc2VyaWFsaXphdGlvbiwgU1NFXG4gKiByZXNwb25zZSBwcm9jZXNzaW5nLCBhbmQgaW5kaWNhdG9yIHNpZ25hbHMpLlxuICpcbiAqIEZhbGxzIGJhY2sgdG8gbmF0aXZlIGZldGNoIHdoZW4gRGF0YXN0YXIgaXMgbm90IHByZXNlbnQuXG4gKlxuICogTm90ZTogRGF0YXN0YXIncyBAZ2V0IC8gQHBvc3QgYXJlIGZpcmUtYW5kLWZvcmdldCAodGhleSBzdHJlYW0gU1NFIGJhY2tcbiAqIHRvIHBhdGNoIHNpZ25hbHMvZWxlbWVudHMpLiBGb3IgdGhlIGJpbmQgY2FzZSAoYHJlc3BvbnNlIDwtIEBnZXQgLi4uYClcbiAqIHdlIHVzZSBuYXRpdmUgZmV0Y2ggdG8gZ2V0IGEgUHJvbWlzZS1iYXNlZCBKU09OIHJlc3BvbnNlIHRoYXQgTEVTIGNhblxuICogYmluZCB0byBhIGxvY2FsIHZhcmlhYmxlLlxuICovXG5hc3luYyBmdW5jdGlvbiBwZXJmb3JtQWN0aW9uKFxuICB2ZXJiOiBzdHJpbmcsXG4gIHVybDogc3RyaW5nLFxuICBhcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgY3R4OiBMRVNDb250ZXh0XG4pOiBQcm9taXNlPHVua25vd24+IHtcbiAgY29uc3QgbWV0aG9kID0gdmVyYi50b1VwcGVyQ2FzZSgpXG5cbiAgbGV0IGZ1bGxVcmwgPSB1cmxcbiAgbGV0IGJvZHk6IHN0cmluZyB8IHVuZGVmaW5lZFxuXG4gIGlmIChtZXRob2QgPT09ICdHRVQnIHx8IG1ldGhvZCA9PT0gJ0RFTEVURScpIHtcbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKClcbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhhcmdzKSkge1xuICAgICAgcGFyYW1zLnNldChrLCBTdHJpbmcodikpXG4gICAgfVxuICAgIGNvbnN0IHFzID0gcGFyYW1zLnRvU3RyaW5nKClcbiAgICBpZiAocXMpIGZ1bGxVcmwgPSBgJHt1cmx9PyR7cXN9YFxuICB9IGVsc2Uge1xuICAgIGJvZHkgPSBKU09OLnN0cmluZ2lmeShhcmdzKVxuICB9XG5cbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChmdWxsVXJsLCB7XG4gICAgbWV0aG9kLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAnQWNjZXB0JzogJ3RleHQvZXZlbnQtc3RyZWFtLCBhcHBsaWNhdGlvbi9qc29uJyxcbiAgICB9LFxuICAgIC4uLihib2R5ID8geyBib2R5IH0gOiB7fSksXG4gIH0pXG5cbiAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgIHRocm93IG5ldyBFcnJvcihgW0xFU10gSFRUUCAke3Jlc3BvbnNlLnN0YXR1c30gZnJvbSAke21ldGhvZH0gJHt1cmx9YClcbiAgfVxuXG4gIGNvbnN0IGNvbnRlbnRUeXBlID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpID8/ICcnXG5cbiAgLy8gXHUyNTAwXHUyNTAwIFNTRSBzdHJlYW06IERhdGFzdGFyIHNlcnZlci1zZW50IGV2ZW50cyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgLy8gV2hlbiB0aGUgc2VydmVyIHJldHVybnMgdGV4dC9ldmVudC1zdHJlYW0sIGNvbnN1bWUgdGhlIFNTRSBzdHJlYW0gYW5kXG4gIC8vIGFwcGx5IGRhdGFzdGFyLXBhdGNoLWVsZW1lbnRzIC8gZGF0YXN0YXItcGF0Y2gtc2lnbmFscyBldmVudHMgb3Vyc2VsdmVzLlxuICAvLyBUaGUgUHJvbWlzZSByZXNvbHZlcyB3aGVuIHRoZSBzdHJlYW0gY2xvc2VzIFx1MjAxNCBzbyBgdGhlbmAgaW4gTEVTIGNvcnJlY3RseVxuICAvLyB3YWl0cyBmb3IgYWxsIERPTSBwYXRjaGVzIGJlZm9yZSBwcm9jZWVkaW5nIHRvIHRoZSBuZXh0IHN0ZXAuXG4gIGlmIChjb250ZW50VHlwZS5pbmNsdWRlcygndGV4dC9ldmVudC1zdHJlYW0nKSkge1xuICAgIGF3YWl0IGNvbnN1bWVTU0VTdHJlYW0ocmVzcG9uc2UsIGN0eClcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cblxuICBpZiAoY29udGVudFR5cGUuaW5jbHVkZXMoJ2FwcGxpY2F0aW9uL2pzb24nKSkge1xuICAgIHJldHVybiBhd2FpdCByZXNwb25zZS5qc29uKClcbiAgfVxuICByZXR1cm4gYXdhaXQgcmVzcG9uc2UudGV4dCgpXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gU1NFIHN0cmVhbSBjb25zdW1lclxuLy9cbi8vIFJlYWRzIGEgRGF0YXN0YXIgU1NFIHN0cmVhbSBsaW5lLWJ5LWxpbmUgYW5kIGFwcGxpZXMgdGhlIGV2ZW50cy5cbi8vIFdlIGltcGxlbWVudCBhIG1pbmltYWwgc3Vic2V0IG9mIHRoZSBEYXRhc3RhciBTU0Ugc3BlYyBuZWVkZWQgZm9yIExFUzpcbi8vXG4vLyAgIGRhdGFzdGFyLXBhdGNoLWVsZW1lbnRzICBcdTIxOTIgYXBwbHkgdG8gdGhlIERPTSB1c2luZyBtb3JwaGRvbS1saXRlIGxvZ2ljXG4vLyAgIGRhdGFzdGFyLXBhdGNoLXNpZ25hbHMgICBcdTIxOTIgd3JpdGUgc2lnbmFsIHZhbHVlcyB2aWEgY3R4LnNldFNpZ25hbFxuLy9cbi8vIFRoaXMgcnVucyBlbnRpcmVseSBpbiB0aGUgYnJvd3NlciBcdTIwMTQgbm8gRGF0YXN0YXIgaW50ZXJuYWwgQVBJcyBuZWVkZWQuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuYXN5bmMgZnVuY3Rpb24gY29uc3VtZVNTRVN0cmVhbShcbiAgcmVzcG9uc2U6IFJlc3BvbnNlLFxuICBjdHg6IExFU0NvbnRleHRcbik6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoIXJlc3BvbnNlLmJvZHkpIHJldHVyblxuXG4gIGNvbnN0IHJlYWRlciAgPSByZXNwb25zZS5ib2R5LmdldFJlYWRlcigpXG4gIGNvbnN0IGRlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoKVxuICBsZXQgYnVmZmVyICAgID0gJydcblxuICAvLyBTU0UgZXZlbnQgYWNjdW11bGF0b3IgXHUyMDE0IHJlc2V0IGFmdGVyIGVhY2ggZG91YmxlLW5ld2xpbmVcbiAgbGV0IGV2ZW50VHlwZSA9ICcnXG4gIGxldCBkYXRhTGluZXM6IHN0cmluZ1tdID0gW11cblxuICBjb25zdCBhcHBseUV2ZW50ID0gKCkgPT4ge1xuICAgIGlmICghZXZlbnRUeXBlIHx8IGRhdGFMaW5lcy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gICAgaWYgKGV2ZW50VHlwZSA9PT0gJ2RhdGFzdGFyLXBhdGNoLWVsZW1lbnRzJykge1xuICAgICAgYXBwbHlQYXRjaEVsZW1lbnRzKGRhdGFMaW5lcywgY3R4KVxuICAgIH0gZWxzZSBpZiAoZXZlbnRUeXBlID09PSAnZGF0YXN0YXItcGF0Y2gtc2lnbmFscycpIHtcbiAgICAgIGFwcGx5UGF0Y2hTaWduYWxzKGRhdGFMaW5lcywgY3R4KVxuICAgIH1cblxuICAgIC8vIFJlc2V0IGFjY3VtdWxhdG9yXG4gICAgZXZlbnRUeXBlID0gJydcbiAgICBkYXRhTGluZXMgPSBbXVxuICB9XG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCB7IGRvbmUsIHZhbHVlIH0gPSBhd2FpdCByZWFkZXIucmVhZCgpXG4gICAgaWYgKGRvbmUpIHsgYXBwbHlFdmVudCgpOyBicmVhayB9XG5cbiAgICBidWZmZXIgKz0gZGVjb2Rlci5kZWNvZGUodmFsdWUsIHsgc3RyZWFtOiB0cnVlIH0pXG5cbiAgICAvLyBQcm9jZXNzIGNvbXBsZXRlIGxpbmVzIGZyb20gdGhlIGJ1ZmZlclxuICAgIGNvbnN0IGxpbmVzID0gYnVmZmVyLnNwbGl0KCdcXG4nKVxuICAgIGJ1ZmZlciA9IGxpbmVzLnBvcCgpID8/ICcnICAgLy8gbGFzdCBwYXJ0aWFsIGxpbmUgc3RheXMgaW4gYnVmZmVyXG5cbiAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJ2V2ZW50OicpKSB7XG4gICAgICAgIGV2ZW50VHlwZSA9IGxpbmUuc2xpY2UoJ2V2ZW50OicubGVuZ3RoKS50cmltKClcbiAgICAgIH0gZWxzZSBpZiAobGluZS5zdGFydHNXaXRoKCdkYXRhOicpKSB7XG4gICAgICAgIGRhdGFMaW5lcy5wdXNoKGxpbmUuc2xpY2UoJ2RhdGE6Jy5sZW5ndGgpLnRyaW1TdGFydCgpKVxuICAgICAgfSBlbHNlIGlmIChsaW5lID09PSAnJykge1xuICAgICAgICAvLyBCbGFuayBsaW5lID0gZW5kIG9mIHRoaXMgU1NFIGV2ZW50XG4gICAgICAgIGFwcGx5RXZlbnQoKVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDAgQXBwbHkgZGF0YXN0YXItcGF0Y2gtZWxlbWVudHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIGFwcGx5UGF0Y2hFbGVtZW50cyhkYXRhTGluZXM6IHN0cmluZ1tdLCBjdHg6IExFU0NvbnRleHQpOiB2b2lkIHtcbiAgLy8gUGFyc2UgdGhlIHN0cnVjdHVyZWQgZGF0YSBsaW5lcyBpbnRvIGFuIG9wdGlvbnMgb2JqZWN0XG4gIGxldCBzZWxlY3RvciAgICA9ICcnXG4gIGxldCBtb2RlICAgICAgICA9ICdvdXRlcidcbiAgY29uc3QgaHRtbExpbmVzOiBzdHJpbmdbXSA9IFtdXG5cbiAgZm9yIChjb25zdCBsaW5lIG9mIGRhdGFMaW5lcykge1xuICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJ3NlbGVjdG9yICcpKSAgeyBzZWxlY3RvciA9IGxpbmUuc2xpY2UoJ3NlbGVjdG9yICcubGVuZ3RoKS50cmltKCk7IGNvbnRpbnVlIH1cbiAgICBpZiAobGluZS5zdGFydHNXaXRoKCdtb2RlICcpKSAgICAgIHsgbW9kZSAgICAgPSBsaW5lLnNsaWNlKCdtb2RlICcubGVuZ3RoKS50cmltKCk7ICAgICBjb250aW51ZSB9XG4gICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnZWxlbWVudHMgJykpICB7IGh0bWxMaW5lcy5wdXNoKGxpbmUuc2xpY2UoJ2VsZW1lbnRzICcubGVuZ3RoKSk7ICAgY29udGludWUgfVxuICAgIC8vIExpbmVzIHdpdGggbm8gcHJlZml4IGFyZSBhbHNvIGVsZW1lbnQgY29udGVudCAoRGF0YXN0YXIgc3BlYyBhbGxvd3MgdGhpcylcbiAgICBodG1sTGluZXMucHVzaChsaW5lKVxuICB9XG5cbiAgY29uc3QgaHRtbCA9IGh0bWxMaW5lcy5qb2luKCdcXG4nKS50cmltKClcblxuICBjb25zdCB0YXJnZXQgPSBzZWxlY3RvclxuICAgID8gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcilcbiAgICA6IG51bGxcblxuICBjb25zb2xlLmxvZyhgW0xFUzpzc2VdIHBhdGNoLWVsZW1lbnRzIG1vZGU9JHttb2RlfSBzZWxlY3Rvcj1cIiR7c2VsZWN0b3J9XCIgaHRtbC5sZW49JHtodG1sLmxlbmd0aH1gKVxuXG4gIGlmIChtb2RlID09PSAncmVtb3ZlJykge1xuICAgIC8vIFJlbW92ZSBhbGwgbWF0Y2hpbmcgZWxlbWVudHNcbiAgICBjb25zdCB0b1JlbW92ZSA9IHNlbGVjdG9yXG4gICAgICA/IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpXG4gICAgICA6IFtdXG4gICAgdG9SZW1vdmUuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSlcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChtb2RlID09PSAnYXBwZW5kJyAmJiB0YXJnZXQpIHtcbiAgICBjb25zdCBmcmFnID0gcGFyc2VIVE1MKGh0bWwpXG4gICAgdGFyZ2V0LmFwcGVuZChmcmFnKVxuICAgIHJldHVyblxuICB9XG5cbiAgaWYgKG1vZGUgPT09ICdwcmVwZW5kJyAmJiB0YXJnZXQpIHtcbiAgICBjb25zdCBmcmFnID0gcGFyc2VIVE1MKGh0bWwpXG4gICAgdGFyZ2V0LnByZXBlbmQoZnJhZylcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChtb2RlID09PSAnaW5uZXInICYmIHRhcmdldCkge1xuICAgIHRhcmdldC5pbm5lckhUTUwgPSBodG1sXG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAobW9kZSA9PT0gJ291dGVyJyAmJiB0YXJnZXQpIHtcbiAgICBjb25zdCBmcmFnID0gcGFyc2VIVE1MKGh0bWwpXG4gICAgdGFyZ2V0LnJlcGxhY2VXaXRoKGZyYWcpXG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAobW9kZSA9PT0gJ2JlZm9yZScgJiYgdGFyZ2V0KSB7XG4gICAgY29uc3QgZnJhZyA9IHBhcnNlSFRNTChodG1sKVxuICAgIHRhcmdldC5iZWZvcmUoZnJhZylcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChtb2RlID09PSAnYWZ0ZXInICYmIHRhcmdldCkge1xuICAgIGNvbnN0IGZyYWcgPSBwYXJzZUhUTUwoaHRtbClcbiAgICB0YXJnZXQuYWZ0ZXIoZnJhZylcbiAgICByZXR1cm5cbiAgfVxuXG4gIC8vIE5vIHNlbGVjdG9yOiB0cnkgdG8gcGF0Y2ggYnkgZWxlbWVudCBJRHNcbiAgaWYgKCFzZWxlY3RvciAmJiBodG1sKSB7XG4gICAgY29uc3QgZnJhZyA9IHBhcnNlSFRNTChodG1sKVxuICAgIGZvciAoY29uc3QgZWwgb2YgQXJyYXkuZnJvbShmcmFnLmNoaWxkcmVuKSkge1xuICAgICAgY29uc3QgaWQgPSBlbC5pZFxuICAgICAgaWYgKGlkKSB7XG4gICAgICAgIGNvbnN0IGV4aXN0aW5nID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXG4gICAgICAgIGlmIChleGlzdGluZykgZXhpc3RpbmcucmVwbGFjZVdpdGgoZWwpXG4gICAgICAgIGVsc2UgZG9jdW1lbnQuYm9keS5hcHBlbmQoZWwpXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHBhcnNlSFRNTChodG1sOiBzdHJpbmcpOiBEb2N1bWVudEZyYWdtZW50IHtcbiAgY29uc3QgdGVtcGxhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpXG4gIHRlbXBsYXRlLmlubmVySFRNTCA9IGh0bWxcbiAgcmV0dXJuIHRlbXBsYXRlLmNvbnRlbnRcbn1cblxuLy8gXHUyNTAwXHUyNTAwIEFwcGx5IGRhdGFzdGFyLXBhdGNoLXNpZ25hbHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIGFwcGx5UGF0Y2hTaWduYWxzKGRhdGFMaW5lczogc3RyaW5nW10sIGN0eDogTEVTQ29udGV4dCk6IHZvaWQge1xuICBmb3IgKGNvbnN0IGxpbmUgb2YgZGF0YUxpbmVzKSB7XG4gICAgaWYgKCFsaW5lLnN0YXJ0c1dpdGgoJ3NpZ25hbHMgJykgJiYgIWxpbmUuc3RhcnRzV2l0aCgneycpKSBjb250aW51ZVxuXG4gICAgY29uc3QganNvblN0ciA9IGxpbmUuc3RhcnRzV2l0aCgnc2lnbmFscyAnKVxuICAgICAgPyBsaW5lLnNsaWNlKCdzaWduYWxzICcubGVuZ3RoKVxuICAgICAgOiBsaW5lXG5cbiAgICB0cnkge1xuICAgICAgY29uc3Qgc2lnbmFscyA9IEpTT04ucGFyc2UoanNvblN0cikgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbiAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHNpZ25hbHMpKSB7XG4gICAgICAgIGN0eC5zZXRTaWduYWwoa2V5LCB2YWx1ZSlcbiAgICAgICAgY29uc29sZS5sb2coYFtMRVM6c3NlXSBwYXRjaC1zaWduYWxzICQke2tleX0gPWAsIHZhbHVlKVxuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTOnNzZV0gRmFpbGVkIHRvIHBhcnNlIHBhdGNoLXNpZ25hbHMgSlNPTjonLCBqc29uU3RyKVxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFNlbGVjdG9yIHJlc29sdXRpb25cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFJlc29sdmVzIHZhcmlhYmxlIHJlZmVyZW5jZXMgaW4gYW4gYW5pbWF0aW9uIHNlbGVjdG9yLlxuICpcbiAqIEV4YW1wbGU6IGBbZGF0YS1pdGVtLWlkOiBpZF1gIHdoZXJlIGBpZGAgaXMgYSBsb2NhbCB2YXJpYWJsZVxuICogYmVjb21lcyBgW2RhdGEtaXRlbS1pZD1cIjEyM1wiXWAgYWZ0ZXIgc3Vic3RpdHV0aW9uLlxuICpcbiAqIFNpbXBsZSBhcHByb2FjaCBmb3IgUGhhc2UgMzogbG9vayBmb3IgYDogdmFybmFtZWAgcGF0dGVybnMgaW4gYXR0cmlidXRlXG4gKiBzZWxlY3RvcnMgYW5kIHN1YnN0aXR1dGUgZnJvbSBzY29wZS5cbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZVNlbGVjdG9yKHNlbGVjdG9yOiBzdHJpbmcsIGN0eDogTEVTQ29udGV4dCk6IHN0cmluZyB7XG4gIC8vIEhhbmRsZSBhdHRyaWJ1dGUgc2VsZWN0b3Igd2l0aCB2YXJpYWJsZTogW2RhdGEtaXRlbS1pZDogaWRdXG4gIHJldHVybiBzZWxlY3Rvci5yZXBsYWNlKC9cXFsoW15cXF1dKyk6XFxzKihcXHcrKVxcXS9nLCAoX21hdGNoLCBhdHRyLCB2YXJOYW1lKSA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSBjdHguc2NvcGUuZ2V0KHZhck5hbWUpID8/IGN0eC5nZXRTaWduYWwodmFyTmFtZSlcbiAgICByZXR1cm4gYFske2F0dHJ9PVwiJHtTdHJpbmcodmFsdWUpfVwiXWBcbiAgfSlcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBHdWFyZC1hd2FyZSBjb21tYW5kIGV4ZWN1dGlvbiAodXNlZCBieSBQaGFzZSA0IGV2ZW50IHdpcmluZylcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEV4ZWN1dGVzIGEgY29tbWFuZCBieSBuYW1lLCBjaGVja2luZyBpdHMgZ3VhcmQgZmlyc3QuXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGNvbW1hbmQgcmFuLCBmYWxzZSBpZiB0aGUgZ3VhcmQgcmVqZWN0ZWQgaXQuXG4gKlxuICogVGhpcyBpcyB0aGUgcHVibGljIEFQSSBmb3IgUGhhc2UgNCBldmVudCBoYW5kbGVycyB0aGF0IGNhbGwgY29tbWFuZHMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5Db21tYW5kKFxuICBuYW1lOiBzdHJpbmcsXG4gIGFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICBjdHg6IExFU0NvbnRleHRcbik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCBkZWYgPSBjdHguY29tbWFuZHMuZ2V0KG5hbWUpXG4gIGlmICghZGVmKSB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTXSBVbmtub3duIGNvbW1hbmQ6IFwiJHtuYW1lfVwiYClcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGlmIChkZWYuZ3VhcmQpIHtcbiAgICBpZiAoIWV2YWxHdWFyZChkZWYuZ3VhcmQsIGN0eCkpIHJldHVybiBmYWxzZVxuICB9XG5cbiAgY29uc3Qgc2NvcGUgPSBjdHguc2NvcGUuY2hpbGQoKVxuICBmb3IgKGNvbnN0IGFyZ0RlZiBvZiBkZWYuYXJncykge1xuICAgIHNjb3BlLnNldChhcmdEZWYubmFtZSwgYXJnc1thcmdEZWYubmFtZV0gPz8gbnVsbClcbiAgfVxuXG4gIGF3YWl0IGV4ZWN1dGUoZGVmLmJvZHksIHsgLi4uY3R4LCBzY29wZSB9KVxuICByZXR1cm4gdHJ1ZVxufVxuIiwgImltcG9ydCB0eXBlIHsgTEVTTm9kZSwgRXhwck5vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuLyoqIEEgc2luZ2xlIHR5cGVkIGFyZ3VtZW50IGRlZmluaXRpb24gZnJvbSBhcmdzPVwiW25hbWU6dHlwZSAgLi4uXVwiICovXG5leHBvcnQgaW50ZXJmYWNlIEFyZ0RlZiB7XG4gIG5hbWU6IHN0cmluZ1xuICAvKiogJ25pbCcgfCAnaW50JyB8ICdkZWMnIHwgJ3N0cicgfCAnYXJyJyB8ICdvYmonIHwgJ2Jvb2wnIHwgJ2R5bicgKi9cbiAgdHlwZTogc3RyaW5nXG4gIC8qKiBEZWZhdWx0IHZhbHVlIGV4cHJlc3Npb24sIGlmIHByb3ZpZGVkIChlLmcuIGF0dGVtcHQ6aW50PTApICovXG4gIGRlZmF1bHQ/OiBFeHByTm9kZVxufVxuXG4vKiogQSBmdWxseSBwYXJzZWQgPGxvY2FsLWNvbW1hbmQ+IGRlZmluaXRpb24uICovXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmREZWYge1xuICBuYW1lOiBzdHJpbmdcbiAgYXJnczogQXJnRGVmW11cbiAgLyoqIEd1YXJkIGV4cHJlc3Npb24gc3RyaW5nIFx1MjAxNCBldmFsdWF0ZWQgYmVmb3JlIGV4ZWN1dGlvbi4gRmFsc3kgPSBzaWxlbnQgbm8tb3AuICovXG4gIGd1YXJkPzogc3RyaW5nXG4gIC8qKiBUaGUgcGFyc2VkIGJvZHkgQVNUICovXG4gIGJvZHk6IExFU05vZGVcbiAgLyoqIFRoZSA8bG9jYWwtY29tbWFuZD4gRE9NIGVsZW1lbnQsIGtlcHQgZm9yIGVycm9yIHJlcG9ydGluZyAqL1xuICBlbGVtZW50OiBFbGVtZW50XG59XG5cbmV4cG9ydCBjbGFzcyBDb21tYW5kUmVnaXN0cnkge1xuICBwcml2YXRlIGNvbW1hbmRzID0gbmV3IE1hcDxzdHJpbmcsIENvbW1hbmREZWY+KClcblxuICByZWdpc3RlcihkZWY6IENvbW1hbmREZWYpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5jb21tYW5kcy5oYXMoZGVmLm5hbWUpKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgIGBbTEVTXSBEdXBsaWNhdGUgY29tbWFuZCBcIiR7ZGVmLm5hbWV9XCIgXHUyMDE0IHByZXZpb3VzIGRlZmluaXRpb24gb3ZlcndyaXR0ZW4uYCxcbiAgICAgICAgZGVmLmVsZW1lbnRcbiAgICAgIClcbiAgICB9XG4gICAgdGhpcy5jb21tYW5kcy5zZXQoZGVmLm5hbWUsIGRlZilcbiAgfVxuXG4gIGdldChuYW1lOiBzdHJpbmcpOiBDb21tYW5kRGVmIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kcy5nZXQobmFtZSlcbiAgfVxuXG4gIGhhcyhuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kcy5oYXMobmFtZSlcbiAgfVxuXG4gIG5hbWVzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmNvbW1hbmRzLmtleXMoKSlcbiAgfVxufVxuIiwgIi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gTEVTIE1vZHVsZSBzeXN0ZW1cbi8vXG4vLyBNb2R1bGVzIGV4dGVuZCB0aGUgc2V0IG9mIGFuaW1hdGlvbi9lZmZlY3QgcHJpbWl0aXZlcyBhdmFpbGFibGUgaW5cbi8vIDxsb2NhbC1jb21tYW5kPiBib2RpZXMuIFR3byBraW5kczpcbi8vXG4vLyAgIEJ1aWx0LWluOiAgPHVzZS1tb2R1bGUgdHlwZT1cImFuaW1hdGlvblwiPlxuLy8gICBVc2VybGFuZDogIDx1c2UtbW9kdWxlIHNyYz1cIi4vc2Nyb2xsLWVmZmVjdHMuanNcIj5cbi8vXG4vLyBCb3RoIHJlc29sdmUgdG8gYSBMRVNNb2R1bGUgYXQgcnVudGltZS5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEEgcHJpbWl0aXZlIGlzIGFuIGFzeW5jIG9wZXJhdGlvbiB0aGUgZXhlY3V0b3IgZGlzcGF0Y2hlcyBmb3IgQW5pbWF0aW9uTm9kZS5cbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3IgIENTUyBzZWxlY3RvciBzdHJpbmcgKGFscmVhZHkgcmVzb2x2ZWQgXHUyMDE0IG5vIHZhcmlhYmxlIHN1YnN0aXR1dGlvbiBuZWVkZWQgaGVyZSlcbiAqIEBwYXJhbSBkdXJhdGlvbiAgbWlsbGlzZWNvbmRzXG4gKiBAcGFyYW0gZWFzaW5nICAgIENTUyBlYXNpbmcgc3RyaW5nLCBlLmcuICdlYXNlLW91dCdcbiAqIEBwYXJhbSBvcHRpb25zICAga2V5L3ZhbHVlIG9wdGlvbnMgZnJvbSB0aGUgdHJhaWxpbmcgWy4uLl0gYmxvY2ssIGFscmVhZHkgZXZhbHVhdGVkXG4gKiBAcGFyYW0gaG9zdCAgICAgIHRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBlbGVtZW50ICh1c2VkIGFzIHF1ZXJ5U2VsZWN0b3Igcm9vdClcbiAqL1xuZXhwb3J0IHR5cGUgTEVTUHJpbWl0aXZlID0gKFxuICBzZWxlY3Rvcjogc3RyaW5nLFxuICBkdXJhdGlvbjogbnVtYmVyLFxuICBlYXNpbmc6IHN0cmluZyxcbiAgb3B0aW9uczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIGhvc3Q6IEVsZW1lbnRcbikgPT4gUHJvbWlzZTx2b2lkPlxuXG4vKiogVGhlIHNoYXBlIGEgdXNlcmxhbmQgbW9kdWxlIG11c3QgZXhwb3J0IGFzIGl0cyBkZWZhdWx0IGV4cG9ydC4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTEVTTW9kdWxlIHtcbiAgLyoqIEh1bWFuLXJlYWRhYmxlIG5hbWUgZm9yIGVycm9yIG1lc3NhZ2VzICovXG4gIG5hbWU6IHN0cmluZ1xuICBwcmltaXRpdmVzOiBSZWNvcmQ8c3RyaW5nLCBMRVNQcmltaXRpdmU+XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBSZWdpc3RyeSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZXhwb3J0IGNsYXNzIE1vZHVsZVJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBwcmltaXRpdmVzID0gbmV3IE1hcDxzdHJpbmcsIExFU1ByaW1pdGl2ZT4oKVxuICBwcml2YXRlIGxvYWRlZE1vZHVsZXM6IHN0cmluZ1tdID0gW11cblxuICByZWdpc3Rlcihtb2R1bGU6IExFU01vZHVsZSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgW25hbWUsIGZuXSBvZiBPYmplY3QuZW50cmllcyhtb2R1bGUucHJpbWl0aXZlcykpIHtcbiAgICAgIHRoaXMucHJpbWl0aXZlcy5zZXQobmFtZSwgZm4pXG4gICAgfVxuICAgIHRoaXMubG9hZGVkTW9kdWxlcy5wdXNoKG1vZHVsZS5uYW1lKVxuICAgIGNvbnNvbGUubG9nKGBbTEVTXSBtb2R1bGUgbG9hZGVkOiBcIiR7bW9kdWxlLm5hbWV9XCJgLCBPYmplY3Qua2V5cyhtb2R1bGUucHJpbWl0aXZlcykpXG4gIH1cblxuICBnZXQocHJpbWl0aXZlOiBzdHJpbmcpOiBMRVNQcmltaXRpdmUgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLnByaW1pdGl2ZXMuZ2V0KHByaW1pdGl2ZSlcbiAgfVxuXG4gIGhhcyhwcmltaXRpdmU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnByaW1pdGl2ZXMuaGFzKHByaW1pdGl2ZSlcbiAgfVxuXG4gIC8qKiBEZXYtbW9kZSBoZWxwOiB3aGljaCBtb2R1bGUgZXhwb3J0cyBhIGdpdmVuIHByaW1pdGl2ZT8gKi9cbiAgaGludEZvcihwcmltaXRpdmU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgLy8gV2lsbCBiZSBlbnJpY2hlZCBpbiBQaGFzZSA4IHdpdGggcGVyLW1vZHVsZSBwcmltaXRpdmUgbWFuaWZlc3RzLlxuICAgIHJldHVybiBgUHJpbWl0aXZlIFwiJHtwcmltaXRpdmV9XCIgbm90IGZvdW5kLiBMb2FkZWQgbW9kdWxlczogWyR7dGhpcy5sb2FkZWRNb2R1bGVzLmpvaW4oJywgJyl9XS4gRGlkIHlvdSBmb3JnZXQgPHVzZS1tb2R1bGUgdHlwZT1cImFuaW1hdGlvblwiPj9gXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIExvYWRlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqIEJ1aWx0LWluIG1vZHVsZSByZWdpc3RyeTogdHlwZSBuYW1lIFx1MjE5MiBpbXBvcnQgcGF0aCAqL1xuY29uc3QgQlVJTFRJTl9NT0RVTEVTOiBSZWNvcmQ8c3RyaW5nLCAoKSA9PiBQcm9taXNlPHsgZGVmYXVsdDogTEVTTW9kdWxlIH0+PiA9IHtcbiAgYW5pbWF0aW9uOiAoKSA9PiBpbXBvcnQoJy4vYnVpbHRpbi9hbmltYXRpb24uanMnKSxcbn1cblxuLyoqXG4gKiBSZXNvbHZlIGEgPHVzZS1tb2R1bGU+IGVsZW1lbnQgdG8gYSBMRVNNb2R1bGUgYW5kIHJlZ2lzdGVyIGl0LlxuICogQ2FsbGVkIGR1cmluZyBQaGFzZSAxIERPTSByZWFkaW5nIChQaGFzZSA4IGNvbXBsZXRlcyB0aGUgc3JjPSBwYXRoKS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRNb2R1bGUoXG4gIHJlZ2lzdHJ5OiBNb2R1bGVSZWdpc3RyeSxcbiAgb3B0czogeyB0eXBlPzogc3RyaW5nOyBzcmM/OiBzdHJpbmcgfVxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChvcHRzLnR5cGUpIHtcbiAgICBjb25zdCBsb2FkZXIgPSBCVUlMVElOX01PRFVMRVNbb3B0cy50eXBlXVxuICAgIGlmICghbG9hZGVyKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVNdIFVua25vd24gYnVpbHQtaW4gbW9kdWxlIHR5cGU6IFwiJHtvcHRzLnR5cGV9XCIuIEF2YWlsYWJsZTogJHtPYmplY3Qua2V5cyhCVUlMVElOX01PRFVMRVMpLmpvaW4oJywgJyl9YClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25zdCBtb2QgPSBhd2FpdCBsb2FkZXIoKVxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKG1vZC5kZWZhdWx0KVxuICAgIHJldHVyblxuICB9XG5cbiAgaWYgKG9wdHMuc3JjKSB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIFJlc29sdmUgcmVsYXRpdmUgcGF0aHMgYWdhaW5zdCB0aGUgcGFnZSBVUkwsIG5vdCB0aGUgYnVuZGxlIFVSTC5cbiAgICAgIC8vIFdpdGhvdXQgdGhpcywgJy4vc2Nyb2xsLWVmZmVjdHMuanMnIHJlc29sdmVzIHRvICcvZGlzdC9zY3JvbGwtZWZmZWN0cy5qcydcbiAgICAgIC8vIChyZWxhdGl2ZSB0byB0aGUgYnVuZGxlIGF0IC9kaXN0L2xvY2FsLWV2ZW50LXNjcmlwdC5qcykgaW5zdGVhZCBvZlxuICAgICAgLy8gJy9zY3JvbGwtZWZmZWN0cy5qcycgKHJlbGF0aXZlIHRvIHRoZSBIVE1MIHBhZ2UpLlxuICAgICAgY29uc3QgcmVzb2x2ZWRTcmMgPSBuZXcgVVJMKG9wdHMuc3JjLCBkb2N1bWVudC5iYXNlVVJJKS5ocmVmXG4gICAgICBjb25zdCBtb2QgPSBhd2FpdCBpbXBvcnQoLyogQHZpdGUtaWdub3JlICovIHJlc29sdmVkU3JjKVxuICAgICAgaWYgKCFtb2QuZGVmYXVsdCB8fCB0eXBlb2YgbW9kLmRlZmF1bHQucHJpbWl0aXZlcyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBbTEVTXSBNb2R1bGUgYXQgXCIke29wdHMuc3JjfVwiIGRvZXMgbm90IGV4cG9ydCBhIHZhbGlkIExFU01vZHVsZS4gRXhwZWN0ZWQ6IHsgbmFtZTogc3RyaW5nLCBwcmltaXRpdmVzOiBSZWNvcmQ8c3RyaW5nLCBGdW5jdGlvbj4gfWApXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgcmVnaXN0cnkucmVnaXN0ZXIobW9kLmRlZmF1bHQgYXMgTEVTTW9kdWxlKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihgW0xFU10gRmFpbGVkIHRvIGxvYWQgbW9kdWxlIGZyb20gXCIke29wdHMuc3JjfVwiOmAsIGVycilcbiAgICB9XG4gICAgcmV0dXJuXG4gIH1cblxuICBjb25zb2xlLndhcm4oJ1tMRVNdIDx1c2UtbW9kdWxlPiByZXF1aXJlcyBlaXRoZXIgdHlwZT0gb3Igc3JjPSBhdHRyaWJ1dGUuJylcbn1cbiIsICIvKipcbiAqIFN0cmlwcyB0aGUgYmFja3RpY2sgd3JhcHBlciBmcm9tIGEgbXVsdGktbGluZSBMRVMgYm9keSBzdHJpbmcgYW5kXG4gKiBub3JtYWxpemVzIGluZGVudGF0aW9uLCBwcm9kdWNpbmcgYSBjbGVhbiBzdHJpbmcgdGhlIHBhcnNlciBjYW4gd29yayB3aXRoLlxuICpcbiAqIENvbnZlbnRpb246XG4gKiAgIFNpbmdsZS1saW5lOiAgaGFuZGxlPVwiZW1pdCBmZWVkOmluaXRcIiAgICAgICAgICAgXHUyMTkyIFwiZW1pdCBmZWVkOmluaXRcIlxuICogICBNdWx0aS1saW5lOiAgIGRvPVwiYFxcbiAgICAgIHNldC4uLlxcbiAgICBgXCIgICAgICAgIFx1MjE5MiBcInNldC4uLlxcbi4uLlwiXG4gKlxuICogQWxnb3JpdGhtOlxuICogICAxLiBUcmltIG91dGVyIHdoaXRlc3BhY2UgZnJvbSB0aGUgcmF3IGF0dHJpYnV0ZSB2YWx1ZS5cbiAqICAgMi4gSWYgd3JhcHBlZCBpbiBiYWNrdGlja3MsIHN0cmlwIHRoZW0gXHUyMDE0IGRvIE5PVCBpbm5lci10cmltIHlldC5cbiAqICAgMy4gU3BsaXQgaW50byBsaW5lcyBhbmQgY29tcHV0ZSBtaW5pbXVtIG5vbi16ZXJvIGluZGVudGF0aW9uXG4gKiAgICAgIGFjcm9zcyBhbGwgbm9uLWVtcHR5IGxpbmVzLiBUaGlzIGlzIHRoZSBIVE1MIGF0dHJpYnV0ZSBpbmRlbnRhdGlvblxuICogICAgICBsZXZlbCB0byByZW1vdmUuXG4gKiAgIDQuIFN0cmlwIHRoYXQgbWFueSBsZWFkaW5nIGNoYXJhY3RlcnMgZnJvbSBldmVyeSBsaW5lLlxuICogICA1LiBEcm9wIGxlYWRpbmcvdHJhaWxpbmcgYmxhbmsgbGluZXMsIHJldHVybiBqb2luZWQgcmVzdWx0LlxuICpcbiAqIENydWNpYWxseSwgc3RlcCAyIGRvZXMgTk9UIGNhbGwgLnRyaW0oKSBvbiB0aGUgaW5uZXIgY29udGVudCBiZWZvcmVcbiAqIGNvbXB1dGluZyBpbmRlbnRhdGlvbi4gQW4gaW5uZXIgLnRyaW0oKSB3b3VsZCBkZXN0cm95IHRoZSBsZWFkaW5nXG4gKiB3aGl0ZXNwYWNlIG9uIGxpbmUgMSwgbWFraW5nIG1pbkluZGVudCA9IDAgYW5kIGxlYXZpbmcgYWxsIG90aGVyXG4gKiBsaW5lcyB1bi1kZS1pbmRlbnRlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwQm9keShyYXc6IHN0cmluZyk6IHN0cmluZyB7XG4gIGxldCBzID0gcmF3LnRyaW0oKVxuXG4gIC8vIFN0cmlwIGJhY2t0aWNrIHdyYXBwZXIgXHUyMDE0IGJ1dCBwcmVzZXJ2ZSBpbnRlcm5hbCB3aGl0ZXNwYWNlIGZvciBkZS1pbmRlbnRcbiAgaWYgKHMuc3RhcnRzV2l0aCgnYCcpICYmIHMuZW5kc1dpdGgoJ2AnKSkge1xuICAgIHMgPSBzLnNsaWNlKDEsIC0xKVxuICAgIC8vIERvIE5PVCAudHJpbSgpIGhlcmUgXHUyMDE0IHRoYXQga2lsbHMgdGhlIGxlYWRpbmcgaW5kZW50IG9uIGxpbmUgMVxuICB9XG5cbiAgY29uc3QgbGluZXMgPSBzLnNwbGl0KCdcXG4nKVxuICBjb25zdCBub25FbXB0eSA9IGxpbmVzLmZpbHRlcihsID0+IGwudHJpbSgpLmxlbmd0aCA+IDApXG4gIGlmIChub25FbXB0eS5sZW5ndGggPT09IDApIHJldHVybiAnJ1xuXG4gIC8vIEZvciBzaW5nbGUtbGluZSB2YWx1ZXMgKG5vIG5ld2xpbmVzIGFmdGVyIGJhY2t0aWNrIHN0cmlwKSwganVzdCB0cmltXG4gIGlmIChsaW5lcy5sZW5ndGggPT09IDEpIHJldHVybiBzLnRyaW0oKVxuXG4gIC8vIE1pbmltdW0gbGVhZGluZyB3aGl0ZXNwYWNlIGFjcm9zcyBub24tZW1wdHkgbGluZXNcbiAgY29uc3QgbWluSW5kZW50ID0gbm9uRW1wdHkucmVkdWNlKChtaW4sIGxpbmUpID0+IHtcbiAgICBjb25zdCBsZWFkaW5nID0gbGluZS5tYXRjaCgvXihcXHMqKS8pPy5bMV0/Lmxlbmd0aCA/PyAwXG4gICAgcmV0dXJuIE1hdGgubWluKG1pbiwgbGVhZGluZylcbiAgfSwgSW5maW5pdHkpXG5cbiAgY29uc3Qgc3RyaXBwZWQgPSBtaW5JbmRlbnQgPT09IDAgfHwgbWluSW5kZW50ID09PSBJbmZpbml0eVxuICAgID8gbGluZXNcbiAgICA6IGxpbmVzLm1hcChsaW5lID0+IGxpbmUubGVuZ3RoID49IG1pbkluZGVudCA/IGxpbmUuc2xpY2UobWluSW5kZW50KSA6IGxpbmUudHJpbVN0YXJ0KCkpXG5cbiAgLy8gRHJvcCBsZWFkaW5nIGFuZCB0cmFpbGluZyBibGFuayBsaW5lcyAodGhlIG5ld2xpbmVzIGFyb3VuZCBiYWNrdGljayBjb250ZW50KVxuICBsZXQgc3RhcnQgPSAwXG4gIGxldCBlbmQgPSBzdHJpcHBlZC5sZW5ndGggLSAxXG4gIHdoaWxlIChzdGFydCA8PSBlbmQgJiYgc3RyaXBwZWRbc3RhcnRdPy50cmltKCkgPT09ICcnKSBzdGFydCsrXG4gIHdoaWxlIChlbmQgPj0gc3RhcnQgJiYgc3RyaXBwZWRbZW5kXT8udHJpbSgpID09PSAnJykgZW5kLS1cblxuICByZXR1cm4gc3RyaXBwZWQuc2xpY2Uoc3RhcnQsIGVuZCArIDEpLmpvaW4oJ1xcbicpXG59XG4iLCAiaW1wb3J0IHR5cGUge1xuICBMRVNDb25maWcsXG4gIE1vZHVsZURlY2wsXG4gIENvbW1hbmREZWNsLFxuICBFdmVudEhhbmRsZXJEZWNsLFxuICBTaWduYWxXYXRjaGVyRGVjbCxcbiAgT25Mb2FkRGVjbCxcbiAgT25FbnRlckRlY2wsXG4gIE9uRXhpdERlY2wsXG59IGZyb20gJy4vY29uZmlnLmpzJ1xuaW1wb3J0IHsgc3RyaXBCb2R5IH0gZnJvbSAnLi9zdHJpcEJvZHkuanMnXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gVGFnIG5hbWUgXHUyMTkyIGhhbmRsZXIgbWFwXG4vLyBFYWNoIGhhbmRsZXIgcmVhZHMgYXR0cmlidXRlcyBmcm9tIGEgY2hpbGQgZWxlbWVudCBhbmQgcHVzaGVzIGEgdHlwZWQgZGVjbFxuLy8gaW50byB0aGUgY29uZmlnIGJlaW5nIGJ1aWx0LiBVbmtub3duIHRhZ3MgYXJlIGNvbGxlY3RlZCBmb3Igd2FybmluZy5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG50eXBlIEhhbmRsZXIgPSAoZWw6IEVsZW1lbnQsIGNvbmZpZzogTEVTQ29uZmlnKSA9PiB2b2lkXG5cbmNvbnN0IEhBTkRMRVJTOiBSZWNvcmQ8c3RyaW5nLCBIYW5kbGVyPiA9IHtcblxuICAndXNlLW1vZHVsZScoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IHR5cGUgPSBlbC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKT8udHJpbSgpID8/IG51bGxcbiAgICBjb25zdCBzcmMgID0gZWwuZ2V0QXR0cmlidXRlKCdzcmMnKT8udHJpbSgpICA/PyBudWxsXG5cbiAgICBpZiAoIXR5cGUgJiYgIXNyYykge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8dXNlLW1vZHVsZT4gaGFzIG5laXRoZXIgdHlwZT0gbm9yIHNyYz0gXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25maWcubW9kdWxlcy5wdXNoKHsgdHlwZSwgc3JjLCBlbGVtZW50OiBlbCB9KVxuICB9LFxuXG4gICdsb2NhbC1jb21tYW5kJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgbmFtZSA9IGVsLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgPz8gJydcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdkbycpPy50cmltKCkgICA/PyAnJ1xuXG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDxsb2NhbC1jb21tYW5kPiBtaXNzaW5nIHJlcXVpcmVkIG5hbWU9IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBpZiAoIWJvZHkpIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFU10gPGxvY2FsLWNvbW1hbmQgbmFtZT1cIiR7bmFtZX1cIj4gbWlzc2luZyByZXF1aXJlZCBkbz0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLmAsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uZmlnLmNvbW1hbmRzLnB1c2goe1xuICAgICAgbmFtZSxcbiAgICAgIGFyZ3NSYXc6IGVsLmdldEF0dHJpYnV0ZSgnYXJncycpPy50cmltKCkgID8/ICcnLFxuICAgICAgZ3VhcmQ6ICAgZWwuZ2V0QXR0cmlidXRlKCdndWFyZCcpPy50cmltKCkgPz8gbnVsbCxcbiAgICAgIGJvZHk6ICAgIHN0cmlwQm9keShib2R5KSxcbiAgICAgIGVsZW1lbnQ6IGVsLFxuICAgIH0pXG4gIH0sXG5cbiAgJ29uLWV2ZW50JyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgbmFtZSA9IGVsLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgICA/PyAnJ1xuICAgIGNvbnN0IGJvZHkgPSBlbC5nZXRBdHRyaWJ1dGUoJ2hhbmRsZScpPy50cmltKCkgPz8gJydcblxuICAgIGlmICghbmFtZSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tZXZlbnQ+IG1pc3NpbmcgcmVxdWlyZWQgbmFtZT0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTXSA8b24tZXZlbnQgbmFtZT1cIiR7bmFtZX1cIj4gbWlzc2luZyByZXF1aXJlZCBoYW5kbGU9IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC5gLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbmZpZy5vbkV2ZW50LnB1c2goeyBuYW1lLCBib2R5OiBzdHJpcEJvZHkoYm9keSksIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG5cbiAgJ29uLXNpZ25hbCcoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IG5hbWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpICAgPz8gJydcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdoYW5kbGUnKT8udHJpbSgpID8/ICcnXG5cbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPG9uLXNpZ25hbD4gbWlzc2luZyByZXF1aXJlZCBuYW1lPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVNdIDxvbi1zaWduYWwgbmFtZT1cIiR7bmFtZX1cIj4gbWlzc2luZyByZXF1aXJlZCBoYW5kbGU9IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC5gLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbmZpZy5vblNpZ25hbC5wdXNoKHtcbiAgICAgIG5hbWUsXG4gICAgICB3aGVuOiAgICBlbC5nZXRBdHRyaWJ1dGUoJ3doZW4nKT8udHJpbSgpID8/IG51bGwsXG4gICAgICBib2R5OiAgICBzdHJpcEJvZHkoYm9keSksXG4gICAgICBlbGVtZW50OiBlbCxcbiAgICB9KVxuICB9LFxuXG4gICdvbi1sb2FkJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tbG9hZD4gbWlzc2luZyByZXF1aXJlZCBydW49IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25maWcub25Mb2FkLnB1c2goeyBib2R5OiBzdHJpcEJvZHkoYm9keSksIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG5cbiAgJ29uLWVudGVyJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tZW50ZXI+IG1pc3NpbmcgcmVxdWlyZWQgcnVuPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uZmlnLm9uRW50ZXIucHVzaCh7XG4gICAgICB3aGVuOiAgICBlbC5nZXRBdHRyaWJ1dGUoJ3doZW4nKT8udHJpbSgpID8/IG51bGwsXG4gICAgICBib2R5OiAgICBzdHJpcEJvZHkoYm9keSksXG4gICAgICBlbGVtZW50OiBlbCxcbiAgICB9KVxuICB9LFxuXG4gICdvbi1leGl0JyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tZXhpdD4gbWlzc2luZyByZXF1aXJlZCBydW49IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25maWcub25FeGl0LnB1c2goeyBib2R5OiBzdHJpcEJvZHkoYm9keSksIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gcmVhZENvbmZpZyBcdTIwMTQgdGhlIHB1YmxpYyBlbnRyeSBwb2ludFxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogV2Fsa3MgdGhlIGRpcmVjdCBjaGlsZHJlbiBvZiBhIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGVsZW1lbnQgYW5kXG4gKiBwcm9kdWNlcyBhIHN0cnVjdHVyZWQgTEVTQ29uZmlnLlxuICpcbiAqIE9ubHkgZGlyZWN0IGNoaWxkcmVuIGFyZSByZWFkIFx1MjAxNCBuZXN0ZWQgZWxlbWVudHMgaW5zaWRlIGEgPGxvY2FsLWNvbW1hbmQ+XG4gKiBib2R5IGFyZSBub3QgY2hpbGRyZW4gb2YgdGhlIGhvc3QgYW5kIGFyZSBuZXZlciB2aXNpdGVkIGhlcmUuXG4gKlxuICogVW5rbm93biBjaGlsZCBlbGVtZW50cyBlbWl0IGEgY29uc29sZS53YXJuIGFuZCBhcmUgY29sbGVjdGVkIGluIGNvbmZpZy51bmtub3duXG4gKiBzbyB0b29saW5nIChlLmcuIGEgZnV0dXJlIExFUyBsYW5ndWFnZSBzZXJ2ZXIpIGNhbiByZXBvcnQgdGhlbS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRDb25maWcoaG9zdDogRWxlbWVudCk6IExFU0NvbmZpZyB7XG4gIGNvbnN0IGNvbmZpZzogTEVTQ29uZmlnID0ge1xuICAgIGlkOiAgICAgICBob3N0LmlkIHx8ICcobm8gaWQpJyxcbiAgICBtb2R1bGVzOiAgW10sXG4gICAgY29tbWFuZHM6IFtdLFxuICAgIG9uRXZlbnQ6ICBbXSxcbiAgICBvblNpZ25hbDogW10sXG4gICAgb25Mb2FkOiAgIFtdLFxuICAgIG9uRW50ZXI6ICBbXSxcbiAgICBvbkV4aXQ6ICAgW10sXG4gICAgdW5rbm93bjogIFtdLFxuICB9XG5cbiAgZm9yIChjb25zdCBjaGlsZCBvZiBBcnJheS5mcm9tKGhvc3QuY2hpbGRyZW4pKSB7XG4gICAgY29uc3QgdGFnID0gY2hpbGQudGFnTmFtZS50b0xvd2VyQ2FzZSgpXG4gICAgY29uc3QgaGFuZGxlciA9IEhBTkRMRVJTW3RhZ11cblxuICAgIGlmIChoYW5kbGVyKSB7XG4gICAgICBoYW5kbGVyKGNoaWxkLCBjb25maWcpXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbmZpZy51bmtub3duLnB1c2goY2hpbGQpXG4gICAgICAvLyBPbmx5IHdhcm4gZm9yIGh5cGhlbmF0ZWQgY3VzdG9tIGVsZW1lbnQgbmFtZXMgXHUyMDE0IHRob3NlIGFyZSBsaWtlbHlcbiAgICAgIC8vIG1pcy10eXBlZCBMRVMga2V5d29yZHMuIFBsYWluIEhUTUwgZWxlbWVudHMgKGRpdiwgcCwgc2VjdGlvbiwgZXRjLilcbiAgICAgIC8vIGFyZSB2YWxpZCBjb250ZW50IGNoaWxkcmVuIGFuZCBwYXNzIHRocm91Z2ggc2lsZW50bHkuXG4gICAgICBpZiAodGFnLmluY2x1ZGVzKCctJykpIHtcbiAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgIGBbTEVTXSBVbmtub3duIGNoaWxkIGVsZW1lbnQgPCR7dGFnfT4gaW5zaWRlIDxsb2NhbC1ldmVudC1zY3JpcHQgaWQ9XCIke2NvbmZpZy5pZH1cIj4gXHUyMDE0IGlnbm9yZWQuIERpZCB5b3UgbWVhbiBhIExFUyBlbGVtZW50P2AsXG4gICAgICAgICAgY2hpbGRcbiAgICAgICAgKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjb25maWdcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBsb2dDb25maWcgXHUyMDE0IHN0cnVjdHVyZWQgY2hlY2twb2ludCBsb2dcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIExvZ3MgYSBzdW1tYXJ5IG9mIGEgcGFyc2VkIExFU0NvbmZpZy5cbiAqIFBoYXNlIDEgY2hlY2twb2ludDogeW91IHNob3VsZCBzZWUgdGhpcyBpbiB0aGUgYnJvd3NlciBjb25zb2xlL2RlYnVnIGxvZ1xuICogd2l0aCBhbGwgY29tbWFuZHMsIGV2ZW50cywgYW5kIHNpZ25hbCB3YXRjaGVycyBjb3JyZWN0bHkgbGlzdGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9nQ29uZmlnKGNvbmZpZzogTEVTQ29uZmlnKTogdm9pZCB7XG4gIGNvbnN0IGlkID0gY29uZmlnLmlkXG4gIGNvbnNvbGUubG9nKGBbTEVTXSBjb25maWcgcmVhZCBmb3IgIyR7aWR9YClcbiAgY29uc29sZS5sb2coYFtMRVNdICAgbW9kdWxlczogICAke2NvbmZpZy5tb2R1bGVzLmxlbmd0aH1gLCBjb25maWcubW9kdWxlcy5tYXAobSA9PiBtLnR5cGUgPz8gbS5zcmMpKVxuICBjb25zb2xlLmxvZyhgW0xFU10gICBjb21tYW5kczogICR7Y29uZmlnLmNvbW1hbmRzLmxlbmd0aH1gLCBjb25maWcuY29tbWFuZHMubWFwKGMgPT4gYy5uYW1lKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tZXZlbnQ6ICAke2NvbmZpZy5vbkV2ZW50Lmxlbmd0aH1gLCBjb25maWcub25FdmVudC5tYXAoZSA9PiBlLm5hbWUpKVxuICBjb25zb2xlLmxvZyhgW0xFU10gICBvbi1zaWduYWw6ICR7Y29uZmlnLm9uU2lnbmFsLmxlbmd0aH1gLCBjb25maWcub25TaWduYWwubWFwKHMgPT4gcy5uYW1lKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tbG9hZDogICAke2NvbmZpZy5vbkxvYWQubGVuZ3RofWApXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG9uLWVudGVyOiAgJHtjb25maWcub25FbnRlci5sZW5ndGh9YCwgY29uZmlnLm9uRW50ZXIubWFwKGUgPT4gZS53aGVuID8/ICdhbHdheXMnKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tZXhpdDogICAke2NvbmZpZy5vbkV4aXQubGVuZ3RofWApXG5cbiAgaWYgKGNvbmZpZy51bmtub3duLmxlbmd0aCA+IDApIHtcbiAgICBjb25zb2xlLndhcm4oYFtMRVNdICAgdW5rbm93biBjaGlsZHJlbjogJHtjb25maWcudW5rbm93bi5sZW5ndGh9YCwgY29uZmlnLnVua25vd24ubWFwKGUgPT4gZS50YWdOYW1lLnRvTG93ZXJDYXNlKCkpKVxuICB9XG5cbiAgLy8gTG9nIGEgc2FtcGxpbmcgb2YgYm9keSBzdHJpbmdzIHRvIHZlcmlmeSBzdHJpcEJvZHkgd29ya2VkIGNvcnJlY3RseVxuICBpZiAoY29uZmlnLmNvbW1hbmRzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBmaXJzdCA9IGNvbmZpZy5jb21tYW5kc1swXVxuICAgIGlmIChmaXJzdCkge1xuICAgICAgY29uc29sZS5sb2coYFtMRVNdICAgZmlyc3QgY29tbWFuZCBib2R5IHByZXZpZXcgKFwiJHtmaXJzdC5uYW1lfVwiKTpgKVxuICAgICAgY29uc3QgcHJldmlldyA9IGZpcnN0LmJvZHkuc3BsaXQoJ1xcbicpLnNsaWNlKDAsIDQpLmpvaW4oJ1xcbiAgJylcbiAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSAgIHwgJHtwcmV2aWV3fWApXG4gICAgfVxuICB9XG59XG4iLCAiLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBMRVMgVG9rZW5pemVyXG4vL1xuLy8gQ29udmVydHMgYSBzdHJpcEJvZHknZCBzb3VyY2Ugc3RyaW5nIGludG8gYSBmbGF0IGFycmF5IG9mIFRva2VuIG9iamVjdHMuXG4vLyBUb2tlbnMgYXJlIHNpbXBseSBub24tYmxhbmsgbGluZXMgd2l0aCB0aGVpciBpbmRlbnQgbGV2ZWwgcmVjb3JkZWQuXG4vLyBObyBzZW1hbnRpYyBhbmFseXNpcyBoYXBwZW5zIGhlcmUgXHUyMDE0IHRoYXQncyB0aGUgcGFyc2VyJ3Mgam9iLlxuLy9cbi8vIFRoZSB0b2tlbml6ZXIgaXMgZGVsaWJlcmF0ZWx5IG1pbmltYWw6IGl0IHByZXNlcnZlcyB0aGUgcmF3IGluZGVudGF0aW9uXG4vLyBpbmZvcm1hdGlvbiB0aGUgcGFyc2VyIG5lZWRzIHRvIHVuZGVyc3RhbmQgYmxvY2sgc3RydWN0dXJlLlxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBpbnRlcmZhY2UgVG9rZW4ge1xuICAvKiogQ29sdW1uIG9mZnNldCBvZiB0aGUgZmlyc3Qgbm9uLXdoaXRlc3BhY2UgY2hhcmFjdGVyIChudW1iZXIgb2Ygc3BhY2VzKSAqL1xuICBpbmRlbnQ6IG51bWJlclxuICAvKiogVHJpbW1lZCBsaW5lIGNvbnRlbnQgXHUyMDE0IG5vIGxlYWRpbmcvdHJhaWxpbmcgd2hpdGVzcGFjZSAqL1xuICB0ZXh0OiBzdHJpbmdcbiAgLyoqIDEtYmFzZWQgbGluZSBudW1iZXIgaW4gdGhlIHN0cmlwcGVkIHNvdXJjZSAoZm9yIGVycm9yIG1lc3NhZ2VzKSAqL1xuICBsaW5lTnVtOiBudW1iZXJcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhIHN0cmlwcGVkIExFUyBib2R5IHN0cmluZyBpbnRvIGEgVG9rZW4gYXJyYXkuXG4gKiBCbGFuayBsaW5lcyBhcmUgZHJvcHBlZC4gVGFicyBhcmUgZXhwYW5kZWQgdG8gMiBzcGFjZXMgZWFjaC5cbiAqXG4gKiBAcGFyYW0gc291cmNlICBBIHN0cmluZyBhbHJlYWR5IHByb2Nlc3NlZCBieSBzdHJpcEJvZHkoKSBcdTIwMTQgbm8gYmFja3RpY2sgd3JhcHBlcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b2tlbml6ZShzb3VyY2U6IHN0cmluZyk6IFRva2VuW10ge1xuICBjb25zdCB0b2tlbnM6IFRva2VuW10gPSBbXVxuICBjb25zdCBsaW5lcyA9IHNvdXJjZS5zcGxpdCgnXFxuJylcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgcmF3ID0gKGxpbmVzW2ldID8/ICcnKS5yZXBsYWNlKC9cXHQvZywgJyAgJylcbiAgICBjb25zdCB0ZXh0ID0gcmF3LnRyaW0oKVxuXG4gICAgLy8gU2tpcCBibGFuayBsaW5lc1xuICAgIGlmICh0ZXh0Lmxlbmd0aCA9PT0gMCkgY29udGludWVcblxuICAgIGNvbnN0IGluZGVudCA9IHJhdy5sZW5ndGggLSByYXcudHJpbVN0YXJ0KCkubGVuZ3RoXG5cbiAgICB0b2tlbnMucHVzaCh7XG4gICAgICBpbmRlbnQsXG4gICAgICB0ZXh0LFxuICAgICAgbGluZU51bTogaSArIDEsXG4gICAgfSlcbiAgfVxuXG4gIHJldHVybiB0b2tlbnNcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBIZWxwZXJzIHVzZWQgYnkgYm90aCB0aGUgdG9rZW5pemVyIHRlc3RzIGFuZCB0aGUgcGFyc2VyXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgYHRleHRgIGVuZHMgd2l0aCBhIHN0YW5kYWxvbmUgYGFuZGAgd29yZC5cbiAqIFVzZWQgYnkgdGhlIHBhcnNlciB0byBkZXRlY3QgcGFyYWxsZWwgYnJhbmNoZXMuXG4gKlxuICogQ2FyZWZ1bDogXCJlbmdsYW5kXCIsIFwiYmFuZFwiLCBcImNvbW1hbmRcIiBtdXN0IE5PVCBtYXRjaC5cbiAqIFdlIHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5IGJlZm9yZSBgYW5kYCBhbmQgZW5kLW9mLXN0cmluZyBhZnRlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuZHNXaXRoQW5kKHRleHQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gL1xcYmFuZCQvLnRlc3QodGV4dClcbn1cblxuLyoqXG4gKiBTdHJpcHMgdGhlIHRyYWlsaW5nIGAgYW5kYCBmcm9tIGEgbGluZSB0aGF0IGVuZHNXaXRoQW5kLlxuICogUmV0dXJucyB0aGUgdHJpbW1lZCBsaW5lIGNvbnRlbnQgd2l0aG91dCBpdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwVHJhaWxpbmdBbmQodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvXFxzK2FuZCQvLCAnJykudHJpbUVuZCgpXG59XG5cbi8qKlxuICogQmxvY2sgdGVybWluYXRvciB0b2tlbnMgXHUyMDE0IHNpZ25hbCB0aGUgZW5kIG9mIGEgbWF0Y2ggb3IgdHJ5IGJsb2NrLlxuICogVGhlc2UgYXJlIGNvbnN1bWVkIGJ5IHRoZSBibG9jay1vd25pbmcgcGFyc2VyIChwYXJzZU1hdGNoIC8gcGFyc2VUcnkpLFxuICogbm90IGJ5IHBhcnNlQmxvY2sgaXRzZWxmLlxuICovXG5leHBvcnQgY29uc3QgQkxPQ0tfVEVSTUlOQVRPUlMgPSBuZXcgU2V0KFsnL21hdGNoJywgJy90cnknXSlcblxuLyoqXG4gKiBLZXl3b3JkcyB0aGF0IGVuZCBhIHRyeSBib2R5IGFuZCBzdGFydCBhIHJlc2N1ZS9hZnRlcndhcmRzIGNsYXVzZS5cbiAqIFJlY29nbml6ZWQgb25seSB3aGVuIHRoZXkgYXBwZWFyIGF0IHRoZSBzYW1lIGluZGVudCBsZXZlbCBhcyB0aGUgYHRyeWAuXG4gKi9cbmV4cG9ydCBjb25zdCBUUllfQ0xBVVNFX0tFWVdPUkRTID0gbmV3IFNldChbJ3Jlc2N1ZScsICdhZnRlcndhcmRzJ10pXG4iLCAiaW1wb3J0IHR5cGUge1xuICBMRVNOb2RlLCBFeHByTm9kZSwgU2VxdWVuY2VOb2RlLCBQYXJhbGxlbE5vZGUsXG4gIFNldE5vZGUsIEVtaXROb2RlLCBCcm9hZGNhc3ROb2RlLCBXYWl0Tm9kZSwgQ2FsbE5vZGUsXG4gIEJpbmROb2RlLCBBY3Rpb25Ob2RlLCBNYXRjaE5vZGUsIE1hdGNoQXJtLCBQYXR0ZXJuTm9kZSxcbiAgVHJ5Tm9kZSwgQW5pbWF0aW9uTm9kZSxcbn0gZnJvbSAnLi9hc3QuanMnXG5pbXBvcnQgdHlwZSB7IFRva2VuIH0gZnJvbSAnLi90b2tlbml6ZXIuanMnXG5pbXBvcnQge1xuICBlbmRzV2l0aEFuZCwgc3RyaXBUcmFpbGluZ0FuZCxcbiAgQkxPQ0tfVEVSTUlOQVRPUlMsIFRSWV9DTEFVU0VfS0VZV09SRFMsXG59IGZyb20gJy4vdG9rZW5pemVyLmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEtub3duIGFuaW1hdGlvbiBwcmltaXRpdmUgbmFtZXMgKHJlZ2lzdGVyZWQgYnkgdGhlIGFuaW1hdGlvbiBtb2R1bGUpXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgQU5JTUFUSU9OX1BSSU1JVElWRVMgPSBuZXcgU2V0KFtcbiAgJ2ZhZGUtaW4nLCAnZmFkZS1vdXQnLCAnc2xpZGUtaW4nLCAnc2xpZGUtb3V0JyxcbiAgJ3NsaWRlLXVwJywgJ3NsaWRlLWRvd24nLCAncHVsc2UnLFxuICAnc3RhZ2dlci1lbnRlcicsICdzdGFnZ2VyLWV4aXQnLFxuXSlcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXJzZXJcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5leHBvcnQgY2xhc3MgTEVTUGFyc2VyIHtcbiAgcHJpdmF0ZSBwb3MgPSAwXG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSB0b2tlbnM6IFRva2VuW10pIHt9XG5cbiAgcHJpdmF0ZSBwZWVrKG9mZnNldCA9IDApOiBUb2tlbiB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMudG9rZW5zW3RoaXMucG9zICsgb2Zmc2V0XVxuICB9XG5cbiAgcHJpdmF0ZSBhZHZhbmNlKCk6IFRva2VuIHtcbiAgICBjb25zdCB0ID0gdGhpcy50b2tlbnNbdGhpcy5wb3NdXG4gICAgaWYgKCF0KSB0aHJvdyBuZXcgTEVTUGFyc2VFcnJvcignVW5leHBlY3RlZCBlbmQgb2YgaW5wdXQnLCB1bmRlZmluZWQpXG4gICAgdGhpcy5wb3MrK1xuICAgIHJldHVybiB0XG4gIH1cblxuICBwcml2YXRlIGF0RW5kKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnBvcyA+PSB0aGlzLnRva2Vucy5sZW5ndGhcbiAgfVxuXG4gIHByaXZhdGUgdHJ5Q29uc3VtZSh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB0ID0gdGhpcy5wZWVrKClcbiAgICBpZiAodD8udGV4dCA9PT0gdGV4dCkgeyB0aGlzLnBvcysrOyByZXR1cm4gdHJ1ZSB9XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgRW50cnkgcG9pbnQgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcGFyc2UoKTogTEVTTm9kZSB7XG4gICAgY29uc3Qgbm9kZSA9IHRoaXMucGFyc2VCbG9jaygtMSlcbiAgICByZXR1cm4gbm9kZVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEJsb2NrIHBhcnNlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKipcbiAgICogUGFyc2VzIGFsbCBzdGF0ZW1lbnRzIGF0IGluZGVudCA+IGJhc2VJbmRlbnQuXG4gICAqXG4gICAqIFN0b3BzIHdoZW4gaXQgZW5jb3VudGVyczpcbiAgICogICAtIEEgdG9rZW4gd2l0aCBpbmRlbnQgPD0gYmFzZUluZGVudFxuICAgKiAgIC0gQSBibG9jayB0ZXJtaW5hdG9yICgvbWF0Y2gsIC90cnkpIFx1MjAxNCBsZWZ0IGZvciB0aGUgcGFyZW50IHRvIGNvbnN1bWVcbiAgICogICAtIEEgdHJ5LWNsYXVzZSBrZXl3b3JkIChyZXNjdWUsIGFmdGVyd2FyZHMpIGF0IGluZGVudCA8PSBiYXNlSW5kZW50XG4gICAqICAgLSBFbmQgb2YgdG9rZW4gc3RyZWFtXG4gICAqXG4gICAqIFJldHVybnMgYSBTZXF1ZW5jZU5vZGUgaWYgbXVsdGlwbGUgc3RlcHMsIG90aGVyd2lzZSB0aGUgc2luZ2xlIG5vZGUuXG4gICAqL1xuICBwcml2YXRlIHBhcnNlQmxvY2soYmFzZUluZGVudDogbnVtYmVyKTogTEVTTm9kZSB7XG4gICAgY29uc3Qgc3RlcHM6IExFU05vZGVbXSA9IFtdXG5cbiAgICB3aGlsZSAoIXRoaXMuYXRFbmQoKSkge1xuICAgICAgY29uc3QgdCA9IHRoaXMucGVlaygpIVxuXG4gICAgICAvLyBTdG9wOiB3ZSd2ZSByZXR1cm5lZCB0byBvciBwYXN0IHRoZSBwYXJlbnQgYmxvY2sncyBpbmRlbnRcbiAgICAgIGlmICh0LmluZGVudCA8PSBiYXNlSW5kZW50KSBicmVha1xuXG4gICAgICAvLyBTdG9wOiBibG9jayB0ZXJtaW5hdG9ycyBhcmUgY29uc3VtZWQgYnkgdGhlIGJsb2NrIG9wZW5lciAobWF0Y2gvdHJ5KVxuICAgICAgaWYgKEJMT0NLX1RFUk1JTkFUT1JTLmhhcyh0LnRleHQpKSBicmVha1xuXG4gICAgICAvLyBTdG9wOiB0cnktY2xhdXNlIGtleXdvcmRzIGVuZCB0aGUgY3VycmVudCB0cnkgYm9keVxuICAgICAgaWYgKFRSWV9DTEFVU0VfS0VZV09SRFMuaGFzKHQudGV4dCkgJiYgdC5pbmRlbnQgPD0gYmFzZUluZGVudCArIDIpIGJyZWFrXG5cbiAgICAgIC8vIFx1MjUwMFx1MjUwMCBTZXF1ZW50aWFsIGNvbm5lY3RpdmU6IHN0YW5kYWxvbmUgYHRoZW5gIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgICAgLy8gYHRoZW5gIGFsb25lIG9uIGEgbGluZSBpbnRyb2R1Y2VzIHRoZSBuZXh0IHNlcXVlbnRpYWwgc3RlcCxcbiAgICAgIC8vIHdoaWNoIGlzIGEgYmxvY2sgYXQgYSBkZWVwZXIgaW5kZW50IGxldmVsLlxuICAgICAgaWYgKHQudGV4dCA9PT0gJ3RoZW4nKSB7XG4gICAgICAgIGNvbnN0IHRoZW5JbmRlbnQgPSB0LmluZGVudFxuICAgICAgICB0aGlzLmFkdmFuY2UoKSAvLyBjb25zdW1lIGB0aGVuYFxuICAgICAgICBjb25zdCBuZXh0ID0gdGhpcy5wZWVrKClcbiAgICAgICAgaWYgKG5leHQgJiYgbmV4dC5pbmRlbnQgPiB0aGVuSW5kZW50KSB7XG4gICAgICAgICAgY29uc3Qgc3RlcCA9IHRoaXMucGFyc2VCbG9jayh0aGVuSW5kZW50KVxuICAgICAgICAgIHN0ZXBzLnB1c2goc3RlcClcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyBcdTI1MDBcdTI1MDAgU2VxdWVudGlhbCBjb25uZWN0aXZlOiBgdGhlbiBYYCBhcyBwcmVmaXggXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgICAvLyBgdGhlbiBjYWxsIGZvb2AsIGB0aGVuIGVtaXQgYmFyYCwgZXRjLlxuICAgICAgLy8gVGhlIGB0aGVuYCBpcyBqdXN0IGEgdmlzdWFsIHNlcXVlbmNlciBcdTIwMTQgdGhlIHJlc3Qgb2YgdGhlIGxpbmUgaXMgdGhlIHN0ZXAuXG4gICAgICBpZiAodC50ZXh0LnN0YXJ0c1dpdGgoJ3RoZW4gJykpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICAgICAgY29uc3QgcmVzdCA9IHQudGV4dC5zbGljZSg1KS50cmltKClcbiAgICAgICAgY29uc3Qgc3RlcCA9IHRoaXMucGFyc2VTaW5nbGVMaW5lKHJlc3QsIHQuaW5kZW50LCB0KVxuICAgICAgICBzdGVwcy5wdXNoKHN0ZXApXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIFx1MjUwMFx1MjUwMCBSZWd1bGFyIHN0YXRlbWVudCAocG9zc2libHkgYSBwYXJhbGxlbCBncm91cCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgICBjb25zdCBzdG10ID0gdGhpcy5wYXJzZVN0YXRlbWVudE9yUGFyYWxsZWwodC5pbmRlbnQpXG4gICAgICBzdGVwcy5wdXNoKHN0bXQpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRvU2VxdWVuY2VPclNpbmdsZShzdGVwcylcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBQYXJhbGxlbCBncm91cCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKipcbiAgICogUGFyc2VzIG9uZSBzdGF0ZW1lbnQgb3IgYSBncm91cCBvZiBwYXJhbGxlbCBzdGF0ZW1lbnRzIGNvbm5lY3RlZCBieSBgYW5kYC5cbiAgICpcbiAgICogTGluZXMgZW5kaW5nIHdpdGggYSBzdGFuZGFsb25lIGBhbmRgIGluZGljYXRlIHRoYXQgdGhlIG5leHQgbGluZSBydW5zXG4gICAqIGNvbmN1cnJlbnRseS4gQWxsIHBhcmFsbGVsIGJyYW5jaGVzIGFyZSB3cmFwcGVkIGluIGEgUGFyYWxsZWxOb2RlLlxuICAgKlxuICAgKiBgYW5kYC1ncm91cHMgb25seSBhcHBseSB3aXRoaW4gdGhlIHNhbWUgaW5kZW50IGxldmVsLiBBIGRlZXBlci1pbmRlbnRlZFxuICAgKiBsaW5lIGFmdGVyIGBhbmRgIGlzIGFuIGVycm9yICh3b3VsZCBpbmRpY2F0ZSBhIGJsb2NrLCBidXQgYGFuZGAgaXNcbiAgICogYSBsaW5lLWxldmVsIGNvbm5lY3Rvciwgbm90IGEgYmxvY2sgb3BlbmVyKS5cbiAgICovXG4gIHByaXZhdGUgcGFyc2VTdGF0ZW1lbnRPclBhcmFsbGVsKGJsb2NrSW5kZW50OiBudW1iZXIpOiBMRVNOb2RlIHtcbiAgICBjb25zdCBicmFuY2hlczogTEVTTm9kZVtdID0gW11cblxuICAgIHdoaWxlICghdGhpcy5hdEVuZCgpKSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy5wZWVrKCkhXG5cbiAgICAgIC8vIFN0b3AgY29uZGl0aW9ucyBcdTIwMTQgc2FtZSBhcyBwYXJzZUJsb2NrJ3NcbiAgICAgIGlmICh0LmluZGVudCA8IGJsb2NrSW5kZW50KSBicmVha1xuICAgICAgaWYgKHQuaW5kZW50ID4gYmxvY2tJbmRlbnQpIGJyZWFrICAgLy8gc2hvdWxkbid0IGhhcHBlbiBoZXJlLCBzYWZldHkgZ3VhcmRcbiAgICAgIGlmIChCTE9DS19URVJNSU5BVE9SUy5oYXModC50ZXh0KSkgYnJlYWtcbiAgICAgIGlmIChUUllfQ0xBVVNFX0tFWVdPUkRTLmhhcyh0LnRleHQpKSBicmVha1xuICAgICAgaWYgKHQudGV4dCA9PT0gJ3RoZW4nIHx8IHQudGV4dC5zdGFydHNXaXRoKCd0aGVuICcpKSBicmVha1xuXG4gICAgICBjb25zdCBoYXNBbmQgPSBlbmRzV2l0aEFuZCh0LnRleHQpXG4gICAgICBjb25zdCBsaW5lVGV4dCA9IGhhc0FuZCA/IHN0cmlwVHJhaWxpbmdBbmQodC50ZXh0KSA6IHQudGV4dFxuXG4gICAgICB0aGlzLmFkdmFuY2UoKVxuXG4gICAgICBjb25zdCBzdG10ID0gdGhpcy5wYXJzZVNpbmdsZUxpbmUobGluZVRleHQsIHQuaW5kZW50LCB0KVxuICAgICAgYnJhbmNoZXMucHVzaChzdG10KVxuXG4gICAgICBpZiAoIWhhc0FuZCkgYnJlYWtcbiAgICB9XG5cbiAgICBpZiAoYnJhbmNoZXMubGVuZ3RoID09PSAwKSByZXR1cm4gZXhwcignJylcbiAgICBpZiAoYnJhbmNoZXMubGVuZ3RoID09PSAxKSByZXR1cm4gYnJhbmNoZXNbMF0hXG4gICAgcmV0dXJuIHsgdHlwZTogJ3BhcmFsbGVsJywgYnJhbmNoZXMgfSBzYXRpc2ZpZXMgUGFyYWxsZWxOb2RlXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgU2luZ2xlLWxpbmUgZGlzcGF0Y2ggXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgLyoqXG4gICAqIFBhcnNlcyBhIHNpbmdsZSBzdGF0ZW1lbnQgZnJvbSBpdHMgdGV4dCBjb250ZW50LlxuICAgKiBUaGUgdGV4dCBoYXMgYWxyZWFkeSBoYWQgYHRoZW4gYCBwcmVmaXggYW5kIHRyYWlsaW5nIGAgYW5kYCBzdHJpcHBlZC5cbiAgICpcbiAgICogRGlzcGF0Y2ggb3JkZXIgbWF0dGVyczogbW9yZSBzcGVjaWZpYyBwYXR0ZXJucyBtdXN0IGNvbWUgYmVmb3JlIGdlbmVyYWwgb25lcy5cbiAgICovXG4gIHByaXZhdGUgcGFyc2VTaW5nbGVMaW5lKHRleHQ6IHN0cmluZywgaW5kZW50OiBudW1iZXIsIHRva2VuOiBUb2tlbik6IExFU05vZGUge1xuICAgIGNvbnN0IGZpcnN0ID0gZmlyc3RXb3JkKHRleHQpXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgQmxvY2sgY29uc3RydWN0cyAoY29uc3VtZSBtdWx0aXBsZSBmb2xsb3dpbmcgdG9rZW5zKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAoZmlyc3QgPT09ICdtYXRjaCcpIHJldHVybiB0aGlzLnBhcnNlTWF0Y2godGV4dCwgaW5kZW50LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICd0cnknKSAgIHJldHVybiB0aGlzLnBhcnNlVHJ5KGluZGVudCwgdG9rZW4pXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgU2ltcGxlIHN0YXRlbWVudCBkaXNwYXRjaCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAoZmlyc3QgPT09ICdzZXQnKSAgICAgICByZXR1cm4gdGhpcy5wYXJzZVNldCh0ZXh0LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICdlbWl0JykgICAgICByZXR1cm4gdGhpcy5wYXJzZUVtaXQodGV4dCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAnYnJvYWRjYXN0JykgcmV0dXJuIHRoaXMucGFyc2VCcm9hZGNhc3QodGV4dCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAnY2FsbCcpICAgICAgcmV0dXJuIHRoaXMucGFyc2VDYWxsKHRleHQsIHRva2VuKVxuICAgIGlmIChmaXJzdCA9PT0gJ3dhaXQnKSAgICAgIHJldHVybiB0aGlzLnBhcnNlV2FpdCh0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBCYXJlIERhdGFzdGFyIGFjdGlvbjogYEBnZXQgJy91cmwnIFthcmdzXWAgKGZpcmUtYW5kLWF3YWl0LCBubyBiaW5kKSBcdTI1MDBcdTI1MDBcbiAgICBpZiAoZmlyc3Quc3RhcnRzV2l0aCgnQCcpKSAgcmV0dXJuIHRoaXMucGFyc2VBY3Rpb24odGV4dCwgdG9rZW4pXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgQXN5bmMgYmluZDogYG5hbWUgPC0gQHZlcmIgJ3VybCcgW2FyZ3NdYCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAodGV4dC5pbmNsdWRlcygnIDwtICcpKSByZXR1cm4gdGhpcy5wYXJzZUJpbmQodGV4dCwgdG9rZW4pXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgQW5pbWF0aW9uIHByaW1pdGl2ZSAoYnVpbHQtaW4pIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGlmIChBTklNQVRJT05fUFJJTUlUSVZFUy5oYXMoZmlyc3QpKSByZXR1cm4gdGhpcy5wYXJzZUFuaW1hdGlvbih0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBBbmltYXRpb24gcHJpbWl0aXZlICh1c2VybGFuZCBtb2R1bGUpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIC8vIEFueSBoeXBoZW5hdGVkIHdvcmQgZm9sbG93ZWQgYnkgYSBDU1Mgc2VsZWN0b3IgKyBkdXJhdGlvbiBsb29rcyBsaWtlIGFuXG4gICAgLy8gYW5pbWF0aW9uIGNhbGwuIFRoaXMgaGFuZGxlcyB1c2VybGFuZCBwcmltaXRpdmVzIGxpa2UgYHNjcm9sbC1yZXZlYWxgLFxuICAgIC8vIGBzcHJpbmctaW5gLCBldGMuIHJlZ2lzdGVyZWQgdmlhIDx1c2UtbW9kdWxlIHNyYz1cIi4uLlwiPi5cbiAgICAvLyBQYXR0ZXJuOiB3b3JkLXdpdGgtaHlwaGVuICAuc2VsZWN0b3Itb3ItI2lkICBObXMgIGVhc2luZyAgW29wdHM/XVxuICAgIGlmIChmaXJzdC5pbmNsdWRlcygnLScpICYmIGxvb2tzTGlrZUFuaW1hdGlvbkNhbGwodGV4dCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnBhcnNlQW5pbWF0aW9uKHRleHQsIHRva2VuKVxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBVbmtub3duOiBzdG9yZSBhcyByYXcgZXhwcmVzc2lvbiAoZXNjYXBlIGhhdGNoIC8gZnV0dXJlIGtleXdvcmRzKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBVbmtub3duIHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICByZXR1cm4gZXhwcih0ZXh0KVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIE1hdGNoIGJsb2NrIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgcGFyc2VNYXRjaCh0ZXh0OiBzdHJpbmcsIGluZGVudDogbnVtYmVyLCB0b2tlbjogVG9rZW4pOiBNYXRjaE5vZGUge1xuICAgIC8vIGB0ZXh0YCBpcyBlLmcuIFwibWF0Y2ggcmVzcG9uc2VcIiBvciBcIm1hdGNoICRmZWVkU3RhdGVcIlxuICAgIGNvbnN0IHN1YmplY3RSYXcgPSB0ZXh0LnNsaWNlKCdtYXRjaCcubGVuZ3RoKS50cmltKClcbiAgICBjb25zdCBzdWJqZWN0OiBFeHByTm9kZSA9IGV4cHIoc3ViamVjdFJhdylcbiAgICBjb25zdCBhcm1zOiBNYXRjaEFybVtdID0gW11cblxuICAgIHdoaWxlICghdGhpcy5hdEVuZCgpKSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy5wZWVrKCkhXG5cbiAgICAgIC8vIC9tYXRjaCB0ZXJtaW5hdGVzIHRoZSBibG9ja1xuICAgICAgaWYgKHQudGV4dCA9PT0gJy9tYXRjaCcpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgLy8gT25seSBjb25zdW1lIGFybSBsaW5lcyBhdCB0aGUgZXhwZWN0ZWQgYXJtIGluZGVudCAoaW5kZW50ICsgMilcbiAgICAgIGlmICh0LmluZGVudCA8PSBpbmRlbnQpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gVW5jbG9zZWQgbWF0Y2ggYmxvY2sgXHUyMDE0IG1pc3NpbmcgL21hdGNoYCwgdG9rZW4pXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIC8vIFBhcnNlIGFuIGFybTogYFtwYXR0ZXJuXSAtPmAgb3IgYFtwYXR0ZXJuXSAtPiBib2R5YFxuICAgICAgaWYgKHQudGV4dC5zdGFydHNXaXRoKCdbJykpIHtcbiAgICAgICAgYXJtcy5wdXNoKHRoaXMucGFyc2VNYXRjaEFybSh0LmluZGVudCwgdCkpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIFNraXAgdW5leHBlY3RlZCBsaW5lcyBpbnNpZGUgbWF0Y2hcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIFVuZXhwZWN0ZWQgdG9rZW4gaW5zaWRlIG1hdGNoIGJsb2NrOiAke0pTT04uc3RyaW5naWZ5KHQudGV4dCl9YCwgdClcbiAgICAgIHRoaXMuYWR2YW5jZSgpXG4gICAgfVxuXG4gICAgcmV0dXJuIHsgdHlwZTogJ21hdGNoJywgc3ViamVjdCwgYXJtcyB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlTWF0Y2hBcm0oYXJtSW5kZW50OiBudW1iZXIsIHRva2VuOiBUb2tlbik6IE1hdGNoQXJtIHtcbiAgICBjb25zdCB0ID0gdGhpcy5hZHZhbmNlKCkgLy8gY29uc3VtZSB0aGUgYXJtIGxpbmVcblxuICAgIC8vIFNwbGl0IG9uIGAgLT5gIHRvIHNlcGFyYXRlIHBhdHRlcm4gZnJvbSBib2R5XG4gICAgY29uc3QgYXJyb3dJZHggPSB0LnRleHQuaW5kZXhPZignIC0+JylcbiAgICBpZiAoYXJyb3dJZHggPT09IC0xKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYXRjaCBhcm0gbWlzc2luZyAnLT4nOiAke0pTT04uc3RyaW5naWZ5KHQudGV4dCl9YCwgdClcbiAgICAgIHJldHVybiB7IHBhdHRlcm5zOiBbeyBraW5kOiAnd2lsZGNhcmQnIH1dLCBib2R5OiBleHByKCcnKSB9XG4gICAgfVxuXG4gICAgY29uc3QgcGF0dGVyblJhdyA9IHQudGV4dC5zbGljZSgwLCBhcnJvd0lkeCkudHJpbSgpXG4gICAgY29uc3QgYWZ0ZXJBcnJvdyA9IHQudGV4dC5zbGljZShhcnJvd0lkeCArIDMpLnRyaW0oKSAgLy8gZXZlcnl0aGluZyBhZnRlciBgLT5gXG5cbiAgICBjb25zdCBwYXR0ZXJucyA9IHBhcnNlUGF0dGVybnMocGF0dGVyblJhdylcblxuICAgIGxldCBib2R5OiBMRVNOb2RlXG4gICAgaWYgKGFmdGVyQXJyb3cubGVuZ3RoID4gMCkge1xuICAgICAgLy8gSW5saW5lIGFybTogYFsnZXJyb3InXSAtPiBzZXQgJGZlZWRTdGF0ZSB0byAnZXJyb3InYFxuICAgICAgYm9keSA9IHRoaXMucGFyc2VTaW5nbGVMaW5lKGFmdGVyQXJyb3csIGFybUluZGVudCwgdG9rZW4pXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE11bHRpLWxpbmUgYXJtOiBib2R5IGlzIHRoZSBkZWVwZXItaW5kZW50ZWQgYmxvY2tcbiAgICAgIGJvZHkgPSB0aGlzLnBhcnNlQmxvY2soYXJtSW5kZW50KVxuICAgIH1cblxuICAgIHJldHVybiB7IHBhdHRlcm5zLCBib2R5IH1cbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBUcnkgYmxvY2sgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBwYXJzZVRyeShpbmRlbnQ6IG51bWJlciwgdG9rZW46IFRva2VuKTogVHJ5Tm9kZSB7XG4gICAgLy8gTm90ZTogdGhlIGB0cnlgIHRva2VuIHdhcyBhbHJlYWR5IGNvbnN1bWVkIGJ5IHRoZSBjYWxsaW5nIHBhcnNlU3RhdGVtZW50T3JQYXJhbGxlbC5cbiAgICAvLyBEbyBOT1QgY2FsbCB0aGlzLmFkdmFuY2UoKSBoZXJlIFx1MjAxNCB0aGF0IHdvdWxkIHNraXAgdGhlIGZpcnN0IGJvZHkgbGluZS5cblxuICAgIC8vIFBhcnNlIGJvZHkgXHUyMDE0IHN0b3BzIGF0IHJlc2N1ZS9hZnRlcndhcmRzLy90cnkgYXQgdGhlIHNhbWUgaW5kZW50IGxldmVsXG4gICAgY29uc3QgYm9keSA9IHRoaXMucGFyc2VCbG9jayhpbmRlbnQpXG5cbiAgICBsZXQgcmVzY3VlOiBMRVNOb2RlIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG4gICAgbGV0IGFmdGVyd2FyZHM6IExFU05vZGUgfCB1bmRlZmluZWQgPSB1bmRlZmluZWRcblxuICAgIC8vIHJlc2N1ZSBjbGF1c2UgKG9wdGlvbmFsKVxuICAgIGlmICh0aGlzLnBlZWsoKT8udGV4dCA9PT0gJ3Jlc2N1ZScgJiYgdGhpcy5wZWVrKCk/LmluZGVudCA9PT0gaW5kZW50KSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKSAvLyBjb25zdW1lIGByZXNjdWVgXG4gICAgICByZXNjdWUgPSB0aGlzLnBhcnNlQmxvY2soaW5kZW50KVxuICAgIH1cblxuICAgIC8vIGFmdGVyd2FyZHMgY2xhdXNlIChvcHRpb25hbClcbiAgICBpZiAodGhpcy5wZWVrKCk/LnRleHQgPT09ICdhZnRlcndhcmRzJyAmJiB0aGlzLnBlZWsoKT8uaW5kZW50ID09PSBpbmRlbnQpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpIC8vIGNvbnN1bWUgYGFmdGVyd2FyZHNgXG4gICAgICBhZnRlcndhcmRzID0gdGhpcy5wYXJzZUJsb2NrKGluZGVudClcbiAgICB9XG5cbiAgICAvLyBDb25zdW1lIC90cnlcbiAgICBpZiAodGhpcy5wZWVrKCk/LnRleHQgPT09ICcvdHJ5Jykge1xuICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gVW5jbG9zZWQgdHJ5IGJsb2NrIFx1MjAxNCBtaXNzaW5nIC90cnlgLCB0b2tlbilcbiAgICB9XG5cbiAgICBjb25zdCB0cnlOb2RlOiBUcnlOb2RlID0geyB0eXBlOiAndHJ5JywgYm9keSB9XG4gICAgaWYgKHJlc2N1ZSAgICAhPT0gdW5kZWZpbmVkKSB0cnlOb2RlLnJlc2N1ZSAgICAgPSByZXNjdWVcbiAgICBpZiAoYWZ0ZXJ3YXJkcyAhPT0gdW5kZWZpbmVkKSB0cnlOb2RlLmFmdGVyd2FyZHMgPSBhZnRlcndhcmRzXG4gICAgcmV0dXJuIHRyeU5vZGVcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBTaW1wbGUgc3RhdGVtZW50IHBhcnNlcnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBwYXJzZVNldCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IFNldE5vZGUge1xuICAgIC8vIGBzZXQgJHNpZ25hbCB0byBleHByYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9ec2V0XFxzK1xcJChcXHcrKVxccyt0b1xccysoLispJC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgc2V0IHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7IHR5cGU6ICdzZXQnLCBzaWduYWw6ICc/PycsIHZhbHVlOiBleHByKHRleHQpIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdzZXQnLFxuICAgICAgc2lnbmFsOiBtWzFdISxcbiAgICAgIHZhbHVlOiBleHByKG1bMl0hLnRyaW0oKSksXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUVtaXQodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBFbWl0Tm9kZSB7XG4gICAgLy8gYGVtaXQgZXZlbnQ6bmFtZSBbcGF5bG9hZCwgLi4uXWAgb3IgYGVtaXQgZXZlbnQ6bmFtZWBcbiAgICBjb25zdCB7IG5hbWUsIHBheWxvYWQgfSA9IHBhcnNlRXZlbnRMaW5lKHRleHQuc2xpY2UoJ2VtaXQnLmxlbmd0aCkudHJpbSgpLCB0b2tlbilcbiAgICByZXR1cm4geyB0eXBlOiAnZW1pdCcsIGV2ZW50OiBuYW1lLCBwYXlsb2FkIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VCcm9hZGNhc3QodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBCcm9hZGNhc3ROb2RlIHtcbiAgICBjb25zdCB7IG5hbWUsIHBheWxvYWQgfSA9IHBhcnNlRXZlbnRMaW5lKHRleHQuc2xpY2UoJ2Jyb2FkY2FzdCcubGVuZ3RoKS50cmltKCksIHRva2VuKVxuICAgIHJldHVybiB7IHR5cGU6ICdicm9hZGNhc3QnLCBldmVudDogbmFtZSwgcGF5bG9hZCB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQ2FsbCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IENhbGxOb2RlIHtcbiAgICAvLyBgY2FsbCBjb21tYW5kOm5hbWUgW2FyZzogdmFsdWUsIC4uLl1gIG9yIGBjYWxsIGNvbW1hbmQ6bmFtZWBcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXmNhbGxcXHMrKFteXFxzXFxbXSspXFxzKig/OlxcWyguKylcXF0pPyQvKVxuICAgIGlmICghbSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gTWFsZm9ybWVkIGNhbGwgc3RhdGVtZW50OiAke0pTT04uc3RyaW5naWZ5KHRleHQpfWAsIHRva2VuKVxuICAgICAgcmV0dXJuIHsgdHlwZTogJ2NhbGwnLCBjb21tYW5kOiAnPz8nLCBhcmdzOiB7fSB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnY2FsbCcsXG4gICAgICBjb21tYW5kOiBtWzFdISxcbiAgICAgIGFyZ3M6IHBhcnNlQXJnTGlzdChtWzJdID8/ICcnKSxcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlV2FpdCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IFdhaXROb2RlIHtcbiAgICAvLyBgd2FpdCAzMDBtc2Agb3IgYHdhaXQgKGF0dGVtcHQgKyAxKSAqIDUwMG1zYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9ed2FpdFxccysoLis/KW1zJC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgd2FpdCBzdGF0ZW1lbnQ6ICR7SlNPTi5zdHJpbmdpZnkodGV4dCl9YCwgdG9rZW4pXG4gICAgICByZXR1cm4geyB0eXBlOiAnd2FpdCcsIG1zOiAwIH1cbiAgICB9XG4gICAgY29uc3QgbXNFeHByID0gbVsxXSEudHJpbSgpXG4gICAgLy8gU2ltcGxlIGxpdGVyYWxcbiAgICBjb25zdCBsaXRlcmFsID0gTnVtYmVyKG1zRXhwcilcbiAgICBpZiAoIU51bWJlci5pc05hTihsaXRlcmFsKSkgcmV0dXJuIHsgdHlwZTogJ3dhaXQnLCBtczogbGl0ZXJhbCB9XG4gICAgLy8gRXhwcmVzc2lvbiBcdTIwMTQgc3RvcmUgYXMgMCB3aXRoIHRoZSBleHByZXNzaW9uIGFzIGEgY29tbWVudCAoZXhlY3V0b3Igd2lsbCBldmFsKVxuICAgIC8vIFBoYXNlIDMgd2lsbCBoYW5kbGUgZHluYW1pYyBkdXJhdGlvbnMgcHJvcGVybHlcbiAgICByZXR1cm4geyB0eXBlOiAnd2FpdCcsIG1zOiAwIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VCaW5kKHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogQmluZE5vZGUge1xuICAgIC8vIGBuYW1lIDwtIEB2ZXJiICd1cmwnIFthcmdzXWBcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXihcXHcrKVxccys8LVxccytAKFxcdyspXFxzKycoW14nXSspJ1xccyooPzpcXFsoLispXFxdKT8kLylcbiAgICBpZiAoIW0pIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIE1hbGZvcm1lZCBiaW5kIHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdiaW5kJyxcbiAgICAgICAgbmFtZTogJz8/JyxcbiAgICAgICAgYWN0aW9uOiB7IHR5cGU6ICdhY3Rpb24nLCB2ZXJiOiAnZ2V0JywgdXJsOiAnJywgYXJnczoge30gfSxcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgYWN0aW9uOiBBY3Rpb25Ob2RlID0ge1xuICAgICAgdHlwZTogJ2FjdGlvbicsXG4gICAgICB2ZXJiOiBtWzJdIS50b0xvd2VyQ2FzZSgpLFxuICAgICAgdXJsOiBtWzNdISxcbiAgICAgIGFyZ3M6IHBhcnNlQXJnTGlzdChtWzRdID8/ICcnKSxcbiAgICB9XG4gICAgcmV0dXJuIHsgdHlwZTogJ2JpbmQnLCBuYW1lOiBtWzFdISwgYWN0aW9uIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VBY3Rpb24odGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBBY3Rpb25Ob2RlIHtcbiAgICAvLyBgQGdldCAnL3VybCcgW2FyZ3NdYCBvciBgQHBvc3QgJy91cmwnIFthcmdzXWBcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXkAoXFx3KylcXHMrJyhbXiddKyknXFxzKig/OlxcWyguKylcXF0pPyQvKVxuICAgIGlmICghbSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gTWFsZm9ybWVkIGFjdGlvbjogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7IHR5cGU6ICdhY3Rpb24nLCB2ZXJiOiAnZ2V0JywgdXJsOiAnJywgYXJnczoge30gfVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogJ2FjdGlvbicsXG4gICAgICB2ZXJiOiBtWzFdIS50b0xvd2VyQ2FzZSgpLFxuICAgICAgdXJsOiBtWzJdISxcbiAgICAgIGFyZ3M6IHBhcnNlQXJnTGlzdChtWzNdID8/ICcnKSxcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQW5pbWF0aW9uKHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogQW5pbWF0aW9uTm9kZSB7XG4gICAgLy8gYHByaW1pdGl2ZSBzZWxlY3RvciBkdXJhdGlvbiBlYXNpbmcgW29wdGlvbnNdYFxuICAgIC8vIEV4YW1wbGVzOlxuICAgIC8vICAgc3RhZ2dlci1lbnRlciAuZmVlZC1pdGVtICAxMjBtcyBlYXNlLW91dCBbZ2FwOiA0MG1zICBmcm9tOiByaWdodF1cbiAgICAvLyAgIHB1bHNlIC5mZWVkLWl0ZW0uaXMtdXBkYXRlZCAgMzAwbXMgZWFzZS1pbi1vdXRcbiAgICAvLyAgIHNsaWRlLW91dCBbZGF0YS1pdGVtLWlkOiBpZF0gIDE1MG1zIGVhc2UtaW4gW3RvOiByaWdodF1cblxuICAgIC8vIFRva2VuaXplOiBzcGxpdCBvbiB3aGl0ZXNwYWNlIGJ1dCBwcmVzZXJ2ZSBbLi4uXSBncm91cHNcbiAgICBjb25zdCBwYXJ0cyA9IHNwbGl0QW5pbWF0aW9uTGluZSh0ZXh0KVxuXG4gICAgY29uc3QgcHJpbWl0aXZlID0gcGFydHNbMF0gPz8gJydcbiAgICBjb25zdCBzZWxlY3RvciAgPSBwYXJ0c1sxXSA/PyAnJ1xuICAgIGNvbnN0IGR1cmF0aW9uU3RyID0gcGFydHNbMl0gPz8gJzBtcydcbiAgICBjb25zdCBlYXNpbmcgICAgPSBwYXJ0c1szXSA/PyAnZWFzZSdcbiAgICBjb25zdCBvcHRpb25zU3RyID0gcGFydHNbNF0gPz8gJycgIC8vIG1heSBiZSBhYnNlbnRcblxuICAgIGNvbnN0IGR1cmF0aW9uTXMgPSBwYXJzZUludChkdXJhdGlvblN0ciwgMTApXG5cbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogJ2FuaW1hdGlvbicsXG4gICAgICBwcmltaXRpdmUsXG4gICAgICBzZWxlY3RvcixcbiAgICAgIGR1cmF0aW9uOiBOdW1iZXIuaXNOYU4oZHVyYXRpb25NcykgPyAwIDogZHVyYXRpb25NcyxcbiAgICAgIGVhc2luZyxcbiAgICAgIG9wdGlvbnM6IHBhcnNlQW5pbWF0aW9uT3B0aW9ucyhvcHRpb25zU3RyKSxcbiAgICB9XG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXR0ZXJuIHBhcnNpbmdcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFBhcnNlcyBhIHBhdHRlcm4gZ3JvdXAgbGlrZSBgW2l0ICAgb2sgICBdYCwgYFtuaWwgIGVycm9yXWAsIGBbX11gLFxuICogYFsnZXJyb3InXWAsIGBbMCB8IDEgfCAyXWAuXG4gKlxuICogUmV0dXJucyBhbiBhcnJheSBvZiBQYXR0ZXJuTm9kZSBcdTIwMTQgb25lIHBlciBlbGVtZW50IGluIHRoZSB0dXBsZSBwYXR0ZXJuLlxuICogRm9yIG9yLXBhdHRlcm5zIChgMCB8IDEgfCAyYCksIHJldHVybnMgYSBzaW5nbGUgT3JQYXR0ZXJuTm9kZS5cbiAqL1xuZnVuY3Rpb24gcGFyc2VQYXR0ZXJucyhyYXc6IHN0cmluZyk6IFBhdHRlcm5Ob2RlW10ge1xuICAvLyBTdHJpcCBvdXRlciBicmFja2V0c1xuICBjb25zdCBpbm5lciA9IHJhdy5yZXBsYWNlKC9eXFxbfFxcXSQvZywgJycpLnRyaW0oKVxuXG4gIC8vIENoZWNrIGZvciBvci1wYXR0ZXJuOiBjb250YWlucyBgIHwgYFxuICBpZiAoaW5uZXIuaW5jbHVkZXMoJyB8ICcpIHx8IGlubmVyLmluY2x1ZGVzKCd8JykpIHtcbiAgICBjb25zdCBhbHRlcm5hdGl2ZXMgPSBpbm5lci5zcGxpdCgvXFxzKlxcfFxccyovKS5tYXAocCA9PiBwYXJzZVNpbmdsZVBhdHRlcm4ocC50cmltKCkpKVxuICAgIHJldHVybiBbeyBraW5kOiAnb3InLCBwYXR0ZXJuczogYWx0ZXJuYXRpdmVzIH1dXG4gIH1cblxuICAvLyBUdXBsZSBwYXR0ZXJuOiBzcGFjZS1zZXBhcmF0ZWQgZWxlbWVudHNcbiAgLy8gVXNlIGEgY3VzdG9tIHNwbGl0IHRvIGhhbmRsZSBtdWx0aXBsZSBzcGFjZXMgKGFsaWdubWVudCBwYWRkaW5nKVxuICByZXR1cm4gaW5uZXIudHJpbSgpLnNwbGl0KC9cXHN7Mix9fFxccyg/PVxcUykvKS5maWx0ZXIocyA9PiBzLnRyaW0oKSlcbiAgICAubWFwKHAgPT4gcGFyc2VTaW5nbGVQYXR0ZXJuKHAudHJpbSgpKSlcbn1cblxuZnVuY3Rpb24gcGFyc2VTaW5nbGVQYXR0ZXJuKHM6IHN0cmluZyk6IFBhdHRlcm5Ob2RlIHtcbiAgaWYgKHMgPT09ICdfJykgICByZXR1cm4geyBraW5kOiAnd2lsZGNhcmQnIH1cbiAgaWYgKHMgPT09ICduaWwnKSByZXR1cm4geyBraW5kOiAnbGl0ZXJhbCcsIHZhbHVlOiBudWxsIH1cblxuICAvLyBTdHJpbmcgbGl0ZXJhbDogJ3ZhbHVlJ1xuICBpZiAocy5zdGFydHNXaXRoKFwiJ1wiKSAmJiBzLmVuZHNXaXRoKFwiJ1wiKSkge1xuICAgIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IHMuc2xpY2UoMSwgLTEpIH1cbiAgfVxuXG4gIC8vIE51bWJlciBsaXRlcmFsXG4gIGNvbnN0IG4gPSBOdW1iZXIocylcbiAgaWYgKCFOdW1iZXIuaXNOYU4obikpIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IG4gfVxuXG4gIC8vIEJvb2xlYW5cbiAgaWYgKHMgPT09ICd0cnVlJykgIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IHRydWUgfVxuICBpZiAocyA9PT0gJ2ZhbHNlJykgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogZmFsc2UgfVxuXG4gIC8vIEV2ZXJ5dGhpbmcgZWxzZSBpcyBhIGJpbmRpbmcgKGNhcHR1cmVzIHRoZSB2YWx1ZSBmb3IgdXNlIGluIHRoZSBib2R5KVxuICByZXR1cm4geyBraW5kOiAnYmluZGluZycsIG5hbWU6IHMgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEFyZ3VtZW50IGxpc3QgcGFyc2luZ1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogUGFyc2VzIGBrZXk6IHZhbHVlICBrZXkyOiB2YWx1ZTJgIGZyb20gaW5zaWRlIGEgWy4uLl0gYXJndW1lbnQgYmxvY2suXG4gKiBWYWx1ZXMgYXJlIHN0b3JlZCBhcyBFeHByTm9kZSAoZXZhbHVhdGVkIGF0IHJ1bnRpbWUpLlxuICovXG5mdW5jdGlvbiBwYXJzZUFyZ0xpc3QocmF3OiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCBFeHByTm9kZT4ge1xuICBpZiAoIXJhdy50cmltKCkpIHJldHVybiB7fVxuXG4gIGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgRXhwck5vZGU+ID0ge31cblxuICAvLyBTcGxpdCBvbiBgICBgIChkb3VibGUtc3BhY2UgdXNlZCBhcyBzZXBhcmF0b3IgaW4gTEVTIHN0eWxlKVxuICAvLyBidXQgYWxzbyBoYW5kbGUgc2luZ2xlIGAgIGtleTogdmFsdWVgIGVudHJpZXNcbiAgLy8gU2ltcGxlIHJlZ2V4OiBgd29yZDogcmVzdF91bnRpbF9uZXh0X3dvcmQ6YFxuICBjb25zdCBwYWlycyA9IHJhdy50cmltKCkuc3BsaXQoLyg/PD1cXFMpXFxzezIsfSg/PVxcdykvKVxuICBmb3IgKGNvbnN0IHBhaXIgb2YgcGFpcnMpIHtcbiAgICBjb25zdCBjb2xvbklkeCA9IHBhaXIuaW5kZXhPZignOicpXG4gICAgaWYgKGNvbG9uSWR4ID09PSAtMSkgY29udGludWVcbiAgICBjb25zdCBrZXkgICA9IHBhaXIuc2xpY2UoMCwgY29sb25JZHgpLnRyaW0oKVxuICAgIGNvbnN0IHZhbHVlID0gcGFpci5zbGljZShjb2xvbklkeCArIDEpLnRyaW0oKVxuICAgIGlmIChrZXkpIHJlc3VsdFtrZXldID0gZXhwcih2YWx1ZSlcbiAgfVxuXG4gIHJldHVybiByZXN1bHRcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBFdmVudCBsaW5lIHBhcnNpbmc6IGBldmVudDpuYW1lIFtwYXlsb2FkLi4uXWBcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5mdW5jdGlvbiBwYXJzZUV2ZW50TGluZShcbiAgcmF3OiBzdHJpbmcsXG4gIHRva2VuOiBUb2tlblxuKTogeyBuYW1lOiBzdHJpbmc7IHBheWxvYWQ6IEV4cHJOb2RlW10gfSB7XG4gIC8vIGBmZWVkOmRhdGEtcmVhZHlgIG9yIGBmZWVkOmRhdGEtcmVhZHkgWyRmZWVkSXRlbXNdYCBvciBgZmVlZDplcnJvciBbJGVycm9yXWBcbiAgY29uc3QgYnJhY2tldElkeCA9IHJhdy5pbmRleE9mKCdbJylcbiAgaWYgKGJyYWNrZXRJZHggPT09IC0xKSB7XG4gICAgcmV0dXJuIHsgbmFtZTogcmF3LnRyaW0oKSwgcGF5bG9hZDogW10gfVxuICB9XG4gIGNvbnN0IG5hbWUgPSByYXcuc2xpY2UoMCwgYnJhY2tldElkeCkudHJpbSgpXG4gIGNvbnN0IHBheWxvYWRSYXcgPSByYXcuc2xpY2UoYnJhY2tldElkeCArIDEsIHJhdy5sYXN0SW5kZXhPZignXScpKS50cmltKClcblxuICAvLyBQYXlsb2FkIGVsZW1lbnRzIGFyZSBjb21tYSBvciBzcGFjZSBzZXBhcmF0ZWQgZXhwcmVzc2lvbnNcbiAgY29uc3QgcGF5bG9hZDogRXhwck5vZGVbXSA9IHBheWxvYWRSYXdcbiAgICA/IHBheWxvYWRSYXcuc3BsaXQoLyxcXHMqfFxcc3syLH0vKS5tYXAocyA9PiBleHByKHMudHJpbSgpKSkuZmlsdGVyKGUgPT4gZS5yYXcpXG4gICAgOiBbXVxuXG4gIHJldHVybiB7IG5hbWUsIHBheWxvYWQgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEFuaW1hdGlvbiBsaW5lIHBhcnNpbmdcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFNwbGl0cyBhbiBhbmltYXRpb24gbGluZSBpbnRvIGl0cyBzdHJ1Y3R1cmFsIHBhcnRzLCBwcmVzZXJ2aW5nIFsuLi5dIGdyb3Vwcy5cbiAqXG4gKiBJbnB1dDogIGBzdGFnZ2VyLWVudGVyIC5mZWVkLWl0ZW0gIDEyMG1zIGVhc2Utb3V0IFtnYXA6IDQwbXMgIGZyb206IHJpZ2h0XWBcbiAqIE91dHB1dDogWydzdGFnZ2VyLWVudGVyJywgJy5mZWVkLWl0ZW0nLCAnMTIwbXMnLCAnZWFzZS1vdXQnLCAnW2dhcDogNDBtcyAgZnJvbTogcmlnaHRdJ11cbiAqL1xuZnVuY3Rpb24gc3BsaXRBbmltYXRpb25MaW5lKHRleHQ6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW11cbiAgbGV0IGN1cnJlbnQgPSAnJ1xuICBsZXQgaW5CcmFja2V0ID0gMFxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdGV4dC5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGNoID0gdGV4dFtpXSFcbiAgICBpZiAoY2ggPT09ICdbJykge1xuICAgICAgaW5CcmFja2V0KytcbiAgICAgIGN1cnJlbnQgKz0gY2hcbiAgICB9IGVsc2UgaWYgKGNoID09PSAnXScpIHtcbiAgICAgIGluQnJhY2tldC0tXG4gICAgICBjdXJyZW50ICs9IGNoXG4gICAgfSBlbHNlIGlmIChjaCA9PT0gJyAnICYmIGluQnJhY2tldCA9PT0gMCkge1xuICAgICAgaWYgKGN1cnJlbnQudHJpbSgpKSBwYXJ0cy5wdXNoKGN1cnJlbnQudHJpbSgpKVxuICAgICAgY3VycmVudCA9ICcnXG4gICAgfSBlbHNlIHtcbiAgICAgIGN1cnJlbnQgKz0gY2hcbiAgICB9XG4gIH1cbiAgaWYgKGN1cnJlbnQudHJpbSgpKSBwYXJ0cy5wdXNoKGN1cnJlbnQudHJpbSgpKVxuICByZXR1cm4gcGFydHNcbn1cblxuLyoqXG4gKiBQYXJzZXMgYW5pbWF0aW9uIG9wdGlvbnMgZnJvbSBhIGBba2V5OiB2YWx1ZSAga2V5MjogdmFsdWUyXWAgc3RyaW5nLlxuICogVGhlIG91dGVyIGJyYWNrZXRzIGFyZSBpbmNsdWRlZCBpbiB0aGUgaW5wdXQuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlQW5pbWF0aW9uT3B0aW9ucyhyYXc6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIEV4cHJOb2RlPiB7XG4gIGlmICghcmF3LnRyaW0oKSkgcmV0dXJuIHt9XG4gIC8vIFN0cmlwIG91dGVyIGJyYWNrZXRzXG4gIGNvbnN0IGlubmVyID0gcmF3LnJlcGxhY2UoL15cXFt8XFxdJC9nLCAnJykudHJpbSgpXG4gIHJldHVybiBwYXJzZUFyZ0xpc3QoaW5uZXIpXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gVXRpbGl0aWVzXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gZXhwcihyYXc6IHN0cmluZyk6IEV4cHJOb2RlIHtcbiAgcmV0dXJuIHsgdHlwZTogJ2V4cHInLCByYXcgfVxufVxuXG5mdW5jdGlvbiBmaXJzdFdvcmQodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHRleHQuc3BsaXQoL1xccysvKVswXSA/PyAnJ1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBhIHN0YXRlbWVudCBsb29rcyBsaWtlIGFuIGFuaW1hdGlvbiBjYWxsOlxuICogICA8d29yZC13aXRoLWh5cGhlbj4gIDxzZWxlY3RvcnxkdXJhdGlvbj4gIC4uLlxuICpcbiAqIFRoaXMgYWxsb3dzIHVzZXJsYW5kIG1vZHVsZSBwcmltaXRpdmVzIChzY3JvbGwtcmV2ZWFsLCBzcHJpbmctaW4sIGV0Yy4pXG4gKiB0byBiZSBwYXJzZWQgYXMgQW5pbWF0aW9uTm9kZSB3aXRob3V0IGJlaW5nIGxpc3RlZCBpbiBBTklNQVRJT05fUFJJTUlUSVZFUy5cbiAqIFRoZSBleGVjdXRvciB0aGVuIGRpc3BhdGNoZXMgdGhlbSB0aHJvdWdoIHRoZSBNb2R1bGVSZWdpc3RyeS5cbiAqL1xuZnVuY3Rpb24gbG9va3NMaWtlQW5pbWF0aW9uQ2FsbCh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgcGFydHMgPSB0ZXh0LnRyaW0oKS5zcGxpdCgvXFxzKy8pXG4gIGlmIChwYXJ0cy5sZW5ndGggPCAyKSByZXR1cm4gZmFsc2VcbiAgY29uc3Qgc2Vjb25kID0gcGFydHNbMV0gPz8gJydcbiAgLy8gU2Vjb25kIHRva2VuIGlzIGEgQ1NTIHNlbGVjdG9yICguY2xhc3MsICNpZCwgW2F0dHJdLCB0YWduYW1lKSBvciBhIGR1cmF0aW9uIChObXMpXG4gIHJldHVybiAvXlsuI1xcW10vLnRlc3Qoc2Vjb25kKSB8fCAgLy8gQ1NTIHNlbGVjdG9yXG4gICAgICAgICAvXlxcZCttcyQvLnRlc3Qoc2Vjb25kKSAgICAgIC8vIGJhcmUgZHVyYXRpb24gKHVudXN1YWwgYnV0IHZhbGlkKVxufVxuXG5mdW5jdGlvbiB0b1NlcXVlbmNlT3JTaW5nbGUoc3RlcHM6IExFU05vZGVbXSk6IExFU05vZGUge1xuICBpZiAoc3RlcHMubGVuZ3RoID09PSAwKSByZXR1cm4gZXhwcignJylcbiAgaWYgKHN0ZXBzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIHN0ZXBzWzBdIVxuICByZXR1cm4geyB0eXBlOiAnc2VxdWVuY2UnLCBzdGVwcyB9IHNhdGlzZmllcyBTZXF1ZW5jZU5vZGVcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXJzZSBlcnJvclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBjbGFzcyBMRVNQYXJzZUVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcsIHB1YmxpYyByZWFkb25seSB0b2tlbjogVG9rZW4gfCB1bmRlZmluZWQpIHtcbiAgICBjb25zdCBsb2MgPSB0b2tlbiA/IGAgKGxpbmUgJHt0b2tlbi5saW5lTnVtfTogJHtKU09OLnN0cmluZ2lmeSh0b2tlbi50ZXh0KX0pYCA6ICcnXG4gICAgc3VwZXIoYFtMRVM6cGFyc2VyXSAke21lc3NhZ2V9JHtsb2N9YClcbiAgICB0aGlzLm5hbWUgPSAnTEVTUGFyc2VFcnJvcidcbiAgfVxufVxuIiwgImltcG9ydCB7IHN0cmlwQm9keSB9IGZyb20gJy4vc3RyaXBCb2R5LmpzJ1xuaW1wb3J0IHsgdG9rZW5pemUgfSBmcm9tICcuL3Rva2VuaXplci5qcydcbmltcG9ydCB7IExFU1BhcnNlciB9IGZyb20gJy4vcGFyc2VyLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNOb2RlIH0gZnJvbSAnLi9hc3QuanMnXG5cbmV4cG9ydCB7IExFU1BhcnNlciwgTEVTUGFyc2VFcnJvciB9IGZyb20gJy4vcGFyc2VyLmpzJ1xuZXhwb3J0IHsgdG9rZW5pemUsIGVuZHNXaXRoQW5kLCBzdHJpcFRyYWlsaW5nQW5kIH0gZnJvbSAnLi90b2tlbml6ZXIuanMnXG5leHBvcnQgeyBzdHJpcEJvZHkgfSBmcm9tICcuL3N0cmlwQm9keS5qcydcbmV4cG9ydCB0eXBlIHsgVG9rZW4gfSBmcm9tICcuL3Rva2VuaXplci5qcydcbmV4cG9ydCAqIGZyb20gJy4vYXN0LmpzJ1xuZXhwb3J0ICogZnJvbSAnLi9jb25maWcuanMnXG5cbi8qKlxuICogUGFyc2UgYSByYXcgTEVTIGJvZHkgc3RyaW5nIChmcm9tIGEgZG89LCBoYW5kbGU9LCBvciBydW49IGF0dHJpYnV0ZSlcbiAqIGludG8gYSB0eXBlZCBBU1Qgbm9kZS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBwdWJsaWMgZW50cnkgcG9pbnQgZm9yIFBoYXNlIDI6XG4gKiAgIC0gU3RyaXBzIGJhY2t0aWNrIHdyYXBwZXIgYW5kIG5vcm1hbGl6ZXMgaW5kZW50YXRpb24gKHN0cmlwQm9keSlcbiAqICAgLSBUb2tlbml6ZXMgaW50byBsaW5lcyB3aXRoIGluZGVudCBsZXZlbHMgKHRva2VuaXplKVxuICogICAtIFBhcnNlcyBpbnRvIGEgdHlwZWQgTEVTTm9kZSBBU1QgKExFU1BhcnNlcilcbiAqXG4gKiBAdGhyb3dzIExFU1BhcnNlRXJyb3Igb24gdW5yZWNvdmVyYWJsZSBzeW50YXggZXJyb3JzIChjdXJyZW50bHkgc29mdC13YXJucyBpbnN0ZWFkKVxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VMRVMocmF3OiBzdHJpbmcpOiBMRVNOb2RlIHtcbiAgY29uc3Qgc3RyaXBwZWQgPSBzdHJpcEJvZHkocmF3KVxuICBjb25zdCB0b2tlbnMgICA9IHRva2VuaXplKHN0cmlwcGVkKVxuICBjb25zdCBwYXJzZXIgICA9IG5ldyBMRVNQYXJzZXIodG9rZW5zKVxuICByZXR1cm4gcGFyc2VyLnBhcnNlKClcbn1cbiIsICIvKipcbiAqIFBoYXNlIDQ6IHdpcmVzIHRoZSBwYXJzZWQgY29uZmlnIGludG8gbGl2ZSBydW50aW1lIGJlaGF2aW9yLlxuICpcbiAqIFJlc3BvbnNpYmlsaXRpZXM6XG4gKiAgIDEuIFJlZ2lzdGVyIGFsbCA8bG9jYWwtY29tbWFuZD4gcGFyc2VkIGRlZnMgaW50byB0aGUgQ29tbWFuZFJlZ2lzdHJ5XG4gKiAgIDIuIEF0dGFjaCBDdXN0b21FdmVudCBsaXN0ZW5lcnMgb24gdGhlIGhvc3QgZm9yIGVhY2ggPG9uLWV2ZW50PlxuICogICAzLiBXaXJlIDxvbi1sb2FkPiB0byBmaXJlIGFmdGVyIERPTSBpcyByZWFkeVxuICogICA0LiBCdWlsZCB0aGUgTEVTQ29udGV4dCB1c2VkIGJ5IHRoZSBleGVjdXRvclxuICpcbiAqIDxvbi1zaWduYWw+IGFuZCA8b24tZW50ZXI+Lzxvbi1leGl0PiBhcmUgd2lyZWQgaW4gUGhhc2UgNS82LlxuICovXG5cbmltcG9ydCB7IGV4ZWN1dGUsIGV2YWxFeHByIH0gZnJvbSAnLi9leGVjdXRvci5qcydcbmltcG9ydCB7IExFU1Njb3BlIH0gZnJvbSAnLi9zY29wZS5qcydcbmltcG9ydCB0eXBlIHsgQ29tbWFuZFJlZ2lzdHJ5IH0gZnJvbSAnLi9yZWdpc3RyeS5qcydcbmltcG9ydCB0eXBlIHsgTW9kdWxlUmVnaXN0cnkgfSBmcm9tICdAbW9kdWxlcy90eXBlcy5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29uZmlnIH0gZnJvbSAnQHBhcnNlci9jb25maWcuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcbmltcG9ydCB7IHBhcnNlTEVTIH0gZnJvbSAnQHBhcnNlci9pbmRleC5qcydcblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZWRXaXJpbmcge1xuICBjb21tYW5kczogIEFycmF5PHsgbmFtZTogc3RyaW5nOyBndWFyZDogc3RyaW5nIHwgbnVsbDsgYXJnc1Jhdzogc3RyaW5nOyBib2R5OiBMRVNOb2RlIH0+XG4gIGhhbmRsZXJzOiAgQXJyYXk8eyBldmVudDogc3RyaW5nOyBib2R5OiBMRVNOb2RlIH0+XG4gIHdhdGNoZXJzOiAgQXJyYXk8eyBzaWduYWw6IHN0cmluZzsgd2hlbjogc3RyaW5nIHwgbnVsbDsgYm9keTogTEVTTm9kZSB9PlxuICBsaWZlY3ljbGU6IHtcbiAgICBvbkxvYWQ6ICBMRVNOb2RlW11cbiAgICBvbkVudGVyOiBBcnJheTx7IHdoZW46IHN0cmluZyB8IG51bGw7IGJvZHk6IExFU05vZGUgfT5cbiAgICBvbkV4aXQ6ICBMRVNOb2RlW11cbiAgfVxufVxuXG4vKiogQnVpbGRzIGEgTEVTQ29udGV4dCBmb3IgdGhlIGhvc3QgZWxlbWVudC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENvbnRleHQoXG4gIGhvc3Q6IEVsZW1lbnQsXG4gIGNvbW1hbmRzOiBDb21tYW5kUmVnaXN0cnksXG4gIG1vZHVsZXM6IE1vZHVsZVJlZ2lzdHJ5LFxuICBzaWduYWxzOiB7IGdldDogKGs6IHN0cmluZykgPT4gdW5rbm93bjsgc2V0OiAoazogc3RyaW5nLCB2OiB1bmtub3duKSA9PiB2b2lkIH1cbik6IGltcG9ydCgnLi9leGVjdXRvci5qcycpLkxFU0NvbnRleHQge1xuICBjb25zdCBzY29wZSA9IG5ldyBMRVNTY29wZSgpXG5cbiAgY29uc3QgZW1pdExvY2FsID0gKGV2ZW50OiBzdHJpbmcsIHBheWxvYWQ6IHVua25vd25bXSkgPT4ge1xuICAgIGNvbnNvbGUubG9nKGBbTEVTXSBlbWl0IFwiJHtldmVudH1cImAsIHBheWxvYWQubGVuZ3RoID8gcGF5bG9hZCA6ICcnKVxuICAgIGhvc3QuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoZXZlbnQsIHtcbiAgICAgIGRldGFpbDogeyBwYXlsb2FkIH0sXG4gICAgICBidWJibGVzOiBmYWxzZSxcbiAgICAgIGNvbXBvc2VkOiBmYWxzZSxcbiAgICB9KSlcbiAgfVxuXG4gIGNvbnN0IGJyb2FkY2FzdCA9IChldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHtcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gYnJvYWRjYXN0IFwiJHtldmVudH1cImAsIHBheWxvYWQubGVuZ3RoID8gcGF5bG9hZCA6ICcnKVxuICAgIGhvc3QuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoZXZlbnQsIHtcbiAgICAgIGRldGFpbDogeyBwYXlsb2FkIH0sXG4gICAgICBidWJibGVzOiB0cnVlLFxuICAgICAgY29tcG9zZWQ6IHRydWUsXG4gICAgfSkpXG4gIH1cblxuICByZXR1cm4ge1xuICAgIHNjb3BlLFxuICAgIGhvc3QsXG4gICAgY29tbWFuZHMsXG4gICAgbW9kdWxlcyxcbiAgICBnZXRTaWduYWw6IHNpZ25hbHMuZ2V0LFxuICAgIHNldFNpZ25hbDogc2lnbmFscy5zZXQsXG4gICAgZW1pdExvY2FsLFxuICAgIGJyb2FkY2FzdCxcbiAgfVxufVxuXG4vKipcbiAqIFJlZ2lzdGVycyBhbGwgcGFyc2VkIGNvbW1hbmRzIGludG8gdGhlIHJlZ2lzdHJ5LlxuICogQ2FsbGVkIG9uY2UgZHVyaW5nIF9pbml0LCBiZWZvcmUgYW55IGV2ZW50cyBhcmUgd2lyZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckNvbW1hbmRzKFxuICB3aXJpbmc6IFBhcnNlZFdpcmluZyxcbiAgcmVnaXN0cnk6IENvbW1hbmRSZWdpc3RyeVxuKTogdm9pZCB7XG4gIGZvciAoY29uc3QgY21kIG9mIHdpcmluZy5jb21tYW5kcykge1xuICAgIC8vIFBhcnNlIGFyZ3NSYXcgaW50byBBcmdEZWZbXSAoc2ltcGxpZmllZCBcdTIwMTQgZnVsbCBhcmcgcGFyc2luZyBpbiBQaGFzZSAyIHJlZmluZW1lbnQpXG4gICAgY29uc3QgYXJncyA9IHBhcnNlQXJnc1JhdyhjbWQuYXJnc1JhdylcbiAgICBjb25zdCBkZWY6IGltcG9ydCgnLi9yZWdpc3RyeS5qcycpLkNvbW1hbmREZWYgPSB7XG4gICAgICBuYW1lOiBjbWQubmFtZSxcbiAgICAgIGFyZ3MsXG4gICAgICBib2R5OiBjbWQuYm9keSxcbiAgICAgIGVsZW1lbnQ6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xvY2FsLWNvbW1hbmQnKSxcbiAgICB9XG4gICAgaWYgKGNtZC5ndWFyZCkgZGVmLmd1YXJkID0gY21kLmd1YXJkXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoZGVmKVxuICB9XG4gIGNvbnNvbGUubG9nKGBbTEVTXSByZWdpc3RlcmVkICR7d2lyaW5nLmNvbW1hbmRzLmxlbmd0aH0gY29tbWFuZHNgKVxufVxuXG4vKipcbiAqIEF0dGFjaGVzIGV2ZW50IGxpc3RlbmVycyBvbiB0aGUgaG9zdCBmb3IgYWxsIDxvbi1ldmVudD4gaGFuZGxlcnMuXG4gKiBSZXR1cm5zIGEgY2xlYW51cCBmdW5jdGlvbiB0aGF0IHJlbW92ZXMgYWxsIGxpc3RlbmVycy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpcmVFdmVudEhhbmRsZXJzKFxuICB3aXJpbmc6IFBhcnNlZFdpcmluZyxcbiAgaG9zdDogRWxlbWVudCxcbiAgZ2V0Q3R4OiAoKSA9PiBpbXBvcnQoJy4vZXhlY3V0b3IuanMnKS5MRVNDb250ZXh0XG4pOiAoKSA9PiB2b2lkIHtcbiAgY29uc3QgY2xlYW51cHM6IEFycmF5PCgpID0+IHZvaWQ+ID0gW11cblxuICBmb3IgKGNvbnN0IGhhbmRsZXIgb2Ygd2lyaW5nLmhhbmRsZXJzKSB7XG4gICAgY29uc3QgbGlzdGVuZXIgPSAoZTogRXZlbnQpID0+IHtcbiAgICAgIGNvbnN0IGN0eCA9IGdldEN0eCgpXG4gICAgICAvLyBFeHBvc2UgZXZlbnQgZGV0YWlsIGluIHNjb3BlXG4gICAgICBjb25zdCBoYW5kbGVyU2NvcGUgPSBjdHguc2NvcGUuY2hpbGQoKVxuICAgICAgY29uc3QgZGV0YWlsID0gKGUgYXMgQ3VzdG9tRXZlbnQpLmRldGFpbCA/PyB7fVxuICAgICAgaGFuZGxlclNjb3BlLnNldCgnZXZlbnQnLCBlKVxuICAgICAgaGFuZGxlclNjb3BlLnNldCgncGF5bG9hZCcsIGRldGFpbC5wYXlsb2FkID8/IFtdKVxuICAgICAgY29uc3QgaGFuZGxlckN0eCA9IHsgLi4uY3R4LCBzY29wZTogaGFuZGxlclNjb3BlIH1cblxuICAgICAgZXhlY3V0ZShoYW5kbGVyLmJvZHksIGhhbmRsZXJDdHgpLmNhdGNoKGVyciA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFtMRVNdIEVycm9yIGluIGhhbmRsZXIgZm9yIFwiJHtoYW5kbGVyLmV2ZW50fVwiOmAsIGVycilcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgaG9zdC5hZGRFdmVudExpc3RlbmVyKGhhbmRsZXIuZXZlbnQsIGxpc3RlbmVyKVxuICAgIGNsZWFudXBzLnB1c2goKCkgPT4gaG9zdC5yZW1vdmVFdmVudExpc3RlbmVyKGhhbmRsZXIuZXZlbnQsIGxpc3RlbmVyKSlcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gd2lyZWQgZXZlbnQgaGFuZGxlcjogXCIke2hhbmRsZXIuZXZlbnR9XCJgKVxuICB9XG5cbiAgcmV0dXJuICgpID0+IGNsZWFudXBzLmZvckVhY2goZm4gPT4gZm4oKSlcbn1cblxuLyoqXG4gKiBGaXJlcyBhbGwgPG9uLWxvYWQ+IGJvZGllcy5cbiAqIENhbGxlZCBhZnRlciBjb21tYW5kcyBhcmUgcmVnaXN0ZXJlZCBhbmQgZXZlbnQgaGFuZGxlcnMgYXJlIHdpcmVkLFxuICogc28gZW1pdC9jYWxsIHN0YXRlbWVudHMgaW4gb24tbG9hZCBjYW4gcmVhY2ggdGhlaXIgdGFyZ2V0cy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpcmVPbkxvYWQoXG4gIHdpcmluZzogUGFyc2VkV2lyaW5nLFxuICBnZXRDdHg6ICgpID0+IGltcG9ydCgnLi9leGVjdXRvci5qcycpLkxFU0NvbnRleHRcbik6IFByb21pc2U8dm9pZD4ge1xuICBmb3IgKGNvbnN0IGJvZHkgb2Ygd2lyaW5nLmxpZmVjeWNsZS5vbkxvYWQpIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZXhlY3V0ZShib2R5LCBnZXRDdHgoKSlcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tMRVNdIEVycm9yIGluIG9uLWxvYWQ6JywgZXJyKVxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEFyZyBwYXJzaW5nIChzaW1wbGlmaWVkIFx1MjAxNCBmdWxsIHR5cGUtY2hlY2tlZCB2ZXJzaW9uIGluIFBoYXNlIDIgcmVmaW5lbWVudClcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5pbXBvcnQgdHlwZSB7IEFyZ0RlZiB9IGZyb20gJy4vcmVnaXN0cnkuanMnXG5pbXBvcnQgdHlwZSB7IEV4cHJOb2RlIH0gZnJvbSAnQHBhcnNlci9hc3QuanMnXG5cbmZ1bmN0aW9uIHBhcnNlQXJnc1JhdyhyYXc6IHN0cmluZyk6IEFyZ0RlZltdIHtcbiAgaWYgKCFyYXcudHJpbSgpKSByZXR1cm4gW11cbiAgLy8gU3RyaXAgb3V0ZXIgYnJhY2tldHM6IFwiW2Zyb206c3RyICB0bzpzdHIgIGF0dGVtcHQ6aW50PTBdXCIgXHUyMTkyIFwiZnJvbTpzdHIgIHRvOnN0ciAgYXR0ZW1wdDppbnQ9MFwiXG4gIGNvbnN0IGlubmVyID0gcmF3LnJlcGxhY2UoL15cXFt8XFxdJC9nLCAnJykudHJpbSgpXG4gIGlmICghaW5uZXIpIHJldHVybiBbXVxuXG4gIHJldHVybiBpbm5lci5zcGxpdCgvXFxzezIsfXxcXHMoPz1cXHcrOikvKS5tYXAocyA9PiBzLnRyaW0oKSkuZmlsdGVyKEJvb2xlYW4pLm1hcChwYXJ0ID0+IHtcbiAgICAvLyBgbmFtZTp0eXBlPWRlZmF1bHRgIG9yIGBuYW1lOnR5cGVgXG4gICAgY29uc3QgZXFJZHggPSBwYXJ0LmluZGV4T2YoJz0nKVxuICAgIGNvbnN0IGNvbG9uSWR4ID0gcGFydC5pbmRleE9mKCc6JylcbiAgICBpZiAoY29sb25JZHggPT09IC0xKSByZXR1cm4geyBuYW1lOiBwYXJ0LCB0eXBlOiAnZHluJyB9XG5cbiAgICBjb25zdCBuYW1lID0gcGFydC5zbGljZSgwLCBjb2xvbklkeCkudHJpbSgpXG4gICAgY29uc3QgcmVzdCA9IHBhcnQuc2xpY2UoY29sb25JZHggKyAxKVxuXG4gICAgaWYgKGVxSWR4ID09PSAtMSkge1xuICAgICAgcmV0dXJuIHsgbmFtZSwgdHlwZTogcmVzdC50cmltKCkgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0eXBlID0gcGFydC5zbGljZShjb2xvbklkeCArIDEsIGVxSWR4KS50cmltKClcbiAgICAgIGNvbnN0IGRlZmF1bHRSYXcgPSBwYXJ0LnNsaWNlKGVxSWR4ICsgMSkudHJpbSgpXG4gICAgICBjb25zdCBkZWZhdWx0RXhwcjogRXhwck5vZGUgPSB7IHR5cGU6ICdleHByJywgcmF3OiBkZWZhdWx0UmF3IH1cbiAgICAgIHJldHVybiB7IG5hbWUsIHR5cGUsIGRlZmF1bHQ6IGRlZmF1bHRFeHByIH1cbiAgICB9XG4gIH0pXG59XG4iLCAiLyoqXG4gKiBMRVNTY29wZSBcdTIwMTQgYSBzaW1wbGUgbGV4aWNhbGx5LXNjb3BlZCB2YXJpYWJsZSBzdG9yZS5cbiAqXG4gKiBFYWNoIGNvbW1hbmQgaW52b2NhdGlvbiBnZXRzIGEgZnJlc2ggY2hpbGQgc2NvcGUuXG4gKiBNYXRjaCBhcm0gYmluZGluZ3MgYWxzbyBjcmVhdGUgYSBjaGlsZCBzY29wZSBsaW1pdGVkIHRvIHRoYXQgYXJtJ3MgYm9keS5cbiAqIFNpZ25hbCByZWFkcy93cml0ZXMgZ28gdGhyb3VnaCB0aGUgRGF0YXN0YXIgYnJpZGdlLCBub3QgdGhpcyBzY29wZS5cbiAqL1xuZXhwb3J0IGNsYXNzIExFU1Njb3BlIHtcbiAgcHJpdmF0ZSBsb2NhbHMgPSBuZXcgTWFwPHN0cmluZywgdW5rbm93bj4oKVxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGFyZW50PzogTEVTU2NvcGUpIHt9XG5cbiAgZ2V0KG5hbWU6IHN0cmluZyk6IHVua25vd24ge1xuICAgIGlmICh0aGlzLmxvY2Fscy5oYXMobmFtZSkpIHJldHVybiB0aGlzLmxvY2Fscy5nZXQobmFtZSlcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQ/LmdldChuYW1lKVxuICB9XG5cbiAgc2V0KG5hbWU6IHN0cmluZywgdmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICB0aGlzLmxvY2Fscy5zZXQobmFtZSwgdmFsdWUpXG4gIH1cblxuICBoYXMobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMubG9jYWxzLmhhcyhuYW1lKSB8fCAodGhpcy5wYXJlbnQ/LmhhcyhuYW1lKSA/PyBmYWxzZSlcbiAgfVxuXG4gIC8qKiBDcmVhdGUgYSBjaGlsZCBzY29wZSBpbmhlcml0aW5nIGFsbCBsb2NhbHMgZnJvbSB0aGlzIG9uZS4gKi9cbiAgY2hpbGQoKTogTEVTU2NvcGUge1xuICAgIHJldHVybiBuZXcgTEVTU2NvcGUodGhpcylcbiAgfVxuXG4gIC8qKiBTbmFwc2hvdCBhbGwgbG9jYWxzIChmb3IgZGVidWdnaW5nIC8gZXJyb3IgbWVzc2FnZXMpLiAqL1xuICBzbmFwc2hvdCgpOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XG4gICAgY29uc3QgYmFzZSA9IHRoaXMucGFyZW50Py5zbmFwc2hvdCgpID8/IHt9XG4gICAgZm9yIChjb25zdCBbaywgdl0gb2YgdGhpcy5sb2NhbHMpIGJhc2Vba10gPSB2XG4gICAgcmV0dXJuIGJhc2VcbiAgfVxufVxuIiwgIi8qKlxuICogUGhhc2UgNWE6IEludGVyc2VjdGlvbk9ic2VydmVyIHdpcmluZ1xuICpcbiAqIE9uZSBzaGFyZWQgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgaXMgY3JlYXRlZCBwZXIgPGxvY2FsLWV2ZW50LXNjcmlwdD4gaG9zdC5cbiAqIEl0IHdhdGNoZXMgdGhlIGhvc3QgZWxlbWVudCBpdHNlbGYgKG5vdCBpdHMgY2hpbGRyZW4pLlxuICpcbiAqIG9uLWVudGVyOiBmaXJlcyB3aGVuIHRoZSBob3N0IGNyb3NzZXMgaW50byB0aGUgdmlld3BvcnRcbiAqICAgLSBFYWNoIDxvbi1lbnRlcj4gaGFzIGFuIG9wdGlvbmFsIGB3aGVuYCBndWFyZCBldmFsdWF0ZWQgYXQgZmlyZSB0aW1lXG4gKiAgIC0gTXVsdGlwbGUgPG9uLWVudGVyPiBjaGlsZHJlbiBhcmUgYWxsIGNoZWNrZWQgaW4gZGVjbGFyYXRpb24gb3JkZXJcbiAqXG4gKiBvbi1leGl0OiBmaXJlcyB3aGVuIHRoZSBob3N0IGxlYXZlcyB0aGUgdmlld3BvcnRcbiAqICAgLSBBbHdheXMgZmlyZXMgdW5jb25kaXRpb25hbGx5IChubyBgd2hlbmAgZ3VhcmQgb24gb24tZXhpdClcbiAqICAgLSBNdWx0aXBsZSA8b24tZXhpdD4gY2hpbGRyZW4gYWxsIGZpcmVcbiAqXG4gKiBUaGUgb2JzZXJ2ZXIgaXMgZGlzY29ubmVjdGVkIGluIGRpc2Nvbm5lY3RlZENhbGxiYWNrIHZpYSB0aGUgcmV0dXJuZWQgY2xlYW51cCBmbi5cbiAqL1xuXG5pbXBvcnQgeyBleGVjdXRlLCBldmFsRXhwciB9IGZyb20gJy4vZXhlY3V0b3IuanMnXG5pbXBvcnQgdHlwZSB7IExFU0NvbnRleHQgfSBmcm9tICcuL2V4ZWN1dG9yLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNOb2RlIH0gZnJvbSAnQHBhcnNlci9hc3QuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgT25FbnRlckRlY2wge1xuICB3aGVuOiBzdHJpbmcgfCBudWxsXG4gIGJvZHk6IExFU05vZGVcbn1cblxuLyoqXG4gKiBBdHRhY2hlcyBhbiBJbnRlcnNlY3Rpb25PYnNlcnZlciB0byB0aGUgaG9zdCBlbGVtZW50LlxuICpcbiAqIEByZXR1cm5zIEEgY2xlYW51cCBmdW5jdGlvbiB0aGF0IGRpc2Nvbm5lY3RzIHRoZSBvYnNlcnZlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpcmVJbnRlcnNlY3Rpb25PYnNlcnZlcihcbiAgaG9zdDogRWxlbWVudCxcbiAgb25FbnRlcjogT25FbnRlckRlY2xbXSxcbiAgb25FeGl0OiBMRVNOb2RlW10sXG4gIGdldEN0eDogKCkgPT4gTEVTQ29udGV4dCxcbik6ICgpID0+IHZvaWQge1xuICBpZiAob25FbnRlci5sZW5ndGggPT09IDAgJiYgb25FeGl0Lmxlbmd0aCA9PT0gMCkge1xuICAgIC8vIE5vdGhpbmcgdG8gb2JzZXJ2ZSBcdTIwMTQgc2tpcCBjcmVhdGluZyB0aGUgSU8gZW50aXJlbHlcbiAgICByZXR1cm4gKCkgPT4ge31cbiAgfVxuXG4gIGxldCB3YXNJbnRlcnNlY3Rpbmc6IGJvb2xlYW4gfCBudWxsID0gbnVsbFxuXG4gIGNvbnN0IG9ic2VydmVyID0gbmV3IEludGVyc2VjdGlvbk9ic2VydmVyKFxuICAgIChlbnRyaWVzKSA9PiB7XG4gICAgICAvLyBJTyBmaXJlcyBvbmNlIGltbWVkaWF0ZWx5IG9uIGF0dGFjaCB3aXRoIHRoZSBjdXJyZW50IHN0YXRlLlxuICAgICAgLy8gV2UgdHJhY2sgYHdhc0ludGVyc2VjdGluZ2AgdG8gYXZvaWQgc3B1cmlvdXMgb24tZXhpdCBvbiBmaXJzdCB0aWNrLlxuICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgICAgIGNvbnN0IG5vd0ludGVyc2VjdGluZyA9IGVudHJ5LmlzSW50ZXJzZWN0aW5nXG5cbiAgICAgICAgaWYgKG5vd0ludGVyc2VjdGluZyAmJiB3YXNJbnRlcnNlY3RpbmcgIT09IHRydWUpIHtcbiAgICAgICAgICAvLyBFbnRlcmVkIHZpZXdwb3J0XG4gICAgICAgICAgd2FzSW50ZXJzZWN0aW5nID0gdHJ1ZVxuICAgICAgICAgIGhhbmRsZUVudGVyKG9uRW50ZXIsIGdldEN0eClcbiAgICAgICAgfSBlbHNlIGlmICghbm93SW50ZXJzZWN0aW5nICYmIHdhc0ludGVyc2VjdGluZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgIC8vIEV4aXRlZCB2aWV3cG9ydCAob25seSBhZnRlciB3ZSd2ZSBiZWVuIGluIGl0KVxuICAgICAgICAgIHdhc0ludGVyc2VjdGluZyA9IGZhbHNlXG4gICAgICAgICAgaGFuZGxlRXhpdChvbkV4aXQsIGdldEN0eClcbiAgICAgICAgfSBlbHNlIGlmICh3YXNJbnRlcnNlY3RpbmcgPT09IG51bGwpIHtcbiAgICAgICAgICAvLyBGaXJzdCB0aWNrIFx1MjAxNCByZWNvcmQgc3RhdGUgYnV0IGRvbid0IGZpcmUgZXhpdCBmb3IgaW5pdGlhbGx5LW9mZi1zY3JlZW5cbiAgICAgICAgICB3YXNJbnRlcnNlY3RpbmcgPSBub3dJbnRlcnNlY3RpbmdcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgLy8gRGVmYXVsdCB0aHJlc2hvbGQ6IGZpcmUgd2hlbiBhbnkgcGl4ZWwgb2YgdGhlIGhvc3QgZW50ZXJzL2V4aXRzXG4gICAgICB0aHJlc2hvbGQ6IDAsXG4gICAgfVxuICApXG5cbiAgb2JzZXJ2ZXIub2JzZXJ2ZShob3N0KVxuICBjb25zb2xlLmxvZygnW0xFU10gSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgYXR0YWNoZWQnLCAoaG9zdCBhcyBIVE1MRWxlbWVudCkuaWQgfHwgaG9zdC50YWdOYW1lKVxuXG4gIHJldHVybiAoKSA9PiB7XG4gICAgb2JzZXJ2ZXIuZGlzY29ubmVjdCgpXG4gICAgY29uc29sZS5sb2coJ1tMRVNdIEludGVyc2VjdGlvbk9ic2VydmVyIGRpc2Nvbm5lY3RlZCcpXG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRW50ZXIoZGVjbHM6IE9uRW50ZXJEZWNsW10sIGdldEN0eDogKCkgPT4gTEVTQ29udGV4dCk6IHZvaWQge1xuICBjb25zdCBjdHggPSBnZXRDdHgoKVxuXG4gIGZvciAoY29uc3QgZGVjbCBvZiBkZWNscykge1xuICAgIC8vIEV2YWx1YXRlIGB3aGVuYCBndWFyZCBcdTIwMTQgaWYgYWJzZW50LCBhbHdheXMgZmlyZXNcbiAgICBpZiAoZGVjbC53aGVuKSB7XG4gICAgICBjb25zdCBwYXNzZXMgPSBCb29sZWFuKGV2YWxFeHByKHsgdHlwZTogJ2V4cHInLCByYXc6IGRlY2wud2hlbiB9LCBjdHgpKVxuICAgICAgaWYgKCFwYXNzZXMpIHtcbiAgICAgICAgY29uc29sZS5sb2coYFtMRVNdIG9uLWVudGVyIGd1YXJkIHJlamVjdGVkOiAke2RlY2wud2hlbn1gKVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgIH1cblxuICAgIGV4ZWN1dGUoZGVjbC5ib2R5LCBjdHgpLmNhdGNoKGVyciA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbTEVTXSBFcnJvciBpbiBvbi1lbnRlcjonLCBlcnIpXG4gICAgfSlcbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVFeGl0KGJvZGllczogTEVTTm9kZVtdLCBnZXRDdHg6ICgpID0+IExFU0NvbnRleHQpOiB2b2lkIHtcbiAgY29uc3QgY3R4ID0gZ2V0Q3R4KClcblxuICBmb3IgKGNvbnN0IGJvZHkgb2YgYm9kaWVzKSB7XG4gICAgZXhlY3V0ZShib2R5LCBjdHgpLmNhdGNoKGVyciA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbTEVTXSBFcnJvciBpbiBvbi1leGl0OicsIGVycilcbiAgICB9KVxuICB9XG59XG4iLCAiLyoqXG4gKiBQaGFzZSA1YjogU2lnbmFsIHdhdGNoZXIgd2lyaW5nXG4gKlxuICogPG9uLXNpZ25hbD4gcmVhY3RzIHdoZW5ldmVyIGEgbmFtZWQgRGF0YXN0YXIgc2lnbmFsIGNoYW5nZXMuXG4gKiBUaGUgYHdoZW5gIGd1YXJkIGlzIHJlLWV2YWx1YXRlZCBvbiBldmVyeSBjaGFuZ2UgXHUyMDE0IGlmIGZhbHN5LCB0aGVcbiAqIGhhbmRsZSBib2R5IGRvZXMgbm90IHJ1biAobm90IGFuIGVycm9yLCBqdXN0IGZpbHRlcmVkIG91dCkuXG4gKlxuICogSW4gUGhhc2UgNSB3ZSB1c2UgYSBzaW1wbGUgbG9jYWwgbm90aWZpY2F0aW9uIHBhdGg6IHdoZW5ldmVyXG4gKiBMb2NhbEV2ZW50U2NyaXB0Ll9zZXRTaWduYWwoKSB3cml0ZXMgYSB2YWx1ZSwgaXQgY2FsbHMgaW50b1xuICogbm90aWZ5U2lnbmFsV2F0Y2hlcnMoKS4gVGhpcyBoYW5kbGVzIHRoZSBmYWxsYmFjayAobm8gRGF0YXN0YXIpIGNhc2UuXG4gKlxuICogUGhhc2UgNiByZXBsYWNlcyB0aGUgbm90aWZpY2F0aW9uIHBhdGggd2l0aCBEYXRhc3RhcidzIGVmZmVjdCgpIHN5c3RlbSxcbiAqIHdoaWNoIGlzIG1vcmUgZWZmaWNpZW50IChiYXRjaGVkLCBkZWR1cGVkLCByZWFjdGl2ZSBncmFwaC1hd2FyZSkuXG4gKlxuICogVGhlIHdhdGNoZXIgZmlyZXMgdGhlIGJvZHkgYXN5bmNocm9ub3VzbHkgKG5vbi1ibG9ja2luZykgdG8gbWF0Y2hcbiAqIHRoZSBiZWhhdmlvdXIgb2YgRGF0YXN0YXIncyByZWFjdGl2ZSBlZmZlY3RzLlxuICovXG5cbmltcG9ydCB7IGV4ZWN1dGUsIGV2YWxFeHByIH0gZnJvbSAnLi9leGVjdXRvci5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29udGV4dCB9IGZyb20gJy4vZXhlY3V0b3IuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuZXhwb3J0IGludGVyZmFjZSBTaWduYWxXYXRjaGVyRGVjbCB7XG4gIC8qKiBTaWduYWwgbmFtZSB3aXRoICQgcHJlZml4OiBcIiRmZWVkU3RhdGVcIiAqL1xuICBzaWduYWw6IHN0cmluZ1xuICAvKiogT3B0aW9uYWwgZ3VhcmQgZXhwcmVzc2lvbiBcdTIwMTQgbnVsbCBtZWFucyBhbHdheXMgZmlyZXMgKi9cbiAgd2hlbjogc3RyaW5nIHwgbnVsbFxuICBib2R5OiBMRVNOb2RlXG59XG5cbi8qKlxuICogQ2hlY2tzIGFsbCBzaWduYWwgd2F0Y2hlcnMgdG8gc2VlIGlmIGFueSBzaG91bGQgZmlyZSBmb3IgdGhlXG4gKiBnaXZlbiBzaWduYWwgbmFtZSBjaGFuZ2UuXG4gKlxuICogQ2FsbGVkIGZyb20gTG9jYWxFdmVudFNjcmlwdC5fc2V0U2lnbmFsKCkgYWZ0ZXIgZXZlcnkgd3JpdGUuXG4gKiBBbHNvIGNhbGxlZCBmcm9tIFBoYXNlIDYgRGF0YXN0YXIgZWZmZWN0KCkgc3Vic2NyaXB0aW9ucy5cbiAqXG4gKiBAcGFyYW0gY2hhbmdlZFNpZ25hbCAgVGhlIHNpZ25hbCBuYW1lICp3aXRob3V0KiB0aGUgJCBwcmVmaXhcbiAqIEBwYXJhbSB3YXRjaGVycyAgICAgICBBbGwgb24tc2lnbmFsIGRlY2xhcmF0aW9ucyBmb3IgdGhpcyBMRVMgaW5zdGFuY2VcbiAqIEBwYXJhbSBnZXRDdHggICAgICAgICBSZXR1cm5zIHRoZSBjdXJyZW50IGV4ZWN1dGlvbiBjb250ZXh0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RpZnlTaWduYWxXYXRjaGVycyhcbiAgY2hhbmdlZFNpZ25hbDogc3RyaW5nLFxuICB3YXRjaGVyczogU2lnbmFsV2F0Y2hlckRlY2xbXSxcbiAgZ2V0Q3R4OiAoKSA9PiBMRVNDb250ZXh0XG4pOiB2b2lkIHtcbiAgZm9yIChjb25zdCB3YXRjaGVyIG9mIHdhdGNoZXJzKSB7XG4gICAgLy8gTm9ybWFsaXplOiBzdHJpcCBsZWFkaW5nICQgZm9yIGNvbXBhcmlzb25cbiAgICBjb25zdCB3YXRjaGVkS2V5ID0gd2F0Y2hlci5zaWduYWwucmVwbGFjZSgvXlxcJC8sICcnKVxuXG4gICAgaWYgKHdhdGNoZWRLZXkgIT09IGNoYW5nZWRTaWduYWwpIGNvbnRpbnVlXG5cbiAgICBjb25zdCBjdHggPSBnZXRDdHgoKVxuXG4gICAgLy8gRXZhbHVhdGUgYHdoZW5gIGd1YXJkXG4gICAgaWYgKHdhdGNoZXIud2hlbikge1xuICAgICAgY29uc3QgcGFzc2VzID0gQm9vbGVhbihldmFsRXhwcih7IHR5cGU6ICdleHByJywgcmF3OiB3YXRjaGVyLndoZW4gfSwgY3R4KSlcbiAgICAgIGlmICghcGFzc2VzKSBjb250aW51ZVxuICAgIH1cblxuICAgIC8vIEZpcmUgdGhlIGJvZHkgYXN5bmNocm9ub3VzbHkgXHUyMDE0IGRvbid0IGJsb2NrIHRoZSBzaWduYWwgd3JpdGUgcGF0aFxuICAgIGV4ZWN1dGUod2F0Y2hlci5ib2R5LCBjdHgpLmNhdGNoKGVyciA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKGBbTEVTXSBFcnJvciBpbiBvbi1zaWduYWwgXCIke3dhdGNoZXIuc2lnbmFsfVwiOmAsIGVycilcbiAgICB9KVxuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIERhdGFzdGFyLWNvbXBhdGlibGUgZWZmZWN0IHN1YnNjcmlwdGlvbiBmb3Igb25lIHNpZ25hbCB3YXRjaGVyLlxuICogVXNlZCBpbiBQaGFzZSA2IHdoZW4gRGF0YXN0YXIgaXMgcHJlc2VudC5cbiAqXG4gKiBAcGFyYW0gd2F0Y2hlciAgIFRoZSBvbi1zaWduYWwgZGVjbGFyYXRpb25cbiAqIEBwYXJhbSBlZmZlY3QgICAgRGF0YXN0YXIncyBlZmZlY3QoKSBmdW5jdGlvblxuICogQHBhcmFtIGdldEN0eCAgICBSZXR1cm5zIHRoZSBjdXJyZW50IGV4ZWN1dGlvbiBjb250ZXh0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXJlU2lnbmFsV2F0Y2hlclZpYURhdGFzdGFyKFxuICB3YXRjaGVyOiBTaWduYWxXYXRjaGVyRGVjbCxcbiAgZWZmZWN0OiAoZm46ICgpID0+IHZvaWQpID0+IHZvaWQsXG4gIGdldEN0eDogKCkgPT4gTEVTQ29udGV4dFxuKTogdm9pZCB7XG4gIGVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgY3R4ID0gZ2V0Q3R4KClcblxuICAgIC8vIFJlYWRpbmcgdGhlIHNpZ25hbCBpbnNpZGUgYW4gZWZmZWN0KCkgYXV0by1zdWJzY3JpYmVzIHVzIHRvIGl0XG4gICAgY29uc3Qgc2lnbmFsS2V5ID0gd2F0Y2hlci5zaWduYWwucmVwbGFjZSgvXlxcJC8sICcnKVxuICAgIGN0eC5nZXRTaWduYWwoc2lnbmFsS2V5KSAvLyBzdWJzY3JpcHRpb24gc2lkZS1lZmZlY3RcblxuICAgIGlmICh3YXRjaGVyLndoZW4pIHtcbiAgICAgIGNvbnN0IHBhc3NlcyA9IEJvb2xlYW4oZXZhbEV4cHIoeyB0eXBlOiAnZXhwcicsIHJhdzogd2F0Y2hlci53aGVuIH0sIGN0eCkpXG4gICAgICBpZiAoIXBhc3NlcykgcmV0dXJuXG4gICAgfVxuXG4gICAgZXhlY3V0ZSh3YXRjaGVyLmJvZHksIGN0eCkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFtMRVNdIEVycm9yIGluIG9uLXNpZ25hbCBcIiR7d2F0Y2hlci5zaWduYWx9XCIgKERhdGFzdGFyKTpgLCBlcnIpXG4gICAgfSlcbiAgfSlcbn1cbiIsICJpbXBvcnQgeyBDb21tYW5kUmVnaXN0cnkgfSBmcm9tICdAcnVudGltZS9yZWdpc3RyeS5qcydcbmltcG9ydCB7IE1vZHVsZVJlZ2lzdHJ5LCBsb2FkTW9kdWxlIH0gZnJvbSAnQG1vZHVsZXMvdHlwZXMuanMnXG5pbXBvcnQgeyByZWFkQ29uZmlnLCBsb2dDb25maWcgfSBmcm9tICdAcGFyc2VyL3JlYWRlci5qcydcbmltcG9ydCB7IHBhcnNlTEVTIH0gZnJvbSAnQHBhcnNlci9pbmRleC5qcydcbmltcG9ydCB7IGJ1aWxkQ29udGV4dCwgcmVnaXN0ZXJDb21tYW5kcywgd2lyZUV2ZW50SGFuZGxlcnMsIGZpcmVPbkxvYWQsIHR5cGUgUGFyc2VkV2lyaW5nIH0gZnJvbSAnQHJ1bnRpbWUvd2lyaW5nLmpzJ1xuaW1wb3J0IHsgd2lyZUludGVyc2VjdGlvbk9ic2VydmVyIH0gZnJvbSAnQHJ1bnRpbWUvb2JzZXJ2ZXIuanMnXG5pbXBvcnQgeyBub3RpZnlTaWduYWxXYXRjaGVycywgd2lyZVNpZ25hbFdhdGNoZXJWaWFEYXRhc3RhciB9IGZyb20gJ0BydW50aW1lL3NpZ25hbHMuanMnXG5pbXBvcnQgdHlwZSB7IExFU0NvbmZpZyB9IGZyb20gJ0BwYXJzZXIvY29uZmlnLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNOb2RlIH0gZnJvbSAnQHBhcnNlci9hc3QuanMnXG5pbXBvcnQgdHlwZSB7IExFU0NvbnRleHQgfSBmcm9tICdAcnVudGltZS9leGVjdXRvci5qcydcblxuZXhwb3J0IGNsYXNzIExvY2FsRXZlbnRTY3JpcHQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIHJlYWRvbmx5IGNvbW1hbmRzID0gbmV3IENvbW1hbmRSZWdpc3RyeSgpXG4gIHJlYWRvbmx5IG1vZHVsZXMgID0gbmV3IE1vZHVsZVJlZ2lzdHJ5KClcblxuICBwcml2YXRlIF9jb25maWc6ICBMRVNDb25maWcgfCBudWxsICA9IG51bGxcbiAgcHJpdmF0ZSBfd2lyaW5nOiAgUGFyc2VkV2lyaW5nIHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBfY3R4OiAgICAgTEVTQ29udGV4dCB8IG51bGwgPSBudWxsXG5cbiAgLy8gQ2xlYW51cCBmbnMgYWNjdW11bGF0ZWQgZHVyaW5nIF9pbml0IFx1MjAxNCBhbGwgY2FsbGVkIGluIF90ZWFyZG93blxuICBwcml2YXRlIF9jbGVhbnVwczogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXVxuXG4gIC8vIFNpbXBsZSBmYWxsYmFjayBzaWduYWwgc3RvcmUgKERhdGFzdGFyIGJyaWRnZSByZXBsYWNlcyByZWFkcy93cml0ZXMgaW4gUGhhc2UgNilcbiAgcHJpdmF0ZSBfc2lnbmFsczogTWFwPHN0cmluZywgdW5rbm93bj4gPSBuZXcgTWFwKClcblxuICAvLyBEYXRhc3RhciBicmlkZ2UgKHBvcHVsYXRlZCBpbiBQaGFzZSA2IHZpYSBhdHRyaWJ1dGUgcGx1Z2luKVxuICBwcml2YXRlIF9kc0VmZmVjdDogKChmbjogKCkgPT4gdm9pZCkgPT4gdm9pZCkgfCB1bmRlZmluZWQgPSB1bmRlZmluZWRcbiAgcHJpdmF0ZSBfZHNTaWduYWw6ICg8VD4obmFtZTogc3RyaW5nLCBpbml0PzogVCkgPT4geyB2YWx1ZTogVCB9KSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZFxuXG4gIGdldCBjb25maWcoKTogIExFU0NvbmZpZyB8IG51bGwgICAgeyByZXR1cm4gdGhpcy5fY29uZmlnIH1cbiAgZ2V0IHdpcmluZygpOiAgUGFyc2VkV2lyaW5nIHwgbnVsbCB7IHJldHVybiB0aGlzLl93aXJpbmcgfVxuICBnZXQgY29udGV4dCgpOiBMRVNDb250ZXh0IHwgbnVsbCAgIHsgcmV0dXJuIHRoaXMuX2N0eCB9XG5cbiAgc3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMoKTogc3RyaW5nW10geyByZXR1cm4gW10gfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIHF1ZXVlTWljcm90YXNrKCgpID0+IHRoaXMuX2luaXQoKSlcbiAgfVxuXG4gIGRpc2Nvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIHRoaXMuX3RlYXJkb3duKClcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBJbnRlcm5hbCBsaWZlY3ljbGUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBhc3luYyBfaW5pdCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPGxvY2FsLWV2ZW50LXNjcmlwdD4gaW5pdGlhbGl6aW5nJywgdGhpcy5pZCB8fCAnKG5vIGlkKScpXG5cbiAgICAvLyBQcmUtc2VlZCBsb2NhbCBzaWduYWwgc3RvcmUgZnJvbSBkYXRhLXNpZ25hbHM6KiBhdHRyaWJ1dGVzLlxuICAgIC8vIFRoZSBJbnRlcnNlY3Rpb25PYnNlcnZlciBjYW4gZmlyZSBiZWZvcmUgRGF0YXN0YXIncyBhc3luYyBwbHVnaW4gY29ubmVjdHMsXG4gICAgLy8gc28gZ3VhcmQgZXhwcmVzc2lvbnMgbGlrZSBgJGludHJvU3RhdGUgPT0gJ2hpZGRlbidgIHdvdWxkIGV2YWx1YXRlIHRvXG4gICAgLy8gYHVuZGVmaW5lZCA9PSAnaGlkZGVuJ2AgXHUyMTkyIGZhbHNlIHdpdGhvdXQgdGhpcyBwcmUtc2VlZGluZyBzdGVwLlxuICAgIHRoaXMuX3NlZWRTaWduYWxzRnJvbUF0dHJpYnV0ZXMoKVxuXG4gICAgLy8gUGhhc2UgMTogRE9NIFx1MjE5MiBjb25maWdcbiAgICB0aGlzLl9jb25maWcgPSByZWFkQ29uZmlnKHRoaXMpXG4gICAgbG9nQ29uZmlnKHRoaXMuX2NvbmZpZylcblxuICAgIC8vIFBoYXNlIDg6IGxvYWQgbW9kdWxlcyBiZWZvcmUgcGFyc2luZyBzbyBwcmltaXRpdmUgbmFtZXMgcmVzb2x2ZVxuICAgIGF3YWl0IHRoaXMuX2xvYWRNb2R1bGVzKHRoaXMuX2NvbmZpZylcblxuICAgIC8vIFBoYXNlIDI6IHBhcnNlIGJvZHkgc3RyaW5ncyBcdTIxOTIgQVNUXG4gICAgdGhpcy5fd2lyaW5nID0gdGhpcy5fcGFyc2VBbGwodGhpcy5fY29uZmlnKVxuXG4gICAgLy8gUGhhc2UgNDogYnVpbGQgY29udGV4dCwgcmVnaXN0ZXIgY29tbWFuZHMsIHdpcmUgZXZlbnQgaGFuZGxlcnNcbiAgICB0aGlzLl9jdHggPSBidWlsZENvbnRleHQoXG4gICAgICB0aGlzLFxuICAgICAgdGhpcy5jb21tYW5kcyxcbiAgICAgIHRoaXMubW9kdWxlcyxcbiAgICAgIHsgZ2V0OiBrID0+IHRoaXMuX2dldFNpZ25hbChrKSwgc2V0OiAoaywgdikgPT4gdGhpcy5fc2V0U2lnbmFsKGssIHYpIH1cbiAgICApXG5cbiAgICByZWdpc3RlckNvbW1hbmRzKHRoaXMuX3dpcmluZywgdGhpcy5jb21tYW5kcylcblxuICAgIHRoaXMuX2NsZWFudXBzLnB1c2goXG4gICAgICB3aXJlRXZlbnRIYW5kbGVycyh0aGlzLl93aXJpbmcsIHRoaXMsICgpID0+IHRoaXMuX2N0eCEpXG4gICAgKVxuXG4gICAgLy8gUGhhc2UgNWE6IEludGVyc2VjdGlvbk9ic2VydmVyIGZvciBvbi1lbnRlciAvIG9uLWV4aXRcbiAgICB0aGlzLl9jbGVhbnVwcy5wdXNoKFxuICAgICAgd2lyZUludGVyc2VjdGlvbk9ic2VydmVyKFxuICAgICAgICB0aGlzLFxuICAgICAgICB0aGlzLl93aXJpbmcubGlmZWN5Y2xlLm9uRW50ZXIsXG4gICAgICAgIHRoaXMuX3dpcmluZy5saWZlY3ljbGUub25FeGl0LFxuICAgICAgICAoKSA9PiB0aGlzLl9jdHghXG4gICAgICApXG4gICAgKVxuXG4gICAgLy8gUGhhc2UgNWI6IHNpZ25hbCB3YXRjaGVyc1xuICAgIC8vIElmIERhdGFzdGFyIGlzIGNvbm5lY3RlZCB1c2UgaXRzIHJlYWN0aXZlIGVmZmVjdCgpIHN5c3RlbTtcbiAgICAvLyBvdGhlcndpc2UgdGhlIGxvY2FsIF9zZXRTaWduYWwgcGF0aCBjYWxscyBub3RpZnlTaWduYWxXYXRjaGVycyBkaXJlY3RseS5cbiAgICBpZiAodGhpcy5fZHNFZmZlY3QpIHtcbiAgICAgIGZvciAoY29uc3Qgd2F0Y2hlciBvZiB0aGlzLl93aXJpbmcud2F0Y2hlcnMpIHtcbiAgICAgICAgd2lyZVNpZ25hbFdhdGNoZXJWaWFEYXRhc3Rhcih3YXRjaGVyLCB0aGlzLl9kc0VmZmVjdCwgKCkgPT4gdGhpcy5fY3R4ISlcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSB3aXJlZCAke3RoaXMuX3dpcmluZy53YXRjaGVycy5sZW5ndGh9IHNpZ25hbCB3YXRjaGVycyB2aWEgRGF0YXN0YXJgKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZyhgW0xFU10gd2lyZWQgJHt0aGlzLl93aXJpbmcud2F0Y2hlcnMubGVuZ3RofSBzaWduYWwgd2F0Y2hlcnMgKGxvY2FsIGZhbGxiYWNrKWApXG4gICAgfVxuXG4gICAgLy8gUGhhc2UgNjogRGF0YXN0YXIgYnJpZGdlIGZ1bGwgYWN0aXZhdGlvbiBcdTIwMTQgY29taW5nIG5leHRcblxuICAgIC8vIG9uLWxvYWQgZmlyZXMgbGFzdCwgYWZ0ZXIgZXZlcnl0aGluZyBpcyB3aXJlZFxuICAgIGF3YWl0IGZpcmVPbkxvYWQodGhpcy5fd2lyaW5nLCAoKSA9PiB0aGlzLl9jdHghKVxuXG4gICAgY29uc29sZS5sb2coJ1tMRVNdIHJlYWR5OicsIHRoaXMuaWQgfHwgJyhubyBpZCknKVxuICB9XG5cbiAgcHJpdmF0ZSBfdGVhcmRvd24oKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGRpc2Nvbm5lY3RlZCcsIHRoaXMuaWQgfHwgJyhubyBpZCknKVxuICAgIGZvciAoY29uc3QgY2xlYW51cCBvZiB0aGlzLl9jbGVhbnVwcykgY2xlYW51cCgpXG4gICAgdGhpcy5fY2xlYW51cHMgPSBbXVxuICAgIHRoaXMuX2NvbmZpZyAgID0gbnVsbFxuICAgIHRoaXMuX3dpcmluZyAgID0gbnVsbFxuICAgIHRoaXMuX2N0eCAgICAgID0gbnVsbFxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFNpZ25hbCBzdG9yZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKipcbiAgICogUmVhZHMgYWxsIGRhdGEtc2lnbmFsczpLRVk9XCJWQUxVRVwiIGF0dHJpYnV0ZXMgb24gdGhlIGhvc3QgZWxlbWVudCBhbmRcbiAgICogcHJlLXBvcHVsYXRlcyB0aGUgbG9jYWwgX3NpZ25hbHMgTWFwIHdpdGggdGhlaXIgaW5pdGlhbCB2YWx1ZXMuXG4gICAqXG4gICAqIERhdGFzdGFyIGV2YWx1YXRlcyB0aGVzZSBhcyBKUyBleHByZXNzaW9ucyAoZS5nLiBcIidoaWRkZW4nXCIgXHUyMTkyIFwiaGlkZGVuXCIsXG4gICAqIFwiMFwiIFx1MjE5MiAwLCBcIltdXCIgXHUyMTkyIFtdKS4gV2UgZG8gdGhlIHNhbWUgd2l0aCBhIHNpbXBsZSBldmFsLlxuICAgKlxuICAgKiBUaGlzIHJ1bnMgc3luY2hyb25vdXNseSBiZWZvcmUgYW55IGFzeW5jIG9wZXJhdGlvbnMgc28gdGhhdCB0aGVcbiAgICogSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgXHUyMDE0IHdoaWNoIG1heSBmaXJlIGJlZm9yZSBEYXRhc3RhciBjb25uZWN0cyBcdTIwMTQgc2Vlc1xuICAgKiB0aGUgY29ycmVjdCBpbml0aWFsIHNpZ25hbCB2YWx1ZXMgd2hlbiBldmFsdWF0aW5nIGB3aGVuYCBndWFyZHMuXG4gICAqL1xuICBwcml2YXRlIF9zZWVkU2lnbmFsc0Zyb21BdHRyaWJ1dGVzKCk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgYXR0ciBvZiBBcnJheS5mcm9tKHRoaXMuYXR0cmlidXRlcykpIHtcbiAgICAgIC8vIE1hdGNoIGRhdGEtc2lnbmFsczpLRVkgb3IgZGF0YS1zdGFyLXNpZ25hbHM6S0VZIChhbGlhc2VkIGJ1bmRsZSlcbiAgICAgIGNvbnN0IG0gPSBhdHRyLm5hbWUubWF0Y2goL15kYXRhLSg/OnN0YXItKT9zaWduYWxzOiguKykkLylcbiAgICAgIGlmICghbSkgY29udGludWVcbiAgICAgIGNvbnN0IGtleSA9IG1bMV0hXG4gICAgICAgIC5yZXBsYWNlKC8tKFthLXpdKS9nLCAoXywgY2g6IHN0cmluZykgPT4gY2gudG9VcHBlckNhc2UoKSkgLy8ga2ViYWItY2FzZSBcdTIxOTIgY2FtZWxDYXNlXG4gICAgICB0cnkge1xuICAgICAgICAvLyBFdmFsdWF0ZSB0aGUgYXR0cmlidXRlIHZhbHVlIGFzIGEgSlMgZXhwcmVzc2lvbiAoc2FtZSBhcyBEYXRhc3RhciBkb2VzKVxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tbmV3LWZ1bmNcbiAgICAgICAgY29uc3QgdmFsdWUgPSBuZXcgRnVuY3Rpb24oYHJldHVybiAoJHthdHRyLnZhbHVlfSlgKSgpXG4gICAgICAgIHRoaXMuX3NpZ25hbHMuc2V0KGtleSwgdmFsdWUpXG4gICAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSBzZWVkZWQgJCR7a2V5fSA9YCwgdmFsdWUpXG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLy8gSWYgaXQgZmFpbHMsIHN0b3JlIHRoZSByYXcgc3RyaW5nIHZhbHVlXG4gICAgICAgIHRoaXMuX3NpZ25hbHMuc2V0KGtleSwgYXR0ci52YWx1ZSlcbiAgICAgICAgY29uc29sZS5sb2coYFtMRVNdIHNlZWRlZCAkJHtrZXl9ID0gKHJhdylgLCBhdHRyLnZhbHVlKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2dldFNpZ25hbChuYW1lOiBzdHJpbmcpOiB1bmtub3duIHtcbiAgICAvLyBQaGFzZSA2OiBwcmVmZXIgRGF0YXN0YXIgc2lnbmFsIHRyZWUgd2hlbiBicmlkZ2UgaXMgY29ubmVjdGVkXG4gICAgaWYgKHRoaXMuX2RzU2lnbmFsKSB7XG4gICAgICB0cnkgeyByZXR1cm4gdGhpcy5fZHNTaWduYWwobmFtZSkudmFsdWUgfSBjYXRjaCB7IC8qIGZhbGwgdGhyb3VnaCAqLyB9XG4gICAgfVxuICAgIC8vIFRyeSBleGFjdCBjYXNlIGZpcnN0IChlLmcuIERhdGFzdGFyLXNldCBzaWduYWxzIGFyZSBjYW1lbENhc2UpLlxuICAgIC8vIEZhbGwgYmFjayB0byBsb3dlcmNhc2UgYmVjYXVzZSBIVE1MIG5vcm1hbGl6ZXMgYXR0cmlidXRlIG5hbWVzIHRvIGxvd2VyY2FzZSxcbiAgICAvLyBzbyBkYXRhLXNpZ25hbHM6aW50cm9TdGF0ZSBcdTIxOTIgc2VlZGVkIGFzIFwiaW50cm9zdGF0ZVwiLCBidXQgZ3VhcmRzIHJlZmVyZW5jZSBcIiRpbnRyb1N0YXRlXCIuXG4gICAgaWYgKHRoaXMuX3NpZ25hbHMuaGFzKG5hbWUpKSByZXR1cm4gdGhpcy5fc2lnbmFscy5nZXQobmFtZSlcbiAgICBpZiAodGhpcy5fc2lnbmFscy5oYXMobmFtZS50b0xvd2VyQ2FzZSgpKSkgcmV0dXJuIHRoaXMuX3NpZ25hbHMuZ2V0KG5hbWUudG9Mb3dlckNhc2UoKSlcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cblxuICBwcml2YXRlIF9zZXRTaWduYWwobmFtZTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIGNvbnN0IHByZXYgPSB0aGlzLl9zaWduYWxzLmdldChuYW1lKVxuICAgIHRoaXMuX3NpZ25hbHMuc2V0KG5hbWUsIHZhbHVlKVxuICAgIGNvbnNvbGUubG9nKGBbTEVTXSAkJHtuYW1lfSA9YCwgdmFsdWUpXG5cbiAgICAvLyBQaGFzZSA2OiB3cml0ZSB0aHJvdWdoIHRvIERhdGFzdGFyJ3MgcmVhY3RpdmUgZ3JhcGhcbiAgICBpZiAodGhpcy5fZHNTaWduYWwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHNpZyA9IHRoaXMuX2RzU2lnbmFsPHVua25vd24+KG5hbWUsIHZhbHVlKVxuICAgICAgICBzaWcudmFsdWUgPSB2YWx1ZVxuICAgICAgfSBjYXRjaCB7IC8qIHNpZ25hbCBtYXkgbm90IGV4aXN0IGluIERhdGFzdGFyIHlldCAqLyB9XG4gICAgfVxuXG4gICAgLy8gUGhhc2UgNWI6IG5vdGlmeSBsb2NhbCBzaWduYWwgd2F0Y2hlcnMgKGZhbGxiYWNrIHBhdGggd2hlbiBEYXRhc3RhciBhYnNlbnQpXG4gICAgaWYgKHByZXYgIT09IHZhbHVlICYmIHRoaXMuX3dpcmluZyAmJiB0aGlzLl9jdHggJiYgIXRoaXMuX2RzRWZmZWN0KSB7XG4gICAgICBub3RpZnlTaWduYWxXYXRjaGVycyhuYW1lLCB0aGlzLl93aXJpbmcud2F0Y2hlcnMsICgpID0+IHRoaXMuX2N0eCEpXG4gICAgfVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIE1vZHVsZSBsb2FkaW5nIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgYXN5bmMgX2xvYWRNb2R1bGVzKGNvbmZpZzogTEVTQ29uZmlnKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKGNvbmZpZy5tb2R1bGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICBjb25maWcubW9kdWxlcy5tYXAoZGVjbCA9PlxuICAgICAgICBsb2FkTW9kdWxlKHRoaXMubW9kdWxlcywge1xuICAgICAgICAgIC4uLihkZWNsLnR5cGUgPyB7IHR5cGU6IGRlY2wudHlwZSB9IDoge30pLFxuICAgICAgICAgIC4uLihkZWNsLnNyYyAgPyB7IHNyYzogIGRlY2wuc3JjICB9IDoge30pLFxuICAgICAgICB9KS5jYXRjaChlcnIgPT4gY29uc29sZS53YXJuKCdbTEVTXSBNb2R1bGUgbG9hZCBmYWlsZWQ6JywgZXJyKSlcbiAgICAgIClcbiAgICApXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgUGFyc2UgYWxsIGJvZGllcyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwcml2YXRlIF9wYXJzZUFsbChjb25maWc6IExFU0NvbmZpZyk6IFBhcnNlZFdpcmluZyB7XG4gICAgbGV0IG9rID0gMCwgZmFpbCA9IDBcblxuICAgIGNvbnN0IHRyeVBhcnNlID0gKGJvZHk6IHN0cmluZywgbGFiZWw6IHN0cmluZyk6IExFU05vZGUgPT4ge1xuICAgICAgdHJ5IHsgb2srKzsgcmV0dXJuIHBhcnNlTEVTKGJvZHkpIH1cbiAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgIGZhaWwrK1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbTEVTXSBQYXJzZSBlcnJvciBpbiAke2xhYmVsfTpgLCBlKVxuICAgICAgICByZXR1cm4geyB0eXBlOiAnZXhwcicsIHJhdzogJycgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHdpcmluZzogUGFyc2VkV2lyaW5nID0ge1xuICAgICAgY29tbWFuZHM6IGNvbmZpZy5jb21tYW5kcy5tYXAoZCA9PiAoe1xuICAgICAgICBuYW1lOiBkLm5hbWUsIGd1YXJkOiBkLmd1YXJkLCBhcmdzUmF3OiBkLmFyZ3NSYXcsXG4gICAgICAgIGJvZHk6IHRyeVBhcnNlKGQuYm9keSwgYGNvbW1hbmQgXCIke2QubmFtZX1cImApLFxuICAgICAgfSkpLFxuICAgICAgaGFuZGxlcnM6IGNvbmZpZy5vbkV2ZW50Lm1hcChkID0+ICh7XG4gICAgICAgIGV2ZW50OiBkLm5hbWUsXG4gICAgICAgIGJvZHk6IHRyeVBhcnNlKGQuYm9keSwgYG9uLWV2ZW50IFwiJHtkLm5hbWV9XCJgKSxcbiAgICAgIH0pKSxcbiAgICAgIHdhdGNoZXJzOiBjb25maWcub25TaWduYWwubWFwKGQgPT4gKHtcbiAgICAgICAgc2lnbmFsOiBkLm5hbWUsIHdoZW46IGQud2hlbixcbiAgICAgICAgYm9keTogdHJ5UGFyc2UoZC5ib2R5LCBgb24tc2lnbmFsIFwiJHtkLm5hbWV9XCJgKSxcbiAgICAgIH0pKSxcbiAgICAgIGxpZmVjeWNsZToge1xuICAgICAgICBvbkxvYWQ6ICBjb25maWcub25Mb2FkLm1hcChkID0+IHRyeVBhcnNlKGQuYm9keSwgJ29uLWxvYWQnKSksXG4gICAgICAgIG9uRW50ZXI6IGNvbmZpZy5vbkVudGVyLm1hcChkID0+ICh7IHdoZW46IGQud2hlbiwgYm9keTogdHJ5UGFyc2UoZC5ib2R5LCAnb24tZW50ZXInKSB9KSksXG4gICAgICAgIG9uRXhpdDogIGNvbmZpZy5vbkV4aXQubWFwKGQgPT4gdHJ5UGFyc2UoZC5ib2R5LCAnb24tZXhpdCcpKSxcbiAgICAgIH0sXG4gICAgfVxuXG4gICAgY29uc3QgdG90YWwgPSBvayArIGZhaWxcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gcGFyc2VyOiAke29rfS8ke3RvdGFsfSBib2RpZXMgcGFyc2VkIHN1Y2Nlc3NmdWxseSR7ZmFpbCA+IDAgPyBgICgke2ZhaWx9IGVycm9ycylgIDogJyd9YClcbiAgICByZXR1cm4gd2lyaW5nXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgRGF0YXN0YXIgYnJpZGdlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIGNvbm5lY3REYXRhc3RhcihmbnM6IHtcbiAgICBlZmZlY3Q6IChmbjogKCkgPT4gdm9pZCkgPT4gdm9pZFxuICAgIHNpZ25hbDogPFQ+KG5hbWU6IHN0cmluZywgaW5pdD86IFQpID0+IHsgdmFsdWU6IFQgfVxuICB9KTogdm9pZCB7XG4gICAgdGhpcy5fZHNFZmZlY3QgPSBmbnMuZWZmZWN0XG4gICAgdGhpcy5fZHNTaWduYWwgPSBmbnMuc2lnbmFsXG4gICAgY29uc29sZS5sb2coJ1tMRVNdIERhdGFzdGFyIGJyaWRnZSBjb25uZWN0ZWQnLCB0aGlzLmlkKVxuICB9XG5cbiAgZGlzY29ubmVjdERhdGFzdGFyKCk6IHZvaWQge1xuICAgIHRoaXMuX2RzRWZmZWN0ID0gdW5kZWZpbmVkXG4gICAgdGhpcy5fZHNTaWduYWwgPSB1bmRlZmluZWRcbiAgfVxuXG4gIGdldCBkc0VmZmVjdCgpIHsgcmV0dXJuIHRoaXMuX2RzRWZmZWN0IH1cbiAgZ2V0IGRzU2lnbmFsKCkgIHsgcmV0dXJuIHRoaXMuX2RzU2lnbmFsIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgUHVibGljIEFQSSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKiogRmlyZSBhIG5hbWVkIGxvY2FsIGV2ZW50IGludG8gdGhpcyBMRVMgaW5zdGFuY2UgZnJvbSBvdXRzaWRlLiAqL1xuICBmaXJlKGV2ZW50OiBzdHJpbmcsIHBheWxvYWQ6IHVua25vd25bXSA9IFtdKTogdm9pZCB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudChldmVudCwge1xuICAgICAgZGV0YWlsOiB7IHBheWxvYWQgfSwgYnViYmxlczogZmFsc2UsIGNvbXBvc2VkOiBmYWxzZSxcbiAgICB9KSlcbiAgfVxuXG4gIC8qKiBDYWxsIGEgY29tbWFuZCBieSBuYW1lIGZyb20gb3V0c2lkZSAoZS5nLiBicm93c2VyIGNvbnNvbGUsIHRlc3RzKS4gKi9cbiAgYXN5bmMgY2FsbChjb21tYW5kOiBzdHJpbmcsIGFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge30pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuX2N0eCkgeyBjb25zb2xlLndhcm4oJ1tMRVNdIG5vdCBpbml0aWFsaXplZCB5ZXQnKTsgcmV0dXJuIH1cbiAgICBjb25zdCB7IHJ1bkNvbW1hbmQgfSA9IGF3YWl0IGltcG9ydCgnQHJ1bnRpbWUvZXhlY3V0b3IuanMnKVxuICAgIGF3YWl0IHJ1bkNvbW1hbmQoY29tbWFuZCwgYXJncywgdGhpcy5fY3R4KVxuICB9XG5cbiAgLyoqIFJlYWQgYSBzaWduYWwgdmFsdWUgZGlyZWN0bHkgKGZvciBkZWJ1Z2dpbmcpLiAqL1xuICBzaWduYWwobmFtZTogc3RyaW5nKTogdW5rbm93biB7XG4gICAgcmV0dXJuIHRoaXMuX2dldFNpZ25hbChuYW1lKVxuICB9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnbG9jYWwtZXZlbnQtc2NyaXB0JywgTG9jYWxFdmVudFNjcmlwdClcbiIsICIvKipcbiAqIDxsb2NhbC1jb21tYW5kPiBcdTIwMTQgZGVmaW5lcyBhIG5hbWVkLCBjYWxsYWJsZSBjb21tYW5kIHdpdGhpbiBhIDxsb2NhbC1ldmVudC1zY3JpcHQ+LlxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIG5hbWUgICAgUmVxdWlyZWQuIENvbW1hbmQgbmFtZSwgY29sb24tbmFtZXNwYWNlZDogXCJmZWVkOmZldGNoXCJcbiAqICAgYXJncyAgICBPcHRpb25hbC4gVHlwZWQgYXJndW1lbnQgbGlzdDogXCJbZnJvbTpzdHIgIHRvOnN0cl1cIlxuICogICBndWFyZCAgIE9wdGlvbmFsLiBKUyBleHByZXNzaW9uIFx1MjAxNCBmYWxzeSA9IHNpbGVudCBuby1vcCwgbm8gcmVzY3VlL2FmdGVyd2FyZHNcbiAqICAgZG8gICAgICBSZXF1aXJlZC4gTEVTIGJvZHkgKGJhY2t0aWNrLXF1b3RlZCBmb3IgbXVsdGktbGluZSlcbiAqXG4gKiBUaGlzIGVsZW1lbnQgaXMgcHVyZWx5IGRlY2xhcmF0aXZlIFx1MjAxNCBpdCBob2xkcyBkYXRhLlxuICogVGhlIGhvc3QgPGxvY2FsLWV2ZW50LXNjcmlwdD4gcmVhZHMgaXQgZHVyaW5nIFBoYXNlIDEgYW5kIHJlZ2lzdGVyc1xuICogdGhlIHBhcnNlZCBDb21tYW5kRGVmIGluIGl0cyBDb21tYW5kUmVnaXN0cnkuXG4gKlxuICogTm90ZTogPGNvbW1hbmQ+IHdhcyBhIGRlcHJlY2F0ZWQgSFRNTDUgZWxlbWVudCBcdTIwMTQgd2UgdXNlIDxsb2NhbC1jb21tYW5kPlxuICogdG8gc2F0aXNmeSB0aGUgY3VzdG9tIGVsZW1lbnQgaHlwaGVuIHJlcXVpcmVtZW50IGFuZCBhdm9pZCB0aGUgY29sbGlzaW9uLlxuICovXG5leHBvcnQgY2xhc3MgTG9jYWxDb21tYW5kIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgQXR0cmlidXRlIGFjY2Vzc29ycyAodHlwZWQsIHRyaW1tZWQpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIGdldCBjb21tYW5kTmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIC8qKiBSYXcgYXJncyBzdHJpbmcgZS5nLiBcIltmcm9tOnN0ciAgdG86c3RyXVwiIFx1MjAxNCBwYXJzZWQgYnkgUGhhc2UgMiAqL1xuICBnZXQgYXJnc1JhdygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnYXJncycpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIC8qKiBHdWFyZCBleHByZXNzaW9uIHN0cmluZyBcdTIwMTQgZXZhbHVhdGVkIGJ5IHJ1bnRpbWUgYmVmb3JlIGV4ZWN1dGlvbiAqL1xuICBnZXQgZ3VhcmRFeHByKCk6IHN0cmluZyB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnZ3VhcmQnKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIC8qKiBSYXcgTEVTIGJvZHkgXHUyMDE0IG1heSBiZSBiYWNrdGljay13cmFwcGVkIGZvciBtdWx0aS1saW5lICovXG4gIGdldCBkb0JvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ2RvJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgLy8gUGhhc2UgMDogdmVyaWZ5IGVsZW1lbnQgaXMgcmVjb2duaXplZC5cbiAgICBjb25zb2xlLmxvZygnW0xFU10gPGxvY2FsLWNvbW1hbmQ+IHJlZ2lzdGVyZWQ6JywgdGhpcy5jb21tYW5kTmFtZSB8fCAnKHVubmFtZWQpJylcbiAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ2xvY2FsLWNvbW1hbmQnLCBMb2NhbENvbW1hbmQpXG4iLCAiLyoqXG4gKiA8b24tZXZlbnQ+IFx1MjAxNCBzdWJzY3JpYmVzIHRvIGEgbmFtZWQgQ3VzdG9tRXZlbnQgZGlzcGF0Y2hlZCB3aXRoaW4gdGhlIExFUyBob3N0LlxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIG5hbWUgICAgUmVxdWlyZWQuIEV2ZW50IG5hbWU6IFwiZmVlZDppbml0XCIsIFwiaXRlbTpkaXNtaXNzZWRcIlxuICogICBoYW5kbGUgIFJlcXVpcmVkLiBMRVMgYm9keSBcdTIwMTQgc2luZ2xlLWxpbmUgKG5vIGJhY2t0aWNrcykgb3IgbXVsdGktbGluZSAoYmFja3RpY2tzKVxuICpcbiAqIFBoYXNlIDQgd2lyZXMgYSBDdXN0b21FdmVudCBsaXN0ZW5lciBvbiB0aGUgaG9zdCBlbGVtZW50LlxuICogRXZlbnRzIGZpcmVkIGJ5IGBlbWl0YCBuZXZlciBidWJibGU7IG9ubHkgaGFuZGxlcnMgd2l0aGluIHRoZSBzYW1lXG4gKiA8bG9jYWwtZXZlbnQtc2NyaXB0PiBzZWUgdGhlbS4gVXNlIGBicm9hZGNhc3RgIHRvIGNyb3NzIHRoZSBib3VuZGFyeS5cbiAqL1xuZXhwb3J0IGNsYXNzIE9uRXZlbnQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIGdldCBldmVudE5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICAvKiogUmF3IExFUyBoYW5kbGUgYm9keSAqL1xuICBnZXQgaGFuZGxlQm9keSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnaGFuZGxlJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxvbi1ldmVudD4gcmVnaXN0ZXJlZDonLCB0aGlzLmV2ZW50TmFtZSB8fCAnKHVubmFtZWQpJylcbiAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ29uLWV2ZW50JywgT25FdmVudClcbiIsICIvKipcbiAqIDxvbi1zaWduYWw+IFx1MjAxNCByZWFjdHMgd2hlbmV2ZXIgYSBuYW1lZCBEYXRhc3RhciBzaWduYWwgY2hhbmdlcyB2YWx1ZS5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBuYW1lICAgIFJlcXVpcmVkLiBTaWduYWwgcmVmZXJlbmNlOiBcIiRmZWVkU3RhdGVcIiwgXCIkZmVlZEl0ZW1zXCJcbiAqICAgd2hlbiAgICBPcHRpb25hbC4gR3VhcmQgZXhwcmVzc2lvbiBcdTIwMTQgb25seSBmaXJlcyBoYW5kbGUgd2hlbiB0cnV0aHlcbiAqICAgaGFuZGxlICBSZXF1aXJlZC4gTEVTIGJvZHlcbiAqXG4gKiBQaGFzZSA2IHdpcmVzIHRoaXMgdG8gRGF0YXN0YXIncyBlZmZlY3QoKSBzeXN0ZW0uXG4gKiBVbnRpbCBEYXRhc3RhciBpcyBjb25uZWN0ZWQsIGZhbGxzIGJhY2sgdG8gcG9sbGluZyAoUGhhc2UgNiBkZWNpZGVzKS5cbiAqXG4gKiBUaGUgYHdoZW5gIGd1YXJkIGlzIHJlLWV2YWx1YXRlZCBvbiBldmVyeSBzaWduYWwgY2hhbmdlLlxuICogR3VhcmQgZmFpbHVyZSBpcyBub3QgYW4gZXJyb3IgXHUyMDE0IHRoZSBoYW5kbGUgc2ltcGx5IGRvZXMgbm90IHJ1bi5cbiAqL1xuZXhwb3J0IGNsYXNzIE9uU2lnbmFsIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAvKiogU2lnbmFsIG5hbWUgaW5jbHVkaW5nICQgcHJlZml4OiBcIiRmZWVkU3RhdGVcIiAqL1xuICBnZXQgc2lnbmFsTmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIC8qKiBTaWduYWwgbmFtZSB3aXRob3V0ICQgcHJlZml4LCBmb3IgRGF0YXN0YXIgQVBJIGNhbGxzICovXG4gIGdldCBzaWduYWxLZXkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5zaWduYWxOYW1lLnJlcGxhY2UoL15cXCQvLCAnJylcbiAgfVxuXG4gIGdldCB3aGVuRXhwcigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3doZW4nKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIGdldCBoYW5kbGVCb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdoYW5kbGUnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPG9uLXNpZ25hbD4gcmVnaXN0ZXJlZDonLCB0aGlzLnNpZ25hbE5hbWUgfHwgJyh1bm5hbWVkKScpXG4gIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1zaWduYWwnLCBPblNpZ25hbClcbiIsICIvKipcbiAqIDxvbi1sb2FkPiBcdTIwMTQgZmlyZXMgaXRzIGBydW5gIGJvZHkgb25jZSB3aGVuIHRoZSBob3N0IGNvbm5lY3RzIHRvIHRoZSBET00uXG4gKlxuICogVGltaW5nOiBpZiBkb2N1bWVudC5yZWFkeVN0YXRlID09PSAnY29tcGxldGUnLCBmaXJlcyBpbW1lZGlhdGVseSBpblxuICogY29ubmVjdGVkQ2FsbGJhY2sgKHZpYSBxdWV1ZU1pY3JvdGFzaykuIE90aGVyd2lzZSB3YWl0cyBmb3IgRE9NQ29udGVudExvYWRlZC5cbiAqXG4gKiBSdWxlOiBsaWZlY3ljbGUgaG9va3MgYWx3YXlzIGZpcmUgZXZlbnRzIChgZW1pdGApLCBuZXZlciBjYWxsIGNvbW1hbmRzIGRpcmVjdGx5LlxuICogVGhpcyBrZWVwcyB0aGUgc3lzdGVtIHRyYWNlYWJsZSBcdTIwMTQgZXZlcnkgY29tbWFuZCBpbnZvY2F0aW9uIGhhcyBhbiBldmVudCBpbiBpdHMgaGlzdG9yeS5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBydW4gICBSZXF1aXJlZC4gU2luZ2xlLWxpbmUgTEVTIGJvZHkgKHVzdWFsbHkganVzdCBgZW1pdCBldmVudDpuYW1lYClcbiAqL1xuZXhwb3J0IGNsYXNzIE9uTG9hZCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgZ2V0IHJ1bkJvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8b24tbG9hZD4gcmVnaXN0ZXJlZCwgcnVuOicsIHRoaXMucnVuQm9keSlcbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiA8b24tZW50ZXI+IFx1MjAxNCBmaXJlcyB3aGVuIHRoZSBob3N0IDxsb2NhbC1ldmVudC1zY3JpcHQ+IGVudGVycyB0aGUgdmlld3BvcnQuXG4gKlxuICogVXNlcyBhIHNpbmdsZSBJbnRlcnNlY3Rpb25PYnNlcnZlciBzaGFyZWQgYWNyb3NzIGFsbCA8b24tZW50ZXI+Lzxvbi1leGl0PlxuICogY2hpbGRyZW4gb2YgdGhlIHNhbWUgaG9zdCAoUGhhc2UgNSBjcmVhdGVzIGl0IG9uIHRoZSBob3N0IGVsZW1lbnQpLlxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIHdoZW4gIE9wdGlvbmFsLiBHdWFyZCBleHByZXNzaW9uIFx1MjAxNCBvbmx5IGZpcmVzIHJ1biB3aGVuIHRydXRoeS5cbiAqICAgICAgICAgIFBhdHRlcm46IGB3aGVuPVwiJGZlZWRTdGF0ZSA9PSAncGF1c2VkJ1wiYFxuICogICBydW4gICBSZXF1aXJlZC4gU2luZ2xlLWxpbmUgTEVTIGJvZHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBPbkVudGVyIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBnZXQgd2hlbkV4cHIoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCd3aGVuJyk/LnRyaW0oKSA/PyBudWxsXG4gIH1cblxuICBnZXQgcnVuQm9keSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxvbi1lbnRlcj4gcmVnaXN0ZXJlZCwgd2hlbjonLCB0aGlzLndoZW5FeHByID8/ICdhbHdheXMnKVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIDxvbi1leGl0PiBcdTIwMTQgZmlyZXMgd2hlbiB0aGUgaG9zdCA8bG9jYWwtZXZlbnQtc2NyaXB0PiBleGl0cyB0aGUgdmlld3BvcnQuXG4gKlxuICogTm8gYHdoZW5gIGd1YXJkIFx1MjAxNCBleGl0IGFsd2F5cyBmaXJlcyB1bmNvbmRpdGlvbmFsbHkuXG4gKiAoSWYgeW91IG5lZWQgY29uZGl0aW9uYWwgZXhpdCBiZWhhdmlvciwgcHV0IHRoZSBjb25kaXRpb24gaW4gdGhlIGhhbmRsZXIuKVxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIHJ1biAgIFJlcXVpcmVkLiBTaW5nbGUtbGluZSBMRVMgYm9keS5cbiAqL1xuZXhwb3J0IGNsYXNzIE9uRXhpdCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgZ2V0IHJ1bkJvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8b24tZXhpdD4gcmVnaXN0ZXJlZCwgcnVuOicsIHRoaXMucnVuQm9keSlcbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgUmVnaXN0cmF0aW9uIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ29uLWxvYWQnLCAgT25Mb2FkKVxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1lbnRlcicsIE9uRW50ZXIpXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ29uLWV4aXQnLCAgT25FeGl0KVxuIiwgIi8qKlxuICogPHVzZS1tb2R1bGU+IFx1MjAxNCBkZWNsYXJlcyBhIHZvY2FidWxhcnkgZXh0ZW5zaW9uIGF2YWlsYWJsZSB0byA8bG9jYWwtY29tbWFuZD4gYm9kaWVzLlxuICpcbiAqIE11c3QgYXBwZWFyIGJlZm9yZSBhbnkgPGxvY2FsLWNvbW1hbmQ+IGluIHRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0Pi5cbiAqIFRoZSBob3N0IHJlYWRzIDx1c2UtbW9kdWxlPiBjaGlsZHJlbiBmaXJzdCAoUGhhc2UgOCkgYW5kIHJlZ2lzdGVyc1xuICogdGhlaXIgcHJpbWl0aXZlcyBpbnRvIGl0cyBNb2R1bGVSZWdpc3RyeSBiZWZvcmUgcGFyc2luZyBjb21tYW5kIGJvZGllcy5cbiAqXG4gKiBBdHRyaWJ1dGVzIChpbmRlcGVuZGVudCwgY29tYmluYWJsZSk6XG4gKiAgIHR5cGUgICBCdWlsdC1pbiBtb2R1bGUgbmFtZTogXCJhbmltYXRpb25cIlxuICogICBzcmMgICAgVVJML3BhdGggdG8gYSB1c2VybGFuZCBtb2R1bGUgRVMgbW9kdWxlOiAgXCIuL3Njcm9sbC1lZmZlY3RzLmpzXCJcbiAqICAgICAgICAgIFRoZSBtb2R1bGUgbXVzdCBleHBvcnQgYSBkZWZhdWx0IGNvbmZvcm1pbmcgdG8gTEVTTW9kdWxlOlxuICogICAgICAgICAgeyBuYW1lOiBzdHJpbmcsIHByaW1pdGl2ZXM6IFJlY29yZDxzdHJpbmcsIExFU1ByaW1pdGl2ZT4gfVxuICpcbiAqIEV4YW1wbGVzOlxuICogICA8dXNlLW1vZHVsZSB0eXBlPVwiYW5pbWF0aW9uXCI+PC91c2UtbW9kdWxlPlxuICogICA8dXNlLW1vZHVsZSBzcmM9XCIuL3Njcm9sbC1lZmZlY3RzLmpzXCI+PC91c2UtbW9kdWxlPlxuICogICA8dXNlLW1vZHVsZSBzcmM9XCIuL3NwcmluZy1waHlzaWNzLmpzXCI+PC91c2UtbW9kdWxlPlxuICpcbiAqIHR5cGU9IGFuZCBzcmM9IG1heSBhcHBlYXIgdG9nZXRoZXIgb24gb25lIGVsZW1lbnQgaWYgdGhlIHVzZXJsYW5kIG1vZHVsZVxuICogd2FudHMgdG8gZGVjbGFyZSBpdHMgdHlwZSBoaW50IGZvciB0b29saW5nIChub3QgY3VycmVudGx5IHJlcXVpcmVkKS5cbiAqL1xuZXhwb3J0IGNsYXNzIFVzZU1vZHVsZSBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgLyoqIEJ1aWx0LWluIG1vZHVsZSB0eXBlIGUuZy4gXCJhbmltYXRpb25cIiAqL1xuICBnZXQgbW9kdWxlVHlwZSgpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3R5cGUnKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIC8qKiBVc2VybGFuZCBtb2R1bGUgVVJMIGUuZy4gXCIuL3Njcm9sbC1lZmZlY3RzLmpzXCIgKi9cbiAgZ2V0IG1vZHVsZVNyYygpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3NyYycpPy50cmltKCkgPz8gbnVsbFxuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc3QgZGVzYyA9IHRoaXMubW9kdWxlVHlwZVxuICAgICAgPyBgdHlwZT1cIiR7dGhpcy5tb2R1bGVUeXBlfVwiYFxuICAgICAgOiB0aGlzLm1vZHVsZVNyY1xuICAgICAgICA/IGBzcmM9XCIke3RoaXMubW9kdWxlU3JjfVwiYFxuICAgICAgICA6ICcobm8gdHlwZSBvciBzcmMpJ1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8dXNlLW1vZHVsZT4gZGVjbGFyZWQ6JywgZGVzYylcbiAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3VzZS1tb2R1bGUnLCBVc2VNb2R1bGUpXG4iLCAiLyoqXG4gKiBQaGFzZSA2OiBEYXRhc3RhciBhdHRyaWJ1dGUgcGx1Z2luXG4gKlxuICogUmVnaXN0ZXJzIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGFzIGEgRGF0YXN0YXIgYXR0cmlidXRlIHBsdWdpbiBzbyB0aGF0OlxuICpcbiAqICAgMS4gRGF0YXN0YXIncyBlZmZlY3QoKSBhbmQgc2lnbmFsKCkgcHJpbWl0aXZlcyBhcmUgaGFuZGVkIHRvIHRoZSBob3N0XG4gKiAgICAgIGVsZW1lbnQsIGVuYWJsaW5nIHByb3BlciByZWFjdGl2ZSBzaWduYWwgd2F0Y2hpbmcgdmlhIHRoZSBkZXBlbmRlbmN5XG4gKiAgICAgIGdyYXBoIHJhdGhlciB0aGFuIG1hbnVhbCBub3RpZmljYXRpb24uXG4gKlxuICogICAyLiBTaWduYWwgd3JpdGVzIGZyb20gYHNldCAkeCB0byB5YCBpbiBMRVMgcHJvcGFnYXRlIGludG8gRGF0YXN0YXInc1xuICogICAgICByb290IG9iamVjdCBzbyBkYXRhLXRleHQsIGRhdGEtc2hvdywgZXRjLiB1cGRhdGUgcmVhY3RpdmVseS5cbiAqXG4gKiAgIDMuICQtcHJlZml4ZWQgc2lnbmFscyBpbiBMRVMgZXhwcmVzc2lvbnMgcmVzb2x2ZSBmcm9tIERhdGFzdGFyJ3Mgcm9vdCxcbiAqICAgICAgZ2l2aW5nIExFUyBmdWxsIHJlYWQgYWNjZXNzIHRvIGFsbCBEYXRhc3RhciBzdGF0ZS5cbiAqXG4gKiAgIDQuIFNpZ25hbCB3YXRjaGVycyBvbi1zaWduYWwgYXJlIHJlLXdpcmVkIHRocm91Z2ggRGF0YXN0YXIncyBlZmZlY3QoKVxuICogICAgICBzeXN0ZW0gZm9yIHByb3BlciBiYXRjaGluZyBhbmQgZGVkdXBsaWNhdGlvbi5cbiAqXG4gKiBMRVMgd29ya3Mgd2l0aG91dCBEYXRhc3RhciAoc3RhbmRhbG9uZSBtb2RlKS4gVGhlIGJyaWRnZSBpcyBwdXJlbHkgYWRkaXRpdmUuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBMb2NhbEV2ZW50U2NyaXB0IH0gZnJvbSAnQGVsZW1lbnRzL0xvY2FsRXZlbnRTY3JpcHQuanMnXG5pbXBvcnQgeyB3aXJlU2lnbmFsV2F0Y2hlclZpYURhdGFzdGFyIH0gZnJvbSAnQHJ1bnRpbWUvc2lnbmFscy5qcydcblxubGV0IGJyaWRnZVJlZ2lzdGVyZWQgPSBmYWxzZVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVnaXN0ZXJEYXRhc3RhckJyaWRnZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKGJyaWRnZVJlZ2lzdGVyZWQpIHJldHVyblxuXG4gIHRyeSB7XG4gICAgY29uc3QgZGF0YXN0YXIgPSBhd2FpdCBpbXBvcnQoJ2RhdGFzdGFyJylcbiAgICBjb25zdCB7IGF0dHJpYnV0ZSB9ID0gZGF0YXN0YXJcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBSZWdpc3RlciBhcyBhIERhdGFzdGFyIGF0dHJpYnV0ZSBwbHVnaW4gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgLy8gTWF0Y2hlcyBlbGVtZW50cyB3aXRoIGEgYGRhdGEtbG9jYWwtZXZlbnQtc2NyaXB0YCBhdHRyaWJ1dGUgT1IgKHZpYVxuICAgIC8vIG5hbWUgbWF0Y2hpbmcpIHRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBjdXN0b20gZWxlbWVudCBpdHNlbGYgd2hlblxuICAgIC8vIERhdGFzdGFyIHNjYW5zIHRoZSBET00uXG4gICAgLy9cbiAgICAvLyBUaGUgbmFtZSAnbG9jYWwtZXZlbnQtc2NyaXB0JyBjYXVzZXMgRGF0YXN0YXIgdG8gYXBwbHkgdGhpcyBwbHVnaW5cbiAgICAvLyB0byBhbnkgZWxlbWVudCB3aXRoIGRhdGEtbG9jYWwtZXZlbnQtc2NyaXB0PVwiLi4uXCIgaW4gdGhlIERPTS5cbiAgICAvLyBXZSBhbHNvIHBhdGNoIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGRpcmVjdGx5IGluIHRoZSBNdXRhdGlvbk9ic2VydmVyXG4gICAgLy8gcGF0aCB2aWEgdGhlIGhvc3QgZWxlbWVudCdzIGNvbm5lY3RlZENhbGxiYWNrLlxuICAgIGF0dHJpYnV0ZSh7XG4gICAgICBuYW1lOiAnbG9jYWwtZXZlbnQtc2NyaXB0JyxcbiAgICAgIHJlcXVpcmVtZW50OiB7XG4gICAgICAgIGtleTogJ2RlbmllZCcsXG4gICAgICAgIHZhbHVlOiAnZGVuaWVkJyxcbiAgICAgIH0sXG4gICAgICBhcHBseSh7IGVsLCBlZmZlY3QsIHNpZ25hbCB9KSB7XG4gICAgICAgIGNvbnN0IGhvc3QgPSBlbCBhcyBMb2NhbEV2ZW50U2NyaXB0XG5cbiAgICAgICAgLy8gUGhhc2UgNmE6IGhhbmQgRGF0YXN0YXIncyByZWFjdGl2ZSBwcmltaXRpdmVzIHRvIHRoZSBob3N0XG4gICAgICAgIGhvc3QuY29ubmVjdERhdGFzdGFyKHsgZWZmZWN0LCBzaWduYWwgfSlcblxuICAgICAgICAvLyBQaGFzZSA2YjogaWYgdGhlIGhvc3QgaXMgYWxyZWFkeSBpbml0aWFsaXplZCAod2lyaW5nIHJhbiBiZWZvcmVcbiAgICAgICAgLy8gRGF0YXN0YXIgYXR0cmlidXRlIHBsdWdpbiBmaXJlZCksIHJlLXdpcmUgc2lnbmFsIHdhdGNoZXJzIHRocm91Z2hcbiAgICAgICAgLy8gRGF0YXN0YXIncyBlZmZlY3QoKSBmb3IgcHJvcGVyIHJlYWN0aXZpdHlcbiAgICAgICAgY29uc3Qgd2lyaW5nID0gaG9zdC53aXJpbmdcbiAgICAgICAgaWYgKHdpcmluZyAmJiB3aXJpbmcud2F0Y2hlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGZvciAoY29uc3Qgd2F0Y2hlciBvZiB3aXJpbmcud2F0Y2hlcnMpIHtcbiAgICAgICAgICAgIHdpcmVTaWduYWxXYXRjaGVyVmlhRGF0YXN0YXIod2F0Y2hlciwgZWZmZWN0LCAoKSA9PiBob3N0LmNvbnRleHQhKVxuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zb2xlLmxvZyhgW0xFUzpkYXRhc3Rhcl0gcmUtd2lyZWQgJHt3aXJpbmcud2F0Y2hlcnMubGVuZ3RofSBzaWduYWwgd2F0Y2hlcnMgdmlhIERhdGFzdGFyIGVmZmVjdCgpYClcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCdbTEVTOmRhdGFzdGFyXSBhdHRyaWJ1dGUgcGx1Z2luIGFwcGxpZWQgdG8nLCBlbC5pZCB8fCBlbC50YWdOYW1lKVxuXG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgaG9zdC5kaXNjb25uZWN0RGF0YXN0YXIoKVxuICAgICAgICAgIGNvbnNvbGUubG9nKCdbTEVTOmRhdGFzdGFyXSBhdHRyaWJ1dGUgcGx1Z2luIGNsZWFuZWQgdXAnLCBlbC5pZCB8fCBlbC50YWdOYW1lKVxuICAgICAgICB9XG4gICAgICB9LFxuICAgIH0pXG5cbiAgICBicmlkZ2VSZWdpc3RlcmVkID0gdHJ1ZVxuICAgIGNvbnNvbGUubG9nKCdbTEVTOmRhdGFzdGFyXSBicmlkZ2UgcmVnaXN0ZXJlZCcpXG5cbiAgfSBjYXRjaCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIHJ1bm5pbmcgaW4gc3RhbmRhbG9uZSBtb2RlIChEYXRhc3RhciBub3QgYXZhaWxhYmxlKScpXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBTaWduYWwgaW50ZWdyYXRpb24gdXRpbGl0aWVzXG4vLyBVc2VkIGJ5IGV4ZWN1dG9yLnRzIHdoZW4gRGF0YXN0YXIgaXMgcHJlc2VudFxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogUmVhZHMgYSBzaWduYWwgdmFsdWUgZnJvbSBEYXRhc3RhcidzIHJvb3Qgb2JqZWN0LlxuICogRmFsbHMgYmFjayB0byB1bmRlZmluZWQgaWYgRGF0YXN0YXIgaXMgbm90IGF2YWlsYWJsZS5cbiAqXG4gKiBUaGlzIGlzIGNhbGxlZCBieSB0aGUgTEVTQ29udGV4dC5nZXRTaWduYWwgZnVuY3Rpb24gd2hlbiB0aGUgRGF0YXN0YXJcbiAqIGJyaWRnZSBpcyBjb25uZWN0ZWQsIGdpdmluZyBMRVMgZXhwcmVzc2lvbnMgYWNjZXNzIHRvIGFsbCBEYXRhc3RhciBzaWduYWxzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZERhdGFzdGFyU2lnbmFsKFxuICBuYW1lOiBzdHJpbmcsXG4gIGRzU2lnbmFsOiAoPFQ+KG5hbWU6IHN0cmluZywgaW5pdD86IFQpID0+IHsgdmFsdWU6IFQgfSkgfCB1bmRlZmluZWRcbik6IHVua25vd24ge1xuICBpZiAoIWRzU2lnbmFsKSByZXR1cm4gdW5kZWZpbmVkXG4gIHRyeSB7XG4gICAgcmV0dXJuIGRzU2lnbmFsKG5hbWUpLnZhbHVlXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxufVxuXG4vKipcbiAqIFdyaXRlcyBhIHZhbHVlIHRvIERhdGFzdGFyJ3Mgc2lnbmFsIHRyZWUuXG4gKiBUaGlzIHRyaWdnZXJzIERhdGFzdGFyJ3MgcmVhY3RpdmUgZ3JhcGggXHUyMDE0IGFueSBkYXRhLXRleHQsIGRhdGEtc2hvdyxcbiAqIGRhdGEtY2xhc3MgYXR0cmlidXRlcyBib3VuZCB0byB0aGlzIHNpZ25hbCB3aWxsIHVwZGF0ZSBhdXRvbWF0aWNhbGx5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVEYXRhc3RhclNpZ25hbChcbiAgbmFtZTogc3RyaW5nLFxuICB2YWx1ZTogdW5rbm93bixcbiAgZHNTaWduYWw6ICg8VD4obmFtZTogc3RyaW5nLCBpbml0PzogVCkgPT4geyB2YWx1ZTogVCB9KSB8IHVuZGVmaW5lZFxuKTogdm9pZCB7XG4gIGlmICghZHNTaWduYWwpIHJldHVyblxuICB0cnkge1xuICAgIGNvbnN0IHNpZyA9IGRzU2lnbmFsPHVua25vd24+KG5hbWUsIHZhbHVlKVxuICAgIHNpZy52YWx1ZSA9IHZhbHVlXG4gIH0gY2F0Y2gge1xuICAgIC8vIFNpZ25hbCBtYXkgbm90IGV4aXN0IHlldCBcdTIwMTQgaXQgd2lsbCBiZSBjcmVhdGVkIGJ5IGRhdGEtc2lnbmFscyBvbiB0aGUgaG9zdFxuICB9XG59XG4iLCAiLyoqXG4gKiBsb2NhbC1ldmVudC1zY3JpcHQgXHUyMDE0IG1haW4gZW50cnkgcG9pbnRcbiAqXG4gKiBJbXBvcnQgb3JkZXIgbWF0dGVycyBmb3IgY3VzdG9tIGVsZW1lbnQgcmVnaXN0cmF0aW9uOlxuICogICAxLiBIb3N0IGVsZW1lbnQgZmlyc3QgKExvY2FsRXZlbnRTY3JpcHQpXG4gKiAgIDIuIENoaWxkIGVsZW1lbnRzIHRoYXQgcmVmZXJlbmNlIGl0XG4gKiAgIDMuIERhdGFzdGFyIGJyaWRnZSBsYXN0IChvcHRpb25hbCBcdTIwMTQgZmFpbHMgZ3JhY2VmdWxseSBpZiBEYXRhc3RhciBhYnNlbnQpXG4gKlxuICogVXNhZ2UgdmlhIGltcG9ydG1hcCArIHNjcmlwdCB0YWc6XG4gKlxuICogICA8c2NyaXB0IHR5cGU9XCJpbXBvcnRtYXBcIj5cbiAqICAgICB7XG4gKiAgICAgICBcImltcG9ydHNcIjoge1xuICogICAgICAgICBcImRhdGFzdGFyXCI6IFwiaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L2doL3N0YXJmZWRlcmF0aW9uL2RhdGFzdGFyQHYxLjAuMC1SQy44L2J1bmRsZXMvZGF0YXN0YXIuanNcIlxuICogICAgICAgfVxuICogICAgIH1cbiAqICAgPC9zY3JpcHQ+XG4gKiAgIDxzY3JpcHQgdHlwZT1cIm1vZHVsZVwiIHNyYz1cIi9kaXN0L2xvY2FsLWV2ZW50LXNjcmlwdC5qc1wiPjwvc2NyaXB0PlxuICpcbiAqIFdpdGhvdXQgdGhlIGltcG9ydG1hcCAob3Igd2l0aCBkYXRhc3RhciBhYnNlbnQpLCBMRVMgcnVucyBpbiBzdGFuZGFsb25lIG1vZGU6XG4gKiBhbGwgY3VzdG9tIGVsZW1lbnRzIHdvcmssIERhdGFzdGFyIHNpZ25hbCB3YXRjaGluZyBhbmQgQGFjdGlvbiBwYXNzdGhyb3VnaFxuICogYXJlIHVuYXZhaWxhYmxlLlxuICovXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBDdXN0b20gZWxlbWVudHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBFYWNoIGltcG9ydCByZWdpc3RlcnMgaXRzIGVsZW1lbnQocykgYXMgYSBzaWRlIGVmZmVjdC5cblxuZXhwb3J0IHsgTG9jYWxFdmVudFNjcmlwdCB9IGZyb20gJ0BlbGVtZW50cy9Mb2NhbEV2ZW50U2NyaXB0LmpzJ1xuZXhwb3J0IHsgTG9jYWxDb21tYW5kIH0gICAgIGZyb20gJ0BlbGVtZW50cy9Mb2NhbENvbW1hbmQuanMnXG5leHBvcnQgeyBPbkV2ZW50IH0gICAgICAgICAgZnJvbSAnQGVsZW1lbnRzL09uRXZlbnQuanMnXG5leHBvcnQgeyBPblNpZ25hbCB9ICAgICAgICAgZnJvbSAnQGVsZW1lbnRzL09uU2lnbmFsLmpzJ1xuZXhwb3J0IHsgT25Mb2FkLCBPbkVudGVyLCBPbkV4aXQgfSBmcm9tICdAZWxlbWVudHMvTGlmZWN5Y2xlLmpzJ1xuZXhwb3J0IHsgVXNlTW9kdWxlIH0gICAgICAgIGZyb20gJ0BlbGVtZW50cy9Vc2VNb2R1bGUuanMnXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBUeXBlIGV4cG9ydHMgKGZvciBUeXBlU2NyaXB0IGNvbnN1bWVycykgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5leHBvcnQgdHlwZSB7IExFU05vZGUgfSAgICAgICAgICAgICAgICAgICBmcm9tICdAcGFyc2VyL2FzdC5qcydcbmV4cG9ydCB0eXBlIHsgTEVTTW9kdWxlLCBMRVNQcmltaXRpdmUgfSAgIGZyb20gJ0Btb2R1bGVzL3R5cGVzLmpzJ1xuZXhwb3J0IHR5cGUgeyBDb21tYW5kRGVmLCBBcmdEZWYgfSAgICAgICAgZnJvbSAnQHJ1bnRpbWUvcmVnaXN0cnkuanMnXG5leHBvcnQgeyBMRVNTY29wZSB9ICAgICAgICAgICAgICAgICAgICAgICBmcm9tICdAcnVudGltZS9zY29wZS5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIERhdGFzdGFyIGJyaWRnZSAob3B0aW9uYWwpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gRHluYW1pYyBpbXBvcnQgc28gdGhlIGJ1bmRsZSB3b3JrcyB3aXRob3V0IERhdGFzdGFyIHByZXNlbnQuXG5pbXBvcnQgeyByZWdpc3RlckRhdGFzdGFyQnJpZGdlIH0gZnJvbSAnQGRhdGFzdGFyL3BsdWdpbi5qcydcbnJlZ2lzdGVyRGF0YXN0YXJCcmlkZ2UoKVxuZXhwb3J0IHR5cGUgeyBMRVNDb25maWcsIENvbW1hbmREZWNsLCBFdmVudEhhbmRsZXJEZWNsLCBTaWduYWxXYXRjaGVyRGVjbCxcbiAgICAgICAgICAgICAgT25Mb2FkRGVjbCwgT25FbnRlckRlY2wsIE9uRXhpdERlY2wsIE1vZHVsZURlY2wgfSBmcm9tICdAcGFyc2VyL2NvbmZpZy5qcydcbmV4cG9ydCB7IHJlYWRDb25maWcsIGxvZ0NvbmZpZyB9IGZyb20gJ0BwYXJzZXIvcmVhZGVyLmpzJ1xuZXhwb3J0IHsgc3RyaXBCb2R5IH0gICAgICAgICAgICAgZnJvbSAnQHBhcnNlci9zdHJpcEJvZHkuanMnXG5leHBvcnQgeyBwYXJzZUxFUywgTEVTUGFyc2VyLCBMRVNQYXJzZUVycm9yIH0gZnJvbSAnQHBhcnNlci9pbmRleC5qcydcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUF1QkEsU0FBUyxTQUFTLFVBQWtCLE1BQTBCO0FBQzVELE1BQUk7QUFDRixVQUFNLE9BQU8sS0FBSyxZQUFZO0FBQzlCLFVBQU0sUUFBUSxnQkFBZ0IsV0FBVyxPQUFPLEtBQUssaUJBQWlCO0FBQ3RFLFdBQU8sTUFBTSxLQUFLLE1BQU0saUJBQWlCLFFBQVEsQ0FBQztBQUFBLEVBQ3BELFFBQVE7QUFDTixZQUFRLEtBQUssc0NBQXNDLFFBQVEsR0FBRztBQUM5RCxXQUFPLENBQUM7QUFBQSxFQUNWO0FBQ0Y7QUFRQSxTQUFTLGlCQUFpQixJQUFtQjtBQUMzQyxhQUFXLFFBQVMsR0FBbUIsY0FBYyxHQUFHO0FBQ3RELFNBQUssT0FBTztBQUFBLEVBQ2Q7QUFDRjtBQUdBLGVBQWUsV0FDYixLQUNBLFdBQ0EsU0FDZTtBQUNmLE1BQUksSUFBSSxXQUFXLEVBQUc7QUFFdEIsTUFBSSxRQUFRLGdCQUFnQjtBQUM1QixRQUFNLFFBQVE7QUFBQSxJQUNaLElBQUk7QUFBQSxNQUFJLFFBQU8sR0FBbUIsUUFBUSxXQUFXLE9BQU8sRUFBRSxTQUMzRCxNQUFNLENBQUMsUUFBaUI7QUFHdkIsWUFBSSxlQUFlLGdCQUFnQixJQUFJLFNBQVMsYUFBYztBQUM5RCxjQUFNO0FBQUEsTUFDUixDQUFDO0FBQUEsSUFDSDtBQUFBLEVBQ0Y7QUFDRjtBQVFBLFNBQVMsZUFBZSxLQUFnQixVQUErQjtBQUNyRSxRQUFNLFdBQVc7QUFDakIsUUFBTSxlQUEwQztBQUFBLElBQzlDLE1BQU8sZUFBZSxRQUFRO0FBQUEsSUFDOUIsT0FBTyxjQUFjLFFBQVE7QUFBQSxJQUM3QixJQUFPLGVBQWUsUUFBUTtBQUFBLElBQzlCLE1BQU8sY0FBYyxRQUFRO0FBQUEsRUFDL0I7QUFDQSxRQUFNLFlBQVksYUFBYSxHQUFHO0FBQ2xDLE1BQUksVUFBVTtBQUNaLFdBQU87QUFBQSxNQUNMLEVBQUUsU0FBUyxHQUFHLFdBQVcsVUFBVTtBQUFBLE1BQ25DLEVBQUUsU0FBUyxHQUFHLFdBQVcsT0FBTztBQUFBLElBQ2xDO0FBQUEsRUFDRixPQUFPO0FBQ0wsV0FBTztBQUFBLE1BQ0wsRUFBRSxTQUFTLEdBQUcsV0FBVyxPQUFPO0FBQUEsTUFDaEMsRUFBRSxTQUFTLEdBQUcsV0FBVyxVQUFVO0FBQUEsSUFDckM7QUFBQSxFQUNGO0FBQ0Y7QUFrSUEsU0FBUyxRQUFRLEtBQWtDLFVBQTBCO0FBQzNFLE1BQUksUUFBUSxVQUFhLFFBQVEsS0FBTSxRQUFPO0FBQzlDLE1BQUksT0FBTyxRQUFRLFNBQVUsUUFBTztBQUNwQyxRQUFNLElBQUksT0FBTyxHQUFHLEVBQUUsTUFBTSxxQkFBcUI7QUFDakQsTUFBSSxFQUFHLFFBQU8sV0FBVyxFQUFFLENBQUMsQ0FBRTtBQUM5QixRQUFNLElBQUksV0FBVyxPQUFPLEdBQUcsQ0FBQztBQUNoQyxTQUFPLE9BQU8sTUFBTSxDQUFDLElBQUksV0FBVztBQUN0QztBQXRPQSxJQW1HTSxRQVFBLFNBUUEsU0FNQSxVQU1BLFNBS0EsV0FTQSxPQXFCQSxjQTZCQSxhQTZDQSxpQkFlQztBQTNQUDtBQUFBO0FBQUE7QUFtR0EsSUFBTSxTQUF1QixPQUFPLFVBQVUsVUFBVSxRQUFRLE9BQU8sU0FBUztBQUM5RSxZQUFNLE1BQU0sU0FBUyxVQUFVLElBQUk7QUFDbkMsWUFBTTtBQUFBLFFBQVc7QUFBQSxRQUNmLENBQUMsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxDQUFDO0FBQUEsUUFDL0IsRUFBRSxVQUFVLFFBQVEsTUFBTSxXQUFXO0FBQUEsTUFDdkM7QUFBQSxJQUNGO0FBRUEsSUFBTSxVQUF3QixPQUFPLFVBQVUsVUFBVSxRQUFRLE9BQU8sU0FBUztBQUMvRSxZQUFNLE1BQU0sU0FBUyxVQUFVLElBQUk7QUFDbkMsWUFBTTtBQUFBLFFBQVc7QUFBQSxRQUNmLENBQUMsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxDQUFDO0FBQUEsUUFDL0IsRUFBRSxVQUFVLFFBQVEsTUFBTSxXQUFXO0FBQUEsTUFDdkM7QUFBQSxJQUNGO0FBRUEsSUFBTSxVQUF3QixPQUFPLFVBQVUsVUFBVSxRQUFRLE1BQU0sU0FBUztBQUM5RSxZQUFNLE9BQVEsS0FBSyxNQUFNLEtBQStCO0FBQ3hELFlBQU0sTUFBTSxTQUFTLFVBQVUsSUFBSTtBQUNuQyxZQUFNLFdBQVcsS0FBSyxlQUFlLE1BQU0sSUFBSSxHQUFHLEVBQUUsVUFBVSxRQUFRLE1BQU0sV0FBVyxDQUFDO0FBQUEsSUFDMUY7QUFFQSxJQUFNLFdBQXlCLE9BQU8sVUFBVSxVQUFVLFFBQVEsTUFBTSxTQUFTO0FBQy9FLFlBQU0sS0FBTSxLQUFLLElBQUksS0FBK0I7QUFDcEQsWUFBTSxNQUFNLFNBQVMsVUFBVSxJQUFJO0FBQ25DLFlBQU0sV0FBVyxLQUFLLGVBQWUsSUFBSSxLQUFLLEdBQUcsRUFBRSxVQUFVLFFBQVEsTUFBTSxXQUFXLENBQUM7QUFBQSxJQUN6RjtBQUVBLElBQU0sVUFBd0IsT0FBTyxVQUFVLFVBQVUsUUFBUSxPQUFPLFNBQVM7QUFDL0UsWUFBTSxNQUFNLFNBQVMsVUFBVSxJQUFJO0FBQ25DLFlBQU0sV0FBVyxLQUFLLGVBQWUsTUFBTSxJQUFJLEdBQUcsRUFBRSxVQUFVLFFBQVEsTUFBTSxXQUFXLENBQUM7QUFBQSxJQUMxRjtBQUVBLElBQU0sWUFBMEIsT0FBTyxVQUFVLFVBQVUsUUFBUSxPQUFPLFNBQVM7QUFDakYsWUFBTSxNQUFNLFNBQVMsVUFBVSxJQUFJO0FBQ25DLFlBQU0sV0FBVyxLQUFLLGVBQWUsUUFBUSxLQUFLLEdBQUcsRUFBRSxVQUFVLFFBQVEsTUFBTSxXQUFXLENBQUM7QUFBQSxJQUM3RjtBQU1BLElBQU0sUUFBc0IsT0FBTyxVQUFVLFVBQVUsUUFBUSxPQUFPLFNBQVM7QUFDN0UsWUFBTSxNQUFNLFNBQVMsVUFBVSxJQUFJO0FBQ25DLFlBQU0sV0FBVyxLQUFLO0FBQUEsUUFDcEIsRUFBRSxTQUFTLEdBQU0sV0FBVyxXQUFXO0FBQUEsUUFDdkMsRUFBRSxTQUFTLE1BQU0sV0FBVyxlQUFlLFFBQVEsSUFBSTtBQUFBLFFBQ3ZELEVBQUUsU0FBUyxHQUFNLFdBQVcsV0FBVztBQUFBLE1BQ3pDLEdBQUcsRUFBRSxVQUFVLFFBQVEsTUFBTSxPQUFPLENBQUM7QUFBQSxJQUN2QztBQWNBLElBQU0sZUFBNkIsT0FBTyxVQUFVLFVBQVUsUUFBUSxNQUFNLFNBQVM7QUFDbkYsWUFBTSxNQUFNLFNBQVMsVUFBVSxJQUFJO0FBQ25DLFVBQUksSUFBSSxXQUFXLEVBQUc7QUFFdEIsWUFBTSxNQUFPLFFBQVEsS0FBSyxLQUFLLEdBQWtDLEVBQUU7QUFDbkUsWUFBTSxPQUFRLEtBQUssTUFBTSxLQUErQjtBQUV4RCxVQUFJLFFBQVEsZ0JBQWdCO0FBQzVCLFlBQU0sUUFBUTtBQUFBLFFBQ1osSUFBSTtBQUFBLFVBQUksQ0FBQyxJQUFJLE1BQ1YsR0FBbUI7QUFBQSxZQUNsQixlQUFlLE1BQU0sSUFBSTtBQUFBLFlBQ3pCLEVBQUUsVUFBVSxRQUFRLE1BQU0sWUFBWSxPQUFPLElBQUksSUFBSTtBQUFBLFVBQ3ZELEVBQUUsU0FBUyxNQUFNLENBQUMsUUFBaUI7QUFDakMsZ0JBQUksZUFBZSxnQkFBZ0IsSUFBSSxTQUFTLGFBQWM7QUFDOUQsa0JBQU07QUFBQSxVQUNSLENBQUM7QUFBQSxRQUNIO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFVQSxJQUFNLGNBQTRCLE9BQU8sVUFBVSxVQUFVLFFBQVEsTUFBTSxTQUFTO0FBRWxGLFVBQUksTUFBTSxTQUFTLFVBQVUsSUFBSSxFQUFFLE9BQU8sUUFBTTtBQUM5QyxjQUFNLFFBQVEsT0FBTyxpQkFBaUIsRUFBaUI7QUFDdkQsZUFBTyxNQUFNLFlBQVksVUFBVSxNQUFNLGVBQWU7QUFBQSxNQUMxRCxDQUFDO0FBQ0QsVUFBSSxJQUFJLFdBQVcsRUFBRztBQUV0QixZQUFNLE1BQVUsUUFBUSxLQUFLLEtBQUssR0FBa0MsRUFBRTtBQUN0RSxZQUFNLFVBQVUsT0FBTyxLQUFLLFdBQVcsS0FBSyxFQUFFLE1BQU07QUFDcEQsWUFBTSxLQUFXLEtBQUssSUFBSSxLQUErQjtBQUV6RCxVQUFJLFFBQVMsT0FBTSxDQUFDLEdBQUcsR0FBRyxFQUFFLFFBQVE7QUFFcEMsVUFBSSxRQUFRLGdCQUFnQjtBQUM1QixZQUFNLFFBQVE7QUFBQSxRQUNaLElBQUk7QUFBQSxVQUFJLENBQUMsSUFBSSxNQUNWLEdBQW1CO0FBQUEsWUFDbEIsZUFBZSxJQUFJLEtBQUs7QUFBQSxZQUN4QixFQUFFLFVBQVUsUUFBUSxNQUFNLFlBQVksT0FBTyxJQUFJLElBQUk7QUFBQSxVQUN2RCxFQUFFLFNBQVMsTUFBTSxDQUFDLFFBQWlCO0FBQ2pDLGdCQUFJLGVBQWUsZ0JBQWdCLElBQUksU0FBUyxhQUFjO0FBQzlELGtCQUFNO0FBQUEsVUFDUixDQUFDO0FBQUEsUUFDSDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBbUJBLElBQU0sa0JBQTZCO0FBQUEsTUFDakMsTUFBTTtBQUFBLE1BQ04sWUFBWTtBQUFBLFFBQ1YsV0FBaUI7QUFBQSxRQUNqQixZQUFpQjtBQUFBLFFBQ2pCLFlBQWlCO0FBQUEsUUFDakIsYUFBaUI7QUFBQSxRQUNqQixZQUFpQjtBQUFBLFFBQ2pCLGNBQWlCO0FBQUEsUUFDakIsU0FBaUI7QUFBQSxRQUNqQixpQkFBaUI7QUFBQSxRQUNqQixnQkFBaUI7QUFBQSxNQUNuQjtBQUFBLElBQ0Y7QUFFQSxJQUFPLG9CQUFRO0FBQUE7QUFBQTs7O0FDM1BmO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQTZDQSxlQUFzQixRQUFRLE1BQWUsS0FBZ0M7QUFDM0UsVUFBUSxLQUFLLE1BQU07QUFBQTtBQUFBLElBR2pCLEtBQUs7QUFDSCxpQkFBVyxRQUFTLEtBQXNCLE9BQU87QUFDL0MsY0FBTSxRQUFRLE1BQU0sR0FBRztBQUFBLE1BQ3pCO0FBQ0E7QUFBQTtBQUFBLElBR0YsS0FBSztBQUNILFlBQU0sUUFBUSxJQUFLLEtBQXNCLFNBQVMsSUFBSSxPQUFLLFFBQVEsR0FBRyxHQUFHLENBQUMsQ0FBQztBQUMzRTtBQUFBO0FBQUEsSUFHRixLQUFLLE9BQU87QUFDVixZQUFNLElBQUk7QUFDVixZQUFNLFFBQVEsU0FBUyxFQUFFLE9BQU8sR0FBRztBQUNuQyxVQUFJLFVBQVUsRUFBRSxRQUFRLEtBQUs7QUFDN0I7QUFBQSxJQUNGO0FBQUE7QUFBQSxJQUdBLEtBQUssUUFBUTtBQUNYLFlBQU0sSUFBSTtBQUNWLFlBQU0sVUFBVSxFQUFFLFFBQVEsSUFBSSxPQUFLLFNBQVMsR0FBRyxHQUFHLENBQUM7QUFDbkQsVUFBSSxVQUFVLEVBQUUsT0FBTyxPQUFPO0FBQzlCO0FBQUEsSUFDRjtBQUFBO0FBQUEsSUFHQSxLQUFLLGFBQWE7QUFDaEIsWUFBTSxJQUFJO0FBQ1YsWUFBTSxVQUFVLEVBQUUsUUFBUSxJQUFJLE9BQUssU0FBUyxHQUFHLEdBQUcsQ0FBQztBQUNuRCxVQUFJLFVBQVUsRUFBRSxPQUFPLE9BQU87QUFDOUI7QUFBQSxJQUNGO0FBQUE7QUFBQSxJQUdBLEtBQUssUUFBUTtBQUNYLFlBQU0sSUFBSTtBQUNWLFlBQU0sSUFBSSxRQUFjLGFBQVcsV0FBVyxTQUFTLEVBQUUsRUFBRSxDQUFDO0FBQzVEO0FBQUEsSUFDRjtBQUFBO0FBQUEsSUFHQSxLQUFLLFFBQVE7QUFDWCxZQUFNLElBQUk7QUFDVixZQUFNLE1BQU0sSUFBSSxTQUFTLElBQUksRUFBRSxPQUFPO0FBQ3RDLFVBQUksQ0FBQyxLQUFLO0FBQ1IsZ0JBQVEsS0FBSywyQkFBMkIsRUFBRSxPQUFPLEdBQUc7QUFDcEQ7QUFBQSxNQUNGO0FBR0EsVUFBSSxJQUFJLE9BQU87QUFDYixjQUFNLFNBQVMsVUFBVSxJQUFJLE9BQU8sR0FBRztBQUN2QyxZQUFJLENBQUMsUUFBUTtBQUNYLGtCQUFRLE1BQU0sa0JBQWtCLEVBQUUsT0FBTyxrQkFBa0I7QUFDM0Q7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUdBLFlBQU0sYUFBYSxJQUFJLE1BQU0sTUFBTTtBQUNuQyxZQUFNLGFBQXNDLENBQUM7QUFDN0MsaUJBQVcsQ0FBQyxLQUFLLFFBQVEsS0FBSyxPQUFPLFFBQVEsRUFBRSxJQUFJLEdBQUc7QUFDcEQsbUJBQVcsR0FBRyxJQUFJLFNBQVMsVUFBVSxHQUFHO0FBQUEsTUFDMUM7QUFHQSxpQkFBVyxVQUFVLElBQUksTUFBTTtBQUM3QixZQUFJLEVBQUUsT0FBTyxRQUFRLGVBQWUsT0FBTyxTQUFTO0FBQ2xELHFCQUFXLE9BQU8sSUFBSSxJQUFJLFNBQVMsT0FBTyxTQUFTLEdBQUc7QUFBQSxRQUN4RDtBQUNBLG1CQUFXLElBQUksT0FBTyxNQUFNLFdBQVcsT0FBTyxJQUFJLEtBQUssSUFBSTtBQUFBLE1BQzdEO0FBRUEsWUFBTSxXQUF1QixFQUFFLEdBQUcsS0FBSyxPQUFPLFdBQVc7QUFDekQsWUFBTSxRQUFRLElBQUksTUFBTSxRQUFRO0FBQ2hDO0FBQUEsSUFDRjtBQUFBO0FBQUEsSUFHQSxLQUFLLFFBQVE7QUFDWCxZQUFNLElBQUk7QUFDVixZQUFNLEVBQUUsTUFBTSxLQUFLLEtBQUssSUFBSSxFQUFFO0FBQzlCLFlBQU0sYUFBc0MsQ0FBQztBQUM3QyxpQkFBVyxDQUFDLEtBQUssUUFBUSxLQUFLLE9BQU8sUUFBUSxJQUFJLEdBQUc7QUFDbEQsbUJBQVcsR0FBRyxJQUFJLFNBQVMsVUFBVSxHQUFHO0FBQUEsTUFDMUM7QUFFQSxVQUFJO0FBQ0osVUFBSTtBQUNGLGlCQUFTLE1BQU0sY0FBYyxNQUFNLEtBQUssWUFBWSxHQUFHO0FBQUEsTUFDekQsU0FBUyxLQUFLO0FBRVosY0FBTTtBQUFBLE1BQ1I7QUFFQSxVQUFJLE1BQU0sSUFBSSxFQUFFLE1BQU0sTUFBTTtBQUM1QjtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBR0EsS0FBSyxTQUFTO0FBQ1osWUFBTSxJQUFJO0FBQ1YsWUFBTSxVQUFVLFNBQVMsRUFBRSxTQUFTLEdBQUc7QUFFdkMsaUJBQVcsT0FBTyxFQUFFLE1BQU07QUFDeEIsY0FBTSxXQUFXLGNBQWMsSUFBSSxVQUFVLE9BQU87QUFDcEQsWUFBSSxhQUFhLE1BQU07QUFFckIsZ0JBQU0sV0FBVyxJQUFJLE1BQU0sTUFBTTtBQUNqQyxxQkFBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLE9BQU8sUUFBUSxRQUFRLEdBQUc7QUFDN0MscUJBQVMsSUFBSSxHQUFHLENBQUM7QUFBQSxVQUNuQjtBQUNBLGdCQUFNLFNBQXFCLEVBQUUsR0FBRyxLQUFLLE9BQU8sU0FBUztBQUNyRCxnQkFBTSxRQUFRLElBQUksTUFBTSxNQUFNO0FBQzlCO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFFQSxjQUFRLEtBQUssd0NBQXdDLE9BQU87QUFDNUQ7QUFBQSxJQUNGO0FBQUE7QUFBQSxJQUdBLEtBQUssT0FBTztBQUNWLFlBQU0sSUFBSTtBQUNWLFVBQUksUUFBUTtBQUVaLFVBQUk7QUFDRixjQUFNLFFBQVEsRUFBRSxNQUFNLEdBQUc7QUFBQSxNQUMzQixTQUFTLEtBQUs7QUFDWixnQkFBUTtBQUNSLFlBQUksRUFBRSxRQUFRO0FBRVosZ0JBQU0sY0FBYyxJQUFJLE1BQU0sTUFBTTtBQUNwQyxzQkFBWSxJQUFJLFNBQVMsR0FBRztBQUM1QixnQkFBTSxZQUF3QixFQUFFLEdBQUcsS0FBSyxPQUFPLFlBQVk7QUFDM0QsZ0JBQU0sUUFBUSxFQUFFLFFBQVEsU0FBUztBQUFBLFFBQ25DLE9BQU87QUFFTCxnQkFBTTtBQUFBLFFBQ1I7QUFBQSxNQUNGLFVBQUU7QUFDQSxZQUFJLEVBQUUsWUFBWTtBQUdoQixnQkFBTSxRQUFRLEVBQUUsWUFBWSxHQUFHO0FBQUEsUUFDakM7QUFBQSxNQUNGO0FBRUEsVUFBSSxTQUFTLENBQUMsRUFBRSxRQUFRO0FBQUEsTUFFeEI7QUFDQTtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBR0EsS0FBSyxhQUFhO0FBQ2hCLFlBQU0sSUFBSTtBQUNWLFlBQU0sWUFBWSxJQUFJLFFBQVEsSUFBSSxFQUFFLFNBQVM7QUFFN0MsVUFBSSxDQUFDLFdBQVc7QUFDZCxnQkFBUSxLQUFLLElBQUksUUFBUSxRQUFRLEVBQUUsU0FBUyxDQUFDO0FBQzdDO0FBQUEsTUFDRjtBQUdBLFlBQU0sV0FBVyxnQkFBZ0IsRUFBRSxVQUFVLEdBQUc7QUFHaEQsWUFBTSxVQUFtQyxDQUFDO0FBQzFDLGlCQUFXLENBQUMsS0FBSyxRQUFRLEtBQUssT0FBTyxRQUFRLEVBQUUsT0FBTyxHQUFHO0FBQ3ZELGdCQUFRLEdBQUcsSUFBSSxTQUFTLFVBQVUsR0FBRztBQUFBLE1BQ3ZDO0FBS0EsWUFBTSxVQUFVLFVBQVUsRUFBRSxVQUFVLEVBQUUsUUFBUSxTQUFTLElBQUksSUFBSTtBQUNqRTtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBR0EsS0FBSyxRQUFRO0FBQ1gsWUFBTSxJQUFJO0FBQ1YsVUFBSSxFQUFFLElBQUksS0FBSyxHQUFHO0FBR2hCLGlCQUFTLEdBQUcsR0FBRztBQUFBLE1BQ2pCO0FBQ0E7QUFBQSxJQUNGO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFRQSxLQUFLLFVBQVU7QUFDYixZQUFNLElBQUk7QUFDVixZQUFNLGFBQXNDLENBQUM7QUFDN0MsaUJBQVcsQ0FBQyxLQUFLLFFBQVEsS0FBSyxPQUFPLFFBQVEsRUFBRSxJQUFJLEdBQUc7QUFDcEQsbUJBQVcsR0FBRyxJQUFJLFNBQVMsVUFBVSxHQUFHO0FBQUEsTUFDMUM7QUFDQSxZQUFNLGNBQWMsRUFBRSxNQUFNLEVBQUUsS0FBSyxZQUFZLEdBQUc7QUFDbEQ7QUFBQSxJQUNGO0FBQUEsSUFFQSxTQUFTO0FBQ1AsWUFBTSxhQUFvQjtBQUMxQixjQUFRLEtBQUssNEJBQTZCLFdBQXVCLElBQUk7QUFBQSxJQUN2RTtBQUFBLEVBQ0Y7QUFDRjtBQWdCTyxTQUFTLFNBQVMsTUFBZ0IsS0FBMEI7QUFDakUsTUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLEVBQUcsUUFBTztBQUc3QixNQUFJLEtBQUssSUFBSSxXQUFXLEdBQUcsS0FBSyxLQUFLLElBQUksU0FBUyxHQUFHLEdBQUc7QUFDdEQsV0FBTyxLQUFLLElBQUksTUFBTSxHQUFHLEVBQUU7QUFBQSxFQUM3QjtBQUVBLFFBQU0sTUFBTSxPQUFPLEtBQUssR0FBRztBQUMzQixNQUFJLENBQUMsT0FBTyxNQUFNLEdBQUcsS0FBSyxLQUFLLElBQUksS0FBSyxNQUFNLEdBQUksUUFBTztBQUV6RCxNQUFJLEtBQUssUUFBUSxPQUFTLFFBQU87QUFDakMsTUFBSSxLQUFLLFFBQVEsUUFBUyxRQUFPO0FBQ2pDLE1BQUksS0FBSyxRQUFRLFVBQVUsS0FBSyxRQUFRLE1BQU8sUUFBTztBQUt0RCxNQUFJLGtCQUFrQixLQUFLLEtBQUssR0FBRyxFQUFHLFFBQU8sS0FBSztBQUNsRCxNQUFJLDJCQUEyQixLQUFLLEtBQUssR0FBRyxFQUFHLFFBQU8sS0FBSztBQUMzRCxNQUFJLGlDQUFpQyxLQUFLLEtBQUssR0FBRyxFQUFHLFFBQU8sS0FBSztBQUVqRSxNQUFJO0FBSUYsVUFBTSxnQkFBZ0IsSUFBSSxNQUFNLFNBQVM7QUFHekMsVUFBTSxjQUFjLENBQUMsR0FBRyxLQUFLLElBQUksU0FBUyxtQkFBbUIsQ0FBQyxFQUMzRCxJQUFJLE9BQUssRUFBRSxDQUFDLENBQUU7QUFFakIsVUFBTSxVQUFtQyxDQUFDO0FBQzFDLGVBQVcsUUFBUSxhQUFhO0FBQzlCLGNBQVEsSUFBSSxJQUFJLElBQUksVUFBVSxJQUFJO0FBQUEsSUFDcEM7QUFJQSxRQUFJLFlBQVksS0FBSztBQUNyQixlQUFXLFFBQVEsYUFBYTtBQUM5QixrQkFBWSxVQUFVLFdBQVcsSUFBSSxJQUFJLElBQUksU0FBUyxJQUFJLEVBQUU7QUFBQSxJQUM5RDtBQUdBLFVBQU0sY0FBdUMsQ0FBQztBQUM5QyxlQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssT0FBTyxRQUFRLE9BQU8sR0FBRztBQUM1QyxrQkFBWSxTQUFTLENBQUMsRUFBRSxJQUFJO0FBQUEsSUFDOUI7QUFHQSxVQUFNLEtBQUssSUFBSTtBQUFBLE1BQ2IsR0FBRyxPQUFPLEtBQUssYUFBYTtBQUFBLE1BQzVCLEdBQUcsT0FBTyxLQUFLLFdBQVc7QUFBQSxNQUMxQixXQUFXLFNBQVM7QUFBQSxJQUN0QjtBQUNBLFdBQU87QUFBQSxNQUNMLEdBQUcsT0FBTyxPQUFPLGFBQWE7QUFBQSxNQUM5QixHQUFHLE9BQU8sT0FBTyxXQUFXO0FBQUEsSUFDOUI7QUFBQSxFQUNGLFNBQVMsS0FBSztBQUNaLFlBQVEsS0FBSyxnQ0FBZ0MsS0FBSyxVQUFVLEtBQUssR0FBRyxDQUFDLElBQUksR0FBRztBQUM1RSxXQUFPO0FBQUEsRUFDVDtBQUNGO0FBTUEsU0FBUyxVQUFVLFdBQW1CLEtBQTBCO0FBQzlELFFBQU0sU0FBUyxTQUFTLEVBQUUsTUFBTSxRQUFRLEtBQUssVUFBVSxHQUFHLEdBQUc7QUFDN0QsU0FBTyxRQUFRLE1BQU07QUFDdkI7QUFlQSxTQUFTLGNBQ1AsVUFDQSxTQUNnQztBQUVoQyxNQUFJLFNBQVMsV0FBVyxHQUFHO0FBQ3pCLFdBQU8sWUFBWSxTQUFTLENBQUMsR0FBSSxPQUFPO0FBQUEsRUFDMUM7QUFHQSxNQUFJLENBQUMsTUFBTSxRQUFRLE9BQU8sR0FBRztBQUczQixXQUFPLFdBQVcsVUFBVSxPQUFPO0FBQUEsRUFDckM7QUFFQSxTQUFPLFdBQVcsVUFBVSxPQUFPO0FBQ3JDO0FBRUEsU0FBUyxXQUNQLFVBQ0EsU0FDZ0M7QUFHaEMsUUFBTSxXQUFvQyxDQUFDO0FBRTNDLFdBQVMsSUFBSSxHQUFHLElBQUksU0FBUyxRQUFRLEtBQUs7QUFDeEMsVUFBTSxNQUFNLFNBQVMsQ0FBQztBQUt0QixVQUFNLFFBQVEsTUFBTSxRQUFRLE9BQU8sSUFDL0IsUUFBUSxDQUFDLElBQ1QsTUFBTSxJQUFJLFVBQVU7QUFFeEIsVUFBTSxTQUFTLFlBQVksS0FBSyxLQUFLO0FBQ3JDLFFBQUksV0FBVyxLQUFNLFFBQU87QUFDNUIsV0FBTyxPQUFPLFVBQVUsTUFBTTtBQUFBLEVBQ2hDO0FBRUEsU0FBTztBQUNUO0FBRUEsU0FBUyxZQUNQLFNBQ0EsT0FDZ0M7QUFDaEMsVUFBUSxRQUFRLE1BQU07QUFBQSxJQUNwQixLQUFLO0FBQ0gsYUFBTyxDQUFDO0FBQUE7QUFBQSxJQUVWLEtBQUs7QUFDSCxhQUFPLFVBQVUsUUFBUSxRQUFRLENBQUMsSUFBSTtBQUFBLElBRXhDLEtBQUs7QUFDSCxhQUFPLEVBQUUsQ0FBQyxRQUFRLElBQUksR0FBRyxNQUFNO0FBQUE7QUFBQSxJQUVqQyxLQUFLLE1BQU07QUFDVCxpQkFBVyxPQUFPLFFBQVEsVUFBVTtBQUNsQyxjQUFNLFNBQVMsWUFBWSxLQUFLLEtBQUs7QUFDckMsWUFBSSxXQUFXLEtBQU0sUUFBTztBQUFBLE1BQzlCO0FBQ0EsYUFBTztBQUFBLElBQ1Q7QUFBQSxFQUNGO0FBQ0Y7QUFvQkEsZUFBZSxjQUNiLE1BQ0EsS0FDQSxNQUNBLEtBQ2tCO0FBQ2xCLFFBQU0sU0FBUyxLQUFLLFlBQVk7QUFFaEMsTUFBSSxVQUFVO0FBQ2QsTUFBSTtBQUVKLE1BQUksV0FBVyxTQUFTLFdBQVcsVUFBVTtBQUMzQyxVQUFNLFNBQVMsSUFBSSxnQkFBZ0I7QUFDbkMsZUFBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLE9BQU8sUUFBUSxJQUFJLEdBQUc7QUFDekMsYUFBTyxJQUFJLEdBQUcsT0FBTyxDQUFDLENBQUM7QUFBQSxJQUN6QjtBQUNBLFVBQU0sS0FBSyxPQUFPLFNBQVM7QUFDM0IsUUFBSSxHQUFJLFdBQVUsR0FBRyxHQUFHLElBQUksRUFBRTtBQUFBLEVBQ2hDLE9BQU87QUFDTCxXQUFPLEtBQUssVUFBVSxJQUFJO0FBQUEsRUFDNUI7QUFFQSxRQUFNLFdBQVcsTUFBTSxNQUFNLFNBQVM7QUFBQSxJQUNwQztBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsZ0JBQWdCO0FBQUEsTUFDaEIsVUFBVTtBQUFBLElBQ1o7QUFBQSxJQUNBLEdBQUksT0FBTyxFQUFFLEtBQUssSUFBSSxDQUFDO0FBQUEsRUFDekIsQ0FBQztBQUVELE1BQUksQ0FBQyxTQUFTLElBQUk7QUFDaEIsVUFBTSxJQUFJLE1BQU0sY0FBYyxTQUFTLE1BQU0sU0FBUyxNQUFNLElBQUksR0FBRyxFQUFFO0FBQUEsRUFDdkU7QUFFQSxRQUFNLGNBQWMsU0FBUyxRQUFRLElBQUksY0FBYyxLQUFLO0FBTzVELE1BQUksWUFBWSxTQUFTLG1CQUFtQixHQUFHO0FBQzdDLFVBQU0saUJBQWlCLFVBQVUsR0FBRztBQUNwQyxXQUFPO0FBQUEsRUFDVDtBQUVBLE1BQUksWUFBWSxTQUFTLGtCQUFrQixHQUFHO0FBQzVDLFdBQU8sTUFBTSxTQUFTLEtBQUs7QUFBQSxFQUM3QjtBQUNBLFNBQU8sTUFBTSxTQUFTLEtBQUs7QUFDN0I7QUFjQSxlQUFlLGlCQUNiLFVBQ0EsS0FDZTtBQUNmLE1BQUksQ0FBQyxTQUFTLEtBQU07QUFFcEIsUUFBTSxTQUFVLFNBQVMsS0FBSyxVQUFVO0FBQ3hDLFFBQU0sVUFBVSxJQUFJLFlBQVk7QUFDaEMsTUFBSSxTQUFZO0FBR2hCLE1BQUksWUFBWTtBQUNoQixNQUFJLFlBQXNCLENBQUM7QUFFM0IsUUFBTSxhQUFhLE1BQU07QUFDdkIsUUFBSSxDQUFDLGFBQWEsVUFBVSxXQUFXLEVBQUc7QUFFMUMsUUFBSSxjQUFjLDJCQUEyQjtBQUMzQyx5QkFBbUIsV0FBVyxHQUFHO0FBQUEsSUFDbkMsV0FBVyxjQUFjLDBCQUEwQjtBQUNqRCx3QkFBa0IsV0FBVyxHQUFHO0FBQUEsSUFDbEM7QUFHQSxnQkFBWTtBQUNaLGdCQUFZLENBQUM7QUFBQSxFQUNmO0FBRUEsU0FBTyxNQUFNO0FBQ1gsVUFBTSxFQUFFLE1BQU0sTUFBTSxJQUFJLE1BQU0sT0FBTyxLQUFLO0FBQzFDLFFBQUksTUFBTTtBQUFFLGlCQUFXO0FBQUc7QUFBQSxJQUFNO0FBRWhDLGNBQVUsUUFBUSxPQUFPLE9BQU8sRUFBRSxRQUFRLEtBQUssQ0FBQztBQUdoRCxVQUFNLFFBQVEsT0FBTyxNQUFNLElBQUk7QUFDL0IsYUFBUyxNQUFNLElBQUksS0FBSztBQUV4QixlQUFXLFFBQVEsT0FBTztBQUN4QixVQUFJLEtBQUssV0FBVyxRQUFRLEdBQUc7QUFDN0Isb0JBQVksS0FBSyxNQUFNLFNBQVMsTUFBTSxFQUFFLEtBQUs7QUFBQSxNQUMvQyxXQUFXLEtBQUssV0FBVyxPQUFPLEdBQUc7QUFDbkMsa0JBQVUsS0FBSyxLQUFLLE1BQU0sUUFBUSxNQUFNLEVBQUUsVUFBVSxDQUFDO0FBQUEsTUFDdkQsV0FBVyxTQUFTLElBQUk7QUFFdEIsbUJBQVc7QUFBQSxNQUNiO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRjtBQUlBLFNBQVMsbUJBQW1CLFdBQXFCLEtBQXVCO0FBRXRFLE1BQUksV0FBYztBQUNsQixNQUFJLE9BQWM7QUFDbEIsUUFBTSxZQUFzQixDQUFDO0FBRTdCLGFBQVcsUUFBUSxXQUFXO0FBQzVCLFFBQUksS0FBSyxXQUFXLFdBQVcsR0FBSTtBQUFFLGlCQUFXLEtBQUssTUFBTSxZQUFZLE1BQU0sRUFBRSxLQUFLO0FBQUc7QUFBQSxJQUFTO0FBQ2hHLFFBQUksS0FBSyxXQUFXLE9BQU8sR0FBUTtBQUFFLGFBQVcsS0FBSyxNQUFNLFFBQVEsTUFBTSxFQUFFLEtBQUs7QUFBTztBQUFBLElBQVM7QUFDaEcsUUFBSSxLQUFLLFdBQVcsV0FBVyxHQUFJO0FBQUUsZ0JBQVUsS0FBSyxLQUFLLE1BQU0sWUFBWSxNQUFNLENBQUM7QUFBSztBQUFBLElBQVM7QUFFaEcsY0FBVSxLQUFLLElBQUk7QUFBQSxFQUNyQjtBQUVBLFFBQU0sT0FBTyxVQUFVLEtBQUssSUFBSSxFQUFFLEtBQUs7QUFFdkMsUUFBTSxTQUFTLFdBQ1gsU0FBUyxjQUFjLFFBQVEsSUFDL0I7QUFFSixVQUFRLElBQUksaUNBQWlDLElBQUksY0FBYyxRQUFRLGNBQWMsS0FBSyxNQUFNLEVBQUU7QUFFbEcsTUFBSSxTQUFTLFVBQVU7QUFFckIsVUFBTSxXQUFXLFdBQ2IsTUFBTSxLQUFLLFNBQVMsaUJBQWlCLFFBQVEsQ0FBQyxJQUM5QyxDQUFDO0FBQ0wsYUFBUyxRQUFRLFFBQU0sR0FBRyxPQUFPLENBQUM7QUFDbEM7QUFBQSxFQUNGO0FBRUEsTUFBSSxTQUFTLFlBQVksUUFBUTtBQUMvQixVQUFNLE9BQU8sVUFBVSxJQUFJO0FBQzNCLFdBQU8sT0FBTyxJQUFJO0FBQ2xCO0FBQUEsRUFDRjtBQUVBLE1BQUksU0FBUyxhQUFhLFFBQVE7QUFDaEMsVUFBTSxPQUFPLFVBQVUsSUFBSTtBQUMzQixXQUFPLFFBQVEsSUFBSTtBQUNuQjtBQUFBLEVBQ0Y7QUFFQSxNQUFJLFNBQVMsV0FBVyxRQUFRO0FBQzlCLFdBQU8sWUFBWTtBQUNuQjtBQUFBLEVBQ0Y7QUFFQSxNQUFJLFNBQVMsV0FBVyxRQUFRO0FBQzlCLFVBQU0sT0FBTyxVQUFVLElBQUk7QUFDM0IsV0FBTyxZQUFZLElBQUk7QUFDdkI7QUFBQSxFQUNGO0FBRUEsTUFBSSxTQUFTLFlBQVksUUFBUTtBQUMvQixVQUFNLE9BQU8sVUFBVSxJQUFJO0FBQzNCLFdBQU8sT0FBTyxJQUFJO0FBQ2xCO0FBQUEsRUFDRjtBQUVBLE1BQUksU0FBUyxXQUFXLFFBQVE7QUFDOUIsVUFBTSxPQUFPLFVBQVUsSUFBSTtBQUMzQixXQUFPLE1BQU0sSUFBSTtBQUNqQjtBQUFBLEVBQ0Y7QUFHQSxNQUFJLENBQUMsWUFBWSxNQUFNO0FBQ3JCLFVBQU0sT0FBTyxVQUFVLElBQUk7QUFDM0IsZUFBVyxNQUFNLE1BQU0sS0FBSyxLQUFLLFFBQVEsR0FBRztBQUMxQyxZQUFNLEtBQUssR0FBRztBQUNkLFVBQUksSUFBSTtBQUNOLGNBQU0sV0FBVyxTQUFTLGVBQWUsRUFBRTtBQUMzQyxZQUFJLFNBQVUsVUFBUyxZQUFZLEVBQUU7QUFBQSxZQUNoQyxVQUFTLEtBQUssT0FBTyxFQUFFO0FBQUEsTUFDOUI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGO0FBRUEsU0FBUyxVQUFVLE1BQWdDO0FBQ2pELFFBQU0sV0FBVyxTQUFTLGNBQWMsVUFBVTtBQUNsRCxXQUFTLFlBQVk7QUFDckIsU0FBTyxTQUFTO0FBQ2xCO0FBSUEsU0FBUyxrQkFBa0IsV0FBcUIsS0FBdUI7QUFDckUsYUFBVyxRQUFRLFdBQVc7QUFDNUIsUUFBSSxDQUFDLEtBQUssV0FBVyxVQUFVLEtBQUssQ0FBQyxLQUFLLFdBQVcsR0FBRyxFQUFHO0FBRTNELFVBQU0sVUFBVSxLQUFLLFdBQVcsVUFBVSxJQUN0QyxLQUFLLE1BQU0sV0FBVyxNQUFNLElBQzVCO0FBRUosUUFBSTtBQUNGLFlBQU0sVUFBVSxLQUFLLE1BQU0sT0FBTztBQUNsQyxpQkFBVyxDQUFDLEtBQUssS0FBSyxLQUFLLE9BQU8sUUFBUSxPQUFPLEdBQUc7QUFDbEQsWUFBSSxVQUFVLEtBQUssS0FBSztBQUN4QixnQkFBUSxJQUFJLDRCQUE0QixHQUFHLE1BQU0sS0FBSztBQUFBLE1BQ3hEO0FBQUEsSUFDRixRQUFRO0FBQ04sY0FBUSxLQUFLLGlEQUFpRCxPQUFPO0FBQUEsSUFDdkU7QUFBQSxFQUNGO0FBQ0Y7QUFlQSxTQUFTLGdCQUFnQixVQUFrQixLQUF5QjtBQUVsRSxTQUFPLFNBQVMsUUFBUSwwQkFBMEIsQ0FBQyxRQUFRLE1BQU0sWUFBWTtBQUMzRSxVQUFNLFFBQVEsSUFBSSxNQUFNLElBQUksT0FBTyxLQUFLLElBQUksVUFBVSxPQUFPO0FBQzdELFdBQU8sSUFBSSxJQUFJLEtBQUssT0FBTyxLQUFLLENBQUM7QUFBQSxFQUNuQyxDQUFDO0FBQ0g7QUFZQSxlQUFzQixXQUNwQixNQUNBLE1BQ0EsS0FDa0I7QUFDbEIsUUFBTSxNQUFNLElBQUksU0FBUyxJQUFJLElBQUk7QUFDakMsTUFBSSxDQUFDLEtBQUs7QUFDUixZQUFRLEtBQUssMkJBQTJCLElBQUksR0FBRztBQUMvQyxXQUFPO0FBQUEsRUFDVDtBQUVBLE1BQUksSUFBSSxPQUFPO0FBQ2IsUUFBSSxDQUFDLFVBQVUsSUFBSSxPQUFPLEdBQUcsRUFBRyxRQUFPO0FBQUEsRUFDekM7QUFFQSxRQUFNLFFBQVEsSUFBSSxNQUFNLE1BQU07QUFDOUIsYUFBVyxVQUFVLElBQUksTUFBTTtBQUM3QixVQUFNLElBQUksT0FBTyxNQUFNLEtBQUssT0FBTyxJQUFJLEtBQUssSUFBSTtBQUFBLEVBQ2xEO0FBRUEsUUFBTSxRQUFRLElBQUksTUFBTSxFQUFFLEdBQUcsS0FBSyxNQUFNLENBQUM7QUFDekMsU0FBTztBQUNUO0FBOXRCQTtBQUFBO0FBQUE7QUFBQTtBQUFBOzs7QUN1Qk8sSUFBTSxrQkFBTixNQUFzQjtBQUFBLEVBQ25CLFdBQVcsb0JBQUksSUFBd0I7QUFBQSxFQUUvQyxTQUFTLEtBQXVCO0FBQzlCLFFBQUksS0FBSyxTQUFTLElBQUksSUFBSSxJQUFJLEdBQUc7QUFDL0IsY0FBUTtBQUFBLFFBQ04sNEJBQTRCLElBQUksSUFBSTtBQUFBLFFBQ3BDLElBQUk7QUFBQSxNQUNOO0FBQUEsSUFDRjtBQUNBLFNBQUssU0FBUyxJQUFJLElBQUksTUFBTSxHQUFHO0FBQUEsRUFDakM7QUFBQSxFQUVBLElBQUksTUFBc0M7QUFDeEMsV0FBTyxLQUFLLFNBQVMsSUFBSSxJQUFJO0FBQUEsRUFDL0I7QUFBQSxFQUVBLElBQUksTUFBdUI7QUFDekIsV0FBTyxLQUFLLFNBQVMsSUFBSSxJQUFJO0FBQUEsRUFDL0I7QUFBQSxFQUVBLFFBQWtCO0FBQ2hCLFdBQU8sTUFBTSxLQUFLLEtBQUssU0FBUyxLQUFLLENBQUM7QUFBQSxFQUN4QztBQUNGOzs7QUNUTyxJQUFNLGlCQUFOLE1BQXFCO0FBQUEsRUFDbEIsYUFBYSxvQkFBSSxJQUEwQjtBQUFBLEVBQzNDLGdCQUEwQixDQUFDO0FBQUEsRUFFbkMsU0FBUyxRQUF5QjtBQUNoQyxlQUFXLENBQUMsTUFBTSxFQUFFLEtBQUssT0FBTyxRQUFRLE9BQU8sVUFBVSxHQUFHO0FBQzFELFdBQUssV0FBVyxJQUFJLE1BQU0sRUFBRTtBQUFBLElBQzlCO0FBQ0EsU0FBSyxjQUFjLEtBQUssT0FBTyxJQUFJO0FBQ25DLFlBQVEsSUFBSSx5QkFBeUIsT0FBTyxJQUFJLEtBQUssT0FBTyxLQUFLLE9BQU8sVUFBVSxDQUFDO0FBQUEsRUFDckY7QUFBQSxFQUVBLElBQUksV0FBNkM7QUFDL0MsV0FBTyxLQUFLLFdBQVcsSUFBSSxTQUFTO0FBQUEsRUFDdEM7QUFBQSxFQUVBLElBQUksV0FBNEI7QUFDOUIsV0FBTyxLQUFLLFdBQVcsSUFBSSxTQUFTO0FBQUEsRUFDdEM7QUFBQTtBQUFBLEVBR0EsUUFBUSxXQUEyQjtBQUVqQyxXQUFPLGNBQWMsU0FBUyxpQ0FBaUMsS0FBSyxjQUFjLEtBQUssSUFBSSxDQUFDO0FBQUEsRUFDOUY7QUFDRjtBQUtBLElBQU0sa0JBQXlFO0FBQUEsRUFDN0UsV0FBVyxNQUFNO0FBQ25CO0FBTUEsZUFBc0IsV0FDcEIsVUFDQSxNQUNlO0FBQ2YsTUFBSSxLQUFLLE1BQU07QUFDYixVQUFNLFNBQVMsZ0JBQWdCLEtBQUssSUFBSTtBQUN4QyxRQUFJLENBQUMsUUFBUTtBQUNYLGNBQVEsS0FBSyx3Q0FBd0MsS0FBSyxJQUFJLGlCQUFpQixPQUFPLEtBQUssZUFBZSxFQUFFLEtBQUssSUFBSSxDQUFDLEVBQUU7QUFDeEg7QUFBQSxJQUNGO0FBQ0EsVUFBTSxNQUFNLE1BQU0sT0FBTztBQUN6QixhQUFTLFNBQVMsSUFBSSxPQUFPO0FBQzdCO0FBQUEsRUFDRjtBQUVBLE1BQUksS0FBSyxLQUFLO0FBQ1osUUFBSTtBQUtGLFlBQU0sY0FBYyxJQUFJLElBQUksS0FBSyxLQUFLLFNBQVMsT0FBTyxFQUFFO0FBQ3hELFlBQU0sTUFBTSxNQUFNO0FBQUE7QUFBQSxRQUEwQjtBQUFBO0FBQzVDLFVBQUksQ0FBQyxJQUFJLFdBQVcsT0FBTyxJQUFJLFFBQVEsZUFBZSxVQUFVO0FBQzlELGdCQUFRLEtBQUssb0JBQW9CLEtBQUssR0FBRyx1R0FBdUc7QUFDaEo7QUFBQSxNQUNGO0FBQ0EsZUFBUyxTQUFTLElBQUksT0FBb0I7QUFBQSxJQUM1QyxTQUFTLEtBQUs7QUFDWixjQUFRLE1BQU0scUNBQXFDLEtBQUssR0FBRyxNQUFNLEdBQUc7QUFBQSxJQUN0RTtBQUNBO0FBQUEsRUFDRjtBQUVBLFVBQVEsS0FBSyw2REFBNkQ7QUFDNUU7OztBQ3pGTyxTQUFTLFVBQVUsS0FBcUI7QUFDN0MsTUFBSSxJQUFJLElBQUksS0FBSztBQUdqQixNQUFJLEVBQUUsV0FBVyxHQUFHLEtBQUssRUFBRSxTQUFTLEdBQUcsR0FBRztBQUN4QyxRQUFJLEVBQUUsTUFBTSxHQUFHLEVBQUU7QUFBQSxFQUVuQjtBQUVBLFFBQU0sUUFBUSxFQUFFLE1BQU0sSUFBSTtBQUMxQixRQUFNLFdBQVcsTUFBTSxPQUFPLE9BQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDO0FBQ3RELE1BQUksU0FBUyxXQUFXLEVBQUcsUUFBTztBQUdsQyxNQUFJLE1BQU0sV0FBVyxFQUFHLFFBQU8sRUFBRSxLQUFLO0FBR3RDLFFBQU0sWUFBWSxTQUFTLE9BQU8sQ0FBQyxLQUFLLFNBQVM7QUFDL0MsVUFBTSxVQUFVLEtBQUssTUFBTSxRQUFRLElBQUksQ0FBQyxHQUFHLFVBQVU7QUFDckQsV0FBTyxLQUFLLElBQUksS0FBSyxPQUFPO0FBQUEsRUFDOUIsR0FBRyxRQUFRO0FBRVgsUUFBTSxXQUFXLGNBQWMsS0FBSyxjQUFjLFdBQzlDLFFBQ0EsTUFBTSxJQUFJLFVBQVEsS0FBSyxVQUFVLFlBQVksS0FBSyxNQUFNLFNBQVMsSUFBSSxLQUFLLFVBQVUsQ0FBQztBQUd6RixNQUFJLFFBQVE7QUFDWixNQUFJLE1BQU0sU0FBUyxTQUFTO0FBQzVCLFNBQU8sU0FBUyxPQUFPLFNBQVMsS0FBSyxHQUFHLEtBQUssTUFBTSxHQUFJO0FBQ3ZELFNBQU8sT0FBTyxTQUFTLFNBQVMsR0FBRyxHQUFHLEtBQUssTUFBTSxHQUFJO0FBRXJELFNBQU8sU0FBUyxNQUFNLE9BQU8sTUFBTSxDQUFDLEVBQUUsS0FBSyxJQUFJO0FBQ2pEOzs7QUNuQ0EsSUFBTSxXQUFvQztBQUFBLEVBRXhDLGFBQWEsSUFBSSxRQUFRO0FBQ3ZCLFVBQU0sT0FBTyxHQUFHLGFBQWEsTUFBTSxHQUFHLEtBQUssS0FBSztBQUNoRCxVQUFNLE1BQU8sR0FBRyxhQUFhLEtBQUssR0FBRyxLQUFLLEtBQU07QUFFaEQsUUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLO0FBQ2pCLGNBQVEsS0FBSyxpRUFBNEQsRUFBRTtBQUMzRTtBQUFBLElBQ0Y7QUFFQSxXQUFPLFFBQVEsS0FBSyxFQUFFLE1BQU0sS0FBSyxTQUFTLEdBQUcsQ0FBQztBQUFBLEVBQ2hEO0FBQUEsRUFFQSxnQkFBZ0IsSUFBSSxRQUFRO0FBQzFCLFVBQU0sT0FBTyxHQUFHLGFBQWEsTUFBTSxHQUFHLEtBQUssS0FBSztBQUNoRCxVQUFNLE9BQU8sR0FBRyxhQUFhLElBQUksR0FBRyxLQUFLLEtBQU87QUFFaEQsUUFBSSxDQUFDLE1BQU07QUFDVCxjQUFRLEtBQUssMEVBQXFFLEVBQUU7QUFDcEY7QUFBQSxJQUNGO0FBQ0EsUUFBSSxDQUFDLE1BQU07QUFDVCxjQUFRLEtBQUssOEJBQThCLElBQUkscURBQWdELEVBQUU7QUFDakc7QUFBQSxJQUNGO0FBRUEsV0FBTyxTQUFTLEtBQUs7QUFBQSxNQUNuQjtBQUFBLE1BQ0EsU0FBUyxHQUFHLGFBQWEsTUFBTSxHQUFHLEtBQUssS0FBTTtBQUFBLE1BQzdDLE9BQVMsR0FBRyxhQUFhLE9BQU8sR0FBRyxLQUFLLEtBQUs7QUFBQSxNQUM3QyxNQUFTLFVBQVUsSUFBSTtBQUFBLE1BQ3ZCLFNBQVM7QUFBQSxJQUNYLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFFQSxXQUFXLElBQUksUUFBUTtBQUNyQixVQUFNLE9BQU8sR0FBRyxhQUFhLE1BQU0sR0FBRyxLQUFLLEtBQU87QUFDbEQsVUFBTSxPQUFPLEdBQUcsYUFBYSxRQUFRLEdBQUcsS0FBSyxLQUFLO0FBRWxELFFBQUksQ0FBQyxNQUFNO0FBQ1QsY0FBUSxLQUFLLHFFQUFnRSxFQUFFO0FBQy9FO0FBQUEsSUFDRjtBQUNBLFFBQUksQ0FBQyxNQUFNO0FBQ1QsY0FBUSxLQUFLLHlCQUF5QixJQUFJLHlEQUFvRCxFQUFFO0FBQ2hHO0FBQUEsSUFDRjtBQUVBLFdBQU8sUUFBUSxLQUFLLEVBQUUsTUFBTSxNQUFNLFVBQVUsSUFBSSxHQUFHLFNBQVMsR0FBRyxDQUFDO0FBQUEsRUFDbEU7QUFBQSxFQUVBLFlBQVksSUFBSSxRQUFRO0FBQ3RCLFVBQU0sT0FBTyxHQUFHLGFBQWEsTUFBTSxHQUFHLEtBQUssS0FBTztBQUNsRCxVQUFNLE9BQU8sR0FBRyxhQUFhLFFBQVEsR0FBRyxLQUFLLEtBQUs7QUFFbEQsUUFBSSxDQUFDLE1BQU07QUFDVCxjQUFRLEtBQUssc0VBQWlFLEVBQUU7QUFDaEY7QUFBQSxJQUNGO0FBQ0EsUUFBSSxDQUFDLE1BQU07QUFDVCxjQUFRLEtBQUssMEJBQTBCLElBQUkseURBQW9ELEVBQUU7QUFDakc7QUFBQSxJQUNGO0FBRUEsV0FBTyxTQUFTLEtBQUs7QUFBQSxNQUNuQjtBQUFBLE1BQ0EsTUFBUyxHQUFHLGFBQWEsTUFBTSxHQUFHLEtBQUssS0FBSztBQUFBLE1BQzVDLE1BQVMsVUFBVSxJQUFJO0FBQUEsTUFDdkIsU0FBUztBQUFBLElBQ1gsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUVBLFVBQVUsSUFBSSxRQUFRO0FBQ3BCLFVBQU0sT0FBTyxHQUFHLGFBQWEsS0FBSyxHQUFHLEtBQUssS0FBSztBQUMvQyxRQUFJLENBQUMsTUFBTTtBQUNULGNBQVEsS0FBSyxtRUFBOEQsRUFBRTtBQUM3RTtBQUFBLElBQ0Y7QUFDQSxXQUFPLE9BQU8sS0FBSyxFQUFFLE1BQU0sVUFBVSxJQUFJLEdBQUcsU0FBUyxHQUFHLENBQUM7QUFBQSxFQUMzRDtBQUFBLEVBRUEsV0FBVyxJQUFJLFFBQVE7QUFDckIsVUFBTSxPQUFPLEdBQUcsYUFBYSxLQUFLLEdBQUcsS0FBSyxLQUFLO0FBQy9DLFFBQUksQ0FBQyxNQUFNO0FBQ1QsY0FBUSxLQUFLLG9FQUErRCxFQUFFO0FBQzlFO0FBQUEsSUFDRjtBQUNBLFdBQU8sUUFBUSxLQUFLO0FBQUEsTUFDbEIsTUFBUyxHQUFHLGFBQWEsTUFBTSxHQUFHLEtBQUssS0FBSztBQUFBLE1BQzVDLE1BQVMsVUFBVSxJQUFJO0FBQUEsTUFDdkIsU0FBUztBQUFBLElBQ1gsQ0FBQztBQUFBLEVBQ0g7QUFBQSxFQUVBLFVBQVUsSUFBSSxRQUFRO0FBQ3BCLFVBQU0sT0FBTyxHQUFHLGFBQWEsS0FBSyxHQUFHLEtBQUssS0FBSztBQUMvQyxRQUFJLENBQUMsTUFBTTtBQUNULGNBQVEsS0FBSyxtRUFBOEQsRUFBRTtBQUM3RTtBQUFBLElBQ0Y7QUFDQSxXQUFPLE9BQU8sS0FBSyxFQUFFLE1BQU0sVUFBVSxJQUFJLEdBQUcsU0FBUyxHQUFHLENBQUM7QUFBQSxFQUMzRDtBQUNGO0FBZ0JPLFNBQVMsV0FBVyxNQUEwQjtBQUNuRCxRQUFNLFNBQW9CO0FBQUEsSUFDeEIsSUFBVSxLQUFLLE1BQU07QUFBQSxJQUNyQixTQUFVLENBQUM7QUFBQSxJQUNYLFVBQVUsQ0FBQztBQUFBLElBQ1gsU0FBVSxDQUFDO0FBQUEsSUFDWCxVQUFVLENBQUM7QUFBQSxJQUNYLFFBQVUsQ0FBQztBQUFBLElBQ1gsU0FBVSxDQUFDO0FBQUEsSUFDWCxRQUFVLENBQUM7QUFBQSxJQUNYLFNBQVUsQ0FBQztBQUFBLEVBQ2I7QUFFQSxhQUFXLFNBQVMsTUFBTSxLQUFLLEtBQUssUUFBUSxHQUFHO0FBQzdDLFVBQU0sTUFBTSxNQUFNLFFBQVEsWUFBWTtBQUN0QyxVQUFNLFVBQVUsU0FBUyxHQUFHO0FBRTVCLFFBQUksU0FBUztBQUNYLGNBQVEsT0FBTyxNQUFNO0FBQUEsSUFDdkIsT0FBTztBQUNMLGFBQU8sUUFBUSxLQUFLLEtBQUs7QUFJekIsVUFBSSxJQUFJLFNBQVMsR0FBRyxHQUFHO0FBQ3JCLGdCQUFRO0FBQUEsVUFDTixnQ0FBZ0MsR0FBRyxvQ0FBb0MsT0FBTyxFQUFFO0FBQUEsVUFDaEY7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBRUEsU0FBTztBQUNUO0FBV08sU0FBUyxVQUFVLFFBQXlCO0FBQ2pELFFBQU0sS0FBSyxPQUFPO0FBQ2xCLFVBQVEsSUFBSSwwQkFBMEIsRUFBRSxFQUFFO0FBQzFDLFVBQVEsSUFBSSxzQkFBc0IsT0FBTyxRQUFRLE1BQU0sSUFBSSxPQUFPLFFBQVEsSUFBSSxPQUFLLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQztBQUNuRyxVQUFRLElBQUksc0JBQXNCLE9BQU8sU0FBUyxNQUFNLElBQUksT0FBTyxTQUFTLElBQUksT0FBSyxFQUFFLElBQUksQ0FBQztBQUM1RixVQUFRLElBQUksc0JBQXNCLE9BQU8sUUFBUSxNQUFNLElBQUksT0FBTyxRQUFRLElBQUksT0FBSyxFQUFFLElBQUksQ0FBQztBQUMxRixVQUFRLElBQUksc0JBQXNCLE9BQU8sU0FBUyxNQUFNLElBQUksT0FBTyxTQUFTLElBQUksT0FBSyxFQUFFLElBQUksQ0FBQztBQUM1RixVQUFRLElBQUksc0JBQXNCLE9BQU8sT0FBTyxNQUFNLEVBQUU7QUFDeEQsVUFBUSxJQUFJLHNCQUFzQixPQUFPLFFBQVEsTUFBTSxJQUFJLE9BQU8sUUFBUSxJQUFJLE9BQUssRUFBRSxRQUFRLFFBQVEsQ0FBQztBQUN0RyxVQUFRLElBQUksc0JBQXNCLE9BQU8sT0FBTyxNQUFNLEVBQUU7QUFFeEQsTUFBSSxPQUFPLFFBQVEsU0FBUyxHQUFHO0FBQzdCLFlBQVEsS0FBSyw2QkFBNkIsT0FBTyxRQUFRLE1BQU0sSUFBSSxPQUFPLFFBQVEsSUFBSSxPQUFLLEVBQUUsUUFBUSxZQUFZLENBQUMsQ0FBQztBQUFBLEVBQ3JIO0FBR0EsTUFBSSxPQUFPLFNBQVMsU0FBUyxHQUFHO0FBQzlCLFVBQU0sUUFBUSxPQUFPLFNBQVMsQ0FBQztBQUMvQixRQUFJLE9BQU87QUFDVCxjQUFRLElBQUksd0NBQXdDLE1BQU0sSUFBSSxLQUFLO0FBQ25FLFlBQU0sVUFBVSxNQUFNLEtBQUssTUFBTSxJQUFJLEVBQUUsTUFBTSxHQUFHLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDOUQsY0FBUSxJQUFJLGFBQWEsT0FBTyxFQUFFO0FBQUEsSUFDcEM7QUFBQSxFQUNGO0FBQ0Y7OztBQ3RMTyxTQUFTLFNBQVMsUUFBeUI7QUFDaEQsUUFBTSxTQUFrQixDQUFDO0FBQ3pCLFFBQU0sUUFBUSxPQUFPLE1BQU0sSUFBSTtBQUUvQixXQUFTLElBQUksR0FBRyxJQUFJLE1BQU0sUUFBUSxLQUFLO0FBQ3JDLFVBQU0sT0FBTyxNQUFNLENBQUMsS0FBSyxJQUFJLFFBQVEsT0FBTyxJQUFJO0FBQ2hELFVBQU0sT0FBTyxJQUFJLEtBQUs7QUFHdEIsUUFBSSxLQUFLLFdBQVcsRUFBRztBQUV2QixVQUFNLFNBQVMsSUFBSSxTQUFTLElBQUksVUFBVSxFQUFFO0FBRTVDLFdBQU8sS0FBSztBQUFBLE1BQ1Y7QUFBQSxNQUNBO0FBQUEsTUFDQSxTQUFTLElBQUk7QUFBQSxJQUNmLENBQUM7QUFBQSxFQUNIO0FBRUEsU0FBTztBQUNUO0FBYU8sU0FBUyxZQUFZLE1BQXVCO0FBQ2pELFNBQU8sU0FBUyxLQUFLLElBQUk7QUFDM0I7QUFNTyxTQUFTLGlCQUFpQixNQUFzQjtBQUNyRCxTQUFPLEtBQUssUUFBUSxXQUFXLEVBQUUsRUFBRSxRQUFRO0FBQzdDO0FBT08sSUFBTSxvQkFBb0Isb0JBQUksSUFBSSxDQUFDLFVBQVUsTUFBTSxDQUFDO0FBTXBELElBQU0sc0JBQXNCLG9CQUFJLElBQUksQ0FBQyxVQUFVLFlBQVksQ0FBQzs7O0FDbkVuRSxJQUFNLHVCQUF1QixvQkFBSSxJQUFJO0FBQUEsRUFDbkM7QUFBQSxFQUFXO0FBQUEsRUFBWTtBQUFBLEVBQVk7QUFBQSxFQUNuQztBQUFBLEVBQVk7QUFBQSxFQUFjO0FBQUEsRUFDMUI7QUFBQSxFQUFpQjtBQUNuQixDQUFDO0FBTU0sSUFBTSxZQUFOLE1BQWdCO0FBQUEsRUFHckIsWUFBNkIsUUFBaUI7QUFBakI7QUFBQSxFQUFrQjtBQUFBLEVBRnZDLE1BQU07QUFBQSxFQUlOLEtBQUssU0FBUyxHQUFzQjtBQUMxQyxXQUFPLEtBQUssT0FBTyxLQUFLLE1BQU0sTUFBTTtBQUFBLEVBQ3RDO0FBQUEsRUFFUSxVQUFpQjtBQUN2QixVQUFNLElBQUksS0FBSyxPQUFPLEtBQUssR0FBRztBQUM5QixRQUFJLENBQUMsRUFBRyxPQUFNLElBQUksY0FBYywyQkFBMkIsTUFBUztBQUNwRSxTQUFLO0FBQ0wsV0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUVRLFFBQWlCO0FBQ3ZCLFdBQU8sS0FBSyxPQUFPLEtBQUssT0FBTztBQUFBLEVBQ2pDO0FBQUEsRUFFUSxXQUFXLE1BQXVCO0FBQ3hDLFVBQU0sSUFBSSxLQUFLLEtBQUs7QUFDcEIsUUFBSSxHQUFHLFNBQVMsTUFBTTtBQUFFLFdBQUs7QUFBTyxhQUFPO0FBQUEsSUFBSztBQUNoRCxXQUFPO0FBQUEsRUFDVDtBQUFBO0FBQUEsRUFJQSxRQUFpQjtBQUNmLFVBQU0sT0FBTyxLQUFLLFdBQVcsRUFBRTtBQUMvQixXQUFPO0FBQUEsRUFDVDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBZVEsV0FBVyxZQUE2QjtBQUM5QyxVQUFNLFFBQW1CLENBQUM7QUFFMUIsV0FBTyxDQUFDLEtBQUssTUFBTSxHQUFHO0FBQ3BCLFlBQU0sSUFBSSxLQUFLLEtBQUs7QUFHcEIsVUFBSSxFQUFFLFVBQVUsV0FBWTtBQUc1QixVQUFJLGtCQUFrQixJQUFJLEVBQUUsSUFBSSxFQUFHO0FBR25DLFVBQUksb0JBQW9CLElBQUksRUFBRSxJQUFJLEtBQUssRUFBRSxVQUFVLGFBQWEsRUFBRztBQUtuRSxVQUFJLEVBQUUsU0FBUyxRQUFRO0FBQ3JCLGNBQU0sYUFBYSxFQUFFO0FBQ3JCLGFBQUssUUFBUTtBQUNiLGNBQU0sT0FBTyxLQUFLLEtBQUs7QUFDdkIsWUFBSSxRQUFRLEtBQUssU0FBUyxZQUFZO0FBQ3BDLGdCQUFNLE9BQU8sS0FBSyxXQUFXLFVBQVU7QUFDdkMsZ0JBQU0sS0FBSyxJQUFJO0FBQUEsUUFDakI7QUFDQTtBQUFBLE1BQ0Y7QUFLQSxVQUFJLEVBQUUsS0FBSyxXQUFXLE9BQU8sR0FBRztBQUM5QixhQUFLLFFBQVE7QUFDYixjQUFNLE9BQU8sRUFBRSxLQUFLLE1BQU0sQ0FBQyxFQUFFLEtBQUs7QUFDbEMsY0FBTSxPQUFPLEtBQUssZ0JBQWdCLE1BQU0sRUFBRSxRQUFRLENBQUM7QUFDbkQsY0FBTSxLQUFLLElBQUk7QUFDZjtBQUFBLE1BQ0Y7QUFHQSxZQUFNLE9BQU8sS0FBSyx5QkFBeUIsRUFBRSxNQUFNO0FBQ25ELFlBQU0sS0FBSyxJQUFJO0FBQUEsSUFDakI7QUFFQSxXQUFPLG1CQUFtQixLQUFLO0FBQUEsRUFDakM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFjUSx5QkFBeUIsYUFBOEI7QUFDN0QsVUFBTSxXQUFzQixDQUFDO0FBRTdCLFdBQU8sQ0FBQyxLQUFLLE1BQU0sR0FBRztBQUNwQixZQUFNLElBQUksS0FBSyxLQUFLO0FBR3BCLFVBQUksRUFBRSxTQUFTLFlBQWE7QUFDNUIsVUFBSSxFQUFFLFNBQVMsWUFBYTtBQUM1QixVQUFJLGtCQUFrQixJQUFJLEVBQUUsSUFBSSxFQUFHO0FBQ25DLFVBQUksb0JBQW9CLElBQUksRUFBRSxJQUFJLEVBQUc7QUFDckMsVUFBSSxFQUFFLFNBQVMsVUFBVSxFQUFFLEtBQUssV0FBVyxPQUFPLEVBQUc7QUFFckQsWUFBTSxTQUFTLFlBQVksRUFBRSxJQUFJO0FBQ2pDLFlBQU0sV0FBVyxTQUFTLGlCQUFpQixFQUFFLElBQUksSUFBSSxFQUFFO0FBRXZELFdBQUssUUFBUTtBQUViLFlBQU0sT0FBTyxLQUFLLGdCQUFnQixVQUFVLEVBQUUsUUFBUSxDQUFDO0FBQ3ZELGVBQVMsS0FBSyxJQUFJO0FBRWxCLFVBQUksQ0FBQyxPQUFRO0FBQUEsSUFDZjtBQUVBLFFBQUksU0FBUyxXQUFXLEVBQUcsUUFBTyxLQUFLLEVBQUU7QUFDekMsUUFBSSxTQUFTLFdBQVcsRUFBRyxRQUFPLFNBQVMsQ0FBQztBQUM1QyxXQUFPLEVBQUUsTUFBTSxZQUFZLFNBQVM7QUFBQSxFQUN0QztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFVUSxnQkFBZ0IsTUFBYyxRQUFnQixPQUF1QjtBQUMzRSxVQUFNLFFBQVEsVUFBVSxJQUFJO0FBRzVCLFFBQUksVUFBVSxRQUFTLFFBQU8sS0FBSyxXQUFXLE1BQU0sUUFBUSxLQUFLO0FBQ2pFLFFBQUksVUFBVSxNQUFTLFFBQU8sS0FBSyxTQUFTLFFBQVEsS0FBSztBQUd6RCxRQUFJLFVBQVUsTUFBYSxRQUFPLEtBQUssU0FBUyxNQUFNLEtBQUs7QUFDM0QsUUFBSSxVQUFVLE9BQWEsUUFBTyxLQUFLLFVBQVUsTUFBTSxLQUFLO0FBQzVELFFBQUksVUFBVSxZQUFhLFFBQU8sS0FBSyxlQUFlLE1BQU0sS0FBSztBQUNqRSxRQUFJLFVBQVUsT0FBYSxRQUFPLEtBQUssVUFBVSxNQUFNLEtBQUs7QUFDNUQsUUFBSSxVQUFVLE9BQWEsUUFBTyxLQUFLLFVBQVUsTUFBTSxLQUFLO0FBRzVELFFBQUksTUFBTSxXQUFXLEdBQUcsRUFBSSxRQUFPLEtBQUssWUFBWSxNQUFNLEtBQUs7QUFHL0QsUUFBSSxLQUFLLFNBQVMsTUFBTSxFQUFHLFFBQU8sS0FBSyxVQUFVLE1BQU0sS0FBSztBQUc1RCxRQUFJLHFCQUFxQixJQUFJLEtBQUssRUFBRyxRQUFPLEtBQUssZUFBZSxNQUFNLEtBQUs7QUFPM0UsUUFBSSxNQUFNLFNBQVMsR0FBRyxLQUFLLHVCQUF1QixJQUFJLEdBQUc7QUFDdkQsYUFBTyxLQUFLLGVBQWUsTUFBTSxLQUFLO0FBQUEsSUFDeEM7QUFHQSxZQUFRLEtBQUssbUNBQW1DLEtBQUssVUFBVSxJQUFJLENBQUMsSUFBSSxLQUFLO0FBQzdFLFdBQU8sS0FBSyxJQUFJO0FBQUEsRUFDbEI7QUFBQTtBQUFBLEVBSVEsV0FBVyxNQUFjLFFBQWdCLE9BQXlCO0FBRXhFLFVBQU0sYUFBYSxLQUFLLE1BQU0sUUFBUSxNQUFNLEVBQUUsS0FBSztBQUNuRCxVQUFNLFVBQW9CLEtBQUssVUFBVTtBQUN6QyxVQUFNLE9BQW1CLENBQUM7QUFFMUIsV0FBTyxDQUFDLEtBQUssTUFBTSxHQUFHO0FBQ3BCLFlBQU0sSUFBSSxLQUFLLEtBQUs7QUFHcEIsVUFBSSxFQUFFLFNBQVMsVUFBVTtBQUN2QixhQUFLLFFBQVE7QUFDYjtBQUFBLE1BQ0Y7QUFHQSxVQUFJLEVBQUUsVUFBVSxRQUFRO0FBQ3RCLGdCQUFRLEtBQUssMkRBQXNELEtBQUs7QUFDeEU7QUFBQSxNQUNGO0FBR0EsVUFBSSxFQUFFLEtBQUssV0FBVyxHQUFHLEdBQUc7QUFDMUIsYUFBSyxLQUFLLEtBQUssY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQ3pDO0FBQUEsTUFDRjtBQUdBLGNBQVEsS0FBSyxxREFBcUQsS0FBSyxVQUFVLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQztBQUM3RixXQUFLLFFBQVE7QUFBQSxJQUNmO0FBRUEsV0FBTyxFQUFFLE1BQU0sU0FBUyxTQUFTLEtBQUs7QUFBQSxFQUN4QztBQUFBLEVBRVEsY0FBYyxXQUFtQixPQUF3QjtBQUMvRCxVQUFNLElBQUksS0FBSyxRQUFRO0FBR3ZCLFVBQU0sV0FBVyxFQUFFLEtBQUssUUFBUSxLQUFLO0FBQ3JDLFFBQUksYUFBYSxJQUFJO0FBQ25CLGNBQVEsS0FBSyx3Q0FBd0MsS0FBSyxVQUFVLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQztBQUNoRixhQUFPLEVBQUUsVUFBVSxDQUFDLEVBQUUsTUFBTSxXQUFXLENBQUMsR0FBRyxNQUFNLEtBQUssRUFBRSxFQUFFO0FBQUEsSUFDNUQ7QUFFQSxVQUFNLGFBQWEsRUFBRSxLQUFLLE1BQU0sR0FBRyxRQUFRLEVBQUUsS0FBSztBQUNsRCxVQUFNLGFBQWEsRUFBRSxLQUFLLE1BQU0sV0FBVyxDQUFDLEVBQUUsS0FBSztBQUVuRCxVQUFNLFdBQVcsY0FBYyxVQUFVO0FBRXpDLFFBQUk7QUFDSixRQUFJLFdBQVcsU0FBUyxHQUFHO0FBRXpCLGFBQU8sS0FBSyxnQkFBZ0IsWUFBWSxXQUFXLEtBQUs7QUFBQSxJQUMxRCxPQUFPO0FBRUwsYUFBTyxLQUFLLFdBQVcsU0FBUztBQUFBLElBQ2xDO0FBRUEsV0FBTyxFQUFFLFVBQVUsS0FBSztBQUFBLEVBQzFCO0FBQUE7QUFBQSxFQUlRLFNBQVMsUUFBZ0IsT0FBdUI7QUFLdEQsVUFBTSxPQUFPLEtBQUssV0FBVyxNQUFNO0FBRW5DLFFBQUksU0FBOEI7QUFDbEMsUUFBSSxhQUFrQztBQUd0QyxRQUFJLEtBQUssS0FBSyxHQUFHLFNBQVMsWUFBWSxLQUFLLEtBQUssR0FBRyxXQUFXLFFBQVE7QUFDcEUsV0FBSyxRQUFRO0FBQ2IsZUFBUyxLQUFLLFdBQVcsTUFBTTtBQUFBLElBQ2pDO0FBR0EsUUFBSSxLQUFLLEtBQUssR0FBRyxTQUFTLGdCQUFnQixLQUFLLEtBQUssR0FBRyxXQUFXLFFBQVE7QUFDeEUsV0FBSyxRQUFRO0FBQ2IsbUJBQWEsS0FBSyxXQUFXLE1BQU07QUFBQSxJQUNyQztBQUdBLFFBQUksS0FBSyxLQUFLLEdBQUcsU0FBUyxRQUFRO0FBQ2hDLFdBQUssUUFBUTtBQUFBLElBQ2YsT0FBTztBQUNMLGNBQVEsS0FBSyx1REFBa0QsS0FBSztBQUFBLElBQ3RFO0FBRUEsVUFBTSxVQUFtQixFQUFFLE1BQU0sT0FBTyxLQUFLO0FBQzdDLFFBQUksV0FBYyxPQUFXLFNBQVEsU0FBYTtBQUNsRCxRQUFJLGVBQWUsT0FBVyxTQUFRLGFBQWE7QUFDbkQsV0FBTztBQUFBLEVBQ1Q7QUFBQTtBQUFBLEVBSVEsU0FBUyxNQUFjLE9BQXVCO0FBRXBELFVBQU0sSUFBSSxLQUFLLE1BQU0sNkJBQTZCO0FBQ2xELFFBQUksQ0FBQyxHQUFHO0FBQ04sY0FBUSxLQUFLLHlDQUF5QyxLQUFLLFVBQVUsSUFBSSxDQUFDLElBQUksS0FBSztBQUNuRixhQUFPLEVBQUUsTUFBTSxPQUFPLFFBQVEsTUFBTSxPQUFPLEtBQUssSUFBSSxFQUFFO0FBQUEsSUFDeEQ7QUFDQSxXQUFPO0FBQUEsTUFDTCxNQUFNO0FBQUEsTUFDTixRQUFRLEVBQUUsQ0FBQztBQUFBLE1BQ1gsT0FBTyxLQUFLLEVBQUUsQ0FBQyxFQUFHLEtBQUssQ0FBQztBQUFBLElBQzFCO0FBQUEsRUFDRjtBQUFBLEVBRVEsVUFBVSxNQUFjLE9BQXdCO0FBRXRELFVBQU0sRUFBRSxNQUFNLFFBQVEsSUFBSSxlQUFlLEtBQUssTUFBTSxPQUFPLE1BQU0sRUFBRSxLQUFLLEdBQUcsS0FBSztBQUNoRixXQUFPLEVBQUUsTUFBTSxRQUFRLE9BQU8sTUFBTSxRQUFRO0FBQUEsRUFDOUM7QUFBQSxFQUVRLGVBQWUsTUFBYyxPQUE2QjtBQUNoRSxVQUFNLEVBQUUsTUFBTSxRQUFRLElBQUksZUFBZSxLQUFLLE1BQU0sWUFBWSxNQUFNLEVBQUUsS0FBSyxHQUFHLEtBQUs7QUFDckYsV0FBTyxFQUFFLE1BQU0sYUFBYSxPQUFPLE1BQU0sUUFBUTtBQUFBLEVBQ25EO0FBQUEsRUFFUSxVQUFVLE1BQWMsT0FBd0I7QUFFdEQsVUFBTSxJQUFJLEtBQUssTUFBTSxxQ0FBcUM7QUFDMUQsUUFBSSxDQUFDLEdBQUc7QUFDTixjQUFRLEtBQUssMENBQTBDLEtBQUssVUFBVSxJQUFJLENBQUMsSUFBSSxLQUFLO0FBQ3BGLGFBQU8sRUFBRSxNQUFNLFFBQVEsU0FBUyxNQUFNLE1BQU0sQ0FBQyxFQUFFO0FBQUEsSUFDakQ7QUFDQSxXQUFPO0FBQUEsTUFDTCxNQUFNO0FBQUEsTUFDTixTQUFTLEVBQUUsQ0FBQztBQUFBLE1BQ1osTUFBTSxhQUFhLEVBQUUsQ0FBQyxLQUFLLEVBQUU7QUFBQSxJQUMvQjtBQUFBLEVBQ0Y7QUFBQSxFQUVRLFVBQVUsTUFBYyxPQUF3QjtBQUV0RCxVQUFNLElBQUksS0FBSyxNQUFNLGtCQUFrQjtBQUN2QyxRQUFJLENBQUMsR0FBRztBQUNOLGNBQVEsS0FBSywwQ0FBMEMsS0FBSyxVQUFVLElBQUksQ0FBQyxJQUFJLEtBQUs7QUFDcEYsYUFBTyxFQUFFLE1BQU0sUUFBUSxJQUFJLEVBQUU7QUFBQSxJQUMvQjtBQUNBLFVBQU0sU0FBUyxFQUFFLENBQUMsRUFBRyxLQUFLO0FBRTFCLFVBQU0sVUFBVSxPQUFPLE1BQU07QUFDN0IsUUFBSSxDQUFDLE9BQU8sTUFBTSxPQUFPLEVBQUcsUUFBTyxFQUFFLE1BQU0sUUFBUSxJQUFJLFFBQVE7QUFHL0QsV0FBTyxFQUFFLE1BQU0sUUFBUSxJQUFJLEVBQUU7QUFBQSxFQUMvQjtBQUFBLEVBRVEsVUFBVSxNQUFjLE9BQXdCO0FBRXRELFVBQU0sSUFBSSxLQUFLLE1BQU0sbURBQW1EO0FBQ3hFLFFBQUksQ0FBQyxHQUFHO0FBQ04sY0FBUSxLQUFLLDBDQUEwQyxLQUFLLFVBQVUsSUFBSSxDQUFDLElBQUksS0FBSztBQUNwRixhQUFPO0FBQUEsUUFDTCxNQUFNO0FBQUEsUUFDTixNQUFNO0FBQUEsUUFDTixRQUFRLEVBQUUsTUFBTSxVQUFVLE1BQU0sT0FBTyxLQUFLLElBQUksTUFBTSxDQUFDLEVBQUU7QUFBQSxNQUMzRDtBQUFBLElBQ0Y7QUFDQSxVQUFNLFNBQXFCO0FBQUEsTUFDekIsTUFBTTtBQUFBLE1BQ04sTUFBTSxFQUFFLENBQUMsRUFBRyxZQUFZO0FBQUEsTUFDeEIsS0FBSyxFQUFFLENBQUM7QUFBQSxNQUNSLE1BQU0sYUFBYSxFQUFFLENBQUMsS0FBSyxFQUFFO0FBQUEsSUFDL0I7QUFDQSxXQUFPLEVBQUUsTUFBTSxRQUFRLE1BQU0sRUFBRSxDQUFDLEdBQUksT0FBTztBQUFBLEVBQzdDO0FBQUEsRUFFUSxZQUFZLE1BQWMsT0FBMEI7QUFFMUQsVUFBTSxJQUFJLEtBQUssTUFBTSxzQ0FBc0M7QUFDM0QsUUFBSSxDQUFDLEdBQUc7QUFDTixjQUFRLEtBQUssa0NBQWtDLEtBQUssVUFBVSxJQUFJLENBQUMsSUFBSSxLQUFLO0FBQzVFLGFBQU8sRUFBRSxNQUFNLFVBQVUsTUFBTSxPQUFPLEtBQUssSUFBSSxNQUFNLENBQUMsRUFBRTtBQUFBLElBQzFEO0FBQ0EsV0FBTztBQUFBLE1BQ0wsTUFBTTtBQUFBLE1BQ04sTUFBTSxFQUFFLENBQUMsRUFBRyxZQUFZO0FBQUEsTUFDeEIsS0FBSyxFQUFFLENBQUM7QUFBQSxNQUNSLE1BQU0sYUFBYSxFQUFFLENBQUMsS0FBSyxFQUFFO0FBQUEsSUFDL0I7QUFBQSxFQUNGO0FBQUEsRUFFUSxlQUFlLE1BQWMsT0FBNkI7QUFRaEUsVUFBTSxRQUFRLG1CQUFtQixJQUFJO0FBRXJDLFVBQU0sWUFBWSxNQUFNLENBQUMsS0FBSztBQUM5QixVQUFNLFdBQVksTUFBTSxDQUFDLEtBQUs7QUFDOUIsVUFBTSxjQUFjLE1BQU0sQ0FBQyxLQUFLO0FBQ2hDLFVBQU0sU0FBWSxNQUFNLENBQUMsS0FBSztBQUM5QixVQUFNLGFBQWEsTUFBTSxDQUFDLEtBQUs7QUFFL0IsVUFBTSxhQUFhLFNBQVMsYUFBYSxFQUFFO0FBRTNDLFdBQU87QUFBQSxNQUNMLE1BQU07QUFBQSxNQUNOO0FBQUEsTUFDQTtBQUFBLE1BQ0EsVUFBVSxPQUFPLE1BQU0sVUFBVSxJQUFJLElBQUk7QUFBQSxNQUN6QztBQUFBLE1BQ0EsU0FBUyxzQkFBc0IsVUFBVTtBQUFBLElBQzNDO0FBQUEsRUFDRjtBQUNGO0FBYUEsU0FBUyxjQUFjLEtBQTRCO0FBRWpELFFBQU0sUUFBUSxJQUFJLFFBQVEsWUFBWSxFQUFFLEVBQUUsS0FBSztBQUcvQyxNQUFJLE1BQU0sU0FBUyxLQUFLLEtBQUssTUFBTSxTQUFTLEdBQUcsR0FBRztBQUNoRCxVQUFNLGVBQWUsTUFBTSxNQUFNLFVBQVUsRUFBRSxJQUFJLE9BQUssbUJBQW1CLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDbEYsV0FBTyxDQUFDLEVBQUUsTUFBTSxNQUFNLFVBQVUsYUFBYSxDQUFDO0FBQUEsRUFDaEQ7QUFJQSxTQUFPLE1BQU0sS0FBSyxFQUFFLE1BQU0saUJBQWlCLEVBQUUsT0FBTyxPQUFLLEVBQUUsS0FBSyxDQUFDLEVBQzlELElBQUksT0FBSyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUMxQztBQUVBLFNBQVMsbUJBQW1CLEdBQXdCO0FBQ2xELE1BQUksTUFBTSxJQUFPLFFBQU8sRUFBRSxNQUFNLFdBQVc7QUFDM0MsTUFBSSxNQUFNLE1BQU8sUUFBTyxFQUFFLE1BQU0sV0FBVyxPQUFPLEtBQUs7QUFHdkQsTUFBSSxFQUFFLFdBQVcsR0FBRyxLQUFLLEVBQUUsU0FBUyxHQUFHLEdBQUc7QUFDeEMsV0FBTyxFQUFFLE1BQU0sV0FBVyxPQUFPLEVBQUUsTUFBTSxHQUFHLEVBQUUsRUFBRTtBQUFBLEVBQ2xEO0FBR0EsUUFBTSxJQUFJLE9BQU8sQ0FBQztBQUNsQixNQUFJLENBQUMsT0FBTyxNQUFNLENBQUMsRUFBRyxRQUFPLEVBQUUsTUFBTSxXQUFXLE9BQU8sRUFBRTtBQUd6RCxNQUFJLE1BQU0sT0FBUyxRQUFPLEVBQUUsTUFBTSxXQUFXLE9BQU8sS0FBSztBQUN6RCxNQUFJLE1BQU0sUUFBUyxRQUFPLEVBQUUsTUFBTSxXQUFXLE9BQU8sTUFBTTtBQUcxRCxTQUFPLEVBQUUsTUFBTSxXQUFXLE1BQU0sRUFBRTtBQUNwQztBQVVBLFNBQVMsYUFBYSxLQUF1QztBQUMzRCxNQUFJLENBQUMsSUFBSSxLQUFLLEVBQUcsUUFBTyxDQUFDO0FBRXpCLFFBQU0sU0FBbUMsQ0FBQztBQUsxQyxRQUFNLFFBQVEsSUFBSSxLQUFLLEVBQUUsTUFBTSxxQkFBcUI7QUFDcEQsYUFBVyxRQUFRLE9BQU87QUFDeEIsVUFBTSxXQUFXLEtBQUssUUFBUSxHQUFHO0FBQ2pDLFFBQUksYUFBYSxHQUFJO0FBQ3JCLFVBQU0sTUFBUSxLQUFLLE1BQU0sR0FBRyxRQUFRLEVBQUUsS0FBSztBQUMzQyxVQUFNLFFBQVEsS0FBSyxNQUFNLFdBQVcsQ0FBQyxFQUFFLEtBQUs7QUFDNUMsUUFBSSxJQUFLLFFBQU8sR0FBRyxJQUFJLEtBQUssS0FBSztBQUFBLEVBQ25DO0FBRUEsU0FBTztBQUNUO0FBTUEsU0FBUyxlQUNQLEtBQ0EsT0FDdUM7QUFFdkMsUUFBTSxhQUFhLElBQUksUUFBUSxHQUFHO0FBQ2xDLE1BQUksZUFBZSxJQUFJO0FBQ3JCLFdBQU8sRUFBRSxNQUFNLElBQUksS0FBSyxHQUFHLFNBQVMsQ0FBQyxFQUFFO0FBQUEsRUFDekM7QUFDQSxRQUFNLE9BQU8sSUFBSSxNQUFNLEdBQUcsVUFBVSxFQUFFLEtBQUs7QUFDM0MsUUFBTSxhQUFhLElBQUksTUFBTSxhQUFhLEdBQUcsSUFBSSxZQUFZLEdBQUcsQ0FBQyxFQUFFLEtBQUs7QUFHeEUsUUFBTSxVQUFzQixhQUN4QixXQUFXLE1BQU0sYUFBYSxFQUFFLElBQUksT0FBSyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRSxPQUFPLE9BQUssRUFBRSxHQUFHLElBQzFFLENBQUM7QUFFTCxTQUFPLEVBQUUsTUFBTSxRQUFRO0FBQ3pCO0FBWUEsU0FBUyxtQkFBbUIsTUFBd0I7QUFDbEQsUUFBTSxRQUFrQixDQUFDO0FBQ3pCLE1BQUksVUFBVTtBQUNkLE1BQUksWUFBWTtBQUVoQixXQUFTLElBQUksR0FBRyxJQUFJLEtBQUssUUFBUSxLQUFLO0FBQ3BDLFVBQU0sS0FBSyxLQUFLLENBQUM7QUFDakIsUUFBSSxPQUFPLEtBQUs7QUFDZDtBQUNBLGlCQUFXO0FBQUEsSUFDYixXQUFXLE9BQU8sS0FBSztBQUNyQjtBQUNBLGlCQUFXO0FBQUEsSUFDYixXQUFXLE9BQU8sT0FBTyxjQUFjLEdBQUc7QUFDeEMsVUFBSSxRQUFRLEtBQUssRUFBRyxPQUFNLEtBQUssUUFBUSxLQUFLLENBQUM7QUFDN0MsZ0JBQVU7QUFBQSxJQUNaLE9BQU87QUFDTCxpQkFBVztBQUFBLElBQ2I7QUFBQSxFQUNGO0FBQ0EsTUFBSSxRQUFRLEtBQUssRUFBRyxPQUFNLEtBQUssUUFBUSxLQUFLLENBQUM7QUFDN0MsU0FBTztBQUNUO0FBTUEsU0FBUyxzQkFBc0IsS0FBdUM7QUFDcEUsTUFBSSxDQUFDLElBQUksS0FBSyxFQUFHLFFBQU8sQ0FBQztBQUV6QixRQUFNLFFBQVEsSUFBSSxRQUFRLFlBQVksRUFBRSxFQUFFLEtBQUs7QUFDL0MsU0FBTyxhQUFhLEtBQUs7QUFDM0I7QUFNQSxTQUFTLEtBQUssS0FBdUI7QUFDbkMsU0FBTyxFQUFFLE1BQU0sUUFBUSxJQUFJO0FBQzdCO0FBRUEsU0FBUyxVQUFVLE1BQXNCO0FBQ3ZDLFNBQU8sS0FBSyxNQUFNLEtBQUssRUFBRSxDQUFDLEtBQUs7QUFDakM7QUFVQSxTQUFTLHVCQUF1QixNQUF1QjtBQUNyRCxRQUFNLFFBQVEsS0FBSyxLQUFLLEVBQUUsTUFBTSxLQUFLO0FBQ3JDLE1BQUksTUFBTSxTQUFTLEVBQUcsUUFBTztBQUM3QixRQUFNLFNBQVMsTUFBTSxDQUFDLEtBQUs7QUFFM0IsU0FBTyxVQUFVLEtBQUssTUFBTTtBQUFBLEVBQ3JCLFVBQVUsS0FBSyxNQUFNO0FBQzlCO0FBRUEsU0FBUyxtQkFBbUIsT0FBMkI7QUFDckQsTUFBSSxNQUFNLFdBQVcsRUFBRyxRQUFPLEtBQUssRUFBRTtBQUN0QyxNQUFJLE1BQU0sV0FBVyxFQUFHLFFBQU8sTUFBTSxDQUFDO0FBQ3RDLFNBQU8sRUFBRSxNQUFNLFlBQVksTUFBTTtBQUNuQztBQU1PLElBQU0sZ0JBQU4sY0FBNEIsTUFBTTtBQUFBLEVBQ3ZDLFlBQVksU0FBaUMsT0FBMEI7QUFDckUsVUFBTSxNQUFNLFFBQVEsVUFBVSxNQUFNLE9BQU8sS0FBSyxLQUFLLFVBQVUsTUFBTSxJQUFJLENBQUMsTUFBTTtBQUNoRixVQUFNLGdCQUFnQixPQUFPLEdBQUcsR0FBRyxFQUFFO0FBRk07QUFHM0MsU0FBSyxPQUFPO0FBQUEsRUFDZDtBQUNGOzs7QUNubEJPLFNBQVMsU0FBUyxLQUFzQjtBQUM3QyxRQUFNLFdBQVcsVUFBVSxHQUFHO0FBQzlCLFFBQU0sU0FBVyxTQUFTLFFBQVE7QUFDbEMsUUFBTSxTQUFXLElBQUksVUFBVSxNQUFNO0FBQ3JDLFNBQU8sT0FBTyxNQUFNO0FBQ3RCOzs7QUNoQkE7OztBQ0xPLElBQU0sV0FBTixNQUFNLFVBQVM7QUFBQSxFQUdwQixZQUE2QixRQUFtQjtBQUFuQjtBQUFBLEVBQW9CO0FBQUEsRUFGekMsU0FBUyxvQkFBSSxJQUFxQjtBQUFBLEVBSTFDLElBQUksTUFBdUI7QUFDekIsUUFBSSxLQUFLLE9BQU8sSUFBSSxJQUFJLEVBQUcsUUFBTyxLQUFLLE9BQU8sSUFBSSxJQUFJO0FBQ3RELFdBQU8sS0FBSyxRQUFRLElBQUksSUFBSTtBQUFBLEVBQzlCO0FBQUEsRUFFQSxJQUFJLE1BQWMsT0FBc0I7QUFDdEMsU0FBSyxPQUFPLElBQUksTUFBTSxLQUFLO0FBQUEsRUFDN0I7QUFBQSxFQUVBLElBQUksTUFBdUI7QUFDekIsV0FBTyxLQUFLLE9BQU8sSUFBSSxJQUFJLE1BQU0sS0FBSyxRQUFRLElBQUksSUFBSSxLQUFLO0FBQUEsRUFDN0Q7QUFBQTtBQUFBLEVBR0EsUUFBa0I7QUFDaEIsV0FBTyxJQUFJLFVBQVMsSUFBSTtBQUFBLEVBQzFCO0FBQUE7QUFBQSxFQUdBLFdBQW9DO0FBQ2xDLFVBQU0sT0FBTyxLQUFLLFFBQVEsU0FBUyxLQUFLLENBQUM7QUFDekMsZUFBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEtBQUssT0FBUSxNQUFLLENBQUMsSUFBSTtBQUM1QyxXQUFPO0FBQUEsRUFDVDtBQUNGOzs7QURKTyxTQUFTLGFBQ2QsTUFDQSxVQUNBLFNBQ0EsU0FDb0M7QUFDcEMsUUFBTSxRQUFRLElBQUksU0FBUztBQUUzQixRQUFNLFlBQVksQ0FBQyxPQUFlLFlBQXVCO0FBQ3ZELFlBQVEsSUFBSSxlQUFlLEtBQUssS0FBSyxRQUFRLFNBQVMsVUFBVSxFQUFFO0FBQ2xFLFNBQUssY0FBYyxJQUFJLFlBQVksT0FBTztBQUFBLE1BQ3hDLFFBQVEsRUFBRSxRQUFRO0FBQUEsTUFDbEIsU0FBUztBQUFBLE1BQ1QsVUFBVTtBQUFBLElBQ1osQ0FBQyxDQUFDO0FBQUEsRUFDSjtBQUVBLFFBQU0sWUFBWSxDQUFDLE9BQWUsWUFBdUI7QUFDdkQsWUFBUSxJQUFJLG9CQUFvQixLQUFLLEtBQUssUUFBUSxTQUFTLFVBQVUsRUFBRTtBQUN2RSxTQUFLLGNBQWMsSUFBSSxZQUFZLE9BQU87QUFBQSxNQUN4QyxRQUFRLEVBQUUsUUFBUTtBQUFBLE1BQ2xCLFNBQVM7QUFBQSxNQUNULFVBQVU7QUFBQSxJQUNaLENBQUMsQ0FBQztBQUFBLEVBQ0o7QUFFQSxTQUFPO0FBQUEsSUFDTDtBQUFBLElBQ0E7QUFBQSxJQUNBO0FBQUEsSUFDQTtBQUFBLElBQ0EsV0FBVyxRQUFRO0FBQUEsSUFDbkIsV0FBVyxRQUFRO0FBQUEsSUFDbkI7QUFBQSxJQUNBO0FBQUEsRUFDRjtBQUNGO0FBTU8sU0FBUyxpQkFDZCxRQUNBLFVBQ007QUFDTixhQUFXLE9BQU8sT0FBTyxVQUFVO0FBRWpDLFVBQU0sT0FBTyxhQUFhLElBQUksT0FBTztBQUNyQyxVQUFNLE1BQTBDO0FBQUEsTUFDOUMsTUFBTSxJQUFJO0FBQUEsTUFDVjtBQUFBLE1BQ0EsTUFBTSxJQUFJO0FBQUEsTUFDVixTQUFTLFNBQVMsY0FBYyxlQUFlO0FBQUEsSUFDakQ7QUFDQSxRQUFJLElBQUksTUFBTyxLQUFJLFFBQVEsSUFBSTtBQUMvQixhQUFTLFNBQVMsR0FBRztBQUFBLEVBQ3ZCO0FBQ0EsVUFBUSxJQUFJLG9CQUFvQixPQUFPLFNBQVMsTUFBTSxXQUFXO0FBQ25FO0FBTU8sU0FBUyxrQkFDZCxRQUNBLE1BQ0EsUUFDWTtBQUNaLFFBQU0sV0FBOEIsQ0FBQztBQUVyQyxhQUFXLFdBQVcsT0FBTyxVQUFVO0FBQ3JDLFVBQU0sV0FBVyxDQUFDLE1BQWE7QUFDN0IsWUFBTSxNQUFNLE9BQU87QUFFbkIsWUFBTSxlQUFlLElBQUksTUFBTSxNQUFNO0FBQ3JDLFlBQU0sU0FBVSxFQUFrQixVQUFVLENBQUM7QUFDN0MsbUJBQWEsSUFBSSxTQUFTLENBQUM7QUFDM0IsbUJBQWEsSUFBSSxXQUFXLE9BQU8sV0FBVyxDQUFDLENBQUM7QUFDaEQsWUFBTSxhQUFhLEVBQUUsR0FBRyxLQUFLLE9BQU8sYUFBYTtBQUVqRCxjQUFRLFFBQVEsTUFBTSxVQUFVLEVBQUUsTUFBTSxTQUFPO0FBQzdDLGdCQUFRLE1BQU0sK0JBQStCLFFBQVEsS0FBSyxNQUFNLEdBQUc7QUFBQSxNQUNyRSxDQUFDO0FBQUEsSUFDSDtBQUVBLFNBQUssaUJBQWlCLFFBQVEsT0FBTyxRQUFRO0FBQzdDLGFBQVMsS0FBSyxNQUFNLEtBQUssb0JBQW9CLFFBQVEsT0FBTyxRQUFRLENBQUM7QUFDckUsWUFBUSxJQUFJLCtCQUErQixRQUFRLEtBQUssR0FBRztBQUFBLEVBQzdEO0FBRUEsU0FBTyxNQUFNLFNBQVMsUUFBUSxRQUFNLEdBQUcsQ0FBQztBQUMxQztBQU9BLGVBQXNCLFdBQ3BCLFFBQ0EsUUFDZTtBQUNmLGFBQVcsUUFBUSxPQUFPLFVBQVUsUUFBUTtBQUMxQyxRQUFJO0FBQ0YsWUFBTSxRQUFRLE1BQU0sT0FBTyxDQUFDO0FBQUEsSUFDOUIsU0FBUyxLQUFLO0FBQ1osY0FBUSxNQUFNLDJCQUEyQixHQUFHO0FBQUEsSUFDOUM7QUFBQSxFQUNGO0FBQ0Y7QUFTQSxTQUFTLGFBQWEsS0FBdUI7QUFDM0MsTUFBSSxDQUFDLElBQUksS0FBSyxFQUFHLFFBQU8sQ0FBQztBQUV6QixRQUFNLFFBQVEsSUFBSSxRQUFRLFlBQVksRUFBRSxFQUFFLEtBQUs7QUFDL0MsTUFBSSxDQUFDLE1BQU8sUUFBTyxDQUFDO0FBRXBCLFNBQU8sTUFBTSxNQUFNLG1CQUFtQixFQUFFLElBQUksT0FBSyxFQUFFLEtBQUssQ0FBQyxFQUFFLE9BQU8sT0FBTyxFQUFFLElBQUksVUFBUTtBQUVyRixVQUFNLFFBQVEsS0FBSyxRQUFRLEdBQUc7QUFDOUIsVUFBTSxXQUFXLEtBQUssUUFBUSxHQUFHO0FBQ2pDLFFBQUksYUFBYSxHQUFJLFFBQU8sRUFBRSxNQUFNLE1BQU0sTUFBTSxNQUFNO0FBRXRELFVBQU0sT0FBTyxLQUFLLE1BQU0sR0FBRyxRQUFRLEVBQUUsS0FBSztBQUMxQyxVQUFNLE9BQU8sS0FBSyxNQUFNLFdBQVcsQ0FBQztBQUVwQyxRQUFJLFVBQVUsSUFBSTtBQUNoQixhQUFPLEVBQUUsTUFBTSxNQUFNLEtBQUssS0FBSyxFQUFFO0FBQUEsSUFDbkMsT0FBTztBQUNMLFlBQU0sT0FBTyxLQUFLLE1BQU0sV0FBVyxHQUFHLEtBQUssRUFBRSxLQUFLO0FBQ2xELFlBQU0sYUFBYSxLQUFLLE1BQU0sUUFBUSxDQUFDLEVBQUUsS0FBSztBQUM5QyxZQUFNLGNBQXdCLEVBQUUsTUFBTSxRQUFRLEtBQUssV0FBVztBQUM5RCxhQUFPLEVBQUUsTUFBTSxNQUFNLFNBQVMsWUFBWTtBQUFBLElBQzVDO0FBQUEsRUFDRixDQUFDO0FBQ0g7OztBRS9KQTtBQWNPLFNBQVMseUJBQ2QsTUFDQSxTQUNBLFFBQ0EsUUFDWTtBQUNaLE1BQUksUUFBUSxXQUFXLEtBQUssT0FBTyxXQUFXLEdBQUc7QUFFL0MsV0FBTyxNQUFNO0FBQUEsSUFBQztBQUFBLEVBQ2hCO0FBRUEsTUFBSSxrQkFBa0M7QUFFdEMsUUFBTSxXQUFXLElBQUk7QUFBQSxJQUNuQixDQUFDLFlBQVk7QUFHWCxpQkFBVyxTQUFTLFNBQVM7QUFDM0IsY0FBTSxrQkFBa0IsTUFBTTtBQUU5QixZQUFJLG1CQUFtQixvQkFBb0IsTUFBTTtBQUUvQyw0QkFBa0I7QUFDbEIsc0JBQVksU0FBUyxNQUFNO0FBQUEsUUFDN0IsV0FBVyxDQUFDLG1CQUFtQixvQkFBb0IsTUFBTTtBQUV2RCw0QkFBa0I7QUFDbEIscUJBQVcsUUFBUSxNQUFNO0FBQUEsUUFDM0IsV0FBVyxvQkFBb0IsTUFBTTtBQUVuQyw0QkFBa0I7QUFBQSxRQUNwQjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQTtBQUFBO0FBQUEsTUFFRSxXQUFXO0FBQUEsSUFDYjtBQUFBLEVBQ0Y7QUFFQSxXQUFTLFFBQVEsSUFBSTtBQUNyQixVQUFRLElBQUksdUNBQXdDLEtBQXFCLE1BQU0sS0FBSyxPQUFPO0FBRTNGLFNBQU8sTUFBTTtBQUNYLGFBQVMsV0FBVztBQUNwQixZQUFRLElBQUkseUNBQXlDO0FBQUEsRUFDdkQ7QUFDRjtBQUVBLFNBQVMsWUFBWSxPQUFzQixRQUFnQztBQUN6RSxRQUFNLE1BQU0sT0FBTztBQUVuQixhQUFXLFFBQVEsT0FBTztBQUV4QixRQUFJLEtBQUssTUFBTTtBQUNiLFlBQU0sU0FBUyxRQUFRLFNBQVMsRUFBRSxNQUFNLFFBQVEsS0FBSyxLQUFLLEtBQUssR0FBRyxHQUFHLENBQUM7QUFDdEUsVUFBSSxDQUFDLFFBQVE7QUFDWCxnQkFBUSxJQUFJLGtDQUFrQyxLQUFLLElBQUksRUFBRTtBQUN6RDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBRUEsWUFBUSxLQUFLLE1BQU0sR0FBRyxFQUFFLE1BQU0sU0FBTztBQUNuQyxjQUFRLE1BQU0sNEJBQTRCLEdBQUc7QUFBQSxJQUMvQyxDQUFDO0FBQUEsRUFDSDtBQUNGO0FBRUEsU0FBUyxXQUFXLFFBQW1CLFFBQWdDO0FBQ3JFLFFBQU0sTUFBTSxPQUFPO0FBRW5CLGFBQVcsUUFBUSxRQUFRO0FBQ3pCLFlBQVEsTUFBTSxHQUFHLEVBQUUsTUFBTSxTQUFPO0FBQzlCLGNBQVEsTUFBTSwyQkFBMkIsR0FBRztBQUFBLElBQzlDLENBQUM7QUFBQSxFQUNIO0FBQ0Y7OztBQ3pGQTtBQXVCTyxTQUFTLHFCQUNkLGVBQ0EsVUFDQSxRQUNNO0FBQ04sYUFBVyxXQUFXLFVBQVU7QUFFOUIsVUFBTSxhQUFhLFFBQVEsT0FBTyxRQUFRLE9BQU8sRUFBRTtBQUVuRCxRQUFJLGVBQWUsY0FBZTtBQUVsQyxVQUFNLE1BQU0sT0FBTztBQUduQixRQUFJLFFBQVEsTUFBTTtBQUNoQixZQUFNLFNBQVMsUUFBUSxTQUFTLEVBQUUsTUFBTSxRQUFRLEtBQUssUUFBUSxLQUFLLEdBQUcsR0FBRyxDQUFDO0FBQ3pFLFVBQUksQ0FBQyxPQUFRO0FBQUEsSUFDZjtBQUdBLFlBQVEsUUFBUSxNQUFNLEdBQUcsRUFBRSxNQUFNLFNBQU87QUFDdEMsY0FBUSxNQUFNLDZCQUE2QixRQUFRLE1BQU0sTUFBTSxHQUFHO0FBQUEsSUFDcEUsQ0FBQztBQUFBLEVBQ0g7QUFDRjtBQVVPLFNBQVMsNkJBQ2QsU0FDQSxRQUNBLFFBQ007QUFDTixTQUFPLE1BQU07QUFDWCxVQUFNLE1BQU0sT0FBTztBQUduQixVQUFNLFlBQVksUUFBUSxPQUFPLFFBQVEsT0FBTyxFQUFFO0FBQ2xELFFBQUksVUFBVSxTQUFTO0FBRXZCLFFBQUksUUFBUSxNQUFNO0FBQ2hCLFlBQU0sU0FBUyxRQUFRLFNBQVMsRUFBRSxNQUFNLFFBQVEsS0FBSyxRQUFRLEtBQUssR0FBRyxHQUFHLENBQUM7QUFDekUsVUFBSSxDQUFDLE9BQVE7QUFBQSxJQUNmO0FBRUEsWUFBUSxRQUFRLE1BQU0sR0FBRyxFQUFFLE1BQU0sU0FBTztBQUN0QyxjQUFRLE1BQU0sNkJBQTZCLFFBQVEsTUFBTSxpQkFBaUIsR0FBRztBQUFBLElBQy9FLENBQUM7QUFBQSxFQUNILENBQUM7QUFDSDs7O0FDckZPLElBQU0sbUJBQU4sY0FBK0IsWUFBWTtBQUFBLEVBQ3ZDLFdBQVcsSUFBSSxnQkFBZ0I7QUFBQSxFQUMvQixVQUFXLElBQUksZUFBZTtBQUFBLEVBRS9CLFVBQThCO0FBQUEsRUFDOUIsVUFBZ0M7QUFBQSxFQUNoQyxPQUE4QjtBQUFBO0FBQUEsRUFHOUIsWUFBK0IsQ0FBQztBQUFBO0FBQUEsRUFHaEMsV0FBaUMsb0JBQUksSUFBSTtBQUFBO0FBQUEsRUFHekMsWUFBb0Q7QUFBQSxFQUNwRCxZQUF1RTtBQUFBLEVBRS9FLElBQUksU0FBK0I7QUFBRSxXQUFPLEtBQUs7QUFBQSxFQUFRO0FBQUEsRUFDekQsSUFBSSxTQUErQjtBQUFFLFdBQU8sS0FBSztBQUFBLEVBQVE7QUFBQSxFQUN6RCxJQUFJLFVBQStCO0FBQUUsV0FBTyxLQUFLO0FBQUEsRUFBSztBQUFBLEVBRXRELFdBQVcscUJBQStCO0FBQUUsV0FBTyxDQUFDO0FBQUEsRUFBRTtBQUFBLEVBRXRELG9CQUEwQjtBQUN4QixtQkFBZSxNQUFNLEtBQUssTUFBTSxDQUFDO0FBQUEsRUFDbkM7QUFBQSxFQUVBLHVCQUE2QjtBQUMzQixTQUFLLFVBQVU7QUFBQSxFQUNqQjtBQUFBO0FBQUEsRUFJQSxNQUFjLFFBQXVCO0FBQ25DLFlBQVEsSUFBSSwyQ0FBMkMsS0FBSyxNQUFNLFNBQVM7QUFNM0UsU0FBSywyQkFBMkI7QUFHaEMsU0FBSyxVQUFVLFdBQVcsSUFBSTtBQUM5QixjQUFVLEtBQUssT0FBTztBQUd0QixVQUFNLEtBQUssYUFBYSxLQUFLLE9BQU87QUFHcEMsU0FBSyxVQUFVLEtBQUssVUFBVSxLQUFLLE9BQU87QUFHMUMsU0FBSyxPQUFPO0FBQUEsTUFDVjtBQUFBLE1BQ0EsS0FBSztBQUFBLE1BQ0wsS0FBSztBQUFBLE1BQ0wsRUFBRSxLQUFLLE9BQUssS0FBSyxXQUFXLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxNQUFNLEtBQUssV0FBVyxHQUFHLENBQUMsRUFBRTtBQUFBLElBQ3ZFO0FBRUEscUJBQWlCLEtBQUssU0FBUyxLQUFLLFFBQVE7QUFFNUMsU0FBSyxVQUFVO0FBQUEsTUFDYixrQkFBa0IsS0FBSyxTQUFTLE1BQU0sTUFBTSxLQUFLLElBQUs7QUFBQSxJQUN4RDtBQUdBLFNBQUssVUFBVTtBQUFBLE1BQ2I7QUFBQSxRQUNFO0FBQUEsUUFDQSxLQUFLLFFBQVEsVUFBVTtBQUFBLFFBQ3ZCLEtBQUssUUFBUSxVQUFVO0FBQUEsUUFDdkIsTUFBTSxLQUFLO0FBQUEsTUFDYjtBQUFBLElBQ0Y7QUFLQSxRQUFJLEtBQUssV0FBVztBQUNsQixpQkFBVyxXQUFXLEtBQUssUUFBUSxVQUFVO0FBQzNDLHFDQUE2QixTQUFTLEtBQUssV0FBVyxNQUFNLEtBQUssSUFBSztBQUFBLE1BQ3hFO0FBQ0EsY0FBUSxJQUFJLGVBQWUsS0FBSyxRQUFRLFNBQVMsTUFBTSwrQkFBK0I7QUFBQSxJQUN4RixPQUFPO0FBQ0wsY0FBUSxJQUFJLGVBQWUsS0FBSyxRQUFRLFNBQVMsTUFBTSxtQ0FBbUM7QUFBQSxJQUM1RjtBQUtBLFVBQU0sV0FBVyxLQUFLLFNBQVMsTUFBTSxLQUFLLElBQUs7QUFFL0MsWUFBUSxJQUFJLGdCQUFnQixLQUFLLE1BQU0sU0FBUztBQUFBLEVBQ2xEO0FBQUEsRUFFUSxZQUFrQjtBQUN4QixZQUFRLElBQUksMkNBQTJDLEtBQUssTUFBTSxTQUFTO0FBQzNFLGVBQVcsV0FBVyxLQUFLLFVBQVcsU0FBUTtBQUM5QyxTQUFLLFlBQVksQ0FBQztBQUNsQixTQUFLLFVBQVk7QUFDakIsU0FBSyxVQUFZO0FBQ2pCLFNBQUssT0FBWTtBQUFBLEVBQ25CO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsRUFlUSw2QkFBbUM7QUFDekMsZUFBVyxRQUFRLE1BQU0sS0FBSyxLQUFLLFVBQVUsR0FBRztBQUU5QyxZQUFNLElBQUksS0FBSyxLQUFLLE1BQU0sK0JBQStCO0FBQ3pELFVBQUksQ0FBQyxFQUFHO0FBQ1IsWUFBTSxNQUFNLEVBQUUsQ0FBQyxFQUNaLFFBQVEsYUFBYSxDQUFDLEdBQUcsT0FBZSxHQUFHLFlBQVksQ0FBQztBQUMzRCxVQUFJO0FBR0YsY0FBTSxRQUFRLElBQUksU0FBUyxXQUFXLEtBQUssS0FBSyxHQUFHLEVBQUU7QUFDckQsYUFBSyxTQUFTLElBQUksS0FBSyxLQUFLO0FBQzVCLGdCQUFRLElBQUksaUJBQWlCLEdBQUcsTUFBTSxLQUFLO0FBQUEsTUFDN0MsUUFBUTtBQUVOLGFBQUssU0FBUyxJQUFJLEtBQUssS0FBSyxLQUFLO0FBQ2pDLGdCQUFRLElBQUksaUJBQWlCLEdBQUcsWUFBWSxLQUFLLEtBQUs7QUFBQSxNQUN4RDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFFUSxXQUFXLE1BQXVCO0FBRXhDLFFBQUksS0FBSyxXQUFXO0FBQ2xCLFVBQUk7QUFBRSxlQUFPLEtBQUssVUFBVSxJQUFJLEVBQUU7QUFBQSxNQUFNLFFBQVE7QUFBQSxNQUFxQjtBQUFBLElBQ3ZFO0FBSUEsUUFBSSxLQUFLLFNBQVMsSUFBSSxJQUFJLEVBQUcsUUFBTyxLQUFLLFNBQVMsSUFBSSxJQUFJO0FBQzFELFFBQUksS0FBSyxTQUFTLElBQUksS0FBSyxZQUFZLENBQUMsRUFBRyxRQUFPLEtBQUssU0FBUyxJQUFJLEtBQUssWUFBWSxDQUFDO0FBQ3RGLFdBQU87QUFBQSxFQUNUO0FBQUEsRUFFUSxXQUFXLE1BQWMsT0FBc0I7QUFDckQsVUFBTSxPQUFPLEtBQUssU0FBUyxJQUFJLElBQUk7QUFDbkMsU0FBSyxTQUFTLElBQUksTUFBTSxLQUFLO0FBQzdCLFlBQVEsSUFBSSxVQUFVLElBQUksTUFBTSxLQUFLO0FBR3JDLFFBQUksS0FBSyxXQUFXO0FBQ2xCLFVBQUk7QUFDRixjQUFNLE1BQU0sS0FBSyxVQUFtQixNQUFNLEtBQUs7QUFDL0MsWUFBSSxRQUFRO0FBQUEsTUFDZCxRQUFRO0FBQUEsTUFBNkM7QUFBQSxJQUN2RDtBQUdBLFFBQUksU0FBUyxTQUFTLEtBQUssV0FBVyxLQUFLLFFBQVEsQ0FBQyxLQUFLLFdBQVc7QUFDbEUsMkJBQXFCLE1BQU0sS0FBSyxRQUFRLFVBQVUsTUFBTSxLQUFLLElBQUs7QUFBQSxJQUNwRTtBQUFBLEVBQ0Y7QUFBQTtBQUFBLEVBSUEsTUFBYyxhQUFhLFFBQWtDO0FBQzNELFFBQUksT0FBTyxRQUFRLFdBQVcsRUFBRztBQUNqQyxVQUFNLFFBQVE7QUFBQSxNQUNaLE9BQU8sUUFBUTtBQUFBLFFBQUksVUFDakIsV0FBVyxLQUFLLFNBQVM7QUFBQSxVQUN2QixHQUFJLEtBQUssT0FBTyxFQUFFLE1BQU0sS0FBSyxLQUFLLElBQUksQ0FBQztBQUFBLFVBQ3ZDLEdBQUksS0FBSyxNQUFPLEVBQUUsS0FBTSxLQUFLLElBQUssSUFBSSxDQUFDO0FBQUEsUUFDekMsQ0FBQyxFQUFFLE1BQU0sU0FBTyxRQUFRLEtBQUssNkJBQTZCLEdBQUcsQ0FBQztBQUFBLE1BQ2hFO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQTtBQUFBLEVBSVEsVUFBVSxRQUFpQztBQUNqRCxRQUFJLEtBQUssR0FBRyxPQUFPO0FBRW5CLFVBQU0sV0FBVyxDQUFDLE1BQWMsVUFBMkI7QUFDekQsVUFBSTtBQUFFO0FBQU0sZUFBTyxTQUFTLElBQUk7QUFBQSxNQUFFLFNBQzNCLEdBQUc7QUFDUjtBQUNBLGdCQUFRLE1BQU0sd0JBQXdCLEtBQUssS0FBSyxDQUFDO0FBQ2pELGVBQU8sRUFBRSxNQUFNLFFBQVEsS0FBSyxHQUFHO0FBQUEsTUFDakM7QUFBQSxJQUNGO0FBRUEsVUFBTSxTQUF1QjtBQUFBLE1BQzNCLFVBQVUsT0FBTyxTQUFTLElBQUksUUFBTTtBQUFBLFFBQ2xDLE1BQU0sRUFBRTtBQUFBLFFBQU0sT0FBTyxFQUFFO0FBQUEsUUFBTyxTQUFTLEVBQUU7QUFBQSxRQUN6QyxNQUFNLFNBQVMsRUFBRSxNQUFNLFlBQVksRUFBRSxJQUFJLEdBQUc7QUFBQSxNQUM5QyxFQUFFO0FBQUEsTUFDRixVQUFVLE9BQU8sUUFBUSxJQUFJLFFBQU07QUFBQSxRQUNqQyxPQUFPLEVBQUU7QUFBQSxRQUNULE1BQU0sU0FBUyxFQUFFLE1BQU0sYUFBYSxFQUFFLElBQUksR0FBRztBQUFBLE1BQy9DLEVBQUU7QUFBQSxNQUNGLFVBQVUsT0FBTyxTQUFTLElBQUksUUFBTTtBQUFBLFFBQ2xDLFFBQVEsRUFBRTtBQUFBLFFBQU0sTUFBTSxFQUFFO0FBQUEsUUFDeEIsTUFBTSxTQUFTLEVBQUUsTUFBTSxjQUFjLEVBQUUsSUFBSSxHQUFHO0FBQUEsTUFDaEQsRUFBRTtBQUFBLE1BQ0YsV0FBVztBQUFBLFFBQ1QsUUFBUyxPQUFPLE9BQU8sSUFBSSxPQUFLLFNBQVMsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUFBLFFBQzNELFNBQVMsT0FBTyxRQUFRLElBQUksUUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLE1BQU0sU0FBUyxFQUFFLE1BQU0sVUFBVSxFQUFFLEVBQUU7QUFBQSxRQUN2RixRQUFTLE9BQU8sT0FBTyxJQUFJLE9BQUssU0FBUyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQUEsTUFDN0Q7QUFBQSxJQUNGO0FBRUEsVUFBTSxRQUFRLEtBQUs7QUFDbkIsWUFBUSxJQUFJLGlCQUFpQixFQUFFLElBQUksS0FBSyw4QkFBOEIsT0FBTyxJQUFJLEtBQUssSUFBSSxhQUFhLEVBQUUsRUFBRTtBQUMzRyxXQUFPO0FBQUEsRUFDVDtBQUFBO0FBQUEsRUFJQSxnQkFBZ0IsS0FHUDtBQUNQLFNBQUssWUFBWSxJQUFJO0FBQ3JCLFNBQUssWUFBWSxJQUFJO0FBQ3JCLFlBQVEsSUFBSSxtQ0FBbUMsS0FBSyxFQUFFO0FBQUEsRUFDeEQ7QUFBQSxFQUVBLHFCQUEyQjtBQUN6QixTQUFLLFlBQVk7QUFDakIsU0FBSyxZQUFZO0FBQUEsRUFDbkI7QUFBQSxFQUVBLElBQUksV0FBVztBQUFFLFdBQU8sS0FBSztBQUFBLEVBQVU7QUFBQSxFQUN2QyxJQUFJLFdBQVk7QUFBRSxXQUFPLEtBQUs7QUFBQSxFQUFVO0FBQUE7QUFBQTtBQUFBLEVBS3hDLEtBQUssT0FBZSxVQUFxQixDQUFDLEdBQVM7QUFDakQsU0FBSyxjQUFjLElBQUksWUFBWSxPQUFPO0FBQUEsTUFDeEMsUUFBUSxFQUFFLFFBQVE7QUFBQSxNQUFHLFNBQVM7QUFBQSxNQUFPLFVBQVU7QUFBQSxJQUNqRCxDQUFDLENBQUM7QUFBQSxFQUNKO0FBQUE7QUFBQSxFQUdBLE1BQU0sS0FBSyxTQUFpQixPQUFnQyxDQUFDLEdBQWtCO0FBQzdFLFFBQUksQ0FBQyxLQUFLLE1BQU07QUFBRSxjQUFRLEtBQUssMkJBQTJCO0FBQUc7QUFBQSxJQUFPO0FBQ3BFLFVBQU0sRUFBRSxZQUFBQSxZQUFXLElBQUksTUFBTTtBQUM3QixVQUFNQSxZQUFXLFNBQVMsTUFBTSxLQUFLLElBQUk7QUFBQSxFQUMzQztBQUFBO0FBQUEsRUFHQSxPQUFPLE1BQXVCO0FBQzVCLFdBQU8sS0FBSyxXQUFXLElBQUk7QUFBQSxFQUM3QjtBQUNGO0FBRUEsZUFBZSxPQUFPLHNCQUFzQixnQkFBZ0I7OztBQ3JRckQsSUFBTSxlQUFOLGNBQTJCLFlBQVk7QUFBQTtBQUFBLEVBRzVDLElBQUksY0FBc0I7QUFDeEIsV0FBTyxLQUFLLGFBQWEsTUFBTSxHQUFHLEtBQUssS0FBSztBQUFBLEVBQzlDO0FBQUE7QUFBQSxFQUdBLElBQUksVUFBa0I7QUFDcEIsV0FBTyxLQUFLLGFBQWEsTUFBTSxHQUFHLEtBQUssS0FBSztBQUFBLEVBQzlDO0FBQUE7QUFBQSxFQUdBLElBQUksWUFBMkI7QUFDN0IsV0FBTyxLQUFLLGFBQWEsT0FBTyxHQUFHLEtBQUssS0FBSztBQUFBLEVBQy9DO0FBQUE7QUFBQSxFQUdBLElBQUksU0FBaUI7QUFDbkIsV0FBTyxLQUFLLGFBQWEsSUFBSSxHQUFHLEtBQUssS0FBSztBQUFBLEVBQzVDO0FBQUEsRUFFQSxvQkFBMEI7QUFFeEIsWUFBUSxJQUFJLHFDQUFxQyxLQUFLLGVBQWUsV0FBVztBQUFBLEVBQ2xGO0FBQ0Y7QUFFQSxlQUFlLE9BQU8saUJBQWlCLFlBQVk7OztBQ2pDNUMsSUFBTSxVQUFOLGNBQXNCLFlBQVk7QUFBQSxFQUN2QyxJQUFJLFlBQW9CO0FBQ3RCLFdBQU8sS0FBSyxhQUFhLE1BQU0sR0FBRyxLQUFLLEtBQUs7QUFBQSxFQUM5QztBQUFBO0FBQUEsRUFHQSxJQUFJLGFBQXFCO0FBQ3ZCLFdBQU8sS0FBSyxhQUFhLFFBQVEsR0FBRyxLQUFLLEtBQUs7QUFBQSxFQUNoRDtBQUFBLEVBRUEsb0JBQTBCO0FBQ3hCLFlBQVEsSUFBSSxnQ0FBZ0MsS0FBSyxhQUFhLFdBQVc7QUFBQSxFQUMzRTtBQUNGO0FBRUEsZUFBZSxPQUFPLFlBQVksT0FBTzs7O0FDWmxDLElBQU0sV0FBTixjQUF1QixZQUFZO0FBQUE7QUFBQSxFQUV4QyxJQUFJLGFBQXFCO0FBQ3ZCLFdBQU8sS0FBSyxhQUFhLE1BQU0sR0FBRyxLQUFLLEtBQUs7QUFBQSxFQUM5QztBQUFBO0FBQUEsRUFHQSxJQUFJLFlBQW9CO0FBQ3RCLFdBQU8sS0FBSyxXQUFXLFFBQVEsT0FBTyxFQUFFO0FBQUEsRUFDMUM7QUFBQSxFQUVBLElBQUksV0FBMEI7QUFDNUIsV0FBTyxLQUFLLGFBQWEsTUFBTSxHQUFHLEtBQUssS0FBSztBQUFBLEVBQzlDO0FBQUEsRUFFQSxJQUFJLGFBQXFCO0FBQ3ZCLFdBQU8sS0FBSyxhQUFhLFFBQVEsR0FBRyxLQUFLLEtBQUs7QUFBQSxFQUNoRDtBQUFBLEVBRUEsb0JBQTBCO0FBQ3hCLFlBQVEsSUFBSSxpQ0FBaUMsS0FBSyxjQUFjLFdBQVc7QUFBQSxFQUM3RTtBQUNGO0FBRUEsZUFBZSxPQUFPLGFBQWEsUUFBUTs7O0FDMUJwQyxJQUFNLFNBQU4sY0FBcUIsWUFBWTtBQUFBLEVBQ3RDLElBQUksVUFBa0I7QUFDcEIsV0FBTyxLQUFLLGFBQWEsS0FBSyxHQUFHLEtBQUssS0FBSztBQUFBLEVBQzdDO0FBQUEsRUFFQSxvQkFBMEI7QUFDeEIsWUFBUSxJQUFJLG9DQUFvQyxLQUFLLE9BQU87QUFBQSxFQUM5RDtBQUNGO0FBZU8sSUFBTSxVQUFOLGNBQXNCLFlBQVk7QUFBQSxFQUN2QyxJQUFJLFdBQTBCO0FBQzVCLFdBQU8sS0FBSyxhQUFhLE1BQU0sR0FBRyxLQUFLLEtBQUs7QUFBQSxFQUM5QztBQUFBLEVBRUEsSUFBSSxVQUFrQjtBQUNwQixXQUFPLEtBQUssYUFBYSxLQUFLLEdBQUcsS0FBSyxLQUFLO0FBQUEsRUFDN0M7QUFBQSxFQUVBLG9CQUEwQjtBQUN4QixZQUFRLElBQUksc0NBQXNDLEtBQUssWUFBWSxRQUFRO0FBQUEsRUFDN0U7QUFDRjtBQWFPLElBQU0sU0FBTixjQUFxQixZQUFZO0FBQUEsRUFDdEMsSUFBSSxVQUFrQjtBQUNwQixXQUFPLEtBQUssYUFBYSxLQUFLLEdBQUcsS0FBSyxLQUFLO0FBQUEsRUFDN0M7QUFBQSxFQUVBLG9CQUEwQjtBQUN4QixZQUFRLElBQUksb0NBQW9DLEtBQUssT0FBTztBQUFBLEVBQzlEO0FBQ0Y7QUFJQSxlQUFlLE9BQU8sV0FBWSxNQUFNO0FBQ3hDLGVBQWUsT0FBTyxZQUFZLE9BQU87QUFDekMsZUFBZSxPQUFPLFdBQVksTUFBTTs7O0FDckRqQyxJQUFNLFlBQU4sY0FBd0IsWUFBWTtBQUFBO0FBQUEsRUFFekMsSUFBSSxhQUE0QjtBQUM5QixXQUFPLEtBQUssYUFBYSxNQUFNLEdBQUcsS0FBSyxLQUFLO0FBQUEsRUFDOUM7QUFBQTtBQUFBLEVBR0EsSUFBSSxZQUEyQjtBQUM3QixXQUFPLEtBQUssYUFBYSxLQUFLLEdBQUcsS0FBSyxLQUFLO0FBQUEsRUFDN0M7QUFBQSxFQUVBLG9CQUEwQjtBQUN4QixVQUFNLE9BQU8sS0FBSyxhQUNkLFNBQVMsS0FBSyxVQUFVLE1BQ3hCLEtBQUssWUFDSCxRQUFRLEtBQUssU0FBUyxNQUN0QjtBQUNOLFlBQVEsSUFBSSxnQ0FBZ0MsSUFBSTtBQUFBLEVBQ2xEO0FBQ0Y7QUFFQSxlQUFlLE9BQU8sY0FBYyxTQUFTOzs7QUNsQjdDLElBQUksbUJBQW1CO0FBRXZCLGVBQXNCLHlCQUF3QztBQUM1RCxNQUFJLGlCQUFrQjtBQUV0QixNQUFJO0FBQ0YsVUFBTSxXQUFXLE1BQU0sT0FBTyxVQUFVO0FBQ3hDLFVBQU0sRUFBRSxVQUFVLElBQUk7QUFXdEIsY0FBVTtBQUFBLE1BQ1IsTUFBTTtBQUFBLE1BQ04sYUFBYTtBQUFBLFFBQ1gsS0FBSztBQUFBLFFBQ0wsT0FBTztBQUFBLE1BQ1Q7QUFBQSxNQUNBLE1BQU0sRUFBRSxJQUFJLFFBQVEsT0FBTyxHQUFHO0FBQzVCLGNBQU0sT0FBTztBQUdiLGFBQUssZ0JBQWdCLEVBQUUsUUFBUSxPQUFPLENBQUM7QUFLdkMsY0FBTSxTQUFTLEtBQUs7QUFDcEIsWUFBSSxVQUFVLE9BQU8sU0FBUyxTQUFTLEdBQUc7QUFDeEMscUJBQVcsV0FBVyxPQUFPLFVBQVU7QUFDckMseUNBQTZCLFNBQVMsUUFBUSxNQUFNLEtBQUssT0FBUTtBQUFBLFVBQ25FO0FBQ0Esa0JBQVEsSUFBSSwyQkFBMkIsT0FBTyxTQUFTLE1BQU0sd0NBQXdDO0FBQUEsUUFDdkc7QUFFQSxnQkFBUSxJQUFJLDhDQUE4QyxHQUFHLE1BQU0sR0FBRyxPQUFPO0FBRTdFLGVBQU8sTUFBTTtBQUNYLGVBQUssbUJBQW1CO0FBQ3hCLGtCQUFRLElBQUksOENBQThDLEdBQUcsTUFBTSxHQUFHLE9BQU87QUFBQSxRQUMvRTtBQUFBLE1BQ0Y7QUFBQSxJQUNGLENBQUM7QUFFRCx1QkFBbUI7QUFDbkIsWUFBUSxJQUFJLGtDQUFrQztBQUFBLEVBRWhELFFBQVE7QUFDTixZQUFRLElBQUksMkRBQTJEO0FBQUEsRUFDekU7QUFDRjs7O0FDckNBLHVCQUF1QjsiLAogICJuYW1lcyI6IFsicnVuQ29tbWFuZCJdCn0K
