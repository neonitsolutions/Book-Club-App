import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthUser } from '../auth/jwt-payload';
import { Role } from '../users/role.enum';
import {
  BookPage,
  CatalogService,
  PublicBook,
  PublicCategory,
} from './catalog.service';
import { CreateBookDto } from './dto/create-book.dto';
import { ListBooksDto } from './dto/list-books.dto';

/**
 * The public catalog: guests and members can browse every book, for rent and
 * for sale. Only admins can add books.
 */
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  listCategories(): Promise<PublicCategory[]> {
    return this.catalog.listCategories();
  }

  @Get('books')
  list(@Query() query: ListBooksDto): Promise<BookPage> {
    return this.catalog.list(query);
  }

  @Get('books/:idOrSlug')
  findOne(@Param('idOrSlug') idOrSlug: string): Promise<PublicBook> {
    return this.catalog.findOne(idOrSlug);
  }

  @Post('books')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(
    @Body() dto: CreateBookDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PublicBook> {
    return this.catalog.create(dto, user);
  }
}
