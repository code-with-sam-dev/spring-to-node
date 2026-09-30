package dev.codewithsam.ratelimitapi;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/** EPISODE 21: the same three routes as the Nest probe. */
@RestController
class PaymentsController {

    @GetMapping("/payments")
    String list() {
        return "payments";
    }

    @GetMapping("/health")
    String health() {
        return "ok";
    }

    @PostMapping("/login")
    String login() {
        return "logged in";
    }
}
