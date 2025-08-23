import { useState, useEffect, useCallback } from 'react';
import { GPTService } from '@/services/gptService';

export interface AppConfig {
  provider: 'aiml' | 'openai';
  model: string;
  verbosity: 'low' | 'medium' | 'high';
  reasoning: 'low' | 'medium' | 'high';
  codeInterpreter: boolean;
  mode: 'none' | 'rag' | 'web';
}

const defaultConfig: AppConfig = {
  provider: 'aiml',
  model: 'gpt-5-nano-2025-08-07',
  verbosity: 'low',
  reasoning: 'medium',
  codeInterpreter: false,
  mode: 'none'
};

export const useConfigManager = () => {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);

  useEffect(() => {
    // Load config from localStorage
    const savedConfig = localStorage.getItem('gpt-config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig({ ...defaultConfig, ...parsed });
      } catch (error) {
        console.error('Failed to parse saved config:', error);
        setConfig(defaultConfig);
      }
    }
  }, []);

  const updateConfig = useCallback((updates: Partial<AppConfig>) => {
    setConfig(prev => {
      let newConfig = { ...prev, ...updates };
      
      // Use GPTService.setConfig for centralized persistence and exclusivity rules
      GPTService.setConfig(newConfig);
      
      console.log('⚙️ Config updated:', newConfig);
      
      return newConfig;
    });
  }, []);

  return {
    config,
    updateConfig
  };
};