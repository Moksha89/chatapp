import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('statuses')
export class StatusEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'text' })
  content: string;

  @Column()
  type: string; // 'text', 'image', 'video'

  @Column({ type: 'varchar', nullable: true })
  mediaUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  backgroundColor: string | null;

  @Column({ type: 'varchar', nullable: true })
  textColor: string | null;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'simple-array', nullable: true })
  viewedBy: string[];

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;
}
