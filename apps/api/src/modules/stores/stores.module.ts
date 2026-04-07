import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RolesGuard } from '../../common/roles/roles.guard';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';
import { StoresStorefrontController } from './stores.storefront.controller';

@Module({
  controllers: [StoresController, StoresStorefrontController],
  providers: [PrismaService, RolesGuard, StoresService]
})
export class StoresModule {}
