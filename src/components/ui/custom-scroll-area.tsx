
import React from 'react';
import { cn } from '@/lib/utils';

interface CustomScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
}

export function CustomScrollArea({ children, className, maxHeight = "100%" }: CustomScrollAreaProps) {
  return (
    <div 
      className={cn(
        "relative overflow-hidden",
        className
      )}
      style={{ maxHeight }}
    >
      <div className={cn(
        "h-full w-full overflow-y-auto overflow-x-hidden",
        // Custom scrollbar styles
        "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600",
        "hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500",
        // Webkit scrollbar styles for better browser support
        "[&::-webkit-scrollbar]:w-2",
        "[&::-webkit-scrollbar-track]:bg-transparent",
        "[&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600",
        "[&::-webkit-scrollbar-thumb]:rounded-full",
        "[&::-webkit-scrollbar-thumb:hover]:bg-gray-400 dark:[&::-webkit-scrollbar-thumb:hover]:bg-gray-500"
      )}>
        {children}
      </div>
    </div>
  );
}
