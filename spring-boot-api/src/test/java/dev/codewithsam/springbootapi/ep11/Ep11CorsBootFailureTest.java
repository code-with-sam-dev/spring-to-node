package dev.codewithsam.springbootapi.ep11;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * THE LITERAL WILDCARD WITH CREDENTIALS, IN A CONTEXT OF ITS OWN.
 *
 * Declared on a normal scanned controller, this combination stopped the whole
 * application from starting. That is the finding, so it is measured here as a
 * startup failure rather than as a response, in an application that contains
 * nothing else.
 *
 * Nested classes of a test are not component scanned, which is what keeps this
 * controller out of every other context in the suite.
 */
class Ep11CorsBootFailureTest {

    @RestController
    static class WildcardController {
        @CrossOrigin(origins = "*", allowCredentials = "true")
        @GetMapping("/wildcard")
        public Map<String, Object> wildcard() {
            return Map.of("ok", true);
        }
    }

    @Configuration
    @EnableAutoConfiguration
    @Import(WildcardController.class)
    static class Boot {
    }

    @Test
    void theApplicationRefusesToStart() {
        Throwable failure = null;
        try (ConfigurableApplicationContext ignored = new SpringApplicationBuilder(Boot.class)
                .web(WebApplicationType.SERVLET)
                .properties("server.port=0")
                .run()) {
            // reaching here means it started, which the assertion below reports
        } catch (Throwable t) {
            failure = t;
        }

        Throwable root = failure;
        while (root != null && root.getCause() != null) root = root.getCause();

        System.out.println("=== Spring, origins=\"*\" with allowCredentials=\"true\" ===");
        System.out.println("  the application started: " + (failure == null));
        System.out.println("  root cause: " + (root == null ? "(none)"
                : root.getClass().getSimpleName() + ": " + root.getMessage()));

        assertThat(failure).as("the application refuses to start").isNotNull();
        assertThat(root).isInstanceOf(IllegalArgumentException.class);
        assertThat(root.getMessage()).contains("allowCredentials").contains("\"*\"");
    }
}
