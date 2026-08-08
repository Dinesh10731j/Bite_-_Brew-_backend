import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import { RegistrationStatus } from "../../constant/enum.constant";

@Entity("registration_attempts")
@Index(["ipAddress", "createdAt"])
@Index(["deviceHash", "createdAt"])
export class RegistrationAttempt {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "varchar", length: 64 })
  ipAddress!: string;

  @Column({ type: "varchar", length: 128, nullable: true })
  deviceHash?: string | null;

  @Column({ type: "varchar", length: 180, nullable: true })
  email?: string | null;

  @Column({ type: "text", nullable: true })
  userAgent?: string | null;

  @Column({ type: "enum", enum: RegistrationStatus, default: RegistrationStatus.ALLOWED })
  status!: RegistrationStatus;

  @Column({ type: "text", nullable: true })
  reason?: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  country?: string | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  city?: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
