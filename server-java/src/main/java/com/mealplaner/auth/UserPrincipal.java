package com.mealplaner.auth;

import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

public class UserPrincipal {
  private final String id;
  private final String login;
  private final String name;
  private final boolean admin;

  public UserPrincipal(String id, String login, String name, boolean admin) {
    this.id = id;
    this.login = login;
    this.name = name;
    this.admin = admin;
  }

  public String getId() {
    return id;
  }

  public String getLogin() {
    return login;
  }

  public String getName() {
    return name;
  }

  public boolean isAdmin() {
    return admin;
  }

  public Collection<? extends GrantedAuthority> authorities() {
    if (admin) {
      return List.of(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }
    return List.of();
  }
}
