Feature: Login and check app

  Scenario: User logs in and inspects app
    Given the login page is open
    When the user logs in with valid credentials
    And the user navigates to the apps page
    Then the Startseite navigation item is visible
    When the user opens Benutzer Einstellungen
    Then the software version and browser version are recorded
