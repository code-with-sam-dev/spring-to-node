package dev.codewithsam.springbootapi.ep15;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface Ep15GuardedRepository extends MongoRepository<Ep15GuardedAccount, String> {
}
