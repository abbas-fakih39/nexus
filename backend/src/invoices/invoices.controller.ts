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
import { buildInvoiceReceipt } from './invoice-receipt';
import { buildPaymentReceipt } from './invoice-payment-receipt';
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
  async pdf(
    @Param('id') id: string,
    @Res() res: Response,
    @Query('format') format?: string,
  ) {
    const invoice = await this.invoices.findOne(id);
    const settings = await this.invoices.findSettings();
    const isTicket = format === 'receipt' || format === 'payment';

    const suffix = format === 'receipt' ? '-ticket' : format === 'payment' ? '-recu' : '';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.number}${suffix}.pdf"`);

    const doc = isTicket
      ? new PDFDocument({ autoFirstPage: false })
      : new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);
    if (format === 'receipt') buildInvoiceReceipt(doc, invoice, settings);
    else if (format === 'payment') buildPaymentReceipt(doc, invoice, settings);
    else buildInvoicePdf(doc, invoice, settings);
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
