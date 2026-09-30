package dev.codewithsam.ratelimitapi;

import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.context.ConfigurableApplicationContext;

/**
 * EPISODE 21, G: the edge of the window. Three a TWO SECOND window: three at once, one at 1 s,
 * then one at 2.2 s and one at 3.2 s. Retry-After recorded on each 429.
 */
class BoundaryTest {

    @Test
    void twoSecondWindow() throws Exception {
        try (ConfigurableApplicationContext app = Probe.start(Map.of("ratelimit.window-ms", 2000))) {
            List<String> log = new ArrayList<>();
            long t0 = System.currentTimeMillis();
            for (long ms : new long[] {0, 0, 0, 1000, 2200, 3200}) {
                long wait = t0 + ms - System.currentTimeMillis();
                if (wait > 0) Thread.sleep(wait);
                HttpResponse<String> res = Probe.send(app, "GET", "/payments", null);
                log.add(String.format("%.1fs %d%s", ms / 1000.0, res.statusCode(),
                    res.statusCode() == 429 ? " retry-after " + res.headers().firstValue("retry-after").orElse("") : ""));
            }
            System.out.println("  Spring, G, three per 2 s: " + String.join(", ", log));
        }
    }
}
