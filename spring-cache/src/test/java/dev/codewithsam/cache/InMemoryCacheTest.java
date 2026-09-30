package dev.codewithsam.cache;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "spring.cache.type=simple")
class InMemoryCacheTest extends CacheProbe {

    @Autowired PaymentsService payments;

    @Test
    void probes() throws Exception {
        run("in memory", payments);
    }
}
