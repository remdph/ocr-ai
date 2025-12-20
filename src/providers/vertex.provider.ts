import { GoogleGenAI } from '@google/genai';
import type { AIProvider, ExtractionOptions, FileInfo, ModelConfig, ProviderResult, TokenUsage } from '../types';
import { BaseProvider } from './base.provider';

const DEFAULT_MODEL = 'gemini-2.0-flash';

export interface VertexConfig {
  project: string;
  location: string;
}

export class VertexProvider extends BaseProvider {
  readonly name: AIProvider = 'vertex';
  readonly model: string;

  private client: GoogleGenAI;

  constructor(config: VertexConfig, model?: string) {
    super('vertex');
    this.model = model || DEFAULT_MODEL;
    this.client = new GoogleGenAI({
      vertexai: true,
      project: config.project,
      location: config.location,
    });
  }

  async extractText(file: FileInfo, options?: ExtractionOptions): Promise<ProviderResult<string>> {
    const prompt = this.buildTextPrompt(options);
    const generationConfig = this.buildGenerationConfig(options?.modelConfig);

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: this.buildContents(file, prompt),
      config: generationConfig,
    });

    const tokens = this.extractTokenUsage(response);

    return {
      content: response.text || '',
      tokens,
    };
  }

  async extractJson<T = Record<string, unknown>>(
    file: FileInfo,
    schema: Record<string, unknown>,
    options?: ExtractionOptions
  ): Promise<ProviderResult<T>> {
    const prompt = this.buildJsonPrompt(schema, options);
    const generationConfig = this.buildGenerationConfig(options?.modelConfig, {
      responseMimeType: 'application/json',
    });

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: this.buildContents(file, prompt),
      config: generationConfig,
    });

    const text = response.text || '{}';
    const tokens = this.extractTokenUsage(response);

    return {
      content: this.parseJsonResponse<T>(text),
      tokens,
    };
  }

  private buildGenerationConfig(
    modelConfig?: ModelConfig,
    defaults?: Record<string, unknown>
  ): Record<string, unknown> {
    const config: Record<string, unknown> = { ...defaults };

    if (modelConfig?.temperature !== undefined) {
      config.temperature = modelConfig.temperature;
    }
    if (modelConfig?.maxTokens !== undefined) {
      config.maxOutputTokens = modelConfig.maxTokens;
    }
    if (modelConfig?.topP !== undefined) {
      config.topP = modelConfig.topP;
    }
    if (modelConfig?.topK !== undefined) {
      config.topK = modelConfig.topK;
    }
    if (modelConfig?.stopSequences !== undefined) {
      config.stopSequences = modelConfig.stopSequences;
    }

    return config;
  }

  private extractTokenUsage(response: { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } }): TokenUsage | undefined {
    const usage = response.usageMetadata;
    if (!usage) return undefined;

    return {
      inputTokens: usage.promptTokenCount || 0,
      outputTokens: usage.candidatesTokenCount || 0,
      totalTokens: usage.totalTokenCount || 0,
    };
  }

  private buildContents(file: FileInfo, prompt: string): Array<{ role: string; parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> }> {
    if (file.type === 'text') {
      return [
        {
          role: 'user',
          parts: [
            { text: `${prompt}\n\nDocument content:\n${file.content.toString('utf-8')}` },
          ],
        },
      ];
    }

    // For images and PDFs
    const base64 = file.base64 || file.content.toString('base64');

    return [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: file.mimeType,
              data: base64,
            },
          },
          { text: prompt },
        ],
      },
    ];
  }
}
