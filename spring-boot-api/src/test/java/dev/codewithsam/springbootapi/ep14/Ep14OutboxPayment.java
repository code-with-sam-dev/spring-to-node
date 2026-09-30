package dev.codewithsam.springbootapi.ep14;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ep14_payments_ob")
public class Ep14OutboxPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private int amount;

    protected Ep14OutboxPayment() {
    }

    public Ep14OutboxPayment(int amount) {
        this.amount = amount;
    }
}
