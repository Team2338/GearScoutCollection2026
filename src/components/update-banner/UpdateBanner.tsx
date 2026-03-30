import './UpdateBanner.scss';

interface IProps {
	hasUpdate: boolean;
	serviceWorker: ServiceWorker | null;
}

export default function UpdateBanner(props: IProps) {
	return props.hasUpdate && props.serviceWorker && (
		<div className="update-modal-overlay">
			<div className="update-modal-container">
				<div className="update-modal-content">
					<h1 className="update-modal-title">Update Required</h1>
					<p className="update-modal-message">A critical update is available for GearScout. Please update to continue using the application.</p>
					<button
						className="update-modal-button"
						onClick={ () => {
							props.serviceWorker!.postMessage('SKIP_WAITING');
						}}
					>
						Update Now
					</button>
				</div>
			</div>
		</div>
	);
}
