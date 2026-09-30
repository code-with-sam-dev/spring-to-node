package dev.codewithsam.springbootapi.ep18;

import dev.codewithsam.springbootapi.ep17.Ep17Note;
import dev.codewithsam.springbootapi.ep17.Ep17NoteRepository;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * EPISODE 19, A: the episode 18 pair of tests against a Postgres container started for this
 * class. @ServiceConnection points the DataSource at it. No @Transactional on purpose.
 */
@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=update")
@Testcontainers
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class Ep18ContainerTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18-alpine");

    @Autowired Ep17NoteRepository notes;

    @Test @Order(1)
    void firstTestInsertsOne() {
        notes.save(new Ep17Note("first"));
        System.out.println("  Spring, A, container, first test sees rows: " + notes.count());
    }

    @Test @Order(2)
    void secondTestInsertsOne() {
        notes.save(new Ep17Note("second"));
        System.out.println("  Spring, A, container, second test sees rows: " + notes.count());
    }
}
