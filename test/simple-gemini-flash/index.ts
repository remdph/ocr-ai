import { OcrAI } from '../../src';
import * as path from 'path';

const API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

async function main() {
  console.log('OcrAI - Simple Gemini Flash Test\n');

  const ocr = new OcrAI({
    provider: 'gemini',
    apiKey: API_KEY,
    model: MODEL,
  });

  console.log(`Provider: ${ocr.getProvider()}`);
  console.log(`Model: ${ocr.getModel()}\n`);

  const invoicePath = path.join(__dirname, 'invoice1.png');

  // Test 1: Extract text from image
  console.log('-'.repeat(50));
  console.log('Test 1: Text extraction from invoice image');
  console.log('-'.repeat(50));

  const textResult = await ocr.extract(invoicePath, {
    format: 'text',
    prompt: 'Extract all the text from this invoice image.',
  });

  if (textResult.success && textResult.format === 'text') {
    console.log('[OK] Text extraction successful!\n');
    console.log('Extracted content:');
    console.log('-'.repeat(30));
    console.log(textResult.content);
    console.log('-'.repeat(30));
    console.log(`\nProcessing time: ${textResult.metadata.processingTimeMs}ms`);
    if (textResult.metadata.tokens) {
      console.log(`Tokens - Input: ${textResult.metadata.tokens.inputTokens}, Output: ${textResult.metadata.tokens.outputTokens}, Total: ${textResult.metadata.tokens.totalTokens}`);
    }
  } else if (!textResult.success) {
    console.log(`[ERROR] ${textResult.error}`);
  }

  // Test 2: Extract structured JSON
  console.log('\n' + '-'.repeat(50));
  console.log('Test 2: JSON extraction with schema');
  console.log('-'.repeat(50));

  const invoiceSchema = {
    invoice_number: 'string',
    date: 'string',
    customer: 'string',
    items: [
      {
        name: 'string',
        quantity: 'number',
        unit_price: 'number',
        total: 'number',
      },
    ],
    subtotal: 'number',
    tax: 'number',
    total: 'number',
  };

  const jsonResult = await ocr.extract(invoicePath, {
    format: 'json',
    schema: invoiceSchema,
    prompt: 'Extract the invoice data from this image.',
  });

  if (jsonResult.success && jsonResult.format === 'json') {
    console.log('[OK] JSON extraction successful!\n');
    console.log('Extracted data:');
    console.log('-'.repeat(30));
    console.log(JSON.stringify(jsonResult.data, null, 2));
    console.log('-'.repeat(30));
    console.log(`\nProcessing time: ${jsonResult.metadata.processingTimeMs}ms`);
    if (jsonResult.metadata.tokens) {
      console.log(`Tokens - Input: ${jsonResult.metadata.tokens.inputTokens}, Output: ${jsonResult.metadata.tokens.outputTokens}, Total: ${jsonResult.metadata.tokens.totalTokens}`);
    }
  } else if (!jsonResult.success) {
    console.log(`[ERROR] ${jsonResult.error}`);
  }

  // Test 3: Save output to file
  console.log('\n' + '-'.repeat(50));
  console.log('Test 3: Save extraction to disk');
  console.log('-'.repeat(50));

  const outputPath = path.join(__dirname, 'output.json');

  const saveResult = await ocr.extract(invoicePath, {
    format: 'json',
    schema: invoiceSchema,
    outputPath,
  });

  if (saveResult.success) {
    console.log(`[OK] Output saved to: ${outputPath}`);
    console.log(`Processing time: ${saveResult.metadata.processingTimeMs}ms`);
  } else {
    console.log(`[ERROR] ${saveResult.error}`);
  }

  console.log('\nAll tests completed!');
}

main().catch(console.error);
