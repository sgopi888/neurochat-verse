import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { GPTService } from '@/services/gptService';

interface AIConfig {
  provider: 'aiml' | 'openai';
  model: 'gpt-5-nano';
  verbosity: 'low' | 'medium' | 'high';
  reasoning: 'minimal' | 'low' | 'medium' | 'high';
}

export const AISettings = () => {
  const [config, setConfig] = useState<AIConfig>({ 
    provider: 'aiml', 
    model: 'gpt-5-nano',
    verbosity: 'low',
    reasoning: 'minimal'
  });

  useEffect(() => {
    // Load saved config on mount
    const savedConfig = localStorage.getItem('gpt-config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  const handleProviderChange = (provider: 'aiml' | 'openai') => {
    const newConfig = { ...config, provider };
    setConfig(newConfig);
    GPTService.setConfig(newConfig);
  };

  const handleVerbosityChange = (verbosity: 'low' | 'medium' | 'high') => {
    const newConfig = { ...config, verbosity };
    setConfig(newConfig);
    GPTService.setConfig(newConfig);
  };

  const handleReasoningChange = (reasoning: 'minimal' | 'low' | 'medium' | 'high') => {
    const newConfig = { ...config, reasoning };
    setConfig(newConfig);
    GPTService.setConfig(newConfig);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Configuration</CardTitle>
        <CardDescription>
          Choose your preferred AI provider and model for conversations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="provider-select">AI Provider</Label>
          <Select value={config.provider} onValueChange={handleProviderChange}>
            <SelectTrigger id="provider-select">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aiml">AIML API (Recommended)</SelectItem>
              <SelectItem value="openai">OpenAI Direct</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="verbosity-select">Verbosity Level</Label>
          <Select value={config.verbosity} onValueChange={handleVerbosityChange}>
            <SelectTrigger id="verbosity-select">
              <SelectValue placeholder="Select verbosity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low (Concise)</SelectItem>
              <SelectItem value="medium">Medium (Balanced)</SelectItem>
              <SelectItem value="high">High (Detailed)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reasoning-select">Reasoning Effort</Label>
          <Select value={config.reasoning} onValueChange={handleReasoningChange}>
            <SelectTrigger id="reasoning-select">
              <SelectValue placeholder="Select reasoning" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minimal">Minimal (Fastest)</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High (Most Thorough)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          <p><strong>AIML API:</strong> Faster, more cost-effective access to GPT models</p>
          <p><strong>OpenAI Direct:</strong> Direct connection to OpenAI (fallback option)</p>
          <p><strong>GPT-5 Nano:</strong> Fast, efficient model optimized for conversations</p>
          <p><strong>Low Verbosity:</strong> Short, concise responses</p>
          <p><strong>High Verbosity:</strong> Detailed, comprehensive responses</p>
          <p><strong>Minimal Reasoning:</strong> Quick responses with basic reasoning</p>
          <p><strong>High Reasoning:</strong> Deep analysis with thorough reasoning</p>
        </div>
      </CardContent>
    </Card>
  );
};