import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "../user/user.entity";

@Entity("visit_logs")
export class VisitLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "userId" })
  user?: User;

  @Index()
  @Column({ nullable: true })
  userId?: string;

  @Column()
  ip!: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  device?: string;

  @Column({ nullable: true })
  browser?: string;

  @Column({ nullable: true })
  os?: string;

  @Column({ nullable: true })
  referrer?: string;

  @Column({ nullable: true })
  sessionId?: string;

  @Column({ default: false })
  bounced!: boolean;

  @Column({ type: "int", default: 1 })
  pageViews!: number;

  @Index()
  @CreateDateColumn()
  visitedAt!: Date;
}

export interface AnalyticsOverviewEntity {
  orders: number;
  visits: number;
  revenue: number;
}
