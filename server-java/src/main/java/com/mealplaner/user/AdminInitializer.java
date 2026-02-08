package com.mealplaner.user;

import com.mealplaner.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class AdminInitializer implements ApplicationRunner {
  private static final Logger logger = LoggerFactory.getLogger(AdminInitializer.class);

  private final AppProperties properties;
  private final UserRepository repository;
  private final UserService userService;

  public AdminInitializer(AppProperties properties, UserRepository repository, UserService userService) {
    this.properties = properties;
    this.repository = repository;
    this.userService = userService;
  }

  @Override
  public void run(ApplicationArguments args) {
    String adminLogin = properties.getAdmin().getLogin();
    String initialPassword = properties.getAdmin().getInitialPassword();
    if (initialPassword == null || initialPassword.isBlank()) {
      logger.warn("ADMIN_INITIAL_PASSWORD not set; skipping admin bootstrap");
      return;
    }
    if (repository.findByLogin(adminLogin).isPresent()) {
      return;
    }
    userService.createUser(adminLogin, "Administrator", initialPassword, true);
    logger.info("Created initial admin user '{}'", adminLogin);
  }
}
