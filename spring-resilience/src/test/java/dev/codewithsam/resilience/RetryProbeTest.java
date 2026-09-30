package dev.codewithsam.resilience;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/** EPISODE 23 PROBES, Spring: @Retryable's defaults, a backoff, twenty callers, and a POST. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class RetryProbeTest {

    static Downstream downstream;

    static {
        try {
            downstream = new Downstream();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("payments.url", downstream::url);
    }

    @AfterAll
    static void stop() {
        downstream.close();
    }

    @Autowired PaymentsGateway gateway;

    static String outcome(Runnable call) {
        try {
            call.run();
            return "returned";
        } catch (Exception e) {
            return "threw " + e.getClass().getSimpleName();
        }
    }

    @Test
    void defaults() {
        String o = outcome(gateway::statusWithDefaults);
        System.out.println("  Spring, C, @Retryable with no attributes, GET while down: " + o + ", hits " + downstream.hits("/defaults") + " at " + downstream.timeline("/defaults"));
    }

    @Test
    void backoffAndPost() {
        String o = outcome(gateway::status);
        System.out.println("  Spring, C, @Retryable(maxRetries = 2, delay = 200, multiplier = 2, jitter = 50), GET: " + o + ", hits " + downstream.hits("/status") + " at " + downstream.timeline("/status"));
        String p = outcome(gateway::charge);
        System.out.println("  Spring, D, the same @Retryable on a method that POSTs: " + p + ", hits " + downstream.hits("/charge"));
    }

    @Test
    void twentyCallers() throws Exception {
        long started = System.nanoTime();
        int before = downstream.hits("/status");
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<String>> calls = new ArrayList<>();
            for (int i = 0; i < 20; i++) calls.add(pool.submit(() -> outcome(gateway::status)));
            for (Future<String> f : calls) f.get();
        }
        System.out.printf("  Spring, A, 20 callers, 3 attempts each, while down: hits %d in %.1f s%n", downstream.hits("/status") - before, (System.nanoTime() - started) / 1e9);
    }
}
