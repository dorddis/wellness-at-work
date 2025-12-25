'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { TourStep, TourState, ViewType } from './types';
import { TOUR_STEPS } from './tourSteps';

interface UseTourOptions {
  /** Callback when the tour is completed */
  onComplete: () => void;
  /** Callback to navigate between views */
  onNavigate?: (view: ViewType) => void;
  /** Current active view */
  currentView?: ViewType;
}

/**
 * Hook to manage product tour state
 *
 * Handles step progression, view navigation, and completion tracking.
 */
export function useTour({
  onComplete,
  onNavigate,
  currentView = 'dashboard',
}: UseTourOptions): TourState & {
  currentStepData: TourStep | null;
  targetElement: HTMLElement | null;
} {
  const [isActive, setIsActive] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const navigationPendingRef = useRef(false);

  const totalSteps = TOUR_STEPS.length;
  const currentStepData = isActive ? TOUR_STEPS[currentStep] : null;

  // Find and highlight target element when step changes
  useEffect(() => {
    if (!isActive || !currentStepData) {
      setTargetElement(null);
      return;
    }

    // Check if we need to navigate to a different view
    if (currentStepData.view !== currentView) {
      if (!navigationPendingRef.current && onNavigate) {
        navigationPendingRef.current = true;
        onNavigate(currentStepData.view);
      }
      // Wait for navigation to complete
      setTargetElement(null);
      return;
    }

    // Reset navigation pending flag once we're on the correct view
    navigationPendingRef.current = false;

    // Small delay to allow DOM to update after view change
    const timeoutId = setTimeout(() => {
      const element = document.querySelector(currentStepData.target);
      if (element instanceof HTMLElement) {
        setTargetElement(element);

        // Scroll element into view if needed
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        });
      } else {
        // Element not found - skip to next step or complete
        console.warn(`Tour target not found: ${currentStepData.target}`);
        setTargetElement(null);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isActive, currentStep, currentStepData, currentView, onNavigate]);

  const next = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Last step - complete the tour
      setIsActive(false);
      onComplete();
    }
  }, [currentStep, totalSteps, onComplete]);

  const prev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const skip = useCallback(() => {
    setIsActive(false);
    onComplete();
  }, [onComplete]);

  const complete = useCallback(() => {
    setIsActive(false);
    onComplete();
  }, [onComplete]);

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalSteps) {
        setCurrentStep(index);
      }
    },
    [totalSteps]
  );

  return {
    isActive,
    currentStep,
    totalSteps,
    next,
    prev,
    skip,
    complete,
    goToStep,
    currentStepData,
    targetElement,
  };
}

export default useTour;
