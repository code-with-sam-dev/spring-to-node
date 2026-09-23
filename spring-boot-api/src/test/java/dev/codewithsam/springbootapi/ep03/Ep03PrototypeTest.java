package dev.codewithsam.springbootapi.ep03;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;

import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Spring's prototype scope, counted in the same three shapes as the NestJS
 * transient demo, so the comparison is measured in both directions.
 *
 * A plain AnnotationConfigApplicationContext, with no web server and no
 * database, because scope is a container question and nothing else here is
 * needed to answer it.
 */
class Ep03PrototypeTest {

    static final AtomicInteger CREATED = new AtomicInteger();

    static class Counter {
        final int id = CREATED.incrementAndGet();
    }

    record ConsumerA(Counter c) {}
    record ConsumerB(Counter c) {}
    record TwiceInOne(Counter first, Counter second) {}

    @Configuration
    static class Config {
        @Bean
        @Scope("prototype")
        Counter counter() {
            return new Counter();
        }

        @Bean ConsumerA consumerA(Counter c) { return new ConsumerA(c); }
        @Bean ConsumerB consumerB(Counter c) { return new ConsumerB(c); }
        @Bean TwiceInOne twiceInOne(Counter first, Counter second) { return new TwiceInOne(first, second); }
    }

    @Test
    void countInstancesInTheSameThreeShapes() {
        CREATED.set(0);
        try (var ctx = new AnnotationConfigApplicationContext(Config.class)) {
            var a = ctx.getBean(ConsumerA.class);
            var b = ctx.getBean(ConsumerB.class);
            var t = ctx.getBean(TwiceInOne.class);
            int direct1 = ctx.getBean(Counter.class).id;
            int direct2 = ctx.getBean(Counter.class).id;

            System.out.println("=== Spring, prototype scope ===");
            System.out.println("  two different consumers        ids " + a.c().id + " and " + b.c().id
                    + "   " + (a.c().id != b.c().id ? "DIFFERENT" : "SAME"));
            System.out.println("  one consumer, injected twice   ids " + t.first().id + " and " + t.second().id
                    + "   " + (t.first().id != t.second().id ? "DIFFERENT" : "SAME"));
            System.out.println("  asked for directly, twice      ids " + direct1 + " and " + direct2
                    + "   " + (direct1 != direct2 ? "DIFFERENT" : "SAME"));

            assertThat(a.c().id).isNotEqualTo(b.c().id);
            assertThat(direct1).isNotEqualTo(direct2);
            // The shape where the two frameworks may disagree. Asserted as
            // OBSERVED, so a change in either framework fails loudly.
            assertThat(t.first().id)
                    .as("prototype gives each INJECTION POINT its own instance")
                    .isNotEqualTo(t.second().id);
        }
    }
}
