package dev.codewithsam.springbootapi.ep11;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * What a Spring developer gets for a session, and what a browser on another
 * origin is told, with nothing configured on either question.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class Ep11SessionTest {

    @LocalServerPort
    int port;

    private HttpResponse<String> get(String path, String cookie, String origin) throws Exception {
        var b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path));
        if (cookie != null) b.header("Cookie", cookie);
        if (origin != null) b.header("Origin", origin);
        return HttpClient.newHttpClient().send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void aSessionExistsWithNothingConfigured() throws Exception {
        HttpResponse<String> first = get("/ep11/visit", null, null);
        List<String> setCookie = first.headers().allValues("set-cookie");
        String cookie = setCookie.isEmpty() ? null : setCookie.get(0).split(";")[0];
        HttpResponse<String> second = get("/ep11/visit", cookie, null);

        System.out.println("=== Spring, HttpSession, nothing configured ===");
        System.out.println("  first   " + first.body() + "   set-cookie: " + setCookie);
        System.out.println("  second  " + second.body() + "   (sent back " + cookie + ")");

        assertThat(cookie).as("a session cookie is issued without being asked").startsWith("JSESSIONID=");
        assertThat(setCookie.get(0)).as("and it is HttpOnly by default").containsIgnoringCase("HttpOnly");
        assertThat(second.body()).as("state survives between requests").contains("\"visits\":2");
    }

    @Test
    void whatACrossOriginCallerIsToldWithNothingConfigured() throws Exception {
        HttpResponse<String> res = get("/ep11/plain", null, "https://evil.example");

        System.out.println("=== Spring, cross-origin GET, nothing configured ===");
        System.out.println("  status " + res.statusCode());
        System.out.println("  access-control-allow-origin: "
                + res.headers().firstValue("access-control-allow-origin").orElse("(absent)"));

        assertThat(res.headers().firstValue("access-control-allow-origin"))
                .as("no CORS header, so a browser on another origin cannot read the response")
                .isEmpty();
    }

    @Test
    void thePatternSpellingReflectsAnyOriginWithCredentials() throws Exception {
        HttpResponse<String> pattern = get("/ep11/cors/pattern", null, "https://evil.example");

        System.out.println("=== Spring, originPatterns=\"*\" with credentials ===");
        System.out.println("  status " + pattern.statusCode()
                + "  allow-origin " + pattern.headers().firstValue("access-control-allow-origin").orElse("(absent)")
                + "  credentials " + pattern.headers().firstValue("access-control-allow-credentials").orElse("(absent)"));

        assertThat(pattern.headers().firstValue("access-control-allow-origin"))
                .as("the pattern spelling reflects any origin, exactly like origin: true in Nest")
                .contains("https://evil.example");
        assertThat(pattern.headers().firstValue("access-control-allow-credentials"))
                .contains("true");
    }

    private static String trimmed(String s) {
        return s == null ? "" : s.length() > 160 ? s.substring(0, 160) + "..." : s;
    }

    @Test
    void aDefaultSessionExpires() throws Exception {
        HttpResponse<String> res = get("/ep11/timeout", null, null);

        System.out.println("=== Spring, default HttpSession expiry ===");
        System.out.println("  " + res.body());

        assertThat(res.body())
                .as("thirty minutes of inactivity, set by default, so abandoned sessions are removed")
                .contains("\"maxInactiveIntervalSeconds\":1800");
    }
}
