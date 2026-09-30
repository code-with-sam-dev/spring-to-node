package dev.codewithsam.springbootapi.ep18;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * EPISODE 19, C: one container shared by every class that extends this base. Started once in a
 * static initialiser; Spring's context cache then reuses the same context across the classes.
 */
@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=update")
abstract class Ep18SharedContainerBase {

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:18-alpine");

    static {
        POSTGRES.start();
    }
}
