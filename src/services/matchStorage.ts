/**
 * Multi-match storage service for offline data persistence
 */

import type { IUser, IStoredMatch, IMultiMatchStorage, IMatch, IObjective, AllianceColor } from '../model/Models';
import { Gamemode } from '../model/Models';
import gearscoutService from './gearscout-services';
import { showError, showSuccess } from '../utils/notifications';

const MULTI_MATCH_STORAGE_KEY = 'multiMatchData';

/**
 * Get multi-match storage for the current user
 */
export function getMultiMatchStorage(userData: IUser): IMultiMatchStorage {
	try {
		const stored = localStorage.getItem(MULTI_MATCH_STORAGE_KEY);
		if (stored) {
			const data = JSON.parse(stored);
			// Verify the stored data matches current user
			if (
				data.scouterName === userData.scouterName &&
				data.teamNumber === userData.teamNumber &&
				data.eventCode === userData.eventCode
			) {
				return data;
			}
		}
	} catch (error) {
		console.error('Error reading multi-match storage:', error);
	}
	
	// Return new structure if nothing valid exists
	return {
		scouterName: userData.scouterName,
		teamNumber: userData.teamNumber,
		eventCode: userData.eventCode,
		matches: []
	};
}

/**
 * Match data for saving to storage
 */
export interface MatchDataToSave {
	matchNumber: number;
	robotNumber: string;
	allianceColor: AllianceColor;
	leftCounter: number;
	rightCounter: number;
	leftBumpCounter: number;
	rightBumpCounter: number;
	leaveValue: string;
	accuracyValue: number;
	estimateSizeAuto: string;
	leaveValueTeleop: string;
	accuracyValueTeleop: number;
	cycles: Array<{ accuracy: number; estimateSize: string }>;
}

/**
 * Save match data to local storage
 */
export function saveMatchToStorage(userData: IUser, matchData: MatchDataToSave): void {
	try {
		const storage = getMultiMatchStorage(userData);
		
		console.log(`[Storage] Attempting to save Match #${matchData.matchNumber}, Robot ${matchData.robotNumber}`);
		console.log(`[Storage] Current storage has ${storage.matches.length} match(es)`);
		
		// Ensure type consistency for comparison
		const matchNum = Number(matchData.matchNumber);
		const robotNum = String(matchData.robotNumber);
		
		const existingIndex = storage.matches.findIndex(
			m => Number(m.matchNumber) === matchNum && String(m.robotNumber) === robotNum
		);
		
		const newMatch: IStoredMatch = {
			...matchData,
			matchNumber: matchNum,
			robotNumber: robotNum,
			timestamp: Date.now(),
			submitted: false
		};
		
		if (existingIndex >= 0) {
			storage.matches[existingIndex] = newMatch;
			console.log(`[Storage] ✓ Updated match #${matchData.matchNumber} for robot ${matchData.robotNumber}`);
		} else {
			storage.matches.push(newMatch);
			console.log(`[Storage] ✓ Added new match #${matchData.matchNumber} for robot ${matchData.robotNumber}`);
		}
		
		localStorage.setItem(MULTI_MATCH_STORAGE_KEY, JSON.stringify(storage));
		console.log(`[Storage] Total matches in storage: ${storage.matches.length}`);
		
		// Log all matches for debugging
		storage.matches.forEach((m, idx) => {
			console.log(`  [${idx}] Match #${m.matchNumber}, Robot ${m.robotNumber}, Submitted: ${m.submitted}`);
		});
	} catch (error) {
		console.error('[Storage] Error saving match to storage:', error);
		throw error;
	}
}

/**
 * Remove invalid matches from storage (match number 0 or empty robot number)
 */
export function cleanInvalidMatches(userData: IUser): number {
	try {
		const storage = getMultiMatchStorage(userData);
		const initialCount = storage.matches.length;
		
		storage.matches = storage.matches.filter(m => {
			const isValid = m.matchNumber > 0 && m.robotNumber && m.robotNumber.trim() !== '';
			if (!isValid) {
				console.log(`[Storage] Removing invalid match: Match #${m.matchNumber}, Robot "${m.robotNumber}"`);
			}
			return isValid;
		});
		
		const removedCount = initialCount - storage.matches.length;
		
		if (removedCount > 0) {
			localStorage.setItem(MULTI_MATCH_STORAGE_KEY, JSON.stringify(storage));
			console.log(`[Storage] Cleaned ${removedCount} invalid match(es) from storage`);
		}
		
		return removedCount;
	} catch (error) {
		console.error('[Storage] Error cleaning invalid matches:', error);
		return 0;
	}
}

/**
 * Get all pending (unsubmitted) matches
 */
export function getPendingMatches(userData: IUser): IStoredMatch[] {
	const storage = getMultiMatchStorage(userData);
	return storage.matches.filter(m => !m.submitted);
}

/**
 * Mark matches as submitted
 */
function markMatchesAsSubmitted(
	userData: IUser, 
	successfulMatches: Array<{ matchNumber: number; robotNumber: string }>
): void {
	try {
		const storage = getMultiMatchStorage(userData);
		storage.matches.forEach(match => {
			const wasSubmitted = successfulMatches.some(
				sm => sm.matchNumber === match.matchNumber && sm.robotNumber === match.robotNumber
			);
			if (wasSubmitted) {
				match.submitted = true;
			}
		});
		localStorage.setItem(MULTI_MATCH_STORAGE_KEY, JSON.stringify(storage));
	} catch (error) {
		console.error('Error marking matches as submitted:', error);
	}
}

/**
 * Clear submitted matches from storage
 */
function clearSubmittedMatches(userData: IUser): void {
	try {
		const storage = getMultiMatchStorage(userData);
		storage.matches = storage.matches.filter(m => !m.submitted);
		localStorage.setItem(MULTI_MATCH_STORAGE_KEY, JSON.stringify(storage));
		console.log(`Cleared submitted matches. Remaining: ${storage.matches.length}`);
	} catch (error) {
		console.error('Error clearing submitted matches:', error);
	}
}

/**
 * Convert stored match data to API format
 */
function convertStoredMatchToAPIFormat(userData: IUser, storedMatch: IStoredMatch): IMatch {
	const objectives: IObjective[] = [];
	
	// ALLIANCE
	objectives.push({
		gamemode: Gamemode.alliance,
		objective: `${storedMatch.allianceColor}`,
		count: 0
	});
	
	// AUTO objectives
	objectives.push(
		{ gamemode: Gamemode.auto, objective: 'red-trench', count: storedMatch.leftCounter },
		{ gamemode: Gamemode.auto, objective: 'blue-trench', count: storedMatch.rightCounter },
		{ gamemode: Gamemode.auto, objective: 'red-bump', count: storedMatch.leftBumpCounter },
		{ gamemode: Gamemode.auto, objective: 'blue-bump', count: storedMatch.rightBumpCounter },
		{ gamemode: Gamemode.auto, objective: `climb-${storedMatch.leaveValue}`, count: 1 },
		{ gamemode: Gamemode.auto, objective: 'accuracy', count: storedMatch.accuracyValue }
	);

	// Auto estimate size
	const autoEstimateSizeCounts: Record<string, number> = { '1-10': 0, '11-25': 0, '26+': 0 };
	if (storedMatch.estimateSizeAuto) {
		autoEstimateSizeCounts[storedMatch.estimateSizeAuto] = 1;
	}
	
	Object.entries(autoEstimateSizeCounts).forEach(([size, count]) => {
		objectives.push({
			gamemode: Gamemode.auto,
			objective: `estimate-size-${size}`,
			count
		});
	});

	// TELEOP objectives
	let totalAccuracy = 0;
	let accuracyCount = 0;

	if (storedMatch.cycles.length > 0) {
		totalAccuracy = storedMatch.cycles.reduce((sum, cycle) => sum + cycle.accuracy, 0);
		accuracyCount = storedMatch.cycles.filter(cycle => cycle.accuracy > 0).length;
	}
	
	if (storedMatch.accuracyValueTeleop) {
		totalAccuracy += storedMatch.accuracyValueTeleop;
		accuracyCount++;
	}

	const avgAccuracy = accuracyCount > 0 ? Math.round(totalAccuracy / accuracyCount) : 0;
	
	objectives.push(
		{ gamemode: Gamemode.teleop, objective: `climb-${storedMatch.leaveValueTeleop}`, count: 1 },
		{ gamemode: Gamemode.teleop, objective: 'accuracy', count: avgAccuracy }
	);

	// Teleop estimate size
	const estimateSizeCounts: Record<string, number> = { '1-10': 0, '11-25': 0, '26+': 0 };
	storedMatch.cycles.forEach(cycle => {
		if (cycle.estimateSize) {
			estimateSizeCounts[cycle.estimateSize] = (estimateSizeCounts[cycle.estimateSize] || 0) + 1;
		}
	});
	
	Object.entries(estimateSizeCounts).forEach(([size, count]) => {
		objectives.push({
			gamemode: Gamemode.teleop,
			objective: `estimate-size-${size}`,
			count
		});
	});

	return {
		gameYear: 2026,
		eventCode: userData.eventCode,
		matchNumber: String(storedMatch.matchNumber),
		robotNumber: storedMatch.robotNumber,
		creator: userData.scouterName,
		allianceColor: storedMatch.allianceColor,
		objectives
	};
}

/**
 * Submit all pending matches to the API
 */
export async function submitAllPendingMatches(userData: IUser): Promise<void> {
	// Clean up any invalid matches first
	const cleanedCount = cleanInvalidMatches(userData);
	if (cleanedCount > 0) {
		showError(`Removed ${cleanedCount} invalid match(es) from storage. Please re-enter the data correctly.`, 5000);
	}
	
	const pendingMatches = getPendingMatches(userData);
	
	if (pendingMatches.length === 0) {
		console.log('[Submit] No pending matches to submit');
		return;
	}
	
	// Filter out invalid matches before submission
	const validMatches = pendingMatches.filter(m => {
		const isValid = m.matchNumber > 0 && m.robotNumber && m.robotNumber.trim() !== '';
		if (!isValid) {
			console.warn(`[Submit] ⚠️ Skipping invalid match: Match #${m.matchNumber}, Robot ${m.robotNumber}`);
		}
		return isValid;
	});
	
	if (validMatches.length === 0) {
		console.error('[Submit] No valid matches to submit (all have invalid data)');
		showError('No valid matches found. Please check your data and try again.');
		return;
	}
	
	if (validMatches.length < pendingMatches.length) {
		console.warn(`[Submit] Filtered out ${pendingMatches.length - validMatches.length} invalid match(es)`);
	}
	
	console.log(`[Submit] Attempting to submit ${validMatches.length} valid match(es)...`);
	validMatches.forEach((m, idx) => {
		console.log(`  [${idx}] Match #${m.matchNumber}, Robot ${m.robotNumber}`);
	});
	
	// Deduplicate matches before submitting
	const uniqueMatches = new Map<string, IStoredMatch>();
	validMatches.forEach(match => {
		const key = `${match.matchNumber}-${match.robotNumber}`;
		if (uniqueMatches.has(key)) {
			console.warn(`[Submit] ⚠️ Duplicate detected: Match #${match.matchNumber}, Robot ${match.robotNumber}`);
		} else {
			uniqueMatches.set(key, match);
		}
	});
	
	const matchesToSubmit = Array.from(uniqueMatches.values());
	if (matchesToSubmit.length < validMatches.length) {
		console.warn(`[Submit] Removed ${validMatches.length - matchesToSubmit.length} duplicate(s)`);
	}
	
	let successCount = 0;
	let failCount = 0;
	const successfulMatches: Array<{ matchNumber: number; robotNumber: string }> = [];
	
	for (const storedMatch of matchesToSubmit) {
		try {
			console.log(`[Submit] Submitting Match #${storedMatch.matchNumber}, Robot ${storedMatch.robotNumber}...`);
			const matchData = convertStoredMatchToAPIFormat(userData, storedMatch);
			console.log(`[Submit] Match data being sent:`, JSON.stringify(matchData, null, 2));
			await gearscoutService.submitMatch(userData, matchData);
			successCount++;
			successfulMatches.push({ 
				matchNumber: storedMatch.matchNumber, 
				robotNumber: storedMatch.robotNumber 
			});
			console.log(`[Submit] ✓ Successfully submitted match ${storedMatch.matchNumber} for robot ${storedMatch.robotNumber}`);
		} catch (error) {
			failCount++;
			console.error(`[Submit] ✗ Failed to submit match ${storedMatch.matchNumber}:`, error);
			
			// Log more detailed error information
			if (error && typeof error === 'object') {
				if ('response' in error) {
					const response = (error as any).response;
					console.error(`[Submit] Response status: ${response?.status}`);
					console.error(`[Submit] Response data:`, response?.data);
					
					// Check for authentication errors
					if (response?.status === 401) {
						showError('Authentication failed. Please log in again.');
						setTimeout(() => {
							window.location.href = '/';
						}, 2000);
						return;
					}
				}
				if ('message' in error) {
					console.error(`[Submit] Error message: ${(error as any).message}`);
				}
			}
		}
	}
	
	// Mark successfully submitted matches
	if (successfulMatches.length > 0) {
		console.log(`[Submit] Marking ${successfulMatches.length} match(es) as submitted...`);
		markMatchesAsSubmitted(userData, successfulMatches);
		
		console.log(`[Submit] Clearing submitted matches from storage...`);
		clearSubmittedMatches(userData);
		
		if (successCount === matchesToSubmit.length) {
			showSuccess(`All ${successCount} match(es) submitted successfully!`);
		} else {
			showSuccess(`${successCount} match(es) submitted successfully!`);
		}
	}
	
	if (failCount > 0) {
		const remainingCount = getPendingMatches(userData).length;
		showError(`Failed to submit ${failCount} match(es). ${remainingCount} match(es) remain in local storage and will be submitted later.`, 8000);
	}
	
	// Log final status
	const remainingMatches = getPendingMatches(userData);
	console.log(`[Submit] ════════════════════════════════════════`);
	console.log(`[Submit] Submission complete`);
	console.log(`[Submit] Success: ${successCount}, Failed: ${failCount}, Remaining: ${remainingMatches.length}`);
	console.log(`[Submit] ════════════════════════════════════════`);
}
