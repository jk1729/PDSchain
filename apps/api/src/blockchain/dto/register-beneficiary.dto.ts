import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RegisterBeneficiaryDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  beneficiaryRef!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  districtCode!: string;
}

export class UpdateBeneficiaryStatusDto {
  @IsNotEmpty()
  isActive!: boolean;
}
