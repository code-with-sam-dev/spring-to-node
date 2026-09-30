// Run: npm ci && node probe.mjs   (Postgres from the repository's compose file)
import 'reflect-metadata';
import { DataSource, EntitySchema } from 'typeorm';
import { readFileSync } from 'node:fs';
// typeorm's exports map hides package.json, so read the installed file directly.
const VERSION = JSON.parse(readFileSync(new URL('./node_modules/typeorm/package.json', import.meta.url), 'utf8')).version;
const Account = new EntitySchema({ name: 'Account', tableName: 'ep12_v03_accounts', columns: {
  id: { type: Number, primary: true, generated: true }, owner: { type: String } } });
const ds = new DataSource({ type: 'postgres', host: process.env.DATABASE_HOST ?? 'localhost', port: Number(process.env.DATABASE_PORT ?? 5434), username: 'payments', password: 'payments', database: 'payments_node', entities: [Account], synchronize: true });
await ds.initialize();
const repo = ds.getRepository(Account);
await repo.clear();
await repo.save([{ owner: 'alice' }, { owner: 'bob' }]);
for (const id of [undefined, null]) {
  try { const r = await repo.findOneBy({ id }); console.log(`  typeorm ${VERSION}  findOneBy({ id: ${id} })  ->  ${r ? `row id=${r.id} owner=${r.owner}` : 'null'}`); }
  catch (e) { console.log(`  findOneBy({ id: ${id} })  ->  threw ${e.constructor.name}`); }
}
await ds.query('DROP TABLE IF EXISTS ep12_v03_accounts');
await ds.destroy();
