import { OcrAIPromise } from '../../src';
import * as path from 'path';

const API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

// Use the same invoice from simple-gemini-flash
const invoicePath = path.join(__dirname, '../simple-gemini-flash/invoice1.png');

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

console.log('OcrAI - Promise API Test\n');
console.log(`Provider: gemini`);
console.log(`Model: ${MODEL}\n`);

const ocr = new OcrAIPromise({
  provider: 'gemini',
  apiKey: API_KEY,
  model: MODEL,
});

// Test 1: Using .then()/.catch() chain
console.log('-'.repeat(50));
console.log('Test 1: Promise chain with .then()/.catch()');
console.log('-'.repeat(50));

ocr.extract(invoicePath, { format: 'text' })
  .then((result) => {
    if (result.success && result.format === 'text') {
      console.log('[OK] Text extraction successful!');
      console.log(`Processing time: ${result.metadata.processingTimeMs}ms`);
      console.log(`Content preview: ${result.content.substring(0, 100)}...\n`);
    } else if (!result.success) {
      console.log(`[ERROR] ${result.error}\n`);
    }

    // Test 2: Callback style
    console.log('-'.repeat(50));
    console.log('Test 2: Callback style');
    console.log('-'.repeat(50));

    ocr.extract(invoicePath, { format: 'text' }, (error, result) => {
      if (error) {
        console.log(`[ERROR] Callback error: ${error.message}\n`);
      } else if (result && result.success && result.format === 'text') {
        console.log('[OK] Callback extraction successful!');
        console.log(`Processing time: ${result.metadata.processingTimeMs}ms`);
        console.log(`Content preview: ${result.content.substring(0, 100)}...\n`);
      }

      // Test 3: extractMany - parallel extraction
      runParallelTest();
    });
  })
  .catch((error) => {
    console.log(`[ERROR] Promise chain error: ${error.message}`);
  });

async function runParallelTest() {
  console.log('-'.repeat(50));
  console.log('Test 3: extractMany - parallel extraction (same file 2x)');
  console.log('-'.repeat(50));

  const startTime = Date.now();
  const results = await ocr.extractMany(
    [invoicePath, invoicePath],
    { format: 'text' }
  );

  const totalTime = Date.now() - startTime;
  console.log(`[OK] Extracted ${results.length} files in ${totalTime}ms`);
  results.forEach((result, index) => {
    if (result.success) {
      console.log(`  File ${index + 1}: ${result.metadata.processingTimeMs}ms`);
    }
  });
  console.log('');

  // Test 4: extractBatch with different options
  await runBatchTest();
}

async function runBatchTest() {
  console.log('-'.repeat(50));
  console.log('Test 4: extractBatch - different options per file');
  console.log('-'.repeat(50));

  const results = await ocr.extractBatch([
    { source: invoicePath, options: { format: 'text' } },
    { source: invoicePath, options: { format: 'json', schema: invoiceSchema } },
  ]);

  console.log(`[OK] Batch extraction completed`);
  results.forEach((result, index) => {
    if (result.success) {
      console.log(`  Item ${index + 1}: format=${result.format}, time=${result.metadata.processingTimeMs}ms`);
    }
  });
  console.log('');

  // Test 5: extractWithRetry
  await runRetryTest();
}

async function runRetryTest() {
  console.log('-'.repeat(50));
  console.log('Test 5: extractWithRetry');
  console.log('-'.repeat(50));

  const result = await ocr.extractWithRetry(
    invoicePath,
    { format: 'json', schema: invoiceSchema },
    3,    // retries
    1000  // delay
  );

  if (result.success && result.format === 'json') {
    console.log('[OK] Retry extraction successful!');
    console.log(`Processing time: ${result.metadata.processingTimeMs}ms`);
    console.log(`Invoice number: ${result.data.invoice_number}`);
    console.log(`Total: ${result.data.total}`);
  } else if (!result.success) {
    console.log(`[ERROR] ${result.error}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('All Promise API tests completed!');
  console.log('='.repeat(50));
}
