package com.mealplaner.shopping;

import com.mealplaner.api.dto.ShoppingListItem;
import com.mealplaner.dish.DishDocument;
import com.mealplaner.plan.PlanDocument;
import com.mealplaner.dish.DishRepository;
import com.mealplaner.inventory.InventoryItemDocument;
import com.mealplaner.inventory.InventoryItemRepository;
import com.mealplaner.plan.PlanService;
import com.mealplaner.util.IngredientKey;
import com.mealplaner.util.Units;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class ShoppingService {
  private final PlanService planService;
  private final DishRepository dishRepository;
  private final InventoryItemRepository inventoryRepository;

  public ShoppingService(
      PlanService planService,
      DishRepository dishRepository,
      InventoryItemRepository inventoryRepository
  ) {
    this.planService = planService;
    this.dishRepository = dishRepository;
    this.inventoryRepository = inventoryRepository;
  }

  public List<ShoppingListItem> build(String userId, String start, String end) {
    List<PlanDocument> plans = planService.listPlans(userId, Optional.of(start), Optional.of(end));
    Set<String> dishIds = new HashSet<>();
    Map<String, List<String>> planSlots = new HashMap<>();

    for (PlanDocument plan : plans) {
      List<String> slots = new ArrayList<>();
      for (String dishId : plan.getSlots().values()) {
        if (dishId != null && !dishId.isBlank()) {
          slots.add(dishId);
          dishIds.add(dishId);
        }
      }
      planSlots.put(plan.getDateIso() == null ? plan.getId() : plan.getDateIso(), slots);
    }

    if (dishIds.isEmpty()) {
      return List.of();
    }

    Map<String, DishDocument> dishes = new HashMap<>();
    for (DishDocument dish : dishRepository.findByUserIdAndIdIn(userId, dishIds)) {
      dishes.put(dish.getId(), dish);
    }

    Map<String, Double> stockByKey = new HashMap<>();
    Map<String, Double> stockByName = new HashMap<>();
    for (InventoryItemDocument item : inventoryRepository.findByUserId(userId)) {
      if (item == null || item.getName() == null) {
        continue;
      }
      String unit = Units.sanitize(item.getUnit());
      String normalizedName = item.getName().trim();
      if (normalizedName.isEmpty()) {
        continue;
      }
      String nameKey = IngredientKey.normalize(normalizedName, unit);
      String ingredientKey = normalizeKey(item.getIngredientKey());
      String nameBucket = nameKey + "::" + unit;
      stockByName.put(nameBucket, stockByName.getOrDefault(nameBucket, 0.0) + item.getQuantity());
      if (ingredientKey != null) {
        String keyBucket = ingredientKey + "::" + unit;
        stockByKey.put(keyBucket, stockByKey.getOrDefault(keyBucket, 0.0) + item.getQuantity());
      }
    }

    Map<String, ShoppingListItem> totals = new HashMap<>();
    for (List<String> slots : planSlots.values()) {
      for (String dishId : slots) {
        DishDocument dish = dishes.get(dishId);
        if (dish == null) {
          continue;
        }
        dish.getIngredients().forEach(ingredient -> {
          if (ingredient.getName() == null || ingredient.getName().trim().isEmpty()) {
            return;
          }
          String unit = Units.sanitize(ingredient.getUnit());
          String normalizedName = ingredient.getName().trim();
          String ingredientKey = normalizeKey(ingredient.getIngredientKey());
          String nameKey = IngredientKey.normalize(normalizedName, unit);
          String aggregateKey = (ingredientKey == null ? nameKey : ingredientKey) + "::" + unit;
          ShoppingListItem item = totals.computeIfAbsent(aggregateKey, k -> {
            ShoppingListItem created = new ShoppingListItem();
            created.setIngredientKey(ingredientKey);
            created.setName(normalizedName);
            created.setUnit(unit);
            created.setQty(0.0);
            created.setRequiredQty(0.0);
            created.setInStockQty(0.0);
            created.setToBuyQty(0.0);
            created.setDishes(new ArrayList<>());
            return created;
          });
          if (item.getIngredientKey() == null && ingredientKey != null) {
            item.setIngredientKey(ingredientKey);
          }
          item.setRequiredQty(item.getRequiredQty() + ingredient.getQty());
          if (!item.getDishes().contains(dishId)) {
            item.getDishes().add(dishId);
          }
        });
      }
    }

    for (ShoppingListItem item : totals.values()) {
      String unit = Units.sanitize(item.getUnit());
      String ingredientKey = normalizeKey(item.getIngredientKey());
      String nameKey = IngredientKey.normalize(item.getName(), unit);
      String keyBucket = ingredientKey == null ? null : ingredientKey + "::" + unit;
      String nameBucket = nameKey + "::" + unit;
      double inStock = 0.0;
      if (keyBucket != null && stockByKey.containsKey(keyBucket)) {
        inStock = stockByKey.getOrDefault(keyBucket, 0.0);
      } else {
        inStock = stockByName.getOrDefault(nameBucket, 0.0);
      }
      double required = item.getRequiredQty();
      double toBuy = Math.max(required - inStock, 0.0);
      item.setInStockQty(inStock);
      item.setToBuyQty(toBuy);
      item.setQty(toBuy);
    }

    return totals.values().stream()
        .sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName()))
        .toList();
  }

  private String normalizeKey(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    return value.trim().toLowerCase();
  }
}
