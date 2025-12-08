import { Controller, Get, Put, Body, UseGuards, ForbiddenException } from '@nestjs/common';
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
    if (!user.isBusiness) {
      throw new ForbiddenException('Only business accounts can access this endpoint');
    }

    const profile = await this.businessService.getProfile(user.id);
    return profile || { message: 'No business profile found' };
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update business profile' })
  @ApiResponse({ status: 200, description: 'Business profile updated successfully' })
  async updateProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() updateBusinessProfileDto: UpdateBusinessProfileDto,
  ) {
    if (!user.isBusiness) {
      throw new ForbiddenException('Only business accounts can access this endpoint');
    }

    return this.businessService.createOrUpdateProfile(user.id, updateBusinessProfileDto);
  }
}
