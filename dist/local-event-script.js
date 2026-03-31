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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL21vZHVsZXMvYnVpbHRpbi9zaGFrZS50cyIsICIuLi9zcmMvbW9kdWxlcy9idWlsdGluL2FuaW1hdGlvbi50cyIsICIuLi9zcmMvcnVudGltZS9leGVjdXRvci50cyIsICIuLi9zcmMvcnVudGltZS9yZWdpc3RyeS50cyIsICIuLi9zcmMvbW9kdWxlcy90eXBlcy50cyIsICIuLi9zcmMvcGFyc2VyL3N0cmlwQm9keS50cyIsICIuLi9zcmMvcGFyc2VyL3JlYWRlci50cyIsICIuLi9zcmMvcGFyc2VyL3Rva2VuaXplci50cyIsICIuLi9zcmMvcGFyc2VyL3BhcnNlci50cyIsICIuLi9zcmMvcGFyc2VyL2luZGV4LnRzIiwgIi4uL3NyYy9ydW50aW1lL3dpcmluZy50cyIsICIuLi9zcmMvcnVudGltZS9zY29wZS50cyIsICIuLi9zcmMvcnVudGltZS9vYnNlcnZlci50cyIsICIuLi9zcmMvcnVudGltZS9zaWduYWxzLnRzIiwgIi4uL3NyYy9lbGVtZW50cy9Mb2NhbEV2ZW50U2NyaXB0LnRzIiwgIi4uL3NyYy9lbGVtZW50cy9Mb2NhbENvbW1hbmQudHMiLCAiLi4vc3JjL2VsZW1lbnRzL09uRXZlbnQudHMiLCAiLi4vc3JjL2VsZW1lbnRzL09uU2lnbmFsLnRzIiwgIi4uL3NyYy9lbGVtZW50cy9MaWZlY3ljbGUudHMiLCAiLi4vc3JjL2VsZW1lbnRzL1VzZU1vZHVsZS50cyIsICIuLi9zcmMvZGF0YXN0YXIvcGx1Z2luLnRzIiwgIi4uL3NyYy9pbmRleC50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBTaGFrZSBhbmltYXRpb24gcHJpbWl0aXZlXG4gKlxuICogR2VuZXJhdGVzIGEgbm9pc2UtZHJpdmVuIGRpc3BsYWNlbWVudCBrZXlmcmFtZSBzZXF1ZW5jZSBhbmQgcGxheXMgaXRcbiAqIHZpYSB0aGUgV2ViIEFuaW1hdGlvbnMgQVBJLiBUaHJlZSBub2lzZSBtb2RlczpcbiAqXG4gKiAgIHJlZ3VsYXIgIFx1MjAxNCBkYW1wZWQgc2ludXNvaWRhbCBvc2NpbGxhdGlvbiB3aXRoIGhhcm1vbmljcyAoZGVmYXVsdClcbiAqICAgcGVybGluICAgXHUyMDE0IEtlbiBQZXJsaW4ncyBpbXByb3ZlZCBncmFkaWVudCBub2lzZSAoc21vb3RoLCBvcmdhbmljKVxuICogICBzaW1wbGV4ICBcdTIwMTQgU2ltcGxleCBub2lzZSAoc21vb3RoZXIgZ3JhZGllbnRzLCBubyBheGlzLWFsaWduZWQgYXJ0ZWZhY3RzKVxuICpcbiAqIEF4aXMgb3B0aW9uczogeCB8IHkgfCB6IHwgeHkgfCB4eXpcbiAqICAgeCAgIFx1MjE5MiB0cmFuc2xhdGVYXG4gKiAgIHkgICBcdTIxOTIgdHJhbnNsYXRlWVxuICogICB6ICAgXHUyMTkyIHJvdGF0ZVogKHNjcmVlbi1zaGFrZSAvIGNhbWVyYS1zaGFrZSBmZWVsKVxuICogICB4eSAgXHUyMTkyIHRyYW5zbGF0ZVggKyB0cmFuc2xhdGVZIChpbmRlcGVuZGVudCBub2lzZSBjaGFubmVscylcbiAqICAgeHl6IFx1MjE5MiB0cmFuc2xhdGVYICsgdHJhbnNsYXRlWSArIHJvdGF0ZVpcbiAqXG4gKiBPcHRpb25zIChhbGwgb3B0aW9uYWwpOlxuICogICBheGlzOiAgICAgIHggfCB5IHwgeiB8IHh5IHwgeHl6ICAgKGRlZmF1bHQ6IHgpXG4gKiAgIG5vaXNlOiAgICAgcmVndWxhciB8IHBlcmxpbiB8IHNpbXBsZXggIChkZWZhdWx0OiByZWd1bGFyKVxuICogICBhbXBsaXR1ZGU6IE5weCAgICAgICAgICAgICAgICAgICAgKGRlZmF1bHQ6IDhweClcbiAqICAgZGVjYXk6ICAgICB0cnVlIHwgZmFsc2UgICAgICAgICAgIChkZWZhdWx0OiB0cnVlIFx1MjAxNCBhbXBsaXR1ZGUgZmFkZXMgb3V0KVxuICogICBmcmVxdWVuY3k6IE4gICAgICAgICAgICAgICAgICAgICAgKGRlZmF1bHQ6IDggXHUyMDE0IG9zY2lsbGF0aW9ucy9zZWMgZm9yIHJlZ3VsYXIpXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBMRVNQcmltaXRpdmUgfSBmcm9tICcuLi90eXBlcy5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQZXJsaW4gbm9pc2UgXHUyMDE0IEtlbiBQZXJsaW4ncyBpbXByb3ZlZCAyMDAyIHZlcnNpb25cbi8vIFdlIHVzZSAyRCBldmFsdWF0aW9uOiBub2lzZSh0LCBjaGFubmVsKSB3aGVyZSBjaGFubmVsIGlzIGEgZml4ZWQgb2Zmc2V0XG4vLyB0aGF0IGdpdmVzIGluZGVwZW5kZW50IGN1cnZlcyBmb3IgeCB2cyB5IHZzIHouXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgUEVSTElOX1BFUk06IFVpbnQ4QXJyYXkgPSAoKCkgPT4ge1xuICAvLyBGaXhlZCBwZXJtdXRhdGlvbiB0YWJsZSAoZGV0ZXJtaW5pc3RpYywgbm8gcmFuZG9tbmVzcyBuZWVkZWQgZm9yIGFuaW1hdGlvbilcbiAgY29uc3QgcCA9IG5ldyBVaW50OEFycmF5KDUxMilcbiAgY29uc3QgYmFzZSA9IFtcbiAgICAxNTEsMTYwLDEzNywgOTEsIDkwLCAxNSwxMzEsIDEzLDIwMSwgOTUsIDk2LCA1MywxOTQsMjMzLCAgNywyMjUsXG4gICAgMTQwLCAzNiwxMDMsIDMwLCA2OSwxNDIsICA4LCA5OSwgMzcsMjQwLCAyMSwgMTAsIDIzLDE5MCwgIDYsMTQ4LFxuICAgIDI0NywxMjAsMjM0LCA3NSwgIDAsIDI2LDE5NywgNjIsIDk0LDI1MiwyMTksMjAzLDExNywgMzUsIDExLCAzMixcbiAgICAgNTcsMTc3LCAzMywgODgsMjM3LDE0OSwgNTYsIDg3LDE3NCwgMjAsMTI1LDEzNiwxNzEsMTY4LCA2OCwxNzUsXG4gICAgIDc0LDE2NSwgNzEsMTM0LDEzOSwgNDgsIDI3LDE2NiwgNzcsMTQ2LDE1OCwyMzEsIDgzLDExMSwyMjksMTIyLFxuICAgICA2MCwyMTEsMTMzLDIzMCwyMjAsMTA1LCA5MiwgNDEsIDU1LCA0NiwyNDUsIDQwLDI0NCwxMDIsMTQzLCA1NCxcbiAgICAgNjUsIDI1LCA2MywxNjEsICAxLDIxNiwgODAsIDczLDIwOSwgNzYsMTMyLDE4NywyMDgsIDg5LCAxOCwxNjksXG4gICAgMjAwLDE5NiwxMzUsMTMwLDExNiwxODgsMTU5LCA4NiwxNjQsMTAwLDEwOSwxOTgsMTczLDE4NiwgIDMsIDY0LFxuICAgICA1MiwyMTcsMjI2LDI1MCwxMjQsMTIzLCAgNSwyMDIsIDM4LDE0NywxMTgsMTI2LDI1NSwgODIsIDg1LDIxMixcbiAgICAyMDcsMjA2LCA1OSwyMjcsIDQ3LCAxNiwgNTgsIDE3LDE4MiwxODksIDI4LCA0MiwyMjMsMTgzLDE3MCwyMTMsXG4gICAgMTE5LDI0OCwxNTIsICAyLCA0NCwxNTQsMTYzLCA3MCwyMjEsMTUzLDEwMSwxNTUsMTY3LCA0MywxNzIsICA5LFxuICAgIDEyOSwgMjIsIDM5LDI1MywgMTksIDk4LDEwOCwxMTAsIDc5LDExMywyMjQsMjMyLDE3OCwxODUsMTEyLDEwNCxcbiAgICAyMTgsMjQ2LCA5NywyMjgsMjUxLCAzNCwyNDIsMTkzLDIzOCwyMTAsMTQ0LCAxMiwxOTEsMTc5LDE2MiwyNDEsXG4gICAgIDgxLCA1MSwxNDUsMjM1LDI0OSwgMTQsMjM5LDEwNywgNDksMTkyLDIxNCwgMzEsMTgxLDE5OSwxMDYsMTU3LFxuICAgIDE4NCwgODQsMjA0LDE3NiwxMTUsMTIxLCA1MCwgNDUsMTI3LCAgNCwxNTAsMjU0LDEzOCwyMzYsMjA1LCA5MyxcbiAgICAyMjIsMTE0LCA2NywgMjksIDI0LCA3MiwyNDMsMTQxLDEyOCwxOTUsIDc4LCA2NiwyMTUsIDYxLDE1NiwxODAsXG4gIF1cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCAyNTY7IGkrKykgcFtpXSA9IHBbaSArIDI1Nl0gPSBiYXNlW2ldIVxuICByZXR1cm4gcFxufSkoKVxuXG5mdW5jdGlvbiBmYWRlKHQ6IG51bWJlcik6IG51bWJlciB7IHJldHVybiB0ICogdCAqIHQgKiAodCAqICh0ICogNiAtIDE1KSArIDEwKSB9XG5mdW5jdGlvbiBsZXJwKHQ6IG51bWJlciwgYTogbnVtYmVyLCBiOiBudW1iZXIpOiBudW1iZXIgeyByZXR1cm4gYSArIHQgKiAoYiAtIGEpIH1cbmZ1bmN0aW9uIGdyYWQyKGhhc2g6IG51bWJlciwgeDogbnVtYmVyLCB5OiBudW1iZXIpOiBudW1iZXIge1xuICBjb25zdCBoID0gaGFzaCAmIDNcbiAgY29uc3QgdSA9IGggPCAyID8geCA6IHlcbiAgY29uc3QgdiA9IGggPCAyID8geSA6IHhcbiAgcmV0dXJuICgoaCAmIDEpID8gLXUgOiB1KSArICgoaCAmIDIpID8gLXYgOiB2KVxufVxuXG4vKiogUGVybGluIG5vaXNlLCByZXR1cm5zIHZhbHVlIGluIFstMSwgMV0gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJsaW4yKHg6IG51bWJlciwgeTogbnVtYmVyKTogbnVtYmVyIHtcbiAgY29uc3QgWCA9IE1hdGguZmxvb3IoeCkgJiAyNTVcbiAgY29uc3QgWSA9IE1hdGguZmxvb3IoeSkgJiAyNTVcbiAgeCAtPSBNYXRoLmZsb29yKHgpXG4gIHkgLT0gTWF0aC5mbG9vcih5KVxuICBjb25zdCB1ID0gZmFkZSh4KSwgdiA9IGZhZGUoeSlcbiAgY29uc3QgYSAgPSBQRVJMSU5fUEVSTVtYXSEgICsgWVxuICBjb25zdCBhYSA9IFBFUkxJTl9QRVJNW2FdISwgIGFiID0gUEVSTElOX1BFUk1bYSArIDFdIVxuICBjb25zdCBiICA9IFBFUkxJTl9QRVJNW1ggKyAxXSEgKyBZXG4gIGNvbnN0IGJhID0gUEVSTElOX1BFUk1bYl0hLCAgYmIgPSBQRVJMSU5fUEVSTVtiICsgMV0hXG4gIHJldHVybiBsZXJwKHYsXG4gICAgbGVycCh1LCBncmFkMihQRVJMSU5fUEVSTVthYV0hLCB4LCB5KSwgICAgIGdyYWQyKFBFUkxJTl9QRVJNW2JhXSEsIHggLSAxLCB5KSksXG4gICAgbGVycCh1LCBncmFkMihQRVJMSU5fUEVSTVthYl0hLCB4LCB5IC0gMSksIGdyYWQyKFBFUkxJTl9QRVJNW2JiXSEsIHggLSAxLCB5IC0gMSkpXG4gIClcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBTaW1wbGV4IG5vaXNlIFx1MjAxNCAyRCBzaW1wbGV4IChzbW9vdGhlciBncmFkaWVudHMsIG5vIGdyaWQtYWxpZ25lZCBhcnRlZmFjdHMpXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgU0lNUExFWF9QRVJNID0gUEVSTElOX1BFUk0gLy8gcmV1c2Ugc2FtZSBwZXJtdXRhdGlvbiB0YWJsZVxuXG5jb25zdCBTSU1QTEVYX0dSQUQ6IFtudW1iZXIsIG51bWJlcl1bXSA9IFtcbiAgWzEsMV0sWy0xLDFdLFsxLC0xXSxbLTEsLTFdLFsxLDBdLFstMSwwXSxbMCwxXSxbMCwtMV0sXG5dXG5jb25zdCBGMiA9IDAuNSAqIChNYXRoLnNxcnQoMykgLSAxKVxuY29uc3QgRzIgPSAoMyAtIE1hdGguc3FydCgzKSkgLyA2XG5cbmZ1bmN0aW9uIHNpbXBsZXgyZ3JhZChoYXNoOiBudW1iZXIsIHg6IG51bWJlciwgeTogbnVtYmVyKTogbnVtYmVyIHtcbiAgY29uc3QgZyA9IFNJTVBMRVhfR1JBRFtoYXNoICYgN10hXG4gIHJldHVybiBnWzBdICogeCArIGdbMV0gKiB5XG59XG5cbi8qKiBTaW1wbGV4IG5vaXNlLCByZXR1cm5zIHZhbHVlIGluIFstMSwgMV0gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaW1wbGV4Mih4aW46IG51bWJlciwgeWluOiBudW1iZXIpOiBudW1iZXIge1xuICBjb25zdCBzICA9ICh4aW4gKyB5aW4pICogRjJcbiAgY29uc3QgaSAgPSBNYXRoLmZsb29yKHhpbiArIHMpXG4gIGNvbnN0IGogID0gTWF0aC5mbG9vcih5aW4gKyBzKVxuICBjb25zdCB0ICA9IChpICsgaikgKiBHMlxuICBjb25zdCB4MCA9IHhpbiAtIChpIC0gdClcbiAgY29uc3QgeTAgPSB5aW4gLSAoaiAtIHQpXG5cbiAgbGV0IGkxOiBudW1iZXIsIGoxOiBudW1iZXJcbiAgaWYgKHgwID4geTApIHsgaTEgPSAxOyBqMSA9IDAgfSBlbHNlIHsgaTEgPSAwOyBqMSA9IDEgfVxuXG4gIGNvbnN0IHgxID0geDAgLSBpMSArIEcyLCAgIHkxID0geTAgLSBqMSArIEcyXG4gIGNvbnN0IHgyID0geDAgLSAxICsgMipHMiwgIHkyID0geTAgLSAxICsgMipHMlxuXG4gIGNvbnN0IGlpID0gaSAmIDI1NSwgamogPSBqICYgMjU1XG4gIGNvbnN0IGdpMCA9IFNJTVBMRVhfUEVSTVtpaSAgICAgICsgU0lNUExFWF9QRVJNW2pqXSFdIVxuICBjb25zdCBnaTEgPSBTSU1QTEVYX1BFUk1baWkgKyBpMSArIFNJTVBMRVhfUEVSTVtqaiArIGoxXSFdIVxuICBjb25zdCBnaTIgPSBTSU1QTEVYX1BFUk1baWkgKyAxICArIFNJTVBMRVhfUEVSTVtqaiArIDFdIV0hXG5cbiAgY29uc3QgbiA9ICh0MDogbnVtYmVyLCB4OiBudW1iZXIsIHk6IG51bWJlciwgZ2k6IG51bWJlcikgPT4ge1xuICAgIGNvbnN0IHIgPSAwLjUgLSB4KnggLSB5KnlcbiAgICByZXR1cm4gciA8IDAgPyAwIDogcipyKnIqciAqIHNpbXBsZXgyZ3JhZChnaSwgeCwgeSlcbiAgfVxuXG4gIHJldHVybiA3MCAqIChuKDAuNSAtIHgwKngwIC0geTAqeTAsIHgwLCB5MCwgZ2kwKSArXG4gICAgICAgICAgICAgICBuKDAuNSAtIHgxKngxIC0geTEqeTEsIHgxLCB5MSwgZ2kxKSArXG4gICAgICAgICAgICAgICBuKDAuNSAtIHgyKngyIC0geTIqeTIsIHgyLCB5MiwgZ2kyKSlcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBSZWd1bGFyIHNoYWtlIFx1MjAxNCBkYW1wZWQgc2ludXNvaWRhbCBvc2NpbGxhdGlvbiB3aXRoIGhhcm1vbmljc1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIHJlZ3VsYXJTaGFrZSh0OiBudW1iZXIsIGZyZXF1ZW5jeTogbnVtYmVyLCBjaGFubmVsOiBudW1iZXIpOiBudW1iZXIge1xuICAvLyBUd28gaGFybW9uaWNzIGF0IHNsaWdodGx5IGRpZmZlcmVudCBmcmVxdWVuY2llcyBmb3IgbmF0dXJhbCBmZWVsXG4gIC8vIGNoYW5uZWwgb2Zmc2V0IHByZXZlbnRzIHgveSBmcm9tIGJlaW5nIGlkZW50aWNhbFxuICBjb25zdCBwaGFzZSA9IGNoYW5uZWwgKiBNYXRoLlBJICogMC43XG4gIHJldHVybiAoXG4gICAgMC43ICogTWF0aC5zaW4oMiAqIE1hdGguUEkgKiBmcmVxdWVuY3kgKiB0ICsgcGhhc2UpICtcbiAgICAwLjMgKiBNYXRoLnNpbigyICogTWF0aC5QSSAqIGZyZXF1ZW5jeSAqIDIuMyAqIHQgKyBwaGFzZSAqIDEuNClcbiAgKVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEtleWZyYW1lIGdlbmVyYXRvclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbnR5cGUgTm9pc2VUeXBlID0gJ3NpbXBsZXgnIHwgJ3BlcmxpbicgfCAncmVndWxhcidcbnR5cGUgU2hha2VBeGlzID0gJ3gnIHwgJ3knIHwgJ3onIHwgJ3h5JyB8ICd4eXonXG5cbmludGVyZmFjZSBTaGFrZU9wdGlvbnMge1xuICBheGlzOiAgICAgIFNoYWtlQXhpc1xuICBub2lzZTogICAgIE5vaXNlVHlwZVxuICBhbXBsaXR1ZGU6IG51bWJlciAgICAgLy8gcHggKG9yIGRlZ3JlZXMgZm9yIHopXG4gIGRlY2F5OiAgICAgYm9vbGVhblxuICBmcmVxdWVuY3k6IG51bWJlciAgICAgLy8gb3NjaWxsYXRpb25zL3NlYyAocmVndWxhciBtb2RlIG9ubHkpXG59XG5cbi8qKlxuICogU2FtcGxlIHRoZSBjaG9zZW4gbm9pc2UgZnVuY3Rpb24gZm9yIG9uZSBheGlzIGNoYW5uZWwuXG4gKiBgdGAgICAgICAgXHUyMDE0IG5vcm1hbGlzZWQgdGltZSBbMCwgMV1cbiAqIGBjaGFubmVsYCBcdTIwMTQgaW50ZWdlciBvZmZzZXQgdG8gcHJvZHVjZSBhbiBpbmRlcGVuZGVudCBjdXJ2ZSBwZXIgYXhpc1xuICovXG5mdW5jdGlvbiBzYW1wbGUoXG4gIG5vaXNlOiBOb2lzZVR5cGUsXG4gIHQ6IG51bWJlcixcbiAgY2hhbm5lbDogbnVtYmVyLFxuICBmcmVxdWVuY3k6IG51bWJlcixcbiAgZHVyYXRpb246IG51bWJlclxuKTogbnVtYmVyIHtcbiAgLy8gU2NhbGUgdCB0byBhIHJhbmdlIHRoYXQgZ2l2ZXMgZ29vZCBub2lzZSB2YXJpYXRpb25cbiAgY29uc3Qgc2NhbGUgPSA0LjAgIC8vIGhvdyBtYW55IG5vaXNlIFwiY3ljbGVzXCIgb3ZlciB0aGUgZnVsbCBkdXJhdGlvblxuICBjb25zdCB0eCA9IHQgKiBzY2FsZSArIGNoYW5uZWwgKiAzLjcgICAvLyBjaGFubmVsIG9mZnNldCBmb3IgaW5kZXBlbmRlbmNlXG4gIGNvbnN0IHR5ID0gY2hhbm5lbCAqIDExLjMgICAgICAgICAgICAgIC8vIGZpeGVkIHkgb2Zmc2V0IHBlciBjaGFubmVsXG5cbiAgc3dpdGNoIChub2lzZSkge1xuICAgIGNhc2UgJ3NpbXBsZXgnOiByZXR1cm4gc2ltcGxleDIodHgsIHR5KVxuICAgIGNhc2UgJ3Blcmxpbic6ICByZXR1cm4gcGVybGluMih0eCwgdHkpXG4gICAgY2FzZSAncmVndWxhcic6IHJldHVybiByZWd1bGFyU2hha2UodCwgZnJlcXVlbmN5LCBjaGFubmVsKVxuICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkS2V5ZnJhbWVzKFxuICBvcHRzOiBTaGFrZU9wdGlvbnMsXG4gIG46IG51bWJlciAgIC8vIG51bWJlciBvZiBrZXlmcmFtZXNcbik6IEtleWZyYW1lW10ge1xuICBjb25zdCBmcmFtZXM6IEtleWZyYW1lW10gPSBbXVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDw9IG47IGkrKykge1xuICAgIGNvbnN0IHQgICAgICAgID0gaSAvIG4gICAgICAgICAgICAgICAgICAgLy8gWzAsIDFdXG4gICAgY29uc3QgZW52ZWxvcGUgPSBvcHRzLmRlY2F5ID8gKDEgLSB0KSA6IDEuMFxuICAgIGNvbnN0IGFtcCAgICAgID0gb3B0cy5hbXBsaXR1ZGUgKiBlbnZlbG9wZVxuXG4gICAgbGV0IHR4ID0gMCwgdHkgPSAwLCByeiA9IDBcblxuICAgIGlmIChvcHRzLmF4aXMuaW5jbHVkZXMoJ3gnKSkge1xuICAgICAgdHggPSBzYW1wbGUob3B0cy5ub2lzZSwgdCwgMCwgb3B0cy5mcmVxdWVuY3ksIG4pICogYW1wXG4gICAgfVxuICAgIGlmIChvcHRzLmF4aXMuaW5jbHVkZXMoJ3knKSkge1xuICAgICAgdHkgPSBzYW1wbGUob3B0cy5ub2lzZSwgdCwgMSwgb3B0cy5mcmVxdWVuY3ksIG4pICogYW1wXG4gICAgfVxuICAgIGlmIChvcHRzLmF4aXMgPT09ICd6JyB8fCBvcHRzLmF4aXMgPT09ICd4eXonKSB7XG4gICAgICAvLyB6IHJvdGF0aW9uOiBhbXBsaXR1ZGUgaXMgaW4gZGVncmVlcywgc2NhbGUgZG93biB2cyBweCBkaXNwbGFjZW1lbnRcbiAgICAgIGNvbnN0IGRlZ0FtcCA9IGFtcCAqIDAuMTVcbiAgICAgIHJ6ID0gc2FtcGxlKG9wdHMubm9pc2UsIHQsIDIsIG9wdHMuZnJlcXVlbmN5LCBuKSAqIGRlZ0FtcFxuICAgIH1cblxuICAgIGNvbnN0IHBhcnRzOiBzdHJpbmdbXSA9IFtdXG4gICAgaWYgKHR4ICE9PSAwIHx8IG9wdHMuYXhpcy5pbmNsdWRlcygneCcpKSBwYXJ0cy5wdXNoKGB0cmFuc2xhdGVYKCR7dHgudG9GaXhlZCgyKX1weClgKVxuICAgIGlmICh0eSAhPT0gMCB8fCBvcHRzLmF4aXMuaW5jbHVkZXMoJ3knKSkgcGFydHMucHVzaChgdHJhbnNsYXRlWSgke3R5LnRvRml4ZWQoMil9cHgpYClcbiAgICBpZiAocnogIT09IDAgfHwgb3B0cy5heGlzID09PSAneicgfHwgb3B0cy5heGlzID09PSAneHl6JykgcGFydHMucHVzaChgcm90YXRlWigke3J6LnRvRml4ZWQoMyl9ZGVnKWApXG5cbiAgICBmcmFtZXMucHVzaCh7XG4gICAgICB0cmFuc2Zvcm06IHBhcnRzLmxlbmd0aCA+IDAgPyBwYXJ0cy5qb2luKCcgJykgOiAnbm9uZScsXG4gICAgICBvZmZzZXQ6IHQsXG4gICAgfSlcbiAgfVxuXG4gIC8vIEVuc3VyZSBmaXJzdCBhbmQgbGFzdCBmcmFtZXMgcmV0dXJuIHRvIHJlc3RcbiAgZnJhbWVzWzBdIS50cmFuc2Zvcm0gPSBidWlsZFJlc3RUcmFuc2Zvcm0ob3B0cy5heGlzKVxuICBmcmFtZXNbbl0hLnRyYW5zZm9ybSA9IGJ1aWxkUmVzdFRyYW5zZm9ybShvcHRzLmF4aXMpXG5cbiAgcmV0dXJuIGZyYW1lc1xufVxuXG5mdW5jdGlvbiBidWlsZFJlc3RUcmFuc2Zvcm0oYXhpczogU2hha2VBeGlzKTogc3RyaW5nIHtcbiAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW11cbiAgaWYgKGF4aXMuaW5jbHVkZXMoJ3gnKSkgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goJ3RyYW5zbGF0ZVgoMHB4KScpXG4gIGlmIChheGlzLmluY2x1ZGVzKCd5JykpICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKCd0cmFuc2xhdGVZKDBweCknKVxuICBpZiAoYXhpcyA9PT0gJ3onIHx8IGF4aXMgPT09ICd4eXonKSAgICAgICAgICAgcGFydHMucHVzaCgncm90YXRlWigwZGVnKScpXG4gIHJldHVybiBwYXJ0cy5qb2luKCcgJykgfHwgJ25vbmUnXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gUGFyc2Ugb3B0aW9ucyBmcm9tIExFUyBvcHRpb24gb2JqZWN0XG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gcGFyc2VNcyh2YWw6IHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgZmFsbGJhY2s6IG51bWJlcik6IG51bWJlciB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCB8fCB2YWwgPT09IG51bGwpIHJldHVybiBmYWxsYmFja1xuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHJldHVybiB2YWxcbiAgY29uc3QgbSA9IFN0cmluZyh2YWwpLm1hdGNoKC9eKFxcZCsoPzpcXC5cXGQrKT8pKD86cHh8bXMpPyQvKVxuICByZXR1cm4gbSA/IHBhcnNlRmxvYXQobVsxXSEpIDogZmFsbGJhY2tcbn1cblxuZnVuY3Rpb24gcGFyc2VQeCh2YWw6IHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgZmFsbGJhY2s6IG51bWJlcik6IG51bWJlciB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCB8fCB2YWwgPT09IG51bGwpIHJldHVybiBmYWxsYmFja1xuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHJldHVybiB2YWxcbiAgY29uc3QgbSA9IFN0cmluZyh2YWwpLm1hdGNoKC9eKFxcZCsoPzpcXC5cXGQrKT8pcHgkLylcbiAgcmV0dXJuIG0gPyBwYXJzZUZsb2F0KG1bMV0hKSA6IGZhbGxiYWNrXG59XG5cbmZ1bmN0aW9uIHBhcnNlU2hha2VPcHRpb25zKG9wdHM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogU2hha2VPcHRpb25zIHtcbiAgY29uc3QgYXhpcyAgICAgID0gKFsneCcsJ3knLCd6JywneHknLCd4eXonXS5pbmNsdWRlcyhTdHJpbmcob3B0c1snYXhpcyddID8/ICd4JykpXG4gICAgICAgICAgICAgICAgICAgID8gU3RyaW5nKG9wdHNbJ2F4aXMnXSA/PyAneCcpXG4gICAgICAgICAgICAgICAgICAgIDogJ3gnKSBhcyBTaGFrZUF4aXNcbiAgY29uc3Qgbm9pc2UgICAgID0gKFsnc2ltcGxleCcsJ3BlcmxpbicsJ3JlZ3VsYXInXS5pbmNsdWRlcyhTdHJpbmcob3B0c1snbm9pc2UnXSA/PyAncmVndWxhcicpKVxuICAgICAgICAgICAgICAgICAgICA/IFN0cmluZyhvcHRzWydub2lzZSddID8/ICdyZWd1bGFyJylcbiAgICAgICAgICAgICAgICAgICAgOiAncmVndWxhcicpIGFzIE5vaXNlVHlwZVxuICBjb25zdCBhbXBsaXR1ZGUgPSBwYXJzZVB4KG9wdHNbJ2FtcGxpdHVkZSddIGFzIHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgOClcbiAgY29uc3QgZGVjYXkgICAgID0gU3RyaW5nKG9wdHNbJ2RlY2F5J10gPz8gJ3RydWUnKSAhPT0gJ2ZhbHNlJ1xuICBjb25zdCBmcmVxdWVuY3kgPSBwYXJzZU1zKG9wdHNbJ2ZyZXF1ZW5jeSddIGFzIHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgOClcblxuICByZXR1cm4geyBheGlzLCBub2lzZSwgYW1wbGl0dWRlLCBkZWNheSwgZnJlcXVlbmN5IH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBUaGUgcHJpbWl0aXZlXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBzaGFrZSBcdTIwMTQgbm9pc2UtZHJpdmVuIGRpc3BsYWNlbWVudCBhbmltYXRpb24uXG4gKlxuICogVXNhZ2UgaW4gTEVTOlxuICogICBzaGFrZSAjZmllbGQgIDQwMG1zIGVhc2Utb3V0IFtheGlzOiB4ICBub2lzZTogcmVndWxhciAgYW1wbGl0dWRlOiA4cHggIGRlY2F5OiB0cnVlXVxuICogICBzaGFrZSAuY2FyZCAgIDYwMG1zIGxpbmVhciAgIFtheGlzOiB4eSAgbm9pc2U6IHNpbXBsZXggIGFtcGxpdHVkZTogMTJweF1cbiAqICAgc2hha2UgYm9keSAgICA4MDBtcyBsaW5lYXIgICBbYXhpczogeHl6ICBub2lzZTogcGVybGluICBhbXBsaXR1ZGU6IDZweCAgZGVjYXk6IHRydWVdXG4gKi9cbmV4cG9ydCBjb25zdCBzaGFrZTogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgX2Vhc2luZywgb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCByb290ICA9IGhvc3QuZ2V0Um9vdE5vZGUoKSBhcyBEb2N1bWVudCB8IFNoYWRvd1Jvb3RcbiAgY29uc3Qgc2NvcGUgPSByb290IGluc3RhbmNlb2YgRG9jdW1lbnQgPyByb290IDogcm9vdC5vd25lckRvY3VtZW50ID8/IGRvY3VtZW50XG4gIGNvbnN0IGVscyAgID0gQXJyYXkuZnJvbShzY29wZS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSkgYXMgSFRNTEVsZW1lbnRbXVxuICBpZiAoZWxzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgY29uc3Qgb3B0aW9ucyA9IHBhcnNlU2hha2VPcHRpb25zKG9wdHMpXG5cbiAgLy8gfjYwZnBzIGtleWZyYW1lIGRlbnNpdHksIG1pbmltdW0gMTIsIG1heGltdW0gNjBcbiAgY29uc3QgZnJhbWVDb3VudCA9IE1hdGgubWluKDYwLCBNYXRoLm1heCgxMiwgTWF0aC5yb3VuZChkdXJhdGlvbiAvIDE2KSkpXG4gIGNvbnN0IGtleWZyYW1lcyAgPSBidWlsZEtleWZyYW1lcyhvcHRpb25zLCBmcmFtZUNvdW50KVxuXG4gIGF3YWl0IFByb21pc2UuYWxsKFxuICAgIGVscy5tYXAoZWwgPT5cbiAgICAgIGVsLmFuaW1hdGUoa2V5ZnJhbWVzLCB7XG4gICAgICAgIGR1cmF0aW9uLFxuICAgICAgICBlYXNpbmc6ICAgICdsaW5lYXInLCAgIC8vIGVhc2luZyBpcyBiYWtlZCBpbnRvIHRoZSBub2lzZSBlbnZlbG9wZVxuICAgICAgICBmaWxsOiAgICAgICdub25lJywgICAgIC8vIHNoYWtlIHJldHVybnMgdG8gcmVzdCBcdTIwMTQgbm8gaG9sZCBuZWVkZWRcbiAgICAgICAgY29tcG9zaXRlOiAnYWRkJywgICAgICAvLyBhZGQgb24gdG9wIG9mIGV4aXN0aW5nIHRyYW5zZm9ybXMgKGZpbGw6Zm9yd2FyZHMgZXRjLilcbiAgICAgIH0pLmZpbmlzaGVkLmNhdGNoKChlcnI6IHVua25vd24pID0+IHtcbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnIubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSByZXR1cm5cbiAgICAgICAgdGhyb3cgZXJyXG4gICAgICB9KVxuICAgIClcbiAgKVxufVxuIiwgIi8qKlxuICogUGhhc2UgNzogQnVpbHQtaW4gYW5pbWF0aW9uIG1vZHVsZVxuICpcbiAqIEFsbCBwcmltaXRpdmVzIHVzZSB0aGUgV2ViIEFuaW1hdGlvbnMgQVBJIChlbGVtZW50LmFuaW1hdGUoKS5maW5pc2hlZClcbiAqIHNvIHRoZXkgaW50ZWdyYXRlIHdpdGggTEVTJ3MgYXN5bmMtdHJhbnNwYXJlbnQgYHRoZW5gIHNlcXVlbmNpbmc6XG4gKlxuICogICBmYWRlLWluICNzcGxhc2ggMjAwbXMgZWFzZS1vdXQgYW5kXG4gKiAgIHNsaWRlLXVwICNzcGxhc2ggMTgwbXMgZWFzZS1vdXRcbiAqICAgdGhlbiBmaXJlIHNwbGFzaDpyZWFkeSAgICAgICAgICBcdTIxOTAgb25seSBmaXJlcyBhZnRlciBCT1RIIGFuaW1hdGlvbnMgY29tcGxldGVcbiAqXG4gKiBgYW5kYCBcdTIxOTIgUHJvbWlzZS5hbGwgKGNvbmN1cnJlbnQpXG4gKiBgdGhlbmAgXHUyMTkyIHNlcXVlbnRpYWwgYXdhaXQgb24gLmZpbmlzaGVkXG4gKlxuICogVGhlIGV4ZWN1dG9yIGF3YWl0cyBlYWNoIExFU1ByaW1pdGl2ZSByZXR1cm4gdmFsdWUsIHNvIGFuaW1hdGlvblxuICogY29tcGxldGlvbiBpcyBuYXR1cmFsbHkgc2VyaWFsaXplZCB3aXRob3V0IGFueSBzZXRUaW1lb3V0IGhhY2tzLlxuICovXG5cbmltcG9ydCB0eXBlIHsgTEVTTW9kdWxlLCBMRVNQcmltaXRpdmUgfSBmcm9tICcuLi90eXBlcy5qcydcbmltcG9ydCB7IHNoYWtlIH0gZnJvbSAnLi9zaGFrZS5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBVdGlsaXR5OiBxdWVyeSBhbGwgbWF0Y2hpbmcgZWxlbWVudHMgd2l0aGluIHRoZSBob3N0IHNjb3BlXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gcXVlcnlBbGwoc2VsZWN0b3I6IHN0cmluZywgaG9zdDogRWxlbWVudCk6IEVsZW1lbnRbXSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgcm9vdCA9IGhvc3QuZ2V0Um9vdE5vZGUoKSBhcyBEb2N1bWVudCB8IFNoYWRvd1Jvb3RcbiAgICBjb25zdCBzY29wZSA9IHJvb3QgaW5zdGFuY2VvZiBEb2N1bWVudCA/IHJvb3QgOiByb290Lm93bmVyRG9jdW1lbnQgPz8gZG9jdW1lbnRcbiAgICByZXR1cm4gQXJyYXkuZnJvbShzY29wZS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSlcbiAgfSBjYXRjaCB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTOmFuaW1hdGlvbl0gSW52YWxpZCBzZWxlY3RvcjogXCIke3NlbGVjdG9yfVwiYClcbiAgICByZXR1cm4gW11cbiAgfVxufVxuXG4vKipcbiAqIENhbmNlbCBhbGwgcnVubmluZyBXZWIgQW5pbWF0aW9ucyBvbiBhbiBlbGVtZW50IGJlZm9yZSBzdGFydGluZyBhIG5ldyBvbmUuXG4gKiBUaGlzIHByZXZlbnRzIHRoZSBvbmUtZnJhbWUgZmxhc2ggdGhhdCBvY2N1cnMgd2hlbiBhIGZpbGw6Zm9yd2FyZHMgYW5pbWF0aW9uXG4gKiBpcyBpbnRlcnJ1cHRlZCBcdTIwMTQgd2l0aG91dCBjYW5jZWxsYXRpb24sIHRoZSBlbGVtZW50IGJyaWVmbHkgcmV2ZXJ0cyB0byBpdHNcbiAqIHVuLWFuaW1hdGVkIHN0YXRlIGFzIHRoZSBvbGQgQW5pbWF0aW9uIGlzIHJlcGxhY2VkLlxuICovXG5mdW5jdGlvbiBjYW5jZWxBbmltYXRpb25zKGVsOiBFbGVtZW50KTogdm9pZCB7XG4gIGZvciAoY29uc3QgYW5pbSBvZiAoZWwgYXMgSFRNTEVsZW1lbnQpLmdldEFuaW1hdGlvbnMoKSkge1xuICAgIGFuaW0uY2FuY2VsKClcbiAgfVxufVxuXG4vKiogQXdhaXRzIGFsbCBBbmltYXRpb24uZmluaXNoZWQgcHJvbWlzZXMuIFJldHVybnMgaW1tZWRpYXRlbHkgaWYgbm8gZWxlbWVudHMgbWF0Y2hlZC4gKi9cbmFzeW5jIGZ1bmN0aW9uIGFuaW1hdGVBbGwoXG4gIGVsczogRWxlbWVudFtdLFxuICBrZXlmcmFtZXM6IEtleWZyYW1lW10sXG4gIG9wdGlvbnM6IEtleWZyYW1lQW5pbWF0aW9uT3B0aW9uc1xuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChlbHMubGVuZ3RoID09PSAwKSByZXR1cm5cbiAgLy8gTm90ZTogY2FuY2VsQW5pbWF0aW9ucyBpcyBpbnRlbnRpb25hbGx5IE5PVCBjYWxsZWQgaGVyZS5cbiAgLy8gSXQgaXMgb25seSBjYWxsZWQgaW4gc3RhZ2dlci1lbnRlci9zdGFnZ2VyLWV4aXQgd2hlcmUgd2UgZXhwbGljaXRseVxuICAvLyByZXN0YXJ0IGFuIGluLXByb2dyZXNzIHN0YWdnZXIuIENhbGxpbmcgY2FuY2VsIG9uIGV2ZXJ5IHByaW1pdGl2ZVxuICAvLyB3b3VsZCBkZXN0cm95IGZpbGw6Zm9yd2FyZHMgaG9sZHMgZnJvbSBwcmV2aW91cyBhbmltYXRpb25zXG4gIC8vIChlLmcuIHN0YWdnZXItZW50ZXIncyBob2xkIHdvdWxkIGJlIGNhbmNlbGxlZCBieSBhIHN1YnNlcXVlbnQgcHVsc2UpLlxuICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBlbHMubWFwKGVsID0+IChlbCBhcyBIVE1MRWxlbWVudCkuYW5pbWF0ZShrZXlmcmFtZXMsIG9wdGlvbnMpLmZpbmlzaGVkXG4gICAgICAuY2F0Y2goKGVycjogdW5rbm93bikgPT4ge1xuICAgICAgICAvLyBBYm9ydEVycm9yIGlzIGV4cGVjdGVkIHdoZW4gY2FuY2VsQW5pbWF0aW9ucygpIGludGVycnVwdHMgYSBydW5uaW5nXG4gICAgICAgIC8vIGFuaW1hdGlvbi4gU3dhbGxvdyBpdCBcdTIwMTQgdGhlIG5ldyBhbmltYXRpb24gaGFzIGFscmVhZHkgc3RhcnRlZC5cbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnIubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSByZXR1cm5cbiAgICAgICAgdGhyb3cgZXJyXG4gICAgICB9KVxuICAgIClcbiAgKVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIERpcmVjdGlvbiBoZWxwZXJzXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxudHlwZSBEaXJlY3Rpb24gPSAnbGVmdCcgfCAncmlnaHQnIHwgJ3VwJyB8ICdkb3duJ1xuXG5mdW5jdGlvbiBzbGlkZUtleWZyYW1lcyhkaXI6IERpcmVjdGlvbiwgZW50ZXJpbmc6IGJvb2xlYW4pOiBLZXlmcmFtZVtdIHtcbiAgY29uc3QgZGlzdGFuY2UgPSAnODBweCdcbiAgY29uc3QgdHJhbnNsYXRpb25zOiBSZWNvcmQ8RGlyZWN0aW9uLCBzdHJpbmc+ID0ge1xuICAgIGxlZnQ6ICBgdHJhbnNsYXRlWCgtJHtkaXN0YW5jZX0pYCxcbiAgICByaWdodDogYHRyYW5zbGF0ZVgoJHtkaXN0YW5jZX0pYCxcbiAgICB1cDogICAgYHRyYW5zbGF0ZVkoLSR7ZGlzdGFuY2V9KWAsXG4gICAgZG93bjogIGB0cmFuc2xhdGVZKCR7ZGlzdGFuY2V9KWAsXG4gIH1cbiAgY29uc3QgdHJhbnNsYXRlID0gdHJhbnNsYXRpb25zW2Rpcl1cbiAgaWYgKGVudGVyaW5nKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHsgb3BhY2l0eTogMCwgdHJhbnNmb3JtOiB0cmFuc2xhdGUgfSxcbiAgICAgIHsgb3BhY2l0eTogMSwgdHJhbnNmb3JtOiAnbm9uZScgfSxcbiAgICBdXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHsgb3BhY2l0eTogMSwgdHJhbnNmb3JtOiAnbm9uZScgfSxcbiAgICAgIHsgb3BhY2l0eTogMCwgdHJhbnNmb3JtOiB0cmFuc2xhdGUgfSxcbiAgICBdXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBDb3JlIHByaW1pdGl2ZXNcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5jb25zdCBmYWRlSW46IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgX29wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLFxuICAgIFt7IG9wYWNpdHk6IDAgfSwgeyBvcGFjaXR5OiAxIH1dLFxuICAgIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9XG4gIClcbn1cblxuY29uc3QgZmFkZU91dDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBfb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgYXdhaXQgYW5pbWF0ZUFsbChlbHMsXG4gICAgW3sgb3BhY2l0eTogMSB9LCB7IG9wYWNpdHk6IDAgfV0sXG4gICAgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnIH1cbiAgKVxufVxuXG5jb25zdCBzbGlkZUluOiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIG9wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZnJvbSA9IChvcHRzWydmcm9tJ10gYXMgRGlyZWN0aW9uIHwgdW5kZWZpbmVkKSA/PyAncmlnaHQnXG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBhd2FpdCBhbmltYXRlQWxsKGVscywgc2xpZGVLZXlmcmFtZXMoZnJvbSwgdHJ1ZSksIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9KVxufVxuXG5jb25zdCBzbGlkZU91dDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBvcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IHRvID0gKG9wdHNbJ3RvJ10gYXMgRGlyZWN0aW9uIHwgdW5kZWZpbmVkKSA/PyAnbGVmdCdcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLCBzbGlkZUtleWZyYW1lcyh0bywgZmFsc2UpLCB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdmb3J3YXJkcycgfSlcbn1cblxuY29uc3Qgc2xpZGVVcDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBfb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgYXdhaXQgYW5pbWF0ZUFsbChlbHMsIHNsaWRlS2V5ZnJhbWVzKCd1cCcsIHRydWUpLCB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdmb3J3YXJkcycgfSlcbn1cblxuY29uc3Qgc2xpZGVEb3duOiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIF9vcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBhd2FpdCBhbmltYXRlQWxsKGVscywgc2xpZGVLZXlmcmFtZXMoJ2Rvd24nLCBmYWxzZSksIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9KVxufVxuXG4vKipcbiAqIHB1bHNlIFx1MjAxNCBicmllZiBzY2FsZSArIG9wYWNpdHkgcHVsc2UgdG8gZHJhdyBhdHRlbnRpb24gdG8gdXBkYXRlZCBpdGVtcy5cbiAqIFVzZWQgZm9yIEQzIFwidXBkYXRlXCIgcGhhc2U6IGl0ZW1zIHdob3NlIGNvbnRlbnQgY2hhbmdlZCBnZXQgYSB2aXN1YWwgcGluZy5cbiAqL1xuY29uc3QgcHVsc2U6IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgX29wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLCBbXG4gICAgeyBvcGFjaXR5OiAxLCAgICB0cmFuc2Zvcm06ICdzY2FsZSgxKScgfSxcbiAgICB7IG9wYWNpdHk6IDAuNzUsIHRyYW5zZm9ybTogJ3NjYWxlKDEuMDMpJywgb2Zmc2V0OiAwLjQgfSxcbiAgICB7IG9wYWNpdHk6IDEsICAgIHRyYW5zZm9ybTogJ3NjYWxlKDEpJyB9LFxuICBdLCB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdub25lJyB9KVxufVxuXG4vKipcbiAqIHN0YWdnZXItZW50ZXIgXHUyMDE0IHJ1bnMgc2xpZGVJbiBvbiBlYWNoIG1hdGNoZWQgZWxlbWVudCBpbiBzZXF1ZW5jZSxcbiAqIG9mZnNldCBieSBgZ2FwYCBtaWxsaXNlY29uZHMgYmV0d2VlbiBlYWNoLlxuICpcbiAqIE9wdGlvbnM6XG4gKiAgIGdhcDogTm1zICAgXHUyMDE0IGRlbGF5IGJldHdlZW4gZWFjaCBlbGVtZW50IChkZWZhdWx0OiA0MG1zKVxuICogICBmcm9tOiBkaXIgIFx1MjAxNCAnbGVmdCcgfCAncmlnaHQnIHwgJ3VwJyB8ICdkb3duJyAoZGVmYXVsdDogJ3JpZ2h0JylcbiAqXG4gKiBBbGwgYW5pbWF0aW9ucyBhcmUgc3RhcnRlZCB0b2dldGhlciAoUHJvbWlzZS5hbGwpIGJ1dCBlYWNoIGhhcyBhblxuICogaW5jcmVhc2luZyBgZGVsYXlgIFx1MjAxNCB0aGlzIGdpdmVzIHRoZSBzdGFnZ2VyIGVmZmVjdCB3aGlsZSBrZWVwaW5nXG4gKiB0aGUgdG90YWwgUHJvbWlzZS1zZXR0bGVkIHRpbWUgPSBkdXJhdGlvbiArIChuLTEpICogZ2FwLlxuICovXG5jb25zdCBzdGFnZ2VyRW50ZXI6IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgaWYgKGVscy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIGNvbnN0IGdhcCAgPSBwYXJzZU1zKG9wdHNbJ2dhcCddIGFzIHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgNDApXG4gIGNvbnN0IGZyb20gPSAob3B0c1snZnJvbSddIGFzIERpcmVjdGlvbiB8IHVuZGVmaW5lZCkgPz8gJ3JpZ2h0J1xuXG4gIGVscy5mb3JFYWNoKGNhbmNlbEFuaW1hdGlvbnMpXG4gIGF3YWl0IFByb21pc2UuYWxsKFxuICAgIGVscy5tYXAoKGVsLCBpKSA9PlxuICAgICAgKGVsIGFzIEhUTUxFbGVtZW50KS5hbmltYXRlKFxuICAgICAgICBzbGlkZUtleWZyYW1lcyhmcm9tLCB0cnVlKSxcbiAgICAgICAgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnLCBkZWxheTogaSAqIGdhcCB9XG4gICAgICApLmZpbmlzaGVkLmNhdGNoKChlcnI6IHVua25vd24pID0+IHtcbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnIubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSByZXR1cm5cbiAgICAgICAgdGhyb3cgZXJyXG4gICAgICB9KVxuICAgIClcbiAgKVxufVxuXG4vKipcbiAqIHN0YWdnZXItZXhpdCBcdTIwMTQgcnVucyBzbGlkZU91dCBvbiBlYWNoIG1hdGNoZWQgZWxlbWVudCBpbiBzZXF1ZW5jZS5cbiAqXG4gKiBPcHRpb25zOlxuICogICBnYXA6IE5tcyAgICAgICAgICBcdTIwMTQgZGVsYXkgYmV0d2VlbiBlYWNoIGVsZW1lbnQgKGRlZmF1bHQ6IDIwbXMpXG4gKiAgIGRpcmVjdGlvbjogcmV2ZXJzZSBcdTIwMTQgcHJvY2VzcyBlbGVtZW50cyBpbiByZXZlcnNlIG9yZGVyXG4gKiAgIHRvOiBkaXIgICAgICAgICAgIFx1MjAxNCBleGl0IGRpcmVjdGlvbiAoZGVmYXVsdDogJ2xlZnQnKVxuICovXG5jb25zdCBzdGFnZ2VyRXhpdDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBvcHRzLCBob3N0KSA9PiB7XG4gIC8vIEZpbHRlciB0byBvbmx5IGVsZW1lbnRzIHRoYXQgYXJlIGFjdHVhbGx5IHZpc2libGUgXHUyMDE0IHNraXAgaGlkZGVuL2FscmVhZHktZXhpdGVkIG9uZXNcbiAgbGV0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KS5maWx0ZXIoZWwgPT4ge1xuICAgIGNvbnN0IHN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWwgYXMgSFRNTEVsZW1lbnQpXG4gICAgcmV0dXJuIHN0eWxlLmRpc3BsYXkgIT09ICdub25lJyAmJiBzdHlsZS52aXNpYmlsaXR5ICE9PSAnaGlkZGVuJ1xuICB9KVxuICBpZiAoZWxzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgY29uc3QgZ2FwICAgICA9IHBhcnNlTXMob3B0c1snZ2FwJ10gYXMgc3RyaW5nIHwgbnVtYmVyIHwgdW5kZWZpbmVkLCAyMClcbiAgY29uc3QgcmV2ZXJzZSA9IFN0cmluZyhvcHRzWydkaXJlY3Rpb24nXSA/PyAnJykgPT09ICdyZXZlcnNlJ1xuICBjb25zdCB0byAgICAgID0gKG9wdHNbJ3RvJ10gYXMgRGlyZWN0aW9uIHwgdW5kZWZpbmVkKSA/PyAnbGVmdCdcblxuICBpZiAocmV2ZXJzZSkgZWxzID0gWy4uLmVsc10ucmV2ZXJzZSgpXG5cbiAgZWxzLmZvckVhY2goY2FuY2VsQW5pbWF0aW9ucylcbiAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgZWxzLm1hcCgoZWwsIGkpID0+XG4gICAgICAoZWwgYXMgSFRNTEVsZW1lbnQpLmFuaW1hdGUoXG4gICAgICAgIHNsaWRlS2V5ZnJhbWVzKHRvLCBmYWxzZSksXG4gICAgICAgIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJywgZGVsYXk6IGkgKiBnYXAgfVxuICAgICAgKS5maW5pc2hlZC5jYXRjaCgoZXJyOiB1bmtub3duKSA9PiB7XG4gICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBET01FeGNlcHRpb24gJiYgZXJyLm5hbWUgPT09ICdBYm9ydEVycm9yJykgcmV0dXJuXG4gICAgICAgIHRocm93IGVyclxuICAgICAgfSlcbiAgICApXG4gIClcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBVdGlsaXR5OiBwYXJzZSBhIG1pbGxpc2Vjb25kIHZhbHVlIGZyb20gYSBzdHJpbmcgbGlrZSBcIjQwbXNcIiBvciBhIG51bWJlclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIHBhcnNlTXModmFsOiBzdHJpbmcgfCBudW1iZXIgfCB1bmRlZmluZWQsIGZhbGxiYWNrOiBudW1iZXIpOiBudW1iZXIge1xuICBpZiAodmFsID09PSB1bmRlZmluZWQgfHwgdmFsID09PSBudWxsKSByZXR1cm4gZmFsbGJhY2tcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSByZXR1cm4gdmFsXG4gIGNvbnN0IG0gPSBTdHJpbmcodmFsKS5tYXRjaCgvXihcXGQrKD86XFwuXFxkKyk/KW1zJC8pXG4gIGlmIChtKSByZXR1cm4gcGFyc2VGbG9hdChtWzFdISlcbiAgY29uc3QgbiA9IHBhcnNlRmxvYXQoU3RyaW5nKHZhbCkpXG4gIHJldHVybiBOdW1iZXIuaXNOYU4obikgPyBmYWxsYmFjayA6IG5cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBNb2R1bGUgZXhwb3J0XG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgYW5pbWF0aW9uTW9kdWxlOiBMRVNNb2R1bGUgPSB7XG4gIG5hbWU6ICdhbmltYXRpb24nLFxuICBwcmltaXRpdmVzOiB7XG4gICAgJ2ZhZGUtaW4nOiAgICAgICBmYWRlSW4sXG4gICAgJ2ZhZGUtb3V0JzogICAgICBmYWRlT3V0LFxuICAgICdzbGlkZS1pbic6ICAgICAgc2xpZGVJbixcbiAgICAnc2xpZGUtb3V0JzogICAgIHNsaWRlT3V0LFxuICAgICdzbGlkZS11cCc6ICAgICAgc2xpZGVVcCxcbiAgICAnc2xpZGUtZG93bic6ICAgIHNsaWRlRG93bixcbiAgICAncHVsc2UnOiAgICAgICAgIHB1bHNlLFxuICAgICdzdGFnZ2VyLWVudGVyJzogc3RhZ2dlckVudGVyLFxuICAgICdzdGFnZ2VyLWV4aXQnOiAgc3RhZ2dlckV4aXQsXG4gICAgJ3NoYWtlJzogICAgICAgICBzaGFrZSxcbiAgfSxcbn1cblxuZXhwb3J0IGRlZmF1bHQgYW5pbWF0aW9uTW9kdWxlXG4iLCAiaW1wb3J0IHR5cGUge1xuICBMRVNOb2RlLCBFeHByTm9kZSwgU2VxdWVuY2VOb2RlLCBQYXJhbGxlbE5vZGUsXG4gIFNldE5vZGUsIEVtaXROb2RlLCBCcm9hZGNhc3ROb2RlLCBXYWl0Tm9kZSxcbiAgQ2FsbE5vZGUsIEJpbmROb2RlLCBNYXRjaE5vZGUsIFRyeU5vZGUsIEFuaW1hdGlvbk5vZGUsXG59IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuaW1wb3J0IHR5cGUgeyBQYXR0ZXJuTm9kZSB9IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuaW1wb3J0IHsgTEVTU2NvcGUgfSBmcm9tICcuL3Njb3BlLmpzJ1xuaW1wb3J0IHR5cGUgeyBDb21tYW5kUmVnaXN0cnkgfSBmcm9tICcuL3JlZ2lzdHJ5LmpzJ1xuaW1wb3J0IHR5cGUgeyBNb2R1bGVSZWdpc3RyeSB9IGZyb20gJ0Btb2R1bGVzL3R5cGVzLmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEV4ZWN1dGlvbiBjb250ZXh0IFx1MjAxNCBldmVyeXRoaW5nIHRoZSBleGVjdXRvciBuZWVkcywgcGFzc2VkIGRvd24gdGhlIGNhbGwgdHJlZVxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBpbnRlcmZhY2UgTEVTQ29udGV4dCB7XG4gIC8qKiBMb2NhbCB2YXJpYWJsZSBzY29wZSBmb3IgdGhlIGN1cnJlbnQgY2FsbCBmcmFtZSAqL1xuICBzY29wZTogTEVTU2NvcGVcbiAgLyoqIFRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBob3N0IGVsZW1lbnQgXHUyMDE0IHVzZWQgYXMgcXVlcnlTZWxlY3RvciByb290ICovXG4gIGhvc3Q6IEVsZW1lbnRcbiAgLyoqIENvbW1hbmQgZGVmaW5pdGlvbnMgcmVnaXN0ZXJlZCBieSA8bG9jYWwtY29tbWFuZD4gY2hpbGRyZW4gKi9cbiAgY29tbWFuZHM6IENvbW1hbmRSZWdpc3RyeVxuICAvKiogQW5pbWF0aW9uIGFuZCBvdGhlciBwcmltaXRpdmUgbW9kdWxlcyAqL1xuICBtb2R1bGVzOiBNb2R1bGVSZWdpc3RyeVxuICAvKiogUmVhZCBhIERhdGFzdGFyIHNpZ25hbCB2YWx1ZSBieSBuYW1lICh3aXRob3V0ICQgcHJlZml4KSAqL1xuICBnZXRTaWduYWw6IChuYW1lOiBzdHJpbmcpID0+IHVua25vd25cbiAgLyoqIFdyaXRlIGEgRGF0YXN0YXIgc2lnbmFsIHZhbHVlIGJ5IG5hbWUgKHdpdGhvdXQgJCBwcmVmaXgpICovXG4gIHNldFNpZ25hbDogKG5hbWU6IHN0cmluZywgdmFsdWU6IHVua25vd24pID0+IHZvaWRcbiAgLyoqIERpc3BhdGNoIGEgbG9jYWwgQ3VzdG9tRXZlbnQgb24gdGhlIGhvc3QgKGJ1YmJsZXM6IGZhbHNlKSAqL1xuICBlbWl0TG9jYWw6IChldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHZvaWRcbiAgLyoqIERpc3BhdGNoIGEgRE9NLXdpZGUgQ3VzdG9tRXZlbnQgKGJ1YmJsZXM6IHRydWUsIGNvbXBvc2VkOiB0cnVlKSAqL1xuICBicm9hZGNhc3Q6IChldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHZvaWRcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBNYWluIGV4ZWN1dG9yXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBFeGVjdXRlcyBhIExFU05vZGUgQVNUIGluIHRoZSBnaXZlbiBjb250ZXh0LlxuICpcbiAqIEFzeW5jIHRyYW5zcGFyZW5jeTogZXZlcnkgc3RlcCBpcyBhd2FpdGVkIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciBpdFxuICogaXMgc3luY2hyb25vdXMgb3IgcmV0dXJucyBhIFByb21pc2UuIFRoZSBhdXRob3IgbmV2ZXIgd3JpdGVzIGBhd2FpdGAuXG4gKiBUaGUgYHRoZW5gIGNvbm5lY3RpdmUgaW4gTEVTIHNvdXJjZSBtYXBzIHRvIHNlcXVlbnRpYWwgYGF3YWl0YCBoZXJlLlxuICogVGhlIGBhbmRgIGNvbm5lY3RpdmUgbWFwcyB0byBgUHJvbWlzZS5hbGxgLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZShub2RlOiBMRVNOb2RlLCBjdHg6IExFU0NvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgc3dpdGNoIChub2RlLnR5cGUpIHtcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBTZXF1ZW5jZTogQSB0aGVuIEIgdGhlbiBDIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3NlcXVlbmNlJzpcbiAgICAgIGZvciAoY29uc3Qgc3RlcCBvZiAobm9kZSBhcyBTZXF1ZW5jZU5vZGUpLnN0ZXBzKSB7XG4gICAgICAgIGF3YWl0IGV4ZWN1dGUoc3RlcCwgY3R4KVxuICAgICAgfVxuICAgICAgcmV0dXJuXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgUGFyYWxsZWw6IEEgYW5kIEIgYW5kIEMgKFByb21pc2UuYWxsKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdwYXJhbGxlbCc6XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbCgobm9kZSBhcyBQYXJhbGxlbE5vZGUpLmJyYW5jaGVzLm1hcChiID0+IGV4ZWN1dGUoYiwgY3R4KSkpXG4gICAgICByZXR1cm5cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBzZXQgJHNpZ25hbCB0byBleHByIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3NldCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIFNldE5vZGVcbiAgICAgIGNvbnN0IHZhbHVlID0gZXZhbEV4cHIobi52YWx1ZSwgY3R4KVxuICAgICAgY3R4LnNldFNpZ25hbChuLnNpZ25hbCwgdmFsdWUpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgZW1pdCBldmVudDpuYW1lIFtwYXlsb2FkXSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdlbWl0Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgRW1pdE5vZGVcbiAgICAgIGNvbnN0IHBheWxvYWQgPSBuLnBheWxvYWQubWFwKHAgPT4gZXZhbEV4cHIocCwgY3R4KSlcbiAgICAgIGN0eC5lbWl0TG9jYWwobi5ldmVudCwgcGF5bG9hZClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBicm9hZGNhc3QgZXZlbnQ6bmFtZSBbcGF5bG9hZF0gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnYnJvYWRjYXN0Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQnJvYWRjYXN0Tm9kZVxuICAgICAgY29uc3QgcGF5bG9hZCA9IG4ucGF5bG9hZC5tYXAocCA9PiBldmFsRXhwcihwLCBjdHgpKVxuICAgICAgY3R4LmJyb2FkY2FzdChuLmV2ZW50LCBwYXlsb2FkKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIHdhaXQgTm1zIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3dhaXQnOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBXYWl0Tm9kZVxuICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG4ubXMpKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIGNhbGwgY29tbWFuZDpuYW1lIFthcmdzXSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdjYWxsJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQ2FsbE5vZGVcblxuICAgICAgLy8gXHUyNTAwXHUyNTAwIHdpbmRvdy5mbiAvIGdsb2JhbFRoaXMuZm4gaW52b2NhdGlvbiBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICAgIC8vIElmIHRoZSBjb21tYW5kIG5hbWUgc3RhcnRzIHdpdGggXCJ3aW5kb3cuXCIgb3IgXCJnbG9iYWxUaGlzLlwiLCByZXNvbHZlXG4gICAgICAvLyBpdCBhcyBhIEpTIGZ1bmN0aW9uIGNhbGwgcmF0aGVyIHRoYW4gYSByZWdpc3RlcmVkIDxsb2NhbC1jb21tYW5kPi5cbiAgICAgIC8vIFRoaXMgYWxsb3dzIExFUyBvbi1ldmVudCBoYW5kbGVycyBhbmQgY29tbWFuZCBkby1ibG9ja3MgdG8gYXdhaXRcbiAgICAgIC8vIGFyYml0cmFyeSBKUyBmdW5jdGlvbnMsIGluY2x1ZGluZyBvbmVzIHRoYXQgcmV0dXJuIFByb21pc2VzLlxuICAgICAgLy9cbiAgICAgIC8vIFVzYWdlIGluIExFUyBzb3VyY2U6XG4gICAgICAvLyAgIGNhbGwgd2luZG93LnNoYWtlQW5kUGFuXG4gICAgICAvLyAgIGNhbGwgd2luZG93LmVudGVyTGF5ZXJzU3RhZ2dlclxuICAgICAgLy9cbiAgICAgIC8vIEFyZ3MgKGlmIGFueSkgYXJlIGV2YWx1YXRlZCBhbmQgc3ByZWFkIGFzIHBvc2l0aW9uYWwgcGFyYW1ldGVyczpcbiAgICAgIC8vICAgY2FsbCB3aW5kb3cudXBkYXRlVGltZURpc3BsYXkgWyRjdXJyZW50SG91cl1cbiAgICAgIC8vICAgXHUyMTkyIHdpbmRvdy51cGRhdGVUaW1lRGlzcGxheShjdXJyZW50SG91clZhbHVlKVxuICAgICAgaWYgKG4uY29tbWFuZC5zdGFydHNXaXRoKCd3aW5kb3cuJykgfHwgbi5jb21tYW5kLnN0YXJ0c1dpdGgoJ2dsb2JhbFRoaXMuJykpIHtcbiAgICAgICAgY29uc3QgZm5QYXRoID0gbi5jb21tYW5kLnN0YXJ0c1dpdGgoJ3dpbmRvdy4nKVxuICAgICAgICAgID8gbi5jb21tYW5kLnNsaWNlKCd3aW5kb3cuJy5sZW5ndGgpXG4gICAgICAgICAgOiBuLmNvbW1hbmQuc2xpY2UoJ2dsb2JhbFRoaXMuJy5sZW5ndGgpXG5cbiAgICAgICAgLy8gU3VwcG9ydCBkb3QtcGF0aHM6IHdpbmRvdy5tYXBDb250cm9sbGVyLmVudGVyTGF5ZXJcbiAgICAgICAgY29uc3QgcGFydHMgID0gZm5QYXRoLnNwbGl0KCcuJylcbiAgICAgICAgbGV0ICAgdGFyZ2V0OiB1bmtub3duID0gZ2xvYmFsVGhpc1xuICAgICAgICBmb3IgKGNvbnN0IHBhcnQgb2YgcGFydHMuc2xpY2UoMCwgLTEpKSB7XG4gICAgICAgICAgaWYgKHRhcmdldCA9PSBudWxsIHx8IHR5cGVvZiB0YXJnZXQgIT09ICdvYmplY3QnKSB7IHRhcmdldCA9IHVuZGVmaW5lZDsgYnJlYWsgfVxuICAgICAgICAgIHRhcmdldCA9ICh0YXJnZXQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW3BhcnRdXG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZm5OYW1lID0gcGFydHNbcGFydHMubGVuZ3RoIC0gMV0hXG4gICAgICAgIGNvbnN0IGZuID0gdGFyZ2V0ID09IG51bGwgPyB1bmRlZmluZWRcbiAgICAgICAgICA6ICh0YXJnZXQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW2ZuTmFtZV1cblxuICAgICAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKGBbTEVTXSB3aW5kb3cuJHtmblBhdGh9IGlzIG5vdCBhIGZ1bmN0aW9uIChnb3QgJHt0eXBlb2YgZm59KWApXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICAvLyBFdmFsdWF0ZSBhcmdzIFx1MjAxNCBwYXNzIGFzIHBvc2l0aW9uYWwgcGFyYW1zIGluIGRlY2xhcmF0aW9uIG9yZGVyXG4gICAgICAgIGNvbnN0IGV2YWxlZEFyZ1ZhbHVlcyA9IE9iamVjdC52YWx1ZXMobi5hcmdzKVxuICAgICAgICAgIC5tYXAoZXhwck5vZGUgPT4gZXZhbEV4cHIoZXhwck5vZGUsIGN0eCkpXG5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gKGZuIGFzICguLi5hOiB1bmtub3duW10pID0+IHVua25vd24pXG4gICAgICAgICAgLmFwcGx5KHRhcmdldCBhcyBvYmplY3QsIGV2YWxlZEFyZ1ZhbHVlcylcbiAgICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpIGF3YWl0IHJlc3VsdFxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgY29uc3QgZGVmID0gY3R4LmNvbW1hbmRzLmdldChuLmNvbW1hbmQpXG4gICAgICBpZiAoIWRlZikge1xuICAgICAgICBjb25zb2xlLndhcm4oYFtMRVNdIFVua25vd24gY29tbWFuZDogXCIke24uY29tbWFuZH1cImApXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICAvLyBFdmFsdWF0ZSBndWFyZCBcdTIwMTQgZmFsc3kgPSBzaWxlbnQgbm8tb3AgKG5vdCBhbiBlcnJvciwgbm8gcmVzY3VlKVxuICAgICAgaWYgKGRlZi5ndWFyZCkge1xuICAgICAgICBjb25zdCBwYXNzZXMgPSBldmFsR3VhcmQoZGVmLmd1YXJkLCBjdHgpXG4gICAgICAgIGlmICghcGFzc2VzKSB7XG4gICAgICAgICAgY29uc29sZS5kZWJ1ZyhgW0xFU10gY29tbWFuZCBcIiR7bi5jb21tYW5kfVwiIGd1YXJkIHJlamVjdGVkYClcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBCdWlsZCBjaGlsZCBzY29wZTogYmluZCBhcmdzIGludG8gaXRcbiAgICAgIGNvbnN0IGNoaWxkU2NvcGUgPSBjdHguc2NvcGUuY2hpbGQoKVxuICAgICAgY29uc3QgZXZhbGVkQXJnczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fVxuICAgICAgZm9yIChjb25zdCBba2V5LCBleHByTm9kZV0gb2YgT2JqZWN0LmVudHJpZXMobi5hcmdzKSkge1xuICAgICAgICBldmFsZWRBcmdzW2tleV0gPSBldmFsRXhwcihleHByTm9kZSwgY3R4KVxuICAgICAgfVxuXG4gICAgICAvLyBBcHBseSBhcmcgZGVmYXVsdHMgZnJvbSBkZWYgKFBoYXNlIDIgQXJnRGVmIHBhcnNpbmcgXHUyMDE0IHNpbXBsaWZpZWQgaGVyZSlcbiAgICAgIGZvciAoY29uc3QgYXJnRGVmIG9mIGRlZi5hcmdzKSB7XG4gICAgICAgIGlmICghKGFyZ0RlZi5uYW1lIGluIGV2YWxlZEFyZ3MpICYmIGFyZ0RlZi5kZWZhdWx0KSB7XG4gICAgICAgICAgZXZhbGVkQXJnc1thcmdEZWYubmFtZV0gPSBldmFsRXhwcihhcmdEZWYuZGVmYXVsdCwgY3R4KVxuICAgICAgICB9XG4gICAgICAgIGNoaWxkU2NvcGUuc2V0KGFyZ0RlZi5uYW1lLCBldmFsZWRBcmdzW2FyZ0RlZi5uYW1lXSA/PyBudWxsKVxuICAgICAgfVxuXG4gICAgICBjb25zdCBjaGlsZEN0eDogTEVTQ29udGV4dCA9IHsgLi4uY3R4LCBzY29wZTogY2hpbGRTY29wZSB9XG4gICAgICBhd2FpdCBleGVjdXRlKGRlZi5ib2R5LCBjaGlsZEN0eClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBuYW1lIDwtIEB2ZXJiICd1cmwnIFthcmdzXSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdiaW5kJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQmluZE5vZGVcbiAgICAgIGNvbnN0IHsgdmVyYiwgdXJsLCBhcmdzIH0gPSBuLmFjdGlvblxuICAgICAgY29uc3QgZXZhbGVkQXJnczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fVxuICAgICAgZm9yIChjb25zdCBba2V5LCBleHByTm9kZV0gb2YgT2JqZWN0LmVudHJpZXMoYXJncykpIHtcbiAgICAgICAgZXZhbGVkQXJnc1trZXldID0gZXZhbEV4cHIoZXhwck5vZGUsIGN0eClcbiAgICAgIH1cblxuICAgICAgbGV0IHJlc3VsdDogdW5rbm93blxuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgcGVyZm9ybUFjdGlvbih2ZXJiLCB1cmwsIGV2YWxlZEFyZ3MsIGN0eClcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBQcm9wYWdhdGUgc28gZW5jbG9zaW5nIHRyeS9yZXNjdWUgY2FuIGNhdGNoIGl0XG4gICAgICAgIHRocm93IGVyclxuICAgICAgfVxuXG4gICAgICBjdHguc2NvcGUuc2V0KG4ubmFtZSwgcmVzdWx0KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIG1hdGNoIHN1YmplY3QgLyBhcm1zIC8gL21hdGNoIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ21hdGNoJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgTWF0Y2hOb2RlXG4gICAgICBjb25zdCBzdWJqZWN0ID0gZXZhbEV4cHIobi5zdWJqZWN0LCBjdHgpXG5cbiAgICAgIGZvciAoY29uc3QgYXJtIG9mIG4uYXJtcykge1xuICAgICAgICBjb25zdCBiaW5kaW5ncyA9IG1hdGNoUGF0dGVybnMoYXJtLnBhdHRlcm5zLCBzdWJqZWN0KVxuICAgICAgICBpZiAoYmluZGluZ3MgIT09IG51bGwpIHtcbiAgICAgICAgICAvLyBDcmVhdGUgY2hpbGQgc2NvcGUgd2l0aCBwYXR0ZXJuIGJpbmRpbmdzXG4gICAgICAgICAgY29uc3QgYXJtU2NvcGUgPSBjdHguc2NvcGUuY2hpbGQoKVxuICAgICAgICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKGJpbmRpbmdzKSkge1xuICAgICAgICAgICAgYXJtU2NvcGUuc2V0KGssIHYpXG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGFybUN0eDogTEVTQ29udGV4dCA9IHsgLi4uY3R4LCBzY29wZTogYXJtU2NvcGUgfVxuICAgICAgICAgIGF3YWl0IGV4ZWN1dGUoYXJtLmJvZHksIGFybUN0eClcbiAgICAgICAgICByZXR1cm4gICAvLyBGaXJzdCBtYXRjaGluZyBhcm0gd2lucyBcdTIwMTQgbm8gZmFsbHRocm91Z2hcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIG1hdGNoOiBubyBhcm0gbWF0Y2hlZCBzdWJqZWN0OicsIHN1YmplY3QpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgdHJ5IC8gcmVzY3VlIC8gYWZ0ZXJ3YXJkcyAvIC90cnkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAndHJ5Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgVHJ5Tm9kZVxuICAgICAgbGV0IHRocmV3ID0gZmFsc2VcblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZXhlY3V0ZShuLmJvZHksIGN0eClcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICB0aHJldyA9IHRydWVcbiAgICAgICAgaWYgKG4ucmVzY3VlKSB7XG4gICAgICAgICAgLy8gQmluZCB0aGUgZXJyb3IgYXMgYCRlcnJvcmAgaW4gdGhlIHJlc2N1ZSBzY29wZVxuICAgICAgICAgIGNvbnN0IHJlc2N1ZVNjb3BlID0gY3R4LnNjb3BlLmNoaWxkKClcbiAgICAgICAgICByZXNjdWVTY29wZS5zZXQoJ2Vycm9yJywgZXJyKVxuICAgICAgICAgIGNvbnN0IHJlc2N1ZUN0eDogTEVTQ29udGV4dCA9IHsgLi4uY3R4LCBzY29wZTogcmVzY3VlU2NvcGUgfVxuICAgICAgICAgIGF3YWl0IGV4ZWN1dGUobi5yZXNjdWUsIHJlc2N1ZUN0eClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBObyByZXNjdWUgY2xhdXNlIFx1MjAxNCByZS10aHJvdyBzbyBvdXRlciB0cnkgY2FuIGNhdGNoIGl0XG4gICAgICAgICAgdGhyb3cgZXJyXG4gICAgICAgIH1cbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIGlmIChuLmFmdGVyd2FyZHMpIHtcbiAgICAgICAgICAvLyBhZnRlcndhcmRzIGFsd2F5cyBydW5zIGlmIGV4ZWN1dGlvbiBlbnRlcmVkIHRoZSB0cnkgYm9keVxuICAgICAgICAgIC8vIChndWFyZCByZWplY3Rpb24gbmV2ZXIgcmVhY2hlcyBoZXJlIFx1MjAxNCBzZWUgYGNhbGxgIGhhbmRsZXIgYWJvdmUpXG4gICAgICAgICAgYXdhaXQgZXhlY3V0ZShuLmFmdGVyd2FyZHMsIGN0eClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAodGhyZXcgJiYgIW4ucmVzY3VlKSB7XG4gICAgICAgIC8vIEFscmVhZHkgcmUtdGhyb3duIGFib3ZlIFx1MjAxNCB1bnJlYWNoYWJsZSwgYnV0IFR5cGVTY3JpcHQgbmVlZHMgdGhpc1xuICAgICAgfVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIGFuaW1hdGlvbiBwcmltaXRpdmUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnYW5pbWF0aW9uJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQW5pbWF0aW9uTm9kZVxuICAgICAgY29uc3QgcHJpbWl0aXZlID0gY3R4Lm1vZHVsZXMuZ2V0KG4ucHJpbWl0aXZlKVxuXG4gICAgICBpZiAoIXByaW1pdGl2ZSkge1xuICAgICAgICBjb25zb2xlLndhcm4oY3R4Lm1vZHVsZXMuaGludEZvcihuLnByaW1pdGl2ZSkpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICAvLyBSZXNvbHZlIHNlbGVjdG9yIFx1MjAxNCBzdWJzdGl0dXRlIGFueSBsb2NhbCB2YXJpYWJsZSByZWZlcmVuY2VzXG4gICAgICBjb25zdCBzZWxlY3RvciA9IHJlc29sdmVTZWxlY3RvcihuLnNlbGVjdG9yLCBjdHgpXG5cbiAgICAgIC8vIEV2YWx1YXRlIG9wdGlvbnNcbiAgICAgIGNvbnN0IG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge31cbiAgICAgIGZvciAoY29uc3QgW2tleSwgZXhwck5vZGVdIG9mIE9iamVjdC5lbnRyaWVzKG4ub3B0aW9ucykpIHtcbiAgICAgICAgb3B0aW9uc1trZXldID0gZXZhbEV4cHIoZXhwck5vZGUsIGN0eClcbiAgICAgIH1cblxuICAgICAgLy8gQXdhaXQgdGhlIGFuaW1hdGlvbiBcdTIwMTQgdGhpcyBpcyB0aGUgY29yZSBvZiBhc3luYyB0cmFuc3BhcmVuY3k6XG4gICAgICAvLyBXZWIgQW5pbWF0aW9ucyBBUEkgcmV0dXJucyBhbiBBbmltYXRpb24gd2l0aCBhIC5maW5pc2hlZCBQcm9taXNlLlxuICAgICAgLy8gYHRoZW5gIGluIExFUyBzb3VyY2UgYXdhaXRzIHRoaXMgbmF0dXJhbGx5LlxuICAgICAgYXdhaXQgcHJpbWl0aXZlKHNlbGVjdG9yLCBuLmR1cmF0aW9uLCBuLmVhc2luZywgb3B0aW9ucywgY3R4Lmhvc3QpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgcmF3IGV4cHJlc3Npb24gKGVzY2FwZSBoYXRjaCAvIHVua25vd24gc3RhdGVtZW50cykgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnZXhwcic6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIEV4cHJOb2RlXG4gICAgICBpZiAobi5yYXcudHJpbSgpKSB7XG4gICAgICAgIC8vIEV2YWx1YXRlIGFzIGEgSlMgZXhwcmVzc2lvbiBmb3Igc2lkZSBlZmZlY3RzXG4gICAgICAgIC8vIFRoaXMgaGFuZGxlcyB1bmtub3duIHByaW1pdGl2ZXMgYW5kIGZ1dHVyZSBrZXl3b3JkcyBncmFjZWZ1bGx5XG4gICAgICAgIGV2YWxFeHByKG4sIGN0eClcbiAgICAgIH1cbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBhY3Rpb24gKGJhcmUgQGdldCBldGMuIG5vdCBpbnNpZGUgYSBiaW5kKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICAvLyBgQGdldCAnL2FwaS9mZWVkJyBbZmlsdGVyOiAkYWN0aXZlRmlsdGVyXWBcbiAgICAvLyBBd2FpdHMgdGhlIGZ1bGwgU1NFIHN0cmVhbSAvIEpTT04gcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgIC8vIERhdGFzdGFyIHByb2Nlc3NlcyB0aGUgU1NFIGV2ZW50cyAocGF0Y2gtZWxlbWVudHMsIHBhdGNoLXNpZ25hbHMpIGFzXG4gICAgLy8gdGhleSBhcnJpdmUuIFRoZSBQcm9taXNlIHJlc29sdmVzIHdoZW4gdGhlIHN0cmVhbSBjbG9zZXMuXG4gICAgLy8gYHRoZW5gIGluIExFUyBjb3JyZWN0bHkgd2FpdHMgZm9yIHRoaXMgYmVmb3JlIHByb2NlZWRpbmcuXG4gICAgY2FzZSAnYWN0aW9uJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGVcbiAgICAgIGNvbnN0IGV2YWxlZEFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge31cbiAgICAgIGZvciAoY29uc3QgW2tleSwgZXhwck5vZGVdIG9mIE9iamVjdC5lbnRyaWVzKG4uYXJncykpIHtcbiAgICAgICAgZXZhbGVkQXJnc1trZXldID0gZXZhbEV4cHIoZXhwck5vZGUsIGN0eClcbiAgICAgIH1cbiAgICAgIGF3YWl0IHBlcmZvcm1BY3Rpb24obi52ZXJiLCBuLnVybCwgZXZhbGVkQXJncywgY3R4KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgZGVmYXVsdDoge1xuICAgICAgY29uc3QgZXhoYXVzdGl2ZTogbmV2ZXIgPSBub2RlXG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIFVua25vd24gbm9kZSB0eXBlOicsIChleGhhdXN0aXZlIGFzIExFU05vZGUpLnR5cGUpXG4gICAgfVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gRXhwcmVzc2lvbiBldmFsdWF0aW9uXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBFdmFsdWF0ZXMgYSByYXcgSlMgZXhwcmVzc2lvbiBzdHJpbmcgaW4gYSBzYW5kYm94ZWQgY29udGV4dCB0aGF0XG4gKiBleHBvc2VzIHNjb3BlIGxvY2FscyBhbmQgRGF0YXN0YXIgc2lnbmFscyB2aWEgYSBQcm94eS5cbiAqXG4gKiBTaWduYWwgYWNjZXNzOiBgJGZlZWRTdGF0ZWAgXHUyMTkyIHJlYWRzIHRoZSBgZmVlZFN0YXRlYCBzaWduYWxcbiAqIExvY2FsIGFjY2VzczogIGBmaWx0ZXJgICAgIFx1MjE5MiByZWFkcyBmcm9tIHNjb3BlXG4gKlxuICogVGhlIHNhbmRib3ggaXMgaW50ZW50aW9uYWxseSBzaW1wbGUgZm9yIFBoYXNlIDMuIEEgcHJvcGVyIHNhbmRib3hcbiAqIChDU1AtY29tcGF0aWJsZSwgbm8gZXZhbCBmYWxsYmFjaykgaXMgYSBmdXR1cmUgaGFyZGVuaW5nIHRhc2suXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBldmFsRXhwcihub2RlOiBFeHByTm9kZSwgY3R4OiBMRVNDb250ZXh0KTogdW5rbm93biB7XG4gIGlmICghbm9kZS5yYXcudHJpbSgpKSByZXR1cm4gdW5kZWZpbmVkXG5cbiAgLy8gRmFzdCBwYXRoOiBzaW1wbGUgc3RyaW5nIGxpdGVyYWxcbiAgaWYgKG5vZGUucmF3LnN0YXJ0c1dpdGgoXCInXCIpICYmIG5vZGUucmF3LmVuZHNXaXRoKFwiJ1wiKSkge1xuICAgIHJldHVybiBub2RlLnJhdy5zbGljZSgxLCAtMSlcbiAgfVxuICAvLyBGYXN0IHBhdGg6IG51bWJlciBsaXRlcmFsXG4gIGNvbnN0IG51bSA9IE51bWJlcihub2RlLnJhdylcbiAgaWYgKCFOdW1iZXIuaXNOYU4obnVtKSAmJiBub2RlLnJhdy50cmltKCkgIT09ICcnKSByZXR1cm4gbnVtXG4gIC8vIEZhc3QgcGF0aDogYm9vbGVhblxuICBpZiAobm9kZS5yYXcgPT09ICd0cnVlJykgIHJldHVybiB0cnVlXG4gIGlmIChub2RlLnJhdyA9PT0gJ2ZhbHNlJykgcmV0dXJuIGZhbHNlXG4gIGlmIChub2RlLnJhdyA9PT0gJ251bGwnIHx8IG5vZGUucmF3ID09PSAnbmlsJykgcmV0dXJuIG51bGxcblxuICAvLyBcdTI1MDBcdTI1MDAgRmFzdCBwYXRocyBmb3IgY29tbW9uIGFuaW1hdGlvbi9vcHRpb24gdmFsdWUgcGF0dGVybnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gIC8vIFRoZXNlIGFyZSBub3QgdmFsaWQgSlMgZXhwcmVzc2lvbnMgYnV0IGFwcGVhciBhcyBhbmltYXRpb24gb3B0aW9uIHZhbHVlcy5cbiAgLy8gUmV0dXJuIHRoZW0gYXMgc3RyaW5ncyBzbyB0aGUgYW5pbWF0aW9uIG1vZHVsZSBjYW4gaW50ZXJwcmV0IHRoZW0gZGlyZWN0bHkuXG4gIGlmICgvXlxcZCsoXFwuXFxkKyk/bXMkLy50ZXN0KG5vZGUucmF3KSkgcmV0dXJuIG5vZGUucmF3ICAgICAgICAgICAgICAgICAgIC8vIFwiMjBtc1wiLCBcIjQwbXNcIlxuICBpZiAoL15cXGQrKFxcLlxcZCspP3B4JC8udGVzdChub2RlLnJhdykpIHJldHVybiBub2RlLnJhdyAgICAgICAgICAgICAgICAgICAvLyBcIjdweFwiLCBcIjEycHhcIlxuICBpZiAoL15bYS16QS1aXVthLXpBLVowLTlfLV0qJC8udGVzdChub2RlLnJhdykpIHtcbiAgICAvLyBTY29wZSBsb29rdXAgZmlyc3QgXHUyMDE0IGJhcmUgaWRlbnRpZmllcnMgY2FuIGJlIGxvY2FsIHZhcmlhYmxlcyAoZS5nLiBgc2VsZWN0b3JgLFxuICAgIC8vIGBpZGAsIGBmaWx0ZXJgKSBPUiBhbmltYXRpb24ga2V5d29yZCBzdHJpbmdzIChlLmcuIGByaWdodGAsIGByZXZlcnNlYCwgYHNpbXBsZXhgKS5cbiAgICAvLyBWYXJpYWJsZXMgd2luLiBPbmx5IHJldHVybiB0aGUgcmF3IHN0cmluZyBpZiBub3RoaW5nIGlzIGZvdW5kIGluIHNjb3BlL3NpZ25hbHMuXG4gICAgY29uc3Qgc2NvcGVkID0gY3R4LnNjb3BlLmdldChub2RlLnJhdylcbiAgICBpZiAoc2NvcGVkICE9PSB1bmRlZmluZWQpIHJldHVybiBzY29wZWRcbiAgICBjb25zdCBzaWduYWxlZCA9IGN0eC5nZXRTaWduYWwobm9kZS5yYXcpXG4gICAgaWYgKHNpZ25hbGVkICE9PSB1bmRlZmluZWQpIHJldHVybiBzaWduYWxlZFxuICAgIHJldHVybiBub2RlLnJhdyAgIC8vIGtleXdvcmQgc3RyaW5nOiBcInJldmVyc2VcIiwgXCJyaWdodFwiLCBcImVhc2Utb3V0XCIsIFwic2ltcGxleFwiLCBldGMuXG4gIH1cbiAgaWYgKC9eKGN1YmljLWJlemllcnxzdGVwc3xsaW5lYXIpXFwoLy50ZXN0KG5vZGUucmF3KSkgcmV0dXJuIG5vZGUucmF3ICAgICAgLy8gXCJjdWJpYy1iZXppZXIoMC4yMiwxLDAuMzYsMSlcblxuICB0cnkge1xuICAgIC8vIEJ1aWxkIGEgZmxhdCBvYmplY3Qgb2YgYWxsIGFjY2Vzc2libGUgbmFtZXM6XG4gICAgLy8gLSBTY29wZSBsb2NhbHMgKGlubmVybW9zdCB3aW5zKVxuICAgIC8vIC0gRGF0YXN0YXIgc2lnbmFscyB2aWEgJC1wcmVmaXggc3RyaXBwaW5nXG4gICAgY29uc3Qgc2NvcGVTbmFwc2hvdCA9IGN0eC5zY29wZS5zbmFwc2hvdCgpXG5cbiAgICAvLyBFeHRyYWN0IHNpZ25hbCByZWZlcmVuY2VzIGZyb20gdGhlIGV4cHJlc3Npb24gKCRuYW1lIFx1MjE5MiBuYW1lKVxuICAgIGNvbnN0IHNpZ25hbE5hbWVzID0gWy4uLm5vZGUucmF3Lm1hdGNoQWxsKC9cXCQoW2EtekEtWl9dXFx3KikvZyldXG4gICAgICAubWFwKG0gPT4gbVsxXSEpXG5cbiAgICBjb25zdCBzaWduYWxzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHNpZ25hbE5hbWVzKSB7XG4gICAgICBzaWduYWxzW25hbWVdID0gY3R4LmdldFNpZ25hbChuYW1lKVxuICAgIH1cblxuICAgIC8vIFJld3JpdGUgJG5hbWUgXHUyMTkyIF9fc2lnX25hbWUgaW4gdGhlIGV4cHJlc3Npb24gc28gd2UgY2FuIHBhc3Mgc2lnbmFsc1xuICAgIC8vIGFzIHBsYWluIHZhcmlhYmxlcyAoYXZvaWRzICQgaW4gSlMgaWRlbnRpZmllcnMpXG4gICAgbGV0IHJld3JpdHRlbiA9IG5vZGUucmF3XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHNpZ25hbE5hbWVzKSB7XG4gICAgICByZXdyaXR0ZW4gPSByZXdyaXR0ZW4ucmVwbGFjZUFsbChgJCR7bmFtZX1gLCBgX19zaWdfJHtuYW1lfWApXG4gICAgfVxuXG4gICAgLy8gUHJlZml4IHNpZ25hbCB2YXJzIGluIHRoZSBiaW5kaW5nIG9iamVjdFxuICAgIGNvbnN0IHNpZ0JpbmRpbmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgZm9yIChjb25zdCBbaywgdl0gb2YgT2JqZWN0LmVudHJpZXMoc2lnbmFscykpIHtcbiAgICAgIHNpZ0JpbmRpbmdzW2BfX3NpZ18ke2t9YF0gPSB2XG4gICAgfVxuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLW5ldy1mdW5jXG4gICAgY29uc3QgZm4gPSBuZXcgRnVuY3Rpb24oXG4gICAgICAuLi5PYmplY3Qua2V5cyhzY29wZVNuYXBzaG90KSxcbiAgICAgIC4uLk9iamVjdC5rZXlzKHNpZ0JpbmRpbmdzKSxcbiAgICAgIGByZXR1cm4gKCR7cmV3cml0dGVufSlgXG4gICAgKVxuICAgIHJldHVybiBmbihcbiAgICAgIC4uLk9iamVjdC52YWx1ZXMoc2NvcGVTbmFwc2hvdCksXG4gICAgICAuLi5PYmplY3QudmFsdWVzKHNpZ0JpbmRpbmdzKVxuICAgIClcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTXSBFeHByZXNzaW9uIGV2YWwgZXJyb3I6ICR7SlNPTi5zdHJpbmdpZnkobm9kZS5yYXcpfWAsIGVycilcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cbn1cblxuLyoqXG4gKiBFdmFsdWF0ZXMgYSBndWFyZCBleHByZXNzaW9uIHN0cmluZyAoZnJvbSBjb21tYW5kIGBndWFyZGAgYXR0cmlidXRlKS5cbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ3VhcmQgcGFzc2VzIChjb21tYW5kIHNob3VsZCBydW4pLCBmYWxzZSB0byBzaWxlbnQtYWJvcnQuXG4gKi9cbmZ1bmN0aW9uIGV2YWxHdWFyZChndWFyZEV4cHI6IHN0cmluZywgY3R4OiBMRVNDb250ZXh0KTogYm9vbGVhbiB7XG4gIGNvbnN0IHJlc3VsdCA9IGV2YWxFeHByKHsgdHlwZTogJ2V4cHInLCByYXc6IGd1YXJkRXhwciB9LCBjdHgpXG4gIHJldHVybiBCb29sZWFuKHJlc3VsdClcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXR0ZXJuIG1hdGNoaW5nXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBBdHRlbXB0cyB0byBtYXRjaCBgc3ViamVjdGAgYWdhaW5zdCBgcGF0dGVybnNgLlxuICpcbiAqIFJldHVybnMgYSBiaW5kaW5ncyBtYXAgaWYgbWF0Y2hlZCAoZW1wdHkgbWFwIGZvciB3aWxkY2FyZC9saXRlcmFsIG1hdGNoZXMpLFxuICogb3IgbnVsbCBpZiB0aGUgbWF0Y2ggZmFpbHMuXG4gKlxuICogRm9yIHR1cGxlIHBhdHRlcm5zLCBgc3ViamVjdGAgaXMgbWF0Y2hlZCBlbGVtZW50LWJ5LWVsZW1lbnQuXG4gKiBGb3Igb3ItcGF0dGVybnMsIGFueSBhbHRlcm5hdGl2ZSBtYXRjaGluZyByZXR1cm5zIHRoZSBiaW5kaW5ncy5cbiAqL1xuZnVuY3Rpb24gbWF0Y2hQYXR0ZXJucyhcbiAgcGF0dGVybnM6IFBhdHRlcm5Ob2RlW10sXG4gIHN1YmplY3Q6IHVua25vd25cbik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbCB7XG4gIC8vIFNpbmdsZS1wYXR0ZXJuIChtb3N0IGNvbW1vbik6IG1hdGNoIGRpcmVjdGx5XG4gIGlmIChwYXR0ZXJucy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbWF0Y2hTaW5nbGUocGF0dGVybnNbMF0hLCBzdWJqZWN0KVxuICB9XG5cbiAgLy8gVHVwbGUgcGF0dGVybjogc3ViamVjdCBtdXN0IGJlIGFuIGFycmF5XG4gIGlmICghQXJyYXkuaXNBcnJheShzdWJqZWN0KSkge1xuICAgIC8vIFdyYXAgc2luZ2xlIHZhbHVlIGluIHR1cGxlIGZvciBlcmdvbm9taWNzXG4gICAgLy8gZS5nLiBgW2l0IG9rXWAgYWdhaW5zdCBhIHtvazogdHJ1ZSwgZGF0YTogLi4ufSByZXNwb25zZVxuICAgIHJldHVybiBtYXRjaFR1cGxlKHBhdHRlcm5zLCBzdWJqZWN0KVxuICB9XG5cbiAgcmV0dXJuIG1hdGNoVHVwbGUocGF0dGVybnMsIHN1YmplY3QpXG59XG5cbmZ1bmN0aW9uIG1hdGNoVHVwbGUoXG4gIHBhdHRlcm5zOiBQYXR0ZXJuTm9kZVtdLFxuICBzdWJqZWN0OiB1bmtub3duXG4pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IG51bGwge1xuICAvLyBGb3Igbm9uLWFycmF5IHN1YmplY3RzLCB0cnkgYmluZGluZyBlYWNoIHBhdHRlcm4gYWdhaW5zdCB0aGUgd2hvbGUgc3ViamVjdFxuICAvLyAoaGFuZGxlcyBgW2l0IG9rXWAgbWF0Y2hpbmcgYW4gb2JqZWN0IHdoZXJlIGBpdGAgPSBvYmplY3QsIGBva2AgPSBzdGF0dXMpXG4gIGNvbnN0IGJpbmRpbmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXR0ZXJucy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHBhdCA9IHBhdHRlcm5zW2ldIVxuXG4gICAgLy8gRm9yIHR1cGxlIHBhdHRlcm5zIGFnYWluc3Qgb2JqZWN0cywgd2UgZG8gYSBzdHJ1Y3R1cmFsIG1hdGNoOlxuICAgIC8vIGBbaXQgb2tdYCBhZ2FpbnN0IHtkYXRhOiAuLi4sIHN0YXR1czogJ29rJ30gYmluZHMgYGl0YCA9IGRhdGEsIGBva2AgPSAnb2snXG4gICAgLy8gVGhpcyBpcyBhIHNpbXBsaWZpY2F0aW9uIFx1MjAxNCBmdWxsIHN0cnVjdHVyYWwgbWF0Y2hpbmcgY29tZXMgaW4gYSBsYXRlciBwYXNzXG4gICAgY29uc3QgdmFsdWUgPSBBcnJheS5pc0FycmF5KHN1YmplY3QpXG4gICAgICA/IHN1YmplY3RbaV1cbiAgICAgIDogaSA9PT0gMCA/IHN1YmplY3QgOiB1bmRlZmluZWRcblxuICAgIGNvbnN0IHJlc3VsdCA9IG1hdGNoU2luZ2xlKHBhdCwgdmFsdWUpXG4gICAgaWYgKHJlc3VsdCA9PT0gbnVsbCkgcmV0dXJuIG51bGxcbiAgICBPYmplY3QuYXNzaWduKGJpbmRpbmdzLCByZXN1bHQpXG4gIH1cblxuICByZXR1cm4gYmluZGluZ3Ncbn1cblxuZnVuY3Rpb24gbWF0Y2hTaW5nbGUoXG4gIHBhdHRlcm46IFBhdHRlcm5Ob2RlLFxuICB2YWx1ZTogdW5rbm93blxuKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsIHtcbiAgc3dpdGNoIChwYXR0ZXJuLmtpbmQpIHtcbiAgICBjYXNlICd3aWxkY2FyZCc6XG4gICAgICByZXR1cm4ge30gICAvLyBBbHdheXMgbWF0Y2hlcywgYmluZHMgbm90aGluZ1xuXG4gICAgY2FzZSAnbGl0ZXJhbCc6XG4gICAgICByZXR1cm4gdmFsdWUgPT09IHBhdHRlcm4udmFsdWUgPyB7fSA6IG51bGxcblxuICAgIGNhc2UgJ2JpbmRpbmcnOlxuICAgICAgcmV0dXJuIHsgW3BhdHRlcm4ubmFtZV06IHZhbHVlIH0gICAvLyBBbHdheXMgbWF0Y2hlcywgYmluZHMgbmFtZSBcdTIxOTIgdmFsdWVcblxuICAgIGNhc2UgJ29yJzoge1xuICAgICAgZm9yIChjb25zdCBhbHQgb2YgcGF0dGVybi5wYXR0ZXJucykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBtYXRjaFNpbmdsZShhbHQsIHZhbHVlKVxuICAgICAgICBpZiAocmVzdWx0ICE9PSBudWxsKSByZXR1cm4gcmVzdWx0XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEhUVFAgYWN0aW9uXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBQZXJmb3JtcyBhbiBIVFRQIGFjdGlvbiAoQGdldCwgQHBvc3QsIGV0Yy4pLlxuICpcbiAqIFdoZW4gRGF0YXN0YXIgYWN0aW9ucyBhcmUgYXZhaWxhYmxlIGluIHRoZSBob3N0J3MgY29udGV4dCwgd2UgdHJpZ2dlclxuICogRGF0YXN0YXIncyBmZXRjaCBwaXBlbGluZSAod2hpY2ggaGFuZGxlcyBzaWduYWwgc2VyaWFsaXphdGlvbiwgU1NFXG4gKiByZXNwb25zZSBwcm9jZXNzaW5nLCBhbmQgaW5kaWNhdG9yIHNpZ25hbHMpLlxuICpcbiAqIEZhbGxzIGJhY2sgdG8gbmF0aXZlIGZldGNoIHdoZW4gRGF0YXN0YXIgaXMgbm90IHByZXNlbnQuXG4gKlxuICogTm90ZTogRGF0YXN0YXIncyBAZ2V0IC8gQHBvc3QgYXJlIGZpcmUtYW5kLWZvcmdldCAodGhleSBzdHJlYW0gU1NFIGJhY2tcbiAqIHRvIHBhdGNoIHNpZ25hbHMvZWxlbWVudHMpLiBGb3IgdGhlIGJpbmQgY2FzZSAoYHJlc3BvbnNlIDwtIEBnZXQgLi4uYClcbiAqIHdlIHVzZSBuYXRpdmUgZmV0Y2ggdG8gZ2V0IGEgUHJvbWlzZS1iYXNlZCBKU09OIHJlc3BvbnNlIHRoYXQgTEVTIGNhblxuICogYmluZCB0byBhIGxvY2FsIHZhcmlhYmxlLlxuICovXG5hc3luYyBmdW5jdGlvbiBwZXJmb3JtQWN0aW9uKFxuICB2ZXJiOiBzdHJpbmcsXG4gIHVybDogc3RyaW5nLFxuICBhcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgY3R4OiBMRVNDb250ZXh0XG4pOiBQcm9taXNlPHVua25vd24+IHtcbiAgY29uc3QgbWV0aG9kID0gdmVyYi50b1VwcGVyQ2FzZSgpXG5cbiAgbGV0IGZ1bGxVcmwgPSB1cmxcbiAgbGV0IGJvZHk6IHN0cmluZyB8IHVuZGVmaW5lZFxuXG4gIGlmIChtZXRob2QgPT09ICdHRVQnIHx8IG1ldGhvZCA9PT0gJ0RFTEVURScpIHtcbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKClcbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhhcmdzKSkge1xuICAgICAgcGFyYW1zLnNldChrLCBTdHJpbmcodikpXG4gICAgfVxuICAgIGNvbnN0IHFzID0gcGFyYW1zLnRvU3RyaW5nKClcbiAgICBpZiAocXMpIGZ1bGxVcmwgPSBgJHt1cmx9PyR7cXN9YFxuICB9IGVsc2Uge1xuICAgIGJvZHkgPSBKU09OLnN0cmluZ2lmeShhcmdzKVxuICB9XG5cbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChmdWxsVXJsLCB7XG4gICAgbWV0aG9kLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAnQWNjZXB0JzogJ3RleHQvZXZlbnQtc3RyZWFtLCBhcHBsaWNhdGlvbi9qc29uJyxcbiAgICB9LFxuICAgIC4uLihib2R5ID8geyBib2R5IH0gOiB7fSksXG4gIH0pXG5cbiAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgIHRocm93IG5ldyBFcnJvcihgW0xFU10gSFRUUCAke3Jlc3BvbnNlLnN0YXR1c30gZnJvbSAke21ldGhvZH0gJHt1cmx9YClcbiAgfVxuXG4gIGNvbnN0IGNvbnRlbnRUeXBlID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpID8/ICcnXG5cbiAgLy8gXHUyNTAwXHUyNTAwIFNTRSBzdHJlYW06IERhdGFzdGFyIHNlcnZlci1zZW50IGV2ZW50cyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgLy8gV2hlbiB0aGUgc2VydmVyIHJldHVybnMgdGV4dC9ldmVudC1zdHJlYW0sIGNvbnN1bWUgdGhlIFNTRSBzdHJlYW0gYW5kXG4gIC8vIGFwcGx5IGRhdGFzdGFyLXBhdGNoLWVsZW1lbnRzIC8gZGF0YXN0YXItcGF0Y2gtc2lnbmFscyBldmVudHMgb3Vyc2VsdmVzLlxuICAvLyBUaGUgUHJvbWlzZSByZXNvbHZlcyB3aGVuIHRoZSBzdHJlYW0gY2xvc2VzIFx1MjAxNCBzbyBgdGhlbmAgaW4gTEVTIGNvcnJlY3RseVxuICAvLyB3YWl0cyBmb3IgYWxsIERPTSBwYXRjaGVzIGJlZm9yZSBwcm9jZWVkaW5nIHRvIHRoZSBuZXh0IHN0ZXAuXG4gIGlmIChjb250ZW50VHlwZS5pbmNsdWRlcygndGV4dC9ldmVudC1zdHJlYW0nKSkge1xuICAgIGF3YWl0IGNvbnN1bWVTU0VTdHJlYW0ocmVzcG9uc2UsIGN0eClcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cblxuICBpZiAoY29udGVudFR5cGUuaW5jbHVkZXMoJ2FwcGxpY2F0aW9uL2pzb24nKSkge1xuICAgIHJldHVybiBhd2FpdCByZXNwb25zZS5qc29uKClcbiAgfVxuICByZXR1cm4gYXdhaXQgcmVzcG9uc2UudGV4dCgpXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gU1NFIHN0cmVhbSBjb25zdW1lclxuLy9cbi8vIFJlYWRzIGEgRGF0YXN0YXIgU1NFIHN0cmVhbSBsaW5lLWJ5LWxpbmUgYW5kIGFwcGxpZXMgdGhlIGV2ZW50cy5cbi8vIFdlIGltcGxlbWVudCBhIG1pbmltYWwgc3Vic2V0IG9mIHRoZSBEYXRhc3RhciBTU0Ugc3BlYyBuZWVkZWQgZm9yIExFUzpcbi8vXG4vLyAgIGRhdGFzdGFyLXBhdGNoLWVsZW1lbnRzICBcdTIxOTIgYXBwbHkgdG8gdGhlIERPTSB1c2luZyBtb3JwaGRvbS1saXRlIGxvZ2ljXG4vLyAgIGRhdGFzdGFyLXBhdGNoLXNpZ25hbHMgICBcdTIxOTIgd3JpdGUgc2lnbmFsIHZhbHVlcyB2aWEgY3R4LnNldFNpZ25hbFxuLy9cbi8vIFRoaXMgcnVucyBlbnRpcmVseSBpbiB0aGUgYnJvd3NlciBcdTIwMTQgbm8gRGF0YXN0YXIgaW50ZXJuYWwgQVBJcyBuZWVkZWQuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuYXN5bmMgZnVuY3Rpb24gY29uc3VtZVNTRVN0cmVhbShcbiAgcmVzcG9uc2U6IFJlc3BvbnNlLFxuICBjdHg6IExFU0NvbnRleHRcbik6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoIXJlc3BvbnNlLmJvZHkpIHJldHVyblxuXG4gIGNvbnN0IHJlYWRlciAgPSByZXNwb25zZS5ib2R5LmdldFJlYWRlcigpXG4gIGNvbnN0IGRlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoKVxuICBsZXQgYnVmZmVyICAgID0gJydcblxuICAvLyBTU0UgZXZlbnQgYWNjdW11bGF0b3IgXHUyMDE0IHJlc2V0IGFmdGVyIGVhY2ggZG91YmxlLW5ld2xpbmVcbiAgbGV0IGV2ZW50VHlwZSA9ICcnXG4gIGxldCBkYXRhTGluZXM6IHN0cmluZ1tdID0gW11cblxuICBjb25zdCBhcHBseUV2ZW50ID0gKCkgPT4ge1xuICAgIGlmICghZXZlbnRUeXBlIHx8IGRhdGFMaW5lcy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gICAgaWYgKGV2ZW50VHlwZSA9PT0gJ2RhdGFzdGFyLXBhdGNoLWVsZW1lbnRzJykge1xuICAgICAgYXBwbHlQYXRjaEVsZW1lbnRzKGRhdGFMaW5lcywgY3R4KVxuICAgIH0gZWxzZSBpZiAoZXZlbnRUeXBlID09PSAnZGF0YXN0YXItcGF0Y2gtc2lnbmFscycpIHtcbiAgICAgIGFwcGx5UGF0Y2hTaWduYWxzKGRhdGFMaW5lcywgY3R4KVxuICAgIH1cblxuICAgIC8vIFJlc2V0IGFjY3VtdWxhdG9yXG4gICAgZXZlbnRUeXBlID0gJydcbiAgICBkYXRhTGluZXMgPSBbXVxuICB9XG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCB7IGRvbmUsIHZhbHVlIH0gPSBhd2FpdCByZWFkZXIucmVhZCgpXG4gICAgaWYgKGRvbmUpIHsgYXBwbHlFdmVudCgpOyBicmVhayB9XG5cbiAgICBidWZmZXIgKz0gZGVjb2Rlci5kZWNvZGUodmFsdWUsIHsgc3RyZWFtOiB0cnVlIH0pXG5cbiAgICAvLyBQcm9jZXNzIGNvbXBsZXRlIGxpbmVzIGZyb20gdGhlIGJ1ZmZlclxuICAgIGNvbnN0IGxpbmVzID0gYnVmZmVyLnNwbGl0KCdcXG4nKVxuICAgIGJ1ZmZlciA9IGxpbmVzLnBvcCgpID8/ICcnICAgLy8gbGFzdCBwYXJ0aWFsIGxpbmUgc3RheXMgaW4gYnVmZmVyXG5cbiAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJ2V2ZW50OicpKSB7XG4gICAgICAgIGV2ZW50VHlwZSA9IGxpbmUuc2xpY2UoJ2V2ZW50OicubGVuZ3RoKS50cmltKClcbiAgICAgIH0gZWxzZSBpZiAobGluZS5zdGFydHNXaXRoKCdkYXRhOicpKSB7XG4gICAgICAgIGRhdGFMaW5lcy5wdXNoKGxpbmUuc2xpY2UoJ2RhdGE6Jy5sZW5ndGgpLnRyaW1TdGFydCgpKVxuICAgICAgfSBlbHNlIGlmIChsaW5lID09PSAnJykge1xuICAgICAgICAvLyBCbGFuayBsaW5lID0gZW5kIG9mIHRoaXMgU1NFIGV2ZW50XG4gICAgICAgIGFwcGx5RXZlbnQoKVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDAgQXBwbHkgZGF0YXN0YXItcGF0Y2gtZWxlbWVudHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIGFwcGx5UGF0Y2hFbGVtZW50cyhkYXRhTGluZXM6IHN0cmluZ1tdLCBjdHg6IExFU0NvbnRleHQpOiB2b2lkIHtcbiAgLy8gUGFyc2UgdGhlIHN0cnVjdHVyZWQgZGF0YSBsaW5lcyBpbnRvIGFuIG9wdGlvbnMgb2JqZWN0XG4gIGxldCBzZWxlY3RvciAgICA9ICcnXG4gIGxldCBtb2RlICAgICAgICA9ICdvdXRlcidcbiAgY29uc3QgaHRtbExpbmVzOiBzdHJpbmdbXSA9IFtdXG5cbiAgZm9yIChjb25zdCBsaW5lIG9mIGRhdGFMaW5lcykge1xuICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJ3NlbGVjdG9yICcpKSAgeyBzZWxlY3RvciA9IGxpbmUuc2xpY2UoJ3NlbGVjdG9yICcubGVuZ3RoKS50cmltKCk7IGNvbnRpbnVlIH1cbiAgICBpZiAobGluZS5zdGFydHNXaXRoKCdtb2RlICcpKSAgICAgIHsgbW9kZSAgICAgPSBsaW5lLnNsaWNlKCdtb2RlICcubGVuZ3RoKS50cmltKCk7ICAgICBjb250aW51ZSB9XG4gICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnZWxlbWVudHMgJykpICB7IGh0bWxMaW5lcy5wdXNoKGxpbmUuc2xpY2UoJ2VsZW1lbnRzICcubGVuZ3RoKSk7ICAgY29udGludWUgfVxuICAgIC8vIExpbmVzIHdpdGggbm8gcHJlZml4IGFyZSBhbHNvIGVsZW1lbnQgY29udGVudCAoRGF0YXN0YXIgc3BlYyBhbGxvd3MgdGhpcylcbiAgICBodG1sTGluZXMucHVzaChsaW5lKVxuICB9XG5cbiAgY29uc3QgaHRtbCA9IGh0bWxMaW5lcy5qb2luKCdcXG4nKS50cmltKClcblxuICBjb25zdCB0YXJnZXQgPSBzZWxlY3RvclxuICAgID8gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcilcbiAgICA6IG51bGxcblxuICBjb25zb2xlLmxvZyhgW0xFUzpzc2VdIHBhdGNoLWVsZW1lbnRzIG1vZGU9JHttb2RlfSBzZWxlY3Rvcj1cIiR7c2VsZWN0b3J9XCIgaHRtbC5sZW49JHtodG1sLmxlbmd0aH1gKVxuXG4gIGlmIChtb2RlID09PSAncmVtb3ZlJykge1xuICAgIC8vIFJlbW92ZSBhbGwgbWF0Y2hpbmcgZWxlbWVudHNcbiAgICBjb25zdCB0b1JlbW92ZSA9IHNlbGVjdG9yXG4gICAgICA/IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpXG4gICAgICA6IFtdXG4gICAgdG9SZW1vdmUuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSlcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChtb2RlID09PSAnYXBwZW5kJyAmJiB0YXJnZXQpIHtcbiAgICBjb25zdCBmcmFnID0gcGFyc2VIVE1MKGh0bWwpXG4gICAgdGFyZ2V0LmFwcGVuZChmcmFnKVxuICAgIHJldHVyblxuICB9XG5cbiAgaWYgKG1vZGUgPT09ICdwcmVwZW5kJyAmJiB0YXJnZXQpIHtcbiAgICBjb25zdCBmcmFnID0gcGFyc2VIVE1MKGh0bWwpXG4gICAgdGFyZ2V0LnByZXBlbmQoZnJhZylcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChtb2RlID09PSAnaW5uZXInICYmIHRhcmdldCkge1xuICAgIHRhcmdldC5pbm5lckhUTUwgPSBodG1sXG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAobW9kZSA9PT0gJ291dGVyJyAmJiB0YXJnZXQpIHtcbiAgICBjb25zdCBmcmFnID0gcGFyc2VIVE1MKGh0bWwpXG4gICAgdGFyZ2V0LnJlcGxhY2VXaXRoKGZyYWcpXG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAobW9kZSA9PT0gJ2JlZm9yZScgJiYgdGFyZ2V0KSB7XG4gICAgY29uc3QgZnJhZyA9IHBhcnNlSFRNTChodG1sKVxuICAgIHRhcmdldC5iZWZvcmUoZnJhZylcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChtb2RlID09PSAnYWZ0ZXInICYmIHRhcmdldCkge1xuICAgIGNvbnN0IGZyYWcgPSBwYXJzZUhUTUwoaHRtbClcbiAgICB0YXJnZXQuYWZ0ZXIoZnJhZylcbiAgICByZXR1cm5cbiAgfVxuXG4gIC8vIE5vIHNlbGVjdG9yOiB0cnkgdG8gcGF0Y2ggYnkgZWxlbWVudCBJRHNcbiAgaWYgKCFzZWxlY3RvciAmJiBodG1sKSB7XG4gICAgY29uc3QgZnJhZyA9IHBhcnNlSFRNTChodG1sKVxuICAgIGZvciAoY29uc3QgZWwgb2YgQXJyYXkuZnJvbShmcmFnLmNoaWxkcmVuKSkge1xuICAgICAgY29uc3QgaWQgPSBlbC5pZFxuICAgICAgaWYgKGlkKSB7XG4gICAgICAgIGNvbnN0IGV4aXN0aW5nID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXG4gICAgICAgIGlmIChleGlzdGluZykgZXhpc3RpbmcucmVwbGFjZVdpdGgoZWwpXG4gICAgICAgIGVsc2UgZG9jdW1lbnQuYm9keS5hcHBlbmQoZWwpXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHBhcnNlSFRNTChodG1sOiBzdHJpbmcpOiBEb2N1bWVudEZyYWdtZW50IHtcbiAgY29uc3QgdGVtcGxhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpXG4gIHRlbXBsYXRlLmlubmVySFRNTCA9IGh0bWxcbiAgcmV0dXJuIHRlbXBsYXRlLmNvbnRlbnRcbn1cblxuLy8gXHUyNTAwXHUyNTAwIEFwcGx5IGRhdGFzdGFyLXBhdGNoLXNpZ25hbHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIGFwcGx5UGF0Y2hTaWduYWxzKGRhdGFMaW5lczogc3RyaW5nW10sIGN0eDogTEVTQ29udGV4dCk6IHZvaWQge1xuICBmb3IgKGNvbnN0IGxpbmUgb2YgZGF0YUxpbmVzKSB7XG4gICAgaWYgKCFsaW5lLnN0YXJ0c1dpdGgoJ3NpZ25hbHMgJykgJiYgIWxpbmUuc3RhcnRzV2l0aCgneycpKSBjb250aW51ZVxuXG4gICAgY29uc3QganNvblN0ciA9IGxpbmUuc3RhcnRzV2l0aCgnc2lnbmFscyAnKVxuICAgICAgPyBsaW5lLnNsaWNlKCdzaWduYWxzICcubGVuZ3RoKVxuICAgICAgOiBsaW5lXG5cbiAgICB0cnkge1xuICAgICAgY29uc3Qgc2lnbmFscyA9IEpTT04ucGFyc2UoanNvblN0cikgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbiAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHNpZ25hbHMpKSB7XG4gICAgICAgIGN0eC5zZXRTaWduYWwoa2V5LCB2YWx1ZSlcbiAgICAgICAgY29uc29sZS5sb2coYFtMRVM6c3NlXSBwYXRjaC1zaWduYWxzICQke2tleX0gPWAsIHZhbHVlKVxuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTOnNzZV0gRmFpbGVkIHRvIHBhcnNlIHBhdGNoLXNpZ25hbHMgSlNPTjonLCBqc29uU3RyKVxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFNlbGVjdG9yIHJlc29sdXRpb25cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFJlc29sdmVzIHZhcmlhYmxlIHJlZmVyZW5jZXMgaW4gYW4gYW5pbWF0aW9uIHNlbGVjdG9yLlxuICpcbiAqIEV4YW1wbGU6IGBbZGF0YS1pdGVtLWlkOiBpZF1gIHdoZXJlIGBpZGAgaXMgYSBsb2NhbCB2YXJpYWJsZVxuICogYmVjb21lcyBgW2RhdGEtaXRlbS1pZD1cIjEyM1wiXWAgYWZ0ZXIgc3Vic3RpdHV0aW9uLlxuICpcbiAqIFNpbXBsZSBhcHByb2FjaCBmb3IgUGhhc2UgMzogbG9vayBmb3IgYDogdmFybmFtZWAgcGF0dGVybnMgaW4gYXR0cmlidXRlXG4gKiBzZWxlY3RvcnMgYW5kIHN1YnN0aXR1dGUgZnJvbSBzY29wZS5cbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZVNlbGVjdG9yKHNlbGVjdG9yOiBzdHJpbmcsIGN0eDogTEVTQ29udGV4dCk6IHN0cmluZyB7XG4gIC8vIFJlc29sdmVzIExFUyBhdHRyaWJ1dGUgc2VsZWN0b3JzIHRoYXQgY29udGFpbiB2YXJpYWJsZSBleHByZXNzaW9uczpcbiAgLy8gICBbZGF0YS1pdGVtLWlkOiBpZF0gICAgICAgICAgIFx1MjE5MiBbZGF0YS1pdGVtLWlkPVwiNDJcIl1cbiAgLy8gICBbZGF0YS1jYXJkLWlkOiBwYXlsb2FkWzBdXSAgIFx1MjE5MiBbZGF0YS1jYXJkLWlkPVwiM1wiXVxuICAvL1xuICAvLyBBIHJlZ2V4IGlzIGluc3VmZmljaWVudCBiZWNhdXNlIHRoZSB2YXJpYWJsZSBleHByZXNzaW9uIGNhbiBpdHNlbGYgY29udGFpblxuICAvLyBicmFja2V0cyAoZS5nLiBwYXlsb2FkWzBdKSwgd2hpY2ggd291bGQgY29uZnVzZSBhIFteXFxdXSsgcGF0dGVybi5cbiAgLy8gV2UgdXNlIGEgYnJhY2tldC1kZXB0aC1hd2FyZSBzY2FubmVyIGluc3RlYWQuXG4gIGxldCByZXN1bHQgPSAnJ1xuICBsZXQgaSA9IDBcbiAgd2hpbGUgKGkgPCBzZWxlY3Rvci5sZW5ndGgpIHtcbiAgICBpZiAoc2VsZWN0b3JbaV0gPT09ICdbJykge1xuICAgICAgLy8gTG9vayBmb3IgXCI6IFwiIChjb2xvbi1zcGFjZSkgYXMgdGhlIGF0dHIvdmFyRXhwciBzZXBhcmF0b3JcbiAgICAgIGNvbnN0IGNvbG9uSWR4ID0gc2VsZWN0b3IuaW5kZXhPZignOiAnLCBpKVxuICAgICAgaWYgKGNvbG9uSWR4ID09PSAtMSkgeyByZXN1bHQgKz0gc2VsZWN0b3JbaSsrXTsgY29udGludWUgfVxuXG4gICAgICAvLyBTY2FuIGZvcndhcmQgZnJvbSB0aGUgdmFyRXhwciBzdGFydCwgdHJhY2tpbmcgYnJhY2tldCBkZXB0aCxcbiAgICAgIC8vIHRvIGZpbmQgdGhlIF0gdGhhdCBjbG9zZXMgdGhpcyBhdHRyaWJ1dGUgc2VsZWN0b3IgKG5vdCBhbiBpbm5lciBvbmUpXG4gICAgICBsZXQgZGVwdGggPSAwXG4gICAgICBsZXQgY2xvc2VJZHggPSAtMVxuICAgICAgZm9yIChsZXQgaiA9IGNvbG9uSWR4ICsgMjsgaiA8IHNlbGVjdG9yLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmIChzZWxlY3RvcltqXSA9PT0gJ1snKSBkZXB0aCsrXG4gICAgICAgIGVsc2UgaWYgKHNlbGVjdG9yW2pdID09PSAnXScpIHtcbiAgICAgICAgICBpZiAoZGVwdGggPT09IDApIHsgY2xvc2VJZHggPSBqOyBicmVhayB9XG4gICAgICAgICAgZGVwdGgtLVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoY2xvc2VJZHggPT09IC0xKSB7IHJlc3VsdCArPSBzZWxlY3RvcltpKytdOyBjb250aW51ZSB9XG5cbiAgICAgIGNvbnN0IGF0dHIgICAgPSBzZWxlY3Rvci5zbGljZShpICsgMSwgY29sb25JZHgpLnRyaW0oKVxuICAgICAgY29uc3QgdmFyRXhwciA9IHNlbGVjdG9yLnNsaWNlKGNvbG9uSWR4ICsgMiwgY2xvc2VJZHgpLnRyaW0oKVxuICAgICAgY29uc3QgdmFsdWUgICA9IGV2YWxFeHByKHsgdHlwZTogJ2V4cHInLCByYXc6IHZhckV4cHIgfSwgY3R4KVxuICAgICAgcmVzdWx0ICs9IGBbJHthdHRyfT1cIiR7U3RyaW5nKHZhbHVlKX1cIl1gXG4gICAgICBpID0gY2xvc2VJZHggKyAxXG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdCArPSBzZWxlY3RvcltpKytdXG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHRcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBHdWFyZC1hd2FyZSBjb21tYW5kIGV4ZWN1dGlvbiAodXNlZCBieSBQaGFzZSA0IGV2ZW50IHdpcmluZylcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEV4ZWN1dGVzIGEgY29tbWFuZCBieSBuYW1lLCBjaGVja2luZyBpdHMgZ3VhcmQgZmlyc3QuXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGNvbW1hbmQgcmFuLCBmYWxzZSBpZiB0aGUgZ3VhcmQgcmVqZWN0ZWQgaXQuXG4gKlxuICogVGhpcyBpcyB0aGUgcHVibGljIEFQSSBmb3IgUGhhc2UgNCBldmVudCBoYW5kbGVycyB0aGF0IGNhbGwgY29tbWFuZHMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5Db21tYW5kKFxuICBuYW1lOiBzdHJpbmcsXG4gIGFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICBjdHg6IExFU0NvbnRleHRcbik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCBkZWYgPSBjdHguY29tbWFuZHMuZ2V0KG5hbWUpXG4gIGlmICghZGVmKSB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTXSBVbmtub3duIGNvbW1hbmQ6IFwiJHtuYW1lfVwiYClcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGlmIChkZWYuZ3VhcmQpIHtcbiAgICBpZiAoIWV2YWxHdWFyZChkZWYuZ3VhcmQsIGN0eCkpIHJldHVybiBmYWxzZVxuICB9XG5cbiAgY29uc3Qgc2NvcGUgPSBjdHguc2NvcGUuY2hpbGQoKVxuICBmb3IgKGNvbnN0IGFyZ0RlZiBvZiBkZWYuYXJncykge1xuICAgIHNjb3BlLnNldChhcmdEZWYubmFtZSwgYXJnc1thcmdEZWYubmFtZV0gPz8gbnVsbClcbiAgfVxuXG4gIGF3YWl0IGV4ZWN1dGUoZGVmLmJvZHksIHsgLi4uY3R4LCBzY29wZSB9KVxuICByZXR1cm4gdHJ1ZVxufVxuIiwgImltcG9ydCB0eXBlIHsgTEVTTm9kZSwgRXhwck5vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuLyoqIEEgc2luZ2xlIHR5cGVkIGFyZ3VtZW50IGRlZmluaXRpb24gZnJvbSBhcmdzPVwiW25hbWU6dHlwZSAgLi4uXVwiICovXG5leHBvcnQgaW50ZXJmYWNlIEFyZ0RlZiB7XG4gIG5hbWU6IHN0cmluZ1xuICAvKiogJ25pbCcgfCAnaW50JyB8ICdkZWMnIHwgJ3N0cicgfCAnYXJyJyB8ICdvYmonIHwgJ2Jvb2wnIHwgJ2R5bicgKi9cbiAgdHlwZTogc3RyaW5nXG4gIC8qKiBEZWZhdWx0IHZhbHVlIGV4cHJlc3Npb24sIGlmIHByb3ZpZGVkIChlLmcuIGF0dGVtcHQ6aW50PTApICovXG4gIGRlZmF1bHQ/OiBFeHByTm9kZVxufVxuXG4vKiogQSBmdWxseSBwYXJzZWQgPGxvY2FsLWNvbW1hbmQ+IGRlZmluaXRpb24uICovXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmREZWYge1xuICBuYW1lOiBzdHJpbmdcbiAgYXJnczogQXJnRGVmW11cbiAgLyoqIEd1YXJkIGV4cHJlc3Npb24gc3RyaW5nIFx1MjAxNCBldmFsdWF0ZWQgYmVmb3JlIGV4ZWN1dGlvbi4gRmFsc3kgPSBzaWxlbnQgbm8tb3AuICovXG4gIGd1YXJkPzogc3RyaW5nXG4gIC8qKiBUaGUgcGFyc2VkIGJvZHkgQVNUICovXG4gIGJvZHk6IExFU05vZGVcbiAgLyoqIFRoZSA8bG9jYWwtY29tbWFuZD4gRE9NIGVsZW1lbnQsIGtlcHQgZm9yIGVycm9yIHJlcG9ydGluZyAqL1xuICBlbGVtZW50OiBFbGVtZW50XG59XG5cbmV4cG9ydCBjbGFzcyBDb21tYW5kUmVnaXN0cnkge1xuICBwcml2YXRlIGNvbW1hbmRzID0gbmV3IE1hcDxzdHJpbmcsIENvbW1hbmREZWY+KClcblxuICByZWdpc3RlcihkZWY6IENvbW1hbmREZWYpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5jb21tYW5kcy5oYXMoZGVmLm5hbWUpKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgIGBbTEVTXSBEdXBsaWNhdGUgY29tbWFuZCBcIiR7ZGVmLm5hbWV9XCIgXHUyMDE0IHByZXZpb3VzIGRlZmluaXRpb24gb3ZlcndyaXR0ZW4uYCxcbiAgICAgICAgZGVmLmVsZW1lbnRcbiAgICAgIClcbiAgICB9XG4gICAgdGhpcy5jb21tYW5kcy5zZXQoZGVmLm5hbWUsIGRlZilcbiAgfVxuXG4gIGdldChuYW1lOiBzdHJpbmcpOiBDb21tYW5kRGVmIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kcy5nZXQobmFtZSlcbiAgfVxuXG4gIGhhcyhuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kcy5oYXMobmFtZSlcbiAgfVxuXG4gIG5hbWVzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmNvbW1hbmRzLmtleXMoKSlcbiAgfVxufVxuIiwgIi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gTEVTIE1vZHVsZSBzeXN0ZW1cbi8vXG4vLyBNb2R1bGVzIGV4dGVuZCB0aGUgc2V0IG9mIGFuaW1hdGlvbi9lZmZlY3QgcHJpbWl0aXZlcyBhdmFpbGFibGUgaW5cbi8vIDxsb2NhbC1jb21tYW5kPiBib2RpZXMuIFR3byBraW5kczpcbi8vXG4vLyAgIEJ1aWx0LWluOiAgPHVzZS1tb2R1bGUgdHlwZT1cImFuaW1hdGlvblwiPlxuLy8gICBVc2VybGFuZDogIDx1c2UtbW9kdWxlIHNyYz1cIi4vc2Nyb2xsLWVmZmVjdHMuanNcIj5cbi8vXG4vLyBCb3RoIHJlc29sdmUgdG8gYSBMRVNNb2R1bGUgYXQgcnVudGltZS5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEEgcHJpbWl0aXZlIGlzIGFuIGFzeW5jIG9wZXJhdGlvbiB0aGUgZXhlY3V0b3IgZGlzcGF0Y2hlcyBmb3IgQW5pbWF0aW9uTm9kZS5cbiAqXG4gKiBAcGFyYW0gc2VsZWN0b3IgIENTUyBzZWxlY3RvciBzdHJpbmcgKGFscmVhZHkgcmVzb2x2ZWQgXHUyMDE0IG5vIHZhcmlhYmxlIHN1YnN0aXR1dGlvbiBuZWVkZWQgaGVyZSlcbiAqIEBwYXJhbSBkdXJhdGlvbiAgbWlsbGlzZWNvbmRzXG4gKiBAcGFyYW0gZWFzaW5nICAgIENTUyBlYXNpbmcgc3RyaW5nLCBlLmcuICdlYXNlLW91dCdcbiAqIEBwYXJhbSBvcHRpb25zICAga2V5L3ZhbHVlIG9wdGlvbnMgZnJvbSB0aGUgdHJhaWxpbmcgWy4uLl0gYmxvY2ssIGFscmVhZHkgZXZhbHVhdGVkXG4gKiBAcGFyYW0gaG9zdCAgICAgIHRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBlbGVtZW50ICh1c2VkIGFzIHF1ZXJ5U2VsZWN0b3Igcm9vdClcbiAqL1xuZXhwb3J0IHR5cGUgTEVTUHJpbWl0aXZlID0gKFxuICBzZWxlY3Rvcjogc3RyaW5nLFxuICBkdXJhdGlvbjogbnVtYmVyLFxuICBlYXNpbmc6IHN0cmluZyxcbiAgb3B0aW9uczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIGhvc3Q6IEVsZW1lbnRcbikgPT4gUHJvbWlzZTx2b2lkPlxuXG4vKiogVGhlIHNoYXBlIGEgdXNlcmxhbmQgbW9kdWxlIG11c3QgZXhwb3J0IGFzIGl0cyBkZWZhdWx0IGV4cG9ydC4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTEVTTW9kdWxlIHtcbiAgLyoqIEh1bWFuLXJlYWRhYmxlIG5hbWUgZm9yIGVycm9yIG1lc3NhZ2VzICovXG4gIG5hbWU6IHN0cmluZ1xuICBwcmltaXRpdmVzOiBSZWNvcmQ8c3RyaW5nLCBMRVNQcmltaXRpdmU+XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBSZWdpc3RyeSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZXhwb3J0IGNsYXNzIE1vZHVsZVJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBwcmltaXRpdmVzID0gbmV3IE1hcDxzdHJpbmcsIExFU1ByaW1pdGl2ZT4oKVxuICBwcml2YXRlIGxvYWRlZE1vZHVsZXM6IHN0cmluZ1tdID0gW11cblxuICByZWdpc3Rlcihtb2R1bGU6IExFU01vZHVsZSk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgW25hbWUsIGZuXSBvZiBPYmplY3QuZW50cmllcyhtb2R1bGUucHJpbWl0aXZlcykpIHtcbiAgICAgIHRoaXMucHJpbWl0aXZlcy5zZXQobmFtZSwgZm4pXG4gICAgfVxuICAgIHRoaXMubG9hZGVkTW9kdWxlcy5wdXNoKG1vZHVsZS5uYW1lKVxuICAgIGNvbnNvbGUubG9nKGBbTEVTXSBtb2R1bGUgbG9hZGVkOiBcIiR7bW9kdWxlLm5hbWV9XCJgLCBPYmplY3Qua2V5cyhtb2R1bGUucHJpbWl0aXZlcykpXG4gIH1cblxuICBnZXQocHJpbWl0aXZlOiBzdHJpbmcpOiBMRVNQcmltaXRpdmUgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLnByaW1pdGl2ZXMuZ2V0KHByaW1pdGl2ZSlcbiAgfVxuXG4gIGhhcyhwcmltaXRpdmU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnByaW1pdGl2ZXMuaGFzKHByaW1pdGl2ZSlcbiAgfVxuXG4gIC8qKiBEZXYtbW9kZSBoZWxwOiB3aGljaCBtb2R1bGUgZXhwb3J0cyBhIGdpdmVuIHByaW1pdGl2ZT8gKi9cbiAgaGludEZvcihwcmltaXRpdmU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgLy8gV2lsbCBiZSBlbnJpY2hlZCBpbiBQaGFzZSA4IHdpdGggcGVyLW1vZHVsZSBwcmltaXRpdmUgbWFuaWZlc3RzLlxuICAgIHJldHVybiBgUHJpbWl0aXZlIFwiJHtwcmltaXRpdmV9XCIgbm90IGZvdW5kLiBMb2FkZWQgbW9kdWxlczogWyR7dGhpcy5sb2FkZWRNb2R1bGVzLmpvaW4oJywgJyl9XS4gRGlkIHlvdSBmb3JnZXQgPHVzZS1tb2R1bGUgdHlwZT1cImFuaW1hdGlvblwiPj9gXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIExvYWRlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqIEJ1aWx0LWluIG1vZHVsZSByZWdpc3RyeTogdHlwZSBuYW1lIFx1MjE5MiBpbXBvcnQgcGF0aCAqL1xuY29uc3QgQlVJTFRJTl9NT0RVTEVTOiBSZWNvcmQ8c3RyaW5nLCAoKSA9PiBQcm9taXNlPHsgZGVmYXVsdDogTEVTTW9kdWxlIH0+PiA9IHtcbiAgYW5pbWF0aW9uOiAoKSA9PiBpbXBvcnQoJy4vYnVpbHRpbi9hbmltYXRpb24uanMnKSxcbn1cblxuLyoqXG4gKiBSZXNvbHZlIGEgPHVzZS1tb2R1bGU+IGVsZW1lbnQgdG8gYSBMRVNNb2R1bGUgYW5kIHJlZ2lzdGVyIGl0LlxuICogQ2FsbGVkIGR1cmluZyBQaGFzZSAxIERPTSByZWFkaW5nIChQaGFzZSA4IGNvbXBsZXRlcyB0aGUgc3JjPSBwYXRoKS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRNb2R1bGUoXG4gIHJlZ2lzdHJ5OiBNb2R1bGVSZWdpc3RyeSxcbiAgb3B0czogeyB0eXBlPzogc3RyaW5nOyBzcmM/OiBzdHJpbmcgfVxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChvcHRzLnR5cGUpIHtcbiAgICBjb25zdCBsb2FkZXIgPSBCVUlMVElOX01PRFVMRVNbb3B0cy50eXBlXVxuICAgIGlmICghbG9hZGVyKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVNdIFVua25vd24gYnVpbHQtaW4gbW9kdWxlIHR5cGU6IFwiJHtvcHRzLnR5cGV9XCIuIEF2YWlsYWJsZTogJHtPYmplY3Qua2V5cyhCVUlMVElOX01PRFVMRVMpLmpvaW4oJywgJyl9YClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25zdCBtb2QgPSBhd2FpdCBsb2FkZXIoKVxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKG1vZC5kZWZhdWx0KVxuICAgIHJldHVyblxuICB9XG5cbiAgaWYgKG9wdHMuc3JjKSB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIFJlc29sdmUgcmVsYXRpdmUgcGF0aHMgYWdhaW5zdCB0aGUgcGFnZSBVUkwsIG5vdCB0aGUgYnVuZGxlIFVSTC5cbiAgICAgIC8vIFdpdGhvdXQgdGhpcywgJy4vc2Nyb2xsLWVmZmVjdHMuanMnIHJlc29sdmVzIHRvICcvZGlzdC9zY3JvbGwtZWZmZWN0cy5qcydcbiAgICAgIC8vIChyZWxhdGl2ZSB0byB0aGUgYnVuZGxlIGF0IC9kaXN0L2xvY2FsLWV2ZW50LXNjcmlwdC5qcykgaW5zdGVhZCBvZlxuICAgICAgLy8gJy9zY3JvbGwtZWZmZWN0cy5qcycgKHJlbGF0aXZlIHRvIHRoZSBIVE1MIHBhZ2UpLlxuICAgICAgY29uc3QgcmVzb2x2ZWRTcmMgPSBuZXcgVVJMKG9wdHMuc3JjLCBkb2N1bWVudC5iYXNlVVJJKS5ocmVmXG4gICAgICBjb25zdCBtb2QgPSBhd2FpdCBpbXBvcnQoLyogQHZpdGUtaWdub3JlICovIHJlc29sdmVkU3JjKVxuICAgICAgaWYgKCFtb2QuZGVmYXVsdCB8fCB0eXBlb2YgbW9kLmRlZmF1bHQucHJpbWl0aXZlcyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBbTEVTXSBNb2R1bGUgYXQgXCIke29wdHMuc3JjfVwiIGRvZXMgbm90IGV4cG9ydCBhIHZhbGlkIExFU01vZHVsZS4gRXhwZWN0ZWQ6IHsgbmFtZTogc3RyaW5nLCBwcmltaXRpdmVzOiBSZWNvcmQ8c3RyaW5nLCBGdW5jdGlvbj4gfWApXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgcmVnaXN0cnkucmVnaXN0ZXIobW9kLmRlZmF1bHQgYXMgTEVTTW9kdWxlKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihgW0xFU10gRmFpbGVkIHRvIGxvYWQgbW9kdWxlIGZyb20gXCIke29wdHMuc3JjfVwiOmAsIGVycilcbiAgICB9XG4gICAgcmV0dXJuXG4gIH1cblxuICBjb25zb2xlLndhcm4oJ1tMRVNdIDx1c2UtbW9kdWxlPiByZXF1aXJlcyBlaXRoZXIgdHlwZT0gb3Igc3JjPSBhdHRyaWJ1dGUuJylcbn1cbiIsICIvKipcbiAqIFN0cmlwcyB0aGUgYmFja3RpY2sgd3JhcHBlciBmcm9tIGEgbXVsdGktbGluZSBMRVMgYm9keSBzdHJpbmcgYW5kXG4gKiBub3JtYWxpemVzIGluZGVudGF0aW9uLCBwcm9kdWNpbmcgYSBjbGVhbiBzdHJpbmcgdGhlIHBhcnNlciBjYW4gd29yayB3aXRoLlxuICpcbiAqIENvbnZlbnRpb246XG4gKiAgIFNpbmdsZS1saW5lOiAgaGFuZGxlPVwiZW1pdCBmZWVkOmluaXRcIiAgICAgICAgICAgXHUyMTkyIFwiZW1pdCBmZWVkOmluaXRcIlxuICogICBNdWx0aS1saW5lOiAgIGRvPVwiYFxcbiAgICAgIHNldC4uLlxcbiAgICBgXCIgICAgICAgIFx1MjE5MiBcInNldC4uLlxcbi4uLlwiXG4gKlxuICogQWxnb3JpdGhtOlxuICogICAxLiBUcmltIG91dGVyIHdoaXRlc3BhY2UgZnJvbSB0aGUgcmF3IGF0dHJpYnV0ZSB2YWx1ZS5cbiAqICAgMi4gSWYgd3JhcHBlZCBpbiBiYWNrdGlja3MsIHN0cmlwIHRoZW0gXHUyMDE0IGRvIE5PVCBpbm5lci10cmltIHlldC5cbiAqICAgMy4gU3BsaXQgaW50byBsaW5lcyBhbmQgY29tcHV0ZSBtaW5pbXVtIG5vbi16ZXJvIGluZGVudGF0aW9uXG4gKiAgICAgIGFjcm9zcyBhbGwgbm9uLWVtcHR5IGxpbmVzLiBUaGlzIGlzIHRoZSBIVE1MIGF0dHJpYnV0ZSBpbmRlbnRhdGlvblxuICogICAgICBsZXZlbCB0byByZW1vdmUuXG4gKiAgIDQuIFN0cmlwIHRoYXQgbWFueSBsZWFkaW5nIGNoYXJhY3RlcnMgZnJvbSBldmVyeSBsaW5lLlxuICogICA1LiBEcm9wIGxlYWRpbmcvdHJhaWxpbmcgYmxhbmsgbGluZXMsIHJldHVybiBqb2luZWQgcmVzdWx0LlxuICpcbiAqIENydWNpYWxseSwgc3RlcCAyIGRvZXMgTk9UIGNhbGwgLnRyaW0oKSBvbiB0aGUgaW5uZXIgY29udGVudCBiZWZvcmVcbiAqIGNvbXB1dGluZyBpbmRlbnRhdGlvbi4gQW4gaW5uZXIgLnRyaW0oKSB3b3VsZCBkZXN0cm95IHRoZSBsZWFkaW5nXG4gKiB3aGl0ZXNwYWNlIG9uIGxpbmUgMSwgbWFraW5nIG1pbkluZGVudCA9IDAgYW5kIGxlYXZpbmcgYWxsIG90aGVyXG4gKiBsaW5lcyB1bi1kZS1pbmRlbnRlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwQm9keShyYXc6IHN0cmluZyk6IHN0cmluZyB7XG4gIGxldCBzID0gcmF3LnRyaW0oKVxuXG4gIC8vIFN0cmlwIGJhY2t0aWNrIHdyYXBwZXIgXHUyMDE0IGJ1dCBwcmVzZXJ2ZSBpbnRlcm5hbCB3aGl0ZXNwYWNlIGZvciBkZS1pbmRlbnRcbiAgaWYgKHMuc3RhcnRzV2l0aCgnYCcpICYmIHMuZW5kc1dpdGgoJ2AnKSkge1xuICAgIHMgPSBzLnNsaWNlKDEsIC0xKVxuICAgIC8vIERvIE5PVCAudHJpbSgpIGhlcmUgXHUyMDE0IHRoYXQga2lsbHMgdGhlIGxlYWRpbmcgaW5kZW50IG9uIGxpbmUgMVxuICB9XG5cbiAgY29uc3QgbGluZXMgPSBzLnNwbGl0KCdcXG4nKVxuICBjb25zdCBub25FbXB0eSA9IGxpbmVzLmZpbHRlcihsID0+IGwudHJpbSgpLmxlbmd0aCA+IDApXG4gIGlmIChub25FbXB0eS5sZW5ndGggPT09IDApIHJldHVybiAnJ1xuXG4gIC8vIEZvciBzaW5nbGUtbGluZSB2YWx1ZXMgKG5vIG5ld2xpbmVzIGFmdGVyIGJhY2t0aWNrIHN0cmlwKSwganVzdCB0cmltXG4gIGlmIChsaW5lcy5sZW5ndGggPT09IDEpIHJldHVybiBzLnRyaW0oKVxuXG4gIC8vIE1pbmltdW0gbGVhZGluZyB3aGl0ZXNwYWNlIGFjcm9zcyBub24tZW1wdHkgbGluZXNcbiAgY29uc3QgbWluSW5kZW50ID0gbm9uRW1wdHkucmVkdWNlKChtaW4sIGxpbmUpID0+IHtcbiAgICBjb25zdCBsZWFkaW5nID0gbGluZS5tYXRjaCgvXihcXHMqKS8pPy5bMV0/Lmxlbmd0aCA/PyAwXG4gICAgcmV0dXJuIE1hdGgubWluKG1pbiwgbGVhZGluZylcbiAgfSwgSW5maW5pdHkpXG5cbiAgY29uc3Qgc3RyaXBwZWQgPSBtaW5JbmRlbnQgPT09IDAgfHwgbWluSW5kZW50ID09PSBJbmZpbml0eVxuICAgID8gbGluZXNcbiAgICA6IGxpbmVzLm1hcChsaW5lID0+IGxpbmUubGVuZ3RoID49IG1pbkluZGVudCA/IGxpbmUuc2xpY2UobWluSW5kZW50KSA6IGxpbmUudHJpbVN0YXJ0KCkpXG5cbiAgLy8gRHJvcCBsZWFkaW5nIGFuZCB0cmFpbGluZyBibGFuayBsaW5lcyAodGhlIG5ld2xpbmVzIGFyb3VuZCBiYWNrdGljayBjb250ZW50KVxuICBsZXQgc3RhcnQgPSAwXG4gIGxldCBlbmQgPSBzdHJpcHBlZC5sZW5ndGggLSAxXG4gIHdoaWxlIChzdGFydCA8PSBlbmQgJiYgc3RyaXBwZWRbc3RhcnRdPy50cmltKCkgPT09ICcnKSBzdGFydCsrXG4gIHdoaWxlIChlbmQgPj0gc3RhcnQgJiYgc3RyaXBwZWRbZW5kXT8udHJpbSgpID09PSAnJykgZW5kLS1cblxuICByZXR1cm4gc3RyaXBwZWQuc2xpY2Uoc3RhcnQsIGVuZCArIDEpLmpvaW4oJ1xcbicpXG59XG4iLCAiaW1wb3J0IHR5cGUge1xuICBMRVNDb25maWcsXG4gIE1vZHVsZURlY2wsXG4gIENvbW1hbmREZWNsLFxuICBFdmVudEhhbmRsZXJEZWNsLFxuICBTaWduYWxXYXRjaGVyRGVjbCxcbiAgT25Mb2FkRGVjbCxcbiAgT25FbnRlckRlY2wsXG4gIE9uRXhpdERlY2wsXG59IGZyb20gJy4vY29uZmlnLmpzJ1xuaW1wb3J0IHsgc3RyaXBCb2R5IH0gZnJvbSAnLi9zdHJpcEJvZHkuanMnXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gVGFnIG5hbWUgXHUyMTkyIGhhbmRsZXIgbWFwXG4vLyBFYWNoIGhhbmRsZXIgcmVhZHMgYXR0cmlidXRlcyBmcm9tIGEgY2hpbGQgZWxlbWVudCBhbmQgcHVzaGVzIGEgdHlwZWQgZGVjbFxuLy8gaW50byB0aGUgY29uZmlnIGJlaW5nIGJ1aWx0LiBVbmtub3duIHRhZ3MgYXJlIGNvbGxlY3RlZCBmb3Igd2FybmluZy5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG50eXBlIEhhbmRsZXIgPSAoZWw6IEVsZW1lbnQsIGNvbmZpZzogTEVTQ29uZmlnKSA9PiB2b2lkXG5cbmNvbnN0IEhBTkRMRVJTOiBSZWNvcmQ8c3RyaW5nLCBIYW5kbGVyPiA9IHtcblxuICAndXNlLW1vZHVsZScoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IHR5cGUgPSBlbC5nZXRBdHRyaWJ1dGUoJ3R5cGUnKT8udHJpbSgpID8/IG51bGxcbiAgICBjb25zdCBzcmMgID0gZWwuZ2V0QXR0cmlidXRlKCdzcmMnKT8udHJpbSgpICA/PyBudWxsXG5cbiAgICBpZiAoIXR5cGUgJiYgIXNyYykge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8dXNlLW1vZHVsZT4gaGFzIG5laXRoZXIgdHlwZT0gbm9yIHNyYz0gXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25maWcubW9kdWxlcy5wdXNoKHsgdHlwZSwgc3JjLCBlbGVtZW50OiBlbCB9KVxuICB9LFxuXG4gICdsb2NhbC1jb21tYW5kJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgbmFtZSA9IGVsLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgPz8gJydcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdkbycpPy50cmltKCkgICA/PyAnJ1xuXG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDxsb2NhbC1jb21tYW5kPiBtaXNzaW5nIHJlcXVpcmVkIG5hbWU9IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBpZiAoIWJvZHkpIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFU10gPGxvY2FsLWNvbW1hbmQgbmFtZT1cIiR7bmFtZX1cIj4gbWlzc2luZyByZXF1aXJlZCBkbz0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLmAsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uZmlnLmNvbW1hbmRzLnB1c2goe1xuICAgICAgbmFtZSxcbiAgICAgIGFyZ3NSYXc6IGVsLmdldEF0dHJpYnV0ZSgnYXJncycpPy50cmltKCkgID8/ICcnLFxuICAgICAgZ3VhcmQ6ICAgZWwuZ2V0QXR0cmlidXRlKCdndWFyZCcpPy50cmltKCkgPz8gbnVsbCxcbiAgICAgIGJvZHk6ICAgIHN0cmlwQm9keShib2R5KSxcbiAgICAgIGVsZW1lbnQ6IGVsLFxuICAgIH0pXG4gIH0sXG5cbiAgJ29uLWV2ZW50JyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgbmFtZSA9IGVsLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgICA/PyAnJ1xuICAgIGNvbnN0IGJvZHkgPSBlbC5nZXRBdHRyaWJ1dGUoJ2hhbmRsZScpPy50cmltKCkgPz8gJydcblxuICAgIGlmICghbmFtZSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tZXZlbnQ+IG1pc3NpbmcgcmVxdWlyZWQgbmFtZT0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTXSA8b24tZXZlbnQgbmFtZT1cIiR7bmFtZX1cIj4gbWlzc2luZyByZXF1aXJlZCBoYW5kbGU9IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC5gLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbmZpZy5vbkV2ZW50LnB1c2goeyBuYW1lLCBib2R5OiBzdHJpcEJvZHkoYm9keSksIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG5cbiAgJ29uLXNpZ25hbCcoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IG5hbWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpICAgPz8gJydcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdoYW5kbGUnKT8udHJpbSgpID8/ICcnXG5cbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPG9uLXNpZ25hbD4gbWlzc2luZyByZXF1aXJlZCBuYW1lPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVNdIDxvbi1zaWduYWwgbmFtZT1cIiR7bmFtZX1cIj4gbWlzc2luZyByZXF1aXJlZCBoYW5kbGU9IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC5gLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbmZpZy5vblNpZ25hbC5wdXNoKHtcbiAgICAgIG5hbWUsXG4gICAgICB3aGVuOiAgICBlbC5nZXRBdHRyaWJ1dGUoJ3doZW4nKT8udHJpbSgpID8/IG51bGwsXG4gICAgICBib2R5OiAgICBzdHJpcEJvZHkoYm9keSksXG4gICAgICBlbGVtZW50OiBlbCxcbiAgICB9KVxuICB9LFxuXG4gICdvbi1sb2FkJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tbG9hZD4gbWlzc2luZyByZXF1aXJlZCBydW49IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25maWcub25Mb2FkLnB1c2goeyBib2R5OiBzdHJpcEJvZHkoYm9keSksIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG5cbiAgJ29uLWVudGVyJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tZW50ZXI+IG1pc3NpbmcgcmVxdWlyZWQgcnVuPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uZmlnLm9uRW50ZXIucHVzaCh7XG4gICAgICB3aGVuOiAgICBlbC5nZXRBdHRyaWJ1dGUoJ3doZW4nKT8udHJpbSgpID8/IG51bGwsXG4gICAgICBib2R5OiAgICBzdHJpcEJvZHkoYm9keSksXG4gICAgICBlbGVtZW50OiBlbCxcbiAgICB9KVxuICB9LFxuXG4gICdvbi1leGl0JyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tZXhpdD4gbWlzc2luZyByZXF1aXJlZCBydW49IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25maWcub25FeGl0LnB1c2goeyBib2R5OiBzdHJpcEJvZHkoYm9keSksIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gcmVhZENvbmZpZyBcdTIwMTQgdGhlIHB1YmxpYyBlbnRyeSBwb2ludFxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogV2Fsa3MgdGhlIGRpcmVjdCBjaGlsZHJlbiBvZiBhIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGVsZW1lbnQgYW5kXG4gKiBwcm9kdWNlcyBhIHN0cnVjdHVyZWQgTEVTQ29uZmlnLlxuICpcbiAqIE9ubHkgZGlyZWN0IGNoaWxkcmVuIGFyZSByZWFkIFx1MjAxNCBuZXN0ZWQgZWxlbWVudHMgaW5zaWRlIGEgPGxvY2FsLWNvbW1hbmQ+XG4gKiBib2R5IGFyZSBub3QgY2hpbGRyZW4gb2YgdGhlIGhvc3QgYW5kIGFyZSBuZXZlciB2aXNpdGVkIGhlcmUuXG4gKlxuICogVW5rbm93biBjaGlsZCBlbGVtZW50cyBlbWl0IGEgY29uc29sZS53YXJuIGFuZCBhcmUgY29sbGVjdGVkIGluIGNvbmZpZy51bmtub3duXG4gKiBzbyB0b29saW5nIChlLmcuIGEgZnV0dXJlIExFUyBsYW5ndWFnZSBzZXJ2ZXIpIGNhbiByZXBvcnQgdGhlbS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWRDb25maWcoaG9zdDogRWxlbWVudCk6IExFU0NvbmZpZyB7XG4gIGNvbnN0IGNvbmZpZzogTEVTQ29uZmlnID0ge1xuICAgIGlkOiAgICAgICBob3N0LmlkIHx8ICcobm8gaWQpJyxcbiAgICBtb2R1bGVzOiAgW10sXG4gICAgY29tbWFuZHM6IFtdLFxuICAgIG9uRXZlbnQ6ICBbXSxcbiAgICBvblNpZ25hbDogW10sXG4gICAgb25Mb2FkOiAgIFtdLFxuICAgIG9uRW50ZXI6ICBbXSxcbiAgICBvbkV4aXQ6ICAgW10sXG4gICAgdW5rbm93bjogIFtdLFxuICB9XG5cbiAgZm9yIChjb25zdCBjaGlsZCBvZiBBcnJheS5mcm9tKGhvc3QuY2hpbGRyZW4pKSB7XG4gICAgY29uc3QgdGFnID0gY2hpbGQudGFnTmFtZS50b0xvd2VyQ2FzZSgpXG4gICAgY29uc3QgaGFuZGxlciA9IEhBTkRMRVJTW3RhZ11cblxuICAgIGlmIChoYW5kbGVyKSB7XG4gICAgICBoYW5kbGVyKGNoaWxkLCBjb25maWcpXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbmZpZy51bmtub3duLnB1c2goY2hpbGQpXG4gICAgICAvLyBPbmx5IHdhcm4gZm9yIGh5cGhlbmF0ZWQgY3VzdG9tIGVsZW1lbnQgbmFtZXMgXHUyMDE0IHRob3NlIGFyZSBsaWtlbHlcbiAgICAgIC8vIG1pcy10eXBlZCBMRVMga2V5d29yZHMuIFBsYWluIEhUTUwgZWxlbWVudHMgKGRpdiwgcCwgc2VjdGlvbiwgZXRjLilcbiAgICAgIC8vIGFyZSB2YWxpZCBjb250ZW50IGNoaWxkcmVuIGFuZCBwYXNzIHRocm91Z2ggc2lsZW50bHkuXG4gICAgICBpZiAodGFnLmluY2x1ZGVzKCctJykpIHtcbiAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgIGBbTEVTXSBVbmtub3duIGNoaWxkIGVsZW1lbnQgPCR7dGFnfT4gaW5zaWRlIDxsb2NhbC1ldmVudC1zY3JpcHQgaWQ9XCIke2NvbmZpZy5pZH1cIj4gXHUyMDE0IGlnbm9yZWQuIERpZCB5b3UgbWVhbiBhIExFUyBlbGVtZW50P2AsXG4gICAgICAgICAgY2hpbGRcbiAgICAgICAgKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjb25maWdcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBsb2dDb25maWcgXHUyMDE0IHN0cnVjdHVyZWQgY2hlY2twb2ludCBsb2dcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIExvZ3MgYSBzdW1tYXJ5IG9mIGEgcGFyc2VkIExFU0NvbmZpZy5cbiAqIFBoYXNlIDEgY2hlY2twb2ludDogeW91IHNob3VsZCBzZWUgdGhpcyBpbiB0aGUgYnJvd3NlciBjb25zb2xlL2RlYnVnIGxvZ1xuICogd2l0aCBhbGwgY29tbWFuZHMsIGV2ZW50cywgYW5kIHNpZ25hbCB3YXRjaGVycyBjb3JyZWN0bHkgbGlzdGVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9nQ29uZmlnKGNvbmZpZzogTEVTQ29uZmlnKTogdm9pZCB7XG4gIGNvbnN0IGlkID0gY29uZmlnLmlkXG4gIGNvbnNvbGUubG9nKGBbTEVTXSBjb25maWcgcmVhZCBmb3IgIyR7aWR9YClcbiAgY29uc29sZS5sb2coYFtMRVNdICAgbW9kdWxlczogICAke2NvbmZpZy5tb2R1bGVzLmxlbmd0aH1gLCBjb25maWcubW9kdWxlcy5tYXAobSA9PiBtLnR5cGUgPz8gbS5zcmMpKVxuICBjb25zb2xlLmxvZyhgW0xFU10gICBjb21tYW5kczogICR7Y29uZmlnLmNvbW1hbmRzLmxlbmd0aH1gLCBjb25maWcuY29tbWFuZHMubWFwKGMgPT4gYy5uYW1lKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tZXZlbnQ6ICAke2NvbmZpZy5vbkV2ZW50Lmxlbmd0aH1gLCBjb25maWcub25FdmVudC5tYXAoZSA9PiBlLm5hbWUpKVxuICBjb25zb2xlLmxvZyhgW0xFU10gICBvbi1zaWduYWw6ICR7Y29uZmlnLm9uU2lnbmFsLmxlbmd0aH1gLCBjb25maWcub25TaWduYWwubWFwKHMgPT4gcy5uYW1lKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tbG9hZDogICAke2NvbmZpZy5vbkxvYWQubGVuZ3RofWApXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG9uLWVudGVyOiAgJHtjb25maWcub25FbnRlci5sZW5ndGh9YCwgY29uZmlnLm9uRW50ZXIubWFwKGUgPT4gZS53aGVuID8/ICdhbHdheXMnKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tZXhpdDogICAke2NvbmZpZy5vbkV4aXQubGVuZ3RofWApXG5cbiAgY29uc3QgdW5rbm93bkN1c3RvbSA9IGNvbmZpZy51bmtub3duLmZpbHRlcihlID0+IGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCctJykpXG4gIGlmICh1bmtub3duQ3VzdG9tLmxlbmd0aCA+IDApIHtcbiAgICBjb25zb2xlLndhcm4oYFtMRVNdICAgdW5rbm93biBjdXN0b20gY2hpbGRyZW46ICR7dW5rbm93bkN1c3RvbS5sZW5ndGh9YCwgdW5rbm93bkN1c3RvbS5tYXAoZSA9PiBlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSkpXG4gIH1cblxuICAvLyBMb2cgYSBzYW1wbGluZyBvZiBib2R5IHN0cmluZ3MgdG8gdmVyaWZ5IHN0cmlwQm9keSB3b3JrZWQgY29ycmVjdGx5XG4gIGlmIChjb25maWcuY29tbWFuZHMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGZpcnN0ID0gY29uZmlnLmNvbW1hbmRzWzBdXG4gICAgaWYgKGZpcnN0KSB7XG4gICAgICBjb25zb2xlLmxvZyhgW0xFU10gICBmaXJzdCBjb21tYW5kIGJvZHkgcHJldmlldyAoXCIke2ZpcnN0Lm5hbWV9XCIpOmApXG4gICAgICBjb25zdCBwcmV2aWV3ID0gZmlyc3QuYm9keS5zcGxpdCgnXFxuJykuc2xpY2UoMCwgNCkuam9pbignXFxuICAnKVxuICAgICAgY29uc29sZS5sb2coYFtMRVNdICAgfCAke3ByZXZpZXd9YClcbiAgICB9XG4gIH1cbn1cbiIsICIvLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIExFUyBUb2tlbml6ZXJcbi8vXG4vLyBDb252ZXJ0cyBhIHN0cmlwQm9keSdkIHNvdXJjZSBzdHJpbmcgaW50byBhIGZsYXQgYXJyYXkgb2YgVG9rZW4gb2JqZWN0cy5cbi8vIFRva2VucyBhcmUgc2ltcGx5IG5vbi1ibGFuayBsaW5lcyB3aXRoIHRoZWlyIGluZGVudCBsZXZlbCByZWNvcmRlZC5cbi8vIE5vIHNlbWFudGljIGFuYWx5c2lzIGhhcHBlbnMgaGVyZSBcdTIwMTQgdGhhdCdzIHRoZSBwYXJzZXIncyBqb2IuXG4vL1xuLy8gVGhlIHRva2VuaXplciBpcyBkZWxpYmVyYXRlbHkgbWluaW1hbDogaXQgcHJlc2VydmVzIHRoZSByYXcgaW5kZW50YXRpb25cbi8vIGluZm9ybWF0aW9uIHRoZSBwYXJzZXIgbmVlZHMgdG8gdW5kZXJzdGFuZCBibG9jayBzdHJ1Y3R1cmUuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZXhwb3J0IGludGVyZmFjZSBUb2tlbiB7XG4gIC8qKiBDb2x1bW4gb2Zmc2V0IG9mIHRoZSBmaXJzdCBub24td2hpdGVzcGFjZSBjaGFyYWN0ZXIgKG51bWJlciBvZiBzcGFjZXMpICovXG4gIGluZGVudDogbnVtYmVyXG4gIC8qKiBUcmltbWVkIGxpbmUgY29udGVudCBcdTIwMTQgbm8gbGVhZGluZy90cmFpbGluZyB3aGl0ZXNwYWNlICovXG4gIHRleHQ6IHN0cmluZ1xuICAvKiogMS1iYXNlZCBsaW5lIG51bWJlciBpbiB0aGUgc3RyaXBwZWQgc291cmNlIChmb3IgZXJyb3IgbWVzc2FnZXMpICovXG4gIGxpbmVOdW06IG51bWJlclxufVxuXG4vKipcbiAqIENvbnZlcnRzIGEgc3RyaXBwZWQgTEVTIGJvZHkgc3RyaW5nIGludG8gYSBUb2tlbiBhcnJheS5cbiAqIEJsYW5rIGxpbmVzIGFyZSBkcm9wcGVkLiBUYWJzIGFyZSBleHBhbmRlZCB0byAyIHNwYWNlcyBlYWNoLlxuICpcbiAqIEBwYXJhbSBzb3VyY2UgIEEgc3RyaW5nIGFscmVhZHkgcHJvY2Vzc2VkIGJ5IHN0cmlwQm9keSgpIFx1MjAxNCBubyBiYWNrdGljayB3cmFwcGVycy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHRva2VuaXplKHNvdXJjZTogc3RyaW5nKTogVG9rZW5bXSB7XG4gIGNvbnN0IHRva2VuczogVG9rZW5bXSA9IFtdXG4gIGNvbnN0IGxpbmVzID0gc291cmNlLnNwbGl0KCdcXG4nKVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCByYXcgPSAobGluZXNbaV0gPz8gJycpLnJlcGxhY2UoL1xcdC9nLCAnICAnKVxuICAgIGNvbnN0IHRleHQgPSByYXcudHJpbSgpXG5cbiAgICAvLyBTa2lwIGJsYW5rIGxpbmVzXG4gICAgaWYgKHRleHQubGVuZ3RoID09PSAwKSBjb250aW51ZVxuXG4gICAgY29uc3QgaW5kZW50ID0gcmF3Lmxlbmd0aCAtIHJhdy50cmltU3RhcnQoKS5sZW5ndGhcblxuICAgIHRva2Vucy5wdXNoKHtcbiAgICAgIGluZGVudCxcbiAgICAgIHRleHQsXG4gICAgICBsaW5lTnVtOiBpICsgMSxcbiAgICB9KVxuICB9XG5cbiAgcmV0dXJuIHRva2Vuc1xufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEhlbHBlcnMgdXNlZCBieSBib3RoIHRoZSB0b2tlbml6ZXIgdGVzdHMgYW5kIHRoZSBwYXJzZXJcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBgdGV4dGAgZW5kcyB3aXRoIGEgc3RhbmRhbG9uZSBgYW5kYCB3b3JkLlxuICogVXNlZCBieSB0aGUgcGFyc2VyIHRvIGRldGVjdCBwYXJhbGxlbCBicmFuY2hlcy5cbiAqXG4gKiBDYXJlZnVsOiBcImVuZ2xhbmRcIiwgXCJiYW5kXCIsIFwiY29tbWFuZFwiIG11c3QgTk9UIG1hdGNoLlxuICogV2UgcmVxdWlyZSBhIHdvcmQgYm91bmRhcnkgYmVmb3JlIGBhbmRgIGFuZCBlbmQtb2Ytc3RyaW5nIGFmdGVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZW5kc1dpdGhBbmQodGV4dDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiAvXFxiYW5kJC8udGVzdCh0ZXh0KVxufVxuXG4vKipcbiAqIFN0cmlwcyB0aGUgdHJhaWxpbmcgYCBhbmRgIGZyb20gYSBsaW5lIHRoYXQgZW5kc1dpdGhBbmQuXG4gKiBSZXR1cm5zIHRoZSB0cmltbWVkIGxpbmUgY29udGVudCB3aXRob3V0IGl0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gc3RyaXBUcmFpbGluZ0FuZCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdGV4dC5yZXBsYWNlKC9cXHMrYW5kJC8sICcnKS50cmltRW5kKClcbn1cblxuLyoqXG4gKiBCbG9jayB0ZXJtaW5hdG9yIHRva2VucyBcdTIwMTQgc2lnbmFsIHRoZSBlbmQgb2YgYSBtYXRjaCBvciB0cnkgYmxvY2suXG4gKiBUaGVzZSBhcmUgY29uc3VtZWQgYnkgdGhlIGJsb2NrLW93bmluZyBwYXJzZXIgKHBhcnNlTWF0Y2ggLyBwYXJzZVRyeSksXG4gKiBub3QgYnkgcGFyc2VCbG9jayBpdHNlbGYuXG4gKi9cbmV4cG9ydCBjb25zdCBCTE9DS19URVJNSU5BVE9SUyA9IG5ldyBTZXQoWycvbWF0Y2gnLCAnL3RyeSddKVxuXG4vKipcbiAqIEtleXdvcmRzIHRoYXQgZW5kIGEgdHJ5IGJvZHkgYW5kIHN0YXJ0IGEgcmVzY3VlL2FmdGVyd2FyZHMgY2xhdXNlLlxuICogUmVjb2duaXplZCBvbmx5IHdoZW4gdGhleSBhcHBlYXIgYXQgdGhlIHNhbWUgaW5kZW50IGxldmVsIGFzIHRoZSBgdHJ5YC5cbiAqL1xuZXhwb3J0IGNvbnN0IFRSWV9DTEFVU0VfS0VZV09SRFMgPSBuZXcgU2V0KFsncmVzY3VlJywgJ2FmdGVyd2FyZHMnXSlcbiIsICJpbXBvcnQgdHlwZSB7XG4gIExFU05vZGUsIEV4cHJOb2RlLCBTZXF1ZW5jZU5vZGUsIFBhcmFsbGVsTm9kZSxcbiAgU2V0Tm9kZSwgRW1pdE5vZGUsIEJyb2FkY2FzdE5vZGUsIFdhaXROb2RlLCBDYWxsTm9kZSxcbiAgQmluZE5vZGUsIEFjdGlvbk5vZGUsIE1hdGNoTm9kZSwgTWF0Y2hBcm0sIFBhdHRlcm5Ob2RlLFxuICBUcnlOb2RlLCBBbmltYXRpb25Ob2RlLFxufSBmcm9tICcuL2FzdC5qcydcbmltcG9ydCB0eXBlIHsgVG9rZW4gfSBmcm9tICcuL3Rva2VuaXplci5qcydcbmltcG9ydCB7XG4gIGVuZHNXaXRoQW5kLCBzdHJpcFRyYWlsaW5nQW5kLFxuICBCTE9DS19URVJNSU5BVE9SUywgVFJZX0NMQVVTRV9LRVlXT1JEUyxcbn0gZnJvbSAnLi90b2tlbml6ZXIuanMnXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gS25vd24gYW5pbWF0aW9uIHByaW1pdGl2ZSBuYW1lcyAocmVnaXN0ZXJlZCBieSB0aGUgYW5pbWF0aW9uIG1vZHVsZSlcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5jb25zdCBBTklNQVRJT05fUFJJTUlUSVZFUyA9IG5ldyBTZXQoW1xuICAnZmFkZS1pbicsICdmYWRlLW91dCcsICdzbGlkZS1pbicsICdzbGlkZS1vdXQnLFxuICAnc2xpZGUtdXAnLCAnc2xpZGUtZG93bicsICdwdWxzZScsXG4gICdzdGFnZ2VyLWVudGVyJywgJ3N0YWdnZXItZXhpdCcsXG4gICdzaGFrZScsXG5dKVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFBhcnNlclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBjbGFzcyBMRVNQYXJzZXIge1xuICBwcml2YXRlIHBvcyA9IDBcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHRva2VuczogVG9rZW5bXSkge31cblxuICBwcml2YXRlIHBlZWsob2Zmc2V0ID0gMCk6IFRva2VuIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy50b2tlbnNbdGhpcy5wb3MgKyBvZmZzZXRdXG4gIH1cblxuICBwcml2YXRlIGFkdmFuY2UoKTogVG9rZW4ge1xuICAgIGNvbnN0IHQgPSB0aGlzLnRva2Vuc1t0aGlzLnBvc11cbiAgICBpZiAoIXQpIHRocm93IG5ldyBMRVNQYXJzZUVycm9yKCdVbmV4cGVjdGVkIGVuZCBvZiBpbnB1dCcsIHVuZGVmaW5lZClcbiAgICB0aGlzLnBvcysrXG4gICAgcmV0dXJuIHRcbiAgfVxuXG4gIHByaXZhdGUgYXRFbmQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMucG9zID49IHRoaXMudG9rZW5zLmxlbmd0aFxuICB9XG5cbiAgcHJpdmF0ZSB0cnlDb25zdW1lKHRleHQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHQgPSB0aGlzLnBlZWsoKVxuICAgIGlmICh0Py50ZXh0ID09PSB0ZXh0KSB7IHRoaXMucG9zKys7IHJldHVybiB0cnVlIH1cbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBFbnRyeSBwb2ludCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwYXJzZSgpOiBMRVNOb2RlIHtcbiAgICBjb25zdCBub2RlID0gdGhpcy5wYXJzZUJsb2NrKC0xKVxuICAgIHJldHVybiBub2RlXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgQmxvY2sgcGFyc2VyIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIC8qKlxuICAgKiBQYXJzZXMgYWxsIHN0YXRlbWVudHMgYXQgaW5kZW50ID4gYmFzZUluZGVudC5cbiAgICpcbiAgICogU3RvcHMgd2hlbiBpdCBlbmNvdW50ZXJzOlxuICAgKiAgIC0gQSB0b2tlbiB3aXRoIGluZGVudCA8PSBiYXNlSW5kZW50XG4gICAqICAgLSBBIGJsb2NrIHRlcm1pbmF0b3IgKC9tYXRjaCwgL3RyeSkgXHUyMDE0IGxlZnQgZm9yIHRoZSBwYXJlbnQgdG8gY29uc3VtZVxuICAgKiAgIC0gQSB0cnktY2xhdXNlIGtleXdvcmQgKHJlc2N1ZSwgYWZ0ZXJ3YXJkcykgYXQgaW5kZW50IDw9IGJhc2VJbmRlbnRcbiAgICogICAtIEVuZCBvZiB0b2tlbiBzdHJlYW1cbiAgICpcbiAgICogUmV0dXJucyBhIFNlcXVlbmNlTm9kZSBpZiBtdWx0aXBsZSBzdGVwcywgb3RoZXJ3aXNlIHRoZSBzaW5nbGUgbm9kZS5cbiAgICovXG4gIHByaXZhdGUgcGFyc2VCbG9jayhiYXNlSW5kZW50OiBudW1iZXIpOiBMRVNOb2RlIHtcbiAgICBjb25zdCBzdGVwczogTEVTTm9kZVtdID0gW11cblxuICAgIHdoaWxlICghdGhpcy5hdEVuZCgpKSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy5wZWVrKCkhXG5cbiAgICAgIC8vIFN0b3A6IHdlJ3ZlIHJldHVybmVkIHRvIG9yIHBhc3QgdGhlIHBhcmVudCBibG9jaydzIGluZGVudFxuICAgICAgaWYgKHQuaW5kZW50IDw9IGJhc2VJbmRlbnQpIGJyZWFrXG5cbiAgICAgIC8vIFN0b3A6IGJsb2NrIHRlcm1pbmF0b3JzIGFyZSBjb25zdW1lZCBieSB0aGUgYmxvY2sgb3BlbmVyIChtYXRjaC90cnkpXG4gICAgICBpZiAoQkxPQ0tfVEVSTUlOQVRPUlMuaGFzKHQudGV4dCkpIGJyZWFrXG5cbiAgICAgIC8vIFN0b3A6IHRyeS1jbGF1c2Uga2V5d29yZHMgZW5kIHRoZSBjdXJyZW50IHRyeSBib2R5XG4gICAgICBpZiAoVFJZX0NMQVVTRV9LRVlXT1JEUy5oYXModC50ZXh0KSAmJiB0LmluZGVudCA8PSBiYXNlSW5kZW50ICsgMikgYnJlYWtcblxuICAgICAgLy8gXHUyNTAwXHUyNTAwIFNlcXVlbnRpYWwgY29ubmVjdGl2ZTogc3RhbmRhbG9uZSBgdGhlbmAgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgICAvLyBgdGhlbmAgYWxvbmUgb24gYSBsaW5lIGludHJvZHVjZXMgdGhlIG5leHQgc2VxdWVudGlhbCBzdGVwLFxuICAgICAgLy8gd2hpY2ggaXMgYSBibG9jayBhdCBhIGRlZXBlciBpbmRlbnQgbGV2ZWwuXG4gICAgICBpZiAodC50ZXh0ID09PSAndGhlbicpIHtcbiAgICAgICAgY29uc3QgdGhlbkluZGVudCA9IHQuaW5kZW50XG4gICAgICAgIHRoaXMuYWR2YW5jZSgpIC8vIGNvbnN1bWUgYHRoZW5gXG4gICAgICAgIGNvbnN0IG5leHQgPSB0aGlzLnBlZWsoKVxuICAgICAgICBpZiAobmV4dCAmJiBuZXh0LmluZGVudCA+IHRoZW5JbmRlbnQpIHtcbiAgICAgICAgICBjb25zdCBzdGVwID0gdGhpcy5wYXJzZUJsb2NrKHRoZW5JbmRlbnQpXG4gICAgICAgICAgc3RlcHMucHVzaChzdGVwKVxuICAgICAgICB9XG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIFx1MjUwMFx1MjUwMCBTZXF1ZW50aWFsIGNvbm5lY3RpdmU6IGB0aGVuIFhgIGFzIHByZWZpeCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICAgIC8vIGB0aGVuIGNhbGwgZm9vYCwgYHRoZW4gZW1pdCBiYXJgLCBldGMuXG4gICAgICAvLyBUaGUgYHRoZW5gIGlzIGp1c3QgYSB2aXN1YWwgc2VxdWVuY2VyIFx1MjAxNCB0aGUgcmVzdCBvZiB0aGUgbGluZSBpcyB0aGUgc3RlcC5cbiAgICAgIGlmICh0LnRleHQuc3RhcnRzV2l0aCgndGhlbiAnKSkge1xuICAgICAgICB0aGlzLmFkdmFuY2UoKVxuICAgICAgICBjb25zdCByZXN0ID0gdC50ZXh0LnNsaWNlKDUpLnRyaW0oKVxuICAgICAgICBjb25zdCBzdGVwID0gdGhpcy5wYXJzZVNpbmdsZUxpbmUocmVzdCwgdC5pbmRlbnQsIHQpXG4gICAgICAgIHN0ZXBzLnB1c2goc3RlcClcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cblxuICAgICAgLy8gXHUyNTAwXHUyNTAwIFJlZ3VsYXIgc3RhdGVtZW50IChwb3NzaWJseSBhIHBhcmFsbGVsIGdyb3VwKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICAgIGNvbnN0IHN0bXQgPSB0aGlzLnBhcnNlU3RhdGVtZW50T3JQYXJhbGxlbCh0LmluZGVudClcbiAgICAgIHN0ZXBzLnB1c2goc3RtdClcbiAgICB9XG5cbiAgICByZXR1cm4gdG9TZXF1ZW5jZU9yU2luZ2xlKHN0ZXBzKVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFBhcmFsbGVsIGdyb3VwIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIC8qKlxuICAgKiBQYXJzZXMgb25lIHN0YXRlbWVudCBvciBhIGdyb3VwIG9mIHBhcmFsbGVsIHN0YXRlbWVudHMgY29ubmVjdGVkIGJ5IGBhbmRgLlxuICAgKlxuICAgKiBMaW5lcyBlbmRpbmcgd2l0aCBhIHN0YW5kYWxvbmUgYGFuZGAgaW5kaWNhdGUgdGhhdCB0aGUgbmV4dCBsaW5lIHJ1bnNcbiAgICogY29uY3VycmVudGx5LiBBbGwgcGFyYWxsZWwgYnJhbmNoZXMgYXJlIHdyYXBwZWQgaW4gYSBQYXJhbGxlbE5vZGUuXG4gICAqXG4gICAqIGBhbmRgLWdyb3VwcyBvbmx5IGFwcGx5IHdpdGhpbiB0aGUgc2FtZSBpbmRlbnQgbGV2ZWwuIEEgZGVlcGVyLWluZGVudGVkXG4gICAqIGxpbmUgYWZ0ZXIgYGFuZGAgaXMgYW4gZXJyb3IgKHdvdWxkIGluZGljYXRlIGEgYmxvY2ssIGJ1dCBgYW5kYCBpc1xuICAgKiBhIGxpbmUtbGV2ZWwgY29ubmVjdG9yLCBub3QgYSBibG9jayBvcGVuZXIpLlxuICAgKi9cbiAgcHJpdmF0ZSBwYXJzZVN0YXRlbWVudE9yUGFyYWxsZWwoYmxvY2tJbmRlbnQ6IG51bWJlcik6IExFU05vZGUge1xuICAgIGNvbnN0IGJyYW5jaGVzOiBMRVNOb2RlW10gPSBbXVxuXG4gICAgd2hpbGUgKCF0aGlzLmF0RW5kKCkpIHtcbiAgICAgIGNvbnN0IHQgPSB0aGlzLnBlZWsoKSFcblxuICAgICAgLy8gU3RvcCBjb25kaXRpb25zIFx1MjAxNCBzYW1lIGFzIHBhcnNlQmxvY2snc1xuICAgICAgaWYgKHQuaW5kZW50IDwgYmxvY2tJbmRlbnQpIGJyZWFrXG4gICAgICBpZiAodC5pbmRlbnQgPiBibG9ja0luZGVudCkgYnJlYWsgICAvLyBzaG91bGRuJ3QgaGFwcGVuIGhlcmUsIHNhZmV0eSBndWFyZFxuICAgICAgaWYgKEJMT0NLX1RFUk1JTkFUT1JTLmhhcyh0LnRleHQpKSBicmVha1xuICAgICAgaWYgKFRSWV9DTEFVU0VfS0VZV09SRFMuaGFzKHQudGV4dCkpIGJyZWFrXG4gICAgICBpZiAodC50ZXh0ID09PSAndGhlbicgfHwgdC50ZXh0LnN0YXJ0c1dpdGgoJ3RoZW4gJykpIGJyZWFrXG5cbiAgICAgIGNvbnN0IGhhc0FuZCA9IGVuZHNXaXRoQW5kKHQudGV4dClcbiAgICAgIGNvbnN0IGxpbmVUZXh0ID0gaGFzQW5kID8gc3RyaXBUcmFpbGluZ0FuZCh0LnRleHQpIDogdC50ZXh0XG5cbiAgICAgIHRoaXMuYWR2YW5jZSgpXG5cbiAgICAgIGNvbnN0IHN0bXQgPSB0aGlzLnBhcnNlU2luZ2xlTGluZShsaW5lVGV4dCwgdC5pbmRlbnQsIHQpXG4gICAgICBicmFuY2hlcy5wdXNoKHN0bXQpXG5cbiAgICAgIGlmICghaGFzQW5kKSBicmVha1xuICAgIH1cblxuICAgIGlmIChicmFuY2hlcy5sZW5ndGggPT09IDApIHJldHVybiBleHByKCcnKVxuICAgIGlmIChicmFuY2hlcy5sZW5ndGggPT09IDEpIHJldHVybiBicmFuY2hlc1swXSFcbiAgICByZXR1cm4geyB0eXBlOiAncGFyYWxsZWwnLCBicmFuY2hlcyB9IHNhdGlzZmllcyBQYXJhbGxlbE5vZGVcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBTaW5nbGUtbGluZSBkaXNwYXRjaCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKipcbiAgICogUGFyc2VzIGEgc2luZ2xlIHN0YXRlbWVudCBmcm9tIGl0cyB0ZXh0IGNvbnRlbnQuXG4gICAqIFRoZSB0ZXh0IGhhcyBhbHJlYWR5IGhhZCBgdGhlbiBgIHByZWZpeCBhbmQgdHJhaWxpbmcgYCBhbmRgIHN0cmlwcGVkLlxuICAgKlxuICAgKiBEaXNwYXRjaCBvcmRlciBtYXR0ZXJzOiBtb3JlIHNwZWNpZmljIHBhdHRlcm5zIG11c3QgY29tZSBiZWZvcmUgZ2VuZXJhbCBvbmVzLlxuICAgKi9cbiAgcHJpdmF0ZSBwYXJzZVNpbmdsZUxpbmUodGV4dDogc3RyaW5nLCBpbmRlbnQ6IG51bWJlciwgdG9rZW46IFRva2VuKTogTEVTTm9kZSB7XG4gICAgY29uc3QgZmlyc3QgPSBmaXJzdFdvcmQodGV4dClcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBCbG9jayBjb25zdHJ1Y3RzIChjb25zdW1lIG11bHRpcGxlIGZvbGxvd2luZyB0b2tlbnMpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGlmIChmaXJzdCA9PT0gJ21hdGNoJykgcmV0dXJuIHRoaXMucGFyc2VNYXRjaCh0ZXh0LCBpbmRlbnQsIHRva2VuKVxuICAgIGlmIChmaXJzdCA9PT0gJ3RyeScpICAgcmV0dXJuIHRoaXMucGFyc2VUcnkoaW5kZW50LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBTaW1wbGUgc3RhdGVtZW50IGRpc3BhdGNoIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGlmIChmaXJzdCA9PT0gJ3NldCcpICAgICAgIHJldHVybiB0aGlzLnBhcnNlU2V0KHRleHQsIHRva2VuKVxuICAgIGlmIChmaXJzdCA9PT0gJ2VtaXQnKSAgICAgIHJldHVybiB0aGlzLnBhcnNlRW1pdCh0ZXh0LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICdicm9hZGNhc3QnKSByZXR1cm4gdGhpcy5wYXJzZUJyb2FkY2FzdCh0ZXh0LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICdjYWxsJykgICAgICByZXR1cm4gdGhpcy5wYXJzZUNhbGwodGV4dCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAnd2FpdCcpICAgICAgcmV0dXJuIHRoaXMucGFyc2VXYWl0KHRleHQsIHRva2VuKVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIEJhcmUgRGF0YXN0YXIgYWN0aW9uOiBgQGdldCAnL3VybCcgW2FyZ3NdYCAoZmlyZS1hbmQtYXdhaXQsIG5vIGJpbmQpIFx1MjUwMFx1MjUwMFxuICAgIGlmIChmaXJzdC5zdGFydHNXaXRoKCdAJykpICByZXR1cm4gdGhpcy5wYXJzZUFjdGlvbih0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBBc3luYyBiaW5kOiBgbmFtZSA8LSBAdmVyYiAndXJsJyBbYXJnc11gIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGlmICh0ZXh0LmluY2x1ZGVzKCcgPC0gJykpIHJldHVybiB0aGlzLnBhcnNlQmluZCh0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBBbmltYXRpb24gcHJpbWl0aXZlIChidWlsdC1pbikgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgaWYgKEFOSU1BVElPTl9QUklNSVRJVkVTLmhhcyhmaXJzdCkpIHJldHVybiB0aGlzLnBhcnNlQW5pbWF0aW9uKHRleHQsIHRva2VuKVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIEFuaW1hdGlvbiBwcmltaXRpdmUgKHVzZXJsYW5kIG1vZHVsZSkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgLy8gQW55IHdvcmQgZm9sbG93ZWQgYnkgYSBDU1Mgc2VsZWN0b3IgbG9va3MgbGlrZSBhbiBhbmltYXRpb24gY2FsbC5cbiAgICAvLyBDb3ZlcnMgYm90aCBoeXBoZW5hdGVkIG5hbWVzIChzY3JvbGwtcmV2ZWFsLCBzcHJpbmctaW4pIGFuZCBiYXJlIG5hbWVzIChzaGFrZSkuXG4gICAgaWYgKGxvb2tzTGlrZUFuaW1hdGlvbkNhbGwodGV4dCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnBhcnNlQW5pbWF0aW9uKHRleHQsIHRva2VuKVxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBVbmtub3duOiBzdG9yZSBhcyByYXcgZXhwcmVzc2lvbiAoZXNjYXBlIGhhdGNoIC8gZnV0dXJlIGtleXdvcmRzKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBVbmtub3duIHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICByZXR1cm4gZXhwcih0ZXh0KVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIE1hdGNoIGJsb2NrIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgcGFyc2VNYXRjaCh0ZXh0OiBzdHJpbmcsIGluZGVudDogbnVtYmVyLCB0b2tlbjogVG9rZW4pOiBNYXRjaE5vZGUge1xuICAgIC8vIGB0ZXh0YCBpcyBlLmcuIFwibWF0Y2ggcmVzcG9uc2VcIiBvciBcIm1hdGNoICRmZWVkU3RhdGVcIlxuICAgIGNvbnN0IHN1YmplY3RSYXcgPSB0ZXh0LnNsaWNlKCdtYXRjaCcubGVuZ3RoKS50cmltKClcbiAgICBjb25zdCBzdWJqZWN0OiBFeHByTm9kZSA9IGV4cHIoc3ViamVjdFJhdylcbiAgICBjb25zdCBhcm1zOiBNYXRjaEFybVtdID0gW11cblxuICAgIHdoaWxlICghdGhpcy5hdEVuZCgpKSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy5wZWVrKCkhXG5cbiAgICAgIC8vIC9tYXRjaCB0ZXJtaW5hdGVzIHRoZSBibG9ja1xuICAgICAgaWYgKHQudGV4dCA9PT0gJy9tYXRjaCcpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgLy8gT25seSBjb25zdW1lIGFybSBsaW5lcyBhdCB0aGUgZXhwZWN0ZWQgYXJtIGluZGVudCAoaW5kZW50ICsgMilcbiAgICAgIGlmICh0LmluZGVudCA8PSBpbmRlbnQpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gVW5jbG9zZWQgbWF0Y2ggYmxvY2sgXHUyMDE0IG1pc3NpbmcgL21hdGNoYCwgdG9rZW4pXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIC8vIFBhcnNlIGFuIGFybTogYFtwYXR0ZXJuXSAtPmAgb3IgYFtwYXR0ZXJuXSAtPiBib2R5YFxuICAgICAgaWYgKHQudGV4dC5zdGFydHNXaXRoKCdbJykpIHtcbiAgICAgICAgYXJtcy5wdXNoKHRoaXMucGFyc2VNYXRjaEFybSh0LmluZGVudCwgdCkpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIFNraXAgdW5leHBlY3RlZCBsaW5lcyBpbnNpZGUgbWF0Y2hcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIFVuZXhwZWN0ZWQgdG9rZW4gaW5zaWRlIG1hdGNoIGJsb2NrOiAke0pTT04uc3RyaW5naWZ5KHQudGV4dCl9YCwgdClcbiAgICAgIHRoaXMuYWR2YW5jZSgpXG4gICAgfVxuXG4gICAgcmV0dXJuIHsgdHlwZTogJ21hdGNoJywgc3ViamVjdCwgYXJtcyB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlTWF0Y2hBcm0oYXJtSW5kZW50OiBudW1iZXIsIHRva2VuOiBUb2tlbik6IE1hdGNoQXJtIHtcbiAgICBjb25zdCB0ID0gdGhpcy5hZHZhbmNlKCkgLy8gY29uc3VtZSB0aGUgYXJtIGxpbmVcblxuICAgIC8vIFNwbGl0IG9uIGAgLT5gIHRvIHNlcGFyYXRlIHBhdHRlcm4gZnJvbSBib2R5XG4gICAgY29uc3QgYXJyb3dJZHggPSB0LnRleHQuaW5kZXhPZignIC0+JylcbiAgICBpZiAoYXJyb3dJZHggPT09IC0xKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYXRjaCBhcm0gbWlzc2luZyAnLT4nOiAke0pTT04uc3RyaW5naWZ5KHQudGV4dCl9YCwgdClcbiAgICAgIHJldHVybiB7IHBhdHRlcm5zOiBbeyBraW5kOiAnd2lsZGNhcmQnIH1dLCBib2R5OiBleHByKCcnKSB9XG4gICAgfVxuXG4gICAgY29uc3QgcGF0dGVyblJhdyA9IHQudGV4dC5zbGljZSgwLCBhcnJvd0lkeCkudHJpbSgpXG4gICAgY29uc3QgYWZ0ZXJBcnJvdyA9IHQudGV4dC5zbGljZShhcnJvd0lkeCArIDMpLnRyaW0oKSAgLy8gZXZlcnl0aGluZyBhZnRlciBgLT5gXG5cbiAgICBjb25zdCBwYXR0ZXJucyA9IHBhcnNlUGF0dGVybnMocGF0dGVyblJhdylcblxuICAgIGxldCBib2R5OiBMRVNOb2RlXG4gICAgaWYgKGFmdGVyQXJyb3cubGVuZ3RoID4gMCkge1xuICAgICAgLy8gSW5saW5lIGFybTogYFsnZXJyb3InXSAtPiBzZXQgJGZlZWRTdGF0ZSB0byAnZXJyb3InYFxuICAgICAgYm9keSA9IHRoaXMucGFyc2VTaW5nbGVMaW5lKGFmdGVyQXJyb3csIGFybUluZGVudCwgdG9rZW4pXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE11bHRpLWxpbmUgYXJtOiBib2R5IGlzIHRoZSBkZWVwZXItaW5kZW50ZWQgYmxvY2tcbiAgICAgIGJvZHkgPSB0aGlzLnBhcnNlQmxvY2soYXJtSW5kZW50KVxuICAgIH1cblxuICAgIHJldHVybiB7IHBhdHRlcm5zLCBib2R5IH1cbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBUcnkgYmxvY2sgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBwYXJzZVRyeShpbmRlbnQ6IG51bWJlciwgdG9rZW46IFRva2VuKTogVHJ5Tm9kZSB7XG4gICAgLy8gTm90ZTogdGhlIGB0cnlgIHRva2VuIHdhcyBhbHJlYWR5IGNvbnN1bWVkIGJ5IHRoZSBjYWxsaW5nIHBhcnNlU3RhdGVtZW50T3JQYXJhbGxlbC5cbiAgICAvLyBEbyBOT1QgY2FsbCB0aGlzLmFkdmFuY2UoKSBoZXJlIFx1MjAxNCB0aGF0IHdvdWxkIHNraXAgdGhlIGZpcnN0IGJvZHkgbGluZS5cblxuICAgIC8vIFBhcnNlIGJvZHkgXHUyMDE0IHN0b3BzIGF0IHJlc2N1ZS9hZnRlcndhcmRzLy90cnkgYXQgdGhlIHNhbWUgaW5kZW50IGxldmVsXG4gICAgY29uc3QgYm9keSA9IHRoaXMucGFyc2VCbG9jayhpbmRlbnQpXG5cbiAgICBsZXQgcmVzY3VlOiBMRVNOb2RlIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG4gICAgbGV0IGFmdGVyd2FyZHM6IExFU05vZGUgfCB1bmRlZmluZWQgPSB1bmRlZmluZWRcblxuICAgIC8vIHJlc2N1ZSBjbGF1c2UgKG9wdGlvbmFsKVxuICAgIGlmICh0aGlzLnBlZWsoKT8udGV4dCA9PT0gJ3Jlc2N1ZScgJiYgdGhpcy5wZWVrKCk/LmluZGVudCA9PT0gaW5kZW50KSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKSAvLyBjb25zdW1lIGByZXNjdWVgXG4gICAgICByZXNjdWUgPSB0aGlzLnBhcnNlQmxvY2soaW5kZW50KVxuICAgIH1cblxuICAgIC8vIGFmdGVyd2FyZHMgY2xhdXNlIChvcHRpb25hbClcbiAgICBpZiAodGhpcy5wZWVrKCk/LnRleHQgPT09ICdhZnRlcndhcmRzJyAmJiB0aGlzLnBlZWsoKT8uaW5kZW50ID09PSBpbmRlbnQpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpIC8vIGNvbnN1bWUgYGFmdGVyd2FyZHNgXG4gICAgICBhZnRlcndhcmRzID0gdGhpcy5wYXJzZUJsb2NrKGluZGVudClcbiAgICB9XG5cbiAgICAvLyBDb25zdW1lIC90cnlcbiAgICBpZiAodGhpcy5wZWVrKCk/LnRleHQgPT09ICcvdHJ5Jykge1xuICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gVW5jbG9zZWQgdHJ5IGJsb2NrIFx1MjAxNCBtaXNzaW5nIC90cnlgLCB0b2tlbilcbiAgICB9XG5cbiAgICBjb25zdCB0cnlOb2RlOiBUcnlOb2RlID0geyB0eXBlOiAndHJ5JywgYm9keSB9XG4gICAgaWYgKHJlc2N1ZSAgICAhPT0gdW5kZWZpbmVkKSB0cnlOb2RlLnJlc2N1ZSAgICAgPSByZXNjdWVcbiAgICBpZiAoYWZ0ZXJ3YXJkcyAhPT0gdW5kZWZpbmVkKSB0cnlOb2RlLmFmdGVyd2FyZHMgPSBhZnRlcndhcmRzXG4gICAgcmV0dXJuIHRyeU5vZGVcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBTaW1wbGUgc3RhdGVtZW50IHBhcnNlcnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBwYXJzZVNldCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IFNldE5vZGUge1xuICAgIC8vIGBzZXQgJHNpZ25hbCB0byBleHByYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9ec2V0XFxzK1xcJChcXHcrKVxccyt0b1xccysoLispJC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgc2V0IHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7IHR5cGU6ICdzZXQnLCBzaWduYWw6ICc/PycsIHZhbHVlOiBleHByKHRleHQpIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdzZXQnLFxuICAgICAgc2lnbmFsOiBtWzFdISxcbiAgICAgIHZhbHVlOiBleHByKG1bMl0hLnRyaW0oKSksXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUVtaXQodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBFbWl0Tm9kZSB7XG4gICAgLy8gYGVtaXQgZXZlbnQ6bmFtZSBbcGF5bG9hZCwgLi4uXWAgb3IgYGVtaXQgZXZlbnQ6bmFtZWBcbiAgICBjb25zdCB7IG5hbWUsIHBheWxvYWQgfSA9IHBhcnNlRXZlbnRMaW5lKHRleHQuc2xpY2UoJ2VtaXQnLmxlbmd0aCkudHJpbSgpLCB0b2tlbilcbiAgICByZXR1cm4geyB0eXBlOiAnZW1pdCcsIGV2ZW50OiBuYW1lLCBwYXlsb2FkIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VCcm9hZGNhc3QodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBCcm9hZGNhc3ROb2RlIHtcbiAgICBjb25zdCB7IG5hbWUsIHBheWxvYWQgfSA9IHBhcnNlRXZlbnRMaW5lKHRleHQuc2xpY2UoJ2Jyb2FkY2FzdCcubGVuZ3RoKS50cmltKCksIHRva2VuKVxuICAgIHJldHVybiB7IHR5cGU6ICdicm9hZGNhc3QnLCBldmVudDogbmFtZSwgcGF5bG9hZCB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQ2FsbCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IENhbGxOb2RlIHtcbiAgICAvLyBgY2FsbCBjb21tYW5kOm5hbWUgW2FyZzogdmFsdWUsIC4uLl1gIG9yIGBjYWxsIGNvbW1hbmQ6bmFtZWBcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXmNhbGxcXHMrKFteXFxzXFxbXSspXFxzKig/OlxcWyguKylcXF0pPyQvKVxuICAgIGlmICghbSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gTWFsZm9ybWVkIGNhbGwgc3RhdGVtZW50OiAke0pTT04uc3RyaW5naWZ5KHRleHQpfWAsIHRva2VuKVxuICAgICAgcmV0dXJuIHsgdHlwZTogJ2NhbGwnLCBjb21tYW5kOiAnPz8nLCBhcmdzOiB7fSB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnY2FsbCcsXG4gICAgICBjb21tYW5kOiBtWzFdISxcbiAgICAgIGFyZ3M6IHBhcnNlQXJnTGlzdChtWzJdID8/ICcnKSxcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlV2FpdCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IFdhaXROb2RlIHtcbiAgICAvLyBgd2FpdCAzMDBtc2Agb3IgYHdhaXQgKGF0dGVtcHQgKyAxKSAqIDUwMG1zYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9ed2FpdFxccysoLis/KW1zJC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgd2FpdCBzdGF0ZW1lbnQ6ICR7SlNPTi5zdHJpbmdpZnkodGV4dCl9YCwgdG9rZW4pXG4gICAgICByZXR1cm4geyB0eXBlOiAnd2FpdCcsIG1zOiAwIH1cbiAgICB9XG4gICAgY29uc3QgbXNFeHByID0gbVsxXSEudHJpbSgpXG4gICAgLy8gU2ltcGxlIGxpdGVyYWxcbiAgICBjb25zdCBsaXRlcmFsID0gTnVtYmVyKG1zRXhwcilcbiAgICBpZiAoIU51bWJlci5pc05hTihsaXRlcmFsKSkgcmV0dXJuIHsgdHlwZTogJ3dhaXQnLCBtczogbGl0ZXJhbCB9XG4gICAgLy8gRXhwcmVzc2lvbiBcdTIwMTQgc3RvcmUgYXMgMCB3aXRoIHRoZSBleHByZXNzaW9uIGFzIGEgY29tbWVudCAoZXhlY3V0b3Igd2lsbCBldmFsKVxuICAgIC8vIFBoYXNlIDMgd2lsbCBoYW5kbGUgZHluYW1pYyBkdXJhdGlvbnMgcHJvcGVybHlcbiAgICByZXR1cm4geyB0eXBlOiAnd2FpdCcsIG1zOiAwIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VCaW5kKHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogQmluZE5vZGUge1xuICAgIC8vIGBuYW1lIDwtIEB2ZXJiICd1cmwnIFthcmdzXWBcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXihcXHcrKVxccys8LVxccytAKFxcdyspXFxzKycoW14nXSspJ1xccyooPzpcXFsoLispXFxdKT8kLylcbiAgICBpZiAoIW0pIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIE1hbGZvcm1lZCBiaW5kIHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6ICdiaW5kJyxcbiAgICAgICAgbmFtZTogJz8/JyxcbiAgICAgICAgYWN0aW9uOiB7IHR5cGU6ICdhY3Rpb24nLCB2ZXJiOiAnZ2V0JywgdXJsOiAnJywgYXJnczoge30gfSxcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgYWN0aW9uOiBBY3Rpb25Ob2RlID0ge1xuICAgICAgdHlwZTogJ2FjdGlvbicsXG4gICAgICB2ZXJiOiBtWzJdIS50b0xvd2VyQ2FzZSgpLFxuICAgICAgdXJsOiBtWzNdISxcbiAgICAgIGFyZ3M6IHBhcnNlQXJnTGlzdChtWzRdID8/ICcnKSxcbiAgICB9XG4gICAgcmV0dXJuIHsgdHlwZTogJ2JpbmQnLCBuYW1lOiBtWzFdISwgYWN0aW9uIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VBY3Rpb24odGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBBY3Rpb25Ob2RlIHtcbiAgICAvLyBgQGdldCAnL3VybCcgW2FyZ3NdYCBvciBgQHBvc3QgJy91cmwnIFthcmdzXWBcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXkAoXFx3KylcXHMrJyhbXiddKyknXFxzKig/OlxcWyguKylcXF0pPyQvKVxuICAgIGlmICghbSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gTWFsZm9ybWVkIGFjdGlvbjogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7IHR5cGU6ICdhY3Rpb24nLCB2ZXJiOiAnZ2V0JywgdXJsOiAnJywgYXJnczoge30gfVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogJ2FjdGlvbicsXG4gICAgICB2ZXJiOiBtWzFdIS50b0xvd2VyQ2FzZSgpLFxuICAgICAgdXJsOiBtWzJdISxcbiAgICAgIGFyZ3M6IHBhcnNlQXJnTGlzdChtWzNdID8/ICcnKSxcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQW5pbWF0aW9uKHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogQW5pbWF0aW9uTm9kZSB7XG4gICAgLy8gYHByaW1pdGl2ZSBzZWxlY3RvciBkdXJhdGlvbiBlYXNpbmcgW29wdGlvbnNdYFxuICAgIC8vIEV4YW1wbGVzOlxuICAgIC8vICAgc3RhZ2dlci1lbnRlciAuZmVlZC1pdGVtICAxMjBtcyBlYXNlLW91dCBbZ2FwOiA0MG1zICBmcm9tOiByaWdodF1cbiAgICAvLyAgIHB1bHNlIC5mZWVkLWl0ZW0uaXMtdXBkYXRlZCAgMzAwbXMgZWFzZS1pbi1vdXRcbiAgICAvLyAgIHNsaWRlLW91dCBbZGF0YS1pdGVtLWlkOiBpZF0gIDE1MG1zIGVhc2UtaW4gW3RvOiByaWdodF1cblxuICAgIC8vIFRva2VuaXplOiBzcGxpdCBvbiB3aGl0ZXNwYWNlIGJ1dCBwcmVzZXJ2ZSBbLi4uXSBncm91cHNcbiAgICBjb25zdCBwYXJ0cyA9IHNwbGl0QW5pbWF0aW9uTGluZSh0ZXh0KVxuXG4gICAgY29uc3QgcHJpbWl0aXZlID0gcGFydHNbMF0gPz8gJydcbiAgICBjb25zdCBzZWxlY3RvciAgPSBwYXJ0c1sxXSA/PyAnJ1xuICAgIGNvbnN0IGR1cmF0aW9uU3RyID0gcGFydHNbMl0gPz8gJzBtcydcbiAgICBjb25zdCBlYXNpbmcgICAgPSBwYXJ0c1szXSA/PyAnZWFzZSdcbiAgICBjb25zdCBvcHRpb25zU3RyID0gcGFydHNbNF0gPz8gJycgIC8vIG1heSBiZSBhYnNlbnRcblxuICAgIGNvbnN0IGR1cmF0aW9uTXMgPSBwYXJzZUludChkdXJhdGlvblN0ciwgMTApXG5cbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogJ2FuaW1hdGlvbicsXG4gICAgICBwcmltaXRpdmUsXG4gICAgICBzZWxlY3RvcixcbiAgICAgIGR1cmF0aW9uOiBOdW1iZXIuaXNOYU4oZHVyYXRpb25NcykgPyAwIDogZHVyYXRpb25NcyxcbiAgICAgIGVhc2luZyxcbiAgICAgIG9wdGlvbnM6IHBhcnNlQW5pbWF0aW9uT3B0aW9ucyhvcHRpb25zU3RyKSxcbiAgICB9XG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXR0ZXJuIHBhcnNpbmdcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFBhcnNlcyBhIHBhdHRlcm4gZ3JvdXAgbGlrZSBgW2l0ICAgb2sgICBdYCwgYFtuaWwgIGVycm9yXWAsIGBbX11gLFxuICogYFsnZXJyb3InXWAsIGBbMCB8IDEgfCAyXWAuXG4gKlxuICogUmV0dXJucyBhbiBhcnJheSBvZiBQYXR0ZXJuTm9kZSBcdTIwMTQgb25lIHBlciBlbGVtZW50IGluIHRoZSB0dXBsZSBwYXR0ZXJuLlxuICogRm9yIG9yLXBhdHRlcm5zIChgMCB8IDEgfCAyYCksIHJldHVybnMgYSBzaW5nbGUgT3JQYXR0ZXJuTm9kZS5cbiAqL1xuZnVuY3Rpb24gcGFyc2VQYXR0ZXJucyhyYXc6IHN0cmluZyk6IFBhdHRlcm5Ob2RlW10ge1xuICAvLyBTdHJpcCBvdXRlciBicmFja2V0c1xuICBjb25zdCBpbm5lciA9IHJhdy5yZXBsYWNlKC9eXFxbfFxcXSQvZywgJycpLnRyaW0oKVxuXG4gIC8vIENoZWNrIGZvciBvci1wYXR0ZXJuOiBjb250YWlucyBgIHwgYFxuICBpZiAoaW5uZXIuaW5jbHVkZXMoJyB8ICcpIHx8IGlubmVyLmluY2x1ZGVzKCd8JykpIHtcbiAgICBjb25zdCBhbHRlcm5hdGl2ZXMgPSBpbm5lci5zcGxpdCgvXFxzKlxcfFxccyovKS5tYXAocCA9PiBwYXJzZVNpbmdsZVBhdHRlcm4ocC50cmltKCkpKVxuICAgIHJldHVybiBbeyBraW5kOiAnb3InLCBwYXR0ZXJuczogYWx0ZXJuYXRpdmVzIH1dXG4gIH1cblxuICAvLyBUdXBsZSBwYXR0ZXJuOiBzcGFjZS1zZXBhcmF0ZWQgZWxlbWVudHNcbiAgLy8gVXNlIGEgY3VzdG9tIHNwbGl0IHRvIGhhbmRsZSBtdWx0aXBsZSBzcGFjZXMgKGFsaWdubWVudCBwYWRkaW5nKVxuICByZXR1cm4gaW5uZXIudHJpbSgpLnNwbGl0KC9cXHN7Mix9fFxccyg/PVxcUykvKS5maWx0ZXIocyA9PiBzLnRyaW0oKSlcbiAgICAubWFwKHAgPT4gcGFyc2VTaW5nbGVQYXR0ZXJuKHAudHJpbSgpKSlcbn1cblxuZnVuY3Rpb24gcGFyc2VTaW5nbGVQYXR0ZXJuKHM6IHN0cmluZyk6IFBhdHRlcm5Ob2RlIHtcbiAgaWYgKHMgPT09ICdfJykgICByZXR1cm4geyBraW5kOiAnd2lsZGNhcmQnIH1cbiAgaWYgKHMgPT09ICduaWwnKSByZXR1cm4geyBraW5kOiAnbGl0ZXJhbCcsIHZhbHVlOiBudWxsIH1cblxuICAvLyBTdHJpbmcgbGl0ZXJhbDogJ3ZhbHVlJ1xuICBpZiAocy5zdGFydHNXaXRoKFwiJ1wiKSAmJiBzLmVuZHNXaXRoKFwiJ1wiKSkge1xuICAgIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IHMuc2xpY2UoMSwgLTEpIH1cbiAgfVxuXG4gIC8vIE51bWJlciBsaXRlcmFsXG4gIGNvbnN0IG4gPSBOdW1iZXIocylcbiAgaWYgKCFOdW1iZXIuaXNOYU4obikpIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IG4gfVxuXG4gIC8vIEJvb2xlYW5cbiAgaWYgKHMgPT09ICd0cnVlJykgIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IHRydWUgfVxuICBpZiAocyA9PT0gJ2ZhbHNlJykgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogZmFsc2UgfVxuXG4gIC8vIEV2ZXJ5dGhpbmcgZWxzZSBpcyBhIGJpbmRpbmcgKGNhcHR1cmVzIHRoZSB2YWx1ZSBmb3IgdXNlIGluIHRoZSBib2R5KVxuICByZXR1cm4geyBraW5kOiAnYmluZGluZycsIG5hbWU6IHMgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEFyZ3VtZW50IGxpc3QgcGFyc2luZ1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogUGFyc2VzIGBrZXk6IHZhbHVlICBrZXkyOiB2YWx1ZTJgIGZyb20gaW5zaWRlIGEgWy4uLl0gYXJndW1lbnQgYmxvY2suXG4gKiBWYWx1ZXMgYXJlIHN0b3JlZCBhcyBFeHByTm9kZSAoZXZhbHVhdGVkIGF0IHJ1bnRpbWUpLlxuICovXG5mdW5jdGlvbiBwYXJzZUFyZ0xpc3QocmF3OiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCBFeHByTm9kZT4ge1xuICBpZiAoIXJhdy50cmltKCkpIHJldHVybiB7fVxuXG4gIGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgRXhwck5vZGU+ID0ge31cblxuICAvLyBTcGxpdCBvbiBgICBgIChkb3VibGUtc3BhY2UgdXNlZCBhcyBzZXBhcmF0b3IgaW4gTEVTIHN0eWxlKVxuICAvLyBidXQgYWxzbyBoYW5kbGUgc2luZ2xlIGAgIGtleTogdmFsdWVgIGVudHJpZXNcbiAgLy8gU2ltcGxlIHJlZ2V4OiBgd29yZDogcmVzdF91bnRpbF9uZXh0X3dvcmQ6YFxuICBjb25zdCBwYWlycyA9IHJhdy50cmltKCkuc3BsaXQoLyg/PD1cXFMpXFxzezIsfSg/PVxcdykvKVxuICBmb3IgKGNvbnN0IHBhaXIgb2YgcGFpcnMpIHtcbiAgICBjb25zdCBjb2xvbklkeCA9IHBhaXIuaW5kZXhPZignOicpXG4gICAgaWYgKGNvbG9uSWR4ID09PSAtMSkgY29udGludWVcbiAgICBjb25zdCBrZXkgICA9IHBhaXIuc2xpY2UoMCwgY29sb25JZHgpLnRyaW0oKVxuICAgIGNvbnN0IHZhbHVlID0gcGFpci5zbGljZShjb2xvbklkeCArIDEpLnRyaW0oKVxuICAgIGlmIChrZXkpIHJlc3VsdFtrZXldID0gZXhwcih2YWx1ZSlcbiAgfVxuXG4gIHJldHVybiByZXN1bHRcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBFdmVudCBsaW5lIHBhcnNpbmc6IGBldmVudDpuYW1lIFtwYXlsb2FkLi4uXWBcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5mdW5jdGlvbiBwYXJzZUV2ZW50TGluZShcbiAgcmF3OiBzdHJpbmcsXG4gIHRva2VuOiBUb2tlblxuKTogeyBuYW1lOiBzdHJpbmc7IHBheWxvYWQ6IEV4cHJOb2RlW10gfSB7XG4gIC8vIGBmZWVkOmRhdGEtcmVhZHlgIG9yIGBmZWVkOmRhdGEtcmVhZHkgWyRmZWVkSXRlbXNdYCBvciBgZmVlZDplcnJvciBbJGVycm9yXWBcbiAgY29uc3QgYnJhY2tldElkeCA9IHJhdy5pbmRleE9mKCdbJylcbiAgaWYgKGJyYWNrZXRJZHggPT09IC0xKSB7XG4gICAgcmV0dXJuIHsgbmFtZTogcmF3LnRyaW0oKSwgcGF5bG9hZDogW10gfVxuICB9XG4gIGNvbnN0IG5hbWUgPSByYXcuc2xpY2UoMCwgYnJhY2tldElkeCkudHJpbSgpXG4gIGNvbnN0IHBheWxvYWRSYXcgPSByYXcuc2xpY2UoYnJhY2tldElkeCArIDEsIHJhdy5sYXN0SW5kZXhPZignXScpKS50cmltKClcblxuICAvLyBQYXlsb2FkIGVsZW1lbnRzIGFyZSBjb21tYSBvciBzcGFjZSBzZXBhcmF0ZWQgZXhwcmVzc2lvbnNcbiAgY29uc3QgcGF5bG9hZDogRXhwck5vZGVbXSA9IHBheWxvYWRSYXdcbiAgICA/IHBheWxvYWRSYXcuc3BsaXQoLyxcXHMqfFxcc3syLH0vKS5tYXAocyA9PiBleHByKHMudHJpbSgpKSkuZmlsdGVyKGUgPT4gZS5yYXcpXG4gICAgOiBbXVxuXG4gIHJldHVybiB7IG5hbWUsIHBheWxvYWQgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEFuaW1hdGlvbiBsaW5lIHBhcnNpbmdcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFNwbGl0cyBhbiBhbmltYXRpb24gbGluZSBpbnRvIGl0cyBzdHJ1Y3R1cmFsIHBhcnRzLCBwcmVzZXJ2aW5nIFsuLi5dIGdyb3Vwcy5cbiAqXG4gKiBJbnB1dDogIGBzdGFnZ2VyLWVudGVyIC5mZWVkLWl0ZW0gIDEyMG1zIGVhc2Utb3V0IFtnYXA6IDQwbXMgIGZyb206IHJpZ2h0XWBcbiAqIE91dHB1dDogWydzdGFnZ2VyLWVudGVyJywgJy5mZWVkLWl0ZW0nLCAnMTIwbXMnLCAnZWFzZS1vdXQnLCAnW2dhcDogNDBtcyAgZnJvbTogcmlnaHRdJ11cbiAqL1xuZnVuY3Rpb24gc3BsaXRBbmltYXRpb25MaW5lKHRleHQ6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW11cbiAgbGV0IGN1cnJlbnQgPSAnJ1xuICBsZXQgaW5CcmFja2V0ID0gMFxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgdGV4dC5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGNoID0gdGV4dFtpXSFcbiAgICBpZiAoY2ggPT09ICdbJykge1xuICAgICAgaW5CcmFja2V0KytcbiAgICAgIGN1cnJlbnQgKz0gY2hcbiAgICB9IGVsc2UgaWYgKGNoID09PSAnXScpIHtcbiAgICAgIGluQnJhY2tldC0tXG4gICAgICBjdXJyZW50ICs9IGNoXG4gICAgfSBlbHNlIGlmIChjaCA9PT0gJyAnICYmIGluQnJhY2tldCA9PT0gMCkge1xuICAgICAgaWYgKGN1cnJlbnQudHJpbSgpKSBwYXJ0cy5wdXNoKGN1cnJlbnQudHJpbSgpKVxuICAgICAgY3VycmVudCA9ICcnXG4gICAgfSBlbHNlIHtcbiAgICAgIGN1cnJlbnQgKz0gY2hcbiAgICB9XG4gIH1cbiAgaWYgKGN1cnJlbnQudHJpbSgpKSBwYXJ0cy5wdXNoKGN1cnJlbnQudHJpbSgpKVxuICByZXR1cm4gcGFydHNcbn1cblxuLyoqXG4gKiBQYXJzZXMgYW5pbWF0aW9uIG9wdGlvbnMgZnJvbSBhIGBba2V5OiB2YWx1ZSAga2V5MjogdmFsdWUyXWAgc3RyaW5nLlxuICogVGhlIG91dGVyIGJyYWNrZXRzIGFyZSBpbmNsdWRlZCBpbiB0aGUgaW5wdXQuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlQW5pbWF0aW9uT3B0aW9ucyhyYXc6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIEV4cHJOb2RlPiB7XG4gIGlmICghcmF3LnRyaW0oKSkgcmV0dXJuIHt9XG4gIC8vIFN0cmlwIG91dGVyIGJyYWNrZXRzXG4gIGNvbnN0IGlubmVyID0gcmF3LnJlcGxhY2UoL15cXFt8XFxdJC9nLCAnJykudHJpbSgpXG4gIHJldHVybiBwYXJzZUFyZ0xpc3QoaW5uZXIpXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gVXRpbGl0aWVzXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gZXhwcihyYXc6IHN0cmluZyk6IEV4cHJOb2RlIHtcbiAgcmV0dXJuIHsgdHlwZTogJ2V4cHInLCByYXcgfVxufVxuXG5mdW5jdGlvbiBmaXJzdFdvcmQodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHRleHQuc3BsaXQoL1xccysvKVswXSA/PyAnJ1xufVxuXG4vKipcbiAqIFJldHVybnMgdHJ1ZSBpZiBhIHN0YXRlbWVudCBsb29rcyBsaWtlIGFuIGFuaW1hdGlvbiBjYWxsOlxuICogICA8d29yZC13aXRoLWh5cGhlbj4gIDxzZWxlY3RvcnxkdXJhdGlvbj4gIC4uLlxuICpcbiAqIFRoaXMgYWxsb3dzIHVzZXJsYW5kIG1vZHVsZSBwcmltaXRpdmVzIChzY3JvbGwtcmV2ZWFsLCBzcHJpbmctaW4sIGV0Yy4pXG4gKiB0byBiZSBwYXJzZWQgYXMgQW5pbWF0aW9uTm9kZSB3aXRob3V0IGJlaW5nIGxpc3RlZCBpbiBBTklNQVRJT05fUFJJTUlUSVZFUy5cbiAqIFRoZSBleGVjdXRvciB0aGVuIGRpc3BhdGNoZXMgdGhlbSB0aHJvdWdoIHRoZSBNb2R1bGVSZWdpc3RyeS5cbiAqL1xuZnVuY3Rpb24gbG9va3NMaWtlQW5pbWF0aW9uQ2FsbCh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgY29uc3QgcGFydHMgPSB0ZXh0LnRyaW0oKS5zcGxpdCgvXFxzKy8pXG4gIGlmIChwYXJ0cy5sZW5ndGggPCAyKSByZXR1cm4gZmFsc2VcbiAgY29uc3Qgc2Vjb25kID0gcGFydHNbMV0gPz8gJydcbiAgLy8gU2Vjb25kIHRva2VuIGlzIGEgQ1NTIHNlbGVjdG9yICguY2xhc3MsICNpZCwgW2F0dHJdLCB0YWduYW1lKSBvciBhIGR1cmF0aW9uIChObXMpXG4gIHJldHVybiAvXlsuI1xcW10vLnRlc3Qoc2Vjb25kKSB8fCAgLy8gQ1NTIHNlbGVjdG9yXG4gICAgICAgICAvXlxcZCttcyQvLnRlc3Qoc2Vjb25kKSAgICAgIC8vIGJhcmUgZHVyYXRpb24gKHVudXN1YWwgYnV0IHZhbGlkKVxufVxuXG5mdW5jdGlvbiB0b1NlcXVlbmNlT3JTaW5nbGUoc3RlcHM6IExFU05vZGVbXSk6IExFU05vZGUge1xuICBpZiAoc3RlcHMubGVuZ3RoID09PSAwKSByZXR1cm4gZXhwcignJylcbiAgaWYgKHN0ZXBzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIHN0ZXBzWzBdIVxuICByZXR1cm4geyB0eXBlOiAnc2VxdWVuY2UnLCBzdGVwcyB9IHNhdGlzZmllcyBTZXF1ZW5jZU5vZGVcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXJzZSBlcnJvclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBjbGFzcyBMRVNQYXJzZUVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcsIHB1YmxpYyByZWFkb25seSB0b2tlbjogVG9rZW4gfCB1bmRlZmluZWQpIHtcbiAgICBjb25zdCBsb2MgPSB0b2tlbiA/IGAgKGxpbmUgJHt0b2tlbi5saW5lTnVtfTogJHtKU09OLnN0cmluZ2lmeSh0b2tlbi50ZXh0KX0pYCA6ICcnXG4gICAgc3VwZXIoYFtMRVM6cGFyc2VyXSAke21lc3NhZ2V9JHtsb2N9YClcbiAgICB0aGlzLm5hbWUgPSAnTEVTUGFyc2VFcnJvcidcbiAgfVxufVxuIiwgImltcG9ydCB7IHN0cmlwQm9keSB9IGZyb20gJy4vc3RyaXBCb2R5LmpzJ1xuaW1wb3J0IHsgdG9rZW5pemUgfSBmcm9tICcuL3Rva2VuaXplci5qcydcbmltcG9ydCB7IExFU1BhcnNlciB9IGZyb20gJy4vcGFyc2VyLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNOb2RlIH0gZnJvbSAnLi9hc3QuanMnXG5cbmV4cG9ydCB7IExFU1BhcnNlciwgTEVTUGFyc2VFcnJvciB9IGZyb20gJy4vcGFyc2VyLmpzJ1xuZXhwb3J0IHsgdG9rZW5pemUsIGVuZHNXaXRoQW5kLCBzdHJpcFRyYWlsaW5nQW5kIH0gZnJvbSAnLi90b2tlbml6ZXIuanMnXG5leHBvcnQgeyBzdHJpcEJvZHkgfSBmcm9tICcuL3N0cmlwQm9keS5qcydcbmV4cG9ydCB0eXBlIHsgVG9rZW4gfSBmcm9tICcuL3Rva2VuaXplci5qcydcbmV4cG9ydCAqIGZyb20gJy4vYXN0LmpzJ1xuZXhwb3J0ICogZnJvbSAnLi9jb25maWcuanMnXG5cbi8qKlxuICogUGFyc2UgYSByYXcgTEVTIGJvZHkgc3RyaW5nIChmcm9tIGEgZG89LCBoYW5kbGU9LCBvciBydW49IGF0dHJpYnV0ZSlcbiAqIGludG8gYSB0eXBlZCBBU1Qgbm9kZS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBwdWJsaWMgZW50cnkgcG9pbnQgZm9yIFBoYXNlIDI6XG4gKiAgIC0gU3RyaXBzIGJhY2t0aWNrIHdyYXBwZXIgYW5kIG5vcm1hbGl6ZXMgaW5kZW50YXRpb24gKHN0cmlwQm9keSlcbiAqICAgLSBUb2tlbml6ZXMgaW50byBsaW5lcyB3aXRoIGluZGVudCBsZXZlbHMgKHRva2VuaXplKVxuICogICAtIFBhcnNlcyBpbnRvIGEgdHlwZWQgTEVTTm9kZSBBU1QgKExFU1BhcnNlcilcbiAqXG4gKiBAdGhyb3dzIExFU1BhcnNlRXJyb3Igb24gdW5yZWNvdmVyYWJsZSBzeW50YXggZXJyb3JzIChjdXJyZW50bHkgc29mdC13YXJucyBpbnN0ZWFkKVxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VMRVMocmF3OiBzdHJpbmcpOiBMRVNOb2RlIHtcbiAgY29uc3Qgc3RyaXBwZWQgPSBzdHJpcEJvZHkocmF3KVxuICBjb25zdCB0b2tlbnMgICA9IHRva2VuaXplKHN0cmlwcGVkKVxuICBjb25zdCBwYXJzZXIgICA9IG5ldyBMRVNQYXJzZXIodG9rZW5zKVxuICByZXR1cm4gcGFyc2VyLnBhcnNlKClcbn1cbiIsICIvKipcbiAqIFBoYXNlIDQ6IHdpcmVzIHRoZSBwYXJzZWQgY29uZmlnIGludG8gbGl2ZSBydW50aW1lIGJlaGF2aW9yLlxuICpcbiAqIFJlc3BvbnNpYmlsaXRpZXM6XG4gKiAgIDEuIFJlZ2lzdGVyIGFsbCA8bG9jYWwtY29tbWFuZD4gcGFyc2VkIGRlZnMgaW50byB0aGUgQ29tbWFuZFJlZ2lzdHJ5XG4gKiAgIDIuIEF0dGFjaCBDdXN0b21FdmVudCBsaXN0ZW5lcnMgb24gdGhlIGhvc3QgZm9yIGVhY2ggPG9uLWV2ZW50PlxuICogICAzLiBXaXJlIDxvbi1sb2FkPiB0byBmaXJlIGFmdGVyIERPTSBpcyByZWFkeVxuICogICA0LiBCdWlsZCB0aGUgTEVTQ29udGV4dCB1c2VkIGJ5IHRoZSBleGVjdXRvclxuICpcbiAqIDxvbi1zaWduYWw+IGFuZCA8b24tZW50ZXI+Lzxvbi1leGl0PiBhcmUgd2lyZWQgaW4gUGhhc2UgNS82LlxuICovXG5cbmltcG9ydCB7IGV4ZWN1dGUsIGV2YWxFeHByIH0gZnJvbSAnLi9leGVjdXRvci5qcydcbmltcG9ydCB7IExFU1Njb3BlIH0gZnJvbSAnLi9zY29wZS5qcydcbmltcG9ydCB0eXBlIHsgQ29tbWFuZFJlZ2lzdHJ5IH0gZnJvbSAnLi9yZWdpc3RyeS5qcydcbmltcG9ydCB0eXBlIHsgTW9kdWxlUmVnaXN0cnkgfSBmcm9tICdAbW9kdWxlcy90eXBlcy5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29uZmlnIH0gZnJvbSAnQHBhcnNlci9jb25maWcuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcbmltcG9ydCB7IHBhcnNlTEVTIH0gZnJvbSAnQHBhcnNlci9pbmRleC5qcydcblxuZXhwb3J0IGludGVyZmFjZSBQYXJzZWRXaXJpbmcge1xuICBjb21tYW5kczogIEFycmF5PHsgbmFtZTogc3RyaW5nOyBndWFyZDogc3RyaW5nIHwgbnVsbDsgYXJnc1Jhdzogc3RyaW5nOyBib2R5OiBMRVNOb2RlIH0+XG4gIGhhbmRsZXJzOiAgQXJyYXk8eyBldmVudDogc3RyaW5nOyBib2R5OiBMRVNOb2RlIH0+XG4gIHdhdGNoZXJzOiAgQXJyYXk8eyBzaWduYWw6IHN0cmluZzsgd2hlbjogc3RyaW5nIHwgbnVsbDsgYm9keTogTEVTTm9kZSB9PlxuICBsaWZlY3ljbGU6IHtcbiAgICBvbkxvYWQ6ICBMRVNOb2RlW11cbiAgICBvbkVudGVyOiBBcnJheTx7IHdoZW46IHN0cmluZyB8IG51bGw7IGJvZHk6IExFU05vZGUgfT5cbiAgICBvbkV4aXQ6ICBMRVNOb2RlW11cbiAgfVxufVxuXG4vKiogQnVpbGRzIGEgTEVTQ29udGV4dCBmb3IgdGhlIGhvc3QgZWxlbWVudC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENvbnRleHQoXG4gIGhvc3Q6IEVsZW1lbnQsXG4gIGNvbW1hbmRzOiBDb21tYW5kUmVnaXN0cnksXG4gIG1vZHVsZXM6IE1vZHVsZVJlZ2lzdHJ5LFxuICBzaWduYWxzOiB7IGdldDogKGs6IHN0cmluZykgPT4gdW5rbm93bjsgc2V0OiAoazogc3RyaW5nLCB2OiB1bmtub3duKSA9PiB2b2lkIH1cbik6IGltcG9ydCgnLi9leGVjdXRvci5qcycpLkxFU0NvbnRleHQge1xuICBjb25zdCBzY29wZSA9IG5ldyBMRVNTY29wZSgpXG5cbiAgY29uc3QgZW1pdExvY2FsID0gKGV2ZW50OiBzdHJpbmcsIHBheWxvYWQ6IHVua25vd25bXSkgPT4ge1xuICAgIGNvbnNvbGUubG9nKGBbTEVTXSBlbWl0IFwiJHtldmVudH1cImAsIHBheWxvYWQubGVuZ3RoID8gcGF5bG9hZCA6ICcnKVxuICAgIGhvc3QuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoZXZlbnQsIHtcbiAgICAgIGRldGFpbDogeyBwYXlsb2FkIH0sXG4gICAgICBidWJibGVzOiBmYWxzZSxcbiAgICAgIGNvbXBvc2VkOiBmYWxzZSxcbiAgICB9KSlcbiAgfVxuXG4gIGNvbnN0IGJyb2FkY2FzdCA9IChldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHtcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gYnJvYWRjYXN0IFwiJHtldmVudH1cImAsIHBheWxvYWQubGVuZ3RoID8gcGF5bG9hZCA6ICcnKVxuICAgIC8vIERpc3BhdGNoIG9uIGRvY3VtZW50IGRpcmVjdGx5LCBub3Qgb24gdGhlIGhvc3QgZWxlbWVudC5cbiAgICAvLyBUaGlzIHByZXZlbnRzIHRoZSBob3N0J3Mgb3duIG9uLWV2ZW50IGxpc3RlbmVycyBmcm9tIGNhdGNoaW5nIHRoZVxuICAgIC8vIGJyb2FkY2FzdCBcdTIwMTQgdGhlIGhvc3QgaXMgdGhlIG9yaWdpbiwgbm90IGEgcmVjZWl2ZXIuXG4gICAgLy8gTGlzdGVuZXJzIG9uIGRvY3VtZW50IChlLmcuIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIpIGFuZCBEYXRhc3RhclxuICAgIC8vIGRhdGEtb246IGJpbmRpbmdzIG9uIGFueSBET00gZWxlbWVudCBzdGlsbCByZWNlaXZlIGl0IG5vcm1hbGx5LlxuICAgIGNvbnN0IHJvb3QgPSBob3N0LmdldFJvb3ROb2RlKClcbiAgICBjb25zdCB0YXJnZXQgPSByb290IGluc3RhbmNlb2YgRG9jdW1lbnQgPyByb290IDogKHJvb3QgYXMgU2hhZG93Um9vdCkub3duZXJEb2N1bWVudCA/PyBkb2N1bWVudFxuICAgIHRhcmdldC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudChldmVudCwge1xuICAgICAgZGV0YWlsOiB7IHBheWxvYWQgfSxcbiAgICAgIGJ1YmJsZXM6IGZhbHNlLCAgIC8vIGFscmVhZHkgYXQgdGhlIHRvcCBcdTIwMTQgYnViYmxpbmcgaXMgbWVhbmluZ2xlc3MgaGVyZVxuICAgICAgY29tcG9zZWQ6IGZhbHNlLFxuICAgIH0pKVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzY29wZSxcbiAgICBob3N0LFxuICAgIGNvbW1hbmRzLFxuICAgIG1vZHVsZXMsXG4gICAgZ2V0U2lnbmFsOiBzaWduYWxzLmdldCxcbiAgICBzZXRTaWduYWw6IHNpZ25hbHMuc2V0LFxuICAgIGVtaXRMb2NhbCxcbiAgICBicm9hZGNhc3QsXG4gIH1cbn1cblxuLyoqXG4gKiBSZWdpc3RlcnMgYWxsIHBhcnNlZCBjb21tYW5kcyBpbnRvIHRoZSByZWdpc3RyeS5cbiAqIENhbGxlZCBvbmNlIGR1cmluZyBfaW5pdCwgYmVmb3JlIGFueSBldmVudHMgYXJlIHdpcmVkLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJDb21tYW5kcyhcbiAgd2lyaW5nOiBQYXJzZWRXaXJpbmcsXG4gIHJlZ2lzdHJ5OiBDb21tYW5kUmVnaXN0cnlcbik6IHZvaWQge1xuICBmb3IgKGNvbnN0IGNtZCBvZiB3aXJpbmcuY29tbWFuZHMpIHtcbiAgICAvLyBQYXJzZSBhcmdzUmF3IGludG8gQXJnRGVmW10gKHNpbXBsaWZpZWQgXHUyMDE0IGZ1bGwgYXJnIHBhcnNpbmcgaW4gUGhhc2UgMiByZWZpbmVtZW50KVxuICAgIGNvbnN0IGFyZ3MgPSBwYXJzZUFyZ3NSYXcoY21kLmFyZ3NSYXcpXG4gICAgY29uc3QgZGVmOiBpbXBvcnQoJy4vcmVnaXN0cnkuanMnKS5Db21tYW5kRGVmID0ge1xuICAgICAgbmFtZTogY21kLm5hbWUsXG4gICAgICBhcmdzLFxuICAgICAgYm9keTogY21kLmJvZHksXG4gICAgICBlbGVtZW50OiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsb2NhbC1jb21tYW5kJyksXG4gICAgfVxuICAgIGlmIChjbWQuZ3VhcmQpIGRlZi5ndWFyZCA9IGNtZC5ndWFyZFxuICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKGRlZilcbiAgfVxuICBjb25zb2xlLmxvZyhgW0xFU10gcmVnaXN0ZXJlZCAke3dpcmluZy5jb21tYW5kcy5sZW5ndGh9IGNvbW1hbmRzYClcbn1cblxuLyoqXG4gKiBBdHRhY2hlcyBldmVudCBsaXN0ZW5lcnMgb24gdGhlIGhvc3QgZm9yIGFsbCA8b24tZXZlbnQ+IGhhbmRsZXJzLlxuICogUmV0dXJucyBhIGNsZWFudXAgZnVuY3Rpb24gdGhhdCByZW1vdmVzIGFsbCBsaXN0ZW5lcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXJlRXZlbnRIYW5kbGVycyhcbiAgd2lyaW5nOiBQYXJzZWRXaXJpbmcsXG4gIGhvc3Q6IEVsZW1lbnQsXG4gIGdldEN0eDogKCkgPT4gaW1wb3J0KCcuL2V4ZWN1dG9yLmpzJykuTEVTQ29udGV4dFxuKTogKCkgPT4gdm9pZCB7XG4gIGNvbnN0IGNsZWFudXBzOiBBcnJheTwoKSA9PiB2b2lkPiA9IFtdXG5cbiAgZm9yIChjb25zdCBoYW5kbGVyIG9mIHdpcmluZy5oYW5kbGVycykge1xuICAgIGNvbnN0IGxpc3RlbmVyID0gKGU6IEV2ZW50KSA9PiB7XG4gICAgICBjb25zdCBjdHggPSBnZXRDdHgoKVxuICAgICAgLy8gRXhwb3NlIGV2ZW50IGRldGFpbCBpbiBzY29wZVxuICAgICAgY29uc3QgaGFuZGxlclNjb3BlID0gY3R4LnNjb3BlLmNoaWxkKClcbiAgICAgIGNvbnN0IGRldGFpbCA9IChlIGFzIEN1c3RvbUV2ZW50KS5kZXRhaWwgPz8ge31cbiAgICAgIGhhbmRsZXJTY29wZS5zZXQoJ2V2ZW50JywgZSlcbiAgICAgIGhhbmRsZXJTY29wZS5zZXQoJ3BheWxvYWQnLCBkZXRhaWwucGF5bG9hZCA/PyBbXSlcbiAgICAgIGNvbnN0IGhhbmRsZXJDdHggPSB7IC4uLmN0eCwgc2NvcGU6IGhhbmRsZXJTY29wZSB9XG5cbiAgICAgIGV4ZWN1dGUoaGFuZGxlci5ib2R5LCBoYW5kbGVyQ3R4KS5jYXRjaChlcnIgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbTEVTXSBFcnJvciBpbiBoYW5kbGVyIGZvciBcIiR7aGFuZGxlci5ldmVudH1cIjpgLCBlcnIpXG4gICAgICB9KVxuICAgIH1cblxuICAgIGhvc3QuYWRkRXZlbnRMaXN0ZW5lcihoYW5kbGVyLmV2ZW50LCBsaXN0ZW5lcilcbiAgICBjbGVhbnVwcy5wdXNoKCgpID0+IGhvc3QucmVtb3ZlRXZlbnRMaXN0ZW5lcihoYW5kbGVyLmV2ZW50LCBsaXN0ZW5lcikpXG4gICAgY29uc29sZS5sb2coYFtMRVNdIHdpcmVkIGV2ZW50IGhhbmRsZXI6IFwiJHtoYW5kbGVyLmV2ZW50fVwiYClcbiAgfVxuXG4gIHJldHVybiAoKSA9PiBjbGVhbnVwcy5mb3JFYWNoKGZuID0+IGZuKCkpXG59XG5cbi8qKlxuICogRmlyZXMgYWxsIDxvbi1sb2FkPiBib2RpZXMuXG4gKiBDYWxsZWQgYWZ0ZXIgY29tbWFuZHMgYXJlIHJlZ2lzdGVyZWQgYW5kIGV2ZW50IGhhbmRsZXJzIGFyZSB3aXJlZCxcbiAqIHNvIGVtaXQvY2FsbCBzdGF0ZW1lbnRzIGluIG9uLWxvYWQgY2FuIHJlYWNoIHRoZWlyIHRhcmdldHMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaXJlT25Mb2FkKFxuICB3aXJpbmc6IFBhcnNlZFdpcmluZyxcbiAgZ2V0Q3R4OiAoKSA9PiBpbXBvcnQoJy4vZXhlY3V0b3IuanMnKS5MRVNDb250ZXh0XG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgZm9yIChjb25zdCBib2R5IG9mIHdpcmluZy5saWZlY3ljbGUub25Mb2FkKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGV4ZWN1dGUoYm9keSwgZ2V0Q3R4KCkpXG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbTEVTXSBFcnJvciBpbiBvbi1sb2FkOicsIGVycilcbiAgICB9XG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBBcmcgcGFyc2luZyAoc2ltcGxpZmllZCBcdTIwMTQgZnVsbCB0eXBlLWNoZWNrZWQgdmVyc2lvbiBpbiBQaGFzZSAyIHJlZmluZW1lbnQpXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuaW1wb3J0IHR5cGUgeyBBcmdEZWYgfSBmcm9tICcuL3JlZ2lzdHJ5LmpzJ1xuaW1wb3J0IHR5cGUgeyBFeHByTm9kZSB9IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuXG5mdW5jdGlvbiBwYXJzZUFyZ3NSYXcocmF3OiBzdHJpbmcpOiBBcmdEZWZbXSB7XG4gIGlmICghcmF3LnRyaW0oKSkgcmV0dXJuIFtdXG4gIC8vIFN0cmlwIG91dGVyIGJyYWNrZXRzOiBcIltmcm9tOnN0ciAgdG86c3RyICBhdHRlbXB0OmludD0wXVwiIFx1MjE5MiBcImZyb206c3RyICB0bzpzdHIgIGF0dGVtcHQ6aW50PTBcIlxuICBjb25zdCBpbm5lciA9IHJhdy5yZXBsYWNlKC9eXFxbfFxcXSQvZywgJycpLnRyaW0oKVxuICBpZiAoIWlubmVyKSByZXR1cm4gW11cblxuICByZXR1cm4gaW5uZXIuc3BsaXQoL1xcc3syLH18XFxzKD89XFx3KzopLykubWFwKHMgPT4gcy50cmltKCkpLmZpbHRlcihCb29sZWFuKS5tYXAocGFydCA9PiB7XG4gICAgLy8gYG5hbWU6dHlwZT1kZWZhdWx0YCBvciBgbmFtZTp0eXBlYFxuICAgIGNvbnN0IGVxSWR4ID0gcGFydC5pbmRleE9mKCc9JylcbiAgICBjb25zdCBjb2xvbklkeCA9IHBhcnQuaW5kZXhPZignOicpXG4gICAgaWYgKGNvbG9uSWR4ID09PSAtMSkgcmV0dXJuIHsgbmFtZTogcGFydCwgdHlwZTogJ2R5bicgfVxuXG4gICAgY29uc3QgbmFtZSA9IHBhcnQuc2xpY2UoMCwgY29sb25JZHgpLnRyaW0oKVxuICAgIGNvbnN0IHJlc3QgPSBwYXJ0LnNsaWNlKGNvbG9uSWR4ICsgMSlcblxuICAgIGlmIChlcUlkeCA9PT0gLTEpIHtcbiAgICAgIHJldHVybiB7IG5hbWUsIHR5cGU6IHJlc3QudHJpbSgpIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdHlwZSA9IHBhcnQuc2xpY2UoY29sb25JZHggKyAxLCBlcUlkeCkudHJpbSgpXG4gICAgICBjb25zdCBkZWZhdWx0UmF3ID0gcGFydC5zbGljZShlcUlkeCArIDEpLnRyaW0oKVxuICAgICAgY29uc3QgZGVmYXVsdEV4cHI6IEV4cHJOb2RlID0geyB0eXBlOiAnZXhwcicsIHJhdzogZGVmYXVsdFJhdyB9XG4gICAgICByZXR1cm4geyBuYW1lLCB0eXBlLCBkZWZhdWx0OiBkZWZhdWx0RXhwciB9XG4gICAgfVxuICB9KVxufVxuIiwgIi8qKlxuICogTEVTU2NvcGUgXHUyMDE0IGEgc2ltcGxlIGxleGljYWxseS1zY29wZWQgdmFyaWFibGUgc3RvcmUuXG4gKlxuICogRWFjaCBjb21tYW5kIGludm9jYXRpb24gZ2V0cyBhIGZyZXNoIGNoaWxkIHNjb3BlLlxuICogTWF0Y2ggYXJtIGJpbmRpbmdzIGFsc28gY3JlYXRlIGEgY2hpbGQgc2NvcGUgbGltaXRlZCB0byB0aGF0IGFybSdzIGJvZHkuXG4gKiBTaWduYWwgcmVhZHMvd3JpdGVzIGdvIHRocm91Z2ggdGhlIERhdGFzdGFyIGJyaWRnZSwgbm90IHRoaXMgc2NvcGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBMRVNTY29wZSB7XG4gIHByaXZhdGUgbG9jYWxzID0gbmV3IE1hcDxzdHJpbmcsIHVua25vd24+KClcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IHBhcmVudD86IExFU1Njb3BlKSB7fVxuXG4gIGdldChuYW1lOiBzdHJpbmcpOiB1bmtub3duIHtcbiAgICBpZiAodGhpcy5sb2NhbHMuaGFzKG5hbWUpKSByZXR1cm4gdGhpcy5sb2NhbHMuZ2V0KG5hbWUpXG4gICAgcmV0dXJuIHRoaXMucGFyZW50Py5nZXQobmFtZSlcbiAgfVxuXG4gIHNldChuYW1lOiBzdHJpbmcsIHZhbHVlOiB1bmtub3duKTogdm9pZCB7XG4gICAgdGhpcy5sb2NhbHMuc2V0KG5hbWUsIHZhbHVlKVxuICB9XG5cbiAgaGFzKG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmxvY2Fscy5oYXMobmFtZSkgfHwgKHRoaXMucGFyZW50Py5oYXMobmFtZSkgPz8gZmFsc2UpXG4gIH1cblxuICAvKiogQ3JlYXRlIGEgY2hpbGQgc2NvcGUgaW5oZXJpdGluZyBhbGwgbG9jYWxzIGZyb20gdGhpcyBvbmUuICovXG4gIGNoaWxkKCk6IExFU1Njb3BlIHtcbiAgICByZXR1cm4gbmV3IExFU1Njb3BlKHRoaXMpXG4gIH1cblxuICAvKiogU25hcHNob3QgYWxsIGxvY2FscyAoZm9yIGRlYnVnZ2luZyAvIGVycm9yIG1lc3NhZ2VzKS4gKi9cbiAgc25hcHNob3QoKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xuICAgIGNvbnN0IGJhc2UgPSB0aGlzLnBhcmVudD8uc25hcHNob3QoKSA/PyB7fVxuICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIHRoaXMubG9jYWxzKSBiYXNlW2tdID0gdlxuICAgIHJldHVybiBiYXNlXG4gIH1cbn1cbiIsICIvKipcbiAqIFBoYXNlIDVhOiBJbnRlcnNlY3Rpb25PYnNlcnZlciB3aXJpbmdcbiAqXG4gKiBPbmUgc2hhcmVkIEludGVyc2VjdGlvbk9ic2VydmVyIGlzIGNyZWF0ZWQgcGVyIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGhvc3QuXG4gKiBJdCB3YXRjaGVzIHRoZSBob3N0IGVsZW1lbnQgaXRzZWxmIChub3QgaXRzIGNoaWxkcmVuKS5cbiAqXG4gKiBvbi1lbnRlcjogZmlyZXMgd2hlbiB0aGUgaG9zdCBjcm9zc2VzIGludG8gdGhlIHZpZXdwb3J0XG4gKiAgIC0gRWFjaCA8b24tZW50ZXI+IGhhcyBhbiBvcHRpb25hbCBgd2hlbmAgZ3VhcmQgZXZhbHVhdGVkIGF0IGZpcmUgdGltZVxuICogICAtIE11bHRpcGxlIDxvbi1lbnRlcj4gY2hpbGRyZW4gYXJlIGFsbCBjaGVja2VkIGluIGRlY2xhcmF0aW9uIG9yZGVyXG4gKlxuICogb24tZXhpdDogZmlyZXMgd2hlbiB0aGUgaG9zdCBsZWF2ZXMgdGhlIHZpZXdwb3J0XG4gKiAgIC0gQWx3YXlzIGZpcmVzIHVuY29uZGl0aW9uYWxseSAobm8gYHdoZW5gIGd1YXJkIG9uIG9uLWV4aXQpXG4gKiAgIC0gTXVsdGlwbGUgPG9uLWV4aXQ+IGNoaWxkcmVuIGFsbCBmaXJlXG4gKlxuICogVGhlIG9ic2VydmVyIGlzIGRpc2Nvbm5lY3RlZCBpbiBkaXNjb25uZWN0ZWRDYWxsYmFjayB2aWEgdGhlIHJldHVybmVkIGNsZWFudXAgZm4uXG4gKi9cblxuaW1wb3J0IHsgZXhlY3V0ZSwgZXZhbEV4cHIgfSBmcm9tICcuL2V4ZWN1dG9yLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNDb250ZXh0IH0gZnJvbSAnLi9leGVjdXRvci5qcydcbmltcG9ydCB0eXBlIHsgTEVTTm9kZSB9IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIE9uRW50ZXJEZWNsIHtcbiAgd2hlbjogc3RyaW5nIHwgbnVsbFxuICBib2R5OiBMRVNOb2RlXG59XG5cbi8qKlxuICogQXR0YWNoZXMgYW4gSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgdG8gdGhlIGhvc3QgZWxlbWVudC5cbiAqXG4gKiBAcmV0dXJucyBBIGNsZWFudXAgZnVuY3Rpb24gdGhhdCBkaXNjb25uZWN0cyB0aGUgb2JzZXJ2ZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3aXJlSW50ZXJzZWN0aW9uT2JzZXJ2ZXIoXG4gIGhvc3Q6IEVsZW1lbnQsXG4gIG9uRW50ZXI6IE9uRW50ZXJEZWNsW10sXG4gIG9uRXhpdDogTEVTTm9kZVtdLFxuICBnZXRDdHg6ICgpID0+IExFU0NvbnRleHQsXG4pOiAoKSA9PiB2b2lkIHtcbiAgaWYgKG9uRW50ZXIubGVuZ3RoID09PSAwICYmIG9uRXhpdC5sZW5ndGggPT09IDApIHtcbiAgICAvLyBOb3RoaW5nIHRvIG9ic2VydmUgXHUyMDE0IHNraXAgY3JlYXRpbmcgdGhlIElPIGVudGlyZWx5XG4gICAgcmV0dXJuICgpID0+IHt9XG4gIH1cblxuICBsZXQgd2FzSW50ZXJzZWN0aW5nOiBib29sZWFuIHwgbnVsbCA9IG51bGxcblxuICBjb25zdCBvYnNlcnZlciA9IG5ldyBJbnRlcnNlY3Rpb25PYnNlcnZlcihcbiAgICAoZW50cmllcykgPT4ge1xuICAgICAgLy8gSU8gZmlyZXMgb25jZSBpbW1lZGlhdGVseSBvbiBhdHRhY2ggd2l0aCB0aGUgY3VycmVudCBzdGF0ZS5cbiAgICAgIC8vIFdlIHRyYWNrIGB3YXNJbnRlcnNlY3RpbmdgIHRvIGF2b2lkIHNwdXJpb3VzIG9uLWV4aXQgb24gZmlyc3QgdGljay5cbiAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xuICAgICAgICBjb25zdCBub3dJbnRlcnNlY3RpbmcgPSBlbnRyeS5pc0ludGVyc2VjdGluZ1xuXG4gICAgICAgIGlmIChub3dJbnRlcnNlY3RpbmcgJiYgd2FzSW50ZXJzZWN0aW5nICE9PSB0cnVlKSB7XG4gICAgICAgICAgLy8gRW50ZXJlZCB2aWV3cG9ydFxuICAgICAgICAgIHdhc0ludGVyc2VjdGluZyA9IHRydWVcbiAgICAgICAgICBoYW5kbGVFbnRlcihvbkVudGVyLCBnZXRDdHgpXG4gICAgICAgIH0gZWxzZSBpZiAoIW5vd0ludGVyc2VjdGluZyAmJiB3YXNJbnRlcnNlY3RpbmcgPT09IHRydWUpIHtcbiAgICAgICAgICAvLyBFeGl0ZWQgdmlld3BvcnQgKG9ubHkgYWZ0ZXIgd2UndmUgYmVlbiBpbiBpdClcbiAgICAgICAgICB3YXNJbnRlcnNlY3RpbmcgPSBmYWxzZVxuICAgICAgICAgIGhhbmRsZUV4aXQob25FeGl0LCBnZXRDdHgpXG4gICAgICAgIH0gZWxzZSBpZiAod2FzSW50ZXJzZWN0aW5nID09PSBudWxsKSB7XG4gICAgICAgICAgLy8gRmlyc3QgdGljayBcdTIwMTQgcmVjb3JkIHN0YXRlIGJ1dCBkb24ndCBmaXJlIGV4aXQgZm9yIGluaXRpYWxseS1vZmYtc2NyZWVuXG4gICAgICAgICAgd2FzSW50ZXJzZWN0aW5nID0gbm93SW50ZXJzZWN0aW5nXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIHtcbiAgICAgIC8vIERlZmF1bHQgdGhyZXNob2xkOiBmaXJlIHdoZW4gYW55IHBpeGVsIG9mIHRoZSBob3N0IGVudGVycy9leGl0c1xuICAgICAgdGhyZXNob2xkOiAwLFxuICAgIH1cbiAgKVxuXG4gIG9ic2VydmVyLm9ic2VydmUoaG9zdClcbiAgY29uc29sZS5sb2coJ1tMRVNdIEludGVyc2VjdGlvbk9ic2VydmVyIGF0dGFjaGVkJywgKGhvc3QgYXMgSFRNTEVsZW1lbnQpLmlkIHx8IGhvc3QudGFnTmFtZSlcblxuICByZXR1cm4gKCkgPT4ge1xuICAgIG9ic2VydmVyLmRpc2Nvbm5lY3QoKVxuICAgIGNvbnNvbGUubG9nKCdbTEVTXSBJbnRlcnNlY3Rpb25PYnNlcnZlciBkaXNjb25uZWN0ZWQnKVxuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUVudGVyKGRlY2xzOiBPbkVudGVyRGVjbFtdLCBnZXRDdHg6ICgpID0+IExFU0NvbnRleHQpOiB2b2lkIHtcbiAgY29uc3QgY3R4ID0gZ2V0Q3R4KClcblxuICBmb3IgKGNvbnN0IGRlY2wgb2YgZGVjbHMpIHtcbiAgICAvLyBFdmFsdWF0ZSBgd2hlbmAgZ3VhcmQgXHUyMDE0IGlmIGFic2VudCwgYWx3YXlzIGZpcmVzXG4gICAgaWYgKGRlY2wud2hlbikge1xuICAgICAgY29uc3QgcGFzc2VzID0gQm9vbGVhbihldmFsRXhwcih7IHR5cGU6ICdleHByJywgcmF3OiBkZWNsLndoZW4gfSwgY3R4KSlcbiAgICAgIGlmICghcGFzc2VzKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSBvbi1lbnRlciBndWFyZCByZWplY3RlZDogJHtkZWNsLndoZW59YClcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cbiAgICB9XG5cbiAgICBleGVjdXRlKGRlY2wuYm9keSwgY3R4KS5jYXRjaChlcnIgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcignW0xFU10gRXJyb3IgaW4gb24tZW50ZXI6JywgZXJyKVxuICAgIH0pXG4gIH1cbn1cblxuZnVuY3Rpb24gaGFuZGxlRXhpdChib2RpZXM6IExFU05vZGVbXSwgZ2V0Q3R4OiAoKSA9PiBMRVNDb250ZXh0KTogdm9pZCB7XG4gIGNvbnN0IGN0eCA9IGdldEN0eCgpXG5cbiAgZm9yIChjb25zdCBib2R5IG9mIGJvZGllcykge1xuICAgIGV4ZWN1dGUoYm9keSwgY3R4KS5jYXRjaChlcnIgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcignW0xFU10gRXJyb3IgaW4gb24tZXhpdDonLCBlcnIpXG4gICAgfSlcbiAgfVxufVxuIiwgIi8qKlxuICogUGhhc2UgNWI6IFNpZ25hbCB3YXRjaGVyIHdpcmluZ1xuICpcbiAqIDxvbi1zaWduYWw+IHJlYWN0cyB3aGVuZXZlciBhIG5hbWVkIERhdGFzdGFyIHNpZ25hbCBjaGFuZ2VzLlxuICogVGhlIGB3aGVuYCBndWFyZCBpcyByZS1ldmFsdWF0ZWQgb24gZXZlcnkgY2hhbmdlIFx1MjAxNCBpZiBmYWxzeSwgdGhlXG4gKiBoYW5kbGUgYm9keSBkb2VzIG5vdCBydW4gKG5vdCBhbiBlcnJvciwganVzdCBmaWx0ZXJlZCBvdXQpLlxuICpcbiAqIEluIFBoYXNlIDUgd2UgdXNlIGEgc2ltcGxlIGxvY2FsIG5vdGlmaWNhdGlvbiBwYXRoOiB3aGVuZXZlclxuICogTG9jYWxFdmVudFNjcmlwdC5fc2V0U2lnbmFsKCkgd3JpdGVzIGEgdmFsdWUsIGl0IGNhbGxzIGludG9cbiAqIG5vdGlmeVNpZ25hbFdhdGNoZXJzKCkuIFRoaXMgaGFuZGxlcyB0aGUgZmFsbGJhY2sgKG5vIERhdGFzdGFyKSBjYXNlLlxuICpcbiAqIFBoYXNlIDYgcmVwbGFjZXMgdGhlIG5vdGlmaWNhdGlvbiBwYXRoIHdpdGggRGF0YXN0YXIncyBlZmZlY3QoKSBzeXN0ZW0sXG4gKiB3aGljaCBpcyBtb3JlIGVmZmljaWVudCAoYmF0Y2hlZCwgZGVkdXBlZCwgcmVhY3RpdmUgZ3JhcGgtYXdhcmUpLlxuICpcbiAqIFRoZSB3YXRjaGVyIGZpcmVzIHRoZSBib2R5IGFzeW5jaHJvbm91c2x5IChub24tYmxvY2tpbmcpIHRvIG1hdGNoXG4gKiB0aGUgYmVoYXZpb3VyIG9mIERhdGFzdGFyJ3MgcmVhY3RpdmUgZWZmZWN0cy5cbiAqL1xuXG5pbXBvcnQgeyBleGVjdXRlLCBldmFsRXhwciB9IGZyb20gJy4vZXhlY3V0b3IuanMnXG5pbXBvcnQgdHlwZSB7IExFU0NvbnRleHQgfSBmcm9tICcuL2V4ZWN1dG9yLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNOb2RlIH0gZnJvbSAnQHBhcnNlci9hc3QuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgU2lnbmFsV2F0Y2hlckRlY2wge1xuICAvKiogU2lnbmFsIG5hbWUgd2l0aCAkIHByZWZpeDogXCIkZmVlZFN0YXRlXCIgKi9cbiAgc2lnbmFsOiBzdHJpbmdcbiAgLyoqIE9wdGlvbmFsIGd1YXJkIGV4cHJlc3Npb24gXHUyMDE0IG51bGwgbWVhbnMgYWx3YXlzIGZpcmVzICovXG4gIHdoZW46IHN0cmluZyB8IG51bGxcbiAgYm9keTogTEVTTm9kZVxufVxuXG4vKipcbiAqIENoZWNrcyBhbGwgc2lnbmFsIHdhdGNoZXJzIHRvIHNlZSBpZiBhbnkgc2hvdWxkIGZpcmUgZm9yIHRoZVxuICogZ2l2ZW4gc2lnbmFsIG5hbWUgY2hhbmdlLlxuICpcbiAqIENhbGxlZCBmcm9tIExvY2FsRXZlbnRTY3JpcHQuX3NldFNpZ25hbCgpIGFmdGVyIGV2ZXJ5IHdyaXRlLlxuICogQWxzbyBjYWxsZWQgZnJvbSBQaGFzZSA2IERhdGFzdGFyIGVmZmVjdCgpIHN1YnNjcmlwdGlvbnMuXG4gKlxuICogQHBhcmFtIGNoYW5nZWRTaWduYWwgIFRoZSBzaWduYWwgbmFtZSAqd2l0aG91dCogdGhlICQgcHJlZml4XG4gKiBAcGFyYW0gd2F0Y2hlcnMgICAgICAgQWxsIG9uLXNpZ25hbCBkZWNsYXJhdGlvbnMgZm9yIHRoaXMgTEVTIGluc3RhbmNlXG4gKiBAcGFyYW0gZ2V0Q3R4ICAgICAgICAgUmV0dXJucyB0aGUgY3VycmVudCBleGVjdXRpb24gY29udGV4dFxuICovXG5leHBvcnQgZnVuY3Rpb24gbm90aWZ5U2lnbmFsV2F0Y2hlcnMoXG4gIGNoYW5nZWRTaWduYWw6IHN0cmluZyxcbiAgd2F0Y2hlcnM6IFNpZ25hbFdhdGNoZXJEZWNsW10sXG4gIGdldEN0eDogKCkgPT4gTEVTQ29udGV4dFxuKTogdm9pZCB7XG4gIGZvciAoY29uc3Qgd2F0Y2hlciBvZiB3YXRjaGVycykge1xuICAgIC8vIE5vcm1hbGl6ZTogc3RyaXAgbGVhZGluZyAkIGZvciBjb21wYXJpc29uXG4gICAgY29uc3Qgd2F0Y2hlZEtleSA9IHdhdGNoZXIuc2lnbmFsLnJlcGxhY2UoL15cXCQvLCAnJylcblxuICAgIGlmICh3YXRjaGVkS2V5ICE9PSBjaGFuZ2VkU2lnbmFsKSBjb250aW51ZVxuXG4gICAgY29uc3QgY3R4ID0gZ2V0Q3R4KClcblxuICAgIC8vIEV2YWx1YXRlIGB3aGVuYCBndWFyZFxuICAgIGlmICh3YXRjaGVyLndoZW4pIHtcbiAgICAgIGNvbnN0IHBhc3NlcyA9IEJvb2xlYW4oZXZhbEV4cHIoeyB0eXBlOiAnZXhwcicsIHJhdzogd2F0Y2hlci53aGVuIH0sIGN0eCkpXG4gICAgICBpZiAoIXBhc3NlcykgY29udGludWVcbiAgICB9XG5cbiAgICAvLyBGaXJlIHRoZSBib2R5IGFzeW5jaHJvbm91c2x5IFx1MjAxNCBkb24ndCBibG9jayB0aGUgc2lnbmFsIHdyaXRlIHBhdGhcbiAgICBleGVjdXRlKHdhdGNoZXIuYm9keSwgY3R4KS5jYXRjaChlcnIgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcihgW0xFU10gRXJyb3IgaW4gb24tc2lnbmFsIFwiJHt3YXRjaGVyLnNpZ25hbH1cIjpgLCBlcnIpXG4gICAgfSlcbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBEYXRhc3Rhci1jb21wYXRpYmxlIGVmZmVjdCBzdWJzY3JpcHRpb24gZm9yIG9uZSBzaWduYWwgd2F0Y2hlci5cbiAqIFVzZWQgaW4gUGhhc2UgNiB3aGVuIERhdGFzdGFyIGlzIHByZXNlbnQuXG4gKlxuICogQHBhcmFtIHdhdGNoZXIgICBUaGUgb24tc2lnbmFsIGRlY2xhcmF0aW9uXG4gKiBAcGFyYW0gZWZmZWN0ICAgIERhdGFzdGFyJ3MgZWZmZWN0KCkgZnVuY3Rpb25cbiAqIEBwYXJhbSBnZXRDdHggICAgUmV0dXJucyB0aGUgY3VycmVudCBleGVjdXRpb24gY29udGV4dFxuICovXG5leHBvcnQgZnVuY3Rpb24gd2lyZVNpZ25hbFdhdGNoZXJWaWFEYXRhc3RhcihcbiAgd2F0Y2hlcjogU2lnbmFsV2F0Y2hlckRlY2wsXG4gIGVmZmVjdDogKGZuOiAoKSA9PiB2b2lkKSA9PiB2b2lkLFxuICBnZXRDdHg6ICgpID0+IExFU0NvbnRleHRcbik6IHZvaWQge1xuICBlZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IGN0eCA9IGdldEN0eCgpXG5cbiAgICAvLyBSZWFkaW5nIHRoZSBzaWduYWwgaW5zaWRlIGFuIGVmZmVjdCgpIGF1dG8tc3Vic2NyaWJlcyB1cyB0byBpdFxuICAgIGNvbnN0IHNpZ25hbEtleSA9IHdhdGNoZXIuc2lnbmFsLnJlcGxhY2UoL15cXCQvLCAnJylcbiAgICBjdHguZ2V0U2lnbmFsKHNpZ25hbEtleSkgLy8gc3Vic2NyaXB0aW9uIHNpZGUtZWZmZWN0XG5cbiAgICBpZiAod2F0Y2hlci53aGVuKSB7XG4gICAgICBjb25zdCBwYXNzZXMgPSBCb29sZWFuKGV2YWxFeHByKHsgdHlwZTogJ2V4cHInLCByYXc6IHdhdGNoZXIud2hlbiB9LCBjdHgpKVxuICAgICAgaWYgKCFwYXNzZXMpIHJldHVyblxuICAgIH1cblxuICAgIGV4ZWN1dGUod2F0Y2hlci5ib2R5LCBjdHgpLmNhdGNoKGVyciA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKGBbTEVTXSBFcnJvciBpbiBvbi1zaWduYWwgXCIke3dhdGNoZXIuc2lnbmFsfVwiIChEYXRhc3Rhcik6YCwgZXJyKVxuICAgIH0pXG4gIH0pXG59XG4iLCAiaW1wb3J0IHsgQ29tbWFuZFJlZ2lzdHJ5IH0gZnJvbSAnQHJ1bnRpbWUvcmVnaXN0cnkuanMnXG5pbXBvcnQgeyBNb2R1bGVSZWdpc3RyeSwgbG9hZE1vZHVsZSB9IGZyb20gJ0Btb2R1bGVzL3R5cGVzLmpzJ1xuaW1wb3J0IHsgcmVhZENvbmZpZywgbG9nQ29uZmlnIH0gZnJvbSAnQHBhcnNlci9yZWFkZXIuanMnXG5pbXBvcnQgeyBwYXJzZUxFUyB9IGZyb20gJ0BwYXJzZXIvaW5kZXguanMnXG5pbXBvcnQgeyBidWlsZENvbnRleHQsIHJlZ2lzdGVyQ29tbWFuZHMsIHdpcmVFdmVudEhhbmRsZXJzLCBmaXJlT25Mb2FkLCB0eXBlIFBhcnNlZFdpcmluZyB9IGZyb20gJ0BydW50aW1lL3dpcmluZy5qcydcbmltcG9ydCB7IHdpcmVJbnRlcnNlY3Rpb25PYnNlcnZlciB9IGZyb20gJ0BydW50aW1lL29ic2VydmVyLmpzJ1xuaW1wb3J0IHsgbm90aWZ5U2lnbmFsV2F0Y2hlcnMsIHdpcmVTaWduYWxXYXRjaGVyVmlhRGF0YXN0YXIgfSBmcm9tICdAcnVudGltZS9zaWduYWxzLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNDb25maWcgfSBmcm9tICdAcGFyc2VyL2NvbmZpZy5qcydcbmltcG9ydCB0eXBlIHsgTEVTTm9kZSB9IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNDb250ZXh0IH0gZnJvbSAnQHJ1bnRpbWUvZXhlY3V0b3IuanMnXG5cbmV4cG9ydCBjbGFzcyBMb2NhbEV2ZW50U2NyaXB0IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICByZWFkb25seSBjb21tYW5kcyA9IG5ldyBDb21tYW5kUmVnaXN0cnkoKVxuICByZWFkb25seSBtb2R1bGVzICA9IG5ldyBNb2R1bGVSZWdpc3RyeSgpXG5cbiAgcHJpdmF0ZSBfY29uZmlnOiAgTEVTQ29uZmlnIHwgbnVsbCAgPSBudWxsXG4gIHByaXZhdGUgX3dpcmluZzogIFBhcnNlZFdpcmluZyB8IG51bGwgPSBudWxsXG4gIHByaXZhdGUgX2N0eDogICAgIExFU0NvbnRleHQgfCBudWxsID0gbnVsbFxuXG4gIC8vIENsZWFudXAgZm5zIGFjY3VtdWxhdGVkIGR1cmluZyBfaW5pdCBcdTIwMTQgYWxsIGNhbGxlZCBpbiBfdGVhcmRvd25cbiAgcHJpdmF0ZSBfY2xlYW51cHM6IEFycmF5PCgpID0+IHZvaWQ+ID0gW11cblxuICAvLyBTaW1wbGUgZmFsbGJhY2sgc2lnbmFsIHN0b3JlIChEYXRhc3RhciBicmlkZ2UgcmVwbGFjZXMgcmVhZHMvd3JpdGVzIGluIFBoYXNlIDYpXG4gIHByaXZhdGUgX3NpZ25hbHM6IE1hcDxzdHJpbmcsIHVua25vd24+ID0gbmV3IE1hcCgpXG5cbiAgLy8gRGF0YXN0YXIgYnJpZGdlIChwb3B1bGF0ZWQgaW4gUGhhc2UgNiB2aWEgYXR0cmlidXRlIHBsdWdpbilcbiAgcHJpdmF0ZSBfZHNFZmZlY3Q6ICgoZm46ICgpID0+IHZvaWQpID0+IHZvaWQpIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG4gIHByaXZhdGUgX2RzU2lnbmFsOiAoPFQ+KG5hbWU6IHN0cmluZywgaW5pdD86IFQpID0+IHsgdmFsdWU6IFQgfSkgfCB1bmRlZmluZWQgPSB1bmRlZmluZWRcblxuICBnZXQgY29uZmlnKCk6ICBMRVNDb25maWcgfCBudWxsICAgIHsgcmV0dXJuIHRoaXMuX2NvbmZpZyB9XG4gIGdldCB3aXJpbmcoKTogIFBhcnNlZFdpcmluZyB8IG51bGwgeyByZXR1cm4gdGhpcy5fd2lyaW5nIH1cbiAgZ2V0IGNvbnRleHQoKTogTEVTQ29udGV4dCB8IG51bGwgICB7IHJldHVybiB0aGlzLl9jdHggfVxuXG4gIHN0YXRpYyBnZXQgb2JzZXJ2ZWRBdHRyaWJ1dGVzKCk6IHN0cmluZ1tdIHsgcmV0dXJuIFtdIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBxdWV1ZU1pY3JvdGFzaygoKSA9PiB0aGlzLl9pbml0KCkpXG4gIH1cblxuICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICB0aGlzLl90ZWFyZG93bigpXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgSW50ZXJuYWwgbGlmZWN5Y2xlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgYXN5bmMgX2luaXQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGluaXRpYWxpemluZycsIHRoaXMuaWQgfHwgJyhubyBpZCknKVxuXG4gICAgLy8gUHJlLXNlZWQgbG9jYWwgc2lnbmFsIHN0b3JlIGZyb20gZGF0YS1zaWduYWxzOiogYXR0cmlidXRlcy5cbiAgICAvLyBUaGUgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgY2FuIGZpcmUgYmVmb3JlIERhdGFzdGFyJ3MgYXN5bmMgcGx1Z2luIGNvbm5lY3RzLFxuICAgIC8vIHNvIGd1YXJkIGV4cHJlc3Npb25zIGxpa2UgYCRpbnRyb1N0YXRlID09ICdoaWRkZW4nYCB3b3VsZCBldmFsdWF0ZSB0b1xuICAgIC8vIGB1bmRlZmluZWQgPT0gJ2hpZGRlbidgIFx1MjE5MiBmYWxzZSB3aXRob3V0IHRoaXMgcHJlLXNlZWRpbmcgc3RlcC5cbiAgICB0aGlzLl9zZWVkU2lnbmFsc0Zyb21BdHRyaWJ1dGVzKClcblxuICAgIC8vIFBoYXNlIDE6IERPTSBcdTIxOTIgY29uZmlnXG4gICAgdGhpcy5fY29uZmlnID0gcmVhZENvbmZpZyh0aGlzKVxuICAgIGxvZ0NvbmZpZyh0aGlzLl9jb25maWcpXG5cbiAgICAvLyBQaGFzZSA4OiBsb2FkIG1vZHVsZXMgYmVmb3JlIHBhcnNpbmcgc28gcHJpbWl0aXZlIG5hbWVzIHJlc29sdmVcbiAgICBhd2FpdCB0aGlzLl9sb2FkTW9kdWxlcyh0aGlzLl9jb25maWcpXG5cbiAgICAvLyBQaGFzZSAyOiBwYXJzZSBib2R5IHN0cmluZ3MgXHUyMTkyIEFTVFxuICAgIHRoaXMuX3dpcmluZyA9IHRoaXMuX3BhcnNlQWxsKHRoaXMuX2NvbmZpZylcblxuICAgIC8vIFBoYXNlIDQ6IGJ1aWxkIGNvbnRleHQsIHJlZ2lzdGVyIGNvbW1hbmRzLCB3aXJlIGV2ZW50IGhhbmRsZXJzXG4gICAgdGhpcy5fY3R4ID0gYnVpbGRDb250ZXh0KFxuICAgICAgdGhpcyxcbiAgICAgIHRoaXMuY29tbWFuZHMsXG4gICAgICB0aGlzLm1vZHVsZXMsXG4gICAgICB7IGdldDogayA9PiB0aGlzLl9nZXRTaWduYWwoayksIHNldDogKGssIHYpID0+IHRoaXMuX3NldFNpZ25hbChrLCB2KSB9XG4gICAgKVxuXG4gICAgcmVnaXN0ZXJDb21tYW5kcyh0aGlzLl93aXJpbmcsIHRoaXMuY29tbWFuZHMpXG5cbiAgICB0aGlzLl9jbGVhbnVwcy5wdXNoKFxuICAgICAgd2lyZUV2ZW50SGFuZGxlcnModGhpcy5fd2lyaW5nLCB0aGlzLCAoKSA9PiB0aGlzLl9jdHghKVxuICAgIClcblxuICAgIC8vIFBoYXNlIDVhOiBJbnRlcnNlY3Rpb25PYnNlcnZlciBmb3Igb24tZW50ZXIgLyBvbi1leGl0XG4gICAgdGhpcy5fY2xlYW51cHMucHVzaChcbiAgICAgIHdpcmVJbnRlcnNlY3Rpb25PYnNlcnZlcihcbiAgICAgICAgdGhpcyxcbiAgICAgICAgdGhpcy5fd2lyaW5nLmxpZmVjeWNsZS5vbkVudGVyLFxuICAgICAgICB0aGlzLl93aXJpbmcubGlmZWN5Y2xlLm9uRXhpdCxcbiAgICAgICAgKCkgPT4gdGhpcy5fY3R4IVxuICAgICAgKVxuICAgIClcblxuICAgIC8vIFBoYXNlIDViOiBzaWduYWwgd2F0Y2hlcnNcbiAgICAvLyBJZiBEYXRhc3RhciBpcyBjb25uZWN0ZWQgdXNlIGl0cyByZWFjdGl2ZSBlZmZlY3QoKSBzeXN0ZW07XG4gICAgLy8gb3RoZXJ3aXNlIHRoZSBsb2NhbCBfc2V0U2lnbmFsIHBhdGggY2FsbHMgbm90aWZ5U2lnbmFsV2F0Y2hlcnMgZGlyZWN0bHkuXG4gICAgaWYgKHRoaXMuX2RzRWZmZWN0KSB7XG4gICAgICBmb3IgKGNvbnN0IHdhdGNoZXIgb2YgdGhpcy5fd2lyaW5nLndhdGNoZXJzKSB7XG4gICAgICAgIHdpcmVTaWduYWxXYXRjaGVyVmlhRGF0YXN0YXIod2F0Y2hlciwgdGhpcy5fZHNFZmZlY3QsICgpID0+IHRoaXMuX2N0eCEpXG4gICAgICB9XG4gICAgICBjb25zb2xlLmxvZyhgW0xFU10gd2lyZWQgJHt0aGlzLl93aXJpbmcud2F0Y2hlcnMubGVuZ3RofSBzaWduYWwgd2F0Y2hlcnMgdmlhIERhdGFzdGFyYClcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coYFtMRVNdIHdpcmVkICR7dGhpcy5fd2lyaW5nLndhdGNoZXJzLmxlbmd0aH0gc2lnbmFsIHdhdGNoZXJzIChsb2NhbCBmYWxsYmFjaylgKVxuICAgIH1cblxuICAgIC8vIFBoYXNlIDY6IERhdGFzdGFyIGJyaWRnZSBmdWxsIGFjdGl2YXRpb24gXHUyMDE0IGNvbWluZyBuZXh0XG5cbiAgICAvLyBvbi1sb2FkIGZpcmVzIGxhc3QsIGFmdGVyIGV2ZXJ5dGhpbmcgaXMgd2lyZWRcbiAgICBhd2FpdCBmaXJlT25Mb2FkKHRoaXMuX3dpcmluZywgKCkgPT4gdGhpcy5fY3R4ISlcblxuICAgIGNvbnNvbGUubG9nKCdbTEVTXSByZWFkeTonLCB0aGlzLmlkIHx8ICcobm8gaWQpJylcbiAgfVxuXG4gIHByaXZhdGUgX3RlYXJkb3duKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBkaXNjb25uZWN0ZWQnLCB0aGlzLmlkIHx8ICcobm8gaWQpJylcbiAgICBmb3IgKGNvbnN0IGNsZWFudXAgb2YgdGhpcy5fY2xlYW51cHMpIGNsZWFudXAoKVxuICAgIHRoaXMuX2NsZWFudXBzID0gW11cbiAgICB0aGlzLl9jb25maWcgICA9IG51bGxcbiAgICB0aGlzLl93aXJpbmcgICA9IG51bGxcbiAgICB0aGlzLl9jdHggICAgICA9IG51bGxcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBTaWduYWwgc3RvcmUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgLyoqXG4gICAqIFJlYWRzIGFsbCBkYXRhLXNpZ25hbHM6S0VZPVwiVkFMVUVcIiBhdHRyaWJ1dGVzIG9uIHRoZSBob3N0IGVsZW1lbnQgYW5kXG4gICAqIHByZS1wb3B1bGF0ZXMgdGhlIGxvY2FsIF9zaWduYWxzIE1hcCB3aXRoIHRoZWlyIGluaXRpYWwgdmFsdWVzLlxuICAgKlxuICAgKiBEYXRhc3RhciBldmFsdWF0ZXMgdGhlc2UgYXMgSlMgZXhwcmVzc2lvbnMgKGUuZy4gXCInaGlkZGVuJ1wiIFx1MjE5MiBcImhpZGRlblwiLFxuICAgKiBcIjBcIiBcdTIxOTIgMCwgXCJbXVwiIFx1MjE5MiBbXSkuIFdlIGRvIHRoZSBzYW1lIHdpdGggYSBzaW1wbGUgZXZhbC5cbiAgICpcbiAgICogVGhpcyBydW5zIHN5bmNocm9ub3VzbHkgYmVmb3JlIGFueSBhc3luYyBvcGVyYXRpb25zIHNvIHRoYXQgdGhlXG4gICAqIEludGVyc2VjdGlvbk9ic2VydmVyIFx1MjAxNCB3aGljaCBtYXkgZmlyZSBiZWZvcmUgRGF0YXN0YXIgY29ubmVjdHMgXHUyMDE0IHNlZXNcbiAgICogdGhlIGNvcnJlY3QgaW5pdGlhbCBzaWduYWwgdmFsdWVzIHdoZW4gZXZhbHVhdGluZyBgd2hlbmAgZ3VhcmRzLlxuICAgKi9cbiAgcHJpdmF0ZSBfc2VlZFNpZ25hbHNGcm9tQXR0cmlidXRlcygpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGF0dHIgb2YgQXJyYXkuZnJvbSh0aGlzLmF0dHJpYnV0ZXMpKSB7XG4gICAgICAvLyBNYXRjaCBkYXRhLXNpZ25hbHM6S0VZIG9yIGRhdGEtc3Rhci1zaWduYWxzOktFWSAoYWxpYXNlZCBidW5kbGUpXG4gICAgICBjb25zdCBtID0gYXR0ci5uYW1lLm1hdGNoKC9eZGF0YS0oPzpzdGFyLSk/c2lnbmFsczooLispJC8pXG4gICAgICBpZiAoIW0pIGNvbnRpbnVlXG4gICAgICBjb25zdCBrZXkgPSBtWzFdIVxuICAgICAgICAucmVwbGFjZSgvLShbYS16XSkvZywgKF8sIGNoOiBzdHJpbmcpID0+IGNoLnRvVXBwZXJDYXNlKCkpIC8vIGtlYmFiLWNhc2UgXHUyMTkyIGNhbWVsQ2FzZVxuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gRXZhbHVhdGUgdGhlIGF0dHJpYnV0ZSB2YWx1ZSBhcyBhIEpTIGV4cHJlc3Npb24gKHNhbWUgYXMgRGF0YXN0YXIgZG9lcylcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLW5ldy1mdW5jXG4gICAgICAgIGNvbnN0IHZhbHVlID0gbmV3IEZ1bmN0aW9uKGByZXR1cm4gKCR7YXR0ci52YWx1ZX0pYCkoKVxuICAgICAgICB0aGlzLl9zaWduYWxzLnNldChrZXksIHZhbHVlKVxuICAgICAgICBjb25zb2xlLmxvZyhgW0xFU10gc2VlZGVkICQke2tleX0gPWAsIHZhbHVlKVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIElmIGl0IGZhaWxzLCBzdG9yZSB0aGUgcmF3IHN0cmluZyB2YWx1ZVxuICAgICAgICB0aGlzLl9zaWduYWxzLnNldChrZXksIGF0dHIudmFsdWUpXG4gICAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSBzZWVkZWQgJCR7a2V5fSA9IChyYXcpYCwgYXR0ci52YWx1ZSlcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9nZXRTaWduYWwobmFtZTogc3RyaW5nKTogdW5rbm93biB7XG4gICAgLy8gUGhhc2UgNjogcHJlZmVyIERhdGFzdGFyIHNpZ25hbCB0cmVlIHdoZW4gYnJpZGdlIGlzIGNvbm5lY3RlZFxuICAgIGlmICh0aGlzLl9kc1NpZ25hbCkge1xuICAgICAgdHJ5IHsgcmV0dXJuIHRoaXMuX2RzU2lnbmFsKG5hbWUpLnZhbHVlIH0gY2F0Y2ggeyAvKiBmYWxsIHRocm91Z2ggKi8gfVxuICAgIH1cbiAgICAvLyBUcnkgZXhhY3QgY2FzZSBmaXJzdCAoZS5nLiBEYXRhc3Rhci1zZXQgc2lnbmFscyBhcmUgY2FtZWxDYXNlKS5cbiAgICAvLyBGYWxsIGJhY2sgdG8gbG93ZXJjYXNlIGJlY2F1c2UgSFRNTCBub3JtYWxpemVzIGF0dHJpYnV0ZSBuYW1lcyB0byBsb3dlcmNhc2UsXG4gICAgLy8gc28gZGF0YS1zaWduYWxzOmludHJvU3RhdGUgXHUyMTkyIHNlZWRlZCBhcyBcImludHJvc3RhdGVcIiwgYnV0IGd1YXJkcyByZWZlcmVuY2UgXCIkaW50cm9TdGF0ZVwiLlxuICAgIGlmICh0aGlzLl9zaWduYWxzLmhhcyhuYW1lKSkgcmV0dXJuIHRoaXMuX3NpZ25hbHMuZ2V0KG5hbWUpXG4gICAgaWYgKHRoaXMuX3NpZ25hbHMuaGFzKG5hbWUudG9Mb3dlckNhc2UoKSkpIHJldHVybiB0aGlzLl9zaWduYWxzLmdldChuYW1lLnRvTG93ZXJDYXNlKCkpXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG5cbiAgcHJpdmF0ZSBfc2V0U2lnbmFsKG5hbWU6IHN0cmluZywgdmFsdWU6IHVua25vd24pOiB2b2lkIHtcbiAgICBjb25zdCBwcmV2ID0gdGhpcy5fc2lnbmFscy5nZXQobmFtZSlcbiAgICB0aGlzLl9zaWduYWxzLnNldChuYW1lLCB2YWx1ZSlcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gJCR7bmFtZX0gPWAsIHZhbHVlKVxuXG4gICAgLy8gUGhhc2UgNjogd3JpdGUgdGhyb3VnaCB0byBEYXRhc3RhcidzIHJlYWN0aXZlIGdyYXBoXG4gICAgaWYgKHRoaXMuX2RzU2lnbmFsKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBzaWcgPSB0aGlzLl9kc1NpZ25hbDx1bmtub3duPihuYW1lLCB2YWx1ZSlcbiAgICAgICAgc2lnLnZhbHVlID0gdmFsdWVcbiAgICAgIH0gY2F0Y2ggeyAvKiBzaWduYWwgbWF5IG5vdCBleGlzdCBpbiBEYXRhc3RhciB5ZXQgKi8gfVxuICAgIH1cblxuICAgIC8vIFBoYXNlIDViOiBub3RpZnkgbG9jYWwgc2lnbmFsIHdhdGNoZXJzIChmYWxsYmFjayBwYXRoIHdoZW4gRGF0YXN0YXIgYWJzZW50KVxuICAgIGlmIChwcmV2ICE9PSB2YWx1ZSAmJiB0aGlzLl93aXJpbmcgJiYgdGhpcy5fY3R4ICYmICF0aGlzLl9kc0VmZmVjdCkge1xuICAgICAgbm90aWZ5U2lnbmFsV2F0Y2hlcnMobmFtZSwgdGhpcy5fd2lyaW5nLndhdGNoZXJzLCAoKSA9PiB0aGlzLl9jdHghKVxuICAgIH1cbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBNb2R1bGUgbG9hZGluZyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwcml2YXRlIGFzeW5jIF9sb2FkTW9kdWxlcyhjb25maWc6IExFU0NvbmZpZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmIChjb25maWcubW9kdWxlcy5sZW5ndGggPT09IDApIHJldHVyblxuICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgY29uZmlnLm1vZHVsZXMubWFwKGRlY2wgPT5cbiAgICAgICAgbG9hZE1vZHVsZSh0aGlzLm1vZHVsZXMsIHtcbiAgICAgICAgICAuLi4oZGVjbC50eXBlID8geyB0eXBlOiBkZWNsLnR5cGUgfSA6IHt9KSxcbiAgICAgICAgICAuLi4oZGVjbC5zcmMgID8geyBzcmM6ICBkZWNsLnNyYyAgfSA6IHt9KSxcbiAgICAgICAgfSkuY2F0Y2goZXJyID0+IGNvbnNvbGUud2FybignW0xFU10gTW9kdWxlIGxvYWQgZmFpbGVkOicsIGVycikpXG4gICAgICApXG4gICAgKVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFBhcnNlIGFsbCBib2RpZXMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBfcGFyc2VBbGwoY29uZmlnOiBMRVNDb25maWcpOiBQYXJzZWRXaXJpbmcge1xuICAgIGxldCBvayA9IDAsIGZhaWwgPSAwXG5cbiAgICBjb25zdCB0cnlQYXJzZSA9IChib2R5OiBzdHJpbmcsIGxhYmVsOiBzdHJpbmcpOiBMRVNOb2RlID0+IHtcbiAgICAgIHRyeSB7IG9rKys7IHJldHVybiBwYXJzZUxFUyhib2R5KSB9XG4gICAgICBjYXRjaCAoZSkge1xuICAgICAgICBmYWlsKytcbiAgICAgICAgY29uc29sZS5lcnJvcihgW0xFU10gUGFyc2UgZXJyb3IgaW4gJHtsYWJlbH06YCwgZSlcbiAgICAgICAgcmV0dXJuIHsgdHlwZTogJ2V4cHInLCByYXc6ICcnIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCB3aXJpbmc6IFBhcnNlZFdpcmluZyA9IHtcbiAgICAgIGNvbW1hbmRzOiBjb25maWcuY29tbWFuZHMubWFwKGQgPT4gKHtcbiAgICAgICAgbmFtZTogZC5uYW1lLCBndWFyZDogZC5ndWFyZCwgYXJnc1JhdzogZC5hcmdzUmF3LFxuICAgICAgICBib2R5OiB0cnlQYXJzZShkLmJvZHksIGBjb21tYW5kIFwiJHtkLm5hbWV9XCJgKSxcbiAgICAgIH0pKSxcbiAgICAgIGhhbmRsZXJzOiBjb25maWcub25FdmVudC5tYXAoZCA9PiAoe1xuICAgICAgICBldmVudDogZC5uYW1lLFxuICAgICAgICBib2R5OiB0cnlQYXJzZShkLmJvZHksIGBvbi1ldmVudCBcIiR7ZC5uYW1lfVwiYCksXG4gICAgICB9KSksXG4gICAgICB3YXRjaGVyczogY29uZmlnLm9uU2lnbmFsLm1hcChkID0+ICh7XG4gICAgICAgIHNpZ25hbDogZC5uYW1lLCB3aGVuOiBkLndoZW4sXG4gICAgICAgIGJvZHk6IHRyeVBhcnNlKGQuYm9keSwgYG9uLXNpZ25hbCBcIiR7ZC5uYW1lfVwiYCksXG4gICAgICB9KSksXG4gICAgICBsaWZlY3ljbGU6IHtcbiAgICAgICAgb25Mb2FkOiAgY29uZmlnLm9uTG9hZC5tYXAoZCA9PiB0cnlQYXJzZShkLmJvZHksICdvbi1sb2FkJykpLFxuICAgICAgICBvbkVudGVyOiBjb25maWcub25FbnRlci5tYXAoZCA9PiAoeyB3aGVuOiBkLndoZW4sIGJvZHk6IHRyeVBhcnNlKGQuYm9keSwgJ29uLWVudGVyJykgfSkpLFxuICAgICAgICBvbkV4aXQ6ICBjb25maWcub25FeGl0Lm1hcChkID0+IHRyeVBhcnNlKGQuYm9keSwgJ29uLWV4aXQnKSksXG4gICAgICB9LFxuICAgIH1cblxuICAgIGNvbnN0IHRvdGFsID0gb2sgKyBmYWlsXG4gICAgY29uc29sZS5sb2coYFtMRVNdIHBhcnNlcjogJHtva30vJHt0b3RhbH0gYm9kaWVzIHBhcnNlZCBzdWNjZXNzZnVsbHkke2ZhaWwgPiAwID8gYCAoJHtmYWlsfSBlcnJvcnMpYCA6ICcnfWApXG4gICAgcmV0dXJuIHdpcmluZ1xuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIERhdGFzdGFyIGJyaWRnZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBjb25uZWN0RGF0YXN0YXIoZm5zOiB7XG4gICAgZWZmZWN0OiAoZm46ICgpID0+IHZvaWQpID0+IHZvaWRcbiAgICBzaWduYWw6IDxUPihuYW1lOiBzdHJpbmcsIGluaXQ/OiBUKSA9PiB7IHZhbHVlOiBUIH1cbiAgfSk6IHZvaWQge1xuICAgIHRoaXMuX2RzRWZmZWN0ID0gZm5zLmVmZmVjdFxuICAgIHRoaXMuX2RzU2lnbmFsID0gZm5zLnNpZ25hbFxuICAgIGNvbnNvbGUubG9nKCdbTEVTXSBEYXRhc3RhciBicmlkZ2UgY29ubmVjdGVkJywgdGhpcy5pZClcbiAgfVxuXG4gIGRpc2Nvbm5lY3REYXRhc3RhcigpOiB2b2lkIHtcbiAgICB0aGlzLl9kc0VmZmVjdCA9IHVuZGVmaW5lZFxuICAgIHRoaXMuX2RzU2lnbmFsID0gdW5kZWZpbmVkXG4gIH1cblxuICBnZXQgZHNFZmZlY3QoKSB7IHJldHVybiB0aGlzLl9kc0VmZmVjdCB9XG4gIGdldCBkc1NpZ25hbCgpICB7IHJldHVybiB0aGlzLl9kc1NpZ25hbCB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFB1YmxpYyBBUEkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgLyoqIEZpcmUgYSBuYW1lZCBsb2NhbCBldmVudCBpbnRvIHRoaXMgTEVTIGluc3RhbmNlIGZyb20gb3V0c2lkZS4gKi9cbiAgZmlyZShldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10gPSBbXSk6IHZvaWQge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoZXZlbnQsIHtcbiAgICAgIGRldGFpbDogeyBwYXlsb2FkIH0sIGJ1YmJsZXM6IGZhbHNlLCBjb21wb3NlZDogZmFsc2UsXG4gICAgfSkpXG4gIH1cblxuICAvKiogQ2FsbCBhIGNvbW1hbmQgYnkgbmFtZSBmcm9tIG91dHNpZGUgKGUuZy4gYnJvd3NlciBjb25zb2xlLCB0ZXN0cykuICovXG4gIGFzeW5jIGNhbGwoY29tbWFuZDogc3RyaW5nLCBhcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLl9jdHgpIHsgY29uc29sZS53YXJuKCdbTEVTXSBub3QgaW5pdGlhbGl6ZWQgeWV0Jyk7IHJldHVybiB9XG4gICAgY29uc3QgeyBydW5Db21tYW5kIH0gPSBhd2FpdCBpbXBvcnQoJ0BydW50aW1lL2V4ZWN1dG9yLmpzJylcbiAgICBhd2FpdCBydW5Db21tYW5kKGNvbW1hbmQsIGFyZ3MsIHRoaXMuX2N0eClcbiAgfVxuXG4gIC8qKiBSZWFkIGEgc2lnbmFsIHZhbHVlIGRpcmVjdGx5IChmb3IgZGVidWdnaW5nKS4gKi9cbiAgc2lnbmFsKG5hbWU6IHN0cmluZyk6IHVua25vd24ge1xuICAgIHJldHVybiB0aGlzLl9nZXRTaWduYWwobmFtZSlcbiAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ2xvY2FsLWV2ZW50LXNjcmlwdCcsIExvY2FsRXZlbnRTY3JpcHQpXG4iLCAiLyoqXG4gKiA8bG9jYWwtY29tbWFuZD4gXHUyMDE0IGRlZmluZXMgYSBuYW1lZCwgY2FsbGFibGUgY29tbWFuZCB3aXRoaW4gYSA8bG9jYWwtZXZlbnQtc2NyaXB0Pi5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBuYW1lICAgIFJlcXVpcmVkLiBDb21tYW5kIG5hbWUsIGNvbG9uLW5hbWVzcGFjZWQ6IFwiZmVlZDpmZXRjaFwiXG4gKiAgIGFyZ3MgICAgT3B0aW9uYWwuIFR5cGVkIGFyZ3VtZW50IGxpc3Q6IFwiW2Zyb206c3RyICB0bzpzdHJdXCJcbiAqICAgZ3VhcmQgICBPcHRpb25hbC4gSlMgZXhwcmVzc2lvbiBcdTIwMTQgZmFsc3kgPSBzaWxlbnQgbm8tb3AsIG5vIHJlc2N1ZS9hZnRlcndhcmRzXG4gKiAgIGRvICAgICAgUmVxdWlyZWQuIExFUyBib2R5IChiYWNrdGljay1xdW90ZWQgZm9yIG11bHRpLWxpbmUpXG4gKlxuICogVGhpcyBlbGVtZW50IGlzIHB1cmVseSBkZWNsYXJhdGl2ZSBcdTIwMTQgaXQgaG9sZHMgZGF0YS5cbiAqIFRoZSBob3N0IDxsb2NhbC1ldmVudC1zY3JpcHQ+IHJlYWRzIGl0IGR1cmluZyBQaGFzZSAxIGFuZCByZWdpc3RlcnNcbiAqIHRoZSBwYXJzZWQgQ29tbWFuZERlZiBpbiBpdHMgQ29tbWFuZFJlZ2lzdHJ5LlxuICpcbiAqIE5vdGU6IDxjb21tYW5kPiB3YXMgYSBkZXByZWNhdGVkIEhUTUw1IGVsZW1lbnQgXHUyMDE0IHdlIHVzZSA8bG9jYWwtY29tbWFuZD5cbiAqIHRvIHNhdGlzZnkgdGhlIGN1c3RvbSBlbGVtZW50IGh5cGhlbiByZXF1aXJlbWVudCBhbmQgYXZvaWQgdGhlIGNvbGxpc2lvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIExvY2FsQ29tbWFuZCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEF0dHJpYnV0ZSBhY2Nlc3NvcnMgKHR5cGVkLCB0cmltbWVkKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBnZXQgY29tbWFuZE5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICAvKiogUmF3IGFyZ3Mgc3RyaW5nIGUuZy4gXCJbZnJvbTpzdHIgIHRvOnN0cl1cIiBcdTIwMTQgcGFyc2VkIGJ5IFBoYXNlIDIgKi9cbiAgZ2V0IGFyZ3NSYXcoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ2FyZ3MnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICAvKiogR3VhcmQgZXhwcmVzc2lvbiBzdHJpbmcgXHUyMDE0IGV2YWx1YXRlZCBieSBydW50aW1lIGJlZm9yZSBleGVjdXRpb24gKi9cbiAgZ2V0IGd1YXJkRXhwcigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ2d1YXJkJyk/LnRyaW0oKSA/PyBudWxsXG4gIH1cblxuICAvKiogUmF3IExFUyBib2R5IFx1MjAxNCBtYXkgYmUgYmFja3RpY2std3JhcHBlZCBmb3IgbXVsdGktbGluZSAqL1xuICBnZXQgZG9Cb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdkbycpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIC8vIFBoYXNlIDA6IHZlcmlmeSBlbGVtZW50IGlzIHJlY29nbml6ZWQuXG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxsb2NhbC1jb21tYW5kPiByZWdpc3RlcmVkOicsIHRoaXMuY29tbWFuZE5hbWUgfHwgJyh1bm5hbWVkKScpXG4gIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdsb2NhbC1jb21tYW5kJywgTG9jYWxDb21tYW5kKVxuIiwgIi8qKlxuICogPG9uLWV2ZW50PiBcdTIwMTQgc3Vic2NyaWJlcyB0byBhIG5hbWVkIEN1c3RvbUV2ZW50IGRpc3BhdGNoZWQgd2l0aGluIHRoZSBMRVMgaG9zdC5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBuYW1lICAgIFJlcXVpcmVkLiBFdmVudCBuYW1lOiBcImZlZWQ6aW5pdFwiLCBcIml0ZW06ZGlzbWlzc2VkXCJcbiAqICAgaGFuZGxlICBSZXF1aXJlZC4gTEVTIGJvZHkgXHUyMDE0IHNpbmdsZS1saW5lIChubyBiYWNrdGlja3MpIG9yIG11bHRpLWxpbmUgKGJhY2t0aWNrcylcbiAqXG4gKiBQaGFzZSA0IHdpcmVzIGEgQ3VzdG9tRXZlbnQgbGlzdGVuZXIgb24gdGhlIGhvc3QgZWxlbWVudC5cbiAqIEV2ZW50cyBmaXJlZCBieSBgZW1pdGAgbmV2ZXIgYnViYmxlOyBvbmx5IGhhbmRsZXJzIHdpdGhpbiB0aGUgc2FtZVxuICogPGxvY2FsLWV2ZW50LXNjcmlwdD4gc2VlIHRoZW0uIFVzZSBgYnJvYWRjYXN0YCB0byBjcm9zcyB0aGUgYm91bmRhcnkuXG4gKi9cbmV4cG9ydCBjbGFzcyBPbkV2ZW50IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBnZXQgZXZlbnROYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCduYW1lJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgLyoqIFJhdyBMRVMgaGFuZGxlIGJvZHkgKi9cbiAgZ2V0IGhhbmRsZUJvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ2hhbmRsZScpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8b24tZXZlbnQ+IHJlZ2lzdGVyZWQ6JywgdGhpcy5ldmVudE5hbWUgfHwgJyh1bm5hbWVkKScpXG4gIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1ldmVudCcsIE9uRXZlbnQpXG4iLCAiLyoqXG4gKiA8b24tc2lnbmFsPiBcdTIwMTQgcmVhY3RzIHdoZW5ldmVyIGEgbmFtZWQgRGF0YXN0YXIgc2lnbmFsIGNoYW5nZXMgdmFsdWUuXG4gKlxuICogQXR0cmlidXRlczpcbiAqICAgbmFtZSAgICBSZXF1aXJlZC4gU2lnbmFsIHJlZmVyZW5jZTogXCIkZmVlZFN0YXRlXCIsIFwiJGZlZWRJdGVtc1wiXG4gKiAgIHdoZW4gICAgT3B0aW9uYWwuIEd1YXJkIGV4cHJlc3Npb24gXHUyMDE0IG9ubHkgZmlyZXMgaGFuZGxlIHdoZW4gdHJ1dGh5XG4gKiAgIGhhbmRsZSAgUmVxdWlyZWQuIExFUyBib2R5XG4gKlxuICogUGhhc2UgNiB3aXJlcyB0aGlzIHRvIERhdGFzdGFyJ3MgZWZmZWN0KCkgc3lzdGVtLlxuICogVW50aWwgRGF0YXN0YXIgaXMgY29ubmVjdGVkLCBmYWxscyBiYWNrIHRvIHBvbGxpbmcgKFBoYXNlIDYgZGVjaWRlcykuXG4gKlxuICogVGhlIGB3aGVuYCBndWFyZCBpcyByZS1ldmFsdWF0ZWQgb24gZXZlcnkgc2lnbmFsIGNoYW5nZS5cbiAqIEd1YXJkIGZhaWx1cmUgaXMgbm90IGFuIGVycm9yIFx1MjAxNCB0aGUgaGFuZGxlIHNpbXBseSBkb2VzIG5vdCBydW4uXG4gKi9cbmV4cG9ydCBjbGFzcyBPblNpZ25hbCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgLyoqIFNpZ25hbCBuYW1lIGluY2x1ZGluZyAkIHByZWZpeDogXCIkZmVlZFN0YXRlXCIgKi9cbiAgZ2V0IHNpZ25hbE5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICAvKiogU2lnbmFsIG5hbWUgd2l0aG91dCAkIHByZWZpeCwgZm9yIERhdGFzdGFyIEFQSSBjYWxscyAqL1xuICBnZXQgc2lnbmFsS2V5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuc2lnbmFsTmFtZS5yZXBsYWNlKC9eXFwkLywgJycpXG4gIH1cblxuICBnZXQgd2hlbkV4cHIoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCd3aGVuJyk/LnRyaW0oKSA/PyBudWxsXG4gIH1cblxuICBnZXQgaGFuZGxlQm9keSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnaGFuZGxlJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxvbi1zaWduYWw+IHJlZ2lzdGVyZWQ6JywgdGhpcy5zaWduYWxOYW1lIHx8ICcodW5uYW1lZCknKVxuICB9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnb24tc2lnbmFsJywgT25TaWduYWwpXG4iLCAiLyoqXG4gKiA8b24tbG9hZD4gXHUyMDE0IGZpcmVzIGl0cyBgcnVuYCBib2R5IG9uY2Ugd2hlbiB0aGUgaG9zdCBjb25uZWN0cyB0byB0aGUgRE9NLlxuICpcbiAqIFRpbWluZzogaWYgZG9jdW1lbnQucmVhZHlTdGF0ZSA9PT0gJ2NvbXBsZXRlJywgZmlyZXMgaW1tZWRpYXRlbHkgaW5cbiAqIGNvbm5lY3RlZENhbGxiYWNrICh2aWEgcXVldWVNaWNyb3Rhc2spLiBPdGhlcndpc2Ugd2FpdHMgZm9yIERPTUNvbnRlbnRMb2FkZWQuXG4gKlxuICogUnVsZTogbGlmZWN5Y2xlIGhvb2tzIGFsd2F5cyBmaXJlIGV2ZW50cyAoYGVtaXRgKSwgbmV2ZXIgY2FsbCBjb21tYW5kcyBkaXJlY3RseS5cbiAqIFRoaXMga2VlcHMgdGhlIHN5c3RlbSB0cmFjZWFibGUgXHUyMDE0IGV2ZXJ5IGNvbW1hbmQgaW52b2NhdGlvbiBoYXMgYW4gZXZlbnQgaW4gaXRzIGhpc3RvcnkuXG4gKlxuICogQXR0cmlidXRlczpcbiAqICAgcnVuICAgUmVxdWlyZWQuIFNpbmdsZS1saW5lIExFUyBib2R5ICh1c3VhbGx5IGp1c3QgYGVtaXQgZXZlbnQ6bmFtZWApXG4gKi9cbmV4cG9ydCBjbGFzcyBPbkxvYWQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIGdldCBydW5Cb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdydW4nKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPG9uLWxvYWQ+IHJlZ2lzdGVyZWQsIHJ1bjonLCB0aGlzLnJ1bkJvZHkpXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogPG9uLWVudGVyPiBcdTIwMTQgZmlyZXMgd2hlbiB0aGUgaG9zdCA8bG9jYWwtZXZlbnQtc2NyaXB0PiBlbnRlcnMgdGhlIHZpZXdwb3J0LlxuICpcbiAqIFVzZXMgYSBzaW5nbGUgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgc2hhcmVkIGFjcm9zcyBhbGwgPG9uLWVudGVyPi88b24tZXhpdD5cbiAqIGNoaWxkcmVuIG9mIHRoZSBzYW1lIGhvc3QgKFBoYXNlIDUgY3JlYXRlcyBpdCBvbiB0aGUgaG9zdCBlbGVtZW50KS5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICB3aGVuICBPcHRpb25hbC4gR3VhcmQgZXhwcmVzc2lvbiBcdTIwMTQgb25seSBmaXJlcyBydW4gd2hlbiB0cnV0aHkuXG4gKiAgICAgICAgICBQYXR0ZXJuOiBgd2hlbj1cIiRmZWVkU3RhdGUgPT0gJ3BhdXNlZCdcImBcbiAqICAgcnVuICAgUmVxdWlyZWQuIFNpbmdsZS1saW5lIExFUyBib2R5LlxuICovXG5leHBvcnQgY2xhc3MgT25FbnRlciBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgZ2V0IHdoZW5FeHByKCk6IHN0cmluZyB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnd2hlbicpPy50cmltKCkgPz8gbnVsbFxuICB9XG5cbiAgZ2V0IHJ1bkJvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8b24tZW50ZXI+IHJlZ2lzdGVyZWQsIHdoZW46JywgdGhpcy53aGVuRXhwciA/PyAnYWx3YXlzJylcbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiA8b24tZXhpdD4gXHUyMDE0IGZpcmVzIHdoZW4gdGhlIGhvc3QgPGxvY2FsLWV2ZW50LXNjcmlwdD4gZXhpdHMgdGhlIHZpZXdwb3J0LlxuICpcbiAqIE5vIGB3aGVuYCBndWFyZCBcdTIwMTQgZXhpdCBhbHdheXMgZmlyZXMgdW5jb25kaXRpb25hbGx5LlxuICogKElmIHlvdSBuZWVkIGNvbmRpdGlvbmFsIGV4aXQgYmVoYXZpb3IsIHB1dCB0aGUgY29uZGl0aW9uIGluIHRoZSBoYW5kbGVyLilcbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBydW4gICBSZXF1aXJlZC4gU2luZ2xlLWxpbmUgTEVTIGJvZHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBPbkV4aXQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIGdldCBydW5Cb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdydW4nKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPG9uLWV4aXQ+IHJlZ2lzdGVyZWQsIHJ1bjonLCB0aGlzLnJ1bkJvZHkpXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFJlZ2lzdHJhdGlvbiBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1sb2FkJywgIE9uTG9hZClcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnb24tZW50ZXInLCBPbkVudGVyKVxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1leGl0JywgIE9uRXhpdClcbiIsICIvKipcbiAqIDx1c2UtbW9kdWxlPiBcdTIwMTQgZGVjbGFyZXMgYSB2b2NhYnVsYXJ5IGV4dGVuc2lvbiBhdmFpbGFibGUgdG8gPGxvY2FsLWNvbW1hbmQ+IGJvZGllcy5cbiAqXG4gKiBNdXN0IGFwcGVhciBiZWZvcmUgYW55IDxsb2NhbC1jb21tYW5kPiBpbiB0aGUgPGxvY2FsLWV2ZW50LXNjcmlwdD4uXG4gKiBUaGUgaG9zdCByZWFkcyA8dXNlLW1vZHVsZT4gY2hpbGRyZW4gZmlyc3QgKFBoYXNlIDgpIGFuZCByZWdpc3RlcnNcbiAqIHRoZWlyIHByaW1pdGl2ZXMgaW50byBpdHMgTW9kdWxlUmVnaXN0cnkgYmVmb3JlIHBhcnNpbmcgY29tbWFuZCBib2RpZXMuXG4gKlxuICogQXR0cmlidXRlcyAoaW5kZXBlbmRlbnQsIGNvbWJpbmFibGUpOlxuICogICB0eXBlICAgQnVpbHQtaW4gbW9kdWxlIG5hbWU6IFwiYW5pbWF0aW9uXCJcbiAqICAgc3JjICAgIFVSTC9wYXRoIHRvIGEgdXNlcmxhbmQgbW9kdWxlIEVTIG1vZHVsZTogIFwiLi9zY3JvbGwtZWZmZWN0cy5qc1wiXG4gKiAgICAgICAgICBUaGUgbW9kdWxlIG11c3QgZXhwb3J0IGEgZGVmYXVsdCBjb25mb3JtaW5nIHRvIExFU01vZHVsZTpcbiAqICAgICAgICAgIHsgbmFtZTogc3RyaW5nLCBwcmltaXRpdmVzOiBSZWNvcmQ8c3RyaW5nLCBMRVNQcmltaXRpdmU+IH1cbiAqXG4gKiBFeGFtcGxlczpcbiAqICAgPHVzZS1tb2R1bGUgdHlwZT1cImFuaW1hdGlvblwiPjwvdXNlLW1vZHVsZT5cbiAqICAgPHVzZS1tb2R1bGUgc3JjPVwiLi9zY3JvbGwtZWZmZWN0cy5qc1wiPjwvdXNlLW1vZHVsZT5cbiAqICAgPHVzZS1tb2R1bGUgc3JjPVwiLi9zcHJpbmctcGh5c2ljcy5qc1wiPjwvdXNlLW1vZHVsZT5cbiAqXG4gKiB0eXBlPSBhbmQgc3JjPSBtYXkgYXBwZWFyIHRvZ2V0aGVyIG9uIG9uZSBlbGVtZW50IGlmIHRoZSB1c2VybGFuZCBtb2R1bGVcbiAqIHdhbnRzIHRvIGRlY2xhcmUgaXRzIHR5cGUgaGludCBmb3IgdG9vbGluZyAobm90IGN1cnJlbnRseSByZXF1aXJlZCkuXG4gKi9cbmV4cG9ydCBjbGFzcyBVc2VNb2R1bGUgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIC8qKiBCdWlsdC1pbiBtb2R1bGUgdHlwZSBlLmcuIFwiYW5pbWF0aW9uXCIgKi9cbiAgZ2V0IG1vZHVsZVR5cGUoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCd0eXBlJyk/LnRyaW0oKSA/PyBudWxsXG4gIH1cblxuICAvKiogVXNlcmxhbmQgbW9kdWxlIFVSTCBlLmcuIFwiLi9zY3JvbGwtZWZmZWN0cy5qc1wiICovXG4gIGdldCBtb2R1bGVTcmMoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdzcmMnKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnN0IGRlc2MgPSB0aGlzLm1vZHVsZVR5cGVcbiAgICAgID8gYHR5cGU9XCIke3RoaXMubW9kdWxlVHlwZX1cImBcbiAgICAgIDogdGhpcy5tb2R1bGVTcmNcbiAgICAgICAgPyBgc3JjPVwiJHt0aGlzLm1vZHVsZVNyY31cImBcbiAgICAgICAgOiAnKG5vIHR5cGUgb3Igc3JjKSdcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPHVzZS1tb2R1bGU+IGRlY2xhcmVkOicsIGRlc2MpXG4gIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCd1c2UtbW9kdWxlJywgVXNlTW9kdWxlKVxuIiwgIi8qKlxuICogUGhhc2UgNjogRGF0YXN0YXIgYXR0cmlidXRlIHBsdWdpblxuICpcbiAqIFJlZ2lzdGVycyA8bG9jYWwtZXZlbnQtc2NyaXB0PiBhcyBhIERhdGFzdGFyIGF0dHJpYnV0ZSBwbHVnaW4gc28gdGhhdDpcbiAqXG4gKiAgIDEuIERhdGFzdGFyJ3MgZWZmZWN0KCkgYW5kIHNpZ25hbCgpIHByaW1pdGl2ZXMgYXJlIGhhbmRlZCB0byB0aGUgaG9zdFxuICogICAgICBlbGVtZW50LCBlbmFibGluZyBwcm9wZXIgcmVhY3RpdmUgc2lnbmFsIHdhdGNoaW5nIHZpYSB0aGUgZGVwZW5kZW5jeVxuICogICAgICBncmFwaCByYXRoZXIgdGhhbiBtYW51YWwgbm90aWZpY2F0aW9uLlxuICpcbiAqICAgMi4gU2lnbmFsIHdyaXRlcyBmcm9tIGBzZXQgJHggdG8geWAgaW4gTEVTIHByb3BhZ2F0ZSBpbnRvIERhdGFzdGFyJ3NcbiAqICAgICAgcm9vdCBvYmplY3Qgc28gZGF0YS10ZXh0LCBkYXRhLXNob3csIGV0Yy4gdXBkYXRlIHJlYWN0aXZlbHkuXG4gKlxuICogICAzLiAkLXByZWZpeGVkIHNpZ25hbHMgaW4gTEVTIGV4cHJlc3Npb25zIHJlc29sdmUgZnJvbSBEYXRhc3RhcidzIHJvb3QsXG4gKiAgICAgIGdpdmluZyBMRVMgZnVsbCByZWFkIGFjY2VzcyB0byBhbGwgRGF0YXN0YXIgc3RhdGUuXG4gKlxuICogICA0LiBTaWduYWwgd2F0Y2hlcnMgb24tc2lnbmFsIGFyZSByZS13aXJlZCB0aHJvdWdoIERhdGFzdGFyJ3MgZWZmZWN0KClcbiAqICAgICAgc3lzdGVtIGZvciBwcm9wZXIgYmF0Y2hpbmcgYW5kIGRlZHVwbGljYXRpb24uXG4gKlxuICogTEVTIHdvcmtzIHdpdGhvdXQgRGF0YXN0YXIgKHN0YW5kYWxvbmUgbW9kZSkuIFRoZSBicmlkZ2UgaXMgcHVyZWx5IGFkZGl0aXZlLlxuICovXG5cbmltcG9ydCB0eXBlIHsgTG9jYWxFdmVudFNjcmlwdCB9IGZyb20gJ0BlbGVtZW50cy9Mb2NhbEV2ZW50U2NyaXB0LmpzJ1xuaW1wb3J0IHsgd2lyZVNpZ25hbFdhdGNoZXJWaWFEYXRhc3RhciB9IGZyb20gJ0BydW50aW1lL3NpZ25hbHMuanMnXG5cbmxldCBicmlkZ2VSZWdpc3RlcmVkID0gZmFsc2VcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlZ2lzdGVyRGF0YXN0YXJCcmlkZ2UoKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChicmlkZ2VSZWdpc3RlcmVkKSByZXR1cm5cblxuICB0cnkge1xuICAgIGNvbnN0IGRhdGFzdGFyID0gYXdhaXQgaW1wb3J0KCdkYXRhc3RhcicpXG4gICAgY29uc3QgeyBhdHRyaWJ1dGUgfSA9IGRhdGFzdGFyXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgUmVnaXN0ZXIgYXMgYSBEYXRhc3RhciBhdHRyaWJ1dGUgcGx1Z2luIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIC8vIE1hdGNoZXMgZWxlbWVudHMgd2l0aCBhIGBkYXRhLWxvY2FsLWV2ZW50LXNjcmlwdGAgYXR0cmlidXRlIE9SICh2aWFcbiAgICAvLyBuYW1lIG1hdGNoaW5nKSB0aGUgPGxvY2FsLWV2ZW50LXNjcmlwdD4gY3VzdG9tIGVsZW1lbnQgaXRzZWxmIHdoZW5cbiAgICAvLyBEYXRhc3RhciBzY2FucyB0aGUgRE9NLlxuICAgIC8vXG4gICAgLy8gVGhlIG5hbWUgJ2xvY2FsLWV2ZW50LXNjcmlwdCcgY2F1c2VzIERhdGFzdGFyIHRvIGFwcGx5IHRoaXMgcGx1Z2luXG4gICAgLy8gdG8gYW55IGVsZW1lbnQgd2l0aCBkYXRhLWxvY2FsLWV2ZW50LXNjcmlwdD1cIi4uLlwiIGluIHRoZSBET00uXG4gICAgLy8gV2UgYWxzbyBwYXRjaCA8bG9jYWwtZXZlbnQtc2NyaXB0PiBkaXJlY3RseSBpbiB0aGUgTXV0YXRpb25PYnNlcnZlclxuICAgIC8vIHBhdGggdmlhIHRoZSBob3N0IGVsZW1lbnQncyBjb25uZWN0ZWRDYWxsYmFjay5cbiAgICBhdHRyaWJ1dGUoe1xuICAgICAgbmFtZTogJ2xvY2FsLWV2ZW50LXNjcmlwdCcsXG4gICAgICByZXF1aXJlbWVudDoge1xuICAgICAgICBrZXk6ICdkZW5pZWQnLFxuICAgICAgICB2YWx1ZTogJ2RlbmllZCcsXG4gICAgICB9LFxuICAgICAgYXBwbHkoeyBlbCwgZWZmZWN0LCBzaWduYWwgfSkge1xuICAgICAgICBjb25zdCBob3N0ID0gZWwgYXMgTG9jYWxFdmVudFNjcmlwdFxuXG4gICAgICAgIC8vIFBoYXNlIDZhOiBoYW5kIERhdGFzdGFyJ3MgcmVhY3RpdmUgcHJpbWl0aXZlcyB0byB0aGUgaG9zdFxuICAgICAgICBob3N0LmNvbm5lY3REYXRhc3Rhcih7IGVmZmVjdCwgc2lnbmFsIH0pXG5cbiAgICAgICAgLy8gUGhhc2UgNmI6IGlmIHRoZSBob3N0IGlzIGFscmVhZHkgaW5pdGlhbGl6ZWQgKHdpcmluZyByYW4gYmVmb3JlXG4gICAgICAgIC8vIERhdGFzdGFyIGF0dHJpYnV0ZSBwbHVnaW4gZmlyZWQpLCByZS13aXJlIHNpZ25hbCB3YXRjaGVycyB0aHJvdWdoXG4gICAgICAgIC8vIERhdGFzdGFyJ3MgZWZmZWN0KCkgZm9yIHByb3BlciByZWFjdGl2aXR5XG4gICAgICAgIGNvbnN0IHdpcmluZyA9IGhvc3Qud2lyaW5nXG4gICAgICAgIGlmICh3aXJpbmcgJiYgd2lyaW5nLndhdGNoZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBmb3IgKGNvbnN0IHdhdGNoZXIgb2Ygd2lyaW5nLndhdGNoZXJzKSB7XG4gICAgICAgICAgICB3aXJlU2lnbmFsV2F0Y2hlclZpYURhdGFzdGFyKHdhdGNoZXIsIGVmZmVjdCwgKCkgPT4gaG9zdC5jb250ZXh0ISlcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc29sZS5sb2coYFtMRVM6ZGF0YXN0YXJdIHJlLXdpcmVkICR7d2lyaW5nLndhdGNoZXJzLmxlbmd0aH0gc2lnbmFsIHdhdGNoZXJzIHZpYSBEYXRhc3RhciBlZmZlY3QoKWApXG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZygnW0xFUzpkYXRhc3Rhcl0gYXR0cmlidXRlIHBsdWdpbiBhcHBsaWVkIHRvJywgZWwuaWQgfHwgZWwudGFnTmFtZSlcblxuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgIGhvc3QuZGlzY29ubmVjdERhdGFzdGFyKClcbiAgICAgICAgICBjb25zb2xlLmxvZygnW0xFUzpkYXRhc3Rhcl0gYXR0cmlidXRlIHBsdWdpbiBjbGVhbmVkIHVwJywgZWwuaWQgfHwgZWwudGFnTmFtZSlcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICB9KVxuXG4gICAgYnJpZGdlUmVnaXN0ZXJlZCA9IHRydWVcbiAgICBjb25zb2xlLmxvZygnW0xFUzpkYXRhc3Rhcl0gYnJpZGdlIHJlZ2lzdGVyZWQnKVxuXG4gIH0gY2F0Y2gge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSBydW5uaW5nIGluIHN0YW5kYWxvbmUgbW9kZSAoRGF0YXN0YXIgbm90IGF2YWlsYWJsZSknKVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gU2lnbmFsIGludGVncmF0aW9uIHV0aWxpdGllc1xuLy8gVXNlZCBieSBleGVjdXRvci50cyB3aGVuIERhdGFzdGFyIGlzIHByZXNlbnRcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFJlYWRzIGEgc2lnbmFsIHZhbHVlIGZyb20gRGF0YXN0YXIncyByb290IG9iamVjdC5cbiAqIEZhbGxzIGJhY2sgdG8gdW5kZWZpbmVkIGlmIERhdGFzdGFyIGlzIG5vdCBhdmFpbGFibGUuXG4gKlxuICogVGhpcyBpcyBjYWxsZWQgYnkgdGhlIExFU0NvbnRleHQuZ2V0U2lnbmFsIGZ1bmN0aW9uIHdoZW4gdGhlIERhdGFzdGFyXG4gKiBicmlkZ2UgaXMgY29ubmVjdGVkLCBnaXZpbmcgTEVTIGV4cHJlc3Npb25zIGFjY2VzcyB0byBhbGwgRGF0YXN0YXIgc2lnbmFscy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlYWREYXRhc3RhclNpZ25hbChcbiAgbmFtZTogc3RyaW5nLFxuICBkc1NpZ25hbDogKDxUPihuYW1lOiBzdHJpbmcsIGluaXQ/OiBUKSA9PiB7IHZhbHVlOiBUIH0pIHwgdW5kZWZpbmVkXG4pOiB1bmtub3duIHtcbiAgaWYgKCFkc1NpZ25hbCkgcmV0dXJuIHVuZGVmaW5lZFxuICB0cnkge1xuICAgIHJldHVybiBkc1NpZ25hbChuYW1lKS52YWx1ZVxuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cbn1cblxuLyoqXG4gKiBXcml0ZXMgYSB2YWx1ZSB0byBEYXRhc3RhcidzIHNpZ25hbCB0cmVlLlxuICogVGhpcyB0cmlnZ2VycyBEYXRhc3RhcidzIHJlYWN0aXZlIGdyYXBoIFx1MjAxNCBhbnkgZGF0YS10ZXh0LCBkYXRhLXNob3csXG4gKiBkYXRhLWNsYXNzIGF0dHJpYnV0ZXMgYm91bmQgdG8gdGhpcyBzaWduYWwgd2lsbCB1cGRhdGUgYXV0b21hdGljYWxseS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdyaXRlRGF0YXN0YXJTaWduYWwoXG4gIG5hbWU6IHN0cmluZyxcbiAgdmFsdWU6IHVua25vd24sXG4gIGRzU2lnbmFsOiAoPFQ+KG5hbWU6IHN0cmluZywgaW5pdD86IFQpID0+IHsgdmFsdWU6IFQgfSkgfCB1bmRlZmluZWRcbik6IHZvaWQge1xuICBpZiAoIWRzU2lnbmFsKSByZXR1cm5cbiAgdHJ5IHtcbiAgICBjb25zdCBzaWcgPSBkc1NpZ25hbDx1bmtub3duPihuYW1lLCB2YWx1ZSlcbiAgICBzaWcudmFsdWUgPSB2YWx1ZVxuICB9IGNhdGNoIHtcbiAgICAvLyBTaWduYWwgbWF5IG5vdCBleGlzdCB5ZXQgXHUyMDE0IGl0IHdpbGwgYmUgY3JlYXRlZCBieSBkYXRhLXNpZ25hbHMgb24gdGhlIGhvc3RcbiAgfVxufVxuIiwgIi8qKlxuICogbG9jYWwtZXZlbnQtc2NyaXB0IFx1MjAxNCBtYWluIGVudHJ5IHBvaW50XG4gKlxuICogSW1wb3J0IG9yZGVyIG1hdHRlcnMgZm9yIGN1c3RvbSBlbGVtZW50IHJlZ2lzdHJhdGlvbjpcbiAqICAgMS4gSG9zdCBlbGVtZW50IGZpcnN0IChMb2NhbEV2ZW50U2NyaXB0KVxuICogICAyLiBDaGlsZCBlbGVtZW50cyB0aGF0IHJlZmVyZW5jZSBpdFxuICogICAzLiBEYXRhc3RhciBicmlkZ2UgbGFzdCAob3B0aW9uYWwgXHUyMDE0IGZhaWxzIGdyYWNlZnVsbHkgaWYgRGF0YXN0YXIgYWJzZW50KVxuICpcbiAqIFVzYWdlIHZpYSBpbXBvcnRtYXAgKyBzY3JpcHQgdGFnOlxuICpcbiAqICAgPHNjcmlwdCB0eXBlPVwiaW1wb3J0bWFwXCI+XG4gKiAgICAge1xuICogICAgICAgXCJpbXBvcnRzXCI6IHtcbiAqICAgICAgICAgXCJkYXRhc3RhclwiOiBcImh0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9naC9zdGFyZmVkZXJhdGlvbi9kYXRhc3RhckB2MS4wLjAtUkMuOC9idW5kbGVzL2RhdGFzdGFyLmpzXCJcbiAqICAgICAgIH1cbiAqICAgICB9XG4gKiAgIDwvc2NyaXB0PlxuICogICA8c2NyaXB0IHR5cGU9XCJtb2R1bGVcIiBzcmM9XCIvZGlzdC9sb2NhbC1ldmVudC1zY3JpcHQuanNcIj48L3NjcmlwdD5cbiAqXG4gKiBXaXRob3V0IHRoZSBpbXBvcnRtYXAgKG9yIHdpdGggZGF0YXN0YXIgYWJzZW50KSwgTEVTIHJ1bnMgaW4gc3RhbmRhbG9uZSBtb2RlOlxuICogYWxsIGN1c3RvbSBlbGVtZW50cyB3b3JrLCBEYXRhc3RhciBzaWduYWwgd2F0Y2hpbmcgYW5kIEBhY3Rpb24gcGFzc3Rocm91Z2hcbiAqIGFyZSB1bmF2YWlsYWJsZS5cbiAqL1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgQ3VzdG9tIGVsZW1lbnRzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gRWFjaCBpbXBvcnQgcmVnaXN0ZXJzIGl0cyBlbGVtZW50KHMpIGFzIGEgc2lkZSBlZmZlY3QuXG5cbmV4cG9ydCB7IExvY2FsRXZlbnRTY3JpcHQgfSBmcm9tICdAZWxlbWVudHMvTG9jYWxFdmVudFNjcmlwdC5qcydcbmV4cG9ydCB7IExvY2FsQ29tbWFuZCB9ICAgICBmcm9tICdAZWxlbWVudHMvTG9jYWxDb21tYW5kLmpzJ1xuZXhwb3J0IHsgT25FdmVudCB9ICAgICAgICAgIGZyb20gJ0BlbGVtZW50cy9PbkV2ZW50LmpzJ1xuZXhwb3J0IHsgT25TaWduYWwgfSAgICAgICAgIGZyb20gJ0BlbGVtZW50cy9PblNpZ25hbC5qcydcbmV4cG9ydCB7IE9uTG9hZCwgT25FbnRlciwgT25FeGl0IH0gZnJvbSAnQGVsZW1lbnRzL0xpZmVjeWNsZS5qcydcbmV4cG9ydCB7IFVzZU1vZHVsZSB9ICAgICAgICBmcm9tICdAZWxlbWVudHMvVXNlTW9kdWxlLmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgVHlwZSBleHBvcnRzIChmb3IgVHlwZVNjcmlwdCBjb25zdW1lcnMpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuZXhwb3J0IHR5cGUgeyBMRVNOb2RlIH0gICAgICAgICAgICAgICAgICAgZnJvbSAnQHBhcnNlci9hc3QuanMnXG5leHBvcnQgdHlwZSB7IExFU01vZHVsZSwgTEVTUHJpbWl0aXZlIH0gICBmcm9tICdAbW9kdWxlcy90eXBlcy5qcydcbmV4cG9ydCB0eXBlIHsgQ29tbWFuZERlZiwgQXJnRGVmIH0gICAgICAgIGZyb20gJ0BydW50aW1lL3JlZ2lzdHJ5LmpzJ1xuZXhwb3J0IHsgTEVTU2NvcGUgfSAgICAgICAgICAgICAgICAgICAgICAgZnJvbSAnQHJ1bnRpbWUvc2NvcGUuanMnXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBEYXRhc3RhciBicmlkZ2UgKG9wdGlvbmFsKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIER5bmFtaWMgaW1wb3J0IHNvIHRoZSBidW5kbGUgd29ya3Mgd2l0aG91dCBEYXRhc3RhciBwcmVzZW50LlxuaW1wb3J0IHsgcmVnaXN0ZXJEYXRhc3RhckJyaWRnZSB9IGZyb20gJ0BkYXRhc3Rhci9wbHVnaW4uanMnXG5yZWdpc3RlckRhdGFzdGFyQnJpZGdlKClcbmV4cG9ydCB0eXBlIHsgTEVTQ29uZmlnLCBDb21tYW5kRGVjbCwgRXZlbnRIYW5kbGVyRGVjbCwgU2lnbmFsV2F0Y2hlckRlY2wsXG4gICAgICAgICAgICAgIE9uTG9hZERlY2wsIE9uRW50ZXJEZWNsLCBPbkV4aXREZWNsLCBNb2R1bGVEZWNsIH0gZnJvbSAnQHBhcnNlci9jb25maWcuanMnXG5leHBvcnQgeyByZWFkQ29uZmlnLCBsb2dDb25maWcgfSBmcm9tICdAcGFyc2VyL3JlYWRlci5qcydcbmV4cG9ydCB7IHN0cmlwQm9keSB9ICAgICAgICAgICAgIGZyb20gJ0BwYXJzZXIvc3RyaXBCb2R5LmpzJ1xuZXhwb3J0IHsgcGFyc2VMRVMsIExFU1BhcnNlciwgTEVTUGFyc2VFcnJvciB9IGZyb20gJ0BwYXJzZXIvaW5kZXguanMnXG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7OztBQTBEQSxTQUFTLEtBQUssR0FBbUI7QUFBRSxTQUFPLElBQUksSUFBSSxLQUFLLEtBQUssSUFBSSxJQUFJLE1BQU07QUFBSTtBQUM5RSxTQUFTLEtBQUssR0FBVyxHQUFXLEdBQW1CO0FBQUUsU0FBTyxJQUFJLEtBQUssSUFBSTtBQUFHO0FBQ2hGLFNBQVMsTUFBTSxNQUFjLEdBQVcsR0FBbUI7QUFDekQsUUFBTSxJQUFJLE9BQU87QUFDakIsUUFBTSxJQUFJLElBQUksSUFBSSxJQUFJO0FBQ3RCLFFBQU0sSUFBSSxJQUFJLElBQUksSUFBSTtBQUN0QixVQUFTLElBQUksSUFBSyxDQUFDLElBQUksTUFBTyxJQUFJLElBQUssQ0FBQyxJQUFJO0FBQzlDO0FBR08sU0FBUyxRQUFR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QUFHO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQU07QUFBQSxRQUFFO0FBQUEsUUFDNUQ7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUc7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUM1RDtBQUFBLFFBQUc7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQzNEO0FBQUEsUUFBRztBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFDM0Q7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUM1RDtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQU07QUFBQSxRQUFFO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQzVEO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQU07QUFBQSxRQUFHO0FBQUEsUUFDNUQ7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQU07QUFBQSxRQUFFO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUM1RDtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQzVEO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFNO0FBQUEsUUFBRztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFNO0FBQUEsUUFDOUQ7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUM1RDtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQzNEO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFDNUQ7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQU07QUFBQSxRQUFFO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUM3RDtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLE1BQzlEO0FBQ0EsZUFBUyxJQUFJLEdBQUcsSUFBSSxLQUFLLElBQUssR0FBRSxDQUFDLElBQUksRUFBRSxJQUFJLEdBQUcsSUFBSSxLQUFLLENBQUM7QUFDeEQsYUFBTztBQUFBLElBQ1QsR0FBRztBQWdDSCxJQUFNLGVBQWU7QUFFckIsSUFBTSxlQUFtQztBQUFBLE1BQ3ZDLENBQUMsR0FBRSxDQUFDO0FBQUEsTUFBRSxDQUFDLElBQUcsQ0FBQztBQUFBLE1BQUUsQ0FBQyxHQUFFLEVBQUU7QUFBQSxNQUFFLENBQUMsSUFBRyxFQUFFO0FBQUEsTUFBRSxDQUFDLEdBQUUsQ0FBQztBQUFBLE1BQUUsQ0FBQyxJQUFHLENBQUM7QUFBQSxNQUFFLENBQUMsR0FBRSxDQUFDO0FBQUEsTUFBRSxDQUFDLEdBQUUsRUFBRTtBQUFBLElBQ3REO0FBQ0EsSUFBTSxLQUFLLE9BQU8s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
