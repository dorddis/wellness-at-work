'use client';

import { useEffect } from 'react';
import {
  useFloating,
  offset,
  flip,
  shift,
  arrow,
  autoUpdate,
  FloatingArrow,
} from '@floating-ui/react';
import { motion, AnimatePresence } from 'motion/react';
import { useRef } from 'react';
import type { TourStep } from './types';

interface TourTooltipProps {
  /** Target element to position relative to */
  targetElement: HTMLElement | null;
  /** Current step data */
  step: TourStep | null;
  /** Current step number (1-based for display) */
  stepNumber: number;
  /** Total number of steps */
  totalSteps: number;
  /** Whether the tooltip is visible */
  isVisible: boolean;
  /** Go to next step */
  onNext: () => void;
  /** Go to previous step */
  onPrev: () => void;
  /** Skip the tour */
  onSkip: () => void;
}

/**
 * TourTooltip Component
 *
 * Positioned tooltip that appears next to the spotlighted element.
 * Uses @floating-ui/react for smart positioning with arrow.
 */
export function TourTooltip({
  targetElement,
  step,
  stepNumber,
  totalSteps,
  isVisible,
  onNext,
  onPrev,
  onSkip,
}: TourTooltipProps) {
  const arrowRef = useRef(null);

  // Convert our position to floating-ui placement
  const placement =
    step?.position === 'top'
      ? 'top'
      : step?.position === 'bottom'
        ? 'bottom'
        : step?.position === 'left'
          ? 'left'
          : 'right';

  const { refs, floatingStyles, context } = useFloating({
    open: isVisible && !!targetElement,
    placement,
    middleware: [
      offset(16), // Gap between target and tooltip
      flip({ padding: 16 }), // Flip if not enough space
      shift({ padding: 16 }), // Shift to stay in viewport
      arrow({ element: arrowRef }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Sync target element with floating-ui
  useEffect(() => {
    if (targetElement) {
      refs.setReference(targetElement);
    }
  }, [targetElement, refs]);

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onSkip();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onNext();
          break;
        case 'ArrowRight':
          e.preventDefault();
          onNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (stepNumber > 1) onPrev();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, stepNumber, onNext, onPrev, onSkip]);

  const isFirstStep = stepNumber === 1;
  const isLastStep = stepNumber === totalSteps;

  return (
    <AnimatePresence>
      {isVisible && targetElement && step && (
        <motion.div
          ref={refs.setFloating}
          style={floatingStyles}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="z-[9999] w-80 bg-white rounded-xl border border-gray-200 shadow-xl pointer-events-auto"
          role="dialog"
          aria-labelledby="tour-title"
          aria-describedby="tour-description"
        >
          {/* Arrow */}
          <FloatingArrow
            ref={arrowRef}
            context={context}
            className="fill-white [&>path:first-of-type]:stroke-gray-200"
            width={16}
            height={8}
          />

          {/* Content */}
          <div className="p-5">
            {/* Header with step indicator */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Step {stepNumber} of {totalSteps}
              </span>
              <button
                onClick={onSkip}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Skip tour"
              >
                Skip tour
              </button>
            </div>

            {/* Title */}
            <h3
              id="tour-title"
              className="text-lg font-semibold text-gray-900 mb-2"
            >
              {step.title}
            </h3>

            {/* Description */}
            <p id="tour-description" className="text-sm text-gray-500 mb-5">
              {step.description}
            </p>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-1.5 mb-4">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === stepNumber - 1 ? 'bg-gray-900' : 'bg-gray-200'
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-3">
              {!isFirstStep && (
                <button
                  onClick={onPrev}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={onNext}
                className={`${isFirstStep ? 'flex-1' : 'flex-[2]'} px-4 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors`}
              >
                {isLastStep ? 'Done' : 'Next'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TourTooltip;
