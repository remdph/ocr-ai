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

/**
 * Callback types for Promise-based API
 */
export type ExtractionCallback<T = ExtractionResult> = (error: Error | null, result?: T) => void;

/**
 * Promise-based wrapper for OcrAI with callback support
 * Provides an alternative async API for users who prefer callbacks or need more control over promise handling
 */
export class OcrAIPromise {
  private ocr: OcrAI;

  constructor(config: OcrConfig) {
    this.ocr = new OcrAI(config);
  }

  /**
   * Extract content from a file path or URL with callback support
   * @param source - File path or URL
   * @param options - Extraction options
   * @param callback - Optional callback (error, result)
   * @returns Promise if no callback provided
   */
  extract(
    source: string,
    options?: ExtractionOptions,
    callback?: ExtractionCallback
  ): Promise<ExtractionResult> | void {
    const promise = this.ocr.extract(source, options);

    if (callback) {
      promise
        .then((result) => {
          if (result.success) {
            callback(null, result);
          } else {
            callback(new Error(result.error), result);
          }
        })
        .catch((error) => callback(error instanceof Error ? error : new Error(String(error))));
      return;
    }

    return promise;
  }

  /**
   * Extract content from a Buffer with callback support
   */
  extractFromBuffer(
    buffer: Buffer,
    fileName: string,
    options?: ExtractionOptions,
    callback?: ExtractionCallback
  ): Promise<ExtractionResult> | void {
    const promise = this.ocr.extractFromBuffer(buffer, fileName, options);

    if (callback) {
      promise
        .then((result) => {
          if (result.success) {
            callback(null, result);
          } else {
            callback(new Error(result.error), result);
          }
        })
        .catch((error) => callback(error instanceof Error ? error : new Error(String(error))));
      return;
    }

    return promise;
  }

  /**
   * Extract content from a base64 string with callback support
   */
  extractFromBase64(
    base64: string,
    fileName: string,
    options?: ExtractionOptions,
    callback?: ExtractionCallback
  ): Promise<ExtractionResult> | void {
    const promise = this.ocr.extractFromBase64(base64, fileName, options);

    if (callback) {
      promise
        .then((result) => {
          if (result.success) {
            callback(null, result);
          } else {
            callback(new Error(result.error), result);
          }
        })
        .catch((error) => callback(error instanceof Error ? error : new Error(String(error))));
      return;
    }

    return promise;
  }

  /**
   * Extract multiple files in parallel
   * @param sources - Array of file paths or URLs
   * @param options - Extraction options (applied to all)
   * @returns Promise resolving to array of results
   */
  extractMany(
    sources: string[],
    options?: ExtractionOptions
  ): Promise<ExtractionResult[]> {
    return Promise.all(sources.map((source) => this.ocr.extract(source, options)));
  }

  /**
   * Extract multiple files with individual options
   * @param items - Array of { source, options } objects
   * @returns Promise resolving to array of results
   */
  extractBatch(
    items: Array<{ source: string; options?: ExtractionOptions }>
  ): Promise<ExtractionResult[]> {
    return Promise.all(items.map((item) => this.ocr.extract(item.source, item.options)));
  }

  /**
   * Extract with automatic retry on failure
   * @param source - File path or URL
   * @param options - Extraction options
   * @param retries - Number of retries (default: 3)
   * @param delayMs - Delay between retries in ms (default: 1000)
   * @returns Promise resolving to extraction result
   */
  async extractWithRetry(
    source: string,
    options?: ExtractionOptions,
    retries: number = 3,
    delayMs: number = 1000
  ): Promise<ExtractionResult> {
    let lastResult: ExtractionResult | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const result = await this.ocr.extract(source, options);

      if (result.success) {
        return result;
      }

      lastResult = result;

      // Don't delay after the last attempt
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return lastResult!;
  }

  /**
   * Get the underlying OcrAI instance
   */
  getOcrAI(): OcrAI {
    return this.ocr;
  }

  /**
   * Get current provider name
   */
  getProvider(): AIProvider {
    return this.ocr.getProvider();
  }

  /**
   * Get current model
   */
  getModel(): string {
    return this.ocr.getModel();
  }

  /**
   * Change the AI provider
   */
  setProvider(provider: AIProvider, apiKey: string, model?: string): void {
    this.ocr.setProvider(provider, apiKey, model);
  }
}

/**
 * Factory function to create OcrAIPromise instance
 */
export function createOcrAIPromise(config: OcrConfig): OcrAIPromise {
  return new OcrAIPromise(config);
}
