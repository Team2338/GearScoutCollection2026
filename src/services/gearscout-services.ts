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
		return DEFAULT_API_BASE_URL;
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

		console.log(`[API] POST ${this.service.defaults.baseURL}${url}`);
		console.log(`[API] Headers:`, { 'Content-Type': 'application/json', 'secretCode': '***' });
		
		return this.service.post(url, match, config).catch(error => {
			console.error('[API] Submit match failed:', error);
			if (error.response) {
				console.error('[API] Response status:', error.response.status);
				console.error('[API] Response data:', error.response.data);
				console.error('[API] Response headers:', error.response.headers);
			} else if (error.request) {
				console.error('[API] No response received. Request:', error.request);
			} else {
				console.error('[API] Error message:', error.message);
			}
			throw error;
		});
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
