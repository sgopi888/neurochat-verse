import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { GPTService } from '@/services/gptService';

interface AIConfig {
  provider: 'aiml' | 'openai';
  model: 'gpt-5' | 'gpt-5-nano';
}

export const AISettings = () => {
  const [config, setConfig] = useState<AIConfig>({ provider: 'aiml', model: 'gpt-5-nano' });

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

  const handleModelChange = (model: 'gpt-5' | 'gpt-5-nano') => {
    const newConfig = { ...config, model };
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
          <Label htmlFor="model-select">AI Model</Label>
          <Select value={config.model} onValueChange={handleModelChange}>
            <SelectTrigger id="model-select">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-5-nano">GPT-5 Nano (Fast & Efficient)</SelectItem>
              <SelectItem value="gpt-5">GPT-5 (Full Model)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          <p><strong>AIML API:</strong> Faster, more cost-effective access to GPT models</p>
          <p><strong>OpenAI Direct:</strong> Direct connection to OpenAI (fallback option)</p>
          <p><strong>GPT-5 Nano:</strong> Optimized for quick, conversational responses</p>
          <p><strong>GPT-5:</strong> Full-featured model for complex tasks</p>
        </div>
      </CardContent>
    </Card>
  );
};