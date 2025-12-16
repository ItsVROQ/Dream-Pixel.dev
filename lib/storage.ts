import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface StorageConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string;
  cdnBaseUrl?: string;
}

export interface UploadResult {
  key: string;
  url: string;
  thumbnailUrl?: string;
  mediumUrl?: string;
  cdnUrl?: string;
  signedUrl?: string;
  bucket: string;
}

export interface LifecycleRule {
  id: string;
  status: 'Enabled' | 'Disabled';
  filter?: {
    prefix?: string;
    tags?: Record<string, string>;
  };
  expiration: {
    days: number;
  };
  abortIncompleteMultipartUpload: {
    daysAfterInitiation: number;
  };
}

export class S3StorageManager {
  private s3Client: S3Client;
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
    
    const clientConfig: Record<string, unknown> = {
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    };

    // Add custom endpoint for R2 or other S3-compatible services
    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
    }

    this.s3Client = new S3Client(clientConfig);
  }

  /**
   * Generate unique filename
   */
  private generateFileName(userId: string, extension: string = '.webp'): string {
    const timestamp = Date.now();
    const uuid = uuidv4().replace(/-/g, '');
    return `${userId}/${timestamp}-${uuid}${extension}`;
  }

  /**
   * Upload processed images to S3/R2
   */
  async uploadImages(
    images: {
      main: Buffer;
      thumbnail?: Buffer;
      medium?: Buffer;
    },
    userId: string,
    originalName: string,
    imageType: 'REFERENCE' | 'GENERATION' = 'REFERENCE'
  ): Promise<UploadResult> {
    const fileName = this.generateFileName(userId);
    const baseKey = fileName.replace('.webp', '');
    
    // Main image key
    const mainKey = `${baseKey}.webp`;
    const thumbnailKey = `${baseKey}_thumb.webp`;
    const mediumKey = `${baseKey}_medium.webp`;

    const uploadPromises = [];

    // Upload main image
    uploadPromises.push(
      this.uploadBuffer(
        mainKey,
        images.main,
        'image/webp',
        this.getContentType(imageType)
      )
    );

    // Upload thumbnail if provided
    if (images.thumbnail) {
      uploadPromises.push(
        this.uploadBuffer(
          thumbnailKey,
          images.thumbnail,
          'image/webp',
          this.getContentType(imageType)
        )
      );
    }

    // Upload medium if provided
    if (images.medium) {
      uploadPromises.push(
        this.uploadBuffer(
          mediumKey,
          images.medium,
          'image/webp',
          this.getContentType(imageType)
        )
      );
    }

    const results = await Promise.all(uploadPromises);

    // Extract successful uploads
    const mainResult = results.find(r => r.key === mainKey);
    const thumbnailResult = results.find(r => r.key === thumbnailKey);
    const mediumResult = results.find(r => r.key === mediumKey);

    if (!mainResult) {
      throw new Error('Failed to upload main image');
    }

    return {
      key: mainResult.key,
      url: mainResult.url,
      thumbnailUrl: thumbnailResult?.url,
      mediumUrl: mediumResult?.url,
      cdnUrl: this.getCdnUrl(mainResult.key),
      bucket: this.config.bucket
    };
  }

  /**
   * Upload a single buffer to S3
   */
  private async uploadBuffer(
    key: string,
    buffer: Buffer,
    contentType: string,
    cacheControl: string
  ): Promise<{ key: string; url: string }> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: cacheControl,
      Metadata: {
        uploadedAt: new Date().toISOString(),
        checksum: crypto.createHash('md5').update(buffer).digest('hex'),
      },
    });

    await this.s3Client.send(command);

    return {
      key,
      url: this.getPublicUrl(key)
    };
  }

  /**
   * Get public URL for a key
   */
  private getPublicUrl(key: string): string {
    if (this.config.endpoint) {
      // For R2 or custom S3-compatible services
      return `${this.config.endpoint}/${this.config.bucket}/${key}`;
    }
    
    // Standard S3 URL format
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  /**
   * Get CDN URL for a key
   */
  private getCdnUrl(key: string): string | undefined {
    if (!this.config.cdnBaseUrl) return undefined;
    
    return `${this.config.cdnBaseUrl.replace(/\/$/, '')}/${key}`;
  }

  /**
   * Generate signed URL for private access
   */
  async getSignedUrl(key: string, expiresIn: number = 86400): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Delete objects from storage
   */
  async deleteImage(keys: string[]): Promise<void> {
    const deletePromises = keys.map(async (key) => {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });
      
      return this.s3Client.send(command);
    });

    await Promise.all(deletePromises);
  }

  /**
   * Set lifecycle policy for auto-cleanup
   */
  async setLifecyclePolicy(rules: LifecycleRule[]): Promise<void> {
    // This would typically be done via AWS CLI or SDK
    // For now, we'll log the rules that should be set
    console.log('Lifecycle rules to be configured:', rules);
  }

  /**
   * Get content type based on image type
   */
  private getContentType(imageType: 'REFERENCE' | 'GENERATION'): string {
    switch (imageType) {
      case 'REFERENCE':
        return 'public, max-age=86400'; // 1 day for reference images
      case 'GENERATION':
        return 'public, max-age=31536000'; // 1 year for generated images
      default:
        return 'public, max-age=86400';
    }
  }

  /**
   * Check storage quota and usage
   */
  async getStorageUsage(): Promise<{
    totalObjects: number;
    totalSize: number;
    quota?: number;
  }> {
    // This would typically query S3 or maintain usage stats
    // For now, return mock data
    return {
      totalObjects: 0,
      totalSize: 0,
      quota: undefined
    };
  }

  /**
   * Clean up expired objects
   */
  async cleanupExpiredObjects(): Promise<{ deletedCount: number; errors: string[] }> {
    // This would query S3 for objects with expiry dates and delete them
    // For now, return mock data
    return {
      deletedCount: 0,
      errors: []
    };
  }
}

// Create singleton instance
let storageManager: S3StorageManager | null = null;

export function getStorageManager(): S3StorageManager {
  if (!storageManager) {
    const config: StorageConfig = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET_NAME || 'dream-pixel-images',
      endpoint: process.env.S3_ENDPOINT || undefined,
      cdnBaseUrl: process.env.CDN_BASE_URL || undefined,
    };

    storageManager = new S3StorageManager(config);
  }

  return storageManager;
}