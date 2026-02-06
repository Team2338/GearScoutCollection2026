/**
 * Schedule management service
 */

import type { IMatchLineup } from '@/model/Models';
import gearscoutService from '@/services/gearscout-services';
import { showError } from '@/utils/notifications';
import { debounce } from '@/utils/debounce';

// Constants
const SCHEDULE_FETCH_DEBOUNCE_MS = 500;
const CURRENT_GAME_YEAR = 2026;

// Schedule state
let schedule: IMatchLineup[] | null = null;
let scheduleIsLoading = false;
let currentEventCode = '';

/**
 * Get current schedule
 */
export function getSchedule(): IMatchLineup[] | null {
	return schedule;
}

/**
 * Check if schedule is currently loading
 */
export function isScheduleLoading(): boolean {
	return scheduleIsLoading;
}

/**
 * Fetch schedule from API (internal implementation)
 */
async function fetchScheduleInternal(eventCode: string): Promise<void> {
	if (!eventCode || eventCode.trim() === '') {
		schedule = null;
		return;
	}

	// Already have this schedule
	if (currentEventCode === eventCode && schedule !== null) {
		return;
	}

	scheduleIsLoading = true;

	try {
		const response = await gearscoutService.getEventSchedule(CURRENT_GAME_YEAR, eventCode);
		schedule = response.data;
		currentEventCode = eventCode;
	} catch (error) {
		if (error instanceof Error) {
			console.warn('[Schedule Service] Failed to fetch schedule:', error.message);
		}
		schedule = null;
		currentEventCode = '';
		showError('Failed to load event schedule. Manual team entry will be used.');
	} finally {
		scheduleIsLoading = false;
	}
}

/**
 * Fetch schedule from API with debouncing
 */
export const fetchSchedule = debounce(fetchScheduleInternal, SCHEDULE_FETCH_DEBOUNCE_MS);

/**
 * Get match lineup by match number (1-indexed)
 */
export function getMatchLineup(matchNumber: number): IMatchLineup | null {
	if (!schedule || schedule.length === 0) return null;
	const matchIndex = matchNumber - 1;
	if (matchIndex < 0 || matchIndex >= schedule.length) return null;
	return schedule[matchIndex];
}

/**
 * Get all teams in a match by match number
 */
export function getTeamsInMatch(matchNumber: number): {
	red: string[];
	blue: string[];
} | null {
	const lineup = getMatchLineup(matchNumber);
	if (!lineup) return null;
	
	return {
		red: [String(lineup.red1), String(lineup.red2), String(lineup.red3)],
		blue: [String(lineup.blue1), String(lineup.blue2), String(lineup.blue3)]
	};
}
