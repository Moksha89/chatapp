import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BusinessService } from './business.service';
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators';

@ApiTags('Business')
@Controller('business')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get business profile' })
  @ApiResponse({ status: 200, description: 'Business profile retrieved successfully' })
  async getProfile(@CurrentUser() user: CurrentUserData) {
    const profile = await this.businessService.getProfile(user.id);
    return profile || { businessName: '', description: '', category: '', address: '', businessHours: '', email: '', website: '' };
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update business profile' })
  @ApiResponse({ status: 200, description: 'Business profile updated successfully' })
  async updateProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() updateBusinessProfileDto: UpdateBusinessProfileDto,
  ) {
    return this.businessService.createOrUpdateProfile(user.id, updateBusinessProfileDto);
  }
}
