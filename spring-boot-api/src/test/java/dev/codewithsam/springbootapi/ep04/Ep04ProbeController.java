package dev.codewithsam.springbootapi.ep04;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The probe endpoints for RequestPerThreadTest.
 *
 * TOP LEVEL ON PURPOSE. As a nested static class inside the test it was not
 * component scanned and every request came back 404, which the timing test
 * happily reported as a 3 ms response. Declaring it as a @Bean instead
 * registered it twice and failed the context with "Ambiguous mapping". A
 * top-level class in a scanned package is registered exactly once.
 */
@RestController
class Ep04ProbeController {

    static final long BLOCK_MS = 1500;

    /** Occupies its own request thread, and only its own. */
    @GetMapping("/ep04/slow")
    String slow() throws InterruptedException {
        Thread.sleep(BLOCK_MS);
        return "slow";
    }

    @GetMapping("/ep04/ping")
    String ping() {
        return "ok";
    }
}
