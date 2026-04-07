import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from 'class-validator';

enum FulfillmentType {
  STORE_PICKUP = 'STORE_PICKUP',
  SHIPPING = 'SHIPPING'
}

class CreateOrderItemDto {
  @IsString()
  skuId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

class ShippingAddressDto {
  @IsString()
  receiverName!: string;

  @IsString()
  phone!: string;

  @IsString()
  province!: string;

  @IsString()
  city!: string;

  @IsString()
  district!: string;

  @IsString()
  detail!: string;

  @IsOptional()
  @IsString()
  postalCode?: string;
}

export class CreateOrderDto {
  @IsString()
  storeId!: string;

  @IsEnum(FulfillmentType)
  fulfillmentType!: FulfillmentType;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsOptional()
  @IsDateString()
  pickupDate?: string;

  @IsOptional()
  @IsString()
  pickupTimeSlot?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;
}

export class MarkPaidDto {
  @IsString()
  @IsNotEmpty()
  paymentRef!: string;

  @IsInt()
  @Min(0)
  paidAmountCents!: number;
}

export class CompletePickupDto {
  @IsString()
  @IsNotEmpty()
  pickupCode!: string;
}

export class ShipOrderDto {
  @IsString()
  @IsNotEmpty()
  courierCompany!: string;

  @IsString()
  @IsNotEmpty()
  trackingNumber!: string;
}
