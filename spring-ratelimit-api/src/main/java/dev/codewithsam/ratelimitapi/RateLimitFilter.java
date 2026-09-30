package dev.codewithsam.ratelimitapi;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.concurrent.TimeUnit;
import java.util.function.Function;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * EPISODE 21: three requests a minute per client address, one for login, none counted for health.
 */
@Component
class RateLimitFilter extends OncePerRequestFilter {

    private final Function<String, Bucket> bucketFor;

    RateLimitFilter(Function<String, Bucket> bucketFor) {
        this.bucketFor = bucketFor;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return request.getRequestURI().equals("/health");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String scope = request.getRequestURI().equals("/login") ? "login:" : "api:";
        Bucket bucket = bucketFor.apply(scope + request.getRemoteAddr());
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            response.setHeader("X-Rate-Limit-Remaining", String.valueOf(probe.getRemainingTokens()));
            chain.doFilter(request, response);
            return;
        }
        long seconds = TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill()) + 1;
        response.setHeader("Retry-After", String.valueOf(seconds));
        response.setStatus(429);
    }
}
