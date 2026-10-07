<?php declare(strict_types = 0);

/**
 * @var CView $this
 * @var array $data
 */

$select = (new CSelect('sysmapid'))
	->setId('map3d-select')
	->setValue($data['sysmapid'])
	->addOptions(CSelect::createOptionsFromArray($data['maps']));

$legend = (new CDiv())->addClass('map3d-legend');
foreach ([_('Healthy'), _('Information'), _('Warning'), _('Average'), _('High'), _('Disaster')] as $i => $name) {
	$legend->addItem((new CSpan($name))->addClass('map3d-legend-item')->addClass('map3d-sev-'.$i));
}

$controls = (new CDiv([
	(new CLabel(_('Auto-rotate'), 'map3d-rotate'))->addStyle('margin-right:4px'),
	(new CCheckBox('rotate'))->setId('map3d-rotate'),
	(new CButton('map3d-reset', _('Reset view')))->addClass(ZBX_STYLE_BTN_ALT)->setId('map3d-reset'),
	(new CButton('map3d-fullscreen', _('Full screen')))->addClass(ZBX_STYLE_BTN_ALT)->setId('map3d-fullscreen')
]))->addClass('map3d-bar');

$root = (new CDiv([
	$controls,
	$legend,
	(new CDiv([new CTag('canvas', true), (new CDiv())->addClass('map3d-tip')]))->addClass('map3d-stage'),
	(new CDiv(_('Drag: rotate  |  Shift+drag / right-drag: pan  |  Wheel: zoom  |  Click a node: open')))
		->addClass('map3d-help'),
	(new CDiv([
		_('3D Map by').' ',
		(new CTag('a', true, 'Syntrix Systems'))
			->setAttribute('href', 'https://syntrix.ir')
			->setAttribute('target', '_blank')
			->setAttribute('rel', 'noopener')
	]))->addClass('map3d-brand')
]))->setId('map3d-root');

(new CHtmlPage())
	->setTitle(_('3D Maps'))
	->setControls((new CList())->addItem($select))
	->addItem($data['maps'] ? $root : new CDiv(_('No maps available.')))
	->show();

if ($data['maps']) {
	(new CScriptTag('new Map3D(document.getElementById("map3d-root"), '.json_encode([
		'sysmapid' => $data['sysmapid'],
		'refresh' => $data['refresh'],
		'dataUrl' => 'zabbix.php?action=threedmap.data&sysmapid=',
		'viewUrl' => 'zabbix.php?action=threedmap.view&sysmapid='
	], JSON_HEX_TAG | JSON_HEX_AMP).');'))->show();
}
