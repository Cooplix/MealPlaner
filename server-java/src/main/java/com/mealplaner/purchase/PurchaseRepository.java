package com.mealplaner.purchase;

import java.time.Instant;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PurchaseRepository extends MongoRepository<PurchaseDocument, String> {
  List<PurchaseDocument> findByUserIdAndPurchasedAtBetweenOrderByPurchasedAtDesc(
      String userId,
      Instant start,
      Instant end
  );
  List<PurchaseDocument> findByUserIdAndPurchasedAtGreaterThanEqualOrderByPurchasedAtDesc(String userId, Instant start);
  List<PurchaseDocument> findByUserIdAndPurchasedAtLessThanEqualOrderByPurchasedAtDesc(String userId, Instant end);
  List<PurchaseDocument> findByUserIdOrderByPurchasedAtDesc(String userId);
  List<PurchaseDocument> findByUserIdAndIngredientKeyOrderByPurchasedAtDesc(String userId, String ingredientKey);
  List<PurchaseDocument> findByUserIdAndIngredientKeyAndPurchasedAtBetweenOrderByPurchasedAtDesc(
      String userId,
      String ingredientKey,
      Instant start,
      Instant end
  );
  List<PurchaseDocument> findByUserIdAndIngredientKeyAndPurchasedAtGreaterThanEqualOrderByPurchasedAtDesc(
      String userId,
      String ingredientKey,
      Instant start
  );
  List<PurchaseDocument> findByUserIdAndIngredientKeyAndPurchasedAtLessThanEqualOrderByPurchasedAtDesc(
      String userId,
      String ingredientKey,
      Instant end
  );
  List<PurchaseDocument> findByUserIdIsNull();
}
