package com.mealplaner.api;

import com.mealplaner.api.dto.MigrationResult;
import com.mealplaner.auth.UserPrincipal;
import com.mealplaner.migration.MigrationService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/migrations")
public class MigrationsController {
  private final MigrationService migrationService;

  public MigrationsController(MigrationService migrationService) {
    this.migrationService = migrationService;
  }

  @PostMapping("/step-9")
  public MigrationResult runStep9(
      @RequestParam(defaultValue = "true") boolean dryRun,
      @RequestParam(defaultValue = "false") boolean backfillInventory,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    String userId = requireUser(principal);
    return migrationService.runStep9(userId, dryRun, backfillInventory);
  }

  private String requireUser(UserPrincipal principal) {
    if (principal == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not validate credentials");
    }
    return principal.getId();
  }
}
