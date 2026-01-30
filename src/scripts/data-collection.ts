import type { IMatchLineup, IMatch, IObjective, IUser } from '../model/Models';
import gearscoutService from '../services/gearscout-services';

// Schedule state
let schedule: IMatchLineup[] | null = null;
let scheduleIsLoading = false;
let currentEventCode = '';

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout> | null = null;
	return (...args: Parameters<T>) => {
		if (timeout) clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

// Error display utility
function showError(message: string, duration: number = 5000): void {
	const existingError = document.getElementById('error-notification');
	if (existingError) {
		existingError.remove();
	}

	const errorDiv = document.createElement('div');
	errorDiv.id = 'error-notification';
	errorDiv.className = 'error-notification';
	errorDiv.textContent = message;
	document.body.appendChild(errorDiv);

	// Force reflow to ensure animation triggers
	void errorDiv.offsetHeight;

	setTimeout(() => {
		errorDiv.classList.add('fade-out');
		setTimeout(() => {
			if (errorDiv.parentNode) {
				errorDiv.remove();
			}
		}, 300);
	}, duration);
}

// Success display utility
function showSuccess(message: string, duration: number = 3000): void {
	const existingSuccess = document.getElementById('success-notification');
	if (existingSuccess) {
		existingSuccess.remove();
	}

	const successDiv = document.createElement('div');
	successDiv.id = 'success-notification';
	successDiv.className = 'success-notification';
	successDiv.textContent = message;
	document.body.appendChild(successDiv);

	// Force reflow to ensure animation triggers
	void successDiv.offsetHeight;

	setTimeout(() => {
		successDiv.classList.add('fade-out');
		setTimeout(() => {
			if (successDiv.parentNode) {
				successDiv.remove();
			}
		}, 300);
	}, duration);
}

// Validation error display
function showValidationError(fieldId: string, message: string): void {
	const field = document.getElementById(fieldId);
	if (!field) return;

	const formField = field.closest('.form-field');
	if (!formField) return;

	// Remove existing error
	const existingError = formField.querySelector('.field-error');
	if (existingError) {
		existingError.remove();
	}

	// Add error message
	const errorSpan = document.createElement('span');
	errorSpan.className = 'field-error';
	errorSpan.textContent = message;
	formField.appendChild(errorSpan);
	formField.classList.add('has-error');
}

function clearValidationError(fieldId: string): void {
	const field = document.getElementById(fieldId);
	if (!field) return;

	const formField = field.closest('.form-field');
	if (!formField) return;

	const errorSpan = formField.querySelector('.field-error');
	if (errorSpan) {
		errorSpan.remove();
	}
	formField.classList.remove('has-error');
}

// Local Storage Functions
function saveToLocalStorage(key: string, value: string | number): void {
	try {
		localStorage.setItem(key, String(value));
	} catch (error) {
		console.error('Error saving to localStorage:', error);
	}
}

function getFromLocalStorage(key: string, defaultValue: string | number = ''): string {
	try {
		return localStorage.getItem(key) ?? String(defaultValue);
	} catch (error) {
		console.error('Error reading from localStorage:', error);
		return String(defaultValue);
	}
}

function clearFormDataFromLocalStorage(): void {
	try {
		localStorage.removeItem('matchNumber');
		localStorage.removeItem('scoutedTeamNumber');
		localStorage.removeItem('allianceColor');
		localStorage.removeItem('leaveValue');
		localStorage.removeItem('leftCounter');
		localStorage.removeItem('rightCounter');
		localStorage.removeItem('leftBumpCounter');
		localStorage.removeItem('rightBumpCounter');
		localStorage.removeItem('accuracyValue');
		localStorage.removeItem('estimateSizeAuto');
		localStorage.removeItem('leaveValueTeleop');
		localStorage.removeItem('accuracyValueTeleop');
		localStorage.removeItem('cycles');
		localStorage.removeItem('estimateSize');
	} catch (error) {
		console.error('Error clearing localStorage:', error);
	}
}

// Fetch schedule from API with debouncing
const fetchSchedule = debounce(async (eventCode: string): Promise<void> => {
	if (!eventCode || eventCode.trim() === '') {
		schedule = null;
		return;
	}

	if (currentEventCode === eventCode && schedule !== null) {
		return; // Already have this schedule
	}

	scheduleIsLoading = true;
	showScheduleLoader();

	try {
		const response = await gearscoutService.getEventSchedule(2026, eventCode);
		schedule = response.data;
		currentEventCode = eventCode;
		clearValidationError('match-number');
	} catch (error) {
		console.error('Failed to fetch schedule:', error);
		schedule = null;
		currentEventCode = '';
		showError('Failed to load event schedule. Manual team entry will be used.');
	} finally {
		scheduleIsLoading = false;
		updateTeamNumberUI();
	}
}, 500); // 500ms debounce

// Show/hide appropriate team number input based on state
function updateTeamNumberUI(): void {
	const loader = document.getElementById('schedule-loader');
	const dropdownContainer = document.getElementById('team-number-dropdown-container');
	const manualContainer = document.getElementById('team-number-manual-container');
	const allianceSection = document.getElementById('alliance-section');
	const matchNumberInput = document.getElementById('match-number') as HTMLInputElement;

	if (!loader || !dropdownContainer || !manualContainer || !allianceSection) return;

	if (scheduleIsLoading) {
		loader.style.display = 'block';
		dropdownContainer.style.display = 'none';
		manualContainer.style.display = 'none';
		allianceSection.style.display = 'none';
		return;
	}

	loader.style.display = 'none';

	if (!schedule || schedule.length === 0) {
		// No schedule - show manual input
		dropdownContainer.style.display = 'none';
		manualContainer.style.display = 'block';
		allianceSection.style.display = 'flex';
		return;
	}

	const matchNumber = matchNumberInput?.value;
	if (!matchNumber || matchNumber.trim() === '') {
		// No match number entered - hide everything
		dropdownContainer.style.display = 'none';
		manualContainer.style.display = 'none';
		allianceSection.style.display = 'none';
		return;
	}

	const matchIndex = parseInt(matchNumber) - 1;
	if (isNaN(matchIndex) || matchIndex < 0 || matchIndex >= schedule.length) {
		// Invalid match number - show manual
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

function showScheduleLoader(): void {
	const loader = document.getElementById('schedule-loader');
	const dropdownContainer = document.getElementById('team-number-dropdown-container');
	const manualContainer = document.getElementById('team-number-manual-container');
	const allianceSection = document.getElementById('alliance-section');

	if (loader) loader.style.display = 'block';
	if (dropdownContainer) dropdownContainer.style.display = 'none';
	if (manualContainer) manualContainer.style.display = 'none';
	if (allianceSection) allianceSection.style.display = 'none';
}

function populateTeamDropdown(matchIndex: number): void {
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

// Initialize the data collection form
export function initializeDataCollection(): void {
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
		console.error('Error restoring cycles:', error);
		cycles = [];
	}

	// Get user data and event code
	const userDataStr = sessionStorage.getItem('currentUser');
	if (!userDataStr) {
		showError('User data not found. Redirecting to login...');
		setTimeout(() => {
			window.location.href = '/';
		}, 2000);
		return;
	}

	const userData = JSON.parse(userDataStr) as IUser;
	const eventCode = userData.eventCode;

	// Fetch schedule on load
	if (eventCode) {
		fetchSchedule(eventCode);
	}

	// Function to validate form and update submit button state
	function validateForm(): boolean {
		let isValid = true;
		
		// Clear previous errors
		clearValidationError('match-number');
		clearValidationError('team-number');
		clearValidationError('team-number-dropdown');

		const hasMatchNumber = matchNumberInput && matchNumberInput.value.trim() !== '';
		if (!hasMatchNumber) {
			showValidationError('match-number', 'Match number is required');
			isValid = false;
		}

		// Check team number from either input or dropdown
		const isDropdownMode = teamNumberDropdown && teamNumberDropdown.parentElement?.style.display !== 'none';
		const hasTeamNumber = isDropdownMode 
			? (teamNumberDropdown.value.trim() !== '')
			: (teamNumberInput && teamNumberInput.value.trim() !== '');

		if (!hasTeamNumber) {
			const fieldId = isDropdownMode ? 'team-number-dropdown' : 'team-number';
			showValidationError(fieldId, 'Team number is required');
			isValid = false;
		}

		const hasAlliance = selectedAlliance !== '';
		if (!hasAlliance && !isDropdownMode) {
			showError('Please select an alliance color');
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
			matchNumberInput.dispatchEvent(new Event('input'));
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
			teamNumberInput.dispatchEvent(new Event('input'));
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
	if (cycleCountEl && cycles.length > 0) {
		cycleCountEl.textContent = `Cycles: ${cycles.length}`;
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

			if (cycleCountEl) {
				cycleCountEl.textContent = `Cycles: ${cycles.length}`;
			}

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

	// Form submit handler
	if (form) {
		form.addEventListener('submit', async (event) => {
			event.preventDefault();
			
			if (!validateForm()) {
				showError('Please fill in all required fields');
				return;
			}

			// Disable submit button to prevent double submission
			if (submitButton) {
				submitButton.disabled = true;
				submitButton.textContent = 'Submitting...';
			}
			
			try {
				const { AllianceColor, Gamemode } = await import('../model/Models');
				
				const objectives: IObjective[] = [];
				
				// ALLIANCE
				objectives.push({
					gamemode: Gamemode.alliance,
					objective: `${selectedAlliance}`,
					count: 0
				});
				
				// AUTO objectives
				objectives.push({
					gamemode: Gamemode.auto,
					objective: 'red-trench',
					count: leftCounter
				});
				objectives.push({
					gamemode: Gamemode.auto,
					objective: 'blue-trench',
					count: rightCounter
				});
				objectives.push({
					gamemode: Gamemode.auto,
					objective: 'red-bump',
					count: leftBumpCounter
				});
				objectives.push({
					gamemode: Gamemode.auto,
					objective: 'blue-bump',
					count: rightBumpCounter
				});
				objectives.push({
					gamemode: Gamemode.auto,
					objective: `climb-${leaveValue}`,
					count: 1
				});
				
				objectives.push({
					gamemode: Gamemode.auto,
					objective: 'accuracy',
					count: accuracyValue ? parseInt(accuracyValue) : 0
				});

				// Auto estimate size
				const autoEstimateSizeCounts: { [key: string]: number } = {
					'1-10': 0,
					'11-25': 0,
					'26+': 0
				};
				
				if (estimateSizeAutoValue) {
					autoEstimateSizeCounts[estimateSizeAutoValue] = 1;
				}
				
				Object.entries(autoEstimateSizeCounts).forEach(([size, count]) => {
					objectives.push({
						gamemode: Gamemode.auto,
						objective: `estimate-size-${size}`,
						count: count
					});
				});

				// TELEOP objectives
				let totalAccuracy = 0;
				let accuracyCount = 0;

				if (cycles.length > 0) {
					totalAccuracy = cycles.reduce((sum, cycle) => sum + cycle.accuracy, 0);
					accuracyCount = cycles.filter(cycle => cycle.accuracy > 0).length;
				}
				
				if (accuracyValueTeleop) {
					totalAccuracy += parseInt(accuracyValueTeleop);
					accuracyCount++;
				}

				const avgAccuracy = accuracyCount > 0 ? Math.round(totalAccuracy / accuracyCount) : 0;
				
				objectives.push({
					gamemode: Gamemode.teleop,
					objective: `climb-${leaveValueTeleop}`,
					count: 1
				});
				
				objectives.push({
					gamemode: Gamemode.teleop,
					objective: 'accuracy',
					count: avgAccuracy
				});

				const estimateSizeCounts: { [key: string]: number } = {
					'1-10': 0,
					'11-25': 0,
					'26+': 0
				};
				
				cycles.forEach(cycle => {
					if (cycle.estimateSize) {
						estimateSizeCounts[cycle.estimateSize] = (estimateSizeCounts[cycle.estimateSize] || 0) + 1;
					}
				});
				
				const currentEstimateSize = estimateSizeSelect?.value;
				if (currentEstimateSize) {
					estimateSizeCounts[currentEstimateSize] = (estimateSizeCounts[currentEstimateSize] || 0) + 1;
				}
				
				Object.entries(estimateSizeCounts).forEach(([size, count]) => {
					objectives.push({
						gamemode: Gamemode.teleop,
						objective: `estimate-size-${size}`,
						count: count
					});
				});
				
				const isDropdownMode = teamNumberDropdown && teamNumberDropdown.parentElement?.style.display !== 'none';
				const robotNumber = isDropdownMode ? teamNumberDropdown.value : (teamNumberInput?.value || '');

				const matchData: IMatch = {
					gameYear: 2026,
					eventCode: userData.eventCode,
					matchNumber: matchNumberInput?.value || '',
					robotNumber: robotNumber,
					creator: userData.scouterName,
					allianceColor: selectedAlliance === 'red' ? AllianceColor.red : AllianceColor.blue,
					objectives: objectives
				};
				
				await gearscoutService.submitMatch(userData, matchData);
				
				clearFormDataFromLocalStorage();
				showSuccess('Match data submitted successfully!');
				
				// Reset form
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
				if (cycleCountEl) {
					cycleCountEl.textContent = 'Cycles: 0';
				}
				
				updatePreviousCycleDisplay();
				formFields.forEach(field => field.classList.remove('has-value'));
				
			} catch (error) {
				console.error('Error submitting match data:', error);
				
				let errorMessage = 'Failed to submit match data. Please try again.';
				if (error && typeof error === 'object' && 'response' in error) {
					const response = (error as any).response;
					if (response?.status === 401) {
						errorMessage = 'Authentication failed. Please log in again.';
						setTimeout(() => {
							window.location.href = '/';
						}, 2000);
					} else if (response?.status === 400) {
						errorMessage = 'Invalid data. Please check your inputs.';
					} else if (response?.status >= 500) {
						errorMessage = 'Server error. Please try again later.';
					}
				} else if (error instanceof Error) {
					console.error('Error message:', error.message);
				}
				
				showError(errorMessage);
			} finally {
				if (submitButton) {
					submitButton.textContent = 'Submit';
					validateForm();
				}
			}
		});
	}
}
