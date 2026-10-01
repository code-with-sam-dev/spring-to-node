package dev.codewithsam.events;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;

/** EPISODE 29 PROBES, Spring: application events, what the publisher sees, and the transaction. */
@SpringBootTest
class EventsProbeTest {

    @Autowired ApplicationEventPublisher events;
    @Autowired ReceiptListener listener;
    @Autowired JdbcTemplate jdbc;
    @Autowired TransactionTemplate tx;

    @Test
    void throwing() {
        String outcome;
        try {
            events.publishEvent(new PaymentEvents.Fails("pay_1"));
            outcome = "returned normally";
        } catch (Exception e) {
            outcome = "threw " + e.getClass().getSimpleName() + ": " + e.getMessage();
        }
        System.out.println("  Spring, A, @EventListener that throws: publishEvent " + outcome);
    }

    @Test
    void waits() {
        long t = System.nanoTime();
        events.publishEvent(new PaymentEvents.Slow("pay_1"));
        System.out.printf("  Spring, B, @EventListener that takes 300 ms: publishEvent returned after %d ms%n", (System.nanoTime() - t) / 1_000_000);
        t = System.nanoTime();
        events.publishEvent(new PaymentEvents.SlowAsync("pay_1"));
        System.out.printf("  Spring, B, @Async @EventListener that takes 300 ms: publishEvent returned after %d ms%n", (System.nanoTime() - t) / 1_000_000);
    }

    @Test
    void transaction() {
        jdbc.execute("CREATE TABLE IF NOT EXISTS payments (id VARCHAR(40) PRIMARY KEY)");
        try {
            tx.executeWithoutResult(status -> {
                jdbc.update("INSERT INTO payments (id) VALUES ('pay_rolled_back')");
                events.publishEvent(new PaymentEvents.Created("pay_rolled_back"));
                throw new IllegalStateException("payment declined");
            });
        } catch (IllegalStateException expected) {
            // the transaction rolled back
        }
        Integer rows = jdbc.queryForObject("SELECT count(*) FROM payments WHERE id = 'pay_rolled_back'", Integer.class);
        System.out.println("  Spring, C, publish inside a transaction that rolled back: payments in the database " + rows
            + ", @EventListener receipts " + listener.receiptsFor("pay_rolled_back")
            + ", @TransactionalEventListener receipts " + listener.afterCommitFor("pay_rolled_back"));
        listener.order().clear();
        tx.executeWithoutResult(status -> {
            jdbc.update("INSERT INTO payments (id) VALUES ('pay_committed')");
            events.publishEvent(new PaymentEvents.Created("pay_committed"));
            listener.order().add("the publisher continued, then the transaction committed");
        });
        System.out.println("  Spring, C, the order on commit: " + String.join("; ", listener.order()));
        System.out.println("  Spring, C, publish inside a transaction that committed: @TransactionalEventListener receipts "
            + listener.afterCommitFor("pay_committed"));
    }
}
