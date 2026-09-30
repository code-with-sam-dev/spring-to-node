package dev.codewithsam.springbootapi.ep14;

import org.springframework.data.jpa.repository.JpaRepository;

public interface Ep14OutboxPaymentRepository extends JpaRepository<Ep14OutboxPayment, Long> {
}
