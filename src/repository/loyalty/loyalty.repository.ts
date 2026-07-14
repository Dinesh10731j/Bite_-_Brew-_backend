import { AppDataSource } from "../../configs/psqlDb.config";
import { EntityManager } from "typeorm";
// Assume these entities exist in your setup based on the database requirements
import { 
  LoyaltyAccount, 
  LoyaltyTransaction, 
  RewardCatalog, 
  RewardWallet, 
  DailyCheckIn, 
  Referral 
} from "../../entities/loyalty/loyalty.entities";

export class LoyaltyRepository {
  private readonly accountRepo = AppDataSource.getRepository(LoyaltyAccount);
  private readonly transactionRepo = AppDataSource.getRepository(LoyaltyTransaction);
  private readonly catalogRepo = AppDataSource.getRepository(RewardCatalog);
  private readonly walletRepo = AppDataSource.getRepository(RewardWallet);
  private readonly checkInRepo = AppDataSource.getRepository(DailyCheckIn);
  private readonly referralRepo = AppDataSource.getRepository(Referral);

  // ==========================================
  // TRANSACTION MANAGER WRAPPER
  // ==========================================
  async runInTransaction<T>(work: (entityManager: EntityManager) => Promise<T>): Promise<T> {
    return AppDataSource.transaction(work);
  }

  // ==========================================
  // LOYALTY ACCOUNT OPERATIONS
  // ==========================================
  findByCustomerId(customerId: string, transactionalManager?: EntityManager) {
    const manager = transactionalManager || this.accountRepo.manager;
    return manager.findOne(LoyaltyAccount, { where: { customerId } });
  }

  findAccountForUpdate(customerId: string, transactionalManager: EntityManager) {
    // Enforce pessimistic locking to prevent race conditions during point manipulations
    return transactionalManager.findOne(LoyaltyAccount, {
      where: { customerId },
      lock: { mode: "pessimistic_write" }
    });
  }

  saveAccount(account: LoyaltyAccount, transactionalManager?: EntityManager) {
    const manager = transactionalManager || this.accountRepo.manager;
    return manager.save(LoyaltyAccount, account);
  }

  // ==========================================
  // TRANSACTION LOGGING OPERATIONS
  // ==========================================
  createTransaction(payload: Partial<LoyaltyTransaction>, transactionalManager?: EntityManager) {
    const manager = transactionalManager || this.transactionRepo.manager;
    const tx = manager.create(LoyaltyTransaction, payload);
    return manager.save(LoyaltyTransaction, tx);
  }

  async listTransactions(customerId: string, skip: number, take: number, type?: string) {
    const qb = this.transactionRepo.createQueryBuilder("tx")
      .where("tx.customerId = :customerId", { customerId });

    if (type) {
      qb.andWhere("tx.type = :type", { type });
    }

    return qb
      .orderBy("tx.createdAt", "DESC")
      .skip(skip)
      .take(take)
      .getManyAndCount();
  }

  // ==========================================
  // REWARD CATALOG & WALLET OPERATIONS
  // ==========================================
  findRewardById(id: string, transactionalManager?: EntityManager) {
    const manager = transactionalManager || this.catalogRepo.manager;
    return manager.findOne(RewardCatalog, { where: { id } });
  }

  findRewardForUpdate(id: string, transactionalManager: EntityManager) {
    return transactionalManager.findOne(RewardCatalog, {
      where: { id },
      lock: { mode: "pessimistic_write" }
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

  // ==========================================
  // CHECK-IN & REFERRAL OPERATIONS
  // ==========================================
  findLatestCheckIn(customerId: string) {
    return this.checkInRepo.findOne({
      where: { customerId },
      order: { checkInDate: "DESC" }
    });
  }

  saveCheckIn(checkIn: DailyCheckIn, transactionalManager?: EntityManager) {
    const manager = transactionalManager || this.checkInRepo.manager;
    return manager.save(DailyCheckIn, checkIn);
  }

  findReferralByFriendId(friendId: string) {
    return this.referralRepo.findOne({ where: { friendId } });
  }

  findReferralByCode(referralCode: string) {
    return this.accountRepo.findOne({ where: { referralCode } });
  }

  saveReferral(referral: Referral, transactionalManager?: EntityManager) {
    const manager = transactionalManager || this.referralRepo.manager;
    return manager.save(Referral, referral);
  }

  // ==========================================
  // ANALYTICS QUERIES
  // ==========================================
  async getAggregatedMetrics(startDate?: Date, endDate?: Date) {
    const qb = this.transactionRepo.createQueryBuilder("tx")
      .select("tx.type", "type")
      .addSelect("SUM(tx.amount)", "totalPoints")
      .addSelect("COUNT(tx.id)", "count");

    if (startDate && endDate) {
      qb.where("tx.createdAt BETWEEN :startDate AND :endDate", { startDate, endDate });
    }

    return qb.groupBy("tx.type").getRawMany();
  }
}