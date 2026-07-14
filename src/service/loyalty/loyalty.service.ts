import { LoyaltyRepository } from "../../repository/loyalty/loyalty.repository";
import { buildPaginationMeta, parsePagination } from "../../utils/helpers/pagination_helper";
import {   LoyaltyAccount, 
  LoyaltyTransaction, 
  RewardCatalog, 
  RewardWallet, 
  DailyCheckIn, 
  Referral } from "../../entities/loyalty/loyalty.entities";

export class LoyaltyService {
  constructor(private readonly repository: LoyaltyRepository) {}

  // ==========================================
  // CUSTOMER DASHBOARD
  // ==========================================
  async getCustomerDashboard(customerId: string) {
    let account = await this.repository.findByCustomerId(customerId);
    
    // Lazy initializing loyalty profiles for older existing user frames safely
    if (!account) {
      const generatedCode = `BITE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      account = new LoyaltyAccount();
      account.customerId = customerId;
      account.currentPoints = 0;
      account.lifetimeEarned = 0;
      account.lifetimeRedeemed = 0;
      account.expiredPoints = 0;
      account.membershipTier = "BRONZE";
      account.totalSpending = 0;
      account.referralCode = generatedCode;
      await this.repository.saveAccount(account);
    }

    const latestCheckIn = await this.repository.findLatestCheckIn(customerId);

    return {
      account,
      streakCount: latestCheckIn ? latestCheckIn.streakCount : 0,
      lastCheckInDate: latestCheckIn ? latestCheckIn.checkInDate : null
    };
  }

  // ==========================================
  // ATOMIC POINT REDEMPTION LOGIC
  // ==========================================
  async redeemRewardItem(customerId: string, rewardId: string) {
    return this.repository.runInTransaction(async (transactionalManager) => {
      const reward = await this.repository.findRewardForUpdate(rewardId, transactionalManager);
      if (!reward || !reward.isActive) {
        throw new Error("Inactive or invalid reward specified.");
      }

      if (reward.expiryDate && new Date(reward.expiryDate) < new Date()) {
        throw new Error("This reward catalog option has expired.");
      }

      if (reward.inventoryLimit !== undefined && reward.inventoryLimit <= 0) {
        throw new Error("Reward inventory limit reached.");
      }

      const account = await this.repository.findAccountForUpdate(customerId, transactionalManager);
      if (!account || account.currentPoints < reward.pointsRequired) {
        throw new Error(`Insufficient points balance. Required: ${reward.pointsRequired}`);
      }

      // Deduct asset vectors atomically
      account.currentPoints -= reward.pointsRequired;
      account.lifetimeRedeemed += reward.pointsRequired;
      await this.repository.saveAccount(account, transactionalManager);

      // Decrement catalog options inventory dynamically if monitored
      if (reward.inventoryLimit !== undefined) {
        reward.inventoryLimit -= 1;
        await this.repository.saveRewardCatalog(reward, transactionalManager);
      }

      // Append transaction journal log audit
      await this.repository.createTransaction({
        customerId,
        amount: reward.pointsRequired,
        type: "REDEMPTION",
        reason: `Redeemed reward: ${reward.title}`
      }, transactionalManager);

      // Issue coupon parameters into user asset wallet wallet
      const walletItem = new RewardWallet();
      walletItem.customerId = customerId;
      walletItem.rewardCatalogId = rewardId;
      walletItem.isUsed = false;
      
      if (reward.validityDays) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + reward.validityDays);
        walletItem.expiresAt = expiry;
      }

      return this.repository.saveWalletItem(walletItem, transactionalManager);
    });
  }

  // ==========================================
  // DAILY CHECK-IN SYSTEM
  // ==========================================
  async processDailyCheckIn(customerId: string) {
    const todayStr = new Date().toISOString().split("T")[0];
    const latestCheckIn = await this.repository.findLatestCheckIn(customerId);

    if (latestCheckIn && latestCheckIn.checkInDate === todayStr) {
      throw new Error("Already checked in today.");
    }

    let newStreak = 1;
    if (latestCheckIn) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (latestCheckIn.checkInDate === yesterdayStr) {
        newStreak = latestCheckIn.streakCount + 1;
      }
    }

    // Configurable reward scaling rules based on streaks
    const baseDailyReward = 5;
    const streakBonus = newStreak >= 7 ? 15 : newStreak >= 3 ? 5 : 0;
    const pointsAwarded = baseDailyReward + streakBonus;

    return this.repository.runInTransaction(async (transactionalManager) => {
      const account = await this.repository.findAccountForUpdate(customerId, transactionalManager);
      if (!account) throw new Error("Customer loyalty profile record missing.");

      account.currentPoints += pointsAwarded;
      account.lifetimeEarned += pointsAwarded;
      await this.repository.saveAccount(account, transactionalManager);

      await this.repository.createTransaction({
        customerId,
        amount: pointsAwarded,
        type: "EARNING",
        reason: `Daily Check-In Streak: Day ${newStreak}`
      }, transactionalManager);

      const checkInRecord = new DailyCheckIn();
      checkInRecord.customerId = customerId;
      checkInRecord.checkInDate = todayStr;
      checkInRecord.streakCount = newStreak;
      await this.repository.saveCheckIn(checkInRecord, transactionalManager);

      return { streakCount: newStreak, pointsAwarded };
    });
  }

  // ==========================================
  // REFERRAL VERIFICATION LOGIC
  // ==========================================
  async applyReferralCode(customerId: string, referralCode: string) {
    const referrerAccount = await this.repository.findReferralByCode(referralCode);
    if (!referrerAccount) {
      throw new Error("Invalid referral code provided.");
    }

    if (referrerAccount.customerId === customerId) {
      throw new Error("Self referral mutations are blocked.");
    }

    const cleanCode = referralCode.trim();
    if (!cleanCode) throw new Error("Referral code is required.");

    const existingRelationship = await this.repository.findReferralByFriendId(customerId);
    if (existingRelationship) {
      throw new Error("Already referred by a customer node network.");
    }

    const referral = new Referral();
    referral.referrerId = referrerAccount.customerId;
    referral.friendId = customerId;
    referral.status = "PENDING"; // Point allocation triggers post first order complete

    return this.repository.saveReferral(referral);
  }

  // ==========================================
  // TRANSACTION HISTORIES LIST
  // ==========================================
  async getCustomerTransactions(customerId: string, query: { page?: unknown; limit?: unknown; type?: unknown }) {
    const { page, limit, skip } = parsePagination(query.page, query.limit, 10);
    const typeFilter = typeof query.type === "string" ? query.type.toUpperCase() : undefined;

    const [data, total] = await this.repository.listTransactions(customerId, skip, limit, typeFilter);
    return { data, pagination: buildPaginationMeta(total, page, limit) };
  }

  // ==========================================
  // ADMINISTRATIVE LOGIC
  // ==========================================
  async updateGlobalLoyaltyConfig(payload: Record<string, unknown>) {
    // Write dynamic parameters configuration values map here or update database runtime records
    return { success: true, updatedConfig: payload };
  }

  async executeManualPointsAdjustment(payload: { customerId: string; amount: number; type: "GRANT" | "DEDUCT"; reason: string }) {
    return this.repository.runInTransaction(async (transactionalManager) => {
      const account = await this.repository.findAccountForUpdate(payload.customerId, transactionalManager);
      if (!account) throw new Error("Loyalty profile record not found.");

      if (payload.type === "GRANT") {
        account.currentPoints += payload.amount;
        account.lifetimeEarned += payload.amount;
      } else {
        if (account.currentPoints < payload.amount) {
          throw new Error(`Insufficient points balance to deduct. Current: ${account.currentPoints}`);
        }
        account.currentPoints -= payload.amount;
      }

      await this.repository.saveAccount(account, transactionalManager);
      
      await this.repository.createTransaction({
        customerId: payload.customerId,
        amount: payload.amount,
        type: payload.type === "GRANT" ? "EARNING" : "REDEMPTION",
        reason: `Admin adjustment: ${payload.reason}`
      }, transactionalManager);

      return account;
    });
  }

  async createReward(
    payload: {
      title: string;
      type: RewardCatalog["type"];
      pointsRequired: number;
      isActive: boolean;
      usageLimit?: number;
      validityDays?: number;
      metadata?: any;
    }
  ) {
    return this.repository.createCatalogReward(payload);
  }

  async getSystemAnalyticsWindow(query: { start?: unknown; end?: unknown }) {
    const start = typeof query.start === "string" ? new Date(query.start) : undefined;
    const end = typeof query.end === "string" ? new Date(query.end) : undefined;
    
    const rawMetrics = await this.repository.getAggregatedMetrics(start, end);
    return { rawMetrics, serverTimestamp: new Date() };
  }
}