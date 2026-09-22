import 'reflect-metadata';
import { Injectable, Module, Scope, Controller, Get } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/**
 * Default scope, and the one a Spring developer will reach for too early.
 *
 * Spring's default bean scope is singleton and so is Nest's, so the habit
 * transfers and there is nothing to learn. What does NOT transfer is the cost
 * of the alternative: a request scoped provider in Nest makes everything that
 * depends on it request scoped too, all the way up the graph, which is a
 * performance decision rather than a convenience.
 *
 * Both halves are measured. Counting INSTANCES is the only honest way to say
 * "singleton": asking the container twice and getting the same object proves
 * it, where reading the documentation only proves what was intended.
 */
let defaultCount = 0;
let requestCount = 0;

@Injectable()
class DefaultScoped {
  readonly id = ++defaultCount;
}

@Injectable({ scope: Scope.REQUEST })
class RequestScoped {
  readonly id = ++requestCount;
}

@Controller('probe')
class ProbeController {
  constructor(
    private readonly always: DefaultScoped,
    private readonly perRequest: RequestScoped,
  ) {}

  @Get()
  ids() {
    return { singleton: this.always.id, request: this.perRequest.id };
  }
}

@Module({ controllers: [ProbeController], providers: [DefaultScoped, RequestScoped] })
class AppModule {}

const app = await NestFactory.create(AppModule, { logger: false });
await app.listen(3996);

const first = await (await fetch('http://localhost:3996/probe')).json();
const second = await (await fetch('http://localhost:3996/probe')).json();
await app.close();

console.log(`request 1  singleton=${first.singleton}  request-scoped=${first.request}`);
console.log(`request 2  singleton=${second.singleton}  request-scoped=${second.request}`);
console.log(`\n${defaultCount} default-scoped instance(s), ${requestCount} request-scoped`);

if (first.singleton !== second.singleton) {
  throw new Error(`CLAIM FAILED: the default scope built two instances`);
}
if (first.request === second.request) {
  throw new Error(`CLAIM FAILED: request scope reused an instance across requests`);
}
console.log('asserted: default is one instance for the app, request scope is one per request');
