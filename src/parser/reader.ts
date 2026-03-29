import type {
  LESConfig,
  ModuleDecl,
  CommandDecl,
  EventHandlerDecl,
  SignalWatcherDecl,
  OnLoadDecl,
  OnEnterDecl,
  OnExitDecl,
} from './config.js'
import { stripBody } from './stripBody.js'

// ─────────────────────────────────────────────────────────────────────────────
// Tag name → handler map
// Each handler reads attributes from a child element and pushes a typed decl
// into the config being built. Unknown tags are collected for warning.
// ─────────────────────────────────────────────────────────────────────────────

type Handler = (el: Element, config: LESConfig) => void

const HANDLERS: Record<string, Handler> = {

  'use-module'(el, config) {
    const type = el.getAttribute('type')?.trim() ?? null
    const src  = el.getAttribute('src')?.trim()  ?? null

    if (!type && !src) {
      console.warn('[LES] <use-module> has neither type= nor src= — ignored.', el)
      return
    }

    config.modules.push({ type, src, element: el })
  },

  'local-command'(el, config) {
    const name = el.getAttribute('name')?.trim() ?? ''
    const body = el.getAttribute('do')?.trim()   ?? ''

    if (!name) {
      console.warn('[LES] <local-command> missing required name= attribute — ignored.', el)
      return
    }
    if (!body) {
      console.warn(`[LES] <local-command name="${name}"> missing required do= attribute — ignored.`, el)
      return
    }

    config.commands.push({
      name,
      argsRaw: el.getAttribute('args')?.trim()  ?? '',
      guard:   el.getAttribute('guard')?.trim() ?? null,
      body:    stripBody(body),
      element: el,
    })
  },

  'on-event'(el, config) {
    const name = el.getAttribute('name')?.trim()   ?? ''
    const body = el.getAttribute('handle')?.trim() ?? ''

    if (!name) {
      console.warn('[LES] <on-event> missing required name= attribute — ignored.', el)
      return
    }
    if (!body) {
      console.warn(`[LES] <on-event name="${name}"> missing required handle= attribute — ignored.`, el)
      return
    }

    config.onEvent.push({ name, body: stripBody(body), element: el })
  },

  'on-signal'(el, config) {
    const name = el.getAttribute('name')?.trim()   ?? ''
    const body = el.getAttribute('handle')?.trim() ?? ''

    if (!name) {
      console.warn('[LES] <on-signal> missing required name= attribute — ignored.', el)
      return
    }
    if (!body) {
      console.warn(`[LES] <on-signal name="${name}"> missing required handle= attribute — ignored.`, el)
      return
    }

    config.onSignal.push({
      name,
      when:    el.getAttribute('when')?.trim() ?? null,
      body:    stripBody(body),
      element: el,
    })
  },

  'on-load'(el, config) {
    const body = el.getAttribute('run')?.trim() ?? ''
    if (!body) {
      console.warn('[LES] <on-load> missing required run= attribute — ignored.', el)
      return
    }
    config.onLoad.push({ body: stripBody(body), element: el })
  },

  'on-enter'(el, config) {
    const body = el.getAttribute('run')?.trim() ?? ''
    if (!body) {
      console.warn('[LES] <on-enter> missing required run= attribute — ignored.', el)
      return
    }
    config.onEnter.push({
      when:    el.getAttribute('when')?.trim() ?? null,
      body:    stripBody(body),
      element: el,
    })
  },

  'on-exit'(el, config) {
    const body = el.getAttribute('run')?.trim() ?? ''
    if (!body) {
      console.warn('[LES] <on-exit> missing required run= attribute — ignored.', el)
      return
    }
    config.onExit.push({ body: stripBody(body), element: el })
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// readConfig — the public entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Walks the direct children of a <local-event-script> element and
 * produces a structured LESConfig.
 *
 * Only direct children are read — nested elements inside a <local-command>
 * body are not children of the host and are never visited here.
 *
 * Unknown child elements emit a console.warn and are collected in config.unknown
 * so tooling (e.g. a future LES language server) can report them.
 */
export function readConfig(host: Element): LESConfig {
  const config: LESConfig = {
    id:       host.id || '(no id)',
    modules:  [],
    commands: [],
    onEvent:  [],
    onSignal: [],
    onLoad:   [],
    onEnter:  [],
    onExit:   [],
    unknown:  [],
  }

  for (const child of Array.from(host.children)) {
    const tag = child.tagName.toLowerCase()
    const handler = HANDLERS[tag]

    if (handler) {
      handler(child, config)
    } else {
      config.unknown.push(child)
      // Only warn for hyphenated custom element names — those are likely
      // mis-typed LES keywords. Plain HTML elements (div, p, section, etc.)
      // are valid content children and pass through silently.
      if (tag.includes('-')) {
        console.warn(
          `[LES] Unknown child element <${tag}> inside <local-event-script id="${config.id}"> — ignored. Did you mean a LES element?`,
          child
        )
      }
    }
  }

  return config
}

// ─────────────────────────────────────────────────────────────────────────────
// logConfig — structured checkpoint log
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Logs a summary of a parsed LESConfig.
 * Phase 1 checkpoint: you should see this in the browser console/debug log
 * with all commands, events, and signal watchers correctly listed.
 */
export function logConfig(config: LESConfig): void {
  const id = config.id
  console.log(`[LES] config read for #${id}`)
  console.log(`[LES]   modules:   ${config.modules.length}`, config.modules.map(m => m.type ?? m.src))
  console.log(`[LES]   commands:  ${config.commands.length}`, config.commands.map(c => c.name))
  console.log(`[LES]   on-event:  ${config.onEvent.length}`, config.onEvent.map(e => e.name))
  console.log(`[LES]   on-signal: ${config.onSignal.length}`, config.onSignal.map(s => s.name))
  console.log(`[LES]   on-load:   ${config.onLoad.length}`)
  console.log(`[LES]   on-enter:  ${config.onEnter.length}`, config.onEnter.map(e => e.when ?? 'always'))
  console.log(`[LES]   on-exit:   ${config.onExit.length}`)

  const unknownCustom = config.unknown.filter(e => e.tagName.toLowerCase().includes('-'))
  if (unknownCustom.length > 0) {
    console.warn(`[LES]   unknown custom children: ${unknownCustom.length}`, unknownCustom.map(e => e.tagName.toLowerCase()))
  }

  // Log a sampling of body strings to verify stripBody worked correctly
  if (config.commands.length > 0) {
    const first = config.commands[0]
    if (first) {
      console.log(`[LES]   first command body preview ("${first.name}"):`)
      const preview = first.body.split('\n').slice(0, 4).join('\n  ')
      console.log(`[LES]   | ${preview}`)
    }
  }
}
