'use client';

import React, {
  createContext,
  useContext,
  useReducer,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { LuminaTour, TOUR_STEP_ORDER, TOUR_STEPS, type ViewType } from './tourSteps';

// ============================================================================
// Types
// ============================================================================

interface TourState {
  /** Whether the tour is currently active */
  isActive: boolean;
  /** Current step index */
  currentStepIndex: number;
  /** Whether all steps have registered */
  isReady: boolean;
}

type TourAction =
  | { type: 'START' }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'SKIP' }
  | { type: 'COMPLETE' }
  | { type: 'SET_READY' }
  | { type: 'GO_TO'; index: number };

interface RegisteredStep {
  id: LuminaTour;
  element: HTMLElement;
}

export interface TourContextValue {
  /** Current tour state */
  state: TourState;
  /** Currently active step ID (null if not on any step) */
  currentStepId: LuminaTour | null;
  /** Current step config */
  currentStep: (typeof TOUR_STEPS)[LuminaTour] | null;
  /** Total number of steps */
  totalSteps: number;
  /** Register a tour element */
  register: (id: LuminaTour, element: HTMLElement) => void;
  /** Unregister a tour element */
  unregister: (id: LuminaTour) => void;
  /** Get the element for a step */
  getElement: (id: LuminaTour) => HTMLElement | undefined;
  /** Go to next step */
  next: () => void;
  /** Go to previous step */
  prev: () => void;
  /** Skip the tour */
  skip: () => void;
  /** Complete the tour */
  complete: () => void;
}

// ============================================================================
// Context
// ============================================================================

export const TourContext = createContext<TourContextValue | null>(null);

// ============================================================================
// Reducer
// ============================================================================

function tourReducer(state: TourState, action: TourAction): TourState {
  switch (action.type) {
    case 'START':
      return { ...state, isActive: true, currentStepIndex: 0 };
    case 'NEXT':
      if (state.currentStepIndex >= TOUR_STEP_ORDER.length - 1) {
        return { ...state, isActive: false };
      }
      return { ...state, currentStepIndex: state.currentStepIndex + 1 };
    case 'PREV':
      if (state.currentStepIndex <= 0) return state;
      return { ...state, currentStepIndex: state.currentStepIndex - 1 };
    case 'SKIP':
    case 'COMPLETE':
      return { ...state, isActive: false };
    case 'SET_READY':
      return { ...state, isReady: true };
    case 'GO_TO':
      if (action.index < 0 || action.index >= TOUR_STEP_ORDER.length) return state;
      return { ...state, currentStepIndex: action.index };
    default:
      return state;
  }
}

// ============================================================================
// Provider
// ============================================================================

export interface TourProviderProps {
  children: ReactNode;
  /** Whether the tour should be enabled */
  enabled?: boolean;
  /** Callback when tour is completed or skipped */
  onComplete?: () => void;
  /** Callback to navigate between views */
  onNavigate?: (view: ViewType) => void;
}

export function TourProvider({
  children,
  enabled = true,
  onComplete,
  onNavigate,
}: TourProviderProps) {
  const [state, dispatch] = useReducer(tourReducer, {
    isActive: false,
    currentStepIndex: 0,
    isReady: false,
  });

  // Use ref for registered steps to avoid re-renders on registration
  const registeredStepsRef = useRef<Map<LuminaTour, HTMLElement>>(new Map());
  const expectedStepsRef = useRef<Set<LuminaTour>>(new Set());

  // Use ref for current step index to avoid recreating callbacks
  const currentStepIndexRef = useRef(state.currentStepIndex);
  currentStepIndexRef.current = state.currentStepIndex;

  // Calculate current step
  const currentStepId = state.isActive ? TOUR_STEP_ORDER[state.currentStepIndex] : null;
  const currentStep = currentStepId ? TOUR_STEPS[currentStepId] : null;

  // Handle view navigation when step changes
  useEffect(() => {
    if (currentStep && onNavigate) {
      onNavigate(currentStep.view);
    }
  }, [currentStep, onNavigate]);

  // Register a step element
  const register = useCallback((id: LuminaTour, element: HTMLElement) => {
    registeredStepsRef.current.set(id, element);
    expectedStepsRef.current.add(id);

    // Check if all expected steps are registered
    // We use a small delay to batch registrations
    setTimeout(() => {
      const allStepsPresent = TOUR_STEP_ORDER.every(
        (stepId) =>
          !expectedStepsRef.current.has(stepId) ||
          registeredStepsRef.current.has(stepId)
      );
      if (allStepsPresent && registeredStepsRef.current.size > 0) {
        dispatch({ type: 'SET_READY' });
      }
    }, 100);
  }, []);

  // Unregister a step element
  const unregister = useCallback((id: LuminaTour) => {
    registeredStepsRef.current.delete(id);
  }, []);

  // Get element for a step
  const getElement = useCallback((id: LuminaTour) => {
    return registeredStepsRef.current.get(id);
  }, []);

  // Actions - use refs to keep callbacks stable
  const next = useCallback(() => {
    if (currentStepIndexRef.current >= TOUR_STEP_ORDER.length - 1) {
      dispatch({ type: 'COMPLETE' });
      onComplete?.();
    } else {
      dispatch({ type: 'NEXT' });
    }
  }, [onComplete]);

  const prev = useCallback(() => {
    dispatch({ type: 'PREV' });
  }, []);

  const skip = useCallback(() => {
    dispatch({ type: 'SKIP' });
    onComplete?.();
  }, [onComplete]);

  const complete = useCallback(() => {
    dispatch({ type: 'COMPLETE' });
    onComplete?.();
  }, [onComplete]);

  // Start tour when ready and enabled
  useEffect(() => {
    if (enabled && state.isReady && !state.isActive) {
      dispatch({ type: 'START' });
    }
  }, [enabled, state.isReady, state.isActive]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<TourContextValue>(
    () => ({
      state,
      currentStepId,
      currentStep,
      totalSteps: TOUR_STEP_ORDER.length,
      register,
      unregister,
      getElement,
      next,
      prev,
      skip,
      complete,
    }),
    [state, currentStepId, currentStep, register, unregister, getElement, next, prev, skip, complete]
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useTour(): TourContextValue {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}

export function useTourOptional(): TourContextValue | null {
  return useContext(TourContext);
}
