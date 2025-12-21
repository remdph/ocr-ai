// Main exports
export { OcrAI, createOcrAI } from './ocr';

// Type exports
export type {
  AIProvider,
  OutputFormat,
  SupportedFileType,
  ProviderConfig,
  OcrConfig,
  ExtractionOptions,
  ExtractionResult,
  TextExtractionResult,
  JsonExtractionResult,
  ExtractionError,
  ExtractionMetadata,
  TokenUsage,
  ModelConfig,
  VertexConfig,
  FileInfo,
  IAIProvider,
} from './types';

// Loader utilities
export {
  loadFile,
  loadFileFromBuffer,
  loadFileFromBase64,
  loadFileFromUrl,
  isUrl,
  saveToFile,
  getSupportedExtensions,
  isExtensionSupported,
} from './loaders';

// Provider exports (for advanced usage)
export { GeminiProvider } from './providers/gemini.provider';
export { OpenAIProvider } from './providers/openai.provider';
export { ClaudeProvider } from './providers/claude.provider';
export { GrokProvider } from './providers/grok.provider';
export { VertexProvider } from './providers/vertex.provider';
export { BaseProvider } from './providers/base.provider';
