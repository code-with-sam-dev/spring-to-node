package dev.codewithsam.springbootapi.ep14;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ep14_payments_loose")
public class Ep14LoosePayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String idempotencyKey;

    protected Ep14LoosePayment() {
    }

    public Ep14LoosePayment(String key) {
        this.idempotencyKey = key;
    }
}
