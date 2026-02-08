package com.mealplaner.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class UserCreate {
  private String login;
  private String name;
  private String password;

  @JsonProperty("isAdmin")
  private boolean isAdmin;

  public String getLogin() {
    return login;
  }

  public void setLogin(String login) {
    this.login = login;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getPassword() {
    return password;
  }

  public void setPassword(String password) {
    this.password = password;
  }

  public boolean isAdmin() {
    return isAdmin;
  }

  public void setAdmin(boolean admin) {
    isAdmin = admin;
  }
}
