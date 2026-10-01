package dev.codewithsam.events;

/** EPISODE 29: the events, one record each. */
public final class PaymentEvents {

    public record Fails(String id) {
    }

    public record Slow(String id) {
    }

    public record SlowAsync(String id) {
    }

    public record Created(String id) {
    }

    private PaymentEvents() {
    }
}
