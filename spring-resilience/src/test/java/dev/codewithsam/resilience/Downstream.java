package dev.codewithsam.resilience;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * EPISODE 23. The payments API: answers 500 while it is down and 200 once it is back, and records
 * the moment of every request it receives, per path.
 */
final class Downstream implements AutoCloseable {

    final HttpServer server;
    final AtomicBoolean down = new AtomicBoolean(true);
    final Map<String, List<Long>> hits = new ConcurrentHashMap<>();

    Downstream() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        server.createContext("/", exchange -> {
            hits.computeIfAbsent(exchange.getRequestURI().getPath(), p -> new CopyOnWriteArrayList<>()).add(System.nanoTime());
            exchange.getRequestBody().readAllBytes();
            boolean fail = down.get();
            byte[] body = (fail ? "{\"error\":\"payments down\"}" : "{\"status\":\"settled\"}").getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(fail ? 500 : 200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
    }

    String url() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    int hits(String path) {
        return hits.getOrDefault(path, List.of()).size();
    }

    /** Milliseconds of each hit after the first, rounded to tens. */
    String timeline(String path) {
        List<Long> t = hits.getOrDefault(path, List.of());
        StringBuilder out = new StringBuilder();
        for (long n : t) out.append(out.isEmpty() ? "" : ", ").append(Math.round((n - t.get(0)) / 1e7) * 10).append(" ms");
        return out.toString();
    }

    @Override
    public void close() {
        server.stop(0);
    }
}
