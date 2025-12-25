import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from '../components';
import type { EyeExercise, ExerciseSession } from '../types';

/**
 * Eye Exercises View - guided eye exercises with timer
 */
export function ExercisesView() {
  const [exercises, setExercises] = useState<EyeExercise[]>([]);
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [stats, setStats] = useState<{
    todaySessions: number;
    todayMinutes: number;
    weekSessions: number;
    weekMinutes: number;
    totalSessions: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeExercise, setActiveExercise] = useState<EyeExercise | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [exerciseList, sessionList, exerciseStats] = await Promise.all([
          window.lumina.exercises.getAll(),
          window.lumina.exercises.getSessions(30),
          window.lumina.exercises.getStats(7),
        ]);
        setExercises(exerciseList);
        setSessions(sessionList);
        setStats(exerciseStats);
      } catch (error) {
        console.error('Failed to load exercises:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Timer logic
  useEffect(() => {
    if (!activeExercise || isPaused || isComplete) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          const steps = activeExercise.instructions;
          if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
            return steps[currentStepIndex + 1].duration;
          } else {
            setIsComplete(true);
            if (sessionId) {
              window.lumina.exercises.completeSession(sessionId);
            }
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [activeExercise, isPaused, isComplete, currentStepIndex, sessionId]);

  const handleStartExercise = async (exercise: EyeExercise) => {
    try {
      const result = await window.lumina.exercises.startSession(exercise.id);
      if (result.success && result.sessionId) {
        setSessionId(result.sessionId);
        setActiveExercise(exercise);
        setCurrentStepIndex(0);
        setCountdown(exercise.instructions[0]?.duration ?? 5);
        setIsPaused(false);
        setIsComplete(false);
      }
    } catch (error) {
      console.error('Failed to start exercise:', error);
    }
  };

  const handleCloseModal = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setActiveExercise(null);
    setSessionId(null);
    setCurrentStepIndex(0);
    setCountdown(0);
    setIsPaused(false);
    setIsComplete(false);
    // Refresh stats
    const [sessionList, exerciseStats] = await Promise.all([
      window.lumina.exercises.getSessions(30),
      window.lumina.exercises.getStats(7),
    ]);
    setSessions(sessionList);
    setStats(exerciseStats);
  }, []);

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'relaxation': return 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300';
      case 'focus': return 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300';
      case 'mobility': return 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300';
      case 'strain_relief': return 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300';
      default: return 'bg-secondary text-foreground/80';
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300';
      case 'intermediate': return 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300';
      case 'advanced': return 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300';
      default: return 'bg-secondary text-foreground/80';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-muted-foreground">Loading exercises...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Today</div>
          <div className="text-2xl font-bold text-foreground">{stats?.todayMinutes ?? 0} min</div>
          <div className="text-xs text-muted-foreground/70">{stats?.todaySessions ?? 0} sessions</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">This Week</div>
          <div className="text-2xl font-bold text-foreground">{stats?.weekMinutes ?? 0} min</div>
          <div className="text-xs text-muted-foreground/70">{stats?.weekSessions ?? 0} sessions</div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-2xl font-bold text-foreground">{stats?.totalSessions ?? 0}</div>
          <div className="text-xs text-muted-foreground/70">exercises completed</div>
        </div>
      </div>

      {/* Exercise Grid */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">All Exercises</h2>
        <div className="grid grid-cols-2 gap-4">
          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              className="bg-card rounded-xl p-4 border border-border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground flex-shrink-0">
                  <Icons.Eye />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">{exercise.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{exercise.description}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(exercise.category)}`}>
                      {exercise.category.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getDifficultyBadge(exercise.difficulty)}`}>
                      {exercise.difficulty}
                    </span>
                    <span className="text-xs text-muted-foreground/70 flex items-center gap-1">
                      <Icons.Clock />
                      {exercise.durationSeconds}s
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleStartExercise(exercise)}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-neutral-200 text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-300 transition-colors"
              >
                <Icons.Play />
                Start Exercise
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {sessions.length > 0 && (
        <div className="bg-card rounded-xl border border-border">
          <div className="px-4 py-3 border-b border-border/50">
            <h2 className="font-semibold text-foreground">Recent Activity</h2>
          </div>
          <div className="divide-y divide-border/50">
            {sessions.slice(0, 5).map((session) => {
              const exercise = exercises.find((e) => e.id === session.exercise_id);
              return (
                <div key={session.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                    <Icons.Eye />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {exercise?.name ?? 'Unknown Exercise'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(session.started_at).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.status === 'completed' ? (
                      <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                        <Icons.Check />
                        Completed
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground/70">{session.status}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Exercise Modal */}
      {activeExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">{activeExercise.name}</h3>
              <button
                onClick={handleCloseModal}
                className="text-muted-foreground/70 hover:text-muted-foreground"
              >
                <Icons.X />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {isComplete ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-950/50 rounded-full flex items-center justify-center text-green-500 mb-4">
                    <Icons.Check />
                  </div>
                  <h4 className="text-xl font-semibold text-foreground mb-2">Great job!</h4>
                  <p className="text-muted-foreground mb-6">
                    You completed the {activeExercise.name} exercise.
                  </p>
                  <button
                    onClick={handleCloseModal}
                    className="px-6 py-2 bg-neutral-900 dark:bg-neutral-200 text-white dark:text-neutral-900 rounded-lg font-medium hover:bg-neutral-800 dark:hover:bg-neutral-300"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {/* Countdown display */}
                  <div className="text-center mb-6">
                    <div className="w-32 h-32 mx-auto rounded-full bg-secondary flex items-center justify-center mb-4">
                      <span className="text-5xl font-bold text-foreground">{countdown}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">seconds remaining</p>
                  </div>

                  {/* Current step */}
                  <div className="bg-muted/50 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-neutral-900 dark:bg-neutral-200 text-white dark:text-neutral-900 text-sm font-medium flex items-center justify-center">
                        {currentStepIndex + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Step {currentStepIndex + 1} of {activeExercise.instructions.length}
                      </span>
                    </div>
                    <p className="text-lg font-medium text-foreground">
                      {activeExercise.instructions[currentStepIndex]?.text}
                    </p>
                  </div>

                  {/* Progress dots */}
                  <div className="flex justify-center gap-2 mb-6">
                    {activeExercise.instructions.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === currentStepIndex
                            ? 'bg-foreground'
                            : idx < currentStepIndex
                            ? 'bg-green-500'
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Controls */}
                  <div className="flex gap-3">
                    <button
                      onClick={togglePause}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg text-foreground/80 font-medium hover:bg-muted/50"
                    >
                      {isPaused ? <><Icons.Play /> Resume</> : <><Icons.Pause /> Pause</>}
                    </button>
                    <button
                      onClick={handleCloseModal}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-lg font-medium hover:bg-red-50 dark:hover:bg-red-950/50"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExercisesView;
