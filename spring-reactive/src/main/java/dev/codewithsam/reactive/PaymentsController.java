package dev.codewithsam.reactive;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

/** EPISODE 34: a stream returned from a handler, flatMap's concurrency, and a client that leaves. */
@RestController
public class PaymentsController {

    private final AtomicInteger charged = new AtomicInteger();

    @GetMapping("/payments/ids")
    Flux<Integer> ids() {
        return Flux.just(1, 2, 3);
    }

    @GetMapping("/fanout")
    Mono<Map<String, Integer>> fanout(@RequestParam int n) {
        AtomicInteger inFlight = new AtomicInteger();
        AtomicInteger peak = new AtomicInteger();
        return Flux.range(1, n)
            .flatMap(i -> Mono.delay(Duration.ofMillis(200))
                .doOnSubscribe(s -> peak.accumulateAndGet(inFlight.incrementAndGet(), Math::max))
                .doFinally(s -> inFlight.decrementAndGet()))
            .count()
            .map(done -> Map.of("done", done.intValue(), "peakInFlight", peak.get()));
    }

    @GetMapping("/slow")
    Mono<String> slow() {
        return Mono.delay(Duration.ofSeconds(2)).map(x -> {
            charged.incrementAndGet();
            return "charged";
        });
    }

    @GetMapping("/stats")
    Map<String, Integer> stats() {
        return Map.of("charged", charged.get());
    }
}
