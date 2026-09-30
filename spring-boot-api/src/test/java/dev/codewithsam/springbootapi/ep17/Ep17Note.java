package dev.codewithsam.springbootapi.ep17;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ep17_notes")
public class Ep17Note {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String text;

    protected Ep17Note() {
    }

    public Ep17Note(String text) {
        this.text = text;
    }
}
