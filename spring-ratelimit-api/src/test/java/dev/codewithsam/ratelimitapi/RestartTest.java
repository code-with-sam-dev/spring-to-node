package dev.codewithsam.ratelimitapi;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.context.ConfigurableApplicationContext;
import org.testcontainers.containers.GenericContainer;

/** EPISODE 21, F: use the three, restart the instance, ask again. In memory, then in Redis. */
class RestartTest {

    static void run(String label, Map<String, Object> props) throws Exception {
        List<String> before = new ArrayList<>();
        try (ConfigurableApplicationContext app = Probe.start(props)) {
            for (int i = 0; i < 4; i++) before.add(String.valueOf(Probe.send(app, "GET", "/payments", null).statusCode()));
        }
        try (ConfigurableApplicationContext app = Probe.start(props)) {
            System.out.println("  Spring, F, " + label + ", before the restart: " + String.join(" ", before) + "; first request after: " + Probe.send(app, "GET", "/payments", null).statusCode());
        }
    }

    @Test
    void restart() throws Exception {
        run("in-memory buckets", Map.of());
        try (GenericContainer<?> redis = new GenericContainer<>("redis:8-alpine").withExposedPorts(6379)) {
            redis.start();
            run("Redis buckets", Map.of("ratelimit.redis-url", "redis://" + redis.getHost() + ":" + redis.getMappedPort(6379)));
        }
    }
}
