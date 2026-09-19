package dev.codewithsam.springbootapi.payments;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * The left-hand side of every split screen in the flagship.
 *
 * <p>@RestController plus @RequestMapping is @Controller('payments') in Nest.
 * @PostMapping is @Post(). @RequestBody is @Body(). @PathVariable is @Param().
 * The shapes line up almost exactly, which is the point and also the trap.
 */
@RestController
@RequestMapping("/payments")
public class PaymentsController {

  private final PaymentsService payments;

  /** Constructor injection, which is the one thing that transfers completely. */
  public PaymentsController(PaymentsService payments) {
    this.payments = payments;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Payment create(@Valid @RequestBody CreatePaymentRequest request) {
    return payments.create(request);
  }

  @GetMapping
  public List<Payment> findAll() {
    return payments.findAll();
  }

  @GetMapping("/{id}")
  public Payment findOne(@PathVariable String id) {
    return payments.findById(id).orElseThrow(() -> new PaymentNotFoundException(id));
  }
}
