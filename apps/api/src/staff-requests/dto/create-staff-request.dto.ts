import { IsIn, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
import { CanonicalRole } from '@prisma/client';

export class CreateStaffRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Requested role is required' })
  @IsIn(
    [CanonicalRole.FPS_OPERATOR, CanonicalRole.WAREHOUSE_MANAGER, CanonicalRole.DISTRICT_OFFICER],
    {
      message: 'Requested role must be one of FPS_OPERATOR, WAREHOUSE_MANAGER, or DISTRICT_OFFICER',
    },
  )
  requestedRole!: CanonicalRole;

  @IsString()
  @IsNotEmpty({ message: 'District code is required' })
  @Length(2, 32, { message: 'District code must be between 2 and 32 characters' })
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'District code may only contain alphanumeric characters, hyphens, and underscores',
  })
  districtCode!: string;

  @IsOptional()
  @IsString()
  @Length(2, 32, { message: 'Warehouse code must be between 2 and 32 characters' })
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'Warehouse code may only contain alphanumeric characters, hyphens, and underscores',
  })
  warehouseCode?: string;

  @IsOptional()
  @IsString()
  @Length(2, 32, { message: 'Shop code must be between 2 and 32 characters' })
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'Shop code may only contain alphanumeric characters, hyphens, and underscores',
  })
  shopCode?: string;

  @IsString()
  @IsNotEmpty({ message: 'Justification is required' })
  @Length(15, 1000, { message: 'Justification must be between 15 and 1000 characters' })
  justification!: string;
}
