/**
 * Data collection form initialization and event handling
 */

import type { IUser } from "@/model/Models";
import { AllianceColor, isValidUser } from "@/model/Models";
import { showError, showSuccess } from "@/utils/notifications";
import { showValidationError, clearValidationError } from "@/utils/validation";
import {
  saveToLocalStorage,
  getFromLocalStorage,
  clearFormDataFromLocalStorage,
} from "@/utils/localStorage";
import { getFromSessionStorage } from "@/utils/sessionStorage";
import { getJsonFromSessionStorage } from "@/utils/sessionStorage";
import {
  saveMatchToStorage,
  submitAllPendingMatches,
  cleanInvalidMatches,
} from "@/services/matchStorage";
import { logger } from '@/utils/logger';
import {
  fetchSchedule,
  getSchedule,
  isScheduleLoading,
  onScheduleLoadComplete,
  setSchedule,
  clearSchedule,
} from "@/services/scheduleService";
import { TIMING, STORAGE_KEYS } from "@/constants";

// Constants
const SCHEDULE_LOAD_DELAY_MS = TIMING.SCHEDULE_LOAD_DELAY;
const AUTH_ERROR_REDIRECT_DELAY_MS = TIMING.AUTH_ERROR_REDIRECT_DELAY;

/**
 * Show/hide appropriate team number input based on schedule state
 */
function updateTeamNumberUI(): void {
  const loader = document.getElementById("schedule-loader");
  const dropdownContainer = document.getElementById(
    "team-number-dropdown-container",
  );
  const manualContainer = document.getElementById(
    "team-number-manual-container",
  );
  const allianceSection = document.getElementById("alliance-section");
  const matchNumberInput = document.getElementById(
    "match-number",
  ) as HTMLInputElement;
  const dropdown = document.getElementById(
    "team-number-dropdown",
  ) as HTMLSelectElement;

  if (
    !loader ||
    !dropdownContainer ||
    !manualContainer ||
    !allianceSection ||
    !dropdown
  )
    return;

  const schedule = getSchedule();

  if (schedule === null && isScheduleLoading()) {
    // Schedule is actively loading: show loader and hide inputs
    loader.classList.remove("hidden");
    dropdownContainer.classList.add("hidden");
    manualContainer.classList.add("hidden");
    allianceSection.classList.add("hidden");
    return;
  }

  const matchNumber = matchNumberInput?.value;

  // If schedule failed to load (is null but not loading), show manual entry mode regardless of match number
  if (schedule === null) {
    loader.classList.add("hidden");
    dropdownContainer.classList.add("hidden");
    manualContainer.classList.remove("hidden");
    allianceSection.classList.remove("hidden");
    updateAllianceButtonsState(true);
    return;
  }

  // If no match number entered and schedule exists, show dropdown as disabled/grayed out
  if (!matchNumber || matchNumber.trim() === "") {
    loader.classList.add("hidden");
    dropdownContainer.classList.remove("hidden");
    manualContainer.classList.add("hidden");
    allianceSection.classList.remove("hidden");
    // Disable dropdown when no match number
    dropdown.disabled = true;
    dropdown.value = "";
    updateAllianceButtonsState(false);
    return;
  }

  const matchIndex = parseInt(matchNumber) - 1;
  if (isNaN(matchIndex) || matchIndex < 0 || matchIndex >= schedule.length) {
    // Match number doesn't match schedule - use manual entry
    loader.classList.add("hidden");
    dropdownContainer.classList.add("hidden");
    manualContainer.classList.remove("hidden");
    allianceSection.classList.remove("hidden");
    updateAllianceButtonsState(true);
    return;
  }

  // Valid match number with schedule - show dropdown as enabled
  const restoredTeamNumber = populateTeamDropdown(matchIndex);
  dropdownContainer.classList.remove("hidden");
  manualContainer.classList.add("hidden");
  allianceSection.classList.remove("hidden");
  // Enable dropdown when valid match number
  dropdown.disabled = false;
  // Disable alliance buttons in schedule mode (alliance is auto-set by team selection)
  updateAllianceButtonsState(false);

  // If team was restored, set the alliance
  if (restoredTeamNumber) {
    const dropdown = document.getElementById(
      "team-number-dropdown",
    ) as HTMLSelectElement;
    const selectedOption = dropdown?.options[dropdown?.selectedIndex];
    if (selectedOption?.dataset.alliance) {
      const allianceValue = selectedOption.dataset.alliance;
      // Update selectedAlliance variable if it exists in scope
      // This will be handled by the initialization code
      saveToLocalStorage("allianceColor", allianceValue);
    }
  }
}

/**
 * Update disabled state of alliance buttons based on schedule mode
 * @param isManualMode - true if in manual mode (alliance buttons should be enabled), false if in schedule mode (alliance buttons should be disabled)
 */
function updateAllianceButtonsState(isManualMode: boolean): void {
  const allianceButtons = document.querySelectorAll(".alliance-toggle");
  allianceButtons.forEach((button) => {
    (button as HTMLButtonElement).disabled = !isManualMode;
  });
}

/**
 * Populate team number dropdown from schedule
 * @returns The saved team number if restored, null otherwise
 */
function populateTeamDropdown(matchIndex: number): string | null {
  const schedule = getSchedule();
  if (!schedule) return null;

  const dropdown = document.getElementById(
    "team-number-dropdown",
  ) as HTMLSelectElement;
  if (!dropdown) return null;

  const lineup = schedule[matchIndex];
  const redRobots = [lineup.red1, lineup.red2, lineup.red3].map(String);
  const blueRobots = [lineup.blue1, lineup.blue2, lineup.blue3].map(String);

  // Clear existing options
  dropdown.innerHTML = '<option value="">Select Team</option>';

  // Add red alliance header
  const redHeader = document.createElement("option");
  redHeader.disabled = true;
  redHeader.textContent = "━━ Red Alliance ━━";
  redHeader.classList.add("alliance-header-red");
  dropdown.appendChild(redHeader);

  // Add red teams
  redRobots.forEach((robot) => {
    const option = document.createElement("option");
    option.value = robot;
    option.textContent = robot;
    option.dataset.alliance = "red";
    dropdown.appendChild(option);
  });

  // Add blue alliance header
  const blueHeader = document.createElement("option");
  blueHeader.disabled = true;
  blueHeader.textContent = "━━ Blue Alliance ━━";
  blueHeader.classList.add("alliance-header-blue");
  dropdown.appendChild(blueHeader);

  // Add blue teams
  blueRobots.forEach((robot) => {
    const option = document.createElement("option");
    option.value = robot;
    option.textContent = robot;
    option.dataset.alliance = "blue";
    dropdown.appendChild(option);
  });

  // Restore saved selection if applicable
  const savedTeamNumber = getFromLocalStorage("scoutedTeamNumber");
  if (
    savedTeamNumber &&
    (redRobots.includes(savedTeamNumber) ||
      blueRobots.includes(savedTeamNumber))
  ) {
    dropdown.value = savedTeamNumber;
    // Also restore the alliance based on the selected option
    return savedTeamNumber;
  }
  return null;
}

let leftCounter = 0;
let rightCounter = 0;
let leftBumpCounter = 0;
let rightBumpCounter = 0;

/**
 * Initialize the data collection form
 * @returns Cleanup function to remove event listeners
 */
export function initializeDataCollection(): (() => void) | void {
  logger.info("[Data Collection] Initializing...");

  const form = document.getElementById(
    "data-collection-form",
  ) as HTMLFormElement;
  if (!form) {
    logger.error("[Data Collection] Form element not found");
    return;
  }

  // Prevent double initialization (React Strict Mode runs effects twice)
  if (form.dataset.initialized === "true") {
    logger.info("[Data Collection] Already initialized, skipping...");
    return () => {
      // Cleanup function even if already initialized
      form.dataset.initialized = "false";
    };
  }

  // Mark form as initialized
  form.dataset.initialized = "true";

  // Clear any residual counter values from localStorage at the start
  // This prevents stale counter values from being restored on page reload
  localStorage.removeItem("leftCounter");
  localStorage.removeItem("rightCounter");
  localStorage.removeItem("leftBumpCounter");
  localStorage.removeItem("rightBumpCounter");
  // Ensure estimate values do NOT persist across page refresh
  localStorage.removeItem("estimateSize");
  localStorage.removeItem("estimateSizeAuto");

  const submitButton = document.querySelector(
    ".submit-button",
  ) as HTMLButtonElement;
  const matchNumberInput = document.getElementById(
    "match-number",
  ) as HTMLInputElement;
  const teamNumberInput = document.getElementById(
    "team-number",
  ) as HTMLInputElement;
  const teamNumberDropdown = document.getElementById(
    "team-number-dropdown",
  ) as HTMLSelectElement;
  const estimateSizeAuto = document.getElementById(
    "estimate-size-auto",
  ) as HTMLInputElement;
  const estimateSizeSelect = document.getElementById(
    "estimate-size",
  ) as HTMLInputElement;
  const autoCurrentEstimateEl = document.getElementById(
    "auto-current-estimate",
  );
  const teleopCurrentEstimateEl = document.getElementById(
    "teleop-current-estimate",
  );

  // Verify critical elements exist
  if (!matchNumberInput || !teamNumberInput) {
    logger.error("[Data Collection] Critical form elements not found");
    return;
  }

  let selectedAlliance = "";
  let hasUserInteracted = false;
  let leaveValue = getFromLocalStorage("leaveValue", "no");
  let leaveValueTeleop = getFromLocalStorage("leaveValueTeleop", "none");
  let estimateSizeAutoValue = getFromLocalStorage("estimateSizeAuto", "");
  let estimateSizeValue = getFromLocalStorage("estimateSize", "");
  form.dataset.estimateSizeAutoValue = estimateSizeAutoValue;
  form.dataset.estimateSizeValue = estimateSizeValue;

  const updateAutoEstimateDisplay = () => {
    if (autoCurrentEstimateEl) {
      autoCurrentEstimateEl.textContent = `Current Value: ${Number(estimateSizeAutoValue || "0")}`;
    }
  };

  const updateTeleopEstimateDisplay = () => {
    if (teleopCurrentEstimateEl) {
      teleopCurrentEstimateEl.textContent = `Current Value: ${Number(estimateSizeValue || "0")}`;
    }
  };

  updateAutoEstimateDisplay();
  updateTeleopEstimateDisplay();

  // Store counter state on form element to avoid closure scope issues
  const setCounters = (counters: {
    leftCounter: number;
    rightCounter: number;
    leftBumpCounter: number;
    rightBumpCounter: number;
  }) => {
    form.dataset.leftCounter = String(counters.leftCounter);
    form.dataset.rightCounter = String(counters.rightCounter);
    form.dataset.leftBumpCounter = String(counters.leftBumpCounter);
    form.dataset.rightBumpCounter = String(counters.rightBumpCounter);
  };

  const getCounterValue = (
    key: "leftCounter" | "rightCounter" | "leftBumpCounter" | "rightBumpCounter",
    fallback: number,
  ): number => {
    const rawValue = form.dataset[key];
    const parsedValue = Number(rawValue ?? fallback);
    return Number.isFinite(parsedValue) ? parsedValue : fallback;
  };

  const getEstimateValue = (
    key: "estimateSizeAutoValue" | "estimateSizeValue",
    fallback: string,
  ): string => {
    return form.dataset[key] ?? fallback;
  };

  // Initialize form.dataset with current values
  setCounters({
    leftCounter,
    rightCounter,
    leftBumpCounter,
    rightBumpCounter,
  });



  // Get user data and event code
  const userDataStr = sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (!userDataStr) {
    showError("User data not found. Redirecting to login...");
    setTimeout(() => {
      window.location.href = "/";
    }, AUTH_ERROR_REDIRECT_DELAY_MS);
    return;
  }

  let userData: IUser;
  try {
    const parsed = JSON.parse(userDataStr);
    if (!isValidUser(parsed)) {
      throw new Error("Invalid user data format");
    }
    userData = parsed;
  } catch (error) {
    showError("Invalid user data. Redirecting to login...");
    setTimeout(() => {
      window.location.href = "/";
    }, AUTH_ERROR_REDIRECT_DELAY_MS);
    return;
  }

  // Clean invalid matches on load (just log, don't show error toast)
  cleanInvalidMatches(userData);

  // Initialize schedule from cache or fetch if needed
  const tbaCode = getFromSessionStorage(STORAGE_KEYS.TBA_CODE);
  if (tbaCode) {
    // Try to use schedule cached from login first
    const cachedSchedule = getJsonFromSessionStorage<any[]>(
      STORAGE_KEYS.SCHEDULE,
    );
    if (
      cachedSchedule &&
      Array.isArray(cachedSchedule) &&
      cachedSchedule.length > 0
    ) {
      // Use cached schedule from login
      setSchedule(cachedSchedule, tbaCode);
      // Update UI immediately
      setTimeout(() => updateTeamNumberUI(), 50);
    } else {
      // No cached schedule, fetch from API
      fetchSchedule(tbaCode);
      // Register callback to update UI when schedule finishes loading
      onScheduleLoadComplete(() => updateTeamNumberUI());
      // Give schedule time to load, then update UI
      setTimeout(() => updateTeamNumberUI(), SCHEDULE_LOAD_DELAY_MS);
    }
  } else {
    // No TBA code - clear any cached schedule
    clearSchedule();
    setTimeout(() => updateTeamNumberUI(), 50);
  }

  // Function to validate form and update submit button state
  function validateForm(showErrors = true): boolean {
    let isValid = true;

    // Clear previous errors
    clearValidationError("match-number");
    clearValidationError("team-number");
    clearValidationError("team-number-dropdown");

    // Clear alliance error
    const allianceSection = document.getElementById("alliance-section");
    if (allianceSection) {
      allianceSection.querySelector(".field-error")?.remove();
      allianceSection.classList.remove("has-error");
    }

    const hasMatchNumber =
      matchNumberInput && matchNumberInput.value.trim() !== "";
    if (!hasMatchNumber) {
      if (showErrors) {
        showValidationError("match-number", "Match number is required");
      }
      isValid = false;
    }

    // Check team number from either input or dropdown
    const isDropdownMode =
      teamNumberDropdown &&
      !teamNumberDropdown.parentElement?.classList.contains("hidden");
    const hasTeamNumber = isDropdownMode
      ? teamNumberDropdown.value.trim() !== ""
      : teamNumberInput && teamNumberInput.value.trim() !== "";

    if (!hasTeamNumber) {
      if (showErrors) {
        const fieldId = isDropdownMode ? "team-number-dropdown" : "team-number";
        showValidationError(fieldId, "Team number is required");
      }
      isValid = false;
    }

    // Alliance selection is always required
    const hasAlliance = selectedAlliance !== "";

    if (!hasAlliance) {
      isValid = false;
    }

    if (submitButton) {
      // Only enable if ALL required fields are filled AND user has interacted with the form
      submitButton.disabled = !isValid || !hasUserInteracted;
    }

    return isValid;
  }

  // Initialize submit button as disabled
  if (submitButton) {
    submitButton.disabled = true;
  }

  // Floating label functionality for form fields
  const formFields = document.querySelectorAll(".form-field");
  formFields.forEach((field) => {
    const input = field.querySelector("input");
    const select = field.querySelector("select");
    const inputElement = input || select;
    if (!inputElement) return;

    // Check if input has value on load
    if (inputElement.value) {
      field.classList.add("has-value");
    }

    // Update has-value class on input/select
    inputElement.addEventListener("input", () => {
      if (inputElement.value) {
        field.classList.add("has-value");
      } else {
        field.classList.remove("has-value");
      }
    });

    inputElement.addEventListener("change", () => {
      if (inputElement.value) {
        field.classList.add("has-value");
      } else {
        field.classList.remove("has-value");
      }
    });

    // Handle focus/blur for proper label animation
    inputElement.addEventListener("blur", () => {
      if (!inputElement.value) {
        field.classList.remove("has-value");
      }
    });
  });

  // Team number dropdown handler
  if (teamNumberDropdown) {
    teamNumberDropdown.addEventListener("change", () => {
      if (isResetting) return;
      hasUserInteracted = true;
      const selectedOption =
        teamNumberDropdown.options[teamNumberDropdown.selectedIndex];
      const teamNumber = teamNumberDropdown.value;

      clearValidationError("team-number-dropdown");

      if (teamNumber && selectedOption?.dataset.alliance) {
        // Auto-set alliance based on selection
        selectedAlliance = selectedOption.dataset.alliance;
        saveToLocalStorage("scoutedTeamNumber", teamNumber);
        saveToLocalStorage("allianceColor", selectedAlliance);

        // Update alliance button UI to match selected team
        allianceButtons.forEach((btn) => {
          if (btn.getAttribute("data-value") === selectedAlliance) {
            btn.classList.add("selected");
            btn.setAttribute("aria-checked", "true");
          } else {
            btn.classList.remove("selected");
            btn.setAttribute("aria-checked", "false");
          }
        });
        // Disable alliance buttons in schedule mode (team auto-selected)
        updateAllianceButtonsState(false);
      } else {
        selectedAlliance = "";
      }

      validateForm(false);
    });
  }

  // Load saved form data from localStorage
  if (matchNumberInput) {
    const savedMatchNumber = getFromLocalStorage("matchNumber");
    if (savedMatchNumber) {
      matchNumberInput.value = savedMatchNumber;
      // Update UI for team number dropdown if applicable
      updateTeamNumberUI();
    }
    matchNumberInput.addEventListener("input", () => {
      if (isResetting) return;
      hasUserInteracted = true;
      saveToLocalStorage("matchNumber", matchNumberInput.value);
      clearValidationError("match-number");
      updateTeamNumberUI();
      validateForm(false);
    });
  }

  if (teamNumberInput) {
    const savedTeamNumber = getFromLocalStorage("scoutedTeamNumber");
    if (savedTeamNumber) {
      teamNumberInput.value = savedTeamNumber;
      // Don't trigger input event during initialization - we'll validate at the end
    }
    teamNumberInput.addEventListener("input", () => {
      if (isResetting) return;
      hasUserInteracted = true;
      saveToLocalStorage("scoutedTeamNumber", teamNumberInput.value);
      clearValidationError("team-number");
      // Enable alliance buttons in manual mode
      updateAllianceButtonsState(true);
      validateForm(false);
    });
  }

  // Load saved alliance color
  const savedAlliance = getFromLocalStorage("allianceColor");
  if (savedAlliance) {
    selectedAlliance = savedAlliance;
  }

  // Alliance color toggle functionality
  const allianceButtons = document.querySelectorAll(".alliance-toggle");
  if (savedAlliance) {
    allianceButtons.forEach((btn) => {
      if (btn.getAttribute("data-value") === savedAlliance) {
        btn.classList.add("selected");
        btn.setAttribute("aria-checked", "true");
      } else {
        btn.setAttribute("aria-checked", "false");
      }
    });
  }

  allianceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (isResetting) return;
      hasUserInteracted = true;
      // Remove selected class and update ARIA from all buttons
      allianceButtons.forEach((btn) => {
        btn.classList.remove("selected");
        btn.setAttribute("aria-checked", "false");
      });

      // Add selected class and update ARIA to clicked button
      button.classList.add("selected");
      button.setAttribute("aria-checked", "true");
      const dataValue = button.getAttribute("data-value");
      selectedAlliance = dataValue ?? "";

      // Save to localStorage
      saveToLocalStorage("allianceColor", selectedAlliance);

      // Validate form after alliance selection
      validateForm(false);
    });
  });

  // Leave toggle functionality (Auto)
  const leaveToggleButtons = document.querySelectorAll(
    ".toggle-button-group .toggle-button",
  );
  leaveToggleButtons.forEach((button) => {
    if (button.getAttribute("data-value") === leaveValue) {
      button.classList.add("selected");
      button.setAttribute("aria-checked", "true");
    } else {
      button.setAttribute("aria-checked", "false");
    }
  });

  leaveToggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      leaveToggleButtons.forEach((btn) => {
        btn.classList.remove("selected");
        btn.setAttribute("aria-checked", "false");
      });
      button.classList.add("selected");
      button.setAttribute("aria-checked", "true");
      const dataValue = button.getAttribute("data-value");
      leaveValue = dataValue ?? "none";
      saveToLocalStorage("leaveValue", leaveValue);
    });
  });

  // Auto estimate size button functionality
  if (estimateSizeAuto) {
    const estimateSizeAutoContainer =
      estimateSizeAuto.parentElement as HTMLElement;
    let estimateSizeAutoButtons = estimateSizeAutoContainer?.querySelectorAll(
      ".estimate-button:not(.estimate-button-previous)",
    ) as NodeListOf<HTMLElement>;

    estimateSizeAutoButtons.forEach((button) => {
      const newButton = button.cloneNode(true) as HTMLButtonElement;
      button.replaceWith(newButton);
    });

    estimateSizeAutoButtons = estimateSizeAutoContainer?.querySelectorAll(
      ".estimate-button:not(.estimate-button-previous)",
    ) as NodeListOf<HTMLElement>;

    if (estimateSizeAutoValue) {
      estimateSizeAutoButtons.forEach((btn) => {
        if (btn.getAttribute("data-value") === estimateSizeAutoValue) {
          btn.classList.add("selected");
          btn.setAttribute("aria-checked", "true");
        }
      });
      estimateSizeAutoContainer?.classList.add("has-value");
    }

    estimateSizeAutoButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const delta = Number(button.getAttribute("data-value") || "0");
        const currentValue = getEstimateValue(
          "estimateSizeAutoValue",
          estimateSizeAutoValue,
        );
        const nextValue = Math.max(0, Number(currentValue || "0") + delta);
        estimateSizeAutoValue = String(nextValue);
        form.dataset.estimateSizeAutoValue = estimateSizeAutoValue;
        estimateSizeAuto.value = estimateSizeAutoValue;
        saveToLocalStorage("estimateSizeAuto", estimateSizeAutoValue);
        if (nextValue > 0) {
          estimateSizeAutoContainer?.classList.add("has-value");
        } else {
          estimateSizeAutoContainer?.classList.remove("has-value");
        }
        updateAutoEstimateDisplay();
      });
    });
  }

  // Current Teleop estimate size button functionality
  if (estimateSizeSelect) {
    const estimateSizeContainer =
      estimateSizeSelect.parentElement as HTMLElement;
    let estimateSizeButtons = estimateSizeContainer?.querySelectorAll(
      ".estimate-button:not(.estimate-button-previous)",
    ) as NodeListOf<HTMLElement>;

    estimateSizeButtons.forEach((button) => {
      const newButton = button.cloneNode(true) as HTMLButtonElement;
      button.replaceWith(newButton);
    });

    estimateSizeButtons = estimateSizeContainer?.querySelectorAll(
      ".estimate-button:not(.estimate-button-previous)",
    ) as NodeListOf<HTMLElement>;

    if (estimateSizeValue) {
      estimateSizeButtons.forEach((btn) => {
        if (btn.getAttribute("data-value") === estimateSizeValue) {
          btn.classList.add("selected");
          btn.setAttribute("aria-checked", "true");
        }
      });
      estimateSizeContainer?.classList.add("has-value");
    }

    estimateSizeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const delta = Number(button.getAttribute("data-value") || "0");
        const currentValue = getEstimateValue(
          "estimateSizeValue",
          estimateSizeValue,
        );
        const nextValue = Math.max(0, Number(currentValue || "0") + delta);
        estimateSizeValue = String(nextValue);
        form.dataset.estimateSizeValue = estimateSizeValue;
        estimateSizeSelect.value = estimateSizeValue;
        saveToLocalStorage("estimateSize", estimateSizeValue);
        if (nextValue > 0) {
          estimateSizeContainer?.classList.add("has-value");
        } else {
          estimateSizeContainer?.classList.remove("has-value");
        }
        updateTeleopEstimateDisplay();
      });
    });
  }

  // Trench counter functionality
  const leftCounterEl = document.getElementById("left-counter");
  const rightCounterEl = document.getElementById("right-counter");
  let leftTrenchBtn = document.querySelector(".left-trench") as HTMLButtonElement | null;
  let rightTrenchBtn = document.querySelector(".right-trench") as HTMLButtonElement | null;
  let leftDecrementBtn = document.querySelector(".left-decrement") as HTMLButtonElement | null;
  let rightDecrementBtn = document.querySelector(".right-decrement") as HTMLButtonElement | null;

  // Clone buttons to remove all previous event listeners
  if (leftTrenchBtn) {
    const newBtn = leftTrenchBtn.cloneNode(true) as HTMLButtonElement;
    leftTrenchBtn.replaceWith(newBtn);
    leftTrenchBtn = newBtn;
  }
  if (rightTrenchBtn) {
    const newBtn = rightTrenchBtn.cloneNode(true) as HTMLButtonElement;
    rightTrenchBtn.replaceWith(newBtn);
    rightTrenchBtn = newBtn;
  }
  if (leftDecrementBtn) {
    const newBtn = leftDecrementBtn.cloneNode(true) as HTMLButtonElement;
    leftDecrementBtn.replaceWith(newBtn);
    leftDecrementBtn = newBtn;
  }
  if (rightDecrementBtn) {
    const newBtn = rightDecrementBtn.cloneNode(true) as HTMLButtonElement;
    rightDecrementBtn.replaceWith(newBtn);
    rightDecrementBtn = newBtn;
  }

  if (leftCounterEl) leftCounterEl.textContent = leftCounter.toString();
  if (rightCounterEl) rightCounterEl.textContent = rightCounter.toString();

  // Debounce handler to prevent rapid clicks from triggering multiple increments
  let leftTrenchLastClick = 0;
  let rightTrenchLastClick = 0;
  let leftDecrementLastClick = 0;
  let rightDecrementLastClick = 0;
  const DEBOUNCE_MS = 100; // 100ms debounce

  if (leftTrenchBtn) {
    leftTrenchBtn.addEventListener("click", () => {
      const now = Date.now();
      if (now - leftTrenchLastClick < DEBOUNCE_MS) return;
      leftTrenchLastClick = now;

      leftCounter = getCounterValue("leftCounter", leftCounter) + 1;
      form.dataset.leftCounter = String(leftCounter);
      if (leftCounterEl) leftCounterEl.textContent = leftCounter.toString();
    });
  }

  if (rightTrenchBtn) {
    rightTrenchBtn.addEventListener("click", () => {
      const now = Date.now();
      if (now - rightTrenchLastClick < DEBOUNCE_MS) return;
      rightTrenchLastClick = now;

      rightCounter = getCounterValue("rightCounter", rightCounter) + 1;
      form.dataset.rightCounter = String(rightCounter);
      if (rightCounterEl) rightCounterEl.textContent = rightCounter.toString();
    });
  }

  if (leftDecrementBtn) {
    leftDecrementBtn.addEventListener("click", () => {
      const now = Date.now();
      if (now - leftDecrementLastClick < DEBOUNCE_MS) return;
      leftDecrementLastClick = now;

      leftCounter = getCounterValue("leftCounter", leftCounter);
      if (leftCounter > 0) {
        leftCounter--;
        form.dataset.leftCounter = String(leftCounter);
        if (leftCounterEl) leftCounterEl.textContent = leftCounter.toString();
      }
    });
  }

  if (rightDecrementBtn) {
    rightDecrementBtn.addEventListener("click", () => {
      const now = Date.now();
      if (now - rightDecrementLastClick < DEBOUNCE_MS) return;
      rightDecrementLastClick = now;

      rightCounter = getCounterValue("rightCounter", rightCounter);
      if (rightCounter > 0) {
        rightCounter--;
        form.dataset.rightCounter = String(rightCounter);
        if (rightCounterEl)
          rightCounterEl.textContent = rightCounter.toString();
      }
    });
  }

  // Bump counter functionality
  const leftBumpCounterEl = document.getElementById("left-bump-counter");
  const rightBumpCounterEl = document.getElementById("right-bump-counter");
  let leftBumpBtn = document.querySelector(
    ".left-bump",
  ) as HTMLButtonElement | null;
  let rightBumpBtn = document.querySelector(
    ".right-bump",
  ) as HTMLButtonElement | null;
  let leftBumpDecrementBtn = document.querySelector(
    ".left-bump-decrement",
  ) as HTMLButtonElement | null;
  let rightBumpDecrementBtn = document.querySelector(
    ".right-bump-decrement",
  ) as HTMLButtonElement | null;

  // Clone buttons to remove all previous event listeners
  if (leftBumpBtn) {
    const newBtn = leftBumpBtn.cloneNode(true) as HTMLButtonElement;
    leftBumpBtn.replaceWith(newBtn);
    leftBumpBtn = newBtn;
  }
  if (rightBumpBtn) {
    const newBtn = rightBumpBtn.cloneNode(true) as HTMLButtonElement;
    rightBumpBtn.replaceWith(newBtn);
    rightBumpBtn = newBtn;
  }
  if (leftBumpDecrementBtn) {
    const newBtn = leftBumpDecrementBtn.cloneNode(true) as HTMLButtonElement;
    leftBumpDecrementBtn.replaceWith(newBtn);
    leftBumpDecrementBtn = newBtn;
  }
  if (rightBumpDecrementBtn) {
    const newBtn = rightBumpDecrementBtn.cloneNode(true) as HTMLButtonElement;
    rightBumpDecrementBtn.replaceWith(newBtn);
    rightBumpDecrementBtn = newBtn;
  }

  if (leftBumpCounterEl)
    leftBumpCounterEl.textContent = leftBumpCounter.toString();
  if (rightBumpCounterEl)
    rightBumpCounterEl.textContent = rightBumpCounter.toString();

  // Debounce handler to prevent rapid clicks from triggering multiple increments
  let leftBumpLastClick = 0;
  let rightBumpLastClick = 0;
  let leftBumpDecrementLastClick = 0;
  let rightBumpDecrementLastClick = 0;

  if (leftBumpBtn) {
    leftBumpBtn.addEventListener("click", () => {
      const now = Date.now();
      if (now - leftBumpLastClick < DEBOUNCE_MS) return;
      leftBumpLastClick = now;

      leftBumpCounter = getCounterValue("leftBumpCounter", leftBumpCounter) + 1;
      form.dataset.leftBumpCounter = String(leftBumpCounter);
      if (leftBumpCounterEl)
        leftBumpCounterEl.textContent = leftBumpCounter.toString();
    });
  }

  if (rightBumpBtn) {
    rightBumpBtn.addEventListener("click", () => {
      const now = Date.now();
      if (now - rightBumpLastClick < DEBOUNCE_MS) return;
      rightBumpLastClick = now;

      rightBumpCounter = getCounterValue("rightBumpCounter", rightBumpCounter) + 1;
      form.dataset.rightBumpCounter = String(rightBumpCounter);
      if (rightBumpCounterEl)
        rightBumpCounterEl.textContent = rightBumpCounter.toString();
    });
  }

  if (leftBumpDecrementBtn) {
    leftBumpDecrementBtn.addEventListener("click", () => {
      const now = Date.now();
      if (now - leftBumpDecrementLastClick < DEBOUNCE_MS) return;
      leftBumpDecrementLastClick = now;

      leftBumpCounter = getCounterValue("leftBumpCounter", leftBumpCounter);
      if (leftBumpCounter > 0) {
        leftBumpCounter--;
        form.dataset.leftBumpCounter = String(leftBumpCounter);
        if (leftBumpCounterEl)
          leftBumpCounterEl.textContent = leftBumpCounter.toString();
      }
    });
  }

  if (rightBumpDecrementBtn) {
    rightBumpDecrementBtn.addEventListener("click", () => {
      const now = Date.now();
      if (now - rightBumpDecrementLastClick < DEBOUNCE_MS) return;
      rightBumpDecrementLastClick = now;

      rightBumpCounter = getCounterValue("rightBumpCounter", rightBumpCounter);
      if (rightBumpCounter > 0) {
        rightBumpCounter--;
        form.dataset.rightBumpCounter = String(rightBumpCounter);
        if (rightBumpCounterEl)
          rightBumpCounterEl.textContent = rightBumpCounter.toString();
      }
    });
  }

  // Teleop Climb toggle functionality
  const leaveToggleButtonsTeleop = document.querySelectorAll(
    ".toggle-button-group .toggle-button-teleop",
  );
  leaveToggleButtonsTeleop.forEach((button) => {
    if (button.getAttribute("data-value") === leaveValueTeleop) {
      button.classList.add("selected");
      button.setAttribute("aria-checked", "true");
    } else {
      button.setAttribute("aria-checked", "false");
    }
  });

  leaveToggleButtonsTeleop.forEach((button) => {
    button.addEventListener("click", () => {
      leaveToggleButtonsTeleop.forEach((btn) => {
        btn.classList.remove("selected");
        btn.setAttribute("aria-checked", "false");
      });
      button.classList.add("selected");
      button.setAttribute("aria-checked", "true");
      const dataValue = button.getAttribute("data-value");
      leaveValueTeleop = dataValue ?? "none";
      saveToLocalStorage("leaveValueTeleop", leaveValueTeleop);
    });
  });



  // Check if form is pre-filled with valid data on initialization
  // If all required fields have values, enable the submit button
  const hasPrefilledMatch =
    matchNumberInput && matchNumberInput.value.trim() !== "";

  // Check team number based on which mode is active
  const isDropdownMode =
    teamNumberDropdown &&
    !teamNumberDropdown.parentElement?.classList.contains("hidden");
  const hasPrefilledTeam = isDropdownMode
    ? teamNumberDropdown && teamNumberDropdown.value.trim() !== ""
    : teamNumberInput && teamNumberInput.value.trim() !== "";

  const hasPrefilledAlliance = selectedAlliance !== "";

  if (hasPrefilledMatch && hasPrefilledTeam && hasPrefilledAlliance) {
    hasUserInteracted = true;
    validateForm(false); // Validate without showing errors
  }

  // Submission state guard
  let isSubmitting = false;
  let isResetting = false;

  // Function to reset form state
  function resetFormState() {
    // Set resetting flag first to prevent any event handlers from triggering validation
    isResetting = true;
    hasUserInteracted = false;

    // Clear current form state including cycles and counters
    clearFormDataFromLocalStorage();
    localStorage.removeItem("cycles");
    localStorage.removeItem("autoCycles");

    // Explicitly clear counter values from localStorage to ensure clean state
    localStorage.removeItem("leftCounter");
    localStorage.removeItem("rightCounter");
    localStorage.removeItem("leftBumpCounter");
    localStorage.removeItem("rightBumpCounter");

    // Reset form UI
    form.reset();

    // Clear validation errors immediately after resetting form
    clearValidationError("match-number");
    clearValidationError("team-number");
    clearValidationError("team-number-dropdown");
    const allianceSection = document.getElementById("alliance-section");
    if (allianceSection) {
      allianceSection.querySelector(".field-error")?.remove();
      allianceSection.classList.remove("has-error");
    }

    // Reset counters both locally and on the form dataset
    leftCounter = 0;
    rightCounter = 0;
    leftBumpCounter = 0;
    rightBumpCounter = 0;
    form.dataset.leftCounter = "0";
    form.dataset.rightCounter = "0";
    form.dataset.leftBumpCounter = "0";
    form.dataset.rightBumpCounter = "0";

    if (leftCounterEl) leftCounterEl.textContent = "0";
    if (rightCounterEl) rightCounterEl.textContent = "0";
    if (leftBumpCounterEl) leftBumpCounterEl.textContent = "0";
    if (rightBumpCounterEl) rightBumpCounterEl.textContent = "0";

    allianceButtons.forEach((btn) => btn.classList.remove("selected"));
    selectedAlliance = "";

    leaveToggleButtons.forEach((btn) => btn.classList.remove("selected"));
    leaveToggleButtons[0]?.classList.add("selected");
    leaveValue = "no";
    leaveToggleButtonsTeleop.forEach((btn) => btn.classList.remove("selected"));
    leaveToggleButtonsTeleop[0]?.classList.add("selected");
    leaveValueTeleop = "none";

    if (estimateSizeAuto) {
      estimateSizeAuto.value = "";
      const estimateSizeAutoContainer =
        estimateSizeAuto.parentElement as HTMLElement;
      const estimateSizeAutoButtons =
        estimateSizeAutoContainer?.querySelectorAll(
          ".estimate-button:not(.estimate-button-previous)",
        ) as NodeListOf<HTMLElement>;
      estimateSizeAutoButtons.forEach((btn) => {
        btn.classList.remove("selected");
        btn.setAttribute("aria-checked", "false");
      });
      estimateSizeAutoContainer?.classList.remove("has-value");
    }
    estimateSizeAutoValue = "";
    form.dataset.estimateSizeAutoValue = "";

    if (estimateSizeSelect) {
      estimateSizeSelect.value = "";
      const estimateSizeContainer =
        estimateSizeSelect.parentElement as HTMLElement;
      const estimateSizeButtons = estimateSizeContainer?.querySelectorAll(
        ".estimate-button:not(.estimate-button-previous)",
      ) as NodeListOf<HTMLElement>;
      estimateSizeButtons.forEach((btn) => {
        btn.classList.remove("selected");
        btn.setAttribute("aria-checked", "false");
      });
      estimateSizeContainer?.classList.remove("has-value");
    }
    estimateSizeValue = "";
    form.dataset.estimateSizeValue = "";
    updateAutoEstimateDisplay();
    updateTeleopEstimateDisplay();

    formFields.forEach((field) => field.classList.remove("has-value"));

    // Update button state without showing errors
    validateForm(false);

    // Regray the team number dropdown after reset
    updateTeamNumberUI();

    // Clear resetting flag at the very end
    setTimeout(() => {
      isResetting = false;
    }, 0);
  }

  // Form submit handler
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      // Prevent concurrent submissions
      if (isSubmitting) {
        return;
      }

      if (!validateForm(false)) {
        return;
      }

      // Mark as submitting and disable submit button
      isSubmitting = true;

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";
      }

      try {
        const isDropdownMode =
          teamNumberDropdown &&
          !teamNumberDropdown.parentElement?.classList.contains("hidden");
        const robotNumber = isDropdownMode
          ? teamNumberDropdown.value
          : teamNumberInput?.value || "";
        const matchNumber = parseInt(matchNumberInput?.value || "0");

        // Validate match number
        if (matchNumber <= 0 || isNaN(matchNumber)) {
          showError("Invalid match number. Please enter a valid match number.");
          throw new Error("Invalid match number");
        }

        // Validate robot number
        if (!robotNumber || robotNumber.trim() === "") {
          showError("Invalid team number. Please enter a valid team number.");
          throw new Error("Invalid team number");
        }

        // Determine alliance color - get from dropdown if in dropdown mode
        let allianceColor: AllianceColor;
        if (isDropdownMode && teamNumberDropdown) {
          const selectedOption =
            teamNumberDropdown.options[teamNumberDropdown.selectedIndex];
          const alliance = selectedOption?.dataset.alliance;
          if (alliance === "red") {
            allianceColor = AllianceColor.RED;
          } else if (alliance === "blue") {
            allianceColor = AllianceColor.BLUE;
          } else {
            showError("Unable to determine alliance color. Please try again.");
            throw new Error("Invalid alliance color");
          }
        } else {
          // Manual mode - use selectedAlliance
          if (selectedAlliance === "red") {
            allianceColor = AllianceColor.RED;
          } else if (selectedAlliance === "blue") {
            allianceColor = AllianceColor.BLUE;
          } else {
            showError("Please select an alliance color.");
            throw new Error("Alliance color not selected");
          }
        }

        // Save match data to local storage first
        const currentCounters = {
          leftCounter: getCounterValue("leftCounter", leftCounter),
          rightCounter: getCounterValue("rightCounter", rightCounter),
          leftBumpCounter: getCounterValue("leftBumpCounter", leftBumpCounter),
          rightBumpCounter: getCounterValue("rightBumpCounter", rightBumpCounter),
        };

        saveMatchToStorage(userData, {
          matchNumber,
          robotNumber,
          allianceColor,
          leftCounter: currentCounters.leftCounter,
          rightCounter: currentCounters.rightCounter,
          leftBumpCounter: currentCounters.leftBumpCounter,
          rightBumpCounter: currentCounters.rightBumpCounter,
          leaveValue,
          estimateSizeAuto: estimateSizeAutoValue,
          leaveValueTeleop,
          estimateSize: estimateSizeValue,
        });

        showSuccess("Match data saved locally!");

        // Reset form state (clears localStorage and resets all UI)
        resetFormState();

        // Now try to submit all pending matches
        if (submitButton) {
          submitButton.textContent = "Submitting...";
        }

        await submitAllPendingMatches(userData);
      } catch (error) {
        if (error instanceof Error) {
          logger.warn(
            "[Data Collection] Error processing match data:",
            error.message,
          );
        }
        showError("Failed to save match data. Please try again.");
      } finally {
        isSubmitting = false;

        if (submitButton) {
          submitButton.textContent = "Submit";
          submitButton.disabled = true;
        }
      }
    });
  }

  // Return cleanup function
  return () => {
    form.dataset.initialized = "false";
  };
}
