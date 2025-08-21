import { useState, useEffect } from 'react';

export interface AdvancedSettings {
  // Feature toggles
  enableWeb: boolean;
  enableCode: boolean;
  enableMeditation: boolean;
  
  // Meditation settings
  shortMeditation: boolean; // true = 1 min, false = full length
  
  // AI Settings - matching Python reference
  verbosityLevel: 'low' | 'high';
  reasoningEffort: 'low' | 'medium' | 'high';
  
  // Mode toggle
  useAdvancedMode: boolean;
}

const DEFAULT_SETTINGS: AdvancedSettings = {
  enableWeb: false,
  enableCode: false,
  enableMeditation: false,
  shortMeditation: false, // Full meditation by default
  verbosityLevel: 'low',
  reasoningEffort: 'medium',
  useAdvancedMode: false,
};

export const useAdvancedSettings = () => {
  const [settings, setSettings] = useState<AdvancedSettings>(DEFAULT_SETTINGS);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('advanced-settings');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      } catch (error) {
        console.error('Failed to parse advanced settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('advanced-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (updates: Partial<AdvancedSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const resetToBasic = () => {
    updateSettings({ useAdvancedMode: false });
  };

  const resetToAdvanced = () => {
    updateSettings({ useAdvancedMode: true });
  };

  // Computed values based on reasoning effort
  const getToneInstruction = () => {
    if (!settings.useAdvancedMode) return '';
    
    switch (settings.reasoningEffort) {
      case 'low':
        return "Style: practical, non-esoteric, concrete steps, short cues. Avoid metaphysical/Scripture terms. Keep language plain and actionable.";
      case 'medium':
        return "Style: balanced, blend of practical guidance with light reflective depth. Use gentle metaphors or simple analogies. Keep tone encouraging but clear.";
      case 'high':
        return "Style: deep, reflective, layered reasoning with structured argumentation. Integrate nuanced insights, contextual framing, and careful progression. Allow more length and complexity while staying coherent.";
      default:
        return "Style: default, concise, and neutral.";
    }
  };

  const getRequiredKeys = () => {
    if (!settings.enableMeditation) {
      return ["chat", "followup_questions"];
    }
    
    const keys = settings.shortMeditation 
      ? ["short_meditation", "followup_questions"]
      : ["meditation", "short_meditation", "followup_questions"];
      
    if (settings.enableWeb && settings.useAdvancedMode) {
      keys.push("fresh_wisdom", "sources");
    }
    return keys;
  };

  const getSchemaHint = () => {
    if (!settings.useAdvancedMode) return '';
    
    const requiredKeys = getRequiredKeys();
    let hint = `Return output strictly as JSON with keys: ${requiredKeys.join(", ")}. Do not include any other keys.`;
    
    if (settings.enableWeb) {
      hint += " For sources, output an array of objects with fields: title, url, published_date (YYYY-MM-DD). Use the web_search tool to cite 2–3 high-quality, recent sources.";
    }
    
    return hint;
  };

  const getToolsArray = () => {
    if (!settings.useAdvancedMode) return [];
    
    const tools = [];
    if (settings.enableWeb) {
      tools.push({ type: "web_search_preview", search_context_size: "low" });
    }
    return tools;
  };

  return {
    settings,
    updateSettings,
    resetToBasic,
    resetToAdvanced,
    getToneInstruction,
    getRequiredKeys,
    getSchemaHint,
    getToolsArray,
  };
};