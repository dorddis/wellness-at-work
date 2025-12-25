'use client';

import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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
import { useTour } from './TourContext';

/**
 * TourTooltip - Positioned tooltip with navigation controls
 *
 * Note: We extract x/y from floatingStyles and pass them to framer-motion
 * because framer-motion's scale animation uses transform, which would
 * override Floating UI's transform: translate(...) positioning.
 */
export function TourTooltip() {
  const tour = useTour();
  const arrowRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Get placement from current step
  const placement = tour.currentStep?.position === 'top'
    ? 'top'
    : tour.currentStep?.position === 'bottom'
      ? 'bottom'
      : tour.currentStep?.position === 'left'
        ? 'left'
        : 'right';

  // Setup floating-ui
  const { refs, floatingStyles, context } = useFloating({
    placement,
    middleware: [
      offset(16),
      flip({ padding: 16 }),
      shift({ padding: 16 }),
      arrow({ element: arrowRef }),
    ],
    whileElementsMounted: autoUpdate,
  });

  // Track when we have a valid reference element
  // This state is needed because elements on different views might not be registered immediately
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(null);
  // Track when scroll is complete and tooltip is ready to show
  const [isReadyToShow, setIsReadyToShow] = useState(false);

  // Poll for element when step changes (handles view transitions)
  // Store stable references to avoid re-running effect
  const currentStepId = tour.currentStepId;
  const getElement = tour.getElement;
  const next = tour.next;

  useEffect(() => {
    if (!currentStepId) {
      setReferenceElement(null);
      setIsReadyToShow(false);
      return;
    }

    // Reset ready state when step changes
    setIsReadyToShow(false);

    // Try to get element immediately
    const element = getElement(currentStepId);
    if (element) {
      setReferenceElement(element);
      return;
    }

    // Element not found - poll until it's registered (view might be mounting)
    let attempts = 0;
    const maxAttempts = 20; // 2 seconds max
    const pollInterval = setInterval(() => {
      attempts++;
      const el = getElement(currentStepId);
      if (el) {
        setReferenceElement(el);
        clearInterval(pollInterval);
      } else if (attempts >= maxAttempts) {
        console.warn('[TourTooltip] Element not found after polling, skipping step:', currentStepId);
        clearInterval(pollInterval);
        // Skip to next step to prevent stuck overlay
        next();
      }
    }, 100);

    return () => clearInterval(pollInterval);
  }, [currentStepId, getElement, next]);

  // Scroll element into view, then show tooltip after scroll completes
  useLayoutEffect(() => {
    if (!referenceElement) return;

    refs.setReference(referenceElement);

    // Check if element is already fully visible in viewport
    const rect = referenceElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const padding = 50; // Space needed for tooltip

    // Element is visible if it's fully within viewport with padding for tooltip
    const isFullyVisible = rect.top >= padding && rect.bottom <= viewportHeight - padding;

    if (isFullyVisible) {
      // Element already in view - show immediately after a frame for floating-ui
      const rafId = requestAnimationFrame(() => {
        setIsReadyToShow(true);
      });
      return () => cancelAnimationFrame(rafId);
    } else {
      // Calculate how far we need to scroll
      const scrollDistance = Math.abs(
        rect.top < padding
          ? rect.top - padding
          : rect.bottom - (viewportHeight - padding)
      );

      // Scroll into view
      referenceElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });

      // Wait time proportional to scroll distance (min 100ms, max 400ms)
      const waitTime = Math.min(400, Math.max(100, scrollDistance * 0.5));

      const scrollTimeout = setTimeout(() => {
        setIsReadyToShow(true);
      }, waitTime);

      return () => clearTimeout(scrollTimeout);
    }
  }, [referenceElement, refs]);

  // Keyboard navigation
  useEffect(() => {
    if (!tour.state.isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          tour.skip();
          break;
        case 'Enter':
        case 'ArrowRight':
          e.preventDefault();
          tour.next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (tour.state.currentStepIndex > 0) tour.prev();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tour.state.isActive, tour.state.currentStepIndex, tour]);

  if (!mounted) return null;

  const { state, currentStep, totalSteps } = tour;
  const isFirstStep = state.currentStepIndex === 0;
  const isLastStep = state.currentStepIndex === totalSteps - 1;
  const stepNumber = state.currentStepIndex + 1;

  // Check if we should render
  // Only render when scroll is complete and element is ready
  const shouldRender = state.isActive && referenceElement && currentStep && isReadyToShow;

  // Extract x/y from floatingStyles transform for framer-motion compatibility
  // floatingStyles.transform is like "translate(548px, 94px)"
  // We need to pass these as x/y to framer-motion to avoid transform conflicts
  const getTransformValues = () => {
    if (!floatingStyles.transform || typeof floatingStyles.transform !== 'string') {
      return { x: 0, y: 0 };
    }
    const match = floatingStyles.transform.match(/translate\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px\)/);
    if (match) {
      return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
    }
    return { x: 0, y: 0 };
  };

  const { x, y } = getTransformValues();

  return createPortal(
    <AnimatePresence>
      {shouldRender && (
        <motion.div
          ref={refs.setFloating}
          style={{
            position: floatingStyles.position,
            top: 0,
            left: 0,
            zIndex: 9999,
          }}
          initial={{ opacity: 0, scale: 0.95, x, y }}
          animate={{ opacity: 1, scale: 1, x, y }}
          exit={{ opacity: 0, scale: 0.95, x, y }}
          transition={{ duration: 0.2 }}
          className="w-80 bg-white rounded-xl border border-gray-200 shadow-xl pointer-events-auto"
          role="dialog"
          aria-labelledby="tour-title"
          aria-describedby="tour-description"
          data-tour-tooltip="true"
        >
          <FloatingArrow
            ref={arrowRef}
            context={context}
            className="fill-white [&>path:first-of-type]:stroke-gray-200"
            width={16}
            height={8}
          />

          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Step {stepNumber} of {totalSteps}
              </span>
              <button
                onClick={tour.skip}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip tour
              </button>
            </div>

            <h3 id="tour-title" className="text-lg font-semibold text-gray-900 mb-2">
              {currentStep.title}
            </h3>

            <p id="tour-description" className="text-sm text-gray-500 mb-5">
              {currentStep.description}
            </p>

            <div className="flex items-center justify-center gap-1.5 mb-4">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === state.currentStepIndex ? 'bg-gray-900' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              {!isFirstStep && (
                <button
                  onClick={tour.prev}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={tour.next}
                className={`${isFirstStep ? 'flex-1' : 'flex-[2]'} px-4 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors`}
              >
                {isLastStep ? 'Done' : 'Next'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default TourTooltip;
