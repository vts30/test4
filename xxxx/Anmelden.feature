@feature-anmelden
Feature: Tests for login on ESM

  Scenario Outline: Login in ESM with user: "<userId>"
    Given User logs in "ESM" as "<userId>"
    Examples:
      | userId          |
      | configured-user |
