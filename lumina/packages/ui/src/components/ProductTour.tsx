'use client';

/**
 * ProductTour Component
 * STUBBED: react-joyride is incompatible with React 19
 * TODO: Replace with React 19 compatible tour library when available
 *
 * Original functionality: Guides new users through the app after onboarding
 */

export interface ProductTourProps {
  /** Whether the tour should be running */
  run: boolean;
  /** Callback when tour is completed or skipped */
  onComplete: () => void;
}

/**
 * Stubbed ProductTour - renders nothing
 * react-joyride uses deprecated React APIs (unmountComponentAtNode, unstable_renderSubtreeIntoContainer)
 * that were removed in React 19
 */
export function ProductTour({ run, onComplete }: ProductTourProps) {
  // Auto-complete the tour since we can't show it
  if (run) {
    // Use setTimeout to avoid calling during render
    setTimeout(() => onComplete(), 0);
  }
  return null;
}

export default ProductTour;
