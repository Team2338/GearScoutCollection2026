import './UpdateBanner.scss';

interface IProps {
	hasUpdate: boolean;
	serviceWorker: ServiceWorker | null;
}

export default function UpdateBanner(props: IProps) {
	return props.hasUpdate && props.serviceWorker && (
		<div className="update-available-banner">
			<span>An update is available!</span>
			<button
				className="update-button"
				onClick={ () => {
					props.serviceWorker!.postMessage('SKIP_WAITING');
				}}
			>
				Update
			</button>
		</div>
	);
}
