import { IsInt, IsNotEmpty, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator';

export class RecordDistributionDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  fpsId!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  beneficiaryRef!: string;

  @IsNotEmpty()
  @IsInt()
  @Min(202001)
  @Max(209912)
  period!: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  commodityId!: string;

  @IsNotEmpty()
  @IsPositive()
  @IsInt()
  quantity!: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(128)
  claimRef!: string;
}
