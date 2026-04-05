import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators';

@ApiTags('Friends')
@Controller('friends')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  @ApiOperation({ summary: 'Get friends list' })
  @ApiResponse({ status: 200, description: 'Friends list retrieved' })
  async getFriends(@CurrentUser() user: CurrentUserData) {
    return this.friendsService.getFriends(user.id);
  }

  @Post('request')
  @ApiOperation({ summary: 'Send friend request' })
  @ApiResponse({ status: 201, description: 'Friend request sent' })
  async sendRequest(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { userId: string },
  ) {
    return this.friendsService.sendFriendRequest(user.id, body.userId);
  }

  @Get('requests/pending')
  @ApiOperation({ summary: 'Get pending friend requests' })
  @ApiResponse({ status: 200, description: 'Pending requests retrieved' })
  async getPendingRequests(@CurrentUser() user: CurrentUserData) {
    return this.friendsService.getPendingRequests(user.id);
  }

  @Get('requests/sent')
  @ApiOperation({ summary: 'Get sent friend requests' })
  @ApiResponse({ status: 200, description: 'Sent requests retrieved' })
  async getSentRequests(@CurrentUser() user: CurrentUserData) {
    return this.friendsService.getSentRequests(user.id);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept friend request' })
  @ApiResponse({ status: 200, description: 'Friend request accepted' })
  async acceptRequest(
    @CurrentUser() user: CurrentUserData,
    @Param('id') friendshipId: string,
  ) {
    return this.friendsService.acceptFriendRequest(user.id, friendshipId);
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline friend request' })
  @ApiResponse({ status: 200, description: 'Friend request declined' })
  async declineRequest(
    @CurrentUser() user: CurrentUserData,
    @Param('id') friendshipId: string,
  ) {
    return this.friendsService.declineFriendRequest(user.id, friendshipId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove friend' })
  @ApiResponse({ status: 200, description: 'Friend removed' })
  async removeFriend(
    @CurrentUser() user: CurrentUserData,
    @Param('id') friendshipId: string,
  ) {
    await this.friendsService.removeFriend(user.id, friendshipId);
    return { message: 'Friend removed' };
  }

  @Post('block')
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 200, description: 'User blocked' })
  async blockUser(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { userId: string },
  ) {
    return this.friendsService.blockUser(user.id, body.userId);
  }

  @Post('unblock')
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiResponse({ status: 200, description: 'User unblocked' })
  async unblockUser(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { userId: string },
  ) {
    await this.friendsService.unblockUser(user.id, body.userId);
    return { message: 'User unblocked' };
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get friend suggestions' })
  @ApiResponse({ status: 200, description: 'Suggestions retrieved' })
  async getSuggestions(@CurrentUser() user: CurrentUserData) {
    return this.friendsService.getSuggestions(user.id);
  }
}
