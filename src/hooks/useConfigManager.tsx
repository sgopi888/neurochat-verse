import { useState, useEffect, useCallback } from 'react';

export interface AppConfig {
  provider: string;
  model: string;
  verbosity: string;
  reasoning: string;
  webSearch: boolean;
  codeInterpreter: boolean;
  ragEnabled: boolean;
}

const defaultConfig: AppConfig = {
  provider: 'openai',
  model: 'gpt-5-nano',
  verbosity: 'low',
  reasoning: 'medium',
  webSearch: false,
  codeInterpreter: false,
  ragEnabled: false // Default to OFF as requested
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
      
      // Implement mutual exclusivity between RAG and web search
      if (updates.ragEnabled === true && prev.webSearch === true) {
        newConfig.webSearch = false;
        console.log('🔄 Auto-disabled web search (RAG enabled)');
      } else if (updates.webSearch === true && prev.ragEnabled === true) {
        newConfig.ragEnabled = false;
        console.log('🔄 Auto-disabled RAG (web search enabled)');
      }
      
      // Save to localStorage
      localStorage.setItem('gpt-config', JSON.stringify(newConfig));
      
      console.log('⚙️ Config updated:', newConfig);
      
      return newConfig;
    });
  }, []);

  return {
    config,
    updateConfig
  };
};