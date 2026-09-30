package dev.codewithsam.securityapi;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

/**
 * EPISODE 20, C: the explicit filter chain, active only under the "chain" profile so test A can
 * still show the starter's defaults. Health is open; everything else needs authentication.
 */
@Configuration
@Profile("chain")
class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(auth -> auth
                .requestMatchers("/health").permitAll()
                .anyRequest().authenticated())
            .httpBasic(basic -> { });
        return http.build();
    }

    @Bean
    InMemoryUserDetailsManager users() {
        return new InMemoryUserDetailsManager(
                User.withUsername("sam").password("{noop}secret").roles("USER").build(),
                User.withUsername("ada").password("{noop}secret").roles("USER", "ADMIN").build());
    }
}
