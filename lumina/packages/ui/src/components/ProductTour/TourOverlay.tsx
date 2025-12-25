'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TourOverlayProps {
  /** Target element to spotlight */
  targetElement: HTMLElement | null;
  /** Whether the overlay is visible */
  isVisible: boolean;
  /** Extra padding around the spotlight cutout */
  padding?: number;
  /** Callback when clicking outside the spotlight */
  onClickOutside?: () => void;
}

interface ElementRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * TourOverlay Component
 *
 * Full-screen semi-transparent overlay with an animated spotlight cutout
 * around the target element.
 */
export function TourOverlay({
  targetElement,
  isVisible,
  padding = 8,
  onClickOutside,
}: TourOverlayProps) {
  const [rect, setRect] = useState<ElementRect | null>(null);

  // Track target element position
  useEffect(() => {
    if (!targetElement || !isVisible) {
      setRect(null);
      return;
    }

    const updateRect = () => {
      const domRect = targetElement.getBoundingClientRect();
      setRect({
        x: domRect.left - padding,
        y: domRect.top - padding,
        width: domRect.width + padding * 2,
        height: domRect.height + padding * 2,
      });
    };

    // Initial position
    updateRect();

    // Update on scroll/resize
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);

    // Use ResizeObserver for element size changes
    const resizeObserver = new ResizeObserver(updateRect);
    resizeObserver.observe(targetElement);

    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
      resizeObserver.disconnect();
    };
  }, [targetElement, isVisible, padding]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9998] pointer-events-auto"
          onClick={onClickOutside}
          aria-hidden="true"
        >
          <svg
            className="absolute inset-0 w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <mask id="tour-spotlight-mask">
                {/* White background = visible overlay */}
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {/* Black rectangle = transparent cutout */}
                {rect && (
                  <motion.rect
                    initial={{
                      x: rect.x,
                      y: rect.y,
                      width: rect.width,
                      height: rect.height,
                      rx: 12,
                    }}
                    animate={{
                      x: rect.x,
                      y: rect.y,
                      width: rect.width,
                      height: rect.height,
                      rx: 12,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    fill="black"
                  />
                )}
              </mask>
            </defs>

            {/* Semi-transparent overlay with mask */}
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.75)"
              mask="url(#tour-spotlight-mask)"
            />

            {/* Subtle glow around the cutout */}
            {rect && (
              <motion.rect
                initial={{
                  x: rect.x - 2,
                  y: rect.y - 2,
                  width: rect.width + 4,
                  height: rect.height + 4,
                }}
                animate={{
                  x: rect.x - 2,
                  y: rect.y - 2,
                  width: rect.width + 4,
                  height: rect.height + 4,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                rx="14"
                fill="none"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="2"
              />
            )}
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TourOverlay;
