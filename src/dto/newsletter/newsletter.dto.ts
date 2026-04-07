import { IsEmail, IsString } from "class-validator";

export class NewsletterSubscribeDTO {
  @IsEmail()
  email!: string;
}

export class NewsletterStatusDTO {
  @IsString()
  status!: string;
}
