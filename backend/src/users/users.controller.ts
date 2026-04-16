import { Controller, Get, Put, Body, Query, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getProfile(@Request() req: any) {
    return this.usersService.findById(req.user.id);
  }

  @Put('me')
  async updateProfile(
    @Request() req: any,
    @Body() body: { displayName?: string; profilePhoto?: string; about?: string },
  ) {
    return this.usersService.updateProfile(req.user.id, body);
  }

  @Get('search')
  async search(@Query('phone') phone: string) {
    return this.usersService.searchByPhone(phone);
  }
}
