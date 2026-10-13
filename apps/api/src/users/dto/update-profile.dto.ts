import { IsNotEmpty, IsString, Length } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty({ message: 'Full name cannot be empty' })
  @Length(2, 120, { message: 'Full name must be between 2 and 120 characters' })
  fullName!: string;
}
