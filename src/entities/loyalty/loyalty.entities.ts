import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  Index, 
  ManyToOne, 
  JoinColumn 
} from "typeorm";





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
  membershipTier!: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

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
export class LoyaltyTransaction {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ name: "customer_id", type: "uuid", nullable: false })
  customerId!: string;

  @Column({ type: "int", nullable: false })
  amount!: number;

  @Column({ type: "varchar", length: 20, nullable: false })
  type!: "EARNING" | "REDEMPTION" | "EXPIRATION";

  @Column({ type: "varchar", length: 255, nullable: false })
  reason!: string;

  @CreateDateColumn()
  createdAt!: Date;
}

@Entity("reward_catalogs")
export class RewardCatalog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 150, nullable: false })
  title!: string;

  @Column({ type: "varchar", length: 50, default: "FIXED_DISCOUNT" })
  type!: "FREE_COFFEE" | "FREE_CAKE" | "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "FREE_DELIVERY";

  @Column({ type: "int", nullable: false })
  pointsRequired!: number;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  @Column({ type: "int", nullable: true })
  usageLimit?: number;

  @Column({ type: "int", nullable: true })
  inventoryLimit?: number;

  @Column({ type: "int", nullable: true })
  validityDays?: number;

  @Column({ type: "timestamp with time zone", nullable: true })
  expiryDate?: Date;

  @Column({ type: "jsonb", default: {} })
  metadata!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity("reward_wallets")
export class RewardWallet {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ name: "customer_id", type: "uuid", nullable: false })
  customerId!: string;

  @Column({ type: "uuid", nullable: false })
  rewardCatalogId!: string;

  @ManyToOne(() => RewardCatalog, { onDelete: "CASCADE" })
  @JoinColumn({ name: "rewardCatalogId" })
  rewardCatalog!: RewardCatalog;

  @Column({ type: "boolean", default: false })
  isUsed!: boolean;

  @Column({ type: "timestamp with time zone", nullable: true })
  expiresAt?: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  usedAt?: Date;

  @CreateDateColumn()
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
  checkInDate!: string; // Format: YYYY-MM-DD

  @Column({ type: "int", default: 1 })
  streakCount!: number;

  @CreateDateColumn()
  createdAt!: Date;
}

@Entity("referrals")
export class Referral {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid", nullable: false })
  referrerId!: string;

  @Index({ unique: true })
  @Column({ type: "uuid", nullable: false })
  friendId!: string;

  @Column({ type: "varchar", length: 20, default: "PENDING" })
  status!: "PENDING" | "COMPLETED";

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  completedAt?: Date;
}