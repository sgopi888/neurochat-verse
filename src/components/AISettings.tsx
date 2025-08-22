import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useConfigManager } from '@/hooks/useConfigManager';

export function AISettings() {
  const { config, updateConfig } = useConfigManager();

  const handleProviderChange = (value: string) => {
    updateConfig({ provider: value as 'aiml' | 'openai' });
  };

  const handleModelChange = (value: string) => {
    updateConfig({ model: value });
  };

  const handleVerbosityChange = (value: string) => {
    updateConfig({ verbosity: value as 'low' | 'medium' | 'high' });
  };

  const handleReasoningChange = (value: string) => {
    updateConfig({ reasoning: value as 'low' | 'medium' | 'high' });
  };

  const handleWebSearchChange = (checked: boolean) => {
    updateConfig({ webSearch: checked });
  };

  const handleCodeInterpreterChange = (checked: boolean) => {
    updateConfig({ codeInterpreter: checked });
  };

  const handleRAGChange = (checked: boolean) => {
    updateConfig({ ragEnabled: checked });
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
              <SelectItem value="openai">OpenAI Direct (Default)</SelectItem>
              <SelectItem value="aiml">AIML API</SelectItem>
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
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium (Default)</SelectItem>
              <SelectItem value="high">High (Most Thorough)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="websearch-toggle" className="text-sm font-medium">
              Web Search
            </Label>
            <Switch
              id="websearch-toggle"
              checked={config.webSearch}
              onCheckedChange={handleWebSearchChange}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Allow GPT-5 to search the web for current information before responding
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="code-interpreter-toggle" className="text-sm font-medium">
              Smartwatch Data Analysis
            </Label>
            <Switch
              id="code-interpreter-toggle"
              checked={config.codeInterpreter}
              onCheckedChange={handleCodeInterpreterChange}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Analyze BPM data with HRV calculations and health insights
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="rag-toggle" className="text-sm font-medium">
              Knowledge Retrieval (RAG)
            </Label>
            <Switch
              id="rag-toggle"
              checked={config.ragEnabled}
              onCheckedChange={handleRAGChange}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Retrieve relevant information from knowledge base to enhance responses
          </p>
        </div>
      </CardContent>
    </Card>
  );
};