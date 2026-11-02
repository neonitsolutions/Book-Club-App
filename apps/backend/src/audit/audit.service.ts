import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { AuthUser } from '../auth/jwt-payload';
import { AuditLog } from './audit-log.schema';

export interface AuditEntry {
  actor?: AuthUser;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId;
  changes?: AuditLog['changes'];
  reason?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private readonly logs: Model<AuditLog>,
  ) {}

  /** Pass the session so the entry is only kept if the change itself is. */
  async record(entry: AuditEntry, session?: ClientSession): Promise<void> {
    await this.logs.create(
      [
        {
          actorId: entry.actor ? new Types.ObjectId(entry.actor.id) : undefined,
          actorRole: entry.actor?.role,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          changes: entry.changes,
          reason: entry.reason,
        },
      ],
      { session },
    );
  }
}
