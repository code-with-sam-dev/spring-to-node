package dev.codewithsam.springbootapi.ep03;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.NoSuchBeanDefinitionException;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * What Spring's container actually promises, measured rather than remembered.
 *
 * THE EPISODE'S CLAIM is that Spring's container is AMBIENT and NestJS's is
 * not: once a bean is scanned, it is reachable from anywhere in the context,
 * with no export and no import. That is the difference a Spring developer feels
 * first, and it is worth proving both halves of.
 *
 * SO THIS TEST PROVES THE BOUNDARY IS THE SCAN, NOT A MODULE. A bean inside the
 * scanned packages is available to everything in the context, whatever package
 * it lives in and whoever asks for it. A bean outside them does not exist at
 * all. There is no third state, no equivalent of "declared but not exported",
 * and that missing third state is precisely what catches people out in NestJS.
 *
 * Written as a bare AnnotationConfigApplicationContext rather than a
 * @SpringBootTest slice so the scanned packages are explicit in the test. A
 * slice would inherit the application's own scan and prove nothing about where
 * the boundary is.
 */
class ComponentScanTest {

    @Component
    static class ScannedClock {
        String now() {
            return "scanned";
        }
    }

    @Component
    static class Consumer {
        private final ScannedClock clock;

        Consumer(ScannedClock clock) {
            this.clock = clock;
        }

        String stamp() {
            return "receipt at " + clock.now();
        }
    }

    @Configuration
    @ComponentScan(basePackageClasses = ComponentScanTest.class)
    static class ScansThisPackage {
    }

    /**
     * There is nothing to export and nothing to import. The bean is scanned, so
     * it is simply there, and the consumer's constructor is satisfied by type.
     */
    @Test
    void a_scanned_bean_is_available_with_no_export_and_no_import() {
        try (var ctx = new AnnotationConfigApplicationContext(ScansThisPackage.class)) {
            assertThat(ctx.getBean(Consumer.class).stamp()).isEqualTo("receipt at scanned");
            // And the container will hand it over to anyone who asks, which is
            // exactly what "ambient" means and exactly what NestJS will not do.
            assertThat(ctx.getBean(ScannedClock.class)).isNotNull();
        }
    }

    @Configuration
    static class ScansNothing {
    }

    /**
     * And outside the scan there is no bean at all. Not private, not
     * unexported: ABSENT. That is why Spring has no concept matching NestJS's
     * exports, and why a Spring developer has no instinct for the failure.
     */
    @Test
    void a_bean_outside_the_scan_does_not_exist() {
        try (var ctx = new AnnotationConfigApplicationContext(ScansNothing.class)) {
            assertThatThrownBy(() -> ctx.getBean(ScannedClock.class))
                    .isInstanceOf(NoSuchBeanDefinitionException.class);
        }
    }
}
