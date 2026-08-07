import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("devices")
@Index(["deviceHash"], { unique: true })
export class Device {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ length: 128 })
  deviceHash!: string;

  @Column({ length: 128, nullable: true })
  userId?: string | null;

  @Column({ length: 128, nullable: true })
  browser?: string | null;

  @Column({ length: 128, nullable: true })
  os?: string | null;

  @Column({ length: 32, nullable: true })
  platform?: string | null;

  @Column({ length: 32, nullable: true })
  screenResolution?: string | null;

  @Column({ length: 64, nullable: true })
  timezone?: string | null;

  @Column({ length: 32, nullable: true })
  language?: string | null;

  @Column({ type: "text", nullable: true })
  userAgent?: string | null;

  @Column({ default: false })
  isTrusted!: boolean;

  @Column({ default: 0 })
  riskScore!: number;

  @Column({ length: 32, nullable: true })
  riskLevel?: string | null;

  @Column({ type: "timestamp", nullable: true })
  lastSeenAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
