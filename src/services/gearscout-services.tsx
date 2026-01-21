import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { IMatch, IMatchLineup, IUser } from '../model/Models';

type GearscoutResponse<T> = Promise<AxiosResponse<T>>;

class GearscoutService {
	private service: AxiosInstance = axios.create({
		baseURL: 'https://gearitforward.com/api'
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
