package dev.codewithsam.springbootapi.ep09;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The documented fix for the collision in Ep09DocsTest: springdoc.use-fqn names
 * schemas by fully qualified class name, so the two CreatePaymentRequest
 * records become two schemas, each with its own rules.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "springdoc.use-fqn=true")
class Ep09FqnTest {

    @LocalServerPort
    int port;

    @Test
    void fullyQualifiedNamesKeepTheTwoSchemasApart() throws Exception {
        HttpResponse<String> res = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/v3/api-docs")).build(),
                HttpResponse.BodyHandlers.ofString());
        JsonNode schemas = new ObjectMapper().readTree(res.body()).path("components").path("schemas");

        List<String> names = new ArrayList<>();
        schemas.fieldNames().forEachRemaining(n -> { if (n.endsWith("CreatePaymentRequest")) names.add(n); });

        System.out.println("=== Spring, springdoc.use-fqn=true ===");
        for (String n : names) {
            System.out.println("  " + n + "  currency " + schemas.path(n).path("properties").path("currency"));
        }
        assertThat(names).as("two schemas, one per class").hasSize(2);
    }
}
