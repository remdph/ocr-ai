import * as fs from 'fs/promises';
import * as path from 'path';
import type { FileInfo, SupportedFileType } from '../types';

/**
 * MIME type to file type mapping
 */
const MIME_TO_FILE_TYPE: Record<string, SupportedFileType> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/bmp': 'image',
  'image/tiff': 'image',
  'text/plain': 'text',
  'text/markdown': 'text',
  'text/csv': 'text',
  'application/json': 'text',
  'application/xml': 'text',
  'text/html': 'text',
};

/**
 * MIME type mappings for supported file types
 */
const MIME_TYPES: Record<string, string> = {
  // PDF
  '.pdf': 'application/pdf',

  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',

  // Text files
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.html': 'text/html',
  '.htm': 'text/html',
};

/**
 * File type categories
 */
const FILE_TYPE_CATEGORIES: Record<string, SupportedFileType> = {
  '.pdf': 'pdf',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.png': 'image',
  '.gif': 'image',
  '.webp': 'image',
  '.bmp': 'image',
  '.tiff': 'image',
  '.tif': 'image',
  '.txt': 'text',
  '.md': 'text',
  '.csv': 'text',
  '.json': 'text',
  '.xml': 'text',
  '.html': 'text',
  '.htm': 'text',
};

/**
 * Load a file from disk and prepare it for AI processing
 */
export async function loadFile(filePath: string): Promise<FileInfo> {
  const absolutePath = path.resolve(filePath);

  // Check if file exists
  try {
    await fs.access(absolutePath);
  } catch {
    throw new Error(`File not found: ${absolutePath}`);
  }

  // Get file stats
  const stats = await fs.stat(absolutePath);

  if (!stats.isFile()) {
    throw new Error(`Path is not a file: ${absolutePath}`);
  }

  // Get file extension and determine type
  const ext = path.extname(absolutePath).toLowerCase();
  const fileName = path.basename(absolutePath);

  const mimeType = MIME_TYPES[ext];
  const fileType = FILE_TYPE_CATEGORIES[ext];

  if (!mimeType || !fileType) {
    throw new Error(
      `Unsupported file type: ${ext}. Supported types: ${Object.keys(MIME_TYPES).join(', ')}`
    );
  }

  // Read file content
  const content = await fs.readFile(absolutePath);

  // Prepare base64 for non-text files
  const base64 = fileType !== 'text' ? content.toString('base64') : undefined;

  return {
    path: absolutePath,
    name: fileName,
    type: fileType,
    mimeType,
    size: stats.size,
    content,
    base64,
  };
}

/**
 * Load a file from a Buffer
 */
export function loadFileFromBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType?: string
): FileInfo {
  const ext = path.extname(fileName).toLowerCase();
  const detectedMimeType = mimeType || MIME_TYPES[ext];
  const fileType = FILE_TYPE_CATEGORIES[ext];

  if (!detectedMimeType || !fileType) {
    throw new Error(
      `Unsupported file type: ${ext}. Supported types: ${Object.keys(MIME_TYPES).join(', ')}`
    );
  }

  const base64 = fileType !== 'text' ? buffer.toString('base64') : undefined;

  return {
    path: '',
    name: fileName,
    type: fileType,
    mimeType: detectedMimeType,
    size: buffer.length,
    content: buffer,
    base64,
  };
}

/**
 * Load a file from base64 string
 */
export function loadFileFromBase64(
  base64: string,
  fileName: string,
  mimeType?: string
): FileInfo {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const buffer = Buffer.from(base64Data, 'base64');

  const ext = path.extname(fileName).toLowerCase();
  const detectedMimeType = mimeType || MIME_TYPES[ext];
  const fileType = FILE_TYPE_CATEGORIES[ext];

  if (!detectedMimeType || !fileType) {
    throw new Error(
      `Unsupported file type: ${ext}. Supported types: ${Object.keys(MIME_TYPES).join(', ')}`
    );
  }

  return {
    path: '',
    name: fileName,
    type: fileType,
    mimeType: detectedMimeType,
    size: buffer.length,
    content: buffer,
    base64: base64Data,
  };
}

/**
 * Save content to a file
 */
export async function saveToFile(filePath: string, content: string | Buffer): Promise<void> {
  const absolutePath = path.resolve(filePath);
  const dir = path.dirname(absolutePath);

  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true });

  // Write file
  await fs.writeFile(absolutePath, content, typeof content === 'string' ? 'utf-8' : undefined);
}

/**
 * Get supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return Object.keys(MIME_TYPES);
}

/**
 * Check if a file extension is supported
 */
export function isExtensionSupported(ext: string): boolean {
  const normalizedExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  return normalizedExt in MIME_TYPES;
}

/**
 * Check if a string is a URL
 */
export function isUrl(str: string): boolean {
  return str.startsWith('http://') || str.startsWith('https://');
}

/**
 * Load a file from a URL
 */
export async function loadFileFromUrl(url: string): Promise<FileInfo> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type')?.split(';')[0] || '';
  const buffer = Buffer.from(await response.arrayBuffer());

  // Try to get filename from URL or Content-Disposition header
  const contentDisposition = response.headers.get('content-disposition');
  let fileName = '';

  if (contentDisposition) {
    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match) {
      fileName = match[1].replace(/['"]/g, '');
    }
  }

  if (!fileName) {
    // Extract filename from URL path
    const urlPath = new URL(url).pathname;
    fileName = path.basename(urlPath) || 'download';
  }

  // Determine file type from content-type header or extension
  let fileType = MIME_TO_FILE_TYPE[contentType];
  let mimeType = contentType;

  if (!fileType) {
    // Try to determine from file extension
    const ext = path.extname(fileName).toLowerCase();
    mimeType = MIME_TYPES[ext];
    fileType = FILE_TYPE_CATEGORIES[ext];
  }

  if (!fileType || !mimeType) {
    throw new Error(
      `Unsupported file type from URL. Content-Type: ${contentType}, Filename: ${fileName}`
    );
  }

  const base64 = fileType !== 'text' ? buffer.toString('base64') : undefined;

  return {
    path: url,
    name: fileName,
    type: fileType,
    mimeType,
    size: buffer.length,
    content: buffer,
    base64,
  };
}
