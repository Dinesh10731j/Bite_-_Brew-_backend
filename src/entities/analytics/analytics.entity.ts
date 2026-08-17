import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../user/user.entity';

@Entity('visit_logs')
export class VisitLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  userId?: string;

  @Column()
  ip!: string;

  @Column({ type: 'varchar', nullable: true })
  country?: string;

  @Column({ type: 'varchar', nullable: true })
  city?: string;

  @Column({ type: 'varchar', nullable: true })
  device?: string;

  @Column({ type: 'varchar', nullable: true })
  browser?: string;

  @Column({ type: 'varchar', nullable: true })
  os?: string;

  @Column({ type: 'varchar', nullable: true })
  referrer?: string;

  @Column({ type: 'varchar', nullable: true })
  sessionId?: string;

  @Column({ default: false })
  bounced!: boolean;

  @Column({ type: 'int', default: 1 })
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
