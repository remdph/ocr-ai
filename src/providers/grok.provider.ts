import OpenAI from 'openai';
import type { AIProvider, ExtractionOptions, FileInfo, ModelConfig, ProviderResult, TokenUsage } from '../types';
import { BaseProvider } from './base.provider';

// Grok uses OpenAI-compatible API
const GROK_BASE_URL = 'https://api.x.ai/v1';
const DEFAULT_MODEL = 'grok-2-vision-1212';

export class GrokProvider extends BaseProvider {
  readonly name: AIProvider = 'grok';
  readonly model: string;

  private client: OpenAI;

  constructor(apiKey: string, model?: string) {
    super(apiKey);
    this.model = model || DEFAULT_MODEL;
    this.client = new OpenAI({
      apiKey,
      baseURL: GROK_BASE_URL,
    });
  }

  async extractText(file: FileInfo, options?: ExtractionOptions): Promise<ProviderResult<string>> {
    const prompt = this.buildTextPrompt(options);
    const messages = this.buildMessages(file, prompt);
    const completionOptions = this.buildCompletionOptions(options?.modelConfig);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      ...completionOptions,
    });

    const tokens = this.extractTokenUsage(response);

    return {
      content: response.choices[0]?.message?.content || '',
      tokens,
    };
  }

  async extractJson<T = Record<string, unknown>>(
    file: FileInfo,
    schema: Record<string, unknown>,
    options?: ExtractionOptions
  ): Promise<ProviderResult<T>> {
    const prompt = this.buildJsonPrompt(schema, options);
    const messages = this.buildMessages(file, prompt);
    const completionOptions = this.buildCompletionOptions(options?.modelConfig);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      ...completionOptions,
    });

    const text = response.choices[0]?.message?.content || '{}';
    const tokens = this.extractTokenUsage(response);

    return {
      content: this.parseJsonResponse<T>(text),
      tokens,
    };
  }

  private buildCompletionOptions(modelConfig?: ModelConfig): Record<string, unknown> {
    const options: Record<string, unknown> = {
      max_tokens: 16384,
    };

    if (modelConfig?.temperature !== undefined) {
      options.temperature = modelConfig.temperature;
    }
    if (modelConfig?.maxTokens !== undefined) {
      options.max_tokens = modelConfig.maxTokens;
    }
    if (modelConfig?.topP !== undefined) {
      options.top_p = modelConfig.topP;
    }
    if (modelConfig?.stopSequences !== undefined) {
      options.stop = modelConfig.stopSequences;
    }

    return options;
  }

  private extractTokenUsage(response: OpenAI.Chat.Completions.ChatCompletion): TokenUsage | undefined {
    const usage = response.usage;
    if (!usage) return undefined;

    return {
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    };
  }

  private buildMessages(
    file: FileInfo,
    prompt: string
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    if (file.type === 'text') {
      return [
        {
          role: 'user',
          content: `${prompt}\n\nDocument content:\n${file.content.toString('utf-8')}`,
        },
      ];
    }

    // For images and PDFs - Grok uses OpenAI-compatible format
    const base64 = file.base64 || file.content.toString('base64');
    const imageUrl = `data:${file.mimeType};base64,${base64}`;

    return [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high',
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ];
  }
}
