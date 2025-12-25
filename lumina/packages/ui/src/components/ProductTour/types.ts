'use client';

/**
 * Product Tour Types
 * Type definitions for the guided product tour system
 */

export type ViewType = 'dashboard' | 'meetingMode' | 'history' | 'settings';

export interface TourStep {
  /** Unique identifier for the step */
  id: string;
  /** CSS selector for the target element (e.g., '[data-tour="wellness-score"]') */
  target: string;
  /** Title displayed in the tooltip */
  title: string;
  /** Description text explaining the feature */
  description: string;
  /** Which view this step is on (for navigation) */
  view: ViewType;
  /** Preferred tooltip position */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Extra padding around the spotlight cutout */
  spotlightPadding?: number;
}

export interface TourState {
  /** Whether the tour is currently active */
  isActive: boolean;
  /** Current step index (0-based) */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Go to next step */
  next: () => void;
  /** Go to previous step */
  prev: () => void;
  /** Skip the tour entirely */
  skip: () => void;
  /** Complete the tour */
  complete: () => void;
  /** Go to a specific step */
  goToStep: (index: number) => void;
}

export interface ProductTourProps {
  /** Whether the tour should be running */
  run: boolean;
  /** Callback when tour is completed or skipped */
  onComplete: () => void;
  /** Callback to navigate between views */
  onNavigate?: (view: ViewType) => void;
  /** Current active view */
  currentView?: ViewType;
}
