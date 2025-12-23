'use client';

/**
 * GoalsStep Component
 * Let users select their wellness goals
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';

export interface GoalsStepProps {
  onNext: (goals: {
    reduceEyeStrain: boolean;
    improvePosture: boolean;
    takeRegularBreaks: boolean;
  }) => void;
  onBack: () => void;
  initialGoals?: {
    reduceEyeStrain: boolean;
    improvePosture: boolean;
    takeRegularBreaks: boolean;
  };
}

interface Goal {
  id: 'reduceEyeStrain' | 'improvePosture' | 'takeRegularBreaks';
  title: string;
  description: string;
  icon: 'eye' | 'posture' | 'clock';
}

const GOALS: Goal[] = [
  {
    id: 'reduceEyeStrain',
    title: 'Reduce Eye Strain',
    description: 'Get reminders when your blink rate drops too low',
    icon: 'eye',
  },
  {
    id: 'improvePosture',
    title: 'Improve Posture',
    description: 'Get alerts when you slouch or lean too close',
    icon: 'posture',
  },
  {
    id: 'takeRegularBreaks',
    title: 'Take Regular Breaks',
    description: 'Follow the 20-20-20 rule for healthier screen time',
    icon: 'clock',
  },
];

export function GoalsStep({ onNext, onBack, initialGoals }: GoalsStepProps) {
  // Start with nothing selected - let user choose
  const [selectedGoals, setSelectedGoals] = useState({
    reduceEyeStrain: initialGoals?.reduceEyeStrain ?? false,
    improvePosture: initialGoals?.improvePosture ?? false,
    takeRegularBreaks: initialGoals?.takeRegularBreaks ?? false,
  });

  const toggleGoal = (goalId: Goal['id']) => {
    setSelectedGoals((prev) => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  };

  const handleContinue = () => {
    onNext(selectedGoals);
  };

  const hasAnyGoal = Object.values(selectedGoals).some(Boolean);

  return (
    <div className="h-full flex flex-col px-8 py-6">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.8, bounce: 0.3 }}
          className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6"
        >
          <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          Set Your Goals
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-gray-600 mb-8 max-w-md"
        >
          What would you like to focus on? You can change these anytime in settings.
        </motion.p>

        {/* Goals list */}
        <div className="space-y-3 max-w-md w-full">
          {GOALS.map((goal, index) => (
            <motion.button
              key={goal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.15, duration: 0.4 }}
              onClick={() => toggleGoal(goal.id)}
              className={`w-full flex items-start gap-4 text-left p-4 rounded-xl border-2 transition-all ${
                selectedGoals[goal.id]
                  ? 'border-black bg-gray-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  selectedGoals[goal.id] ? 'bg-black' : 'bg-gray-100'
                }`}
              >
                <GoalIcon type={goal.icon} selected={selectedGoals[goal.id]} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{goal.title}</h3>
                <p className="text-sm text-gray-600">{goal.description}</p>
              </div>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedGoals[goal.id] ? 'border-black bg-black' : 'border-gray-300'
                }`}
              >
                {selectedGoals[goal.id] && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </motion.button>
          ))}
        </div>

        {!hasAnyGoal && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="mt-4 text-sm text-gray-500"
          >
            Select at least one goal to continue
          </motion.p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!hasAnyGoal}
          className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
            hasAnyGoal
              ? 'bg-black text-white hover:bg-gray-800'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function GoalIcon({ type, selected }: { type: string; selected: boolean }) {
  const className = `w-5 h-5 ${selected ? 'text-white' : 'text-gray-600'}`;

  switch (type) {
    case 'eye':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      );
    case 'posture':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <ellipse cx="12" cy="4" rx="3" ry="2" />
          <ellipse cx="12" cy="9" rx="3.5" ry="2" />
          <ellipse cx="12" cy="14" rx="3.5" ry="2" />
          <ellipse cx="12" cy="19" rx="3" ry="2" />
        </svg>
      );
    case 'clock':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    default:
      return null;
  }
}

export default GoalsStep;
