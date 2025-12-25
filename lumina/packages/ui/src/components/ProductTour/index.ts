// Main component
export { ProductTour, default } from './ProductTour';
export type { ProductTourProps } from './ProductTour';

// Context and hooks
export { TourProvider, TourContext, useTour, useTourOptional } from './TourContext';
export type { TourContextValue, TourProviderProps } from './TourContext';

// Tour element wrapper
export { TourElement } from './TourElement';
export type { TourElementProps } from './TourElement';

// Individual components (for advanced use)
export { TourOverlay } from './TourOverlay';
export { TourTooltip } from './TourTooltip';

// Step definitions
export {
  LuminaTour,
  TOUR_STEPS,
  TOUR_STEP_ORDER,
  type TourStepConfig,
  type ViewType,
} from './tourSteps';
