package dev.codewithsam.cache;

import java.io.Serializable;

public record Payment(String id, String status) implements Serializable {
}
