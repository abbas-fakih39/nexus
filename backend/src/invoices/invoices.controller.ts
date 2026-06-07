import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import { InvoiceStatus, InvoiceType } from '@prisma/client';
import { InvoicesService } from './invoices.service';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { buildInvoicePdf } from './invoice-pdf';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private invoices: InvoicesService) {}

  @Get()
  findAll(
    @Query('type') type?: InvoiceType,
    @Query('status') status?: InvoiceStatus,
  ) {
    return this.invoices.findAll({ type, status });
  }

  @Get(':id/pdf')
  async pdf(@Param('id') id: string, @Res() res: Response) {
    const invoice = await this.invoices.findOne(id);
    const settings = await this.invoices.findSettings();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.number}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);
    buildInvoicePdf(doc, invoice, settings);
    doc.end();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoices.findOne(id);
  }

  @Patch(':id/status')
  @Roles('owner')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateInvoiceStatusDto) {
    return this.invoices.updateStatus(id, dto.status);
  }
}
