import { insertAndCount } from './notes.js';

it('file 1 inserts one row', async () => {
  console.log(`  Nest, C, file 1 sees rows: ${await insertAndCount('file 1')}`);
});
