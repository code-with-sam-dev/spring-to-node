package dev.codewithsam.springbootapi.ep14;

import org.springframework.data.jpa.repository.JpaRepository;

public interface Ep14LooseRepository extends JpaRepository<Ep14LoosePayment, Long> {
    boolean existsByIdempotencyKey(String key);
    long countByIdempotencyKey(String key);
}
