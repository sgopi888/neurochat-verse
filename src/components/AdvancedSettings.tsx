import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Code, Globe, RotateCcw } from 'lucide-react';
import { useAdvancedSettings } from '@/hooks/useAdvancedSettings';

const AdvancedSettings: React.FC = () => {
  const { settings, updateSettings, resetToBasic, resetToAdvanced } = useAdvancedSettings();

  return (
    <div className="space-y-4">
      {/* Advanced Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Advanced Mode</Label>
          <div className="text-xs text-muted-foreground">
            Enable structured responses and advanced features
          </div>
        </div>
        <Switch
          checked={settings.useAdvancedMode}
          onCheckedChange={(checked) => updateSettings({ useAdvancedMode: checked })}
        />
      </div>

      {settings.useAdvancedMode && (
        <>
          {/* Feature Toggles */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Feature Toggles
            </h4>
            
            {/* Web Search Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-blue-500" />
                <div>
                  <Label className="text-sm">Web Search</Label>
                  <div className="text-xs text-muted-foreground">
                    Find fresh insights and current research
                  </div>
                </div>
              </div>
              <Switch
                checked={settings.enableWeb}
                onCheckedChange={(checked) => updateSettings({ enableWeb: checked })}
              />
            </div>

            {/* Code Interpreter Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Code className="h-4 w-4 text-green-500" />
                <div>
                  <Label className="text-sm">Code Interpreter</Label>
                  <div className="text-xs text-muted-foreground">
                    Analyze health data and generate insights
                  </div>
                </div>
              </div>
              <Switch
                checked={settings.enableCode}
                onCheckedChange={(checked) => updateSettings({ enableCode: checked })}
              />
            </div>
          </div>

          {/* AI Behavior Settings */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              AI Behavior
            </h4>

            {/* Verbosity Level */}
            <div className="space-y-2">
              <Label className="text-sm">Response Length</Label>
              <Select
                value={settings.verbosityLevel}
                onValueChange={(value: 'low' | 'high') => updateSettings({ verbosityLevel: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select verbosity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Concise</SelectItem>
                  <SelectItem value="high">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reasoning Effort */}
            <div className="space-y-2">
              <Label className="text-sm">Reasoning Depth</Label>
              <Select
                value={settings.reasoningEffort}
                onValueChange={(value: 'low' | 'medium' | 'high') => updateSettings({ reasoningEffort: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reasoning effort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div>
                      <div className="font-medium">Practical</div>
                      <div className="text-xs text-muted-foreground">Simple, actionable guidance</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div>
                      <div className="font-medium">Balanced</div>
                      <div className="text-xs text-muted-foreground">Gentle depth with clarity</div>
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div>
                      <div className="font-medium">Deep</div>
                      <div className="text-xs text-muted-foreground">Layered reasoning and insight</div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {/* Rollback Option */}
      <div className="pt-2 border-t border-border/50">
        <Button
          variant="outline"
          size="sm"
          onClick={settings.useAdvancedMode ? resetToBasic : resetToAdvanced}
          className="w-full text-xs"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          {settings.useAdvancedMode ? 'Switch to Basic Mode' : 'Switch to Advanced Mode'}
        </Button>
      </div>
    </div>
  );
};

export default AdvancedSettings;