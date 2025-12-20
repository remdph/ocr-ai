import { ExtractaAI } from '../../src';
import * as path from 'path';

const API_KEY = 'YOUR_GEMINI_API_KEY';

async function main() {
  console.log('ExtractaAI - Gemini URL Test\n');

  const extracta = new ExtractaAI({
    provider: 'gemini',
    apiKey: API_KEY,
    model: 'gemini-2.0-flash',
  });

  console.log(`Provider: ${extracta.getProvider()}`);
  console.log(`Model: ${extracta.getModel()}\n`);

  const invoiceUrl = 'https://www.invoicesimple.com/wp-content/uploads/2024/08/navy-invoice-template-centered-en.jpg';

  console.log(`Source: ${invoiceUrl}\n`);

  // Test: Extract structured JSON from URL
  console.log('-'.repeat(50));
  console.log('Test: JSON extraction from URL');
  console.log('-'.repeat(50));

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

  const outputPath = path.join(__dirname, 'export.json');

  const result = await extracta.extract(invoiceUrl, {
    format: 'json',
    schema: invoiceSchema,
    prompt: 'Extract all invoice data from this image.',
    outputPath,
  });

  if (result.success && result.format === 'json') {
    console.log('[OK] JSON extraction successful!\n');
    console.log('Extracted data:');
    console.log('-'.repeat(30));
    console.log(JSON.stringify(result.data, null, 2));
    console.log('-'.repeat(30));
    console.log(`\nProcessing time: ${result.metadata.processingTimeMs}ms`);
    if (result.metadata.tokens) {
      console.log(`Tokens - Input: ${result.metadata.tokens.inputTokens}, Output: ${result.metadata.tokens.outputTokens}, Total: ${result.metadata.tokens.totalTokens}`);
    }
    console.log(`\nSaved to: ${outputPath}`);
  } else if (!result.success) {
    console.log(`[ERROR] ${result.error}`);
  }

  console.log('\nTest completed!');
}

main().catch(console.error);
