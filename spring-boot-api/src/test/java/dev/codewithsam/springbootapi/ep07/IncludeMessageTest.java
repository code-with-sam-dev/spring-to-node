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
 * Getting Spring's suppressed message back, measured rather than looked up.
 *
 * ThrownResponseTest showed a ResponseStatusException carrying "no payment with
 * that id" arriving at the client with no message at all. The reference page on
 * servlet web applications does not document the property that controls it, so
 * rather than hunt through the appendix this test simply sets it and reads the
 * response.
 *
 * WHY THE DEFAULT IS THE RIGHT ONE, and the episode should say so rather than
 * treating it as an annoyance: an exception message is written for a developer
 * reading a log, not for a stranger holding a browser. Turning it on globally
 * puts every message your code throws in front of whoever asks.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "server.error.include-message=always")
class IncludeMessageTest {

    @LocalServerPort
    int port;

    private String get(String path) throws Exception {
        return HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(
                        URI.create("http://localhost:" + port + path)).build(),
                HttpResponse.BodyHandlers.ofString()).body();
    }

    /*
        TWO ENDPOINTS, TO TELL TWO EXPLANATIONS APART. The first run asserted
        only on the ResponseStatusException and failed, which could mean either
        that the property does nothing or that a ResponseStatusException's
        REASON is not surfaced as the message attribute. A plain exception with
        an ordinary getMessage() separates the two.
    */
    @Test
    void which_messages_does_include_message_actually_restore() throws Exception {
        String framework = get("/ep07/framework");
        String plain = get("/ep07/plain");

        System.out.println("with server.error.include-message=always:");
        System.out.println("  ResponseStatusException  " + framework);
        System.out.println("  IllegalStateException    " + plain);

        /*
            THIS ASSERTS WHAT WAS MEASURED, NOT WHAT I EXPECTED.

            `server.error.include-message` exists in the configuration metadata
            of this Spring Boot version, and setting it to `always` restored
            NEITHER message: not the ResponseStatusException's reason, and not a
            plain exception's getMessage. Measured on Spring Boot 4.1.1,
            September 2026.

            I do not yet know why, and I am not going to guess in a repository
            that a course points at. Two candidates worth investigating: the
            error response may have moved to RFC 9457 ProblemDetail in Boot 4,
            or the property may not reach the error machinery when set through
            @SpringBootTest rather than a real application.properties.

            So the test pins the OBSERVED behaviour. If a future version starts
            including the message, this fails and tells us, which is exactly the
            notice we want. What the episode may say: Spring suppresses the
            message by default. What it may NOT say: how to turn it back on,
            because the obvious answer did not work here.
        */
        assertThat(plain)
                .as("MEASURED: the message is absent even with include-message=always")
                .doesNotContain("the gateway is on fire");
        assertThat(framework)
                .as("MEASURED: the reason is absent too")
                .doesNotContain("no payment with that id");
    }
}
