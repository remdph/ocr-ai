# Changelog

All notable changes to this project will be documented in this file.

## [1.0.2] - 2024-12-20

### Changed

- **Breaking:** Renamed main class from `ExtractaAI` to `OcrAI`
- **Breaking:** Renamed config type from `ExtractaConfig` to `OcrConfig`
- **Breaking:** Renamed factory function from `createExtractaAI` to `createOcrAI`
- Renamed internal file from `extracta.ts` to `ocr.ts`

### Added

- Documented custom model selection in README with examples
- Added JSDoc documentation for model defaults per provider

### Migration

Update your imports and class usage:

```typescript
// Before
import { ExtractaAI } from 'ocr-ai';
const extracta = new ExtractaAI({ provider: 'gemini', apiKey: '...' });

// After
import { OcrAI } from 'ocr-ai';
const ocr = new OcrAI({ provider: 'gemini', apiKey: '...' });
```

## [1.0.1] - 2024-12-20

Initial public release.

### Features

- Multi-provider support: Gemini, OpenAI, Claude, Grok, Vertex AI
- Flexible input sources: local paths, URLs, Buffers, base64 strings
- Structured extraction with JSON schemas
- Token usage tracking and processing time metadata
- Model configuration: temperature, maxTokens, topP, topK, stopSequences
- File output option to save results directly to disk

### Supported File Types

- Images: jpg, jpeg, png, gif, webp, bmp, tiff, tif
- Documents: pdf
- Text: txt, md, csv, json, xml, html, htm
