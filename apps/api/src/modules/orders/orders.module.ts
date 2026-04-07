import { Module } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { RolesGuard } from '../../common/roles/roles.guard';
import { OrdersController } from './orders.controller';
import { OrderRepository } from './order.repository';
import { OrderWorkflowService } from './order-workflow.service';

@Module({
  controllers: [OrdersController],
  providers: [PrismaService, RolesGuard, OrderRepository, OrderWorkflowService]
})
export class OrdersModule {}
