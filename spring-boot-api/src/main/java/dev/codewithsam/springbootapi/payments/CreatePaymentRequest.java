package dev.codewithsam.springbootapi.payments;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/**
 * The same record, now with Bean Validation on it.
 *
 * <p>The NestJS equivalent reads almost identically: {@code @Min(1)} is
 * {@code @Min(1)}, {@code @NotBlank} is {@code @IsNotEmpty()}, and a constrained
 * set is {@code @IsIn([...])}. The HABIT transfers completely.
 *
 * <p>What does not transfer is the assumption underneath. Here the Long type is
 * already enforced by Jackson before any of these annotations run. In NestJS
 * nothing enforces the declared type at all, so the decorators are not an extra
 * layer of safety: they are the ONLY layer.
 */
public record CreatePaymentRequest(
    @NotNull @Min(value = 1, message = "amountInMinorUnits must be at least 1")
        Long amountInMinorUnits,
    @NotNull @Pattern(regexp = "USD|EUR|GBP|ZAR", message = "currency must be a supported ISO code")
        String currency,
    @NotBlank(message = "idempotencyKey is required") String idempotencyKey) {}
