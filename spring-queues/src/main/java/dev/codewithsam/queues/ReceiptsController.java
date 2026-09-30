package dev.codewithsam.queues;

import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
class ReceiptsController {

    private final Mailer mailer;

    ReceiptsController(Mailer mailer) {
        this.mailer = mailer;
    }

    @PostMapping("/receipts")
    Map<String, Integer> enqueue(@RequestParam(defaultValue = "5") int count, @RequestParam(defaultValue = "2000") long ms) {
        for (int i = 1; i <= count; i++) mailer.send("r" + i, ms);
        return Map.of("accepted", count);
    }

    @PostMapping("/receipts/flaky")
    Map<String, Integer> flaky() {
        mailer.sendFailing("flaky");
        return Map.of("accepted", 1);
    }

    @PostMapping("/receipts/flaky-future")
    Map<String, Object> flakyFuture() {
        try {
            mailer.sendFailingWithResult("flaky-future").join();
            return Map.of("accepted", 1);
        } catch (Exception e) {
            return Map.of("failed", e.getCause().getMessage());
        }
    }
}
