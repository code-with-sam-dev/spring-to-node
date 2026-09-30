package dev.codewithsam.springbootapi.ep14;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ep14_outbox")
public class Ep14OutboxEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String type;

    protected Ep14OutboxEvent() {
    }

    public Ep14OutboxEvent(String type) {
        this.type = type;
    }
}
