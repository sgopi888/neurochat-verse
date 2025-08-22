import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DebugStep } from '@/utils/ragRunner';

interface RAGProgressIndicatorProps {
  steps: DebugStep[];
  isVisible: boolean;
}

export const RAGProgressIndicator: React.FC<RAGProgressIndicatorProps> = ({ 
  steps, 
  isVisible 
}) => {
  if (!isVisible || steps.length === 0) return null;

  const renderStepData = (step: DebugStep) => {
    if (!step.data) return null;

    switch (step.id) {
      case 'query':
        return (
          <div className="bg-muted/30 p-2 rounded-md">
            <pre className="text-xs whitespace-pre-wrap">{step.data}</pre>
          </div>
        );
      case 'concepts':
        return (
          <div className="bg-muted/30 p-2 rounded-md">
            <pre className="text-xs whitespace-pre-wrap font-mono">{step.data}</pre>
          </div>
        );
      case 'chunks':
        return (
          <div className="space-y-1">
            <div className="flex gap-1">
              <Badge variant="secondary" className="text-xs">{step.data.chunksCount} chunks</Badge>
              <Badge variant="outline" className="text-xs">{step.data.totalChunkTokens} tokens</Badge>
            </div>
            {step.data.chunks && step.data.chunks.length > 0 && (
              <div className="bg-muted/30 p-2 rounded-md">
                <p className="text-xs text-muted-foreground mb-1">
                  First chunk preview:
                </p>
                <p className="text-xs whitespace-pre-wrap">
                  {step.data.chunks[0].substring(0, 100)}...
                </p>
              </div>
            )}
          </div>
        );
      case 'context':
        return (
          <div className="space-y-1">
            <div className="flex gap-1">
              <Badge variant="secondary" className="text-xs">{step.data.messages?.length || 0} messages</Badge>
              <Badge variant="outline" className="text-xs">{step.data.totalTokens} tokens</Badge>
            </div>
          </div>
        );
      case 'llm':
        return (
          <div className="space-y-1">
            <div className="flex gap-1">
              {step.data.responseTime && (
                <Badge variant="outline" className="text-xs">{step.data.responseTime}ms</Badge>
              )}
              <Badge variant="secondary" className="text-xs">{step.tokens} tokens</Badge>
            </div>
          </div>
        );
      case 'error':
        return (
          <div className="bg-destructive/10 p-2 rounded-md">
            <p className="text-destructive text-xs">{step.data}</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm font-medium">Processing RAG Request</span>
          </div>
          
          <div className="space-y-2">
            {steps.map((step, idx) => (
              <div key={step.id} className="space-y-1">
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
                  <div className="flex items-center gap-1">
                    {step.tokens && (
                      <Badge variant="outline" className="text-xs h-4 px-1">
                        {step.tokens}
                      </Badge>
                    )}
                    {step.timestamp && (
                      <span className="text-xs text-muted-foreground">
                        {step.timestamp.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
                {step.data && <div className="ml-3">{renderStepData(step)}</div>}
                {idx < steps.length - 1 && <Separator className="my-1" />}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RAGProgressIndicator;