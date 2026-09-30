package dev.codewithsam.resilience;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.resilience.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/** EPISODE 23: calls to the payments API, retried by Spring Framework 7's own @Retryable. */
@Service
public class PaymentsGateway {

    private final RestClient http;

    PaymentsGateway(RestClient.Builder builder, @Value("${payments.url}") String url) {
        this.http = builder.baseUrl(url).build();
    }

    @Retryable
    public String statusWithDefaults() {
        return http.get().uri("/defaults").retrieve().body(String.class);
    }

    @Retryable(maxRetries = 2, delay = 200, multiplier = 2, jitter = 50)
    public String status() {
        return http.get().uri("/status").retrieve().body(String.class);
    }

    @Retryable(maxRetries = 2, delay = 200, multiplier = 2, jitter = 50)
    public String charge() {
        return http.post().uri("/charge").body("{\"amount\":100}").retrieve().body(String.class);
    }
}
