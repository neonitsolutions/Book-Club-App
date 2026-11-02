import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import * as argon2 from '@node-rs/argon2';
import { mkdtemp, readdir, rm } from 'fs/promises';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Connection, Model } from 'mongoose';
import { tmpdir } from 'os';
import { join } from 'path';
import * as request from 'supertest';
import { configureApp } from './../src/app.setup';
import { AuditLog } from './../src/audit/audit-log.schema';
import { Category } from './../src/books/category.schema';
import { BookCopy } from './../src/inventory/book-copy.schema';
import { MailService } from './../src/mail/mail.service';
import { REDIS_CLIENT } from './../src/redis/redis.module';
import { Role } from './../src/users/role.enum';
import { User } from './../src/users/user.schema';

// A real 1x1 PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

type Ticket = {
  key: string;
  url: string;
  headers: Record<string, string>;
};
type BookBody = {
  id: string;
  slug: string;
  title: string;
  authors: string[];
  coverUrl?: string;
  images: { url: string; caption?: string }[];
  categories: { name: string }[];
  availability: {
    rentalTotal: number;
    rentalAvailable: number;
    saleAvailable: number;
  };
};
type PageBody = { items: BookBody[]; total: number };

describe('Catalog (e2e)', () => {
  let app: NestExpressApplication;
  let replSet: MongoMemoryReplSet;
  let mediaDir: string;
  let copies: Model<BookCopy>;
  let audit: Model<AuditLog>;
  let fiction: string;
  let adminCookie: string;
  let memberCookie: string;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    mediaDir = await mkdtemp(join(tmpdir(), 'rbc-media-'));
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error';
    process.env.MONGODB_URI = replSet.getUri();
    process.env.REDIS_URL = 'redis://unused:6379';
    process.env.JWT_ACCESS_SECRET =
      'test-secret-that-is-at-least-32-characters';
    process.env.MEDIA_DIR = mediaDir;

    const { AppModule } = await import('./../src/app.module');
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue({ ping: jest.fn(), quit: jest.fn() })
      .overrideProvider(MailService)
      .useValue({ send: jest.fn() })
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();

    const connection = moduleRef.get<Connection>(getConnectionToken());
    for (const model of Object.values(connection.models)) {
      await model.syncIndexes();
    }
    copies = moduleRef.get(getModelToken(BookCopy.name));
    audit = moduleRef.get(getModelToken(AuditLog.name));

    const categories = moduleRef.get<Model<Category>>(
      getModelToken(Category.name),
    );
    fiction = (await categories.create({ name: 'Fiction', slug: 'fiction' }))
      .id as string;

    const users = moduleRef.get<Model<User>>(getModelToken(User.name));
    const passwordHash = await argon2.hash('correct horse battery');
    for (const [email, role] of [
      ['admin@example.com', Role.ADMIN],
      ['member@example.com', Role.MEMBER],
    ] as const) {
      await users.create({
        name: role,
        email,
        passwordHash,
        role,
        emailVerifiedAt: new Date(),
      });
    }
    adminCookie = await signIn('admin@example.com');
    memberCookie = await signIn('member@example.com');
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await replSet?.stop();
    if (mediaDir) await rm(mediaDir, { recursive: true, force: true });
  });

  const http = () => request(app.getHttpServer());

  async function signIn(email: string): Promise<string> {
    const res = await http()
      .post('/api/auth/login')
      .send({ email, password: 'correct horse battery' })
      .expect(200);
    const header = res.headers['set-cookie'] as unknown as string[];
    return header.find((c) => c.startsWith('access_token='))!.split(';')[0];
  }

  /** Does what the admin page does: get a signed link, then upload to it. */
  async function upload(
    bytes: Buffer,
    contentType = 'image/png',
  ): Promise<string> {
    const ticket = (
      await http()
        .post('/api/media/image-uploads')
        .set('Cookie', adminCookie)
        .send({ contentType, sizeBytes: bytes.length })
        .expect(201)
    ).body as Ticket;
    await http().put(ticket.url).set(ticket.headers).send(bytes).expect(204);
    return ticket.key;
  }

  const newBook = (overrides: Record<string, unknown> = {}) => ({
    title: 'Things Fall Apart',
    authors: ['Chinua Achebe'],
    isbn: '978-0-385-47454-2',
    description: 'A classic of African literature.',
    categoryIds: [fiction],
    publicationYear: 1958,
    rentalEnabled: true,
    saleEnabled: true,
    salePriceKobo: 800_000,
    rentalCopies: 2,
    saleCopies: 1,
    ...overrides,
  });

  describe('permissions', () => {
    it('lets only admins add books or upload pictures', async () => {
      await http().post('/api/books').send(newBook()).expect(401);
      await http()
        .post('/api/books')
        .set('Cookie', memberCookie)
        .send(newBook())
        .expect(403);
      await http()
        .post('/api/media/image-uploads')
        .set('Cookie', memberCookie)
        .send({ contentType: 'image/png', sizeBytes: 100 })
        .expect(403);
    });
  });

  describe('adding a book', () => {
    let created: BookBody;

    it('creates the book with its pictures and adds its copies to the inventory', async () => {
      const cover = await upload(PNG);
      const back = await upload(PNG);

      const res = await http()
        .post('/api/books')
        .set('Cookie', adminCookie)
        .send(
          newBook({
            images: [{ key: cover }, { key: back, caption: 'Back cover' }],
          }),
        )
        .expect(201);
      created = res.body as BookBody;

      expect(created).toMatchObject({
        title: 'Things Fall Apart',
        slug: 'things-fall-apart',
        authors: ['Chinua Achebe'],
        categories: [{ name: 'Fiction' }],
        availability: { rentalTotal: 2, rentalAvailable: 2, saleAvailable: 1 },
      });
      expect(created.images).toHaveLength(2);
      expect(created.coverUrl).toBe(created.images[0].url);
      expect(created.images[1].caption).toBe('Back cover');
      for (const image of created.images) {
        expect(image.url).toMatch(/^\/api\/media\/files\/books\/uploads\//);
      }

      const stock = await copies
        .find({ bookId: created.id })
        .sort({ inventoryCode: 1 })
        .lean();
      expect(stock.map((c) => [c.inventoryCode, c.purpose])).toEqual([
        ['RBC-THINGS-0001', 'RENTAL'],
        ['RBC-THINGS-0002', 'RENTAL'],
        ['RBC-THINGS-0003', 'SALE'],
      ]);

      const log = await audit.findOne({ action: 'book.create' }).lean();
      expect(log?.entityId?.toString()).toBe(created.id);
    });

    it('serves the pictures and shows the book by id or slug', async () => {
      const image = await http().get(created.images[0].url).expect(200);
      expect(Buffer.compare(image.body as Buffer, PNG)).toBe(0);

      const byId = await http().get(`/api/books/${created.id}`).expect(200);
      const bySlug = await http()
        .get('/api/books/things-fall-apart')
        .expect(200);
      expect(byId.body).toEqual(bySlug.body);
      await http().get('/api/books/no-such-book').expect(404);
    });

    it('refuses a second book with the same ISBN', async () => {
      await http()
        .post('/api/books')
        .set('Cookie', adminCookie)
        .send(newBook({ rentalCopies: 0, saleCopies: 0 }))
        .expect(409);
    });

    it('checks what is being offered and for how much', async () => {
      const post = (body: Record<string, unknown>) =>
        http().post('/api/books').set('Cookie', adminCookie).send(body);

      await post(newBook({ isbn: undefined, salePriceKobo: undefined })).expect(
        400,
      );
      await post(
        newBook({ isbn: undefined, rentalEnabled: false, saleEnabled: false }),
      ).expect(400);
      await post(
        newBook({ isbn: undefined, saleEnabled: false, saleCopies: 1 }),
      ).expect(400);
      await post(
        newBook({ isbn: undefined, categoryIds: ['6560a1b2c3d4e5f6a7b8c9d0'] }),
      ).expect(400);
      await post(newBook({ isbn: undefined, authors: [] })).expect(400);
    });
  });

  describe('pictures', () => {
    it('only accepts JPEG, PNG and WebP up to 10 MB', async () => {
      const ask = (contentType: string, sizeBytes: number) =>
        http()
          .post('/api/media/image-uploads')
          .set('Cookie', adminCookie)
          .send({ contentType, sizeBytes });

      await ask('image/gif', 100).expect(400);
      await ask('image/svg+xml', 100).expect(400);
      await ask('image/png', 11 * 1024 * 1024).expect(400);
    });

    it('rejects a file that is not really an image, and deletes it', async () => {
      const fake = await upload(Buffer.from('<script>alert(1)</script>'));

      await http()
        .post('/api/books')
        .set('Cookie', adminCookie)
        .send(newBook({ isbn: undefined, images: [{ key: fake }] }))
        .expect(400);

      const left = await readdir(join(mediaDir, 'books/uploads'));
      expect(left).not.toContain(fake.split('/').pop());
    });

    it('rejects uploads that do not match the signed link', async () => {
      const ticket = (
        await http()
          .post('/api/media/image-uploads')
          .set('Cookie', adminCookie)
          .send({ contentType: 'image/png', sizeBytes: PNG.length })
          .expect(201)
      ).body as Ticket;

      // Bigger than signed
      await http()
        .put(ticket.url)
        .set(ticket.headers)
        .send(Buffer.concat([PNG, PNG]))
        .expect(413);
      // Different type than signed
      await http()
        .put(ticket.url)
        .set('Content-Type', 'image/jpeg')
        .send(PNG)
        .expect(400);
      // Tampered signature
      await http()
        .put(ticket.url.replace(/token=[^&]+/, 'token=forged'))
        .set(ticket.headers)
        .send(PNG)
        .expect(400);
    });

    it('does not accept keys it did not issue', async () => {
      await http()
        .post('/api/books')
        .set('Cookie', adminCookie)
        .send(
          newBook({ isbn: undefined, images: [{ key: '../../etc/passwd' }] }),
        )
        .expect(400);
    });
  });

  describe('browsing', () => {
    beforeAll(async () => {
      for (const [title, rentalEnabled, saleEnabled] of [
        ['Rent Only Book', true, false],
        ['Sale Only Book', false, true],
      ] as const) {
        await http()
          .post('/api/books')
          .set('Cookie', adminCookie)
          .send(
            newBook({
              title,
              isbn: undefined,
              rentalEnabled,
              saleEnabled,
              salePriceKobo: saleEnabled ? 500_000 : undefined,
              rentalCopies: rentalEnabled ? 1 : 0,
              saleCopies: saleEnabled ? 1 : 0,
            }),
          )
          .expect(201);
      }
    });

    const titles = (body: unknown) =>
      (body as PageBody).items.map((b) => b.title).sort();

    it('shows guests every book, and the rent and sale lists separately', async () => {
      const all = await http().get('/api/books').expect(200);
      expect(titles(all.body)).toEqual([
        'Rent Only Book',
        'Sale Only Book',
        'Things Fall Apart',
      ]);

      const rent = await http().get('/api/books?purpose=rent').expect(200);
      expect(titles(rent.body)).toEqual([
        'Rent Only Book',
        'Things Fall Apart',
      ]);

      const sale = await http().get('/api/books?purpose=sale').expect(200);
      expect(titles(sale.body)).toEqual([
        'Sale Only Book',
        'Things Fall Apart',
      ]);
    });

    it('searches by title and author, and filters by category', async () => {
      const search = await http().get('/api/books?q=achebe').expect(200);
      expect((search.body as PageBody).total).toBe(3);

      const byTitle = await http().get('/api/books?q=rent').expect(200);
      expect(titles(byTitle.body)).toEqual(['Rent Only Book']);

      const byCategory = await http()
        .get(`/api/books?category=${fiction}`)
        .expect(200);
      expect((byCategory.body as PageBody).total).toBe(3);

      const categories = await http().get('/api/categories').expect(200);
      expect(categories.body).toEqual([
        { id: fiction, name: 'Fiction', slug: 'fiction' },
      ]);
    });

    it('rejects invalid filters', async () => {
      await http().get('/api/books?purpose=steal').expect(400);
      await http().get('/api/books?limit=1000').expect(400);
    });
  });
});
