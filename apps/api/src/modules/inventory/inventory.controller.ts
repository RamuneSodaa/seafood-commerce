import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/roles/roles.decorator';
import { RolesGuard } from '../../common/roles/roles.guard';
import { UserRole } from '../../common/roles/role.enum';
import { AdjustInventoryDto, InventoryQueryDto } from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@Controller('admin/inventory')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STORE)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  query(@Query() q: InventoryQueryDto) {
    return this.inventory.query(q);
  }

  @Post('adjust')
  @Roles(UserRole.ADMIN)
  adjust(@Body() dto: AdjustInventoryDto) {
    return this.inventory.adjust(dto);
  }
}
