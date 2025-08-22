import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RagStep } from '@/utils/ragRunner';

interface RAGProgressIndicatorProps {
  steps: RagStep[];
  className?: string;
}

export function RAGProgressIndicator({ steps, className }: RAGProgressIndicatorProps) {
  if (steps.length === 0) return null;

  const renderStepData = (step: RagStep) => {
    if (!step.data) return null;

    switch (step.id) {
      case 'chunks':
        return (
          <div className="flex gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              {step.data.chunksCount} chunks
            </Badge>
            <Badge variant="outline" className="text-xs">
              {step.data.totalChunkTokens} tokens
            </Badge>
          </div>
        );
      case 'context':
        return (
          <div className="flex gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              {step.data.messages?.length} messages
            </Badge>
            <Badge variant="outline" className="text-xs">
              {step.data.totalTokens} tokens
            </Badge>
          </div>
        );
      case 'llm':
        return (
          <div className="flex gap-2 mt-1">
            {step.data.responseTime && (
              <Badge variant="outline" className="text-xs">
                {step.data.responseTime}ms
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {step.tokens} tokens
            </Badge>
          </div>
        );
      default:
        return step.tokens ? (
          <Badge variant="outline" className="text-xs mt-1">
            {step.tokens} tokens
          </Badge>
        ) : null;
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            RAG Processing Steps
          </div>
          {steps.map((step, idx) => (
            <div key={step.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    step.status === 'completed' ? 'bg-green-500' :
                    step.status === 'processing' ? 'bg-yellow-500 animate-pulse' :
                    step.status === 'error' ? 'bg-red-500' :
                    'bg-gray-300'
                  }`} />
                  <span className="text-xs font-medium">{step.title}</span>
                </div>
                {step.timestamp && (
                  <span className="text-xs text-muted-foreground">
                    {step.timestamp.toLocaleTimeString()}
                  </span>
                )}
              </div>
              {renderStepData(step)}
              {step.status === 'error' && step.data && (
                <div className="text-xs text-destructive mt-1">
                  Error: {step.data}
                </div>
              )}
              {idx < steps.length - 1 && <Separator className="my-2" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}