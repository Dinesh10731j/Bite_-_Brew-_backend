import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { GalleryCategory } from "../../constant/enum.constant";

@Entity("gallery_images")
export class GalleryImage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  url!: string;

  @Index()
  @Column({ type: "enum", enum: GalleryCategory, default: GalleryCategory.FOOD })
  category!: string;

  @Column({ nullable: true })
  tags?: string;

  @Column({ default: false })
  featured!: boolean;

  @Column({ default: 0 })
  orderIndex!: number;

  @CreateDateColumn()
  uploadedAt!: Date;
}
