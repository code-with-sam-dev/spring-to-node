package dev.codewithsam.ratelimitapi;

import jakarta.servlet.http.HttpServletRequest;
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

    @GetMapping("/whoami")
    String whoami(HttpServletRequest request) {
        return request.getRemoteAddr();
    }

    @PostMapping("/login")
    String login() {
        return "logged in";
    }
}
