import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import type { IMatch, IMatchLineup, IUser } from '@/model/Models';
import { API, TIMING } from '@/constants';

// Constants
const DEFAULT_API_BASE_URL = API.DEFAULT_BASE_URL;
const API_TIMEOUT_MS = TIMING.API_TIMEOUT;

type GearscoutResponse<T> = Promise<AxiosResponse<T>>;

/**
 * Type guard to check if error is an AxiosError
 */
function isAxiosError(error: unknown): error is AxiosError {
	return axios.isAxiosError(error);
}

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
			},
			timeout: API_TIMEOUT_MS
		};

		return this.service.post(url, match, config).catch(error => {
			if (isAxiosError(error)) {
				if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
					console.error('[API] Request timeout - check your connection');
					throw new Error('Request timeout. Please check your internet connection and try again.');
				}
				if (error.response) {
					const status = error.response.status;
					console.warn('[API] Response status:', status);
					
					if (status === 401) {
						throw new Error('Authentication failed. Please check your secret code and try logging in again.');
					} else if (status === 403) {
						throw new Error('Access forbidden. Your team may not have permission to submit data.');
					} else if (status === 404) {
						throw new Error('API endpoint not found. Please contact support.');
					} else if (status === 400) {
						throw new Error('Invalid match data. Please check your entries and try again.');
					} else if (status >= 500) {
						throw new Error('Server error. Please try again in a few moments.');
					}
				} else if (error.request) {
					console.error('[API] No response received from server');
					throw new Error('Cannot reach server. Please check your internet connection.');
				}
			}
			
			if (error instanceof Error) {
				console.warn('[API] Submit match failed:', error.message);
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
			timeout: API_TIMEOUT_MS
		};

		return this.service.get(url, config);
	};
}

// Export singleton instance
const service = new GearscoutService();
export default service;

// Export type guard for use in other modules
export { isAxiosError };
