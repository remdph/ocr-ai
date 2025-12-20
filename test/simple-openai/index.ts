import { ExtractaAI } from '../../src';
import * as path from 'path';

const API_KEY = 'YOUR_OPENAI_API_KEY';

async function main() {
  console.log('ExtractaAI - Simple OpenAI Test\n');

  const extracta = new ExtractaAI({
    provider: 'openai',
    apiKey: API_KEY,
    model: 'gpt-4o',
  });

  console.log(`Provider: ${extracta.getProvider()}`);
  console.log(`Model: ${extracta.getModel()}\n`);

  const invoicePath = path.join(__dirname, '..', 'simple-gemini-flash', 'invoice1.png');

  // Test 1: Extract text from image
  console.log('-'.repeat(50));
  console.log('Test 1: Text extraction from invoice image');
  console.log('-'.repeat(50));

  const textResult = await extracta.extract(invoicePath, {
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

  const jsonResult = await extracta.extract(invoicePath, {
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

  const saveResult = await extracta.extract(invoicePath, {
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
