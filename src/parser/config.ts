// ─────────────────────────────────────────────────────────────────────────────
// LESConfig — structured representation of a <local-event-script> element.
//
// The DOM reader (reader.ts) produces this from raw HTML.
// The parser (Phase 2) consumes this, parsing body strings into AST nodes.
// Keeping this as a plain data object means the parser is fully decoupled
// from the DOM — it can be tested with plain strings.
// ─────────────────────────────────────────────────────────────────────────────

/** A <use-module> declaration */
export interface ModuleDecl {
  /** Built-in module type e.g. "animation" — from type= attribute */
  type: string | null
  /** Userland module URL e.g. "./scroll-effects.js" — from src= attribute */
  src: string | null
  /** The originating element (for error reporting) */
  element: Element
}

/** A <local-command> definition — body still raw, not yet parsed */
export interface CommandDecl {
  name: string
  /** Raw args string e.g. "[from:str  to:str  attempt:int=0]" */
  argsRaw: string
  /** Guard JS expression string — null means no guard */
  guard: string | null
  /** Raw LES body string — backtick wrapper already stripped */
  body: string
  element: Element
}

/** An <on-event> handler declaration */
export interface EventHandlerDecl {
  name: string
  /** Raw LES handle body — backtick wrapper already stripped */
  body: string
  element: Element
}

/** An <on-signal> watcher declaration */
export interface SignalWatcherDecl {
  /** Signal name with $ prefix e.g. "$feedState" */
  name: string
  /** Optional guard JS expression — null means always fires */
  when: string | null
  /** Raw LES handle body — backtick wrapper already stripped */
  body: string
  element: Element
}

/** An <on-load> lifecycle hook */
export interface OnLoadDecl {
  /** Raw LES run body (single-line, no backticks expected) */
  body: string
  element: Element
}

/** An <on-enter> lifecycle hook */
export interface OnEnterDecl {
  /** Optional guard JS expression */
  when: string | null
  /** Raw LES run body */
  body: string
  element: Element
}

/** An <on-exit> lifecycle hook */
export interface OnExitDecl {
  /** Raw LES run body */
  body: string
  element: Element
}

/**
 * The complete structured representation of one <local-event-script>.
 * Produced by readConfig(), consumed by the Phase 2 parser.
 */
export interface LESConfig {
  /** The host element id (for logging/debugging) */
  id: string
  modules:      ModuleDecl[]
  commands:     CommandDecl[]
  onEvent:      EventHandlerDecl[]
  onSignal:     SignalWatcherDecl[]
  onLoad:       OnLoadDecl[]
  onEnter:      OnEnterDecl[]
  onExit:       OnExitDecl[]
  /** Any unrecognized child elements — logged as warnings, ignored */
  unknown:      Element[]
}
