package com.mealplaner.api;

import com.mealplaner.api.dto.IngredientEntry;
import com.mealplaner.api.dto.IngredientUpsert;
import com.mealplaner.auth.UserPrincipal;
import com.mealplaner.ingredient.IngredientDocument;
import com.mealplaner.ingredient.IngredientService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/ingredients")
public class IngredientsController {
  private final IngredientService ingredientService;

  public IngredientsController(IngredientService ingredientService) {
    this.ingredientService = ingredientService;
  }

  @GetMapping
  public List<IngredientEntry> list(@AuthenticationPrincipal UserPrincipal principal) {
    String userId = requireUser(principal);
    return ingredientService.listIngredients(userId).stream()
        .map(this::toEntry)
        .toList();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public IngredientEntry create(
      @RequestBody IngredientUpsert payload,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    String userId = requireUser(principal);
    try {
      IngredientDocument doc = ingredientService.createIngredient(
          userId,
          payload.getName(),
          payload.getUnit(),
          payload.getTranslations()
      );
      return toEntry(doc);
    } catch (IllegalArgumentException exc) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exc.getMessage());
    } catch (IllegalStateException exc) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, exc.getMessage());
    }
  }

  @PutMapping("/{key}")
  public IngredientEntry update(
      @PathVariable String key,
      @RequestBody IngredientUpsert payload,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    String userId = requireUser(principal);
    try {
      IngredientDocument doc = ingredientService.updateIngredient(
          userId,
          key,
          payload.getName(),
          payload.getUnit(),
          payload.getTranslations()
      );
      return toEntry(doc);
    } catch (IllegalStateException exc) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, exc.getMessage());
    } catch (IllegalArgumentException exc) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exc.getMessage());
    } catch (Exception exc) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ingredient not found");
    }
  }

  private String requireUser(UserPrincipal principal) {
    if (principal == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not validate credentials");
    }
    return principal.getId();
  }

  private IngredientEntry toEntry(IngredientDocument doc) {
    return new IngredientEntry(
        doc.getKey(),
        doc.getName(),
        doc.getUnit(),
        doc.getTranslations()
    );
  }
}
