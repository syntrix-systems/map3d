<?php declare(strict_types = 0);

/**
 * @var CView $this
 * @var array $data
 */

(new CWidgetView($data))
	->addItem(
		$data['map'] === null
			? (new CDiv(_('No map selected or no permissions.')))->addClass('threedmap-empty')
			: (new CDiv())->addClass('threedmap-widget')
	)
	->setVar('map', $data['map'])
	->setVar('settings', $data['settings'])
	->show();
