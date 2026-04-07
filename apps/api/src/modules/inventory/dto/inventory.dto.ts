import { IsInt, IsOptional, IsString } from 'class-validator';

export class InventoryQueryDto {
  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsString()
  skuId?: string;
}

export class AdjustInventoryDto {
  @IsString()
  storeId!: string;

  @IsString()
  skuId!: string;

  @IsInt()
  deltaPhysical!: number;

  @IsInt()
  deltaAvailable!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
