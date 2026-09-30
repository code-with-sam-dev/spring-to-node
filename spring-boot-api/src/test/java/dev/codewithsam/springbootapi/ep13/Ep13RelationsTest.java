package dev.codewithsam.springbootapi.ep13;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * EPISODE 14, THE SPRING HALF. The same three questions probes.ts asks of TypeORM:
 *   A  load 20 orders, touch each order's lines without asking for them
 *   B  the same with join fetch
 *   C  page 2 of 5 orders with the lines fetched
 */
@SpringBootTest(properties = {
        "spring.jpa.properties.hibernate.generate_statistics=true",
        "spring.jpa.hibernate.ddl-auto=update",
        "spring.jpa.show-sql=true"})
class Ep13RelationsTest {

    @Autowired
    Ep13OrderRepository orders;

    @Autowired
    EntityManager em;

    @Autowired
    TransactionTemplate tx;

    @Autowired
    EntityManagerFactory emf;

    @Test
    void theJpaAnswers() {
        tx.executeWithoutResult(s -> {
            em.createNativeQuery("TRUNCATE ep13_order_lines, ep13_orders RESTART IDENTITY CASCADE").executeUpdate();
            for (int i = 1; i <= 20; i++) {
                Ep13Order order = new Ep13Order("ORD-" + i);
                em.persist(order);
                for (String p : List.of("A-", "B-", "C-")) em.persist(new Ep13OrderLine(p + i, order));
            }
        });
        Statistics stats = emf.unwrap(SessionFactory.class).getStatistics();

        System.out.println("=== Spring, A: 20 orders, lines never asked for ===");
        stats.clear();
        int counted = tx.execute(s -> orders.findAll().stream().mapToInt(o -> o.getLines().size()).sum());
        System.out.println("  queries sent: " + stats.getPrepareStatementCount());
        System.out.println("  lines counted across 20 orders: " + counted);

        System.out.println("=== Spring, B: the same, with join fetch ===");
        stats.clear();
        int fetched = tx.execute(s -> orders.findAllWithLines().stream().mapToInt(o -> o.getLines().size()).sum());
        System.out.println("  queries sent: " + stats.getPrepareStatementCount());
        System.out.println("  lines counted across 20 orders: " + fetched);

        System.out.println("=== Spring, C: page 2 of 5 orders, with lines fetched ===");
        stats.clear();
        List<String> page = tx.execute(s -> orders.findPageWithLines(PageRequest.of(1, 5)).stream().map(Ep13Order::getReference).toList());
        System.out.println("  queries sent: " + stats.getPrepareStatementCount());
        System.out.println("  orders returned: " + String.join(", ", page));

        System.out.println("=== Spring, C2: page 2 of 5, findAll(Pageable), no fetch ===");
        stats.clear();
        List<String> plainPage = tx.execute(s -> orders.findAll(PageRequest.of(1, 5, org.springframework.data.domain.Sort.by("id"))).stream().map(Ep13Order::getReference).toList());
        System.out.println("  queries sent: " + stats.getPrepareStatementCount());
        System.out.println("  orders returned: " + String.join(", ", plainPage));

        System.out.println("=== Spring, C3: page 2 of 5, join fetch returning Page ===");
        stats.clear();
        List<String> fetchPage = tx.execute(s -> orders.findPageWithLinesAsPage(PageRequest.of(1, 5, org.springframework.data.domain.Sort.by("id"))).stream().map(Ep13Order::getReference).toList());
        System.out.println("  queries sent: " + stats.getPrepareStatementCount());
        System.out.println("  orders returned: " + String.join(", ", fetchPage));

        System.out.println("=== Spring, C4: page 2 of 5, join fetch returning List, sort in the Pageable ===");
        stats.clear();
        List<String> listPage = tx.execute(s -> orders.findPageWithLinesNoOrderBy(PageRequest.of(1, 5, org.springframework.data.domain.Sort.by("id"))).stream().map(Ep13Order::getReference).toList());
        System.out.println("  queries sent: " + stats.getPrepareStatementCount());
        System.out.println("  orders returned: " + String.join(", ", listPage));

        assertThat(counted).isEqualTo(60);
    }
}
