import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredImages, setupLifecyclePolicies, getImageStats } from '@/lib/cleanup';
import { CreditManager } from '@/lib/creditManager';

export async function POST(request: NextRequest) {
  try {
    // TODO: Add proper authentication and admin authorization
    const body = await request.json();
    const { action, ...params } = body as { action: string; [key: string]: unknown };

    let result: unknown;

    switch (action) {
      case 'cleanup':
        result = await cleanupExpiredImages();
        break;
        
      case 'setup-lifecycle':
        await setupLifecyclePolicies();
        result = { message: 'Lifecycle policies configured successfully' };
        break;
        
      case 'stats':
        result = await getImageStats();
        break;
        
      case 'credit-stats':
        result = await CreditManager.getCreditStats();
        break;
        
      case 'reset-credits':
        const { userId } = params;
        if (!userId) {
          return NextResponse.json(
            { error: 'userId is required for reset-credits action' },
            { status: 400 }
          );
        }
        result = await CreditManager.resetCredits(userId);
        break;
        
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Cleanup job error:', error);
    
    return NextResponse.json(
      { 
        error: 'Cleanup job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Cleanup job API',
    availableActions: [
      'cleanup - Remove expired images and old generations',
      'setup-lifecycle - Configure S3 lifecycle policies',
      'stats - Get image usage statistics',
      'credit-stats - Get credit usage statistics',
      'reset-credits - Reset user credits (requires userId)'
    ]
  });
}