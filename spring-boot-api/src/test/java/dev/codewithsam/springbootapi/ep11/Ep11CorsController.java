package dev.codewithsam.springbootapi.ep11;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * The Spring spellings of the two dangerous CORS configurations, so the NestJS
 * comparison is measured in both directions rather than assumed in one.
 */
@RestController
@RequestMapping("/ep11/cors")
public class Ep11CorsController {

    // The literal wildcard with credentials lives in Ep11CorsBootFailureTest,
    // in a context of its own. Declared here it stopped the WHOLE application
    // from starting, which took every other test in the suite down with it.

    /** The same intent spelled as a PATTERN, which is what the error message
     *  for the first one points you towards. */
    @CrossOrigin(originPatterns = "*", allowCredentials = "true")
    @GetMapping("/pattern")
    public Map<String, Object> pattern() {
        return Map.of("ok", true);
    }
}
