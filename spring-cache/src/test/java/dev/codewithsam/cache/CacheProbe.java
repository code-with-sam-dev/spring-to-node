package dev.codewithsam.cache;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.springframework.boot.test.web.server.LocalServerPort;

/**
 * EPISODE 24 PROBES, Spring: the same three probes against the in-memory cache and against Redis.
 * Subclasses pick the store.
 */
abstract class CacheProbe {

    static final HttpClient HTTP = HttpClient.newHttpClient();

    @LocalServerPort int port;

    String get(String path, String user) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path));
        if (user != null) b.header("X-User", user);
        return HTTP.send(b.build(), HttpResponse.BodyHandlers.ofString()).body();
    }

    void put(String path, String status) throws Exception {
        HTTP.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
            .header("Content-Type", "application/json")
            .PUT(HttpRequest.BodyPublishers.ofString("{\"status\":\"" + status + "\"}")).build(), HttpResponse.BodyHandlers.ofString());
    }

    int twenty(String path) throws Exception {
        try (var pool = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<String>> calls = new ArrayList<>();
            for (int i = 0; i < 20; i++) calls.add(pool.submit(() -> get(path, null)));
            for (Future<String> f : calls) f.get();
        }
        return 0;
    }

    void run(String store, PaymentsService payments) throws Exception {
        String alice = get("/me", "alice");
        String bob = get("/me", "bob");
        System.out.println("  Spring, A, " + store + ", GET /me as alice: " + alice + "; then as bob: " + bob);
        System.out.println("  Spring, A, " + store + ", @Cacheable(key = \"#user\"), as alice: " + get("/me-per-user", "alice") + "; then as bob: " + get("/me-per-user", "bob"));

        get("/payments/pay_1", null);
        put("/payments/pay_1", "settled");
        String stale = get("/payments/pay_1", null);
        put("/payments/pay_1/evicting", "refunded");
        String fresh = get("/payments/pay_1", null);
        System.out.println("  Spring, B, " + store + ", after PUT settled, GET: " + stale + "; after PUT refunded with @CacheEvict: " + fresh);

        int before = payments.loads();
        twenty("/payments/pay_cold");
        System.out.println("  Spring, C, " + store + ", 20 concurrent GETs on a cold key, @Cacheable: repository loads " + (payments.loads() - before));
        before = payments.loads();
        twenty("/payments-sync/pay_cold_sync");
        System.out.println("  Spring, C, " + store + ", 20 concurrent GETs on a cold key, @Cacheable(sync = true): repository loads " + (payments.loads() - before));
    }
}
