import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RolesGuard } from '../../common/roles/roles.guard';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsStorefrontController } from './products.storefront.controller';

@Module({
  controllers: [ProductsController, ProductsStorefrontController],
  providers: [PrismaService, RolesGuard, ProductsService]
})
export class ProductsModule {}
