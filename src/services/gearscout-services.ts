import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { IMatch, IMatchLineup, IUser } from '@/model/Models';

// Constants
const DEFAULT_API_BASE_URL = 'https://gearitforward.com/api';
const API_TIMEOUT_MS = 10000;

type GearscoutResponse<T> = Promise<AxiosResponse<T>>;

const resolveApiBaseUrl = (): string => {
	try {
		if (typeof import.meta !== 'undefined' && import.meta.env) {
			const env = import.meta.env;
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

	/**
	 * Submit a match to the API
	 */
	submitMatch = (user: IUser, match: IMatch): GearscoutResponse<void> => {
		const url = `/v1/team/${user.teamNumber}`;
		const config: AxiosRequestConfig = {
			headers: {
				'Content-Type': 'application/json',
				'secretCode': user.secretCode
			}
		};

		return this.service.post(url, match, config).catch(error => {
			if (error instanceof Error) {
				console.warn('[API] Submit match failed:', error.message);
			}
			if (error?.response) {
				console.warn('[API] Response status:', error.response.status);
			}
			throw error;
		});
	};

	/**
	 * Get event schedule from The Blue Alliance
	 */
	getEventSchedule = (gameYear: number, tbaCode: string): GearscoutResponse<IMatchLineup[]> => {
		const url = `/v2/schedule/gameYear/${gameYear}/event/${tbaCode}`;
		const config: AxiosRequestConfig = {
			timeout: API_TIMEOUT_MS,
			signal: AbortSignal.timeout(API_TIMEOUT_MS)
		};

		return this.service.get(url, config);
	};
}

// Export singleton instance
const service = new GearscoutService();
export default service;
