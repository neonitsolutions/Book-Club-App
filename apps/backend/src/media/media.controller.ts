import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, Max, Min } from 'class-validator';
import { Request, Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../users/role.enum';
import {
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MediaStorageService,
  UploadTicket,
} from './media-storage.service';

class ImageUploadDto {
  @IsIn(Object.keys(IMAGE_TYPES))
  contentType: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_IMAGE_BYTES)
  sizeBytes: number;
}

@Controller('media')
export class MediaController {
  constructor(private readonly storage: MediaStorageService) {}

  /** A signed link the admin's browser uploads one picture to. */
  @Post('image-uploads')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  createImageUpload(@Body() dto: ImageUploadDto): Promise<UploadTicket> {
    return this.storage.createImageUpload(dto.contentType, dto.sizeBytes);
  }

  // ---- Local storage only; in AWS these are S3 and the CDN ----------------

  @Put('local-uploads/:name')
  @HttpCode(HttpStatus.NO_CONTENT)
  async localUpload(
    @Param('name') name: string,
    @Query() query: { size?: string; expires?: string; token?: string },
    @Req() req: Request,
  ): Promise<void> {
    this.requireLocal();
    await this.storage.saveLocalUpload(
      name,
      query,
      req.get('content-type'),
      req.get('content-length'),
      req,
    );
  }

  @Get('files/books/uploads/:name')
  localFile(@Param('name') name: string, @Res() res: Response): void {
    this.requireLocal();
    res.sendFile(this.storage.localPath(`books/uploads/${name}`), {
      maxAge: '365d',
      immutable: true,
    });
  }

  private requireLocal(): void {
    if (!this.storage.usesLocalStorage) throw new NotFoundException();
  }
}
