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
 * The domain exception with NOTHING translating it: the Spring row of the
 * three-shape comparison, reproducible from a fresh checkout.
 *
 * Ep07Advice is switched off here, so InsufficientFunds reaches Spring's
 * default error handling and becomes a generic 500, the same as NestJS without
 * its filter. ThrownResponseTest measures the same route with the advice on.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "ep07.advice=off")
class NoAdviceTest {

    @LocalServerPort
    int port;

    @Test
    void a_domain_exception_with_no_advice_is_a_generic_500() throws Exception {
        HttpResponse<String> res = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/ep07/domain")).build(),
                HttpResponse.BodyHandlers.ofString());
        System.out.printf("GET %-16s %d  %s%n", "/ep07/domain", res.statusCode(), res.body());
        assertThat(res.statusCode()).isEqualTo(500);
        assertThat(res.body()).doesNotContain("short by");
    }
}
