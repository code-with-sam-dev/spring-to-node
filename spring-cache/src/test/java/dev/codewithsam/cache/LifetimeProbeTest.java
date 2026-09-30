package dev.codewithsam.cache;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.testcontainers.containers.GenericContainer;

/**
 * EPISODE 24 PROBES, Spring: a cache entry's lifetime, a stampede when a hot key expires, two
 * replicas on one Redis, and a payment that does not exist. Real HTTP against real contexts.
 */
class LifetimeProbeTest {

    static final HttpClient HTTP = HttpClient.newHttpClient();
    static final GenericContainer<?> REDIS = new GenericContainer<>("redis:8-alpine").withExposedPorts(6379);

    static {
        REDIS.start();
    }

    @AfterAll
    static void stop() {
        REDIS.stop();
    }

    static ConfigurableApplicationContext start(Map<String, Object> extra) {
        Map<String, Object> props = new HashMap<>(Map.of("server.port", 0, "spring.cache.type", "redis",
            "spring.data.redis.host", REDIS.getHost(), "spring.data.redis.port", REDIS.getMappedPort(6379)));
        props.putAll(extra);
        return new SpringApplicationBuilder(CacheApplication.class).properties(props).logStartupInfo(false).run();
    }

    static void get(ConfigurableApplicationContext app, String path) throws Exception {
        int port = ((WebServerApplicationContext) app).getWebServer().getPort();
        HTTP.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).build(), HttpResponse.BodyHandlers.ofString());
    }

    static void concurrently(List<ConfigurableApplicationContext> apps, String path, int each) throws Exception {
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<?>> calls = new ArrayList<>();
            for (ConfigurableApplicationContext app : apps) for (int i = 0; i < each; i++) calls.add(pool.submit(() -> { get(app, path); return null; }));
            for (Future<?> f : calls) f.get();
        }
    }

    static int loads(ConfigurableApplicationContext app) {
        return app.getBean(PaymentsService.class).loads();
    }

    @Test
    void lifetime() throws Exception {
        try (var app = start(Map.of())) {
            get(app, "/payments/pay_forever");
            Thread.sleep(1200);
            get(app, "/payments/pay_forever");
            System.out.println("  Spring, D, Redis, no time-to-live, GET, wait 1.2 s, GET: repository loads " + loads(app));
        }
        try (var app = start(Map.of("spring.cache.redis.time-to-live", "1s"))) {
            get(app, "/payments/pay_ttl");
            get(app, "/payments/pay_ttl");
            Thread.sleep(1200);
            get(app, "/payments/pay_ttl");
            System.out.println("  Spring, D, Redis, time-to-live 1s, GET, GET, wait 1.2 s, GET: repository loads " + loads(app));
        }
    }

    @Test
    void stampedeAfterExpiry() throws Exception {
        try (var app = start(Map.of("spring.cache.redis.time-to-live", "1s", "payments.cache.locking", "true"))) {
            get(app, "/payments/pay_hot");
            get(app, "/payments-sync/pay_hot_sync");
            Thread.sleep(1200);
            int before = loads(app);
            concurrently(List.of(app), "/payments/pay_hot", 20);
            int plain = loads(app) - before;
            before = loads(app);
            concurrently(List.of(app), "/payments-sync/pay_hot_sync", 20);
            System.out.println("  Spring, E, hot key expired, 20 concurrent GETs: @Cacheable loads " + plain + ", @Cacheable(sync = true) with the locking writer loads " + (loads(app) - before));
        }
    }

    @Test
    void twoReplicas() throws Exception {
        try (var a = start(Map.of("payments.cache.locking", "true")); var b = start(Map.of("payments.cache.locking", "true"))) {
            concurrently(List.of(a, b), "/payments-sync/pay_shared", 10);
            System.out.println("  Spring, F, two replicas on one Redis, 10 concurrent GETs each, @Cacheable(sync = true), locking writer: repository loads " + (loads(a) + loads(b)));
        }
        try (var a = start(Map.of()); var b = start(Map.of())) {
            concurrently(List.of(a, b), "/payments-sync/pay_shared_plain", 10);
            System.out.println("  Spring, F, two replicas on one Redis, 10 concurrent GETs each, @Cacheable(sync = true), default writer: repository loads " + (loads(a) + loads(b)));
        }
    }

    @Test
    void missing() throws Exception {
        try (var app = start(Map.of())) {
            for (int i = 0; i < 20; i++) get(app, "/payments/missing_1");
            System.out.println("  Spring, G, Redis, 20 GETs for a payment that does not exist: repository loads " + loads(app));
        }
    }
}
