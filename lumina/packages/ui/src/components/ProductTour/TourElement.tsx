'use client';

import React, { useEffect, useRef, type ReactNode } from 'react';
import { useTourOptional } from './TourContext';
import { type LuminaTour } from './tourSteps';

export interface TourElementProps {
  /** The step ID this element represents */
  stepId: LuminaTour;
  /** Children to wrap */
  children: ReactNode;
  /** Optional className to add to wrapper */
  className?: string;
}

/**
 * TourElement - Wrapper component for tour steps
 *
 * Key design decisions (from Sentry's approach):
 * 1. Self-registers with TourProvider on mount
 * 2. Uses CSS attributes for styling (no React re-renders)
 * 3. Never re-parents children
 * 4. Uses aria-expanded for accessibility
 */
export function TourElement({ stepId, children, className = '' }: TourElementProps) {
  const ref = useRef<HTMLDivElement>(null);
  const tour = useTourOptional();

  // Extract stable functions to avoid re-running effect on every step change
  const register = tour?.register;
  const unregister = tour?.unregister;

  // Self-register with provider - only runs once on mount
  useEffect(() => {
    if (!register || !unregister || !ref.current) return;

    register(stepId, ref.current);

    return () => {
      unregister(stepId);
    };
  }, [stepId, register, unregister]);

  // Determine if this element is currently active
  const isActive = tour?.currentStepId === stepId;

  return (
    <div
      ref={ref}
      className={className}
      data-tour-step={stepId}
      data-tour-active={isActive ? 'true' : undefined}
      aria-expanded={isActive}
      style={{
        // Ensure proper stacking when active
        position: isActive ? 'relative' : undefined,
      }}
    >
      {children}
    </div>
  );
}

export default TourElement;
