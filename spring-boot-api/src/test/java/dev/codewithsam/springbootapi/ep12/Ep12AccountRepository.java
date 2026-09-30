package dev.codewithsam.springbootapi.ep12;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface Ep12AccountRepository extends JpaRepository<Ep12Account, Long> {
    Optional<Ep12Account> findByOwner(String owner);
}
