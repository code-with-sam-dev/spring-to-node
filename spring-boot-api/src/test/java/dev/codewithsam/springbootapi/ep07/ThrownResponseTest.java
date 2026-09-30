package dev.codewithsam.springbootapi.ep07;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * What Spring tells a client when a handler throws, and whether it survives.
 *
 * The NestJS demo showed a plain Error and a domain exception both arriving as
 * five generic words, and the application carrying on. This measures the same
 * three shapes on the Spring side so the comparison is real in both directions
 * rather than assumed in one.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ThrownResponseTest {

    @LocalServerPort
    int port;

    private HttpResponse<String> get(String path) throws Exception {
        return HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).build(),
                HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void what_the_client_is_told_for_each_shape() throws Exception {
        for (String path : new String[] { "/ep07/plain", "/ep07/framework", "/ep07/domain" }) {
            HttpResponse<String> res = get(path);
            System.out.printf("GET %-16s %d  %s%n", path, res.statusCode(), res.body());
        }

        // And the application carries on: each exception became a response
        // inside the request pipeline, and nothing else was affected.
        HttpResponse<String> alive = get("/ep07/ok");
        System.out.printf("%nstill answering afterwards: %s%n",
                alive.statusCode() == 200 ? "yes" : "NO");
        assertThat(alive.statusCode()).isEqualTo(200);
    }
}
