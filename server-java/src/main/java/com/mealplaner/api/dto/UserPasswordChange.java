package com.mealplaner.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class UserPasswordChange {
  @JsonProperty("currentPassword")
  private String currentPassword;

  @JsonProperty("newPassword")
  private String newPassword;

  public String getCurrentPassword() {
    return currentPassword;
  }

  public void setCurrentPassword(String currentPassword) {
    this.currentPassword = currentPassword;
  }

  public String getNewPassword() {
    return newPassword;
  }

  public void setNewPassword(String newPassword) {
    this.newPassword = newPassword;
  }
}
