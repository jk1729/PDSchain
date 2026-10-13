import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class ApproveStaffRequestDto {
  @IsOptional()
  @IsString()
  @Length(0, 500, { message: 'Approval notes must not exceed 500 characters' })
  notes?: string;
}

export class RejectStaffRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'A rejection reason is required' })
  @Length(5, 500, { message: 'Rejection reason must be between 5 and 500 characters' })
  reason!: string;
}

export class SuspendUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Suspension reason is required' })
  @Length(5, 500, { message: 'Suspension reason must be between 5 and 500 characters' })
  reason!: string;
}

export class RevokeRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'Revocation reason is required' })
  @Length(5, 500, { message: 'Revocation reason must be between 5 and 500 characters' })
  reason!: string;
}
