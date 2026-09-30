package dev.codewithsam.springbootapi.ep14;

import org.springframework.data.jpa.repository.JpaRepository;

public interface Ep14KeyedRepository extends JpaRepository<Ep14KeyedPayment, Long> {
    boolean existsByIdempotencyKey(String key);
    long countByIdempotencyKey(String key);
    java.util.Optional<Ep14KeyedPayment> findByIdempotencyKey(String key);
}
