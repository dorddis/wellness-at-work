'use client';

/**
 * Stepper Component
 * Visual step indicator with numbered circles and connecting lines
 * Inspired by shadcn/ui Stepper pattern
 */

import React from 'react';
import { motion } from 'motion/react';

export interface Step {
  id: string;
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: Step[];
  currentStep: number;
  /** Optional: show labels below step indicators */
  showLabels?: boolean;
  /** Optional: compact mode for smaller spaces */
  compact?: boolean;
}

export function Stepper({
  steps,
  currentStep,
  showLabels = false,
  compact = false,
}: StepperProps) {
  return (
    <div className={`w-full ${compact ? 'px-4' : 'px-8'}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <React.Fragment key={step.id}>
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.1 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                  className={`
                    relative flex items-center justify-center rounded-full
                    ${compact ? 'w-8 h-8' : 'w-10 h-10'}
                    ${isCompleted || isCurrent ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'}
                    ${isCurrent ? 'ring-4 ring-foreground/10' : ''}
                  `}
                >
                  {isCompleted ? (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={compact ? 'w-4 h-4' : 'w-5 h-5'}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </motion.svg>
                  ) : (
                    <span className={`font-medium ${compact ? 'text-sm' : 'text-base'}`}>
                      {index + 1}
                    </span>
                  )}
                </motion.div>

                {/* Label below indicator */}
                {showLabels && (
                  <motion.div
                    initial={false}
                    animate={{
                      opacity: isCurrent ? 1 : 0.6,
                    }}
                    className="mt-2 text-center"
                  >
                    <p
                      className={`
                        font-medium
                        ${compact ? 'text-xs' : 'text-sm'}
                        ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}
                      `}
                    >
                      {step.label}
                    </p>
                    {step.description && !compact && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5 max-w-[100px]">
                        {step.description}
                      </p>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2">
                  <div className="relative h-0.5 bg-border rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: isCompleted ? '100%' : '0%',
                      }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="absolute inset-y-0 left-0 bg-foreground rounded-full"
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default Stepper;
