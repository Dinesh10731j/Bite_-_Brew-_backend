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

@Entity("refresh_tokens")
@Index(["userId"])
@Index(["tokenId"], { unique: true })
export class RefreshToken {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ length: 80 })
  tokenId!: string;

  @Column({ length: 128 })
  tokenHash!: string;

  @Column({ length: 80, nullable: true })
  sessionId?: string | null;

  @Column({ default: false })
  isRevoked!: boolean;

  @Column({ type: "timestamp", nullable: true })
  revokedAt?: Date | null;

  @Column({ length: 64, nullable: true })
  revokedReason?: string | null;

  @Column({ type: "timestamp" })
  expiresAt!: Date;

  @Column({ type: "timestamp", nullable: true })
  usedAt?: Date | null;

  @Column({ length: 80, nullable: true })
  replacedBy?: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
