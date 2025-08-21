import { useState, useEffect } from 'react';

export interface AdvancedSettings {
  // Feature toggles - meditation is always enabled
  enableWeb: boolean;
  enableCode: boolean;
  
  // AI Settings
  verbosityLevel: 'low' | 'high';
  reasoningEffort: 'low' | 'medium' | 'high';
  
  // Rollback option
  useAdvancedMode: boolean;
}

const DEFAULT_SETTINGS: AdvancedSettings = {
  enableWeb: true,
  enableCode: true,
  verbosityLevel: 'low',
  reasoningEffort: 'medium',
  useAdvancedMode: true,
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
    const keys = ["meditation", "short_meditation", "followup_questions"];
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
    if (settings.enableCode) {
      tools.push({ type: "code_interpreter", container: { type: "auto" } });
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