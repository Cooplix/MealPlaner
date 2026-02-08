package com.mealplaner.inventory;

import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface InventoryItemRepository extends MongoRepository<InventoryItemDocument, String> {
  List<InventoryItemDocument> findByUserId(String userId);
  Optional<InventoryItemDocument> findByIdAndUserId(String id, String userId);
  void deleteByIdAndUserId(String id, String userId);
  Optional<InventoryItemDocument> findFirstByUserIdAndIngredientKeyAndUnitAndLocation(
      String userId,
      String ingredientKey,
      String unit,
      String location
  );
}
