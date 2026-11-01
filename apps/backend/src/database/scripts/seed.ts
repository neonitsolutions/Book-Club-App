/**
 * Fills a database with what the app needs to start. Safe to run repeatedly:
 * records are matched by slug or email and never duplicated.
 *
 *   npm run db:seed                 admin user, categories, subscription plans
 *   npm run db:seed -- --sample     ...plus sample authors, books and copies
 *   node dist/database/scripts/seed.js        (inside the container)
 *
 * The admin is created only when SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are
 * set. An existing account with that email is promoted to ADMIN; its password
 * is left alone.
 */
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import * as argon2 from '@node-rs/argon2';
import { Connection, Model } from 'mongoose';
import { Author } from '../../books/author.schema';
import { Book } from '../../books/book.schema';
import { Category } from '../../books/category.schema';
import { nairaToKobo } from '../../common/money';
import { slugify } from '../../common/slugify';
import { BookCopy, CopyPurpose } from '../../inventory/book-copy.schema';
import { InventoryService } from '../../inventory/inventory.service';
import { SubscriptionPlan } from '../../subscriptions/subscription-plan.schema';
import { Role } from '../../users/role.enum';
import { User } from '../../users/user.schema';
import { ScriptModule } from './script.module';

const CATEGORIES = [
  'Fiction',
  'African Literature',
  'Non-fiction',
  'Self-help',
  'Business & Finance',
  'Biography',
  'Children',
];

const PLANS = [
  {
    name: 'Basic Monthly',
    description: 'Two books at a time for 30 days.',
    priceKobo: nairaToKobo(3000),
    durationDays: 30,
    maxActiveRentals: 2,
    rentalPeriodDays: 14,
    maxRenewalsPerRental: 1,
    lateFeePerDayKobo: nairaToKobo(100),
    features: ['2 books at a time', '14-day loans'],
    sortOrder: 1,
  },
  {
    name: 'Standard Monthly',
    description: 'Four books at a time for 30 days.',
    priceKobo: nairaToKobo(5000),
    durationDays: 30,
    maxActiveRentals: 4,
    rentalPeriodDays: 21,
    maxRenewalsPerRental: 2,
    lateFeePerDayKobo: nairaToKobo(100),
    features: ['4 books at a time', '21-day loans', '2 renewals per book'],
    sortOrder: 2,
  },
  {
    name: 'Premium Quarterly',
    description: 'Six books at a time for 90 days.',
    priceKobo: nairaToKobo(12000),
    durationDays: 90,
    maxActiveRentals: 6,
    rentalPeriodDays: 30,
    maxRenewalsPerRental: 3,
    lateFeePerDayKobo: nairaToKobo(50),
    features: ['6 books at a time', '30-day loans', 'Reduced late fees'],
    sortOrder: 3,
  },
];

const SAMPLE_BOOKS = [
  {
    title: 'Atomic Habits',
    author: 'James Clear',
    isbn: '9780735211292',
    publisher: 'Avery',
    publicationYear: 2018,
    categories: ['Non-fiction', 'Self-help'],
    salePrice: 15000,
    rentalCopies: 3,
    saleCopies: 2,
  },
  {
    title: 'Things Fall Apart',
    author: 'Chinua Achebe',
    isbn: '9780385474542',
    publisher: 'Anchor',
    publicationYear: 1958,
    categories: ['Fiction', 'African Literature'],
    salePrice: 8000,
    rentalCopies: 4,
    saleCopies: 3,
  },
  {
    title: 'Half of a Yellow Sun',
    author: 'Chimamanda Ngozi Adichie',
    isbn: '9781400095209',
    publisher: 'Anchor',
    publicationYear: 2006,
    categories: ['Fiction', 'African Literature'],
    salePrice: 12000,
    rentalCopies: 2,
    saleCopies: 1,
  },
  {
    title: 'Purple Hibiscus',
    author: 'Chimamanda Ngozi Adichie',
    isbn: '9781616202415',
    publisher: 'Algonquin Books',
    publicationYear: 2003,
    categories: ['Fiction', 'African Literature'],
    salePrice: 10000,
    rentalCopies: 2,
    saleCopies: 0,
  },
  {
    title: 'Rich Dad Poor Dad',
    author: 'Robert T. Kiyosaki',
    isbn: '9781612680194',
    publisher: 'Plata Publishing',
    publicationYear: 1997,
    categories: ['Non-fiction', 'Business & Finance'],
    salePrice: 9500,
    rentalCopies: 2,
    saleCopies: 2,
  },
];

const logger = new Logger('seed');

/** Inserts the document if nothing with this filter exists; never overwrites. */
async function ensure<T>(
  model: Model<T>,
  filter: Record<string, unknown>,
  doc: Partial<T>,
) {
  const result = await model
    .findOneAndUpdate(
      filter,
      { $setOnInsert: doc },
      { upsert: true, new: true, includeResultMetadata: true },
    )
    .exec();
  return {
    doc: result.value!,
    created: !result.lastErrorObject?.updatedExisting,
  };
}

async function main() {
  const withSample = process.argv.includes('--sample');
  const app = await NestFactory.createApplicationContext(ScriptModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    // Unique indexes must exist before inserting, or a re-run could duplicate
    // records. Only adds indexes; `npm run db:indexes` also removes old ones.
    const connection = app.get<Connection>(getConnectionToken());
    for (const model of Object.values(connection.models)) {
      await model.createCollection();
      await model.createIndexes();
    }

    const users = app.get<Model<User>>(getModelToken(User.name));
    const categories = app.get<Model<Category>>(getModelToken(Category.name));
    const authors = app.get<Model<Author>>(getModelToken(Author.name));
    const books = app.get<Model<Book>>(getModelToken(Book.name));
    const copies = app.get<Model<BookCopy>>(getModelToken(BookCopy.name));
    const plans = app.get<Model<SubscriptionPlan>>(
      getModelToken(SubscriptionPlan.name),
    );
    const inventory = app.get(InventoryService);

    // Admin
    const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (email && password) {
      if (password.length < 12) {
        throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters');
      }
      const existing = await users.findOne({ email }).exec();
      if (existing) {
        await users.updateOne({ _id: existing._id }, { role: Role.ADMIN });
        logger.log(`Admin: ${email} already exists, role set to ADMIN`);
      } else {
        await users.create({
          name: 'Administrator',
          email,
          passwordHash: await argon2.hash(password),
          role: Role.ADMIN,
        });
        logger.log(`Admin: created ${email}`);
      }
    } else {
      logger.warn(
        'Admin: skipped (set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD)',
      );
    }

    // Categories
    const categoryIds = new Map<string, unknown>();
    for (const [i, name] of CATEGORIES.entries()) {
      const { doc } = await ensure(
        categories,
        { slug: slugify(name) },
        { name, slug: slugify(name), sortOrder: i },
      );
      categoryIds.set(name, doc._id);
    }
    logger.log(`Categories: ${CATEGORIES.length} present`);

    // Plans
    for (const plan of PLANS) {
      const { created } = await ensure(
        plans,
        { slug: slugify(plan.name) },
        { ...plan, slug: slugify(plan.name) },
      );
      if (created) logger.log(`Plan: created ${plan.name}`);
    }

    if (!withSample) return;

    // Sample books and copies
    for (const sample of SAMPLE_BOOKS) {
      const { doc: author } = await ensure(
        authors,
        { slug: slugify(sample.author) },
        { name: sample.author, slug: slugify(sample.author) },
      );
      const slug = slugify(sample.title);
      const { doc: book, created } = await ensure(
        books,
        { slug },
        {
          title: sample.title,
          slug,
          isbn: sample.isbn,
          publisher: sample.publisher,
          publicationYear: sample.publicationYear,
          authorIds: [author._id],
          authorNames: [author.name],
          categoryIds: sample.categories.map((name) =>
            categoryIds.get(name),
          ) as Book['categoryIds'],
          rentalEnabled: sample.rentalCopies > 0,
          saleEnabled: sample.saleCopies > 0,
          salePriceKobo: nairaToKobo(sample.salePrice),
        },
      );
      if (!created) continue;

      // Only for books this run created, so re-running adds no copies
      if (!(await copies.exists({ bookId: book._id }))) {
        const value = nairaToKobo(sample.salePrice);
        if (sample.rentalCopies) {
          await inventory.addCopies(book._id, {
            count: sample.rentalCopies,
            purpose: CopyPurpose.RENTAL,
            currentValueKobo: value,
          });
        }
        if (sample.saleCopies) {
          await inventory.addCopies(book._id, {
            count: sample.saleCopies,
            purpose: CopyPurpose.SALE,
            currentValueKobo: value,
          });
        }
      }
      logger.log(
        `Book: created ${sample.title} with ${sample.rentalCopies} rental and ${sample.saleCopies} sale copies`,
      );
    }
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
