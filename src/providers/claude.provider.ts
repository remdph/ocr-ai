import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, ExtractionOptions, FileInfo, ModelConfig, ProviderResult, SupportedFileType, TokenUsage } from '../types';
import { BaseProvider } from './base.provider';

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export class ClaudeProvider extends BaseProvider {
  readonly name: AIProvider = 'claude';
  readonly model: string;

  private client: Anthropic;

  constructor(apiKey: string, model?: string) {
    super(apiKey);
    this.model = model || DEFAULT_MODEL;
    this.client = new Anthropic({ apiKey });
  }

  async extractText(file: FileInfo, options?: ExtractionOptions): Promise<ProviderResult<string>> {
    const prompt = this.buildTextPrompt(options);
    const messageOptions = this.buildMessageOptions(options?.modelConfig);

    const response = await this.client.messages.create({
      model: this.model,
      messages: [
        {
          role: 'user',
          content: this.buildContent(file, prompt),
        },
      ],
      max_tokens: messageOptions.max_tokens,
      temperature: messageOptions.temperature,
      top_p: messageOptions.top_p,
      top_k: messageOptions.top_k,
      stop_sequences: messageOptions.stop_sequences,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const tokens = this.extractTokenUsage(response);

    return {
      content: textBlock?.text || '',
      tokens,
    };
  }

  async extractJson<T = Record<string, unknown>>(
    file: FileInfo,
    schema: Record<string, unknown>,
    options?: ExtractionOptions
  ): Promise<ProviderResult<T>> {
    const prompt = this.buildJsonPrompt(schema, options);
    const messageOptions = this.buildMessageOptions(options?.modelConfig);

    const response = await this.client.messages.create({
      model: this.model,
      messages: [
        {
          role: 'user',
          content: this.buildContent(file, prompt),
        },
      ],
      max_tokens: messageOptions.max_tokens,
      temperature: messageOptions.temperature,
      top_p: messageOptions.top_p,
      top_k: messageOptions.top_k,
      stop_sequences: messageOptions.stop_sequences,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const text = textBlock?.text || '{}';
    const tokens = this.extractTokenUsage(response);

    return {
      content: this.parseJsonResponse<T>(text),
      tokens,
    };
  }

  private buildMessageOptions(modelConfig?: ModelConfig): {
    max_tokens: number;
    temperature?: number;
    top_p?: number;
    top_k?: number;
    stop_sequences?: string[];
  } {
    const options: {
      max_tokens: number;
      temperature?: number;
      top_p?: number;
      top_k?: number;
      stop_sequences?: string[];
    } = {
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
    if (modelConfig?.topK !== undefined) {
      options.top_k = modelConfig.topK;
    }
    if (modelConfig?.stopSequences !== undefined) {
      options.stop_sequences = modelConfig.stopSequences;
    }

    return options;
  }

  supportsFileType(type: SupportedFileType): boolean {
    // Claude supports images and PDFs via vision
    return ['pdf', 'image', 'text'].includes(type);
  }

  private extractTokenUsage(response: Anthropic.Message): TokenUsage | undefined {
    return {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    };
  }

  private buildContent(file: FileInfo, prompt: string): Anthropic.MessageCreateParams['messages'][0]['content'] {
    if (file.type === 'text') {
      return `${prompt}\n\nDocument content:\n${file.content.toString('utf-8')}`;
    }

    const base64 = file.base64 || file.content.toString('base64');

    // Handle PDF files - Claude supports PDFs via base64
    if (file.type === 'pdf') {
      // For PDFs, we use the document block type
      return [
        {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf' as const,
            data: base64,
          },
        },
        {
          type: 'text' as const,
          text: prompt,
        },
      ] as Anthropic.MessageCreateParams['messages'][0]['content'];
    }

    // Handle images
    return [
      {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: this.getMediaType(file.mimeType),
          data: base64,
        },
      },
      {
        type: 'text' as const,
        text: prompt,
      },
    ];
  }

  private getMediaType(mimeType: string): ImageMediaType {
    const supportedTypes: ImageMediaType[] = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    if (supportedTypes.includes(mimeType as ImageMediaType)) {
      return mimeType as ImageMediaType;
    }

    // Default to JPEG for unsupported image types
    return 'image/jpeg';
  }
}
