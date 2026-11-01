import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { Book } from '../books/book.schema';
import { slugify } from '../common/slugify';
import { SequenceService } from '../database/sequence.service';
import { inTransaction } from '../database/transaction';
import {
  BookCopy,
  BookCopyDocument,
  CopyCondition,
  CopyPurpose,
  CopyReservation,
  CopyStatus,
} from './book-copy.schema';

export interface NewCopies {
  count: number;
  purpose: CopyPurpose;
  location?: string;
  condition?: CopyCondition;
  acquisitionDate?: Date;
  purchasePriceKobo?: number;
  currentValueKobo?: number;
}

// Copies that still exist in the library, in any state
const OUT_OF_CIRCULATION = [
  CopyStatus.SOLD,
  CopyStatus.LOST,
  CopyStatus.RETIRED,
];

const SKIPPED_WORDS = new Set(['the', 'a', 'an', 'of']);

/** "Atomic Habits" -> "RBC-ATOMIC", "The Alchemist" -> "RBC-ALCHEMIST" */
export function inventoryPrefix(title: string): string {
  const words = slugify(title).split('-').filter(Boolean);
  const word = words.find((w) => !SKIPPED_WORDS.has(w)) ?? words[0] ?? 'BOOK';
  return `RBC-${word.slice(0, 10).toUpperCase()}`;
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(BookCopy.name) private readonly copies: Model<BookCopy>,
    @InjectModel(Book.name) private readonly books: Model<Book>,
    private readonly sequences: SequenceService,
  ) {}

  /** Adds physical copies of a book, each with its own code and QR token. */
  addCopies(
    bookId: string | Types.ObjectId,
    input: NewCopies,
    session?: ClientSession,
  ): Promise<BookCopyDocument[]> {
    return inTransaction(this.connection, session, async (s) => {
      const book = await this.books.findById(bookId).session(s).exec();
      if (!book) throw new NotFoundException('Book not found');

      const prefix = inventoryPrefix(book.title);
      const first = await this.sequences.next(`copy:${prefix}`, input.count, s);
      const docs = Array.from({ length: input.count }, (_, i) => ({
        bookId: book._id,
        inventoryCode: `${prefix}-${String(first + i).padStart(4, '0')}`,
        qrToken: randomBytes(16).toString('base64url'),
        purpose: input.purpose,
        location: input.location,
        condition: input.condition,
        acquisitionDate: input.acquisitionDate,
        purchasePriceKobo: input.purchasePriceKobo,
        currentValueKobo: input.currentValueKobo,
      }));

      const created = await this.copies.insertMany(docs, { session: s });
      await this.refreshAvailability(book._id, s);
      return created;
    });
  }

  /**
   * Holds one free copy of the book for a rental or order. A single atomic
   * update picks the copy, so two members asking for the last copy at once
   * cannot both get it. Returns null when no copy is free.
   */
  reserveAvailableCopy(
    bookId: string | Types.ObjectId,
    purpose: CopyPurpose,
    reservation: Omit<CopyReservation, 'reservedAt'>,
    session?: ClientSession,
  ): Promise<BookCopyDocument | null> {
    return inTransaction(this.connection, session, async (s) => {
      const copy = await this.copies
        .findOneAndUpdate(
          { bookId, purpose, status: CopyStatus.AVAILABLE },
          {
            $set: {
              status: CopyStatus.RESERVED,
              reservation: { ...reservation, reservedAt: new Date() },
            },
          },
          // Least-used copy first, so wear is spread across copies
          { sort: { timesRented: 1, _id: 1 }, new: true, session: s },
        )
        .exec();
      if (copy) await this.refreshAvailability(copy.bookId, s);
      return copy;
    });
  }

  /** Puts a reserved copy back on the shelf. Only the holder can release it. */
  releaseReservation(
    copyId: string | Types.ObjectId,
    refId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<boolean> {
    return inTransaction(this.connection, session, async (s) => {
      const copy = await this.copies
        .findOneAndUpdate(
          {
            _id: copyId,
            status: CopyStatus.RESERVED,
            'reservation.refId': refId,
          },
          {
            $set: { status: CopyStatus.AVAILABLE },
            $unset: { reservation: 1 },
          },
          { new: true, session: s },
        )
        .exec();
      if (copy) await this.refreshAvailability(copy.bookId, s);
      return !!copy;
    });
  }

  /**
   * Finds the copy for a scanned QR code (the qrToken) or a typed inventory
   * code. Includes the qrToken field so the caller can tell which one it was.
   */
  findByScan(value: string): Promise<BookCopyDocument | null> {
    const trimmed = value.trim();
    return this.copies
      .findOne({
        $or: [{ qrToken: trimmed }, { inventoryCode: trimmed.toUpperCase() }],
      })
      .select('+qrToken')
      .exec();
  }

  /**
   * Recounts a book's copies into book.availability, which the catalog reads.
   * Called in the same transaction as every copy status change, so the
   * catalog never shows a book as available after its last copy is gone.
   */
  async refreshAvailability(
    bookId: Types.ObjectId,
    session?: ClientSession,
  ): Promise<void> {
    const counts = await this.copies
      .aggregate<{
        _id: { purpose: CopyPurpose; status: CopyStatus };
        n: number;
      }>([
        { $match: { bookId } },
        {
          $group: {
            _id: { purpose: '$purpose', status: '$status' },
            n: { $sum: 1 },
          },
        },
      ])
      .session(session ?? null)
      .exec();

    const count = (purpose: CopyPurpose, match: (s: CopyStatus) => boolean) =>
      counts
        .filter((c) => c._id.purpose === purpose && match(c._id.status))
        .reduce((sum, c) => sum + c.n, 0);

    await this.books
      .updateOne(
        { _id: bookId },
        {
          $set: {
            availability: {
              rentalTotal: count(
                CopyPurpose.RENTAL,
                (s) => !OUT_OF_CIRCULATION.includes(s),
              ),
              rentalAvailable: count(
                CopyPurpose.RENTAL,
                (s) => s === CopyStatus.AVAILABLE,
              ),
              saleAvailable: count(
                CopyPurpose.SALE,
                (s) => s === CopyStatus.AVAILABLE,
              ),
            },
          },
        },
        { session },
      )
      .exec();
  }
}
