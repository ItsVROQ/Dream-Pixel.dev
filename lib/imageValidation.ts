import sharp from 'sharp';

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  metadata?: {
    format: string;
    width: number;
    height: number;
    size: number;
    orientation?: string;
  };
}

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp'
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export async function validateImageFile(file: File | Buffer): Promise<ImageValidationResult> {
  try {
    const maxSize = parseInt(process.env.MAX_IMAGE_SIZE || '20971520'); // 20MB
    const maxDimension = parseInt(process.env.MAX_IMAGE_DIMENSION || '4096');

    let buffer: Buffer;
    
    if (file instanceof File) {
      // Check file size
      if (file.size > maxSize) {
        return {
          isValid: false,
          error: `File size ${file.size} bytes exceeds maximum of ${maxSize} bytes`
        };
      }

      // Check file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return {
          isValid: false,
          error: `File type ${file.type} not allowed. Allowed types: ${ALLOWED_TYPES.join(', ')}`
        };
      }

      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      buffer = file;
      
      // Check buffer size
      if (buffer.length > maxSize) {
        return {
          isValid: false,
          error: `File size ${buffer.length} bytes exceeds maximum of ${maxSize} bytes`
        };
      }
    }

    // Get image metadata using sharp
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      return {
        isValid: false,
        error: 'Invalid image: unable to read dimensions'
      };
    }

    // Check dimensions
    if (metadata.width > maxDimension || metadata.height > maxDimension) {
      return {
        isValid: false,
        error: `Image dimensions ${metadata.width}x${metadata.height} exceed maximum of ${maxDimension}x${maxDimension}`
      };
    }

    // Check if format is supported
    if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) {
      return {
        isValid: false,
        error: `Image format ${metadata.format} not supported. Supported formats: JPEG, PNG, WebP`
      };
    }

    return {
      isValid: true,
      metadata: {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: buffer.length,
        orientation: metadata.orientation
      }
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Image validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export function isValidImageExtension(filename: string): boolean {
  const extension = filename.toLowerCase().split('.').pop();
  return extension ? ALLOWED_EXTENSIONS.includes(`.${extension}`) : false;
}

export function getImageMimeType(extension: string): string {
  const ext = extension.toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', 
    '.png': 'image/png',
    '.webp': 'image/webp'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}