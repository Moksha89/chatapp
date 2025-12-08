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

  @Get('me/privacy')
  @ApiOperation({ summary: 'Get privacy settings' })
  @ApiResponse({ status: 200, description: 'Privacy settings retrieved' })
  async getPrivacySettings(@CurrentUser() user: CurrentUserData) {
    return this.usersService.getPrivacySettings(user.id);
  }

  @Patch('me/privacy')
  @ApiOperation({ summary: 'Update privacy settings' })
  @ApiResponse({ status: 200, description: 'Privacy settings updated' })
  async updatePrivacySettings(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { readReceiptsEnabled?: boolean; language?: string },
  ) {
    return this.usersService.updatePrivacySettings(user.id, body);
  }

  @Get('me/blocked')
  @ApiOperation({ summary: 'Get blocked users list' })
  @ApiResponse({ status: 200, description: 'Blocked users retrieved' })
  async getBlockedUsers(@CurrentUser() user: CurrentUserData) {
    return this.usersService.getBlockedUsers(user.id);
  }

  @Post('me/block/:userId')
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 200, description: 'User blocked' })
  async blockUser(
    @CurrentUser() user: CurrentUserData,
    @Param('userId') userIdToBlock: string,
  ) {
    return this.usersService.blockUser(user.id, userIdToBlock);
  }

  @Post('me/unblock/:userId')
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiResponse({ status: 200, description: 'User unblocked' })
  async unblockUser(
    @CurrentUser() user: CurrentUserData,
    @Param('userId') userIdToUnblock: string,
  ) {
    return this.usersService.unblockUser(user.id, userIdToUnblock);
  }

  @Post('report/:userId')
  @ApiOperation({ summary: 'Report a user' })
  @ApiResponse({ status: 200, description: 'User reported' })
  async reportUser(
    @CurrentUser() user: CurrentUserData,
    @Param('userId') reportedUserId: string,
    @Body() body: { reason: string; details?: string },
  ) {
    return this.usersService.reportUser(user.id, reportedUserId, body.reason, body.details);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all registered users' })
  @ApiResponse({ status: 200, description: 'All users retrieved' })
  async getAllUsers(@CurrentUser() user: CurrentUserData) {
    const users = await this.usersService.getAllUsers();
    return users
      .filter((u) => u.id !== user.id)
      .map((u) => ({
        id: u.id,
        phoneNumber: u.phoneNumber,
        displayName: u.displayName,
        profilePhoto: u.profilePhoto,
        isBusiness: u.isBusiness,
      }));
  }
}
