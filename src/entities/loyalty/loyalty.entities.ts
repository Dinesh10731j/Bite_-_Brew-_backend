import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
export type LoyaltyTransactionType = "EARNING" | "REDEMPTION" | "EXPIRATION" | "ADJUSTMENT";
export type LoyaltyTransactionSource =
  | "ORDER"
  | "REWARD_REDEMPTION"
  | "DAILY_CHECK_IN"
  | "REFERRAL"
  | "ADMIN_ADJUSTMENT"
  | "POINT_EXPIRATION";
export type RewardType = "FREE_COFFEE" | "FREE_CAKE" | "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "FREE_DELIVERY";

@Entity("loyalty_accounts")
export class LoyaltyAccount {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ name: "customer_id", type: "uuid", nullable: false })
  customerId!: string;

  @Column({ name: "current_points", type: "int", default: 0 })
  currentPoints!: number;

  @Column({ name: "lifetime_earned", type: "int", default: 0 })
  lifetimeEarned!: number;

  @Column({ name: "lifetime_redeemed", type: "int", default: 0 })
  lifetimeRedeemed!: number;

  @Column({ name: "expired_points", type: "int", default: 0 })
  expiredPoints!: number;

  @Column({ name: "membership_tier", type: "varchar", length: 30, default: "BRONZE" })
  membershipTier!: LoyaltyTier;

  @Column({
    name: "total_spending",
    type: "numeric",
    precision: 12,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value),
    },
  })
  totalSpending!: number;

  @Index({ unique: true })
  @Column({ name: "referral_code", type: "varchar", length: 20, nullable: false })
  referralCode!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

@Entity("loyalty_transactions")
@Index(["customerId", "sourceType", "sourceId", "type"], {
  unique: true,
  where: "\"source_id\" IS NOT NULL",
})
export class LoyaltyTransaction {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ name: "customer_id", type: "uuid", nullable: false })
  customerId!: string;

  @Column({ type: "int", nullable: false })
  amount!: number;

  @Column({ type: "varchar", length: 30, nullable: false })
  type!: LoyaltyTransactionType;

  @Column({ type: "varchar", length: 255, nullable: false })
  reason!: string;

  @Column({ name: "balance_after", type: "int", nullable: true })
  balanceAfter?: number;

  @Column({ name: "source_type", type: "varchar", length: 40, nullable: true })
  sourceType?: LoyaltyTransactionSource;

  @Column({ name: "source_id", type: "varchar", length: 80, nullable: true })
  sourceId?: string;

  @Column({ type: "jsonb", default: {} })
  metadata!: Record<string, any>;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}

@Entity("reward_catalogs")
export class RewardCatalog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 150, nullable: false })
  title!: string;

  @Column({ type: "varchar", length: 50, default: "FIXED_DISCOUNT" })
  type!: RewardType;

  @Column({ name: "points_required", type: "int", nullable: false })
  pointsRequired!: number;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @Column({ name: "usage_limit", type: "int", nullable: true })
  usageLimit?: number;

  @Column({ name: "inventory_limit", type: "int", nullable: true })
  inventoryLimit?: number;

  @Column({ name: "validity_days", type: "int", nullable: true })
  validityDays?: number;

  @Column({ name: "expiry_date", type: "timestamp with time zone", nullable: true })
  expiryDate?: Date;

  @Column({ type: "jsonb", default: {} })
  metadata!: Record<string, any>;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

@Entity("reward_wallets")
@Index(["customerId", "rewardCatalogId"])
export class RewardWallet {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ name: "customer_id", type: "uuid", nullable: false })
  customerId!: string;

  @Column({ name: "reward_catalog_id", type: "uuid", nullable: false })
  rewardCatalogId!: string;

  @ManyToOne(() => RewardCatalog, { onDelete: "CASCADE" })
  @JoinColumn({ name: "reward_catalog_id" })
  rewardCatalog!: RewardCatalog;

  @Column({ name: "is_used", type: "boolean", default: false })
  isUsed!: boolean;

  @Column({ name: "expires_at", type: "timestamp with time zone", nullable: true })
  expiresAt?: Date;

  @Column({ name: "used_at", type: "timestamp with time zone", nullable: true })
  usedAt?: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}

@Entity("daily_check_ins")
@Index(["customerId", "checkInDate"], { unique: true })
export class DailyCheckIn {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "customer_id", type: "uuid", nullable: false })
  customerId!: string;

  @Column({ name: "check_in_date", type: "varchar", length: 10, nullable: false })
  checkInDate!: string;

  @Column({ name: "streak_count", type: "int", default: 1 })
  streakCount!: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}

@Entity("referrals")
export class Referral {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ name: "referrer_id", type: "uuid", nullable: false })
  referrerId!: string;

  @Index({ unique: true })
  @Column({ name: "friend_id", type: "uuid", nullable: false })
  friendId!: string;

  @Column({ type: "varchar", length: 20, default: "PENDING" })
  status!: "PENDING" | "COMPLETED";

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @Column({ name: "completed_at", type: "timestamp with time zone", nullable: true })
  completedAt?: Date;
}
