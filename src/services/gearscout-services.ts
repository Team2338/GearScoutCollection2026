import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { IMatch, IMatchLineup, IUser } from '../model/Models';

type GearscoutResponse<T> = Promise<AxiosResponse<T>>;

const DEFAULT_API_BASE_URL = 'https://gearitforward.com/api';

const resolveApiBaseUrl = (): string => {
	try {
		// Prefer a specific Gearscout API env var, fall back to a generic one if present.
		if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
			const env = (import.meta as any).env;
			const envBaseUrl = env.VITE_GEARSCOUT_API_BASE_URL || env.VITE_API_BASE_URL;
			
			if (typeof envBaseUrl === 'string' && envBaseUrl.length > 0) {
				return envBaseUrl;
			}
		}
	} catch {
		// If import.meta or env access is not available, fall back to the default URL.
	}

	return DEFAULT_API_BASE_URL;
};

class GearscoutService {
	private service: AxiosInstance = axios.create({
		baseURL: resolveApiBaseUrl()
	});

	submitMatch = (user: IUser, match: IMatch): GearscoutResponse<void> => {
		const url: string = `/v1/team/${user.teamNumber}`;
		const config: AxiosRequestConfig = {
			headers: {
				'Content-Type': 'application/json',
				'secretCode': user.secretCode
			}
		};

		return this.service.post(url, match, config);
	};

	getEventSchedule = (gameYear: number, tbaCode: string): GearscoutResponse<IMatchLineup[]> => {
		const url: string = `/v2/schedule/gameYear/${gameYear}/event/${tbaCode}`;
		const timeout: number = 10_000;
		const config: AxiosRequestConfig = {
			timeout: timeout,
			signal: AbortSignal.timeout(timeout)
		};
		return this.service.get(url, config);
	};
}

const service: GearscoutService = new GearscoutService();
export default service;
