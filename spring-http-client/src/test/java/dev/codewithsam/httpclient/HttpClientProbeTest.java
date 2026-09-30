package dev.codewithsam.httpclient;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.client.RestClient;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * EPISODE 22 PROBES, Spring: the auto-configured RestClient and WebClient builders, as an
 * application would inject them, against a real downstream server.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class HttpClientProbeTest {

    static Downstream downstream;

    @Autowired RestClient.Builder restClients;
    @Autowired WebClient.Builder webClients;

    @BeforeAll
    static void start() throws Exception {
        downstream = new Downstream();
    }

    @AfterAll
    static void stop() {
        downstream.close();
    }

    @Test
    void defaultTimeout() {
        RestClient client = restClients.baseUrl(downstream.url()).build();
        long started = System.nanoTime();
        var res = client.get().uri("/slow").retrieve().toEntity(String.class);
        System.out.printf("  Spring, A, default RestClient, /slow: %d after %.1f s%n", res.getStatusCode().value(), (System.nanoTime() - started) / 1e9);
    }

    @Test
    void lazyRequest() throws Exception {
        WebClient client = webClients.baseUrl(downstream.url()).build();
        int before = downstream.requests.get();
        client.get().uri("/payments/pay_1").retrieve().bodyToMono(String.class);
        Thread.sleep(500);
        System.out.println("  Spring, B, WebClient bodyToMono() without subscribe, requests received: " + (downstream.requests.get() - before));
        client.get().uri("/payments/pay_1").retrieve().bodyToMono(String.class).block();
        System.out.println("  Spring, B, with block(), requests received: " + (downstream.requests.get() - before));
        RestClient rest = restClients.baseUrl(downstream.url()).build();
        int beforeRest = downstream.requests.get();
        rest.get().uri("/payments/pay_1").retrieve().body(String.class);
        System.out.println("  Spring, B, RestClient body(), requests received: " + (downstream.requests.get() - beforeRest));
    }

    static String name(Exception e) {
        return e.getClass().getName().substring(e.getClass().getPackageName().length() + 1);
    }

    @Test
    void failures() throws Exception {
        RestClient client = restClients.baseUrl(downstream.url()).build();
        try {
            client.get().uri("/fail").retrieve().body(String.class);
        } catch (Exception e) {
            System.out.println("  Spring, C, RestClient, GET /fail: threw " + name(e) + ", hits " + downstream.hits("/fail"));
        }
        try {
            client.get().uri("/flaky/restclient").retrieve().body(String.class);
        } catch (Exception e) {
            System.out.println("  Spring, C, RestClient, GET /flaky, first answer 500: threw " + name(e) + ", hits " + downstream.hits("/flaky/restclient"));
        }
        int beforePut = downstream.hits("/fail");
        try {
            client.put().uri("/fail").body("{\"amount\":100}").retrieve().toBodilessEntity();
        } catch (Exception e) {
            System.out.println("  Spring, C, RestClient, PUT /fail: threw " + name(e) + ", hits " + (downstream.hits("/fail") - beforePut));
        }
        try {
            restClients.baseUrl(Downstream.closedPort()).build().get().uri("/payments").retrieve().body(String.class);
        } catch (Exception e) {
            System.out.println("  Spring, C, RestClient, closed port: threw " + name(e) + " caused by " + e.getCause().getClass().getSimpleName());
        }
    }
}
