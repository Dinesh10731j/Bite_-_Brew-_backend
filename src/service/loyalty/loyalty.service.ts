import { QueryFailedError } from "typeorm";
import { Order } from "../../entities/order/order.entity";
import {
  DailyCheckIn,
  LoyaltyAccount,
  LoyaltyTier,
  LoyaltyTransactionSource,
  LoyaltyTransactionType,
  Referral,
  RewardCatalog,
  RewardWallet,
} from "../../entities/loyalty/loyalty.entities";
import { LoyaltyRepository } from "../../repository/loyalty/loyalty.repository";
import {
  recordLoyaltyTransaction,
  recordReferralCompletion,
  recordRewardRedemption,
} from "../../observability/metrics";
import { buildPaginationMeta, parsePagination } from "../../utils/helpers/pagination_helper";

const RULES = {
  pointsPerCurrencyUnit: Number(process.env.LOYALTY_POINTS_PER_CURRENCY_UNIT || 1),
  dailyCheckInBasePoints: Number(process.env.LOYALTY_DAILY_CHECKIN_POINTS || 5),
  dailyCheckInThreeDayBonus: Number(process.env.LOYALTY_DAILY_CHECKIN_3_DAY_BONUS || 5),
  dailyCheckInSevenDayBonus: Number(process.env.LOYALTY_DAILY_CHECKIN_7_DAY_BONUS || 15),
  referralReferrerBonus: Number(process.env.LOYALTY_REFERRER_BONUS_POINTS || 50),
  referralFriendBonus: Number(process.env.LOYALTY_FRIEND_BONUS_POINTS || 25),
  tiers: [
    { tier: "PLATINUM" as LoyaltyTier, minimumSpend: 750 },
    { tier: "GOLD" as LoyaltyTier, minimumSpend: 300 },
    { tier: "SILVER" as LoyaltyTier, minimumSpend: 100 },
    { tier: "BRONZE" as LoyaltyTier, minimumSpend: 0 },
  ],
};

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof QueryFailedError && (error as any).driverError?.code === "23505";

const serviceError = (message: string, statusCode = 400) => {
  const error: Error & { statusCode?: number } = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const todayUtcDate = (): string => new Date().toISOString().slice(0, 10);

const normalizeReferralCode = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");

const generateReferralCode = (): string => `BITE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const calculateTier = (totalSpending: number): LoyaltyTier =>
  RULES.tiers.find((tier) => totalSpending >= tier.minimumSpend)?.tier || "BRONZE";

export class LoyaltyService {
  constructor(private readonly repository: LoyaltyRepository) {}

  async createAccount(customerId: string, requestedReferralCode?: string) {
    return this.getOrCreateAccount(customerId, requestedReferralCode);
  }

  async getOrCreateAccount(customerId: string, requestedReferralCode?: string, transactionalManager?: any) {
    const existingAccount = await this.repository.findByCustomerId(customerId, transactionalManager);
    if (existingAccount) return existingAccount;

    const makeAccount = async (referralCode: string) => {
      const account = new LoyaltyAccount();
      account.customerId = customerId;
      account.referralCode = referralCode;
      account.currentPoints = 0;
      account.lifetimeEarned = 0;
      account.lifetimeRedeemed = 0;
      account.expiredPoints = 0;
      account.membershipTier = "BRONZE";
      account.totalSpending = 0;
      return this.repository.saveAccount(account, transactionalManager);
    };

    if (requestedReferralCode) {
      const referralCode = normalizeReferralCode(requestedReferralCode);
      if (referralCode.length < 3 || referralCode.length > 20) {
        throw serviceError("Referral code must be between 3 and 20 valid characters.");
      }
      try {
        return await makeAccount(referralCode);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw serviceError("Referral code is already in use.", 409);
        }
        throw error;
      }
    }

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await makeAccount(generateReferralCode());
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
      }
    }

    throw serviceError("Unable to generate a unique referral code.", 500);
  }

  async getCustomerDashboard(customerId: string) {
    const account = await this.getOrCreateAccount(customerId);
    const latestCheckIn = await this.repository.findLatestCheckIn(customerId);
    const wallet = await this.repository.listWallet(customerId);

    return {
      account,
      streakCount: latestCheckIn ? latestCheckIn.streakCount : 0,
      lastCheckInDate: latestCheckIn ? latestCheckIn.checkInDate : null,
      activeRewards: wallet.filter((item) => !item.isUsed && (!item.expiresAt || item.expiresAt > new Date())).length,
    };
  }

  async listRewardCatalog() {
    return this.repository.listActiveRewards();
  }

  async listCustomerWallet(customerId: string) {
    return this.repository.listWallet(customerId);
  }

  async redeemRewardItem(customerId: string, rewardId: string) {
    return this.repository.runInTransaction(async (transactionalManager) => {
      const reward = await this.repository.findRewardForUpdate(rewardId, transactionalManager);
      if (!reward || !reward.isActive) throw serviceError("Inactive or invalid reward specified.");
      if (reward.expiryDate && new Date(reward.expiryDate) < new Date()) {
        throw serviceError("This reward catalog option has expired.");
      }
      if (reward.inventoryLimit !== undefined && reward.inventoryLimit !== null && reward.inventoryLimit <= 0) {
        throw serviceError("Reward inventory limit reached.");
      }

      if (reward.usageLimit) {
        const customerRedemptionCount = await this.repository.countCustomerRewardRedemptions(
          customerId,
          reward.id,
          transactionalManager
        );
        if (customerRedemptionCount >= reward.usageLimit) {
          throw serviceError("Reward usage limit reached for this customer.");
        }
      }

      const account = await this.repository.findAccountForUpdate(customerId, transactionalManager);
      if (!account) throw serviceError("Customer loyalty profile record missing.", 404);
      if (account.currentPoints < reward.pointsRequired) {
        throw serviceError(`Insufficient points balance. Required: ${reward.pointsRequired}`);
      }

      account.currentPoints -= reward.pointsRequired;
      account.lifetimeRedeemed += reward.pointsRequired;
      await this.repository.saveAccount(account, transactionalManager);

      if (reward.inventoryLimit !== undefined && reward.inventoryLimit !== null) {
        reward.inventoryLimit -= 1;
        await this.repository.saveRewardCatalog(reward, transactionalManager);
      }

      const walletItem = new RewardWallet();
      walletItem.customerId = customerId;
      walletItem.rewardCatalogId = rewardId;
      walletItem.isUsed = false;
      if (reward.validityDays) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + reward.validityDays);
        walletItem.expiresAt = expiry;
      }
      const savedWalletItem = await this.repository.saveWalletItem(walletItem, transactionalManager);

      const transaction = await this.recordPointsMovement({
        customerId,
        amount: reward.pointsRequired,
        type: "REDEMPTION",
        sourceType: "REWARD_REDEMPTION",
        sourceId: savedWalletItem.id,
        reason: `Redeemed reward: ${reward.title}`,
        balanceAfter: account.currentPoints,
        metadata: { rewardId, rewardType: reward.type },
        transactionalManager,
      });

      recordRewardRedemption(reward.type);
      return { walletItem: savedWalletItem, transaction };
    });
  }

  async processDailyCheckIn(customerId: string) {
    const todayStr = todayUtcDate();
    const latestCheckIn = await this.repository.findLatestCheckIn(customerId);

    if (latestCheckIn && latestCheckIn.checkInDate === todayStr) {
      throw serviceError("Already checked in today.");
    }

    let newStreak = 1;
    if (latestCheckIn) {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      if (latestCheckIn.checkInDate === yesterday.toISOString().slice(0, 10)) {
        newStreak = latestCheckIn.streakCount + 1;
      }
    }

    const streakBonus =
      newStreak >= 7 ? RULES.dailyCheckInSevenDayBonus : newStreak >= 3 ? RULES.dailyCheckInThreeDayBonus : 0;
    const pointsAwarded = RULES.dailyCheckInBasePoints + streakBonus;

    return this.repository.runInTransaction(async (transactionalManager) => {
      const existingToday = await this.repository.findCheckInByDate(customerId, todayStr, transactionalManager);
      if (existingToday) throw serviceError("Already checked in today.");

      const account = await this.repository.findAccountForUpdate(customerId, transactionalManager);
      if (!account) throw serviceError("Customer loyalty profile record missing.", 404);

      account.currentPoints += pointsAwarded;
      account.lifetimeEarned += pointsAwarded;
      await this.repository.saveAccount(account, transactionalManager);

      const checkInRecord = new DailyCheckIn();
      checkInRecord.customerId = customerId;
      checkInRecord.checkInDate = todayStr;
      checkInRecord.streakCount = newStreak;
      await this.repository.saveCheckIn(checkInRecord, transactionalManager);

      await this.recordPointsMovement({
        customerId,
        amount: pointsAwarded,
        type: "EARNING",
        sourceType: "DAILY_CHECK_IN",
        sourceId: todayStr,
        reason: `Daily check-in streak: day ${newStreak}`,
        balanceAfter: account.currentPoints,
        transactionalManager,
      });

      return { streakCount: newStreak, pointsAwarded, currentPoints: account.currentPoints };
    });
  }

  async applyReferralCode(customerId: string, referralCode: string) {
    const cleanCode = normalizeReferralCode(referralCode);
    if (!cleanCode) throw serviceError("Referral code is required.");

    const referrerAccount = await this.repository.findReferralByCode(cleanCode);
    if (!referrerAccount) throw serviceError("Invalid referral code provided.");
    if (referrerAccount.customerId === customerId) throw serviceError("Self referral mutations are blocked.");

    const existingRelationship = await this.repository.findReferralByFriendId(customerId);
    if (existingRelationship) throw serviceError("Already referred by a customer.");

    await this.getOrCreateAccount(customerId);

    const referral = new Referral();
    referral.referrerId = referrerAccount.customerId;
    referral.friendId = customerId;
    referral.status = "PENDING";

    return this.repository.saveReferral(referral);
  }

  async awardCompletedOrderPoints(order: Pick<Order, "id" | "userId" | "totalPrice" | "status">) {
    if (!order.userId) return { awarded: false, reason: "ORDER_HAS_NO_USER" as const };

    return this.repository.runInTransaction(async (transactionalManager) => {
      const existing = await this.repository.findTransactionBySource(
        order.userId as string,
        "ORDER",
        order.id,
        "EARNING",
        transactionalManager
      );
      if (existing) return { awarded: false, reason: "ALREADY_AWARDED" as const, transaction: existing };

      const account = await this.getOrCreateAccount(order.userId as string, undefined, transactionalManager);
      const lockedAccount = await this.repository.findAccountForUpdate(account.customerId, transactionalManager);
      if (!lockedAccount) throw serviceError("Customer loyalty profile record missing.", 404);

      const orderTotal = Number(order.totalPrice || 0);
      const pointsAwarded = Math.max(0, Math.floor(orderTotal * RULES.pointsPerCurrencyUnit));
      lockedAccount.currentPoints += pointsAwarded;
      lockedAccount.lifetimeEarned += pointsAwarded;
      lockedAccount.totalSpending = Number((Number(lockedAccount.totalSpending || 0) + orderTotal).toFixed(2));
      lockedAccount.membershipTier = calculateTier(lockedAccount.totalSpending);
      await this.repository.saveAccount(lockedAccount, transactionalManager);

      const transaction = await this.recordPointsMovement({
        customerId: lockedAccount.customerId,
        amount: pointsAwarded,
        type: "EARNING",
        sourceType: "ORDER",
        sourceId: order.id,
        reason: `Purchase reward for completed order ${order.id}`,
        balanceAfter: lockedAccount.currentPoints,
        metadata: { orderTotal, membershipTier: lockedAccount.membershipTier },
        transactionalManager,
      });

      const referralResult = await this.completePendingReferral(lockedAccount.customerId, order.id, transactionalManager);
      return { awarded: true, pointsAwarded, account: lockedAccount, transaction, referralResult };
    });
  }

  async getCustomerTransactions(customerId: string, query: { page?: unknown; limit?: unknown; type?: unknown }) {
    const { page, limit, skip } = parsePagination(query.page, query.limit, 10);
    const typeFilter = typeof query.type === "string" ? query.type.toUpperCase() : undefined;
    const allowedTypes: LoyaltyTransactionType[] = ["EARNING", "REDEMPTION", "EXPIRATION", "ADJUSTMENT"];

    const [data, total] = await this.repository.listTransactions(
      customerId,
      skip,
      limit,
      typeFilter && allowedTypes.includes(typeFilter as LoyaltyTransactionType) ? typeFilter : undefined
    );
    return { data, pagination: buildPaginationMeta(total, page, limit) };
  }

  async updateGlobalLoyaltyConfig(payload: Record<string, unknown>) {
    return { success: true, activeRules: RULES, requestedConfig: payload };
  }

  async executeManualPointsAdjustment(payload: {
    customerId: string;
    amount: number;
    type: "GRANT" | "DEDUCT";
    reason: string;
  }) {
    return this.repository.runInTransaction(async (transactionalManager) => {
      const account = await this.repository.findAccountForUpdate(payload.customerId, transactionalManager);
      if (!account) throw serviceError("Loyalty profile record not found.", 404);

      if (payload.type === "GRANT") {
        account.currentPoints += payload.amount;
        account.lifetimeEarned += payload.amount;
      } else {
        if (account.currentPoints < payload.amount) {
          throw serviceError(`Insufficient points balance to deduct. Current: ${account.currentPoints}`);
        }
        account.currentPoints -= payload.amount;
        account.lifetimeRedeemed += payload.amount;
      }

      await this.repository.saveAccount(account, transactionalManager);
      await this.recordPointsMovement({
        customerId: payload.customerId,
        amount: payload.amount,
        type: "ADJUSTMENT",
        sourceType: "ADMIN_ADJUSTMENT",
        sourceId: `${Date.now()}`,
        reason: `Admin adjustment (${payload.type}): ${payload.reason}`,
        balanceAfter: account.currentPoints,
        transactionalManager,
      });

      return account;
    });
  }

  async createReward(payload: {
    title: string;
    type: RewardCatalog["type"];
    pointsRequired: number;
    isActive: boolean;
    usageLimit?: number;
    inventoryLimit?: number;
    validityDays?: number;
    expiryDate?: Date;
    metadata?: Record<string, any>;
  }) {
    return this.repository.createCatalogReward({ metadata: {}, ...payload });
  }

  async getSystemAnalyticsWindow(query: { start?: unknown; end?: unknown }) {
    const start = typeof query.start === "string" ? new Date(query.start) : undefined;
    const end = typeof query.end === "string" ? new Date(query.end) : undefined;
    const validStart = start && !Number.isNaN(start.getTime()) ? start : undefined;
    const validEnd = end && !Number.isNaN(end.getTime()) ? end : undefined;

    const rawMetrics = await this.repository.getAggregatedMetrics(validStart, validEnd);
    return { rawMetrics, activeRules: RULES, serverTimestamp: new Date() };
  }

  private async completePendingReferral(friendId: string, orderId: string, transactionalManager: any) {
    const referral = await this.repository.findPendingReferralForUpdate(friendId, transactionalManager);
    if (!referral) return { completed: false };

    const referrer = await this.repository.findAccountForUpdate(referral.referrerId, transactionalManager);
    const friend = await this.repository.findAccountForUpdate(referral.friendId, transactionalManager);
    if (!referrer || !friend) return { completed: false, reason: "ACCOUNT_MISSING" as const };

    referrer.currentPoints += RULES.referralReferrerBonus;
    referrer.lifetimeEarned += RULES.referralReferrerBonus;
    friend.currentPoints += RULES.referralFriendBonus;
    friend.lifetimeEarned += RULES.referralFriendBonus;

    referral.status = "COMPLETED";
    referral.completedAt = new Date();

    await this.repository.saveAccount(referrer, transactionalManager);
    await this.repository.saveAccount(friend, transactionalManager);
    await this.repository.saveReferral(referral, transactionalManager);

    await this.recordPointsMovement({
      customerId: referrer.customerId,
      amount: RULES.referralReferrerBonus,
      type: "EARNING",
      sourceType: "REFERRAL",
      sourceId: referral.id,
      reason: `Referral completed by first order ${orderId}`,
      balanceAfter: referrer.currentPoints,
      transactionalManager,
    });
    await this.recordPointsMovement({
      customerId: friend.customerId,
      amount: RULES.referralFriendBonus,
      type: "EARNING",
      sourceType: "REFERRAL",
      sourceId: referral.id,
      reason: `Referral signup bonus after first order ${orderId}`,
      balanceAfter: friend.currentPoints,
      transactionalManager,
    });

    recordReferralCompletion();
    return { completed: true, referralId: referral.id };
  }

  private async recordPointsMovement(params: {
    customerId: string;
    amount: number;
    type: LoyaltyTransactionType;
    sourceType: LoyaltyTransactionSource;
    sourceId: string;
    reason: string;
    balanceAfter: number;
    metadata?: Record<string, any>;
    transactionalManager: any;
  }) {
    const transaction = await this.repository.createTransaction(
      {
        customerId: params.customerId,
        amount: params.amount,
        type: params.type,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        reason: params.reason,
        balanceAfter: params.balanceAfter,
        metadata: params.metadata || {},
      },
      params.transactionalManager
    );
    recordLoyaltyTransaction({ type: params.type, source: params.sourceType, amount: params.amount });
    return transaction;
  }
}
