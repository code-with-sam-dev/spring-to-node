package dev.codewithsam.springbootapi.ep05;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Component;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Spring refuses to start, and that refusal is the thing that does not transfer.
 *
 * The NestJS demo shows a missing setting arriving as `undefined` while the
 * application starts happily. This is the other half: the same omission in
 * Spring stops the context on the developer's own machine, at startup, with the
 * name of the missing key in the message.
 *
 * That failure is a FEATURE a Spring developer has been relying on without
 * noticing, which is exactly why its absence catches them out. Nothing in
 * NestJS is broken; the safety net is simply not there until you hang it
 * yourself, which is what validated-config.ts does.
 *
 * A bare context rather than @SpringBootTest, so the property sources are
 * explicit in the test and no database is involved.
 */
class MissingPropertyTest {

    @Component
    static class NeedsGateway {
        final String url;

        NeedsGateway(@Value("${payment.gateway.url}") String url) {
            this.url = url;
        }
    }

    @Configuration
    static class WithoutTheProperty {
        @Bean
        static PropertySourcesPlaceholderConfigurer placeholders() {
            return new PropertySourcesPlaceholderConfigurer();
        }

        @Bean
        NeedsGateway needsGateway(@Value("${payment.gateway.url}") String url) {
            return new NeedsGateway(url);
        }
    }

    /*
        THE KEY NAME IS IN THE ROOT CAUSE, NOT THE TOP MESSAGE. The outermost
        exception says only "Unexpected exception during bean creation", so an
        assertion on getMessage() fails while the claim itself is perfectly
        true. The useful sentence, and the one that goes on screen, is further
        down the chain.
    */
    @Test
    void a_missing_property_stops_the_context_and_names_the_key() {
        Throwable thrown = org.assertj.core.api.Assertions.catchThrowable(
                () -> new AnnotationConfigApplicationContext(WithoutTheProperty.class));

        assertThat(thrown).as("the context must refuse to start").isNotNull();

        Throwable root = thrown;
        while (root.getCause() != null) root = root.getCause();
        System.out.println("Spring refused to start. Its words:");
        System.out.println("  " + root.getMessage());

        assertThat(root.getMessage())
                .as("the refusal must name the missing key")
                .contains("payment.gateway.url");
    }

    @Test
    void with_the_property_set_the_same_graph_starts() {
        System.setProperty("payment.gateway.url", "https://api.example.test/v2");
        try (var ctx = new AnnotationConfigApplicationContext(WithoutTheProperty.class)) {
            assertThat(ctx.getBean(NeedsGateway.class).url)
                    .isEqualTo("https://api.example.test/v2");
        } finally {
            System.clearProperty("payment.gateway.url");
        }
    }
}
