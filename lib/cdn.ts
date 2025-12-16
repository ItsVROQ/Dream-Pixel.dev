import sharp from 'sharp';
import crypto from 'crypto';

export interface CDNTransformation {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: 'top' | 'right' | 'bottom' | 'left' | 'center' | 'entropy' | 'attention';
  progressive?: boolean;
}

export interface CacheConfig {
  defaultTTL: number;
  browserTTL: number;
  staleWhileRevalidate: number;
}

export class CDNManager {
  private cache: Map<string, { data: Buffer; metadata: Record<string, unknown>; timestamp: number }>;
  private cacheConfig: CacheConfig;

  constructor() {
    this.cache = new Map();
    this.cacheConfig = {
      defaultTTL: parseInt(process.env.CACHE_TTL_GENERATION || '31536000'), // 1 year
      browserTTL: parseInt(process.env.CACHE_TTL_REFERENCE || '86400'),     // 1 day
      staleWhileRevalidate: 3600, // 1 hour
    };
  }

  /**
   * Generate CDN-optimized URL with transformations
   */
  generateOptimizedUrl(
    originalUrl: string,
    transformations: CDNTransformation = {}
  ): string {
    const cdnBaseUrl = process.env.CDN_BASE_URL;
    
    if (!cdnBaseUrl) {
      return originalUrl; // Return original if no CDN configured
    }

    const params = new URLSearchParams();
    
    // Add transformation parameters
    if (transformations.width) {
      params.set('w', transformations.width.toString());
    }
    if (transformations.height) {
      params.set('h', transformations.height.toString());
    }
    if (transformations.quality) {
      params.set('q', transformations.quality.toString());
    }
    if (transformations.format) {
      params.set('f', transformations.format);
    }
    if (transformations.fit) {
      params.set('fit', transformations.fit);
    }
    if (transformations.position) {
      params.set('pos', transformations.position);
    }
    if (transformations.progressive) {
      params.set('prog', 'true');
    }

    const queryString = params.toString();
    const separator = queryString ? '?' : '';
    
    return `${cdnBaseUrl.replace(/\/$/, '')}/${originalUrl}${separator}${queryString}`;
  }

  /**
   * Transform image on-the-fly
   */
  async transformImage(
    sourceBuffer: Buffer,
    transformations: CDNTransformation
  ): Promise<Buffer> {
    let pipeline = sharp(sourceBuffer);

    // Apply size transformations
    if (transformations.width || transformations.height) {
      const { width, height, fit = 'inside', position = 'center' } = transformations;
      
      pipeline = pipeline.resize(width, height, {
        fit,
        position,
        withoutEnlargement: true,
      });
    }

    // Apply format transformations
    if (transformations.format) {
      switch (transformations.format) {
        case 'webp':
          pipeline = pipeline.webp({
            quality: transformations.quality || 90,
            effort: 4,
          });
          break;
        case 'jpeg':
          pipeline = pipeline.jpeg({
            quality: transformations.quality || 90,
            progressive: transformations.progressive || false,
            chromaSubsampling: '4:2:0',
          });
          break;
        case 'png':
          pipeline = pipeline.png({
            quality: transformations.quality || 90,
            compressionLevel: 6,
          });
          break;
      }
    }

    return await pipeline.toBuffer();
  }

  /**
   * Check if browser supports WebP
   */
  detectWebPSupport(acceptHeader?: string): boolean {
    if (!acceptHeader) {
      return false; // Default to conservative approach
    }
    
    return acceptHeader.includes('image/webp') || 
           acceptHeader.includes('image/avif'); // Also check for AVIF support
  }

  /**
   * Get optimal image format based on browser support
   */
  getOptimalFormat(acceptHeader?: string): 'webp' | 'jpeg' | 'png' {
    if (this.detectWebPSupport(acceptHeader)) {
      return 'webp';
    }
    
    // Check for PNG support for transparent images
    if (acceptHeader?.includes('image/png')) {
      return 'png';
    }
    
    return 'jpeg'; // Default fallback
  }

  /**
   * Generate responsive image srcset
   */
  generateSrcSet(originalUrl: string, sizes: number[] = [320, 640, 1024, 2048]): string {
    const cdnBaseUrl = process.env.CDN_BASE_URL;
    
    if (!cdnBaseUrl) {
      // Fallback to original URL for all sizes
      return sizes.map(size => `${originalUrl} ${size}w`).join(', ');
    }

    return sizes
      .map(size => {
        const optimizedUrl = this.generateOptimizedUrl(originalUrl, {
          width: size,
          quality: 85,
          format: this.getOptimalFormat(),
        });
        return `${optimizedUrl} ${size}w`;
      })
      .join(', ');
  }

  /**
   * Generate Low Quality Image Placeholder (LQIP)
   */
  async generateLQIP(imageBuffer: Buffer): Promise<string> {
    try {
      const lqipBuffer = await sharp(imageBuffer)
        .resize(50, 50, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({
          quality: 20,
          progressive: true,
          chromaSubsampling: '4:2:0',
        })
        .toBuffer();

      return `data:image/jpeg;base64,${lqipBuffer.toString('base64')}`;
    } catch (error) {
      console.error('LQIP generation failed:', error);
      return '';
    }
  }

  /**
   * Set cache headers for optimal CDN caching
   */
  getCacheHeaders(
    imageType: 'GENERATION' | 'REFERENCE',
    transformations?: CDNTransformation
  ): Record<string, string> {
    const isGeneration = imageType === 'GENERATION';
    const defaultTTL = isGeneration ? this.cacheConfig.defaultTTL : this.cacheConfig.browserTTL;
    
    return {
      'Cache-Control': `public, max-age=${defaultTTL}, stale-while-revalidate=${this.cacheConfig.staleWhileRevalidate}`,
      'Vary': 'Accept, User-Agent',
      'ETag': this.generateETag(transformations || {}),
      'X-Content-Type-Options': 'nosniff',
    };
  }

  /**
   * Generate ETag for cache validation
   */
  private generateETag(data: Record<string, unknown>): string {
    const content = JSON.stringify(data);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Cache image transformation results
   */
  private getCacheKey(buffer: Buffer, transformations: CDNTransformation): string {
    const transformationHash = crypto.createHash('md5')
      .update(JSON.stringify(transformations))
      .digest('hex');
    
    const bufferHash = crypto.createHash('md5').update(buffer).digest('hex');
    
    return `${transformationHash}-${bufferHash}`;
  }

  /**
   * Store image in cache
   */
  private setCache(key: string, data: Buffer, metadata: Record<string, unknown>): void {
    this.cache.set(key, {
      data,
      metadata,
      timestamp: Date.now(),
    });
  }

  /**
   * Retrieve image from cache
   */
  private getCache(key: string): { data: Buffer; metadata: Record<string, unknown>; timestamp: number } | null {
    const cached = this.cache.get(key);
    
    if (!cached) {
      return null;
    }
    
    // Check if cache has expired
    const now = Date.now();
    const ttl = this.cacheConfig.defaultTTL * 1000; // Convert to milliseconds
    
    if (now - cached.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached;
  }

  /**
   * Preload frequently requested images
   */
  async preloadImages(imageUrls: string[]): Promise<void> {
    const preloadPromises = imageUrls.map(async (url) => {
      try {
        // This would fetch and cache popular images
        console.log(`Preloading image: ${url}`);
        // Implementation would depend on your image fetching mechanism
      } catch (error) {
        console.error(`Failed to preload image ${url}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Generate analytics for CDN performance
   */
  getCDNMetrics(): {
    cacheHits: number;
    cacheMisses: number;
    transformations: number;
    cacheSize: number;
  } {
    // This would typically integrate with your CDN provider's analytics
    return {
      cacheHits: 0,
      cacheMisses: 0,
      transformations: 0,
      cacheSize: this.cache.size,
    };
  }
}

// Create singleton instance
let cdnManager: CDNManager | null = null;

export function getCDNManager(): CDNManager {
  if (!cdnManager) {
    cdnManager = new CDNManager();
  }
  
  return cdnManager;
}