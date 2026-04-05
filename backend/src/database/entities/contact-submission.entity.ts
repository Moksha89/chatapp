import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('contact_submissions')
export class ContactSubmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  subject?: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: 'pending' })
  status: string; // pending, read, replied, archived

  @Column({ nullable: true, type: 'text' })
  adminReply?: string;

  @CreateDateColumn()
  createdAt: Date;
}
