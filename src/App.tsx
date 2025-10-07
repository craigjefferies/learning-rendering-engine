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
        // ClassificationSet
        specData.activities.forEach((a: any) => {
          const submission = gameSubmissions.find(sub => sub.questionId === a.id)
          allQuestions.push({
            gameId: specData.id,
            questionId: a.id,
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
      const questionCount = specData.questions?.length || specData.sentences?.length || specData.activities?.length || 0
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

  // Check if all questions are complete and show modal
  useEffect(() => {
    if (overallProgress.isComplete && !allQuestionsCompleted) {
      setAllQuestionsCompleted(true)
      setShowCompletionModal(true)
    }
  }, [overallProgress.isComplete, allQuestionsCompleted])

  const handleGameComplete = () => {
    // Fade out current game
    setGameTransition(false)
    
    // Move to next game after transition
    setTimeout(() => {
      if (currentSpecIndex === null) {
        console.error('currentSpecIndex is null in handleGameComplete')
        setGameTransition(true)
        return
      }
      
      const validSpecs = specs.filter(s => !s.error && s.source)
      if (validSpecs.length === 0) {
        console.log('No valid specs available')
        setGameTransition(true)
        return
      }
      
      // Find the next spec in sequence (already randomized on load)
      const currentValidIndex = validSpecs.indexOf(specs[currentSpecIndex])
      const nextValidIndex = (currentValidIndex + 1) % validSpecs.length
      const nextSpec = validSpecs[nextValidIndex]
      const newIndex = specs.indexOf(nextSpec)
      
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
                
                // Shuffle questions/sentences/activities within each set
                if (Array.isArray(json)) {
                  // Handle array of games (e.g., fillblanks-set.json)
                  const shuffledGames = shuffleArray(json)

                  console.log(`  Expanding into ${shuffledGames.length} separate specs`)

                  // Return multiple specs, one for each game in the array
                  return shuffledGames.map((game: any, index: number) => {
                    // Shuffle sentences within each game
                    if (game.questions) {
                      game.questions = shuffleArray(game.questions)
                    } else if (game.sentences) {
                      game.sentences = shuffleArray(game.sentences)
                    } else if (game.activities) {
                      game.activities = shuffleArray(game.activities)
                    }

                    return {
                      label: `${spec.label} (${index + 1})`,
                      path: `${spec.path}#${index}`,
                      source: game,
                      error: undefined,
                    }
                  })
                }

                const shuffledJson = typeof json === 'object' && json !== null ? { ...(json as any) } : json
                if (shuffledJson && typeof shuffledJson === 'object') {
                  const data = shuffledJson as any
                  if (data.questions) {
                    data.questions = shuffleArray(data.questions)
                  } else if (data.sentences) {
                    data.sentences = shuffleArray(data.sentences)
                  } else if (data.activities) {
                    data.activities = shuffleArray(data.activities)
                  }
                }
                
                return [{ ...spec, source: shuffledJson }]
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
            // Start with the first spec (already randomized)
            const validSpecs = loaded.filter(s => !s.error && s.source)
            console.log('Valid specs:', validSpecs.length)
            if (validSpecs.length > 0) {
              const firstValidIndex = loaded.indexOf(validSpecs[0])
              console.log('Setting currentSpecIndex to:', firstValidIndex)
              setCurrentSpecIndex(firstValidIndex)
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
    if (currentSpecIndex === null) {
      console.warn('currentSpecIndex is null')
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
            
            {/* Overall Progress Tracker - Minimal dots + percentage */}
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-4 py-2">
                <div className="flex items-center gap-3">
                  {/* Dots for each question */}
                  <div className="flex items-center gap-1">
                    {overallProgress.allQuestions.map((question) => {
                      return (
                        <div
                          key={`${question.gameId}-${question.questionId}`}
                          className={`h-2 w-2 rounded-full transition-all duration-300 ${
                            question.isAnswered
                              ? question.isCorrect 
                                ? 'bg-green-500 dark:bg-green-400' 
                                : 'bg-red-500 dark:bg-red-400'
                              : 'bg-slate-300 dark:bg-slate-600'
                          }`}
                          title={`${question.gameId} - ${question.questionId}: ${question.isAnswered ? (question.isCorrect ? 'Correct' : 'Incorrect') : 'Not answered'}`}
                        />
                      )
                    })}
                  </div>
                  
                  {/* Percentage correct */}
                  {overallProgress.answeredQuestions > 0 && (
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {overallProgress.percentageCorrect}%
                    </span>
                  )}
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

        {!loading && !fetchError && currentSpecIndex !== null && specs[currentSpecIndex]?.error && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-950/50 dark:text-yellow-200">
            <p className="font-semibold">Failed to load game</p>
            <p className="mt-1">{specs[currentSpecIndex].error}</p>
          </div>
        )}

        {!loading && !fetchError && activeSpec && currentSpecIndex !== null && specs[currentSpecIndex] ? (
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

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 max-w-2xl w-full animate-scale-in rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-100 p-8 shadow-2xl dark:border-emerald-500/40 dark:from-emerald-950/50 dark:to-green-900/30">
            {/* Celebration Header */}
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-4xl text-white animate-bounce">
                🎉
              </div>
              <h2 className="text-3xl font-bold text-emerald-800 dark:text-emerald-200">
                Congratulations!
              </h2>
              <p className="mt-2 text-lg text-emerald-700 dark:text-emerald-300">
                You've completed all {overallProgress.totalQuestions} questions!
              </p>
            </div>

            {/* OMI Mastery Summary */}
            <div className="mb-6 rounded-xl bg-white/50 p-6 dark:bg-slate-800/50">
              <h3 className="mb-4 text-xl font-bold text-slate-800 dark:text-slate-100">
                Skills Demonstrated
              </h3>
              
              {assessmentMetadata?.omiList && assessmentMetadata.omiList.length > 0 ? (
                <div className="space-y-3">
                  {assessmentMetadata.omiList.map((omi) => {
                    const progress = omiProgress[omi.id]
                    const mastery = progress?.masteryLevel || 'not-yet'
                    const masteryLabels = {
                      'mastered': { label: 'Mastered', color: 'text-emerald-600 dark:text-emerald-400', icon: '●' },
                      'proficient': { label: 'Proficient', color: 'text-indigo-600 dark:text-indigo-400', icon: '◑' },
                      'emerging': { label: 'Emerging', color: 'text-blue-600 dark:text-blue-400', icon: '◔' },
                      'not-yet': { label: 'Not Yet', color: 'text-slate-500 dark:text-slate-400', icon: '○' },
                    }
                    const config = masteryLabels[mastery]
                    
                    return (
                      <div key={omi.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{omi.name}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{omi.description}</p>
                        </div>
                        <div className={`flex items-center gap-2 ${config.color}`}>
                          <span className="text-lg">{config.icon}</span>
                          <span className="font-bold">{config.label}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-slate-600 dark:text-slate-400">No OMI data available</p>
              )}
            </div>

            {/* Stats Summary */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-white/70 p-4 text-center dark:bg-slate-800/70">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {overallProgress.percentageCorrect}%
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Accuracy</p>
              </div>
              <div className="rounded-lg bg-white/70 p-4 text-center dark:bg-slate-800/70">
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {overallProgress.correctQuestions}/{overallProgress.totalQuestions}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Correct Answers</p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowCompletionModal(false)}
              className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:from-emerald-700 hover:to-green-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
