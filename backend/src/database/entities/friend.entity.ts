import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('friends')
export class FriendEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  requesterId: string;

  @Column()
  recipientId: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: string; // 'pending' | 'accepted' | 'declined' | 'blocked'

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
