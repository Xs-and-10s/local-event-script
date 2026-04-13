// @vitest-environment node
/**
 * CommandRegistry — unit tests.
 * Tests behaviour only: registration, lookup, inheritance, warnings.
 * No DOM required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CommandRegistry } from '@runtime/registry.js'
import { mockDef } from '../helpers.js'

describe('CommandRegistry — local operations', () => {
  let reg: CommandRegistry

  beforeEach(() => { reg = new CommandRegistry() })

  it('registers and retrieves a command by name', () => {
    reg.register(mockDef('greet'))
    expect(reg.get('greet')).toBeDefined()
    expect(reg.get('greet')!.name).toBe('greet')
  })

  it('returns undefined for unknown commands', () => {
    expect(reg.get('ghost')).toBeUndefined()
  })

  it('has() is true for registered names', () => {
    reg.register(mockDef('cmd'))
    expect(reg.has('cmd')).toBe(true)
  })

  it('has() is false for unregistered names', () => {
    expect(reg.has('cmd')).toBe(false)
  })

  it('names() lists all registered command names', () => {
    reg.register(mockDef('a'))
    reg.register(mockDef('b'))
    expect(reg.names()).toEqual(expect.arrayContaining(['a', 'b']))
    expect(reg.names()).toHaveLength(2)
  })

  it('emits a console.warn on duplicate registration', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    reg.register(mockDef('cmd'))
    reg.register(mockDef('cmd'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Duplicate'), expect.anything())
    warn.mockRestore()
  })

  it('duplicate registration replaces the definition', () => {
    reg.register(mockDef('cmd', 'first'))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    reg.register(mockDef('cmd', 'second'))
    expect(reg.get('cmd')!.body.raw).toBe('second')
    vi.restoreAllMocks()
  })
})

describe('CommandRegistry — inheritance via setParent()', () => {
  let parent: CommandRegistry
  let child:  CommandRegistry

  beforeEach(() => {
    parent = new CommandRegistry()
    child  = new CommandRegistry()
    child.setParent(parent)
  })

  it('get() resolves a command defined in the parent', () => {
    parent.register(mockDef('shared'))
    expect(child.get('shared')).toBeDefined()
    expect(child.get('shared')!.name).toBe('shared')
  })

  it('local command shadows a same-named parent command', () => {
    parent.register(mockDef('cmd', 'parent-body'))
    child.register(mockDef('cmd', 'child-body'))
    expect(child.get('cmd')!.body.raw).toBe('child-body')
  })

  it('has() is strictly local — does NOT see parent commands', () => {
    parent.register(mockDef('shared'))
    expect(child.has('shared')).toBe(false)
  })

  it('resolves() returns true for commands anywhere in the chain', () => {
    parent.register(mockDef('shared'))
    expect(child.resolves('shared')).toBe(true)
  })

  it('resolves() returns false when command is absent from the entire chain', () => {
    expect(child.resolves('ghost')).toBe(false)
  })

  it('chains three levels deep (grandchild → child → parent)', () => {
    const grandchild = new CommandRegistry()
    grandchild.setParent(child)
    parent.register(mockDef('root-cmd'))
    expect(grandchild.resolves('root-cmd')).toBe(true)
    expect(grandchild.get('root-cmd')).toBeDefined()
  })

  it('setParent(null) severs the parent link', () => {
    parent.register(mockDef('shared'))
    child.setParent(null)
    expect(child.get('shared')).toBeUndefined()
    expect(child.resolves('shared')).toBe(false)
  })
})
