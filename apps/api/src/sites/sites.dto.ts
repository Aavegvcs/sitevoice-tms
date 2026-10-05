import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateSiteDto {
  @IsString()
  @Matches(/^[A-Za-z0-9-]{2,20}$/, { message: 'code must be 2-20 letters, digits or dashes' })
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;
}

export class UpdateSiteDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9-]{2,20}$/, { message: 'code must be 2-20 letters, digits or dashes' })
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
