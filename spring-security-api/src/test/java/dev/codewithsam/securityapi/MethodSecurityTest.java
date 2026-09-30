package dev.codewithsam.securityapi;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * EPISODE 20, D: @PreAuthorize("hasRole('ADMIN')") on RefundService.approve(), with and without
 * @EnableMethodSecurity. Called through the route as a USER and an ADMIN, and directly on the bean.
 */
class MethodSecurityTest {

    static void run(String label, MockMvc mvc, RefundService service) throws Exception {
        System.out.println("  Spring, D, " + label + ", USER via route: " + mvc.perform(get("/refunds/approve").with(httpBasic("sam", "secret"))).andReturn().getResponse().getStatus());
        System.out.println("  Spring, D, " + label + ", ADMIN via route: " + mvc.perform(get("/refunds/approve").with(httpBasic("ada", "secret"))).andReturn().getResponse().getStatus());
        try {
            System.out.println("  Spring, D, " + label + ", direct call, no user: " + service.approve());
        } catch (RuntimeException e) {
            System.out.println("  Spring, D, " + label + ", direct call, no user: " + e.getClass().getSimpleName());
        }
    }

    @Nested
    @SpringBootTest
    @AutoConfigureMockMvc
    @ActiveProfiles("chain")
    class WithoutMethodSecurity {
        @Autowired MockMvc mvc;
        @Autowired RefundService service;

        @Test
        void calls() throws Exception {
            run("no @EnableMethodSecurity", mvc, service);
        }
    }

    @Nested
    @SpringBootTest
    @AutoConfigureMockMvc
    @ActiveProfiles({"chain", "methods"})
    class WithMethodSecurity {
        @Autowired MockMvc mvc;
        @Autowired RefundService service;

        @Test
        void calls() throws Exception {
            run("@EnableMethodSecurity", mvc, service);
        }
    }
}
