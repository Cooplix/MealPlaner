package com.mealplaner.calorie;

import com.mealplaner.ingredient.IngredientDocument;
import com.mealplaner.ingredient.IngredientRepository;
import com.mealplaner.util.Units;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class CalorieService {
  private final CalorieRepository repository;
  private final IngredientRepository ingredientRepository;

  public CalorieService(CalorieRepository repository, IngredientRepository ingredientRepository) {
    this.repository = repository;
    this.ingredientRepository = ingredientRepository;
  }

  public List<CalorieDocument> listAll(String userId) {
    claimUnowned(userId);
    return repository.findByUserId(userId).stream()
        .sorted(Comparator.comparing(CalorieDocument::getIngredientName, String.CASE_INSENSITIVE_ORDER)
            .thenComparing(CalorieDocument::getUnit)
            .thenComparingDouble(CalorieDocument::getAmount))
        .toList();
  }

  public CalorieDocument create(String userId, String ingredientKey, double amount, String unit, double calories) {
    String safeUnit = Units.sanitize(unit);
    Optional<IngredientDocument> ingredient = ingredientRepository.findByUserIdAndKey(userId, ingredientKey);
    if (ingredient.isEmpty()) {
      throw new IllegalStateException("Ingredient not found");
    }
    Optional<CalorieDocument> duplicate = repository.findByUserIdAndIngredientKeyAndUnitAndAmount(
        userId,
        ingredientKey,
        safeUnit,
        amount
    );
    if (duplicate.isPresent()) {
      throw new IllegalStateException("Calorie entry already exists");
    }
    CalorieDocument doc = new CalorieDocument();
    doc.setUserId(userId);
    doc.setIngredientKey(ingredientKey);
    doc.setIngredientName(
        ingredient.get().getName() == null || ingredient.get().getName().isBlank()
            ? ingredientKey
            : ingredient.get().getName().trim()
    );
    doc.setAmount(amount);
    doc.setUnit(safeUnit);
    doc.setCalories(calories);
    return repository.save(doc);
  }

  public CalorieDocument update(
      String userId,
      CalorieDocument existing,
      String ingredientKey,
      Double amount,
      String unit,
      Double calories
  ) {
    String targetKey = ingredientKey == null ? existing.getIngredientKey() : ingredientKey.trim();
    IngredientDocument ingredient = null;
    if (ingredientKey != null) {
      ingredient = ingredientRepository.findByUserIdAndKey(userId, targetKey)
          .orElseThrow(() -> new IllegalStateException("Ingredient not found"));
      existing.setIngredientKey(targetKey);
      existing.setIngredientName(
          ingredient.getName() == null || ingredient.getName().isBlank()
              ? targetKey
              : ingredient.getName().trim()
      );
    }

    if (unit != null) {
      existing.setUnit(Units.sanitize(unit));
    }
    if (amount != null) {
      existing.setAmount(amount);
    }
    if (calories != null) {
      existing.setCalories(calories);
    }

    Optional<CalorieDocument> duplicate = repository.findByUserIdAndIngredientKeyAndUnitAndAmount(
        userId,
        existing.getIngredientKey(),
        existing.getUnit(),
        existing.getAmount()
    );
    if (duplicate.isPresent() && !duplicate.get().getId().equals(existing.getId())) {
      throw new IllegalStateException("Calorie entry already exists");
    }
    return repository.save(existing);
  }

  private void claimUnowned(String userId) {
    List<CalorieDocument> legacy = repository.findByUserIdIsNull();
    if (legacy.isEmpty()) {
      return;
    }
    for (CalorieDocument doc : legacy) {
      doc.setUserId(userId);
    }
    repository.saveAll(legacy);
  }
}
