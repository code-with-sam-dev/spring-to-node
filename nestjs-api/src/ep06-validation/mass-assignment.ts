import 'reflect-metadata';
import { IsInt, IsString } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * The asymmetry the episode nearly missed: the two stacks differ on what
 * happens to a field you did not declare.
 *
 * Jackson IGNORES an unknown property. Measured in JacksonLenienceTest: post
 * `isAdmin: true` and the resulting record simply does not have it, so nothing
 * downstream can persist it.
 *
 * class-transformer is not a binder in that sense. `plainToInstance` COPIES
 * what it is given unless something strips it, so the object your service
 * receives can carry properties the DTO never declared. If that object is
 * handed to a repository, those properties travel.
 *
 * THAT MAKES UNCONFIGURED NESTJS MORE EXPOSED THAN DEFAULT SPRING ON THIS ONE
 * POINT, which is the opposite of the direction the episode has been running
 * and is worth measuring rather than asserting.
 */
class CreatePaymentDto {
  @IsInt()
  amountInMinorUnits!: number;

  @IsString()
  currency!: string;
}

const hostile = {
  amountInMinorUnits: 1,
  currency: 'USD',
  isAdmin: true,
  role: 'admin',
};

// What a handler receives with NO whitelist, which is the default.
const permissive = plainToInstance(CreatePaymentDto, hostile);
const keysOf = (o: unknown) => Object.keys(o as object).sort().join(', ');

console.log(`the payload sent            ${keysOf(hostile)}`);
console.log(`the DTO instance, no strip  ${keysOf(permissive)}`);
console.log();
console.log(`isAdmin survived onto the DTO?  ${'isAdmin' in (permissive as object) ? 'YES' : 'no'}`);
console.log(`role survived onto the DTO?     ${'role' in (permissive as object) ? 'YES' : 'no'}`);

if (!('isAdmin' in (permissive as object))) {
  throw new Error('CLAIM FAILED: expected the undeclared property to survive the transform');
}
console.log('\nasserted: without whitelist, undeclared properties reach your service object.');
console.log('Jackson, by contrast, drops them before your record exists.');
