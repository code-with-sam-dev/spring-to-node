package dev.codewithsam.springbootapi.ep08;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * TOP LEVEL ON PURPOSE. A controller declared as a nested class is not picked
 * up by component scanning, which cost an hour on episode 8: the test measured
 * a 404 and reported it as a timing figure.
 */
@RestController
public class Ep08TraceController {

    @GetMapping("/ep08/trace")
    public Map<String, Object> trace() {
        Ep08Trace.mark("handler");
        return Map.of("ok", true);
    }

    @GetMapping("/ep08/boom")
    public Map<String, Object> boom() {
        Ep08Trace.mark("handler");
        throw new IllegalStateException("the database refused the write");
    }
}
