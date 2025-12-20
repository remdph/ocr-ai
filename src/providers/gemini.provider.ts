import { GoogleGenerativeAI, type GenerationConfig } from '@google/generative-ai';
import type { AIProvider, ExtractionOptions, FileInfo, ModelConfig, ProviderResult, TokenUsage } from '../types';
import { BaseProvider } from './base.provider';

const DEFAULT_MODEL = 'gemini-1.5-flash';

export class GeminiProvider extends BaseProvider {
  readonly name: AIProvider = 'gemini';
  readonly model: string;

  private client: GoogleGenerativeAI;

  constructor(apiKey: string, model?: string) {
    super(apiKey);
    this.model = model || DEFAULT_MODEL;
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async extractText(file: FileInfo, options?: ExtractionOptions): Promise<ProviderResult<string>> {
    const generationConfig = this.buildGenerationConfig(options?.modelConfig);
    const model = this.client.getGenerativeModel({
      model: this.model,
      generationConfig,
    });
    const prompt = this.buildTextPrompt(options);

    const content = this.buildContent(file, prompt);
    const result = await model.generateContent(content);
    const response = result.response;

    const tokens = this.extractTokenUsage(response);

    return {
      content: response.text(),
      tokens,
    };
  }

  async extractJson<T = Record<string, unknown>>(
    file: FileInfo,
    schema: Record<string, unknown>,
    options?: ExtractionOptions
  ): Promise<ProviderResult<T>> {
    const generationConfig = this.buildGenerationConfig(options?.modelConfig, {
      responseMimeType: 'application/json',
    });
    const model = this.client.getGenerativeModel({
      model: this.model,
      generationConfig,
    });

    const prompt = this.buildJsonPrompt(schema, options);
    const content = this.buildContent(file, prompt);

    const result = await model.generateContent(content);
    const response = result.response;
    const text = response.text();

    const tokens = this.extractTokenUsage(response);

    return {
      content: this.parseJsonResponse<T>(text),
      tokens,
    };
  }

  private buildGenerationConfig(
    modelConfig?: ModelConfig,
    defaults?: Partial<GenerationConfig>
  ): GenerationConfig {
    const config: GenerationConfig = { ...defaults };

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

  private buildContent(
    file: FileInfo,
    prompt: string
  ): Parameters<ReturnType<GoogleGenerativeAI['getGenerativeModel']>['generateContent']>[0] {
    if (file.type === 'text') {
      return `${prompt}\n\nDocument content:\n${file.content.toString('utf-8')}`;
    }

    // For images and PDFs, use inline data
    return [
      {
        inlineData: {
          mimeType: file.mimeType,
          data: file.base64 || file.content.toString('base64'),
        },
      },
      { text: prompt },
    ];
  }
}
