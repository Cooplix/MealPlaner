package com.mealplaner.ingredient;

import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface IngredientRepository extends MongoRepository<IngredientDocument, String> {
  Optional<IngredientDocument> findByUserIdAndKey(String userId, String key);
  List<IngredientDocument> findByUserIdOrderByNameAsc(String userId);
  List<IngredientDocument> findByUserIdIsNull();
}
