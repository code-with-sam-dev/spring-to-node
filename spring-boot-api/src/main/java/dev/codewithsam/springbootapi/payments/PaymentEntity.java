package dev.codewithsam.springbootapi.payments;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;

/**
 * The TypeORM equivalent is almost the same file, decorator for annotation.
 *
 * <p>The difference that does NOT show on the page: this object is MANAGED.
 * Load it inside a transaction, mutate a field, and Hibernate writes the change
 * back on flush without you calling save(). A TypeORM entity is a plain object
 * and nothing happens until you call save() yourself.
 */
@Entity
@Table(name = "payments")
public class PaymentEntity {

  @Id @GeneratedValue private UUID id;

  @Column(name = "amount_in_minor_units", nullable = false)
  private Long amountInMinorUnits;

  @Column(nullable = false, length = 3)
  private String currency;

  @Column(name = "idempotency_key", nullable = false, length = 100)
  private String idempotencyKey;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected PaymentEntity() {}

  public PaymentEntity(Long amountInMinorUnits, String currency, String idempotencyKey) {
    this.amountInMinorUnits = amountInMinorUnits;
    this.currency = currency;
    this.idempotencyKey = idempotencyKey;
  }

  public UUID getId() {
    return id;
  }

  public Long getAmountInMinorUnits() {
    return amountInMinorUnits;
  }

  public String getCurrency() {
    return currency;
  }

  public String getIdempotencyKey() {
    return idempotencyKey;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Payment toPayment() {
    return new Payment(
        "pay_" + id, amountInMinorUnits, currency, idempotencyKey, createdAt);
  }
}
