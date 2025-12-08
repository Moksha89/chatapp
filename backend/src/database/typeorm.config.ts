import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

// TypeORM CLI configuration for migrations
// Usage: npx typeorm migration:generate -d src/database/typeorm.config.ts src/database/migrations/MigrationName
// Usage: npx typeorm migration:run -d src/database/typeorm.config.ts

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgres://chatapp:chatapp_password@localhost:5432/chatapp',
  entities: ['src/database/entities/*.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
