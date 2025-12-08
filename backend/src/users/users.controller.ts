import { Controller, Get, Patch, Body, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SearchUserDto } from './dto/search-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getMe(@CurrentUser() user: CurrentUserData) {
    const fullUser = await this.usersService.findById(user.id);
    if (!fullUser) {
      return null;
    }
    return {
      id: fullUser.id,
      phoneNumber: fullUser.phoneNumber,
      displayName: fullUser.displayName,
      profilePhoto: fullUser.profilePhoto,
      status: fullUser.status,
      isBusiness: fullUser.isBusiness,
      lastSeen: fullUser.lastSeen,
    };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'User profile updated successfully' })
  async updateMe(
    @CurrentUser() user: CurrentUserData,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const updated = await this.usersService.update(user.id, updateUserDto);
    return {
      id: updated.id,
      phoneNumber: updated.phoneNumber,
      displayName: updated.displayName,
      profilePhoto: updated.profilePhoto,
      status: updated.status,
      isBusiness: updated.isBusiness,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(@Param('id') id: string) {
    return this.usersService.getPublicProfile(id);
  }

  @Post('search')
  @ApiOperation({ summary: 'Search users by phone number' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchUsers(@Body() searchUserDto: SearchUserDto) {
    const users = await this.usersService.searchByPhone(searchUserDto.phoneNumber);
    return users.map((u) => ({
      id: u.id,
      phoneNumber: u.phoneNumber,
      displayName: u.displayName,
      profilePhoto: u.profilePhoto,
      isBusiness: u.isBusiness,
    }));
  }
}
