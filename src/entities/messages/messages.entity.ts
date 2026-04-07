import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { MessageSource } from "../../constant/enum.constant";

@Entity("messages")
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  senderName!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ type: "text" })
  content!: string;

  @Index()
  @Column({ default: false })
  isRead!: boolean;

  @Column({ type: "enum", enum: MessageSource, default: MessageSource.WEBSITE })
  source!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
