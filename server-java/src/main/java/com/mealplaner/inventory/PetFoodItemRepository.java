package com.mealplaner.inventory;

import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PetFoodItemRepository extends MongoRepository<PetFoodItemDocument, String> {
  List<PetFoodItemDocument> findByUserId(String userId);
  Optional<PetFoodItemDocument> findByIdAndUserId(String id, String userId);
  void deleteByIdAndUserId(String id, String userId);
}
