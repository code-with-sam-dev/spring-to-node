package dev.codewithsam.resilience;

import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

/**
 * EPISODE 23 PROBE, Spring: twenty calls in a row through a Resilience4j circuit breaker while the
 * payments API is down, then one call after the wait once it is back.
 */
class CircuitBreakerProbeTest {

    @Test
    void breaker() throws Exception {
        try (Downstream downstream = new Downstream()) {
            RestClient http = RestClient.create(downstream.url());
            CircuitBreakerConfig config = CircuitBreakerConfig.custom()
                .slidingWindowType(CircuitBreakerConfig.SlidingWindowType.COUNT_BASED)
                .slidingWindowSize(5)
                .minimumNumberOfCalls(5)
                .failureRateThreshold(50)
                .waitDurationInOpenState(Duration.ofSeconds(1))
                .permittedNumberOfCallsInHalfOpenState(1)
                .build();
            CircuitBreaker breaker = CircuitBreaker.of("payments", config);
            List<String> transitions = new ArrayList<>();
            breaker.getEventPublisher().onStateTransition(e -> transitions.add(e.getStateTransition().toString()));

            int rejected = 0;
            long rejectedNanos = 0;
            for (int i = 0; i < 20; i++) {
                long t = System.nanoTime();
                try {
                    breaker.executeSupplier(() -> http.get().uri("/status").retrieve().body(String.class));
                } catch (CallNotPermittedException e) {
                    rejected++;
                    rejectedNanos += System.nanoTime() - t;
                } catch (Exception e) {
                    // a failed call through a closed breaker
                }
            }
            System.out.printf("  Spring, B, Resilience4j, 20 calls while down: hits %d, rejected without a call %d, %.2f ms each%n",
                downstream.hits("/status"), rejected, rejectedNanos / 1e6 / Math.max(rejected, 1));
            downstream.down.set(false);
            Thread.sleep(1100);
            String after = breaker.executeSupplier(() -> http.get().uri("/status").retrieve().body(String.class));
            System.out.println("  Spring, B, Resilience4j, back up, one call after the wait: " + after + ", state " + breaker.getState());
            System.out.println("  Spring, B, Resilience4j, transitions: " + String.join(", ", transitions));
        }
    }
}
