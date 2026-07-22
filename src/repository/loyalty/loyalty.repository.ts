import { EntityManager } from "typeorm";
import { AppDataSource } from "../../configs/psqlDb.config";
import {
  DailyCheckIn,
  LoyaltyAccount,
  LoyaltyTransaction,
  LoyaltyTransactionSource,
  LoyaltyTransactionType,
  Referral,
  RewardCatalog,
  RewardWallet,
} from "../../entities/loyalty/loyalty.entities";

export class LoyaltyRepository {
  private readonly accountRepo = AppDataSource.getRepository(LoyaltyAccount);
  private readonly transactionRepo = AppDataSource.getRepository(LoyaltyTransaction);
  private readonly catalogRepo = AppDataSource.getRepository(RewardCatalog);
  private readonly walletRepo = AppDataSource.getRepository(RewardWallet);
  private readonly checkInRepo = AppDataSource.getRepository(DailyCheckIn);
  private readonly referralRepo = AppDataSource.getRepository(Referral);

  runInTransaction<T>(work: (entityManager: EntityManager) => Promise<T>): Promise<T> {
    return AppDataSource.transaction(work);
  }

  findByCustomerId(customerId: string, transactionalManager?: EntityManager) {
    const manager = transactionalManager || this.accountRepo.manager;
    return manager.findOne(LoyaltyAccount, { where: { customerId } });
  }

  findByReferralCode(referralCode: string, transactionalManager?: EntityManager) {
    const manager = transactionalManager || this.accountRepo.manager;
    return manager.findOne(LoyaltyAccount, { where: { referralCode } });
  }

  findAccountForUpdate(customerId: string, transactionalManager: EntityManager) {
    return transactionalManager.findOne(LoyaltyAccount, {
      where: { customerId },
      lock: { mode: "pessimistic_write" },
    });
  }

  saveAccount(account: LoyaltyAccount, transactionalManager?: EntityManager) {
    const manager = transactionalManager || this.accountRepo.manager;
    return manager.save(LoyaltyAccount, account);
  }

  findTransactionBySource(
    customerId: string,
    sourceType: LoyaltyTransactionSource,
    sourceId: string,
    type: LoyaltyTransactionType,
    transactionalManager?: EntityManager
  ) {
    const manager = transactionalManager || this.transactionRepo.manager;
    return manager.findOne(LoyaltyTransaction, { where: { customerId, sourceType, sourceId, type } });
  }

  createTransaction(payload: Partial<LoyaltyTransaction>, transactionalManager?: EntityManager) {
    const manager = transactionalManager || this.transactionRepo.manager;
    const tx = manager.create(LoyaltyTransaction, { metadata: {}, ...payload });
    return manager.save(LoyaltyTransaction, tx);
  }

  async listTransactions(customerId: string, skip: number, take: number, type?: string) {
    const qb = this.transactionRepo.createQueryBuilder("tx").where("tx.customerId = :customerId", { customerId });

    if (type) {
      qb.andWhere("tx.type = :type", { type });
    }

    return qb.orderBy("tx.created_at", "DESC").skip(skip).take(take).getManyAndCount();
  }

  findRewardById(id: string, transactionalManager?: EntityManager) {
    const manager = transactionalManager || this.catalogRepo.manager;
    return manager.findOne(RewardCatalog, { where: { id } });
  }

  findRewardForUpdate(id: string, transactionalManager: EntityManager) {
    return transactionalManager.findOne(RewardCatalog, {
      where: { id },
      lock: { mode: "pessimistic_write" },
    });
  }

  createCatalogReward(payload: Partial<RewardCatalog>) {
    const reward = this.catalogRepo.create(payload);
    return this.catalogRepo.save(reward);
  }

  saveRewardCatalog(reward: RewardCatalog, transactionalManager?: EntityManager) {
    const manager = transactionalManager || this.catalogRepo.manager;
    return manager.save(RewardCatalog, reward);
  }

  saveWalletItem(walletItem: RewardWallet, transactionalManager?: EntityManager) {
    const manager = transactionalManager || this.walletRepo.manager;
    return manager.save(RewardWallet, walletItem);
  }

  listActiveRewards() {
    return this.catalogRepo
      .createQueryBuilder("reward")
      .where("reward.is_active = :isActive", { isActive: true })
      .andWhere("(reward.expiry_date IS NULL OR reward.expiry_date > NOW())")
      .orderBy("reward.points_required", "ASC")
      .addOrderBy("reward.created_at", "DESC")
      .getMany();
  }

  listWallet(customerId: string) {
    return this.walletRepo.find({
      where: { customerId },
      relations: ["rewardCatalog"],
      order: { createdAt: "DESC" },
    });
  }

  countCustomerRewardRedemptions(customerId: string, rewardCatalogId: string, transactionalManager?: EntityManager) {
    const manager = transactionalManager || this.walletRepo.manager;
    return manager.count(RewardWallet, { where: { customerId, rewardCatalogId } });
  }

  findLatestCheckIn(customerId: string) {
    return this.checkInRepo.findOne({
      where: { customerId },
      order: { checkInDate: "DESC", createdAt: "DESC" },
    });
  }

  findLatestCheckInForUpdate(customerId: string, transactionalManager: EntityManager) {
    return transactionalManager.findOne(DailyCheckIn, {
      where: { customerId },
      order: { checkInDate: "DESC", createdAt: "DESC" },
      lock: { mode: "pessimistic_write" },
    });
  }

  findCheckInByDate(customerId: string, checkInDate: string, transactionalManager?: EntityManager) {
    const manager = transactionalManager || this.checkInRepo.manager;
    return manager.findOne(DailyCheckIn, { where: { customerId, checkInDate } });
  }

  saveCheckIn(checkIn: DailyCheckIn, transactionalManager?: EntityManager) {
    const manager = transactionalManager || this.checkInRepo.manager;
    return manager.save(DailyCheckIn, checkIn);
  }

  findReferralByFriendId(friendId: string, transactionalManager?: EntityManager) {
    const manager = transactionalManager || this.referralRepo.manager;
    return manager.findOne(Referral, { where: { friendId } });
  }

  findReferralByCode(referralCode: string) {
    return this.accountRepo.findOne({ where: { referralCode } });
  }

  findPendingReferralForUpdate(friendId: string, transactionalManager: EntityManager) {
    return transactionalManager.findOne(Referral, {
      where: { friendId, status: "PENDING" },
      lock: { mode: "pessimistic_write" },
    });
  }

  saveReferral(referral: Referral, transactionalManager?: EntityManager) {
    const manager = transactionalManager || this.referralRepo.manager;
    return manager.save(Referral, referral);
  }

  async getAggregatedMetrics(startDate?: Date, endDate?: Date) {
    const qb = this.transactionRepo
      .createQueryBuilder("tx")
      .select("tx.type", "type")
      .addSelect("SUM(tx.amount)", "totalPoints")
      .addSelect("COUNT(tx.id)", "count");

    if (startDate && endDate) {
      qb.where("tx.created_at BETWEEN :startDate AND :endDate", { startDate, endDate });
    }

    return qb.groupBy("tx.type").getRawMany();
  }
}
