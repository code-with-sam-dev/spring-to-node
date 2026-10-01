package dev.codewithsam.logging;

import java.util.concurrent.CompletableFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/** EPISODE 36: one request, four places that log. */
@RestController
public class PaymentsController {

    private static final Logger log = LoggerFactory.getLogger(PaymentsController.class);
    private final Payments payments;

    PaymentsController(Payments payments) {
        this.payments = payments;
    }

    @PostMapping("/pay")
    String pay() {
        log.info("controller: payment received");
        payments.charge();
        CompletableFuture.runAsync(() -> log.info("runAsync: receipt queued")).join();
        payments.notifyAsync().join();
        return "ok";
    }

    @Service
    static class Payments {
        private static final Logger log = LoggerFactory.getLogger(Payments.class);

        void charge() {
            log.info("service: card charged");
        }

        @Async
        CompletableFuture<Void> notifyAsync() {
            log.info("@Async: customer notified");
            return CompletableFuture.completedFuture(null);
        }
    }
}
