import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private products: ProductsService) {}

  @Get()
  findAll() {
    return this.products.findAll();
  }

  // Doit être déclaré avant ':id' pour ne pas être capté comme un id.
  @Get('low-stock')
  findLowStock() {
    return this.products.findLowStock();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.products.findOne(id);
  }

  @Post()
  @Roles('owner')
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Patch(':id')
  @Roles('owner')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  @Roles('owner')
  remove(@Param('id') id: string) {
    return this.products.remove(id);
  }
}
