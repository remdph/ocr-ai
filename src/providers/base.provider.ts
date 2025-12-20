import type {
  AIProvider,
  ExtractionOptions,
  FileInfo,
  IAIProvider,
  ProviderResult,
  SupportedFileType,
} from '../types';

/**
 * Base class for AI providers with common functionality
 */
export abstract class BaseProvider implements IAIProvider {
  abstract readonly name: AIProvider;
  abstract readonly model: string;

  protected apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error(`API key is required for ${this.constructor.name}`);
    }
    this.apiKey = apiKey;
  }

  abstract extractText(file: FileInfo, options?: ExtractionOptions): Promise<ProviderResult<string>>;

  abstract extractJson<T = Record<string, unknown>>(
    file: FileInfo,
    schema: Record<string, unknown>,
    options?: ExtractionOptions
  ): Promise<ProviderResult<T>>;

  supportsFileType(type: SupportedFileType): boolean {
    return ['pdf', 'image', 'text'].includes(type);
  }

  /**
   * Build the text extraction prompt
   */
  protected buildTextPrompt(options?: ExtractionOptions): string {
    const basePrompt = options?.prompt || 'Extract all text content from this document.';
    const languageHint =
      options?.language && options.language !== 'auto'
        ? ` Respond in ${options.language}.`
        : '';

    return `${basePrompt}${languageHint}

Please extract and return all the text content from the provided document.
Maintain the original structure and formatting as much as possible.
Return only the extracted text, without any additional commentary or metadata.`;
  }

  /**
   * Build the JSON extraction prompt
   */
  protected buildJsonPrompt(
    schema: Record<string, unknown>,
    options?: ExtractionOptions
  ): string {
    const basePrompt =
      options?.prompt || 'Extract structured data from this document.';
    const languageHint =
      options?.language && options.language !== 'auto'
        ? ` Text content should be in ${options.language}.`
        : '';

    return `${basePrompt}${languageHint}

Extract data from the provided document and return it as a JSON object following this schema:

${JSON.stringify(schema, null, 2)}

Important:
- Return ONLY valid JSON, no additional text or markdown formatting
- Follow the schema structure exactly
- If a field cannot be extracted, use null
- Do not include any explanation, just the JSON object`;
  }

  /**
   * Parse JSON response from AI, handling potential formatting issues
   */
  protected parseJsonResponse<T>(response: string): T {
    let cleaned = response.trim();

    // Remove markdown code blocks if present
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }

    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }

    cleaned = cleaned.trim();

    try {
      return JSON.parse(cleaned) as T;
    } catch {
      throw new Error(`Failed to parse JSON response: ${response.substring(0, 200)}...`);
    }
  }
}
