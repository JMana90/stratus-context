
export interface AIModel {
  id: string;
  name: string;
  provider: 'huggingface' | 'groq' | 'openai';
  free: boolean;
  description: string;
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'hf-requirements-analyzer',
    name: 'Requirements Analyzer',
    provider: 'huggingface',
    free: true,
    description: 'Analyzes project requirements using local processing'
  },
  {
    id: 'groq-llama-8b',
    name: 'Groq Llama 3.1 8B',
    provider: 'groq',
    free: true,
    description: 'Fast conversational AI for project assistance'
  }
];

export class AIService {
  private groqApiKey: string | null = null;
  private hfPipeline: any = null;

  setGroqApiKey(apiKey: string) {
    this.groqApiKey = apiKey;
    localStorage.setItem('groq_api_key', apiKey);
  }

  getGroqApiKey(): string | null {
    if (!this.groqApiKey) {
      this.groqApiKey = localStorage.getItem('groq_api_key');
    }
    return this.groqApiKey;
  }

  async initializeHuggingFace() {
    try {
      const { pipeline } = await import('@huggingface/transformers');
      this.hfPipeline = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
      return true;
    } catch (error) {
      console.error('Failed to initialize Hugging Face:', error);
      return false;
    }
  }

  async analyzeProjectRequirements(projectDescription: string): Promise<string[]> {
    // Use Hugging Face for local analysis
    if (!this.hfPipeline) {
      await this.initializeHuggingFace();
    }

    // Mock analysis for now - in production, this would use more sophisticated models
    const keywords = projectDescription.toLowerCase().split(' ');
    const requirements = [];

    if (keywords.some(k => ['construction', 'building', 'facility'].includes(k))) {
      requirements.push('Building Permits', 'Safety Compliance', 'Zoning Approval');
    }
    if (keywords.some(k => ['manufacturing', 'production', 'factory'].includes(k))) {
      requirements.push('OSHA Standards', 'Environmental Impact Assessment', 'Quality Assurance');
    }
    if (keywords.some(k => ['healthcare', 'medical', 'hospital'].includes(k))) {
      requirements.push('HIPAA Compliance', 'Medical Device Regulations', 'Patient Safety Standards');
    }

    return requirements;
  }

  async generateAIResponse(prompt: string, context?: any): Promise<string> {
    const apiKey = this.getGroqApiKey();
    if (!apiKey) {
      throw new Error('Groq API key not configured');
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant specializing in project management and compliance requirements. Be concise and helpful.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      console.error('Groq API error:', error);
      throw error;
    }
  }
}

export const aiService = new AIService();

export default aiService;
