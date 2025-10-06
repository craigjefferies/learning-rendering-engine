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
  const [currentSpecIndex, setCurrentSpecIndex] = useState(0)
  const [gameKey, setGameKey] = useState(0)
  const [gameTransition, setGameTransition] = useState(true)
  const [assessmentMetadata, setAssessmentMetadata] = useState<AssessmentMetadata | null>(null)
  const resetAllProgress = useRendererStore((state) => state.resetAllProgress)
  const evaluations = useRendererStore((state) => state.evaluations)
  const submittedQuestions = useRendererStore((state) => state.submittedQuestions)

  const currentAssessment = assessments[0]

  // Calculate overall progress across all games
  const overallProgress = useMemo(() => {
    const allGameIds = specs
      .filter(s => s.source)
      .map(s => (s.source as any)?.id)
      .filter(Boolean)
    
    const completedGames = allGameIds.filter(id => {
      const evaluation = evaluations[id]
      return evaluation && evaluation.correct
    })

    // Count total questions across all specs
    let totalQuestions = 0
    let answeredQuestions = 0
    let correctQuestions = 0

    specs.forEach(spec => {
      if (!spec.source) return
      const specData = spec.source as any
      const gameSubmissions = submittedQuestions.filter(q => q.gameId === specData.id)
      
      if (specData.questions) {
        // MCQSet, OrderingSet, PairMatchSet
        totalQuestions += specData.questions.length
        answeredQuestions += gameSubmissions.length
        correctQuestions += gameSubmissions.filter(q => q.correct).length
      } else if (specData.sentences) {
        // FillInTheBlanks
        totalQuestions += specData.sentences.length
        answeredQuestions += gameSubmissions.length
        correctQuestions += gameSubmissions.filter(q => q.correct).length
      } else if (specData.activities) {
        // ActivitySet, ClassificationSet
        totalQuestions += specData.activities.length
        answeredQuestions += gameSubmissions.length
        correctQuestions += gameSubmissions.filter(q => q.correct).length
      }
    })

    return {
      totalGames: allGameIds.length,
      completedGames: completedGames.length,
      totalQuestions,
      answeredQuestions,
      correctQuestions,
      percentageComplete: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0,
      percentageCorrect: answeredQuestions > 0 ? Math.round((correctQuestions / answeredQuestions) * 100) : 0,
    }
  }, [specs, evaluations, submittedQuestions])

  const handleGameComplete = () => {
    // Fade out current game
    setGameTransition(false)
    
    // Move to next game after transition
    setTimeout(() => {
      const validSpecs = specs.filter(s => !s.error && s.source)
      if (validSpecs.length <= 1) {
        console.log('Not enough valid specs to switch')
        setGameTransition(true)
        return
      }
      
      let newIndex
      let attempts = 0
      do {
        const randomSpec = validSpecs[Math.floor(Math.random() * validSpecs.length)]
        newIndex = specs.indexOf(randomSpec)
        attempts++
        if (attempts > 10) {
          console.error('Could not find different spec')
          setGameTransition(true)
          return
        }
      } while (newIndex === currentSpecIndex)
      
      const nextSpec = specs[newIndex]
      if (!nextSpec || !nextSpec.source) {
        console.error('Next spec not loaded properly', nextSpec)
        setGameTransition(true)
        return
      }
      
      console.log(`Switching from spec ${currentSpecIndex} to ${newIndex}`, nextSpec.label)
      
      // Don't clear evaluations when switching games - we want to keep progress!
      // Only increment the key to force re-render
      setCurrentSpecIndex(newIndex)
      setGameKey(prev => prev + 1)
      
      // Fade in new game after ensuring state is updated
      requestAnimationFrame(() => {
        setTimeout(() => setGameTransition(true), 50)
      })
    }, 1000) // Increased delay to ensure completion feedback is visible
  }

  const handleGameEvent = (event: RendererEvent) => {
    if (event.kind === 'game.completed') {
      handleGameComplete()
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
          
          // Now load all game sets from the metadata
          const gameSpecs: GameSpec[] = metadata.gameSets.map(gameSet => ({
            label: `${gameSet.title}`,
            path: gameSet.path,
          }))
          
          const loaded = await Promise.all(
            gameSpecs.map(async (spec) => {
              try {
                const response = await fetch(spec.path)
                if (!response.ok) {
                  console.error(`Failed to load ${spec.path}: ${response.status} ${response.statusText}`)
                  return { ...spec, source: null, error: `Failed to load: ${response.status}` }
                }
                const json = (await response.json()) as unknown
                return { ...spec, source: json }
              } catch (err) {
                console.error(`Error fetching ${spec.path}:`, err)
                return { ...spec, source: null, error: err instanceof Error ? err.message : 'Fetch failed' }
              }
            }),
          )
          
          if (isMounted) {
            setSpecs(loaded)
            // Pick a random spec to start
            const validSpecs = loaded.filter(s => !s.error && s.source)
            if (validSpecs.length > 0) {
              const randomIndex = Math.floor(Math.random() * validSpecs.length)
              setCurrentSpecIndex(loaded.indexOf(validSpecs[randomIndex]))
            }
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

  const handleResetProgress = () => {
    if (confirm('Reset all progress and asked questions?')) {
      resetAllProgress()
      setGameKey(prev => prev + 1)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Clean Header */}
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {assessmentMetadata?.standard || 'Learning Engine'}
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {assessmentMetadata?.title || currentAssessment.label}
              </p>
            </div>
            
            {/* Overall Progress Tracker */}
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-4 py-2.5">
                {/* Top row: Label, percentage, and stats inline */}
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">Overall Progress</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{overallProgress.percentageComplete}%</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {overallProgress.answeredQuestions} / {overallProgress.totalQuestions} questions
                  </span>
                  {overallProgress.answeredQuestions > 0 && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium whitespace-nowrap">
                      {overallProgress.percentageCorrect}% correct
                    </span>
                  )}
                </div>
                
                {/* Progress bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${overallProgress.percentageComplete}%` }}
                    ></div>
                  </div>
                  
                  {/* Game stages indicator inline with progress bar */}
                  <div className="flex items-center gap-1">
                    {specs.map((spec, idx) => {
                      const specData = spec.source as any
                      const evaluation = evaluations[specData?.id]
                      const isComplete = evaluation?.correct
                      const isCurrent = idx === currentSpecIndex
                      
                      return (
                        <div
                          key={idx}
                          className={`h-2 w-2 rounded-full transition-all duration-300 ${
                            isComplete 
                              ? 'bg-green-500 dark:bg-green-400' 
                              : isCurrent 
                              ? 'bg-yellow-500 dark:bg-yellow-400 animate-pulse' 
                              : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                          title={specData?.title || `Game ${idx + 1}`}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleResetProgress}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Reset Progress
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
          </div>
        )}

        {fetchError && !loading && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-200">
            <p className="font-semibold">Error loading content</p>
            <p className="mt-1">{fetchError}</p>
          </div>
        )}

        {!loading && !fetchError && specs[currentSpecIndex]?.error && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-950/50 dark:text-yellow-200">
            <p className="font-semibold">Failed to load game</p>
            <p className="mt-1">{specs[currentSpecIndex].error}</p>
          </div>
        )}

        {!loading && !fetchError && activeSpec && specs[currentSpecIndex] ? (
          <div className={`transition-all duration-500 transform ${gameTransition ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            {gameTransition && activeSpec && (
              <GameRenderer 
                key={`${currentAssessment.id}-${specs[currentSpecIndex].path}-${gameKey}`} 
                spec={activeSpec} 
                onEvent={handleGameEvent}
              />
            )}
          </div>
        ) : null}
      </main>
    </div>
  )
}
