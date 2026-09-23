package dev.codewithsam.springbootapi.ep09;

import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/**
 * A SECOND CLASS WITH THE SAME SIMPLE NAME AS ONE IN THE MAIN APPLICATION.
 *
 * dev.codewithsam.springbootapi.payments.CreatePaymentRequest already exists and
 * constrains currency with @Pattern("USD|EUR|GBP|ZAR"). This one constrains it
 * with @Size(3,3) instead. Different package, different rules, same simple name.
 *
 * Found by accident: the first version of Ep09DocsTest used this name and the
 * schema came back carrying the OTHER class's pattern. Nothing warned.
 */
@RestController
public class Ep09Collision {

    public record CreatePaymentRequest(
            long amountInMinorUnits,
            @Size(min = 3, max = 3) String currency,
            String idempotencyKey) {
    }

    @PostMapping("/ep09/collides")
    public CreatePaymentRequest collides(@RequestBody CreatePaymentRequest request) {
        return request;
    }
}
