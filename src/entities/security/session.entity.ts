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
import { User } from "../user/user.entity";
import { SessionStatus } from "../../constant/enum.constant";

@Entity("sessions")
@Index(["userId", "status"])
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Index()
  @Column({ length: 80 })
  sessionId!: string;

  @Column({ type: "varchar", length: 128, nullable: true })
  refreshTokenHash?: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  deviceHash?: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  deviceId?: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  ipAddress?: string | null;

  @Column({ type: "enum", enum: SessionStatus, default: SessionStatus.ACTIVE })
  status!: SessionStatus;

  @Column({ type: "varchar", length: 128, nullable: true })
  browser?: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  os?: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  platform?: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  screenResolution?: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  timezone?: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  language?: string | null;

  @Column({ type: "text", nullable: true })
  userAgent?: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  country?: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  city?: string | null;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  lastActivityAt!: Date;

  @Column({ type: "timestamp", nullable: true })
  expiresAt?: Date | null;

  @Column({ type: "timestamp", nullable: true })
  revokedAt?: Date | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  revokedReason?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
