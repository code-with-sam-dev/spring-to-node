package dev.codewithsam.tenancy;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** EPISODE 40: the tenant from the X-Tenant header. With tenancy=naive it is never cleared. */
@Component
public class TenantFilter extends OncePerRequestFilter {

    @Value("${tenancy:fixed}")
    String mode;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String tenant = request.getHeader("X-Tenant");
        if ("naive".equals(mode)) {
            if (tenant != null) TenantContext.set(tenant);
            chain.doFilter(request, response);
            return;
        }
        TenantContext.set(tenant);
        try {
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
