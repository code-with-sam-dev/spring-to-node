package dev.codewithsam.springbootapi.ep04;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The other half of the event loop beat: Spring serves everybody anyway.
 *
 * The NestJS demo shows a synchronous handler holding the single thread for
 * 1500 ms and delaying an unrelated request to 1401 ms. This is the same shape
 * on the Spring side, and the point is that the SAME MISTAKE costs nothing
 * here: Tomcat hands each request its own thread, so a handler that sleeps
 * occupies only its own.
 *
 * That is why a Spring developer's instinct about slow handlers does not
 * transfer. It is not that they are careless. It is that the thing they are
 * used to relying on is absent.
 *
 * A REAL SERVER ON A REAL PORT, deliberately. MockMvc would prove nothing here:
 * it does not use the servlet container's thread pool, which is the entire
 * subject.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RequestPerThreadTest {

    /*
        THE CONTROLLER LIVES IN Ep04ProbeController, top level and in this
        package, because a nested static class is not component scanned here.
        Nested, every request came back 404 and the timing test reported it as
        a 3 ms response, which is how a timing test ends up measuring an error
        page.
    */
    static final long BLOCK_MS = Ep04ProbeController.BLOCK_MS;

    @LocalServerPort
    int port;

    /*
        ASSERT THE RESPONSE, NOT JUST THE CLOCK. The first version timed the
        request and ignored what came back, and reported that /ep04/slow
        answered in 3 ms. A 404 answers very fast indeed. A timing test that
        does not check the status is measuring the error page.
    */
    private long timeGet(String path) throws Exception {
        HttpClient c = HttpClient.newHttpClient();
        long t0 = System.currentTimeMillis();
        HttpResponse<String> res = c.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).build(),
                HttpResponse.BodyHandlers.ofString());
        long ms = System.currentTimeMillis() - t0;
        assertThat(res.statusCode()).as("GET %s returned %s, body %s", path, res.statusCode(), res.body())
                .isEqualTo(200);
        return ms;
    }

    @Test
    void a_slow_handler_does_not_delay_other_requests() throws Exception {
        long idle = timeGet("/ep04/ping");

        // Fire the slow one on another thread, let it get into the sleep, then
        // time a ping that arrives while it is still in there.
        CompletableFuture<Long> slow = CompletableFuture.supplyAsync(() -> {
            try { return timeGet("/ep04/slow"); } catch (Exception e) { throw new RuntimeException(e); }
        });
        Thread.sleep(200);
        long during = timeGet("/ep04/ping");
        long slowMs = slow.join();

        System.out.printf("GET /ep04/ping with the server idle    %d ms%n", idle);
        System.out.printf("GET /ep04/ping while /slow is running  %d ms%n", during);
        System.out.printf("GET /ep04/slow itself                  %d ms%n", slowMs);

        assertThat(slowMs).as("the slow handler really did block its own thread").isGreaterThan(1000);
        assertThat(during).as("but it did not block anybody else's").isLessThan(500);
    }
}
