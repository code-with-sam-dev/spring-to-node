package dev.codewithsam.springbootapi.ep15;

import jakarta.validation.constraints.Min;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("ep15_accounts")
public class Ep15Account {

    @Id
    private String id;

    private String owner;

    @Min(0)
    private int balance;

    protected Ep15Account() {
    }

    public Ep15Account(String owner, int balance) {
        this.owner = owner;
        this.balance = balance;
    }

    public String getId() { return id; }
    public int getBalance() { return balance; }
    public void setBalance(int balance) { this.balance = balance; }
}
