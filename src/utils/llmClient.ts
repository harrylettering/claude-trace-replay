import type { LLMConfig, PromptAnalysis } from '../types/prompt';
import type { LogEntry } from '../types/log';

// System prompt for prompt analysis
const ANALYSIS_SYSTEM_PROMPT = `You are a professional prompt engineering expert. Analyze the provided conversation history, identify issues in the prompts, and provide specific optimization suggestions.

Return the analysis in the following JSON format:
{
  "issues": [
    {
      "type": "issue_type",
      "severity": "low|medium|high|critical",
      "title": "short_title",
      "description": "detailed_description",
      "suggestion": "specific_suggestion"
    }
  ],
  "suggestions": [
    {
      "original": "original_prompt_snippet",
      "improved": "improved_prompt",
      "explanation": "why_this_improves_it",
      "impact": "small|medium|large",
      "category": "category"
    }
  ],
  "bestPractices": [
    "best_practice_1",
    "best_practice_2"
  ],
  "overallAssessment": "overall_assessment"
}

Return JSON only, with no additional text.`;

// Build the analysis prompt
function buildAnalysisPrompt(entries: LogEntry[]): string {
  const conversation = entries
    .slice(0, 20) // Limit size to avoid overlong prompts
    .map((entry) => {
      let content = '';
      if (entry.message?.content) {
        if (typeof entry.message.content === 'string') {
          content = entry.message.content;
        } else if (Array.isArray(entry.message.content)) {
          const textContent = entry.message.content.find((c: any) => c.type === 'text');
          content = (textContent as any)?.text || '';
        }
      }
      return `${entry.type.toUpperCase()}:\n${content.slice(0, 1000)}`;
    })
    .join('\n\n');

  return `Analyze the user prompts in the following conversation history, identify issues, and provide optimization suggestions:

\`\`\`
${conversation}
\`\`\`

Pay special attention to:
1. Whether the user prompts are clear and specific
2. Whether necessary context or structure is missing
3. Where the prompts can be improved
4. Concrete and actionable recommendations`;
}

// System prompt for experience analysis
const EXPERIENCE_SYSTEM_PROMPT = `You are a top-tier AI collaboration expert and senior architect. Deeply review this conversation between a user and an AI programmer, distill reusable lessons, and provide optimization suggestions.

Analyze from the following dimensions:
1. **Collaboration lessons**: Identify which practices were especially successful in this session (such as clear architectural direction or precise error reporting), and which patterns led to inefficiency or loops (such as vague instructions or repeated retries).
2. **Deep insights**: Analyze the AI programmer's behavioral patterns. Where did it struggle most? Under what types of prompts did it perform best?
3. **Optimization suggestions**: Provide 3-5 concrete, practical, and high-quality recommendations for future collaboration.

Return the analysis in the following JSON format:
{
  "summary": "one_sentence_summary_of_collaboration_quality",
  "strengths": ["strength_1", "strength_2"],
  "weaknesses": ["weakness_1", "weakness_2"],
  "insights": [
    {
      "type": "success|failure|neutral",
      "category": "workflow|communication|tool_use|technical",
      "content": "specific_insight",
      "recommendation": "recommendation_based_on_the_insight"
    }
  ],
  "nextSteps": ["next_step_1", "next_step_2"]
}

Return JSON only, with no extra explanatory text.`;

// OpenAI-compatible API client
export class LLMClient {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  private async request(messages: Array<{ role: string; content: string }>): Promise<string> {
    const url = `${this.config.baseURL.replace(/\/$/, '')}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // Deep prompt analysis
  async analyzePromptsDeep(entries: LogEntry[], _baseAnalysis: PromptAnalysis): Promise<{
    issues: Array<{ type: string; severity: string; title: string; description: string; suggestion: string }>;
    suggestions: Array<{ original: string; improved: string; explanation: string; impact: string; category: string }>;
    bestPractices: string[];
    overallAssessment: string;
  }> {
    const messages = [
      { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
      { role: 'user', content: buildAnalysisPrompt(entries) },
    ];

    const response = await this.request(messages);

    // Attempt to parse JSON
    try {
      // Clean the response to ensure valid JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse LLM response:', e);
      console.error('Response:', response);
      throw new Error('Failed to parse AI response');
    }
  }

  // Deep review: distill lessons and suggest improvements
  async analyzeExperience(entries: LogEntry[]): Promise<{
    summary: string;
    strengths: string[];
    weaknesses: string[];
    insights: Array<{ type: 'success' | 'failure' | 'neutral'; category: 'workflow' | 'communication' | 'tool_use' | 'technical'; content: string; recommendation: string }>;
    nextSteps: string[];
  }> {
    const messages = [
      { role: 'system', content: EXPERIENCE_SYSTEM_PROMPT },
      { role: 'user', content: buildAnalysisPrompt(entries) },
    ];

    const response = await this.request(messages);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('Failed to parse Experience analysis:', e);
      throw new Error('Failed to parse experience analysis report');
    }
  }

  // Optimize a single prompt
  async optimizePrompt(prompt: string): Promise<{
    original: string;
    improved: string;
    explanation: string;
  }> {
    const messages = [
      {
        role: 'system',
        content: `You are a prompt optimization expert. Improve the user's prompt so it becomes clearer and more effective.

Return the result in the following JSON format:
{
  "original": "original_prompt",
  "improved": "improved_prompt",
  "explanation": "explanation"
}

Return JSON only, with no additional text.`,
      },
      {
        role: 'user',
        content: `Optimize the following prompt:\n\n${prompt}`,
      },
    ];

    const response = await this.request(messages);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      const result = JSON.parse(jsonMatch[0]);
      return {
        original: result.original || prompt,
        improved: result.improved,
        explanation: result.explanation,
      };
    } catch (e) {
      console.error('Failed to parse LLM response:', e);
      throw new Error('Failed to parse AI response');
    }
  }

  // Test connectivity
  async testConnection(): Promise<boolean> {
    const messages = [
      { role: 'user', content: 'Reply with "OK"' },
    ];
    const response = await this.request(messages);
    return response.includes('OK');
  }
}

// Create a client instance
export function createLLMClient(config: LLMConfig): LLMClient {
  return new LLMClient(config);
}

// Validate config
export function validateConfig(config: LLMConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.name.trim()) {
    errors.push('Please enter a configuration name');
  }
  if (!config.baseURL.trim()) {
    errors.push('Please enter an API URL');
  } else {
    try {
      new URL(config.baseURL);
    } catch {
      errors.push('The API URL format is invalid');
    }
  }
  if (!config.apiKey.trim()) {
    errors.push('Please enter an API key');
  }
  if (!config.model.trim()) {
    errors.push('Please enter a model name');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
