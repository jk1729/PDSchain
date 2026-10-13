import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDistrictDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  state?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
