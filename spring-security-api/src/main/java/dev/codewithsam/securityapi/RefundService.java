package dev.codewithsam.securityapi;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

/** EPISODE 20, D: an admin-only operation, protected on the method, not the route. */
@Service
public class RefundService {

    @PreAuthorize("hasRole('ADMIN')")
    public String approve() {
        return "approved";
    }
}
