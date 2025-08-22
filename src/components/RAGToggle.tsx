import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, DatabaseZap } from 'lucide-react';

interface RAGToggleProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
}

export function RAGToggle({ isEnabled, onToggle, className }: RAGToggleProps) {
  return (
    <Button
      variant={isEnabled ? "default" : "outline"}
      size="sm"
      onClick={() => onToggle(!isEnabled)}
      className={className}
    >
      {isEnabled ? (
        <>
          <DatabaseZap className="w-4 h-4 mr-2" />
          RAG ON
          <Badge variant="secondary" className="ml-2 text-xs">
            Enhanced
          </Badge>
        </>
      ) : (
        <>
          <Database className="w-4 h-4 mr-2" />
          RAG OFF
        </>
      )}
    </Button>
  );
}