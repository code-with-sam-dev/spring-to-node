package dev.codewithsam.springbootapi.ep07;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * The Spring half of episode 8's comparison.
 *
 * Top level, not nested, because a nested controller is not component scanned
 * in this project and every request comes back 404. That cost a whole debugging
 * cycle in episode 5 and the note is here so it does not cost another.
 */
@RestController
class Ep07ThrowController {

    /** A custom type with no HTTP meaning attached, like the NestJS demo's. */
    static class InsufficientFunds extends RuntimeException {
        private final long shortfall;

        InsufficientFunds(long shortfall) {
            super("short by " + shortfall);
            this.shortfall = shortfall;
        }

        long shortfall() {
            return shortfall;
        }
    }

    @GetMapping("/ep07/plain")
    String plain() {
        throw new IllegalStateException("the gateway is on fire");
    }

    @GetMapping("/ep07/framework")
    String framework() {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, "no payment with that id");
    }

    @GetMapping("/ep07/domain")
    String domain() {
        throw new InsufficientFunds(250);
    }

    @GetMapping("/ep07/ok")
    String ok() {
        return "ok";
    }
}
