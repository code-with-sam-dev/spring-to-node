package dev.codewithsam.springbootapi.payments;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

/** The NestJS equivalent is {@code @Injectable()} and it reads almost identically. */
@Service
public class PaymentsService {

  private final PaymentRepository payments;

  public PaymentsService(PaymentRepository payments) {
    this.payments = payments;
  }

  public Payment create(CreatePaymentRequest request) {
    PaymentEntity entity =
        new PaymentEntity(
            request.amountInMinorUnits(), request.currency(), request.idempotencyKey());
    return payments.save(entity).toPayment();
  }

  public Optional<Payment> findById(String id) {
    return parse(id).flatMap(payments::findById).map(PaymentEntity::toPayment);
  }

  public List<Payment> findAll() {
    return payments.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
        .map(PaymentEntity::toPayment)
        .toList();
  }

  /** Ids are exposed as pay_<uuid>, so strip the prefix before parsing. */
  private Optional<UUID> parse(String id) {
    try {
      return Optional.of(UUID.fromString(id.replaceFirst("^pay_", "")));
    } catch (IllegalArgumentException notAUuid) {
      return Optional.empty();
    }
  }
}
