import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmStockReturnDto {
  @IsNotEmpty()
  @IsIn(['CONFIRMED', 'REJECTED'])
  status!: 'CONFIRMED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}
