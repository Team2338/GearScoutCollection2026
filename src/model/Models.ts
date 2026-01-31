export interface IUser {
	teamNumber: string;
	scouterName: string;
	secretCode: string;
	eventCode: string;
}

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

// Multi-match storage structure for offline support
export interface IMultiMatchStorage {
	scouterName: string;
	teamNumber: string;
	eventCode: string;
	matches: IStoredMatch[];
}

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
	timestamp: number; // When this match data was recorded
	submitted?: boolean; // Track if this match has been submitted
}