import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '../database/entities/product.entity';

export interface CreateProductDto {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  imageUrls?: string[];
  category?: string;
  link?: string;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  imageUrls?: string[];
  category?: string;
  isAvailable?: boolean;
  link?: string;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private productRepository: Repository<ProductEntity>,
  ) {}

  async createProduct(userId: string, data: CreateProductDto): Promise<ProductEntity> {
    const product = this.productRepository.create({
      userId,
      name: data.name,
      description: data.description || null,
      price: data.price,
      currency: data.currency || 'USD',
      imageUrls: data.imageUrls || [],
      category: data.category || null,
      isAvailable: true,
      link: data.link || null,
    });
    return this.productRepository.save(product);
  }

  async getProducts(userId: string): Promise<ProductEntity[]> {
    return this.productRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getProductById(id: string, userId: string): Promise<ProductEntity> {
    const product = await this.productRepository.findOne({
      where: { id, userId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async getPublicCatalog(userId: string): Promise<ProductEntity[]> {
    return this.productRepository.find({
      where: { userId, isAvailable: true },
      order: { createdAt: 'DESC' },
    });
  }

  async updateProduct(id: string, userId: string, data: UpdateProductDto): Promise<ProductEntity> {
    const product = await this.getProductById(id, userId);
    
    Object.assign(product, {
      ...data,
      description: data.description !== undefined ? data.description : product.description,
      currency: data.currency !== undefined ? data.currency : product.currency,
      imageUrls: data.imageUrls !== undefined ? data.imageUrls : product.imageUrls,
      category: data.category !== undefined ? data.category : product.category,
      link: data.link !== undefined ? data.link : product.link,
    });
    
    return this.productRepository.save(product);
  }

  async deleteProduct(id: string, userId: string): Promise<void> {
    const product = await this.getProductById(id, userId);
    await this.productRepository.remove(product);
  }

  async toggleAvailability(id: string, userId: string): Promise<ProductEntity> {
    const product = await this.getProductById(id, userId);
    product.isAvailable = !product.isAvailable;
    return this.productRepository.save(product);
  }
}
