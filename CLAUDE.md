# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ocr-ai is a multi-provider AI document extraction library for Node.js. It provides a unified API to extract text or structured JSON from documents (PDFs, images, text files) using Gemini, OpenAI, Claude, Grok, or Vertex AI.

## Build & Development Commands

```bash
npm run build        # Build with tsup (outputs CJS + ESM to dist/)
npm run dev          # Watch mode for development
npm run test         # Run vitest in watch mode
npm run test:run     # Run vitest once
npm run lint         # Lint TypeScript files with ESLint

# Provider-specific manual tests
npm run test:gemini       # Run Gemini provider test
npm run test:gemini:url   # Run Gemini URL extraction test
npm run test:openai       # Run OpenAI provider test
```

## Architecture

### Core Components

- **ExtractaAI** (`src/extracta.ts`) - Main entry point class. Handles provider instantiation, extraction routing (text vs JSON), and result construction with metadata/token tracking. Supports three input methods: `extract(path|url)`, `extractFromBuffer()`, and `extractFromBase64()`.

- **Provider Interface** (`src/types/index.ts`) - All providers implement `IAIProvider`:
  - `extractText(file, options)` - Returns extracted text with token usage
  - `extractJson(file, schema, options)` - Returns parsed JSON with token usage
  - `supportsFileType(type)` - Check for file type support

- **BaseProvider** (`src/providers/base.provider.ts`) - Abstract base class with shared logic: API key validation, prompt building, JSON parsing (handles markdown code blocks), file type checking.

- **Provider Implementations** (`src/providers/`) - Each provider wraps its respective SDK:
  - `gemini.provider.ts` - Uses `@google/generative-ai`
  - `openai.provider.ts` - Uses `openai` SDK
  - `claude.provider.ts` - Uses `@anthropic-ai/sdk` (special PDF handling via document block type)
  - `grok.provider.ts` - OpenAI-compatible wrapper for `api.x.ai`
  - `vertex.provider.ts` - Uses `@google/genai` for Google Cloud auth

- **File Loader** (`src/loaders/file.loader.ts`) - Handles file loading from paths, URLs, buffers, and base64. Manages MIME type detection and file type categorization (pdf/image/text).

### Key Patterns

- **Discriminated Union Types** - Results use `{ success: true, content/data, metadata }` or `{ success: false, error }` for type-safe error handling
- **Provider Factory** - ExtractaAI instantiates the appropriate provider based on config
- **Template Method** - BaseProvider defines extraction algorithm structure, providers implement specifics

### File Type Support

- Images: jpg, jpeg, png, gif, webp, bmp, tiff, tif
- Documents: pdf
- Text: txt, md, csv, json, xml, html, htm

## Testing

Tests in `test/` are manual integration tests requiring API keys. Each test demonstrates text extraction, JSON extraction with schema, file output, and token usage reporting.
