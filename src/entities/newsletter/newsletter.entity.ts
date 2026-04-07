import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("newsletter_subscribers")
export class NewsletterSubscriber {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column({ unique: true })
  email!: string;

  @Column({ default: "active" })
  status!: string;

  @CreateDateColumn()
  subscribedAt!: Date;
}
