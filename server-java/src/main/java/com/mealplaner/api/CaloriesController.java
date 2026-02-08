package com.mealplaner.api;

import com.mealplaner.api.dto.CalorieCreate;
import com.mealplaner.api.dto.CalorieEntry;
import com.mealplaner.api.dto.CalorieUpdate;
import com.mealplaner.auth.UserPrincipal;
import com.mealplaner.calorie.CalorieDocument;
import com.mealplaner.calorie.CalorieRepository;
import com.mealplaner.calorie.CalorieService;
import com.mealplaner.util.Units;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/calories")
public class CaloriesController {
  private final CalorieService calorieService;
  private final CalorieRepository calorieRepository;

  public CaloriesController(CalorieService calorieService, CalorieRepository calorieRepository) {
    this.calorieService = calorieService;
    this.calorieRepository = calorieRepository;
  }

  @GetMapping
  public List<CalorieEntry> list(@AuthenticationPrincipal UserPrincipal principal) {
    String userId = requireUser(principal);
    return calorieService.listAll(userId).stream()
        .map(this::toEntry)
        .toList();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public CalorieEntry create(
      @RequestBody CalorieCreate payload,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    String userId = requireUser(principal);
    if (payload.getUnit() == null || !Units.MEASUREMENT_UNITS.contains(payload.getUnit().trim())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported unit");
    }
    try {
      CalorieDocument saved = calorieService.create(
          userId,
          payload.getIngredientKey(),
          payload.getAmount(),
          payload.getUnit(),
          payload.getCalories()
      );
      return toEntry(saved);
    } catch (IllegalStateException exc) {
      String msg = exc.getMessage();
      if ("Ingredient not found".equals(msg)) {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND, msg);
      }
      throw new ResponseStatusException(HttpStatus.CONFLICT, msg);
    }
  }

  @PatchMapping("/{entryId}")
  public CalorieEntry update(
      @PathVariable String entryId,
      @RequestBody CalorieUpdate payload,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    String userId = requireUser(principal);
    CalorieDocument existing = calorieRepository.findByIdAndUserId(entryId, userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Calorie entry not found"));
    if (payload.getUnit() != null && !Units.MEASUREMENT_UNITS.contains(payload.getUnit().trim())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported unit");
    }
    try {
      CalorieDocument saved = calorieService.update(
          userId,
          existing,
          payload.getIngredientKey(),
          payload.getAmount(),
          payload.getUnit(),
          payload.getCalories()
      );
      return toEntry(saved);
    } catch (IllegalStateException exc) {
      String msg = exc.getMessage();
      if ("Calorie entry already exists".equals(msg)) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, msg);
      }
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Ingredient not found");
    }
  }

  private String requireUser(UserPrincipal principal) {
    if (principal == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not validate credentials");
    }
    return principal.getId();
  }

  private CalorieEntry toEntry(CalorieDocument doc) {
    CalorieEntry entry = new CalorieEntry();
    entry.setId(doc.getId());
    entry.setIngredientKey(doc.getIngredientKey());
    entry.setIngredientName(doc.getIngredientName());
    entry.setAmount(doc.getAmount());
    entry.setUnit(doc.getUnit());
    entry.setCalories(doc.getCalories());
    return entry;
  }
}
