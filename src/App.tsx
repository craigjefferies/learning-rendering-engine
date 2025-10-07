import { useEffect, useMemo, useState } from 'react'
import { GameRenderer } from './components/GameRenderer'
import { useRendererStore } from './lib/store'
import type { RendererEvent } from './domain/events'

interface GameSpec {
  label: string
  path: string
  source?: unknown
  error?: string
}

interface GameSetMetadata {
  id: string
  title: string
  type: string
  path: string
  description: string
}

interface AssessmentMetadata {
  id: string
  standard: string
  title: string
  fullTitle: string
  subject: string
  level: number
  credits: number
  description: string
  learningOutcomes: {
    achieved: string
    merit: string
    excellence: string
  }
  omiList: Array<{
    id: string
    name: string
    description: string
  }>
  gameSets: GameSetMetadata[]
  metadata: {
    version: string
    lastUpdated: string
    author: string
    totalQuestions: number
    estimatedDuration: string
  }
}

interface Assessment {
  id: string
  label: string
  specs: GameSpec[]
  metadata?: AssessmentMetadata
}

const assessments: Assessment[] = [
  {
    id: 'as92006',
    label: 'AS92006: User Interfaces & Usability',
    specs: [],
  },
]

export default function App() {
  const [specs, setSpecs] = useState<GameSpec[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [currentSpecIndex, setCurrentSpecIndex] = useState<number | null>(null)
  const [gameKey, setGameKey] = useState(0)
  const [gameTransition, setGameTransition] = useState(true)
  const [viewMode, setViewMode] = useState<'library' | 'playing'>('library')
  const [assessmentMetadata, setAssessmentMetadata] = useState<AssessmentMetadata | null>(null)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [allQuestionsCompleted, setAllQuestionsCompleted] = useState(false)
  
  const resetAllProgress = useRendererStore((state) => state.resetAllProgress)
  const evaluations = useRendererStore((state) => state.evaluations)
  const submittedQuestions = useRendererStore((state) => state.submittedQuestions)
  const omiProgress = useRendererStore((state) => state.omiProgress)

  const currentAssessment = assessments[0]

  // Calculate overall progress across all games
  const overallProgress = useMemo(() => {
    // Don't calculate progress if specs haven't loaded yet
    if (specs.length === 0) {
      return {
        totalGames: 0,
        completedGames: 0,
        allQuestions: [],
        totalQuestions: 0,
        answeredQuestions: 0,
        correctQuestions: 0,
        percentageComplete: 0,
        percentageCorrect: 0,
        isComplete: false,
      }
    }
    
    const allGameIds = specs
      .filter(s => s.source)
      .map(s => (s.source as any)?.id)
      .filter(Boolean)
    
    const completedGames = allGameIds.filter(id => {
      const evaluation = evaluations[id]
      return evaluation && evaluation.correct
    })

    // Build a flat list of all questions with their submission status
    const allQuestions: Array<{ gameId: string; questionId: string; isAnswered: boolean; isCorrect: boolean }> = []

    specs.forEach(spec => {
      if (!spec.source) return
      const specData = spec.source as any
      const gameSubmissions = submittedQuestions.filter(q => q.gameId === specData.id)
      
      if (specData.questions) {
        // MCQSet, OrderingSet, PairMatchSet
        specData.questions.forEach((q: any) => {
          const submission = gameSubmissions.find(s => s.questionId === q.id)
          allQuestions.push({
            gameId: specData.id,
            questionId: q.id,
            isAnswered: !!submission,
            isCorrect: submission?.correct || false,
          })
        })
      } else if (specData.sentences) {
        // FillInTheBlanks
        specData.sentences.forEach((s: any) => {
          const submission = gameSubmissions.find(sub => sub.questionId === s.id)
          allQuestions.push({
            gameId: specData.id,
            questionId: s.id,
            isAnswered: !!submission,
            isCorrect: submission?.correct || false,
          })
        })
      } else if (specData.activities) {
        // ClassificationSet (legacy shape)
        specData.activities.forEach((a: any) => {
          const submission = gameSubmissions.find(sub => sub.questionId === a.id)
          allQuestions.push({
            gameId: specData.id,
            questionId: a.id,
            isAnswered: !!submission,
            isCorrect: submission?.correct || false,
          })
        })
      } else if (specData.showdowns) {
        // ShowdownSet
        specData.showdowns.forEach((sd: any) => {
          const submission = gameSubmissions.find(sub => sub.questionId === sd.id)
          allQuestions.push({
            gameId: specData.id,
            questionId: sd.id,
            isAnswered: !!submission,
            isCorrect: submission?.correct || false,
          })
        })
      }
    })

    const answeredQuestions = allQuestions.filter(q => q.isAnswered).length
    const correctQuestions = allQuestions.filter(q => q.isAnswered && q.isCorrect).length
    const isComplete = allQuestions.length > 0 && answeredQuestions === allQuestions.length

    console.log('=== PROGRESS DEBUG ===')
    console.log('Total specs loaded:', specs.length)
    console.log('Specs with source:', specs.filter(s => s.source).length)
    console.log('All questions:', allQuestions.length)
    console.log('Breakdown by game:')
    specs.forEach(spec => {
      if (!spec.source) return
      const specData = spec.source as any
      const questionCount =
        specData.questions?.length ||
        specData.sentences?.length ||
        specData.activities?.length ||
        specData.showdowns?.length ||
        0
      console.log(`  ${spec.label} (${specData.id}): ${questionCount} questions`)
    })

    return {
      totalGames: allGameIds.length,
      completedGames: completedGames.length,
      allQuestions,
      totalQuestions: allQuestions.length,
      answeredQuestions,
      correctQuestions,
      percentageComplete: allQuestions.length > 0 ? Math.round((answeredQuestions / allQuestions.length) * 100) : 0,
      percentageCorrect: answeredQuestions > 0 ? Math.round((correctQuestions / answeredQuestions) * 100) : 0,
      isComplete,
    }
  }, [specs, evaluations, submittedQuestions])

  const formatPlural = (count: number, singular: string) => {
    const base = singular.trim()
    if (count === 1) return `${count} ${base}`
    if (base.endsWith('y')) {
      return `${count} ${base.slice(0, -1)}ies`
    }
    if (base.endsWith('s')) {
      return `${count} ${base}`
    }
    if (base.endsWith('ch') || base.endsWith('sh') || base.endsWith('x')) {
      return `${count} ${base}es`
    }
    if (base.endsWith('io')) {
      return `${count} ${base.slice(0, -2)}ios`
    }
    return `${count} ${base}s`
  }

  const resolveUnitLabel = (specData: any): string => {
    switch (specData?.type) {
      case 'mcq':
      case 'mcq-set':
        return 'question'
      case 'ordering':
      case 'ordering-set':
        return 'question'
      case 'pair-match':
      case 'pair-match-set':
        return 'match'
      case 'fill-in-the-blanks':
        return 'scenario'
      case 'fill-in-the-blanks-set':
        return 'question'
      case 'classification-set':
        return 'activity'
      case 'showdown-set':
        return 'showdown'
      default:
        if (Array.isArray(specData?.sentences)) return 'scenario'
        if (Array.isArray(specData?.questions)) return 'question'
        if (Array.isArray(specData?.activities)) return 'activity'
        if (Array.isArray(specData?.showdowns)) return 'showdown'
        return 'task'
    }
  }

  const resolveTypeDisplay = (type: string): { title: string; icon: string } => {
    const mapping: Record<string, { title: string; icon: string }> = {
      'mcq-set': { title: 'Multiple Choice', icon: '🖊︎' },
      mcq: { title: 'Multiple Choice', icon: '🖊︎' },
      'ordering-set': { title: 'Ordering', icon: '⬍' },
      ordering: { title: 'Ordering', icon: '⬍' },
      'pair-match-set': { title: 'Matching', icon: '🔗' },
      'pair-match': { title: 'Matching', icon: '🔗' },
      'fill-in-the-blanks-set': { title: 'Fill in the Blanks', icon: '⌨︎' },
      'fill-in-the-blanks': { title: 'Fill in the Blanks', icon: '⌨︎' },
      'classification-set': { title: 'Categorisation', icon: '🗂︎' },
      'showdown-set': { title: 'Showdown Comparisons', icon: '⚖︎' },
      'activity-set': { title: 'Mixed Activities', icon: '🎯' },
    }
    return mapping[type] ?? { title: 'Learning Activity', icon: '🎓' }
  }

  const extractUnitsForSpec = (spec: GameSpec) => {
    const data = spec.source as any
    const gameId = data?.id ?? spec.path
    if (!data || !gameId) return [] as Array<{ gameId: string; requiredIds: string[] }>

    if (Array.isArray(data.questions)) {
      return data.questions
        .filter((q: any) => q?.id)
        .map((q: any) => ({ gameId, requiredIds: [q.id as string] }))
    }

    if (Array.isArray(data.activities)) {
      return data.activities
        .filter((activity: any) => activity?.id)
        .map((activity: any) => ({ gameId, requiredIds: [activity.id as string] }))
    }

    if (Array.isArray(data.showdowns)) {
      return data.showdowns
        .filter((sd: any) => sd?.id)
        .map((sd: any) => ({ gameId, requiredIds: [sd.id as string] }))
    }

    if (Array.isArray(data.sentences)) {
      return [
        {
          gameId,
          requiredIds: data.sentences
            .filter((sentence: any) => sentence?.id)
            .map((sentence: any) => sentence.id as string),
        },
      ]
    }

    return [{ gameId, requiredIds: [gameId] }]
  }

  // Check if all questions are complete and show modal
  useEffect(() => {
    if (overallProgress.isComplete && !allQuestionsCompleted) {
      setAllQuestionsCompleted(true)
      setShowCompletionModal(true)
    }
  }, [overallProgress.isComplete, allQuestionsCompleted])

  const handleGameComplete = () => {
    setGameTransition(false)
    setTimeout(() => {
      setCurrentSpecIndex(null)
      setViewMode('library')
      setGameTransition(true)
    }, 2000)
  }

  const handleGameEvent = (event: RendererEvent) => {
    if (event.kind === 'game.completed') {
      const evaluation = useRendererStore.getState().evaluations[event.gameId]
      if (evaluation?.correct) {
        handleGameComplete()
      }
    }
  }

  // Load assessment metadata and specs
  useEffect(() => {
    let isMounted = true
    async function loadAssessment() {
      setLoading(true)
      setFetchError(null)
      try {
        // First, load the assessment metadata
        const metadataPath = `/specs/${currentAssessment.id.toUpperCase()}/assessment.json`
        const metadataResponse = await fetch(metadataPath)
        
        if (!metadataResponse.ok) {
          throw new Error(`Failed to load assessment metadata: ${metadataResponse.status}`)
        }
        
        const metadata = await metadataResponse.json() as AssessmentMetadata
        
        if (isMounted) {
          setAssessmentMetadata(metadata)
          
          // Shuffle helper function
          const shuffleArray = <T,>(array: T[]): T[] => {
            const shuffled = [...array]
            for (let i = shuffled.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1))
              ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
            }
            return shuffled
          }
          
          // Randomize the order of game sets
          const shuffledGameSets = shuffleArray(metadata.gameSets)
          
          // Now load all game sets from the metadata
          const gameSpecs: GameSpec[] = shuffledGameSets.map(gameSet => ({
            label: `${gameSet.title}`,
            path: gameSet.path,
          }))
          
          const loadedSpecs = await Promise.all(
            gameSpecs.map(async (spec) => {
              try {
                const response = await fetch(spec.path)
                if (!response.ok) {
                  console.error(`Failed to load ${spec.path}: ${response.status} ${response.statusText}`)
                  return [{ ...spec, source: null, error: `Failed to load: ${response.status}` }]
                }
                const json = (await response.json()) as unknown
                
                console.log(`Loaded ${spec.path}:`, Array.isArray(json) ? `Array of ${json.length} items` : 'Single object')
                
                if (json && typeof json === 'object' && !Array.isArray(json)) {
                  const data = { ...(json as Record<string, unknown>) }

                  // Expand fill-in-the-blanks sets into individual games
                  if (data.type === 'fill-in-the-blanks-set' && Array.isArray((data as any).questions)) {
                    const questionSet = (data as any).questions as any[]
                    const shuffledQuestions = shuffleArray(questionSet)

                    console.log(`  Expanding fill-in-the-blanks set into ${shuffledQuestions.length} specs`)

                    return shuffledQuestions.map((question, index) => {
                      const clonedQuestion = { ...question }
                      if (Array.isArray(clonedQuestion.sentences)) {
                        clonedQuestion.sentences = shuffleArray(clonedQuestion.sentences)
                      }

                      return {
                        label: `${spec.label} (${index + 1})`,
                        path: `${spec.path}#${index}`,
                        source: clonedQuestion,
                        error: undefined,
                      }
                    })
                  }

                  if ('questions' in data && Array.isArray((data as any).questions)) {
                    (data as any).questions = shuffleArray((data as any).questions as any[]).map((question: any) => {
                      if (Array.isArray(question.sentences)) {
                        return { ...question, sentences: shuffleArray(question.sentences) }
                      }
                      if (Array.isArray(question.activities)) {
                        return { ...question, activities: shuffleArray(question.activities) }
                      }
                      if (Array.isArray(question.showdowns)) {
                        return { ...question, showdowns: shuffleArray(question.showdowns) }
                      }
                      return question
                    })
                  } else if ('sentences' in data && Array.isArray((data as any).sentences)) {
                    (data as any).sentences = shuffleArray((data as any).sentences)
                  } else if ('activities' in data && Array.isArray((data as any).activities)) {
                    (data as any).activities = shuffleArray((data as any).activities)
                  } else if ('showdowns' in data && Array.isArray((data as any).showdowns)) {
                    (data as any).showdowns = shuffleArray((data as any).showdowns)
                  }

                  return [{ ...spec, source: data }]
                }

                if (Array.isArray(json)) {
                  const shuffled = shuffleArray(json)
                  return shuffled.map((entry: any, index: number) => ({
                    label: `${spec.label} (${index + 1})`,
                    path: `${spec.path}#${index}`,
                    source: entry,
                    error: undefined,
                  }))
                }

                return [{ ...spec, source: json }]
              } catch (err) {
                console.error(`Error fetching ${spec.path}:`, err)
                return [{ ...spec, source: null, error: err instanceof Error ? err.message : 'Fetch failed' }]
              }
            }),
          )
          
          // Flatten the array of arrays into a single array
          const loaded = loadedSpecs.flat()
          
          console.log('=== LOADING DEBUG ===')
          console.log('Total loaded specs:', loaded.length)
          loaded.forEach((s, idx) => {
            console.log(`Spec ${idx}:`, {
              label: s.label,
              path: s.path,
              hasSource: !!s.source,
              error: s.error,
              sourceType: s.source ? (s.source as any).type : 'N/A',
              sourceId: s.source ? (s.source as any).id : 'N/A',
            })
          })
          
          if (isMounted) {
            setSpecs(loaded)
            setCurrentSpecIndex(null)
            setViewMode('library')
            setLoading(false)
          }
        }
      } catch (error) {
        console.error('Error in loadAssessment:', error)
        if (isMounted) {
          setFetchError(error instanceof Error ? error.message : 'Failed to load assessment')
          setLoading(false)
        }
      }
    }

    loadAssessment()
    return () => {
      isMounted = false
    }
  }, [])

  const activeSpec = useMemo(() => {
    if (currentSpecIndex === null) {
      return null
    }
    const spec = specs[currentSpecIndex]
    if (!spec) {
      console.warn('No spec at index', currentSpecIndex)
      return null
    }
    if (spec.error) {
      console.warn(`Selected spec has error: ${spec.error}`)
      return null
    }
    if (!spec.source) {
      console.warn('Spec source not loaded', spec.label)
      return null
    }
    return spec.source
  }, [specs, currentSpecIndex])

  const validSpecs = useMemo(() => specs.filter(spec => !spec.error && spec.source), [specs])

  const gameCards = useMemo(() => {
    const specMeta = validSpecs.map((spec, index) => {
      const basePath = spec.path.split('#')[0]
      const specData = spec.source as any
      const normalizedLabel = spec.label.replace(/\s*\(\d+\)$/u, '').trim()
      const units = extractUnitsForSpec(spec)
      const unitsComplete = units.every((unit) =>
        unit.requiredIds.every((id) => {
          const record = overallProgress.allQuestions.find(
            (question) => question.gameId === unit.gameId && question.questionId === id,
          )
          return record?.isCorrect
        }),
      )

      return {
        index,
        basePath,
        label: normalizedLabel,
        description: specData?.description || spec.description,
        rawType: specData?.type ?? '',
        units,
        completed: units.length > 0 ? unitsComplete : false,
        spec,
      }
    })

    const groups = new Map<string, {
      basePath: string
      label: string
      description?: string
      rawType: string
      specs: typeof specMeta
    }>()

    specMeta.forEach((meta) => {
      const existing = groups.get(meta.basePath)
      if (existing) {
        existing.specs.push(meta)
        if (!existing.description && meta.description) {
          existing.description = meta.description
        }
        if (!existing.rawType && meta.rawType) {
          existing.rawType = meta.rawType
        }
      } else {
        groups.set(meta.basePath, {
          basePath: meta.basePath,
          label: meta.label,
          description: meta.description,
          rawType: meta.rawType,
          specs: [meta],
        })
      }
    })

    return Array.from(groups.values()).map((group) => {
      const allUnits = group.specs.flatMap((meta) => meta.units)
      const totalUnits = allUnits.length || group.specs.length
      const answeredUnits = allUnits.filter((unit) =>
        unit.requiredIds.every((id) => {
          const record = overallProgress.allQuestions.find(
            (question) => question.gameId === unit.gameId && question.questionId === id,
          )
          return record?.isCorrect
        }),
      )

      const answered = answeredUnits.length
      const status = totalUnits === 0
        ? 'TO-DO'
        : answered === 0
        ? 'TO-DO'
        : answered < totalUnits
        ? 'DOING'
        : 'DONE'

      const nextSpec = group.specs.find((meta) => !meta.completed) ?? group.specs[0]

      const typeInfo = resolveTypeDisplay(group.rawType || (group.specs[0]?.spec.source as any)?.type || '')
      const unit = resolveUnitLabel(group.specs[0]?.spec.source)

      return {
        key: group.basePath,
        indices: group.specs.map((meta) => meta.index),
        primaryIndex: nextSpec.index,
        title: typeInfo.title,
        subtitle: group.label,
        description: group.description,
        icon: typeInfo.icon,
        unit,
        answered,
        total: totalUnits,
        status,
      }
    })
  }, [validSpecs, overallProgress.allQuestions])

  const handleSelectGame = (card: (typeof gameCards)[number]) => {
    const target = specs[card.primaryIndex]
    if (!target || !target.source) return
    setCurrentSpecIndex(card.primaryIndex)
    setGameKey(prev => prev + 1)
    setViewMode('playing')
    setGameTransition(true)
  }

  const handleResetProgress = () => {
    if (confirm('Reset all progress and asked questions?')) {
      resetAllProgress()
      setGameKey(prev => prev + 1)
      setCurrentSpecIndex(null)
      setViewMode('library')
      setAllQuestionsCompleted(false)
      setShowCompletionModal(false)
    }
  }

  const handleReturnToLibrary = () => {
    setGameTransition(false)
    setTimeout(() => {
      setCurrentSpecIndex(null)
      setViewMode('library')
      setGameTransition(true)
    }, 200)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-100 via-white to-zinc-200">
      {/* Header */}
      <header className="border-b border-zinc-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              {assessmentMetadata?.subject || 'Digital Technology'}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
              {assessmentMetadata?.title || currentAssessment.label}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600">
              {assessmentMetadata?.description || 'Choose a game to explore usability principles and interface design skills.'}
            </p>
          </div>

          <div className="flex w-full flex-col gap-4 rounded-2xl border border-zinc-200 bg-white/70 p-5 shadow-sm ring-1 ring-black/5 md:max-w-xs">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <span>Overall Progress</span>
              <span>{overallProgress.percentageComplete}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-zinc-700 to-zinc-500 transition-all"
                style={{ width: `${overallProgress.percentageComplete}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm text-zinc-600">
              <span>{formatPlural(overallProgress.answeredQuestions, 'question')} completed</span>
              <span className="font-medium text-zinc-800">{formatPlural(overallProgress.totalQuestions, 'question')}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="inline-flex h-2 w-2 rounded-full bg-zinc-800" aria-hidden />
              <span className="inline-flex h-2 w-2 rounded-full bg-zinc-300" aria-hidden />
              <span className="inline-flex h-2 w-2 rounded-full bg-red-300" aria-hidden />
              <span className="ml-2 leading-none">Tap a card to continue learning.</span>
            </div>
            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                onClick={handleResetProgress}
                className="inline-flex items-center justify-center rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-900"
              >
                Reset Progress
              </button>
              {viewMode === 'playing' && (
                <button
                  onClick={handleReturnToLibrary}
                  className="inline-flex items-center justify-center rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-700"
                >
                  Library
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-10">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-600"></div>
          </div>
        )}

        {fetchError && !loading && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            <p className="font-semibold">We couldn’t load this assessment.</p>
            <p className="mt-2 text-rose-500">{fetchError}</p>
          </div>
        )}

        {!loading && !fetchError && currentSpecIndex !== null && specs[currentSpecIndex]?.error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700">
            <p className="font-semibold">This activity isn’t available right now.</p>
            <p className="mt-2 text-amber-600">{specs[currentSpecIndex].error}</p>
          </div>
        )}

        {!loading && !fetchError && viewMode === 'library' && (
          <section className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-semibold text-zinc-900">Choose your next challenge</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Tap a card to open a focused learning game. Completed activities remain available for review.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {gameCards.map((card) => (
                <button
                  key={card.key}
                  onClick={() => handleSelectGame(card)}
                  disabled={card.status === 'DONE'}
                  aria-disabled={card.status === 'DONE'}
                  className={`group flex h-full flex-col justify-between rounded-2xl border border-zinc-200 bg-white/80 p-6 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 ${
                    card.status === 'DONE'
                      ? 'cursor-not-allowed opacity-60'
                      : 'hover:-translate-y-1 hover:border-zinc-300 hover:shadow-lg'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100/60 text-xl text-zinc-500 transition group-hover:border-zinc-300">
                        {card.icon}
                      </span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                          {card.title}
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-zinc-900">
                          {card.subtitle}
                        </h3>
                      </div>
                    </div>
                    {card.description && (
                      <p className="text-sm leading-relaxed text-zinc-600">
                        {card.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold uppercase tracking-[0.3em] ${
                        card.status === 'DONE'
                          ? 'text-emerald-500'
                          : card.status === 'DOING'
                          ? 'text-amber-500'
                          : 'text-zinc-400'
                      }`}
                    >
                      {card.status}
                    </span>
                    <div className="text-right text-sm font-semibold text-zinc-700">
                      <p className="text-sm font-semibold text-zinc-800">
                        {card.total > 0 ? `${card.answered}/${card.total}` : '—'}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {card.total > 0 ? formatPlural(card.total, card.unit) : ''}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {!loading && !fetchError && viewMode === 'playing' && activeSpec && currentSpecIndex !== null && specs[currentSpecIndex] ? (
          <div className={`transition-all duration-500 transform ${gameTransition ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            {gameTransition && activeSpec && (
              <section className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl ring-1 ring-black/5">
                <GameRenderer 
                  key={`${currentAssessment.id}-${specs[currentSpecIndex].path}-${gameKey}`} 
                  spec={activeSpec} 
                  onEvent={handleGameEvent}
                />
              </section>
            )}
          </div>
        ) : null}
      </main>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg animate-scale-in rounded-xl border border-emerald-200 bg-white p-6 shadow-2xl dark:border-emerald-500/30 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-3xl text-white">
                  🎉
                </div>
                <h2 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  Congratulations!
                </h2>
                <p className="text-sm text-emerald-700/80 dark:text-emerald-200/80">
                  All {overallProgress.totalQuestions} questions are complete.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close completion summary"
                onClick={() => setShowCompletionModal(false)}
                className="rounded-full border border-emerald-200 p-2 text-emerald-600 transition hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
              >
                <span className="block text-lg leading-none">×</span>
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-center dark:border-emerald-500/30 dark:bg-emerald-900/20">
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-300">
                    {overallProgress.percentageCorrect}%
                  </p>
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-700/80 dark:text-emerald-200/70">
                    Accuracy
                  </p>
                </div>
                <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 text-center dark:border-indigo-500/30 dark:bg-indigo-900/20">
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-300">
                    {overallProgress.correctQuestions}/{overallProgress.totalQuestions}
                  </p>
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-700/80 dark:text-indigo-200/70">
                    Correct Answers
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Skills Demonstrated
                </h3>
                <div className="mt-3 space-y-2">
                  {assessmentMetadata?.omiList && assessmentMetadata.omiList.length > 0 ? (
                    assessmentMetadata.omiList.map((omi) => {
                      const progress = omiProgress[omi.id]
                      const mastery = progress?.masteryLevel || 'not-yet'
                      const masteryLabels = {
                        'mastered': { label: 'Mastered', color: 'text-emerald-600 dark:text-emerald-300', icon: '●' },
                        'proficient': { label: 'Proficient', color: 'text-indigo-600 dark:text-indigo-300', icon: '◑' },
                        'emerging': { label: 'Emerging', color: 'text-blue-600 dark:text-blue-300', icon: '◔' },
                        'not-yet': { label: 'Not Yet', color: 'text-slate-500 dark:text-slate-400', icon: '○' },
                      }
                      const config = masteryLabels[mastery]

                      return (
                        <div key={omi.id} className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                          <div className="pr-3">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{omi.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{omi.description}</p>
                          </div>
                          <span className={`flex items-center gap-2 font-semibold ${config.color}`}>
                            <span>{config.icon}</span>
                            {config.label}
                          </span>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No OMI data available.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setShowCompletionModal(false)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-700"
                >
                  Close Summary
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
