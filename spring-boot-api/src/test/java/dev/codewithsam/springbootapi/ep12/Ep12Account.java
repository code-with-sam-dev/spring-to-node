package dev.codewithsam.springbootapi.ep12;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * The JPA half of episode 13's entity: the same three fields as the TypeORM Account in
 * nestjs-api/src/ep12-typeorm/probes.ts, so each measurement compares like with like.
 */
@Entity
@Table(name = "ep12_accounts")
public class Ep12Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String owner;

    private Long balanceInMinorUnits;

    protected Ep12Account() {
    }

    public Ep12Account(String owner, Long balanceInMinorUnits) {
        this.owner = owner;
        this.balanceInMinorUnits = balanceInMinorUnits;
    }

    public Long getId() { return id; }
    public String getOwner() { return owner; }
    public void setOwner(String owner) { this.owner = owner; }
    public Long getBalanceInMinorUnits() { return balanceInMinorUnits; }
}
