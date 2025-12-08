import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DatabaseService } from './database/database.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const databaseService = app.get(DatabaseService);

  console.log('Seeding database with demo users...');

  const user1 = await databaseService.createUser({
    phoneNumber: '+1234567890',
    displayName: 'Alice Demo',
    passwordHash: 'demo-hash-1',
    isBusiness: false,
    status: 'Hey there! I am using WhatsApp Business Chat',
    profilePhoto: null,
    lastSeen: new Date(),
  });

  const user2 = await databaseService.createUser({
    phoneNumber: '+0987654321',
    displayName: 'Bob Business',
    passwordHash: 'demo-hash-2',
    isBusiness: true,
    status: 'Available for business inquiries',
    profilePhoto: null,
    lastSeen: new Date(),
  });

  console.log('Created demo users:');
  console.log(`  - Alice Demo (${user1.phoneNumber}) - ID: ${user1.id}`);
  console.log(`  - Bob Business (${user2.phoneNumber}) - ID: ${user2.id}`);

  const device1 = await databaseService.createDevice({
    userId: user1.id,
    deviceId: 'alice-device-1',
    deviceName: 'Alice Phone',
    deviceType: 'android',
    isPrimary: true,
    lastSeen: new Date(),
    identityPublicKey: null,
    signedPrekeyPublic: null,
    signedPrekeySignature: null,
    isActive: true,
  });

  const device2 = await databaseService.createDevice({
    userId: user2.id,
    deviceId: 'bob-device-1',
    deviceName: 'Bob Phone',
    deviceType: 'android',
    isPrimary: true,
    lastSeen: new Date(),
    identityPublicKey: null,
    signedPrekeyPublic: null,
    signedPrekeySignature: null,
    isActive: true,
  });

  console.log('Created demo devices:');
  console.log(`  - Alice Phone - ID: ${device1.id}`);
  console.log(`  - Bob Phone - ID: ${device2.id}`);

  await databaseService.createBusinessProfile({
    userId: user2.id,
    businessName: 'Bob\'s Business',
    description: 'A demo business for testing',
    category: 'Technology',
    address: '123 Demo Street',
    businessHours: 'Mon-Fri 9am-5pm',
    email: 'bob@business.demo',
    website: 'https://bob-business.demo',
  });

  console.log('Created business profile for Bob Business');

  const chat = await databaseService.createChat({
    type: 'direct',
    name: null,
    description: null,
    iconUrl: null,
    createdBy: user1.id,
  });

  await databaseService.createChatParticipant({
    chatId: chat.id,
    userId: user1.id,
    role: 'member',
    joinedAt: new Date(),
    lastReadAt: new Date(),
  });

  await databaseService.createChatParticipant({
    chatId: chat.id,
    userId: user2.id,
    role: 'member',
    joinedAt: new Date(),
    lastReadAt: new Date(),
  });

  console.log(`Created demo chat between Alice and Bob - ID: ${chat.id}`);

  const message1 = await databaseService.createMessage({
    chatId: chat.id,
    senderId: user1.id,
    senderDeviceId: device1.deviceId,
    content: 'Hi Bob! How is your business doing?',
    ciphertext: null,
    type: 'text',
    status: 'read',
    deliveredAt: new Date(),
    readAt: new Date(),
  });

  const message2 = await databaseService.createMessage({
    chatId: chat.id,
    senderId: user2.id,
    senderDeviceId: device2.deviceId,
    content: 'Hey Alice! Business is great, thanks for asking!',
    ciphertext: null,
    type: 'text',
    status: 'read',
    deliveredAt: new Date(),
    readAt: new Date(),
  });

  const message3 = await databaseService.createMessage({
    chatId: chat.id,
    senderId: user1.id,
    senderDeviceId: device1.deviceId,
    content: 'That\'s wonderful to hear! Let me know if you need any help.',
    ciphertext: null,
    type: 'text',
    status: 'delivered',
    deliveredAt: new Date(),
    readAt: null,
  });

  console.log('Created demo messages:');
  console.log(`  - Message 1: ${message1.id}`);
  console.log(`  - Message 2: ${message2.id}`);
  console.log(`  - Message 3: ${message3.id}`);

  const label1 = await databaseService.createLabel({
    userId: user2.id,
    name: 'VIP Customer',
    color: '#FFD700',
  });

  const label2 = await databaseService.createLabel({
    userId: user2.id,
    name: 'New Lead',
    color: '#00FF00',
  });

  console.log('Created demo labels:');
  console.log(`  - VIP Customer: ${label1.id}`);
  console.log(`  - New Lead: ${label2.id}`);

  await databaseService.createChatLabel({
    chatId: chat.id,
    labelId: label1.id,
  });

  console.log('Assigned VIP Customer label to demo chat');

  await databaseService.createQuickReply({
    userId: user2.id,
    shortcode: '/greet',
    message: 'Hello! Thank you for contacting Bob\'s Business. How can I help you today?',
  });

  await databaseService.createQuickReply({
    userId: user2.id,
    shortcode: '/thanks',
    message: 'Thank you for your business! We appreciate your support.',
  });

  console.log('Created demo quick replies');

  console.log('\n=== Seed Complete ===');
  console.log('\nDemo Credentials:');
  console.log('  User 1 (Regular):');
  console.log('    Phone: +1234567890');
  console.log('    Name: Alice Demo');
  console.log('');
  console.log('  User 2 (Business):');
  console.log('    Phone: +0987654321');
  console.log('    Name: Bob Business');
  console.log('');
  console.log('To login, use the /auth/send-otp endpoint with the phone number,');
  console.log('then use the OTP shown in the console to login via /auth/login.');

  await app.close();
}

seed().catch(console.error);
