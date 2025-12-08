import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { DeviceEntity } from './device.entity';
import { ChatParticipantEntity } from './chat-participant.entity';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  phoneNumber: string;

  @Column()
  displayName: string;

  @Column({ nullable: true, type: 'text' })
  profilePhoto: string | null;

  @Column({ nullable: true })
  passwordHash: string | null;

  @Column({ default: false })
  isBusiness: boolean;

  @Column({ nullable: true })
  status: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastSeen: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => DeviceEntity, device => device.user)
  devices: DeviceEntity[];

  @OneToMany(() => ChatParticipantEntity, participant => participant.user)
  chatParticipants: ChatParticipantEntity[];
}
