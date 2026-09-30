package dev.codewithsam.springbootapi.ep13;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface Ep13OrderRepository extends JpaRepository<Ep13Order, Long> {

    @Query("select distinct o from Ep13Order o join fetch o.lines order by o.id")
    List<Ep13Order> findAllWithLines();

    @Query("select distinct o from Ep13Order o join fetch o.lines order by o.id")
    List<Ep13Order> findPageWithLines(Pageable page);

    @Query("select distinct o from Ep13Order o join fetch o.lines")
    List<Ep13Order> findPageWithLinesNoOrderBy(Pageable page);

    @Query(value = "select distinct o from Ep13Order o join fetch o.lines",
            countQuery = "select count(o) from Ep13Order o")
    Page<Ep13Order> findPageWithLinesAsPage(Pageable page);
}
