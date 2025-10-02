
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, CheckCircle } from "lucide-react";
import { AI_MODELS, aiService } from "@/services/aiService";
import { useToast } from "@/hooks/use-toast";

export function AIConfiguration() {
  const [groqApiKey, setGroqApiKey] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [enabledModels, setEnabledModels] = useState<Set<string>>(new Set());
  const [hfInitialized, setHfInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing API key
    const existingKey = aiService.getGroqApiKey();
    if (existingKey) {
      setGroqApiKey(existingKey);
      setEnabledModels(prev => new Set([...prev, 'groq-llama-8b']));
    }

    // Initialize Hugging Face
    aiService.initializeHuggingFace().then(success => {
      setHfInitialized(success);
      if (success) {
        setEnabledModels(prev => new Set([...prev, 'hf-requirements-analyzer']));
      }
    });
  }, []);

  const handleGroqConnect = async () => {
    if (!groqApiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter your Groq API key",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      aiService.setGroqApiKey(groqApiKey);
      setEnabledModels(prev => new Set([...prev, 'groq-llama-8b']));
      
      toast({
        title: "Success",
        description: "Groq API connected successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to Groq API",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const toggleModel = (modelId: string) => {
    setEnabledModels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modelId)) {
        newSet.delete(modelId);
      } else {
        newSet.add(modelId);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI Model Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Groq Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Groq API</h4>
                <p className="text-sm text-muted-foreground">
                  Fast LLM inference (14,400 free requests/day)
                </p>
              </div>
              <Badge variant={groqApiKey ? "default" : "secondary"}>
                {groqApiKey ? "Connected" : "Not Connected"}
              </Badge>
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="groq-key">API Key</Label>
                <Input
                  id="groq-key"
                  type="password"
                  value={groqApiKey}
                  onChange={(e) => setGroqApiKey(e.target.value)}
                  placeholder="Enter your Groq API key"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleGroqConnect} disabled={isConnecting}>
                  {isConnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Connect"
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Hugging Face Status */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Hugging Face Transformers</h4>
                <p className="text-sm text-muted-foreground">
                  Local AI processing (completely free)
                </p>
              </div>
              <Badge variant={hfInitialized ? "default" : "secondary"}>
                {hfInitialized ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ready
                  </>
                ) : (
                  "Initializing..."
                )}
              </Badge>
            </div>
          </div>

          {/* Available Models */}
          <div className="space-y-4">
            <h4 className="font-semibold">Available AI Models</h4>
            <div className="space-y-3">
              {AI_MODELS.map((model) => (
                <div key={model.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium">{model.name}</h5>
                      {model.free && <Badge variant="secondary">Free</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{model.description}</p>
                  </div>
                  <Switch
                    checked={enabledModels.has(model.id)}
                    onCheckedChange={() => toggleModel(model.id)}
                    disabled={
                      (model.provider === 'groq' && !groqApiKey) ||
                      (model.provider === 'huggingface' && !hfInitialized)
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
