package dev.codewithsam.springbootapi.ep15;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.event.ValidatingEntityCallback;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import jakarta.validation.Validator;

/**
 * EPISODE 16, D2: the documented switch. Register ValidatingEntityCallback and repeat the
 * @Min(0) save, and the MongoTemplate update.
 */
@SpringBootTest(properties = "spring.mongodb.uri=mongodb://localhost:27018/payments_spring?directConnection=true")
class Ep15ValidatingTest {

    @TestConfiguration
    static class Validation {
        @Bean
        ValidatingEntityCallback validatingEntityCallback(Validator validator) {
            return new ValidatingEntityCallback(validator);
        }
    }

    @Autowired Ep15AccountRepository accounts;
    @Autowired MongoTemplate mongo;

    @Test
    void withTheCallback() {
        accounts.deleteAll();
        String id = accounts.save(new Ep15Account("sam", 100)).getId();
        System.out.println("=== Spring, D2: the same, with ValidatingEntityCallback registered ===");
        Ep15Account d = accounts.findById(id).orElseThrow();
        d.setBalance(-500);
        try { accounts.save(d); System.out.println("  save(): saved, balance now " + accounts.findById(id).orElseThrow().getBalance()); }
        catch (RuntimeException e) { System.out.println("  save(): " + e.getClass().getSimpleName()); }
        mongo.updateFirst(Query.query(Criteria.where("_id").is(id)), Update.update("balance", -700), Ep15Account.class);
        System.out.println("  MongoTemplate update: balance now " + accounts.findById(id).orElseThrow().getBalance());
        mongo.dropCollection("ep15_accounts");
    }
}
