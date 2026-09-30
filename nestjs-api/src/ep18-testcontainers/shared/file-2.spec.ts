import { insertAndCount } from './notes.js';

it('file 2 inserts one row', async () => {
  console.log(`  Nest, C, file 2 sees rows: ${await insertAndCount('file 2')}`);
});
