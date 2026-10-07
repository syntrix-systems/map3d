<?php declare(strict_types = 0);

namespace Modules\Map3D;

use APP,
	CMenuItem,
	Zabbix\Core\CModule;

class Module extends CModule {

	public function init(): void {
		APP::Component()->get('menu.main')
			->findOrAdd(_('Monitoring'))
			->getSubmenu()
			->insertAfter(_('Maps'),
				(new CMenuItem(_('3D Maps')))->setAction('threedmap.view')
			);
	}
}
