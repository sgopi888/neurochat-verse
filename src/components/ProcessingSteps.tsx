
import React, { useState, useEffect } from 'react';
import { Loader2, Brain, MessageSquare, Volume2 } from 'lucide-react';

interface ProcessingStepsProps {
  isVisible: boolean;
}

const ProcessingSteps: React.FC<ProcessingStepsProps> = ({ isVisible }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    { icon: Brain, text: "Analyzing your question..." },
    { icon: MessageSquare, text: "Generating thoughtful response..." },
    { icon: Volume2, text: "Preparing audio response..." }
  ];

  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0);
      setCompletedSteps([]);
      return;
    }

    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        const nextStep = (prev + 1) % steps.length;
        if (nextStep === 0) {
          setCompletedSteps(prev => [...prev, steps.length - 1]);
        } else {
          setCompletedSteps(prev => [...prev, prev]);
        }
        return nextStep;
      });
    }, 1500);

    return () => clearInterval(stepInterval);
  }, [isVisible, steps.length]);

  if (!isVisible) return null;

  return (
    <div className="flex flex-col items-center space-y-4 p-6 bg-blue-50 rounded-lg border border-blue-200">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === currentStep;
        const isCompleted = completedSteps.includes(index);
        
        return (
          <div
            key={index}
            className={`flex items-center space-x-3 transition-all duration-500 ${
              isActive ? 'text-blue-600 scale-105' : 
              isCompleted ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            {isActive ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Icon className={`h-5 w-5 ${isCompleted ? 'opacity-100' : 'opacity-50'}`} />
            )}
            <span className={`text-sm font-medium ${
              isActive ? 'font-semibold' : ''
            }`}>
              {step.text}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default ProcessingSteps;
