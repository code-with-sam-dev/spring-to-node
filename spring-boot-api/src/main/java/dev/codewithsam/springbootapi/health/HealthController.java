package dev.codewithsam.springbootapi.health;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The Spring Boot half of the Episode 0 baseline.
 *
 * Deliberately hand written rather than pulled from Actuator, because the point
 * of the episode is to put the SAME conceptual endpoint beside the NestJS one
 * and let the viewer compare the two stacks answering it. Actuator arrives
 * later, once there is a reason for it.
 */
@RestController
public class HealthController {

  @GetMapping("/health")
  public Map<String, String> check() {
    return Map.of("status", "UP");
  }
}
