package com.mealplaner.ingredient;

import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface IngredientRepository extends MongoRepository<IngredientDocument, String> {
  Optional<IngredientDocument> findByKey(String key);
}
