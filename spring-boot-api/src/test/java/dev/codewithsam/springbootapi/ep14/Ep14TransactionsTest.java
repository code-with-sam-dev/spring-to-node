package dev.codewithsam.springbootapi.ep14;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * EPISODE 15, THE SPRING HALF. The same questions probes.ts asks of TypeORM:
 *   A  a @Transactional method saves twice, then throws
 *   B  the same method called through `this` (self-invocation)
 *   C  ten concurrent requests, same key, check then insert, no constraint
 *   D  the same with a unique constraint
 *   E  the constraint, with the violation translated into the existing payment
 */
@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=update")
class Ep14TransactionsTest {

    @Autowired Ep14LedgerService service;
    @Autowired Ep14LedgerRepository ledger;
    @Autowired Ep14LooseRepository loose;
    @Autowired Ep14KeyedRepository keyed;

    @Test
    void theSpringAnswers() throws Exception {
        ledger.deleteAll();
        System.out.println("=== Spring, A: @Transactional saves twice, then throws ===");
        try { service.post(); } catch (IllegalStateException expected) { }
        System.out.println("  rows left after the error: " + ledger.count());

        ledger.deleteAll();
        System.out.println("=== Spring, B: the same method, called through this ===");
        try { service.postFromInside(); } catch (IllegalStateException expected) { }
        System.out.println("  rows left after the error: " + ledger.count());
        System.out.println("  which: " + ledger.findAll().stream().map(Ep14LedgerEntry::getNote).toList());

        loose.deleteAll();
        race("Spring, C: 10 concurrent requests, same key, check then insert, no constraint",
                () -> { if (loose.existsByIdempotencyKey("pay-42")) return "duplicate, returned existing"; loose.save(new Ep14LoosePayment("pay-42")); return "inserted"; });
        System.out.println("  rows with key pay-42: " + loose.countByIdempotencyKey("pay-42"));

        keyed.deleteAll();
        race("Spring, D: the same, with a unique constraint on the key",
                () -> { if (keyed.existsByIdempotencyKey("pay-42")) return "duplicate, returned existing"; keyed.save(new Ep14KeyedPayment("pay-42")); return "inserted"; });
        System.out.println("  rows with key pay-42: " + keyed.countByIdempotencyKey("pay-42"));

        keyed.deleteAll();
        race("Spring, E: the constraint, and the violation translated into the existing payment",
                () -> {
                    try { return "payment id " + keyed.save(new Ep14KeyedPayment("pay-42")).getId(); }
                    catch (DataIntegrityViolationException taken) { return "payment id " + keyed.findByIdempotencyKey("pay-42").orElseThrow().getId(); }
                });
        System.out.println("  rows with key pay-42: " + keyed.countByIdempotencyKey("pay-42"));

        assertThat(keyed.countByIdempotencyKey("pay-42")).isEqualTo(1);
    }

    private void race(String label, Callable<String> request) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(10);
        List<Future<String>> futures = new ArrayList<>();
        for (int i = 0; i < 10; i++) futures.add(pool.submit(request));
        Map<String, Integer> tally = new TreeMap<>();
        for (Future<String> f : futures) {
            String outcome;
            try { outcome = f.get(); } catch (Exception e) { outcome = "rejected: " + e.getCause().getClass().getSimpleName(); }
            tally.merge(outcome, 1, Integer::sum);
        }
        pool.shutdown();
        System.out.println("=== " + label + " ===");
        tally.forEach((k, v) -> System.out.println("  " + v + " x " + k));
    }
}
