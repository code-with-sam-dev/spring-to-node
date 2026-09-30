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
 * How much of an unannotated DTO reaches the OpenAPI document?
 *
 * The NestJS demo measured 0 of 3 properties for the same shape. This measures
 * the Spring side so the comparison is real in both directions rather than
 * assumed in one.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class Ep09DocsTest {

    @LocalServerPort
    int port;

    @Test
    void anUnannotatedRecordDocumentsItself() throws Exception {
        HttpResponse<String> res = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/v3/api-docs")).build(),
                HttpResponse.BodyHandlers.ofString());

        assertThat(res.statusCode())
                .as("springdoc serves the document with no configuration at all")
                .isEqualTo(200);

        JsonNode schema = new ObjectMapper().readTree(res.body())
                .path("components").path("schemas").path("Ep09PaymentRequest");

        List<String> properties = new ArrayList<>();
        schema.path("properties").fieldNames().forEachRemaining(properties::add);

        System.out.println("=== Spring, the same three fields, no OpenAPI annotations ===");
        System.out.println(schema.toPrettyString());
        for (String f : properties) {
            System.out.println("  schema " + f + " " + schema.path("properties").path(f));
        }
        System.out.println("properties documented: " + properties.size() + " of 3");
        System.out.println("required documented:   " + schema.path("required").size() + " of 3");

        assertThat(properties)
                .as("the record components reached the schema without being asked")
                .containsExactlyInAnyOrder("amountInMinorUnits", "currency", "idempotencyKey");

        assertThat(schema.path("properties").path("currency").path("maxLength").asInt())
                .as("@Size reached the schema, so the constraint is documented as well as enforced")
                .isEqualTo(3);
    }

    @Test
    void twoDtosWithTheSameSimpleNameSilentlyShareOneSchema() throws Exception {
        HttpResponse<String> res = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/v3/api-docs")).build(),
                HttpResponse.BodyHandlers.ofString());

        JsonNode schema = new ObjectMapper().readTree(res.body())
                .path("components").path("schemas").path("CreatePaymentRequest");

        System.out.println("=== Spring, two classes named CreatePaymentRequest ===");
        System.out.println("  payments.CreatePaymentRequest   currency is @Pattern(USD|EUR|GBP|ZAR)");
        System.out.println("  ep09.Ep09Collision.CreatePaymentRequest  currency is @Size(3,3)");
        System.out.println("what the document publishes for currency:");
        System.out.println("  " + schema.path("properties").path("currency").toString());

        // ONE schema, not two. The document cannot express both, and it does not
        // say so: no warning, no suffix, no error. One of the two endpoints is
        // now documented with the other's rules.
        assertThat(schema.isMissingNode()).isFalse();
        assertThat(schema.path("properties").path("currency").has("maxLength"))
                .as("the @Size(3,3) class did NOT win, and nothing said so")
                .isFalse();
        assertThat(schema.path("properties").path("currency").path("pattern").asText())
                .as("the other class's pattern is what both endpoints advertise")
                .isEqualTo("USD|EUR|GBP|ZAR");
    }
}
