import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // This one call is the whole of Act 3's fix, and each flag earns its place:
  //
  //   whitelist              strip any property the DTO did not declare
  //   forbidNonWhitelisted   and reject the request outright if one appears
  //   transform              turn the plain JSON object into a real DTO instance
  //
  // Without transform, the class-validator decorators have nothing to run
  // against. Without whitelist, mass assignment is only prevented by the
  // service happening to name its fields.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // GRACEFUL SHUTDOWN, AND IT IS TWO SEPARATE PROBLEMS.
  //
  // 1. enableShutdownHooks() makes Nest listen for the signal and run module
  //    teardown, which closes the database pool rather than abandoning it.
  // 2. It is USELESS ON ITS OWN in a container where node is PID 1, because
  //    Linux does not apply default signal dispositions to PID 1: a signal
  //    with no handler is IGNORED, not defaulted. Measured 2026-09-19: the
  //    container went from "Up 16 minutes" to "Up 17 minutes" after SIGTERM.
  //    The fix for THAT is `init: true` in compose, which puts a real init
  //    process at PID 1 to forward signals properly.
  //
  // Both are required. This one decides what to do; the init decides whether
  // the signal ever arrives.
  app.enableShutdownHooks();

  const server = await app.listen(process.env.PORT ?? 3000);

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      // Stop accepting new connections, let in-flight requests finish, then
      // close. The Spring equivalent is server.shutdown=graceful, which is
      // also NOT the default there.
      server.close(() => void app.close().then(() => process.exit(0)));
    });
  }
}
bootstrap();
