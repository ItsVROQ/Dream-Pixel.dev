import sharp from 'sharp';
import crypto from 'crypto';

export interface ProcessedImage {
  main: Buffer;
  thumbnail: Buffer;
  medium?: Buffer;
  metadata: {
    originalFormat: string;
    originalWidth: number;
    originalHeight: number;
    originalSize: number;
    finalWidth: number;
    finalHeight: number;
    finalSize: number;
    compressionRatio: number;
    perceptualHash: string;
  };
}

export interface ProcessingOptions {
  maxWidth?: number;
  thumbnailSize?: number;
  mediumSize?: number;
  quality?: number;
  thumbnailQuality?: number;
  stripMetadata?: boolean;
  generateProgressive?: boolean;
}

export class ImageProcessor {
  private static readonly MAX_WIDTH = parseInt(process.env.MAX_IMAGE_DIMENSION || '2048');
  private static readonly QUALITY = parseInt(process.env.IMAGE_QUALITY || '90');
  private static readonly THUMBNAIL_QUALITY = parseInt(process.env.THUMBNAIL_QUALITY || '80');
  private static readonly HASH_SIZE = parseInt(process.env.PERCEPTUAL_HASH_SIZE || '16');

  /**
   * Process an image with all transformations
   */
  static async processImage(
    buffer: Buffer,
    options: ProcessingOptions = {}
  ): Promise<ProcessedImage> {
    const {
      maxWidth = 2048,
      thumbnailSize = 512,
      mediumSize = 1024,
      quality = this.QUALITY,
      thumbnailQuality = this.THUMBNAIL_QUALITY,
      stripMetadata = true,
      generateProgressive = false
    } = options;

    const originalMetadata = await sharp(buffer).metadata();
    
    if (!originalMetadata.width || !originalMetadata.height) {
      throw new Error('Invalid image: missing dimensions');
    }

    // Calculate dimensions maintaining aspect ratio
    const scalingFactor = Math.min(1, maxWidth / originalMetadata.width);
    const finalWidth = Math.floor(originalMetadata.width * scalingFactor);
    const finalHeight = Math.floor(originalMetadata.height * scalingFactor);

    // Process main image
    let mainPipeline = sharp(buffer)
      .resize(finalWidth, null, { 
        withoutEnlargement: true,
        fit: 'inside'
      });

    // Strip metadata if requested
    if (stripMetadata) {
      mainPipeline = mainPipeline.withMetadata({ orientation: 1 });
    }

    // Convert to WebP with high quality
    const mainImage = await mainPipeline
      .webp({ 
        quality,
        effort: 4,
        alphaQuality: 80
      })
      .toBuffer();

    // Generate thumbnail
    const thumbnail = await sharp(buffer)
      .resize(thumbnailSize, null, { 
        withoutEnlargement: true,
        fit: 'inside'
      })
      .webp({ 
        quality: thumbnailQuality,
        effort: 3,
        alphaQuality: 60
      })
      .toBuffer();

    // Generate medium size if original is large enough
    let medium: Buffer | undefined;
    if (originalMetadata.width > mediumSize) {
      medium = await sharp(buffer)
        .resize(mediumSize, null, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .webp({ 
          quality,
          effort: 4,
          alphaQuality: 80
        })
        .toBuffer();
    }

    // Generate progressive version for large images
    if (generateProgressive && originalMetadata.width > 2048) {
      // This would create progressive JPEG version
      // For now, we'll just use the WebP version
      await this.generateProgressiveImage(mainImage);
    }

    // Calculate perceptual hash for duplicate detection
    const perceptualHash = await this.calculatePerceptualHash(buffer);

    // Calculate compression metrics
    const compressionRatio = (buffer.length - mainImage.length) / buffer.length;

    return {
      main: mainImage,
      thumbnail,
      medium,
      metadata: {
        originalFormat: originalMetadata.format || 'unknown',
        originalWidth: originalMetadata.width,
        originalHeight: originalMetadata.height,
        originalSize: buffer.length,
        finalWidth,
        finalHeight,
        finalSize: mainImage.length,
        compressionRatio: Math.round(compressionRatio * 100),
        perceptualHash
      }
    };
  }

  /**
   * Calculate perceptual hash for duplicate detection
   */
  private static async calculatePerceptualHash(buffer: Buffer): Promise<string> {
    try {
      // Resize to 32x32 for hash calculation
      const hashImage = await sharp(buffer)
        .resize(32, 32, { 
          fit: 'fill',
          position: 'center'
        })
        .greyscale()
        .raw()
        .toBuffer();

      // Calculate average luminance
      const pixels = Array.from(hashImage);
      const avgLuminance = pixels.reduce((sum, pixel) => sum + pixel, 0) / pixels.length;

      // Create hash based on pixel comparison
      let hash = '';
      for (let i = 0; i < pixels.length; i++) {
        hash += pixels[i] > avgLuminance ? '1' : '0';
      }

      // Convert to hex string
      const hashInt = parseInt(hash.substring(0, 16), 2);
      return hashInt.toString(16).padStart(16, '0');
    } catch (error) {
      // Fallback to simple hash if perceptual hash fails
      return crypto.createHash('md5').update(buffer).digest('hex');
    }
  }

  /**
   * Check if two images are duplicates based on perceptual hash
   */
  static async areImagesDuplicates(hash1: string, hash2: string, threshold: number = 10): Promise<boolean> {
    // Convert hex to binary and calculate Hamming distance
    const binary1 = parseInt(hash1, 16).toString(2).padStart(64, '0');
    const binary2 = parseInt(hash2, 16).toString(2).padStart(64, '0');
    
    let hammingDistance = 0;
    for (let i = 0; i < Math.min(binary1.length, binary2.length); i++) {
      if (binary1[i] !== binary2[i]) {
        hammingDistance++;
      }
    }
    
    // Normalize by length
    const normalizedDistance = (hammingDistance / Math.min(binary1.length, binary2.length)) * 100;
    
    return normalizedDistance <= threshold;
  }

  /**
   * Generate Low Quality Image Placeholder (LQIP)
   */
  static async generateLQIP(buffer: Buffer, width: number = 50): Promise<string> {
    try {
      const lqipBuffer = await sharp(buffer)
        .resize(width, null, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ 
          quality: 20,
          progressive: true,
          chromaSubsampling: '4:2:0'
        })
        .toBuffer();

      return `data:image/jpeg;base64,${lqipBuffer.toString('base64')}`;
    } catch (error) {
      console.error('LQIP generation failed:', error);
      return '';
    }
  }

  /**
   * Optimize image for progressive loading
   */
  static async generateProgressiveImage(buffer: Buffer): Promise<Buffer> {
    try {
      // Create multiple quality versions
      const mediumQuality = await sharp(buffer)
        .resize(1024, null, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ 
          quality: 70,
          progressive: true,
          chromaSubsampling: '4:2:0'
        })
        .toBuffer();

      // Combine into progressive format (simplified approach)
      return mediumQuality; // In production, you'd use a more sophisticated progressive JPEG library
    } catch (error) {
      console.error('Progressive image generation failed:', error);
      return buffer;
    }
  }
}