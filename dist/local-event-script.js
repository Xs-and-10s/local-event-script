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
    if (first.startsWith("@")) return this.parseAction(text, token);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL21vZHVsZXMvYnVpbHRpbi9hbmltYXRpb24udHMiLCAiLi4vc3JjL3J1bnRpbWUvZXhlY3V0b3IudHMiLCAiLi4vc3JjL3J1bnRpbWUvcmVnaXN0cnkudHMiLCAiLi4vc3JjL21vZHVsZXMvdHlwZXMudHMiLCAiLi4vc3JjL3BhcnNlci9zdHJpcEJvZHkudHMiLCAiLi4vc3JjL3BhcnNlci9yZWFkZXIudHMiLCAiLi4vc3JjL3BhcnNlci90b2tlbml6ZXIudHMiLCAiLi4vc3JjL3BhcnNlci9wYXJzZXIudHMiLCAiLi4vc3JjL3BhcnNlci9pbmRleC50cyIsICIuLi9zcmMvcnVudGltZS93aXJpbmcudHMiLCAiLi4vc3JjL3J1bnRpbWUvc2NvcGUudHMiLCAiLi4vc3JjL3J1bnRpbWUvb2JzZXJ2ZXIudHMiLCAiLi4vc3JjL3J1bnRpbWUvc2lnbmFscy50cyIsICIuLi9zcmMvZWxlbWVudHMvTG9jYWxFdmVudFNjcmlwdC50cyIsICIuLi9zcmMvZWxlbWVudHMvTG9jYWxDb21tYW5kLnRzIiwgIi4uL3NyYy9lbGVtZW50cy9PbkV2ZW50LnRzIiwgIi4uL3NyYy9lbGVtZW50cy9PblNpZ25hbC50cyIsICIuLi9zcmMvZWxlbWVudHMvTGlmZWN5Y2xlLnRzIiwgIi4uL3NyYy9lbGVtZW50cy9Vc2VNb2R1bGUudHMiLCAiLi4vc3JjL2RhdGFzdGFyL3BsdWdpbi50cyIsICIuLi9zcmMvaW5kZXgudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogUGhhc2UgNzogQnVpbHQtaW4gYW5pbWF0aW9uIG1vZHVsZVxuICpcbiAqIEFsbCBwcmltaXRpdmVzIHVzZSB0aGUgV2ViIEFuaW1hdGlvbnMgQVBJIChlbGVtZW50LmFuaW1hdGUoKS5maW5pc2hlZClcbiAqIHNvIHRoZXkgaW50ZWdyYXRlIHdpdGggTEVTJ3MgYXN5bmMtdHJhbnNwYXJlbnQgYHRoZW5gIHNlcXVlbmNpbmc6XG4gKlxuICogICBmYWRlLWluICNzcGxhc2ggMjAwbXMgZWFzZS1vdXQgYW5kXG4gKiAgIHNsaWRlLXVwICNzcGxhc2ggMTgwbXMgZWFzZS1vdXRcbiAqICAgdGhlbiBmaXJlIHNwbGFzaDpyZWFkeSAgICAgICAgICBcdTIxOTAgb25seSBmaXJlcyBhZnRlciBCT1RIIGFuaW1hdGlvbnMgY29tcGxldGVcbiAqXG4gKiBgYW5kYCBcdTIxOTIgUHJvbWlzZS5hbGwgKGNvbmN1cnJlbnQpXG4gKiBgdGhlbmAgXHUyMTkyIHNlcXVlbnRpYWwgYXdhaXQgb24gLmZpbmlzaGVkXG4gKlxuICogVGhlIGV4ZWN1dG9yIGF3YWl0cyBlYWNoIExFU1ByaW1pdGl2ZSByZXR1cm4gdmFsdWUsIHNvIGFuaW1hdGlvblxuICogY29tcGxldGlvbiBpcyBuYXR1cmFsbHkgc2VyaWFsaXplZCB3aXRob3V0IGFueSBzZXRUaW1lb3V0IGhhY2tzLlxuICovXG5cbmltcG9ydCB0eXBlIHsgTEVTTW9kdWxlLCBMRVNQcmltaXRpdmUgfSBmcm9tICcuLi90eXBlcy5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBVdGlsaXR5OiBxdWVyeSBhbGwgbWF0Y2hpbmcgZWxlbWVudHMgd2l0aGluIHRoZSBob3N0IHNjb3BlXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gcXVlcnlBbGwoc2VsZWN0b3I6IHN0cmluZywgaG9zdDogRWxlbWVudCk6IEVsZW1lbnRbXSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgcm9vdCA9IGhvc3QuZ2V0Um9vdE5vZGUoKSBhcyBEb2N1bWVudCB8IFNoYWRvd1Jvb3RcbiAgICBjb25zdCBzY29wZSA9IHJvb3QgaW5zdGFuY2VvZiBEb2N1bWVudCA/IHJvb3QgOiByb290Lm93bmVyRG9jdW1lbnQgPz8gZG9jdW1lbnRcbiAgICByZXR1cm4gQXJyYXkuZnJvbShzY29wZS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSlcbiAgfSBjYXRjaCB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTOmFuaW1hdGlvbl0gSW52YWxpZCBzZWxlY3RvcjogXCIke3NlbGVjdG9yfVwiYClcbiAgICByZXR1cm4gW11cbiAgfVxufVxuXG4vKipcbiAqIENhbmNlbCBhbGwgcnVubmluZyBXZWIgQW5pbWF0aW9ucyBvbiBhbiBlbGVtZW50IGJlZm9yZSBzdGFydGluZyBhIG5ldyBvbmUuXG4gKiBUaGlzIHByZXZlbnRzIHRoZSBvbmUtZnJhbWUgZmxhc2ggdGhhdCBvY2N1cnMgd2hlbiBhIGZpbGw6Zm9yd2FyZHMgYW5pbWF0aW9uXG4gKiBpcyBpbnRlcnJ1cHRlZCBcdTIwMTQgd2l0aG91dCBjYW5jZWxsYXRpb24sIHRoZSBlbGVtZW50IGJyaWVmbHkgcmV2ZXJ0cyB0byBpdHNcbiAqIHVuLWFuaW1hdGVkIHN0YXRlIGFzIHRoZSBvbGQgQW5pbWF0aW9uIGlzIHJlcGxhY2VkLlxuICovXG5mdW5jdGlvbiBjYW5jZWxBbmltYXRpb25zKGVsOiBFbGVtZW50KTogdm9pZCB7XG4gIGZvciAoY29uc3QgYW5pbSBvZiAoZWwgYXMgSFRNTEVsZW1lbnQpLmdldEFuaW1hdGlvbnMoKSkge1xuICAgIGFuaW0uY2FuY2VsKClcbiAgfVxufVxuXG4vKiogQXdhaXRzIGFsbCBBbmltYXRpb24uZmluaXNoZWQgcHJvbWlzZXMuIFJldHVybnMgaW1tZWRpYXRlbHkgaWYgbm8gZWxlbWVudHMgbWF0Y2hlZC4gKi9cbmFzeW5jIGZ1bmN0aW9uIGFuaW1hdGVBbGwoXG4gIGVsczogRWxlbWVudFtdLFxuICBrZXlmcmFtZXM6IEtleWZyYW1lW10sXG4gIG9wdGlvbnM6IEtleWZyYW1lQW5pbWF0aW9uT3B0aW9uc1xuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChlbHMubGVuZ3RoID09PSAwKSByZXR1cm5cbiAgLy8gQ2FuY2VsIGFueSBpbi1wcm9ncmVzcyBvciBmaWxsOmZvcndhcmRzIGFuaW1hdGlvbnMgZmlyc3Qgc28gd2Ugc3RhcnQgY2xlYW4uXG4gIGVscy5mb3JFYWNoKGNhbmNlbEFuaW1hdGlvbnMpXG4gIGF3YWl0IFByb21pc2UuYWxsKFxuICAgIGVscy5tYXAoZWwgPT4gKGVsIGFzIEhUTUxFbGVtZW50KS5hbmltYXRlKGtleWZyYW1lcywgb3B0aW9ucykuZmluaXNoZWQpXG4gIClcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBEaXJlY3Rpb24gaGVscGVyc1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbnR5cGUgRGlyZWN0aW9uID0gJ2xlZnQnIHwgJ3JpZ2h0JyB8ICd1cCcgfCAnZG93bidcblxuZnVuY3Rpb24gc2xpZGVLZXlmcmFtZXMoZGlyOiBEaXJlY3Rpb24sIGVudGVyaW5nOiBib29sZWFuKTogS2V5ZnJhbWVbXSB7XG4gIGNvbnN0IGRpc3RhbmNlID0gJzYwcHgnXG4gIGNvbnN0IHRyYW5zbGF0aW9uczogUmVjb3JkPERpcmVjdGlvbiwgc3RyaW5nPiA9IHtcbiAgICBsZWZ0OiAgYHRyYW5zbGF0ZVgoLSR7ZGlzdGFuY2V9KWAsXG4gICAgcmlnaHQ6IGB0cmFuc2xhdGVYKCR7ZGlzdGFuY2V9KWAsXG4gICAgdXA6ICAgIGB0cmFuc2xhdGVZKC0ke2Rpc3RhbmNlfSlgLFxuICAgIGRvd246ICBgdHJhbnNsYXRlWSgke2Rpc3RhbmNlfSlgLFxuICB9XG4gIGNvbnN0IHRyYW5zbGF0ZSA9IHRyYW5zbGF0aW9uc1tkaXJdXG4gIGlmIChlbnRlcmluZykge1xuICAgIHJldHVybiBbXG4gICAgICB7IG9wYWNpdHk6IDAsIHRyYW5zZm9ybTogdHJhbnNsYXRlIH0sXG4gICAgICB7IG9wYWNpdHk6IDEsIHRyYW5zZm9ybTogJ25vbmUnIH0sXG4gICAgXVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBbXG4gICAgICB7IG9wYWNpdHk6IDEsIHRyYW5zZm9ybTogJ25vbmUnIH0sXG4gICAgICB7IG9wYWNpdHk6IDAsIHRyYW5zZm9ybTogdHJhbnNsYXRlIH0sXG4gICAgXVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gQ29yZSBwcmltaXRpdmVzXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgZmFkZUluOiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIF9vcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBhd2FpdCBhbmltYXRlQWxsKGVscyxcbiAgICBbeyBvcGFjaXR5OiAwIH0sIHsgb3BhY2l0eTogMSB9XSxcbiAgICB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdmb3J3YXJkcycgfVxuICApXG59XG5cbmNvbnN0IGZhZGVPdXQ6IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgX29wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLFxuICAgIFt7IG9wYWNpdHk6IDEgfSwgeyBvcGFjaXR5OiAwIH1dLFxuICAgIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9XG4gIClcbn1cblxuY29uc3Qgc2xpZGVJbjogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBvcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IGZyb20gPSAob3B0c1snZnJvbSddIGFzIERpcmVjdGlvbiB8IHVuZGVmaW5lZCkgPz8gJ3JpZ2h0J1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgYXdhaXQgYW5pbWF0ZUFsbChlbHMsIHNsaWRlS2V5ZnJhbWVzKGZyb20sIHRydWUpLCB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdmb3J3YXJkcycgfSlcbn1cblxuY29uc3Qgc2xpZGVPdXQ6IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCB0byA9IChvcHRzWyd0byddIGFzIERpcmVjdGlvbiB8IHVuZGVmaW5lZCkgPz8gJ2xlZnQnXG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBhd2FpdCBhbmltYXRlQWxsKGVscywgc2xpZGVLZXlmcmFtZXModG8sIGZhbHNlKSwgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnIH0pXG59XG5cbmNvbnN0IHNsaWRlVXA6IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgX29wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLCBzbGlkZUtleWZyYW1lcygndXAnLCB0cnVlKSwgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnIH0pXG59XG5cbmNvbnN0IHNsaWRlRG93bjogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBfb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgYXdhaXQgYW5pbWF0ZUFsbChlbHMsIHNsaWRlS2V5ZnJhbWVzKCdkb3duJywgZmFsc2UpLCB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdmb3J3YXJkcycgfSlcbn1cblxuLyoqXG4gKiBwdWxzZSBcdTIwMTQgYnJpZWYgc2NhbGUgKyBvcGFjaXR5IHB1bHNlIHRvIGRyYXcgYXR0ZW50aW9uIHRvIHVwZGF0ZWQgaXRlbXMuXG4gKiBVc2VkIGZvciBEMyBcInVwZGF0ZVwiIHBoYXNlOiBpdGVtcyB3aG9zZSBjb250ZW50IGNoYW5nZWQgZ2V0IGEgdmlzdWFsIHBpbmcuXG4gKi9cbmNvbnN0IHB1bHNlOiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIF9vcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBhd2FpdCBhbmltYXRlQWxsKGVscywgW1xuICAgIHsgb3BhY2l0eTogMSwgICAgdHJhbnNmb3JtOiAnc2NhbGUoMSknIH0sXG4gICAgeyBvcGFjaXR5OiAwLjc1LCB0cmFuc2Zvcm06ICdzY2FsZSgxLjAzKScsIG9mZnNldDogMC40IH0sXG4gICAgeyBvcGFjaXR5OiAxLCAgICB0cmFuc2Zvcm06ICdzY2FsZSgxKScgfSxcbiAgXSwgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnbm9uZScgfSlcbn1cblxuLyoqXG4gKiBzdGFnZ2VyLWVudGVyIFx1MjAxNCBydW5zIHNsaWRlSW4gb24gZWFjaCBtYXRjaGVkIGVsZW1lbnQgaW4gc2VxdWVuY2UsXG4gKiBvZmZzZXQgYnkgYGdhcGAgbWlsbGlzZWNvbmRzIGJldHdlZW4gZWFjaC5cbiAqXG4gKiBPcHRpb25zOlxuICogICBnYXA6IE5tcyAgIFx1MjAxNCBkZWxheSBiZXR3ZWVuIGVhY2ggZWxlbWVudCAoZGVmYXVsdDogNDBtcylcbiAqICAgZnJvbTogZGlyICBcdTIwMTQgJ2xlZnQnIHwgJ3JpZ2h0JyB8ICd1cCcgfCAnZG93bicgKGRlZmF1bHQ6ICdyaWdodCcpXG4gKlxuICogQWxsIGFuaW1hdGlvbnMgYXJlIHN0YXJ0ZWQgdG9nZXRoZXIgKFByb21pc2UuYWxsKSBidXQgZWFjaCBoYXMgYW5cbiAqIGluY3JlYXNpbmcgYGRlbGF5YCBcdTIwMTQgdGhpcyBnaXZlcyB0aGUgc3RhZ2dlciBlZmZlY3Qgd2hpbGUga2VlcGluZ1xuICogdGhlIHRvdGFsIFByb21pc2Utc2V0dGxlZCB0aW1lID0gZHVyYXRpb24gKyAobi0xKSAqIGdhcC5cbiAqL1xuY29uc3Qgc3RhZ2dlckVudGVyOiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIG9wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGlmIChlbHMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICBjb25zdCBnYXAgID0gcGFyc2VNcyhvcHRzWydnYXAnXSBhcyBzdHJpbmcgfCBudW1iZXIgfCB1bmRlZmluZWQsIDQwKVxuICBjb25zdCBmcm9tID0gKG9wdHNbJ2Zyb20nXSBhcyBEaXJlY3Rpb24gfCB1bmRlZmluZWQpID8/ICdyaWdodCdcblxuICBlbHMuZm9yRWFjaChjYW5jZWxBbmltYXRpb25zKVxuICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBlbHMubWFwKChlbCwgaSkgPT5cbiAgICAgIChlbCBhcyBIVE1MRWxlbWVudCkuYW5pbWF0ZShcbiAgICAgICAgc2xpZGVLZXlmcmFtZXMoZnJvbSwgdHJ1ZSksXG4gICAgICAgIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJywgZGVsYXk6IGkgKiBnYXAgfVxuICAgICAgKS5maW5pc2hlZFxuICAgIClcbiAgKVxufVxuXG4vKipcbiAqIHN0YWdnZXItZXhpdCBcdTIwMTQgcnVucyBzbGlkZU91dCBvbiBlYWNoIG1hdGNoZWQgZWxlbWVudCBpbiBzZXF1ZW5jZS5cbiAqXG4gKiBPcHRpb25zOlxuICogICBnYXA6IE5tcyAgICAgICAgICBcdTIwMTQgZGVsYXkgYmV0d2VlbiBlYWNoIGVsZW1lbnQgKGRlZmF1bHQ6IDIwbXMpXG4gKiAgIGRpcmVjdGlvbjogcmV2ZXJzZSBcdTIwMTQgcHJvY2VzcyBlbGVtZW50cyBpbiByZXZlcnNlIG9yZGVyXG4gKiAgIHRvOiBkaXIgICAgICAgICAgIFx1MjAxNCBleGl0IGRpcmVjdGlvbiAoZGVmYXVsdDogJ2xlZnQnKVxuICovXG5jb25zdCBzdGFnZ2VyRXhpdDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBvcHRzLCBob3N0KSA9PiB7XG4gIC8vIEZpbHRlciB0byBvbmx5IGVsZW1lbnRzIHRoYXQgYXJlIGFjdHVhbGx5IHZpc2libGUgXHUyMDE0IHNraXAgaGlkZGVuL2FscmVhZHktZXhpdGVkIG9uZXNcbiAgbGV0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KS5maWx0ZXIoZWwgPT4ge1xuICAgIGNvbnN0IHN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWwgYXMgSFRNTEVsZW1lbnQpXG4gICAgcmV0dXJuIHN0eWxlLmRpc3BsYXkgIT09ICdub25lJyAmJiBzdHlsZS52aXNpYmlsaXR5ICE9PSAnaGlkZGVuJ1xuICB9KVxuICBpZiAoZWxzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgY29uc3QgZ2FwICAgICA9IHBhcnNlTXMob3B0c1snZ2FwJ10gYXMgc3RyaW5nIHwgbnVtYmVyIHwgdW5kZWZpbmVkLCAyMClcbiAgY29uc3QgcmV2ZXJzZSA9IFN0cmluZyhvcHRzWydkaXJlY3Rpb24nXSA/PyAnJykgPT09ICdyZXZlcnNlJ1xuICBjb25zdCB0byAgICAgID0gKG9wdHNbJ3RvJ10gYXMgRGlyZWN0aW9uIHwgdW5kZWZpbmVkKSA/PyAnbGVmdCdcblxuICBpZiAocmV2ZXJzZSkgZWxzID0gWy4uLmVsc10ucmV2ZXJzZSgpXG5cbiAgZWxzLmZvckVhY2goY2FuY2VsQW5pbWF0aW9ucylcbiAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgZWxzLm1hcCgoZWwsIGkpID0+XG4gICAgICAoZWwgYXMgSFRNTEVsZW1lbnQpLmFuaW1hdGUoXG4gICAgICAgIHNsaWRlS2V5ZnJhbWVzKHRvLCBmYWxzZSksXG4gICAgICAgIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJywgZGVsYXk6IGkgKiBnYXAgfVxuICAgICAgKS5maW5pc2hlZFxuICAgIClcbiAgKVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFV0aWxpdHk6IHBhcnNlIGEgbWlsbGlzZWNvbmQgdmFsdWUgZnJvbSBhIHN0cmluZyBsaWtlIFwiNDBtc1wiIG9yIGEgbnVtYmVyXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gcGFyc2VNcyh2YWw6IHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgZmFsbGJhY2s6IG51bWJlcik6IG51bWJlciB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCB8fCB2YWwgPT09IG51bGwpIHJldHVybiBmYWxsYmFja1xuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHJldHVybiB2YWxcbiAgY29uc3QgbSA9IFN0cmluZyh2YWwpLm1hdGNoKC9eKFxcZCsoPzpcXC5cXGQrKT8pbXMkLylcbiAgaWYgKG0pIHJldHVybiBwYXJzZUZsb2F0KG1bMV0hKVxuICBjb25zdCBuID0gcGFyc2VGbG9hdChTdHJpbmcodmFsKSlcbiAgcmV0dXJuIE51bWJlci5pc05hTihuKSA/IGZhbGxiYWNrIDogblxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIE1vZHVsZSBleHBvcnRcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5jb25zdCBhbmltYXRpb25Nb2R1bGU6IExFU01vZHVsZSA9IHtcbiAgbmFtZTogJ2FuaW1hdGlvbicsXG4gIHByaW1pdGl2ZXM6IHtcbiAgICAnZmFkZS1pbic6ICAgICAgIGZhZGVJbixcbiAgICAnZmFkZS1vdXQnOiAgICAgIGZhZGVPdXQsXG4gICAgJ3NsaWRlLWluJzogICAgICBzbGlkZUluLFxuICAgICdzbGlkZS1vdXQnOiAgICAgc2xpZGVPdXQsXG4gICAgJ3NsaWRlLXVwJzogICAgICBzbGlkZVVwLFxuICAgICdzbGlkZS1kb3duJzogICAgc2xpZGVEb3duLFxuICAgICdwdWxzZSc6ICAgICAgICAgcHVsc2UsXG4gICAgJ3N0YWdnZXItZW50ZXInOiBzdGFnZ2VyRW50ZXIsXG4gICAgJ3N0YWdnZXItZXhpdCc6ICBzdGFnZ2VyRXhpdCxcbiAgfSxcbn1cblxuZXhwb3J0IGRlZmF1bHQgYW5pbWF0aW9uTW9kdWxlXG4iLCAiaW1wb3J0IHR5cGUge1xuICBMRVNOb2RlLCBFeHByTm9kZSwgU2VxdWVuY2VOb2RlLCBQYXJhbGxlbE5vZGUsXG4gIFNldE5vZGUsIEVtaXROb2RlLCBCcm9hZGNhc3ROb2RlLCBXYWl0Tm9kZSxcbiAgQ2FsbE5vZGUsIEJpbmROb2RlLCBNYXRjaE5vZGUsIFRyeU5vZGUsIEFuaW1hdGlvbk5vZGUsXG59IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuaW1wb3J0IHR5cGUgeyBQYXR0ZXJuTm9kZSB9IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuaW1wb3J0IHsgTEVTU2NvcGUgfSBmcm9tICcuL3Njb3BlLmpzJ1xuaW1wb3J0IHR5cGUgeyBDb21tYW5kUmVnaXN0cnkgfSBmcm9tICcuL3JlZ2lzdHJ5LmpzJ1xuaW1wb3J0IHR5cGUgeyBNb2R1bGVSZWdpc3RyeSB9IGZyb20gJ0Btb2R1bGVzL3R5cGVzLmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEV4ZWN1dGlvbiBjb250ZXh0IFx1MjAxNCBldmVyeXRoaW5nIHRoZSBleGVjdXRvciBuZWVkcywgcGFzc2VkIGRvd24gdGhlIGNhbGwgdHJlZVxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBpbnRlcmZhY2UgTEVTQ29udGV4dCB7XG4gIC8qKiBMb2NhbCB2YXJpYWJsZSBzY29wZSBmb3IgdGhlIGN1cnJlbnQgY2FsbCBmcmFtZSAqL1xuICBzY29wZTogTEVTU2NvcGVcbiAgLyoqIFRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBob3N0IGVsZW1lbnQgXHUyMDE0IHVzZWQgYXMgcXVlcnlTZWxlY3RvciByb290ICovXG4gIGhvc3Q6IEVsZW1lbnRcbiAgLyoqIENvbW1hbmQgZGVmaW5pdGlvbnMgcmVnaXN0ZXJlZCBieSA8bG9jYWwtY29tbWFuZD4gY2hpbGRyZW4gKi9cbiAgY29tbWFuZHM6IENvbW1hbmRSZWdpc3RyeVxuICAvKiogQW5pbWF0aW9uIGFuZCBvdGhlciBwcmltaXRpdmUgbW9kdWxlcyAqL1xuICBtb2R1bGVzOiBNb2R1bGVSZWdpc3RyeVxuICAvKiogUmVhZCBhIERhdGFzdGFyIHNpZ25hbCB2YWx1ZSBieSBuYW1lICh3aXRob3V0ICQgcHJlZml4KSAqL1xuICBnZXRTaWduYWw6IChuYW1lOiBzdHJpbmcpID0+IHVua25vd25cbiAgLyoqIFdyaXRlIGEgRGF0YXN0YXIgc2lnbmFsIHZhbHVlIGJ5IG5hbWUgKHdpdGhvdXQgJCBwcmVmaXgpICovXG4gIHNldFNpZ25hbDogKG5hbWU6IHN0cmluZywgdmFsdWU6IHVua25vd24pID0+IHZvaWRcbiAgLyoqIERpc3BhdGNoIGEgbG9jYWwgQ3VzdG9tRXZlbnQgb24gdGhlIGhvc3QgKGJ1YmJsZXM6IGZhbHNlKSAqL1xuICBlbWl0TG9jYWw6IChldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHZvaWRcbiAgLyoqIERpc3BhdGNoIGEgRE9NLXdpZGUgQ3VzdG9tRXZlbnQgKGJ1YmJsZXM6IHRydWUsIGNvbXBvc2VkOiB0cnVlKSAqL1xuICBicm9hZGNhc3Q6IChldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHZvaWRcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBNYWluIGV4ZWN1dG9yXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBFeGVjdXRlcyBhIExFU05vZGUgQVNUIGluIHRoZSBnaXZlbiBjb250ZXh0LlxuICpcbiAqIEFzeW5jIHRyYW5zcGFyZW5jeTogZXZlcnkgc3RlcCBpcyBhd2FpdGVkIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciBpdFxuICogaXMgc3luY2hyb25vdXMgb3IgcmV0dXJucyBhIFByb21pc2UuIFRoZSBhdXRob3IgbmV2ZXIgd3JpdGVzIGBhd2FpdGAuXG4gKiBUaGUgYHRoZW5gIGNvbm5lY3RpdmUgaW4gTEVTIHNvdXJjZSBtYXBzIHRvIHNlcXVlbnRpYWwgYGF3YWl0YCBoZXJlLlxuICogVGhlIGBhbmRgIGNvbm5lY3RpdmUgbWFwcyB0byBgUHJvbWlzZS5hbGxgLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZShub2RlOiBMRVNOb2RlLCBjdHg6IExFU0NvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgc3dpdGNoIChub2RlLnR5cGUpIHtcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBTZXF1ZW5jZTogQSB0aGVuIEIgdGhlbiBDIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3NlcXVlbmNlJzpcbiAgICAgIGZvciAoY29uc3Qgc3RlcCBvZiAobm9kZSBhcyBTZXF1ZW5jZU5vZGUpLnN0ZXBzKSB7XG4gICAgICAgIGF3YWl0IGV4ZWN1dGUoc3RlcCwgY3R4KVxuICAgICAgfVxuICAgICAgcmV0dXJuXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgUGFyYWxsZWw6IEEgYW5kIEIgYW5kIEMgKFByb21pc2UuYWxsKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdwYXJhbGxlbCc6XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbCgobm9kZSBhcyBQYXJhbGxlbE5vZGUpLmJyYW5jaGVzLm1hcChiID0+IGV4ZWN1dGUoYiwgY3R4KSkpXG4gICAgICByZXR1cm5cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBzZXQgJHNpZ25hbCB0byBleHByIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3NldCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIFNldE5vZGVcbiAgICAgIGNvbnN0IHZhbHVlID0gZXZhbEV4cHIobi52YWx1ZSwgY3R4KVxuICAgICAgY3R4LnNldFNpZ25hbChuLnNpZ25hbCwgdmFsdWUpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgZW1pdCBldmVudDpuYW1lIFtwYXlsb2FkXSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdlbWl0Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgRW1pdE5vZGVcbiAgICAgIGNvbnN0IHBheWxvYWQgPSBuLnBheWxvYWQubWFwKHAgPT4gZXZhbEV4cHIocCwgY3R4KSlcbiAgICAgIGN0eC5lbWl0TG9jYWwobi5ldmVudCwgcGF5bG9hZClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBicm9hZGNhc3QgZXZlbnQ6bmFtZSBbcGF5bG9hZF0gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnYnJvYWRjYXN0Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQnJvYWRjYXN0Tm9kZVxuICAgICAgY29uc3QgcGF5bG9hZCA9IG4ucGF5bG9hZC5tYXAocCA9PiBldmFsRXhwcihwLCBjdHgpKVxuICAgICAgY3R4LmJyb2FkY2FzdChuLmV2ZW50LCBwYXlsb2FkKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIHdhaXQgTm1zIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3dhaXQnOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBXYWl0Tm9kZVxuICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG4ubXMpKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIGNhbGwgY29tbWFuZDpuYW1lIFthcmdzXSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdjYWxsJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQ2FsbE5vZGVcbiAgICAgIGNvbnN0IGRlZiA9IGN0eC5jb21tYW5kcy5nZXQobi5jb21tYW5kKVxuICAgICAgaWYgKCFkZWYpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBbTEVTXSBVbmtub3duIGNvbW1hbmQ6IFwiJHtuLmNvbW1hbmR9XCJgKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgLy8gRXZhbHVhdGUgZ3VhcmQgXHUyMDE0IGZhbHN5ID0gc2lsZW50IG5vLW9wIChub3QgYW4gZXJyb3IsIG5vIHJlc2N1ZSlcbiAgICAgIGlmIChkZWYuZ3VhcmQpIHtcbiAgICAgICAgY29uc3QgcGFzc2VzID0gZXZhbEd1YXJkKGRlZi5ndWFyZCwgY3R4KVxuICAgICAgICBpZiAoIXBhc3Nlcykge1xuICAgICAgICAgIGNvbnNvbGUuZGVidWcoYFtMRVNdIGNvbW1hbmQgXCIke24uY29tbWFuZH1cIiBndWFyZCByZWplY3RlZGApXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gQnVpbGQgY2hpbGQgc2NvcGU6IGJpbmQgYXJncyBpbnRvIGl0XG4gICAgICBjb25zdCBjaGlsZFNjb3BlID0gY3R4LnNjb3BlLmNoaWxkKClcbiAgICAgIGNvbnN0IGV2YWxlZEFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge31cbiAgICAgIGZvciAoY29uc3QgW2tleSwgZXhwck5vZGVdIG9mIE9iamVjdC5lbnRyaWVzKG4uYXJncykpIHtcbiAgICAgICAgZXZhbGVkQXJnc1trZXldID0gZXZhbEV4cHIoZXhwck5vZGUsIGN0eClcbiAgICAgIH1cblxuICAgICAgLy8gQXBwbHkgYXJnIGRlZmF1bHRzIGZyb20gZGVmIChQaGFzZSAyIEFyZ0RlZiBwYXJzaW5nIFx1MjAxNCBzaW1wbGlmaWVkIGhlcmUpXG4gICAgICBmb3IgKGNvbnN0IGFyZ0RlZiBvZiBkZWYuYXJncykge1xuICAgICAgICBpZiAoIShhcmdEZWYubmFtZSBpbiBldmFsZWRBcmdzKSAmJiBhcmdEZWYuZGVmYXVsdCkge1xuICAgICAgICAgIGV2YWxlZEFyZ3NbYXJnRGVmLm5hbWVdID0gZXZhbEV4cHIoYXJnRGVmLmRlZmF1bHQsIGN0eClcbiAgICAgICAgfVxuICAgICAgICBjaGlsZFNjb3BlLnNldChhcmdEZWYubmFtZSwgZXZhbGVkQXJnc1thcmdEZWYubmFtZV0gPz8gbnVsbClcbiAgICAgIH1cblxuICAgICAgY29uc3QgY2hpbGRDdHg6IExFU0NvbnRleHQgPSB7IC4uLmN0eCwgc2NvcGU6IGNoaWxkU2NvcGUgfVxuICAgICAgYXdhaXQgZXhlY3V0ZShkZWYuYm9keSwgY2hpbGRDdHgpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgbmFtZSA8LSBAdmVyYiAndXJsJyBbYXJnc10gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnYmluZCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIEJpbmROb2RlXG4gICAgICBjb25zdCB7IHZlcmIsIHVybCwgYXJncyB9ID0gbi5hY3Rpb25cbiAgICAgIGNvbnN0IGV2YWxlZEFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge31cbiAgICAgIGZvciAoY29uc3QgW2tleSwgZXhwck5vZGVdIG9mIE9iamVjdC5lbnRyaWVzKGFyZ3MpKSB7XG4gICAgICAgIGV2YWxlZEFyZ3Nba2V5XSA9IGV2YWxFeHByKGV4cHJOb2RlLCBjdHgpXG4gICAgICB9XG5cbiAgICAgIGxldCByZXN1bHQ6IHVua25vd25cbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9IGF3YWl0IHBlcmZvcm1BY3Rpb24odmVyYiwgdXJsLCBldmFsZWRBcmdzLCBjdHgpXG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgLy8gUHJvcGFnYXRlIHNvIGVuY2xvc2luZyB0cnkvcmVzY3VlIGNhbiBjYXRjaCBpdFxuICAgICAgICB0aHJvdyBlcnJcbiAgICAgIH1cblxuICAgICAgY3R4LnNjb3BlLnNldChuLm5hbWUsIHJlc3VsdClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBtYXRjaCBzdWJqZWN0IC8gYXJtcyAvIC9tYXRjaCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdtYXRjaCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIE1hdGNoTm9kZVxuICAgICAgY29uc3Qgc3ViamVjdCA9IGV2YWxFeHByKG4uc3ViamVjdCwgY3R4KVxuXG4gICAgICBmb3IgKGNvbnN0IGFybSBvZiBuLmFybXMpIHtcbiAgICAgICAgY29uc3QgYmluZGluZ3MgPSBtYXRjaFBhdHRlcm5zKGFybS5wYXR0ZXJucywgc3ViamVjdClcbiAgICAgICAgaWYgKGJpbmRpbmdzICE9PSBudWxsKSB7XG4gICAgICAgICAgLy8gQ3JlYXRlIGNoaWxkIHNjb3BlIHdpdGggcGF0dGVybiBiaW5kaW5nc1xuICAgICAgICAgIGNvbnN0IGFybVNjb3BlID0gY3R4LnNjb3BlLmNoaWxkKClcbiAgICAgICAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhiaW5kaW5ncykpIHtcbiAgICAgICAgICAgIGFybVNjb3BlLnNldChrLCB2KVxuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBhcm1DdHg6IExFU0NvbnRleHQgPSB7IC4uLmN0eCwgc2NvcGU6IGFybVNjb3BlIH1cbiAgICAgICAgICBhd2FpdCBleGVjdXRlKGFybS5ib2R5LCBhcm1DdHgpXG4gICAgICAgICAgcmV0dXJuICAgLy8gRmlyc3QgbWF0Y2hpbmcgYXJtIHdpbnMgXHUyMDE0IG5vIGZhbGx0aHJvdWdoXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSBtYXRjaDogbm8gYXJtIG1hdGNoZWQgc3ViamVjdDonLCBzdWJqZWN0KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIHRyeSAvIHJlc2N1ZSAvIGFmdGVyd2FyZHMgLyAvdHJ5IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3RyeSc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIFRyeU5vZGVcbiAgICAgIGxldCB0aHJldyA9IGZhbHNlXG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGV4ZWN1dGUobi5ib2R5LCBjdHgpXG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgdGhyZXcgPSB0cnVlXG4gICAgICAgIGlmIChuLnJlc2N1ZSkge1xuICAgICAgICAgIC8vIEJpbmQgdGhlIGVycm9yIGFzIGAkZXJyb3JgIGluIHRoZSByZXNjdWUgc2NvcGVcbiAgICAgICAgICBjb25zdCByZXNjdWVTY29wZSA9IGN0eC5zY29wZS5jaGlsZCgpXG4gICAgICAgICAgcmVzY3VlU2NvcGUuc2V0KCdlcnJvcicsIGVycilcbiAgICAgICAgICBjb25zdCByZXNjdWVDdHg6IExFU0NvbnRleHQgPSB7IC4uLmN0eCwgc2NvcGU6IHJlc2N1ZVNjb3BlIH1cbiAgICAgICAgICBhd2FpdCBleGVjdXRlKG4ucmVzY3VlLCByZXNjdWVDdHgpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gTm8gcmVzY3VlIGNsYXVzZSBcdTIwMTQgcmUtdGhyb3cgc28gb3V0ZXIgdHJ5IGNhbiBjYXRjaCBpdFxuICAgICAgICAgIHRocm93IGVyclxuICAgICAgICB9XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBpZiAobi5hZnRlcndhcmRzKSB7XG4gICAgICAgICAgLy8gYWZ0ZXJ3YXJkcyBhbHdheXMgcnVucyBpZiBleGVjdXRpb24gZW50ZXJlZCB0aGUgdHJ5IGJvZHlcbiAgICAgICAgICAvLyAoZ3VhcmQgcmVqZWN0aW9uIG5ldmVyIHJlYWNoZXMgaGVyZSBcdTIwMTQgc2VlIGBjYWxsYCBoYW5kbGVyIGFib3ZlKVxuICAgICAgICAgIGF3YWl0IGV4ZWN1dGUobi5hZnRlcndhcmRzLCBjdHgpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRocmV3ICYmICFuLnJlc2N1ZSkge1xuICAgICAgICAvLyBBbHJlYWR5IHJlLXRocm93biBhYm92ZSBcdTIwMTQgdW5yZWFjaGFibGUsIGJ1dCBUeXBlU2NyaXB0IG5lZWRzIHRoaXNcbiAgICAgIH1cbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBhbmltYXRpb24gcHJpbWl0aXZlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ2FuaW1hdGlvbic6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIEFuaW1hdGlvbk5vZGVcbiAgICAgIGNvbnN0IHByaW1pdGl2ZSA9IGN0eC5tb2R1bGVzLmdldChuLnByaW1pdGl2ZSlcblxuICAgICAgaWYgKCFwcmltaXRpdmUpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGN0eC5tb2R1bGVzLmhpbnRGb3Iobi5wcmltaXRpdmUpKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgLy8gUmVzb2x2ZSBzZWxlY3RvciBcdTIwMTQgc3Vic3RpdHV0ZSBhbnkgbG9jYWwgdmFyaWFibGUgcmVmZXJlbmNlc1xuICAgICAgY29uc3Qgc2VsZWN0b3IgPSByZXNvbHZlU2VsZWN0b3Iobi5zZWxlY3RvciwgY3R4KVxuXG4gICAgICAvLyBFdmFsdWF0ZSBvcHRpb25zXG4gICAgICBjb25zdCBvcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIGV4cHJOb2RlXSBvZiBPYmplY3QuZW50cmllcyhuLm9wdGlvbnMpKSB7XG4gICAgICAgIG9wdGlvbnNba2V5XSA9IGV2YWxFeHByKGV4cHJOb2RlLCBjdHgpXG4gICAgICB9XG5cbiAgICAgIC8vIEF3YWl0IHRoZSBhbmltYXRpb24gXHUyMDE0IHRoaXMgaXMgdGhlIGNvcmUgb2YgYXN5bmMgdHJhbnNwYXJlbmN5OlxuICAgICAgLy8gV2ViIEFuaW1hdGlvbnMgQVBJIHJldHVybnMgYW4gQW5pbWF0aW9uIHdpdGggYSAuZmluaXNoZWQgUHJvbWlzZS5cbiAgICAgIC8vIGB0aGVuYCBpbiBMRVMgc291cmNlIGF3YWl0cyB0aGlzIG5hdHVyYWxseS5cbiAgICAgIGF3YWl0IHByaW1pdGl2ZShzZWxlY3Rvciwgbi5kdXJhdGlvbiwgbi5lYXNpbmcsIG9wdGlvbnMsIGN0eC5ob3N0KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIHJhdyBleHByZXNzaW9uIChlc2NhcGUgaGF0Y2ggLyB1bmtub3duIHN0YXRlbWVudHMpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ2V4cHInOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBFeHByTm9kZVxuICAgICAgaWYgKG4ucmF3LnRyaW0oKSkge1xuICAgICAgICAvLyBFdmFsdWF0ZSBhcyBhIEpTIGV4cHJlc3Npb24gZm9yIHNpZGUgZWZmZWN0c1xuICAgICAgICAvLyBUaGlzIGhhbmRsZXMgdW5rbm93biBwcmltaXRpdmVzIGFuZCBmdXR1cmUga2V5d29yZHMgZ3JhY2VmdWxseVxuICAgICAgICBldmFsRXhwcihuLCBjdHgpXG4gICAgICB9XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgYWN0aW9uIChiYXJlIEBnZXQgZXRjLiBub3QgaW5zaWRlIGEgYmluZCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgLy8gYEBnZXQgJy9hcGkvZmVlZCcgW2ZpbHRlcjogJGFjdGl2ZUZpbHRlcl1gXG4gICAgLy8gQXdhaXRzIHRoZSBmdWxsIFNTRSBzdHJlYW0gLyBKU09OIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlci5cbiAgICAvLyBEYXRhc3RhciBwcm9jZXNzZXMgdGhlIFNTRSBldmVudHMgKHBhdGNoLWVsZW1lbnRzLCBwYXRjaC1zaWduYWxzKSBhc1xuICAgIC8vIHRoZXkgYXJyaXZlLiBUaGUgUHJvbWlzZSByZXNvbHZlcyB3aGVuIHRoZSBzdHJlYW0gY2xvc2VzLlxuICAgIC8vIGB0aGVuYCBpbiBMRVMgY29ycmVjdGx5IHdhaXRzIGZvciB0aGlzIGJlZm9yZSBwcm9jZWVkaW5nLlxuICAgIGNhc2UgJ2FjdGlvbic6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlXG4gICAgICBjb25zdCBldmFsZWRBcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIGV4cHJOb2RlXSBvZiBPYmplY3QuZW50cmllcyhuLmFyZ3MpKSB7XG4gICAgICAgIGV2YWxlZEFyZ3Nba2V5XSA9IGV2YWxFeHByKGV4cHJOb2RlLCBjdHgpXG4gICAgICB9XG4gICAgICBhd2FpdCBwZXJmb3JtQWN0aW9uKG4udmVyYiwgbi51cmwsIGV2YWxlZEFyZ3MsIGN0eClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGRlZmF1bHQ6IHtcbiAgICAgIGNvbnN0IGV4aGF1c3RpdmU6IG5ldmVyID0gbm9kZVxuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSBVbmtub3duIG5vZGUgdHlwZTonLCAoZXhoYXVzdGl2ZSBhcyBMRVNOb2RlKS50eXBlKVxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEV4cHJlc3Npb24gZXZhbHVhdGlvblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogRXZhbHVhdGVzIGEgcmF3IEpTIGV4cHJlc3Npb24gc3RyaW5nIGluIGEgc2FuZGJveGVkIGNvbnRleHQgdGhhdFxuICogZXhwb3NlcyBzY29wZSBsb2NhbHMgYW5kIERhdGFzdGFyIHNpZ25hbHMgdmlhIGEgUHJveHkuXG4gKlxuICogU2lnbmFsIGFjY2VzczogYCRmZWVkU3RhdGVgIFx1MjE5MiByZWFkcyB0aGUgYGZlZWRTdGF0ZWAgc2lnbmFsXG4gKiBMb2NhbCBhY2Nlc3M6ICBgZmlsdGVyYCAgICBcdTIxOTIgcmVhZHMgZnJvbSBzY29wZVxuICpcbiAqIFRoZSBzYW5kYm94IGlzIGludGVudGlvbmFsbHkgc2ltcGxlIGZvciBQaGFzZSAzLiBBIHByb3BlciBzYW5kYm94XG4gKiAoQ1NQLWNvbXBhdGlibGUsIG5vIGV2YWwgZmFsbGJhY2spIGlzIGEgZnV0dXJlIGhhcmRlbmluZyB0YXNrLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXZhbEV4cHIobm9kZTogRXhwck5vZGUsIGN0eDogTEVTQ29udGV4dCk6IHVua25vd24ge1xuICBpZiAoIW5vZGUucmF3LnRyaW0oKSkgcmV0dXJuIHVuZGVmaW5lZFxuXG4gIC8vIEZhc3QgcGF0aDogc2ltcGxlIHN0cmluZyBsaXRlcmFsXG4gIGlmIChub2RlLnJhdy5zdGFydHNXaXRoKFwiJ1wiKSAmJiBub2RlLnJhdy5lbmRzV2l0aChcIidcIikpIHtcbiAgICByZXR1cm4gbm9kZS5yYXcuc2xpY2UoMSwgLTEpXG4gIH1cbiAgLy8gRmFzdCBwYXRoOiBudW1iZXIgbGl0ZXJhbFxuICBjb25zdCBudW0gPSBOdW1iZXIobm9kZS5yYXcpXG4gIGlmICghTnVtYmVyLmlzTmFOKG51bSkgJiYgbm9kZS5yYXcudHJpbSgpICE9PSAnJykgcmV0dXJuIG51bVxuICAvLyBGYXN0IHBhdGg6IGJvb2xlYW5cbiAgaWYgKG5vZGUucmF3ID09PSAndHJ1ZScpICByZXR1cm4gdHJ1ZVxuICBpZiAobm9kZS5yYXcgPT09ICdmYWxzZScpIHJldHVybiBmYWxzZVxuICBpZiAobm9kZS5yYXcgPT09ICdudWxsJyB8fCBub2RlLnJhdyA9PT0gJ25pbCcpIHJldHVybiBudWxsXG5cbiAgLy8gXHUyNTAwXHUyNTAwIEZhc3QgcGF0aHMgZm9yIGNvbW1vbiBhbmltYXRpb24vb3B0aW9uIHZhbHVlIHBhdHRlcm5zIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAvLyBUaGVzZSBhcmUgbm90IHZhbGlkIEpTIGV4cHJlc3Npb25zIGJ1dCBhcHBlYXIgYXMgYW5pbWF0aW9uIG9wdGlvbiB2YWx1ZXMuXG4gIC8vIFJldHVybiB0aGVtIGFzIHN0cmluZ3Mgc28gdGhlIGFuaW1hdGlvbiBtb2R1bGUgY2FuIGludGVycHJldCB0aGVtIGRpcmVjdGx5LlxuICBpZiAoL15cXGQrKFxcLlxcZCspP21zJC8udGVzdChub2RlLnJhdykpIHJldHVybiBub2RlLnJhdyAgICAgICAgICAgICAgICAgICAvLyBcIjIwbXNcIiwgXCI0MG1zXCJcbiAgaWYgKC9eW2EtekEtWl1bYS16QS1aMC05Xy1dKiQvLnRlc3Qobm9kZS5yYXcpKSByZXR1cm4gbm9kZS5yYXcgICAgICAgICAgICAvLyBcInJldmVyc2VcIiwgXCJyaWdodFwiLCBcImVhc2Utb3V0XCJcbiAgaWYgKC9eKGN1YmljLWJlemllcnxzdGVwc3xsaW5lYXIpXFwoLy50ZXN0KG5vZGUucmF3KSkgcmV0dXJuIG5vZGUucmF3ICAgICAgLy8gXCJjdWJpYy1iZXppZXIoMC4yMiwxLDAuMzYsMSlcblxuICB0cnkge1xuICAgIC8vIEJ1aWxkIGEgZmxhdCBvYmplY3Qgb2YgYWxsIGFjY2Vzc2libGUgbmFtZXM6XG4gICAgLy8gLSBTY29wZSBsb2NhbHMgKGlubmVybW9zdCB3aW5zKVxuICAgIC8vIC0gRGF0YXN0YXIgc2lnbmFscyB2aWEgJC1wcmVmaXggc3RyaXBwaW5nXG4gICAgY29uc3Qgc2NvcGVTbmFwc2hvdCA9IGN0eC5zY29wZS5zbmFwc2hvdCgpXG5cbiAgICAvLyBFeHRyYWN0IHNpZ25hbCByZWZlcmVuY2VzIGZyb20gdGhlIGV4cHJlc3Npb24gKCRuYW1lIFx1MjE5MiBuYW1lKVxuICAgIGNvbnN0IHNpZ25hbE5hbWVzID0gWy4uLm5vZGUucmF3Lm1hdGNoQWxsKC9cXCQoW2EtekEtWl9dXFx3KikvZyldXG4gICAgICAubWFwKG0gPT4gbVsxXSEpXG5cbiAgICBjb25zdCBzaWduYWxzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHNpZ25hbE5hbWVzKSB7XG4gICAgICBzaWduYWxzW25hbWVdID0gY3R4LmdldFNpZ25hbChuYW1lKVxuICAgIH1cblxuICAgIC8vIFJld3JpdGUgJG5hbWUgXHUyMTkyIF9fc2lnX25hbWUgaW4gdGhlIGV4cHJlc3Npb24gc28gd2UgY2FuIHBhc3Mgc2lnbmFsc1xuICAgIC8vIGFzIHBsYWluIHZhcmlhYmxlcyAoYXZvaWRzICQgaW4gSlMgaWRlbnRpZmllcnMpXG4gICAgbGV0IHJld3JpdHRlbiA9IG5vZGUucmF3XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHNpZ25hbE5hbWVzKSB7XG4gICAgICByZXdyaXR0ZW4gPSByZXdyaXR0ZW4ucmVwbGFjZUFsbChgJCR7bmFtZX1gLCBgX19zaWdfJHtuYW1lfWApXG4gICAgfVxuXG4gICAgLy8gUHJlZml4IHNpZ25hbCB2YXJzIGluIHRoZSBiaW5kaW5nIG9iamVjdFxuICAgIGNvbnN0IHNpZ0JpbmRpbmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgZm9yIChjb25zdCBbaywgdl0gb2YgT2JqZWN0LmVudHJpZXMoc2lnbmFscykpIHtcbiAgICAgIHNpZ0JpbmRpbmdzW2BfX3NpZ18ke2t9YF0gPSB2XG4gICAgfVxuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLW5ldy1mdW5jXG4gICAgY29uc3QgZm4gPSBuZXcgRnVuY3Rpb24oXG4gICAgICAuLi5PYmplY3Qua2V5cyhzY29wZVNuYXBzaG90KSxcbiAgICAgIC4uLk9iamVjdC5rZXlzKHNpZ0JpbmRpbmdzKSxcbiAgICAgIGByZXR1cm4gKCR7cmV3cml0dGVufSlgXG4gICAgKVxuICAgIHJldHVybiBmbihcbiAgICAgIC4uLk9iamVjdC52YWx1ZXMoc2NvcGVTbmFwc2hvdCksXG4gICAgICAuLi5PYmplY3QudmFsdWVzKHNpZ0JpbmRpbmdzKVxuICAgIClcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTXSBFeHByZXNzaW9uIGV2YWwgZXJyb3I6ICR7SlNPTi5zdHJpbmdpZnkobm9kZS5yYXcpfWAsIGVycilcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cbn1cblxuLyoqXG4gKiBFdmFsdWF0ZXMgYSBndWFyZCBleHByZXNzaW9uIHN0cmluZyAoZnJvbSBjb21tYW5kIGBndWFyZGAgYXR0cmlidXRlKS5cbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ3VhcmQgcGFzc2VzIChjb21tYW5kIHNob3VsZCBydW4pLCBmYWxzZSB0byBzaWxlbnQtYWJvcnQuXG4gKi9cbmZ1bmN0aW9uIGV2YWxHdWFyZChndWFyZEV4cHI6IHN0cmluZywgY3R4OiBMRVNDb250ZXh0KTogYm9vbGVhbiB7XG4gIGNvbnN0IHJlc3VsdCA9IGV2YWxFeHByKHsgdHlwZTogJ2V4cHInLCByYXc6IGd1YXJkRXhwciB9LCBjdHgpXG4gIHJldHVybiBCb29sZWFuKHJlc3VsdClcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXR0ZXJuIG1hdGNoaW5nXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBBdHRlbXB0cyB0byBtYXRjaCBgc3ViamVjdGAgYWdhaW5zdCBgcGF0dGVybnNgLlxuICpcbiAqIFJldHVybnMgYSBiaW5kaW5ncyBtYXAgaWYgbWF0Y2hlZCAoZW1wdHkgbWFwIGZvciB3aWxkY2FyZC9saXRlcmFsIG1hdGNoZXMpLFxuICogb3IgbnVsbCBpZiB0aGUgbWF0Y2ggZmFpbHMuXG4gKlxuICogRm9yIHR1cGxlIHBhdHRlcm5zLCBgc3ViamVjdGAgaXMgbWF0Y2hlZCBlbGVtZW50LWJ5LWVsZW1lbnQuXG4gKiBGb3Igb3ItcGF0dGVybnMsIGFueSBhbHRlcm5hdGl2ZSBtYXRjaGluZyByZXR1cm5zIHRoZSBiaW5kaW5ncy5cbiAqL1xuZnVuY3Rpb24gbWF0Y2hQYXR0ZXJucyhcbiAgcGF0dGVybnM6IFBhdHRlcm5Ob2RlW10sXG4gIHN1YmplY3Q6IHVua25vd25cbik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbCB7XG4gIC8vIFNpbmdsZS1wYXR0ZXJuIChtb3N0IGNvbW1vbik6IG1hdGNoIGRpcmVjdGx5XG4gIGlmIChwYXR0ZXJucy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbWF0Y2hTaW5nbGUocGF0dGVybnNbMF0hLCBzdWJqZWN0KVxuICB9XG5cbiAgLy8gVHVwbGUgcGF0dGVybjogc3ViamVjdCBtdXN0IGJlIGFuIGFycmF5XG4gIGlmICghQXJyYXkuaXNBcnJheShzdWJqZWN0KSkge1xuICAgIC8vIFdyYXAgc2luZ2xlIHZhbHVlIGluIHR1cGxlIGZvciBlcmdvbm9taWNzXG4gICAgLy8gZS5nLiBgW2l0IG9rXWAgYWdhaW5zdCBhIHtvazogdHJ1ZSwgZGF0YTogLi4ufSByZXNwb25zZVxuICAgIHJldHVybiBtYXRjaFR1cGxlKHBhdHRlcm5zLCBzdWJqZWN0KVxuICB9XG5cbiAgcmV0dXJuIG1hdGNoVHVwbGUocGF0dGVybnMsIHN1YmplY3QpXG59XG5cbmZ1bmN0aW9uIG1hdGNoVHVwbGUoXG4gIHBhdHRlcm5zOiBQYXR0ZXJuTm9kZVtdLFxuICBzdWJqZWN0OiB1bmtub3duXG4pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IG51bGwge1xuICAvLyBGb3Igbm9uLWFycmF5IHN1YmplY3RzLCB0cnkgYmluZGluZyBlYWNoIHBhdHRlcm4gYWdhaW5zdCB0aGUgd2hvbGUgc3ViamVjdFxuICAvLyAoaGFuZGxlcyBgW2l0IG9rXWAgbWF0Y2hpbmcgYW4gb2JqZWN0IHdoZXJlIGBpdGAgPSBvYmplY3QsIGBva2AgPSBzdGF0dXMpXG4gIGNvbnN0IGJpbmRpbmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXR0ZXJucy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHBhdCA9IHBhdHRlcm5zW2ldIVxuXG4gICAgLy8gRm9yIHR1cGxlIHBhdHRlcm5zIGFnYWluc3Qgb2JqZWN0cywgd2UgZG8gYSBzdHJ1Y3R1cmFsIG1hdGNoOlxuICAgIC8vIGBbaXQgb2tdYCBhZ2FpbnN0IHtkYXRhOiAuLi4sIHN0YXR1czogJ29rJ30gYmluZHMgYGl0YCA9IGRhdGEsIGBva2AgPSAnb2snXG4gICAgLy8gVGhpcyBpcyBhIHNpbXBsaWZpY2F0aW9uIFx1MjAxNCBmdWxsIHN0cnVjdHVyYWwgbWF0Y2hpbmcgY29tZXMgaW4gYSBsYXRlciBwYXNzXG4gICAgY29uc3QgdmFsdWUgPSBBcnJheS5pc0FycmF5KHN1YmplY3QpXG4gICAgICA/IHN1YmplY3RbaV1cbiAgICAgIDogaSA9PT0gMCA/IHN1YmplY3QgOiB1bmRlZmluZWRcblxuICAgIGNvbnN0IHJlc3VsdCA9IG1hdGNoU2luZ2xlKHBhdCwgdmFsdWUpXG4gICAgaWYgKHJlc3VsdCA9PT0gbnVsbCkgcmV0dXJuIG51bGxcbiAgICBPYmplY3QuYXNzaWduKGJpbmRpbmdzLCByZXN1bHQpXG4gIH1cblxuICByZXR1cm4gYmluZGluZ3Ncbn1cblxuZnVuY3Rpb24gbWF0Y2hTaW5nbGUoXG4gIHBhdHRlcm46IFBhdHRlcm5Ob2RlLFxuICB2YWx1ZTogdW5rbm93blxuKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsIHtcbiAgc3dpdGNoIChwYXR0ZXJuLmtpbmQpIHtcbiAgICBjYXNlICd3aWxkY2FyZCc6XG4gICAgICByZXR1cm4ge30gICAvLyBBbHdheXMgbWF0Y2hlcywgYmluZHMgbm90aGluZ1xuXG4gICAgY2FzZSAnbGl0ZXJhbCc6XG4gICAgICByZXR1cm4gdmFsdWUgPT09IHBhdHRlcm4udmFsdWUgPyB7fSA6IG51bGxcblxuICAgIGNhc2UgJ2JpbmRpbmcnOlxuICAgICAgcmV0dXJuIHsgW3BhdHRlcm4ubmFtZV06IHZhbHVlIH0gICAvLyBBbHdheXMgbWF0Y2hlcywgYmluZHMgbmFtZSBcdTIxOTIgdmFsdWVcblxuICAgIGNhc2UgJ29yJzoge1xuICAgICAgZm9yIChjb25zdCBhbHQgb2YgcGF0dGVybi5wYXR0ZXJucykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBtYXRjaFNpbmdsZShhbHQsIHZhbHVlKVxuICAgICAgICBpZiAocmVzdWx0ICE9PSBudWxsKSByZXR1cm4gcmVzdWx0XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEhUVFAgYWN0aW9uXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBQZXJmb3JtcyBhbiBIVFRQIGFjdGlvbiAoQGdldCwgQHBvc3QsIGV0Yy4pLlxuICpcbiAqIFdoZW4gRGF0YXN0YXIgYWN0aW9ucyBhcmUgYXZhaWxhYmxlIGluIHRoZSBob3N0J3MgY29udGV4dCwgd2UgdHJpZ2dlclxuICogRGF0YXN0YXIncyBmZXRjaCBwaXBlbGluZSAod2hpY2ggaGFuZGxlcyBzaWduYWwgc2VyaWFsaXphdGlvbiwgU1NFXG4gKiByZXNwb25zZSBwcm9jZXNzaW5nLCBhbmQgaW5kaWNhdG9yIHNpZ25hbHMpLlxuICpcbiAqIEZhbGxzIGJhY2sgdG8gbmF0aXZlIGZldGNoIHdoZW4gRGF0YXN0YXIgaXMgbm90IHByZXNlbnQuXG4gKlxuICogTm90ZTogRGF0YXN0YXIncyBAZ2V0IC8gQHBvc3QgYXJlIGZpcmUtYW5kLWZvcmdldCAodGhleSBzdHJlYW0gU1NFIGJhY2tcbiAqIHRvIHBhdGNoIHNpZ25hbHMvZWxlbWVudHMpLiBGb3IgdGhlIGJpbmQgY2FzZSAoYHJlc3BvbnNlIDwtIEBnZXQgLi4uYClcbiAqIHdlIHVzZSBuYXRpdmUgZmV0Y2ggdG8gZ2V0IGEgUHJvbWlzZS1iYXNlZCBKU09OIHJlc3BvbnNlIHRoYXQgTEVTIGNhblxuICogYmluZCB0byBhIGxvY2FsIHZhcmlhYmxlLlxuICovXG5hc3luYyBmdW5jdGlvbiBwZXJmb3JtQWN0aW9uKFxuICB2ZXJiOiBzdHJpbmcsXG4gIHVybDogc3RyaW5nLFxuICBhcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgY3R4OiBMRVNDb250ZXh0XG4pOiBQcm9taXNlPHVua25vd24+IHtcbiAgY29uc3QgbWV0aG9kID0gdmVyYi50b1VwcGVyQ2FzZSgpXG5cbiAgbGV0IGZ1bGxVcmwgPSB1cmxcbiAgbGV0IGJvZHk6IHN0cmluZyB8IHVuZGVmaW5lZFxuXG4gIGlmIChtZXRob2QgPT09ICdHRVQnIHx8IG1ldGhvZCA9PT0gJ0RFTEVURScpIHtcbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKClcbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhhcmdzKSkge1xuICAgICAgcGFyYW1zLnNldChrLCBTdHJpbmcodikpXG4gICAgfVxuICAgIGNvbnN0IHFzID0gcGFyYW1zLnRvU3RyaW5nKClcbiAgICBpZiAocXMpIGZ1bGxVcmwgPSBgJHt1cmx9PyR7cXN9YFxuICB9IGVsc2Uge1xuICAgIGJvZHkgPSBKU09OLnN0cmluZ2lmeShhcmdzKVxuICB9XG5cbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChmdWxsVXJsLCB7XG4gICAgbWV0aG9kLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAnQWNjZXB0JzogJ3RleHQvZXZlbnQtc3RyZWFtLCBhcHBsaWNhdGlvbi9qc29uJyxcbiAgICB9LFxuICAgIC4uLihib2R5ID8geyBib2R5IH0gOiB7fSksXG4gIH0pXG5cbiAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgIHRocm93IG5ldyBFcnJvcihgW0xFU10gSFRUUCAke3Jlc3BvbnNlLnN0YXR1c30gZnJvbSAke21ldGhvZH0gJHt1cmx9YClcbiAgfVxuXG4gIGNvbnN0IGNvbnRlbnRUeXBlID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpID8/ICcnXG5cbiAgLy8gXHUyNTAwXHUyNTAwIFNTRSBzdHJlYW06IERhdGFzdGFyIHNlcnZlci1zZW50IGV2ZW50cyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgLy8gV2hlbiB0aGUgc2VydmVyIHJldHVybnMgdGV4dC9ldmVudC1zdHJlYW0sIGNvbnN1bWUgdGhlIFNTRSBzdHJlYW0gYW5kXG4gIC8vIGFwcGx5IGRhdGFzdGFyLXBhdGNoLWVsZW1lbnRzIC8gZGF0YXN0YXItcGF0Y2gtc2lnbmFscyBldmVudHMgb3Vyc2VsdmVzLlxuICAvLyBUaGUgUHJvbWlzZSByZXNvbHZlcyB3aGVuIHRoZSBzdHJlYW0gY2xvc2VzIFx1MjAxNCBzbyBgdGhlbmAgaW4gTEVTIGNvcnJlY3RseVxuICAvLyB3YWl0cyBmb3IgYWxsIERPTSBwYXRjaGVzIGJlZm9yZSBwcm9jZWVkaW5nIHRvIHRoZSBuZXh0IHN0ZXAuXG4gIGlmIChjb250ZW50VHlwZS5pbmNsdWRlcygndGV4dC9ldmVudC1zdHJlYW0nKSkge1xuICAgIGF3YWl0IGNvbnN1bWVTU0VTdHJlYW0ocmVzcG9uc2UsIGN0eClcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cblxuICBpZiAoY29udGVudFR5cGUuaW5jbHVkZXMoJ2FwcGxpY2F0aW9uL2pzb24nKSkge1xuICAgIHJldHVybiBhd2FpdCByZXNwb25zZS5qc29uKClcbiAgfVxuICByZXR1cm4gYXdhaXQgcmVzcG9uc2UudGV4dCgpXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gU1NFIHN0cmVhbSBjb25zdW1lclxuLy9cbi8vIFJlYWRzIGEgRGF0YXN0YXIgU1NFIHN0cmVhbSBsaW5lLWJ5LWxpbmUgYW5kIGFwcGxpZXMgdGhlIGV2ZW50cy5cbi8vIFdlIGltcGxlbWVudCBhIG1pbmltYWwgc3Vic2V0IG9mIHRoZSBEYXRhc3RhciBTU0Ugc3BlYyBuZWVkZWQgZm9yIExFUzpcbi8vXG4vLyAgIGRhdGFzdGFyLXBhdGNoLWVsZW1lbnRzICBcdTIxOTIgYXBwbHkgdG8gdGhlIERPTSB1c2luZyBtb3JwaGRvbS1saXRlIGxvZ2ljXG4vLyAgIGRhdGFzdGFyLXBhdGNoLXNpZ25hbHMgICBcdTIxOTIgd3JpdGUgc2lnbmFsIHZhbHVlcyB2aWEgY3R4LnNldFNpZ25hbFxuLy9cbi8vIFRoaXMgcnVucyBlbnRpcmVseSBpbiB0aGUgYnJvd3NlciBcdTIwMTQgbm8gRGF0YXN0YXIgaW50ZXJuYWwgQVBJcyBuZWVkZWQuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuYXN5bmMgZnVuY3Rpb24gY29uc3VtZVNTRVN0cmVhbShcbiAgcmVzcG9uc2U6IFJlc3BvbnNlLFxuICBjdHg6IExFU0NvbnRleHRcbik6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoIXJlc3BvbnNlLmJvZHkpIHJldHVyblxuXG4gIGNvbnN0IHJlYWRlciAgPSByZXNwb25zZS5ib2R5LmdldFJlYWRlcigpXG4gIGNvbnN0IGRlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoKVxuICBsZXQgYnVmZmVyICAgID0gJydcblxuICAvLyBTU0UgZXZlbnQgYWNjdW11bGF0b3IgXHUyMDE0IHJlc2V0IGFmdGVyIGVhY2ggZG91YmxlLW5ld2xpbmVcbiAgbGV0IGV2ZW50VHlwZSA9ICcnXG4gIGxldCBkYXRhTGluZXM6IHN0cmluZ1tdID0gW11cblxuICBjb25zdCBhcHBseUV2ZW50ID0gKCkgPT4ge1xuICAgIGlmICghZXZlbnRUeXBlIHx8IGRhdGFMaW5lcy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gICAgaWYgKGV2ZW50VHlwZSA9PT0gJ2RhdGFzdGFyLXBhdGNoLWVsZW1lbnRzJykge1xuICAgICAgYXBwbHlQYXRjaEVsZW1lbnRzKGRhdGFMaW5lcywgY3R4KVxuICAgIH0gZWxzZSBpZiAoZXZlbnRUeXBlID09PSAnZGF0YXN0YXItcGF0Y2gtc2lnbmFscycpIHtcbiAgICAgIGFwcGx5UGF0Y2hTaWduYWxzKGRhdGFMaW5lcywgY3R4KVxuICAgIH1cblxuICAgIC8vIFJlc2V0IGFjY3VtdWxhdG9yXG4gICAgZXZlbnRUeXBlID0gJydcbiAgICBkYXRhTGluZXMgPSBbXVxuICB9XG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCB7IGRvbmUsIHZhbHVlIH0gPSBhd2FpdCByZWFkZXIucmVhZCgpXG4gICAgaWYgKGRvbmUpIHsgYXBwbHlFdmVudCgpOyBicmVhayB9XG5cbiAgICBidWZmZXIgKz0gZGVjb2Rlci5kZWNvZGUodmFsdWUsIHsgc3RyZWFtOiB0cnVlIH0pXG5cbiAgICAvLyBQcm9jZXNzIGNvbXBsZXRlIGxpbmVzIGZyb20gdGhlIGJ1ZmZlclxuICAgIGNvbnN0IGxpbmVzID0gYnVmZmVyLnNwbGl0KCdcXG4nKVxuICAgIGJ1ZmZlciA9IGxpbmVzLnBvcCgpID8/ICcnICAgLy8gbGFzdCBwYXJ0aWFsIGxpbmUgc3RheXMgaW4gYnVmZmVyXG5cbiAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJ2V2ZW50OicpKSB7XG4gICAgICAgIGV2ZW50VHlwZSA9IGxpbmUuc2xpY2UoJ2V2ZW50OicubGVuZ3RoKS50cmltKClcbiAgICAgIH0gZWxzZSBpZiAobGluZS5zdGFydHNXaXRoKCdkYXRhOicpKSB7XG4gICAgICAgIGRhdGFMaW5lcy5wdXNoKGxpbmUuc2xpY2UoJ2RhdGE6Jy5sZW5ndGgpLnRyaW1TdGFydCgpKVxuICAgICAgfSBlbHNlIGlmIChsaW5lID09PSAnJykge1xuICAgICAgICAvLyBCbGFuayBsaW5lID0gZW5kIG9mIHRoaXMgU1NFIGV2ZW50XG4gICAgICAgIGFwcGx5RXZlbnQoKVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDAgQXBwbHkgZGF0YXN0YXItcGF0Y2gtZWxlbWVudHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIGFwcGx5UGF0Y2hFbGVtZW50cyhkYXRhTGluZXM6IHN0cmluZ1tdLCBjdHg6IExFU0NvbnRleHQpOiB2b2lkIHtcbiAgLy8gUGFyc2UgdGhlIHN0cnVjdHVyZWQgZGF0YSBsaW5lcyBpbnRvIGFuIG9wdGlvbnMgb2JqZWN0XG4gIGxldCBzZWxlY3RvciAgICA9ICcnXG4gIGxldCBtb2RlICAgICAgICA9ICdvdXRlcidcbiAgY29uc3QgaHRtbExpbmVzOiBzdHJpbmdbXSA9IFtdXG5cbiAgZm9yIChjb25zdCBsaW5lIG9mIGRhdGFMaW5lcykge1xuICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJ3NlbGVjdG9yICcpKSAgeyBzZWxlY3RvciA9IGxpbmUuc2xpY2UoJ3NlbGVjdG9yICcubGVuZ3RoKS50cmltKCk7IGNvbnRpbnVlIH1cbiAgICBpZiAobGluZS5zdGFydHNXaXRoKCdtb2RlICcpKSAgICAgIHsgbW9kZSAgICAgPSBsaW5lLnNsaWNlKCdtb2RlICcubGVuZ3RoKS50cmltKCk7ICAgICBjb250aW51ZSB9XG4gICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnZWxlbWVudHMgJykpICB7IGh0bWxMaW5lcy5wdXNoKGxpbmUuc2xpY2UoJ2VsZW1lbnRzICcubGVuZ3RoKSk7ICAgY29udGludWUgfVxuICAgIC8vIExpbmVzIHdpdGggbm8gcHJlZml4IGFyZSBhbHNvIGVsZW1lbnQgY29udGVudCAoRGF0YXN0YXIgc3BlYyBhbGxvd3MgdGhpcylcbiAgICBodG1sTGluZXMucHVzaChsaW5lKVxuICB9XG5cbiAgY29uc3QgaHRtbCA9IGh0bWxMaW5lcy5qb2luKCdcXG4nKS50cmltKClcblxuICBjb25zdCB0YXJnZXQgPSBzZWxlY3RvclxuICAgID8gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcilcbiAgICA6IG51bGxcblxuICBjb25zb2xlLmxvZyhgW0xFUzpzc2VdIHBhdGNoLWVsZW1lbnRzIG1vZGU9JHttb2RlfSBzZWxlY3Rvcj1cIiR7c2VsZWN0b3J9XCIgaHRtbC5sZW49JHtodG1sLmxlbmd0aH1gKVxuXG4gIGlmIChtb2RlID09PSAncmVtb3ZlJykge1xuICAgIC8vIFJlbW92ZSBhbGwgbWF0Y2hpbmcgZWxlbWVudHNcbiAgICBjb25zdCB0b1JlbW92ZSA9IHNlbGVjdG9yXG4gICAgICA/IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpXG4gICAgICA6IFtdXG4gICAgdG9SZW1vdmUuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSlcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChtb2RlID09PSAnYXBwZW5kJyAmJiB0YXJnZXQpIHtcbiAgICBjb25zdCBmcmFnID0gcGFyc2VIVE1MKGh0bWwpXG4gICAgdGFyZ2V0LmFwcGVuZChmcmFnKVxuICAgIHJldHVyblxuICB9XG5cbiAgaWYgKG1vZGUgPT09ICdwcmVwZW5kJyAmJiB0YXJnZXQpIHtcbiAgICBjb25zdCBmcmFnID0gcGFyc2VIVE1MKGh0bWwpXG4gICAgdGFyZ2V0LnByZXBlbmQoZnJhZylcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChtb2RlID09PSAnaW5uZXInICYmIHRhcmdldCkge1xuICAgIHRhcmdldC5pbm5lckhUTUwgPSBodG1sXG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAobW9kZSA9PT0gJ291dGVyJyAmJiB0YXJnZXQpIHtcbiAgICBjb25zdCBmcmFnID0gcGFyc2VIVE1MKGh0bWwpXG4gICAgdGFyZ2V0LnJlcGxhY2VXaXRoKGZyYWcpXG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAobW9kZSA9PT0gJ2JlZm9yZScgJiYgdGFyZ2V0KSB7XG4gICAgY29uc3QgZnJhZyA9IHBhcnNlSFRNTChodG1sKVxuICAgIHRhcmdldC5iZWZvcmUoZnJhZylcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChtb2RlID09PSAnYWZ0ZXInICYmIHRhcmdldCkge1xuICAgIGNvbnN0IGZyYWcgPSBwYXJzZUhUTUwoaHRtbClcbiAgICB0YXJnZXQuYWZ0ZXIoZnJhZylcbiAgICByZXR1cm5cbiAgfVxuXG4gIC8vIE5vIHNlbGVjdG9yOiB0cnkgdG8gcGF0Y2ggYnkgZWxlbWVudCBJRHNcbiAgaWYgKCFzZWxlY3RvciAmJiBodG1sKSB7XG4gICAgY29uc3QgZnJhZyA9IHBhcnNlSFRNTChodG1sKVxuICAgIGZvciAoY29uc3QgZWwgb2YgQXJyYXkuZnJvbShmcmFnLmNoaWxkcmVuKSkge1xuICAgICAgY29uc3QgaWQgPSBlbC5pZFxuICAgICAgaWYgKGlkKSB7XG4gICAgICAgIGNvbnN0IGV4aXN0aW5nID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXG4gICAgICAgIGlmIChleGlzdGluZykgZXhpc3RpbmcucmVwbGFjZVdpdGgoZWwpXG4gICAgICAgIGVsc2UgZG9jdW1lbnQuYm9keS5hcHBlbmQoZWwpXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHBhcnNlSFRNTChodG1sOiBzdHJpbmcpOiBEb2N1bWVudEZyYWdtZW50IHtcbiAgY29uc3QgdGVtcGxhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpXG4gIHRlbXBsYXRlLmlubmVySFRNTCA9IGh0bWxcbiAgcmV0dXJuIHRlbXBsYXRlLmNvbnRlbnRcbn1cblxuLy8gXHUyNTAwXHUyNTAwIEFwcGx5IGRhdGFzdGFyLXBhdGNoLXNpZ25hbHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIGFwcGx5UGF0Y2hTaWduYWxzKGRhdGFMaW5lczogc3RyaW5nW10sIGN0eDogTEVTQ29udGV4dCk6IHZvaWQge1xuICBmb3IgKGNvbnN0IGxpbmUgb2YgZGF0YUxpbmVzKSB7XG4gICAgaWYgKCFsaW5lLnN0YXJ0c1dpdGgoJ3NpZ25hbHMgJykgJiYgIWxpbmUuc3RhcnRzV2l0aCgneycpKSBjb250aW51ZVxuXG4gICAgY29uc3QganNvblN0ciA9IGxpbmUuc3RhcnRzV2l0aCgnc2lnbmFscyAnKVxuICAgICAgPyBsaW5lLnNsaWNlKCdzaWduYWxzICcubGVuZ3RoKVxuICAgICAgOiBsaW5lXG5cbiAgICB0cnkge1xuICAgICAgY29uc3Qgc2lnbmFscyA9IEpTT04ucGFyc2UoanNvblN0cikgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbiAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHNpZ25hbHMpKSB7XG4gICAgICAgIGN0eC5zZXRTaWduYWwoa2V5LCB2YWx1ZSlcbiAgICAgICAgY29uc29sZS5sb2coYFtMRVM6c3NlXSBwYXRjaC1zaWduYWxzICQke2tleX0gPWAsIHZhbHVlKVxuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTOnNzZV0gRmFpbGVkIHRvIHBhcnNlIHBhdGNoLXNpZ25hbHMgSlNPTjonLCBqc29uU3RyKVxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFNlbGVjdG9yIHJlc29sdXRpb25cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFJlc29sdmVzIHZhcmlhYmxlIHJlZmVyZW5jZXMgaW4gYW4gYW5pbWF0aW9uIHNlbGVjdG9yLlxuICpcbiAqIEV4YW1wbGU6IGBbZGF0YS1pdGVtLWlkOiBpZF1gIHdoZXJlIGBpZGAgaXMgYSBsb2NhbCB2YXJpYWJsZVxuICogYmVjb21lcyBgW2RhdGEtaXRlbS1pZD1cIjEyM1wiXWAgYWZ0ZXIgc3Vic3RpdHV0aW9uLlxuICpcbiAqIFNpbXBsZSBhcHByb2FjaCBmb3IgUGhhc2UgMzogbG9vayBmb3IgYDogdmFybmFtZWAgcGF0dGVybnMgaW4gYXR0cmlidXRlXG4gKiBzZWxlY3RvcnMgYW5kIHN1YnN0aXR1dGUgZnJvbSBzY29wZS5cbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZVNlbGVjdG9yKHNlbGVjdG9yOiBzdHJpbmcsIGN0eDogTEVTQ29udGV4dCk6IHN0cmluZyB7XG4gIC8vIEhhbmRsZSBhdHRyaWJ1dGUgc2VsZWN0b3Igd2l0aCB2YXJpYWJsZTogW2RhdGEtaXRlbS1pZDogaWRdXG4gIHJldHVybiBzZWxlY3Rvci5yZXBsYWNlKC9cXFsoW15cXF1dKyk6XFxzKihcXHcrKVxcXS9nLCAoX21hdGNoLCBhdHRyLCB2YXJOYW1lKSA9PiB7XG4gICAgY29uc3QgdmFsdWUgPSBjdHguc2NvcGUuZ2V0KHZhck5hbWUpID8/IGN0eC5nZXRTaWduYWwodmFyTmFtZSlcbiAgICByZXR1cm4gYFske2F0dHJ9PVwiJHtTdHJpbmcodmFsdWUpfVwiXWBcbiAgfSlcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBHdWFyZC1hd2FyZSBjb21tYW5kIGV4ZWN1dGlvbiAodXNlZCBieSBQaGFzZSA0IGV2ZW50IHdpcmluZylcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEV4ZWN1dGVzIGEgY29tbWFuZCBieSBuYW1lLCBjaGVja2luZyBpdHMgZ3VhcmQgZmlyc3QuXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGNvbW1hbmQgcmFuLCBmYWxzZSBpZiB0aGUgZ3VhcmQgcmVqZWN0ZWQgaXQuXG4gKlxuICogVGhpcyBpcyB0aGUgcHVibGljIEFQSSBmb3IgUGhhc2UgNCBldmVudCBoYW5kbGVycyB0aGF0IGNhbGwgY29tbWFuZHMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5Db21tYW5kKFxuICBuYW1lOiBzdHJpbmcsXG4gIGFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICBjdHg6IExFU0NvbnRleHRcbik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCBkZWYgPSBjdHguY29tbWFuZHMuZ2V0KG5hbWUpXG4gIGlmICghZGVmKSB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTXSBVbmtub3duIGNvbW1hbmQ6IFwiJHtuYW1lfVwiYClcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGlmIChkZWYuZ3VhcmQpIHtcbiAgICBpZiAoIWV2YWxHdWFyZChkZWYuZ3VhcmQsIGN0eCkpIHJldHVybiBmYWxzZVxuICB9XG5cbiAgY29uc3Qgc2NvcGUgPSBjdHguc2NvcGUuY2hpbGQoKVxuICBmb3IgKGNvbnN0IGFyZ0RlZiBvZiBkZWYuYXJncykge1xuICAgIHNjb3BlLnNldChhcmdEZWYubmFtZSwgYXJnc1thcmdEZWYubmFtZV0gPz8gbnVsbClcbiAgfVxuXG4gIGF3YWl0IGV4ZWN1dGUoZGVmLmJvZHksIHsgLi4uY3R4LCBzY29wZSB9KVxuICByZXR1cm4gdHJ1ZVxufVxuIiwgImltcG9ydCB0eXBlIHsgTEVTTm9kZSwgRXhwck5vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuLyoqIEEgc2luZ2xlIHR5cGVkIGFyZ3VtZW50IGRlZmluaXRpb24gZnJvbSBhcmdzPVwiW25hbWU6dHlwZSAgLi4uXVwiICovXG5leHBvcnQgaW50ZXJmYWNlIEFyZ0RlZiB7XG4gIG5hbWU6IHN0cmluZ1xuICAvKiogJ25pbCcgfCAnaW50JyB8ICdkZWMnIHwgJ3N0cicgfCAnYXJyJyB8ICdvYmonIHwgJ2Jvb2wnIHwgJ2R5bicgKi9cbiAgdHlwZTogc3RyaW5nXG4gIC8qKiBEZWZhdWx0IHZhbHVlIGV4cHJlc3Npb24sIGlmIHByb3ZpZGVkIChlLmcuIGF0dGVtcHQ6aW50PTApICovXG4gIGRlZmF1bHQ/OiBFeHByTm9kZVxufVxuXG4vKiogQSBmdWxseSBwYXJzZWQgPGxvY2FsLWNvbW1hbmQ+IGRlZmluaXRpb24uICovXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmREZWYge1xuICBuYW1lOiBzdHJpbmdcbiAgYXJnczogQXJnRGVmW11cbiAgLyoqIEd1YXJkIGV4cHJlc3Npb24gc3RyaW5nIFx1MjAxNCBldmFsdWF0ZWQgYmVmb3JlIGV4ZWN1dGlvbi4gRmFsc3kgPSBzaWxlbnQgbm8tb3AuICovXG4gIGd1YXJkPzogc3RyaW5nXG4gIC8qKiBUaGUgcGFyc2VkIGJvZHkgQVNUICovXG4gIGJvZHk6IExFU05vZGVcbiAgLyoqIFRoZSA8bG9jYWwtY29tbWFuZD4gRE9NIGVsZW1lbnQsIGtlcHQgZm9yIGVycm9yIHJlcG9ydGluZyAqL1xuICBlbGVtZW50OiBFbGVtZW50XG59XG5cbmV4cG9ydCBjbGFzcyBDb21tYW5kUmVnaXN0cnkge1xuICBwcml2YXRlIGNvbW1hbmRzID0gbmV3IE1hcDxzdHJpbmcsIENvbW1hbmREZWY+KClcblxuICByZWdpc3RlcihkZWY6IENvbW1hbmREZWYpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5jb21tYW5kcy5oYXMoZGVmLm5hbWUpKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgIGBbTEVTXSBEdXBsaWNhdGUgY29tbWFuZCBcIiR7ZGVmLm5hbWV9XCIgXHUyMDE0IHByZXZpb3VzIGRlZmluaXRpb24gb3ZlcndyaXR0ZW4uYCxcbiAgICAgICAgZGVmLmVsZW1lbnRcbiAgICAgIClcbiAgICB9XG4gICAgdGhpcy5jb21tYW5kcy5zZXQoZGVmLm5hbWUsIGRlZilcbiAgfVxuXG4gIGdldChuYW1lOiBzdHJpbmcpOiBDb21tYW5kRGVmIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kcy5nZXQobmFtZSlcbiAgfVxuXG4gIGhhcyhuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kcy5oYXMobmFtZSlcbiAgfVxuXG4gIG5hbWVzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmNvbW1hbmRzLmtleXMoKSlcbiAgfVxufVxuIiwgIi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gTEVTIE1vZHVsZSBzeXN0ZW1cbi8vXG4vLyBNb2R1bGVzIGV4dGVuZCB0aGUgc2V0IG9mIGFuaW1hdGlvbi9lZmZlY3QgcHJpbWl0aXZlcyBhdmFpbGFibGUgaW5cbi8vIDxsb2NhbC1jb21tYW5kPiBib2RpZXMuIFR3byBraW5kczpcbi8vXG4vLyAgIEJ1aWx0LWluOiAgPHVzZS1tb2R1bGUgdHlwZT1cImFuaW1hdGlvblwiPlxuLy8gICBVc2VybGFuZDogIDx1c2UtbW9kdWxlIHNyYz1cIi4vc2Nyb2xsLWVmZmVjdHMuanNcIj5cbi8vXG4vLyBCb3RoIHJlc29sdmUgdG8gYSBMRVNNb2R1bGUgYXQgcnVudGltZS5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEEgcHJpbWl0aXZlIGlzIGFuIGFzeW5jIG9wZXJhdGlvbiB0aGUgZXhlY3V0b3IgZGlzcGF0Y2hlcyBmb3IgQW5pbWF0aW9uTm9kZS5cbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3IgIENTUyBzZWxlY3RvciBzdHJpbmcgKGFscmVhZHkgcmVzb2x2ZWQgXHUyMDE0IG5vIHZhcmlhYmxlIHN1YnN0aXR1dGlvbiBuZWVkZWQgaGVyZSlcbiAqIEBwYXJhbSBkdXJhdGlvbiAgbWlsbGlzZWNvbmRzXG4gKiBAcGFyYW0gZWFzaW5nICAgIENTUyBlYXNpbmcgc3RyaW5nLCBlLmcuICdlYXNlLW91dCdcbiAqIEBwYXJhbSBvcHRpb25zICAga2V5L3ZhbHVlIG9wdGlvbnMgZnJvbSB0aGUgdHJhaWxpbmcgWy4uLl0gYmxvY2ssIGFscmVhZHkgZXZhbHVhdGVkXG4gKiBAcGFyYW0gaG9zdCAgICAgIHRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBlbGVtZW50ICh1c2VkIGFzIHF1ZXJ5U2VsZWN0b3Igcm9vdClcbiAqL1xuZXhwb3J0IHR5cGUgTEVTUHJpbWl0aXZlID0gKFxuICBzZWxlY3Rvcjogc3RyaW5nLFxuICBkdXJhdGlvbjogbnVtYmVyLFxuICBlYXNpbmc6IHN0cmluZyxcbiAgb3B0aW9uczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIGhvc3Q6IEVsZW1lbnRcbikgPT4gUHJvbWlzZTx2b2lkPlxuXG4vKiogVGhlIHNoYXBlIGEgdXNlcmxhbmQgbW9kdWxlIG11c3QgZXhwb3J0IGFzIGl0cyBkZWZhdWx0IGV4cG9ydC4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTEVTTW9kdWxlIHtcbiAgLyoqIEh1bWFuLXJlYWRhYmxlIG5hbWUgZm9yIGVycm9yIG1lc3NhZ2VzICovXG4gIG5hbWU6IHN0cmluZ1xuICBwcmltaXRpdmVzOiBSZWNvcmQ8c3RyaW5nLCBMRVNQcmltaXRpdmU+XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBSZWdpc3RyeSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZXhwb3J0IGNsYXNzIE1vZHVsZVJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBwcmltaXRpdmVzID0gbmV3IE1hcDxzdHJpbmcsIExFU1ByaW1pdGl2ZT4oKVxuICBwcml2YXRlIGxvYWRlZE1vZHVsZXM6IHN0cmluZ1tdID0gW11cblxuICByZWdpc3Rlcihtb2R1bGU6IExFU01vZHVsZSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgW25hbWUsIGZuXSBvZiBPYmplY3QuZW50cmllcyhtb2R1bGUucHJpbWl0aXZlcykpIHtcbiAgICAgIHRoaXMucHJpbWl0aXZlcy5zZXQobmFtZSwgZm4pXG4gICAgfVxuICAgIHRoaXMubG9hZGVkTW9kdWxlcy5wdXNoKG1vZHVsZS5uYW1lKVxuICAgIGNvbnNvbGUubG9nKGBbTEVTXSBtb2R1bGUgbG9hZGVkOiBcIiR7bW9kdWxlLm5hbWV9XCJgLCBPYmplY3Qua2V5cyhtb2R1bGUucHJpbWl0aXZlcykpXG4gIH1cblxuICBnZXQocHJpbWl0aXZlOiBzdHJpbmcpOiBMRVNQcmltaXRpdmUgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLnByaW1pdGl2ZXMuZ2V0KHByaW1pdGl2ZSlcbiAgfVxuXG4gIGhhcyhwcmltaXRpdmU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnByaW1pdGl2ZXMuaGFzKHByaW1pdGl2ZSlcbiAgfVxuXG4gIC8qKiBEZXYtbW9kZSBoZWxwOiB3aGljaCBtb2R1bGUgZXhwb3J0cyBhIGdpdmVuIHByaW1pdGl2ZT8gKi9cbiAgaGludEZvcihwcmltaXRpdmU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgLy8gV2lsbCBiZSBlbnJpY2hlZCBpbiBQaGFzZSA4IHdpdGggcGVyLW1vZHVsZSBwcmltaXRpdmUgbWFuaWZlc3RzLlxuICAgIHJldHVybiBgUHJpbWl0aXZlIFwiJHtwcmltaXRpdmV9XCIgbm90IGZvdW5kLiBMb2FkZWQgbW9kdWxlczogWyR7dGhpcy5sb2FkZWRNb2R1bGVzLmpvaW4oJywgJyl9XS4gRGlkIHlvdSBmb3JnZXQgPHVzZS1tb2R1bGUgdHlwZT1cImFuaW1hdGlvblwiPj9gXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIExvYWRlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqIEJ1aWx0LWluIG1vZHVsZSByZWdpc3RyeTogdHlwZSBuYW1lIFx1MjE5MiBpbXBvcnQgcGF0aCAqL1xuY29uc3QgQlVJTFRJTl9NT0RVTEVTOiBSZWNvcmQ8c3RyaW5nLCAoKSA9PiBQcm9taXNlPHsgZGVmYXVsdDogTEVTTW9kdWxlIH0+PiA9IHtcbiAgYW5pbWF0aW9uOiAoKSA9PiBpbXBvcnQoJy4vYnVpbHRpbi9hbmltYXRpb24uanMnKSxcbn1cblxuLyoqXG4gKiBSZXNvbHZlIGEgPHVzZS1tb2R1bGU+IGVsZW1lbnQgdG8gYSBMRVNNb2R1bGUgYW5kIHJlZ2lzdGVyIGl0LlxuICogQ2FsbGVkIGR1cmluZyBQaGFzZSAxIERPTSByZWFkaW5nIChQaGFzZSA4IGNvbXBsZXRlcyB0aGUgc3JjPSBwYXRoKS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRNb2R1bGUoXG4gIHJlZ2lzdHJ5OiBNb2R1bGVSZWdpc3RyeSxcbiAgb3B0czogeyB0eXBlPzogc3RyaW5nOyBzcmM/OiBzdHJpbmcgfVxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChvcHRzLnR5cGUpIHtcbiAgICBjb25zdCBsb2FkZXIgPSBCVUlMVElOX01PRFVMRVNbb3B0cy50eXBlXVxuICAgIGlmICghbG9hZGVyKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVNdIFVua25vd24gYnVpbHQtaW4gbW9kdWxlIHR5cGU6IFwiJHtvcHRzLnR5cGV9XCIuIEF2YWlsYWJsZTogJHtPYmplY3Qua2V5cyhCVUlMVElOX01PRFVMRVMpLmpvaW4oJywgJyl9YClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25zdCBtb2QgPSBhd2FpdCBsb2FkZXIoKVxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKG1vZC5kZWZhdWx0KVxuICAgIHJldHVyblxuICB9XG5cbiAgaWYgKG9wdHMuc3JjKSB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIFJlc29sdmUgcmVsYXRpdmUgcGF0aHMgYWdhaW5zdCB0aGUgcGFnZSBVUkwsIG5vdCB0aGUgYnVuZGxlIFVSTC5cbiAgICAgIC8vIFdpdGhvdXQgdGhpcywgJy4vc2Nyb2xsLWVmZmVjdHMuanMnIHJlc29sdmVzIHRvICcvZGlzdC9zY3JvbGwtZWZmZWN0cy5qcydcbiAgICAgIC8vIChyZWxhdGl2ZSB0byB0aGUgYnVuZGxlIGF0IC9kaXN0L2xvY2FsLWV2ZW50LXNjcmlwdC5qcykgaW5zdGVhZCBvZlxuICAgICAgLy8gJy9zY3JvbGwtZWZmZWN0cy5qcycgKHJlbGF0aXZlIHRvIHRoZSBIVE1MIHBhZ2UpLlxuICAgICAgY29uc3QgcmVzb2x2ZWRTcmMgPSBuZXcgVVJMKG9wdHMuc3JjLCBkb2N1bWVudC5iYXNlVVJJKS5ocmVmXG4gICAgICBjb25zdCBtb2QgPSBhd2FpdCBpbXBvcnQoLyogQHZpdGUtaWdub3JlICovIHJlc29sdmVkU3JjKVxuICAgICAgaWYgKCFtb2QuZGVmYXVsdCB8fCB0eXBlb2YgbW9kLmRlZmF1bHQucHJpbWl0aXZlcyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBbTEVTXSBNb2R1bGUgYXQgXCIke29wdHMuc3JjfVwiIGRvZXMgbm90IGV4cG9ydCBhIHZhbGlkIExFU01vZHVsZS4gRXhwZWN0ZWQ6IHsgbmFtZTogc3RyaW5nLCBwcmltaXRpdmVzOiBSZWNvcmQ8c3RyaW5nLCBGdW5jdGlvbj4gfWApXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgcmVnaXN0cnkucmVnaXN0ZXIobW9kLmRlZmF1bHQgYXMgTEVTTW9kdWxlKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihgW0xFU10gRmFpbGVkIHRvIGxvYWQgbW9kdWxlIGZyb20gXCIke29wdHMuc3JjfVwiOmAsIGVycilcbiAgICB9XG4gICAgcmV0dXJuXG4gIH1cblxuICBjb25zb2xlLndhcm4oJ1tMRVNdIDx1c2UtbW9kdWxlPiByZXF1aXJlcyBlaXRoZXIgdHlwZT0gb3Igc3JjPSBhdHRyaWJ1dGUuJylcbn1cbiIsICIvKipcbiAqIFN0cmlwcyB0aGUgYmFja3RpY2sgd3JhcHBlciBmcm9tIGEgbXVsdGktbGluZSBMRVMgYm9keSBzdHJpbmcgYW5kXG4gKiBub3JtYWxpemVzIGluZGVudGF0aW9uLCBwcm9kdWNpbmcgYSBjbGVhbiBzdHJpbmcgdGhlIHBhcnNlciBjYW4gd29yayB3aXRoLlxuICpcbiAqIENvbnZlbnRpb246XG4gKiAgIFNpbmdsZS1saW5lOiAgaGFuZGxlPVwiZW1pdCBmZWVkOmluaXRcIiAgICAgICAgICAgXHUyMTkyIFwiZW1pdCBmZWVkOmluaXRcIlxuICogICBNdWx0aS1saW5lOiAgIGRvPVwiYFxcbiAgICAgIHNldC4uLlxcbiAgICBgXCIgICAgICAgIFx1MjE5MiBcInNldC4uLlxcbi4uLlwiXG4gKlxuICogQWxnb3JpdGhtOlxuICogICAxLiBUcmltIG91dGVyIHdoaXRlc3BhY2UgZnJvbSB0aGUgcmF3IGF0dHJpYnV0ZSB2YWx1ZS5cbiAqICAgMi4gSWYgd3JhcHBlZCBpbiBiYWNrdGlja3MsIHN0cmlwIHRoZW0gXHUyMDE0IGRvIE5PVCBpbm5lci10cmltIHlldC5cbiAqICAgMy4gU3BsaXQgaW50byBsaW5lcyBhbmQgY29tcHV0ZSBtaW5pbXVtIG5vbi16ZXJvIGluZGVudGF0aW9uXG4gKiAgICAgIGFjcm9zcyBhbGwgbm9uLWVtcHR5IGxpbmVzLiBUaGlzIGlzIHRoZSBIVE1MIGF0dHJpYnV0ZSBpbmRlbnRhdGlvblxuICogICAgICBsZXZlbCB0byByZW1vdmUuXG4gKiAgIDQuIFN0cmlwIHRoYXQgbWFueSBsZWFkaW5nIGNoYXJhY3RlcnMgZnJvbSBldmVyeSBsaW5lLlxuICogICA1LiBEcm9wIGxlYWRpbmcvdHJhaWxpbmcgYmxhbmsgbGluZXMsIHJldHVybiBqb2luZWQgcmVzdWx0LlxuICpcbiAqIENydWNpYWxseSwgc3RlcCAyIGRvZXMgTk9UIGNhbGwgLnRyaW0oKSBvbiB0aGUgaW5uZXIgY29udGVudCBiZWZvcmVcbiAqIGNvbXB1dGluZyBpbmRlbnRhdGlvbi4gQW4gaW5uZXIgLnRyaW0oKSB3b3VsZCBkZXN0cm95IHRoZSBsZWFkaW5nXG4gKiB3aGl0ZXNwYWNlIG9uIGxpbmUgMSwgbWFraW5nIG1pbkluZGVudCA9IDAgYW5kIGxlYXZpbmcgYWxsIG90aGVyXG4gKiBsaW5lcyB1bi1kZS1pbmRlbnRlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwQm9keShyYXc6IHN0cmluZyk6IHN0cmluZyB7XG4gIGxldCBzID0gcmF3LnRyaW0oKVxuXG4gIC8vIFN0cmlwIGJhY2t0aWNrIHdyYXBwZXIgXHUyMDE0IGJ1dCBwcmVzZXJ2ZSBpbnRlcm5hbCB3aGl0ZXNwYWNlIGZvciBkZS1pbmRlbnRcbiAgaWYgKHMuc3RhcnRzV2l0aCgnYCcpICYmIHMuZW5kc1dpdGgoJ2AnKSkge1xuICAgIHMgPSBzLnNsaWNlKDEsIC0xKVxuICAgIC8vIERvIE5PVCAudHJpbSgpIGhlcmUgXHUyMDE0IHRoYXQga2lsbHMgdGhlIGxlYWRpbmcgaW5kZW50IG9uIGxpbmUgMVxuICB9XG5cbiAgY29uc3QgbGluZXMgPSBzLnNwbGl0KCdcXG4nKVxuICBjb25zdCBub25FbXB0eSA9IGxpbmVzLmZpbHRlcihsID0+IGwudHJpbSgpLmxlbmd0aCA+IDApXG4gIGlmIChub25FbXB0eS5sZW5ndGggPT09IDApIHJldHVybiAnJ1xuXG4gIC8vIEZvciBzaW5nbGUtbGluZSB2YWx1ZXMgKG5vIG5ld2xpbmVzIGFmdGVyIGJhY2t0aWNrIHN0cmlwKSwganVzdCB0cmltXG4gIGlmIChsaW5lcy5sZW5ndGggPT09IDEpIHJldHVybiBzLnRyaW0oKVxuXG4gIC8vIE1pbmltdW0gbGVhZGluZyB3aGl0ZXNwYWNlIGFjcm9zcyBub24tZW1wdHkgbGluZXNcbiAgY29uc3QgbWluSW5kZW50ID0gbm9uRW1wdHkucmVkdWNlKChtaW4sIGxpbmUpID0+IHtcbiAgICBjb25zdCBsZWFkaW5nID0gbGluZS5tYXRjaCgvXihcXHMqKS8pPy5bMV0/Lmxlbmd0aCA/PyAwXG4gICAgcmV0dXJuIE1hdGgubWluKG1pbiwgbGVhZGluZylcbiAgfSwgSW5maW5pdHkpXG5cbiAgY29uc3Qgc3RyaXBwZWQgPSBtaW5JbmRlbnQgPT09IDAgfHwgbWluSW5kZW50ID09PSBJbmZpbml0eVxuICAgID8gbGluZXNcbiAgICA6IGxpbmVzLm1hcChsaW5lID0+IGxpbmUubGVuZ3RoID49IG1pbkluZGVudCA/IGxpbmUuc2xpY2UobWluSW5kZW50KSA6IGxpbmUudHJpbVN0YXJ0KCkpXG5cbiAgLy8gRHJvcCBsZWFkaW5nIGFuZCB0cmFpbGluZyBibGFuayBsaW5lcyAodGhlIG5ld2xpbmVzIGFyb3VuZCBiYWNrdGljayBjb250ZW50KVxuICBsZXQgc3RhcnQgPSAwXG4gIGxldCBlbmQgPSBzdHJpcHBlZC5sZW5ndGggLSAxXG4gIHdoaWxlIChzdGFydCA8PSBlbmQgJiYgc3RyaXBwZWRbc3RhcnRdPy50cmltKCkgPT09ICcnKSBzdGFydCsrXG4gIHdoaWxlIChlbmQgPj0gc3RhcnQgJiYgc3RyaXBwZWRbZW5kXT8udHJpbSgpID09PSAnJykgZW5kLS1cblxuICByZXR1cm4gc3RyaXBwZWQuc2xpY2Uoc3RhcnQsIGVuZCArIDEpLmpvaW4oJ1xcbicpXG59XG4iLCAiaW1wb3J0IHR5cGUge1xuICBMRVNDb25maWcsXG4gIE1vZHVsZURlY2wsXG4gIENvbW1hbmREZWNsLFxuICBFdmVudEhhbmRsZXJEZWNsLFxuICBTaWduYWxXYXRjaGVyRGVjbCxcbiAgT25Mb2FkRGVjbCxcbiAgT25FbnRlckRlY2wsXG4gIE9uRXhpdERlY2wsXG59IGZyb20gJy4vY29uZmlnLmpzJ1xuaW1wb3J0IHsgc3RyaXBCb2R5IH0gZnJvbSAnLi9zdHJpcEJvZHkuanMnXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gVGFnIG5hbWUgXHUyMTkyIGhhbmRsZXIgbWFwXG4vLyBFYWNoIGhhbmRsZXIgcmVhZHMgYXR0cmlidXRlcyBmcm9tIGEgY2hpbGQgZWxlbWVudCBhbmQgcHVzaGVzIGEgdHlwZWQgZGVjbFxuLy8gaW50byB0aGUgY29uZmlnIGJlaW5nIGJ1aWx0LiBVbmtub3duIHRhZ3MgYXJlIGNvbGxlY3RlZCBmb3Igd2FybmluZy5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG50eXBlIEhhbmRsZXIgPSAoZWw6IEVsZW1lbnQsIGNvbmZpZzogTEVTQ29uZmlnKSA9PiB2b2lkXG5cbmNvbnN0IEhBTkRMRVJTOiBSZWNvcmQ8c3RyaW5nLCBIYW5kbGVyPiA9IHtcblxuICAndXNlLW1vZHVsZScoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IHR5cGUgPSBlbC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKT8udHJpbSgpID8/IG51bGxcbiAgICBjb25zdCBzcmMgID0gZWwuZ2V0QXR0cmlidXRlKCdzcmMnKT8udHJpbSgpICA/PyBudWxsXG5cbiAgICBpZiAoIXR5cGUgJiYgIXNyYykge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8dXNlLW1vZHVsZT4gaGFzIG5laXRoZXIgdHlwZT0gbm9yIHNyYz0gXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25maWcubW9kdWxlcy5wdXNoKHsgdHlwZSwgc3JjLCBlbGVtZW50OiBlbCB9KVxuICB9LFxuXG4gICdsb2NhbC1jb21tYW5kJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgbmFtZSA9IGVsLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgPz8gJydcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdkbycpPy50cmltKCkgICA/PyAnJ1xuXG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDxsb2NhbC1jb21tYW5kPiBtaXNzaW5nIHJlcXVpcmVkIG5hbWU9IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBpZiAoIWJvZHkpIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFU10gPGxvY2FsLWNvbW1hbmQgbmFtZT1cIiR7bmFtZX1cIj4gbWlzc2luZyByZXF1aXJlZCBkbz0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLmAsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uZmlnLmNvbW1hbmRzLnB1c2goe1xuICAgICAgbmFtZSxcbiAgICAgIGFyZ3NSYXc6IGVsLmdldEF0dHJpYnV0ZSgnYXJncycpPy50cmltKCkgID8/ICcnLFxuICAgICAgZ3VhcmQ6ICAgZWwuZ2V0QXR0cmlidXRlKCdndWFyZCcpPy50cmltKCkgPz8gbnVsbCxcbiAgICAgIGJvZHk6ICAgIHN0cmlwQm9keShib2R5KSxcbiAgICAgIGVsZW1lbnQ6IGVsLFxuICAgIH0pXG4gIH0sXG5cbiAgJ29uLWV2ZW50JyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgbmFtZSA9IGVsLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgICA/PyAnJ1xuICAgIGNvbnN0IGJvZHkgPSBlbC5nZXRBdHRyaWJ1dGUoJ2hhbmRsZScpPy50cmltKCkgPz8gJydcblxuICAgIGlmICghbmFtZSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tZXZlbnQ+IG1pc3NpbmcgcmVxdWlyZWQgbmFtZT0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTXSA8b24tZXZlbnQgbmFtZT1cIiR7bmFtZX1cIj4gbWlzc2luZyByZXF1aXJlZCBoYW5kbGU9IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC5gLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbmZpZy5vbkV2ZW50LnB1c2goeyBuYW1lLCBib2R5OiBzdHJpcEJvZHkoYm9keSksIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG5cbiAgJ29uLXNpZ25hbCcoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IG5hbWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpICAgPz8gJydcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdoYW5kbGUnKT8udHJpbSgpID8/ICcnXG5cbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPG9uLXNpZ25hbD4gbWlzc2luZyByZXF1aXJlZCBuYW1lPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVNdIDxvbi1zaWduYWwgbmFtZT1cIiR7bmFtZX1cIj4gbWlzc2luZyByZXF1aXJlZCBoYW5kbGU9IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC5gLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbmZpZy5vblNpZ25hbC5wdXNoKHtcbiAgICAgIG5hbWUsXG4gICAgICB3aGVuOiAgICBlbC5nZXRBdHRyaWJ1dGUoJ3doZW4nKT8udHJpbSgpID8/IG51bGwsXG4gICAgICBib2R5OiAgICBzdHJpcEJvZHkoYm9keSksXG4gICAgICBlbGVtZW50OiBlbCxcbiAgICB9KVxuICB9LFxuXG4gICdvbi1sb2FkJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tbG9hZD4gbWlzc2luZyByZXF1aXJlZCBydW49IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25maWcub25Mb2FkLnB1c2goeyBib2R5OiBzdHJpcEJvZHkoYm9keSksIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG5cbiAgJ29uLWVudGVyJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tZW50ZXI+IG1pc3NpbmcgcmVxdWlyZWQgcnVuPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uZmlnLm9uRW50ZXIucHVzaCh7XG4gICAgICB3aGVuOiAgICBlbC5nZXRBdHRyaWJ1dGUoJ3doZW4nKT8udHJpbSgpID8/IG51bGwsXG4gICAgICBib2R5OiAgICBzdHJpcEJvZHkoYm9keSksXG4gICAgICBlbGVtZW50OiBlbCxcbiAgICB9KVxuICB9LFxuXG4gICdvbi1leGl0JyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tZXhpdD4gbWlzc2luZyByZXF1aXJlZCBydW49IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25maWcub25FeGl0LnB1c2goeyBib2R5OiBzdHJpcEJvZHkoYm9keSksIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gcmVhZENvbmZpZyBcdTIwMTQgdGhlIHB1YmxpYyBlbnRyeSBwb2ludFxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogV2Fsa3MgdGhlIGRpcmVjdCBjaGlsZHJlbiBvZiBhIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGVsZW1lbnQgYW5kXG4gKiBwcm9kdWNlcyBhIHN0cnVjdHVyZWQgTEVTQ29uZmlnLlxuICpcbiAqIE9ubHkgZGlyZWN0IGNoaWxkcmVuIGFyZSByZWFkIFx1MjAxNCBuZXN0ZWQgZWxlbWVudHMgaW5zaWRlIGEgPGxvY2FsLWNvbW1hbmQ+XG4gKiBib2R5IGFyZSBub3QgY2hpbGRyZW4gb2YgdGhlIGhvc3QgYW5kIGFyZSBuZXZlciB2aXNpdGVkIGhlcmUuXG4gKlxuICogVW5rbm93biBjaGlsZCBlbGVtZW50cyBlbWl0IGEgY29uc29sZS53YXJuIGFuZCBhcmUgY29sbGVjdGVkIGluIGNvbmZpZy51bmtub3duXG4gKiBzbyB0b29saW5nIChlLmcuIGEgZnV0dXJlIExFUyBsYW5ndWFnZSBzZXJ2ZXIpIGNhbiByZXBvcnQgdGhlbS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRDb25maWcoaG9zdDogRWxlbWVudCk6IExFU0NvbmZpZyB7XG4gIGNvbnN0IGNvbmZpZzogTEVTQ29uZmlnID0ge1xuICAgIGlkOiAgICAgICBob3N0LmlkIHx8ICcobm8gaWQpJyxcbiAgICBtb2R1bGVzOiAgW10sXG4gICAgY29tbWFuZHM6IFtdLFxuICAgIG9uRXZlbnQ6ICBbXSxcbiAgICBvblNpZ25hbDogW10sXG4gICAgb25Mb2FkOiAgIFtdLFxuICAgIG9uRW50ZXI6ICBbXSxcbiAgICBvbkV4aXQ6ICAgW10sXG4gICAgdW5rbm93bjogIFtdLFxuICB9XG5cbiAgZm9yIChjb25zdCBjaGlsZCBvZiBBcnJheS5mcm9tKGhvc3QuY2hpbGRyZW4pKSB7XG4gICAgY29uc3QgdGFnID0gY2hpbGQudGFnTmFtZS50b0xvd2VyQ2FzZSgpXG4gICAgY29uc3QgaGFuZGxlciA9IEhBTkRMRVJTW3RhZ11cblxuICAgIGlmIChoYW5kbGVyKSB7XG4gICAgICBoYW5kbGVyKGNoaWxkLCBjb25maWcpXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEhUTUwgY29tbWVudHMgZG9uJ3QgYXBwZWFyIGluIC5jaGlsZHJlbiwgb25seSBpbiAuY2hpbGROb2Rlcy5cbiAgICAgIC8vIFNvIGV2ZXJ5dGhpbmcgaGVyZSBpcyBhIHJlYWwgZWxlbWVudCBcdTIwMTQgd2FybiBhbmQgY29sbGVjdC5cbiAgICAgIGNvbmZpZy51bmtub3duLnB1c2goY2hpbGQpXG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgIGBbTEVTXSBVbmtub3duIGNoaWxkIGVsZW1lbnQgPCR7dGFnfT4gaW5zaWRlIDxsb2NhbC1ldmVudC1zY3JpcHQgaWQ9XCIke2NvbmZpZy5pZH1cIj4gXHUyMDE0IGlnbm9yZWQuYCxcbiAgICAgICAgY2hpbGRcbiAgICAgIClcbiAgICB9XG4gIH1cblxuICByZXR1cm4gY29uZmlnXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gbG9nQ29uZmlnIFx1MjAxNCBzdHJ1Y3R1cmVkIGNoZWNrcG9pbnQgbG9nXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBMb2dzIGEgc3VtbWFyeSBvZiBhIHBhcnNlZCBMRVNDb25maWcuXG4gKiBQaGFzZSAxIGNoZWNrcG9pbnQ6IHlvdSBzaG91bGQgc2VlIHRoaXMgaW4gdGhlIGJyb3dzZXIgY29uc29sZS9kZWJ1ZyBsb2dcbiAqIHdpdGggYWxsIGNvbW1hbmRzLCBldmVudHMsIGFuZCBzaWduYWwgd2F0Y2hlcnMgY29ycmVjdGx5IGxpc3RlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvZ0NvbmZpZyhjb25maWc6IExFU0NvbmZpZyk6IHZvaWQge1xuICBjb25zdCBpZCA9IGNvbmZpZy5pZFxuICBjb25zb2xlLmxvZyhgW0xFU10gY29uZmlnIHJlYWQgZm9yICMke2lkfWApXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG1vZHVsZXM6ICAgJHtjb25maWcubW9kdWxlcy5sZW5ndGh9YCwgY29uZmlnLm1vZHVsZXMubWFwKG0gPT4gbS50eXBlID8/IG0uc3JjKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgY29tbWFuZHM6ICAke2NvbmZpZy5jb21tYW5kcy5sZW5ndGh9YCwgY29uZmlnLmNvbW1hbmRzLm1hcChjID0+IGMubmFtZSkpXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG9uLWV2ZW50OiAgJHtjb25maWcub25FdmVudC5sZW5ndGh9YCwgY29uZmlnLm9uRXZlbnQubWFwKGUgPT4gZS5uYW1lKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tc2lnbmFsOiAke2NvbmZpZy5vblNpZ25hbC5sZW5ndGh9YCwgY29uZmlnLm9uU2lnbmFsLm1hcChzID0+IHMubmFtZSkpXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG9uLWxvYWQ6ICAgJHtjb25maWcub25Mb2FkLmxlbmd0aH1gKVxuICBjb25zb2xlLmxvZyhgW0xFU10gICBvbi1lbnRlcjogICR7Y29uZmlnLm9uRW50ZXIubGVuZ3RofWAsIGNvbmZpZy5vbkVudGVyLm1hcChlID0+IGUud2hlbiA/PyAnYWx3YXlzJykpXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG9uLWV4aXQ6ICAgJHtjb25maWcub25FeGl0Lmxlbmd0aH1gKVxuXG4gIGlmIChjb25maWcudW5rbm93bi5sZW5ndGggPiAwKSB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTXSAgIHVua25vd24gY2hpbGRyZW46ICR7Y29uZmlnLnVua25vd24ubGVuZ3RofWAsIGNvbmZpZy51bmtub3duLm1hcChlID0+IGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpKSlcbiAgfVxuXG4gIC8vIExvZyBhIHNhbXBsaW5nIG9mIGJvZHkgc3RyaW5ncyB0byB2ZXJpZnkgc3RyaXBCb2R5IHdvcmtlZCBjb3JyZWN0bHlcbiAgaWYgKGNvbmZpZy5jb21tYW5kcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgZmlyc3QgPSBjb25maWcuY29tbWFuZHNbMF1cbiAgICBpZiAoZmlyc3QpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSAgIGZpcnN0IGNvbW1hbmQgYm9keSBwcmV2aWV3IChcIiR7Zmlyc3QubmFtZX1cIik6YClcbiAgICAgIGNvbnN0IHByZXZpZXcgPSBmaXJzdC5ib2R5LnNwbGl0KCdcXG4nKS5zbGljZSgwLCA0KS5qb2luKCdcXG4gICcpXG4gICAgICBjb25zb2xlLmxvZyhgW0xFU10gICB8ICR7cHJldmlld31gKVxuICAgIH1cbiAgfVxufVxuIiwgIi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gTEVTIFRva2VuaXplclxuLy9cbi8vIENvbnZlcnRzIGEgc3RyaXBCb2R5J2Qgc291cmNlIHN0cmluZyBpbnRvIGEgZmxhdCBhcnJheSBvZiBUb2tlbiBvYmplY3RzLlxuLy8gVG9rZW5zIGFyZSBzaW1wbHkgbm9uLWJsYW5rIGxpbmVzIHdpdGggdGhlaXIgaW5kZW50IGxldmVsIHJlY29yZGVkLlxuLy8gTm8gc2VtYW50aWMgYW5hbHlzaXMgaGFwcGVucyBoZXJlIFx1MjAxNCB0aGF0J3MgdGhlIHBhcnNlcidzIGpvYi5cbi8vXG4vLyBUaGUgdG9rZW5pemVyIGlzIGRlbGliZXJhdGVseSBtaW5pbWFsOiBpdCBwcmVzZXJ2ZXMgdGhlIHJhdyBpbmRlbnRhdGlvblxuLy8gaW5mb3JtYXRpb24gdGhlIHBhcnNlciBuZWVkcyB0byB1bmRlcnN0YW5kIGJsb2NrIHN0cnVjdHVyZS5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5leHBvcnQgaW50ZXJmYWNlIFRva2VuIHtcbiAgLyoqIENvbHVtbiBvZmZzZXQgb2YgdGhlIGZpcnN0IG5vbi13aGl0ZXNwYWNlIGNoYXJhY3RlciAobnVtYmVyIG9mIHNwYWNlcykgKi9cbiAgaW5kZW50OiBudW1iZXJcbiAgLyoqIFRyaW1tZWQgbGluZSBjb250ZW50IFx1MjAxNCBubyBsZWFkaW5nL3RyYWlsaW5nIHdoaXRlc3BhY2UgKi9cbiAgdGV4dDogc3RyaW5nXG4gIC8qKiAxLWJhc2VkIGxpbmUgbnVtYmVyIGluIHRoZSBzdHJpcHBlZCBzb3VyY2UgKGZvciBlcnJvciBtZXNzYWdlcykgKi9cbiAgbGluZU51bTogbnVtYmVyXG59XG5cbi8qKlxuICogQ29udmVydHMgYSBzdHJpcHBlZCBMRVMgYm9keSBzdHJpbmcgaW50byBhIFRva2VuIGFycmF5LlxuICogQmxhbmsgbGluZXMgYXJlIGRyb3BwZWQuIFRhYnMgYXJlIGV4cGFuZGVkIHRvIDIgc3BhY2VzIGVhY2guXG4gKlxuICogQHBhcmFtIHNvdXJjZSAgQSBzdHJpbmcgYWxyZWFkeSBwcm9jZXNzZWQgYnkgc3RyaXBCb2R5KCkgXHUyMDE0IG5vIGJhY2t0aWNrIHdyYXBwZXJzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9rZW5pemUoc291cmNlOiBzdHJpbmcpOiBUb2tlbltdIHtcbiAgY29uc3QgdG9rZW5zOiBUb2tlbltdID0gW11cbiAgY29uc3QgbGluZXMgPSBzb3VyY2Uuc3BsaXQoJ1xcbicpXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHJhdyA9IChsaW5lc1tpXSA/PyAnJykucmVwbGFjZSgvXFx0L2csICcgICcpXG4gICAgY29uc3QgdGV4dCA9IHJhdy50cmltKClcblxuICAgIC8vIFNraXAgYmxhbmsgbGluZXNcbiAgICBpZiAodGV4dC5sZW5ndGggPT09IDApIGNvbnRpbnVlXG5cbiAgICBjb25zdCBpbmRlbnQgPSByYXcubGVuZ3RoIC0gcmF3LnRyaW1TdGFydCgpLmxlbmd0aFxuXG4gICAgdG9rZW5zLnB1c2goe1xuICAgICAgaW5kZW50LFxuICAgICAgdGV4dCxcbiAgICAgIGxpbmVOdW06IGkgKyAxLFxuICAgIH0pXG4gIH1cblxuICByZXR1cm4gdG9rZW5zXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gSGVscGVycyB1c2VkIGJ5IGJvdGggdGhlIHRva2VuaXplciB0ZXN0cyBhbmQgdGhlIHBhcnNlclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIGB0ZXh0YCBlbmRzIHdpdGggYSBzdGFuZGFsb25lIGBhbmRgIHdvcmQuXG4gKiBVc2VkIGJ5IHRoZSBwYXJzZXIgdG8gZGV0ZWN0IHBhcmFsbGVsIGJyYW5jaGVzLlxuICpcbiAqIENhcmVmdWw6IFwiZW5nbGFuZFwiLCBcImJhbmRcIiwgXCJjb21tYW5kXCIgbXVzdCBOT1QgbWF0Y2guXG4gKiBXZSByZXF1aXJlIGEgd29yZCBib3VuZGFyeSBiZWZvcmUgYGFuZGAgYW5kIGVuZC1vZi1zdHJpbmcgYWZ0ZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbmRzV2l0aEFuZCh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIC9cXGJhbmQkLy50ZXN0KHRleHQpXG59XG5cbi8qKlxuICogU3RyaXBzIHRoZSB0cmFpbGluZyBgIGFuZGAgZnJvbSBhIGxpbmUgdGhhdCBlbmRzV2l0aEFuZC5cbiAqIFJldHVybnMgdGhlIHRyaW1tZWQgbGluZSBjb250ZW50IHdpdGhvdXQgaXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJpcFRyYWlsaW5nQW5kKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoL1xccythbmQkLywgJycpLnRyaW1FbmQoKVxufVxuXG4vKipcbiAqIEJsb2NrIHRlcm1pbmF0b3IgdG9rZW5zIFx1MjAxNCBzaWduYWwgdGhlIGVuZCBvZiBhIG1hdGNoIG9yIHRyeSBibG9jay5cbiAqIFRoZXNlIGFyZSBjb25zdW1lZCBieSB0aGUgYmxvY2stb3duaW5nIHBhcnNlciAocGFyc2VNYXRjaCAvIHBhcnNlVHJ5KSxcbiAqIG5vdCBieSBwYXJzZUJsb2NrIGl0c2VsZi5cbiAqL1xuZXhwb3J0IGNvbnN0IEJMT0NLX1RFUk1JTkFUT1JTID0gbmV3IFNldChbJy9tYXRjaCcsICcvdHJ5J10pXG5cbi8qKlxuICogS2V5d29yZHMgdGhhdCBlbmQgYSB0cnkgYm9keSBhbmQgc3RhcnQgYSByZXNjdWUvYWZ0ZXJ3YXJkcyBjbGF1c2UuXG4gKiBSZWNvZ25pemVkIG9ubHkgd2hlbiB0aGV5IGFwcGVhciBhdCB0aGUgc2FtZSBpbmRlbnQgbGV2ZWwgYXMgdGhlIGB0cnlgLlxuICovXG5leHBvcnQgY29uc3QgVFJZX0NMQVVTRV9LRVlXT1JEUyA9IG5ldyBTZXQoWydyZXNjdWUnLCAnYWZ0ZXJ3YXJkcyddKVxuIiwgImltcG9ydCB0eXBlIHtcbiAgTEVTTm9kZSwgRXhwck5vZGUsIFNlcXVlbmNlTm9kZSwgUGFyYWxsZWxOb2RlLFxuICBTZXROb2RlLCBFbWl0Tm9kZSwgQnJvYWRjYXN0Tm9kZSwgV2FpdE5vZGUsIENhbGxOb2RlLFxuICBCaW5kTm9kZSwgQWN0aW9uTm9kZSwgTWF0Y2hOb2RlLCBNYXRjaEFybSwgUGF0dGVybk5vZGUsXG4gIFRyeU5vZGUsIEFuaW1hdGlvbk5vZGUsXG59IGZyb20gJy4vYXN0LmpzJ1xuaW1wb3J0IHR5cGUgeyBUb2tlbiB9IGZyb20gJy4vdG9rZW5pemVyLmpzJ1xuaW1wb3J0IHtcbiAgZW5kc1dpdGhBbmQsIHN0cmlwVHJhaWxpbmdBbmQsXG4gIEJMT0NLX1RFUk1JTkFUT1JTLCBUUllfQ0xBVVNFX0tFWVdPUkRTLFxufSBmcm9tICcuL3Rva2VuaXplci5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBLbm93biBhbmltYXRpb24gcHJpbWl0aXZlIG5hbWVzIChyZWdpc3RlcmVkIGJ5IHRoZSBhbmltYXRpb24gbW9kdWxlKVxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmNvbnN0IEFOSU1BVElPTl9QUklNSVRJVkVTID0gbmV3IFNldChbXG4gICdmYWRlLWluJywgJ2ZhZGUtb3V0JywgJ3NsaWRlLWluJywgJ3NsaWRlLW91dCcsXG4gICdzbGlkZS11cCcsICdzbGlkZS1kb3duJywgJ3B1bHNlJyxcbiAgJ3N0YWdnZXItZW50ZXInLCAnc3RhZ2dlci1leGl0Jyxcbl0pXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gUGFyc2VyXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZXhwb3J0IGNsYXNzIExFU1BhcnNlciB7XG4gIHByaXZhdGUgcG9zID0gMFxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgdG9rZW5zOiBUb2tlbltdKSB7fVxuXG4gIHByaXZhdGUgcGVlayhvZmZzZXQgPSAwKTogVG9rZW4gfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLnRva2Vuc1t0aGlzLnBvcyArIG9mZnNldF1cbiAgfVxuXG4gIHByaXZhdGUgYWR2YW5jZSgpOiBUb2tlbiB7XG4gICAgY29uc3QgdCA9IHRoaXMudG9rZW5zW3RoaXMucG9zXVxuICAgIGlmICghdCkgdGhyb3cgbmV3IExFU1BhcnNlRXJyb3IoJ1VuZXhwZWN0ZWQgZW5kIG9mIGlucHV0JywgdW5kZWZpbmVkKVxuICAgIHRoaXMucG9zKytcbiAgICByZXR1cm4gdFxuICB9XG5cbiAgcHJpdmF0ZSBhdEVuZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5wb3MgPj0gdGhpcy50b2tlbnMubGVuZ3RoXG4gIH1cblxuICBwcml2YXRlIHRyeUNvbnN1bWUodGV4dDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgdCA9IHRoaXMucGVlaygpXG4gICAgaWYgKHQ/LnRleHQgPT09IHRleHQpIHsgdGhpcy5wb3MrKzsgcmV0dXJuIHRydWUgfVxuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEVudHJ5IHBvaW50IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHBhcnNlKCk6IExFU05vZGUge1xuICAgIGNvbnN0IG5vZGUgPSB0aGlzLnBhcnNlQmxvY2soLTEpXG4gICAgcmV0dXJuIG5vZGVcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBCbG9jayBwYXJzZXIgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgLyoqXG4gICAqIFBhcnNlcyBhbGwgc3RhdGVtZW50cyBhdCBpbmRlbnQgPiBiYXNlSW5kZW50LlxuICAgKlxuICAgKiBTdG9wcyB3aGVuIGl0IGVuY291bnRlcnM6XG4gICAqICAgLSBBIHRva2VuIHdpdGggaW5kZW50IDw9IGJhc2VJbmRlbnRcbiAgICogICAtIEEgYmxvY2sgdGVybWluYXRvciAoL21hdGNoLCAvdHJ5KSBcdTIwMTQgbGVmdCBmb3IgdGhlIHBhcmVudCB0byBjb25zdW1lXG4gICAqICAgLSBBIHRyeS1jbGF1c2Uga2V5d29yZCAocmVzY3VlLCBhZnRlcndhcmRzKSBhdCBpbmRlbnQgPD0gYmFzZUluZGVudFxuICAgKiAgIC0gRW5kIG9mIHRva2VuIHN0cmVhbVxuICAgKlxuICAgKiBSZXR1cm5zIGEgU2VxdWVuY2VOb2RlIGlmIG11bHRpcGxlIHN0ZXBzLCBvdGhlcndpc2UgdGhlIHNpbmdsZSBub2RlLlxuICAgKi9cbiAgcHJpdmF0ZSBwYXJzZUJsb2NrKGJhc2VJbmRlbnQ6IG51bWJlcik6IExFU05vZGUge1xuICAgIGNvbnN0IHN0ZXBzOiBMRVNOb2RlW10gPSBbXVxuXG4gICAgd2hpbGUgKCF0aGlzLmF0RW5kKCkpIHtcbiAgICAgIGNvbnN0IHQgPSB0aGlzLnBlZWsoKSFcblxuICAgICAgLy8gU3RvcDogd2UndmUgcmV0dXJuZWQgdG8gb3IgcGFzdCB0aGUgcGFyZW50IGJsb2NrJ3MgaW5kZW50XG4gICAgICBpZiAodC5pbmRlbnQgPD0gYmFzZUluZGVudCkgYnJlYWtcblxuICAgICAgLy8gU3RvcDogYmxvY2sgdGVybWluYXRvcnMgYXJlIGNvbnN1bWVkIGJ5IHRoZSBibG9jayBvcGVuZXIgKG1hdGNoL3RyeSlcbiAgICAgIGlmIChCTE9DS19URVJNSU5BVE9SUy5oYXModC50ZXh0KSkgYnJlYWtcblxuICAgICAgLy8gU3RvcDogdHJ5LWNsYXVzZSBrZXl3b3JkcyBlbmQgdGhlIGN1cnJlbnQgdHJ5IGJvZHlcbiAgICAgIGlmIChUUllfQ0xBVVNFX0tFWVdPUkRTLmhhcyh0LnRleHQpICYmIHQuaW5kZW50IDw9IGJhc2VJbmRlbnQgKyAyKSBicmVha1xuXG4gICAgICAvLyBcdTI1MDBcdTI1MDAgU2VxdWVudGlhbCBjb25uZWN0aXZlOiBzdGFuZGFsb25lIGB0aGVuYCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICAgIC8vIGB0aGVuYCBhbG9uZSBvbiBhIGxpbmUgaW50cm9kdWNlcyB0aGUgbmV4dCBzZXF1ZW50aWFsIHN0ZXAsXG4gICAgICAvLyB3aGljaCBpcyBhIGJsb2NrIGF0IGEgZGVlcGVyIGluZGVudCBsZXZlbC5cbiAgICAgIGlmICh0LnRleHQgPT09ICd0aGVuJykge1xuICAgICAgICBjb25zdCB0aGVuSW5kZW50ID0gdC5pbmRlbnRcbiAgICAgICAgdGhpcy5hZHZhbmNlKCkgLy8gY29uc3VtZSBgdGhlbmBcbiAgICAgICAgY29uc3QgbmV4dCA9IHRoaXMucGVlaygpXG4gICAgICAgIGlmIChuZXh0ICYmIG5leHQuaW5kZW50ID4gdGhlbkluZGVudCkge1xuICAgICAgICAgIGNvbnN0IHN0ZXAgPSB0aGlzLnBhcnNlQmxvY2sodGhlbkluZGVudClcbiAgICAgICAgICBzdGVwcy5wdXNoKHN0ZXApXG4gICAgICAgIH1cbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gXHUyNTAwXHUyNTAwIFNlcXVlbnRpYWwgY29ubmVjdGl2ZTogYHRoZW4gWGAgYXMgcHJlZml4IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgICAgLy8gYHRoZW4gY2FsbCBmb29gLCBgdGhlbiBlbWl0IGJhcmAsIGV0Yy5cbiAgICAgIC8vIFRoZSBgdGhlbmAgaXMganVzdCBhIHZpc3VhbCBzZXF1ZW5jZXIgXHUyMDE0IHRoZSByZXN0IG9mIHRoZSBsaW5lIGlzIHRoZSBzdGVwLlxuICAgICAgaWYgKHQudGV4dC5zdGFydHNXaXRoKCd0aGVuICcpKSB7XG4gICAgICAgIHRoaXMuYWR2YW5jZSgpXG4gICAgICAgIGNvbnN0IHJlc3QgPSB0LnRleHQuc2xpY2UoNSkudHJpbSgpXG4gICAgICAgIGNvbnN0IHN0ZXAgPSB0aGlzLnBhcnNlU2luZ2xlTGluZShyZXN0LCB0LmluZGVudCwgdClcbiAgICAgICAgc3RlcHMucHVzaChzdGVwKVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyBcdTI1MDBcdTI1MDAgUmVndWxhciBzdGF0ZW1lbnQgKHBvc3NpYmx5IGEgcGFyYWxsZWwgZ3JvdXApIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgICAgY29uc3Qgc3RtdCA9IHRoaXMucGFyc2VTdGF0ZW1lbnRPclBhcmFsbGVsKHQuaW5kZW50KVxuICAgICAgc3RlcHMucHVzaChzdG10KVxuICAgIH1cblxuICAgIHJldHVybiB0b1NlcXVlbmNlT3JTaW5nbGUoc3RlcHMpXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgUGFyYWxsZWwgZ3JvdXAgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgLyoqXG4gICAqIFBhcnNlcyBvbmUgc3RhdGVtZW50IG9yIGEgZ3JvdXAgb2YgcGFyYWxsZWwgc3RhdGVtZW50cyBjb25uZWN0ZWQgYnkgYGFuZGAuXG4gICAqXG4gICAqIExpbmVzIGVuZGluZyB3aXRoIGEgc3RhbmRhbG9uZSBgYW5kYCBpbmRpY2F0ZSB0aGF0IHRoZSBuZXh0IGxpbmUgcnVuc1xuICAgKiBjb25jdXJyZW50bHkuIEFsbCBwYXJhbGxlbCBicmFuY2hlcyBhcmUgd3JhcHBlZCBpbiBhIFBhcmFsbGVsTm9kZS5cbiAgICpcbiAgICogYGFuZGAtZ3JvdXBzIG9ubHkgYXBwbHkgd2l0aGluIHRoZSBzYW1lIGluZGVudCBsZXZlbC4gQSBkZWVwZXItaW5kZW50ZWRcbiAgICogbGluZSBhZnRlciBgYW5kYCBpcyBhbiBlcnJvciAod291bGQgaW5kaWNhdGUgYSBibG9jaywgYnV0IGBhbmRgIGlzXG4gICAqIGEgbGluZS1sZXZlbCBjb25uZWN0b3IsIG5vdCBhIGJsb2NrIG9wZW5lcikuXG4gICAqL1xuICBwcml2YXRlIHBhcnNlU3RhdGVtZW50T3JQYXJhbGxlbChibG9ja0luZGVudDogbnVtYmVyKTogTEVTTm9kZSB7XG4gICAgY29uc3QgYnJhbmNoZXM6IExFU05vZGVbXSA9IFtdXG5cbiAgICB3aGlsZSAoIXRoaXMuYXRFbmQoKSkge1xuICAgICAgY29uc3QgdCA9IHRoaXMucGVlaygpIVxuXG4gICAgICAvLyBTdG9wIGNvbmRpdGlvbnMgXHUyMDE0IHNhbWUgYXMgcGFyc2VCbG9jaydzXG4gICAgICBpZiAodC5pbmRlbnQgPCBibG9ja0luZGVudCkgYnJlYWtcbiAgICAgIGlmICh0LmluZGVudCA+IGJsb2NrSW5kZW50KSBicmVhayAgIC8vIHNob3VsZG4ndCBoYXBwZW4gaGVyZSwgc2FmZXR5IGd1YXJkXG4gICAgICBpZiAoQkxPQ0tfVEVSTUlOQVRPUlMuaGFzKHQudGV4dCkpIGJyZWFrXG4gICAgICBpZiAoVFJZX0NMQVVTRV9LRVlXT1JEUy5oYXModC50ZXh0KSkgYnJlYWtcbiAgICAgIGlmICh0LnRleHQgPT09ICd0aGVuJyB8fCB0LnRleHQuc3RhcnRzV2l0aCgndGhlbiAnKSkgYnJlYWtcblxuICAgICAgY29uc3QgaGFzQW5kID0gZW5kc1dpdGhBbmQodC50ZXh0KVxuICAgICAgY29uc3QgbGluZVRleHQgPSBoYXNBbmQgPyBzdHJpcFRyYWlsaW5nQW5kKHQudGV4dCkgOiB0LnRleHRcblxuICAgICAgdGhpcy5hZHZhbmNlKClcblxuICAgICAgY29uc3Qgc3RtdCA9IHRoaXMucGFyc2VTaW5nbGVMaW5lKGxpbmVUZXh0LCB0LmluZGVudCwgdClcbiAgICAgIGJyYW5jaGVzLnB1c2goc3RtdClcblxuICAgICAgaWYgKCFoYXNBbmQpIGJyZWFrXG4gICAgfVxuXG4gICAgaWYgKGJyYW5jaGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGV4cHIoJycpXG4gICAgaWYgKGJyYW5jaGVzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIGJyYW5jaGVzWzBdIVxuICAgIHJldHVybiB7IHR5cGU6ICdwYXJhbGxlbCcsIGJyYW5jaGVzIH0gc2F0aXNmaWVzIFBhcmFsbGVsTm9kZVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFNpbmdsZS1saW5lIGRpc3BhdGNoIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIC8qKlxuICAgKiBQYXJzZXMgYSBzaW5nbGUgc3RhdGVtZW50IGZyb20gaXRzIHRleHQgY29udGVudC5cbiAgICogVGhlIHRleHQgaGFzIGFscmVhZHkgaGFkIGB0aGVuIGAgcHJlZml4IGFuZCB0cmFpbGluZyBgIGFuZGAgc3RyaXBwZWQuXG4gICAqXG4gICAqIERpc3BhdGNoIG9yZGVyIG1hdHRlcnM6IG1vcmUgc3BlY2lmaWMgcGF0dGVybnMgbXVzdCBjb21lIGJlZm9yZSBnZW5lcmFsIG9uZXMuXG4gICAqL1xuICBwcml2YXRlIHBhcnNlU2luZ2xlTGluZSh0ZXh0OiBzdHJpbmcsIGluZGVudDogbnVtYmVyLCB0b2tlbjogVG9rZW4pOiBMRVNOb2RlIHtcbiAgICBjb25zdCBmaXJzdCA9IGZpcnN0V29yZCh0ZXh0KVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIEJsb2NrIGNvbnN0cnVjdHMgKGNvbnN1bWUgbXVsdGlwbGUgZm9sbG93aW5nIHRva2VucykgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgaWYgKGZpcnN0ID09PSAnbWF0Y2gnKSByZXR1cm4gdGhpcy5wYXJzZU1hdGNoKHRleHQsIGluZGVudCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAndHJ5JykgICByZXR1cm4gdGhpcy5wYXJzZVRyeShpbmRlbnQsIHRva2VuKVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIFNpbXBsZSBzdGF0ZW1lbnQgZGlzcGF0Y2ggXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgaWYgKGZpcnN0ID09PSAnc2V0JykgICAgICAgcmV0dXJuIHRoaXMucGFyc2VTZXQodGV4dCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAnZW1pdCcpICAgICAgcmV0dXJuIHRoaXMucGFyc2VFbWl0KHRleHQsIHRva2VuKVxuICAgIGlmIChmaXJzdCA9PT0gJ2Jyb2FkY2FzdCcpIHJldHVybiB0aGlzLnBhcnNlQnJvYWRjYXN0KHRleHQsIHRva2VuKVxuICAgIGlmIChmaXJzdCA9PT0gJ2NhbGwnKSAgICAgIHJldHVybiB0aGlzLnBhcnNlQ2FsbCh0ZXh0LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICd3YWl0JykgICAgICByZXR1cm4gdGhpcy5wYXJzZVdhaXQodGV4dCwgdG9rZW4pXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgQmFyZSBEYXRhc3RhciBhY3Rpb246IGBAZ2V0ICcvdXJsJyBbYXJnc11gIChmaXJlLWFuZC1hd2FpdCwgbm8gYmluZCkgXHUyNTAwXHUyNTAwXG4gICAgaWYgKGZpcnN0LnN0YXJ0c1dpdGgoJ0AnKSkgIHJldHVybiB0aGlzLnBhcnNlQWN0aW9uKHRleHQsIHRva2VuKVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIEFzeW5jIGJpbmQ6IGBuYW1lIDwtIEB2ZXJiICd1cmwnIFthcmdzXWAgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgaWYgKHRleHQuaW5jbHVkZXMoJyA8LSAnKSkgcmV0dXJuIHRoaXMucGFyc2VCaW5kKHRleHQsIHRva2VuKVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIEFuaW1hdGlvbiBwcmltaXRpdmUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgaWYgKEFOSU1BVElPTl9QUklNSVRJVkVTLmhhcyhmaXJzdCkpIHJldHVybiB0aGlzLnBhcnNlQW5pbWF0aW9uKHRleHQsIHRva2VuKVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIFVua25vd246IHN0b3JlIGFzIHJhdyBleHByZXNzaW9uIChlc2NhcGUgaGF0Y2ggLyBmdXR1cmUga2V5d29yZHMpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIFVua25vd24gc3RhdGVtZW50OiAke0pTT04uc3RyaW5naWZ5KHRleHQpfWAsIHRva2VuKVxuICAgIHJldHVybiBleHByKHRleHQpXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgTWF0Y2ggYmxvY2sgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBwYXJzZU1hdGNoKHRleHQ6IHN0cmluZywgaW5kZW50OiBudW1iZXIsIHRva2VuOiBUb2tlbik6IE1hdGNoTm9kZSB7XG4gICAgLy8gYHRleHRgIGlzIGUuZy4gXCJtYXRjaCByZXNwb25zZVwiIG9yIFwibWF0Y2ggJGZlZWRTdGF0ZVwiXG4gICAgY29uc3Qgc3ViamVjdFJhdyA9IHRleHQuc2xpY2UoJ21hdGNoJy5sZW5ndGgpLnRyaW0oKVxuICAgIGNvbnN0IHN1YmplY3Q6IEV4cHJOb2RlID0gZXhwcihzdWJqZWN0UmF3KVxuICAgIGNvbnN0IGFybXM6IE1hdGNoQXJtW10gPSBbXVxuXG4gICAgd2hpbGUgKCF0aGlzLmF0RW5kKCkpIHtcbiAgICAgIGNvbnN0IHQgPSB0aGlzLnBlZWsoKSFcblxuICAgICAgLy8gL21hdGNoIHRlcm1pbmF0ZXMgdGhlIGJsb2NrXG4gICAgICBpZiAodC50ZXh0ID09PSAnL21hdGNoJykge1xuICAgICAgICB0aGlzLmFkdmFuY2UoKVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICAvLyBPbmx5IGNvbnN1bWUgYXJtIGxpbmVzIGF0IHRoZSBleHBlY3RlZCBhcm0gaW5kZW50IChpbmRlbnQgKyAyKVxuICAgICAgaWYgKHQuaW5kZW50IDw9IGluZGVudCkge1xuICAgICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBVbmNsb3NlZCBtYXRjaCBibG9jayBcdTIwMTQgbWlzc2luZyAvbWF0Y2hgLCB0b2tlbilcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgLy8gUGFyc2UgYW4gYXJtOiBgW3BhdHRlcm5dIC0+YCBvciBgW3BhdHRlcm5dIC0+IGJvZHlgXG4gICAgICBpZiAodC50ZXh0LnN0YXJ0c1dpdGgoJ1snKSkge1xuICAgICAgICBhcm1zLnB1c2godGhpcy5wYXJzZU1hdGNoQXJtKHQuaW5kZW50LCB0KSlcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gU2tpcCB1bmV4cGVjdGVkIGxpbmVzIGluc2lkZSBtYXRjaFxuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gVW5leHBlY3RlZCB0b2tlbiBpbnNpZGUgbWF0Y2ggYmxvY2s6ICR7SlNPTi5zdHJpbmdpZnkodC50ZXh0KX1gLCB0KVxuICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICB9XG5cbiAgICByZXR1cm4geyB0eXBlOiAnbWF0Y2gnLCBzdWJqZWN0LCBhcm1zIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VNYXRjaEFybShhcm1JbmRlbnQ6IG51bWJlciwgdG9rZW46IFRva2VuKTogTWF0Y2hBcm0ge1xuICAgIGNvbnN0IHQgPSB0aGlzLmFkdmFuY2UoKSAvLyBjb25zdW1lIHRoZSBhcm0gbGluZVxuXG4gICAgLy8gU3BsaXQgb24gYCAtPmAgdG8gc2VwYXJhdGUgcGF0dGVybiBmcm9tIGJvZHlcbiAgICBjb25zdCBhcnJvd0lkeCA9IHQudGV4dC5pbmRleE9mKCcgLT4nKVxuICAgIGlmIChhcnJvd0lkeCA9PT0gLTEpIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIE1hdGNoIGFybSBtaXNzaW5nICctPic6ICR7SlNPTi5zdHJpbmdpZnkodC50ZXh0KX1gLCB0KVxuICAgICAgcmV0dXJuIHsgcGF0dGVybnM6IFt7IGtpbmQ6ICd3aWxkY2FyZCcgfV0sIGJvZHk6IGV4cHIoJycpIH1cbiAgICB9XG5cbiAgICBjb25zdCBwYXR0ZXJuUmF3ID0gdC50ZXh0LnNsaWNlKDAsIGFycm93SWR4KS50cmltKClcbiAgICBjb25zdCBhZnRlckFycm93ID0gdC50ZXh0LnNsaWNlKGFycm93SWR4ICsgMykudHJpbSgpICAvLyBldmVyeXRoaW5nIGFmdGVyIGAtPmBcblxuICAgIGNvbnN0IHBhdHRlcm5zID0gcGFyc2VQYXR0ZXJucyhwYXR0ZXJuUmF3KVxuXG4gICAgbGV0IGJvZHk6IExFU05vZGVcbiAgICBpZiAoYWZ0ZXJBcnJvdy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBJbmxpbmUgYXJtOiBgWydlcnJvciddIC0+IHNldCAkZmVlZFN0YXRlIHRvICdlcnJvcidgXG4gICAgICBib2R5ID0gdGhpcy5wYXJzZVNpbmdsZUxpbmUoYWZ0ZXJBcnJvdywgYXJtSW5kZW50LCB0b2tlbilcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTXVsdGktbGluZSBhcm06IGJvZHkgaXMgdGhlIGRlZXBlci1pbmRlbnRlZCBibG9ja1xuICAgICAgYm9keSA9IHRoaXMucGFyc2VCbG9jayhhcm1JbmRlbnQpXG4gICAgfVxuXG4gICAgcmV0dXJuIHsgcGF0dGVybnMsIGJvZHkgfVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFRyeSBibG9jayBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwcml2YXRlIHBhcnNlVHJ5KGluZGVudDogbnVtYmVyLCB0b2tlbjogVG9rZW4pOiBUcnlOb2RlIHtcbiAgICAvLyBOb3RlOiB0aGUgYHRyeWAgdG9rZW4gd2FzIGFscmVhZHkgY29uc3VtZWQgYnkgdGhlIGNhbGxpbmcgcGFyc2VTdGF0ZW1lbnRPclBhcmFsbGVsLlxuICAgIC8vIERvIE5PVCBjYWxsIHRoaXMuYWR2YW5jZSgpIGhlcmUgXHUyMDE0IHRoYXQgd291bGQgc2tpcCB0aGUgZmlyc3QgYm9keSBsaW5lLlxuXG4gICAgLy8gUGFyc2UgYm9keSBcdTIwMTQgc3RvcHMgYXQgcmVzY3VlL2FmdGVyd2FyZHMvL3RyeSBhdCB0aGUgc2FtZSBpbmRlbnQgbGV2ZWxcbiAgICBjb25zdCBib2R5ID0gdGhpcy5wYXJzZUJsb2NrKGluZGVudClcblxuICAgIGxldCByZXNjdWU6IExFU05vZGUgfCB1bmRlZmluZWQgPSB1bmRlZmluZWRcbiAgICBsZXQgYWZ0ZXJ3YXJkczogTEVTTm9kZSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZFxuXG4gICAgLy8gcmVzY3VlIGNsYXVzZSAob3B0aW9uYWwpXG4gICAgaWYgKHRoaXMucGVlaygpPy50ZXh0ID09PSAncmVzY3VlJyAmJiB0aGlzLnBlZWsoKT8uaW5kZW50ID09PSBpbmRlbnQpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpIC8vIGNvbnN1bWUgYHJlc2N1ZWBcbiAgICAgIHJlc2N1ZSA9IHRoaXMucGFyc2VCbG9jayhpbmRlbnQpXG4gICAgfVxuXG4gICAgLy8gYWZ0ZXJ3YXJkcyBjbGF1c2UgKG9wdGlvbmFsKVxuICAgIGlmICh0aGlzLnBlZWsoKT8udGV4dCA9PT0gJ2FmdGVyd2FyZHMnICYmIHRoaXMucGVlaygpPy5pbmRlbnQgPT09IGluZGVudCkge1xuICAgICAgdGhpcy5hZHZhbmNlKCkgLy8gY29uc3VtZSBgYWZ0ZXJ3YXJkc2BcbiAgICAgIGFmdGVyd2FyZHMgPSB0aGlzLnBhcnNlQmxvY2soaW5kZW50KVxuICAgIH1cblxuICAgIC8vIENvbnN1bWUgL3RyeVxuICAgIGlmICh0aGlzLnBlZWsoKT8udGV4dCA9PT0gJy90cnknKSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBVbmNsb3NlZCB0cnkgYmxvY2sgXHUyMDE0IG1pc3NpbmcgL3RyeWAsIHRva2VuKVxuICAgIH1cblxuICAgIGNvbnN0IHRyeU5vZGU6IFRyeU5vZGUgPSB7IHR5cGU6ICd0cnknLCBib2R5IH1cbiAgICBpZiAocmVzY3VlICAgICE9PSB1bmRlZmluZWQpIHRyeU5vZGUucmVzY3VlICAgICA9IHJlc2N1ZVxuICAgIGlmIChhZnRlcndhcmRzICE9PSB1bmRlZmluZWQpIHRyeU5vZGUuYWZ0ZXJ3YXJkcyA9IGFmdGVyd2FyZHNcbiAgICByZXR1cm4gdHJ5Tm9kZVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFNpbXBsZSBzdGF0ZW1lbnQgcGFyc2VycyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwcml2YXRlIHBhcnNlU2V0KHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogU2V0Tm9kZSB7XG4gICAgLy8gYHNldCAkc2lnbmFsIHRvIGV4cHJgXG4gICAgY29uc3QgbSA9IHRleHQubWF0Y2goL15zZXRcXHMrXFwkKFxcdyspXFxzK3RvXFxzKyguKykkLylcbiAgICBpZiAoIW0pIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIE1hbGZvcm1lZCBzZXQgc3RhdGVtZW50OiAke0pTT04uc3RyaW5naWZ5KHRleHQpfWAsIHRva2VuKVxuICAgICAgcmV0dXJuIHsgdHlwZTogJ3NldCcsIHNpZ25hbDogJz8/JywgdmFsdWU6IGV4cHIodGV4dCkgfVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogJ3NldCcsXG4gICAgICBzaWduYWw6IG1bMV0hLFxuICAgICAgdmFsdWU6IGV4cHIobVsyXSEudHJpbSgpKSxcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlRW1pdCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IEVtaXROb2RlIHtcbiAgICAvLyBgZW1pdCBldmVudDpuYW1lIFtwYXlsb2FkLCAuLi5dYCBvciBgZW1pdCBldmVudDpuYW1lYFxuICAgIGNvbnN0IHsgbmFtZSwgcGF5bG9hZCB9ID0gcGFyc2VFdmVudExpbmUodGV4dC5zbGljZSgnZW1pdCcubGVuZ3RoKS50cmltKCksIHRva2VuKVxuICAgIHJldHVybiB7IHR5cGU6ICdlbWl0JywgZXZlbnQ6IG5hbWUsIHBheWxvYWQgfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUJyb2FkY2FzdCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IEJyb2FkY2FzdE5vZGUge1xuICAgIGNvbnN0IHsgbmFtZSwgcGF5bG9hZCB9ID0gcGFyc2VFdmVudExpbmUodGV4dC5zbGljZSgnYnJvYWRjYXN0Jy5sZW5ndGgpLnRyaW0oKSwgdG9rZW4pXG4gICAgcmV0dXJuIHsgdHlwZTogJ2Jyb2FkY2FzdCcsIGV2ZW50OiBuYW1lLCBwYXlsb2FkIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VDYWxsKHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogQ2FsbE5vZGUge1xuICAgIC8vIGBjYWxsIGNvbW1hbmQ6bmFtZSBbYXJnOiB2YWx1ZSwgLi4uXWAgb3IgYGNhbGwgY29tbWFuZDpuYW1lYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9eY2FsbFxccysoW15cXHNcXFtdKylcXHMqKD86XFxbKC4rKVxcXSk/JC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgY2FsbCBzdGF0ZW1lbnQ6ICR7SlNPTi5zdHJpbmdpZnkodGV4dCl9YCwgdG9rZW4pXG4gICAgICByZXR1cm4geyB0eXBlOiAnY2FsbCcsIGNvbW1hbmQ6ICc/PycsIGFyZ3M6IHt9IH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdjYWxsJyxcbiAgICAgIGNvbW1hbmQ6IG1bMV0hLFxuICAgICAgYXJnczogcGFyc2VBcmdMaXN0KG1bMl0gPz8gJycpLFxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VXYWl0KHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogV2FpdE5vZGUge1xuICAgIC8vIGB3YWl0IDMwMG1zYCBvciBgd2FpdCAoYXR0ZW1wdCArIDEpICogNTAwbXNgXG4gICAgY29uc3QgbSA9IHRleHQubWF0Y2goL153YWl0XFxzKyguKz8pbXMkLylcbiAgICBpZiAoIW0pIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIE1hbGZvcm1lZCB3YWl0IHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7IHR5cGU6ICd3YWl0JywgbXM6IDAgfVxuICAgIH1cbiAgICBjb25zdCBtc0V4cHIgPSBtWzFdIS50cmltKClcbiAgICAvLyBTaW1wbGUgbGl0ZXJhbFxuICAgIGNvbnN0IGxpdGVyYWwgPSBOdW1iZXIobXNFeHByKVxuICAgIGlmICghTnVtYmVyLmlzTmFOKGxpdGVyYWwpKSByZXR1cm4geyB0eXBlOiAnd2FpdCcsIG1zOiBsaXRlcmFsIH1cbiAgICAvLyBFeHByZXNzaW9uIFx1MjAxNCBzdG9yZSBhcyAwIHdpdGggdGhlIGV4cHJlc3Npb24gYXMgYSBjb21tZW50IChleGVjdXRvciB3aWxsIGV2YWwpXG4gICAgLy8gUGhhc2UgMyB3aWxsIGhhbmRsZSBkeW5hbWljIGR1cmF0aW9ucyBwcm9wZXJseVxuICAgIHJldHVybiB7IHR5cGU6ICd3YWl0JywgbXM6IDAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUJpbmQodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBCaW5kTm9kZSB7XG4gICAgLy8gYG5hbWUgPC0gQHZlcmIgJ3VybCcgW2FyZ3NdYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9eKFxcdyspXFxzKzwtXFxzK0AoXFx3KylcXHMrJyhbXiddKyknXFxzKig/OlxcWyguKylcXF0pPyQvKVxuICAgIGlmICghbSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gTWFsZm9ybWVkIGJpbmQgc3RhdGVtZW50OiAke0pTT04uc3RyaW5naWZ5KHRleHQpfWAsIHRva2VuKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ2JpbmQnLFxuICAgICAgICBuYW1lOiAnPz8nLFxuICAgICAgICBhY3Rpb246IHsgdHlwZTogJ2FjdGlvbicsIHZlcmI6ICdnZXQnLCB1cmw6ICcnLCBhcmdzOiB7fSB9LFxuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBhY3Rpb246IEFjdGlvbk5vZGUgPSB7XG4gICAgICB0eXBlOiAnYWN0aW9uJyxcbiAgICAgIHZlcmI6IG1bMl0hLnRvTG93ZXJDYXNlKCksXG4gICAgICB1cmw6IG1bM10hLFxuICAgICAgYXJnczogcGFyc2VBcmdMaXN0KG1bNF0gPz8gJycpLFxuICAgIH1cbiAgICByZXR1cm4geyB0eXBlOiAnYmluZCcsIG5hbWU6IG1bMV0hLCBhY3Rpb24gfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUFjdGlvbih0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IEFjdGlvbk5vZGUge1xuICAgIC8vIGBAZ2V0ICcvdXJsJyBbYXJnc11gIG9yIGBAcG9zdCAnL3VybCcgW2FyZ3NdYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9eQChcXHcrKVxccysnKFteJ10rKSdcXHMqKD86XFxbKC4rKVxcXSk/JC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgYWN0aW9uOiAke0pTT04uc3RyaW5naWZ5KHRleHQpfWAsIHRva2VuKVxuICAgICAgcmV0dXJuIHsgdHlwZTogJ2FjdGlvbicsIHZlcmI6ICdnZXQnLCB1cmw6ICcnLCBhcmdzOiB7fSB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnYWN0aW9uJyxcbiAgICAgIHZlcmI6IG1bMV0hLnRvTG93ZXJDYXNlKCksXG4gICAgICB1cmw6IG1bMl0hLFxuICAgICAgYXJnczogcGFyc2VBcmdMaXN0KG1bM10gPz8gJycpLFxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VBbmltYXRpb24odGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBBbmltYXRpb25Ob2RlIHtcbiAgICAvLyBgcHJpbWl0aXZlIHNlbGVjdG9yIGR1cmF0aW9uIGVhc2luZyBbb3B0aW9uc11gXG4gICAgLy8gRXhhbXBsZXM6XG4gICAgLy8gICBzdGFnZ2VyLWVudGVyIC5mZWVkLWl0ZW0gIDEyMG1zIGVhc2Utb3V0IFtnYXA6IDQwbXMgIGZyb206IHJpZ2h0XVxuICAgIC8vICAgcHVsc2UgLmZlZWQtaXRlbS5pcy11cGRhdGVkICAzMDBtcyBlYXNlLWluLW91dFxuICAgIC8vICAgc2xpZGUtb3V0IFtkYXRhLWl0ZW0taWQ6IGlkXSAgMTUwbXMgZWFzZS1pbiBbdG86IHJpZ2h0XVxuXG4gICAgLy8gVG9rZW5pemU6IHNwbGl0IG9uIHdoaXRlc3BhY2UgYnV0IHByZXNlcnZlIFsuLi5dIGdyb3Vwc1xuICAgIGNvbnN0IHBhcnRzID0gc3BsaXRBbmltYXRpb25MaW5lKHRleHQpXG5cbiAgICBjb25zdCBwcmltaXRpdmUgPSBwYXJ0c1swXSA/PyAnJ1xuICAgIGNvbnN0IHNlbGVjdG9yICA9IHBhcnRzWzFdID8/ICcnXG4gICAgY29uc3QgZHVyYXRpb25TdHIgPSBwYXJ0c1syXSA/PyAnMG1zJ1xuICAgIGNvbnN0IGVhc2luZyAgICA9IHBhcnRzWzNdID8/ICdlYXNlJ1xuICAgIGNvbnN0IG9wdGlvbnNTdHIgPSBwYXJ0c1s0XSA/PyAnJyAgLy8gbWF5IGJlIGFic2VudFxuXG4gICAgY29uc3QgZHVyYXRpb25NcyA9IHBhcnNlSW50KGR1cmF0aW9uU3RyLCAxMClcblxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnYW5pbWF0aW9uJyxcbiAgICAgIHByaW1pdGl2ZSxcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgZHVyYXRpb246IE51bWJlci5pc05hTihkdXJhdGlvbk1zKSA/IDAgOiBkdXJhdGlvbk1zLFxuICAgICAgZWFzaW5nLFxuICAgICAgb3B0aW9uczogcGFyc2VBbmltYXRpb25PcHRpb25zKG9wdGlvbnNTdHIpLFxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFBhdHRlcm4gcGFyc2luZ1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogUGFyc2VzIGEgcGF0dGVybiBncm91cCBsaWtlIGBbaXQgICBvayAgIF1gLCBgW25pbCAgZXJyb3JdYCwgYFtfXWAsXG4gKiBgWydlcnJvciddYCwgYFswIHwgMSB8IDJdYC5cbiAqXG4gKiBSZXR1cm5zIGFuIGFycmF5IG9mIFBhdHRlcm5Ob2RlIFx1MjAxNCBvbmUgcGVyIGVsZW1lbnQgaW4gdGhlIHR1cGxlIHBhdHRlcm4uXG4gKiBGb3Igb3ItcGF0dGVybnMgKGAwIHwgMSB8IDJgKSwgcmV0dXJucyBhIHNpbmdsZSBPclBhdHRlcm5Ob2RlLlxuICovXG5mdW5jdGlvbiBwYXJzZVBhdHRlcm5zKHJhdzogc3RyaW5nKTogUGF0dGVybk5vZGVbXSB7XG4gIC8vIFN0cmlwIG91dGVyIGJyYWNrZXRzXG4gIGNvbnN0IGlubmVyID0gcmF3LnJlcGxhY2UoL15cXFt8XFxdJC9nLCAnJykudHJpbSgpXG5cbiAgLy8gQ2hlY2sgZm9yIG9yLXBhdHRlcm46IGNvbnRhaW5zIGAgfCBgXG4gIGlmIChpbm5lci5pbmNsdWRlcygnIHwgJykgfHwgaW5uZXIuaW5jbHVkZXMoJ3wnKSkge1xuICAgIGNvbnN0IGFsdGVybmF0aXZlcyA9IGlubmVyLnNwbGl0KC9cXHMqXFx8XFxzKi8pLm1hcChwID0+IHBhcnNlU2luZ2xlUGF0dGVybihwLnRyaW0oKSkpXG4gICAgcmV0dXJuIFt7IGtpbmQ6ICdvcicsIHBhdHRlcm5zOiBhbHRlcm5hdGl2ZXMgfV1cbiAgfVxuXG4gIC8vIFR1cGxlIHBhdHRlcm46IHNwYWNlLXNlcGFyYXRlZCBlbGVtZW50c1xuICAvLyBVc2UgYSBjdXN0b20gc3BsaXQgdG8gaGFuZGxlIG11bHRpcGxlIHNwYWNlcyAoYWxpZ25tZW50IHBhZGRpbmcpXG4gIHJldHVybiBpbm5lci50cmltKCkuc3BsaXQoL1xcc3syLH18XFxzKD89XFxTKS8pLmZpbHRlcihzID0+IHMudHJpbSgpKVxuICAgIC5tYXAocCA9PiBwYXJzZVNpbmdsZVBhdHRlcm4ocC50cmltKCkpKVxufVxuXG5mdW5jdGlvbiBwYXJzZVNpbmdsZVBhdHRlcm4oczogc3RyaW5nKTogUGF0dGVybk5vZGUge1xuICBpZiAocyA9PT0gJ18nKSAgIHJldHVybiB7IGtpbmQ6ICd3aWxkY2FyZCcgfVxuICBpZiAocyA9PT0gJ25pbCcpIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IG51bGwgfVxuXG4gIC8vIFN0cmluZyBsaXRlcmFsOiAndmFsdWUnXG4gIGlmIChzLnN0YXJ0c1dpdGgoXCInXCIpICYmIHMuZW5kc1dpdGgoXCInXCIpKSB7XG4gICAgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogcy5zbGljZSgxLCAtMSkgfVxuICB9XG5cbiAgLy8gTnVtYmVyIGxpdGVyYWxcbiAgY29uc3QgbiA9IE51bWJlcihzKVxuICBpZiAoIU51bWJlci5pc05hTihuKSkgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogbiB9XG5cbiAgLy8gQm9vbGVhblxuICBpZiAocyA9PT0gJ3RydWUnKSAgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogdHJ1ZSB9XG4gIGlmIChzID09PSAnZmFsc2UnKSByZXR1cm4geyBraW5kOiAnbGl0ZXJhbCcsIHZhbHVlOiBmYWxzZSB9XG5cbiAgLy8gRXZlcnl0aGluZyBlbHNlIGlzIGEgYmluZGluZyAoY2FwdHVyZXMgdGhlIHZhbHVlIGZvciB1c2UgaW4gdGhlIGJvZHkpXG4gIHJldHVybiB7IGtpbmQ6ICdiaW5kaW5nJywgbmFtZTogcyB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gQXJndW1lbnQgbGlzdCBwYXJzaW5nXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBQYXJzZXMgYGtleTogdmFsdWUgIGtleTI6IHZhbHVlMmAgZnJvbSBpbnNpZGUgYSBbLi4uXSBhcmd1bWVudCBibG9jay5cbiAqIFZhbHVlcyBhcmUgc3RvcmVkIGFzIEV4cHJOb2RlIChldmFsdWF0ZWQgYXQgcnVudGltZSkuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlQXJnTGlzdChyYXc6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIEV4cHJOb2RlPiB7XG4gIGlmICghcmF3LnRyaW0oKSkgcmV0dXJuIHt9XG5cbiAgY29uc3QgcmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCBFeHByTm9kZT4gPSB7fVxuXG4gIC8vIFNwbGl0IG9uIGAgIGAgKGRvdWJsZS1zcGFjZSB1c2VkIGFzIHNlcGFyYXRvciBpbiBMRVMgc3R5bGUpXG4gIC8vIGJ1dCBhbHNvIGhhbmRsZSBzaW5nbGUgYCAga2V5OiB2YWx1ZWAgZW50cmllc1xuICAvLyBTaW1wbGUgcmVnZXg6IGB3b3JkOiByZXN0X3VudGlsX25leHRfd29yZDpgXG4gIGNvbnN0IHBhaXJzID0gcmF3LnRyaW0oKS5zcGxpdCgvKD88PVxcUylcXHN7Mix9KD89XFx3KS8pXG4gIGZvciAoY29uc3QgcGFpciBvZiBwYWlycykge1xuICAgIGNvbnN0IGNvbG9uSWR4ID0gcGFpci5pbmRleE9mKCc6JylcbiAgICBpZiAoY29sb25JZHggPT09IC0xKSBjb250aW51ZVxuICAgIGNvbnN0IGtleSAgID0gcGFpci5zbGljZSgwLCBjb2xvbklkeCkudHJpbSgpXG4gICAgY29uc3QgdmFsdWUgPSBwYWlyLnNsaWNlKGNvbG9uSWR4ICsgMSkudHJpbSgpXG4gICAgaWYgKGtleSkgcmVzdWx0W2tleV0gPSBleHByKHZhbHVlKVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEV2ZW50IGxpbmUgcGFyc2luZzogYGV2ZW50Om5hbWUgW3BheWxvYWQuLi5dYFxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIHBhcnNlRXZlbnRMaW5lKFxuICByYXc6IHN0cmluZyxcbiAgdG9rZW46IFRva2VuXG4pOiB7IG5hbWU6IHN0cmluZzsgcGF5bG9hZDogRXhwck5vZGVbXSB9IHtcbiAgLy8gYGZlZWQ6ZGF0YS1yZWFkeWAgb3IgYGZlZWQ6ZGF0YS1yZWFkeSBbJGZlZWRJdGVtc11gIG9yIGBmZWVkOmVycm9yIFskZXJyb3JdYFxuICBjb25zdCBicmFja2V0SWR4ID0gcmF3LmluZGV4T2YoJ1snKVxuICBpZiAoYnJhY2tldElkeCA9PT0gLTEpIHtcbiAgICByZXR1cm4geyBuYW1lOiByYXcudHJpbSgpLCBwYXlsb2FkOiBbXSB9XG4gIH1cbiAgY29uc3QgbmFtZSA9IHJhdy5zbGljZSgwLCBicmFja2V0SWR4KS50cmltKClcbiAgY29uc3QgcGF5bG9hZFJhdyA9IHJhdy5zbGljZShicmFja2V0SWR4ICsgMSwgcmF3Lmxhc3RJbmRleE9mKCddJykpLnRyaW0oKVxuXG4gIC8vIFBheWxvYWQgZWxlbWVudHMgYXJlIGNvbW1hIG9yIHNwYWNlIHNlcGFyYXRlZCBleHByZXNzaW9uc1xuICBjb25zdCBwYXlsb2FkOiBFeHByTm9kZVtdID0gcGF5bG9hZFJhd1xuICAgID8gcGF5bG9hZFJhdy5zcGxpdCgvLFxccyp8XFxzezIsfS8pLm1hcChzID0+IGV4cHIocy50cmltKCkpKS5maWx0ZXIoZSA9PiBlLnJhdylcbiAgICA6IFtdXG5cbiAgcmV0dXJuIHsgbmFtZSwgcGF5bG9hZCB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gQW5pbWF0aW9uIGxpbmUgcGFyc2luZ1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogU3BsaXRzIGFuIGFuaW1hdGlvbiBsaW5lIGludG8gaXRzIHN0cnVjdHVyYWwgcGFydHMsIHByZXNlcnZpbmcgWy4uLl0gZ3JvdXBzLlxuICpcbiAqIElucHV0OiAgYHN0YWdnZXItZW50ZXIgLmZlZWQtaXRlbSAgMTIwbXMgZWFzZS1vdXQgW2dhcDogNDBtcyAgZnJvbTogcmlnaHRdYFxuICogT3V0cHV0OiBbJ3N0YWdnZXItZW50ZXInLCAnLmZlZWQtaXRlbScsICcxMjBtcycsICdlYXNlLW91dCcsICdbZ2FwOiA0MG1zICBmcm9tOiByaWdodF0nXVxuICovXG5mdW5jdGlvbiBzcGxpdEFuaW1hdGlvbkxpbmUodGV4dDogc3RyaW5nKTogc3RyaW5nW10ge1xuICBjb25zdCBwYXJ0czogc3RyaW5nW10gPSBbXVxuICBsZXQgY3VycmVudCA9ICcnXG4gIGxldCBpbkJyYWNrZXQgPSAwXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCB0ZXh0Lmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY2ggPSB0ZXh0W2ldIVxuICAgIGlmIChjaCA9PT0gJ1snKSB7XG4gICAgICBpbkJyYWNrZXQrK1xuICAgICAgY3VycmVudCArPSBjaFxuICAgIH0gZWxzZSBpZiAoY2ggPT09ICddJykge1xuICAgICAgaW5CcmFja2V0LS1cbiAgICAgIGN1cnJlbnQgKz0gY2hcbiAgICB9IGVsc2UgaWYgKGNoID09PSAnICcgJiYgaW5CcmFja2V0ID09PSAwKSB7XG4gICAgICBpZiAoY3VycmVudC50cmltKCkpIHBhcnRzLnB1c2goY3VycmVudC50cmltKCkpXG4gICAgICBjdXJyZW50ID0gJydcbiAgICB9IGVsc2Uge1xuICAgICAgY3VycmVudCArPSBjaFxuICAgIH1cbiAgfVxuICBpZiAoY3VycmVudC50cmltKCkpIHBhcnRzLnB1c2goY3VycmVudC50cmltKCkpXG4gIHJldHVybiBwYXJ0c1xufVxuXG4vKipcbiAqIFBhcnNlcyBhbmltYXRpb24gb3B0aW9ucyBmcm9tIGEgYFtrZXk6IHZhbHVlICBrZXkyOiB2YWx1ZTJdYCBzdHJpbmcuXG4gKiBUaGUgb3V0ZXIgYnJhY2tldHMgYXJlIGluY2x1ZGVkIGluIHRoZSBpbnB1dC5cbiAqL1xuZnVuY3Rpb24gcGFyc2VBbmltYXRpb25PcHRpb25zKHJhdzogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgRXhwck5vZGU+IHtcbiAgaWYgKCFyYXcudHJpbSgpKSByZXR1cm4ge31cbiAgLy8gU3RyaXAgb3V0ZXIgYnJhY2tldHNcbiAgY29uc3QgaW5uZXIgPSByYXcucmVwbGFjZSgvXlxcW3xcXF0kL2csICcnKS50cmltKClcbiAgcmV0dXJuIHBhcnNlQXJnTGlzdChpbm5lcilcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBVdGlsaXRpZXNcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5mdW5jdGlvbiBleHByKHJhdzogc3RyaW5nKTogRXhwck5vZGUge1xuICByZXR1cm4geyB0eXBlOiAnZXhwcicsIHJhdyB9XG59XG5cbmZ1bmN0aW9uIGZpcnN0V29yZCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdGV4dC5zcGxpdCgvXFxzKy8pWzBdID8/ICcnXG59XG5cbmZ1bmN0aW9uIHRvU2VxdWVuY2VPclNpbmdsZShzdGVwczogTEVTTm9kZVtdKTogTEVTTm9kZSB7XG4gIGlmIChzdGVwcy5sZW5ndGggPT09IDApIHJldHVybiBleHByKCcnKVxuICBpZiAoc3RlcHMubGVuZ3RoID09PSAxKSByZXR1cm4gc3RlcHNbMF0hXG4gIHJldHVybiB7IHR5cGU6ICdzZXF1ZW5jZScsIHN0ZXBzIH0gc2F0aXNmaWVzIFNlcXVlbmNlTm9kZVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFBhcnNlIGVycm9yXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZXhwb3J0IGNsYXNzIExFU1BhcnNlRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKG1lc3NhZ2U6IHN0cmluZywgcHVibGljIHJlYWRvbmx5IHRva2VuOiBUb2tlbiB8IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IGxvYyA9IHRva2VuID8gYCAobGluZSAke3Rva2VuLmxpbmVOdW19OiAke0pTT04uc3RyaW5naWZ5KHRva2VuLnRleHQpfSlgIDogJydcbiAgICBzdXBlcihgW0xFUzpwYXJzZXJdICR7bWVzc2FnZX0ke2xvY31gKVxuICAgIHRoaXMubmFtZSA9ICdMRVNQYXJzZUVycm9yJ1xuICB9XG59XG4iLCAiaW1wb3J0IHsgc3RyaXBCb2R5IH0gZnJvbSAnLi9zdHJpcEJvZHkuanMnXG5pbXBvcnQgeyB0b2tlbml6ZSB9IGZyb20gJy4vdG9rZW5pemVyLmpzJ1xuaW1wb3J0IHsgTEVTUGFyc2VyIH0gZnJvbSAnLi9wYXJzZXIuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICcuL2FzdC5qcydcblxuZXhwb3J0IHsgTEVTUGFyc2VyLCBMRVNQYXJzZUVycm9yIH0gZnJvbSAnLi9wYXJzZXIuanMnXG5leHBvcnQgeyB0b2tlbml6ZSwgZW5kc1dpdGhBbmQsIHN0cmlwVHJhaWxpbmdBbmQgfSBmcm9tICcuL3Rva2VuaXplci5qcydcbmV4cG9ydCB7IHN0cmlwQm9keSB9IGZyb20gJy4vc3RyaXBCb2R5LmpzJ1xuZXhwb3J0IHR5cGUgeyBUb2tlbiB9IGZyb20gJy4vdG9rZW5pemVyLmpzJ1xuZXhwb3J0ICogZnJvbSAnLi9hc3QuanMnXG5leHBvcnQgKiBmcm9tICcuL2NvbmZpZy5qcydcblxuLyoqXG4gKiBQYXJzZSBhIHJhdyBMRVMgYm9keSBzdHJpbmcgKGZyb20gYSBkbz0sIGhhbmRsZT0sIG9yIHJ1bj0gYXR0cmlidXRlKVxuICogaW50byBhIHR5cGVkIEFTVCBub2RlLlxuICpcbiAqIFRoaXMgaXMgdGhlIHB1YmxpYyBlbnRyeSBwb2ludCBmb3IgUGhhc2UgMjpcbiAqICAgLSBTdHJpcHMgYmFja3RpY2sgd3JhcHBlciBhbmQgbm9ybWFsaXplcyBpbmRlbnRhdGlvbiAoc3RyaXBCb2R5KVxuICogICAtIFRva2VuaXplcyBpbnRvIGxpbmVzIHdpdGggaW5kZW50IGxldmVscyAodG9rZW5pemUpXG4gKiAgIC0gUGFyc2VzIGludG8gYSB0eXBlZCBMRVNOb2RlIEFTVCAoTEVTUGFyc2VyKVxuICpcbiAqIEB0aHJvd3MgTEVTUGFyc2VFcnJvciBvbiB1bnJlY292ZXJhYmxlIHN5bnRheCBlcnJvcnMgKGN1cnJlbnRseSBzb2Z0LXdhcm5zIGluc3RlYWQpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUxFUyhyYXc6IHN0cmluZyk6IExFU05vZGUge1xuICBjb25zdCBzdHJpcHBlZCA9IHN0cmlwQm9keShyYXcpXG4gIGNvbnN0IHRva2VucyAgID0gdG9rZW5pemUoc3RyaXBwZWQpXG4gIGNvbnN0IHBhcnNlciAgID0gbmV3IExFU1BhcnNlcih0b2tlbnMpXG4gIHJldHVybiBwYXJzZXIucGFyc2UoKVxufVxuIiwgIi8qKlxuICogUGhhc2UgNDogd2lyZXMgdGhlIHBhcnNlZCBjb25maWcgaW50byBsaXZlIHJ1bnRpbWUgYmVoYXZpb3IuXG4gKlxuICogUmVzcG9uc2liaWxpdGllczpcbiAqICAgMS4gUmVnaXN0ZXIgYWxsIDxsb2NhbC1jb21tYW5kPiBwYXJzZWQgZGVmcyBpbnRvIHRoZSBDb21tYW5kUmVnaXN0cnlcbiAqICAgMi4gQXR0YWNoIEN1c3RvbUV2ZW50IGxpc3RlbmVycyBvbiB0aGUgaG9zdCBmb3IgZWFjaCA8b24tZXZlbnQ+XG4gKiAgIDMuIFdpcmUgPG9uLWxvYWQ+IHRvIGZpcmUgYWZ0ZXIgRE9NIGlzIHJlYWR5XG4gKiAgIDQuIEJ1aWxkIHRoZSBMRVNDb250ZXh0IHVzZWQgYnkgdGhlIGV4ZWN1dG9yXG4gKlxuICogPG9uLXNpZ25hbD4gYW5kIDxvbi1lbnRlcj4vPG9uLWV4aXQ+IGFyZSB3aXJlZCBpbiBQaGFzZSA1LzYuXG4gKi9cblxuaW1wb3J0IHsgZXhlY3V0ZSwgZXZhbEV4cHIgfSBmcm9tICcuL2V4ZWN1dG9yLmpzJ1xuaW1wb3J0IHsgTEVTU2NvcGUgfSBmcm9tICcuL3Njb3BlLmpzJ1xuaW1wb3J0IHR5cGUgeyBDb21tYW5kUmVnaXN0cnkgfSBmcm9tICcuL3JlZ2lzdHJ5LmpzJ1xuaW1wb3J0IHR5cGUgeyBNb2R1bGVSZWdpc3RyeSB9IGZyb20gJ0Btb2R1bGVzL3R5cGVzLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNDb25maWcgfSBmcm9tICdAcGFyc2VyL2NvbmZpZy5qcydcbmltcG9ydCB0eXBlIHsgTEVTTm9kZSB9IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuaW1wb3J0IHsgcGFyc2VMRVMgfSBmcm9tICdAcGFyc2VyL2luZGV4LmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlZFdpcmluZyB7XG4gIGNvbW1hbmRzOiAgQXJyYXk8eyBuYW1lOiBzdHJpbmc7IGd1YXJkOiBzdHJpbmcgfCBudWxsOyBhcmdzUmF3OiBzdHJpbmc7IGJvZHk6IExFU05vZGUgfT5cbiAgaGFuZGxlcnM6ICBBcnJheTx7IGV2ZW50OiBzdHJpbmc7IGJvZHk6IExFU05vZGUgfT5cbiAgd2F0Y2hlcnM6ICBBcnJheTx7IHNpZ25hbDogc3RyaW5nOyB3aGVuOiBzdHJpbmcgfCBudWxsOyBib2R5OiBMRVNOb2RlIH0+XG4gIGxpZmVjeWNsZToge1xuICAgIG9uTG9hZDogIExFU05vZGVbXVxuICAgIG9uRW50ZXI6IEFycmF5PHsgd2hlbjogc3RyaW5nIHwgbnVsbDsgYm9keTogTEVTTm9kZSB9PlxuICAgIG9uRXhpdDogIExFU05vZGVbXVxuICB9XG59XG5cbi8qKiBCdWlsZHMgYSBMRVNDb250ZXh0IGZvciB0aGUgaG9zdCBlbGVtZW50LiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ29udGV4dChcbiAgaG9zdDogRWxlbWVudCxcbiAgY29tbWFuZHM6IENvbW1hbmRSZWdpc3RyeSxcbiAgbW9kdWxlczogTW9kdWxlUmVnaXN0cnksXG4gIHNpZ25hbHM6IHsgZ2V0OiAoazogc3RyaW5nKSA9PiB1bmtub3duOyBzZXQ6IChrOiBzdHJpbmcsIHY6IHVua25vd24pID0+IHZvaWQgfVxuKTogaW1wb3J0KCcuL2V4ZWN1dG9yLmpzJykuTEVTQ29udGV4dCB7XG4gIGNvbnN0IHNjb3BlID0gbmV3IExFU1Njb3BlKClcblxuICBjb25zdCBlbWl0TG9jYWwgPSAoZXZlbnQ6IHN0cmluZywgcGF5bG9hZDogdW5rbm93bltdKSA9PiB7XG4gICAgY29uc29sZS5sb2coYFtMRVNdIGVtaXQgXCIke2V2ZW50fVwiYCwgcGF5bG9hZC5sZW5ndGggPyBwYXlsb2FkIDogJycpXG4gICAgaG9zdC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudChldmVudCwge1xuICAgICAgZGV0YWlsOiB7IHBheWxvYWQgfSxcbiAgICAgIGJ1YmJsZXM6IGZhbHNlLFxuICAgICAgY29tcG9zZWQ6IGZhbHNlLFxuICAgIH0pKVxuICB9XG5cbiAgY29uc3QgYnJvYWRjYXN0ID0gKGV2ZW50OiBzdHJpbmcsIHBheWxvYWQ6IHVua25vd25bXSkgPT4ge1xuICAgIGNvbnNvbGUubG9nKGBbTEVTXSBicm9hZGNhc3QgXCIke2V2ZW50fVwiYCwgcGF5bG9hZC5sZW5ndGggPyBwYXlsb2FkIDogJycpXG4gICAgaG9zdC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudChldmVudCwge1xuICAgICAgZGV0YWlsOiB7IHBheWxvYWQgfSxcbiAgICAgIGJ1YmJsZXM6IHRydWUsXG4gICAgICBjb21wb3NlZDogdHJ1ZSxcbiAgICB9KSlcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc2NvcGUsXG4gICAgaG9zdCxcbiAgICBjb21tYW5kcyxcbiAgICBtb2R1bGVzLFxuICAgIGdldFNpZ25hbDogc2lnbmFscy5nZXQsXG4gICAgc2V0U2lnbmFsOiBzaWduYWxzLnNldCxcbiAgICBlbWl0TG9jYWwsXG4gICAgYnJvYWRjYXN0LFxuICB9XG59XG5cbi8qKlxuICogUmVnaXN0ZXJzIGFsbCBwYXJzZWQgY29tbWFuZHMgaW50byB0aGUgcmVnaXN0cnkuXG4gKiBDYWxsZWQgb25jZSBkdXJpbmcgX2luaXQsIGJlZm9yZSBhbnkgZXZlbnRzIGFyZSB3aXJlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyQ29tbWFuZHMoXG4gIHdpcmluZzogUGFyc2VkV2lyaW5nLFxuICByZWdpc3RyeTogQ29tbWFuZFJlZ2lzdHJ5XG4pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBjbWQgb2Ygd2lyaW5nLmNvbW1hbmRzKSB7XG4gICAgLy8gUGFyc2UgYXJnc1JhdyBpbnRvIEFyZ0RlZltdIChzaW1wbGlmaWVkIFx1MjAxNCBmdWxsIGFyZyBwYXJzaW5nIGluIFBoYXNlIDIgcmVmaW5lbWVudClcbiAgICBjb25zdCBhcmdzID0gcGFyc2VBcmdzUmF3KGNtZC5hcmdzUmF3KVxuICAgIGNvbnN0IGRlZjogaW1wb3J0KCcuL3JlZ2lzdHJ5LmpzJykuQ29tbWFuZERlZiA9IHtcbiAgICAgIG5hbWU6IGNtZC5uYW1lLFxuICAgICAgYXJncyxcbiAgICAgIGJvZHk6IGNtZC5ib2R5LFxuICAgICAgZWxlbWVudDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbG9jYWwtY29tbWFuZCcpLFxuICAgIH1cbiAgICBpZiAoY21kLmd1YXJkKSBkZWYuZ3VhcmQgPSBjbWQuZ3VhcmRcbiAgICByZWdpc3RyeS5yZWdpc3RlcihkZWYpXG4gIH1cbiAgY29uc29sZS5sb2coYFtMRVNdIHJlZ2lzdGVyZWQgJHt3aXJpbmcuY29tbWFuZHMubGVuZ3RofSBjb21tYW5kc2ApXG59XG5cbi8qKlxuICogQXR0YWNoZXMgZXZlbnQgbGlzdGVuZXJzIG9uIHRoZSBob3N0IGZvciBhbGwgPG9uLWV2ZW50PiBoYW5kbGVycy5cbiAqIFJldHVybnMgYSBjbGVhbnVwIGZ1bmN0aW9uIHRoYXQgcmVtb3ZlcyBhbGwgbGlzdGVuZXJzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2lyZUV2ZW50SGFuZGxlcnMoXG4gIHdpcmluZzogUGFyc2VkV2lyaW5nLFxuICBob3N0OiBFbGVtZW50LFxuICBnZXRDdHg6ICgpID0+IGltcG9ydCgnLi9leGVjdXRvci5qcycpLkxFU0NvbnRleHRcbik6ICgpID0+IHZvaWQge1xuICBjb25zdCBjbGVhbnVwczogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXVxuXG4gIGZvciAoY29uc3QgaGFuZGxlciBvZiB3aXJpbmcuaGFuZGxlcnMpIHtcbiAgICBjb25zdCBsaXN0ZW5lciA9IChlOiBFdmVudCkgPT4ge1xuICAgICAgY29uc3QgY3R4ID0gZ2V0Q3R4KClcbiAgICAgIC8vIEV4cG9zZSBldmVudCBkZXRhaWwgaW4gc2NvcGVcbiAgICAgIGNvbnN0IGhhbmRsZXJTY29wZSA9IGN0eC5zY29wZS5jaGlsZCgpXG4gICAgICBjb25zdCBkZXRhaWwgPSAoZSBhcyBDdXN0b21FdmVudCkuZGV0YWlsID8/IHt9XG4gICAgICBoYW5kbGVyU2NvcGUuc2V0KCdldmVudCcsIGUpXG4gICAgICBoYW5kbGVyU2NvcGUuc2V0KCdwYXlsb2FkJywgZGV0YWlsLnBheWxvYWQgPz8gW10pXG4gICAgICBjb25zdCBoYW5kbGVyQ3R4ID0geyAuLi5jdHgsIHNjb3BlOiBoYW5kbGVyU2NvcGUgfVxuXG4gICAgICBleGVjdXRlKGhhbmRsZXIuYm9keSwgaGFuZGxlckN0eCkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgW0xFU10gRXJyb3IgaW4gaGFuZGxlciBmb3IgXCIke2hhbmRsZXIuZXZlbnR9XCI6YCwgZXJyKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBob3N0LmFkZEV2ZW50TGlzdGVuZXIoaGFuZGxlci5ldmVudCwgbGlzdGVuZXIpXG4gICAgY2xlYW51cHMucHVzaCgoKSA9PiBob3N0LnJlbW92ZUV2ZW50TGlzdGVuZXIoaGFuZGxlci5ldmVudCwgbGlzdGVuZXIpKVxuICAgIGNvbnNvbGUubG9nKGBbTEVTXSB3aXJlZCBldmVudCBoYW5kbGVyOiBcIiR7aGFuZGxlci5ldmVudH1cImApXG4gIH1cblxuICByZXR1cm4gKCkgPT4gY2xlYW51cHMuZm9yRWFjaChmbiA9PiBmbigpKVxufVxuXG4vKipcbiAqIEZpcmVzIGFsbCA8b24tbG9hZD4gYm9kaWVzLlxuICogQ2FsbGVkIGFmdGVyIGNvbW1hbmRzIGFyZSByZWdpc3RlcmVkIGFuZCBldmVudCBoYW5kbGVycyBhcmUgd2lyZWQsXG4gKiBzbyBlbWl0L2NhbGwgc3RhdGVtZW50cyBpbiBvbi1sb2FkIGNhbiByZWFjaCB0aGVpciB0YXJnZXRzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmlyZU9uTG9hZChcbiAgd2lyaW5nOiBQYXJzZWRXaXJpbmcsXG4gIGdldEN0eDogKCkgPT4gaW1wb3J0KCcuL2V4ZWN1dG9yLmpzJykuTEVTQ29udGV4dFxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGZvciAoY29uc3QgYm9keSBvZiB3aXJpbmcubGlmZWN5Y2xlLm9uTG9hZCkge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBleGVjdXRlKGJvZHksIGdldEN0eCgpKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcignW0xFU10gRXJyb3IgaW4gb24tbG9hZDonLCBlcnIpXG4gICAgfVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gQXJnIHBhcnNpbmcgKHNpbXBsaWZpZWQgXHUyMDE0IGZ1bGwgdHlwZS1jaGVja2VkIHZlcnNpb24gaW4gUGhhc2UgMiByZWZpbmVtZW50KVxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmltcG9ydCB0eXBlIHsgQXJnRGVmIH0gZnJvbSAnLi9yZWdpc3RyeS5qcydcbmltcG9ydCB0eXBlIHsgRXhwck5vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuZnVuY3Rpb24gcGFyc2VBcmdzUmF3KHJhdzogc3RyaW5nKTogQXJnRGVmW10ge1xuICBpZiAoIXJhdy50cmltKCkpIHJldHVybiBbXVxuICAvLyBTdHJpcCBvdXRlciBicmFja2V0czogXCJbZnJvbTpzdHIgIHRvOnN0ciAgYXR0ZW1wdDppbnQ9MF1cIiBcdTIxOTIgXCJmcm9tOnN0ciAgdG86c3RyICBhdHRlbXB0OmludD0wXCJcbiAgY29uc3QgaW5uZXIgPSByYXcucmVwbGFjZSgvXlxcW3xcXF0kL2csICcnKS50cmltKClcbiAgaWYgKCFpbm5lcikgcmV0dXJuIFtdXG5cbiAgcmV0dXJuIGlubmVyLnNwbGl0KC9cXHN7Mix9fFxccyg/PVxcdys6KS8pLm1hcChzID0+IHMudHJpbSgpKS5maWx0ZXIoQm9vbGVhbikubWFwKHBhcnQgPT4ge1xuICAgIC8vIGBuYW1lOnR5cGU9ZGVmYXVsdGAgb3IgYG5hbWU6dHlwZWBcbiAgICBjb25zdCBlcUlkeCA9IHBhcnQuaW5kZXhPZignPScpXG4gICAgY29uc3QgY29sb25JZHggPSBwYXJ0LmluZGV4T2YoJzonKVxuICAgIGlmIChjb2xvbklkeCA9PT0gLTEpIHJldHVybiB7IG5hbWU6IHBhcnQsIHR5cGU6ICdkeW4nIH1cblxuICAgIGNvbnN0IG5hbWUgPSBwYXJ0LnNsaWNlKDAsIGNvbG9uSWR4KS50cmltKClcbiAgICBjb25zdCByZXN0ID0gcGFydC5zbGljZShjb2xvbklkeCArIDEpXG5cbiAgICBpZiAoZXFJZHggPT09IC0xKSB7XG4gICAgICByZXR1cm4geyBuYW1lLCB0eXBlOiByZXN0LnRyaW0oKSB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHR5cGUgPSBwYXJ0LnNsaWNlKGNvbG9uSWR4ICsgMSwgZXFJZHgpLnRyaW0oKVxuICAgICAgY29uc3QgZGVmYXVsdFJhdyA9IHBhcnQuc2xpY2UoZXFJZHggKyAxKS50cmltKClcbiAgICAgIGNvbnN0IGRlZmF1bHRFeHByOiBFeHByTm9kZSA9IHsgdHlwZTogJ2V4cHInLCByYXc6IGRlZmF1bHRSYXcgfVxuICAgICAgcmV0dXJuIHsgbmFtZSwgdHlwZSwgZGVmYXVsdDogZGVmYXVsdEV4cHIgfVxuICAgIH1cbiAgfSlcbn1cbiIsICIvKipcbiAqIExFU1Njb3BlIFx1MjAxNCBhIHNpbXBsZSBsZXhpY2FsbHktc2NvcGVkIHZhcmlhYmxlIHN0b3JlLlxuICpcbiAqIEVhY2ggY29tbWFuZCBpbnZvY2F0aW9uIGdldHMgYSBmcmVzaCBjaGlsZCBzY29wZS5cbiAqIE1hdGNoIGFybSBiaW5kaW5ncyBhbHNvIGNyZWF0ZSBhIGNoaWxkIHNjb3BlIGxpbWl0ZWQgdG8gdGhhdCBhcm0ncyBib2R5LlxuICogU2lnbmFsIHJlYWRzL3dyaXRlcyBnbyB0aHJvdWdoIHRoZSBEYXRhc3RhciBicmlkZ2UsIG5vdCB0aGlzIHNjb3BlLlxuICovXG5leHBvcnQgY2xhc3MgTEVTU2NvcGUge1xuICBwcml2YXRlIGxvY2FscyA9IG5ldyBNYXA8c3RyaW5nLCB1bmtub3duPigpXG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwYXJlbnQ/OiBMRVNTY29wZSkge31cblxuICBnZXQobmFtZTogc3RyaW5nKTogdW5rbm93biB7XG4gICAgaWYgKHRoaXMubG9jYWxzLmhhcyhuYW1lKSkgcmV0dXJuIHRoaXMubG9jYWxzLmdldChuYW1lKVxuICAgIHJldHVybiB0aGlzLnBhcmVudD8uZ2V0KG5hbWUpXG4gIH1cblxuICBzZXQobmFtZTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIHRoaXMubG9jYWxzLnNldChuYW1lLCB2YWx1ZSlcbiAgfVxuXG4gIGhhcyhuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5sb2NhbHMuaGFzKG5hbWUpIHx8ICh0aGlzLnBhcmVudD8uaGFzKG5hbWUpID8/IGZhbHNlKVxuICB9XG5cbiAgLyoqIENyZWF0ZSBhIGNoaWxkIHNjb3BlIGluaGVyaXRpbmcgYWxsIGxvY2FscyBmcm9tIHRoaXMgb25lLiAqL1xuICBjaGlsZCgpOiBMRVNTY29wZSB7XG4gICAgcmV0dXJuIG5ldyBMRVNTY29wZSh0aGlzKVxuICB9XG5cbiAgLyoqIFNuYXBzaG90IGFsbCBsb2NhbHMgKGZvciBkZWJ1Z2dpbmcgLyBlcnJvciBtZXNzYWdlcykuICovXG4gIHNuYXBzaG90KCk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcbiAgICBjb25zdCBiYXNlID0gdGhpcy5wYXJlbnQ/LnNuYXBzaG90KCkgPz8ge31cbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiB0aGlzLmxvY2FscykgYmFzZVtrXSA9IHZcbiAgICByZXR1cm4gYmFzZVxuICB9XG59XG4iLCAiLyoqXG4gKiBQaGFzZSA1YTogSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgd2lyaW5nXG4gKlxuICogT25lIHNoYXJlZCBJbnRlcnNlY3Rpb25PYnNlcnZlciBpcyBjcmVhdGVkIHBlciA8bG9jYWwtZXZlbnQtc2NyaXB0PiBob3N0LlxuICogSXQgd2F0Y2hlcyB0aGUgaG9zdCBlbGVtZW50IGl0c2VsZiAobm90IGl0cyBjaGlsZHJlbikuXG4gKlxuICogb24tZW50ZXI6IGZpcmVzIHdoZW4gdGhlIGhvc3QgY3Jvc3NlcyBpbnRvIHRoZSB2aWV3cG9ydFxuICogICAtIEVhY2ggPG9uLWVudGVyPiBoYXMgYW4gb3B0aW9uYWwgYHdoZW5gIGd1YXJkIGV2YWx1YXRlZCBhdCBmaXJlIHRpbWVcbiAqICAgLSBNdWx0aXBsZSA8b24tZW50ZXI+IGNoaWxkcmVuIGFyZSBhbGwgY2hlY2tlZCBpbiBkZWNsYXJhdGlvbiBvcmRlclxuICpcbiAqIG9uLWV4aXQ6IGZpcmVzIHdoZW4gdGhlIGhvc3QgbGVhdmVzIHRoZSB2aWV3cG9ydFxuICogICAtIEFsd2F5cyBmaXJlcyB1bmNvbmRpdGlvbmFsbHkgKG5vIGB3aGVuYCBndWFyZCBvbiBvbi1leGl0KVxuICogICAtIE11bHRpcGxlIDxvbi1leGl0PiBjaGlsZHJlbiBhbGwgZmlyZVxuICpcbiAqIFRoZSBvYnNlcnZlciBpcyBkaXNjb25uZWN0ZWQgaW4gZGlzY29ubmVjdGVkQ2FsbGJhY2sgdmlhIHRoZSByZXR1cm5lZCBjbGVhbnVwIGZuLlxuICovXG5cbmltcG9ydCB7IGV4ZWN1dGUsIGV2YWxFeHByIH0gZnJvbSAnLi9leGVjdXRvci5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29udGV4dCB9IGZyb20gJy4vZXhlY3V0b3IuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuZXhwb3J0IGludGVyZmFjZSBPbkVudGVyRGVjbCB7XG4gIHdoZW46IHN0cmluZyB8IG51bGxcbiAgYm9keTogTEVTTm9kZVxufVxuXG4vKipcbiAqIEF0dGFjaGVzIGFuIEludGVyc2VjdGlvbk9ic2VydmVyIHRvIHRoZSBob3N0IGVsZW1lbnQuXG4gKlxuICogQHJldHVybnMgQSBjbGVhbnVwIGZ1bmN0aW9uIHRoYXQgZGlzY29ubmVjdHMgdGhlIG9ic2VydmVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2lyZUludGVyc2VjdGlvbk9ic2VydmVyKFxuICBob3N0OiBFbGVtZW50LFxuICBvbkVudGVyOiBPbkVudGVyRGVjbFtdLFxuICBvbkV4aXQ6IExFU05vZGVbXSxcbiAgZ2V0Q3R4OiAoKSA9PiBMRVNDb250ZXh0LFxuKTogKCkgPT4gdm9pZCB7XG4gIGlmIChvbkVudGVyLmxlbmd0aCA9PT0gMCAmJiBvbkV4aXQubGVuZ3RoID09PSAwKSB7XG4gICAgLy8gTm90aGluZyB0byBvYnNlcnZlIFx1MjAxNCBza2lwIGNyZWF0aW5nIHRoZSBJTyBlbnRpcmVseVxuICAgIHJldHVybiAoKSA9PiB7fVxuICB9XG5cbiAgbGV0IHdhc0ludGVyc2VjdGluZzogYm9vbGVhbiB8IG51bGwgPSBudWxsXG5cbiAgY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIoXG4gICAgKGVudHJpZXMpID0+IHtcbiAgICAgIC8vIElPIGZpcmVzIG9uY2UgaW1tZWRpYXRlbHkgb24gYXR0YWNoIHdpdGggdGhlIGN1cnJlbnQgc3RhdGUuXG4gICAgICAvLyBXZSB0cmFjayBgd2FzSW50ZXJzZWN0aW5nYCB0byBhdm9pZCBzcHVyaW91cyBvbi1leGl0IG9uIGZpcnN0IHRpY2suXG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgICAgY29uc3Qgbm93SW50ZXJzZWN0aW5nID0gZW50cnkuaXNJbnRlcnNlY3RpbmdcblxuICAgICAgICBpZiAobm93SW50ZXJzZWN0aW5nICYmIHdhc0ludGVyc2VjdGluZyAhPT0gdHJ1ZSkge1xuICAgICAgICAgIC8vIEVudGVyZWQgdmlld3BvcnRcbiAgICAgICAgICB3YXNJbnRlcnNlY3RpbmcgPSB0cnVlXG4gICAgICAgICAgaGFuZGxlRW50ZXIob25FbnRlciwgZ2V0Q3R4KVxuICAgICAgICB9IGVsc2UgaWYgKCFub3dJbnRlcnNlY3RpbmcgJiYgd2FzSW50ZXJzZWN0aW5nID09PSB0cnVlKSB7XG4gICAgICAgICAgLy8gRXhpdGVkIHZpZXdwb3J0IChvbmx5IGFmdGVyIHdlJ3ZlIGJlZW4gaW4gaXQpXG4gICAgICAgICAgd2FzSW50ZXJzZWN0aW5nID0gZmFsc2VcbiAgICAgICAgICBoYW5kbGVFeGl0KG9uRXhpdCwgZ2V0Q3R4KVxuICAgICAgICB9IGVsc2UgaWYgKHdhc0ludGVyc2VjdGluZyA9PT0gbnVsbCkge1xuICAgICAgICAgIC8vIEZpcnN0IHRpY2sgXHUyMDE0IHJlY29yZCBzdGF0ZSBidXQgZG9uJ3QgZmlyZSBleGl0IGZvciBpbml0aWFsbHktb2ZmLXNjcmVlblxuICAgICAgICAgIHdhc0ludGVyc2VjdGluZyA9IG5vd0ludGVyc2VjdGluZ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAvLyBEZWZhdWx0IHRocmVzaG9sZDogZmlyZSB3aGVuIGFueSBwaXhlbCBvZiB0aGUgaG9zdCBlbnRlcnMvZXhpdHNcbiAgICAgIHRocmVzaG9sZDogMCxcbiAgICB9XG4gIClcblxuICBvYnNlcnZlci5vYnNlcnZlKGhvc3QpXG4gIGNvbnNvbGUubG9nKCdbTEVTXSBJbnRlcnNlY3Rpb25PYnNlcnZlciBhdHRhY2hlZCcsIChob3N0IGFzIEhUTUxFbGVtZW50KS5pZCB8fCBob3N0LnRhZ05hbWUpXG5cbiAgcmV0dXJuICgpID0+IHtcbiAgICBvYnNlcnZlci5kaXNjb25uZWN0KClcbiAgICBjb25zb2xlLmxvZygnW0xFU10gSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgZGlzY29ubmVjdGVkJylcbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVFbnRlcihkZWNsczogT25FbnRlckRlY2xbXSwgZ2V0Q3R4OiAoKSA9PiBMRVNDb250ZXh0KTogdm9pZCB7XG4gIGNvbnN0IGN0eCA9IGdldEN0eCgpXG5cbiAgZm9yIChjb25zdCBkZWNsIG9mIGRlY2xzKSB7XG4gICAgLy8gRXZhbHVhdGUgYHdoZW5gIGd1YXJkIFx1MjAxNCBpZiBhYnNlbnQsIGFsd2F5cyBmaXJlc1xuICAgIGlmIChkZWNsLndoZW4pIHtcbiAgICAgIGNvbnN0IHBhc3NlcyA9IEJvb2xlYW4oZXZhbEV4cHIoeyB0eXBlOiAnZXhwcicsIHJhdzogZGVjbC53aGVuIH0sIGN0eCkpXG4gICAgICBpZiAoIXBhc3Nlcykge1xuICAgICAgICBjb25zb2xlLmxvZyhgW0xFU10gb24tZW50ZXIgZ3VhcmQgcmVqZWN0ZWQ6ICR7ZGVjbC53aGVufWApXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgfVxuXG4gICAgZXhlY3V0ZShkZWNsLmJvZHksIGN0eCkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tMRVNdIEVycm9yIGluIG9uLWVudGVyOicsIGVycilcbiAgICB9KVxuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUV4aXQoYm9kaWVzOiBMRVNOb2RlW10sIGdldEN0eDogKCkgPT4gTEVTQ29udGV4dCk6IHZvaWQge1xuICBjb25zdCBjdHggPSBnZXRDdHgoKVxuXG4gIGZvciAoY29uc3QgYm9keSBvZiBib2RpZXMpIHtcbiAgICBleGVjdXRlKGJvZHksIGN0eCkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tMRVNdIEVycm9yIGluIG9uLWV4aXQ6JywgZXJyKVxuICAgIH0pXG4gIH1cbn1cbiIsICIvKipcbiAqIFBoYXNlIDViOiBTaWduYWwgd2F0Y2hlciB3aXJpbmdcbiAqXG4gKiA8b24tc2lnbmFsPiByZWFjdHMgd2hlbmV2ZXIgYSBuYW1lZCBEYXRhc3RhciBzaWduYWwgY2hhbmdlcy5cbiAqIFRoZSBgd2hlbmAgZ3VhcmQgaXMgcmUtZXZhbHVhdGVkIG9uIGV2ZXJ5IGNoYW5nZSBcdTIwMTQgaWYgZmFsc3ksIHRoZVxuICogaGFuZGxlIGJvZHkgZG9lcyBub3QgcnVuIChub3QgYW4gZXJyb3IsIGp1c3QgZmlsdGVyZWQgb3V0KS5cbiAqXG4gKiBJbiBQaGFzZSA1IHdlIHVzZSBhIHNpbXBsZSBsb2NhbCBub3RpZmljYXRpb24gcGF0aDogd2hlbmV2ZXJcbiAqIExvY2FsRXZlbnRTY3JpcHQuX3NldFNpZ25hbCgpIHdyaXRlcyBhIHZhbHVlLCBpdCBjYWxscyBpbnRvXG4gKiBub3RpZnlTaWduYWxXYXRjaGVycygpLiBUaGlzIGhhbmRsZXMgdGhlIGZhbGxiYWNrIChubyBEYXRhc3RhcikgY2FzZS5cbiAqXG4gKiBQaGFzZSA2IHJlcGxhY2VzIHRoZSBub3RpZmljYXRpb24gcGF0aCB3aXRoIERhdGFzdGFyJ3MgZWZmZWN0KCkgc3lzdGVtLFxuICogd2hpY2ggaXMgbW9yZSBlZmZpY2llbnQgKGJhdGNoZWQsIGRlZHVwZWQsIHJlYWN0aXZlIGdyYXBoLWF3YXJlKS5cbiAqXG4gKiBUaGUgd2F0Y2hlciBmaXJlcyB0aGUgYm9keSBhc3luY2hyb25vdXNseSAobm9uLWJsb2NraW5nKSB0byBtYXRjaFxuICogdGhlIGJlaGF2aW91ciBvZiBEYXRhc3RhcidzIHJlYWN0aXZlIGVmZmVjdHMuXG4gKi9cblxuaW1wb3J0IHsgZXhlY3V0ZSwgZXZhbEV4cHIgfSBmcm9tICcuL2V4ZWN1dG9yLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNDb250ZXh0IH0gZnJvbSAnLi9leGVjdXRvci5qcydcbmltcG9ydCB0eXBlIHsgTEVTTm9kZSB9IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIFNpZ25hbFdhdGNoZXJEZWNsIHtcbiAgLyoqIFNpZ25hbCBuYW1lIHdpdGggJCBwcmVmaXg6IFwiJGZlZWRTdGF0ZVwiICovXG4gIHNpZ25hbDogc3RyaW5nXG4gIC8qKiBPcHRpb25hbCBndWFyZCBleHByZXNzaW9uIFx1MjAxNCBudWxsIG1lYW5zIGFsd2F5cyBmaXJlcyAqL1xuICB3aGVuOiBzdHJpbmcgfCBudWxsXG4gIGJvZHk6IExFU05vZGVcbn1cblxuLyoqXG4gKiBDaGVja3MgYWxsIHNpZ25hbCB3YXRjaGVycyB0byBzZWUgaWYgYW55IHNob3VsZCBmaXJlIGZvciB0aGVcbiAqIGdpdmVuIHNpZ25hbCBuYW1lIGNoYW5nZS5cbiAqXG4gKiBDYWxsZWQgZnJvbSBMb2NhbEV2ZW50U2NyaXB0Ll9zZXRTaWduYWwoKSBhZnRlciBldmVyeSB3cml0ZS5cbiAqIEFsc28gY2FsbGVkIGZyb20gUGhhc2UgNiBEYXRhc3RhciBlZmZlY3QoKSBzdWJzY3JpcHRpb25zLlxuICpcbiAqIEBwYXJhbSBjaGFuZ2VkU2lnbmFsICBUaGUgc2lnbmFsIG5hbWUgKndpdGhvdXQqIHRoZSAkIHByZWZpeFxuICogQHBhcmFtIHdhdGNoZXJzICAgICAgIEFsbCBvbi1zaWduYWwgZGVjbGFyYXRpb25zIGZvciB0aGlzIExFUyBpbnN0YW5jZVxuICogQHBhcmFtIGdldEN0eCAgICAgICAgIFJldHVybnMgdGhlIGN1cnJlbnQgZXhlY3V0aW9uIGNvbnRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdGlmeVNpZ25hbFdhdGNoZXJzKFxuICBjaGFuZ2VkU2lnbmFsOiBzdHJpbmcsXG4gIHdhdGNoZXJzOiBTaWduYWxXYXRjaGVyRGVjbFtdLFxuICBnZXRDdHg6ICgpID0+IExFU0NvbnRleHRcbik6IHZvaWQge1xuICBmb3IgKGNvbnN0IHdhdGNoZXIgb2Ygd2F0Y2hlcnMpIHtcbiAgICAvLyBOb3JtYWxpemU6IHN0cmlwIGxlYWRpbmcgJCBmb3IgY29tcGFyaXNvblxuICAgIGNvbnN0IHdhdGNoZWRLZXkgPSB3YXRjaGVyLnNpZ25hbC5yZXBsYWNlKC9eXFwkLywgJycpXG5cbiAgICBpZiAod2F0Y2hlZEtleSAhPT0gY2hhbmdlZFNpZ25hbCkgY29udGludWVcblxuICAgIGNvbnN0IGN0eCA9IGdldEN0eCgpXG5cbiAgICAvLyBFdmFsdWF0ZSBgd2hlbmAgZ3VhcmRcbiAgICBpZiAod2F0Y2hlci53aGVuKSB7XG4gICAgICBjb25zdCBwYXNzZXMgPSBCb29sZWFuKGV2YWxFeHByKHsgdHlwZTogJ2V4cHInLCByYXc6IHdhdGNoZXIud2hlbiB9LCBjdHgpKVxuICAgICAgaWYgKCFwYXNzZXMpIGNvbnRpbnVlXG4gICAgfVxuXG4gICAgLy8gRmlyZSB0aGUgYm9keSBhc3luY2hyb25vdXNseSBcdTIwMTQgZG9uJ3QgYmxvY2sgdGhlIHNpZ25hbCB3cml0ZSBwYXRoXG4gICAgZXhlY3V0ZSh3YXRjaGVyLmJvZHksIGN0eCkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFtMRVNdIEVycm9yIGluIG9uLXNpZ25hbCBcIiR7d2F0Y2hlci5zaWduYWx9XCI6YCwgZXJyKVxuICAgIH0pXG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgRGF0YXN0YXItY29tcGF0aWJsZSBlZmZlY3Qgc3Vic2NyaXB0aW9uIGZvciBvbmUgc2lnbmFsIHdhdGNoZXIuXG4gKiBVc2VkIGluIFBoYXNlIDYgd2hlbiBEYXRhc3RhciBpcyBwcmVzZW50LlxuICpcbiAqIEBwYXJhbSB3YXRjaGVyICAgVGhlIG9uLXNpZ25hbCBkZWNsYXJhdGlvblxuICogQHBhcmFtIGVmZmVjdCAgICBEYXRhc3RhcidzIGVmZmVjdCgpIGZ1bmN0aW9uXG4gKiBAcGFyYW0gZ2V0Q3R4ICAgIFJldHVybnMgdGhlIGN1cnJlbnQgZXhlY3V0aW9uIGNvbnRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpcmVTaWduYWxXYXRjaGVyVmlhRGF0YXN0YXIoXG4gIHdhdGNoZXI6IFNpZ25hbFdhdGNoZXJEZWNsLFxuICBlZmZlY3Q6IChmbjogKCkgPT4gdm9pZCkgPT4gdm9pZCxcbiAgZ2V0Q3R4OiAoKSA9PiBMRVNDb250ZXh0XG4pOiB2b2lkIHtcbiAgZWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBjdHggPSBnZXRDdHgoKVxuXG4gICAgLy8gUmVhZGluZyB0aGUgc2lnbmFsIGluc2lkZSBhbiBlZmZlY3QoKSBhdXRvLXN1YnNjcmliZXMgdXMgdG8gaXRcbiAgICBjb25zdCBzaWduYWxLZXkgPSB3YXRjaGVyLnNpZ25hbC5yZXBsYWNlKC9eXFwkLywgJycpXG4gICAgY3R4LmdldFNpZ25hbChzaWduYWxLZXkpIC8vIHN1YnNjcmlwdGlvbiBzaWRlLWVmZmVjdFxuXG4gICAgaWYgKHdhdGNoZXIud2hlbikge1xuICAgICAgY29uc3QgcGFzc2VzID0gQm9vbGVhbihldmFsRXhwcih7IHR5cGU6ICdleHByJywgcmF3OiB3YXRjaGVyLndoZW4gfSwgY3R4KSlcbiAgICAgIGlmICghcGFzc2VzKSByZXR1cm5cbiAgICB9XG5cbiAgICBleGVjdXRlKHdhdGNoZXIuYm9keSwgY3R4KS5jYXRjaChlcnIgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcihgW0xFU10gRXJyb3IgaW4gb24tc2lnbmFsIFwiJHt3YXRjaGVyLnNpZ25hbH1cIiAoRGF0YXN0YXIpOmAsIGVycilcbiAgICB9KVxuICB9KVxufVxuIiwgImltcG9ydCB7IENvbW1hbmRSZWdpc3RyeSB9IGZyb20gJ0BydW50aW1lL3JlZ2lzdHJ5LmpzJ1xuaW1wb3J0IHsgTW9kdWxlUmVnaXN0cnksIGxvYWRNb2R1bGUgfSBmcm9tICdAbW9kdWxlcy90eXBlcy5qcydcbmltcG9ydCB7IHJlYWRDb25maWcsIGxvZ0NvbmZpZyB9IGZyb20gJ0BwYXJzZXIvcmVhZGVyLmpzJ1xuaW1wb3J0IHsgcGFyc2VMRVMgfSBmcm9tICdAcGFyc2VyL2luZGV4LmpzJ1xuaW1wb3J0IHsgYnVpbGRDb250ZXh0LCByZWdpc3RlckNvbW1hbmRzLCB3aXJlRXZlbnRIYW5kbGVycywgZmlyZU9uTG9hZCwgdHlwZSBQYXJzZWRXaXJpbmcgfSBmcm9tICdAcnVudGltZS93aXJpbmcuanMnXG5pbXBvcnQgeyB3aXJlSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgfSBmcm9tICdAcnVudGltZS9vYnNlcnZlci5qcydcbmltcG9ydCB7IG5vdGlmeVNpZ25hbFdhdGNoZXJzLCB3aXJlU2lnbmFsV2F0Y2hlclZpYURhdGFzdGFyIH0gZnJvbSAnQHJ1bnRpbWUvc2lnbmFscy5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29uZmlnIH0gZnJvbSAnQHBhcnNlci9jb25maWcuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29udGV4dCB9IGZyb20gJ0BydW50aW1lL2V4ZWN1dG9yLmpzJ1xuXG5leHBvcnQgY2xhc3MgTG9jYWxFdmVudFNjcmlwdCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgcmVhZG9ubHkgY29tbWFuZHMgPSBuZXcgQ29tbWFuZFJlZ2lzdHJ5KClcbiAgcmVhZG9ubHkgbW9kdWxlcyAgPSBuZXcgTW9kdWxlUmVnaXN0cnkoKVxuXG4gIHByaXZhdGUgX2NvbmZpZzogIExFU0NvbmZpZyB8IG51bGwgID0gbnVsbFxuICBwcml2YXRlIF93aXJpbmc6ICBQYXJzZWRXaXJpbmcgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIF9jdHg6ICAgICBMRVNDb250ZXh0IHwgbnVsbCA9IG51bGxcblxuICAvLyBDbGVhbnVwIGZucyBhY2N1bXVsYXRlZCBkdXJpbmcgX2luaXQgXHUyMDE0IGFsbCBjYWxsZWQgaW4gX3RlYXJkb3duXG4gIHByaXZhdGUgX2NsZWFudXBzOiBBcnJheTwoKSA9PiB2b2lkPiA9IFtdXG5cbiAgLy8gU2ltcGxlIGZhbGxiYWNrIHNpZ25hbCBzdG9yZSAoRGF0YXN0YXIgYnJpZGdlIHJlcGxhY2VzIHJlYWRzL3dyaXRlcyBpbiBQaGFzZSA2KVxuICBwcml2YXRlIF9zaWduYWxzOiBNYXA8c3RyaW5nLCB1bmtub3duPiA9IG5ldyBNYXAoKVxuXG4gIC8vIERhdGFzdGFyIGJyaWRnZSAocG9wdWxhdGVkIGluIFBoYXNlIDYgdmlhIGF0dHJpYnV0ZSBwbHVnaW4pXG4gIHByaXZhdGUgX2RzRWZmZWN0OiAoKGZuOiAoKSA9PiB2b2lkKSA9PiB2b2lkKSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZFxuICBwcml2YXRlIF9kc1NpZ25hbDogKDxUPihuYW1lOiBzdHJpbmcsIGluaXQ/OiBUKSA9PiB7IHZhbHVlOiBUIH0pIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG5cbiAgZ2V0IGNvbmZpZygpOiAgTEVTQ29uZmlnIHwgbnVsbCAgICB7IHJldHVybiB0aGlzLl9jb25maWcgfVxuICBnZXQgd2lyaW5nKCk6ICBQYXJzZWRXaXJpbmcgfCBudWxsIHsgcmV0dXJuIHRoaXMuX3dpcmluZyB9XG4gIGdldCBjb250ZXh0KCk6IExFU0NvbnRleHQgfCBudWxsICAgeyByZXR1cm4gdGhpcy5fY3R4IH1cblxuICBzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpOiBzdHJpbmdbXSB7IHJldHVybiBbXSB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgcXVldWVNaWNyb3Rhc2soKCkgPT4gdGhpcy5faW5pdCgpKVxuICB9XG5cbiAgZGlzY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgdGhpcy5fdGVhcmRvd24oKVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEludGVybmFsIGxpZmVjeWNsZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwcml2YXRlIGFzeW5jIF9pbml0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBpbml0aWFsaXppbmcnLCB0aGlzLmlkIHx8ICcobm8gaWQpJylcblxuICAgIC8vIFBoYXNlIDE6IERPTSBcdTIxOTIgY29uZmlnXG4gICAgdGhpcy5fY29uZmlnID0gcmVhZENvbmZpZyh0aGlzKVxuICAgIGxvZ0NvbmZpZyh0aGlzLl9jb25maWcpXG5cbiAgICAvLyBQaGFzZSA4OiBsb2FkIG1vZHVsZXMgYmVmb3JlIHBhcnNpbmcgc28gcHJpbWl0aXZlIG5hbWVzIHJlc29sdmVcbiAgICBhd2FpdCB0aGlzLl9sb2FkTW9kdWxlcyh0aGlzLl9jb25maWcpXG5cbiAgICAvLyBQaGFzZSAyOiBwYXJzZSBib2R5IHN0cmluZ3MgXHUyMTkyIEFTVFxuICAgIHRoaXMuX3dpcmluZyA9IHRoaXMuX3BhcnNlQWxsKHRoaXMuX2NvbmZpZylcblxuICAgIC8vIFBoYXNlIDQ6IGJ1aWxkIGNvbnRleHQsIHJlZ2lzdGVyIGNvbW1hbmRzLCB3aXJlIGV2ZW50IGhhbmRsZXJzXG4gICAgdGhpcy5fY3R4ID0gYnVpbGRDb250ZXh0KFxuICAgICAgdGhpcyxcbiAgICAgIHRoaXMuY29tbWFuZHMsXG4gICAgICB0aGlzLm1vZHVsZXMsXG4gICAgICB7IGdldDogayA9PiB0aGlzLl9nZXRTaWduYWwoayksIHNldDogKGssIHYpID0+IHRoaXMuX3NldFNpZ25hbChrLCB2KSB9XG4gICAgKVxuXG4gICAgcmVnaXN0ZXJDb21tYW5kcyh0aGlzLl93aXJpbmcsIHRoaXMuY29tbWFuZHMpXG5cbiAgICB0aGlzLl9jbGVhbnVwcy5wdXNoKFxuICAgICAgd2lyZUV2ZW50SGFuZGxlcnModGhpcy5fd2lyaW5nLCB0aGlzLCAoKSA9PiB0aGlzLl9jdHghKVxuICAgIClcblxuICAgIC8vIFBoYXNlIDVhOiBJbnRlcnNlY3Rpb25PYnNlcnZlciBmb3Igb24tZW50ZXIgLyBvbi1leGl0XG4gICAgdGhpcy5fY2xlYW51cHMucHVzaChcbiAgICAgIHdpcmVJbnRlcnNlY3Rpb25PYnNlcnZlcihcbiAgICAgICAgdGhpcyxcbiAgICAgICAgdGhpcy5fd2lyaW5nLmxpZmVjeWNsZS5vbkVudGVyLFxuICAgICAgICB0aGlzLl93aXJpbmcubGlmZWN5Y2xlLm9uRXhpdCxcbiAgICAgICAgKCkgPT4gdGhpcy5fY3R4IVxuICAgICAgKVxuICAgIClcblxuICAgIC8vIFBoYXNlIDViOiBzaWduYWwgd2F0Y2hlcnNcbiAgICAvLyBJZiBEYXRhc3RhciBpcyBjb25uZWN0ZWQgdXNlIGl0cyByZWFjdGl2ZSBlZmZlY3QoKSBzeXN0ZW07XG4gICAgLy8gb3RoZXJ3aXNlIHRoZSBsb2NhbCBfc2V0U2lnbmFsIHBhdGggY2FsbHMgbm90aWZ5U2lnbmFsV2F0Y2hlcnMgZGlyZWN0bHkuXG4gICAgaWYgKHRoaXMuX2RzRWZmZWN0KSB7XG4gICAgICBmb3IgKGNvbnN0IHdhdGNoZXIgb2YgdGhpcy5fd2lyaW5nLndhdGNoZXJzKSB7XG4gICAgICAgIHdpcmVTaWduYWxXYXRjaGVyVmlhRGF0YXN0YXIod2F0Y2hlciwgdGhpcy5fZHNFZmZlY3QsICgpID0+IHRoaXMuX2N0eCEpXG4gICAgICB9XG4gICAgICBjb25zb2xlLmxvZyhgW0xFU10gd2lyZWQgJHt0aGlzLl93aXJpbmcud2F0Y2hlcnMubGVuZ3RofSBzaWduYWwgd2F0Y2hlcnMgdmlhIERhdGFzdGFyYClcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coYFtMRVNdIHdpcmVkICR7dGhpcy5fd2lyaW5nLndhdGNoZXJzLmxlbmd0aH0gc2lnbmFsIHdhdGNoZXJzIChsb2NhbCBmYWxsYmFjaylgKVxuICAgIH1cblxuICAgIC8vIFBoYXNlIDY6IERhdGFzdGFyIGJyaWRnZSBmdWxsIGFjdGl2YXRpb24gXHUyMDE0IGNvbWluZyBuZXh0XG5cbiAgICAvLyBvbi1sb2FkIGZpcmVzIGxhc3QsIGFmdGVyIGV2ZXJ5dGhpbmcgaXMgd2lyZWRcbiAgICBhd2FpdCBmaXJlT25Mb2FkKHRoaXMuX3dpcmluZywgKCkgPT4gdGhpcy5fY3R4ISlcblxuICAgIGNvbnNvbGUubG9nKCdbTEVTXSByZWFkeTonLCB0aGlzLmlkIHx8ICcobm8gaWQpJylcbiAgfVxuXG4gIHByaXZhdGUgX3RlYXJkb3duKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBkaXNjb25uZWN0ZWQnLCB0aGlzLmlkIHx8ICcobm8gaWQpJylcbiAgICBmb3IgKGNvbnN0IGNsZWFudXAgb2YgdGhpcy5fY2xlYW51cHMpIGNsZWFudXAoKVxuICAgIHRoaXMuX2NsZWFudXBzID0gW11cbiAgICB0aGlzLl9jb25maWcgICA9IG51bGxcbiAgICB0aGlzLl93aXJpbmcgICA9IG51bGxcbiAgICB0aGlzLl9jdHggICAgICA9IG51bGxcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBTaWduYWwgc3RvcmUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBfZ2V0U2lnbmFsKG5hbWU6IHN0cmluZyk6IHVua25vd24ge1xuICAgIC8vIFBoYXNlIDY6IHByZWZlciBEYXRhc3RhciBzaWduYWwgdHJlZSB3aGVuIGJyaWRnZSBpcyBjb25uZWN0ZWRcbiAgICBpZiAodGhpcy5fZHNTaWduYWwpIHtcbiAgICAgIHRyeSB7IHJldHVybiB0aGlzLl9kc1NpZ25hbChuYW1lKS52YWx1ZSB9IGNhdGNoIHsgLyogZmFsbCB0aHJvdWdoICovIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3NpZ25hbHMuZ2V0KG5hbWUpXG4gIH1cblxuICBwcml2YXRlIF9zZXRTaWduYWwobmFtZTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIGNvbnN0IHByZXYgPSB0aGlzLl9zaWduYWxzLmdldChuYW1lKVxuICAgIHRoaXMuX3NpZ25hbHMuc2V0KG5hbWUsIHZhbHVlKVxuICAgIGNvbnNvbGUubG9nKGBbTEVTXSAkJHtuYW1lfSA9YCwgdmFsdWUpXG5cbiAgICAvLyBQaGFzZSA2OiB3cml0ZSB0aHJvdWdoIHRvIERhdGFzdGFyJ3MgcmVhY3RpdmUgZ3JhcGhcbiAgICBpZiAodGhpcy5fZHNTaWduYWwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHNpZyA9IHRoaXMuX2RzU2lnbmFsPHVua25vd24+KG5hbWUsIHZhbHVlKVxuICAgICAgICBzaWcudmFsdWUgPSB2YWx1ZVxuICAgICAgfSBjYXRjaCB7IC8qIHNpZ25hbCBtYXkgbm90IGV4aXN0IGluIERhdGFzdGFyIHlldCAqLyB9XG4gICAgfVxuXG4gICAgLy8gUGhhc2UgNWI6IG5vdGlmeSBsb2NhbCBzaWduYWwgd2F0Y2hlcnMgKGZhbGxiYWNrIHBhdGggd2hlbiBEYXRhc3RhciBhYnNlbnQpXG4gICAgaWYgKHByZXYgIT09IHZhbHVlICYmIHRoaXMuX3dpcmluZyAmJiB0aGlzLl9jdHggJiYgIXRoaXMuX2RzRWZmZWN0KSB7XG4gICAgICBub3RpZnlTaWduYWxXYXRjaGVycyhuYW1lLCB0aGlzLl93aXJpbmcud2F0Y2hlcnMsICgpID0+IHRoaXMuX2N0eCEpXG4gICAgfVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIE1vZHVsZSBsb2FkaW5nIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgYXN5bmMgX2xvYWRNb2R1bGVzKGNvbmZpZzogTEVTQ29uZmlnKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKGNvbmZpZy5tb2R1bGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICBjb25maWcubW9kdWxlcy5tYXAoZGVjbCA9PlxuICAgICAgICBsb2FkTW9kdWxlKHRoaXMubW9kdWxlcywge1xuICAgICAgICAgIC4uLihkZWNsLnR5cGUgPyB7IHR5cGU6IGRlY2wudHlwZSB9IDoge30pLFxuICAgICAgICAgIC4uLihkZWNsLnNyYyAgPyB7IHNyYzogIGRlY2wuc3JjICB9IDoge30pLFxuICAgICAgICB9KS5jYXRjaChlcnIgPT4gY29uc29sZS53YXJuKCdbTEVTXSBNb2R1bGUgbG9hZCBmYWlsZWQ6JywgZXJyKSlcbiAgICAgIClcbiAgICApXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgUGFyc2UgYWxsIGJvZGllcyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwcml2YXRlIF9wYXJzZUFsbChjb25maWc6IExFU0NvbmZpZyk6IFBhcnNlZFdpcmluZyB7XG4gICAgbGV0IG9rID0gMCwgZmFpbCA9IDBcblxuICAgIGNvbnN0IHRyeVBhcnNlID0gKGJvZHk6IHN0cmluZywgbGFiZWw6IHN0cmluZyk6IExFU05vZGUgPT4ge1xuICAgICAgdHJ5IHsgb2srKzsgcmV0dXJuIHBhcnNlTEVTKGJvZHkpIH1cbiAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgIGZhaWwrK1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbTEVTXSBQYXJzZSBlcnJvciBpbiAke2xhYmVsfTpgLCBlKVxuICAgICAgICByZXR1cm4geyB0eXBlOiAnZXhwcicsIHJhdzogJycgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHdpcmluZzogUGFyc2VkV2lyaW5nID0ge1xuICAgICAgY29tbWFuZHM6IGNvbmZpZy5jb21tYW5kcy5tYXAoZCA9PiAoe1xuICAgICAgICBuYW1lOiBkLm5hbWUsIGd1YXJkOiBkLmd1YXJkLCBhcmdzUmF3OiBkLmFyZ3NSYXcsXG4gICAgICAgIGJvZHk6IHRyeVBhcnNlKGQuYm9keSwgYGNvbW1hbmQgXCIke2QubmFtZX1cImApLFxuICAgICAgfSkpLFxuICAgICAgaGFuZGxlcnM6IGNvbmZpZy5vbkV2ZW50Lm1hcChkID0+ICh7XG4gICAgICAgIGV2ZW50OiBkLm5hbWUsXG4gICAgICAgIGJvZHk6IHRyeVBhcnNlKGQuYm9keSwgYG9uLWV2ZW50IFwiJHtkLm5hbWV9XCJgKSxcbiAgICAgIH0pKSxcbiAgICAgIHdhdGNoZXJzOiBjb25maWcub25TaWduYWwubWFwKGQgPT4gKHtcbiAgICAgICAgc2lnbmFsOiBkLm5hbWUsIHdoZW46IGQud2hlbixcbiAgICAgICAgYm9keTogdHJ5UGFyc2UoZC5ib2R5LCBgb24tc2lnbmFsIFwiJHtkLm5hbWV9XCJgKSxcbiAgICAgIH0pKSxcbiAgICAgIGxpZmVjeWNsZToge1xuICAgICAgICBvbkxvYWQ6ICBjb25maWcub25Mb2FkLm1hcChkID0+IHRyeVBhcnNlKGQuYm9keSwgJ29uLWxvYWQnKSksXG4gICAgICAgIG9uRW50ZXI6IGNvbmZpZy5vbkVudGVyLm1hcChkID0+ICh7IHdoZW46IGQud2hlbiwgYm9keTogdHJ5UGFyc2UoZC5ib2R5LCAnb24tZW50ZXInKSB9KSksXG4gICAgICAgIG9uRXhpdDogIGNvbmZpZy5vbkV4aXQubWFwKGQgPT4gdHJ5UGFyc2UoZC5ib2R5LCAnb24tZXhpdCcpKSxcbiAgICAgIH0sXG4gICAgfVxuXG4gICAgY29uc3QgdG90YWwgPSBvayArIGZhaWxcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gcGFyc2VyOiAke29rfS8ke3RvdGFsfSBib2RpZXMgcGFyc2VkIHN1Y2Nlc3NmdWxseSR7ZmFpbCA+IDAgPyBgICgke2ZhaWx9IGVycm9ycylgIDogJyd9YClcbiAgICByZXR1cm4gd2lyaW5nXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgRGF0YXN0YXIgYnJpZGdlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIGNvbm5lY3REYXRhc3RhcihmbnM6IHtcbiAgICBlZmZlY3Q6IChmbjogKCkgPT4gdm9pZCkgPT4gdm9pZFxuICAgIHNpZ25hbDogPFQ+KG5hbWU6IHN0cmluZywgaW5pdD86IFQpID0+IHsgdmFsdWU6IFQgfVxuICB9KTogdm9pZCB7XG4gICAgdGhpcy5fZHNFZmZlY3QgPSBmbnMuZWZmZWN0XG4gICAgdGhpcy5fZHNTaWduYWwgPSBmbnMuc2lnbmFsXG4gICAgY29uc29sZS5sb2coJ1tMRVNdIERhdGFzdGFyIGJyaWRnZSBjb25uZWN0ZWQnLCB0aGlzLmlkKVxuICB9XG5cbiAgZGlzY29ubmVjdERhdGFzdGFyKCk6IHZvaWQge1xuICAgIHRoaXMuX2RzRWZmZWN0ID0gdW5kZWZpbmVkXG4gICAgdGhpcy5fZHNTaWduYWwgPSB1bmRlZmluZWRcbiAgfVxuXG4gIGdldCBkc0VmZmVjdCgpIHsgcmV0dXJuIHRoaXMuX2RzRWZmZWN0IH1cbiAgZ2V0IGRzU2lnbmFsKCkgIHsgcmV0dXJuIHRoaXMuX2RzU2lnbmFsIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgUHVibGljIEFQSSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKiogRmlyZSBhIG5hbWVkIGxvY2FsIGV2ZW50IGludG8gdGhpcyBMRVMgaW5zdGFuY2UgZnJvbSBvdXRzaWRlLiAqL1xuICBmaXJlKGV2ZW50OiBzdHJpbmcsIHBheWxvYWQ6IHVua25vd25bXSA9IFtdKTogdm9pZCB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudChldmVudCwge1xuICAgICAgZGV0YWlsOiB7IHBheWxvYWQgfSwgYnViYmxlczogZmFsc2UsIGNvbXBvc2VkOiBmYWxzZSxcbiAgICB9KSlcbiAgfVxuXG4gIC8qKiBDYWxsIGEgY29tbWFuZCBieSBuYW1lIGZyb20gb3V0c2lkZSAoZS5nLiBicm93c2VyIGNvbnNvbGUsIHRlc3RzKS4gKi9cbiAgYXN5bmMgY2FsbChjb21tYW5kOiBzdHJpbmcsIGFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge30pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuX2N0eCkgeyBjb25zb2xlLndhcm4oJ1tMRVNdIG5vdCBpbml0aWFsaXplZCB5ZXQnKTsgcmV0dXJuIH1cbiAgICBjb25zdCB7IHJ1bkNvbW1hbmQgfSA9IGF3YWl0IGltcG9ydCgnQHJ1bnRpbWUvZXhlY3V0b3IuanMnKVxuICAgIGF3YWl0IHJ1bkNvbW1hbmQoY29tbWFuZCwgYXJncywgdGhpcy5fY3R4KVxuICB9XG5cbiAgLyoqIFJlYWQgYSBzaWduYWwgdmFsdWUgZGlyZWN0bHkgKGZvciBkZWJ1Z2dpbmcpLiAqL1xuICBzaWduYWwobmFtZTogc3RyaW5nKTogdW5rbm93biB7XG4gICAgcmV0dXJuIHRoaXMuX2dldFNpZ25hbChuYW1lKVxuICB9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnbG9jYWwtZXZlbnQtc2NyaXB0JywgTG9jYWxFdmVudFNjcmlwdClcbiIsICIvKipcbiAqIDxsb2NhbC1jb21tYW5kPiBcdTIwMTQgZGVmaW5lcyBhIG5hbWVkLCBjYWxsYWJsZSBjb21tYW5kIHdpdGhpbiBhIDxsb2NhbC1ldmVudC1zY3JpcHQ+LlxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIG5hbWUgICAgUmVxdWlyZWQuIENvbW1hbmQgbmFtZSwgY29sb24tbmFtZXNwYWNlZDogXCJmZWVkOmZldGNoXCJcbiAqICAgYXJncyAgICBPcHRpb25hbC4gVHlwZWQgYXJndW1lbnQgbGlzdDogXCJbZnJvbTpzdHIgIHRvOnN0cl1cIlxuICogICBndWFyZCAgIE9wdGlvbmFsLiBKUyBleHByZXNzaW9uIFx1MjAxNCBmYWxzeSA9IHNpbGVudCBuby1vcCwgbm8gcmVzY3VlL2FmdGVyd2FyZHNcbiAqICAgZG8gICAgICBSZXF1aXJlZC4gTEVTIGJvZHkgKGJhY2t0aWNrLXF1b3RlZCBmb3IgbXVsdGktbGluZSlcbiAqXG4gKiBUaGlzIGVsZW1lbnQgaXMgcHVyZWx5IGRlY2xhcmF0aXZlIFx1MjAxNCBpdCBob2xkcyBkYXRhLlxuICogVGhlIGhvc3QgPGxvY2FsLWV2ZW50LXNjcmlwdD4gcmVhZHMgaXQgZHVyaW5nIFBoYXNlIDEgYW5kIHJlZ2lzdGVyc1xuICogdGhlIHBhcnNlZCBDb21tYW5kRGVmIGluIGl0cyBDb21tYW5kUmVnaXN0cnkuXG4gKlxuICogTm90ZTogPGNvbW1hbmQ+IHdhcyBhIGRlcHJlY2F0ZWQgSFRNTDUgZWxlbWVudCBcdTIwMTQgd2UgdXNlIDxsb2NhbC1jb21tYW5kPlxuICogdG8gc2F0aXNmeSB0aGUgY3VzdG9tIGVsZW1lbnQgaHlwaGVuIHJlcXVpcmVtZW50IGFuZCBhdm9pZCB0aGUgY29sbGlzaW9uLlxuICovXG5leHBvcnQgY2xhc3MgTG9jYWxDb21tYW5kIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgQXR0cmlidXRlIGFjY2Vzc29ycyAodHlwZWQsIHRyaW1tZWQpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIGdldCBjb21tYW5kTmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIC8qKiBSYXcgYXJncyBzdHJpbmcgZS5nLiBcIltmcm9tOnN0ciAgdG86c3RyXVwiIFx1MjAxNCBwYXJzZWQgYnkgUGhhc2UgMiAqL1xuICBnZXQgYXJnc1JhdygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnYXJncycpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIC8qKiBHdWFyZCBleHByZXNzaW9uIHN0cmluZyBcdTIwMTQgZXZhbHVhdGVkIGJ5IHJ1bnRpbWUgYmVmb3JlIGV4ZWN1dGlvbiAqL1xuICBnZXQgZ3VhcmRFeHByKCk6IHN0cmluZyB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnZ3VhcmQnKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIC8qKiBSYXcgTEVTIGJvZHkgXHUyMDE0IG1heSBiZSBiYWNrdGljay13cmFwcGVkIGZvciBtdWx0aS1saW5lICovXG4gIGdldCBkb0JvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ2RvJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgLy8gUGhhc2UgMDogdmVyaWZ5IGVsZW1lbnQgaXMgcmVjb2duaXplZC5cbiAgICBjb25zb2xlLmxvZygnW0xFU10gPGxvY2FsLWNvbW1hbmQ+IHJlZ2lzdGVyZWQ6JywgdGhpcy5jb21tYW5kTmFtZSB8fCAnKHVubmFtZWQpJylcbiAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ2xvY2FsLWNvbW1hbmQnLCBMb2NhbENvbW1hbmQpXG4iLCAiLyoqXG4gKiA8b24tZXZlbnQ+IFx1MjAxNCBzdWJzY3JpYmVzIHRvIGEgbmFtZWQgQ3VzdG9tRXZlbnQgZGlzcGF0Y2hlZCB3aXRoaW4gdGhlIExFUyBob3N0LlxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIG5hbWUgICAgUmVxdWlyZWQuIEV2ZW50IG5hbWU6IFwiZmVlZDppbml0XCIsIFwiaXRlbTpkaXNtaXNzZWRcIlxuICogICBoYW5kbGUgIFJlcXVpcmVkLiBMRVMgYm9keSBcdTIwMTQgc2luZ2xlLWxpbmUgKG5vIGJhY2t0aWNrcykgb3IgbXVsdGktbGluZSAoYmFja3RpY2tzKVxuICpcbiAqIFBoYXNlIDQgd2lyZXMgYSBDdXN0b21FdmVudCBsaXN0ZW5lciBvbiB0aGUgaG9zdCBlbGVtZW50LlxuICogRXZlbnRzIGZpcmVkIGJ5IGBlbWl0YCBuZXZlciBidWJibGU7IG9ubHkgaGFuZGxlcnMgd2l0aGluIHRoZSBzYW1lXG4gKiA8bG9jYWwtZXZlbnQtc2NyaXB0PiBzZWUgdGhlbS4gVXNlIGBicm9hZGNhc3RgIHRvIGNyb3NzIHRoZSBib3VuZGFyeS5cbiAqL1xuZXhwb3J0IGNsYXNzIE9uRXZlbnQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIGdldCBldmVudE5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICAvKiogUmF3IExFUyBoYW5kbGUgYm9keSAqL1xuICBnZXQgaGFuZGxlQm9keSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnaGFuZGxlJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxvbi1ldmVudD4gcmVnaXN0ZXJlZDonLCB0aGlzLmV2ZW50TmFtZSB8fCAnKHVubmFtZWQpJylcbiAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ29uLWV2ZW50JywgT25FdmVudClcbiIsICIvKipcbiAqIDxvbi1zaWduYWw+IFx1MjAxNCByZWFjdHMgd2hlbmV2ZXIgYSBuYW1lZCBEYXRhc3RhciBzaWduYWwgY2hhbmdlcyB2YWx1ZS5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBuYW1lICAgIFJlcXVpcmVkLiBTaWduYWwgcmVmZXJlbmNlOiBcIiRmZWVkU3RhdGVcIiwgXCIkZmVlZEl0ZW1zXCJcbiAqICAgd2hlbiAgICBPcHRpb25hbC4gR3VhcmQgZXhwcmVzc2lvbiBcdTIwMTQgb25seSBmaXJlcyBoYW5kbGUgd2hlbiB0cnV0aHlcbiAqICAgaGFuZGxlICBSZXF1aXJlZC4gTEVTIGJvZHlcbiAqXG4gKiBQaGFzZSA2IHdpcmVzIHRoaXMgdG8gRGF0YXN0YXIncyBlZmZlY3QoKSBzeXN0ZW0uXG4gKiBVbnRpbCBEYXRhc3RhciBpcyBjb25uZWN0ZWQsIGZhbGxzIGJhY2sgdG8gcG9sbGluZyAoUGhhc2UgNiBkZWNpZGVzKS5cbiAqXG4gKiBUaGUgYHdoZW5gIGd1YXJkIGlzIHJlLWV2YWx1YXRlZCBvbiBldmVyeSBzaWduYWwgY2hhbmdlLlxuICogR3VhcmQgZmFpbHVyZSBpcyBub3QgYW4gZXJyb3IgXHUyMDE0IHRoZSBoYW5kbGUgc2ltcGx5IGRvZXMgbm90IHJ1bi5cbiAqL1xuZXhwb3J0IGNsYXNzIE9uU2lnbmFsIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAvKiogU2lnbmFsIG5hbWUgaW5jbHVkaW5nICQgcHJlZml4OiBcIiRmZWVkU3RhdGVcIiAqL1xuICBnZXQgc2lnbmFsTmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIC8qKiBTaWduYWwgbmFtZSB3aXRob3V0ICQgcHJlZml4LCBmb3IgRGF0YXN0YXIgQVBJIGNhbGxzICovXG4gIGdldCBzaWduYWxLZXkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5zaWduYWxOYW1lLnJlcGxhY2UoL15cXCQvLCAnJylcbiAgfVxuXG4gIGdldCB3aGVuRXhwcigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3doZW4nKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIGdldCBoYW5kbGVCb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdoYW5kbGUnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPG9uLXNpZ25hbD4gcmVnaXN0ZXJlZDonLCB0aGlzLnNpZ25hbE5hbWUgfHwgJyh1bm5hbWVkKScpXG4gIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1zaWduYWwnLCBPblNpZ25hbClcbiIsICIvKipcbiAqIDxvbi1sb2FkPiBcdTIwMTQgZmlyZXMgaXRzIGBydW5gIGJvZHkgb25jZSB3aGVuIHRoZSBob3N0IGNvbm5lY3RzIHRvIHRoZSBET00uXG4gKlxuICogVGltaW5nOiBpZiBkb2N1bWVudC5yZWFkeVN0YXRlID09PSAnY29tcGxldGUnLCBmaXJlcyBpbW1lZGlhdGVseSBpblxuICogY29ubmVjdGVkQ2FsbGJhY2sgKHZpYSBxdWV1ZU1pY3JvdGFzaykuIE90aGVyd2lzZSB3YWl0cyBmb3IgRE9NQ29udGVudExvYWRlZC5cbiAqXG4gKiBSdWxlOiBsaWZlY3ljbGUgaG9va3MgYWx3YXlzIGZpcmUgZXZlbnRzIChgZW1pdGApLCBuZXZlciBjYWxsIGNvbW1hbmRzIGRpcmVjdGx5LlxuICogVGhpcyBrZWVwcyB0aGUgc3lzdGVtIHRyYWNlYWJsZSBcdTIwMTQgZXZlcnkgY29tbWFuZCBpbnZvY2F0aW9uIGhhcyBhbiBldmVudCBpbiBpdHMgaGlzdG9yeS5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBydW4gICBSZXF1aXJlZC4gU2luZ2xlLWxpbmUgTEVTIGJvZHkgKHVzdWFsbHkganVzdCBgZW1pdCBldmVudDpuYW1lYClcbiAqL1xuZXhwb3J0IGNsYXNzIE9uTG9hZCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgZ2V0IHJ1bkJvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8b24tbG9hZD4gcmVnaXN0ZXJlZCwgcnVuOicsIHRoaXMucnVuQm9keSlcbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiA8b24tZW50ZXI+IFx1MjAxNCBmaXJlcyB3aGVuIHRoZSBob3N0IDxsb2NhbC1ldmVudC1zY3JpcHQ+IGVudGVycyB0aGUgdmlld3BvcnQuXG4gKlxuICogVXNlcyBhIHNpbmdsZSBJbnRlcnNlY3Rpb25PYnNlcnZlciBzaGFyZWQgYWNyb3NzIGFsbCA8b24tZW50ZXI+Lzxvbi1leGl0PlxuICogY2hpbGRyZW4gb2YgdGhlIHNhbWUgaG9zdCAoUGhhc2UgNSBjcmVhdGVzIGl0IG9uIHRoZSBob3N0IGVsZW1lbnQpLlxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIHdoZW4gIE9wdGlvbmFsLiBHdWFyZCBleHByZXNzaW9uIFx1MjAxNCBvbmx5IGZpcmVzIHJ1biB3aGVuIHRydXRoeS5cbiAqICAgICAgICAgIFBhdHRlcm46IGB3aGVuPVwiJGZlZWRTdGF0ZSA9PSAncGF1c2VkJ1wiYFxuICogICBydW4gICBSZXF1aXJlZC4gU2luZ2xlLWxpbmUgTEVTIGJvZHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBPbkVudGVyIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBnZXQgd2hlbkV4cHIoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCd3aGVuJyk/LnRyaW0oKSA/PyBudWxsXG4gIH1cblxuICBnZXQgcnVuQm9keSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxvbi1lbnRlcj4gcmVnaXN0ZXJlZCwgd2hlbjonLCB0aGlzLndoZW5FeHByID8/ICdhbHdheXMnKVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIDxvbi1leGl0PiBcdTIwMTQgZmlyZXMgd2hlbiB0aGUgaG9zdCA8bG9jYWwtZXZlbnQtc2NyaXB0PiBleGl0cyB0aGUgdmlld3BvcnQuXG4gKlxuICogTm8gYHdoZW5gIGd1YXJkIFx1MjAxNCBleGl0IGFsd2F5cyBmaXJlcyB1bmNvbmRpdGlvbmFsbHkuXG4gKiAoSWYgeW91IG5lZWQgY29uZGl0aW9uYWwgZXhpdCBiZWhhdmlvciwgcHV0IHRoZSBjb25kaXRpb24gaW4gdGhlIGhhbmRsZXIuKVxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIHJ1biAgIFJlcXVpcmVkLiBTaW5nbGUtbGluZSBMRVMgYm9keS5cbiAqL1xuZXhwb3J0IGNsYXNzIE9uRXhpdCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgZ2V0IHJ1bkJvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8b24tZXhpdD4gcmVnaXN0ZXJlZCwgcnVuOicsIHRoaXMucnVuQm9keSlcbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgUmVnaXN0cmF0aW9uIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ29uLWxvYWQnLCAgT25Mb2FkKVxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1lbnRlcicsIE9uRW50ZXIpXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ29uLWV4aXQnLCAgT25FeGl0KVxuIiwgIi8qKlxuICogPHVzZS1tb2R1bGU+IFx1MjAxNCBkZWNsYXJlcyBhIHZvY2FidWxhcnkgZXh0ZW5zaW9uIGF2YWlsYWJsZSB0byA8bG9jYWwtY29tbWFuZD4gYm9kaWVzLlxuICpcbiAqIE11c3QgYXBwZWFyIGJlZm9yZSBhbnkgPGxvY2FsLWNvbW1hbmQ+IGluIHRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0Pi5cbiAqIFRoZSBob3N0IHJlYWRzIDx1c2UtbW9kdWxlPiBjaGlsZHJlbiBmaXJzdCAoUGhhc2UgOCkgYW5kIHJlZ2lzdGVyc1xuICogdGhlaXIgcHJpbWl0aXZlcyBpbnRvIGl0cyBNb2R1bGVSZWdpc3RyeSBiZWZvcmUgcGFyc2luZyBjb21tYW5kIGJvZGllcy5cbiAqXG4gKiBBdHRyaWJ1dGVzIChpbmRlcGVuZGVudCwgY29tYmluYWJsZSk6XG4gKiAgIHR5cGUgICBCdWlsdC1pbiBtb2R1bGUgbmFtZTogXCJhbmltYXRpb25cIlxuICogICBzcmMgICAgVVJML3BhdGggdG8gYSB1c2VybGFuZCBtb2R1bGUgRVMgbW9kdWxlOiAgXCIuL3Njcm9sbC1lZmZlY3RzLmpzXCJcbiAqICAgICAgICAgIFRoZSBtb2R1bGUgbXVzdCBleHBvcnQgYSBkZWZhdWx0IGNvbmZvcm1pbmcgdG8gTEVTTW9kdWxlOlxuICogICAgICAgICAgeyBuYW1lOiBzdHJpbmcsIHByaW1pdGl2ZXM6IFJlY29yZDxzdHJpbmcsIExFU1ByaW1pdGl2ZT4gfVxuICpcbiAqIEV4YW1wbGVzOlxuICogICA8dXNlLW1vZHVsZSB0eXBlPVwiYW5pbWF0aW9uXCI+PC91c2UtbW9kdWxlPlxuICogICA8dXNlLW1vZHVsZSBzcmM9XCIuL3Njcm9sbC1lZmZlY3RzLmpzXCI+PC91c2UtbW9kdWxlPlxuICogICA8dXNlLW1vZHVsZSBzcmM9XCIuL3NwcmluZy1waHlzaWNzLmpzXCI+PC91c2UtbW9kdWxlPlxuICpcbiAqIHR5cGU9IGFuZCBzcmM9IG1heSBhcHBlYXIgdG9nZXRoZXIgb24gb25lIGVsZW1lbnQgaWYgdGhlIHVzZXJsYW5kIG1vZHVsZVxuICogd2FudHMgdG8gZGVjbGFyZSBpdHMgdHlwZSBoaW50IGZvciB0b29saW5nIChub3QgY3VycmVudGx5IHJlcXVpcmVkKS5cbiAqL1xuZXhwb3J0IGNsYXNzIFVzZU1vZHVsZSBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgLyoqIEJ1aWx0LWluIG1vZHVsZSB0eXBlIGUuZy4gXCJhbmltYXRpb25cIiAqL1xuICBnZXQgbW9kdWxlVHlwZSgpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3R5cGUnKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIC8qKiBVc2VybGFuZCBtb2R1bGUgVVJMIGUuZy4gXCIuL3Njcm9sbC1lZmZlY3RzLmpzXCIgKi9cbiAgZ2V0IG1vZHVsZVNyYygpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3NyYycpPy50cmltKCkgPz8gbnVsbFxuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc3QgZGVzYyA9IHRoaXMubW9kdWxlVHlwZVxuICAgICAgPyBgdHlwZT1cIiR7dGhpcy5tb2R1bGVUeXBlfVwiYFxuICAgICAgOiB0aGlzLm1vZHVsZVNyY1xuICAgICAgICA/IGBzcmM9XCIke3RoaXMubW9kdWxlU3JjfVwiYFxuICAgICAgICA6ICcobm8gdHlwZSBvciBzcmMpJ1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8dXNlLW1vZHVsZT4gZGVjbGFyZWQ6JywgZGVzYylcbiAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3VzZS1tb2R1bGUnLCBVc2VNb2R1bGUpXG4iLCAiLyoqXG4gKiBQaGFzZSA2OiBEYXRhc3RhciBhdHRyaWJ1dGUgcGx1Z2luXG4gKlxuICogUmVnaXN0ZXJzIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGFzIGEgRGF0YXN0YXIgYXR0cmlidXRlIHBsdWdpbiBzbyB0aGF0OlxuICpcbiAqICAgMS4gRGF0YXN0YXIncyBlZmZlY3QoKSBhbmQgc2lnbmFsKCkgcHJpbWl0aXZlcyBhcmUgaGFuZGVkIHRvIHRoZSBob3N0XG4gKiAgICAgIGVsZW1lbnQsIGVuYWJsaW5nIHByb3BlciByZWFjdGl2ZSBzaWduYWwgd2F0Y2hpbmcgdmlhIHRoZSBkZXBlbmRlbmN5XG4gKiAgICAgIGdyYXBoIHJhdGhlciB0aGFuIG1hbnVhbCBub3RpZmljYXRpb24uXG4gKlxuICogICAyLiBTaWduYWwgd3JpdGVzIGZyb20gYHNldCAkeCB0byB5YCBpbiBMRVMgcHJvcGFnYXRlIGludG8gRGF0YXN0YXInc1xuICogICAgICByb290IG9iamVjdCBzbyBkYXRhLXRleHQsIGRhdGEtc2hvdywgZXRjLiB1cGRhdGUgcmVhY3RpdmVseS5cbiAqXG4gKiAgIDMuICQtcHJlZml4ZWQgc2lnbmFscyBpbiBMRVMgZXhwcmVzc2lvbnMgcmVzb2x2ZSBmcm9tIERhdGFzdGFyJ3Mgcm9vdCxcbiAqICAgICAgZ2l2aW5nIExFUyBmdWxsIHJlYWQgYWNjZXNzIHRvIGFsbCBEYXRhc3RhciBzdGF0ZS5cbiAqXG4gKiAgIDQuIFNpZ25hbCB3YXRjaGVycyBvbi1zaWduYWwgYXJlIHJlLXdpcmVkIHRocm91Z2ggRGF0YXN0YXIncyBlZmZlY3QoKVxuICogICAgICBzeXN0ZW0gZm9yIHByb3BlciBiYXRjaGluZyBhbmQgZGVkdXBsaWNhdGlvbi5cbiAqXG4gKiBMRVMgd29ya3Mgd2l0aG91dCBEYXRhc3RhciAoc3RhbmRhbG9uZSBtb2RlKS4gVGhlIGJyaWRnZSBpcyBwdXJlbHkgYWRkaXRpdmUuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBMb2NhbEV2ZW50U2NyaXB0IH0gZnJvbSAnQGVsZW1lbnRzL0xvY2FsRXZlbnRTY3JpcHQuanMnXG5pbXBvcnQgeyB3aXJlU2lnbmFsV2F0Y2hlclZpYURhdGFzdGFyIH0gZnJvbSAnQHJ1bnRpbWUvc2lnbmFscy5qcydcblxubGV0IGJyaWRnZVJlZ2lzdGVyZWQgPSBmYWxzZVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVnaXN0ZXJEYXRhc3RhckJyaWRnZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKGJyaWRnZVJlZ2lzdGVyZWQpIHJldHVyblxuXG4gIHRyeSB7XG4gICAgY29uc3QgZGF0YXN0YXIgPSBhd2FpdCBpbXBvcnQoJ2RhdGFzdGFyJylcbiAgICBjb25zdCB7IGF0dHJpYnV0ZSB9ID0gZGF0YXN0YXJcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBSZWdpc3RlciBhcyBhIERhdGFzdGFyIGF0dHJpYnV0ZSBwbHVnaW4gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgLy8gTWF0Y2hlcyBlbGVtZW50cyB3aXRoIGEgYGRhdGEtbG9jYWwtZXZlbnQtc2NyaXB0YCBhdHRyaWJ1dGUgT1IgKHZpYVxuICAgIC8vIG5hbWUgbWF0Y2hpbmcpIHRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBjdXN0b20gZWxlbWVudCBpdHNlbGYgd2hlblxuICAgIC8vIERhdGFzdGFyIHNjYW5zIHRoZSBET00uXG4gICAgLy9cbiAgICAvLyBUaGUgbmFtZSAnbG9jYWwtZXZlbnQtc2NyaXB0JyBjYXVzZXMgRGF0YXN0YXIgdG8gYXBwbHkgdGhpcyBwbHVnaW5cbiAgICAvLyB0byBhbnkgZWxlbWVudCB3aXRoIGRhdGEtbG9jYWwtZXZlbnQtc2NyaXB0PVwiLi4uXCIgaW4gdGhlIERPTS5cbiAgICAvLyBXZSBhbHNvIHBhdGNoIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGRpcmVjdGx5IGluIHRoZSBNdXRhdGlvbk9ic2VydmVyXG4gICAgLy8gcGF0aCB2aWEgdGhlIGhvc3QgZWxlbWVudCdzIGNvbm5lY3RlZENhbGxiYWNrLlxuICAgIGF0dHJpYnV0ZSh7XG4gICAgICBuYW1lOiAnbG9jYWwtZXZlbnQtc2NyaXB0JyxcbiAgICAgIHJlcXVpcmVtZW50OiB7XG4gICAgICAgIGtleTogJ2RlbmllZCcsXG4gICAgICAgIHZhbHVlOiAnZGVuaWVkJyxcbiAgICAgIH0sXG4gICAgICBhcHBseSh7IGVsLCBlZmZlY3QsIHNpZ25hbCB9KSB7XG4gICAgICAgIGNvbnN0IGhvc3QgPSBlbCBhcyBMb2NhbEV2ZW50U2NyaXB0XG5cbiAgICAgICAgLy8gUGhhc2UgNmE6IGhhbmQgRGF0YXN0YXIncyByZWFjdGl2ZSBwcmltaXRpdmVzIHRvIHRoZSBob3N0XG4gICAgICAgIGhvc3QuY29ubmVjdERhdGFzdGFyKHsgZWZmZWN0LCBzaWduYWwgfSlcblxuICAgICAgICAvLyBQaGFzZSA2YjogaWYgdGhlIGhvc3QgaXMgYWxyZWFkeSBpbml0aWFsaXplZCAod2lyaW5nIHJhbiBiZWZvcmVcbiAgICAgICAgLy8gRGF0YXN0YXIgYXR0cmlidXRlIHBsdWdpbiBmaXJlZCksIHJlLXdpcmUgc2lnbmFsIHdhdGNoZXJzIHRocm91Z2hcbiAgICAgICAgLy8gRGF0YXN0YXIncyBlZmZlY3QoKSBmb3IgcHJvcGVyIHJlYWN0aXZpdHlcbiAgICAgICAgY29uc3Qgd2lyaW5nID0gaG9zdC53aXJpbmdcbiAgICAgICAgaWYgKHdpcmluZyAmJiB3aXJpbmcud2F0Y2hlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGZvciAoY29uc3Qgd2F0Y2hlciBvZiB3aXJpbmcud2F0Y2hlcnMpIHtcbiAgICAgICAgICAgIHdpcmVTaWduYWxXYXRjaGVyVmlhRGF0YXN0YXIod2F0Y2hlciwgZWZmZWN0LCAoKSA9PiBob3N0LmNvbnRleHQhKVxuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zb2xlLmxvZyhgW0xFUzpkYXRhc3Rhcl0gcmUtd2lyZWQgJHt3aXJpbmcud2F0Y2hlcnMubGVuZ3RofSBzaWduYWwgd2F0Y2hlcnMgdmlhIERhdGFzdGFyIGVmZmVjdCgpYClcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCdbTEVTOmRhdGFzdGFyXSBhdHRyaWJ1dGUgcGx1Z2luIGFwcGxpZWQgdG8nLCBlbC5pZCB8fCBlbC50YWdOYW1lKVxuXG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgaG9zdC5kaXNjb25uZWN0RGF0YXN0YXIoKVxuICAgICAgICAgIGNvbnNvbGUubG9nKCdbTEVTOmRhdGFzdGFyXSBhdHRyaWJ1dGUgcGx1Z2luIGNsZWFuZWQgdXAnLCBlbC5pZCB8fCBlbC50YWdOYW1lKVxuICAgICAgICB9XG4gICAgICB9LFxuICAgIH0pXG5cbiAgICBicmlkZ2VSZWdpc3RlcmVkID0gdHJ1ZVxuICAgIGNvbnNvbGUubG9nKCdbTEVTOmRhdGFzdGFyXSBicmlkZ2UgcmVnaXN0ZXJlZCcpXG5cbiAgfSBjYXRjaCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIHJ1bm5pbmcgaW4gc3RhbmRhbG9uZSBtb2RlIChEYXRhc3RhciBub3QgYXZhaWxhYmxlKScpXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBTaWduYWwgaW50ZWdyYXRpb24gdXRpbGl0aWVzXG4vLyBVc2VkIGJ5IGV4ZWN1dG9yLnRzIHdoZW4gRGF0YXN0YXIgaXMgcHJlc2VudFxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogUmVhZHMgYSBzaWduYWwgdmFsdWUgZnJvbSBEYXRhc3RhcidzIHJvb3Qgb2JqZWN0LlxuICogRmFsbHMgYmFjayB0byB1bmRlZmluZWQgaWYgRGF0YXN0YXIgaXMgbm90IGF2YWlsYWJsZS5cbiAqXG4gKiBUaGlzIGlzIGNhbGxlZCBieSB0aGUgTEVTQ29udGV4dC5nZXRTaWduYWwgZnVuY3Rpb24gd2hlbiB0aGUgRGF0YXN0YXJcbiAqIGJyaWRnZSBpcyBjb25uZWN0ZWQsIGdpdmluZyBMRVMgZXhwcmVzc2lvbnMgYWNjZXNzIHRvIGFsbCBEYXRhc3RhciBzaWduYWxzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZERhdGFzdGFyU2lnbmFsKFxuICBuYW1lOiBzdHJpbmcsXG4gIGRzU2lnbmFsOiAoPFQ+KG5hbWU6IHN0cmluZywgaW5pdD86IFQpID0+IHsgdmFsdWU6IFQgfSkgfCB1bmRlZmluZWRcbik6IHVua25vd24ge1xuICBpZiAoIWRzU2lnbmFsKSByZXR1cm4gdW5kZWZpbmVkXG4gIHRyeSB7XG4gICAgcmV0dXJuIGRzU2lnbmFsKG5hbWUpLnZhbHVlXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxufVxuXG4vKipcbiAqIFdyaXRlcyBhIHZhbHVlIHRvIERhdGFzdGFyJ3Mgc2lnbmFsIHRyZWUuXG4gKiBUaGlzIHRyaWdnZXJzIERhdGFzdGFyJ3MgcmVhY3RpdmUgZ3JhcGggXHUyMDE0IGFueSBkYXRhLXRleHQsIGRhdGEtc2hvdyxcbiAqIGRhdGEtY2xhc3MgYXR0cmlidXRlcyBib3VuZCB0byB0aGlzIHNpZ25hbCB3aWxsIHVwZGF0ZSBhdXRvbWF0aWNhbGx5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVEYXRhc3RhclNpZ25hbChcbiAgbmFtZTogc3RyaW5nLFxuICB2YWx1ZTogdW5rbm93bixcbiAgZHNTaWduYWw6ICg8VD4obmFtZTogc3RyaW5nLCBpbml0PzogVCkgPT4geyB2YWx1ZTogVCB9KSB8IHVuZGVmaW5lZFxuKTogdm9pZCB7XG4gIGlmICghZHNTaWduYWwpIHJldHVyblxuICB0cnkge1xuICAgIGNvbnN0IHNpZyA9IGRzU2lnbmFsPHVua25vd24+KG5hbWUsIHZhbHVlKVxuICAgIHNpZy52YWx1ZSA9IHZhbHVlXG4gIH0gY2F0Y2gge1xuICAgIC8vIFNpZ25hbCBtYXkgbm90IGV4aXN0IHlldCBcdTIwMTQgaXQgd2lsbCBiZSBjcmVhdGVkIGJ5IGRhdGEtc2lnbmFscyBvbiB0aGUgaG9zdFxuICB9XG59XG4iLCAiLyoqXG4gKiBsb2NhbC1ldmVudC1zY3JpcHQgXHUyMDE0IG1haW4gZW50cnkgcG9pbnRcbiAqXG4gKiBJbXBvcnQgb3JkZXIgbWF0dGVycyBmb3IgY3VzdG9tIGVsZW1lbnQgcmVnaXN0cmF0aW9uOlxuICogICAxLiBIb3N0IGVsZW1lbnQgZmlyc3QgKExvY2FsRXZlbnRTY3JpcHQpXG4gKiAgIDIuIENoaWxkIGVsZW1lbnRzIHRoYXQgcmVmZXJlbmNlIGl0XG4gKiAgIDMuIERhdGFzdGFyIGJyaWRnZSBsYXN0IChvcHRpb25hbCBcdTIwMTQgZmFpbHMgZ3JhY2VmdWxseSBpZiBEYXRhc3RhciBhYnNlbnQpXG4gKlxuICogVXNhZ2UgdmlhIGltcG9ydG1hcCArIHNjcmlwdCB0YWc6XG4gKlxuICogICA8c2NyaXB0IHR5cGU9XCJpbXBvcnRtYXBcIj5cbiAqICAgICB7XG4gKiAgICAgICBcImltcG9ydHNcIjoge1xuICogICAgICAgICBcImRhdGFzdGFyXCI6IFwiaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L2doL3N0YXJmZWRlcmF0aW9uL2RhdGFzdGFyQHYxLjAuMC1SQy44L2J1bmRsZXMvZGF0YXN0YXIuanNcIlxuICogICAgICAgfVxuICogICAgIH1cbiAqICAgPC9zY3JpcHQ+XG4gKiAgIDxzY3JpcHQgdHlwZT1cIm1vZHVsZVwiIHNyYz1cIi9kaXN0L2xvY2FsLWV2ZW50LXNjcmlwdC5qc1wiPjwvc2NyaXB0PlxuICpcbiAqIFdpdGhvdXQgdGhlIGltcG9ydG1hcCAob3Igd2l0aCBkYXRhc3RhciBhYnNlbnQpLCBMRVMgcnVucyBpbiBzdGFuZGFsb25lIG1vZGU6XG4gKiBhbGwgY3VzdG9tIGVsZW1lbnRzIHdvcmssIERhdGFzdGFyIHNpZ25hbCB3YXRjaGluZyBhbmQgQGFjdGlvbiBwYXNzdGhyb3VnaFxuICogYXJlIHVuYXZhaWxhYmxlLlxuICovXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBDdXN0b20gZWxlbWVudHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBFYWNoIGltcG9ydCByZWdpc3RlcnMgaXRzIGVsZW1lbnQocykgYXMgYSBzaWRlIGVmZmVjdC5cblxuZXhwb3J0IHsgTG9jYWxFdmVudFNjcmlwdCB9IGZyb20gJ0BlbGVtZW50cy9Mb2NhbEV2ZW50U2NyaXB0LmpzJ1xuZXhwb3J0IHsgTG9jYWxDb21tYW5kIH0gICAgIGZyb20gJ0BlbGVtZW50cy9Mb2NhbENvbW1hbmQuanMnXG5leHBvcnQgeyBPbkV2ZW50IH0gICAgICAgICAgZnJvbSAnQGVsZW1lbnRzL09uRXZlbnQuanMnXG5leHBvcnQgeyBPblNpZ25hbCB9ICAgICAgICAgZnJvbSAnQGVsZW1lbnRzL09uU2lnbmFsLmpzJ1xuZXhwb3J0IHsgT25Mb2FkLCBPbkVudGVyLCBPbkV4aXQgfSBmcm9tICdAZWxlbWVudHMvTGlmZWN5Y2xlLmpzJ1xuZXhwb3J0IHsgVXNlTW9kdWxlIH0gICAgICAgIGZyb20gJ0BlbGVtZW50cy9Vc2VNb2R1bGUuanMnXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBUeXBlIGV4cG9ydHMgKGZvciBUeXBlU2NyaXB0IGNvbnN1bWVycykgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5leHBvcnQgdHlwZSB7IExFU05vZGUgfSAgICAgICAgICAgICAgICAgICBmcm9tICdAcGFyc2VyL2FzdC5qcydcbmV4cG9ydCB0eXBlIHsgTEVTTW9kdWxlLCBMRVNQcmltaXRpdmUgfSAgIGZyb20gJ0Btb2R1bGVzL3R5cGVzLmpzJ1xuZXhwb3J0IHR5cGUgeyBDb21tYW5kRGVmLCBBcmdEZWYgfSAgICAgICAgZnJvbSAnQHJ1bnRpbWUvcmVnaXN0cnkuanMnXG5leHBvcnQgeyBMRVNTY29wZSB9ICAgICAgICAgICAgICAgICAgICAgICBmcm9tICdAcnVudGltZS9zY29wZS5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIERhdGFzdGFyIGJyaWRnZSAob3B0aW9uYWwpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gRHluYW1pYyBpbXBvcnQgc28gdGhlIGJ1bmRsZSB3b3JrcyB3aXRob3V0IERhdGFzdGFyIHByZXNlbnQuXG5pbXBvcnQgeyByZWdpc3RlckRhdGFzdGFyQnJpZGdlIH0gZnJvbSAnQGRhdGFzdGFyL3BsdWdpbi5qcydcbnJlZ2lzdGVyRGF0YXN0YXJCcmlkZ2UoKVxuZXhwb3J0IHR5cGUgeyBMRVNDb25maWcsIENvbW1hbmREZWNsLCBFdmVudEhhbmRsZXJEZWNsLCBTaWduYWxXYXRjaGVyRGVjbCxcbiAgICAgICAgICAgICAgT25Mb2FkRGVjbCwgT25FbnRlckRlY2wsIE9uRXhpdERlY2wsIE1vZHVsZURlY2wgfSBmcm9tICdAcGFyc2VyL2NvbmZpZy5qcydcbmV4cG9ydCB7IHJlYWRDb25maWcsIGxvZ0NvbmZpZyB9IGZyb20gJ0BwYXJzZXIvcmVhZGVyLmpzJ1xuZXhwb3J0IHsgc3RyaXBCb2R5IH0gICAgICAgICAgICAgZnJvbSAnQHBhcnNlci9zdHJpcEJvZHkuanMnXG5leHBvcnQgeyBwYXJzZUxFUywgTEVTUGFyc2VyLCBMRVNQYXJzZUVycm9yIH0gZnJvbSAnQHBhcnNlci9pbmRleC5qcydcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUF1QkEsU0FBUyxTQUFTLFVBQWtCLE1BQTBCO0FBQzVELE1BQUk7QUFDRixVQUFNLE9BQU8sS0FBSyxZQUFZO0FBQzlCLFVBQU0sUUFBUSxnQkFBZ0IsV0FBVyxPQUFPLEtBQUssaUJBQWlCO0FBQ3RFLFdBQU8sTUFBTSxLQUFLLE1BQU0saUJBQWlCLFFBQVEsQ0FBQztBQUFBLEVBQ3BELFFBQVE7QUFDTixZQUFRLEtBQUssc0NBQXNDLFFBQVEsR0FBRztBQUM5RCxXQUFPLENBQUM7QUFBQSxFQUNWO0FBQ0Y7QUFRQSxTQUFTLGlCQUFpQixJQUFtQjtBQUMzQyxhQUFXLFFBQVMsR0FBbUIsY0FBYyxHQUFHO0FBQ3RELFNBQUssT0FBTztBQUFBLEVBQ2Q7QUFDRjtBQUdBLGVBQWUsV0FDYixLQUNBLFdBQ0EsU0FDZTtBQUNmLE1BQUksSUFBSSxXQUFX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QWUsT0FBTyxXQUFZLE1BQU07QUFDeEMsZUFBZSxPQUFPLFlBQVksT0FBTztBQUN6QyxlQUFlLE9BQU8sV0FBWSxNQUFNOzs7QUNyRGpDLElBQU0sWUFBTixjQUF3QixZQUFZO0FBQUE7QUFBQSxFQUV6QyxJQUFJLGFBQTRCO0FBQzlCLFdBQU8sS0FBSyxhQUFhLE1BQU0sR0FBRyxLQUFLLEtBQUs7QUFBQSxFQUM5QztBQUFBO0FBQUEsRUFHQSxJQUFJLFlBQTJCO0FBQzdCLFdBQU8sS0FBSyxhQUFhLEtBQUssR0FBRyxLQUFLLEtBQUs7QUFBQSxFQUM3QztBQUFBLEVBRUEsb0JBQTBCO0FBQ3hCLFVBQU0sT0FBTyxLQUFLLGFBQ2QsU0FBUyxLQUFLLFVBQVUsTUFDeEIsS0FBSyxZQUNILFFBQVEsS0FBSyxTQUFTLE1BQ3RCO0FBQ04sWUFBUSxJQUFJLGdDQUFnQyxJQUFJO0FBQUEsRUFDbEQ7QUFDRjtBQUVBLGVBQWUsT0FBTyxjQUFjLFNBQVM7OztBQ2xCN0MsSUFBSSxtQkFBbUI7QUFFdkIsZUFBc0IseUJBQXdDO0FBQzVELE1BQUksaUJBQWtCO0FBRXRCLE1BQUk7QUFDRixVQUFNLFdBQVcsTUFBTSxPQUFPLFVBQVU7QUFDeEMsVUFBTSxFQUFFLFVBQVUsSUFBSTtBQVd0QixjQUFVO0FBQUEsTUFDUixNQUFNO0FBQUEsTUFDTixhQUFhO0FBQUEsUUFDWCxLQUFLO0FBQUEsUUFDTCxPQUFPO0FBQUEsTUFDVDtBQUFBLE1BQ0EsTUFBTSxFQUFFLElBQUksUUFBUSxPQUFPLEdBQUc7QUFDNUIsY0FBTSxPQUFPO0FBR2IsYUFBSyxnQkFBZ0IsRUFBRSxRQUFRLE9BQU8sQ0FBQztBQUt2QyxjQUFNLFNBQVMsS0FBSztBQUNwQixZQUFJLFVBQVUsT0FBTyxTQUFTLFNBQVMsR0FBRztBQUN4QyxxQkFBVyxXQUFXLE9BQU8sVUFBVTtBQUNyQyx5Q0FBNkIsU0FBUyxRQUFRLE1BQU0sS0FBSyxPQUFRO0FBQUEsVUFDbkU7QUFDQSxrQkFBUSxJQUFJLDJCQUEyQixPQUFPLFNBQVMsTUFBTSx3Q0FBd0M7QUFBQSxRQUN2RztBQUVBLGdCQUFRLElBQUksOENBQThDLEdBQUcsTUFBTSxHQUFHLE9BQU87QUFFN0UsZUFBTyxNQUFNO0FBQ1gsZUFBSyxtQkFBbUI7QUFDeEIsa0JBQVEsSUFBSSw4Q0FBOEMsR0FBRyxNQUFNLEdBQUcsT0FBTztBQUFBLFFBQy9FO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUVELHVCQUFtQjtBQUNuQixZQUFRLElBQUksa0NBQWtDO0FBQUEsRUFFaEQsUUFBUTtBQUNOLFlBQVEsSUFBSSwyREFBMkQ7QUFBQSxFQUN6RTtBQUNGOzs7QUNyQ0EsdUJBQXVCOyIsCiAgIm5hbWVzIjogWyJydW5Db21tYW5kIl0KfQo=
