package dev.codewithsam.ratelimitapi;

import java.net.URI;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.context.ConfigurableApplicationContext;

/**
 * EPISODE 21, E: two signed-in users behind one address. Keyed by address, then by user.
 * The X-User header stands in for a verified identity.
 */
class IdentityTest {

    static int as(ConfigurableApplicationContext app, String user) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + Probe.port(app) + "/payments")).header("X-User", user).build();
        return Probe.HTTP.send(req, HttpResponse.BodyHandlers.ofString()).statusCode();
    }

    @Test
    void addressThenUser() throws Exception {
        for (boolean byUser : new boolean[] {false, true}) {
            try (ConfigurableApplicationContext app = Probe.start(Map.of("ratelimit.by-user", byUser))) {
                List<String> alice = new ArrayList<>();
                for (int i = 0; i < 3; i++) alice.add(String.valueOf(as(app, "alice")));
                System.out.println("  Spring, E, keyed by " + (byUser ? "user" : "address") + ", alice x3: " + String.join(" ", alice) + "; bob, first request: " + as(app, "bob"));
            }
        }
    }
}
