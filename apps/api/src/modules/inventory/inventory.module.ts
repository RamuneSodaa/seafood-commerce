import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RolesGuard } from '../../common/roles/roles.guard';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  controllers: [InventoryController],
  providers: [PrismaService, RolesGuard, InventoryService]
})
export class InventoryModule {}
