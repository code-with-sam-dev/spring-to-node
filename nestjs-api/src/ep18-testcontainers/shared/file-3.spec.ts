import { insertAndCount } from './notes.js';

it('file 3 inserts one row', async () => {
  console.log(`  Nest, C, file 3 sees rows: ${await insertAndCount('file 3')}`);
});
