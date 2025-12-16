import { NextRequest, NextResponse } from 'next/server';
import { getStorageManager } from '@/lib/storage';
import { ImageProcessor } from '@/lib/imageProcessor';
import { getCDNManager } from '@/lib/cdn';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SaveGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  seed?: number;
  settings: Record<string, unknown>;
  referenceImageId?: string;
  resultImage?: Buffer;
  userId?: string;
  userTier?: 'FREE' | 'PRO' | 'ENTERPRISE';
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveGenerationRequest = await request.json();
    const { prompt, negativePrompt, seed, settings, referenceImageId, resultImage, userId = 'demo-user' } = body;

    if (!prompt || !resultImage) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt and resultImage' },
        { status: 400 }
      );
    }

    // Start processing timer
    const startTime = Date.now();

    // Get user from database to check credits
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check credits for free tier users
    if (user.tier === 'FREE' && user.creditsRemaining <= 0) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 402 }
      );
    }

    // Process the result image
    const processedImage = await ImageProcessor.processImage(
      Buffer.from(resultImage),
      {
        maxWidth: 2048,
        thumbnailSize: 512,
        mediumSize: 1024,
        quality: 90,
        thumbnailQuality: 80,
        stripMetadata: true,
        generateProgressive: true,
      }
    );

    // Upload to storage
    const storageManager = getStorageManager();
    const uploadResult = await storageManager.uploadImages(
      {
        main: processedImage.main,
        thumbnail: processedImage.thumbnail,
        medium: processedImage.medium,
      },
      userId,
      `generation-${Date.now()}.webp`,
      'GENERATION'
    );

    // Generate CDN URLs
    const cdnManager = getCDNManager();
    const cdnUrl = cdnManager.generateOptimizedUrl(uploadResult.key, {
      width: 800,
      quality: 85,
      format: cdnManager.getOptimalFormat(request.headers.get('accept') || undefined),
    });

    // Create generation record in database
    const generation = await prisma.generation.create({
      data: {
        userId,
        prompt,
        negativePrompt,
        seed,
        settings,
        status: 'SUCCEEDED',
        processingTimeMs: Date.now() - startTime,
        referenceImageId: referenceImageId || null,
      },
    });

    // Create image record for the result
    const imageRecord = await prisma.image.create({
      data: {
        userId,
        type: 'GENERATION',
        status: 'PROCESSED',
        originalName: `generation-${generation.id}.webp`,
        originalSize: processedImage.metadata.originalSize,
        originalWidth: processedImage.metadata.originalWidth,
        originalHeight: processedImage.metadata.originalHeight,
        s3Key: uploadResult.key,
        s3Bucket: uploadResult.bucket,
        url: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl,
        mediumUrl: uploadResult.mediumUrl,
        hash: processedImage.metadata.perceptualHash,
        metadata: {
          generationId: generation.id,
          processingTime: Date.now() - startTime,
          compressionRatio: processedImage.metadata.compressionRatio,
          finalWidth: processedImage.metadata.finalWidth,
          finalHeight: processedImage.metadata.finalHeight,
          originalFormat: processedImage.metadata.originalFormat,
        },
        expiryDate: null, // Generated images don't expire
      },
    });

    // Link generation to result image
    await prisma.generation.update({
      where: { id: generation.id },
      data: { resultImageId: imageRecord.id },
    });

    // Update user credits for free tier users
    if (user.tier === 'FREE' && user.creditsRemaining > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          creditsRemaining: user.creditsRemaining - 1,
        },
      });
    }

    // Generate LQIP
    const lqip = await cdnManager.generateLQIP(processedImage.main);

    // Generate responsive srcset
    const srcSet = cdnManager.generateSrcSet(uploadResult.key);

    return NextResponse.json({
      success: true,
      generation: {
        id: generation.id,
        prompt,
        negativePrompt,
        seed,
        status: 'SUCCEEDED',
        processingTimeMs: Date.now() - startTime,
        resultImage: {
          id: imageRecord.id,
          url: cdnUrl || uploadResult.url,
          originalUrl: uploadResult.url,
          thumbnailUrl: uploadResult.thumbnailUrl,
          mediumUrl: uploadResult.mediumUrl,
          original: {
            width: processedImage.metadata.originalWidth,
            height: processedImage.metadata.originalHeight,
            size: processedImage.metadata.originalSize,
          },
          processed: {
            width: processedImage.metadata.finalWidth,
            height: processedImage.metadata.finalHeight,
            size: processedImage.metadata.finalSize,
            compressionRatio: processedImage.metadata.compressionRatio,
          },
          lqip,
          srcSet,
        },
      },
      creditsRemaining: user.tier === 'FREE' ? user.creditsRemaining - 1 : undefined,
    });

  } catch (error) {
    console.error('Save generation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to save generation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    error: 'Method not allowed. Use POST to save generations.',
  }, { status: 405 });
}