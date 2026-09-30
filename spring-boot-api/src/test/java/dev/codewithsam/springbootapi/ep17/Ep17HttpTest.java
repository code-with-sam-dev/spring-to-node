package dev.codewithsam.springbootapi.ep17;

import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * EPISODE 18, B: the same two inserts in a @SpringBootTest, once without @Transactional (a real
 * server test does not roll back) and once with it. Counts are read through the same repository.
 */
@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=update")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class Ep17HttpTest {

    @Autowired Ep17NoteRepository notes;

    @Test @Order(1)
    void aCleanStart() {
        notes.deleteAll();
    }

    @Test @Order(2)
    void withoutTransactionalFirst() {
        notes.save(new Ep17Note("first"));
        System.out.println("  Spring, B, @SpringBootTest without @Transactional, first test sees rows: " + notes.count());
    }

    @Test @Order(3)
    void withoutTransactionalSecond() {
        notes.save(new Ep17Note("second"));
        System.out.println("  Spring, B, @SpringBootTest without @Transactional, second test sees rows: " + notes.count());
    }

    @Test @Order(4)
    @Transactional
    void withTransactional() {
        notes.save(new Ep17Note("third"));
        System.out.println("  Spring, B, @Transactional test sees rows: " + notes.count());
    }

    @Test @Order(5)
    void afterTheTransactionalTest() {
        System.out.println("  Spring, B, after the @Transactional test, rows: " + notes.count());
        notes.deleteAll();
    }
}
