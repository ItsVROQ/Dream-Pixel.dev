import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreditManagementOptions {
  autoRecharge?: boolean;
  freeTierLimit?: number;
  proTierLimit?: number;
  enterpriseUnlimited?: boolean;
}

export class CreditManager {
  private static readonly DEFAULT_CREDITS = {
    FREE: 10,
    PRO: 1000,
    ENTERPRISE: -1, // Unlimited
  };

  private static readonly CREDIT_COSTS = {
    GENERATION: 1,
    HIGH_RESOLUTION: 2,
    BULK_PROCESSING: 0.1,
  };

  /**
   * Check if user has sufficient credits
   */
  static async hasSufficientCredits(
    userId: string,
    requiredCredits: number = 1
  ): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        tier: true,
        creditsRemaining: true,
      },
    });

    if (!user) {
      return false;
    }

    // Enterprise users have unlimited credits
    if (user.tier === 'ENTERPRISE') {
      return true;
    }

    return user.creditsRemaining >= requiredCredits;
  }

  /**
   * Deduct credits for an operation
   */
  static async deductCredits(
    userId: string,
    operation: keyof typeof CreditManager.CREDIT_COSTS = 'GENERATION',
    quantity: number = 1
  ): Promise<{ success: boolean; remainingCredits?: number; error?: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        tier: true,
        creditsRemaining: true,
      },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const cost = CreditManager.CREDIT_COSTS[operation] * quantity;

    // Enterprise users don't use credits
    if (user.tier === 'ENTERPRISE') {
      return { success: true };
    }

    // Check if user has enough credits
    if (user.creditsRemaining < cost) {
      return { 
        success: false, 
        error: `Insufficient credits. Required: ${cost}, Available: ${user.creditsRemaining}`,
        remainingCredits: user.creditsRemaining,
      };
    }

    // Deduct credits
    await prisma.user.update({
      where: { id: userId },
      data: {
        creditsRemaining: user.creditsRemaining - cost,
      },
    });

    return { 
      success: true, 
      remainingCredits: user.creditsRemaining - cost,
    };
  }

  /**
   * Add credits to a user
   */
  static async addCredits(
    userId: string,
    amount: number
  ): Promise<{ success: boolean; newTotal: number; error?: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        tier: true,
        creditsRemaining: true,
      },
    });

    if (!user) {
      return { success: false, newTotal: 0, error: 'User not found' };
    }

    // Enterprise users don't need credits
    if (user.tier === 'ENTERPRISE') {
      return { success: true, newTotal: -1 };
    }

    const newTotal = user.creditsRemaining + amount;

    await prisma.user.update({
      where: { id: userId },
      data: {
        creditsRemaining: newTotal,
      },
    });

    return { success: true, newTotal };
  }

  /**
   * Get user's credit information
   */
  static async getCreditInfo(userId: string): Promise<{
    currentCredits: number;
    tier: string;
    unlimited: boolean;
    creditLimit?: number;
    recentUsage: Array<{
      date: string;
      operation: string;
      creditsUsed: number;
      remainingCredits: number;
    }>;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        tier: true,
        creditsRemaining: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isUnlimited = user.tier === 'ENTERPRISE';
    const creditLimit = this.DEFAULT_CREDITS[user.tier as keyof typeof this.DEFAULT_CREDITS];

    // Get recent usage (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsage = []; // This would be populated from an audit log

    return {
      currentCredits: user.creditsRemaining,
      tier: user.tier,
      unlimited: isUnlimited,
      creditLimit: isUnlimited ? undefined : creditLimit,
      recentUsage,
    };
  }

  /**
   * Reset credits for a user tier
   */
  static async resetCredits(userId: string): Promise<{ success: boolean; newCredits: number; error?: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        tier: true,
      },
    });

    if (!user) {
      return { success: false, newCredits: 0, error: 'User not found' };
    }

    const defaultCredits = this.DEFAULT_CREDITS[user.tier as keyof typeof this.DEFAULT_CREDITS];

    await prisma.user.update({
      where: { id: userId },
      data: {
        creditsRemaining: defaultCredits,
      },
    });

    return { success: true, newCredits: defaultCredits };
  }

  /**
   * Calculate credit cost for generation parameters
   */
  static calculateGenerationCost(options: {
    isHighResolution?: boolean;
    isBulkProcessing?: boolean;
    quantity?: number;
  }): number {
    let cost = this.CREDIT_COSTS.GENERATION;

    if (options.isHighResolution) {
      cost += this.CREDIT_COSTS.HIGH_RESOLUTION;
    }

    if (options.isBulkProcessing) {
      cost *= this.CREDIT_COSTS.BULK_PROCESSING;
    }

    return Math.max(0.1, Math.round(cost * (options.quantity || 1) * 10) / 10);
  }

  /**
   * Get credit statistics for admin dashboard
   */
  static async getCreditStats(): Promise<{
    totalCreditsIssued: number;
    totalCreditsUsed: number;
    usersByTier: Record<string, number>;
    averageUsage: number;
    topUsers: Array<{
      userId: string;
      email: string;
      creditsUsed: number;
      tier: string;
    }>;
  }> {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        tier: true,
        creditsRemaining: true,
        createdAt: true,
      },
    });

    const stats = {
      totalCreditsIssued: 0,
      totalCreditsUsed: 0,
      usersByTier: {} as Record<string, number>,
      averageUsage: 0,
      topUsers: [] as Array<{ userId: string; email: string; creditsUsed: number; tier: string }>,
    };

    users.forEach((user) => {
      // Count users by tier
      stats.usersByTier[user.tier] = (stats.usersByTier[user.tier] || 0) + 1;
      
      // Calculate totals (simplified)
      const issuedCredits = this.DEFAULT_CREDITS[user.tier as keyof typeof this.DEFAULT_CREDITS];
      if (issuedCredits > 0) {
        stats.totalCreditsIssued += issuedCredits;
        stats.totalCreditsUsed += issuedCredits - user.creditsRemaining;
      }
    });

    stats.averageUsage = users.length > 0 ? stats.totalCreditsUsed / users.length : 0;

    // Get top users (would require usage tracking)
    stats.topUsers = []; // This would be populated from actual usage data

    return stats;
  }
}