import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';

export class RegisterCommodityDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  @Matches(/^[A-Z0-9_:-]+$/, {
    message: 'commodityId must be uppercase alphanumeric and can include colons or hyphens',
  })
  commodityId!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  unit!: string;
}
