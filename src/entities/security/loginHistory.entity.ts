import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../user/user.entity";
import { LoginStatus } from "../../constant/enum.constant";

@Entity("login_history")
@Index(["userId", "loginTime"])
@Index(["sessionId"])
export class LoginHistory {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "varchar", length: 80, nullable: true })
  sessionId?: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  deviceId?: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  deviceHash?: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  browser?: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  os?: string | null;

  @Column({ type: "varchar", length: 32, nullable: true })
  platform?: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  country?: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  city?: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  ipAddress?: string | null;

  @Column({ type: "enum", enum: LoginStatus, default: LoginStatus.SUCCESS })
  status!: LoginStatus;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  loginTime!: Date;

  @Column({ type: "timestamp", nullable: true })
  logoutTime?: Date | null;

  @Column({ type: "text", nullable: true })
  failureReason?: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
