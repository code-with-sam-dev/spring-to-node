package dev.codewithsam.securityapi;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** EPISODE 20: two endpoints. Refunds is the one "added later", with no security code of its own. */
@RestController
class PaymentsController {

    private final RefundService refunds;

    PaymentsController(RefundService refunds) {
        this.refunds = refunds;
    }

    @GetMapping("/refunds/approve")
    String approve() {
        return refunds.approve();
    }

    @GetMapping("/payments")
    String payments() {
        return "payments";
    }

    @GetMapping("/health")
    String health() {
        return "ok";
    }

    @GetMapping("/refunds")
    String refunds() {
        return "refunds";
    }
}
