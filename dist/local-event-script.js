var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/modules/builtin/shake.ts
function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}
function lerp(t, a, b) {
  return a + t * (b - a);
}
function grad2(hash, x, y) {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return (h & 1 ? -u : u) + (h & 2 ? -v : v);
}
function perlin2(x, y) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  const u = fade(x), v = fade(y);
  const a = PERLIN_PERM[X] + Y;
  const aa = PERLIN_PERM[a], ab = PERLIN_PERM[a + 1];
  const b = PERLIN_PERM[X + 1] + Y;
  const ba = PERLIN_PERM[b], bb = PERLIN_PERM[b + 1];
  return lerp(
    v,
    lerp(u, grad2(PERLIN_PERM[aa], x, y), grad2(PERLIN_PERM[ba], x - 1, y)),
    lerp(u, grad2(PERLIN_PERM[ab], x, y - 1), grad2(PERLIN_PERM[bb], x - 1, y - 1))
  );
}
function simplex2grad(hash, x, y) {
  const g = SIMPLEX_GRAD[hash & 7];
  return g[0] * x + g[1] * y;
}
function simplex2(xin, yin) {
  const s = (xin + yin) * F2;
  const i = Math.floor(xin + s);
  const j = Math.floor(yin + s);
  const t = (i + j) * G2;
  const x0 = xin - (i - t);
  const y0 = yin - (j - t);
  let i1, j1;
  if (x0 > y0) {
    i1 = 1;
    j1 = 0;
  } else {
    i1 = 0;
    j1 = 1;
  }
  const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
  const ii = i & 255, jj = j & 255;
  const gi0 = SIMPLEX_PERM[ii + SIMPLEX_PERM[jj]];
  const gi1 = SIMPLEX_PERM[ii + i1 + SIMPLEX_PERM[jj + j1]];
  const gi2 = SIMPLEX_PERM[ii + 1 + SIMPLEX_PERM[jj + 1]];
  const n = (t0, x, y, gi) => {
    const r = 0.5 - x * x - y * y;
    return r < 0 ? 0 : r * r * r * r * simplex2grad(gi, x, y);
  };
  return 70 * (n(0.5 - x0 * x0 - y0 * y0, x0, y0, gi0) + n(0.5 - x1 * x1 - y1 * y1, x1, y1, gi1) + n(0.5 - x2 * x2 - y2 * y2, x2, y2, gi2));
}
function regularShake(t, frequency, channel) {
  const phase = channel * Math.PI * 0.7;
  return 0.7 * Math.sin(2 * Math.PI * frequency * t + phase) + 0.3 * Math.sin(2 * Math.PI * frequency * 2.3 * t + phase * 1.4);
}
function sample(noise, t, channel, frequency, duration) {
  const scale = 4;
  const tx = t * scale + channel * 3.7;
  const ty = channel * 11.3;
  switch (noise) {
    case "simplex":
      return simplex2(tx, ty);
    case "perlin":
      return perlin2(tx, ty);
    case "regular":
      return regularShake(t, frequency, channel);
  }
}
function buildKeyframes(opts, n) {
  const frames = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const envelope = opts.decay ? 1 - t : 1;
    const amp = opts.amplitude * envelope;
    let tx = 0, ty = 0, rz = 0;
    if (opts.axis.includes("x")) {
      tx = sample(opts.noise, t, 0, opts.frequency, n) * amp;
    }
    if (opts.axis.includes("y")) {
      ty = sample(opts.noise, t, 1, opts.frequency, n) * amp;
    }
    if (opts.axis === "z" || opts.axis === "xyz") {
      const degAmp = amp * 0.15;
      rz = sample(opts.noise, t, 2, opts.frequency, n) * degAmp;
    }
    const parts = [];
    if (tx !== 0 || opts.axis.includes("x")) parts.push(`translateX(${tx.toFixed(2)}px)`);
    if (ty !== 0 || opts.axis.includes("y")) parts.push(`translateY(${ty.toFixed(2)}px)`);
    if (rz !== 0 || opts.axis === "z" || opts.axis === "xyz") parts.push(`rotateZ(${rz.toFixed(3)}deg)`);
    frames.push({
      transform: parts.length > 0 ? parts.join(" ") : "none",
      offset: t
    });
  }
  frames[0].transform = buildRestTransform(opts.axis);
  frames[n].transform = buildRestTransform(opts.axis);
  return frames;
}
function buildRestTransform(axis) {
  const parts = [];
  if (axis.includes("x")) parts.push("translateX(0px)");
  if (axis.includes("y")) parts.push("translateY(0px)");
  if (axis === "z" || axis === "xyz") parts.push("rotateZ(0deg)");
  return parts.join(" ") || "none";
}
function parseMs(val, fallback) {
  if (val === void 0 || val === null) return fallback;
  if (typeof val === "number") return val;
  const m = String(val).match(/^(\d+(?:\.\d+)?)(?:px|ms)?$/);
  return m ? parseFloat(m[1]) : fallback;
}
function parsePx(val, fallback) {
  if (val === void 0 || val === null) return fallback;
  if (typeof val === "number") return val;
  const m = String(val).match(/^(\d+(?:\.\d+)?)px$/);
  return m ? parseFloat(m[1]) : fallback;
}
function parseShakeOptions(opts) {
  const axis = ["x", "y", "z", "xy", "xyz"].includes(String(opts["axis"] ?? "x")) ? String(opts["axis"] ?? "x") : "x";
  const noise = ["simplex", "perlin", "regular"].includes(String(opts["noise"] ?? "regular")) ? String(opts["noise"] ?? "regular") : "regular";
  const amplitude = parsePx(opts["amplitude"], 8);
  const decay = String(opts["decay"] ?? "true") !== "false";
  const frequency = parseMs(opts["frequency"], 8);
  return { axis, noise, amplitude, decay, frequency };
}
var PERLIN_PERM, SIMPLEX_PERM, SIMPLEX_GRAD, F2, G2, shake;
var init_shake = __esm({
  "src/modules/builtin/shake.ts"() {
    "use strict";
    PERLIN_PERM = (() => {
      const p = new Uint8Array(512);
      const base = [
        151,
        160,
        137,
        91,
        90,
        15,
        131,
        13,
        201,
        95,
        96,
        53,
        194,
        233,
        7,
        225,
        140,
        36,
        103,
        30,
        69,
        142,
        8,
        99,
        37,
        240,
        21,
        10,
        23,
        190,
        6,
        148,
        247,
        120,
        234,
        75,
        0,
        26,
        197,
        62,
        94,
        252,
        219,
        203,
        117,
        35,
        11,
        32,
        57,
        177,
        33,
        88,
        237,
        149,
        56,
        87,
        174,
        20,
        125,
        136,
        171,
        168,
        68,
        175,
        74,
        165,
        71,
        134,
        139,
        48,
        27,
        166,
        77,
        146,
        158,
        231,
        83,
        111,
        229,
        122,
        60,
        211,
        133,
        230,
        220,
        105,
        92,
        41,
        55,
        46,
        245,
        40,
        244,
        102,
        143,
        54,
        65,
        25,
        63,
        161,
        1,
        216,
        80,
        73,
        209,
        76,
        132,
        187,
        208,
        89,
        18,
        169,
        200,
        196,
        135,
        130,
        116,
        188,
        159,
        86,
        164,
        100,
        109,
        198,
        173,
        186,
        3,
        64,
        52,
        217,
        226,
        250,
        124,
        123,
        5,
        202,
        38,
        147,
        118,
        126,
        255,
        82,
        85,
        212,
        207,
        206,
        59,
        227,
        47,
        16,
        58,
        17,
        182,
        189,
        28,
        42,
        223,
        183,
        170,
        213,
        119,
        248,
        152,
        2,
        44,
        154,
        163,
        70,
        221,
        153,
        101,
        155,
        167,
        43,
        172,
        9,
        129,
        22,
        39,
        253,
        19,
        98,
        108,
        110,
        79,
        113,
        224,
        232,
        178,
        185,
        112,
        104,
        218,
        246,
        97,
        228,
        251,
        34,
        242,
        193,
        238,
        210,
        144,
        12,
        191,
        179,
        162,
        241,
        81,
        51,
        145,
        235,
        249,
        14,
        239,
        107,
        49,
        192,
        214,
        31,
        181,
        199,
        106,
        157,
        184,
        84,
        204,
        176,
        115,
        121,
        50,
        45,
        127,
        4,
        150,
        254,
        138,
        236,
        205,
        93,
        222,
        114,
        67,
        29,
        24,
        72,
        243,
        141,
        128,
        195,
        78,
        66,
        215,
        61,
        156,
        180
      ];
      for (let i = 0; i < 256; i++) p[i] = p[i + 256] = base[i];
      return p;
    })();
    SIMPLEX_PERM = PERLIN_PERM;
    SIMPLEX_GRAD = [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];
    F2 = 0.5 * (Math.sqrt(3) - 1);
    G2 = (3 - Math.sqrt(3)) / 6;
    shake = async (selector, duration, _easing, opts, host) => {
      const root = host.getRootNode();
      const scope = root instanceof Document ? root : root.ownerDocument ?? document;
      const els = Array.from(scope.querySelectorAll(selector));
      if (els.length === 0) return;
      const options = parseShakeOptions(opts);
      const frameCount = Math.min(60, Math.max(12, Math.round(duration / 16)));
      const keyframes = buildKeyframes(options, frameCount);
      await Promise.all(
        els.map(
          (el) => el.animate(keyframes, {
            duration,
            easing: "linear",
            // easing is baked into the noise envelope
            fill: "none",
            // shake returns to rest — no hold needed
            composite: "add"
            // add on top of existing transforms (fill:forwards etc.)
          }).finished.catch((err) => {
            if (err instanceof DOMException && err.name === "AbortError") return;
            throw err;
          })
        )
      );
    };
  }
});

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
function parseMs2(val, fallback) {
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
    init_shake();
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
      const gap = parseMs2(opts["gap"], 40);
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
      const gap = parseMs2(opts["gap"], 20);
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
        "stagger-exit": staggerExit,
        "shake": shake
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
      if (n.command.startsWith("window.") || n.command.startsWith("globalThis.")) {
        const fnPath = n.command.startsWith("window.") ? n.command.slice("window.".length) : n.command.slice("globalThis.".length);
        const parts = fnPath.split(".");
        let target = globalThis;
        for (const part of parts.slice(0, -1)) {
          if (target == null || typeof target !== "object") {
            target = void 0;
            break;
          }
          target = target[part];
        }
        const fnName = parts[parts.length - 1];
        const fn = target == null ? void 0 : target[fnName];
        if (typeof fn !== "function") {
          console.warn(`[LES] window.${fnPath} is not a function (got ${typeof fn})`);
          return;
        }
        const evaledArgValues = Object.values(n.args).map((exprNode) => evalExpr(exprNode, ctx));
        const result = fn.apply(target, evaledArgValues);
        if (result instanceof Promise) await result;
        return;
      }
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
  if (/^\d+(\.\d+)?px$/.test(node.raw)) return node.raw;
  if (/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(node.raw)) {
    const scoped = ctx.scope.get(node.raw);
    if (scoped !== void 0) return scoped;
    const signaled = ctx.getSignal(node.raw);
    if (signaled !== void 0) return signaled;
    return node.raw;
  }
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
  "stagger-exit",
  "shake"
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
    if (looksLikeAnimationCall(text)) {
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
    const trigger = _currentHandlerEvent.get(host) ?? null;
    target.dispatchEvent(new CustomEvent(event, {
      detail: { payload, __broadcastOrigin: host, __broadcastTrigger: trigger },
      bubbles: false,
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
var _currentHandlerEvent = /* @__PURE__ */ new WeakMap();
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
  const doc = host.getRootNode() instanceof Document ? host.getRootNode() : host.ownerDocument ?? document;
  for (const handler of wiring.handlers) {
    const run = (e) => {
      _currentHandlerEvent.set(host, handler.event);
      const ctx = getCtx();
      const handlerScope = ctx.scope.child();
      const detail = e.detail ?? {};
      handlerScope.set("event", e);
      handlerScope.set("payload", detail.payload ?? []);
      execute(handler.body, { ...ctx, scope: handlerScope }).catch((err) => {
        console.error(`[LES] Error in handler for "${handler.event}":`, err);
      });
    };
    const hostListener = (e) => run(e);
    const docListener = (e) => {
      const detail = e.detail ?? {};
      const sameOrigin = detail.__broadcastOrigin === host;
      const sameTrigger = detail.__broadcastTrigger === handler.event;
      if (sameOrigin && sameTrigger) return;
      run(e);
    };
    host.addEventListener(handler.event, hostListener);
    doc.addEventListener(handler.event, docListener);
    cleanups.push(() => {
      host.removeEventListener(handler.event, hostListener);
      doc.removeEventListener(handler.event, docListener);
    });
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL21vZHVsZXMvYnVpbHRpbi9zaGFrZS50cyIsICIuLi9zcmMvbW9kdWxlcy9idWlsdGluL2FuaW1hdGlvbi50cyIsICIuLi9zcmMvcnVudGltZS9leGVjdXRvci50cyIsICIuLi9zcmMvcnVudGltZS9yZWdpc3RyeS50cyIsICIuLi9zcmMvbW9kdWxlcy90eXBlcy50cyIsICIuLi9zcmMvcGFyc2VyL3N0cmlwQm9keS50cyIsICIuLi9zcmMvcGFyc2VyL3JlYWRlci50cyIsICIuLi9zcmMvcGFyc2VyL3Rva2VuaXplci50cyIsICIuLi9zcmMvcGFyc2VyL3BhcnNlci50cyIsICIuLi9zcmMvcGFyc2VyL2luZGV4LnRzIiwgIi4uL3NyYy9ydW50aW1lL3dpcmluZy50cyIsICIuLi9zcmMvcnVudGltZS9zY29wZS50cyIsICIuLi9zcmMvcnVudGltZS9vYnNlcnZlci50cyIsICIuLi9zcmMvcnVudGltZS9zaWduYWxzLnRzIiwgIi4uL3NyYy9lbGVtZW50cy9Mb2NhbEV2ZW50U2NyaXB0LnRzIiwgIi4uL3NyYy9lbGVtZW50cy9Mb2NhbENvbW1hbmQudHMiLCAiLi4vc3JjL2VsZW1lbnRzL09uRXZlbnQudHMiLCAiLi4vc3JjL2VsZW1lbnRzL09uU2lnbmFsLnRzIiwgIi4uL3NyYy9lbGVtZW50cy9MaWZlY3ljbGUudHMiLCAiLi4vc3JjL2VsZW1lbnRzL1VzZU1vZHVsZS50cyIsICIuLi9zcmMvZGF0YXN0YXIvcGx1Z2luLnRzIiwgIi4uL3NyYy9pbmRleC50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBTaGFrZSBhbmltYXRpb24gcHJpbWl0aXZlXG4gKlxuICogR2VuZXJhdGVzIGEgbm9pc2UtZHJpdmVuIGRpc3BsYWNlbWVudCBrZXlmcmFtZSBzZXF1ZW5jZSBhbmQgcGxheXMgaXRcbiAqIHZpYSB0aGUgV2ViIEFuaW1hdGlvbnMgQVBJLiBUaHJlZSBub2lzZSBtb2RlczpcbiAqXG4gKiAgIHJlZ3VsYXIgIFx1MjAxNCBkYW1wZWQgc2ludXNvaWRhbCBvc2NpbGxhdGlvbiB3aXRoIGhhcm1vbmljcyAoZGVmYXVsdClcbiAqICAgcGVybGluICAgXHUyMDE0IEtlbiBQZXJsaW4ncyBpbXByb3ZlZCBncmFkaWVudCBub2lzZSAoc21vb3RoLCBvcmdhbmljKVxuICogICBzaW1wbGV4ICBcdTIwMTQgU2ltcGxleCBub2lzZSAoc21vb3RoZXIgZ3JhZGllbnRzLCBubyBheGlzLWFsaWduZWQgYXJ0ZWZhY3RzKVxuICpcbiAqIEF4aXMgb3B0aW9uczogeCB8IHkgfCB6IHwgeHkgfCB4eXpcbiAqICAgeCAgIFx1MjE5MiB0cmFuc2xhdGVYXG4gKiAgIHkgICBcdTIxOTIgdHJhbnNsYXRlWVxuICogICB6ICAgXHUyMTkyIHJvdGF0ZVogKHNjcmVlbi1zaGFrZSAvIGNhbWVyYS1zaGFrZSBmZWVsKVxuICogICB4eSAgXHUyMTkyIHRyYW5zbGF0ZVggKyB0cmFuc2xhdGVZIChpbmRlcGVuZGVudCBub2lzZSBjaGFubmVscylcbiAqICAgeHl6IFx1MjE5MiB0cmFuc2xhdGVYICsgdHJhbnNsYXRlWSArIHJvdGF0ZVpcbiAqXG4gKiBPcHRpb25zIChhbGwgb3B0aW9uYWwpOlxuICogICBheGlzOiAgICAgIHggfCB5IHwgeiB8IHh5IHwgeHl6ICAgKGRlZmF1bHQ6IHgpXG4gKiAgIG5vaXNlOiAgICAgcmVndWxhciB8IHBlcmxpbiB8IHNpbXBsZXggIChkZWZhdWx0OiByZWd1bGFyKVxuICogICBhbXBsaXR1ZGU6IE5weCAgICAgICAgICAgICAgICAgICAgKGRlZmF1bHQ6IDhweClcbiAqICAgZGVjYXk6ICAgICB0cnVlIHwgZmFsc2UgICAgICAgICAgIChkZWZhdWx0OiB0cnVlIFx1MjAxNCBhbXBsaXR1ZGUgZmFkZXMgb3V0KVxuICogICBmcmVxdWVuY3k6IE4gICAgICAgICAgICAgICAgICAgICAgKGRlZmF1bHQ6IDggXHUyMDE0IG9zY2lsbGF0aW9ucy9zZWMgZm9yIHJlZ3VsYXIpXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBMRVNQcmltaXRpdmUgfSBmcm9tICcuLi90eXBlcy5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQZXJsaW4gbm9pc2UgXHUyMDE0IEtlbiBQZXJsaW4ncyBpbXByb3ZlZCAyMDAyIHZlcnNpb25cbi8vIFdlIHVzZSAyRCBldmFsdWF0aW9uOiBub2lzZSh0LCBjaGFubmVsKSB3aGVyZSBjaGFubmVsIGlzIGEgZml4ZWQgb2Zmc2V0XG4vLyB0aGF0IGdpdmVzIGluZGVwZW5kZW50IGN1cnZlcyBmb3IgeCB2cyB5IHZzIHouXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgUEVSTElOX1BFUk06IFVpbnQ4QXJyYXkgPSAoKCkgPT4ge1xuICAvLyBGaXhlZCBwZXJtdXRhdGlvbiB0YWJsZSAoZGV0ZXJtaW5pc3RpYywgbm8gcmFuZG9tbmVzcyBuZWVkZWQgZm9yIGFuaW1hdGlvbilcbiAgY29uc3QgcCA9IG5ldyBVaW50OEFycmF5KDUxMilcbiAgY29uc3QgYmFzZSA9IFtcbiAgICAxNTEsMTYwLDEzNywgOTEsIDkwLCAxNSwxMzEsIDEzLDIwMSwgOTUsIDk2LCA1MywxOTQsMjMzLCAgNywyMjUsXG4gICAgMTQwLCAzNiwxMDMsIDMwLCA2OSwxNDIsICA4LCA5OSwgMzcsMjQwLCAyMSwgMTAsIDIzLDE5MCwgIDYsMTQ4LFxuICAgIDI0NywxMjAsMjM0LCA3NSwgIDAsIDI2LDE5NywgNjIsIDk0LDI1MiwyMTksMjAzLDExNywgMzUsIDExLCAzMixcbiAgICAgNTcsMTc3LCAzMywgODgsMjM3LDE0OSwgNTYsIDg3LDE3NCwgMjAsMTI1LDEzNiwxNzEsMTY4LCA2OCwxNzUsXG4gICAgIDc0LDE2NSwgNzEsMTM0LDEzOSwgNDgsIDI3LDE2NiwgNzcsMTQ2LDE1OCwyMzEsIDgzLDExMSwyMjksMTIyLFxuICAgICA2MCwyMTEsMTMzLDIzMCwyMjAsMTA1LCA5MiwgNDEsIDU1LCA0NiwyNDUsIDQwLDI0NCwxMDIsMTQzLCA1NCxcbiAgICAgNjUsIDI1LCA2MywxNjEsICAxLDIxNiwgODAsIDczLDIwOSwgNzYsMTMyLDE4NywyMDgsIDg5LCAxOCwxNjksXG4gICAgMjAwLDE5NiwxMzUsMTMwLDExNiwxODgsMTU5LCA4NiwxNjQsMTAwLDEwOSwxOTgsMTczLDE4NiwgIDMsIDY0LFxuICAgICA1MiwyMTcsMjI2LDI1MCwxMjQsMTIzLCAgNSwyMDIsIDM4LDE0NywxMTgsMTI2LDI1NSwgODIsIDg1LDIxMixcbiAgICAyMDcsMjA2LCA1OSwyMjcsIDQ3LCAxNiwgNTgsIDE3LDE4MiwxODksIDI4LCA0MiwyMjMsMTgzLDE3MCwyMTMsXG4gICAgMTE5LDI0OCwxNTIsICAyLCA0NCwxNTQsMTYzLCA3MCwyMjEsMTUzLDEwMSwxNTUsMTY3LCA0MywxNzIsICA5LFxuICAgIDEyOSwgMjIsIDM5LDI1MywgMTksIDk4LDEwOCwxMTAsIDc5LDExMywyMjQsMjMyLDE3OCwxODUsMTEyLDEwNCxcbiAgICAyMTgsMjQ2LCA5NywyMjgsMjUxLCAzNCwyNDIsMTkzLDIzOCwyMTAsMTQ0LCAxMiwxOTEsMTc5LDE2MiwyNDEsXG4gICAgIDgxLCA1MSwxNDUsMjM1LDI0OSwgMTQsMjM5LDEwNywgNDksMTkyLDIxNCwgMzEsMTgxLDE5OSwxMDYsMTU3LFxuICAgIDE4NCwgODQsMjA0LDE3NiwxMTUsMTIxLCA1MCwgNDUsMTI3LCAgNCwxNTAsMjU0LDEzOCwyMzYsMjA1LCA5MyxcbiAgICAyMjIsMTE0LCA2NywgMjksIDI0LCA3MiwyNDMsMTQxLDEyOCwxOTUsIDc4LCA2NiwyMTUsIDYxLDE1NiwxODAsXG4gIF1cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCAyNTY7IGkrKykgcFtpXSA9IHBbaSArIDI1Nl0gPSBiYXNlW2ldIVxuICByZXR1cm4gcFxufSkoKVxuXG5mdW5jdGlvbiBmYWRlKHQ6IG51bWJlcik6IG51bWJlciB7IHJldHVybiB0ICogdCAqIHQgKiAodCAqICh0ICogNiAtIDE1KSArIDEwKSB9XG5mdW5jdGlvbiBsZXJwKHQ6IG51bWJlciwgYTogbnVtYmVyLCBiOiBudW1iZXIpOiBudW1iZXIgeyByZXR1cm4gYSArIHQgKiAoYiAtIGEpIH1cbmZ1bmN0aW9uIGdyYWQyKGhhc2g6IG51bWJlciwgeDogbnVtYmVyLCB5OiBudW1iZXIpOiBudW1iZXIge1xuICBjb25zdCBoID0gaGFzaCAmIDNcbiAgY29uc3QgdSA9IGggPCAyID8geCA6IHlcbiAgY29uc3QgdiA9IGggPCAyID8geSA6IHhcbiAgcmV0dXJuICgoaCAmIDEpID8gLXUgOiB1KSArICgoaCAmIDIpID8gLXYgOiB2KVxufVxuXG4vKiogUGVybGluIG5vaXNlLCByZXR1cm5zIHZhbHVlIGluIFstMSwgMV0gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJsaW4yKHg6IG51bWJlciwgeTogbnVtYmVyKTogbnVtYmVyIHtcbiAgY29uc3QgWCA9IE1hdGguZmxvb3IoeCkgJiAyNTVcbiAgY29uc3QgWSA9IE1hdGguZmxvb3IoeSkgJiAyNTVcbiAgeCAtPSBNYXRoLmZsb29yKHgpXG4gIHkgLT0gTWF0aC5mbG9vcih5KVxuICBjb25zdCB1ID0gZmFkZSh4KSwgdiA9IGZhZGUoeSlcbiAgY29uc3QgYSAgPSBQRVJMSU5fUEVSTVtYXSEgICsgWVxuICBjb25zdCBhYSA9IFBFUkxJTl9QRVJNW2FdISwgIGFiID0gUEVSTElOX1BFUk1bYSArIDFdIVxuICBjb25zdCBiICA9IFBFUkxJTl9QRVJNW1ggKyAxXSEgKyBZXG4gIGNvbnN0IGJhID0gUEVSTElOX1BFUk1bYl0hLCAgYmIgPSBQRVJMSU5fUEVSTVtiICsgMV0hXG4gIHJldHVybiBsZXJwKHYsXG4gICAgbGVycCh1LCBncmFkMihQRVJMSU5fUEVSTVthYV0hLCB4LCB5KSwgICAgIGdyYWQyKFBFUkxJTl9QRVJNW2JhXSEsIHggLSAxLCB5KSksXG4gICAgbGVycCh1LCBncmFkMihQRVJMSU5fUEVSTVthYl0hLCB4LCB5IC0gMSksIGdyYWQyKFBFUkxJTl9QRVJNW2JiXSEsIHggLSAxLCB5IC0gMSkpXG4gIClcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBTaW1wbGV4IG5vaXNlIFx1MjAxNCAyRCBzaW1wbGV4IChzbW9vdGhlciBncmFkaWVudHMsIG5vIGdyaWQtYWxpZ25lZCBhcnRlZmFjdHMpXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgU0lNUExFWF9QRVJNID0gUEVSTElOX1BFUk0gLy8gcmV1c2Ugc2FtZSBwZXJtdXRhdGlvbiB0YWJsZVxuXG5jb25zdCBTSU1QTEVYX0dSQUQ6IFtudW1iZXIsIG51bWJlcl1bXSA9IFtcbiAgWzEsMV0sWy0xLDFdLFsxLC0xXSxbLTEsLTFdLFsxLDBdLFstMSwwXSxbMCwxXSxbMCwtMV0sXG5dXG5jb25zdCBGMiA9IDAuNSAqIChNYXRoLnNxcnQoMykgLSAxKVxuY29uc3QgRzIgPSAoMyAtIE1hdGguc3FydCgzKSkgLyA2XG5cbmZ1bmN0aW9uIHNpbXBsZXgyZ3JhZChoYXNoOiBudW1iZXIsIHg6IG51bWJlciwgeTogbnVtYmVyKTogbnVtYmVyIHtcbiAgY29uc3QgZyA9IFNJTVBMRVhfR1JBRFtoYXNoICYgN10hXG4gIHJldHVybiBnWzBdICogeCArIGdbMV0gKiB5XG59XG5cbi8qKiBTaW1wbGV4IG5vaXNlLCByZXR1cm5zIHZhbHVlIGluIFstMSwgMV0gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaW1wbGV4Mih4aW46IG51bWJlciwgeWluOiBudW1iZXIpOiBudW1iZXIge1xuICBjb25zdCBzICA9ICh4aW4gKyB5aW4pICogRjJcbiAgY29uc3QgaSAgPSBNYXRoLmZsb29yKHhpbiArIHMpXG4gIGNvbnN0IGogID0gTWF0aC5mbG9vcih5aW4gKyBzKVxuICBjb25zdCB0ICA9IChpICsgaikgKiBHMlxuICBjb25zdCB4MCA9IHhpbiAtIChpIC0gdClcbiAgY29uc3QgeTAgPSB5aW4gLSAoaiAtIHQpXG5cbiAgbGV0IGkxOiBudW1iZXIsIGoxOiBudW1iZXJcbiAgaWYgKHgwID4geTApIHsgaTEgPSAxOyBqMSA9IDAgfSBlbHNlIHsgaTEgPSAwOyBqMSA9IDEgfVxuXG4gIGNvbnN0IHgxID0geDAgLSBpMSArIEcyLCAgIHkxID0geTAgLSBqMSArIEcyXG4gIGNvbnN0IHgyID0geDAgLSAxICsgMipHMiwgIHkyID0geTAgLSAxICsgMipHMlxuXG4gIGNvbnN0IGlpID0gaSAmIDI1NSwgamogPSBqICYgMjU1XG4gIGNvbnN0IGdpMCA9IFNJTVBMRVhfUEVSTVtpaSAgICAgICsgU0lNUExFWF9QRVJNW2pqXSFdIVxuICBjb25zdCBnaTEgPSBTSU1QTEVYX1BFUk1baWkgKyBpMSArIFNJTVBMRVhfUEVSTVtqaiArIGoxXSFdIVxuICBjb25zdCBnaTIgPSBTSU1QTEVYX1BFUk1baWkgKyAxICArIFNJTVBMRVhfUEVSTVtqaiArIDFdIV0hXG5cbiAgY29uc3QgbiA9ICh0MDogbnVtYmVyLCB4OiBudW1iZXIsIHk6IG51bWJlciwgZ2k6IG51bWJlcikgPT4ge1xuICAgIGNvbnN0IHIgPSAwLjUgLSB4KnggLSB5KnlcbiAgICByZXR1cm4gciA8IDAgPyAwIDogcipyKnIqciAqIHNpbXBsZXgyZ3JhZChnaSwgeCwgeSlcbiAgfVxuXG4gIHJldHVybiA3MCAqIChuKDAuNSAtIHgwKngwIC0geTAqeTAsIHgwLCB5MCwgZ2kwKSArXG4gICAgICAgICAgICAgICBuKDAuNSAtIHgxKngxIC0geTEqeTEsIHgxLCB5MSwgZ2kxKSArXG4gICAgICAgICAgICAgICBuKDAuNSAtIHgyKngyIC0geTIqeTIsIHgyLCB5MiwgZ2kyKSlcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBSZWd1bGFyIHNoYWtlIFx1MjAxNCBkYW1wZWQgc2ludXNvaWRhbCBvc2NpbGxhdGlvbiB3aXRoIGhhcm1vbmljc1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIHJlZ3VsYXJTaGFrZSh0OiBudW1iZXIsIGZyZXF1ZW5jeTogbnVtYmVyLCBjaGFubmVsOiBudW1iZXIpOiBudW1iZXIge1xuICAvLyBUd28gaGFybW9uaWNzIGF0IHNsaWdodGx5IGRpZmZlcmVudCBmcmVxdWVuY2llcyBmb3IgbmF0dXJhbCBmZWVsXG4gIC8vIGNoYW5uZWwgb2Zmc2V0IHByZXZlbnRzIHgveSBmcm9tIGJlaW5nIGlkZW50aWNhbFxuICBjb25zdCBwaGFzZSA9IGNoYW5uZWwgKiBNYXRoLlBJICogMC43XG4gIHJldHVybiAoXG4gICAgMC43ICogTWF0aC5zaW4oMiAqIE1hdGguUEkgKiBmcmVxdWVuY3kgKiB0ICsgcGhhc2UpICtcbiAgICAwLjMgKiBNYXRoLnNpbigyICogTWF0aC5QSSAqIGZyZXF1ZW5jeSAqIDIuMyAqIHQgKyBwaGFzZSAqIDEuNClcbiAgKVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEtleWZyYW1lIGdlbmVyYXRvclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbnR5cGUgTm9pc2VUeXBlID0gJ3NpbXBsZXgnIHwgJ3BlcmxpbicgfCAncmVndWxhcidcbnR5cGUgU2hha2VBeGlzID0gJ3gnIHwgJ3knIHwgJ3onIHwgJ3h5JyB8ICd4eXonXG5cbmludGVyZmFjZSBTaGFrZU9wdGlvbnMge1xuICBheGlzOiAgICAgIFNoYWtlQXhpc1xuICBub2lzZTogICAgIE5vaXNlVHlwZVxuICBhbXBsaXR1ZGU6IG51bWJlciAgICAgLy8gcHggKG9yIGRlZ3JlZXMgZm9yIHopXG4gIGRlY2F5OiAgICAgYm9vbGVhblxuICBmcmVxdWVuY3k6IG51bWJlciAgICAgLy8gb3NjaWxsYXRpb25zL3NlYyAocmVndWxhciBtb2RlIG9ubHkpXG59XG5cbi8qKlxuICogU2FtcGxlIHRoZSBjaG9zZW4gbm9pc2UgZnVuY3Rpb24gZm9yIG9uZSBheGlzIGNoYW5uZWwuXG4gKiBgdGAgICAgICAgXHUyMDE0IG5vcm1hbGlzZWQgdGltZSBbMCwgMV1cbiAqIGBjaGFubmVsYCBcdTIwMTQgaW50ZWdlciBvZmZzZXQgdG8gcHJvZHVjZSBhbiBpbmRlcGVuZGVudCBjdXJ2ZSBwZXIgYXhpc1xuICovXG5mdW5jdGlvbiBzYW1wbGUoXG4gIG5vaXNlOiBOb2lzZVR5cGUsXG4gIHQ6IG51bWJlcixcbiAgY2hhbm5lbDogbnVtYmVyLFxuICBmcmVxdWVuY3k6IG51bWJlcixcbiAgZHVyYXRpb246IG51bWJlclxuKTogbnVtYmVyIHtcbiAgLy8gU2NhbGUgdCB0byBhIHJhbmdlIHRoYXQgZ2l2ZXMgZ29vZCBub2lzZSB2YXJpYXRpb25cbiAgY29uc3Qgc2NhbGUgPSA0LjAgIC8vIGhvdyBtYW55IG5vaXNlIFwiY3ljbGVzXCIgb3ZlciB0aGUgZnVsbCBkdXJhdGlvblxuICBjb25zdCB0eCA9IHQgKiBzY2FsZSArIGNoYW5uZWwgKiAzLjcgICAvLyBjaGFubmVsIG9mZnNldCBmb3IgaW5kZXBlbmRlbmNlXG4gIGNvbnN0IHR5ID0gY2hhbm5lbCAqIDExLjMgICAgICAgICAgICAgIC8vIGZpeGVkIHkgb2Zmc2V0IHBlciBjaGFubmVsXG5cbiAgc3dpdGNoIChub2lzZSkge1xuICAgIGNhc2UgJ3NpbXBsZXgnOiByZXR1cm4gc2ltcGxleDIodHgsIHR5KVxuICAgIGNhc2UgJ3Blcmxpbic6ICByZXR1cm4gcGVybGluMih0eCwgdHkpXG4gICAgY2FzZSAncmVndWxhcic6IHJldHVybiByZWd1bGFyU2hha2UodCwgZnJlcXVlbmN5LCBjaGFubmVsKVxuICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkS2V5ZnJhbWVzKFxuICBvcHRzOiBTaGFrZU9wdGlvbnMsXG4gIG46IG51bWJlciAgIC8vIG51bWJlciBvZiBrZXlmcmFtZXNcbik6IEtleWZyYW1lW10ge1xuICBjb25zdCBmcmFtZXM6IEtleWZyYW1lW10gPSBbXVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDw9IG47IGkrKykge1xuICAgIGNvbnN0IHQgICAgICAgID0gaSAvIG4gICAgICAgICAgICAgICAgICAgLy8gWzAsIDFdXG4gICAgY29uc3QgZW52ZWxvcGUgPSBvcHRzLmRlY2F5ID8gKDEgLSB0KSA6IDEuMFxuICAgIGNvbnN0IGFtcCAgICAgID0gb3B0cy5hbXBsaXR1ZGUgKiBlbnZlbG9wZVxuXG4gICAgbGV0IHR4ID0gMCwgdHkgPSAwLCByeiA9IDBcblxuICAgIGlmIChvcHRzLmF4aXMuaW5jbHVkZXMoJ3gnKSkge1xuICAgICAgdHggPSBzYW1wbGUob3B0cy5ub2lzZSwgdCwgMCwgb3B0cy5mcmVxdWVuY3ksIG4pICogYW1wXG4gICAgfVxuICAgIGlmIChvcHRzLmF4aXMuaW5jbHVkZXMoJ3knKSkge1xuICAgICAgdHkgPSBzYW1wbGUob3B0cy5ub2lzZSwgdCwgMSwgb3B0cy5mcmVxdWVuY3ksIG4pICogYW1wXG4gICAgfVxuICAgIGlmIChvcHRzLmF4aXMgPT09ICd6JyB8fCBvcHRzLmF4aXMgPT09ICd4eXonKSB7XG4gICAgICAvLyB6IHJvdGF0aW9uOiBhbXBsaXR1ZGUgaXMgaW4gZGVncmVlcywgc2NhbGUgZG93biB2cyBweCBkaXNwbGFjZW1lbnRcbiAgICAgIGNvbnN0IGRlZ0FtcCA9IGFtcCAqIDAuMTVcbiAgICAgIHJ6ID0gc2FtcGxlKG9wdHMubm9pc2UsIHQsIDIsIG9wdHMuZnJlcXVlbmN5LCBuKSAqIGRlZ0FtcFxuICAgIH1cblxuICAgIGNvbnN0IHBhcnRzOiBzdHJpbmdbXSA9IFtdXG4gICAgaWYgKHR4ICE9PSAwIHx8IG9wdHMuYXhpcy5pbmNsdWRlcygneCcpKSBwYXJ0cy5wdXNoKGB0cmFuc2xhdGVYKCR7dHgudG9GaXhlZCgyKX1weClgKVxuICAgIGlmICh0eSAhPT0gMCB8fCBvcHRzLmF4aXMuaW5jbHVkZXMoJ3knKSkgcGFydHMucHVzaChgdHJhbnNsYXRlWSgke3R5LnRvRml4ZWQoMil9cHgpYClcbiAgICBpZiAocnogIT09IDAgfHwgb3B0cy5heGlzID09PSAneicgfHwgb3B0cy5heGlzID09PSAneHl6JykgcGFydHMucHVzaChgcm90YXRlWigke3J6LnRvRml4ZWQoMyl9ZGVnKWApXG5cbiAgICBmcmFtZXMucHVzaCh7XG4gICAgICB0cmFuc2Zvcm06IHBhcnRzLmxlbmd0aCA+IDAgPyBwYXJ0cy5qb2luKCcgJykgOiAnbm9uZScsXG4gICAgICBvZmZzZXQ6IHQsXG4gICAgfSlcbiAgfVxuXG4gIC8vIEVuc3VyZSBmaXJzdCBhbmQgbGFzdCBmcmFtZXMgcmV0dXJuIHRvIHJlc3RcbiAgZnJhbWVzWzBdIS50cmFuc2Zvcm0gPSBidWlsZFJlc3RUcmFuc2Zvcm0ob3B0cy5heGlzKVxuICBmcmFtZXNbbl0hLnRyYW5zZm9ybSA9IGJ1aWxkUmVzdFRyYW5zZm9ybShvcHRzLmF4aXMpXG5cbiAgcmV0dXJuIGZyYW1lc1xufVxuXG5mdW5jdGlvbiBidWlsZFJlc3RUcmFuc2Zvcm0oYXhpczogU2hha2VBeGlzKTogc3RyaW5nIHtcbiAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW11cbiAgaWYgKGF4aXMuaW5jbHVkZXMoJ3gnKSkgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goJ3RyYW5zbGF0ZVgoMHB4KScpXG4gIGlmIChheGlzLmluY2x1ZGVzKCd5JykpICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKCd0cmFuc2xhdGVZKDBweCknKVxuICBpZiAoYXhpcyA9PT0gJ3onIHx8IGF4aXMgPT09ICd4eXonKSAgICAgICAgICAgcGFydHMucHVzaCgncm90YXRlWigwZGVnKScpXG4gIHJldHVybiBwYXJ0cy5qb2luKCcgJykgfHwgJ25vbmUnXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gUGFyc2Ugb3B0aW9ucyBmcm9tIExFUyBvcHRpb24gb2JqZWN0XG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gcGFyc2VNcyh2YWw6IHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgZmFsbGJhY2s6IG51bWJlcik6IG51bWJlciB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCB8fCB2YWwgPT09IG51bGwpIHJldHVybiBmYWxsYmFja1xuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHJldHVybiB2YWxcbiAgY29uc3QgbSA9IFN0cmluZyh2YWwpLm1hdGNoKC9eKFxcZCsoPzpcXC5cXGQrKT8pKD86cHh8bXMpPyQvKVxuICByZXR1cm4gbSA/IHBhcnNlRmxvYXQobVsxXSEpIDogZmFsbGJhY2tcbn1cblxuZnVuY3Rpb24gcGFyc2VQeCh2YWw6IHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgZmFsbGJhY2s6IG51bWJlcik6IG51bWJlciB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCB8fCB2YWwgPT09IG51bGwpIHJldHVybiBmYWxsYmFja1xuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHJldHVybiB2YWxcbiAgY29uc3QgbSA9IFN0cmluZyh2YWwpLm1hdGNoKC9eKFxcZCsoPzpcXC5cXGQrKT8pcHgkLylcbiAgcmV0dXJuIG0gPyBwYXJzZUZsb2F0KG1bMV0hKSA6IGZhbGxiYWNrXG59XG5cbmZ1bmN0aW9uIHBhcnNlU2hha2VPcHRpb25zKG9wdHM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogU2hha2VPcHRpb25zIHtcbiAgY29uc3QgYXhpcyAgICAgID0gKFsneCcsJ3knLCd6JywneHknLCd4eXonXS5pbmNsdWRlcyhTdHJpbmcob3B0c1snYXhpcyddID8/ICd4JykpXG4gICAgICAgICAgICAgICAgICAgID8gU3RyaW5nKG9wdHNbJ2F4aXMnXSA/PyAneCcpXG4gICAgICAgICAgICAgICAgICAgIDogJ3gnKSBhcyBTaGFrZUF4aXNcbiAgY29uc3Qgbm9pc2UgICAgID0gKFsnc2ltcGxleCcsJ3BlcmxpbicsJ3JlZ3VsYXInXS5pbmNsdWRlcyhTdHJpbmcob3B0c1snbm9pc2UnXSA/PyAncmVndWxhcicpKVxuICAgICAgICAgICAgICAgICAgICA/IFN0cmluZyhvcHRzWydub2lzZSddID8/ICdyZWd1bGFyJylcbiAgICAgICAgICAgICAgICAgICAgOiAncmVndWxhcicpIGFzIE5vaXNlVHlwZVxuICBjb25zdCBhbXBsaXR1ZGUgPSBwYXJzZVB4KG9wdHNbJ2FtcGxpdHVkZSddIGFzIHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgOClcbiAgY29uc3QgZGVjYXkgICAgID0gU3RyaW5nKG9wdHNbJ2RlY2F5J10gPz8gJ3RydWUnKSAhPT0gJ2ZhbHNlJ1xuICBjb25zdCBmcmVxdWVuY3kgPSBwYXJzZU1zKG9wdHNbJ2ZyZXF1ZW5jeSddIGFzIHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgOClcblxuICByZXR1cm4geyBheGlzLCBub2lzZSwgYW1wbGl0dWRlLCBkZWNheSwgZnJlcXVlbmN5IH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBUaGUgcHJpbWl0aXZlXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBzaGFrZSBcdTIwMTQgbm9pc2UtZHJpdmVuIGRpc3BsYWNlbWVudCBhbmltYXRpb24uXG4gKlxuICogVXNhZ2UgaW4gTEVTOlxuICogICBzaGFrZSAjZmllbGQgIDQwMG1zIGVhc2Utb3V0IFtheGlzOiB4ICBub2lzZTogcmVndWxhciAgYW1wbGl0dWRlOiA4cHggIGRlY2F5OiB0cnVlXVxuICogICBzaGFrZSAuY2FyZCAgIDYwMG1zIGxpbmVhciAgIFtheGlzOiB4eSAgbm9pc2U6IHNpbXBsZXggIGFtcGxpdHVkZTogMTJweF1cbiAqICAgc2hha2UgYm9keSAgICA4MDBtcyBsaW5lYXIgICBbYXhpczogeHl6ICBub2lzZTogcGVybGluICBhbXBsaXR1ZGU6IDZweCAgZGVjYXk6IHRydWVdXG4gKi9cbmV4cG9ydCBjb25zdCBzaGFrZTogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgX2Vhc2luZywgb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCByb290ICA9IGhvc3QuZ2V0Um9vdE5vZGUoKSBhcyBEb2N1bWVudCB8IFNoYWRvd1Jvb3RcbiAgY29uc3Qgc2NvcGUgPSByb290IGluc3RhbmNlb2YgRG9jdW1lbnQgPyByb290IDogcm9vdC5vd25lckRvY3VtZW50ID8/IGRvY3VtZW50XG4gIGNvbnN0IGVscyAgID0gQXJyYXkuZnJvbShzY29wZS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSkgYXMgSFRNTEVsZW1lbnRbXVxuICBpZiAoZWxzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgY29uc3Qgb3B0aW9ucyA9IHBhcnNlU2hha2VPcHRpb25zKG9wdHMpXG5cbiAgLy8gfjYwZnBzIGtleWZyYW1lIGRlbnNpdHksIG1pbmltdW0gMTIsIG1heGltdW0gNjBcbiAgY29uc3QgZnJhbWVDb3VudCA9IE1hdGgubWluKDYwLCBNYXRoLm1heCgxMiwgTWF0aC5yb3VuZChkdXJhdGlvbiAvIDE2KSkpXG4gIGNvbnN0IGtleWZyYW1lcyAgPSBidWlsZEtleWZyYW1lcyhvcHRpb25zLCBmcmFtZUNvdW50KVxuXG4gIGF3YWl0IFByb21pc2UuYWxsKFxuICAgIGVscy5tYXAoZWwgPT5cbiAgICAgIGVsLmFuaW1hdGUoa2V5ZnJhbWVzLCB7XG4gICAgICAgIGR1cmF0aW9uLFxuICAgICAgICBlYXNpbmc6ICAgICdsaW5lYXInLCAgIC8vIGVhc2luZyBpcyBiYWtlZCBpbnRvIHRoZSBub2lzZSBlbnZlbG9wZVxuICAgICAgICBmaWxsOiAgICAgICdub25lJywgICAgIC8vIHNoYWtlIHJldHVybnMgdG8gcmVzdCBcdTIwMTQgbm8gaG9sZCBuZWVkZWRcbiAgICAgICAgY29tcG9zaXRlOiAnYWRkJywgICAgICAvLyBhZGQgb24gdG9wIG9mIGV4aXN0aW5nIHRyYW5zZm9ybXMgKGZpbGw6Zm9yd2FyZHMgZXRjLilcbiAgICAgIH0pLmZpbmlzaGVkLmNhdGNoKChlcnI6IHVua25vd24pID0+IHtcbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnIubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSByZXR1cm5cbiAgICAgICAgdGhyb3cgZXJyXG4gICAgICB9KVxuICAgIClcbiAgKVxufVxuIiwgIi8qKlxuICogUGhhc2UgNzogQnVpbHQtaW4gYW5pbWF0aW9uIG1vZHVsZVxuICpcbiAqIEFsbCBwcmltaXRpdmVzIHVzZSB0aGUgV2ViIEFuaW1hdGlvbnMgQVBJIChlbGVtZW50LmFuaW1hdGUoKS5maW5pc2hlZClcbiAqIHNvIHRoZXkgaW50ZWdyYXRlIHdpdGggTEVTJ3MgYXN5bmMtdHJhbnNwYXJlbnQgYHRoZW5gIHNlcXVlbmNpbmc6XG4gKlxuICogICBmYWRlLWluICNzcGxhc2ggMjAwbXMgZWFzZS1vdXQgYW5kXG4gKiAgIHNsaWRlLXVwICNzcGxhc2ggMTgwbXMgZWFzZS1vdXRcbiAqICAgdGhlbiBmaXJlIHNwbGFzaDpyZWFkeSAgICAgICAgICBcdTIxOTAgb25seSBmaXJlcyBhZnRlciBCT1RIIGFuaW1hdGlvbnMgY29tcGxldGVcbiAqXG4gKiBgYW5kYCBcdTIxOTIgUHJvbWlzZS5hbGwgKGNvbmN1cnJlbnQpXG4gKiBgdGhlbmAgXHUyMTkyIHNlcXVlbnRpYWwgYXdhaXQgb24gLmZpbmlzaGVkXG4gKlxuICogVGhlIGV4ZWN1dG9yIGF3YWl0cyBlYWNoIExFU1ByaW1pdGl2ZSByZXR1cm4gdmFsdWUsIHNvIGFuaW1hdGlvblxuICogY29tcGxldGlvbiBpcyBuYXR1cmFsbHkgc2VyaWFsaXplZCB3aXRob3V0IGFueSBzZXRUaW1lb3V0IGhhY2tzLlxuICovXG5cbmltcG9ydCB0eXBlIHsgTEVTTW9kdWxlLCBMRVNQcmltaXRpdmUgfSBmcm9tICcuLi90eXBlcy5qcydcbmltcG9ydCB7IHNoYWtlIH0gZnJvbSAnLi9zaGFrZS5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBVdGlsaXR5OiBxdWVyeSBhbGwgbWF0Y2hpbmcgZWxlbWVudHMgd2l0aGluIHRoZSBob3N0IHNjb3BlXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gcXVlcnlBbGwoc2VsZWN0b3I6IHN0cmluZywgaG9zdDogRWxlbWVudCk6IEVsZW1lbnRbXSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgcm9vdCA9IGhvc3QuZ2V0Um9vdE5vZGUoKSBhcyBEb2N1bWVudCB8IFNoYWRvd1Jvb3RcbiAgICBjb25zdCBzY29wZSA9IHJvb3QgaW5zdGFuY2VvZiBEb2N1bWVudCA/IHJvb3QgOiByb290Lm93bmVyRG9jdW1lbnQgPz8gZG9jdW1lbnRcbiAgICByZXR1cm4gQXJyYXkuZnJvbShzY29wZS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSlcbiAgfSBjYXRjaCB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTOmFuaW1hdGlvbl0gSW52YWxpZCBzZWxlY3RvcjogXCIke3NlbGVjdG9yfVwiYClcbiAgICByZXR1cm4gW11cbiAgfVxufVxuXG4vKipcbiAqIENhbmNlbCBhbGwgcnVubmluZyBXZWIgQW5pbWF0aW9ucyBvbiBhbiBlbGVtZW50IGJlZm9yZSBzdGFydGluZyBhIG5ldyBvbmUuXG4gKiBUaGlzIHByZXZlbnRzIHRoZSBvbmUtZnJhbWUgZmxhc2ggdGhhdCBvY2N1cnMgd2hlbiBhIGZpbGw6Zm9yd2FyZHMgYW5pbWF0aW9uXG4gKiBpcyBpbnRlcnJ1cHRlZCBcdTIwMTQgd2l0aG91dCBjYW5jZWxsYXRpb24sIHRoZSBlbGVtZW50IGJyaWVmbHkgcmV2ZXJ0cyB0byBpdHNcbiAqIHVuLWFuaW1hdGVkIHN0YXRlIGFzIHRoZSBvbGQgQW5pbWF0aW9uIGlzIHJlcGxhY2VkLlxuICovXG5mdW5jdGlvbiBjYW5jZWxBbmltYXRpb25zKGVsOiBFbGVtZW50KTogdm9pZCB7XG4gIGZvciAoY29uc3QgYW5pbSBvZiAoZWwgYXMgSFRNTEVsZW1lbnQpLmdldEFuaW1hdGlvbnMoKSkge1xuICAgIGFuaW0uY2FuY2VsKClcbiAgfVxufVxuXG4vKiogQXdhaXRzIGFsbCBBbmltYXRpb24uZmluaXNoZWQgcHJvbWlzZXMuIFJldHVybnMgaW1tZWRpYXRlbHkgaWYgbm8gZWxlbWVudHMgbWF0Y2hlZC4gKi9cbmFzeW5jIGZ1bmN0aW9uIGFuaW1hdGVBbGwoXG4gIGVsczogRWxlbWVudFtdLFxuICBrZXlmcmFtZXM6IEtleWZyYW1lW10sXG4gIG9wdGlvbnM6IEtleWZyYW1lQW5pbWF0aW9uT3B0aW9uc1xuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChlbHMubGVuZ3RoID09PSAwKSByZXR1cm5cbiAgLy8gTm90ZTogY2FuY2VsQW5pbWF0aW9ucyBpcyBpbnRlbnRpb25hbGx5IE5PVCBjYWxsZWQgaGVyZS5cbiAgLy8gSXQgaXMgb25seSBjYWxsZWQgaW4gc3RhZ2dlci1lbnRlci9zdGFnZ2VyLWV4aXQgd2hlcmUgd2UgZXhwbGljaXRseVxuICAvLyByZXN0YXJ0IGFuIGluLXByb2dyZXNzIHN0YWdnZXIuIENhbGxpbmcgY2FuY2VsIG9uIGV2ZXJ5IHByaW1pdGl2ZVxuICAvLyB3b3VsZCBkZXN0cm95IGZpbGw6Zm9yd2FyZHMgaG9sZHMgZnJvbSBwcmV2aW91cyBhbmltYXRpb25zXG4gIC8vIChlLmcuIHN0YWdnZXItZW50ZXIncyBob2xkIHdvdWxkIGJlIGNhbmNlbGxlZCBieSBhIHN1YnNlcXVlbnQgcHVsc2UpLlxuICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBlbHMubWFwKGVsID0+IChlbCBhcyBIVE1MRWxlbWVudCkuYW5pbWF0ZShrZXlmcmFtZXMsIG9wdGlvbnMpLmZpbmlzaGVkXG4gICAgICAuY2F0Y2goKGVycjogdW5rbm93bikgPT4ge1xuICAgICAgICAvLyBBYm9ydEVycm9yIGlzIGV4cGVjdGVkIHdoZW4gY2FuY2VsQW5pbWF0aW9ucygpIGludGVycnVwdHMgYSBydW5uaW5nXG4gICAgICAgIC8vIGFuaW1hdGlvbi4gU3dhbGxvdyBpdCBcdTIwMTQgdGhlIG5ldyBhbmltYXRpb24gaGFzIGFscmVhZHkgc3RhcnRlZC5cbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnIubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSByZXR1cm5cbiAgICAgICAgdGhyb3cgZXJyXG4gICAgICB9KVxuICAgIClcbiAgKVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIERpcmVjdGlvbiBoZWxwZXJzXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxudHlwZSBEaXJlY3Rpb24gPSAnbGVmdCcgfCAncmlnaHQnIHwgJ3VwJyB8ICdkb3duJ1xuXG5mdW5jdGlvbiBzbGlkZUtleWZyYW1lcyhkaXI6IERpcmVjdGlvbiwgZW50ZXJpbmc6IGJvb2xlYW4pOiBLZXlmcmFtZVtdIHtcbiAgY29uc3QgZGlzdGFuY2UgPSAnODBweCdcbiAgY29uc3QgdHJhbnNsYXRpb25zOiBSZWNvcmQ8RGlyZWN0aW9uLCBzdHJpbmc+ID0ge1xuICAgIGxlZnQ6ICBgdHJhbnNsYXRlWCgtJHtkaXN0YW5jZX0pYCxcbiAgICByaWdodDogYHRyYW5zbGF0ZVgoJHtkaXN0YW5jZX0pYCxcbiAgICB1cDogICAgYHRyYW5zbGF0ZVkoLSR7ZGlzdGFuY2V9KWAsXG4gICAgZG93bjogIGB0cmFuc2xhdGVZKCR7ZGlzdGFuY2V9KWAsXG4gIH1cbiAgY29uc3QgdHJhbnNsYXRlID0gdHJhbnNsYXRpb25zW2Rpcl1cbiAgaWYgKGVudGVyaW5nKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHsgb3BhY2l0eTogMCwgdHJhbnNmb3JtOiB0cmFuc2xhdGUgfSxcbiAgICAgIHsgb3BhY2l0eTogMSwgdHJhbnNmb3JtOiAnbm9uZScgfSxcbiAgICBdXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHsgb3BhY2l0eTogMSwgdHJhbnNmb3JtOiAnbm9uZScgfSxcbiAgICAgIHsgb3BhY2l0eTogMCwgdHJhbnNmb3JtOiB0cmFuc2xhdGUgfSxcbiAgICBdXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBDb3JlIHByaW1pdGl2ZXNcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5jb25zdCBmYWRlSW46IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgX29wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLFxuICAgIFt7IG9wYWNpdHk6IDAgfSwgeyBvcGFjaXR5OiAxIH1dLFxuICAgIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9XG4gIClcbn1cblxuY29uc3QgZmFkZU91dDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBfb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgYXdhaXQgYW5pbWF0ZUFsbChlbHMsXG4gICAgW3sgb3BhY2l0eTogMSB9LCB7IG9wYWNpdHk6IDAgfV0sXG4gICAgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnIH1cbiAgKVxufVxuXG5jb25zdCBzbGlkZUluOiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIG9wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZnJvbSA9IChvcHRzWydmcm9tJ10gYXMgRGlyZWN0aW9uIHwgdW5kZWZpbmVkKSA/PyAncmlnaHQnXG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBhd2FpdCBhbmltYXRlQWxsKGVscywgc2xpZGVLZXlmcmFtZXMoZnJvbSwgdHJ1ZSksIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9KVxufVxuXG5jb25zdCBzbGlkZU91dDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBvcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IHRvID0gKG9wdHNbJ3RvJ10gYXMgRGlyZWN0aW9uIHwgdW5kZWZpbmVkKSA/PyAnbGVmdCdcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLCBzbGlkZUtleWZyYW1lcyh0bywgZmFsc2UpLCB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdmb3J3YXJkcycgfSlcbn1cblxuY29uc3Qgc2xpZGVVcDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBfb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgYXdhaXQgYW5pbWF0ZUFsbChlbHMsIHNsaWRlS2V5ZnJhbWVzKCd1cCcsIHRydWUpLCB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdmb3J3YXJkcycgfSlcbn1cblxuY29uc3Qgc2xpZGVEb3duOiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIF9vcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBhd2FpdCBhbmltYXRlQWxsKGVscywgc2xpZGVLZXlmcmFtZXMoJ2Rvd24nLCBmYWxzZSksIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9KVxufVxuXG4vKipcbiAqIHB1bHNlIFx1MjAxNCBicmllZiBzY2FsZSArIG9wYWNpdHkgcHVsc2UgdG8gZHJhdyBhdHRlbnRpb24gdG8gdXBkYXRlZCBpdGVtcy5cbiAqIFVzZWQgZm9yIEQzIFwidXBkYXRlXCIgcGhhc2U6IGl0ZW1zIHdob3NlIGNvbnRlbnQgY2hhbmdlZCBnZXQgYSB2aXN1YWwgcGluZy5cbiAqL1xuY29uc3QgcHVsc2U6IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgX29wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLCBbXG4gICAgeyBvcGFjaXR5OiAxLCAgICB0cmFuc2Zvcm06ICdzY2FsZSgxKScgfSxcbiAgICB7IG9wYWNpdHk6IDAuNzUsIHRyYW5zZm9ybTogJ3NjYWxlKDEuMDMpJywgb2Zmc2V0OiAwLjQgfSxcbiAgICB7IG9wYWNpdHk6IDEsICAgIHRyYW5zZm9ybTogJ3NjYWxlKDEpJyB9LFxuICBdLCB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdub25lJyB9KVxufVxuXG4vKipcbiAqIHN0YWdnZXItZW50ZXIgXHUyMDE0IHJ1bnMgc2xpZGVJbiBvbiBlYWNoIG1hdGNoZWQgZWxlbWVudCBpbiBzZXF1ZW5jZSxcbiAqIG9mZnNldCBieSBgZ2FwYCBtaWxsaXNlY29uZHMgYmV0d2VlbiBlYWNoLlxuICpcbiAqIE9wdGlvbnM6XG4gKiAgIGdhcDogTm1zICAgXHUyMDE0IGRlbGF5IGJldHdlZW4gZWFjaCBlbGVtZW50IChkZWZhdWx0OiA0MG1zKVxuICogICBmcm9tOiBkaXIgIFx1MjAxNCAnbGVmdCcgfCAncmlnaHQnIHwgJ3VwJyB8ICdkb3duJyAoZGVmYXVsdDogJ3JpZ2h0JylcbiAqXG4gKiBBbGwgYW5pbWF0aW9ucyBhcmUgc3RhcnRlZCB0b2dldGhlciAoUHJvbWlzZS5hbGwpIGJ1dCBlYWNoIGhhcyBhblxuICogaW5jcmVhc2luZyBgZGVsYXlgIFx1MjAxNCB0aGlzIGdpdmVzIHRoZSBzdGFnZ2VyIGVmZmVjdCB3aGlsZSBrZWVwaW5nXG4gKiB0aGUgdG90YWwgUHJvbWlzZS1zZXR0bGVkIHRpbWUgPSBkdXJhdGlvbiArIChuLTEpICogZ2FwLlxuICovXG5jb25zdCBzdGFnZ2VyRW50ZXI6IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgaWYgKGVscy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIGNvbnN0IGdhcCAgPSBwYXJzZU1zKG9wdHNbJ2dhcCddIGFzIHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgNDApXG4gIGNvbnN0IGZyb20gPSAob3B0c1snZnJvbSddIGFzIERpcmVjdGlvbiB8IHVuZGVmaW5lZCkgPz8gJ3JpZ2h0J1xuXG4gIGVscy5mb3JFYWNoKGNhbmNlbEFuaW1hdGlvbnMpXG4gIGF3YWl0IFByb21pc2UuYWxsKFxuICAgIGVscy5tYXAoKGVsLCBpKSA9PlxuICAgICAgKGVsIGFzIEhUTUxFbGVtZW50KS5hbmltYXRlKFxuICAgICAgICBzbGlkZUtleWZyYW1lcyhmcm9tLCB0cnVlKSxcbiAgICAgICAgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnLCBkZWxheTogaSAqIGdhcCB9XG4gICAgICApLmZpbmlzaGVkLmNhdGNoKChlcnI6IHVua25vd24pID0+IHtcbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnIubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSByZXR1cm5cbiAgICAgICAgdGhyb3cgZXJyXG4gICAgICB9KVxuICAgIClcbiAgKVxufVxuXG4vKipcbiAqIHN0YWdnZXItZXhpdCBcdTIwMTQgcnVucyBzbGlkZU91dCBvbiBlYWNoIG1hdGNoZWQgZWxlbWVudCBpbiBzZXF1ZW5jZS5cbiAqXG4gKiBPcHRpb25zOlxuICogICBnYXA6IE5tcyAgICAgICAgICBcdTIwMTQgZGVsYXkgYmV0d2VlbiBlYWNoIGVsZW1lbnQgKGRlZmF1bHQ6IDIwbXMpXG4gKiAgIGRpcmVjdGlvbjogcmV2ZXJzZSBcdTIwMTQgcHJvY2VzcyBlbGVtZW50cyBpbiByZXZlcnNlIG9yZGVyXG4gKiAgIHRvOiBkaXIgICAgICAgICAgIFx1MjAxNCBleGl0IGRpcmVjdGlvbiAoZGVmYXVsdDogJ2xlZnQnKVxuICovXG5jb25zdCBzdGFnZ2VyRXhpdDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBvcHRzLCBob3N0KSA9PiB7XG4gIC8vIEZpbHRlciB0byBvbmx5IGVsZW1lbnRzIHRoYXQgYXJlIGFjdHVhbGx5IHZpc2libGUgXHUyMDE0IHNraXAgaGlkZGVuL2FscmVhZHktZXhpdGVkIG9uZXNcbiAgbGV0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KS5maWx0ZXIoZWwgPT4ge1xuICAgIGNvbnN0IHN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWwgYXMgSFRNTEVsZW1lbnQpXG4gICAgcmV0dXJuIHN0eWxlLmRpc3BsYXkgIT09ICdub25lJyAmJiBzdHlsZS52aXNpYmlsaXR5ICE9PSAnaGlkZGVuJ1xuICB9KVxuICBpZiAoZWxzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgY29uc3QgZ2FwICAgICA9IHBhcnNlTXMob3B0c1snZ2FwJ10gYXMgc3RyaW5nIHwgbnVtYmVyIHwgdW5kZWZpbmVkLCAyMClcbiAgY29uc3QgcmV2ZXJzZSA9IFN0cmluZyhvcHRzWydkaXJlY3Rpb24nXSA/PyAnJykgPT09ICdyZXZlcnNlJ1xuICBjb25zdCB0byAgICAgID0gKG9wdHNbJ3RvJ10gYXMgRGlyZWN0aW9uIHwgdW5kZWZpbmVkKSA/PyAnbGVmdCdcblxuICBpZiAocmV2ZXJzZSkgZWxzID0gWy4uLmVsc10ucmV2ZXJzZSgpXG5cbiAgZWxzLmZvckVhY2goY2FuY2VsQW5pbWF0aW9ucylcbiAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgZWxzLm1hcCgoZWwsIGkpID0+XG4gICAgICAoZWwgYXMgSFRNTEVsZW1lbnQpLmFuaW1hdGUoXG4gICAgICAgIHNsaWRlS2V5ZnJhbWVzKHRvLCBmYWxzZSksXG4gICAgICAgIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJywgZGVsYXk6IGkgKiBnYXAgfVxuICAgICAgKS5maW5pc2hlZC5jYXRjaCgoZXJyOiB1bmtub3duKSA9PiB7XG4gICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBET01FeGNlcHRpb24gJiYgZXJyLm5hbWUgPT09ICdBYm9ydEVycm9yJykgcmV0dXJuXG4gICAgICAgIHRocm93IGVyclxuICAgICAgfSlcbiAgICApXG4gIClcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBVdGlsaXR5OiBwYXJzZSBhIG1pbGxpc2Vjb25kIHZhbHVlIGZyb20gYSBzdHJpbmcgbGlrZSBcIjQwbXNcIiBvciBhIG51bWJlclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIHBhcnNlTXModmFsOiBzdHJpbmcgfCBudW1iZXIgfCB1bmRlZmluZWQsIGZhbGxiYWNrOiBudW1iZXIpOiBudW1iZXIge1xuICBpZiAodmFsID09PSB1bmRlZmluZWQgfHwgdmFsID09PSBudWxsKSByZXR1cm4gZmFsbGJhY2tcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSByZXR1cm4gdmFsXG4gIGNvbnN0IG0gPSBTdHJpbmcodmFsKS5tYXRjaCgvXihcXGQrKD86XFwuXFxkKyk/KW1zJC8pXG4gIGlmIChtKSByZXR1cm4gcGFyc2VGbG9hdChtWzFdISlcbiAgY29uc3QgbiA9IHBhcnNlRmxvYXQoU3RyaW5nKHZhbCkpXG4gIHJldHVybiBOdW1iZXIuaXNOYU4obikgPyBmYWxsYmFjayA6IG5cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBNb2R1bGUgZXhwb3J0XG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgYW5pbWF0aW9uTW9kdWxlOiBMRVNNb2R1bGUgPSB7XG4gIG5hbWU6ICdhbmltYXRpb24nLFxuICBwcmltaXRpdmVzOiB7XG4gICAgJ2ZhZGUtaW4nOiAgICAgICBmYWRlSW4sXG4gICAgJ2ZhZGUtb3V0JzogICAgICBmYWRlT3V0LFxuICAgICdzbGlkZS1pbic6ICAgICAgc2xpZGVJbixcbiAgICAnc2xpZGUtb3V0JzogICAgIHNsaWRlT3V0LFxuICAgICdzbGlkZS11cCc6ICAgICAgc2xpZGVVcCxcbiAgICAnc2xpZGUtZG93bic6ICAgIHNsaWRlRG93bixcbiAgICAncHVsc2UnOiAgICAgICAgIHB1bHNlLFxuICAgICdzdGFnZ2VyLWVudGVyJzogc3RhZ2dlckVudGVyLFxuICAgICdzdGFnZ2VyLWV4aXQnOiAgc3RhZ2dlckV4aXQsXG4gICAgJ3NoYWtlJzogICAgICAgICBzaGFrZSxcbiAgfSxcbn1cblxuZXhwb3J0IGRlZmF1bHQgYW5pbWF0aW9uTW9kdWxlXG4iLCAiaW1wb3J0IHR5cGUge1xuICBMRVNOb2RlLCBFeHByTm9kZSwgU2VxdWVuY2VOb2RlLCBQYXJhbGxlbE5vZGUsXG4gIFNldE5vZGUsIEVtaXROb2RlLCBCcm9hZGNhc3ROb2RlLCBXYWl0Tm9kZSxcbiAgQ2FsbE5vZGUsIEJpbmROb2RlLCBNYXRjaE5vZGUsIFRyeU5vZGUsIEFuaW1hdGlvbk5vZGUsXG59IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuaW1wb3J0IHR5cGUgeyBQYXR0ZXJuTm9kZSB9IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuaW1wb3J0IHsgTEVTU2NvcGUgfSBmcm9tICcuL3Njb3BlLmpzJ1xuaW1wb3J0IHR5cGUgeyBDb21tYW5kUmVnaXN0cnkgfSBmcm9tICcuL3JlZ2lzdHJ5LmpzJ1xuaW1wb3J0IHR5cGUgeyBNb2R1bGVSZWdpc3RyeSB9IGZyb20gJ0Btb2R1bGVzL3R5cGVzLmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEV4ZWN1dGlvbiBjb250ZXh0IFx1MjAxNCBldmVyeXRoaW5nIHRoZSBleGVjdXRvciBuZWVkcywgcGFzc2VkIGRvd24gdGhlIGNhbGwgdHJlZVxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBpbnRlcmZhY2UgTEVTQ29udGV4dCB7XG4gIC8qKiBMb2NhbCB2YXJpYWJsZSBzY29wZSBmb3IgdGhlIGN1cnJlbnQgY2FsbCBmcmFtZSAqL1xuICBzY29wZTogTEVTU2NvcGVcbiAgLyoqIFRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBob3N0IGVsZW1lbnQgXHUyMDE0IHVzZWQgYXMgcXVlcnlTZWxlY3RvciByb290ICovXG4gIGhvc3Q6IEVsZW1lbnRcbiAgLyoqIENvbW1hbmQgZGVmaW5pdGlvbnMgcmVnaXN0ZXJlZCBieSA8bG9jYWwtY29tbWFuZD4gY2hpbGRyZW4gKi9cbiAgY29tbWFuZHM6IENvbW1hbmRSZWdpc3RyeVxuICAvKiogQW5pbWF0aW9uIGFuZCBvdGhlciBwcmltaXRpdmUgbW9kdWxlcyAqL1xuICBtb2R1bGVzOiBNb2R1bGVSZWdpc3RyeVxuICAvKiogUmVhZCBhIERhdGFzdGFyIHNpZ25hbCB2YWx1ZSBieSBuYW1lICh3aXRob3V0ICQgcHJlZml4KSAqL1xuICBnZXRTaWduYWw6IChuYW1lOiBzdHJpbmcpID0+IHVua25vd25cbiAgLyoqIFdyaXRlIGEgRGF0YXN0YXIgc2lnbmFsIHZhbHVlIGJ5IG5hbWUgKHdpdGhvdXQgJCBwcmVmaXgpICovXG4gIHNldFNpZ25hbDogKG5hbWU6IHN0cmluZywgdmFsdWU6IHVua25vd24pID0+IHZvaWRcbiAgLyoqIERpc3BhdGNoIGEgbG9jYWwgQ3VzdG9tRXZlbnQgb24gdGhlIGhvc3QgKGJ1YmJsZXM6IGZhbHNlKSAqL1xuICBlbWl0TG9jYWw6IChldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHZvaWRcbiAgLyoqIERpc3BhdGNoIGEgRE9NLXdpZGUgQ3VzdG9tRXZlbnQgKGJ1YmJsZXM6IHRydWUsIGNvbXBvc2VkOiB0cnVlKSAqL1xuICBicm9hZGNhc3Q6IChldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHZvaWRcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBNYWluIGV4ZWN1dG9yXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBFeGVjdXRlcyBhIExFU05vZGUgQVNUIGluIHRoZSBnaXZlbiBjb250ZXh0LlxuICpcbiAqIEFzeW5jIHRyYW5zcGFyZW5jeTogZXZlcnkgc3RlcCBpcyBhd2FpdGVkIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciBpdFxuICogaXMgc3luY2hyb25vdXMgb3IgcmV0dXJucyBhIFByb21pc2UuIFRoZSBhdXRob3IgbmV2ZXIgd3JpdGVzIGBhd2FpdGAuXG4gKiBUaGUgYHRoZW5gIGNvbm5lY3RpdmUgaW4gTEVTIHNvdXJjZSBtYXBzIHRvIHNlcXVlbnRpYWwgYGF3YWl0YCBoZXJlLlxuICogVGhlIGBhbmRgIGNvbm5lY3RpdmUgbWFwcyB0byBgUHJvbWlzZS5hbGxgLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZShub2RlOiBMRVNOb2RlLCBjdHg6IExFU0NvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgc3dpdGNoIChub2RlLnR5cGUpIHtcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBTZXF1ZW5jZTogQSB0aGVuIEIgdGhlbiBDIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3NlcXVlbmNlJzpcbiAgICAgIGZvciAoY29uc3Qgc3RlcCBvZiAobm9kZSBhcyBTZXF1ZW5jZU5vZGUpLnN0ZXBzKSB7XG4gICAgICAgIGF3YWl0IGV4ZWN1dGUoc3RlcCwgY3R4KVxuICAgICAgfVxuICAgICAgcmV0dXJuXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgUGFyYWxsZWw6IEEgYW5kIEIgYW5kIEMgKFByb21pc2UuYWxsKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdwYXJhbGxlbCc6XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbCgobm9kZSBhcyBQYXJhbGxlbE5vZGUpLmJyYW5jaGVzLm1hcChiID0+IGV4ZWN1dGUoYiwgY3R4KSkpXG4gICAgICByZXR1cm5cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBzZXQgJHNpZ25hbCB0byBleHByIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3NldCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIFNldE5vZGVcbiAgICAgIGNvbnN0IHZhbHVlID0gZXZhbEV4cHIobi52YWx1ZSwgY3R4KVxuICAgICAgY3R4LnNldFNpZ25hbChuLnNpZ25hbCwgdmFsdWUpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgZW1pdCBldmVudDpuYW1lIFtwYXlsb2FkXSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdlbWl0Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgRW1pdE5vZGVcbiAgICAgIGNvbnN0IHBheWxvYWQgPSBuLnBheWxvYWQubWFwKHAgPT4gZXZhbEV4cHIocCwgY3R4KSlcbiAgICAgIGN0eC5lbWl0TG9jYWwobi5ldmVudCwgcGF5bG9hZClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBicm9hZGNhc3QgZXZlbnQ6bmFtZSBbcGF5bG9hZF0gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnYnJvYWRjYXN0Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQnJvYWRjYXN0Tm9kZVxuICAgICAgY29uc3QgcGF5bG9hZCA9IG4ucGF5bG9hZC5tYXAocCA9PiBldmFsRXhwcihwLCBjdHgpKVxuICAgICAgY3R4LmJyb2FkY2FzdChuLmV2ZW50LCBwYXlsb2FkKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIHdhaXQgTm1zIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3dhaXQnOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBXYWl0Tm9kZVxuICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG4ubXMpKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIGNhbGwgY29tbWFuZDpuYW1lIFthcmdzXSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdjYWxsJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQ2FsbE5vZGVcblxuICAgICAgLy8gXHUyNTAwXHUyNTAwIHdpbmRvdy5mbiAvIGdsb2JhbFRoaXMuZm4gaW52b2NhdGlvbiBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICAgIC8vIElmIHRoZSBjb21tYW5kIG5hbWUgc3RhcnRzIHdpdGggXCJ3aW5kb3cuXCIgb3IgXCJnbG9iYWxUaGlzLlwiLCByZXNvbHZlXG4gICAgICAvLyBpdCBhcyBhIEpTIGZ1bmN0aW9uIGNhbGwgcmF0aGVyIHRoYW4gYSByZWdpc3RlcmVkIDxsb2NhbC1jb21tYW5kPi5cbiAgICAgIC8vIFRoaXMgYWxsb3dzIExFUyBvbi1ldmVudCBoYW5kbGVycyBhbmQgY29tbWFuZCBkby1ibG9ja3MgdG8gYXdhaXRcbiAgICAgIC8vIGFyYml0cmFyeSBKUyBmdW5jdGlvbnMsIGluY2x1ZGluZyBvbmVzIHRoYXQgcmV0dXJuIFByb21pc2VzLlxuICAgICAgLy9cbiAgICAgIC8vIFVzYWdlIGluIExFUyBzb3VyY2U6XG4gICAgICAvLyAgIGNhbGwgd2luZG93LnNoYWtlQW5kUGFuXG4gICAgICAvLyAgIGNhbGwgd2luZG93LmVudGVyTGF5ZXJzU3RhZ2dlclxuICAgICAgLy9cbiAgICAgIC8vIEFyZ3MgKGlmIGFueSkgYXJlIGV2YWx1YXRlZCBhbmQgc3ByZWFkIGFzIHBvc2l0aW9uYWwgcGFyYW1ldGVyczpcbiAgICAgIC8vICAgY2FsbCB3aW5kb3cudXBkYXRlVGltZURpc3BsYXkgWyRjdXJyZW50SG91cl1cbiAgICAgIC8vICAgXHUyMTkyIHdpbmRvdy51cGRhdGVUaW1lRGlzcGxheShjdXJyZW50SG91clZhbHVlKVxuICAgICAgaWYgKG4uY29tbWFuZC5zdGFydHNXaXRoKCd3aW5kb3cuJykgfHwgbi5jb21tYW5kLnN0YXJ0c1dpdGgoJ2dsb2JhbFRoaXMuJykpIHtcbiAgICAgICAgY29uc3QgZm5QYXRoID0gbi5jb21tYW5kLnN0YXJ0c1dpdGgoJ3dpbmRvdy4nKVxuICAgICAgICAgID8gbi5jb21tYW5kLnNsaWNlKCd3aW5kb3cuJy5sZW5ndGgpXG4gICAgICAgICAgOiBuLmNvbW1hbmQuc2xpY2UoJ2dsb2JhbFRoaXMuJy5sZW5ndGgpXG5cbiAgICAgICAgLy8gU3VwcG9ydCBkb3QtcGF0aHM6IHdpbmRvdy5tYXBDb250cm9sbGVyLmVudGVyTGF5ZXJcbiAgICAgICAgY29uc3QgcGFydHMgID0gZm5QYXRoLnNwbGl0KCcuJylcbiAgICAgICAgbGV0ICAgdGFyZ2V0OiB1bmtub3duID0gZ2xvYmFsVGhpc1xuICAgICAgICBmb3IgKGNvbnN0IHBhcnQgb2YgcGFydHMuc2xpY2UoMCwgLTEpKSB7XG4gICAgICAgICAgaWYgKHRhcmdldCA9PSBudWxsIHx8IHR5cGVvZiB0YXJnZXQgIT09ICdvYmplY3QnKSB7IHRhcmdldCA9IHVuZGVmaW5lZDsgYnJlYWsgfVxuICAgICAgICAgIHRhcmdldCA9ICh0YXJnZXQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW3BhcnRdXG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZm5OYW1lID0gcGFydHNbcGFydHMubGVuZ3RoIC0gMV0hXG4gICAgICAgIGNvbnN0IGZuID0gdGFyZ2V0ID09IG51bGwgPyB1bmRlZmluZWRcbiAgICAgICAgICA6ICh0YXJnZXQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW2ZuTmFtZV1cblxuICAgICAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKGBbTEVTXSB3aW5kb3cuJHtmblBhdGh9IGlzIG5vdCBhIGZ1bmN0aW9uIChnb3QgJHt0eXBlb2YgZm59KWApXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICAvLyBFdmFsdWF0ZSBhcmdzIFx1MjAxNCBwYXNzIGFzIHBvc2l0aW9uYWwgcGFyYW1zIGluIGRlY2xhcmF0aW9uIG9yZGVyXG4gICAgICAgIGNvbnN0IGV2YWxlZEFyZ1ZhbHVlcyA9IE9iamVjdC52YWx1ZXMobi5hcmdzKVxuICAgICAgICAgIC5tYXAoZXhwck5vZGUgPT4gZXZhbEV4cHIoZXhwck5vZGUsIGN0eCkpXG5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gKGZuIGFzICguLi5hOiB1bmtub3duW10pID0+IHVua25vd24pXG4gICAgICAgICAgLmFwcGx5KHRhcmdldCBhcyBvYmplY3QsIGV2YWxlZEFyZ1ZhbHVlcylcbiAgICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpIGF3YWl0IHJlc3VsdFxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgY29uc3QgZGVmID0gY3R4LmNvbW1hbmRzLmdldChuLmNvbW1hbmQpXG4gICAgICBpZiAoIWRlZikge1xuICAgICAgICBjb25zb2xlLndhcm4oYFtMRVNdIFVua25vd24gY29tbWFuZDogXCIke24uY29tbWFuZH1cImApXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICAvLyBFdmFsdWF0ZSBndWFyZCBcdTIwMTQgZmFsc3kgPSBzaWxlbnQgbm8tb3AgKG5vdCBhbiBlcnJvciwgbm8gcmVzY3VlKVxuICAgICAgaWYgKGRlZi5ndWFyZCkge1xuICAgICAgICBjb25zdCBwYXNzZXMgPSBldmFsR3VhcmQoZGVmLmd1YXJkLCBjdHgpXG4gICAgICAgIGlmICghcGFzc2VzKSB7XG4gICAgICAgICAgY29uc29sZS5kZWJ1ZyhgW0xFU10gY29tbWFuZCBcIiR7bi5jb21tYW5kfVwiIGd1YXJkIHJlamVjdGVkYClcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBCdWlsZCBjaGlsZCBzY29wZTogYmluZCBhcmdzIGludG8gaXRcbiAgICAgIGNvbnN0IGNoaWxkU2NvcGUgPSBjdHguc2NvcGUuY2hpbGQoKVxuICAgICAgY29uc3QgZXZhbGVkQXJnczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fVxuICAgICAgZm9yIChjb25zdCBba2V5LCBleHByTm9kZV0gb2YgT2JqZWN0LmVudHJpZXMobi5hcmdzKSkge1xuICAgICAgICBldmFsZWRBcmdzW2tleV0gPSBldmFsRXhwcihleHByTm9kZSwgY3R4KVxuICAgICAgfVxuXG4gICAgICAvLyBBcHBseSBhcmcgZGVmYXVsdHMgZnJvbSBkZWYgKFBoYXNlIDIgQXJnRGVmIHBhcnNpbmcgXHUyMDE0IHNpbXBsaWZpZWQgaGVyZSlcbiAgICAgIGZvciAoY29uc3QgYXJnRGVmIG9mIGRlZi5hcmdzKSB7XG4gICAgICAgIGlmICghKGFyZ0RlZi5uYW1lIGluIGV2YWxlZEFyZ3MpICYmIGFyZ0RlZi5kZWZhdWx0KSB7XG4gICAgICAgICAgZXZhbGVkQXJnc1thcmdEZWYubmFtZV0gPSBldmFsRXhwcihhcmdEZWYuZGVmYXVsdCwgY3R4KVxuICAgICAgICB9XG4gICAgICAgIGNoaWxkU2NvcGUuc2V0KGFyZ0RlZi5uYW1lLCBldmFsZWRBcmdzW2FyZ0RlZi5uYW1lXSA/PyBudWxsKVxuICAgICAgfVxuXG4gICAgICBjb25zdCBjaGlsZEN0eDogTEVTQ29udGV4dCA9IHsgLi4uY3R4LCBzY29wZTogY2hpbGRTY29wZSB9XG4gICAgICBhd2FpdCBleGVjdXRlKGRlZi5ib2R5LCBjaGlsZEN0eClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBuYW1lIDwtIEB2ZXJiICd1cmwnIFthcmdzXSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdiaW5kJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQmluZE5vZGVcbiAgICAgIGNvbnN0IHsgdmVyYiwgdXJsLCBhcmdzIH0gPSBuLmFjdGlvblxuICAgICAgY29uc3QgZXZhbGVkQXJnczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fVxuICAgICAgZm9yIChjb25zdCBba2V5LCBleHByTm9kZV0gb2YgT2JqZWN0LmVudHJpZXMoYXJncykpIHtcbiAgICAgICAgZXZhbGVkQXJnc1trZXldID0gZXZhbEV4cHIoZXhwck5vZGUsIGN0eClcbiAgICAgIH1cblxuICAgICAgbGV0IHJlc3VsdDogdW5rbm93blxuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgcGVyZm9ybUFjdGlvbih2ZXJiLCB1cmwsIGV2YWxlZEFyZ3MsIGN0eClcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBQcm9wYWdhdGUgc28gZW5jbG9zaW5nIHRyeS9yZXNjdWUgY2FuIGNhdGNoIGl0XG4gICAgICAgIHRocm93IGVyclxuICAgICAgfVxuXG4gICAgICBjdHguc2NvcGUuc2V0KG4ubmFtZSwgcmVzdWx0KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIG1hdGNoIHN1YmplY3QgLyBhcm1zIC8gL21hdGNoIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ21hdGNoJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgTWF0Y2hOb2RlXG4gICAgICBjb25zdCBzdWJqZWN0ID0gZXZhbEV4cHIobi5zdWJqZWN0LCBjdHgpXG5cbiAgICAgIGZvciAoY29uc3QgYXJtIG9mIG4uYXJtcykge1xuICAgICAgICBjb25zdCBiaW5kaW5ncyA9IG1hdGNoUGF0dGVybnMoYXJtLnBhdHRlcm5zLCBzdWJqZWN0KVxuICAgICAgICBpZiAoYmluZGluZ3MgIT09IG51bGwpIHtcbiAgICAgICAgICAvLyBDcmVhdGUgY2hpbGQgc2NvcGUgd2l0aCBwYXR0ZXJuIGJpbmRpbmdzXG4gICAgICAgICAgY29uc3QgYXJtU2NvcGUgPSBjdHguc2NvcGUuY2hpbGQoKVxuICAgICAgICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKGJpbmRpbmdzKSkge1xuICAgICAgICAgICAgYXJtU2NvcGUuc2V0KGssIHYpXG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGFybUN0eDogTEVTQ29udGV4dCA9IHsgLi4uY3R4LCBzY29wZTogYXJtU2NvcGUgfVxuICAgICAgICAgIGF3YWl0IGV4ZWN1dGUoYXJtLmJvZHksIGFybUN0eClcbiAgICAgICAgICByZXR1cm4gICAvLyBGaXJzdCBtYXRjaGluZyBhcm0gd2lucyBcdTIwMTQgbm8gZmFsbHRocm91Z2hcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIG1hdGNoOiBubyBhcm0gbWF0Y2hlZCBzdWJqZWN0OicsIHN1YmplY3QpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgdHJ5IC8gcmVzY3VlIC8gYWZ0ZXJ3YXJkcyAvIC90cnkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAndHJ5Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgVHJ5Tm9kZVxuICAgICAgbGV0IHRocmV3ID0gZmFsc2VcblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZXhlY3V0ZShuLmJvZHksIGN0eClcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICB0aHJldyA9IHRydWVcbiAgICAgICAgaWYgKG4ucmVzY3VlKSB7XG4gICAgICAgICAgLy8gQmluZCB0aGUgZXJyb3IgYXMgYCRlcnJvcmAgaW4gdGhlIHJlc2N1ZSBzY29wZVxuICAgICAgICAgIGNvbnN0IHJlc2N1ZVNjb3BlID0gY3R4LnNjb3BlLmNoaWxkKClcbiAgICAgICAgICByZXNjdWVTY29wZS5zZXQoJ2Vycm9yJywgZXJyKVxuICAgICAgICAgIGNvbnN0IHJlc2N1ZUN0eDogTEVTQ29udGV4dCA9IHsgLi4uY3R4LCBzY29wZTogcmVzY3VlU2NvcGUgfVxuICAgICAgICAgIGF3YWl0IGV4ZWN1dGUobi5yZXNjdWUsIHJlc2N1ZUN0eClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBObyByZXNjdWUgY2xhdXNlIFx1MjAxNCByZS10aHJvdyBzbyBvdXRlciB0cnkgY2FuIGNhdGNoIGl0XG4gICAgICAgICAgdGhyb3cgZXJyXG4gICAgICAgIH1cbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIGlmIChuLmFmdGVyd2FyZHMpIHtcbiAgICAgICAgICAvLyBhZnRlcndhcmRzIGFsd2F5cyBydW5zIGlmIGV4ZWN1dGlvbiBlbnRlcmVkIHRoZSB0cnkgYm9keVxuICAgICAgICAgIC8vIChndWFyZCByZWplY3Rpb24gbmV2ZXIgcmVhY2hlcyBoZXJlIFx1MjAxNCBzZWUgYGNhbGxgIGhhbmRsZXIgYWJvdmUpXG4gICAgICAgICAgYXdhaXQgZXhlY3V0ZShuLmFmdGVyd2FyZHMsIGN0eClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAodGhyZXcgJiYgIW4ucmVzY3VlKSB7XG4gICAgICAgIC8vIEFscmVhZHkgcmUtdGhyb3duIGFib3ZlIFx1MjAxNCB1bnJlYWNoYWJsZSwgYnV0IFR5cGVTY3JpcHQgbmVlZHMgdGhpc1xuICAgICAgfVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIGFuaW1hdGlvbiBwcmltaXRpdmUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnYW5pbWF0aW9uJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQW5pbWF0aW9uTm9kZVxuICAgICAgY29uc3QgcHJpbWl0aXZlID0gY3R4Lm1vZHVsZXMuZ2V0KG4ucHJpbWl0aXZlKVxuXG4gICAgICBpZiAoIXByaW1pdGl2ZSkge1xuICAgICAgICBjb25zb2xlLndhcm4oY3R4Lm1vZHVsZXMuaGludEZvcihuLnByaW1pdGl2ZSkpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICAvLyBSZXNvbHZlIHNlbGVjdG9yIFx1MjAxNCBzdWJzdGl0dXRlIGFueSBsb2NhbCB2YXJpYWJsZSByZWZlcmVuY2VzXG4gICAgICBjb25zdCBzZWxlY3RvciA9IHJlc29sdmVTZWxlY3RvcihuLnNlbGVjdG9yLCBjdHgpXG5cbiAgICAgIC8vIEV2YWx1YXRlIG9wdGlvbnNcbiAgICAgIGNvbnN0IG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge31cbiAgICAgIGZvciAoY29uc3QgW2tleSwgZXhwck5vZGVdIG9mIE9iamVjdC5lbnRyaWVzKG4ub3B0aW9ucykpIHtcbiAgICAgICAgb3B0aW9uc1trZXldID0gZXZhbEV4cHIoZXhwck5vZGUsIGN0eClcbiAgICAgIH1cblxuICAgICAgLy8gQXdhaXQgdGhlIGFuaW1hdGlvbiBcdTIwMTQgdGhpcyBpcyB0aGUgY29yZSBvZiBhc3luYyB0cmFuc3BhcmVuY3k6XG4gICAgICAvLyBXZWIgQW5pbWF0aW9ucyBBUEkgcmV0dXJucyBhbiBBbmltYXRpb24gd2l0aCBhIC5maW5pc2hlZCBQcm9taXNlLlxuICAgICAgLy8gYHRoZW5gIGluIExFUyBzb3VyY2UgYXdhaXRzIHRoaXMgbmF0dXJhbGx5LlxuICAgICAgYXdhaXQgcHJpbWl0aXZlKHNlbGVjdG9yLCBuLmR1cmF0aW9uLCBuLmVhc2luZywgb3B0aW9ucywgY3R4Lmhvc3QpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgcmF3IGV4cHJlc3Npb24gKGVzY2FwZSBoYXRjaCAvIHVua25vd24gc3RhdGVtZW50cykgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnZXhwcic6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIEV4cHJOb2RlXG4gICAgICBpZiAobi5yYXcudHJpbSgpKSB7XG4gICAgICAgIC8vIEV2YWx1YXRlIGFzIGEgSlMgZXhwcmVzc2lvbiBmb3Igc2lkZSBlZmZlY3RzXG4gICAgICAgIC8vIFRoaXMgaGFuZGxlcyB1bmtub3duIHByaW1pdGl2ZXMgYW5kIGZ1dHVyZSBrZXl3b3JkcyBncmFjZWZ1bGx5XG4gICAgICAgIGV2YWxFeHByKG4sIGN0eClcbiAgICAgIH1cbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBhY3Rpb24gKGJhcmUgQGdldCBldGMuIG5vdCBpbnNpZGUgYSBiaW5kKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICAvLyBgQGdldCAnL2FwaS9mZWVkJyBbZmlsdGVyOiAkYWN0aXZlRmlsdGVyXWBcbiAgICAvLyBBd2FpdHMgdGhlIGZ1bGwgU1NFIHN0cmVhbSAvIEpTT04gcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgIC8vIERhdGFzdGFyIHByb2Nlc3NlcyB0aGUgU1NFIGV2ZW50cyAocGF0Y2gtZWxlbWVudHMsIHBhdGNoLXNpZ25hbHMpIGFzXG4gICAgLy8gdGhleSBhcnJpdmUuIFRoZSBQcm9taXNlIHJlc29sdmVzIHdoZW4gdGhlIHN0cmVhbSBjbG9zZXMuXG4gICAgLy8gYHRoZW5gIGluIExFUyBjb3JyZWN0bHkgd2FpdHMgZm9yIHRoaXMgYmVmb3JlIHByb2NlZWRpbmcuXG4gICAgY2FzZSAnYWN0aW9uJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGVcbiAgICAgIGNvbnN0IGV2YWxlZEFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge31cbiAgICAgIGZvciAoY29uc3QgW2tleSwgZXhwck5vZGVdIG9mIE9iamVjdC5lbnRyaWVzKG4uYXJncykpIHtcbiAgICAgICAgZXZhbGVkQXJnc1trZXldID0gZXZhbEV4cHIoZXhwck5vZGUsIGN0eClcbiAgICAgIH1cbiAgICAgIGF3YWl0IHBlcmZvcm1BY3Rpb24obi52ZXJiLCBuLnVybCwgZXZhbGVkQXJncywgY3R4KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgZGVmYXVsdDoge1xuICAgICAgY29uc3QgZXhoYXVzdGl2ZTogbmV2ZXIgPSBub2RlXG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIFVua25vd24gbm9kZSB0eXBlOicsIChleGhhdXN0aXZlIGFzIExFU05vZGUpLnR5cGUpXG4gICAgfVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gRXhwcmVzc2lvbiBldmFsdWF0aW9uXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBFdmFsdWF0ZXMgYSByYXcgSlMgZXhwcmVzc2lvbiBzdHJpbmcgaW4gYSBzYW5kYm94ZWQgY29udGV4dCB0aGF0XG4gKiBleHBvc2VzIHNjb3BlIGxvY2FscyBhbmQgRGF0YXN0YXIgc2lnbmFscyB2aWEgYSBQcm94eS5cbiAqXG4gKiBTaWduYWwgYWNjZXNzOiBgJGZlZWRTdGF0ZWAgXHUyMTkyIHJlYWRzIHRoZSBgZmVlZFN0YXRlYCBzaWduYWxcbiAqIExvY2FsIGFjY2VzczogIGBmaWx0ZXJgICAgIFx1MjE5MiByZWFkcyBmcm9tIHNjb3BlXG4gKlxuICogVGhlIHNhbmRib3ggaXMgaW50ZW50aW9uYWxseSBzaW1wbGUgZm9yIFBoYXNlIDMuIEEgcHJvcGVyIHNhbmRib3hcbiAqIChDU1AtY29tcGF0aWJsZSwgbm8gZXZhbCBmYWxsYmFjaykgaXMgYSBmdXR1cmUgaGFyZGVuaW5nIHRhc2suXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBldmFsRXhwcihub2RlOiBFeHByTm9kZSwgY3R4OiBMRVNDb250ZXh0KTogdW5rbm93biB7XG4gIGlmICghbm9kZS5yYXcudHJpbSgpKSByZXR1cm4gdW5kZWZpbmVkXG5cbiAgLy8gRmFzdCBwYXRoOiBzaW1wbGUgc3RyaW5nIGxpdGVyYWxcbiAgaWYgKG5vZGUucmF3LnN0YXJ0c1dpdGgoXCInXCIpICYmIG5vZGUucmF3LmVuZHNXaXRoKFwiJ1wiKSkge1xuICAgIHJldHVybiBub2RlLnJhdy5zbGljZSgxLCAtMSlcbiAgfVxuICAvLyBGYXN0IHBhdGg6IG51bWJlciBsaXRlcmFsXG4gIGNvbnN0IG51bSA9IE51bWJlcihub2RlLnJhdylcbiAgaWYgKCFOdW1iZXIuaXNOYU4obnVtKSAmJiBub2RlLnJhdy50cmltKCkgIT09ICcnKSByZXR1cm4gbnVtXG4gIC8vIEZhc3QgcGF0aDogYm9vbGVhblxuICBpZiAobm9kZS5yYXcgPT09ICd0cnVlJykgIHJldHVybiB0cnVlXG4gIGlmIChub2RlLnJhdyA9PT0gJ2ZhbHNlJykgcmV0dXJuIGZhbHNlXG4gIGlmIChub2RlLnJhdyA9PT0gJ251bGwnIHx8IG5vZGUucmF3ID09PSAnbmlsJykgcmV0dXJuIG51bGxcblxuICAvLyBcdTI1MDBcdTI1MDAgRmFzdCBwYXRocyBmb3IgY29tbW9uIGFuaW1hdGlvbi9vcHRpb24gdmFsdWUgcGF0dGVybnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gIC8vIFRoZXNlIGFyZSBub3QgdmFsaWQgSlMgZXhwcmVzc2lvbnMgYnV0IGFwcGVhciBhcyBhbmltYXRpb24gb3B0aW9uIHZhbHVlcy5cbiAgLy8gUmV0dXJuIHRoZW0gYXMgc3RyaW5ncyBzbyB0aGUgYW5pbWF0aW9uIG1vZHVsZSBjYW4gaW50ZXJwcmV0IHRoZW0gZGlyZWN0bHkuXG4gIGlmICgvXlxcZCsoXFwuXFxkKyk/bXMkLy50ZXN0KG5vZGUucmF3KSkgcmV0dXJuIG5vZGUucmF3ICAgICAgICAgICAgICAgICAgIC8vIFwiMjBtc1wiLCBcIjQwbXNcIlxuICBpZiAoL15cXGQrKFxcLlxcZCspP3B4JC8udGVzdChub2RlLnJhdykpIHJldHVybiBub2RlLnJhdyAgICAgICAgICAgICAgICAgICAvLyBcIjdweFwiLCBcIjEycHhcIlxuICBpZiAoL15bYS16QS1aXVthLXpBLVowLTlfLV0qJC8udGVzdChub2RlLnJhdykpIHtcbiAgICAvLyBTY29wZSBsb29rdXAgZmlyc3QgXHUyMDE0IGJhcmUgaWRlbnRpZmllcnMgY2FuIGJlIGxvY2FsIHZhcmlhYmxlcyAoZS5nLiBgc2VsZWN0b3JgLFxuICAgIC8vIGBpZGAsIGBmaWx0ZXJgKSBPUiBhbmltYXRpb24ga2V5d29yZCBzdHJpbmdzIChlLmcuIGByaWdodGAsIGByZXZlcnNlYCwgYHNpbXBsZXhgKS5cbiAgICAvLyBWYXJpYWJsZXMgd2luLiBPbmx5IHJldHVybiB0aGUgcmF3IHN0cmluZyBpZiBub3RoaW5nIGlzIGZvdW5kIGluIHNjb3BlL3NpZ25hbHMuXG4gICAgY29uc3Qgc2NvcGVkID0gY3R4LnNjb3BlLmdldChub2RlLnJhdylcbiAgICBpZiAoc2NvcGVkICE9PSB1bmRlZmluZWQpIHJldHVybiBzY29wZWRcbiAgICBjb25zdCBzaWduYWxlZCA9IGN0eC5nZXRTaWduYWwobm9kZS5yYXcpXG4gICAgaWYgKHNpZ25hbGVkICE9PSB1bmRlZmluZWQpIHJldHVybiBzaWduYWxlZFxuICAgIHJldHVybiBub2RlLnJhdyAgIC8vIGtleXdvcmQgc3RyaW5nOiBcInJldmVyc2VcIiwgXCJyaWdodFwiLCBcImVhc2Utb3V0XCIsIFwic2ltcGxleFwiLCBldGMuXG4gIH1cbiAgaWYgKC9eKGN1YmljLWJlemllcnxzdGVwc3xsaW5lYXIpXFwoLy50ZXN0KG5vZGUucmF3KSkgcmV0dXJuIG5vZGUucmF3ICAgICAgLy8gXCJjdWJpYy1iZXppZXIoMC4yMiwxLDAuMzYsMSlcblxuICB0cnkge1xuICAgIC8vIEJ1aWxkIGEgZmxhdCBvYmplY3Qgb2YgYWxsIGFjY2Vzc2libGUgbmFtZXM6XG4gICAgLy8gLSBTY29wZSBsb2NhbHMgKGlubmVybW9zdCB3aW5zKVxuICAgIC8vIC0gRGF0YXN0YXIgc2lnbmFscyB2aWEgJC1wcmVmaXggc3RyaXBwaW5nXG4gICAgY29uc3Qgc2NvcGVTbmFwc2hvdCA9IGN0eC5zY29wZS5zbmFwc2hvdCgpXG5cbiAgICAvLyBFeHRyYWN0IHNpZ25hbCByZWZlcmVuY2VzIGZyb20gdGhlIGV4cHJlc3Npb24gKCRuYW1lIFx1MjE5MiBuYW1lKVxuICAgIGNvbnN0IHNpZ25hbE5hbWVzID0gWy4uLm5vZGUucmF3Lm1hdGNoQWxsKC9cXCQoW2EtekEtWl9dXFx3KikvZyldXG4gICAgICAubWFwKG0gPT4gbVsxXSEpXG5cbiAgICBjb25zdCBzaWduYWxzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHNpZ25hbE5hbWVzKSB7XG4gICAgICBzaWduYWxzW25hbWVdID0gY3R4LmdldFNpZ25hbChuYW1lKVxuICAgIH1cblxuICAgIC8vIFJld3JpdGUgJG5hbWUgXHUyMTkyIF9fc2lnX25hbWUgaW4gdGhlIGV4cHJlc3Npb24gc28gd2UgY2FuIHBhc3Mgc2lnbmFsc1xuICAgIC8vIGFzIHBsYWluIHZhcmlhYmxlcyAoYXZvaWRzICQgaW4gSlMgaWRlbnRpZmllcnMpXG4gICAgbGV0IHJld3JpdHRlbiA9IG5vZGUucmF3XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHNpZ25hbE5hbWVzKSB7XG4gICAgICByZXdyaXR0ZW4gPSByZXdyaXR0ZW4ucmVwbGFjZUFsbChgJCR7bmFtZX1gLCBgX19zaWdfJHtuYW1lfWApXG4gICAgfVxuXG4gICAgLy8gUHJlZml4IHNpZ25hbCB2YXJzIGluIHRoZSBiaW5kaW5nIG9iamVjdFxuICAgIGNvbnN0IHNpZ0JpbmRpbmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgZm9yIChjb25zdCBbaywgdl0gb2YgT2JqZWN0LmVudHJpZXMoc2lnbmFscykpIHtcbiAgICAgIHNpZ0JpbmRpbmdzW2BfX3NpZ18ke2t9YF0gPSB2XG4gICAgfVxuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLW5ldy1mdW5jXG4gICAgY29uc3QgZm4gPSBuZXcgRnVuY3Rpb24oXG4gICAgICAuLi5PYmplY3Qua2V5cyhzY29wZVNuYXBzaG90KSxcbiAgICAgIC4uLk9iamVjdC5rZXlzKHNpZ0JpbmRpbmdzKSxcbiAgICAgIGByZXR1cm4gKCR7cmV3cml0dGVufSlgXG4gICAgKVxuICAgIHJldHVybiBmbihcbiAgICAgIC4uLk9iamVjdC52YWx1ZXMoc2NvcGVTbmFwc2hvdCksXG4gICAgICAuLi5PYmplY3QudmFsdWVzKHNpZ0JpbmRpbmdzKVxuICAgIClcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTXSBFeHByZXNzaW9uIGV2YWwgZXJyb3I6ICR7SlNPTi5zdHJpbmdpZnkobm9kZS5yYXcpfWAsIGVycilcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cbn1cblxuLyoqXG4gKiBFdmFsdWF0ZXMgYSBndWFyZCBleHByZXNzaW9uIHN0cmluZyAoZnJvbSBjb21tYW5kIGBndWFyZGAgYXR0cmlidXRlKS5cbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ3VhcmQgcGFzc2VzIChjb21tYW5kIHNob3VsZCBydW4pLCBmYWxzZSB0byBzaWxlbnQtYWJvcnQuXG4gKi9cbmZ1bmN0aW9uIGV2YWxHdWFyZChndWFyZEV4cHI6IHN0cmluZywgY3R4OiBMRVNDb250ZXh0KTogYm9vbGVhbiB7XG4gIGNvbnN0IHJlc3VsdCA9IGV2YWxFeHByKHsgdHlwZTogJ2V4cHInLCByYXc6IGd1YXJkRXhwciB9LCBjdHgpXG4gIHJldHVybiBCb29sZWFuKHJlc3VsdClcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXR0ZXJuIG1hdGNoaW5nXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBBdHRlbXB0cyB0byBtYXRjaCBgc3ViamVjdGAgYWdhaW5zdCBgcGF0dGVybnNgLlxuICpcbiAqIFJldHVybnMgYSBiaW5kaW5ncyBtYXAgaWYgbWF0Y2hlZCAoZW1wdHkgbWFwIGZvciB3aWxkY2FyZC9saXRlcmFsIG1hdGNoZXMpLFxuICogb3IgbnVsbCBpZiB0aGUgbWF0Y2ggZmFpbHMuXG4gKlxuICogRm9yIHR1cGxlIHBhdHRlcm5zLCBgc3ViamVjdGAgaXMgbWF0Y2hlZCBlbGVtZW50LWJ5LWVsZW1lbnQuXG4gKiBGb3Igb3ItcGF0dGVybnMsIGFueSBhbHRlcm5hdGl2ZSBtYXRjaGluZyByZXR1cm5zIHRoZSBiaW5kaW5ncy5cbiAqL1xuZnVuY3Rpb24gbWF0Y2hQYXR0ZXJucyhcbiAgcGF0dGVybnM6IFBhdHRlcm5Ob2RlW10sXG4gIHN1YmplY3Q6IHVua25vd25cbik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbCB7XG4gIC8vIFNpbmdsZS1wYXR0ZXJuIChtb3N0IGNvbW1vbik6IG1hdGNoIGRpcmVjdGx5XG4gIGlmIChwYXR0ZXJucy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbWF0Y2hTaW5nbGUocGF0dGVybnNbMF0hLCBzdWJqZWN0KVxuICB9XG5cbiAgLy8gVHVwbGUgcGF0dGVybjogc3ViamVjdCBtdXN0IGJlIGFuIGFycmF5XG4gIGlmICghQXJyYXkuaXNBcnJheShzdWJqZWN0KSkge1xuICAgIC8vIFdyYXAgc2luZ2xlIHZhbHVlIGluIHR1cGxlIGZvciBlcmdvbm9taWNzXG4gICAgLy8gZS5nLiBgW2l0IG9rXWAgYWdhaW5zdCBhIHtvazogdHJ1ZSwgZGF0YTogLi4ufSByZXNwb25zZVxuICAgIHJldHVybiBtYXRjaFR1cGxlKHBhdHRlcm5zLCBzdWJqZWN0KVxuICB9XG5cbiAgcmV0dXJuIG1hdGNoVHVwbGUocGF0dGVybnMsIHN1YmplY3QpXG59XG5cbmZ1bmN0aW9uIG1hdGNoVHVwbGUoXG4gIHBhdHRlcm5zOiBQYXR0ZXJuTm9kZVtdLFxuICBzdWJqZWN0OiB1bmtub3duXG4pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IG51bGwge1xuICAvLyBGb3Igbm9uLWFycmF5IHN1YmplY3RzLCB0cnkgYmluZGluZyBlYWNoIHBhdHRlcm4gYWdhaW5zdCB0aGUgd2hvbGUgc3ViamVjdFxuICAvLyAoaGFuZGxlcyBgW2l0IG9rXWAgbWF0Y2hpbmcgYW4gb2JqZWN0IHdoZXJlIGBpdGAgPSBvYmplY3QsIGBva2AgPSBzdGF0dXMpXG4gIGNvbnN0IGJpbmRpbmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXR0ZXJucy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHBhdCA9IHBhdHRlcm5zW2ldIVxuXG4gICAgLy8gRm9yIHR1cGxlIHBhdHRlcm5zIGFnYWluc3Qgb2JqZWN0cywgd2UgZG8gYSBzdHJ1Y3R1cmFsIG1hdGNoOlxuICAgIC8vIGBbaXQgb2tdYCBhZ2FpbnN0IHtkYXRhOiAuLi4sIHN0YXR1czogJ29rJ30gYmluZHMgYGl0YCA9IGRhdGEsIGBva2AgPSAnb2snXG4gICAgLy8gVGhpcyBpcyBhIHNpbXBsaWZpY2F0aW9uIFx1MjAxNCBmdWxsIHN0cnVjdHVyYWwgbWF0Y2hpbmcgY29tZXMgaW4gYSBsYXRlciBwYXNzXG4gICAgY29uc3QgdmFsdWUgPSBBcnJheS5pc0FycmF5KHN1YmplY3QpXG4gICAgICA/IHN1YmplY3RbaV1cbiAgICAgIDogaSA9PT0gMCA/IHN1YmplY3QgOiB1bmRlZmluZWRcblxuICAgIGNvbnN0IHJlc3VsdCA9IG1hdGNoU2luZ2xlKHBhdCwgdmFsdWUpXG4gICAgaWYgKHJlc3VsdCA9PT0gbnVsbCkgcmV0dXJuIG51bGxcbiAgICBPYmplY3QuYXNzaWduKGJpbmRpbmdzLCByZXN1bHQpXG4gIH1cblxuICByZXR1cm4gYmluZGluZ3Ncbn1cblxuZnVuY3Rpb24gbWF0Y2hTaW5nbGUoXG4gIHBhdHRlcm46IFBhdHRlcm5Ob2RlLFxuICB2YWx1ZTogdW5rbm93blxuKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsIHtcbiAgc3dpdGNoIChwYXR0ZXJuLmtpbmQpIHtcbiAgICBjYXNlICd3aWxkY2FyZCc6XG4gICAgICByZXR1cm4ge30gICAvLyBBbHdheXMgbWF0Y2hlcywgYmluZHMgbm90aGluZ1xuXG4gICAgY2FzZSAnbGl0ZXJhbCc6XG4gICAgICByZXR1cm4gdmFsdWUgPT09IHBhdHRlcm4udmFsdWUgPyB7fSA6IG51bGxcblxuICAgIGNhc2UgJ2JpbmRpbmcnOlxuICAgICAgcmV0dXJuIHsgW3BhdHRlcm4ubmFtZV06IHZhbHVlIH0gICAvLyBBbHdheXMgbWF0Y2hlcywgYmluZHMgbmFtZSBcdTIxOTIgdmFsdWVcblxuICAgIGNhc2UgJ29yJzoge1xuICAgICAgZm9yIChjb25zdCBhbHQgb2YgcGF0dGVybi5wYXR0ZXJucykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBtYXRjaFNpbmdsZShhbHQsIHZhbHVlKVxuICAgICAgICBpZiAocmVzdWx0ICE9PSBudWxsKSByZXR1cm4gcmVzdWx0XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEhUVFAgYWN0aW9uXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBQZXJmb3JtcyBhbiBIVFRQIGFjdGlvbiAoQGdldCwgQHBvc3QsIGV0Yy4pLlxuICpcbiAqIFdoZW4gRGF0YXN0YXIgYWN0aW9ucyBhcmUgYXZhaWxhYmxlIGluIHRoZSBob3N0J3MgY29udGV4dCwgd2UgdHJpZ2dlclxuICogRGF0YXN0YXIncyBmZXRjaCBwaXBlbGluZSAod2hpY2ggaGFuZGxlcyBzaWduYWwgc2VyaWFsaXphdGlvbiwgU1NFXG4gKiByZXNwb25zZSBwcm9jZXNzaW5nLCBhbmQgaW5kaWNhdG9yIHNpZ25hbHMpLlxuICpcbiAqIEZhbGxzIGJhY2sgdG8gbmF0aXZlIGZldGNoIHdoZW4gRGF0YXN0YXIgaXMgbm90IHByZXNlbnQuXG4gKlxuICogTm90ZTogRGF0YXN0YXIncyBAZ2V0IC8gQHBvc3QgYXJlIGZpcmUtYW5kLWZvcmdldCAodGhleSBzdHJlYW0gU1NFIGJhY2tcbiAqIHRvIHBhdGNoIHNpZ25hbHMvZWxlbWVudHMpLiBGb3IgdGhlIGJpbmQgY2FzZSAoYHJlc3BvbnNlIDwtIEBnZXQgLi4uYClcbiAqIHdlIHVzZSBuYXRpdmUgZmV0Y2ggdG8gZ2V0IGEgUHJvbWlzZS1iYXNlZCBKU09OIHJlc3BvbnNlIHRoYXQgTEVTIGNhblxuICogYmluZCB0byBhIGxvY2FsIHZhcmlhYmxlLlxuICovXG5hc3luYyBmdW5jdGlvbiBwZXJmb3JtQWN0aW9uKFxuICB2ZXJiOiBzdHJpbmcsXG4gIHVybDogc3RyaW5nLFxuICBhcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgY3R4OiBMRVNDb250ZXh0XG4pOiBQcm9taXNlPHVua25vd24+IHtcbiAgY29uc3QgbWV0aG9kID0gdmVyYi50b1VwcGVyQ2FzZSgpXG5cbiAgbGV0IGZ1bGxVcmwgPSB1cmxcbiAgbGV0IGJvZHk6IHN0cmluZyB8IHVuZGVmaW5lZFxuXG4gIGlmIChtZXRob2QgPT09ICdHRVQnIHx8IG1ldGhvZCA9PT0gJ0RFTEVURScpIHtcbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKClcbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhhcmdzKSkge1xuICAgICAgcGFyYW1zLnNldChrLCBTdHJpbmcodikpXG4gICAgfVxuICAgIGNvbnN0IHFzID0gcGFyYW1zLnRvU3RyaW5nKClcbiAgICBpZiAocXMpIGZ1bGxVcmwgPSBgJHt1cmx9PyR7cXN9YFxuICB9IGVsc2Uge1xuICAgIGJvZHkgPSBKU09OLnN0cmluZ2lmeShhcmdzKVxuICB9XG5cbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChmdWxsVXJsLCB7XG4gICAgbWV0aG9kLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAnQWNjZXB0JzogJ3RleHQvZXZlbnQtc3RyZWFtLCBhcHBsaWNhdGlvbi9qc29uJyxcbiAgICB9LFxuICAgIC4uLihib2R5ID8geyBib2R5IH0gOiB7fSksXG4gIH0pXG5cbiAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgIHRocm93IG5ldyBFcnJvcihgW0xFU10gSFRUUCAke3Jlc3BvbnNlLnN0YXR1c30gZnJvbSAke21ldGhvZH0gJHt1cmx9YClcbiAgfVxuXG4gIGNvbnN0IGNvbnRlbnRUeXBlID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpID8/ICcnXG5cbiAgLy8gXHUyNTAwXHUyNTAwIFNTRSBzdHJlYW06IERhdGFzdGFyIHNlcnZlci1zZW50IGV2ZW50cyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgLy8gV2hlbiB0aGUgc2VydmVyIHJldHVybnMgdGV4dC9ldmVudC1zdHJlYW0sIGNvbnN1bWUgdGhlIFNTRSBzdHJlYW0gYW5kXG4gIC8vIGFwcGx5IGRhdGFzdGFyLXBhdGNoLWVsZW1lbnRzIC8gZGF0YXN0YXItcGF0Y2gtc2lnbmFscyBldmVudHMgb3Vyc2VsdmVzLlxuICAvLyBUaGUgUHJvbWlzZSByZXNvbHZlcyB3aGVuIHRoZSBzdHJlYW0gY2xvc2VzIFx1MjAxNCBzbyBgdGhlbmAgaW4gTEVTIGNvcnJlY3RseVxuICAvLyB3YWl0cyBmb3IgYWxsIERPTSBwYXRjaGVzIGJlZm9yZSBwcm9jZWVkaW5nIHRvIHRoZSBuZXh0IHN0ZXAuXG4gIGlmIChjb250ZW50VHlwZS5pbmNsdWRlcygndGV4dC9ldmVudC1zdHJlYW0nKSkge1xuICAgIGF3YWl0IGNvbnN1bWVTU0VTdHJlYW0ocmVzcG9uc2UsIGN0eClcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cblxuICBpZiAoY29udGVudFR5cGUuaW5jbHVkZXMoJ2FwcGxpY2F0aW9uL2pzb24nKSkge1xuICAgIHJldHVybiBhd2FpdCByZXNwb25zZS5qc29uKClcbiAgfVxuICByZXR1cm4gYXdhaXQgcmVzcG9uc2UudGV4dCgpXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gU1NFIHN0cmVhbSBjb25zdW1lclxuLy9cbi8vIFJlYWRzIGEgRGF0YXN0YXIgU1NFIHN0cmVhbSBsaW5lLWJ5LWxpbmUgYW5kIGFwcGxpZXMgdGhlIGV2ZW50cy5cbi8vIFdlIGltcGxlbWVudCBhIG1pbmltYWwgc3Vic2V0IG9mIHRoZSBEYXRhc3RhciBTU0Ugc3BlYyBuZWVkZWQgZm9yIExFUzpcbi8vXG4vLyAgIGRhdGFzdGFyLXBhdGNoLWVsZW1lbnRzICBcdTIxOTIgYXBwbHkgdG8gdGhlIERPTSB1c2luZyBtb3JwaGRvbS1saXRlIGxvZ2ljXG4vLyAgIGRhdGFzdGFyLXBhdGNoLXNpZ25hbHMgICBcdTIxOTIgd3JpdGUgc2lnbmFsIHZhbHVlcyB2aWEgY3R4LnNldFNpZ25hbFxuLy9cbi8vIFRoaXMgcnVucyBlbnRpcmVseSBpbiB0aGUgYnJvd3NlciBcdTIwMTQgbm8gRGF0YXN0YXIgaW50ZXJuYWwgQVBJcyBuZWVkZWQuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuYXN5bmMgZnVuY3Rpb24gY29uc3VtZVNTRVN0cmVhbShcbiAgcmVzcG9uc2U6IFJlc3BvbnNlLFxuICBjdHg6IExFU0NvbnRleHRcbik6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoIXJlc3BvbnNlLmJvZHkpIHJldHVyblxuXG4gIGNvbnN0IHJlYWRlciAgPSByZXNwb25zZS5ib2R5LmdldFJlYWRlcigpXG4gIGNvbnN0IGRlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoKVxuICBsZXQgYnVmZmVyICAgID0gJydcblxuICAvLyBTU0UgZXZlbnQgYWNjdW11bGF0b3IgXHUyMDE0IHJlc2V0IGFmdGVyIGVhY2ggZG91YmxlLW5ld2xpbmVcbiAgbGV0IGV2ZW50VHlwZSA9ICcnXG4gIGxldCBkYXRhTGluZXM6IHN0cmluZ1tdID0gW11cblxuICBjb25zdCBhcHBseUV2ZW50ID0gKCkgPT4ge1xuICAgIGlmICghZXZlbnRUeXBlIHx8IGRhdGFMaW5lcy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gICAgaWYgKGV2ZW50VHlwZSA9PT0gJ2RhdGFzdGFyLXBhdGNoLWVsZW1lbnRzJykge1xuICAgICAgYXBwbHlQYXRjaEVsZW1lbnRzKGRhdGFMaW5lcywgY3R4KVxuICAgIH0gZWxzZSBpZiAoZXZlbnRUeXBlID09PSAnZGF0YXN0YXItcGF0Y2gtc2lnbmFscycpIHtcbiAgICAgIGFwcGx5UGF0Y2hTaWduYWxzKGRhdGFMaW5lcywgY3R4KVxuICAgIH1cblxuICAgIC8vIFJlc2V0IGFjY3VtdWxhdG9yXG4gICAgZXZlbnRUeXBlID0gJydcbiAgICBkYXRhTGluZXMgPSBbXVxuICB9XG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCB7IGRvbmUsIHZhbHVlIH0gPSBhd2FpdCByZWFkZXIucmVhZCgpXG4gICAgaWYgKGRvbmUpIHsgYXBwbHlFdmVudCgpOyBicmVhayB9XG5cbiAgICBidWZmZXIgKz0gZGVjb2Rlci5kZWNvZGUodmFsdWUsIHsgc3RyZWFtOiB0cnVlIH0pXG5cbiAgICAvLyBQcm9jZXNzIGNvbXBsZXRlIGxpbmVzIGZyb20gdGhlIGJ1ZmZlclxuICAgIGNvbnN0IGxpbmVzID0gYnVmZmVyLnNwbGl0KCdcXG4nKVxuICAgIGJ1ZmZlciA9IGxpbmVzLnBvcCgpID8/ICcnICAgLy8gbGFzdCBwYXJ0aWFsIGxpbmUgc3RheXMgaW4gYnVmZmVyXG5cbiAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJ2V2ZW50OicpKSB7XG4gICAgICAgIGV2ZW50VHlwZSA9IGxpbmUuc2xpY2UoJ2V2ZW50OicubGVuZ3RoKS50cmltKClcbiAgICAgIH0gZWxzZSBpZiAobGluZS5zdGFydHNXaXRoKCdkYXRhOicpKSB7XG4gICAgICAgIGRhdGFMaW5lcy5wdXNoKGxpbmUuc2xpY2UoJ2RhdGE6Jy5sZW5ndGgpLnRyaW1TdGFydCgpKVxuICAgICAgfSBlbHNlIGlmIChsaW5lID09PSAnJykge1xuICAgICAgICAvLyBCbGFuayBsaW5lID0gZW5kIG9mIHRoaXMgU1NFIGV2ZW50XG4gICAgICAgIGFwcGx5RXZlbnQoKVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDAgQXBwbHkgZGF0YXN0YXItcGF0Y2gtZWxlbWVudHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIGFwcGx5UGF0Y2hFbGVtZW50cyhkYXRhTGluZXM6IHN0cmluZ1tdLCBjdHg6IExFU0NvbnRleHQpOiB2b2lkIHtcbiAgLy8gUGFyc2UgdGhlIHN0cnVjdHVyZWQgZGF0YSBsaW5lcyBpbnRvIGFuIG9wdGlvbnMgb2JqZWN0XG4gIGxldCBzZWxlY3RvciAgICA9ICcnXG4gIGxldCBtb2RlICAgICAgICA9ICdvdXRlcidcbiAgY29uc3QgaHRtbExpbmVzOiBzdHJpbmdbXSA9IFtdXG5cbiAgZm9yIChjb25zdCBsaW5lIG9mIGRhdGFMaW5lcykge1xuICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJ3NlbGVjdG9yICcpKSAgeyBzZWxlY3RvciA9IGxpbmUuc2xpY2UoJ3NlbGVjdG9yICcubGVuZ3RoKS50cmltKCk7IGNvbnRpbnVlIH1cbiAgICBpZiAobGluZS5zdGFydHNXaXRoKCdtb2RlICcpKSAgICAgIHsgbW9kZSAgICAgPSBsaW5lLnNsaWNlKCdtb2RlICcubGVuZ3RoKS50cmltKCk7ICAgICBjb250aW51ZSB9XG4gICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnZWxlbWVudHMgJykpICB7IGh0bWxMaW5lcy5wdXNoKGxpbmUuc2xpY2UoJ2VsZW1lbnRzICcubGVuZ3RoKSk7ICAgY29udGludWUgfVxuICAgIC8vIExpbmVzIHdpdGggbm8gcHJlZml4IGFyZSBhbHNvIGVsZW1lbnQgY29udGVudCAoRGF0YXN0YXIgc3BlYyBhbGxvd3MgdGhpcylcbiAgICBodG1sTGluZXMucHVzaChsaW5lKVxuICB9XG5cbiAgY29uc3QgaHRtbCA9IGh0bWxMaW5lcy5qb2luKCdcXG4nKS50cmltKClcblxuICBjb25zdCB0YXJnZXQgPSBzZWxlY3RvclxuICAgID8gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcilcbiAgICA6IG51bGxcblxuICBjb25zb2xlLmxvZyhgW0xFUzpzc2VdIHBhdGNoLWVsZW1lbnRzIG1vZGU9JHttb2RlfSBzZWxlY3Rvcj1cIiR7c2VsZWN0b3J9XCIgaHRtbC5sZW49JHtodG1sLmxlbmd0aH1gKVxuXG4gIGlmIChtb2RlID09PSAncmVtb3ZlJykge1xuICAgIC8vIFJlbW92ZSBhbGwgbWF0Y2hpbmcgZWxlbWVudHNcbiAgICBjb25zdCB0b1JlbW92ZSA9IHNlbGVjdG9yXG4gICAgICA/IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpXG4gICAgICA6IFtdXG4gICAgdG9SZW1vdmUuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSlcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChtb2RlID09PSAnYXBwZW5kJyAmJiB0YXJnZXQpIHtcbiAgICBjb25zdCBmcmFnID0gcGFyc2VIVE1MKGh0bWwpXG4gICAgdGFyZ2V0LmFwcGVuZChmcmFnKVxuICAgIHJldHVyblxuICB9XG5cbiAgaWYgKG1vZGUgPT09ICdwcmVwZW5kJyAmJiB0YXJnZXQpIHtcbiAgICBjb25zdCBmcmFnID0gcGFyc2VIVE1MKGh0bWwpXG4gICAgdGFyZ2V0LnByZXBlbmQoZnJhZylcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChtb2RlID09PSAnaW5uZXInICYmIHRhcmdldCkge1xuICAgIHRhcmdldC5pbm5lckhUTUwgPSBodG1sXG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAobW9kZSA9PT0gJ291dGVyJyAmJiB0YXJnZXQpIHtcbiAgICBjb25zdCBmcmFnID0gcGFyc2VIVE1MKGh0bWwpXG4gICAgdGFyZ2V0LnJlcGxhY2VXaXRoKGZyYWcpXG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAobW9kZSA9PT0gJ2JlZm9yZScgJiYgdGFyZ2V0KSB7XG4gICAgY29uc3QgZnJhZyA9IHBhcnNlSFRNTChodG1sKVxuICAgIHRhcmdldC5iZWZvcmUoZnJhZylcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChtb2RlID09PSAnYWZ0ZXInICYmIHRhcmdldCkge1xuICAgIGNvbnN0IGZyYWcgPSBwYXJzZUhUTUwoaHRtbClcbiAgICB0YXJnZXQuYWZ0ZXIoZnJhZylcbiAgICByZXR1cm5cbiAgfVxuXG4gIC8vIE5vIHNlbGVjdG9yOiB0cnkgdG8gcGF0Y2ggYnkgZWxlbWVudCBJRHNcbiAgaWYgKCFzZWxlY3RvciAmJiBodG1sKSB7XG4gICAgY29uc3QgZnJhZyA9IHBhcnNlSFRNTChodG1sKVxuICAgIGZvciAoY29uc3QgZWwgb2YgQXJyYXkuZnJvbShmcmFnLmNoaWxkcmVuKSkge1xuICAgICAgY29uc3QgaWQgPSBlbC5pZFxuICAgICAgaWYgKGlkKSB7XG4gICAgICAgIGNvbnN0IGV4aXN0aW5nID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXG4gICAgICAgIGlmIChleGlzdGluZykgZXhpc3RpbmcucmVwbGFjZVdpdGgoZWwpXG4gICAgICAgIGVsc2UgZG9jdW1lbnQuYm9keS5hcHBlbmQoZWwpXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHBhcnNlSFRNTChodG1sOiBzdHJpbmcpOiBEb2N1bWVudEZyYWdtZW50IHtcbiAgY29uc3QgdGVtcGxhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpXG4gIHRlbXBsYXRlLmlubmVySFRNTCA9IGh0bWxcbiAgcmV0dXJuIHRlbXBsYXRlLmNvbnRlbnRcbn1cblxuLy8gXHUyNTAwXHUyNTAwIEFwcGx5IGRhdGFzdGFyLXBhdGNoLXNpZ25hbHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIGFwcGx5UGF0Y2hTaWduYWxzKGRhdGFMaW5lczogc3RyaW5nW10sIGN0eDogTEVTQ29udGV4dCk6IHZvaWQge1xuICBmb3IgKGNvbnN0IGxpbmUgb2YgZGF0YUxpbmVzKSB7XG4gICAgaWYgKCFsaW5lLnN0YXJ0c1dpdGgoJ3NpZ25hbHMgJykgJiYgIWxpbmUuc3RhcnRzV2l0aCgneycpKSBjb250aW51ZVxuXG4gICAgY29uc3QganNvblN0ciA9IGxpbmUuc3RhcnRzV2l0aCgnc2lnbmFscyAnKVxuICAgICAgPyBsaW5lLnNsaWNlKCdzaWduYWxzICcubGVuZ3RoKVxuICAgICAgOiBsaW5lXG5cbiAgICB0cnkge1xuICAgICAgY29uc3Qgc2lnbmFscyA9IEpTT04ucGFyc2UoanNvblN0cikgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbiAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHNpZ25hbHMpKSB7XG4gICAgICAgIGN0eC5zZXRTaWduYWwoa2V5LCB2YWx1ZSlcbiAgICAgICAgY29uc29sZS5sb2coYFtMRVM6c3NlXSBwYXRjaC1zaWduYWxzICQke2tleX0gPWAsIHZhbHVlKVxuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTOnNzZV0gRmFpbGVkIHRvIHBhcnNlIHBhdGNoLXNpZ25hbHMgSlNPTjonLCBqc29uU3RyKVxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFNlbGVjdG9yIHJlc29sdXRpb25cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFJlc29sdmVzIHZhcmlhYmxlIHJlZmVyZW5jZXMgaW4gYW4gYW5pbWF0aW9uIHNlbGVjdG9yLlxuICpcbiAqIEV4YW1wbGU6IGBbZGF0YS1pdGVtLWlkOiBpZF1gIHdoZXJlIGBpZGAgaXMgYSBsb2NhbCB2YXJpYWJsZVxuICogYmVjb21lcyBgW2RhdGEtaXRlbS1pZD1cIjEyM1wiXWAgYWZ0ZXIgc3Vic3RpdHV0aW9uLlxuICpcbiAqIFNpbXBsZSBhcHByb2FjaCBmb3IgUGhhc2UgMzogbG9vayBmb3IgYDogdmFybmFtZWAgcGF0dGVybnMgaW4gYXR0cmlidXRlXG4gKiBzZWxlY3RvcnMgYW5kIHN1YnN0aXR1dGUgZnJvbSBzY29wZS5cbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZVNlbGVjdG9yKHNlbGVjdG9yOiBzdHJpbmcsIGN0eDogTEVTQ29udGV4dCk6IHN0cmluZyB7XG4gIC8vIFJlc29sdmVzIExFUyBhdHRyaWJ1dGUgc2VsZWN0b3JzIHRoYXQgY29udGFpbiB2YXJpYWJsZSBleHByZXNzaW9uczpcbiAgLy8gICBbZGF0YS1pdGVtLWlkOiBpZF0gICAgICAgICAgIFx1MjE5MiBbZGF0YS1pdGVtLWlkPVwiNDJcIl1cbiAgLy8gICBbZGF0YS1jYXJkLWlkOiBwYXlsb2FkWzBdXSAgIFx1MjE5MiBbZGF0YS1jYXJkLWlkPVwiM1wiXVxuICAvL1xuICAvLyBBIHJlZ2V4IGlzIGluc3VmZmljaWVudCBiZWNhdXNlIHRoZSB2YXJpYWJsZSBleHByZXNzaW9uIGNhbiBpdHNlbGYgY29udGFpblxuICAvLyBicmFja2V0cyAoZS5nLiBwYXlsb2FkWzBdKSwgd2hpY2ggd291bGQgY29uZnVzZSBhIFteXFxdXSsgcGF0dGVybi5cbiAgLy8gV2UgdXNlIGEgYnJhY2tldC1kZXB0aC1hd2FyZSBzY2FubmVyIGluc3RlYWQuXG4gIGxldCByZXN1bHQgPSAnJ1xuICBsZXQgaSA9IDBcbiAgd2hpbGUgKGkgPCBzZWxlY3Rvci5sZW5ndGgpIHtcbiAgICBpZiAoc2VsZWN0b3JbaV0gPT09ICdbJykge1xuICAgICAgLy8gTG9vayBmb3IgXCI6IFwiIChjb2xvbi1zcGFjZSkgYXMgdGhlIGF0dHIvdmFyRXhwciBzZXBhcmF0b3JcbiAgICAgIGNvbnN0IGNvbG9uSWR4ID0gc2VsZWN0b3IuaW5kZXhPZignOiAnLCBpKVxuICAgICAgaWYgKGNvbG9uSWR4ID09PSAtMSkgeyByZXN1bHQgKz0gc2VsZWN0b3JbaSsrXTsgY29udGludWUgfVxuXG4gICAgICAvLyBTY2FuIGZvcndhcmQgZnJvbSB0aGUgdmFyRXhwciBzdGFydCwgdHJhY2tpbmcgYnJhY2tldCBkZXB0aCxcbiAgICAgIC8vIHRvIGZpbmQgdGhlIF0gdGhhdCBjbG9zZXMgdGhpcyBhdHRyaWJ1dGUgc2VsZWN0b3IgKG5vdCBhbiBpbm5lciBvbmUpXG4gICAgICBsZXQgZGVwdGggPSAwXG4gICAgICBsZXQgY2xvc2VJZHggPSAtMVxuICAgICAgZm9yIChsZXQgaiA9IGNvbG9uSWR4ICsgMjsgaiA8IHNlbGVjdG9yLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmIChzZWxlY3RvcltqXSA9PT0gJ1snKSBkZXB0aCsrXG4gICAgICAgIGVsc2UgaWYgKHNlbGVjdG9yW2pdID09PSAnXScpIHtcbiAgICAgICAgICBpZiAoZGVwdGggPT09IDApIHsgY2xvc2VJZHggPSBqOyBicmVhayB9XG4gICAgICAgICAgZGVwdGgtLVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoY2xvc2VJZHggPT09IC0xKSB7IHJlc3VsdCArPSBzZWxlY3RvcltpKytdOyBjb250aW51ZSB9XG5cbiAgICAgIGNvbnN0IGF0dHIgICAgPSBzZWxlY3Rvci5zbGljZShpICsgMSwgY29sb25JZHgpLnRyaW0oKVxuICAgICAgY29uc3QgdmFyRXhwciA9IHNlbGVjdG9yLnNsaWNlKGNvbG9uSWR4ICsgMiwgY2xvc2VJZHgpLnRyaW0oKVxuICAgICAgY29uc3QgdmFsdWUgICA9IGV2YWxFeHByKHsgdHlwZTogJ2V4cHInLCByYXc6IHZhckV4cHIgfSwgY3R4KVxuICAgICAgcmVzdWx0ICs9IGBbJHthdHRyfT1cIiR7U3RyaW5nKHZhbHVlKX1cIl1gXG4gICAgICBpID0gY2xvc2VJZHggKyAxXG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdCArPSBzZWxlY3RvcltpKytdXG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHRcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBHdWFyZC1hd2FyZSBjb21tYW5kIGV4ZWN1dGlvbiAodXNlZCBieSBQaGFzZSA0IGV2ZW50IHdpcmluZylcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEV4ZWN1dGVzIGEgY29tbWFuZCBieSBuYW1lLCBjaGVja2luZyBpdHMgZ3VhcmQgZmlyc3QuXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGNvbW1hbmQgcmFuLCBmYWxzZSBpZiB0aGUgZ3VhcmQgcmVqZWN0ZWQgaXQuXG4gKlxuICogVGhpcyBpcyB0aGUgcHVibGljIEFQSSBmb3IgUGhhc2UgNCBldmVudCBoYW5kbGVycyB0aGF0IGNhbGwgY29tbWFuZHMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5Db21tYW5kKFxuICBuYW1lOiBzdHJpbmcsXG4gIGFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICBjdHg6IExFU0NvbnRleHRcbik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCBkZWYgPSBjdHguY29tbWFuZHMuZ2V0KG5hbWUpXG4gIGlmICghZGVmKSB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTXSBVbmtub3duIGNvbW1hbmQ6IFwiJHtuYW1lfVwiYClcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGlmIChkZWYuZ3VhcmQpIHtcbiAgICBpZiAoIWV2YWxHdWFyZChkZWYuZ3VhcmQsIGN0eCkpIHJldHVybiBmYWxzZVxuICB9XG5cbiAgY29uc3Qgc2NvcGUgPSBjdHguc2NvcGUuY2hpbGQoKVxuICBmb3IgKGNvbnN0IGFyZ0RlZiBvZiBkZWYuYXJncykge1xuICAgIHNjb3BlLnNldChhcmdEZWYubmFtZSwgYXJnc1thcmdEZWYubmFtZV0gPz8gbnVsbClcbiAgfVxuXG4gIGF3YWl0IGV4ZWN1dGUoZGVmLmJvZHksIHsgLi4uY3R4LCBzY29wZSB9KVxuICByZXR1cm4gdHJ1ZVxufVxuIiwgImltcG9ydCB0eXBlIHsgTEVTTm9kZSwgRXhwck5vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuLyoqIEEgc2luZ2xlIHR5cGVkIGFyZ3VtZW50IGRlZmluaXRpb24gZnJvbSBhcmdzPVwiW25hbWU6dHlwZSAgLi4uXVwiICovXG5leHBvcnQgaW50ZXJmYWNlIEFyZ0RlZiB7XG4gIG5hbWU6IHN0cmluZ1xuICAvKiogJ25pbCcgfCAnaW50JyB8ICdkZWMnIHwgJ3N0cicgfCAnYXJyJyB8ICdvYmonIHwgJ2Jvb2wnIHwgJ2R5bicgKi9cbiAgdHlwZTogc3RyaW5nXG4gIC8qKiBEZWZhdWx0IHZhbHVlIGV4cHJlc3Npb24sIGlmIHByb3ZpZGVkIChlLmcuIGF0dGVtcHQ6aW50PTApICovXG4gIGRlZmF1bHQ/OiBFeHByTm9kZVxufVxuXG4vKiogQSBmdWxseSBwYXJzZWQgPGxvY2FsLWNvbW1hbmQ+IGRlZmluaXRpb24uICovXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmREZWYge1xuICBuYW1lOiBzdHJpbmdcbiAgYXJnczogQXJnRGVmW11cbiAgLyoqIEd1YXJkIGV4cHJlc3Npb24gc3RyaW5nIFx1MjAxNCBldmFsdWF0ZWQgYmVmb3JlIGV4ZWN1dGlvbi4gRmFsc3kgPSBzaWxlbnQgbm8tb3AuICovXG4gIGd1YXJkPzogc3RyaW5nXG4gIC8qKiBUaGUgcGFyc2VkIGJvZHkgQVNUICovXG4gIGJvZHk6IExFU05vZGVcbiAgLyoqIFRoZSA8bG9jYWwtY29tbWFuZD4gRE9NIGVsZW1lbnQsIGtlcHQgZm9yIGVycm9yIHJlcG9ydGluZyAqL1xuICBlbGVtZW50OiBFbGVtZW50XG59XG5cbmV4cG9ydCBjbGFzcyBDb21tYW5kUmVnaXN0cnkge1xuICBwcml2YXRlIGNvbW1hbmRzID0gbmV3IE1hcDxzdHJpbmcsIENvbW1hbmREZWY+KClcblxuICByZWdpc3RlcihkZWY6IENvbW1hbmREZWYpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5jb21tYW5kcy5oYXMoZGVmLm5hbWUpKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgIGBbTEVTXSBEdXBsaWNhdGUgY29tbWFuZCBcIiR7ZGVmLm5hbWV9XCIgXHUyMDE0IHByZXZpb3VzIGRlZmluaXRpb24gb3ZlcndyaXR0ZW4uYCxcbiAgICAgICAgZGVmLmVsZW1lbnRcbiAgICAgIClcbiAgICB9XG4gICAgdGhpcy5jb21tYW5kcy5zZXQoZGVmLm5hbWUsIGRlZilcbiAgfVxuXG4gIGdldChuYW1lOiBzdHJpbmcpOiBDb21tYW5kRGVmIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kcy5nZXQobmFtZSlcbiAgfVxuXG4gIGhhcyhuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kcy5oYXMobmFtZSlcbiAgfVxuXG4gIG5hbWVzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmNvbW1hbmRzLmtleXMoKSlcbiAgfVxufVxuIiwgIi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gTEVTIE1vZHVsZSBzeXN0ZW1cbi8vXG4vLyBNb2R1bGVzIGV4dGVuZCB0aGUgc2V0IG9mIGFuaW1hdGlvbi9lZmZlY3QgcHJpbWl0aXZlcyBhdmFpbGFibGUgaW5cbi8vIDxsb2NhbC1jb21tYW5kPiBib2RpZXMuIFR3byBraW5kczpcbi8vXG4vLyAgIEJ1aWx0LWluOiAgPHVzZS1tb2R1bGUgdHlwZT1cImFuaW1hdGlvblwiPlxuLy8gICBVc2VybGFuZDogIDx1c2UtbW9kdWxlIHNyYz1cIi4vc2Nyb2xsLWVmZmVjdHMuanNcIj5cbi8vXG4vLyBCb3RoIHJlc29sdmUgdG8gYSBMRVNNb2R1bGUgYXQgcnVudGltZS5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEEgcHJpbWl0aXZlIGlzIGFuIGFzeW5jIG9wZXJhdGlvbiB0aGUgZXhlY3V0b3IgZGlzcGF0Y2hlcyBmb3IgQW5pbWF0aW9uTm9kZS5cbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3IgIENTUyBzZWxlY3RvciBzdHJpbmcgKGFscmVhZHkgcmVzb2x2ZWQgXHUyMDE0IG5vIHZhcmlhYmxlIHN1YnN0aXR1dGlvbiBuZWVkZWQgaGVyZSlcbiAqIEBwYXJhbSBkdXJhdGlvbiAgbWlsbGlzZWNvbmRzXG4gKiBAcGFyYW0gZWFzaW5nICAgIENTUyBlYXNpbmcgc3RyaW5nLCBlLmcuICdlYXNlLW91dCdcbiAqIEBwYXJhbSBvcHRpb25zICAga2V5L3ZhbHVlIG9wdGlvbnMgZnJvbSB0aGUgdHJhaWxpbmcgWy4uLl0gYmxvY2ssIGFscmVhZHkgZXZhbHVhdGVkXG4gKiBAcGFyYW0gaG9zdCAgICAgIHRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBlbGVtZW50ICh1c2VkIGFzIHF1ZXJ5U2VsZWN0b3Igcm9vdClcbiAqL1xuZXhwb3J0IHR5cGUgTEVTUHJpbWl0aXZlID0gKFxuICBzZWxlY3Rvcjogc3RyaW5nLFxuICBkdXJhdGlvbjogbnVtYmVyLFxuICBlYXNpbmc6IHN0cmluZyxcbiAgb3B0aW9uczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIGhvc3Q6IEVsZW1lbnRcbikgPT4gUHJvbWlzZTx2b2lkPlxuXG4vKiogVGhlIHNoYXBlIGEgdXNlcmxhbmQgbW9kdWxlIG11c3QgZXhwb3J0IGFzIGl0cyBkZWZhdWx0IGV4cG9ydC4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTEVTTW9kdWxlIHtcbiAgLyoqIEh1bWFuLXJlYWRhYmxlIG5hbWUgZm9yIGVycm9yIG1lc3NhZ2VzICovXG4gIG5hbWU6IHN0cmluZ1xuICBwcmltaXRpdmVzOiBSZWNvcmQ8c3RyaW5nLCBMRVNQcmltaXRpdmU+XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBSZWdpc3RyeSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZXhwb3J0IGNsYXNzIE1vZHVsZVJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBwcmltaXRpdmVzID0gbmV3IE1hcDxzdHJpbmcsIExFU1ByaW1pdGl2ZT4oKVxuICBwcml2YXRlIGxvYWRlZE1vZHVsZXM6IHN0cmluZ1tdID0gW11cblxuICByZWdpc3Rlcihtb2R1bGU6IExFU01vZHVsZSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgW25hbWUsIGZuXSBvZiBPYmplY3QuZW50cmllcyhtb2R1bGUucHJpbWl0aXZlcykpIHtcbiAgICAgIHRoaXMucHJpbWl0aXZlcy5zZXQobmFtZSwgZm4pXG4gICAgfVxuICAgIHRoaXMubG9hZGVkTW9kdWxlcy5wdXNoKG1vZHVsZS5uYW1lKVxuICAgIGNvbnNvbGUubG9nKGBbTEVTXSBtb2R1bGUgbG9hZGVkOiBcIiR7bW9kdWxlLm5hbWV9XCJgLCBPYmplY3Qua2V5cyhtb2R1bGUucHJpbWl0aXZlcykpXG4gIH1cblxuICBnZXQocHJpbWl0aXZlOiBzdHJpbmcpOiBMRVNQcmltaXRpdmUgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLnByaW1pdGl2ZXMuZ2V0KHByaW1pdGl2ZSlcbiAgfVxuXG4gIGhhcyhwcmltaXRpdmU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnByaW1pdGl2ZXMuaGFzKHByaW1pdGl2ZSlcbiAgfVxuXG4gIC8qKiBEZXYtbW9kZSBoZWxwOiB3aGljaCBtb2R1bGUgZXhwb3J0cyBhIGdpdmVuIHByaW1pdGl2ZT8gKi9cbiAgaGludEZvcihwcmltaXRpdmU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgLy8gV2lsbCBiZSBlbnJpY2hlZCBpbiBQaGFzZSA4IHdpdGggcGVyLW1vZHVsZSBwcmltaXRpdmUgbWFuaWZlc3RzLlxuICAgIHJldHVybiBgUHJpbWl0aXZlIFwiJHtwcmltaXRpdmV9XCIgbm90IGZvdW5kLiBMb2FkZWQgbW9kdWxlczogWyR7dGhpcy5sb2FkZWRNb2R1bGVzLmpvaW4oJywgJyl9XS4gRGlkIHlvdSBmb3JnZXQgPHVzZS1tb2R1bGUgdHlwZT1cImFuaW1hdGlvblwiPj9gXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIExvYWRlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqIEJ1aWx0LWluIG1vZHVsZSByZWdpc3RyeTogdHlwZSBuYW1lIFx1MjE5MiBpbXBvcnQgcGF0aCAqL1xuY29uc3QgQlVJTFRJTl9NT0RVTEVTOiBSZWNvcmQ8c3RyaW5nLCAoKSA9PiBQcm9taXNlPHsgZGVmYXVsdDogTEVTTW9kdWxlIH0+PiA9IHtcbiAgYW5pbWF0aW9uOiAoKSA9PiBpbXBvcnQoJy4vYnVpbHRpbi9hbmltYXRpb24uanMnKSxcbn1cblxuLyoqXG4gKiBSZXNvbHZlIGEgPHVzZS1tb2R1bGU+IGVsZW1lbnQgdG8gYSBMRVNNb2R1bGUgYW5kIHJlZ2lzdGVyIGl0LlxuICogQ2FsbGVkIGR1cmluZyBQaGFzZSAxIERPTSByZWFkaW5nIChQaGFzZSA4IGNvbXBsZXRlcyB0aGUgc3JjPSBwYXRoKS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRNb2R1bGUoXG4gIHJlZ2lzdHJ5OiBNb2R1bGVSZWdpc3RyeSxcbiAgb3B0czogeyB0eXBlPzogc3RyaW5nOyBzcmM/OiBzdHJpbmcgfVxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChvcHRzLnR5cGUpIHtcbiAgICBjb25zdCBsb2FkZXIgPSBCVUlMVElOX01PRFVMRVNbb3B0cy50eXBlXVxuICAgIGlmICghbG9hZGVyKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVNdIFVua25vd24gYnVpbHQtaW4gbW9kdWxlIHR5cGU6IFwiJHtvcHRzLnR5cGV9XCIuIEF2YWlsYWJsZTogJHtPYmplY3Qua2V5cyhCVUlMVElOX01PRFVMRVMpLmpvaW4oJywgJyl9YClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25zdCBtb2QgPSBhd2FpdCBsb2FkZXIoKVxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKG1vZC5kZWZhdWx0KVxuICAgIHJldHVyblxuICB9XG5cbiAgaWYgKG9wdHMuc3JjKSB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIFJlc29sdmUgcmVsYXRpdmUgcGF0aHMgYWdhaW5zdCB0aGUgcGFnZSBVUkwsIG5vdCB0aGUgYnVuZGxlIFVSTC5cbiAgICAgIC8vIFdpdGhvdXQgdGhpcywgJy4vc2Nyb2xsLWVmZmVjdHMuanMnIHJlc29sdmVzIHRvICcvZGlzdC9zY3JvbGwtZWZmZWN0cy5qcydcbiAgICAgIC8vIChyZWxhdGl2ZSB0byB0aGUgYnVuZGxlIGF0IC9kaXN0L2xvY2FsLWV2ZW50LXNjcmlwdC5qcykgaW5zdGVhZCBvZlxuICAgICAgLy8gJy9zY3JvbGwtZWZmZWN0cy5qcycgKHJlbGF0aXZlIHRvIHRoZSBIVE1MIHBhZ2UpLlxuICAgICAgY29uc3QgcmVzb2x2ZWRTcmMgPSBuZXcgVVJMKG9wdHMuc3JjLCBkb2N1bWVudC5iYXNlVVJJKS5ocmVmXG4gICAgICBjb25zdCBtb2QgPSBhd2FpdCBpbXBvcnQoLyogQHZpdGUtaWdub3JlICovIHJlc29sdmVkU3JjKVxuICAgICAgaWYgKCFtb2QuZGVmYXVsdCB8fCB0eXBlb2YgbW9kLmRlZmF1bHQucHJpbWl0aXZlcyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBbTEVTXSBNb2R1bGUgYXQgXCIke29wdHMuc3JjfVwiIGRvZXMgbm90IGV4cG9ydCBhIHZhbGlkIExFU01vZHVsZS4gRXhwZWN0ZWQ6IHsgbmFtZTogc3RyaW5nLCBwcmltaXRpdmVzOiBSZWNvcmQ8c3RyaW5nLCBGdW5jdGlvbj4gfWApXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgcmVnaXN0cnkucmVnaXN0ZXIobW9kLmRlZmF1bHQgYXMgTEVTTW9kdWxlKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihgW0xFU10gRmFpbGVkIHRvIGxvYWQgbW9kdWxlIGZyb20gXCIke29wdHMuc3JjfVwiOmAsIGVycilcbiAgICB9XG4gICAgcmV0dXJuXG4gIH1cblxuICBjb25zb2xlLndhcm4oJ1tMRVNdIDx1c2UtbW9kdWxlPiByZXF1aXJlcyBlaXRoZXIgdHlwZT0gb3Igc3JjPSBhdHRyaWJ1dGUuJylcbn1cbiIsICIvKipcbiAqIFN0cmlwcyB0aGUgYmFja3RpY2sgd3JhcHBlciBmcm9tIGEgbXVsdGktbGluZSBMRVMgYm9keSBzdHJpbmcgYW5kXG4gKiBub3JtYWxpemVzIGluZGVudGF0aW9uLCBwcm9kdWNpbmcgYSBjbGVhbiBzdHJpbmcgdGhlIHBhcnNlciBjYW4gd29yayB3aXRoLlxuICpcbiAqIENvbnZlbnRpb246XG4gKiAgIFNpbmdsZS1saW5lOiAgaGFuZGxlPVwiZW1pdCBmZWVkOmluaXRcIiAgICAgICAgICAgXHUyMTkyIFwiZW1pdCBmZWVkOmluaXRcIlxuICogICBNdWx0aS1saW5lOiAgIGRvPVwiYFxcbiAgICAgIHNldC4uLlxcbiAgICBgXCIgICAgICAgIFx1MjE5MiBcInNldC4uLlxcbi4uLlwiXG4gKlxuICogQWxnb3JpdGhtOlxuICogICAxLiBUcmltIG91dGVyIHdoaXRlc3BhY2UgZnJvbSB0aGUgcmF3IGF0dHJpYnV0ZSB2YWx1ZS5cbiAqICAgMi4gSWYgd3JhcHBlZCBpbiBiYWNrdGlja3MsIHN0cmlwIHRoZW0gXHUyMDE0IGRvIE5PVCBpbm5lci10cmltIHlldC5cbiAqICAgMy4gU3BsaXQgaW50byBsaW5lcyBhbmQgY29tcHV0ZSBtaW5pbXVtIG5vbi16ZXJvIGluZGVudGF0aW9uXG4gKiAgICAgIGFjcm9zcyBhbGwgbm9uLWVtcHR5IGxpbmVzLiBUaGlzIGlzIHRoZSBIVE1MIGF0dHJpYnV0ZSBpbmRlbnRhdGlvblxuICogICAgICBsZXZlbCB0byByZW1vdmUuXG4gKiAgIDQuIFN0cmlwIHRoYXQgbWFueSBsZWFkaW5nIGNoYXJhY3RlcnMgZnJvbSBldmVyeSBsaW5lLlxuICogICA1LiBEcm9wIGxlYWRpbmcvdHJhaWxpbmcgYmxhbmsgbGluZXMsIHJldHVybiBqb2luZWQgcmVzdWx0LlxuICpcbiAqIENydWNpYWxseSwgc3RlcCAyIGRvZXMgTk9UIGNhbGwgLnRyaW0oKSBvbiB0aGUgaW5uZXIgY29udGVudCBiZWZvcmVcbiAqIGNvbXB1dGluZyBpbmRlbnRhdGlvbi4gQW4gaW5uZXIgLnRyaW0oKSB3b3VsZCBkZXN0cm95IHRoZSBsZWFkaW5nXG4gKiB3aGl0ZXNwYWNlIG9uIGxpbmUgMSwgbWFraW5nIG1pbkluZGVudCA9IDAgYW5kIGxlYXZpbmcgYWxsIG90aGVyXG4gKiBsaW5lcyB1bi1kZS1pbmRlbnRlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwQm9keShyYXc6IHN0cmluZyk6IHN0cmluZyB7XG4gIGxldCBzID0gcmF3LnRyaW0oKVxuXG4gIC8vIFN0cmlwIGJhY2t0aWNrIHdyYXBwZXIgXHUyMDE0IGJ1dCBwcmVzZXJ2ZSBpbnRlcm5hbCB3aGl0ZXNwYWNlIGZvciBkZS1pbmRlbnRcbiAgaWYgKHMuc3RhcnRzV2l0aCgnYCcpICYmIHMuZW5kc1dpdGgoJ2AnKSkge1xuICAgIHMgPSBzLnNsaWNlKDEsIC0xKVxuICAgIC8vIERvIE5PVCAudHJpbSgpIGhlcmUgXHUyMDE0IHRoYXQga2lsbHMgdGhlIGxlYWRpbmcgaW5kZW50IG9uIGxpbmUgMVxuICB9XG5cbiAgY29uc3QgbGluZXMgPSBzLnNwbGl0KCdcXG4nKVxuICBjb25zdCBub25FbXB0eSA9IGxpbmVzLmZpbHRlcihsID0+IGwudHJpbSgpLmxlbmd0aCA+IDApXG4gIGlmIChub25FbXB0eS5sZW5ndGggPT09IDApIHJldHVybiAnJ1xuXG4gIC8vIEZvciBzaW5nbGUtbGluZSB2YWx1ZXMgKG5vIG5ld2xpbmVzIGFmdGVyIGJhY2t0aWNrIHN0cmlwKSwganVzdCB0cmltXG4gIGlmIChsaW5lcy5sZW5ndGggPT09IDEpIHJldHVybiBzLnRyaW0oKVxuXG4gIC8vIE1pbmltdW0gbGVhZGluZyB3aGl0ZXNwYWNlIGFjcm9zcyBub24tZW1wdHkgbGluZXNcbiAgY29uc3QgbWluSW5kZW50ID0gbm9uRW1wdHkucmVkdWNlKChtaW4sIGxpbmUpID0+IHtcbiAgICBjb25zdCBsZWFkaW5nID0gbGluZS5tYXRjaCgvXihcXHMqKS8pPy5bMV0/Lmxlbmd0aCA/PyAwXG4gICAgcmV0dXJuIE1hdGgubWluKG1pbiwgbGVhZGluZylcbiAgfSwgSW5maW5pdHkpXG5cbiAgY29uc3Qgc3RyaXBwZWQgPSBtaW5JbmRlbnQgPT09IDAgfHwgbWluSW5kZW50ID09PSBJbmZpbml0eVxuICAgID8gbGluZXNcbiAgICA6IGxpbmVzLm1hcChsaW5lID0+IGxpbmUubGVuZ3RoID49IG1pbkluZGVudCA/IGxpbmUuc2xpY2UobWluSW5kZW50KSA6IGxpbmUudHJpbVN0YXJ0KCkpXG5cbiAgLy8gRHJvcCBsZWFkaW5nIGFuZCB0cmFpbGluZyBibGFuayBsaW5lcyAodGhlIG5ld2xpbmVzIGFyb3VuZCBiYWNrdGljayBjb250ZW50KVxuICBsZXQgc3RhcnQgPSAwXG4gIGxldCBlbmQgPSBzdHJpcHBlZC5sZW5ndGggLSAxXG4gIHdoaWxlIChzdGFydCA8PSBlbmQgJiYgc3RyaXBwZWRbc3RhcnRdPy50cmltKCkgPT09ICcnKSBzdGFydCsrXG4gIHdoaWxlIChlbmQgPj0gc3RhcnQgJiYgc3RyaXBwZWRbZW5kXT8udHJpbSgpID09PSAnJykgZW5kLS1cblxuICByZXR1cm4gc3RyaXBwZWQuc2xpY2Uoc3RhcnQsIGVuZCArIDEpLmpvaW4oJ1xcbicpXG59XG4iLCAiaW1wb3J0IHR5cGUge1xuICBMRVNDb25maWcsXG4gIE1vZHVsZURlY2wsXG4gIENvbW1hbmREZWNsLFxuICBFdmVudEhhbmRsZXJEZWNsLFxuICBTaWduYWxXYXRjaGVyRGVjbCxcbiAgT25Mb2FkRGVjbCxcbiAgT25FbnRlckRlY2wsXG4gIE9uRXhpdERlY2wsXG59IGZyb20gJy4vY29uZmlnLmpzJ1xuaW1wb3J0IHsgc3RyaXBCb2R5IH0gZnJvbSAnLi9zdHJpcEJvZHkuanMnXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gVGFnIG5hbWUgXHUyMTkyIGhhbmRsZXIgbWFwXG4vLyBFYWNoIGhhbmRsZXIgcmVhZHMgYXR0cmlidXRlcyBmcm9tIGEgY2hpbGQgZWxlbWVudCBhbmQgcHVzaGVzIGEgdHlwZWQgZGVjbFxuLy8gaW50byB0aGUgY29uZmlnIGJlaW5nIGJ1aWx0LiBVbmtub3duIHRhZ3MgYXJlIGNvbGxlY3RlZCBmb3Igd2FybmluZy5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG50eXBlIEhhbmRsZXIgPSAoZWw6IEVsZW1lbnQsIGNvbmZpZzogTEVTQ29uZmlnKSA9PiB2b2lkXG5cbmNvbnN0IEhBTkRMRVJTOiBSZWNvcmQ8c3RyaW5nLCBIYW5kbGVyPiA9IHtcblxuICAndXNlLW1vZHVsZScoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IHR5cGUgPSBlbC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKT8udHJpbSgpID8/IG51bGxcbiAgICBjb25zdCBzcmMgID0gZWwuZ2V0QXR0cmlidXRlKCdzcmMnKT8udHJpbSgpICA/PyBudWxsXG5cbiAgICBpZiAoIXR5cGUgJiYgIXNyYykge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8dXNlLW1vZHVsZT4gaGFzIG5laXRoZXIgdHlwZT0gbm9yIHNyYz0gXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25maWcubW9kdWxlcy5wdXNoKHsgdHlwZSwgc3JjLCBlbGVtZW50OiBlbCB9KVxuICB9LFxuXG4gICdsb2NhbC1jb21tYW5kJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgbmFtZSA9IGVsLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgPz8gJydcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdkbycpPy50cmltKCkgICA/PyAnJ1xuXG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDxsb2NhbC1jb21tYW5kPiBtaXNzaW5nIHJlcXVpcmVkIG5hbWU9IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBpZiAoIWJvZHkpIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFU10gPGxvY2FsLWNvbW1hbmQgbmFtZT1cIiR7bmFtZX1cIj4gbWlzc2luZyByZXF1aXJlZCBkbz0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLmAsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uZmlnLmNvbW1hbmRzLnB1c2goe1xuICAgICAgbmFtZSxcbiAgICAgIGFyZ3NSYXc6IGVsLmdldEF0dHJpYnV0ZSgnYXJncycpPy50cmltKCkgID8/ICcnLFxuICAgICAgZ3VhcmQ6ICAgZWwuZ2V0QXR0cmlidXRlKCdndWFyZCcpPy50cmltKCkgPz8gbnVsbCxcbiAgICAgIGJvZHk6ICAgIHN0cmlwQm9keShib2R5KSxcbiAgICAgIGVsZW1lbnQ6IGVsLFxuICAgIH0pXG4gIH0sXG5cbiAgJ29uLWV2ZW50JyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgbmFtZSA9IGVsLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgICA/PyAnJ1xuICAgIGNvbnN0IGJvZHkgPSBlbC5nZXRBdHRyaWJ1dGUoJ2hhbmRsZScpPy50cmltKCkgPz8gJydcblxuICAgIGlmICghbmFtZSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tZXZlbnQ+IG1pc3NpbmcgcmVxdWlyZWQgbmFtZT0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTXSA8b24tZXZlbnQgbmFtZT1cIiR7bmFtZX1cIj4gbWlzc2luZyByZXF1aXJlZCBoYW5kbGU9IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC5gLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbmZpZy5vbkV2ZW50LnB1c2goeyBuYW1lLCBib2R5OiBzdHJpcEJvZHkoYm9keSksIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG5cbiAgJ29uLXNpZ25hbCcoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IG5hbWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpICAgPz8gJydcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdoYW5kbGUnKT8udHJpbSgpID8/ICcnXG5cbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPG9uLXNpZ25hbD4gbWlzc2luZyByZXF1aXJlZCBuYW1lPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVNdIDxvbi1zaWduYWwgbmFtZT1cIiR7bmFtZX1cIj4gbWlzc2luZyByZXF1aXJlZCBoYW5kbGU9IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC5gLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbmZpZy5vblNpZ25hbC5wdXNoKHtcbiAgICAgIG5hbWUsXG4gICAgICB3aGVuOiAgICBlbC5nZXRBdHRyaWJ1dGUoJ3doZW4nKT8udHJpbSgpID8/IG51bGwsXG4gICAgICBib2R5OiAgICBzdHJpcEJvZHkoYm9keSksXG4gICAgICBlbGVtZW50OiBlbCxcbiAgICB9KVxuICB9LFxuXG4gICdvbi1sb2FkJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tbG9hZD4gbWlzc2luZyByZXF1aXJlZCBydW49IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25maWcub25Mb2FkLnB1c2goeyBib2R5OiBzdHJpcEJvZHkoYm9keSksIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG5cbiAgJ29uLWVudGVyJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tZW50ZXI+IG1pc3NpbmcgcmVxdWlyZWQgcnVuPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uZmlnLm9uRW50ZXIucHVzaCh7XG4gICAgICB3aGVuOiAgICBlbC5nZXRBdHRyaWJ1dGUoJ3doZW4nKT8udHJpbSgpID8/IG51bGwsXG4gICAgICBib2R5OiAgICBzdHJpcEJvZHkoYm9keSksXG4gICAgICBlbGVtZW50OiBlbCxcbiAgICB9KVxuICB9LFxuXG4gICdvbi1leGl0JyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tZXhpdD4gbWlzc2luZyByZXF1aXJlZCBydW49IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25maWcub25FeGl0LnB1c2goeyBib2R5OiBzdHJpcEJvZHkoYm9keSksIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gcmVhZENvbmZpZyBcdTIwMTQgdGhlIHB1YmxpYyBlbnRyeSBwb2ludFxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogV2Fsa3MgdGhlIGRpcmVjdCBjaGlsZHJlbiBvZiBhIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGVsZW1lbnQgYW5kXG4gKiBwcm9kdWNlcyBhIHN0cnVjdHVyZWQgTEVTQ29uZmlnLlxuICpcbiAqIE9ubHkgZGlyZWN0IGNoaWxkcmVuIGFyZSByZWFkIFx1MjAxNCBuZXN0ZWQgZWxlbWVudHMgaW5zaWRlIGEgPGxvY2FsLWNvbW1hbmQ+XG4gKiBib2R5IGFyZSBub3QgY2hpbGRyZW4gb2YgdGhlIGhvc3QgYW5kIGFyZSBuZXZlciB2aXNpdGVkIGhlcmUuXG4gKlxuICogVW5rbm93biBjaGlsZCBlbGVtZW50cyBlbWl0IGEgY29uc29sZS53YXJuIGFuZCBhcmUgY29sbGVjdGVkIGluIGNvbmZpZy51bmtub3duXG4gKiBzbyB0b29saW5nIChlLmcuIGEgZnV0dXJlIExFUyBsYW5ndWFnZSBzZXJ2ZXIpIGNhbiByZXBvcnQgdGhlbS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRDb25maWcoaG9zdDogRWxlbWVudCk6IExFU0NvbmZpZyB7XG4gIGNvbnN0IGNvbmZpZzogTEVTQ29uZmlnID0ge1xuICAgIGlkOiAgICAgICBob3N0LmlkIHx8ICcobm8gaWQpJyxcbiAgICBtb2R1bGVzOiAgW10sXG4gICAgY29tbWFuZHM6IFtdLFxuICAgIG9uRXZlbnQ6ICBbXSxcbiAgICBvblNpZ25hbDogW10sXG4gICAgb25Mb2FkOiAgIFtdLFxuICAgIG9uRW50ZXI6ICBbXSxcbiAgICBvbkV4aXQ6ICAgW10sXG4gICAgdW5rbm93bjogIFtdLFxuICB9XG5cbiAgZm9yIChjb25zdCBjaGlsZCBvZiBBcnJheS5mcm9tKGhvc3QuY2hpbGRyZW4pKSB7XG4gICAgY29uc3QgdGFnID0gY2hpbGQudGFnTmFtZS50b0xvd2VyQ2FzZSgpXG4gICAgY29uc3QgaGFuZGxlciA9IEhBTkRMRVJTW3RhZ11cblxuICAgIGlmIChoYW5kbGVyKSB7XG4gICAgICBoYW5kbGVyKGNoaWxkLCBjb25maWcpXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbmZpZy51bmtub3duLnB1c2goY2hpbGQpXG4gICAgICAvLyBPbmx5IHdhcm4gZm9yIGh5cGhlbmF0ZWQgY3VzdG9tIGVsZW1lbnQgbmFtZXMgXHUyMDE0IHRob3NlIGFyZSBsaWtlbHlcbiAgICAgIC8vIG1pcy10eXBlZCBMRVMga2V5d29yZHMuIFBsYWluIEhUTUwgZWxlbWVudHMgKGRpdiwgcCwgc2VjdGlvbiwgZXRjLilcbiAgICAgIC8vIGFyZSB2YWxpZCBjb250ZW50IGNoaWxkcmVuIGFuZCBwYXNzIHRocm91Z2ggc2lsZW50bHkuXG4gICAgICBpZiAodGFnLmluY2x1ZGVzKCctJykpIHtcbiAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgIGBbTEVTXSBVbmtub3duIGNoaWxkIGVsZW1lbnQgPCR7dGFnfT4gaW5zaWRlIDxsb2NhbC1ldmVudC1zY3JpcHQgaWQ9XCIke2NvbmZpZy5pZH1cIj4gXHUyMDE0IGlnbm9yZWQuIERpZCB5b3UgbWVhbiBhIExFUyBlbGVtZW50P2AsXG4gICAgICAgICAgY2hpbGRcbiAgICAgICAgKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjb25maWdcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBsb2dDb25maWcgXHUyMDE0IHN0cnVjdHVyZWQgY2hlY2twb2ludCBsb2dcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIExvZ3MgYSBzdW1tYXJ5IG9mIGEgcGFyc2VkIExFU0NvbmZpZy5cbiAqIFBoYXNlIDEgY2hlY2twb2ludDogeW91IHNob3VsZCBzZWUgdGhpcyBpbiB0aGUgYnJvd3NlciBjb25zb2xlL2RlYnVnIGxvZ1xuICogd2l0aCBhbGwgY29tbWFuZHMsIGV2ZW50cywgYW5kIHNpZ25hbCB3YXRjaGVycyBjb3JyZWN0bHkgbGlzdGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9nQ29uZmlnKGNvbmZpZzogTEVTQ29uZmlnKTogdm9pZCB7XG4gIGNvbnN0IGlkID0gY29uZmlnLmlkXG4gIGNvbnNvbGUubG9nKGBbTEVTXSBjb25maWcgcmVhZCBmb3IgIyR7aWR9YClcbiAgY29uc29sZS5sb2coYFtMRVNdICAgbW9kdWxlczogICAke2NvbmZpZy5tb2R1bGVzLmxlbmd0aH1gLCBjb25maWcubW9kdWxlcy5tYXAobSA9PiBtLnR5cGUgPz8gbS5zcmMpKVxuICBjb25zb2xlLmxvZyhgW0xFU10gICBjb21tYW5kczogICR7Y29uZmlnLmNvbW1hbmRzLmxlbmd0aH1gLCBjb25maWcuY29tbWFuZHMubWFwKGMgPT4gYy5uYW1lKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tZXZlbnQ6ICAke2NvbmZpZy5vbkV2ZW50Lmxlbmd0aH1gLCBjb25maWcub25FdmVudC5tYXAoZSA9PiBlLm5hbWUpKVxuICBjb25zb2xlLmxvZyhgW0xFU10gICBvbi1zaWduYWw6ICR7Y29uZmlnLm9uU2lnbmFsLmxlbmd0aH1gLCBjb25maWcub25TaWduYWwubWFwKHMgPT4gcy5uYW1lKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tbG9hZDogICAke2NvbmZpZy5vbkxvYWQubGVuZ3RofWApXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG9uLWVudGVyOiAgJHtjb25maWcub25FbnRlci5sZW5ndGh9YCwgY29uZmlnLm9uRW50ZXIubWFwKGUgPT4gZS53aGVuID8/ICdhbHdheXMnKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tZXhpdDogICAke2NvbmZpZy5vbkV4aXQubGVuZ3RofWApXG5cbiAgY29uc3QgdW5rbm93bkN1c3RvbSA9IGNvbmZpZy51bmtub3duLmZpbHRlcihlID0+IGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCctJykpXG4gIGlmICh1bmtub3duQ3VzdG9tLmxlbmd0aCA+IDApIHtcbiAgICBjb25zb2xlLndhcm4oYFtMRVNdICAgdW5rbm93biBjdXN0b20gY2hpbGRyZW46ICR7dW5rbm93bkN1c3RvbS5sZW5ndGh9YCwgdW5rbm93bkN1c3RvbS5tYXAoZSA9PiBlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSkpXG4gIH1cblxuICAvLyBMb2cgYSBzYW1wbGluZyBvZiBib2R5IHN0cmluZ3MgdG8gdmVyaWZ5IHN0cmlwQm9keSB3b3JrZWQgY29ycmVjdGx5XG4gIGlmIChjb25maWcuY29tbWFuZHMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGZpcnN0ID0gY29uZmlnLmNvbW1hbmRzWzBdXG4gICAgaWYgKGZpcnN0KSB7XG4gICAgICBjb25zb2xlLmxvZyhgW0xFU10gICBmaXJzdCBjb21tYW5kIGJvZHkgcHJldmlldyAoXCIke2ZpcnN0Lm5hbWV9XCIpOmApXG4gICAgICBjb25zdCBwcmV2aWV3ID0gZmlyc3QuYm9keS5zcGxpdCgnXFxuJykuc2xpY2UoMCwgNCkuam9pbignXFxuICAnKVxuICAgICAgY29uc29sZS5sb2coYFtMRVNdICAgfCAke3ByZXZpZXd9YClcbiAgICB9XG4gIH1cbn1cbiIsICIvLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIExFUyBUb2tlbml6ZXJcbi8vXG4vLyBDb252ZXJ0cyBhIHN0cmlwQm9keSdkIHNvdXJjZSBzdHJpbmcgaW50byBhIGZsYXQgYXJyYXkgb2YgVG9rZW4gb2JqZWN0cy5cbi8vIFRva2VucyBhcmUgc2ltcGx5IG5vbi1ibGFuayBsaW5lcyB3aXRoIHRoZWlyIGluZGVudCBsZXZlbCByZWNvcmRlZC5cbi8vIE5vIHNlbWFudGljIGFuYWx5c2lzIGhhcHBlbnMgaGVyZSBcdTIwMTQgdGhhdCdzIHRoZSBwYXJzZXIncyBqb2IuXG4vL1xuLy8gVGhlIHRva2VuaXplciBpcyBkZWxpYmVyYXRlbHkgbWluaW1hbDogaXQgcHJlc2VydmVzIHRoZSByYXcgaW5kZW50YXRpb25cbi8vIGluZm9ybWF0aW9uIHRoZSBwYXJzZXIgbmVlZHMgdG8gdW5kZXJzdGFuZCBibG9jayBzdHJ1Y3R1cmUuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZXhwb3J0IGludGVyZmFjZSBUb2tlbiB7XG4gIC8qKiBDb2x1bW4gb2Zmc2V0IG9mIHRoZSBmaXJzdCBub24td2hpdGVzcGFjZSBjaGFyYWN0ZXIgKG51bWJlciBvZiBzcGFjZXMpICovXG4gIGluZGVudDogbnVtYmVyXG4gIC8qKiBUcmltbWVkIGxpbmUgY29udGVudCBcdTIwMTQgbm8gbGVhZGluZy90cmFpbGluZyB3aGl0ZXNwYWNlICovXG4gIHRleHQ6IHN0cmluZ1xuICAvKiogMS1iYXNlZCBsaW5lIG51bWJlciBpbiB0aGUgc3RyaXBwZWQgc291cmNlIChmb3IgZXJyb3IgbWVzc2FnZXMpICovXG4gIGxpbmVOdW06IG51bWJlclxufVxuXG4vKipcbiAqIENvbnZlcnRzIGEgc3RyaXBwZWQgTEVTIGJvZHkgc3RyaW5nIGludG8gYSBUb2tlbiBhcnJheS5cbiAqIEJsYW5rIGxpbmVzIGFyZSBkcm9wcGVkLiBUYWJzIGFyZSBleHBhbmRlZCB0byAyIHNwYWNlcyBlYWNoLlxuICpcbiAqIEBwYXJhbSBzb3VyY2UgIEEgc3RyaW5nIGFscmVhZHkgcHJvY2Vzc2VkIGJ5IHN0cmlwQm9keSgpIFx1MjAxNCBubyBiYWNrdGljayB3cmFwcGVycy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRva2VuaXplKHNvdXJjZTogc3RyaW5nKTogVG9rZW5bXSB7XG4gIGNvbnN0IHRva2VuczogVG9rZW5bXSA9IFtdXG4gIGNvbnN0IGxpbmVzID0gc291cmNlLnNwbGl0KCdcXG4nKVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCByYXcgPSAobGluZXNbaV0gPz8gJycpLnJlcGxhY2UoL1xcdC9nLCAnICAnKVxuICAgIGNvbnN0IHRleHQgPSByYXcudHJpbSgpXG5cbiAgICAvLyBTa2lwIGJsYW5rIGxpbmVzXG4gICAgaWYgKHRleHQubGVuZ3RoID09PSAwKSBjb250aW51ZVxuXG4gICAgY29uc3QgaW5kZW50ID0gcmF3Lmxlbmd0aCAtIHJhdy50cmltU3RhcnQoKS5sZW5ndGhcblxuICAgIHRva2Vucy5wdXNoKHtcbiAgICAgIGluZGVudCxcbiAgICAgIHRleHQsXG4gICAgICBsaW5lTnVtOiBpICsgMSxcbiAgICB9KVxuICB9XG5cbiAgcmV0dXJuIHRva2Vuc1xufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEhlbHBlcnMgdXNlZCBieSBib3RoIHRoZSB0b2tlbml6ZXIgdGVzdHMgYW5kIHRoZSBwYXJzZXJcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBgdGV4dGAgZW5kcyB3aXRoIGEgc3RhbmRhbG9uZSBgYW5kYCB3b3JkLlxuICogVXNlZCBieSB0aGUgcGFyc2VyIHRvIGRldGVjdCBwYXJhbGxlbCBicmFuY2hlcy5cbiAqXG4gKiBDYXJlZnVsOiBcImVuZ2xhbmRcIiwgXCJiYW5kXCIsIFwiY29tbWFuZFwiIG11c3QgTk9UIG1hdGNoLlxuICogV2UgcmVxdWlyZSBhIHdvcmQgYm91bmRhcnkgYmVmb3JlIGBhbmRgIGFuZCBlbmQtb2Ytc3RyaW5nIGFmdGVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5kc1dpdGhBbmQodGV4dDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiAvXFxiYW5kJC8udGVzdCh0ZXh0KVxufVxuXG4vKipcbiAqIFN0cmlwcyB0aGUgdHJhaWxpbmcgYCBhbmRgIGZyb20gYSBsaW5lIHRoYXQgZW5kc1dpdGhBbmQuXG4gKiBSZXR1cm5zIHRoZSB0cmltbWVkIGxpbmUgY29udGVudCB3aXRob3V0IGl0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RyaXBUcmFpbGluZ0FuZCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdGV4dC5yZXBsYWNlKC9cXHMrYW5kJC8sICcnKS50cmltRW5kKClcbn1cblxuLyoqXG4gKiBCbG9jayB0ZXJtaW5hdG9yIHRva2VucyBcdTIwMTQgc2lnbmFsIHRoZSBlbmQgb2YgYSBtYXRjaCBvciB0cnkgYmxvY2suXG4gKiBUaGVzZSBhcmUgY29uc3VtZWQgYnkgdGhlIGJsb2NrLW93bmluZyBwYXJzZXIgKHBhcnNlTWF0Y2ggLyBwYXJzZVRyeSksXG4gKiBub3QgYnkgcGFyc2VCbG9jayBpdHNlbGYuXG4gKi9cbmV4cG9ydCBjb25zdCBCTE9DS19URVJNSU5BVE9SUyA9IG5ldyBTZXQoWycvbWF0Y2gnLCAnL3RyeSddKVxuXG4vKipcbiAqIEtleXdvcmRzIHRoYXQgZW5kIGEgdHJ5IGJvZHkgYW5kIHN0YXJ0IGEgcmVzY3VlL2FmdGVyd2FyZHMgY2xhdXNlLlxuICogUmVjb2duaXplZCBvbmx5IHdoZW4gdGhleSBhcHBlYXIgYXQgdGhlIHNhbWUgaW5kZW50IGxldmVsIGFzIHRoZSBgdHJ5YC5cbiAqL1xuZXhwb3J0IGNvbnN0IFRSWV9DTEFVU0VfS0VZV09SRFMgPSBuZXcgU2V0KFsncmVzY3VlJywgJ2FmdGVyd2FyZHMnXSlcbiIsICJpbXBvcnQgdHlwZSB7XG4gIExFU05vZGUsIEV4cHJOb2RlLCBTZXF1ZW5jZU5vZGUsIFBhcmFsbGVsTm9kZSxcbiAgU2V0Tm9kZSwgRW1pdE5vZGUsIEJyb2FkY2FzdE5vZGUsIFdhaXROb2RlLCBDYWxsTm9kZSxcbiAgQmluZE5vZGUsIEFjdGlvbk5vZGUsIE1hdGNoTm9kZSwgTWF0Y2hBcm0sIFBhdHRlcm5Ob2RlLFxuICBUcnlOb2RlLCBBbmltYXRpb25Ob2RlLFxufSBmcm9tICcuL2FzdC5qcydcbmltcG9ydCB0eXBlIHsgVG9rZW4gfSBmcm9tICcuL3Rva2VuaXplci5qcydcbmltcG9ydCB7XG4gIGVuZHNXaXRoQW5kLCBzdHJpcFRyYWlsaW5nQW5kLFxuICBCTE9DS19URVJNSU5BVE9SUywgVFJZX0NMQVVTRV9LRVlXT1JEUyxcbn0gZnJvbSAnLi90b2tlbml6ZXIuanMnXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gS25vd24gYW5pbWF0aW9uIHByaW1pdGl2ZSBuYW1lcyAocmVnaXN0ZXJlZCBieSB0aGUgYW5pbWF0aW9uIG1vZHVsZSlcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5jb25zdCBBTklNQVRJT05fUFJJTUlUSVZFUyA9IG5ldyBTZXQoW1xuICAnZmFkZS1pbicsICdmYWRlLW91dCcsICdzbGlkZS1pbicsICdzbGlkZS1vdXQnLFxuICAnc2xpZGUtdXAnLCAnc2xpZGUtZG93bicsICdwdWxzZScsXG4gICdzdGFnZ2VyLWVudGVyJywgJ3N0YWdnZXItZXhpdCcsXG4gICdzaGFrZScsXG5dKVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFBhcnNlclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBjbGFzcyBMRVNQYXJzZXIge1xuICBwcml2YXRlIHBvcyA9IDBcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHRva2VuczogVG9rZW5bXSkge31cblxuICBwcml2YXRlIHBlZWsob2Zmc2V0ID0gMCk6IFRva2VuIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy50b2tlbnNbdGhpcy5wb3MgKyBvZmZzZXRdXG4gIH1cblxuICBwcml2YXRlIGFkdmFuY2UoKTogVG9rZW4ge1xuICAgIGNvbnN0IHQgPSB0aGlzLnRva2Vuc1t0aGlzLnBvc11cbiAgICBpZiAoIXQpIHRocm93IG5ldyBMRVNQYXJzZUVycm9yKCdVbmV4cGVjdGVkIGVuZCBvZiBpbnB1dCcsIHVuZGVmaW5lZClcbiAgICB0aGlzLnBvcysrXG4gICAgcmV0dXJuIHRcbiAgfVxuXG4gIHByaXZhdGUgYXRFbmQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMucG9zID49IHRoaXMudG9rZW5zLmxlbmd0aFxuICB9XG5cbiAgcHJpdmF0ZSB0cnlDb25zdW1lKHRleHQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHQgPSB0aGlzLnBlZWsoKVxuICAgIGlmICh0Py50ZXh0ID09PSB0ZXh0KSB7IHRoaXMucG9zKys7IHJldHVybiB0cnVlIH1cbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBFbnRyeSBwb2ludCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwYXJzZSgpOiBMRVNOb2RlIHtcbiAgICBjb25zdCBub2RlID0gdGhpcy5wYXJzZUJsb2NrKC0xKVxuICAgIHJldHVybiBub2RlXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgQmxvY2sgcGFyc2VyIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIC8qKlxuICAgKiBQYXJzZXMgYWxsIHN0YXRlbWVudHMgYXQgaW5kZW50ID4gYmFzZUluZGVudC5cbiAgICpcbiAgICogU3RvcHMgd2hlbiBpdCBlbmNvdW50ZXJzOlxuICAgKiAgIC0gQSB0b2tlbiB3aXRoIGluZGVudCA8PSBiYXNlSW5kZW50XG4gICAqICAgLSBBIGJsb2NrIHRlcm1pbmF0b3IgKC9tYXRjaCwgL3RyeSkgXHUyMDE0IGxlZnQgZm9yIHRoZSBwYXJlbnQgdG8gY29uc3VtZVxuICAgKiAgIC0gQSB0cnktY2xhdXNlIGtleXdvcmQgKHJlc2N1ZSwgYWZ0ZXJ3YXJkcykgYXQgaW5kZW50IDw9IGJhc2VJbmRlbnRcbiAgICogICAtIEVuZCBvZiB0b2tlbiBzdHJlYW1cbiAgICpcbiAgICogUmV0dXJucyBhIFNlcXVlbmNlTm9kZSBpZiBtdWx0aXBsZSBzdGVwcywgb3RoZXJ3aXNlIHRoZSBzaW5nbGUgbm9kZS5cbiAgICovXG4gIHByaXZhdGUgcGFyc2VCbG9jayhiYXNlSW5kZW50OiBudW1iZXIpOiBMRVNOb2RlIHtcbiAgICBjb25zdCBzdGVwczogTEVTTm9kZVtdID0gW11cblxuICAgIHdoaWxlICghdGhpcy5hdEVuZCgpKSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy5wZWVrKCkhXG5cbiAgICAgIC8vIFN0b3A6IHdlJ3ZlIHJldHVybmVkIHRvIG9yIHBhc3QgdGhlIHBhcmVudCBibG9jaydzIGluZGVudFxuICAgICAgaWYgKHQuaW5kZW50IDw9IGJhc2VJbmRlbnQpIGJyZWFrXG5cbiAgICAgIC8vIFN0b3A6IGJsb2NrIHRlcm1pbmF0b3JzIGFyZSBjb25zdW1lZCBieSB0aGUgYmxvY2sgb3BlbmVyIChtYXRjaC90cnkpXG4gICAgICBpZiAoQkxPQ0tfVEVSTUlOQVRPUlMuaGFzKHQudGV4dCkpIGJyZWFrXG5cbiAgICAgIC8vIFN0b3A6IHRyeS1jbGF1c2Uga2V5d29yZHMgZW5kIHRoZSBjdXJyZW50IHRyeSBib2R5XG4gICAgICBpZiAoVFJZX0NMQVVTRV9LRVlXT1JEUy5oYXModC50ZXh0KSAmJiB0LmluZGVudCA8PSBiYXNlSW5kZW50ICsgMikgYnJlYWtcblxuICAgICAgLy8gXHUyNTAwXHUyNTAwIFNlcXVlbnRpYWwgY29ubmVjdGl2ZTogc3RhbmRhbG9uZSBgdGhlbmAgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgICAvLyBgdGhlbmAgYWxvbmUgb24gYSBsaW5lIGludHJvZHVjZXMgdGhlIG5leHQgc2VxdWVudGlhbCBzdGVwLFxuICAgICAgLy8gd2hpY2ggaXMgYSBibG9jayBhdCBhIGRlZXBlciBpbmRlbnQgbGV2ZWwuXG4gICAgICBpZiAodC50ZXh0ID09PSAndGhlbicpIHtcbiAgICAgICAgY29uc3QgdGhlbkluZGVudCA9IHQuaW5kZW50XG4gICAgICAgIHRoaXMuYWR2YW5jZSgpIC8vIGNvbnN1bWUgYHRoZW5gXG4gICAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnBlZWsoKVxuICAgICAgICBpZiAobmV4dCAmJiBuZXh0LmluZGVudCA+IHRoZW5JbmRlbnQpIHtcbiAgICAgICAgICBjb25zdCBzdGVwID0gdGhpcy5wYXJzZUJsb2NrKHRoZW5JbmRlbnQpXG4gICAgICAgICAgc3RlcHMucHVzaChzdGVwKVxuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIFx1MjUwMFx1MjUwMCBTZXF1ZW50aWFsIGNvbm5lY3RpdmU6IGB0aGVuIFhgIGFzIHByZWZpeCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICAgIC8vIGB0aGVuIGNhbGwgZm9vYCwgYHRoZW4gZW1pdCBiYXJgLCBldGMuXG4gICAgICAvLyBUaGUgYHRoZW5gIGlzIGp1c3QgYSB2aXN1YWwgc2VxdWVuY2VyIFx1MjAxNCB0aGUgcmVzdCBvZiB0aGUgbGluZSBpcyB0aGUgc3RlcC5cbiAgICAgIGlmICh0LnRleHQuc3RhcnRzV2l0aCgndGhlbiAnKSkge1xuICAgICAgICB0aGlzLmFkdmFuY2UoKVxuICAgICAgICBjb25zdCByZXN0ID0gdC50ZXh0LnNsaWNlKDUpLnRyaW0oKVxuICAgICAgICBjb25zdCBzdGVwID0gdGhpcy5wYXJzZVNpbmdsZUxpbmUocmVzdCwgdC5pbmRlbnQsIHQpXG4gICAgICAgIHN0ZXBzLnB1c2goc3RlcClcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gXHUyNTAwXHUyNTAwIFJlZ3VsYXIgc3RhdGVtZW50IChwb3NzaWJseSBhIHBhcmFsbGVsIGdyb3VwKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICAgIGNvbnN0IHN0bXQgPSB0aGlzLnBhcnNlU3RhdGVtZW50T3JQYXJhbGxlbCh0LmluZGVudClcbiAgICAgIHN0ZXBzLnB1c2goc3RtdClcbiAgICB9XG5cbiAgICByZXR1cm4gdG9TZXF1ZW5jZU9yU2luZ2xlKHN0ZXBzKVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFBhcmFsbGVsIGdyb3VwIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIC8qKlxuICAgKiBQYXJzZXMgb25lIHN0YXRlbWVudCBvciBhIGdyb3VwIG9mIHBhcmFsbGVsIHN0YXRlbWVudHMgY29ubmVjdGVkIGJ5IGBhbmRgLlxuICAgKlxuICAgKiBMaW5lcyBlbmRpbmcgd2l0aCBhIHN0YW5kYWxvbmUgYGFuZGAgaW5kaWNhdGUgdGhhdCB0aGUgbmV4dCBsaW5lIHJ1bnNcbiAgICogY29uY3VycmVudGx5LiBBbGwgcGFyYWxsZWwgYnJhbmNoZXMgYXJlIHdyYXBwZWQgaW4gYSBQYXJhbGxlbE5vZGUuXG4gICAqXG4gICAqIGBhbmRgLWdyb3VwcyBvbmx5IGFwcGx5IHdpdGhpbiB0aGUgc2FtZSBpbmRlbnQgbGV2ZWwuIEEgZGVlcGVyLWluZGVudGVkXG4gICAqIGxpbmUgYWZ0ZXIgYGFuZGAgaXMgYW4gZXJyb3IgKHdvdWxkIGluZGljYXRlIGEgYmxvY2ssIGJ1dCBgYW5kYCBpc1xuICAgKiBhIGxpbmUtbGV2ZWwgY29ubmVjdG9yLCBub3QgYSBibG9jayBvcGVuZXIpLlxuICAgKi9cbiAgcHJpdmF0ZSBwYXJzZVN0YXRlbWVudE9yUGFyYWxsZWwoYmxvY2tJbmRlbnQ6IG51bWJlcik6IExFU05vZGUge1xuICAgIGNvbnN0IGJyYW5jaGVzOiBMRVNOb2RlW10gPSBbXVxuXG4gICAgd2hpbGUgKCF0aGlzLmF0RW5kKCkpIHtcbiAgICAgIGNvbnN0IHQgPSB0aGlzLnBlZWsoKSFcblxuICAgICAgLy8gU3RvcCBjb25kaXRpb25zIFx1MjAxNCBzYW1lIGFzIHBhcnNlQmxvY2snc1xuICAgICAgaWYgKHQuaW5kZW50IDwgYmxvY2tJbmRlbnQpIGJyZWFrXG4gICAgICBpZiAodC5pbmRlbnQgPiBibG9ja0luZGVudCkgYnJlYWsgICAvLyBzaG91bGRuJ3QgaGFwcGVuIGhlcmUsIHNhZmV0eSBndWFyZFxuICAgICAgaWYgKEJMT0NLX1RFUk1JTkFUT1JTLmhhcyh0LnRleHQpKSBicmVha1xuICAgICAgaWYgKFRSWV9DTEFVU0VfS0VZV09SRFMuaGFzKHQudGV4dCkpIGJyZWFrXG4gICAgICBpZiAodC50ZXh0ID09PSAndGhlbicgfHwgdC50ZXh0LnN0YXJ0c1dpdGgoJ3RoZW4gJykpIGJyZWFrXG5cbiAgICAgIGNvbnN0IGhhc0FuZCA9IGVuZHNXaXRoQW5kKHQudGV4dClcbiAgICAgIGNvbnN0IGxpbmVUZXh0ID0gaGFzQW5kID8gc3RyaXBUcmFpbGluZ0FuZCh0LnRleHQpIDogdC50ZXh0XG5cbiAgICAgIHRoaXMuYWR2YW5jZSgpXG5cbiAgICAgIGNvbnN0IHN0bXQgPSB0aGlzLnBhcnNlU2luZ2xlTGluZShsaW5lVGV4dCwgdC5pbmRlbnQsIHQpXG4gICAgICBicmFuY2hlcy5wdXNoKHN0bXQpXG5cbiAgICAgIGlmICghaGFzQW5kKSBicmVha1xuICAgIH1cblxuICAgIGlmIChicmFuY2hlcy5sZW5ndGggPT09IDApIHJldHVybiBleHByKCcnKVxuICAgIGlmIChicmFuY2hlcy5sZW5ndGggPT09IDEpIHJldHVybiBicmFuY2hlc1swXSFcbiAgICByZXR1cm4geyB0eXBlOiAncGFyYWxsZWwnLCBicmFuY2hlcyB9IHNhdGlzZmllcyBQYXJhbGxlbE5vZGVcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBTaW5nbGUtbGluZSBkaXNwYXRjaCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKipcbiAgICogUGFyc2VzIGEgc2luZ2xlIHN0YXRlbWVudCBmcm9tIGl0cyB0ZXh0IGNvbnRlbnQuXG4gICAqIFRoZSB0ZXh0IGhhcyBhbHJlYWR5IGhhZCBgdGhlbiBgIHByZWZpeCBhbmQgdHJhaWxpbmcgYCBhbmRgIHN0cmlwcGVkLlxuICAgKlxuICAgKiBEaXNwYXRjaCBvcmRlciBtYXR0ZXJzOiBtb3JlIHNwZWNpZmljIHBhdHRlcm5zIG11c3QgY29tZSBiZWZvcmUgZ2VuZXJhbCBvbmVzLlxuICAgKi9cbiAgcHJpdmF0ZSBwYXJzZVNpbmdsZUxpbmUodGV4dDogc3RyaW5nLCBpbmRlbnQ6IG51bWJlciwgdG9rZW46IFRva2VuKTogTEVTTm9kZSB7XG4gICAgY29uc3QgZmlyc3QgPSBmaXJzdFdvcmQodGV4dClcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBCbG9jayBjb25zdHJ1Y3RzIChjb25zdW1lIG11bHRpcGxlIGZvbGxvd2luZyB0b2tlbnMpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGlmIChmaXJzdCA9PT0gJ21hdGNoJykgcmV0dXJuIHRoaXMucGFyc2VNYXRjaCh0ZXh0LCBpbmRlbnQsIHRva2VuKVxuICAgIGlmIChmaXJzdCA9PT0gJ3RyeScpICAgcmV0dXJuIHRoaXMucGFyc2VUcnkoaW5kZW50LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBTaW1wbGUgc3RhdGVtZW50IGRpc3BhdGNoIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGlmIChmaXJzdCA9PT0gJ3NldCcpICAgICAgIHJldHVybiB0aGlzLnBhcnNlU2V0KHRleHQsIHRva2VuKVxuICAgIGlmIChmaXJzdCA9PT0gJ2VtaXQnKSAgICAgIHJldHVybiB0aGlzLnBhcnNlRW1pdCh0ZXh0LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICdicm9hZGNhc3QnKSByZXR1cm4gdGhpcy5wYXJzZUJyb2FkY2FzdCh0ZXh0LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICdjYWxsJykgICAgICByZXR1cm4gdGhpcy5wYXJzZUNhbGwodGV4dCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAnd2FpdCcpICAgICAgcmV0dXJuIHRoaXMucGFyc2VXYWl0KHRleHQsIHRva2VuKVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIEJhcmUgRGF0YXN0YXIgYWN0aW9uOiBgQGdldCAnL3VybCcgW2FyZ3NdYCAoZmlyZS1hbmQtYXdhaXQsIG5vIGJpbmQpIFx1MjUwMFx1MjUwMFxuICAgIGlmIChmaXJzdC5zdGFydHNXaXRoKCdAJykpICByZXR1cm4gdGhpcy5wYXJzZUFjdGlvbih0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBBc3luYyBiaW5kOiBgbmFtZSA8LSBAdmVyYiAndXJsJyBbYXJnc11gIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGlmICh0ZXh0LmluY2x1ZGVzKCcgPC0gJykpIHJldHVybiB0aGlzLnBhcnNlQmluZCh0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBBbmltYXRpb24gcHJpbWl0aXZlIChidWlsdC1pbikgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgaWYgKEFOSU1BVElPTl9QUklNSVRJVkVTLmhhcyhmaXJzdCkpIHJldHVybiB0aGlzLnBhcnNlQW5pbWF0aW9uKHRleHQsIHRva2VuKVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIEFuaW1hdGlvbiBwcmltaXRpdmUgKHVzZXJsYW5kIG1vZHVsZSkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgLy8gQW55IHdvcmQgZm9sbG93ZWQgYnkgYSBDU1Mgc2VsZWN0b3IgbG9va3MgbGlrZSBhbiBhbmltYXRpb24gY2FsbC5cbiAgICAvLyBDb3ZlcnMgYm90aCBoeXBoZW5hdGVkIG5hbWVzIChzY3JvbGwtcmV2ZWFsLCBzcHJpbmctaW4pIGFuZCBiYXJlIG5hbWVzIChzaGFrZSkuXG4gICAgaWYgKGxvb2tzTGlrZUFuaW1hdGlvbkNhbGwodGV4dCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnBhcnNlQW5pbWF0aW9uKHRleHQsIHRva2VuKVxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBVbmtub3duOiBzdG9yZSBhcyByYXcgZXhwcmVzc2lvbiAoZXNjYXBlIGhhdGNoIC8gZnV0dXJlIGtleXdvcmRzKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBVbmtub3duIHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICByZXR1cm4gZXhwcih0ZXh0KVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIE1hdGNoIGJsb2NrIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgcGFyc2VNYXRjaCh0ZXh0OiBzdHJpbmcsIGluZGVudDogbnVtYmVyLCB0b2tlbjogVG9rZW4pOiBNYXRjaE5vZGUge1xuICAgIC8vIGB0ZXh0YCBpcyBlLmcuIFwibWF0Y2ggcmVzcG9uc2VcIiBvciBcIm1hdGNoICRmZWVkU3RhdGVcIlxuICAgIGNvbnN0IHN1YmplY3RSYXcgPSB0ZXh0LnNsaWNlKCdtYXRjaCcubGVuZ3RoKS50cmltKClcbiAgICBjb25zdCBzdWJqZWN0OiBFeHByTm9kZSA9IGV4cHIoc3ViamVjdFJhdylcbiAgICBjb25zdCBhcm1zOiBNYXRjaEFybVtdID0gW11cblxuICAgIHdoaWxlICghdGhpcy5hdEVuZCgpKSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy5wZWVrKCkhXG5cbiAgICAgIC8vIC9tYXRjaCB0ZXJtaW5hdGVzIHRoZSBibG9ja1xuICAgICAgaWYgKHQudGV4dCA9PT0gJy9tYXRjaCcpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgLy8gT25seSBjb25zdW1lIGFybSBsaW5lcyBhdCB0aGUgZXhwZWN0ZWQgYXJtIGluZGVudCAoaW5kZW50ICsgMilcbiAgICAgIGlmICh0LmluZGVudCA8PSBpbmRlbnQpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gVW5jbG9zZWQgbWF0Y2ggYmxvY2sgXHUyMDE0IG1pc3NpbmcgL21hdGNoYCwgdG9rZW4pXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIC8vIFBhcnNlIGFuIGFybTogYFtwYXR0ZXJuXSAtPmAgb3IgYFtwYXR0ZXJuXSAtPiBib2R5YFxuICAgICAgaWYgKHQudGV4dC5zdGFydHNXaXRoKCdbJykpIHtcbiAgICAgICAgYXJtcy5wdXNoKHRoaXMucGFyc2VNYXRjaEFybSh0LmluZGVudCwgdCkpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIFNraXAgdW5leHBlY3RlZCBsaW5lcyBpbnNpZGUgbWF0Y2hcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIFVuZXhwZWN0ZWQgdG9rZW4gaW5zaWRlIG1hdGNoIGJsb2NrOiAke0pTT04uc3RyaW5naWZ5KHQudGV4dCl9YCwgdClcbiAgICAgIHRoaXMuYWR2YW5jZSgpXG4gICAgfVxuXG4gICAgcmV0dXJuIHsgdHlwZTogJ21hdGNoJywgc3ViamVjdCwgYXJtcyB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlTWF0Y2hBcm0oYXJtSW5kZW50OiBudW1iZXIsIHRva2VuOiBUb2tlbik6IE1hdGNoQXJtIHtcbiAgICBjb25zdCB0ID0gdGhpcy5hZHZhbmNlKCkgLy8gY29uc3VtZSB0aGUgYXJtIGxpbmVcblxuICAgIC8vIFNwbGl0IG9uIGAgLT5gIHRvIHNlcGFyYXRlIHBhdHRlcm4gZnJvbSBib2R5XG4gICAgY29uc3QgYXJyb3dJZHggPSB0LnRleHQuaW5kZXhPZignIC0+JylcbiAgICBpZiAoYXJyb3dJZHggPT09IC0xKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYXRjaCBhcm0gbWlzc2luZyAnLT4nOiAke0pTT04uc3RyaW5naWZ5KHQudGV4dCl9YCwgdClcbiAgICAgIHJldHVybiB7IHBhdHRlcm5zOiBbeyBraW5kOiAnd2lsZGNhcmQnIH1dLCBib2R5OiBleHByKCcnKSB9XG4gICAgfVxuXG4gICAgY29uc3QgcGF0dGVyblJhdyA9IHQudGV4dC5zbGljZSgwLCBhcnJvd0lkeCkudHJpbSgpXG4gICAgY29uc3QgYWZ0ZXJBcnJvdyA9IHQudGV4dC5zbGljZShhcnJvd0lkeCArIDMpLnRyaW0oKSAgLy8gZXZlcnl0aGluZyBhZnRlciBgLT5gXG5cbiAgICBjb25zdCBwYXR0ZXJucyA9IHBhcnNlUGF0dGVybnMocGF0dGVyblJhdylcblxuICAgIGxldCBib2R5OiBMRVNOb2RlXG4gICAgaWYgKGFmdGVyQXJyb3cubGVuZ3RoID4gMCkge1xuICAgICAgLy8gSW5saW5lIGFybTogYFsnZXJyb3InXSAtPiBzZXQgJGZlZWRTdGF0ZSB0byAnZXJyb3InYFxuICAgICAgYm9keSA9IHRoaXMucGFyc2VTaW5nbGVMaW5lKGFmdGVyQXJyb3csIGFybUluZGVudCwgdG9rZW4pXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE11bHRpLWxpbmUgYXJtOiBib2R5IGlzIHRoZSBkZWVwZXItaW5kZW50ZWQgYmxvY2tcbiAgICAgIGJvZHkgPSB0aGlzLnBhcnNlQmxvY2soYXJtSW5kZW50KVxuICAgIH1cblxuICAgIHJldHVybiB7IHBhdHRlcm5zLCBib2R5IH1cbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBUcnkgYmxvY2sgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBwYXJzZVRyeShpbmRlbnQ6IG51bWJlciwgdG9rZW46IFRva2VuKTogVHJ5Tm9kZSB7XG4gICAgLy8gTm90ZTogdGhlIGB0cnlgIHRva2VuIHdhcyBhbHJlYWR5IGNvbnN1bWVkIGJ5IHRoZSBjYWxsaW5nIHBhcnNlU3RhdGVtZW50T3JQYXJhbGxlbC5cbiAgICAvLyBEbyBOT1QgY2FsbCB0aGlzLmFkdmFuY2UoKSBoZXJlIFx1MjAxNCB0aGF0IHdvdWxkIHNraXAgdGhlIGZpcnN0IGJvZHkgbGluZS5cblxuICAgIC8vIFBhcnNlIGJvZHkgXHUyMDE0IHN0b3BzIGF0IHJlc2N1ZS9hZnRlcndhcmRzLy90cnkgYXQgdGhlIHNhbWUgaW5kZW50IGxldmVsXG4gICAgY29uc3QgYm9keSA9IHRoaXMucGFyc2VCbG9jayhpbmRlbnQpXG5cbiAgICBsZXQgcmVzY3VlOiBMRVNOb2RlIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG4gICAgbGV0IGFmdGVyd2FyZHM6IExFU05vZGUgfCB1bmRlZmluZWQgPSB1bmRlZmluZWRcblxuICAgIC8vIHJlc2N1ZSBjbGF1c2UgKG9wdGlvbmFsKVxuICAgIGlmICh0aGlzLnBlZWsoKT8udGV4dCA9PT0gJ3Jlc2N1ZScgJiYgdGhpcy5wZWVrKCk/LmluZGVudCA9PT0gaW5kZW50KSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKSAvLyBjb25zdW1lIGByZXNjdWVgXG4gICAgICByZXNjdWUgPSB0aGlzLnBhcnNlQmxvY2soaW5kZW50KVxuICAgIH1cblxuICAgIC8vIGFmdGVyd2FyZHMgY2xhdXNlIChvcHRpb25hbClcbiAgICBpZiAodGhpcy5wZWVrKCk/LnRleHQgPT09ICdhZnRlcndhcmRzJyAmJiB0aGlzLnBlZWsoKT8uaW5kZW50ID09PSBpbmRlbnQpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpIC8vIGNvbnN1bWUgYGFmdGVyd2FyZHNgXG4gICAgICBhZnRlcndhcmRzID0gdGhpcy5wYXJzZUJsb2NrKGluZGVudClcbiAgICB9XG5cbiAgICAvLyBDb25zdW1lIC90cnlcbiAgICBpZiAodGhpcy5wZWVrKCk/LnRleHQgPT09ICcvdHJ5Jykge1xuICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gVW5jbG9zZWQgdHJ5IGJsb2NrIFx1MjAxNCBtaXNzaW5nIC90cnlgLCB0b2tlbilcbiAgICB9XG5cbiAgICBjb25zdCB0cnlOb2RlOiBUcnlOb2RlID0geyB0eXBlOiAndHJ5JywgYm9keSB9XG4gICAgaWYgKHJlc2N1ZSAgICAhPT0gdW5kZWZpbmVkKSB0cnlOb2RlLnJlc2N1ZSAgICAgPSByZXNjdWVcbiAgICBpZiAoYWZ0ZXJ3YXJkcyAhPT0gdW5kZWZpbmVkKSB0cnlOb2RlLmFmdGVyd2FyZHMgPSBhZnRlcndhcmRzXG4gICAgcmV0dXJuIHRyeU5vZGVcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBTaW1wbGUgc3RhdGVtZW50IHBhcnNlcnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBwYXJzZVNldCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IFNldE5vZGUge1xuICAgIC8vIGBzZXQgJHNpZ25hbCB0byBleHByYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9ec2V0XFxzK1xcJChcXHcrKVxccyt0b1xccysoLispJC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgc2V0IHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7IHR5cGU6ICdzZXQnLCBzaWduYWw6ICc/PycsIHZhbHVlOiBleHByKHRleHQpIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdzZXQnLFxuICAgICAgc2lnbmFsOiBtWzFdISxcbiAgICAgIHZhbHVlOiBleHByKG1bMl0hLnRyaW0oKSksXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUVtaXQodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBFbWl0Tm9kZSB7XG4gICAgLy8gYGVtaXQgZXZlbnQ6bmFtZSBbcGF5bG9hZCwgLi4uXWAgb3IgYGVtaXQgZXZlbnQ6bmFtZWBcbiAgICBjb25zdCB7IG5hbWUsIHBheWxvYWQgfSA9IHBhcnNlRXZlbnRMaW5lKHRleHQuc2xpY2UoJ2VtaXQnLmxlbmd0aCkudHJpbSgpLCB0b2tlbilcbiAgICByZXR1cm4geyB0eXBlOiAnZW1pdCcsIGV2ZW50OiBuYW1lLCBwYXlsb2FkIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VCcm9hZGNhc3QodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBCcm9hZGNhc3ROb2RlIHtcbiAgICBjb25zdCB7IG5hbWUsIHBheWxvYWQgfSA9IHBhcnNlRXZlbnRMaW5lKHRleHQuc2xpY2UoJ2Jyb2FkY2FzdCcubGVuZ3RoKS50cmltKCksIHRva2VuKVxuICAgIHJldHVybiB7IHR5cGU6ICdicm9hZGNhc3QnLCBldmVudDogbmFtZSwgcGF5bG9hZCB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQ2FsbCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IENhbGxOb2RlIHtcbiAgICAvLyBgY2FsbCBjb21tYW5kOm5hbWUgW2FyZzogdmFsdWUsIC4uLl1gIG9yIGBjYWxsIGNvbW1hbmQ6bmFtZWBcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXmNhbGxcXHMrKFteXFxzXFxbXSspXFxzKig/OlxcWyguKylcXF0pPyQvKVxuICAgIGlmICghbSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gTWFsZm9ybWVkIGNhbGwgc3RhdGVtZW50OiAke0pTT04uc3RyaW5naWZ5KHRleHQpfWAsIHRva2VuKVxuICAgICAgcmV0dXJuIHsgdHlwZTogJ2NhbGwnLCBjb21tYW5kOiAnPz8nLCBhcmdzOiB7fSB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnY2FsbCcsXG4gICAgICBjb21tYW5kOiBtWzFdISxcbiAgICAgIGFyZ3M6IHBhcnNlQXJnTGlzdChtWzJdID8/ICcnKSxcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlV2FpdCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IFdhaXROb2RlIHtcbiAgICAvLyBgd2FpdCAzMDBtc2Agb3IgYHdhaXQgKGF0dGVtcHQgKyAxKSAqIDUwMG1zYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9ed2FpdFxccysoLis/KW1zJC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgd2FpdCBzdGF0ZW1lbnQ6ICR7SlNPTi5zdHJpbmdpZnkodGV4dCl9YCwgdG9rZW4pXG4gICAgICByZXR1cm4geyB0eXBlOiAnd2FpdCcsIG1zOiAwIH1cbiAgICB9XG4gICAgY29uc3QgbXNFeHByID0gbVsxXSEudHJpbSgpXG4gICAgLy8gU2ltcGxlIGxpdGVyYWxcbiAgICBjb25zdCBsaXRlcmFsID0gTnVtYmVyKG1zRXhwcilcbiAgICBpZiAoIU51bWJlci5pc05hTihsaXRlcmFsKSkgcmV0dXJuIHsgdHlwZTogJ3dhaXQnLCBtczogbGl0ZXJhbCB9XG4gICAgLy8gRXhwcmVzc2lvbiBcdTIwMTQgc3RvcmUgYXMgMCB3aXRoIHRoZSBleHByZXNzaW9uIGFzIGEgY29tbWVudCAoZXhlY3V0b3Igd2lsbCBldmFsKVxuICAgIC8vIFBoYXNlIDMgd2lsbCBoYW5kbGUgZHluYW1pYyBkdXJhdGlvbnMgcHJvcGVybHlcbiAgICByZXR1cm4geyB0eXBlOiAnd2FpdCcsIG1zOiAwIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VCaW5kKHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogQmluZE5vZGUge1xuICAgIC8vIGBuYW1lIDwtIEB2ZXJiICd1cmwnIFthcmdzXWBcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXihcXHcrKVxccys8LVxccytAKFxcdyspXFxzKycoW14nXSspJ1xccyooPzpcXFsoLispXFxdKT8kLylcbiAgICBpZiAoIW0pIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIE1hbGZvcm1lZCBiaW5kIHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdiaW5kJyxcbiAgICAgICAgbmFtZTogJz8/JyxcbiAgICAgICAgYWN0aW9uOiB7IHR5cGU6ICdhY3Rpb24nLCB2ZXJiOiAnZ2V0JywgdXJsOiAnJywgYXJnczoge30gfSxcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgYWN0aW9uOiBBY3Rpb25Ob2RlID0ge1xuICAgICAgdHlwZTogJ2FjdGlvbicsXG4gICAgICB2ZXJiOiBtWzJdIS50b0xvd2VyQ2FzZSgpLFxuICAgICAgdXJsOiBtWzNdISxcbiAgICAgIGFyZ3M6IHBhcnNlQXJnTGlzdChtWzRdID8/ICcnKSxcbiAgICB9XG4gICAgcmV0dXJuIHsgdHlwZTogJ2JpbmQnLCBuYW1lOiBtWzFdISwgYWN0aW9uIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VBY3Rpb24odGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBBY3Rpb25Ob2RlIHtcbiAgICAvLyBgQGdldCAnL3VybCcgW2FyZ3NdYCBvciBgQHBvc3QgJy91cmwnIFthcmdzXWBcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXkAoXFx3KylcXHMrJyhbXiddKyknXFxzKig/OlxcWyguKylcXF0pPyQvKVxuICAgIGlmICghbSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gTWFsZm9ybWVkIGFjdGlvbjogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7IHR5cGU6ICdhY3Rpb24nLCB2ZXJiOiAnZ2V0JywgdXJsOiAnJywgYXJnczoge30gfVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogJ2FjdGlvbicsXG4gICAgICB2ZXJiOiBtWzFdIS50b0xvd2VyQ2FzZSgpLFxuICAgICAgdXJsOiBtWzJdISxcbiAgICAgIGFyZ3M6IHBhcnNlQXJnTGlzdChtWzNdID8/ICcnKSxcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQW5pbWF0aW9uKHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogQW5pbWF0aW9uTm9kZSB7XG4gICAgLy8gYHByaW1pdGl2ZSBzZWxlY3RvciBkdXJhdGlvbiBlYXNpbmcgW29wdGlvbnNdYFxuICAgIC8vIEV4YW1wbGVzOlxuICAgIC8vICAgc3RhZ2dlci1lbnRlciAuZmVlZC1pdGVtICAxMjBtcyBlYXNlLW91dCBbZ2FwOiA0MG1zICBmcm9tOiByaWdodF1cbiAgICAvLyAgIHB1bHNlIC5mZWVkLWl0ZW0uaXMtdXBkYXRlZCAgMzAwbXMgZWFzZS1pbi1vdXRcbiAgICAvLyAgIHNsaWRlLW91dCBbZGF0YS1pdGVtLWlkOiBpZF0gIDE1MG1zIGVhc2UtaW4gW3RvOiByaWdodF1cblxuICAgIC8vIFRva2VuaXplOiBzcGxpdCBvbiB3aGl0ZXNwYWNlIGJ1dCBwcmVzZXJ2ZSBbLi4uXSBncm91cHNcbiAgICBjb25zdCBwYXJ0cyA9IHNwbGl0QW5pbWF0aW9uTGluZSh0ZXh0KVxuXG4gICAgY29uc3QgcHJpbWl0aXZlID0gcGFydHNbMF0gPz8gJydcbiAgICBjb25zdCBzZWxlY3RvciAgPSBwYXJ0c1sxXSA/PyAnJ1xuICAgIGNvbnN0IGR1cmF0aW9uU3RyID0gcGFydHNbMl0gPz8gJzBtcydcbiAgICBjb25zdCBlYXNpbmcgICAgPSBwYXJ0c1szXSA/PyAnZWFzZSdcbiAgICBjb25zdCBvcHRpb25zU3RyID0gcGFydHNbNF0gPz8gJycgIC8vIG1heSBiZSBhYnNlbnRcblxuICAgIGNvbnN0IGR1cmF0aW9uTXMgPSBwYXJzZUludChkdXJhdGlvblN0ciwgMTApXG5cbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogJ2FuaW1hdGlvbicsXG4gICAgICBwcmltaXRpdmUsXG4gICAgICBzZWxlY3RvcixcbiAgICAgIGR1cmF0aW9uOiBOdW1iZXIuaXNOYU4oZHVyYXRpb25NcykgPyAwIDogZHVyYXRpb25NcyxcbiAgICAgIGVhc2luZyxcbiAgICAgIG9wdGlvbnM6IHBhcnNlQW5pbWF0aW9uT3B0aW9ucyhvcHRpb25zU3RyKSxcbiAgICB9XG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXR0ZXJuIHBhcnNpbmdcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFBhcnNlcyBhIHBhdHRlcm4gZ3JvdXAgbGlrZSBgW2l0ICAgb2sgICBdYCwgYFtuaWwgIGVycm9yXWAsIGBbX11gLFxuICogYFsnZXJyb3InXWAsIGBbMCB8IDEgfCAyXWAuXG4gKlxuICogUmV0dXJucyBhbiBhcnJheSBvZiBQYXR0ZXJuTm9kZSBcdTIwMTQgb25lIHBlciBlbGVtZW50IGluIHRoZSB0dXBsZSBwYXR0ZXJuLlxuICogRm9yIG9yLXBhdHRlcm5zIChgMCB8IDEgfCAyYCksIHJldHVybnMgYSBzaW5nbGUgT3JQYXR0ZXJuTm9kZS5cbiAqL1xuZnVuY3Rpb24gcGFyc2VQYXR0ZXJucyhyYXc6IHN0cmluZyk6IFBhdHRlcm5Ob2RlW10ge1xuICAvLyBTdHJpcCBvdXRlciBicmFja2V0c1xuICBjb25zdCBpbm5lciA9IHJhdy5yZXBsYWNlKC9eXFxbfFxcXSQvZywgJycpLnRyaW0oKVxuXG4gIC8vIENoZWNrIGZvciBvci1wYXR0ZXJuOiBjb250YWlucyBgIHwgYFxuICBpZiAoaW5uZXIuaW5jbHVkZXMoJyB8ICcpIHx8IGlubmVyLmluY2x1ZGVzKCd8JykpIHtcbiAgICBjb25zdCBhbHRlcm5hdGl2ZXMgPSBpbm5lci5zcGxpdCgvXFxzKlxcfFxccyovKS5tYXAocCA9PiBwYXJzZVNpbmdsZVBhdHRlcm4ocC50cmltKCkpKVxuICAgIHJldHVybiBbeyBraW5kOiAnb3InLCBwYXR0ZXJuczogYWx0ZXJuYXRpdmVzIH1dXG4gIH1cblxuICAvLyBUdXBsZSBwYXR0ZXJuOiBzcGFjZS1zZXBhcmF0ZWQgZWxlbWVudHNcbiAgLy8gVXNlIGEgY3VzdG9tIHNwbGl0IHRvIGhhbmRsZSBtdWx0aXBsZSBzcGFjZXMgKGFsaWdubWVudCBwYWRkaW5nKVxuICByZXR1cm4gaW5uZXIudHJpbSgpLnNwbGl0KC9cXHN7Mix9fFxccyg/PVxcUykvKS5maWx0ZXIocyA9PiBzLnRyaW0oKSlcbiAgICAubWFwKHAgPT4gcGFyc2VTaW5nbGVQYXR0ZXJuKHAudHJpbSgpKSlcbn1cblxuZnVuY3Rpb24gcGFyc2VTaW5nbGVQYXR0ZXJuKHM6IHN0cmluZyk6IFBhdHRlcm5Ob2RlIHtcbiAgaWYgKHMgPT09ICdfJykgICByZXR1cm4geyBraW5kOiAnd2lsZGNhcmQnIH1cbiAgaWYgKHMgPT09ICduaWwnKSByZXR1cm4geyBraW5kOiAnbGl0ZXJhbCcsIHZhbHVlOiBudWxsIH1cblxuICAvLyBTdHJpbmcgbGl0ZXJhbDogJ3ZhbHVlJ1xuICBpZiAocy5zdGFydHNXaXRoKFwiJ1wiKSAmJiBzLmVuZHNXaXRoKFwiJ1wiKSkge1xuICAgIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IHMuc2xpY2UoMSwgLTEpIH1cbiAgfVxuXG4gIC8vIE51bWJlciBsaXRlcmFsXG4gIGNvbnN0IG4gPSBOdW1iZXIocylcbiAgaWYgKCFOdW1iZXIuaXNOYU4obikpIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IG4gfVxuXG4gIC8vIEJvb2xlYW5cbiAgaWYgKHMgPT09ICd0cnVlJykgIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IHRydWUgfVxuICBpZiAocyA9PT0gJ2ZhbHNlJykgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogZmFsc2UgfVxuXG4gIC8vIEV2ZXJ5dGhpbmcgZWxzZSBpcyBhIGJpbmRpbmcgKGNhcHR1cmVzIHRoZSB2YWx1ZSBmb3IgdXNlIGluIHRoZSBib2R5KVxuICByZXR1cm4geyBraW5kOiAnYmluZGluZycsIG5hbWU6IHMgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEFyZ3VtZW50IGxpc3QgcGFyc2luZ1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogUGFyc2VzIGBrZXk6IHZhbHVlICBrZXkyOiB2YWx1ZTJgIGZyb20gaW5zaWRlIGEgWy4uLl0gYXJndW1lbnQgYmxvY2suXG4gKiBWYWx1ZXMgYXJlIHN0b3JlZCBhcyBFeHByTm9kZSAoZXZhbHVhdGVkIGF0IHJ1bnRpbWUpLlxuICovXG5mdW5jdGlvbiBwYXJzZUFyZ0xpc3QocmF3OiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCBFeHByTm9kZT4ge1xuICBpZiAoIXJhdy50cmltKCkpIHJldHVybiB7fVxuXG4gIGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgRXhwck5vZGU+ID0ge31cblxuICAvLyBTcGxpdCBvbiBgICBgIChkb3VibGUtc3BhY2UgdXNlZCBhcyBzZXBhcmF0b3IgaW4gTEVTIHN0eWxlKVxuICAvLyBidXQgYWxzbyBoYW5kbGUgc2luZ2xlIGAgIGtleTogdmFsdWVgIGVudHJpZXNcbiAgLy8gU2ltcGxlIHJlZ2V4OiBgd29yZDogcmVzdF91bnRpbF9uZXh0X3dvcmQ6YFxuICBjb25zdCBwYWlycyA9IHJhdy50cmltKCkuc3BsaXQoLyg/PD1cXFMpXFxzezIsfSg/PVxcdykvKVxuICBmb3IgKGNvbnN0IHBhaXIgb2YgcGFpcnMpIHtcbiAgICBjb25zdCBjb2xvbklkeCA9IHBhaXIuaW5kZXhPZignOicpXG4gICAgaWYgKGNvbG9uSWR4ID09PSAtMSkgY29udGludWVcbiAgICBjb25zdCBrZXkgICA9IHBhaXIuc2xpY2UoMCwgY29sb25JZHgpLnRyaW0oKVxuICAgIGNvbnN0IHZhbHVlID0gcGFpci5zbGljZShjb2xvbklkeCArIDEpLnRyaW0oKVxuICAgIGlmIChrZXkpIHJlc3VsdFtrZXldID0gZXhwcih2YWx1ZSlcbiAgfVxuXG4gIHJldHVybiByZXN1bHRcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBFdmVudCBsaW5lIHBhcnNpbmc6IGBldmVudDpuYW1lIFtwYXlsb2FkLi4uXWBcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5mdW5jdGlvbiBwYXJzZUV2ZW50TGluZShcbiAgcmF3OiBzdHJpbmcsXG4gIHRva2VuOiBUb2tlblxuKTogeyBuYW1lOiBzdHJpbmc7IHBheWxvYWQ6IEV4cHJOb2RlW10gfSB7XG4gIC8vIGBmZWVkOmRhdGEtcmVhZHlgIG9yIGBmZWVkOmRhdGEtcmVhZHkgWyRmZWVkSXRlbXNdYCBvciBgZmVlZDplcnJvciBbJGVycm9yXWBcbiAgY29uc3QgYnJhY2tldElkeCA9IHJhdy5pbmRleE9mKCdbJylcbiAgaWYgKGJyYWNrZXRJZHggPT09IC0xKSB7XG4gICAgcmV0dXJuIHsgbmFtZTogcmF3LnRyaW0oKSwgcGF5bG9hZDogW10gfVxuICB9XG4gIGNvbnN0IG5hbWUgPSByYXcuc2xpY2UoMCwgYnJhY2tldElkeCkudHJpbSgpXG4gIGNvbnN0IHBheWxvYWRSYXcgPSByYXcuc2xpY2UoYnJhY2tldElkeCArIDEsIHJhdy5sYXN0SW5kZXhPZignXScpKS50cmltKClcblxuICAvLyBQYXlsb2FkIGVsZW1lbnRzIGFyZSBjb21tYSBvciBzcGFjZSBzZXBhcmF0ZWQgZXhwcmVzc2lvbnNcbiAgY29uc3QgcGF5bG9hZDogRXhwck5vZGVbXSA9IHBheWxvYWRSYXdcbiAgICA/IHBheWxvYWRSYXcuc3BsaXQoLyxcXHMqfFxcc3syLH0vKS5tYXAocyA9PiBleHByKHMudHJpbSgpKSkuZmlsdGVyKGUgPT4gZS5yYXcpXG4gICAgOiBbXVxuXG4gIHJldHVybiB7IG5hbWUsIHBheWxvYWQgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEFuaW1hdGlvbiBsaW5lIHBhcnNpbmdcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFNwbGl0cyBhbiBhbmltYXRpb24gbGluZSBpbnRvIGl0cyBzdHJ1Y3R1cmFsIHBhcnRzLCBwcmVzZXJ2aW5nIFsuLi5dIGdyb3Vwcy5cbiAqXG4gKiBJbnB1dDogIGBzdGFnZ2VyLWVudGVyIC5mZWVkLWl0ZW0gIDEyMG1zIGVhc2Utb3V0IFtnYXA6IDQwbXMgIGZyb206IHJpZ2h0XWBcbiAqIE91dHB1dDogWydzdGFnZ2VyLWVudGVyJywgJy5mZWVkLWl0ZW0nLCAnMTIwbXMnLCAnZWFzZS1vdXQnLCAnW2dhcDogNDBtcyAgZnJvbTogcmlnaHRdJ11cbiAqL1xuZnVuY3Rpb24gc3BsaXRBbmltYXRpb25MaW5lKHRleHQ6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW11cbiAgbGV0IGN1cnJlbnQgPSAnJ1xuICBsZXQgaW5CcmFja2V0ID0gMFxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdGV4dC5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGNoID0gdGV4dFtpXSFcbiAgICBpZiAoY2ggPT09ICdbJykge1xuICAgICAgaW5CcmFja2V0KytcbiAgICAgIGN1cnJlbnQgKz0gY2hcbiAgICB9IGVsc2UgaWYgKGNoID09PSAnXScpIHtcbiAgICAgIGluQnJhY2tldC0tXG4gICAgICBjdXJyZW50ICs9IGNoXG4gICAgfSBlbHNlIGlmIChjaCA9PT0gJyAnICYmIGluQnJhY2tldCA9PT0gMCkge1xuICAgICAgaWYgKGN1cnJlbnQudHJpbSgpKSBwYXJ0cy5wdXNoKGN1cnJlbnQudHJpbSgpKVxuICAgICAgY3VycmVudCA9ICcnXG4gICAgfSBlbHNlIHtcbiAgICAgIGN1cnJlbnQgKz0gY2hcbiAgICB9XG4gIH1cbiAgaWYgKGN1cnJlbnQudHJpbSgpKSBwYXJ0cy5wdXNoKGN1cnJlbnQudHJpbSgpKVxuICByZXR1cm4gcGFydHNcbn1cblxuLyoqXG4gKiBQYXJzZXMgYW5pbWF0aW9uIG9wdGlvbnMgZnJvbSBhIGBba2V5OiB2YWx1ZSAga2V5MjogdmFsdWUyXWAgc3RyaW5nLlxuICogVGhlIG91dGVyIGJyYWNrZXRzIGFyZSBpbmNsdWRlZCBpbiB0aGUgaW5wdXQuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlQW5pbWF0aW9uT3B0aW9ucyhyYXc6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIEV4cHJOb2RlPiB7XG4gIGlmICghcmF3LnRyaW0oKSkgcmV0dXJuIHt9XG4gIC8vIFN0cmlwIG91dGVyIGJyYWNrZXRzXG4gIGNvbnN0IGlubmVyID0gcmF3LnJlcGxhY2UoL15cXFt8XFxdJC9nLCAnJykudHJpbSgpXG4gIHJldHVybiBwYXJzZUFyZ0xpc3QoaW5uZXIpXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gVXRpbGl0aWVzXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gZXhwcihyYXc6IHN0cmluZyk6IEV4cHJOb2RlIHtcbiAgcmV0dXJuIHsgdHlwZTogJ2V4cHInLCByYXcgfVxufVxuXG5mdW5jdGlvbiBmaXJzdFdvcmQodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHRleHQuc3BsaXQoL1xccysvKVswXSA/PyAnJ1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBhIHN0YXRlbWVudCBsb29rcyBsaWtlIGFuIGFuaW1hdGlvbiBjYWxsOlxuICogICA8d29yZC13aXRoLWh5cGhlbj4gIDxzZWxlY3RvcnxkdXJhdGlvbj4gIC4uLlxuICpcbiAqIFRoaXMgYWxsb3dzIHVzZXJsYW5kIG1vZHVsZSBwcmltaXRpdmVzIChzY3JvbGwtcmV2ZWFsLCBzcHJpbmctaW4sIGV0Yy4pXG4gKiB0byBiZSBwYXJzZWQgYXMgQW5pbWF0aW9uTm9kZSB3aXRob3V0IGJlaW5nIGxpc3RlZCBpbiBBTklNQVRJT05fUFJJTUlUSVZFUy5cbiAqIFRoZSBleGVjdXRvciB0aGVuIGRpc3BhdGNoZXMgdGhlbSB0aHJvdWdoIHRoZSBNb2R1bGVSZWdpc3RyeS5cbiAqL1xuZnVuY3Rpb24gbG9va3NMaWtlQW5pbWF0aW9uQ2FsbCh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgcGFydHMgPSB0ZXh0LnRyaW0oKS5zcGxpdCgvXFxzKy8pXG4gIGlmIChwYXJ0cy5sZW5ndGggPCAyKSByZXR1cm4gZmFsc2VcbiAgY29uc3Qgc2Vjb25kID0gcGFydHNbMV0gPz8gJydcbiAgLy8gU2Vjb25kIHRva2VuIGlzIGEgQ1NTIHNlbGVjdG9yICguY2xhc3MsICNpZCwgW2F0dHJdLCB0YWduYW1lKSBvciBhIGR1cmF0aW9uIChObXMpXG4gIHJldHVybiAvXlsuI1xcW10vLnRlc3Qoc2Vjb25kKSB8fCAgLy8gQ1NTIHNlbGVjdG9yXG4gICAgICAgICAvXlxcZCttcyQvLnRlc3Qoc2Vjb25kKSAgICAgIC8vIGJhcmUgZHVyYXRpb24gKHVudXN1YWwgYnV0IHZhbGlkKVxufVxuXG5mdW5jdGlvbiB0b1NlcXVlbmNlT3JTaW5nbGUoc3RlcHM6IExFU05vZGVbXSk6IExFU05vZGUge1xuICBpZiAoc3RlcHMubGVuZ3RoID09PSAwKSByZXR1cm4gZXhwcignJylcbiAgaWYgKHN0ZXBzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIHN0ZXBzWzBdIVxuICByZXR1cm4geyB0eXBlOiAnc2VxdWVuY2UnLCBzdGVwcyB9IHNhdGlzZmllcyBTZXF1ZW5jZU5vZGVcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXJzZSBlcnJvclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBjbGFzcyBMRVNQYXJzZUVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcsIHB1YmxpYyByZWFkb25seSB0b2tlbjogVG9rZW4gfCB1bmRlZmluZWQpIHtcbiAgICBjb25zdCBsb2MgPSB0b2tlbiA/IGAgKGxpbmUgJHt0b2tlbi5saW5lTnVtfTogJHtKU09OLnN0cmluZ2lmeSh0b2tlbi50ZXh0KX0pYCA6ICcnXG4gICAgc3VwZXIoYFtMRVM6cGFyc2VyXSAke21lc3NhZ2V9JHtsb2N9YClcbiAgICB0aGlzLm5hbWUgPSAnTEVTUGFyc2VFcnJvcidcbiAgfVxufVxuIiwgImltcG9ydCB7IHN0cmlwQm9keSB9IGZyb20gJy4vc3RyaXBCb2R5LmpzJ1xuaW1wb3J0IHsgdG9rZW5pemUgfSBmcm9tICcuL3Rva2VuaXplci5qcydcbmltcG9ydCB7IExFU1BhcnNlciB9IGZyb20gJy4vcGFyc2VyLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNOb2RlIH0gZnJvbSAnLi9hc3QuanMnXG5cbmV4cG9ydCB7IExFU1BhcnNlciwgTEVTUGFyc2VFcnJvciB9IGZyb20gJy4vcGFyc2VyLmpzJ1xuZXhwb3J0IHsgdG9rZW5pemUsIGVuZHNXaXRoQW5kLCBzdHJpcFRyYWlsaW5nQW5kIH0gZnJvbSAnLi90b2tlbml6ZXIuanMnXG5leHBvcnQgeyBzdHJpcEJvZHkgfSBmcm9tICcuL3N0cmlwQm9keS5qcydcbmV4cG9ydCB0eXBlIHsgVG9rZW4gfSBmcm9tICcuL3Rva2VuaXplci5qcydcbmV4cG9ydCAqIGZyb20gJy4vYXN0LmpzJ1xuZXhwb3J0ICogZnJvbSAnLi9jb25maWcuanMnXG5cbi8qKlxuICogUGFyc2UgYSByYXcgTEVTIGJvZHkgc3RyaW5nIChmcm9tIGEgZG89LCBoYW5kbGU9LCBvciBydW49IGF0dHJpYnV0ZSlcbiAqIGludG8gYSB0eXBlZCBBU1Qgbm9kZS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBwdWJsaWMgZW50cnkgcG9pbnQgZm9yIFBoYXNlIDI6XG4gKiAgIC0gU3RyaXBzIGJhY2t0aWNrIHdyYXBwZXIgYW5kIG5vcm1hbGl6ZXMgaW5kZW50YXRpb24gKHN0cmlwQm9keSlcbiAqICAgLSBUb2tlbml6ZXMgaW50byBsaW5lcyB3aXRoIGluZGVudCBsZXZlbHMgKHRva2VuaXplKVxuICogICAtIFBhcnNlcyBpbnRvIGEgdHlwZWQgTEVTTm9kZSBBU1QgKExFU1BhcnNlcilcbiAqXG4gKiBAdGhyb3dzIExFU1BhcnNlRXJyb3Igb24gdW5yZWNvdmVyYWJsZSBzeW50YXggZXJyb3JzIChjdXJyZW50bHkgc29mdC13YXJucyBpbnN0ZWFkKVxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VMRVMocmF3OiBzdHJpbmcpOiBMRVNOb2RlIHtcbiAgY29uc3Qgc3RyaXBwZWQgPSBzdHJpcEJvZHkocmF3KVxuICBjb25zdCB0b2tlbnMgICA9IHRva2VuaXplKHN0cmlwcGVkKVxuICBjb25zdCBwYXJzZXIgICA9IG5ldyBMRVNQYXJzZXIodG9rZW5zKVxuICByZXR1cm4gcGFyc2VyLnBhcnNlKClcbn1cbiIsICIvKipcbiAqIFBoYXNlIDQ6IHdpcmVzIHRoZSBwYXJzZWQgY29uZmlnIGludG8gbGl2ZSBydW50aW1lIGJlaGF2aW9yLlxuICpcbiAqIFJlc3BvbnNpYmlsaXRpZXM6XG4gKiAgIDEuIFJlZ2lzdGVyIGFsbCA8bG9jYWwtY29tbWFuZD4gcGFyc2VkIGRlZnMgaW50byB0aGUgQ29tbWFuZFJlZ2lzdHJ5XG4gKiAgIDIuIEF0dGFjaCBDdXN0b21FdmVudCBsaXN0ZW5lcnMgb24gdGhlIGhvc3QgZm9yIGVhY2ggPG9uLWV2ZW50PlxuICogICAzLiBXaXJlIDxvbi1sb2FkPiB0byBmaXJlIGFmdGVyIERPTSBpcyByZWFkeVxuICogICA0LiBCdWlsZCB0aGUgTEVTQ29udGV4dCB1c2VkIGJ5IHRoZSBleGVjdXRvclxuICpcbiAqIDxvbi1zaWduYWw+IGFuZCA8b24tZW50ZXI+Lzxvbi1leGl0PiBhcmUgd2lyZWQgaW4gUGhhc2UgNS82LlxuICovXG5cbmltcG9ydCB7IGV4ZWN1dGUsIGV2YWxFeHByIH0gZnJvbSAnLi9leGVjdXRvci5qcydcbmltcG9ydCB7IExFU1Njb3BlIH0gZnJvbSAnLi9zY29wZS5qcydcbmltcG9ydCB0eXBlIHsgQ29tbWFuZFJlZ2lzdHJ5IH0gZnJvbSAnLi9yZWdpc3RyeS5qcydcbmltcG9ydCB0eXBlIHsgTW9kdWxlUmVnaXN0cnkgfSBmcm9tICdAbW9kdWxlcy90eXBlcy5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29uZmlnIH0gZnJvbSAnQHBhcnNlci9jb25maWcuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcbmltcG9ydCB7IHBhcnNlTEVTIH0gZnJvbSAnQHBhcnNlci9pbmRleC5qcydcblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZWRXaXJpbmcge1xuICBjb21tYW5kczogIEFycmF5PHsgbmFtZTogc3RyaW5nOyBndWFyZDogc3RyaW5nIHwgbnVsbDsgYXJnc1Jhdzogc3RyaW5nOyBib2R5OiBMRVNOb2RlIH0+XG4gIGhhbmRsZXJzOiAgQXJyYXk8eyBldmVudDogc3RyaW5nOyBib2R5OiBMRVNOb2RlIH0+XG4gIHdhdGNoZXJzOiAgQXJyYXk8eyBzaWduYWw6IHN0cmluZzsgd2hlbjogc3RyaW5nIHwgbnVsbDsgYm9keTogTEVTTm9kZSB9PlxuICBsaWZlY3ljbGU6IHtcbiAgICBvbkxvYWQ6ICBMRVNOb2RlW11cbiAgICBvbkVudGVyOiBBcnJheTx7IHdoZW46IHN0cmluZyB8IG51bGw7IGJvZHk6IExFU05vZGUgfT5cbiAgICBvbkV4aXQ6ICBMRVNOb2RlW11cbiAgfVxufVxuXG4vKiogQnVpbGRzIGEgTEVTQ29udGV4dCBmb3IgdGhlIGhvc3QgZWxlbWVudC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENvbnRleHQoXG4gIGhvc3Q6IEVsZW1lbnQsXG4gIGNvbW1hbmRzOiBDb21tYW5kUmVnaXN0cnksXG4gIG1vZHVsZXM6IE1vZHVsZVJlZ2lzdHJ5LFxuICBzaWduYWxzOiB7IGdldDogKGs6IHN0cmluZykgPT4gdW5rbm93bjsgc2V0OiAoazogc3RyaW5nLCB2OiB1bmtub3duKSA9PiB2b2lkIH1cbik6IGltcG9ydCgnLi9leGVjdXRvci5qcycpLkxFU0NvbnRleHQge1xuICBjb25zdCBzY29wZSA9IG5ldyBMRVNTY29wZSgpXG5cbiAgY29uc3QgZW1pdExvY2FsID0gKGV2ZW50OiBzdHJpbmcsIHBheWxvYWQ6IHVua25vd25bXSkgPT4ge1xuICAgIGNvbnNvbGUubG9nKGBbTEVTXSBlbWl0IFwiJHtldmVudH1cImAsIHBheWxvYWQubGVuZ3RoID8gcGF5bG9hZCA6ICcnKVxuICAgIGhvc3QuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoZXZlbnQsIHtcbiAgICAgIGRldGFpbDogeyBwYXlsb2FkIH0sXG4gICAgICBidWJibGVzOiBmYWxzZSxcbiAgICAgIGNvbXBvc2VkOiBmYWxzZSxcbiAgICB9KSlcbiAgfVxuXG4gIGNvbnN0IGJyb2FkY2FzdCA9IChldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHtcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gYnJvYWRjYXN0IFwiJHtldmVudH1cImAsIHBheWxvYWQubGVuZ3RoID8gcGF5bG9hZCA6ICcnKVxuICAgIGNvbnN0IHJvb3QgPSBob3N0LmdldFJvb3ROb2RlKClcbiAgICBjb25zdCB0YXJnZXQgPSByb290IGluc3RhbmNlb2YgRG9jdW1lbnQgPyByb290IDogKHJvb3QgYXMgU2hhZG93Um9vdCkub3duZXJEb2N1bWVudCA/PyBkb2N1bWVudFxuICAgIC8vIFN0YW1wIHRoZSBicm9hZGNhc3Qgd2l0aDpcbiAgICAvLyAgIF9fYnJvYWRjYXN0T3JpZ2luOiAgdGhlIGhvc3QgdGhhdCBlbWl0dGVkIGl0IChmb3IgaWRlbnRpdHkgY2hlY2spXG4gICAgLy8gICBfX2Jyb2FkY2FzdFRyaWdnZXI6IHRoZSBldmVudCBuYW1lIHRoYXQgY2F1c2VkIHRoaXMgYnJvYWRjYXN0XG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgIChkb2NMaXN0ZW5lcnMgc2tpcCBvbmx5IHNhbWUtZXZlbnQgcmVsYXkgbG9vcHMpXG4gICAgY29uc3QgdHJpZ2dlciA9IF9jdXJyZW50SGFuZGxlckV2ZW50LmdldChob3N0KSA/PyBudWxsXG4gICAgdGFyZ2V0LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KGV2ZW50LCB7XG4gICAgICBkZXRhaWw6IHsgcGF5bG9hZCwgX19icm9hZGNhc3RPcmlnaW46IGhvc3QsIF9fYnJvYWRjYXN0VHJpZ2dlcjogdHJpZ2dlciB9LFxuICAgICAgYnViYmxlczogZmFsc2UsXG4gICAgICBjb21wb3NlZDogZmFsc2UsXG4gICAgfSkpXG4gIH1cblxuICByZXR1cm4ge1xuICAgIHNjb3BlLFxuICAgIGhvc3QsXG4gICAgY29tbWFuZHMsXG4gICAgbW9kdWxlcyxcbiAgICBnZXRTaWduYWw6IHNpZ25hbHMuZ2V0LFxuICAgIHNldFNpZ25hbDogc2lnbmFscy5zZXQsXG4gICAgZW1pdExvY2FsLFxuICAgIGJyb2FkY2FzdCxcbiAgfVxufVxuXG4vLyBUcmFja3Mgd2hpY2ggZXZlbnQgbmFtZSBpcyBjdXJyZW50bHkgYmVpbmcgaGFuZGxlZCBwZXIgaG9zdCBlbGVtZW50LlxuLy8gVXNlZCB0byBzdGFtcCBicm9hZGNhc3RzIHNvIGRvY0xpc3RlbmVycyBjYW4gZGV0ZWN0IHNhbWUtZXZlbnQgcmVsYXkgbG9vcHMuXG4vLyBKUyBpcyBzaW5nbGUtdGhyZWFkZWQ6IHNhZmUgdG8gc2V0IHN5bmNocm9ub3VzbHkgYmVmb3JlIGV4ZWN1dGUoKSwgcmVhZCBpbiBicm9hZGNhc3QoKS5cbmNvbnN0IF9jdXJyZW50SGFuZGxlckV2ZW50ID0gbmV3IFdlYWtNYXA8RWxlbWVudCwgc3RyaW5nPigpXG5cbi8qKlxuICogQ2FsbGVkIG9uY2UgZHVyaW5nIF9pbml0LCBiZWZvcmUgYW55IGV2ZW50cyBhcmUgd2lyZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckNvbW1hbmRzKFxuICB3aXJpbmc6IFBhcnNlZFdpcmluZyxcbiAgcmVnaXN0cnk6IENvbW1hbmRSZWdpc3RyeVxuKTogdm9pZCB7XG4gIGZvciAoY29uc3QgY21kIG9mIHdpcmluZy5jb21tYW5kcykge1xuICAgIC8vIFBhcnNlIGFyZ3NSYXcgaW50byBBcmdEZWZbXSAoc2ltcGxpZmllZCBcdTIwMTQgZnVsbCBhcmcgcGFyc2luZyBpbiBQaGFzZSAyIHJlZmluZW1lbnQpXG4gICAgY29uc3QgYXJncyA9IHBhcnNlQXJnc1JhdyhjbWQuYXJnc1JhdylcbiAgICBjb25zdCBkZWY6IGltcG9ydCgnLi9yZWdpc3RyeS5qcycpLkNvbW1hbmREZWYgPSB7XG4gICAgICBuYW1lOiBjbWQubmFtZSxcbiAgICAgIGFyZ3MsXG4gICAgICBib2R5OiBjbWQuYm9keSxcbiAgICAgIGVsZW1lbnQ6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xvY2FsLWNvbW1hbmQnKSxcbiAgICB9XG4gICAgaWYgKGNtZC5ndWFyZCkgZGVmLmd1YXJkID0gY21kLmd1YXJkXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoZGVmKVxuICB9XG4gIGNvbnNvbGUubG9nKGBbTEVTXSByZWdpc3RlcmVkICR7d2lyaW5nLmNvbW1hbmRzLmxlbmd0aH0gY29tbWFuZHNgKVxufVxuXG4vKipcbiAqIEF0dGFjaGVzIGV2ZW50IGxpc3RlbmVycyBvbiBCT1RIIHRoZSBob3N0IEFORCBkb2N1bWVudCBmb3IgYWxsIDxvbi1ldmVudD4gaGFuZGxlcnMuXG4gKlxuICogZW1pdCAgICAgIFx1MjE5MiBkaXNwYXRjaGVkIG9uIGhvc3QsIGJ1YmJsZXM6ZmFsc2UgICAgIFx1MjE5MiBob3N0IGxpc3RlbmVyIGZpcmVzIG9ubHlcbiAqIGJyb2FkY2FzdCBcdTIxOTIgZGlzcGF0Y2hlZCBvbiBkb2N1bWVudCwgYnViYmxlczpmYWxzZSBcdTIxOTIgZG9jIGxpc3RlbmVyIGZpcmVzIG9ubHlcbiAqXG4gKiBMb29wIHByZXZlbnRpb24gZm9yIHNhbWUtZXZlbnQgcmVsYXkgKGBvbi1ldmVudCBYIFx1MjE5MiBicm9hZGNhc3QgWGApOlxuICogICBCZWZvcmUgZXhlY3V0ZSgpLCB3ZSBzdGFtcCBfY3VycmVudEhhbmRsZXJFdmVudFtob3N0XSA9IGhhbmRsZXIuZXZlbnQuXG4gKiAgIGJyb2FkY2FzdCgpIHJlYWRzIHRoaXMgYW5kIHN0YW1wcyBfX2Jyb2FkY2FzdFRyaWdnZXIgb24gdGhlIEN1c3RvbUV2ZW50LlxuICogICBkb2NMaXN0ZW5lciBza2lwcyBpZjogb3JpZ2luPT09aG9zdCBBTkQgdHJpZ2dlcj09PXRoaXMgaGFuZGxlcidzIGV2ZW50LlxuICogICBUaGlzIHByZXZlbnRzOiBob3N0IGhhbmRsZXMgWCBcdTIxOTIgYnJvYWRjYXN0cyBYIFx1MjE5MiBkb2NMaXN0ZW5lciBoYW5kbGVzIFggXHUyMTkyIGxvb3AuXG4gKlxuICogQ3Jvc3MtZXZlbnQgZGVsaXZlcnkgKGBvbi1ldmVudCBBIFx1MjE5MiBicm9hZGNhc3QgQmAsIEFcdTIyNjBCKSBpcyBOT1QgYmxvY2tlZDpcbiAqICAgI3BhZ2UtY29udHJvbGxlciBoYW5kbGVzIGFuYWx5c2lzOmNvbXB1dGVkIFx1MjE5MiBicm9hZGNhc3RzIHBhZ2U6ZGF0YS1yZWFkeS5cbiAqICAgSXRzIG93biBkb2NMaXN0ZW5lciBmb3IgcGFnZTpkYXRhLXJlYWR5IHNlZXMgdHJpZ2dlcj1hbmFseXNpczpjb21wdXRlZCBcdTIyNjAgcGFnZTpkYXRhLXJlYWR5IFx1MjE5MiBGSVJFUyBcdTI3MTNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpcmVFdmVudEhhbmRsZXJzKFxuICB3aXJpbmc6IFBhcnNlZFdpcmluZyxcbiAgaG9zdDogRWxlbWVudCxcbiAgZ2V0Q3R4OiAoKSA9PiBpbXBvcnQoJy4vZXhlY3V0b3IuanMnKS5MRVNDb250ZXh0XG4pOiAoKSA9PiB2b2lkIHtcbiAgY29uc3QgY2xlYW51cHM6IEFycmF5PCgpID0+IHZvaWQ+ID0gW11cblxuICBjb25zdCBkb2M6IERvY3VtZW50ID1cbiAgICBob3N0LmdldFJvb3ROb2RlKCkgaW5zdGFuY2VvZiBEb2N1bWVudFxuICAgICAgPyAoaG9zdC5nZXRSb290Tm9kZSgpIGFzIERvY3VtZW50KVxuICAgICAgOiAoaG9zdCBhcyBFbGVtZW50KS5vd25lckRvY3VtZW50ID8/IGRvY3VtZW50XG5cbiAgZm9yIChjb25zdCBoYW5kbGVyIG9mIHdpcmluZy5oYW5kbGVycykge1xuICAgIGNvbnN0IHJ1biA9IChlOiBFdmVudCkgPT4ge1xuICAgICAgX2N1cnJlbnRIYW5kbGVyRXZlbnQuc2V0KGhvc3QsIGhhbmRsZXIuZXZlbnQpXG4gICAgICBjb25zdCBjdHggPSBnZXRDdHgoKVxuICAgICAgY29uc3QgaGFuZGxlclNjb3BlID0gY3R4LnNjb3BlLmNoaWxkKClcbiAgICAgIGNvbnN0IGRldGFpbCA9IChlIGFzIEN1c3RvbUV2ZW50KS5kZXRhaWwgPz8ge31cbiAgICAgIGhhbmRsZXJTY29wZS5zZXQoJ2V2ZW50JywgZSlcbiAgICAgIGhhbmRsZXJTY29wZS5zZXQoJ3BheWxvYWQnLCBkZXRhaWwucGF5bG9hZCA/PyBbXSlcbiAgICAgIGV4ZWN1dGUoaGFuZGxlci5ib2R5LCB7IC4uLmN0eCwgc2NvcGU6IGhhbmRsZXJTY29wZSB9KS5jYXRjaChlcnIgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbTEVTXSBFcnJvciBpbiBoYW5kbGVyIGZvciBcIiR7aGFuZGxlci5ldmVudH1cIjpgLCBlcnIpXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vIEhvc3QgbGlzdGVuZXIgXHUyMTkyIGVtaXQgcGF0aFxuICAgIGNvbnN0IGhvc3RMaXN0ZW5lciA9IChlOiBFdmVudCkgPT4gcnVuKGUpXG5cbiAgICAvLyBEb2MgbGlzdGVuZXIgXHUyMTkyIGJyb2FkY2FzdCBwYXRoOyBza2lwIHNhbWUtZXZlbnQgcmVsYXkgbG9vcHMgb25seVxuICAgIGNvbnN0IGRvY0xpc3RlbmVyID0gKGU6IEV2ZW50KSA9PiB7XG4gICAgICBjb25zdCBkZXRhaWwgPSAoZSBhcyBDdXN0b21FdmVudCkuZGV0YWlsID8/IHt9XG4gICAgICBjb25zdCBzYW1lT3JpZ2luICA9IGRldGFpbC5fX2Jyb2FkY2FzdE9yaWdpbiA9PT0gaG9zdFxuICAgICAgY29uc3Qgc2FtZVRyaWdnZXIgPSBkZXRhaWwuX19icm9hZGNhc3RUcmlnZ2VyID09PSBoYW5kbGVyLmV2ZW50XG4gICAgICAvLyBPbmx5IHNraXAgaWYgdGhpcyBob3N0IHJlYnJvYWRjYXN0cyB0aGUgZXhhY3QgZXZlbnQgaXQncyBoYW5kbGluZyAocmVsYXkgbG9vcClcbiAgICAgIC8vIENyb3NzLWV2ZW50OiB0cmlnZ2VyICE9IGhhbmRsZXIuZXZlbnQgXHUyMTkyIEFMTE9XIGV2ZW4gaWYgc2FtZSBvcmlnaW5cbiAgICAgIGlmIChzYW1lT3JpZ2luICYmIHNhbWVUcmlnZ2VyKSByZXR1cm5cbiAgICAgIHJ1bihlKVxuICAgIH1cblxuICAgIGhvc3QuYWRkRXZlbnRMaXN0ZW5lcihoYW5kbGVyLmV2ZW50LCBob3N0TGlzdGVuZXIpXG4gICAgZG9jLmFkZEV2ZW50TGlzdGVuZXIoaGFuZGxlci5ldmVudCwgZG9jTGlzdGVuZXIpXG4gICAgY2xlYW51cHMucHVzaCgoKSA9PiB7XG4gICAgICBob3N0LnJlbW92ZUV2ZW50TGlzdGVuZXIoaGFuZGxlci5ldmVudCwgaG9zdExpc3RlbmVyKVxuICAgICAgZG9jLnJlbW92ZUV2ZW50TGlzdGVuZXIoaGFuZGxlci5ldmVudCwgZG9jTGlzdGVuZXIpXG4gICAgfSlcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gd2lyZWQgZXZlbnQgaGFuZGxlcjogXCIke2hhbmRsZXIuZXZlbnR9XCJgKVxuICB9XG5cbiAgcmV0dXJuICgpID0+IGNsZWFudXBzLmZvckVhY2goZm4gPT4gZm4oKSlcbn1cblxuLyoqXG4gKiBGaXJlcyBhbGwgPG9uLWxvYWQ+IGJvZGllcy5cbiAqIENhbGxlZCBhZnRlciBjb21tYW5kcyBhcmUgcmVnaXN0ZXJlZCBhbmQgZXZlbnQgaGFuZGxlcnMgYXJlIHdpcmVkLFxuICogc28gZW1pdC9jYWxsIHN0YXRlbWVudHMgaW4gb24tbG9hZCBjYW4gcmVhY2ggdGhlaXIgdGFyZ2V0cy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpcmVPbkxvYWQoXG4gIHdpcmluZzogUGFyc2VkV2lyaW5nLFxuICBnZXRDdHg6ICgpID0+IGltcG9ydCgnLi9leGVjdXRvci5qcycpLkxFU0NvbnRleHRcbik6IFByb21pc2U8dm9pZD4ge1xuICBmb3IgKGNvbnN0IGJvZHkgb2Ygd2lyaW5nLmxpZmVjeWNsZS5vbkxvYWQpIHtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZXhlY3V0ZShib2R5LCBnZXRDdHgoKSlcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tMRVNdIEVycm9yIGluIG9uLWxvYWQ6JywgZXJyKVxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEFyZyBwYXJzaW5nIChzaW1wbGlmaWVkIFx1MjAxNCBmdWxsIHR5cGUtY2hlY2tlZCB2ZXJzaW9uIGluIFBoYXNlIDIgcmVmaW5lbWVudClcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5pbXBvcnQgdHlwZSB7IEFyZ0RlZiB9IGZyb20gJy4vcmVnaXN0cnkuanMnXG5pbXBvcnQgdHlwZSB7IEV4cHJOb2RlIH0gZnJvbSAnQHBhcnNlci9hc3QuanMnXG5cbmZ1bmN0aW9uIHBhcnNlQXJnc1JhdyhyYXc6IHN0cmluZyk6IEFyZ0RlZltdIHtcbiAgaWYgKCFyYXcudHJpbSgpKSByZXR1cm4gW11cbiAgLy8gU3RyaXAgb3V0ZXIgYnJhY2tldHM6IFwiW2Zyb206c3RyICB0bzpzdHIgIGF0dGVtcHQ6aW50PTBdXCIgXHUyMTkyIFwiZnJvbTpzdHIgIHRvOnN0ciAgYXR0ZW1wdDppbnQ9MFwiXG4gIGNvbnN0IGlubmVyID0gcmF3LnJlcGxhY2UoL15cXFt8XFxdJC9nLCAnJykudHJpbSgpXG4gIGlmICghaW5uZXIpIHJldHVybiBbXVxuXG4gIHJldHVybiBpbm5lci5zcGxpdCgvXFxzezIsfXxcXHMoPz1cXHcrOikvKS5tYXAocyA9PiBzLnRyaW0oKSkuZmlsdGVyKEJvb2xlYW4pLm1hcChwYXJ0ID0+IHtcbiAgICAvLyBgbmFtZTp0eXBlPWRlZmF1bHRgIG9yIGBuYW1lOnR5cGVgXG4gICAgY29uc3QgZXFJZHggPSBwYXJ0LmluZGV4T2YoJz0nKVxuICAgIGNvbnN0IGNvbG9uSWR4ID0gcGFydC5pbmRleE9mKCc6JylcbiAgICBpZiAoY29sb25JZHggPT09IC0xKSByZXR1cm4geyBuYW1lOiBwYXJ0LCB0eXBlOiAnZHluJyB9XG5cbiAgICBjb25zdCBuYW1lID0gcGFydC5zbGljZSgwLCBjb2xvbklkeCkudHJpbSgpXG4gICAgY29uc3QgcmVzdCA9IHBhcnQuc2xpY2UoY29sb25JZHggKyAxKVxuXG4gICAgaWYgKGVxSWR4ID09PSAtMSkge1xuICAgICAgcmV0dXJuIHsgbmFtZSwgdHlwZTogcmVzdC50cmltKCkgfVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCB0eXBlID0gcGFydC5zbGljZShjb2xvbklkeCArIDEsIGVxSWR4KS50cmltKClcbiAgICAgIGNvbnN0IGRlZmF1bHRSYXcgPSBwYXJ0LnNsaWNlKGVxSWR4ICsgMSkudHJpbSgpXG4gICAgICBjb25zdCBkZWZhdWx0RXhwcjogRXhwck5vZGUgPSB7IHR5cGU6ICdleHByJywgcmF3OiBkZWZhdWx0UmF3IH1cbiAgICAgIHJldHVybiB7IG5hbWUsIHR5cGUsIGRlZmF1bHQ6IGRlZmF1bHRFeHByIH1cbiAgICB9XG4gIH0pXG59XG4iLCAiLyoqXG4gKiBMRVNTY29wZSBcdTIwMTQgYSBzaW1wbGUgbGV4aWNhbGx5LXNjb3BlZCB2YXJpYWJsZSBzdG9yZS5cbiAqXG4gKiBFYWNoIGNvbW1hbmQgaW52b2NhdGlvbiBnZXRzIGEgZnJlc2ggY2hpbGQgc2NvcGUuXG4gKiBNYXRjaCBhcm0gYmluZGluZ3MgYWxzbyBjcmVhdGUgYSBjaGlsZCBzY29wZSBsaW1pdGVkIHRvIHRoYXQgYXJtJ3MgYm9keS5cbiAqIFNpZ25hbCByZWFkcy93cml0ZXMgZ28gdGhyb3VnaCB0aGUgRGF0YXN0YXIgYnJpZGdlLCBub3QgdGhpcyBzY29wZS5cbiAqL1xuZXhwb3J0IGNsYXNzIExFU1Njb3BlIHtcbiAgcHJpdmF0ZSBsb2NhbHMgPSBuZXcgTWFwPHN0cmluZywgdW5rbm93bj4oKVxuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgcGFyZW50PzogTEVTU2NvcGUpIHt9XG5cbiAgZ2V0KG5hbWU6IHN0cmluZyk6IHVua25vd24ge1xuICAgIGlmICh0aGlzLmxvY2Fscy5oYXMobmFtZSkpIHJldHVybiB0aGlzLmxvY2Fscy5nZXQobmFtZSlcbiAgICByZXR1cm4gdGhpcy5wYXJlbnQ/LmdldChuYW1lKVxuICB9XG5cbiAgc2V0KG5hbWU6IHN0cmluZywgdmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICB0aGlzLmxvY2Fscy5zZXQobmFtZSwgdmFsdWUpXG4gIH1cblxuICBoYXMobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMubG9jYWxzLmhhcyhuYW1lKSB8fCAodGhpcy5wYXJlbnQ/LmhhcyhuYW1lKSA/PyBmYWxzZSlcbiAgfVxuXG4gIC8qKiBDcmVhdGUgYSBjaGlsZCBzY29wZSBpbmhlcml0aW5nIGFsbCBsb2NhbHMgZnJvbSB0aGlzIG9uZS4gKi9cbiAgY2hpbGQoKTogTEVTU2NvcGUge1xuICAgIHJldHVybiBuZXcgTEVTU2NvcGUodGhpcylcbiAgfVxuXG4gIC8qKiBTbmFwc2hvdCBhbGwgbG9jYWxzIChmb3IgZGVidWdnaW5nIC8gZXJyb3IgbWVzc2FnZXMpLiAqL1xuICBzbmFwc2hvdCgpOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB7XG4gICAgY29uc3QgYmFzZSA9IHRoaXMucGFyZW50Py5zbmFwc2hvdCgpID8/IHt9XG4gICAgZm9yIChjb25zdCBbaywgdl0gb2YgdGhpcy5sb2NhbHMpIGJhc2Vba10gPSB2XG4gICAgcmV0dXJuIGJhc2VcbiAgfVxufVxuIiwgIi8qKlxuICogUGhhc2UgNWE6IEludGVyc2VjdGlvbk9ic2VydmVyIHdpcmluZ1xuICpcbiAqIE9uZSBzaGFyZWQgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgaXMgY3JlYXRlZCBwZXIgPGxvY2FsLWV2ZW50LXNjcmlwdD4gaG9zdC5cbiAqIEl0IHdhdGNoZXMgdGhlIGhvc3QgZWxlbWVudCBpdHNlbGYgKG5vdCBpdHMgY2hpbGRyZW4pLlxuICpcbiAqIG9uLWVudGVyOiBmaXJlcyB3aGVuIHRoZSBob3N0IGNyb3NzZXMgaW50byB0aGUgdmlld3BvcnRcbiAqICAgLSBFYWNoIDxvbi1lbnRlcj4gaGFzIGFuIG9wdGlvbmFsIGB3aGVuYCBndWFyZCBldmFsdWF0ZWQgYXQgZmlyZSB0aW1lXG4gKiAgIC0gTXVsdGlwbGUgPG9uLWVudGVyPiBjaGlsZHJlbiBhcmUgYWxsIGNoZWNrZWQgaW4gZGVjbGFyYXRpb24gb3JkZXJcbiAqXG4gKiBvbi1leGl0OiBmaXJlcyB3aGVuIHRoZSBob3N0IGxlYXZlcyB0aGUgdmlld3BvcnRcbiAqICAgLSBBbHdheXMgZmlyZXMgdW5jb25kaXRpb25hbGx5IChubyBgd2hlbmAgZ3VhcmQgb24gb24tZXhpdClcbiAqICAgLSBNdWx0aXBsZSA8b24tZXhpdD4gY2hpbGRyZW4gYWxsIGZpcmVcbiAqXG4gKiBUaGUgb2JzZXJ2ZXIgaXMgZGlzY29ubmVjdGVkIGluIGRpc2Nvbm5lY3RlZENhbGxiYWNrIHZpYSB0aGUgcmV0dXJuZWQgY2xlYW51cCBmbi5cbiAqL1xuXG5pbXBvcnQgeyBleGVjdXRlLCBldmFsRXhwciB9IGZyb20gJy4vZXhlY3V0b3IuanMnXG5pbXBvcnQgdHlwZSB7IExFU0NvbnRleHQgfSBmcm9tICcuL2V4ZWN1dG9yLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNOb2RlIH0gZnJvbSAnQHBhcnNlci9hc3QuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgT25FbnRlckRlY2wge1xuICB3aGVuOiBzdHJpbmcgfCBudWxsXG4gIGJvZHk6IExFU05vZGVcbn1cblxuLyoqXG4gKiBBdHRhY2hlcyBhbiBJbnRlcnNlY3Rpb25PYnNlcnZlciB0byB0aGUgaG9zdCBlbGVtZW50LlxuICpcbiAqIEByZXR1cm5zIEEgY2xlYW51cCBmdW5jdGlvbiB0aGF0IGRpc2Nvbm5lY3RzIHRoZSBvYnNlcnZlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpcmVJbnRlcnNlY3Rpb25PYnNlcnZlcihcbiAgaG9zdDogRWxlbWVudCxcbiAgb25FbnRlcjogT25FbnRlckRlY2xbXSxcbiAgb25FeGl0OiBMRVNOb2RlW10sXG4gIGdldEN0eDogKCkgPT4gTEVTQ29udGV4dCxcbik6ICgpID0+IHZvaWQge1xuICBpZiAob25FbnRlci5sZW5ndGggPT09IDAgJiYgb25FeGl0Lmxlbmd0aCA9PT0gMCkge1xuICAgIC8vIE5vdGhpbmcgdG8gb2JzZXJ2ZSBcdTIwMTQgc2tpcCBjcmVhdGluZyB0aGUgSU8gZW50aXJlbHlcbiAgICByZXR1cm4gKCkgPT4ge31cbiAgfVxuXG4gIGxldCB3YXNJbnRlcnNlY3Rpbmc6IGJvb2xlYW4gfCBudWxsID0gbnVsbFxuXG4gIGNvbnN0IG9ic2VydmVyID0gbmV3IEludGVyc2VjdGlvbk9ic2VydmVyKFxuICAgIChlbnRyaWVzKSA9PiB7XG4gICAgICAvLyBJTyBmaXJlcyBvbmNlIGltbWVkaWF0ZWx5IG9uIGF0dGFjaCB3aXRoIHRoZSBjdXJyZW50IHN0YXRlLlxuICAgICAgLy8gV2UgdHJhY2sgYHdhc0ludGVyc2VjdGluZ2AgdG8gYXZvaWQgc3B1cmlvdXMgb24tZXhpdCBvbiBmaXJzdCB0aWNrLlxuICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgICAgIGNvbnN0IG5vd0ludGVyc2VjdGluZyA9IGVudHJ5LmlzSW50ZXJzZWN0aW5nXG5cbiAgICAgICAgaWYgKG5vd0ludGVyc2VjdGluZyAmJiB3YXNJbnRlcnNlY3RpbmcgIT09IHRydWUpIHtcbiAgICAgICAgICAvLyBFbnRlcmVkIHZpZXdwb3J0XG4gICAgICAgICAgd2FzSW50ZXJzZWN0aW5nID0gdHJ1ZVxuICAgICAgICAgIGhhbmRsZUVudGVyKG9uRW50ZXIsIGdldEN0eClcbiAgICAgICAgfSBlbHNlIGlmICghbm93SW50ZXJzZWN0aW5nICYmIHdhc0ludGVyc2VjdGluZyA9PT0gdHJ1ZSkge1xuICAgICAgICAgIC8vIEV4aXRlZCB2aWV3cG9ydCAob25seSBhZnRlciB3ZSd2ZSBiZWVuIGluIGl0KVxuICAgICAgICAgIHdhc0ludGVyc2VjdGluZyA9IGZhbHNlXG4gICAgICAgICAgaGFuZGxlRXhpdChvbkV4aXQsIGdldEN0eClcbiAgICAgICAgfSBlbHNlIGlmICh3YXNJbnRlcnNlY3RpbmcgPT09IG51bGwpIHtcbiAgICAgICAgICAvLyBGaXJzdCB0aWNrIFx1MjAxNCByZWNvcmQgc3RhdGUgYnV0IGRvbid0IGZpcmUgZXhpdCBmb3IgaW5pdGlhbGx5LW9mZi1zY3JlZW5cbiAgICAgICAgICB3YXNJbnRlcnNlY3RpbmcgPSBub3dJbnRlcnNlY3RpbmdcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgLy8gRGVmYXVsdCB0aHJlc2hvbGQ6IGZpcmUgd2hlbiBhbnkgcGl4ZWwgb2YgdGhlIGhvc3QgZW50ZXJzL2V4aXRzXG4gICAgICB0aHJlc2hvbGQ6IDAsXG4gICAgfVxuICApXG5cbiAgb2JzZXJ2ZXIub2JzZXJ2ZShob3N0KVxuICBjb25zb2xlLmxvZygnW0xFU10gSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgYXR0YWNoZWQnLCAoaG9zdCBhcyBIVE1MRWxlbWVudCkuaWQgfHwgaG9zdC50YWdOYW1lKVxuXG4gIHJldHVybiAoKSA9PiB7XG4gICAgb2JzZXJ2ZXIuZGlzY29ubmVjdCgpXG4gICAgY29uc29sZS5sb2coJ1tMRVNdIEludGVyc2VjdGlvbk9ic2VydmVyIGRpc2Nvbm5lY3RlZCcpXG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRW50ZXIoZGVjbHM6IE9uRW50ZXJEZWNsW10sIGdldEN0eDogKCkgPT4gTEVTQ29udGV4dCk6IHZvaWQge1xuICBjb25zdCBjdHggPSBnZXRDdHgoKVxuXG4gIGZvciAoY29uc3QgZGVjbCBvZiBkZWNscykge1xuICAgIC8vIEV2YWx1YXRlIGB3aGVuYCBndWFyZCBcdTIwMTQgaWYgYWJzZW50LCBhbHdheXMgZmlyZXNcbiAgICBpZiAoZGVjbC53aGVuKSB7XG4gICAgICBjb25zdCBwYXNzZXMgPSBCb29sZWFuKGV2YWxFeHByKHsgdHlwZTogJ2V4cHInLCByYXc6IGRlY2wud2hlbiB9LCBjdHgpKVxuICAgICAgaWYgKCFwYXNzZXMpIHtcbiAgICAgICAgY29uc29sZS5sb2coYFtMRVNdIG9uLWVudGVyIGd1YXJkIHJlamVjdGVkOiAke2RlY2wud2hlbn1gKVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgIH1cblxuICAgIGV4ZWN1dGUoZGVjbC5ib2R5LCBjdHgpLmNhdGNoKGVyciA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbTEVTXSBFcnJvciBpbiBvbi1lbnRlcjonLCBlcnIpXG4gICAgfSlcbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVFeGl0KGJvZGllczogTEVTTm9kZVtdLCBnZXRDdHg6ICgpID0+IExFU0NvbnRleHQpOiB2b2lkIHtcbiAgY29uc3QgY3R4ID0gZ2V0Q3R4KClcblxuICBmb3IgKGNvbnN0IGJvZHkgb2YgYm9kaWVzKSB7XG4gICAgZXhlY3V0ZShib2R5LCBjdHgpLmNhdGNoKGVyciA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbTEVTXSBFcnJvciBpbiBvbi1leGl0OicsIGVycilcbiAgICB9KVxuICB9XG59XG4iLCAiLyoqXG4gKiBQaGFzZSA1YjogU2lnbmFsIHdhdGNoZXIgd2lyaW5nXG4gKlxuICogPG9uLXNpZ25hbD4gcmVhY3RzIHdoZW5ldmVyIGEgbmFtZWQgRGF0YXN0YXIgc2lnbmFsIGNoYW5nZXMuXG4gKiBUaGUgYHdoZW5gIGd1YXJkIGlzIHJlLWV2YWx1YXRlZCBvbiBldmVyeSBjaGFuZ2UgXHUyMDE0IGlmIGZhbHN5LCB0aGVcbiAqIGhhbmRsZSBib2R5IGRvZXMgbm90IHJ1biAobm90IGFuIGVycm9yLCBqdXN0IGZpbHRlcmVkIG91dCkuXG4gKlxuICogSW4gUGhhc2UgNSB3ZSB1c2UgYSBzaW1wbGUgbG9jYWwgbm90aWZpY2F0aW9uIHBhdGg6IHdoZW5ldmVyXG4gKiBMb2NhbEV2ZW50U2NyaXB0Ll9zZXRTaWduYWwoKSB3cml0ZXMgYSB2YWx1ZSwgaXQgY2FsbHMgaW50b1xuICogbm90aWZ5U2lnbmFsV2F0Y2hlcnMoKS4gVGhpcyBoYW5kbGVzIHRoZSBmYWxsYmFjayAobm8gRGF0YXN0YXIpIGNhc2UuXG4gKlxuICogUGhhc2UgNiByZXBsYWNlcyB0aGUgbm90aWZpY2F0aW9uIHBhdGggd2l0aCBEYXRhc3RhcidzIGVmZmVjdCgpIHN5c3RlbSxcbiAqIHdoaWNoIGlzIG1vcmUgZWZmaWNpZW50IChiYXRjaGVkLCBkZWR1cGVkLCByZWFjdGl2ZSBncmFwaC1hd2FyZSkuXG4gKlxuICogVGhlIHdhdGNoZXIgZmlyZXMgdGhlIGJvZHkgYXN5bmNocm9ub3VzbHkgKG5vbi1ibG9ja2luZykgdG8gbWF0Y2hcbiAqIHRoZSBiZWhhdmlvdXIgb2YgRGF0YXN0YXIncyByZWFjdGl2ZSBlZmZlY3RzLlxuICovXG5cbmltcG9ydCB7IGV4ZWN1dGUsIGV2YWxFeHByIH0gZnJvbSAnLi9leGVjdXRvci5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29udGV4dCB9IGZyb20gJy4vZXhlY3V0b3IuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuZXhwb3J0IGludGVyZmFjZSBTaWduYWxXYXRjaGVyRGVjbCB7XG4gIC8qKiBTaWduYWwgbmFtZSB3aXRoICQgcHJlZml4OiBcIiRmZWVkU3RhdGVcIiAqL1xuICBzaWduYWw6IHN0cmluZ1xuICAvKiogT3B0aW9uYWwgZ3VhcmQgZXhwcmVzc2lvbiBcdTIwMTQgbnVsbCBtZWFucyBhbHdheXMgZmlyZXMgKi9cbiAgd2hlbjogc3RyaW5nIHwgbnVsbFxuICBib2R5OiBMRVNOb2RlXG59XG5cbi8qKlxuICogQ2hlY2tzIGFsbCBzaWduYWwgd2F0Y2hlcnMgdG8gc2VlIGlmIGFueSBzaG91bGQgZmlyZSBmb3IgdGhlXG4gKiBnaXZlbiBzaWduYWwgbmFtZSBjaGFuZ2UuXG4gKlxuICogQ2FsbGVkIGZyb20gTG9jYWxFdmVudFNjcmlwdC5fc2V0U2lnbmFsKCkgYWZ0ZXIgZXZlcnkgd3JpdGUuXG4gKiBBbHNvIGNhbGxlZCBmcm9tIFBoYXNlIDYgRGF0YXN0YXIgZWZmZWN0KCkgc3Vic2NyaXB0aW9ucy5cbiAqXG4gKiBAcGFyYW0gY2hhbmdlZFNpZ25hbCAgVGhlIHNpZ25hbCBuYW1lICp3aXRob3V0KiB0aGUgJCBwcmVmaXhcbiAqIEBwYXJhbSB3YXRjaGVycyAgICAgICBBbGwgb24tc2lnbmFsIGRlY2xhcmF0aW9ucyBmb3IgdGhpcyBMRVMgaW5zdGFuY2VcbiAqIEBwYXJhbSBnZXRDdHggICAgICAgICBSZXR1cm5zIHRoZSBjdXJyZW50IGV4ZWN1dGlvbiBjb250ZXh0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3RpZnlTaWduYWxXYXRjaGVycyhcbiAgY2hhbmdlZFNpZ25hbDogc3RyaW5nLFxuICB3YXRjaGVyczogU2lnbmFsV2F0Y2hlckRlY2xbXSxcbiAgZ2V0Q3R4OiAoKSA9PiBMRVNDb250ZXh0XG4pOiB2b2lkIHtcbiAgZm9yIChjb25zdCB3YXRjaGVyIG9mIHdhdGNoZXJzKSB7XG4gICAgLy8gTm9ybWFsaXplOiBzdHJpcCBsZWFkaW5nICQgZm9yIGNvbXBhcmlzb25cbiAgICBjb25zdCB3YXRjaGVkS2V5ID0gd2F0Y2hlci5zaWduYWwucmVwbGFjZSgvXlxcJC8sICcnKVxuXG4gICAgaWYgKHdhdGNoZWRLZXkgIT09IGNoYW5nZWRTaWduYWwpIGNvbnRpbnVlXG5cbiAgICBjb25zdCBjdHggPSBnZXRDdHgoKVxuXG4gICAgLy8gRXZhbHVhdGUgYHdoZW5gIGd1YXJkXG4gICAgaWYgKHdhdGNoZXIud2hlbikge1xuICAgICAgY29uc3QgcGFzc2VzID0gQm9vbGVhbihldmFsRXhwcih7IHR5cGU6ICdleHByJywgcmF3OiB3YXRjaGVyLndoZW4gfSwgY3R4KSlcbiAgICAgIGlmICghcGFzc2VzKSBjb250aW51ZVxuICAgIH1cblxuICAgIC8vIEZpcmUgdGhlIGJvZHkgYXN5bmNocm9ub3VzbHkgXHUyMDE0IGRvbid0IGJsb2NrIHRoZSBzaWduYWwgd3JpdGUgcGF0aFxuICAgIGV4ZWN1dGUod2F0Y2hlci5ib2R5LCBjdHgpLmNhdGNoKGVyciA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKGBbTEVTXSBFcnJvciBpbiBvbi1zaWduYWwgXCIke3dhdGNoZXIuc2lnbmFsfVwiOmAsIGVycilcbiAgICB9KVxuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIERhdGFzdGFyLWNvbXBhdGlibGUgZWZmZWN0IHN1YnNjcmlwdGlvbiBmb3Igb25lIHNpZ25hbCB3YXRjaGVyLlxuICogVXNlZCBpbiBQaGFzZSA2IHdoZW4gRGF0YXN0YXIgaXMgcHJlc2VudC5cbiAqXG4gKiBAcGFyYW0gd2F0Y2hlciAgIFRoZSBvbi1zaWduYWwgZGVjbGFyYXRpb25cbiAqIEBwYXJhbSBlZmZlY3QgICAgRGF0YXN0YXIncyBlZmZlY3QoKSBmdW5jdGlvblxuICogQHBhcmFtIGdldEN0eCAgICBSZXR1cm5zIHRoZSBjdXJyZW50IGV4ZWN1dGlvbiBjb250ZXh0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXJlU2lnbmFsV2F0Y2hlclZpYURhdGFzdGFyKFxuICB3YXRjaGVyOiBTaWduYWxXYXRjaGVyRGVjbCxcbiAgZWZmZWN0OiAoZm46ICgpID0+IHZvaWQpID0+IHZvaWQsXG4gIGdldEN0eDogKCkgPT4gTEVTQ29udGV4dFxuKTogdm9pZCB7XG4gIGVmZmVjdCgoKSA9PiB7XG4gICAgY29uc3QgY3R4ID0gZ2V0Q3R4KClcblxuICAgIC8vIFJlYWRpbmcgdGhlIHNpZ25hbCBpbnNpZGUgYW4gZWZmZWN0KCkgYXV0by1zdWJzY3JpYmVzIHVzIHRvIGl0XG4gICAgY29uc3Qgc2lnbmFsS2V5ID0gd2F0Y2hlci5zaWduYWwucmVwbGFjZSgvXlxcJC8sICcnKVxuICAgIGN0eC5nZXRTaWduYWwoc2lnbmFsS2V5KSAvLyBzdWJzY3JpcHRpb24gc2lkZS1lZmZlY3RcblxuICAgIGlmICh3YXRjaGVyLndoZW4pIHtcbiAgICAgIGNvbnN0IHBhc3NlcyA9IEJvb2xlYW4oZXZhbEV4cHIoeyB0eXBlOiAnZXhwcicsIHJhdzogd2F0Y2hlci53aGVuIH0sIGN0eCkpXG4gICAgICBpZiAoIXBhc3NlcykgcmV0dXJuXG4gICAgfVxuXG4gICAgZXhlY3V0ZSh3YXRjaGVyLmJvZHksIGN0eCkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFtMRVNdIEVycm9yIGluIG9uLXNpZ25hbCBcIiR7d2F0Y2hlci5zaWduYWx9XCIgKERhdGFzdGFyKTpgLCBlcnIpXG4gICAgfSlcbiAgfSlcbn1cbiIsICJpbXBvcnQgeyBDb21tYW5kUmVnaXN0cnkgfSBmcm9tICdAcnVudGltZS9yZWdpc3RyeS5qcydcbmltcG9ydCB7IE1vZHVsZVJlZ2lzdHJ5LCBsb2FkTW9kdWxlIH0gZnJvbSAnQG1vZHVsZXMvdHlwZXMuanMnXG5pbXBvcnQgeyByZWFkQ29uZmlnLCBsb2dDb25maWcgfSBmcm9tICdAcGFyc2VyL3JlYWRlci5qcydcbmltcG9ydCB7IHBhcnNlTEVTIH0gZnJvbSAnQHBhcnNlci9pbmRleC5qcydcbmltcG9ydCB7IGJ1aWxkQ29udGV4dCwgcmVnaXN0ZXJDb21tYW5kcywgd2lyZUV2ZW50SGFuZGxlcnMsIGZpcmVPbkxvYWQsIHR5cGUgUGFyc2VkV2lyaW5nIH0gZnJvbSAnQHJ1bnRpbWUvd2lyaW5nLmpzJ1xuaW1wb3J0IHsgd2lyZUludGVyc2VjdGlvbk9ic2VydmVyIH0gZnJvbSAnQHJ1bnRpbWUvb2JzZXJ2ZXIuanMnXG5pbXBvcnQgeyBub3RpZnlTaWduYWxXYXRjaGVycywgd2lyZVNpZ25hbFdhdGNoZXJWaWFEYXRhc3RhciB9IGZyb20gJ0BydW50aW1lL3NpZ25hbHMuanMnXG5pbXBvcnQgdHlwZSB7IExFU0NvbmZpZyB9IGZyb20gJ0BwYXJzZXIvY29uZmlnLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNOb2RlIH0gZnJvbSAnQHBhcnNlci9hc3QuanMnXG5pbXBvcnQgdHlwZSB7IExFU0NvbnRleHQgfSBmcm9tICdAcnVudGltZS9leGVjdXRvci5qcydcblxuZXhwb3J0IGNsYXNzIExvY2FsRXZlbnRTY3JpcHQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIHJlYWRvbmx5IGNvbW1hbmRzID0gbmV3IENvbW1hbmRSZWdpc3RyeSgpXG4gIHJlYWRvbmx5IG1vZHVsZXMgID0gbmV3IE1vZHVsZVJlZ2lzdHJ5KClcblxuICBwcml2YXRlIF9jb25maWc6ICBMRVNDb25maWcgfCBudWxsICA9IG51bGxcbiAgcHJpdmF0ZSBfd2lyaW5nOiAgUGFyc2VkV2lyaW5nIHwgbnVsbCA9IG51bGxcbiAgcHJpdmF0ZSBfY3R4OiAgICAgTEVTQ29udGV4dCB8IG51bGwgPSBudWxsXG5cbiAgLy8gQ2xlYW51cCBmbnMgYWNjdW11bGF0ZWQgZHVyaW5nIF9pbml0IFx1MjAxNCBhbGwgY2FsbGVkIGluIF90ZWFyZG93blxuICBwcml2YXRlIF9jbGVhbnVwczogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXVxuXG4gIC8vIFNpbXBsZSBmYWxsYmFjayBzaWduYWwgc3RvcmUgKERhdGFzdGFyIGJyaWRnZSByZXBsYWNlcyByZWFkcy93cml0ZXMgaW4gUGhhc2UgNilcbiAgcHJpdmF0ZSBfc2lnbmFsczogTWFwPHN0cmluZywgdW5rbm93bj4gPSBuZXcgTWFwKClcblxuICAvLyBEYXRhc3RhciBicmlkZ2UgKHBvcHVsYXRlZCBpbiBQaGFzZSA2IHZpYSBhdHRyaWJ1dGUgcGx1Z2luKVxuICBwcml2YXRlIF9kc0VmZmVjdDogKChmbjogKCkgPT4gdm9pZCkgPT4gdm9pZCkgfCB1bmRlZmluZWQgPSB1bmRlZmluZWRcbiAgcHJpdmF0ZSBfZHNTaWduYWw6ICg8VD4obmFtZTogc3RyaW5nLCBpbml0PzogVCkgPT4geyB2YWx1ZTogVCB9KSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZFxuXG4gIGdldCBjb25maWcoKTogIExFU0NvbmZpZyB8IG51bGwgICAgeyByZXR1cm4gdGhpcy5fY29uZmlnIH1cbiAgZ2V0IHdpcmluZygpOiAgUGFyc2VkV2lyaW5nIHwgbnVsbCB7IHJldHVybiB0aGlzLl93aXJpbmcgfVxuICBnZXQgY29udGV4dCgpOiBMRVNDb250ZXh0IHwgbnVsbCAgIHsgcmV0dXJuIHRoaXMuX2N0eCB9XG5cbiAgc3RhdGljIGdldCBvYnNlcnZlZEF0dHJpYnV0ZXMoKTogc3RyaW5nW10geyByZXR1cm4gW10gfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIHF1ZXVlTWljcm90YXNrKCgpID0+IHRoaXMuX2luaXQoKSlcbiAgfVxuXG4gIGRpc2Nvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIHRoaXMuX3RlYXJkb3duKClcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBJbnRlcm5hbCBsaWZlY3ljbGUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBhc3luYyBfaW5pdCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPGxvY2FsLWV2ZW50LXNjcmlwdD4gaW5pdGlhbGl6aW5nJywgdGhpcy5pZCB8fCAnKG5vIGlkKScpXG5cbiAgICAvLyBQcmUtc2VlZCBsb2NhbCBzaWduYWwgc3RvcmUgZnJvbSBkYXRhLXNpZ25hbHM6KiBhdHRyaWJ1dGVzLlxuICAgIC8vIFRoZSBJbnRlcnNlY3Rpb25PYnNlcnZlciBjYW4gZmlyZSBiZWZvcmUgRGF0YXN0YXIncyBhc3luYyBwbHVnaW4gY29ubmVjdHMsXG4gICAgLy8gc28gZ3VhcmQgZXhwcmVzc2lvbnMgbGlrZSBgJGludHJvU3RhdGUgPT0gJ2hpZGRlbidgIHdvdWxkIGV2YWx1YXRlIHRvXG4gICAgLy8gYHVuZGVmaW5lZCA9PSAnaGlkZGVuJ2AgXHUyMTkyIGZhbHNlIHdpdGhvdXQgdGhpcyBwcmUtc2VlZGluZyBzdGVwLlxuICAgIHRoaXMuX3NlZWRTaWduYWxzRnJvbUF0dHJpYnV0ZXMoKVxuXG4gICAgLy8gUGhhc2UgMTogRE9NIFx1MjE5MiBjb25maWdcbiAgICB0aGlzLl9jb25maWcgPSByZWFkQ29uZmlnKHRoaXMpXG4gICAgbG9nQ29uZmlnKHRoaXMuX2NvbmZpZylcblxuICAgIC8vIFBoYXNlIDg6IGxvYWQgbW9kdWxlcyBiZWZvcmUgcGFyc2luZyBzbyBwcmltaXRpdmUgbmFtZXMgcmVzb2x2ZVxuICAgIGF3YWl0IHRoaXMuX2xvYWRNb2R1bGVzKHRoaXMuX2NvbmZpZylcblxuICAgIC8vIFBoYXNlIDI6IHBhcnNlIGJvZHkgc3RyaW5ncyBcdTIxOTIgQVNUXG4gICAgdGhpcy5fd2lyaW5nID0gdGhpcy5fcGFyc2VBbGwodGhpcy5fY29uZmlnKVxuXG4gICAgLy8gUGhhc2UgNDogYnVpbGQgY29udGV4dCwgcmVnaXN0ZXIgY29tbWFuZHMsIHdpcmUgZXZlbnQgaGFuZGxlcnNcbiAgICB0aGlzLl9jdHggPSBidWlsZENvbnRleHQoXG4gICAgICB0aGlzLFxuICAgICAgdGhpcy5jb21tYW5kcyxcbiAgICAgIHRoaXMubW9kdWxlcyxcbiAgICAgIHsgZ2V0OiBrID0+IHRoaXMuX2dldFNpZ25hbChrKSwgc2V0OiAoaywgdikgPT4gdGhpcy5fc2V0U2lnbmFsKGssIHYpIH1cbiAgICApXG5cbiAgICByZWdpc3RlckNvbW1hbmRzKHRoaXMuX3dpcmluZywgdGhpcy5jb21tYW5kcylcblxuICAgIHRoaXMuX2NsZWFudXBzLnB1c2goXG4gICAgICB3aXJlRXZlbnRIYW5kbGVycyh0aGlzLl93aXJpbmcsIHRoaXMsICgpID0+IHRoaXMuX2N0eCEpXG4gICAgKVxuXG4gICAgLy8gUGhhc2UgNWE6IEludGVyc2VjdGlvbk9ic2VydmVyIGZvciBvbi1lbnRlciAvIG9uLWV4aXRcbiAgICB0aGlzLl9jbGVhbnVwcy5wdXNoKFxuICAgICAgd2lyZUludGVyc2VjdGlvbk9ic2VydmVyKFxuICAgICAgICB0aGlzLFxuICAgICAgICB0aGlzLl93aXJpbmcubGlmZWN5Y2xlLm9uRW50ZXIsXG4gICAgICAgIHRoaXMuX3dpcmluZy5saWZlY3ljbGUub25FeGl0LFxuICAgICAgICAoKSA9PiB0aGlzLl9jdHghXG4gICAgICApXG4gICAgKVxuXG4gICAgLy8gUGhhc2UgNWI6IHNpZ25hbCB3YXRjaGVyc1xuICAgIC8vIElmIERhdGFzdGFyIGlzIGNvbm5lY3RlZCB1c2UgaXRzIHJlYWN0aXZlIGVmZmVjdCgpIHN5c3RlbTtcbiAgICAvLyBvdGhlcndpc2UgdGhlIGxvY2FsIF9zZXRTaWduYWwgcGF0aCBjYWxscyBub3RpZnlTaWduYWxXYXRjaGVycyBkaXJlY3RseS5cbiAgICBpZiAodGhpcy5fZHNFZmZlY3QpIHtcbiAgICAgIGZvciAoY29uc3Qgd2F0Y2hlciBvZiB0aGlzLl93aXJpbmcud2F0Y2hlcnMpIHtcbiAgICAgICAgd2lyZVNpZ25hbFdhdGNoZXJWaWFEYXRhc3Rhcih3YXRjaGVyLCB0aGlzLl9kc0VmZmVjdCwgKCkgPT4gdGhpcy5fY3R4ISlcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSB3aXJlZCAke3RoaXMuX3dpcmluZy53YXRjaGVycy5sZW5ndGh9IHNpZ25hbCB3YXRjaGVycyB2aWEgRGF0YXN0YXJgKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZyhgW0xFU10gd2lyZWQgJHt0aGlzLl93aXJpbmcud2F0Y2hlcnMubGVuZ3RofSBzaWduYWwgd2F0Y2hlcnMgKGxvY2FsIGZhbGxiYWNrKWApXG4gICAgfVxuXG4gICAgLy8gUGhhc2UgNjogRGF0YXN0YXIgYnJpZGdlIGZ1bGwgYWN0aXZhdGlvbiBcdTIwMTQgY29taW5nIG5leHRcblxuICAgIC8vIG9uLWxvYWQgZmlyZXMgbGFzdCwgYWZ0ZXIgZXZlcnl0aGluZyBpcyB3aXJlZFxuICAgIGF3YWl0IGZpcmVPbkxvYWQodGhpcy5fd2lyaW5nLCAoKSA9PiB0aGlzLl9jdHghKVxuXG4gICAgY29uc29sZS5sb2coJ1tMRVNdIHJlYWR5OicsIHRoaXMuaWQgfHwgJyhubyBpZCknKVxuICB9XG5cbiAgcHJpdmF0ZSBfdGVhcmRvd24oKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGRpc2Nvbm5lY3RlZCcsIHRoaXMuaWQgfHwgJyhubyBpZCknKVxuICAgIGZvciAoY29uc3QgY2xlYW51cCBvZiB0aGlzLl9jbGVhbnVwcykgY2xlYW51cCgpXG4gICAgdGhpcy5fY2xlYW51cHMgPSBbXVxuICAgIHRoaXMuX2NvbmZpZyAgID0gbnVsbFxuICAgIHRoaXMuX3dpcmluZyAgID0gbnVsbFxuICAgIHRoaXMuX2N0eCAgICAgID0gbnVsbFxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFNpZ25hbCBzdG9yZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKipcbiAgICogUmVhZHMgYWxsIGRhdGEtc2lnbmFsczpLRVk9XCJWQUxVRVwiIGF0dHJpYnV0ZXMgb24gdGhlIGhvc3QgZWxlbWVudCBhbmRcbiAgICogcHJlLXBvcHVsYXRlcyB0aGUgbG9jYWwgX3NpZ25hbHMgTWFwIHdpdGggdGhlaXIgaW5pdGlhbCB2YWx1ZXMuXG4gICAqXG4gICAqIERhdGFzdGFyIGV2YWx1YXRlcyB0aGVzZSBhcyBKUyBleHByZXNzaW9ucyAoZS5nLiBcIidoaWRkZW4nXCIgXHUyMTkyIFwiaGlkZGVuXCIsXG4gICAqIFwiMFwiIFx1MjE5MiAwLCBcIltdXCIgXHUyMTkyIFtdKS4gV2UgZG8gdGhlIHNhbWUgd2l0aCBhIHNpbXBsZSBldmFsLlxuICAgKlxuICAgKiBUaGlzIHJ1bnMgc3luY2hyb25vdXNseSBiZWZvcmUgYW55IGFzeW5jIG9wZXJhdGlvbnMgc28gdGhhdCB0aGVcbiAgICogSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgXHUyMDE0IHdoaWNoIG1heSBmaXJlIGJlZm9yZSBEYXRhc3RhciBjb25uZWN0cyBcdTIwMTQgc2Vlc1xuICAgKiB0aGUgY29ycmVjdCBpbml0aWFsIHNpZ25hbCB2YWx1ZXMgd2hlbiBldmFsdWF0aW5nIGB3aGVuYCBndWFyZHMuXG4gICAqL1xuICBwcml2YXRlIF9zZWVkU2lnbmFsc0Zyb21BdHRyaWJ1dGVzKCk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgYXR0ciBvZiBBcnJheS5mcm9tKHRoaXMuYXR0cmlidXRlcykpIHtcbiAgICAgIC8vIE1hdGNoIGRhdGEtc2lnbmFsczpLRVkgb3IgZGF0YS1zdGFyLXNpZ25hbHM6S0VZIChhbGlhc2VkIGJ1bmRsZSlcbiAgICAgIGNvbnN0IG0gPSBhdHRyLm5hbWUubWF0Y2goL15kYXRhLSg/OnN0YXItKT9zaWduYWxzOiguKykkLylcbiAgICAgIGlmICghbSkgY29udGludWVcbiAgICAgIGNvbnN0IGtleSA9IG1bMV0hXG4gICAgICAgIC5yZXBsYWNlKC8tKFthLXpdKS9nLCAoXywgY2g6IHN0cmluZykgPT4gY2gudG9VcHBlckNhc2UoKSkgLy8ga2ViYWItY2FzZSBcdTIxOTIgY2FtZWxDYXNlXG4gICAgICB0cnkge1xuICAgICAgICAvLyBFdmFsdWF0ZSB0aGUgYXR0cmlidXRlIHZhbHVlIGFzIGEgSlMgZXhwcmVzc2lvbiAoc2FtZSBhcyBEYXRhc3RhciBkb2VzKVxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tbmV3LWZ1bmNcbiAgICAgICAgY29uc3QgdmFsdWUgPSBuZXcgRnVuY3Rpb24oYHJldHVybiAoJHthdHRyLnZhbHVlfSlgKSgpXG4gICAgICAgIHRoaXMuX3NpZ25hbHMuc2V0KGtleSwgdmFsdWUpXG4gICAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSBzZWVkZWQgJCR7a2V5fSA9YCwgdmFsdWUpXG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLy8gSWYgaXQgZmFpbHMsIHN0b3JlIHRoZSByYXcgc3RyaW5nIHZhbHVlXG4gICAgICAgIHRoaXMuX3NpZ25hbHMuc2V0KGtleSwgYXR0ci52YWx1ZSlcbiAgICAgICAgY29uc29sZS5sb2coYFtMRVNdIHNlZWRlZCAkJHtrZXl9ID0gKHJhdylgLCBhdHRyLnZhbHVlKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2dldFNpZ25hbChuYW1lOiBzdHJpbmcpOiB1bmtub3duIHtcbiAgICAvLyBQaGFzZSA2OiBwcmVmZXIgRGF0YXN0YXIgc2lnbmFsIHRyZWUgd2hlbiBicmlkZ2UgaXMgY29ubmVjdGVkXG4gICAgaWYgKHRoaXMuX2RzU2lnbmFsKSB7XG4gICAgICB0cnkgeyByZXR1cm4gdGhpcy5fZHNTaWduYWwobmFtZSkudmFsdWUgfSBjYXRjaCB7IC8qIGZhbGwgdGhyb3VnaCAqLyB9XG4gICAgfVxuICAgIC8vIFRyeSBleGFjdCBjYXNlIGZpcnN0IChlLmcuIERhdGFzdGFyLXNldCBzaWduYWxzIGFyZSBjYW1lbENhc2UpLlxuICAgIC8vIEZhbGwgYmFjayB0byBsb3dlcmNhc2UgYmVjYXVzZSBIVE1MIG5vcm1hbGl6ZXMgYXR0cmlidXRlIG5hbWVzIHRvIGxvd2VyY2FzZSxcbiAgICAvLyBzbyBkYXRhLXNpZ25hbHM6aW50cm9TdGF0ZSBcdTIxOTIgc2VlZGVkIGFzIFwiaW50cm9zdGF0ZVwiLCBidXQgZ3VhcmRzIHJlZmVyZW5jZSBcIiRpbnRyb1N0YXRlXCIuXG4gICAgaWYgKHRoaXMuX3NpZ25hbHMuaGFzKG5hbWUpKSByZXR1cm4gdGhpcy5fc2lnbmFscy5nZXQobmFtZSlcbiAgICBpZiAodGhpcy5fc2lnbmFscy5oYXMobmFtZS50b0xvd2VyQ2FzZSgpKSkgcmV0dXJuIHRoaXMuX3NpZ25hbHMuZ2V0KG5hbWUudG9Mb3dlckNhc2UoKSlcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cblxuICBwcml2YXRlIF9zZXRTaWduYWwobmFtZTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIGNvbnN0IHByZXYgPSB0aGlzLl9zaWduYWxzLmdldChuYW1lKVxuICAgIHRoaXMuX3NpZ25hbHMuc2V0KG5hbWUsIHZhbHVlKVxuICAgIGNvbnNvbGUubG9nKGBbTEVTXSAkJHtuYW1lfSA9YCwgdmFsdWUpXG5cbiAgICAvLyBQaGFzZSA2OiB3cml0ZSB0aHJvdWdoIHRvIERhdGFzdGFyJ3MgcmVhY3RpdmUgZ3JhcGhcbiAgICBpZiAodGhpcy5fZHNTaWduYWwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHNpZyA9IHRoaXMuX2RzU2lnbmFsPHVua25vd24+KG5hbWUsIHZhbHVlKVxuICAgICAgICBzaWcudmFsdWUgPSB2YWx1ZVxuICAgICAgfSBjYXRjaCB7IC8qIHNpZ25hbCBtYXkgbm90IGV4aXN0IGluIERhdGFzdGFyIHlldCAqLyB9XG4gICAgfVxuXG4gICAgLy8gUGhhc2UgNWI6IG5vdGlmeSBsb2NhbCBzaWduYWwgd2F0Y2hlcnMgKGZhbGxiYWNrIHBhdGggd2hlbiBEYXRhc3RhciBhYnNlbnQpXG4gICAgaWYgKHByZXYgIT09IHZhbHVlICYmIHRoaXMuX3dpcmluZyAmJiB0aGlzLl9jdHggJiYgIXRoaXMuX2RzRWZmZWN0KSB7XG4gICAgICBub3RpZnlTaWduYWxXYXRjaGVycyhuYW1lLCB0aGlzLl93aXJpbmcud2F0Y2hlcnMsICgpID0+IHRoaXMuX2N0eCEpXG4gICAgfVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIE1vZHVsZSBsb2FkaW5nIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgYXN5bmMgX2xvYWRNb2R1bGVzKGNvbmZpZzogTEVTQ29uZmlnKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKGNvbmZpZy5tb2R1bGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICBjb25maWcubW9kdWxlcy5tYXAoZGVjbCA9PlxuICAgICAgICBsb2FkTW9kdWxlKHRoaXMubW9kdWxlcywge1xuICAgICAgICAgIC4uLihkZWNsLnR5cGUgPyB7IHR5cGU6IGRlY2wudHlwZSB9IDoge30pLFxuICAgICAgICAgIC4uLihkZWNsLnNyYyAgPyB7IHNyYzogIGRlY2wuc3JjICB9IDoge30pLFxuICAgICAgICB9KS5jYXRjaChlcnIgPT4gY29uc29sZS53YXJuKCdbTEVTXSBNb2R1bGUgbG9hZCBmYWlsZWQ6JywgZXJyKSlcbiAgICAgIClcbiAgICApXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgUGFyc2UgYWxsIGJvZGllcyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwcml2YXRlIF9wYXJzZUFsbChjb25maWc6IExFU0NvbmZpZyk6IFBhcnNlZFdpcmluZyB7XG4gICAgbGV0IG9rID0gMCwgZmFpbCA9IDBcblxuICAgIGNvbnN0IHRyeVBhcnNlID0gKGJvZHk6IHN0cmluZywgbGFiZWw6IHN0cmluZyk6IExFU05vZGUgPT4ge1xuICAgICAgdHJ5IHsgb2srKzsgcmV0dXJuIHBhcnNlTEVTKGJvZHkpIH1cbiAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgIGZhaWwrK1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbTEVTXSBQYXJzZSBlcnJvciBpbiAke2xhYmVsfTpgLCBlKVxuICAgICAgICByZXR1cm4geyB0eXBlOiAnZXhwcicsIHJhdzogJycgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHdpcmluZzogUGFyc2VkV2lyaW5nID0ge1xuICAgICAgY29tbWFuZHM6IGNvbmZpZy5jb21tYW5kcy5tYXAoZCA9PiAoe1xuICAgICAgICBuYW1lOiBkLm5hbWUsIGd1YXJkOiBkLmd1YXJkLCBhcmdzUmF3OiBkLmFyZ3NSYXcsXG4gICAgICAgIGJvZHk6IHRyeVBhcnNlKGQuYm9keSwgYGNvbW1hbmQgXCIke2QubmFtZX1cImApLFxuICAgICAgfSkpLFxuICAgICAgaGFuZGxlcnM6IGNvbmZpZy5vbkV2ZW50Lm1hcChkID0+ICh7XG4gICAgICAgIGV2ZW50OiBkLm5hbWUsXG4gICAgICAgIGJvZHk6IHRyeVBhcnNlKGQuYm9keSwgYG9uLWV2ZW50IFwiJHtkLm5hbWV9XCJgKSxcbiAgICAgIH0pKSxcbiAgICAgIHdhdGNoZXJzOiBjb25maWcub25TaWduYWwubWFwKGQgPT4gKHtcbiAgICAgICAgc2lnbmFsOiBkLm5hbWUsIHdoZW46IGQud2hlbixcbiAgICAgICAgYm9keTogdHJ5UGFyc2UoZC5ib2R5LCBgb24tc2lnbmFsIFwiJHtkLm5hbWV9XCJgKSxcbiAgICAgIH0pKSxcbiAgICAgIGxpZmVjeWNsZToge1xuICAgICAgICBvbkxvYWQ6ICBjb25maWcub25Mb2FkLm1hcChkID0+IHRyeVBhcnNlKGQuYm9keSwgJ29uLWxvYWQnKSksXG4gICAgICAgIG9uRW50ZXI6IGNvbmZpZy5vbkVudGVyLm1hcChkID0+ICh7IHdoZW46IGQud2hlbiwgYm9keTogdHJ5UGFyc2UoZC5ib2R5LCAnb24tZW50ZXInKSB9KSksXG4gICAgICAgIG9uRXhpdDogIGNvbmZpZy5vbkV4aXQubWFwKGQgPT4gdHJ5UGFyc2UoZC5ib2R5LCAnb24tZXhpdCcpKSxcbiAgICAgIH0sXG4gICAgfVxuXG4gICAgY29uc3QgdG90YWwgPSBvayArIGZhaWxcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gcGFyc2VyOiAke29rfS8ke3RvdGFsfSBib2RpZXMgcGFyc2VkIHN1Y2Nlc3NmdWxseSR7ZmFpbCA+IDAgPyBgICgke2ZhaWx9IGVycm9ycylgIDogJyd9YClcbiAgICByZXR1cm4gd2lyaW5nXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgRGF0YXN0YXIgYnJpZGdlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIGNvbm5lY3REYXRhc3RhcihmbnM6IHtcbiAgICBlZmZlY3Q6IChmbjogKCkgPT4gdm9pZCkgPT4gdm9pZFxuICAgIHNpZ25hbDogPFQ+KG5hbWU6IHN0cmluZywgaW5pdD86IFQpID0+IHsgdmFsdWU6IFQgfVxuICB9KTogdm9pZCB7XG4gICAgdGhpcy5fZHNFZmZlY3QgPSBmbnMuZWZmZWN0XG4gICAgdGhpcy5fZHNTaWduYWwgPSBmbnMuc2lnbmFsXG4gICAgY29uc29sZS5sb2coJ1tMRVNdIERhdGFzdGFyIGJyaWRnZSBjb25uZWN0ZWQnLCB0aGlzLmlkKVxuICB9XG5cbiAgZGlzY29ubmVjdERhdGFzdGFyKCk6IHZvaWQge1xuICAgIHRoaXMuX2RzRWZmZWN0ID0gdW5kZWZpbmVkXG4gICAgdGhpcy5fZHNTaWduYWwgPSB1bmRlZmluZWRcbiAgfVxuXG4gIGdldCBkc0VmZmVjdCgpIHsgcmV0dXJuIHRoaXMuX2RzRWZmZWN0IH1cbiAgZ2V0IGRzU2lnbmFsKCkgIHsgcmV0dXJuIHRoaXMuX2RzU2lnbmFsIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgUHVibGljIEFQSSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKiogRmlyZSBhIG5hbWVkIGxvY2FsIGV2ZW50IGludG8gdGhpcyBMRVMgaW5zdGFuY2UgZnJvbSBvdXRzaWRlLiAqL1xuICBmaXJlKGV2ZW50OiBzdHJpbmcsIHBheWxvYWQ6IHVua25vd25bXSA9IFtdKTogdm9pZCB7XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudChldmVudCwge1xuICAgICAgZGV0YWlsOiB7IHBheWxvYWQgfSwgYnViYmxlczogZmFsc2UsIGNvbXBvc2VkOiBmYWxzZSxcbiAgICB9KSlcbiAgfVxuXG4gIC8qKiBDYWxsIGEgY29tbWFuZCBieSBuYW1lIGZyb20gb3V0c2lkZSAoZS5nLiBicm93c2VyIGNvbnNvbGUsIHRlc3RzKS4gKi9cbiAgYXN5bmMgY2FsbChjb21tYW5kOiBzdHJpbmcsIGFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge30pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuX2N0eCkgeyBjb25zb2xlLndhcm4oJ1tMRVNdIG5vdCBpbml0aWFsaXplZCB5ZXQnKTsgcmV0dXJuIH1cbiAgICBjb25zdCB7IHJ1bkNvbW1hbmQgfSA9IGF3YWl0IGltcG9ydCgnQHJ1bnRpbWUvZXhlY3V0b3IuanMnKVxuICAgIGF3YWl0IHJ1bkNvbW1hbmQoY29tbWFuZCwgYXJncywgdGhpcy5fY3R4KVxuICB9XG5cbiAgLyoqIFJlYWQgYSBzaWduYWwgdmFsdWUgZGlyZWN0bHkgKGZvciBkZWJ1Z2dpbmcpLiAqL1xuICBzaWduYWwobmFtZTogc3RyaW5nKTogdW5rbm93biB7XG4gICAgcmV0dXJuIHRoaXMuX2dldFNpZ25hbChuYW1lKVxuICB9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnbG9jYWwtZXZlbnQtc2NyaXB0JywgTG9jYWxFdmVudFNjcmlwdClcbiIsICIvKipcbiAqIDxsb2NhbC1jb21tYW5kPiBcdTIwMTQgZGVmaW5lcyBhIG5hbWVkLCBjYWxsYWJsZSBjb21tYW5kIHdpdGhpbiBhIDxsb2NhbC1ldmVudC1zY3JpcHQ+LlxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIG5hbWUgICAgUmVxdWlyZWQuIENvbW1hbmQgbmFtZSwgY29sb24tbmFtZXNwYWNlZDogXCJmZWVkOmZldGNoXCJcbiAqICAgYXJncyAgICBPcHRpb25hbC4gVHlwZWQgYXJndW1lbnQgbGlzdDogXCJbZnJvbTpzdHIgIHRvOnN0cl1cIlxuICogICBndWFyZCAgIE9wdGlvbmFsLiBKUyBleHByZXNzaW9uIFx1MjAxNCBmYWxzeSA9IHNpbGVudCBuby1vcCwgbm8gcmVzY3VlL2FmdGVyd2FyZHNcbiAqICAgZG8gICAgICBSZXF1aXJlZC4gTEVTIGJvZHkgKGJhY2t0aWNrLXF1b3RlZCBmb3IgbXVsdGktbGluZSlcbiAqXG4gKiBUaGlzIGVsZW1lbnQgaXMgcHVyZWx5IGRlY2xhcmF0aXZlIFx1MjAxNCBpdCBob2xkcyBkYXRhLlxuICogVGhlIGhvc3QgPGxvY2FsLWV2ZW50LXNjcmlwdD4gcmVhZHMgaXQgZHVyaW5nIFBoYXNlIDEgYW5kIHJlZ2lzdGVyc1xuICogdGhlIHBhcnNlZCBDb21tYW5kRGVmIGluIGl0cyBDb21tYW5kUmVnaXN0cnkuXG4gKlxuICogTm90ZTogPGNvbW1hbmQ+IHdhcyBhIGRlcHJlY2F0ZWQgSFRNTDUgZWxlbWVudCBcdTIwMTQgd2UgdXNlIDxsb2NhbC1jb21tYW5kPlxuICogdG8gc2F0aXNmeSB0aGUgY3VzdG9tIGVsZW1lbnQgaHlwaGVuIHJlcXVpcmVtZW50IGFuZCBhdm9pZCB0aGUgY29sbGlzaW9uLlxuICovXG5leHBvcnQgY2xhc3MgTG9jYWxDb21tYW5kIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgQXR0cmlidXRlIGFjY2Vzc29ycyAodHlwZWQsIHRyaW1tZWQpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIGdldCBjb21tYW5kTmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIC8qKiBSYXcgYXJncyBzdHJpbmcgZS5nLiBcIltmcm9tOnN0ciAgdG86c3RyXVwiIFx1MjAxNCBwYXJzZWQgYnkgUGhhc2UgMiAqL1xuICBnZXQgYXJnc1JhdygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnYXJncycpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIC8qKiBHdWFyZCBleHByZXNzaW9uIHN0cmluZyBcdTIwMTQgZXZhbHVhdGVkIGJ5IHJ1bnRpbWUgYmVmb3JlIGV4ZWN1dGlvbiAqL1xuICBnZXQgZ3VhcmRFeHByKCk6IHN0cmluZyB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnZ3VhcmQnKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIC8qKiBSYXcgTEVTIGJvZHkgXHUyMDE0IG1heSBiZSBiYWNrdGljay13cmFwcGVkIGZvciBtdWx0aS1saW5lICovXG4gIGdldCBkb0JvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ2RvJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgLy8gUGhhc2UgMDogdmVyaWZ5IGVsZW1lbnQgaXMgcmVjb2duaXplZC5cbiAgICBjb25zb2xlLmxvZygnW0xFU10gPGxvY2FsLWNvbW1hbmQ+IHJlZ2lzdGVyZWQ6JywgdGhpcy5jb21tYW5kTmFtZSB8fCAnKHVubmFtZWQpJylcbiAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ2xvY2FsLWNvbW1hbmQnLCBMb2NhbENvbW1hbmQpXG4iLCAiLyoqXG4gKiA8b24tZXZlbnQ+IFx1MjAxNCBzdWJzY3JpYmVzIHRvIGEgbmFtZWQgQ3VzdG9tRXZlbnQgZGlzcGF0Y2hlZCB3aXRoaW4gdGhlIExFUyBob3N0LlxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIG5hbWUgICAgUmVxdWlyZWQuIEV2ZW50IG5hbWU6IFwiZmVlZDppbml0XCIsIFwiaXRlbTpkaXNtaXNzZWRcIlxuICogICBoYW5kbGUgIFJlcXVpcmVkLiBMRVMgYm9keSBcdTIwMTQgc2luZ2xlLWxpbmUgKG5vIGJhY2t0aWNrcykgb3IgbXVsdGktbGluZSAoYmFja3RpY2tzKVxuICpcbiAqIFBoYXNlIDQgd2lyZXMgYSBDdXN0b21FdmVudCBsaXN0ZW5lciBvbiB0aGUgaG9zdCBlbGVtZW50LlxuICogRXZlbnRzIGZpcmVkIGJ5IGBlbWl0YCBuZXZlciBidWJibGU7IG9ubHkgaGFuZGxlcnMgd2l0aGluIHRoZSBzYW1lXG4gKiA8bG9jYWwtZXZlbnQtc2NyaXB0PiBzZWUgdGhlbS4gVXNlIGBicm9hZGNhc3RgIHRvIGNyb3NzIHRoZSBib3VuZGFyeS5cbiAqL1xuZXhwb3J0IGNsYXNzIE9uRXZlbnQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIGdldCBldmVudE5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICAvKiogUmF3IExFUyBoYW5kbGUgYm9keSAqL1xuICBnZXQgaGFuZGxlQm9keSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnaGFuZGxlJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxvbi1ldmVudD4gcmVnaXN0ZXJlZDonLCB0aGlzLmV2ZW50TmFtZSB8fCAnKHVubmFtZWQpJylcbiAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ29uLWV2ZW50JywgT25FdmVudClcbiIsICIvKipcbiAqIDxvbi1zaWduYWw+IFx1MjAxNCByZWFjdHMgd2hlbmV2ZXIgYSBuYW1lZCBEYXRhc3RhciBzaWduYWwgY2hhbmdlcyB2YWx1ZS5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBuYW1lICAgIFJlcXVpcmVkLiBTaWduYWwgcmVmZXJlbmNlOiBcIiRmZWVkU3RhdGVcIiwgXCIkZmVlZEl0ZW1zXCJcbiAqICAgd2hlbiAgICBPcHRpb25hbC4gR3VhcmQgZXhwcmVzc2lvbiBcdTIwMTQgb25seSBmaXJlcyBoYW5kbGUgd2hlbiB0cnV0aHlcbiAqICAgaGFuZGxlICBSZXF1aXJlZC4gTEVTIGJvZHlcbiAqXG4gKiBQaGFzZSA2IHdpcmVzIHRoaXMgdG8gRGF0YXN0YXIncyBlZmZlY3QoKSBzeXN0ZW0uXG4gKiBVbnRpbCBEYXRhc3RhciBpcyBjb25uZWN0ZWQsIGZhbGxzIGJhY2sgdG8gcG9sbGluZyAoUGhhc2UgNiBkZWNpZGVzKS5cbiAqXG4gKiBUaGUgYHdoZW5gIGd1YXJkIGlzIHJlLWV2YWx1YXRlZCBvbiBldmVyeSBzaWduYWwgY2hhbmdlLlxuICogR3VhcmQgZmFpbHVyZSBpcyBub3QgYW4gZXJyb3IgXHUyMDE0IHRoZSBoYW5kbGUgc2ltcGx5IGRvZXMgbm90IHJ1bi5cbiAqL1xuZXhwb3J0IGNsYXNzIE9uU2lnbmFsIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAvKiogU2lnbmFsIG5hbWUgaW5jbHVkaW5nICQgcHJlZml4OiBcIiRmZWVkU3RhdGVcIiAqL1xuICBnZXQgc2lnbmFsTmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIC8qKiBTaWduYWwgbmFtZSB3aXRob3V0ICQgcHJlZml4LCBmb3IgRGF0YXN0YXIgQVBJIGNhbGxzICovXG4gIGdldCBzaWduYWxLZXkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5zaWduYWxOYW1lLnJlcGxhY2UoL15cXCQvLCAnJylcbiAgfVxuXG4gIGdldCB3aGVuRXhwcigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3doZW4nKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIGdldCBoYW5kbGVCb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdoYW5kbGUnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPG9uLXNpZ25hbD4gcmVnaXN0ZXJlZDonLCB0aGlzLnNpZ25hbE5hbWUgfHwgJyh1bm5hbWVkKScpXG4gIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1zaWduYWwnLCBPblNpZ25hbClcbiIsICIvKipcbiAqIDxvbi1sb2FkPiBcdTIwMTQgZmlyZXMgaXRzIGBydW5gIGJvZHkgb25jZSB3aGVuIHRoZSBob3N0IGNvbm5lY3RzIHRvIHRoZSBET00uXG4gKlxuICogVGltaW5nOiBpZiBkb2N1bWVudC5yZWFkeVN0YXRlID09PSAnY29tcGxldGUnLCBmaXJlcyBpbW1lZGlhdGVseSBpblxuICogY29ubmVjdGVkQ2FsbGJhY2sgKHZpYSBxdWV1ZU1pY3JvdGFzaykuIE90aGVyd2lzZSB3YWl0cyBmb3IgRE9NQ29udGVudExvYWRlZC5cbiAqXG4gKiBSdWxlOiBsaWZlY3ljbGUgaG9va3MgYWx3YXlzIGZpcmUgZXZlbnRzIChgZW1pdGApLCBuZXZlciBjYWxsIGNvbW1hbmRzIGRpcmVjdGx5LlxuICogVGhpcyBrZWVwcyB0aGUgc3lzdGVtIHRyYWNlYWJsZSBcdTIwMTQgZXZlcnkgY29tbWFuZCBpbnZvY2F0aW9uIGhhcyBhbiBldmVudCBpbiBpdHMgaGlzdG9yeS5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBydW4gICBSZXF1aXJlZC4gU2luZ2xlLWxpbmUgTEVTIGJvZHkgKHVzdWFsbHkganVzdCBgZW1pdCBldmVudDpuYW1lYClcbiAqL1xuZXhwb3J0IGNsYXNzIE9uTG9hZCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgZ2V0IHJ1bkJvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8b24tbG9hZD4gcmVnaXN0ZXJlZCwgcnVuOicsIHRoaXMucnVuQm9keSlcbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiA8b24tZW50ZXI+IFx1MjAxNCBmaXJlcyB3aGVuIHRoZSBob3N0IDxsb2NhbC1ldmVudC1zY3JpcHQ+IGVudGVycyB0aGUgdmlld3BvcnQuXG4gKlxuICogVXNlcyBhIHNpbmdsZSBJbnRlcnNlY3Rpb25PYnNlcnZlciBzaGFyZWQgYWNyb3NzIGFsbCA8b24tZW50ZXI+Lzxvbi1leGl0PlxuICogY2hpbGRyZW4gb2YgdGhlIHNhbWUgaG9zdCAoUGhhc2UgNSBjcmVhdGVzIGl0IG9uIHRoZSBob3N0IGVsZW1lbnQpLlxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIHdoZW4gIE9wdGlvbmFsLiBHdWFyZCBleHByZXNzaW9uIFx1MjAxNCBvbmx5IGZpcmVzIHJ1biB3aGVuIHRydXRoeS5cbiAqICAgICAgICAgIFBhdHRlcm46IGB3aGVuPVwiJGZlZWRTdGF0ZSA9PSAncGF1c2VkJ1wiYFxuICogICBydW4gICBSZXF1aXJlZC4gU2luZ2xlLWxpbmUgTEVTIGJvZHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBPbkVudGVyIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBnZXQgd2hlbkV4cHIoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCd3aGVuJyk/LnRyaW0oKSA/PyBudWxsXG4gIH1cblxuICBnZXQgcnVuQm9keSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxvbi1lbnRlcj4gcmVnaXN0ZXJlZCwgd2hlbjonLCB0aGlzLndoZW5FeHByID8/ICdhbHdheXMnKVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIDxvbi1leGl0PiBcdTIwMTQgZmlyZXMgd2hlbiB0aGUgaG9zdCA8bG9jYWwtZXZlbnQtc2NyaXB0PiBleGl0cyB0aGUgdmlld3BvcnQuXG4gKlxuICogTm8gYHdoZW5gIGd1YXJkIFx1MjAxNCBleGl0IGFsd2F5cyBmaXJlcyB1bmNvbmRpdGlvbmFsbHkuXG4gKiAoSWYgeW91IG5lZWQgY29uZGl0aW9uYWwgZXhpdCBiZWhhdmlvciwgcHV0IHRoZSBjb25kaXRpb24gaW4gdGhlIGhhbmRsZXIuKVxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIHJ1biAgIFJlcXVpcmVkLiBTaW5nbGUtbGluZSBMRVMgYm9keS5cbiAqL1xuZXhwb3J0IGNsYXNzIE9uRXhpdCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgZ2V0IHJ1bkJvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8b24tZXhpdD4gcmVnaXN0ZXJlZCwgcnVuOicsIHRoaXMucnVuQm9keSlcbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgUmVnaXN0cmF0aW9uIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ29uLWxvYWQnLCAgT25Mb2FkKVxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1lbnRlcicsIE9uRW50ZXIpXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ29uLWV4aXQnLCAgT25FeGl0KVxuIiwgIi8qKlxuICogPHVzZS1tb2R1bGU+IFx1MjAxNCBkZWNsYXJlcyBhIHZvY2FidWxhcnkgZXh0ZW5zaW9uIGF2YWlsYWJsZSB0byA8bG9jYWwtY29tbWFuZD4gYm9kaWVzLlxuICpcbiAqIE11c3QgYXBwZWFyIGJlZm9yZSBhbnkgPGxvY2FsLWNvbW1hbmQ+IGluIHRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0Pi5cbiAqIFRoZSBob3N0IHJlYWRzIDx1c2UtbW9kdWxlPiBjaGlsZHJlbiBmaXJzdCAoUGhhc2UgOCkgYW5kIHJlZ2lzdGVyc1xuICogdGhlaXIgcHJpbWl0aXZlcyBpbnRvIGl0cyBNb2R1bGVSZWdpc3RyeSBiZWZvcmUgcGFyc2luZyBjb21tYW5kIGJvZGllcy5cbiAqXG4gKiBBdHRyaWJ1dGVzIChpbmRlcGVuZGVudCwgY29tYmluYWJsZSk6XG4gKiAgIHR5cGUgICBCdWlsdC1pbiBtb2R1bGUgbmFtZTogXCJhbmltYXRpb25cIlxuICogICBzcmMgICAgVVJML3BhdGggdG8gYSB1c2VybGFuZCBtb2R1bGUgRVMgbW9kdWxlOiAgXCIuL3Njcm9sbC1lZmZlY3RzLmpzXCJcbiAqICAgICAgICAgIFRoZSBtb2R1bGUgbXVzdCBleHBvcnQgYSBkZWZhdWx0IGNvbmZvcm1pbmcgdG8gTEVTTW9kdWxlOlxuICogICAgICAgICAgeyBuYW1lOiBzdHJpbmcsIHByaW1pdGl2ZXM6IFJlY29yZDxzdHJpbmcsIExFU1ByaW1pdGl2ZT4gfVxuICpcbiAqIEV4YW1wbGVzOlxuICogICA8dXNlLW1vZHVsZSB0eXBlPVwiYW5pbWF0aW9uXCI+PC91c2UtbW9kdWxlPlxuICogICA8dXNlLW1vZHVsZSBzcmM9XCIuL3Njcm9sbC1lZmZlY3RzLmpzXCI+PC91c2UtbW9kdWxlPlxuICogICA8dXNlLW1vZHVsZSBzcmM9XCIuL3NwcmluZy1waHlzaWNzLmpzXCI+PC91c2UtbW9kdWxlPlxuICpcbiAqIHR5cGU9IGFuZCBzcmM9IG1heSBhcHBlYXIgdG9nZXRoZXIgb24gb25lIGVsZW1lbnQgaWYgdGhlIHVzZXJsYW5kIG1vZHVsZVxuICogd2FudHMgdG8gZGVjbGFyZSBpdHMgdHlwZSBoaW50IGZvciB0b29saW5nIChub3QgY3VycmVudGx5IHJlcXVpcmVkKS5cbiAqL1xuZXhwb3J0IGNsYXNzIFVzZU1vZHVsZSBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgLyoqIEJ1aWx0LWluIG1vZHVsZSB0eXBlIGUuZy4gXCJhbmltYXRpb25cIiAqL1xuICBnZXQgbW9kdWxlVHlwZSgpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3R5cGUnKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIC8qKiBVc2VybGFuZCBtb2R1bGUgVVJMIGUuZy4gXCIuL3Njcm9sbC1lZmZlY3RzLmpzXCIgKi9cbiAgZ2V0IG1vZHVsZVNyYygpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3NyYycpPy50cmltKCkgPz8gbnVsbFxuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc3QgZGVzYyA9IHRoaXMubW9kdWxlVHlwZVxuICAgICAgPyBgdHlwZT1cIiR7dGhpcy5tb2R1bGVUeXBlfVwiYFxuICAgICAgOiB0aGlzLm1vZHVsZVNyY1xuICAgICAgICA/IGBzcmM9XCIke3RoaXMubW9kdWxlU3JjfVwiYFxuICAgICAgICA6ICcobm8gdHlwZSBvciBzcmMpJ1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8dXNlLW1vZHVsZT4gZGVjbGFyZWQ6JywgZGVzYylcbiAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3VzZS1tb2R1bGUnLCBVc2VNb2R1bGUpXG4iLCAiLyoqXG4gKiBQaGFzZSA2OiBEYXRhc3RhciBhdHRyaWJ1dGUgcGx1Z2luXG4gKlxuICogUmVnaXN0ZXJzIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGFzIGEgRGF0YXN0YXIgYXR0cmlidXRlIHBsdWdpbiBzbyB0aGF0OlxuICpcbiAqICAgMS4gRGF0YXN0YXIncyBlZmZlY3QoKSBhbmQgc2lnbmFsKCkgcHJpbWl0aXZlcyBhcmUgaGFuZGVkIHRvIHRoZSBob3N0XG4gKiAgICAgIGVsZW1lbnQsIGVuYWJsaW5nIHByb3BlciByZWFjdGl2ZSBzaWduYWwgd2F0Y2hpbmcgdmlhIHRoZSBkZXBlbmRlbmN5XG4gKiAgICAgIGdyYXBoIHJhdGhlciB0aGFuIG1hbnVhbCBub3RpZmljYXRpb24uXG4gKlxuICogICAyLiBTaWduYWwgd3JpdGVzIGZyb20gYHNldCAkeCB0byB5YCBpbiBMRVMgcHJvcGFnYXRlIGludG8gRGF0YXN0YXInc1xuICogICAgICByb290IG9iamVjdCBzbyBkYXRhLXRleHQsIGRhdGEtc2hvdywgZXRjLiB1cGRhdGUgcmVhY3RpdmVseS5cbiAqXG4gKiAgIDMuICQtcHJlZml4ZWQgc2lnbmFscyBpbiBMRVMgZXhwcmVzc2lvbnMgcmVzb2x2ZSBmcm9tIERhdGFzdGFyJ3Mgcm9vdCxcbiAqICAgICAgZ2l2aW5nIExFUyBmdWxsIHJlYWQgYWNjZXNzIHRvIGFsbCBEYXRhc3RhciBzdGF0ZS5cbiAqXG4gKiAgIDQuIFNpZ25hbCB3YXRjaGVycyBvbi1zaWduYWwgYXJlIHJlLXdpcmVkIHRocm91Z2ggRGF0YXN0YXIncyBlZmZlY3QoKVxuICogICAgICBzeXN0ZW0gZm9yIHByb3BlciBiYXRjaGluZyBhbmQgZGVkdXBsaWNhdGlvbi5cbiAqXG4gKiBMRVMgd29ya3Mgd2l0aG91dCBEYXRhc3RhciAoc3RhbmRhbG9uZSBtb2RlKS4gVGhlIGJyaWRnZSBpcyBwdXJlbHkgYWRkaXRpdmUuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBMb2NhbEV2ZW50U2NyaXB0IH0gZnJvbSAnQGVsZW1lbnRzL0xvY2FsRXZlbnRTY3JpcHQuanMnXG5pbXBvcnQgeyB3aXJlU2lnbmFsV2F0Y2hlclZpYURhdGFzdGFyIH0gZnJvbSAnQHJ1bnRpbWUvc2lnbmFscy5qcydcblxubGV0IGJyaWRnZVJlZ2lzdGVyZWQgPSBmYWxzZVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVnaXN0ZXJEYXRhc3RhckJyaWRnZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKGJyaWRnZVJlZ2lzdGVyZWQpIHJldHVyblxuXG4gIHRyeSB7XG4gICAgY29uc3QgZGF0YXN0YXIgPSBhd2FpdCBpbXBvcnQoJ2RhdGFzdGFyJylcbiAgICBjb25zdCB7IGF0dHJpYnV0ZSB9ID0gZGF0YXN0YXJcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBSZWdpc3RlciBhcyBhIERhdGFzdGFyIGF0dHJpYnV0ZSBwbHVnaW4gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgLy8gTWF0Y2hlcyBlbGVtZW50cyB3aXRoIGEgYGRhdGEtbG9jYWwtZXZlbnQtc2NyaXB0YCBhdHRyaWJ1dGUgT1IgKHZpYVxuICAgIC8vIG5hbWUgbWF0Y2hpbmcpIHRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBjdXN0b20gZWxlbWVudCBpdHNlbGYgd2hlblxuICAgIC8vIERhdGFzdGFyIHNjYW5zIHRoZSBET00uXG4gICAgLy9cbiAgICAvLyBUaGUgbmFtZSAnbG9jYWwtZXZlbnQtc2NyaXB0JyBjYXVzZXMgRGF0YXN0YXIgdG8gYXBwbHkgdGhpcyBwbHVnaW5cbiAgICAvLyB0byBhbnkgZWxlbWVudCB3aXRoIGRhdGEtbG9jYWwtZXZlbnQtc2NyaXB0PVwiLi4uXCIgaW4gdGhlIERPTS5cbiAgICAvLyBXZSBhbHNvIHBhdGNoIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGRpcmVjdGx5IGluIHRoZSBNdXRhdGlvbk9ic2VydmVyXG4gICAgLy8gcGF0aCB2aWEgdGhlIGhvc3QgZWxlbWVudCdzIGNvbm5lY3RlZENhbGxiYWNrLlxuICAgIGF0dHJpYnV0ZSh7XG4gICAgICBuYW1lOiAnbG9jYWwtZXZlbnQtc2NyaXB0JyxcbiAgICAgIHJlcXVpcmVtZW50OiB7XG4gICAgICAgIGtleTogJ2RlbmllZCcsXG4gICAgICAgIHZhbHVlOiAnZGVuaWVkJyxcbiAgICAgIH0sXG4gICAgICBhcHBseSh7IGVsLCBlZmZlY3QsIHNpZ25hbCB9KSB7XG4gICAgICAgIGNvbnN0IGhvc3QgPSBlbCBhcyBMb2NhbEV2ZW50U2NyaXB0XG5cbiAgICAgICAgLy8gUGhhc2UgNmE6IGhhbmQgRGF0YXN0YXIncyByZWFjdGl2ZSBwcmltaXRpdmVzIHRvIHRoZSBob3N0XG4gICAgICAgIGhvc3QuY29ubmVjdERhdGFzdGFyKHsgZWZmZWN0LCBzaWduYWwgfSlcblxuICAgICAgICAvLyBQaGFzZSA2YjogaWYgdGhlIGhvc3QgaXMgYWxyZWFkeSBpbml0aWFsaXplZCAod2lyaW5nIHJhbiBiZWZvcmVcbiAgICAgICAgLy8gRGF0YXN0YXIgYXR0cmlidXRlIHBsdWdpbiBmaXJlZCksIHJlLXdpcmUgc2lnbmFsIHdhdGNoZXJzIHRocm91Z2hcbiAgICAgICAgLy8gRGF0YXN0YXIncyBlZmZlY3QoKSBmb3IgcHJvcGVyIHJlYWN0aXZpdHlcbiAgICAgICAgY29uc3Qgd2lyaW5nID0gaG9zdC53aXJpbmdcbiAgICAgICAgaWYgKHdpcmluZyAmJiB3aXJpbmcud2F0Y2hlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGZvciAoY29uc3Qgd2F0Y2hlciBvZiB3aXJpbmcud2F0Y2hlcnMpIHtcbiAgICAgICAgICAgIHdpcmVTaWduYWxXYXRjaGVyVmlhRGF0YXN0YXIod2F0Y2hlciwgZWZmZWN0LCAoKSA9PiBob3N0LmNvbnRleHQhKVxuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zb2xlLmxvZyhgW0xFUzpkYXRhc3Rhcl0gcmUtd2lyZWQgJHt3aXJpbmcud2F0Y2hlcnMubGVuZ3RofSBzaWduYWwgd2F0Y2hlcnMgdmlhIERhdGFzdGFyIGVmZmVjdCgpYClcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCdbTEVTOmRhdGFzdGFyXSBhdHRyaWJ1dGUgcGx1Z2luIGFwcGxpZWQgdG8nLCBlbC5pZCB8fCBlbC50YWdOYW1lKVxuXG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgaG9zdC5kaXNjb25uZWN0RGF0YXN0YXIoKVxuICAgICAgICAgIGNvbnNvbGUubG9nKCdbTEVTOmRhdGFzdGFyXSBhdHRyaWJ1dGUgcGx1Z2luIGNsZWFuZWQgdXAnLCBlbC5pZCB8fCBlbC50YWdOYW1lKVxuICAgICAgICB9XG4gICAgICB9LFxuICAgIH0pXG5cbiAgICBicmlkZ2VSZWdpc3RlcmVkID0gdHJ1ZVxuICAgIGNvbnNvbGUubG9nKCdbTEVTOmRhdGFzdGFyXSBicmlkZ2UgcmVnaXN0ZXJlZCcpXG5cbiAgfSBjYXRjaCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIHJ1bm5pbmcgaW4gc3RhbmRhbG9uZSBtb2RlIChEYXRhc3RhciBub3QgYXZhaWxhYmxlKScpXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBTaWduYWwgaW50ZWdyYXRpb24gdXRpbGl0aWVzXG4vLyBVc2VkIGJ5IGV4ZWN1dG9yLnRzIHdoZW4gRGF0YXN0YXIgaXMgcHJlc2VudFxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogUmVhZHMgYSBzaWduYWwgdmFsdWUgZnJvbSBEYXRhc3RhcidzIHJvb3Qgb2JqZWN0LlxuICogRmFsbHMgYmFjayB0byB1bmRlZmluZWQgaWYgRGF0YXN0YXIgaXMgbm90IGF2YWlsYWJsZS5cbiAqXG4gKiBUaGlzIGlzIGNhbGxlZCBieSB0aGUgTEVTQ29udGV4dC5nZXRTaWduYWwgZnVuY3Rpb24gd2hlbiB0aGUgRGF0YXN0YXJcbiAqIGJyaWRnZSBpcyBjb25uZWN0ZWQsIGdpdmluZyBMRVMgZXhwcmVzc2lvbnMgYWNjZXNzIHRvIGFsbCBEYXRhc3RhciBzaWduYWxzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZERhdGFzdGFyU2lnbmFsKFxuICBuYW1lOiBzdHJpbmcsXG4gIGRzU2lnbmFsOiAoPFQ+KG5hbWU6IHN0cmluZywgaW5pdD86IFQpID0+IHsgdmFsdWU6IFQgfSkgfCB1bmRlZmluZWRcbik6IHVua25vd24ge1xuICBpZiAoIWRzU2lnbmFsKSByZXR1cm4gdW5kZWZpbmVkXG4gIHRyeSB7XG4gICAgcmV0dXJuIGRzU2lnbmFsKG5hbWUpLnZhbHVlXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxufVxuXG4vKipcbiAqIFdyaXRlcyBhIHZhbHVlIHRvIERhdGFzdGFyJ3Mgc2lnbmFsIHRyZWUuXG4gKiBUaGlzIHRyaWdnZXJzIERhdGFzdGFyJ3MgcmVhY3RpdmUgZ3JhcGggXHUyMDE0IGFueSBkYXRhLXRleHQsIGRhdGEtc2hvdyxcbiAqIGRhdGEtY2xhc3MgYXR0cmlidXRlcyBib3VuZCB0byB0aGlzIHNpZ25hbCB3aWxsIHVwZGF0ZSBhdXRvbWF0aWNhbGx5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVEYXRhc3RhclNpZ25hbChcbiAgbmFtZTogc3RyaW5nLFxuICB2YWx1ZTogdW5rbm93bixcbiAgZHNTaWduYWw6ICg8VD4obmFtZTogc3RyaW5nLCBpbml0PzogVCkgPT4geyB2YWx1ZTogVCB9KSB8IHVuZGVmaW5lZFxuKTogdm9pZCB7XG4gIGlmICghZHNTaWduYWwpIHJldHVyblxuICB0cnkge1xuICAgIGNvbnN0IHNpZyA9IGRzU2lnbmFsPHVua25vd24+KG5hbWUsIHZhbHVlKVxuICAgIHNpZy52YWx1ZSA9IHZhbHVlXG4gIH0gY2F0Y2gge1xuICAgIC8vIFNpZ25hbCBtYXkgbm90IGV4aXN0IHlldCBcdTIwMTQgaXQgd2lsbCBiZSBjcmVhdGVkIGJ5IGRhdGEtc2lnbmFscyBvbiB0aGUgaG9zdFxuICB9XG59XG4iLCAiLyoqXG4gKiBsb2NhbC1ldmVudC1zY3JpcHQgXHUyMDE0IG1haW4gZW50cnkgcG9pbnRcbiAqXG4gKiBJbXBvcnQgb3JkZXIgbWF0dGVycyBmb3IgY3VzdG9tIGVsZW1lbnQgcmVnaXN0cmF0aW9uOlxuICogICAxLiBIb3N0IGVsZW1lbnQgZmlyc3QgKExvY2FsRXZlbnRTY3JpcHQpXG4gKiAgIDIuIENoaWxkIGVsZW1lbnRzIHRoYXQgcmVmZXJlbmNlIGl0XG4gKiAgIDMuIERhdGFzdGFyIGJyaWRnZSBsYXN0IChvcHRpb25hbCBcdTIwMTQgZmFpbHMgZ3JhY2VmdWxseSBpZiBEYXRhc3RhciBhYnNlbnQpXG4gKlxuICogVXNhZ2UgdmlhIGltcG9ydG1hcCArIHNjcmlwdCB0YWc6XG4gKlxuICogICA8c2NyaXB0IHR5cGU9XCJpbXBvcnRtYXBcIj5cbiAqICAgICB7XG4gKiAgICAgICBcImltcG9ydHNcIjoge1xuICogICAgICAgICBcImRhdGFzdGFyXCI6IFwiaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L2doL3N0YXJmZWRlcmF0aW9uL2RhdGFzdGFyQHYxLjAuMC1SQy44L2J1bmRsZXMvZGF0YXN0YXIuanNcIlxuICogICAgICAgfVxuICogICAgIH1cbiAqICAgPC9zY3JpcHQ+XG4gKiAgIDxzY3JpcHQgdHlwZT1cIm1vZHVsZVwiIHNyYz1cIi9kaXN0L2xvY2FsLWV2ZW50LXNjcmlwdC5qc1wiPjwvc2NyaXB0PlxuICpcbiAqIFdpdGhvdXQgdGhlIGltcG9ydG1hcCAob3Igd2l0aCBkYXRhc3RhciBhYnNlbnQpLCBMRVMgcnVucyBpbiBzdGFuZGFsb25lIG1vZGU6XG4gKiBhbGwgY3VzdG9tIGVsZW1lbnRzIHdvcmssIERhdGFzdGFyIHNpZ25hbCB3YXRjaGluZyBhbmQgQGFjdGlvbiBwYXNzdGhyb3VnaFxuICogYXJlIHVuYXZhaWxhYmxlLlxuICovXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBDdXN0b20gZWxlbWVudHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBFYWNoIGltcG9ydCByZWdpc3RlcnMgaXRzIGVsZW1lbnQocykgYXMgYSBzaWRlIGVmZmVjdC5cblxuZXhwb3J0IHsgTG9jYWxFdmVudFNjcmlwdCB9IGZyb20gJ0BlbGVtZW50cy9Mb2NhbEV2ZW50U2NyaXB0LmpzJ1xuZXhwb3J0IHsgTG9jYWxDb21tYW5kIH0gICAgIGZyb20gJ0BlbGVtZW50cy9Mb2NhbENvbW1hbmQuanMnXG5leHBvcnQgeyBPbkV2ZW50IH0gICAgICAgICAgZnJvbSAnQGVsZW1lbnRzL09uRXZlbnQuanMnXG5leHBvcnQgeyBPblNpZ25hbCB9ICAgICAgICAgZnJvbSAnQGVsZW1lbnRzL09uU2lnbmFsLmpzJ1xuZXhwb3J0IHsgT25Mb2FkLCBPbkVudGVyLCBPbkV4aXQgfSBmcm9tICdAZWxlbWVudHMvTGlmZWN5Y2xlLmpzJ1xuZXhwb3J0IHsgVXNlTW9kdWxlIH0gICAgICAgIGZyb20gJ0BlbGVtZW50cy9Vc2VNb2R1bGUuanMnXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBUeXBlIGV4cG9ydHMgKGZvciBUeXBlU2NyaXB0IGNvbnN1bWVycykgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5leHBvcnQgdHlwZSB7IExFU05vZGUgfSAgICAgICAgICAgICAgICAgICBmcm9tICdAcGFyc2VyL2FzdC5qcydcbmV4cG9ydCB0eXBlIHsgTEVTTW9kdWxlLCBMRVNQcmltaXRpdmUgfSAgIGZyb20gJ0Btb2R1bGVzL3R5cGVzLmpzJ1xuZXhwb3J0IHR5cGUgeyBDb21tYW5kRGVmLCBBcmdEZWYgfSAgICAgICAgZnJvbSAnQHJ1bnRpbWUvcmVnaXN0cnkuanMnXG5leHBvcnQgeyBMRVNTY29wZSB9ICAgICAgICAgICAgICAgICAgICAgICBmcm9tICdAcnVudGltZS9zY29wZS5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIERhdGFzdGFyIGJyaWRnZSAob3B0aW9uYWwpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gRHluYW1pYyBpbXBvcnQgc28gdGhlIGJ1bmRsZSB3b3JrcyB3aXRob3V0IERhdGFzdGFyIHByZXNlbnQuXG5pbXBvcnQgeyByZWdpc3RlckRhdGFzdGFyQnJpZGdlIH0gZnJvbSAnQGRhdGFzdGFyL3BsdWdpbi5qcydcbnJlZ2lzdGVyRGF0YXN0YXJCcmlkZ2UoKVxuZXhwb3J0IHR5cGUgeyBMRVNDb25maWcsIENvbW1hbmREZWNsLCBFdmVudEhhbmRsZXJEZWNsLCBTaWduYWxXYXRjaGVyRGVjbCxcbiAgICAgICAgICAgICAgT25Mb2FkRGVjbCwgT25FbnRlckRlY2wsIE9uRXhpdERlY2wsIE1vZHVsZURlY2wgfSBmcm9tICdAcGFyc2VyL2NvbmZpZy5qcydcbmV4cG9ydCB7IHJlYWRDb25maWcsIGxvZ0NvbmZpZyB9IGZyb20gJ0BwYXJzZXIvcmVhZGVyLmpzJ1xuZXhwb3J0IHsgc3RyaXBCb2R5IH0gICAgICAgICAgICAgZnJvbSAnQHBhcnNlci9zdHJpcEJvZHkuanMnXG5leHBvcnQgeyBwYXJzZUxFUywgTEVTUGFyc2VyLCBMRVNQYXJzZUVycm9yIH0gZnJvbSAnQHBhcnNlci9pbmRleC5qcydcbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7O0FBMERBLFNBQVMsS0FBSyxHQUFtQjtBQUFFLFNBQU8sSUFBSSxJQUFJLEtBQUssS0FBSyxJQUFJLElBQUksTUFBTTtBQUFJO0FBQzlFLFNBQVMsS0FBSyxHQUFXLEdBQVcsR0FBbUI7QUFBRSxTQUFPLElBQUksS0FBSyxJQUFJO0FBQUc7QUFDaEYsU0FBUyxNQUFNLE1BQWMs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QUc7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQU07QUFBQSxRQUFFO0FBQUEsUUFDNUQ7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQU07QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBTTtBQUFBLFFBQUU7QUFBQSxRQUM1RDtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBRztBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQzVEO0FBQUEsUUFBRztBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFDM0Q7QUFBQSxRQUFHO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUMzRDtBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQzVEO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBTTtBQUFBLFFBQUU7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFDNUQ7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBTTtBQUFBLFFBQUc7QUFBQSxRQUM1RDtBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBTTtBQUFBLFFBQUU7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQzVEO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFDNUQ7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQU07QUFBQSxRQUFHO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQU07QUFBQSxRQUM5RDtBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQzVEO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFDM0Q7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUM1RDtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBTTtBQUFBLFFBQUU7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQzdEO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsTUFDOUQ7QUFDQSxlQUFTLElBQUksR0FBRyxJQUFJLEtBQUssSUFBSyxHQUFFLENBQUMsSUFBSSxFQUFFLElBQUksR0FBRyxJQUFJLEtBQUssQ0FBQztBQUN4RCxhQUFPO0FBQUEsSUFDVCxHQUFHO0FBZ0NILElBQU0sZUFBZTtBQUVyQixJQUFNLGVBQW1DO0FBQUEsTUFDdkMsQ0FBQyxHQUFFLENBQUM7QUFBQSxNQUFFLENBQUMsSUFBRyxDQUFDO0FBQUEsTUFBRSxD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QVksT0FBTztBQUN6QyxlQUFlLE9BQU8sV0FBWSxNQUFNOzs7QUNyRGpDLElBQU0sWUFBTixjQUF3QixZQUFZO0FBQUE7QUFBQSxFQUV6QyxJQUFJLGFBQTRCO0FBQzlCLFdBQU8sS0FBSyxhQUFhLE1BQU0sR0FBRyxLQUFLLEtBQUs7QUFBQSxFQUM5QztBQUFBO0FBQUEsRUFHQSxJQUFJLFlBQTJCO0FBQzdCLFdBQU8sS0FBSyxhQUFhLEtBQUssR0FBRyxLQUFLLEtBQUs7QUFBQSxFQUM3QztBQUFBLEVBRUEsb0JBQTBCO0FBQ3hCLFVBQU0sT0FBTyxLQUFLLGFBQ2QsU0FBUyxLQUFLLFVBQVUsTUFDeEIsS0FBSyxZQUNILFFBQVEsS0FBSyxTQUFTLE1BQ3RCO0FBQ04sWUFBUSxJQUFJLGdDQUFnQyxJQUFJO0FBQUEsRUFDbEQ7QUFDRjtBQUVBLGVBQWUsT0FBTyxjQUFjLFNBQVM7OztBQ2xCN0MsSUFBSSxtQkFBbUI7QUFFdkIsZUFBc0IseUJBQXdDO0FBQzVELE1BQUksaUJBQWtCO0FBRXRCLE1BQUk7QUFDRixVQUFNLFdBQVcsTUFBTSxPQUFPLFVBQVU7QUFDeEMsVUFBTSxFQUFFLFVBQVUsSUFBSTtBQVd0QixjQUFVO0FBQUEsTUFDUixNQUFNO0FBQUEsTUFDTixhQUFhO0FBQUEsUUFDWCxLQUFLO0FBQUEsUUFDTCxPQUFPO0FBQUEsTUFDVDtBQUFBLE1BQ0EsTUFBTSxFQUFFLElBQUksUUFBUSxPQUFPLEdBQUc7QUFDNUIsY0FBTSxPQUFPO0FBR2IsYUFBSyxnQkFBZ0IsRUFBRSxRQUFRLE9BQU8sQ0FBQztBQUt2QyxjQUFNLFNBQVMsS0FBSztBQUNwQixZQUFJLFVBQVUsT0FBTyxTQUFTLFNBQVMsR0FBRztBQUN4QyxxQkFBVyxXQUFXLE9BQU8sVUFBVTtBQUNyQyx5Q0FBNkIsU0FBUyxRQUFRLE1BQU0sS0FBSyxPQUFRO0FBQUEsVUFDbkU7QUFDQSxrQkFBUSxJQUFJLDJCQUEyQixPQUFPLFNBQVMsTUFBTSx3Q0FBd0M7QUFBQSxRQUN2RztBQUVBLGdCQUFRLElBQUksOENBQThDLEdBQUcsTUFBTSxHQUFHLE9BQU87QUFFN0UsZUFBTyxNQUFNO0FBQ1gsZUFBSyxtQkFBbUI7QUFDeEIsa0JBQVEsSUFBSSw4Q0FBOEMsR0FBRyxNQUFNLEdBQUcsT0FBTztBQUFBLFFBQy9FO0FBQUEsTUFDRjtBQUFBLElBQ0YsQ0FBQztBQUVELHVCQUFtQjtBQUNuQixZQUFRLElBQUksa0NBQWtDO0FBQUEsRUFFaEQsUUFBUTtBQUNOLFlBQVEsSUFBSSwyREFBMkQ7QUFBQSxFQUN6RTtBQUNGOzs7QUNyQ0EsdUJBQXVCOyIsCiAgIm5hbWVzIjogWyJwYXJzZU1zIiwgInJ1bkNvbW1hbmQiXQp9Cg==
