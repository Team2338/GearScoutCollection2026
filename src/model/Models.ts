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
	auto = 'auto',
	teleop = 'teleop'
}