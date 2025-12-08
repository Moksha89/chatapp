import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('web_sessions')
export class WebSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  pairingCode: string;

  @Column({ type: 'varchar', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', nullable: true })
  deviceId: string | null;

  @Column()
  status: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
