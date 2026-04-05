import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('stickers')
export class StickerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  packName: string;

  @Column()
  imageUrl: string;

  @Column({ type: 'varchar', nullable: true })
  emoji: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
