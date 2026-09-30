import 'reflect-metadata';
import { inject } from 'vitest';
import { Column, DataSource, Entity, PrimaryGeneratedColumn } from 'typeorm';

// EPISODE 19 PROBE, C: each file inserts one row into the shared container and counts.
@Entity('ep18_shared_notes')
export class SharedNote {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  text!: string;
}

export const insertAndCount = async (file: string) => {
  const ds = await new DataSource({ type: 'postgres', url: inject('pgUri'), entities: [SharedNote], synchronize: true }).initialize();
  await ds.getRepository(SharedNote).save({ text: file });
  const rows = await ds.getRepository(SharedNote).count();
  await ds.destroy();
  return rows;
};
