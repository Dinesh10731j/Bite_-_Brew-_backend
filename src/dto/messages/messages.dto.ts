import { IsEmail, IsOptional, IsString } from "class-validator";

export class CreateMessageDTO {
  @IsString()
  senderName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  content!: string;
}
