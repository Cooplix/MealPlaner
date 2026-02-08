package com.mealplaner.api;

import com.mealplaner.analytics.AnalyticsService;
import com.mealplaner.api.dto.DishCostAnalyticsResponse;
import com.mealplaner.api.dto.SpendingAnalyticsResponse;
import com.mealplaner.auth.UserPrincipal;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {
  private final AnalyticsService analyticsService;

  public AnalyticsController(AnalyticsService analyticsService) {
    this.analyticsService = analyticsService;
  }

  @GetMapping("/spending")
  public SpendingAnalyticsResponse spending(
      @RequestParam(required = false) String start,
      @RequestParam(required = false) String end,
      @RequestParam(required = false, name = "ingredientKey") String ingredientKey,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    String userId = requireUser(principal);
    try {
      return analyticsService.buildSpendingAnalytics(
          userId,
          Optional.ofNullable(start),
          Optional.ofNullable(end),
          Optional.ofNullable(ingredientKey)
      );
    } catch (IllegalArgumentException exc) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exc.getMessage());
    }
  }

  @GetMapping("/dish-costs")
  public DishCostAnalyticsResponse dishCosts(@AuthenticationPrincipal UserPrincipal principal) {
    String userId = requireUser(principal);
    return analyticsService.buildDishCostAnalytics(userId);
  }

  private String requireUser(UserPrincipal principal) {
    if (principal == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not validate credentials");
    }
    return principal.getId();
  }
}
