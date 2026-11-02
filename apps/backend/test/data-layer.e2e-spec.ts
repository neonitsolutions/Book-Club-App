import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Connection, Model, Types } from 'mongoose';
import { Book } from './../src/books/book.schema';
import { ALL_MODELS } from './../src/database/models';
import {
  BookCopy,
  CopyPurpose,
  CopyStatus,
  ReservationKind,
} from './../src/inventory/book-copy.schema';
import {
  InventoryService,
  inventoryPrefix,
} from './../src/inventory/inventory.service';
import {
  FulfilmentMethod,
  Order,
  OrderStatus,
} from './../src/orders/order.schema';
import { PaymentEvent } from './../src/payments/payment-event.schema';
import { PaymentProvider } from './../src/payments/payment.schema';
import { REDIS_CLIENT } from './../src/redis/redis.module';
import { Rental, RentalStatus } from './../src/rentals/rental.schema';
import {
  Membership,
  MembershipStatus,
} from './../src/subscriptions/membership.schema';
import { MembershipsService } from './../src/subscriptions/memberships.service';

const DUPLICATE_KEY = 11000;
const DAY = 24 * 3600 * 1000;

describe('Data layer (e2e)', () => {
  let moduleRef: TestingModule;
  let replSet: MongoMemoryReplSet;
  let connection: Connection;
  let books: Model<Book>;
  let copies: Model<BookCopy>;
  let rentals: Model<Rental>;
  let memberships: Model<Membership>;
  let orders: Model<Order>;
  let paymentEvents: Model<PaymentEvent>;
  let inventory: InventoryService;
  let membershipsService: MembershipsService;

  beforeAll(async () => {
    // Transactions need a replica set, as in production (Atlas)
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error';
    process.env.MONGODB_URI = replSet.getUri();
    process.env.REDIS_URL = 'redis://unused:6379';
    process.env.JWT_ACCESS_SECRET =
      'test-secret-that-is-at-least-32-characters';

    const { AppModule } = await import('./../src/app.module');
    moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(REDIS_CLIENT)
      .useValue({ ping: jest.fn(), quit: jest.fn() })
      .compile();
    await moduleRef.init();

    connection = moduleRef.get(getConnectionToken());
    books = moduleRef.get(getModelToken(Book.name));
    copies = moduleRef.get(getModelToken(BookCopy.name));
    rentals = moduleRef.get(getModelToken(Rental.name));
    memberships = moduleRef.get(getModelToken(Membership.name));
    orders = moduleRef.get(getModelToken(Order.name));
    paymentEvents = moduleRef.get(getModelToken(PaymentEvent.name));
    inventory = moduleRef.get(InventoryService);
    membershipsService = moduleRef.get(MembershipsService);

    // Unique indexes enforce most of what is tested below. This also fails
    // if MongoDB rejects any index definition (e.g. a partial filter).
    for (const model of Object.values(connection.models)) {
      await model.syncIndexes();
    }
  }, 120_000);

  afterAll(async () => {
    await moduleRef?.close();
    await replSet?.stop();
  });

  const newBook = (title: string) =>
    books.create({
      title,
      slug: `${title.toLowerCase().replace(/\W+/g, '-')}-${new Types.ObjectId().toString()}`,
      rentalEnabled: true,
    });

  const holder = (refId = new Types.ObjectId()) => ({
    kind: ReservationKind.RENTAL,
    refId,
    userId: new Types.ObjectId(),
    expiresAt: new Date(Date.now() + DAY),
  });

  it('stores every reference as a real ObjectId, not as "Mixed"', () => {
    // `type: Types.ObjectId` silently makes a field Mixed: queries with a
    // string id then match nothing. Schemas must use Schema.Types.ObjectId.
    const mixedRefs: string[] = [];
    for (const { name, schema } of ALL_MODELS) {
      schema.eachPath((path, type) => {
        const options = type.options as { ref?: unknown; type?: unknown };
        const caster = (type as unknown as { caster?: { instance: string } })
          .caster;
        const instance = caster?.instance ?? type.instance;
        // Gateway ids like providerTransactionId are strings on purpose
        const wrong =
          (!!options.ref && instance !== 'ObjectId') ||
          (/Ids?$/.test(path) && instance === 'Mixed');
        if (wrong) {
          mixedRefs.push(`${name}.${path} is ${instance}`);
        }
      });
    }
    expect(mixedRefs).toEqual([]);
  });

  it('registers every model in ALL_MODELS, which the scripts rely on', () => {
    const registered = Object.keys(connection.models).sort();
    expect(registered).toEqual(ALL_MODELS.map((m) => m.name).sort());
  });

  describe('inventory', () => {
    it('derives readable inventory prefixes from titles', () => {
      expect(inventoryPrefix('Atomic Habits')).toBe('RBC-ATOMIC');
      expect(inventoryPrefix('The Alchemist')).toBe('RBC-ALCHEMIST');
      expect(inventoryPrefix('Ọmọ Ọba')).toBe('RBC-OMO');
    });

    it('gives each copy its own code and hidden QR token, and updates the catalog counts', async () => {
      const book = await newBook('Atomic Habits');
      await inventory.addCopies(book._id, {
        count: 3,
        purpose: CopyPurpose.RENTAL,
      });
      await inventory.addCopies(book._id, {
        count: 2,
        purpose: CopyPurpose.SALE,
      });

      const listed = await copies
        .find({ bookId: book._id })
        .sort({ inventoryCode: 1 })
        .lean();
      expect(listed.map((c) => c.inventoryCode)).toEqual([
        'RBC-ATOMIC-0001',
        'RBC-ATOMIC-0002',
        'RBC-ATOMIC-0003',
        'RBC-ATOMIC-0004',
        'RBC-ATOMIC-0005',
      ]);
      expect(listed[0]).not.toHaveProperty('qrToken');
      expect(listed[0]).toMatchObject({
        status: CopyStatus.AVAILABLE,
        location: 'MAIN_LIBRARY',
      });

      const withTokens = await copies
        .find({ bookId: book._id })
        .select('+qrToken')
        .lean();
      expect(new Set(withTokens.map((c) => c.qrToken)).size).toBe(5);

      const refreshed = await books.findById(book._id).lean();
      expect(refreshed?.availability).toEqual({
        rentalTotal: 3,
        rentalAvailable: 3,
        saleAvailable: 2,
      });
    });

    it('never hands out the same code when copies are added at the same moment', async () => {
      const [a, b] = await Promise.all([
        newBook('Sequence Test One'),
        newBook('Sequence Test Two'),
      ]);
      await Promise.all(
        [a, b, a, b].map((book) =>
          inventory.addCopies(book._id, {
            count: 5,
            purpose: CopyPurpose.RENTAL,
          }),
        ),
      );

      const codes = await copies
        .find({ inventoryCode: /^RBC-SEQUENCE-/ })
        .distinct('inventoryCode');
      expect(codes).toHaveLength(20);
    });

    it('finds a copy by QR token or by a typed inventory code', async () => {
      const book = await newBook('Scan Lookup');
      const [copy] = await inventory.addCopies(book._id, {
        count: 1,
        purpose: CopyPurpose.RENTAL,
      });
      const { qrToken } = (await copies
        .findById(copy._id)
        .select('+qrToken')
        .lean())!;

      expect((await inventory.findByScan(qrToken))?.id).toBe(copy.id);
      expect(
        (await inventory.findByScan(` ${copy.inventoryCode.toLowerCase()} `))
          ?.id,
      ).toBe(copy.id);
      expect(await inventory.findByScan('RBC-NOPE-9999')).toBeNull();
    });

    it('gives the last copy to exactly one of several simultaneous requests', async () => {
      const book = await newBook('Last Copy');
      await inventory.addCopies(book._id, {
        count: 1,
        purpose: CopyPurpose.RENTAL,
      });

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          inventory.reserveAvailableCopy(
            book._id,
            CopyPurpose.RENTAL,
            holder(),
          ),
        ),
      );
      expect(results.filter(Boolean)).toHaveLength(1);

      const refreshed = await books.findById(book._id).lean();
      expect(refreshed?.availability.rentalAvailable).toBe(0);
      expect(refreshed?.availability.rentalTotal).toBe(1);
    });

    it('does not reserve sale copies for rentals', async () => {
      const book = await newBook('Sale Only');
      await inventory.addCopies(book._id, {
        count: 2,
        purpose: CopyPurpose.SALE,
      });
      expect(
        await inventory.reserveAvailableCopy(
          book._id,
          CopyPurpose.RENTAL,
          holder(),
        ),
      ).toBeNull();
    });

    it('lets only the reservation holder release a copy', async () => {
      const book = await newBook('Release Test');
      await inventory.addCopies(book._id, {
        count: 1,
        purpose: CopyPurpose.RENTAL,
      });
      const refId = new Types.ObjectId();
      const copy = await inventory.reserveAvailableCopy(
        book._id,
        CopyPurpose.RENTAL,
        holder(refId),
      );

      expect(
        await inventory.releaseReservation(copy!._id, new Types.ObjectId()),
      ).toBe(false);
      expect(await inventory.releaseReservation(copy!._id, refId)).toBe(true);

      const released = await copies.findById(copy!._id).lean();
      expect(released?.status).toBe(CopyStatus.AVAILABLE);
      expect(released?.reservation).toBeUndefined();
      const refreshed = await books.findById(book._id).lean();
      expect(refreshed?.availability.rentalAvailable).toBe(1);
    });

    it('rolls back every step when a later step in the transaction fails', async () => {
      const book = await newBook('Rollback Test');
      await inventory.addCopies(book._id, {
        count: 1,
        purpose: CopyPurpose.RENTAL,
      });

      await expect(
        connection.transaction(async (session) => {
          await inventory.reserveAvailableCopy(
            book._id,
            CopyPurpose.RENTAL,
            holder(),
            session,
          );
          throw new Error('payment provider unreachable');
        }),
      ).rejects.toThrow('payment provider unreachable');

      const [copy] = await copies.find({ bookId: book._id }).lean();
      expect(copy.status).toBe(CopyStatus.AVAILABLE);
      const refreshed = await books.findById(book._id).lean();
      expect(refreshed?.availability.rentalAvailable).toBe(1);
    });
  });

  describe('rentals', () => {
    const openRental = (copyId: Types.ObjectId, status = RentalStatus.ACTIVE) =>
      rentals.create({
        userId: new Types.ObjectId(),
        membershipId: new Types.ObjectId(),
        bookId: new Types.ObjectId(),
        copyId,
        bookTitle: 'Any',
        inventoryCode: 'RBC-ANY-0001',
        status,
        reservedAt: new Date(),
        reservationExpiresAt: new Date(Date.now() + DAY),
      });

    it('refuses a second open rental for the same copy', async () => {
      const copyId = new Types.ObjectId();
      const first = await openRental(copyId);

      await expect(
        openRental(copyId, RentalStatus.RESERVED),
      ).rejects.toMatchObject({ code: DUPLICATE_KEY });

      // Once returned, the copy can be rented again
      first.status = RentalStatus.RETURNED;
      await first.save();
      await expect(openRental(copyId)).resolves.toBeDefined();
    });
  });

  describe('memberships', () => {
    const liveMembership = (overrides: Partial<Membership> = {}) =>
      memberships.create({
        userId: new Types.ObjectId(),
        planId: new Types.ObjectId(),
        status: MembershipStatus.ACTIVE,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 30 * DAY),
        terms: {
          name: 'Standard',
          priceKobo: 500_000,
          durationDays: 30,
          maxActiveRentals: 3,
          rentalPeriodDays: 14,
          maxRenewalsPerRental: 1,
          lateFeePerDayKobo: 10_000,
        },
        ...overrides,
      });

    it('allows only one live membership per member', async () => {
      const first = await liveMembership();
      await expect(
        liveMembership({ userId: first.userId }),
      ).rejects.toMatchObject({ code: DUPLICATE_KEY });

      // Past memberships do not count
      await expect(
        liveMembership({
          userId: first.userId,
          status: MembershipStatus.EXPIRED,
        }),
      ).resolves.toBeDefined();
    });

    it('never goes past the plan limit, even with simultaneous requests', async () => {
      const m = await liveMembership();
      const claims = await Promise.all(
        Array.from({ length: 6 }, () =>
          membershipsService.claimRentalSlot(m._id, m.userId),
        ),
      );
      expect(claims.filter(Boolean)).toHaveLength(3);

      // Returning a book frees a slot
      await membershipsService.releaseRentalSlot(m._id);
      expect(await membershipsService.claimRentalSlot(m._id, m.userId)).toBe(
        true,
      );
    });

    it('enforces the per-period rental limit when the plan has one', async () => {
      const base = await liveMembership();
      const m = await liveMembership({
        userId: new Types.ObjectId(),
        terms: { ...base.terms, maxRentalsPerPeriod: 2 },
      });

      expect(await membershipsService.claimRentalSlot(m._id, m.userId)).toBe(
        true,
      );
      await membershipsService.releaseRentalSlot(m._id);
      expect(await membershipsService.claimRentalSlot(m._id, m.userId)).toBe(
        true,
      );
      await membershipsService.releaseRentalSlot(m._id);
      // Two books borrowed this period, though none are out now
      expect(await membershipsService.claimRentalSlot(m._id, m.userId)).toBe(
        false,
      );
    });

    it('refuses rentals on expired memberships and for other members', async () => {
      const lapsed = await liveMembership({
        endsAt: new Date(Date.now() - 1000),
      });
      expect(
        await membershipsService.claimRentalSlot(lapsed._id, lapsed.userId),
      ).toBe(false);
      expect(await membershipsService.findLive(lapsed.userId)).toBeNull();

      const m = await liveMembership();
      expect(
        await membershipsService.claimRentalSlot(m._id, new Types.ObjectId()),
      ).toBe(false);
    });
  });

  describe('validation', () => {
    it('requires a sale price on books that are for sale', async () => {
      await expect(
        books.create({
          title: 'No Price',
          slug: 'no-price',
          saleEnabled: true,
        }),
      ).rejects.toThrow(/salePriceKobo is required/);
    });

    it('rejects fractional kobo', async () => {
      await expect(
        books.create({
          title: 'Fraction',
          slug: 'fraction',
          saleEnabled: true,
          salePriceKobo: 1500.5,
        }),
      ).rejects.toThrow(/whole number of kobo/);
    });

    it('rejects orders whose totals do not add up', async () => {
      const item = {
        bookId: new Types.ObjectId(),
        copyId: new Types.ObjectId(),
        title: 'Atomic Habits',
        inventoryCode: 'RBC-ATOMIC-0004',
        unitPriceKobo: 1_500_000,
      };
      const order = {
        orderNumber: 'RBC-ORD-000001',
        userId: new Types.ObjectId(),
        items: [item],
        subtotalKobo: 1_500_000,
        deliveryFeeKobo: 200_000,
        totalKobo: 1_700_000,
        fulfilmentMethod: FulfilmentMethod.PICKUP,
        reservationExpiresAt: new Date(Date.now() + DAY),
      };

      await expect(orders.create({ ...order, totalKobo: 100 })).rejects.toThrow(
        /totalKobo/,
      );
      await expect(
        orders.create({
          ...order,
          fulfilmentMethod: FulfilmentMethod.DELIVERY,
        }),
      ).rejects.toThrow(/deliveryAddress/);
      await expect(orders.create({ ...order, items: [] })).rejects.toThrow(
        /at least one item/,
      );

      const created = await orders.create(order);
      expect(created.status).toBe(OrderStatus.PENDING_PAYMENT);
    });

    it('stores each gateway webhook event only once', async () => {
      const event = {
        provider: PaymentProvider.PAYSTACK,
        eventId: 'evt_123',
        type: 'charge.success',
        payload: { reference: 'RBC-PAY-1' },
      };
      await paymentEvents.create(event);
      await expect(paymentEvents.create(event)).rejects.toMatchObject({
        code: DUPLICATE_KEY,
      });
    });
  });
});
