import { NextRequest, NextResponse } from 'next/server';
import { getCDNManager } from '@/lib/cdn';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const width = searchParams.get('w') ? parseInt(searchParams.get('w')!) : undefined;
    const height = searchParams.get('h') ? parseInt(searchParams.get('h')!) : undefined;
    const quality = searchParams.get('q') ? parseInt(searchParams.get('q')!) : undefined;
    const format = searchParams.get('f') as 'webp' | 'jpeg' | 'png' | null;
    const fit = searchParams.get('fit') as 'cover' | 'contain' | 'fill' | 'inside' | 'outside' | null;
    const position = searchParams.get('pos') as 'top' | 'right' | 'bottom' | 'left' | 'center' | 'entropy' | 'attention' | null;
    const progressive = searchParams.get('prog') === 'true';

    // Reconstruct the original URL from the path params
    const originalPath = params.path.join('/');
    const decodedPath = decodeURIComponent(originalPath);
    
    // Try to get the image from storage or external URL
    const cdnManager = getCDNManager();
    
    let imageBuffer: Buffer;

    // Check if this is a storage key or external URL
    if (decodedPath.startsWith('http')) {
      // External URL - fetch and cache
      try {
        const response = await fetch(decodedPath);
        if (!response.ok) {
          return NextResponse.json(
            { error: 'Failed to fetch external image' },
            { status: 404 }
          );
        }
        
        imageBuffer = Buffer.from(await response.arrayBuffer());
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to fetch external image' },
          { status: 404 }
        );
      }
    } else {
      // Storage key - get from S3/R2
      try {
        // This would use the storage manager to get the object
        // For now, we'll simulate this
        console.log(`Fetching image from storage: ${decodedPath}`);
        // In a real implementation, you would call storageManager.getObject(decodedPath)
        
        return NextResponse.json(
          { error: 'Storage integration not yet implemented in proxy' },
          { status: 501 }
        );
      } catch (error) {
        return NextResponse.json(
          { error: 'Image not found in storage' },
          { status: 404 }
        );
      }
    }

    // Apply transformations
    const transformations = {
      width,
      height,
      quality: quality || 85,
      format: format || cdnManager.getOptimalFormat(request.headers.get('accept') || undefined),
      fit: fit || undefined,
      position: position || undefined,
      progressive,
    };

    // Transform the image
    const transformedBuffer = await cdnManager.transformImage(imageBuffer, transformations);

    // Set appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', `image/${transformations.format}`);
    headers.set('Cache-Control', 'public, max-age=31536000, stale-while-revalidate=86400');
    headers.set('Vary', 'Accept, User-Agent');
    headers.set('X-Content-Type-Options', 'nosniff');
    
    // Add optimization headers
    if (transformations.format === 'webp') {
      headers.set('Vary', 'Accept, User-Agent');
    }

    return new NextResponse(transformedBuffer, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Image proxy error:', error);
    
    return NextResponse.json(
      { 
        error: 'Image transformation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Add CORS headers for external requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  });
}

// Handle other HTTP methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET for image proxy.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET for image proxy.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET for image proxy.' },
    { status: 405 }
  );
}