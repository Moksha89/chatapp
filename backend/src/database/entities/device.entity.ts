import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('devices')
export class DeviceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  deviceId: string;

  @Column()
  deviceName: string;

  @Column()
  deviceType: string;

  @Column({ default: false })
  isPrimary: boolean;

  @Column({ type: 'datetime', nullable: true })
  lastSeen: Date | null;

  @Column({ type: 'text', nullable: true })
  identityPublicKey: string | null;

  @Column({ type: 'text', nullable: true })
  signedPrekeyPublic: string | null;

  @Column({ type: 'text', nullable: true })
  signedPrekeySignature: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => UserEntity, user => user.devices)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;
}
