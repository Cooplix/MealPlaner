package com.mealplaner.api;

import com.mealplaner.api.dto.ReferenceDataResponse;
import com.mealplaner.auth.UserPrincipal;
import com.mealplaner.reference.ReferenceDataService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/reference-data")
public class ReferenceDataController {
  private final ReferenceDataService referenceDataService;

  public ReferenceDataController(ReferenceDataService referenceDataService) {
    this.referenceDataService = referenceDataService;
  }

  @GetMapping
  public ReferenceDataResponse get(@AuthenticationPrincipal UserPrincipal principal) {
    requireUser(principal);
    return referenceDataService.getReferenceData();
  }

  private void requireUser(UserPrincipal principal) {
    if (principal == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not validate credentials");
    }
  }
}
