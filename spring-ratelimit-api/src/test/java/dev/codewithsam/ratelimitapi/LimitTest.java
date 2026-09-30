package dev.codewithsam.ratelimitapi;

import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.context.ConfigurableApplicationContext;

/** EPISODE 21, A and D: five requests against three a minute; health not counted; login at one. */
class LimitTest {

    @Test
    void limit() throws Exception {
        try (ConfigurableApplicationContext app = Probe.start(Map.of())) {
            List<String> statuses = new ArrayList<>();
            HttpResponse<String> first = null;
            HttpResponse<String> refused = null;
            for (int i = 0; i < 5; i++) {
                HttpResponse<String> res = Probe.send(app, "GET", "/payments", null);
                statuses.add(String.valueOf(res.statusCode()));
                if (first == null) first = res;
                if (res.statusCode() == 429 && refused == null) refused = res;
            }
            System.out.println("  Spring, A, five requests, limit 3: " + String.join(" ", statuses));
            System.out.println("  Spring, A, on the first 200, x-rate-limit-remaining: " + first.headers().firstValue("x-rate-limit-remaining").orElse(null));
            System.out.println("  Spring, A, on the 429, retry-after: " + refused.headers().firstValue("retry-after").orElse(null));

            List<String> health = new ArrayList<>();
            for (int i = 0; i < 5; i++) health.add(String.valueOf(Probe.send(app, "GET", "/health", null).statusCode()));
            System.out.println("  Spring, D, health skipped by the filter, five requests: " + String.join(" ", health));
            List<String> login = new ArrayList<>();
            for (int i = 0; i < 3; i++) login.add(String.valueOf(Probe.send(app, "POST", "/login", null).statusCode()));
            System.out.println("  Spring, D, login bucket of 1, three requests: " + String.join(" ", login));
        }
    }
}
