package dev.codewithsam.springbootapi.ep13;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "ep13_order_lines")
public class Ep13OrderLine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String sku;

    @ManyToOne
    private Ep13Order order;

    protected Ep13OrderLine() {
    }

    public Ep13OrderLine(String sku, Ep13Order order) {
        this.sku = sku;
        this.order = order;
    }
}
