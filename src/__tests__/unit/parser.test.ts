// @vitest-environment node
/**
 * LES language parser — unit tests.
 *
 * Tests the parseLES() function's output shape and correctness.
 * We test WHAT the parser produces (AST node types and key fields),
 * not HOW it produces it. A parser rewrite that produces the same
 * behavioural AST should pass every test here.
 */
import { describe, it, expect } from 'vitest'
import { parseLES } from '@parser/index.js'
import type { LESNode, SequenceNode, EmitNode, BroadcastNode, BubbleNode, CascadeNode, ForwardNode, CallNode, WaitNode, SetNode, MatchNode, TryNode } from '@parser/index.js'

// Helper: unwrap a potential SequenceNode to its single step (for single-statement tests)
function single(node: LESNode): LESNode {
  if (node.type === 'sequence') return (node as SequenceNode).steps[0]!
  return node
}

// Helper: parse and unwrap to a specific node type
function parse<T extends LESNode>(src: string): T {
  return single(parseLES(`\`\n  ${src}\n\``)) as T
}

describe('emit', () => {
  it('produces an EmitNode', () => {
    const n = parse<EmitNode>('emit user:signed-in')
    expect(n.type).toBe('emit')
    expect(n.event).toBe('user:signed-in')
    expect(n.payload).toHaveLength(0)
  })

  it('parses a single payload expression', () => {
    const n = parse<EmitNode>('emit user:signed-in [$userId]')
    expect(n.payload).toHaveLength(1)
    expect(n.payload[0]!.raw).toBe('$userId')
  })

  it('parses two payload items (comma-separated)', () => {
    const n = parse<EmitNode>('emit data:loaded [$type, $count]')
    expect(n.payload).toHaveLength(2)
    expect(n.payload[0]!.raw).toBe('$type')
    expect(n.payload[1]!.raw).toBe('$count')
  })

  it('parses two payload items (double-space-separated — legacy syntax)', () => {
    const n = parse<EmitNode>('emit data:loaded [$type  $count]')
    expect(n.payload).toHaveLength(2)
  })
})

describe('broadcast', () => {
  it('produces a BroadcastNode', () => {
    const n = parse<BroadcastNode>('broadcast page:ready')
    expect(n.type).toBe('broadcast')
    expect(n.event).toBe('page:ready')
  })

  it('carries payload expressions', () => {
    const n = parse<BroadcastNode>('broadcast workers:result [payload[0], payload[1]]')
    expect(n.payload).toHaveLength(2)
    expect(n.payload[0]!.raw).toBe('payload[0]')
    expect(n.payload[1]!.raw).toBe('payload[1]')
  })
})

describe('bubble', () => {
  it('produces a BubbleNode', () => {
    const n = parse<BubbleNode>('bubble worker:done')
    expect(n.type).toBe('bubble')
    expect(n.event).toBe('worker:done')
  })

  it('carries payload expressions', () => {
    const n = parse<BubbleNode>('bubble result:ready [payload[0], payload[1]]')
    expect(n.payload).toHaveLength(2)
  })
})

describe('cascade', () => {
  it('produces a CascadeNode', () => {
    const n = parse<CascadeNode>('cascade map:refresh')
    expect(n.type).toBe('cascade')
    expect(n.event).toBe('map:refresh')
  })

  it('carries payload', () => {
    const n = parse<CascadeNode>('cascade map:refresh [$hour]')
    expect(n.payload).toHaveLength(1)
    expect(n.payload[0]!.raw).toBe('$hour')
  })
})

describe('forward', () => {
  it('produces a ForwardNode', () => {
    const n = parse<ForwardNode>('forward exitSplash')
    expect(n.type).toBe('forward')
    expect(n.name).toBe('exitSplash')
    expect(n.payload).toHaveLength(0)
  })

  it('carries payload arguments', () => {
    const n = parse<ForwardNode>('forward updateDisplay [$currentHour]')
    expect(n.name).toBe('updateDisplay')
    expect(n.payload).toHaveLength(1)
    expect(n.payload[0]!.raw).toBe('$currentHour')
  })
})

describe('call', () => {
  it('produces a CallNode', () => {
    const n = parse<CallNode>('call splash:exit')
    expect(n.type).toBe('call')
    expect(n.command).toBe('splash:exit')
  })

  it('parses named arguments', () => {
    const n = parse<CallNode>('call animate [target: "#splash"  duration: 300]')
    expect(Object.keys(n.args)).toEqual(expect.arrayContaining(['target', 'duration']))
  })
})

describe('wait', () => {
  it('produces a WaitNode with duration in ms', () => {
    const n = parse<WaitNode>('wait 300ms')
    expect(n.type).toBe('wait')
    expect(n.ms).toBe(300)
  })

  it('handles various durations', () => {
    expect(parse<WaitNode>('wait 1ms').ms).toBe(1)
    expect(parse<WaitNode>('wait 2000ms').ms).toBe(2000)
  })
})

describe('set', () => {
  it('produces a SetNode', () => {
    const n = parse<SetNode>('set $loading to false')
    expect(n.type).toBe('set')
    expect(n.signal).toBe('loading')
    expect(n.value.raw.trim()).toBe('false')
  })
})

describe('sequence (then)', () => {
  it('produces a SequenceNode for multi-step bodies', () => {
    const node = parseLES('`\n  emit a\n  then emit b\n`')
    expect(node.type).toBe('sequence')
    const seq = node as SequenceNode
    expect(seq.steps).toHaveLength(2)
    expect(seq.steps[0]!.type).toBe('emit')
    expect(seq.steps[1]!.type).toBe('emit')
  })

  it('sequences three steps', () => {
    const node = parseLES('`\n  emit a\n  then emit b\n  then emit c\n`')
    expect(node.type).toBe('sequence')
    expect((node as SequenceNode).steps).toHaveLength(3)
  })
})

describe('match', () => {
  it('produces a MatchNode with the correct number of arms', () => {
    // Match arms must use [bracket] syntax in LES
    const src = '`\n  match $state\n    [loading] -> emit show:spinner\n    [ready]   -> emit hide:spinner\n  /match\n`'
    const node = parseLES(src)
    // parseLES may return the match directly or wrapped in a sequence
    const match = (node.type === 'sequence'
      ? (node as SequenceNode).steps.find(s => s.type === 'match')
      : node.type === 'match' ? node : null) as MatchNode | null
    expect(match).not.toBeNull()
    expect(match!.type).toBe('match')
    expect(match!.arms.length).toBeGreaterThanOrEqual(2)
  })
})

describe('try / rescue', () => {
  it('produces a TryNode', () => {
    const src = '`\n  try\n    emit risky\n  rescue\n    emit safe\n  /try\n`'
    const node = parseLES(src)
    const tryNode = (node.type === 'sequence'
      ? (node as SequenceNode).steps.find(s => s.type === 'try')
      : node.type === 'try' ? node : null) as TryNode | null
    expect(tryNode).not.toBeNull()
    expect(tryNode!.type).toBe('try')
    expect(tryNode!.body).toBeDefined()
    expect(tryNode!.rescue).toBeDefined()
  })
})

describe('payload edge cases', () => {
  it('empty brackets produce zero payload items', () => {
    const n = parse<EmitNode>('emit foo []')
    expect(n.payload).toHaveLength(0)
  })

  it('no brackets produce zero payload items', () => {
    const n = parse<EmitNode>('emit foo')
    expect(n.payload).toHaveLength(0)
  })

  it('complex expressions are preserved', () => {
    const n = parse<BroadcastNode>('broadcast x [a + b]')
    expect(n.payload).toHaveLength(1)
    expect(n.payload[0]!.raw.trim()).toBe('a + b')
  })
})
