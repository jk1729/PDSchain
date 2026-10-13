import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDistrictDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  code!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  state?: string;
}
