import { Module } from '@nestjs/common';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';
import { StoresModule } from './modules/stores/stores.module';

@Module({
  imports: [OrdersModule, ProductsModule, StoresModule, InventoryModule]
})
export class AppModule {}
