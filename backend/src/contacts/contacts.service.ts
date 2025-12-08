import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, Contact } from '../database/database.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(ownerId: string, data: CreateContactDto): Promise<Contact> {
    const contactUser = this.databaseService.findUserByPhone(data.phoneNumber);

    return this.databaseService.createContact({
      ownerId,
      contactUserId: contactUser?.id || null,
      name: data.name,
      phoneNumber: data.phoneNumber,
      email: data.email || null,
      notes: data.notes || null,
      lastContactDate: null,
    });
  }

  async findById(id: string): Promise<Contact | undefined> {
    return this.databaseService.findContactById(id);
  }

  async findByOwnerId(ownerId: string): Promise<Contact[]> {
    return this.databaseService.findContactsByOwnerId(ownerId);
  }

  async update(id: string, ownerId: string, data: UpdateContactDto): Promise<Contact> {
    const contact = await this.findById(id);
    if (!contact || contact.ownerId !== ownerId) {
      throw new NotFoundException('Contact not found');
    }

    const updated = this.databaseService.updateContact(id, {
      name: data.name,
      email: data.email,
      notes: data.notes,
      lastContactDate: data.lastContactDate ? new Date(data.lastContactDate) : undefined,
    });

    if (!updated) {
      throw new NotFoundException('Contact not found');
    }

    return updated;
  }

  async delete(id: string, ownerId: string): Promise<void> {
    const contact = await this.findById(id);
    if (!contact || contact.ownerId !== ownerId) {
      throw new NotFoundException('Contact not found');
    }

    this.databaseService.deleteContact(id);
  }

  async syncContacts(
    ownerId: string,
    contacts: Array<{ name: string; phoneNumber: string }>,
  ): Promise<Contact[]> {
    const results: Contact[] = [];

    for (const contactData of contacts) {
      const existing = (await this.findByOwnerId(ownerId)).find(
        (c) => c.phoneNumber === contactData.phoneNumber,
      );

      if (existing) {
        const updated = await this.update(existing.id, ownerId, {
          name: contactData.name,
        });
        results.push(updated);
      } else {
        const created = await this.create(ownerId, contactData);
        results.push(created);
      }
    }

    return results;
  }
}
