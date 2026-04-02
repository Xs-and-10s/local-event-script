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
      console.warn('[LES] <use-module> has neither type= nor src= \u2014 ignored.', el)
      return
    }

    config.modules.push({ type, src, element: el })
  },

  'local-command'(el, config) {
    const name = el.getAttribute('name')?.trim() ?? ''
    const body = el.getAttribute('do')?.trim()   ?? ''

    if (!name) {
      console.warn('[LES] <local-command> missing required name= attribute \u2014 ignored.', el)
      return
    }
    if (!body) {
      console.warn(`[LES] <local-command name="${name}"> missing required do= attribute \u2014 ignored.`, el)
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
      console.warn('[LES] <on-event> missing required name= attribute \u2014 ignored.', el)
      return
    }
    if (!body) {
      console.warn(`[LES] <on-event name="${name}"> missing required handle= attribute \u2014 ignored.`, el)
      return
    }

    config.onEvent.push({ name, body: stripBody(body), element: el })
  },

  'on-signal'(el, config) {
    const name = el.getAttribute('name')?.trim()   ?? ''
    const body = el.getAttribute('handle')?.trim() ?? ''

    if (!name) {
      console.warn('[LES] <on-signal> missing required name= attribute \u2014 ignored.', el)
      return
    }
    if (!body) {
      console.warn(`[LES] <on-signal name="${name}"> missing required handle= attribute \u2014 ignored.`, el)
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
      console.warn('[LES] <on-load> missing required run= attribute \u2014 ignored.', el)
      return
    }
    config.onLoad.push({ body: stripBody(body), element: el })
  },

  'on-enter'(el, config) {
    const body = el.getAttribute('run')?.trim() ?? ''
    if (!body) {
      console.warn('[LES] <on-enter> missing required run= attribute \u2014 ignored.', el)
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
      console.warn('[LES] <on-exit> missing required run= attribute \u2014 ignored.', el)
      return
    }
    config.onExit.push({ body: stripBody(body), element: el })
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Elements that are valid LES children but handled outside readConfig.
//
// These are silently accepted \u2014 no "unknown element" warning \u2014 because their
// semantics are managed by other parts of the runtime:
//
//   local-event-script  Phase 2: child LES controllers in the nested tree.
//                       Children register themselves with their parent in
//                       connectedCallback; readConfig does not need to read them.
//                       Convention: place child <local-event-script> elements
//                       AFTER all other config children (<local-command>,
//                       <on-event>, etc.) so the parent's config is fully read
//                       before child elements are encountered.
//
//   local-bridge        Phase 2: bridge declarations for the `forward` primitive.
//                       Registered by the bridge module at init time.
// ─────────────────────────────────────────────────────────────────────────────
const DEFERRED_CHILDREN = new Set([
  'local-event-script',
  'local-bridge',
])

// The canonical list of config-bearing LES child elements.
// Shown in the unknown-child warning so authors know exactly what's valid.
const VALID_CONFIG_CHILDREN = [
  '<use-module>',
  '<local-command>',
  '<on-event>',
  '<on-signal>',
  '<on-load>',
  '<on-enter>',
  '<on-exit>',
]

// ─────────────────────────────────────────────────────────────────────────────
// readConfig \u2014 the public entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Walks the direct children of a <local-event-script> element and
 * produces a structured LESConfig.
 *
 * Only direct children are read \u2014 nested elements inside a <local-command>
 * body are not children of the host and are never visited here.
 *
 * Three categories of child:
 *   - Known config elements (HANDLERS): read and pushed into config.
 *   - Deferred elements (DEFERRED_CHILDREN): silently accepted; handled
 *     elsewhere in the runtime (tree wiring, bridge module, etc.).
 *   - Unknown elements: logged as a warning with the list of valid choices.
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

    // Known config element \u2014 read and push into config
    const handler = HANDLERS[tag]
    if (handler) {
      handler(child, config)
      continue
    }

    // Deferred element \u2014 silently accepted, handled elsewhere in the runtime
    if (DEFERRED_CHILDREN.has(tag)) continue

    // Unknown element \u2014 collect and warn if hyphenated (likely a typo)
    config.unknown.push(child)
    if (tag.includes('-')) {
      console.warn(
        `[LES] Unknown child element <${tag}> inside <local-event-script id="${config.id}"> \u2014 ignored.\n` +
        `  Config children: ${VALID_CONFIG_CHILDREN.join(', ')}\n` +
        `  Also valid (deferred): <local-event-script>, <local-bridge>`,
        child
      )
    }
  }

  return config
}

// ─────────────────────────────────────────────────────────────────────────────
// logConfig \u2014 structured checkpoint log
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
