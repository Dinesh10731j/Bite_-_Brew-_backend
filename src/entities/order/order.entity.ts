
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { OrderStatus, OrderPriority, PaymentMethod } from "../../constant/enum.constant";
import { MenuItem } from "../menu/menu.entity";
import { User } from "../user/user.entity";

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ nullable: true })
  userId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "userId" })
  user?: User;

  @Column()
  customerName!: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  totalPrice!: number;

  @Column({ type: "enum", enum: ["DINE_IN", "TAKEAWAY", "DELIVERY"], default: "DINE_IN" })
  orderType!: string;

  @Column({ type: "enum", enum: PaymentMethod, default: PaymentMethod.CASH })
  paymentMethod!: PaymentMethod;

  @Column({ default: "pending" })
  paymentStatus!: string;

  @Index()
  @Column({ type: "enum", enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;

  @Index()
  @Column({ type: "enum", enum: OrderPriority, default: OrderPriority.MEDIUM })
  priority!: OrderPriority;

  @Column({ nullable: true })
  tableNumber?: string;

  @Column({ type: "text", nullable: true })
  deliveryAddress?: string;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  orderItems!: OrderItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity("order_items")
export class OrderItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  quantity!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price!: number;

  @ManyToOne(() => Order, (order) => order.orderItems, { onDelete: "CASCADE" })
  @JoinColumn({ name: "orderId" })
  order!: Order;

  @Index()
  @Column()
  orderId!: string;

  @ManyToOne(() => MenuItem, (menuItem) => menuItem.orderItems, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "menuItemId" })
  menuItem!: MenuItem;

  @Index()
  @Column()
  menuItemId!: string;
}
