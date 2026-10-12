import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class DiagnosticPingDto {
  @IsString()
  @IsNotEmpty({ message: 'clientName must not be empty' })
  @MaxLength(64, { message: 'clientName must not exceed 64 characters' })
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'clientName may only contain alphanumeric characters, dots, underscores, and hyphens',
  })
  clientName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'note must not exceed 200 characters' })
  note?: string;
}
