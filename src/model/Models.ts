/**
 * Core data models for the GearScout application
 */

// ============================================================================
// User & Authentication
// ============================================================================

export interface IUser {
	teamNumber: string;
	scouterName: string;
	secretCode: string;
	eventCode: string;
}

/**
 * Type guard to validate IUser objects
 * @param data - Data to validate
 * @returns True if data is a valid IUser
 */
export function isValidUser(data: unknown): data is IUser {
	return (
		typeof data === 'object' &&
		data !== null &&
		'teamNumber' in data &&
		'scouterName' in data &&
		'secretCode' in data &&
		'eventCode' in data &&
		typeof (data as IUser).teamNumber === 'string' &&
		typeof (data as IUser).scouterName === 'string' &&
		typeof (data as IUser).secretCode === 'string' &&
		typeof (data as IUser).eventCode === 'string'
	);
}

// ============================================================================
// Match Data
// ============================================================================

export interface IMatch {
	gameYear: number;
	eventCode: string;
	matchNumber: string;
	robotNumber: string;
	creator: string;
	allianceColor: AllianceColor;
	objectives: IObjective[];
}

export interface IObjective {
	gamemode: Gamemode;
	objective: string;
	count: number;
}

export interface IMatchLineup {
	matchNumber: number;
	red1: number;
	red2: number;
	red3: number;
	blue1: number;
	blue2: number;
	blue3: number;
}

// ============================================================================
// Enums
// ============================================================================

export enum AllianceColor {
	red = 'red',
	blue = 'blue',
	unknown = 'unknown'
}

export enum Gamemode {
	alliance = 'alliance',
	auto = 'auto',
	teleop = 'teleop'
}

// ============================================================================
// Local Storage Models
// ============================================================================

/**
 * Multi-match storage structure for offline support
 */
export interface IMultiMatchStorage {
	scouterName: string;
	teamNumber: string;
	eventCode: string;
	matches: IStoredMatch[];
}

/**
 * Stored match data with submission tracking
 */
export interface IStoredMatch {
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
	cycles: Array<{
		accuracy: number;
		estimateSize: string;
	}>;
	timestamp: number;
	submitted?: boolean;
}