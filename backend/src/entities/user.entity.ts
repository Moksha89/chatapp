import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phone: string;

  @Column({ nullable: true })
  displayName: string;

  @Column({ nullable: true })
  profilePhoto: string;

  @Column({ default: 'Hey there! I am using Abhi Chat' })
  about: string;

  @Column({ type: 'timestamp', nullable: true })
  lastSeen: Date;

  @Column({ default: false })
  isOnline: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
