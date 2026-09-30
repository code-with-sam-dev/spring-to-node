import 'reflect-metadata';
import { Column, DataSource, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

/**
 * EPISODE 14 EVIDENCE: relations and the query count.
 *
 *   A  load 20 orders, touch each order's lines without asking for them
 *   B  the same with relations: { lines: true }
 *   C  pagination with a joined relation: skip/take against the SQL sent
 *
 * The JPA half is Ep13RelationsTest. Tables ep13_*, created and dropped here.
 */
const base = {
  type: 'postgres' as const,
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 5434),
  username: 'payments',
  password: 'payments',
  database: 'payments_node',
};

@Entity('ep13_orders')
class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  reference!: string;

  @OneToMany(() => OrderLine, (line) => line.order)
  lines!: OrderLine[];
}

@Entity('ep13_order_lines')
class OrderLine {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  sku!: string;

  @ManyToOne(() => Order, (order) => order.lines)
  order!: Order;
}

const statements: string[] = [];
const short = (q: string) => (q.length > 72 ? `${q.slice(0, 64)} ...` : q);
const logger = {
  logQuery: (q: string) => { statements.push(q.replace(/\s+/g, ' ').trim()); },
  logQueryError: () => {}, logQuerySlow: () => {}, logSchemaBuild: () => {}, logMigration: () => {}, log: () => {},
};

const ds = new DataSource({ ...base, entities: [Order, OrderLine], synchronize: true, logger, logging: true });
await ds.initialize();
await ds.query('TRUNCATE ep13_order_lines, ep13_orders RESTART IDENTITY CASCADE');
for (let i = 1; i <= 20; i++) {
  const order = await ds.getRepository(Order).save({ reference: `ORD-${i}` });
  await ds.getRepository(OrderLine).save([{ sku: `A-${i}`, order }, { sku: `B-${i}`, order }, { sku: `C-${i}`, order }]);
}
const orders = ds.getRepository(Order);

/* A */
console.log('=== A: 20 orders, lines never asked for ===');
statements.length = 0;
const plain = await orders.find({ order: { id: 'ASC' } });
let counted = 0;
for (const o of plain) counted += o.lines?.length ?? 0;
console.log(`  queries sent: ${statements.length}`);
console.log(`  order.lines on the first order: ${JSON.stringify(plain[0].lines)}`);
console.log(`  lines counted across 20 orders: ${counted}`);

/* B */
console.log('\n=== B: the same, with relations: { lines: true } ===');
statements.length = 0;
const withLines = await orders.find({ relations: { lines: true }, order: { id: 'ASC' } });
counted = 0;
for (const o of withLines) counted += o.lines.length;
console.log(`  queries sent: ${statements.length}`);
for (const s of statements) console.log(`    ${short(s)}`);
console.log(`  lines counted across 20 orders: ${counted}`);

/* C */
console.log('\n=== C: page 2 of 5 orders, with lines joined ===');
statements.length = 0;
const page = await orders.find({ relations: { lines: true }, order: { id: 'ASC' }, skip: 5, take: 5 });
console.log(`  queries sent: ${statements.length}`);
for (const s of statements) console.log(`    ${short(s)}`);
console.log(`  orders returned: ${page.map((o) => o.reference).join(', ')}; lines: ${page.reduce((n, o) => n + o.lines.length, 0)}`);

await ds.query('DROP TABLE IF EXISTS ep13_order_lines, ep13_orders CASCADE');
await ds.destroy();
