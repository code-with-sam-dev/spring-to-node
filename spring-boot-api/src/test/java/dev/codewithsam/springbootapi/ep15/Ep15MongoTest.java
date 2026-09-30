package dev.codewithsam.springbootapi.ep15;

import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

/**
 * EPISODE 16, THE SPRING HALF. The same questions probes.ts asks of Mongoose:
 *   A  two requests load the same account, debit 30 and 50, save
 *   B  the same with @Version
 *   C  the same two debits as atomic $inc
 *   D  @Min(0) on the balance: save() with -500, and an update through MongoTemplate
 *   E  a document with a field the class does not declare, read back
 */
@SpringBootTest(properties = "spring.mongodb.uri=mongodb://localhost:27018/payments_spring?directConnection=true")
class Ep15MongoTest {

    @Autowired Ep15AccountRepository accounts;
    @Autowired Ep15GuardedRepository guarded;
    @Autowired MongoTemplate mongo;

    @Test
    void theSpringAnswers() {
        accounts.deleteAll();
        String id = accounts.save(new Ep15Account("sam", 100)).getId();
        Ep15Account first = accounts.findById(id).orElseThrow();
        Ep15Account second = accounts.findById(id).orElseThrow();
        first.setBalance(first.getBalance() - 30);
        second.setBalance(second.getBalance() - 50);
        System.out.println("=== Spring, A: two requests load, debit 30 and 50, save ===");
        accounts.save(first);
        accounts.save(second);
        System.out.println("  debit 30: saved");
        System.out.println("  debit 50: saved");
        System.out.println("  balance after both: " + accounts.findById(id).orElseThrow().getBalance());

        guarded.deleteAll();
        String gid = guarded.save(new Ep15GuardedAccount("sam", 100)).getId();
        Ep15GuardedAccount g1 = guarded.findById(gid).orElseThrow();
        Ep15GuardedAccount g2 = guarded.findById(gid).orElseThrow();
        g1.setBalance(g1.getBalance() - 30);
        g2.setBalance(g2.getBalance() - 50);
        System.out.println("=== Spring, B: the same, @Version ===");
        guarded.save(g1);
        System.out.println("  debit 30: saved");
        try { guarded.save(g2); System.out.println("  debit 50: saved"); }
        catch (RuntimeException e) { System.out.println("  debit 50: " + e.getClass().getSimpleName()); }
        System.out.println("  balance after both: " + guarded.findById(gid).orElseThrow().getBalance());

        accounts.deleteAll();
        String cid = accounts.save(new Ep15Account("sam", 100)).getId();
        Query byId = Query.query(Criteria.where("_id").is(cid));
        mongo.updateFirst(byId, new Update().inc("balance", -30), Ep15Account.class);
        mongo.updateFirst(byId, new Update().inc("balance", -50), Ep15Account.class);
        System.out.println("=== Spring, C: the same two debits as atomic $inc ===");
        System.out.println("  balance after both: " + accounts.findById(cid).orElseThrow().getBalance());

        accounts.deleteAll();
        String did = accounts.save(new Ep15Account("sam", 100)).getId();
        System.out.println("=== Spring, D: balance has @Min(0); set it to -500 ===");
        Ep15Account d = accounts.findById(did).orElseThrow();
        d.setBalance(-500);
        try { accounts.save(d); System.out.println("  save(): saved, balance now " + accounts.findById(did).orElseThrow().getBalance()); }
        catch (RuntimeException e) { System.out.println("  save(): " + e.getClass().getSimpleName()); }
        mongo.updateFirst(Query.query(Criteria.where("_id").is(did)), Update.update("balance", -700), Ep15Account.class);
        System.out.println("  MongoTemplate update: balance now " + accounts.findById(did).orElseThrow().getBalance());

        mongo.getCollection("ep15_accounts").insertOne(new Document("owner", "sam").append("balance", 10).append("currency", "GBP"));
        System.out.println("=== Spring, E: a stored field the class does not declare ===");
        System.out.println("  read back as Ep15Account: " + (accounts.findAll().size() == 2 ? "loaded, currency ignored" : "?"));

        mongo.dropCollection("ep15_accounts");
        mongo.dropCollection("ep15_guarded");
    }
}
