package dev.codewithsam.springbootapi.ep14;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/**
 * The Spring half of episode 15's later probes:
 *   F  catch the duplicate inside one @Transactional method, then look up the existing payment
 *   H  the outbox: payment and event through the injected repositories, in one transaction
 *   I  check then insert at SERIALIZABLE, no constraint
 */
@Service
public class Ep14PaymentService {

    private final Ep14KeyedRepository keyed;
    private final Ep14LooseRepository loose;
    private final Ep14OutboxPaymentRepository payments;
    private final Ep14OutboxEventRepository outbox;

    public Ep14PaymentService(Ep14KeyedRepository keyed, Ep14LooseRepository loose,
                              Ep14OutboxPaymentRepository payments, Ep14OutboxEventRepository outbox) {
        this.keyed = keyed;
        this.loose = loose;
        this.payments = payments;
        this.outbox = outbox;
    }

    @Transactional
    public String catchInside() {
        try {
            keyed.save(new Ep14KeyedPayment("pay-42"));
            return "inserted";
        } catch (DataIntegrityViolationException taken) {
            System.out.println("  insert failed: " + taken.getClass().getSimpleName());
            return "lookup returned payment id " + keyed.findByIdempotencyKey("pay-42").orElseThrow().getId();
        }
    }

    @Transactional
    public void paymentAndEvent(boolean fail) {
        payments.save(new Ep14OutboxPayment(1000));
        outbox.save(new Ep14OutboxEvent("PaymentCreated"));
        if (fail) throw new IllegalStateException("boom");
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public String checkThenInsertSerializable() {
        if (loose.existsByIdempotencyKey("pay-42")) return "duplicate, returned existing";
        loose.save(new Ep14LoosePayment("pay-42"));
        return "inserted";
    }
}
