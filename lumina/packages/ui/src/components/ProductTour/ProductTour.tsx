'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useTour } from './useTour';
import { TourOverlay } from './TourOverlay';
import { TourTooltip } from './TourTooltip';
import type { ProductTourProps } from './types';

/**
 * ProductTour Component
 *
 * Orchestrates the guided product tour experience.
 * Shows a spotlight overlay and positioned tooltip for each step.
 *
 * Based on customer retention research:
 * - 46% of wellness apps are abandoned
 * - Gamification drives 22% better retention
 * - Alert fatigue is #1 killer
 *
 * The tour highlights retention-driving features in ~75 seconds.
 */
export function ProductTour({
  run,
  onComplete,
  onNavigate,
  currentView = 'dashboard',
}: ProductTourProps) {
  const [mounted, setMounted] = useState(false);

  // Ensure we only render portal on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    isActive,
    currentStep,
    totalSteps,
    next,
    prev,
    skip,
    currentStepData,
    targetElement,
  } = useTour({
    onComplete,
    onNavigate,
    currentView,
  });

  // Don't render if not running or not mounted
  if (!run || !isActive || !mounted) {
    return null;
  }

  // Render tour in portal to ensure it's above everything
  return createPortal(
    <>
      {/* Overlay with spotlight cutout */}
      <TourOverlay
        targetElement={targetElement}
        isVisible={!!currentStepData}
        padding={currentStepData?.spotlightPadding ?? 8}
      />

      {/* Positioned tooltip */}
      <TourTooltip
        targetElement={targetElement}
        step={currentStepData}
        stepNumber={currentStep + 1}
        totalSteps={totalSteps}
        isVisible={!!currentStepData && !!targetElement}
        onNext={next}
        onPrev={prev}
        onSkip={skip}
      />
    </>,
    document.body
  );
}

export default ProductTour;
