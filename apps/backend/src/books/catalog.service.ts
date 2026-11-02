import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import {
  ClientSession,
  Connection,
  FilterQuery,
  Model,
  Types,
  isValidObjectId,
} from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/jwt-payload';
import { slugify } from '../common/slugify';
import { CopyPurpose } from '../inventory/book-copy.schema';
import { InventoryService } from '../inventory/inventory.service';
import { MediaStorageService } from '../media/media-storage.service';
import { Author } from './author.schema';
import { Book, BookDocument, BookStatus } from './book.schema';
import { Category } from './category.schema';
import { CreateBookDto } from './dto/create-book.dto';
import { ListBooksDto } from './dto/list-books.dto';
import { MediaAsset, MediaType } from './media-asset.schema';

const DUPLICATE_KEY = 11000;

export interface PublicCategory {
  id: string;
  name: string;
  slug: string;
}

export interface PublicImage {
  url: string;
  caption?: string;
}

/** What the API returns for a book: no storage keys, no internal fields. */
export interface PublicBook {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  authors: string[];
  isbn?: string;
  description?: string;
  categories: PublicCategory[];
  publisher?: string;
  publicationYear?: number;
  language: string;
  pageCount?: number;
  coverUrl?: string;
  images: PublicImage[];
  rentalEnabled: boolean;
  saleEnabled: boolean;
  rentalPriceKobo: number;
  salePriceKobo?: number;
  availability: Book['availability'];
  createdAt: Date;
}

export interface BookPage {
  items: PublicBook[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class CatalogService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Book.name) private readonly books: Model<Book>,
    @InjectModel(Author.name) private readonly authors: Model<Author>,
    @InjectModel(Category.name) private readonly categories: Model<Category>,
    private readonly inventory: InventoryService,
    private readonly media: MediaStorageService,
    private readonly audit: AuditService,
  ) {}

  async listCategories(): Promise<PublicCategory[]> {
    const found = await this.categories
      .find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .exec();
    return found.map((c) => ({
      id: c.id as string,
      name: c.name,
      slug: c.slug,
    }));
  }

  async list(query: ListBooksDto): Promise<BookPage> {
    const filter: FilterQuery<Book> = { status: BookStatus.ACTIVE };
    if (query.purpose === 'rent') filter.rentalEnabled = true;
    if (query.purpose === 'sale') filter.saleEnabled = true;
    if (query.category) filter.categoryIds = new Types.ObjectId(query.category);
    if (query.q) filter.$text = { $search: query.q };

    const find = this.books.find(filter);
    if (query.q) {
      find
        .select({ score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } });
    } else {
      find.sort({ createdAt: -1, _id: -1 });
    }

    const [docs, total] = await Promise.all([
      find
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.books.countDocuments(filter).exec(),
    ]);
    return {
      items: await this.toPublic(docs),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /** By id or by slug, so links can use either. */
  async findOne(idOrSlug: string): Promise<PublicBook> {
    const book = await this.books
      .findOne({
        ...(isValidObjectId(idOrSlug)
          ? { _id: idOrSlug }
          : { slug: idOrSlug.toLowerCase() }),
        status: BookStatus.ACTIVE,
      })
      .exec();
    if (!book) throw new NotFoundException('Book not found');
    const [result] = await this.toPublic([book]);
    return result;
  }

  async create(dto: CreateBookDto, actor: AuthUser): Promise<PublicBook> {
    this.checkOffer(dto);

    // Outside the transaction: these read from storage and may be slow
    const images: MediaAsset[] = [];
    for (const [i, image] of dto.images.entries()) {
      const stored = await this.media.confirmImage(image.key);
      images.push({
        type: MediaType.IMAGE,
        key: stored.key,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        caption: image.caption,
        sortOrder: i,
      });
    }

    try {
      const book = await this.connection.transaction(async (session) => {
        const categoryIds = await this.checkCategories(
          dto.categoryIds,
          session,
        );
        const authors = await this.findOrCreateAuthors(dto.authors, session);

        const [created] = await this.books.create(
          [
            {
              title: dto.title,
              subtitle: dto.subtitle,
              slug: await this.uniqueSlug(dto.title, session),
              authorIds: authors.map((a) => a._id),
              authorNames: authors.map((a) => a.name),
              isbn: dto.isbn,
              description: dto.description,
              categoryIds,
              publisher: dto.publisher,
              publicationYear: dto.publicationYear,
              language: dto.language,
              pageCount: dto.pageCount,
              coverImage: images[0],
              media: images,
              rentalEnabled: dto.rentalEnabled,
              saleEnabled: dto.saleEnabled,
              rentalPriceKobo: dto.rentalPriceKobo ?? 0,
              salePriceKobo: dto.saleEnabled ? dto.salePriceKobo : undefined,
            },
          ],
          { session },
        );

        const copy = {
          location: dto.location,
          currentValueKobo: dto.salePriceKobo,
        };
        if (dto.rentalCopies) {
          await this.inventory.addCopies(
            created._id,
            { ...copy, count: dto.rentalCopies, purpose: CopyPurpose.RENTAL },
            session,
          );
        }
        if (dto.saleCopies) {
          await this.inventory.addCopies(
            created._id,
            { ...copy, count: dto.saleCopies, purpose: CopyPurpose.SALE },
            session,
          );
        }

        await this.audit.record(
          {
            actor,
            action: 'book.create',
            entityType: Book.name,
            entityId: created._id,
            changes: {
              rentalCopies: { from: 0, to: dto.rentalCopies },
              saleCopies: { from: 0, to: dto.saleCopies },
            },
          },
          session,
        );
        return created._id;
      });

      return this.findOne(book.toString());
    } catch (error) {
      if ((error as { code?: number }).code === DUPLICATE_KEY) {
        throw new ConflictException('A book with this ISBN already exists');
      }
      throw error;
    }
  }

  private checkOffer(dto: CreateBookDto): void {
    if (!dto.rentalEnabled && !dto.saleEnabled) {
      throw new BadRequestException(
        'Offer the book for rent, for sale, or both',
      );
    }
    if (dto.saleEnabled && dto.salePriceKobo === undefined) {
      throw new BadRequestException(
        'Set a sale price for books that are for sale',
      );
    }
    if (!dto.rentalEnabled && dto.rentalCopies > 0) {
      throw new BadRequestException(
        'Rental copies need the book to be for rent',
      );
    }
    if (!dto.saleEnabled && dto.saleCopies > 0) {
      throw new BadRequestException('Sale copies need the book to be for sale');
    }
  }

  private async checkCategories(
    ids: string[],
    session: ClientSession,
  ): Promise<Types.ObjectId[]> {
    const unique = [...new Set(ids)];
    const found = await this.categories
      .countDocuments({ _id: { $in: unique } })
      .session(session)
      .exec();
    if (found !== unique.length) {
      throw new BadRequestException('Unknown category');
    }
    return unique.map((id) => new Types.ObjectId(id));
  }

  /** Authors are matched by name, so "Chinua Achebe" is one author everywhere. */
  private async findOrCreateAuthors(names: string[], session: ClientSession) {
    const authors = [];
    for (const name of [...new Set(names)]) {
      const slug = slugify(name);
      if (!slug) throw new BadRequestException(`Invalid author name: ${name}`);
      authors.push(
        await this.authors
          .findOneAndUpdate(
            { slug },
            { $setOnInsert: { name, slug } },
            { upsert: true, new: true, session },
          )
          .exec(),
      );
    }
    return authors;
  }

  private async uniqueSlug(title: string, session: ClientSession) {
    const base = slugify(title) || 'book';
    if (!(await this.books.exists({ slug: base }).session(session)))
      return base;
    return `${base}-${randomBytes(3).toString('hex')}`;
  }

  private async toPublic(docs: BookDocument[]): Promise<PublicBook[]> {
    const categoryIds = [...new Set(docs.flatMap((d) => d.categoryIds))];
    const categories = new Map(
      (await this.categories.find({ _id: { $in: categoryIds } }).exec()).map(
        (c) => [
          c.id as string,
          { id: c.id as string, name: c.name, slug: c.slug },
        ],
      ),
    );

    return docs.map((book) => {
      const images = [...book.media]
        .filter((m) => m.type === MediaType.IMAGE)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((m) => ({ url: this.media.publicUrl(m.key), caption: m.caption }));
      return {
        id: book.id as string,
        slug: book.slug,
        title: book.title,
        subtitle: book.subtitle,
        authors: book.authorNames,
        isbn: book.isbn,
        description: book.description,
        categories: book.categoryIds
          .map((id) => categories.get(id.toString()))
          .filter((c): c is PublicCategory => !!c),
        publisher: book.publisher,
        publicationYear: book.publicationYear,
        language: book.language,
        pageCount: book.pageCount,
        coverUrl: book.coverImage
          ? this.media.publicUrl(book.coverImage.key)
          : images[0]?.url,
        images,
        rentalEnabled: book.rentalEnabled,
        saleEnabled: book.saleEnabled,
        rentalPriceKobo: book.rentalPriceKobo,
        salePriceKobo: book.salePriceKobo,
        availability: book.availability,
        createdAt: book.createdAt,
      };
    });
  }
}
