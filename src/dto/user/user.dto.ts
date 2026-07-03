import { IsEmail, IsString, MinLength, IsNotEmpty, Matches } from 'class-validator';

export class SignUpDTO {
  @IsEmail()
  email!: string;
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).+$/, { message: 'Password must contain uppercase, lowercase, and number' })
  password!: string;
  @IsString()
  @IsNotEmpty()
  name!: string;
}

export class SignInDTO {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}

export class ForgotPasswordDTO {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDTO {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  confirmPassword!: string;
}
