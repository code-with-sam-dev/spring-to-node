package dev.codewithsam.springbootapi.payments;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * An interface you never implement. Spring Data generates it at runtime.
 *
 * <p>That is the piece with NO TypeORM equivalent: there you get a generic
 * Repository and write the queries yourself. Less magic, more typing, and the
 * SQL is always the SQL you asked for.
 */
public interface PaymentRepository extends JpaRepository<PaymentEntity, UUID> {}
