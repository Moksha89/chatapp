import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService, CreateProductDto, UpdateProductDto } from './products.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators';

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  async createProduct(
    @CurrentUser() user: CurrentUserData,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.createProduct(user.id, createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async getProducts(@CurrentUser() user: CurrentUserData) {
    return this.productsService.getProducts(user.id);
  }

  @Get('catalog/:userId')
  @ApiOperation({ summary: 'Get public catalog for a user' })
  @ApiResponse({ status: 200, description: 'Catalog retrieved successfully' })
  async getPublicCatalog(@Param('userId') userId: string) {
    return this.productsService.getPublicCatalog(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  async getProduct(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.productsService.getProductById(id, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  async updateProduct(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(id, user.id, updateProductDto);
  }

  @Post(':id/toggle-availability')
  @ApiOperation({ summary: 'Toggle product availability' })
  @ApiResponse({ status: 200, description: 'Product availability toggled' })
  async toggleAvailability(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.productsService.toggleAvailability(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  async deleteProduct(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    await this.productsService.deleteProduct(id, user.id);
    return { message: 'Product deleted' };
  }
}
