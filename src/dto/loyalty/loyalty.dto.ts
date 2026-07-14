import { 
  IsNotEmpty, 
  IsString, 
  IsUUID, 
  IsNumber, 
  Min, 
  IsIn, 
  IsOptional, 
  IsBoolean, 
  IsInt, 
  IsObject 
} from "class-validator";

export class RedeemRewardDto {
  @IsNotEmpty()
  @IsUUID("4")
  rewardId!: string;
}

export class ClaimReferralDto {
  @IsNotEmpty()
  @IsString()
  referralCode!: string;
}

export class ManualPointsAdjustmentDto {
  @IsNotEmpty()
  @IsUUID("4")
  customerId!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsNotEmpty()
  @IsIn(["GRANT", "DEDUCT"])
  type!: "GRANT" | "DEDUCT";

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateRewardCatalogItemDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsOptional()
  @IsIn(["FREE_COFFEE", "FREE_CAKE", "PERCENTAGE_DISCOUNT", "FIXED_DISCOUNT", "FREE_DELIVERY"])
  type?: "FREE_COFFEE" | "FREE_CAKE" | "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT" | "FREE_DELIVERY";

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  pointsRequired!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  inventoryLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  validityDays?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}