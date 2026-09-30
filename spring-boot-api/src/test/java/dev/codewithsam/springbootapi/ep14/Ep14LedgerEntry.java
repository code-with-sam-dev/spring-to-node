package dev.codewithsam.springbootapi.ep14;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ep14_ledger")
public class Ep14LedgerEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String note;

    protected Ep14LedgerEntry() {
    }

    public Ep14LedgerEntry(String note) {
        this.note = note;
    }

    public String getNote() { return note; }
}
