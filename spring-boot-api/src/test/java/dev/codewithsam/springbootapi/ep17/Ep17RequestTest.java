package dev.codewithsam.springbootapi.ep17;

import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.core.env.Environment;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * EPISODE 18, F: does a @Transactional test cover the request it makes?
 *   MockMvc calls the controller on the test's own thread; a real HTTP request does not.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "spring.jpa.hibernate.ddl-auto=update")
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class Ep17RequestTest {

    @Autowired MockMvc mvc;
    @Autowired Ep17NoteRepository notes;
    @Autowired Environment env;

    @Test @Order(1)
    void aCleanStart() {
        notes.deleteAll();
    }

    @Test @Order(2)
    @Transactional
    void mockMvcInsideATransactionalTest() throws Exception {
        mvc.perform(post("/ep17/notes"));
    }

    @Test @Order(3)
    void afterMockMvc() {
        System.out.println("  Spring, F, rows after the @Transactional MockMvc test: " + notes.count());
    }

    @Test @Order(4)
    @Transactional
    void realHttpInsideATransactionalTest() throws Exception {
        String port = env.getProperty("local.server.port");
        HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/ep17/notes"))
                .POST(HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test @Order(5)
    void afterRealHttp() {
        System.out.println("  Spring, F, rows after the @Transactional real HTTP test: " + notes.count());
        notes.deleteAll();
    }
}
