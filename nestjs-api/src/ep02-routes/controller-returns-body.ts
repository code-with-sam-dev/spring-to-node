import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/**
 * Does Nest's @Controller send the returned string to the client?
 *
 * WHY THIS FILE EXISTS, and it is a correction rather than a new idea. The
 * episode claims three things side by side:
 *
 *     Spring @Controller      body: (empty)
 *     Spring @RestController  body: hello
 *     NestJS @Controller      body: hello
 *
 * The two Spring rows are asserted by ControllerAnnotationTest. The third was
 * only ECHOED by verify-routing.sh, in a sentence, while the design sheet
 * printed all three in a table headed "every row came off a terminal". That is
 * an asserted claim wearing a measured one's clothes, which is exactly what
 * this repository exists to make impossible.
 *
 * So it is measured here. Nest has ONE @Controller and it behaves like Spring's
 * @RestController: the return value is serialised as the response body, with no
 * @ResponseBody equivalent to add and no view resolver to reach.
 */
@Controller('greeting')
class GreetingController {
  @Get()
  hello() {
    // The same method body as Spring's PlainController. In Spring, without
    // @ResponseBody, this string names a TEMPLATE and the client gets nothing.
    return 'hello';
  }
}

@Module({ controllers: [GreetingController] })
class AppModule {}

const app = await NestFactory.create(AppModule, { logger: false });
await app.listen(3997);

const res = await fetch('http://localhost:3997/greeting');
const body = await res.text();
await app.close();

console.log(`NestJS @Controller  -> ${res.status}, body '${body}'`);

if (res.status !== 200) throw new Error(`CLAIM FAILED: status was ${res.status}`);
if (body !== 'hello') {
  throw new Error(
    `CLAIM FAILED: Nest's @Controller did not send the return value as the body. ` +
      `Got '${body}' instead of 'hello'.`,
  );
}
console.log('asserted: the return value IS the response body');
