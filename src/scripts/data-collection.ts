/**
 * Data collection form initialization and event handling
 */

import type { IUser } from '@/model/Models';
import { AllianceColor } from '@/model/Models';
import { showError, showSuccess } from '@/utils/notifications';
import { showValidationError, clearValidationError } from '@/utils/validation';
import { saveToLocalStorage, getFromLocalStorage, clearFormDataFromLocalStorage } from '@/utils/localStorage';
import { saveMatchToStorage, submitAllPendingMatches, cleanInvalidMatches } from '@/services/matchStorage';
import { fetchSchedule, getSchedule } from '@/services/scheduleService';

// Constants
const SCHEDULE_LOAD_DELAY_MS = 600;
const AUTH_ERROR_REDIRECT_DELAY_MS = 2000;

// Initialization guard to prevent duplicate event listeners
// Using a symbol to ensure uniqueness across HMR reloads
const INIT_FLAG = Symbol.for('dataCollectionInitialized');
let isInitialized = (globalThis as any)[INIT_FLAG] || false;

/**
 * Show/hide appropriate team number input based on schedule state
 */
function updateTeamNumberUI(): void {
	const loader = document.getElementById('schedule-loader');
	const dropdownContainer = document.getElementById('team-number-dropdown-container');
	const manualContainer = document.getElementById('team-number-manual-container');
	const allianceSection = document.getElementById('alliance-section');
	const matchNumberInput = document.getElementById('match-number') as HTMLInputElement;

	if (!loader || !dropdownContainer || !manualContainer || !allianceSection) return;

	const schedule = getSchedule();
	
	if (schedule === null) {
		loader.style.display = 'none';
		dropdownContainer.style.display = 'none';
		manualContainer.style.display = 'block';
		allianceSection.style.display = 'flex';
		return;
	}

	const matchNumber = matchNumberInput?.value;
	if (!matchNumber || matchNumber.trim() === '') {
		dropdownContainer.style.display = 'none';
		manualContainer.style.display = 'none';
		allianceSection.style.display = 'none';
		return;
	}

	const matchIndex = parseInt(matchNumber) - 1;
	if (isNaN(matchIndex) || matchIndex < 0 || matchIndex >= schedule.length) {
		dropdownContainer.style.display = 'none';
		manualContainer.style.display = 'block';
		allianceSection.style.display = 'flex';
		return;
	}

	// Valid match number with schedule - show dropdown
	populateTeamDropdown(matchIndex);
	dropdownContainer.style.display = 'block';
	manualContainer.style.display = 'none';
	allianceSection.style.display = 'none';
}

/**
 * Populate team number dropdown from schedule
 */
function populateTeamDropdown(matchIndex: number): void {
	const schedule = getSchedule();
	if (!schedule) return;

	const dropdown = document.getElementById('team-number-dropdown') as HTMLSelectElement;
	if (!dropdown) return;

	const lineup = schedule[matchIndex];
	const redRobots = [lineup.red1, lineup.red2, lineup.red3].map(String);
	const blueRobots = [lineup.blue1, lineup.blue2, lineup.blue3].map(String);

	// Clear existing options
	dropdown.innerHTML = '<option value="">Select Team</option>';

	// Add red alliance header
	const redHeader = document.createElement('option');
	redHeader.disabled = true;
	redHeader.textContent = '━━ Red Alliance ━━';
	redHeader.style.color = '#aa3333';
	redHeader.style.fontWeight = '600';
	dropdown.appendChild(redHeader);

	// Add red teams
	redRobots.forEach(robot => {
		const option = document.createElement('option');
		option.value = robot;
		option.textContent = robot;
		option.dataset.alliance = 'red';
		dropdown.appendChild(option);
	});

	// Add blue alliance header
	const blueHeader = document.createElement('option');
	blueHeader.disabled = true;
	blueHeader.textContent = '━━ Blue Alliance ━━';
	blueHeader.style.color = '#2255cc';
	blueHeader.style.fontWeight = '600';
	dropdown.appendChild(blueHeader);

	// Add blue teams
	blueRobots.forEach(robot => {
		const option = document.createElement('option');
		option.value = robot;
		option.textContent = robot;
		option.dataset.alliance = 'blue';
		dropdown.appendChild(option);
	});

	// Restore saved selection if applicable
	const savedTeamNumber = getFromLocalStorage('scoutedTeamNumber');
	if (savedTeamNumber && (redRobots.includes(savedTeamNumber) || blueRobots.includes(savedTeamNumber))) {
		dropdown.value = savedTeamNumber;
	}
}

/**
 * Initialize the data collection form
 */
export function initializeDataCollection(): void {
	// Prevent multiple initializations
	if (isInitialized) {
		return;
	}
	
	isInitialized = true;
	(globalThis as any)[INIT_FLAG] = true;
	
	const form = document.getElementById('data-collection-form') as HTMLFormElement;
	const submitButton = document.querySelector('.submit-button') as HTMLButtonElement;
	const matchNumberInput = document.getElementById('match-number') as HTMLInputElement;
	const teamNumberInput = document.getElementById('team-number') as HTMLInputElement;
	const teamNumberDropdown = document.getElementById('team-number-dropdown') as HTMLSelectElement;
	const estimateSizeAuto = document.getElementById('estimate-size-auto') as HTMLSelectElement;
	const estimateSizeSelect = document.getElementById('estimate-size') as HTMLSelectElement;
	const estimateSizePrevious = document.getElementById('estimate-size-previous') as HTMLSelectElement;
	const cycleButton = document.getElementById('cycle-button');
	const cycleCountEl = document.getElementById('cycle-count');
	const previousCycleCountEl = document.getElementById('previous-cycle-count');
	const previousCycleSection = document.getElementById('previous-cycle-section');

	let selectedAlliance = '';
	let leaveValue = getFromLocalStorage('leaveValue', 'no');
	let leaveValueTeleop = getFromLocalStorage('leaveValueTeleop', 'no');
	let accuracyValue = getFromLocalStorage('accuracyValue', '');
	let accuracyValueTeleop = getFromLocalStorage('accuracyValueTeleop', '');
	let estimateSizeAutoValue = getFromLocalStorage('estimateSizeAuto', '');
	let leftCounter = Number(getFromLocalStorage('leftCounter', 0));
	let rightCounter = Number(getFromLocalStorage('rightCounter', 0));
	let leftBumpCounter = Number(getFromLocalStorage('leftBumpCounter', 0));
	let rightBumpCounter = Number(getFromLocalStorage('rightBumpCounter', 0));

	// Cycle tracking arrays
	let cycles: Array<{
		accuracy: number;
		estimateSize: string;
	}> = [];

	// Restore saved cycles
	try {
		const savedCycles = getFromLocalStorage('cycles', '');
		if (savedCycles) {
			cycles = JSON.parse(savedCycles);
		}
	} catch (error) {
		if (error instanceof Error) {
			console.warn('[Data Collection] Error restoring cycles:', error.message);
		}
		cycles = [];
	}

	// Get user data and event code
	const userDataStr = sessionStorage.getItem('currentUser');
	if (!userDataStr) {
		showError('User data not found. Redirecting to login...');
		setTimeout(() => {
			window.location.href = '/';
		}, AUTH_ERROR_REDIRECT_DELAY_MS);
		return;
	}

	const userData = JSON.parse(userDataStr) as IUser;
	const eventCode = userData.eventCode;

	// Clean invalid matches on load (just log, don't show error toast)
	cleanInvalidMatches(userData);

	// Fetch schedule on load
	if (eventCode) {
		fetchSchedule(eventCode);
		// Give schedule time to load, then update UI
		setTimeout(() => updateTeamNumberUI(), SCHEDULE_LOAD_DELAY_MS);
	}

	// Function to validate form and update submit button state
	function validateForm(showErrors = true): boolean {
		let isValid = true;
		
		// Clear previous errors
		clearValidationError('match-number');
		clearValidationError('team-number');
		clearValidationError('team-number-dropdown');

		const hasMatchNumber = matchNumberInput && matchNumberInput.value.trim() !== '';
		if (!hasMatchNumber) {
			if (showErrors) {
				showValidationError('match-number', 'Match number is required');
			}
			isValid = false;
		}

		// Check team number from either input or dropdown
		const isDropdownMode = teamNumberDropdown && teamNumberDropdown.parentElement?.style.display !== 'none';
		const hasTeamNumber = isDropdownMode 
			? (teamNumberDropdown.value.trim() !== '')
			: (teamNumberInput && teamNumberInput.value.trim() !== '');

		if (!hasTeamNumber) {
			if (showErrors) {
				const fieldId = isDropdownMode ? 'team-number-dropdown' : 'team-number';
				showValidationError(fieldId, 'Team number is required');
			}
			isValid = false;
		}

		const hasAlliance = selectedAlliance !== '';
		if (!hasAlliance && !isDropdownMode) {
			// Don't show error toast during real-time validation, only disable submit button
			isValid = false;
		}

		if (submitButton) {
			submitButton.disabled = !isValid;
		}

		return isValid;
	}

	// Initialize submit button as disabled
	if (submitButton) {
		submitButton.disabled = true;
	}

	// Floating label functionality for form fields
	const formFields = document.querySelectorAll('.form-field');
	formFields.forEach(field => {
		const input = field.querySelector('input');
		const select = field.querySelector('select');
		const inputElement = input || select;
		if (!inputElement) return;

		// Check if input has value on load
		if (inputElement.value) {
			field.classList.add('has-value');
		}

		// Update has-value class on input/select
		inputElement.addEventListener('input', () => {
			if (inputElement.value) {
				field.classList.add('has-value');
			} else {
				field.classList.remove('has-value');
			}
		});

		inputElement.addEventListener('change', () => {
			if (inputElement.value) {
				field.classList.add('has-value');
			} else {
				field.classList.remove('has-value');
			}
		});

		// Handle focus/blur for proper label animation
		inputElement.addEventListener('blur', () => {
			if (!inputElement.value) {
				field.classList.remove('has-value');
			}
		});
	});

	// Team number dropdown handler
	if (teamNumberDropdown) {
		teamNumberDropdown.addEventListener('change', () => {
			const selectedOption = teamNumberDropdown.options[teamNumberDropdown.selectedIndex];
			const teamNumber = teamNumberDropdown.value;

			clearValidationError('team-number-dropdown');
			
			if (teamNumber && selectedOption?.dataset.alliance) {
				// Auto-set alliance based on selection
				selectedAlliance = selectedOption.dataset.alliance;
				saveToLocalStorage('scoutedTeamNumber', teamNumber);
				saveToLocalStorage('allianceColor', selectedAlliance);
			} else {
				selectedAlliance = '';
			}
			
			validateForm();
		});
	}

	// Load saved form data from localStorage
	if (matchNumberInput) {
		const savedMatchNumber = getFromLocalStorage('matchNumber');
		if (savedMatchNumber) {
			matchNumberInput.value = savedMatchNumber;
			// Update UI for team number dropdown if applicable
			updateTeamNumberUI();
		}
		matchNumberInput.addEventListener('input', () => {
			saveToLocalStorage('matchNumber', matchNumberInput.value);
			clearValidationError('match-number');
			updateTeamNumberUI();
			validateForm();
		});
	}

	if (teamNumberInput) {
		const savedTeamNumber = getFromLocalStorage('scoutedTeamNumber');
		if (savedTeamNumber) {
			teamNumberInput.value = savedTeamNumber;
			// Don't trigger input event during initialization - we'll validate at the end
		}
		teamNumberInput.addEventListener('input', () => {
			saveToLocalStorage('scoutedTeamNumber', teamNumberInput.value);
			clearValidationError('team-number');
			validateForm();
		});
	}

	// Load saved alliance color
	const savedAlliance = getFromLocalStorage('allianceColor');
	if (savedAlliance) {
		selectedAlliance = savedAlliance;
	}

	// Alliance color toggle functionality
	const allianceButtons = document.querySelectorAll('.alliance-toggle');
	if (savedAlliance) {
		allianceButtons.forEach(btn => {
			if (btn.getAttribute('data-value') === savedAlliance) {
				btn.classList.add('selected');
			}
		});
	}

	allianceButtons.forEach(button => {
		button.addEventListener('click', () => {
			// Remove selected class from all buttons
			allianceButtons.forEach(btn => btn.classList.remove('selected'));
			
			// Add selected class to clicked button
			button.classList.add('selected');
			selectedAlliance = button.getAttribute('data-value') || '';
			
			// Save to localStorage
			saveToLocalStorage('allianceColor', selectedAlliance);
			
			// Validate form after alliance selection
			validateForm();
		});
	});

	// Leave toggle functionality (Auto)
	const leaveToggleButtons = document.querySelectorAll('.toggle-button-group .toggle-button');
	leaveToggleButtons.forEach(button => {
		if (button.getAttribute('data-value') === leaveValue) {
			button.classList.add('selected');
		}
	});

	leaveToggleButtons.forEach(button => {
		button.addEventListener('click', () => {
			leaveToggleButtons.forEach(btn => btn.classList.remove('selected'));
			button.classList.add('selected');
			leaveValue = button.getAttribute('data-value') || '';
			saveToLocalStorage('leaveValue', leaveValue);
		});
	});

	// Accuracy toggle functionality (Auto)
	const accuracyButtons = document.querySelectorAll('.accuracy-button-group .accuracy-button');
	accuracyButtons.forEach(button => {
		if (button.getAttribute('data-value') === accuracyValue) {
			button.classList.add('selected');
		}
	});

	accuracyButtons.forEach(button => {
		button.addEventListener('click', () => {
			accuracyButtons.forEach(btn => btn.classList.remove('selected'));
			button.classList.add('selected');
			accuracyValue = button.getAttribute('data-value') || '';
			saveToLocalStorage('accuracyValue', accuracyValue);
		});
	});

	// Auto estimate size functionality
	if (estimateSizeAuto) {
		if (estimateSizeAutoValue) {
			estimateSizeAuto.value = estimateSizeAutoValue;
			estimateSizeAuto.parentElement?.classList.add('has-value');
		}
		
		estimateSizeAuto.addEventListener('change', () => {
			estimateSizeAutoValue = estimateSizeAuto.value;
			saveToLocalStorage('estimateSizeAuto', estimateSizeAutoValue);
			if (estimateSizeAutoValue) {
				estimateSizeAuto.parentElement?.classList.add('has-value');
			} else {
				estimateSizeAuto.parentElement?.classList.remove('has-value');
			}
		});
	}

	// Trench counter functionality
	const leftCounterEl = document.getElementById('left-counter');
	const rightCounterEl = document.getElementById('right-counter');
	const leftTrenchBtn = document.querySelector('.left-trench');
	const rightTrenchBtn = document.querySelector('.right-trench');
	const leftDecrementBtn = document.querySelector('.left-decrement');
	const rightDecrementBtn = document.querySelector('.right-decrement');

	if (leftCounterEl) leftCounterEl.textContent = leftCounter.toString();
	if (rightCounterEl) rightCounterEl.textContent = rightCounter.toString();

	if (leftTrenchBtn) {
		leftTrenchBtn.addEventListener('click', () => {
			leftCounter++;
			if (leftCounterEl) leftCounterEl.textContent = leftCounter.toString();
			saveToLocalStorage('leftCounter', leftCounter);
		});
	}

	if (rightTrenchBtn) {
		rightTrenchBtn.addEventListener('click', () => {
			rightCounter++;
			if (rightCounterEl) rightCounterEl.textContent = rightCounter.toString();
			saveToLocalStorage('rightCounter', rightCounter);
		});
	}

	if (leftDecrementBtn) {
		leftDecrementBtn.addEventListener('click', () => {
			if (leftCounter > 0) {
				leftCounter--;
				if (leftCounterEl) leftCounterEl.textContent = leftCounter.toString();
				saveToLocalStorage('leftCounter', leftCounter);
			}
		});
	}

	if (rightDecrementBtn) {
		rightDecrementBtn.addEventListener('click', () => {
			if (rightCounter > 0) {
				rightCounter--;
				if (rightCounterEl) rightCounterEl.textContent = rightCounter.toString();
				saveToLocalStorage('rightCounter', rightCounter);
			}
		});
	}

	// Bump counter functionality
	const leftBumpCounterEl = document.getElementById('left-bump-counter');
	const rightBumpCounterEl = document.getElementById('right-bump-counter');
	const leftBumpBtn = document.querySelector('.left-bump');
	const rightBumpBtn = document.querySelector('.right-bump');
	const leftBumpDecrementBtn = document.querySelector('.left-bump-decrement');
	const rightBumpDecrementBtn = document.querySelector('.right-bump-decrement');

	if (leftBumpCounterEl) leftBumpCounterEl.textContent = leftBumpCounter.toString();
	if (rightBumpCounterEl) rightBumpCounterEl.textContent = rightBumpCounter.toString();

	if (leftBumpBtn) {
		leftBumpBtn.addEventListener('click', () => {
			leftBumpCounter++;
			if (leftBumpCounterEl) leftBumpCounterEl.textContent = leftBumpCounter.toString();
			saveToLocalStorage('leftBumpCounter', leftBumpCounter);
		});
	}

	if (rightBumpBtn) {
		rightBumpBtn.addEventListener('click', () => {
			rightBumpCounter++;
			if (rightBumpCounterEl) rightBumpCounterEl.textContent = rightBumpCounter.toString();
			saveToLocalStorage('rightBumpCounter', rightBumpCounter);
		});
	}

	if (leftBumpDecrementBtn) {
		leftBumpDecrementBtn.addEventListener('click', () => {
			if (leftBumpCounter > 0) {
				leftBumpCounter--;
				if (leftBumpCounterEl) leftBumpCounterEl.textContent = leftBumpCounter.toString();
				saveToLocalStorage('leftBumpCounter', leftBumpCounter);
			}
		});
	}

	if (rightBumpDecrementBtn) {
		rightBumpDecrementBtn.addEventListener('click', () => {
			if (rightBumpCounter > 0) {
				rightBumpCounter--;
				if (rightBumpCounterEl) rightBumpCounterEl.textContent = rightBumpCounter.toString();
				saveToLocalStorage('rightBumpCounter', rightBumpCounter);
			}
		});
	}

	// Teleop Climb toggle functionality
	const leaveToggleButtonsTeleop = document.querySelectorAll('.toggle-button-group .toggle-button-teleop');
	leaveToggleButtonsTeleop.forEach(button => {
		if (button.getAttribute('data-value') === leaveValueTeleop) {
			button.classList.add('selected');
		}
	});

	leaveToggleButtonsTeleop.forEach(button => {
		button.addEventListener('click', () => {
			leaveToggleButtonsTeleop.forEach(btn => btn.classList.remove('selected'));
			button.classList.add('selected');
			leaveValueTeleop = button.getAttribute('data-value') || '';
			saveToLocalStorage('leaveValueTeleop', leaveValueTeleop);
		});
	});

	// Teleop Accuracy toggle functionality
	const accuracyButtonsTeleop = document.querySelectorAll('.accuracy-button-group .accuracy-button-teleop');
	accuracyButtonsTeleop.forEach(button => {
		if (button.getAttribute('data-value') === accuracyValueTeleop) {
			button.classList.add('selected');
		}
	});

	accuracyButtonsTeleop.forEach(button => {
		button.addEventListener('click', () => {
			accuracyButtonsTeleop.forEach(btn => btn.classList.remove('selected'));
			button.classList.add('selected');
			accuracyValueTeleop = button.getAttribute('data-value') || '';
			saveToLocalStorage('accuracyValueTeleop', accuracyValueTeleop);
		});
	});

	// Previous Cycle Accuracy toggle functionality
	const accuracyButtonsPrevious = document.querySelectorAll('.accuracy-button-group .accuracy-button-previous');

	accuracyButtonsPrevious.forEach(button => {
		button.addEventListener('click', () => {
			if (cycles.length === 0) return;
			
			accuracyButtonsPrevious.forEach(btn => btn.classList.remove('selected'));
			button.classList.add('selected');
			const newValue = button.getAttribute('data-value') || '0';
			
			cycles[cycles.length - 1].accuracy = parseInt(newValue);
			saveToLocalStorage('cycles', JSON.stringify(cycles));
		});
	});

	// Previous Cycle Estimate Size functionality
	if (estimateSizePrevious) {
		estimateSizePrevious.addEventListener('change', () => {
			if (cycles.length === 0) return;
			
			cycles[cycles.length - 1].estimateSize = estimateSizePrevious.value;
			saveToLocalStorage('cycles', JSON.stringify(cycles));
		});
	}

	function updatePreviousCycleDisplay() {
		if (!previousCycleSection) return;
		
		if (cycles.length > 0) {
			previousCycleSection.style.display = 'block';
			
			const lastCycle = cycles[cycles.length - 1];
			accuracyButtonsPrevious.forEach(btn => {
				btn.classList.remove('selected');
				if (btn.getAttribute('data-value') === String(lastCycle.accuracy)) {
					btn.classList.add('selected');
				}
			});
			
			if (estimateSizePrevious) {
				estimateSizePrevious.value = lastCycle.estimateSize || '';
				if (lastCycle.estimateSize) {
					estimateSizePrevious.parentElement?.classList.add('has-value');
				} else {
					estimateSizePrevious.parentElement?.classList.remove('has-value');
				}
			}
		} else {
			previousCycleSection.style.display = 'none';
		}
	}

	// Update cycle count display on load
	if (cycles.length > 0) {
		if (cycleCountEl) cycleCountEl.textContent = `Cycles: ${cycles.length}`;
		if (previousCycleCountEl) previousCycleCountEl.textContent = `Cycle: ${cycles.length}`;
	}

	// Initialize previous cycle display on load
	updatePreviousCycleDisplay();

	// Cycle button functionality
	if (cycleButton) {
		cycleButton.addEventListener('click', () => {
			const currentEstimateSize = estimateSizeSelect?.value || '';
			
			if (!accuracyValueTeleop || !currentEstimateSize) {
				showError('Please enter estimate size and accuracy before cycling.');
				return;
			}

			cycles.push({
				accuracy: accuracyValueTeleop ? parseInt(accuracyValueTeleop) : 0,
				estimateSize: currentEstimateSize
			});

			saveToLocalStorage('cycles', JSON.stringify(cycles));

			if (cycleCountEl) cycleCountEl.textContent = `Cycles: ${cycles.length}`;
			if (previousCycleCountEl) previousCycleCountEl.textContent = `Cycle: ${cycles.length}`;

			updatePreviousCycleDisplay();

			accuracyButtonsTeleop.forEach(btn => btn.classList.remove('selected'));
			accuracyValueTeleop = '';
			saveToLocalStorage('accuracyValueTeleop', '');
			
			if (estimateSizeSelect) {
				estimateSizeSelect.value = '';
				estimateSizeSelect.parentElement?.classList.remove('has-value');
			}

			showSuccess(`Cycle ${cycles.length} recorded!`);
		});
	}

	// Submission state guard
	let isSubmitting = false;
	
	// Validate form state after all initialization is complete (without showing errors)
	validateForm(false);
	
	// Form submit handler
	if (form) {
		form.addEventListener('submit', async (event) => {
			event.preventDefault();
			
			// Prevent concurrent submissions
			if (isSubmitting) {
				return;
			}
			
			if (!validateForm()) {
				showError('Please fill in all required fields');
				return;
			}

			// Mark as submitting and disable submit button
			isSubmitting = true;
			
			if (submitButton) {
				submitButton.disabled = true;
				submitButton.textContent = 'Saving...';
			}
			
			try {
				const isDropdownMode = teamNumberDropdown && teamNumberDropdown.parentElement?.style.display !== 'none';
				const robotNumber = isDropdownMode ? teamNumberDropdown.value : (teamNumberInput?.value || '');
				const matchNumber = parseInt(matchNumberInput?.value || '0');

				// Validate match number
				if (matchNumber <= 0 || isNaN(matchNumber)) {
					showError('Invalid match number. Please enter a valid match number.');
					throw new Error('Invalid match number');
				}

				// Validate robot number
				if (!robotNumber || robotNumber.trim() === '') {
					showError('Invalid team number. Please enter a valid team number.');
					throw new Error('Invalid team number');
				}

				// Determine alliance color - get from dropdown if in dropdown mode
				let allianceColor: AllianceColor;
				if (isDropdownMode && teamNumberDropdown) {
					const selectedOption = teamNumberDropdown.options[teamNumberDropdown.selectedIndex];
					const alliance = selectedOption?.dataset.alliance;
					if (alliance === 'red') {
						allianceColor = AllianceColor.red;
					} else if (alliance === 'blue') {
						allianceColor = AllianceColor.blue;
					} else {
						showError('Unable to determine alliance color. Please try again.');
						throw new Error('Invalid alliance color');
					}
				} else {
					// Manual mode - use selectedAlliance
					if (selectedAlliance === 'red') {
						allianceColor = AllianceColor.red;
					} else if (selectedAlliance === 'blue') {
						allianceColor = AllianceColor.blue;
					} else {
						showError('Please select an alliance color.');
						throw new Error('Alliance color not selected');
					}
				}

				// Save match data to local storage first
				saveMatchToStorage(userData, {
					matchNumber,
					robotNumber,
					allianceColor,
					leftCounter,
					rightCounter,
					leftBumpCounter,
					rightBumpCounter,
					leaveValue,
					accuracyValue: accuracyValue ? parseInt(accuracyValue) : 0,
					estimateSizeAuto: estimateSizeAutoValue,
					leaveValueTeleop,
					accuracyValueTeleop: accuracyValueTeleop ? parseInt(accuracyValueTeleop) : 0,
					cycles: [...cycles] // Deep copy
				});
				
				showSuccess('Match data saved locally!');
				
				// Clear current form state
				clearFormDataFromLocalStorage();
				
				// Reset form UI
				form.reset();
				leftCounter = 0;
				rightCounter = 0;
				leftBumpCounter = 0;
				rightBumpCounter = 0;
				if (leftCounterEl) leftCounterEl.textContent = '0';
				if (rightCounterEl) rightCounterEl.textContent = '0';
				if (leftBumpCounterEl) leftBumpCounterEl.textContent = '0';
				if (rightBumpCounterEl) rightBumpCounterEl.textContent = '0';
				
				allianceButtons.forEach(btn => btn.classList.remove('selected'));
				selectedAlliance = '';
				
				leaveToggleButtons.forEach(btn => btn.classList.remove('selected'));
				leaveToggleButtons[0]?.classList.add('selected');
				leaveValue = 'no';
				
				leaveToggleButtonsTeleop.forEach(btn => btn.classList.remove('selected'));
				leaveToggleButtonsTeleop[0]?.classList.add('selected');
				leaveValueTeleop = 'no';
				
				accuracyButtons.forEach(btn => btn.classList.remove('selected'));
				accuracyValue = '';

				if (estimateSizeAuto) {
					estimateSizeAuto.value = '';
					estimateSizeAuto.parentElement?.classList.remove('has-value');
				}
				estimateSizeAutoValue = '';
				
				accuracyButtonsTeleop.forEach(btn => btn.classList.remove('selected'));
				accuracyValueTeleop = '';

				if (estimateSizeSelect) {
					estimateSizeSelect.value = '';
					estimateSizeSelect.parentElement?.classList.remove('has-value');
				}

				cycles = [];
				if (cycleCountEl) cycleCountEl.textContent = 'Cycles: 0';
				if (previousCycleCountEl) previousCycleCountEl.textContent = 'Cycle: 0';
				
				updatePreviousCycleDisplay();
				formFields.forEach(field => field.classList.remove('has-value'));
				
				// Now try to submit all pending matches
				if (submitButton) {
					submitButton.textContent = 'Submitting...';
				}
				
				await submitAllPendingMatches(userData);
				
			} catch (error) {
			if (error instanceof Error) {
				console.warn('[Data Collection] Error processing match data:', error.message);
			}
				showError('Failed to save match data. Please try again.');
			} finally {
				isSubmitting = false;
				
				if (submitButton) {
					submitButton.textContent = 'Submit';
					validateForm();
				}
			}
		});
	}
}
