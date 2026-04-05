import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('app_settings')
export class AppSettingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ nullable: true })
  category?: string; // media, email, user_control, general

  @Column({ nullable: true })
  description?: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
