import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Password reset token is required' })
  @Matches(/^[0-9a-fA-F]{32,128}$/, {
    message: 'Password reset token format is invalid',
  })
  token!: string;

  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @Length(10, 100, { message: 'New password must be at least 10 characters long' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/, {
    message:
      'Password must include at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword!: string;

  @IsString()
  @IsNotEmpty({ message: 'Confirm password is required' })
  confirmPassword!: string;
}
