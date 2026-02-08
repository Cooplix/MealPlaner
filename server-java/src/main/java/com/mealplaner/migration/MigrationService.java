package com.mealplaner.migration;

import com.mealplaner.api.dto.MigrationResult;
import com.mealplaner.dish.DishDocument;
import com.mealplaner.dish.DishIngredient;
import com.mealplaner.dish.DishRepository;
import com.mealplaner.ingredient.IngredientDocument;
import com.mealplaner.ingredient.IngredientRepository;
import com.mealplaner.inventory.InventoryItemDocument;
import com.mealplaner.inventory.InventoryItemRepository;
import com.mealplaner.inventory.InventoryService;
import com.mealplaner.inventory.PetFoodItemDocument;
import com.mealplaner.inventory.PetFoodItemRepository;
import com.mealplaner.plan.PlanDocument;
import com.mealplaner.plan.PlanRepository;
import com.mealplaner.purchase.PurchaseDocument;
import com.mealplaner.purchase.PurchaseRepository;
import com.mealplaner.util.IngredientKey;
import com.mealplaner.util.Units;
import com.mealplaner.calorie.CalorieDocument;
import com.mealplaner.calorie.CalorieRepository;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

@Service
public class MigrationService {
  private final IngredientRepository ingredientRepository;
  private final DishRepository dishRepository;
  private final PlanRepository planRepository;
  private final CalorieRepository calorieRepository;
  private final PurchaseRepository purchaseRepository;
  private final InventoryItemRepository inventoryRepository;
  private final PetFoodItemRepository petFoodItemRepository;
  private final InventoryService inventoryService;
  private final MongoTemplate mongoTemplate;

  public MigrationService(
      IngredientRepository ingredientRepository,
      DishRepository dishRepository,
      PlanRepository planRepository,
      CalorieRepository calorieRepository,
      PurchaseRepository purchaseRepository,
      InventoryItemRepository inventoryRepository,
      PetFoodItemRepository petFoodItemRepository,
      InventoryService inventoryService,
      MongoTemplate mongoTemplate
  ) {
    this.ingredientRepository = ingredientRepository;
    this.dishRepository = dishRepository;
    this.planRepository = planRepository;
    this.calorieRepository = calorieRepository;
    this.purchaseRepository = purchaseRepository;
    this.inventoryRepository = inventoryRepository;
    this.petFoodItemRepository = petFoodItemRepository;
    this.inventoryService = inventoryService;
    this.mongoTemplate = mongoTemplate;
  }

  public MigrationResult runStep9(String userId, boolean dryRun, boolean backfillInventory) {
    MigrationResult result = new MigrationResult();
    result.setDryRun(dryRun);
    result.setUserId(userId);

    List<IngredientDocument> legacyIngredients = ingredientRepository.findByUserIdIsNull();
    result.setClaimedIngredients(claimUserId(legacyIngredients, userId, dryRun));
    if (!dryRun && !legacyIngredients.isEmpty()) {
      ingredientRepository.saveAll(legacyIngredients);
    }

    List<DishDocument> legacyDishes = dishRepository.findByUserIdIsNull();
    result.setClaimedDishes(claimUserId(legacyDishes, userId, dryRun));
    if (!dryRun && !legacyDishes.isEmpty()) {
      dishRepository.saveAll(legacyDishes);
    }

    List<PlanDocument> legacyPlans = planRepository.findByUserIdIsNull();
    result.setClaimedPlans(claimUserId(legacyPlans, userId, dryRun));
    if (!dryRun && !legacyPlans.isEmpty()) {
      planRepository.saveAll(legacyPlans);
    }

    List<CalorieDocument> legacyCalories = calorieRepository.findByUserIdIsNull();
    result.setClaimedCalories(claimUserId(legacyCalories, userId, dryRun));
    if (!dryRun && !legacyCalories.isEmpty()) {
      calorieRepository.saveAll(legacyCalories);
    }

    List<PurchaseDocument> legacyPurchases = purchaseRepository.findByUserIdIsNull();
    result.setClaimedPurchases(claimUserId(legacyPurchases, userId, dryRun));
    if (!dryRun && !legacyPurchases.isEmpty()) {
      purchaseRepository.saveAll(legacyPurchases);
    }

    List<InventoryItemDocument> legacyInventory = findInventoryWithoutUser();
    result.setClaimedInventory(claimUserId(legacyInventory, userId, dryRun));
    if (!dryRun && !legacyInventory.isEmpty()) {
      inventoryRepository.saveAll(legacyInventory);
    }

    List<PetFoodItemDocument> legacyPetInventory = findPetInventoryWithoutUser();
    result.setClaimedPetInventory(claimUserId(legacyPetInventory, userId, dryRun));
    if (!dryRun && !legacyPetInventory.isEmpty()) {
      petFoodItemRepository.saveAll(legacyPetInventory);
    }

    List<InventoryItemDocument> inventoryItems = inventoryRepository.findByUserId(userId);
    int inventoryKeysFilled = 0;
    int inventoryKeysNormalized = 0;
    int inventoryKeysSkipped = 0;
    int inventoryUpdated = 0;
    for (InventoryItemDocument item : inventoryItems) {
      boolean changed = false;
      String currentKey = item.getIngredientKey();
      if (currentKey != null && !currentKey.isBlank()) {
        String normalizedKey = currentKey.trim().toLowerCase();
        if (!normalizedKey.equals(currentKey)) {
          item.setIngredientKey(normalizedKey);
          inventoryKeysNormalized += 1;
          changed = true;
        }
      } else {
        String name = normalizeName(item.getName());
        String unit = normalizeUnit(item.getUnit());
        if (name == null || unit == null) {
          inventoryKeysSkipped += 1;
        } else {
          item.setIngredientKey(IngredientKey.normalize(name, unit));
          inventoryKeysFilled += 1;
          changed = true;
        }
      }
      if (changed) {
        inventoryUpdated += 1;
      }
    }
    result.setInventoryKeysFilled(inventoryKeysFilled);
    result.setInventoryKeysNormalized(inventoryKeysNormalized);
    result.setInventoryKeysSkipped(inventoryKeysSkipped);
    result.setInventoryUpdated(inventoryUpdated);
    if (!dryRun && inventoryUpdated > 0) {
      inventoryRepository.saveAll(inventoryItems);
    }

    List<DishDocument> dishes = dishRepository.findByUserIdOrderByIdAsc(userId);
    int dishIngredientKeysFilled = 0;
    int dishIngredientKeysNormalized = 0;
    int dishIngredientKeysSkipped = 0;
    int dishesUpdated = 0;
    for (DishDocument dish : dishes) {
      boolean changed = false;
      List<DishIngredient> ingredients = dish.getIngredients();
      if (ingredients == null) {
        continue;
      }
      for (DishIngredient ingredient : ingredients) {
        if (ingredient == null) {
          continue;
        }
        String currentKey = ingredient.getIngredientKey();
        if (currentKey != null && !currentKey.isBlank()) {
          String normalizedKey = currentKey.trim().toLowerCase();
          if (!normalizedKey.equals(currentKey)) {
            ingredient.setIngredientKey(normalizedKey);
            dishIngredientKeysNormalized += 1;
            changed = true;
          }
          continue;
        }
        String name = normalizeName(ingredient.getName());
        String unit = normalizeUnit(ingredient.getUnit());
        if (name == null || unit == null) {
          dishIngredientKeysSkipped += 1;
          continue;
        }
        ingredient.setIngredientKey(IngredientKey.normalize(name, unit));
        dishIngredientKeysFilled += 1;
        changed = true;
      }
      if (changed) {
        dishesUpdated += 1;
      }
    }
    result.setDishIngredientKeysFilled(dishIngredientKeysFilled);
    result.setDishIngredientKeysNormalized(dishIngredientKeysNormalized);
    result.setDishIngredientKeysSkipped(dishIngredientKeysSkipped);
    result.setDishesUpdated(dishesUpdated);
    if (!dryRun && dishesUpdated > 0) {
      dishRepository.saveAll(dishes);
    }

    int backfillAdded = 0;
    int backfillUpdated = 0;
    int backfillSkipped = 0;
    if (backfillInventory) {
      List<PurchaseDocument> purchases = purchaseRepository.findByUserIdOrderByPurchasedAtDesc(userId);
      for (PurchaseDocument purchase : purchases) {
        if (purchase.getIngredientKey() == null || purchase.getIngredientKey().isBlank()) {
          backfillSkipped += 1;
          continue;
        }
        if (purchase.getAmount() <= 0 || purchase.getUnit() == null || purchase.getUnit().isBlank()) {
          backfillSkipped += 1;
          continue;
        }
        String key = purchase.getIngredientKey().trim().toLowerCase();
        Optional<InventoryItemDocument> existing = inventoryRepository
            .findFirstByUserIdAndIngredientKeyAndUnitAndLocation(userId, key, purchase.getUnit(), null);
        if (existing.isPresent()) {
          backfillUpdated += 1;
        } else {
          backfillAdded += 1;
        }
        if (!dryRun) {
          inventoryService.addStock(
              userId,
              key,
              purchase.getIngredientName(),
              purchase.getAmount(),
              purchase.getUnit(),
              null,
              "purchase-backfill"
          );
        }
      }
    }
    result.setBackfillInventoryAdded(backfillAdded);
    result.setBackfillInventoryUpdated(backfillUpdated);
    result.setBackfillInventorySkipped(backfillSkipped);

    return result;
  }

  private <T> int claimUserId(List<T> docs, String userId, boolean dryRun) {
    int count = 0;
    for (T doc : docs) {
      if (doc instanceof IngredientDocument ingredient) {
        count += 1;
        if (!dryRun) {
          ingredient.setUserId(userId);
        }
      } else if (doc instanceof DishDocument dish) {
        count += 1;
        if (!dryRun) {
          dish.setUserId(userId);
        }
      } else if (doc instanceof PlanDocument plan) {
        count += 1;
        if (!dryRun) {
          plan.setUserId(userId);
        }
      } else if (doc instanceof CalorieDocument calorie) {
        count += 1;
        if (!dryRun) {
          calorie.setUserId(userId);
        }
      } else if (doc instanceof PurchaseDocument purchase) {
        count += 1;
        if (!dryRun) {
          purchase.setUserId(userId);
        }
      } else if (doc instanceof InventoryItemDocument inventory) {
        count += 1;
        if (!dryRun) {
          inventory.setUserId(userId);
        }
      } else if (doc instanceof PetFoodItemDocument pet) {
        count += 1;
        if (!dryRun) {
          pet.setUserId(userId);
        }
      }
    }
    return count;
  }

  private List<InventoryItemDocument> findInventoryWithoutUser() {
    Query query = new Query(new Criteria().orOperator(
        Criteria.where("user_id").exists(false),
        Criteria.where("user_id").is(null)
    ));
    return new ArrayList<>(mongoTemplate.find(query, InventoryItemDocument.class));
  }

  private List<PetFoodItemDocument> findPetInventoryWithoutUser() {
    Query query = new Query(new Criteria().orOperator(
        Criteria.where("user_id").exists(false),
        Criteria.where("user_id").is(null)
    ));
    return new ArrayList<>(mongoTemplate.find(query, PetFoodItemDocument.class));
  }

  private String normalizeName(String value) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private String normalizeUnit(String value) {
    if (value == null) {
      return null;
    }
    String normalized = value.trim().toLowerCase();
    if (Units.MEASUREMENT_UNITS.contains(normalized)) {
      return normalized;
    }
    return null;
  }
}
