package dev.codewithsam.otel;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

/** EPISODE 37: a payment that calls the ledger service, two ways. */
@RestController
public class PaymentsController {

    private final RestClient instrumented;
    private final RestClient plain;

    PaymentsController(RestClient.Builder builder, @Value("${ledger-url}") String ledgerUrl) {
        this.instrumented = builder.baseUrl(ledgerUrl).build();
        this.plain = RestClient.create(ledgerUrl);
    }

    @GetMapping("/ledger")
    String ledger() {
        return "recorded";
    }

    @GetMapping("/pay")
    String pay() {
        return instrumented.get().uri("/ledger").retrieve().body(String.class);
    }

    @GetMapping("/pay-plain")
    String payPlain() {
        return plain.get().uri("/ledger").retrieve().body(String.class);
    }
}
