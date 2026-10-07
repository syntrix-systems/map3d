class WidgetThreeDMap extends CWidget {

	onInitialize() {
		this._scene = null;
	}

	hasPadding() {
		return false;
	}

	processUpdateResponse(response) {
		if (response.map === null || response.map === undefined) {
			if (this._scene !== null) {
				this._scene.destroy();
				this._scene = null;
			}
			super.processUpdateResponse(response);
			return;
		}

		if (this._scene === null) {
			super.processUpdateResponse(response);
			const root = this._body.querySelector('.threedmap-widget');
			if (root === null) return;
			this._scene = new ThreeDMapScene(root, response.settings);
		}
		else {
			this._scene.setSettings(response.settings);
		}

		this._scene.setData(response.map);
	}

	onResize() {
		if (this._scene !== null) this._scene.resize();
	}

	onDestroy() {
		if (this._scene !== null) {
			this._scene.destroy();
			this._scene = null;
		}
	}
}
