import { Router } from "express";
import { LoyaltyController } from "../../controller/loyalty/loyalty.controller";
import { jwtVerify } from "../../middleware/auth.middleware";
import { requestValidation } from "../../middleware/requestValidation.middleware";
import { roleCheck } from "../../middleware/roleCheck.middleware";

import {
  RedeemRewardDto,
  ClaimReferralDto,
  ManualPointsAdjustmentDto,
  CreateRewardCatalogItemDto,
} from "../../dto/loyalty/loyalty.dto";


const router = Router();

// ==========================================
// CUSTOMER REWARDS ROUTING
// ==========================================

/**
 * @route   GET /api/loyalty/dashboard
 * @desc    Get the logged-in customer's loyalty profile snapshot & current daily streak
 * @access  Private (Customer)
 */
router.get(
  "/dashboard",
  jwtVerify,
  LoyaltyController.getDashboard
);


/**
 * @route   POST /api/loyalty/redeem
 * @desc    Redeem an active reward catalog item using accumulated points
 * @access  Private (Customer)
 */
router.post(
  "/redeem",
  jwtVerify,
  requestValidation(RedeemRewardDto),
  LoyaltyController.redeemReward
);


/**
 * @route   POST /api/loyalty/check-in
 * @desc    Process customer daily check-in to build streaks and earn points
 * @access  Private (Customer)
 */
router.post(
  "/check-in",
  jwtVerify,
  LoyaltyController.dailyCheckIn
);



/**
 * @route   POST /api/loyalty/referral/claim
 * @desc    Claim an invite referral code by a newly registered customer
 * @access  Private (Customer)
 */
router.post(
  "/referral/claim",
  jwtVerify,
  requestValidation(ClaimReferralDto),
  LoyaltyController.claimReferral
);


/**
 * @route   GET /api/loyalty/history
 * @desc    Fetch lists of point actions (EARNING, REDEMPTION, EXPIRATION) with query filters
 * @access  Private (Customer)
 */
router.get(
  "/history",
  jwtVerify,
  LoyaltyController.getPointsHistory
);



// ==========================================
// ADMINISTRATIVE ROUTING
// ==========================================

/**
 * @route   PATCH /api/loyalty/admin/config
 * @desc    Update global loyalty earning configurations and point calculation values
 * @access  Private (Admin)
 */
router.patch(
  "/admin/config",
  jwtVerify,
  (req, res, next) => roleCheck(["ADMIN"])(req, res, next),
  LoyaltyController.updateConfig
);



/**
 * @route   POST /api/loyalty/admin/adjust-points
 * @desc    Manually grant or deduct reward points from a targeted customer profile
 * @access  Private (Admin)
 */
router.post(
  "/admin/adjust-points",
  jwtVerify,
  (req, res, next) => roleCheck(["ADMIN"])(req, res, next),
  requestValidation(ManualPointsAdjustmentDto),
  LoyaltyController.adjustPoints
);


/**
 * @route   POST /api/loyalty/admin/catalog
 * @desc    Add a brand new reward offering to the public rewards catalog
 * @access  Private (Admin)
 */
router.post(
  "/admin/catalog",
  jwtVerify,
  (req, res, next) => roleCheck(["ADMIN"])(req, res, next),
  requestValidation(CreateRewardCatalogItemDto),
  LoyaltyController.createRewardCatalogItem
);


/**
 * @route   GET /api/loyalty/admin/analytics
 * @desc    Review high-level system metrics over specific date ranges
 * @access  Private (Admin)
 */
router.get(
  "/admin/analytics",
  jwtVerify,
  (req, res, next) => roleCheck(["ADMIN"])(req, res, next),
  LoyaltyController.getLoyaltyAnalytics
);


export default router;

