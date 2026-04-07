import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class CreateCategoryDTO {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateMenuItemDTO {
  @IsString()
  name!: string;

  @IsUUID("all")
  categoryId!: string;

  @IsNumber()
  @Min(0)
  price!: number;
}
