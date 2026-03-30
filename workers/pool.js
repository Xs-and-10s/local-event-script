/**
 * workers/pool.js — LES Web Worker Pool
 *
 * Manages a pool of N workers all running workers/worker.js.
 * Any worker can handle any task (true pool — no per-task assignment).
 * Pending tasks queue and dispatch to the next available worker.
 *
 * Usage:
 *   import { WorkerPool } from '/workers/pool.js'
 *   const pool = new WorkerPool(4)
 *   const result = await pool.dispatch('isobands:temp', { points, breaks })
 *
 * Integration:
 *   pool.onResult  — called with (task, result) for every completed task
 *                    Used by the worker-controller to broadcast results via LES
 *
 * Degradation:
 *   If Web Workers are not available (very old browsers or secure contexts
 *   that block workers), tasks are silently dropped and onResult is never
 *   called. The map renders without analysis layers in that case.
 */

export class WorkerPool {
  /**
   * @param {number} size        — number of workers to spawn (2–8)
   * @param {string} workerUrl   — URL of the worker script
   */
  constructor(size, workerUrl = '/workers/worker.js') {
    /** @type {Worker[]} */
    this._workers = []
    /** @type {boolean[]} — true if the worker is currently processing a task */
    this._busy = []
    /** @type {Map<string, { resolve, reject, task }>} — pending promise callbacks */
    this._pending = new Map()
    /** @type {Array<{ id, task, payload, resolve, reject }>} — queued tasks */
    this._queue = []
    /** @type {number} */
    this._idCounter = 0
    /** @type {string} */
    this._workerUrl = workerUrl
    /** @type {Function|null} — called with (task, result) when any task completes */
    this.onResult = null
    /** @type {boolean} */
    this.supported = typeof Worker !== 'undefined'

    if (this.supported) {
      this._spawn(size)
    } else {
      console.warn('[WorkerPool] Web Workers not supported — analysis disabled')
    }
  }

  /** Total pool size */
  get size() { return this._workers.length }

  /** Number of currently idle workers */
  get idle() { return this._busy.filter(b => !b).length }

  /**
   * Dispatch a task to the pool.
   * @param {string} task     — task name (e.g. 'isobands:temp')
   * @param {unknown} payload — data for the worker
   * @returns {Promise<unknown>} resolves with the result
   */
  dispatch(task, payload) {
    if (!this.supported) {
      return Promise.reject(new Error('Workers not supported'))
    }

    return new Promise((resolve, reject) => {
      const id = `task-${++this._idCounter}-${task}`
      const job = { id, task, payload, resolve, reject }

      // Find a free worker
      const freeIdx = this._busy.findIndex(b => !b)
      if (freeIdx >= 0) {
        this._runJob(freeIdx, job)
      } else {
        // All busy — queue it
        this._queue.push(job)
      }
    })
  }

  /**
   * Resize the pool. Terminates all current workers and spawns fresh ones.
   * Any in-flight tasks will be lost — call this only when idle.
   * @param {number} newSize
   */
  resize(newSize) {
    this._terminate()
    this._pending.clear()
    this._queue = []
    if (this.supported) {
      this._spawn(newSize)
    }
    console.log(`[WorkerPool] resized to ${this._workers.length} workers`)
  }

  /** Terminate all workers cleanly. */
  destroy() {
    this._terminate()
    this._pending.clear()
    this._queue = []
  }

  // ── Private ──────────────────────────────────────────────────────────────

  _spawn(size) {
    const n = Math.min(8, Math.max(2, size))
    for (let i = 0; i < n; i++) {
      try {
        const worker = new Worker(this._workerUrl)
        this._workers.push(worker)
        this._busy.push(false)

        worker.onmessage = ({ data }) => this._onMessage(i, data)
        worker.onerror = (err) => {
          console.error(`[WorkerPool] worker ${i} error:`, err.message)
          // Mark as free so the pool doesn't deadlock
          this._markFree(i)
        }
      } catch (err) {
        console.error(`[WorkerPool] failed to spawn worker ${i}:`, err)
      }
    }
    console.log(`[WorkerPool] spawned ${this._workers.length} workers`)
  }

  _terminate() {
    for (const w of this._workers) {
      try { w.terminate() } catch { /* already dead */ }
    }
    this._workers = []
    this._busy = []
  }

  _runJob(workerIdx, job) {
    const { id, task, payload } = job
    this._busy[workerIdx] = true
    this._pending.set(id, { resolve: job.resolve, reject: job.reject, task })
    this._workers[workerIdx].postMessage({ id, task, payload })
  }

  _onMessage(workerIdx, data) {
    const { id, task, result, error } = data

    // Ignore startup readiness message
    if (id === '__ready__') {
      console.log(`[WorkerPool] worker ${workerIdx} ready — Turf ${result?.turf}`)
      return
    }

    const pending = this._pending.get(id)
    if (pending) {
      this._pending.delete(id)
      if (error) {
        pending.reject(new Error(error))
      } else {
        pending.resolve(result)
        // Notify the LES worker-controller via the callback
        if (this.onResult) {
          try { this.onResult(task, result) } catch { /* don't let callback errors kill the pool */ }
        }
      }
    }

    this._markFree(workerIdx)
  }

  _markFree(workerIdx) {
    this._busy[workerIdx] = false
    // Drain the queue
    if (this._queue.length > 0) {
      const next = this._queue.shift()
      this._runJob(workerIdx, next)
    }
  }
}

/**
 * createWorkerPool — convenience factory used by d3.html.
 * Wires the pool's onResult callback to fire the LES
 * #worker-controller 'workers:result-received' event.
 *
 * @param {number} size
 * @returns {WorkerPool}
 */
export function createWorkerPool(size) {
  const pool = new WorkerPool(size)

  // When a worker finishes, tell LES about it.
  // LES #worker-controller listens for this event and broadcasts
  // 'workers:result' to all instances via document.
  pool.onResult = (task, result) => {
    const ctrl = document.getElementById('worker-controller')
    if (ctrl && typeof ctrl.fire === 'function') {
      ctrl.fire('workers:result-received', [task, JSON.stringify(result)])
    } else {
      // Fallback: dispatch directly on document
      document.dispatchEvent(new CustomEvent('workers:result-ready', {
        detail: { task, result },
        bubbles: false,
      }))
    }
  }

  return pool
}
