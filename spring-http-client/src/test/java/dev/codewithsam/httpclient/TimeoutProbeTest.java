package dev.codewithsam.httpclient;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.client.RestClient;

/** EPISODE 22, A: the same call with a one second read timeout, set in configuration. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE, properties = "spring.http.clients.read-timeout=1s")
class TimeoutProbeTest {

    static Downstream downstream;

    @Autowired RestClient.Builder restClients;

    @BeforeAll
    static void start() throws Exception {
        downstream = new Downstream();
    }

    @AfterAll
    static void stop() {
        downstream.close();
    }

    @Test
    void oneSecond() {
        RestClient client = restClients.baseUrl(downstream.url()).build();
        long started = System.nanoTime();
        try {
            client.get().uri("/slow").retrieve().body(String.class);
            System.out.printf("  Spring, A, spring.http.clients.read-timeout=1s, /slow: returned after %.1f s%n", (System.nanoTime() - started) / 1e9);
        } catch (Exception e) {
            System.out.printf("  Spring, A, spring.http.clients.read-timeout=1s, /slow: %s caused by %s after %.1f s%n", e.getClass().getSimpleName(), e.getCause().getClass().getSimpleName(), (System.nanoTime() - started) / 1e9);
        }
        try {
            Thread.sleep(10_500);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        System.out.println("  Spring, A, the downstream: " + String.join("; ", downstream.events) + ", hits " + downstream.hits("/slow"));
    }
}
