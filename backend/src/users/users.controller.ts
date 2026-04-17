import { Controller, Get, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@Request() req: any) {
    return this.usersService.findById(req.user.id);
  }

  @Put('me')
  updateProfile(@Request() req: any, @Body() body: { displayName?: string; profilePhoto?: string; about?: string }) {
    return this.usersService.updateProfile(req.user.id, body);
  }

  @Get('search')
  searchUsers(@Request() req: any, @Query('q') query: string) {
    return this.usersService.searchUsers(query || '', req.user.id);
  }

  @Get('all')
  getAllUsers(@Request() req: any) {
    return this.usersService.getAllUsers(req.user.id);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
