package dev.codewithsam.ratelimitapi;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.context.ConfigurableApplicationContext;
import org.testcontainers.containers.GenericContainer;

/**
 * EPISODE 21, C: two instances behind round robin, six requests from one client. Buckets in each
 * JVM's memory, then in one Redis both share.
 */
class InstancesTest {

    static String roundRobin(List<ConfigurableApplicationContext> apps, int n) throws Exception {
        List<String> out = new ArrayList<>();
        for (int i = 0; i < n; i++) out.add(String.valueOf(Probe.send(apps.get(i % apps.size()), "GET", "/payments", null).statusCode()));
        long allowed = out.stream().filter("200"::equals).count();
        return String.join(" ", out) + " (" + allowed + " allowed)";
    }

    @Test
    void inMemoryThenRedis() throws Exception {
        try (ConfigurableApplicationContext a = Probe.start(Map.of()); ConfigurableApplicationContext b = Probe.start(Map.of())) {
            System.out.println("  Spring, C, two instances, in-memory buckets, six requests: " + roundRobin(List.of(a, b), 6));
        }
        try (GenericContainer<?> redis = new GenericContainer<>("redis:8-alpine").withExposedPorts(6379)) {
            redis.start();
            String url = "redis://" + redis.getHost() + ":" + redis.getMappedPort(6379);
            try (ConfigurableApplicationContext a = Probe.start(Map.of("ratelimit.redis-url", url));
                 ConfigurableApplicationContext b = Probe.start(Map.of("ratelimit.redis-url", url))) {
                System.out.println("  Spring, C, two instances, one Redis, six requests: " + roundRobin(List.of(a, b), 6));
            }
        }
    }
}
