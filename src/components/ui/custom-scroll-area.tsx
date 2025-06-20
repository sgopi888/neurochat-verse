
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
        // Custom scrollbar styles using CSS variables for better control
        "scrollbar-custom"
      )}>
        {children}
      </div>
      
      <style jsx>{`
        .scrollbar-custom::-webkit-scrollbar {
          width: 6px;
        }
        
        .scrollbar-custom::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .scrollbar-custom::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.5);
          border-radius: 3px;
          transition: background-color 0.2s ease;
        }
        
        .scrollbar-custom::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.8);
        }
        
        .dark .scrollbar-custom::-webkit-scrollbar-thumb {
          background: rgba(75, 85, 99, 0.5);
        }
        
        .dark .scrollbar-custom::-webkit-scrollbar-thumb:hover {
          background: rgba(75, 85, 99, 0.8);
        }
        
        /* Firefox scrollbar */
        .scrollbar-custom {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
        }
        
        .dark .scrollbar-custom {
          scrollbar-color: rgba(75, 85, 99, 0.5) transparent;
        }
      `}</style>
    </div>
  );
}
