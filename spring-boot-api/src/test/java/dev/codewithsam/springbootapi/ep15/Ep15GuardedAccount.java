package dev.codewithsam.springbootapi.ep15;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Version;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("ep15_guarded")
public class Ep15GuardedAccount {

    @Id
    private String id;

    private String owner;

    private int balance;

    @Version
    private Long version;

    protected Ep15GuardedAccount() {
    }

    public Ep15GuardedAccount(String owner, int balance) {
        this.owner = owner;
        this.balance = balance;
    }

    public String getId() { return id; }
    public int getBalance() { return balance; }
    public void setBalance(int balance) { this.balance = balance; }
}
