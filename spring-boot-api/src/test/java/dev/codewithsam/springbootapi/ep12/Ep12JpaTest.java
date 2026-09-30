package dev.codewithsam.springbootapi.ep12;

import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.support.TransactionTemplate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * EPISODE 13, THE SPRING HALF. The same questions probes.ts asks of TypeORM:
 *   A  findById(null)
 *   B  load, change a field, commit, never call save()
 *   D  a 64 bit value, read back
 *   E  how many statements save() sends for a new entity
 */
@SpringBootTest(properties = {
        "spring.jpa.properties.hibernate.generate_statistics=true",
        "spring.jpa.hibernate.ddl-auto=update"})
class Ep12JpaTest {

    @Autowired
    Ep12AccountRepository repo;

    @Autowired
    TransactionTemplate tx;

    @Autowired
    EntityManagerFactory emf;

    @Test
    void theJpaAnswers() {
        repo.deleteAll();
        repo.save(new Ep12Account("alice", 5000L));
        repo.save(new Ep12Account("bob", 9007199254740993L));

        System.out.println("=== Spring, A: findById with a missing id ===");
        try {
            repo.findById(null);
            System.out.println("  findById(null)  ->  returned");
        } catch (RuntimeException e) {
            System.out.println("  findById(null)  ->  threw " + e.getClass().getSimpleName());
        }

        System.out.println("=== Spring, B: load, change a field, commit, never call save() ===");
        tx.executeWithoutResult(s -> repo.findByOwner("alice").orElseThrow().setOwner("alice-renamed"));
        boolean found = repo.findByOwner("alice-renamed").isPresent();
        System.out.println("  row with owner 'alice-renamed' after commit: " + (found ? "found" : "not found"));

        System.out.println("=== Spring, D: a Long, read back ===");
        Long bob = repo.findByOwner("bob").orElseThrow().getBalanceInMinorUnits();
        System.out.println("  balanceInMinorUnits = " + bob + "   (exact value 9007199254740993)");

        System.out.println("=== Spring, E: repository.save() on a new entity ===");
        Statistics stats = emf.unwrap(SessionFactory.class).getStatistics();
        stats.clear();
        repo.save(new Ep12Account("carol", 1L));
        System.out.println("  statements prepared: " + stats.getPrepareStatementCount());

        assertThat(found).as("dirty checking wrote the change without save()").isTrue();
        assertThat(bob).isEqualTo(9007199254740993L);
        repo.deleteAll();
    }
}
