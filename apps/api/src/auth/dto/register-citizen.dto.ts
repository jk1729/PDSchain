import { IsBoolean, IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class RegisterCitizenDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @Length(2, 120, { message: 'Full name must be between 2 and 120 characters' })
  fullName!: string;

  @IsEmail({}, { message: 'A valid email address is required' })
  @IsNotEmpty({ message: 'Email address is required' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @Length(10, 100, { message: 'Password must be at least 10 characters long' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/, {
    message:
      'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'Confirm password is required' })
  confirmPassword!: string;

  @IsBoolean({ message: 'Terms and privacy notice acceptance must be a boolean' })
  acceptTerms!: boolean;
}
