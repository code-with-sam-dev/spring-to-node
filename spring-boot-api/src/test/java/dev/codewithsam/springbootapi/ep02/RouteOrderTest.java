package dev.codewithsam.springbootapi.ep02;

import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * The Spring half of episode 3's two measured claims.
 *
 * Both are run rather than asserted, because the whole point of the episode is
 * the CONTRAST with NestJS and a contrast where only one side was measured is
 * half an argument.
 *
 * 1. Spring picks the MOST SPECIFIC pattern, so declaration order is irrelevant.
 *    The parameter method is deliberately written FIRST here, which is the
 *    order that breaks NestJS.
 * 2. A plain @PostMapping returns 200, where NestJS returns 201.
 */
@WebMvcTest(Ep02Controller.class)
class RouteOrderTest {

    @Autowired
    MockMvc mvc;

    @Test
    void specificityWinsRegardlessOfDeclarationOrder() throws Exception {
        mvc.perform(get("/ep02-payments/recent"))
           .andExpect(status().isOk())
           .andExpect(content().string("recent handler"));
    }

    @Test
    void theParameterRouteStillWorks() throws Exception {
        mvc.perform(get("/ep02-payments/123"))
           .andExpect(status().isOk())
           .andExpect(content().string("byId handler, id=123"));
    }

    @Test
    void aPlainPostReturns200NotCreated() throws Exception {
        mvc.perform(post("/ep02-payments"))
           .andExpect(status().isOk());
    }
}
