package dev.codewithsam.events;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

/** EPISODE 29: listeners for each probe. Receipts are recorded so the probe can count them. */
@Component
public class ReceiptListener {

    private final List<String> receipts = new CopyOnWriteArrayList<>();
    private final List<String> afterCommit = new CopyOnWriteArrayList<>();

    /** Methods, not fields: @Async puts a proxy in front of this bean, and a proxy has no fields. */
    public long receiptsFor(String id) {
        return receipts.stream().filter(id::equals).count();
    }

    public long afterCommitFor(String id) {
        return afterCommit.stream().filter(id::equals).count();
    }

    @EventListener
    void fails(PaymentEvents.Fails event) {
        throw new IllegalStateException("mail server busy");
    }

    @EventListener
    void slow(PaymentEvents.Slow event) throws InterruptedException {
        Thread.sleep(300);
    }

    @Async
    @EventListener
    void slowAsync(PaymentEvents.SlowAsync event) throws InterruptedException {
        Thread.sleep(300);
    }

    @EventListener
    void receipt(PaymentEvents.Created event) {
        receipts.add(event.id());
    }

    @TransactionalEventListener
    void receiptAfterCommit(PaymentEvents.Created event) {
        afterCommit.add(event.id());
    }
}
