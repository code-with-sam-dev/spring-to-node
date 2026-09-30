package dev.codewithsam.cache;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/** EPISODE 24: the current user's account, read from the request, cached by a method with no arguments. */
@Service
public class AccountService {

    @Cacheable("accounts")
    public Account me() {
        String user = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest().getHeader("X-User");
        return new Account(user, "alice".equals(user) ? 1200 : 40);
    }

    @Cacheable(cacheNames = "accounts", key = "#user")
    public Account meFor(String user) {
        return new Account(user, "alice".equals(user) ? 1200 : 40);
    }
}
