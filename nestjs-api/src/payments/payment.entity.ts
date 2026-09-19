import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

// SIDE BY SIDE WITH THE JPA ENTITY THIS IS ALMOST THE SAME FILE.
//   @Entity            -> @Entity()
//   @Id @GeneratedValue -> @PrimaryGeneratedColumn('uuid')
//   @Column            -> @Column()
//   @CreationTimestamp -> @CreateDateColumn()
//
// The resemblance is exactly why this is dangerous. A JPA entity is MANAGED:
// load it, mutate a field, and Hibernate writes the change back on flush
// without you calling anything. A TypeORM entity is a plain object. Mutate it
// and nothing happens until you call save(). That difference is measured in
// the persistence episode rather than asserted here.
// THE UNIQUE CONSTRAINT IS THE THING THAT ACTUALLY CLOSES THE RACE.
// A transaction narrows the window between the lookup and the insert. It does
// not remove it, because two transactions can both look, both find nothing,
// and both insert. Only the database can refuse the second one.
@Entity('payments')
@Unique('uq_payments_idempotency_key', ['idempotencyKey'])
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // bigint maps to a STRING in the JavaScript driver, not a number, because a
  // 64-bit integer does not fit in a JavaScript number without losing
  // precision. This is the single most surprising line in the file for a Java
  // developer and it gets its own beat.
  @Column({ type: 'bigint' })
  amountInMinorUnits!: string;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @Column({ type: 'varchar', length: 100, name: 'idempotency_key' })
  idempotencyKey!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
