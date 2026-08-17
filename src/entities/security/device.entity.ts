import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('devices')
@Index(['deviceHash'], { unique: true })
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'varchar', length: 128 })
  deviceHash!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  userId?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  browser?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  os?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  platform?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  screenResolution?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  timezone?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  language?: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent?: string | null;

  @Column({ type: 'boolean', default: false })
  isTrusted!: boolean;

  @Column({ type: 'int', default: 0 })
  riskScore!: number;

  @Column({ type: 'varchar', length: 32, nullable: true })
  riskLevel?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
