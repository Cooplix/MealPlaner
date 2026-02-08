package com.mealplaner.user;

import com.mealplaner.auth.PasswordService;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class UserService {
  private final UserRepository repository;
  private final PasswordService passwordService;

  public UserService(UserRepository repository, PasswordService passwordService) {
    this.repository = repository;
    this.passwordService = passwordService;
  }

  public Optional<UserDocument> findByLogin(String login) {
    return repository.findByLogin(login);
  }

  public Optional<UserDocument> findById(String id) {
    return repository.findById(id);
  }

  public UserDocument createUser(String login, String name, String password, boolean isAdmin) {
    UserDocument user = new UserDocument();
    user.setLogin(login);
    user.setName(name);
    user.setHashedPassword(passwordService.hash(password));
    user.setAdmin(isAdmin);
    return repository.save(user);
  }

  public boolean verifyPassword(UserDocument user, String rawPassword) {
    return passwordService.matches(rawPassword, user.getHashedPassword());
  }

  public void updateName(UserDocument user, String name) {
    user.setName(name);
    repository.save(user);
  }

  public void updatePassword(UserDocument user, String newPassword) {
    user.setHashedPassword(passwordService.hash(newPassword));
    repository.save(user);
  }

  public void upgradePasswordIfLegacy(UserDocument user, String rawPassword) {
    String stored = user.getHashedPassword();
    if (stored != null && stored.startsWith("$pbkdf2-sha256$")) {
      user.setHashedPassword(passwordService.hash(rawPassword));
      repository.save(user);
    }
  }
}
