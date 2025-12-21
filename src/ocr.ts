import type {
  AIProvider,
  OcrConfig,
  ExtractionOptions,
  ExtractionResult,
  FileInfo,
  IAIProvider,
  JsonExtractionResult,
  TextExtractionResult,
} from './types';
import {
  ClaudeProvider,
  GeminiProvider,
  GrokProvider,
  OpenAIProvider,
  VertexProvider,
} from './providers';
import {
  loadFile,
  loadFileFromBase64,
  loadFileFromBuffer,
  loadFileFromUrl,
  isUrl,
  saveToFile,
} from './loaders';

/**
 * Main class for document extraction using AI
 */
export class OcrAI {
  private provider: IAIProvider;
  private config: OcrConfig;

  constructor(config: OcrConfig) {
    this.config = config;
    this.provider = this.createProvider(config);
  }

  /**
   * Create a provider instance based on configuration
   */
  private createProvider(config: OcrConfig): IAIProvider {
    switch (config.provider) {
      case 'gemini':
        if (!config.apiKey) throw new Error('API key is required for Gemini provider');
        return new GeminiProvider(config.apiKey, config.model);
      case 'openai':
        if (!config.apiKey) throw new Error('API key is required for OpenAI provider');
        return new OpenAIProvider(config.apiKey, config.model);
      case 'claude':
        if (!config.apiKey) throw new Error('API key is required for Claude provider');
        return new ClaudeProvider(config.apiKey, config.model);
      case 'grok':
        if (!config.apiKey) throw new Error('API key is required for Grok provider');
        return new GrokProvider(config.apiKey, config.model);
      case 'vertex':
        if (!config.vertexConfig) throw new Error('vertexConfig is required for Vertex AI provider');
        return new VertexProvider(config.vertexConfig, config.model);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  /**
   * Extract content from a file path or URL
   */
  async extract(
    source: string,
    options?: ExtractionOptions
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      const file = isUrl(source)
        ? await loadFileFromUrl(source)
        : await loadFile(source);
      return this.processExtraction(file, options, startTime);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  /**
   * Extract content from a Buffer
   */
  async extractFromBuffer(
    buffer: Buffer,
    fileName: string,
    options?: ExtractionOptions
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      const file = loadFileFromBuffer(buffer, fileName);
      return this.processExtraction(file, options, startTime);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  /**
   * Extract content from a base64 string
   */
  async extractFromBase64(
    base64: string,
    fileName: string,
    options?: ExtractionOptions
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      const file = loadFileFromBase64(base64, fileName);
      return this.processExtraction(file, options, startTime);
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  /**
   * Process the extraction based on format
   */
  private async processExtraction(
    file: FileInfo,
    options: ExtractionOptions | undefined,
    startTime: number
  ): Promise<ExtractionResult> {
    const format = options?.format || 'text';

    // Check if provider supports the file type
    if (!this.provider.supportsFileType(file.type)) {
      return {
        success: false,
        error: `Provider ${this.provider.name} does not support file type: ${file.type}`,
        code: 'UNSUPPORTED_FILE_TYPE',
      };
    }

    try {
      if (format === 'json') {
        if (!options?.schema) {
          return {
            success: false,
            error: 'Schema is required for JSON extraction',
            code: 'MISSING_SCHEMA',
          };
        }

        const providerResult = await this.provider.extractJson(file, options.schema, options);
        const result: JsonExtractionResult = {
          success: true,
          format: 'json',
          data: providerResult.content,
          metadata: {
            provider: this.provider.name,
            model: this.provider.model,
            fileType: file.type,
            fileName: file.name,
            processingTimeMs: Date.now() - startTime,
            tokens: providerResult.tokens,
          },
        };

        // Save to file if outputPath is specified
        if (options.outputPath) {
          await saveToFile(options.outputPath, JSON.stringify(providerResult.content, null, 2));
        }

        return result;
      } else {
        const providerResult = await this.provider.extractText(file, options);
        const result: TextExtractionResult = {
          success: true,
          format: 'text',
          content: providerResult.content,
          metadata: {
            provider: this.provider.name,
            model: this.provider.model,
            fileType: file.type,
            fileName: file.name,
            processingTimeMs: Date.now() - startTime,
            tokens: providerResult.tokens,
          },
        };

        // Save to file if outputPath is specified
        if (options?.outputPath) {
          await saveToFile(options.outputPath, providerResult.content);
        }

        return result;
      }
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  /**
   * Create an error result
   */
  private createErrorResult(error: unknown): ExtractionResult {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: message,
      code: 'EXTRACTION_ERROR',
    };
  }

  /**
   * Get current provider name
   */
  getProvider(): AIProvider {
    return this.provider.name;
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.provider.model;
  }

  /**
   * Change the AI provider
   */
  setProvider(provider: AIProvider, apiKey: string, model?: string): void {
    this.config = { provider, apiKey, model };
    this.provider = this.createProvider(this.config);
  }
}

/**
 * Factory function to create OcrAI instance
 */
export function createOcrAI(config: OcrConfig): OcrAI {
  return new OcrAI(config);
}
