'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useTour } from './TourContext';

interface ElementRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * TourOverlay - Full-screen backdrop with spotlight cutout
 *
 * Uses SVG mask to create a transparent "window" around the active element.
 * Spotlight follows element in real-time during scroll for smooth UX.
 */
export function TourOverlay() {
  const { state, currentStepId, getElement } = useTour();
  const [rect, setRect] = useState<ElementRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const [trackedElement, setTrackedElement] = useState<HTMLElement | null>(null);

  // Client-side only
  useEffect(() => {
    setMounted(true);
  }, []);

  // Poll for element when step changes (handles view transitions)
  useEffect(() => {
    if (!state.isActive || !currentStepId) {
      setTrackedElement(null);
      setRect(null);
      return;
    }

    // Try to get element immediately
    const element = getElement(currentStepId);
    if (element) {
      setTrackedElement(element);
      return;
    }

    // Element not found - poll until it's registered (view might be mounting)
    let attempts = 0;
    const maxAttempts = 20; // 2 seconds max
    const pollInterval = setInterval(() => {
      attempts++;
      const el = getElement(currentStepId);
      if (el) {
        setTrackedElement(el);
        clearInterval(pollInterval);
      } else if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
      }
    }, 100);

    return () => clearInterval(pollInterval);
  }, [state.isActive, currentStepId, getElement]);

  // Track element position - follows element in real-time
  useEffect(() => {
    if (!trackedElement) {
      setRect(null);
      return;
    }

    const updateRect = () => {
      const domRect = trackedElement.getBoundingClientRect();
      const padding = 8;
      setRect({
        x: domRect.left - padding,
        y: domRect.top - padding,
        width: domRect.width + padding * 2,
        height: domRect.height + padding * 2,
      });
    };

    // Start tracking immediately
    updateRect();

    // Use RAF for smooth updates during scroll
    let rafId: number;
    const smoothUpdate = () => {
      updateRect();
      rafId = requestAnimationFrame(smoothUpdate);
    };

    // Start RAF loop for smooth tracking during scroll
    rafId = requestAnimationFrame(smoothUpdate);

    // Also listen for resize
    window.addEventListener('resize', updateRect);

    // ResizeObserver for element size changes
    const resizeObserver = new ResizeObserver(updateRect);
    resizeObserver.observe(trackedElement);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateRect);
      resizeObserver.disconnect();
    };
  }, [trackedElement]);

  if (!mounted) return null;

  // Only show overlay when we have both active state AND a valid spotlight rect
  // This prevents showing a full dark screen while waiting for element to register
  const shouldShow = state.isActive && rect !== null;

  return createPortal(
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 pointer-events-auto"
          style={{ zIndex: 9998 }}
          data-tour-overlay="true"
          aria-hidden="true"
        >
          <svg
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <mask id="tour-spotlight-mask">
                {/* White = visible overlay */}
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {/* Black = transparent cutout */}
                {rect && (
                  <rect
                    x={rect.x}
                    y={rect.y}
                    width={rect.width}
                    height={rect.height}
                    rx="12"
                    fill="black"
                  />
                )}
              </mask>
            </defs>

            {/* Semi-transparent overlay */}
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.75)"
              mask="url(#tour-spotlight-mask)"
            />

            {/* Subtle highlight border around cutout */}
            {rect && (
              <rect
                x={rect.x - 2}
                y={rect.y - 2}
                width={rect.width + 4}
                height={rect.height + 4}
                rx="14"
                fill="none"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="2"
              />
            )}
          </svg>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default TourOverlay;
