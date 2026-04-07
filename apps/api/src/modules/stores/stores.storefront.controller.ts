import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Controller('stores')
export class StoresStorefrontController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  listActiveStores() {
    return this.prisma.store.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        address: true
      },
      orderBy: { createdAt: 'asc' }
    });
  }
}
