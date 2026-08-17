import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditAction } from '../../constant/enum.constant';

@Entity('audit_logs')
@Index(['userId', 'createdAt'])
@Index(['action', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 80, nullable: true })
  userId?: string | null;

  @Column({ type: 'enum', enum: AuditAction })
  action!: AuditAction;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress?: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  sessionId?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  deviceHash?: string | null;

  @Index()
  @Column({ type: 'varchar', length: 64, nullable: true })
  requestId?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'boolean', default: false })
  isHighRisk!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
