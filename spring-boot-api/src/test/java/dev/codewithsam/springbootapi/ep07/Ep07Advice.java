package dev.codewithsam.springbootapi.ep07;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * The Spring half of the filter comparison.
 *
 * Side by side with the NestJS filter in ep07-errors/filtered.ts, the shape is
 * almost the same idea in two spellings: name the type, choose the status,
 * choose the body.
 *
 *   Spring   ExceptionHandler(InsufficientFunds.class) on a RestControllerAdvice
 *   NestJS   Catch(InsufficientFunds) on a class implementing ExceptionFilter
 *
 * The difference worth a sentence is WHERE they sit. A RestControllerAdvice is
 * discovered by component scanning and applies to every controller without
 * being mentioned. A Nest filter is registered explicitly, with
 * useGlobalFilters or a UseFilters decorator, which is the same
 * explicit-over-ambient theme as modules in episode 4.
 */
@RestControllerAdvice
class Ep07Advice {

    @ExceptionHandler(Ep07ThrowController.InsufficientFunds.class)
    ResponseEntity<Map<String, Object>> onInsufficientFunds(
            Ep07ThrowController.InsufficientFunds ex) {
        // 402, for the same reason as the Nest filter: not a server fault, and
        // something the client can act on.
        return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(Map.of(
                "error", "insufficient_funds",
                "shortfallInMinorUnits", ex.shortfall(),
                "currency", "USD"));
    }
}
