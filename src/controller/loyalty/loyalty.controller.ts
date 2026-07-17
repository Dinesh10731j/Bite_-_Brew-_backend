import { Request, Response } from "express";
import { HTTP_STATUS } from "../../constant/statusCode.interface";
import { Message } from "../../constant/message.interface";
import { LoyaltyRepository } from "../../repository/loyalty/loyalty.repository";
import { LoyaltyService } from "../../service/loyalty/loyalty.service";

const loyaltyService = new LoyaltyService(new LoyaltyRepository());

const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
};

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

export class LoyaltyController {
  // ==========================================
  // CUSTOMER ENDPOINTS
  // ==========================================

  /**
   * Retrieves the comprehensive loyalty dashboard snapshot for the logged-in customer.
   */

static async createAccount(req: Request, res: Response): Promise<Response | void> {
    try {
      const customerId = req.user?.id;
      const { referralCode } = req.body;

      if (!customerId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: Message.UNAUTHORIZED });
      }

      const account = await loyaltyService.createAccount(customerId, referralCode);

      return res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: "Loyalty account initialized successfully",
        data: {
          customerId: account.customerId,
          referralCode: account.referralCode,
          currentPoints: account.currentPoints,
          membershipTier: account.membershipTier,
          lifetimeEarned: account.lifetimeEarned,
          lifetimeRedeemed: account.lifetimeRedeemed,
          expiredPoints: account.expiredPoints,
          totalSpending: account.totalSpending,
        },
      });
    } catch (error: any) {
      // IMPORTANT: surface the real error for debugging 500s
      console.error("[LoyaltyController.createAccount] failed:", error);

      if (error?.statusCode === 409) {
        return res.status(409).json({ message: error.message });
      }
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }




  static async getDashboard(req: Request, res: Response) {
    try {
      const customerId = req.user?.id; // Assumes auth middleware populates req.user
      if (!customerId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: Message.UNAUTHORIZED });
      }

      const dashboardData = await loyaltyService.getCustomerDashboard(customerId);
      return res.status(HTTP_STATUS.OK).json({ message: Message.SUCCESS, data: dashboardData });
    } catch (error) {
      console.error('[LoyaltyController.getDashboard] failed:', error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  /**
   * Redeems a specific item from the active rewards catalog for the customer.
   */
  static async redeemReward(req: Request, res: Response) {
    try {
      const customerId = req.user?.id;
      const { rewardId } = req.body;

      if (!customerId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: Message.UNAUTHORIZED });
      }
      if (!rewardId || typeof rewardId !== "string") {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Valid Reward ID is required." });
      }

      const walletItem = await loyaltyService.redeemRewardItem(customerId, rewardId);
      return res.status(HTTP_STATUS.OK).json({ message: Message.SUCCESS, data: walletItem });
    } catch (error: any) {
      if (error instanceof Error && (error.message.includes("Insufficient") || error.message.includes("limit reached") || error.message.includes("Inactive"))) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
      }
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  /**
   * Processes a daily check-in event to sustain streaks and earn daily points.
   */
  static async dailyCheckIn(req: Request, res: Response) {
    try {
      const customerId = req.user?.id;
      if (!customerId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: Message.UNAUTHORIZED });
      }

      const checkInResult = await loyaltyService.processDailyCheckIn(customerId);
      return res.status(HTTP_STATUS.OK).json({ message: Message.SUCCESS, data: checkInResult });
    } catch (error: any) {
      if (error instanceof Error && error.message.includes("Already checked in today")) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
      }
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  /**
   * Submits a referral code claimed by a newly registered friend.
   */
  static async claimReferral(req: Request, res: Response) {
    try {
      const customerId = req.user?.id;
      const referralCode = typeof req.body?.referralCode === "string" ? req.body.referralCode.trim() : "";

      if (!customerId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: Message.UNAUTHORIZED });
      }
      if (!referralCode) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Referral code is required." });
      }

      const referralRelation = await loyaltyService.applyReferralCode(customerId, referralCode);
      return res.status(HTTP_STATUS.CREATED).json({ message: Message.CREATED_SUCCESS, data: referralRelation });
    } catch (error: any) {
      if (error instanceof Error && (error.message.includes("Self referral") || error.message.includes("Invalid referral") || error.message.includes("Already referred"))) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
      }
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  /**
   * Fetches the filtered transaction history of points (Earnings vs Redemptions) for the customer.
   */
  static async getPointsHistory(req: Request, res: Response) {
    try {
      const customerId = req.user?.id;
      if (!customerId) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: Message.UNAUTHORIZED });
      }

      const result = await loyaltyService.getCustomerTransactions(customerId, req.query);
      return res.status(HTTP_STATUS.OK).json({ message: Message.SUCCESS, ...result });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  // ==========================================
  // ADMINISTRATIVE ENDPOINTS
  // ==========================================

  /**
   * Updates global configurations (e.g., currency-to-point ratios, rules).
   */
  static async updateConfig(req: Request, res: Response) {
    try {
      const updatedConfig = await loyaltyService.updateGlobalLoyaltyConfig(req.body);
      return res.status(HTTP_STATUS.OK).json({ message: Message.UPDATED_SUCCESS, data: updatedConfig });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  /**
   * Manually adjustments a client's point balance (Grant or Deduct Points).
   */
  static async adjustPoints(req: Request, res: Response) {
    try {
      const { customerId, type, reason } = req.body;
      const amount = parseNumber(req.body?.amount);

      if (!customerId || !type || amount === undefined || amount <= 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid payload parameters provided." });
      }

      if (type !== "GRANT" && type !== "DEDUCT") {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Adjustment type must be 'GRANT' or 'DEDUCT'." });
      }

      const updatedBalance = await loyaltyService.executeManualPointsAdjustment({
        customerId,
        amount,
        type,
        reason: reason || "Administrative adjustment",
      });

      return res.status(HTTP_STATUS.OK).json({ message: Message.UPDATED_SUCCESS, data: updatedBalance });
    } catch (error: any) {
      if (error instanceof Error && error.message.includes("Insufficient points balance")) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
      }
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  /**
   * Creates a brand new reward offer within the rewards catalog.
   */
  static async createRewardCatalogItem(req: Request, res: Response) {
    try {
      const pointsRequired = parseNumber(req.body?.pointsRequired);
      const isActive = parseBoolean(req.body?.isActive);

      if (!req.body?.title || pointsRequired === undefined || pointsRequired < 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Title and valid Points Required are mandatory." });
      }

      const rewardItem = await loyaltyService.createReward({
        title: req.body.title,
        type: req.body.type || "FIXED_DISCOUNT",
        pointsRequired,
        isActive: isActive !== undefined ? isActive : true,
        usageLimit: parseNumber(req.body?.usageLimit),
        validityDays: parseNumber(req.body?.validityDays),
        metadata: req.body.metadata || {},
      });

      return res.status(HTTP_STATUS.CREATED).json({ message: Message.CREATED_SUCCESS, data: rewardItem });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }

  /**
   * Provides aggregate analytics metrics targeting the execution efficiency of loyalty campaigns.
   */
  static async getLoyaltyAnalytics(req: Request, res: Response) {
    try {
      const analytics = await loyaltyService.getSystemAnalyticsWindow(req.query);
      return res.status(HTTP_STATUS.OK).json({ message: Message.SUCCESS, data: analytics });
    } catch (_error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: Message.INTERNAL_SERVER_ERROR });
    }
  }
}