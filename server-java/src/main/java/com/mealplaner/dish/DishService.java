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

  public List<DishDocument> listDishes() {
    List<DishDocument> dishes = new ArrayList<>(repository.findAll());
    dishes.sort(Comparator.comparing(DishDocument::getId));
    return dishes;
  }

  public DishDocument upsertDish(DishDocument dish) {
    DishDocument existing = repository.findById(dish.getId()).orElse(null);
    if (existing != null) {
      dish.setCreatedBy(existing.getCreatedBy());
    }
    dish.setIngredients(normalizeIngredients(dish.getIngredients()));
    dish.setCalories(computeCalories(dish.getIngredients()));
    DishDocument saved = repository.save(dish);
    ingredientService.ensureIngredientEntries(saved.getIngredients());
    return saved;
  }

  public DishDocument updateDish(String id, DishDocument update) {
    DishDocument existing = repository.findById(id).orElseThrow();
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
      existing.setCalories(computeCalories(normalized));
      ingredientService.ensureIngredientEntries(normalized);
    }
    return repository.save(existing);
  }

  public void deleteDish(String id) {
    if (!repository.existsById(id)) {
      throw new IllegalStateException("Dish not found");
    }
    repository.deleteById(id);
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

  private double computeCalories(List<DishIngredient> ingredients) {
    if (ingredients == null || ingredients.isEmpty()) {
      return 0.0;
    }
    List<String> keys = ingredients.stream()
        .map(this::resolveIngredientKey)
        .filter(key -> key != null && !key.isBlank())
        .distinct()
        .toList();
    List<CalorieDocument> entries = calorieRepository.findAllByIngredientKeyIn(keys);
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
}
