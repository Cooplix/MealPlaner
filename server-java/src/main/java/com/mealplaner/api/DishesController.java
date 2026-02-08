package com.mealplaner.api;

import com.mealplaner.api.dto.DishBase;
import com.mealplaner.api.dto.DishCreate;
import com.mealplaner.api.dto.DishIngredientDto;
import com.mealplaner.api.dto.DishUpdate;
import com.mealplaner.auth.UserPrincipal;
import com.mealplaner.dish.DishDocument;
import com.mealplaner.dish.DishIngredient;
import com.mealplaner.dish.DishService;
import com.mealplaner.util.Units;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/dishes")
public class DishesController {
  private final DishService dishService;

  public DishesController(DishService dishService) {
    this.dishService = dishService;
  }

  @GetMapping
  public List<DishBase> list(@AuthenticationPrincipal UserPrincipal principal) {
    String userId = requireUser(principal);
    return dishService.listDishes(userId).stream()
        .map(this::toDto)
        .toList();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public DishBase upsert(
      @RequestBody DishCreate payload,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    String userId = requireUser(principal);
    DishDocument doc = toDocument(payload);
    doc.setCreatedBy(principal.getLogin());
    DishDocument saved = dishService.upsertDish(userId, doc);
    return toDto(saved);
  }

  @PatchMapping("/{dishId}")
  public DishBase update(
      @PathVariable String dishId,
      @RequestBody DishUpdate payload,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    String userId = requireUser(principal);
    DishDocument update = new DishDocument();
    update.setName(payload.getName());
    update.setMeal(payload.getMeal());
    update.setNotes(payload.getNotes());
    if (payload.getIngredients() != null) {
      update.setIngredients(payload.getIngredients().stream().map(this::toIngredient).toList());
    }
    try {
      DishDocument saved = dishService.updateDish(userId, dishId, update);
      return toDto(saved);
    } catch (Exception exc) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dish not found");
    }
  }

  @DeleteMapping("/{dishId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(@PathVariable String dishId, @AuthenticationPrincipal UserPrincipal principal) {
    String userId = requireUser(principal);
    try {
      dishService.deleteDish(userId, dishId);
    } catch (IllegalStateException exc) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Dish not found");
    }
  }

  private String requireUser(UserPrincipal principal) {
    if (principal == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not validate credentials");
    }
    return principal.getId();
  }

  private DishDocument toDocument(DishCreate payload) {
    DishDocument doc = new DishDocument();
    doc.setId(payload.getId());
    doc.setName(payload.getName());
    doc.setMeal(payload.getMeal());
    doc.setNotes(payload.getNotes());
    if (payload.getIngredients() != null) {
      doc.setIngredients(payload.getIngredients().stream().map(this::toIngredient).toList());
    }
    return doc;
  }

  private DishIngredient toIngredient(DishIngredientDto dto) {
    DishIngredient ingredient = new DishIngredient();
    ingredient.setIngredientKey(dto.getIngredientKey());
    ingredient.setName(dto.getName());
    ingredient.setUnit(dto.getUnit());
    ingredient.setQty(dto.getQty());
    return ingredient;
  }

  private DishBase toDto(DishDocument doc) {
    DishBase dto = new DishBase();
    dto.setId(doc.getId());
    dto.setName(doc.getName());
    dto.setMeal(doc.getMeal());
    dto.setNotes(doc.getNotes());
    dto.setCreatedBy(doc.getCreatedBy());
    dto.setCalories(doc.getCalories());
    dto.setIngredients(doc.getIngredients().stream().map(this::toDtoIngredient).toList());
    return dto;
  }

  private DishIngredientDto toDtoIngredient(DishIngredient ingredient) {
    DishIngredientDto dto = new DishIngredientDto();
    dto.setIngredientKey(ingredient.getIngredientKey());
    dto.setName(ingredient.getName());
    dto.setUnit(Units.sanitize(ingredient.getUnit()));
    dto.setQty(ingredient.getQty());
    return dto;
  }
}
