<?php declare(strict_types = 0);

namespace Modules\ThreeDMapWidget;

use Zabbix\Core\CWidget;

class Widget extends CWidget {

	public function getDefaultName(): string {
		return _('3D Map');
	}

	public function getDefaultRefreshRate(): int {
		return 30;
	}
}
