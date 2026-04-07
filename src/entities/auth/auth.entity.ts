
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../user/user.entity";

@Entity("admin_logs")
export class AdminLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "adminId" })
  admin!: User;

  @Index()
  @Column()
  adminId!: string;

  @Column()
  action!: string;

  @Column({ type: "text", nullable: true })
  details?: string;

  @CreateDateColumn()
  timestamp!: Date;
}

export interface AuthTokenEntity {
  accessToken: string;
  refreshToken: string;
  userId: string;
}
