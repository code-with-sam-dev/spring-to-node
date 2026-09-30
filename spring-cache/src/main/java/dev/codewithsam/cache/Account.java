package dev.codewithsam.cache;

import java.io.Serializable;

public record Account(String user, int balance) implements Serializable {
}
