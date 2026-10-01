import 'reflect-metadata';
import { Controller, Get, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Context, Field, GraphQLModule, Int, ObjectType, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import DataLoader from 'dataloader';
import { GraphQLError, type GraphQLFormattedError } from 'graphql';
import { Pool } from 'pg';

/**
 * EPISODE 32. A code-first GraphQL API over Postgres, run as its own process.
 *
 *   node dist/ep31-graphql/main.js <port> <databaseUrl>
 *
 * Every SQL statement goes through sql(), which counts it, so the probe can read the count.
 * With MASK=1, errors that did not come from GraphQL itself are masked before they leave.
 */
const [port, databaseUrl] = process.argv.slice(2);
const pool = new Pool({ connectionString: databaseUrl });
let statements = 0;
const sql = async (text: string, params: unknown[] = []) => {
  statements++;
  return (await pool.query(text, params)).rows;
};

@ObjectType()
class Customer {
  @Field(() => Int) id!: number;
  @Field() name!: string;
}

@ObjectType()
class Order {
  @Field(() => Int) id!: number;
  @Field(() => Int) total!: number;
  customerId!: number;
}

type Loaders = { customers: DataLoader<number, Customer> };

@Resolver(() => Order)
class OrdersResolver {
  @Query(() => [Order])
  async orders(): Promise<Order[]> {
    const rows = await sql('SELECT id, total, customer_id FROM ep32_orders ORDER BY id');
    return rows.map((r) => ({ id: r.id, total: r.total, customerId: r.customer_id }));
  }

  @ResolveField(() => Customer)
  async customer(@Parent() order: Order): Promise<Customer> {
    const [row] = await sql('SELECT id, name FROM ep32_customers WHERE id = $1', [order.customerId]);
    return row;
  }

  @ResolveField(() => Customer)
  customerBatched(@Parent() order: Order, @Context() ctx: { loaders: Loaders }): Promise<Customer> {
    return ctx.loaders.customers.load(order.customerId);
  }

  @Query(() => String)
  async report(): Promise<string> {
    const rows = await sql('SELECT count(*) FROM payments_internal');
    return String(rows[0].count);
  }
}

@Controller('stats')
class StatsController {
  @Get()
  get() {
    return { statements };
  }

  @Post('reset')
  reset() {
    statements = 0;
    return { statements };
  }
}

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      formatError: (formatted: GraphQLFormattedError, error: unknown) => {
        if (!process.env.MASK) return formatted;
        const original = error instanceof GraphQLError ? error.originalError : undefined;
        if (!original || original instanceof GraphQLError) return formatted;
        console.error(original);
        return { message: 'Internal server error', path: formatted.path, extensions: { code: 'INTERNAL_SERVER_ERROR' } };
      },
      context: (): { loaders: Loaders } => ({
        loaders: {
          customers: new DataLoader(async (ids: readonly number[]) => {
            const rows = await sql('SELECT id, name FROM ep32_customers WHERE id = ANY($1)', [ids]);
            return ids.map((id) => rows.find((r) => r.id === id));
          }),
        },
      }),
    }),
  ],
  providers: [OrdersResolver],
  controllers: [StatsController],
})
class GraphqlModule {}

void (async () => {
  const app = await NestFactory.create(GraphqlModule, { logger: process.env.NEST_LOG ? undefined : false });
  await app.listen(Number(port));
  console.log('READY');
})();
