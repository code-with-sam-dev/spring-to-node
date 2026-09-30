package dev.codewithsam.ratelimitapi;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.IntFunction;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;

/** EPISODE 21: starts the app on a random port with the given properties, and sends real HTTP. */
final class Probe {

    static final HttpClient HTTP = HttpClient.newHttpClient();

    static ConfigurableApplicationContext start(Map<String, Object> properties) {
        Map<String, Object> props = new java.util.HashMap<>(properties);
        props.put("server.port", 0);
        return new SpringApplicationBuilder(RateLimitApiApplication.class).properties(props).logStartupInfo(false).run();
    }

    static int port(ConfigurableApplicationContext app) {
        return ((WebServerApplicationContext) app).getWebServer().getPort();
    }

    static HttpResponse<String> send(ConfigurableApplicationContext app, String method, String path, String forwardedFor) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port(app) + path)).method(method, HttpRequest.BodyPublishers.noBody());
        if (forwardedFor != null) b.header("X-Forwarded-For", forwardedFor);
        return HTTP.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    static String burst(ConfigurableApplicationContext app, IntFunction<String> forwardedFor, int n) throws Exception {
        List<String> out = new ArrayList<>();
        for (int i = 0; i < n; i++) out.add(String.valueOf(send(app, "GET", "/payments", forwardedFor.apply(i)).statusCode()));
        return String.join(" ", out);
    }

    private Probe() {
    }
}
