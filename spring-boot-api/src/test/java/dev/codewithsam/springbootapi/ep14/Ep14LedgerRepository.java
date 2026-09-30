package dev.codewithsam.springbootapi.ep14;

import org.springframework.data.jpa.repository.JpaRepository;

public interface Ep14LedgerRepository extends JpaRepository<Ep14LedgerEntry, Long> {
}
