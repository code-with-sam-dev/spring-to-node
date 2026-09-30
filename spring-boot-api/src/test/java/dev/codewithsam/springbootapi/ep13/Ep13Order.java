package dev.codewithsam.springbootapi.ep13;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;

/** The JPA half of episode 14's relation, matching Order in nestjs-api/src/ep13-relations/probes.ts. */
@Entity
@Table(name = "ep13_orders")
public class Ep13Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String reference;

    @OneToMany(mappedBy = "order")
    private List<Ep13OrderLine> lines = new ArrayList<>();

    protected Ep13Order() {
    }

    public Ep13Order(String reference) {
        this.reference = reference;
    }

    public Long getId() { return id; }
    public String getReference() { return reference; }
    public List<Ep13OrderLine> getLines() { return lines; }
}
