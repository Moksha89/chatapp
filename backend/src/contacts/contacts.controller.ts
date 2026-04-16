import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { SyncContactsDto } from './dto/sync-contacts.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators';

@ApiTags('Contacts')
@Controller('contacts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'List contacts' })
  @ApiResponse({ status: 200, description: 'Contacts retrieved successfully' })
  async listContacts(@CurrentUser() user: CurrentUserData) {
    return this.contactsService.findByOwnerId(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a contact' })
  @ApiResponse({ status: 201, description: 'Contact created successfully' })
  async createContact(
    @CurrentUser() user: CurrentUserData,
    @Body() createContactDto: CreateContactDto,
  ) {
    return this.contactsService.create(user.id, createContactDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a contact' })
  @ApiResponse({ status: 200, description: 'Contact updated successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async updateContact(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
  ) {
    return this.contactsService.update(id, user.id, updateContactDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a contact' })
  @ApiResponse({ status: 200, description: 'Contact deleted successfully' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async deleteContact(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    await this.contactsService.delete(id, user.id);
    return { message: 'Contact deleted successfully' };
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync contacts from device' })
  @ApiResponse({ status: 200, description: 'Contacts synced successfully' })
  async syncContacts(
    @CurrentUser() user: CurrentUserData,
    @Body() syncContactsDto: SyncContactsDto,
  ) {
    return this.contactsService.syncContacts(user.id, syncContactsDto.contacts);
  }
}
