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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL21vZHVsZXMvYnVpbHRpbi9zaGFrZS50cyIsICIuLi9zcmMvbW9kdWxlcy9idWlsdGluL2FuaW1hdGlvbi50cyIsICIuLi9zcmMvcnVudGltZS9leGVjdXRvci50cyIsICIuLi9zcmMvcnVudGltZS9yZWdpc3RyeS50cyIsICIuLi9zcmMvbW9kdWxlcy90eXBlcy50cyIsICIuLi9zcmMvcGFyc2VyL3N0cmlwQm9keS50cyIsICIuLi9zcmMvcGFyc2VyL3JlYWRlci50cyIsICIuLi9zcmMvcGFyc2VyL3Rva2VuaXplci50cyIsICIuLi9zcmMvcGFyc2VyL3BhcnNlci50cyIsICIuLi9zcmMvcGFyc2VyL2luZGV4LnRzIiwgIi4uL3NyYy9ydW50aW1lL3dpcmluZy50cyIsICIuLi9zcmMvcnVudGltZS9zY29wZS50cyIsICIuLi9zcmMvcnVudGltZS9vYnNlcnZlci50cyIsICIuLi9zcmMvcnVudGltZS9zaWduYWxzLnRzIiwgIi4uL3NyYy9lbGVtZW50cy9Mb2NhbEV2ZW50U2NyaXB0LnRzIiwgIi4uL3NyYy9lbGVtZW50cy9Mb2NhbENvbW1hbmQudHMiLCAiLi4vc3JjL2VsZW1lbnRzL09uRXZlbnQudHMiLCAiLi4vc3JjL2VsZW1lbnRzL09uU2lnbmFsLnRzIiwgIi4uL3NyYy9lbGVtZW50cy9MaWZlY3ljbGUudHMiLCAiLi4vc3JjL2VsZW1lbnRzL1VzZU1vZHVsZS50cyIsICIuLi9zcmMvZGF0YXN0YXIvcGx1Z2luLnRzIiwgIi4uL3NyYy9pbmRleC50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBTaGFrZSBhbmltYXRpb24gcHJpbWl0aXZlXG4gKlxuICogR2VuZXJhdGVzIGEgbm9pc2UtZHJpdmVuIGRpc3BsYWNlbWVudCBrZXlmcmFtZSBzZXF1ZW5jZSBhbmQgcGxheXMgaXRcbiAqIHZpYSB0aGUgV2ViIEFuaW1hdGlvbnMgQVBJLiBUaHJlZSBub2lzZSBtb2RlczpcbiAqXG4gKiAgIHJlZ3VsYXIgIFx1MjAxNCBkYW1wZWQgc2ludXNvaWRhbCBvc2NpbGxhdGlvbiB3aXRoIGhhcm1vbmljcyAoZGVmYXVsdClcbiAqICAgcGVybGluICAgXHUyMDE0IEtlbiBQZXJsaW4ncyBpbXByb3ZlZCBncmFkaWVudCBub2lzZSAoc21vb3RoLCBvcmdhbmljKVxuICogICBzaW1wbGV4ICBcdTIwMTQgU2ltcGxleCBub2lzZSAoc21vb3RoZXIgZ3JhZGllbnRzLCBubyBheGlzLWFsaWduZWQgYXJ0ZWZhY3RzKVxuICpcbiAqIEF4aXMgb3B0aW9uczogeCB8IHkgfCB6IHwgeHkgfCB4eXpcbiAqICAgeCAgIFx1MjE5MiB0cmFuc2xhdGVYXG4gKiAgIHkgICBcdTIxOTIgdHJhbnNsYXRlWVxuICogICB6ICAgXHUyMTkyIHJvdGF0ZVogKHNjcmVlbi1zaGFrZSAvIGNhbWVyYS1zaGFrZSBmZWVsKVxuICogICB4eSAgXHUyMTkyIHRyYW5zbGF0ZVggKyB0cmFuc2xhdGVZIChpbmRlcGVuZGVudCBub2lzZSBjaGFubmVscylcbiAqICAgeHl6IFx1MjE5MiB0cmFuc2xhdGVYICsgdHJhbnNsYXRlWSArIHJvdGF0ZVpcbiAqXG4gKiBPcHRpb25zIChhbGwgb3B0aW9uYWwpOlxuICogICBheGlzOiAgICAgIHggfCB5IHwgeiB8IHh5IHwgeHl6ICAgKGRlZmF1bHQ6IHgpXG4gKiAgIG5vaXNlOiAgICAgcmVndWxhciB8IHBlcmxpbiB8IHNpbXBsZXggIChkZWZhdWx0OiByZWd1bGFyKVxuICogICBhbXBsaXR1ZGU6IE5weCAgICAgICAgICAgICAgICAgICAgKGRlZmF1bHQ6IDhweClcbiAqICAgZGVjYXk6ICAgICB0cnVlIHwgZmFsc2UgICAgICAgICAgIChkZWZhdWx0OiB0cnVlIFx1MjAxNCBhbXBsaXR1ZGUgZmFkZXMgb3V0KVxuICogICBmcmVxdWVuY3k6IE4gICAgICAgICAgICAgICAgICAgICAgKGRlZmF1bHQ6IDggXHUyMDE0IG9zY2lsbGF0aW9ucy9zZWMgZm9yIHJlZ3VsYXIpXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBMRVNQcmltaXRpdmUgfSBmcm9tICcuLi90eXBlcy5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQZXJsaW4gbm9pc2UgXHUyMDE0IEtlbiBQZXJsaW4ncyBpbXByb3ZlZCAyMDAyIHZlcnNpb25cbi8vIFdlIHVzZSAyRCBldmFsdWF0aW9uOiBub2lzZSh0LCBjaGFubmVsKSB3aGVyZSBjaGFubmVsIGlzIGEgZml4ZWQgb2Zmc2V0XG4vLyB0aGF0IGdpdmVzIGluZGVwZW5kZW50IGN1cnZlcyBmb3IgeCB2cyB5IHZzIHouXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgUEVSTElOX1BFUk06IFVpbnQ4QXJyYXkgPSAoKCkgPT4ge1xuICAvLyBGaXhlZCBwZXJtdXRhdGlvbiB0YWJsZSAoZGV0ZXJtaW5pc3RpYywgbm8gcmFuZG9tbmVzcyBuZWVkZWQgZm9yIGFuaW1hdGlvbilcbiAgY29uc3QgcCA9IG5ldyBVaW50OEFycmF5KDUxMilcbiAgY29uc3QgYmFzZSA9IFtcbiAgICAxNTEsMTYwLDEzNywgOTEsIDkwLCAxNSwxMzEsIDEzLDIwMSwgOTUsIDk2LCA1MywxOTQsMjMzLCAgNywyMjUsXG4gICAgMTQwLCAzNiwxMDMsIDMwLCA2OSwxNDIsICA4LCA5OSwgMzcsMjQwLCAyMSwgMTAsIDIzLDE5MCwgIDYsMTQ4LFxuICAgIDI0NywxMjAsMjM0LCA3NSwgIDAsIDI2LDE5NywgNjIsIDk0LDI1MiwyMTksMjAzLDExNywgMzUsIDExLCAzMixcbiAgICAgNTcsMTc3LCAzMywgODgsMjM3LDE0OSwgNTYsIDg3LDE3NCwgMjAsMTI1LDEzNiwxNzEsMTY4LCA2OCwxNzUsXG4gICAgIDc0LDE2NSwgNzEsMTM0LDEzOSwgNDgsIDI3LDE2NiwgNzcsMTQ2LDE1OCwyMzEsIDgzLDExMSwyMjksMTIyLFxuICAgICA2MCwyMTEsMTMzLDIzMCwyMjAsMTA1LCA5MiwgNDEsIDU1LCA0NiwyNDUsIDQwLDI0NCwxMDIsMTQzLCA1NCxcbiAgICAgNjUsIDI1LCA2MywxNjEsICAxLDIxNiwgODAsIDczLDIwOSwgNzYsMTMyLDE4NywyMDgsIDg5LCAxOCwxNjksXG4gICAgMjAwLDE5NiwxMzUsMTMwLDExNiwxODgsMTU5LCA4NiwxNjQsMTAwLDEwOSwxOTgsMTczLDE4NiwgIDMsIDY0LFxuICAgICA1MiwyMTcsMjI2LDI1MCwxMjQsMTIzLCAgNSwyMDIsIDM4LDE0NywxMTgsMTI2LDI1NSwgODIsIDg1LDIxMixcbiAgICAyMDcsMjA2LCA1OSwyMjcsIDQ3LCAxNiwgNTgsIDE3LDE4MiwxODksIDI4LCA0MiwyMjMsMTgzLDE3MCwyMTMsXG4gICAgMTE5LDI0OCwxNTIsICAyLCA0NCwxNTQsMTYzLCA3MCwyMjEsMTUzLDEwMSwxNTUsMTY3LCA0MywxNzIsICA5LFxuICAgIDEyOSwgMjIsIDM5LDI1MywgMTksIDk4LDEwOCwxMTAsIDc5LDExMywyMjQsMjMyLDE3OCwxODUsMTEyLDEwNCxcbiAgICAyMTgsMjQ2LCA5NywyMjgsMjUxLCAzNCwyNDIsMTkzLDIzOCwyMTAsMTQ0LCAxMiwxOTEsMTc5LDE2MiwyNDEsXG4gICAgIDgxLCA1MSwxNDUsMjM1LDI0OSwgMTQsMjM5LDEwNywgNDksMTkyLDIxNCwgMzEsMTgxLDE5OSwxMDYsMTU3LFxuICAgIDE4NCwgODQsMjA0LDE3NiwxMTUsMTIxLCA1MCwgNDUsMTI3LCAgNCwxNTAsMjU0LDEzOCwyMzYsMjA1LCA5MyxcbiAgICAyMjIsMTE0LCA2NywgMjksIDI0LCA3MiwyNDMsMTQxLDEyOCwxOTUsIDc4LCA2NiwyMTUsIDYxLDE1NiwxODAsXG4gIF1cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCAyNTY7IGkrKykgcFtpXSA9IHBbaSArIDI1Nl0gPSBiYXNlW2ldIVxuICByZXR1cm4gcFxufSkoKVxuXG5mdW5jdGlvbiBmYWRlKHQ6IG51bWJlcik6IG51bWJlciB7IHJldHVybiB0ICogdCAqIHQgKiAodCAqICh0ICogNiAtIDE1KSArIDEwKSB9XG5mdW5jdGlvbiBsZXJwKHQ6IG51bWJlciwgYTogbnVtYmVyLCBiOiBudW1iZXIpOiBudW1iZXIgeyByZXR1cm4gYSArIHQgKiAoYiAtIGEpIH1cbmZ1bmN0aW9uIGdyYWQyKGhhc2g6IG51bWJlciwgeDogbnVtYmVyLCB5OiBudW1iZXIpOiBudW1iZXIge1xuICBjb25zdCBoID0gaGFzaCAmIDNcbiAgY29uc3QgdSA9IGggPCAyID8geCA6IHlcbiAgY29uc3QgdiA9IGggPCAyID8geSA6IHhcbiAgcmV0dXJuICgoaCAmIDEpID8gLXUgOiB1KSArICgoaCAmIDIpID8gLXYgOiB2KVxufVxuXG4vKiogUGVybGluIG5vaXNlLCByZXR1cm5zIHZhbHVlIGluIFstMSwgMV0gKi9cbmV4cG9ydCBmdW5jdGlvbiBwZXJsaW4yKHg6IG51bWJlciwgeTogbnVtYmVyKTogbnVtYmVyIHtcbiAgY29uc3QgWCA9IE1hdGguZmxvb3IoeCkgJiAyNTVcbiAgY29uc3QgWSA9IE1hdGguZmxvb3IoeSkgJiAyNTVcbiAgeCAtPSBNYXRoLmZsb29yKHgpXG4gIHkgLT0gTWF0aC5mbG9vcih5KVxuICBjb25zdCB1ID0gZmFkZSh4KSwgdiA9IGZhZGUoeSlcbiAgY29uc3QgYSAgPSBQRVJMSU5fUEVSTVtYXSEgICsgWVxuICBjb25zdCBhYSA9IFBFUkxJTl9QRVJNW2FdISwgIGFiID0gUEVSTElOX1BFUk1bYSArIDFdIVxuICBjb25zdCBiICA9IFBFUkxJTl9QRVJNW1ggKyAxXSEgKyBZXG4gIGNvbnN0IGJhID0gUEVSTElOX1BFUk1bYl0hLCAgYmIgPSBQRVJMSU5fUEVSTVtiICsgMV0hXG4gIHJldHVybiBsZXJwKHYsXG4gICAgbGVycCh1LCBncmFkMihQRVJMSU5fUEVSTVthYV0hLCB4LCB5KSwgICAgIGdyYWQyKFBFUkxJTl9QRVJNW2JhXSEsIHggLSAxLCB5KSksXG4gICAgbGVycCh1LCBncmFkMihQRVJMSU5fUEVSTVthYl0hLCB4LCB5IC0gMSksIGdyYWQyKFBFUkxJTl9QRVJNW2JiXSEsIHggLSAxLCB5IC0gMSkpXG4gIClcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBTaW1wbGV4IG5vaXNlIFx1MjAxNCAyRCBzaW1wbGV4IChzbW9vdGhlciBncmFkaWVudHMsIG5vIGdyaWQtYWxpZ25lZCBhcnRlZmFjdHMpXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgU0lNUExFWF9QRVJNID0gUEVSTElOX1BFUk0gLy8gcmV1c2Ugc2FtZSBwZXJtdXRhdGlvbiB0YWJsZVxuXG5jb25zdCBTSU1QTEVYX0dSQUQ6IFtudW1iZXIsIG51bWJlcl1bXSA9IFtcbiAgWzEsMV0sWy0xLDFdLFsxLC0xXSxbLTEsLTFdLFsxLDBdLFstMSwwXSxbMCwxXSxbMCwtMV0sXG5dXG5jb25zdCBGMiA9IDAuNSAqIChNYXRoLnNxcnQoMykgLSAxKVxuY29uc3QgRzIgPSAoMyAtIE1hdGguc3FydCgzKSkgLyA2XG5cbmZ1bmN0aW9uIHNpbXBsZXgyZ3JhZChoYXNoOiBudW1iZXIsIHg6IG51bWJlciwgeTogbnVtYmVyKTogbnVtYmVyIHtcbiAgY29uc3QgZyA9IFNJTVBMRVhfR1JBRFtoYXNoICYgN10hXG4gIHJldHVybiBnWzBdICogeCArIGdbMV0gKiB5XG59XG5cbi8qKiBTaW1wbGV4IG5vaXNlLCByZXR1cm5zIHZhbHVlIGluIFstMSwgMV0gKi9cbmV4cG9ydCBmdW5jdGlvbiBzaW1wbGV4Mih4aW46IG51bWJlciwgeWluOiBudW1iZXIpOiBudW1iZXIge1xuICBjb25zdCBzICA9ICh4aW4gKyB5aW4pICogRjJcbiAgY29uc3QgaSAgPSBNYXRoLmZsb29yKHhpbiArIHMpXG4gIGNvbnN0IGogID0gTWF0aC5mbG9vcih5aW4gKyBzKVxuICBjb25zdCB0ICA9IChpICsgaikgKiBHMlxuICBjb25zdCB4MCA9IHhpbiAtIChpIC0gdClcbiAgY29uc3QgeTAgPSB5aW4gLSAoaiAtIHQpXG5cbiAgbGV0IGkxOiBudW1iZXIsIGoxOiBudW1iZXJcbiAgaWYgKHgwID4geTApIHsgaTEgPSAxOyBqMSA9IDAgfSBlbHNlIHsgaTEgPSAwOyBqMSA9IDEgfVxuXG4gIGNvbnN0IHgxID0geDAgLSBpMSArIEcyLCAgIHkxID0geTAgLSBqMSArIEcyXG4gIGNvbnN0IHgyID0geDAgLSAxICsgMipHMiwgIHkyID0geTAgLSAxICsgMipHMlxuXG4gIGNvbnN0IGlpID0gaSAmIDI1NSwgamogPSBqICYgMjU1XG4gIGNvbnN0IGdpMCA9IFNJTVBMRVhfUEVSTVtpaSAgICAgICsgU0lNUExFWF9QRVJNW2pqXSFdIVxuICBjb25zdCBnaTEgPSBTSU1QTEVYX1BFUk1baWkgKyBpMSArIFNJTVBMRVhfUEVSTVtqaiArIGoxXSFdIVxuICBjb25zdCBnaTIgPSBTSU1QTEVYX1BFUk1baWkgKyAxICArIFNJTVBMRVhfUEVSTVtqaiArIDFdIV0hXG5cbiAgY29uc3QgbiA9ICh0MDogbnVtYmVyLCB4OiBudW1iZXIsIHk6IG51bWJlciwgZ2k6IG51bWJlcikgPT4ge1xuICAgIGNvbnN0IHIgPSAwLjUgLSB4KnggLSB5KnlcbiAgICByZXR1cm4gciA8IDAgPyAwIDogcipyKnIqciAqIHNpbXBsZXgyZ3JhZChnaSwgeCwgeSlcbiAgfVxuXG4gIHJldHVybiA3MCAqIChuKDAuNSAtIHgwKngwIC0geTAqeTAsIHgwLCB5MCwgZ2kwKSArXG4gICAgICAgICAgICAgICBuKDAuNSAtIHgxKngxIC0geTEqeTEsIHgxLCB5MSwgZ2kxKSArXG4gICAgICAgICAgICAgICBuKDAuNSAtIHgyKngyIC0geTIqeTIsIHgyLCB5MiwgZ2kyKSlcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBSZWd1bGFyIHNoYWtlIFx1MjAxNCBkYW1wZWQgc2ludXNvaWRhbCBvc2NpbGxhdGlvbiB3aXRoIGhhcm1vbmljc1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIHJlZ3VsYXJTaGFrZSh0OiBudW1iZXIsIGZyZXF1ZW5jeTogbnVtYmVyLCBjaGFubmVsOiBudW1iZXIpOiBudW1iZXIge1xuICAvLyBUd28gaGFybW9uaWNzIGF0IHNsaWdodGx5IGRpZmZlcmVudCBmcmVxdWVuY2llcyBmb3IgbmF0dXJhbCBmZWVsXG4gIC8vIGNoYW5uZWwgb2Zmc2V0IHByZXZlbnRzIHgveSBmcm9tIGJlaW5nIGlkZW50aWNhbFxuICBjb25zdCBwaGFzZSA9IGNoYW5uZWwgKiBNYXRoLlBJICogMC43XG4gIHJldHVybiAoXG4gICAgMC43ICogTWF0aC5zaW4oMiAqIE1hdGguUEkgKiBmcmVxdWVuY3kgKiB0ICsgcGhhc2UpICtcbiAgICAwLjMgKiBNYXRoLnNpbigyICogTWF0aC5QSSAqIGZyZXF1ZW5jeSAqIDIuMyAqIHQgKyBwaGFzZSAqIDEuNClcbiAgKVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEtleWZyYW1lIGdlbmVyYXRvclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbnR5cGUgTm9pc2VUeXBlID0gJ3NpbXBsZXgnIHwgJ3BlcmxpbicgfCAncmVndWxhcidcbnR5cGUgU2hha2VBeGlzID0gJ3gnIHwgJ3knIHwgJ3onIHwgJ3h5JyB8ICd4eXonXG5cbmludGVyZmFjZSBTaGFrZU9wdGlvbnMge1xuICBheGlzOiAgICAgIFNoYWtlQXhpc1xuICBub2lzZTogICAgIE5vaXNlVHlwZVxuICBhbXBsaXR1ZGU6IG51bWJlciAgICAgLy8gcHggKG9yIGRlZ3JlZXMgZm9yIHopXG4gIGRlY2F5OiAgICAgYm9vbGVhblxuICBmcmVxdWVuY3k6IG51bWJlciAgICAgLy8gb3NjaWxsYXRpb25zL3NlYyAocmVndWxhciBtb2RlIG9ubHkpXG59XG5cbi8qKlxuICogU2FtcGxlIHRoZSBjaG9zZW4gbm9pc2UgZnVuY3Rpb24gZm9yIG9uZSBheGlzIGNoYW5uZWwuXG4gKiBgdGAgICAgICAgXHUyMDE0IG5vcm1hbGlzZWQgdGltZSBbMCwgMV1cbiAqIGBjaGFubmVsYCBcdTIwMTQgaW50ZWdlciBvZmZzZXQgdG8gcHJvZHVjZSBhbiBpbmRlcGVuZGVudCBjdXJ2ZSBwZXIgYXhpc1xuICovXG5mdW5jdGlvbiBzYW1wbGUoXG4gIG5vaXNlOiBOb2lzZVR5cGUsXG4gIHQ6IG51bWJlcixcbiAgY2hhbm5lbDogbnVtYmVyLFxuICBmcmVxdWVuY3k6IG51bWJlcixcbiAgZHVyYXRpb246IG51bWJlclxuKTogbnVtYmVyIHtcbiAgLy8gU2NhbGUgdCB0byBhIHJhbmdlIHRoYXQgZ2l2ZXMgZ29vZCBub2lzZSB2YXJpYXRpb25cbiAgY29uc3Qgc2NhbGUgPSA0LjAgIC8vIGhvdyBtYW55IG5vaXNlIFwiY3ljbGVzXCIgb3ZlciB0aGUgZnVsbCBkdXJhdGlvblxuICBjb25zdCB0eCA9IHQgKiBzY2FsZSArIGNoYW5uZWwgKiAzLjcgICAvLyBjaGFubmVsIG9mZnNldCBmb3IgaW5kZXBlbmRlbmNlXG4gIGNvbnN0IHR5ID0gY2hhbm5lbCAqIDExLjMgICAgICAgICAgICAgIC8vIGZpeGVkIHkgb2Zmc2V0IHBlciBjaGFubmVsXG5cbiAgc3dpdGNoIChub2lzZSkge1xuICAgIGNhc2UgJ3NpbXBsZXgnOiByZXR1cm4gc2ltcGxleDIodHgsIHR5KVxuICAgIGNhc2UgJ3Blcmxpbic6ICByZXR1cm4gcGVybGluMih0eCwgdHkpXG4gICAgY2FzZSAncmVndWxhcic6IHJldHVybiByZWd1bGFyU2hha2UodCwgZnJlcXVlbmN5LCBjaGFubmVsKVxuICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkS2V5ZnJhbWVzKFxuICBvcHRzOiBTaGFrZU9wdGlvbnMsXG4gIG46IG51bWJlciAgIC8vIG51bWJlciBvZiBrZXlmcmFtZXNcbik6IEtleWZyYW1lW10ge1xuICBjb25zdCBmcmFtZXM6IEtleWZyYW1lW10gPSBbXVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDw9IG47IGkrKykge1xuICAgIGNvbnN0IHQgICAgICAgID0gaSAvIG4gICAgICAgICAgICAgICAgICAgLy8gWzAsIDFdXG4gICAgY29uc3QgZW52ZWxvcGUgPSBvcHRzLmRlY2F5ID8gKDEgLSB0KSA6IDEuMFxuICAgIGNvbnN0IGFtcCAgICAgID0gb3B0cy5hbXBsaXR1ZGUgKiBlbnZlbG9wZVxuXG4gICAgbGV0IHR4ID0gMCwgdHkgPSAwLCByeiA9IDBcblxuICAgIGlmIChvcHRzLmF4aXMuaW5jbHVkZXMoJ3gnKSkge1xuICAgICAgdHggPSBzYW1wbGUob3B0cy5ub2lzZSwgdCwgMCwgb3B0cy5mcmVxdWVuY3ksIG4pICogYW1wXG4gICAgfVxuICAgIGlmIChvcHRzLmF4aXMuaW5jbHVkZXMoJ3knKSkge1xuICAgICAgdHkgPSBzYW1wbGUob3B0cy5ub2lzZSwgdCwgMSwgb3B0cy5mcmVxdWVuY3ksIG4pICogYW1wXG4gICAgfVxuICAgIGlmIChvcHRzLmF4aXMgPT09ICd6JyB8fCBvcHRzLmF4aXMgPT09ICd4eXonKSB7XG4gICAgICAvLyB6IHJvdGF0aW9uOiBhbXBsaXR1ZGUgaXMgaW4gZGVncmVlcywgc2NhbGUgZG93biB2cyBweCBkaXNwbGFjZW1lbnRcbiAgICAgIGNvbnN0IGRlZ0FtcCA9IGFtcCAqIDAuMTVcbiAgICAgIHJ6ID0gc2FtcGxlKG9wdHMubm9pc2UsIHQsIDIsIG9wdHMuZnJlcXVlbmN5LCBuKSAqIGRlZ0FtcFxuICAgIH1cblxuICAgIGNvbnN0IHBhcnRzOiBzdHJpbmdbXSA9IFtdXG4gICAgaWYgKHR4ICE9PSAwIHx8IG9wdHMuYXhpcy5pbmNsdWRlcygneCcpKSBwYXJ0cy5wdXNoKGB0cmFuc2xhdGVYKCR7dHgudG9GaXhlZCgyKX1weClgKVxuICAgIGlmICh0eSAhPT0gMCB8fCBvcHRzLmF4aXMuaW5jbHVkZXMoJ3knKSkgcGFydHMucHVzaChgdHJhbnNsYXRlWSgke3R5LnRvRml4ZWQoMil9cHgpYClcbiAgICBpZiAocnogIT09IDAgfHwgb3B0cy5heGlzID09PSAneicgfHwgb3B0cy5heGlzID09PSAneHl6JykgcGFydHMucHVzaChgcm90YXRlWigke3J6LnRvRml4ZWQoMyl9ZGVnKWApXG5cbiAgICBmcmFtZXMucHVzaCh7XG4gICAgICB0cmFuc2Zvcm06IHBhcnRzLmxlbmd0aCA+IDAgPyBwYXJ0cy5qb2luKCcgJykgOiAnbm9uZScsXG4gICAgICBvZmZzZXQ6IHQsXG4gICAgfSlcbiAgfVxuXG4gIC8vIEVuc3VyZSBmaXJzdCBhbmQgbGFzdCBmcmFtZXMgcmV0dXJuIHRvIHJlc3RcbiAgZnJhbWVzWzBdIS50cmFuc2Zvcm0gPSBidWlsZFJlc3RUcmFuc2Zvcm0ob3B0cy5heGlzKVxuICBmcmFtZXNbbl0hLnRyYW5zZm9ybSA9IGJ1aWxkUmVzdFRyYW5zZm9ybShvcHRzLmF4aXMpXG5cbiAgcmV0dXJuIGZyYW1lc1xufVxuXG5mdW5jdGlvbiBidWlsZFJlc3RUcmFuc2Zvcm0oYXhpczogU2hha2VBeGlzKTogc3RyaW5nIHtcbiAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW11cbiAgaWYgKGF4aXMuaW5jbHVkZXMoJ3gnKSkgICAgICAgICAgICAgICAgICAgICAgIHBhcnRzLnB1c2goJ3RyYW5zbGF0ZVgoMHB4KScpXG4gIGlmIChheGlzLmluY2x1ZGVzKCd5JykpICAgICAgICAgICAgICAgICAgICAgICBwYXJ0cy5wdXNoKCd0cmFuc2xhdGVZKDBweCknKVxuICBpZiAoYXhpcyA9PT0gJ3onIHx8IGF4aXMgPT09ICd4eXonKSAgICAgICAgICAgcGFydHMucHVzaCgncm90YXRlWigwZGVnKScpXG4gIHJldHVybiBwYXJ0cy5qb2luKCcgJykgfHwgJ25vbmUnXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gUGFyc2Ugb3B0aW9ucyBmcm9tIExFUyBvcHRpb24gb2JqZWN0XG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gcGFyc2VNcyh2YWw6IHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgZmFsbGJhY2s6IG51bWJlcik6IG51bWJlciB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCB8fCB2YWwgPT09IG51bGwpIHJldHVybiBmYWxsYmFja1xuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHJldHVybiB2YWxcbiAgY29uc3QgbSA9IFN0cmluZyh2YWwpLm1hdGNoKC9eKFxcZCsoPzpcXC5cXGQrKT8pKD86cHh8bXMpPyQvKVxuICByZXR1cm4gbSA/IHBhcnNlRmxvYXQobVsxXSEpIDogZmFsbGJhY2tcbn1cblxuZnVuY3Rpb24gcGFyc2VQeCh2YWw6IHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgZmFsbGJhY2s6IG51bWJlcik6IG51bWJlciB7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCB8fCB2YWwgPT09IG51bGwpIHJldHVybiBmYWxsYmFja1xuICBpZiAodHlwZW9mIHZhbCA9PT0gJ251bWJlcicpIHJldHVybiB2YWxcbiAgY29uc3QgbSA9IFN0cmluZyh2YWwpLm1hdGNoKC9eKFxcZCsoPzpcXC5cXGQrKT8pcHgkLylcbiAgcmV0dXJuIG0gPyBwYXJzZUZsb2F0KG1bMV0hKSA6IGZhbGxiYWNrXG59XG5cbmZ1bmN0aW9uIHBhcnNlU2hha2VPcHRpb25zKG9wdHM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogU2hha2VPcHRpb25zIHtcbiAgY29uc3QgYXhpcyAgICAgID0gKFsneCcsJ3knLCd6JywneHknLCd4eXonXS5pbmNsdWRlcyhTdHJpbmcob3B0c1snYXhpcyddID8/ICd4JykpXG4gICAgICAgICAgICAgICAgICAgID8gU3RyaW5nKG9wdHNbJ2F4aXMnXSA/PyAneCcpXG4gICAgICAgICAgICAgICAgICAgIDogJ3gnKSBhcyBTaGFrZUF4aXNcbiAgY29uc3Qgbm9pc2UgICAgID0gKFsnc2ltcGxleCcsJ3BlcmxpbicsJ3JlZ3VsYXInXS5pbmNsdWRlcyhTdHJpbmcob3B0c1snbm9pc2UnXSA/PyAncmVndWxhcicpKVxuICAgICAgICAgICAgICAgICAgICA/IFN0cmluZyhvcHRzWydub2lzZSddID8/ICdyZWd1bGFyJylcbiAgICAgICAgICAgICAgICAgICAgOiAncmVndWxhcicpIGFzIE5vaXNlVHlwZVxuICBjb25zdCBhbXBsaXR1ZGUgPSBwYXJzZVB4KG9wdHNbJ2FtcGxpdHVkZSddIGFzIHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgOClcbiAgY29uc3QgZGVjYXkgICAgID0gU3RyaW5nKG9wdHNbJ2RlY2F5J10gPz8gJ3RydWUnKSAhPT0gJ2ZhbHNlJ1xuICBjb25zdCBmcmVxdWVuY3kgPSBwYXJzZU1zKG9wdHNbJ2ZyZXF1ZW5jeSddIGFzIHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgOClcblxuICByZXR1cm4geyBheGlzLCBub2lzZSwgYW1wbGl0dWRlLCBkZWNheSwgZnJlcXVlbmN5IH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBUaGUgcHJpbWl0aXZlXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBzaGFrZSBcdTIwMTQgbm9pc2UtZHJpdmVuIGRpc3BsYWNlbWVudCBhbmltYXRpb24uXG4gKlxuICogVXNhZ2UgaW4gTEVTOlxuICogICBzaGFrZSAjZmllbGQgIDQwMG1zIGVhc2Utb3V0IFtheGlzOiB4ICBub2lzZTogcmVndWxhciAgYW1wbGl0dWRlOiA4cHggIGRlY2F5OiB0cnVlXVxuICogICBzaGFrZSAuY2FyZCAgIDYwMG1zIGxpbmVhciAgIFtheGlzOiB4eSAgbm9pc2U6IHNpbXBsZXggIGFtcGxpdHVkZTogMTJweF1cbiAqICAgc2hha2UgYm9keSAgICA4MDBtcyBsaW5lYXIgICBbYXhpczogeHl6ICBub2lzZTogcGVybGluICBhbXBsaXR1ZGU6IDZweCAgZGVjYXk6IHRydWVdXG4gKi9cbmV4cG9ydCBjb25zdCBzaGFrZTogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgX2Vhc2luZywgb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCByb290ICA9IGhvc3QuZ2V0Um9vdE5vZGUoKSBhcyBEb2N1bWVudCB8IFNoYWRvd1Jvb3RcbiAgY29uc3Qgc2NvcGUgPSByb290IGluc3RhbmNlb2YgRG9jdW1lbnQgPyByb290IDogcm9vdC5vd25lckRvY3VtZW50ID8/IGRvY3VtZW50XG4gIGNvbnN0IGVscyAgID0gQXJyYXkuZnJvbShzY29wZS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSkgYXMgSFRNTEVsZW1lbnRbXVxuICBpZiAoZWxzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgY29uc3Qgb3B0aW9ucyA9IHBhcnNlU2hha2VPcHRpb25zKG9wdHMpXG5cbiAgLy8gfjYwZnBzIGtleWZyYW1lIGRlbnNpdHksIG1pbmltdW0gMTIsIG1heGltdW0gNjBcbiAgY29uc3QgZnJhbWVDb3VudCA9IE1hdGgubWluKDYwLCBNYXRoLm1heCgxMiwgTWF0aC5yb3VuZChkdXJhdGlvbiAvIDE2KSkpXG4gIGNvbnN0IGtleWZyYW1lcyAgPSBidWlsZEtleWZyYW1lcyhvcHRpb25zLCBmcmFtZUNvdW50KVxuXG4gIGF3YWl0IFByb21pc2UuYWxsKFxuICAgIGVscy5tYXAoZWwgPT5cbiAgICAgIGVsLmFuaW1hdGUoa2V5ZnJhbWVzLCB7XG4gICAgICAgIGR1cmF0aW9uLFxuICAgICAgICBlYXNpbmc6ICAgICdsaW5lYXInLCAgIC8vIGVhc2luZyBpcyBiYWtlZCBpbnRvIHRoZSBub2lzZSBlbnZlbG9wZVxuICAgICAgICBmaWxsOiAgICAgICdub25lJywgICAgIC8vIHNoYWtlIHJldHVybnMgdG8gcmVzdCBcdTIwMTQgbm8gaG9sZCBuZWVkZWRcbiAgICAgICAgY29tcG9zaXRlOiAnYWRkJywgICAgICAvLyBhZGQgb24gdG9wIG9mIGV4aXN0aW5nIHRyYW5zZm9ybXMgKGZpbGw6Zm9yd2FyZHMgZXRjLilcbiAgICAgIH0pLmZpbmlzaGVkLmNhdGNoKChlcnI6IHVua25vd24pID0+IHtcbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnIubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSByZXR1cm5cbiAgICAgICAgdGhyb3cgZXJyXG4gICAgICB9KVxuICAgIClcbiAgKVxufVxuIiwgIi8qKlxuICogUGhhc2UgNzogQnVpbHQtaW4gYW5pbWF0aW9uIG1vZHVsZVxuICpcbiAqIEFsbCBwcmltaXRpdmVzIHVzZSB0aGUgV2ViIEFuaW1hdGlvbnMgQVBJIChlbGVtZW50LmFuaW1hdGUoKS5maW5pc2hlZClcbiAqIHNvIHRoZXkgaW50ZWdyYXRlIHdpdGggTEVTJ3MgYXN5bmMtdHJhbnNwYXJlbnQgYHRoZW5gIHNlcXVlbmNpbmc6XG4gKlxuICogICBmYWRlLWluICNzcGxhc2ggMjAwbXMgZWFzZS1vdXQgYW5kXG4gKiAgIHNsaWRlLXVwICNzcGxhc2ggMTgwbXMgZWFzZS1vdXRcbiAqICAgdGhlbiBmaXJlIHNwbGFzaDpyZWFkeSAgICAgICAgICBcdTIxOTAgb25seSBmaXJlcyBhZnRlciBCT1RIIGFuaW1hdGlvbnMgY29tcGxldGVcbiAqXG4gKiBgYW5kYCBcdTIxOTIgUHJvbWlzZS5hbGwgKGNvbmN1cnJlbnQpXG4gKiBgdGhlbmAgXHUyMTkyIHNlcXVlbnRpYWwgYXdhaXQgb24gLmZpbmlzaGVkXG4gKlxuICogVGhlIGV4ZWN1dG9yIGF3YWl0cyBlYWNoIExFU1ByaW1pdGl2ZSByZXR1cm4gdmFsdWUsIHNvIGFuaW1hdGlvblxuICogY29tcGxldGlvbiBpcyBuYXR1cmFsbHkgc2VyaWFsaXplZCB3aXRob3V0IGFueSBzZXRUaW1lb3V0IGhhY2tzLlxuICovXG5cbmltcG9ydCB0eXBlIHsgTEVTTW9kdWxlLCBMRVNQcmltaXRpdmUgfSBmcm9tICcuLi90eXBlcy5qcydcbmltcG9ydCB7IHNoYWtlIH0gZnJvbSAnLi9zaGFrZS5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBVdGlsaXR5OiBxdWVyeSBhbGwgbWF0Y2hpbmcgZWxlbWVudHMgd2l0aGluIHRoZSBob3N0IHNjb3BlXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gcXVlcnlBbGwoc2VsZWN0b3I6IHN0cmluZywgaG9zdDogRWxlbWVudCk6IEVsZW1lbnRbXSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgcm9vdCA9IGhvc3QuZ2V0Um9vdE5vZGUoKSBhcyBEb2N1bWVudCB8IFNoYWRvd1Jvb3RcbiAgICBjb25zdCBzY29wZSA9IHJvb3QgaW5zdGFuY2VvZiBEb2N1bWVudCA/IHJvb3QgOiByb290Lm93bmVyRG9jdW1lbnQgPz8gZG9jdW1lbnRcbiAgICByZXR1cm4gQXJyYXkuZnJvbShzY29wZS5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSlcbiAgfSBjYXRjaCB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTOmFuaW1hdGlvbl0gSW52YWxpZCBzZWxlY3RvcjogXCIke3NlbGVjdG9yfVwiYClcbiAgICByZXR1cm4gW11cbiAgfVxufVxuXG4vKipcbiAqIENhbmNlbCBhbGwgcnVubmluZyBXZWIgQW5pbWF0aW9ucyBvbiBhbiBlbGVtZW50IGJlZm9yZSBzdGFydGluZyBhIG5ldyBvbmUuXG4gKiBUaGlzIHByZXZlbnRzIHRoZSBvbmUtZnJhbWUgZmxhc2ggdGhhdCBvY2N1cnMgd2hlbiBhIGZpbGw6Zm9yd2FyZHMgYW5pbWF0aW9uXG4gKiBpcyBpbnRlcnJ1cHRlZCBcdTIwMTQgd2l0aG91dCBjYW5jZWxsYXRpb24sIHRoZSBlbGVtZW50IGJyaWVmbHkgcmV2ZXJ0cyB0byBpdHNcbiAqIHVuLWFuaW1hdGVkIHN0YXRlIGFzIHRoZSBvbGQgQW5pbWF0aW9uIGlzIHJlcGxhY2VkLlxuICovXG5mdW5jdGlvbiBjYW5jZWxBbmltYXRpb25zKGVsOiBFbGVtZW50KTogdm9pZCB7XG4gIGZvciAoY29uc3QgYW5pbSBvZiAoZWwgYXMgSFRNTEVsZW1lbnQpLmdldEFuaW1hdGlvbnMoKSkge1xuICAgIGFuaW0uY2FuY2VsKClcbiAgfVxufVxuXG4vKiogQXdhaXRzIGFsbCBBbmltYXRpb24uZmluaXNoZWQgcHJvbWlzZXMuIFJldHVybnMgaW1tZWRpYXRlbHkgaWYgbm8gZWxlbWVudHMgbWF0Y2hlZC4gKi9cbmFzeW5jIGZ1bmN0aW9uIGFuaW1hdGVBbGwoXG4gIGVsczogRWxlbWVudFtdLFxuICBrZXlmcmFtZXM6IEtleWZyYW1lW10sXG4gIG9wdGlvbnM6IEtleWZyYW1lQW5pbWF0aW9uT3B0aW9uc1xuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChlbHMubGVuZ3RoID09PSAwKSByZXR1cm5cbiAgLy8gTm90ZTogY2FuY2VsQW5pbWF0aW9ucyBpcyBpbnRlbnRpb25hbGx5IE5PVCBjYWxsZWQgaGVyZS5cbiAgLy8gSXQgaXMgb25seSBjYWxsZWQgaW4gc3RhZ2dlci1lbnRlci9zdGFnZ2VyLWV4aXQgd2hlcmUgd2UgZXhwbGljaXRseVxuICAvLyByZXN0YXJ0IGFuIGluLXByb2dyZXNzIHN0YWdnZXIuIENhbGxpbmcgY2FuY2VsIG9uIGV2ZXJ5IHByaW1pdGl2ZVxuICAvLyB3b3VsZCBkZXN0cm95IGZpbGw6Zm9yd2FyZHMgaG9sZHMgZnJvbSBwcmV2aW91cyBhbmltYXRpb25zXG4gIC8vIChlLmcuIHN0YWdnZXItZW50ZXIncyBob2xkIHdvdWxkIGJlIGNhbmNlbGxlZCBieSBhIHN1YnNlcXVlbnQgcHVsc2UpLlxuICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBlbHMubWFwKGVsID0+IChlbCBhcyBIVE1MRWxlbWVudCkuYW5pbWF0ZShrZXlmcmFtZXMsIG9wdGlvbnMpLmZpbmlzaGVkXG4gICAgICAuY2F0Y2goKGVycjogdW5rbm93bikgPT4ge1xuICAgICAgICAvLyBBYm9ydEVycm9yIGlzIGV4cGVjdGVkIHdoZW4gY2FuY2VsQW5pbWF0aW9ucygpIGludGVycnVwdHMgYSBydW5uaW5nXG4gICAgICAgIC8vIGFuaW1hdGlvbi4gU3dhbGxvdyBpdCBcdTIwMTQgdGhlIG5ldyBhbmltYXRpb24gaGFzIGFscmVhZHkgc3RhcnRlZC5cbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnIubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSByZXR1cm5cbiAgICAgICAgdGhyb3cgZXJyXG4gICAgICB9KVxuICAgIClcbiAgKVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIERpcmVjdGlvbiBoZWxwZXJzXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxudHlwZSBEaXJlY3Rpb24gPSAnbGVmdCcgfCAncmlnaHQnIHwgJ3VwJyB8ICdkb3duJ1xuXG5mdW5jdGlvbiBzbGlkZUtleWZyYW1lcyhkaXI6IERpcmVjdGlvbiwgZW50ZXJpbmc6IGJvb2xlYW4pOiBLZXlmcmFtZVtdIHtcbiAgY29uc3QgZGlzdGFuY2UgPSAnODBweCdcbiAgY29uc3QgdHJhbnNsYXRpb25zOiBSZWNvcmQ8RGlyZWN0aW9uLCBzdHJpbmc+ID0ge1xuICAgIGxlZnQ6ICBgdHJhbnNsYXRlWCgtJHtkaXN0YW5jZX0pYCxcbiAgICByaWdodDogYHRyYW5zbGF0ZVgoJHtkaXN0YW5jZX0pYCxcbiAgICB1cDogICAgYHRyYW5zbGF0ZVkoLSR7ZGlzdGFuY2V9KWAsXG4gICAgZG93bjogIGB0cmFuc2xhdGVZKCR7ZGlzdGFuY2V9KWAsXG4gIH1cbiAgY29uc3QgdHJhbnNsYXRlID0gdHJhbnNsYXRpb25zW2Rpcl1cbiAgaWYgKGVudGVyaW5nKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHsgb3BhY2l0eTogMCwgdHJhbnNmb3JtOiB0cmFuc2xhdGUgfSxcbiAgICAgIHsgb3BhY2l0eTogMSwgdHJhbnNmb3JtOiAnbm9uZScgfSxcbiAgICBdXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIFtcbiAgICAgIHsgb3BhY2l0eTogMSwgdHJhbnNmb3JtOiAnbm9uZScgfSxcbiAgICAgIHsgb3BhY2l0eTogMCwgdHJhbnNmb3JtOiB0cmFuc2xhdGUgfSxcbiAgICBdXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBDb3JlIHByaW1pdGl2ZXNcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5jb25zdCBmYWRlSW46IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgX29wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLFxuICAgIFt7IG9wYWNpdHk6IDAgfSwgeyBvcGFjaXR5OiAxIH1dLFxuICAgIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9XG4gIClcbn1cblxuY29uc3QgZmFkZU91dDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBfb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgYXdhaXQgYW5pbWF0ZUFsbChlbHMsXG4gICAgW3sgb3BhY2l0eTogMSB9LCB7IG9wYWNpdHk6IDAgfV0sXG4gICAgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnIH1cbiAgKVxufVxuXG5jb25zdCBzbGlkZUluOiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIG9wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZnJvbSA9IChvcHRzWydmcm9tJ10gYXMgRGlyZWN0aW9uIHwgdW5kZWZpbmVkKSA/PyAncmlnaHQnXG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBhd2FpdCBhbmltYXRlQWxsKGVscywgc2xpZGVLZXlmcmFtZXMoZnJvbSwgdHJ1ZSksIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9KVxufVxuXG5jb25zdCBzbGlkZU91dDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBvcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IHRvID0gKG9wdHNbJ3RvJ10gYXMgRGlyZWN0aW9uIHwgdW5kZWZpbmVkKSA/PyAnbGVmdCdcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLCBzbGlkZUtleWZyYW1lcyh0bywgZmFsc2UpLCB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdmb3J3YXJkcycgfSlcbn1cblxuY29uc3Qgc2xpZGVVcDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBfb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgYXdhaXQgYW5pbWF0ZUFsbChlbHMsIHNsaWRlS2V5ZnJhbWVzKCd1cCcsIHRydWUpLCB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdmb3J3YXJkcycgfSlcbn1cblxuY29uc3Qgc2xpZGVEb3duOiBMRVNQcmltaXRpdmUgPSBhc3luYyAoc2VsZWN0b3IsIGR1cmF0aW9uLCBlYXNpbmcsIF9vcHRzLCBob3N0KSA9PiB7XG4gIGNvbnN0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KVxuICBhd2FpdCBhbmltYXRlQWxsKGVscywgc2xpZGVLZXlmcmFtZXMoJ2Rvd24nLCBmYWxzZSksIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJyB9KVxufVxuXG4vKipcbiAqIHB1bHNlIFx1MjAxNCBicmllZiBzY2FsZSArIG9wYWNpdHkgcHVsc2UgdG8gZHJhdyBhdHRlbnRpb24gdG8gdXBkYXRlZCBpdGVtcy5cbiAqIFVzZWQgZm9yIEQzIFwidXBkYXRlXCIgcGhhc2U6IGl0ZW1zIHdob3NlIGNvbnRlbnQgY2hhbmdlZCBnZXQgYSB2aXN1YWwgcGluZy5cbiAqL1xuY29uc3QgcHVsc2U6IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgX29wdHMsIGhvc3QpID0+IHtcbiAgY29uc3QgZWxzID0gcXVlcnlBbGwoc2VsZWN0b3IsIGhvc3QpXG4gIGF3YWl0IGFuaW1hdGVBbGwoZWxzLCBbXG4gICAgeyBvcGFjaXR5OiAxLCAgICB0cmFuc2Zvcm06ICdzY2FsZSgxKScgfSxcbiAgICB7IG9wYWNpdHk6IDAuNzUsIHRyYW5zZm9ybTogJ3NjYWxlKDEuMDMpJywgb2Zmc2V0OiAwLjQgfSxcbiAgICB7IG9wYWNpdHk6IDEsICAgIHRyYW5zZm9ybTogJ3NjYWxlKDEpJyB9LFxuICBdLCB7IGR1cmF0aW9uLCBlYXNpbmcsIGZpbGw6ICdub25lJyB9KVxufVxuXG4vKipcbiAqIHN0YWdnZXItZW50ZXIgXHUyMDE0IHJ1bnMgc2xpZGVJbiBvbiBlYWNoIG1hdGNoZWQgZWxlbWVudCBpbiBzZXF1ZW5jZSxcbiAqIG9mZnNldCBieSBgZ2FwYCBtaWxsaXNlY29uZHMgYmV0d2VlbiBlYWNoLlxuICpcbiAqIE9wdGlvbnM6XG4gKiAgIGdhcDogTm1zICAgXHUyMDE0IGRlbGF5IGJldHdlZW4gZWFjaCBlbGVtZW50IChkZWZhdWx0OiA0MG1zKVxuICogICBmcm9tOiBkaXIgIFx1MjAxNCAnbGVmdCcgfCAncmlnaHQnIHwgJ3VwJyB8ICdkb3duJyAoZGVmYXVsdDogJ3JpZ2h0JylcbiAqXG4gKiBBbGwgYW5pbWF0aW9ucyBhcmUgc3RhcnRlZCB0b2dldGhlciAoUHJvbWlzZS5hbGwpIGJ1dCBlYWNoIGhhcyBhblxuICogaW5jcmVhc2luZyBgZGVsYXlgIFx1MjAxNCB0aGlzIGdpdmVzIHRoZSBzdGFnZ2VyIGVmZmVjdCB3aGlsZSBrZWVwaW5nXG4gKiB0aGUgdG90YWwgUHJvbWlzZS1zZXR0bGVkIHRpbWUgPSBkdXJhdGlvbiArIChuLTEpICogZ2FwLlxuICovXG5jb25zdCBzdGFnZ2VyRW50ZXI6IExFU1ByaW1pdGl2ZSA9IGFzeW5jIChzZWxlY3RvciwgZHVyYXRpb24sIGVhc2luZywgb3B0cywgaG9zdCkgPT4ge1xuICBjb25zdCBlbHMgPSBxdWVyeUFsbChzZWxlY3RvciwgaG9zdClcbiAgaWYgKGVscy5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIGNvbnN0IGdhcCAgPSBwYXJzZU1zKG9wdHNbJ2dhcCddIGFzIHN0cmluZyB8IG51bWJlciB8IHVuZGVmaW5lZCwgNDApXG4gIGNvbnN0IGZyb20gPSAob3B0c1snZnJvbSddIGFzIERpcmVjdGlvbiB8IHVuZGVmaW5lZCkgPz8gJ3JpZ2h0J1xuXG4gIGVscy5mb3JFYWNoKGNhbmNlbEFuaW1hdGlvbnMpXG4gIGF3YWl0IFByb21pc2UuYWxsKFxuICAgIGVscy5tYXAoKGVsLCBpKSA9PlxuICAgICAgKGVsIGFzIEhUTUxFbGVtZW50KS5hbmltYXRlKFxuICAgICAgICBzbGlkZUtleWZyYW1lcyhmcm9tLCB0cnVlKSxcbiAgICAgICAgeyBkdXJhdGlvbiwgZWFzaW5nLCBmaWxsOiAnZm9yd2FyZHMnLCBkZWxheTogaSAqIGdhcCB9XG4gICAgICApLmZpbmlzaGVkLmNhdGNoKChlcnI6IHVua25vd24pID0+IHtcbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIERPTUV4Y2VwdGlvbiAmJiBlcnIubmFtZSA9PT0gJ0Fib3J0RXJyb3InKSByZXR1cm5cbiAgICAgICAgdGhyb3cgZXJyXG4gICAgICB9KVxuICAgIClcbiAgKVxufVxuXG4vKipcbiAqIHN0YWdnZXItZXhpdCBcdTIwMTQgcnVucyBzbGlkZU91dCBvbiBlYWNoIG1hdGNoZWQgZWxlbWVudCBpbiBzZXF1ZW5jZS5cbiAqXG4gKiBPcHRpb25zOlxuICogICBnYXA6IE5tcyAgICAgICAgICBcdTIwMTQgZGVsYXkgYmV0d2VlbiBlYWNoIGVsZW1lbnQgKGRlZmF1bHQ6IDIwbXMpXG4gKiAgIGRpcmVjdGlvbjogcmV2ZXJzZSBcdTIwMTQgcHJvY2VzcyBlbGVtZW50cyBpbiByZXZlcnNlIG9yZGVyXG4gKiAgIHRvOiBkaXIgICAgICAgICAgIFx1MjAxNCBleGl0IGRpcmVjdGlvbiAoZGVmYXVsdDogJ2xlZnQnKVxuICovXG5jb25zdCBzdGFnZ2VyRXhpdDogTEVTUHJpbWl0aXZlID0gYXN5bmMgKHNlbGVjdG9yLCBkdXJhdGlvbiwgZWFzaW5nLCBvcHRzLCBob3N0KSA9PiB7XG4gIC8vIEZpbHRlciB0byBvbmx5IGVsZW1lbnRzIHRoYXQgYXJlIGFjdHVhbGx5IHZpc2libGUgXHUyMDE0IHNraXAgaGlkZGVuL2FscmVhZHktZXhpdGVkIG9uZXNcbiAgbGV0IGVscyA9IHF1ZXJ5QWxsKHNlbGVjdG9yLCBob3N0KS5maWx0ZXIoZWwgPT4ge1xuICAgIGNvbnN0IHN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWwgYXMgSFRNTEVsZW1lbnQpXG4gICAgcmV0dXJuIHN0eWxlLmRpc3BsYXkgIT09ICdub25lJyAmJiBzdHlsZS52aXNpYmlsaXR5ICE9PSAnaGlkZGVuJ1xuICB9KVxuICBpZiAoZWxzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgY29uc3QgZ2FwICAgICA9IHBhcnNlTXMob3B0c1snZ2FwJ10gYXMgc3RyaW5nIHwgbnVtYmVyIHwgdW5kZWZpbmVkLCAyMClcbiAgY29uc3QgcmV2ZXJzZSA9IFN0cmluZyhvcHRzWydkaXJlY3Rpb24nXSA/PyAnJykgPT09ICdyZXZlcnNlJ1xuICBjb25zdCB0byAgICAgID0gKG9wdHNbJ3RvJ10gYXMgRGlyZWN0aW9uIHwgdW5kZWZpbmVkKSA/PyAnbGVmdCdcblxuICBpZiAocmV2ZXJzZSkgZWxzID0gWy4uLmVsc10ucmV2ZXJzZSgpXG5cbiAgZWxzLmZvckVhY2goY2FuY2VsQW5pbWF0aW9ucylcbiAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgZWxzLm1hcCgoZWwsIGkpID0+XG4gICAgICAoZWwgYXMgSFRNTEVsZW1lbnQpLmFuaW1hdGUoXG4gICAgICAgIHNsaWRlS2V5ZnJhbWVzKHRvLCBmYWxzZSksXG4gICAgICAgIHsgZHVyYXRpb24sIGVhc2luZywgZmlsbDogJ2ZvcndhcmRzJywgZGVsYXk6IGkgKiBnYXAgfVxuICAgICAgKS5maW5pc2hlZC5jYXRjaCgoZXJyOiB1bmtub3duKSA9PiB7XG4gICAgICAgIGlmIChlcnIgaW5zdGFuY2VvZiBET01FeGNlcHRpb24gJiYgZXJyLm5hbWUgPT09ICdBYm9ydEVycm9yJykgcmV0dXJuXG4gICAgICAgIHRocm93IGVyclxuICAgICAgfSlcbiAgICApXG4gIClcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBVdGlsaXR5OiBwYXJzZSBhIG1pbGxpc2Vjb25kIHZhbHVlIGZyb20gYSBzdHJpbmcgbGlrZSBcIjQwbXNcIiBvciBhIG51bWJlclxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIHBhcnNlTXModmFsOiBzdHJpbmcgfCBudW1iZXIgfCB1bmRlZmluZWQsIGZhbGxiYWNrOiBudW1iZXIpOiBudW1iZXIge1xuICBpZiAodmFsID09PSB1bmRlZmluZWQgfHwgdmFsID09PSBudWxsKSByZXR1cm4gZmFsbGJhY2tcbiAgaWYgKHR5cGVvZiB2YWwgPT09ICdudW1iZXInKSByZXR1cm4gdmFsXG4gIGNvbnN0IG0gPSBTdHJpbmcodmFsKS5tYXRjaCgvXihcXGQrKD86XFwuXFxkKyk/KW1zJC8pXG4gIGlmIChtKSByZXR1cm4gcGFyc2VGbG9hdChtWzFdISlcbiAgY29uc3QgbiA9IHBhcnNlRmxvYXQoU3RyaW5nKHZhbCkpXG4gIHJldHVybiBOdW1iZXIuaXNOYU4obikgPyBmYWxsYmFjayA6IG5cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBNb2R1bGUgZXhwb3J0XG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgYW5pbWF0aW9uTW9kdWxlOiBMRVNNb2R1bGUgPSB7XG4gIG5hbWU6ICdhbmltYXRpb24nLFxuICBwcmltaXRpdmVzOiB7XG4gICAgJ2ZhZGUtaW4nOiAgICAgICBmYWRlSW4sXG4gICAgJ2ZhZGUtb3V0JzogICAgICBmYWRlT3V0LFxuICAgICdzbGlkZS1pbic6ICAgICAgc2xpZGVJbixcbiAgICAnc2xpZGUtb3V0JzogICAgIHNsaWRlT3V0LFxuICAgICdzbGlkZS11cCc6ICAgICAgc2xpZGVVcCxcbiAgICAnc2xpZGUtZG93bic6ICAgIHNsaWRlRG93bixcbiAgICAncHVsc2UnOiAgICAgICAgIHB1bHNlLFxuICAgICdzdGFnZ2VyLWVudGVyJzogc3RhZ2dlckVudGVyLFxuICAgICdzdGFnZ2VyLWV4aXQnOiAgc3RhZ2dlckV4aXQsXG4gICAgJ3NoYWtlJzogICAgICAgICBzaGFrZSxcbiAgfSxcbn1cblxuZXhwb3J0IGRlZmF1bHQgYW5pbWF0aW9uTW9kdWxlXG4iLCAiaW1wb3J0IHR5cGUge1xuICBMRVNOb2RlLCBFeHByTm9kZSwgU2VxdWVuY2VOb2RlLCBQYXJhbGxlbE5vZGUsXG4gIFNldE5vZGUsIEVtaXROb2RlLCBCcm9hZGNhc3ROb2RlLCBXYWl0Tm9kZSxcbiAgQ2FsbE5vZGUsIEJpbmROb2RlLCBNYXRjaE5vZGUsIFRyeU5vZGUsIEFuaW1hdGlvbk5vZGUsXG59IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuaW1wb3J0IHR5cGUgeyBQYXR0ZXJuTm9kZSB9IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuaW1wb3J0IHsgTEVTU2NvcGUgfSBmcm9tICcuL3Njb3BlLmpzJ1xuaW1wb3J0IHR5cGUgeyBDb21tYW5kUmVnaXN0cnkgfSBmcm9tICcuL3JlZ2lzdHJ5LmpzJ1xuaW1wb3J0IHR5cGUgeyBNb2R1bGVSZWdpc3RyeSB9IGZyb20gJ0Btb2R1bGVzL3R5cGVzLmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEV4ZWN1dGlvbiBjb250ZXh0IFx1MjAxNCBldmVyeXRoaW5nIHRoZSBleGVjdXRvciBuZWVkcywgcGFzc2VkIGRvd24gdGhlIGNhbGwgdHJlZVxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBpbnRlcmZhY2UgTEVTQ29udGV4dCB7XG4gIC8qKiBMb2NhbCB2YXJpYWJsZSBzY29wZSBmb3IgdGhlIGN1cnJlbnQgY2FsbCBmcmFtZSAqL1xuICBzY29wZTogTEVTU2NvcGVcbiAgLyoqIFRoZSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBob3N0IGVsZW1lbnQgXHUyMDE0IHVzZWQgYXMgcXVlcnlTZWxlY3RvciByb290ICovXG4gIGhvc3Q6IEVsZW1lbnRcbiAgLyoqIENvbW1hbmQgZGVmaW5pdGlvbnMgcmVnaXN0ZXJlZCBieSA8bG9jYWwtY29tbWFuZD4gY2hpbGRyZW4gKi9cbiAgY29tbWFuZHM6IENvbW1hbmRSZWdpc3RyeVxuICAvKiogQW5pbWF0aW9uIGFuZCBvdGhlciBwcmltaXRpdmUgbW9kdWxlcyAqL1xuICBtb2R1bGVzOiBNb2R1bGVSZWdpc3RyeVxuICAvKiogUmVhZCBhIERhdGFzdGFyIHNpZ25hbCB2YWx1ZSBieSBuYW1lICh3aXRob3V0ICQgcHJlZml4KSAqL1xuICBnZXRTaWduYWw6IChuYW1lOiBzdHJpbmcpID0+IHVua25vd25cbiAgLyoqIFdyaXRlIGEgRGF0YXN0YXIgc2lnbmFsIHZhbHVlIGJ5IG5hbWUgKHdpdGhvdXQgJCBwcmVmaXgpICovXG4gIHNldFNpZ25hbDogKG5hbWU6IHN0cmluZywgdmFsdWU6IHVua25vd24pID0+IHZvaWRcbiAgLyoqIERpc3BhdGNoIGEgbG9jYWwgQ3VzdG9tRXZlbnQgb24gdGhlIGhvc3QgKGJ1YmJsZXM6IGZhbHNlKSAqL1xuICBlbWl0TG9jYWw6IChldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHZvaWRcbiAgLyoqIERpc3BhdGNoIGEgRE9NLXdpZGUgQ3VzdG9tRXZlbnQgKGJ1YmJsZXM6IHRydWUsIGNvbXBvc2VkOiB0cnVlKSAqL1xuICBicm9hZGNhc3Q6IChldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHZvaWRcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBNYWluIGV4ZWN1dG9yXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBFeGVjdXRlcyBhIExFU05vZGUgQVNUIGluIHRoZSBnaXZlbiBjb250ZXh0LlxuICpcbiAqIEFzeW5jIHRyYW5zcGFyZW5jeTogZXZlcnkgc3RlcCBpcyBhd2FpdGVkIHJlZ2FyZGxlc3Mgb2Ygd2hldGhlciBpdFxuICogaXMgc3luY2hyb25vdXMgb3IgcmV0dXJucyBhIFByb21pc2UuIFRoZSBhdXRob3IgbmV2ZXIgd3JpdGVzIGBhd2FpdGAuXG4gKiBUaGUgYHRoZW5gIGNvbm5lY3RpdmUgaW4gTEVTIHNvdXJjZSBtYXBzIHRvIHNlcXVlbnRpYWwgYGF3YWl0YCBoZXJlLlxuICogVGhlIGBhbmRgIGNvbm5lY3RpdmUgbWFwcyB0byBgUHJvbWlzZS5hbGxgLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZShub2RlOiBMRVNOb2RlLCBjdHg6IExFU0NvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcbiAgc3dpdGNoIChub2RlLnR5cGUpIHtcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBTZXF1ZW5jZTogQSB0aGVuIEIgdGhlbiBDIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3NlcXVlbmNlJzpcbiAgICAgIGZvciAoY29uc3Qgc3RlcCBvZiAobm9kZSBhcyBTZXF1ZW5jZU5vZGUpLnN0ZXBzKSB7XG4gICAgICAgIGF3YWl0IGV4ZWN1dGUoc3RlcCwgY3R4KVxuICAgICAgfVxuICAgICAgcmV0dXJuXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgUGFyYWxsZWw6IEEgYW5kIEIgYW5kIEMgKFByb21pc2UuYWxsKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdwYXJhbGxlbCc6XG4gICAgICBhd2FpdCBQcm9taXNlLmFsbCgobm9kZSBhcyBQYXJhbGxlbE5vZGUpLmJyYW5jaGVzLm1hcChiID0+IGV4ZWN1dGUoYiwgY3R4KSkpXG4gICAgICByZXR1cm5cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBzZXQgJHNpZ25hbCB0byBleHByIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3NldCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIFNldE5vZGVcbiAgICAgIGNvbnN0IHZhbHVlID0gZXZhbEV4cHIobi52YWx1ZSwgY3R4KVxuICAgICAgY3R4LnNldFNpZ25hbChuLnNpZ25hbCwgdmFsdWUpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgZW1pdCBldmVudDpuYW1lIFtwYXlsb2FkXSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdlbWl0Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgRW1pdE5vZGVcbiAgICAgIGNvbnN0IHBheWxvYWQgPSBuLnBheWxvYWQubWFwKHAgPT4gZXZhbEV4cHIocCwgY3R4KSlcbiAgICAgIGN0eC5lbWl0TG9jYWwobi5ldmVudCwgcGF5bG9hZClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBicm9hZGNhc3QgZXZlbnQ6bmFtZSBbcGF5bG9hZF0gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnYnJvYWRjYXN0Jzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQnJvYWRjYXN0Tm9kZVxuICAgICAgY29uc3QgcGF5bG9hZCA9IG4ucGF5bG9hZC5tYXAocCA9PiBldmFsRXhwcihwLCBjdHgpKVxuICAgICAgY3R4LmJyb2FkY2FzdChuLmV2ZW50LCBwYXlsb2FkKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIHdhaXQgTm1zIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3dhaXQnOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBXYWl0Tm9kZVxuICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG4ubXMpKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIGNhbGwgY29tbWFuZDpuYW1lIFthcmdzXSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdjYWxsJzoge1xuICAgICAgY29uc3QgbiA9IG5vZGUgYXMgQ2FsbE5vZGVcbiAgICAgIGNvbnN0IGRlZiA9IGN0eC5jb21tYW5kcy5nZXQobi5jb21tYW5kKVxuICAgICAgaWYgKCFkZWYpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGBbTEVTXSBVbmtub3duIGNvbW1hbmQ6IFwiJHtuLmNvbW1hbmR9XCJgKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgLy8gRXZhbHVhdGUgZ3VhcmQgXHUyMDE0IGZhbHN5ID0gc2lsZW50IG5vLW9wIChub3QgYW4gZXJyb3IsIG5vIHJlc2N1ZSlcbiAgICAgIGlmIChkZWYuZ3VhcmQpIHtcbiAgICAgICAgY29uc3QgcGFzc2VzID0gZXZhbEd1YXJkKGRlZi5ndWFyZCwgY3R4KVxuICAgICAgICBpZiAoIXBhc3Nlcykge1xuICAgICAgICAgIGNvbnNvbGUuZGVidWcoYFtMRVNdIGNvbW1hbmQgXCIke24uY29tbWFuZH1cIiBndWFyZCByZWplY3RlZGApXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gQnVpbGQgY2hpbGQgc2NvcGU6IGJpbmQgYXJncyBpbnRvIGl0XG4gICAgICBjb25zdCBjaGlsZFNjb3BlID0gY3R4LnNjb3BlLmNoaWxkKClcbiAgICAgIGNvbnN0IGV2YWxlZEFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge31cbiAgICAgIGZvciAoY29uc3QgW2tleSwgZXhwck5vZGVdIG9mIE9iamVjdC5lbnRyaWVzKG4uYXJncykpIHtcbiAgICAgICAgZXZhbGVkQXJnc1trZXldID0gZXZhbEV4cHIoZXhwck5vZGUsIGN0eClcbiAgICAgIH1cblxuICAgICAgLy8gQXBwbHkgYXJnIGRlZmF1bHRzIGZyb20gZGVmIChQaGFzZSAyIEFyZ0RlZiBwYXJzaW5nIFx1MjAxNCBzaW1wbGlmaWVkIGhlcmUpXG4gICAgICBmb3IgKGNvbnN0IGFyZ0RlZiBvZiBkZWYuYXJncykge1xuICAgICAgICBpZiAoIShhcmdEZWYubmFtZSBpbiBldmFsZWRBcmdzKSAmJiBhcmdEZWYuZGVmYXVsdCkge1xuICAgICAgICAgIGV2YWxlZEFyZ3NbYXJnRGVmLm5hbWVdID0gZXZhbEV4cHIoYXJnRGVmLmRlZmF1bHQsIGN0eClcbiAgICAgICAgfVxuICAgICAgICBjaGlsZFNjb3BlLnNldChhcmdEZWYubmFtZSwgZXZhbGVkQXJnc1thcmdEZWYubmFtZV0gPz8gbnVsbClcbiAgICAgIH1cblxuICAgICAgY29uc3QgY2hpbGRDdHg6IExFU0NvbnRleHQgPSB7IC4uLmN0eCwgc2NvcGU6IGNoaWxkU2NvcGUgfVxuICAgICAgYXdhaXQgZXhlY3V0ZShkZWYuYm9keSwgY2hpbGRDdHgpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgbmFtZSA8LSBAdmVyYiAndXJsJyBbYXJnc10gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY2FzZSAnYmluZCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIEJpbmROb2RlXG4gICAgICBjb25zdCB7IHZlcmIsIHVybCwgYXJncyB9ID0gbi5hY3Rpb25cbiAgICAgIGNvbnN0IGV2YWxlZEFyZ3M6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge31cbiAgICAgIGZvciAoY29uc3QgW2tleSwgZXhwck5vZGVdIG9mIE9iamVjdC5lbnRyaWVzKGFyZ3MpKSB7XG4gICAgICAgIGV2YWxlZEFyZ3Nba2V5XSA9IGV2YWxFeHByKGV4cHJOb2RlLCBjdHgpXG4gICAgICB9XG5cbiAgICAgIGxldCByZXN1bHQ6IHVua25vd25cbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3VsdCA9IGF3YWl0IHBlcmZvcm1BY3Rpb24odmVyYiwgdXJsLCBldmFsZWRBcmdzLCBjdHgpXG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgLy8gUHJvcGFnYXRlIHNvIGVuY2xvc2luZyB0cnkvcmVzY3VlIGNhbiBjYXRjaCBpdFxuICAgICAgICB0aHJvdyBlcnJcbiAgICAgIH1cblxuICAgICAgY3R4LnNjb3BlLnNldChuLm5hbWUsIHJlc3VsdClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBtYXRjaCBzdWJqZWN0IC8gYXJtcyAvIC9tYXRjaCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjYXNlICdtYXRjaCc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIE1hdGNoTm9kZVxuICAgICAgY29uc3Qgc3ViamVjdCA9IGV2YWxFeHByKG4uc3ViamVjdCwgY3R4KVxuXG4gICAgICBmb3IgKGNvbnN0IGFybSBvZiBuLmFybXMpIHtcbiAgICAgICAgY29uc3QgYmluZGluZ3MgPSBtYXRjaFBhdHRlcm5zKGFybS5wYXR0ZXJucywgc3ViamVjdClcbiAgICAgICAgaWYgKGJpbmRpbmdzICE9PSBudWxsKSB7XG4gICAgICAgICAgLy8gQ3JlYXRlIGNoaWxkIHNjb3BlIHdpdGggcGF0dGVybiBiaW5kaW5nc1xuICAgICAgICAgIGNvbnN0IGFybVNjb3BlID0gY3R4LnNjb3BlLmNoaWxkKClcbiAgICAgICAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhiaW5kaW5ncykpIHtcbiAgICAgICAgICAgIGFybVNjb3BlLnNldChrLCB2KVxuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBhcm1DdHg6IExFU0NvbnRleHQgPSB7IC4uLmN0eCwgc2NvcGU6IGFybVNjb3BlIH1cbiAgICAgICAgICBhd2FpdCBleGVjdXRlKGFybS5ib2R5LCBhcm1DdHgpXG4gICAgICAgICAgcmV0dXJuICAgLy8gRmlyc3QgbWF0Y2hpbmcgYXJtIHdpbnMgXHUyMDE0IG5vIGZhbGx0aHJvdWdoXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSBtYXRjaDogbm8gYXJtIG1hdGNoZWQgc3ViamVjdDonLCBzdWJqZWN0KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIHRyeSAvIHJlc2N1ZSAvIGFmdGVyd2FyZHMgLyAvdHJ5IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ3RyeSc6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIFRyeU5vZGVcbiAgICAgIGxldCB0aHJldyA9IGZhbHNlXG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGV4ZWN1dGUobi5ib2R5LCBjdHgpXG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgdGhyZXcgPSB0cnVlXG4gICAgICAgIGlmIChuLnJlc2N1ZSkge1xuICAgICAgICAgIC8vIEJpbmQgdGhlIGVycm9yIGFzIGAkZXJyb3JgIGluIHRoZSByZXNjdWUgc2NvcGVcbiAgICAgICAgICBjb25zdCByZXNjdWVTY29wZSA9IGN0eC5zY29wZS5jaGlsZCgpXG4gICAgICAgICAgcmVzY3VlU2NvcGUuc2V0KCdlcnJvcicsIGVycilcbiAgICAgICAgICBjb25zdCByZXNjdWVDdHg6IExFU0NvbnRleHQgPSB7IC4uLmN0eCwgc2NvcGU6IHJlc2N1ZVNjb3BlIH1cbiAgICAgICAgICBhd2FpdCBleGVjdXRlKG4ucmVzY3VlLCByZXNjdWVDdHgpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gTm8gcmVzY3VlIGNsYXVzZSBcdTIwMTQgcmUtdGhyb3cgc28gb3V0ZXIgdHJ5IGNhbiBjYXRjaCBpdFxuICAgICAgICAgIHRocm93IGVyclxuICAgICAgICB9XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBpZiAobi5hZnRlcndhcmRzKSB7XG4gICAgICAgICAgLy8gYWZ0ZXJ3YXJkcyBhbHdheXMgcnVucyBpZiBleGVjdXRpb24gZW50ZXJlZCB0aGUgdHJ5IGJvZHlcbiAgICAgICAgICAvLyAoZ3VhcmQgcmVqZWN0aW9uIG5ldmVyIHJlYWNoZXMgaGVyZSBcdTIwMTQgc2VlIGBjYWxsYCBoYW5kbGVyIGFib3ZlKVxuICAgICAgICAgIGF3YWl0IGV4ZWN1dGUobi5hZnRlcndhcmRzLCBjdHgpXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRocmV3ICYmICFuLnJlc2N1ZSkge1xuICAgICAgICAvLyBBbHJlYWR5IHJlLXRocm93biBhYm92ZSBcdTIwMTQgdW5yZWFjaGFibGUsIGJ1dCBUeXBlU2NyaXB0IG5lZWRzIHRoaXNcbiAgICAgIH1cbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIC8vIFx1MjUwMFx1MjUwMCBhbmltYXRpb24gcHJpbWl0aXZlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ2FuaW1hdGlvbic6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlIGFzIEFuaW1hdGlvbk5vZGVcbiAgICAgIGNvbnN0IHByaW1pdGl2ZSA9IGN0eC5tb2R1bGVzLmdldChuLnByaW1pdGl2ZSlcblxuICAgICAgaWYgKCFwcmltaXRpdmUpIHtcbiAgICAgICAgY29uc29sZS53YXJuKGN0eC5tb2R1bGVzLmhpbnRGb3Iobi5wcmltaXRpdmUpKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgLy8gUmVzb2x2ZSBzZWxlY3RvciBcdTIwMTQgc3Vic3RpdHV0ZSBhbnkgbG9jYWwgdmFyaWFibGUgcmVmZXJlbmNlc1xuICAgICAgY29uc3Qgc2VsZWN0b3IgPSByZXNvbHZlU2VsZWN0b3Iobi5zZWxlY3RvciwgY3R4KVxuXG4gICAgICAvLyBFdmFsdWF0ZSBvcHRpb25zXG4gICAgICBjb25zdCBvcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIGV4cHJOb2RlXSBvZiBPYmplY3QuZW50cmllcyhuLm9wdGlvbnMpKSB7XG4gICAgICAgIG9wdGlvbnNba2V5XSA9IGV2YWxFeHByKGV4cHJOb2RlLCBjdHgpXG4gICAgICB9XG5cbiAgICAgIC8vIEF3YWl0IHRoZSBhbmltYXRpb24gXHUyMDE0IHRoaXMgaXMgdGhlIGNvcmUgb2YgYXN5bmMgdHJhbnNwYXJlbmN5OlxuICAgICAgLy8gV2ViIEFuaW1hdGlvbnMgQVBJIHJldHVybnMgYW4gQW5pbWF0aW9uIHdpdGggYSAuZmluaXNoZWQgUHJvbWlzZS5cbiAgICAgIC8vIGB0aGVuYCBpbiBMRVMgc291cmNlIGF3YWl0cyB0aGlzIG5hdHVyYWxseS5cbiAgICAgIGF3YWl0IHByaW1pdGl2ZShzZWxlY3Rvciwgbi5kdXJhdGlvbiwgbi5lYXNpbmcsIG9wdGlvbnMsIGN0eC5ob3N0KVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIHJhdyBleHByZXNzaW9uIChlc2NhcGUgaGF0Y2ggLyB1bmtub3duIHN0YXRlbWVudHMpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGNhc2UgJ2V4cHInOiB7XG4gICAgICBjb25zdCBuID0gbm9kZSBhcyBFeHByTm9kZVxuICAgICAgaWYgKG4ucmF3LnRyaW0oKSkge1xuICAgICAgICAvLyBFdmFsdWF0ZSBhcyBhIEpTIGV4cHJlc3Npb24gZm9yIHNpZGUgZWZmZWN0c1xuICAgICAgICAvLyBUaGlzIGhhbmRsZXMgdW5rbm93biBwcmltaXRpdmVzIGFuZCBmdXR1cmUga2V5d29yZHMgZ3JhY2VmdWxseVxuICAgICAgICBldmFsRXhwcihuLCBjdHgpXG4gICAgICB9XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgYWN0aW9uIChiYXJlIEBnZXQgZXRjLiBub3QgaW5zaWRlIGEgYmluZCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgLy8gYEBnZXQgJy9hcGkvZmVlZCcgW2ZpbHRlcjogJGFjdGl2ZUZpbHRlcl1gXG4gICAgLy8gQXdhaXRzIHRoZSBmdWxsIFNTRSBzdHJlYW0gLyBKU09OIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlci5cbiAgICAvLyBEYXRhc3RhciBwcm9jZXNzZXMgdGhlIFNTRSBldmVudHMgKHBhdGNoLWVsZW1lbnRzLCBwYXRjaC1zaWduYWxzKSBhc1xuICAgIC8vIHRoZXkgYXJyaXZlLiBUaGUgUHJvbWlzZSByZXNvbHZlcyB3aGVuIHRoZSBzdHJlYW0gY2xvc2VzLlxuICAgIC8vIGB0aGVuYCBpbiBMRVMgY29ycmVjdGx5IHdhaXRzIGZvciB0aGlzIGJlZm9yZSBwcm9jZWVkaW5nLlxuICAgIGNhc2UgJ2FjdGlvbic6IHtcbiAgICAgIGNvbnN0IG4gPSBub2RlXG4gICAgICBjb25zdCBldmFsZWRBcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIGV4cHJOb2RlXSBvZiBPYmplY3QuZW50cmllcyhuLmFyZ3MpKSB7XG4gICAgICAgIGV2YWxlZEFyZ3Nba2V5XSA9IGV2YWxFeHByKGV4cHJOb2RlLCBjdHgpXG4gICAgICB9XG4gICAgICBhd2FpdCBwZXJmb3JtQWN0aW9uKG4udmVyYiwgbi51cmwsIGV2YWxlZEFyZ3MsIGN0eClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGRlZmF1bHQ6IHtcbiAgICAgIGNvbnN0IGV4aGF1c3RpdmU6IG5ldmVyID0gbm9kZVxuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSBVbmtub3duIG5vZGUgdHlwZTonLCAoZXhoYXVzdGl2ZSBhcyBMRVNOb2RlKS50eXBlKVxuICAgIH1cbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEV4cHJlc3Npb24gZXZhbHVhdGlvblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogRXZhbHVhdGVzIGEgcmF3IEpTIGV4cHJlc3Npb24gc3RyaW5nIGluIGEgc2FuZGJveGVkIGNvbnRleHQgdGhhdFxuICogZXhwb3NlcyBzY29wZSBsb2NhbHMgYW5kIERhdGFzdGFyIHNpZ25hbHMgdmlhIGEgUHJveHkuXG4gKlxuICogU2lnbmFsIGFjY2VzczogYCRmZWVkU3RhdGVgIFx1MjE5MiByZWFkcyB0aGUgYGZlZWRTdGF0ZWAgc2lnbmFsXG4gKiBMb2NhbCBhY2Nlc3M6ICBgZmlsdGVyYCAgICBcdTIxOTIgcmVhZHMgZnJvbSBzY29wZVxuICpcbiAqIFRoZSBzYW5kYm94IGlzIGludGVudGlvbmFsbHkgc2ltcGxlIGZvciBQaGFzZSAzLiBBIHByb3BlciBzYW5kYm94XG4gKiAoQ1NQLWNvbXBhdGlibGUsIG5vIGV2YWwgZmFsbGJhY2spIGlzIGEgZnV0dXJlIGhhcmRlbmluZyB0YXNrLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZXZhbEV4cHIobm9kZTogRXhwck5vZGUsIGN0eDogTEVTQ29udGV4dCk6IHVua25vd24ge1xuICBpZiAoIW5vZGUucmF3LnRyaW0oKSkgcmV0dXJuIHVuZGVmaW5lZFxuXG4gIC8vIEZhc3QgcGF0aDogc2ltcGxlIHN0cmluZyBsaXRlcmFsXG4gIGlmIChub2RlLnJhdy5zdGFydHNXaXRoKFwiJ1wiKSAmJiBub2RlLnJhdy5lbmRzV2l0aChcIidcIikpIHtcbiAgICByZXR1cm4gbm9kZS5yYXcuc2xpY2UoMSwgLTEpXG4gIH1cbiAgLy8gRmFzdCBwYXRoOiBudW1iZXIgbGl0ZXJhbFxuICBjb25zdCBudW0gPSBOdW1iZXIobm9kZS5yYXcpXG4gIGlmICghTnVtYmVyLmlzTmFOKG51bSkgJiYgbm9kZS5yYXcudHJpbSgpICE9PSAnJykgcmV0dXJuIG51bVxuICAvLyBGYXN0IHBhdGg6IGJvb2xlYW5cbiAgaWYgKG5vZGUucmF3ID09PSAndHJ1ZScpICByZXR1cm4gdHJ1ZVxuICBpZiAobm9kZS5yYXcgPT09ICdmYWxzZScpIHJldHVybiBmYWxzZVxuICBpZiAobm9kZS5yYXcgPT09ICdudWxsJyB8fCBub2RlLnJhdyA9PT0gJ25pbCcpIHJldHVybiBudWxsXG5cbiAgLy8gXHUyNTAwXHUyNTAwIEZhc3QgcGF0aHMgZm9yIGNvbW1vbiBhbmltYXRpb24vb3B0aW9uIHZhbHVlIHBhdHRlcm5zIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAvLyBUaGVzZSBhcmUgbm90IHZhbGlkIEpTIGV4cHJlc3Npb25zIGJ1dCBhcHBlYXIgYXMgYW5pbWF0aW9uIG9wdGlvbiB2YWx1ZXMuXG4gIC8vIFJldHVybiB0aGVtIGFzIHN0cmluZ3Mgc28gdGhlIGFuaW1hdGlvbiBtb2R1bGUgY2FuIGludGVycHJldCB0aGVtIGRpcmVjdGx5LlxuICBpZiAoL15cXGQrKFxcLlxcZCspP21zJC8udGVzdChub2RlLnJhdykpIHJldHVybiBub2RlLnJhdyAgICAgICAgICAgICAgICAgICAvLyBcIjIwbXNcIiwgXCI0MG1zXCJcbiAgaWYgKC9eXFxkKyhcXC5cXGQrKT9weCQvLnRlc3Qobm9kZS5yYXcpKSByZXR1cm4gbm9kZS5yYXcgICAgICAgICAgICAgICAgICAgLy8gXCI3cHhcIiwgXCIxMnB4XCJcbiAgaWYgKC9eW2EtekEtWl1bYS16QS1aMC05Xy1dKiQvLnRlc3Qobm9kZS5yYXcpKSB7XG4gICAgLy8gU2NvcGUgbG9va3VwIGZpcnN0IFx1MjAxNCBiYXJlIGlkZW50aWZpZXJzIGNhbiBiZSBsb2NhbCB2YXJpYWJsZXMgKGUuZy4gYHNlbGVjdG9yYCxcbiAgICAvLyBgaWRgLCBgZmlsdGVyYCkgT1IgYW5pbWF0aW9uIGtleXdvcmQgc3RyaW5ncyAoZS5nLiBgcmlnaHRgLCBgcmV2ZXJzZWAsIGBzaW1wbGV4YCkuXG4gICAgLy8gVmFyaWFibGVzIHdpbi4gT25seSByZXR1cm4gdGhlIHJhdyBzdHJpbmcgaWYgbm90aGluZyBpcyBmb3VuZCBpbiBzY29wZS9zaWduYWxzLlxuICAgIGNvbnN0IHNjb3BlZCA9IGN0eC5zY29wZS5nZXQobm9kZS5yYXcpXG4gICAgaWYgKHNjb3BlZCAhPT0gdW5kZWZpbmVkKSByZXR1cm4gc2NvcGVkXG4gICAgY29uc3Qgc2lnbmFsZWQgPSBjdHguZ2V0U2lnbmFsKG5vZGUucmF3KVxuICAgIGlmIChzaWduYWxlZCAhPT0gdW5kZWZpbmVkKSByZXR1cm4gc2lnbmFsZWRcbiAgICByZXR1cm4gbm9kZS5yYXcgICAvLyBrZXl3b3JkIHN0cmluZzogXCJyZXZlcnNlXCIsIFwicmlnaHRcIiwgXCJlYXNlLW91dFwiLCBcInNpbXBsZXhcIiwgZXRjLlxuICB9XG4gIGlmICgvXihjdWJpYy1iZXppZXJ8c3RlcHN8bGluZWFyKVxcKC8udGVzdChub2RlLnJhdykpIHJldHVybiBub2RlLnJhdyAgICAgIC8vIFwiY3ViaWMtYmV6aWVyKDAuMjIsMSwwLjM2LDEpXG5cbiAgdHJ5IHtcbiAgICAvLyBCdWlsZCBhIGZsYXQgb2JqZWN0IG9mIGFsbCBhY2Nlc3NpYmxlIG5hbWVzOlxuICAgIC8vIC0gU2NvcGUgbG9jYWxzIChpbm5lcm1vc3Qgd2lucylcbiAgICAvLyAtIERhdGFzdGFyIHNpZ25hbHMgdmlhICQtcHJlZml4IHN0cmlwcGluZ1xuICAgIGNvbnN0IHNjb3BlU25hcHNob3QgPSBjdHguc2NvcGUuc25hcHNob3QoKVxuXG4gICAgLy8gRXh0cmFjdCBzaWduYWwgcmVmZXJlbmNlcyBmcm9tIHRoZSBleHByZXNzaW9uICgkbmFtZSBcdTIxOTIgbmFtZSlcbiAgICBjb25zdCBzaWduYWxOYW1lcyA9IFsuLi5ub2RlLnJhdy5tYXRjaEFsbCgvXFwkKFthLXpBLVpfXVxcdyopL2cpXVxuICAgICAgLm1hcChtID0+IG1bMV0hKVxuXG4gICAgY29uc3Qgc2lnbmFsczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fVxuICAgIGZvciAoY29uc3QgbmFtZSBvZiBzaWduYWxOYW1lcykge1xuICAgICAgc2lnbmFsc1tuYW1lXSA9IGN0eC5nZXRTaWduYWwobmFtZSlcbiAgICB9XG5cbiAgICAvLyBSZXdyaXRlICRuYW1lIFx1MjE5MiBfX3NpZ19uYW1lIGluIHRoZSBleHByZXNzaW9uIHNvIHdlIGNhbiBwYXNzIHNpZ25hbHNcbiAgICAvLyBhcyBwbGFpbiB2YXJpYWJsZXMgKGF2b2lkcyAkIGluIEpTIGlkZW50aWZpZXJzKVxuICAgIGxldCByZXdyaXR0ZW4gPSBub2RlLnJhd1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBzaWduYWxOYW1lcykge1xuICAgICAgcmV3cml0dGVuID0gcmV3cml0dGVuLnJlcGxhY2VBbGwoYCQke25hbWV9YCwgYF9fc2lnXyR7bmFtZX1gKVxuICAgIH1cblxuICAgIC8vIFByZWZpeCBzaWduYWwgdmFycyBpbiB0aGUgYmluZGluZyBvYmplY3RcbiAgICBjb25zdCBzaWdCaW5kaW5nczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fVxuICAgIGZvciAoY29uc3QgW2ssIHZdIG9mIE9iamVjdC5lbnRyaWVzKHNpZ25hbHMpKSB7XG4gICAgICBzaWdCaW5kaW5nc1tgX19zaWdfJHtrfWBdID0gdlxuICAgIH1cblxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1uZXctZnVuY1xuICAgIGNvbnN0IGZuID0gbmV3IEZ1bmN0aW9uKFxuICAgICAgLi4uT2JqZWN0LmtleXMoc2NvcGVTbmFwc2hvdCksXG4gICAgICAuLi5PYmplY3Qua2V5cyhzaWdCaW5kaW5ncyksXG4gICAgICBgcmV0dXJuICgke3Jld3JpdHRlbn0pYFxuICAgIClcbiAgICByZXR1cm4gZm4oXG4gICAgICAuLi5PYmplY3QudmFsdWVzKHNjb3BlU25hcHNob3QpLFxuICAgICAgLi4uT2JqZWN0LnZhbHVlcyhzaWdCaW5kaW5ncylcbiAgICApXG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUud2FybihgW0xFU10gRXhwcmVzc2lvbiBldmFsIGVycm9yOiAke0pTT04uc3RyaW5naWZ5KG5vZGUucmF3KX1gLCBlcnIpXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG59XG5cbi8qKlxuICogRXZhbHVhdGVzIGEgZ3VhcmQgZXhwcmVzc2lvbiBzdHJpbmcgKGZyb20gY29tbWFuZCBgZ3VhcmRgIGF0dHJpYnV0ZSkuXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGd1YXJkIHBhc3NlcyAoY29tbWFuZCBzaG91bGQgcnVuKSwgZmFsc2UgdG8gc2lsZW50LWFib3J0LlxuICovXG5mdW5jdGlvbiBldmFsR3VhcmQoZ3VhcmRFeHByOiBzdHJpbmcsIGN0eDogTEVTQ29udGV4dCk6IGJvb2xlYW4ge1xuICBjb25zdCByZXN1bHQgPSBldmFsRXhwcih7IHR5cGU6ICdleHByJywgcmF3OiBndWFyZEV4cHIgfSwgY3R4KVxuICByZXR1cm4gQm9vbGVhbihyZXN1bHQpXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gUGF0dGVybiBtYXRjaGluZ1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogQXR0ZW1wdHMgdG8gbWF0Y2ggYHN1YmplY3RgIGFnYWluc3QgYHBhdHRlcm5zYC5cbiAqXG4gKiBSZXR1cm5zIGEgYmluZGluZ3MgbWFwIGlmIG1hdGNoZWQgKGVtcHR5IG1hcCBmb3Igd2lsZGNhcmQvbGl0ZXJhbCBtYXRjaGVzKSxcbiAqIG9yIG51bGwgaWYgdGhlIG1hdGNoIGZhaWxzLlxuICpcbiAqIEZvciB0dXBsZSBwYXR0ZXJucywgYHN1YmplY3RgIGlzIG1hdGNoZWQgZWxlbWVudC1ieS1lbGVtZW50LlxuICogRm9yIG9yLXBhdHRlcm5zLCBhbnkgYWx0ZXJuYXRpdmUgbWF0Y2hpbmcgcmV0dXJucyB0aGUgYmluZGluZ3MuXG4gKi9cbmZ1bmN0aW9uIG1hdGNoUGF0dGVybnMoXG4gIHBhdHRlcm5zOiBQYXR0ZXJuTm9kZVtdLFxuICBzdWJqZWN0OiB1bmtub3duXG4pOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IG51bGwge1xuICAvLyBTaW5nbGUtcGF0dGVybiAobW9zdCBjb21tb24pOiBtYXRjaCBkaXJlY3RseVxuICBpZiAocGF0dGVybnMubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIG1hdGNoU2luZ2xlKHBhdHRlcm5zWzBdISwgc3ViamVjdClcbiAgfVxuXG4gIC8vIFR1cGxlIHBhdHRlcm46IHN1YmplY3QgbXVzdCBiZSBhbiBhcnJheVxuICBpZiAoIUFycmF5LmlzQXJyYXkoc3ViamVjdCkpIHtcbiAgICAvLyBXcmFwIHNpbmdsZSB2YWx1ZSBpbiB0dXBsZSBmb3IgZXJnb25vbWljc1xuICAgIC8vIGUuZy4gYFtpdCBva11gIGFnYWluc3QgYSB7b2s6IHRydWUsIGRhdGE6IC4uLn0gcmVzcG9uc2VcbiAgICByZXR1cm4gbWF0Y2hUdXBsZShwYXR0ZXJucywgc3ViamVjdClcbiAgfVxuXG4gIHJldHVybiBtYXRjaFR1cGxlKHBhdHRlcm5zLCBzdWJqZWN0KVxufVxuXG5mdW5jdGlvbiBtYXRjaFR1cGxlKFxuICBwYXR0ZXJuczogUGF0dGVybk5vZGVbXSxcbiAgc3ViamVjdDogdW5rbm93blxuKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsIHtcbiAgLy8gRm9yIG5vbi1hcnJheSBzdWJqZWN0cywgdHJ5IGJpbmRpbmcgZWFjaCBwYXR0ZXJuIGFnYWluc3QgdGhlIHdob2xlIHN1YmplY3RcbiAgLy8gKGhhbmRsZXMgYFtpdCBva11gIG1hdGNoaW5nIGFuIG9iamVjdCB3aGVyZSBgaXRgID0gb2JqZWN0LCBgb2tgID0gc3RhdHVzKVxuICBjb25zdCBiaW5kaW5nczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcGF0dGVybnMubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBwYXQgPSBwYXR0ZXJuc1tpXSFcblxuICAgIC8vIEZvciB0dXBsZSBwYXR0ZXJucyBhZ2FpbnN0IG9iamVjdHMsIHdlIGRvIGEgc3RydWN0dXJhbCBtYXRjaDpcbiAgICAvLyBgW2l0IG9rXWAgYWdhaW5zdCB7ZGF0YTogLi4uLCBzdGF0dXM6ICdvayd9IGJpbmRzIGBpdGAgPSBkYXRhLCBgb2tgID0gJ29rJ1xuICAgIC8vIFRoaXMgaXMgYSBzaW1wbGlmaWNhdGlvbiBcdTIwMTQgZnVsbCBzdHJ1Y3R1cmFsIG1hdGNoaW5nIGNvbWVzIGluIGEgbGF0ZXIgcGFzc1xuICAgIGNvbnN0IHZhbHVlID0gQXJyYXkuaXNBcnJheShzdWJqZWN0KVxuICAgICAgPyBzdWJqZWN0W2ldXG4gICAgICA6IGkgPT09IDAgPyBzdWJqZWN0IDogdW5kZWZpbmVkXG5cbiAgICBjb25zdCByZXN1bHQgPSBtYXRjaFNpbmdsZShwYXQsIHZhbHVlKVxuICAgIGlmIChyZXN1bHQgPT09IG51bGwpIHJldHVybiBudWxsXG4gICAgT2JqZWN0LmFzc2lnbihiaW5kaW5ncywgcmVzdWx0KVxuICB9XG5cbiAgcmV0dXJuIGJpbmRpbmdzXG59XG5cbmZ1bmN0aW9uIG1hdGNoU2luZ2xlKFxuICBwYXR0ZXJuOiBQYXR0ZXJuTm9kZSxcbiAgdmFsdWU6IHVua25vd25cbik6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbCB7XG4gIHN3aXRjaCAocGF0dGVybi5raW5kKSB7XG4gICAgY2FzZSAnd2lsZGNhcmQnOlxuICAgICAgcmV0dXJuIHt9ICAgLy8gQWx3YXlzIG1hdGNoZXMsIGJpbmRzIG5vdGhpbmdcblxuICAgIGNhc2UgJ2xpdGVyYWwnOlxuICAgICAgcmV0dXJuIHZhbHVlID09PSBwYXR0ZXJuLnZhbHVlID8ge30gOiBudWxsXG5cbiAgICBjYXNlICdiaW5kaW5nJzpcbiAgICAgIHJldHVybiB7IFtwYXR0ZXJuLm5hbWVdOiB2YWx1ZSB9ICAgLy8gQWx3YXlzIG1hdGNoZXMsIGJpbmRzIG5hbWUgXHUyMTkyIHZhbHVlXG5cbiAgICBjYXNlICdvcic6IHtcbiAgICAgIGZvciAoY29uc3QgYWx0IG9mIHBhdHRlcm4ucGF0dGVybnMpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gbWF0Y2hTaW5nbGUoYWx0LCB2YWx1ZSlcbiAgICAgICAgaWYgKHJlc3VsdCAhPT0gbnVsbCkgcmV0dXJuIHJlc3VsdFxuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBIVFRQIGFjdGlvblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogUGVyZm9ybXMgYW4gSFRUUCBhY3Rpb24gKEBnZXQsIEBwb3N0LCBldGMuKS5cbiAqXG4gKiBXaGVuIERhdGFzdGFyIGFjdGlvbnMgYXJlIGF2YWlsYWJsZSBpbiB0aGUgaG9zdCdzIGNvbnRleHQsIHdlIHRyaWdnZXJcbiAqIERhdGFzdGFyJ3MgZmV0Y2ggcGlwZWxpbmUgKHdoaWNoIGhhbmRsZXMgc2lnbmFsIHNlcmlhbGl6YXRpb24sIFNTRVxuICogcmVzcG9uc2UgcHJvY2Vzc2luZywgYW5kIGluZGljYXRvciBzaWduYWxzKS5cbiAqXG4gKiBGYWxscyBiYWNrIHRvIG5hdGl2ZSBmZXRjaCB3aGVuIERhdGFzdGFyIGlzIG5vdCBwcmVzZW50LlxuICpcbiAqIE5vdGU6IERhdGFzdGFyJ3MgQGdldCAvIEBwb3N0IGFyZSBmaXJlLWFuZC1mb3JnZXQgKHRoZXkgc3RyZWFtIFNTRSBiYWNrXG4gKiB0byBwYXRjaCBzaWduYWxzL2VsZW1lbnRzKS4gRm9yIHRoZSBiaW5kIGNhc2UgKGByZXNwb25zZSA8LSBAZ2V0IC4uLmApXG4gKiB3ZSB1c2UgbmF0aXZlIGZldGNoIHRvIGdldCBhIFByb21pc2UtYmFzZWQgSlNPTiByZXNwb25zZSB0aGF0IExFUyBjYW5cbiAqIGJpbmQgdG8gYSBsb2NhbCB2YXJpYWJsZS5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gcGVyZm9ybUFjdGlvbihcbiAgdmVyYjogc3RyaW5nLFxuICB1cmw6IHN0cmluZyxcbiAgYXJnczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gIGN0eDogTEVTQ29udGV4dFxuKTogUHJvbWlzZTx1bmtub3duPiB7XG4gIGNvbnN0IG1ldGhvZCA9IHZlcmIudG9VcHBlckNhc2UoKVxuXG4gIGxldCBmdWxsVXJsID0gdXJsXG4gIGxldCBib2R5OiBzdHJpbmcgfCB1bmRlZmluZWRcblxuICBpZiAobWV0aG9kID09PSAnR0VUJyB8fCBtZXRob2QgPT09ICdERUxFVEUnKSB7XG4gICAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcygpXG4gICAgZm9yIChjb25zdCBbaywgdl0gb2YgT2JqZWN0LmVudHJpZXMoYXJncykpIHtcbiAgICAgIHBhcmFtcy5zZXQoaywgU3RyaW5nKHYpKVxuICAgIH1cbiAgICBjb25zdCBxcyA9IHBhcmFtcy50b1N0cmluZygpXG4gICAgaWYgKHFzKSBmdWxsVXJsID0gYCR7dXJsfT8ke3FzfWBcbiAgfSBlbHNlIHtcbiAgICBib2R5ID0gSlNPTi5zdHJpbmdpZnkoYXJncylcbiAgfVxuXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goZnVsbFVybCwge1xuICAgIG1ldGhvZCxcbiAgICBoZWFkZXJzOiB7XG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgJ0FjY2VwdCc6ICd0ZXh0L2V2ZW50LXN0cmVhbSwgYXBwbGljYXRpb24vanNvbicsXG4gICAgfSxcbiAgICAuLi4oYm9keSA/IHsgYm9keSB9IDoge30pLFxuICB9KVxuXG4gIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFtMRVNdIEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9IGZyb20gJHttZXRob2R9ICR7dXJsfWApXG4gIH1cblxuICBjb25zdCBjb250ZW50VHlwZSA9IHJlc3BvbnNlLmhlYWRlcnMuZ2V0KCdjb250ZW50LXR5cGUnKSA/PyAnJ1xuXG4gIC8vIFx1MjUwMFx1MjUwMCBTU0Ugc3RyZWFtOiBEYXRhc3RhciBzZXJ2ZXItc2VudCBldmVudHMgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gIC8vIFdoZW4gdGhlIHNlcnZlciByZXR1cm5zIHRleHQvZXZlbnQtc3RyZWFtLCBjb25zdW1lIHRoZSBTU0Ugc3RyZWFtIGFuZFxuICAvLyBhcHBseSBkYXRhc3Rhci1wYXRjaC1lbGVtZW50cyAvIGRhdGFzdGFyLXBhdGNoLXNpZ25hbHMgZXZlbnRzIG91cnNlbHZlcy5cbiAgLy8gVGhlIFByb21pc2UgcmVzb2x2ZXMgd2hlbiB0aGUgc3RyZWFtIGNsb3NlcyBcdTIwMTQgc28gYHRoZW5gIGluIExFUyBjb3JyZWN0bHlcbiAgLy8gd2FpdHMgZm9yIGFsbCBET00gcGF0Y2hlcyBiZWZvcmUgcHJvY2VlZGluZyB0byB0aGUgbmV4dCBzdGVwLlxuICBpZiAoY29udGVudFR5cGUuaW5jbHVkZXMoJ3RleHQvZXZlbnQtc3RyZWFtJykpIHtcbiAgICBhd2FpdCBjb25zdW1lU1NFU3RyZWFtKHJlc3BvbnNlLCBjdHgpXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG5cbiAgaWYgKGNvbnRlbnRUeXBlLmluY2x1ZGVzKCdhcHBsaWNhdGlvbi9qc29uJykpIHtcbiAgICByZXR1cm4gYXdhaXQgcmVzcG9uc2UuanNvbigpXG4gIH1cbiAgcmV0dXJuIGF3YWl0IHJlc3BvbnNlLnRleHQoKVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFNTRSBzdHJlYW0gY29uc3VtZXJcbi8vXG4vLyBSZWFkcyBhIERhdGFzdGFyIFNTRSBzdHJlYW0gbGluZS1ieS1saW5lIGFuZCBhcHBsaWVzIHRoZSBldmVudHMuXG4vLyBXZSBpbXBsZW1lbnQgYSBtaW5pbWFsIHN1YnNldCBvZiB0aGUgRGF0YXN0YXIgU1NFIHNwZWMgbmVlZGVkIGZvciBMRVM6XG4vL1xuLy8gICBkYXRhc3Rhci1wYXRjaC1lbGVtZW50cyAgXHUyMTkyIGFwcGx5IHRvIHRoZSBET00gdXNpbmcgbW9ycGhkb20tbGl0ZSBsb2dpY1xuLy8gICBkYXRhc3Rhci1wYXRjaC1zaWduYWxzICAgXHUyMTkyIHdyaXRlIHNpZ25hbCB2YWx1ZXMgdmlhIGN0eC5zZXRTaWduYWxcbi8vXG4vLyBUaGlzIHJ1bnMgZW50aXJlbHkgaW4gdGhlIGJyb3dzZXIgXHUyMDE0IG5vIERhdGFzdGFyIGludGVybmFsIEFQSXMgbmVlZGVkLlxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmFzeW5jIGZ1bmN0aW9uIGNvbnN1bWVTU0VTdHJlYW0oXG4gIHJlc3BvbnNlOiBSZXNwb25zZSxcbiAgY3R4OiBMRVNDb250ZXh0XG4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgaWYgKCFyZXNwb25zZS5ib2R5KSByZXR1cm5cblxuICBjb25zdCByZWFkZXIgID0gcmVzcG9uc2UuYm9keS5nZXRSZWFkZXIoKVxuICBjb25zdCBkZWNvZGVyID0gbmV3IFRleHREZWNvZGVyKClcbiAgbGV0IGJ1ZmZlciAgICA9ICcnXG5cbiAgLy8gU1NFIGV2ZW50IGFjY3VtdWxhdG9yIFx1MjAxNCByZXNldCBhZnRlciBlYWNoIGRvdWJsZS1uZXdsaW5lXG4gIGxldCBldmVudFR5cGUgPSAnJ1xuICBsZXQgZGF0YUxpbmVzOiBzdHJpbmdbXSA9IFtdXG5cbiAgY29uc3QgYXBwbHlFdmVudCA9ICgpID0+IHtcbiAgICBpZiAoIWV2ZW50VHlwZSB8fCBkYXRhTGluZXMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICAgIGlmIChldmVudFR5cGUgPT09ICdkYXRhc3Rhci1wYXRjaC1lbGVtZW50cycpIHtcbiAgICAgIGFwcGx5UGF0Y2hFbGVtZW50cyhkYXRhTGluZXMsIGN0eClcbiAgICB9IGVsc2UgaWYgKGV2ZW50VHlwZSA9PT0gJ2RhdGFzdGFyLXBhdGNoLXNpZ25hbHMnKSB7XG4gICAgICBhcHBseVBhdGNoU2lnbmFscyhkYXRhTGluZXMsIGN0eClcbiAgICB9XG5cbiAgICAvLyBSZXNldCBhY2N1bXVsYXRvclxuICAgIGV2ZW50VHlwZSA9ICcnXG4gICAgZGF0YUxpbmVzID0gW11cbiAgfVxuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgY29uc3QgeyBkb25lLCB2YWx1ZSB9ID0gYXdhaXQgcmVhZGVyLnJlYWQoKVxuICAgIGlmIChkb25lKSB7IGFwcGx5RXZlbnQoKTsgYnJlYWsgfVxuXG4gICAgYnVmZmVyICs9IGRlY29kZXIuZGVjb2RlKHZhbHVlLCB7IHN0cmVhbTogdHJ1ZSB9KVxuXG4gICAgLy8gUHJvY2VzcyBjb21wbGV0ZSBsaW5lcyBmcm9tIHRoZSBidWZmZXJcbiAgICBjb25zdCBsaW5lcyA9IGJ1ZmZlci5zcGxpdCgnXFxuJylcbiAgICBidWZmZXIgPSBsaW5lcy5wb3AoKSA/PyAnJyAgIC8vIGxhc3QgcGFydGlhbCBsaW5lIHN0YXlzIGluIGJ1ZmZlclxuXG4gICAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XG4gICAgICBpZiAobGluZS5zdGFydHNXaXRoKCdldmVudDonKSkge1xuICAgICAgICBldmVudFR5cGUgPSBsaW5lLnNsaWNlKCdldmVudDonLmxlbmd0aCkudHJpbSgpXG4gICAgICB9IGVsc2UgaWYgKGxpbmUuc3RhcnRzV2l0aCgnZGF0YTonKSkge1xuICAgICAgICBkYXRhTGluZXMucHVzaChsaW5lLnNsaWNlKCdkYXRhOicubGVuZ3RoKS50cmltU3RhcnQoKSlcbiAgICAgIH0gZWxzZSBpZiAobGluZSA9PT0gJycpIHtcbiAgICAgICAgLy8gQmxhbmsgbGluZSA9IGVuZCBvZiB0aGlzIFNTRSBldmVudFxuICAgICAgICBhcHBseUV2ZW50KClcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwIEFwcGx5IGRhdGFzdGFyLXBhdGNoLWVsZW1lbnRzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5mdW5jdGlvbiBhcHBseVBhdGNoRWxlbWVudHMoZGF0YUxpbmVzOiBzdHJpbmdbXSwgY3R4OiBMRVNDb250ZXh0KTogdm9pZCB7XG4gIC8vIFBhcnNlIHRoZSBzdHJ1Y3R1cmVkIGRhdGEgbGluZXMgaW50byBhbiBvcHRpb25zIG9iamVjdFxuICBsZXQgc2VsZWN0b3IgICAgPSAnJ1xuICBsZXQgbW9kZSAgICAgICAgPSAnb3V0ZXInXG4gIGNvbnN0IGh0bWxMaW5lczogc3RyaW5nW10gPSBbXVxuXG4gIGZvciAoY29uc3QgbGluZSBvZiBkYXRhTGluZXMpIHtcbiAgICBpZiAobGluZS5zdGFydHNXaXRoKCdzZWxlY3RvciAnKSkgIHsgc2VsZWN0b3IgPSBsaW5lLnNsaWNlKCdzZWxlY3RvciAnLmxlbmd0aCkudHJpbSgpOyBjb250aW51ZSB9XG4gICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnbW9kZSAnKSkgICAgICB7IG1vZGUgICAgID0gbGluZS5zbGljZSgnbW9kZSAnLmxlbmd0aCkudHJpbSgpOyAgICAgY29udGludWUgfVxuICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJ2VsZW1lbnRzICcpKSAgeyBodG1sTGluZXMucHVzaChsaW5lLnNsaWNlKCdlbGVtZW50cyAnLmxlbmd0aCkpOyAgIGNvbnRpbnVlIH1cbiAgICAvLyBMaW5lcyB3aXRoIG5vIHByZWZpeCBhcmUgYWxzbyBlbGVtZW50IGNvbnRlbnQgKERhdGFzdGFyIHNwZWMgYWxsb3dzIHRoaXMpXG4gICAgaHRtbExpbmVzLnB1c2gobGluZSlcbiAgfVxuXG4gIGNvbnN0IGh0bWwgPSBodG1sTGluZXMuam9pbignXFxuJykudHJpbSgpXG5cbiAgY29uc3QgdGFyZ2V0ID0gc2VsZWN0b3JcbiAgICA/IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpXG4gICAgOiBudWxsXG5cbiAgY29uc29sZS5sb2coYFtMRVM6c3NlXSBwYXRjaC1lbGVtZW50cyBtb2RlPSR7bW9kZX0gc2VsZWN0b3I9XCIke3NlbGVjdG9yfVwiIGh0bWwubGVuPSR7aHRtbC5sZW5ndGh9YClcblxuICBpZiAobW9kZSA9PT0gJ3JlbW92ZScpIHtcbiAgICAvLyBSZW1vdmUgYWxsIG1hdGNoaW5nIGVsZW1lbnRzXG4gICAgY29uc3QgdG9SZW1vdmUgPSBzZWxlY3RvclxuICAgICAgPyBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpKVxuICAgICAgOiBbXVxuICAgIHRvUmVtb3ZlLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpXG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAobW9kZSA9PT0gJ2FwcGVuZCcgJiYgdGFyZ2V0KSB7XG4gICAgY29uc3QgZnJhZyA9IHBhcnNlSFRNTChodG1sKVxuICAgIHRhcmdldC5hcHBlbmQoZnJhZylcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChtb2RlID09PSAncHJlcGVuZCcgJiYgdGFyZ2V0KSB7XG4gICAgY29uc3QgZnJhZyA9IHBhcnNlSFRNTChodG1sKVxuICAgIHRhcmdldC5wcmVwZW5kKGZyYWcpXG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAobW9kZSA9PT0gJ2lubmVyJyAmJiB0YXJnZXQpIHtcbiAgICB0YXJnZXQuaW5uZXJIVE1MID0gaHRtbFxuICAgIHJldHVyblxuICB9XG5cbiAgaWYgKG1vZGUgPT09ICdvdXRlcicgJiYgdGFyZ2V0KSB7XG4gICAgY29uc3QgZnJhZyA9IHBhcnNlSFRNTChodG1sKVxuICAgIHRhcmdldC5yZXBsYWNlV2l0aChmcmFnKVxuICAgIHJldHVyblxuICB9XG5cbiAgaWYgKG1vZGUgPT09ICdiZWZvcmUnICYmIHRhcmdldCkge1xuICAgIGNvbnN0IGZyYWcgPSBwYXJzZUhUTUwoaHRtbClcbiAgICB0YXJnZXQuYmVmb3JlKGZyYWcpXG4gICAgcmV0dXJuXG4gIH1cblxuICBpZiAobW9kZSA9PT0gJ2FmdGVyJyAmJiB0YXJnZXQpIHtcbiAgICBjb25zdCBmcmFnID0gcGFyc2VIVE1MKGh0bWwpXG4gICAgdGFyZ2V0LmFmdGVyKGZyYWcpXG4gICAgcmV0dXJuXG4gIH1cblxuICAvLyBObyBzZWxlY3RvcjogdHJ5IHRvIHBhdGNoIGJ5IGVsZW1lbnQgSURzXG4gIGlmICghc2VsZWN0b3IgJiYgaHRtbCkge1xuICAgIGNvbnN0IGZyYWcgPSBwYXJzZUhUTUwoaHRtbClcbiAgICBmb3IgKGNvbnN0IGVsIG9mIEFycmF5LmZyb20oZnJhZy5jaGlsZHJlbikpIHtcbiAgICAgIGNvbnN0IGlkID0gZWwuaWRcbiAgICAgIGlmIChpZCkge1xuICAgICAgICBjb25zdCBleGlzdGluZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKVxuICAgICAgICBpZiAoZXhpc3RpbmcpIGV4aXN0aW5nLnJlcGxhY2VXaXRoKGVsKVxuICAgICAgICBlbHNlIGRvY3VtZW50LmJvZHkuYXBwZW5kKGVsKVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBwYXJzZUhUTUwoaHRtbDogc3RyaW5nKTogRG9jdW1lbnRGcmFnbWVudCB7XG4gIGNvbnN0IHRlbXBsYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKVxuICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSBodG1sXG4gIHJldHVybiB0ZW1wbGF0ZS5jb250ZW50XG59XG5cbi8vIFx1MjUwMFx1MjUwMCBBcHBseSBkYXRhc3Rhci1wYXRjaC1zaWduYWxzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5mdW5jdGlvbiBhcHBseVBhdGNoU2lnbmFscyhkYXRhTGluZXM6IHN0cmluZ1tdLCBjdHg6IExFU0NvbnRleHQpOiB2b2lkIHtcbiAgZm9yIChjb25zdCBsaW5lIG9mIGRhdGFMaW5lcykge1xuICAgIGlmICghbGluZS5zdGFydHNXaXRoKCdzaWduYWxzICcpICYmICFsaW5lLnN0YXJ0c1dpdGgoJ3snKSkgY29udGludWVcblxuICAgIGNvbnN0IGpzb25TdHIgPSBsaW5lLnN0YXJ0c1dpdGgoJ3NpZ25hbHMgJylcbiAgICAgID8gbGluZS5zbGljZSgnc2lnbmFscyAnLmxlbmd0aClcbiAgICAgIDogbGluZVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHNpZ25hbHMgPSBKU09OLnBhcnNlKGpzb25TdHIpIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhzaWduYWxzKSkge1xuICAgICAgICBjdHguc2V0U2lnbmFsKGtleSwgdmFsdWUpXG4gICAgICAgIGNvbnNvbGUubG9nKGBbTEVTOnNzZV0gcGF0Y2gtc2lnbmFscyAkJHtrZXl9ID1gLCB2YWx1ZSlcbiAgICAgIH1cbiAgICB9IGNhdGNoIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFUzpzc2VdIEZhaWxlZCB0byBwYXJzZSBwYXRjaC1zaWduYWxzIEpTT046JywganNvblN0cilcbiAgICB9XG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBTZWxlY3RvciByZXNvbHV0aW9uXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBSZXNvbHZlcyB2YXJpYWJsZSByZWZlcmVuY2VzIGluIGFuIGFuaW1hdGlvbiBzZWxlY3Rvci5cbiAqXG4gKiBFeGFtcGxlOiBgW2RhdGEtaXRlbS1pZDogaWRdYCB3aGVyZSBgaWRgIGlzIGEgbG9jYWwgdmFyaWFibGVcbiAqIGJlY29tZXMgYFtkYXRhLWl0ZW0taWQ9XCIxMjNcIl1gIGFmdGVyIHN1YnN0aXR1dGlvbi5cbiAqXG4gKiBTaW1wbGUgYXBwcm9hY2ggZm9yIFBoYXNlIDM6IGxvb2sgZm9yIGA6IHZhcm5hbWVgIHBhdHRlcm5zIGluIGF0dHJpYnV0ZVxuICogc2VsZWN0b3JzIGFuZCBzdWJzdGl0dXRlIGZyb20gc2NvcGUuXG4gKi9cbmZ1bmN0aW9uIHJlc29sdmVTZWxlY3RvcihzZWxlY3Rvcjogc3RyaW5nLCBjdHg6IExFU0NvbnRleHQpOiBzdHJpbmcge1xuICAvLyBSZXNvbHZlcyBMRVMgYXR0cmlidXRlIHNlbGVjdG9ycyB0aGF0IGNvbnRhaW4gdmFyaWFibGUgZXhwcmVzc2lvbnM6XG4gIC8vICAgW2RhdGEtaXRlbS1pZDogaWRdICAgICAgICAgICBcdTIxOTIgW2RhdGEtaXRlbS1pZD1cIjQyXCJdXG4gIC8vICAgW2RhdGEtY2FyZC1pZDogcGF5bG9hZFswXV0gICBcdTIxOTIgW2RhdGEtY2FyZC1pZD1cIjNcIl1cbiAgLy9cbiAgLy8gQSByZWdleCBpcyBpbnN1ZmZpY2llbnQgYmVjYXVzZSB0aGUgdmFyaWFibGUgZXhwcmVzc2lvbiBjYW4gaXRzZWxmIGNvbnRhaW5cbiAgLy8gYnJhY2tldHMgKGUuZy4gcGF5bG9hZFswXSksIHdoaWNoIHdvdWxkIGNvbmZ1c2UgYSBbXlxcXV0rIHBhdHRlcm4uXG4gIC8vIFdlIHVzZSBhIGJyYWNrZXQtZGVwdGgtYXdhcmUgc2Nhbm5lciBpbnN0ZWFkLlxuICBsZXQgcmVzdWx0ID0gJydcbiAgbGV0IGkgPSAwXG4gIHdoaWxlIChpIDwgc2VsZWN0b3IubGVuZ3RoKSB7XG4gICAgaWYgKHNlbGVjdG9yW2ldID09PSAnWycpIHtcbiAgICAgIC8vIExvb2sgZm9yIFwiOiBcIiAoY29sb24tc3BhY2UpIGFzIHRoZSBhdHRyL3ZhckV4cHIgc2VwYXJhdG9yXG4gICAgICBjb25zdCBjb2xvbklkeCA9IHNlbGVjdG9yLmluZGV4T2YoJzogJywgaSlcbiAgICAgIGlmIChjb2xvbklkeCA9PT0gLTEpIHsgcmVzdWx0ICs9IHNlbGVjdG9yW2krK107IGNvbnRpbnVlIH1cblxuICAgICAgLy8gU2NhbiBmb3J3YXJkIGZyb20gdGhlIHZhckV4cHIgc3RhcnQsIHRyYWNraW5nIGJyYWNrZXQgZGVwdGgsXG4gICAgICAvLyB0byBmaW5kIHRoZSBdIHRoYXQgY2xvc2VzIHRoaXMgYXR0cmlidXRlIHNlbGVjdG9yIChub3QgYW4gaW5uZXIgb25lKVxuICAgICAgbGV0IGRlcHRoID0gMFxuICAgICAgbGV0IGNsb3NlSWR4ID0gLTFcbiAgICAgIGZvciAobGV0IGogPSBjb2xvbklkeCArIDI7IGogPCBzZWxlY3Rvci5sZW5ndGg7IGorKykge1xuICAgICAgICBpZiAoc2VsZWN0b3Jbal0gPT09ICdbJykgZGVwdGgrK1xuICAgICAgICBlbHNlIGlmIChzZWxlY3RvcltqXSA9PT0gJ10nKSB7XG4gICAgICAgICAgaWYgKGRlcHRoID09PSAwKSB7IGNsb3NlSWR4ID0gajsgYnJlYWsgfVxuICAgICAgICAgIGRlcHRoLS1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKGNsb3NlSWR4ID09PSAtMSkgeyByZXN1bHQgKz0gc2VsZWN0b3JbaSsrXTsgY29udGludWUgfVxuXG4gICAgICBjb25zdCBhdHRyICAgID0gc2VsZWN0b3Iuc2xpY2UoaSArIDEsIGNvbG9uSWR4KS50cmltKClcbiAgICAgIGNvbnN0IHZhckV4cHIgPSBzZWxlY3Rvci5zbGljZShjb2xvbklkeCArIDIsIGNsb3NlSWR4KS50cmltKClcbiAgICAgIGNvbnN0IHZhbHVlICAgPSBldmFsRXhwcih7IHR5cGU6ICdleHByJywgcmF3OiB2YXJFeHByIH0sIGN0eClcbiAgICAgIHJlc3VsdCArPSBgWyR7YXR0cn09XCIke1N0cmluZyh2YWx1ZSl9XCJdYFxuICAgICAgaSA9IGNsb3NlSWR4ICsgMVxuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQgKz0gc2VsZWN0b3JbaSsrXVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gR3VhcmQtYXdhcmUgY29tbWFuZCBleGVjdXRpb24gKHVzZWQgYnkgUGhhc2UgNCBldmVudCB3aXJpbmcpXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBFeGVjdXRlcyBhIGNvbW1hbmQgYnkgbmFtZSwgY2hlY2tpbmcgaXRzIGd1YXJkIGZpcnN0LlxuICogUmV0dXJucyB0cnVlIGlmIHRoZSBjb21tYW5kIHJhbiwgZmFsc2UgaWYgdGhlIGd1YXJkIHJlamVjdGVkIGl0LlxuICpcbiAqIFRoaXMgaXMgdGhlIHB1YmxpYyBBUEkgZm9yIFBoYXNlIDQgZXZlbnQgaGFuZGxlcnMgdGhhdCBjYWxsIGNvbW1hbmRzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuQ29tbWFuZChcbiAgbmFtZTogc3RyaW5nLFxuICBhcmdzOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgY3R4OiBMRVNDb250ZXh0XG4pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgZGVmID0gY3R4LmNvbW1hbmRzLmdldChuYW1lKVxuICBpZiAoIWRlZikge1xuICAgIGNvbnNvbGUud2FybihgW0xFU10gVW5rbm93biBjb21tYW5kOiBcIiR7bmFtZX1cImApXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICBpZiAoZGVmLmd1YXJkKSB7XG4gICAgaWYgKCFldmFsR3VhcmQoZGVmLmd1YXJkLCBjdHgpKSByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGNvbnN0IHNjb3BlID0gY3R4LnNjb3BlLmNoaWxkKClcbiAgZm9yIChjb25zdCBhcmdEZWYgb2YgZGVmLmFyZ3MpIHtcbiAgICBzY29wZS5zZXQoYXJnRGVmLm5hbWUsIGFyZ3NbYXJnRGVmLm5hbWVdID8/IG51bGwpXG4gIH1cblxuICBhd2FpdCBleGVjdXRlKGRlZi5ib2R5LCB7IC4uLmN0eCwgc2NvcGUgfSlcbiAgcmV0dXJuIHRydWVcbn1cbiIsICJpbXBvcnQgdHlwZSB7IExFU05vZGUsIEV4cHJOb2RlIH0gZnJvbSAnQHBhcnNlci9hc3QuanMnXG5cbi8qKiBBIHNpbmdsZSB0eXBlZCBhcmd1bWVudCBkZWZpbml0aW9uIGZyb20gYXJncz1cIltuYW1lOnR5cGUgIC4uLl1cIiAqL1xuZXhwb3J0IGludGVyZmFjZSBBcmdEZWYge1xuICBuYW1lOiBzdHJpbmdcbiAgLyoqICduaWwnIHwgJ2ludCcgfCAnZGVjJyB8ICdzdHInIHwgJ2FycicgfCAnb2JqJyB8ICdib29sJyB8ICdkeW4nICovXG4gIHR5cGU6IHN0cmluZ1xuICAvKiogRGVmYXVsdCB2YWx1ZSBleHByZXNzaW9uLCBpZiBwcm92aWRlZCAoZS5nLiBhdHRlbXB0OmludD0wKSAqL1xuICBkZWZhdWx0PzogRXhwck5vZGVcbn1cblxuLyoqIEEgZnVsbHkgcGFyc2VkIDxsb2NhbC1jb21tYW5kPiBkZWZpbml0aW9uLiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kRGVmIHtcbiAgbmFtZTogc3RyaW5nXG4gIGFyZ3M6IEFyZ0RlZltdXG4gIC8qKiBHdWFyZCBleHByZXNzaW9uIHN0cmluZyBcdTIwMTQgZXZhbHVhdGVkIGJlZm9yZSBleGVjdXRpb24uIEZhbHN5ID0gc2lsZW50IG5vLW9wLiAqL1xuICBndWFyZD86IHN0cmluZ1xuICAvKiogVGhlIHBhcnNlZCBib2R5IEFTVCAqL1xuICBib2R5OiBMRVNOb2RlXG4gIC8qKiBUaGUgPGxvY2FsLWNvbW1hbmQ+IERPTSBlbGVtZW50LCBrZXB0IGZvciBlcnJvciByZXBvcnRpbmcgKi9cbiAgZWxlbWVudDogRWxlbWVudFxufVxuXG5leHBvcnQgY2xhc3MgQ29tbWFuZFJlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBjb21tYW5kcyA9IG5ldyBNYXA8c3RyaW5nLCBDb21tYW5kRGVmPigpXG5cbiAgcmVnaXN0ZXIoZGVmOiBDb21tYW5kRGVmKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuY29tbWFuZHMuaGFzKGRlZi5uYW1lKSkge1xuICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICBgW0xFU10gRHVwbGljYXRlIGNvbW1hbmQgXCIke2RlZi5uYW1lfVwiIFx1MjAxNCBwcmV2aW91cyBkZWZpbml0aW9uIG92ZXJ3cml0dGVuLmAsXG4gICAgICAgIGRlZi5lbGVtZW50XG4gICAgICApXG4gICAgfVxuICAgIHRoaXMuY29tbWFuZHMuc2V0KGRlZi5uYW1lLCBkZWYpXG4gIH1cblxuICBnZXQobmFtZTogc3RyaW5nKTogQ29tbWFuZERlZiB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuY29tbWFuZHMuZ2V0KG5hbWUpXG4gIH1cblxuICBoYXMobmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuY29tbWFuZHMuaGFzKG5hbWUpXG4gIH1cblxuICBuYW1lcygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5jb21tYW5kcy5rZXlzKCkpXG4gIH1cbn1cbiIsICIvLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIExFUyBNb2R1bGUgc3lzdGVtXG4vL1xuLy8gTW9kdWxlcyBleHRlbmQgdGhlIHNldCBvZiBhbmltYXRpb24vZWZmZWN0IHByaW1pdGl2ZXMgYXZhaWxhYmxlIGluXG4vLyA8bG9jYWwtY29tbWFuZD4gYm9kaWVzLiBUd28ga2luZHM6XG4vL1xuLy8gICBCdWlsdC1pbjogIDx1c2UtbW9kdWxlIHR5cGU9XCJhbmltYXRpb25cIj5cbi8vICAgVXNlcmxhbmQ6ICA8dXNlLW1vZHVsZSBzcmM9XCIuL3Njcm9sbC1lZmZlY3RzLmpzXCI+XG4vL1xuLy8gQm90aCByZXNvbHZlIHRvIGEgTEVTTW9kdWxlIGF0IHJ1bnRpbWUuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBBIHByaW1pdGl2ZSBpcyBhbiBhc3luYyBvcGVyYXRpb24gdGhlIGV4ZWN1dG9yIGRpc3BhdGNoZXMgZm9yIEFuaW1hdGlvbk5vZGUuXG4gKlxuICogQHBhcmFtIHNlbGVjdG9yICBDU1Mgc2VsZWN0b3Igc3RyaW5nIChhbHJlYWR5IHJlc29sdmVkIFx1MjAxNCBubyB2YXJpYWJsZSBzdWJzdGl0dXRpb24gbmVlZGVkIGhlcmUpXG4gKiBAcGFyYW0gZHVyYXRpb24gIG1pbGxpc2Vjb25kc1xuICogQHBhcmFtIGVhc2luZyAgICBDU1MgZWFzaW5nIHN0cmluZywgZS5nLiAnZWFzZS1vdXQnXG4gKiBAcGFyYW0gb3B0aW9ucyAgIGtleS92YWx1ZSBvcHRpb25zIGZyb20gdGhlIHRyYWlsaW5nIFsuLi5dIGJsb2NrLCBhbHJlYWR5IGV2YWx1YXRlZFxuICogQHBhcmFtIGhvc3QgICAgICB0aGUgPGxvY2FsLWV2ZW50LXNjcmlwdD4gZWxlbWVudCAodXNlZCBhcyBxdWVyeVNlbGVjdG9yIHJvb3QpXG4gKi9cbmV4cG9ydCB0eXBlIExFU1ByaW1pdGl2ZSA9IChcbiAgc2VsZWN0b3I6IHN0cmluZyxcbiAgZHVyYXRpb246IG51bWJlcixcbiAgZWFzaW5nOiBzdHJpbmcsXG4gIG9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICBob3N0OiBFbGVtZW50XG4pID0+IFByb21pc2U8dm9pZD5cblxuLyoqIFRoZSBzaGFwZSBhIHVzZXJsYW5kIG1vZHVsZSBtdXN0IGV4cG9ydCBhcyBpdHMgZGVmYXVsdCBleHBvcnQuICovXG5leHBvcnQgaW50ZXJmYWNlIExFU01vZHVsZSB7XG4gIC8qKiBIdW1hbi1yZWFkYWJsZSBuYW1lIGZvciBlcnJvciBtZXNzYWdlcyAqL1xuICBuYW1lOiBzdHJpbmdcbiAgcHJpbWl0aXZlczogUmVjb3JkPHN0cmluZywgTEVTUHJpbWl0aXZlPlxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgUmVnaXN0cnkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBjbGFzcyBNb2R1bGVSZWdpc3RyeSB7XG4gIHByaXZhdGUgcHJpbWl0aXZlcyA9IG5ldyBNYXA8c3RyaW5nLCBMRVNQcmltaXRpdmU+KClcbiAgcHJpdmF0ZSBsb2FkZWRNb2R1bGVzOiBzdHJpbmdbXSA9IFtdXG5cbiAgcmVnaXN0ZXIobW9kdWxlOiBMRVNNb2R1bGUpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IFtuYW1lLCBmbl0gb2YgT2JqZWN0LmVudHJpZXMobW9kdWxlLnByaW1pdGl2ZXMpKSB7XG4gICAgICB0aGlzLnByaW1pdGl2ZXMuc2V0KG5hbWUsIGZuKVxuICAgIH1cbiAgICB0aGlzLmxvYWRlZE1vZHVsZXMucHVzaChtb2R1bGUubmFtZSlcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gbW9kdWxlIGxvYWRlZDogXCIke21vZHVsZS5uYW1lfVwiYCwgT2JqZWN0LmtleXMobW9kdWxlLnByaW1pdGl2ZXMpKVxuICB9XG5cbiAgZ2V0KHByaW1pdGl2ZTogc3RyaW5nKTogTEVTUHJpbWl0aXZlIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5wcmltaXRpdmVzLmdldChwcmltaXRpdmUpXG4gIH1cblxuICBoYXMocHJpbWl0aXZlOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5wcmltaXRpdmVzLmhhcyhwcmltaXRpdmUpXG4gIH1cblxuICAvKiogRGV2LW1vZGUgaGVscDogd2hpY2ggbW9kdWxlIGV4cG9ydHMgYSBnaXZlbiBwcmltaXRpdmU/ICovXG4gIGhpbnRGb3IocHJpbWl0aXZlOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIC8vIFdpbGwgYmUgZW5yaWNoZWQgaW4gUGhhc2UgOCB3aXRoIHBlci1tb2R1bGUgcHJpbWl0aXZlIG1hbmlmZXN0cy5cbiAgICByZXR1cm4gYFByaW1pdGl2ZSBcIiR7cHJpbWl0aXZlfVwiIG5vdCBmb3VuZC4gTG9hZGVkIG1vZHVsZXM6IFske3RoaXMubG9hZGVkTW9kdWxlcy5qb2luKCcsICcpfV0uIERpZCB5b3UgZm9yZ2V0IDx1c2UtbW9kdWxlIHR5cGU9XCJhbmltYXRpb25cIj4/YFxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBMb2FkZXIgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKiBCdWlsdC1pbiBtb2R1bGUgcmVnaXN0cnk6IHR5cGUgbmFtZSBcdTIxOTIgaW1wb3J0IHBhdGggKi9cbmNvbnN0IEJVSUxUSU5fTU9EVUxFUzogUmVjb3JkPHN0cmluZywgKCkgPT4gUHJvbWlzZTx7IGRlZmF1bHQ6IExFU01vZHVsZSB9Pj4gPSB7XG4gIGFuaW1hdGlvbjogKCkgPT4gaW1wb3J0KCcuL2J1aWx0aW4vYW5pbWF0aW9uLmpzJyksXG59XG5cbi8qKlxuICogUmVzb2x2ZSBhIDx1c2UtbW9kdWxlPiBlbGVtZW50IHRvIGEgTEVTTW9kdWxlIGFuZCByZWdpc3RlciBpdC5cbiAqIENhbGxlZCBkdXJpbmcgUGhhc2UgMSBET00gcmVhZGluZyAoUGhhc2UgOCBjb21wbGV0ZXMgdGhlIHNyYz0gcGF0aCkuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkTW9kdWxlKFxuICByZWdpc3RyeTogTW9kdWxlUmVnaXN0cnksXG4gIG9wdHM6IHsgdHlwZT86IHN0cmluZzsgc3JjPzogc3RyaW5nIH1cbik6IFByb21pc2U8dm9pZD4ge1xuICBpZiAob3B0cy50eXBlKSB7XG4gICAgY29uc3QgbG9hZGVyID0gQlVJTFRJTl9NT0RVTEVTW29wdHMudHlwZV1cbiAgICBpZiAoIWxvYWRlcikge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTXSBVbmtub3duIGJ1aWx0LWluIG1vZHVsZSB0eXBlOiBcIiR7b3B0cy50eXBlfVwiLiBBdmFpbGFibGU6ICR7T2JqZWN0LmtleXMoQlVJTFRJTl9NT0RVTEVTKS5qb2luKCcsICcpfWApXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uc3QgbW9kID0gYXdhaXQgbG9hZGVyKClcbiAgICByZWdpc3RyeS5yZWdpc3Rlcihtb2QuZGVmYXVsdClcbiAgICByZXR1cm5cbiAgfVxuXG4gIGlmIChvcHRzLnNyYykge1xuICAgIHRyeSB7XG4gICAgICAvLyBSZXNvbHZlIHJlbGF0aXZlIHBhdGhzIGFnYWluc3QgdGhlIHBhZ2UgVVJMLCBub3QgdGhlIGJ1bmRsZSBVUkwuXG4gICAgICAvLyBXaXRob3V0IHRoaXMsICcuL3Njcm9sbC1lZmZlY3RzLmpzJyByZXNvbHZlcyB0byAnL2Rpc3Qvc2Nyb2xsLWVmZmVjdHMuanMnXG4gICAgICAvLyAocmVsYXRpdmUgdG8gdGhlIGJ1bmRsZSBhdCAvZGlzdC9sb2NhbC1ldmVudC1zY3JpcHQuanMpIGluc3RlYWQgb2ZcbiAgICAgIC8vICcvc2Nyb2xsLWVmZmVjdHMuanMnIChyZWxhdGl2ZSB0byB0aGUgSFRNTCBwYWdlKS5cbiAgICAgIGNvbnN0IHJlc29sdmVkU3JjID0gbmV3IFVSTChvcHRzLnNyYywgZG9jdW1lbnQuYmFzZVVSSSkuaHJlZlxuICAgICAgY29uc3QgbW9kID0gYXdhaXQgaW1wb3J0KC8qIEB2aXRlLWlnbm9yZSAqLyByZXNvbHZlZFNyYylcbiAgICAgIGlmICghbW9kLmRlZmF1bHQgfHwgdHlwZW9mIG1vZC5kZWZhdWx0LnByaW1pdGl2ZXMgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgW0xFU10gTW9kdWxlIGF0IFwiJHtvcHRzLnNyY31cIiBkb2VzIG5vdCBleHBvcnQgYSB2YWxpZCBMRVNNb2R1bGUuIEV4cGVjdGVkOiB7IG5hbWU6IHN0cmluZywgcHJpbWl0aXZlczogUmVjb3JkPHN0cmluZywgRnVuY3Rpb24+IH1gKVxuICAgICAgICByZXR1cm5cbiAgICAgIH1cbiAgICAgIHJlZ2lzdHJ5LnJlZ2lzdGVyKG1vZC5kZWZhdWx0IGFzIExFU01vZHVsZSlcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFtMRVNdIEZhaWxlZCB0byBsb2FkIG1vZHVsZSBmcm9tIFwiJHtvcHRzLnNyY31cIjpgLCBlcnIpXG4gICAgfVxuICAgIHJldHVyblxuICB9XG5cbiAgY29uc29sZS53YXJuKCdbTEVTXSA8dXNlLW1vZHVsZT4gcmVxdWlyZXMgZWl0aGVyIHR5cGU9IG9yIHNyYz0gYXR0cmlidXRlLicpXG59XG4iLCAiLyoqXG4gKiBTdHJpcHMgdGhlIGJhY2t0aWNrIHdyYXBwZXIgZnJvbSBhIG11bHRpLWxpbmUgTEVTIGJvZHkgc3RyaW5nIGFuZFxuICogbm9ybWFsaXplcyBpbmRlbnRhdGlvbiwgcHJvZHVjaW5nIGEgY2xlYW4gc3RyaW5nIHRoZSBwYXJzZXIgY2FuIHdvcmsgd2l0aC5cbiAqXG4gKiBDb252ZW50aW9uOlxuICogICBTaW5nbGUtbGluZTogIGhhbmRsZT1cImVtaXQgZmVlZDppbml0XCIgICAgICAgICAgIFx1MjE5MiBcImVtaXQgZmVlZDppbml0XCJcbiAqICAgTXVsdGktbGluZTogICBkbz1cImBcXG4gICAgICBzZXQuLi5cXG4gICAgYFwiICAgICAgICBcdTIxOTIgXCJzZXQuLi5cXG4uLi5cIlxuICpcbiAqIEFsZ29yaXRobTpcbiAqICAgMS4gVHJpbSBvdXRlciB3aGl0ZXNwYWNlIGZyb20gdGhlIHJhdyBhdHRyaWJ1dGUgdmFsdWUuXG4gKiAgIDIuIElmIHdyYXBwZWQgaW4gYmFja3RpY2tzLCBzdHJpcCB0aGVtIFx1MjAxNCBkbyBOT1QgaW5uZXItdHJpbSB5ZXQuXG4gKiAgIDMuIFNwbGl0IGludG8gbGluZXMgYW5kIGNvbXB1dGUgbWluaW11bSBub24temVybyBpbmRlbnRhdGlvblxuICogICAgICBhY3Jvc3MgYWxsIG5vbi1lbXB0eSBsaW5lcy4gVGhpcyBpcyB0aGUgSFRNTCBhdHRyaWJ1dGUgaW5kZW50YXRpb25cbiAqICAgICAgbGV2ZWwgdG8gcmVtb3ZlLlxuICogICA0LiBTdHJpcCB0aGF0IG1hbnkgbGVhZGluZyBjaGFyYWN0ZXJzIGZyb20gZXZlcnkgbGluZS5cbiAqICAgNS4gRHJvcCBsZWFkaW5nL3RyYWlsaW5nIGJsYW5rIGxpbmVzLCByZXR1cm4gam9pbmVkIHJlc3VsdC5cbiAqXG4gKiBDcnVjaWFsbHksIHN0ZXAgMiBkb2VzIE5PVCBjYWxsIC50cmltKCkgb24gdGhlIGlubmVyIGNvbnRlbnQgYmVmb3JlXG4gKiBjb21wdXRpbmcgaW5kZW50YXRpb24uIEFuIGlubmVyIC50cmltKCkgd291bGQgZGVzdHJveSB0aGUgbGVhZGluZ1xuICogd2hpdGVzcGFjZSBvbiBsaW5lIDEsIG1ha2luZyBtaW5JbmRlbnQgPSAwIGFuZCBsZWF2aW5nIGFsbCBvdGhlclxuICogbGluZXMgdW4tZGUtaW5kZW50ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdHJpcEJvZHkocmF3OiBzdHJpbmcpOiBzdHJpbmcge1xuICBsZXQgcyA9IHJhdy50cmltKClcblxuICAvLyBTdHJpcCBiYWNrdGljayB3cmFwcGVyIFx1MjAxNCBidXQgcHJlc2VydmUgaW50ZXJuYWwgd2hpdGVzcGFjZSBmb3IgZGUtaW5kZW50XG4gIGlmIChzLnN0YXJ0c1dpdGgoJ2AnKSAmJiBzLmVuZHNXaXRoKCdgJykpIHtcbiAgICBzID0gcy5zbGljZSgxLCAtMSlcbiAgICAvLyBEbyBOT1QgLnRyaW0oKSBoZXJlIFx1MjAxNCB0aGF0IGtpbGxzIHRoZSBsZWFkaW5nIGluZGVudCBvbiBsaW5lIDFcbiAgfVxuXG4gIGNvbnN0IGxpbmVzID0gcy5zcGxpdCgnXFxuJylcbiAgY29uc3Qgbm9uRW1wdHkgPSBsaW5lcy5maWx0ZXIobCA9PiBsLnRyaW0oKS5sZW5ndGggPiAwKVxuICBpZiAobm9uRW1wdHkubGVuZ3RoID09PSAwKSByZXR1cm4gJydcblxuICAvLyBGb3Igc2luZ2xlLWxpbmUgdmFsdWVzIChubyBuZXdsaW5lcyBhZnRlciBiYWNrdGljayBzdHJpcCksIGp1c3QgdHJpbVxuICBpZiAobGluZXMubGVuZ3RoID09PSAxKSByZXR1cm4gcy50cmltKClcblxuICAvLyBNaW5pbXVtIGxlYWRpbmcgd2hpdGVzcGFjZSBhY3Jvc3Mgbm9uLWVtcHR5IGxpbmVzXG4gIGNvbnN0IG1pbkluZGVudCA9IG5vbkVtcHR5LnJlZHVjZSgobWluLCBsaW5lKSA9PiB7XG4gICAgY29uc3QgbGVhZGluZyA9IGxpbmUubWF0Y2goL14oXFxzKikvKT8uWzFdPy5sZW5ndGggPz8gMFxuICAgIHJldHVybiBNYXRoLm1pbihtaW4sIGxlYWRpbmcpXG4gIH0sIEluZmluaXR5KVxuXG4gIGNvbnN0IHN0cmlwcGVkID0gbWluSW5kZW50ID09PSAwIHx8IG1pbkluZGVudCA9PT0gSW5maW5pdHlcbiAgICA/IGxpbmVzXG4gICAgOiBsaW5lcy5tYXAobGluZSA9PiBsaW5lLmxlbmd0aCA+PSBtaW5JbmRlbnQgPyBsaW5lLnNsaWNlKG1pbkluZGVudCkgOiBsaW5lLnRyaW1TdGFydCgpKVxuXG4gIC8vIERyb3AgbGVhZGluZyBhbmQgdHJhaWxpbmcgYmxhbmsgbGluZXMgKHRoZSBuZXdsaW5lcyBhcm91bmQgYmFja3RpY2sgY29udGVudClcbiAgbGV0IHN0YXJ0ID0gMFxuICBsZXQgZW5kID0gc3RyaXBwZWQubGVuZ3RoIC0gMVxuICB3aGlsZSAoc3RhcnQgPD0gZW5kICYmIHN0cmlwcGVkW3N0YXJ0XT8udHJpbSgpID09PSAnJykgc3RhcnQrK1xuICB3aGlsZSAoZW5kID49IHN0YXJ0ICYmIHN0cmlwcGVkW2VuZF0/LnRyaW0oKSA9PT0gJycpIGVuZC0tXG5cbiAgcmV0dXJuIHN0cmlwcGVkLnNsaWNlKHN0YXJ0LCBlbmQgKyAxKS5qb2luKCdcXG4nKVxufVxuIiwgImltcG9ydCB0eXBlIHtcbiAgTEVTQ29uZmlnLFxuICBNb2R1bGVEZWNsLFxuICBDb21tYW5kRGVjbCxcbiAgRXZlbnRIYW5kbGVyRGVjbCxcbiAgU2lnbmFsV2F0Y2hlckRlY2wsXG4gIE9uTG9hZERlY2wsXG4gIE9uRW50ZXJEZWNsLFxuICBPbkV4aXREZWNsLFxufSBmcm9tICcuL2NvbmZpZy5qcydcbmltcG9ydCB7IHN0cmlwQm9keSB9IGZyb20gJy4vc3RyaXBCb2R5LmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFRhZyBuYW1lIFx1MjE5MiBoYW5kbGVyIG1hcFxuLy8gRWFjaCBoYW5kbGVyIHJlYWRzIGF0dHJpYnV0ZXMgZnJvbSBhIGNoaWxkIGVsZW1lbnQgYW5kIHB1c2hlcyBhIHR5cGVkIGRlY2xcbi8vIGludG8gdGhlIGNvbmZpZyBiZWluZyBidWlsdC4gVW5rbm93biB0YWdzIGFyZSBjb2xsZWN0ZWQgZm9yIHdhcm5pbmcuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxudHlwZSBIYW5kbGVyID0gKGVsOiBFbGVtZW50LCBjb25maWc6IExFU0NvbmZpZykgPT4gdm9pZFxuXG5jb25zdCBIQU5ETEVSUzogUmVjb3JkPHN0cmluZywgSGFuZGxlcj4gPSB7XG5cbiAgJ3VzZS1tb2R1bGUnKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCB0eXBlID0gZWwuZ2V0QXR0cmlidXRlKCd0eXBlJyk/LnRyaW0oKSA/PyBudWxsXG4gICAgY29uc3Qgc3JjICA9IGVsLmdldEF0dHJpYnV0ZSgnc3JjJyk/LnRyaW0oKSAgPz8gbnVsbFxuXG4gICAgaWYgKCF0eXBlICYmICFzcmMpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPHVzZS1tb2R1bGU+IGhhcyBuZWl0aGVyIHR5cGU9IG5vciBzcmM9IFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgY29uZmlnLm1vZHVsZXMucHVzaCh7IHR5cGUsIHNyYywgZWxlbWVudDogZWwgfSlcbiAgfSxcblxuICAnbG9jYWwtY29tbWFuZCcoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IG5hbWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpID8/ICcnXG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgnZG8nKT8udHJpbSgpICAgPz8gJydcblxuICAgIGlmICghbmFtZSkge1xuICAgICAgY29uc29sZS53YXJuKCdbTEVTXSA8bG9jYWwtY29tbWFuZD4gbWlzc2luZyByZXF1aXJlZCBuYW1lPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgaWYgKCFib2R5KSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVNdIDxsb2NhbC1jb21tYW5kIG5hbWU9XCIke25hbWV9XCI+IG1pc3NpbmcgcmVxdWlyZWQgZG89IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC5gLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbmZpZy5jb21tYW5kcy5wdXNoKHtcbiAgICAgIG5hbWUsXG4gICAgICBhcmdzUmF3OiBlbC5nZXRBdHRyaWJ1dGUoJ2FyZ3MnKT8udHJpbSgpICA/PyAnJyxcbiAgICAgIGd1YXJkOiAgIGVsLmdldEF0dHJpYnV0ZSgnZ3VhcmQnKT8udHJpbSgpID8/IG51bGwsXG4gICAgICBib2R5OiAgICBzdHJpcEJvZHkoYm9keSksXG4gICAgICBlbGVtZW50OiBlbCxcbiAgICB9KVxuICB9LFxuXG4gICdvbi1ldmVudCcoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IG5hbWUgPSBlbC5nZXRBdHRyaWJ1dGUoJ25hbWUnKT8udHJpbSgpICAgPz8gJydcbiAgICBjb25zdCBib2R5ID0gZWwuZ2V0QXR0cmlidXRlKCdoYW5kbGUnKT8udHJpbSgpID8/ICcnXG5cbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPG9uLWV2ZW50PiBtaXNzaW5nIHJlcXVpcmVkIG5hbWU9IGF0dHJpYnV0ZSBcdTIwMTQgaWdub3JlZC4nLCBlbClcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBpZiAoIWJvZHkpIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFU10gPG9uLWV2ZW50IG5hbWU9XCIke25hbWV9XCI+IG1pc3NpbmcgcmVxdWlyZWQgaGFuZGxlPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuYCwgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25maWcub25FdmVudC5wdXNoKHsgbmFtZSwgYm9keTogc3RyaXBCb2R5KGJvZHkpLCBlbGVtZW50OiBlbCB9KVxuICB9LFxuXG4gICdvbi1zaWduYWwnKGVsLCBjb25maWcpIHtcbiAgICBjb25zdCBuYW1lID0gZWwuZ2V0QXR0cmlidXRlKCduYW1lJyk/LnRyaW0oKSAgID8/ICcnXG4gICAgY29uc3QgYm9keSA9IGVsLmdldEF0dHJpYnV0ZSgnaGFuZGxlJyk/LnRyaW0oKSA/PyAnJ1xuXG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1tMRVNdIDxvbi1zaWduYWw+IG1pc3NpbmcgcmVxdWlyZWQgbmFtZT0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGlmICghYm9keSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTXSA8b24tc2lnbmFsIG5hbWU9XCIke25hbWV9XCI+IG1pc3NpbmcgcmVxdWlyZWQgaGFuZGxlPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuYCwgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBjb25maWcub25TaWduYWwucHVzaCh7XG4gICAgICBuYW1lLFxuICAgICAgd2hlbjogICAgZWwuZ2V0QXR0cmlidXRlKCd3aGVuJyk/LnRyaW0oKSA/PyBudWxsLFxuICAgICAgYm9keTogICAgc3RyaXBCb2R5KGJvZHkpLFxuICAgICAgZWxlbWVudDogZWwsXG4gICAgfSlcbiAgfSxcblxuICAnb24tbG9hZCcoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IGJvZHkgPSBlbC5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgICBpZiAoIWJvZHkpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPG9uLWxvYWQ+IG1pc3NpbmcgcmVxdWlyZWQgcnVuPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uZmlnLm9uTG9hZC5wdXNoKHsgYm9keTogc3RyaXBCb2R5KGJvZHkpLCBlbGVtZW50OiBlbCB9KVxuICB9LFxuXG4gICdvbi1lbnRlcicoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IGJvZHkgPSBlbC5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgICBpZiAoIWJvZHkpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPG9uLWVudGVyPiBtaXNzaW5nIHJlcXVpcmVkIHJ1bj0gYXR0cmlidXRlIFx1MjAxNCBpZ25vcmVkLicsIGVsKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGNvbmZpZy5vbkVudGVyLnB1c2goe1xuICAgICAgd2hlbjogICAgZWwuZ2V0QXR0cmlidXRlKCd3aGVuJyk/LnRyaW0oKSA/PyBudWxsLFxuICAgICAgYm9keTogICAgc3RyaXBCb2R5KGJvZHkpLFxuICAgICAgZWxlbWVudDogZWwsXG4gICAgfSlcbiAgfSxcblxuICAnb24tZXhpdCcoZWwsIGNvbmZpZykge1xuICAgIGNvbnN0IGJvZHkgPSBlbC5nZXRBdHRyaWJ1dGUoJ3J1bicpPy50cmltKCkgPz8gJydcbiAgICBpZiAoIWJvZHkpIHtcbiAgICAgIGNvbnNvbGUud2FybignW0xFU10gPG9uLWV4aXQ+IG1pc3NpbmcgcmVxdWlyZWQgcnVuPSBhdHRyaWJ1dGUgXHUyMDE0IGlnbm9yZWQuJywgZWwpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgY29uZmlnLm9uRXhpdC5wdXNoKHsgYm9keTogc3RyaXBCb2R5KGJvZHkpLCBlbGVtZW50OiBlbCB9KVxuICB9LFxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIHJlYWRDb25maWcgXHUyMDE0IHRoZSBwdWJsaWMgZW50cnkgcG9pbnRcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFdhbGtzIHRoZSBkaXJlY3QgY2hpbGRyZW4gb2YgYSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBlbGVtZW50IGFuZFxuICogcHJvZHVjZXMgYSBzdHJ1Y3R1cmVkIExFU0NvbmZpZy5cbiAqXG4gKiBPbmx5IGRpcmVjdCBjaGlsZHJlbiBhcmUgcmVhZCBcdTIwMTQgbmVzdGVkIGVsZW1lbnRzIGluc2lkZSBhIDxsb2NhbC1jb21tYW5kPlxuICogYm9keSBhcmUgbm90IGNoaWxkcmVuIG9mIHRoZSBob3N0IGFuZCBhcmUgbmV2ZXIgdmlzaXRlZCBoZXJlLlxuICpcbiAqIFVua25vd24gY2hpbGQgZWxlbWVudHMgZW1pdCBhIGNvbnNvbGUud2FybiBhbmQgYXJlIGNvbGxlY3RlZCBpbiBjb25maWcudW5rbm93blxuICogc28gdG9vbGluZyAoZS5nLiBhIGZ1dHVyZSBMRVMgbGFuZ3VhZ2Ugc2VydmVyKSBjYW4gcmVwb3J0IHRoZW0uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkQ29uZmlnKGhvc3Q6IEVsZW1lbnQpOiBMRVNDb25maWcge1xuICBjb25zdCBjb25maWc6IExFU0NvbmZpZyA9IHtcbiAgICBpZDogICAgICAgaG9zdC5pZCB8fCAnKG5vIGlkKScsXG4gICAgbW9kdWxlczogIFtdLFxuICAgIGNvbW1hbmRzOiBbXSxcbiAgICBvbkV2ZW50OiAgW10sXG4gICAgb25TaWduYWw6IFtdLFxuICAgIG9uTG9hZDogICBbXSxcbiAgICBvbkVudGVyOiAgW10sXG4gICAgb25FeGl0OiAgIFtdLFxuICAgIHVua25vd246ICBbXSxcbiAgfVxuXG4gIGZvciAoY29uc3QgY2hpbGQgb2YgQXJyYXkuZnJvbShob3N0LmNoaWxkcmVuKSkge1xuICAgIGNvbnN0IHRhZyA9IGNoaWxkLnRhZ05hbWUudG9Mb3dlckNhc2UoKVxuICAgIGNvbnN0IGhhbmRsZXIgPSBIQU5ETEVSU1t0YWddXG5cbiAgICBpZiAoaGFuZGxlcikge1xuICAgICAgaGFuZGxlcihjaGlsZCwgY29uZmlnKVxuICAgIH0gZWxzZSB7XG4gICAgICBjb25maWcudW5rbm93bi5wdXNoKGNoaWxkKVxuICAgICAgLy8gT25seSB3YXJuIGZvciBoeXBoZW5hdGVkIGN1c3RvbSBlbGVtZW50IG5hbWVzIFx1MjAxNCB0aG9zZSBhcmUgbGlrZWx5XG4gICAgICAvLyBtaXMtdHlwZWQgTEVTIGtleXdvcmRzLiBQbGFpbiBIVE1MIGVsZW1lbnRzIChkaXYsIHAsIHNlY3Rpb24sIGV0Yy4pXG4gICAgICAvLyBhcmUgdmFsaWQgY29udGVudCBjaGlsZHJlbiBhbmQgcGFzcyB0aHJvdWdoIHNpbGVudGx5LlxuICAgICAgaWYgKHRhZy5pbmNsdWRlcygnLScpKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihcbiAgICAgICAgICBgW0xFU10gVW5rbm93biBjaGlsZCBlbGVtZW50IDwke3RhZ30+IGluc2lkZSA8bG9jYWwtZXZlbnQtc2NyaXB0IGlkPVwiJHtjb25maWcuaWR9XCI+IFx1MjAxNCBpZ25vcmVkLiBEaWQgeW91IG1lYW4gYSBMRVMgZWxlbWVudD9gLFxuICAgICAgICAgIGNoaWxkXG4gICAgICAgIClcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gY29uZmlnXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gbG9nQ29uZmlnIFx1MjAxNCBzdHJ1Y3R1cmVkIGNoZWNrcG9pbnQgbG9nXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBMb2dzIGEgc3VtbWFyeSBvZiBhIHBhcnNlZCBMRVNDb25maWcuXG4gKiBQaGFzZSAxIGNoZWNrcG9pbnQ6IHlvdSBzaG91bGQgc2VlIHRoaXMgaW4gdGhlIGJyb3dzZXIgY29uc29sZS9kZWJ1ZyBsb2dcbiAqIHdpdGggYWxsIGNvbW1hbmRzLCBldmVudHMsIGFuZCBzaWduYWwgd2F0Y2hlcnMgY29ycmVjdGx5IGxpc3RlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvZ0NvbmZpZyhjb25maWc6IExFU0NvbmZpZyk6IHZvaWQge1xuICBjb25zdCBpZCA9IGNvbmZpZy5pZFxuICBjb25zb2xlLmxvZyhgW0xFU10gY29uZmlnIHJlYWQgZm9yICMke2lkfWApXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG1vZHVsZXM6ICAgJHtjb25maWcubW9kdWxlcy5sZW5ndGh9YCwgY29uZmlnLm1vZHVsZXMubWFwKG0gPT4gbS50eXBlID8/IG0uc3JjKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgY29tbWFuZHM6ICAke2NvbmZpZy5jb21tYW5kcy5sZW5ndGh9YCwgY29uZmlnLmNvbW1hbmRzLm1hcChjID0+IGMubmFtZSkpXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG9uLWV2ZW50OiAgJHtjb25maWcub25FdmVudC5sZW5ndGh9YCwgY29uZmlnLm9uRXZlbnQubWFwKGUgPT4gZS5uYW1lKSlcbiAgY29uc29sZS5sb2coYFtMRVNdICAgb24tc2lnbmFsOiAke2NvbmZpZy5vblNpZ25hbC5sZW5ndGh9YCwgY29uZmlnLm9uU2lnbmFsLm1hcChzID0+IHMubmFtZSkpXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG9uLWxvYWQ6ICAgJHtjb25maWcub25Mb2FkLmxlbmd0aH1gKVxuICBjb25zb2xlLmxvZyhgW0xFU10gICBvbi1lbnRlcjogICR7Y29uZmlnLm9uRW50ZXIubGVuZ3RofWAsIGNvbmZpZy5vbkVudGVyLm1hcChlID0+IGUud2hlbiA/PyAnYWx3YXlzJykpXG4gIGNvbnNvbGUubG9nKGBbTEVTXSAgIG9uLWV4aXQ6ICAgJHtjb25maWcub25FeGl0Lmxlbmd0aH1gKVxuXG4gIGNvbnN0IHVua25vd25DdXN0b20gPSBjb25maWcudW5rbm93bi5maWx0ZXIoZSA9PiBlLnRhZ05hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcygnLScpKVxuICBpZiAodW5rbm93bkN1c3RvbS5sZW5ndGggPiAwKSB7XG4gICAgY29uc29sZS53YXJuKGBbTEVTXSAgIHVua25vd24gY3VzdG9tIGNoaWxkcmVuOiAke3Vua25vd25DdXN0b20ubGVuZ3RofWAsIHVua25vd25DdXN0b20ubWFwKGUgPT4gZS50YWdOYW1lLnRvTG93ZXJDYXNlKCkpKVxuICB9XG5cbiAgLy8gTG9nIGEgc2FtcGxpbmcgb2YgYm9keSBzdHJpbmdzIHRvIHZlcmlmeSBzdHJpcEJvZHkgd29ya2VkIGNvcnJlY3RseVxuICBpZiAoY29uZmlnLmNvbW1hbmRzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBmaXJzdCA9IGNvbmZpZy5jb21tYW5kc1swXVxuICAgIGlmIChmaXJzdCkge1xuICAgICAgY29uc29sZS5sb2coYFtMRVNdICAgZmlyc3QgY29tbWFuZCBib2R5IHByZXZpZXcgKFwiJHtmaXJzdC5uYW1lfVwiKTpgKVxuICAgICAgY29uc3QgcHJldmlldyA9IGZpcnN0LmJvZHkuc3BsaXQoJ1xcbicpLnNsaWNlKDAsIDQpLmpvaW4oJ1xcbiAgJylcbiAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSAgIHwgJHtwcmV2aWV3fWApXG4gICAgfVxuICB9XG59XG4iLCAiLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBMRVMgVG9rZW5pemVyXG4vL1xuLy8gQ29udmVydHMgYSBzdHJpcEJvZHknZCBzb3VyY2Ugc3RyaW5nIGludG8gYSBmbGF0IGFycmF5IG9mIFRva2VuIG9iamVjdHMuXG4vLyBUb2tlbnMgYXJlIHNpbXBseSBub24tYmxhbmsgbGluZXMgd2l0aCB0aGVpciBpbmRlbnQgbGV2ZWwgcmVjb3JkZWQuXG4vLyBObyBzZW1hbnRpYyBhbmFseXNpcyBoYXBwZW5zIGhlcmUgXHUyMDE0IHRoYXQncyB0aGUgcGFyc2VyJ3Mgam9iLlxuLy9cbi8vIFRoZSB0b2tlbml6ZXIgaXMgZGVsaWJlcmF0ZWx5IG1pbmltYWw6IGl0IHByZXNlcnZlcyB0aGUgcmF3IGluZGVudGF0aW9uXG4vLyBpbmZvcm1hdGlvbiB0aGUgcGFyc2VyIG5lZWRzIHRvIHVuZGVyc3RhbmQgYmxvY2sgc3RydWN0dXJlLlxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmV4cG9ydCBpbnRlcmZhY2UgVG9rZW4ge1xuICAvKiogQ29sdW1uIG9mZnNldCBvZiB0aGUgZmlyc3Qgbm9uLXdoaXRlc3BhY2UgY2hhcmFjdGVyIChudW1iZXIgb2Ygc3BhY2VzKSAqL1xuICBpbmRlbnQ6IG51bWJlclxuICAvKiogVHJpbW1lZCBsaW5lIGNvbnRlbnQgXHUyMDE0IG5vIGxlYWRpbmcvdHJhaWxpbmcgd2hpdGVzcGFjZSAqL1xuICB0ZXh0OiBzdHJpbmdcbiAgLyoqIDEtYmFzZWQgbGluZSBudW1iZXIgaW4gdGhlIHN0cmlwcGVkIHNvdXJjZSAoZm9yIGVycm9yIG1lc3NhZ2VzKSAqL1xuICBsaW5lTnVtOiBudW1iZXJcbn1cblxuLyoqXG4gKiBDb252ZXJ0cyBhIHN0cmlwcGVkIExFUyBib2R5IHN0cmluZyBpbnRvIGEgVG9rZW4gYXJyYXkuXG4gKiBCbGFuayBsaW5lcyBhcmUgZHJvcHBlZC4gVGFicyBhcmUgZXhwYW5kZWQgdG8gMiBzcGFjZXMgZWFjaC5cbiAqXG4gKiBAcGFyYW0gc291cmNlICBBIHN0cmluZyBhbHJlYWR5IHByb2Nlc3NlZCBieSBzdHJpcEJvZHkoKSBcdTIwMTQgbm8gYmFja3RpY2sgd3JhcHBlcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b2tlbml6ZShzb3VyY2U6IHN0cmluZyk6IFRva2VuW10ge1xuICBjb25zdCB0b2tlbnM6IFRva2VuW10gPSBbXVxuICBjb25zdCBsaW5lcyA9IHNvdXJjZS5zcGxpdCgnXFxuJylcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgcmF3ID0gKGxpbmVzW2ldID8/ICcnKS5yZXBsYWNlKC9cXHQvZywgJyAgJylcbiAgICBjb25zdCB0ZXh0ID0gcmF3LnRyaW0oKVxuXG4gICAgLy8gU2tpcCBibGFuayBsaW5lc1xuICAgIGlmICh0ZXh0Lmxlbmd0aCA9PT0gMCkgY29udGludWVcblxuICAgIGNvbnN0IGluZGVudCA9IHJhdy5sZW5ndGggLSByYXcudHJpbVN0YXJ0KCkubGVuZ3RoXG5cbiAgICB0b2tlbnMucHVzaCh7XG4gICAgICBpbmRlbnQsXG4gICAgICB0ZXh0LFxuICAgICAgbGluZU51bTogaSArIDEsXG4gICAgfSlcbiAgfVxuXG4gIHJldHVybiB0b2tlbnNcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBIZWxwZXJzIHVzZWQgYnkgYm90aCB0aGUgdG9rZW5pemVyIHRlc3RzIGFuZCB0aGUgcGFyc2VyXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgYHRleHRgIGVuZHMgd2l0aCBhIHN0YW5kYWxvbmUgYGFuZGAgd29yZC5cbiAqIFVzZWQgYnkgdGhlIHBhcnNlciB0byBkZXRlY3QgcGFyYWxsZWwgYnJhbmNoZXMuXG4gKlxuICogQ2FyZWZ1bDogXCJlbmdsYW5kXCIsIFwiYmFuZFwiLCBcImNvbW1hbmRcIiBtdXN0IE5PVCBtYXRjaC5cbiAqIFdlIHJlcXVpcmUgYSB3b3JkIGJvdW5kYXJ5IGJlZm9yZSBgYW5kYCBhbmQgZW5kLW9mLXN0cmluZyBhZnRlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuZHNXaXRoQW5kKHRleHQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gL1xcYmFuZCQvLnRlc3QodGV4dClcbn1cblxuLyoqXG4gKiBTdHJpcHMgdGhlIHRyYWlsaW5nIGAgYW5kYCBmcm9tIGEgbGluZSB0aGF0IGVuZHNXaXRoQW5kLlxuICogUmV0dXJucyB0aGUgdHJpbW1lZCBsaW5lIGNvbnRlbnQgd2l0aG91dCBpdC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN0cmlwVHJhaWxpbmdBbmQodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHRleHQucmVwbGFjZSgvXFxzK2FuZCQvLCAnJykudHJpbUVuZCgpXG59XG5cbi8qKlxuICogQmxvY2sgdGVybWluYXRvciB0b2tlbnMgXHUyMDE0IHNpZ25hbCB0aGUgZW5kIG9mIGEgbWF0Y2ggb3IgdHJ5IGJsb2NrLlxuICogVGhlc2UgYXJlIGNvbnN1bWVkIGJ5IHRoZSBibG9jay1vd25pbmcgcGFyc2VyIChwYXJzZU1hdGNoIC8gcGFyc2VUcnkpLFxuICogbm90IGJ5IHBhcnNlQmxvY2sgaXRzZWxmLlxuICovXG5leHBvcnQgY29uc3QgQkxPQ0tfVEVSTUlOQVRPUlMgPSBuZXcgU2V0KFsnL21hdGNoJywgJy90cnknXSlcblxuLyoqXG4gKiBLZXl3b3JkcyB0aGF0IGVuZCBhIHRyeSBib2R5IGFuZCBzdGFydCBhIHJlc2N1ZS9hZnRlcndhcmRzIGNsYXVzZS5cbiAqIFJlY29nbml6ZWQgb25seSB3aGVuIHRoZXkgYXBwZWFyIGF0IHRoZSBzYW1lIGluZGVudCBsZXZlbCBhcyB0aGUgYHRyeWAuXG4gKi9cbmV4cG9ydCBjb25zdCBUUllfQ0xBVVNFX0tFWVdPUkRTID0gbmV3IFNldChbJ3Jlc2N1ZScsICdhZnRlcndhcmRzJ10pXG4iLCAiaW1wb3J0IHR5cGUge1xuICBMRVNOb2RlLCBFeHByTm9kZSwgU2VxdWVuY2VOb2RlLCBQYXJhbGxlbE5vZGUsXG4gIFNldE5vZGUsIEVtaXROb2RlLCBCcm9hZGNhc3ROb2RlLCBXYWl0Tm9kZSwgQ2FsbE5vZGUsXG4gIEJpbmROb2RlLCBBY3Rpb25Ob2RlLCBNYXRjaE5vZGUsIE1hdGNoQXJtLCBQYXR0ZXJuTm9kZSxcbiAgVHJ5Tm9kZSwgQW5pbWF0aW9uTm9kZSxcbn0gZnJvbSAnLi9hc3QuanMnXG5pbXBvcnQgdHlwZSB7IFRva2VuIH0gZnJvbSAnLi90b2tlbml6ZXIuanMnXG5pbXBvcnQge1xuICBlbmRzV2l0aEFuZCwgc3RyaXBUcmFpbGluZ0FuZCxcbiAgQkxPQ0tfVEVSTUlOQVRPUlMsIFRSWV9DTEFVU0VfS0VZV09SRFMsXG59IGZyb20gJy4vdG9rZW5pemVyLmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEtub3duIGFuaW1hdGlvbiBwcmltaXRpdmUgbmFtZXMgKHJlZ2lzdGVyZWQgYnkgdGhlIGFuaW1hdGlvbiBtb2R1bGUpXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY29uc3QgQU5JTUFUSU9OX1BSSU1JVElWRVMgPSBuZXcgU2V0KFtcbiAgJ2ZhZGUtaW4nLCAnZmFkZS1vdXQnLCAnc2xpZGUtaW4nLCAnc2xpZGUtb3V0JyxcbiAgJ3NsaWRlLXVwJywgJ3NsaWRlLWRvd24nLCAncHVsc2UnLFxuICAnc3RhZ2dlci1lbnRlcicsICdzdGFnZ2VyLWV4aXQnLFxuICAnc2hha2UnLFxuXSlcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBQYXJzZXJcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5leHBvcnQgY2xhc3MgTEVTUGFyc2VyIHtcbiAgcHJpdmF0ZSBwb3MgPSAwXG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSB0b2tlbnM6IFRva2VuW10pIHt9XG5cbiAgcHJpdmF0ZSBwZWVrKG9mZnNldCA9IDApOiBUb2tlbiB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMudG9rZW5zW3RoaXMucG9zICsgb2Zmc2V0XVxuICB9XG5cbiAgcHJpdmF0ZSBhZHZhbmNlKCk6IFRva2VuIHtcbiAgICBjb25zdCB0ID0gdGhpcy50b2tlbnNbdGhpcy5wb3NdXG4gICAgaWYgKCF0KSB0aHJvdyBuZXcgTEVTUGFyc2VFcnJvcignVW5leHBlY3RlZCBlbmQgb2YgaW5wdXQnLCB1bmRlZmluZWQpXG4gICAgdGhpcy5wb3MrK1xuICAgIHJldHVybiB0XG4gIH1cblxuICBwcml2YXRlIGF0RW5kKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnBvcyA+PSB0aGlzLnRva2Vucy5sZW5ndGhcbiAgfVxuXG4gIHByaXZhdGUgdHJ5Q29uc3VtZSh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBjb25zdCB0ID0gdGhpcy5wZWVrKClcbiAgICBpZiAodD8udGV4dCA9PT0gdGV4dCkgeyB0aGlzLnBvcysrOyByZXR1cm4gdHJ1ZSB9XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgRW50cnkgcG9pbnQgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcGFyc2UoKTogTEVTTm9kZSB7XG4gICAgY29uc3Qgbm9kZSA9IHRoaXMucGFyc2VCbG9jaygtMSlcbiAgICByZXR1cm4gbm9kZVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEJsb2NrIHBhcnNlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKipcbiAgICogUGFyc2VzIGFsbCBzdGF0ZW1lbnRzIGF0IGluZGVudCA+IGJhc2VJbmRlbnQuXG4gICAqXG4gICAqIFN0b3BzIHdoZW4gaXQgZW5jb3VudGVyczpcbiAgICogICAtIEEgdG9rZW4gd2l0aCBpbmRlbnQgPD0gYmFzZUluZGVudFxuICAgKiAgIC0gQSBibG9jayB0ZXJtaW5hdG9yICgvbWF0Y2gsIC90cnkpIFx1MjAxNCBsZWZ0IGZvciB0aGUgcGFyZW50IHRvIGNvbnN1bWVcbiAgICogICAtIEEgdHJ5LWNsYXVzZSBrZXl3b3JkIChyZXNjdWUsIGFmdGVyd2FyZHMpIGF0IGluZGVudCA8PSBiYXNlSW5kZW50XG4gICAqICAgLSBFbmQgb2YgdG9rZW4gc3RyZWFtXG4gICAqXG4gICAqIFJldHVybnMgYSBTZXF1ZW5jZU5vZGUgaWYgbXVsdGlwbGUgc3RlcHMsIG90aGVyd2lzZSB0aGUgc2luZ2xlIG5vZGUuXG4gICAqL1xuICBwcml2YXRlIHBhcnNlQmxvY2soYmFzZUluZGVudDogbnVtYmVyKTogTEVTTm9kZSB7XG4gICAgY29uc3Qgc3RlcHM6IExFU05vZGVbXSA9IFtdXG5cbiAgICB3aGlsZSAoIXRoaXMuYXRFbmQoKSkge1xuICAgICAgY29uc3QgdCA9IHRoaXMucGVlaygpIVxuXG4gICAgICAvLyBTdG9wOiB3ZSd2ZSByZXR1cm5lZCB0byBvciBwYXN0IHRoZSBwYXJlbnQgYmxvY2sncyBpbmRlbnRcbiAgICAgIGlmICh0LmluZGVudCA8PSBiYXNlSW5kZW50KSBicmVha1xuXG4gICAgICAvLyBTdG9wOiBibG9jayB0ZXJtaW5hdG9ycyBhcmUgY29uc3VtZWQgYnkgdGhlIGJsb2NrIG9wZW5lciAobWF0Y2gvdHJ5KVxuICAgICAgaWYgKEJMT0NLX1RFUk1JTkFUT1JTLmhhcyh0LnRleHQpKSBicmVha1xuXG4gICAgICAvLyBTdG9wOiB0cnktY2xhdXNlIGtleXdvcmRzIGVuZCB0aGUgY3VycmVudCB0cnkgYm9keVxuICAgICAgaWYgKFRSWV9DTEFVU0VfS0VZV09SRFMuaGFzKHQudGV4dCkgJiYgdC5pbmRlbnQgPD0gYmFzZUluZGVudCArIDIpIGJyZWFrXG5cbiAgICAgIC8vIFx1MjUwMFx1MjUwMCBTZXF1ZW50aWFsIGNvbm5lY3RpdmU6IHN0YW5kYWxvbmUgYHRoZW5gIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgICAgLy8gYHRoZW5gIGFsb25lIG9uIGEgbGluZSBpbnRyb2R1Y2VzIHRoZSBuZXh0IHNlcXVlbnRpYWwgc3RlcCxcbiAgICAgIC8vIHdoaWNoIGlzIGEgYmxvY2sgYXQgYSBkZWVwZXIgaW5kZW50IGxldmVsLlxuICAgICAgaWYgKHQudGV4dCA9PT0gJ3RoZW4nKSB7XG4gICAgICAgIGNvbnN0IHRoZW5JbmRlbnQgPSB0LmluZGVudFxuICAgICAgICB0aGlzLmFkdmFuY2UoKSAvLyBjb25zdW1lIGB0aGVuYFxuICAgICAgICBjb25zdCBuZXh0ID0gdGhpcy5wZWVrKClcbiAgICAgICAgaWYgKG5leHQgJiYgbmV4dC5pbmRlbnQgPiB0aGVuSW5kZW50KSB7XG4gICAgICAgICAgY29uc3Qgc3RlcCA9IHRoaXMucGFyc2VCbG9jayh0aGVuSW5kZW50KVxuICAgICAgICAgIHN0ZXBzLnB1c2goc3RlcClcbiAgICAgICAgfVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyBcdTI1MDBcdTI1MDAgU2VxdWVudGlhbCBjb25uZWN0aXZlOiBgdGhlbiBYYCBhcyBwcmVmaXggXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgICAvLyBgdGhlbiBjYWxsIGZvb2AsIGB0aGVuIGVtaXQgYmFyYCwgZXRjLlxuICAgICAgLy8gVGhlIGB0aGVuYCBpcyBqdXN0IGEgdmlzdWFsIHNlcXVlbmNlciBcdTIwMTQgdGhlIHJlc3Qgb2YgdGhlIGxpbmUgaXMgdGhlIHN0ZXAuXG4gICAgICBpZiAodC50ZXh0LnN0YXJ0c1dpdGgoJ3RoZW4gJykpIHtcbiAgICAgICAgdGhpcy5hZHZhbmNlKClcbiAgICAgICAgY29uc3QgcmVzdCA9IHQudGV4dC5zbGljZSg1KS50cmltKClcbiAgICAgICAgY29uc3Qgc3RlcCA9IHRoaXMucGFyc2VTaW5nbGVMaW5lKHJlc3QsIHQuaW5kZW50LCB0KVxuICAgICAgICBzdGVwcy5wdXNoKHN0ZXApXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIC8vIFx1MjUwMFx1MjUwMCBSZWd1bGFyIHN0YXRlbWVudCAocG9zc2libHkgYSBwYXJhbGxlbCBncm91cCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgICBjb25zdCBzdG10ID0gdGhpcy5wYXJzZVN0YXRlbWVudE9yUGFyYWxsZWwodC5pbmRlbnQpXG4gICAgICBzdGVwcy5wdXNoKHN0bXQpXG4gICAgfVxuXG4gICAgcmV0dXJuIHRvU2VxdWVuY2VPclNpbmdsZShzdGVwcylcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBQYXJhbGxlbCBncm91cCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICAvKipcbiAgICogUGFyc2VzIG9uZSBzdGF0ZW1lbnQgb3IgYSBncm91cCBvZiBwYXJhbGxlbCBzdGF0ZW1lbnRzIGNvbm5lY3RlZCBieSBgYW5kYC5cbiAgICpcbiAgICogTGluZXMgZW5kaW5nIHdpdGggYSBzdGFuZGFsb25lIGBhbmRgIGluZGljYXRlIHRoYXQgdGhlIG5leHQgbGluZSBydW5zXG4gICAqIGNvbmN1cnJlbnRseS4gQWxsIHBhcmFsbGVsIGJyYW5jaGVzIGFyZSB3cmFwcGVkIGluIGEgUGFyYWxsZWxOb2RlLlxuICAgKlxuICAgKiBgYW5kYC1ncm91cHMgb25seSBhcHBseSB3aXRoaW4gdGhlIHNhbWUgaW5kZW50IGxldmVsLiBBIGRlZXBlci1pbmRlbnRlZFxuICAgKiBsaW5lIGFmdGVyIGBhbmRgIGlzIGFuIGVycm9yICh3b3VsZCBpbmRpY2F0ZSBhIGJsb2NrLCBidXQgYGFuZGAgaXNcbiAgICogYSBsaW5lLWxldmVsIGNvbm5lY3Rvciwgbm90IGEgYmxvY2sgb3BlbmVyKS5cbiAgICovXG4gIHByaXZhdGUgcGFyc2VTdGF0ZW1lbnRPclBhcmFsbGVsKGJsb2NrSW5kZW50OiBudW1iZXIpOiBMRVNOb2RlIHtcbiAgICBjb25zdCBicmFuY2hlczogTEVTTm9kZVtdID0gW11cblxuICAgIHdoaWxlICghdGhpcy5hdEVuZCgpKSB7XG4gICAgICBjb25zdCB0ID0gdGhpcy5wZWVrKCkhXG5cbiAgICAgIC8vIFN0b3AgY29uZGl0aW9ucyBcdTIwMTQgc2FtZSBhcyBwYXJzZUJsb2NrJ3NcbiAgICAgIGlmICh0LmluZGVudCA8IGJsb2NrSW5kZW50KSBicmVha1xuICAgICAgaWYgKHQuaW5kZW50ID4gYmxvY2tJbmRlbnQpIGJyZWFrICAgLy8gc2hvdWxkbid0IGhhcHBlbiBoZXJlLCBzYWZldHkgZ3VhcmRcbiAgICAgIGlmIChCTE9DS19URVJNSU5BVE9SUy5oYXModC50ZXh0KSkgYnJlYWtcbiAgICAgIGlmIChUUllfQ0xBVVNFX0tFWVdPUkRTLmhhcyh0LnRleHQpKSBicmVha1xuICAgICAgaWYgKHQudGV4dCA9PT0gJ3RoZW4nIHx8IHQudGV4dC5zdGFydHNXaXRoKCd0aGVuICcpKSBicmVha1xuXG4gICAgICBjb25zdCBoYXNBbmQgPSBlbmRzV2l0aEFuZCh0LnRleHQpXG4gICAgICBjb25zdCBsaW5lVGV4dCA9IGhhc0FuZCA/IHN0cmlwVHJhaWxpbmdBbmQodC50ZXh0KSA6IHQudGV4dFxuXG4gICAgICB0aGlzLmFkdmFuY2UoKVxuXG4gICAgICBjb25zdCBzdG10ID0gdGhpcy5wYXJzZVNpbmdsZUxpbmUobGluZVRleHQsIHQuaW5kZW50LCB0KVxuICAgICAgYnJhbmNoZXMucHVzaChzdG10KVxuXG4gICAgICBpZiAoIWhhc0FuZCkgYnJlYWtcbiAgICB9XG5cbiAgICBpZiAoYnJhbmNoZXMubGVuZ3RoID09PSAwKSByZXR1cm4gZXhwcignJylcbiAgICBpZiAoYnJhbmNoZXMubGVuZ3RoID09PSAxKSByZXR1cm4gYnJhbmNoZXNbMF0hXG4gICAgcmV0dXJuIHsgdHlwZTogJ3BhcmFsbGVsJywgYnJhbmNoZXMgfSBzYXRpc2ZpZXMgUGFyYWxsZWxOb2RlXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgU2luZ2xlLWxpbmUgZGlzcGF0Y2ggXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgLyoqXG4gICAqIFBhcnNlcyBhIHNpbmdsZSBzdGF0ZW1lbnQgZnJvbSBpdHMgdGV4dCBjb250ZW50LlxuICAgKiBUaGUgdGV4dCBoYXMgYWxyZWFkeSBoYWQgYHRoZW4gYCBwcmVmaXggYW5kIHRyYWlsaW5nIGAgYW5kYCBzdHJpcHBlZC5cbiAgICpcbiAgICogRGlzcGF0Y2ggb3JkZXIgbWF0dGVyczogbW9yZSBzcGVjaWZpYyBwYXR0ZXJucyBtdXN0IGNvbWUgYmVmb3JlIGdlbmVyYWwgb25lcy5cbiAgICovXG4gIHByaXZhdGUgcGFyc2VTaW5nbGVMaW5lKHRleHQ6IHN0cmluZywgaW5kZW50OiBudW1iZXIsIHRva2VuOiBUb2tlbik6IExFU05vZGUge1xuICAgIGNvbnN0IGZpcnN0ID0gZmlyc3RXb3JkKHRleHQpXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgQmxvY2sgY29uc3RydWN0cyAoY29uc3VtZSBtdWx0aXBsZSBmb2xsb3dpbmcgdG9rZW5zKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAoZmlyc3QgPT09ICdtYXRjaCcpIHJldHVybiB0aGlzLnBhcnNlTWF0Y2godGV4dCwgaW5kZW50LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICd0cnknKSAgIHJldHVybiB0aGlzLnBhcnNlVHJ5KGluZGVudCwgdG9rZW4pXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgU2ltcGxlIHN0YXRlbWVudCBkaXNwYXRjaCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAoZmlyc3QgPT09ICdzZXQnKSAgICAgICByZXR1cm4gdGhpcy5wYXJzZVNldCh0ZXh0LCB0b2tlbilcbiAgICBpZiAoZmlyc3QgPT09ICdlbWl0JykgICAgICByZXR1cm4gdGhpcy5wYXJzZUVtaXQodGV4dCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAnYnJvYWRjYXN0JykgcmV0dXJuIHRoaXMucGFyc2VCcm9hZGNhc3QodGV4dCwgdG9rZW4pXG4gICAgaWYgKGZpcnN0ID09PSAnY2FsbCcpICAgICAgcmV0dXJuIHRoaXMucGFyc2VDYWxsKHRleHQsIHRva2VuKVxuICAgIGlmIChmaXJzdCA9PT0gJ3dhaXQnKSAgICAgIHJldHVybiB0aGlzLnBhcnNlV2FpdCh0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBCYXJlIERhdGFzdGFyIGFjdGlvbjogYEBnZXQgJy91cmwnIFthcmdzXWAgKGZpcmUtYW5kLWF3YWl0LCBubyBiaW5kKSBcdTI1MDBcdTI1MDBcbiAgICBpZiAoZmlyc3Quc3RhcnRzV2l0aCgnQCcpKSAgcmV0dXJuIHRoaXMucGFyc2VBY3Rpb24odGV4dCwgdG9rZW4pXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgQXN5bmMgYmluZDogYG5hbWUgPC0gQHZlcmIgJ3VybCcgW2FyZ3NdYCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBpZiAodGV4dC5pbmNsdWRlcygnIDwtICcpKSByZXR1cm4gdGhpcy5wYXJzZUJpbmQodGV4dCwgdG9rZW4pXG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgQW5pbWF0aW9uIHByaW1pdGl2ZSAoYnVpbHQtaW4pIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIGlmIChBTklNQVRJT05fUFJJTUlUSVZFUy5oYXMoZmlyc3QpKSByZXR1cm4gdGhpcy5wYXJzZUFuaW1hdGlvbih0ZXh0LCB0b2tlbilcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBBbmltYXRpb24gcHJpbWl0aXZlICh1c2VybGFuZCBtb2R1bGUpIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIC8vIEFueSB3b3JkIGZvbGxvd2VkIGJ5IGEgQ1NTIHNlbGVjdG9yIGxvb2tzIGxpa2UgYW4gYW5pbWF0aW9uIGNhbGwuXG4gICAgLy8gQ292ZXJzIGJvdGggaHlwaGVuYXRlZCBuYW1lcyAoc2Nyb2xsLXJldmVhbCwgc3ByaW5nLWluKSBhbmQgYmFyZSBuYW1lcyAoc2hha2UpLlxuICAgIGlmIChsb29rc0xpa2VBbmltYXRpb25DYWxsKHRleHQpKSB7XG4gICAgICByZXR1cm4gdGhpcy5wYXJzZUFuaW1hdGlvbih0ZXh0LCB0b2tlbilcbiAgICB9XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgVW5rbm93bjogc3RvcmUgYXMgcmF3IGV4cHJlc3Npb24gKGVzY2FwZSBoYXRjaCAvIGZ1dHVyZSBrZXl3b3JkcykgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gVW5rbm93biBzdGF0ZW1lbnQ6ICR7SlNPTi5zdHJpbmdpZnkodGV4dCl9YCwgdG9rZW4pXG4gICAgcmV0dXJuIGV4cHIodGV4dClcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBNYXRjaCBibG9jayBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwcml2YXRlIHBhcnNlTWF0Y2godGV4dDogc3RyaW5nLCBpbmRlbnQ6IG51bWJlciwgdG9rZW46IFRva2VuKTogTWF0Y2hOb2RlIHtcbiAgICAvLyBgdGV4dGAgaXMgZS5nLiBcIm1hdGNoIHJlc3BvbnNlXCIgb3IgXCJtYXRjaCAkZmVlZFN0YXRlXCJcbiAgICBjb25zdCBzdWJqZWN0UmF3ID0gdGV4dC5zbGljZSgnbWF0Y2gnLmxlbmd0aCkudHJpbSgpXG4gICAgY29uc3Qgc3ViamVjdDogRXhwck5vZGUgPSBleHByKHN1YmplY3RSYXcpXG4gICAgY29uc3QgYXJtczogTWF0Y2hBcm1bXSA9IFtdXG5cbiAgICB3aGlsZSAoIXRoaXMuYXRFbmQoKSkge1xuICAgICAgY29uc3QgdCA9IHRoaXMucGVlaygpIVxuXG4gICAgICAvLyAvbWF0Y2ggdGVybWluYXRlcyB0aGUgYmxvY2tcbiAgICAgIGlmICh0LnRleHQgPT09ICcvbWF0Y2gnKSB7XG4gICAgICAgIHRoaXMuYWR2YW5jZSgpXG4gICAgICAgIGJyZWFrXG4gICAgICB9XG5cbiAgICAgIC8vIE9ubHkgY29uc3VtZSBhcm0gbGluZXMgYXQgdGhlIGV4cGVjdGVkIGFybSBpbmRlbnQgKGluZGVudCArIDIpXG4gICAgICBpZiAodC5pbmRlbnQgPD0gaW5kZW50KSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIFVuY2xvc2VkIG1hdGNoIGJsb2NrIFx1MjAxNCBtaXNzaW5nIC9tYXRjaGAsIHRva2VuKVxuICAgICAgICBicmVha1xuICAgICAgfVxuXG4gICAgICAvLyBQYXJzZSBhbiBhcm06IGBbcGF0dGVybl0gLT5gIG9yIGBbcGF0dGVybl0gLT4gYm9keWBcbiAgICAgIGlmICh0LnRleHQuc3RhcnRzV2l0aCgnWycpKSB7XG4gICAgICAgIGFybXMucHVzaCh0aGlzLnBhcnNlTWF0Y2hBcm0odC5pbmRlbnQsIHQpKVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICAvLyBTa2lwIHVuZXhwZWN0ZWQgbGluZXMgaW5zaWRlIG1hdGNoXG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBVbmV4cGVjdGVkIHRva2VuIGluc2lkZSBtYXRjaCBibG9jazogJHtKU09OLnN0cmluZ2lmeSh0LnRleHQpfWAsIHQpXG4gICAgICB0aGlzLmFkdmFuY2UoKVxuICAgIH1cblxuICAgIHJldHVybiB7IHR5cGU6ICdtYXRjaCcsIHN1YmplY3QsIGFybXMgfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZU1hdGNoQXJtKGFybUluZGVudDogbnVtYmVyLCB0b2tlbjogVG9rZW4pOiBNYXRjaEFybSB7XG4gICAgY29uc3QgdCA9IHRoaXMuYWR2YW5jZSgpIC8vIGNvbnN1bWUgdGhlIGFybSBsaW5lXG5cbiAgICAvLyBTcGxpdCBvbiBgIC0+YCB0byBzZXBhcmF0ZSBwYXR0ZXJuIGZyb20gYm9keVxuICAgIGNvbnN0IGFycm93SWR4ID0gdC50ZXh0LmluZGV4T2YoJyAtPicpXG4gICAgaWYgKGFycm93SWR4ID09PSAtMSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gTWF0Y2ggYXJtIG1pc3NpbmcgJy0+JzogJHtKU09OLnN0cmluZ2lmeSh0LnRleHQpfWAsIHQpXG4gICAgICByZXR1cm4geyBwYXR0ZXJuczogW3sga2luZDogJ3dpbGRjYXJkJyB9XSwgYm9keTogZXhwcignJykgfVxuICAgIH1cblxuICAgIGNvbnN0IHBhdHRlcm5SYXcgPSB0LnRleHQuc2xpY2UoMCwgYXJyb3dJZHgpLnRyaW0oKVxuICAgIGNvbnN0IGFmdGVyQXJyb3cgPSB0LnRleHQuc2xpY2UoYXJyb3dJZHggKyAzKS50cmltKCkgIC8vIGV2ZXJ5dGhpbmcgYWZ0ZXIgYC0+YFxuXG4gICAgY29uc3QgcGF0dGVybnMgPSBwYXJzZVBhdHRlcm5zKHBhdHRlcm5SYXcpXG5cbiAgICBsZXQgYm9keTogTEVTTm9kZVxuICAgIGlmIChhZnRlckFycm93Lmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIElubGluZSBhcm06IGBbJ2Vycm9yJ10gLT4gc2V0ICRmZWVkU3RhdGUgdG8gJ2Vycm9yJ2BcbiAgICAgIGJvZHkgPSB0aGlzLnBhcnNlU2luZ2xlTGluZShhZnRlckFycm93LCBhcm1JbmRlbnQsIHRva2VuKVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBNdWx0aS1saW5lIGFybTogYm9keSBpcyB0aGUgZGVlcGVyLWluZGVudGVkIGJsb2NrXG4gICAgICBib2R5ID0gdGhpcy5wYXJzZUJsb2NrKGFybUluZGVudClcbiAgICB9XG5cbiAgICByZXR1cm4geyBwYXR0ZXJucywgYm9keSB9XG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgVHJ5IGJsb2NrIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgcGFyc2VUcnkoaW5kZW50OiBudW1iZXIsIHRva2VuOiBUb2tlbik6IFRyeU5vZGUge1xuICAgIC8vIE5vdGU6IHRoZSBgdHJ5YCB0b2tlbiB3YXMgYWxyZWFkeSBjb25zdW1lZCBieSB0aGUgY2FsbGluZyBwYXJzZVN0YXRlbWVudE9yUGFyYWxsZWwuXG4gICAgLy8gRG8gTk9UIGNhbGwgdGhpcy5hZHZhbmNlKCkgaGVyZSBcdTIwMTQgdGhhdCB3b3VsZCBza2lwIHRoZSBmaXJzdCBib2R5IGxpbmUuXG5cbiAgICAvLyBQYXJzZSBib2R5IFx1MjAxNCBzdG9wcyBhdCByZXNjdWUvYWZ0ZXJ3YXJkcy8vdHJ5IGF0IHRoZSBzYW1lIGluZGVudCBsZXZlbFxuICAgIGNvbnN0IGJvZHkgPSB0aGlzLnBhcnNlQmxvY2soaW5kZW50KVxuXG4gICAgbGV0IHJlc2N1ZTogTEVTTm9kZSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZFxuICAgIGxldCBhZnRlcndhcmRzOiBMRVNOb2RlIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG5cbiAgICAvLyByZXNjdWUgY2xhdXNlIChvcHRpb25hbClcbiAgICBpZiAodGhpcy5wZWVrKCk/LnRleHQgPT09ICdyZXNjdWUnICYmIHRoaXMucGVlaygpPy5pbmRlbnQgPT09IGluZGVudCkge1xuICAgICAgdGhpcy5hZHZhbmNlKCkgLy8gY29uc3VtZSBgcmVzY3VlYFxuICAgICAgcmVzY3VlID0gdGhpcy5wYXJzZUJsb2NrKGluZGVudClcbiAgICB9XG5cbiAgICAvLyBhZnRlcndhcmRzIGNsYXVzZSAob3B0aW9uYWwpXG4gICAgaWYgKHRoaXMucGVlaygpPy50ZXh0ID09PSAnYWZ0ZXJ3YXJkcycgJiYgdGhpcy5wZWVrKCk/LmluZGVudCA9PT0gaW5kZW50KSB7XG4gICAgICB0aGlzLmFkdmFuY2UoKSAvLyBjb25zdW1lIGBhZnRlcndhcmRzYFxuICAgICAgYWZ0ZXJ3YXJkcyA9IHRoaXMucGFyc2VCbG9jayhpbmRlbnQpXG4gICAgfVxuXG4gICAgLy8gQ29uc3VtZSAvdHJ5XG4gICAgaWYgKHRoaXMucGVlaygpPy50ZXh0ID09PSAnL3RyeScpIHtcbiAgICAgIHRoaXMuYWR2YW5jZSgpXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIFVuY2xvc2VkIHRyeSBibG9jayBcdTIwMTQgbWlzc2luZyAvdHJ5YCwgdG9rZW4pXG4gICAgfVxuXG4gICAgY29uc3QgdHJ5Tm9kZTogVHJ5Tm9kZSA9IHsgdHlwZTogJ3RyeScsIGJvZHkgfVxuICAgIGlmIChyZXNjdWUgICAgIT09IHVuZGVmaW5lZCkgdHJ5Tm9kZS5yZXNjdWUgICAgID0gcmVzY3VlXG4gICAgaWYgKGFmdGVyd2FyZHMgIT09IHVuZGVmaW5lZCkgdHJ5Tm9kZS5hZnRlcndhcmRzID0gYWZ0ZXJ3YXJkc1xuICAgIHJldHVybiB0cnlOb2RlXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgU2ltcGxlIHN0YXRlbWVudCBwYXJzZXJzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgcGFyc2VTZXQodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBTZXROb2RlIHtcbiAgICAvLyBgc2V0ICRzaWduYWwgdG8gZXhwcmBcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXnNldFxccytcXCQoXFx3KylcXHMrdG9cXHMrKC4rKSQvKVxuICAgIGlmICghbSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gTWFsZm9ybWVkIHNldCBzdGF0ZW1lbnQ6ICR7SlNPTi5zdHJpbmdpZnkodGV4dCl9YCwgdG9rZW4pXG4gICAgICByZXR1cm4geyB0eXBlOiAnc2V0Jywgc2lnbmFsOiAnPz8nLCB2YWx1ZTogZXhwcih0ZXh0KSB9XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnc2V0JyxcbiAgICAgIHNpZ25hbDogbVsxXSEsXG4gICAgICB2YWx1ZTogZXhwcihtWzJdIS50cmltKCkpLFxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcGFyc2VFbWl0KHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogRW1pdE5vZGUge1xuICAgIC8vIGBlbWl0IGV2ZW50Om5hbWUgW3BheWxvYWQsIC4uLl1gIG9yIGBlbWl0IGV2ZW50Om5hbWVgXG4gICAgY29uc3QgeyBuYW1lLCBwYXlsb2FkIH0gPSBwYXJzZUV2ZW50TGluZSh0ZXh0LnNsaWNlKCdlbWl0Jy5sZW5ndGgpLnRyaW0oKSwgdG9rZW4pXG4gICAgcmV0dXJuIHsgdHlwZTogJ2VtaXQnLCBldmVudDogbmFtZSwgcGF5bG9hZCB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQnJvYWRjYXN0KHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogQnJvYWRjYXN0Tm9kZSB7XG4gICAgY29uc3QgeyBuYW1lLCBwYXlsb2FkIH0gPSBwYXJzZUV2ZW50TGluZSh0ZXh0LnNsaWNlKCdicm9hZGNhc3QnLmxlbmd0aCkudHJpbSgpLCB0b2tlbilcbiAgICByZXR1cm4geyB0eXBlOiAnYnJvYWRjYXN0JywgZXZlbnQ6IG5hbWUsIHBheWxvYWQgfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUNhbGwodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBDYWxsTm9kZSB7XG4gICAgLy8gYGNhbGwgY29tbWFuZDpuYW1lIFthcmc6IHZhbHVlLCAuLi5dYCBvciBgY2FsbCBjb21tYW5kOm5hbWVgXG4gICAgY29uc3QgbSA9IHRleHQubWF0Y2goL15jYWxsXFxzKyhbXlxcc1xcW10rKVxccyooPzpcXFsoLispXFxdKT8kLylcbiAgICBpZiAoIW0pIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIE1hbGZvcm1lZCBjYWxsIHN0YXRlbWVudDogJHtKU09OLnN0cmluZ2lmeSh0ZXh0KX1gLCB0b2tlbilcbiAgICAgIHJldHVybiB7IHR5cGU6ICdjYWxsJywgY29tbWFuZDogJz8/JywgYXJnczoge30gfVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogJ2NhbGwnLFxuICAgICAgY29tbWFuZDogbVsxXSEsXG4gICAgICBhcmdzOiBwYXJzZUFyZ0xpc3QobVsyXSA/PyAnJyksXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZVdhaXQodGV4dDogc3RyaW5nLCB0b2tlbjogVG9rZW4pOiBXYWl0Tm9kZSB7XG4gICAgLy8gYHdhaXQgMzAwbXNgIG9yIGB3YWl0IChhdHRlbXB0ICsgMSkgKiA1MDBtc2BcbiAgICBjb25zdCBtID0gdGV4dC5tYXRjaCgvXndhaXRcXHMrKC4rPyltcyQvKVxuICAgIGlmICghbSkge1xuICAgICAgY29uc29sZS53YXJuKGBbTEVTOnBhcnNlcl0gTWFsZm9ybWVkIHdhaXQgc3RhdGVtZW50OiAke0pTT04uc3RyaW5naWZ5KHRleHQpfWAsIHRva2VuKVxuICAgICAgcmV0dXJuIHsgdHlwZTogJ3dhaXQnLCBtczogMCB9XG4gICAgfVxuICAgIGNvbnN0IG1zRXhwciA9IG1bMV0hLnRyaW0oKVxuICAgIC8vIFNpbXBsZSBsaXRlcmFsXG4gICAgY29uc3QgbGl0ZXJhbCA9IE51bWJlcihtc0V4cHIpXG4gICAgaWYgKCFOdW1iZXIuaXNOYU4obGl0ZXJhbCkpIHJldHVybiB7IHR5cGU6ICd3YWl0JywgbXM6IGxpdGVyYWwgfVxuICAgIC8vIEV4cHJlc3Npb24gXHUyMDE0IHN0b3JlIGFzIDAgd2l0aCB0aGUgZXhwcmVzc2lvbiBhcyBhIGNvbW1lbnQgKGV4ZWN1dG9yIHdpbGwgZXZhbClcbiAgICAvLyBQaGFzZSAzIHdpbGwgaGFuZGxlIGR5bmFtaWMgZHVyYXRpb25zIHByb3Blcmx5XG4gICAgcmV0dXJuIHsgdHlwZTogJ3dhaXQnLCBtczogMCB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQmluZCh0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IEJpbmROb2RlIHtcbiAgICAvLyBgbmFtZSA8LSBAdmVyYiAndXJsJyBbYXJnc11gXG4gICAgY29uc3QgbSA9IHRleHQubWF0Y2goL14oXFx3KylcXHMrPC1cXHMrQChcXHcrKVxccysnKFteJ10rKSdcXHMqKD86XFxbKC4rKVxcXSk/JC8pXG4gICAgaWYgKCFtKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFtMRVM6cGFyc2VyXSBNYWxmb3JtZWQgYmluZCBzdGF0ZW1lbnQ6ICR7SlNPTi5zdHJpbmdpZnkodGV4dCl9YCwgdG9rZW4pXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiAnYmluZCcsXG4gICAgICAgIG5hbWU6ICc/PycsXG4gICAgICAgIGFjdGlvbjogeyB0eXBlOiAnYWN0aW9uJywgdmVyYjogJ2dldCcsIHVybDogJycsIGFyZ3M6IHt9IH0sXG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IGFjdGlvbjogQWN0aW9uTm9kZSA9IHtcbiAgICAgIHR5cGU6ICdhY3Rpb24nLFxuICAgICAgdmVyYjogbVsyXSEudG9Mb3dlckNhc2UoKSxcbiAgICAgIHVybDogbVszXSEsXG4gICAgICBhcmdzOiBwYXJzZUFyZ0xpc3QobVs0XSA/PyAnJyksXG4gICAgfVxuICAgIHJldHVybiB7IHR5cGU6ICdiaW5kJywgbmFtZTogbVsxXSEsIGFjdGlvbiB9XG4gIH1cblxuICBwcml2YXRlIHBhcnNlQWN0aW9uKHRleHQ6IHN0cmluZywgdG9rZW46IFRva2VuKTogQWN0aW9uTm9kZSB7XG4gICAgLy8gYEBnZXQgJy91cmwnIFthcmdzXWAgb3IgYEBwb3N0ICcvdXJsJyBbYXJnc11gXG4gICAgY29uc3QgbSA9IHRleHQubWF0Y2goL15AKFxcdyspXFxzKycoW14nXSspJ1xccyooPzpcXFsoLispXFxdKT8kLylcbiAgICBpZiAoIW0pIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0xFUzpwYXJzZXJdIE1hbGZvcm1lZCBhY3Rpb246ICR7SlNPTi5zdHJpbmdpZnkodGV4dCl9YCwgdG9rZW4pXG4gICAgICByZXR1cm4geyB0eXBlOiAnYWN0aW9uJywgdmVyYjogJ2dldCcsIHVybDogJycsIGFyZ3M6IHt9IH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdhY3Rpb24nLFxuICAgICAgdmVyYjogbVsxXSEudG9Mb3dlckNhc2UoKSxcbiAgICAgIHVybDogbVsyXSEsXG4gICAgICBhcmdzOiBwYXJzZUFyZ0xpc3QobVszXSA/PyAnJyksXG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwYXJzZUFuaW1hdGlvbih0ZXh0OiBzdHJpbmcsIHRva2VuOiBUb2tlbik6IEFuaW1hdGlvbk5vZGUge1xuICAgIC8vIGBwcmltaXRpdmUgc2VsZWN0b3IgZHVyYXRpb24gZWFzaW5nIFtvcHRpb25zXWBcbiAgICAvLyBFeGFtcGxlczpcbiAgICAvLyAgIHN0YWdnZXItZW50ZXIgLmZlZWQtaXRlbSAgMTIwbXMgZWFzZS1vdXQgW2dhcDogNDBtcyAgZnJvbTogcmlnaHRdXG4gICAgLy8gICBwdWxzZSAuZmVlZC1pdGVtLmlzLXVwZGF0ZWQgIDMwMG1zIGVhc2UtaW4tb3V0XG4gICAgLy8gICBzbGlkZS1vdXQgW2RhdGEtaXRlbS1pZDogaWRdICAxNTBtcyBlYXNlLWluIFt0bzogcmlnaHRdXG5cbiAgICAvLyBUb2tlbml6ZTogc3BsaXQgb24gd2hpdGVzcGFjZSBidXQgcHJlc2VydmUgWy4uLl0gZ3JvdXBzXG4gICAgY29uc3QgcGFydHMgPSBzcGxpdEFuaW1hdGlvbkxpbmUodGV4dClcblxuICAgIGNvbnN0IHByaW1pdGl2ZSA9IHBhcnRzWzBdID8/ICcnXG4gICAgY29uc3Qgc2VsZWN0b3IgID0gcGFydHNbMV0gPz8gJydcbiAgICBjb25zdCBkdXJhdGlvblN0ciA9IHBhcnRzWzJdID8/ICcwbXMnXG4gICAgY29uc3QgZWFzaW5nICAgID0gcGFydHNbM10gPz8gJ2Vhc2UnXG4gICAgY29uc3Qgb3B0aW9uc1N0ciA9IHBhcnRzWzRdID8/ICcnICAvLyBtYXkgYmUgYWJzZW50XG5cbiAgICBjb25zdCBkdXJhdGlvbk1zID0gcGFyc2VJbnQoZHVyYXRpb25TdHIsIDEwKVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdhbmltYXRpb24nLFxuICAgICAgcHJpbWl0aXZlLFxuICAgICAgc2VsZWN0b3IsXG4gICAgICBkdXJhdGlvbjogTnVtYmVyLmlzTmFOKGR1cmF0aW9uTXMpID8gMCA6IGR1cmF0aW9uTXMsXG4gICAgICBlYXNpbmcsXG4gICAgICBvcHRpb25zOiBwYXJzZUFuaW1hdGlvbk9wdGlvbnMob3B0aW9uc1N0ciksXG4gICAgfVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gUGF0dGVybiBwYXJzaW5nXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBQYXJzZXMgYSBwYXR0ZXJuIGdyb3VwIGxpa2UgYFtpdCAgIG9rICAgXWAsIGBbbmlsICBlcnJvcl1gLCBgW19dYCxcbiAqIGBbJ2Vycm9yJ11gLCBgWzAgfCAxIHwgMl1gLlxuICpcbiAqIFJldHVybnMgYW4gYXJyYXkgb2YgUGF0dGVybk5vZGUgXHUyMDE0IG9uZSBwZXIgZWxlbWVudCBpbiB0aGUgdHVwbGUgcGF0dGVybi5cbiAqIEZvciBvci1wYXR0ZXJucyAoYDAgfCAxIHwgMmApLCByZXR1cm5zIGEgc2luZ2xlIE9yUGF0dGVybk5vZGUuXG4gKi9cbmZ1bmN0aW9uIHBhcnNlUGF0dGVybnMocmF3OiBzdHJpbmcpOiBQYXR0ZXJuTm9kZVtdIHtcbiAgLy8gU3RyaXAgb3V0ZXIgYnJhY2tldHNcbiAgY29uc3QgaW5uZXIgPSByYXcucmVwbGFjZSgvXlxcW3xcXF0kL2csICcnKS50cmltKClcblxuICAvLyBDaGVjayBmb3Igb3ItcGF0dGVybjogY29udGFpbnMgYCB8IGBcbiAgaWYgKGlubmVyLmluY2x1ZGVzKCcgfCAnKSB8fCBpbm5lci5pbmNsdWRlcygnfCcpKSB7XG4gICAgY29uc3QgYWx0ZXJuYXRpdmVzID0gaW5uZXIuc3BsaXQoL1xccypcXHxcXHMqLykubWFwKHAgPT4gcGFyc2VTaW5nbGVQYXR0ZXJuKHAudHJpbSgpKSlcbiAgICByZXR1cm4gW3sga2luZDogJ29yJywgcGF0dGVybnM6IGFsdGVybmF0aXZlcyB9XVxuICB9XG5cbiAgLy8gVHVwbGUgcGF0dGVybjogc3BhY2Utc2VwYXJhdGVkIGVsZW1lbnRzXG4gIC8vIFVzZSBhIGN1c3RvbSBzcGxpdCB0byBoYW5kbGUgbXVsdGlwbGUgc3BhY2VzIChhbGlnbm1lbnQgcGFkZGluZylcbiAgcmV0dXJuIGlubmVyLnRyaW0oKS5zcGxpdCgvXFxzezIsfXxcXHMoPz1cXFMpLykuZmlsdGVyKHMgPT4gcy50cmltKCkpXG4gICAgLm1hcChwID0+IHBhcnNlU2luZ2xlUGF0dGVybihwLnRyaW0oKSkpXG59XG5cbmZ1bmN0aW9uIHBhcnNlU2luZ2xlUGF0dGVybihzOiBzdHJpbmcpOiBQYXR0ZXJuTm9kZSB7XG4gIGlmIChzID09PSAnXycpICAgcmV0dXJuIHsga2luZDogJ3dpbGRjYXJkJyB9XG4gIGlmIChzID09PSAnbmlsJykgcmV0dXJuIHsga2luZDogJ2xpdGVyYWwnLCB2YWx1ZTogbnVsbCB9XG5cbiAgLy8gU3RyaW5nIGxpdGVyYWw6ICd2YWx1ZSdcbiAgaWYgKHMuc3RhcnRzV2l0aChcIidcIikgJiYgcy5lbmRzV2l0aChcIidcIikpIHtcbiAgICByZXR1cm4geyBraW5kOiAnbGl0ZXJhbCcsIHZhbHVlOiBzLnNsaWNlKDEsIC0xKSB9XG4gIH1cblxuICAvLyBOdW1iZXIgbGl0ZXJhbFxuICBjb25zdCBuID0gTnVtYmVyKHMpXG4gIGlmICghTnVtYmVyLmlzTmFOKG4pKSByZXR1cm4geyBraW5kOiAnbGl0ZXJhbCcsIHZhbHVlOiBuIH1cblxuICAvLyBCb29sZWFuXG4gIGlmIChzID09PSAndHJ1ZScpICByZXR1cm4geyBraW5kOiAnbGl0ZXJhbCcsIHZhbHVlOiB0cnVlIH1cbiAgaWYgKHMgPT09ICdmYWxzZScpIHJldHVybiB7IGtpbmQ6ICdsaXRlcmFsJywgdmFsdWU6IGZhbHNlIH1cblxuICAvLyBFdmVyeXRoaW5nIGVsc2UgaXMgYSBiaW5kaW5nIChjYXB0dXJlcyB0aGUgdmFsdWUgZm9yIHVzZSBpbiB0aGUgYm9keSlcbiAgcmV0dXJuIHsga2luZDogJ2JpbmRpbmcnLCBuYW1lOiBzIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBBcmd1bWVudCBsaXN0IHBhcnNpbmdcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIFBhcnNlcyBga2V5OiB2YWx1ZSAga2V5MjogdmFsdWUyYCBmcm9tIGluc2lkZSBhIFsuLi5dIGFyZ3VtZW50IGJsb2NrLlxuICogVmFsdWVzIGFyZSBzdG9yZWQgYXMgRXhwck5vZGUgKGV2YWx1YXRlZCBhdCBydW50aW1lKS5cbiAqL1xuZnVuY3Rpb24gcGFyc2VBcmdMaXN0KHJhdzogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgRXhwck5vZGU+IHtcbiAgaWYgKCFyYXcudHJpbSgpKSByZXR1cm4ge31cblxuICBjb25zdCByZXN1bHQ6IFJlY29yZDxzdHJpbmcsIEV4cHJOb2RlPiA9IHt9XG5cbiAgLy8gU3BsaXQgb24gYCAgYCAoZG91YmxlLXNwYWNlIHVzZWQgYXMgc2VwYXJhdG9yIGluIExFUyBzdHlsZSlcbiAgLy8gYnV0IGFsc28gaGFuZGxlIHNpbmdsZSBgICBrZXk6IHZhbHVlYCBlbnRyaWVzXG4gIC8vIFNpbXBsZSByZWdleDogYHdvcmQ6IHJlc3RfdW50aWxfbmV4dF93b3JkOmBcbiAgY29uc3QgcGFpcnMgPSByYXcudHJpbSgpLnNwbGl0KC8oPzw9XFxTKVxcc3syLH0oPz1cXHcpLylcbiAgZm9yIChjb25zdCBwYWlyIG9mIHBhaXJzKSB7XG4gICAgY29uc3QgY29sb25JZHggPSBwYWlyLmluZGV4T2YoJzonKVxuICAgIGlmIChjb2xvbklkeCA9PT0gLTEpIGNvbnRpbnVlXG4gICAgY29uc3Qga2V5ICAgPSBwYWlyLnNsaWNlKDAsIGNvbG9uSWR4KS50cmltKClcbiAgICBjb25zdCB2YWx1ZSA9IHBhaXIuc2xpY2UoY29sb25JZHggKyAxKS50cmltKClcbiAgICBpZiAoa2V5KSByZXN1bHRba2V5XSA9IGV4cHIodmFsdWUpXG4gIH1cblxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gRXZlbnQgbGluZSBwYXJzaW5nOiBgZXZlbnQ6bmFtZSBbcGF5bG9hZC4uLl1gXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gcGFyc2VFdmVudExpbmUoXG4gIHJhdzogc3RyaW5nLFxuICB0b2tlbjogVG9rZW5cbik6IHsgbmFtZTogc3RyaW5nOyBwYXlsb2FkOiBFeHByTm9kZVtdIH0ge1xuICAvLyBgZmVlZDpkYXRhLXJlYWR5YCBvciBgZmVlZDpkYXRhLXJlYWR5IFskZmVlZEl0ZW1zXWAgb3IgYGZlZWQ6ZXJyb3IgWyRlcnJvcl1gXG4gIGNvbnN0IGJyYWNrZXRJZHggPSByYXcuaW5kZXhPZignWycpXG4gIGlmIChicmFja2V0SWR4ID09PSAtMSkge1xuICAgIHJldHVybiB7IG5hbWU6IHJhdy50cmltKCksIHBheWxvYWQ6IFtdIH1cbiAgfVxuICBjb25zdCBuYW1lID0gcmF3LnNsaWNlKDAsIGJyYWNrZXRJZHgpLnRyaW0oKVxuICBjb25zdCBwYXlsb2FkUmF3ID0gcmF3LnNsaWNlKGJyYWNrZXRJZHggKyAxLCByYXcubGFzdEluZGV4T2YoJ10nKSkudHJpbSgpXG5cbiAgLy8gUGF5bG9hZCBlbGVtZW50cyBhcmUgY29tbWEgb3Igc3BhY2Ugc2VwYXJhdGVkIGV4cHJlc3Npb25zXG4gIGNvbnN0IHBheWxvYWQ6IEV4cHJOb2RlW10gPSBwYXlsb2FkUmF3XG4gICAgPyBwYXlsb2FkUmF3LnNwbGl0KC8sXFxzKnxcXHN7Mix9LykubWFwKHMgPT4gZXhwcihzLnRyaW0oKSkpLmZpbHRlcihlID0+IGUucmF3KVxuICAgIDogW11cblxuICByZXR1cm4geyBuYW1lLCBwYXlsb2FkIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBBbmltYXRpb24gbGluZSBwYXJzaW5nXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBTcGxpdHMgYW4gYW5pbWF0aW9uIGxpbmUgaW50byBpdHMgc3RydWN0dXJhbCBwYXJ0cywgcHJlc2VydmluZyBbLi4uXSBncm91cHMuXG4gKlxuICogSW5wdXQ6ICBgc3RhZ2dlci1lbnRlciAuZmVlZC1pdGVtICAxMjBtcyBlYXNlLW91dCBbZ2FwOiA0MG1zICBmcm9tOiByaWdodF1gXG4gKiBPdXRwdXQ6IFsnc3RhZ2dlci1lbnRlcicsICcuZmVlZC1pdGVtJywgJzEyMG1zJywgJ2Vhc2Utb3V0JywgJ1tnYXA6IDQwbXMgIGZyb206IHJpZ2h0XSddXG4gKi9cbmZ1bmN0aW9uIHNwbGl0QW5pbWF0aW9uTGluZSh0ZXh0OiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHBhcnRzOiBzdHJpbmdbXSA9IFtdXG4gIGxldCBjdXJyZW50ID0gJydcbiAgbGV0IGluQnJhY2tldCA9IDBcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHRleHQubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjaCA9IHRleHRbaV0hXG4gICAgaWYgKGNoID09PSAnWycpIHtcbiAgICAgIGluQnJhY2tldCsrXG4gICAgICBjdXJyZW50ICs9IGNoXG4gICAgfSBlbHNlIGlmIChjaCA9PT0gJ10nKSB7XG4gICAgICBpbkJyYWNrZXQtLVxuICAgICAgY3VycmVudCArPSBjaFxuICAgIH0gZWxzZSBpZiAoY2ggPT09ICcgJyAmJiBpbkJyYWNrZXQgPT09IDApIHtcbiAgICAgIGlmIChjdXJyZW50LnRyaW0oKSkgcGFydHMucHVzaChjdXJyZW50LnRyaW0oKSlcbiAgICAgIGN1cnJlbnQgPSAnJ1xuICAgIH0gZWxzZSB7XG4gICAgICBjdXJyZW50ICs9IGNoXG4gICAgfVxuICB9XG4gIGlmIChjdXJyZW50LnRyaW0oKSkgcGFydHMucHVzaChjdXJyZW50LnRyaW0oKSlcbiAgcmV0dXJuIHBhcnRzXG59XG5cbi8qKlxuICogUGFyc2VzIGFuaW1hdGlvbiBvcHRpb25zIGZyb20gYSBgW2tleTogdmFsdWUgIGtleTI6IHZhbHVlMl1gIHN0cmluZy5cbiAqIFRoZSBvdXRlciBicmFja2V0cyBhcmUgaW5jbHVkZWQgaW4gdGhlIGlucHV0LlxuICovXG5mdW5jdGlvbiBwYXJzZUFuaW1hdGlvbk9wdGlvbnMocmF3OiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCBFeHByTm9kZT4ge1xuICBpZiAoIXJhdy50cmltKCkpIHJldHVybiB7fVxuICAvLyBTdHJpcCBvdXRlciBicmFja2V0c1xuICBjb25zdCBpbm5lciA9IHJhdy5yZXBsYWNlKC9eXFxbfFxcXSQvZywgJycpLnRyaW0oKVxuICByZXR1cm4gcGFyc2VBcmdMaXN0KGlubmVyKVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFV0aWxpdGllc1xuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmZ1bmN0aW9uIGV4cHIocmF3OiBzdHJpbmcpOiBFeHByTm9kZSB7XG4gIHJldHVybiB7IHR5cGU6ICdleHByJywgcmF3IH1cbn1cblxuZnVuY3Rpb24gZmlyc3RXb3JkKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB0ZXh0LnNwbGl0KC9cXHMrLylbMF0gPz8gJydcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgYSBzdGF0ZW1lbnQgbG9va3MgbGlrZSBhbiBhbmltYXRpb24gY2FsbDpcbiAqICAgPHdvcmQtd2l0aC1oeXBoZW4+ICA8c2VsZWN0b3J8ZHVyYXRpb24+ICAuLi5cbiAqXG4gKiBUaGlzIGFsbG93cyB1c2VybGFuZCBtb2R1bGUgcHJpbWl0aXZlcyAoc2Nyb2xsLXJldmVhbCwgc3ByaW5nLWluLCBldGMuKVxuICogdG8gYmUgcGFyc2VkIGFzIEFuaW1hdGlvbk5vZGUgd2l0aG91dCBiZWluZyBsaXN0ZWQgaW4gQU5JTUFUSU9OX1BSSU1JVElWRVMuXG4gKiBUaGUgZXhlY3V0b3IgdGhlbiBkaXNwYXRjaGVzIHRoZW0gdGhyb3VnaCB0aGUgTW9kdWxlUmVnaXN0cnkuXG4gKi9cbmZ1bmN0aW9uIGxvb2tzTGlrZUFuaW1hdGlvbkNhbGwodGV4dDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IHBhcnRzID0gdGV4dC50cmltKCkuc3BsaXQoL1xccysvKVxuICBpZiAocGFydHMubGVuZ3RoIDwgMikgcmV0dXJuIGZhbHNlXG4gIGNvbnN0IHNlY29uZCA9IHBhcnRzWzFdID8/ICcnXG4gIC8vIFNlY29uZCB0b2tlbiBpcyBhIENTUyBzZWxlY3RvciAoLmNsYXNzLCAjaWQsIFthdHRyXSwgdGFnbmFtZSkgb3IgYSBkdXJhdGlvbiAoTm1zKVxuICByZXR1cm4gL15bLiNcXFtdLy50ZXN0KHNlY29uZCkgfHwgIC8vIENTUyBzZWxlY3RvclxuICAgICAgICAgL15cXGQrbXMkLy50ZXN0KHNlY29uZCkgICAgICAvLyBiYXJlIGR1cmF0aW9uICh1bnVzdWFsIGJ1dCB2YWxpZClcbn1cblxuZnVuY3Rpb24gdG9TZXF1ZW5jZU9yU2luZ2xlKHN0ZXBzOiBMRVNOb2RlW10pOiBMRVNOb2RlIHtcbiAgaWYgKHN0ZXBzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGV4cHIoJycpXG4gIGlmIChzdGVwcy5sZW5ndGggPT09IDEpIHJldHVybiBzdGVwc1swXSFcbiAgcmV0dXJuIHsgdHlwZTogJ3NlcXVlbmNlJywgc3RlcHMgfSBzYXRpc2ZpZXMgU2VxdWVuY2VOb2RlXG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gUGFyc2UgZXJyb3Jcbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5leHBvcnQgY2xhc3MgTEVTUGFyc2VFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nLCBwdWJsaWMgcmVhZG9ubHkgdG9rZW46IFRva2VuIHwgdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgbG9jID0gdG9rZW4gPyBgIChsaW5lICR7dG9rZW4ubGluZU51bX06ICR7SlNPTi5zdHJpbmdpZnkodG9rZW4udGV4dCl9KWAgOiAnJ1xuICAgIHN1cGVyKGBbTEVTOnBhcnNlcl0gJHttZXNzYWdlfSR7bG9jfWApXG4gICAgdGhpcy5uYW1lID0gJ0xFU1BhcnNlRXJyb3InXG4gIH1cbn1cbiIsICJpbXBvcnQgeyBzdHJpcEJvZHkgfSBmcm9tICcuL3N0cmlwQm9keS5qcydcbmltcG9ydCB7IHRva2VuaXplIH0gZnJvbSAnLi90b2tlbml6ZXIuanMnXG5pbXBvcnQgeyBMRVNQYXJzZXIgfSBmcm9tICcuL3BhcnNlci5qcydcbmltcG9ydCB0eXBlIHsgTEVTTm9kZSB9IGZyb20gJy4vYXN0LmpzJ1xuXG5leHBvcnQgeyBMRVNQYXJzZXIsIExFU1BhcnNlRXJyb3IgfSBmcm9tICcuL3BhcnNlci5qcydcbmV4cG9ydCB7IHRva2VuaXplLCBlbmRzV2l0aEFuZCwgc3RyaXBUcmFpbGluZ0FuZCB9IGZyb20gJy4vdG9rZW5pemVyLmpzJ1xuZXhwb3J0IHsgc3RyaXBCb2R5IH0gZnJvbSAnLi9zdHJpcEJvZHkuanMnXG5leHBvcnQgdHlwZSB7IFRva2VuIH0gZnJvbSAnLi90b2tlbml6ZXIuanMnXG5leHBvcnQgKiBmcm9tICcuL2FzdC5qcydcbmV4cG9ydCAqIGZyb20gJy4vY29uZmlnLmpzJ1xuXG4vKipcbiAqIFBhcnNlIGEgcmF3IExFUyBib2R5IHN0cmluZyAoZnJvbSBhIGRvPSwgaGFuZGxlPSwgb3IgcnVuPSBhdHRyaWJ1dGUpXG4gKiBpbnRvIGEgdHlwZWQgQVNUIG5vZGUuXG4gKlxuICogVGhpcyBpcyB0aGUgcHVibGljIGVudHJ5IHBvaW50IGZvciBQaGFzZSAyOlxuICogICAtIFN0cmlwcyBiYWNrdGljayB3cmFwcGVyIGFuZCBub3JtYWxpemVzIGluZGVudGF0aW9uIChzdHJpcEJvZHkpXG4gKiAgIC0gVG9rZW5pemVzIGludG8gbGluZXMgd2l0aCBpbmRlbnQgbGV2ZWxzICh0b2tlbml6ZSlcbiAqICAgLSBQYXJzZXMgaW50byBhIHR5cGVkIExFU05vZGUgQVNUIChMRVNQYXJzZXIpXG4gKlxuICogQHRocm93cyBMRVNQYXJzZUVycm9yIG9uIHVucmVjb3ZlcmFibGUgc3ludGF4IGVycm9ycyAoY3VycmVudGx5IHNvZnQtd2FybnMgaW5zdGVhZClcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTEVTKHJhdzogc3RyaW5nKTogTEVTTm9kZSB7XG4gIGNvbnN0IHN0cmlwcGVkID0gc3RyaXBCb2R5KHJhdylcbiAgY29uc3QgdG9rZW5zICAgPSB0b2tlbml6ZShzdHJpcHBlZClcbiAgY29uc3QgcGFyc2VyICAgPSBuZXcgTEVTUGFyc2VyKHRva2VucylcbiAgcmV0dXJuIHBhcnNlci5wYXJzZSgpXG59XG4iLCAiLyoqXG4gKiBQaGFzZSA0OiB3aXJlcyB0aGUgcGFyc2VkIGNvbmZpZyBpbnRvIGxpdmUgcnVudGltZSBiZWhhdmlvci5cbiAqXG4gKiBSZXNwb25zaWJpbGl0aWVzOlxuICogICAxLiBSZWdpc3RlciBhbGwgPGxvY2FsLWNvbW1hbmQ+IHBhcnNlZCBkZWZzIGludG8gdGhlIENvbW1hbmRSZWdpc3RyeVxuICogICAyLiBBdHRhY2ggQ3VzdG9tRXZlbnQgbGlzdGVuZXJzIG9uIHRoZSBob3N0IGZvciBlYWNoIDxvbi1ldmVudD5cbiAqICAgMy4gV2lyZSA8b24tbG9hZD4gdG8gZmlyZSBhZnRlciBET00gaXMgcmVhZHlcbiAqICAgNC4gQnVpbGQgdGhlIExFU0NvbnRleHQgdXNlZCBieSB0aGUgZXhlY3V0b3JcbiAqXG4gKiA8b24tc2lnbmFsPiBhbmQgPG9uLWVudGVyPi88b24tZXhpdD4gYXJlIHdpcmVkIGluIFBoYXNlIDUvNi5cbiAqL1xuXG5pbXBvcnQgeyBleGVjdXRlLCBldmFsRXhwciB9IGZyb20gJy4vZXhlY3V0b3IuanMnXG5pbXBvcnQgeyBMRVNTY29wZSB9IGZyb20gJy4vc2NvcGUuanMnXG5pbXBvcnQgdHlwZSB7IENvbW1hbmRSZWdpc3RyeSB9IGZyb20gJy4vcmVnaXN0cnkuanMnXG5pbXBvcnQgdHlwZSB7IE1vZHVsZVJlZ2lzdHJ5IH0gZnJvbSAnQG1vZHVsZXMvdHlwZXMuanMnXG5pbXBvcnQgdHlwZSB7IExFU0NvbmZpZyB9IGZyb20gJ0BwYXJzZXIvY29uZmlnLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNOb2RlIH0gZnJvbSAnQHBhcnNlci9hc3QuanMnXG5pbXBvcnQgeyBwYXJzZUxFUyB9IGZyb20gJ0BwYXJzZXIvaW5kZXguanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFyc2VkV2lyaW5nIHtcbiAgY29tbWFuZHM6ICBBcnJheTx7IG5hbWU6IHN0cmluZzsgZ3VhcmQ6IHN0cmluZyB8IG51bGw7IGFyZ3NSYXc6IHN0cmluZzsgYm9keTogTEVTTm9kZSB9PlxuICBoYW5kbGVyczogIEFycmF5PHsgZXZlbnQ6IHN0cmluZzsgYm9keTogTEVTTm9kZSB9PlxuICB3YXRjaGVyczogIEFycmF5PHsgc2lnbmFsOiBzdHJpbmc7IHdoZW46IHN0cmluZyB8IG51bGw7IGJvZHk6IExFU05vZGUgfT5cbiAgbGlmZWN5Y2xlOiB7XG4gICAgb25Mb2FkOiAgTEVTTm9kZVtdXG4gICAgb25FbnRlcjogQXJyYXk8eyB3aGVuOiBzdHJpbmcgfCBudWxsOyBib2R5OiBMRVNOb2RlIH0+XG4gICAgb25FeGl0OiAgTEVTTm9kZVtdXG4gIH1cbn1cblxuLyoqIEJ1aWxkcyBhIExFU0NvbnRleHQgZm9yIHRoZSBob3N0IGVsZW1lbnQuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDb250ZXh0KFxuICBob3N0OiBFbGVtZW50LFxuICBjb21tYW5kczogQ29tbWFuZFJlZ2lzdHJ5LFxuICBtb2R1bGVzOiBNb2R1bGVSZWdpc3RyeSxcbiAgc2lnbmFsczogeyBnZXQ6IChrOiBzdHJpbmcpID0+IHVua25vd247IHNldDogKGs6IHN0cmluZywgdjogdW5rbm93bikgPT4gdm9pZCB9XG4pOiBpbXBvcnQoJy4vZXhlY3V0b3IuanMnKS5MRVNDb250ZXh0IHtcbiAgY29uc3Qgc2NvcGUgPSBuZXcgTEVTU2NvcGUoKVxuXG4gIGNvbnN0IGVtaXRMb2NhbCA9IChldmVudDogc3RyaW5nLCBwYXlsb2FkOiB1bmtub3duW10pID0+IHtcbiAgICBjb25zb2xlLmxvZyhgW0xFU10gZW1pdCBcIiR7ZXZlbnR9XCJgLCBwYXlsb2FkLmxlbmd0aCA/IHBheWxvYWQgOiAnJylcbiAgICBob3N0LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KGV2ZW50LCB7XG4gICAgICBkZXRhaWw6IHsgcGF5bG9hZCB9LFxuICAgICAgYnViYmxlczogZmFsc2UsXG4gICAgICBjb21wb3NlZDogZmFsc2UsXG4gICAgfSkpXG4gIH1cblxuICBjb25zdCBicm9hZGNhc3QgPSAoZXZlbnQ6IHN0cmluZywgcGF5bG9hZDogdW5rbm93bltdKSA9PiB7XG4gICAgY29uc29sZS5sb2coYFtMRVNdIGJyb2FkY2FzdCBcIiR7ZXZlbnR9XCJgLCBwYXlsb2FkLmxlbmd0aCA/IHBheWxvYWQgOiAnJylcbiAgICAvLyBEaXNwYXRjaCBvbiBkb2N1bWVudCBkaXJlY3RseSwgbm90IG9uIHRoZSBob3N0IGVsZW1lbnQuXG4gICAgLy8gVGhpcyBwcmV2ZW50cyB0aGUgaG9zdCdzIG93biBvbi1ldmVudCBsaXN0ZW5lcnMgZnJvbSBjYXRjaGluZyB0aGVcbiAgICAvLyBicm9hZGNhc3QgXHUyMDE0IHRoZSBob3N0IGlzIHRoZSBvcmlnaW4sIG5vdCBhIHJlY2VpdmVyLlxuICAgIC8vIExpc3RlbmVycyBvbiBkb2N1bWVudCAoZS5nLiBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKSBhbmQgRGF0YXN0YXJcbiAgICAvLyBkYXRhLW9uOiBiaW5kaW5ncyBvbiBhbnkgRE9NIGVsZW1lbnQgc3RpbGwgcmVjZWl2ZSBpdCBub3JtYWxseS5cbiAgICBjb25zdCByb290ID0gaG9zdC5nZXRSb290Tm9kZSgpXG4gICAgY29uc3QgdGFyZ2V0ID0gcm9vdCBpbnN0YW5jZW9mIERvY3VtZW50ID8gcm9vdCA6IChyb290IGFzIFNoYWRvd1Jvb3QpLm93bmVyRG9jdW1lbnQgPz8gZG9jdW1lbnRcbiAgICB0YXJnZXQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoZXZlbnQsIHtcbiAgICAgIGRldGFpbDogeyBwYXlsb2FkIH0sXG4gICAgICBidWJibGVzOiBmYWxzZSwgICAvLyBhbHJlYWR5IGF0IHRoZSB0b3AgXHUyMDE0IGJ1YmJsaW5nIGlzIG1lYW5pbmdsZXNzIGhlcmVcbiAgICAgIGNvbXBvc2VkOiBmYWxzZSxcbiAgICB9KSlcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc2NvcGUsXG4gICAgaG9zdCxcbiAgICBjb21tYW5kcyxcbiAgICBtb2R1bGVzLFxuICAgIGdldFNpZ25hbDogc2lnbmFscy5nZXQsXG4gICAgc2V0U2lnbmFsOiBzaWduYWxzLnNldCxcbiAgICBlbWl0TG9jYWwsXG4gICAgYnJvYWRjYXN0LFxuICB9XG59XG5cbi8qKlxuICogUmVnaXN0ZXJzIGFsbCBwYXJzZWQgY29tbWFuZHMgaW50byB0aGUgcmVnaXN0cnkuXG4gKiBDYWxsZWQgb25jZSBkdXJpbmcgX2luaXQsIGJlZm9yZSBhbnkgZXZlbnRzIGFyZSB3aXJlZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyQ29tbWFuZHMoXG4gIHdpcmluZzogUGFyc2VkV2lyaW5nLFxuICByZWdpc3RyeTogQ29tbWFuZFJlZ2lzdHJ5XG4pOiB2b2lkIHtcbiAgZm9yIChjb25zdCBjbWQgb2Ygd2lyaW5nLmNvbW1hbmRzKSB7XG4gICAgLy8gUGFyc2UgYXJnc1JhdyBpbnRvIEFyZ0RlZltdIChzaW1wbGlmaWVkIFx1MjAxNCBmdWxsIGFyZyBwYXJzaW5nIGluIFBoYXNlIDIgcmVmaW5lbWVudClcbiAgICBjb25zdCBhcmdzID0gcGFyc2VBcmdzUmF3KGNtZC5hcmdzUmF3KVxuICAgIGNvbnN0IGRlZjogaW1wb3J0KCcuL3JlZ2lzdHJ5LmpzJykuQ29tbWFuZERlZiA9IHtcbiAgICAgIG5hbWU6IGNtZC5uYW1lLFxuICAgICAgYXJncyxcbiAgICAgIGJvZHk6IGNtZC5ib2R5LFxuICAgICAgZWxlbWVudDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbG9jYWwtY29tbWFuZCcpLFxuICAgIH1cbiAgICBpZiAoY21kLmd1YXJkKSBkZWYuZ3VhcmQgPSBjbWQuZ3VhcmRcbiAgICByZWdpc3RyeS5yZWdpc3RlcihkZWYpXG4gIH1cbiAgY29uc29sZS5sb2coYFtMRVNdIHJlZ2lzdGVyZWQgJHt3aXJpbmcuY29tbWFuZHMubGVuZ3RofSBjb21tYW5kc2ApXG59XG5cbi8qKlxuICogQXR0YWNoZXMgZXZlbnQgbGlzdGVuZXJzIG9uIHRoZSBob3N0IGZvciBhbGwgPG9uLWV2ZW50PiBoYW5kbGVycy5cbiAqIFJldHVybnMgYSBjbGVhbnVwIGZ1bmN0aW9uIHRoYXQgcmVtb3ZlcyBhbGwgbGlzdGVuZXJzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2lyZUV2ZW50SGFuZGxlcnMoXG4gIHdpcmluZzogUGFyc2VkV2lyaW5nLFxuICBob3N0OiBFbGVtZW50LFxuICBnZXRDdHg6ICgpID0+IGltcG9ydCgnLi9leGVjdXRvci5qcycpLkxFU0NvbnRleHRcbik6ICgpID0+IHZvaWQge1xuICBjb25zdCBjbGVhbnVwczogQXJyYXk8KCkgPT4gdm9pZD4gPSBbXVxuXG4gIGZvciAoY29uc3QgaGFuZGxlciBvZiB3aXJpbmcuaGFuZGxlcnMpIHtcbiAgICBjb25zdCBsaXN0ZW5lciA9IChlOiBFdmVudCkgPT4ge1xuICAgICAgY29uc3QgY3R4ID0gZ2V0Q3R4KClcbiAgICAgIC8vIEV4cG9zZSBldmVudCBkZXRhaWwgaW4gc2NvcGVcbiAgICAgIGNvbnN0IGhhbmRsZXJTY29wZSA9IGN0eC5zY29wZS5jaGlsZCgpXG4gICAgICBjb25zdCBkZXRhaWwgPSAoZSBhcyBDdXN0b21FdmVudCkuZGV0YWlsID8/IHt9XG4gICAgICBoYW5kbGVyU2NvcGUuc2V0KCdldmVudCcsIGUpXG4gICAgICBoYW5kbGVyU2NvcGUuc2V0KCdwYXlsb2FkJywgZGV0YWlsLnBheWxvYWQgPz8gW10pXG4gICAgICBjb25zdCBoYW5kbGVyQ3R4ID0geyAuLi5jdHgsIHNjb3BlOiBoYW5kbGVyU2NvcGUgfVxuXG4gICAgICBleGVjdXRlKGhhbmRsZXIuYm9keSwgaGFuZGxlckN0eCkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgW0xFU10gRXJyb3IgaW4gaGFuZGxlciBmb3IgXCIke2hhbmRsZXIuZXZlbnR9XCI6YCwgZXJyKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBob3N0LmFkZEV2ZW50TGlzdGVuZXIoaGFuZGxlci5ldmVudCwgbGlzdGVuZXIpXG4gICAgY2xlYW51cHMucHVzaCgoKSA9PiBob3N0LnJlbW92ZUV2ZW50TGlzdGVuZXIoaGFuZGxlci5ldmVudCwgbGlzdGVuZXIpKVxuICAgIGNvbnNvbGUubG9nKGBbTEVTXSB3aXJlZCBldmVudCBoYW5kbGVyOiBcIiR7aGFuZGxlci5ldmVudH1cImApXG4gIH1cblxuICByZXR1cm4gKCkgPT4gY2xlYW51cHMuZm9yRWFjaChmbiA9PiBmbigpKVxufVxuXG4vKipcbiAqIEZpcmVzIGFsbCA8b24tbG9hZD4gYm9kaWVzLlxuICogQ2FsbGVkIGFmdGVyIGNvbW1hbmRzIGFyZSByZWdpc3RlcmVkIGFuZCBldmVudCBoYW5kbGVycyBhcmUgd2lyZWQsXG4gKiBzbyBlbWl0L2NhbGwgc3RhdGVtZW50cyBpbiBvbi1sb2FkIGNhbiByZWFjaCB0aGVpciB0YXJnZXRzLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmlyZU9uTG9hZChcbiAgd2lyaW5nOiBQYXJzZWRXaXJpbmcsXG4gIGdldEN0eDogKCkgPT4gaW1wb3J0KCcuL2V4ZWN1dG9yLmpzJykuTEVTQ29udGV4dFxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGZvciAoY29uc3QgYm9keSBvZiB3aXJpbmcubGlmZWN5Y2xlLm9uTG9hZCkge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBleGVjdXRlKGJvZHksIGdldEN0eCgpKVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcignW0xFU10gRXJyb3IgaW4gb24tbG9hZDonLCBlcnIpXG4gICAgfVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuLy8gQXJnIHBhcnNpbmcgKHNpbXBsaWZpZWQgXHUyMDE0IGZ1bGwgdHlwZS1jaGVja2VkIHZlcnNpb24gaW4gUGhhc2UgMiByZWZpbmVtZW50KVxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmltcG9ydCB0eXBlIHsgQXJnRGVmIH0gZnJvbSAnLi9yZWdpc3RyeS5qcydcbmltcG9ydCB0eXBlIHsgRXhwck5vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuZnVuY3Rpb24gcGFyc2VBcmdzUmF3KHJhdzogc3RyaW5nKTogQXJnRGVmW10ge1xuICBpZiAoIXJhdy50cmltKCkpIHJldHVybiBbXVxuICAvLyBTdHJpcCBvdXRlciBicmFja2V0czogXCJbZnJvbTpzdHIgIHRvOnN0ciAgYXR0ZW1wdDppbnQ9MF1cIiBcdTIxOTIgXCJmcm9tOnN0ciAgdG86c3RyICBhdHRlbXB0OmludD0wXCJcbiAgY29uc3QgaW5uZXIgPSByYXcucmVwbGFjZSgvXlxcW3xcXF0kL2csICcnKS50cmltKClcbiAgaWYgKCFpbm5lcikgcmV0dXJuIFtdXG5cbiAgcmV0dXJuIGlubmVyLnNwbGl0KC9cXHN7Mix9fFxccyg/PVxcdys6KS8pLm1hcChzID0+IHMudHJpbSgpKS5maWx0ZXIoQm9vbGVhbikubWFwKHBhcnQgPT4ge1xuICAgIC8vIGBuYW1lOnR5cGU9ZGVmYXVsdGAgb3IgYG5hbWU6dHlwZWBcbiAgICBjb25zdCBlcUlkeCA9IHBhcnQuaW5kZXhPZignPScpXG4gICAgY29uc3QgY29sb25JZHggPSBwYXJ0LmluZGV4T2YoJzonKVxuICAgIGlmIChjb2xvbklkeCA9PT0gLTEpIHJldHVybiB7IG5hbWU6IHBhcnQsIHR5cGU6ICdkeW4nIH1cblxuICAgIGNvbnN0IG5hbWUgPSBwYXJ0LnNsaWNlKDAsIGNvbG9uSWR4KS50cmltKClcbiAgICBjb25zdCByZXN0ID0gcGFydC5zbGljZShjb2xvbklkeCArIDEpXG5cbiAgICBpZiAoZXFJZHggPT09IC0xKSB7XG4gICAgICByZXR1cm4geyBuYW1lLCB0eXBlOiByZXN0LnRyaW0oKSB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHR5cGUgPSBwYXJ0LnNsaWNlKGNvbG9uSWR4ICsgMSwgZXFJZHgpLnRyaW0oKVxuICAgICAgY29uc3QgZGVmYXVsdFJhdyA9IHBhcnQuc2xpY2UoZXFJZHggKyAxKS50cmltKClcbiAgICAgIGNvbnN0IGRlZmF1bHRFeHByOiBFeHByTm9kZSA9IHsgdHlwZTogJ2V4cHInLCByYXc6IGRlZmF1bHRSYXcgfVxuICAgICAgcmV0dXJuIHsgbmFtZSwgdHlwZSwgZGVmYXVsdDogZGVmYXVsdEV4cHIgfVxuICAgIH1cbiAgfSlcbn1cbiIsICIvKipcbiAqIExFU1Njb3BlIFx1MjAxNCBhIHNpbXBsZSBsZXhpY2FsbHktc2NvcGVkIHZhcmlhYmxlIHN0b3JlLlxuICpcbiAqIEVhY2ggY29tbWFuZCBpbnZvY2F0aW9uIGdldHMgYSBmcmVzaCBjaGlsZCBzY29wZS5cbiAqIE1hdGNoIGFybSBiaW5kaW5ncyBhbHNvIGNyZWF0ZSBhIGNoaWxkIHNjb3BlIGxpbWl0ZWQgdG8gdGhhdCBhcm0ncyBib2R5LlxuICogU2lnbmFsIHJlYWRzL3dyaXRlcyBnbyB0aHJvdWdoIHRoZSBEYXRhc3RhciBicmlkZ2UsIG5vdCB0aGlzIHNjb3BlLlxuICovXG5leHBvcnQgY2xhc3MgTEVTU2NvcGUge1xuICBwcml2YXRlIGxvY2FscyA9IG5ldyBNYXA8c3RyaW5nLCB1bmtub3duPigpXG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBwYXJlbnQ/OiBMRVNTY29wZSkge31cblxuICBnZXQobmFtZTogc3RyaW5nKTogdW5rbm93biB7XG4gICAgaWYgKHRoaXMubG9jYWxzLmhhcyhuYW1lKSkgcmV0dXJuIHRoaXMubG9jYWxzLmdldChuYW1lKVxuICAgIHJldHVybiB0aGlzLnBhcmVudD8uZ2V0KG5hbWUpXG4gIH1cblxuICBzZXQobmFtZTogc3RyaW5nLCB2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICAgIHRoaXMubG9jYWxzLnNldChuYW1lLCB2YWx1ZSlcbiAgfVxuXG4gIGhhcyhuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5sb2NhbHMuaGFzKG5hbWUpIHx8ICh0aGlzLnBhcmVudD8uaGFzKG5hbWUpID8/IGZhbHNlKVxuICB9XG5cbiAgLyoqIENyZWF0ZSBhIGNoaWxkIHNjb3BlIGluaGVyaXRpbmcgYWxsIGxvY2FscyBmcm9tIHRoaXMgb25lLiAqL1xuICBjaGlsZCgpOiBMRVNTY29wZSB7XG4gICAgcmV0dXJuIG5ldyBMRVNTY29wZSh0aGlzKVxuICB9XG5cbiAgLyoqIFNuYXBzaG90IGFsbCBsb2NhbHMgKGZvciBkZWJ1Z2dpbmcgLyBlcnJvciBtZXNzYWdlcykuICovXG4gIHNuYXBzaG90KCk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcbiAgICBjb25zdCBiYXNlID0gdGhpcy5wYXJlbnQ/LnNuYXBzaG90KCkgPz8ge31cbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiB0aGlzLmxvY2FscykgYmFzZVtrXSA9IHZcbiAgICByZXR1cm4gYmFzZVxuICB9XG59XG4iLCAiLyoqXG4gKiBQaGFzZSA1YTogSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgd2lyaW5nXG4gKlxuICogT25lIHNoYXJlZCBJbnRlcnNlY3Rpb25PYnNlcnZlciBpcyBjcmVhdGVkIHBlciA8bG9jYWwtZXZlbnQtc2NyaXB0PiBob3N0LlxuICogSXQgd2F0Y2hlcyB0aGUgaG9zdCBlbGVtZW50IGl0c2VsZiAobm90IGl0cyBjaGlsZHJlbikuXG4gKlxuICogb24tZW50ZXI6IGZpcmVzIHdoZW4gdGhlIGhvc3QgY3Jvc3NlcyBpbnRvIHRoZSB2aWV3cG9ydFxuICogICAtIEVhY2ggPG9uLWVudGVyPiBoYXMgYW4gb3B0aW9uYWwgYHdoZW5gIGd1YXJkIGV2YWx1YXRlZCBhdCBmaXJlIHRpbWVcbiAqICAgLSBNdWx0aXBsZSA8b24tZW50ZXI+IGNoaWxkcmVuIGFyZSBhbGwgY2hlY2tlZCBpbiBkZWNsYXJhdGlvbiBvcmRlclxuICpcbiAqIG9uLWV4aXQ6IGZpcmVzIHdoZW4gdGhlIGhvc3QgbGVhdmVzIHRoZSB2aWV3cG9ydFxuICogICAtIEFsd2F5cyBmaXJlcyB1bmNvbmRpdGlvbmFsbHkgKG5vIGB3aGVuYCBndWFyZCBvbiBvbi1leGl0KVxuICogICAtIE11bHRpcGxlIDxvbi1leGl0PiBjaGlsZHJlbiBhbGwgZmlyZVxuICpcbiAqIFRoZSBvYnNlcnZlciBpcyBkaXNjb25uZWN0ZWQgaW4gZGlzY29ubmVjdGVkQ2FsbGJhY2sgdmlhIHRoZSByZXR1cm5lZCBjbGVhbnVwIGZuLlxuICovXG5cbmltcG9ydCB7IGV4ZWN1dGUsIGV2YWxFeHByIH0gZnJvbSAnLi9leGVjdXRvci5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29udGV4dCB9IGZyb20gJy4vZXhlY3V0b3IuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcblxuZXhwb3J0IGludGVyZmFjZSBPbkVudGVyRGVjbCB7XG4gIHdoZW46IHN0cmluZyB8IG51bGxcbiAgYm9keTogTEVTTm9kZVxufVxuXG4vKipcbiAqIEF0dGFjaGVzIGFuIEludGVyc2VjdGlvbk9ic2VydmVyIHRvIHRoZSBob3N0IGVsZW1lbnQuXG4gKlxuICogQHJldHVybnMgQSBjbGVhbnVwIGZ1bmN0aW9uIHRoYXQgZGlzY29ubmVjdHMgdGhlIG9ic2VydmVyLlxuICovXG5leHBvcnQgZnVuY3Rpb24gd2lyZUludGVyc2VjdGlvbk9ic2VydmVyKFxuICBob3N0OiBFbGVtZW50LFxuICBvbkVudGVyOiBPbkVudGVyRGVjbFtdLFxuICBvbkV4aXQ6IExFU05vZGVbXSxcbiAgZ2V0Q3R4OiAoKSA9PiBMRVNDb250ZXh0LFxuKTogKCkgPT4gdm9pZCB7XG4gIGlmIChvbkVudGVyLmxlbmd0aCA9PT0gMCAmJiBvbkV4aXQubGVuZ3RoID09PSAwKSB7XG4gICAgLy8gTm90aGluZyB0byBvYnNlcnZlIFx1MjAxNCBza2lwIGNyZWF0aW5nIHRoZSBJTyBlbnRpcmVseVxuICAgIHJldHVybiAoKSA9PiB7fVxuICB9XG5cbiAgbGV0IHdhc0ludGVyc2VjdGluZzogYm9vbGVhbiB8IG51bGwgPSBudWxsXG5cbiAgY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgSW50ZXJzZWN0aW9uT2JzZXJ2ZXIoXG4gICAgKGVudHJpZXMpID0+IHtcbiAgICAgIC8vIElPIGZpcmVzIG9uY2UgaW1tZWRpYXRlbHkgb24gYXR0YWNoIHdpdGggdGhlIGN1cnJlbnQgc3RhdGUuXG4gICAgICAvLyBXZSB0cmFjayBgd2FzSW50ZXJzZWN0aW5nYCB0byBhdm9pZCBzcHVyaW91cyBvbi1leGl0IG9uIGZpcnN0IHRpY2suXG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgICAgY29uc3Qgbm93SW50ZXJzZWN0aW5nID0gZW50cnkuaXNJbnRlcnNlY3RpbmdcblxuICAgICAgICBpZiAobm93SW50ZXJzZWN0aW5nICYmIHdhc0ludGVyc2VjdGluZyAhPT0gdHJ1ZSkge1xuICAgICAgICAgIC8vIEVudGVyZWQgdmlld3BvcnRcbiAgICAgICAgICB3YXNJbnRlcnNlY3RpbmcgPSB0cnVlXG4gICAgICAgICAgaGFuZGxlRW50ZXIob25FbnRlciwgZ2V0Q3R4KVxuICAgICAgICB9IGVsc2UgaWYgKCFub3dJbnRlcnNlY3RpbmcgJiYgd2FzSW50ZXJzZWN0aW5nID09PSB0cnVlKSB7XG4gICAgICAgICAgLy8gRXhpdGVkIHZpZXdwb3J0IChvbmx5IGFmdGVyIHdlJ3ZlIGJlZW4gaW4gaXQpXG4gICAgICAgICAgd2FzSW50ZXJzZWN0aW5nID0gZmFsc2VcbiAgICAgICAgICBoYW5kbGVFeGl0KG9uRXhpdCwgZ2V0Q3R4KVxuICAgICAgICB9IGVsc2UgaWYgKHdhc0ludGVyc2VjdGluZyA9PT0gbnVsbCkge1xuICAgICAgICAgIC8vIEZpcnN0IHRpY2sgXHUyMDE0IHJlY29yZCBzdGF0ZSBidXQgZG9uJ3QgZmlyZSBleGl0IGZvciBpbml0aWFsbHktb2ZmLXNjcmVlblxuICAgICAgICAgIHdhc0ludGVyc2VjdGluZyA9IG5vd0ludGVyc2VjdGluZ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAvLyBEZWZhdWx0IHRocmVzaG9sZDogZmlyZSB3aGVuIGFueSBwaXhlbCBvZiB0aGUgaG9zdCBlbnRlcnMvZXhpdHNcbiAgICAgIHRocmVzaG9sZDogMCxcbiAgICB9XG4gIClcblxuICBvYnNlcnZlci5vYnNlcnZlKGhvc3QpXG4gIGNvbnNvbGUubG9nKCdbTEVTXSBJbnRlcnNlY3Rpb25PYnNlcnZlciBhdHRhY2hlZCcsIChob3N0IGFzIEhUTUxFbGVtZW50KS5pZCB8fCBob3N0LnRhZ05hbWUpXG5cbiAgcmV0dXJuICgpID0+IHtcbiAgICBvYnNlcnZlci5kaXNjb25uZWN0KClcbiAgICBjb25zb2xlLmxvZygnW0xFU10gSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgZGlzY29ubmVjdGVkJylcbiAgfVxufVxuXG5mdW5jdGlvbiBoYW5kbGVFbnRlcihkZWNsczogT25FbnRlckRlY2xbXSwgZ2V0Q3R4OiAoKSA9PiBMRVNDb250ZXh0KTogdm9pZCB7XG4gIGNvbnN0IGN0eCA9IGdldEN0eCgpXG5cbiAgZm9yIChjb25zdCBkZWNsIG9mIGRlY2xzKSB7XG4gICAgLy8gRXZhbHVhdGUgYHdoZW5gIGd1YXJkIFx1MjAxNCBpZiBhYnNlbnQsIGFsd2F5cyBmaXJlc1xuICAgIGlmIChkZWNsLndoZW4pIHtcbiAgICAgIGNvbnN0IHBhc3NlcyA9IEJvb2xlYW4oZXZhbEV4cHIoeyB0eXBlOiAnZXhwcicsIHJhdzogZGVjbC53aGVuIH0sIGN0eCkpXG4gICAgICBpZiAoIXBhc3Nlcykge1xuICAgICAgICBjb25zb2xlLmxvZyhgW0xFU10gb24tZW50ZXIgZ3VhcmQgcmVqZWN0ZWQ6ICR7ZGVjbC53aGVufWApXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgfVxuXG4gICAgZXhlY3V0ZShkZWNsLmJvZHksIGN0eCkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tMRVNdIEVycm9yIGluIG9uLWVudGVyOicsIGVycilcbiAgICB9KVxuICB9XG59XG5cbmZ1bmN0aW9uIGhhbmRsZUV4aXQoYm9kaWVzOiBMRVNOb2RlW10sIGdldEN0eDogKCkgPT4gTEVTQ29udGV4dCk6IHZvaWQge1xuICBjb25zdCBjdHggPSBnZXRDdHgoKVxuXG4gIGZvciAoY29uc3QgYm9keSBvZiBib2RpZXMpIHtcbiAgICBleGVjdXRlKGJvZHksIGN0eCkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tMRVNdIEVycm9yIGluIG9uLWV4aXQ6JywgZXJyKVxuICAgIH0pXG4gIH1cbn1cbiIsICIvKipcbiAqIFBoYXNlIDViOiBTaWduYWwgd2F0Y2hlciB3aXJpbmdcbiAqXG4gKiA8b24tc2lnbmFsPiByZWFjdHMgd2hlbmV2ZXIgYSBuYW1lZCBEYXRhc3RhciBzaWduYWwgY2hhbmdlcy5cbiAqIFRoZSBgd2hlbmAgZ3VhcmQgaXMgcmUtZXZhbHVhdGVkIG9uIGV2ZXJ5IGNoYW5nZSBcdTIwMTQgaWYgZmFsc3ksIHRoZVxuICogaGFuZGxlIGJvZHkgZG9lcyBub3QgcnVuIChub3QgYW4gZXJyb3IsIGp1c3QgZmlsdGVyZWQgb3V0KS5cbiAqXG4gKiBJbiBQaGFzZSA1IHdlIHVzZSBhIHNpbXBsZSBsb2NhbCBub3RpZmljYXRpb24gcGF0aDogd2hlbmV2ZXJcbiAqIExvY2FsRXZlbnRTY3JpcHQuX3NldFNpZ25hbCgpIHdyaXRlcyBhIHZhbHVlLCBpdCBjYWxscyBpbnRvXG4gKiBub3RpZnlTaWduYWxXYXRjaGVycygpLiBUaGlzIGhhbmRsZXMgdGhlIGZhbGxiYWNrIChubyBEYXRhc3RhcikgY2FzZS5cbiAqXG4gKiBQaGFzZSA2IHJlcGxhY2VzIHRoZSBub3RpZmljYXRpb24gcGF0aCB3aXRoIERhdGFzdGFyJ3MgZWZmZWN0KCkgc3lzdGVtLFxuICogd2hpY2ggaXMgbW9yZSBlZmZpY2llbnQgKGJhdGNoZWQsIGRlZHVwZWQsIHJlYWN0aXZlIGdyYXBoLWF3YXJlKS5cbiAqXG4gKiBUaGUgd2F0Y2hlciBmaXJlcyB0aGUgYm9keSBhc3luY2hyb25vdXNseSAobm9uLWJsb2NraW5nKSB0byBtYXRjaFxuICogdGhlIGJlaGF2aW91ciBvZiBEYXRhc3RhcidzIHJlYWN0aXZlIGVmZmVjdHMuXG4gKi9cblxuaW1wb3J0IHsgZXhlY3V0ZSwgZXZhbEV4cHIgfSBmcm9tICcuL2V4ZWN1dG9yLmpzJ1xuaW1wb3J0IHR5cGUgeyBMRVNDb250ZXh0IH0gZnJvbSAnLi9leGVjdXRvci5qcydcbmltcG9ydCB0eXBlIHsgTEVTTm9kZSB9IGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIFNpZ25hbFdhdGNoZXJEZWNsIHtcbiAgLyoqIFNpZ25hbCBuYW1lIHdpdGggJCBwcmVmaXg6IFwiJGZlZWRTdGF0ZVwiICovXG4gIHNpZ25hbDogc3RyaW5nXG4gIC8qKiBPcHRpb25hbCBndWFyZCBleHByZXNzaW9uIFx1MjAxNCBudWxsIG1lYW5zIGFsd2F5cyBmaXJlcyAqL1xuICB3aGVuOiBzdHJpbmcgfCBudWxsXG4gIGJvZHk6IExFU05vZGVcbn1cblxuLyoqXG4gKiBDaGVja3MgYWxsIHNpZ25hbCB3YXRjaGVycyB0byBzZWUgaWYgYW55IHNob3VsZCBmaXJlIGZvciB0aGVcbiAqIGdpdmVuIHNpZ25hbCBuYW1lIGNoYW5nZS5cbiAqXG4gKiBDYWxsZWQgZnJvbSBMb2NhbEV2ZW50U2NyaXB0Ll9zZXRTaWduYWwoKSBhZnRlciBldmVyeSB3cml0ZS5cbiAqIEFsc28gY2FsbGVkIGZyb20gUGhhc2UgNiBEYXRhc3RhciBlZmZlY3QoKSBzdWJzY3JpcHRpb25zLlxuICpcbiAqIEBwYXJhbSBjaGFuZ2VkU2lnbmFsICBUaGUgc2lnbmFsIG5hbWUgKndpdGhvdXQqIHRoZSAkIHByZWZpeFxuICogQHBhcmFtIHdhdGNoZXJzICAgICAgIEFsbCBvbi1zaWduYWwgZGVjbGFyYXRpb25zIGZvciB0aGlzIExFUyBpbnN0YW5jZVxuICogQHBhcmFtIGdldEN0eCAgICAgICAgIFJldHVybnMgdGhlIGN1cnJlbnQgZXhlY3V0aW9uIGNvbnRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG5vdGlmeVNpZ25hbFdhdGNoZXJzKFxuICBjaGFuZ2VkU2lnbmFsOiBzdHJpbmcsXG4gIHdhdGNoZXJzOiBTaWduYWxXYXRjaGVyRGVjbFtdLFxuICBnZXRDdHg6ICgpID0+IExFU0NvbnRleHRcbik6IHZvaWQge1xuICBmb3IgKGNvbnN0IHdhdGNoZXIgb2Ygd2F0Y2hlcnMpIHtcbiAgICAvLyBOb3JtYWxpemU6IHN0cmlwIGxlYWRpbmcgJCBmb3IgY29tcGFyaXNvblxuICAgIGNvbnN0IHdhdGNoZWRLZXkgPSB3YXRjaGVyLnNpZ25hbC5yZXBsYWNlKC9eXFwkLywgJycpXG5cbiAgICBpZiAod2F0Y2hlZEtleSAhPT0gY2hhbmdlZFNpZ25hbCkgY29udGludWVcblxuICAgIGNvbnN0IGN0eCA9IGdldEN0eCgpXG5cbiAgICAvLyBFdmFsdWF0ZSBgd2hlbmAgZ3VhcmRcbiAgICBpZiAod2F0Y2hlci53aGVuKSB7XG4gICAgICBjb25zdCBwYXNzZXMgPSBCb29sZWFuKGV2YWxFeHByKHsgdHlwZTogJ2V4cHInLCByYXc6IHdhdGNoZXIud2hlbiB9LCBjdHgpKVxuICAgICAgaWYgKCFwYXNzZXMpIGNvbnRpbnVlXG4gICAgfVxuXG4gICAgLy8gRmlyZSB0aGUgYm9keSBhc3luY2hyb25vdXNseSBcdTIwMTQgZG9uJ3QgYmxvY2sgdGhlIHNpZ25hbCB3cml0ZSBwYXRoXG4gICAgZXhlY3V0ZSh3YXRjaGVyLmJvZHksIGN0eCkuY2F0Y2goZXJyID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFtMRVNdIEVycm9yIGluIG9uLXNpZ25hbCBcIiR7d2F0Y2hlci5zaWduYWx9XCI6YCwgZXJyKVxuICAgIH0pXG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGVzIGEgRGF0YXN0YXItY29tcGF0aWJsZSBlZmZlY3Qgc3Vic2NyaXB0aW9uIGZvciBvbmUgc2lnbmFsIHdhdGNoZXIuXG4gKiBVc2VkIGluIFBoYXNlIDYgd2hlbiBEYXRhc3RhciBpcyBwcmVzZW50LlxuICpcbiAqIEBwYXJhbSB3YXRjaGVyICAgVGhlIG9uLXNpZ25hbCBkZWNsYXJhdGlvblxuICogQHBhcmFtIGVmZmVjdCAgICBEYXRhc3RhcidzIGVmZmVjdCgpIGZ1bmN0aW9uXG4gKiBAcGFyYW0gZ2V0Q3R4ICAgIFJldHVybnMgdGhlIGN1cnJlbnQgZXhlY3V0aW9uIGNvbnRleHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdpcmVTaWduYWxXYXRjaGVyVmlhRGF0YXN0YXIoXG4gIHdhdGNoZXI6IFNpZ25hbFdhdGNoZXJEZWNsLFxuICBlZmZlY3Q6IChmbjogKCkgPT4gdm9pZCkgPT4gdm9pZCxcbiAgZ2V0Q3R4OiAoKSA9PiBMRVNDb250ZXh0XG4pOiB2b2lkIHtcbiAgZWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBjdHggPSBnZXRDdHgoKVxuXG4gICAgLy8gUmVhZGluZyB0aGUgc2lnbmFsIGluc2lkZSBhbiBlZmZlY3QoKSBhdXRvLXN1YnNjcmliZXMgdXMgdG8gaXRcbiAgICBjb25zdCBzaWduYWxLZXkgPSB3YXRjaGVyLnNpZ25hbC5yZXBsYWNlKC9eXFwkLywgJycpXG4gICAgY3R4LmdldFNpZ25hbChzaWduYWxLZXkpIC8vIHN1YnNjcmlwdGlvbiBzaWRlLWVmZmVjdFxuXG4gICAgaWYgKHdhdGNoZXIud2hlbikge1xuICAgICAgY29uc3QgcGFzc2VzID0gQm9vbGVhbihldmFsRXhwcih7IHR5cGU6ICdleHByJywgcmF3OiB3YXRjaGVyLndoZW4gfSwgY3R4KSlcbiAgICAgIGlmICghcGFzc2VzKSByZXR1cm5cbiAgICB9XG5cbiAgICBleGVjdXRlKHdhdGNoZXIuYm9keSwgY3R4KS5jYXRjaChlcnIgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcihgW0xFU10gRXJyb3IgaW4gb24tc2lnbmFsIFwiJHt3YXRjaGVyLnNpZ25hbH1cIiAoRGF0YXN0YXIpOmAsIGVycilcbiAgICB9KVxuICB9KVxufVxuIiwgImltcG9ydCB7IENvbW1hbmRSZWdpc3RyeSB9IGZyb20gJ0BydW50aW1lL3JlZ2lzdHJ5LmpzJ1xuaW1wb3J0IHsgTW9kdWxlUmVnaXN0cnksIGxvYWRNb2R1bGUgfSBmcm9tICdAbW9kdWxlcy90eXBlcy5qcydcbmltcG9ydCB7IHJlYWRDb25maWcsIGxvZ0NvbmZpZyB9IGZyb20gJ0BwYXJzZXIvcmVhZGVyLmpzJ1xuaW1wb3J0IHsgcGFyc2VMRVMgfSBmcm9tICdAcGFyc2VyL2luZGV4LmpzJ1xuaW1wb3J0IHsgYnVpbGRDb250ZXh0LCByZWdpc3RlckNvbW1hbmRzLCB3aXJlRXZlbnRIYW5kbGVycywgZmlyZU9uTG9hZCwgdHlwZSBQYXJzZWRXaXJpbmcgfSBmcm9tICdAcnVudGltZS93aXJpbmcuanMnXG5pbXBvcnQgeyB3aXJlSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgfSBmcm9tICdAcnVudGltZS9vYnNlcnZlci5qcydcbmltcG9ydCB7IG5vdGlmeVNpZ25hbFdhdGNoZXJzLCB3aXJlU2lnbmFsV2F0Y2hlclZpYURhdGFzdGFyIH0gZnJvbSAnQHJ1bnRpbWUvc2lnbmFscy5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29uZmlnIH0gZnJvbSAnQHBhcnNlci9jb25maWcuanMnXG5pbXBvcnQgdHlwZSB7IExFU05vZGUgfSBmcm9tICdAcGFyc2VyL2FzdC5qcydcbmltcG9ydCB0eXBlIHsgTEVTQ29udGV4dCB9IGZyb20gJ0BydW50aW1lL2V4ZWN1dG9yLmpzJ1xuXG5leHBvcnQgY2xhc3MgTG9jYWxFdmVudFNjcmlwdCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgcmVhZG9ubHkgY29tbWFuZHMgPSBuZXcgQ29tbWFuZFJlZ2lzdHJ5KClcbiAgcmVhZG9ubHkgbW9kdWxlcyAgPSBuZXcgTW9kdWxlUmVnaXN0cnkoKVxuXG4gIHByaXZhdGUgX2NvbmZpZzogIExFU0NvbmZpZyB8IG51bGwgID0gbnVsbFxuICBwcml2YXRlIF93aXJpbmc6ICBQYXJzZWRXaXJpbmcgfCBudWxsID0gbnVsbFxuICBwcml2YXRlIF9jdHg6ICAgICBMRVNDb250ZXh0IHwgbnVsbCA9IG51bGxcblxuICAvLyBDbGVhbnVwIGZucyBhY2N1bXVsYXRlZCBkdXJpbmcgX2luaXQgXHUyMDE0IGFsbCBjYWxsZWQgaW4gX3RlYXJkb3duXG4gIHByaXZhdGUgX2NsZWFudXBzOiBBcnJheTwoKSA9PiB2b2lkPiA9IFtdXG5cbiAgLy8gU2ltcGxlIGZhbGxiYWNrIHNpZ25hbCBzdG9yZSAoRGF0YXN0YXIgYnJpZGdlIHJlcGxhY2VzIHJlYWRzL3dyaXRlcyBpbiBQaGFzZSA2KVxuICBwcml2YXRlIF9zaWduYWxzOiBNYXA8c3RyaW5nLCB1bmtub3duPiA9IG5ldyBNYXAoKVxuXG4gIC8vIERhdGFzdGFyIGJyaWRnZSAocG9wdWxhdGVkIGluIFBoYXNlIDYgdmlhIGF0dHJpYnV0ZSBwbHVnaW4pXG4gIHByaXZhdGUgX2RzRWZmZWN0OiAoKGZuOiAoKSA9PiB2b2lkKSA9PiB2b2lkKSB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZFxuICBwcml2YXRlIF9kc1NpZ25hbDogKDxUPihuYW1lOiBzdHJpbmcsIGluaXQ/OiBUKSA9PiB7IHZhbHVlOiBUIH0pIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkXG5cbiAgZ2V0IGNvbmZpZygpOiAgTEVTQ29uZmlnIHwgbnVsbCAgICB7IHJldHVybiB0aGlzLl9jb25maWcgfVxuICBnZXQgd2lyaW5nKCk6ICBQYXJzZWRXaXJpbmcgfCBudWxsIHsgcmV0dXJuIHRoaXMuX3dpcmluZyB9XG4gIGdldCBjb250ZXh0KCk6IExFU0NvbnRleHQgfCBudWxsICAgeyByZXR1cm4gdGhpcy5fY3R4IH1cblxuICBzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcygpOiBzdHJpbmdbXSB7IHJldHVybiBbXSB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgcXVldWVNaWNyb3Rhc2soKCkgPT4gdGhpcy5faW5pdCgpKVxuICB9XG5cbiAgZGlzY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgdGhpcy5fdGVhcmRvd24oKVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEludGVybmFsIGxpZmVjeWNsZSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwcml2YXRlIGFzeW5jIF9pbml0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8bG9jYWwtZXZlbnQtc2NyaXB0PiBpbml0aWFsaXppbmcnLCB0aGlzLmlkIHx8ICcobm8gaWQpJylcblxuICAgIC8vIFByZS1zZWVkIGxvY2FsIHNpZ25hbCBzdG9yZSBmcm9tIGRhdGEtc2lnbmFsczoqIGF0dHJpYnV0ZXMuXG4gICAgLy8gVGhlIEludGVyc2VjdGlvbk9ic2VydmVyIGNhbiBmaXJlIGJlZm9yZSBEYXRhc3RhcidzIGFzeW5jIHBsdWdpbiBjb25uZWN0cyxcbiAgICAvLyBzbyBndWFyZCBleHByZXNzaW9ucyBsaWtlIGAkaW50cm9TdGF0ZSA9PSAnaGlkZGVuJ2Agd291bGQgZXZhbHVhdGUgdG9cbiAgICAvLyBgdW5kZWZpbmVkID09ICdoaWRkZW4nYCBcdTIxOTIgZmFsc2Ugd2l0aG91dCB0aGlzIHByZS1zZWVkaW5nIHN0ZXAuXG4gICAgdGhpcy5fc2VlZFNpZ25hbHNGcm9tQXR0cmlidXRlcygpXG5cbiAgICAvLyBQaGFzZSAxOiBET00gXHUyMTkyIGNvbmZpZ1xuICAgIHRoaXMuX2NvbmZpZyA9IHJlYWRDb25maWcodGhpcylcbiAgICBsb2dDb25maWcodGhpcy5fY29uZmlnKVxuXG4gICAgLy8gUGhhc2UgODogbG9hZCBtb2R1bGVzIGJlZm9yZSBwYXJzaW5nIHNvIHByaW1pdGl2ZSBuYW1lcyByZXNvbHZlXG4gICAgYXdhaXQgdGhpcy5fbG9hZE1vZHVsZXModGhpcy5fY29uZmlnKVxuXG4gICAgLy8gUGhhc2UgMjogcGFyc2UgYm9keSBzdHJpbmdzIFx1MjE5MiBBU1RcbiAgICB0aGlzLl93aXJpbmcgPSB0aGlzLl9wYXJzZUFsbCh0aGlzLl9jb25maWcpXG5cbiAgICAvLyBQaGFzZSA0OiBidWlsZCBjb250ZXh0LCByZWdpc3RlciBjb21tYW5kcywgd2lyZSBldmVudCBoYW5kbGVyc1xuICAgIHRoaXMuX2N0eCA9IGJ1aWxkQ29udGV4dChcbiAgICAgIHRoaXMsXG4gICAgICB0aGlzLmNvbW1hbmRzLFxuICAgICAgdGhpcy5tb2R1bGVzLFxuICAgICAgeyBnZXQ6IGsgPT4gdGhpcy5fZ2V0U2lnbmFsKGspLCBzZXQ6IChrLCB2KSA9PiB0aGlzLl9zZXRTaWduYWwoaywgdikgfVxuICAgIClcblxuICAgIHJlZ2lzdGVyQ29tbWFuZHModGhpcy5fd2lyaW5nLCB0aGlzLmNvbW1hbmRzKVxuXG4gICAgdGhpcy5fY2xlYW51cHMucHVzaChcbiAgICAgIHdpcmVFdmVudEhhbmRsZXJzKHRoaXMuX3dpcmluZywgdGhpcywgKCkgPT4gdGhpcy5fY3R4ISlcbiAgICApXG5cbiAgICAvLyBQaGFzZSA1YTogSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgZm9yIG9uLWVudGVyIC8gb24tZXhpdFxuICAgIHRoaXMuX2NsZWFudXBzLnB1c2goXG4gICAgICB3aXJlSW50ZXJzZWN0aW9uT2JzZXJ2ZXIoXG4gICAgICAgIHRoaXMsXG4gICAgICAgIHRoaXMuX3dpcmluZy5saWZlY3ljbGUub25FbnRlcixcbiAgICAgICAgdGhpcy5fd2lyaW5nLmxpZmVjeWNsZS5vbkV4aXQsXG4gICAgICAgICgpID0+IHRoaXMuX2N0eCFcbiAgICAgIClcbiAgICApXG5cbiAgICAvLyBQaGFzZSA1Yjogc2lnbmFsIHdhdGNoZXJzXG4gICAgLy8gSWYgRGF0YXN0YXIgaXMgY29ubmVjdGVkIHVzZSBpdHMgcmVhY3RpdmUgZWZmZWN0KCkgc3lzdGVtO1xuICAgIC8vIG90aGVyd2lzZSB0aGUgbG9jYWwgX3NldFNpZ25hbCBwYXRoIGNhbGxzIG5vdGlmeVNpZ25hbFdhdGNoZXJzIGRpcmVjdGx5LlxuICAgIGlmICh0aGlzLl9kc0VmZmVjdCkge1xuICAgICAgZm9yIChjb25zdCB3YXRjaGVyIG9mIHRoaXMuX3dpcmluZy53YXRjaGVycykge1xuICAgICAgICB3aXJlU2lnbmFsV2F0Y2hlclZpYURhdGFzdGFyKHdhdGNoZXIsIHRoaXMuX2RzRWZmZWN0LCAoKSA9PiB0aGlzLl9jdHghKVxuICAgICAgfVxuICAgICAgY29uc29sZS5sb2coYFtMRVNdIHdpcmVkICR7dGhpcy5fd2lyaW5nLndhdGNoZXJzLmxlbmd0aH0gc2lnbmFsIHdhdGNoZXJzIHZpYSBEYXRhc3RhcmApXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKGBbTEVTXSB3aXJlZCAke3RoaXMuX3dpcmluZy53YXRjaGVycy5sZW5ndGh9IHNpZ25hbCB3YXRjaGVycyAobG9jYWwgZmFsbGJhY2spYClcbiAgICB9XG5cbiAgICAvLyBQaGFzZSA2OiBEYXRhc3RhciBicmlkZ2UgZnVsbCBhY3RpdmF0aW9uIFx1MjAxNCBjb21pbmcgbmV4dFxuXG4gICAgLy8gb24tbG9hZCBmaXJlcyBsYXN0LCBhZnRlciBldmVyeXRoaW5nIGlzIHdpcmVkXG4gICAgYXdhaXQgZmlyZU9uTG9hZCh0aGlzLl93aXJpbmcsICgpID0+IHRoaXMuX2N0eCEpXG5cbiAgICBjb25zb2xlLmxvZygnW0xFU10gcmVhZHk6JywgdGhpcy5pZCB8fCAnKG5vIGlkKScpXG4gIH1cblxuICBwcml2YXRlIF90ZWFyZG93bigpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPGxvY2FsLWV2ZW50LXNjcmlwdD4gZGlzY29ubmVjdGVkJywgdGhpcy5pZCB8fCAnKG5vIGlkKScpXG4gICAgZm9yIChjb25zdCBjbGVhbnVwIG9mIHRoaXMuX2NsZWFudXBzKSBjbGVhbnVwKClcbiAgICB0aGlzLl9jbGVhbnVwcyA9IFtdXG4gICAgdGhpcy5fY29uZmlnICAgPSBudWxsXG4gICAgdGhpcy5fd2lyaW5nICAgPSBudWxsXG4gICAgdGhpcy5fY3R4ICAgICAgPSBudWxsXG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgU2lnbmFsIHN0b3JlIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIC8qKlxuICAgKiBSZWFkcyBhbGwgZGF0YS1zaWduYWxzOktFWT1cIlZBTFVFXCIgYXR0cmlidXRlcyBvbiB0aGUgaG9zdCBlbGVtZW50IGFuZFxuICAgKiBwcmUtcG9wdWxhdGVzIHRoZSBsb2NhbCBfc2lnbmFscyBNYXAgd2l0aCB0aGVpciBpbml0aWFsIHZhbHVlcy5cbiAgICpcbiAgICogRGF0YXN0YXIgZXZhbHVhdGVzIHRoZXNlIGFzIEpTIGV4cHJlc3Npb25zIChlLmcuIFwiJ2hpZGRlbidcIiBcdTIxOTIgXCJoaWRkZW5cIixcbiAgICogXCIwXCIgXHUyMTkyIDAsIFwiW11cIiBcdTIxOTIgW10pLiBXZSBkbyB0aGUgc2FtZSB3aXRoIGEgc2ltcGxlIGV2YWwuXG4gICAqXG4gICAqIFRoaXMgcnVucyBzeW5jaHJvbm91c2x5IGJlZm9yZSBhbnkgYXN5bmMgb3BlcmF0aW9ucyBzbyB0aGF0IHRoZVxuICAgKiBJbnRlcnNlY3Rpb25PYnNlcnZlciBcdTIwMTQgd2hpY2ggbWF5IGZpcmUgYmVmb3JlIERhdGFzdGFyIGNvbm5lY3RzIFx1MjAxNCBzZWVzXG4gICAqIHRoZSBjb3JyZWN0IGluaXRpYWwgc2lnbmFsIHZhbHVlcyB3aGVuIGV2YWx1YXRpbmcgYHdoZW5gIGd1YXJkcy5cbiAgICovXG4gIHByaXZhdGUgX3NlZWRTaWduYWxzRnJvbUF0dHJpYnV0ZXMoKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBhdHRyIG9mIEFycmF5LmZyb20odGhpcy5hdHRyaWJ1dGVzKSkge1xuICAgICAgLy8gTWF0Y2ggZGF0YS1zaWduYWxzOktFWSBvciBkYXRhLXN0YXItc2lnbmFsczpLRVkgKGFsaWFzZWQgYnVuZGxlKVxuICAgICAgY29uc3QgbSA9IGF0dHIubmFtZS5tYXRjaCgvXmRhdGEtKD86c3Rhci0pP3NpZ25hbHM6KC4rKSQvKVxuICAgICAgaWYgKCFtKSBjb250aW51ZVxuICAgICAgY29uc3Qga2V5ID0gbVsxXSFcbiAgICAgICAgLnJlcGxhY2UoLy0oW2Etel0pL2csIChfLCBjaDogc3RyaW5nKSA9PiBjaC50b1VwcGVyQ2FzZSgpKSAvLyBrZWJhYi1jYXNlIFx1MjE5MiBjYW1lbENhc2VcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIEV2YWx1YXRlIHRoZSBhdHRyaWJ1dGUgdmFsdWUgYXMgYSBKUyBleHByZXNzaW9uIChzYW1lIGFzIERhdGFzdGFyIGRvZXMpXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1uZXctZnVuY1xuICAgICAgICBjb25zdCB2YWx1ZSA9IG5ldyBGdW5jdGlvbihgcmV0dXJuICgke2F0dHIudmFsdWV9KWApKClcbiAgICAgICAgdGhpcy5fc2lnbmFscy5zZXQoa2V5LCB2YWx1ZSlcbiAgICAgICAgY29uc29sZS5sb2coYFtMRVNdIHNlZWRlZCAkJHtrZXl9ID1gLCB2YWx1ZSlcbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBJZiBpdCBmYWlscywgc3RvcmUgdGhlIHJhdyBzdHJpbmcgdmFsdWVcbiAgICAgICAgdGhpcy5fc2lnbmFscy5zZXQoa2V5LCBhdHRyLnZhbHVlKVxuICAgICAgICBjb25zb2xlLmxvZyhgW0xFU10gc2VlZGVkICQke2tleX0gPSAocmF3KWAsIGF0dHIudmFsdWUpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfZ2V0U2lnbmFsKG5hbWU6IHN0cmluZyk6IHVua25vd24ge1xuICAgIC8vIFBoYXNlIDY6IHByZWZlciBEYXRhc3RhciBzaWduYWwgdHJlZSB3aGVuIGJyaWRnZSBpcyBjb25uZWN0ZWRcbiAgICBpZiAodGhpcy5fZHNTaWduYWwpIHtcbiAgICAgIHRyeSB7IHJldHVybiB0aGlzLl9kc1NpZ25hbChuYW1lKS52YWx1ZSB9IGNhdGNoIHsgLyogZmFsbCB0aHJvdWdoICovIH1cbiAgICB9XG4gICAgLy8gVHJ5IGV4YWN0IGNhc2UgZmlyc3QgKGUuZy4gRGF0YXN0YXItc2V0IHNpZ25hbHMgYXJlIGNhbWVsQ2FzZSkuXG4gICAgLy8gRmFsbCBiYWNrIHRvIGxvd2VyY2FzZSBiZWNhdXNlIEhUTUwgbm9ybWFsaXplcyBhdHRyaWJ1dGUgbmFtZXMgdG8gbG93ZXJjYXNlLFxuICAgIC8vIHNvIGRhdGEtc2lnbmFsczppbnRyb1N0YXRlIFx1MjE5MiBzZWVkZWQgYXMgXCJpbnRyb3N0YXRlXCIsIGJ1dCBndWFyZHMgcmVmZXJlbmNlIFwiJGludHJvU3RhdGVcIi5cbiAgICBpZiAodGhpcy5fc2lnbmFscy5oYXMobmFtZSkpIHJldHVybiB0aGlzLl9zaWduYWxzLmdldChuYW1lKVxuICAgIGlmICh0aGlzLl9zaWduYWxzLmhhcyhuYW1lLnRvTG93ZXJDYXNlKCkpKSByZXR1cm4gdGhpcy5fc2lnbmFscy5nZXQobmFtZS50b0xvd2VyQ2FzZSgpKVxuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxuXG4gIHByaXZhdGUgX3NldFNpZ25hbChuYW1lOiBzdHJpbmcsIHZhbHVlOiB1bmtub3duKTogdm9pZCB7XG4gICAgY29uc3QgcHJldiA9IHRoaXMuX3NpZ25hbHMuZ2V0KG5hbWUpXG4gICAgdGhpcy5fc2lnbmFscy5zZXQobmFtZSwgdmFsdWUpXG4gICAgY29uc29sZS5sb2coYFtMRVNdICQke25hbWV9ID1gLCB2YWx1ZSlcblxuICAgIC8vIFBoYXNlIDY6IHdyaXRlIHRocm91Z2ggdG8gRGF0YXN0YXIncyByZWFjdGl2ZSBncmFwaFxuICAgIGlmICh0aGlzLl9kc1NpZ25hbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3Qgc2lnID0gdGhpcy5fZHNTaWduYWw8dW5rbm93bj4obmFtZSwgdmFsdWUpXG4gICAgICAgIHNpZy52YWx1ZSA9IHZhbHVlXG4gICAgICB9IGNhdGNoIHsgLyogc2lnbmFsIG1heSBub3QgZXhpc3QgaW4gRGF0YXN0YXIgeWV0ICovIH1cbiAgICB9XG5cbiAgICAvLyBQaGFzZSA1Yjogbm90aWZ5IGxvY2FsIHNpZ25hbCB3YXRjaGVycyAoZmFsbGJhY2sgcGF0aCB3aGVuIERhdGFzdGFyIGFic2VudClcbiAgICBpZiAocHJldiAhPT0gdmFsdWUgJiYgdGhpcy5fd2lyaW5nICYmIHRoaXMuX2N0eCAmJiAhdGhpcy5fZHNFZmZlY3QpIHtcbiAgICAgIG5vdGlmeVNpZ25hbFdhdGNoZXJzKG5hbWUsIHRoaXMuX3dpcmluZy53YXRjaGVycywgKCkgPT4gdGhpcy5fY3R4ISlcbiAgICB9XG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgTW9kdWxlIGxvYWRpbmcgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBhc3luYyBfbG9hZE1vZHVsZXMoY29uZmlnOiBMRVNDb25maWcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoY29uZmlnLm1vZHVsZXMubGVuZ3RoID09PSAwKSByZXR1cm5cbiAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgIGNvbmZpZy5tb2R1bGVzLm1hcChkZWNsID0+XG4gICAgICAgIGxvYWRNb2R1bGUodGhpcy5tb2R1bGVzLCB7XG4gICAgICAgICAgLi4uKGRlY2wudHlwZSA/IHsgdHlwZTogZGVjbC50eXBlIH0gOiB7fSksXG4gICAgICAgICAgLi4uKGRlY2wuc3JjICA/IHsgc3JjOiAgZGVjbC5zcmMgIH0gOiB7fSksXG4gICAgICAgIH0pLmNhdGNoKGVyciA9PiBjb25zb2xlLndhcm4oJ1tMRVNdIE1vZHVsZSBsb2FkIGZhaWxlZDonLCBlcnIpKVxuICAgICAgKVxuICAgIClcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBQYXJzZSBhbGwgYm9kaWVzIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgX3BhcnNlQWxsKGNvbmZpZzogTEVTQ29uZmlnKTogUGFyc2VkV2lyaW5nIHtcbiAgICBsZXQgb2sgPSAwLCBmYWlsID0gMFxuXG4gICAgY29uc3QgdHJ5UGFyc2UgPSAoYm9keTogc3RyaW5nLCBsYWJlbDogc3RyaW5nKTogTEVTTm9kZSA9PiB7XG4gICAgICB0cnkgeyBvaysrOyByZXR1cm4gcGFyc2VMRVMoYm9keSkgfVxuICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgZmFpbCsrXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFtMRVNdIFBhcnNlIGVycm9yIGluICR7bGFiZWx9OmAsIGUpXG4gICAgICAgIHJldHVybiB7IHR5cGU6ICdleHByJywgcmF3OiAnJyB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3Qgd2lyaW5nOiBQYXJzZWRXaXJpbmcgPSB7XG4gICAgICBjb21tYW5kczogY29uZmlnLmNvbW1hbmRzLm1hcChkID0+ICh7XG4gICAgICAgIG5hbWU6IGQubmFtZSwgZ3VhcmQ6IGQuZ3VhcmQsIGFyZ3NSYXc6IGQuYXJnc1JhdyxcbiAgICAgICAgYm9keTogdHJ5UGFyc2UoZC5ib2R5LCBgY29tbWFuZCBcIiR7ZC5uYW1lfVwiYCksXG4gICAgICB9KSksXG4gICAgICBoYW5kbGVyczogY29uZmlnLm9uRXZlbnQubWFwKGQgPT4gKHtcbiAgICAgICAgZXZlbnQ6IGQubmFtZSxcbiAgICAgICAgYm9keTogdHJ5UGFyc2UoZC5ib2R5LCBgb24tZXZlbnQgXCIke2QubmFtZX1cImApLFxuICAgICAgfSkpLFxuICAgICAgd2F0Y2hlcnM6IGNvbmZpZy5vblNpZ25hbC5tYXAoZCA9PiAoe1xuICAgICAgICBzaWduYWw6IGQubmFtZSwgd2hlbjogZC53aGVuLFxuICAgICAgICBib2R5OiB0cnlQYXJzZShkLmJvZHksIGBvbi1zaWduYWwgXCIke2QubmFtZX1cImApLFxuICAgICAgfSkpLFxuICAgICAgbGlmZWN5Y2xlOiB7XG4gICAgICAgIG9uTG9hZDogIGNvbmZpZy5vbkxvYWQubWFwKGQgPT4gdHJ5UGFyc2UoZC5ib2R5LCAnb24tbG9hZCcpKSxcbiAgICAgICAgb25FbnRlcjogY29uZmlnLm9uRW50ZXIubWFwKGQgPT4gKHsgd2hlbjogZC53aGVuLCBib2R5OiB0cnlQYXJzZShkLmJvZHksICdvbi1lbnRlcicpIH0pKSxcbiAgICAgICAgb25FeGl0OiAgY29uZmlnLm9uRXhpdC5tYXAoZCA9PiB0cnlQYXJzZShkLmJvZHksICdvbi1leGl0JykpLFxuICAgICAgfSxcbiAgICB9XG5cbiAgICBjb25zdCB0b3RhbCA9IG9rICsgZmFpbFxuICAgIGNvbnNvbGUubG9nKGBbTEVTXSBwYXJzZXI6ICR7b2t9LyR7dG90YWx9IGJvZGllcyBwYXJzZWQgc3VjY2Vzc2Z1bGx5JHtmYWlsID4gMCA/IGAgKCR7ZmFpbH0gZXJyb3JzKWAgOiAnJ31gKVxuICAgIHJldHVybiB3aXJpbmdcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBEYXRhc3RhciBicmlkZ2UgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgY29ubmVjdERhdGFzdGFyKGZuczoge1xuICAgIGVmZmVjdDogKGZuOiAoKSA9PiB2b2lkKSA9PiB2b2lkXG4gICAgc2lnbmFsOiA8VD4obmFtZTogc3RyaW5nLCBpbml0PzogVCkgPT4geyB2YWx1ZTogVCB9XG4gIH0pOiB2b2lkIHtcbiAgICB0aGlzLl9kc0VmZmVjdCA9IGZucy5lZmZlY3RcbiAgICB0aGlzLl9kc1NpZ25hbCA9IGZucy5zaWduYWxcbiAgICBjb25zb2xlLmxvZygnW0xFU10gRGF0YXN0YXIgYnJpZGdlIGNvbm5lY3RlZCcsIHRoaXMuaWQpXG4gIH1cblxuICBkaXNjb25uZWN0RGF0YXN0YXIoKTogdm9pZCB7XG4gICAgdGhpcy5fZHNFZmZlY3QgPSB1bmRlZmluZWRcbiAgICB0aGlzLl9kc1NpZ25hbCA9IHVuZGVmaW5lZFxuICB9XG5cbiAgZ2V0IGRzRWZmZWN0KCkgeyByZXR1cm4gdGhpcy5fZHNFZmZlY3QgfVxuICBnZXQgZHNTaWduYWwoKSAgeyByZXR1cm4gdGhpcy5fZHNTaWduYWwgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBQdWJsaWMgQVBJIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIC8qKiBGaXJlIGEgbmFtZWQgbG9jYWwgZXZlbnQgaW50byB0aGlzIExFUyBpbnN0YW5jZSBmcm9tIG91dHNpZGUuICovXG4gIGZpcmUoZXZlbnQ6IHN0cmluZywgcGF5bG9hZDogdW5rbm93bltdID0gW10pOiB2b2lkIHtcbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KGV2ZW50LCB7XG4gICAgICBkZXRhaWw6IHsgcGF5bG9hZCB9LCBidWJibGVzOiBmYWxzZSwgY29tcG9zZWQ6IGZhbHNlLFxuICAgIH0pKVxuICB9XG5cbiAgLyoqIENhbGwgYSBjb21tYW5kIGJ5IG5hbWUgZnJvbSBvdXRzaWRlIChlLmcuIGJyb3dzZXIgY29uc29sZSwgdGVzdHMpLiAqL1xuICBhc3luYyBjYWxsKGNvbW1hbmQ6IHN0cmluZywgYXJnczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5fY3R4KSB7IGNvbnNvbGUud2FybignW0xFU10gbm90IGluaXRpYWxpemVkIHlldCcpOyByZXR1cm4gfVxuICAgIGNvbnN0IHsgcnVuQ29tbWFuZCB9ID0gYXdhaXQgaW1wb3J0KCdAcnVudGltZS9leGVjdXRvci5qcycpXG4gICAgYXdhaXQgcnVuQ29tbWFuZChjb21tYW5kLCBhcmdzLCB0aGlzLl9jdHgpXG4gIH1cblxuICAvKiogUmVhZCBhIHNpZ25hbCB2YWx1ZSBkaXJlY3RseSAoZm9yIGRlYnVnZ2luZykuICovXG4gIHNpZ25hbChuYW1lOiBzdHJpbmcpOiB1bmtub3duIHtcbiAgICByZXR1cm4gdGhpcy5fZ2V0U2lnbmFsKG5hbWUpXG4gIH1cbn1cblxuY3VzdG9tRWxlbWVudHMuZGVmaW5lKCdsb2NhbC1ldmVudC1zY3JpcHQnLCBMb2NhbEV2ZW50U2NyaXB0KVxuIiwgIi8qKlxuICogPGxvY2FsLWNvbW1hbmQ+IFx1MjAxNCBkZWZpbmVzIGEgbmFtZWQsIGNhbGxhYmxlIGNvbW1hbmQgd2l0aGluIGEgPGxvY2FsLWV2ZW50LXNjcmlwdD4uXG4gKlxuICogQXR0cmlidXRlczpcbiAqICAgbmFtZSAgICBSZXF1aXJlZC4gQ29tbWFuZCBuYW1lLCBjb2xvbi1uYW1lc3BhY2VkOiBcImZlZWQ6ZmV0Y2hcIlxuICogICBhcmdzICAgIE9wdGlvbmFsLiBUeXBlZCBhcmd1bWVudCBsaXN0OiBcIltmcm9tOnN0ciAgdG86c3RyXVwiXG4gKiAgIGd1YXJkICAgT3B0aW9uYWwuIEpTIGV4cHJlc3Npb24gXHUyMDE0IGZhbHN5ID0gc2lsZW50IG5vLW9wLCBubyByZXNjdWUvYWZ0ZXJ3YXJkc1xuICogICBkbyAgICAgIFJlcXVpcmVkLiBMRVMgYm9keSAoYmFja3RpY2stcXVvdGVkIGZvciBtdWx0aS1saW5lKVxuICpcbiAqIFRoaXMgZWxlbWVudCBpcyBwdXJlbHkgZGVjbGFyYXRpdmUgXHUyMDE0IGl0IGhvbGRzIGRhdGEuXG4gKiBUaGUgaG9zdCA8bG9jYWwtZXZlbnQtc2NyaXB0PiByZWFkcyBpdCBkdXJpbmcgUGhhc2UgMSBhbmQgcmVnaXN0ZXJzXG4gKiB0aGUgcGFyc2VkIENvbW1hbmREZWYgaW4gaXRzIENvbW1hbmRSZWdpc3RyeS5cbiAqXG4gKiBOb3RlOiA8Y29tbWFuZD4gd2FzIGEgZGVwcmVjYXRlZCBIVE1MNSBlbGVtZW50IFx1MjAxNCB3ZSB1c2UgPGxvY2FsLWNvbW1hbmQ+XG4gKiB0byBzYXRpc2Z5IHRoZSBjdXN0b20gZWxlbWVudCBoeXBoZW4gcmVxdWlyZW1lbnQgYW5kIGF2b2lkIHRoZSBjb2xsaXNpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBMb2NhbENvbW1hbmQgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBBdHRyaWJ1dGUgYWNjZXNzb3JzICh0eXBlZCwgdHJpbW1lZCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgZ2V0IGNvbW1hbmROYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCduYW1lJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgLyoqIFJhdyBhcmdzIHN0cmluZyBlLmcuIFwiW2Zyb206c3RyICB0bzpzdHJdXCIgXHUyMDE0IHBhcnNlZCBieSBQaGFzZSAyICovXG4gIGdldCBhcmdzUmF3KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdhcmdzJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgLyoqIEd1YXJkIGV4cHJlc3Npb24gc3RyaW5nIFx1MjAxNCBldmFsdWF0ZWQgYnkgcnVudGltZSBiZWZvcmUgZXhlY3V0aW9uICovXG4gIGdldCBndWFyZEV4cHIoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdndWFyZCcpPy50cmltKCkgPz8gbnVsbFxuICB9XG5cbiAgLyoqIFJhdyBMRVMgYm9keSBcdTIwMTQgbWF5IGJlIGJhY2t0aWNrLXdyYXBwZWQgZm9yIG11bHRpLWxpbmUgKi9cbiAgZ2V0IGRvQm9keSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnZG8nKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICAvLyBQaGFzZSAwOiB2ZXJpZnkgZWxlbWVudCBpcyByZWNvZ25pemVkLlxuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8bG9jYWwtY29tbWFuZD4gcmVnaXN0ZXJlZDonLCB0aGlzLmNvbW1hbmROYW1lIHx8ICcodW5uYW1lZCknKVxuICB9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnbG9jYWwtY29tbWFuZCcsIExvY2FsQ29tbWFuZClcbiIsICIvKipcbiAqIDxvbi1ldmVudD4gXHUyMDE0IHN1YnNjcmliZXMgdG8gYSBuYW1lZCBDdXN0b21FdmVudCBkaXNwYXRjaGVkIHdpdGhpbiB0aGUgTEVTIGhvc3QuXG4gKlxuICogQXR0cmlidXRlczpcbiAqICAgbmFtZSAgICBSZXF1aXJlZC4gRXZlbnQgbmFtZTogXCJmZWVkOmluaXRcIiwgXCJpdGVtOmRpc21pc3NlZFwiXG4gKiAgIGhhbmRsZSAgUmVxdWlyZWQuIExFUyBib2R5IFx1MjAxNCBzaW5nbGUtbGluZSAobm8gYmFja3RpY2tzKSBvciBtdWx0aS1saW5lIChiYWNrdGlja3MpXG4gKlxuICogUGhhc2UgNCB3aXJlcyBhIEN1c3RvbUV2ZW50IGxpc3RlbmVyIG9uIHRoZSBob3N0IGVsZW1lbnQuXG4gKiBFdmVudHMgZmlyZWQgYnkgYGVtaXRgIG5ldmVyIGJ1YmJsZTsgb25seSBoYW5kbGVycyB3aXRoaW4gdGhlIHNhbWVcbiAqIDxsb2NhbC1ldmVudC1zY3JpcHQ+IHNlZSB0aGVtLiBVc2UgYGJyb2FkY2FzdGAgdG8gY3Jvc3MgdGhlIGJvdW5kYXJ5LlxuICovXG5leHBvcnQgY2xhc3MgT25FdmVudCBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgZ2V0IGV2ZW50TmFtZSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnbmFtZScpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIC8qKiBSYXcgTEVTIGhhbmRsZSBib2R5ICovXG4gIGdldCBoYW5kbGVCb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdoYW5kbGUnKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPG9uLWV2ZW50PiByZWdpc3RlcmVkOicsIHRoaXMuZXZlbnROYW1lIHx8ICcodW5uYW1lZCknKVxuICB9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnb24tZXZlbnQnLCBPbkV2ZW50KVxuIiwgIi8qKlxuICogPG9uLXNpZ25hbD4gXHUyMDE0IHJlYWN0cyB3aGVuZXZlciBhIG5hbWVkIERhdGFzdGFyIHNpZ25hbCBjaGFuZ2VzIHZhbHVlLlxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIG5hbWUgICAgUmVxdWlyZWQuIFNpZ25hbCByZWZlcmVuY2U6IFwiJGZlZWRTdGF0ZVwiLCBcIiRmZWVkSXRlbXNcIlxuICogICB3aGVuICAgIE9wdGlvbmFsLiBHdWFyZCBleHByZXNzaW9uIFx1MjAxNCBvbmx5IGZpcmVzIGhhbmRsZSB3aGVuIHRydXRoeVxuICogICBoYW5kbGUgIFJlcXVpcmVkLiBMRVMgYm9keVxuICpcbiAqIFBoYXNlIDYgd2lyZXMgdGhpcyB0byBEYXRhc3RhcidzIGVmZmVjdCgpIHN5c3RlbS5cbiAqIFVudGlsIERhdGFzdGFyIGlzIGNvbm5lY3RlZCwgZmFsbHMgYmFjayB0byBwb2xsaW5nIChQaGFzZSA2IGRlY2lkZXMpLlxuICpcbiAqIFRoZSBgd2hlbmAgZ3VhcmQgaXMgcmUtZXZhbHVhdGVkIG9uIGV2ZXJ5IHNpZ25hbCBjaGFuZ2UuXG4gKiBHdWFyZCBmYWlsdXJlIGlzIG5vdCBhbiBlcnJvciBcdTIwMTQgdGhlIGhhbmRsZSBzaW1wbHkgZG9lcyBub3QgcnVuLlxuICovXG5leHBvcnQgY2xhc3MgT25TaWduYWwgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIC8qKiBTaWduYWwgbmFtZSBpbmNsdWRpbmcgJCBwcmVmaXg6IFwiJGZlZWRTdGF0ZVwiICovXG4gIGdldCBzaWduYWxOYW1lKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCduYW1lJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgLyoqIFNpZ25hbCBuYW1lIHdpdGhvdXQgJCBwcmVmaXgsIGZvciBEYXRhc3RhciBBUEkgY2FsbHMgKi9cbiAgZ2V0IHNpZ25hbEtleSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnNpZ25hbE5hbWUucmVwbGFjZSgvXlxcJC8sICcnKVxuICB9XG5cbiAgZ2V0IHdoZW5FeHByKCk6IHN0cmluZyB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnd2hlbicpPy50cmltKCkgPz8gbnVsbFxuICB9XG5cbiAgZ2V0IGhhbmRsZUJvZHkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ2hhbmRsZScpPy50cmltKCkgPz8gJydcbiAgfVxuXG4gIGNvbm5lY3RlZENhbGxiYWNrKCk6IHZvaWQge1xuICAgIGNvbnNvbGUubG9nKCdbTEVTXSA8b24tc2lnbmFsPiByZWdpc3RlcmVkOicsIHRoaXMuc2lnbmFsTmFtZSB8fCAnKHVubmFtZWQpJylcbiAgfVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ29uLXNpZ25hbCcsIE9uU2lnbmFsKVxuIiwgIi8qKlxuICogPG9uLWxvYWQ+IFx1MjAxNCBmaXJlcyBpdHMgYHJ1bmAgYm9keSBvbmNlIHdoZW4gdGhlIGhvc3QgY29ubmVjdHMgdG8gdGhlIERPTS5cbiAqXG4gKiBUaW1pbmc6IGlmIGRvY3VtZW50LnJlYWR5U3RhdGUgPT09ICdjb21wbGV0ZScsIGZpcmVzIGltbWVkaWF0ZWx5IGluXG4gKiBjb25uZWN0ZWRDYWxsYmFjayAodmlhIHF1ZXVlTWljcm90YXNrKS4gT3RoZXJ3aXNlIHdhaXRzIGZvciBET01Db250ZW50TG9hZGVkLlxuICpcbiAqIFJ1bGU6IGxpZmVjeWNsZSBob29rcyBhbHdheXMgZmlyZSBldmVudHMgKGBlbWl0YCksIG5ldmVyIGNhbGwgY29tbWFuZHMgZGlyZWN0bHkuXG4gKiBUaGlzIGtlZXBzIHRoZSBzeXN0ZW0gdHJhY2VhYmxlIFx1MjAxNCBldmVyeSBjb21tYW5kIGludm9jYXRpb24gaGFzIGFuIGV2ZW50IGluIGl0cyBoaXN0b3J5LlxuICpcbiAqIEF0dHJpYnV0ZXM6XG4gKiAgIHJ1biAgIFJlcXVpcmVkLiBTaW5nbGUtbGluZSBMRVMgYm9keSAodXN1YWxseSBqdXN0IGBlbWl0IGV2ZW50Om5hbWVgKVxuICovXG5leHBvcnQgY2xhc3MgT25Mb2FkIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBnZXQgcnVuQm9keSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxvbi1sb2FkPiByZWdpc3RlcmVkLCBydW46JywgdGhpcy5ydW5Cb2R5KVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4vKipcbiAqIDxvbi1lbnRlcj4gXHUyMDE0IGZpcmVzIHdoZW4gdGhlIGhvc3QgPGxvY2FsLWV2ZW50LXNjcmlwdD4gZW50ZXJzIHRoZSB2aWV3cG9ydC5cbiAqXG4gKiBVc2VzIGEgc2luZ2xlIEludGVyc2VjdGlvbk9ic2VydmVyIHNoYXJlZCBhY3Jvc3MgYWxsIDxvbi1lbnRlcj4vPG9uLWV4aXQ+XG4gKiBjaGlsZHJlbiBvZiB0aGUgc2FtZSBob3N0IChQaGFzZSA1IGNyZWF0ZXMgaXQgb24gdGhlIGhvc3QgZWxlbWVudCkuXG4gKlxuICogQXR0cmlidXRlczpcbiAqICAgd2hlbiAgT3B0aW9uYWwuIEd1YXJkIGV4cHJlc3Npb24gXHUyMDE0IG9ubHkgZmlyZXMgcnVuIHdoZW4gdHJ1dGh5LlxuICogICAgICAgICAgUGF0dGVybjogYHdoZW49XCIkZmVlZFN0YXRlID09ICdwYXVzZWQnXCJgXG4gKiAgIHJ1biAgIFJlcXVpcmVkLiBTaW5nbGUtbGluZSBMRVMgYm9keS5cbiAqL1xuZXhwb3J0IGNsYXNzIE9uRW50ZXIgZXh0ZW5kcyBIVE1MRWxlbWVudCB7XG4gIGdldCB3aGVuRXhwcigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3doZW4nKT8udHJpbSgpID8/IG51bGxcbiAgfVxuXG4gIGdldCBydW5Cb2R5KCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QXR0cmlidXRlKCdydW4nKT8udHJpbSgpID8/ICcnXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gPG9uLWVudGVyPiByZWdpc3RlcmVkLCB3aGVuOicsIHRoaXMud2hlbkV4cHIgPz8gJ2Fsd2F5cycpXG4gIH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogPG9uLWV4aXQ+IFx1MjAxNCBmaXJlcyB3aGVuIHRoZSBob3N0IDxsb2NhbC1ldmVudC1zY3JpcHQ+IGV4aXRzIHRoZSB2aWV3cG9ydC5cbiAqXG4gKiBObyBgd2hlbmAgZ3VhcmQgXHUyMDE0IGV4aXQgYWx3YXlzIGZpcmVzIHVuY29uZGl0aW9uYWxseS5cbiAqIChJZiB5b3UgbmVlZCBjb25kaXRpb25hbCBleGl0IGJlaGF2aW9yLCBwdXQgdGhlIGNvbmRpdGlvbiBpbiB0aGUgaGFuZGxlci4pXG4gKlxuICogQXR0cmlidXRlczpcbiAqICAgcnVuICAgUmVxdWlyZWQuIFNpbmdsZS1saW5lIExFUyBib2R5LlxuICovXG5leHBvcnQgY2xhc3MgT25FeGl0IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICBnZXQgcnVuQm9keSgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgncnVuJyk/LnRyaW0oKSA/PyAnJ1xuICB9XG5cbiAgY29ubmVjdGVkQ2FsbGJhY2soKTogdm9pZCB7XG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDxvbi1leGl0PiByZWdpc3RlcmVkLCBydW46JywgdGhpcy5ydW5Cb2R5KVxuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCBSZWdpc3RyYXRpb24gXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnb24tbG9hZCcsICBPbkxvYWQpXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ29uLWVudGVyJywgT25FbnRlcilcbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgnb24tZXhpdCcsICBPbkV4aXQpXG4iLCAiLyoqXG4gKiA8dXNlLW1vZHVsZT4gXHUyMDE0IGRlY2xhcmVzIGEgdm9jYWJ1bGFyeSBleHRlbnNpb24gYXZhaWxhYmxlIHRvIDxsb2NhbC1jb21tYW5kPiBib2RpZXMuXG4gKlxuICogTXVzdCBhcHBlYXIgYmVmb3JlIGFueSA8bG9jYWwtY29tbWFuZD4gaW4gdGhlIDxsb2NhbC1ldmVudC1zY3JpcHQ+LlxuICogVGhlIGhvc3QgcmVhZHMgPHVzZS1tb2R1bGU+IGNoaWxkcmVuIGZpcnN0IChQaGFzZSA4KSBhbmQgcmVnaXN0ZXJzXG4gKiB0aGVpciBwcmltaXRpdmVzIGludG8gaXRzIE1vZHVsZVJlZ2lzdHJ5IGJlZm9yZSBwYXJzaW5nIGNvbW1hbmQgYm9kaWVzLlxuICpcbiAqIEF0dHJpYnV0ZXMgKGluZGVwZW5kZW50LCBjb21iaW5hYmxlKTpcbiAqICAgdHlwZSAgIEJ1aWx0LWluIG1vZHVsZSBuYW1lOiBcImFuaW1hdGlvblwiXG4gKiAgIHNyYyAgICBVUkwvcGF0aCB0byBhIHVzZXJsYW5kIG1vZHVsZSBFUyBtb2R1bGU6ICBcIi4vc2Nyb2xsLWVmZmVjdHMuanNcIlxuICogICAgICAgICAgVGhlIG1vZHVsZSBtdXN0IGV4cG9ydCBhIGRlZmF1bHQgY29uZm9ybWluZyB0byBMRVNNb2R1bGU6XG4gKiAgICAgICAgICB7IG5hbWU6IHN0cmluZywgcHJpbWl0aXZlczogUmVjb3JkPHN0cmluZywgTEVTUHJpbWl0aXZlPiB9XG4gKlxuICogRXhhbXBsZXM6XG4gKiAgIDx1c2UtbW9kdWxlIHR5cGU9XCJhbmltYXRpb25cIj48L3VzZS1tb2R1bGU+XG4gKiAgIDx1c2UtbW9kdWxlIHNyYz1cIi4vc2Nyb2xsLWVmZmVjdHMuanNcIj48L3VzZS1tb2R1bGU+XG4gKiAgIDx1c2UtbW9kdWxlIHNyYz1cIi4vc3ByaW5nLXBoeXNpY3MuanNcIj48L3VzZS1tb2R1bGU+XG4gKlxuICogdHlwZT0gYW5kIHNyYz0gbWF5IGFwcGVhciB0b2dldGhlciBvbiBvbmUgZWxlbWVudCBpZiB0aGUgdXNlcmxhbmQgbW9kdWxlXG4gKiB3YW50cyB0byBkZWNsYXJlIGl0cyB0eXBlIGhpbnQgZm9yIHRvb2xpbmcgKG5vdCBjdXJyZW50bHkgcmVxdWlyZWQpLlxuICovXG5leHBvcnQgY2xhc3MgVXNlTW9kdWxlIGV4dGVuZHMgSFRNTEVsZW1lbnQge1xuICAvKiogQnVpbHQtaW4gbW9kdWxlIHR5cGUgZS5nLiBcImFuaW1hdGlvblwiICovXG4gIGdldCBtb2R1bGVUeXBlKCk6IHN0cmluZyB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgndHlwZScpPy50cmltKCkgPz8gbnVsbFxuICB9XG5cbiAgLyoqIFVzZXJsYW5kIG1vZHVsZSBVUkwgZS5nLiBcIi4vc2Nyb2xsLWVmZmVjdHMuanNcIiAqL1xuICBnZXQgbW9kdWxlU3JjKCk6IHN0cmluZyB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgnc3JjJyk/LnRyaW0oKSA/PyBudWxsXG4gIH1cblxuICBjb25uZWN0ZWRDYWxsYmFjaygpOiB2b2lkIHtcbiAgICBjb25zdCBkZXNjID0gdGhpcy5tb2R1bGVUeXBlXG4gICAgICA/IGB0eXBlPVwiJHt0aGlzLm1vZHVsZVR5cGV9XCJgXG4gICAgICA6IHRoaXMubW9kdWxlU3JjXG4gICAgICAgID8gYHNyYz1cIiR7dGhpcy5tb2R1bGVTcmN9XCJgXG4gICAgICAgIDogJyhubyB0eXBlIG9yIHNyYyknXG4gICAgY29uc29sZS5sb2coJ1tMRVNdIDx1c2UtbW9kdWxlPiBkZWNsYXJlZDonLCBkZXNjKVxuICB9XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgndXNlLW1vZHVsZScsIFVzZU1vZHVsZSlcbiIsICIvKipcbiAqIFBoYXNlIDY6IERhdGFzdGFyIGF0dHJpYnV0ZSBwbHVnaW5cbiAqXG4gKiBSZWdpc3RlcnMgPGxvY2FsLWV2ZW50LXNjcmlwdD4gYXMgYSBEYXRhc3RhciBhdHRyaWJ1dGUgcGx1Z2luIHNvIHRoYXQ6XG4gKlxuICogICAxLiBEYXRhc3RhcidzIGVmZmVjdCgpIGFuZCBzaWduYWwoKSBwcmltaXRpdmVzIGFyZSBoYW5kZWQgdG8gdGhlIGhvc3RcbiAqICAgICAgZWxlbWVudCwgZW5hYmxpbmcgcHJvcGVyIHJlYWN0aXZlIHNpZ25hbCB3YXRjaGluZyB2aWEgdGhlIGRlcGVuZGVuY3lcbiAqICAgICAgZ3JhcGggcmF0aGVyIHRoYW4gbWFudWFsIG5vdGlmaWNhdGlvbi5cbiAqXG4gKiAgIDIuIFNpZ25hbCB3cml0ZXMgZnJvbSBgc2V0ICR4IHRvIHlgIGluIExFUyBwcm9wYWdhdGUgaW50byBEYXRhc3RhcidzXG4gKiAgICAgIHJvb3Qgb2JqZWN0IHNvIGRhdGEtdGV4dCwgZGF0YS1zaG93LCBldGMuIHVwZGF0ZSByZWFjdGl2ZWx5LlxuICpcbiAqICAgMy4gJC1wcmVmaXhlZCBzaWduYWxzIGluIExFUyBleHByZXNzaW9ucyByZXNvbHZlIGZyb20gRGF0YXN0YXIncyByb290LFxuICogICAgICBnaXZpbmcgTEVTIGZ1bGwgcmVhZCBhY2Nlc3MgdG8gYWxsIERhdGFzdGFyIHN0YXRlLlxuICpcbiAqICAgNC4gU2lnbmFsIHdhdGNoZXJzIG9uLXNpZ25hbCBhcmUgcmUtd2lyZWQgdGhyb3VnaCBEYXRhc3RhcidzIGVmZmVjdCgpXG4gKiAgICAgIHN5c3RlbSBmb3IgcHJvcGVyIGJhdGNoaW5nIGFuZCBkZWR1cGxpY2F0aW9uLlxuICpcbiAqIExFUyB3b3JrcyB3aXRob3V0IERhdGFzdGFyIChzdGFuZGFsb25lIG1vZGUpLiBUaGUgYnJpZGdlIGlzIHB1cmVseSBhZGRpdGl2ZS5cbiAqL1xuXG5pbXBvcnQgdHlwZSB7IExvY2FsRXZlbnRTY3JpcHQgfSBmcm9tICdAZWxlbWVudHMvTG9jYWxFdmVudFNjcmlwdC5qcydcbmltcG9ydCB7IHdpcmVTaWduYWxXYXRjaGVyVmlhRGF0YXN0YXIgfSBmcm9tICdAcnVudGltZS9zaWduYWxzLmpzJ1xuXG5sZXQgYnJpZGdlUmVnaXN0ZXJlZCA9IGZhbHNlXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWdpc3RlckRhdGFzdGFyQnJpZGdlKCk6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoYnJpZGdlUmVnaXN0ZXJlZCkgcmV0dXJuXG5cbiAgdHJ5IHtcbiAgICBjb25zdCBkYXRhc3RhciA9IGF3YWl0IGltcG9ydCgnZGF0YXN0YXInKVxuICAgIGNvbnN0IHsgYXR0cmlidXRlIH0gPSBkYXRhc3RhclxuXG4gICAgLy8gXHUyNTAwXHUyNTAwIFJlZ2lzdGVyIGFzIGEgRGF0YXN0YXIgYXR0cmlidXRlIHBsdWdpbiBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICAvLyBNYXRjaGVzIGVsZW1lbnRzIHdpdGggYSBgZGF0YS1sb2NhbC1ldmVudC1zY3JpcHRgIGF0dHJpYnV0ZSBPUiAodmlhXG4gICAgLy8gbmFtZSBtYXRjaGluZykgdGhlIDxsb2NhbC1ldmVudC1zY3JpcHQ+IGN1c3RvbSBlbGVtZW50IGl0c2VsZiB3aGVuXG4gICAgLy8gRGF0YXN0YXIgc2NhbnMgdGhlIERPTS5cbiAgICAvL1xuICAgIC8vIFRoZSBuYW1lICdsb2NhbC1ldmVudC1zY3JpcHQnIGNhdXNlcyBEYXRhc3RhciB0byBhcHBseSB0aGlzIHBsdWdpblxuICAgIC8vIHRvIGFueSBlbGVtZW50IHdpdGggZGF0YS1sb2NhbC1ldmVudC1zY3JpcHQ9XCIuLi5cIiBpbiB0aGUgRE9NLlxuICAgIC8vIFdlIGFsc28gcGF0Y2ggPGxvY2FsLWV2ZW50LXNjcmlwdD4gZGlyZWN0bHkgaW4gdGhlIE11dGF0aW9uT2JzZXJ2ZXJcbiAgICAvLyBwYXRoIHZpYSB0aGUgaG9zdCBlbGVtZW50J3MgY29ubmVjdGVkQ2FsbGJhY2suXG4gICAgYXR0cmlidXRlKHtcbiAgICAgIG5hbWU6ICdsb2NhbC1ldmVudC1zY3JpcHQnLFxuICAgICAgcmVxdWlyZW1lbnQ6IHtcbiAgICAgICAga2V5OiAnZGVuaWVkJyxcbiAgICAgICAgdmFsdWU6ICdkZW5pZWQnLFxuICAgICAgfSxcbiAgICAgIGFwcGx5KHsgZWwsIGVmZmVjdCwgc2lnbmFsIH0pIHtcbiAgICAgICAgY29uc3QgaG9zdCA9IGVsIGFzIExvY2FsRXZlbnRTY3JpcHRcblxuICAgICAgICAvLyBQaGFzZSA2YTogaGFuZCBEYXRhc3RhcidzIHJlYWN0aXZlIHByaW1pdGl2ZXMgdG8gdGhlIGhvc3RcbiAgICAgICAgaG9zdC5jb25uZWN0RGF0YXN0YXIoeyBlZmZlY3QsIHNpZ25hbCB9KVxuXG4gICAgICAgIC8vIFBoYXNlIDZiOiBpZiB0aGUgaG9zdCBpcyBhbHJlYWR5IGluaXRpYWxpemVkICh3aXJpbmcgcmFuIGJlZm9yZVxuICAgICAgICAvLyBEYXRhc3RhciBhdHRyaWJ1dGUgcGx1Z2luIGZpcmVkKSwgcmUtd2lyZSBzaWduYWwgd2F0Y2hlcnMgdGhyb3VnaFxuICAgICAgICAvLyBEYXRhc3RhcidzIGVmZmVjdCgpIGZvciBwcm9wZXIgcmVhY3Rpdml0eVxuICAgICAgICBjb25zdCB3aXJpbmcgPSBob3N0LndpcmluZ1xuICAgICAgICBpZiAod2lyaW5nICYmIHdpcmluZy53YXRjaGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgZm9yIChjb25zdCB3YXRjaGVyIG9mIHdpcmluZy53YXRjaGVycykge1xuICAgICAgICAgICAgd2lyZVNpZ25hbFdhdGNoZXJWaWFEYXRhc3Rhcih3YXRjaGVyLCBlZmZlY3QsICgpID0+IGhvc3QuY29udGV4dCEpXG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnNvbGUubG9nKGBbTEVTOmRhdGFzdGFyXSByZS13aXJlZCAke3dpcmluZy53YXRjaGVycy5sZW5ndGh9IHNpZ25hbCB3YXRjaGVycyB2aWEgRGF0YXN0YXIgZWZmZWN0KClgKVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coJ1tMRVM6ZGF0YXN0YXJdIGF0dHJpYnV0ZSBwbHVnaW4gYXBwbGllZCB0bycsIGVsLmlkIHx8IGVsLnRhZ05hbWUpXG5cbiAgICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgICBob3N0LmRpc2Nvbm5lY3REYXRhc3RhcigpXG4gICAgICAgICAgY29uc29sZS5sb2coJ1tMRVM6ZGF0YXN0YXJdIGF0dHJpYnV0ZSBwbHVnaW4gY2xlYW5lZCB1cCcsIGVsLmlkIHx8IGVsLnRhZ05hbWUpXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfSlcblxuICAgIGJyaWRnZVJlZ2lzdGVyZWQgPSB0cnVlXG4gICAgY29uc29sZS5sb2coJ1tMRVM6ZGF0YXN0YXJdIGJyaWRnZSByZWdpc3RlcmVkJylcblxuICB9IGNhdGNoIHtcbiAgICBjb25zb2xlLmxvZygnW0xFU10gcnVubmluZyBpbiBzdGFuZGFsb25lIG1vZGUgKERhdGFzdGFyIG5vdCBhdmFpbGFibGUpJylcbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIFNpZ25hbCBpbnRlZ3JhdGlvbiB1dGlsaXRpZXNcbi8vIFVzZWQgYnkgZXhlY3V0b3IudHMgd2hlbiBEYXRhc3RhciBpcyBwcmVzZW50XG4vLyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuLyoqXG4gKiBSZWFkcyBhIHNpZ25hbCB2YWx1ZSBmcm9tIERhdGFzdGFyJ3Mgcm9vdCBvYmplY3QuXG4gKiBGYWxscyBiYWNrIHRvIHVuZGVmaW5lZCBpZiBEYXRhc3RhciBpcyBub3QgYXZhaWxhYmxlLlxuICpcbiAqIFRoaXMgaXMgY2FsbGVkIGJ5IHRoZSBMRVNDb250ZXh0LmdldFNpZ25hbCBmdW5jdGlvbiB3aGVuIHRoZSBEYXRhc3RhclxuICogYnJpZGdlIGlzIGNvbm5lY3RlZCwgZ2l2aW5nIExFUyBleHByZXNzaW9ucyBhY2Nlc3MgdG8gYWxsIERhdGFzdGFyIHNpZ25hbHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWFkRGF0YXN0YXJTaWduYWwoXG4gIG5hbWU6IHN0cmluZyxcbiAgZHNTaWduYWw6ICg8VD4obmFtZTogc3RyaW5nLCBpbml0PzogVCkgPT4geyB2YWx1ZTogVCB9KSB8IHVuZGVmaW5lZFxuKTogdW5rbm93biB7XG4gIGlmICghZHNTaWduYWwpIHJldHVybiB1bmRlZmluZWRcbiAgdHJ5IHtcbiAgICByZXR1cm4gZHNTaWduYWwobmFtZSkudmFsdWVcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG59XG5cbi8qKlxuICogV3JpdGVzIGEgdmFsdWUgdG8gRGF0YXN0YXIncyBzaWduYWwgdHJlZS5cbiAqIFRoaXMgdHJpZ2dlcnMgRGF0YXN0YXIncyByZWFjdGl2ZSBncmFwaCBcdTIwMTQgYW55IGRhdGEtdGV4dCwgZGF0YS1zaG93LFxuICogZGF0YS1jbGFzcyBhdHRyaWJ1dGVzIGJvdW5kIHRvIHRoaXMgc2lnbmFsIHdpbGwgdXBkYXRlIGF1dG9tYXRpY2FsbHkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZURhdGFzdGFyU2lnbmFsKFxuICBuYW1lOiBzdHJpbmcsXG4gIHZhbHVlOiB1bmtub3duLFxuICBkc1NpZ25hbDogKDxUPihuYW1lOiBzdHJpbmcsIGluaXQ/OiBUKSA9PiB7IHZhbHVlOiBUIH0pIHwgdW5kZWZpbmVkXG4pOiB2b2lkIHtcbiAgaWYgKCFkc1NpZ25hbCkgcmV0dXJuXG4gIHRyeSB7XG4gICAgY29uc3Qgc2lnID0gZHNTaWduYWw8dW5rbm93bj4obmFtZSwgdmFsdWUpXG4gICAgc2lnLnZhbHVlID0gdmFsdWVcbiAgfSBjYXRjaCB7XG4gICAgLy8gU2lnbmFsIG1heSBub3QgZXhpc3QgeWV0IFx1MjAxNCBpdCB3aWxsIGJlIGNyZWF0ZWQgYnkgZGF0YS1zaWduYWxzIG9uIHRoZSBob3N0XG4gIH1cbn1cbiIsICIvKipcbiAqIGxvY2FsLWV2ZW50LXNjcmlwdCBcdTIwMTQgbWFpbiBlbnRyeSBwb2ludFxuICpcbiAqIEltcG9ydCBvcmRlciBtYXR0ZXJzIGZvciBjdXN0b20gZWxlbWVudCByZWdpc3RyYXRpb246XG4gKiAgIDEuIEhvc3QgZWxlbWVudCBmaXJzdCAoTG9jYWxFdmVudFNjcmlwdClcbiAqICAgMi4gQ2hpbGQgZWxlbWVudHMgdGhhdCByZWZlcmVuY2UgaXRcbiAqICAgMy4gRGF0YXN0YXIgYnJpZGdlIGxhc3QgKG9wdGlvbmFsIFx1MjAxNCBmYWlscyBncmFjZWZ1bGx5IGlmIERhdGFzdGFyIGFic2VudClcbiAqXG4gKiBVc2FnZSB2aWEgaW1wb3J0bWFwICsgc2NyaXB0IHRhZzpcbiAqXG4gKiAgIDxzY3JpcHQgdHlwZT1cImltcG9ydG1hcFwiPlxuICogICAgIHtcbiAqICAgICAgIFwiaW1wb3J0c1wiOiB7XG4gKiAgICAgICAgIFwiZGF0YXN0YXJcIjogXCJodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvZ2gvc3RhcmZlZGVyYXRpb24vZGF0YXN0YXJAdjEuMC4wLVJDLjgvYnVuZGxlcy9kYXRhc3Rhci5qc1wiXG4gKiAgICAgICB9XG4gKiAgICAgfVxuICogICA8L3NjcmlwdD5cbiAqICAgPHNjcmlwdCB0eXBlPVwibW9kdWxlXCIgc3JjPVwiL2Rpc3QvbG9jYWwtZXZlbnQtc2NyaXB0LmpzXCI+PC9zY3JpcHQ+XG4gKlxuICogV2l0aG91dCB0aGUgaW1wb3J0bWFwIChvciB3aXRoIGRhdGFzdGFyIGFic2VudCksIExFUyBydW5zIGluIHN0YW5kYWxvbmUgbW9kZTpcbiAqIGFsbCBjdXN0b20gZWxlbWVudHMgd29yaywgRGF0YXN0YXIgc2lnbmFsIHdhdGNoaW5nIGFuZCBAYWN0aW9uIHBhc3N0aHJvdWdoXG4gKiBhcmUgdW5hdmFpbGFibGUuXG4gKi9cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEN1c3RvbSBlbGVtZW50cyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbi8vIEVhY2ggaW1wb3J0IHJlZ2lzdGVycyBpdHMgZWxlbWVudChzKSBhcyBhIHNpZGUgZWZmZWN0LlxuXG5leHBvcnQgeyBMb2NhbEV2ZW50U2NyaXB0IH0gZnJvbSAnQGVsZW1lbnRzL0xvY2FsRXZlbnRTY3JpcHQuanMnXG5leHBvcnQgeyBMb2NhbENvbW1hbmQgfSAgICAgZnJvbSAnQGVsZW1lbnRzL0xvY2FsQ29tbWFuZC5qcydcbmV4cG9ydCB7IE9uRXZlbnQgfSAgICAgICAgICBmcm9tICdAZWxlbWVudHMvT25FdmVudC5qcydcbmV4cG9ydCB7IE9uU2lnbmFsIH0gICAgICAgICBmcm9tICdAZWxlbWVudHMvT25TaWduYWwuanMnXG5leHBvcnQgeyBPbkxvYWQsIE9uRW50ZXIsIE9uRXhpdCB9IGZyb20gJ0BlbGVtZW50cy9MaWZlY3ljbGUuanMnXG5leHBvcnQgeyBVc2VNb2R1bGUgfSAgICAgICAgZnJvbSAnQGVsZW1lbnRzL1VzZU1vZHVsZS5qcydcblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFR5cGUgZXhwb3J0cyAoZm9yIFR5cGVTY3JpcHQgY29uc3VtZXJzKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbmV4cG9ydCB0eXBlIHsgTEVTTm9kZSB9ICAgICAgICAgICAgICAgICAgIGZyb20gJ0BwYXJzZXIvYXN0LmpzJ1xuZXhwb3J0IHR5cGUgeyBMRVNNb2R1bGUsIExFU1ByaW1pdGl2ZSB9ICAgZnJvbSAnQG1vZHVsZXMvdHlwZXMuanMnXG5leHBvcnQgdHlwZSB7IENvbW1hbmREZWYsIEFyZ0RlZiB9ICAgICAgICBmcm9tICdAcnVudGltZS9yZWdpc3RyeS5qcydcbmV4cG9ydCB7IExFU1Njb3BlIH0gICAgICAgICAgICAgICAgICAgICAgIGZyb20gJ0BydW50aW1lL3Njb3BlLmpzJ1xuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgRGF0YXN0YXIgYnJpZGdlIChvcHRpb25hbCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4vLyBEeW5hbWljIGltcG9ydCBzbyB0aGUgYnVuZGxlIHdvcmtzIHdpdGhvdXQgRGF0YXN0YXIgcHJlc2VudC5cbmltcG9ydCB7IHJlZ2lzdGVyRGF0YXN0YXJCcmlkZ2UgfSBmcm9tICdAZGF0YXN0YXIvcGx1Z2luLmpzJ1xucmVnaXN0ZXJEYXRhc3RhckJyaWRnZSgpXG5leHBvcnQgdHlwZSB7IExFU0NvbmZpZywgQ29tbWFuZERlY2wsIEV2ZW50SGFuZGxlckRlY2wsIFNpZ25hbFdhdGNoZXJEZWNsLFxuICAgICAgICAgICAgICBPbkxvYWREZWNsLCBPbkVudGVyRGVjbCwgT25FeGl0RGVjbCwgTW9kdWxlRGVjbCB9IGZyb20gJ0BwYXJzZXIvY29uZmlnLmpzJ1xuZXhwb3J0IHsgcmVhZENvbmZpZywgbG9nQ29uZmlnIH0gZnJvbSAnQHBhcnNlci9yZWFkZXIuanMnXG5leHBvcnQgeyBzdHJpcEJvZHkgfSAgICAgICAgICAgICBmcm9tICdAcGFyc2VyL3N0cmlwQm9keS5qcydcbmV4cG9ydCB7IHBhcnNlTEVTLCBMRVNQYXJzZXIsIExFU1BhcnNlRXJyb3IgfSBmcm9tICdAcGFyc2VyL2luZGV4LmpzJ1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7QUEwREEsU0FBUyxLQUFLLEdBQW1CO0FBQUUsU0FBTyxJQUFJLElBQUksS0FBSyxLQUFLLElBQUksSUFBSSxNQUFNO0FBQUk7QUFDOUUsU0FBUyxLQUFLLEdBQVcsR0FBVyxHQUFtQjtBQUFFLFNBQU8sSUFBSSxLQUFLLElBQUk7QUFBRztBQUNoRixTQUFTLE1BQU0sTUFBYyxHQUFXLEdBQW1CO0FBQ3pELFFBQU0sSUFBSSxPQUFPO0FBQ2pCLFFBQU0sSUFBSSxJQUFJLElBQUksSUFBSTtBQUN0QixRQUFNLElBQUksSUFBSSxJQUFJLElBQUk7QUFDdEIsVUFBUyxJQUFJLElBQUssQ0FBQyxJQUFJLE1BQU8sSUFBSSxJQUFLLENBQUMsSUFBSTtBQUM5QztBQUdPLFNBQVMsUUFBUSxHQUFXLEdBQW1CO0FBQ3BELFFBQU0sSUFBSSxLQUFLLE1BQU0sQ0FBQyxJQUFJO0FBQzFCLFFBQU0sSUFBSSxLQUFLLE1BQU0sQ0FBQyxJQUFJO0FBQzFCLE9BQUssS0FBSyxNQUFNLENBQUM7QUFDakIsT0FBSyxLQUFLLE1BQU0sQ0FBQztBQUNqQixRQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUM7QUFDN0IsUUFBTSxJQUFLLFlBQVksQ0FBQyxJQUFNO0FBQzlCLFFBQU0sS0FBSyxZQUFZLENBQUMsR0FBSyxLQUFLLFlBQVksSUFBSSxDQUFDO0FBQ25ELFFBQU0sSUFBSyxZQUFZLElBQUksQ0FBQyxJQUFLO0FBQ2pDLFFBQU0sS0FBSyxZQUFZLENBQUMsR0FBSyxLQUFLLFlBQVksSUFBSSxDQUFDO0FBQ25ELFNBQU87QUFBQSxJQUFLO0FBQUEsSUFDVixLQUFLLEdBQUcsTUFBTSxZQUFZLEVBQUUsR0FBSSxHQUFHLENBQUMsR0FBTyxNQUFNLFlBQVksRUFBRSxHQUFJLElBQUksR0FBRyxDQUFDLENBQUM7QUFBQSxJQUM1RSxLQUFLLEdBQUcsTUFBTSxZQUFZLEVBQUUsR0FBSSxHQUFHLElBQUksQ0FBQyxHQUFHLE1BQU0sWUFBWSxFQUFFLEdBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDO0FBQUEsRUFDbEY7QUFDRjtBQWNBLFNBQVMsYUFBYSxNQUFjLEdBQVcsR0FBbUI7QUFDaEUsUUFBTSxJQUFJLGFBQWEsT0FBTyxDQUFDO0FBQy9CLFNBQU8sRUFBRSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsSUFBSTtBQUMzQjtBQUdPLFNBQVMsU0FBUyxLQUFhLEtBQXFCO0FBQ3pELFFBQU0sS0FBTSxNQUFNLE9BQU87QUFDekIsUUFBTSxJQUFLLEtBQUssTUFBTSxNQUFNLENBQUM7QUFDN0IsUUFBTSxJQUFLLEtBQUssTUFBTSxNQUFNLENBQUM7QUFDN0IsUUFBTSxLQUFNLElBQUksS0FBSztBQUNyQixRQUFNLEtBQUssT0FBTyxJQUFJO0FBQ3RCLFFBQU0sS0FBSyxPQUFPLElBQUk7QUFFdEIsTUFBSSxJQUFZO0FBQ2hCLE1BQUksS0FBSyxJQUFJO0FBQUUsU0FBSztBQUFHLFNBQUs7QUFBQSxFQUFFLE9BQU87QUFBRSxTQUFLO0FBQUcsU0FBSztBQUFBLEVBQUU7QUFFdEQsUUFBTSxLQUFLLEtBQUssS0FBSyxJQUFNLEtBQUssS0FBSyxLQUFLO0FBQzFDLFFBQU0sS0FBSyxLQUFLLElBQUksSUFBRSxJQUFLLEtBQUssS0FBSyxJQUFJLElBQUU7QUFFM0MsUUFBTSxLQUFLLElBQUksS0FBSyxLQUFLLElBQUk7QUFDN0IsUUFBTSxNQUFNLGFBQWEsS0FBVSxhQUFhLEVBQUUsQ0FBRTtBQUNwRCxRQUFNLE1BQU0sYUFBYSxLQUFLLEtBQUssYUFBYSxLQUFLLEVBQUUsQ0FBRTtBQUN6RCxRQUFNLE1BQU0sYUFBYSxLQUFLLElBQUssYUFBYSxLQUFLLENBQUMsQ0FBRTtBQUV4RCxRQUFNLElBQUksQ0FBQyxJQUFZLEdBQVcsR0FBVyxPQUFlO0FBQzFELFVBQU0sSUFBSSxNQUFNLElBQUUsSUFBSSxJQUFFO0FBQ3hCLFdBQU8sSUFBSSxJQUFJLElBQUksSUFBRSxJQUFFLElBQUUsSUFBSSxhQUFhLElBQUksR0FBRyxDQUFDO0FBQUEsRUFDcEQ7QUFFQSxTQUFPLE1BQU0sRUFBRSxNQUFNLEtBQUcsS0FBSyxLQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsSUFDbEMsRUFBRSxNQUFNLEtBQUcsS0FBSyxLQUFHLElBQUksSUFBSSxJQUFJLEdBQUcsSUFDbEMsRUFBRSxNQUFNLEtBQUcsS0FBSyxLQUFHLElBQUksSUFBSSxJQUFJLEdBQUc7QUFDakQ7QUFNQSxTQUFTLGFBQWEsR0FBVyxXQUFtQixTQUF5QjtBQUczRSxRQUFNLFFBQVEsVUFBVSxLQUFLLEtBQUs7QUFDbEMsU0FDRSxNQUFNLEtBQUssSUFBSSxJQUFJLEtBQUssS0FBSyxZQUFZLElBQUksS0FBSyxJQUNsRCxNQUFNLEtBQUssSUFBSSxJQUFJLEtBQUssS0FBSyxZQUFZLE1BQU0sSUFBSSxRQUFRLEdBQUc7QUFFbEU7QUFzQkEsU0FBUyxPQUNQLE9BQ0EsR0FDQSxTQUNBLFdBQ0EsVUFDUTtBQUVSLFFBQU0sUUFBUTtBQUNkLFFBQU0sS0FBSyxJQUFJLFFBQVEsVUFBVTtBQUNqQyxRQUFNLEtBQUssVUFBVTtBQUVyQixVQUFRLE9BQU87QUFBQSxJQUNiLEtBQUs7QUFBVyxhQUFPLFNBQVMsSUFBSSxFQUFFO0FBQUEsSUFDdEMsS0FBSztBQUFXLGFBQU8sUUFBUSxJQUFJLEVBQUU7QUFBQSxJQUNyQyxLQUFLO0FBQVcsYUFBTyxhQUFhLEdBQUcsV0FBVyxPQUFPO0FBQUEsRUFDM0Q7QUFDRjtBQUVBLFNBQVMsZUFDUCxNQUNBLEdBQ1k7QUFDWixRQUFNLFNBQXFCLENBQUM7QUFFNUIsV0FBUyxJQUFJLEdBQUcsS0FBSyxHQUFHLEtBQUs7QUFDM0IsVUFBTSxJQUFXLElBQUk7QUFDckIsVUFBTSxXQUFXLEtBQUssUUFBUyxJQUFJLElBQUs7QUFDeEMsVUFBTSxNQUFXLEtBQUssWUFBWTtBQUVsQyxRQUFJLEtBQUssR0FBRyxLQUFLLEdBQUcsS0FBSztBQUV6QixRQUFJLEtBQUssS0FBSyxTQUFTLEdBQUcsR0FBRztBQUMzQixXQUFLLE9BQU8sS0FBSyxPQUFPLEdBQUcsR0FBRyxLQUFLLFdBQVcsQ0FBQyxJQUFJO0FBQUEsSUFDckQ7QUFDQSxRQUFJLEtBQUssS0FBSyxTQUFTLEdBQUcsR0FBRztBQUMzQixXQUFLLE9BQU8sS0FBSyxPQUFPLEdBQUcsR0FBRyxLQUFLLFdBQVcsQ0FBQyxJQUFJO0FBQUEsSUFDckQ7QUFDQSxRQUFJLEtBQUssU0FBUyxPQUFPLEtBQUssU0FBUyxPQUFPO0FBRTVDLFlBQU0sU0FBUyxNQUFNO0FBQ3JCLFdBQUssT0FBTyxLQUFLLE9BQU8sR0FBRyxHQUFHLEtBQUssV0FBVyxDQUFDLElBQUk7QUFBQSxJQUNyRDtBQUVBLFVBQU0sUUFBa0IsQ0FBQztBQUN6QixRQUFJLE9BQU8sS0FBSyxLQUFLLEtBQUssU0FBUyxHQUFHLEVBQUcsT0FBTSxLQUFLLGNBQWMsR0FBRyxRQUFRLENBQUMsQ0FBQyxLQUFLO0FBQ3BGLFFBQUksT0FBTyxLQUFLLEtBQUssS0FBSyxTQUFTLEdBQUcsRUFBRyxPQUFNLEtBQUssY0FBYyxHQUFHLFFBQVEsQ0FBQyxDQUFDLEtBQUs7QUFDcEYsUUFBSSxPQUFPLEtBQUssS0FBSyxTQUFTLE9BQU8sS0FBSyxTQUFTLE1BQU8sT0FBTSxLQUFLLFdBQVcsR0FBRyxRQUFRLENBQUMsQ0FBQyxNQUFNO0FBRW5HLFdBQU8sS0FBSztBQUFBLE1BQ1YsV0FBVyxNQUFNLFNBQVMsSUFBSSxNQUFNLEtBQUssR0FBRyxJQUFJO0FBQUEsTUFDaEQsUUFBUTtBQUFBLElBQ1YsQ0FBQztBQUFBLEVBQ0g7QUFHQSxTQUFPLENBQUMsRUFBRyxZQUFZLG1CQUFtQixLQUFLLElBQUk7QUFDbkQsU0FBTyxDQUFDLEVBQUcsWUFBWSxtQkFBbUIsS0FBSyxJQUFJO0FBRW5ELFNBQU87QUFDVDtBQUVBLFNBQVMsbUJBQW1CLE1BQXlCO0FBQ25ELFFBQU0sUUFBa0IsQ0FBQztBQUN6QixNQUFJLEtBQUssU0FBUyxHQUFHLEVBQXlCLE9BQU0sS0FBSyxpQkFBaUI7QUFDMUUsTUFBSSxLQUFLLFNBQVMsR0FBRyxFQUF5QixPQUFNLEtBQUssaUJBQWlCO0FBQzFFLE1BQUksU0FBUyxPQUFPLFNBQVMsTUFBaUIsT0FBTSxLQUFLLGVBQWU7QUFDeEUsU0FBTyxNQUFNLEtBQUssR0FBRyxLQUFLO0FBQzVCO0FBTUEsU0FBUyxRQUFRLEtBQWtDLFVBQTBCO0FBQzNFLE1BQUksUUFBUSxVQUFhLFFBQVEsS0FBTSxRQUFPO0FBQzlDLE1BQUksT0FBTyxRQUFRLFNBQVUsUUFBTztBQUNwQyxRQUFNLElBQUksT0FBTyxHQUFHLEVBQUUsTUFBTSw2QkFBNkI7QUFDekQsU0FBTyxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUUsSUFBSTtBQUNqQztBQUVBLFNBQVMsUUFBUSxLQUFrQyxVQUEwQjtBQUMzRSxNQUFJLFFBQVEsVUFBYSxRQUFRLEtBQU0sUUFBTztBQUM5QyxNQUFJLE9BQU8sUUFBUSxTQUFVLFFBQU87QUFDcEMsUUFBTSxJQUFJLE9BQU8sR0FBRyxFQUFFLE1BQU0scUJBQXFCO0FBQ2pELFNBQU8sSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFFLElBQUk7QUFDakM7QUFFQSxTQUFTLGtCQUFrQixNQUE2QztBQUN0RSxRQUFNLE9BQWEsQ0FBQyxLQUFJLEtBQUksS0FBSSxNQUFLLEtBQUssRUFBRSxTQUFTLE9BQU8sS0FBSyxNQUFNLEtBQUssR0FBRyxDQUFDLElBQzVELE9BQU8sS0FBSyxNQUFNLEtBQUssR0FBRyxJQUMxQjtBQUNwQixRQUFNLFFBQWEsQ0FBQyxXQUFVLFVBQVMsU0FBUyxFQUFFLFNBQVMsT0FBTyxLQUFLLE9BQU8sS0FBSyxTQUFTLENBQUMsSUFDekUsT0FBTyxLQUFLLE9BQU8sS0FBSyxTQUFTLElBQ2pDO0FBQ3BCLFFBQU0sWUFBWSxRQUFRLEtBQUssV0FBVyxHQUFrQyxDQUFDO0FBQzdFLFFBQU0sUUFBWSxPQUFPLEtBQUssT0FBTyxLQUFLLE1BQU0sTUFBTTtBQUN0RCxRQUFNLFlBQVksUUFBUSxLQUFLLFdBQVcsR0FBa0MsQ0FBQztBQUU3RSxTQUFPLEVBQUUsTUFBTSxPQUFPLFdBQVcsT0FBTyxVQUFVO0FBQ3BEO0FBelFBLElBaUNNLGFBdURBLGNBRUEsY0FHQSxJQUNBLElBeUxPO0FBdlJiO0FBQUE7QUFBQTtBQWlDQSxJQUFNLGVBQTJCLE1BQU07QUFFckMsWUFBTSxJQUFJLElBQUksV0FBVyxHQUFHO0FBQzVCLFlBQU0sT0FBTztBQUFBLFFBQ1g7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBTTtBQUFBLFFBQUU7QUFBQSxRQUM1RDtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBTTtBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFNO0FBQUEsUUFBRTtBQUFBLFFBQzVEO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFHO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFDNUQ7QUFBQSxRQUFHO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUMzRDtBQUFBLFFBQUc7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQzNEO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFDNUQ7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFNO0FBQUEsUUFBRTtBQUFBLFFBQUs7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUM1RDtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFNO0FBQUEsUUFBRztBQUFBLFFBQzVEO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFNO0FBQUEsUUFBRTtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFDNUQ7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUM1RDtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBTTtBQUFBLFFBQUc7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBTTtBQUFBLFFBQzlEO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBSztBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUs7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFDNUQ7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUMzRDtBQUFBLFFBQUk7QUFBQSxRQUFHO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBRztBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQzVEO0FBQUEsUUFBSztBQUFBLFFBQUc7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEsUUFBSTtBQUFBLFFBQUc7QUFBQSxRQUFNO0FBQUEsUUFBRTtBQUFBLFFBQUk7QUFBQSxRQUFJO0FBQUEsUUFBSTtBQUFBLFFBQUk7QUFBQSxRQUFLO0FBQUEs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YUFBYSxLQUFLLEdBQUcsS0FBSyxLQUFLO0FBQUEsRUFDN0M7QUFBQSxFQUVBLG9CQUEwQjtBQUN4QixZQUFRLElBQUksb0NBQW9DLEtBQUssT0FBTztBQUFBLEVBQzlEO0FBQ0Y7QUFJQSxlQUFlLE9BQU8sV0FBWSxNQUFNO0FBQ3hDLGVBQWUsT0FBTyxZQUFZLE9BQU87QUFDekMsZUFBZSxPQUFPLFdBQVksTUFBTTs7O0FDckRqQyxJQUFNLFlBQU4sY0FBd0IsWUFBWTtBQUFBO0FBQUEsRUFFekMsSUFBSSxhQUE0QjtBQUM5QixXQUFPLEtBQUssYUFBYSxNQUFNLEdBQUcsS0FBSyxLQUFLO0FBQUEsRUFDOUM7QUFBQTtBQUFBLEVBR0EsSUFBSSxZQUEyQjtBQUM3QixXQUFPLEtBQUssYUFBYSxLQUFLLEdBQUcsS0FBSyxLQUFLO0FBQUEsRUFDN0M7QUFBQSxFQUVBLG9CQUEwQjtBQUN4QixVQUFNLE9BQU8sS0FBSyxhQUNkLFNBQVMsS0FBSyxVQUFVLE1BQ3hCLEtBQUssWUFDSCxRQUFRLEtBQUssU0FBUyxNQUN0QjtBQUNOLFlBQVEsSUFBSSxnQ0FBZ0MsSUFBSTtBQUFBLEVBQ2xEO0FBQ0Y7QUFFQSxlQUFlLE9BQU8sY0FBYyxTQUFTOzs7QUNsQjdDLElBQUksbUJBQW1CO0FBRXZCLGVBQXNCLHlCQUF3QztBQUM1RCxNQUFJLGlCQUFrQjtBQUV0QixNQUFJO0FBQ0YsVUFBTSxXQUFXLE1BQU0sT0FBTyxVQUFVO0FBQ3hDLFVBQU0sRUFBRSxVQUFVLElBQUk7QUFXdEIsY0FBVTtBQUFBLE1BQ1IsTUFBTTtBQUFBLE1BQ04sYUFBYTtBQUFBLFFBQ1gsS0FBSztBQUFBLFFBQ0wsT0FBTztBQUFBLE1BQ1Q7QUFBQSxNQUNBLE1BQU0sRUFBRSxJQUFJLFFBQVEsT0FBTyxHQUFHO0FBQzVCLGNBQU0sT0FBTztBQUdiLGFBQUssZ0JBQWdCLEVBQUUsUUFBUSxPQUFPLENBQUM7QUFLdkMsY0FBTSxTQUFTLEtBQUs7QUFDcEIsWUFBSSxVQUFVLE9BQU8sU0FBUyxTQUFTLEdBQUc7QUFDeEMscUJBQVcsV0FBVyxPQUFPLFVBQVU7QUFDckMseUNBQTZCLFNBQVMsUUFBUSxNQUFNLEtBQUssT0FBUTtBQUFBLFVBQ25FO0FBQ0Esa0JBQVEsSUFBSSwyQkFBMkIsT0FBTyxTQUFTLE1BQU0sd0NBQXdDO0FBQUEsUUFDdkc7QUFFQSxnQkFBUSxJQUFJLDhDQUE4QyxHQUFHLE1BQU0sR0FBRyxPQUFPO0FBRTdFLGVBQU8sTUFBTTtBQUNYLGVBQUssbUJBQW1CO0FBQ3hCLGtCQUFRLElBQUksOENBQThDLEdBQUcsTUFBTSxHQUFHLE9BQU87QUFBQSxRQUMvRTtBQUFBLE1BQ0Y7QUFBQSxJQUNGLENBQUM7QUFFRCx1QkFBbUI7QUFDbkIsWUFBUSxJQUFJLGtDQUFrQztBQUFBLEVBRWhELFFBQVE7QUFDTixZQUFRLElBQUksMkRBQTJEO0FBQUEsRUFDekU7QUFDRjs7O0FDckNBLHVCQUF1QjsiLAogICJuYW1lcyI6IFsicGFyc2VNcyIsICJydW5Db21tYW5kIl0KfQo=
