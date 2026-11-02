import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// "978-0-7352-1129-2" -> "9780735211292"; empty means no ISBN
const isbn = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const cleaned = value.replace(/[\s-]/g, '').toUpperCase();
  return cleaned || undefined;
};

export class BookImageDto {
  // A key returned by POST /media/image-uploads
  @IsString()
  @MaxLength(200)
  key: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  caption?: string;
}

export class CreateBookDto {
  @Transform(trim)
  @IsString()
  @Length(1, 300)
  title: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  subtitle?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one author' })
  @ArrayMaxSize(10)
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? (value as unknown[]).map((v) => (typeof v === 'string' ? v.trim() : v))
      : value,
  )
  @IsString({ each: true })
  @Length(2, 200, { each: true })
  authors: string[];

  @IsOptional()
  @Transform(isbn)
  @Matches(/^(97[89]\d{10}|\d{9}[\dX])$/, {
    message: 'isbn must be a 10 or 13 digit ISBN',
  })
  isbn?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsMongoId({ each: true })
  categoryIds: string[] = [];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  publisher?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(new Date().getFullYear() + 1)
  publicationYear?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(2, 50)
  language?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20000)
  pageCount?: number;

  @IsBoolean()
  rentalEnabled: boolean;

  @IsBoolean()
  saleEnabled: boolean;

  // Prices in kobo (₦1 = 100 kobo)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_00)
  salePriceKobo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_00)
  rentalPriceKobo?: number;

  // The first picture is the cover
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => BookImageDto)
  images: BookImageDto[] = [];

  // Physical copies to add to the inventory now; more can be added later
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  rentalCopies = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(500)
  saleCopies = 0;

  @IsOptional()
  @Transform(trim)
  @Matches(/^[A-Za-z0-9_ -]{2,40}$/, {
    message: 'location may use letters, numbers, spaces, - and _',
  })
  location?: string;
}
