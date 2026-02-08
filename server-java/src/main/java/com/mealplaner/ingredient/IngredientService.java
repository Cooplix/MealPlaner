package com.mealplaner.ingredient;

import com.mealplaner.calorie.CalorieDocument;
import com.mealplaner.calorie.CalorieRepository;
import com.mealplaner.util.IngredientKey;
import com.mealplaner.util.Units;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

@Service
public class IngredientService {
  private final IngredientRepository repository;
  private final CalorieRepository calorieRepository;
  private final MongoTemplate mongoTemplate;

  public IngredientService(
      IngredientRepository repository,
      CalorieRepository calorieRepository,
      MongoTemplate mongoTemplate
  ) {
    this.repository = repository;
    this.calorieRepository = calorieRepository;
    this.mongoTemplate = mongoTemplate;
  }

  public List<IngredientDocument> listIngredients() {
    List<IngredientDocument> items = new ArrayList<>(repository.findAll());
    items.sort(Comparator.comparing(IngredientDocument::getName, String.CASE_INSENSITIVE_ORDER));
    boolean changed = false;
    for (IngredientDocument doc : items) {
      String normalizedUnit = Units.sanitize(doc.getUnit());
      if (!normalizedUnit.equals(doc.getUnit())) {
        doc.setUnit(normalizedUnit);
        changed = true;
      }
      if (doc.getTranslations() == null) {
        doc.setTranslations(Map.of());
        changed = true;
      }
    }
    if (changed) {
      repository.saveAll(items);
    }
    return items;
  }

  public IngredientDocument createIngredient(String name, String unit, Map<String, String> translations) {
    String safeName = name == null ? "" : name.trim();
    String safeUnit = Units.sanitize(unit);
    if (safeName.isEmpty()) {
      throw new IllegalArgumentException("Name and unit are required");
    }
    String key = IngredientKey.normalize(safeName, safeUnit);
    Optional<IngredientDocument> existing = repository.findByKey(key);
    if (existing.isPresent()) {
      throw new IllegalStateException("Ingredient already exists");
    }
    IngredientDocument doc = new IngredientDocument();
    doc.setKey(key);
    doc.setName(safeName);
    doc.setUnit(safeUnit);
    doc.setTranslations(cleanTranslations(translations));
    return repository.save(doc);
  }

  public IngredientDocument updateIngredient(String key, String name, String unit, Map<String, String> translations) {
    String safeName = name == null ? "" : name.trim();
    String safeUnit = Units.sanitize(unit);
    String newKey = IngredientKey.normalize(safeName, safeUnit);

    Optional<IngredientDocument> existing = repository.findByKey(newKey);
    if (existing.isPresent() && !existing.get().getKey().equals(key)) {
      throw new IllegalStateException("Ingredient already exists");
    }

    IngredientDocument target = repository.findByKey(key).orElseThrow();
    target.setName(safeName);
    target.setUnit(safeUnit);
    target.setTranslations(cleanTranslations(translations));
    if (!newKey.equals(key)) {
      target.setKey(newKey);
    }
    IngredientDocument saved = repository.save(target);

    if (!newKey.equals(key)) {
      Query query = new Query(Criteria.where("ingredient_key").is(key));
      Update update = new Update()
          .set("ingredient_key", newKey)
          .set("ingredient_name", safeName);
      mongoTemplate.updateMulti(query, update, CalorieDocument.class);
    } else {
      Query query = new Query(Criteria.where("ingredient_key").is(key));
      Update update = new Update().set("ingredient_name", safeName);
      mongoTemplate.updateMulti(query, update, CalorieDocument.class);
    }

    return saved;
  }

  public Optional<IngredientDocument> findByKey(String key) {
    return repository.findByKey(key);
  }

  public void ensureIngredientEntries(List<com.mealplaner.dish.DishIngredient> ingredients) {
    if (ingredients == null) {
      return;
    }
    for (com.mealplaner.dish.DishIngredient ingredient : ingredients) {
      String name = ingredient.getName() == null ? "" : ingredient.getName().trim();
      String unit = Units.sanitize(ingredient.getUnit());
      if (name.isEmpty()) {
        continue;
      }
      String key = ingredient.getIngredientKey();
      if (key != null && !key.isBlank()) {
        key = key.trim().toLowerCase();
      } else {
        key = IngredientKey.normalize(name, unit);
      }
      Optional<IngredientDocument> existing = repository.findByKey(key);
      IngredientDocument doc = existing.orElseGet(IngredientDocument::new);
      doc.setKey(key);
      doc.setName(name);
      doc.setUnit(unit);
      if (doc.getTranslations() == null) {
        doc.setTranslations(Map.of());
      }
      repository.save(doc);
    }
  }

  private Map<String, String> cleanTranslations(Map<String, String> translations) {
    if (translations == null) {
      return Map.of();
    }
    return translations.entrySet()
        .stream()
        .filter(entry -> entry.getValue() != null && !entry.getValue().trim().isEmpty())
        .collect(Collectors.toMap(
            Map.Entry::getKey,
            entry -> entry.getValue().trim()
        ));
  }
}
