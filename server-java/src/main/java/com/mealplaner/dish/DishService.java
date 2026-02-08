package com.mealplaner.dish;

import com.mealplaner.calorie.CalorieDocument;
import com.mealplaner.calorie.CalorieRepository;
import com.mealplaner.ingredient.IngredientService;
import com.mealplaner.util.IngredientKey;
import com.mealplaner.util.Units;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class DishService {
  private final DishRepository repository;
  private final IngredientService ingredientService;
  private final CalorieRepository calorieRepository;

  public DishService(
      DishRepository repository,
      IngredientService ingredientService,
      CalorieRepository calorieRepository
  ) {
    this.repository = repository;
    this.ingredientService = ingredientService;
    this.calorieRepository = calorieRepository;
  }

  public List<DishDocument> listDishes(String userId) {
    claimUnowned(userId);
    return new ArrayList<>(repository.findByUserIdOrderByIdAsc(userId));
  }

  public DishDocument upsertDish(String userId, DishDocument dish) {
    DishDocument existing = findOwned(userId, dish.getId());
    if (existing == null && dish.getId() != null && !dish.getId().isBlank()) {
      DishDocument legacy = repository.findById(dish.getId()).orElse(null);
      if (legacy != null && (legacy.getUserId() == null || legacy.getUserId().isBlank())) {
        legacy.setUserId(userId);
        existing = repository.save(legacy);
      }
    }
    if (existing != null) {
      dish.setCreatedBy(existing.getCreatedBy());
    }
    dish.setUserId(userId);
    dish.setIngredients(normalizeIngredients(dish.getIngredients()));
    dish.setCalories(computeCalories(userId, dish.getIngredients()));
    DishDocument saved = repository.save(dish);
    ingredientService.ensureIngredientEntries(userId, saved.getIngredients());
    return saved;
  }

  public DishDocument updateDish(String userId, String id, DishDocument update) {
    DishDocument existing = findOwnedOrClaim(userId, id);
    if (update.getName() != null) {
      existing.setName(update.getName());
    }
    if (update.getMeal() != null) {
      existing.setMeal(update.getMeal());
    }
    if (update.getNotes() != null) {
      existing.setNotes(update.getNotes());
    }
    if (update.getIngredients() != null) {
      List<DishIngredient> normalized = normalizeIngredients(update.getIngredients());
      existing.setIngredients(normalized);
      existing.setCalories(computeCalories(userId, normalized));
      ingredientService.ensureIngredientEntries(userId, normalized);
    }
    return repository.save(existing);
  }

  public void deleteDish(String userId, String id) {
    DishDocument existing = findOwnedOrClaim(userId, id);
    if (existing == null || existing.getId() == null) {
      throw new IllegalStateException("Dish not found");
    }
    repository.deleteById(existing.getId());
  }

  private List<DishIngredient> normalizeIngredients(List<DishIngredient> raw) {
    List<DishIngredient> normalized = new ArrayList<>();
    for (DishIngredient item : raw == null ? List.<DishIngredient>of() : raw) {
      DishIngredient ingredient = new DishIngredient();
      String name = item.getName() == null ? "" : item.getName().trim();
      String unit = Units.sanitize(item.getUnit());
      String key = item.getIngredientKey();
      if (key != null && !key.isBlank()) {
        key = key.trim().toLowerCase();
      } else if (!name.isBlank()) {
        key = IngredientKey.normalize(name, unit);
      } else {
        key = null;
      }
      ingredient.setIngredientKey(key);
      ingredient.setName(name);
      ingredient.setUnit(unit);
      ingredient.setQty(Math.max(item.getQty(), 0.0));
      normalized.add(ingredient);
    }
    return normalized;
  }

  private double computeCalories(String userId, List<DishIngredient> ingredients) {
    if (ingredients == null || ingredients.isEmpty()) {
      return 0.0;
    }
    List<String> keys = ingredients.stream()
        .map(this::resolveIngredientKey)
        .filter(key -> key != null && !key.isBlank())
        .distinct()
        .toList();
    List<CalorieDocument> entries = calorieRepository.findAllByUserIdAndIngredientKeyIn(userId, keys);
    Map<String, List<CalorieDocument>> mapping = new HashMap<>();
    for (CalorieDocument doc : entries) {
      String key = doc.getIngredientKey() + "::" + Units.sanitize(doc.getUnit());
      mapping.computeIfAbsent(key, ignore -> new ArrayList<>()).add(doc);
    }

    double total = 0.0;
    for (DishIngredient ingredient : ingredients) {
      String key = resolveIngredientKey(ingredient);
      if (key == null || key.isBlank()) {
        continue;
      }
      List<CalorieDocument> candidates = mapping.get(key + "::" + Units.sanitize(ingredient.getUnit()));
      if (candidates == null || candidates.isEmpty()) {
        continue;
      }
      Optional<CalorieDocument> best = candidates.stream()
          .filter(entry -> entry.getAmount() > 0)
          .max(Comparator.comparingDouble(CalorieDocument::getAmount));
      if (best.isEmpty()) {
        continue;
      }
      CalorieDocument entry = best.get();
      if (entry.getAmount() <= 0) {
        continue;
      }
      total += (ingredient.getQty() / entry.getAmount()) * entry.getCalories();
    }
    return total;
  }

  private String resolveIngredientKey(DishIngredient ingredient) {
    if (ingredient == null) {
      return null;
    }
    String raw = ingredient.getIngredientKey();
    if (raw != null && !raw.isBlank()) {
      return raw.trim().toLowerCase();
    }
    String name = ingredient.getName();
    if (name == null || name.trim().isEmpty()) {
      return null;
    }
    return IngredientKey.normalize(name, ingredient.getUnit());
  }

  private DishDocument findOwned(String userId, String id) {
    if (id == null || id.isBlank()) {
      return null;
    }
    return repository.findByIdAndUserId(id, userId).orElse(null);
  }

  private DishDocument findOwnedOrClaim(String userId, String id) {
    DishDocument existing = findOwned(userId, id);
    if (existing != null) {
      return existing;
    }
    if (id == null || id.isBlank()) {
      throw new IllegalStateException("Dish not found");
    }
    DishDocument legacy = repository.findById(id).orElse(null);
    if (legacy == null) {
      throw new IllegalStateException("Dish not found");
    }
    if (legacy.getUserId() != null && !legacy.getUserId().isBlank()) {
      throw new IllegalStateException("Dish not found");
    }
    legacy.setUserId(userId);
    return repository.save(legacy);
  }

  private void claimUnowned(String userId) {
    List<DishDocument> legacy = repository.findByUserIdIsNull();
    if (legacy.isEmpty()) {
      return;
    }
    for (DishDocument dish : legacy) {
      dish.setUserId(userId);
    }
    repository.saveAll(legacy);
  }
}
