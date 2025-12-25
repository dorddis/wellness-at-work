/**
 * Core types for the hub application
 * Extracted from App.tsx for modularity
 */

/**
 * Authenticated user with organization info
 */
export interface AuthUser {
  id: string;
  email: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    role: 'admin' | 'manager' | 'employee';
    department: string | null;
  } | null;
}

/**
 * Navigation view identifiers
 */
export type View = 'dashboard' | 'monitor' | 'exercises' | 'history' | 'meetingMode' | 'settings';

/**
 * Wellness event types for database logging
 */
export type WellnessEventType =
  | 'yawn'
  | 'posture_too_close'
  | 'posture_too_far'
  | 'posture_head_tilt'
  | 'posture_forward_lean'
  | 'drowsiness_mild'
  | 'drowsiness_moderate'
  | 'drowsiness_severe';

/**
 * Database write queue entry types
 * Used for batching writes to reduce render thread blocking
 */
export type DatabaseWrite =
  | { type: 'blink'; timestamp: number; ear: number; detected: boolean }
  | { type: 'wellness'; timestamp: number; eventType: WellnessEventType; payload: Record<string, unknown> }
  | { type: 'rollup'; timestamp: number; blinkCount: number; avgEar: number | null };

/**
 * Exercise step for guided eye exercises
 */
export interface ExerciseStep {
  step: number;
  text: string;
  duration: number;
}

/**
 * Eye exercise definition
 */
export interface EyeExercise {
  id: string;
  name: string;
  description: string;
  category: 'relaxation' | 'focus' | 'mobility' | 'strain_relief';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  durationSeconds: number;
  iconName: string;
  instructions: ExerciseStep[];
}

/**
 * Completed exercise session record
 */
export interface ExerciseSession {
  id?: number;
  exercise_id: string;
  started_at: number;
  completed_at: number | null;
  status: 'in_progress' | 'completed' | 'cancelled';
}

/**
 * Daily aggregated data for history view
 */
export interface DailyData {
  date: string;
  totalBlinks: number;
  avgBlinkRate: number;
  avgEar: number;
  minuteCount: number;
}
