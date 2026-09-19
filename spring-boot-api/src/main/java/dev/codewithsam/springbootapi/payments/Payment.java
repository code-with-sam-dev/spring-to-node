package dev.codewithsam.springbootapi.payments;

import java.time.Instant;

/**
 * The domain object. Kept separate from the request on purpose: keeping
 * transport input away from the thing you store is a habit that transfers to
 * NestJS unchanged.
 */
public record Payment(
    String id,
    Long amountInMinorUnits,
    String currency,
    String idempotencyKey,
    Instant createdAt) {}
