import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService, Friend, User } from '../database/database.service';

@Injectable()
export class FriendsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async sendFriendRequest(requesterId: string, recipientId: string): Promise<Friend> {
    if (requesterId === recipientId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    const recipient = await this.databaseService.findUserById(recipientId);
    if (!recipient) throw new NotFoundException('User not found');

    const existing = await this.databaseService.findFriendship(requesterId, recipientId);
    if (existing) {
      if (existing.status === 'accepted') {
        throw new BadRequestException('Already friends');
      }
      if (existing.status === 'pending') {
        throw new BadRequestException('Friend request already pending');
      }
      if (existing.status === 'blocked') {
        throw new ForbiddenException('Cannot send request to this user');
      }
      if (existing.status === 'declined') {
        // Allow re-sending after decline
        return (await this.databaseService.updateFriend(existing.id, {
          requesterId,
          recipientId,
          status: 'pending',
        }))!;
      }
    }

    return this.databaseService.createFriend({
      requesterId,
      recipientId,
      status: 'pending',
    });
  }

  async acceptFriendRequest(userId: string, friendshipId: string): Promise<Friend> {
    const friendship = await this.databaseService.findFriendById(friendshipId);
    if (!friendship) throw new NotFoundException('Friend request not found');
    if (friendship.recipientId !== userId) {
      throw new ForbiddenException('Not authorized to accept this request');
    }
    if (friendship.status !== 'pending') {
      throw new BadRequestException('Request is not pending');
    }

    return (await this.databaseService.updateFriend(friendshipId, {
      status: 'accepted',
    }))!;
  }

  async declineFriendRequest(userId: string, friendshipId: string): Promise<Friend> {
    const friendship = await this.databaseService.findFriendById(friendshipId);
    if (!friendship) throw new NotFoundException('Friend request not found');
    if (friendship.recipientId !== userId) {
      throw new ForbiddenException('Not authorized to decline this request');
    }
    if (friendship.status !== 'pending') {
      throw new BadRequestException('Request is not pending');
    }

    return (await this.databaseService.updateFriend(friendshipId, {
      status: 'declined',
    }))!;
  }

  async blockUser(userId: string, targetUserId: string): Promise<Friend> {
    const existing = await this.databaseService.findFriendship(userId, targetUserId);
    if (existing) {
      return (await this.databaseService.updateFriend(existing.id, {
        status: 'blocked',
      }))!;
    }

    return this.databaseService.createFriend({
      requesterId: userId,
      recipientId: targetUserId,
      status: 'blocked',
    });
  }

  async unblockUser(userId: string, targetUserId: string): Promise<boolean> {
    const existing = await this.databaseService.findFriendship(userId, targetUserId);
    if (!existing || existing.status !== 'blocked') {
      throw new NotFoundException('Block not found');
    }
    return this.databaseService.deleteFriend(existing.id);
  }

  async removeFriend(userId: string, friendshipId: string): Promise<boolean> {
    const friendship = await this.databaseService.findFriendById(friendshipId);
    if (!friendship) throw new NotFoundException('Friendship not found');
    if (friendship.requesterId !== userId && friendship.recipientId !== userId) {
      throw new ForbiddenException('Not authorized');
    }
    return this.databaseService.deleteFriend(friendshipId);
  }

  async getFriends(userId: string): Promise<Array<Friend & { user: User }>> {
    const friendships = await this.databaseService.getFriendsForUser(userId);
    const results: Array<Friend & { user: User }> = [];

    for (const f of friendships) {
      const friendUserId = f.requesterId === userId ? f.recipientId : f.requesterId;
      const user = await this.databaseService.findUserById(friendUserId);
      if (user) {
        results.push({ ...f, user });
      }
    }

    return results;
  }

  async getPendingRequests(userId: string): Promise<Array<Friend & { user: User }>> {
    const requests = await this.databaseService.getPendingFriendRequests(userId);
    const results: Array<Friend & { user: User }> = [];

    for (const r of requests) {
      const user = await this.databaseService.findUserById(r.requesterId);
      if (user) {
        results.push({ ...r, user });
      }
    }

    return results;
  }

  async getSentRequests(userId: string): Promise<Array<Friend & { user: User }>> {
    const requests = await this.databaseService.getSentFriendRequests(userId);
    const results: Array<Friend & { user: User }> = [];

    for (const r of requests) {
      const user = await this.databaseService.findUserById(r.recipientId);
      if (user) {
        results.push({ ...r, user });
      }
    }

    return results;
  }

  async getSuggestions(userId: string): Promise<User[]> {
    return this.databaseService.getFriendSuggestions(userId);
  }

  async isFriendWith(userId: string, otherUserId: string): Promise<boolean> {
    const friendship = await this.databaseService.findFriendship(userId, otherUserId);
    return !!friendship && friendship.status === 'accepted';
  }

  async getFriendIds(userId: string): Promise<string[]> {
    const friendships = await this.databaseService.getFriendsForUser(userId);
    return friendships.map(f => f.requesterId === userId ? f.recipientId : f.requesterId);
  }
}
