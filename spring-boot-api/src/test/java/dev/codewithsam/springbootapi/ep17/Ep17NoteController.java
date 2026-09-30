package dev.codewithsam.springbootapi.ep17;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/** EPISODE 18: a test-only endpoint that writes one note, for the request probes. */
@RestController
class Ep17NoteController {

    private final Ep17NoteRepository notes;

    Ep17NoteController(Ep17NoteRepository notes) {
        this.notes = notes;
    }

    @PostMapping("/ep17/notes")
    long create() {
        notes.save(new Ep17Note("via request"));
        return notes.count();
    }
}
