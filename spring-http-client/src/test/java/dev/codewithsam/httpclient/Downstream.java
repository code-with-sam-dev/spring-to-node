package dev.codewithsam.httpclient;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * EPISODE 22. The API we call: counts every request it receives, per path. /slow answers after ten
 * seconds and records whether the caller had gone; /fail answers 500; /flaky/<id> answers 500 the
 * first time for each id and 200 after; anything else answers 200 with a small JSON body.
 */
final class Downstream implements AutoCloseable {

    final HttpServer server;
    final AtomicInteger requests = new AtomicInteger();
    final Map<String, AtomicInteger> hits = new ConcurrentHashMap<>();
    final List<String> events = new CopyOnWriteArrayList<>();

    Downstream() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        server.createContext("/", exchange -> {
            requests.incrementAndGet();
            String path = exchange.getRequestURI().getPath();
            int hit = hits.computeIfAbsent(path, p -> new AtomicInteger()).incrementAndGet();
            long began = System.nanoTime();
            if (path.equals("/slow")) {
                try {
                    Thread.sleep(10_000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                events.add(String.format("work finished after %.1f s", (System.nanoTime() - began) / 1e9));
            }
            boolean fail = path.equals("/fail") || (path.startsWith("/flaky/") && hit == 1);
            byte[] body = (fail ? "{\"error\":\"downstream failed\"}" : "{\"id\":\"pay_1\",\"status\":\"settled\"}").getBytes(StandardCharsets.UTF_8);
            try {
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(fail ? 500 : 200, body.length);
                exchange.getResponseBody().write(body);
                exchange.close();
            } catch (IOException e) {
                events.add("the answer could not be written: " + e.getClass().getSimpleName());
            }
        });
        server.start();
    }

    String url() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    int hits(String path) {
        return hits.getOrDefault(path, new AtomicInteger()).get();
    }

    static String closedPort() throws IOException {
        try (ServerSocket s = new ServerSocket(0)) {
            return "http://127.0.0.1:" + s.getLocalPort();
        }
    }

    @Override
    public void close() {
        server.stop(0);
    }
}
