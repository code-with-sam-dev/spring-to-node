package dev.codewithsam.springbootapi.ep18;

import dev.codewithsam.springbootapi.ep17.Ep17Note;
import dev.codewithsam.springbootapi.ep17.Ep17NoteRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** EPISODE 19, B: a class with its own JUnit-managed static container. One row, then count. */
@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=update")
@Testcontainers
class Ep18OwnThreeTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:18-alpine");

    @Autowired Ep17NoteRepository notes;

    @Test
    void insertsOne() {
        notes.save(new Ep17Note("Three"));
        System.out.println("  Spring, B, class Three with its own container sees rows: " + notes.count());
    }
}
