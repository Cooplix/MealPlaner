package com.mealplaner.dish;

import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface DishRepository extends MongoRepository<DishDocument, String> {
  List<DishDocument> findByUserIdOrderByIdAsc(String userId);
  List<DishDocument> findByUserIdAndIdIn(String userId, Iterable<String> ids);
  Optional<DishDocument> findByIdAndUserId(String id, String userId);
  boolean existsByIdAndUserId(String id, String userId);
  List<DishDocument> findByUserIdIsNull();
}
