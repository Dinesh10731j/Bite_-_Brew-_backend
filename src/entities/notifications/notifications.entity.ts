import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { NotificationPriority, NotificationType } from "../../constant/enum.constant";
import { User } from "../user/user.entity";

@Entity("notifications")
export class Notification {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "text" })
    content!: string;

    @Column({ type: "enum", enum: NotificationType, default: NotificationType.SYSTEM })
    type!: string;

    @Column({ type: "enum", enum: NotificationPriority, default: NotificationPriority.LOW })
    priority!: string;

    @Index()
    @Column({ default: false })
    isRead!: boolean;

    @Column({ nullable: true })
    actionLink?: string;

    @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "userId" })
    user?: User;

    @Index()
    @Column({ nullable: true })
    userId?: string;

    @CreateDateColumn()
    createdAt!: Date;
}
