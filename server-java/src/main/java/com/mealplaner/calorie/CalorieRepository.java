package com.mealplaner.calorie;

import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CalorieRepository extends MongoRepository<CalorieDocument, String> {
  List<CalorieDocument> findAllByIngredientKeyIn(List<String> keys);
  Optional<CalorieDocument> findByIngredientKeyAndUnitAndAmount(
      String ingredientKey,
      String unit,
      double amount
  );
}
