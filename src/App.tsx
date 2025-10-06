import { useEffect, useMemo, useState } from 'react'
import { GameRenderer } from './components/GameRenderer'
import type { RendererEvent } from './domain/events'

interface DemoSpec {
  label: string
  path: string
  source?: unknown
  error?: string
}

interface EventLogEntry {
  event: RendererEvent
  timestamp: string
}

const demoSpecs: DemoSpec[] = [
  { label: "MCQ: Ohm's Law", path: '/specs/mcq-ohmslaw.json' },
  { label: 'Ordering: EM Spectrum', path: '/specs/ordering-spectrum.json' },
  { label: 'Pair Match: Terms to Definitions', path: '/specs/pairmatch-terms.json' },
]

export default function App() {
  const [specs, setSpecs] = useState<DemoSpec[]>(demoSpecs)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [events, setEvents] = useState<EventLogEntry[]>([])

  useEffect(() => {
    let isMounted = true
    async function loadSpecs() {
      try {
        const loaded = await Promise.all(
          demoSpecs.map(async (spec) => {
            const response = await fetch(spec.path)
            if (!response.ok) {
              throw new Error(`Failed to load ${spec.path}`)
            }
            const json = (await response.json()) as unknown
            return { ...spec, source: json }
          }),
        )
        if (isMounted) {
          setSpecs(loaded)
          setLoading(false)
        }
      } catch (error) {
        console.error(error)
        if (isMounted) {
          setFetchError(error instanceof Error ? error.message : 'Failed to load specs')
          setLoading(false)
        }
      }
    }

    loadSpecs()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    setEvents([])
  }, [selectedIndex])

  const activeSpec = useMemo(() => specs[selectedIndex]?.source, [specs, selectedIndex])

  const handleEvent = (event: RendererEvent) => {
    setEvents((prev) => [{ event, timestamp: new Date().toLocaleTimeString() }, ...prev].slice(0, 10))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 p-4 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <main className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">AG-UI Learning Games Renderer</h1>
              <p className="text-sm text-slate-500 dark:text-slate-300">
                Select a sample spec to render. Events from the renderer will appear in the log.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <span>Sample spec</span>
              <select
                value={selectedIndex}
                onChange={(event) => setSelectedIndex(Number(event.target.value))}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900"
              >
                {specs.map((spec, index) => (
                  <option key={spec.path} value={index}>
                    {spec.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        {loading && (
          <p className="rounded-lg border border-slate-200 bg-white p-4 text-center text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            Loading sample specs...
          </p>
        )}

        {fetchError && !loading && (
          <p className="rounded-lg border border-red-300 bg-red-50 p-4 text-center text-sm text-red-700 shadow-sm dark:border-red-500/40 dark:bg-red-950/50 dark:text-red-200">
            {fetchError}
          </p>
        )}

        {!loading && !fetchError && activeSpec ? (
          <GameRenderer key={specs[selectedIndex].path} spec={activeSpec} onEvent={handleEvent} />
        ) : null}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Event log</h2>
            <button
              type="button"
              onClick={() => setEvents([])}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Clear
            </button>
          </header>
          {events.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-300">Interact with the game to see events here.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {events.map(({ event, timestamp }, index) => (
                <li
                  key={`${event.kind}-${index}-${timestamp}`}
                  className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium">{event.kind}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-300">{timestamp}</span>
                  </div>
                  <pre className="mt-2 overflow-x-auto rounded bg-white/70 p-2 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    {JSON.stringify(event, null, 2)}
                  </pre>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
