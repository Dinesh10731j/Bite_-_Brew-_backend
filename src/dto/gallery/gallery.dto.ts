import { IsBoolean, IsEnum, IsOptional, IsString, IsUrl } from "class-validator";
import { GalleryCategory } from "../../constant/enum.constant";

export class CreateGalleryDTO {
  @IsUrl()
  url!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsEnum(GalleryCategory)
  category?: GalleryCategory;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}
