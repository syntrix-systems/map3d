<?php declare(strict_types = 0);

/**
 * @var CView $this
 * @var array $data
 */

(new CWidgetFormView($data))
	->addField(new CWidgetFieldSelectView($data['fields']['sysmapid']))
	->addField(new CWidgetFieldCheckBoxView($data['fields']['auto_rotate']))
	->addField(new CWidgetFieldSelectView($data['fields']['rotate_speed']))
	->addField(new CWidgetFieldCheckBoxView($data['fields']['show_labels']))
	->addField(new CWidgetFieldCheckBoxView($data['fields']['show_grid']))
	->addField(new CWidgetFieldCheckBoxView($data['fields']['click_open']))
	->show();
