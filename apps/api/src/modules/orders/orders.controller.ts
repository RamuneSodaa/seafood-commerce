import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/roles/roles.decorator';
import { UserRole } from '../../common/roles/role.enum';
import { RolesGuard } from '../../common/roles/roles.guard';
import { CreateOrderDto, CompletePickupDto, MarkPaidDto, ShipOrderDto } from './dto/order-workflow.dto';
import { OrderWorkflowService } from './order-workflow.service';

@Controller('orders')
@UseGuards(RolesGuard)
export class OrdersController {
  constructor(private readonly workflow: OrderWorkflowService) {}

  @Post()
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  createOrder(@Headers('x-user-id') userId: string, @Body() dto: CreateOrderDto) {
    return this.workflow.createOrder(userId || 'anonymous-user', dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STORE, UserRole.CUSTOMER)
  listOrders() {
    return this.workflow.listOrders();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STORE, UserRole.CUSTOMER)
  getOrder(@Param('id') id: string) {
    return this.workflow.getOrder(id);
  }

  @Get(':id/status-logs')
  @Roles(UserRole.ADMIN, UserRole.STORE)
  getStatusLogs(@Param('id') id: string) {
    return this.workflow.getOrderStatusLogs(id);
  }

  @Post(':id/mark-paid')
  @Roles(UserRole.ADMIN, UserRole.CUSTOMER)
  markPaid(@Param('id') id: string, @Body() body: MarkPaidDto) {
    return this.workflow.markPaid(id, body.paymentRef, body.paidAmountCents);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.CUSTOMER)
  cancel(@Param('id') id: string) {
    return this.workflow.cancelOrder(id);
  }

  @Post(':id/ready-for-pickup')
  @Roles(UserRole.ADMIN, UserRole.STORE)
  readyForPickup(@Param('id') id: string) {
    return this.workflow.markReadyForPickup(id);
  }

  @Post(':id/complete-pickup')
  @Roles(UserRole.ADMIN, UserRole.STORE)
  completePickup(@Param('id') id: string, @Body() body: CompletePickupDto) {
    return this.workflow.completePickup(id, body.pickupCode);
  }

  @Post(':id/ship')
  @Roles(UserRole.ADMIN, UserRole.STORE)
  ship(@Param('id') id: string, @Body() body: ShipOrderDto) {
    return this.workflow.shipOrder(id, body.courierCompany, body.trackingNumber);
  }

  @Post(':id/deliver')
  @Roles(UserRole.ADMIN, UserRole.STORE)
  deliver(@Param('id') id: string) {
    return this.workflow.markDelivered(id);
  }
}
