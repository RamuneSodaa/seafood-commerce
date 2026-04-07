import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsBoolean()
  supportsPickup: boolean = true;

  @IsBoolean()
  supportsShipping: boolean = true;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  supportsPickup?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsShipping?: boolean;
}
