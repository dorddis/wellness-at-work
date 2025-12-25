'use client';

import React from 'react';
import { TourProvider, type TourProviderProps } from './TourContext';
import { TourOverlay } from './TourOverlay';
import { TourTooltip } from './TourTooltip';
import './tour.css';

export interface ProductTourProps extends TourProviderProps {
  /** Whether the tour should be running (for backward compatibility) */
  run?: boolean;
}

/**
 * ProductTour - Main tour orchestrator
 *
 * Combines TourProvider, TourOverlay, and TourTooltip into a single component.
 * Wrap your app content with this component and use TourElement to mark
 * tour steps.
 *
 * Architecture based on Sentry Engineering Blog:
 * - Context + useReducer for state
 * - CSS-only styling via data attributes
 * - Self-registering tour elements
 * - Never re-parents children
 *
 * @example
 * ```tsx
 * <ProductTour
 *   enabled={hasCompletedOnboarding && !hasCompletedProductTour}
 *   onComplete={setProductTourComplete}
 *   onNavigate={setActiveView}
 * >
 *   <TourElement stepId={LuminaTour.WELLNESS_SCORE}>
 *     <WellnessScoreCard />
 *   </TourElement>
 *   ...
 * </ProductTour>
 * ```
 */
export function ProductTour({
  children,
  run,
  enabled = true,
  onComplete,
  onNavigate,
}: ProductTourProps) {
  // Support both 'run' (old API) and 'enabled' (new API)
  const isEnabled = run !== undefined ? run : enabled;

  return (
    <TourProvider
      enabled={isEnabled}
      onComplete={onComplete}
      onNavigate={onNavigate}
    >
      {children}
      <TourOverlay />
      <TourTooltip />
    </TourProvider>
  );
}

export default ProductTour;
