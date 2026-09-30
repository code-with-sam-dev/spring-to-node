package dev.codewithsam.securityapi;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

/** EPISODE 20, D: method security, only under the "methods" profile, to show it is opt-in. */
@Configuration
@Profile("methods")
@EnableMethodSecurity
class MethodSecurityConfig {
}
