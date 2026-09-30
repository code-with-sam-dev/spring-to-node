import mongoose, { Schema } from 'mongoose';

/**
 * EPISODE 16 EVIDENCE: MongoDB with Mongoose, against Spring Data MongoDB.
 *
 *   A  two requests load the same account, each debits it, each saves: what is the balance
 *   B  the same with optimisticConcurrency: true
 *   C  the same with an atomic $inc
 *   D  a min: 0 validator: save() against updateOne(), and updateOne with runValidators
 *   E  casting: amount "42", amount "abc", and a field the schema does not declare
 *   F  $inc of -500 on a balance of 100, with runValidators: true
 *   G  the guard in the filter: $inc only where balance >= 500
 *
 * The Spring half is Ep15MongoTest. Collections ep15_*, dropped at the end.
 */
const url = process.env.MONGO_URL ?? 'mongodb://localhost:27018/payments_node?directConnection=true';
await mongoose.connect(url);

const accountShape = { owner: String, balance: { type: Number, min: 0 } };
const Account = mongoose.model('Account', new Schema(accountShape), 'ep15_accounts');
const GuardedAccount = mongoose.model('GuardedAccount', new Schema(accountShape, { optimisticConcurrency: true }), 'ep15_guarded');

const race = async (label: string, model: typeof Account) => {
  await model.deleteMany({});
  const { _id } = await model.create({ owner: 'sam', balance: 100 });
  const first = await model.findById(_id);
  const second = await model.findById(_id);
  first!.balance = first!.balance! - 30;
  second!.balance = second!.balance! - 50;
  const outcomes: string[] = [];
  for (const [name, doc] of [['debit 30', first], ['debit 50', second]] as const) {
    try {
      await doc!.save();
      outcomes.push(`${name}: saved`);
    } catch (e) {
      outcomes.push(`${name}: ${(e as Error).name}`);
    }
  }
  console.log(`\n=== ${label} ===`);
  for (const o of outcomes) console.log(`  ${o}`);
  console.log(`  balance after both: ${(await model.findById(_id))!.balance}`);
};

/* A, B */
await race('A: two requests load, debit 30 and 50, save', Account);
await race('B: the same, optimisticConcurrency: true', GuardedAccount);

/* C */
{
  await Account.deleteMany({});
  const { _id } = await Account.create({ owner: 'sam', balance: 100 });
  await Promise.all([
    Account.updateOne({ _id }, { $inc: { balance: -30 } }),
    Account.updateOne({ _id }, { $inc: { balance: -50 } }),
  ]);
  console.log('\n=== C: the same two debits as atomic $inc ===');
  console.log(`  balance after both: ${(await Account.findById(_id))!.balance}`);
}

/* D */
{
  await Account.deleteMany({});
  const { _id } = await Account.create({ owner: 'sam', balance: 100 });
  console.log('\n=== D: balance has min: 0; set it to -500 ===');
  const doc = await Account.findById(_id);
  doc!.balance = -500;
  try {
    await doc!.save();
    console.log('  save(): saved');
  } catch (e) {
    console.log(`  save(): ${(e as Error).name}`);
  }
  await Account.updateOne({ _id }, { balance: -500 });
  console.log(`  updateOne(): balance now ${(await Account.findById(_id))!.balance}`);
  await Account.updateOne({ _id }, { balance: 100 });
  try {
    await Account.updateOne({ _id }, { balance: -500 }, { runValidators: true });
    console.log('  updateOne(runValidators: true): saved');
  } catch (e) {
    console.log(`  updateOne(runValidators: true): ${(e as Error).name}`);
  }
}

/* E */
{
  await Account.deleteMany({});
  console.log('\n=== E: casting and undeclared fields ===');
  // A request body is untyped at runtime, whatever the DTO says, so the inputs arrive as parsed JSON.
  const body = (json: string): Record<string, unknown> => JSON.parse(json);
  const cast = await Account.create(body('{"owner":"sam","balance":"42"}'));
  console.log(`  balance "42" stored as: ${typeof cast.balance} ${cast.balance}`);
  try {
    await Account.create(body('{"owner":"sam","balance":"abc"}'));
    console.log('  balance "abc": saved');
  } catch (e) {
    console.log(`  balance "abc": ${(e as Error).name}`);
  }
  const extra = await Account.create(body('{"owner":"sam","balance":10,"currency":"GBP"}'));
  const raw = await mongoose.connection.collection('ep15_accounts').findOne({ _id: extra._id });
  console.log(`  undeclared field currency: stored = ${'currency' in raw!}, error = none`);
}

/* F, G */
{
  await Account.deleteMany({});
  const { _id } = await Account.create({ owner: 'sam', balance: 100 });
  console.log('\n=== F: $inc of -500, runValidators: true ===');
  try {
    await Account.updateOne({ _id }, { $inc: { balance: -500 } }, { runValidators: true });
    console.log(`  updateOne($inc, runValidators: true): balance now ${(await Account.findById(_id))!.balance}`);
  } catch (e) {
    console.log(`  updateOne($inc, runValidators: true): ${(e as Error).name}`);
  }
  await Account.updateOne({ _id }, { balance: 100 });
  console.log('\n=== G: the guard in the filter, balance >= 500 ===');
  const guarded = await Account.updateOne({ _id, balance: { $gte: 500 } }, { $inc: { balance: -500 } });
  console.log(`  matched: ${guarded.matchedCount}, modified: ${guarded.modifiedCount}, balance now ${(await Account.findById(_id))!.balance}`);
}

await mongoose.connection.dropCollection('ep15_accounts');
await mongoose.connection.dropCollection('ep15_guarded');
await mongoose.disconnect();
