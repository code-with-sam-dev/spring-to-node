package dev.codewithsam.springbootapi.ep14;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ep14_payments_keyed")
public class Ep14KeyedPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String idempotencyKey;

    protected Ep14KeyedPayment() {
    }

    public Ep14KeyedPayment(String key) {
        this.idempotencyKey = key;
    }
}
