package dev.codewithsam.springbootapi.ep14;

import org.springframework.data.jpa.repository.JpaRepository;

public interface Ep14OutboxEventRepository extends JpaRepository<Ep14OutboxEvent, Long> {
}
