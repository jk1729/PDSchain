import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReconcileQueryDto {
  @IsNotEmpty()
  @IsIn(['WAREHOUSE', 'FPS'])
  locationType!: 'WAREHOUSE' | 'FPS';

  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  locationCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  commodityCode?: string;
}
