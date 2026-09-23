package dev.codewithsam.springbootapi.ep09;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * NOT ONE OpenAPI ANNOTATION IN THIS FILE. That is the measurement.
 *
 * The same three fields as the NestJS CreatePaymentDto, carrying the same
 * constraints in the local dialect. If springdoc documents them and
 * @nestjs/swagger does not, the difference is not effort, it is what survives
 * to the moment the document is generated.
 */
@RestController
@RequestMapping("/ep09")
public class Ep09DocsController {

    public record Ep09PaymentRequest(
            @Positive long amountInMinorUnits,
            @NotBlank @Size(min = 3, max = 3) String currency,
            @NotBlank String idempotencyKey) {
    }

    @PostMapping("/payments")
    public Ep09PaymentRequest create(@Valid @RequestBody Ep09PaymentRequest request) {
        return request;
    }
}
