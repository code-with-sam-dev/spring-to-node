package dev.codewithsam.springbootapi.ep17;

import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

/**
 * EPISODE 18, A: two tests each insert one row into the real Postgres and count. @DataJpaTest
 * wraps each test in a transaction and rolls it back.
 */
@DataJpaTest(properties = "spring.jpa.hibernate.ddl-auto=update")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class Ep17DataJpaTest {

    @Autowired Ep17NoteRepository notes;

    @Test @Order(1)
    void firstTestInsertsOne() {
        notes.save(new Ep17Note("first"));
        System.out.println("  Spring, A, @DataJpaTest, first test sees rows: " + notes.count());
    }

    @Test @Order(2)
    void secondTestInsertsOne() {
        notes.save(new Ep17Note("second"));
        System.out.println("  Spring, A, @DataJpaTest, second test sees rows: " + notes.count());
    }
}
