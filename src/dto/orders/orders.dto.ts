import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { PaymentMethod } from "../../constant/enum.constant";

export class OrderItemInputDTO {
  @IsUUID("all")
  menuItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDTO {
  @IsString()
  customerName!: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsArray()
  items!: OrderItemInputDTO[];
}
