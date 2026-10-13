import { IsInt, IsNotEmpty, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator';

export class SetEntitlementDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  beneficiaryRef!: string;

  @IsNotEmpty()
  @IsInt()
  @Min(202001)
  @Max(209912)
  period!: number; // e.g. 202610

  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  commodityId!: string;

  @IsNotEmpty()
  @IsPositive()
  @IsInt()
  allocatedQuantity!: number;
}
