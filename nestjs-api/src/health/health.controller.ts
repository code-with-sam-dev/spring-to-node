import { Controller, Get } from '@nestjs/common';

/**
 * The one endpoint Episode 0 is graded on.
 *
 * It exists in BOTH applications so the viewer can see the same conceptual
 * thing answered by two stacks: Spring Boot on 8080, NestJS on 3000. Nothing
 * else in the repository matters until both of these return 200.
 */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string } {
    return { status: 'UP' };
  }
}
