import { NextRequest, NextResponse } from 'next/server';
import { getStorageManager } from '@/lib/storage';
import { ImageProcessor } from '@/lib/imageProcessor';
import { validateImageFile } from '@/lib/imageValidation';
import { getCDNManager } from '@/lib/cdn';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // TODO: Implement proper authentication
    // For now, we'll use a demo user ID
    const userId = 'demo-user';
    
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate the image
    const validationResult = await validateImageFile(file);
    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    // Start processing timer
    const startTime = Date.now();

    // Process the image
    const processedImage = await ImageProcessor.processImage(
      Buffer.from(await file.arrayBuffer()),
      {
        maxWidth: 2048,
        thumbnailSize: 512,
        mediumSize: 1024,
        quality: 90,
        thumbnailQuality: 80,
        stripMetadata: true,
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
      file.name,
      'REFERENCE'
    );

    // Generate CDN URLs
    const cdnManager = getCDNManager();
    const cdnUrl = cdnManager.generateOptimizedUrl(uploadResult.key, {
      width: 800,
      quality: 85,
      format: cdnManager.getOptimalFormat(request.headers.get('accept') || undefined),
    });

    // Store image record in database
    const imageRecord = await prisma.image.create({
      data: {
        userId,
        type: 'REFERENCE',
        status: 'PROCESSED',
        originalName: file.name,
        originalSize: validationResult.metadata!.size,
        originalWidth: validationResult.metadata!.width,
        originalHeight: validationResult.metadata!.height,
        s3Key: uploadResult.key,
        s3Bucket: uploadResult.bucket,
        url: uploadResult.url,
        thumbnailUrl: uploadResult.thumbnailUrl,
        mediumUrl: uploadResult.mediumUrl,
        hash: processedImage.metadata.perceptualHash,
        metadata: {
          processingTime: Date.now() - startTime,
          compressionRatio: processedImage.metadata.compressionRatio,
          finalWidth: processedImage.metadata.finalWidth,
          finalHeight: processedImage.metadata.finalHeight,
          originalFormat: processedImage.metadata.originalFormat,
        },
        expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      },
    });

    // Generate signed URL
    const signedUrl = await storageManager.getSignedUrl(uploadResult.key);

    return NextResponse.json({
      success: true,
      image: {
        id: imageRecord.id,
        url: cdnUrl || uploadResult.url,
        originalUrl: uploadResult.url,
        signedUrl,
        thumbnailUrl: uploadResult.thumbnailUrl,
        mediumUrl: uploadResult.mediumUrl,
        original: {
          width: validationResult.metadata.width,
          height: validationResult.metadata.height,
          size: validationResult.metadata.size,
          format: validationResult.metadata.format,
        },
        processed: {
          width: processedImage.metadata.finalWidth,
          height: processedImage.metadata.finalHeight,
          size: processedImage.metadata.finalSize,
          compressionRatio: processedImage.metadata.compressionRatio,
        },
        processingTime: Date.now() - startTime,
      },
    });

  } catch (error) {
    console.error('Image upload error:', error);
    
    return NextResponse.json(
      { 
        error: 'Image processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    error: 'Method not allowed. Use POST to upload images.',
  }, { status: 405 });
}