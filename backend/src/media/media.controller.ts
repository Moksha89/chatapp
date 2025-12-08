import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a media file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async uploadFile(
    @CurrentUser() user: CurrentUserData,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const media = await this.mediaService.uploadFile(user.id, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    return {
      id: media.id,
      filename: media.filename,
      mimeType: media.mimeType,
      size: media.size,
      url: this.mediaService.getSignedUrl(media.id),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media file' })
  @ApiResponse({ status: 200, description: 'Media file retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  async getMedia(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const { buffer, mimeType, filename } = await this.mediaService.getMediaFile(id);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${filename}"`,
    });

    return new StreamableFile(buffer);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete media file' })
  @ApiResponse({ status: 200, description: 'Media deleted successfully' })
  @ApiResponse({ status: 404, description: 'Media not found' })
  async deleteMedia(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    await this.mediaService.deleteMedia(id, user.id);
    return { message: 'Media deleted successfully' };
  }
}
