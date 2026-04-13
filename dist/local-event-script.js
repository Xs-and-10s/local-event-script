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

// src/modules/builtin/bridge.ts
var bridge_exports = {};
__export(bridge_exports, {
  default: () => bridge_default
});
var bridgeModule, bridge_default;
var init_bridge = __esm({
  "src/modules/builtin/bridge.ts"() {
    "use strict";
    if (!("LESBridge" in globalThis)) {
      ;
      globalThis.LESBridge = /* @__PURE__ */ new Map();
      console.log("[LES:bridge] LESBridge initialized");
    }
    bridgeModule = {
      name: "bridge",
      // No animation primitives — `forward` is handled directly in executor.ts.
      // This module's job is initialization and documentation of the bridge pattern.
      primitives: {}
    };
    bridge_default = bridgeModule;
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
    // ── broadcast event:name [payload] — global (document) ────────────────
    case "broadcast": {
      const n = node;
      const payload = n.payload.map((p) => evalExpr(p, ctx));
      ctx.broadcast(n.event, payload);
      return;
    }
    // ── bubble event:name [payload] — up through all LES ancestors ─────────
    case "bubble": {
      const n = node;
      const payload = n.payload.map((p) => evalExpr(p, ctx));
      ctx.bubble(n.event, payload);
      return;
    }
    // ── cascade event:name [payload] — down to all LES descendants ─────────
    case "cascade": {
      const n = node;
      const payload = n.payload.map((p) => evalExpr(p, ctx));
      ctx.cascade(n.event, payload);
      return;
    }
    // ── forward name [payload] — call registered LESBridge function ────────
    case "forward": {
      const n = node;
      const payload = n.payload.map((p) => evalExpr(p, ctx));
      await ctx.forward(n.name, payload);
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
  // ── Command registry inheritance ──────────────────────────────────────────
  // When a child LES element cannot find a command locally, it walks up to
  // its parent's registry. Set by LocalEventScript._init() once the tree
  // is established. Enables shared commands defined at root, callable from
  // any descendant — like class method inheritance.
  _parent = null;
  setParent(parent) {
    this._parent = parent;
  }
  register(def) {
    if (this.commands.has(def.name)) {
      console.warn(
        `[LES] Duplicate command "${def.name}" \u2014 previous definition overwritten.`,
        def.element
      );
    }
    this.commands.set(def.name, def);
  }
  /** Looks up locally first, then walks up the parent chain. */
  get(name) {
    return this.commands.get(name) ?? this._parent?.get(name);
  }
  /** Returns true if command exists locally (does not check parent). */
  has(name) {
    return this.commands.has(name);
  }
  /** Returns true if command exists locally OR in any ancestor registry. */
  resolves(name) {
    return this.commands.has(name) || (this._parent?.resolves(name) ?? false);
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
  animation: () => Promise.resolve().then(() => (init_animation(), animation_exports)),
  bridge: () => Promise.resolve().then(() => (init_bridge(), bridge_exports))
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
var DEFERRED_CHILDREN = /* @__PURE__ */ new Set([
  "local-event-script",
  "local-bridge"
]);
var VALID_CONFIG_CHILDREN = [
  "<use-module>",
  "<local-command>",
  "<on-event>",
  "<on-signal>",
  "<on-load>",
  "<on-enter>",
  "<on-exit>"
];
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
      continue;
    }
    if (DEFERRED_CHILDREN.has(tag)) continue;
    config.unknown.push(child);
    if (tag.includes("-")) {
      console.warn(
        `[LES] Unknown child element <${tag}> inside <local-event-script id="${config.id}"> \u2014 ignored.
  Config children: ${VALID_CONFIG_CHILDREN.join(", ")}
  Also valid (deferred): <local-event-script>, <local-bridge>`,
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
    if (first === "bubble") return this.parseBubble(text, token);
    if (first === "cascade") return this.parseCascade(text, token);
    if (first === "forward") return this.parseForward(text, token);
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
  parseBubble(text, token) {
    const { name, payload } = parseEventLine(text.slice("bubble".length).trim(), token);
    return { type: "bubble", event: name, payload };
  }
  parseCascade(text, token) {
    const { name, payload } = parseEventLine(text.slice("cascade".length).trim(), token);
    return { type: "cascade", event: name, payload };
  }
  parseForward(text, token) {
    const { name, payload } = parseEventLine(text.slice("forward".length).trim(), token);
    return { type: "forward", name, payload };
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
  const bubble = (event, payload) => {
    console.log(`[LES] bubble "${event}"`, payload.length ? payload : "");
    const docRoot = host.getRootNode();
    const doc = docRoot instanceof Document ? docRoot : docRoot.ownerDocument ?? document;
    let current = host._lesParent;
    while (current) {
      current.dispatchEvent(new CustomEvent(event, {
        detail: { payload, __bubbleOrigin: host },
        bubbles: false,
        composed: false
      }));
      if (current.hasAttribute("auto-relay")) {
        console.log(`[LES] auto-relay "${event}" via #${current.id || "(no id)"}`);
        doc.dispatchEvent(new CustomEvent(event, {
          detail: { payload, __bubbleOrigin: host, __autoRelayOrigin: current },
          bubbles: false,
          composed: false
        }));
      }
      current = current._lesParent;
    }
  };
  const cascade = (event, payload) => {
    console.log(`[LES] cascade "${event}"`, payload.length ? payload : "");
    const visit = (el) => {
      const children = el._lesChildren ?? /* @__PURE__ */ new Set();
      for (const child of children) {
        child.dispatchEvent(new CustomEvent(event, {
          detail: { payload, __cascadeOrigin: host },
          bubbles: false,
          composed: false
        }));
        visit(child);
      }
    };
    visit(host);
  };
  const forward = async (name, payload) => {
    const registry = globalThis.LESBridge;
    if (!registry) {
      console.warn(`[LES] forward "${name}": LESBridge not initialized. Add <use-module type="bridge"> or set window.LESBridge before LES init.`);
      return;
    }
    const fn = registry.get(name);
    if (!fn) {
      console.warn(`[LES] forward "${name}": no bridge registered. Available: [${[...registry.keys()].join(", ")}]`);
      return;
    }
    console.log(`[LES] forward "${name}"`, payload.length ? payload : "");
    const result = fn(...payload);
    if (result instanceof Promise) await result;
  };
  return {
    scope,
    host,
    commands,
    modules,
    getSignal: signals.get,
    setSignal: signals.set,
    emitLocal,
    broadcast,
    bubble,
    cascade,
    forward
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
      if (detail.__autoRelayOrigin === host) return;
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
  // ── Pre-init event queue ──────────────────────────────────────────────────
  // Events fired via fire() before _init() completes wiring are queued here
  // and replayed immediately after wireEventHandlers() runs. This prevents
  // events from being silently dropped during the startup window.
  _preInitQueue = [];
  _initComplete = false;
  // ── Phase 2: LES tree wiring ───────────────────────────────────────────────
  // Parent reference set synchronously in connectedCallback (before microtask)
  // so the parent's _init() sees this child in _lesChildren when it runs.
  // Public so wiring.ts can traverse the tree for bubble/cascade without importing
  // LocalEventScript (which would create a circular module dependency).
  _lesParent = null;
  _lesChildren = /* @__PURE__ */ new Set();
  // Resolves when _init() completes (including children's lesReady).
  // Parent's _init() awaits this before firing its own on-load, creating
  // bottom-up initialization: leaves fire on-load first, root fires last.
  lesReady;
  _resolveReady;
  constructor() {
    super();
    this.lesReady = new Promise((resolve) => {
      this._resolveReady = resolve;
    });
    if (!("LESBridge" in globalThis)) {
      ;
      globalThis.LESBridge = /* @__PURE__ */ new Map();
    }
  }
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
    this._initComplete = false;
    const parentLES = this.parentElement?.closest("local-event-script");
    this._lesParent = parentLES ?? null;
    parentLES?._lesChildren.add(this);
    queueMicrotask(() => this._init());
  }
  disconnectedCallback() {
    this._lesParent?._lesChildren.delete(this);
    this._lesParent = null;
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
    this.commands.setParent(this._lesParent?.commands ?? null);
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
    this._initComplete = true;
    if (this._preInitQueue.length > 0) {
      const queued = this._preInitQueue.splice(0);
      console.log(`[LES] ${this.id || "(no id)"}: draining ${queued.length} pre-init event(s)`);
      for (const { event, payload } of queued) {
        this.fire(event, payload);
      }
    }
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
    this._registerLocalBridges();
    const childPromises = [...this._lesChildren].map((c) => c.lesReady);
    if (childPromises.length > 0) {
      let _timeoutId;
      const timeout = new Promise((resolve) => {
        _timeoutId = setTimeout(() => {
          console.warn(`[LES] ${this.id || "(no id)"}: not all children signalled ready within 3s \u2014 proceeding anyway`);
          resolve();
        }, 3e3);
      });
      await Promise.race([
        Promise.allSettled(childPromises).then(() => clearTimeout(_timeoutId)),
        timeout
      ]);
    }
    await fireOnLoad(this._wiring, () => this._ctx);
    this._resolveReady();
    console.log("[LES] ready:", this.id || "(no id)");
    if (this._lesParent) {
      this._lesParent.dispatchEvent(new CustomEvent("les:child-ready", {
        detail: { payload: [this.id || ""] },
        bubbles: false,
        composed: false
      }));
    }
  }
  _teardown() {
    console.log("[LES] <local-event-script> disconnected", this.id || "(no id)");
    for (const cleanup of this._cleanups) cleanup();
    this._cleanups = [];
    this._config = null;
    this._wiring = null;
    this._ctx = null;
    this._initComplete = false;
    this._preInitQueue = [];
  }
  // ─── Local bridge registration ───────────────────────────────────────────
  /**
   * Reads <local-bridge name="exitSplash" fn="window.exitSplash"> children
   * and registers them in the global LESBridge Map.
   * Called after module loading so `<use-module type="bridge">` has run first.
   */
  _registerLocalBridges() {
    const registry = globalThis.LESBridge;
    if (!registry) return;
    for (const child of Array.from(this.children)) {
      if (child.tagName.toLowerCase() !== "local-bridge") continue;
      const name = child.getAttribute("name")?.trim();
      const fnExpr = child.getAttribute("fn")?.trim();
      if (!name || !fnExpr) {
        console.warn("[LES] <local-bridge> requires both name= and fn= attributes", child);
        continue;
      }
      const capturedExpr = fnExpr;
      const capturedName = name;
      registry.set(name, (...args) => {
        try {
          const resolved = new Function(`return (${capturedExpr})`)();
          if (typeof resolved !== "function") {
            console.error(`[LES:bridge] forward "${capturedName}": fn="${capturedExpr}" resolved to ${typeof resolved} \u2014 is the function defined yet?`);
            return void 0;
          }
          return resolved(...args);
        } catch (err) {
          console.error(`[LES:bridge] forward "${capturedName}": fn= evaluation failed:`, err);
          return void 0;
        }
      });
      console.log(`[LES:bridge] registered "${name}" (lazy)`);
    }
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
  /**
   * Fire a named local event into this LES instance from outside.
   *
   * If called before _init() has completed wiring (i.e. during the startup
   * window), the event is queued and replayed automatically once handlers
   * are ready. This prevents silent event drops when external code calls
   * fire() or fireLES() before the element has fully initialized.
   */
  fire(event, payload = []) {
    if (!this._initComplete) {
      console.log(`[LES] ${this.id || "(no id)"}: queued pre-init event "${event}"`);
      this._preInitQueue.push({ event, payload });
      return;
    }
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
var lesReady = customElements.whenDefined("local-event-script").then(() => void 0);
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
  lesReady,
  logConfig,
  parseLES,
  readConfig,
  stripBody
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL21vZHVsZXMvYnVpbHRpbi9zaGFrZS50cyIsICIuLi9zcmMvbW9kdWxlcy9idWlsdGluL2FuaW1hdGlvbi50cyIsICIuLi9zcmMvbW9kdWxlcy9idWlsdGluL2JyaWRnZS50cyIsICIuLi9zcmMvcnVudGltZS9leGVjdXRvci50cyIsICIuLi9zcmMvcnVudGltZS9yZWdpc3RyeS50cyIsICIuLi9zcmMvbW9kdWxlcy90eXBlcy50cyIsICIuLi9zcmMvcGFyc2VyL3N0cmlwQm9keS50cyIsICIuLi9zcmMvcGFyc2VyL3JlYWRlci50cyIsICIuLi9zcmMvcGFyc2VyL3Rva2VuaXplci50cyIsICIuLi9zcmMvcGFyc2VyL3BhcnNlci50cyIsICIuLi9zcmMvcGFyc2VyL2luZGV4LnRzIiwgIi4uL3NyYy9ydW50aW1lL3dpcmluZy50cyIsICIuLi9zcmMvcnVudGltZS9zY29wZS50cyIsICIuLi9zcmMvcnVudGltZS9vYnNlcnZlci50cyIsICIuLi9zcmMvcnVudGltZS9zaWduYWxzLnRzIiwgIi4uL3NyYy9lbGVtZW50cy9Mb2NhbEV2ZW50U2NyaXB0LnRzIiwgIi4uL3NyYy9lbGVtZW50cy9Mb2NhbENvbW1hbmQudHMiLCAiLi4vc3JjL2VsZW1lbnRzL09uRXZlbnQudHMiLCAiLi4vc3JjL2VsZW1lbnRzL09uU2lnbmFsLnRzIiwgIi4uL3NyYy9lbGVtZW50cy9MaWZlY3ljbGUudHMiLCAiLi4vc3JjL2VsZW1lbnRzL1VzZU1vZHVsZS50cyIsICIuLi9zcmMvZGF0YXN0YXIvcGx1Z2luLnRzIiwgIi4uL3NyYy9pbmRleC50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBTaGFrZSBhbmltYXRpb24gcHJpbWl0aXZlXG4gKlxuICogR2VuZXJhdGVzIGEgbm9pc2UtZHJpdmVuIGRpc3BsYWNlbWVudCBrZXlmcmFtZSBzZXF1ZW5jZSBhbmQgcGxheXMgaXRcbiAqIHZpYSB0aGUgV2ViIEFuaW1hdGlvbnMgQVBJLiBUaHJlZSBub2lzZSBtb2RlczpcbiAqXG4gKiAgIHJlZ3VsYXIgIFx1MjAxNCBkYW1wZWQgc2ludXNvaWRhbCBvc2NpbGxhdGlvbiB3aXRoIGhhcm1vbmljcyAoZGVmYXVsdClcbiAqICAgcGVybGluICAgXHUyMDE0IEtlbiBQZXJsaW4ncyBpbXByb3ZlZCBncmFkaWVudCBub2lzZSAoc21vb3RoLCBvcmdhbmljKVxuICogICBzaW1wbGV4ICBcdTIwMTQgU2ltcGxleCBub2lzZSAoc21vb3RoZXIgZ3JhZGllbnRzLCBubyBheGlzLWFsaWduZWQgYXJ0ZWZhY3RzKVxuICpcbiAqIEF4aXMgb3B0aW9uczogeCB8IHkgfCB6IHwgeHkgfCB4eXpcbiAqICAgeCAgIFx1MjE5MiB0cmFuc2xhdGVYXG4gKiAgIHkgICBcdTIxOTIgdHJhbnNsYXRlWVxuICogICB6ICAgXHUyMTkyIHJvdGF0ZVogKHNjcmVlbi1zaGFrZSAvIGNhbWVyYS1zaGFrZSBmZWVsKVxuICogICB4eSAgXHUyMTkyIHRyYW5zbGF0ZVggKyB0cmFuc2xhdGVZIChpbmRlcGVuZGVudCBub2lzZSBjaGFubmVscylcbiAqICAgeHl6IFx1MjE5MiB0cmFuc2xhdGVYICsgdHJhbnNsYXRlWSArIHJvdGF0ZVpcbiAqXG4gKiBPcHRpb25zIChhbGwgb3B0aW9uYWwpOlxuICogICBheGlzOiAgICAgIHggfCB5IHwgeiB8IHh5IHwgeHl6ICAgKGRlZmF1bHQ6IHgpXG4gKiAgIG5vaXNlOiAgICAgcmVndWxhciB8IHBlcmxpbiB8IHNpbXBsZXggIChkZWZhdWx0OiByZWd1bGFyKVxuICogICBhbXBsaXR1ZGU6IE5weCAgICAgICAgICAgICAgICAgICAgKGRlZmF1bHQ6IDhweClcbiAqICAgZGVjYXk6ICAgICB0cnVlIHwgZmFsc2UgICAgICAgICAgIChkZWZhdWx0OiB0cnVlIFx1MjAxNCBhbXBsaXR1ZGUgZmFkZXMgb3V0KVxuICogICBmcmVxdWVuY3k6IE4gICAgICAgICAgICAgICAgICAgICAgKGRlZmF1bHQ6IDggXHUyMDE0IG9zY2lsbGF0aW9ucy9zZWMgZm9yIHJlZ3VsYXIpXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBMRVNQcmltaXRpdmUgfSBmcm9tICcuLi90eXBlcy5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQZXJsaW4gbm9pc2UgXHUyMDE0IEtlbiBQZXJsaW4ncyBpbXByb3ZlZCAyMDAyIHZlcnNpb25cbi8vIFdlIHVzZSAyRCBldmFsdWF0aW9uOiBub2lzZSh0LCBjaGFubmVsKSB3aGVyZSBjaGFubmVsIGlzIGEgZml4ZWQgb2Zmc2V0XG4vLyB0aGF0IGdpdmVzIGluZGVwZW5kZW50IGN1cnZlcyBmb3IgeCB2cyB5IHZzIHouXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgUEVSTElOX1BFUk06IFVpbnQ4QXJyYXkgPSAoKCkgPT4ge1xuICAvLyBGaXhlZCBwZXJtdXRhdGlvbiB0YWJsZSAoZGV0ZXJtaW5pc3RpYywgbm8gcmFuZG9tbmVzcyBuZWVkZWQgZm9yIGFuaW1hdGlvbilcbiAgY29uc3QgcCA9IG5ldyBVaW50OEFycmF5KDUxMilcbiAgY29uc3QgYmFzZSA9IFtcbiAgICAxNTEsMTYwLDEzNywgOTEsIDkwLCAxNSwxMzEsIDEzLDIwMSwgOTUsIDk2LCA1MywxOTQsMjMzLCAgNywyMjUsXG4gICAgMTQwLCAzNiwxMDMsIDMwLCA2OSwxNDIsICA4LCA5OSwgMzcsMjQwLCAyMSwgMTAsIDIzLDE5MCwgIDYsMTQ4LFxuICAgIDI0NywxMjAsMjM0LCA3NSwgIDAsIDI2LDE5NywgNjIsIDk0LDI1MiwyMTksMjAzLDExNywgMzUsIDExLCAzMixcbiAgICAgNTcsMTc3LCAzMywgODgsMjM3LDE0OSwgNTYsIDg3LDE3NCwgMjAsMTI1LDEzNiwxNzEsMTY4LCA2OCwxNzUsXG4gICAgIDc0LDE2NSwgNzEsMTM0LDEzOSwgNDgsIDI3LDE2NiwgNzcsMTQ2LDE1OCwyMzEsIDgzLDExMSwyMjksMTIyLFxuICAgICA2MCwyMTEsMTMzLDIzMCwyMjAsMTA1LCA5MiwgNDEsIDU1LCA0NiwyNDUsIDQwLDI0NCwxMDIsMTQzLCA1NCxcbiAgICAgNjUsIDI1LCA2MywxNjEsICAxLDIxNiwgODAsIDczLDIwOSwgNzYsMTMyLDE4NywyMDgsIDg5LCAxOCwxNjksXG4gICAgMjAwLDE5NiwxMzUsMTMwLDExNiwxODgsMTU5LCA4NiwxNjQsMTAwLDEwOSwxOTgsMTczLDE4NiwgIDMsIDY0LFxuICAgICA1MiwyMTcsMjI2LDI1MCwxMjQsMTIzLCAgNSwyMDIsIDM4LDE0NywxMTgsMTI2LDI1NSwgODIsIDg1LDIxMixcbiAgICAyMDcsMjA2LCA1OSwyMjcsIDQ3LCAxNiwgNTgsIDE3LDE4MiwxODksIDI4LCA0MiwyMjMsMTgzLDE3MCwyMTMsXG4gICAgMTE5LDI0OCwxNTIsICAyLCA0NCwxNTQsMTYzLCA3MCwyMjEsMTUzLDEwMSwxNTUsMTY3LCA0MywxNzIsICA5LFxuICAgIDEyOSwgMjIsIDM5LDI1MywgMTksIDk4LDEwOCwxMTAsIDc5LDExMywyMjQsMjMyLDE3OCwxODUsMTEyLDEwNCxcbiAgICAyMTgsMjQ2LCA5NywyMjgsMjUxLCAzNCwyNDIsMTkzLDIzOCwyMTAsMTQ0LCAxMiwxOTEsMTc5LDE2MiwyNDEsXG4gICAgIDgxLCA1MSwxNDUsMjM1LDI0OSwgMTQsMjM5LDEwNywgNDksMTkyLDIxNCwgMzEsMTgxLDE5OSwxMDYsMTU3LFxuICAgIDE4NCwgODQsMjA0LDE3NiwxMTUsMTIxLCA1MCwgNDUsMTI3LCAgNCwxNTAsMjU0LDEzOCwyMzYsMjA1LCA5MyxcbiAgICAyMjIsMTE0LCA2NywgMjksIDI0LCA3MiwyNDMsMTQxLDEyOCwxOTUsIDc4LCA2NiwyMTUsIDYxLDE1NiwxODAsXG4gIF1cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCAyNTY7IGkrKykgcFtpXSA9IHBbaSArIDI1Nl0gPSBiYXNlW2ldIVxuICByZXR1cm4gcFxufSkoKVxuXG5mdW5jdGlvbiBmYWRlKHQ6IG51bWJlcik6IG51bWJlciB7IHJldHVybiB0ICogdCAqIHQgKiAodCAqICh0ICogNiAtIDE1KSArIDEwKSB9XG5mdW5jdGlvbiBsZXJwKHQ6IG51bWJlciwgYTogbnVtYmVyLCBiOiBudW1iZXIpOiBudW1iZXIgeyByZXR1cm4gYSArIHQgKiAoYiAtIGEpIH1cbmZ1bmN0aW9uIGdyYWQyKGhhc2g6IG51bWJlciwgeDogbnVtYmVyLCB5OiBudW1iZXIpOiBudW1iZXIge1xuICBjb25zdCBoID0gaGFzaCAmIDNcbiAgY29uc3QgdSA9IGggPCAyID8geCA6IHlcbiAgY29uc3QgdiA9IGggPCAyID8geSA6IHhcbiAgcmV0dXJuICgoaCAmIDEpID8gLXUgOiB1KSArICgoaCAmIDIpID8gLXYgOiB2KVxufVxuXG4vKiogUGVybGluIG5vaXNlLCByZXR1cm5zIHZhbHVlIGluIFstMSwgMV0gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJsaW4yKHg6IG51bWJlciwgeTogbnVtYmVyKTogbnVtYmVyIHtcbiAgY29uc3QgWCA9IE1hdGguZmxvb3IoeCkgJiAyNTVcbiAgY29uc3QgWSA9IE1hdGguZmxvb3IoeSkgJiAyNTVcbiAgeCAtPSBNYXRoLmZsb29yKHgpXG4gIHkgLT0gTWF0aC5mbG9vcih5KVxuICBjb25zdCB1ID0gZmFkZSh4KSwgdiA9IGZhZGUoeSlcbiAgY29uc3QgYSAgPSBQRVJMSU5fUEVSTVtYXSEgICsgWVxuICBjb25zdCBhYSA9IFBFUkxJTl9QRVJNW2FdISwgIGFiID0gUEVSTElOX1BFUk1bYSArIDFdIVxuICBjb25zdCBiICA9IFBFUkxJTl9QRVJNW1ggKyAxXSEgKyBZXG4gIGNvbnN0IGJhID0gUEVSTElOX1BFUk1bYl0hLCAgYmIgPSBQRVJMSU5fUEVSTVtiICsgMV0hXG4gIHJldHVybiBsZXJwKHYsXG4gICAgbGVycCh1LCBncmFkMihQRVJMSU5fUEVSTVthYV0hLCB4LCB5KSwgICAgIGdyYWQyKFBFUkxJTl9QRVJNW2JhXSEsIHggLSAxLCB5KSksXG4gICAgbGVycCh1LCBncmFkMihQRVJMSU5fUEVSTVthYl0hLCB4LCB5IC0gMSksIGdyYWQyKFBFUkxJTl9QRVJNW2JiXSEsIHggLSAxLCB5IC0gMSkpXG4gIClcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBTaW1wbGV4IG5vaXNlIFx1MjAxNCAyRCBzaW1wbGV4IChzbW9vdGhlciBncmFkaWVudHMsIG5vIGdyaWQtYWxpZ25lZCBhcnRlZmFjdHMpXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgU0lNUExFWF9QRVJNID0gUEVSTElOX1BFUk0gLy8gcmV1c2Ugc2FtZSBwZXJtdXRhdGlvbiB0YWJsZVxuXG5jb25zdCBTSU1QTEVYX0dSQUQ6IFtudW1iZXIsIG51bWJlcl1bXSA9IFtcbiAgWzEsMV0sWy0xLDFdLFsxLC0xXSxbLTEsLTFdLFsxLDBdLFstMSwwXSxbMCwxXSxbMCwtMV0sXG5dXG5jb25zdCBGMiA9IDAuNSAqIChNYXRoLnNxcnQoMykgLSAxKVxuY29uc3QgRzIgPSAoMyAtIE1hdGguc3FydCgzKSkgLyA2XG5cbmZ1bmN0aW9uIHNpbXBsZXgyZ3JhZChoYXNoOiBudW1iZXIsIHg6IG51bWJlciwgeTogbnVtYmVyKTogbnVtYmVyIHtcbiAgY29uc3QgZyA9IFNJTVBMRVhfR1JBRFtoYXNoICYgN10hXG4gIHJldHVybiBnWzBdICogeCArIGdbMV0gKiB5XG59XG5cbi8qKiBTaW1wbGV4IG5vaXNlLCByZXR1cm5zIHZhbHVlIGluIFstMSwgMV0gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaW1wbGV4Mih4aW46IG51bWJlciwgeWluOiBudW1iZXIpOiBudW1iZXIge1xuICBjb25zdCBzICA9ICh4aW4gKyB5aW4pICogRjJcbiAgY29uc3QgaSAgPSBNYXRoLmZsb29yKHhpbiArIHMpXG4gIGNvbnN0IGogID0gTWF0aC5mbG9vcih5aW4gKyBzKVxuICBjb25zdCB0ICA9IChpICsgaikgKiBHMlxuICBjb25zdCB4MCA9IHhpbiAtIChpIC0gdClcbiAgY29uc3QgeTAgPSB5aW4gLSAoaiAtIHQpXG5cbiAgbGV0IGkxOiBudW1iZXIsIGoxOiBudW1iZXJcbiAgaWYgKHgwID4geTApIHsgaTEgPSAxOyBqMSA9IDAgfSBlbHNlIHsgaTEgPSAwOyBqMSA9IDEgfVxuXG4gIGNvbnN0IHgxID0geDAgLSBpMSArIEcyLCAgIHkxID0geTAgLSBqMSArIEcyXG4gIGNvbnN0IHgyID0geDAgLSAxICsgMipHMiwgIHkyID0geTAgLSAxICsgMipHMlxuXG4gIGNvbnN0IGlpID0gaSAmIDI1NSwgamogPSBqICYgMjU1XG4gIGNvbnN0IGdpMCA9IFNJTVBMRVhfUEVSTVtpaSAgICAgICsgU0lNUExFWF9QRVJNW2pqXSFdIVxuICBjb25zdCBnaTEgPSBTSU1QTEVYX1BFUk1baWkgKyBpMSArIFNJTVBMRVhfUEVSTVtqaiArIGoxXSFdIVxuICBjb25zdCBnaTIgPSBTSU1QTEVYX1BFUk1baWkgKyAxICArIFNJTVBMRVhfUEVSTVtqaiArIDFdIV0hXG5cbiAgY29uc3QgbiA9ICh0MDogbnVtYmVyLCB4OiBudW1iZXIsIHk6IG51bWJlciwgZ2k6IG51bWJlcikgPT4ge1xuICAgIGNvbnN0IHIgPSAwLjUgLSB4KnggLSB5KnlcbiAgICByZXR1cm4gciA8IDAgPyAwIDogcipyKnIqciAqIHNpbXBsZXgyZ3JhZChnaSwgeCwgeSlcbiAgfVxuXG4gIHJldHVybiA3MCAqIChuKDAuNSAtIHgwKngwIC0geTAqeTAsIHgwLCB5MCwgZ2kwKSArXG4gICAgICAgICAgICAgICBuKDAuNSAtIHgxKngxIC0geTEqeTEsIHgxLCB5MSwgZ2kxKSArXG4gICAgICAgICAgICAgICBuKDAuNSAtIHgyKngyIC0geTIqeTIsIHgyLCB5MiwgZ2kyKSlcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBSZWd1bGFyIHNoYWtlIFx1MjAxNCBkYW1wZWQgc2ludXNvaWRhbCBvc2NpbGxhdGlvbiB3aXRoIGhhcm1vbmljc1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIHJlZ3VsYXJTaGFrZSh0OiBudW1iZXIsIGZyZXF1ZW5jeTogbnVtYmVyLCBjaGFubmVsOiBudW1iZXIpOiBudW1iZXIge1xuICAvLyBUd28gaGFybW9uaWNzIGF0IHNsaWdodGx5IGRpZmZlcmVudCBmcmVxdWVuY2llcyBmb3IgbmF0dXJhbCBmZWVsXG4gIC8vIGNoYW5uZWwgb2Zmc2V0IHByZXZlbnRzIHgveSBmcm9tIGJlaW5nIGlkZW50aWNhbFxuICBjb25zdCBwaGFzZSA9IGNoYW5uZWwgKiBNYXRoLlBJICogMC43XG4gIHJldHVybiAoXG4gICAgMC43ICogTWF0aC5zaW4oMiAqIE1hdGguUEkgKiBmcmVxdWVuY3kgKiB0ICsgcGhhc2UpICtcbiAgICAwLjMgKiBNYXRoLnNpbigyICogTWF0aC5QSSAqIGZyZXF1ZW5jeSAqIDIuMyAqIHQgKyBwaGFzZSAqIDEuNClcbiAgKVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEtleWZyYW1lIGdlbmVyYXRvclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbnR5cGUgTm9pc2VUeXBlID0gJ3NpbXBsZXgnIHwgJ3BlcmxpbicgfCAncmVndWxhcidcbnR5cGUgU2hha2VBeGlzID0gJ3gnIHwgJ3knIHwgJ3onIHwgJ3h5JyB8ICd4eXonXG5cbmludGVyZmFjZSBTaGFrZU9wdGlvbnMge1xuICBheGlzOiAgICAgIFNoYWtlQXhpc1xuICBub2lzZTogICAgIE5vaXNlVHlwZVxuICBhbXBsaXR1ZGU6IG51bWJlciAgICAgLy8gcHggKG9yIGRlZ3JlZXMgZm9yIHopXG4gIGRlY2F5OiAgICAgYm9vbGVhblxuICBmcmVxdWVuY3k6IG51bWJlciAgICAgLy8gb3NjaWxsYXRpb25zL3NlYyAocmVndWxhciBtb2RlIG9ubHkpXG59XG5cbi8qKlxuICogU2FtcGxlIHRoZSBjaG9zZW4gbm9pc2UgZnVuY3Rpb24gZm9yIG9uZSBheGlzIGNoYW5uZWwuXG4gKiBgdGAgICAgICAgXHUyMDE0IG5vcm1hbGlzZWQgdGltZSBbMCwgMV1cbiAqIGBjaGFubmVsYCBcdTIwMTQgaW50ZWdlciBvZmZzZXQgdG8gcHJvZHVjZSBhbiBpbmRlcGVuZGVudCBjdXJ2ZSBwZXIgYXhpc1xuICovXG5mdW5jdGlvbiBzYW1wbGUoXG4gIG5vaXNlOiBOb2lzZVR5cGUsXG4gIHQ6IG51bWJlcixcbiAgY2hhbm5lbDogbnVtYmVyLFxuICBmcmVxdWVuY3k6IG51bWJlcixcbiAgZHVyYXRpb246IG51bWJlclxuKTogbnVtYmVyIHtcbiAgLy8gU2NhbGUgdCB0byBhIHJhbmdlIHRoYXQgZ2l2ZXMgZ29vZCBub2lzZSB2YXJpYXRpb25cbiAgY29uc3Qgc2NhbGUgPSA0LjAgIC8vIGhvdyBtYW55IG5vaXNlIFwiY3ljbGVzXCIgb3ZlciB0aGUgZnVsbCBkdXJhdGlvblxuICBjb25zdCB0eCA9IHQgKiBzY2FsZSArIGNoYW5uZWwgKiAzLjcgICAvLyBjaGFubmVsIG9mZnNldCBmb3IgaW5kZXBlbmRlbmNlXG4gIGNvbnN0IHR5ID0gY2hhbm5lbCAqIDExLjMgICAgICAgICAgICAgIC8vIGZpeGVkIHkgb2Zmc2V0IHBlciBjaGFubmVsXG5cbiAgc3dpdGNoIChub2lzZSkge1xuICAgIGNhc2UgJ3NpbXBsZXgnOiByZXR1cm4gc2ltcGxleDIodHgsIHR5KVxuICAgIGNhc2UgJ3Blcmxpbic6ICByZXR1cm4gcGVybGluMih0eCwgdHkpXG4gICAgY2FzZSAncmVndWxhcic6IHJldHVybiByZWd1bGFyU2hha2UodCwgZnJlcXVlbmN5LCBjaGFubmVsKVxuICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkS2V5ZnJhbWVzKFxuICBvcHRzOiBTaGFrZU9wdGlvbnMsXG4gIG46IG51bWJlciAgIC8vIG51bWJlciBvZiBrZXlmcmFtZXNcbik6IEtleWZyYW1lW10ge1xuICBjb25zdCBmcmFtZXM6IEtleWZyYW1lW10gPSBbXVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDw9IG47IGkrKykge1xuICAgIGNvbnN0IHQgICAgICAgID0gaSAvIG4gICAgICAgICAgICAgICAgICAgLy8gWzAsIDFdXG4gICAgY29uc3QgZW52ZWxvcGUgPSBvcHRzLmRlY2F5ID8gKDEgLSB0KSA6IDEuMFxuICAgIGNvbnN0IGFtcCAgICAgID0gb3B0cy5hbXBsaXR1ZGUgKiBlbnZlbG9wZVxuXG4gICAgbGV0IHR4ID0gMCwgdHkgPSAwLCByeiA9IDBcblxuICAgIGlmIChvcHRzLmF4aXMuaW5jbHVkZXMoJ3gnKSkge1xuICAgICAgdHggPSBzYW1wbGUob3B0cy5ub2lzZSwgdCwgMCwgb3B0cy5mcmVxdWVuY3ksIG4pICogYW1wXG4gICAgfVxuICAgIGlmIChvcHRzLmF4aXMuaW5jbHVkZXMoJ3knKSkge1xuICAgICAgdHkgPSBzYW1wbGUob3B0cy5ub2lzZSwgdCwgMSwgb3B0cy5mcmVxdWVuY3ksIG4pICogYW1wXG4gICAgfVxuICAgIGlmIChvcHRzLmF4aXMgPT09ICd6JyB8fCBvcHRzLmF4aXMgPT09ICd4eXonKSB7XG4gICAgICAvLyB6IHJvdGF0aW9uOiBhbXBsaXR1ZGUgaXMgaW4gZGVncmVlcywgc2NhbGUgZG93biB2cyBweCBkaXNwbGFjZW1lbnRcbiAgICAgIGNvbnN0IGRlZ0FtcCA9IGFtcCAqIDAuMTVcbiAgICAgIHJ6ID0gc2FtcGxlKG9wdHMubm9pc2UsIHQsIDIsIG9wdHMuZnJlcXVlbmN5LCBuKSAqIGRlZ0FtcFxuICAgIH1cblxuICAgIGNvbnN0IHBhcnRzOiBzdHJpbmdbXSA9IFtdXG4gICAgaWYgKHR4ICE9PSAwIHx8IG9wdHMuYXhpcy5pbmNsdWRlcygneCcpKSBwYXJ0cy5wdXNoKGB0cmFuc2xhdGVYKCR7dHgudG9GaXhlZCgyKX1weClgKVxuICAgIGlmICh0eSAhPT0gMCB8fCBvcHRzLmF4aXMuaW5jbHVkZXMoJ3knKSkgcGFydHMucHVzaChgdHJhbnNsYXRlWSgke3R5LnRvRml4ZWQoMil9cHgpYClcbiAgICBpZiAocnogIT09IDAgfHwgb3B0cy5heGlzID09PSAneicgfHwgb3B0cy5heGlzID09PSAneHl6JykgcGFydHMucHVzaChgcm90YXRlWigke3J6LnRvRml4ZWQoMyl9ZGVnKWApXG5cbiAgICBmcmFtZXMucHVzaCh7XG4gICAgICB0cmFuc2Zvcm06IHBhcnRzLmxlbmd0aCA+IDAgPyBwYXJ0cy5qb2luKCcgJykgOiAnbm9uZScsXG4gICAgICBvZmZzZXQ6IHQsXG4gICAgfSlcbiAgfVxuXG4gIC8vIEVuc3VyZSBmaXJzdCBhbmQgbGFzdCBmcmFtZXMgcmV0dXJuIHRvIHJlc3RcbiAgZnJhbWVzWzBdIS50cmFuc2Zvcm0gPSBidWlsZFJlc3RUcmFuc2Zvcm0ob3B0cy5heGlzKVxuICBmcmFtZXNbbl0hLnRyYW5zZm9ybSA9IGJ1aWxkUmVzdFRyYW5zZm9ybShvcHRzLmF4aXMpXG5cbiAgcmV0dXJuIGZyYW1lc1xufVxuXG5mdW5jdGlvbiBidWlsZFJlc3RUcmFuc2Zvcm0oYXhpczogU2hha2VBeGlzKTogc3RyaW5nIHtcbiAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW11cbiAgaWYgKGF4aXMuaW5jbHVkZXMoJ3gnKSkgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goJ3RyYW5zbGF0ZVgoMHB4KScpXG4gIGlmIChheGlzLmluY2x1ZGVzKCd5JykpICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKCd0cmFuc2xhdGVZKDBweCknKVxuICBpZiAoYXhpcyA9PT0gJ3onIHx8IGF4aXMgPT09ICd4eXonKSAgICAgICAgICAgcGFydHMucHVzaCgncm90YXRlWigwZGVnKScpXG4gIHJldHVybiBwYXJ0cy5qb2luKCcgJykgfHwgJ25vbmUnXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gUGFyc2Ugb3B0aW9ucyBmcm9tIExFUyBvcHRpb24gb2JqZWN0XG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gcGFyc2VNcyh2YWw6IHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgZmFsbGJhY2s6IG51bWJlcik6IG51bWJlciB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCB8fCB2YWwgPT09IG51bGwpIHJldHVybiBmYWxsYmFja1xuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHJldHVybiB2YWxcbiAgY29uc3QgbSA9IFN0cmluZyh2YWwpLm1hdGNoKC9eKFxcZCsoPzpcXC5cXGQrKT8pKD86cHh8bXMpPyQvKVxuICByZXR1cm4gbSA/IHBhcnNlRmxvYXQobVsxXSEpIDogZmFsbGJhY2tcbn1cblxuZnVuY3Rpb24gcGFyc2VQeCh2YWw6IHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgZmFsbGJhY2s6IG51bWJlcik6IG51bWJlciB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCB8fCB2YWwgPT09IG51bGwpIHJldHVybiBmYWxsYmFja1xuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHJldHVybiB2YWxcbiAgY29uc3QgbSA9IFN0cmluZyh2YWwpLm1hdGNoKC9eKFxcZCsoPzpcXC5cXGQrKT8pcHgkLylcbiAgcmV0dXJuIG0gPyBwYXJzZUZsb2F0KG1bMV0hKSA6IGZhbGxiYWNrXG59XG5cbmZ1bmN0aW9uIHBhcnNlU2hha2VPcHRpb25zKG9wdHM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogU2hha2VPcHRpb25zIHtcbiAgY29uc3QgYXhpcyAgICAgID0gKFsneCcsJ3knLCd6JywneHknLCd4eXonXS5pbmNsdWRlcyhTdHJpbmcob3B0c1snYXhpcyddID8/ICd4JykpXG4gICAgICAgICAgICAgICAgICAgID8gU3RyaW5nKG9wdHNbJ2F4aXMnXSA/PyAneCcpXG4gICAgICAgICAgICAgICAgICAgIDogJ3gnKSBhcyBTaGFrZUF4aXNcbiAgY29uc3Qgbm9pc2UgICAgID0gKFsnc2ltcGxleCcsJ3BlcmxpbicsJ3JlZ3VsYXInXS5pbmNsdWRlcyhTdHJpbmcob3B0c1snbm9pc2UnXSA/PyAncmVndWxhcicpKVxuICAgICAgICAgICAgICAgICAgICA/IFN0cmluZyhvcHRzWydub2lzZSddID8/ICdyZWd1bGFyJylcbiAgICAgICAgICAgICAgICAgICAgOiAncmVndWxhcicpIGFzIE5vaXNlVHlwZVxuICBjb25zdCBhbXBsaXR1ZGUgPSBwYXJzZVB4KG9wdHNbJ2FtcGxpdHVkZSddIGFzIHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgOClcbiAgY29uc3QgZGVjYXkgICAgID0gU3RyaW5nKG9wdHNbJ2RlY2F5J10gPz8gJ3RydWUnKSAhPT0gJ2ZhbHNlJ1xuICBjb25zdCBmcmVxdWVuY3kgPSBwYXJzZU1zKG9wdHNbJ2ZyZXF1ZW5jeSddIGFzIHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgOClcblxuICByZXR1cm4geyBheGlzLCBub2lzZSwgYW1wbGl0dWRlLCBkZWNheSwgZnJlcXVlbmN5IH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBUaGUgcHJpbWl0aXZlXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBzaGFrZSBcdTIwMTQgbm9pc2UtZHJpdmVuIGRpc3BsYWNlbWVudCBhbmltYXRpb24uXG4gKlxuICogVXNhZ2UgaW4gTEVTOlxuICogICBzaGFrZSAjZmllbGQgIDQwMG1zIGVhc2Utb3V0IFtheGlzOiB4ICBub2lzZTogcmVndWxhciAgYW1wbGl0dWRlOiA4cHggIGRlY2F5OiB0cnVlXVxuICogICBzaGFrZSAuY2FyZCAgIDYwMG1zIGxpbmVhciAgIFtheGlzOiB4eSAgbm9pc2U6IHNpbXBsZXggIGFtcGxpdHVkZTogMTJweF1cbiAqICAgc2hha2UgYm9keSAgICA4MDBtcyBsaW5lYXIgICBbYXhpczogeHl6ICBub2lzZTogcGVybGluICBhbXBsaXR1ZGU6IDZweCAgZGVjYXk6IHRydWVdXG4gKi9cbmV4cG9ydCBjb25zdCBzaGFrZTogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgX2Vhc2luZywgb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCByb290ICA9IGhvc3QuZ2V0Um9vdE5vZGUoKSBhcyBEb2N1bWVudCB8IFNoYWRvd1Jvb3RcbiAgY29uc3Qgc2NvcGUgPSByb290IGluc3RhbmNlb2YgRG9jdW1lbnQgPyByb290IDogcm9vdC5vd25lckRvY3VtZW50ID8/IGRvY3VtZW50XG4gIGNvbnN0IGVscyAgID0gQXJyYXkuZnJvbShzY29wZS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSkgYXMgSFRNTEVsZW1lbnRbXVxuICBpZiAoZWxzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgY29uc3Qgb3B0aW9ucyA9IHBhcnNlU2hha2VPcHRpb25zKG9wdHMpXG5cbiAgLy8gfjYwZnBzIGtleWZyYW1lIGRlbnNpdHksIG1pbmltdW0gMTIsIG1heGltdW0gNjBcbiAgY29uc3QgZnJhbWVDb3VudCA9IE1hdGgubWluKDYwLCBNYXRoLm1heCgxMiwgTWF0aC5yb3VuZChkdXJhdGlvbiAvIDE2KSkpXG4gIGNvbnN0IGtleWZyYW1lcyAgPSBidWlsZEtleWZyYW1lcyhvcHRpb25zLCBmcmFtZUNvdW50KVxuXG4gIGF3YWl0IFByb21pc2UuYWxsKFxuICAgIGVscy5tYXAoZWwgPT5cbiAgICAgIGVsLmFuaW1hdGUoa2V5ZnJhbWVzLCB7XG4gICAgICAgIGR1cmF0aW9uLFxuICAgICAgICBlYXNpbmc6ICAgICdsaW5lYXInLCAgIC8vIGVhc2luZyBpcyBiYWtlZCBpbnRvIHRoZSBub2lzZSBlbnZlbG9wZVxuICAgICAgICBmaWxsOiAgICAgICdub25lJywgICAgIC8vIHNoYWtlIHJldHVybnMgdG8gcmVzdCBcdTIwMTQgbm8gaG9sZCBuZWVkZWRcbiAgICAgICAgY29tcG9zaXRlOiAnYWRkJywgICAgICAvLyBhZGQgb24gdG9wIG9mIGV4aXN0aW5nIHRyYW5zZm9ybXMgKGZpbGw6Zm9yd2FyZHMgZXRjLilcbiAgICAgIH0pLmZpbmlzaGVkLmNhdGNoKChlcnI6IHVua25vd24pID0+IHtcbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnIubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSByZXR1cm5cbiAgICAgICAgdGhyb3cgZXJyXG4gICAgICB9KVxuICAgIClcbiAgKVxufVxuIiwgIi8qKlxuICogUGhhc2UgNzogQnVpbHQtaW4gYW5pbWF0aW9uIG1vZHVsZVxuICpcbiAqIEFsbCBwcmltaXRpdmVzIHVzZSB0aGUgV2ViIEFuaW1hdGlvbnMgQVBJIChlbGVtZW50LmFuaW1hdGUoKS5maW5pc2hlZClcbiAqIHNvIHRoZXkgaW50ZWdyYXRlIHdpdGggTEVTJ3MgYXN5bmMtdHJhbnNwYXJlbnQgYHRoZW5gIHNlcXVlbmNpbmc6XG4gKlxuICogICBmYWRlLWluICNzcGxhc2ggMjAwbXMgZWFzZS1vdXQgYW5kXG4gKiAgIHNsaWRlLXVwICNzcGxhc2ggMTgwbXMgZWFzZS1vdXRcbiAqICAgdGhlbiBmaXJlIHNwbGFzaDpyZWFkeSAgICAgICAgICBcdTIxOTAgb25seSBmaXJlcyBhZnRlciBCT1RIIGFuaW1hdGlvbnMgY29tcGxldGVcbiAqXG4gKiBgYW5kYCBcdTIxOTIgUHJvbWlzZS5hbGwgKGNvbmN1cnJlbnQpXG4gKiBgdGhlbmAgXHUyMTkyIHNlcXVlbnRpYWwgYXdhaXQgb24gLmZpbmlzaGVkXG4gKlxuICogVGhlIGV4ZWN1dG9yIGF3YWl0cyBlYWNoIExFU1ByaW1pdGl2ZSByZXR1cm4gdmFsdWUsIHNvIGFuaW1hdGlvblxuICogY29tcGxldGlvbiBpcyBuYXR1cmFsbHkgc2VyaWFsaXplZCB3aXRob3V0IGFueSBzZXRUaW1lb3V0IGhhY2tzLlxuICovXG5cbmltcG9ydCB0eXBlIHsgTEVTTW9kdWxlLCBMRVNQcmltaXRpdmUgfSBmcm9tICcuLi90eXBlcy5qcydcbmltcG9ydCB7IHNoYWtlIH0gZnJvbSAnLi9zaGFrZS5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBVdGlsaXR5OiBxdWVyeSBhbGwgbWF0Y2hpbmcgZWxlbWVudHMgd2l0aGluIHRoZSBob3N0IHNjb3BlXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gcXVlcnlBbGwoc2VsZWN0b3I6IHN0cmluZywgaG9zdDogRWxlbWVudCk6IEVsZW1lbnRbXSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgcm9vdCA9IGhvc3QuZ2V0Um9vdE5vZGUoKSBhcyBEb2N1bWVudCB8IFNoYWRvd1Jvb3RcbiAgICBjb25zdCBzY29wZSA9IHJvb3QgaW5zdGFuY2VvZiBEb2N1bWVudCA/IHJvb3QgOiByb290Lm93bmVyRG9jdW1lbnQgPz8gZG9jdW1lbnRcbiAgICByZXR1cm4gQXJyYXkuZnJvbShzY29wZS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSlcbiAgfSBjYXRjaCB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTOmFuaW1hdGlvbl0gSW52YWxpZCBzZWxlY3RvcjogXCIke3NlbGVjdG9yfVwiYClcbiAgICByZXR1cm4gW11cbiAgfVxufVxuXG4vKipcbiAqIENhbmNlbCBhbGwgcnVubmluZyBXZWIgQW5pbWF0aW9ucyBvbiBhbiBlbGVtZW50IGJlZm9yZSBzdGFydGluZyBhIG5ldyBvbmUuXG4gKiBUaGlzIHByZXZlbnRzIHRoZSBvbmUtZnJhbWUgZmxhc2ggdGhhdCBvY2N1cnMgd2hlbiBhIGZpbGw6Zm9yd2FyZHMgYW5pbWF0aW9uXG4gKiBpcyBpbnRlcnJ1cHRlZCBcdTIwMTQgd2l0aG91dCBjYW5jZWxsYXRpb24sIHRoZSBlbGVtZW50IGJyaWVmbHkgcmV2ZXJ0cyB0byBpdHNcbiAqIHVuLWFuaW1hdGVkIHN0YXRlIGFzIHRoZSBvbGQgQW5pbWF0aW9uIGlzIHJlcGxhY2VkLlxuICovXG5mdW5jdGlvbiBjYW5jZWxBbmltYXRpb25zKGVsOiBFbGVtZW50KTogdm9pZCB7XG4gIGZvciAoY29uc3QgYW5pbSBvZiAoZWwgYXMgSFRNTEVsZW1lbnQpLmdldEFuaW1hdGlvbnMoKSkge1xuICAgIGFuaW0uY2FuY2VsKClcbiAgfVxufVxuXG4vKiogQXdhaXRzIGFsbCBBbmltYXRpb24uZmluaXNoZWQgcHJvbWlzZXMuIFJldHVybnMgaW1tZWRpYXRlbHkgaWYgbm8gZWxlbWVudHMgbWF0Y2hlZC4gKi9cbmFzeW5jIGZ1bmN0aW9uIGFuaW1hdGVBbGwoXG4gIGVsczogRWxlbWVudFtdLFxuICBrZXlmcmFtZXM6IEtleWZyYW1lW10sXG4gIG9wdGlvbnM6IEtleWZyYW1lQW5pbWF0aW9uT3B0aW9uc1xuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChlbHMubGVuZ3RoID09PSAwKSByZXR1cm5cbiAgLy8gTm90ZTogY2FuY2VsQW5pbWF0aW9ucyBpcyBpbnRlbnRpb25hbGx5IE5PVCBjYWxsZWQgaGVyZS5cbiAgLy8gSXQgaXMgb25seSBjYWxsZWQgaW4gc3RhZ2dlci1lbnRlci9zdGFnZ2VyLWV4aXQgd2hlcmUgd2UgZXhwbGljaXRseVxuICAvLyByZXN0YXJ0IGFuIGluLXByb2dyZXNzIHN0YWdnZXIuIENhbGxpbmcgY2FuY2VsIG9uIGV2ZXJ5IHByaW1pdGl2ZVxuICAvLyB3b3VsZCBkZXN0cm95IGZpbGw6Zm9yd2FyZHMgaG9sZHMgZnJvbSBwcmV2aW91cyBhbmltYXRpb25zXG4gIC8vIChlLmcuIHN0YWdnZXItZW50ZXIncyBob2xkIHdvdWxkIGJlIGNhbmNlbGxlZCBieSBhIHN1YnNlcXVlbnQgcHVsc2UpLlxuICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBlbHMubWFwKGVsID0+IChlbCBhcyBIVE1MRWxlbWVudCkuYW5pbWF0ZShrZXlmcmFtZXMsIG9wdGlvbnMpLmZpbmlzaGVkXG4gICAgICAuY2F0Y2goKGVycjogdW5rbm93bikgPT4ge1xuICAgICAgICAvLyBBYm9ydEVycm9yIGlzIGV4cGVjdGVkIHdoZW4gY2FuY2VsQW5pbWF0aW9ucygpIGludGVycnVwdHMgYSBydW5uaW5nXG4gICAgICAgIC8vIGFuaW1hdGlvbi4gU3dhbGxvdyBpdCBcdTIwMTQgdGhlIG5ldyBhbmltYXRpb24gaGFzIGFscmVhZHkgc3RhcnRlZC5cbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnIubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSByZXR1cm5cbiAgICAgICAgdGhyb3cgZXJyXG4gICAgICB9KVxuICAgIClcbiAgKVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIERpcmVjdGlvbiBoZWxwZXJzXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxudHlwZSBEaXJlY3Rpb24gPSAnbGVmdCcgfCAncmlnaHQnIHwgJ3VwJyB8ICdkb3duJ1xuXG5mdW5jdGlvbiBzbGlkZUtleWZyYW1lcyhkaXI6IERpcmVjdGlvbiwgZW50ZXJpbmc6IGJvb2xlYW4pOiBLZXlmcmFtZVtdIHtcbiAgY29uc3QgZGlzdGFuY2UgPSAnODBweCdcbiAgY29uc3QgdHJhbnNsYXRpb25zOiBSZWNvcmQ8RGlyZWN0aW9uLCBzdHJpbmc+ID0ge1xuICAgIGxlZnQ6ICBgdHJhbnNsYXRlWCgtJHtkaXN0YW5jZX0pYCxcbiAgICByaWdodDogYHRyYW5zbGF0ZVgoJHtkaXN0YW5jZX0pYCxcbiAgICB1cDogICAgYHRyYW5zbGF0ZVkoLSR7ZGlzdGFuY2V9KWAsXG4gICAgZG93bjogIGB0cmFuc2xhdGVZKCR7ZGlzdGFuY2V9KWAsXG4gIH1cbiAgY29uc3QgdHJhbnNsYXRlID0gdHJhbnNsYXRpb25zW2Rpcl1cbiAgaWYgKGVudGVyaW5nKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHsgb3BhY2l0eTogMCwgdHJhbnNmb3JtOiB0cmFuc2xhdGUgfSxcbiAgICAgIHsgb3BhY2l0eTogMSwgdHJhbnNmb3JtOiAnbm9uZScgfSxcbiAgICBdXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHsgb3BhY2l0eTogMSwgdHJhbnNmb3JtOiAnbm9uZScgfSxcbiAgICAgIHsgb3BhY2l0eTogMCwgdHJhbnNmb3JtOiB0cmFuc2xhdGUgfSxcbiAgICBdXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBDb3JlIHByaW1pdGl2ZXNcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5jb25zdCBmYWRlSW46IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgX29wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLFxuICAgIFt7IG9wYWNpdHk6IDAgfSwgeyBvcGFjaXR5OiAxIH1dLFxuICAgIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9XG4gIClcbn1cblxuY29uc3QgZmFkZU91dDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBfb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgYXdhaXQgYW5pbWF0ZUFsbChlbHMsXG4gICAgW3sgb3BhY2l0eTogMSB9LCB7IG9wYWNpdHk6IDAgfV0sXG4gICAgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnIH1cbiAgKVxufVxuXG5jb25zdCBzbGlkZUluOiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIG9wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZnJvbSA9IChvcHRzWydmcm9tJ10gYXMgRGlyZWN0aW9uIHwgdW5kZWZpbmVkKSA/PyAncmlnaHQnXG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBhd2FpdCBhbmltYXRlQWxsKGVscywgc2xpZGVLZXlmcmFtZXMoZnJvbSwgdHJ1ZSksIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9KVxufVxuXG5jb25zdCBzbGlkZU91dDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBvcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IHRvID0gKG9wdHNbJ3RvJ10gYXMgRGlyZWN0aW9uIHwgdW5kZWZpbmVkKSA/PyAnbGVmdCdcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLCBzbGlkZUtleWZyYW1lcyh0bywgZmFsc2UpLCB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdmb3J3YXJkcycgfSlcbn1cblxuY29uc3Qgc2xpZGVVcDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBfb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgYXdhaXQgYW5pbWF0ZUFsbChlbHMsIHNsaWRlS2V5ZnJhbWVzKCd1cCcsIHRydWUpLCB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdmb3J3YXJkcycgfSlcbn1cblxuY29uc3Qgc2xpZGVEb3duOiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIF9vcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBhd2FpdCBhbmltYXRlQWxsKGVscywgc2xpZGVLZXlmcmFtZXMoJ2Rvd24nLCBmYWxzZSksIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9KVxufVxuXG4vKipcbiAqIHB1bHNlIFx1MjAxNCBicmllZiBzY2FsZSArIG9wYWNpdHkgcHVsc2UgdG8gZHJhdyBhdHRlbnRpb24gdG8gdXBkYXRlZCBpdGVtcy5cbiAqIFVzZWQgZm9yIEQzIFwidXBkYXRlXCIgcGhhc2U6IGl0ZW1zIHdob3NlIGNvbnRlbnQgY2hhbmdlZCBnZXQgYSB2aXN1YWwgcGluZy5cbiAqL1xuY29uc3QgcHVsc2U6IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgX29wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLCBbXG4gICAgeyBvcGFjaXR5OiAxLCAgICB0cmFuc2Zvcm06ICdzY2FsZSgxKScgfSxcbiAgICB7IG9wYWNpdHk6IDAuNzUsIHRyYW5zZm9ybTogJ3NjYWxlKDEuMDMpJywgb2Zmc2V0OiAwLjQgfSxcbiAgICB7IG9wYWNpdHk6IDEsICAgIHRyYW5zZm9ybTogJ3NjYWxlKDEpJyB9LFxuICBdLCB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdub25lJyB9KVxufVxuXG4vKipcbiAqIHN0YWdnZXItZW50ZXIgXHUyMDE0IHJ1bnMgc2xpZGVJbiBvbiBlYWNoIG1hdGNoZWQgZWxlbWVudCBpbiBzZXF1ZW5jZSxcbiAqIG9mZnNldCBieSBgZ2FwYCBtaWxsaXNlY29uZHMgYmV0d2VlbiBlYWNoLlxuICpcbiAqIE9wdGlvbnM6XG4gKiAgIGdhcDogTm1zICAgXHUyMDE0IGRlbGF5IGJldHdlZW4gZWFjaCBlbGVtZW50IChkZWZhdWx0OiA0MG1zKVxuICogICBmcm9tOiBkaXIgIFx1MjAxNCAnbGVmdCcgfCAncmlnaHQnIHwgJ3VwJyB8ICdkb3duJyAoZGVmYXVsdDogJ3JpZ2h0JylcbiAqXG4gKiBBbGwgYW5pbWF0aW9ucyBhcmUgc3RhcnRlZCB0b2dldGhlciAoUHJvbWlzZS5hbGwpIGJ1dCBlYWNoIGhhcyBhblxuICogaW5jcmVhc2luZyBgZGVsYXlgIFx1MjAxNCB0aGlzIGdpdmVzIHRoZSBzdGFnZ2VyIGVmZmVjdCB3aGlsZSBrZWVwaW5nXG4gKiB0aGUgdG90YWwgUHJvbWlzZS1zZXR0bGVkIHRpbWUgPSBkdXJhdGlvbiArIChuLTEpICogZ2FwLlxuICovXG5jb25zdCBzdGFnZ2VyRW50ZXI6IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgaWYgKGVscy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIGNvbnN0IGdhcCAgPSBwYXJzZU1zKG9wdHNbJ2dhcCddIGFzIHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgNDApXG4gIGNvbnN0IGZyb20gPSAob3B0c1snZnJvbSddIGFzIERpcmVjdGlvbiB8IHVuZGVmaW5lZCkgPz8gJ3JpZ2h0J1xuXG4gIGVscy5mb3JFYWNoKGNhbmNlbEFuaW1hdGlvbnMpXG4gIGF3YWl0IFByb21pc2UuYWxsKFxuICAgIGVscy5tYXAoKGVsLCBpKSA9PlxuICAgICAgKGVsIGFzIEhUTUxFbGVtZW50KS5hbmltYXRlKFxuICAgICAgICBzbGlkZUtleWZyYW1lcyhmcm9tLCB0cnVlKSxcbiAgICAgICAgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnLCBkZWxheTogaSAqIGdhcCB9XG4gICAgICApLmZpbmlzaGVkLmNhdGNoKChlcnI6IHVua25vd24pID0+IHtcbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnIubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSByZXR1cm5cbiAgICAgICAgdGhyb3cgZXJyXG4gICAgICB9KVxuICAgIClcbiAgKVxufVxuXG4vKipcbiAqIHN0YWdnZXItZXhpdCBcdTIwMTQgcnVucyBzbGlkZU91dCBvbiBlYWNoIG1hdGNoZWQgZWxlbWVudCBpbiBzZXF1ZW5jZS5cbiAqXG4gKiBPcHRpb25zOlxuICogICBnYXA6IE5tcyAgICAgICAgICBcdTIwMTQgZGVsYXkgYmV0d2VlbiBlYWNoIGVsZW1lbnQgKGRlZmF1bHQ6IDIwbXMpXG4gKiAgIGRpcmVjdGlvbjogcmV2ZXJzZSBcdTIwMTQgcHJvY2VzcyBlbGVtZW50cyBpbiByZXZlcnNlIG9yZGVyXG4gKiAgIHRvOiBkaXIgICAgICAgICAgIFx1MjAxNCBleGl0IGRpcmVjdGlvbiAoZGVmYXVsdDogJ2xlZnQnKVxuICovXG5jb25zdCBzdGFnZ2VyRXhpdDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBvcHRzLCBob3N0KSA9PiB7XG4gIC8vIEZpbHRlciB0byBvbmx5IGVsZW1lbnRzIHRoYXQgYXJlIGFjdHVhbGx5IHZpc2libGUgXHUyMDE0IHNraXAgaGlkZGVuL2FscmVhZHktZXhpdGVkIG9uZXNcbiAgbGV0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KS5maWx0ZXIoZWwgPT4ge1xuICAgIGNvbnN0IHN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWwgYXMgSFRNTEVsZW1lbnQpXG4gICAgcmV0dXJuIHN0eWxlLmRpc3BsYXkgIT09ICdub25lJyAmJiBzdHlsZS52aXNpYmlsaXR5ICE9PSAnaGlkZGVuJ1xuICB9KVxuICBpZiAoZWxzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgY29uc3QgZ2FwICAgICA9IHBhcnNlTXMob3B0c1snZ2FwJ10gYXMgc3RyaW5nIHwgbnVtYmVyIHwgdW5kZWZpbmVkLCAyMClcbiAgY29uc3QgcmV2ZXJzZSA9IFN0cmluZyhvcHRzWydkaXJlY3Rpb24nXSA/PyAnJykgPT09ICdyZXZlcnNlJ1xuICBjb25zdCB0byAgICAgID0gKG9wdHNbJ3RvJ10gYXMgRGlyZWN0aW9uIHwgdW5kZWZpbmVkKSA/PyAnbGVmdCdcblxuICBpZiAocmV2ZXJzZSkgZWxzID0gWy4uLmVsc10ucmV2ZXJzZSgpXG5cbiAgZWxzLmZvckVhY2goY2FuY2VsQW5pbWF0aW9ucylcbiAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgZWxzLm1hcCgoZWwsIGkpID0+XG4gICAgICAoZWwgYXMgSFRNTEVsZW1lbnQpLmFuaW1hdGUoXG4gICAgICAgIHNsaWRlS2V5ZnJhbWVzKHRvLCBmYWxzZSksXG4gICAgICAgIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJywgZGVsYXk6IGkgKiBnYXAgfVxuICAgICAgKS5maW5pc2hlZC5jYXRjaCgoZXJyOiB1bmtub3duKSA9PiB7XG4gICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBET01FeGNlcHRpb24gJiYgZXJyLm5hbWUgPT09ICdBYm9ydEVycm9yJykgcmV0dXJuXG4gICAgICAgIHRocm93IGVyclxuICAgICAgfSlcbiAgICApXG4gIClcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBVdGlsaXR5OiBwYXJzZSBhIG1pbGxpc2Vjb25kIHZhbHVlIGZyb20gYSBzdHJpbmcgbGlrZSBcIjQwbXNcIiBvciBhIG51bWJlclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIHBhcnNlTXModmFsOiBzdHJpbmcgfCBudW1iZXIgfCB1bmRlZmluZWQsIGZhbGxiYWNrOiBudW1iZXIpOiBudW1iZXIge1xuICBpZiAodmFsID09PSB1bmRlZmluZWQgfHwgdmFsID09PSBudWxsKSByZXR1cm4gZmFsbGJhY2tcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSByZXR1cm4gdmFsXG4gIGNvbnN0IG0gPSBTdHJpbmcodmFsKS5tYXRjaCgvXihcXGQrKD86XFwuXFxkKyk/KW1zJC8pXG4gIGlmIChtKSByZXR1cm4gcGFyc2VGbG9hdChtWzFdISlcbiAgY29uc3QgbiA9IHBhcnNlRmxvYXQoU3RyaW5nKHZhbCkpXG4gIHJldHVybiBOdW1iZXIuaXNOYU4obikgPyBmYWxsYmFjayA6IG5cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBNb2R1bGUgZXhwb3J0XG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgYW5pbWF0aW9uTW9kdWxlOiBMRVNNb2R1bGUgPSB7XG4gIG5hbWU6ICdhbmltYXRpb24nLFxuICBwcmltaXRpdmVzOiB7XG4gICAgJ2ZhZGUtaW4nOiAgICAgICBmYWRlSW4sXG4gICAgJ2ZhZGUtb3V0JzogICAgICBmYWRlT3V0LFxuICAgICdzbGlkZS1pbic6ICAgICAgc2xpZGVJbixcbiAgICAnc2xpZGUtb3V0JzogICAgIHNsaWRlT3V0LFxuICAgICdzbGlkZS11cCc6ICAgICAgc2xpZGVVcCxcbiAgICAnc2xpZGUtZG93bic6ICAgIHNsaWRlRG93bixcbiAgICAncHVsc2UnOiAgICAgICAgIHB1bHNlLFxuICAgICdzdGFnZ2VyLWVudGVyJzogc3RhZ2dlckVudGVyLFxuICAgICdzdGFnZ2VyLWV4aXQnOiAgc3RhZ2dlckV4aXQsXG4gICAgJ3NoYWtlJzogICAgICAgICBzaGFrZSxcbiAgfSxcbn1cblxuZXhwb3J0IGRlZmF1bHQgYW5pbWF0aW9uTW9kdWxlXG4iLCAiLyoqXG4gKiBMRVMgQnJpZGdlIE1vZHVsZSBcdTIwMTQgYDx1c2UtbW9kdWxlIHR5cGU9XCJicmlkZ2VcIj5gXG4gKlxuICogUHJvdmlkZXMgdGhlIGBmb3J3YXJkYCBwcmltaXRpdmUgZm9yIGRlY291cGxlZCBKU1x1MjE5NExFUyBpbnRlZ3JhdGlvbi5cbiAqIExvYWRpbmcgdGhpcyBtb2R1bGUgaW5pdGlhbGl6ZXMgdGhlIGdsb2JhbCBMRVNCcmlkZ2UgcmVnaXN0cnkgYW5kXG4gKiB2YWxpZGF0ZXMgdGhhdCBkZWNsYXJhdGl2ZSA8bG9jYWwtYnJpZGdlPiBjaGlsZHJlbiBoYXZlIGJlZW4gcHJvY2Vzc2VkLlxuICpcbiAqIFVzYWdlIHBhdHRlcm46XG4gKlxuICogICA8IS0tIEluIEhUTUwsIGluc2lkZSBhIGxvY2FsLWV2ZW50LXNjcmlwdDogLS0+XG4gKiAgIDx1c2UtbW9kdWxlIHR5cGU9XCJicmlkZ2VcIj5cbiAqICAgPGxvY2FsLWJyaWRnZSBuYW1lPVwiZXhpdFNwbGFzaFwiICAgICBmbj1cIndpbmRvdy5leGl0U3BsYXNoXCI+XG4gKiAgIDxsb2NhbC1icmlkZ2UgbmFtZT1cInNoYWtlQW5kUGFuXCIgICAgZm49XCJ3aW5kb3cuc2hha2VBbmRQYW5cIj5cbiAqXG4gKiAgIDwhLS0gSW4gYSBsb2NhbC1jb21tYW5kIGJvZHk6IC0tPlxuICogICBmb3J3YXJkIGV4aXRTcGxhc2hcbiAqXG4gKiBBbHRlcm5hdGl2ZWx5LCByZWdpc3RlciBicmlkZ2VzIGluIEpTIGJlZm9yZSBMRVMgaW5pdGlhbGl6ZXM6XG4gKiAgIHdpbmRvdy5MRVNCcmlkZ2Uuc2V0KCdleGl0U3BsYXNoJywgd2luZG93LmV4aXRTcGxhc2gpXG4gKlxuICogVGhlIGJyaWRnZSBNYXAgbGl2ZXMgb24gZ2xvYmFsVGhpcyBzbyBpdCdzIG1vY2thYmxlIGluIHRlc3RzOlxuICogICBnbG9iYWxUaGlzLkxFU0JyaWRnZSA9IG5ldyBNYXAoW1snZXhpdFNwbGFzaCcsIG1vY2tGbl1dKVxuICovXG5cbmltcG9ydCB0eXBlIHsgTEVTTW9kdWxlIH0gZnJvbSAnLi4vdHlwZXMuanMnXG5cbi8vIEVuc3VyZSBMRVNCcmlkZ2UgZXhpc3RzLiBMb2NhbEV2ZW50U2NyaXB0IGNvbnN0cnVjdG9yIGFsc28gZG9lcyB0aGlzLFxuLy8gYnV0IHRoZSBtb2R1bGUgbWF5IGJlIGxvYWRlZCBiZWZvcmUgYW55IExFUyBlbGVtZW50IGNvbm5lY3RzLlxuaWYgKCEoJ0xFU0JyaWRnZScgaW4gZ2xvYmFsVGhpcykpIHtcbiAgOyhnbG9iYWxUaGlzIGFzIGFueSkuTEVTQnJpZGdlID0gbmV3IE1hcDxzdHJpbmcsICguLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd24+KClcbiAgY29uc29sZS5sb2coJ1tMRVM6YnJpZGdlXSBMRVNCcmlkZ2UgaW5pdGlhbGl6ZWQnKVxufVxuXG5jb25zdCBicmlkZ2VNb2R1bGU6IExFU01vZHVsZSA9IHtcbiAgbmFtZTogJ2JyaWRnZScsXG4gIC8vIE5vIGFuaW1hdGlvbiBwcmltaXRpdmVzIFx1MjAxNCBgZm9yd2FyZGAgaXMgaGFuZGxlZCBkaXJlY3RseSBpbiBleGVjdXRvci50cy5cbiAgLy8gVGhpcyBtb2R1bGUncyBqb2IgaXMgaW5pdGlhbGl6YXRpb24gYW5kIGRvY3VtZW50YXRpb24gb2YgdGhlIGJyaWRnZSBwYXR0ZXJuLlxuICBwcmltaXRpdmVzOiB7fSxcbn1cblxuZXhwb3J0IGRlZmF1bHQgYnJpZGdlTW9kdWxlXG4iLCAiaW1wb3J0IHR5cGUge1xuICBMRVNOb2RlLCBFeHByTm9kZSwgU2VxdWVuY2VOb2RlLCBQYXJhbGxlbE5vZGUsXG4gIFNldE5vZGUsIEVtaXROb2RlLCBCcm9hZGNhc3ROb2RlLCBCdWJibGVOb2RlLCBDYXNjYWRlTm9kZSwgRm9yd2FyZE5vZGUsXG4gIFdhaXROb2RlLCBDYWxsTm9kZSwgQmluZE5vZGUsIE1hdGNoTm9kZSwgVHJ5Tm9kZSwgQW5pbWF0aW9uTm9kZSxcbn0gZnJvbSAnQHBhcnNlci9hc3QuanMnXG5pbXBvcnQgdHlwZSB7IFBhdHRlcm5Ob2RlIH0gZnJvbSAnQHBhcnNlci9hc3QuanMnXG5pbXBvcnQgeyBMRVNTY29wZSB9IGZyb20gJy4vc2NvcGUuanMnXG5pbXBvcnQgdHlwZSB7IENvbW1hbmRSZWdpc3RyeSB9IGZyb20gJy4vcmVnaXN0cnkuanMnXG5pbXBvcnQgdHlwZSB7IE1vZHVsZVJlZ2lzdHJ5IH0gZnJvbSAnQG1vZHVsZXMvdHlwZXMuanMnXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gRXhlY3V0aW9uIGNvbnRleHQgXHUyMDE0IGV2ZXJ5dGhpbmcgdGhlIGV4ZWN1dG9yIG5lZWRzLCBwYXNzZWQgZG93biB0aGUgY2FsbCB0cmVlXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZXhwb3J0IGludGVyZmFjZSBMRVNDb250ZXh0IHtcbiAgLyoqIExvY2FsIHZhcmlhYmxlIHNjb3BlIGZvciB0aGUgY3VycmVudCBjYWxsIGZyYW1lICovXG4gIHNjb3BlOiBMRVNTY29wZVxuICAvKiogVGhlIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGhvc3QgZWxlbWVudCBcdTIwMTQgdXNlZCBhcyBxdWVyeVNlbGVjdG9yIHJvb3QgKi9cbiAgaG9zdDogRWxlbWVudFxuICAvKiogQ29tbWFuZCBkZWZpbml0aW9ucyByZWdpc3RlcmVkIGJ5IDxsb2NhbC1jb21tYW5kPiBjaGlsZHJlbiAqL1xuICBjb21tYW5kczogQ29tbWFuZFJlZ2lzdHJ5XG4gIC8qKiBBbmltYXRpb24gYW5kIG90aGVyIHByaW1pdGl2ZSBtb2R1bGVzICovXG4gIG1vZHVsZXM6IE1vZHVsZVJlZ2lzdHJ5XG4gIC8qKiBSZWFkIGEgRGF0YXN0YXIgc2lnbmFsIHZhbHVlIGJ5IG5hbWUgKHdpdGhvdXQgJCBwcmVmaXgpICovXG4gIGdldFNpZ25hbDogKG5hbWU6IHN0cmluZykgPT4gdW5rbm93blxuICAvKiogV3JpdGUgYSBEYXRhc3RhciBzaWduYWwgdmFsdWUgYnkgbmFtZSAod2l0aG91dCAkIHByZWZpeCkgKi9cbiAgc2V0U2lnbmFsOiAobmFtZTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bikgPT4gdm9pZFxuICAvKiogRGlzcGF0Y2ggYSBsb2NhbCBDdXN0b21FdmVudCBvbiB0aGUgaG9zdCAoYnViYmxlczogZmFsc2UpICovXG4gIGVtaXRMb2NhbDogKGV2ZW50OiBzdHJpbmcsIHBheWxvYWQ6IHVua25vd25bXSkgPT4gdm9pZFxuICAvKiogRGlzcGF0Y2ggYSBET00td2lkZSBDdXN0b21FdmVudCBvbiBkb2N1bWVudCAoZ2xvYmFsIHNjb3BlKSAqL1xuICBicm9hZGNhc3Q6IChldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHZvaWRcbiAgLyoqIERpc3BhdGNoIHVwd2FyZCB0aHJvdWdoIGFsbCBMRVMgYW5jZXN0b3JzIChob3N0IFx1MjE5MiBwYXJlbnQgXHUyMTkyIFx1MjAyNiBcdTIxOTIgcm9vdCkgKi9cbiAgYnViYmxlOiAoZXZlbnQ6IHN0cmluZywgcGF5bG9hZDogdW5rbm93bltdKSA9PiB2b2lkXG4gIC8qKiBEaXNwYXRjaCBkb3dud2FyZCB0byBhbGwgcmVnaXN0ZXJlZCBMRVMgZGVzY2VuZGFudHMgKi9cbiAgY2FzY2FkZTogKGV2ZW50OiBzdHJpbmcsIHBheWxvYWQ6IHVua25vd25bXSkgPT4gdm9pZFxuICAvKiogQ2FsbCBhIG5hbWVkIGZ1bmN0aW9uIGluIHRoZSBnbG9iYWwgTEVTQnJpZGdlIHJlZ2lzdHJ5ICovXG4gIGZvcndhcmQ6IChuYW1lOiBzdHJpbmcsIHBheWxvYWQ6IHVua25vd25bXSkgPT4gUHJvbWlzZTx2b2lkPlxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIE1haW4gZXhlY3V0b3Jcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEV4ZWN1dGVzIGEgTEVTTm9kZSBBU1QgaW4gdGhlIGdpdmVuIGNvbnRleHQuXG4gKlxuICogQXN5bmMgdHJhbnNwYXJlbmN5OiBldmVyeSBzdGVwIGlzIGF3YWl0ZWQgcmVnYXJkbGVzcyBvZiB3aGV0aGVyIGl0XG4gKiBpcyBzeW5jaHJvbm91cyBvciByZXR1cm5zIGEgUHJvbWlzZS4gVGhlIGF1dGhvciBuZXZlciB3cml0ZXMgYGF3YWl0YC5cbiAqIFRoZSBgdGhlbmAgY29ubmVjdGl2ZSBpbiBMRVMgc291cmNlIG1hcHMgdG8gc2VxdWVudGlhbCBgYXdhaXRgIGhlcmUuXG4gKiBUaGUgYGFuZGAgY29ubmVjdGl2ZSBtYXBzIHRvIGBQcm9taXNlLmFsbGAuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBleGVjdXRlKG5vZGU6IExFU05vZGUsIGN0eDogTEVTQ29udGV4dCk6IFByb21pc2U8dm9pZD4ge1xuICBzd2l0Y2ggKG5vZGUudHlwZSkge1xuXG4gICAgLy8gXHUyNTAwXHUyNTAwIFNlcXVlbmNlOiBBIHRoZW4gQiB0aGVuIEMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnc2VxdWVuY2UnOlxuICAgICAgZm9yIChjb25zdCBzdGVwIG9mIChub2RlIGFzIFNlcXVlbmNlTm9kZSkuc3RlcHMpIHtcbiAgICAgICAgYXdhaXQgZXhlY3V0ZShzdGVwLCBjdHgpXG4gICAgICB9XG4gICAgICByZXR1cm5cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBQYXJhbGxlbDogQSBhbmQgQiBhbmQgQyAoUHJvbWlzZS5hbGwpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3BhcmFsbGVsJzpcbiAgICAgIGF3YWl0IFByb21pc2UuYWxsKChub2RlIGFzIFBhcmFsbGVsTm9kZSkuYnJhbmNoZXMubWFwKGIgPT4gZXhlY3V0ZShiLCBjdHgpKSlcbiAgICAgIHJldHVyblxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIHNldCAkc2lnbmFsIHRvIGV4cHIgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnc2V0Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgU2V0Tm9kZVxuICAgICAgY29uc3QgdmFsdWUgPSBldmFsRXhwcihuLnZhbHVlLCBjdHgpXG4gICAgICBjdHguc2V0U2lnbmFsKG4uc2lnbmFsLCB2YWx1ZSlcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBlbWl0IGV2ZW50Om5hbWUgW3BheWxvYWRdIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ2VtaXQnOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBFbWl0Tm9kZVxuICAgICAgY29uc3QgcGF5bG9hZCA9IG4ucGF5bG9hZC5tYXAocCA9PiBldmFsRXhwcihwLCBjdHgpKVxuICAgICAgY3R4LmVtaXRMb2NhbChuLmV2ZW50LCBwYXlsb2FkKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIGJyb2FkY2FzdCBldmVudDpuYW1lIFtwYXlsb2FkXSBcdTIwMTQgZ2xvYmFsIChkb2N1bWVudCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnYnJvYWRjYXN0Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQnJvYWRjYXN0Tm9kZVxuICAgICAgY29uc3QgcGF5bG9hZCA9IG4ucGF5bG9hZC5tYXAocCA9PiBldmFsRXhwcihwLCBjdHgpKVxuICAgICAgY3R4LmJyb2FkY2FzdChuLmV2ZW50LCBwYXlsb2FkKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIGJ1YmJsZSBldmVudDpuYW1lIFtwYXlsb2FkXSBcdTIwMTQgdXAgdGhyb3VnaCBhbGwgTEVTIGFuY2VzdG9ycyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdidWJibGUnOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBCdWJibGVOb2RlXG4gICAgICBjb25zdCBwYXlsb2FkID0gbi5wYXlsb2FkLm1hcChwID0+IGV2YWxFeHByKHAsIGN0eCkpXG4gICAgICBjdHguYnViYmxlKG4uZXZlbnQsIHBheWxvYWQpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgY2FzY2FkZSBldmVudDpuYW1lIFtwYXlsb2FkXSBcdTIwMTQgZG93biB0byBhbGwgTEVTIGRlc2NlbmRhbnRzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ2Nhc2NhZGUnOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBDYXNjYWRlTm9kZVxuICAgICAgY29uc3QgcGF5bG9hZCA9IG4ucGF5bG9hZC5tYXAocCA9PiBldmFsRXhwcihwLCBjdHgpKVxuICAgICAgY3R4LmNhc2NhZGUobi5ldmVudCwgcGF5bG9hZClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBmb3J3YXJkIG5hbWUgW3BheWxvYWRdIFx1MjAxNCBjYWxsIHJlZ2lzdGVyZWQgTEVTQnJpZGdlIGZ1bmN0aW9uIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ2ZvcndhcmQnOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBGb3J3YXJkTm9kZVxuICAgICAgY29uc3QgcGF5bG9hZCA9IG4ucGF5bG9hZC5tYXAocCA9PiBldmFsRXhwcihwLCBjdHgpKVxuICAgICAgYXdhaXQgY3R4LmZvcndhcmQobi5uYW1lLCBwYXlsb2FkKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIHdhaXQgTm1zIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3dhaXQnOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBXYWl0Tm9kZVxuICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG4ubXMpKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIGNhbGwgY29tbWFuZDpuYW1lIFthcmdzXSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdjYWxsJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQ2FsbE5vZGVcblxuICAgICAgLy8gXHUyNTAwXHUyNTAwIHdpbmRvdy5mbiAvIGdsb2JhbFRoaXMuZm4gaW52b2NhdGlvbiBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICAgIC8vIElmIHRoZSBjb21tYW5kIG5hbWUgc3RhcnRzIHdpdGggXCJ3aW5kb3cuXCIgb3IgXCJnbG9iYWxUaGlzLlwiLCByZXNvbHZlXG4gICAgICAvLyBpdCBhcyBhIEpTIGZ1bmN0aW9uIGNhbGwgcmF0aGVyIHRoYW4gYSByZWdpc3RlcmVkIDxsb2NhbC1jb21tYW5kPi5cbiAgICAgIC8vIFRoaXMgYWxsb3dzIExFUyBvbi1ldmVudCBoYW5kbGVycyBhbmQgY29tbWFuZCBkby1ibG9ja3MgdG8gYXdhaXRcbiAgICAgIC8vIGFyYml0cmFyeSBKUyBmdW5jdGlvbnMsIGluY2x1ZGluZyBvbmVzIHRoYXQgcmV0dXJuIFByb21pc2VzLlxuICAgICAgLy9cbiAgICAgIC8vIFVzYWdlIGluIExFUyBzb3VyY2U6XG4gICAgICAvLyAgIGNhbGwgd2luZG93LnNoYWtlQW5kUGFuXG4gICAgICAvLyAgIGNhbGwgd2luZG93LmVudGVyTGF5ZXJzU3RhZ2dlclxuICAgICAgLy9cbiAgICAgIC8vIEFyZ3MgKGlmIGFueSkgYXJlIGV2YWx1YXRlZCBhbmQgc3ByZWFkIGFzIHBvc2l0aW9uYWwgcGFyYW1ldGVyczpcbiAgICAgIC8vICAgY2FsbCB3aW5kb3cudXBkYXRlVGltZURpc3BsYXkgWyRjdXJyZW50SG91cl1cbiAgICAgIC8vICAgXHUyMTkyIHdpbmRvdy51cGRhdGVUaW1lRGlzcGxheShjdXJyZW50SG91clZhbHVlKVxuICAgICAgaWYgKG4uY29tbWFuZC5zdGFydHNXaXRoKCd3aW5kb3cuJykgfHwgbi5jb21tYW5kLnN0YXJ0c1dpdGgoJ2dsb2JhbFRoaXMuJykpIHtcbiAgICAgICAgY29uc3QgZm5QYXRoID0gbi5jb21tYW5kLnN0YXJ0c1dpdGgoJ3dpbmRvdy4nKVxuICAgICAgICAgID8gbi5jb21tYW5kLnNsaWNlKCd3aW5kb3cuJy5sZW5ndGgpXG4gICAgICAgICAgOiBuLmNvbW1hbmQuc2xpY2UoJ2dsb2JhbFRoaXMuJy5sZW5ndGgpXG5cbiAgICAgICAgLy8gU3VwcG9ydCBkb3QtcGF0aHM6IHdpbmRvdy5tYXBDb250cm9sbGVyLmVudGVyTGF5ZXJcbiAgICAgICAgY29uc3QgcGFydHMgID0gZm5QYXRoLnNwbGl0KCcuJylcbiAgICAgICAgbGV0ICAgdGFyZ2V0OiB1bmtub3duID0gZ2xvYmFsVGhpc1xuICAgICAgICBmb3IgKGNvbnN0IHBhcnQgb2YgcGFydHMuc2xpY2UoMCwgLTEpKSB7XG4gICAgICAgICAgaWYgKHRhcmdldCA9PSBudWxsIHx8IHR5cGVvZiB0YXJnZXQgIT09ICdvYmplY3QnKSB7IHRhcmdldCA9IHVuZGVmaW5lZDsgYnJlYWsgfVxuICAgICAgICAgIHRhcmdldCA9ICh0YXJnZXQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW3BhcnRdXG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZm5OYW1lID0gcGFydHNbcGFydHMubGVuZ3RoIC0gMV0hXG4gICAgICAgIGNvbnN0IGZuID0gdGFyZ2V0ID09IG51bGwgPyB1bmRlZmluZWRcbiAgICAgICAgICA6ICh0YXJnZXQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pW2ZuTmFtZV1cblxuICAgICAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgY29uc29sZS53YXJuKGBbTEVTXSB3aW5kb3cuJHtmblBhdGh9IGlzIG5vdCBhIGZ1bmN0aW9uIChnb3QgJHt0eXBlb2YgZm59KWApXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICAvLyBFdmFsdWF0ZSBhcmdzIFx1MjAxNCBwYXNzIGFzIHBvc2l0aW9uYWwgcGFyYW1zIGluIGRlY2xhcmF0aW9uIG9yZGVyXG4gICAgICAgIGNvbnN0IGV2YWxlZEFyZ1ZhbHVlcyA9IE9iamVjdC52YWx1ZXMobi5hcmdzKVxuICAgICAgICAgIC5tYXAoZXhwck5vZGUgPT4gZXZhbEV4cHIoZXhwck5vZGUsIGN0eCkpXG5cbiAgICAgICAgY29uc3QgcmVzdWx0ID0gKGZuIGFzICguLi5hOiB1bmtub3duW10pID0+IHVua25vd24pXG4gICAgICAgICAgLmFwcGx5KHRhcmdldCBhcyBvYmplY3QsIGV2YWxlZEFyZ1ZhbHVlcylcbiAgICAgICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpIGF3YWl0IHJlc3VsdFxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgY29uc3QgZGVmID0gY3R4LmNvbW1hbmRzLmdldChuLmNvbW1hbmQpXG4gICAgICBpZiAoIWRlZikge1xuICAgICAgICBjb25zb2xlLndhcm4oYFtMRVNdIFVua25vd24gY29tbWFuZDogXCIke24uY29tbWFuZH1cImApXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICAvLyBFdmFsdWF0ZSBndWFyZCBcdTIwMTQgZmFsc3kgPSBzaWxlbnQgbm8tb3AgKG5vdCBhbiBlcnJvciwgbm8gcmVzY3VlKVxuICAgICAgaWYgKGRlZi5ndWFyZCkge1xuICAgICAgICBjb25zdCBwYXNzZXMgPSBldmFsR3VhcmQoZGVmLmd1YXJkLCBjdHgpXG4gICAgICAgIGlmICghcGFzc2VzKSB7XG4gICAgICAgICAgY29uc29sZS5kZWJ1ZyhgW0xFU10gY29tbWFuZCBcIiR7bi5jb21tYW5kfVwiIGd1YXJkIHJlamVjdGVkYClcbiAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBCdWlsZCBjaGlsZCBzY29wZTogYmluZCBhcmdzIGludG8gaXRcbiAgICAgIGNvbnN0IGNoaWxkU2NvcGUgPSBjdHguc2NvcGUuY2hpbGQoKVxuICAgICAgY29uc3QgZXZhbGVkQXJnczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fVxuICAgICAgZm9yIChjb25zdCBba2V5LCBleHByTm9kZV0gb2YgT2JqZWN0LmVudHJpZXMobi5hcmdzKSkge1xuICAgICAgICBldmFsZWRBcmdzW2tleV0gPSBldmFsRXhwcihleHByTm9kZSwgY3R4KVxuICAgICAgfVxuXG4gICAgICAvLyBBcHBseSBhcmcgZGVmYXVsdHMgZnJvbSBkZWYgKFBoYXNlIDIgQXJnRGVmIHBhcnNpbmcgXHUyMDE0IHNpbXBsaWZpZWQgaGVyZSlcbiAgICAgIGZvciAoY29uc3QgYXJnRGVmIG9mIGRlZi5hcmdzKSB7XG4gICAgICAgIGlmICghKGFyZ0RlZi5uYW1lIGluIGV2YWxlZEFyZ3MpICYmIGFyZ0RlZi5kZWZhdWx0KSB7XG4gICAgICAgICAgZXZhbGVkQXJnc1thcmdEZWYubmFtZV0gPSBldmFsRXhwcihhcmdEZWYuZGVmYXVsdCwgY3R4KVxuICAgICAgICB9XG4gICAgICAgIGNoaWxkU2NvcGUuc2V0KGFyZ0RlZi5uYW1lLCBldmFsZWRBcmdzW2FyZ0RlZi5uYW1lXSA/PyBudWxsKVxuICAgICAgfVxuXG4gICAgICBjb25zdCBjaGlsZEN0eDogTEVTQ29udGV4dCA9IHsgLi4uY3R4LCBzY29wZTogY2hpbGRTY29wZSB9XG4gICAgICBhd2FpdCBleGVjdXRlKGRlZi5ib2R5LCBjaGlsZEN0eClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBuYW1lIDwtIEB2ZXJiICd1cmwnIFthcmdzXSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdiaW5kJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQmluZE5vZGVcbiAgICAgIGNvbnN0IHsgdmVyYiwgdXJsLCBhcmdzIH0gPSBuLmFjdGlvblxuICAgICAgY29uc3QgZXZhbGVkQXJnczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fVxuICAgICAgZm9yIChjb25zdCBba2V5LCBleHByTm9kZV0gb2YgT2JqZWN0LmVudHJpZXMoYXJncykpIHtcbiAgICAgICAgZXZhbGVkQXJnc1trZXldID0gZXZhbEV4cHIoZXhwck5vZGUsIGN0eClcbiAgICAgIH1cblxuICAgICAgbGV0IHJlc3VsdDogdW5rbm93blxuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgcGVyZm9ybUFjdGlvbih2ZXJiLCB1cmwsIGV2YWxlZEFyZ3MsIGN0eClcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBQcm9wYWdhdGUgc28gZW5jbG9zaW5nIHRyeS9yZXNjdWUgY2FuIGNhdGNoIGl0XG4gICAgICAgIHRocm93IGVyclxuICAgICAgfVxuXG4gICAgICBjdHguc2NvcGUuc2V0KG4ubmFtZSwgcmVzdWx0KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIG1hdGNoIHN1YmplY3QgLyBhcm1zIC8gL21hdGNoIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ21hdGNoJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgTWF0Y2hOb2RlXG4gICAgICBjb25zdCBzdWJqZWN0ID0gZXZhbEV4cHIobi5zdWJqZWN0LCBjdHgpXG5cbiAgICAgIGZvciAoY29uc3QgYXJtIG9mIG4uYXJtcykge1xuICAgICAgICBjb25zdCBiaW5kaW5ncyA9IG1hdGNoUGF0dGVybnMoYXJtLnBhdHRlcm5zLCBzdWJqZWN0KVxuICAgICAgICBpZiAoYmluZGluZ3MgIT09IG51bGwpIHtcbiAgICAgICAgICAvLyBDcmVhdGUgY2hpbGQgc2NvcGUgd2l0aCBwYXR0ZXJuIGJpbmRpbmdzXG4gICAgICAgICAgY29uc3QgYXJtU2NvcGUgPSBjdHguc2NvcGUuY2hpbGQoKVxuICAgICAgICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKGJpbmRpbmdzKSkge1xuICAgICAgICAgICAgYXJtU2NvcGUuc2V0KGssIHYpXG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IGFybUN0eDogTEVTQ29udGV4dCA9IHsgLi4uY3R4LCBzY29wZTogYXJtU2NvcGUgfVxuICAgICAgICAgIGF3YWl0IGV4ZWN1dGUoYXJtLmJvZHksIGFybUN0eClcbiAgICAgICAgICByZXR1cm4gICAvLyBGaXJzdCBtYXRjaGluZyBhcm0gd2lucyBcdTIwMTQgbm8gZmFsbHRocm91Z2hcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIG1hdGNoOiBubyBhcm0gbWF0Y2hlZCBzdWJqZWN0OicsIHN1YmplY3QpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgdHJ5IC8gcmVzY3VlIC8gYWZ0ZXJ3YXJkcyAvIC90cnkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAndHJ5Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgVHJ5Tm9kZVxuICAgICAgbGV0IHRocmV3ID0gZmFsc2VcblxuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZXhlY3V0ZShuLmJvZHksIGN0eClcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICB0aHJldyA9IHRydWVcbiAgICAgICAgaWYgKG4ucmVzY3VlKSB7XG4gICAgICAgICAgLy8gQmluZCB0aGUgZXJyb3IgYXMgYCRlcnJvcmAgaW4gdGhlIHJlc2N1ZSBzY29wZVxuICAgICAgICAgIGNvbnN0IHJlc2N1ZVNjb3BlID0gY3R4LnNjb3BlLmNoaWxkKClcbiAgICAgICAgICByZXNjdWVTY29wZS5zZXQoJ2Vycm9yJywgZXJyKVxuICAgICAgICAgIGNvbnN0IHJlc2N1ZUN0eDogTEVTQ29udGV4dCA9IHsgLi4uY3R4LCBzY29wZTogcmVzY3VlU2NvcGUgfVxuICAgICAgICAgIGF3YWl0IGV4ZWN1dGUobi5yZXNjdWUsIHJlc2N1ZUN0eClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBObyByZXNjdWUgY2xhdXNlIFx1MjAxNCByZS10aHJvdyBzbyBvdXRlciB0cnkgY2FuIGNhdGNoIGl0XG4gICAgICAgICAgdGhyb3cgZXJyXG4gICAgICAgIH1cbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIGlmIChuLmFmdGVyd2FyZHMpIHtcbiAgICAgICAgICAvLyBhZnRlcndhcmRzIGFsd2F5cyBydW5zIGlmIGV4ZWN1dGlvbiBlbnRlcmVkIHRoZSB0cnkgYm9keVxuICAgICAgICAgIC8vIChndWFyZCByZWplY3Rpb24gbmV2ZXIgcmVhY2hlcyBoZXJlIFx1MjAxNCBzZWUgYGNhbGxgIGhhbmRsZXIgYWJvdmUpXG4gICAgICAgICAgYXdhaXQgZXhlY3V0ZShuLmFmdGVyd2FyZHMsIGN0eClcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAodGhyZXcgJiYgIW4ucmVzY3VlKSB7XG4gICAgICAgIC8vIEFscmVhZHkgcmUtdGhyb3duIGFib3ZlIFx1MjAxNCB1bnJlYWNoYWJsZSwgYnV0IFR5cGVTY3JpcHQgbmVlZHMgdGhpc1xuICAgICAgfVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIGFuaW1hdGlvbiBwcmltaXRpdmUgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnYW5pbWF0aW9uJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQW5pbWF0aW9uTm9kZVxuICAgICAgY29uc3QgcHJpbWl0aXZlID0gY3R4Lm1vZHVsZXMuZ2V0KG4ucHJpbWl0aXZlKVxuXG4gICAgICBpZiAoIXByaW1pdGl2ZSkge1xuICAgICAgICBjb25zb2xlLndhcm4oY3R4Lm1vZHVsZXMuaGludEZvcihuLnByaW1pdGl2ZSkpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICAvLyBSZXNvbHZlIHNlbGVjdG9yIFx1MjAxNCBzdWJzdGl0dXRlIGFueSBsb2NhbCB2YXJpYWJsZSByZWZlcmVuY2VzXG4gICAgICBjb25zdCBzZWxlY3RvciA9IHJlc29sdmVTZWxlY3RvcihuLnNlbGVjdG9yLCBjdHgpXG5cbiAgICAgIC8vIEV2YWx1YXRlIG9wdGlvbnNcbiAgICAgIGNvbnN0IG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge31cbiAgICAgIGZvciAoY29uc3QgW2tleSwgZXhwck5vZGVdIG9mIE9iamVjdC5lbnRyaWVzKG4ub3B0aW9ucykpIHtcbiAgICAgICAgb3B0aW9uc1trZXldID0gZXZhbEV4cHIoZXhwck5vZGUsIGN0eClcbiAgICAgIH1cblxuICAgICAgLy8gQXdhaXQgdGhlIGFuaW1hdGlvbiBcdTIwMTQgdGhpcyBpcyB0aGUgY29yZSBvZiBhc3luYyB0cmFuc3BhcmVuY3k6XG4gICAgICAvLyBXZWIgQW5pbWF0aW9ucyBBUEkgcmV0dXJucyBhbiBBbmltYXRpb24gd2l0aCBhIC5maW5pc2hlZCBQcm9taXNlLlxuICAgICAgLy8gYHRoZW5gIGluIExFUyBzb3VyY2UgYXdhaXRzIHRoaXMgbmF0dXJhbGx5LlxuICAgICAgYXdhaXQgcHJpbWl0aXZlKHNlbGVjdG9yLCBuLmR1cmF0aW9uLCBuLmVhc2luZywgb3B0aW9ucywgY3R4Lmhvc3QpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgcmF3IGV4cHJlc3Npb24gKGVzY2FwZSBoYXRjaCAvIHVua25vd24gc3RhdGVtZW50cykgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnZXhwcic6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIEV4cHJOb2RlXG4gICAgICBpZiAobi5yYXcudHJpbSgpKSB7XG4gICAgICAgIC8vIEV2YWx1YXRlIGFzIGEgSlMgZXhwcmVzc2lvbiBmb3Igc2lkZSBlZmZlY3RzXG4gICAgICAgIC8vIFRoaXMgaGFuZGxlcyB1bmtub3duIHByaW1pdGl2ZXMgYW5kIGZ1dHVyZSBrZXl3b3JkcyBncmFjZWZ1bGx5XG4gICAgICAgIGV2YWxFeHByKG4sIGN0eClcbiAgICAgIH1cbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBhY3Rpb24gKGJhcmUgQGdldCBldGMuIG5vdCBpbnNpZGUgYSBiaW5kKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICAvLyBgQGdldCAnL2FwaS9mZWVkJyBbZmlsdGVyOiAkYWN0aXZlRmlsdGVyXWBcbiAgICAvLyBBd2FpdHMgdGhlIGZ1bGwgU1NFIHN0cmVhbSAvIEpTT04gcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLlxuICAgIC8vIERhdGFzdGFyIHByb2Nlc3NlcyB0aGUgU1NFIGV2ZW50cyAocGF0Y2gtZWxlbWVudHMsIHBhdGNoLXNpZ25hbHMpIGFzXG4gICAgLy8gdGhleSBhcnJpdmUuIFRoZSBQcm9taXNlIHJlc29sdmVzIHdoZW4gdGhlIHN0cmVhbSBjbG9zZXMuXG4gICAgLy8gYHRoZW5gIGluIExFUyBjb3JyZWN0bHkgd2FpdHMgZm9yIHRoaXMgYmVmb3JlIHByb2NlZWRpbmcuXG4gICAgY2FzZSAnYWN0aW9uJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGVcbiAgICAgIGNvbnN0IGV2YWxlZEFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge31cbiAgICAgIGZvciAoY29uc3QgW2tleSwgZXhwck5vZGVdIG9mIE9iamVjdC5lbnRyaWVzKG4uYXJncykpIHtcbiAgICAgICAgZXZhbGVkQXJnc1trZXldID0gZXZhbEV4cHIoZXhwck5vZGUsIGN0eClcbiAgICAgIH1cbiAgICAgIGF3YWl0IHBlcmZvcm1BY3Rpb24obi52ZXJiLCBuLnVybCwgZXZhbGVkQXJncywgY3R4KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgZGVmYXVsdDoge1xuICAgICAgY29uc3QgZXhoYXVzdGl2ZTogbmV2ZXIgPSBub2RlXG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIFVua25vd24gbm9kZSB0eXBlOicsIChleGhhdXN0aXZlIGFzIExFU05vZGUpLnR5cGUpXG4gICAgfVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gRXhwcmVzc2lvbiBldmFsdWF0aW9uXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBFdmFsdWF0ZXMgYSByYXcgSlMgZXhwcmVzc2lvbiBzdHJpbmcgaW4gYSBzYW5kYm94ZWQgY29udGV4dCB0aGF0XG4gKiBleHBvc2VzIHNjb3BlIGxvY2FscyBhbmQgRGF0YXN0YXIgc2lnbmFscyB2aWEgYSBQcm94eS5cbiAqXG4gKiBTaWduYWwgYWNjZXNzOiBgJGZlZWRTdGF0ZWAgXHUyMTkyIHJlYWRzIHRoZSBgZmVlZFN0YXRlYCBzaWduYWxcbiAqIExvY2FsIGFjY2VzczogIGBmaWx0ZXJgICAgIFx1MjE5MiByZWFkcyBmcm9tIHNjb3BlXG4gKlxuICogVGhlIHNhbmRib3ggaXMgaW50ZW50aW9uYWxseSBzaW1wbGUgZm9yIFBoYXNlIDMuIEEgcHJvcGVyIHNhbmRib3hcbiAqIChDU1AtY29tcGF0aWJsZSwgbm8gZXZhbCBmYWxsYmFjaykgaXMgYSBmdXR1cmUgaGFyZGVuaW5nIHRhc2suXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBldmFsRXhwcihub2RlOiBFeHByTm9kZSwgY3R4OiBMRVNDb250ZXh0KTogdW5rbm93biB7XG4gIGlmICghbm9kZS5yYXcudHJpbSgpKSByZXR1cm4gdW5kZWZpbmVkXG5cbiAgLy8gRmFzdCBwYXRoOiBzaW1wbGUgc3RyaW5nIGxpdGVyYWxcbiAgaWYgKG5vZGUucmF3LnN0YXJ0c1dpdGgoXCInXCIpICYmIG5vZGUucmF3LmVuZHNXaXRoKFwiJ1wiKSkge1xuICAgIHJldHVybiBub2RlLnJhdy5zbGljZSgxLCAtMSlcbiAgfVxuICAvLyBGYXN0IHBhdGg6IG51bWJlciBsaXRlcmFsXG4gIGNvbnN0IG51bSA9IE51bWJlcihub2RlLnJhdylcbiAgaWYgKCFOdW1iZXIuaXNOYU4obnVtKSAmJiBub2RlLnJhdy50cmltKCkgIT09ICcnKSByZXR1cm4gbnVtXG4gIC8vIEZhc3QgcGF0aDogYm9vbGVhblxuICBpZiAobm9kZS5yYXcgPT09ICd0cnVlJykgIHJldHVybiB0cnVlXG4gIGlmIChub2RlLnJhdyA9PT0gJ2ZhbHNlJykgcmV0dXJuIGZhbHNlXG4gIGlmIChub2RlLnJhdyA9PT0gJ251bGwnIHx8IG5vZGUucmF3ID09PSAnbmlsJykgcmV0dXJuIG51bGxcblxuICAvLyBcdTI1MDBcdTI1MDAgRmFzdCBwYXRocyBmb3IgY29tbW9uIGFuaW1hdGlvbi9vcHRpb24gdmFsdWUgcGF0dGVybnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gIC8vIFRoZXNlIGFyZSBub3QgdmFsaWQgSlMgZXhwcmVzc2lvbnMgYnV0IGFwcGVhciBhcyBhbmltYXRpb24gb3B0aW9uIHZhbHVlcy5cbiAgLy8gUmV0dXJuIHRoZW0gYXMgc3RyaW5ncyBzbyB0aGUgYW5pbWF0aW9uIG1vZHVsZSBjYW4gaW50ZXJwcmV0IHRoZW0gZGlyZWN0bHkuXG4gIGlmICgvXlxcZCsoXFwuXFxkKyk/bXMkLy50ZXN0KG5vZGUucmF3KSkgcmV0dXJuIG5vZGUucmF3ICAgICAgICAgICAgICAgICAgIC8vIFwiMjBtc1wiLCBcIjQwbXNcIlxuICBpZiAoL15cXGQrKFxcLlxcZCspP3B4JC8udGVzdChub2RlLnJhdykpIHJldHVybiBub2RlLnJhdyAgICAgICAgICAgICAgICAgICAvLyBcIjdweFwiLCBcIjEycHhcIlxuICBpZiAoL15bYS16QS1aXVthLXpBLVowLTlfLV0qJC8udGVzdChub2RlLnJhdykpIHtcbiAgICAvLyBTY29wZSBsb29rdXAgZmlyc3QgXHUyMDE0IGJhcmUgaWRlbnRpZmllcnMgY2FuIGJlIGxvY2FsIHZhcmlhYmxlcyAoZS5nLiBgc2VsZWN0b3JgLFxuICAgIC8vIGBpZGAsIGBmaWx0ZXJgKSBPUiBhbmltYXRpb24ga2V5d29yZCBzdHJpbmdzIChlLmcuIGByaWdodGAsIGByZXZlcnNlYCwgYHNpbXBsZXhgKS5cbiAgICAvLyBWYXJpYWJsZXMgd2luLiBPbmx5IHJldHVybiB0aGUgcmF3IHN0cmluZyBpZiBub3RoaW5nIGlzIGZvdW5kIGluIHNjb3BlL3NpZ25hbHMuXG4gICAgY29uc3Qgc2NvcGVkID0gY3R4LnNjb3BlLmdldChub2RlLnJhdylcbiAgICBpZiAoc2NvcGVkICE9PSB1bmRlZmluZWQpIHJldHVybiBzY29wZWRcbiAgICBjb25zdCBzaWduYWxlZCA9IGN0eC5nZXRTaWduYWwobm9kZS5yYXcpXG4gICAgaWYgKHNpZ25hbGVkICE9PSB1bmRlZmluZWQpIHJldHVybiBzaWduYWxlZFxuICAgIHJldHVybiBub2RlLnJhdyAgIC8vIGtleXdvcmQgc3RyaW5nOiBcInJldmVyc2VcIiwgXCJyaWdodFwiLCBcImVhc2Utb3V0XCIsIFwic2ltcGxleFwiLCBldGMuXG4gIH1cbiAgaWYgKC9eKGN1YmljLWJlemllcnxzdGVwc3xsaW5lYXIpXFwoLy50ZXN0KG5vZGUucmF3KSkgcmV0dXJuIG5vZGUucmF3ICAgICAgLy8gXCJjdWJpYy1iZXppZXIoMC4yMiwxLDAuMzYsMSlcblxuICB0cnkge1xuICAgIC8vIEJ1aWxkIGEgZmxhdCBvYmplY3Qgb2YgYWxsIGFjY2Vzc2libGUgbmFtZXM6XG4gICAgLy8gLSBTY29wZSBsb2NhbHMgKGlubmVybW9zdCB3aW5zKVxuICAgIC8vIC0gRGF0YXN0YXIgc2lnbmFscyB2aWEgJC1wcmVmaXggc3RyaXBwaW5nXG4gICAgY29uc3Qgc2NvcGVTbmFwc2hvdCA9IGN0eC5zY29wZS5zbmFwc2hvdCgpXG5cbiAgICAvLyBFeHRyYWN0IHNpZ25hbCByZWZlcmVuY2VzIGZyb20gdGhlIGV4cHJlc3Npb24gKCRuYW1lIFx1MjE5MiBuYW1lKVxuICAgIGNvbnN0IHNpZ25hbE5hbWVzID0gWy4uLm5vZGUucmF3Lm1hdGNoQWxsKC9cXCQoW2EtekEtWl9dXFx3KikvZyldXG4gICAgICAubWFwKG0gPT4gbVsxXSEpXG5cbiAgICBjb25zdCBzaWduYWxzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHNpZ25hbE5hbWVzKSB7XG4gICAgICBzaWduYWxzW25hbWVdID0gY3R4LmdldFNpZ25hbChuYW1lKVxuICAgIH1cblxuICAgIC8vIFJld3JpdGUgJG5hbWUgXHUyMTkyIF9fc2lnX25hbWUgaW4gdGhlIGV4cHJlc3Npb24gc28gd2UgY2FuIHBhc3Mgc2lnbmFsc1xuICAgIC8vIGFzIHBsYWluIHZhcmlhYmxlcyAoYXZvaWRzICQgaW4gSlMgaWRlbnRpZmllcnMpXG4gICAgbGV0IHJld3JpdHRlbiA9IG5vZGUucmF3XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHNpZ25hbE5hbWVzKSB7XG4gICAgICByZXdyaXR0ZW4gPSByZXdyaXR0ZW4ucmVwbGFjZUFsbChgJCR7bmFtZX1gLCBgX19zaWdfJHtuYW1lfWApXG4gICAgfVxuXG4gICAgLy8gUHJlZml4IHNpZ25hbCB2YXJzIGluIHRoZSBiaW5kaW5nIG9iamVjdFxuICAgIGNvbnN0IHNpZ0JpbmRpbmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgZm9yIChjb25zdCBbaywgdl0gb2YgT2JqZWN0LmVudHJpZXMoc2lnbmFscykpIHtcbiAgICAgIHNpZ0JpbmRpbmdzW2BfX3NpZ18ke2t9YF0gPSB2XG4gICAgfVxuXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLW5ldy1mdW5jXG4gICAgY29uc3QgZm4gPSBuZXcgRnVuY3Rpb24oXG4gICAgICAuLi5PYmplY3Qua2V5cyhzY29wZVNuYXBzaG90KSxcbiAgICAgIC4uLk9iamVjdC5rZXlzKHNpZ0JpbmRpbmdzKSxcbiAgICAgIGByZXR1cm4gKCR7cmV3cml0dGVufSlgXG4gICAgKVxuICAgIHJldHVybiBmbihcbiAgICAgIC4uLk9iamVjdC52YWx1ZXMoc2NvcGVTbmFwc2hvdCksXG4gICAgICAuLi5PYmplY3QudmFsdWVzKHNpZ0JpbmRpbmdzKVxuICAgIClcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTXSBFeHByZXNzaW9uIGV2YWwgZXJyb3I6ICR7SlNPTi5zdHJpbmdpZnkobm9kZS5yYXcpfWAsIGVycilcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cbn1cblxuLyoqXG4gKiBFdmFsdWF0ZXMgYSBndWFyZCBleHByZXNzaW9uIHN0cmluZyAoZnJvbSBjb21tYW5kIGBndWFyZGAgYXR0cmlidXRlKS5cbiAqIFJldHVybnMgdHJ1ZSBpZiB0aGUgZ3VhcmQgcGFzc2VzIChjb21tYW5kIHNob3VsZCBydW4pLCBmYWxzZSB0byBzaWxlbnQtYWJvcnQuXG4gKi9cbmZ1bmN0aW9uIGV2YWxHdWFyZChndWFyZEV4cHI6IHN0cmluZywgY3R4OiBMRVNDb250ZXh0KTogYm9vbGVhbiB7XG4gIGNvbnN0IHJlc3VsdCA9IGV2YWxFeHByKHsgdHlwZTogJ2V4cHInLCByYXc6IGd1YXJkRXhwciB9LCBjdHgpXG4gIHJldHVybiBCb29sZWFuKHJlc3VsdClcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXR0ZXJuIG1hdGNoaW5nXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBBdHRlbXB0cyB0byBtYXRjaCBgc3ViamVjdGAgYWdhaW5zdCBgcGF0dGVybnNgLlxuICpcbiAqIFJldHVybnMgYSBiaW5kaW5ncyBtYXAgaWYgbWF0Y2hlZCAoZW1wdHkgbWFwIGZvciB3aWxkY2FyZC9saXRlcmFsIG1hdGNoZXMpLFxuICogb3IgbnVsbCBpZiB0aGUgbWF0Y2ggZmFpbHMuXG4gKlxuICogRm9yIHR1cGxlIHBhdHRlcm5zLCBgc3ViamVjdGAgaXMgbWF0Y2hlZCBlbGVtZW50LWJ5LWVsZW1lbnQuXG4gKiBGb3Igb3ItcGF0dGVybnMsIGFueSBhbHRlcm5hdGl2ZSBtYXRjaGluZyByZXR1cm5zIHRoZSBiaW5kaW5ncy5cbiAqL1xuZnVuY3Rpb24gbWF0Y2hQYXR0ZXJucyhcbiAgcGF0dGVybnM6IFBhdHRlcm5Ob2RlW10sXG4gIHN1YmplY3Q6IHVua25vd25cbik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbCB7XG4gIC8vIFNpbmdsZS1wYXR0ZXJuIChtb3N0IGNvbW1vbik6IG1hdGNoIGRpcmVjdGx5XG4gIGlmIChwYXR0ZXJucy5sZW5ndGggPT09IDEpIHtcbiAgICByZXR1cm4gbWF0Y2hTaW5nbGUocGF0dGVybnNbMF0hLCBzdWJqZWN0KVxuICB9XG5cbiAgLy8gVHVwbGUgcGF0dGVybjogc3ViamVjdCBtdXN0IGJlIGFuIGFycmF5XG4gIGlmICghQXJyYXkuaXNBcnJheShzdWJqZWN0KSkge1xuICAgIC8vIFdyYXAgc2luZ2xlIHZhbHVlIGluIHR1cGxlIGZvciBlcmdvbm9taWNzXG4gICAgLy8gZS5nLiBgW2l0IG9rXWAgYWdhaW5zdCBhIHtvazogdHJ1ZSwgZGF0YTogLi4ufSByZXNwb25zZVxuICAgIHJldHVybiBtYXRjaFR1cGxlKHBhdHRlcm5zLCBzdWJqZWN0KVxuICB9XG5cbiAgcmV0dXJuIG1hdGNoVHVwbGUocGF0dGVybnMsIHN1YmplY3QpXG59XG5cbmZ1bmN0aW9uIG1hdGNoVHVwbGUoXG4gIHBhdHRlcm5zOiBQYXR0ZXJuTm9kZVtdLFxuICBzdWJqZWN0OiB1bmtub3duXG4pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IG51bGwge1xuICAvLyBGb3Igbm9uLWFycmF5IHN1YmplY3RzLCB0cnkgYmluZGluZyBlYWNoIHBhdHRlcm4gYWdhaW5zdCB0aGUgd2hvbGUgc3ViamVjdFxuICAvLyAoaGFuZGxlcyBgW2l0IG9rXWAgbWF0Y2hpbmcgYW4gb2JqZWN0IHdoZXJlIGBpdGAgPSBvYmplY3QsIGBva2AgPSBzdGF0dXMpXG4gIGNvbnN0IGJpbmRpbmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXR0ZXJucy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHBhdCA9IHBhdHRlcm5zW2ldIVxuXG4gICAgLy8gRm9yIHR1cGxlIHBhdHRlcm5zIGFnYWluc3Qgb2JqZWN0cywgd2UgZG8gYSBzdHJ1Y3R1cmFsIG1hdGNoOlxuICAgIC8vIGBbaXQgb2tdYCBhZ2FpbnN0IHtkYXRhOiAuLi4sIHN0YXR1czogJ29rJ30gYmluZHMgYGl0YCA9IGRhdGEsIGBva2AgPSAnb2snXG4gICAgLy8gVGhpcyBpcyBhIHNpbXBsaWZpY2F0aW9uIFx1MjAxNCBmdWxsIHN0cnVjdHVyYWwgbWF0Y2hpbmcgY29tZXMgaW4gYSBsYXRlciBwYXNzXG4gICAgY29uc3QgdmFsdWUgPSBBcnJheS5pc0FycmF5KHN1YmplY3QpXG4gICAgICA/IHN1YmplY3RbaV1cbiAgICAgIDogaSA9PT0gMCA/IHN1YmplY3QgOiB1bmRlZmluZWRcblxuICAgIGNvbnN0IHJlc3VsdCA9IG1hdGNoU2luZ2xlKHBhdCwgdmFsdWUpXG4gICAgaWYgKHJlc3VsdCA9PT0gbnVsbCkgcmV0dXJuIG51bGxcbiAgICBPYmplY3QuYXNzaWduKGJpbmRpbmdzLCByZXN1bHQpXG4gIH1cblxuICByZXR1cm4gYmluZGluZ3Ncbn1cblxuZnVuY3Rpb24gbWF0Y2hTaW5nbGUoXG4gIHBhdHRlcm46IFBhdHRlcm5Ob2RlLFxuICB2YWx1ZTogdW5rbm93blxuKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsIHtcbiAgc3dpdGNoIChwYXR0ZXJuLmtpbmQpIHtcbiAgICBjYXNlICd3aWxkY2FyZCc6XG4gICAgICByZXR1cm4ge30gICAvLyBBbHdheXMgbWF0Y2hlcywgYmluZHMgbm90aGluZ1xuXG4gICAgY2FzZSAnbGl0ZXJhbCc6XG4gICAgICByZXR1cm4gdmFsdWUgPT09IHBhdHRlcm4udmFsdWUgPyB7fSA6IG51bGxcblxuICAgIGNhc2UgJ2JpbmRpbmcnOlxuICAgICAgcmV0dXJuIHsgW3BhdHRlcm4ubmFtZV06IHZhbHVlIH0gICAvLyBBbHdheXMgbWF0Y2hlcywgYmluZHMgbmFtZSBcdTIxOTIgdmFsdWVcblxuICAgIGNhc2UgJ29yJzoge1xuICAgICAgZm9yIChjb25zdCBhbHQgb2YgcGF0dGVybi5wYXR0ZXJucykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBtYXRjaFNpbmdsZShhbHQsIHZhbHVlKVxuICAgICAgICBpZiAocmVzdWx0ICE9PSBudWxsKSByZXR1cm4gcmVzdWx0XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbFxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEhUVFAgYWN0aW9uXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBQZXJmb3JtcyBhbiBIVFRQIGFjdGlvbiAoQGdldCwgQHBvc3QsIGV0Yy4pLlxuICpcbiAqIFdoZW4gRGF0YXN0YXIgYWN0aW9ucyBhcmUgYXZhaWxhYmxlIGluIHRoZSBob3N0J3MgY29udGV4dCwgd2UgdHJpZ2dlclxuICogRGF0YXN0YXIncyBmZXRjaCBwaXBlbGluZSAod2hpY2ggaGFuZGxlcyBzaWduYWwgc2VyaWFsaXphdGlvbiwgU1NFXG4gKiByZXNwb25zZSBwcm9jZXNzaW5nLCBhbmQgaW5kaWNhdG9yIHNpZ25hbHMpLlxuICpcbiAqIEZhbGxzIGJhY2sgdG8gbmF0aXZlIGZldGNoIHdoZW4gRGF0YXN0YXIgaXMgbm90IHByZXNlbnQuXG4gKlxuICogTm90ZTogRGF0YXN0YXIncyBAZ2V0IC8gQHBvc3QgYXJlIGZpcmUtYW5kLWZvcmdldCAodGhleSBzdHJlYW0gU1NFIGJhY2tcbiAqIHRvIHBhdGNoIHNpZ25hbHMvZWxlbWVudHMpLiBGb3IgdGhlIGJpbmQgY2FzZSAoYHJlc3BvbnNlIDwtIEBnZXQgLi4uYClcbiAqIHdlIHVzZSBuYXRpdmUgZmV0Y2ggdG8gZ2V0IGEgUHJvbWlzZS1iYXNlZCBKU09OIHJlc3BvbnNlIHRoYXQgTEVTIGNhblxuICogYmluZCB0byBhIGxvY2FsIHZhcmlhYmxlLlxuICovXG5hc3luYyBmdW5jdGlvbiBwZXJmb3JtQWN0aW9uKFxuICB2ZXJiOiBzdHJpbmcsXG4gIHVybDogc3RyaW5nLFxuICBhcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgY3R4OiBMRVNDb250ZXh0XG4pOiBQcm9taXNlPHVua25vd24+IHtcbiAgY29uc3QgbWV0aG9kID0gdmVyYi50b1VwcGVyQ2FzZSgpXG5cbiAgbGV0IGZ1bGxVcmwgPSB1cmxcbiAgbGV0IGJvZHk6IHN0cmluZyB8IHVuZGVmaW5lZFxuXG4gIGlmIChtZXRob2QgPT09ICdHRVQnIHx8IG1ldGhvZCA9PT0gJ0RFTEVURScpIHtcbiAgICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKClcbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhhcmdzKSkge1xuICAgICAgcGFyYW1zLnNldChrLCBTdHJpbmcodikpXG4gICAgfVxuICAgIGNvbnN0IHFzID0gcGFyYW1zLnRvU3RyaW5nKClcbiAgICBpZiAocXMpIGZ1bGxVcmwgPSBgJHt1cmx9PyR7cXN9YFxuICB9IGVsc2Uge1xuICAgIGJvZHkgPSBKU09OLnN0cmluZ2lmeShhcmdzKVxuICB9XG5cbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChmdWxsVXJsLCB7XG4gICAgbWV0aG9kLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAnQWNjZXB0JzogJ3RleHQvZXZlbnQtc3RyZWFtLCBhcHBsaWNhdGlvbi9qc29uJyxcbiAgICB9LFxuICAgIC4uLihib2R5ID8geyBib2R5IH0gOiB7fSksXG4gIH0pXG5cbiAgaWYgKCFyZXNwb25zZS5vaykge1xuICAgIHRocm93IG5ldyBFcnJvcihgW0xFU10gSFRUUCAke3Jlc3BvbnNlLnN0YXR1c30gZnJvbSAke21ldGhvZH0gJHt1cmx9YClcbiAgfVxuXG4gIGNvbnN0IGNvbnRlbnRUeXBlID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpID8/ICcnXG5cbiAgLy8gXHUyNTAwXHUyNTAwIFNTRSBzdHJlYW06IERhdGFzdGFyIHNlcnZlci1zZW50IGV2ZW50cyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgLy8gV2hlbiB0aGUgc2VydmVyIHJldHVybnMgdGV4dC9ldmVudC1zdHJlYW0sIGNvbnN1bWUgdGhlIFNTRSBzdHJlYW0gYW5kXG4gIC8vIGFwcGx5IGRhdGFzdGFyLXBhdGNoLWVsZW1lbnRzIC8gZGF0YXN0YXItcGF0Y2gtc2lnbmFscyBldmVudHMgb3Vyc2VsdmVzLlxuICAvLyBUaGUgUHJvbWlzZSByZXNvbHZlcyB3aGVuIHRoZSBzdHJlYW0gY2xvc2VzIFx1MjAxNCBzbyBgdGhlbmAgaW4gTEVTIGNvcnJlY3RseVxuICAvLyB3YWl0cyBmb3IgYWxsIERPTSBwYXRjaGVzIGJlZm9yZSBwcm9jZWVkaW5nIHRvIHRoZSBuZXh0IHN0ZXAuXG4gIGlmIChjb250ZW50VHlwZS5pbmNsdWRlcygndGV4dC9ldmVudC1zdHJlYW0nKSkge1xuICAgIGF3YWl0IGNvbnN1bWVTU0VTdHJlYW0ocmVzcG9uc2UsIGN0eClcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cblxuICBpZiAoY29udGVudFR5cGUuaW5jbHVkZXMoJ2FwcGxpY2F0aW9uL2pzb24nKSkge1xuICAgIHJldHVybiBhd2FpdCByZXNwb25zZS5qc29uKClcbiAgfVxuICByZXR1cm4gYXdhaXQgcmVzcG9uc2UudGV4dCgpXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gU1NFIHN0cmVhbSBjb25zdW1lclxuLy9cbi8vIFJlYWRzIGEgRGF0YXN0YXIgU1NFIHN0cmVhbSBsaW5lLWJ5LWxpbmUgYW5kIGFwcGxpZXMgdGhlIGV2ZW50cy5cbi8vIFdlIGltcGxlbWVudCBhIG1pbmltYWwgc3Vic2V0IG9mIHRoZSBEYXRhc3RhciBTU0Ugc3BlYyBuZWVkZWQgZm9yIExFUzpcbi8vXG4vLyAgIGRhdGFzdGFyLXBhdGNoLWVsZW1lbnRzICBcdTIxOTIgYXBwbHkgdG8gdGhlIERPTSB1c2luZyBtb3JwaGRvbS1saXRlIGxvZ2ljXG4vLyAgIGRhdGFzdGFyLXBhdGNoLXNpZ25hbHMgICBcdTIxOTIgd3JpdGUgc2lnbmFsIHZhbHVlcyB2aWEgY3R4LnNldFNpZ25hbFxuLy9cbi8vIFRoaXMgcnVucyBlbnRpcmVseSBpbiB0aGUgYnJvd3NlciBcdTIwMTQgbm8gRGF0YXN0YXIgaW50ZXJuYWwgQVBJcyBuZWVkZWQuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuYXN5bmMgZnVuY3Rpb24gY29uc3VtZVNTRVN0cmVhbShcbiAgcmVzcG9uc2U6IFJlc3BvbnNlLFxuICBjdHg6IExFU0NvbnRleHRcbik6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoIXJlc3BvbnNlLmJvZHkpIHJldHVyblxuXG4gIGNvbnN0IHJlYWRlciAgPSByZXNwb25zZS5ib2R5LmdldFJlYWRlcigpXG4gIGNvbnN0IGRlY29kZXIgPSBuZXcgVGV4dERlY29kZXIoKVxuICBsZXQgYnVmZmVyICAgID0gJydcblxuICAvLyBTU0UgZXZlbnQgYWNjdW11bGF0b3IgXHUyMDE0IHJlc2V0IGFmdGVyIGVhY2ggZG91YmxlLW5ld2xpbmVcbiAgbGV0IGV2ZW50VHlwZSA9ICcnXG4gIGxldCBkYXRhTGluZXM6IHN0cmluZ1tdID0gW11cblxuICBjb25zdCBhcHBseUV2ZW50ID0gKCkgPT4ge1xuICAgIGlmICghZXZlbnRUeXBlIHx8IGRhdGFMaW5lcy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gICAgaWYgKGV2ZW50VHlwZSA9PT0gJ2RhdGFzdGFyLXBhdGNoLWVsZW1lbnRzJykge1xuICAgICAgYXBwbHlQYXRjaEVsZW1lbnRzKGRhdGFMaW5lcywgY3R4KVxuICAgIH0gZWxzZSBpZiAoZXZlbnRUeXBlID09PSAnZGF0YXN0YXItcGF0Y2gtc2lnbmFscycpIHtcbiAgICAgIGFwcGx5UGF0Y2hTaWduYWxzKGRhdGFMaW5lcywgY3R4KVxuICAgIH1cblxuICAgIC8vIFJlc2V0IGFjY3VtdWxhdG9yXG4gICAgZXZlbnRUeXBlID0gJydcbiAgICBkYXRhTGluZXMgPSBbXVxuICB9XG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCB7IGRvbmUsIHZhbHVlIH0gPSBhd2FpdCByZWFkZXIucmVhZCgpXG4gICAgaWYgKGRvbmUpIHsgYXBwbHlFdmVudCgpOyBicmVhayB9XG5cbiAgICBidWZmZXIgKz0gZGVjb2Rlci5kZWNvZGUodmFsdWUsIHsgc3RyZWFtOiB0cnVlIH0pXG5cbiAgICAvLyBQcm9jZXNzIGNvbXBsZXRlIGxpbmVzIGZyb20gdGhlIGJ1ZmZlclxuICAgIGNvbnN0IGxpbmVzID0gYnVmZmVyLnNwbGl0KCdcXG4nKVxuICAgIGJ1ZmZlciA9IGxpbmVzLnBvcCgpID8/ICcnICAgLy8gbGFzdCBwYXJ0aWFsIGxpbmUgc3RheXMgaW4gYnVmZmVyXG5cbiAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJ2V2ZW50OicpKSB7XG4gICAgICAgIGV2ZW50VHlwZSA9IGxpbmUuc2xpY2UoJ2V2ZW50OicubGVuZ3RoKS50cmltKClcbiAgICAgIH0gZWxzZSBpZiAobGluZS5zdGFydHNXaXRoKCdkYXRhOicpKSB7XG4gICAgICAgIGRhdGFMaW5lcy5wdXNoKGxpbmUuc2xpY2UoJ2RhdGE6Jy5sZW5ndGgpLnRyaW1TdGFydCgpKVxuICAgICAgfSBlbHNlIGlmIChsaW5lID09PSAnJykge1xuICAgICAgICAvLyBCbGFuayBsaW5lID0gZW5kIG9mIHRoaXMgU1NFIGV2ZW50XG4gICAgICAgIGFwcGx5RXZlbnQoKVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDAgQXBwbHkgZGF0YXN0YXItcGF0Y2gtZWxlbWVudHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIGFwcGx5UGF0Y2hFbGVtZW50cyhkYXRhTGluZXM6IHN0cmluZ1tdLCBjdHg6IExFU0NvbnRleHQpOiB2b2lkIHtcbiAgLy8gUGFyc2UgdGhlIHN0cnVjdHVyZWQgZGF0YSBsaW5lcyBpbnRvIGFuIG9wdGlvbnMgb2JqZWN0XG4gIGxldCBzZWxlY3RvciAgICA9ICcnXG4gIGxldCBtb2RlICAgICAgICA9ICdvdXRlcidcbiAgY29uc3QgaHRtbExpbmVzOiBzdHJpbmdbXSA9IFtdXG5cbiAgZm9yIChjb25zdCBsaW5lIG9mIGRhdGFMaW5lcykge1xuICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJ3NlbGVjdG9yICcpKSAgeyBzZWxlY3RvciA9IGxpbmUuc2xpY2UoJ3NlbGVjdG9yICcubGVuZ3RoKS50cmltKCk7IGNvbnRpbnVlIH1cbiAgICBpZiAobGluZS5zdGFydHNXaXRoKCdtb2RlICcpKSAgICAgIHsgbW9kZSAgICAgPSBsaW5lLnNsaWNlKCdtb2RlICcubGVuZ3RoKS50cmltKCk7ICAgICBjb250aW51ZSB9XG4gICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnZWxlbWVudHMgJykpICB7IGh0bWxMaW5lcy5wdXNoKGxpbmUuc2xpY2UoJ2VsZW1lbnRzICcubGVuZ3RoKSk7ICAgY29udGludWUgfVxuICAgIC8vIExpbmVzIHdpdGggbm8gcHJlZml4IGFyZSBhbHNvIGVsZW1lbnQgY29udGVudCAoRGF0YXN0YXIgc3BlYyBhbGxvd3MgdGhpcylcbiAgICBodG1sTGluZXMucHVzaChsaW5lKVxuICB9XG5cbiAgY29uc3QgaHRtbCA9IGh0bWxMaW5lcy5qb2luKCdcXG4nKS50cmltKClcblxuICBjb25zdCB0YXJnZXQgPSBzZWxlY3RvclxuICAgID8gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcilcbiAgICA6IG51bGxcblxuICBjb25zb2xlLmxvZyhgW0xFUzpzc2VdIHBhdGNoLWVsZW1lbnRzIG1vZGU9JHttb2RlfSBzZWxlY3Rvcj1cIiR7c2VsZWN0b3J9XCIgaHRtbC5sZW49JHtodG1sLmxlbmd0aH1gKVxuXG4gIGlmIChtb2RlID09PSAncmVtb3ZlJykge1xuICAgIC8vIFJlbW92ZSBhbGwgbWF0Y2hpbmcgZWxlbWVudHNcbiAgICBjb25zdCB0b1JlbW92ZSA9IHNlbGVjdG9yXG4gICAgICA/IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpXG4gICAgICA6IFtdXG4gICAgdG9SZW1vdmUuZm9yRWFjaChlbCA9PiBlbC5yZW1vdmUoKSlcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChtb2RlID09PSAnYXBwZW5kJyAmJiB0YXJnZXQpIHtcbiAgICBjb25zdCBmcmFnID0gcGFyc2VIVE1MKGh0bWwpXG4gICAgdGFyZ2V0LmFwcGVuZChmcmFnKVxuICAgIHJldHVyblxuICB9XG5cbiAgaWYgKG1vZGUgPT09ICdwcmVwZW5kJyAmJiB0YXJnZXQpIHtcbiAgICBjb25zdCBmcmFnID0gcGFyc2VIVE1MKGh0bWwpXG4gICAgdGFyZ2V0LnByZXBlbmQoZnJhZylcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChtb2RlID09PSAnaW5uZXInICYmIHRhcmdldCkge1xuICAgIHRhcmdldC5pbm5lckhUTUwgPSBodG1sXG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAobW9kZSA9PT0gJ291dGVyJyAmJiB0YXJnZXQpIHtcbiAgICBjb25zdCBmcmFnID0gcGFyc2VIVE1MKGh0bWwpXG4gICAgdGFyZ2V0LnJlcGxhY2VXaXRoKGZyYWcpXG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAobW9kZSA9PT0gJ2JlZm9yZScgJiYgdGFyZ2V0KSB7XG4gICAgY29uc3QgZnJhZyA9IHBhcnNlSFRNTChodG1sKVxuICAgIHRhcmdldC5iZWZvcmUoZnJhZylcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChtb2RlID09PSAnYWZ0ZXInICYmIHRhcmdldCkge1xuICAgIGNvbnN0IGZyYWcgPSBwYXJzZUhUTUwoaHRtbClcbiAgICB0YXJnZXQuYWZ0ZXIoZnJhZylcbiAgICByZXR1cm5cbiAgfVxuXG4gIC8vIE5vIHNlbGVjdG9yOiB0cnkgdG8gcGF0Y2ggYnkgZWxlbWVudCBJRHNcbiAgaWYgKCFzZWxlY3RvciAmJiBodG1sKSB7XG4gICAgY29uc3QgZnJhZyA9IHBhcnNlSFRNTChodG1sKVxuICAgIGZvciAoY29uc3QgZWwgb2YgQXJyYXkuZnJvbShmcmFnLmNoaWxkcmVuKSkge1xuICAgICAgY29uc3QgaWQgPSBlbC5pZFxuICAgICAgaWYgKGlkKSB7XG4gICAgICAgIGNvbnN0IGV4aXN0aW5nID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpXG4gICAgICAgIGlmIChleGlzdGluZykgZXhpc3RpbmcucmVwbGFjZVdpdGgoZWwpXG4gICAgICAgIGVsc2UgZG9jdW1lbnQuYm9keS5hcHBlbmQoZWwpXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHBhcnNlSFRNTChodG1sOiBzdHJpbmcpOiBEb2N1bWVudEZyYWdtZW50IHtcbiAgY29uc3QgdGVtcGxhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpXG4gIHRlbXBsYXRlLmlubmVySFRNTCA9IGh0bWxcbiAgcmV0dXJuIHRlbXBsYXRlLmNvbnRlbnRcbn1cblxuLy8gXHUyNTAwXHUyNTAwIEFwcGx5IGRhdGFzdGFyLXBhdGNoLXNpZ25hbHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIGFwcGx5UGF0Y2hTaWduYWxzKGRhdGFMaW5lczogc3RyaW5nW10sIGN0eDogTEVTQ29udGV4dCk6IHZvaWQge1xuICBmb3IgKGNvbnN0IGxpbmUgb2YgZGF0YUxpbmVzKSB7XG4gICAgaWYgKCFsaW5lLnN0YXJ0c1dpdGgoJ3NpZ25hbHMgJykgJiYgIWxpbmUuc3RhcnRzV2l0aCgneycpKSBjb250aW51ZVxuXG4gICAgY29uc3QganNvblN0ciA9IGxpbmUuc3RhcnRzV2l0aCgnc2lnbmFscyAnKVxuICAgICAgPyBsaW5lLnNsaWNlKCdzaWduYWxzICcubGVuZ3RoKVxuICAgICAgOiBsaW5lXG5cbiAgICB0cnkge1xuICAgICAgY29uc3Qgc2lnbmFscyA9IEpTT04ucGFyc2UoanNvblN0cikgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbiAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHNpZ25hbHMpKSB7XG4gICAgICAgIGN0eC5zZXRTaWduYWwoa2V5LCB2YWx1ZSlcbiAgICAgICAgY29uc29sZS5sb2coYFtMRVM6c3NlXSBwYXRjaC1zaWduYWxzICQke2tleX0gPWAsIHZhbHVlKVxuICAgICAgfVxuICAgIH0gY2F0Y2gge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTOnNzZV0gRmFpbGVkIHRvIHBhcnNlIHBhdGNoLXNpZ25hbHMgSlNPTjonLCBqc29uU3RyKVxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFNlbGVjdG9yIHJlc29sdXRpb25cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFJlc29sdmVzIHZhcmlhYmxlIHJlZmVyZW5jZXMgaW4gYW4gYW5pbWF0aW9uIHNlbGVjdG9yLlxuICpcbiAqIEV4YW1wbGU6IGBbZGF0YS1pdGVtLWlkOiBpZF1gIHdoZXJlIGBpZGAgaXMgYSBsb2NhbCB2YXJpYWJsZVxuICogYmVjb21lcyBgW2RhdGEtaXRlbS1pZD1cIjEyM1wiXWAgYWZ0ZXIgc3Vic3RpdHV0aW9uLlxuICpcbiAqIFNpbXBsZSBhcHByb2FjaCBmb3IgUGhhc2UgMzogbG9vayBmb3IgYDogdmFybmFtZWAgcGF0dGVybnMgaW4gYXR0cmlidXRlXG4gKiBzZWxlY3RvcnMgYW5kIHN1YnN0aXR1dGUgZnJvbSBzY29wZS5cbiAqL1xuZnVuY3Rpb24gcmVzb2x2ZVNlbGVjdG9yKHNlbGVjdG9yOiBzdHJpbmcsIGN0eDogTEVTQ29udGV4dCk6IHN0cmluZyB7XG4gIC8vIFJlc29sdmVzIExFUyBhdHRyaWJ1dGUgc2VsZWN0b3JzIHRoYXQgY29udGFpbiB2YXJpYWJsZSBleHByZXNzaW9uczpcbiAgLy8gICBbZGF0YS1pdGVtLWlkOiBpZF0gICAgICAgICAgIFx1MjE5MiBbZGF0YS1pdGVtLWlkPVwiNDJcIl1cbiAgLy8gICBbZGF0YS1jYXJkLWlkOiBwYXlsb2FkWzBdXSAgIFx1MjE5MiBbZGF0YS1jYXJkLWlkPVwiM1wiXVxuICAvL1xuICAvLyBBIHJlZ2V4IGlzIGluc3VmZmljaWVudCBiZWNhdXNlIHRoZSB2YXJpYWJsZSBleHByZXNzaW9uIGNhbiBpdHNlbGYgY29udGFpblxuICAvLyBicmFja2V0cyAoZS5nLiBwYXlsb2FkWzBdKSwgd2hpY2ggd291bGQgY29uZnVzZSBhIFteXFxdXSsgcGF0dGVybi5cbiAgLy8gV2UgdXNlIGEgYnJhY2tldC1kZXB0aC1hd2FyZSBzY2FubmVyIGluc3RlYWQuXG4gIGxldCByZXN1bHQgPSAnJ1xuICBsZXQgaSA9IDBcbiAgd2hpbGUgKGkgPCBzZWxlY3Rvci5sZW5ndGgpIHtcbiAgICBpZiAoc2VsZWN0b3JbaV0gPT09ICdbJykge1xuICAgICAgLy8gTG9vayBmb3IgXCI6IFwiIChjb2xvbi1zcGFjZSkgYXMgdGhlIGF0dHIvdmFyRXhwciBzZXBhcmF0b3JcbiAgICAgIGNvbnN0IGNvbG9uSWR4ID0gc2VsZWN0b3IuaW5kZXhPZignOiAnLCBpKVxuICAgICAgaWYgKGNvbG9uSWR4ID09PSAtMSkgeyByZXN1bHQgKz0gc2VsZWN0b3JbaSsrXTsgY29udGludWUgfVxuXG4gICAgICAvLyBTY2FuIGZvcndhcmQgZnJvbSB0aGUgdmFyRXhwciBzdGFydCwgdHJhY2tpbmcgYnJhY2tldCBkZXB0aCxcbiAgICAgIC8vIHRvIGZpbmQgdGhlIF0gdGhhdCBjbG9zZXMgdGhpcyBhdHRyaWJ1dGUgc2VsZWN0b3IgKG5vdCBhbiBpbm5lciBvbmUpXG4gICAgICBsZXQgZGVwdGggPSAwXG4gICAgICBsZXQgY2xvc2VJZHggPSAtMVxuICAgICAgZm9yIChsZXQgaiA9IGNvbG9uSWR4ICsgMjsgaiA8IHNlbGVjdG9yLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGlmIChzZWxlY3RvcltqXSA9PT0gJ1snKSBkZXB0aCsrXG4gICAgICAgIGVsc2UgaWYgKHNlbGVjdG9yW2pdID09PSAnXScpIHtcbiAgICAgICAgICBpZiAoZGVwdGggPT09IDApIHsgY2xvc2VJZHggPSBqOyBicmVhayB9XG4gICAgICAgICAgZGVwdGgtLVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoY2xvc2VJZHggPT09IC0xKSB7IHJlc3VsdCArPSBzZWxlY3RvcltpKytdOyBjb250aW51ZSB9XG5cbiAgICAgIGNvbnN0IGF0dHIgICAgPSBzZWxlY3Rvci5zbGljZShpICsgMSwgY29sb25JZHgpLnRyaW0oKVxuICAgICAgY29uc3QgdmFyRXhwciA9IHNlbGVjdG9yLnNsaWNlKGNvbG9uSWR4ICsgMiwgY2xvc2VJZHgpLnRyaW0oKVxuICAgICAgY29uc3QgdmFsdWUgICA9IGV2YWxFeHByKHsgdHlwZTogJ2V4cHInLCByYXc6IHZhckV4cHIgfSwgY3R4KVxuICAgICAgcmVzdWx0ICs9IGBbJHthdHRyfT1cIiR7U3RyaW5nKHZhbHVlKX1cIl1gXG4gICAgICBpID0gY2xvc2VJZHggKyAxXG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdCArPSBzZWxlY3RvcltpKytdXG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHRcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBHdWFyZC1hd2FyZSBjb21tYW5kIGV4ZWN1dGlvbiAodXNlZCBieSBQaGFzZSA0IGV2ZW50IHdpcmluZylcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIEV4ZWN1dGVzIGEgY29tbWFuZCBieSBuYW1lLCBjaGVja2luZyBpdHMgZ3VhcmQgZmlyc3QuXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGNvbW1hbmQgcmFuLCBmYWxzZSBpZiB0aGUgZ3VhcmQgcmVqZWN0ZWQgaXQuXG4gKlxuICogVGhpcyBpcyB0aGUgcHVibGljIEFQSSBmb3IgUGhhc2UgNCBldmVudCBoYW5kbGVycyB0aGF0IGNhbGwgY29tbWFuZHMuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5Db21tYW5kKFxuICBuYW1lOiBzdHJpbmcsXG4gIGFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICBjdHg6IExFU0NvbnRleHRcbik6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBjb25zdCBkZWYgPSBjdHguY29tbWFuZHMuZ2V0KG5hbWUpXG4gIGlmICghZGVmKSB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTXSBVbmtub3duIGNvbW1hbmQ6IFwiJHtuYW1lfVwiYClcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGlmIChkZWYuZ3VhcmQpIHtcbiAgICBpZiAoIWV2YWxHdWFyZChkZWYuZ3VhcmQsIGN0eCkpIHJldHVybiBmYWxzZVxuICB9XG5cbiAgY29uc3Qgc2NvcGUgPSBjdHguc2NvcGUuY2hpbGQoKVxuICBmb3IgKGNvbnN0IGFyZ0RlZiBvZiBkZWYuYXJncykge1xuICAgIHNjb3BlLnNldChhcmdEZWYubmFtZSwgYXJnc1thcmdEZWYubmFtZV0gPz8gbnVsbClcbiAgfVxuXG4gIGF3YWl0IGV4ZWN1dGUoZGVmLmJvZHksIHsgLi4uY3R4LCBzY29wZSB9KVxuICByZXR1cm4gdHJ1ZVxufVxuIiwgImltcG9ydCB0eXBlIHsgTEVTTm9kZSwgRXhwck5vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuLyoqIEEgc2luZ2xlIHR5cGVkIGFyZ3VtZW50IGRlZmluaXRpb24gZnJvbSBhcmdzPVwiW25hbWU6dHlwZSAgLi4uXVwiICovXG5leHBvcnQgaW50ZXJmYWNlIEFyZ0RlZiB7XG4gIG5hbWU6IHN0cmluZ1xuICAvKiogJ25pbCcgfCAnaW50JyB8ICdkZWMnIHwgJ3N0cicgfCAnYXJyJyB8ICdvYmonIHwgJ2Jvb2wnIHwgJ2R5bicgKi9cbiAgdHlwZTogc3RyaW5nXG4gIC8qKiBEZWZhdWx0IHZhbHVlIGV4cHJlc3Npb24sIGlmIHByb3ZpZGVkIChlLmcuIGF0dGVtcHQ6aW50PTApICovXG4gIGRlZmF1bHQ/OiBFeHByTm9kZVxufVxuXG4vKiogQSBmdWxseSBwYXJzZWQgPGxvY2FsLWNvbW1hbmQ+IGRlZmluaXRpb24uICovXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmREZWYge1xuICBuYW1lOiBzdHJpbmdcbiAgYXJnczogQXJnRGVmW11cbiAgLyoqIEd1YXJkIGV4cHJlc3Npb24gc3RyaW5nIFx1MjAxNCBldmFsdWF0ZWQgYmVmb3JlIGV4ZWN1dGlvbi4gRmFsc3kgPSBzaWxlbnQgbm8tb3AuICovXG4gIGd1YXJkPzogc3RyaW5nXG4gIC8qKiBUaGUgcGFyc2VkIGJvZHkgQVNUICovXG4gIGJvZHk6IExFU05vZGVcbiAgLyoqIFRoZSA8bG9jYWwtY29tbWFuZD4gRE9NIGVsZW1lbnQsIGtlcHQgZm9yIGVycm9yIHJlcG9ydGluZyAqL1xuICBlbGVtZW50OiBFbGVtZW50XG59XG5cbmV4cG9ydCBjbGFzcyBDb21tYW5kUmVnaXN0cnkge1xuICBwcml2YXRlIGNvbW1hbmRzID0gbmV3IE1hcDxzdHJpbmcsIENvbW1hbmREZWY+KClcblxuICAvLyBcdTI1MDBcdTI1MDAgQ29tbWFuZCByZWdpc3RyeSBpbmhlcml0YW5jZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgLy8gV2hlbiBhIGNoaWxkIExFUyBlbGVtZW50IGNhbm5vdCBmaW5kIGEgY29tbWFuZCBsb2NhbGx5LCBpdCB3YWxrcyB1cCB0b1xuICAvLyBpdHMgcGFyZW50J3MgcmVnaXN0cnkuIFNldCBieSBMb2NhbEV2ZW50U2NyaXB0Ll9pbml0KCkgb25jZSB0aGUgdHJlZVxuICAvLyBpcyBlc3RhYmxpc2hlZC4gRW5hYmxlcyBzaGFyZWQgY29tbWFuZHMgZGVmaW5lZCBhdCByb290LCBjYWxsYWJsZSBmcm9tXG4gIC8vIGFueSBkZXNjZW5kYW50IFx1MjAxNCBsaWtlIGNsYXNzIG1ldGhvZCBpbmhlcml0YW5jZS5cbiAgcHJpdmF0ZSBfcGFyZW50OiBDb21tYW5kUmVnaXN0cnkgfCBudWxsID0gbnVsbFxuXG4gIHNldFBhcmVudChwYXJlbnQ6IENvbW1hbmRSZWdpc3RyeSB8IG51bGwpOiB2b2lkIHtcbiAgICB0aGlzLl9wYXJlbnQgPSBwYXJlbnRcbiAgfVxuXG4gIHJlZ2lzdGVyKGRlZjogQ29tbWFuZERlZik6IHZvaWQge1xuICAgIGlmICh0aGlzLmNvbW1hbmRzLmhhcyhkZWYubmFtZSkpIHtcbiAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgYFtMRVNdIER1cGxpY2F0ZSBjb21tYW5kIFwiJHtkZWYubmFtZX1cIiBcdTIwMTQgcHJldmlvdXMgZGVmaW5pdGlvbiBvdmVyd3JpdHRlbi5gLFxuICAgICAgICBkZWYuZWxlbWVudFxuICAgICAgKVxuICAgIH1cbiAgICB0aGlzLmNvbW1hbmRzLnNldChkZWYubmFtZSwgZGVmKVxuICB9XG5cbiAgLyoqIExvb2tzIHVwIGxvY2FsbHkgZmlyc3QsIHRoZW4gd2Fsa3MgdXAgdGhlIHBhcmVudCBjaGFpbi4gKi9cbiAgZ2V0KG5hbWU6IHN0cmluZyk6IENvbW1hbmREZWYgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLmNvbW1hbmRzLmdldChuYW1lKSA/PyB0aGlzLl9wYXJlbnQ/LmdldChuYW1lKVxuICB9XG5cbiAgLyoqIFJldHVybnMgdHJ1ZSBpZiBjb21tYW5kIGV4aXN0cyBsb2NhbGx5IChkb2VzIG5vdCBjaGVjayBwYXJlbnQpLiAqL1xuICBoYXMobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY29tbWFuZHMuaGFzKG5hbWUpXG4gIH1cblxuICAvKiogUmV0dXJucyB0cnVlIGlmIGNvbW1hbmQgZXhpc3RzIGxvY2FsbHkgT1IgaW4gYW55IGFuY2VzdG9yIHJlZ2lzdHJ5LiAqL1xuICByZXNvbHZlcyhuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5jb21tYW5kcy5oYXMobmFtZSkgfHwgKHRoaXMuX3BhcmVudD8ucmVzb2x2ZXMobmFtZSkgPz8gZmFsc2UpXG4gIH1cblxuICBuYW1lcygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5jb21tYW5kcy5rZXlzKCkpXG4gIH1cbn1cbiIsICIvLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIExFUyBNb2R1bGUgc3lzdGVtXG4vL1xuLy8gTW9kdWxlcyBleHRlbmQgdGhlIHNldCBvZiBhbmltYXRpb24vZWZmZWN0IHByaW1pdGl2ZXMgYXZhaWxhYmxlIGluXG4vLyA8bG9jYWwtY29tbWFuZD4gYm9kaWVzLiBUd28ga2luZHM6XG4vL1xuLy8gICBCdWlsdC1pbjogIDx1c2UtbW9kdWxlIHR5cGU9XCJhbmltYXRpb25cIj5cbi8vICAgVXNlcmxhbmQ6ICA8dXNlLW1vZHVsZSBzcmM9XCIuL3Njcm9sbC1lZmZlY3RzLmpzXCI+XG4vL1xuLy8gQm90aCByZXNvbHZlIHRvIGEgTEVTTW9kdWxlIGF0IHJ1bnRpbWUuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBBIHByaW1pdGl2ZSBpcyBhbiBhc3luYyBvcGVyYXRpb24gdGhlIGV4ZWN1dG9yIGRpc3BhdGNoZXMgZm9yIEFuaW1hdGlvbk5vZGUuXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yICBDU1Mgc2VsZWN0b3Igc3RyaW5nIChhbHJlYWR5IHJlc29sdmVkIFx1MjAxNCBubyB2YXJpYWJsZSBzdWJzdGl0dXRpb24gbmVlZGVkIGhlcmUpXG4gKiBAcGFyYW0gZHVyYXRpb24gIG1pbGxpc2Vjb25kc1xuICogQHBhcmFtIGVhc2luZyAgICBDU1MgZWFzaW5nIHN0cmluZywgZS5nLiAnZWFzZS1vdXQnXG4gKiBAcGFyYW0gb3B0aW9ucyAgIGtleS92YWx1ZSBvcHRpb25zIGZyb20gdGhlIHRyYWlsaW5nIFsuLi5dIGJsb2NrLCBhbHJlYWR5IGV2YWx1YXRlZFxuICogQHBhcmFtIGhvc3QgICAgICB0aGUgPGxvY2FsLWV2ZW50LXNjcmlwdD4gZWxlbWVudCAodXNlZCBhcyBxdWVyeVNlbGVjdG9yIHJvb3QpXG4gKi9cbmV4cG9ydCB0eXBlIExFU1ByaW1pdGl2ZSA9IChcbiAgc2VsZWN0b3I6IHN0cmluZyxcbiAgZHVyYXRpb246IG51bWJlcixcbiAgZWFzaW5nOiBzdHJpbmcsXG4gIG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICBob3N0OiBFbGVtZW50XG4pID0+IFByb21pc2U8dm9pZD5cblxuLyoqIFRoZSBzaGFwZSBhIHVzZXJsYW5kIG1vZHVsZSBtdXN0IGV4cG9ydCBhcyBpdHMgZGVmYXVsdCBleHBvcnQuICovXG5leHBvcnQgaW50ZXJmYWNlIExFU01vZHVsZSB7XG4gIC8qKiBIdW1hbi1yZWFkYWJsZSBuYW1lIGZvciBlcnJvciBtZXNzYWdlcyAqL1xuICBuYW1lOiBzdHJpbmdcbiAgcHJpbWl0aXZlczogUmVjb3JkPHN0cmluZywgTEVTUHJpbWl0aXZlPlxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgUmVnaXN0cnkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBjbGFzcyBNb2R1bGVSZWdpc3RyeSB7XG4gIHByaXZhdGUgcHJpbWl0aXZlcyA9IG5ldyBNYXA8c3RyaW5nLCBMRVNQcmltaXRpdmU+KClcbiAgcHJpdmF0ZSBsb2FkZWRNb2R1bGVzOiBzdHJpbmdbXSA9IFtdXG5cbiAgcmVnaXN0ZXIobW9kdWxlOiBMRVNNb2R1bGUpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBmbl0gb2YgT2JqZWN0LmVudHJpZXMobW9kdWxlLnByaW1pdGl2ZXMpKSB7XG4gICAgICB0aGlzLnByaW1pdGl2ZXMuc2V0KG5hbWUsIGZuKVxuICAgIH1cbiAgICB0aGlzLmxvYWRlZE1vZHVsZXMucHVzaChtb2R1bGUubmFtZSlcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gbW9kdWxlIGxvYWRlZDogXCIke21vZHVsZS5uYW1lfVwiYCwgT2JqZWN0LmtleXMobW9kdWxlLnByaW1pdGl2ZXMpKVxuICB9XG5cbiAgZ2V0KHByaW1pdGl2ZTogc3RyaW5nKTogTEVTUHJpbWl0aXZlIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5wcmltaXRpdmVzLmdldChwcmltaXRpdmUpXG4gIH1cblxuICBoYXMocHJpbWl0aXZlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5wcmltaXRpdmVzLmhhcyhwcmltaXRpdmUpXG4gIH1cblxuICAvKiogRGV2LW1vZGUgaGVscDogd2hpY2ggbW9kdWxlIGV4cG9ydHMgYSBnaXZlbiBwcmltaXRpdmU/ICovXG4gIGhpbnRGb3IocHJpbWl0aXZlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIC8vIFdpbGwgYmUgZW5yaWNoZWQgaW4gUGhhc2UgOCB3aXRoIHBlci1tb2R1bGUgcHJpbWl0aXZlIG1hbmlmZXN0cy5cbiAgICByZXR1cm4gYFByaW1pdGl2ZSBcIiR7cHJpbWl0aXZlfVwiIG5vdCBmb3VuZC4gTG9hZGVkIG1vZHVsZXM6IFske3RoaXMubG9hZGVkTW9kdWxlcy5qb2luKCcsICcpfV0uIERpZCB5b3UgZm9yZ2V0IDx1c2UtbW9kdWxlIHR5cGU9XCJhbmltYXRpb25cIj4/YFxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBMb2FkZXIgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKiBCdWlsdC1pbiBtb2R1bGUgcmVnaXN0cnk6IHR5cGUgbmFtZSBcdTIxOTIgaW1wb3J0IHBhdGggKi9cbmNvbnN0IEJVSUxUSU5fTU9EVUxFUzogUmVjb3JkPHN0cmluZywgKCkgPT4gUHJvbWlzZTx7IGRlZmF1bHQ6IExFU01vZHVsZSB9Pj4gPSB7XG4gIGFuaW1hdGlvbjogKCkgPT4gaW1wb3J0KCcuL2J1aWx0aW4vYW5pbWF0aW9uLmpzJyksXG4gIGJyaWRnZTogICAgKCkgPT4gaW1wb3J0KCcuL2J1aWx0aW4vYnJpZGdlLmpzJyksXG59XG5cbi8qKlxuICogUmVzb2x2ZSBhIDx1c2UtbW9kdWxlPiBlbGVtZW50IHRvIGEgTEVTTW9kdWxlIGFuZCByZWdpc3RlciBpdC5cbiAqIENhbGxlZCBkdXJpbmcgUGhhc2UgMSBET00gcmVhZGluZyAoUGhhc2UgOCBjb21wbGV0ZXMgdGhlIHNyYz0gcGF0aCkuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkTW9kdWxlKFxuICByZWdpc3RyeTogTW9kdWxlUmVnaXN0cnksXG4gIG9wdHM6IHsgdHlwZT86IHN0cmluZzsgc3JjPzogc3RyaW5nIH1cbik6IFByb21pc2U8dm9pZD4ge1xuICBpZiAob3B0cy50eXBlKSB7XG4gICAgY29uc3QgbG9hZGVyID0gQlVJTFRJTl9NT0RVTEVTW29wdHMudHlwZV1cbiAgICBpZiAoIWxvYWRlcikge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTXSBVbmtub3duIGJ1aWx0LWluIG1vZHVsZSB0eXBlOiBcIiR7b3B0cy50eXBlfVwiLiBBdmFpbGFibGU6ICR7T2JqZWN0LmtleXMoQlVJTFRJTl9NT0RVTEVTKS5qb2luKCcsICcpfWApXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uc3QgbW9kID0gYXdhaXQgbG9hZGVyKClcbiAgICByZWdpc3RyeS5yZWdpc3Rlcihtb2QuZGVmYXVsdClcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChvcHRzLnNyYykge1xuICAgIHRyeSB7XG4gICAgICAvLyBSZXNvbHZlIHJlbGF0aXZlIHBhdGhzIGFnYWluc3QgdGhlIHBhZ2UgVVJMLCBub3QgdGhlIGJ1bmRsZSBVUkwuXG4gICAgICAvLyBXaXRob3V0IHRoaXMsICcuL3Njcm9sbC1lZmZlY3RzLmpzJyByZXNvbHZlcyB0byAnL2Rpc3Qvc2Nyb2xsLWVmZmVjdHMuanMnXG4gICAgICAvLyAocmVsYXRpdmUgdG8gdGhlIGJ1bmRsZSBhdCAvZGlzdC9sb2NhbC1ldmVudC1zY3JpcHQuanMpIGluc3RlYWQgb2ZcbiAgICAgIC8vICcvc2Nyb2xsLWVmZmVjdHMuanMnIChyZWxhdGl2ZSB0byB0aGUgSFRNTCBwYWdlKS5cbiAgICAgIGNvbnN0IHJlc29sdmVkU3JjID0gbmV3IFVSTChvcHRzLnNyYywgZG9jdW1lbnQuYmFzZVVSSSkuaHJlZlxuICAgICAgY29uc3QgbW9kID0gYXdhaXQgaW1wb3J0KC8qIEB2aXRlLWlnbm9yZSAqLyByZXNvbHZlZFNyYylcbiAgICAgIGlmICghbW9kLmRlZmF1bHQgfHwgdHlwZW9mIG1vZC5kZWZhdWx0LnByaW1pdGl2ZXMgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgW0xFU10gTW9kdWxlIGF0IFwiJHtvcHRzLnNyY31cIiBkb2VzIG5vdCBleHBvcnQgYSB2YWxpZCBMRVNNb2R1bGUuIEV4cGVjdGVkOiB7IG5hbWU6IHN0cmluZywgcHJpbWl0aXZlczogUmVjb3JkPHN0cmluZywgRnVuY3Rpb24+IH1gKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKG1vZC5kZWZhdWx0IGFzIExFU01vZHVsZSlcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFtMRVNdIEZhaWxlZCB0byBsb2FkIG1vZHVsZSBmcm9tIFwiJHtvcHRzLnNyY31cIjpgLCBlcnIpXG4gICAgfVxuICAgIHJldHVyblxuICB9XG5cbiAgY29uc29sZS53YXJuKCdbTEVTXSA8dXNlLW1vZHVsZT4gcmVxdWlyZXMgZWl0aGVyIHR5cGU9IG9yIHNyYz0gYXR0cmlidXRlLicpXG59XG4iLCAiLyoqXG4gKiBTdHJpcHMgdGhlIGJhY2t0aWNrIHdyYXBwZXIgZnJvbSBhIG11bHRpLWxpbmUgTEVTIGJvZHkgc3RyaW5nIGFuZFxuICogbm9ybWFsaXplcyBpbmRlbnRhdGlvbiwgcHJvZHVjaW5nIGEgY2xlYW4gc3RyaW5nIHRoZSBwYXJzZXIgY2FuIHdvcmsgd2l0aC5cbiAqXG4gKiBDb252ZW50aW9uOlxuICogICBTaW5nbGUtbGluZTogIGhhbmRsZT1cImVtaXQgZmVlZDppbml0XCIgICAgICAgICAgIFx1MjE5MiBcImVtaXQgZmVlZDppbml0XCJcbiAqICAgTXVsdGktbGluZTogICBkbz1cImBcXG4gICAgICBzZXQuLi5cXG4gICAgYFwiICAgICAgICBcdTIxOTIgXCJzZXQuLi5cXG4uLi5cIlxuICpcbiAqIEFsZ29yaXRobTpcbiAqICAgMS4gVHJpbSBvdXRlciB3aGl0ZXNwYWNlIGZyb20gdGhlIHJhdyBhdHRyaWJ1dGUgdmFsdWUuXG4gKiAgIDIuIElmIHdyYXBwZWQgaW4gYmFja3RpY2tzLCBzdHJpcCB0aGVtIFx1MjAxNCBkbyBOT1QgaW5uZXItdHJpbSB5ZXQuXG4gKiAgIDMuIFNwbGl0IGludG8gbGluZXMgYW5kIGNvbXB1dGUgbWluaW11bSBub24temVybyBpbmRlbnRhdGlvblxuICogICAgICBhY3Jvc3MgYWxsIG5vbi1lbXB0eSBsaW5lcy4gVGhpcyBpcyB0aGUgSFRNTCBhdHRyaWJ1dGUgaW5kZW50YXRpb25cbiAqICAgICAgbGV2ZWwgdG8gcmVtb3ZlLlxuICogICA0LiBTdHJpcCB0aGF0IG1hbnkgbGVhZGluZyBjaGFyYWN0ZXJzIGZyb20gZXZlcnkgbGluZS5cbiAqICAgNS4gRHJvcCBsZWFkaW5nL3RyYWlsaW5nIGJsYW5rIGxpbmVzLCByZXR1cm4gam9pbmVkIHJlc3VsdC5cbiAqXG4gKiBDcnVjaWFsbHksIHN0ZXAgMiBkb2VzIE5PVCBjYWxsIC50cmltKCkgb24gdGhlIGlubmVyIGNvbnRlbnQgYmVmb3JlXG4gKiBjb21wdXRpbmcgaW5kZW50YXRpb24uIEFuIGlubmVyIC50cmltKCkgd291bGQgZGVzdHJveSB0aGUgbGVhZGluZ1xuICogd2hpdGVzcGFjZSBvbiBsaW5lIDEsIG1ha2luZyBtaW5JbmRlbnQgPSAwIGFuZCBsZWF2aW5nIGFsbCBvdGhlclxuICogbGluZXMgdW4tZGUtaW5kZW50ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJpcEJvZHkocmF3OiBzdHJpbmcpOiBzdHJpbmcge1xuICBsZXQgcyA9IHJhdy50cmltKClcblxuICAvLyBTdHJpcCBiYWNrdGljayB3cmFwcGVyIFx1MjAxNCBidXQgcHJlc2VydmUgaW50ZXJuYWwgd2hpdGVzcGFjZSBmb3IgZGUtaW5kZW50XG4gIGlmIChzLnN0YXJ0c1dpdGgoJ2AnKSAmJiBzLmVuZHNXaXRoKCdgJykpIHtcbiAgICBzID0gcy5zbGljZSgxLCAtMSlcbiAgICAvLyBEbyBOT1QgLnRyaW0oKSBoZXJlIFx1MjAxNCB0aGF0IGtpbGxzIHRoZSBsZWFkaW5nIGluZGVudCBvbiBsaW5lIDFcbiAgfVxuXG4gIGNvbnN0IGxpbmVzID0gcy5zcGxpdCgnXFxuJylcbiAgY29uc3Qgbm9uRW1wdHkgPSBsaW5lcy5maWx0ZXIobCA9PiBsLnRyaW0oKS5sZW5ndGggPiAwKVxuICBpZiAobm9uRW1wdHkubGVuZ3RoID09PSAwKSByZXR1cm4gJydcblxuICAvLyBGb3Igc2luZ2xlLWxpbmUgdmFsdWVzIChubyBuZXdsaW5lcyBhZnRlciBiYWNrdGljayBzdHJpcCksIGp1c3QgdHJpbVxuICBpZiAobGluZXMubGVuZ3RoID09PSAxKSByZXR1cm4gcy50cmltKClcblxuICAvLyBNaW5pbXVtIGxlYWRpbmcgd2hpdGVzcGFjZSBhY3Jvc3Mgbm9uLWVtcHR5IGxpbmVzXG4gIGNvbnN0IG1pbkluZGVudCA9IG5vbkVtcHR5LnJlZHVjZSgobWluLCBsaW5lKSA9PiB7XG4gICAgY29uc3QgbGVhZGluZyA9IGxpbmUubWF0Y2goL14oXFxzKikvKT8uWzFdPy5sZW5ndGggPz8gMFxuICAgIHJldHVybiBNYXRoLm1pbihtaW4sIGxlYWRpbmcpXG4gIH0sIEluZmluaXR5KVxuXG4gIGNvbnN0IHN0cmlwcGVkID0gbWluSW5kZW50ID09PSAwIHx8IG1pbkluZGVudCA9PT0gSW5maW5pdHlcbiAgICA/IGxpbmVzXG4gICAgOiBsaW5lcy5tYXAobGluZSA9PiBsaW5lLmxlbmd0aCA+PSBtaW5JbmRlbnQgPyBsaW5lLnNsaWNlKG1pbkluZGVudCkgOiBsaW5lLnRyaW1TdGFydCgpKVxuXG4gIC8vIERyb3AgbGVhZGluZyBhbmQgdHJhaWxpbmcgYmxhbmsgbGluZXMgKHRoZSBuZXdsaW5lcyBhcm91bmQgYmFja3RpY2sgY29udGVudClcbiAgbGV0IHN0YXJ0ID0gMFxuICBsZXQgZW5kID0gc3RyaXBwZWQubGVuZ3RoIC0gMVxuICB3aGlsZSAoc3RhcnQgPD0gZW5kICYmIHN0cmlwcGVkW3N0YXJ0XT8udHJpbSgpID09PSAnJykgc3RhcnQrK1xuICB3aGlsZSAoZW5kID49IHN0YXJ0ICYmIHN0cmlwcGVkW2VuZF0/LnRyaW0oKSA9PT0gJycpIGVuZC0tXG5cbiAgcmV0dXJuIHN0cmlwcGVkLnNsaWNlKHN0YXJ0LCBlbmQgKyAxKS5qb2luKCdcXG4nKVxufVxuIiwgImltcG9ydCB0eXBlIHtcbiAgTEVTQ29uZmlnLFxuICBNb2R1bGVEZWNsLFxuICBDb21tYW5kRGVjbCxcbiAgRXZlbnRIYW5kbGVyRGVjbCxcbiAgU2lnbmFsV2F0Y2hlckRlY2wsXG4gIE9uTG9hZERlY2wsXG4gIE9uRW50ZXJEZWNsLFxuICBPbkV4aXREZWNsLFxufSBmcm9tICcuL2NvbmZpZy5qcydcbmltcG9ydCB7IHN0cmlwQm9keSB9IGZyb20gJy4vc3RyaXBCb2R5LmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFRhZyBuYW1lIFx1MjE5MiBoYW5kbGVyIG1hcFxuLy8gRWFjaCBoYW5kbGVyIHJlYWRzIGF0dHJpYnV0ZXMgZnJvbSBhIGNoaWxkIGVsZW1lbnQgYW5kIHB1c2hlcyBhIHR5cGVkIGRlY2xcbi8vIGludG8gdGhlIGNvbmZpZyBiZWluZyBidWlsdC4gVW5rbm93biB0YWdzIGFyZSBjb2xsZWN0ZWQgZm9yIHdhcm5pbmcuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxudHlwZSBIYW5kbGVyID0gKGVsOiBFbGVtZW50LCBjb25maWc6IExFU0NvbmZpZykgPT4gdm9pZFxuXG5jb25zdCBIQU5ETEVSUzogUmVjb3JkPHN0cmluZywgSGFuZGxlcj4gPSB7XG5cbiAgJ3VzZS1tb2R1bGUnKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCB0eXBlID0gZWwuZ2V0QXR0cmlidXRlKCd0eXBlJyk/LnRyaW0oKSA/PyBudWxsXG4gICAgY29uc3Qgc3JjICA9IGVsLmdldEF0dHJpYnV0ZSgnc3JjJyk/LnRyaW0oKSAgPz8gbnVsbFxuXG4gICAgaWYgKCF0eXBlICYmICFzcmMpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPHVzZS1tb2R1bGU+IGhhcyBuZWl0aGVyIHR5cGU9IG5vciBzcmM9IFxcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbmZpZy5tb2R1bGVzLnB1c2goeyB0eXBlLCBzcmMsIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG5cbiAgJ2xvY2FsLWNvbW1hbmQnKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCBuYW1lID0gZWwuZ2V0QXR0cmlidXRlKCduYW1lJyk/LnRyaW0oKSA/PyAnJ1xuICAgIGNvbnN0IGJvZHkgPSBlbC5nZXRBdHRyaWJ1dGUoJ2RvJyk/LnRyaW0oKSAgID8/ICcnXG5cbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPGxvY2FsLWNvbW1hbmQ+IG1pc3NpbmcgcmVxdWlyZWQgbmFtZT0gYXR0cmlidXRlIFxcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBpZiAoIWJvZHkpIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFU10gPGxvY2FsLWNvbW1hbmQgbmFtZT1cIiR7bmFtZX1cIj4gbWlzc2luZyByZXF1aXJlZCBkbz0gYXR0cmlidXRlIFxcdTIwMTQgaWdub3JlZC5gLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbmZpZy5jb21tYW5kcy5wdXNoKHtcbiAgICAgIG5hbWUsXG4gICAgICBhcmdzUmF3OiBlbC5nZXRBdHRyaWJ1dGUoJ2FyZ3MnKT8udHJpbSgpICA/PyAnJyxcbiAgICAgIGd1YXJkOiAgIGVsLmdldEF0dHJpYnV0ZSgnZ3VhcmQnKT8udHJpbSgpID8/IG51bGwsXG4gICAgICBib2R5OiAgICBzdHJpcEJvZHkoYm9keSksXG4gICAgICBlbGVtZW50OiBlbCxcbiAgICB9KVxuICB9LFxuXG4gICdvbi1ldmVudCcoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IG5hbWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpICAgPz8gJydcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdoYW5kbGUnKT8udHJpbSgpID8/ICcnXG5cbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPG9uLWV2ZW50PiBtaXNzaW5nIHJlcXVpcmVkIG5hbWU9IGF0dHJpYnV0ZSBcXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVNdIDxvbi1ldmVudCBuYW1lPVwiJHtuYW1lfVwiPiBtaXNzaW5nIHJlcXVpcmVkIGhhbmRsZT0gYXR0cmlidXRlIFxcdTIwMTQgaWdub3JlZC5gLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbmZpZy5vbkV2ZW50LnB1c2goeyBuYW1lLCBib2R5OiBzdHJpcEJvZHkoYm9keSksIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG5cbiAgJ29uLXNpZ25hbCcoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IG5hbWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpICAgPz8gJydcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdoYW5kbGUnKT8udHJpbSgpID8/ICcnXG5cbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPG9uLXNpZ25hbD4gbWlzc2luZyByZXF1aXJlZCBuYW1lPSBhdHRyaWJ1dGUgXFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTXSA8b24tc2lnbmFsIG5hbWU9XCIke25hbWV9XCI+IG1pc3NpbmcgcmVxdWlyZWQgaGFuZGxlPSBhdHRyaWJ1dGUgXFx1MjAxNCBpZ25vcmVkLmAsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uZmlnLm9uU2lnbmFsLnB1c2goe1xuICAgICAgbmFtZSxcbiAgICAgIHdoZW46ICAgIGVsLmdldEF0dHJpYnV0ZSgnd2hlbicpPy50cmltKCkgPz8gbnVsbCxcbiAgICAgIGJvZHk6ICAgIHN0cmlwQm9keShib2R5KSxcbiAgICAgIGVsZW1lbnQ6IGVsLFxuICAgIH0pXG4gIH0sXG5cbiAgJ29uLWxvYWQnKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdydW4nKT8udHJpbSgpID8/ICcnXG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDxvbi1sb2FkPiBtaXNzaW5nIHJlcXVpcmVkIHJ1bj0gYXR0cmlidXRlIFxcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25maWcub25Mb2FkLnB1c2goeyBib2R5OiBzdHJpcEJvZHkoYm9keSksIGVsZW1lbnQ6IGVsIH0pXG4gIH0sXG5cbiAgJ29uLWVudGVyJyhlbCwgY29uZmlnKSB7XG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8b24tZW50ZXI+IG1pc3NpbmcgcmVxdWlyZWQgcnVuPSBhdHRyaWJ1dGUgXFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGNvbmZpZy5vbkVudGVyLnB1c2goe1xuICAgICAgd2hlbjogICAgZWwuZ2V0QXR0cmlidXRlKCd3aGVuJyk/LnRyaW0oKSA/PyBudWxsLFxuICAgICAgYm9keTogICAgc3RyaXBCb2R5KGJvZHkpLFxuICAgICAgZWxlbWVudDogZWwsXG4gICAgfSlcbiAgfSxcblxuICAnb24tZXhpdCcoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IGJvZHkgPSBlbC5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgICBpZiAoIWJvZHkpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPG9uLWV4aXQ+IG1pc3NpbmcgcmVxdWlyZWQgcnVuPSBhdHRyaWJ1dGUgXFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGNvbmZpZy5vbkV4aXQucHVzaCh7IGJvZHk6IHN0cmlwQm9keShib2R5KSwgZWxlbWVudDogZWwgfSlcbiAgfSxcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBFbGVtZW50cyB0aGF0IGFyZSB2YWxpZCBMRVMgY2hpbGRyZW4gYnV0IGhhbmRsZWQgb3V0c2lkZSByZWFkQ29uZmlnLlxuLy9cbi8vIFRoZXNlIGFyZSBzaWxlbnRseSBhY2NlcHRlZCBcXHUyMDE0IG5vIFwidW5rbm93biBlbGVtZW50XCIgd2FybmluZyBcXHUyMDE0IGJlY2F1c2UgdGhlaXJcbi8vIHNlbWFudGljcyBhcmUgbWFuYWdlZCBieSBvdGhlciBwYXJ0cyBvZiB0aGUgcnVudGltZTpcbi8vXG4vLyAgIGxvY2FsLWV2ZW50LXNjcmlwdCAgUGhhc2UgMjogY2hpbGQgTEVTIGNvbnRyb2xsZXJzIGluIHRoZSBuZXN0ZWQgdHJlZS5cbi8vICAgICAgICAgICAgICAgICAgICAgICBDaGlsZHJlbiByZWdpc3RlciB0aGVtc2VsdmVzIHdpdGggdGhlaXIgcGFyZW50IGluXG4vLyAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGVkQ2FsbGJhY2s7IHJlYWRDb25maWcgZG9lcyBub3QgbmVlZCB0byByZWFkIHRoZW0uXG4vLyAgICAgICAgICAgICAgICAgICAgICAgQ29udmVudGlvbjogcGxhY2UgY2hpbGQgPGxvY2FsLWV2ZW50LXNjcmlwdD4gZWxlbWVudHNcbi8vICAgICAgICAgICAgICAgICAgICAgICBBRlRFUiBhbGwgb3RoZXIgY29uZmlnIGNoaWxkcmVuICg8bG9jYWwtY29tbWFuZD4sXG4vLyAgICAgICAgICAgICAgICAgICAgICAgPG9uLWV2ZW50PiwgZXRjLikgc28gdGhlIHBhcmVudCdzIGNvbmZpZyBpcyBmdWxseSByZWFkXG4vLyAgICAgICAgICAgICAgICAgICAgICAgYmVmb3JlIGNoaWxkIGVsZW1lbnRzIGFyZSBlbmNvdW50ZXJlZC5cbi8vXG4vLyAgIGxvY2FsLWJyaWRnZSAgICAgICAgUGhhc2UgMjogYnJpZGdlIGRlY2xhcmF0aW9ucyBmb3IgdGhlIGBmb3J3YXJkYCBwcmltaXRpdmUuXG4vLyAgICAgICAgICAgICAgICAgICAgICAgUmVnaXN0ZXJlZCBieSB0aGUgYnJpZGdlIG1vZHVsZSBhdCBpbml0IHRpbWUuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbmNvbnN0IERFRkVSUkVEX0NISUxEUkVOID0gbmV3IFNldChbXG4gICdsb2NhbC1ldmVudC1zY3JpcHQnLFxuICAnbG9jYWwtYnJpZGdlJyxcbl0pXG5cbi8vIFRoZSBjYW5vbmljYWwgbGlzdCBvZiBjb25maWctYmVhcmluZyBMRVMgY2hpbGQgZWxlbWVudHMuXG4vLyBTaG93biBpbiB0aGUgdW5rbm93bi1jaGlsZCB3YXJuaW5nIHNvIGF1dGhvcnMga25vdyBleGFjdGx5IHdoYXQncyB2YWxpZC5cbmNvbnN0IFZBTElEX0NPTkZJR19DSElMRFJFTiA9IFtcbiAgJzx1c2UtbW9kdWxlPicsXG4gICc8bG9jYWwtY29tbWFuZD4nLFxuICAnPG9uLWV2ZW50PicsXG4gICc8b24tc2lnbmFsPicsXG4gICc8b24tbG9hZD4nLFxuICAnPG9uLWVudGVyPicsXG4gICc8b24tZXhpdD4nLFxuXVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIHJlYWRDb25maWcgXFx1MjAxNCB0aGUgcHVibGljIGVudHJ5IHBvaW50XG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBXYWxrcyB0aGUgZGlyZWN0IGNoaWxkcmVuIG9mIGEgPGxvY2FsLWV2ZW50LXNjcmlwdD4gZWxlbWVudCBhbmRcbiAqIHByb2R1Y2VzIGEgc3RydWN0dXJlZCBMRVNDb25maWcuXG4gKlxuICogT25seSBkaXJlY3QgY2hpbGRyZW4gYXJlIHJlYWQgXFx1MjAxNCBuZXN0ZWQgZWxlbWVudHMgaW5zaWRlIGEgPGxvY2FsLWNvbW1hbmQ+XG4gKiBib2R5IGFyZSBub3QgY2hpbGRyZW4gb2YgdGhlIGhvc3QgYW5kIGFyZSBuZXZlciB2aXNpdGVkIGhlcmUuXG4gKlxuICogVGhyZWUgY2F0ZWdvcmllcyBvZiBjaGlsZDpcbiAqICAgLSBLbm93biBjb25maWcgZWxlbWVudHMgKEhBTkRMRVJTKTogcmVhZCBhbmQgcHVzaGVkIGludG8gY29uZmlnLlxuICogICAtIERlZmVycmVkIGVsZW1lbnRzIChERUZFUlJFRF9DSElMRFJFTik6IHNpbGVudGx5IGFjY2VwdGVkOyBoYW5kbGVkXG4gKiAgICAgZWxzZXdoZXJlIGluIHRoZSBydW50aW1lICh0cmVlIHdpcmluZywgYnJpZGdlIG1vZHVsZSwgZXRjLikuXG4gKiAgIC0gVW5rbm93biBlbGVtZW50czogbG9nZ2VkIGFzIGEgd2FybmluZyB3aXRoIHRoZSBsaXN0IG9mIHZhbGlkIGNob2ljZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkQ29uZmlnKGhvc3Q6IEVsZW1lbnQpOiBMRVNDb25maWcge1xuICBjb25zdCBjb25maWc6IExFU0NvbmZpZyA9IHtcbiAgICBpZDogICAgICAgaG9zdC5pZCB8fCAnKG5vIGlkKScsXG4gICAgbW9kdWxlczogIFtdLFxuICAgIGNvbW1hbmRzOiBbXSxcbiAgICBvbkV2ZW50OiAgW10sXG4gICAgb25TaWduYWw6IFtdLFxuICAgIG9uTG9hZDogICBbXSxcbiAgICBvbkVudGVyOiAgW10sXG4gICAgb25FeGl0OiAgIFtdLFxuICAgIHVua25vd246ICBbXSxcbiAgfVxuXG4gIGZvciAoY29uc3QgY2hpbGQgb2YgQXJyYXkuZnJvbShob3N0LmNoaWxkcmVuKSkge1xuICAgIGNvbnN0IHRhZyA9IGNoaWxkLnRhZ05hbWUudG9Mb3dlckNhc2UoKVxuXG4gICAgLy8gS25vd24gY29uZmlnIGVsZW1lbnQgXFx1MjAxNCByZWFkIGFuZCBwdXNoIGludG8gY29uZmlnXG4gICAgY29uc3QgaGFuZGxlciA9IEhBTkRMRVJTW3RhZ11cbiAgICBpZiAoaGFuZGxlcikge1xuICAgICAgaGFuZGxlcihjaGlsZCwgY29uZmlnKVxuICAgICAgY29udGludWVcbiAgICB9XG5cbiAgICAvLyBEZWZlcnJlZCBlbGVtZW50IFxcdTIwMTQgc2lsZW50bHkgYWNjZXB0ZWQsIGhhbmRsZWQgZWxzZXdoZXJlIGluIHRoZSBydW50aW1lXG4gICAgaWYgKERFRkVSUkVEX0NISUxEUkVOLmhhcyh0YWcpKSBjb250aW51ZVxuXG4gICAgLy8gVW5rbm93biBlbGVtZW50IFxcdTIwMTQgY29sbGVjdCBhbmQgd2FybiBpZiBoeXBoZW5hdGVkIChsaWtlbHkgYSB0eXBvKVxuICAgIGNvbmZpZy51bmtub3duLnB1c2goY2hpbGQpXG4gICAgaWYgKHRhZy5pbmNsdWRlcygnLScpKSB7XG4gICAgICBjb25zb2xlLndhcm4oXG4gICAgICAgIGBbTEVTXSBVbmtub3duIGNoaWxkIGVsZW1lbnQgPCR7dGFnfT4gaW5zaWRlIDxsb2NhbC1ldmVudC1zY3JpcHQgaWQ9XCIke2NvbmZpZy5pZH1cIj4gXFx1MjAxNCBpZ25vcmVkLlxcbmAgK1xuICAgICAgICBgICBDb25maWcgY2hpbGRyZW46ICR7VkFMSURfQ09ORklHX0NISUxEUkVOLmpvaW4oJywgJyl9XFxuYCArXG4gICAgICAgIGAgIEFsc28gdmFsaWQgKGRlZmVycmVkKTogPGxvY2FsLWV2ZW50LXNjcmlwdD4sIDxsb2NhbC1icmlkZ2U+YCxcbiAgICAgICAgY2hpbGRcbiAgICAgIClcbiAgICB9XG4gIH1cblxuICByZXR1cm4gY29uZmlnXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gbG9nQ29uZmlnIFxcdTIwMTQgc3RydWN0dXJlZCBjaGVja3BvaW50IGxvZ1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogTG9ncyBhIHN1bW1hcnkgb2YgYSBwYXJzZWQgTEVTQ29uZmlnLlxuICogUGhhc2UgMSBjaGVja3BvaW50OiB5b3Ugc2hvdWxkIHNlZSB0aGlzIGluIHRoZSBicm93c2VyIGNvbnNvbGUvZGVidWcgbG9nXG4gKiB3aXRoIGFsbCBjb21tYW5kcywgZXZlbnRzLCBhbmQgc2lnbmFsIHdhdGNoZXJzIGNvcnJlY3RseSBsaXN0ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2dDb25maWcoY29uZmlnOiBMRVNDb25maWcpOiB2b2lkIHtcbiAgY29uc3QgaWQgPSBjb25maWcuaWRcbiAgY29uc29sZS5sb2coYFtMRVNdIGNvbmZpZyByZWFkIGZvciAjJHtpZH1gKVxuICBjb25zb2xlLmxvZyhgW0xFU10gICBtb2R1bGVzOiAgICR7Y29uZmlnLm1vZHVsZXMubGVuZ3RofWAsIGNvbmZpZy5tb2R1bGVzLm1hcChtID0+IG0udHlwZSA/PyBtLnNyYykpXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIGNvbW1hbmRzOiAgJHtjb25maWcuY29tbWFuZHMubGVuZ3RofWAsIGNvbmZpZy5jb21tYW5kcy5tYXAoYyA9PiBjLm5hbWUpKVxuICBjb25zb2xlLmxvZyhgW0xFU10gICBvbi1ldmVudDogICR7Y29uZmlnLm9uRXZlbnQubGVuZ3RofWAsIGNvbmZpZy5vbkV2ZW50Lm1hcChlID0+IGUubmFtZSkpXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG9uLXNpZ25hbDogJHtjb25maWcub25TaWduYWwubGVuZ3RofWAsIGNvbmZpZy5vblNpZ25hbC5tYXAocyA9PiBzLm5hbWUpKVxuICBjb25zb2xlLmxvZyhgW0xFU10gICBvbi1sb2FkOiAgICR7Y29uZmlnLm9uTG9hZC5sZW5ndGh9YClcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tZW50ZXI6ICAke2NvbmZpZy5vbkVudGVyLmxlbmd0aH1gLCBjb25maWcub25FbnRlci5tYXAoZSA9PiBlLndoZW4gPz8gJ2Fsd2F5cycpKVxuICBjb25zb2xlLmxvZyhgW0xFU10gICBvbi1leGl0OiAgICR7Y29uZmlnLm9uRXhpdC5sZW5ndGh9YClcblxuICBjb25zdCB1bmtub3duQ3VzdG9tID0gY29uZmlnLnVua25vd24uZmlsdGVyKGUgPT4gZS50YWdOYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoJy0nKSlcbiAgaWYgKHVua25vd25DdXN0b20ubGVuZ3RoID4gMCkge1xuICAgIGNvbnNvbGUud2FybihgW0xFU10gICB1bmtub3duIGN1c3RvbSBjaGlsZHJlbjogJHt1bmtub3duQ3VzdG9tLmxlbmd0aH1gLCB1bmtub3duQ3VzdG9tLm1hcChlID0+IGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpKSlcbiAgfVxuXG4gIC8vIExvZyBhIHNhbXBsaW5nIG9mIGJvZHkgc3RyaW5ncyB0byB2ZXJpZnkgc3RyaXBCb2R5IHdvcmtlZCBjb3JyZWN0bHlcbiAgaWYgKGNvbmZpZy5jb21tYW5kcy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgZmlyc3QgPSBjb25maWcuY29tbWFuZHNbMF1cbiAgICBpZiAoZmlyc3QpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSAgIGZpcnN0IGNvbW1hbmQgYm9keSBwcmV2aWV3IChcIiR7Zmlyc3QubmFtZX1cIik6YClcbiAgICAgIGNvbnN0IHByZXZpZXcgPSBmaXJzdC5ib2R5LnNwbGl0KCdcXG4nKS5zbGljZSgwLCA0KS5qb2luKCdcXG4gICcpXG4gICAgICBjb25zb2xlLmxvZyhgW0xFU10gICB8ICR7cHJldmlld31gKVxuICAgIH1cbiAgfVxufVxuIiwgIi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gTEVTIFRva2VuaXplclxuLy9cbi8vIENvbnZlcnRzIGEgc3RyaXBCb2R5J2Qgc291cmNlIHN0cmluZyBpbnRvIGEgZmxhdCBhcnJheSBvZiBUb2tlbiBvYmplY3RzLlxuLy8gVG9rZW5zIGFyZSBzaW1wbHkgbm9uLWJsYW5rIGxpbmVzIHdpdGggdGhlaXIgaW5kZW50IGxldmVsIHJlY29yZGVkLlxuLy8gTm8gc2VtYW50aWMgYW5hbHlzaXMgaGFwcGVucyBoZXJlIFx1MjAxNCB0aGF0J3MgdGhlIHBhcnNlcidzIGpvYi5cbi8vXG4vLyBUaGUgdG9rZW5pemVyIGlzIGRlbGliZXJhdGVseSBtaW5pbWFsOiBpdCBwcmVzZXJ2ZXMgdGhlIHJhdyBpbmRlbnRhdGlvblxuLy8gaW5mb3JtYXRpb24gdGhlIHBhcnNlciBuZWVkcyB0byB1bmRlcnN0YW5kIGJsb2NrIHN0cnVjdHVyZS5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5leHBvcnQgaW50ZXJmYWNlIFRva2VuIHtcbiAgLyoqIENvbHVtbiBvZmZzZXQgb2YgdGhlIGZpcnN0IG5vbi13aGl0ZXNwYWNlIGNoYXJhY3RlciAobnVtYmVyIG9mIHNwYWNlcykgKi9cbiAgaW5kZW50OiBudW1iZXJcbiAgLyoqIFRyaW1tZWQgbGluZSBjb250ZW50IFx1MjAxNCBubyBsZWFkaW5nL3RyYWlsaW5nIHdoaXRlc3BhY2UgKi9cbiAgdGV4dDogc3RyaW5nXG4gIC8qKiAxLWJhc2VkIGxpbmUgbnVtYmVyIGluIHRoZSBzdHJpcHBlZCBzb3VyY2UgKGZvciBlcnJvciBtZXNzYWdlcykgKi9cbiAgbGluZU51bTogbnVtYmVyXG59XG5cbi8qKlxuICogQ29udmVydHMgYSBzdHJpcHBlZCBMRVMgYm9keSBzdHJpbmcgaW50byBhIFRva2VuIGFycmF5LlxuICogQmxhbmsgbGluZXMgYXJlIGRyb3BwZWQuIFRhYnMgYXJlIGV4cGFuZGVkIHRvIDIgc3BhY2VzIGVhY2guXG4gKlxuICogQHBhcmFtIHNvdXJjZSAgQSBzdHJpbmcgYWxyZWFkeSBwcm9jZXNzZWQgYnkgc3RyaXBCb2R5KCkgXHUyMDE0IG5vIGJhY2t0aWNrIHdyYXBwZXJzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdG9rZW5pemUoc291cmNlOiBzdHJpbmcpOiBUb2tlbltdIHtcbiAgY29uc3QgdG9rZW5zOiBUb2tlbltdID0gW11cbiAgY29uc3QgbGluZXMgPSBzb3VyY2Uuc3BsaXQoJ1xcbicpXG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IHJhdyA9IChsaW5lc1tpXSA/PyAnJykucmVwbGFjZSgvXFx0L2csICcgICcpXG4gICAgY29uc3QgdGV4dCA9IHJhdy50cmltKClcblxuICAgIC8vIFNraXAgYmxhbmsgbGluZXNcbiAgICBpZiAodGV4dC5sZW5ndGggPT09IDApIGNvbnRpbnVlXG5cbiAgICBjb25zdCBpbmRlbnQgPSByYXcubGVuZ3RoIC0gcmF3LnRyaW1TdGFydCgpLmxlbmd0aFxuXG4gICAgdG9rZW5zLnB1c2goe1xuICAgICAgaW5kZW50LFxuICAgICAgdGV4dCxcbiAgICAgIGxpbmVOdW06IGkgKyAxLFxuICAgIH0pXG4gIH1cblxuICByZXR1cm4gdG9rZW5zXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gSGVscGVycyB1c2VkIGJ5IGJvdGggdGhlIHRva2VuaXplciB0ZXN0cyBhbmQgdGhlIHBhcnNlclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogUmV0dXJucyB0cnVlIGlmIGB0ZXh0YCBlbmRzIHdpdGggYSBzdGFuZGFsb25lIGBhbmRgIHdvcmQuXG4gKiBVc2VkIGJ5IHRoZSBwYXJzZXIgdG8gZGV0ZWN0IHBhcmFsbGVsIGJyYW5jaGVzLlxuICpcbiAqIENhcmVmdWw6IFwiZW5nbGFuZFwiLCBcImJhbmRcIiwgXCJjb21tYW5kXCIgbXVzdCBOT1QgbWF0Y2guXG4gKiBXZSByZXF1aXJlIGEgd29yZCBib3VuZGFyeSBiZWZvcmUgYGFuZGAgYW5kIGVuZC1vZi1zdHJpbmcgYWZ0ZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlbmRzV2l0aEFuZCh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIC9cXGJhbmQkLy50ZXN0KHRleHQpXG59XG5cbi8qKlxuICogU3RyaXBzIHRoZSB0cmFpbGluZyBgIGFuZGAgZnJvbSBhIGxpbmUgdGhhdCBlbmRzV2l0aEFuZC5cbiAqIFJldHVybnMgdGhlIHRyaW1tZWQgbGluZSBjb250ZW50IHdpdGhvdXQgaXQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJpcFRyYWlsaW5nQW5kKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB0ZXh0LnJlcGxhY2UoL1xccythbmQkLywgJycpLnRyaW1FbmQoKVxufVxuXG4vKipcbiAqIEJsb2NrIHRlcm1pbmF0b3IgdG9rZW5zIFx1MjAxNCBzaWduYWwgdGhlIGVuZCBvZiBhIG1hdGNoIG9yIHRyeSBibG9jay5cbiAqIFRoZXNlIGFyZSBjb25zdW1lZCBieSB0aGUgYmxvY2stb3duaW5nIHBhcnNlciAocGFyc2VNYXRjaCAvIHBhcnNlVHJ5KSxcbiAqIG5vdCBieSBwYXJzZUJsb2NrIGl0c2VsZi5cbiAqL1xuZXhwb3J0IGNvbnN0IEJMT0NLX1RFUk1JTkFUT1JTID0gbmV3IFNldChbJy9tYXRjaCcsICcvdHJ5J10pXG5cbi8qKlxuICogS2V5d29yZHMgdGhhdCBlbmQgYSB0cnkgYm9keSBhbmQgc3RhcnQgYSByZXNjdWUvYWZ0ZXJ3YXJkcyBjbGF1c2UuXG4gKiBSZWNvZ25pemVkIG9ubHkgd2hlbiB0aGV5IGFwcGVhciBhdCB0aGUgc2FtZSBpbmRlbnQgbGV2ZWwgYXMgdGhlIGB0cnlgLlxuICovXG5leHBvcnQgY29uc3QgVFJZX0NMQVVTRV9LRVlXT1JEUyA9IG5ldyBTZXQoWydyZXNjdWUnLCAnYWZ0ZXJ3YXJkcyddKVxuIiwgImltcG9ydCB0eXBlIHtcbiAgTEVTTm9kZSwgRXhwck5vZGUsIFNlcXVlbmNlTm9kZSwgUGFyYWxsZWxOb2RlLFxuICBTZXROb2RlLCBFbWl0Tm9kZSwgQnJvYWRjYXN0Tm9kZSwgQnViYmxlTm9kZSwgQ2FzY2FkZU5vZGUsIEZvcndhcmROb2RlLFxuICBXYWl0Tm9kZSwgQ2FsbE5vZGUsXG4gIEJpbmROb2RlLCBBY3Rpb25Ob2RlLCBNYXRjaE5vZGUsIE1hdGNoQXJtLCBQYXR0ZXJuTm9kZSxcbiAgVHJ5Tm9kZSwgQW5pbWF0aW9uTm9kZSxcbn0gZnJvbSAnLi9hc3QuanMnXG5pbXBvcnQgdHlwZSB7IFRva2VuIH0gZnJvbSAnLi90b2tlbml6ZXIuanMnXG5pbXBvcnQge1xuICBlbmRzV2l0aEFuZCwgc3RyaXBUcmFpbGluZ0FuZCxcbiAgQkxPQ0tfVEVSTUlOQVRPUlMsIFRSWV9DTEFVU0VfS0VZV09SRFMsXG59IGZyb20gJy4vdG9rZW5pemVyLmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEtub3duIGFuaW1hdGlvbiBwcmltaXRpdmUgbmFtZXMgKHJlZ2lzdGVyZWQgYnkgdGhlIGFuaW1hdGlvbiBtb2R1bGUpXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgQU5JTUFUSU9OX1BSSU1JVElWRVMgPSBuZXcgU2V0KFtcbiAgJ2ZhZGUtaW4nLCAnZmFkZS1vdXQnLCAnc2xpZGUtaW4nLCAnc2xpZGUtb3V0JyxcbiAgJ3NsaWRlLXVwJywgJ3NsaWRlLWRvd24nLCAncHVsc2UnLFxuICAnc3RhZ2dlci1lbnRlcicsICdzdGFnZ2VyLWV4aXQnLFxuICAnc2hha2UnLFxuXSlcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXJzZXJcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5leHBvcnQgY2xhc3MgTEVTUGFyc2VyIHtcbiAgcHJpdmF0ZSBwb3MgPSAwXG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSB0b2tlbnM6IFRva2VuW10pIHt9XG5cbiAgcHJpdmF0ZSBwZWVrKG9mZnNldCA9IDApOiBUb2tlbiB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMudG9rZW5zW3RoaXMucG9zICsgb2Zmc2V0XVxuICB9XG5cbiAgcHJpdmF0ZSBhZHZhbmNlKCk6IFRva2VuIHtcbiAgICBjb25zdCB0ID0gdGhpcy50b2tlbnNbdGhpcy5wb3NdXG4gICAgaWYgKCF0KSB0aHJvdyBuZXcgTEVTUGFyc2VFcnJvcignVW5leHBlY3RlZCBlbmQgb2YgaW5wdXQnLCB1bmRlZmluZWQpXG4gICAgdGhpcy5wb3MrK1xuICAgIHJldHVybiB0XG4gIH1cblxuICBwcml2YXRlIGF0RW5kKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnBvcyA+PSB0aGlzLnRva2Vucy5sZW5ndGhcbiAgfVxuXG4gIHByaXZhdGUgdHJ5Q29uc3VtZSh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB0ID0gdGhpcy5wZWVrKClcbiAgICBpZiAodD8udGV4dCA9PT0gdGV4dCkgeyB0aGlzLnBvcysrOyByZXR1cm4gdHJ1ZSB9XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgRW50cnkgcG9pbnQgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcGFyc2UoKTogTEVTTm9kZSB7XG4gICAgY29uc3Qgbm9kZSA9IHRoaXMucGFyc2VCbG9jaygtMSlcbiAgICByZXR1cm4gbm9kZVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEJsb2NrIHBhcnNlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKipcbiAgICogUGFyc2VzIGFsbCBzdGF0ZW1lbnRzIGF0IGluZGVudCA+IGJhc2VJbmRlbnQuXG4gICAqXG4gICAqIFN0b3BzIHdoZW4gaXQgZW5jb3VudGVyczpcbiAgICogICAtIEEgdG9rZW4gd2l0aCBpbmRlbnQgPD0gYmFzZUluZGVudFxuICAgKiAgIC0gQSBibG9jayB0ZXJtaW5hdG9yICgvbWF0Y2gsIC90cnkpIFx1MjAxNCBsZWZ0IGZvciB0aGUgcGFyZW50IHRvIGNvbnN1bWVcbiAgICogICAtIEEgdHJ5LWNsYXVzZSBrZXl3b3JkIChyZXNjdWUsIGFmdGVyd2FyZHMpIGF0IGluZGVudCA8PSBiYXNlSW5kZW50XG4gICAqICAgLSBFbmQgb2YgdG9rZW4gc3RyZWFtXG4gICAqXG4gICAqIFJldHVybnMgYSBTZXF1ZW5jZU5vZGUgaWYgbXVsdGlwbGUgc3RlcHMsIG90aGVyd2lzZSB0aGUgc2luZ2xlIG5vZGUuXG4gICAqL1xuICBwcml2YXRlIHBhcnNlQmxvY2soYmFzZUluZGVudDogbnVtYmVyKTogTEVTTm9kZSB7XG4gICAgY29uc3Qgc3RlcHM6IExFU05vZGVbXSA9IFtdXG5cbiAgICB3aGlsZSAoIXRoaXMuYXRFbmQoKSkge1xuICAgICAgY29uc3QgdCA9IHRoaXMucGVlaygpIVxuXG4gICAgICAvLyBTdG9wOiB3ZSd2ZSByZXR1cm5lZCB0byBvciBwYXN0IHRoZSBwYXJlbnQgYmxvY2sncyBpbmRlbnRcbiAgICAgIGlmICh0LmluZGVudCA8PSBiYXNlSW5kZW50KSBicmVha1xuXG4gICAgICAvLyBTdG9wOiBibG9jayB0ZXJtaW5hdG9ycyBhcmUgY29uc3VtZWQgYnkgdGhlIGJsb2NrIG9wZW5lciAobWF0Y2gvdHJ5KVxuICAgICAgaWYgKEJMT0NLX1RFUk1JTkFUT1JTLmhhcyh0LnRleHQpKSBicmVha1xuXG4gICAgICAvLyBTdG9wOiB0cnktY2xhdXNlIGtleXdvcmRzIGVuZCB0aGUgY3VycmVudCB0cnkgYm9keVxuICAgICAgaWYgKFRSWV9DTEFVU0VfS0VZV09SRFMuaGFzKHQudGV4dCkgJiYgdC5pbmRlbnQgPD0gYmFzZUluZGVudCArIDIpIGJyZWFrXG5cbiAgICAgIC8vIFx1MjUwMFx1MjUwMCBTZXF1ZW50aWFsIGNvbm5lY3RpdmU6IHN0YW5kYWxvbmUgYHRoZW5gIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgICAgLy8gYHRoZW5gIGFsb25lIG9uIGEgbGluZSBpbnRyb2R1Y2VzIHRoZSBuZXh0IHNlcXVlbnRpYWwgc3RlcCxcbiAgICAgIC8vIHdoaWNoIGlzIGEgYmxvY2sgYXQgYSBkZWVwZXIgaW5kZW50IGxldmVsLlxuICAgICAgaWYgKHQudGV4dCA9PT0gJ3RoZW4nKSB7XG4gICAgICAgIGNvbnN0IHRoZW5JbmRlbnQgPSB0LmluZGVudFxuICAgICAgICB0aGlzLmFkdmFuY2UoKSAvLyBjb25zdW1lIGB0aGVuYFxuICAgICAgICBjb25zdCBuZXh0ID0gdGhpcy5wZWVrKClcbiAgICAgICAgaWYgKG5leHQgJiYgbmV4dC5pbmRlbnQgPiB0aGVuSW5kZW50KSB7XG4gICAgICAgICAgY29uc3Qgc3RlcCA9IHRoaXMucGFyc2VCbG9jayh0aGVuSW5kZW50KVxuICAgICAgICAgIHN0ZXBzLnB1c2goc3RlcClcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyBcdTI1MDBcdTI1MDAgU2VxdWVudGlhbCBjb25uZWN0aXZlOiBgdGhlbiBYYCBhcyBwcmVmaXggXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgICAvLyBgdGhlbiBjYWxsIGZvb2AsIGB0aGVuIGVtaXQgYmFyYCwgZXRjLlxuICAgICAgLy8gVGhlIGB0aGVuYCBpcyBqdXN0IGEgdmlzdWFsIHNlcXVlbmNlciBcdTIwMTQgdGhlIHJlc3Qgb2YgdGhlIGxpbmUgaXMgdGhlIHN0ZXAuXG4gICAgICBpZiAodC50ZXh0LnN0YXJ0c1dpdGgoJ3RoZW4gJykpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICAgICAgY29uc3QgcmVzdCA9IHQudGV4dC5zbGljZSg1KS50cmltKClcbiAgICAgICAgY29uc3Qgc3RlcCA9IHRoaXMucGFyc2VTaW5nbGVMaW5lKHJlc3QsIHQuaW5kZW50LCB0KVxuICAgICAgICBzdGVwcy5wdXNoKHN0ZXApXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIFx1MjUwMFx1MjUwMCBSZWd1bGFyIHN0YXRlbWVudCAocG9zc2libHkgYSBwYXJhbGxlbCBncm91cCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgICBjb25zdCBzdG10ID0gdGhpcy5wYXJzZVN0YXRlbWVudE9yUGFyYWxsZWwodC5pbmRlbnQpXG4gICAgICBzdGVwcy5wdXNoKHN0bXQpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRvU2VxdWVuY2VPclNpbmdsZShzdGVwcylcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBQYXJhbGxlbCBncm91cCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKipcbiAgICogUGFyc2VzIG9uZSBzdGF0ZW1lbnQgb3IgYSBncm91cCBvZiBwYXJhbGxlbCBzdGF0ZW1lbnRzIGNvbm5lY3RlZCBieSBgYW5kYC5cbiAgICpcbiAgICogTGluZXMgZW5kaW5nIHdpdGggYSBzdGFuZGFsb25lIGBhbmRgIGluZGljYXRlIHRoYXQgdGhlIG5leHQgbGluZSBydW5zXG4gICAqIGNvbmN1cnJlbnRseS4gQWxsIHBhcmFsbGVsIGJyYW5jaGVzIGFyZSB3cmFwcGVkIGluIGEgUGFyYWxsZWxOb2RlLlxuICAgKlxuICAgKiBgYW5kYC1ncm91cHMgb25seSBhcHBseSB3aXRoaW4gdGhlIHNhbWUgaW5kZW50IGxldmVsLiBBIGRlZXBlci1pbmRlbnRlZFxuICAgKiBsaW5lIGFmdGVyIGBhbmRgIGlzIGFuIGVycm9yICh3b3VsZCBpbmRpY2F0ZSBhIGJsb2NrLCBidXQgYGFuZGAgaXNcbiAgICogYSBsaW5lLWxldmVsIGNvbm5lY3Rvciwgbm90IGEgYmxvY2sgb3BlbmVyKS5cbiAgICovXG4gIHByaXZhdGUgcGFyc2VTdGF0ZW1lbnRPclBhcmFsbGVsKGJsb2NrSW5kZW50OiBudW1iZXIpOiBMRVNOb2RlIHtcbiAgICBjb25zdCBicmFuY2hlczogTEVTTm9kZVtdID0gW11cblxuICAgIHdoaWxlICghdGhpcy5hdEVuZCgpKSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy5wZWVrKCkhXG5cbiAgICAgIC8vIFN0b3AgY29uZGl0aW9ucyBcdTIwMTQgc2FtZSBhcyBwYXJzZUJsb2NrJ3NcbiAgICAgIGlmICh0LmluZGVudCA8IGJsb2NrSW5kZW50KSBicmVha1xuICAgICAgaWYgKHQuaW5kZW50ID4gYmxvY2tJbmRlbnQpIGJyZWFrICAgLy8gc2hvdWxkbid0IGhhcHBlbiBoZXJlLCBzYWZldHkgZ3VhcmRcbiAgICAgIGlmIChCTE9DS19URVJNSU5BVE9SUy5oYXModC50ZXh0KSkgYnJlYWtcbiAgICAgIGlmIChUUllfQ0xBVVNFX0tFWVdPUkRTLmhhcyh0LnRleHQpKSBicmVha1xuICAgICAgaWYgKHQudGV4dCA9PT0gJ3RoZW4nIHx8IHQudGV4dC5zdGFydHNXaXRoKCd0aGVuICcpKSBicmVha1xuXG4gICAgICBjb25zdCBoYXNBbmQgPSBlbmRzV2l0aEFuZCh0LnRleHQpXG4gICAgICBjb25zdCBsaW5lVGV4dCA9IGhhc0FuZCA/IHN0cmlwVHJhaWxpbmdBbmQodC50ZXh0KSA6IHQudGV4dFxuXG4gICAgICB0aGlzLmFkdmFuY2UoKVxuXG4gICAgICBjb25zdCBzdG10ID0gdGhpcy5wYXJzZVNpbmdsZUxpbmUobGluZVRleHQsIHQuaW5kZW50LCB0KVxuICAgICAgYnJhbmNoZXMucHVzaChzdG10KVxuXG4gICAgICBpZiAoIWhhc0FuZCkgYnJlYWtcbiAgICB9XG5cbiAgICBpZiAoYnJhbmNoZXMubGVuZ3RoID09PSAwKSByZXR1cm4gZXhwcignJylcbiAgICBpZiAoYnJhbmNoZXMubGVuZ3RoID09PSAxKSByZXR1cm4gYnJhbmNoZXNbMF0hXG4gICAgcmV0dXJuIHsgdHlwZTogJ3BhcmFsbGVsJywgYnJhbmNoZXMgfSBzYXRpc2ZpZXMgUGFyYWxsZWxOb2RlXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgU2luZ2xlLWxpbmUgZGlzcGF0Y2ggXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgLyoqXG4gICAqIFBhcnNlcyBhIHNpbmdsZSBzdGF0ZW1lbnQgZnJvbSBpdHMgdGV4dCBjb250ZW50LlxuICAgKiBUaGUgdGV4dCBoYXMgYWxyZWFkeSBoYWQgYHRoZW4gYCBwcmVmaXggYW5kIHRyYWlsaW5nIGAgYW5kYCBzdHJpcHBlZC5cbiAgICpcbiAgICogRGlzcGF0Y2ggb3JkZXIgbWF0dGVyczogbW9yZSBzcGVjaWZpYyBwYXR0ZXJucyBtdXN0IGNvbWUgYmVmb3JlIGdlbmVyYWwgb25lcy5cbiAgICovXG4gIHByaXZhdGUgcGFyc2VTaW5nbGVMaW5lKHRleHQ6IHN0cmluZywgaW5kZW50OiBudW1iZXIsIHRva2VuOiBUb2tlbik6IExFU05vZGUge1xuICAgIGNvbnN0IGZpcnN0ID0gZmlyc3RXb3JkKHRleHQpXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgQmxvY2sgY29uc3RydWN0cyAoY29uc3VtZSBtdWx0aXBsZSBmb2xsb3dpbmcgdG9rZW5zKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAoZmlyc3QgPT09ICdtYXRjaCcpIHJldHVybiB0aGlzLnBhcnNlTWF0Y2godGV4dCwgaW5kZW50LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICd0cnknKSAgIHJldHVybiB0aGlzLnBhcnNlVHJ5KGluZGVudCwgdG9rZW4pXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgU2ltcGxlIHN0YXRlbWVudCBkaXNwYXRjaCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAoZmlyc3QgPT09ICdzZXQnKSAgICAgICByZXR1cm4gdGhpcy5wYXJzZVNldCh0ZXh0LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICdlbWl0JykgICAgICByZXR1cm4gdGhpcy5wYXJzZUVtaXQodGV4dCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAnYnJvYWRjYXN0JykgcmV0dXJuIHRoaXMucGFyc2VCcm9hZGNhc3QodGV4dCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAnYnViYmxlJykgICAgcmV0dXJuIHRoaXMucGFyc2VCdWJibGUodGV4dCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAnY2FzY2FkZScpICAgcmV0dXJuIHRoaXMucGFyc2VDYXNjYWRlKHRleHQsIHRva2VuKVxuICAgIGlmIChmaXJzdCA9PT0gJ2ZvcndhcmQnKSAgIHJldHVybiB0aGlzLnBhcnNlRm9yd2FyZCh0ZXh0LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICdjYWxsJykgICAgICByZXR1cm4gdGhpcy5wYXJzZUNhbGwodGV4dCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAnd2FpdCcpICAgICAgcmV0dXJuIHRoaXMucGFyc2VXYWl0KHRleHQsIHRva2VuKVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIEJhcmUgRGF0YXN0YXIgYWN0aW9uOiBgQGdldCAnL3VybCcgW2FyZ3NdYCAoZmlyZS1hbmQtYXdhaXQsIG5vIGJpbmQpIFx1MjUwMFx1MjUwMFxuICAgIGlmIChmaXJzdC5zdGFydHNXaXRoKCdAJykpICByZXR1cm4gdGhpcy5wYXJzZUFjdGlvbih0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBBc3luYyBiaW5kOiBgbmFtZSA8LSBAdmVyYiAndXJsJyBbYXJnc11gIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGlmICh0ZXh0LmluY2x1ZGVzKCcgPC0gJykpIHJldHVybiB0aGlzLnBhcnNlQmluZCh0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBBbmltYXRpb24gcHJpbWl0aXZlIChidWlsdC1pbikgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgaWYgKEFOSU1BVElPTl9QUklNSVRJVkVTLmhhcyhmaXJzdCkpIHJldHVybiB0aGlzLnBhcnNlQW5pbWF0aW9uKHRleHQsIHRva2VuKVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIEFuaW1hdGlvbiBwcmltaXRpdmUgKHVzZXJsYW5kIG1vZHVsZSkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgLy8gQW55IHdvcmQgZm9sbG93ZWQgYnkgYSBDU1Mgc2VsZWN0b3IgbG9va3MgbGlrZSBhbiBhbmltYXRpb24gY2FsbC5cbiAgICAvLyBDb3ZlcnMgYm90aCBoeXBoZW5hdGVkIG5hbWVzIChzY3JvbGwtcmV2ZWFsLCBzcHJpbmctaW4pIGFuZCBiYXJlIG5hbWVzIChzaGFrZSkuXG4gICAgaWYgKGxvb2tzTGlrZUFuaW1hdGlvbkNhbGwodGV4dCkpIHtcbiAgICAgIHJldHVybiB0aGlzLnBhcnNlQW5pbWF0aW9uKHRleHQsIHRva2VuKVxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBVbmtub3duOiBzdG9yZSBhcyByYXcgZXhwcmVzc2lvbiAoZXNjYXBlIGhhdGNoIC8gZnV0dXJlIGtleXdvcmRzKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBVbmtub3duIHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICByZXR1cm4gZXhwcih0ZXh0KVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIE1hdGNoIGJsb2NrIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgcGFyc2VNYXRjaCh0ZXh0OiBzdHJpbmcsIGluZGVudDogbnVtYmVyLCB0b2tlbjogVG9rZW4pOiBNYXRjaE5vZGUge1xuICAgIC8vIGB0ZXh0YCBpcyBlLmcuIFwibWF0Y2ggcmVzcG9uc2VcIiBvciBcIm1hdGNoICRmZWVkU3RhdGVcIlxuICAgIGNvbnN0IHN1YmplY3RSYXcgPSB0ZXh0LnNsaWNlKCdtYXRjaCcubGVuZ3RoKS50cmltKClcbiAgICBjb25zdCBzdWJqZWN0OiBFeHByTm9kZSA9IGV4cHIoc3ViamVjdFJhdylcbiAgICBjb25zdCBhcm1zOiBNYXRjaEFybVtdID0gW11cblxuICAgIHdoaWxlICghdGhpcy5hdEVuZCgpKSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy5wZWVrKCkhXG5cbiAgICAgIC8vIC9tYXRjaCB0ZXJtaW5hdGVzIHRoZSBibG9ja1xuICAgICAgaWYgKHQudGV4dCA9PT0gJy9tYXRjaCcpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cblxuICAgICAgLy8gT25seSBjb25zdW1lIGFybSBsaW5lcyBhdCB0aGUgZXhwZWN0ZWQgYXJtIGluZGVudCAoaW5kZW50ICsgMilcbiAgICAgIGlmICh0LmluZGVudCA8PSBpbmRlbnQpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gVW5jbG9zZWQgbWF0Y2ggYmxvY2sgXHUyMDE0IG1pc3NpbmcgL21hdGNoYCwgdG9rZW4pXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIC8vIFBhcnNlIGFuIGFybTogYFtwYXR0ZXJuXSAtPmAgb3IgYFtwYXR0ZXJuXSAtPiBib2R5YFxuICAgICAgaWYgKHQudGV4dC5zdGFydHNXaXRoKCdbJykpIHtcbiAgICAgICAgYXJtcy5wdXNoKHRoaXMucGFyc2VNYXRjaEFybSh0LmluZGVudCwgdCkpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIFNraXAgdW5leHBlY3RlZCBsaW5lcyBpbnNpZGUgbWF0Y2hcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIFVuZXhwZWN0ZWQgdG9rZW4gaW5zaWRlIG1hdGNoIGJsb2NrOiAke0pTT04uc3RyaW5naWZ5KHQudGV4dCl9YCwgdClcbiAgICAgIHRoaXMuYWR2YW5jZSgpXG4gICAgfVxuXG4gICAgcmV0dXJuIHsgdHlwZTogJ21hdGNoJywgc3ViamVjdCwgYXJtcyB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlTWF0Y2hBcm0oYXJtSW5kZW50OiBudW1iZXIsIHRva2VuOiBUb2tlbik6IE1hdGNoQXJtIHtcbiAgICBjb25zdCB0ID0gdGhpcy5hZHZhbmNlKCkgLy8gY29uc3VtZSB0aGUgYXJtIGxpbmVcblxuICAgIC8vIFNwbGl0IG9uIGAgLT5gIHRvIHNlcGFyYXRlIHBhdHRlcm4gZnJvbSBib2R5XG4gICAgY29uc3QgYXJyb3dJZHggPSB0LnRleHQuaW5kZXhPZignIC0+JylcbiAgICBpZiAoYXJyb3dJZHggPT09IC0xKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYXRjaCBhcm0gbWlzc2luZyAnLT4nOiAke0pTT04uc3RyaW5naWZ5KHQudGV4dCl9YCwgdClcbiAgICAgIHJldHVybiB7IHBhdHRlcm5zOiBbeyBraW5kOiAnd2lsZGNhcmQnIH1dLCBib2R5OiBleHByKCcnKSB9XG4gICAgfVxuXG4gICAgY29uc3QgcGF0dGVyblJhdyA9IHQudGV4dC5zbGljZSgwLCBhcnJvd0lkeCkudHJpbSgpXG4gICAgY29uc3QgYWZ0ZXJBcnJvdyA9IHQudGV4dC5zbGljZShhcnJvd0lkeCArIDMpLnRyaW0oKSAgLy8gZXZlcnl0aGluZyBhZnRlciBgLT5gXG5cbiAgICBjb25zdCBwYXR0ZXJucyA9IHBhcnNlUGF0dGVybnMocGF0dGVyblJhdylcblxuICAgIGxldCBib2R5OiBMRVNOb2RlXG4gICAgaWYgKGFmdGVyQXJyb3cubGVuZ3RoID4gMCkge1xuICAgICAgLy8gSW5saW5lIGFybTogYFsnZXJyb3InXSAtPiBzZXQgJGZlZWRTdGF0ZSB0byAnZXJyb3InYFxuICAgICAgYm9keSA9IHRoaXMucGFyc2VTaW5nbGVMaW5lKGFmdGVyQXJyb3csIGFybUluZGVudCwgdG9rZW4pXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE11bHRpLWxpbmUgYXJtOiBib2R5IGlzIHRoZSBkZWVwZXItaW5kZW50ZWQgYmxvY2tcbiAgICAgIGJvZHkgPSB0aGlzLnBhcnNlQmxvY2soYXJtSW5kZW50KVxuICAgIH1cblxuICAgIHJldHVybiB7IHBhdHRlcm5zLCBib2R5IH1cbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBUcnkgYmxvY2sgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBwYXJzZVRyeShpbmRlbnQ6IG51bWJlciwgdG9rZW46IFRva2VuKTogVHJ5Tm9kZSB7XG4gICAgLy8gTm90ZTogdGhlIGB0cnlgIHRva2VuIHdhcyBhbHJlYWR5IGNvbnN1bWVkIGJ5IHRoZSBjYWxsaW5nIHBhcnNlU3RhdGVtZW50T3JQYXJhbGxlbC5cbiAgICAvLyBEbyBOT1QgY2FsbCB0aGlzLmFkdmFuY2UoKSBoZXJlIFx1MjAxNCB0aGF0IHdvdWxkIHNraXAgdGhlIGZpcnN0IGJvZHkgbGluZS5cblxuICAgIC8vIFBhcnNlIGJvZHkgXHUyMDE0IHN0b3BzIGF0IHJlc2N1ZS9hZnRlcndhcmRzLy90cnkgYXQgdGhlIHNhbWUgaW5kZW50IGxldmVsXG4gICAgY29uc3QgYm9keSA9IHRoaXMucGFyc2VCbG9jayhpbmRlbnQpXG5cbiAgICBsZXQgcmVzY3VlOiBMRVNOb2RlIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG4gICAgbGV0IGFmdGVyd2FyZHM6IExFU05vZGUgfCB1bmRlZmluZWQgPSB1bmRlZmluZWRcblxuICAgIC8vIHJlc2N1ZSBjbGF1c2UgKG9wdGlvbmFsKVxuICAgIGlmICh0aGlzLnBlZWsoKT8udGV4dCA9PT0gJ3Jlc2N1ZScgJiYgdGhpcy5wZWVrKCk/LmluZGVudCA9PT0gaW5kZW50KSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKSAvLyBjb25zdW1lIGByZXNjdWVgXG4gICAgICByZXNjdWUgPSB0aGlzLnBhcnNlQmxvY2soaW5kZW50KVxuICAgIH1cblxuICAgIC8vIGFmdGVyd2FyZHMgY2xhdXNlIChvcHRpb25hbClcbiAgICBpZiAodGhpcy5wZWVrKCk/LnRleHQgPT09ICdhZnRlcndhcmRzJyAmJiB0aGlzLnBlZWsoKT8uaW5kZW50ID09PSBpbmRlbnQpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpIC8vIGNvbnN1bWUgYGFmdGVyd2FyZHNgXG4gICAgICBhZnRlcndhcmRzID0gdGhpcy5wYXJzZUJsb2NrKGluZGVudClcbiAgICB9XG5cbiAgICAvLyBDb25zdW1lIC90cnlcbiAgICBpZiAodGhpcy5wZWVrKCk/LnRleHQgPT09ICcvdHJ5Jykge1xuICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gVW5jbG9zZWQgdHJ5IGJsb2NrIFx1MjAxNCBtaXNzaW5nIC90cnlgLCB0b2tlbilcbiAgICB9XG5cbiAgICBjb25zdCB0cnlOb2RlOiBUcnlOb2RlID0geyB0eXBlOiAndHJ5JywgYm9keSB9XG4gICAgaWYgKHJlc2N1ZSAgICAhPT0gdW5kZWZpbmVkKSB0cnlOb2RlLnJlc2N1ZSAgICAgPSByZXNjdWVcbiAgICBpZiAoYWZ0ZXJ3YXJkcyAhPT0gdW5kZWZpbmVkKSB0cnlOb2RlLmFmdGVyd2FyZHMgPSBhZnRlcndhcmRzXG4gICAgcmV0dXJuIHRyeU5vZGVcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBTaW1wbGUgc3RhdGVtZW50IHBhcnNlcnMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBwYXJzZVNldCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IFNldE5vZGUge1xuICAgIC8vIGBzZXQgJHNpZ25hbCB0byBleHByYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9ec2V0XFxzK1xcJChcXHcrKVxccyt0b1xccysoLispJC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgc2V0IHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7IHR5cGU6ICdzZXQnLCBzaWduYWw6ICc/PycsIHZhbHVlOiBleHByKHRleHQpIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdzZXQnLFxuICAgICAgc2lnbmFsOiBtWzFdISxcbiAgICAgIHZhbHVlOiBleHByKG1bMl0hLnRyaW0oKSksXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUVtaXQodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBFbWl0Tm9kZSB7XG4gICAgLy8gYGVtaXQgZXZlbnQ6bmFtZSBbcGF5bG9hZCwgLi4uXWAgb3IgYGVtaXQgZXZlbnQ6bmFtZWBcbiAgICBjb25zdCB7IG5hbWUsIHBheWxvYWQgfSA9IHBhcnNlRXZlbnRMaW5lKHRleHQuc2xpY2UoJ2VtaXQnLmxlbmd0aCkudHJpbSgpLCB0b2tlbilcbiAgICByZXR1cm4geyB0eXBlOiAnZW1pdCcsIGV2ZW50OiBuYW1lLCBwYXlsb2FkIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VCcm9hZGNhc3QodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBCcm9hZGNhc3ROb2RlIHtcbiAgICBjb25zdCB7IG5hbWUsIHBheWxvYWQgfSA9IHBhcnNlRXZlbnRMaW5lKHRleHQuc2xpY2UoJ2Jyb2FkY2FzdCcubGVuZ3RoKS50cmltKCksIHRva2VuKVxuICAgIHJldHVybiB7IHR5cGU6ICdicm9hZGNhc3QnLCBldmVudDogbmFtZSwgcGF5bG9hZCB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQnViYmxlKHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogQnViYmxlTm9kZSB7XG4gICAgY29uc3QgeyBuYW1lLCBwYXlsb2FkIH0gPSBwYXJzZUV2ZW50TGluZSh0ZXh0LnNsaWNlKCdidWJibGUnLmxlbmd0aCkudHJpbSgpLCB0b2tlbilcbiAgICByZXR1cm4geyB0eXBlOiAnYnViYmxlJywgZXZlbnQ6IG5hbWUsIHBheWxvYWQgfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUNhc2NhZGUodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBDYXNjYWRlTm9kZSB7XG4gICAgY29uc3QgeyBuYW1lLCBwYXlsb2FkIH0gPSBwYXJzZUV2ZW50TGluZSh0ZXh0LnNsaWNlKCdjYXNjYWRlJy5sZW5ndGgpLnRyaW0oKSwgdG9rZW4pXG4gICAgcmV0dXJuIHsgdHlwZTogJ2Nhc2NhZGUnLCBldmVudDogbmFtZSwgcGF5bG9hZCB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlRm9yd2FyZCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IEZvcndhcmROb2RlIHtcbiAgICAvLyBgZm9yd2FyZCBuYW1lYCBvciBgZm9yd2FyZCBuYW1lIFtwYXlsb2FkLCAuLi5dYFxuICAgIC8vIFNhbWUgc2hhcGUgYXMgcGFyc2VFbWl0L3BhcnNlQnJvYWRjYXN0IGJ1dCB0aGUgXCJldmVudFwiIGlzIGEgYnJpZGdlIG5hbWUuXG4gICAgY29uc3QgeyBuYW1lLCBwYXlsb2FkIH0gPSBwYXJzZUV2ZW50TGluZSh0ZXh0LnNsaWNlKCdmb3J3YXJkJy5sZW5ndGgpLnRyaW0oKSwgdG9rZW4pXG4gICAgcmV0dXJuIHsgdHlwZTogJ2ZvcndhcmQnLCBuYW1lLCBwYXlsb2FkIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VDYWxsKHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogQ2FsbE5vZGUge1xuICAgIC8vIGBjYWxsIGNvbW1hbmQ6bmFtZSBbYXJnOiB2YWx1ZSwgLi4uXWAgb3IgYGNhbGwgY29tbWFuZDpuYW1lYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9eY2FsbFxccysoW15cXHNcXFtdKylcXHMqKD86XFxbKC4rKVxcXSk/JC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgY2FsbCBzdGF0ZW1lbnQ6ICR7SlNPTi5zdHJpbmdpZnkodGV4dCl9YCwgdG9rZW4pXG4gICAgICByZXR1cm4geyB0eXBlOiAnY2FsbCcsIGNvbW1hbmQ6ICc/PycsIGFyZ3M6IHt9IH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdjYWxsJyxcbiAgICAgIGNvbW1hbmQ6IG1bMV0hLFxuICAgICAgYXJnczogcGFyc2VBcmdMaXN0KG1bMl0gPz8gJycpLFxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VXYWl0KHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogV2FpdE5vZGUge1xuICAgIC8vIGB3YWl0IDMwMG1zYCBvciBgd2FpdCAoYXR0ZW1wdCArIDEpICogNTAwbXNgXG4gICAgY29uc3QgbSA9IHRleHQubWF0Y2goL153YWl0XFxzKyguKz8pbXMkLylcbiAgICBpZiAoIW0pIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIE1hbGZvcm1lZCB3YWl0IHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7IHR5cGU6ICd3YWl0JywgbXM6IDAgfVxuICAgIH1cbiAgICBjb25zdCBtc0V4cHIgPSBtWzFdIS50cmltKClcbiAgICAvLyBTaW1wbGUgbGl0ZXJhbFxuICAgIGNvbnN0IGxpdGVyYWwgPSBOdW1iZXIobXNFeHByKVxuICAgIGlmICghTnVtYmVyLmlzTmFOKGxpdGVyYWwpKSByZXR1cm4geyB0eXBlOiAnd2FpdCcsIG1zOiBsaXRlcmFsIH1cbiAgICAvLyBFeHByZXNzaW9uIFx1MjAxNCBzdG9yZSBhcyAwIHdpdGggdGhlIGV4cHJlc3Npb24gYXMgYSBjb21tZW50IChleGVjdXRvciB3aWxsIGV2YWwpXG4gICAgLy8gUGhhc2UgMyB3aWxsIGhhbmRsZSBkeW5hbWljIGR1cmF0aW9ucyBwcm9wZXJseVxuICAgIHJldHVybiB7IHR5cGU6ICd3YWl0JywgbXM6IDAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUJpbmQodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBCaW5kTm9kZSB7XG4gICAgLy8gYG5hbWUgPC0gQHZlcmIgJ3VybCcgW2FyZ3NdYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9eKFxcdyspXFxzKzwtXFxzK0AoXFx3KylcXHMrJyhbXiddKyknXFxzKig/OlxcWyguKylcXF0pPyQvKVxuICAgIGlmICghbSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gTWFsZm9ybWVkIGJpbmQgc3RhdGVtZW50OiAke0pTT04uc3RyaW5naWZ5KHRleHQpfWAsIHRva2VuKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogJ2JpbmQnLFxuICAgICAgICBuYW1lOiAnPz8nLFxuICAgICAgICBhY3Rpb246IHsgdHlwZTogJ2FjdGlvbicsIHZlcmI6ICdnZXQnLCB1cmw6ICcnLCBhcmdzOiB7fSB9LFxuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBhY3Rpb246IEFjdGlvbk5vZGUgPSB7XG4gICAgICB0eXBlOiAnYWN0aW9uJyxcbiAgICAgIHZlcmI6IG1bMl0hLnRvTG93ZXJDYXNlKCksXG4gICAgICB1cmw6IG1bM10hLFxuICAgICAgYXJnczogcGFyc2VBcmdMaXN0KG1bNF0gPz8gJycpLFxuICAgIH1cbiAgICByZXR1cm4geyB0eXBlOiAnYmluZCcsIG5hbWU6IG1bMV0hLCBhY3Rpb24gfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUFjdGlvbih0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IEFjdGlvbk5vZGUge1xuICAgIC8vIGBAZ2V0ICcvdXJsJyBbYXJnc11gIG9yIGBAcG9zdCAnL3VybCcgW2FyZ3NdYFxuICAgIGNvbnN0IG0gPSB0ZXh0Lm1hdGNoKC9eQChcXHcrKVxccysnKFteJ10rKSdcXHMqKD86XFxbKC4rKVxcXSk/JC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgYWN0aW9uOiAke0pTT04uc3RyaW5naWZ5KHRleHQpfWAsIHRva2VuKVxuICAgICAgcmV0dXJuIHsgdHlwZTogJ2FjdGlvbicsIHZlcmI6ICdnZXQnLCB1cmw6ICcnLCBhcmdzOiB7fSB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnYWN0aW9uJyxcbiAgICAgIHZlcmI6IG1bMV0hLnRvTG93ZXJDYXNlKCksXG4gICAgICB1cmw6IG1bMl0hLFxuICAgICAgYXJnczogcGFyc2VBcmdMaXN0KG1bM10gPz8gJycpLFxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VBbmltYXRpb24odGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBBbmltYXRpb25Ob2RlIHtcbiAgICAvLyBgcHJpbWl0aXZlIHNlbGVjdG9yIGR1cmF0aW9uIGVhc2luZyBbb3B0aW9uc11gXG4gICAgLy8gRXhhbXBsZXM6XG4gICAgLy8gICBzdGFnZ2VyLWVudGVyIC5mZWVkLWl0ZW0gIDEyMG1zIGVhc2Utb3V0IFtnYXA6IDQwbXMgIGZyb206IHJpZ2h0XVxuICAgIC8vICAgcHVsc2UgLmZlZWQtaXRlbS5pcy11cGRhdGVkICAzMDBtcyBlYXNlLWluLW91dFxuICAgIC8vICAgc2xpZGUtb3V0IFtkYXRhLWl0ZW0taWQ6IGlkXSAgMTUwbXMgZWFzZS1pbiBbdG86IHJpZ2h0XVxuXG4gICAgLy8gVG9rZW5pemU6IHNwbGl0IG9uIHdoaXRlc3BhY2UgYnV0IHByZXNlcnZlIFsuLi5dIGdyb3Vwc1xuICAgIGNvbnN0IHBhcnRzID0gc3BsaXRBbmltYXRpb25MaW5lKHRleHQpXG5cbiAgICBjb25zdCBwcmltaXRpdmUgPSBwYXJ0c1swXSA/PyAnJ1xuICAgIGNvbnN0IHNlbGVjdG9yICA9IHBhcnRzWzFdID8/ICcnXG4gICAgY29uc3QgZHVyYXRpb25TdHIgPSBwYXJ0c1syXSA/PyAnMG1zJ1xuICAgIGNvbnN0IGVhc2luZyAgICA9IHBhcnRzWzNdID8/ICdlYXNlJ1xuICAgIGNvbnN0IG9wdGlvbnNTdHIgPSBwYXJ0c1s0XSA/PyAnJyAgLy8gbWF5IGJlIGFic2VudFxuXG4gICAgY29uc3QgZHVyYXRpb25NcyA9IHBhcnNlSW50KGR1cmF0aW9uU3RyLCAxMClcblxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnYW5pbWF0aW9uJyxcbiAgICAgIHByaW1pdGl2ZSxcbiAgICAgIHNlbGVjdG9yLFxuICAgICAgZHVyYXRpb246IE51bWJlci5pc05hTihkdXJhdGlvbk1zKSA/IDAgOiBkdXJhdGlvbk1zLFxuICAgICAgZWFzaW5nLFxuICAgICAgb3B0aW9uczogcGFyc2VBbmltYXRpb25PcHRpb25zKG9wdGlvbnNTdHIpLFxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFBhdHRlcm4gcGFyc2luZ1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogUGFyc2VzIGEgcGF0dGVybiBncm91cCBsaWtlIGBbaXQgICBvayAgIF1gLCBgW25pbCAgZXJyb3JdYCwgYFtfXWAsXG4gKiBgWydlcnJvciddYCwgYFswIHwgMSB8IDJdYC5cbiAqXG4gKiBSZXR1cm5zIGFuIGFycmF5IG9mIFBhdHRlcm5Ob2RlIFx1MjAxNCBvbmUgcGVyIGVsZW1lbnQgaW4gdGhlIHR1cGxlIHBhdHRlcm4uXG4gKiBGb3Igb3ItcGF0dGVybnMgKGAwIHwgMSB8IDJgKSwgcmV0dXJucyBhIHNpbmdsZSBPclBhdHRlcm5Ob2RlLlxuICovXG5mdW5jdGlvbiBwYXJzZVBhdHRlcm5zKHJhdzogc3RyaW5nKTogUGF0dGVybk5vZGVbXSB7XG4gIC8vIFN0cmlwIG91dGVyIGJyYWNrZXRzXG4gIGNvbnN0IGlubmVyID0gcmF3LnJlcGxhY2UoL15cXFt8XFxdJC9nLCAnJykudHJpbSgpXG5cbiAgLy8gQ2hlY2sgZm9yIG9yLXBhdHRlcm46IGNvbnRhaW5zIGAgfCBgXG4gIGlmIChpbm5lci5pbmNsdWRlcygnIHwgJykgfHwgaW5uZXIuaW5jbHVkZXMoJ3wnKSkge1xuICAgIGNvbnN0IGFsdGVybmF0aXZlcyA9IGlubmVyLnNwbGl0KC9cXHMqXFx8XFxzKi8pLm1hcChwID0+IHBhcnNlU2luZ2xlUGF0dGVybihwLnRyaW0oKSkpXG4gICAgcmV0dXJuIFt7IGtpbmQ6ICdvcicsIHBhdHRlcm5zOiBhbHRlcm5hdGl2ZXMgfV1cbiAgfVxuXG4gIC8vIFR1cGxlIHBhdHRlcm46IHNwYWNlLXNlcGFyYXRlZCBlbGVtZW50c1xuICAvLyBVc2UgYSBjdXN0b20gc3BsaXQgdG8gaGFuZGxlIG11bHRpcGxlIHNwYWNlcyAoYWxpZ25tZW50IHBhZGRpbmcpXG4gIHJldHVybiBpbm5lci50cmltKCkuc3BsaXQoL1xcc3syLH18XFxzKD89XFxTKS8pLmZpbHRlcihzID0+IHMudHJpbSgpKVxuICAgIC5tYXAocCA9PiBwYXJzZVNpbmdsZVBhdHRlcm4ocC50cmltKCkpKVxufVxuXG5mdW5jdGlvbiBwYXJzZVNpbmdsZVBhdHRlcm4oczogc3RyaW5nKTogUGF0dGVybk5vZGUge1xuICBpZiAocyA9PT0gJ18nKSAgIHJldHVybiB7IGtpbmQ6ICd3aWxkY2FyZCcgfVxuICBpZiAocyA9PT0gJ25pbCcpIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IG51bGwgfVxuXG4gIC8vIFN0cmluZyBsaXRlcmFsOiAndmFsdWUnXG4gIGlmIChzLnN0YXJ0c1dpdGgoXCInXCIpICYmIHMuZW5kc1dpdGgoXCInXCIpKSB7XG4gICAgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogcy5zbGljZSgxLCAtMSkgfVxuICB9XG5cbiAgLy8gTnVtYmVyIGxpdGVyYWxcbiAgY29uc3QgbiA9IE51bWJlcihzKVxuICBpZiAoIU51bWJlci5pc05hTihuKSkgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogbiB9XG5cbiAgLy8gQm9vbGVhblxuICBpZiAocyA9PT0gJ3RydWUnKSAgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogdHJ1ZSB9XG4gIGlmIChzID09PSAnZmFsc2UnKSByZXR1cm4geyBraW5kOiAnbGl0ZXJhbCcsIHZhbHVlOiBmYWxzZSB9XG5cbiAgLy8gRXZlcnl0aGluZyBlbHNlIGlzIGEgYmluZGluZyAoY2FwdHVyZXMgdGhlIHZhbHVlIGZvciB1c2UgaW4gdGhlIGJvZHkpXG4gIHJldHVybiB7IGtpbmQ6ICdiaW5kaW5nJywgbmFtZTogcyB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gQXJndW1lbnQgbGlzdCBwYXJzaW5nXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBQYXJzZXMgYGtleTogdmFsdWUgIGtleTI6IHZhbHVlMmAgZnJvbSBpbnNpZGUgYSBbLi4uXSBhcmd1bWVudCBibG9jay5cbiAqIFZhbHVlcyBhcmUgc3RvcmVkIGFzIEV4cHJOb2RlIChldmFsdWF0ZWQgYXQgcnVudGltZSkuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlQXJnTGlzdChyYXc6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIEV4cHJOb2RlPiB7XG4gIGlmICghcmF3LnRyaW0oKSkgcmV0dXJuIHt9XG5cbiAgY29uc3QgcmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCBFeHByTm9kZT4gPSB7fVxuXG4gIC8vIFNwbGl0IG9uIGAgIGAgKGRvdWJsZS1zcGFjZSB1c2VkIGFzIHNlcGFyYXRvciBpbiBMRVMgc3R5bGUpXG4gIC8vIGJ1dCBhbHNvIGhhbmRsZSBzaW5nbGUgYCAga2V5OiB2YWx1ZWAgZW50cmllc1xuICAvLyBTaW1wbGUgcmVnZXg6IGB3b3JkOiByZXN0X3VudGlsX25leHRfd29yZDpgXG4gIGNvbnN0IHBhaXJzID0gcmF3LnRyaW0oKS5zcGxpdCgvKD88PVxcUylcXHN7Mix9KD89XFx3KS8pXG4gIGZvciAoY29uc3QgcGFpciBvZiBwYWlycykge1xuICAgIGNvbnN0IGNvbG9uSWR4ID0gcGFpci5pbmRleE9mKCc6JylcbiAgICBpZiAoY29sb25JZHggPT09IC0xKSBjb250aW51ZVxuICAgIGNvbnN0IGtleSAgID0gcGFpci5zbGljZSgwLCBjb2xvbklkeCkudHJpbSgpXG4gICAgY29uc3QgdmFsdWUgPSBwYWlyLnNsaWNlKGNvbG9uSWR4ICsgMSkudHJpbSgpXG4gICAgaWYgKGtleSkgcmVzdWx0W2tleV0gPSBleHByKHZhbHVlKVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEV2ZW50IGxpbmUgcGFyc2luZzogYGV2ZW50Om5hbWUgW3BheWxvYWQuLi5dYFxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIHBhcnNlRXZlbnRMaW5lKFxuICByYXc6IHN0cmluZyxcbiAgdG9rZW46IFRva2VuXG4pOiB7IG5hbWU6IHN0cmluZzsgcGF5bG9hZDogRXhwck5vZGVbXSB9IHtcbiAgLy8gYGZlZWQ6ZGF0YS1yZWFkeWAgb3IgYGZlZWQ6ZGF0YS1yZWFkeSBbJGZlZWRJdGVtc11gIG9yIGBmZWVkOmVycm9yIFskZXJyb3JdYFxuICBjb25zdCBicmFja2V0SWR4ID0gcmF3LmluZGV4T2YoJ1snKVxuICBpZiAoYnJhY2tldElkeCA9PT0gLTEpIHtcbiAgICByZXR1cm4geyBuYW1lOiByYXcudHJpbSgpLCBwYXlsb2FkOiBbXSB9XG4gIH1cbiAgY29uc3QgbmFtZSA9IHJhdy5zbGljZSgwLCBicmFja2V0SWR4KS50cmltKClcbiAgY29uc3QgcGF5bG9hZFJhdyA9IHJhdy5zbGljZShicmFja2V0SWR4ICsgMSwgcmF3Lmxhc3RJbmRleE9mKCddJykpLnRyaW0oKVxuXG4gIC8vIFBheWxvYWQgZWxlbWVudHMgYXJlIGNvbW1hLXNlcGFyYXRlZCBvciB0d28tb3ItbW9yZS1zcGFjZSBzZXBhcmF0ZWQuXG4gIC8vIFNpbmdsZSBzcGFjZSBpcyBpbnRlbnRpb25hbGx5IE5PVCBhIHNlcGFyYXRvciBcdTIwMTQgZXhwcmVzc2lvbnMgY2FuIGNvbnRhaW5cbiAgLy8gc3BhY2VzIChlLmcuLCBgYSArIGJgKS4gVXNlIGNvbW1hcyBvciBkb3VibGUtc3BhY2UgdG8gc2VwYXJhdGUgaXRlbXM6XG4gIC8vICAgW3BheWxvYWRbMF0sIHBheWxvYWRbMV1dICAgXHUyMTkwIHByZWZlcnJlZCAodW5hbWJpZ3VvdXMpXG4gIC8vICAgW3BheWxvYWRbMF0gIHBheWxvYWRbMV1dICAgXHUyMTkwIGFsc28gd29ya3MgKGxlZ2FjeSBkb3VibGUtc3BhY2UpXG4gIGNvbnN0IHBheWxvYWQ6IEV4cHJOb2RlW10gPSBwYXlsb2FkUmF3XG4gICAgPyBwYXlsb2FkUmF3LnNwbGl0KC8sXFxzKnxcXHN7Mix9LykubWFwKHMgPT4gZXhwcihzLnRyaW0oKSkpLmZpbHRlcihlID0+IGUucmF3KVxuICAgIDogW11cblxuICByZXR1cm4geyBuYW1lLCBwYXlsb2FkIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBBbmltYXRpb24gbGluZSBwYXJzaW5nXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBTcGxpdHMgYW4gYW5pbWF0aW9uIGxpbmUgaW50byBpdHMgc3RydWN0dXJhbCBwYXJ0cywgcHJlc2VydmluZyBbLi4uXSBncm91cHMuXG4gKlxuICogSW5wdXQ6ICBgc3RhZ2dlci1lbnRlciAuZmVlZC1pdGVtICAxMjBtcyBlYXNlLW91dCBbZ2FwOiA0MG1zICBmcm9tOiByaWdodF1gXG4gKiBPdXRwdXQ6IFsnc3RhZ2dlci1lbnRlcicsICcuZmVlZC1pdGVtJywgJzEyMG1zJywgJ2Vhc2Utb3V0JywgJ1tnYXA6IDQwbXMgIGZyb206IHJpZ2h0XSddXG4gKi9cbmZ1bmN0aW9uIHNwbGl0QW5pbWF0aW9uTGluZSh0ZXh0OiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHBhcnRzOiBzdHJpbmdbXSA9IFtdXG4gIGxldCBjdXJyZW50ID0gJydcbiAgbGV0IGluQnJhY2tldCA9IDBcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHRleHQubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjaCA9IHRleHRbaV0hXG4gICAgaWYgKGNoID09PSAnWycpIHtcbiAgICAgIGluQnJhY2tldCsrXG4gICAgICBjdXJyZW50ICs9IGNoXG4gICAgfSBlbHNlIGlmIChjaCA9PT0gJ10nKSB7XG4gICAgICBpbkJyYWNrZXQtLVxuICAgICAgY3VycmVudCArPSBjaFxuICAgIH0gZWxzZSBpZiAoY2ggPT09ICcgJyAmJiBpbkJyYWNrZXQgPT09IDApIHtcbiAgICAgIGlmIChjdXJyZW50LnRyaW0oKSkgcGFydHMucHVzaChjdXJyZW50LnRyaW0oKSlcbiAgICAgIGN1cnJlbnQgPSAnJ1xuICAgIH0gZWxzZSB7XG4gICAgICBjdXJyZW50ICs9IGNoXG4gICAgfVxuICB9XG4gIGlmIChjdXJyZW50LnRyaW0oKSkgcGFydHMucHVzaChjdXJyZW50LnRyaW0oKSlcbiAgcmV0dXJuIHBhcnRzXG59XG5cbi8qKlxuICogUGFyc2VzIGFuaW1hdGlvbiBvcHRpb25zIGZyb20gYSBgW2tleTogdmFsdWUgIGtleTI6IHZhbHVlMl1gIHN0cmluZy5cbiAqIFRoZSBvdXRlciBicmFja2V0cyBhcmUgaW5jbHVkZWQgaW4gdGhlIGlucHV0LlxuICovXG5mdW5jdGlvbiBwYXJzZUFuaW1hdGlvbk9wdGlvbnMocmF3OiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCBFeHByTm9kZT4ge1xuICBpZiAoIXJhdy50cmltKCkpIHJldHVybiB7fVxuICAvLyBTdHJpcCBvdXRlciBicmFja2V0c1xuICBjb25zdCBpbm5lciA9IHJhdy5yZXBsYWNlKC9eXFxbfFxcXSQvZywgJycpLnRyaW0oKVxuICByZXR1cm4gcGFyc2VBcmdMaXN0KGlubmVyKVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFV0aWxpdGllc1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIGV4cHIocmF3OiBzdHJpbmcpOiBFeHByTm9kZSB7XG4gIHJldHVybiB7IHR5cGU6ICdleHByJywgcmF3IH1cbn1cblxuZnVuY3Rpb24gZmlyc3RXb3JkKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB0ZXh0LnNwbGl0KC9cXHMrLylbMF0gPz8gJydcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgYSBzdGF0ZW1lbnQgbG9va3MgbGlrZSBhbiBhbmltYXRpb24gY2FsbDpcbiAqICAgPHdvcmQtd2l0aC1oeXBoZW4+ICA8c2VsZWN0b3J8ZHVyYXRpb24+ICAuLi5cbiAqXG4gKiBUaGlzIGFsbG93cyB1c2VybGFuZCBtb2R1bGUgcHJpbWl0aXZlcyAoc2Nyb2xsLXJldmVhbCwgc3ByaW5nLWluLCBldGMuKVxuICogdG8gYmUgcGFyc2VkIGFzIEFuaW1hdGlvbk5vZGUgd2l0aG91dCBiZWluZyBsaXN0ZWQgaW4gQU5JTUFUSU9OX1BSSU1JVElWRVMuXG4gKiBUaGUgZXhlY3V0b3IgdGhlbiBkaXNwYXRjaGVzIHRoZW0gdGhyb3VnaCB0aGUgTW9kdWxlUmVnaXN0cnkuXG4gKi9cbmZ1bmN0aW9uIGxvb2tzTGlrZUFuaW1hdGlvbkNhbGwodGV4dDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IHBhcnRzID0gdGV4dC50cmltKCkuc3BsaXQoL1xccysvKVxuICBpZiAocGFydHMubGVuZ3RoIDwgMikgcmV0dXJuIGZhbHNlXG4gIGNvbnN0IHNlY29uZCA9IHBhcnRzWzFdID8/ICcnXG4gIC8vIFNlY29uZCB0b2tlbiBpcyBhIENTUyBzZWxlY3RvciAoLmNsYXNzLCAjaWQsIFthdHRyXSwgdGFnbmFtZSkgb3IgYSBkdXJhdGlvbiAoTm1zKVxuICByZXR1cm4gL15bLiNcXFtdLy50ZXN0KHNlY29uZCkgfHwgIC8vIENTUyBzZWxlY3RvclxuICAgICAgICAgL15cXGQrbXMkLy50ZXN0KHNlY29uZCkgICAgICAvLyBiYXJlIGR1cmF0aW9uICh1bnVzdWFsIGJ1dCB2YWxpZClcbn1cblxuZnVuY3Rpb24gdG9TZXF1ZW5jZU9yU2luZ2xlKHN0ZXBzOiBMRVNOb2RlW10pOiBMRVNOb2RlIHtcbiAgaWYgKHN0ZXBzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGV4cHIoJycpXG4gIGlmIChzdGVwcy5sZW5ndGggPT09IDEpIHJldHVybiBzdGVwc1swXSFcbiAgcmV0dXJuIHsgdHlwZTogJ3NlcXVlbmNlJywgc3RlcHMgfSBzYXRpc2ZpZXMgU2VxdWVuY2VOb2RlXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gUGFyc2UgZXJyb3Jcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5leHBvcnQgY2xhc3MgTEVTUGFyc2VFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nLCBwdWJsaWMgcmVhZG9ubHkgdG9rZW46IFRva2VuIHwgdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgbG9jID0gdG9rZW4gPyBgIChsaW5lICR7dG9rZW4ubGluZU51bX06ICR7SlNPTi5zdHJpbmdpZnkodG9rZW4udGV4dCl9KWAgOiAnJ1xuICAgIHN1cGVyKGBbTEVTOnBhcnNlcl0gJHttZXNzYWdlfSR7bG9jfWApXG4gICAgdGhpcy5uYW1lID0gJ0xFU1BhcnNlRXJyb3InXG4gIH1cbn1cbiIsICJpbXBvcnQgeyBzdHJpcEJvZHkgfSBmcm9tICcuL3N0cmlwQm9keS5qcydcbmltcG9ydCB7IHRva2VuaXplIH0gZnJvbSAnLi90b2tlbml6ZXIuanMnXG5pbXBvcnQgeyBMRVNQYXJzZXIgfSBmcm9tICcuL3BhcnNlci5qcydcbmltcG9ydCB0eXBlIHsgTEVTTm9kZSB9IGZyb20gJy4vYXN0LmpzJ1xuXG5leHBvcnQgeyBMRVNQYXJzZXIsIExFU1BhcnNlRXJyb3IgfSBmcm9tICcuL3BhcnNlci5qcydcbmV4cG9ydCB7IHRva2VuaXplLCBlbmRzV2l0aEFuZCwgc3RyaXBUcmFpbGluZ0FuZCB9IGZyb20gJy4vdG9rZW5pemVyLmpzJ1xuZXhwb3J0IHsgc3RyaXBCb2R5IH0gZnJvbSAnLi9zdHJpcEJvZHkuanMnXG5leHBvcnQgdHlwZSB7IFRva2VuIH0gZnJvbSAnLi90b2tlbml6ZXIuanMnXG5leHBvcnQgKiBmcm9tICcuL2FzdC5qcydcbmV4cG9ydCAqIGZyb20gJy4vY29uZmlnLmpzJ1xuXG4vKipcbiAqIFBhcnNlIGEgcmF3IExFUyBib2R5IHN0cmluZyAoZnJvbSBhIGRvPSwgaGFuZGxlPSwgb3IgcnVuPSBhdHRyaWJ1dGUpXG4gKiBpbnRvIGEgdHlwZWQgQVNUIG5vZGUuXG4gKlxuICogVGhpcyBpcyB0aGUgcHVibGljIGVudHJ5IHBvaW50IGZvciBQaGFzZSAyOlxuICogICAtIFN0cmlwcyBiYWNrdGljayB3cmFwcGVyIGFuZCBub3JtYWxpemVzIGluZGVudGF0aW9uIChzdHJpcEJvZHkpXG4gKiAgIC0gVG9rZW5pemVzIGludG8gbGluZXMgd2l0aCBpbmRlbnQgbGV2ZWxzICh0b2tlbml6ZSlcbiAqICAgLSBQYXJzZXMgaW50byBhIHR5cGVkIExFU05vZGUgQVNUIChMRVNQYXJzZXIpXG4gKlxuICogQHRocm93cyBMRVNQYXJzZUVycm9yIG9uIHVucmVjb3ZlcmFibGUgc3ludGF4IGVycm9ycyAoY3VycmVudGx5IHNvZnQtd2FybnMgaW5zdGVhZClcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTEVTKHJhdzogc3RyaW5nKTogTEVTTm9kZSB7XG4gIGNvbnN0IHN0cmlwcGVkID0gc3RyaXBCb2R5KHJhdylcbiAgY29uc3QgdG9rZW5zICAgPSB0b2tlbml6ZShzdHJpcHBlZClcbiAgY29uc3QgcGFyc2VyICAgPSBuZXcgTEVTUGFyc2VyKHRva2VucylcbiAgcmV0dXJuIHBhcnNlci5wYXJzZSgpXG59XG4iLCAiLyoqXG4gKiBQaGFzZSA0OiB3aXJlcyB0aGUgcGFyc2VkIGNvbmZpZyBpbnRvIGxpdmUgcnVudGltZSBiZWhhdmlvci5cbiAqXG4gKiBSZXNwb25zaWJpbGl0aWVzOlxuICogICAxLiBSZWdpc3RlciBhbGwgPGxvY2FsLWNvbW1hbmQ+IHBhcnNlZCBkZWZzIGludG8gdGhlIENvbW1hbmRSZWdpc3RyeVxuICogICAyLiBBdHRhY2ggQ3VzdG9tRXZlbnQgbGlzdGVuZXJzIG9uIHRoZSBob3N0IGZvciBlYWNoIDxvbi1ldmVudD5cbiAqICAgMy4gV2lyZSA8b24tbG9hZD4gdG8gZmlyZSBhZnRlciBET00gaXMgcmVhZHlcbiAqICAgNC4gQnVpbGQgdGhlIExFU0NvbnRleHQgdXNlZCBieSB0aGUgZXhlY3V0b3JcbiAqXG4gKiA8b24tc2lnbmFsPiBhbmQgPG9uLWVudGVyPi88b24tZXhpdD4gYXJlIHdpcmVkIGluIFBoYXNlIDUvNi5cbiAqL1xuXG5pbXBvcnQgeyBleGVjdXRlLCBldmFsRXhwciB9IGZyb20gJy4vZXhlY3V0b3IuanMnXG5pbXBvcnQgeyBMRVNTY29wZSB9IGZyb20gJy4vc2NvcGUuanMnXG5pbXBvcnQgdHlwZSB7IENvbW1hbmRSZWdpc3RyeSB9IGZyb20gJy4vcmVnaXN0cnkuanMnXG5pbXBvcnQgdHlwZSB7IE1vZHVsZVJlZ2lzdHJ5IH0gZnJvbSAnQG1vZHVsZXMvdHlwZXMuanMnXG5pbXBvcnQgdHlwZSB7IExFU0NvbmZpZyB9IGZyb20gJ0BwYXJzZXIvY29uZmlnLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNOb2RlIH0gZnJvbSAnQHBhcnNlci9hc3QuanMnXG5pbXBvcnQgeyBwYXJzZUxFUyB9IGZyb20gJ0BwYXJzZXIvaW5kZXguanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFyc2VkV2lyaW5nIHtcbiAgY29tbWFuZHM6ICBBcnJheTx7IG5hbWU6IHN0cmluZzsgZ3VhcmQ6IHN0cmluZyB8IG51bGw7IGFyZ3NSYXc6IHN0cmluZzsgYm9keTogTEVTTm9kZSB9PlxuICBoYW5kbGVyczogIEFycmF5PHsgZXZlbnQ6IHN0cmluZzsgYm9keTogTEVTTm9kZSB9PlxuICB3YXRjaGVyczogIEFycmF5PHsgc2lnbmFsOiBzdHJpbmc7IHdoZW46IHN0cmluZyB8IG51bGw7IGJvZHk6IExFU05vZGUgfT5cbiAgbGlmZWN5Y2xlOiB7XG4gICAgb25Mb2FkOiAgTEVTTm9kZVtdXG4gICAgb25FbnRlcjogQXJyYXk8eyB3aGVuOiBzdHJpbmcgfCBudWxsOyBib2R5OiBMRVNOb2RlIH0+XG4gICAgb25FeGl0OiAgTEVTTm9kZVtdXG4gIH1cbn1cblxuLyoqIEJ1aWxkcyBhIExFU0NvbnRleHQgZm9yIHRoZSBob3N0IGVsZW1lbnQuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDb250ZXh0KFxuICBob3N0OiBFbGVtZW50LFxuICBjb21tYW5kczogQ29tbWFuZFJlZ2lzdHJ5LFxuICBtb2R1bGVzOiBNb2R1bGVSZWdpc3RyeSxcbiAgc2lnbmFsczogeyBnZXQ6IChrOiBzdHJpbmcpID0+IHVua25vd247IHNldDogKGs6IHN0cmluZywgdjogdW5rbm93bikgPT4gdm9pZCB9XG4pOiBpbXBvcnQoJy4vZXhlY3V0b3IuanMnKS5MRVNDb250ZXh0IHtcbiAgY29uc3Qgc2NvcGUgPSBuZXcgTEVTU2NvcGUoKVxuXG4gIGNvbnN0IGVtaXRMb2NhbCA9IChldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHtcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gZW1pdCBcIiR7ZXZlbnR9XCJgLCBwYXlsb2FkLmxlbmd0aCA/IHBheWxvYWQgOiAnJylcbiAgICBob3N0LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KGV2ZW50LCB7XG4gICAgICBkZXRhaWw6IHsgcGF5bG9hZCB9LFxuICAgICAgYnViYmxlczogZmFsc2UsXG4gICAgICBjb21wb3NlZDogZmFsc2UsXG4gICAgfSkpXG4gIH1cblxuICBjb25zdCBicm9hZGNhc3QgPSAoZXZlbnQ6IHN0cmluZywgcGF5bG9hZDogdW5rbm93bltdKSA9PiB7XG4gICAgY29uc29sZS5sb2coYFtMRVNdIGJyb2FkY2FzdCBcIiR7ZXZlbnR9XCJgLCBwYXlsb2FkLmxlbmd0aCA/IHBheWxvYWQgOiAnJylcbiAgICBjb25zdCByb290ID0gaG9zdC5nZXRSb290Tm9kZSgpXG4gICAgY29uc3QgdGFyZ2V0ID0gcm9vdCBpbnN0YW5jZW9mIERvY3VtZW50ID8gcm9vdCA6IChyb290IGFzIFNoYWRvd1Jvb3QpLm93bmVyRG9jdW1lbnQgPz8gZG9jdW1lbnRcbiAgICBjb25zdCB0cmlnZ2VyID0gX2N1cnJlbnRIYW5kbGVyRXZlbnQuZ2V0KGhvc3QpID8/IG51bGxcbiAgICB0YXJnZXQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoZXZlbnQsIHtcbiAgICAgIGRldGFpbDogeyBwYXlsb2FkLCBfX2Jyb2FkY2FzdE9yaWdpbjogaG9zdCwgX19icm9hZGNhc3RUcmlnZ2VyOiB0cmlnZ2VyIH0sXG4gICAgICBidWJibGVzOiBmYWxzZSxcbiAgICAgIGNvbXBvc2VkOiBmYWxzZSxcbiAgICB9KSlcbiAgfVxuXG4gIC8vIFdhbGsgdXAgdGhlIF9sZXNQYXJlbnQgY2hhaW4sIGRpc3BhdGNoaW5nIG9uIGVhY2ggYW5jZXN0b3IncyBob3N0IGVsZW1lbnQuXG4gIC8vIEV2ZXJ5IGFuY2VzdG9yIHdpdGggYW4gb24tZXZlbnQgaGFuZGxlciBmb3IgdGhpcyBldmVudCB3aWxsIGZpcmUgaXQuXG4gIC8vIFByb3BhZ2F0aW9uIGFsd2F5cyByZWFjaGVzIHJvb3QgXHUyMDE0IG5vIGltcGxpY2l0IHN0b3BwaW5nLlxuICAvL1xuICAvLyBhdXRvLXJlbGF5OiBpZiBhbiBhbmNlc3RvciBoYXMgdGhlIGBhdXRvLXJlbGF5YCBhdHRyaWJ1dGUsIHRoZSBidWJibGUgaXNcbiAgLy8gQUxTTyByZS1icm9hZGNhc3Qgb24gZG9jdW1lbnQgc28gSlMgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciBsaXN0ZW5lcnNcbiAgLy8gKGFuZCBMRVMgaW5zdGFuY2VzIG91dHNpZGUgdGhpcyB0cmVlKSByZWNlaXZlIGl0IFx1MjAxNCB3aXRob3V0IG5lZWRpbmcgZXhwbGljaXRcbiAgLy8gcmVsYXkgb24tZXZlbnQgaGFuZGxlcnMgaW4gdGhlIGFuY2VzdG9yJ3MgTEVTIGNvbmZpZy5cbiAgY29uc3QgYnViYmxlID0gKGV2ZW50OiBzdHJpbmcsIHBheWxvYWQ6IHVua25vd25bXSkgPT4ge1xuICAgIGNvbnNvbGUubG9nKGBbTEVTXSBidWJibGUgXCIke2V2ZW50fVwiYCwgcGF5bG9hZC5sZW5ndGggPyBwYXlsb2FkIDogJycpXG4gICAgY29uc3QgZG9jUm9vdCA9IGhvc3QuZ2V0Um9vdE5vZGUoKVxuICAgIGNvbnN0IGRvYyA9IGRvY1Jvb3QgaW5zdGFuY2VvZiBEb2N1bWVudCA/IGRvY1Jvb3QgOiAoZG9jUm9vdCBhcyBTaGFkb3dSb290KS5vd25lckRvY3VtZW50ID8/IGRvY3VtZW50XG4gICAgbGV0IGN1cnJlbnQgPSAoaG9zdCBhcyBhbnkpLl9sZXNQYXJlbnQgYXMgRWxlbWVudCB8IG51bGxcbiAgICB3aGlsZSAoY3VycmVudCkge1xuICAgICAgLy8gRGlzcGF0Y2ggb24gYW5jZXN0b3IgXHUyMDE0IGFuY2VzdG9yJ3MgaG9zdExpc3RlbmVyKHMpIGZpcmUgZm9yIHRoaXMgZXZlbnRcbiAgICAgIGN1cnJlbnQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoZXZlbnQsIHtcbiAgICAgICAgZGV0YWlsOiB7IHBheWxvYWQsIF9fYnViYmxlT3JpZ2luOiBob3N0IH0sXG4gICAgICAgIGJ1YmJsZXM6IGZhbHNlLFxuICAgICAgICBjb21wb3NlZDogZmFsc2UsXG4gICAgICB9KSlcbiAgICAgIC8vIElmIHRoaXMgYW5jZXN0b3IgaGFzIHRoZSBhdXRvLXJlbGF5IGF0dHJpYnV0ZSwgcmUtYnJvYWRjYXN0IGdsb2JhbGx5LlxuICAgICAgLy8gX19hdXRvUmVsYXlPcmlnaW4gc3RhbXBzIHRoZSBldmVudCBzbyB0aGUgYW5jZXN0b3IncyBvd24gZG9jTGlzdGVuZXJcbiAgICAgIC8vIHNraXBzIGl0ICh0aGUgaG9zdExpc3RlbmVyIGFscmVhZHkgZmlyZWQgYWJvdmUgXHUyMDE0IG5vIGRvdWJsZS1oYW5kbGluZykuXG4gICAgICBpZiAoKGN1cnJlbnQgYXMgSFRNTEVsZW1lbnQpLmhhc0F0dHJpYnV0ZSgnYXV0by1yZWxheScpKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSBhdXRvLXJlbGF5IFwiJHtldmVudH1cIiB2aWEgIyR7KGN1cnJlbnQgYXMgRWxlbWVudCkuaWQgfHwgJyhubyBpZCknfWApXG4gICAgICAgIGRvYy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudChldmVudCwge1xuICAgICAgICAgIGRldGFpbDogeyBwYXlsb2FkLCBfX2J1YmJsZU9yaWdpbjogaG9zdCwgX19hdXRvUmVsYXlPcmlnaW46IGN1cnJlbnQgfSxcbiAgICAgICAgICBidWJibGVzOiBmYWxzZSxcbiAgICAgICAgICBjb21wb3NlZDogZmFsc2UsXG4gICAgICAgIH0pKVxuICAgICAgfVxuICAgICAgY3VycmVudCA9IChjdXJyZW50IGFzIGFueSkuX2xlc1BhcmVudCBhcyBFbGVtZW50IHwgbnVsbFxuICAgIH1cbiAgfVxuXG4gIC8vIFdhbGsgYWxsIHJlZ2lzdGVyZWQgTEVTIGRlc2NlbmRhbnRzIGRlcHRoLWZpcnN0LCBkaXNwYXRjaGluZyBvbiBlYWNoLlxuICBjb25zdCBjYXNjYWRlID0gKGV2ZW50OiBzdHJpbmcsIHBheWxvYWQ6IHVua25vd25bXSkgPT4ge1xuICAgIGNvbnNvbGUubG9nKGBbTEVTXSBjYXNjYWRlIFwiJHtldmVudH1cImAsIHBheWxvYWQubGVuZ3RoID8gcGF5bG9hZCA6ICcnKVxuICAgIGNvbnN0IHZpc2l0ID0gKGVsOiBhbnkpID0+IHtcbiAgICAgIGNvbnN0IGNoaWxkcmVuOiBTZXQ8RWxlbWVudD4gPSBlbC5fbGVzQ2hpbGRyZW4gPz8gbmV3IFNldCgpXG4gICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGNoaWxkcmVuKSB7XG4gICAgICAgIGNoaWxkLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KGV2ZW50LCB7XG4gICAgICAgICAgZGV0YWlsOiB7IHBheWxvYWQsIF9fY2FzY2FkZU9yaWdpbjogaG9zdCB9LFxuICAgICAgICAgIGJ1YmJsZXM6IGZhbHNlLFxuICAgICAgICAgIGNvbXBvc2VkOiBmYWxzZSxcbiAgICAgICAgfSkpXG4gICAgICAgIHZpc2l0KGNoaWxkKVxuICAgICAgfVxuICAgIH1cbiAgICB2aXNpdChob3N0KVxuICB9XG5cbiAgLy8gTG9va3MgdXAgYSBuYW1lZCBmdW5jdGlvbiBpbiB0aGUgZ2xvYmFsIExFU0JyaWRnZSByZWdpc3RyeSBhbmQgY2FsbHMgaXQuXG4gIGNvbnN0IGZvcndhcmQgPSBhc3luYyAobmFtZTogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHtcbiAgICBjb25zdCByZWdpc3RyeSA9IChnbG9iYWxUaGlzIGFzIGFueSkuTEVTQnJpZGdlIGFzIE1hcDxzdHJpbmcsICguLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd24+IHwgdW5kZWZpbmVkXG4gICAgaWYgKCFyZWdpc3RyeSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTXSBmb3J3YXJkIFwiJHtuYW1lfVwiOiBMRVNCcmlkZ2Ugbm90IGluaXRpYWxpemVkLiBBZGQgPHVzZS1tb2R1bGUgdHlwZT1cImJyaWRnZVwiPiBvciBzZXQgd2luZG93LkxFU0JyaWRnZSBiZWZvcmUgTEVTIGluaXQuYClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25zdCBmbiA9IHJlZ2lzdHJ5LmdldChuYW1lKVxuICAgIGlmICghZm4pIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFU10gZm9yd2FyZCBcIiR7bmFtZX1cIjogbm8gYnJpZGdlIHJlZ2lzdGVyZWQuIEF2YWlsYWJsZTogWyR7Wy4uLnJlZ2lzdHJ5LmtleXMoKV0uam9pbignLCAnKX1dYClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBjb25zb2xlLmxvZyhgW0xFU10gZm9yd2FyZCBcIiR7bmFtZX1cImAsIHBheWxvYWQubGVuZ3RoID8gcGF5bG9hZCA6ICcnKVxuICAgIGNvbnN0IHJlc3VsdCA9IGZuKC4uLnBheWxvYWQpXG4gICAgaWYgKHJlc3VsdCBpbnN0YW5jZW9mIFByb21pc2UpIGF3YWl0IHJlc3VsdFxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzY29wZSxcbiAgICBob3N0LFxuICAgIGNvbW1hbmRzLFxuICAgIG1vZHVsZXMsXG4gICAgZ2V0U2lnbmFsOiBzaWduYWxzLmdldCxcbiAgICBzZXRTaWduYWw6IHNpZ25hbHMuc2V0LFxuICAgIGVtaXRMb2NhbCxcbiAgICBicm9hZGNhc3QsXG4gICAgYnViYmxlLFxuICAgIGNhc2NhZGUsXG4gICAgZm9yd2FyZCxcbiAgfVxufVxuXG4vLyBUcmFja3Mgd2hpY2ggZXZlbnQgbmFtZSBpcyBjdXJyZW50bHkgYmVpbmcgaGFuZGxlZCBwZXIgaG9zdCBlbGVtZW50LlxuLy8gVXNlZCB0byBzdGFtcCBicm9hZGNhc3RzIHNvIGRvY0xpc3RlbmVycyBjYW4gZGV0ZWN0IHNhbWUtZXZlbnQgcmVsYXkgbG9vcHMuXG4vLyBKUyBpcyBzaW5nbGUtdGhyZWFkZWQ6IHNhZmUgdG8gc2V0IHN5bmNocm9ub3VzbHkgYmVmb3JlIGV4ZWN1dGUoKSwgcmVhZCBpbiBicm9hZGNhc3QoKS5cbmNvbnN0IF9jdXJyZW50SGFuZGxlckV2ZW50ID0gbmV3IFdlYWtNYXA8RWxlbWVudCwgc3RyaW5nPigpXG5cbi8qKlxuICogQ2FsbGVkIG9uY2UgZHVyaW5nIF9pbml0LCBiZWZvcmUgYW55IGV2ZW50cyBhcmUgd2lyZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3RlckNvbW1hbmRzKFxuICB3aXJpbmc6IFBhcnNlZFdpcmluZyxcbiAgcmVnaXN0cnk6IENvbW1hbmRSZWdpc3RyeVxuKTogdm9pZCB7XG4gIGZvciAoY29uc3QgY21kIG9mIHdpcmluZy5jb21tYW5kcykge1xuICAgIC8vIFBhcnNlIGFyZ3NSYXcgaW50byBBcmdEZWZbXSAoc2ltcGxpZmllZCBcdTIwMTQgZnVsbCBhcmcgcGFyc2luZyBpbiBQaGFzZSAyIHJlZmluZW1lbnQpXG4gICAgY29uc3QgYXJncyA9IHBhcnNlQXJnc1JhdyhjbWQuYXJnc1JhdylcbiAgICBjb25zdCBkZWY6IGltcG9ydCgnLi9yZWdpc3RyeS5qcycpLkNvbW1hbmREZWYgPSB7XG4gICAgICBuYW1lOiBjbWQubmFtZSxcbiAgICAgIGFyZ3MsXG4gICAgICBib2R5OiBjbWQuYm9keSxcbiAgICAgIGVsZW1lbnQ6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2xvY2FsLWNvbW1hbmQnKSxcbiAgICB9XG4gICAgaWYgKGNtZC5ndWFyZCkgZGVmLmd1YXJkID0gY21kLmd1YXJkXG4gICAgcmVnaXN0cnkucmVnaXN0ZXIoZGVmKVxuICB9XG4gIGNvbnNvbGUubG9nKGBbTEVTXSByZWdpc3RlcmVkICR7d2lyaW5nLmNvbW1hbmRzLmxlbmd0aH0gY29tbWFuZHNgKVxufVxuXG4vKipcbiAqIEF0dGFjaGVzIGV2ZW50IGxpc3RlbmVycyBvbiBCT1RIIHRoZSBob3N0IEFORCBkb2N1bWVudCBmb3IgYWxsIDxvbi1ldmVudD4gaGFuZGxlcnMuXG4gKlxuICogZW1pdCAgICAgIFx1MjE5MiBkaXNwYXRjaGVkIG9uIGhvc3QsIGJ1YmJsZXM6ZmFsc2UgICAgIFx1MjE5MiBob3N0IGxpc3RlbmVyIGZpcmVzIG9ubHlcbiAqIGJyb2FkY2FzdCBcdTIxOTIgZGlzcGF0Y2hlZCBvbiBkb2N1bWVudCwgYnViYmxlczpmYWxzZSBcdTIxOTIgZG9jIGxpc3RlbmVyIGZpcmVzIG9ubHlcbiAqXG4gKiBMb29wIHByZXZlbnRpb24gZm9yIHNhbWUtZXZlbnQgcmVsYXkgKGBvbi1ldmVudCBYIFx1MjE5MiBicm9hZGNhc3QgWGApOlxuICogICBCZWZvcmUgZXhlY3V0ZSgpLCB3ZSBzdGFtcCBfY3VycmVudEhhbmRsZXJFdmVudFtob3N0XSA9IGhhbmRsZXIuZXZlbnQuXG4gKiAgIGJyb2FkY2FzdCgpIHJlYWRzIHRoaXMgYW5kIHN0YW1wcyBfX2Jyb2FkY2FzdFRyaWdnZXIgb24gdGhlIEN1c3RvbUV2ZW50LlxuICogICBkb2NMaXN0ZW5lciBza2lwcyBpZjogb3JpZ2luPT09aG9zdCBBTkQgdHJpZ2dlcj09PXRoaXMgaGFuZGxlcidzIGV2ZW50LlxuICogICBUaGlzIHByZXZlbnRzOiBob3N0IGhhbmRsZXMgWCBcdTIxOTIgYnJvYWRjYXN0cyBYIFx1MjE5MiBkb2NMaXN0ZW5lciBoYW5kbGVzIFggXHUyMTkyIGxvb3AuXG4gKlxuICogQ3Jvc3MtZXZlbnQgZGVsaXZlcnkgKGBvbi1ldmVudCBBIFx1MjE5MiBicm9hZGNhc3QgQmAsIEFcdTIyNjBCKSBpcyBOT1QgYmxvY2tlZDpcbiAqICAgI3BhZ2UtY29udHJvbGxlciBoYW5kbGVzIGFuYWx5c2lzOmNvbXB1dGVkIFx1MjE5MiBicm9hZGNhc3RzIHBhZ2U6ZGF0YS1yZWFkeS5cbiAqICAgSXRzIG93biBkb2NMaXN0ZW5lciBmb3IgcGFnZTpkYXRhLXJlYWR5IHNlZXMgdHJpZ2dlcj1hbmFseXNpczpjb21wdXRlZCBcdTIyNjAgcGFnZTpkYXRhLXJlYWR5IFx1MjE5MiBGSVJFUyBcdTI3MTNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpcmVFdmVudEhhbmRsZXJzKFxuICB3aXJpbmc6IFBhcnNlZFdpcmluZyxcbiAgaG9zdDogRWxlbWVudCxcbiAgZ2V0Q3R4OiAoKSA9PiBpbXBvcnQoJy4vZXhlY3V0b3IuanMnKS5MRVNDb250ZXh0XG4pOiAoKSA9PiB2b2lkIHtcbiAgY29uc3QgY2xlYW51cHM6IEFycmF5PCgpID0+IHZvaWQ+ID0gW11cblxuICBjb25zdCBkb2M6IERvY3VtZW50ID1cbiAgICBob3N0LmdldFJvb3ROb2RlKCkgaW5zdGFuY2VvZiBEb2N1bWVudFxuICAgICAgPyAoaG9zdC5nZXRSb290Tm9kZSgpIGFzIERvY3VtZW50KVxuICAgICAgOiAoaG9zdCBhcyBFbGVtZW50KS5vd25lckRvY3VtZW50ID8/IGRvY3VtZW50XG5cbiAgZm9yIChjb25zdCBoYW5kbGVyIG9mIHdpcmluZy5oYW5kbGVycykge1xuICAgIGNvbnN0IHJ1biA9IChlOiBFdmVudCkgPT4ge1xuICAgICAgX2N1cnJlbnRIYW5kbGVyRXZlbnQuc2V0KGhvc3QsIGhhbmRsZXIuZXZlbnQpXG4gICAgICBjb25zdCBjdHggPSBnZXRDdHgoKVxuICAgICAgY29uc3QgaGFuZGxlclNjb3BlID0gY3R4LnNjb3BlLmNoaWxkKClcbiAgICAgIGNvbnN0IGRldGFpbCA9IChlIGFzIEN1c3RvbUV2ZW50KS5kZXRhaWwgPz8ge31cbiAgICAgIGhhbmRsZXJTY29wZS5zZXQoJ2V2ZW50JywgZSlcbiAgICAgIGhhbmRsZXJTY29wZS5zZXQoJ3BheWxvYWQnLCBkZXRhaWwucGF5bG9hZCA/PyBbXSlcbiAgICAgIGV4ZWN1dGUoaGFuZGxlci5ib2R5LCB7IC4uLmN0eCwgc2NvcGU6IGhhbmRsZXJTY29wZSB9KS5jYXRjaChlcnIgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbTEVTXSBFcnJvciBpbiBoYW5kbGVyIGZvciBcIiR7aGFuZGxlci5ldmVudH1cIjpgLCBlcnIpXG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vIEhvc3QgbGlzdGVuZXIgXHUyMTkyIGVtaXQgcGF0aFxuICAgIGNvbnN0IGhvc3RMaXN0ZW5lciA9IChlOiBFdmVudCkgPT4gcnVuKGUpXG5cbiAgICAvLyBEb2MgbGlzdGVuZXIgXHUyMTkyIGJyb2FkY2FzdCBwYXRoOyBza2lwIHNhbWUtZXZlbnQgcmVsYXkgbG9vcHMgb25seVxuICAgIGNvbnN0IGRvY0xpc3RlbmVyID0gKGU6IEV2ZW50KSA9PiB7XG4gICAgICBjb25zdCBkZXRhaWwgPSAoZSBhcyBDdXN0b21FdmVudCkuZGV0YWlsID8/IHt9XG4gICAgICBjb25zdCBzYW1lT3JpZ2luICA9IGRldGFpbC5fX2Jyb2FkY2FzdE9yaWdpbiA9PT0gaG9zdFxuICAgICAgY29uc3Qgc2FtZVRyaWdnZXIgPSBkZXRhaWwuX19icm9hZGNhc3RUcmlnZ2VyID09PSBoYW5kbGVyLmV2ZW50XG4gICAgICAvLyBPbmx5IHNraXAgaWYgdGhpcyBob3N0IHJlYnJvYWRjYXN0cyB0aGUgZXhhY3QgZXZlbnQgaXQncyBoYW5kbGluZyAocmVsYXkgbG9vcClcbiAgICAgIGlmIChzYW1lT3JpZ2luICYmIHNhbWVUcmlnZ2VyKSByZXR1cm5cbiAgICAgIC8vIFNraXAgYXV0by1yZWxheSBldmVudHMgdGhhdCB0aGlzIGVsZW1lbnQgaXRzZWxmIHJlLWJyb2FkY2FzdC5cbiAgICAgIC8vIFRoZSBob3N0TGlzdGVuZXIgYWxyZWFkeSBmaXJlZCB3aGVuIHRoZSBidWJibGUgaGl0IHRoaXMgZWxlbWVudCBkaXJlY3RseS5cbiAgICAgIGlmIChkZXRhaWwuX19hdXRvUmVsYXlPcmlnaW4gPT09IGhvc3QpIHJldHVyblxuICAgICAgcnVuKGUpXG4gICAgfVxuXG4gICAgaG9zdC5hZGRFdmVudExpc3RlbmVyKGhhbmRsZXIuZXZlbnQsIGhvc3RMaXN0ZW5lcilcbiAgICBkb2MuYWRkRXZlbnRMaXN0ZW5lcihoYW5kbGVyLmV2ZW50LCBkb2NMaXN0ZW5lcilcbiAgICBjbGVhbnVwcy5wdXNoKCgpID0+IHtcbiAgICAgIGhvc3QucmVtb3ZlRXZlbnRMaXN0ZW5lcihoYW5kbGVyLmV2ZW50LCBob3N0TGlzdGVuZXIpXG4gICAgICBkb2MucmVtb3ZlRXZlbnRMaXN0ZW5lcihoYW5kbGVyLmV2ZW50LCBkb2NMaXN0ZW5lcilcbiAgICB9KVxuICAgIGNvbnNvbGUubG9nKGBbTEVTXSB3aXJlZCBldmVudCBoYW5kbGVyOiBcIiR7aGFuZGxlci5ldmVudH1cImApXG4gIH1cblxuICByZXR1cm4gKCkgPT4gY2xlYW51cHMuZm9yRWFjaChmbiA9PiBmbigpKVxufVxuXG4vKipcbiAqIEZpcmVzIGFsbCA8b24tbG9hZD4gYm9kaWVzLlxuICogQ2FsbGVkIGFmdGVyIGNvbW1hbmRzIGFyZSByZWdpc3RlcmVkIGFuZCBldmVudCBoYW5kbGVycyBhcmUgd2lyZWQsXG4gKiBzbyBlbWl0L2NhbGwgc3RhdGVtZW50cyBpbiBvbi1sb2FkIGNhbiByZWFjaCB0aGVpciB0YXJnZXRzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmlyZU9uTG9hZChcbiAgd2lyaW5nOiBQYXJzZWRXaXJpbmcsXG4gIGdldEN0eDogKCkgPT4gaW1wb3J0KCcuL2V4ZWN1dG9yLmpzJykuTEVTQ29udGV4dFxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGZvciAoY29uc3QgYm9keSBvZiB3aXJpbmcubGlmZWN5Y2xlLm9uTG9hZCkge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBleGVjdXRlKGJvZHksIGdldEN0eCgpKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcignW0xFU10gRXJyb3IgaW4gb24tbG9hZDonLCBlcnIpXG4gICAgfVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gQXJnIHBhcnNpbmcgKHNpbXBsaWZpZWQgXHUyMDE0IGZ1bGwgdHlwZS1jaGVja2VkIHZlcnNpb24gaW4gUGhhc2UgMiByZWZpbmVtZW50KVxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmltcG9ydCB0eXBlIHsgQXJnRGVmIH0gZnJvbSAnLi9yZWdpc3RyeS5qcydcbmltcG9ydCB0eXBlIHsgRXhwck5vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuZnVuY3Rpb24gcGFyc2VBcmdzUmF3KHJhdzogc3RyaW5nKTogQXJnRGVmW10ge1xuICBpZiAoIXJhdy50cmltKCkpIHJldHVybiBbXVxuICAvLyBTdHJpcCBvdXRlciBicmFja2V0czogXCJbZnJvbTpzdHIgIHRvOnN0ciAgYXR0ZW1wdDppbnQ9MF1cIiBcdTIxOTIgXCJmcm9tOnN0ciAgdG86c3RyICBhdHRlbXB0OmludD0wXCJcbiAgY29uc3QgaW5uZXIgPSByYXcucmVwbGFjZSgvXlxcW3xcXF0kL2csICcnKS50cmltKClcbiAgaWYgKCFpbm5lcikgcmV0dXJuIFtdXG5cbiAgcmV0dXJuIGlubmVyLnNwbGl0KC9cXHN7Mix9fFxccyg/PVxcdys6KS8pLm1hcChzID0+IHMudHJpbSgpKS5maWx0ZXIoQm9vbGVhbikubWFwKHBhcnQgPT4ge1xuICAgIC8vIGBuYW1lOnR5cGU9ZGVmYXVsdGAgb3IgYG5hbWU6dHlwZWBcbiAgICBjb25zdCBlcUlkeCA9IHBhcnQuaW5kZXhPZignPScpXG4gICAgY29uc3QgY29sb25JZHggPSBwYXJ0LmluZGV4T2YoJzonKVxuICAgIGlmIChjb2xvbklkeCA9PT0gLTEpIHJldHVybiB7IG5hbWU6IHBhcnQsIHR5cGU6ICdkeW4nIH1cblxuICAgIGNvbnN0IG5hbWUgPSBwYXJ0LnNsaWNlKDAsIGNvbG9uSWR4KS50cmltKClcbiAgICBjb25zdCByZXN0ID0gcGFydC5zbGljZShjb2xvbklkeCArIDEpXG5cbiAgICBpZiAoZXFJZHggPT09IC0xKSB7XG4gICAgICByZXR1cm4geyBuYW1lLCB0eXBlOiByZXN0LnRyaW0oKSB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHR5cGUgPSBwYXJ0LnNsaWNlKGNvbG9uSWR4ICsgMSwgZXFJZHgpLnRyaW0oKVxuICAgICAgY29uc3QgZGVmYXVsdFJhdyA9IHBhcnQuc2xpY2UoZXFJZHggKyAxKS50cmltKClcbiAgICAgIGNvbnN0IGRlZmF1bHRFeHByOiBFeHByTm9kZSA9IHsgdHlwZTogJ2V4cHInLCByYXc6IGRlZmF1bHRSYXcgfVxuICAgICAgcmV0dXJuIHsgbmFtZSwgdHlwZSwgZGVmYXVsdDogZGVmYXVsdEV4cHIgfVxuICAgIH1cbiAgfSlcbn1cbiIsICIvKipcbiAqIExFU1Njb3BlIFx1MjAxNCBhIHNpbXBsZSBsZXhpY2FsbHktc2NvcGVkIHZhcmlhYmxlIHN0b3JlLlxuICpcbiAqIEVhY2ggY29tbWFuZCBpbnZvY2F0aW9uIGdldHMgYSBmcmVzaCBjaGlsZCBzY29wZS5cbiAqIE1hdGNoIGFybSBiaW5kaW5ncyBhbHNvIGNyZWF0ZSBhIGNoaWxkIHNjb3BlIGxpbWl0ZWQgdG8gdGhhdCBhcm0ncyBib2R5LlxuICogU2lnbmFsIHJlYWRzL3dyaXRlcyBnbyB0aHJvdWdoIHRoZSBEYXRhc3RhciBicmlkZ2UsIG5vdCB0aGlzIHNjb3BlLlxuICovXG5leHBvcnQgY2xhc3MgTEVTU2NvcGUge1xuICBwcml2YXRlIGxvY2FscyA9IG5ldyBNYXA8c3RyaW5nLCB1bmtub3duPigpXG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwYXJlbnQ/OiBMRVNTY29wZSkge31cblxuICBnZXQobmFtZTogc3RyaW5nKTogdW5rbm93biB7XG4gICAgaWYgKHRoaXMubG9jYWxzLmhhcyhuYW1lKSkgcmV0dXJuIHRoaXMubG9jYWxzLmdldChuYW1lKVxuICAgIHJldHVybiB0aGlzLnBhcmVudD8uZ2V0KG5hbWUpXG4gIH1cblxuICBzZXQobmFtZTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIHRoaXMubG9jYWxzLnNldChuYW1lLCB2YWx1ZSlcbiAgfVxuXG4gIGhhcyhuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5sb2NhbHMuaGFzKG5hbWUpIHx8ICh0aGlzLnBhcmVudD8uaGFzKG5hbWUpID8/IGZhbHNlKVxuICB9XG5cbiAgLyoqIENyZWF0ZSBhIGNoaWxkIHNjb3BlIGluaGVyaXRpbmcgYWxsIGxvY2FscyBmcm9tIHRoaXMgb25lLiAqL1xuICBjaGlsZCgpOiBMRVNTY29wZSB7XG4gICAgcmV0dXJuIG5ldyBMRVNTY29wZSh0aGlzKVxuICB9XG5cbiAgLyoqIFNuYXBzaG90IGFsbCBsb2NhbHMgKGZvciBkZWJ1Z2dpbmcgLyBlcnJvciBtZXNzYWdlcykuICovXG4gIHNuYXBzaG90KCk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcbiAgICBjb25zdCBiYXNlID0gdGhpcy5wYXJlbnQ/LnNuYXBzaG90KCkgPz8ge31cbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiB0aGlzLmxvY2FscykgYmFzZVtrXSA9IHZcbiAgICByZXR1cm4gYmFzZVxuICB9XG59XG4iLCAiLyoqXG4gKiBQaGFzZSA1YTogSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgd2lyaW5nXG4gKlxuICogT25lIHNoYXJlZCBJbnRlcnNlY3Rpb25PYnNlcnZlciBpcyBjcmVhdGVkIHBlciA8bG9jYWwtZXZlbnQtc2NyaXB0PiBob3N0LlxuICogSXQgd2F0Y2hlcyB0aGUgaG9zdCBlbGVtZW50IGl0c2VsZiAobm90IGl0cyBjaGlsZHJlbikuXG4gKlxuICogb24tZW50ZXI6IGZpcmVzIHdoZW4gdGhlIGhvc3QgY3Jvc3NlcyBpbnRvIHRoZSB2aWV3cG9ydFxuICogICAtIEVhY2ggPG9uLWVudGVyPiBoYXMgYW4gb3B0aW9uYWwgYHdoZW5gIGd1YXJkIGV2YWx1YXRlZCBhdCBmaXJlIHRpbWVcbiAqICAgLSBNdWx0aXBsZSA8b24tZW50ZXI+IGNoaWxkcmVuIGFyZSBhbGwgY2hlY2tlZCBpbiBkZWNsYXJhdGlvbiBvcmRlclxuICpcbiAqIG9uLWV4aXQ6IGZpcmVzIHdoZW4gdGhlIGhvc3QgbGVhdmVzIHRoZSB2aWV3cG9ydFxuICogICAtIEFsd2F5cyBmaXJlcyB1bmNvbmRpdGlvbmFsbHkgKG5vIGB3aGVuYCBndWFyZCBvbiBvbi1leGl0KVxuICogICAtIE11bHRpcGxlIDxvbi1leGl0PiBjaGlsZHJlbiBhbGwgZmlyZVxuICpcbiAqIFRoZSBvYnNlcnZlciBpcyBkaXNjb25uZWN0ZWQgaW4gZGlzY29ubmVjdGVkQ2FsbGJhY2sgdmlhIHRoZSByZXR1cm5lZCBjbGVhbnVwIGZuLlxuICovXG5cbmltcG9ydCB7IGV4ZWN1dGUsIGV2YWxFeHByIH0gZnJvbSAnLi9leGVjdXRvci5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29udGV4dCB9IGZyb20gJy4vZXhlY3V0b3IuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuZXhwb3J0IGludGVyZmFjZSBPbkVudGVyRGVjbCB7XG4gIHdoZW46IHN0cmluZyB8IG51bGxcbiAgYm9keTogTEVTTm9kZVxufVxuXG4vKipcbiAqIEF0dGFjaGVzIGFuIEludGVyc2VjdGlvbk9ic2VydmVyIHRvIHRoZSBob3N0IGVsZW1lbnQuXG4gKlxuICogQHJldHVybnMgQSBjbGVhbnVwIGZ1bmN0aW9uIHRoYXQgZGlzY29ubmVjdHMgdGhlIG9ic2VydmVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2lyZUludGVyc2VjdGlvbk9ic2VydmVyKFxuICBob3N0OiBFbGVtZW50LFxuICBvbkVudGVyOiBPbkVudGVyRGVjbFtdLFxuICBvbkV4aXQ6IExFU05vZGVbXSxcbiAgZ2V0Q3R4OiAoKSA9PiBMRVNDb250ZXh0LFxuKTogKCkgPT4gdm9pZCB7XG4gIGlmIChvbkVudGVyLmxlbmd0aCA9PT0gMCAmJiBvbkV4aXQubGVuZ3RoID09PSAwKSB7XG4gICAgLy8gTm90aGluZyB0byBvYnNlcnZlIFx1MjAxNCBza2lwIGNyZWF0aW5nIHRoZSBJTyBlbnRpcmVseVxuICAgIHJldHVybiAoKSA9PiB7fVxuICB9XG5cbiAgbGV0IHdhc0ludGVyc2VjdGluZzogYm9vbGVhbiB8IG51bGwgPSBudWxsXG5cbiAgY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIoXG4gICAgKGVudHJpZXMpID0+IHtcbiAgICAgIC8vIElPIGZpcmVzIG9uY2UgaW1tZWRpYXRlbHkgb24gYXR0YWNoIHdpdGggdGhlIGN1cnJlbnQgc3RhdGUuXG4gICAgICAvLyBXZSB0cmFjayBgd2FzSW50ZXJzZWN0aW5nYCB0byBhdm9pZCBzcHVyaW91cyBvbi1leGl0IG9uIGZpcnN0IHRpY2suXG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgICAgY29uc3Qgbm93SW50ZXJzZWN0aW5nID0gZW50cnkuaXNJbnRlcnNlY3RpbmdcblxuICAgICAgICBpZiAobm93SW50ZXJzZWN0aW5nICYmIHdhc0ludGVyc2VjdGluZyAhPT0gdHJ1ZSkge1xuICAgICAgICAgIC8vIEVudGVyZWQgdmlld3BvcnRcbiAgICAgICAgICB3YXNJbnRlcnNlY3RpbmcgPSB0cnVlXG4gICAgICAgICAgaGFuZGxlRW50ZXIob25FbnRlciwgZ2V0Q3R4KVxuICAgICAgICB9IGVsc2UgaWYgKCFub3dJbnRlcnNlY3RpbmcgJiYgd2FzSW50ZXJzZWN0aW5nID09PSB0cnVlKSB7XG4gICAgICAgICAgLy8gRXhpdGVkIHZpZXdwb3J0IChvbmx5IGFmdGVyIHdlJ3ZlIGJlZW4gaW4gaXQpXG4gICAgICAgICAgd2FzSW50ZXJzZWN0aW5nID0gZmFsc2VcbiAgICAgICAgICBoYW5kbGVFeGl0KG9uRXhpdCwgZ2V0Q3R4KVxuICAgICAgICB9IGVsc2UgaWYgKHdhc0ludGVyc2VjdGluZyA9PT0gbnVsbCkge1xuICAgICAgICAgIC8vIEZpcnN0IHRpY2sgXHUyMDE0IHJlY29yZCBzdGF0ZSBidXQgZG9uJ3QgZmlyZSBleGl0IGZvciBpbml0aWFsbHktb2ZmLXNjcmVlblxuICAgICAgICAgIHdhc0ludGVyc2VjdGluZyA9IG5vd0ludGVyc2VjdGluZ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAvLyBEZWZhdWx0IHRocmVzaG9sZDogZmlyZSB3aGVuIGFueSBwaXhlbCBvZiB0aGUgaG9zdCBlbnRlcnMvZXhpdHNcbiAgICAgIHRocmVzaG9sZDogMCxcbiAgICB9XG4gIClcblxuICBvYnNlcnZlci5vYnNlcnZlKGhvc3QpXG4gIGNvbnNvbGUubG9nKCdbTEVTXSBJbnRlcnNlY3Rpb25PYnNlcnZlciBhdHRhY2hlZCcsIChob3N0IGFzIEhUTUxFbGVtZW50KS5pZCB8fCBob3N0LnRhZ05hbWUpXG5cbiAgcmV0dXJuICgpID0+IHtcbiAgICBvYnNlcnZlci5kaXNjb25uZWN0KClcbiAgICBjb25zb2xlLmxvZygnW0xFU10gSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgZGlzY29ubmVjdGVkJylcbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVFbnRlcihkZWNsczogT25FbnRlckRlY2xbXSwgZ2V0Q3R4OiAoKSA9PiBMRVNDb250ZXh0KTogdm9pZCB7XG4gIGNvbnN0IGN0eCA9IGdldEN0eCgpXG5cbiAgZm9yIChjb25zdCBkZWNsIG9mIGRlY2xzKSB7XG4gICAgLy8gRXZhbHVhdGUgYHdoZW5gIGd1YXJkIFx1MjAxNCBpZiBhYnNlbnQsIGFsd2F5cyBmaXJlc1xuICAgIGlmIChkZWNsLndoZW4pIHtcbiAgICAgIGNvbnN0IHBhc3NlcyA9IEJvb2xlYW4oZXZhbEV4cHIoeyB0eXBlOiAnZXhwcicsIHJhdzogZGVjbC53aGVuIH0sIGN0eCkpXG4gICAgICBpZiAoIXBhc3Nlcykge1xuICAgICAgICBjb25zb2xlLmxvZyhgW0xFU10gb24tZW50ZXIgZ3VhcmQgcmVqZWN0ZWQ6ICR7ZGVjbC53aGVufWApXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgfVxuXG4gICAgZXhlY3V0ZShkZWNsLmJvZHksIGN0eCkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tMRVNdIEVycm9yIGluIG9uLWVudGVyOicsIGVycilcbiAgICB9KVxuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUV4aXQoYm9kaWVzOiBMRVNOb2RlW10sIGdldEN0eDogKCkgPT4gTEVTQ29udGV4dCk6IHZvaWQge1xuICBjb25zdCBjdHggPSBnZXRDdHgoKVxuXG4gIGZvciAoY29uc3QgYm9keSBvZiBib2RpZXMpIHtcbiAgICBleGVjdXRlKGJvZHksIGN0eCkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tMRVNdIEVycm9yIGluIG9uLWV4aXQ6JywgZXJyKVxuICAgIH0pXG4gIH1cbn1cbiIsICIvKipcbiAqIFBoYXNlIDViOiBTaWduYWwgd2F0Y2hlciB3aXJpbmdcbiAqXG4gKiA8b24tc2lnbmFsPiByZWFjdHMgd2hlbmV2ZXIgYSBuYW1lZCBEYXRhc3RhciBzaWduYWwgY2hhbmdlcy5cbiAqIFRoZSBgd2hlbmAgZ3VhcmQgaXMgcmUtZXZhbHVhdGVkIG9uIGV2ZXJ5IGNoYW5nZSBcdTIwMTQgaWYgZmFsc3ksIHRoZVxuICogaGFuZGxlIGJvZHkgZG9lcyBub3QgcnVuIChub3QgYW4gZXJyb3IsIGp1c3QgZmlsdGVyZWQgb3V0KS5cbiAqXG4gKiBJbiBQaGFzZSA1IHdlIHVzZSBhIHNpbXBsZSBsb2NhbCBub3RpZmljYXRpb24gcGF0aDogd2hlbmV2ZXJcbiAqIExvY2FsRXZlbnRTY3JpcHQuX3NldFNpZ25hbCgpIHdyaXRlcyBhIHZhbHVlLCBpdCBjYWxscyBpbnRvXG4gKiBub3RpZnlTaWduYWxXYXRjaGVycygpLiBUaGlzIGhhbmRsZXMgdGhlIGZhbGxiYWNrIChubyBEYXRhc3RhcikgY2FzZS5cbiAqXG4gKiBQaGFzZSA2IHJlcGxhY2VzIHRoZSBub3RpZmljYXRpb24gcGF0aCB3aXRoIERhdGFzdGFyJ3MgZWZmZWN0KCkgc3lzdGVtLFxuICogd2hpY2ggaXMgbW9yZSBlZmZpY2llbnQgKGJhdGNoZWQsIGRlZHVwZWQsIHJlYWN0aXZlIGdyYXBoLWF3YXJlKS5cbiAqXG4gKiBUaGUgd2F0Y2hlciBmaXJlcyB0aGUgYm9keSBhc3luY2hyb25vdXNseSAobm9uLWJsb2NraW5nKSB0byBtYXRjaFxuICogdGhlIGJlaGF2aW91ciBvZiBEYXRhc3RhcidzIHJlYWN0aXZlIGVmZmVjdHMuXG4gKi9cblxuaW1wb3J0IHsgZXhlY3V0ZSwgZXZhbEV4cHIgfSBmcm9tICcuL2V4ZWN1dG9yLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNDb250ZXh0IH0gZnJvbSAnLi9leGVjdXRvci5qcydcbmltcG9ydCB0eXBlIHsgTEVTTm9kZSB9IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIFNpZ25hbFdhdGNoZXJEZWNsIHtcbiAgLyoqIFNpZ25hbCBuYW1lIHdpdGggJCBwcmVmaXg6IFwiJGZlZWRTdGF0ZVwiICovXG4gIHNpZ25hbDogc3RyaW5nXG4gIC8qKiBPcHRpb25hbCBndWFyZCBleHByZXNzaW9uIFx1MjAxNCBudWxsIG1lYW5zIGFsd2F5cyBmaXJlcyAqL1xuICB3aGVuOiBzdHJpbmcgfCBudWxsXG4gIGJvZHk6IExFU05vZGVcbn1cblxuLyoqXG4gKiBDaGVja3MgYWxsIHNpZ25hbCB3YXRjaGVycyB0byBzZWUgaWYgYW55IHNob3VsZCBmaXJlIGZvciB0aGVcbiAqIGdpdmVuIHNpZ25hbCBuYW1lIGNoYW5nZS5cbiAqXG4gKiBDYWxsZWQgZnJvbSBMb2NhbEV2ZW50U2NyaXB0Ll9zZXRTaWduYWwoKSBhZnRlciBldmVyeSB3cml0ZS5cbiAqIEFsc28gY2FsbGVkIGZyb20gUGhhc2UgNiBEYXRhc3RhciBlZmZlY3QoKSBzdWJzY3JpcHRpb25zLlxuICpcbiAqIEBwYXJhbSBjaGFuZ2VkU2lnbmFsICBUaGUgc2lnbmFsIG5hbWUgKndpdGhvdXQqIHRoZSAkIHByZWZpeFxuICogQHBhcmFtIHdhdGNoZXJzICAgICAgIEFsbCBvbi1zaWduYWwgZGVjbGFyYXRpb25zIGZvciB0aGlzIExFUyBpbnN0YW5jZVxuICogQHBhcmFtIGdldEN0eCAgICAgICAgIFJldHVybnMgdGhlIGN1cnJlbnQgZXhlY3V0aW9uIGNvbnRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdGlmeVNpZ25hbFdhdGNoZXJzKFxuICBjaGFuZ2VkU2lnbmFsOiBzdHJpbmcsXG4gIHdhdGNoZXJzOiBTaWduYWxXYXRjaGVyRGVjbFtdLFxuICBnZXRDdHg6ICgpID0+IExFU0NvbnRleHRcbik6IHZvaWQge1xuICBmb3IgKGNvbnN0IHdhdGNoZXIgb2Ygd2F0Y2hlcnMpIHtcbiAgICAvLyBOb3JtYWxpemU6IHN0cmlwIGxlYWRpbmcgJCBmb3IgY29tcGFyaXNvblxuICAgIGNvbnN0IHdhdGNoZWRLZXkgPSB3YXRjaGVyLnNpZ25hbC5yZXBsYWNlKC9eXFwkLywgJycpXG5cbiAgICBpZiAod2F0Y2hlZEtleSAhPT0gY2hhbmdlZFNpZ25hbCkgY29udGludWVcblxuICAgIGNvbnN0IGN0eCA9IGdldEN0eCgpXG5cbiAgICAvLyBFdmFsdWF0ZSBgd2hlbmAgZ3VhcmRcbiAgICBpZiAod2F0Y2hlci53aGVuKSB7XG4gICAgICBjb25zdCBwYXNzZXMgPSBCb29sZWFuKGV2YWxFeHByKHsgdHlwZTogJ2V4cHInLCByYXc6IHdhdGNoZXIud2hlbiB9LCBjdHgpKVxuICAgICAgaWYgKCFwYXNzZXMpIGNvbnRpbnVlXG4gICAgfVxuXG4gICAgLy8gRmlyZSB0aGUgYm9keSBhc3luY2hyb25vdXNseSBcdTIwMTQgZG9uJ3QgYmxvY2sgdGhlIHNpZ25hbCB3cml0ZSBwYXRoXG4gICAgZXhlY3V0ZSh3YXRjaGVyLmJvZHksIGN0eCkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFtMRVNdIEVycm9yIGluIG9uLXNpZ25hbCBcIiR7d2F0Y2hlci5zaWduYWx9XCI6YCwgZXJyKVxuICAgIH0pXG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgRGF0YXN0YXItY29tcGF0aWJsZSBlZmZlY3Qgc3Vic2NyaXB0aW9uIGZvciBvbmUgc2lnbmFsIHdhdGNoZXIuXG4gKiBVc2VkIGluIFBoYXNlIDYgd2hlbiBEYXRhc3RhciBpcyBwcmVzZW50LlxuICpcbiAqIEBwYXJhbSB3YXRjaGVyICAgVGhlIG9uLXNpZ25hbCBkZWNsYXJhdGlvblxuICogQHBhcmFtIGVmZmVjdCAgICBEYXRhc3RhcidzIGVmZmVjdCgpIGZ1bmN0aW9uXG4gKiBAcGFyYW0gZ2V0Q3R4ICAgIFJldHVybnMgdGhlIGN1cnJlbnQgZXhlY3V0aW9uIGNvbnRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpcmVTaWduYWxXYXRjaGVyVmlhRGF0YXN0YXIoXG4gIHdhdGNoZXI6IFNpZ25hbFdhdGNoZXJEZWNsLFxuICBlZmZlY3Q6IChmbjogKCkgPT4gdm9pZCkgPT4gdm9pZCxcbiAgZ2V0Q3R4OiAoKSA9PiBMRVNDb250ZXh0XG4pOiB2b2lkIHtcbiAgZWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBjdHggPSBnZXRDdHgoKVxuXG4gICAgLy8gUmVhZGluZyB0aGUgc2lnbmFsIGluc2lkZSBhbiBlZmZlY3QoKSBhdXRvLXN1YnNjcmliZXMgdXMgdG8gaXRcbiAgICBjb25zdCBzaWduYWxLZXkgPSB3YXRjaGVyLnNpZ25hbC5yZXBsYWNlKC9eXFwkLywgJycpXG4gICAgY3R4LmdldFNpZ25hbChzaWduYWxLZXkpIC8vIHN1YnNjcmlwdGlvbiBzaWRlLWVmZmVjdFxuXG4gICAgaWYgKHdhdGNoZXIud2hlbikge1xuICAgICAgY29uc3QgcGFzc2VzID0gQm9vbGVhbihldmFsRXhwcih7IHR5cGU6ICdleHByJywgcmF3OiB3YXRjaGVyLndoZW4gfSwgY3R4KSlcbiAgICAgIGlmICghcGFzc2VzKSByZXR1cm5cbiAgICB9XG5cbiAgICBleGVjdXRlKHdhdGNoZXIuYm9keSwgY3R4KS5jYXRjaChlcnIgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcihgW0xFU10gRXJyb3IgaW4gb24tc2lnbmFsIFwiJHt3YXRjaGVyLnNpZ25hbH1cIiAoRGF0YXN0YXIpOmAsIGVycilcbiAgICB9KVxuICB9KVxufVxuIiwgImltcG9ydCB7IENvbW1hbmRSZWdpc3RyeSB9IGZyb20gJ0BydW50aW1lL3JlZ2lzdHJ5LmpzJ1xuaW1wb3J0IHsgTW9kdWxlUmVnaXN0cnksIGxvYWRNb2R1bGUgfSBmcm9tICdAbW9kdWxlcy90eXBlcy5qcydcbmltcG9ydCB7IHJlYWRDb25maWcsIGxvZ0NvbmZpZyB9IGZyb20gJ0BwYXJzZXIvcmVhZGVyLmpzJ1xuaW1wb3J0IHsgcGFyc2VMRVMgfSBmcm9tICdAcGFyc2VyL2luZGV4LmpzJ1xuaW1wb3J0IHsgYnVpbGRDb250ZXh0LCByZWdpc3RlckNvbW1hbmRzLCB3aXJlRXZlbnRIYW5kbGVycywgZmlyZU9uTG9hZCwgdHlwZSBQYXJzZWRXaXJpbmcgfSBmcm9tICdAcnVudGltZS93aXJpbmcuanMnXG5pbXBvcnQgeyB3aXJlSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgfSBmcm9tICdAcnVudGltZS9vYnNlcnZlci5qcydcbmltcG9ydCB7IG5vdGlmeVNpZ25hbFdhdGNoZXJzLCB3aXJlU2lnbmFsV2F0Y2hlclZpYURhdGFzdGFyIH0gZnJvbSAnQHJ1bnRpbWUvc2lnbmFscy5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29uZmlnIH0gZnJvbSAnQHBhcnNlci9jb25maWcuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29udGV4dCB9IGZyb20gJ0BydW50aW1lL2V4ZWN1dG9yLmpzJ1xuXG5leHBvcnQgY2xhc3MgTG9jYWxFdmVudFNjcmlwdCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgcmVhZG9ubHkgY29tbWFuZHMgPSBuZXcgQ29tbWFuZFJlZ2lzdHJ5KClcbiAgcmVhZG9ubHkgbW9kdWxlcyAgPSBuZXcgTW9kdWxlUmVnaXN0cnkoKVxuXG4gIHByaXZhdGUgX2NvbmZpZzogIExFU0NvbmZpZyB8IG51bGwgID0gbnVsbFxuICBwcml2YXRlIF93aXJpbmc6ICBQYXJzZWRXaXJpbmcgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIF9jdHg6ICAgICBMRVNDb250ZXh0IHwgbnVsbCA9IG51bGxcblxuICAvLyBDbGVhbnVwIGZucyBhY2N1bXVsYXRlZCBkdXJpbmcgX2luaXQgXHUyMDE0IGFsbCBjYWxsZWQgaW4gX3RlYXJkb3duXG4gIHByaXZhdGUgX2NsZWFudXBzOiBBcnJheTwoKSA9PiB2b2lkPiA9IFtdXG5cbiAgLy8gU2ltcGxlIGZhbGxiYWNrIHNpZ25hbCBzdG9yZSAoRGF0YXN0YXIgYnJpZGdlIHJlcGxhY2VzIHJlYWRzL3dyaXRlcyBpbiBQaGFzZSA2KVxuICBwcml2YXRlIF9zaWduYWxzOiBNYXA8c3RyaW5nLCB1bmtub3duPiA9IG5ldyBNYXAoKVxuXG4gIC8vIERhdGFzdGFyIGJyaWRnZSAocG9wdWxhdGVkIGluIFBoYXNlIDYgdmlhIGF0dHJpYnV0ZSBwbHVnaW4pXG4gIHByaXZhdGUgX2RzRWZmZWN0OiAoKGZuOiAoKSA9PiB2b2lkKSA9PiB2b2lkKSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZFxuICBwcml2YXRlIF9kc1NpZ25hbDogKDxUPihuYW1lOiBzdHJpbmcsIGluaXQ/OiBUKSA9PiB7IHZhbHVlOiBUIH0pIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG5cbiAgLy8gXHUyNTAwXHUyNTAwIFByZS1pbml0IGV2ZW50IHF1ZXVlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAvLyBFdmVudHMgZmlyZWQgdmlhIGZpcmUoKSBiZWZvcmUgX2luaXQoKSBjb21wbGV0ZXMgd2lyaW5nIGFyZSBxdWV1ZWQgaGVyZVxuICAvLyBhbmQgcmVwbGF5ZWQgaW1tZWRpYXRlbHkgYWZ0ZXIgd2lyZUV2ZW50SGFuZGxlcnMoKSBydW5zLiBUaGlzIHByZXZlbnRzXG4gIC8vIGV2ZW50cyBmcm9tIGJlaW5nIHNpbGVudGx5IGRyb3BwZWQgZHVyaW5nIHRoZSBzdGFydHVwIHdpbmRvdy5cbiAgcHJpdmF0ZSBfcHJlSW5pdFF1ZXVlOiBBcnJheTx7IGV2ZW50OiBzdHJpbmc7IHBheWxvYWQ6IHVua25vd25bXSB9PiA9IFtdXG4gIHByaXZhdGUgX2luaXRDb21wbGV0ZSA9IGZhbHNlXG5cbiAgLy8gXHUyNTAwXHUyNTAwIFBoYXNlIDI6IExFUyB0cmVlIHdpcmluZyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgLy8gUGFyZW50IHJlZmVyZW5jZSBzZXQgc3luY2hyb25vdXNseSBpbiBjb25uZWN0ZWRDYWxsYmFjayAoYmVmb3JlIG1pY3JvdGFzaylcbiAgLy8gc28gdGhlIHBhcmVudCdzIF9pbml0KCkgc2VlcyB0aGlzIGNoaWxkIGluIF9sZXNDaGlsZHJlbiB3aGVuIGl0IHJ1bnMuXG4gIC8vIFB1YmxpYyBzbyB3aXJpbmcudHMgY2FuIHRyYXZlcnNlIHRoZSB0cmVlIGZvciBidWJibGUvY2FzY2FkZSB3aXRob3V0IGltcG9ydGluZ1xuICAvLyBMb2NhbEV2ZW50U2NyaXB0ICh3aGljaCB3b3VsZCBjcmVhdGUgYSBjaXJjdWxhciBtb2R1bGUgZGVwZW5kZW5jeSkuXG4gIHB1YmxpYyBfbGVzUGFyZW50OiBMb2NhbEV2ZW50U2NyaXB0IHwgbnVsbCA9IG51bGxcbiAgcHVibGljIF9sZXNDaGlsZHJlbjogU2V0PExvY2FsRXZlbnRTY3JpcHQ+ID0gbmV3IFNldCgpXG5cbiAgLy8gUmVzb2x2ZXMgd2hlbiBfaW5pdCgpIGNvbXBsZXRlcyAoaW5jbHVkaW5nIGNoaWxkcmVuJ3MgbGVzUmVhZHkpLlxuICAvLyBQYXJlbnQncyBfaW5pdCgpIGF3YWl0cyB0aGlzIGJlZm9yZSBmaXJpbmcgaXRzIG93biBvbi1sb2FkLCBjcmVhdGluZ1xuICAvLyBib3R0b20tdXAgaW5pdGlhbGl6YXRpb246IGxlYXZlcyBmaXJlIG9uLWxvYWQgZmlyc3QsIHJvb3QgZmlyZXMgbGFzdC5cbiAgcHVibGljIHJlYWRvbmx5IGxlc1JlYWR5OiBQcm9taXNlPHZvaWQ+XG4gIHByaXZhdGUgX3Jlc29sdmVSZWFkeSE6ICgpID0+IHZvaWRcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5sZXNSZWFkeSA9IG5ldyBQcm9taXNlPHZvaWQ+KHJlc29sdmUgPT4geyB0aGlzLl9yZXNvbHZlUmVhZHkgPSByZXNvbHZlIH0pXG4gICAgLy8gRW5zdXJlIExFU0JyaWRnZSBleGlzdHMgZ2xvYmFsbHkgZm9yIHRoZSBgZm9yd2FyZGAgcHJpbWl0aXZlLlxuICAgIC8vIElkZW1wb3RlbnQ6IG5vLW9wIGlmIGFscmVhZHkgc2V0IChlLmcuLCBieSBicmlkZ2UgbW9kdWxlIG9yIHVzZXIgc2NyaXB0KS5cbiAgICBpZiAoISgnTEVTQnJpZGdlJyBpbiBnbG9iYWxUaGlzKSkge1xuICAgICAgOyhnbG9iYWxUaGlzIGFzIGFueSkuTEVTQnJpZGdlID0gbmV3IE1hcDxzdHJpbmcsICguLi5hcmdzOiB1bmtub3duW10pID0+IHVua25vd24+KClcbiAgICB9XG4gIH1cblxuICBnZXQgY29uZmlnKCk6ICBMRVNDb25maWcgfCBudWxsICAgIHsgcmV0dXJuIHRoaXMuX2NvbmZpZyB9XG4gIGdldCB3aXJpbmcoKTogIFBhcnNlZFdpcmluZyB8IG51bGwgeyByZXR1cm4gdGhpcy5fd2lyaW5nIH1cbiAgZ2V0IGNvbnRleHQoKTogTEVTQ29udGV4dCB8IG51bGwgICB7IHJldHVybiB0aGlzLl9jdHggfVxuXG4gIHN0YXRpYyBnZXQgb2JzZXJ2ZWRBdHRyaWJ1dGVzKCk6IHN0cmluZ1tdIHsgcmV0dXJuIFtdIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICAvLyBSZXNldCBpbml0IHN0YXRlIHNvIGEgcmVjb25uZWN0ZWQgZWxlbWVudCBzdGFydHMgZnJlc2guXG4gICAgLy8gTk9URTogX3ByZUluaXRRdWV1ZSBpcyBpbnRlbnRpb25hbGx5IE5PVCByZXNldCBoZXJlIFx1MjAxNCBldmVudHMgZmlyZWQgdmlhXG4gICAgLy8gZmlyZSgpIGJlZm9yZSBhcHBlbmRDaGlsZCgpIG11c3Qgc3Vydml2ZSBpbnRvIF9pbml0KCkgc28gdGhleSBjYW4gYmVcbiAgICAvLyByZXBsYXllZCBhZnRlciB3aXJpbmcuIF90ZWFyZG93bigpIChjYWxsZWQgb24gZGlzY29ubmVjdCkgaXMgd2hlcmUgdGhlXG4gICAgLy8gcXVldWUgaXMgY2xlYXJlZCwgZW5zdXJpbmcgYSBjbGVhbiBzbGF0ZSBvbiByZWNvbm5lY3Rpb24uXG4gICAgdGhpcy5faW5pdENvbXBsZXRlID0gZmFsc2VcbiAgICAvLyBTeW5jaHJvbm91cyBwYXJlbnQgcmVnaXN0cmF0aW9uIFx1MjAxNCBtdXN0IGhhcHBlbiBiZWZvcmUgdGhlIG1pY3JvdGFza1xuICAgIC8vIHNvIHRoZSBwYXJlbnQncyBfaW5pdCgpIHNlZXMgdGhpcyBjaGlsZCBpbiBfbGVzQ2hpbGRyZW4gd2hlbiBpdCBhd2FpdHNcbiAgICAvLyBjaGlsZHJlbidzIGxlc1JlYWR5LiBVc2VzIGNsb3Nlc3QoKSB3aGljaCB3YWxrcyB1cCB0aGUgcmVhbCBET00uXG4gICAgY29uc3QgcGFyZW50TEVTID0gdGhpcy5wYXJlbnRFbGVtZW50Py5jbG9zZXN0KCdsb2NhbC1ldmVudC1zY3JpcHQnKSBhcyBMb2NhbEV2ZW50U2NyaXB0IHwgbnVsbFxuICAgIHRoaXMuX2xlc1BhcmVudCA9IHBhcmVudExFUyA/PyBudWxsXG4gICAgcGFyZW50TEVTPy5fbGVzQ2hpbGRyZW4uYWRkKHRoaXMpXG5cbiAgICBxdWV1ZU1pY3JvdGFzaygoKSA9PiB0aGlzLl9pbml0KCkpXG4gIH1cblxuICBkaXNjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICB0aGlzLl9sZXNQYXJlbnQ/Ll9sZXNDaGlsZHJlbi5kZWxldGUodGhpcylcbiAgICB0aGlzLl9sZXNQYXJlbnQgPSBudWxsXG4gICAgdGhpcy5fdGVhcmRvd24oKVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEludGVybmFsIGxpZmVjeWNsZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwcml2YXRlIGFzeW5jIF9pbml0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBpbml0aWFsaXppbmcnLCB0aGlzLmlkIHx8ICcobm8gaWQpJylcblxuICAgIC8vIFByZS1zZWVkIGxvY2FsIHNpZ25hbCBzdG9yZSBmcm9tIGRhdGEtc2lnbmFsczoqIGF0dHJpYnV0ZXMuXG4gICAgLy8gVGhlIEludGVyc2VjdGlvbk9ic2VydmVyIGNhbiBmaXJlIGJlZm9yZSBEYXRhc3RhcidzIGFzeW5jIHBsdWdpbiBjb25uZWN0cyxcbiAgICAvLyBzbyBndWFyZCBleHByZXNzaW9ucyBsaWtlIGAkaW50cm9TdGF0ZSA9PSAnaGlkZGVuJ2Agd291bGQgZXZhbHVhdGUgdG9cbiAgICAvLyBgdW5kZWZpbmVkID09ICdoaWRkZW4nYCBcdTIxOTIgZmFsc2Ugd2l0aG91dCB0aGlzIHByZS1zZWVkaW5nIHN0ZXAuXG4gICAgdGhpcy5fc2VlZFNpZ25hbHNGcm9tQXR0cmlidXRlcygpXG5cbiAgICAvLyBQaGFzZSAxOiBET00gXHUyMTkyIGNvbmZpZ1xuICAgIHRoaXMuX2NvbmZpZyA9IHJlYWRDb25maWcodGhpcylcbiAgICBsb2dDb25maWcodGhpcy5fY29uZmlnKVxuXG4gICAgLy8gUGhhc2UgODogbG9hZCBtb2R1bGVzIGJlZm9yZSBwYXJzaW5nIHNvIHByaW1pdGl2ZSBuYW1lcyByZXNvbHZlXG4gICAgYXdhaXQgdGhpcy5fbG9hZE1vZHVsZXModGhpcy5fY29uZmlnKVxuXG4gICAgLy8gUGhhc2UgMjogcGFyc2UgYm9keSBzdHJpbmdzIFx1MjE5MiBBU1RcbiAgICB0aGlzLl93aXJpbmcgPSB0aGlzLl9wYXJzZUFsbCh0aGlzLl9jb25maWcpXG5cbiAgICAvLyBQaGFzZSA0OiBidWlsZCBjb250ZXh0LCByZWdpc3RlciBjb21tYW5kcywgd2lyZSBldmVudCBoYW5kbGVyc1xuICAgIC8vIENvbm5lY3QgdGhpcyBlbGVtZW50J3MgQ29tbWFuZFJlZ2lzdHJ5IHRvIHRoZSBwYXJlbnQncyBzbyBgY2FsbGBcbiAgICAvLyBzdGF0ZW1lbnRzIGNhbiByZXNvbHZlIGNvbW1hbmRzIGRlZmluZWQgaW4gYW55IGFuY2VzdG9yLlxuICAgIHRoaXMuY29tbWFuZHMuc2V0UGFyZW50KHRoaXMuX2xlc1BhcmVudD8uY29tbWFuZHMgPz8gbnVsbClcblxuICAgIHRoaXMuX2N0eCA9IGJ1aWxkQ29udGV4dChcbiAgICAgIHRoaXMsXG4gICAgICB0aGlzLmNvbW1hbmRzLFxuICAgICAgdGhpcy5tb2R1bGVzLFxuICAgICAgeyBnZXQ6IGsgPT4gdGhpcy5fZ2V0U2lnbmFsKGspLCBzZXQ6IChrLCB2KSA9PiB0aGlzLl9zZXRTaWduYWwoaywgdikgfVxuICAgIClcblxuICAgIHJlZ2lzdGVyQ29tbWFuZHModGhpcy5fd2lyaW5nLCB0aGlzLmNvbW1hbmRzKVxuXG4gICAgdGhpcy5fY2xlYW51cHMucHVzaChcbiAgICAgIHdpcmVFdmVudEhhbmRsZXJzKHRoaXMuX3dpcmluZywgdGhpcywgKCkgPT4gdGhpcy5fY3R4ISlcbiAgICApXG5cbiAgICAvLyBIYW5kbGVycyBhcmUgbm93IHdpcmVkIFx1MjAxNCBtYXJrIGluaXQgY29tcGxldGUgYW5kIGRyYWluIGFueSBxdWV1ZWQgZXZlbnRzLlxuICAgIC8vIEV2ZW50cyBmaXJlZCB2aWEgZmlyZSgpIGR1cmluZyB0aGUgc3RhcnR1cCB3aW5kb3cgYXJlIHJlcGxheWVkIGhlcmUsXG4gICAgLy8gaW4gYXJyaXZhbCBvcmRlciwgYmVmb3JlIHRoZSBvbi1sb2FkIGxpZmVjeWNsZSBmaXJlcy5cbiAgICB0aGlzLl9pbml0Q29tcGxldGUgPSB0cnVlXG4gICAgaWYgKHRoaXMuX3ByZUluaXRRdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBxdWV1ZWQgPSB0aGlzLl9wcmVJbml0UXVldWUuc3BsaWNlKDApXG4gICAgICBjb25zb2xlLmxvZyhgW0xFU10gJHt0aGlzLmlkIHx8ICcobm8gaWQpJ306IGRyYWluaW5nICR7cXVldWVkLmxlbmd0aH0gcHJlLWluaXQgZXZlbnQocylgKVxuICAgICAgZm9yIChjb25zdCB7IGV2ZW50LCBwYXlsb2FkIH0gb2YgcXVldWVkKSB7XG4gICAgICAgIHRoaXMuZmlyZShldmVudCwgcGF5bG9hZClcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBQaGFzZSA1YTogSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgZm9yIG9uLWVudGVyIC8gb24tZXhpdFxuICAgIHRoaXMuX2NsZWFudXBzLnB1c2goXG4gICAgICB3aXJlSW50ZXJzZWN0aW9uT2JzZXJ2ZXIoXG4gICAgICAgIHRoaXMsXG4gICAgICAgIHRoaXMuX3dpcmluZy5saWZlY3ljbGUub25FbnRlcixcbiAgICAgICAgdGhpcy5fd2lyaW5nLmxpZmVjeWNsZS5vbkV4aXQsXG4gICAgICAgICgpID0+IHRoaXMuX2N0eCFcbiAgICAgIClcbiAgICApXG5cbiAgICAvLyBQaGFzZSA1Yjogc2lnbmFsIHdhdGNoZXJzXG4gICAgLy8gSWYgRGF0YXN0YXIgaXMgY29ubmVjdGVkIHVzZSBpdHMgcmVhY3RpdmUgZWZmZWN0KCkgc3lzdGVtO1xuICAgIC8vIG90aGVyd2lzZSB0aGUgbG9jYWwgX3NldFNpZ25hbCBwYXRoIGNhbGxzIG5vdGlmeVNpZ25hbFdhdGNoZXJzIGRpcmVjdGx5LlxuICAgIGlmICh0aGlzLl9kc0VmZmVjdCkge1xuICAgICAgZm9yIChjb25zdCB3YXRjaGVyIG9mIHRoaXMuX3dpcmluZy53YXRjaGVycykge1xuICAgICAgICB3aXJlU2lnbmFsV2F0Y2hlclZpYURhdGFzdGFyKHdhdGNoZXIsIHRoaXMuX2RzRWZmZWN0LCAoKSA9PiB0aGlzLl9jdHghKVxuICAgICAgfVxuICAgICAgY29uc29sZS5sb2coYFtMRVNdIHdpcmVkICR7dGhpcy5fd2lyaW5nLndhdGNoZXJzLmxlbmd0aH0gc2lnbmFsIHdhdGNoZXJzIHZpYSBEYXRhc3RhcmApXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSB3aXJlZCAke3RoaXMuX3dpcmluZy53YXRjaGVycy5sZW5ndGh9IHNpZ25hbCB3YXRjaGVycyAobG9jYWwgZmFsbGJhY2spYClcbiAgICB9XG5cbiAgICAvLyBQaGFzZSA2OiBEYXRhc3RhciBicmlkZ2UgZnVsbCBhY3RpdmF0aW9uIFx1MjAxNCBjb21pbmcgbmV4dFxuXG4gICAgLy8gUmVnaXN0ZXIgYW55IDxsb2NhbC1icmlkZ2U+IGRlY2xhcmF0aXZlIGJyaWRnZXMgZGVjbGFyZWQgYXMgY2hpbGRyZW4uXG4gICAgLy8gUnVucyBhZnRlciBtb2R1bGVzIGxvYWQgc28gdGhlIGJyaWRnZSBtb2R1bGUgaGFzIGluaXRpYWxpemVkIExFU0JyaWRnZS5cbiAgICB0aGlzLl9yZWdpc3RlckxvY2FsQnJpZGdlcygpXG5cbiAgICAvLyBXYWl0IGZvciBhbGwgZGlyZWN0IExFUyBjaGlsZHJlbiB0byBjb21wbGV0ZSB0aGVpciBfaW5pdCgpIGJlZm9yZVxuICAgIC8vIGZpcmluZyB0aGlzIGVsZW1lbnQncyBvbi1sb2FkLiBDcmVhdGVzIGJvdHRvbS11cCBpbml0aWFsaXphdGlvbiBvcmRlcjpcbiAgICAvLyBsZWF2ZXMgXHUyMTkyIGludGVybWVkaWF0ZSBub2RlcyBcdTIxOTIgcm9vdC4gVXNlcyBhbGxTZXR0bGVkIHNvIGEgZmFpbGluZyBjaGlsZFxuICAgIC8vIGRvZXMgbm90IGJsb2NrIHRoZSBwYXJlbnQgaW5kZWZpbml0ZWx5LlxuICAgIGNvbnN0IGNoaWxkUHJvbWlzZXMgPSBbLi4udGhpcy5fbGVzQ2hpbGRyZW5dLm1hcChjID0+IGMubGVzUmVhZHkpXG4gICAgaWYgKGNoaWxkUHJvbWlzZXMubGVuZ3RoID4gMCkge1xuICAgICAgbGV0IF90aW1lb3V0SWQ6IFJldHVyblR5cGU8dHlwZW9mIHNldFRpbWVvdXQ+XG4gICAgICBjb25zdCB0aW1lb3V0ID0gbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiB7XG4gICAgICAgIF90aW1lb3V0SWQgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oYFtMRVNdICR7dGhpcy5pZCB8fCAnKG5vIGlkKSd9OiBub3QgYWxsIGNoaWxkcmVuIHNpZ25hbGxlZCByZWFkeSB3aXRoaW4gM3MgXHUyMDE0IHByb2NlZWRpbmcgYW55d2F5YClcbiAgICAgICAgICByZXNvbHZlKClcbiAgICAgICAgfSwgMzAwMClcbiAgICAgIH0pXG4gICAgICBhd2FpdCBQcm9taXNlLnJhY2UoW1xuICAgICAgICBQcm9taXNlLmFsbFNldHRsZWQoY2hpbGRQcm9taXNlcykudGhlbigoKSA9PiBjbGVhclRpbWVvdXQoX3RpbWVvdXRJZCkpLFxuICAgICAgICB0aW1lb3V0LFxuICAgICAgXSlcbiAgICB9XG5cbiAgICAvLyBvbi1sb2FkIGZpcmVzIGFmdGVyIGFsbCBjaGlsZHJlbiBhcmUgcmVhZHlcbiAgICBhd2FpdCBmaXJlT25Mb2FkKHRoaXMuX3dpcmluZywgKCkgPT4gdGhpcy5fY3R4ISlcblxuICAgIC8vIFNpZ25hbCByZWFkaW5lc3MgdG8gb3VyIHBhcmVudCAoaXQgbWF5IGJlIHdhaXRpbmcgb24gdGhpcylcbiAgICB0aGlzLl9yZXNvbHZlUmVhZHkoKVxuICAgIGNvbnNvbGUubG9nKCdbTEVTXSByZWFkeTonLCB0aGlzLmlkIHx8ICcobm8gaWQpJylcblxuICAgIC8vIE5vdGlmeSBwYXJlbnQgd2l0aCBsZXM6Y2hpbGQtcmVhZHkgc28gaXQgY2FuIHJlYWN0IGRlY2xhcmF0aXZlbHkuXG4gICAgLy8gcGF5bG9hZFswXSA9IHRoaXMgZWxlbWVudCdzIGlkLCB1c2VmdWwgd2hlbiBwYXJlbnQgaGFzIG11bHRpcGxlIGNoaWxkcmVuXG4gICAgLy8gYW5kIHdhbnRzIHRvIGRpc3Rpbmd1aXNoIHdoaWNoIG9uZSBiZWNhbWUgcmVhZHkuXG4gICAgaWYgKHRoaXMuX2xlc1BhcmVudCkge1xuICAgICAgdGhpcy5fbGVzUGFyZW50LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdsZXM6Y2hpbGQtcmVhZHknLCB7XG4gICAgICAgIGRldGFpbDogeyBwYXlsb2FkOiBbdGhpcy5pZCB8fCAnJ10gfSxcbiAgICAgICAgYnViYmxlczogZmFsc2UsXG4gICAgICAgIGNvbXBvc2VkOiBmYWxzZSxcbiAgICAgIH0pKVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX3RlYXJkb3duKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBkaXNjb25uZWN0ZWQnLCB0aGlzLmlkIHx8ICcobm8gaWQpJylcbiAgICBmb3IgKGNvbnN0IGNsZWFudXAgb2YgdGhpcy5fY2xlYW51cHMpIGNsZWFudXAoKVxuICAgIHRoaXMuX2NsZWFudXBzID0gW11cbiAgICB0aGlzLl9jb25maWcgICAgICA9IG51bGxcbiAgICB0aGlzLl93aXJpbmcgICAgICA9IG51bGxcbiAgICB0aGlzLl9jdHggICAgICAgICA9IG51bGxcbiAgICB0aGlzLl9pbml0Q29tcGxldGUgPSBmYWxzZVxuICAgIHRoaXMuX3ByZUluaXRRdWV1ZSA9IFtdXG4gICAgLy8gTm90ZTogX2xlc0NoaWxkcmVuIGlzIE5PVCBjbGVhcmVkIFx1MjAxNCB0aGUgY2hpbGRyZW4gYXJlIHN0aWxsIGluIHRoZSBET01cbiAgICAvLyBhbmQgd2lsbCByZS1yZWdpc3RlciBvbiB0aGVpciBvd24gcmVjb25uZWN0LiBfbGVzUGFyZW50IGlzIGNsZWFyZWQgaW5cbiAgICAvLyBkaXNjb25uZWN0ZWRDYWxsYmFjayBiZWZvcmUgX3RlYXJkb3duKCkgaXMgY2FsbGVkLlxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIExvY2FsIGJyaWRnZSByZWdpc3RyYXRpb24gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgLyoqXG4gICAqIFJlYWRzIDxsb2NhbC1icmlkZ2UgbmFtZT1cImV4aXRTcGxhc2hcIiBmbj1cIndpbmRvdy5leGl0U3BsYXNoXCI+IGNoaWxkcmVuXG4gICAqIGFuZCByZWdpc3RlcnMgdGhlbSBpbiB0aGUgZ2xvYmFsIExFU0JyaWRnZSBNYXAuXG4gICAqIENhbGxlZCBhZnRlciBtb2R1bGUgbG9hZGluZyBzbyBgPHVzZS1tb2R1bGUgdHlwZT1cImJyaWRnZVwiPmAgaGFzIHJ1biBmaXJzdC5cbiAgICovXG4gIHByaXZhdGUgX3JlZ2lzdGVyTG9jYWxCcmlkZ2VzKCk6IHZvaWQge1xuICAgIGNvbnN0IHJlZ2lzdHJ5ID0gKGdsb2JhbFRoaXMgYXMgYW55KS5MRVNCcmlkZ2UgYXMgTWFwPHN0cmluZywgKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gdW5rbm93bj4gfCB1bmRlZmluZWRcbiAgICBpZiAoIXJlZ2lzdHJ5KSByZXR1cm5cblxuICAgIGZvciAoY29uc3QgY2hpbGQgb2YgQXJyYXkuZnJvbSh0aGlzLmNoaWxkcmVuKSkge1xuICAgICAgaWYgKGNoaWxkLnRhZ05hbWUudG9Mb3dlckNhc2UoKSAhPT0gJ2xvY2FsLWJyaWRnZScpIGNvbnRpbnVlXG4gICAgICBjb25zdCBuYW1lICAgPSBjaGlsZC5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpXG4gICAgICBjb25zdCBmbkV4cHIgPSBjaGlsZC5nZXRBdHRyaWJ1dGUoJ2ZuJyk/LnRyaW0oKVxuICAgICAgaWYgKCFuYW1lIHx8ICFmbkV4cHIpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8bG9jYWwtYnJpZGdlPiByZXF1aXJlcyBib3RoIG5hbWU9IGFuZCBmbj0gYXR0cmlidXRlcycsIGNoaWxkKVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgICAgLy8gUmVnaXN0ZXIgYXMgYSBsYXp5IHdyYXBwZXI6IGV2YWx1YXRlIGZuPSBleHByZXNzaW9uIG9uIGZpcnN0IGNhbGwsXG4gICAgICAvLyBub3QgYXQgaW5pdCB0aW1lLiBXaW5kb3cgZnVuY3Rpb25zIG1heSBub3QgeWV0IGV4aXN0IGR1cmluZyBMRVMgaW5pdC5cbiAgICAgIGNvbnN0IGNhcHR1cmVkRXhwciA9IGZuRXhwclxuICAgICAgY29uc3QgY2FwdHVyZWROYW1lID0gbmFtZVxuICAgICAgcmVnaXN0cnkuc2V0KG5hbWUsICguLi5hcmdzOiB1bmtub3duW10pID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tbmV3LWZ1bmNcbiAgICAgICAgICBjb25zdCByZXNvbHZlZCA9IG5ldyBGdW5jdGlvbihgcmV0dXJuICgke2NhcHR1cmVkRXhwcn0pYCkoKVxuICAgICAgICAgIGlmICh0eXBlb2YgcmVzb2x2ZWQgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFtMRVM6YnJpZGdlXSBmb3J3YXJkIFwiJHtjYXB0dXJlZE5hbWV9XCI6IGZuPVwiJHtjYXB0dXJlZEV4cHJ9XCIgcmVzb2x2ZWQgdG8gJHt0eXBlb2YgcmVzb2x2ZWR9IFx1MjAxNCBpcyB0aGUgZnVuY3Rpb24gZGVmaW5lZCB5ZXQ/YClcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWRcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJlc29sdmVkKC4uLmFyZ3MpXG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFtMRVM6YnJpZGdlXSBmb3J3YXJkIFwiJHtjYXB0dXJlZE5hbWV9XCI6IGZuPSBldmFsdWF0aW9uIGZhaWxlZDpgLCBlcnIpXG4gICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZFxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgY29uc29sZS5sb2coYFtMRVM6YnJpZGdlXSByZWdpc3RlcmVkIFwiJHtuYW1lfVwiIChsYXp5KWApXG4gICAgfVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFNpZ25hbCBzdG9yZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKipcbiAgICogUmVhZHMgYWxsIGRhdGEtc2lnbmFsczpLRVk9XCJWQUxVRVwiIGF0dHJpYnV0ZXMgb24gdGhlIGhvc3QgZWxlbWVudCBhbmRcbiAgICogcHJlLXBvcHVsYXRlcyB0aGUgbG9jYWwgX3NpZ25hbHMgTWFwIHdpdGggdGhlaXIgaW5pdGlhbCB2YWx1ZXMuXG4gICAqXG4gICAqIERhdGFzdGFyIGV2YWx1YXRlcyB0aGVzZSBhcyBKUyBleHByZXNzaW9ucyAoZS5nLiBcIidoaWRkZW4nXCIgXHUyMTkyIFwiaGlkZGVuXCIsXG4gICAqIFwiMFwiIFx1MjE5MiAwLCBcIltdXCIgXHUyMTkyIFtdKS4gV2UgZG8gdGhlIHNhbWUgd2l0aCBhIHNpbXBsZSBldmFsLlxuICAgKlxuICAgKiBUaGlzIHJ1bnMgc3luY2hyb25vdXNseSBiZWZvcmUgYW55IGFzeW5jIG9wZXJhdGlvbnMgc28gdGhhdCB0aGVcbiAgICogSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgXHUyMDE0IHdoaWNoIG1heSBmaXJlIGJlZm9yZSBEYXRhc3RhciBjb25uZWN0cyBcdTIwMTQgc2Vlc1xuICAgKiB0aGUgY29ycmVjdCBpbml0aWFsIHNpZ25hbCB2YWx1ZXMgd2hlbiBldmFsdWF0aW5nIGB3aGVuYCBndWFyZHMuXG4gICAqL1xuICBwcml2YXRlIF9zZWVkU2lnbmFsc0Zyb21BdHRyaWJ1dGVzKCk6IHZvaWQge1xuICAgIGZvciAoY29uc3QgYXR0ciBvZiBBcnJheS5mcm9tKHRoaXMuYXR0cmlidXRlcykpIHtcbiAgICAgIC8vIE1hdGNoIGRhdGEtc2lnbmFsczpLRVkgb3IgZGF0YS1zdGFyLXNpZ25hbHM6S0VZIChhbGlhc2VkIGJ1bmRsZSlcbiAgICAgIGNvbnN0IG0gPSBhdHRyLm5hbWUubWF0Y2goL15kYXRhLSg/OnN0YXItKT9zaWduYWxzOiguKykkLylcbiAgICAgIGlmICghbSkgY29udGludWVcbiAgICAgIGNvbnN0IGtleSA9IG1bMV0hXG4gICAgICAgIC5yZXBsYWNlKC8tKFthLXpdKS9nLCAoXywgY2g6IHN0cmluZykgPT4gY2gudG9VcHBlckNhc2UoKSkgLy8ga2ViYWItY2FzZSBcdTIxOTIgY2FtZWxDYXNlXG4gICAgICB0cnkge1xuICAgICAgICAvLyBFdmFsdWF0ZSB0aGUgYXR0cmlidXRlIHZhbHVlIGFzIGEgSlMgZXhwcmVzc2lvbiAoc2FtZSBhcyBEYXRhc3RhciBkb2VzKVxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tbmV3LWZ1bmNcbiAgICAgICAgY29uc3QgdmFsdWUgPSBuZXcgRnVuY3Rpb24oYHJldHVybiAoJHthdHRyLnZhbHVlfSlgKSgpXG4gICAgICAgIHRoaXMuX3NpZ25hbHMuc2V0KGtleSwgdmFsdWUpXG4gICAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSBzZWVkZWQgJCR7a2V5fSA9YCwgdmFsdWUpXG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLy8gSWYgaXQgZmFpbHMsIHN0b3JlIHRoZSByYXcgc3RyaW5nIHZhbHVlXG4gICAgICAgIHRoaXMuX3NpZ25hbHMuc2V0KGtleSwgYXR0ci52YWx1ZSlcbiAgICAgICAgY29uc29sZS5sb2coYFtMRVNdIHNlZWRlZCAkJHtrZXl9ID0gKHJhdylgLCBhdHRyLnZhbHVlKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2dldFNpZ25hbChuYW1lOiBzdHJpbmcpOiB1bmtub3duIHtcbiAgICAvLyBQaGFzZSA2OiBwcmVmZXIgRGF0YXN0YXIgc2lnbmFsIHRyZWUgd2hlbiBicmlkZ2UgaXMgY29ubmVjdGVkXG4gICAgaWYgKHRoaXMuX2RzU2lnbmFsKSB7XG4gICAgICB0cnkgeyByZXR1cm4gdGhpcy5fZHNTaWduYWwobmFtZSkudmFsdWUgfSBjYXRjaCB7IC8qIGZhbGwgdGhyb3VnaCAqLyB9XG4gICAgfVxuICAgIC8vIFRyeSBleGFjdCBjYXNlIGZpcnN0IChlLmcuIERhdGFzdGFyLXNldCBzaWduYWxzIGFyZSBjYW1lbENhc2UpLlxuICAgIC8vIEZhbGwgYmFjayB0byBsb3dlcmNhc2UgYmVjYXVzZSBIVE1MIG5vcm1hbGl6ZXMgYXR0cmlidXRlIG5hbWVzIHRvIGxvd2VyY2FzZSxcbiAgICAvLyBzbyBkYXRhLXNpZ25hbHM6aW50cm9TdGF0ZSBcdTIxOTIgc2VlZGVkIGFzIFwiaW50cm9zdGF0ZVwiLCBidXQgZ3VhcmRzIHJlZmVyZW5jZSBcIiRpbnRyb1N0YXRlXCIuXG4gICAgaWYgKHRoaXMuX3NpZ25hbHMuaGFzKG5hbWUpKSByZXR1cm4gdGhpcy5fc2lnbmFscy5nZXQobmFtZSlcbiAgICBpZiAodGhpcy5fc2lnbmFscy5oYXMobmFtZS50b0xvd2VyQ2FzZSgpKSkgcmV0dXJuIHRoaXMuX3NpZ25hbHMuZ2V0KG5hbWUudG9Mb3dlckNhc2UoKSlcbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cblxuICBwcml2YXRlIF9zZXRTaWduYWwobmFtZTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIGNvbnN0IHByZXYgPSB0aGlzLl9zaWduYWxzLmdldChuYW1lKVxuICAgIHRoaXMuX3NpZ25hbHMuc2V0KG5hbWUsIHZhbHVlKVxuICAgIGNvbnNvbGUubG9nKGBbTEVTXSAkJHtuYW1lfSA9YCwgdmFsdWUpXG5cbiAgICAvLyBQaGFzZSA2OiB3cml0ZSB0aHJvdWdoIHRvIERhdGFzdGFyJ3MgcmVhY3RpdmUgZ3JhcGhcbiAgICBpZiAodGhpcy5fZHNTaWduYWwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHNpZyA9IHRoaXMuX2RzU2lnbmFsPHVua25vd24+KG5hbWUsIHZhbHVlKVxuICAgICAgICBzaWcudmFsdWUgPSB2YWx1ZVxuICAgICAgfSBjYXRjaCB7IC8qIHNpZ25hbCBtYXkgbm90IGV4aXN0IGluIERhdGFzdGFyIHlldCAqLyB9XG4gICAgfVxuXG4gICAgLy8gUGhhc2UgNWI6IG5vdGlmeSBsb2NhbCBzaWduYWwgd2F0Y2hlcnMgKGZhbGxiYWNrIHBhdGggd2hlbiBEYXRhc3RhciBhYnNlbnQpXG4gICAgaWYgKHByZXYgIT09IHZhbHVlICYmIHRoaXMuX3dpcmluZyAmJiB0aGlzLl9jdHggJiYgIXRoaXMuX2RzRWZmZWN0KSB7XG4gICAgICBub3RpZnlTaWduYWxXYXRjaGVycyhuYW1lLCB0aGlzLl93aXJpbmcud2F0Y2hlcnMsICgpID0+IHRoaXMuX2N0eCEpXG4gICAgfVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIE1vZHVsZSBsb2FkaW5nIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgYXN5bmMgX2xvYWRNb2R1bGVzKGNvbmZpZzogTEVTQ29uZmlnKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKGNvbmZpZy5tb2R1bGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG4gICAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICBjb25maWcubW9kdWxlcy5tYXAoZGVjbCA9PlxuICAgICAgICBsb2FkTW9kdWxlKHRoaXMubW9kdWxlcywge1xuICAgICAgICAgIC4uLihkZWNsLnR5cGUgPyB7IHR5cGU6IGRlY2wudHlwZSB9IDoge30pLFxuICAgICAgICAgIC4uLihkZWNsLnNyYyAgPyB7IHNyYzogIGRlY2wuc3JjICB9IDoge30pLFxuICAgICAgICB9KS5jYXRjaChlcnIgPT4gY29uc29sZS53YXJuKCdbTEVTXSBNb2R1bGUgbG9hZCBmYWlsZWQ6JywgZXJyKSlcbiAgICAgIClcbiAgICApXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgUGFyc2UgYWxsIGJvZGllcyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwcml2YXRlIF9wYXJzZUFsbChjb25maWc6IExFU0NvbmZpZyk6IFBhcnNlZFdpcmluZyB7XG4gICAgbGV0IG9rID0gMCwgZmFpbCA9IDBcblxuICAgIGNvbnN0IHRyeVBhcnNlID0gKGJvZHk6IHN0cmluZywgbGFiZWw6IHN0cmluZyk6IExFU05vZGUgPT4ge1xuICAgICAgdHJ5IHsgb2srKzsgcmV0dXJuIHBhcnNlTEVTKGJvZHkpIH1cbiAgICAgIGNhdGNoIChlKSB7XG4gICAgICAgIGZhaWwrK1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbTEVTXSBQYXJzZSBlcnJvciBpbiAke2xhYmVsfTpgLCBlKVxuICAgICAgICByZXR1cm4geyB0eXBlOiAnZXhwcicsIHJhdzogJycgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHdpcmluZzogUGFyc2VkV2lyaW5nID0ge1xuICAgICAgY29tbWFuZHM6IGNvbmZpZy5jb21tYW5kcy5tYXAoZCA9PiAoe1xuICAgICAgICBuYW1lOiBkLm5hbWUsIGd1YXJkOiBkLmd1YXJkLCBhcmdzUmF3OiBkLmFyZ3NSYXcsXG4gICAgICAgIGJvZHk6IHRyeVBhcnNlKGQuYm9keSwgYGNvbW1hbmQgXCIke2QubmFtZX1cImApLFxuICAgICAgfSkpLFxuICAgICAgaGFuZGxlcnM6IGNvbmZpZy5vbkV2ZW50Lm1hcChkID0+ICh7XG4gICAgICAgIGV2ZW50OiBkLm5hbWUsXG4gICAgICAgIGJvZHk6IHRyeVBhcnNlKGQuYm9keSwgYG9uLWV2ZW50IFwiJHtkLm5hbWV9XCJgKSxcbiAgICAgIH0pKSxcbiAgICAgIHdhdGNoZXJzOiBjb25maWcub25TaWduYWwubWFwKGQgPT4gKHtcbiAgICAgICAgc2lnbmFsOiBkLm5hbWUsIHdoZW46IGQud2hlbixcbiAgICAgICAgYm9keTogdHJ5UGFyc2UoZC5ib2R5LCBgb24tc2lnbmFsIFwiJHtkLm5hbWV9XCJgKSxcbiAgICAgIH0pKSxcbiAgICAgIGxpZmVjeWNsZToge1xuICAgICAgICBvbkxvYWQ6ICBjb25maWcub25Mb2FkLm1hcChkID0+IHRyeVBhcnNlKGQuYm9keSwgJ29uLWxvYWQnKSksXG4gICAgICAgIG9uRW50ZXI6IGNvbmZpZy5vbkVudGVyLm1hcChkID0+ICh7IHdoZW46IGQud2hlbiwgYm9keTogdHJ5UGFyc2UoZC5ib2R5LCAnb24tZW50ZXInKSB9KSksXG4gICAgICAgIG9uRXhpdDogIGNvbmZpZy5vbkV4aXQubWFwKGQgPT4gdHJ5UGFyc2UoZC5ib2R5LCAnb24tZXhpdCcpKSxcbiAgICAgIH0sXG4gICAgfVxuXG4gICAgY29uc3QgdG90YWwgPSBvayArIGZhaWxcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gcGFyc2VyOiAke29rfS8ke3RvdGFsfSBib2RpZXMgcGFyc2VkIHN1Y2Nlc3NmdWxseSR7ZmFpbCA+IDAgPyBgICgke2ZhaWx9IGVycm9ycylgIDogJyd9YClcbiAgICByZXR1cm4gd2lyaW5nXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgRGF0YXN0YXIgYnJpZGdlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIGNvbm5lY3REYXRhc3RhcihmbnM6IHtcbiAgICBlZmZlY3Q6IChmbjogKCkgPT4gdm9pZCkgPT4gdm9pZFxuICAgIHNpZ25hbDogPFQ+KG5hbWU6IHN0cmluZywgaW5pdD86IFQpID0+IHsgdmFsdWU6IFQgfVxuICB9KTogdm9pZCB7XG4gICAgdGhpcy5fZHNFZmZlY3QgPSBmbnMuZWZmZWN0XG4gICAgdGhpcy5fZHNTaWduYWwgPSBmbnMuc2lnbmFsXG4gICAgY29uc29sZS5sb2coJ1tMRVNdIERhdGFzdGFyIGJyaWRnZSBjb25uZWN0ZWQnLCB0aGlzLmlkKVxuICB9XG5cbiAgZGlzY29ubmVjdERhdGFzdGFyKCk6IHZvaWQge1xuICAgIHRoaXMuX2RzRWZmZWN0ID0gdW5kZWZpbmVkXG4gICAgdGhpcy5fZHNTaWduYWwgPSB1bmRlZmluZWRcbiAgfVxuXG4gIGdldCBkc0VmZmVjdCgpIHsgcmV0dXJuIHRoaXMuX2RzRWZmZWN0IH1cbiAgZ2V0IGRzU2lnbmFsKCkgIHsgcmV0dXJuIHRoaXMuX2RzU2lnbmFsIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgUHVibGljIEFQSSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKipcbiAgICogRmlyZSBhIG5hbWVkIGxvY2FsIGV2ZW50IGludG8gdGhpcyBMRVMgaW5zdGFuY2UgZnJvbSBvdXRzaWRlLlxuICAgKlxuICAgKiBJZiBjYWxsZWQgYmVmb3JlIF9pbml0KCkgaGFzIGNvbXBsZXRlZCB3aXJpbmcgKGkuZS4gZHVyaW5nIHRoZSBzdGFydHVwXG4gICAqIHdpbmRvdyksIHRoZSBldmVudCBpcyBxdWV1ZWQgYW5kIHJlcGxheWVkIGF1dG9tYXRpY2FsbHkgb25jZSBoYW5kbGVyc1xuICAgKiBhcmUgcmVhZHkuIFRoaXMgcHJldmVudHMgc2lsZW50IGV2ZW50IGRyb3BzIHdoZW4gZXh0ZXJuYWwgY29kZSBjYWxsc1xuICAgKiBmaXJlKCkgb3IgZmlyZUxFUygpIGJlZm9yZSB0aGUgZWxlbWVudCBoYXMgZnVsbHkgaW5pdGlhbGl6ZWQuXG4gICAqL1xuICBmaXJlKGV2ZW50OiBzdHJpbmcsIHBheWxvYWQ6IHVua25vd25bXSA9IFtdKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLl9pbml0Q29tcGxldGUpIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSAke3RoaXMuaWQgfHwgJyhubyBpZCknfTogcXVldWVkIHByZS1pbml0IGV2ZW50IFwiJHtldmVudH1cImApXG4gICAgICB0aGlzLl9wcmVJbml0UXVldWUucHVzaCh7IGV2ZW50LCBwYXlsb2FkIH0pXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgdGhpcy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudChldmVudCwge1xuICAgICAgZGV0YWlsOiB7IHBheWxvYWQgfSwgYnViYmxlczogZmFsc2UsIGNvbXBvc2VkOiBmYWxzZSxcbiAgICB9KSlcbiAgfVxuXG4gIC8qKiBDYWxsIGEgY29tbWFuZCBieSBuYW1lIGZyb20gb3V0c2lkZSAoZS5nLiBicm93c2VyIGNvbnNvbGUsIHRlc3RzKS4gKi9cbiAgYXN5bmMgY2FsbChjb21tYW5kOiBzdHJpbmcsIGFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge30pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIXRoaXMuX2N0eCkgeyBjb25zb2xlLndhcm4oJ1tMRVNdIG5vdCBpbml0aWFsaXplZCB5ZXQnKTsgcmV0dXJuIH1cbiAgICBjb25zdCB7IHJ1bkNvbW1hbmQgfSA9IGF3YWl0IGltcG9ydCgnQHJ1bnRpbWUvZXhlY3V0b3IuanMnKVxuICAgIGF3YWl0IHJ1bkNvbW1hbmQoY29tbWFuZCwgYXJncywgdGhpcy5fY3R4KVxuICB9XG5cbiAgLyoqIFJlYWQgYSBzaWduYWwgdmFsdWUgZGlyZWN0bHkgKGZvciBkZWJ1Z2dpbmcpLiAqL1xuICBzaWduYWwobmFtZTogc3RyaW5nKTogdW5rbm93biB7XG4gICAgcmV0dXJuIHRoaXMuX2dldFNpZ25hbChuYW1lKVxuICB9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnbG9jYWwtZXZlbnQtc2NyaXB0JywgTG9jYWxFdmVudFNjcmlwdClcbiIsICIvKipcbiAqIDxsb2NhbC1jb21tYW5kPiBcdTIwMTQgZGVmaW5lcyBhIG5hbWVkLCBjYWxsYWJsZSBjb21tYW5kIHdpdGhpbiBhIDxsb2NhbC1ldmVudC1zY3JpcHQ+LlxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIG5hbWUgICAgUmVxdWlyZWQuIENvbW1hbmQgbmFtZSwgY29sb24tbmFtZXNwYWNlZDogXCJmZWVkOmZldGNoXCJcbiAqICAgYXJncyAgICBPcHRpb25hbC4gVHlwZWQgYXJndW1lbnQgbGlzdDogXCJbZnJvbTpzdHIgIHRvOnN0cl1cIlxuICogICBndWFyZCAgIE9wdGlvbmFsLiBKUyBleHByZXNzaW9uIFx1MjAxNCBmYWxzeSA9IHNpbGVudCBuby1vcCwgbm8gcmVzY3VlL2FmdGVyd2FyZHNcbiAqICAgZG8gICAgICBSZXF1aXJlZC4gTEVTIGJvZHkgKGJhY2t0aWNrLXF1b3RlZCBmb3IgbXVsdGktbGluZSlcbiAqXG4gKiBUaGlzIGVsZW1lbnQgaXMgcHVyZWx5IGRlY2xhcmF0aXZlIFx1MjAxNCBpdCBob2xkcyBkYXRhLlxuICogVGhlIGhvc3QgPGxvY2FsLWV2ZW50LXNjcmlwdD4gcmVhZHMgaXQgZHVyaW5nIFBoYXNlIDEgYW5kIHJlZ2lzdGVyc1xuICogdGhlIHBhcnNlZCBDb21tYW5kRGVmIGluIGl0cyBDb21tYW5kUmVnaXN0cnkuXG4gKlxuICogTm90ZTogPGNvbW1hbmQ+IHdhcyBhIGRlcHJlY2F0ZWQgSFRNTDUgZWxlbWVudCBcdTIwMTQgd2UgdXNlIDxsb2NhbC1jb21tYW5kPlxuICogdG8gc2F0aXNmeSB0aGUgY3VzdG9tIGVsZW1lbnQgaHlwaGVuIHJlcXVpcmVtZW50IGFuZCBhdm9pZCB0aGUgY29sbGlzaW9uLlxuICovXG5leHBvcnQgY2xhc3MgTG9jYWxDb21tYW5kIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgQXR0cmlidXRlIGFjY2Vzc29ycyAodHlwZWQsIHRyaW1tZWQpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIGdldCBjb21tYW5kTmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIC8qKiBSYXcgYXJncyBzdHJpbmcgZS5nLiBcIltmcm9tOnN0ciAgdG86c3RyXVwiIFx1MjAxNCBwYXJzZWQgYnkgUGhhc2UgMiAqL1xuICBnZXQgYXJnc1JhdygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnYXJncycpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIC8qKiBHdWFyZCBleHByZXNzaW9uIHN0cmluZyBcdTIwMTQgZXZhbHVhdGVkIGJ5IHJ1bnRpbWUgYmVmb3JlIGV4ZWN1dGlvbiAqL1xuICBnZXQgZ3VhcmRFeHByKCk6IHN0cmluZyB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnZ3VhcmQnKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIC8qKiBSYXcgTEVTIGJvZHkgXHUyMDE0IG1heSBiZSBiYWNrdGljay13cmFwcGVkIGZvciBtdWx0aS1saW5lICovXG4gIGdldCBkb0JvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ2RvJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgLy8gUGhhc2UgMDogdmVyaWZ5IGVsZW1lbnQgaXMgcmVjb2duaXplZC5cbiAgICBjb25zb2xlLmxvZygnW0xFU10gPGxvY2FsLWNvbW1hbmQ+IHJlZ2lzdGVyZWQ6JywgdGhpcy5jb21tYW5kTmFtZSB8fCAnKHVubmFtZWQpJylcbiAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ2xvY2FsLWNvbW1hbmQnLCBMb2NhbENvbW1hbmQpXG4iLCAiLyoqXG4gKiA8b24tZXZlbnQ+IFx1MjAxNCBzdWJzY3JpYmVzIHRvIGEgbmFtZWQgQ3VzdG9tRXZlbnQgZGlzcGF0Y2hlZCB3aXRoaW4gdGhlIExFUyBob3N0LlxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIG5hbWUgICAgUmVxdWlyZWQuIEV2ZW50IG5hbWU6IFwiZmVlZDppbml0XCIsIFwiaXRlbTpkaXNtaXNzZWRcIlxuICogICBoYW5kbGUgIFJlcXVpcmVkLiBMRVMgYm9keSBcdTIwMTQgc2luZ2xlLWxpbmUgKG5vIGJhY2t0aWNrcykgb3IgbXVsdGktbGluZSAoYmFja3RpY2tzKVxuICpcbiAqIFBoYXNlIDQgd2lyZXMgYSBDdXN0b21FdmVudCBsaXN0ZW5lciBvbiB0aGUgaG9zdCBlbGVtZW50LlxuICogRXZlbnRzIGZpcmVkIGJ5IGBlbWl0YCBuZXZlciBidWJibGU7IG9ubHkgaGFuZGxlcnMgd2l0aGluIHRoZSBzYW1lXG4gKiA8bG9jYWwtZXZlbnQtc2NyaXB0PiBzZWUgdGhlbS4gVXNlIGBicm9hZGNhc3RgIHRvIGNyb3NzIHRoZSBib3VuZGFyeS5cbiAqL1xuZXhwb3J0IGNsYXNzIE9uRXZlbnQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIGdldCBldmVudE5hbWUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICAvKiogUmF3IExFUyBoYW5kbGUgYm9keSAqL1xuICBnZXQgaGFuZGxlQm9keSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnaGFuZGxlJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxvbi1ldmVudD4gcmVnaXN0ZXJlZDonLCB0aGlzLmV2ZW50TmFtZSB8fCAnKHVubmFtZWQpJylcbiAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ29uLWV2ZW50JywgT25FdmVudClcbiIsICIvKipcbiAqIDxvbi1zaWduYWw+IFx1MjAxNCByZWFjdHMgd2hlbmV2ZXIgYSBuYW1lZCBEYXRhc3RhciBzaWduYWwgY2hhbmdlcyB2YWx1ZS5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBuYW1lICAgIFJlcXVpcmVkLiBTaWduYWwgcmVmZXJlbmNlOiBcIiRmZWVkU3RhdGVcIiwgXCIkZmVlZEl0ZW1zXCJcbiAqICAgd2hlbiAgICBPcHRpb25hbC4gR3VhcmQgZXhwcmVzc2lvbiBcdTIwMTQgb25seSBmaXJlcyBoYW5kbGUgd2hlbiB0cnV0aHlcbiAqICAgaGFuZGxlICBSZXF1aXJlZC4gTEVTIGJvZHlcbiAqXG4gKiBQaGFzZSA2IHdpcmVzIHRoaXMgdG8gRGF0YXN0YXIncyBlZmZlY3QoKSBzeXN0ZW0uXG4gKiBVbnRpbCBEYXRhc3RhciBpcyBjb25uZWN0ZWQsIGZhbGxzIGJhY2sgdG8gcG9sbGluZyAoUGhhc2UgNiBkZWNpZGVzKS5cbiAqXG4gKiBUaGUgYHdoZW5gIGd1YXJkIGlzIHJlLWV2YWx1YXRlZCBvbiBldmVyeSBzaWduYWwgY2hhbmdlLlxuICogR3VhcmQgZmFpbHVyZSBpcyBub3QgYW4gZXJyb3IgXHUyMDE0IHRoZSBoYW5kbGUgc2ltcGx5IGRvZXMgbm90IHJ1bi5cbiAqL1xuZXhwb3J0IGNsYXNzIE9uU2lnbmFsIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAvKiogU2lnbmFsIG5hbWUgaW5jbHVkaW5nICQgcHJlZml4OiBcIiRmZWVkU3RhdGVcIiAqL1xuICBnZXQgc2lnbmFsTmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIC8qKiBTaWduYWwgbmFtZSB3aXRob3V0ICQgcHJlZml4LCBmb3IgRGF0YXN0YXIgQVBJIGNhbGxzICovXG4gIGdldCBzaWduYWxLZXkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5zaWduYWxOYW1lLnJlcGxhY2UoL15cXCQvLCAnJylcbiAgfVxuXG4gIGdldCB3aGVuRXhwcigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3doZW4nKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIGdldCBoYW5kbGVCb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdoYW5kbGUnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPG9uLXNpZ25hbD4gcmVnaXN0ZXJlZDonLCB0aGlzLnNpZ25hbE5hbWUgfHwgJyh1bm5hbWVkKScpXG4gIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1zaWduYWwnLCBPblNpZ25hbClcbiIsICIvKipcbiAqIDxvbi1sb2FkPiBcdTIwMTQgZmlyZXMgaXRzIGBydW5gIGJvZHkgb25jZSB3aGVuIHRoZSBob3N0IGNvbm5lY3RzIHRvIHRoZSBET00uXG4gKlxuICogVGltaW5nOiBpZiBkb2N1bWVudC5yZWFkeVN0YXRlID09PSAnY29tcGxldGUnLCBmaXJlcyBpbW1lZGlhdGVseSBpblxuICogY29ubmVjdGVkQ2FsbGJhY2sgKHZpYSBxdWV1ZU1pY3JvdGFzaykuIE90aGVyd2lzZSB3YWl0cyBmb3IgRE9NQ29udGVudExvYWRlZC5cbiAqXG4gKiBSdWxlOiBsaWZlY3ljbGUgaG9va3MgYWx3YXlzIGZpcmUgZXZlbnRzIChgZW1pdGApLCBuZXZlciBjYWxsIGNvbW1hbmRzIGRpcmVjdGx5LlxuICogVGhpcyBrZWVwcyB0aGUgc3lzdGVtIHRyYWNlYWJsZSBcdTIwMTQgZXZlcnkgY29tbWFuZCBpbnZvY2F0aW9uIGhhcyBhbiBldmVudCBpbiBpdHMgaGlzdG9yeS5cbiAqXG4gKiBBdHRyaWJ1dGVzOlxuICogICBydW4gICBSZXF1aXJlZC4gU2luZ2xlLWxpbmUgTEVTIGJvZHkgKHVzdWFsbHkganVzdCBgZW1pdCBldmVudDpuYW1lYClcbiAqL1xuZXhwb3J0IGNsYXNzIE9uTG9hZCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgZ2V0IHJ1bkJvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8b24tbG9hZD4gcmVnaXN0ZXJlZCwgcnVuOicsIHRoaXMucnVuQm9keSlcbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiA8b24tZW50ZXI+IFx1MjAxNCBmaXJlcyB3aGVuIHRoZSBob3N0IDxsb2NhbC1ldmVudC1zY3JpcHQ+IGVudGVycyB0aGUgdmlld3BvcnQuXG4gKlxuICogVXNlcyBhIHNpbmdsZSBJbnRlcnNlY3Rpb25PYnNlcnZlciBzaGFyZWQgYWNyb3NzIGFsbCA8b24tZW50ZXI+Lzxvbi1leGl0PlxuICogY2hpbGRyZW4gb2YgdGhlIHNhbWUgaG9zdCAoUGhhc2UgNSBjcmVhdGVzIGl0IG9uIHRoZSBob3N0IGVsZW1lbnQpLlxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIHdoZW4gIE9wdGlvbmFsLiBHdWFyZCBleHByZXNzaW9uIFx1MjAxNCBvbmx5IGZpcmVzIHJ1biB3aGVuIHRydXRoeS5cbiAqICAgICAgICAgIFBhdHRlcm46IGB3aGVuPVwiJGZlZWRTdGF0ZSA9PSAncGF1c2VkJ1wiYFxuICogICBydW4gICBSZXF1aXJlZC4gU2luZ2xlLWxpbmUgTEVTIGJvZHkuXG4gKi9cbmV4cG9ydCBjbGFzcyBPbkVudGVyIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBnZXQgd2hlbkV4cHIoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCd3aGVuJyk/LnRyaW0oKSA/PyBudWxsXG4gIH1cblxuICBnZXQgcnVuQm9keSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxvbi1lbnRlcj4gcmVnaXN0ZXJlZCwgd2hlbjonLCB0aGlzLndoZW5FeHByID8/ICdhbHdheXMnKVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIDxvbi1leGl0PiBcdTIwMTQgZmlyZXMgd2hlbiB0aGUgaG9zdCA8bG9jYWwtZXZlbnQtc2NyaXB0PiBleGl0cyB0aGUgdmlld3BvcnQuXG4gKlxuICogTm8gYHdoZW5gIGd1YXJkIFx1MjAxNCBleGl0IGFsd2F5cyBmaXJlcyB1bmNvbmRpdGlvbmFsbHkuXG4gKiAoSWYgeW91IG5lZWQgY29uZGl0aW9uYWwgZXhpdCBiZWhhdmlvciwgcHV0IHRoZSBjb25kaXRpb24gaW4gdGhlIGhhbmRsZXIuKVxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIHJ1biAgIFJlcXVpcmVkLiBTaW5nbGUtbGluZSBMRVMgYm9keS5cbiAqL1xuZXhwb3J0IGNsYXNzIE9uRXhpdCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgZ2V0IHJ1bkJvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8b24tZXhpdD4gcmVnaXN0ZXJlZCwgcnVuOicsIHRoaXMucnVuQm9keSlcbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgUmVnaXN0cmF0aW9uIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ29uLWxvYWQnLCAgT25Mb2FkKVxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdvbi1lbnRlcicsIE9uRW50ZXIpXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ29uLWV4aXQnLCAgT25FeGl0KVxuIiwgIi8qKlxuICogPHVzZS1tb2R1bGU+IFx1MjAxNCBkZWNsYXJlcyBhIHZvY2FidWxhcnkgZXh0ZW5zaW9uIGF2YWlsYWJsZSB0byA8bG9jYWwtY29tbWFuZD4gYm9kaWVzLlxuICpcbiAqIE11c3QgYXBwZWFyIGJlZm9yZSBhbnkgPGxvY2FsLWNvbW1hbmQ+IGluIHRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0Pi5cbiAqIFRoZSBob3N0IHJlYWRzIDx1c2UtbW9kdWxlPiBjaGlsZHJlbiBmaXJzdCAoUGhhc2UgOCkgYW5kIHJlZ2lzdGVyc1xuICogdGhlaXIgcHJpbWl0aXZlcyBpbnRvIGl0cyBNb2R1bGVSZWdpc3RyeSBiZWZvcmUgcGFyc2luZyBjb21tYW5kIGJvZGllcy5cbiAqXG4gKiBBdHRyaWJ1dGVzIChpbmRlcGVuZGVudCwgY29tYmluYWJsZSk6XG4gKiAgIHR5cGUgICBCdWlsdC1pbiBtb2R1bGUgbmFtZTogXCJhbmltYXRpb25cIlxuICogICBzcmMgICAgVVJML3BhdGggdG8gYSB1c2VybGFuZCBtb2R1bGUgRVMgbW9kdWxlOiAgXCIuL3Njcm9sbC1lZmZlY3RzLmpzXCJcbiAqICAgICAgICAgIFRoZSBtb2R1bGUgbXVzdCBleHBvcnQgYSBkZWZhdWx0IGNvbmZvcm1pbmcgdG8gTEVTTW9kdWxlOlxuICogICAgICAgICAgeyBuYW1lOiBzdHJpbmcsIHByaW1pdGl2ZXM6IFJlY29yZDxzdHJpbmcsIExFU1ByaW1pdGl2ZT4gfVxuICpcbiAqIEV4YW1wbGVzOlxuICogICA8dXNlLW1vZHVsZSB0eXBlPVwiYW5pbWF0aW9uXCI+PC91c2UtbW9kdWxlPlxuICogICA8dXNlLW1vZHVsZSBzcmM9XCIuL3Njcm9sbC1lZmZlY3RzLmpzXCI+PC91c2UtbW9kdWxlPlxuICogICA8dXNlLW1vZHVsZSBzcmM9XCIuL3NwcmluZy1waHlzaWNzLmpzXCI+PC91c2UtbW9kdWxlPlxuICpcbiAqIHR5cGU9IGFuZCBzcmM9IG1heSBhcHBlYXIgdG9nZXRoZXIgb24gb25lIGVsZW1lbnQgaWYgdGhlIHVzZXJsYW5kIG1vZHVsZVxuICogd2FudHMgdG8gZGVjbGFyZSBpdHMgdHlwZSBoaW50IGZvciB0b29saW5nIChub3QgY3VycmVudGx5IHJlcXVpcmVkKS5cbiAqL1xuZXhwb3J0IGNsYXNzIFVzZU1vZHVsZSBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgLyoqIEJ1aWx0LWluIG1vZHVsZSB0eXBlIGUuZy4gXCJhbmltYXRpb25cIiAqL1xuICBnZXQgbW9kdWxlVHlwZSgpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3R5cGUnKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIC8qKiBVc2VybGFuZCBtb2R1bGUgVVJMIGUuZy4gXCIuL3Njcm9sbC1lZmZlY3RzLmpzXCIgKi9cbiAgZ2V0IG1vZHVsZVNyYygpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3NyYycpPy50cmltKCkgPz8gbnVsbFxuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc3QgZGVzYyA9IHRoaXMubW9kdWxlVHlwZVxuICAgICAgPyBgdHlwZT1cIiR7dGhpcy5tb2R1bGVUeXBlfVwiYFxuICAgICAgOiB0aGlzLm1vZHVsZVNyY1xuICAgICAgICA/IGBzcmM9XCIke3RoaXMubW9kdWxlU3JjfVwiYFxuICAgICAgICA6ICcobm8gdHlwZSBvciBzcmMpJ1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8dXNlLW1vZHVsZT4gZGVjbGFyZWQ6JywgZGVzYylcbiAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ3VzZS1tb2R1bGUnLCBVc2VNb2R1bGUpXG4iLCAiLyoqXG4gKiBQaGFzZSA2OiBEYXRhc3RhciBhdHRyaWJ1dGUgcGx1Z2luXG4gKlxuICogUmVnaXN0ZXJzIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGFzIGEgRGF0YXN0YXIgYXR0cmlidXRlIHBsdWdpbiBzbyB0aGF0OlxuICpcbiAqICAgMS4gRGF0YXN0YXIncyBlZmZlY3QoKSBhbmQgc2lnbmFsKCkgcHJpbWl0aXZlcyBhcmUgaGFuZGVkIHRvIHRoZSBob3N0XG4gKiAgICAgIGVsZW1lbnQsIGVuYWJsaW5nIHByb3BlciByZWFjdGl2ZSBzaWduYWwgd2F0Y2hpbmcgdmlhIHRoZSBkZXBlbmRlbmN5XG4gKiAgICAgIGdyYXBoIHJhdGhlciB0aGFuIG1hbnVhbCBub3RpZmljYXRpb24uXG4gKlxuICogICAyLiBTaWduYWwgd3JpdGVzIGZyb20gYHNldCAkeCB0byB5YCBpbiBMRVMgcHJvcGFnYXRlIGludG8gRGF0YXN0YXInc1xuICogICAgICByb290IG9iamVjdCBzbyBkYXRhLXRleHQsIGRhdGEtc2hvdywgZXRjLiB1cGRhdGUgcmVhY3RpdmVseS5cbiAqXG4gKiAgIDMuICQtcHJlZml4ZWQgc2lnbmFscyBpbiBMRVMgZXhwcmVzc2lvbnMgcmVzb2x2ZSBmcm9tIERhdGFzdGFyJ3Mgcm9vdCxcbiAqICAgICAgZ2l2aW5nIExFUyBmdWxsIHJlYWQgYWNjZXNzIHRvIGFsbCBEYXRhc3RhciBzdGF0ZS5cbiAqXG4gKiAgIDQuIFNpZ25hbCB3YXRjaGVycyBvbi1zaWduYWwgYXJlIHJlLXdpcmVkIHRocm91Z2ggRGF0YXN0YXIncyBlZmZlY3QoKVxuICogICAgICBzeXN0ZW0gZm9yIHByb3BlciBiYXRjaGluZyBhbmQgZGVkdXBsaWNhdGlvbi5cbiAqXG4gKiBMRVMgd29ya3Mgd2l0aG91dCBEYXRhc3RhciAoc3RhbmRhbG9uZSBtb2RlKS4gVGhlIGJyaWRnZSBpcyBwdXJlbHkgYWRkaXRpdmUuXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBMb2NhbEV2ZW50U2NyaXB0IH0gZnJvbSAnQGVsZW1lbnRzL0xvY2FsRXZlbnRTY3JpcHQuanMnXG5pbXBvcnQgeyB3aXJlU2lnbmFsV2F0Y2hlclZpYURhdGFzdGFyIH0gZnJvbSAnQHJ1bnRpbWUvc2lnbmFscy5qcydcblxubGV0IGJyaWRnZVJlZ2lzdGVyZWQgPSBmYWxzZVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVnaXN0ZXJEYXRhc3RhckJyaWRnZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKGJyaWRnZVJlZ2lzdGVyZWQpIHJldHVyblxuXG4gIHRyeSB7XG4gICAgY29uc3QgZGF0YXN0YXIgPSBhd2FpdCBpbXBvcnQoJ2RhdGFzdGFyJylcbiAgICBjb25zdCB7IGF0dHJpYnV0ZSB9ID0gZGF0YXN0YXJcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBSZWdpc3RlciBhcyBhIERhdGFzdGFyIGF0dHJpYnV0ZSBwbHVnaW4gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgLy8gTWF0Y2hlcyBlbGVtZW50cyB3aXRoIGEgYGRhdGEtbG9jYWwtZXZlbnQtc2NyaXB0YCBhdHRyaWJ1dGUgT1IgKHZpYVxuICAgIC8vIG5hbWUgbWF0Y2hpbmcpIHRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBjdXN0b20gZWxlbWVudCBpdHNlbGYgd2hlblxuICAgIC8vIERhdGFzdGFyIHNjYW5zIHRoZSBET00uXG4gICAgLy9cbiAgICAvLyBUaGUgbmFtZSAnbG9jYWwtZXZlbnQtc2NyaXB0JyBjYXVzZXMgRGF0YXN0YXIgdG8gYXBwbHkgdGhpcyBwbHVnaW5cbiAgICAvLyB0byBhbnkgZWxlbWVudCB3aXRoIGRhdGEtbG9jYWwtZXZlbnQtc2NyaXB0PVwiLi4uXCIgaW4gdGhlIERPTS5cbiAgICAvLyBXZSBhbHNvIHBhdGNoIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGRpcmVjdGx5IGluIHRoZSBNdXRhdGlvbk9ic2VydmVyXG4gICAgLy8gcGF0aCB2aWEgdGhlIGhvc3QgZWxlbWVudCdzIGNvbm5lY3RlZENhbGxiYWNrLlxuICAgIGF0dHJpYnV0ZSh7XG4gICAgICBuYW1lOiAnbG9jYWwtZXZlbnQtc2NyaXB0JyxcbiAgICAgIHJlcXVpcmVtZW50OiB7XG4gICAgICAgIGtleTogJ2RlbmllZCcsXG4gICAgICAgIHZhbHVlOiAnZGVuaWVkJyxcbiAgICAgIH0sXG4gICAgICBhcHBseSh7IGVsLCBlZmZlY3QsIHNpZ25hbCB9KSB7XG4gICAgICAgIGNvbnN0IGhvc3QgPSBlbCBhcyBMb2NhbEV2ZW50U2NyaXB0XG5cbiAgICAgICAgLy8gUGhhc2UgNmE6IGhhbmQgRGF0YXN0YXIncyByZWFjdGl2ZSBwcmltaXRpdmVzIHRvIHRoZSBob3N0XG4gICAgICAgIGhvc3QuY29ubmVjdERhdGFzdGFyKHsgZWZmZWN0LCBzaWduYWwgfSlcblxuICAgICAgICAvLyBQaGFzZSA2YjogaWYgdGhlIGhvc3QgaXMgYWxyZWFkeSBpbml0aWFsaXplZCAod2lyaW5nIHJhbiBiZWZvcmVcbiAgICAgICAgLy8gRGF0YXN0YXIgYXR0cmlidXRlIHBsdWdpbiBmaXJlZCksIHJlLXdpcmUgc2lnbmFsIHdhdGNoZXJzIHRocm91Z2hcbiAgICAgICAgLy8gRGF0YXN0YXIncyBlZmZlY3QoKSBmb3IgcHJvcGVyIHJlYWN0aXZpdHlcbiAgICAgICAgY29uc3Qgd2lyaW5nID0gaG9zdC53aXJpbmdcbiAgICAgICAgaWYgKHdpcmluZyAmJiB3aXJpbmcud2F0Y2hlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgIGZvciAoY29uc3Qgd2F0Y2hlciBvZiB3aXJpbmcud2F0Y2hlcnMpIHtcbiAgICAgICAgICAgIHdpcmVTaWduYWxXYXRjaGVyVmlhRGF0YXN0YXIod2F0Y2hlciwgZWZmZWN0LCAoKSA9PiBob3N0LmNvbnRleHQhKVxuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zb2xlLmxvZyhgW0xFUzpkYXRhc3Rhcl0gcmUtd2lyZWQgJHt3aXJpbmcud2F0Y2hlcnMubGVuZ3RofSBzaWduYWwgd2F0Y2hlcnMgdmlhIERhdGFzdGFyIGVmZmVjdCgpYClcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCdbTEVTOmRhdGFzdGFyXSBhdHRyaWJ1dGUgcGx1Z2luIGFwcGxpZWQgdG8nLCBlbC5pZCB8fCBlbC50YWdOYW1lKVxuXG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgaG9zdC5kaXNjb25uZWN0RGF0YXN0YXIoKVxuICAgICAgICAgIGNvbnNvbGUubG9nKCdbTEVTOmRhdGFzdGFyXSBhdHRyaWJ1dGUgcGx1Z2luIGNsZWFuZWQgdXAnLCBlbC5pZCB8fCBlbC50YWdOYW1lKVxuICAgICAgICB9XG4gICAgICB9LFxuICAgIH0pXG5cbiAgICBicmlkZ2VSZWdpc3RlcmVkID0gdHJ1ZVxuICAgIGNvbnNvbGUubG9nKCdbTEVTOmRhdGFzdGFyXSBicmlkZ2UgcmVnaXN0ZXJlZCcpXG5cbiAgfSBjYXRjaCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIHJ1bm5pbmcgaW4gc3RhbmRhbG9uZSBtb2RlIChEYXRhc3RhciBub3QgYXZhaWxhYmxlKScpXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBTaWduYWwgaW50ZWdyYXRpb24gdXRpbGl0aWVzXG4vLyBVc2VkIGJ5IGV4ZWN1dG9yLnRzIHdoZW4gRGF0YXN0YXIgaXMgcHJlc2VudFxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogUmVhZHMgYSBzaWduYWwgdmFsdWUgZnJvbSBEYXRhc3RhcidzIHJvb3Qgb2JqZWN0LlxuICogRmFsbHMgYmFjayB0byB1bmRlZmluZWQgaWYgRGF0YXN0YXIgaXMgbm90IGF2YWlsYWJsZS5cbiAqXG4gKiBUaGlzIGlzIGNhbGxlZCBieSB0aGUgTEVTQ29udGV4dC5nZXRTaWduYWwgZnVuY3Rpb24gd2hlbiB0aGUgRGF0YXN0YXJcbiAqIGJyaWRnZSBpcyBjb25uZWN0ZWQsIGdpdmluZyBMRVMgZXhwcmVzc2lvbnMgYWNjZXNzIHRvIGFsbCBEYXRhc3RhciBzaWduYWxzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVhZERhdGFzdGFyU2lnbmFsKFxuICBuYW1lOiBzdHJpbmcsXG4gIGRzU2lnbmFsOiAoPFQ+KG5hbWU6IHN0cmluZywgaW5pdD86IFQpID0+IHsgdmFsdWU6IFQgfSkgfCB1bmRlZmluZWRcbik6IHVua25vd24ge1xuICBpZiAoIWRzU2lnbmFsKSByZXR1cm4gdW5kZWZpbmVkXG4gIHRyeSB7XG4gICAgcmV0dXJuIGRzU2lnbmFsKG5hbWUpLnZhbHVlXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxufVxuXG4vKipcbiAqIFdyaXRlcyBhIHZhbHVlIHRvIERhdGFzdGFyJ3Mgc2lnbmFsIHRyZWUuXG4gKiBUaGlzIHRyaWdnZXJzIERhdGFzdGFyJ3MgcmVhY3RpdmUgZ3JhcGggXHUyMDE0IGFueSBkYXRhLXRleHQsIGRhdGEtc2hvdyxcbiAqIGRhdGEtY2xhc3MgYXR0cmlidXRlcyBib3VuZCB0byB0aGlzIHNpZ25hbCB3aWxsIHVwZGF0ZSBhdXRvbWF0aWNhbGx5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gd3JpdGVEYXRhc3RhclNpZ25hbChcbiAgbmFtZTogc3RyaW5nLFxuICB2YWx1ZTogdW5rbm93bixcbiAgZHNTaWduYWw6ICg8VD4obmFtZTogc3RyaW5nLCBpbml0PzogVCkgPT4geyB2YWx1ZTogVCB9KSB8IHVuZGVmaW5lZFxuKTogdm9pZCB7XG4gIGlmICghZHNTaWduYWwpIHJldHVyblxuICB0cnkge1xuICAgIGNvbnN0IHNpZyA9IGRzU2lnbmFsPHVua25vd24+KG5hbWUsIHZhbHVlKVxuICAgIHNpZy52YWx1ZSA9IHZhbHVlXG4gIH0gY2F0Y2gge1xuICAgIC8vIFNpZ25hbCBtYXkgbm90IGV4aXN0IHlldCBcdTIwMTQgaXQgd2lsbCBiZSBjcmVhdGVkIGJ5IGRhdGEtc2lnbmFscyBvbiB0aGUgaG9zdFxuICB9XG59XG4iLCAiLyoqXG4gKiBsb2NhbC1ldmVudC1zY3JpcHQgXHUyMDE0IG1haW4gZW50cnkgcG9pbnRcbiAqXG4gKiBJbXBvcnQgb3JkZXIgbWF0dGVycyBmb3IgY3VzdG9tIGVsZW1lbnQgcmVnaXN0cmF0aW9uOlxuICogICAxLiBIb3N0IGVsZW1lbnQgZmlyc3QgKExvY2FsRXZlbnRTY3JpcHQpXG4gKiAgIDIuIENoaWxkIGVsZW1lbnRzIHRoYXQgcmVmZXJlbmNlIGl0XG4gKiAgIDMuIERhdGFzdGFyIGJyaWRnZSBsYXN0IChvcHRpb25hbCBcdTIwMTQgZmFpbHMgZ3JhY2VmdWxseSBpZiBEYXRhc3RhciBhYnNlbnQpXG4gKlxuICogVXNhZ2UgdmlhIGltcG9ydG1hcCArIHNjcmlwdCB0YWc6XG4gKlxuICogICA8c2NyaXB0IHR5cGU9XCJpbXBvcnRtYXBcIj5cbiAqICAgICB7XG4gKiAgICAgICBcImltcG9ydHNcIjoge1xuICogICAgICAgICBcImRhdGFzdGFyXCI6IFwiaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L2doL3N0YXJmZWRlcmF0aW9uL2RhdGFzdGFyQHYxLjAuMC1SQy44L2J1bmRsZXMvZGF0YXN0YXIuanNcIlxuICogICAgICAgfVxuICogICAgIH1cbiAqICAgPC9zY3JpcHQ+XG4gKiAgIDxzY3JpcHQgdHlwZT1cIm1vZHVsZVwiIHNyYz1cIi9kaXN0L2xvY2FsLWV2ZW50LXNjcmlwdC5qc1wiPjwvc2NyaXB0PlxuICpcbiAqIFdpdGhvdXQgdGhlIGltcG9ydG1hcCAob3Igd2l0aCBkYXRhc3RhciBhYnNlbnQpLCBMRVMgcnVucyBpbiBzdGFuZGFsb25lIG1vZGU6XG4gKiBhbGwgY3VzdG9tIGVsZW1lbnRzIHdvcmssIERhdGFzdGFyIHNpZ25hbCB3YXRjaGluZyBhbmQgQGFjdGlvbiBwYXNzdGhyb3VnaFxuICogYXJlIHVuYXZhaWxhYmxlLlxuICovXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBDdXN0b20gZWxlbWVudHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBFYWNoIGltcG9ydCByZWdpc3RlcnMgaXRzIGVsZW1lbnQocykgYXMgYSBzaWRlIGVmZmVjdC5cblxuZXhwb3J0IHsgTG9jYWxFdmVudFNjcmlwdCB9IGZyb20gJ0BlbGVtZW50cy9Mb2NhbEV2ZW50U2NyaXB0LmpzJ1xuZXhwb3J0IHsgTG9jYWxDb21tYW5kIH0gICAgIGZyb20gJ0BlbGVtZW50cy9Mb2NhbENvbW1hbmQuanMnXG5leHBvcnQgeyBPbkV2ZW50IH0gICAgICAgICAgZnJvbSAnQGVsZW1lbnRzL09uRXZlbnQuanMnXG5leHBvcnQgeyBPblNpZ25hbCB9ICAgICAgICAgZnJvbSAnQGVsZW1lbnRzL09uU2lnbmFsLmpzJ1xuZXhwb3J0IHsgT25Mb2FkLCBPbkVudGVyLCBPbkV4aXQgfSBmcm9tICdAZWxlbWVudHMvTGlmZWN5Y2xlLmpzJ1xuZXhwb3J0IHsgVXNlTW9kdWxlIH0gICAgICAgIGZyb20gJ0BlbGVtZW50cy9Vc2VNb2R1bGUuanMnXG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBSdW50aW1lIHV0aWxpdGllcyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBSZXNvbHZlcyBvbmNlIGFsbCBMRVMgY3VzdG9tIGVsZW1lbnRzIGFyZSBkZWZpbmVkIGFuZCByZWFkeSB0byB1c2UuXG4gKlxuICogUHJpbWFyaWx5IHVzZWZ1bCB3aGVuIGxvYWRpbmcgTEVTIHZpYSBkeW5hbWljIGltcG9ydCgpIG9yIGZyb20gYSBDRE4sXG4gKiB3aGVyZSB0aGUgY2FsbGVyIGNhbm5vdCBiZSBjZXJ0YWluIHRoZSBidW5kbGUgaGFzIGV2YWx1YXRlZCBiZWZvcmVcbiAqIGF0dGVtcHRpbmcgdG8gY3JlYXRlIG9yIGludGVyYWN0IHdpdGggTEVTIGVsZW1lbnRzLlxuICpcbiAqICAgY29uc3QgeyBsZXNSZWFkeSB9ID0gYXdhaXQgaW1wb3J0KCcuL2xvY2FsLWV2ZW50LXNjcmlwdC5qcycpXG4gKiAgIGF3YWl0IGxlc1JlYWR5XG4gKiAgIC8vIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGlzIG5vdyBkZWZpbmVkOyBzYWZlIHRvIGF0dGFjaCBlbGVtZW50c1xuICpcbiAqIFdoZW4gbG9hZGluZyB2aWEgYSBzdGF0aWMgPHNjcmlwdCB0eXBlPVwibW9kdWxlXCI+IGluIDxoZWFkPiwgZWxlbWVudHMgYXJlXG4gKiBkZWZpbmVkIHN5bmNocm9ub3VzbHkgZHVyaW5nIG1vZHVsZSBldmFsdWF0aW9uIFx1MjAxNCBsZXNSZWFkeSByZXNvbHZlcyBvbiB0aGVcbiAqIG5leHQgbWljcm90YXNrIGFuZCBpcyBlZmZlY3RpdmVseSBpbW1lZGlhdGUuXG4gKi9cbmV4cG9ydCBjb25zdCBsZXNSZWFkeTogUHJvbWlzZTx2b2lkPiA9XG4gIGN1c3RvbUVsZW1lbnRzLndoZW5EZWZpbmVkKCdsb2NhbC1ldmVudC1zY3JpcHQnKS50aGVuKCgpID0+IHVuZGVmaW5lZClcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFR5cGUgZXhwb3J0cyAoZm9yIFR5cGVTY3JpcHQgY29uc3VtZXJzKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbmV4cG9ydCB0eXBlIHsgTEVTTm9kZSB9ICAgICAgICAgICAgICAgICAgIGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuZXhwb3J0IHR5cGUgeyBMRVNNb2R1bGUsIExFU1ByaW1pdGl2ZSB9ICAgZnJvbSAnQG1vZHVsZXMvdHlwZXMuanMnXG5leHBvcnQgdHlwZSB7IENvbW1hbmREZWYsIEFyZ0RlZiB9ICAgICAgICBmcm9tICdAcnVudGltZS9yZWdpc3RyeS5qcydcbmV4cG9ydCB7IExFU1Njb3BlIH0gICAgICAgICAgICAgICAgICAgICAgIGZyb20gJ0BydW50aW1lL3Njb3BlLmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgRGF0YXN0YXIgYnJpZGdlIChvcHRpb25hbCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBEeW5hbWljIGltcG9ydCBzbyB0aGUgYnVuZGxlIHdvcmtzIHdpdGhvdXQgRGF0YXN0YXIgcHJlc2VudC5cbmltcG9ydCB7IHJlZ2lzdGVyRGF0YXN0YXJCcmlkZ2UgfSBmcm9tICdAZGF0YXN0YXIvcGx1Z2luLmpzJ1xucmVnaXN0ZXJEYXRhc3RhckJyaWRnZSgpXG5leHBvcnQgdHlwZSB7IExFU0NvbmZpZywgQ29tbWFuZERlY2wsIEV2ZW50SGFuZGxlckRlY2wsIFNpZ25hbFdhdGNoZXJEZWNsLFxuICAgICAgICAgICAgICBPbkxvYWREZWNsLCBPbkVudGVyRGVjbCwgT25FeGl0RGVjbCwgTW9kdWxlRGVjbCB9IGZyb20gJ0BwYXJzZXIvY29uZmlnLmpzJ1xuZXhwb3J0IHsgcmVhZENvbmZpZywgbG9nQ29uZmlnIH0gZnJvbSAnQHBhcnNlci9yZWFkZXIuanMnXG5leHBvcnQgeyBzdHJpcEJvZHkgfSAgICAgICAgICAgICBmcm9tICdAcGFyc2VyL3N0cmlwQm9keS5qcydcbmV4cG9ydCB7IHBhcnNlTEVTLCBMRVNQYXJzZXIsIExFU1BhcnNlRXJyb3IgfSBmcm9tICdAcGFyc2VyL2luZGV4LmpzJ1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7QUEwREEsU0FBUyxLQUFLLEdBQW1CO0FBQUUsU0FBTyxJQUFJLElBQUksS0FBSyxLQUFLLElBQUksSUFBSSxNQUFNO0FBQUk7QUFDOUUsU0FBUyxLQUFLLEdBQVcsR0FBVyxHQUFtQjtBQUFFLFNBQU8sSUFBSSxLQUFLLElBQUk7QUFBRztBQUNoRixTQUFTLE1BQU0sTUFBYyxHQUFXLEdBQW1CO0FBQ3pELFFBQU0sSUFBSSxPQUFPO0FBQ2pCLFFBQU0sSUFBSSxJQUFJLElBQUksSUFBSTtBQUN0QixRQUFNLElBQUksSUFBSSxJQUFJLElBQUk7QUFDdEIsVUFBUyxJQUFJLElBQUssQ0FBQyxJQUFJLE1BQU8sSUFBSSxJQUFLLENBQUMsSUFBSTtBQUM5QztBQUdPLFNBQVMsUUFBUSxHQUFXLEdBQW1C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QUs7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFNO0FBQUEsUUFBRTtBQUFBLFFBQzVEO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFHO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFDNUQ7QUFBQSxRQUFHO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUMzRDtBQUFBLFFBQUc7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQzNEO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFDNUQ7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFNO0FBQUEsUUFBRTtBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUM1RDtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFNO0FBQUEsUUFBRztBQUFBLFFBQzVEO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFNO0FBQUEsUUFBRTtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFDNUQ7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUM1RDtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBTTtBQUFBLFFBQUc7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBTTtBQUFBLFFBQzlEO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFDNUQ7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxR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
