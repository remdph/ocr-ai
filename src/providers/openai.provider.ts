import OpenAI from 'openai';
import type { AIProvider, ExtractionOptions, FileInfo, ModelConfig, ProviderResult, TokenUsage } from '../types';
import { BaseProvider } from './base.provider';

const DEFAULT_MODEL = 'gpt-4o';

export class OpenAIProvider extends BaseProvider {
  readonly name: AIProvider = 'openai';
  readonly model: string;

  private client: OpenAI;

  constructor(apiKey: string, model?: string) {
    super(apiKey);
    this.model = model || DEFAULT_MODEL;
    this.client = new OpenAI({ apiKey });
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
      response_format: { type: 'json_object' },
    });

    const text = response.choices[0]?.message?.content || '{}';
    const tokens = this.extractTokenUsage(response);

    return {
      content: this.parseJsonResponse<T>(text),
      tokens,
    };
  }

  private buildCompletionOptions(modelConfig?: ModelConfig): Record<string, unknown> {
    const options: Record<string, unknown> = {};

    // GPT-5 and o1/o3 models use max_completion_tokens instead of max_tokens
    const useMaxCompletionTokens = this.model.startsWith('gpt-5') ||
                                    this.model.startsWith('o1') ||
                                    this.model.startsWith('o3');

    const tokenParam = useMaxCompletionTokens ? 'max_completion_tokens' : 'max_tokens';
    options[tokenParam] = modelConfig?.maxTokens ?? 16384;

    if (modelConfig?.temperature !== undefined) {
      options.temperature = modelConfig.temperature;
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

    // For images and PDFs
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
