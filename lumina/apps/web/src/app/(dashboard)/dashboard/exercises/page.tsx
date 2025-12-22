'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Eye,
  Play,
  Pause,
  X,
  Clock,
  Target,
  RotateCw,
  Hand,
  Infinity,
  EyeOff,
  CheckCircle,
  Loader2,
  Timer,
  Award,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../../providers';
import {
  getEyeExercises,
  getMyExerciseSessions,
  startExerciseSession,
  completeExerciseSession,
  type EyeExercise,
  type ExerciseSession,
} from '@lumina/api';

// Map icon names from database to Lucide components
const iconMap: Record<string, React.ReactNode> = {
  Eye: <Eye className="w-8 h-8" />,
  RotateCw: <RotateCw className="w-8 h-8" />,
  Hand: <Hand className="w-8 h-8" />,
  Target: <Target className="w-8 h-8" />,
  Infinity: <Infinity className="w-8 h-8" />,
  EyeOff: <EyeOff className="w-8 h-8" />,
};

interface ExerciseStep {
  step: number;
  text: string;
  duration: number;
}

export default function ExercisesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<EyeExercise[]>([]);
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [activeExercise, setActiveExercise] = useState<EyeExercise | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        setLoading(true);
        const [exerciseList, sessionList] = await Promise.all([
          getEyeExercises(),
          getMyExerciseSessions(30),
        ]);
        setExercises(exerciseList);
        setSessions(sessionList);
      } catch (error) {
        console.error('Failed to load exercises:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

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
          // Move to next step
          const steps = activeExercise.instructions as ExerciseStep[];
          if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
            return steps[currentStepIndex + 1].duration;
          } else {
            // Exercise complete
            setIsComplete(true);
            if (sessionId) {
              completeExerciseSession(sessionId).catch(console.error);
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
      const result = await startExerciseSession(exercise.id);
      if (result.success && result.sessionId) {
        setSessionId(result.sessionId);
        setActiveExercise(exercise);
        setCurrentStepIndex(0);
        const steps = exercise.instructions as ExerciseStep[];
        setCountdown(steps[0]?.duration ?? 5);
        setIsPaused(false);
        setIsComplete(false);
      }
    } catch (error) {
      console.error('Failed to start exercise:', error);
    }
  };

  const handleCloseModal = useCallback(() => {
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
    // Refresh sessions
    getMyExerciseSessions(30).then(setSessions).catch(console.error);
  }, []);

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  // Calculate stats
  const todayStr = new Date().toISOString().split('T')[0];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const todaySessions = sessions.filter(
    (s) => s.status === 'completed' && s.startedAt.startsWith(todayStr)
  );
  const weekSessions = sessions.filter(
    (s) => s.status === 'completed' && new Date(s.startedAt) >= weekAgo
  );

  const todayMinutes = Math.round(
    todaySessions.reduce((acc, s) => {
      const exercise = exercises.find((e) => e.id === s.exerciseId);
      return acc + (exercise?.durationSeconds ?? 0) / 60;
    }, 0)
  );

  const weekMinutes = Math.round(
    weekSessions.reduce((acc, s) => {
      const exercise = exercises.find((e) => e.id === s.exerciseId);
      return acc + (exercise?.durationSeconds ?? 0) / 60;
    }, 0)
  );

  const totalSessions = sessions.filter((s) => s.status === 'completed').length;

  // Get featured exercise (first one or highest sort order)
  const featuredExercise = exercises[0];

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'relaxation':
        return 'bg-blue-100 text-blue-700';
      case 'focus':
        return 'bg-purple-100 text-purple-700';
      case 'mobility':
        return 'bg-green-100 text-green-700';
      case 'strain_relief':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-700';
      case 'intermediate':
        return 'bg-amber-100 text-amber-700';
      case 'advanced':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading exercises...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Eye Exercises</h1>
        <p className="text-muted-foreground">
          Guided exercises to reduce eye strain and improve eye health
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Calendar className="w-5 h-5 text-blue-600" />}
          label="Today"
          value={`${todayMinutes} min`}
          subtext={`${todaySessions.length} sessions`}
        />
        <StatCard
          icon={<Timer className="w-5 h-5 text-green-600" />}
          label="This Week"
          value={`${weekMinutes} min`}
          subtext={`${weekSessions.length} sessions`}
        />
        <StatCard
          icon={<Award className="w-5 h-5 text-purple-600" />}
          label="Total"
          value={`${totalSessions}`}
          subtext="exercises completed"
        />
      </div>

      {/* Featured exercise */}
      {featuredExercise && (
        <div className="card p-6 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              {iconMap[featuredExercise.iconName ?? 'Eye'] ?? <Eye className="w-8 h-8" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-primary uppercase tracking-wide">
                  Featured Exercise
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-1">{featuredExercise.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {featuredExercise.description}
              </p>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(featuredExercise.category)}`}>
                  {featuredExercise.category.replace('_', ' ')}
                </span>
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {featuredExercise.durationSeconds}s
                </span>
                <button
                  onClick={() => handleStartExercise(featuredExercise)}
                  className="btn btn-primary py-1.5 px-4 text-sm ml-auto flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Start Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exercise grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">All Exercises</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exercises.map((exercise) => (
            <div key={exercise.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground flex-shrink-0">
                  {iconMap[exercise.iconName ?? 'Eye'] ?? <Eye className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{exercise.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {exercise.description}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(exercise.category)}`}>
                      {exercise.category.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getDifficultyBadge(exercise.difficulty)}`}>
                      {exercise.difficulty}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {exercise.durationSeconds}s
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleStartExercise(exercise)}
                className="btn btn-outline w-full mt-4 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Exercise
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      {sessions.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold">Recent Activity</h2>
          </div>
          <div className="card-body p-0">
            <div className="divide-y divide-border">
              {sessions.slice(0, 5).map((session) => {
                const exercise = exercises.find((e) => e.id === session.exerciseId);
                return (
                  <div key={session.id} className="flex items-center gap-4 px-6 py-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                      {exercise?.iconName ? (
                        iconMap[exercise.iconName] ?? <Eye className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{exercise?.name ?? 'Unknown Exercise'}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(session.startedAt).toLocaleDateString('en-US', {
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
                        <span className="flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          Completed
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">{session.status}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Exercise Modal */}
      {activeExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold">{activeExercise.name}</h3>
              <button
                onClick={handleCloseModal}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {isComplete ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <h4 className="text-xl font-semibold mb-2">Great job!</h4>
                  <p className="text-muted-foreground mb-6">
                    You completed the {activeExercise.name} exercise.
                  </p>
                  <button onClick={handleCloseModal} className="btn btn-primary">
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {/* Countdown display */}
                  <div className="text-center mb-6">
                    <div className="w-32 h-32 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <span className="text-5xl font-bold text-primary">{countdown}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">seconds remaining</p>
                  </div>

                  {/* Current step */}
                  <div className="bg-secondary/50 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center">
                        {currentStepIndex + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Step {currentStepIndex + 1} of{' '}
                        {(activeExercise.instructions as ExerciseStep[]).length}
                      </span>
                    </div>
                    <p className="text-lg font-medium">
                      {(activeExercise.instructions as ExerciseStep[])[currentStepIndex]?.text}
                    </p>
                  </div>

                  {/* Progress dots */}
                  <div className="flex justify-center gap-2 mb-6">
                    {(activeExercise.instructions as ExerciseStep[]).map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          idx === currentStepIndex
                            ? 'bg-primary'
                            : idx < currentStepIndex
                            ? 'bg-green-500'
                            : 'bg-border'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Controls */}
                  <div className="flex gap-3">
                    <button
                      onClick={togglePause}
                      className="btn btn-outline flex-1 flex items-center justify-center gap-2"
                    >
                      {isPaused ? (
                        <>
                          <Play className="w-4 h-4" />
                          Resume
                        </>
                      ) : (
                        <>
                          <Pause className="w-4 h-4" />
                          Pause
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCloseModal}
                      className="btn btn-outline flex-1 text-red-600 border-red-200 hover:bg-red-50"
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

function StatCard({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{subtext}</p>
        </div>
      </div>
    </div>
  );
}
