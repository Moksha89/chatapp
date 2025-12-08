import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('business_profiles')
export class BusinessProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userId: string;

  @Column()
  businessName: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ nullable: true })
  category: string | null;

  @Column({ nullable: true })
  address: string | null;

  @Column({ nullable: true })
  businessHours: string | null;

  @Column({ nullable: true })
  email: string | null;

  @Column({ nullable: true })
  website: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
