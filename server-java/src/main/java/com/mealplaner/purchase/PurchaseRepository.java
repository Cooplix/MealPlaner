package com.mealplaner.purchase;

import java.time.Instant;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PurchaseRepository extends MongoRepository<PurchaseDocument, String> {
  List<PurchaseDocument> findByPurchasedAtBetweenOrderByPurchasedAtDesc(Instant start, Instant end);
  List<PurchaseDocument> findByPurchasedAtGreaterThanEqualOrderByPurchasedAtDesc(Instant start);
  List<PurchaseDocument> findByPurchasedAtLessThanEqualOrderByPurchasedAtDesc(Instant end);
  List<PurchaseDocument> findByIngredientKeyOrderByPurchasedAtDesc(String ingredientKey);
  List<PurchaseDocument> findByIngredientKeyAndPurchasedAtBetweenOrderByPurchasedAtDesc(
      String ingredientKey,
      Instant start,
      Instant end
  );
  List<PurchaseDocument> findByIngredientKeyAndPurchasedAtGreaterThanEqualOrderByPurchasedAtDesc(
      String ingredientKey,
      Instant start
  );
  List<PurchaseDocument> findByIngredientKeyAndPurchasedAtLessThanEqualOrderByPurchasedAtDesc(
      String ingredientKey,
      Instant end
  );
}
