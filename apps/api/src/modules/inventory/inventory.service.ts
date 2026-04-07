import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AdjustInventoryDto, InventoryQueryDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  query(q: InventoryQueryDto) {
    return this.prisma.inventory.findMany({
      where: {
        storeId: q.storeId,
        skuId: q.skuId
      },
      include: { store: true, sku: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async adjust(dto: AdjustInventoryDto) {
    return this.prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: { storeId_skuId: { storeId: dto.storeId, skuId: dto.skuId } }
      });
      if (!inventory) throw new NotFoundException('Inventory not found');

      const nextPhysical = inventory.physicalStock + dto.deltaPhysical;
      const nextAvailable = inventory.availableStock + dto.deltaAvailable;
      if (nextPhysical < 0 || nextAvailable < 0) {
        throw new BadRequestException('Negative stock not allowed');
      }

      const updated = await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          physicalStock: nextPhysical,
          availableStock: nextAvailable
        }
      });

      await tx.inventoryLog.create({
        data: {
          inventoryId: inventory.id,
          action: 'MANUAL_ADJUST',
          deltaPhysical: dto.deltaPhysical,
          deltaAvailable: dto.deltaAvailable,
          deltaReserved: 0,
          note: dto.note
        }
      });

      return updated;
    });
  }
}
