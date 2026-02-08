package com.mealplaner.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class UserPublic {
  private String id;
  private String login;
  private String name;

  @JsonProperty("isAdmin")
  private boolean isAdmin;

  public UserPublic() {}

  public UserPublic(String id, String login, String name, boolean isAdmin) {
    this.id = id;
    this.login = login;
    this.name = name;
    this.isAdmin = isAdmin;
  }

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

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

  public boolean isAdmin() {
    return isAdmin;
  }

  public void setAdmin(boolean admin) {
    isAdmin = admin;
  }
}
