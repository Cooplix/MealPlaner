package com.mealplaner.shopping;

import com.mealplaner.api.dto.ShoppingListItem;
import com.mealplaner.dish.DishDocument;
import com.mealplaner.plan.PlanDocument;
import com.mealplaner.dish.DishRepository;
import com.mealplaner.plan.PlanService;
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

  public ShoppingService(PlanService planService, DishRepository dishRepository) {
    this.planService = planService;
    this.dishRepository = dishRepository;
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

    Map<String, ShoppingListItem> totals = new HashMap<>();
    for (List<String> slots : planSlots.values()) {
      for (String dishId : slots) {
        DishDocument dish = dishes.get(dishId);
        if (dish == null) {
          continue;
        }
        dish.getIngredients().forEach(ingredient -> {
          String key = ingredient.getName() + "::" + ingredient.getUnit();
          ShoppingListItem item = totals.computeIfAbsent(key, k -> {
            ShoppingListItem created = new ShoppingListItem();
            created.setName(ingredient.getName());
            created.setUnit(ingredient.getUnit());
            created.setQty(0.0);
            created.setDishes(new ArrayList<>());
            return created;
          });
          item.setQty(item.getQty() + ingredient.getQty());
          if (!item.getDishes().contains(dishId)) {
            item.getDishes().add(dishId);
          }
        });
      }
    }

    return totals.values().stream()
        .sorted((a, b) -> a.getName().compareToIgnoreCase(b.getName()))
        .toList();
  }
}
