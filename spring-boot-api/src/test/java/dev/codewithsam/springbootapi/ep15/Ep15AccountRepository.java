package dev.codewithsam.springbootapi.ep15;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface Ep15AccountRepository extends MongoRepository<Ep15Account, String> {
}
