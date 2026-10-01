package dev.codewithsam.sse;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/** EPISODE 31: a payment status stream, one event a second, with an id on every event. */
@RestController
public class PaymentsStream {

    record Stream(SseEmitter emitter, AtomicLong next) {}

    private final CopyOnWriteArrayList<Stream> streams = new CopyOnWriteArrayList<>();
    private final AtomicLong produced = new AtomicLong();
    private final Map<String, String> ended = new ConcurrentHashMap<>();

    /** Off by default: the stream ignores Last-Event-ID, which is what you get if you never read it. */
    @Value("${resume:false}")
    boolean resume;

    @GetMapping("/sse/payments")
    SseEmitter payments(@RequestHeader(value = "Last-Event-ID", required = false) String lastEventId) {
        SseEmitter emitter = new SseEmitter();
        if (lastEventId != null) ended.put("lastEventIdSeen", lastEventId);
        long start = resume && lastEventId != null ? Long.parseLong(lastEventId) + 1 : 1;
        Stream stream = new Stream(emitter, new AtomicLong(start));
        emitter.onTimeout(() -> ended.put("reason", "timeout"));
        emitter.onCompletion(() -> streams.remove(stream));
        emitter.onError(e -> streams.remove(stream));
        streams.add(stream);
        return emitter;
    }

    @Scheduled(fixedRate = 1000)
    void tick() {
        for (Stream s : streams) {
            long id = s.next().getAndIncrement();
            try {
                s.emitter().send(SseEmitter.event().id(String.valueOf(id)).data("payment " + id));
                produced.incrementAndGet();
            } catch (IOException e) {
                streams.remove(s);
            }
        }
    }

    @GetMapping("/sse/stats")
    Map<String, Object> stats() {
        return Map.of("open", streams.size(), "produced", produced.get(), "ended", ended.getOrDefault("reason", "none"),
            "lastEventIdSeen", ended.getOrDefault("lastEventIdSeen", "none"));
    }
}
