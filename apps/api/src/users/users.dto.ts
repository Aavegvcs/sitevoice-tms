import { IsArray, IsBoolean, IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  @MaxLength(100)
  password!: string;

  @IsUUID()
  roleId!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  siteIds?: string[];
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  siteIds?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Setting a password resets it and signs the user out everywhere.
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  @MaxLength(100)
  password?: string;
}
