package dev.codewithsam.springbootapi.ep18;

import dev.codewithsam.springbootapi.ep17.Ep17Note;
import dev.codewithsam.springbootapi.ep17.Ep17NoteRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/** EPISODE 19, C: one row per class into the shared container, then count. */
class Ep18SharedThreeTest extends Ep18SharedContainerBase {

    @Autowired Ep17NoteRepository notes;

    @Test
    void insertsOne() {
        notes.save(new Ep17Note("Three"));
        System.out.println("  Spring, C, class Three sees rows: " + notes.count());
    }
}
