import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from './audit-log.schema';
import { AuditService } from './audit.service';

const models = MongooseModule.forFeature([
  { name: AuditLog.name, schema: AuditLogSchema },
]);

@Module({
  imports: [models],
  providers: [AuditService],
  exports: [models, AuditService],
})
export class AuditModule {}
