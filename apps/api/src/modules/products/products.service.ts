import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.product.findMany({ include: { skus: true }, orderBy: { createdAt: 'desc' } });
  }

  listPublished() {
    return this.prisma.product.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        name: true,
        description: true,
        supportsPickup: true,
        supportsShipping: true,
        skus: {
          select: {
            id: true,
            code: true,
            name: true,
            priceCents: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getPublishedDetail(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, isPublished: true },
      select: {
        id: true,
        name: true,
        description: true,
        supportsPickup: true,
        supportsShipping: true,
        skus: {
          select: {
            id: true,
            code: true,
            name: true,
            priceCents: true
          }
        }
      }
    });

    if (!product) throw new NotFoundException('Published product not found');
    return product;
  }

  create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,
        supportsPickup: dto.supportsPickup,
        supportsShipping: dto.supportsShipping
      }
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    const exists = await this.prisma.product.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Product not found');
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  async publish(id: string) {
    const exists = await this.prisma.product.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Product not found');
    return this.prisma.product.update({ where: { id }, data: { isPublished: true } });
  }
}
