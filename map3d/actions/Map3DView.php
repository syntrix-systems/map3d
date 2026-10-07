<?php declare(strict_types = 0);

namespace Modules\Map3D\Actions;

use API,
	CController,
	CControllerResponseData,
	CControllerResponseFatal,
	CRoleHelper;

class Map3DView extends CController {

	protected function init(): void {
		// Zabbix 7+/8 name vs. Zabbix 6 name (PHP method names are case-insensitive).
		if (method_exists($this, 'disableCsrfValidation')) {
			$this->disableCsrfValidation();
		}
		elseif (method_exists($this, 'disableSIDValidation')) {
			$this->disableSIDValidation();
		}
	}

	protected function checkInput(): bool {
		$ret = $this->validateInput(['sysmapid' => 'id']);

		if (!$ret) {
			$this->setResponse(new CControllerResponseFatal());
		}

		return $ret;
	}

	protected function checkPermissions(): bool {
		return $this->checkAccess(CRoleHelper::UI_MONITORING_MAPS);
	}

	protected function doAction(): void {
		$maps = API::Map()->get([
			'output' => ['sysmapid', 'name'],
			'sortfield' => 'name'
		]);

		$options = [];
		foreach ($maps as $map) {
			$options[$map['sysmapid']] = $map['name'];
		}

		$sysmapid = $this->hasInput('sysmapid') ? $this->getInput('sysmapid') : (string) key($options);
		if (!array_key_exists($sysmapid, $options)) {
			$sysmapid = $options ? (string) key($options) : '0';
		}

		$response = new CControllerResponseData([
			'maps' => $options,
			'sysmapid' => $sysmapid,
			'refresh' => 30
		]);
		$response->setTitle(_('3D Maps'));
		$this->setResponse($response);
	}
}
