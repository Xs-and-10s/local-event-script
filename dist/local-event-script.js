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
  let result = "";
  let i = 0;
  while (i < selector.length) {
    if (selector[i] === "[") {
      const colonIdx = selector.indexOf(": ", i);
      if (colonIdx === -1) {
        result += selector[i++];
        continue;
      }
      let depth = 0;
      let closeIdx = -1;
      for (let j = colonIdx + 2; j < selector.length; j++) {
        if (selector[j] === "[") depth++;
        else if (selector[j] === "]") {
          if (depth === 0) {
            closeIdx = j;
            break;
          }
          depth--;
        }
      }
      if (closeIdx === -1) {
        result += selector[i++];
        continue;
      }
      const attr = selector.slice(i + 1, colonIdx).trim();
      const varExpr = selector.slice(colonIdx + 2, closeIdx).trim();
      const value = evalExpr({ type: "expr", raw: varExpr }, ctx);
      result += `[${attr}="${String(value)}"]`;
      i = closeIdx + 1;
    } else {
      result += selector[i++];
    }
  }
  return result;
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
  const unknownCustom = config.unknown.filter((e) => e.tagName.toLowerCase().includes("-"));
  if (unknownCustom.length > 0) {
    console.warn(`[LES]   unknown custom children: ${unknownCustom.length}`, unknownCustom.map((e) => e.tagName.toLowerCase()));
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
    const root = host.getRootNode();
    const target = root instanceof Document ? root : root.ownerDocument ?? document;
    target.dispatchEvent(new CustomEvent(event, {
      detail: { payload },
      bubbles: false,
      // already at the top — bubbling is meaningless here
      composed: false
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL21vZHVsZXMvYnVpbHRpbi9hbmltYXRpb24udHMiLCAiLi4vc3JjL3J1bnRpbWUvZXhlY3V0b3IudHMiLCAiLi4vc3JjL3J1bnRpbWUvcmVnaXN0cnkudHMiLCAiLi4vc3JjL21vZHVsZXMvdHlwZXMudHMiLCAiLi4vc3JjL3BhcnNlci9zdHJpcEJvZHkudHMiLCAiLi4vc3JjL3BhcnNlci9yZWFkZXIudHMiLCAiLi4vc3JjL3BhcnNlci90b2tlbml6ZXIudHMiLCAiLi4vc3JjL3BhcnNlci9wYXJzZXIudHMiLCAiLi4vc3JjL3BhcnNlci9pbmRleC50cyIsICIuLi9zcmMvcnVudGltZS93aXJpbmcudHMiLCAiLi4vc3JjL3J1bnRpbWUvc2NvcGUudHMiLCAiLi4vc3JjL3J1bnRpbWUvb2JzZXJ2ZXIudHMiLCAiLi4vc3JjL3J1bnRpbWUvc2lnbmFscy50cyIsICIuLi9zcmMvZWxlbWVudHMvTG9jYWxFdmVudFNjcmlwdC50cyIsICIuLi9zcmMvZWxlbWVudHMvTG9jYWxDb21tYW5kLnRzIiwgIi4uL3NyYy9lbGVtZW50cy9PbkV2ZW50LnRzIiwgIi4uL3NyYy9lbGVtZW50cy9PblNpZ25hbC50cyIsICIuLi9zcmMvZWxlbWVudHMvTGlmZWN5Y2xlLnRzIiwgIi4uL3NyYy9lbGVtZW50cy9Vc2VNb2R1bGUudHMiLCAiLi4vc3JjL2RhdGFzdGFyL3BsdWdpbi50cyIsICIuLi9zcmMvaW5kZXgudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogUGhhc2UgNzogQnVpbHQtaW4gYW5pbWF0aW9uIG1vZHVsZVxuICpcbiAqIEFsbCBwcmltaXRpdmVzIHVzZSB0aGUgV2ViIEFuaW1hdGlvbnMgQVBJIChlbGVtZW50LmFuaW1hdGUoKS5maW5pc2hlZClcbiAqIHNvIHRoZXkgaW50ZWdyYXRlIHdpdGggTEVTJ3MgYXN5bmMtdHJhbnNwYXJlbnQgYHRoZW5gIHNlcXVlbmNpbmc6XG4gKlxuICogICBmYWRlLWluICNzcGxhc2ggMjAwbXMgZWFzZS1vdXQgYW5kXG4gKiAgIHNsaWRlLXVwICNzcGxhc2ggMTgwbXMgZWFzZS1vdXRcbiAqICAgdGhlbiBmaXJlIHNwbGFzaDpyZWFkeSAgICAgICAgICBcdTIxOTAgb25seSBmaXJlcyBhZnRlciBCT1RIIGFuaW1hdGlvbnMgY29tcGxldGVcbiAqXG4gKiBgYW5kYCBcdTIxOTIgUHJvbWlzZS5hbGwgKGNvbmN1cnJlbnQpXG4gKiBgdGhlbmAgXHUyMTkyIHNlcXVlbnRpYWwgYXdhaXQgb24gLmZpbmlzaGVkXG4gKlxuICogVGhlIGV4ZWN1dG9yIGF3YWl0cyBlYWNoIExFU1ByaW1pdGl2ZSByZXR1cm4gdmFsdWUsIHNvIGFuaW1hdGlvblxuICogY29tcGxldGlvbiBpcyBuYXR1cmFsbHkgc2VyaWFsaXplZCB3aXRob3V0IGFueSBzZXRUaW1lb3V0IGhhY2tzLlxuICovXG5cbmltcG9ydCB0eXBlIHsgTEVTTW9kdWxlLCBMRVNQcmltaXRpdmUgfSBmcm9tICcuLi90eXBlcy5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBVdGlsaXR5OiBxdWVyeSBhbGwgbWF0Y2hpbmcgZWxlbWVudHMgd2l0aGluIHRoZSBob3N0IHNjb3BlXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gcXVlcnlBbGwoc2VsZWN0b3I6IHN0cmluZywgaG9zdDogRWxlbWVudCk6IEVsZW1lbnRbXSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgcm9vdCA9IGhvc3QuZ2V0Um9vdE5vZGUoKSBhcyBEb2N1bWVudCB8IFNoYWRvd1Jvb3RcbiAgICBjb25zdCBzY29wZSA9IHJvb3QgaW5zdGFuY2VvZiBEb2N1bWVudCA/IHJvb3QgOiByb290Lm93bmVyRG9jdW1lbnQgPz8gZG9jdW1lbnRcbiAgICByZXR1cm4gQXJyYXkuZnJvbShzY29wZS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSlcbiAgfSBjYXRjaCB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTOmFuaW1hdGlvbl0gSW52YWxpZCBzZWxlY3RvcjogXCIke3NlbGVjdG9yfVwiYClcbiAgICByZXR1cm4gW11cbiAgfVxufVxuXG4vKipcbiAqIENhbmNlbCBhbGwgcnVubmluZyBXZWIgQW5pbWF0aW9ucyBvbiBhbiBlbGVtZW50IGJlZm9yZSBzdGFydGluZyBhIG5ldyBvbmUuXG4gKiBUaGlzIHByZXZlbnRzIHRoZSBvbmUtZnJhbWUgZmxhc2ggdGhhdCBvY2N1cnMgd2hlbiBhIGZpbGw6Zm9yd2FyZHMgYW5pbWF0aW9uXG4gKiBpcyBpbnRlcnJ1cHRlZCBcdTIwMTQgd2l0aG91dCBjYW5jZWxsYXRpb24sIHRoZSBlbGVtZW50IGJyaWVmbHkgcmV2ZXJ0cyB0byBpdHNcbiAqIHVuLWFuaW1hdGVkIHN0YXRlIGFzIHRoZSBvbGQgQW5pbWF0aW9uIGlzIHJlcGxhY2VkLlxuICovXG5mdW5jdGlvbiBjYW5jZWxBbmltYXRpb25zKGVsOiBFbGVtZW50KTogdm9pZCB7XG4gIGZvciAoY29uc3QgYW5pbSBvZiAoZWwgYXMgSFRNTEVsZW1lbnQpLmdldEFuaW1hdGlvbnMoKSkge1xuICAgIGFuaW0uY2FuY2VsKClcbiAgfVxufVxuXG4vKiogQXdhaXRzIGFsbCBBbmltYXRpb24uZmluaXNoZWQgcHJvbWlzZXMuIFJldHVybnMgaW1tZWRpYXRlbHkgaWYgbm8gZWxlbWVudHMgbWF0Y2hlZC4gKi9cbmFzeW5jIGZ1bmN0aW9uIGFuaW1hdGVBbGwoXG4gIGVsczogRWxlbWVudFtdLFxuICBrZXlmcmFtZXM6IEtleWZyYW1lW10sXG4gIG9wdGlvbnM6IEtleWZyYW1lQW5pbWF0aW9uT3B0aW9uc1xuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChlbHMubGVuZ3RoID09PSAwKSByZXR1cm5cbiAgLy8gTm90ZTogY2FuY2VsQW5pbWF0aW9ucyBpcyBpbnRlbnRpb25hbGx5IE5PVCBjYWxsZWQgaGVyZS5cbiAgLy8gSXQgaXMgb25seSBjYWxsZWQgaW4gc3RhZ2dlci1lbnRlci9zdGFnZ2VyLWV4aXQgd2hlcmUgd2UgZXhwbGljaXRseVxuICAvLyByZXN0YXJ0IGFuIGluLXByb2dyZXNzIHN0YWdnZXIuIENhbGxpbmcgY2FuY2VsIG9uIGV2ZXJ5IHByaW1pdGl2ZVxuICAvLyB3b3VsZCBkZXN0cm95IGZpbGw6Zm9yd2FyZHMgaG9sZHMgZnJvbSBwcmV2aW91cyBhbmltYXRpb25zXG4gIC8vIChlLmcuIHN0YWdnZXItZW50ZXIncyBob2xkIHdvdWxkIGJlIGNhbmNlbGxlZCBieSBhIHN1YnNlcXVlbnQgcHVsc2UpLlxuICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBlbHMubWFwKGVsID0+IChlbCBhcyBIVE1MRWxlbWVudCkuYW5pbWF0ZShrZXlmcmFtZXMsIG9wdGlvbnMpLmZpbmlzaGVkXG4gICAgICAuY2F0Y2goKGVycjogdW5rbm93bikgPT4ge1xuICAgICAgICAvLyBBYm9ydEVycm9yIGlzIGV4cGVjdGVkIHdoZW4gY2FuY2VsQW5pbWF0aW9ucygpIGludGVycnVwdHMgYSBydW5uaW5nXG4gICAgICAgIC8vIGFuaW1hdGlvbi4gU3dhbGxvdyBpdCBcdTIwMTQgdGhlIG5ldyBhbmltYXRpb24gaGFzIGFscmVhZHkgc3RhcnRlZC5cbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnIubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSByZXR1cm5cbiAgICAgICAgdGhyb3cgZXJyXG4gICAgICB9KVxuICAgIClcbiAgKVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIERpcmVjdGlvbiBoZWxwZXJzXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxudHlwZSBEaXJlY3Rpb24gPSAnbGVmdCcgfCAncmlnaHQnIHwgJ3VwJyB8ICdkb3duJ1xuXG5mdW5jdGlvbiBzbGlkZUtleWZyYW1lcyhkaXI6IERpcmVjdGlvbiwgZW50ZXJpbmc6IGJvb2xlYW4pOiBLZXlmcmFtZVtdIHtcbiAgY29uc3QgZGlzdGFuY2UgPSAnODBweCdcbiAgY29uc3QgdHJhbnNsYXRpb25zOiBSZWNvcmQ8RGlyZWN0aW9uLCBzdHJpbmc+ID0ge1xuICAgIGxlZnQ6ICBgdHJhbnNsYXRlWCgtJHtkaXN0YW5jZX0pYCxcbiAgICByaWdodDogYHRyYW5zbGF0ZVgoJHtkaXN0YW5jZX0pYCxcbiAgICB1cDogICAgYHRyYW5zbGF0ZVkoLSR7ZGlzdGFuY2V9KWAsXG4gICAgZG93bjogIGB0cmFuc2xhdGVZKCR7ZGlzdGFuY2V9KWAsXG4gIH1cbiAgY29uc3QgdHJhbnNsYXRlID0gdHJhbnNsYXRpb25zW2Rpcl1cbiAgaWYgKGVudGVyaW5nKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHsgb3BhY2l0eTogMCwgdHJhbnNmb3JtOiB0cmFuc2xhdGUgfSxcbiAgICAgIHsgb3BhY2l0eTogMSwgdHJhbnNmb3JtOiAnbm9uZScgfSxcbiAgICBdXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHsgb3BhY2l0eTogMSwgdHJhbnNmb3JtOiAnbm9uZScgfSxcbiAgICAgIHsgb3BhY2l0eTogMCwgdHJhbnNmb3JtOiB0cmFuc2xhdGUgfSxcbiAgICBdXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBDb3JlIHByaW1pdGl2ZXNcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5jb25zdCBmYWRlSW46IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgX29wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLFxuICAgIFt7IG9wYWNpdHk6IDAgfSwgeyBvcGFjaXR5OiAxIH1dLFxuICAgIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9XG4gIClcbn1cblxuY29uc3QgZmFkZU91dDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBfb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgYXdhaXQgYW5pbWF0ZUFsbChlbHMsXG4gICAgW3sgb3BhY2l0eTogMSB9LCB7IG9wYWNpdHk6IDAgfV0sXG4gICAgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnIH1cbiAgKVxufVxuXG5jb25zdCBzbGlkZUluOiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIG9wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZnJvbSA9IChvcHRzWydmcm9tJ10gYXMgRGlyZWN0aW9uIHwgdW5kZWZpbmVkKSA/PyAncmlnaHQnXG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBhd2FpdCBhbmltYXRlQWxsKGVscywgc2xpZGVLZXlmcmFtZXMoZnJvbSwgdHJ1ZSksIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9KVxufVxuXG5jb25zdCBzbGlkZU91dDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBvcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IHRvID0gKG9wdHNbJ3RvJ10gYXMgRGlyZWN0aW9uIHwgdW5kZWZpbmVkKSA/PyAnbGVmdCdcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLCBzbGlkZUtleWZyYW1lcyh0bywgZmFsc2UpLCB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdmb3J3YXJkcycgfSlcbn1cblxuY29uc3Qgc2xpZGVVcDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBfb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgYXdhaXQgYW5pbWF0ZUFsbChlbHMsIHNsaWRlS2V5ZnJhbWVzKCd1cCcsIHRydWUpLCB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdmb3J3YXJkcycgfSlcbn1cblxuY29uc3Qgc2xpZGVEb3duOiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIF9vcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBhd2FpdCBhbmltYXRlQWxsKGVscywgc2xpZGVLZXlmcmFtZXMoJ2Rvd24nLCBmYWxzZSksIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9KVxufVxuXG4vKipcbiAqIHB1bHNlIFx1MjAxNCBicmllZiBzY2FsZSArIG9wYWNpdHkgcHVsc2UgdG8gZHJhdyBhdHRlbnRpb24gdG8gdXBkYXRlZCBpdGVtcy5cbiAqIFVzZWQgZm9yIEQzIFwidXBkYXRlXCIgcGhhc2U6IGl0ZW1zIHdob3NlIGNvbnRlbnQgY2hhbmdlZCBnZXQgYSB2aXN1YWwgcGluZy5cbiAqL1xuY29uc3QgcHVsc2U6IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgX29wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLCBbXG4gICAgeyBvcGFjaXR5OiAxLCAgICB0cmFuc2Zvcm06ICdzY2FsZSgxKScgfSxcbiAgICB7IG9wYWNpdHk6IDAuNzUsIHRyYW5zZm9ybTogJ3NjYWxlKDEuMDMpJywgb2Zmc2V0OiAwLjQgfSxcbiAgICB7IG9wYWNpdHk6IDEsICAgIHRyYW5zZm9ybTogJ3NjYWxlKDEpJyB9LFxuICBdLCB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdub25lJyB9KVxufVxuXG4vKipcbiAqIHN0YWdnZXItZW50ZXIgXHUyMDE0IHJ1bnMgc2xpZGVJbiBvbiBlYWNoIG1hdGNoZWQgZWxlbWVudCBpbiBzZXF1ZW5jZSxcbiAqIG9mZnNldCBieSBgZ2FwYCBtaWxsaXNlY29uZHMgYmV0d2VlbiBlYWNoLlxuICpcbiAqIE9wdGlvbnM6XG4gKiAgIGdhcDogTm1zICAgXHUyMDE0IGRlbGF5IGJldHdlZW4gZWFjaCBlbGVtZW50IChkZWZhdWx0OiA0MG1zKVxuICogICBmcm9tOiBkaXIgIFx1MjAxNCAnbGVmdCcgfCAncmlnaHQnIHwgJ3VwJyB8ICdkb3duJyAoZGVmYXVsdDogJ3JpZ2h0JylcbiAqXG4gKiBBbGwgYW5pbWF0aW9ucyBhcmUgc3RhcnRlZCB0b2dldGhlciAoUHJvbWlzZS5hbGwpIGJ1dCBlYWNoIGhhcyBhblxuICogaW5jcmVhc2luZyBgZGVsYXlgIFx1MjAxNCB0aGlzIGdpdmVzIHRoZSBzdGFnZ2VyIGVmZmVjdCB3aGlsZSBrZWVwaW5nXG4gKiB0aGUgdG90YWwgUHJvbWlzZS1zZXR0bGVkIHRpbWUgPSBkdXJhdGlvbiArIChuLTEpICogZ2FwLlxuICovXG5jb25zdCBzdGFnZ2VyRW50ZXI6IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgaWYgKGVscy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIGNvbnN0IGdhcCAgPSBwYXJzZU1zKG9wdHNbJ2dhcCddIGFzIHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgNDApXG4gIGNvbnN0IGZyb20gPSAob3B0c1snZnJvbSddIGFzIERpcmVjdGlvbiB8IHVuZGVmaW5lZCkgPz8gJ3JpZ2h0J1xuXG4gIGVscy5mb3JFYWNoKGNhbmNlbEFuaW1hdGlvbnMpXG4gIGF3YWl0IFByb21pc2UuYWxsKFxuICAgIGVscy5tYXAoKGVsLCBpKSA9PlxuICAgICAgKGVsIGFzIEhUTUxFbGVtZW50KS5hbmltYXRlKFxuICAgICAgICBzbGlkZUtleWZyYW1lcyhmcm9tLCB0cnVlKSxcbiAgICAgICAgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnLCBkZWxheTogaSAqIGdhcCB9XG4gICAgICApLmZpbmlzaGVkLmNhdGNoKChlcnI6IHVua25vd24pID0+IHtcbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnIubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSByZXR1cm5cbiAgICAgICAgdGhyb3cgZXJyXG4gICAgICB9KVxuICAgIClcbiAgKVxufVxuXG4vKipcbiAqIHN0YWdnZXItZXhpdCBcdTIwMTQgcnVucyBzbGlkZU91dCBvbiBlYWNoIG1hdGNoZWQgZWxlbWVudCBpbiBzZXF1ZW5jZS5cbiAqXG4gKiBPcHRpb25zOlxuICogICBnYXA6IE5tcyAgICAgICAgICBcdTIwMTQgZGVsYXkgYmV0d2VlbiBlYWNoIGVsZW1lbnQgKGRlZmF1bHQ6IDIwbXMpXG4gKiAgIGRpcmVjdGlvbjogcmV2ZXJzZSBcdTIwMTQgcHJvY2VzcyBlbGVtZW50cyBpbiByZXZlcnNlIG9yZGVyXG4gKiAgIHRvOiBkaXIgICAgICAgICAgIFx1MjAxNCBleGl0IGRpcmVjdGlvbiAoZGVmYXVsdDogJ2xlZnQnKVxuICovXG5jb25zdCBzdGFnZ2VyRXhpdDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBvcHRzLCBob3N0KSA9PiB7XG4gIC8vIEZpbHRlciB0byBvbmx5IGVsZW1lbnRzIHRoYXQgYXJlIGFjdHVhbGx5IHZpc2libGUgXHUyMDE0IHNraXAgaGlkZGVuL2FscmVhZHktZXhpdGVkIG9uZXNcbiAgbGV0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KS5maWx0ZXIoZWwgPT4ge1xuICAgIGNvbnN0IHN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWwgYXMgSFRNTEVsZW1lbnQpXG4gICAgcmV0dXJuIHN0eWxlLmRpc3BsYXkgIT09ICdub25lJyAmJiBzdHlsZS52aXNpYmlsaXR5ICE9PSAnaGlkZGVuJ1xuICB9KVxuICBpZiAoZWxzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgY29uc3QgZ2FwICAgICA9IHBhcnNlTXMob3B0c1snZ2FwJ10gYXMgc3RyaW5nIHwgbnVtYmVyIHwgdW5kZWZpbmVkLCAyMClcbiAgY29uc3QgcmV2ZXJzZSA9IFN0cmluZyhvcHRzWydkaXJlY3Rpb24nXSA/PyAnJykgPT09ICdyZXZlcnNlJ1xuICBjb25zdCB0byAgICAgID0gKG9wdHNbJ3RvJ10gYXMgRGlyZWN0aW9uIHwgdW5kZWZpbmVkKSA/PyAnbGVmdCdcblxuICBpZiAocmV2ZXJzZSkgZWxzID0gWy4uLmVsc10ucmV2ZXJzZSgpXG5cbiAgZWxzLmZvckVhY2goY2FuY2VsQW5pbWF0aW9ucylcbiAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgZWxzLm1hcCgoZWwsIGkpID0+XG4gICAgICAoZWwgYXMgSFRNTEVsZW1lbnQpLmFuaW1hdGUoXG4gICAgICAgIHNsaWRlS2V5ZnJhbWVzKHRvLCBmYWxzZSksXG4gICAgICAgIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJywgZGVsYXk6IGkgKiBnYXAgfVxuICAgICAgKS5maW5pc2hlZC5jYXRjaCgoZXJyOiB1bmtub3duKSA9PiB7XG4gICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBET01FeGNlcHRpb24gJiYgZXJyLm5hbWUgPT09ICdBYm9ydEVycm9yJykgcmV0dXJuXG4gICAgICAgIHRocm93IGVyclxuICAgICAgfSlcbiAgICApXG4gIClcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBVdGlsaXR5OiBwYXJzZSBhIG1pbGxpc2Vjb25kIHZhbHVlIGZyb20gYSBzdHJpbmcgbGlrZSBcIjQwbXNcIiBvciBhIG51bWJlclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIHBhcnNlTXModmFsOiBzdHJpbmcgfCBudW1iZXIgfCB1bmRlZmluZWQsIGZhbGxiYWNrOiBudW1iZXIpOiBudW1iZXIge1xuICBpZiAodmFsID09PSB1bmRlZmluZWQgfHwgdmFsID09PSBudWxsKSByZXR1cm4gZmFsbGJhY2tcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSByZXR1cm4gdmFsXG4gIGNvbnN0IG0gPSBTdHJpbmcodmFsKS5tYXRjaCgvXihcXGQrKD86XFwuXFxkKyk/KW1zJC8pXG4gIGlmIChtKSByZXR1cm4gcGFyc2VGbG9hdChtWzFdISlcbiAgY29uc3QgbiA9IHBhcnNlRmxvYXQoU3RyaW5nKHZhbCkpXG4gIHJldHVybiBOdW1iZXIuaXNOYU4obikgPyBmYWxsYmFjayA6IG5cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBNb2R1bGUgZXhwb3J0XG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgYW5pbWF0aW9uTW9kdWxlOiBMRVNNb2R1bGUgPSB7XG4gIG5hbWU6ICdhbmltYXRpb24nLFxuICBwcmltaXRpdmVzOiB7XG4gICAgJ2ZhZGUtaW4nOiAgICAgICBmYWRlSW4sXG4gICAgJ2ZhZGUtb3V0JzogICAgICBmYWRlT3V0LFxuICAgICdzbGlkZS1pbic6ICAgICAgc2xpZGVJbixcbiAgICAnc2xpZGUtb3V0JzogICAgIHNsaWRlT3V0LFxuICAgICdzbGlkZS11cCc6ICAgICAgc2xpZGVVcCxcbiAgICAnc2xpZGUtZG93bic6ICAgIHNsaWRlRG93bixcbiAgICAncHVsc2UnOiAgICAgICAgIHB1bHNlLFxuICAgICdzdGFnZ2VyLWVudGVyJzogc3RhZ2dlckVudGVyLFxuICAgICdzdGFnZ2VyLWV4aXQnOiAgc3RhZ2dlckV4aXQsXG4gIH0sXG59XG5cbmV4cG9ydCBkZWZhdWx0IGFuaW1hdGlvbk1vZHVsZVxuIiwgImltcG9ydCB0eXBlIHtcbiAgTEVTTm9kZSwgRXhwck5vZGUsIFNlcXVlbmNlTm9kZSwgUGFyYWxsZWxOb2RlLFxuICBTZXROb2RlLCBFbWl0Tm9kZSwgQnJvYWRjYXN0Tm9kZSwgV2FpdE5vZGUsXG4gIENhbGxOb2RlLCBCaW5kTm9kZSwgTWF0Y2hOb2RlLCBUcnlOb2RlLCBBbmltYXRpb25Ob2RlLFxufSBmcm9tICdAcGFyc2VyL2FzdC5qcydcbmltcG9ydCB0eXBlIHsgUGF0dGVybk5vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcbmltcG9ydCB7IExFU1Njb3BlIH0gZnJvbSAnLi9zY29wZS5qcydcbmltcG9ydCB0eXBlIHsgQ29tbWFuZFJlZ2lzdHJ5IH0gZnJvbSAnLi9yZWdpc3RyeS5qcydcbmltcG9ydCB0eXBlIHsgTW9kdWxlUmVnaXN0cnkgfSBmcm9tICdAbW9kdWxlcy90eXBlcy5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBFeGVjdXRpb24gY29udGV4dCBcdTIwMTQgZXZlcnl0aGluZyB0aGUgZXhlY3V0b3IgbmVlZHMsIHBhc3NlZCBkb3duIHRoZSBjYWxsIHRyZWVcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5leHBvcnQgaW50ZXJmYWNlIExFU0NvbnRleHQge1xuICAvKiogTG9jYWwgdmFyaWFibGUgc2NvcGUgZm9yIHRoZSBjdXJyZW50IGNhbGwgZnJhbWUgKi9cbiAgc2NvcGU6IExFU1Njb3BlXG4gIC8qKiBUaGUgPGxvY2FsLWV2ZW50LXNjcmlwdD4gaG9zdCBlbGVtZW50IFx1MjAxNCB1c2VkIGFzIHF1ZXJ5U2VsZWN0b3Igcm9vdCAqL1xuICBob3N0OiBFbGVtZW50XG4gIC8qKiBDb21tYW5kIGRlZmluaXRpb25zIHJlZ2lzdGVyZWQgYnkgPGxvY2FsLWNvbW1hbmQ+IGNoaWxkcmVuICovXG4gIGNvbW1hbmRzOiBDb21tYW5kUmVnaXN0cnlcbiAgLyoqIEFuaW1hdGlvbiBhbmQgb3RoZXIgcHJpbWl0aXZlIG1vZHVsZXMgKi9cbiAgbW9kdWxlczogTW9kdWxlUmVnaXN0cnlcbiAgLyoqIFJlYWQgYSBEYXRhc3RhciBzaWduYWwgdmFsdWUgYnkgbmFtZSAod2l0aG91dCAkIHByZWZpeCkgKi9cbiAgZ2V0U2lnbmFsOiAobmFtZTogc3RyaW5nKSA9PiB1bmtub3duXG4gIC8qKiBXcml0ZSBhIERhdGFzdGFyIHNpZ25hbCB2YWx1ZSBieSBuYW1lICh3aXRob3V0ICQgcHJlZml4KSAqL1xuICBzZXRTaWduYWw6IChuYW1lOiBzdHJpbmcsIHZhbHVlOiB1bmtub3duKSA9PiB2b2lkXG4gIC8qKiBEaXNwYXRjaCBhIGxvY2FsIEN1c3RvbUV2ZW50IG9uIHRoZSBob3N0IChidWJibGVzOiBmYWxzZSkgKi9cbiAgZW1pdExvY2FsOiAoZXZlbnQ6IHN0cmluZywgcGF5bG9hZDogdW5rbm93bltdKSA9PiB2b2lkXG4gIC8qKiBEaXNwYXRjaCBhIERPTS13aWRlIEN1c3RvbUV2ZW50IChidWJibGVzOiB0cnVlLCBjb21wb3NlZDogdHJ1ZSkgKi9cbiAgYnJvYWRjYXN0OiAoZXZlbnQ6IHN0cmluZywgcGF5bG9hZDogdW5rbm93bltdKSA9PiB2b2lkXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gTWFpbiBleGVjdXRvclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogRXhlY3V0ZXMgYSBMRVNOb2RlIEFTVCBpbiB0aGUgZ2l2ZW4gY29udGV4dC5cbiAqXG4gKiBBc3luYyB0cmFuc3BhcmVuY3k6IGV2ZXJ5IHN0ZXAgaXMgYXdhaXRlZCByZWdhcmRsZXNzIG9mIHdoZXRoZXIgaXRcbiAqIGlzIHN5bmNocm9ub3VzIG9yIHJldHVybnMgYSBQcm9taXNlLiBUaGUgYXV0aG9yIG5ldmVyIHdyaXRlcyBgYXdhaXRgLlxuICogVGhlIGB0aGVuYCBjb25uZWN0aXZlIGluIExFUyBzb3VyY2UgbWFwcyB0byBzZXF1ZW50aWFsIGBhd2FpdGAgaGVyZS5cbiAqIFRoZSBgYW5kYCBjb25uZWN0aXZlIG1hcHMgdG8gYFByb21pc2UuYWxsYC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGUobm9kZTogTEVTTm9kZSwgY3R4OiBMRVNDb250ZXh0KTogUHJvbWlzZTx2b2lkPiB7XG4gIHN3aXRjaCAobm9kZS50eXBlKSB7XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgU2VxdWVuY2U6IEEgdGhlbiBCIHRoZW4gQyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdzZXF1ZW5jZSc6XG4gICAgICBmb3IgKGNvbnN0IHN0ZXAgb2YgKG5vZGUgYXMgU2VxdWVuY2VOb2RlKS5zdGVwcykge1xuICAgICAgICBhd2FpdCBleGVjdXRlKHN0ZXAsIGN0eClcbiAgICAgIH1cbiAgICAgIHJldHVyblxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIFBhcmFsbGVsOiBBIGFuZCBCIGFuZCBDIChQcm9taXNlLmFsbCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAncGFyYWxsZWwnOlxuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoKG5vZGUgYXMgUGFyYWxsZWxOb2RlKS5icmFuY2hlcy5tYXAoYiA9PiBleGVjdXRlKGIsIGN0eCkpKVxuICAgICAgcmV0dXJuXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgc2V0ICRzaWduYWwgdG8gZXhwciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdzZXQnOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBTZXROb2RlXG4gICAgICBjb25zdCB2YWx1ZSA9IGV2YWxFeHByKG4udmFsdWUsIGN0eClcbiAgICAgIGN0eC5zZXRTaWduYWwobi5zaWduYWwsIHZhbHVlKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIGVtaXQgZXZlbnQ6bmFtZSBbcGF5bG9hZF0gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnZW1pdCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIEVtaXROb2RlXG4gICAgICBjb25zdCBwYXlsb2FkID0gbi5wYXlsb2FkLm1hcChwID0+IGV2YWxFeHByKHAsIGN0eCkpXG4gICAgICBjdHguZW1pdExvY2FsKG4uZXZlbnQsIHBheWxvYWQpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgYnJvYWRjYXN0IGV2ZW50Om5hbWUgW3BheWxvYWRdIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ2Jyb2FkY2FzdCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIEJyb2FkY2FzdE5vZGVcbiAgICAgIGNvbnN0IHBheWxvYWQgPSBuLnBheWxvYWQubWFwKHAgPT4gZXZhbEV4cHIocCwgY3R4KSlcbiAgICAgIGN0eC5icm9hZGNhc3Qobi5ldmVudCwgcGF5bG9hZClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCB3YWl0IE5tcyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICd3YWl0Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgV2FpdE5vZGVcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBuLm1zKSlcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBjYWxsIGNvbW1hbmQ6bmFtZSBbYXJnc10gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnY2FsbCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIENhbGxOb2RlXG4gICAgICBjb25zdCBkZWYgPSBjdHguY29tbWFuZHMuZ2V0KG4uY29tbWFuZClcbiAgICAgIGlmICghZGVmKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgW0xFU10gVW5rbm93biBjb21tYW5kOiBcIiR7bi5jb21tYW5kfVwiYClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIC8vIEV2YWx1YXRlIGd1YXJkIFx1MjAxNCBmYWxzeSA9IHNpbGVudCBuby1vcCAobm90IGFuIGVycm9yLCBubyByZXNjdWUpXG4gICAgICBpZiAoZGVmLmd1YXJkKSB7XG4gICAgICAgIGNvbnN0IHBhc3NlcyA9IGV2YWxHdWFyZChkZWYuZ3VhcmQsIGN0eClcbiAgICAgICAgaWYgKCFwYXNzZXMpIHtcbiAgICAgICAgICBjb25zb2xlLmRlYnVnKGBbTEVTXSBjb21tYW5kIFwiJHtuLmNvbW1hbmR9XCIgZ3VhcmQgcmVqZWN0ZWRgKVxuICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIEJ1aWxkIGNoaWxkIHNjb3BlOiBiaW5kIGFyZ3MgaW50byBpdFxuICAgICAgY29uc3QgY2hpbGRTY29wZSA9IGN0eC5zY29wZS5jaGlsZCgpXG4gICAgICBjb25zdCBldmFsZWRBcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIGV4cHJOb2RlXSBvZiBPYmplY3QuZW50cmllcyhuLmFyZ3MpKSB7XG4gICAgICAgIGV2YWxlZEFyZ3Nba2V5XSA9IGV2YWxFeHByKGV4cHJOb2RlLCBjdHgpXG4gICAgICB9XG5cbiAgICAgIC8vIEFwcGx5IGFyZyBkZWZhdWx0cyBmcm9tIGRlZiAoUGhhc2UgMiBBcmdEZWYgcGFyc2luZyBcdTIwMTQgc2ltcGxpZmllZCBoZXJlKVxuICAgICAgZm9yIChjb25zdCBhcmdEZWYgb2YgZGVmLmFyZ3MpIHtcbiAgICAgICAgaWYgKCEoYXJnRGVmLm5hbWUgaW4gZXZhbGVkQXJncykgJiYgYXJnRGVmLmRlZmF1bHQpIHtcbiAgICAgICAgICBldmFsZWRBcmdzW2FyZ0RlZi5uYW1lXSA9IGV2YWxFeHByKGFyZ0RlZi5kZWZhdWx0LCBjdHgpXG4gICAgICAgIH1cbiAgICAgICAgY2hpbGRTY29wZS5zZXQoYXJnRGVmLm5hbWUsIGV2YWxlZEFyZ3NbYXJnRGVmLm5hbWVdID8/IG51bGwpXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGNoaWxkQ3R4OiBMRVNDb250ZXh0ID0geyAuLi5jdHgsIHNjb3BlOiBjaGlsZFNjb3BlIH1cbiAgICAgIGF3YWl0IGV4ZWN1dGUoZGVmLmJvZHksIGNoaWxkQ3R4KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIG5hbWUgPC0gQHZlcmIgJ3VybCcgW2FyZ3NdIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ2JpbmQnOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBCaW5kTm9kZVxuICAgICAgY29uc3QgeyB2ZXJiLCB1cmwsIGFyZ3MgfSA9IG4uYWN0aW9uXG4gICAgICBjb25zdCBldmFsZWRBcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIGV4cHJOb2RlXSBvZiBPYmplY3QuZW50cmllcyhhcmdzKSkge1xuICAgICAgICBldmFsZWRBcmdzW2tleV0gPSBldmFsRXhwcihleHByTm9kZSwgY3R4KVxuICAgICAgfVxuXG4gICAgICBsZXQgcmVzdWx0OiB1bmtub3duXG4gICAgICB0cnkge1xuICAgICAgICByZXN1bHQgPSBhd2FpdCBwZXJmb3JtQWN0aW9uKHZlcmIsIHVybCwgZXZhbGVkQXJncywgY3R4KVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIC8vIFByb3BhZ2F0ZSBzbyBlbmNsb3NpbmcgdHJ5L3Jlc2N1ZSBjYW4gY2F0Y2ggaXRcbiAgICAgICAgdGhyb3cgZXJyXG4gICAgICB9XG5cbiAgICAgIGN0eC5zY29wZS5zZXQobi5uYW1lLCByZXN1bHQpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgbWF0Y2ggc3ViamVjdCAvIGFybXMgLyAvbWF0Y2ggXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnbWF0Y2gnOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBNYXRjaE5vZGVcbiAgICAgIGNvbnN0IHN1YmplY3QgPSBldmFsRXhwcihuLnN1YmplY3QsIGN0eClcblxuICAgICAgZm9yIChjb25zdCBhcm0gb2Ygbi5hcm1zKSB7XG4gICAgICAgIGNvbnN0IGJpbmRpbmdzID0gbWF0Y2hQYXR0ZXJucyhhcm0ucGF0dGVybnMsIHN1YmplY3QpXG4gICAgICAgIGlmIChiaW5kaW5ncyAhPT0gbnVsbCkge1xuICAgICAgICAgIC8vIENyZWF0ZSBjaGlsZCBzY29wZSB3aXRoIHBhdHRlcm4gYmluZGluZ3NcbiAgICAgICAgICBjb25zdCBhcm1TY29wZSA9IGN0eC5zY29wZS5jaGlsZCgpXG4gICAgICAgICAgZm9yIChjb25zdCBbaywgdl0gb2YgT2JqZWN0LmVudHJpZXMoYmluZGluZ3MpKSB7XG4gICAgICAgICAgICBhcm1TY29wZS5zZXQoaywgdilcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgYXJtQ3R4OiBMRVNDb250ZXh0ID0geyAuLi5jdHgsIHNjb3BlOiBhcm1TY29wZSB9XG4gICAgICAgICAgYXdhaXQgZXhlY3V0ZShhcm0uYm9keSwgYXJtQ3R4KVxuICAgICAgICAgIHJldHVybiAgIC8vIEZpcnN0IG1hdGNoaW5nIGFybSB3aW5zIFx1MjAxNCBubyBmYWxsdGhyb3VnaFxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gbWF0Y2g6IG5vIGFybSBtYXRjaGVkIHN1YmplY3Q6Jywgc3ViamVjdClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCB0cnkgLyByZXNjdWUgLyBhZnRlcndhcmRzIC8gL3RyeSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICd0cnknOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBUcnlOb2RlXG4gICAgICBsZXQgdGhyZXcgPSBmYWxzZVxuXG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBleGVjdXRlKG4uYm9keSwgY3R4KVxuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHRocmV3ID0gdHJ1ZVxuICAgICAgICBpZiAobi5yZXNjdWUpIHtcbiAgICAgICAgICAvLyBCaW5kIHRoZSBlcnJvciBhcyBgJGVycm9yYCBpbiB0aGUgcmVzY3VlIHNjb3BlXG4gICAgICAgICAgY29uc3QgcmVzY3VlU2NvcGUgPSBjdHguc2NvcGUuY2hpbGQoKVxuICAgICAgICAgIHJlc2N1ZVNjb3BlLnNldCgnZXJyb3InLCBlcnIpXG4gICAgICAgICAgY29uc3QgcmVzY3VlQ3R4OiBMRVNDb250ZXh0ID0geyAuLi5jdHgsIHNjb3BlOiByZXNjdWVTY29wZSB9XG4gICAgICAgICAgYXdhaXQgZXhlY3V0ZShuLnJlc2N1ZSwgcmVzY3VlQ3R4KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE5vIHJlc2N1ZSBjbGF1c2UgXHUyMDE0IHJlLXRocm93IHNvIG91dGVyIHRyeSBjYW4gY2F0Y2ggaXRcbiAgICAgICAgICB0aHJvdyBlcnJcbiAgICAgICAgfVxuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgaWYgKG4uYWZ0ZXJ3YXJkcykge1xuICAgICAgICAgIC8vIGFmdGVyd2FyZHMgYWx3YXlzIHJ1bnMgaWYgZXhlY3V0aW9uIGVudGVyZWQgdGhlIHRyeSBib2R5XG4gICAgICAgICAgLy8gKGd1YXJkIHJlamVjdGlvbiBuZXZlciByZWFjaGVzIGhlcmUgXHUyMDE0IHNlZSBgY2FsbGAgaGFuZGxlciBhYm92ZSlcbiAgICAgICAgICBhd2FpdCBleGVjdXRlKG4uYWZ0ZXJ3YXJkcywgY3R4KVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0aHJldyAmJiAhbi5yZXNjdWUpIHtcbiAgICAgICAgLy8gQWxyZWFkeSByZS10aHJvd24gYWJvdmUgXHUyMDE0IHVucmVhY2hhYmxlLCBidXQgVHlwZVNjcmlwdCBuZWVkcyB0aGlzXG4gICAgICB9XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgYW5pbWF0aW9uIHByaW1pdGl2ZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdhbmltYXRpb24nOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBBbmltYXRpb25Ob2RlXG4gICAgICBjb25zdCBwcmltaXRpdmUgPSBjdHgubW9kdWxlcy5nZXQobi5wcmltaXRpdmUpXG5cbiAgICAgIGlmICghcHJpbWl0aXZlKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihjdHgubW9kdWxlcy5oaW50Rm9yKG4ucHJpbWl0aXZlKSlcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIC8vIFJlc29sdmUgc2VsZWN0b3IgXHUyMDE0IHN1YnN0aXR1dGUgYW55IGxvY2FsIHZhcmlhYmxlIHJlZmVyZW5jZXNcbiAgICAgIGNvbnN0IHNlbGVjdG9yID0gcmVzb2x2ZVNlbGVjdG9yKG4uc2VsZWN0b3IsIGN0eClcblxuICAgICAgLy8gRXZhbHVhdGUgb3B0aW9uc1xuICAgICAgY29uc3Qgb3B0aW9uczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fVxuICAgICAgZm9yIChjb25zdCBba2V5LCBleHByTm9kZV0gb2YgT2JqZWN0LmVudHJpZXMobi5vcHRpb25zKSkge1xuICAgICAgICBvcHRpb25zW2tleV0gPSBldmFsRXhwcihleHByTm9kZSwgY3R4KVxuICAgICAgfVxuXG4gICAgICAvLyBBd2FpdCB0aGUgYW5pbWF0aW9uIFx1MjAxNCB0aGlzIGlzIHRoZSBjb3JlIG9mIGFzeW5jIHRyYW5zcGFyZW5jeTpcbiAgICAgIC8vIFdlYiBBbmltYXRpb25zIEFQSSByZXR1cm5zIGFuIEFuaW1hdGlvbiB3aXRoIGEgLmZpbmlzaGVkIFByb21pc2UuXG4gICAgICAvLyBgdGhlbmAgaW4gTEVTIHNvdXJjZSBhd2FpdHMgdGhpcyBuYXR1cmFsbHkuXG4gICAgICBhd2FpdCBwcmltaXRpdmUoc2VsZWN0b3IsIG4uZHVyYXRpb24sIG4uZWFzaW5nLCBvcHRpb25zLCBjdHguaG9zdClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCByYXcgZXhwcmVzc2lvbiAoZXNjYXBlIGhhdGNoIC8gdW5rbm93biBzdGF0ZW1lbnRzKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdleHByJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgRXhwck5vZGVcbiAgICAgIGlmIChuLnJhdy50cmltKCkpIHtcbiAgICAgICAgLy8gRXZhbHVhdGUgYXMgYSBKUyBleHByZXNzaW9uIGZvciBzaWRlIGVmZmVjdHNcbiAgICAgICAgLy8gVGhpcyBoYW5kbGVzIHVua25vd24gcHJpbWl0aXZlcyBhbmQgZnV0dXJlIGtleXdvcmRzIGdyYWNlZnVsbHlcbiAgICAgICAgZXZhbEV4cHIobiwgY3R4KVxuICAgICAgfVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIGFjdGlvbiAoYmFyZSBAZ2V0IGV0Yy4gbm90IGluc2lkZSBhIGJpbmQpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIC8vIGBAZ2V0ICcvYXBpL2ZlZWQnIFtmaWx0ZXI6ICRhY3RpdmVGaWx0ZXJdYFxuICAgIC8vIEF3YWl0cyB0aGUgZnVsbCBTU0Ugc3RyZWFtIC8gSlNPTiByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgLy8gRGF0YXN0YXIgcHJvY2Vzc2VzIHRoZSBTU0UgZXZlbnRzIChwYXRjaC1lbGVtZW50cywgcGF0Y2gtc2lnbmFscykgYXNcbiAgICAvLyB0aGV5IGFycml2ZS4gVGhlIFByb21pc2UgcmVzb2x2ZXMgd2hlbiB0aGUgc3RyZWFtIGNsb3Nlcy5cbiAgICAvLyBgdGhlbmAgaW4gTEVTIGNvcnJlY3RseSB3YWl0cyBmb3IgdGhpcyBiZWZvcmUgcHJvY2VlZGluZy5cbiAgICBjYXNlICdhY3Rpb24nOiB7XG4gICAgICBjb25zdCBuID0gbm9kZVxuICAgICAgY29uc3QgZXZhbGVkQXJnczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fVxuICAgICAgZm9yIChjb25zdCBba2V5LCBleHByTm9kZV0gb2YgT2JqZWN0LmVudHJpZXMobi5hcmdzKSkge1xuICAgICAgICBldmFsZWRBcmdzW2tleV0gPSBldmFsRXhwcihleHByTm9kZSwgY3R4KVxuICAgICAgfVxuICAgICAgYXdhaXQgcGVyZm9ybUFjdGlvbihuLnZlcmIsIG4udXJsLCBldmFsZWRBcmdzLCBjdHgpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBkZWZhdWx0OiB7XG4gICAgICBjb25zdCBleGhhdXN0aXZlOiBuZXZlciA9IG5vZGVcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gVW5rbm93biBub2RlIHR5cGU6JywgKGV4aGF1c3RpdmUgYXMgTEVTTm9kZSkudHlwZSlcbiAgICB9XG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBFeHByZXNzaW9uIGV2YWx1YXRpb25cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEV2YWx1YXRlcyBhIHJhdyBKUyBleHByZXNzaW9uIHN0cmluZyBpbiBhIHNhbmRib3hlZCBjb250ZXh0IHRoYXRcbiAqIGV4cG9zZXMgc2NvcGUgbG9jYWxzIGFuZCBEYXRhc3RhciBzaWduYWxzIHZpYSBhIFByb3h5LlxuICpcbiAqIFNpZ25hbCBhY2Nlc3M6IGAkZmVlZFN0YXRlYCBcdTIxOTIgcmVhZHMgdGhlIGBmZWVkU3RhdGVgIHNpZ25hbFxuICogTG9jYWwgYWNjZXNzOiAgYGZpbHRlcmAgICAgXHUyMTkyIHJlYWRzIGZyb20gc2NvcGVcbiAqXG4gKiBUaGUgc2FuZGJveCBpcyBpbnRlbnRpb25hbGx5IHNpbXBsZSBmb3IgUGhhc2UgMy4gQSBwcm9wZXIgc2FuZGJveFxuICogKENTUC1jb21wYXRpYmxlLCBubyBldmFsIGZhbGxiYWNrKSBpcyBhIGZ1dHVyZSBoYXJkZW5pbmcgdGFzay5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV2YWxFeHByKG5vZGU6IEV4cHJOb2RlLCBjdHg6IExFU0NvbnRleHQpOiB1bmtub3duIHtcbiAgaWYgKCFub2RlLnJhdy50cmltKCkpIHJldHVybiB1bmRlZmluZWRcblxuICAvLyBGYXN0IHBhdGg6IHNpbXBsZSBzdHJpbmcgbGl0ZXJhbFxuICBpZiAobm9kZS5yYXcuc3RhcnRzV2l0aChcIidcIikgJiYgbm9kZS5yYXcuZW5kc1dpdGgoXCInXCIpKSB7XG4gICAgcmV0dXJuIG5vZGUucmF3LnNsaWNlKDEsIC0xKVxuICB9XG4gIC8vIEZhc3QgcGF0aDogbnVtYmVyIGxpdGVyYWxcbiAgY29uc3QgbnVtID0gTnVtYmVyKG5vZGUucmF3KVxuICBpZiAoIU51bWJlci5pc05hTihudW0pICYmIG5vZGUucmF3LnRyaW0oKSAhPT0gJycpIHJldHVybiBudW1cbiAgLy8gRmFzdCBwYXRoOiBib29sZWFuXG4gIGlmIChub2RlLnJhdyA9PT0gJ3RydWUnKSAgcmV0dXJuIHRydWVcbiAgaWYgKG5vZGUucmF3ID09PSAnZmFsc2UnKSByZXR1cm4gZmFsc2VcbiAgaWYgKG5vZGUucmF3ID09PSAnbnVsbCcgfHwgbm9kZS5yYXcgPT09ICduaWwnKSByZXR1cm4gbnVsbFxuXG4gIC8vIFx1MjUwMFx1MjUwMCBGYXN0IHBhdGhzIGZvciBjb21tb24gYW5pbWF0aW9uL29wdGlvbiB2YWx1ZSBwYXR0ZXJucyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgLy8gVGhlc2UgYXJlIG5vdCB2YWxpZCBKUyBleHByZXNzaW9ucyBidXQgYXBwZWFyIGFzIGFuaW1hdGlvbiBvcHRpb24gdmFsdWVzLlxuICAvLyBSZXR1cm4gdGhlbSBhcyBzdHJpbmdzIHNvIHRoZSBhbmltYXRpb24gbW9kdWxlIGNhbiBpbnRlcnByZXQgdGhlbSBkaXJlY3RseS5cbiAgaWYgKC9eXFxkKyhcXC5cXGQrKT9tcyQvLnRlc3Qobm9kZS5yYXcpKSByZXR1cm4gbm9kZS5yYXcgICAgICAgICAgICAgICAgICAgLy8gXCIyMG1zXCIsIFwiNDBtc1wiXG4gIGlmICgvXlthLXpBLVpdW2EtekEtWjAtOV8tXSokLy50ZXN0KG5vZGUucmF3KSkgcmV0dXJuIG5vZGUucmF3ICAgICAgICAgICAgLy8gXCJyZXZlcnNlXCIsIFwicmlnaHRcIiwgXCJlYXNlLW91dFwiXG4gIGlmICgvXihjdWJpYy1iZXppZXJ8c3RlcHN8bGluZWFyKVxcKC8udGVzdChub2RlLnJhdykpIHJldHVybiBub2RlLnJhdyAgICAgIC8vIFwiY3ViaWMtYmV6aWVyKDAuMjIsMSwwLjM2LDEpXG5cbiAgdHJ5IHtcbiAgICAvLyBCdWlsZCBhIGZsYXQgb2JqZWN0IG9mIGFsbCBhY2Nlc3NpYmxlIG5hbWVzOlxuICAgIC8vIC0gU2NvcGUgbG9jYWxzIChpbm5lcm1vc3Qgd2lucylcbiAgICAvLyAtIERhdGFzdGFyIHNpZ25hbHMgdmlhICQtcHJlZml4IHN0cmlwcGluZ1xuICAgIGNvbnN0IHNjb3BlU25hcHNob3QgPSBjdHguc2NvcGUuc25hcHNob3QoKVxuXG4gICAgLy8gRXh0cmFjdCBzaWduYWwgcmVmZXJlbmNlcyBmcm9tIHRoZSBleHByZXNzaW9uICgkbmFtZSBcdTIxOTIgbmFtZSlcbiAgICBjb25zdCBzaWduYWxOYW1lcyA9IFsuLi5ub2RlLnJhdy5tYXRjaEFsbCgvXFwkKFthLXpBLVpfXVxcdyopL2cpXVxuICAgICAgLm1hcChtID0+IG1bMV0hKVxuXG4gICAgY29uc3Qgc2lnbmFsczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fVxuICAgIGZvciAoY29uc3QgbmFtZSBvZiBzaWduYWxOYW1lcykge1xuICAgICAgc2lnbmFsc1tuYW1lXSA9IGN0eC5nZXRTaWduYWwobmFtZSlcbiAgICB9XG5cbiAgICAvLyBSZXdyaXRlICRuYW1lIFx1MjE5MiBfX3NpZ19uYW1lIGluIHRoZSBleHByZXNzaW9uIHNvIHdlIGNhbiBwYXNzIHNpZ25hbHNcbiAgICAvLyBhcyBwbGFpbiB2YXJpYWJsZXMgKGF2b2lkcyAkIGluIEpTIGlkZW50aWZpZXJzKVxuICAgIGxldCByZXdyaXR0ZW4gPSBub2RlLnJhd1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBzaWduYWxOYW1lcykge1xuICAgICAgcmV3cml0dGVuID0gcmV3cml0dGVuLnJlcGxhY2VBbGwoYCQke25hbWV9YCwgYF9fc2lnXyR7bmFtZX1gKVxuICAgIH1cblxuICAgIC8vIFByZWZpeCBzaWduYWwgdmFycyBpbiB0aGUgYmluZGluZyBvYmplY3RcbiAgICBjb25zdCBzaWdCaW5kaW5nczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fVxuICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKHNpZ25hbHMpKSB7XG4gICAgICBzaWdCaW5kaW5nc1tgX19zaWdfJHtrfWBdID0gdlxuICAgIH1cblxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1uZXctZnVuY1xuICAgIGNvbnN0IGZuID0gbmV3IEZ1bmN0aW9uKFxuICAgICAgLi4uT2JqZWN0LmtleXMoc2NvcGVTbmFwc2hvdCksXG4gICAgICAuLi5PYmplY3Qua2V5cyhzaWdCaW5kaW5ncyksXG4gICAgICBgcmV0dXJuICgke3Jld3JpdHRlbn0pYFxuICAgIClcbiAgICByZXR1cm4gZm4oXG4gICAgICAuLi5PYmplY3QudmFsdWVzKHNjb3BlU25hcHNob3QpLFxuICAgICAgLi4uT2JqZWN0LnZhbHVlcyhzaWdCaW5kaW5ncylcbiAgICApXG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUud2FybihgW0xFU10gRXhwcmVzc2lvbiBldmFsIGVycm9yOiAke0pTT04uc3RyaW5naWZ5KG5vZGUucmF3KX1gLCBlcnIpXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG59XG5cbi8qKlxuICogRXZhbHVhdGVzIGEgZ3VhcmQgZXhwcmVzc2lvbiBzdHJpbmcgKGZyb20gY29tbWFuZCBgZ3VhcmRgIGF0dHJpYnV0ZSkuXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGd1YXJkIHBhc3NlcyAoY29tbWFuZCBzaG91bGQgcnVuKSwgZmFsc2UgdG8gc2lsZW50LWFib3J0LlxuICovXG5mdW5jdGlvbiBldmFsR3VhcmQoZ3VhcmRFeHByOiBzdHJpbmcsIGN0eDogTEVTQ29udGV4dCk6IGJvb2xlYW4ge1xuICBjb25zdCByZXN1bHQgPSBldmFsRXhwcih7IHR5cGU6ICdleHByJywgcmF3OiBndWFyZEV4cHIgfSwgY3R4KVxuICByZXR1cm4gQm9vbGVhbihyZXN1bHQpXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gUGF0dGVybiBtYXRjaGluZ1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogQXR0ZW1wdHMgdG8gbWF0Y2ggYHN1YmplY3RgIGFnYWluc3QgYHBhdHRlcm5zYC5cbiAqXG4gKiBSZXR1cm5zIGEgYmluZGluZ3MgbWFwIGlmIG1hdGNoZWQgKGVtcHR5IG1hcCBmb3Igd2lsZGNhcmQvbGl0ZXJhbCBtYXRjaGVzKSxcbiAqIG9yIG51bGwgaWYgdGhlIG1hdGNoIGZhaWxzLlxuICpcbiAqIEZvciB0dXBsZSBwYXR0ZXJucywgYHN1YmplY3RgIGlzIG1hdGNoZWQgZWxlbWVudC1ieS1lbGVtZW50LlxuICogRm9yIG9yLXBhdHRlcm5zLCBhbnkgYWx0ZXJuYXRpdmUgbWF0Y2hpbmcgcmV0dXJucyB0aGUgYmluZGluZ3MuXG4gKi9cbmZ1bmN0aW9uIG1hdGNoUGF0dGVybnMoXG4gIHBhdHRlcm5zOiBQYXR0ZXJuTm9kZVtdLFxuICBzdWJqZWN0OiB1bmtub3duXG4pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IG51bGwge1xuICAvLyBTaW5nbGUtcGF0dGVybiAobW9zdCBjb21tb24pOiBtYXRjaCBkaXJlY3RseVxuICBpZiAocGF0dGVybnMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIG1hdGNoU2luZ2xlKHBhdHRlcm5zWzBdISwgc3ViamVjdClcbiAgfVxuXG4gIC8vIFR1cGxlIHBhdHRlcm46IHN1YmplY3QgbXVzdCBiZSBhbiBhcnJheVxuICBpZiAoIUFycmF5LmlzQXJyYXkoc3ViamVjdCkpIHtcbiAgICAvLyBXcmFwIHNpbmdsZSB2YWx1ZSBpbiB0dXBsZSBmb3IgZXJnb25vbWljc1xuICAgIC8vIGUuZy4gYFtpdCBva11gIGFnYWluc3QgYSB7b2s6IHRydWUsIGRhdGE6IC4uLn0gcmVzcG9uc2VcbiAgICByZXR1cm4gbWF0Y2hUdXBsZShwYXR0ZXJucywgc3ViamVjdClcbiAgfVxuXG4gIHJldHVybiBtYXRjaFR1cGxlKHBhdHRlcm5zLCBzdWJqZWN0KVxufVxuXG5mdW5jdGlvbiBtYXRjaFR1cGxlKFxuICBwYXR0ZXJuczogUGF0dGVybk5vZGVbXSxcbiAgc3ViamVjdDogdW5rbm93blxuKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsIHtcbiAgLy8gRm9yIG5vbi1hcnJheSBzdWJqZWN0cywgdHJ5IGJpbmRpbmcgZWFjaCBwYXR0ZXJuIGFnYWluc3QgdGhlIHdob2xlIHN1YmplY3RcbiAgLy8gKGhhbmRsZXMgYFtpdCBva11gIG1hdGNoaW5nIGFuIG9iamVjdCB3aGVyZSBgaXRgID0gb2JqZWN0LCBgb2tgID0gc3RhdHVzKVxuICBjb25zdCBiaW5kaW5nczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcGF0dGVybnMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBwYXQgPSBwYXR0ZXJuc1tpXSFcblxuICAgIC8vIEZvciB0dXBsZSBwYXR0ZXJucyBhZ2FpbnN0IG9iamVjdHMsIHdlIGRvIGEgc3RydWN0dXJhbCBtYXRjaDpcbiAgICAvLyBgW2l0IG9rXWAgYWdhaW5zdCB7ZGF0YTogLi4uLCBzdGF0dXM6ICdvayd9IGJpbmRzIGBpdGAgPSBkYXRhLCBgb2tgID0gJ29rJ1xuICAgIC8vIFRoaXMgaXMgYSBzaW1wbGlmaWNhdGlvbiBcdTIwMTQgZnVsbCBzdHJ1Y3R1cmFsIG1hdGNoaW5nIGNvbWVzIGluIGEgbGF0ZXIgcGFzc1xuICAgIGNvbnN0IHZhbHVlID0gQXJyYXkuaXNBcnJheShzdWJqZWN0KVxuICAgICAgPyBzdWJqZWN0W2ldXG4gICAgICA6IGkgPT09IDAgPyBzdWJqZWN0IDogdW5kZWZpbmVkXG5cbiAgICBjb25zdCByZXN1bHQgPSBtYXRjaFNpbmdsZShwYXQsIHZhbHVlKVxuICAgIGlmIChyZXN1bHQgPT09IG51bGwpIHJldHVybiBudWxsXG4gICAgT2JqZWN0LmFzc2lnbihiaW5kaW5ncywgcmVzdWx0KVxuICB9XG5cbiAgcmV0dXJuIGJpbmRpbmdzXG59XG5cbmZ1bmN0aW9uIG1hdGNoU2luZ2xlKFxuICBwYXR0ZXJuOiBQYXR0ZXJuTm9kZSxcbiAgdmFsdWU6IHVua25vd25cbik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbCB7XG4gIHN3aXRjaCAocGF0dGVybi5raW5kKSB7XG4gICAgY2FzZSAnd2lsZGNhcmQnOlxuICAgICAgcmV0dXJuIHt9ICAgLy8gQWx3YXlzIG1hdGNoZXMsIGJpbmRzIG5vdGhpbmdcblxuICAgIGNhc2UgJ2xpdGVyYWwnOlxuICAgICAgcmV0dXJuIHZhbHVlID09PSBwYXR0ZXJuLnZhbHVlID8ge30gOiBudWxsXG5cbiAgICBjYXNlICdiaW5kaW5nJzpcbiAgICAgIHJldHVybiB7IFtwYXR0ZXJuLm5hbWVdOiB2YWx1ZSB9ICAgLy8gQWx3YXlzIG1hdGNoZXMsIGJpbmRzIG5hbWUgXHUyMTkyIHZhbHVlXG5cbiAgICBjYXNlICdvcic6IHtcbiAgICAgIGZvciAoY29uc3QgYWx0IG9mIHBhdHRlcm4ucGF0dGVybnMpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gbWF0Y2hTaW5nbGUoYWx0LCB2YWx1ZSlcbiAgICAgICAgaWYgKHJlc3VsdCAhPT0gbnVsbCkgcmV0dXJuIHJlc3VsdFxuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBIVFRQIGFjdGlvblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogUGVyZm9ybXMgYW4gSFRUUCBhY3Rpb24gKEBnZXQsIEBwb3N0LCBldGMuKS5cbiAqXG4gKiBXaGVuIERhdGFzdGFyIGFjdGlvbnMgYXJlIGF2YWlsYWJsZSBpbiB0aGUgaG9zdCdzIGNvbnRleHQsIHdlIHRyaWdnZXJcbiAqIERhdGFzdGFyJ3MgZmV0Y2ggcGlwZWxpbmUgKHdoaWNoIGhhbmRsZXMgc2lnbmFsIHNlcmlhbGl6YXRpb24sIFNTRVxuICogcmVzcG9uc2UgcHJvY2Vzc2luZywgYW5kIGluZGljYXRvciBzaWduYWxzKS5cbiAqXG4gKiBGYWxscyBiYWNrIHRvIG5hdGl2ZSBmZXRjaCB3aGVuIERhdGFzdGFyIGlzIG5vdCBwcmVzZW50LlxuICpcbiAqIE5vdGU6IERhdGFzdGFyJ3MgQGdldCAvIEBwb3N0IGFyZSBmaXJlLWFuZC1mb3JnZXQgKHRoZXkgc3RyZWFtIFNTRSBiYWNrXG4gKiB0byBwYXRjaCBzaWduYWxzL2VsZW1lbnRzKS4gRm9yIHRoZSBiaW5kIGNhc2UgKGByZXNwb25zZSA8LSBAZ2V0IC4uLmApXG4gKiB3ZSB1c2UgbmF0aXZlIGZldGNoIHRvIGdldCBhIFByb21pc2UtYmFzZWQgSlNPTiByZXNwb25zZSB0aGF0IExFUyBjYW5cbiAqIGJpbmQgdG8gYSBsb2NhbCB2YXJpYWJsZS5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gcGVyZm9ybUFjdGlvbihcbiAgdmVyYjogc3RyaW5nLFxuICB1cmw6IHN0cmluZyxcbiAgYXJnczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIGN0eDogTEVTQ29udGV4dFxuKTogUHJvbWlzZTx1bmtub3duPiB7XG4gIGNvbnN0IG1ldGhvZCA9IHZlcmIudG9VcHBlckNhc2UoKVxuXG4gIGxldCBmdWxsVXJsID0gdXJsXG4gIGxldCBib2R5OiBzdHJpbmcgfCB1bmRlZmluZWRcblxuICBpZiAobWV0aG9kID09PSAnR0VUJyB8fCBtZXRob2QgPT09ICdERUxFVEUnKSB7XG4gICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcygpXG4gICAgZm9yIChjb25zdCBbaywgdl0gb2YgT2JqZWN0LmVudHJpZXMoYXJncykpIHtcbiAgICAgIHBhcmFtcy5zZXQoaywgU3RyaW5nKHYpKVxuICAgIH1cbiAgICBjb25zdCBxcyA9IHBhcmFtcy50b1N0cmluZygpXG4gICAgaWYgKHFzKSBmdWxsVXJsID0gYCR7dXJsfT8ke3FzfWBcbiAgfSBlbHNlIHtcbiAgICBib2R5ID0gSlNPTi5zdHJpbmdpZnkoYXJncylcbiAgfVxuXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goZnVsbFVybCwge1xuICAgIG1ldGhvZCxcbiAgICBoZWFkZXJzOiB7XG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgJ0FjY2VwdCc6ICd0ZXh0L2V2ZW50LXN0cmVhbSwgYXBwbGljYXRpb24vanNvbicsXG4gICAgfSxcbiAgICAuLi4oYm9keSA/IHsgYm9keSB9IDoge30pLFxuICB9KVxuXG4gIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFtMRVNdIEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9IGZyb20gJHttZXRob2R9ICR7dXJsfWApXG4gIH1cblxuICBjb25zdCBjb250ZW50VHlwZSA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKSA/PyAnJ1xuXG4gIC8vIFx1MjUwMFx1MjUwMCBTU0Ugc3RyZWFtOiBEYXRhc3RhciBzZXJ2ZXItc2VudCBldmVudHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gIC8vIFdoZW4gdGhlIHNlcnZlciByZXR1cm5zIHRleHQvZXZlbnQtc3RyZWFtLCBjb25zdW1lIHRoZSBTU0Ugc3RyZWFtIGFuZFxuICAvLyBhcHBseSBkYXRhc3Rhci1wYXRjaC1lbGVtZW50cyAvIGRhdGFzdGFyLXBhdGNoLXNpZ25hbHMgZXZlbnRzIG91cnNlbHZlcy5cbiAgLy8gVGhlIFByb21pc2UgcmVzb2x2ZXMgd2hlbiB0aGUgc3RyZWFtIGNsb3NlcyBcdTIwMTQgc28gYHRoZW5gIGluIExFUyBjb3JyZWN0bHlcbiAgLy8gd2FpdHMgZm9yIGFsbCBET00gcGF0Y2hlcyBiZWZvcmUgcHJvY2VlZGluZyB0byB0aGUgbmV4dCBzdGVwLlxuICBpZiAoY29udGVudFR5cGUuaW5jbHVkZXMoJ3RleHQvZXZlbnQtc3RyZWFtJykpIHtcbiAgICBhd2FpdCBjb25zdW1lU1NFU3RyZWFtKHJlc3BvbnNlLCBjdHgpXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG5cbiAgaWYgKGNvbnRlbnRUeXBlLmluY2x1ZGVzKCdhcHBsaWNhdGlvbi9qc29uJykpIHtcbiAgICByZXR1cm4gYXdhaXQgcmVzcG9uc2UuanNvbigpXG4gIH1cbiAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLnRleHQoKVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFNTRSBzdHJlYW0gY29uc3VtZXJcbi8vXG4vLyBSZWFkcyBhIERhdGFzdGFyIFNTRSBzdHJlYW0gbGluZS1ieS1saW5lIGFuZCBhcHBsaWVzIHRoZSBldmVudHMuXG4vLyBXZSBpbXBsZW1lbnQgYSBtaW5pbWFsIHN1YnNldCBvZiB0aGUgRGF0YXN0YXIgU1NFIHNwZWMgbmVlZGVkIGZvciBMRVM6XG4vL1xuLy8gICBkYXRhc3Rhci1wYXRjaC1lbGVtZW50cyAgXHUyMTkyIGFwcGx5IHRvIHRoZSBET00gdXNpbmcgbW9ycGhkb20tbGl0ZSBsb2dpY1xuLy8gICBkYXRhc3Rhci1wYXRjaC1zaWduYWxzICAgXHUyMTkyIHdyaXRlIHNpZ25hbCB2YWx1ZXMgdmlhIGN0eC5zZXRTaWduYWxcbi8vXG4vLyBUaGlzIHJ1bnMgZW50aXJlbHkgaW4gdGhlIGJyb3dzZXIgXHUyMDE0IG5vIERhdGFzdGFyIGludGVybmFsIEFQSXMgbmVlZGVkLlxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmFzeW5jIGZ1bmN0aW9uIGNvbnN1bWVTU0VTdHJlYW0oXG4gIHJlc3BvbnNlOiBSZXNwb25zZSxcbiAgY3R4OiBMRVNDb250ZXh0XG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKCFyZXNwb25zZS5ib2R5KSByZXR1cm5cblxuICBjb25zdCByZWFkZXIgID0gcmVzcG9uc2UuYm9keS5nZXRSZWFkZXIoKVxuICBjb25zdCBkZWNvZGVyID0gbmV3IFRleHREZWNvZGVyKClcbiAgbGV0IGJ1ZmZlciAgICA9ICcnXG5cbiAgLy8gU1NFIGV2ZW50IGFjY3VtdWxhdG9yIFx1MjAxNCByZXNldCBhZnRlciBlYWNoIGRvdWJsZS1uZXdsaW5lXG4gIGxldCBldmVudFR5cGUgPSAnJ1xuICBsZXQgZGF0YUxpbmVzOiBzdHJpbmdbXSA9IFtdXG5cbiAgY29uc3QgYXBwbHlFdmVudCA9ICgpID0+IHtcbiAgICBpZiAoIWV2ZW50VHlwZSB8fCBkYXRhTGluZXMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICAgIGlmIChldmVudFR5cGUgPT09ICdkYXRhc3Rhci1wYXRjaC1lbGVtZW50cycpIHtcbiAgICAgIGFwcGx5UGF0Y2hFbGVtZW50cyhkYXRhTGluZXMsIGN0eClcbiAgICB9IGVsc2UgaWYgKGV2ZW50VHlwZSA9PT0gJ2RhdGFzdGFyLXBhdGNoLXNpZ25hbHMnKSB7XG4gICAgICBhcHBseVBhdGNoU2lnbmFscyhkYXRhTGluZXMsIGN0eClcbiAgICB9XG5cbiAgICAvLyBSZXNldCBhY2N1bXVsYXRvclxuICAgIGV2ZW50VHlwZSA9ICcnXG4gICAgZGF0YUxpbmVzID0gW11cbiAgfVxuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgY29uc3QgeyBkb25lLCB2YWx1ZSB9ID0gYXdhaXQgcmVhZGVyLnJlYWQoKVxuICAgIGlmIChkb25lKSB7IGFwcGx5RXZlbnQoKTsgYnJlYWsgfVxuXG4gICAgYnVmZmVyICs9IGRlY29kZXIuZGVjb2RlKHZhbHVlLCB7IHN0cmVhbTogdHJ1ZSB9KVxuXG4gICAgLy8gUHJvY2VzcyBjb21wbGV0ZSBsaW5lcyBmcm9tIHRoZSBidWZmZXJcbiAgICBjb25zdCBsaW5lcyA9IGJ1ZmZlci5zcGxpdCgnXFxuJylcbiAgICBidWZmZXIgPSBsaW5lcy5wb3AoKSA/PyAnJyAgIC8vIGxhc3QgcGFydGlhbCBsaW5lIHN0YXlzIGluIGJ1ZmZlclxuXG4gICAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XG4gICAgICBpZiAobGluZS5zdGFydHNXaXRoKCdldmVudDonKSkge1xuICAgICAgICBldmVudFR5cGUgPSBsaW5lLnNsaWNlKCdldmVudDonLmxlbmd0aCkudHJpbSgpXG4gICAgICB9IGVsc2UgaWYgKGxpbmUuc3RhcnRzV2l0aCgnZGF0YTonKSkge1xuICAgICAgICBkYXRhTGluZXMucHVzaChsaW5lLnNsaWNlKCdkYXRhOicubGVuZ3RoKS50cmltU3RhcnQoKSlcbiAgICAgIH0gZWxzZSBpZiAobGluZSA9PT0gJycpIHtcbiAgICAgICAgLy8gQmxhbmsgbGluZSA9IGVuZCBvZiB0aGlzIFNTRSBldmVudFxuICAgICAgICBhcHBseUV2ZW50KClcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwIEFwcGx5IGRhdGFzdGFyLXBhdGNoLWVsZW1lbnRzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5mdW5jdGlvbiBhcHBseVBhdGNoRWxlbWVudHMoZGF0YUxpbmVzOiBzdHJpbmdbXSwgY3R4OiBMRVNDb250ZXh0KTogdm9pZCB7XG4gIC8vIFBhcnNlIHRoZSBzdHJ1Y3R1cmVkIGRhdGEgbGluZXMgaW50byBhbiBvcHRpb25zIG9iamVjdFxuICBsZXQgc2VsZWN0b3IgICAgPSAnJ1xuICBsZXQgbW9kZSAgICAgICAgPSAnb3V0ZXInXG4gIGNvbnN0IGh0bWxMaW5lczogc3RyaW5nW10gPSBbXVxuXG4gIGZvciAoY29uc3QgbGluZSBvZiBkYXRhTGluZXMpIHtcbiAgICBpZiAobGluZS5zdGFydHNXaXRoKCdzZWxlY3RvciAnKSkgIHsgc2VsZWN0b3IgPSBsaW5lLnNsaWNlKCdzZWxlY3RvciAnLmxlbmd0aCkudHJpbSgpOyBjb250aW51ZSB9XG4gICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnbW9kZSAnKSkgICAgICB7IG1vZGUgICAgID0gbGluZS5zbGljZSgnbW9kZSAnLmxlbmd0aCkudHJpbSgpOyAgICAgY29udGludWUgfVxuICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJ2VsZW1lbnRzICcpKSAgeyBodG1sTGluZXMucHVzaChsaW5lLnNsaWNlKCdlbGVtZW50cyAnLmxlbmd0aCkpOyAgIGNvbnRpbnVlIH1cbiAgICAvLyBMaW5lcyB3aXRoIG5vIHByZWZpeCBhcmUgYWxzbyBlbGVtZW50IGNvbnRlbnQgKERhdGFzdGFyIHNwZWMgYWxsb3dzIHRoaXMpXG4gICAgaHRtbExpbmVzLnB1c2gobGluZSlcbiAgfVxuXG4gIGNvbnN0IGh0bWwgPSBodG1sTGluZXMuam9pbignXFxuJykudHJpbSgpXG5cbiAgY29uc3QgdGFyZ2V0ID0gc2VsZWN0b3JcbiAgICA/IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpXG4gICAgOiBudWxsXG5cbiAgY29uc29sZS5sb2coYFtMRVM6c3NlXSBwYXRjaC1lbGVtZW50cyBtb2RlPSR7bW9kZX0gc2VsZWN0b3I9XCIke3NlbGVjdG9yfVwiIGh0bWwubGVuPSR7aHRtbC5sZW5ndGh9YClcblxuICBpZiAobW9kZSA9PT0gJ3JlbW92ZScpIHtcbiAgICAvLyBSZW1vdmUgYWxsIG1hdGNoaW5nIGVsZW1lbnRzXG4gICAgY29uc3QgdG9SZW1vdmUgPSBzZWxlY3RvclxuICAgICAgPyBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKVxuICAgICAgOiBbXVxuICAgIHRvUmVtb3ZlLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpXG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAobW9kZSA9PT0gJ2FwcGVuZCcgJiYgdGFyZ2V0KSB7XG4gICAgY29uc3QgZnJhZyA9IHBhcnNlSFRNTChodG1sKVxuICAgIHRhcmdldC5hcHBlbmQoZnJhZylcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChtb2RlID09PSAncHJlcGVuZCcgJiYgdGFyZ2V0KSB7XG4gICAgY29uc3QgZnJhZyA9IHBhcnNlSFRNTChodG1sKVxuICAgIHRhcmdldC5wcmVwZW5kKGZyYWcpXG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAobW9kZSA9PT0gJ2lubmVyJyAmJiB0YXJnZXQpIHtcbiAgICB0YXJnZXQuaW5uZXJIVE1MID0gaHRtbFxuICAgIHJldHVyblxuICB9XG5cbiAgaWYgKG1vZGUgPT09ICdvdXRlcicgJiYgdGFyZ2V0KSB7XG4gICAgY29uc3QgZnJhZyA9IHBhcnNlSFRNTChodG1sKVxuICAgIHRhcmdldC5yZXBsYWNlV2l0aChmcmFnKVxuICAgIHJldHVyblxuICB9XG5cbiAgaWYgKG1vZGUgPT09ICdiZWZvcmUnICYmIHRhcmdldCkge1xuICAgIGNvbnN0IGZyYWcgPSBwYXJzZUhUTUwoaHRtbClcbiAgICB0YXJnZXQuYmVmb3JlKGZyYWcpXG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAobW9kZSA9PT0gJ2FmdGVyJyAmJiB0YXJnZXQpIHtcbiAgICBjb25zdCBmcmFnID0gcGFyc2VIVE1MKGh0bWwpXG4gICAgdGFyZ2V0LmFmdGVyKGZyYWcpXG4gICAgcmV0dXJuXG4gIH1cblxuICAvLyBObyBzZWxlY3RvcjogdHJ5IHRvIHBhdGNoIGJ5IGVsZW1lbnQgSURzXG4gIGlmICghc2VsZWN0b3IgJiYgaHRtbCkge1xuICAgIGNvbnN0IGZyYWcgPSBwYXJzZUhUTUwoaHRtbClcbiAgICBmb3IgKGNvbnN0IGVsIG9mIEFycmF5LmZyb20oZnJhZy5jaGlsZHJlbikpIHtcbiAgICAgIGNvbnN0IGlkID0gZWwuaWRcbiAgICAgIGlmIChpZCkge1xuICAgICAgICBjb25zdCBleGlzdGluZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKVxuICAgICAgICBpZiAoZXhpc3RpbmcpIGV4aXN0aW5nLnJlcGxhY2VXaXRoKGVsKVxuICAgICAgICBlbHNlIGRvY3VtZW50LmJvZHkuYXBwZW5kKGVsKVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBwYXJzZUhUTUwoaHRtbDogc3RyaW5nKTogRG9jdW1lbnRGcmFnbWVudCB7XG4gIGNvbnN0IHRlbXBsYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKVxuICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSBodG1sXG4gIHJldHVybiB0ZW1wbGF0ZS5jb250ZW50XG59XG5cbi8vIFx1MjUwMFx1MjUwMCBBcHBseSBkYXRhc3Rhci1wYXRjaC1zaWduYWxzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5mdW5jdGlvbiBhcHBseVBhdGNoU2lnbmFscyhkYXRhTGluZXM6IHN0cmluZ1tdLCBjdHg6IExFU0NvbnRleHQpOiB2b2lkIHtcbiAgZm9yIChjb25zdCBsaW5lIG9mIGRhdGFMaW5lcykge1xuICAgIGlmICghbGluZS5zdGFydHNXaXRoKCdzaWduYWxzICcpICYmICFsaW5lLnN0YXJ0c1dpdGgoJ3snKSkgY29udGludWVcblxuICAgIGNvbnN0IGpzb25TdHIgPSBsaW5lLnN0YXJ0c1dpdGgoJ3NpZ25hbHMgJylcbiAgICAgID8gbGluZS5zbGljZSgnc2lnbmFscyAnLmxlbmd0aClcbiAgICAgIDogbGluZVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHNpZ25hbHMgPSBKU09OLnBhcnNlKGpzb25TdHIpIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhzaWduYWxzKSkge1xuICAgICAgICBjdHguc2V0U2lnbmFsKGtleSwgdmFsdWUpXG4gICAgICAgIGNvbnNvbGUubG9nKGBbTEVTOnNzZV0gcGF0Y2gtc2lnbmFscyAkJHtrZXl9ID1gLCB2YWx1ZSlcbiAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFUzpzc2VdIEZhaWxlZCB0byBwYXJzZSBwYXRjaC1zaWduYWxzIEpTT046JywganNvblN0cilcbiAgICB9XG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBTZWxlY3RvciByZXNvbHV0aW9uXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBSZXNvbHZlcyB2YXJpYWJsZSByZWZlcmVuY2VzIGluIGFuIGFuaW1hdGlvbiBzZWxlY3Rvci5cbiAqXG4gKiBFeGFtcGxlOiBgW2RhdGEtaXRlbS1pZDogaWRdYCB3aGVyZSBgaWRgIGlzIGEgbG9jYWwgdmFyaWFibGVcbiAqIGJlY29tZXMgYFtkYXRhLWl0ZW0taWQ9XCIxMjNcIl1gIGFmdGVyIHN1YnN0aXR1dGlvbi5cbiAqXG4gKiBTaW1wbGUgYXBwcm9hY2ggZm9yIFBoYXNlIDM6IGxvb2sgZm9yIGA6IHZhcm5hbWVgIHBhdHRlcm5zIGluIGF0dHJpYnV0ZVxuICogc2VsZWN0b3JzIGFuZCBzdWJzdGl0dXRlIGZyb20gc2NvcGUuXG4gKi9cbmZ1bmN0aW9uIHJlc29sdmVTZWxlY3RvcihzZWxlY3Rvcjogc3RyaW5nLCBjdHg6IExFU0NvbnRleHQpOiBzdHJpbmcge1xuICAvLyBSZXNvbHZlcyBMRVMgYXR0cmlidXRlIHNlbGVjdG9ycyB0aGF0IGNvbnRhaW4gdmFyaWFibGUgZXhwcmVzc2lvbnM6XG4gIC8vICAgW2RhdGEtaXRlbS1pZDogaWRdICAgICAgICAgICBcdTIxOTIgW2RhdGEtaXRlbS1pZD1cIjQyXCJdXG4gIC8vICAgW2RhdGEtY2FyZC1pZDogcGF5bG9hZFswXV0gICBcdTIxOTIgW2RhdGEtY2FyZC1pZD1cIjNcIl1cbiAgLy9cbiAgLy8gQSByZWdleCBpcyBpbnN1ZmZpY2llbnQgYmVjYXVzZSB0aGUgdmFyaWFibGUgZXhwcmVzc2lvbiBjYW4gaXRzZWxmIGNvbnRhaW5cbiAgLy8gYnJhY2tldHMgKGUuZy4gcGF5bG9hZFswXSksIHdoaWNoIHdvdWxkIGNvbmZ1c2UgYSBbXlxcXV0rIHBhdHRlcm4uXG4gIC8vIFdlIHVzZSBhIGJyYWNrZXQtZGVwdGgtYXdhcmUgc2Nhbm5lciBpbnN0ZWFkLlxuICBsZXQgcmVzdWx0ID0gJydcbiAgbGV0IGkgPSAwXG4gIHdoaWxlIChpIDwgc2VsZWN0b3IubGVuZ3RoKSB7XG4gICAgaWYgKHNlbGVjdG9yW2ldID09PSAnWycpIHtcbiAgICAgIC8vIExvb2sgZm9yIFwiOiBcIiAoY29sb24tc3BhY2UpIGFzIHRoZSBhdHRyL3ZhckV4cHIgc2VwYXJhdG9yXG4gICAgICBjb25zdCBjb2xvbklkeCA9IHNlbGVjdG9yLmluZGV4T2YoJzogJywgaSlcbiAgICAgIGlmIChjb2xvbklkeCA9PT0gLTEpIHsgcmVzdWx0ICs9IHNlbGVjdG9yW2krK107IGNvbnRpbnVlIH1cblxuICAgICAgLy8gU2NhbiBmb3J3YXJkIGZyb20gdGhlIHZhckV4cHIgc3RhcnQsIHRyYWNraW5nIGJyYWNrZXQgZGVwdGgsXG4gICAgICAvLyB0byBmaW5kIHRoZSBdIHRoYXQgY2xvc2VzIHRoaXMgYXR0cmlidXRlIHNlbGVjdG9yIChub3QgYW4gaW5uZXIgb25lKVxuICAgICAgbGV0IGRlcHRoID0gMFxuICAgICAgbGV0IGNsb3NlSWR4ID0gLTFcbiAgICAgIGZvciAobGV0IGogPSBjb2xvbklkeCArIDI7IGogPCBzZWxlY3Rvci5sZW5ndGg7IGorKykge1xuICAgICAgICBpZiAoc2VsZWN0b3Jbal0gPT09ICdbJykgZGVwdGgrK1xuICAgICAgICBlbHNlIGlmIChzZWxlY3RvcltqXSA9PT0gJ10nKSB7XG4gICAgICAgICAgaWYgKGRlcHRoID09PSAwKSB7IGNsb3NlSWR4ID0gajsgYnJlYWsgfVxuICAgICAgICAgIGRlcHRoLS1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGNsb3NlSWR4ID09PSAtMSkgeyByZXN1bHQgKz0gc2VsZWN0b3JbaSsrXTsgY29udGludWUgfVxuXG4gICAgICBjb25zdCBhdHRyICAgID0gc2VsZWN0b3Iuc2xpY2UoaSArIDEsIGNvbG9uSWR4KS50cmltKClcbiAgICAgIGNvbnN0IHZhckV4cHIgPSBzZWxlY3Rvci5zbGljZShjb2xvbklkeCArIDIsIGNsb3NlSWR4KS50cmltKClcbiAgICAgIGNvbnN0IHZhbHVlICAgPSBldmFsRXhwcih7IHR5cGU6ICdleHByJywgcmF3OiB2YXJFeHByIH0sIGN0eClcbiAgICAgIHJlc3VsdCArPSBgWyR7YXR0cn09XCIke1N0cmluZyh2YWx1ZSl9XCJdYFxuICAgICAgaSA9IGNsb3NlSWR4ICsgMVxuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQgKz0gc2VsZWN0b3JbaSsrXVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gR3VhcmQtYXdhcmUgY29tbWFuZCBleGVjdXRpb24gKHVzZWQgYnkgUGhhc2UgNCBldmVudCB3aXJpbmcpXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBFeGVjdXRlcyBhIGNvbW1hbmQgYnkgbmFtZSwgY2hlY2tpbmcgaXRzIGd1YXJkIGZpcnN0LlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBjb21tYW5kIHJhbiwgZmFsc2UgaWYgdGhlIGd1YXJkIHJlamVjdGVkIGl0LlxuICpcbiAqIFRoaXMgaXMgdGhlIHB1YmxpYyBBUEkgZm9yIFBoYXNlIDQgZXZlbnQgaGFuZGxlcnMgdGhhdCBjYWxsIGNvbW1hbmRzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuQ29tbWFuZChcbiAgbmFtZTogc3RyaW5nLFxuICBhcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgY3R4OiBMRVNDb250ZXh0XG4pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgZGVmID0gY3R4LmNvbW1hbmRzLmdldChuYW1lKVxuICBpZiAoIWRlZikge1xuICAgIGNvbnNvbGUud2FybihgW0xFU10gVW5rbm93biBjb21tYW5kOiBcIiR7bmFtZX1cImApXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICBpZiAoZGVmLmd1YXJkKSB7XG4gICAgaWYgKCFldmFsR3VhcmQoZGVmLmd1YXJkLCBjdHgpKSByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGNvbnN0IHNjb3BlID0gY3R4LnNjb3BlLmNoaWxkKClcbiAgZm9yIChjb25zdCBhcmdEZWYgb2YgZGVmLmFyZ3MpIHtcbiAgICBzY29wZS5zZXQoYXJnRGVmLm5hbWUsIGFyZ3NbYXJnRGVmLm5hbWVdID8/IG51bGwpXG4gIH1cblxuICBhd2FpdCBleGVjdXRlKGRlZi5ib2R5LCB7IC4uLmN0eCwgc2NvcGUgfSlcbiAgcmV0dXJuIHRydWVcbn1cbiIsICJpbXBvcnQgdHlwZSB7IExFU05vZGUsIEV4cHJOb2RlIH0gZnJvbSAnQHBhcnNlci9hc3QuanMnXG5cbi8qKiBBIHNpbmdsZSB0eXBlZCBhcmd1bWVudCBkZWZpbml0aW9uIGZyb20gYXJncz1cIltuYW1lOnR5cGUgIC4uLl1cIiAqL1xuZXhwb3J0IGludGVyZmFjZSBBcmdEZWYge1xuICBuYW1lOiBzdHJpbmdcbiAgLyoqICduaWwnIHwgJ2ludCcgfCAnZGVjJyB8ICdzdHInIHwgJ2FycicgfCAnb2JqJyB8ICdib29sJyB8ICdkeW4nICovXG4gIHR5cGU6IHN0cmluZ1xuICAvKiogRGVmYXVsdCB2YWx1ZSBleHByZXNzaW9uLCBpZiBwcm92aWRlZCAoZS5nLiBhdHRlbXB0OmludD0wKSAqL1xuICBkZWZhdWx0PzogRXhwck5vZGVcbn1cblxuLyoqIEEgZnVsbHkgcGFyc2VkIDxsb2NhbC1jb21tYW5kPiBkZWZpbml0aW9uLiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kRGVmIHtcbiAgbmFtZTogc3RyaW5nXG4gIGFyZ3M6IEFyZ0RlZltdXG4gIC8qKiBHdWFyZCBleHByZXNzaW9uIHN0cmluZyBcdTIwMTQgZXZhbHVhdGVkIGJlZm9yZSBleGVjdXRpb24uIEZhbHN5ID0gc2lsZW50IG5vLW9wLiAqL1xuICBndWFyZD86IHN0cmluZ1xuICAvKiogVGhlIHBhcnNlZCBib2R5IEFTVCAqL1xuICBib2R5OiBMRVNOb2RlXG4gIC8qKiBUaGUgPGxvY2FsLWNvbW1hbmQ+IERPTSBlbGVtZW50LCBrZXB0IGZvciBlcnJvciByZXBvcnRpbmcgKi9cbiAgZWxlbWVudDogRWxlbWVudFxufVxuXG5leHBvcnQgY2xhc3MgQ29tbWFuZFJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBjb21tYW5kcyA9IG5ldyBNYXA8c3RyaW5nLCBDb21tYW5kRGVmPigpXG5cbiAgcmVnaXN0ZXIoZGVmOiBDb21tYW5kRGVmKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuY29tbWFuZHMuaGFzKGRlZi5uYW1lKSkge1xuICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICBgW0xFU10gRHVwbGljYXRlIGNvbW1hbmQgXCIke2RlZi5uYW1lfVwiIFx1MjAxNCBwcmV2aW91cyBkZWZpbml0aW9uIG92ZXJ3cml0dGVuLmAsXG4gICAgICAgIGRlZi5lbGVtZW50XG4gICAgICApXG4gICAgfVxuICAgIHRoaXMuY29tbWFuZHMuc2V0KGRlZi5uYW1lLCBkZWYpXG4gIH1cblxuICBnZXQobmFtZTogc3RyaW5nKTogQ29tbWFuZERlZiB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuY29tbWFuZHMuZ2V0KG5hbWUpXG4gIH1cblxuICBoYXMobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY29tbWFuZHMuaGFzKG5hbWUpXG4gIH1cblxuICBuYW1lcygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5jb21tYW5kcy5rZXlzKCkpXG4gIH1cbn1cbiIsICIvLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIExFUyBNb2R1bGUgc3lzdGVtXG4vL1xuLy8gTW9kdWxlcyBleHRlbmQgdGhlIHNldCBvZiBhbmltYXRpb24vZWZmZWN0IHByaW1pdGl2ZXMgYXZhaWxhYmxlIGluXG4vLyA8bG9jYWwtY29tbWFuZD4gYm9kaWVzLiBUd28ga2luZHM6XG4vL1xuLy8gICBCdWlsdC1pbjogIDx1c2UtbW9kdWxlIHR5cGU9XCJhbmltYXRpb25cIj5cbi8vICAgVXNlcmxhbmQ6ICA8dXNlLW1vZHVsZSBzcmM9XCIuL3Njcm9sbC1lZmZlY3RzLmpzXCI+XG4vL1xuLy8gQm90aCByZXNvbHZlIHRvIGEgTEVTTW9kdWxlIGF0IHJ1bnRpbWUuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBBIHByaW1pdGl2ZSBpcyBhbiBhc3luYyBvcGVyYXRpb24gdGhlIGV4ZWN1dG9yIGRpc3BhdGNoZXMgZm9yIEFuaW1hdGlvbk5vZGUuXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yICBDU1Mgc2VsZWN0b3Igc3RyaW5nIChhbHJlYWR5IHJlc29sdmVkIFx1MjAxNCBubyB2YXJpYWJsZSBzdWJzdGl0dXRpb24gbmVlZGVkIGhlcmUpXG4gKiBAcGFyYW0gZHVyYXRpb24gIG1pbGxpc2Vjb25kc1xuICogQHBhcmFtIGVhc2luZyAgICBDU1MgZWFzaW5nIHN0cmluZywgZS5nLiAnZWFzZS1vdXQnXG4gKiBAcGFyYW0gb3B0aW9ucyAgIGtleS92YWx1ZSBvcHRpb25zIGZyb20gdGhlIHRyYWlsaW5nIFsuLi5dIGJsb2NrLCBhbHJlYWR5IGV2YWx1YXRlZFxuICogQHBhcmFtIGhvc3QgICAgICB0aGUgPGxvY2FsLWV2ZW50LXNjcmlwdD4gZWxlbWVudCAodXNlZCBhcyBxdWVyeVNlbGVjdG9yIHJvb3QpXG4gKi9cbmV4cG9ydCB0eXBlIExFU1ByaW1pdGl2ZSA9IChcbiAgc2VsZWN0b3I6IHN0cmluZyxcbiAgZHVyYXRpb246IG51bWJlcixcbiAgZWFzaW5nOiBzdHJpbmcsXG4gIG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICBob3N0OiBFbGVtZW50XG4pID0+IFByb21pc2U8dm9pZD5cblxuLyoqIFRoZSBzaGFwZSBhIHVzZXJsYW5kIG1vZHVsZSBtdXN0IGV4cG9ydCBhcyBpdHMgZGVmYXVsdCBleHBvcnQuICovXG5leHBvcnQgaW50ZXJmYWNlIExFU01vZHVsZSB7XG4gIC8qKiBIdW1hbi1yZWFkYWJsZSBuYW1lIGZvciBlcnJvciBtZXNzYWdlcyAqL1xuICBuYW1lOiBzdHJpbmdcbiAgcHJpbWl0aXZlczogUmVjb3JkPHN0cmluZywgTEVTUHJpbWl0aXZlPlxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgUmVnaXN0cnkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBjbGFzcyBNb2R1bGVSZWdpc3RyeSB7XG4gIHByaXZhdGUgcHJpbWl0aXZlcyA9IG5ldyBNYXA8c3RyaW5nLCBMRVNQcmltaXRpdmU+KClcbiAgcHJpdmF0ZSBsb2FkZWRNb2R1bGVzOiBzdHJpbmdbXSA9IFtdXG5cbiAgcmVnaXN0ZXIobW9kdWxlOiBMRVNNb2R1bGUpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBmbl0gb2YgT2JqZWN0LmVudHJpZXMobW9kdWxlLnByaW1pdGl2ZXMpKSB7XG4gICAgICB0aGlzLnByaW1pdGl2ZXMuc2V0KG5hbWUsIGZuKVxuICAgIH1cbiAgICB0aGlzLmxvYWRlZE1vZHVsZXMucHVzaChtb2R1bGUubmFtZSlcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gbW9kdWxlIGxvYWRlZDogXCIke21vZHVsZS5uYW1lfVwiYCwgT2JqZWN0LmtleXMobW9kdWxlLnByaW1pdGl2ZXMpKVxuICB9XG5cbiAgZ2V0KHByaW1pdGl2ZTogc3RyaW5nKTogTEVTUHJpbWl0aXZlIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5wcmltaXRpdmVzLmdldChwcmltaXRpdmUpXG4gIH1cblxuICBoYXMocHJpbWl0aXZlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5wcmltaXRpdmVzLmhhcyhwcmltaXRpdmUpXG4gIH1cblxuICAvKiogRGV2LW1vZGUgaGVscDogd2hpY2ggbW9kdWxlIGV4cG9ydHMgYSBnaXZlbiBwcmltaXRpdmU/ICovXG4gIGhpbnRGb3IocHJpbWl0aXZlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIC8vIFdpbGwgYmUgZW5yaWNoZWQgaW4gUGhhc2UgOCB3aXRoIHBlci1tb2R1bGUgcHJpbWl0aXZlIG1hbmlmZXN0cy5cbiAgICByZXR1cm4gYFByaW1pdGl2ZSBcIiR7cHJpbWl0aXZlfVwiIG5vdCBmb3VuZC4gTG9hZGVkIG1vZHVsZXM6IFske3RoaXMubG9hZGVkTW9kdWxlcy5qb2luKCcsICcpfV0uIERpZCB5b3UgZm9yZ2V0IDx1c2UtbW9kdWxlIHR5cGU9XCJhbmltYXRpb25cIj4/YFxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBMb2FkZXIgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKiBCdWlsdC1pbiBtb2R1bGUgcmVnaXN0cnk6IHR5cGUgbmFtZSBcdTIxOTIgaW1wb3J0IHBhdGggKi9cbmNvbnN0IEJVSUxUSU5fTU9EVUxFUzogUmVjb3JkPHN0cmluZywgKCkgPT4gUHJvbWlzZTx7IGRlZmF1bHQ6IExFU01vZHVsZSB9Pj4gPSB7XG4gIGFuaW1hdGlvbjogKCkgPT4gaW1wb3J0KCcuL2J1aWx0aW4vYW5pbWF0aW9uLmpzJyksXG59XG5cbi8qKlxuICogUmVzb2x2ZSBhIDx1c2UtbW9kdWxlPiBlbGVtZW50IHRvIGEgTEVTTW9kdWxlIGFuZCByZWdpc3RlciBpdC5cbiAqIENhbGxlZCBkdXJpbmcgUGhhc2UgMSBET00gcmVhZGluZyAoUGhhc2UgOCBjb21wbGV0ZXMgdGhlIHNyYz0gcGF0aCkuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkTW9kdWxlKFxuICByZWdpc3RyeTogTW9kdWxlUmVnaXN0cnksXG4gIG9wdHM6IHsgdHlwZT86IHN0cmluZzsgc3JjPzogc3RyaW5nIH1cbik6IFByb21pc2U8dm9pZD4ge1xuICBpZiAob3B0cy50eXBlKSB7XG4gICAgY29uc3QgbG9hZGVyID0gQlVJTFRJTl9NT0RVTEVTW29wdHMudHlwZV1cbiAgICBpZiAoIWxvYWRlcikge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTXSBVbmtub3duIGJ1aWx0LWluIG1vZHVsZSB0eXBlOiBcIiR7b3B0cy50eXBlfVwiLiBBdmFpbGFibGU6ICR7T2JqZWN0LmtleXMoQlVJTFRJTl9NT0RVTEVTKS5qb2luKCcsICcpfWApXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uc3QgbW9kID0gYXdhaXQgbG9hZGVyKClcbiAgICByZWdpc3RyeS5yZWdpc3Rlcihtb2QuZGVmYXVsdClcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChvcHRzLnNyYykge1xuICAgIHRyeSB7XG4gICAgICAvLyBSZXNvbHZlIHJlbGF0aXZlIHBhdGhzIGFnYWluc3QgdGhlIHBhZ2UgVVJMLCBub3QgdGhlIGJ1bmRsZSBVUkwuXG4gICAgICAvLyBXaXRob3V0IHRoaXMsICcuL3Njcm9sbC1lZmZlY3RzLmpzJyByZXNvbHZlcyB0byAnL2Rpc3Qvc2Nyb2xsLWVmZmVjdHMuanMnXG4gICAgICAvLyAocmVsYXRpdmUgdG8gdGhlIGJ1bmRsZSBhdCAvZGlzdC9sb2NhbC1ldmVudC1zY3JpcHQuanMpIGluc3RlYWQgb2ZcbiAgICAgIC8vICcvc2Nyb2xsLWVmZmVjdHMuanMnIChyZWxhdGl2ZSB0byB0aGUgSFRNTCBwYWdlKS5cbiAgICAgIGNvbnN0IHJlc29sdmVkU3JjID0gbmV3IFVSTChvcHRzLnNyYywgZG9jdW1lbnQuYmFzZVVSSSkuaHJlZlxuICAgICAgY29uc3QgbW9kID0gYXdhaXQgaW1wb3J0KC8qIEB2aXRlLWlnbm9yZSAqLyByZXNvbHZlZFNyYylcbiAgICAgIGlmICghbW9kLmRlZmF1bHQgfHwgdHlwZW9mIG1vZC5kZWZhdWx0LnByaW1pdGl2ZXMgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgW0xFU10gTW9kdWxlIGF0IFwiJHtvcHRzLnNyY31cIiBkb2VzIG5vdCBleHBvcnQgYSB2YWxpZCBMRVNNb2R1bGUuIEV4cGVjdGVkOiB7IG5hbWU6IHN0cmluZywgcHJpbWl0aXZlczogUmVjb3JkPHN0cmluZywgRnVuY3Rpb24+IH1gKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKG1vZC5kZWZhdWx0IGFzIExFU01vZHVsZSlcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFtMRVNdIEZhaWxlZCB0byBsb2FkIG1vZHVsZSBmcm9tIFwiJHtvcHRzLnNyY31cIjpgLCBlcnIpXG4gICAgfVxuICAgIHJldHVyblxuICB9XG5cbiAgY29uc29sZS53YXJuKCdbTEVTXSA8dXNlLW1vZHVsZT4gcmVxdWlyZXMgZWl0aGVyIHR5cGU9IG9yIHNyYz0gYXR0cmlidXRlLicpXG59XG4iLCAiLyoqXG4gKiBTdHJpcHMgdGhlIGJhY2t0aWNrIHdyYXBwZXIgZnJvbSBhIG11bHRpLWxpbmUgTEVTIGJvZHkgc3RyaW5nIGFuZFxuICogbm9ybWFsaXplcyBpbmRlbnRhdGlvbiwgcHJvZHVjaW5nIGEgY2xlYW4gc3RyaW5nIHRoZSBwYXJzZXIgY2FuIHdvcmsgd2l0aC5cbiAqXG4gKiBDb252ZW50aW9uOlxuICogICBTaW5nbGUtbGluZTogIGhhbmRsZT1cImVtaXQgZmVlZDppbml0XCIgICAgICAgICAgIFx1MjE5MiBcImVtaXQgZmVlZDppbml0XCJcbiAqICAgTXVsdGktbGluZTogICBkbz1cImBcXG4gICAgICBzZXQuLi5cXG4gICAgYFwiICAgICAgICBcdTIxOTIgXCJzZXQuLi5cXG4uLi5cIlxuICpcbiAqIEFsZ29yaXRobTpcbiAqICAgMS4gVHJpbSBvdXRlciB3aGl0ZXNwYWNlIGZyb20gdGhlIHJhdyBhdHRyaWJ1dGUgdmFsdWUuXG4gKiAgIDIuIElmIHdyYXBwZWQgaW4gYmFja3RpY2tzLCBzdHJpcCB0aGVtIFx1MjAxNCBkbyBOT1QgaW5uZXItdHJpbSB5ZXQuXG4gKiAgIDMuIFNwbGl0IGludG8gbGluZXMgYW5kIGNvbXB1dGUgbWluaW11bSBub24temVybyBpbmRlbnRhdGlvblxuICogICAgICBhY3Jvc3MgYWxsIG5vbi1lbXB0eSBsaW5lcy4gVGhpcyBpcyB0aGUgSFRNTCBhdHRyaWJ1dGUgaW5kZW50YXRpb25cbiAqICAgICAgbGV2ZWwgdG8gcmVtb3ZlLlxuICogICA0LiBTdHJpcCB0aGF0IG1hbnkgbGVhZGluZyBjaGFyYWN0ZXJzIGZyb20gZXZlcnkgbGluZS5cbiAqICAgNS4gRHJvcCBsZWFkaW5nL3RyYWlsaW5nIGJsYW5rIGxpbmVzLCByZXR1cm4gam9pbmVkIHJlc3VsdC5cbiAqXG4gKiBDcnVjaWFsbHksIHN0ZXAgMiBkb2VzIE5PVCBjYWxsIC50cmltKCkgb24gdGhlIGlubmVyIGNvbnRlbnQgYmVmb3JlXG4gKiBjb21wdXRpbmcgaW5kZW50YXRpb24uIEFuIGlubmVyIC50cmltKCkgd291bGQgZGVzdHJveSB0aGUgbGVhZGluZ1xuICogd2hpdGVzcGFjZSBvbiBsaW5lIDEsIG1ha2luZyBtaW5JbmRlbnQgPSAwIGFuZCBsZWF2aW5nIGFsbCBvdGhlclxuICogbGluZXMgdW4tZGUtaW5kZW50ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJpcEJvZHkocmF3OiBzdHJpbmcpOiBzdHJpbmcge1xuICBsZXQgcyA9IHJhdy50cmltKClcblxuICAvLyBTdHJpcCBiYWNrdGljayB3cmFwcGVyIFx1MjAxNCBidXQgcHJlc2VydmUgaW50ZXJuYWwgd2hpdGVzcGFjZSBmb3IgZGUtaW5kZW50XG4gIGlmIChzLnN0YXJ0c1dpdGgoJ2AnKSAmJiBzLmVuZHNXaXRoKCdgJykpIHtcbiAgICBzID0gcy5zbGljZSgxLCAtMSlcbiAgICAvLyBEbyBOT1QgLnRyaW0oKSBoZXJlIFx1MjAxNCB0aGF0IGtpbGxzIHRoZSBsZWFkaW5nIGluZGVudCBvbiBsaW5lIDFcbiAgfVxuXG4gIGNvbnN0IGxpbmVzID0gcy5zcGxpdCgnXFxuJylcbiAgY29uc3Qgbm9uRW1wdHkgPSBsaW5lcy5maWx0ZXIobCA9PiBsLnRyaW0oKS5sZW5ndGggPiAwKVxuICBpZiAobm9uRW1wdHkubGVuZ3RoID09PSAwKSByZXR1cm4gJydcblxuICAvLyBGb3Igc2luZ2xlLWxpbmUgdmFsdWVzIChubyBuZXdsaW5lcyBhZnRlciBiYWNrdGljayBzdHJpcCksIGp1c3QgdHJpbVxuICBpZiAobGluZXMubGVuZ3RoID09PSAxKSByZXR1cm4gcy50cmltKClcblxuICAvLyBNaW5pbXVtIGxlYWRpbmcgd2hpdGVzcGFjZSBhY3Jvc3Mgbm9uLWVtcHR5IGxpbmVzXG4gIGNvbnN0IG1pbkluZGVudCA9IG5vbkVtcHR5LnJlZHVjZSgobWluLCBsaW5lKSA9PiB7XG4gICAgY29uc3QgbGVhZGluZyA9IGxpbmUubWF0Y2goL14oXFxzKikvKT8uWzFdPy5sZW5ndGggPz8gMFxuICAgIHJldHVybiBNYXRoLm1pbihtaW4sIGxlYWRpbmcpXG4gIH0sIEluZmluaXR5KVxuXG4gIGNvbnN0IHN0cmlwcGVkID0gbWluSW5kZW50ID09PSAwIHx8IG1pbkluZGVudCA9PT0gSW5maW5pdHlcbiAgICA/IGxpbmVzXG4gICAgOiBsaW5lcy5tYXAobGluZSA9PiBsaW5lLmxlbmd0aCA+PSBtaW5JbmRlbnQgPyBsaW5lLnNsaWNlKG1pbkluZGVudCkgOiBsaW5lLnRyaW1TdGFydCgpKVxuXG4gIC8vIERyb3AgbGVhZGluZyBhbmQgdHJhaWxpbmcgYmxhbmsgbGluZXMgKHRoZSBuZXdsaW5lcyBhcm91bmQgYmFja3RpY2sgY29udGVudClcbiAgbGV0IHN0YXJ0ID0gMFxuICBsZXQgZW5kID0gc3RyaXBwZWQubGVuZ3RoIC0gMVxuICB3aGlsZSAoc3RhcnQgPD0gZW5kICYmIHN0cmlwcGVkW3N0YXJ0XT8udHJpbSgpID09PSAnJykgc3RhcnQrK1xuICB3aGlsZSAoZW5kID49IHN0YXJ0ICYmIHN0cmlwcGVkW2VuZF0/LnRyaW0oKSA9PT0gJycpIGVuZC0tXG5cbiAgcmV0dXJuIHN0cmlwcGVkLnNsaWNlKHN0YXJ0LCBlbmQgKyAxKS5qb2luKCdcXG4nKVxufVxuIiwgImltcG9ydCB0eXBlIHtcbiAgTEVTQ29uZmlnLFxuICBNb2R1bGVEZWNsLFxuICBDb21tYW5kRGVjbCxcbiAgRXZlbnRIYW5kbGVyRGVjbCxcbiAgU2lnbmFsV2F0Y2hlckRlY2wsXG4gIE9uTG9hZERlY2wsXG4gIE9uRW50ZXJEZWNsLFxuICBPbkV4aXREZWNsLFxufSBmcm9tICcuL2NvbmZpZy5qcydcbmltcG9ydCB7IHN0cmlwQm9keSB9IGZyb20gJy4vc3RyaXBCb2R5LmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFRhZyBuYW1lIFx1MjE5MiBoYW5kbGVyIG1hcFxuLy8gRWFjaCBoYW5kbGVyIHJlYWRzIGF0dHJpYnV0ZXMgZnJvbSBhIGNoaWxkIGVsZW1lbnQgYW5kIHB1c2hlcyBhIHR5cGVkIGRlY2xcbi8vIGludG8gdGhlIGNvbmZpZyBiZWluZyBidWlsdC4gVW5rbm93biB0YWdzIGFyZSBjb2xsZWN0ZWQgZm9yIHdhcm5pbmcuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxudHlwZSBIYW5kbGVyID0gKGVsOiBFbGVtZW50LCBjb25maWc6IExFU0NvbmZpZykgPT4gdm9pZFxuXG5jb25zdCBIQU5ETEVSUzogUmVjb3JkPHN0cmluZywgSGFuZGxlcj4gPSB7XG5cbiAgJ3VzZS1tb2R1bGUnKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCB0eXBlID0gZWwuZ2V0QXR0cmlidXRlKCd0eXBlJyk/LnRyaW0oKSA/PyBudWxsXG4gICAgY29uc3Qgc3JjICA9IGVsLmdldEF0dHJpYnV0ZSgnc3JjJyk/LnRyaW0oKSAgPz8gbnVsbFxuXG4gICAgaWYgKCF0eXBlICYmICFzcmMpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPHVzZS1tb2R1bGU+IGhhcyBuZWl0aGVyIHR5cGU9IG5vciBzcmM9IFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uZmlnLm1vZHVsZXMucHVzaCh7IHR5cGUsIHNyYywgZWxlbWVudDogZWwgfSlcbiAgfSxcblxuICAnbG9jYWwtY29tbWFuZCcoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IG5hbWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpID8/ICcnXG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgnZG8nKT8udHJpbSgpICAgPz8gJydcblxuICAgIGlmICghbmFtZSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8bG9jYWwtY29tbWFuZD4gbWlzc2luZyByZXF1aXJlZCBuYW1lPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVNdIDxsb2NhbC1jb21tYW5kIG5hbWU9XCIke25hbWV9XCI+IG1pc3NpbmcgcmVxdWlyZWQgZG89IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC5gLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbmZpZy5jb21tYW5kcy5wdXNoKHtcbiAgICAgIG5hbWUsXG4gICAgICBhcmdzUmF3OiBlbC5nZXRBdHRyaWJ1dGUoJ2FyZ3MnKT8udHJpbSgpICA/PyAnJyxcbiAgICAgIGd1YXJkOiAgIGVsLmdldEF0dHJpYnV0ZSgnZ3VhcmQnKT8udHJpbSgpID8/IG51bGwsXG4gICAgICBib2R5OiAgICBzdHJpcEJvZHkoYm9keSksXG4gICAgICBlbGVtZW50OiBlbCxcbiAgICB9KVxuICB9LFxuXG4gICdvbi1ldmVudCcoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IG5hbWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpICAgPz8gJydcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdoYW5kbGUnKT8udHJpbSgpID8/ICcnXG5cbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPG9uLWV2ZW50PiBtaXNzaW5nIHJlcXVpcmVkIG5hbWU9IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBpZiAoIWJvZHkpIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFU10gPG9uLWV2ZW50IG5hbWU9XCIke25hbWV9XCI+IG1pc3NpbmcgcmVxdWlyZWQgaGFuZGxlPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuYCwgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25maWcub25FdmVudC5wdXNoKHsgbmFtZSwgYm9keTogc3RyaXBCb2R5KGJvZHkpLCBlbGVtZW50OiBlbCB9KVxuICB9LFxuXG4gICdvbi1zaWduYWwnKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCBuYW1lID0gZWwuZ2V0QXR0cmlidXRlKCduYW1lJyk/LnRyaW0oKSAgID8/ICcnXG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgnaGFuZGxlJyk/LnRyaW0oKSA/PyAnJ1xuXG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDxvbi1zaWduYWw+IG1pc3NpbmcgcmVxdWlyZWQgbmFtZT0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTXSA8b24tc2lnbmFsIG5hbWU9XCIke25hbWV9XCI+IG1pc3NpbmcgcmVxdWlyZWQgaGFuZGxlPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuYCwgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25maWcub25TaWduYWwucHVzaCh7XG4gICAgICBuYW1lLFxuICAgICAgd2hlbjogICAgZWwuZ2V0QXR0cmlidXRlKCd3aGVuJyk/LnRyaW0oKSA/PyBudWxsLFxuICAgICAgYm9keTogICAgc3RyaXBCb2R5KGJvZHkpLFxuICAgICAgZWxlbWVudDogZWwsXG4gICAgfSlcbiAgfSxcblxuICAnb24tbG9hZCcoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IGJvZHkgPSBlbC5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgICBpZiAoIWJvZHkpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPG9uLWxvYWQ+IG1pc3NpbmcgcmVxdWlyZWQgcnVuPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uZmlnLm9uTG9hZC5wdXNoKHsgYm9keTogc3RyaXBCb2R5KGJvZHkpLCBlbGVtZW50OiBlbCB9KVxuICB9LFxuXG4gICdvbi1lbnRlcicoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IGJvZHkgPSBlbC5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgICBpZiAoIWJvZHkpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPG9uLWVudGVyPiBtaXNzaW5nIHJlcXVpcmVkIHJ1bj0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGNvbmZpZy5vbkVudGVyLnB1c2goe1xuICAgICAgd2hlbjogICAgZWwuZ2V0QXR0cmlidXRlKCd3aGVuJyk/LnRyaW0oKSA/PyBudWxsLFxuICAgICAgYm9keTogICAgc3RyaXBCb2R5KGJvZHkpLFxuICAgICAgZWxlbWVudDogZWwsXG4gICAgfSlcbiAgfSxcblxuICAnb24tZXhpdCcoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IGJvZHkgPSBlbC5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgICBpZiAoIWJvZHkpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPG9uLWV4aXQ+IG1pc3NpbmcgcmVxdWlyZWQgcnVuPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uZmlnLm9uRXhpdC5wdXNoKHsgYm9keTogc3RyaXBCb2R5KGJvZHkpLCBlbGVtZW50OiBlbCB9KVxuICB9LFxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIHJlYWRDb25maWcgXHUyMDE0IHRoZSBwdWJsaWMgZW50cnkgcG9pbnRcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFdhbGtzIHRoZSBkaXJlY3QgY2hpbGRyZW4gb2YgYSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBlbGVtZW50IGFuZFxuICogcHJvZHVjZXMgYSBzdHJ1Y3R1cmVkIExFU0NvbmZpZy5cbiAqXG4gKiBPbmx5IGRpcmVjdCBjaGlsZHJlbiBhcmUgcmVhZCBcdTIwMTQgbmVzdGVkIGVsZW1lbnRzIGluc2lkZSBhIDxsb2NhbC1jb21tYW5kPlxuICogYm9keSBhcmUgbm90IGNoaWxkcmVuIG9mIHRoZSBob3N0IGFuZCBhcmUgbmV2ZXIgdmlzaXRlZCBoZXJlLlxuICpcbiAqIFVua25vd24gY2hpbGQgZWxlbWVudHMgZW1pdCBhIGNvbnNvbGUud2FybiBhbmQgYXJlIGNvbGxlY3RlZCBpbiBjb25maWcudW5rbm93blxuICogc28gdG9vbGluZyAoZS5nLiBhIGZ1dHVyZSBMRVMgbGFuZ3VhZ2Ugc2VydmVyKSBjYW4gcmVwb3J0IHRoZW0uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkQ29uZmlnKGhvc3Q6IEVsZW1lbnQpOiBMRVNDb25maWcge1xuICBjb25zdCBjb25maWc6IExFU0NvbmZpZyA9IHtcbiAgICBpZDogICAgICAgaG9zdC5pZCB8fCAnKG5vIGlkKScsXG4gICAgbW9kdWxlczogIFtdLFxuICAgIGNvbW1hbmRzOiBbXSxcbiAgICBvbkV2ZW50OiAgW10sXG4gICAgb25TaWduYWw6IFtdLFxuICAgIG9uTG9hZDogICBbXSxcbiAgICBvbkVudGVyOiAgW10sXG4gICAgb25FeGl0OiAgIFtdLFxuICAgIHVua25vd246ICBbXSxcbiAgfVxuXG4gIGZvciAoY29uc3QgY2hpbGQgb2YgQXJyYXkuZnJvbShob3N0LmNoaWxkcmVuKSkge1xuICAgIGNvbnN0IHRhZyA9IGNoaWxkLnRhZ05hbWUudG9Mb3dlckNhc2UoKVxuICAgIGNvbnN0IGhhbmRsZXIgPSBIQU5ETEVSU1t0YWddXG5cbiAgICBpZiAoaGFuZGxlcikge1xuICAgICAgaGFuZGxlcihjaGlsZCwgY29uZmlnKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25maWcudW5rbm93bi5wdXNoKGNoaWxkKVxuICAgICAgLy8gT25seSB3YXJuIGZvciBoeXBoZW5hdGVkIGN1c3RvbSBlbGVtZW50IG5hbWVzIFx1MjAxNCB0aG9zZSBhcmUgbGlrZWx5XG4gICAgICAvLyBtaXMtdHlwZWQgTEVTIGtleXdvcmRzLiBQbGFpbiBIVE1MIGVsZW1lbnRzIChkaXYsIHAsIHNlY3Rpb24sIGV0Yy4pXG4gICAgICAvLyBhcmUgdmFsaWQgY29udGVudCBjaGlsZHJlbiBhbmQgcGFzcyB0aHJvdWdoIHNpbGVudGx5LlxuICAgICAgaWYgKHRhZy5pbmNsdWRlcygnLScpKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICBgW0xFU10gVW5rbm93biBjaGlsZCBlbGVtZW50IDwke3RhZ30+IGluc2lkZSA8bG9jYWwtZXZlbnQtc2NyaXB0IGlkPVwiJHtjb25maWcuaWR9XCI+IFx1MjAxNCBpZ25vcmVkLiBEaWQgeW91IG1lYW4gYSBMRVMgZWxlbWVudD9gLFxuICAgICAgICAgIGNoaWxkXG4gICAgICAgIClcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gY29uZmlnXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gbG9nQ29uZmlnIFx1MjAxNCBzdHJ1Y3R1cmVkIGNoZWNrcG9pbnQgbG9nXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBMb2dzIGEgc3VtbWFyeSBvZiBhIHBhcnNlZCBMRVNDb25maWcuXG4gKiBQaGFzZSAxIGNoZWNrcG9pbnQ6IHlvdSBzaG91bGQgc2VlIHRoaXMgaW4gdGhlIGJyb3dzZXIgY29uc29sZS9kZWJ1ZyBsb2dcbiAqIHdpdGggYWxsIGNvbW1hbmRzLCBldmVudHMsIGFuZCBzaWduYWwgd2F0Y2hlcnMgY29ycmVjdGx5IGxpc3RlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvZ0NvbmZpZyhjb25maWc6IExFU0NvbmZpZyk6IHZvaWQge1xuICBjb25zdCBpZCA9IGNvbmZpZy5pZFxuICBjb25zb2xlLmxvZyhgW0xFU10gY29uZmlnIHJlYWQgZm9yICMke2lkfWApXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG1vZHVsZXM6ICAgJHtjb25maWcubW9kdWxlcy5sZW5ndGh9YCwgY29uZmlnLm1vZHVsZXMubWFwKG0gPT4gbS50eXBlID8/IG0uc3JjKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgY29tbWFuZHM6ICAke2NvbmZpZy5jb21tYW5kcy5sZW5ndGh9YCwgY29uZmlnLmNvbW1hbmRzLm1hcChjID0+IGMubmFtZSkpXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG9uLWV2ZW50OiAgJHtjb25maWcub25FdmVudC5sZW5ndGh9YCwgY29uZmlnLm9uRXZlbnQubWFwKGUgPT4gZS5uYW1lKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tc2lnbmFsOiAke2NvbmZpZy5vblNpZ25hbC5sZW5ndGh9YCwgY29uZmlnLm9uU2lnbmFsLm1hcChzID0+IHMubmFtZSkpXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG9uLWxvYWQ6ICAgJHtjb25maWcub25Mb2FkLmxlbmd0aH1gKVxuICBjb25zb2xlLmxvZyhgW0xFU10gICBvbi1lbnRlcjogICR7Y29uZmlnLm9uRW50ZXIubGVuZ3RofWAsIGNvbmZpZy5vbkVudGVyLm1hcChlID0+IGUud2hlbiA/PyAnYWx3YXlzJykpXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG9uLWV4aXQ6ICAgJHtjb25maWcub25FeGl0Lmxlbmd0aH1gKVxuXG4gIGNvbnN0IHVua25vd25DdXN0b20gPSBjb25maWcudW5rbm93bi5maWx0ZXIoZSA9PiBlLnRhZ05hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnLScpKVxuICBpZiAodW5rbm93bkN1c3RvbS5sZW5ndGggPiAwKSB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTXSAgIHVua25vd24gY3VzdG9tIGNoaWxkcmVuOiAke3Vua25vd25DdXN0b20ubGVuZ3RofWAsIHVua25vd25DdXN0b20ubWFwKGUgPT4gZS50YWdOYW1lLnRvTG93ZXJDYXNlKCkpKVxuICB9XG5cbiAgLy8gTG9nIGEgc2FtcGxpbmcgb2YgYm9keSBzdHJpbmdzIHRvIHZlcmlmeSBzdHJpcEJvZHkgd29ya2VkIGNvcnJlY3RseVxuICBpZiAoY29uZmlnLmNvbW1hbmRzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBmaXJzdCA9IGNvbmZpZy5jb21tYW5kc1swXVxuICAgIGlmIChmaXJzdCkge1xuICAgICAgY29uc29sZS5sb2coYFtMRVNdICAgZmlyc3QgY29tbWFuZCBib2R5IHByZXZpZXcgKFwiJHtmaXJzdC5uYW1lfVwiKTpgKVxuICAgICAgY29uc3QgcHJldmlldyA9IGZpcnN0LmJvZHkuc3BsaXQoJ1xcbicpLnNsaWNlKDAsIDQpLmpvaW4oJ1xcbiAgJylcbiAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSAgIHwgJHtwcmV2aWV3fWApXG4gICAgfVxuICB9XG59XG4iLCAiLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBMRVMgVG9rZW5pemVyXG4vL1xuLy8gQ29udmVydHMgYSBzdHJpcEJvZHknZCBzb3VyY2Ugc3RyaW5nIGludG8gYSBmbGF0IGFycmF5IG9mIFRva2VuIG9iamVjdHMuXG4vLyBUb2tlbnMgYXJlIHNpbXBseSBub24tYmxhbmsgbGluZXMgd2l0aCB0aGVpciBpbmRlbnQgbGV2ZWwgcmVjb3JkZWQuXG4vLyBObyBzZW1hbnRpYyBhbmFseXNpcyBoYXBwZW5zIGhlcmUgXHUyMDE0IHRoYXQncyB0aGUgcGFyc2VyJ3Mgam9iLlxuLy9cbi8vIFRoZSB0b2tlbml6ZXIgaXMgZGVsaWJlcmF0ZWx5IG1pbmltYWw6IGl0IHByZXNlcnZlcyB0aGUgcmF3IGluZGVudGF0aW9uXG4vLyBpbmZvcm1hdGlvbiB0aGUgcGFyc2VyIG5lZWRzIHRvIHVuZGVyc3RhbmQgYmxvY2sgc3RydWN0dXJlLlxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBpbnRlcmZhY2UgVG9rZW4ge1xuICAvKiogQ29sdW1uIG9mZnNldCBvZiB0aGUgZmlyc3Qgbm9uLXdoaXRlc3BhY2UgY2hhcmFjdGVyIChudW1iZXIgb2Ygc3BhY2VzKSAqL1xuICBpbmRlbnQ6IG51bWJlclxuICAvKiogVHJpbW1lZCBsaW5lIGNvbnRlbnQgXHUyMDE0IG5vIGxlYWRpbmcvdHJhaWxpbmcgd2hpdGVzcGFjZSAqL1xuICB0ZXh0OiBzdHJpbmdcbiAgLyoqIDEtYmFzZWQgbGluZSBudW1iZXIgaW4gdGhlIHN0cmlwcGVkIHNvdXJjZSAoZm9yIGVycm9yIG1lc3NhZ2VzKSAqL1xuICBsaW5lTnVtOiBudW1iZXJcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhIHN0cmlwcGVkIExFUyBib2R5IHN0cmluZyBpbnRvIGEgVG9rZW4gYXJyYXkuXG4gKiBCbGFuayBsaW5lcyBhcmUgZHJvcHBlZC4gVGFicyBhcmUgZXhwYW5kZWQgdG8gMiBzcGFjZXMgZWFjaC5cbiAqXG4gKiBAcGFyYW0gc291cmNlICBBIHN0cmluZyBhbHJlYWR5IHByb2Nlc3NlZCBieSBzdHJpcEJvZHkoKSBcdTIwMTQgbm8gYmFja3RpY2sgd3JhcHBlcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b2tlbml6ZShzb3VyY2U6IHN0cmluZyk6IFRva2VuW10ge1xuICBjb25zdCB0b2tlbnM6IFRva2VuW10gPSBbXVxuICBjb25zdCBsaW5lcyA9IHNvdXJjZS5zcGxpdCgnXFxuJylcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgcmF3ID0gKGxpbmVzW2ldID8/ICcnKS5yZXBsYWNlKC9cXHQvZywgJyAgJylcbiAgICBjb25zdCB0ZXh0ID0gcmF3LnRyaW0oKVxuXG4gICAgLy8gU2tpcCBibGFuayBsaW5lc1xuICAgIGlmICh0ZXh0Lmxlbmd0aCA9PT0gMCkgY29udGludWVcblxuICAgIGNvbnN0IGluZGVudCA9IHJhdy5sZW5ndGggLSByYXcudHJpbVN0YXJ0KCkubGVuZ3RoXG5cbiAgICB0b2tlbnMucHVzaCh7XG4gICAgICBpbmRlbnQsXG4gICAgICB0ZXh0LFxuICAgICAgbGluZU51bTogaSArIDEsXG4gICAgfSlcbiAgfVxuXG4gIHJldHVybiB0b2tlbnNcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBIZWxwZXJzIHVzZWQgYnkgYm90aCB0aGUgdG9rZW5pemVyIHRlc3RzIGFuZCB0aGUgcGFyc2VyXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgYHRleHRgIGVuZHMgd2l0aCBhIHN0YW5kYWxvbmUgYGFuZGAgd29yZC5cbiAqIFVzZWQgYnkgdGhlIHBhcnNlciB0byBkZXRlY3QgcGFyYWxsZWwgYnJhbmNoZXMuXG4gKlxuICogQ2FyZWZ1bDogXCJlbmdsYW5kXCIsIFwiYmFuZFwiLCBcImNvbW1hbmRcIiBtdXN0IE5PVCBtYXRjaC5cbiAqIFdlIHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5IGJlZm9yZSBgYW5kYCBhbmQgZW5kLW9mLXN0cmluZyBhZnRlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuZHNXaXRoQW5kKHRleHQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gL1xcYmFuZCQvLnRlc3QodGV4dClcbn1cblxuLyoqXG4gKiBTdHJpcHMgdGhlIHRyYWlsaW5nIGAgYW5kYCBmcm9tIGEgbGluZSB0aGF0IGVuZHNXaXRoQW5kLlxuICogUmV0dXJucyB0aGUgdHJpbW1lZCBsaW5lIGNvbnRlbnQgd2l0aG91dCBpdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwVHJhaWxpbmdBbmQodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvXFxzK2FuZCQvLCAnJykudHJpbUVuZCgpXG59XG5cbi8qKlxuICogQmxvY2sgdGVybWluYXRvciB0b2tlbnMgXHUyMDE0IHNpZ25hbCB0aGUgZW5kIG9mIGEgbWF0Y2ggb3IgdHJ5IGJsb2NrLlxuICogVGhlc2UgYXJlIGNvbnN1bWVkIGJ5IHRoZSBibG9jay1vd25pbmcgcGFyc2VyIChwYXJzZU1hdGNoIC8gcGFyc2VUcnkpLFxuICogbm90IGJ5IHBhcnNlQmxvY2sgaXRzZWxmLlxuICovXG5leHBvcnQgY29uc3QgQkxPQ0tfVEVSTUlOQVRPUlMgPSBuZXcgU2V0KFsnL21hdGNoJywgJy90cnknXSlcblxuLyoqXG4gKiBLZXl3b3JkcyB0aGF0IGVuZCBhIHRyeSBib2R5IGFuZCBzdGFydCBhIHJlc2N1ZS9hZnRlcndhcmRzIGNsYXVzZS5cbiAqIFJlY29nbml6ZWQgb25seSB3aGVuIHRoZXkgYXBwZWFyIGF0IHRoZSBzYW1lIGluZGVudCBsZXZlbCBhcyB0aGUgYHRyeWAuXG4gKi9cbmV4cG9ydCBjb25zdCBUUllfQ0xBVVNFX0tFWVdPUkRTID0gbmV3IFNldChbJ3Jlc2N1ZScsICdhZnRlcndhcmRzJ10pXG4iLCAiaW1wb3J0IHR5cGUge1xuICBMRVNOb2RlLCBFeHByTm9kZSwgU2VxdWVuY2VOb2RlLCBQYXJhbGxlbE5vZGUsXG4gIFNldE5vZGUsIEVtaXROb2RlLCBCcm9hZGNhc3ROb2RlLCBXYWl0Tm9kZSwgQ2FsbE5vZGUsXG4gIEJpbmROb2RlLCBBY3Rpb25Ob2RlLCBNYXRjaE5vZGUsIE1hdGNoQXJtLCBQYXR0ZXJuTm9kZSxcbiAgVHJ5Tm9kZSwgQW5pbWF0aW9uTm9kZSxcbn0gZnJvbSAnLi9hc3QuanMnXG5pbXBvcnQgdHlwZSB7IFRva2VuIH0gZnJvbSAnLi90b2tlbml6ZXIuanMnXG5pbXBvcnQge1xuICBlbmRzV2l0aEFuZCwgc3RyaXBUcmFpbGluZ0FuZCxcbiAgQkxPQ0tfVEVSTUlOQVRPUlMsIFRSWV9DTEFVU0VfS0VZV09SRFMsXG59IGZyb20gJy4vdG9rZW5pemVyLmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEtub3duIGFuaW1hdGlvbiBwcmltaXRpdmUgbmFtZXMgKHJlZ2lzdGVyZWQgYnkgdGhlIGFuaW1hdGlvbiBtb2R1bGUpXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgQU5JTUFUSU9OX1BSSU1JVElWRVMgPSBuZXcgU2V0KFtcbiAgJ2ZhZGUtaW4nLCAnZmFkZS1vdXQnLCAnc2xpZGUtaW4nLCAnc2xpZGUtb3V0JyxcbiAgJ3NsaWRlLXVwJywgJ3NsaWRlLWRvd24nLCAncHVsc2UnLFxuICAnc3RhZ2dlci1lbnRlcicsICdzdGFnZ2VyLWV4aXQnLFxuXSlcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXJzZXJcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5leHBvcnQgY2xhc3MgTEVTUGFyc2VyIHtcbiAgcHJpdmF0ZSBwb3MgPSAwXG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSB0b2tlbnM6IFRva2VuW10pIHt9XG5cbiAgcHJpdmF0ZSBwZWVrKG9mZnNldCA9IDApOiBUb2tlbiB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMudG9rZW5zW3RoaXMucG9zICsgb2Zmc2V0XVxuICB9XG5cbiAgcHJpdmF0ZSBhZHZhbmNlKCk6IFRva2VuIHtcbiAgICBjb25zdCB0ID0gdGhpcy50b2tlbnNbdGhpcy5wb3NdXG4gICAgaWYgKCF0KSB0aHJvdyBuZXcgTEVTUGFyc2VFcnJvcignVW5leHBlY3RlZCBlbmQgb2YgaW5wdXQnLCB1bmRlZmluZWQpXG4gICAgdGhpcy5wb3MrK1xuICAgIHJldHVybiB0XG4gIH1cblxuICBwcml2YXRlIGF0RW5kKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnBvcyA+PSB0aGlzLnRva2Vucy5sZW5ndGhcbiAgfVxuXG4gIHByaXZhdGUgdHJ5Q29uc3VtZSh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB0ID0gdGhpcy5wZWVrKClcbiAgICBpZiAodD8udGV4dCA9PT0gdGV4dCkgeyB0aGlzLnBvcysrOyByZXR1cm4gdHJ1ZSB9XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgRW50cnkgcG9pbnQgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcGFyc2UoKTogTEVTTm9kZSB7XG4gICAgY29uc3Qgbm9kZSA9IHRoaXMucGFyc2VCbG9jaygtMSlcbiAgICByZXR1cm4gbm9kZVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEJsb2NrIHBhcnNlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKipcbiAgICogUGFyc2VzIGFsbCBzdGF0ZW1lbnRzIGF0IGluZGVudCA+IGJhc2VJbmRlbnQuXG4gICAqXG4gICAqIFN0b3BzIHdoZW4gaXQgZW5jb3VudGVyczpcbiAgICogICAtIEEgdG9rZW4gd2l0aCBpbmRlbnQgPD0gYmFzZUluZGVudFxuICAgKiAgIC0gQSBibG9jayB0ZXJtaW5hdG9yICgvbWF0Y2gsIC90cnkpIFx1MjAxNCBsZWZ0IGZvciB0aGUgcGFyZW50IHRvIGNvbnN1bWVcbiAgICogICAtIEEgdHJ5LWNsYXVzZSBrZXl3b3JkIChyZXNjdWUsIGFmdGVyd2FyZHMpIGF0IGluZGVudCA8PSBiYXNlSW5kZW50XG4gICAqICAgLSBFbmQgb2YgdG9rZW4gc3RyZWFtXG4gICAqXG4gICAqIFJldHVybnMgYSBTZXF1ZW5jZU5vZGUgaWYgbXVsdGlwbGUgc3RlcHMsIG90aGVyd2lzZSB0aGUgc2luZ2xlIG5vZGUuXG4gICAqL1xuICBwcml2YXRlIHBhcnNlQmxvY2soYmFzZUluZGVudDogbnVtYmVyKTogTEVTTm9kZSB7XG4gICAgY29uc3Qgc3RlcHM6IExFU05vZGVbXSA9IFtdXG5cbiAgICB3aGlsZSAoIXRoaXMuYXRFbmQoKSkge1xuICAgICAgY29uc3QgdCA9IHRoaXMucGVlaygpIVxuXG4gICAgICAvLyBTdG9wOiB3ZSd2ZSByZXR1cm5lZCB0byBvciBwYXN0IHRoZSBwYXJlbnQgYmxvY2sncyBpbmRlbnRcbiAgICAgIGlmICh0LmluZGVudCA8PSBiYXNlSW5kZW50KSBicmVha1xuXG4gICAgICAvLyBTdG9wOiBibG9jayB0ZXJtaW5hdG9ycyBhcmUgY29uc3VtZWQgYnkgdGhlIGJsb2NrIG9wZW5lciAobWF0Y2gvdHJ5KVxuICAgICAgaWYgKEJMT0NLX1RFUk1JTkFUT1JTLmhhcyh0LnRleHQpKSBicmVha1xuXG4gICAgICAvLyBTdG9wOiB0cnktY2xhdXNlIGtleXdvcmRzIGVuZCB0aGUgY3VycmVudCB0cnkgYm9keVxuICAgICAgaWYgKFRSWV9DTEFVU0VfS0VZV09SRFMuaGFzKHQudGV4dCkgJiYgdC5pbmRlbnQgPD0gYmFzZUluZGVudCArIDIpIGJyZWFrXG5cbiAgICAgIC8vIFx1MjUwMFx1MjUwMCBTZXF1ZW50aWFsIGNvbm5lY3RpdmU6IHN0YW5kYWxvbmUgYHRoZW5gIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgICAgLy8gYHRoZW5gIGFsb25lIG9uIGEgbGluZSBpbnRyb2R1Y2VzIHRoZSBuZXh0IHNlcXVlbnRpYWwgc3RlcCxcbiAgICAgIC8vIHdoaWNoIGlzIGEgYmxvY2sgYXQgYSBkZWVwZXIgaW5kZW50IGxldmVsLlxuICAgICAgaWYgKHQudGV4dCA9PT0gJ3RoZW4nKSB7XG4gICAgICAgIGNvbnN0IHRoZW5JbmRlbnQgPSB0LmluZGVudFxuICAgICAgICB0aGlzLmFkdmFuY2UoKSAvLyBjb25zdW1lIGB0aGVuYFxuICAgICAgICBjb25zdCBuZXh0ID0gdGhpcy5wZWVrKClcbiAgICAgICAgaWYgKG5leHQgJiYgbmV4dC5pbmRlbnQgPiB0aGVuSW5kZW50KSB7XG4gICAgICAgICAgY29uc3Qgc3RlcCA9IHRoaXMucGFyc2VCbG9jayh0aGVuSW5kZW50KVxuICAgICAgICAgIHN0ZXBzLnB1c2goc3RlcClcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyBcdTI1MDBcdTI1MDAgU2VxdWVudGlhbCBjb25uZWN0aXZlOiBgdGhlbiBYYCBhcyBwcmVmaXggXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgICAvLyBgdGhlbiBjYWxsIGZvb2AsIGB0aGVuIGVtaXQgYmFyYCwgZXRjLlxuICAgICAgLy8gVGhlIGB0aGVuYCBpcyBqdXN0IGEgdmlzdWFsIHNlcXVlbmNlciBcdTIwMTQgdGhlIHJlc3Qgb2YgdGhlIGxpbmUgaXMgdGhlIHN0ZXAuXG4gICAgICBpZiAodC50ZXh0LnN0YXJ0c1dpdGgoJ3RoZW4gJykpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICAgICAgY29uc3QgcmVzdCA9IHQudGV4dC5zbGljZSg1KS50cmltKClcbiAgICAgICAgY29uc3Qgc3RlcCA9IHRoaXMucGFyc2VTaW5nbGVMaW5lKHJlc3QsIHQuaW5kZW50LCB0KVxuICAgICAgICBzdGVwcy5wdXNoKHN0ZXApXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIFx1MjUwMFx1MjUwMCBSZWd1bGFyIHN0YXRlbWVudCAocG9zc2libHkgYSBwYXJhbGxlbCBncm91cCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgICBjb25zdCBzdG10ID0gdGhpcy5wYXJzZVN0YXRlbWVudE9yUGFyYWxsZWwodC5pbmRlbnQpXG4gICAgICBzdGVwcy5wdXNoKHN0bXQpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRvU2VxdWVuY2VPclNpbmdsZShzdGVwcylcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBQYXJhbGxlbCBncm91cCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKipcbiAgICogUGFyc2VzIG9uZSBzdGF0ZW1lbnQgb3IgYSBncm91cCBvZiBwYXJhbGxlbCBzdGF0ZW1lbnRzIGNvbm5lY3RlZCBieSBgYW5kYC5cbiAgICpcbiAgICogTGluZXMgZW5kaW5nIHdpdGggYSBzdGFuZGFsb25lIGBhbmRgIGluZGljYXRlIHRoYXQgdGhlIG5leHQgbGluZSBydW5zXG4gICAqIGNvbmN1cnJlbnRseS4gQWxsIHBhcmFsbGVsIGJyYW5jaGVzIGFyZSB3cmFwcGVkIGluIGEgUGFyYWxsZWxOb2RlLlxuICAgKlxuICAgKiBgYW5kYC1ncm91cHMgb25seSBhcHBseSB3aXRoaW4gdGhlIHNhbWUgaW5kZW50IGxldmVsLiBBIGRlZXBlci1pbmRlbnRlZFxuICAgKiBsaW5lIGFmdGVyIGBhbmRgIGlzIGFuIGVycm9yICh3b3VsZCBpbmRpY2F0ZSBhIGJsb2NrLCBidXQgYGFuZGAgaXNcbiAgICogYSBsaW5lLWxldmVsIGNvbm5lY3Rvciwgbm90IGEgYmxvY2sgb3BlbmVyKS5cbiAgICovXG4gIHByaXZhdGUgcGFyc2VTdGF0ZW1lbnRPclBhcmFsbGVsKGJsb2NrSW5kZW50OiBudW1iZXIpOiBMRVNOb2RlIHtcbiAgICBjb25zdCBicmFuY2hlczogTEVTTm9kZVtdID0gW11cblxuICAgIHdoaWxlICghdGhpcy5hdEVuZCgpKSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy5wZWVrKCkhXG5cbiAgICAgIC8vIFN0b3AgY29uZGl0aW9ucyBcdTIwMTQgc2FtZSBhcyBwYXJzZUJsb2NrJ3NcbiAgICAgIGlmICh0LmluZGVudCA8IGJsb2NrSW5kZW50KSBicmVha1xuICAgICAgaWYgKHQuaW5kZW50ID4gYmxvY2tJbmRlbnQpIGJyZWFrICAgLy8gc2hvdWxkbid0IGhhcHBlbiBoZXJlLCBzYWZldHkgZ3VhcmRcbiAgICAgIGlmIChCTE9DS19URVJNSU5BVE9SUy5oYXModC50ZXh0KSkgYnJlYWtcbiAgICAgIGlmIChUUllfQ0xBVVNFX0tFWVdPUkRTLmhhcyh0LnRleHQpKSBicmVha1xuICAgICAgaWYgKHQudGV4dCA9PT0gJ3RoZW4nIHx8IHQudGV4dC5zdGFydHNXaXRoKCd0aGVuICcpKSBicmVha1xuXG4gICAgICBjb25zdCBoYXNBbmQgPSBlbmRzV2l0aEFuZCh0LnRleHQpXG4gICAgICBjb25zdCBsaW5lVGV4dCA9IGhhc0FuZCA/IHN0cmlwVHJhaWxpbmdBbmQodC50ZXh0KSA6IHQudGV4dFxuXG4gICAgICB0aGlzLmFkdmFuY2UoKVxuXG4gICAgICBjb25zdCBzdG10ID0gdGhpcy5wYXJzZVNpbmdsZUxpbmUobGluZVRleHQsIHQuaW5kZW50LCB0KVxuICAgICAgYnJhbmNoZXMucHVzaChzdG10KVxuXG4gICAgICBpZiAoIWhhc0FuZCkgYnJlYWtcbiAgICB9XG5cbiAgICBpZiAoYnJhbmNoZXMubGVuZ3RoID09PSAwKSByZXR1cm4gZXhwcignJylcbiAgICBpZiAoYnJhbmNoZXMubGVuZ3RoID09PSAxKSByZXR1cm4gYnJhbmNoZXNbMF0hXG4gICAgcmV0dXJuIHsgdHlwZTogJ3BhcmFsbGVsJywgYnJhbmNoZXMgfSBzYXRpc2ZpZXMgUGFyYWxsZWxOb2RlXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgU2luZ2xlLWxpbmUgZGlzcGF0Y2ggXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgLyoqXG4gICAqIFBhcnNlcyBhIHNpbmdsZSBzdGF0ZW1lbnQgZnJvbSBpdHMgdGV4dCBjb250ZW50LlxuICAgKiBUaGUgdGV4dCBoYXMgYWxyZWFkeSBoYWQgYHRoZW4gYCBwcmVmaXggYW5kIHRyYWlsaW5nIGAgYW5kYCBzdHJpcHBlZC5cbiAgICpcbiAgICogRGlzcGF0Y2ggb3JkZXIgbWF0dGVyczogbW9yZSBzcGVjaWZpYyBwYXR0ZXJucyBtdXN0IGNvbWUgYmVmb3JlIGdlbmVyYWwgb25lcy5cbiAgICovXG4gIHByaXZhdGUgcGFyc2VTaW5nbGVMaW5lKHRleHQ6IHN0cmluZywgaW5kZW50OiBudW1iZXIsIHRva2VuOiBUb2tlbik6IExFU05vZGUge1xuICAgIGNvbnN0IGZpcnN0ID0gZmlyc3RXb3JkKHRleHQpXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgQmxvY2sgY29uc3RydWN0cyAoY29uc3VtZSBtdWx0aXBsZSBmb2xsb3dpbmcgdG9rZW5zKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAoZmlyc3QgPT09ICdtYXRjaCcpIHJldHVybiB0aGlzLnBhcnNlTWF0Y2godGV4dCwgaW5kZW50LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICd0cnknKSAgIHJldHVybiB0aGlzLnBhcnNlVHJ5KGluZGVudCwgdG9rZW4pXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgU2ltcGxlIHN0YXRlbWVudCBkaXNwYXRjaCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAoZmlyc3QgPT09ICdzZXQnKSAgICAgICByZXR1cm4gdGhpcy5wYXJzZVNldCh0ZXh0LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICdlbWl0JykgICAgICByZXR1cm4gdGhpcy5wYXJzZUVtaXQodGV4dCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAnYnJvYWRjYXN0JykgcmV0dXJuIHRoaXMucGFyc2VCcm9hZGNhc3QodGV4dCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAnY2FsbCcpICAgICAgcmV0dXJuIHRoaXMucGFyc2VDYWxsKHRleHQsIHRva2VuKVxuICAgIGlmIChmaXJzdCA9PT0gJ3dhaXQnKSAgICAgIHJldHVybiB0aGlzLnBhcnNlV2FpdCh0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBCYXJlIERhdGFzdGFyIGFjdGlvbjogYEBnZXQgJy91cmwnIFthcmdzXWAgKGZpcmUtYW5kLWF3YWl0LCBubyBiaW5kKSBcdTI1MDBcdTI1MDBcbiAgICBpZiAoZmlyc3Quc3RhcnRzV2l0aCgnQCcpKSAgcmV0dXJuIHRoaXMucGFyc2VBY3Rpb24odGV4dCwgdG9rZW4pXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgQXN5bmMgYmluZDogYG5hbWUgPC0gQHZlcmIgJ3VybCcgW2FyZ3NdYCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAodGV4dC5pbmNsdWRlcygnIDwtICcpKSByZXR1cm4gdGhpcy5wYXJzZUJpbmQodGV4dCwgdG9rZW4pXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgQW5pbWF0aW9uIHByaW1pdGl2ZSAoYnVpbHQtaW4pIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGlmIChBTklNQVRJT05fUFJJTUlUSVZFUy5oYXMoZmlyc3QpKSByZXR1cm4gdGhpcy5wYXJzZUFuaW1hdGlvbih0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBBbmltYXRpb24gcHJpbWl0aXZlICh1c2VybGFuZCBtb2R1bGUpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIC8vIEFueSBoeXBoZW5hdGVkIHdvcmQgZm9sbG93ZWQgYnkgYSBDU1Mgc2VsZWN0b3IgKyBkdXJhdGlvbiBsb29rcyBsaWtlIGFuXG4gICAgLy8gYW5pbWF0aW9uIGNhbGwuIFRoaXMgaGFuZGxlcyB1c2VybGFuZCBwcmltaXRpdmVzIGxpa2UgYHNjcm9sbC1yZXZlYWxgLFxuICAgIC8vIGBzcHJpbmctaW5gLCBldGMuIHJlZ2lzdGVyZWQgdmlhIDx1c2UtbW9kdWxlIHNyYz1cIi4uLlwiPi5cbiAgICAvLyBQYXR0ZXJuOiB3b3JkLXdpdGgtaHlwaGVuICAuc2VsZWN0b3Itb3ItI2lkICBObXMgIGVhc2luZyAgW29wdHM/XVxuICAgIGlmIChmaXJzdC5pbmNsdWRlcygnLScpICYmIGxvb2tzTGlrZUFuaW1hdGlvbkNhbGwodGV4dCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnBhcnNlQW5pbWF0aW9uKHRleHQsIHRva2VuKVxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBVbmtub3duOiBzdG9yZSBhcyByYXcgZXhwcmVzc2lvbiAoZXNjYXBlIGhhdGNoIC8gZnV0dXJlIGtleXdvcmRzKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBVbmtub3duIHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICByZXR1cm4gZXhwcih0ZXh0KVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIE1hdGNoIGJsb2NrIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgcGFyc2VNYXRjaCh0ZXh0OiBzdHJpbmcsIGluZGVudDogbnVtYmVyLCB0b2tlbjogVG9rZW4pOiBNYXRjaE5vZGUge1xuICAgIC8vIGB0ZXh0YCBpcyBlLmcuIFwibWF0Y2ggcmVzcG9uc2VcIiBvciBcIm1hdGNoICRmZWVkU3RhdGVcIlxuICAgIGNvbnN0IHN1YmplY3RSYXcgPSB0ZXh0LnNsaWNlKCdtYXRjaCcubGVuZ3RoKS50cmltKClcbiAgICBjb25zdCBzdWJqZWN0OiBFeHByTm9kZSA9IGV4cHIoc3ViamVjdFJhdylcbiAgICBjb25zdCBhcm1zOiBNYXRjaEFybVtdID0gW11cblxuICAgIHdoaWxlICghdGhpcy5hdEVuZCgpKSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy5wZWVrKCkhXG5cbiAgICAgIC8vIC9tYXRjaCB0ZXJtaW5hdGVzIHRoZSBibG9ja1xuICAgICAgaWYgKHQudGV4dCA9PT0gJy9tYXRjaCcpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgLy8gT25seSBjb25zdW1lIGFybSBsaW5lcyBhdCB0aGUgZXhwZWN0ZWQgYXJtIGluZGVudCAoaW5kZW50ICsgMilcbiAgICAgIGlmICh0LmluZGVudCA8PSBpbmRlbnQpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gVW5jbG9zZWQgbWF0Y2ggYmxvY2sgXHUyMDE0IG1pc3NpbmcgL21hdGNoYCwgdG9rZW4pXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIC8vIFBhcnNlIGFuIGFybTogYFtwYXR0ZXJuXSAtPmAgb3IgYFtwYXR0ZXJuXSAtPiBib2R5YFxuICAgICAgaWYgKHQudGV4dC5zdGFydHNXaXRoKCdbJykpIHtcbiAgICAgICAgYXJtcy5wdXNoKHRoaXMucGFyc2VNYXRjaEFybSh0LmluZGVudCwgdCkpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIFNraXAgdW5leHBlY3RlZCBsaW5lcyBpbnNpZGUgbWF0Y2hcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIFVuZXhwZWN0ZWQgdG9rZW4gaW5zaWRlIG1hdGNoIGJsb2NrOiAke0pTT04uc3RyaW5naWZ5KHQudGV4dCl9YCwgdClcbiAgICAgIHRoaXMuYWR2YW5jZSgpXG4gICAgfVxuXG4gICAgcmV0dXJuIHsgdHlwZTogJ21hdGNoJywgc3ViamVjdCwgYXJtcyB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlTWF0Y2hBcm0oYXJtSW5kZW50OiBudW1iZXIsIHRva2VuOiBUb2tlbik6IE1hdGNoQXJtIHtcbiAgICBjb25zdCB0ID0gdGhpcy5hZHZhbmNlKCkgLy8gY29uc3VtZSB0aGUgYXJtIGxpbmVcblxuICAgIC8vIFNwbGl0IG9uIGAgLT5gIHRvIHNlcGFyYXRlIHBhdHRlcm4gZnJvbSBib2R5XG4gICAgY29uc3QgYXJyb3dJZHggPSB0LnRleHQuaW5kZXhPZignIC0+JylcbiAgICBpZiAoYXJyb3dJZHggPT09IC0xKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYXRjaCBhcm0gbWlzc2luZyAnLT4nOiAke0pTT04uc3RyaW5naWZ5KHQudGV4dCl9YCwgdClcbiAgICAgIHJldHVybiB7IHBhdHRlcm5zOiBbeyBraW5kOiAnd2lsZGNhcmQnIH1dLCBib2R5OiBleHByKCcnKSB9XG4gICAgfVxuXG4gICAgY29uc3QgcGF0dGVyblJhdyA9IHQudGV4dC5zbGljZSgwLCBhcnJvd0lkeCkudHJpbSgpXG4gICAgY29uc3QgYWZ0ZXJBcnJvdyA9IHQudGV4dC5zbGljZShhcnJvd0lkeCArIDMpLnRyaW0oKSAgLy8gZXZlcnl0aGluZyBhZnRlciBgLT5gXG5cbiAgICBjb25zdCBwYXR0ZXJucyA9IHBhcnNlUGF0dGVybnMocGF0dGVyblJhdylcblxuICAgIGxldCBib2R5OiBMRVNOb2RlXG4gICAgaWYgKGFmdGVyQXJyb3cubGVuZ3RoID4gMCkge1xuICAgICAgLy8gSW5saW5lIGFybTogYFsnZXJyb3InXSAtPiBzZXQgJGZlZWRTdGF0ZSB0byAnZXJyb3InYFxuICAgICAgYm9keSA9IHRoaXMucGFyc2VTaW5nbGVMaW5lKGFmdGVyQXJyb3csIGFybUluZGVudCwgdG9rZW4pXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE11bHRpLWxpbmUgYXJtOiBib2R5IGlzIHRoZSBkZWVwZXItaW5kZW50ZWQgYmxvY2tcbiAgICAgIGJvZHkgPSB0aGlzLnBhcnNlQmxvY2soYXJtSW5kZW50KVxuICAgIH1cblxuICAgIHJldHVybiB7IHBhdHRlcm5zLCBib2R5IH1cbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBUcnkgYmxvY2sgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBwYXJzZVRyeShpbmRlbnQ6IG51bWJlciwgdG9rZW46IFRva2VuKTogVHJ5Tm9kZSB7XG4gICAgLy8gTm90ZTogdGhlIGB0cnlgIHRva2VuIHdhcyBhbHJlYWR5IGNvbnN1bWVkIGJ5IHRoZSBjYWxsaW5nIHBhcnNlU3RhdGVtZW50T3JQYXJhbGxlbC5cbiAgICAvLyBEbyBOT1QgY2FsbCB0aGlzLmFkdmFuY2UoKSBoZXJlIFx1MjAxNCB0aGF0IHdvdWxkIHNraXAgdGhlIGZpcnN0IGJvZHkgbGluZS5cblxuICAgIC8vIFBhcnNlIGJvZHkgXHUyMDE0IHN0b3BzIGF0IHJlc2N1ZS9hZnRlcndhcmRzLy90cnkgYXQgdGhlIHNhbWUgaW5kZW50IGxldmVsXG4gICAgY29uc3QgYm9keSA9IHRoaXMucGFyc2VCbG9jayhpbmRlbnQpXG5cbiAgICBsZXQgcmVzY3VlOiBMRVNOb2RlIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG4gICAgbGV0IGFmdGVyd2FyZHM6IExFU05vZGUgfCB1bmRlZmluZWQgPSB1bmRlZmluZWRcblxuICAgIC8vIHJlc2N1ZSBjbGF1c2UgKG9wdGlvbmFsKVxuICAgIGlmICh0aGlzLnBlZWsoKT8udGV4dCA9PT0gJ3Jlc2N1ZScgJiYgdGhpcy5wZWVrKCk/LmluZGVudCA9PT0gaW5kZW50KSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKSAvLyBjb25zdW1lIGByZXNjdWVgXG4gICAgICByZXNjdWUgPSB0aGlzLnBhcnNlQmxvY2soaW5kZW50KVxuICAgIH1cblxuICAgIC8vIGFmdGVyd2FyZHMgY2xhdXNlIChvcHRpb25hbClcbiAgICBpZiAodGhpcy5wZWVrKCk/LnRleHQgPT09ICdhZnRlcndhcmRzJyAmJiB0aGlzLnBlZWsoKT8uaW5kZW50ID09PSBpbmRlbnQpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpIC8vIGNvbnN1bWUgYGFmdGVyd2FyZHNgXG4gICAgICBhZnRlcndhcmRzID0gdGhpcy5wYXJzZUJsb2NrKGluZGVudClcbiAgICB9XG5cbiAgICAvLyBDb25zdW1lIC90cnlcbiAgICBpZiAodGhpcy5wZWVrKCk/LnRleHQgPT09ICcvdHJ5Jykge1xuICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gVW5jbG9zZWQgdHJ5IGJsb2NrIFx1MjAxNCBtaXNzaW5nIC90cnlgLCB0b2tlbilcbiAgICB9XG5cbiAgICBjb25zdCB0cnlOb2RlOiBUcnlOb2RlID0geyB0eXBlOiAndHJ5JywgYm9keSB9XG4gICAgaWYgKHJlc2N1ZSAgICAhPT0gdW5kZWZpbmVkKSB0cnlOb2RlLnJlc2N1ZSAgICAgPSByZXNjdWVcbiAgICBpZiAoYWZ0ZXJ3YXJkcyAhPT0gdW5kZWZpbmVkKSB0cnlOb2RlLmFmdGVyd2FyZHMgPSBhZnRlcndhcmRzXG4gICAgcmV0dXJuIHRyeU5vZGVcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBTaW1wbGUgc3RhdGVtZW50IHBhcnNlcnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBwYXJzZVNldCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IFNldE5vZGUge1xuICAgIC8vIGBzZXQgJHNpZ25hbCB0byBleHByYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9ec2V0XFxzK1xcJChcXHcrKVxccyt0b1xccysoLispJC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgc2V0IHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7IHR5cGU6ICdzZXQnLCBzaWduYWw6ICc/PycsIHZhbHVlOiBleHByKHRleHQpIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdzZXQnLFxuICAgICAgc2lnbmFsOiBtWzFdISxcbiAgICAgIHZhbHVlOiBleHByKG1bMl0hLnRyaW0oKSksXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUVtaXQodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBFbWl0Tm9kZSB7XG4gICAgLy8gYGVtaXQgZXZlbnQ6bmFtZSBbcGF5bG9hZCwgLi4uXWAgb3IgYGVtaXQgZXZlbnQ6bmFtZWBcbiAgICBjb25zdCB7IG5hbWUsIHBheWxvYWQgfSA9IHBhcnNlRXZlbnRMaW5lKHRleHQuc2xpY2UoJ2VtaXQnLmxlbmd0aCkudHJpbSgpLCB0b2tlbilcbiAgICByZXR1cm4geyB0eXBlOiAnZW1pdCcsIGV2ZW50OiBuYW1lLCBwYXlsb2FkIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VCcm9hZGNhc3QodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBCcm9hZGNhc3ROb2RlIHtcbiAgICBjb25zdCB7IG5hbWUsIHBheWxvYWQgfSA9IHBhcnNlRXZlbnRMaW5lKHRleHQuc2xpY2UoJ2Jyb2FkY2FzdCcubGVuZ3RoKS50cmltKCksIHRva2VuKVxuICAgIHJldHVybiB7IHR5cGU6ICdicm9hZGNhc3QnLCBldmVudDogbmFtZSwgcGF5bG9hZCB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQ2FsbCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IENhbGxOb2RlIHtcbiAgICAvLyBgY2FsbCBjb21tYW5kOm5hbWUgW2FyZzogdmFsdWUsIC4uLl1gIG9yIGBjYWxsIGNvbW1hbmQ6bmFtZWBcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXmNhbGxcXHMrKFteXFxzXFxbXSspXFxzKig/OlxcWyguKylcXF0pPyQvKVxuICAgIGlmICghbSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gTWFsZm9ybWVkIGNhbGwgc3RhdGVtZW50OiAke0pTT04uc3RyaW5naWZ5KHRleHQpfWAsIHRva2VuKVxuICAgICAgcmV0dXJuIHsgdHlwZTogJ2NhbGwnLCBjb21tYW5kOiAnPz8nLCBhcmdzOiB7fSB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnY2FsbCcsXG4gICAgICBjb21tYW5kOiBtWzFdISxcbiAgICAgIGFyZ3M6IHBhcnNlQXJnTGlzdChtWzJdID8/ICcnKSxcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlV2FpdCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IFdhaXROb2RlIHtcbiAgICAvLyBgd2FpdCAzMDBtc2Agb3IgYHdhaXQgKGF0dGVtcHQgKyAxKSAqIDUwMG1zYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9ed2FpdFxccysoLis/KW1zJC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgd2FpdCBzdGF0ZW1lbnQ6ICR7SlNPTi5zdHJpbmdpZnkodGV4dCl9YCwgdG9rZW4pXG4gICAgICByZXR1cm4geyB0eXBlOiAnd2FpdCcsIG1zOiAwIH1cbiAgICB9XG4gICAgY29uc3QgbXNFeHByID0gbVsxXSEudHJpbSgpXG4gICAgLy8gU2ltcGxlIGxpdGVyYWxcbiAgICBjb25zdCBsaXRlcmFsID0gTnVtYmVyKG1zRXhwcilcbiAgICBpZiAoIU51bWJlci5pc05hTihsaXRlcmFsKSkgcmV0dXJuIHsgdHlwZTogJ3dhaXQnLCBtczogbGl0ZXJhbCB9XG4gICAgLy8gRXhwcmVzc2lvbiBcdTIwMTQgc3RvcmUgYXMgMCB3aXRoIHRoZSBleHByZXNzaW9uIGFzIGEgY29tbWVudCAoZXhlY3V0b3Igd2lsbCBldmFsKVxuICAgIC8vIFBoYXNlIDMgd2lsbCBoYW5kbGUgZHluYW1pYyBkdXJhdGlvbnMgcHJvcGVybHlcbiAgICByZXR1cm4geyB0eXBlOiAnd2FpdCcsIG1zOiAwIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VCaW5kKHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogQmluZE5vZGUge1xuICAgIC8vIGBuYW1lIDwtIEB2ZXJiICd1cmwnIFthcmdzXWBcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXihcXHcrKVxccys8LVxccytAKFxcdyspXFxzKycoW14nXSspJ1xccyooPzpcXFsoLispXFxdKT8kLylcbiAgICBpZiAoIW0pIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIE1hbGZvcm1lZCBiaW5kIHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdiaW5kJyxcbiAgICAgICAgbmFtZTogJz8/JyxcbiAgICAgICAgYWN0aW9uOiB7IHR5cGU6ICdhY3Rpb24nLCB2ZXJiOiAnZ2V0JywgdXJsOiAnJywgYXJnczoge30gfSxcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgYWN0aW9uOiBBY3Rpb25Ob2RlID0ge1xuICAgICAgdHlwZTogJ2FjdGlvbicsXG4gICAgICB2ZXJiOiBtWzJdIS50b0xvd2VyQ2FzZSgpLFxuICAgICAgdXJsOiBtWzNdISxcbiAgICAgIGFyZ3M6IHBhcnNlQXJnTGlzdChtWzRdID8/ICcnKSxcbiAgICB9XG4gICAgcmV0dXJuIHsgdHlwZTogJ2JpbmQnLCBuYW1lOiBtWzFdISwgYWN0aW9uIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VBY3Rpb24odGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBBY3Rpb25Ob2RlIHtcbiAgICAvLyBgQGdldCAnL3VybCcgW2FyZ3NdYCBvciBgQHBvc3QgJy91cmwnIFthcmdzXWBcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXkAoXFx3KylcXHMrJyhbXiddKyknXFxzKig/OlxcWyguKylcXF0pPyQvKVxuICAgIGlmICghbSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gTWFsZm9ybWVkIGFjdGlvbjogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7IHR5cGU6ICdhY3Rpb24nLCB2ZXJiOiAnZ2V0JywgdXJsOiAnJywgYXJnczoge30gfVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogJ2FjdGlvbicsXG4gICAgICB2ZXJiOiBtWzFdIS50b0xvd2VyQ2FzZSgpLFxuICAgICAgdXJsOiBtWzJdISxcbiAgICAgIGFyZ3M6IHBhcnNlQXJnTGlzdChtWzNdID8/ICcnKSxcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQW5pbWF0aW9uKHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogQW5pbWF0aW9uTm9kZSB7XG4gICAgLy8gYHByaW1pdGl2ZSBzZWxlY3RvciBkdXJhdGlvbiBlYXNpbmcgW29wdGlvbnNdYFxuICAgIC8vIEV4YW1wbGVzOlxuICAgIC8vICAgc3RhZ2dlci1lbnRlciAuZmVlZC1pdGVtICAxMjBtcyBlYXNlLW91dCBbZ2FwOiA0MG1zICBmcm9tOiByaWdodF1cbiAgICAvLyAgIHB1bHNlIC5mZWVkLWl0ZW0uaXMtdXBkYXRlZCAgMzAwbXMgZWFzZS1pbi1vdXRcbiAgICAvLyAgIHNsaWRlLW91dCBbZGF0YS1pdGVtLWlkOiBpZF0gIDE1MG1zIGVhc2UtaW4gW3RvOiByaWdodF1cblxuICAgIC8vIFRva2VuaXplOiBzcGxpdCBvbiB3aGl0ZXNwYWNlIGJ1dCBwcmVzZXJ2ZSBbLi4uXSBncm91cHNcbiAgICBjb25zdCBwYXJ0cyA9IHNwbGl0QW5pbWF0aW9uTGluZSh0ZXh0KVxuXG4gICAgY29uc3QgcHJpbWl0aXZlID0gcGFydHNbMF0gPz8gJydcbiAgICBjb25zdCBzZWxlY3RvciAgPSBwYXJ0c1sxXSA/PyAnJ1xuICAgIGNvbnN0IGR1cmF0aW9uU3RyID0gcGFydHNbMl0gPz8gJzBtcydcbiAgICBjb25zdCBlYXNpbmcgICAgPSBwYXJ0c1szXSA/PyAnZWFzZSdcbiAgICBjb25zdCBvcHRpb25zU3RyID0gcGFydHNbNF0gPz8gJycgIC8vIG1heSBiZSBhYnNlbnRcblxuICAgIGNvbnN0IGR1cmF0aW9uTXMgPSBwYXJzZUludChkdXJhdGlvblN0ciwgMTApXG5cbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogJ2FuaW1hdGlvbicsXG4gICAgICBwcmltaXRpdmUsXG4gICAgICBzZWxlY3RvcixcbiAgICAgIGR1cmF0aW9uOiBOdW1iZXIuaXNOYU4oZHVyYXRpb25NcykgPyAwIDogZHVyYXRpb25NcyxcbiAgICAgIGVhc2luZyxcbiAgICAgIG9wdGlvbnM6IHBhcnNlQW5pbWF0aW9uT3B0aW9ucyhvcHRpb25zU3RyKSxcbiAgICB9XG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXR0ZXJuIHBhcnNpbmdcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFBhcnNlcyBhIHBhdHRlcm4gZ3JvdXAgbGlrZSBgW2l0ICAgb2sgICBdYCwgYFtuaWwgIGVycm9yXWAsIGBbX11gLFxuICogYFsnZXJyb3InXWAsIGBbMCB8IDEgfCAyXWAuXG4gKlxuICogUmV0dXJucyBhbiBhcnJheSBvZiBQYXR0ZXJuTm9kZSBcdTIwMTQgb25lIHBlciBlbGVtZW50IGluIHRoZSB0dXBsZSBwYXR0ZXJuLlxuICogRm9yIG9yLXBhdHRlcm5zIChgMCB8IDEgfCAyYCksIHJldHVybnMgYSBzaW5nbGUgT3JQYXR0ZXJuTm9kZS5cbiAqL1xuZnVuY3Rpb24gcGFyc2VQYXR0ZXJucyhyYXc6IHN0cmluZyk6IFBhdHRlcm5Ob2RlW10ge1xuICAvLyBTdHJpcCBvdXRlciBicmFja2V0c1xuICBjb25zdCBpbm5lciA9IHJhdy5yZXBsYWNlKC9eXFxbfFxcXSQvZywgJycpLnRyaW0oKVxuXG4gIC8vIENoZWNrIGZvciBvci1wYXR0ZXJuOiBjb250YWlucyBgIHwgYFxuICBpZiAoaW5uZXIuaW5jbHVkZXMoJyB8ICcpIHx8IGlubmVyLmluY2x1ZGVzKCd8JykpIHtcbiAgICBjb25zdCBhbHRlcm5hdGl2ZXMgPSBpbm5lci5zcGxpdCgvXFxzKlxcfFxccyovKS5tYXAocCA9PiBwYXJzZVNpbmdsZVBhdHRlcm4ocC50cmltKCkpKVxuICAgIHJldHVybiBbeyBraW5kOiAnb3InLCBwYXR0ZXJuczogYWx0ZXJuYXRpdmVzIH1dXG4gIH1cblxuICAvLyBUdXBsZSBwYXR0ZXJuOiBzcGFjZS1zZXBhcmF0ZWQgZWxlbWVudHNcbiAgLy8gVXNlIGEgY3VzdG9tIHNwbGl0IHRvIGhhbmRsZSBtdWx0aXBsZSBzcGFjZXMgKGFsaWdubWVudCBwYWRkaW5nKVxuICByZXR1cm4gaW5uZXIudHJpbSgpLnNwbGl0KC9cXHN7Mix9fFxccyg/PVxcUykvKS5maWx0ZXIocyA9PiBzLnRyaW0oKSlcbiAgICAubWFwKHAgPT4gcGFyc2VTaW5nbGVQYXR0ZXJuKHAudHJpbSgpKSlcbn1cblxuZnVuY3Rpb24gcGFyc2VTaW5nbGVQYXR0ZXJuKHM6IHN0cmluZyk6IFBhdHRlcm5Ob2RlIHtcbiAgaWYgKHMgPT09ICdfJykgICByZXR1cm4geyBraW5kOiAnd2lsZGNhcmQnIH1cbiAgaWYgKHMgPT09ICduaWwnKSByZXR1cm4geyBraW5kOiAnbGl0ZXJhbCcsIHZhbHVlOiBudWxsIH1cblxuICAvLyBTdHJpbmcgbGl0ZXJhbDogJ3ZhbHVlJ1xuICBpZiAocy5zdGFydHNXaXRoKFwiJ1wiKSAmJiBzLmVuZHNXaXRoKFwiJ1wiKSkge1xuICAgIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IHMuc2xpY2UoMSwgLTEpIH1cbiAgfVxuXG4gIC8vIE51bWJlciBsaXRlcmFsXG4gIGNvbnN0IG4gPSBOdW1iZXIocylcbiAgaWYgKCFOdW1iZXIuaXNOYU4obikpIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IG4gfVxuXG4gIC8vIEJvb2xlYW5cbiAgaWYgKHMgPT09ICd0cnVlJykgIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IHRydWUgfVxuICBpZiAocyA9PT0gJ2ZhbHNlJykgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogZmFsc2UgfVxuXG4gIC8vIEV2ZXJ5dGhpbmcgZWxzZSBpcyBhIGJpbmRpbmcgKGNhcHR1cmVzIHRoZSB2YWx1ZSBmb3IgdXNlIGluIHRoZSBib2R5KVxuICByZXR1cm4geyBraW5kOiAnYmluZGluZycsIG5hbWU6IHMgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEFyZ3VtZW50IGxpc3QgcGFyc2luZ1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogUGFyc2VzIGBrZXk6IHZhbHVlICBrZXkyOiB2YWx1ZTJgIGZyb20gaW5zaWRlIGEgWy4uLl0gYXJndW1lbnQgYmxvY2suXG4gKiBWYWx1ZXMgYXJlIHN0b3JlZCBhcyBFeHByTm9kZSAoZXZhbHVhdGVkIGF0IHJ1bnRpbWUpLlxuICovXG5mdW5jdGlvbiBwYXJzZUFyZ0xpc3QocmF3OiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCBFeHByTm9kZT4ge1xuICBpZiAoIXJhdy50cmltKCkpIHJldHVybiB7fVxuXG4gIGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgRXhwck5vZGU+ID0ge31cblxuICAvLyBTcGxpdCBvbiBgICBgIChkb3VibGUtc3BhY2UgdXNlZCBhcyBzZXBhcmF0b3IgaW4gTEVTIHN0eWxlKVxuICAvLyBidXQgYWxzbyBoYW5kbGUgc2luZ2xlIGAgIGtleTogdmFsdWVgIGVudHJpZXNcbiAgLy8gU2ltcGxlIHJlZ2V4OiBgd29yZDogcmVzdF91bnRpbF9uZXh0X3dvcmQ6YFxuICBjb25zdCBwYWlycyA9IHJhdy50cmltKCkuc3BsaXQoLyg/PD1cXFMpXFxzezIsfSg/PVxcdykvKVxuICBmb3IgKGNvbnN0IHBhaXIgb2YgcGFpcnMpIHtcbiAgICBjb25zdCBjb2xvbklkeCA9IHBhaXIuaW5kZXhPZignOicpXG4gICAgaWYgKGNvbG9uSWR4ID09PSAtMSkgY29udGludWVcbiAgICBjb25zdCBrZXkgICA9IHBhaXIuc2xpY2UoMCwgY29sb25JZHgpLnRyaW0oKVxuICAgIGNvbnN0IHZhbHVlID0gcGFpci5zbGljZShjb2xvbklkeCArIDEpLnRyaW0oKVxuICAgIGlmIChrZXkpIHJlc3VsdFtrZXldID0gZXhwcih2YWx1ZSlcbiAgfVxuXG4gIHJldHVybiByZXN1bHRcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBFdmVudCBsaW5lIHBhcnNpbmc6IGBldmVudDpuYW1lIFtwYXlsb2FkLi4uXWBcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5mdW5jdGlvbiBwYXJzZUV2ZW50TGluZShcbiAgcmF3OiBzdHJpbmcsXG4gIHRva2VuOiBUb2tlblxuKTogeyBuYW1lOiBzdHJpbmc7IHBheWxvYWQ6IEV4cHJOb2RlW10gfSB7XG4gIC8vIGBmZWVkOmRhdGEtcmVhZHlgIG9yIGBmZWVkOmRhdGEtcmVhZHkgWyRmZWVkSXRlbXNdYCBvciBgZmVlZDplcnJvciBbJGVycm9yXWBcbiAgY29uc3QgYnJhY2tldElkeCA9IHJhdy5pbmRleE9mKCdbJylcbiAgaWYgKGJyYWNrZXRJZHggPT09IC0xKSB7XG4gICAgcmV0dXJuIHsgbmFtZTogcmF3LnRyaW0oKSwgcGF5bG9hZDogW10gfVxuICB9XG4gIGNvbnN0IG5hbWUgPSByYXcuc2xpY2UoMCwgYnJhY2tldElkeCkudHJpbSgpXG4gIGNvbnN0IHBheWxvYWRSYXcgPSByYXcuc2xpY2UoYnJhY2tldElkeCArIDEsIHJhdy5sYXN0SW5kZXhPZignXScpKS50cmltKClcblxuICAvLyBQYXlsb2FkIGVsZW1lbnRzIGFyZSBjb21tYSBvciBzcGFjZSBzZXBhcmF0ZWQgZXhwcmVzc2lvbnNcbiAgY29uc3QgcGF5bG9hZDogRXhwck5vZGVbXSA9IHBheWxvYWRSYXdcbiAgICA/IHBheWxvYWRSYXcuc3BsaXQoLyxcXHMqfFxcc3syLH0vKS5tYXAocyA9PiBleHByKHMudHJpbSgpKSkuZmlsdGVyKGUgPT4gZS5yYXcpXG4gICAgOiBbXVxuXG4gIHJldHVybiB7IG5hbWUsIHBheWxvYWQgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEFuaW1hdGlvbiBsaW5lIHBhcnNpbmdcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFNwbGl0cyBhbiBhbmltYXRpb24gbGluZSBpbnRvIGl0cyBzdHJ1Y3R1cmFsIHBhcnRzLCBwcmVzZXJ2aW5nIFsuLi5dIGdyb3Vwcy5cbiAqXG4gKiBJbnB1dDogIGBzdGFnZ2VyLWVudGVyIC5mZWVkLWl0ZW0gIDEyMG1zIGVhc2Utb3V0IFtnYXA6IDQwbXMgIGZyb206IHJpZ2h0XWBcbiAqIE91dHB1dDogWydzdGFnZ2VyLWVudGVyJywgJy5mZWVkLWl0ZW0nLCAnMTIwbXMnLCAnZWFzZS1vdXQnLCAnW2dhcDogNDBtcyAgZnJvbTogcmlnaHRdJ11cbiAqL1xuZnVuY3Rpb24gc3BsaXRBbmltYXRpb25MaW5lKHRleHQ6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW11cbiAgbGV0IGN1cnJlbnQgPSAnJ1xuICBsZXQgaW5CcmFja2V0ID0gMFxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdGV4dC5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGNoID0gdGV4dFtpXSFcbiAgICBpZiAoY2ggPT09ICdbJykge1xuICAgICAgaW5CcmFja2V0KytcbiAgICAgIGN1cnJlbnQgKz0gY2hcbiAgICB9IGVsc2UgaWYgKGNoID09PSAnXScpIHtcbiAgICAgIGluQnJhY2tldC0tXG4gICAgICBjdXJyZW50ICs9IGNoXG4gICAgfSBlbHNlIGlmIChjaCA9PT0gJyAnICYmIGluQnJhY2tldCA9PT0gMCkge1xuICAgICAgaWYgKGN1cnJlbnQudHJpbSgpKSBwYXJ0cy5wdXNoKGN1cnJlbnQudHJpbSgpKVxuICAgICAgY3VycmVudCA9ICcnXG4gICAgfSBlbHNlIHtcbiAgICAgIGN1cnJlbnQgKz0gY2hcbiAgICB9XG4gIH1cbiAgaWYgKGN1cnJlbnQudHJpbSgpKSBwYXJ0cy5wdXNoKGN1cnJlbnQudHJpbSgpKVxuICByZXR1cm4gcGFydHNcbn1cblxuLyoqXG4gKiBQYXJzZXMgYW5pbWF0aW9uIG9wdGlvbnMgZnJvbSBhIGBba2V5OiB2YWx1ZSAga2V5MjogdmFsdWUyXWAgc3RyaW5nLlxuICogVGhlIG91dGVyIGJyYWNrZXRzIGFyZSBpbmNsdWRlZCBpbiB0aGUgaW5wdXQuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlQW5pbWF0aW9uT3B0aW9ucyhyYXc6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIEV4cHJOb2RlPiB7XG4gIGlmICghcmF3LnRyaW0oKSkgcmV0dXJuIHt9XG4gIC8vIFN0cmlwIG91dGVyIGJyYWNrZXRzXG4gIGNvbnN0IGlubmVyID0gcmF3LnJlcGxhY2UoL15cXFt8XFxdJC9nLCAnJykudHJpbSgpXG4gIHJldHVybiBwYXJzZUFyZ0xpc3QoaW5uZXIpXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gVXRpbGl0aWVzXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gZXhwcihyYXc6IHN0cmluZyk6IEV4cHJOb2RlIHtcbiAgcmV0dXJuIHsgdHlwZTogJ2V4cHInLCByYXcgfVxufVxuXG5mdW5jdGlvbiBmaXJzdFdvcmQodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHRleHQuc3BsaXQoL1xccysvKVswXSA/PyAnJ1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBhIHN0YXRlbWVudCBsb29rcyBsaWtlIGFuIGFuaW1hdGlvbiBjYWxsOlxuICogICA8d29yZC13aXRoLWh5cGhlbj4gIDxzZWxlY3RvcnxkdXJhdGlvbj4gIC4uLlxuICpcbiAqIFRoaXMgYWxsb3dzIHVzZXJsYW5kIG1vZHVsZSBwcmltaXRpdmVzIChzY3JvbGwtcmV2ZWFsLCBzcHJpbmctaW4sIGV0Yy4pXG4gKiB0byBiZSBwYXJzZWQgYXMgQW5pbWF0aW9uTm9kZSB3aXRob3V0IGJlaW5nIGxpc3RlZCBpbiBBTklNQVRJT05fUFJJTUlUSVZFUy5cbiAqIFRoZSBleGVjdXRvciB0aGVuIGRpc3BhdGNoZXMgdGhlbSB0aHJvdWdoIHRoZSBNb2R1bGVSZWdpc3RyeS5cbiAqL1xuZnVuY3Rpb24gbG9va3NMaWtlQW5pbWF0aW9uQ2FsbCh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgcGFydHMgPSB0ZXh0LnRyaW0oKS5zcGxpdCgvXFxzKy8pXG4gIGlmIChwYXJ0cy5sZW5ndGggPCAyKSByZXR1cm4gZmFsc2VcbiAgY29uc3Qgc2Vjb25kID0gcGFydHNbMV0gPz8gJydcbiAgLy8gU2Vjb25kIHRva2VuIGlzIGEgQ1NTIHNlbGVjdG9yICguY2xhc3MsICNpZCwgW2F0dHJdLCB0YWduYW1lKSBvciBhIGR1cmF0aW9uIChObXMpXG4gIHJldHVybiAvXlsuI1xcW10vLnRlc3Qoc2Vjb25kKSB8fCAgLy8gQ1NTIHNlbGVjdG9yXG4gICAgICAgICAvXlxcZCttcyQvLnRlc3Qoc2Vjb25kKSAgICAgIC8vIGJhcmUgZHVyYXRpb24gKHVudXN1YWwgYnV0IHZhbGlkKVxufVxuXG5mdW5jdGlvbiB0b1NlcXVlbmNlT3JTaW5nbGUoc3RlcHM6IExFU05vZGVbXSk6IExFU05vZGUge1xuICBpZiAoc3RlcHMubGVuZ3RoID09PSAwKSByZXR1cm4gZXhwcignJylcbiAgaWYgKHN0ZXBzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIHN0ZXBzWzBdIVxuICByZXR1cm4geyB0eXBlOiAnc2VxdWVuY2UnLCBzdGVwcyB9IHNhdGlzZmllcyBTZXF1ZW5jZU5vZGVcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXJzZSBlcnJvclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBjbGFzcyBMRVNQYXJzZUVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcsIHB1YmxpYyByZWFkb25seSB0b2tlbjogVG9rZW4gfCB1bmRlZmluZWQpIHtcbiAgICBjb25zdCBsb2MgPSB0b2tlbiA/IGAgKGxpbmUgJHt0b2tlbi5saW5lTnVtfTogJHtKU09OLnN0cmluZ2lmeSh0b2tlbi50ZXh0KX0pYCA6ICcnXG4gICAgc3VwZXIoYFtMRVM6cGFyc2VyXSAke21lc3NhZ2V9JHtsb2N9YClcbiAgICB0aGlzLm5hbWUgPSAnTEVTUGFyc2VFcnJvcidcbiAgfVxufVxuIiwgImltcG9ydCB7IHN0cmlwQm9keSB9IGZyb20gJy4vc3RyaXBCb2R5LmpzJ1xuaW1wb3J0IHsgdG9rZW5pemUgfSBmcm9tICcuL3Rva2VuaXplci5qcydcbmltcG9ydCB7IExFU1BhcnNlciB9IGZyb20gJy4vcGFyc2VyLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNOb2RlIH0gZnJvbSAnLi9hc3QuanMnXG5cbmV4cG9ydCB7IExFU1BhcnNlciwgTEVTUGFyc2VFcnJvciB9IGZyb20gJy4vcGFyc2VyLmpzJ1xuZXhwb3J0IHsgdG9rZW5pemUsIGVuZHNXaXRoQW5kLCBzdHJpcFRyYWlsaW5nQW5kIH0gZnJvbSAnLi90b2tlbml6ZXIuanMnXG5leHBvcnQgeyBzdHJpcEJvZHkgfSBmcm9tICcuL3N0cmlwQm9keS5qcydcbmV4cG9ydCB0eXBlIHsgVG9rZW4gfSBmcm9tICcuL3Rva2VuaXplci5qcydcbmV4cG9ydCAqIGZyb20gJy4vYXN0LmpzJ1xuZXhwb3J0ICogZnJvbSAnLi9jb25maWcuanMnXG5cbi8qKlxuICogUGFyc2UgYSByYXcgTEVTIGJvZHkgc3RyaW5nIChmcm9tIGEgZG89LCBoYW5kbGU9LCBvciBydW49IGF0dHJpYnV0ZSlcbiAqIGludG8gYSB0eXBlZCBBU1Qgbm9kZS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBwdWJsaWMgZW50cnkgcG9pbnQgZm9yIFBoYXNlIDI6XG4gKiAgIC0gU3RyaXBzIGJhY2t0aWNrIHdyYXBwZXIgYW5kIG5vcm1hbGl6ZXMgaW5kZW50YXRpb24gKHN0cmlwQm9keSlcbiAqICAgLSBUb2tlbml6ZXMgaW50byBsaW5lcyB3aXRoIGluZGVudCBsZXZlbHMgKHRva2VuaXplKVxuICogICAtIFBhcnNlcyBpbnRvIGEgdHlwZWQgTEVTTm9kZSBBU1QgKExFU1BhcnNlcilcbiAqXG4gKiBAdGhyb3dzIExFU1BhcnNlRXJyb3Igb24gdW5yZWNvdmVyYWJsZSBzeW50YXggZXJyb3JzIChjdXJyZW50bHkgc29mdC13YXJucyBpbnN0ZWFkKVxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VMRVMocmF3OiBzdHJpbmcpOiBMRVNOb2RlIHtcbiAgY29uc3Qgc3RyaXBwZWQgPSBzdHJpcEJvZHkocmF3KVxuICBjb25zdCB0b2tlbnMgICA9IHRva2VuaXplKHN0cmlwcGVkKVxuICBjb25zdCBwYXJzZXIgICA9IG5ldyBMRVNQYXJzZXIodG9rZW5zKVxuICByZXR1cm4gcGFyc2VyLnBhcnNlKClcbn1cbiIsICIvKipcbiAqIFBoYXNlIDQ6IHdpcmVzIHRoZSBwYXJzZWQgY29uZmlnIGludG8gbGl2ZSBydW50aW1lIGJlaGF2aW9yLlxuICpcbiAqIFJlc3BvbnNpYmlsaXRpZXM6XG4gKiAgIDEuIFJlZ2lzdGVyIGFsbCA8bG9jYWwtY29tbWFuZD4gcGFyc2VkIGRlZnMgaW50byB0aGUgQ29tbWFuZFJlZ2lzdHJ5XG4gKiAgIDIuIEF0dGFjaCBDdXN0b21FdmVudCBsaXN0ZW5lcnMgb24gdGhlIGhvc3QgZm9yIGVhY2ggPG9uLWV2ZW50PlxuICogICAzLiBXaXJlIDxvbi1sb2FkPiB0byBmaXJlIGFmdGVyIERPTSBpcyByZWFkeVxuICogICA0LiBCdWlsZCB0aGUgTEVTQ29udGV4dCB1c2VkIGJ5IHRoZSBleGVjdXRvclxuICpcbiAqIDxvbi1zaWduYWw+IGFuZCA8b24tZW50ZXI+Lzxvbi1leGl0PiBhcmUgd2lyZWQgaW4gUGhhc2UgNS82LlxuICovXG5cbmltcG9ydCB7IGV4ZWN1dGUsIGV2YWxFeHByIH0gZnJvbSAnLi9leGVjdXRvci5qcydcbmltcG9ydCB7IExFU1Njb3BlIH0gZnJvbSAnLi9zY29wZS5qcydcbmltcG9ydCB0eXBlIHsgQ29tbWFuZFJlZ2lzdHJ5IH0gZnJvbSAnLi9yZWdpc3RyeS5qcydcbmltcG9ydCB0eXBlIHsgTW9kdWxlUmVnaXN0cnkgfSBmcm9tICdAbW9kdWxlcy90eXBlcy5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29uZmlnIH0gZnJvbSAnQHBhcnNlci9jb25maWcuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcbmltcG9ydCB7IHBhcnNlTEVTIH0gZnJvbSAnQHBhcnNlci9pbmRleC5qcydcblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZWRXaXJpbmcge1xuICBjb21tYW5kczogIEFycmF5PHsgbmFtZTogc3RyaW5nOyBndWFyZDogc3RyaW5nIHwgbnVsbDsgYXJnc1Jhdzogc3RyaW5nOyBib2R5OiBMRVNOb2RlIH0+XG4gIGhhbmRsZXJzOiAgQXJyYXk8eyBldmVudDogc3RyaW5nOyBib2R5OiBMRVNOb2RlIH0+XG4gIHdhdGNoZXJzOiAgQXJyYXk8eyBzaWduYWw6IHN0cmluZzsgd2hlbjogc3RyaW5nIHwgbnVsbDsgYm9keTogTEVTTm9kZSB9PlxuICBsaWZlY3ljbGU6IHtcbiAgICBvbkxvYWQ6ICBMRVNOb2RlW11cbiAgICBvbkVudGVyOiBBcnJheTx7IHdoZW46IHN0cmluZyB8IG51bGw7IGJvZHk6IExFU05vZGUgfT5cbiAgICBvbkV4aXQ6ICBMRVNOb2RlW11cbiAgfVxufVxuXG4vKiogQnVpbGRzIGEgTEVTQ29udGV4dCBmb3IgdGhlIGhvc3QgZWxlbWVudC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENvbnRleHQoXG4gIGhvc3Q6IEVsZW1lbnQsXG4gIGNvbW1hbmRzOiBDb21tYW5kUmVnaXN0cnksXG4gIG1vZHVsZXM6IE1vZHVsZVJlZ2lzdHJ5LFxuICBzaWduYWxzOiB7IGdldDogKGs6IHN0cmluZykgPT4gdW5rbm93bjsgc2V0OiAoazogc3RyaW5nLCB2OiB1bmtub3duKSA9PiB2b2lkIH1cbik6IGltcG9ydCgnLi9leGVjdXRvci5qcycpLkxFU0NvbnRleHQge1xuICBjb25zdCBzY29wZSA9IG5ldyBMRVNTY29wZSgpXG5cbiAgY29uc3QgZW1pdExvY2FsID0gKGV2ZW50OiBzdHJpbmcsIHBheWxvYWQ6IHVua25vd25bXSkgPT4ge1xuICAgIGNvbnNvbGUubG9nKGBbTEVTXSBlbWl0IFwiJHtldmVudH1cImAsIHBheWxvYWQubGVuZ3RoID8gcGF5bG9hZCA6ICcnKVxuICAgIGhvc3QuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoZXZlbnQsIHtcbiAgICAgIGRldGFpbDogeyBwYXlsb2FkIH0sXG4gICAgICBidWJibGVzOiBmYWxzZSxcbiAgICAgIGNvbXBvc2VkOiBmYWxzZSxcbiAgICB9KSlcbiAgfVxuXG4gIGNvbnN0IGJyb2FkY2FzdCA9IChldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHtcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gYnJvYWRjYXN0IFwiJHtldmVudH1cImAsIHBheWxvYWQubGVuZ3RoID8gcGF5bG9hZCA6ICcnKVxuICAgIC8vIERpc3BhdGNoIG9uIGRvY3VtZW50IGRpcmVjdGx5LCBub3Qgb24gdGhlIGhvc3QgZWxlbWVudC5cbiAgICAvLyBUaGlzIHByZXZlbnRzIHRoZSBob3N0J3Mgb3duIG9uLWV2ZW50IGxpc3RlbmVycyBmcm9tIGNhdGNoaW5nIHRoZVxuICAgIC8vIGJyb2FkY2FzdCBcdTIwMTQgdGhlIGhvc3QgaXMgdGhlIG9yaWdpbiwgbm90IGEgcmVjZWl2ZXIuXG4gICAgLy8gTGlzdGVuZXJzIG9uIGRvY3VtZW50IChlLmcuIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIpIGFuZCBEYXRhc3RhclxuICAgIC8vIGRhdGEtb246IGJpbmRpbmdzIG9uIGFueSBET00gZWxlbWVudCBzdGlsbCByZWNlaXZlIGl0IG5vcm1hbGx5LlxuICAgIGNvbnN0IHJvb3QgPSBob3N0LmdldFJvb3ROb2RlKClcbiAgICBjb25zdCB0YXJnZXQgPSByb290IGluc3RhbmNlb2YgRG9jdW1lbnQgPyByb290IDogKHJvb3QgYXMgU2hhZG93Um9vdCkub3duZXJEb2N1bWVudCA/PyBkb2N1bWVudFxuICAgIHRhcmdldC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudChldmVudCwge1xuICAgICAgZGV0YWlsOiB7IHBheWxvYWQgfSxcbiAgICAgIGJ1YmJsZXM6IGZhbHNlLCAgIC8vIGFscmVhZHkgYXQgdGhlIHRvcCBcdTIwMTQgYnViYmxpbmcgaXMgbWVhbmluZ2xlc3MgaGVyZVxuICAgICAgY29tcG9zZWQ6IGZhbHNlLFxuICAgIH0pKVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzY29wZSxcbiAgICBob3N0LFxuICAgIGNvbW1hbmRzLFxuICAgIG1vZHVsZXMsXG4gICAgZ2V0U2lnbmFsOiBzaWduYWxzLmdldCxcbiAgICBzZXRTaWduYWw6IHNpZ25hbHMuc2V0LFxuICAgIGVtaXRMb2NhbCxcbiAgICBicm9hZGNhc3QsXG4gIH1cbn1cblxuLyoqXG4gKiBSZWdpc3RlcnMgYWxsIHBhcnNlZCBjb21tYW5kcyBpbnRvIHRoZSByZWdpc3RyeS5cbiAqIENhbGxlZCBvbmNlIGR1cmluZyBfaW5pdCwgYmVmb3JlIGFueSBldmVudHMgYXJlIHdpcmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJDb21tYW5kcyhcbiAgd2lyaW5nOiBQYXJzZWRXaXJpbmcsXG4gIHJlZ2lzdHJ5OiBDb21tYW5kUmVnaXN0cnlcbik6IHZvaWQge1xuICBmb3IgKGNvbnN0IGNtZCBvZiB3aXJpbmcuY29tbWFuZHMpIHtcbiAgICAvLyBQYXJzZSBhcmdzUmF3IGludG8gQXJnRGVmW10gKHNpbXBsaWZpZWQgXHUyMDE0IGZ1bGwgYXJnIHBhcnNpbmcgaW4gUGhhc2UgMiByZWZpbmVtZW50KVxuICAgIGNvbnN0IGFyZ3MgPSBwYXJzZUFyZ3NSYXcoY21kLmFyZ3NSYXcpXG4gICAgY29uc3QgZGVmOiBpbXBvcnQoJy4vcmVnaXN0cnkuanMnKS5Db21tYW5kRGVmID0ge1xuICAgICAgbmFtZTogY21kLm5hbWUsXG4gICAgICBhcmdzLFxuICAgICAgYm9keTogY21kLmJvZHksXG4gICAgICBlbGVtZW50OiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsb2NhbC1jb21tYW5kJyksXG4gICAgfVxuICAgIGlmIChjbWQuZ3VhcmQpIGRlZi5ndWFyZCA9IGNtZC5ndWFyZFxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKGRlZilcbiAgfVxuICBjb25zb2xlLmxvZyhgW0xFU10gcmVnaXN0ZXJlZCAke3dpcmluZy5jb21tYW5kcy5sZW5ndGh9IGNvbW1hbmRzYClcbn1cblxuLyoqXG4gKiBBdHRhY2hlcyBldmVudCBsaXN0ZW5lcnMgb24gdGhlIGhvc3QgZm9yIGFsbCA8b24tZXZlbnQ+IGhhbmRsZXJzLlxuICogUmV0dXJucyBhIGNsZWFudXAgZnVuY3Rpb24gdGhhdCByZW1vdmVzIGFsbCBsaXN0ZW5lcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXJlRXZlbnRIYW5kbGVycyhcbiAgd2lyaW5nOiBQYXJzZWRXaXJpbmcsXG4gIGhvc3Q6IEVsZW1lbnQsXG4gIGdldEN0eDogKCkgPT4gaW1wb3J0KCcuL2V4ZWN1dG9yLmpzJykuTEVTQ29udGV4dFxuKTogKCkgPT4gdm9pZCB7XG4gIGNvbnN0IGNsZWFudXBzOiBBcnJheTwoKSA9PiB2b2lkPiA9IFtdXG5cbiAgZm9yIChjb25zdCBoYW5kbGVyIG9mIHdpcmluZy5oYW5kbGVycykge1xuICAgIGNvbnN0IGxpc3RlbmVyID0gKGU6IEV2ZW50KSA9PiB7XG4gICAgICBjb25zdCBjdHggPSBnZXRDdHgoKVxuICAgICAgLy8gRXhwb3NlIGV2ZW50IGRldGFpbCBpbiBzY29wZVxuICAgICAgY29uc3QgaGFuZGxlclNjb3BlID0gY3R4LnNjb3BlLmNoaWxkKClcbiAgICAgIGNvbnN0IGRldGFpbCA9IChlIGFzIEN1c3RvbUV2ZW50KS5kZXRhaWwgPz8ge31cbiAgICAgIGhhbmRsZXJTY29wZS5zZXQoJ2V2ZW50JywgZSlcbiAgICAgIGhhbmRsZXJTY29wZS5zZXQoJ3BheWxvYWQnLCBkZXRhaWwucGF5bG9hZCA/PyBbXSlcbiAgICAgIGNvbnN0IGhhbmRsZXJDdHggPSB7IC4uLmN0eCwgc2NvcGU6IGhhbmRsZXJTY29wZSB9XG5cbiAgICAgIGV4ZWN1dGUoaGFuZGxlci5ib2R5LCBoYW5kbGVyQ3R4KS5jYXRjaChlcnIgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbTEVTXSBFcnJvciBpbiBoYW5kbGVyIGZvciBcIiR7aGFuZGxlci5ldmVudH1cIjpgLCBlcnIpXG4gICAgICB9KVxuICAgIH1cblxuICAgIGhvc3QuYWRkRXZlbnRMaXN0ZW5lcihoYW5kbGVyLmV2ZW50LCBsaXN0ZW5lcilcbiAgICBjbGVhbnVwcy5wdXNoKCgpID0+IGhvc3QucmVtb3ZlRXZlbnRMaXN0ZW5lcihoYW5kbGVyLmV2ZW50LCBsaXN0ZW5lcikpXG4gICAgY29uc29sZS5sb2coYFtMRVNdIHdpcmVkIGV2ZW50IGhhbmRsZXI6IFwiJHtoYW5kbGVyLmV2ZW50fVwiYClcbiAgfVxuXG4gIHJldHVybiAoKSA9PiBjbGVhbnVwcy5mb3JFYWNoKGZuID0+IGZuKCkpXG59XG5cbi8qKlxuICogRmlyZXMgYWxsIDxvbi1sb2FkPiBib2RpZXMuXG4gKiBDYWxsZWQgYWZ0ZXIgY29tbWFuZHMgYXJlIHJlZ2lzdGVyZWQgYW5kIGV2ZW50IGhhbmRsZXJzIGFyZSB3aXJlZCxcbiAqIHNvIGVtaXQvY2FsbCBzdGF0ZW1lbnRzIGluIG9uLWxvYWQgY2FuIHJlYWNoIHRoZWlyIHRhcmdldHMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaXJlT25Mb2FkKFxuICB3aXJpbmc6IFBhcnNlZFdpcmluZyxcbiAgZ2V0Q3R4OiAoKSA9PiBpbXBvcnQoJy4vZXhlY3V0b3IuanMnKS5MRVNDb250ZXh0XG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgZm9yIChjb25zdCBib2R5IG9mIHdpcmluZy5saWZlY3ljbGUub25Mb2FkKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGV4ZWN1dGUoYm9keSwgZ2V0Q3R4KCkpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbTEVTXSBFcnJvciBpbiBvbi1sb2FkOicsIGVycilcbiAgICB9XG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBBcmcgcGFyc2luZyAoc2ltcGxpZmllZCBcdTIwMTQgZnVsbCB0eXBlLWNoZWNrZWQgdmVyc2lvbiBpbiBQaGFzZSAyIHJlZmluZW1lbnQpXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuaW1wb3J0IHR5cGUgeyBBcmdEZWYgfSBmcm9tICcuL3JlZ2lzdHJ5LmpzJ1xuaW1wb3J0IHR5cGUgeyBFeHByTm9kZSB9IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuXG5mdW5jdGlvbiBwYXJzZUFyZ3NSYXcocmF3OiBzdHJpbmcpOiBBcmdEZWZbXSB7XG4gIGlmICghcmF3LnRyaW0oKSkgcmV0dXJuIFtdXG4gIC8vIFN0cmlwIG91dGVyIGJyYWNrZXRzOiBcIltmcm9tOnN0ciAgdG86c3RyICBhdHRlbXB0OmludD0wXVwiIFx1MjE5MiBcImZyb206c3RyICB0bzpzdHIgIGF0dGVtcHQ6aW50PTBcIlxuICBjb25zdCBpbm5lciA9IHJhdy5yZXBsYWNlKC9eXFxbfFxcXSQvZywgJycpLnRyaW0oKVxuICBpZiAoIWlubmVyKSByZXR1cm4gW11cblxuICByZXR1cm4gaW5uZXIuc3BsaXQoL1xcc3syLH18XFxzKD89XFx3KzopLykubWFwKHMgPT4gcy50cmltKCkpLmZpbHRlcihCb29sZWFuKS5tYXAocGFydCA9PiB7XG4gICAgLy8gYG5hbWU6dHlwZT1kZWZhdWx0YCBvciBgbmFtZTp0eXBlYFxuICAgIGNvbnN0IGVxSWR4ID0gcGFydC5pbmRleE9mKCc9JylcbiAgICBjb25zdCBjb2xvbklkeCA9IHBhcnQuaW5kZXhPZignOicpXG4gICAgaWYgKGNvbG9uSWR4ID09PSAtMSkgcmV0dXJuIHsgbmFtZTogcGFydCwgdHlwZTogJ2R5bicgfVxuXG4gICAgY29uc3QgbmFtZSA9IHBhcnQuc2xpY2UoMCwgY29sb25JZHgpLnRyaW0oKVxuICAgIGNvbnN0IHJlc3QgPSBwYXJ0LnNsaWNlKGNvbG9uSWR4ICsgMSlcblxuICAgIGlmIChlcUlkeCA9PT0gLTEpIHtcbiAgICAgIHJldHVybiB7IG5hbWUsIHR5cGU6IHJlc3QudHJpbSgpIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdHlwZSA9IHBhcnQuc2xpY2UoY29sb25JZHggKyAxLCBlcUlkeCkudHJpbSgpXG4gICAgICBjb25zdCBkZWZhdWx0UmF3ID0gcGFydC5zbGljZShlcUlkeCArIDEpLnRyaW0oKVxuICAgICAgY29uc3QgZGVmYXVsdEV4cHI6IEV4cHJOb2RlID0geyB0eXBlOiAnZXhwcicsIHJhdzogZGVmYXVsdFJhdyB9XG4gICAgICByZXR1cm4geyBuYW1lLCB0eXBlLCBkZWZhdWx0OiBkZWZhdWx0RXhwciB9XG4gICAgfVxuICB9KVxufVxuIiwgIi8qKlxuICogTEVTU2NvcGUgXHUyMDE0IGEgc2ltcGxlIGxleGljYWxseS1zY29wZWQgdmFyaWFibGUgc3RvcmUuXG4gKlxuICogRWFjaCBjb21tYW5kIGludm9jYXRpb24gZ2V0cyBhIGZyZXNoIGNoaWxkIHNjb3BlLlxuICogTWF0Y2ggYXJtIGJpbmRpbmdzIGFsc28gY3JlYXRlIGEgY2hpbGQgc2NvcGUgbGltaXRlZCB0byB0aGF0IGFybSdzIGJvZHkuXG4gKiBTaWduYWwgcmVhZHMvd3JpdGVzIGdvIHRocm91Z2ggdGhlIERhdGFzdGFyIGJyaWRnZSwgbm90IHRoaXMgc2NvcGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBMRVNTY29wZSB7XG4gIHByaXZhdGUgbG9jYWxzID0gbmV3IE1hcDxzdHJpbmcsIHVua25vd24+KClcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBhcmVudD86IExFU1Njb3BlKSB7fVxuXG4gIGdldChuYW1lOiBzdHJpbmcpOiB1bmtub3duIHtcbiAgICBpZiAodGhpcy5sb2NhbHMuaGFzKG5hbWUpKSByZXR1cm4gdGhpcy5sb2NhbHMuZ2V0KG5hbWUpXG4gICAgcmV0dXJuIHRoaXMucGFyZW50Py5nZXQobmFtZSlcbiAgfVxuXG4gIHNldChuYW1lOiBzdHJpbmcsIHZhbHVlOiB1bmtub3duKTogdm9pZCB7XG4gICAgdGhpcy5sb2NhbHMuc2V0KG5hbWUsIHZhbHVlKVxuICB9XG5cbiAgaGFzKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmxvY2Fscy5oYXMobmFtZSkgfHwgKHRoaXMucGFyZW50Py5oYXMobmFtZSkgPz8gZmFsc2UpXG4gIH1cblxuICAvKiogQ3JlYXRlIGEgY2hpbGQgc2NvcGUgaW5oZXJpdGluZyBhbGwgbG9jYWxzIGZyb20gdGhpcyBvbmUuICovXG4gIGNoaWxkKCk6IExFU1Njb3BlIHtcbiAgICByZXR1cm4gbmV3IExFU1Njb3BlKHRoaXMpXG4gIH1cblxuICAvKiogU25hcHNob3QgYWxsIGxvY2FscyAoZm9yIGRlYnVnZ2luZyAvIGVycm9yIG1lc3NhZ2VzKS4gKi9cbiAgc25hcHNob3QoKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xuICAgIGNvbnN0IGJhc2UgPSB0aGlzLnBhcmVudD8uc25hcHNob3QoKSA/PyB7fVxuICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIHRoaXMubG9jYWxzKSBiYXNlW2tdID0gdlxuICAgIHJldHVybiBiYXNlXG4gIH1cbn1cbiIsICIvKipcbiAqIFBoYXNlIDVhOiBJbnRlcnNlY3Rpb25PYnNlcnZlciB3aXJpbmdcbiAqXG4gKiBPbmUgc2hhcmVkIEludGVyc2VjdGlvbk9ic2VydmVyIGlzIGNyZWF0ZWQgcGVyIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGhvc3QuXG4gKiBJdCB3YXRjaGVzIHRoZSBob3N0IGVsZW1lbnQgaXRzZWxmIChub3QgaXRzIGNoaWxkcmVuKS5cbiAqXG4gKiBvbi1lbnRlcjogZmlyZXMgd2hlbiB0aGUgaG9zdCBjcm9zc2VzIGludG8gdGhlIHZpZXdwb3J0XG4gKiAgIC0gRWFjaCA8b24tZW50ZXI+IGhhcyBhbiBvcHRpb25hbCBgd2hlbmAgZ3VhcmQgZXZhbHVhdGVkIGF0IGZpcmUgdGltZVxuICogICAtIE11bHRpcGxlIDxvbi1lbnRlcj4gY2hpbGRyZW4gYXJlIGFsbCBjaGVja2VkIGluIGRlY2xhcmF0aW9uIG9yZGVyXG4gKlxuICogb24tZXhpdDogZmlyZXMgd2hlbiB0aGUgaG9zdCBsZWF2ZXMgdGhlIHZpZXdwb3J0XG4gKiAgIC0gQWx3YXlzIGZpcmVzIHVuY29uZGl0aW9uYWxseSAobm8gYHdoZW5gIGd1YXJkIG9uIG9uLWV4aXQpXG4gKiAgIC0gTXVsdGlwbGUgPG9uLWV4aXQ+IGNoaWxkcmVuIGFsbCBmaXJlXG4gKlxuICogVGhlIG9ic2VydmVyIGlzIGRpc2Nvbm5lY3RlZCBpbiBkaXNjb25uZWN0ZWRDYWxsYmFjayB2aWEgdGhlIHJldHVybmVkIGNsZWFudXAgZm4uXG4gKi9cblxuaW1wb3J0IHsgZXhlY3V0ZSwgZXZhbEV4cHIgfSBmcm9tICcuL2V4ZWN1dG9yLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNDb250ZXh0IH0gZnJvbSAnLi9leGVjdXRvci5qcydcbmltcG9ydCB0eXBlIHsgTEVTTm9kZSB9IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIE9uRW50ZXJEZWNsIHtcbiAgd2hlbjogc3RyaW5nIHwgbnVsbFxuICBib2R5OiBMRVNOb2RlXG59XG5cbi8qKlxuICogQXR0YWNoZXMgYW4gSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgdG8gdGhlIGhvc3QgZWxlbWVudC5cbiAqXG4gKiBAcmV0dXJucyBBIGNsZWFudXAgZnVuY3Rpb24gdGhhdCBkaXNjb25uZWN0cyB0aGUgb2JzZXJ2ZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXJlSW50ZXJzZWN0aW9uT2JzZXJ2ZXIoXG4gIGhvc3Q6IEVsZW1lbnQsXG4gIG9uRW50ZXI6IE9uRW50ZXJEZWNsW10sXG4gIG9uRXhpdDogTEVTTm9kZVtdLFxuICBnZXRDdHg6ICgpID0+IExFU0NvbnRleHQsXG4pOiAoKSA9PiB2b2lkIHtcbiAgaWYgKG9uRW50ZXIubGVuZ3RoID09PSAwICYmIG9uRXhpdC5sZW5ndGggPT09IDApIHtcbiAgICAvLyBOb3RoaW5nIHRvIG9ic2VydmUgXHUyMDE0IHNraXAgY3JlYXRpbmcgdGhlIElPIGVudGlyZWx5XG4gICAgcmV0dXJuICgpID0+IHt9XG4gIH1cblxuICBsZXQgd2FzSW50ZXJzZWN0aW5nOiBib29sZWFuIHwgbnVsbCA9IG51bGxcblxuICBjb25zdCBvYnNlcnZlciA9IG5ldyBJbnRlcnNlY3Rpb25PYnNlcnZlcihcbiAgICAoZW50cmllcykgPT4ge1xuICAgICAgLy8gSU8gZmlyZXMgb25jZSBpbW1lZGlhdGVseSBvbiBhdHRhY2ggd2l0aCB0aGUgY3VycmVudCBzdGF0ZS5cbiAgICAgIC8vIFdlIHRyYWNrIGB3YXNJbnRlcnNlY3RpbmdgIHRvIGF2b2lkIHNwdXJpb3VzIG9uLWV4aXQgb24gZmlyc3QgdGljay5cbiAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xuICAgICAgICBjb25zdCBub3dJbnRlcnNlY3RpbmcgPSBlbnRyeS5pc0ludGVyc2VjdGluZ1xuXG4gICAgICAgIGlmIChub3dJbnRlcnNlY3RpbmcgJiYgd2FzSW50ZXJzZWN0aW5nICE9PSB0cnVlKSB7XG4gICAgICAgICAgLy8gRW50ZXJlZCB2aWV3cG9ydFxuICAgICAgICAgIHdhc0ludGVyc2VjdGluZyA9IHRydWVcbiAgICAgICAgICBoYW5kbGVFbnRlcihvbkVudGVyLCBnZXRDdHgpXG4gICAgICAgIH0gZWxzZSBpZiAoIW5vd0ludGVyc2VjdGluZyAmJiB3YXNJbnRlcnNlY3RpbmcgPT09IHRydWUpIHtcbiAgICAgICAgICAvLyBFeGl0ZWQgdmlld3BvcnQgKG9ubHkgYWZ0ZXIgd2UndmUgYmVlbiBpbiBpdClcbiAgICAgICAgICB3YXNJbnRlcnNlY3RpbmcgPSBmYWxzZVxuICAgICAgICAgIGhhbmRsZUV4aXQob25FeGl0LCBnZXRDdHgpXG4gICAgICAgIH0gZWxzZSBpZiAod2FzSW50ZXJzZWN0aW5nID09PSBudWxsKSB7XG4gICAgICAgICAgLy8gRmlyc3QgdGljayBcdTIwMTQgcmVjb3JkIHN0YXRlIGJ1dCBkb24ndCBmaXJlIGV4aXQgZm9yIGluaXRpYWxseS1vZmYtc2NyZWVuXG4gICAgICAgICAgd2FzSW50ZXJzZWN0aW5nID0gbm93SW50ZXJzZWN0aW5nXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgIC8vIERlZmF1bHQgdGhyZXNob2xkOiBmaXJlIHdoZW4gYW55IHBpeGVsIG9mIHRoZSBob3N0IGVudGVycy9leGl0c1xuICAgICAgdGhyZXNob2xkOiAwLFxuICAgIH1cbiAgKVxuXG4gIG9ic2VydmVyLm9ic2VydmUoaG9zdClcbiAgY29uc29sZS5sb2coJ1tMRVNdIEludGVyc2VjdGlvbk9ic2VydmVyIGF0dGFjaGVkJywgKGhvc3QgYXMgSFRNTEVsZW1lbnQpLmlkIHx8IGhvc3QudGFnTmFtZSlcblxuICByZXR1cm4gKCkgPT4ge1xuICAgIG9ic2VydmVyLmRpc2Nvbm5lY3QoKVxuICAgIGNvbnNvbGUubG9nKCdbTEVTXSBJbnRlcnNlY3Rpb25PYnNlcnZlciBkaXNjb25uZWN0ZWQnKVxuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUVudGVyKGRlY2xzOiBPbkVudGVyRGVjbFtdLCBnZXRDdHg6ICgpID0+IExFU0NvbnRleHQpOiB2b2lkIHtcbiAgY29uc3QgY3R4ID0gZ2V0Q3R4KClcblxuICBmb3IgKGNvbnN0IGRlY2wgb2YgZGVjbHMpIHtcbiAgICAvLyBFdmFsdWF0ZSBgd2hlbmAgZ3VhcmQgXHUyMDE0IGlmIGFic2VudCwgYWx3YXlzIGZpcmVzXG4gICAgaWYgKGRlY2wud2hlbikge1xuICAgICAgY29uc3QgcGFzc2VzID0gQm9vbGVhbihldmFsRXhwcih7IHR5cGU6ICdleHByJywgcmF3OiBkZWNsLndoZW4gfSwgY3R4KSlcbiAgICAgIGlmICghcGFzc2VzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSBvbi1lbnRlciBndWFyZCByZWplY3RlZDogJHtkZWNsLndoZW59YClcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cbiAgICB9XG5cbiAgICBleGVjdXRlKGRlY2wuYm9keSwgY3R4KS5jYXRjaChlcnIgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcignW0xFU10gRXJyb3IgaW4gb24tZW50ZXI6JywgZXJyKVxuICAgIH0pXG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRXhpdChib2RpZXM6IExFU05vZGVbXSwgZ2V0Q3R4OiAoKSA9PiBMRVNDb250ZXh0KTogdm9pZCB7XG4gIGNvbnN0IGN0eCA9IGdldEN0eCgpXG5cbiAgZm9yIChjb25zdCBib2R5IG9mIGJvZGllcykge1xuICAgIGV4ZWN1dGUoYm9keSwgY3R4KS5jYXRjaChlcnIgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcignW0xFU10gRXJyb3IgaW4gb24tZXhpdDonLCBlcnIpXG4gICAgfSlcbiAgfVxufVxuIiwgIi8qKlxuICogUGhhc2UgNWI6IFNpZ25hbCB3YXRjaGVyIHdpcmluZ1xuICpcbiAqIDxvbi1zaWduYWw+IHJlYWN0cyB3aGVuZXZlciBhIG5hbWVkIERhdGFzdGFyIHNpZ25hbCBjaGFuZ2VzLlxuICogVGhlIGB3aGVuYCBndWFyZCBpcyByZS1ldmFsdWF0ZWQgb24gZXZlcnkgY2hhbmdlIFx1MjAxNCBpZiBmYWxzeSwgdGhlXG4gKiBoYW5kbGUgYm9keSBkb2VzIG5vdCBydW4gKG5vdCBhbiBlcnJvciwganVzdCBmaWx0ZXJlZCBvdXQpLlxuICpcbiAqIEluIFBoYXNlIDUgd2UgdXNlIGEgc2ltcGxlIGxvY2FsIG5vdGlmaWNhdGlvbiBwYXRoOiB3aGVuZXZlclxuICogTG9jYWxFdmVudFNjcmlwdC5fc2V0U2lnbmFsKCkgd3JpdGVzIGEgdmFsdWUsIGl0IGNhbGxzIGludG9cbiAqIG5vdGlmeVNpZ25hbFdhdGNoZXJzKCkuIFRoaXMgaGFuZGxlcyB0aGUgZmFsbGJhY2sgKG5vIERhdGFzdGFyKSBjYXNlLlxuICpcbiAqIFBoYXNlIDYgcmVwbGFjZXMgdGhlIG5vdGlmaWNhdGlvbiBwYXRoIHdpdGggRGF0YXN0YXIncyBlZmZlY3QoKSBzeXN0ZW0sXG4gKiB3aGljaCBpcyBtb3JlIGVmZmljaWVudCAoYmF0Y2hlZCwgZGVkdXBlZCwgcmVhY3RpdmUgZ3JhcGgtYXdhcmUpLlxuICpcbiAqIFRoZSB3YXRjaGVyIGZpcmVzIHRoZSBib2R5IGFzeW5jaHJvbm91c2x5IChub24tYmxvY2tpbmcpIHRvIG1hdGNoXG4gKiB0aGUgYmVoYXZpb3VyIG9mIERhdGFzdGFyJ3MgcmVhY3RpdmUgZWZmZWN0cy5cbiAqL1xuXG5pbXBvcnQgeyBleGVjdXRlLCBldmFsRXhwciB9IGZyb20gJy4vZXhlY3V0b3IuanMnXG5pbXBvcnQgdHlwZSB7IExFU0NvbnRleHQgfSBmcm9tICcuL2V4ZWN1dG9yLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNOb2RlIH0gZnJvbSAnQHBhcnNlci9hc3QuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgU2lnbmFsV2F0Y2hlckRlY2wge1xuICAvKiogU2lnbmFsIG5hbWUgd2l0aCAkIHByZWZpeDogXCIkZmVlZFN0YXRlXCIgKi9cbiAgc2lnbmFsOiBzdHJpbmdcbiAgLyoqIE9wdGlvbmFsIGd1YXJkIGV4cHJlc3Npb24gXHUyMDE0IG51bGwgbWVhbnMgYWx3YXlzIGZpcmVzICovXG4gIHdoZW46IHN0cmluZyB8IG51bGxcbiAgYm9keTogTEVTTm9kZVxufVxuXG4vKipcbiAqIENoZWNrcyBhbGwgc2lnbmFsIHdhdGNoZXJzIHRvIHNlZSBpZiBhbnkgc2hvdWxkIGZpcmUgZm9yIHRoZVxuICogZ2l2ZW4gc2lnbmFsIG5hbWUgY2hhbmdlLlxuICpcbiAqIENhbGxlZCBmcm9tIExvY2FsRXZlbnRTY3JpcHQuX3NldFNpZ25hbCgpIGFmdGVyIGV2ZXJ5IHdyaXRlLlxuICogQWxzbyBjYWxsZWQgZnJvbSBQaGFzZSA2IERhdGFzdGFyIGVmZmVjdCgpIHN1YnNjcmlwdGlvbnMuXG4gKlxuICogQHBhcmFtIGNoYW5nZWRTaWduYWwgIFRoZSBzaWduYWwgbmFtZSAqd2l0aG91dCogdGhlICQgcHJlZml4XG4gKiBAcGFyYW0gd2F0Y2hlcnMgICAgICAgQWxsIG9uLXNpZ25hbCBkZWNsYXJhdGlvbnMgZm9yIHRoaXMgTEVTIGluc3RhbmNlXG4gKiBAcGFyYW0gZ2V0Q3R4ICAgICAgICAgUmV0dXJucyB0aGUgY3VycmVudCBleGVjdXRpb24gY29udGV4dFxuICovXG5leHBvcnQgZnVuY3Rpb24gbm90aWZ5U2lnbmFsV2F0Y2hlcnMoXG4gIGNoYW5nZWRTaWduYWw6IHN0cmluZyxcbiAgd2F0Y2hlcnM6IFNpZ25hbFdhdGNoZXJEZWNsW10sXG4gIGdldEN0eDogKCkgPT4gTEVTQ29udGV4dFxuKTogdm9pZCB7XG4gIGZvciAoY29uc3Qgd2F0Y2hlciBvZiB3YXRjaGVycykge1xuICAgIC8vIE5vcm1hbGl6ZTogc3RyaXAgbGVhZGluZyAkIGZvciBjb21wYXJpc29uXG4gICAgY29uc3Qgd2F0Y2hlZEtleSA9IHdhdGNoZXIuc2lnbmFsLnJlcGxhY2UoL15cXCQvLCAnJylcblxuICAgIGlmICh3YXRjaGVkS2V5ICE9PSBjaGFuZ2VkU2lnbmFsKSBjb250aW51ZVxuXG4gICAgY29uc3QgY3R4ID0gZ2V0Q3R4KClcblxuICAgIC8vIEV2YWx1YXRlIGB3aGVuYCBndWFyZFxuICAgIGlmICh3YXRjaGVyLndoZW4pIHtcbiAgICAgIGNvbnN0IHBhc3NlcyA9IEJvb2xlYW4oZXZhbEV4cHIoeyB0eXBlOiAnZXhwcicsIHJhdzogd2F0Y2hlci53aGVuIH0sIGN0eCkpXG4gICAgICBpZiAoIXBhc3NlcykgY29udGludWVcbiAgICB9XG5cbiAgICAvLyBGaXJlIHRoZSBib2R5IGFzeW5jaHJvbm91c2x5IFx1MjAxNCBkb24ndCBibG9jayB0aGUgc2lnbmFsIHdyaXRlIHBhdGhcbiAgICBleGVjdXRlKHdhdGNoZXIuYm9keSwgY3R4KS5jYXRjaChlcnIgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcihgW0xFU10gRXJyb3IgaW4gb24tc2lnbmFsIFwiJHt3YXRjaGVyLnNpZ25hbH1cIjpgLCBlcnIpXG4gICAgfSlcbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBEYXRhc3Rhci1jb21wYXRpYmxlIGVmZmVjdCBzdWJzY3JpcHRpb24gZm9yIG9uZSBzaWduYWwgd2F0Y2hlci5cbiAqIFVzZWQgaW4gUGhhc2UgNiB3aGVuIERhdGFzdGFyIGlzIHByZXNlbnQuXG4gKlxuICogQHBhcmFtIHdhdGNoZXIgICBUaGUgb24tc2lnbmFsIGRlY2xhcmF0aW9uXG4gKiBAcGFyYW0gZWZmZWN0ICAgIERhdGFzdGFyJ3MgZWZmZWN0KCkgZnVuY3Rpb25cbiAqIEBwYXJhbSBnZXRDdHggICAgUmV0dXJucyB0aGUgY3VycmVudCBleGVjdXRpb24gY29udGV4dFxuICovXG5leHBvcnQgZnVuY3Rpb24gd2lyZVNpZ25hbFdhdGNoZXJWaWFEYXRhc3RhcihcbiAgd2F0Y2hlcjogU2lnbmFsV2F0Y2hlckRlY2wsXG4gIGVmZmVjdDogKGZuOiAoKSA9PiB2b2lkKSA9PiB2b2lkLFxuICBnZXRDdHg6ICgpID0+IExFU0NvbnRleHRcbik6IHZvaWQge1xuICBlZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IGN0eCA9IGdldEN0eCgpXG5cbiAgICAvLyBSZWFkaW5nIHRoZSBzaWduYWwgaW5zaWRlIGFuIGVmZmVjdCgpIGF1dG8tc3Vic2NyaWJlcyB1cyB0byBpdFxuICAgIGNvbnN0IHNpZ25hbEtleSA9IHdhdGNoZXIuc2lnbmFsLnJlcGxhY2UoL15cXCQvLCAnJylcbiAgICBjdHguZ2V0U2lnbmFsKHNpZ25hbEtleSkgLy8gc3Vic2NyaXB0aW9uIHNpZGUtZWZmZWN0XG5cbiAgICBpZiAod2F0Y2hlci53aGVuKSB7XG4gICAgICBjb25zdCBwYXNzZXMgPSBCb29sZWFuKGV2YWxFeHByKHsgdHlwZTogJ2V4cHInLCByYXc6IHdhdGNoZXIud2hlbiB9LCBjdHgpKVxuICAgICAgaWYgKCFwYXNzZXMpIHJldHVyblxuICAgIH1cblxuICAgIGV4ZWN1dGUod2F0Y2hlci5ib2R5LCBjdHgpLmNhdGNoKGVyciA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKGBbTEVTXSBFcnJvciBpbiBvbi1zaWduYWwgXCIke3dhdGNoZXIuc2lnbmFsfVwiIChEYXRhc3Rhcik6YCwgZXJyKVxuICAgIH0pXG4gIH0pXG59XG4iLCAiaW1wb3J0IHsgQ29tbWFuZFJlZ2lzdHJ5IH0gZnJvbSAnQHJ1bnRpbWUvcmVnaXN0cnkuanMnXG5pbXBvcnQgeyBNb2R1bGVSZWdpc3RyeSwgbG9hZE1vZHVsZSB9IGZyb20gJ0Btb2R1bGVzL3R5cGVzLmpzJ1xuaW1wb3J0IHsgcmVhZENvbmZpZywgbG9nQ29uZmlnIH0gZnJvbSAnQHBhcnNlci9yZWFkZXIuanMnXG5pbXBvcnQgeyBwYXJzZUxFUyB9IGZyb20gJ0BwYXJzZXIvaW5kZXguanMnXG5pbXBvcnQgeyBidWlsZENvbnRleHQsIHJlZ2lzdGVyQ29tbWFuZHMsIHdpcmVFdmVudEhhbmRsZXJzLCBmaXJlT25Mb2FkLCB0eXBlIFBhcnNlZFdpcmluZyB9IGZyb20gJ0BydW50aW1lL3dpcmluZy5qcydcbmltcG9ydCB7IHdpcmVJbnRlcnNlY3Rpb25PYnNlcnZlciB9IGZyb20gJ0BydW50aW1lL29ic2VydmVyLmpzJ1xuaW1wb3J0IHsgbm90aWZ5U2lnbmFsV2F0Y2hlcnMsIHdpcmVTaWduYWxXYXRjaGVyVmlhRGF0YXN0YXIgfSBmcm9tICdAcnVudGltZS9zaWduYWxzLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNDb25maWcgfSBmcm9tICdAcGFyc2VyL2NvbmZpZy5qcydcbmltcG9ydCB0eXBlIHsgTEVTTm9kZSB9IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNDb250ZXh0IH0gZnJvbSAnQHJ1bnRpbWUvZXhlY3V0b3IuanMnXG5cbmV4cG9ydCBjbGFzcyBMb2NhbEV2ZW50U2NyaXB0IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICByZWFkb25seSBjb21tYW5kcyA9IG5ldyBDb21tYW5kUmVnaXN0cnkoKVxuICByZWFkb25seSBtb2R1bGVzICA9IG5ldyBNb2R1bGVSZWdpc3RyeSgpXG5cbiAgcHJpdmF0ZSBfY29uZmlnOiAgTEVTQ29uZmlnIHwgbnVsbCAgPSBudWxsXG4gIHByaXZhdGUgX3dpcmluZzogIFBhcnNlZFdpcmluZyB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgX2N0eDogICAgIExFU0NvbnRleHQgfCBudWxsID0gbnVsbFxuXG4gIC8vIENsZWFudXAgZm5zIGFjY3VtdWxhdGVkIGR1cmluZyBfaW5pdCBcdTIwMTQgYWxsIGNhbGxlZCBpbiBfdGVhcmRvd25cbiAgcHJpdmF0ZSBfY2xlYW51cHM6IEFycmF5PCgpID0+IHZvaWQ+ID0gW11cblxuICAvLyBTaW1wbGUgZmFsbGJhY2sgc2lnbmFsIHN0b3JlIChEYXRhc3RhciBicmlkZ2UgcmVwbGFjZXMgcmVhZHMvd3JpdGVzIGluIFBoYXNlIDYpXG4gIHByaXZhdGUgX3NpZ25hbHM6IE1hcDxzdHJpbmcsIHVua25vd24+ID0gbmV3IE1hcCgpXG5cbiAgLy8gRGF0YXN0YXIgYnJpZGdlIChwb3B1bGF0ZWQgaW4gUGhhc2UgNiB2aWEgYXR0cmlidXRlIHBsdWdpbilcbiAgcHJpdmF0ZSBfZHNFZmZlY3Q6ICgoZm46ICgpID0+IHZvaWQpID0+IHZvaWQpIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG4gIHByaXZhdGUgX2RzU2lnbmFsOiAoPFQ+KG5hbWU6IHN0cmluZywgaW5pdD86IFQpID0+IHsgdmFsdWU6IFQgfSkgfCB1bmRlZmluZWQgPSB1bmRlZmluZWRcblxuICBnZXQgY29uZmlnKCk6ICBMRVNDb25maWcgfCBudWxsICAgIHsgcmV0dXJuIHRoaXMuX2NvbmZpZyB9XG4gIGdldCB3aXJpbmcoKTogIFBhcnNlZFdpcmluZyB8IG51bGwgeyByZXR1cm4gdGhpcy5fd2lyaW5nIH1cbiAgZ2V0IGNvbnRleHQoKTogTEVTQ29udGV4dCB8IG51bGwgICB7IHJldHVybiB0aGlzLl9jdHggfVxuXG4gIHN0YXRpYyBnZXQgb2JzZXJ2ZWRBdHRyaWJ1dGVzKCk6IHN0cmluZ1tdIHsgcmV0dXJuIFtdIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBxdWV1ZU1pY3JvdGFzaygoKSA9PiB0aGlzLl9pbml0KCkpXG4gIH1cblxuICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICB0aGlzLl90ZWFyZG93bigpXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgSW50ZXJuYWwgbGlmZWN5Y2xlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgYXN5bmMgX2luaXQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGluaXRpYWxpemluZycsIHRoaXMuaWQgfHwgJyhubyBpZCknKVxuXG4gICAgLy8gUHJlLXNlZWQgbG9jYWwgc2lnbmFsIHN0b3JlIGZyb20gZGF0YS1zaWduYWxzOiogYXR0cmlidXRlcy5cbiAgICAvLyBUaGUgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgY2FuIGZpcmUgYmVmb3JlIERhdGFzdGFyJ3MgYXN5bmMgcGx1Z2luIGNvbm5lY3RzLFxuICAgIC8vIHNvIGd1YXJkIGV4cHJlc3Npb25zIGxpa2UgYCRpbnRyb1N0YXRlID09ICdoaWRkZW4nYCB3b3VsZCBldmFsdWF0ZSB0b1xuICAgIC8vIGB1bmRlZmluZWQgPT0gJ2hpZGRlbidgIFx1MjE5MiBmYWxzZSB3aXRob3V0IHRoaXMgcHJlLXNlZWRpbmcgc3RlcC5cbiAgICB0aGlzLl9zZWVkU2lnbmFsc0Zyb21BdHRyaWJ1dGVzKClcblxuICAgIC8vIFBoYXNlIDE6IERPTSBcdTIxOTIgY29uZmlnXG4gICAgdGhpcy5fY29uZmlnID0gcmVhZENvbmZpZyh0aGlzKVxuICAgIGxvZ0NvbmZpZyh0aGlzLl9jb25maWcpXG5cbiAgICAvLyBQaGFzZSA4OiBsb2FkIG1vZHVsZXMgYmVmb3JlIHBhcnNpbmcgc28gcHJpbWl0aXZlIG5hbWVzIHJlc29sdmVcbiAgICBhd2FpdCB0aGlzLl9sb2FkTW9kdWxlcyh0aGlzLl9jb25maWcpXG5cbiAgICAvLyBQaGFzZSAyOiBwYXJzZSBib2R5IHN0cmluZ3MgXHUyMTkyIEFTVFxuICAgIHRoaXMuX3dpcmluZyA9IHRoaXMuX3BhcnNlQWxsKHRoaXMuX2NvbmZpZylcblxuICAgIC8vIFBoYXNlIDQ6IGJ1aWxkIGNvbnRleHQsIHJlZ2lzdGVyIGNvbW1hbmRzLCB3aXJlIGV2ZW50IGhhbmRsZXJzXG4gICAgdGhpcy5fY3R4ID0gYnVpbGRDb250ZXh0KFxuICAgICAgdGhpcyxcbiAgICAgIHRoaXMuY29tbWFuZHMsXG4gICAgICB0aGlzLm1vZHVsZXMsXG4gICAgICB7IGdldDogayA9PiB0aGlzLl9nZXRTaWduYWwoayksIHNldDogKGssIHYpID0+IHRoaXMuX3NldFNpZ25hbChrLCB2KSB9XG4gICAgKVxuXG4gICAgcmVnaXN0ZXJDb21tYW5kcyh0aGlzLl93aXJpbmcsIHRoaXMuY29tbWFuZHMpXG5cbiAgICB0aGlzLl9jbGVhbnVwcy5wdXNoKFxuICAgICAgd2lyZUV2ZW50SGFuZGxlcnModGhpcy5fd2lyaW5nLCB0aGlzLCAoKSA9PiB0aGlzLl9jdHghKVxuICAgIClcblxuICAgIC8vIFBoYXNlIDVhOiBJbnRlcnNlY3Rpb25PYnNlcnZlciBmb3Igb24tZW50ZXIgLyBvbi1leGl0XG4gICAgdGhpcy5fY2xlYW51cHMucHVzaChcbiAgICAgIHdpcmVJbnRlcnNlY3Rpb25PYnNlcnZlcihcbiAgICAgICAgdGhpcyxcbiAgICAgICAgdGhpcy5fd2lyaW5nLmxpZmVjeWNsZS5vbkVudGVyLFxuICAgICAgICB0aGlzLl93aXJpbmcubGlmZWN5Y2xlLm9uRXhpdCxcbiAgICAgICAgKCkgPT4gdGhpcy5fY3R4IVxuICAgICAgKVxuICAgIClcblxuICAgIC8vIFBoYXNlIDViOiBzaWduYWwgd2F0Y2hlcnNcbiAgICAvLyBJZiBEYXRhc3RhciBpcyBjb25uZWN0ZWQgdXNlIGl0cyByZWFjdGl2ZSBlZmZlY3QoKSBzeXN0ZW07XG4gICAgLy8gb3RoZXJ3aXNlIHRoZSBsb2NhbCBfc2V0U2lnbmFsIHBhdGggY2FsbHMgbm90aWZ5U2lnbmFsV2F0Y2hlcnMgZGlyZWN0bHkuXG4gICAgaWYgKHRoaXMuX2RzRWZmZWN0KSB7XG4gICAgICBmb3IgKGNvbnN0IHdhdGNoZXIgb2YgdGhpcy5fd2lyaW5nLndhdGNoZXJzKSB7XG4gICAgICAgIHdpcmVTaWduYWxXYXRjaGVyVmlhRGF0YXN0YXIod2F0Y2hlciwgdGhpcy5fZHNFZmZlY3QsICgpID0+IHRoaXMuX2N0eCEpXG4gICAgICB9XG4gICAgICBjb25zb2xlLmxvZyhgW0xFU10gd2lyZWQgJHt0aGlzLl93aXJpbmcud2F0Y2hlcnMubGVuZ3RofSBzaWduYWwgd2F0Y2hlcnMgdmlhIERhdGFzdGFyYClcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coYFtMRVNdIHdpcmVkICR7dGhpcy5fd2lyaW5nLndhdGNoZXJzLmxlbmd0aH0gc2lnbmFsIHdhdGNoZXJzIChsb2NhbCBmYWxsYmFjaylgKVxuICAgIH1cblxuICAgIC8vIFBoYXNlIDY6IERhdGFzdGFyIGJyaWRnZSBmdWxsIGFjdGl2YXRpb24gXHUyMDE0IGNvbWluZyBuZXh0XG5cbiAgICAvLyBvbi1sb2FkIGZpcmVzIGxhc3QsIGFmdGVyIGV2ZXJ5dGhpbmcgaXMgd2lyZWRcbiAgICBhd2FpdCBmaXJlT25Mb2FkKHRoaXMuX3dpcmluZywgKCkgPT4gdGhpcy5fY3R4ISlcblxuICAgIGNvbnNvbGUubG9nKCdbTEVTXSByZWFkeTonLCB0aGlzLmlkIHx8ICcobm8gaWQpJylcbiAgfVxuXG4gIHByaXZhdGUgX3RlYXJkb3duKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBkaXNjb25uZWN0ZWQnLCB0aGlzLmlkIHx8ICcobm8gaWQpJylcbiAgICBmb3IgKGNvbnN0IGNsZWFudXAgb2YgdGhpcy5fY2xlYW51cHMpIGNsZWFudXAoKVxuICAgIHRoaXMuX2NsZWFudXBzID0gW11cbiAgICB0aGlzLl9jb25maWcgICA9IG51bGxcbiAgICB0aGlzLl93aXJpbmcgICA9IG51bGxcbiAgICB0aGlzLl9jdHggICAgICA9IG51bGxcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBTaWduYWwgc3RvcmUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgLyoqXG4gICAqIFJlYWRzIGFsbCBkYXRhLXNpZ25hbHM6S0VZPVwiVkFMVUVcIiBhdHRyaWJ1dGVzIG9uIHRoZSBob3N0IGVsZW1lbnQgYW5kXG4gICAqIHByZS1wb3B1bGF0ZXMgdGhlIGxvY2FsIF9zaWduYWxzIE1hcCB3aXRoIHRoZWlyIGluaXRpYWwgdmFsdWVzLlxuICAgKlxuICAgKiBEYXRhc3RhciBldmFsdWF0ZXMgdGhlc2UgYXMgSlMgZXhwcmVzc2lvbnMgKGUuZy4gXCInaGlkZGVuJ1wiIFx1MjE5MiBcImhpZGRlblwiLFxuICAgKiBcIjBcIiBcdTIxOTIgMCwgXCJbXVwiIFx1MjE5MiBbXSkuIFdlIGRvIHRoZSBzYW1lIHdpdGggYSBzaW1wbGUgZXZhbC5cbiAgICpcbiAgICogVGhpcyBydW5zIHN5bmNocm9ub3VzbHkgYmVmb3JlIGFueSBhc3luYyBvcGVyYXRpb25zIHNvIHRoYXQgdGhlXG4gICAqIEludGVyc2VjdGlvbk9ic2VydmVyIFx1MjAxNCB3aGljaCBtYXkgZmlyZSBiZWZvcmUgRGF0YXN0YXIgY29ubmVjdHMgXHUyMDE0IHNlZXNcbiAgICogdGhlIGNvcnJlY3QgaW5pdGlhbCBzaWduYWwgdmFsdWVzIHdoZW4gZXZhbHVhdGluZyBgd2hlbmAgZ3VhcmRzLlxuICAgKi9cbiAgcHJpdmF0ZSBfc2VlZFNpZ25hbHNGcm9tQXR0cmlidXRlcygpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGF0dHIgb2YgQXJyYXkuZnJvbSh0aGlzLmF0dHJpYnV0ZXMpKSB7XG4gICAgICAvLyBNYXRjaCBkYXRhLXNpZ25hbHM6S0VZIG9yIGRhdGEtc3Rhci1zaWduYWxzOktFWSAoYWxpYXNlZCBidW5kbGUpXG4gICAgICBjb25zdCBtID0gYXR0ci5uYW1lLm1hdGNoKC9eZGF0YS0oPzpzdGFyLSk/c2lnbmFsczooLispJC8pXG4gICAgICBpZiAoIW0pIGNvbnRpbnVlXG4gICAgICBjb25zdCBrZXkgPSBtWzFdIVxuICAgICAgICAucmVwbGFjZSgvLShbYS16XSkvZywgKF8sIGNoOiBzdHJpbmcpID0+IGNoLnRvVXBwZXJDYXNlKCkpIC8vIGtlYmFiLWNhc2UgXHUyMTkyIGNhbWVsQ2FzZVxuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gRXZhbHVhdGUgdGhlIGF0dHJpYnV0ZSB2YWx1ZSBhcyBhIEpTIGV4cHJlc3Npb24gKHNhbWUgYXMgRGF0YXN0YXIgZG9lcylcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLW5ldy1mdW5jXG4gICAgICAgIGNvbnN0IHZhbHVlID0gbmV3IEZ1bmN0aW9uKGByZXR1cm4gKCR7YXR0ci52YWx1ZX0pYCkoKVxuICAgICAgICB0aGlzLl9zaWduYWxzLnNldChrZXksIHZhbHVlKVxuICAgICAgICBjb25zb2xlLmxvZyhgW0xFU10gc2VlZGVkICQke2tleX0gPWAsIHZhbHVlKVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIElmIGl0IGZhaWxzLCBzdG9yZSB0aGUgcmF3IHN0cmluZyB2YWx1ZVxuICAgICAgICB0aGlzLl9zaWduYWxzLnNldChrZXksIGF0dHIudmFsdWUpXG4gICAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSBzZWVkZWQgJCR7a2V5fSA9IChyYXcpYCwgYXR0ci52YWx1ZSlcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9nZXRTaWduYWwobmFtZTogc3RyaW5nKTogdW5rbm93biB7XG4gICAgLy8gUGhhc2UgNjogcHJlZmVyIERhdGFzdGFyIHNpZ25hbCB0cmVlIHdoZW4gYnJpZGdlIGlzIGNvbm5lY3RlZFxuICAgIGlmICh0aGlzLl9kc1NpZ25hbCkge1xuICAgICAgdHJ5IHsgcmV0dXJuIHRoaXMuX2RzU2lnbmFsKG5hbWUpLnZhbHVlIH0gY2F0Y2ggeyAvKiBmYWxsIHRocm91Z2ggKi8gfVxuICAgIH1cbiAgICAvLyBUcnkgZXhhY3QgY2FzZSBmaXJzdCAoZS5nLiBEYXRhc3Rhci1zZXQgc2lnbmFscyBhcmUgY2FtZWxDYXNlKS5cbiAgICAvLyBGYWxsIGJhY2sgdG8gbG93ZXJjYXNlIGJlY2F1c2UgSFRNTCBub3JtYWxpemVzIGF0dHJpYnV0ZSBuYW1lcyB0byBsb3dlcmNhc2UsXG4gICAgLy8gc28gZGF0YS1zaWduYWxzOmludHJvU3RhdGUgXHUyMTkyIHNlZWRlZCBhcyBcImludHJvc3RhdGVcIiwgYnV0IGd1YXJkcyByZWZlcmVuY2UgXCIkaW50cm9TdGF0ZVwiLlxuICAgIGlmICh0aGlzLl9zaWduYWxzLmhhcyhuYW1lKSkgcmV0dXJuIHRoaXMuX3NpZ25hbHMuZ2V0KG5hbWUpXG4gICAgaWYgKHRoaXMuX3NpZ25hbHMuaGFzKG5hbWUudG9Mb3dlckNhc2UoKSkpIHJldHVybiB0aGlzLl9zaWduYWxzLmdldChuYW1lLnRvTG93ZXJDYXNlKCkpXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG5cbiAgcHJpdmF0ZSBfc2V0U2lnbmFsKG5hbWU6IHN0cmluZywgdmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICBjb25zdCBwcmV2ID0gdGhpcy5fc2lnbmFscy5nZXQobmFtZSlcbiAgICB0aGlzLl9zaWduYWxzLnNldChuYW1lLCB2YWx1ZSlcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gJCR7bmFtZX0gPWAsIHZhbHVlKVxuXG4gICAgLy8gUGhhc2UgNjogd3JpdGUgdGhyb3VnaCB0byBEYXRhc3RhcidzIHJlYWN0aXZlIGdyYXBoXG4gICAgaWYgKHRoaXMuX2RzU2lnbmFsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBzaWcgPSB0aGlzLl9kc1NpZ25hbDx1bmtub3duPihuYW1lLCB2YWx1ZSlcbiAgICAgICAgc2lnLnZhbHVlID0gdmFsdWVcbiAgICAgIH0gY2F0Y2ggeyAvKiBzaWduYWwgbWF5IG5vdCBleGlzdCBpbiBEYXRhc3RhciB5ZXQgKi8gfVxuICAgIH1cblxuICAgIC8vIFBoYXNlIDViOiBub3RpZnkgbG9jYWwgc2lnbmFsIHdhdGNoZXJzIChmYWxsYmFjayBwYXRoIHdoZW4gRGF0YXN0YXIgYWJzZW50KVxuICAgIGlmIChwcmV2ICE9PSB2YWx1ZSAmJiB0aGlzLl93aXJpbmcgJiYgdGhpcy5fY3R4ICYmICF0aGlzLl9kc0VmZmVjdCkge1xuICAgICAgbm90aWZ5U2lnbmFsV2F0Y2hlcnMobmFtZSwgdGhpcy5fd2lyaW5nLndhdGNoZXJzLCAoKSA9PiB0aGlzLl9jdHghKVxuICAgIH1cbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBNb2R1bGUgbG9hZGluZyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwcml2YXRlIGFzeW5jIF9sb2FkTW9kdWxlcyhjb25maWc6IExFU0NvbmZpZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmIChjb25maWcubW9kdWxlcy5sZW5ndGggPT09IDApIHJldHVyblxuICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgY29uZmlnLm1vZHVsZXMubWFwKGRlY2wgPT5cbiAgICAgICAgbG9hZE1vZHVsZSh0aGlzLm1vZHVsZXMsIHtcbiAgICAgICAgICAuLi4oZGVjbC50eXBlID8geyB0eXBlOiBkZWNsLnR5cGUgfSA6IHt9KSxcbiAgICAgICAgICAuLi4oZGVjbC5zcmMgID8geyBzcmM6ICBkZWNsLnNyYyAgfSA6IHt9KSxcbiAgICAgICAgfSkuY2F0Y2goZXJyID0+IGNvbnNvbGUud2FybignW0xFU10gTW9kdWxlIGxvYWQgZmFpbGVkOicsIGVycikpXG4gICAgICApXG4gICAgKVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFBhcnNlIGFsbCBib2RpZXMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBfcGFyc2VBbGwoY29uZmlnOiBMRVNDb25maWcpOiBQYXJzZWRXaXJpbmcge1xuICAgIGxldCBvayA9IDAsIGZhaWwgPSAwXG5cbiAgICBjb25zdCB0cnlQYXJzZSA9IChib2R5OiBzdHJpbmcsIGxhYmVsOiBzdHJpbmcpOiBMRVNOb2RlID0+IHtcbiAgICAgIHRyeSB7IG9rKys7IHJldHVybiBwYXJzZUxFUyhib2R5KSB9XG4gICAgICBjYXRjaCAoZSkge1xuICAgICAgICBmYWlsKytcbiAgICAgICAgY29uc29sZS5lcnJvcihgW0xFU10gUGFyc2UgZXJyb3IgaW4gJHtsYWJlbH06YCwgZSlcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogJ2V4cHInLCByYXc6ICcnIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB3aXJpbmc6IFBhcnNlZFdpcmluZyA9IHtcbiAgICAgIGNvbW1hbmRzOiBjb25maWcuY29tbWFuZHMubWFwKGQgPT4gKHtcbiAgICAgICAgbmFtZTogZC5uYW1lLCBndWFyZDogZC5ndWFyZCwgYXJnc1JhdzogZC5hcmdzUmF3LFxuICAgICAgICBib2R5OiB0cnlQYXJzZShkLmJvZHksIGBjb21tYW5kIFwiJHtkLm5hbWV9XCJgKSxcbiAgICAgIH0pKSxcbiAgICAgIGhhbmRsZXJzOiBjb25maWcub25FdmVudC5tYXAoZCA9PiAoe1xuICAgICAgICBldmVudDogZC5uYW1lLFxuICAgICAgICBib2R5OiB0cnlQYXJzZShkLmJvZHksIGBvbi1ldmVudCBcIiR7ZC5uYW1lfVwiYCksXG4gICAgICB9KSksXG4gICAgICB3YXRjaGVyczogY29uZmlnLm9uU2lnbmFsLm1hcChkID0+ICh7XG4gICAgICAgIHNpZ25hbDogZC5uYW1lLCB3aGVuOiBkLndoZW4sXG4gICAgICAgIGJvZHk6IHRyeVBhcnNlKGQuYm9keSwgYG9uLXNpZ25hbCBcIiR7ZC5uYW1lfVwiYCksXG4gICAgICB9KSksXG4gICAgICBsaWZlY3ljbGU6IHtcbiAgICAgICAgb25Mb2FkOiAgY29uZmlnLm9uTG9hZC5tYXAoZCA9PiB0cnlQYXJzZShkLmJvZHksICdvbi1sb2FkJykpLFxuICAgICAgICBvbkVudGVyOiBjb25maWcub25FbnRlci5tYXAoZCA9PiAoeyB3aGVuOiBkLndoZW4sIGJvZHk6IHRyeVBhcnNlKGQuYm9keSwgJ29uLWVudGVyJykgfSkpLFxuICAgICAgICBvbkV4aXQ6ICBjb25maWcub25FeGl0Lm1hcChkID0+IHRyeVBhcnNlKGQuYm9keSwgJ29uLWV4aXQnKSksXG4gICAgICB9LFxuICAgIH1cblxuICAgIGNvbnN0IHRvdGFsID0gb2sgKyBmYWlsXG4gICAgY29uc29sZS5sb2coYFtMRVNdIHBhcnNlcjogJHtva30vJHt0b3RhbH0gYm9kaWVzIHBhcnNlZCBzdWNjZXNzZnVsbHkke2ZhaWwgPiAwID8gYCAoJHtmYWlsfSBlcnJvcnMpYCA6ICcnfWApXG4gICAgcmV0dXJuIHdpcmluZ1xuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIERhdGFzdGFyIGJyaWRnZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBjb25uZWN0RGF0YXN0YXIoZm5zOiB7XG4gICAgZWZmZWN0OiAoZm46ICgpID0+IHZvaWQpID0+IHZvaWRcbiAgICBzaWduYWw6IDxUPihuYW1lOiBzdHJpbmcsIGluaXQ/OiBUKSA9PiB7IHZhbHVlOiBUIH1cbiAgfSk6IHZvaWQge1xuICAgIHRoaXMuX2RzRWZmZWN0ID0gZm5zLmVmZmVjdFxuICAgIHRoaXMuX2RzU2lnbmFsID0gZm5zLnNpZ25hbFxuICAgIGNvbnNvbGUubG9nKCdbTEVTXSBEYXRhc3RhciBicmlkZ2UgY29ubmVjdGVkJywgdGhpcy5pZClcbiAgfVxuXG4gIGRpc2Nvbm5lY3REYXRhc3RhcigpOiB2b2lkIHtcbiAgICB0aGlzLl9kc0VmZmVjdCA9IHVuZGVmaW5lZFxuICAgIHRoaXMuX2RzU2lnbmFsID0gdW5kZWZpbmVkXG4gIH1cblxuICBnZXQgZHNFZmZlY3QoKSB7IHJldHVybiB0aGlzLl9kc0VmZmVjdCB9XG4gIGdldCBkc1NpZ25hbCgpICB7IHJldHVybiB0aGlzLl9kc1NpZ25hbCB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFB1YmxpYyBBUEkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgLyoqIEZpcmUgYSBuYW1lZCBsb2NhbCBldmVudCBpbnRvIHRoaXMgTEVTIGluc3RhbmNlIGZyb20gb3V0c2lkZS4gKi9cbiAgZmlyZShldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10gPSBbXSk6IHZvaWQge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoZXZlbnQsIHtcbiAgICAgIGRldGFpbDogeyBwYXlsb2FkIH0sIGJ1YmJsZXM6IGZhbHNlLCBjb21wb3NlZDogZmFsc2UsXG4gICAgfSkpXG4gIH1cblxuICAvKiogQ2FsbCBhIGNvbW1hbmQgYnkgbmFtZSBmcm9tIG91dHNpZGUgKGUuZy4gYnJvd3NlciBjb25zb2xlLCB0ZXN0cykuICovXG4gIGFzeW5jIGNhbGwoY29tbWFuZDogc3RyaW5nLCBhcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLl9jdHgpIHsgY29uc29sZS53YXJuKCdbTEVTXSBub3QgaW5pdGlhbGl6ZWQgeWV0Jyk7IHJldHVybiB9XG4gICAgY29uc3QgeyBydW5Db21tYW5kIH0gPSBhd2FpdCBpbXBvcnQoJ0BydW50aW1lL2V4ZWN1dG9yLmpzJylcbiAgICBhd2FpdCBydW5Db21tYW5kKGNvbW1hbmQsIGFyZ3MsIHRoaXMuX2N0eClcbiAgfVxuXG4gIC8qKiBSZWFkIGEgc2lnbmFsIHZhbHVlIGRpcmVjdGx5IChmb3IgZGVidWdnaW5nKS4gKi9cbiAgc2lnbmFsKG5hbWU6IHN0cmluZyk6IHVua25vd24ge1xuICAgIHJldHVybiB0aGlzLl9nZXRTaWduYWwobmFtZSlcbiAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ2xvY2FsLWV2ZW50LXNjcmlwdCcsIExvY2FsRXZlbnRTY3JpcHQpXG4iLCAiLyoqXG4gKiA8bG9jYWwtY29tbWFuZD4gXHUyMDE0IGRlZmluZXMgYSBuYW1lZCwgY2FsbGFibGUgY29tbWFuZCB3aXRoaW4gYSA8bG9jYWwtZXZlbnQtc2NyaXB0Pi5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBuYW1lICAgIFJlcXVpcmVkLiBDb21tYW5kIG5hbWUsIGNvbG9uLW5hbWVzcGFjZWQ6IFwiZmVlZDpmZXRjaFwiXG4gKiAgIGFyZ3MgICAgT3B0aW9uYWwuIFR5cGVkIGFyZ3VtZW50IGxpc3Q6IFwiW2Zyb206c3RyICB0bzpzdHJdXCJcbiAqICAgZ3VhcmQgICBPcHRpb25hbC4gSlMgZXhwcmVzc2lvbiBcdTIwMTQgZmFsc3kgPSBzaWxlbnQgbm8tb3AsIG5vIHJlc2N1ZS9hZnRlcndhcmRzXG4gKiAgIGRvICAgICAgUmVxdWlyZWQuIExFUyBib2R5IChiYWNrdGljay1xdW90ZWQgZm9yIG11bHRpLWxpbmUpXG4gKlxuICogVGhpcyBlbGVtZW50IGlzIHB1cmVseSBkZWNsYXJhdGl2ZSBcdTIwMTQgaXQgaG9sZHMgZGF0YS5cbiAqIFRoZSBob3N0IDxsb2NhbC1ldmVudC1zY3JpcHQ+IHJlYWRzIGl0IGR1cmluZyBQaGFzZSAxIGFuZCByZWdpc3RlcnNcbiAqIHRoZSBwYXJzZWQgQ29tbWFuZERlZiBpbiBpdHMgQ29tbWFuZFJlZ2lzdHJ5LlxuICpcbiAqIE5vdGU6IDxjb21tYW5kPiB3YXMgYSBkZXByZWNhdGVkIEhUTUw1IGVsZW1lbnQgXHUyMDE0IHdlIHVzZSA8bG9jYWwtY29tbWFuZD5cbiAqIHRvIHNhdGlzZnkgdGhlIGN1c3RvbSBlbGVtZW50IGh5cGhlbiByZXF1aXJlbWVudCBhbmQgYXZvaWQgdGhlIGNvbGxpc2lvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIExvY2FsQ29tbWFuZCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEF0dHJpYnV0ZSBhY2Nlc3NvcnMgKHR5cGVkLCB0cmltbWVkKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBnZXQgY29tbWFuZE5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICAvKiogUmF3IGFyZ3Mgc3RyaW5nIGUuZy4gXCJbZnJvbTpzdHIgIHRvOnN0cl1cIiBcdTIwMTQgcGFyc2VkIGJ5IFBoYXNlIDIgKi9cbiAgZ2V0IGFyZ3NSYXcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ2FyZ3MnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICAvKiogR3VhcmQgZXhwcmVzc2lvbiBzdHJpbmcgXHUyMDE0IGV2YWx1YXRlZCBieSBydW50aW1lIGJlZm9yZSBleGVjdXRpb24gKi9cbiAgZ2V0IGd1YXJkRXhwcigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ2d1YXJkJyk/LnRyaW0oKSA/PyBudWxsXG4gIH1cblxuICAvKiogUmF3IExFUyBib2R5IFx1MjAxNCBtYXkgYmUgYmFja3RpY2std3JhcHBlZCBmb3IgbXVsdGktbGluZSAqL1xuICBnZXQgZG9Cb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdkbycpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIC8vIFBoYXNlIDA6IHZlcmlmeSBlbGVtZW50IGlzIHJlY29nbml6ZWQuXG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxsb2NhbC1jb21tYW5kPiByZWdpc3RlcmVkOicsIHRoaXMuY29tbWFuZE5hbWUgfHwgJyh1bm5hbWVkKScpXG4gIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdsb2NhbC1jb21tYW5kJywgTG9jYWxDb21tYW5kKVxuIiwgIi8qKlxuICogPG9uLWV2ZW50PiBcdTIwMTQgc3Vic2NyaWJlcyB0byBhIG5hbWVkIEN1c3RvbUV2ZW50IGRpc3BhdGNoZWQgd2l0aGluIHRoZSBMRVMgaG9zdC5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBuYW1lICAgIFJlcXVpcmVkLiBFdmVudCBuYW1lOiBcImZlZWQ6aW5pdFwiLCBcIml0ZW06ZGlzbWlzc2VkXCJcbiAqICAgaGFuZGxlICBSZXF1aXJlZC4gTEVTIGJvZHkgXHUyMDE0IHNpbmdsZS1saW5lIChubyBiYWNrdGlja3MpIG9yIG11bHRpLWxpbmUgKGJhY2t0aWNrcylcbiAqXG4gKiBQaGFzZSA0IHdpcmVzIGEgQ3VzdG9tRXZlbnQgbGlzdGVuZXIgb24gdGhlIGhvc3QgZWxlbWVudC5cbiAqIEV2ZW50cyBmaXJlZCBieSBgZW1pdGAgbmV2ZXIgYnViYmxlOyBvbmx5IGhhbmRsZXJzIHdpdGhpbiB0aGUgc2FtZVxuICogPGxvY2FsLWV2ZW50LXNjcmlwdD4gc2VlIHRoZW0uIFVzZSBgYnJvYWRjYXN0YCB0byBjcm9zcyB0aGUgYm91bmRhcnkuXG4gKi9cbmV4cG9ydCBjbGFzcyBPbkV2ZW50IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBnZXQgZXZlbnROYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCduYW1lJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgLyoqIFJhdyBMRVMgaGFuZGxlIGJvZHkgKi9cbiAgZ2V0IGhhbmRsZUJvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ2hhbmRsZScpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8b24tZXZlbnQ+IHJlZ2lzdGVyZWQ6JywgdGhpcy5ldmVudE5hbWUgfHwgJyh1bm5hbWVkKScpXG4gIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1ldmVudCcsIE9uRXZlbnQpXG4iLCAiLyoqXG4gKiA8b24tc2lnbmFsPiBcdTIwMTQgcmVhY3RzIHdoZW5ldmVyIGEgbmFtZWQgRGF0YXN0YXIgc2lnbmFsIGNoYW5nZXMgdmFsdWUuXG4gKlxuICogQXR0cmlidXRlczpcbiAqICAgbmFtZSAgICBSZXF1aXJlZC4gU2lnbmFsIHJlZmVyZW5jZTogXCIkZmVlZFN0YXRlXCIsIFwiJGZlZWRJdGVtc1wiXG4gKiAgIHdoZW4gICAgT3B0aW9uYWwuIEd1YXJkIGV4cHJlc3Npb24gXHUyMDE0IG9ubHkgZmlyZXMgaGFuZGxlIHdoZW4gdHJ1dGh5XG4gKiAgIGhhbmRsZSAgUmVxdWlyZWQuIExFUyBib2R5XG4gKlxuICogUGhhc2UgNiB3aXJlcyB0aGlzIHRvIERhdGFzdGFyJ3MgZWZmZWN0KCkgc3lzdGVtLlxuICogVW50aWwgRGF0YXN0YXIgaXMgY29ubmVjdGVkLCBmYWxscyBiYWNrIHRvIHBvbGxpbmcgKFBoYXNlIDYgZGVjaWRlcykuXG4gKlxuICogVGhlIGB3aGVuYCBndWFyZCBpcyByZS1ldmFsdWF0ZWQgb24gZXZlcnkgc2lnbmFsIGNoYW5nZS5cbiAqIEd1YXJkIGZhaWx1cmUgaXMgbm90IGFuIGVycm9yIFx1MjAxNCB0aGUgaGFuZGxlIHNpbXBseSBkb2VzIG5vdCBydW4uXG4gKi9cbmV4cG9ydCBjbGFzcyBPblNpZ25hbCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgLyoqIFNpZ25hbCBuYW1lIGluY2x1ZGluZyAkIHByZWZpeDogXCIkZmVlZFN0YXRlXCIgKi9cbiAgZ2V0IHNpZ25hbE5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICAvKiogU2lnbmFsIG5hbWUgd2l0aG91dCAkIHByZWZpeCwgZm9yIERhdGFzdGFyIEFQSSBjYWxscyAqL1xuICBnZXQgc2lnbmFsS2V5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuc2lnbmFsTmFtZS5yZXBsYWNlKC9eXFwkLywgJycpXG4gIH1cblxuICBnZXQgd2hlbkV4cHIoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCd3aGVuJyk/LnRyaW0oKSA/PyBudWxsXG4gIH1cblxuICBnZXQgaGFuZGxlQm9keSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnaGFuZGxlJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxvbi1zaWduYWw+IHJlZ2lzdGVyZWQ6JywgdGhpcy5zaWduYWxOYW1lIHx8ICcodW5uYW1lZCknKVxuICB9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnb24tc2lnbmFsJywgT25TaWduYWwpXG4iLCAiLyoqXG4gKiA8b24tbG9hZD4gXHUyMDE0IGZpcmVzIGl0cyBgcnVuYCBib2R5IG9uY2Ugd2hlbiB0aGUgaG9zdCBjb25uZWN0cyB0byB0aGUgRE9NLlxuICpcbiAqIFRpbWluZzogaWYgZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gJ2NvbXBsZXRlJywgZmlyZXMgaW1tZWRpYXRlbHkgaW5cbiAqIGNvbm5lY3RlZENhbGxiYWNrICh2aWEgcXVldWVNaWNyb3Rhc2spLiBPdGhlcndpc2Ugd2FpdHMgZm9yIERPTUNvbnRlbnRMb2FkZWQuXG4gKlxuICogUnVsZTogbGlmZWN5Y2xlIGhvb2tzIGFsd2F5cyBmaXJlIGV2ZW50cyAoYGVtaXRgKSwgbmV2ZXIgY2FsbCBjb21tYW5kcyBkaXJlY3RseS5cbiAqIFRoaXMga2VlcHMgdGhlIHN5c3RlbSB0cmFjZWFibGUgXHUyMDE0IGV2ZXJ5IGNvbW1hbmQgaW52b2NhdGlvbiBoYXMgYW4gZXZlbnQgaW4gaXRzIGhpc3RvcnkuXG4gKlxuICogQXR0cmlidXRlczpcbiAqICAgcnVuICAgUmVxdWlyZWQuIFNpbmdsZS1saW5lIExFUyBib2R5ICh1c3VhbGx5IGp1c3QgYGVtaXQgZXZlbnQ6bmFtZWApXG4gKi9cbmV4cG9ydCBjbGFzcyBPbkxvYWQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIGdldCBydW5Cb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdydW4nKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPG9uLWxvYWQ+IHJlZ2lzdGVyZWQsIHJ1bjonLCB0aGlzLnJ1bkJvZHkpXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogPG9uLWVudGVyPiBcdTIwMTQgZmlyZXMgd2hlbiB0aGUgaG9zdCA8bG9jYWwtZXZlbnQtc2NyaXB0PiBlbnRlcnMgdGhlIHZpZXdwb3J0LlxuICpcbiAqIFVzZXMgYSBzaW5nbGUgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgc2hhcmVkIGFjcm9zcyBhbGwgPG9uLWVudGVyPi88b24tZXhpdD5cbiAqIGNoaWxkcmVuIG9mIHRoZSBzYW1lIGhvc3QgKFBoYXNlIDUgY3JlYXRlcyBpdCBvbiB0aGUgaG9zdCBlbGVtZW50KS5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICB3aGVuICBPcHRpb25hbC4gR3VhcmQgZXhwcmVzc2lvbiBcdTIwMTQgb25seSBmaXJlcyBydW4gd2hlbiB0cnV0aHkuXG4gKiAgICAgICAgICBQYXR0ZXJuOiBgd2hlbj1cIiRmZWVkU3RhdGUgPT0gJ3BhdXNlZCdcImBcbiAqICAgcnVuICAgUmVxdWlyZWQuIFNpbmdsZS1saW5lIExFUyBib2R5LlxuICovXG5leHBvcnQgY2xhc3MgT25FbnRlciBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgZ2V0IHdoZW5FeHByKCk6IHN0cmluZyB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnd2hlbicpPy50cmltKCkgPz8gbnVsbFxuICB9XG5cbiAgZ2V0IHJ1bkJvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8b24tZW50ZXI+IHJlZ2lzdGVyZWQsIHdoZW46JywgdGhpcy53aGVuRXhwciA/PyAnYWx3YXlzJylcbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiA8b24tZXhpdD4gXHUyMDE0IGZpcmVzIHdoZW4gdGhlIGhvc3QgPGxvY2FsLWV2ZW50LXNjcmlwdD4gZXhpdHMgdGhlIHZpZXdwb3J0LlxuICpcbiAqIE5vIGB3aGVuYCBndWFyZCBcdTIwMTQgZXhpdCBhbHdheXMgZmlyZXMgdW5jb25kaXRpb25hbGx5LlxuICogKElmIHlvdSBuZWVkIGNvbmRpdGlvbmFsIGV4aXQgYmVoYXZpb3IsIHB1dCB0aGUgY29uZGl0aW9uIGluIHRoZSBoYW5kbGVyLilcbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBydW4gICBSZXF1aXJlZC4gU2luZ2xlLWxpbmUgTEVTIGJvZHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBPbkV4aXQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIGdldCBydW5Cb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdydW4nKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPG9uLWV4aXQ+IHJlZ2lzdGVyZWQsIHJ1bjonLCB0aGlzLnJ1bkJvZHkpXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFJlZ2lzdHJhdGlvbiBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1sb2FkJywgIE9uTG9hZClcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnb24tZW50ZXInLCBPbkVudGVyKVxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1leGl0JywgIE9uRXhpdClcbiIsICIvKipcbiAqIDx1c2UtbW9kdWxlPiBcdTIwMTQgZGVjbGFyZXMgYSB2b2NhYnVsYXJ5IGV4dGVuc2lvbiBhdmFpbGFibGUgdG8gPGxvY2FsLWNvbW1hbmQ+IGJvZGllcy5cbiAqXG4gKiBNdXN0IGFwcGVhciBiZWZvcmUgYW55IDxsb2NhbC1jb21tYW5kPiBpbiB0aGUgPGxvY2FsLWV2ZW50LXNjcmlwdD4uXG4gKiBUaGUgaG9zdCByZWFkcyA8dXNlLW1vZHVsZT4gY2hpbGRyZW4gZmlyc3QgKFBoYXNlIDgpIGFuZCByZWdpc3RlcnNcbiAqIHRoZWlyIHByaW1pdGl2ZXMgaW50byBpdHMgTW9kdWxlUmVnaXN0cnkgYmVmb3JlIHBhcnNpbmcgY29tbWFuZCBib2RpZXMuXG4gKlxuICogQXR0cmlidXRlcyAoaW5kZXBlbmRlbnQsIGNvbWJpbmFibGUpOlxuICogICB0eXBlICAgQnVpbHQtaW4gbW9kdWxlIG5hbWU6IFwiYW5pbWF0aW9uXCJcbiAqICAgc3JjICAgIFVSTC9wYXRoIHRvIGEgdXNlcmxhbmQgbW9kdWxlIEVTIG1vZHVsZTogIFwiLi9zY3JvbGwtZWZmZWN0cy5qc1wiXG4gKiAgICAgICAgICBUaGUgbW9kdWxlIG11c3QgZXhwb3J0IGEgZGVmYXVsdCBjb25mb3JtaW5nIHRvIExFU01vZHVsZTpcbiAqICAgICAgICAgIHsgbmFtZTogc3RyaW5nLCBwcmltaXRpdmVzOiBSZWNvcmQ8c3RyaW5nLCBMRVNQcmltaXRpdmU+IH1cbiAqXG4gKiBFeGFtcGxlczpcbiAqICAgPHVzZS1tb2R1bGUgdHlwZT1cImFuaW1hdGlvblwiPjwvdXNlLW1vZHVsZT5cbiAqICAgPHVzZS1tb2R1bGUgc3JjPVwiLi9zY3JvbGwtZWZmZWN0cy5qc1wiPjwvdXNlLW1vZHVsZT5cbiAqICAgPHVzZS1tb2R1bGUgc3JjPVwiLi9zcHJpbmctcGh5c2ljcy5qc1wiPjwvdXNlLW1vZHVsZT5cbiAqXG4gKiB0eXBlPSBhbmQgc3JjPSBtYXkgYXBwZWFyIHRvZ2V0aGVyIG9uIG9uZSBlbGVtZW50IGlmIHRoZSB1c2VybGFuZCBtb2R1bGVcbiAqIHdhbnRzIHRvIGRlY2xhcmUgaXRzIHR5cGUgaGludCBmb3IgdG9vbGluZyAobm90IGN1cnJlbnRseSByZXF1aXJlZCkuXG4gKi9cbmV4cG9ydCBjbGFzcyBVc2VNb2R1bGUgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIC8qKiBCdWlsdC1pbiBtb2R1bGUgdHlwZSBlLmcuIFwiYW5pbWF0aW9uXCIgKi9cbiAgZ2V0IG1vZHVsZVR5cGUoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCd0eXBlJyk/LnRyaW0oKSA/PyBudWxsXG4gIH1cblxuICAvKiogVXNlcmxhbmQgbW9kdWxlIFVSTCBlLmcuIFwiLi9zY3JvbGwtZWZmZWN0cy5qc1wiICovXG4gIGdldCBtb2R1bGVTcmMoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdzcmMnKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnN0IGRlc2MgPSB0aGlzLm1vZHVsZVR5cGVcbiAgICAgID8gYHR5cGU9XCIke3RoaXMubW9kdWxlVHlwZX1cImBcbiAgICAgIDogdGhpcy5tb2R1bGVTcmNcbiAgICAgICAgPyBgc3JjPVwiJHt0aGlzLm1vZHVsZVNyY31cImBcbiAgICAgICAgOiAnKG5vIHR5cGUgb3Igc3JjKSdcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPHVzZS1tb2R1bGU+IGRlY2xhcmVkOicsIGRlc2MpXG4gIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd1c2UtbW9kdWxlJywgVXNlTW9kdWxlKVxuIiwgIi8qKlxuICogUGhhc2UgNjogRGF0YXN0YXIgYXR0cmlidXRlIHBsdWdpblxuICpcbiAqIFJlZ2lzdGVycyA8bG9jYWwtZXZlbnQtc2NyaXB0PiBhcyBhIERhdGFzdGFyIGF0dHJpYnV0ZSBwbHVnaW4gc28gdGhhdDpcbiAqXG4gKiAgIDEuIERhdGFzdGFyJ3MgZWZmZWN0KCkgYW5kIHNpZ25hbCgpIHByaW1pdGl2ZXMgYXJlIGhhbmRlZCB0byB0aGUgaG9zdFxuICogICAgICBlbGVtZW50LCBlbmFibGluZyBwcm9wZXIgcmVhY3RpdmUgc2lnbmFsIHdhdGNoaW5nIHZpYSB0aGUgZGVwZW5kZW5jeVxuICogICAgICBncmFwaCByYXRoZXIgdGhhbiBtYW51YWwgbm90aWZpY2F0aW9uLlxuICpcbiAqICAgMi4gU2lnbmFsIHdyaXRlcyBmcm9tIGBzZXQgJHggdG8geWAgaW4gTEVTIHByb3BhZ2F0ZSBpbnRvIERhdGFzdGFyJ3NcbiAqICAgICAgcm9vdCBvYmplY3Qgc28gZGF0YS10ZXh0LCBkYXRhLXNob3csIGV0Yy4gdXBkYXRlIHJlYWN0aXZlbHkuXG4gKlxuICogICAzLiAkLXByZWZpeGVkIHNpZ25hbHMgaW4gTEVTIGV4cHJlc3Npb25zIHJlc29sdmUgZnJvbSBEYXRhc3RhcidzIHJvb3QsXG4gKiAgICAgIGdpdmluZyBMRVMgZnVsbCByZWFkIGFjY2VzcyB0byBhbGwgRGF0YXN0YXIgc3RhdGUuXG4gKlxuICogICA0LiBTaWduYWwgd2F0Y2hlcnMgb24tc2lnbmFsIGFyZSByZS13aXJlZCB0aHJvdWdoIERhdGFzdGFyJ3MgZWZmZWN0KClcbiAqICAgICAgc3lzdGVtIGZvciBwcm9wZXIgYmF0Y2hpbmcgYW5kIGRlZHVwbGljYXRpb24uXG4gKlxuICogTEVTIHdvcmtzIHdpdGhvdXQgRGF0YXN0YXIgKHN0YW5kYWxvbmUgbW9kZSkuIFRoZSBicmlkZ2UgaXMgcHVyZWx5IGFkZGl0aXZlLlxuICovXG5cbmltcG9ydCB0eXBlIHsgTG9jYWxFdmVudFNjcmlwdCB9IGZyb20gJ0BlbGVtZW50cy9Mb2NhbEV2ZW50U2NyaXB0LmpzJ1xuaW1wb3J0IHsgd2lyZVNpZ25hbFdhdGNoZXJWaWFEYXRhc3RhciB9IGZyb20gJ0BydW50aW1lL3NpZ25hbHMuanMnXG5cbmxldCBicmlkZ2VSZWdpc3RlcmVkID0gZmFsc2VcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlZ2lzdGVyRGF0YXN0YXJCcmlkZ2UoKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChicmlkZ2VSZWdpc3RlcmVkKSByZXR1cm5cblxuICB0cnkge1xuICAgIGNvbnN0IGRhdGFzdGFyID0gYXdhaXQgaW1wb3J0KCdkYXRhc3RhcicpXG4gICAgY29uc3QgeyBhdHRyaWJ1dGUgfSA9IGRhdGFzdGFyXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgUmVnaXN0ZXIgYXMgYSBEYXRhc3RhciBhdHRyaWJ1dGUgcGx1Z2luIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIC8vIE1hdGNoZXMgZWxlbWVudHMgd2l0aCBhIGBkYXRhLWxvY2FsLWV2ZW50LXNjcmlwdGAgYXR0cmlidXRlIE9SICh2aWFcbiAgICAvLyBuYW1lIG1hdGNoaW5nKSB0aGUgPGxvY2FsLWV2ZW50LXNjcmlwdD4gY3VzdG9tIGVsZW1lbnQgaXRzZWxmIHdoZW5cbiAgICAvLyBEYXRhc3RhciBzY2FucyB0aGUgRE9NLlxuICAgIC8vXG4gICAgLy8gVGhlIG5hbWUgJ2xvY2FsLWV2ZW50LXNjcmlwdCcgY2F1c2VzIERhdGFzdGFyIHRvIGFwcGx5IHRoaXMgcGx1Z2luXG4gICAgLy8gdG8gYW55IGVsZW1lbnQgd2l0aCBkYXRhLWxvY2FsLWV2ZW50LXNjcmlwdD1cIi4uLlwiIGluIHRoZSBET00uXG4gICAgLy8gV2UgYWxzbyBwYXRjaCA8bG9jYWwtZXZlbnQtc2NyaXB0PiBkaXJlY3RseSBpbiB0aGUgTXV0YXRpb25PYnNlcnZlclxuICAgIC8vIHBhdGggdmlhIHRoZSBob3N0IGVsZW1lbnQncyBjb25uZWN0ZWRDYWxsYmFjay5cbiAgICBhdHRyaWJ1dGUoe1xuICAgICAgbmFtZTogJ2xvY2FsLWV2ZW50LXNjcmlwdCcsXG4gICAgICByZXF1aXJlbWVudDoge1xuICAgICAgICBrZXk6ICdkZW5pZWQnLFxuICAgICAgICB2YWx1ZTogJ2RlbmllZCcsXG4gICAgICB9LFxuICAgICAgYXBwbHkoeyBlbCwgZWZmZWN0LCBzaWduYWwgfSkge1xuICAgICAgICBjb25zdCBob3N0ID0gZWwgYXMgTG9jYWxFdmVudFNjcmlwdFxuXG4gICAgICAgIC8vIFBoYXNlIDZhOiBoYW5kIERhdGFzdGFyJ3MgcmVhY3RpdmUgcHJpbWl0aXZlcyB0byB0aGUgaG9zdFxuICAgICAgICBob3N0LmNvbm5lY3REYXRhc3Rhcih7IGVmZmVjdCwgc2lnbmFsIH0pXG5cbiAgICAgICAgLy8gUGhhc2UgNmI6IGlmIHRoZSBob3N0IGlzIGFscmVhZHkgaW5pdGlhbGl6ZWQgKHdpcmluZyByYW4gYmVmb3JlXG4gICAgICAgIC8vIERhdGFzdGFyIGF0dHJpYnV0ZSBwbHVnaW4gZmlyZWQpLCByZS13aXJlIHNpZ25hbCB3YXRjaGVycyB0aHJvdWdoXG4gICAgICAgIC8vIERhdGFzdGFyJ3MgZWZmZWN0KCkgZm9yIHByb3BlciByZWFjdGl2aXR5XG4gICAgICAgIGNvbnN0IHdpcmluZyA9IGhvc3Qud2lyaW5nXG4gICAgICAgIGlmICh3aXJpbmcgJiYgd2lyaW5nLndhdGNoZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IHdhdGNoZXIgb2Ygd2lyaW5nLndhdGNoZXJzKSB7XG4gICAgICAgICAgICB3aXJlU2lnbmFsV2F0Y2hlclZpYURhdGFzdGFyKHdhdGNoZXIsIGVmZmVjdCwgKCkgPT4gaG9zdC5jb250ZXh0ISlcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc29sZS5sb2coYFtMRVM6ZGF0YXN0YXJdIHJlLXdpcmVkICR7d2lyaW5nLndhdGNoZXJzLmxlbmd0aH0gc2lnbmFsIHdhdGNoZXJzIHZpYSBEYXRhc3RhciBlZmZlY3QoKWApXG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZygnW0xFUzpkYXRhc3Rhcl0gYXR0cmlidXRlIHBsdWdpbiBhcHBsaWVkIHRvJywgZWwuaWQgfHwgZWwudGFnTmFtZSlcblxuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgIGhvc3QuZGlzY29ubmVjdERhdGFzdGFyKClcbiAgICAgICAgICBjb25zb2xlLmxvZygnW0xFUzpkYXRhc3Rhcl0gYXR0cmlidXRlIHBsdWdpbiBjbGVhbmVkIHVwJywgZWwuaWQgfHwgZWwudGFnTmFtZSlcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9KVxuXG4gICAgYnJpZGdlUmVnaXN0ZXJlZCA9IHRydWVcbiAgICBjb25zb2xlLmxvZygnW0xFUzpkYXRhc3Rhcl0gYnJpZGdlIHJlZ2lzdGVyZWQnKVxuXG4gIH0gY2F0Y2gge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSBydW5uaW5nIGluIHN0YW5kYWxvbmUgbW9kZSAoRGF0YXN0YXIgbm90IGF2YWlsYWJsZSknKVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gU2lnbmFsIGludGVncmF0aW9uIHV0aWxpdGllc1xuLy8gVXNlZCBieSBleGVjdXRvci50cyB3aGVuIERhdGFzdGFyIGlzIHByZXNlbnRcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFJlYWRzIGEgc2lnbmFsIHZhbHVlIGZyb20gRGF0YXN0YXIncyByb290IG9iamVjdC5cbiAqIEZhbGxzIGJhY2sgdG8gdW5kZWZpbmVkIGlmIERhdGFzdGFyIGlzIG5vdCBhdmFpbGFibGUuXG4gKlxuICogVGhpcyBpcyBjYWxsZWQgYnkgdGhlIExFU0NvbnRleHQuZ2V0U2lnbmFsIGZ1bmN0aW9uIHdoZW4gdGhlIERhdGFzdGFyXG4gKiBicmlkZ2UgaXMgY29ubmVjdGVkLCBnaXZpbmcgTEVTIGV4cHJlc3Npb25zIGFjY2VzcyB0byBhbGwgRGF0YXN0YXIgc2lnbmFscy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWREYXRhc3RhclNpZ25hbChcbiAgbmFtZTogc3RyaW5nLFxuICBkc1NpZ25hbDogKDxUPihuYW1lOiBzdHJpbmcsIGluaXQ/OiBUKSA9PiB7IHZhbHVlOiBUIH0pIHwgdW5kZWZpbmVkXG4pOiB1bmtub3duIHtcbiAgaWYgKCFkc1NpZ25hbCkgcmV0dXJuIHVuZGVmaW5lZFxuICB0cnkge1xuICAgIHJldHVybiBkc1NpZ25hbChuYW1lKS52YWx1ZVxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cbn1cblxuLyoqXG4gKiBXcml0ZXMgYSB2YWx1ZSB0byBEYXRhc3RhcidzIHNpZ25hbCB0cmVlLlxuICogVGhpcyB0cmlnZ2VycyBEYXRhc3RhcidzIHJlYWN0aXZlIGdyYXBoIFx1MjAxNCBhbnkgZGF0YS10ZXh0LCBkYXRhLXNob3csXG4gKiBkYXRhLWNsYXNzIGF0dHJpYnV0ZXMgYm91bmQgdG8gdGhpcyBzaWduYWwgd2lsbCB1cGRhdGUgYXV0b21hdGljYWxseS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlRGF0YXN0YXJTaWduYWwoXG4gIG5hbWU6IHN0cmluZyxcbiAgdmFsdWU6IHVua25vd24sXG4gIGRzU2lnbmFsOiAoPFQ+KG5hbWU6IHN0cmluZywgaW5pdD86IFQpID0+IHsgdmFsdWU6IFQgfSkgfCB1bmRlZmluZWRcbik6IHZvaWQge1xuICBpZiAoIWRzU2lnbmFsKSByZXR1cm5cbiAgdHJ5IHtcbiAgICBjb25zdCBzaWcgPSBkc1NpZ25hbDx1bmtub3duPihuYW1lLCB2YWx1ZSlcbiAgICBzaWcudmFsdWUgPSB2YWx1ZVxuICB9IGNhdGNoIHtcbiAgICAvLyBTaWduYWwgbWF5IG5vdCBleGlzdCB5ZXQgXHUyMDE0IGl0IHdpbGwgYmUgY3JlYXRlZCBieSBkYXRhLXNpZ25hbHMgb24gdGhlIGhvc3RcbiAgfVxufVxuIiwgIi8qKlxuICogbG9jYWwtZXZlbnQtc2NyaXB0IFx1MjAxNCBtYWluIGVudHJ5IHBvaW50XG4gKlxuICogSW1wb3J0IG9yZGVyIG1hdHRlcnMgZm9yIGN1c3RvbSBlbGVtZW50IHJlZ2lzdHJhdGlvbjpcbiAqICAgMS4gSG9zdCBlbGVtZW50IGZpcnN0IChMb2NhbEV2ZW50U2NyaXB0KVxuICogICAyLiBDaGlsZCBlbGVtZW50cyB0aGF0IHJlZmVyZW5jZSBpdFxuICogICAzLiBEYXRhc3RhciBicmlkZ2UgbGFzdCAob3B0aW9uYWwgXHUyMDE0IGZhaWxzIGdyYWNlZnVsbHkgaWYgRGF0YXN0YXIgYWJzZW50KVxuICpcbiAqIFVzYWdlIHZpYSBpbXBvcnRtYXAgKyBzY3JpcHQgdGFnOlxuICpcbiAqICAgPHNjcmlwdCB0eXBlPVwiaW1wb3J0bWFwXCI+XG4gKiAgICAge1xuICogICAgICAgXCJpbXBvcnRzXCI6IHtcbiAqICAgICAgICAgXCJkYXRhc3RhclwiOiBcImh0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9naC9zdGFyZmVkZXJhdGlvbi9kYXRhc3RhckB2MS4wLjAtUkMuOC9idW5kbGVzL2RhdGFzdGFyLmpzXCJcbiAqICAgICAgIH1cbiAqICAgICB9XG4gKiAgIDwvc2NyaXB0PlxuICogICA8c2NyaXB0IHR5cGU9XCJtb2R1bGVcIiBzcmM9XCIvZGlzdC9sb2NhbC1ldmVudC1zY3JpcHQuanNcIj48L3NjcmlwdD5cbiAqXG4gKiBXaXRob3V0IHRoZSBpbXBvcnRtYXAgKG9yIHdpdGggZGF0YXN0YXIgYWJzZW50KSwgTEVTIHJ1bnMgaW4gc3RhbmRhbG9uZSBtb2RlOlxuICogYWxsIGN1c3RvbSBlbGVtZW50cyB3b3JrLCBEYXRhc3RhciBzaWduYWwgd2F0Y2hpbmcgYW5kIEBhY3Rpb24gcGFzc3Rocm91Z2hcbiAqIGFyZSB1bmF2YWlsYWJsZS5cbiAqL1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgQ3VzdG9tIGVsZW1lbnRzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gRWFjaCBpbXBvcnQgcmVnaXN0ZXJzIGl0cyBlbGVtZW50KHMpIGFzIGEgc2lkZSBlZmZlY3QuXG5cbmV4cG9ydCB7IExvY2FsRXZlbnRTY3JpcHQgfSBmcm9tICdAZWxlbWVudHMvTG9jYWxFdmVudFNjcmlwdC5qcydcbmV4cG9ydCB7IExvY2FsQ29tbWFuZCB9ICAgICBmcm9tICdAZWxlbWVudHMvTG9jYWxDb21tYW5kLmpzJ1xuZXhwb3J0IHsgT25FdmVudCB9ICAgICAgICAgIGZyb20gJ0BlbGVtZW50cy9PbkV2ZW50LmpzJ1xuZXhwb3J0IHsgT25TaWduYWwgfSAgICAgICAgIGZyb20gJ0BlbGVtZW50cy9PblNpZ25hbC5qcydcbmV4cG9ydCB7IE9uTG9hZCwgT25FbnRlciwgT25FeGl0IH0gZnJvbSAnQGVsZW1lbnRzL0xpZmVjeWNsZS5qcydcbmV4cG9ydCB7IFVzZU1vZHVsZSB9ICAgICAgICBmcm9tICdAZWxlbWVudHMvVXNlTW9kdWxlLmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgVHlwZSBleHBvcnRzIChmb3IgVHlwZVNjcmlwdCBjb25zdW1lcnMpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuZXhwb3J0IHR5cGUgeyBMRVNOb2RlIH0gICAgICAgICAgICAgICAgICAgZnJvbSAnQHBhcnNlci9hc3QuanMnXG5leHBvcnQgdHlwZSB7IExFU01vZHVsZSwgTEVTUHJpbWl0aXZlIH0gICBmcm9tICdAbW9kdWxlcy90eXBlcy5qcydcbmV4cG9ydCB0eXBlIHsgQ29tbWFuZERlZiwgQXJnRGVmIH0gICAgICAgIGZyb20gJ0BydW50aW1lL3JlZ2lzdHJ5LmpzJ1xuZXhwb3J0IHsgTEVTU2NvcGUgfSAgICAgICAgICAgICAgICAgICAgICAgZnJvbSAnQHJ1bnRpbWUvc2NvcGUuanMnXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBEYXRhc3RhciBicmlkZ2UgKG9wdGlvbmFsKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIER5bmFtaWMgaW1wb3J0IHNvIHRoZSBidW5kbGUgd29ya3Mgd2l0aG91dCBEYXRhc3RhciBwcmVzZW50LlxuaW1wb3J0IHsgcmVnaXN0ZXJEYXRhc3RhckJyaWRnZSB9IGZyb20gJ0BkYXRhc3Rhci9wbHVnaW4uanMnXG5yZWdpc3RlckRhdGFzdGFyQnJpZGdlKClcbmV4cG9ydCB0eXBlIHsgTEVTQ29uZmlnLCBDb21tYW5kRGVjbCwgRXZlbnRIYW5kbGVyRGVjbCwgU2lnbmFsV2F0Y2hlckRlY2wsXG4gICAgICAgICAgICAgIE9uTG9hZERlY2wsIE9uRW50ZXJEZWNsLCBPbkV4aXREZWNsLCBNb2R1bGVEZWNsIH0gZnJvbSAnQHBhcnNlci9jb25maWcuanMnXG5leHBvcnQgeyByZWFkQ29uZmlnLCBsb2dDb25maWcgfSBmcm9tICdAcGFyc2VyL3JlYWRlci5qcydcbmV4cG9ydCB7IHN0cmlwQm9keSB9ICAgICAgICAgICAgIGZyb20gJ0BwYXJzZXIvc3RyaXBCb2R5LmpzJ1xuZXhwb3J0IHsgcGFyc2VMRVMsIExFU1BhcnNlciwgTEVTUGFyc2VFcnJvciB9IGZyb20gJ0BwYXJzZXIvaW5kZXguanMnXG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBdUJBLFNBQVMsU0FBUyxVQUFrQixNQUEwQjtBQUM1RCxNQUFJO0FBQ0YsVUFBTSxPQUFPLEtBQUssWUFBWTtBQUM5QixVQUFNLFFBQVEsZ0JBQWdCLFdBQVcsT0FBTyxLQUFLLGlCQUFpQjtBQUN0RSxXQUFPLE1BQU0sS0FBSyxNQUFNLGlCQUFpQixRQUFRLENBQUM7QUFBQSxFQUNwRCxRQUFRO0FBQ04sWUFBUSxLQUFLLHNDQUFzQyxRQUFRLEdBQUc7QUFDOUQsV0FB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
