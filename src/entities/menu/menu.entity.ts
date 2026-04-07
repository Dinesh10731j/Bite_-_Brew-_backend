import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { OrderItem } from "../order/order.entity";

@Entity("categories")
export class Category {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ default: true })
  isActive!: boolean;

  @OneToMany(() => MenuItem, (menuItem) => menuItem.category)
  menuItems!: MenuItem[];

  @CreateDateColumn()
  createdAt!: Date;
}

@Entity("menu_items")
export class MenuItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  name!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price!: number;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ nullable: true })
  image?: string;

  @Index()
  @Column({ default: true })
  available!: boolean;

  @Column({ default: false })
  featured!: boolean;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  discount!: number;

  @Column({ default: 0 })
  popularity!: number;

  @ManyToOne(() => Category, (category) => category.menuItems, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "categoryId" })
  category!: Category;

  @Index()
  @Column()
  categoryId!: string;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.menuItem)
  orderItems!: OrderItem[];

  @CreateDateColumn()
  createdAt!: Date;
}
