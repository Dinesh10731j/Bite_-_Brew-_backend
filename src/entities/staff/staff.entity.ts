import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";

@Entity("staff")
@Unique(["email"])
export class Staff {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ length: 120 })
  name!: string;

  @Index()
  @Column({ length: 180 })
  email!: string;

  @Column({ length: 255, nullable: true })
  image?: string;

  @Column({ length: 80 })
  role!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
