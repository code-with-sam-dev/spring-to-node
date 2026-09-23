package dev.codewithsam.springbootapi.ep11;

import jakarta.servlet.http.HttpSession;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * NOTHING IS CONFIGURED. No session starter, no store, no cookie settings.
 * HttpSession as a parameter is the whole of it, and that is the measurement.
 */
@RestController
@RequestMapping("/ep11")
public class Ep11SessionController {

    @GetMapping("/visit")
    public Map<String, Object> visit(HttpSession session) {
        Integer n = (Integer) session.getAttribute("visits");
        n = n == null ? 1 : n + 1;
        session.setAttribute("visits", n);
        return Map.of("visits", n);
    }

    @GetMapping("/timeout")
    public Map<String, Object> timeout(HttpSession session) {
        return Map.of("maxInactiveIntervalSeconds", session.getMaxInactiveInterval());
    }

    @GetMapping("/plain")
    public Map<String, Object> plain() {
        return Map.of("ok", true);
    }
}
