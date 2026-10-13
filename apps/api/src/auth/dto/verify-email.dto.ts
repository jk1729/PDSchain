import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty({ message: 'Verification token is required' })
  @Matches(/^[0-9a-fA-F]{32,128}$/, {
    message: 'Verification token format is invalid',
  })
  token!: string;
}
