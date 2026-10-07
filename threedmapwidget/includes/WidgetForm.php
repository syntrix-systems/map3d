<?php declare(strict_types = 0);

namespace Modules\ThreeDMapWidget\Includes;

use API,
	Zabbix\Widgets\CWidgetForm,
	Zabbix\Widgets\Fields\CWidgetFieldCheckBox,
	Zabbix\Widgets\Fields\CWidgetFieldSelect;

class WidgetForm extends CWidgetForm {

	public function addFields(): self {
		$maps = [];
		foreach (API::Map()->get(['output' => ['sysmapid', 'name'], 'sortfield' => 'name']) as $map) {
			$maps[(int) $map['sysmapid']] = $map['name'];
		}
		if (!$maps) {
			$maps = [0 => _('No maps available')];
		}

		return $this
			->addField(
				(new CWidgetFieldSelect('sysmapid', _('Map'), $maps))
					->setDefault((int) array_key_first($maps))
			)
			->addField(
				(new CWidgetFieldCheckBox('auto_rotate', _('Auto-rotate')))->setDefault(1)
			)
			->addField(
				(new CWidgetFieldSelect('rotate_speed', _('Rotation speed'), [
					1 => _('Slow'),
					2 => _('Normal'),
					3 => _('Fast')
				]))->setDefault(2)
			)
			->addField(
				(new CWidgetFieldCheckBox('show_labels', _('Show labels')))->setDefault(1)
			)
			->addField(
				(new CWidgetFieldCheckBox('show_grid', _('Show floor grid')))->setDefault(1)
			)
			->addField(
				(new CWidgetFieldCheckBox('click_open', _('Open problems on click')))->setDefault(0)
			);
	}
}
