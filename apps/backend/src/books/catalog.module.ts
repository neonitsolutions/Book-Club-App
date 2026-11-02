import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { InventoryModule } from '../inventory/inventory.module';
import { MediaModule } from '../media/media.module';
import { BooksModule } from './books.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

// Separate from BooksModule (models only), which InventoryModule imports
@Module({
  imports: [BooksModule, InventoryModule, MediaModule, AuditModule],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
