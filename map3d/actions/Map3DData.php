<?php declare(strict_types = 0);

namespace Modules\Map3D\Actions;

use API,
	CController,
	CControllerResponseData,
	CControllerResponseFatal,
	CRoleHelper;

class Map3DData extends CController {

	protected function init(): void {
		if (method_exists($this, 'disableCsrfValidation')) {
			$this->disableCsrfValidation();
		}
		elseif (method_exists($this, 'disableSIDValidation')) {
			$this->disableSIDValidation();
		}
	}

	protected function checkInput(): bool {
		$ret = $this->validateInput(['sysmapid' => 'required|id']);

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
			'sysmapids' => [$this->getInput('sysmapid')],
			'selectSelements' => 'extend',
			'selectLinks' => 'extend'
		]);

		$out = ['nodes' => [], 'links' => [], 'name' => '', 'time' => time()];

		if ($maps) {
			$map = $maps[0];
			$out['name'] = $map['name'];

			$hostids = $groupids = $triggerids = $mapids = [];
			foreach ($map['selements'] as $se) {
				$e = $se['elements'][0] ?? [];
				switch ((int) $se['elementtype']) {
					case SYSMAP_ELEMENT_TYPE_HOST:
						if (isset($e['hostid'])) $hostids[] = $e['hostid'];
						break;
					case SYSMAP_ELEMENT_TYPE_HOST_GROUP:
						if (isset($e['groupid'])) $groupids[] = $e['groupid'];
						break;
					case SYSMAP_ELEMENT_TYPE_TRIGGER:
						if (isset($e['triggerid'])) $triggerids[] = $e['triggerid'];
						break;
					case SYSMAP_ELEMENT_TYPE_MAP:
						if (isset($e['sysmapid'])) $mapids[] = $e['sysmapid'];
						break;
				}
			}

			$names = ['h' => [], 'g' => [], 't' => [], 'm' => []];
			$sev = ['h' => [], 'g' => [], 't' => []];

			if ($hostids) {
				foreach (API::Host()->get(['output' => ['hostid', 'name'], 'hostids' => $hostids]) as $h) {
					$names['h'][$h['hostid']] = $h['name'];
				}
				$triggers = API::Trigger()->get([
					'output' => ['priority'],
					'hostids' => $hostids,
					'filter' => ['value' => TRIGGER_VALUE_TRUE],
					'monitored' => true,
					'skipDependent' => true,
					'selectHosts' => ['hostid']
				]);
				foreach ($triggers as $t) {
					foreach ($t['hosts'] as $h) {
						$sev['h'][$h['hostid']] = max($sev['h'][$h['hostid']] ?? 0, (int) $t['priority']);
					}
				}
			}

			if ($groupids) {
				foreach (API::HostGroup()->get(['output' => ['groupid', 'name'], 'groupids' => $groupids]) as $g) {
					$names['g'][$g['groupid']] = $g['name'];
					$tr = API::Trigger()->get([
						'output' => ['priority'],
						'groupids' => [$g['groupid']],
						'filter' => ['value' => TRIGGER_VALUE_TRUE],
						'monitored' => true,
						'skipDependent' => true,
						'sortfield' => 'priority',
						'sortorder' => 'DESC',
						'limit' => 1
					]);
					$sev['g'][$g['groupid']] = $tr ? (int) $tr[0]['priority'] : 0;
				}
			}

			if ($triggerids) {
				foreach (API::Trigger()->get([
					'output' => ['triggerid', 'description', 'priority', 'value'],
					'triggerids' => $triggerids
				]) as $t) {
					$names['t'][$t['triggerid']] = $t['description'];
					$sev['t'][$t['triggerid']] = (int) $t['value'] === TRIGGER_VALUE_TRUE ? (int) $t['priority'] : 0;
				}
			}

			if ($mapids) {
				foreach (API::Map()->get(['output' => ['sysmapid', 'name'], 'sysmapids' => $mapids]) as $m) {
					$names['m'][$m['sysmapid']] = $m['name'];
				}
			}

			foreach ($map['selements'] as $se) {
				$e = $se['elements'][0] ?? [];
				$name = '';
				$severity = 0;
				$url = '';
				$kind = _('Image');

				switch ((int) $se['elementtype']) {
					case SYSMAP_ELEMENT_TYPE_HOST:
						$id = $e['hostid'] ?? '';
						$name = $names['h'][$id] ?? '';
						$severity = $sev['h'][$id] ?? 0;
						$url = 'zabbix.php?action=problem.view&filter_set=1&hostids%5B%5D='.$id;
						$kind = _('Host');
						break;
					case SYSMAP_ELEMENT_TYPE_HOST_GROUP:
						$id = $e['groupid'] ?? '';
						$name = $names['g'][$id] ?? '';
						$severity = $sev['g'][$id] ?? 0;
						$url = 'zabbix.php?action=problem.view&filter_set=1&groupids%5B%5D='.$id;
						$kind = _('Host group');
						break;
					case SYSMAP_ELEMENT_TYPE_TRIGGER:
						$id = $e['triggerid'] ?? '';
						$name = $names['t'][$id] ?? '';
						$severity = $sev['t'][$id] ?? 0;
						$kind = _('Trigger');
						break;
					case SYSMAP_ELEMENT_TYPE_MAP:
						$id = $e['sysmapid'] ?? '';
						$name = $names['m'][$id] ?? '';
						$url = 'zabbix.php?action=threedmap.view&sysmapid='.$id;
						$kind = _('Map');
						break;
				}

				$label = trim((string) ($se['label'] ?? ''));
				if ($label === '' || strpos($label, '{') !== false) {
					$label = $name;
				}

				$out['nodes'][] = [
					'id' => $se['selementid'],
					'label' => $label,
					'kind' => $kind,
					'x' => (int) $se['x'],
					'y' => (int) $se['y'],
					'sev' => $severity,
					'url' => $url
				];
			}

			foreach ($map['links'] as $l) {
				$out['links'][] = [
					'a' => $l['selementid1'],
					'b' => $l['selementid2'],
					'color' => preg_match('/^[0-9A-Fa-f]{6}$/', $l['color'] ?? '') ? $l['color'] : '97AAB3',
					'label' => $l['label'] ?? ''
				];
			}
		}

		$this->setResponse(new CControllerResponseData(['main_block' => json_encode($out)]));
	}
}
