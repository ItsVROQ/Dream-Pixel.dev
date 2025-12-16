import { PrismaClient } from '@prisma/client';
import { getStorageManager } from '@/lib/storage';

const prisma = new PrismaClient();

export interface CleanupResult {
  deletedImages: number;
  deletedGenerations: number;
  errors: string[];
  storageFreed: number;
}

/**
 * Clean up expired images and unassociated uploads
 */
export async function cleanupExpiredImages(): Promise<CleanupResult> {
  const result: CleanupResult = {
    deletedImages: 0,
    deletedGenerations: 0,
    errors: [],
    storageFreed: 0,
  };

  try {
    // Find expired images (reference images without associated generations)
    const expiredImages = await prisma.image.findMany({
      where: {
        type: 'REFERENCE',
        status: 'PROCESSED',
        expiryDate: {
          lte: new Date(),
        },
        generations: {
          none: {}, // No generations reference this image
        },
      },
      include: {
        user: {
          select: {
            id: true,
            tier: true,
          },
        },
      },
    });

    const storageManager = getStorageManager();

    for (const image of expiredImages) {
      try {
        // Delete from storage
        const keysToDelete = [image.s3Key];
        if (image.thumbnailUrl) keysToDelete.push(image.s3Key.replace('.webp', '_thumb.webp'));
        if (image.mediumUrl) keysToDelete.push(image.s3Key.replace('.webp', '_medium.webp'));

        await storageManager.deleteImage(keysToDelete);

        // Delete from database
        await prisma.image.delete({
          where: { id: image.id },
        });

        result.deletedImages++;
        result.storageFreed += image.originalSize;
      } catch (error) {
        const errorMessage = `Failed to delete image ${image.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMessage);
      }
    }

    // Compress old generations for free tier users
    await compressOldGenerations();

    return result;
  } catch (error) {
    result.errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

/**
 * Compress images older than 30 days for free tier users
 */
export async function compressOldGenerations(): Promise<void> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const oldGenerations = await prisma.generation.findMany({
    where: {
      createdAt: {
        lte: thirtyDaysAgo,
      },
      user: {
        tier: 'FREE',
      },
      status: 'SUCCEEDED',
    },
    include: {
      resultImage: true,
    },
  });

  for (const generation of oldGenerations) {
    if (!generation.resultImage) continue;

    try {
      // Re-process with lower quality
      // This would require downloading and re-processing the image
      // For now, we'll just log this
      console.log(`Would compress generation ${generation.id} for user ${generation.userId}`);
    } catch (error) {
      console.error(`Failed to compress generation ${generation.id}:`, error);
    }
  }
}

/**
 * Archive images for enterprise users
 */
export async function archiveEnterpriseImages(): Promise<void> {
  const enterpriseImages = await prisma.image.findMany({
    where: {
      user: {
        tier: 'ENTERPRISE',
      },
      createdAt: {
        lte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year old
      },
    },
    take: 100, // Process in batches
  });

  for (const image of enterpriseImages) {
    try {
      // Move to archive storage
      // Implementation would depend on your storage strategy
      console.log(`Archiving enterprise image ${image.id} for user ${image.userId}`);
    } catch (error) {
      console.error(`Failed to archive image ${image.id}:`, error);
    }
  }
}

/**
 * Get image usage statistics
 */
export async function getImageStats(): Promise<{
  totalImages: number;
  totalSize: number;
  byType: Record<string, number>;
  byUserTier: Record<string, number>;
  expiringSoon: number;
}> {
  const totalImages = await prisma.image.count();
  
  const images = await prisma.image.findMany({
    select: {
      type: true,
      user: {
        select: {
          tier: true,
        },
      },
      originalSize: true,
      expiryDate: true,
    },
  });

  const stats = {
    totalImages,
    totalSize: images.reduce((sum, img) => sum + img.originalSize, 0),
    byType: {} as Record<string, number>,
    byUserTier: {} as Record<string, number>,
    expiringSoon: 0,
  };

  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  images.forEach((img) => {
    // Count by type
    stats.byType[img.type] = (stats.byType[img.type] || 0) + 1;
    
    // Count by user tier
    stats.byUserTier[img.user.tier] = (stats.byUserTier[img.user.tier] || 0) + 1;
    
    // Count expiring soon
    if (img.expiryDate && img.expiryDate <= twentyFourHoursFromNow) {
      stats.expiringSoon++;
    }
  });

  return stats;
}

/**
 * Initialize lifecycle policies on storage
 */
export async function setupLifecyclePolicies(): Promise<void> {
  const storageManager = getStorageManager();
  
  const rules = [
    {
      id: 'delete-unreferenced-uploads',
      status: 'Enabled' as const,
      filter: {
        prefix: 'users/',
      },
      expiration: {
        days: 1,
      },
      abortIncompleteMultipartUpload: {
        daysAfterInitiation: 1,
      },
    },
    {
      id: 'compress-free-tier-old-images',
      status: 'Enabled' as const,
      filter: {
        tags: {
          userTier: 'FREE',
          compressionStatus: 'ORIGINAL',
        },
      },
      expiration: {
        days: 30,
      },
      abortIncompleteMultipartUpload: {
        daysAfterInitiation: 1,
      },
    },
    {
      id: 'archive-enterprise-images',
      status: 'Enabled' as const,
      filter: {
        tags: {
          userTier: 'ENTERPRISE',
        },
      },
      expiration: {
        days: 365,
      },
      abortIncompleteMultipartUpload: {
        daysAfterInitiation: 1,
      },
    },
  ];

  await storageManager.setLifecyclePolicy(rules);
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupExpiredImages()
    .then((result) => {
      console.log('Cleanup completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cleanup failed:', error);
      process.exit(1);
    });
}