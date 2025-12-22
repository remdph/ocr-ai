# ocr-ai

Multi-provider AI document extraction for Node.js. Extract text or structured JSON from documents using Gemini, OpenAI, Claude, Grok, or Vertex AI.

## Installation

```bash
npm install ocr-ai
```

## Quick Start

### Using Gemini

```typescript
import { OcrAI } from 'ocr-ai';

const ocr = new OcrAI({
  provider: 'gemini',
  apiKey: 'YOUR_GEMINI_API_KEY',
});

const result = await ocr.extract('./invoice.png');

if (result.success) {
  const text = result.content;
  console.log(text);
}
```

### Using OpenAI

```typescript
import { OcrAI } from 'ocr-ai';

const ocr = new OcrAI({
  provider: 'openai',
  apiKey: 'YOUR_OPENAI_API_KEY',
});

const result = await ocr.extract('./document.pdf');

if (result.success) {
  const text = result.content;
  console.log(text);
}
```

### Custom Model

You can specify a custom model for any provider:

```typescript
const ocr = new OcrAI({
  provider: 'gemini',
  apiKey: 'YOUR_GEMINI_API_KEY',
  model: 'gemini-2.0-flash', // Use a specific model
});

// Or with OpenAI
const ocrOpenAI = new OcrAI({
  provider: 'openai',
  apiKey: 'YOUR_OPENAI_API_KEY',
  model: 'gpt-4o-mini', // Use a different model
});
```

### From URL

Extract directly from a URL:

```typescript
const result = await ocr.extract('https://example.com/invoice.png');

if (result.success) {
  console.log(result.content);
}
```

### Custom Instructions

You can provide custom instructions to guide the extraction:

```typescript
const result = await ocr.extract('./receipt.png', {
  prompt: 'Extract only the total amount and date from this receipt',
});

if (result.success) {
  console.log(result.content);
  // Output: "Total: $154.06, Date: 11/02/2019"
}
```

### Output Format

By default, extraction returns text. You can also extract structured JSON:

```typescript
// Text output (default)
const textResult = await ocr.extract('./invoice.png', {
  format: 'text',
});

if (textResult.success) {
  console.log(textResult.content); // string
}

// JSON output with schema
const jsonResult = await ocr.extract('./invoice.png', {
  format: 'json',
  schema: {
    invoice_number: 'string',
    date: 'string',
    total: 'number',
    items: [{ name: 'string', quantity: 'number', price: 'number' }],
  },
});

if (jsonResult.success) {
  console.log(jsonResult.data); // { invoice_number: "US-001", date: "11/02/2019", total: 154.06, items: [...] }
}
```

### JSON Schema

The schema defines the structure of the data you want to extract. Use a simple object where keys are field names and values are types:

**Basic types:**
- `'string'` - Text values
- `'number'` - Numeric values
- `'boolean'` - True/false values

**Nested objects:**
```typescript
const schema = {
  company: {
    name: 'string',
    address: 'string',
    phone: 'string',
  },
  customer: {
    name: 'string',
    email: 'string',
  },
};
```

**Arrays:**
```typescript
const schema = {
  // Array of objects
  items: [
    {
      description: 'string',
      quantity: 'number',
      unit_price: 'number',
      total: 'number',
    },
  ],
  // Simple array
  tags: ['string'],
};
```

**Complete example (invoice):**
```typescript
const invoiceSchema = {
  invoice_number: 'string',
  date: 'string',
  due_date: 'string',
  company: {
    name: 'string',
    address: 'string',
    phone: 'string',
    email: 'string',
  },
  bill_to: {
    name: 'string',
    address: 'string',
  },
  items: [
    {
      description: 'string',
      quantity: 'number',
      unit_price: 'number',
      total: 'number',
    },
  ],
  subtotal: 'number',
  tax: 'number',
  total: 'number',
};

const result = await ocr.extract('./invoice.png', {
  format: 'json',
  schema: invoiceSchema,
  prompt: 'Extract all invoice data from this document.',
});
```

### Model Configuration

You can pass model-specific parameters like temperature, max tokens, and more:

```typescript
// Gemini with model config
const result = await ocr.extract('./invoice.png', {
  modelConfig: {
    temperature: 0.2,
    maxTokens: 4096,
    topP: 0.8,
    topK: 40,
  },
});

// OpenAI with model config
const result = await ocr.extract('./invoice.png', {
  modelConfig: {
    temperature: 0,
    maxTokens: 2048,
    topP: 1,
  },
});
```

Available options:

| Option | Description | Supported Providers |
|--------|-------------|---------------------|
| temperature | Controls randomness (0.0-1.0+) | All |
| maxTokens | Maximum tokens to generate | All |
| topP | Nucleus sampling | All |
| topK | Top-k sampling | Gemini, Claude, Vertex |
| stopSequences | Stop generation at these strings | All |

### Token Usage

Access token usage information from the metadata:

```typescript
const result = await ocr.extract('./invoice.png');

if (result.success) {
  console.log(result.content);

  // Access metadata
  console.log(result.metadata.processingTimeMs); // 2351
  console.log(result.metadata.tokens?.inputTokens); // 1855
  console.log(result.metadata.tokens?.outputTokens); // 260
  console.log(result.metadata.tokens?.totalTokens); // 2115
}
```

## Supported Providers

| Provider | Default Model | Auth |
|----------|---------------|------|
| gemini   | gemini-1.5-flash | API Key |
| openai   | gpt-4o | API Key |
| claude   | claude-sonnet-4-20250514 | API Key |
| grok     | grok-2-vision-1212 | API Key |
| vertex   | gemini-2.0-flash | Google Cloud |

> **Note:** For enterprise OCR needs, see [Advanced: Vertex AI](#advanced-vertex-ai-google-cloud) section below.

## Supported Inputs

- **Local files**: `./invoice.png`, `./document.pdf`
- **URLs**: `https://example.com/invoice.png`

## Supported Files

- **Images**: jpg, png, gif, webp
- **Documents**: pdf
- **Text**: txt, md, csv, json, xml, html

## Advanced: Vertex AI (Google Cloud)

The `vertex` provider enables access to Google Cloud's AI infrastructure, which is useful for enterprise scenarios requiring:

- **Compliance**: Data residency and regulatory requirements
- **Integration**: Native integration with Google Cloud services (BigQuery, Cloud Storage, etc.)
- **Specialized OCR**: Access to Google's Document AI and Vision AI processors

### Basic Setup

Vertex AI uses Google Cloud authentication instead of API keys:

```typescript
import { OcrAI } from 'ocr-ai';

const ocr = new OcrAI({
  provider: 'vertex',
  vertexConfig: {
    project: 'your-gcp-project-id',
    location: 'us-central1',
  },
});

const result = await ocr.extract('./invoice.png');
```

**Requirements:**
1. Install the [gcloud CLI](https://cloud.google.com/sdk/docs/install)
2. Run `gcloud auth application-default login`
3. Enable the Vertex AI API in your GCP project

### When to Use Vertex AI vs Gemini API

| Scenario | Recommended |
|----------|-------------|
| Quick prototyping | Gemini (API Key) |
| Personal projects | Gemini (API Key) |
| Enterprise/production | Vertex AI |
| Data residency requirements | Vertex AI |
| High-volume processing | Vertex AI |

### Related Google Cloud OCR Services

For specialized document processing beyond what Gemini models offer, Google Cloud provides dedicated OCR services:

**[Document AI](https://cloud.google.com/document-ai)** - Optimized for structured documents:
- Invoice Parser, Receipt Parser, Form Parser
- W2, 1040, Bank Statement processors
- Custom extractors for domain-specific documents
- Higher accuracy for tables, forms, and handwritten text

**[Vision API](https://cloud.google.com/vision/docs/ocr)** - Optimized for images:
- Real-time OCR with low latency
- 80+ language support
- Handwriting detection
- Simple integration, ~98% accuracy on clean documents

These services are separate from ocr-ai but can complement it for enterprise document pipelines.

## Gemini Model Benchmarks

Performance benchmarks for Gemini models extracting data from an invoice image:

| Model | Text Extraction | JSON Extraction | Best For |
|-------|-----------------|-----------------|----------|
| `gemini-2.0-flash-lite` | 2.8s | 2.1s | High-volume processing, cost optimization |
| `gemini-2.5-flash-lite` | 2.2s | 1.9s | Fastest option, simple documents |
| `gemini-2.0-flash` | 3.9s | 2.9s | General purpose, good balance |
| `gemini-2.5-flash` | 5.0s | 5.0s | Standard documents, reliable |
| `gemini-3-flash-preview` | 12.3s | 10.6s | Complex layouts, newer capabilities |
| `gemini-3-pro-image-preview` | 8.0s | 11.9s | Image-heavy documents |
| `gemini-2.5-pro` | 12.6s | 5.5s | High accuracy, complex documents |
| `gemini-3-pro-preview` | 24.8s | 13.1s | Maximum accuracy, handwritten text |

### Model Recommendations

**For digital documents (invoices, receipts, forms):**
```typescript
// Fast and cost-effective
const ocr = new OcrAI({
  provider: 'gemini',
  apiKey: 'YOUR_API_KEY',
  model: 'gemini-2.5-flash-lite', // ~2s response time
});
```

**For complex documents or when accuracy is critical:**
```typescript
// Higher accuracy, slower processing
const ocr = new OcrAI({
  provider: 'gemini',
  apiKey: 'YOUR_API_KEY',
  model: 'gemini-2.5-pro', // Best accuracy/speed ratio
});
```

**For handwritten documents or poor quality scans:**
```typescript
// Maximum accuracy for difficult documents
const ocr = new OcrAI({
  provider: 'gemini',
  apiKey: 'YOUR_API_KEY',
  model: 'gemini-3-pro-preview', // Best for handwriting
});
```

### Quick Reference

| Use Case | Recommended Model |
|----------|-------------------|
| High-volume batch processing | `gemini-2.5-flash-lite` |
| Standard invoices/receipts | `gemini-2.0-flash` |
| Complex tables and layouts | `gemini-2.5-pro` |
| Handwritten documents | `gemini-3-pro-preview` |
| Poor quality scans | `gemini-3-pro-preview` |
| Real-time applications | `gemini-2.5-flash-lite` |

## OpenAI Model Benchmarks

Performance benchmarks for OpenAI models extracting data from an invoice image:

| Model | Text Extraction | JSON Extraction | Best For |
|-------|-----------------|-----------------|----------|
| `gpt-4.1-nano` | 4.4s | 2.4s | Fastest, cost-effective |
| `gpt-4.1-mini` | 4.8s | 3.2s | Good balance speed/accuracy |
| `gpt-4.1` | 8.2s | 5.4s | High accuracy, reliable |
| `gpt-4o-mini` | 7.2s | 5.7s | Budget-friendly |
| `gpt-4o` | 12.3s | 10.7s | Standard high accuracy |
| `gpt-5.2` | 6.4s | 5.0s | Latest generation |
| `gpt-5-mini` | 12.2s | 7.9s | GPT-5 balanced option |
| `gpt-5-nano` | 19.9s | 16.1s | GPT-5 economy tier |

> **Note:** `gpt-5.2-pro` and `gpt-image-1` use different API endpoints and are not currently supported.

### Model Recommendations

**For digital documents (invoices, receipts, forms):**
```typescript
// Fast and cost-effective
const ocr = new OcrAI({
  provider: 'openai',
  apiKey: 'YOUR_API_KEY',
  model: 'gpt-4.1-nano', // ~2-4s response time
});
```

**For complex documents or when accuracy is critical:**
```typescript
// Higher accuracy, reliable extraction
const ocr = new OcrAI({
  provider: 'openai',
  apiKey: 'YOUR_API_KEY',
  model: 'gpt-4.1', // Best accuracy/speed ratio
});
```

**For handwritten documents or poor quality scans:**
```typescript
// Maximum accuracy for difficult documents
const ocr = new OcrAI({
  provider: 'openai',
  apiKey: 'YOUR_API_KEY',
  model: 'gpt-5.2', // Latest generation, best accuracy
});
```

### Quick Reference

| Use Case | Recommended Model |
|----------|-------------------|
| High-volume batch processing | `gpt-4.1-nano` |
| Standard invoices/receipts | `gpt-4.1-mini` |
| Complex tables and layouts | `gpt-4.1` |
| Handwritten documents | `gpt-5.2` |
| Poor quality scans | `gpt-5.2` |
| Real-time applications | `gpt-4.1-nano` |
| Budget-conscious projects | `gpt-4o-mini` |

## License

MIT
