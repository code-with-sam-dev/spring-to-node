package dev.codewithsam.resilience;

import org.springframework.resilience.annotation.Retryable;
import org.springframework.stereotype.Service;

/** EPISODE 23: a second retry layer above the gateway, the way nested retries happen. */
@Service
public class PaymentsFacade {

    private final PaymentsGateway gateway;

    PaymentsFacade(PaymentsGateway gateway) {
        this.gateway = gateway;
    }

    @Retryable(maxRetries = 2, delay = 200, multiplier = 2, jitter = 50)
    public String status() {
        return gateway.nested();
    }
}
