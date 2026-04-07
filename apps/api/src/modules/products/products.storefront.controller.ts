import { Controller, Get, Param } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsStorefrontController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  listPublished() {
    return this.products.listPublished();
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.products.getPublishedDetail(id);
  }
}
