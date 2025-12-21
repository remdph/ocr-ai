/**
 * Supported AI providers
 */
export type AIProvider = 'gemini' | 'openai' | 'claude' | 'grok' | 'vertex';

/**
 * Output format for extraction
 */
export type OutputFormat = 'text' | 'json';

/**
 * Supported file types
 */
export type SupportedFileType = 'pdf' | 'image' | 'text';

/**
 * Configuration for a specific AI provider
 */
export interface ProviderConfig {
  apiKey: string;
  model?: string;
}

/**
 * Vertex AI specific configuration
 */
export interface VertexConfig {
  project: string;
  location: string;
}

/**
 * Main configuration for OcrAI
 */
export interface OcrConfig {
  provider: AIProvider;
  apiKey?: string;
  /**
   * Model to use for extraction. If not specified, uses provider defaults:
   * - gemini: 'gemini-1.5-flash'
   * - openai: 'gpt-4o'
   * - claude: 'claude-sonnet-4-20250514'
   * - grok: 'grok-2-vision-1212'
   * - vertex: 'gemini-2.0-flash'
   */
  model?: string;
  /**
   * Vertex AI configuration (required when provider is 'vertex')
   */
  vertexConfig?: VertexConfig;
}

/**
 * Model-specific configuration parameters
 */
export interface ModelConfig {
  /**
   * Controls randomness (0.0 = deterministic, 1.0+ = more random)
   */
  temperature?: number;

  /**
   * Maximum tokens to generate in the response
   */
  maxTokens?: number;

  /**
   * Top-p (nucleus) sampling
   */
  topP?: number;

  /**
   * Top-k sampling (Gemini/Claude only)
   */
  topK?: number;

  /**
   * Stop sequences to end generation
   */
  stopSequences?: string[];
}

/**
 * Options for extraction
 */
export interface ExtractionOptions {
  /**
   * Output format: 'text' for plain text, 'json' for structured JSON
   */
  format?: OutputFormat;

  /**
   * JSON schema to validate/structure the output (only for format: 'json')
   * Can be a JSON Schema object or a simple object describing the structure
   */
  schema?: Record<string, unknown>;

  /**
   * Custom prompt to guide the extraction
   */
  prompt?: string;

  /**
   * Language for extraction (default: 'auto')
   */
  language?: string;

  /**
   * Output file path (if you want to save to disk)
   */
  outputPath?: string;

  /**
   * Model-specific configuration (temperature, maxTokens, etc.)
   */
  modelConfig?: ModelConfig;
}

/**
 * Result of text extraction
 */
export interface TextExtractionResult {
  success: true;
  format: 'text';
  content: string;
  metadata: ExtractionMetadata;
}

/**
 * Result of JSON extraction
 */
export interface JsonExtractionResult<T = Record<string, unknown>> {
  success: true;
  format: 'json';
  data: T;
  metadata: ExtractionMetadata;
}

/**
 * Error result
 */
export interface ExtractionError {
  success: false;
  error: string;
  code: string;
}

/**
 * Combined extraction result type
 */
export type ExtractionResult<T = Record<string, unknown>> =
  | TextExtractionResult
  | JsonExtractionResult<T>
  | ExtractionError;

/**
 * Token usage information
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Metadata about the extraction
 */
export interface ExtractionMetadata {
  provider: AIProvider;
  model: string;
  fileType: SupportedFileType;
  fileName: string;
  processingTimeMs: number;
  tokens?: TokenUsage;
}

/**
 * File information after loading
 */
export interface FileInfo {
  path: string;
  name: string;
  type: SupportedFileType;
  mimeType: string;
  size: number;
  content: Buffer;
  base64?: string;
}

/**
 * Result from provider extraction including tokens
 */
export interface ProviderResult<T = string> {
  content: T;
  tokens?: TokenUsage;
}

/**
 * Interface that all AI providers must implement
 */
export interface IAIProvider {
  readonly name: AIProvider;
  readonly model: string;

  /**
   * Extract text from a file
   */
  extractText(file: FileInfo, options?: ExtractionOptions): Promise<ProviderResult<string>>;

  /**
   * Extract structured JSON from a file
   */
  extractJson<T = Record<string, unknown>>(
    file: FileInfo,
    schema: Record<string, unknown>,
    options?: ExtractionOptions
  ): Promise<ProviderResult<T>>;

  /**
   * Check if the provider supports the given file type
   */
  supportsFileType(type: SupportedFileType): boolean;
}
