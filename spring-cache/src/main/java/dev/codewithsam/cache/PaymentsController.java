package dev.codewithsam.cache;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
class PaymentsController {

    private final PaymentsService payments;
    private final AccountService accounts;

    PaymentsController(PaymentsService payments, AccountService accounts) {
        this.payments = payments;
        this.accounts = accounts;
    }

    @GetMapping("/me")
    Account me() {
        return accounts.me();
    }

    @GetMapping("/me-per-user")
    Account meFor(@RequestHeader("X-User") String user) {
        return accounts.meFor(user);
    }

    @GetMapping("/payments/{id}")
    Payment find(@PathVariable String id) {
        return payments.find(id);
    }

    @GetMapping("/payments-sync/{id}")
    Payment findSync(@PathVariable String id) {
        return payments.findSync(id);
    }

    @PutMapping("/payments/{id}")
    Payment update(@PathVariable String id, @RequestBody Map<String, String> body) {
        return payments.update(id, body.get("status"));
    }

    @PutMapping("/payments/{id}/evicting")
    Payment updateAndEvict(@PathVariable String id, @RequestBody Map<String, String> body) {
        return payments.updateAndEvict(id, body.get("status"));
    }
}
