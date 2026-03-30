import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { patchSignals } from '../sse.ts'

const form = new Hono()

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/form
//
// Validates and "submits" the form data.
// Returns SSE with datastar-patch-signals:
//   success → { formResult: 'accepted', formMessage: '' }
//   invalid → { formResult: 'rejected', formMessage: 'reason' }
//
// Deliberate rules so the demo can show both paths:
//   - All fields required
//   - email must contain @ and a dot after it
//   - message must be at least 20 characters
// ─────────────────────────────────────────────────────────────────────────────

form.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { name, email, message } = body as Record<string, string>

  console.log('[form] POST /api/form', { name, email, message: message?.slice(0, 20) })

  // Simulate a 600ms network round-trip so the loading state is visible
  await new Promise(r => setTimeout(r, 600))

  // Validate
  const errors: string[] = []
  if (!name?.trim())                              errors.push('Name is required')
  if (!email?.trim())                             errors.push('Email is required')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email address is invalid')
  if (!message?.trim())                           errors.push('Message is required')
  else if (message.trim().length < 20)            errors.push('Message must be at least 20 characters')

  return streamSSE(c, async (stream) => {
    if (errors.length > 0) {
      await stream.writeSSE({
        event: 'datastar-patch-signals',
        data: JSON.stringify({ formResult: 'rejected', formMessage: errors[0] }),
      })
    } else {
      await stream.writeSSE({
        event: 'datastar-patch-signals',
        data: JSON.stringify({ formResult: 'accepted', formMessage: 'All good!' }),
      })
    }
  })
})

export { form }
