package com.mealplaner.calorie;

import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CalorieRepository extends MongoRepository<CalorieDocument, String> {
  List<CalorieDocument> findAllByUserIdAndIngredientKeyIn(String userId, List<String> keys);
  List<CalorieDocument> findByUserId(String userId);
  Optional<CalorieDocument> findByIdAndUserId(String id, String userId);
  Optional<CalorieDocument> findByUserIdAndIngredientKeyAndUnitAndAmount(
      String userId,
      String ingredientKey,
      String unit,
      double amount
  );
  List<CalorieDocument> findByUserIdIsNull();
}
