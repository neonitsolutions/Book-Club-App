/**
 * Makes MongoDB's indexes match the schemas: creates missing ones, drops ones
 * no schema declares. Run after deploying schema changes:
 *
 *   npm run db:indexes                  (local, reads .env)
 *   npm run db:indexes -- --dry-run     (show the changes only)
 *   node dist/database/scripts/sync-indexes.js   (inside the container)
 *
 * Unique indexes are what stop double rentals and duplicate payments, so a
 * build that fails here (e.g. existing duplicate ISBNs) must be fixed, not
 * ignored.
 */
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ALL_MODELS } from '../models';
import { ScriptModule } from './script.module';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const logger = new Logger('sync-indexes');
  const app = await NestFactory.createApplicationContext(ScriptModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const connection = app.get<Connection>(getConnectionToken());
    for (const { name, schema } of ALL_MODELS) {
      const model = connection.models[name] ?? connection.model(name, schema);
      await model.createCollection();
      const { toCreate, toDrop } = await model.diffIndexes();
      if (!toCreate.length && !toDrop.length) continue;

      const created = toCreate.map((spec) => JSON.stringify(spec));
      logger.log(
        `${name}: create [${created.join(', ')}] drop [${toDrop.join(', ')}]`,
      );
      if (!dryRun) await model.syncIndexes();
    }
    logger.log(dryRun ? 'Dry run, nothing changed' : 'Indexes in sync');
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
