package dev.codewithsam.ratelimitapi;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.context.ConfigurableApplicationContext;

/**
 * EPISODE 21, B: behind a proxy. Every request arrives from 127.0.0.1, the client in
 * X-Forwarded-For as the proxy appended it. Three forward-headers strategies.
 */
class ProxyTest {

    @Test
    void strategies() throws Exception {
        for (String strategy : new String[] {"none", "native", "framework"}) {
            try (ConfigurableApplicationContext app = Probe.start(Map.of("server.forward-headers-strategy", strategy))) {
                String one = Probe.burst(app, i -> "203.0.113.7", 3);
                String two = Probe.burst(app, i -> "198.51.100.9", 1);
                String spoof = Probe.burst(app, i -> "9.9.9." + i + ", 203.0.113.99", 6);
                System.out.println("  Spring, B, forward-headers-strategy " + strategy + ", client one x3: " + one + "; client two, first request: " + two);
                System.out.println("  Spring, B, forward-headers-strategy " + strategy + ", a client writing its own X-Forwarded-For, six requests: " + spoof);
            }
        }
    }
}
