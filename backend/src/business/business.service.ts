import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, BusinessProfile } from '../database/database.service';
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';

@Injectable()
export class BusinessService {
  constructor(private readonly databaseService: DatabaseService) {}

  async getProfile(userId: string): Promise<BusinessProfile | null> {
    const profile = this.databaseService.findBusinessProfileByUserId(userId);
    return profile || null;
  }

  async createOrUpdateProfile(
    userId: string,
    data: UpdateBusinessProfileDto,
  ): Promise<BusinessProfile> {
    const existing = this.databaseService.findBusinessProfileByUserId(userId);

    if (existing) {
      const updated = this.databaseService.updateBusinessProfile(existing.id, {
        businessName: data.businessName,
        description: data.description,
        category: data.category,
        address: data.address,
        businessHours: data.businessHours,
        email: data.email,
        website: data.website,
      });

      if (!updated) {
        throw new NotFoundException('Business profile not found');
      }

      return updated;
    }

    return this.databaseService.createBusinessProfile({
      userId,
      businessName: data.businessName || '',
      description: data.description || null,
      category: data.category || null,
      address: data.address || null,
      businessHours: data.businessHours || null,
      email: data.email || null,
      website: data.website || null,
    });
  }
}
