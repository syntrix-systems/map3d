<div align="center">

# Zabbix 3D Maps

**Turn your Zabbix network maps into interactive 3D scenes.**
A full-page viewer and a dashboard widget. No external libraries, works fully offline.

<img src="https://syntrix.ir/assets/images/logo/logo.png" alt="3D map overview" width="900">

[![Zabbix](https://img.shields.io/badge/Zabbix-6.0%20%7C%207.0%20%7C%208.0-d40000)](https://www.zabbix.com)
[![Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)](#how-it-works)
[![License](https://img.shields.io/badge/license-GPL-green)](#license)



</div>

---

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
  - [Full page: Monitoring → 3D Maps](#full-page-monitoring--3d-maps)
  - [Dashboard widget](#dashboard-widget)
  - [Controls](#controls)
- [How it works](#how-it-works)
- [Configuration](#configuration)
- [Repository layout](#repository-layout)
- [Troubleshooting](#troubleshooting)
- [Known limitations](#known-limitations)
- [Credits](#credits)

---

## Features

- **Uses your existing maps.** Pick any map from *Monitoring → Maps*. Elements keep their X/Y positions, and links are drawn on the floor in their configured colours.
- **Severity at a glance.** Each element becomes a 3D bar. Its **colour and height** follow the highest active problem severity (healthy → information → warning → average → high → disaster).
- **Live updates.** The scene refreshes on its own, so a new problem shows up without reloading the page.
- **Two ways to use it.**
  - a full page under **Monitoring → 3D Maps**, with a map picker, legend and **full screen** mode
  - a **dashboard widget** that shows only the map, with settings in the widget configuration
- **Readable labels.** Labels sit on a dark pill, are nudged apart when they overlap, and long names are shortened (hover for the full name).
- **Click-through.** Click a host or host group to open its problems. Click a sub-map element to open that map in 3D (page).
- **Zero dependencies.** Pure JavaScript on a 2D canvas with its own perspective projection. No three.js, no CDN, no web fonts. Works on air-gapped servers.
- **Respects Zabbix permissions.** Data comes from the standard Zabbix API with the logged-in user's rights.

## Requirements

| Component | Zabbix version | Notes |
|---|---|---|
| Page module (`map3d`) | 6.0, 7.0, 8.0 | Uses module `manifest_version` 2.0 |
| Dashboard widget (`threedmapwidget`) | 7.0, 8.0 | Custom dashboard widgets do not exist in 6.0 |

- A modern browser with HTML5 canvas support. Full screen mode needs the Fullscreen API.
- The user needs the **Monitoring → Maps** UI element permission in their user role.

<!-- Fill in the versions you have personally tested, for example: "Tested on Zabbix 7.0.x" -->
> **Tested on:** _add your tested Zabbix versions here_

## Installation

Zabbix allows only one type per module (a page module or a widget), so this repository ships **two modules**. Install both, or only the one you need.

1. Download or clone this repository.
2. Copy the folders into the `modules/` directory of your Zabbix frontend:

   ```bash
   cp -r map3d threedmapwidget /usr/share/zabbix/modules/
   # your path may differ, for example /var/www/html/zabbix/modules/
   ```

3. Make sure the web server user can read them:

   ```bash
   chmod -R a+rX /usr/share/zabbix/modules/map3d /usr/share/zabbix/modules/threedmapwidget
   ```

4. In Zabbix, go to **Administration → General → Modules** and click **Scan directory**.
5. Enable the **3D Maps** (page) and **3D Map** (widget) entries.
6. Hard-refresh your browser (Ctrl+F5) so the new JavaScript and CSS are loaded.

<!-- Optional screenshot of the Modules list: docs/images/modules-list.png -->

### Updating

Replace the module folders, click **Scan directory** again, and hard-refresh the browser.

## Usage

### Full page: Monitoring → 3D Maps

Open **Monitoring → 3D Maps**, choose a map from the dropdown in the top right, and the scene loads.

- **Auto-rotate** slowly spins the scene.
- **Reset view** returns to the default camera.
- **Full screen** shows the toolbar, legend and map across the whole screen. Press **Esc** to leave.

### Dashboard widget

1. Edit a dashboard and click **Add → Widget**.
2. Select the **3D Map** widget type.
3. Configure it:

| Setting | Description |
|---|---|
| **Map** | Which Zabbix map to display |
| **Auto-rotate** | Slowly spin the scene |
| **Rotation speed** | Slow, Normal or Fast |
| **Show labels** | Show element names above the bars |
| **Show floor grid** | Show the ground grid |
| **Open problems on click** | Click an element to open its problems in a new tab |
| **Refresh interval** | Built-in Zabbix widget option (default: 30 seconds) |
| **Show header** | Built-in Zabbix widget option. Turn it off to show only the map |

The widget content is just the map, with no toolbar, legend or buttons.

### Controls

| Action | Page | Widget |
|---|---|---|
| Rotate | Drag | Drag |
| Pan | Shift + drag, or right-drag | Shift + drag, or right-drag |
| Zoom | Mouse wheel | **Ctrl / Cmd + wheel** (so the dashboard still scrolls) |
| Reset view | **Reset view** button | Double-click |
| Details | Hover an element | Hover an element |
| Open | Click an element | Click an element (if enabled in settings) |

## How it works

- The **page** and the **widget** fetch map data from small PHP controllers that use the standard Zabbix API (`Map.get`, `Host.get`, `HostGroup.get`, `Trigger.get`).
- Element severity is the highest priority among active, non-dependent triggers on the host, host group or trigger. Sub-map elements are shown as healthy.
- The scene is drawn on a `<canvas>` with a built-in perspective projection, near-plane clipping and painter's-algorithm depth sorting. No WebGL and no third-party code.
- The page refreshes every 30 seconds. The widget follows the widget's refresh interval. Updates only change the data, so your camera position is kept.

## Configuration

| What | Where |
|---|---|
| Page auto-refresh interval | `map3d/actions/Map3DView.php`, the `'refresh' => 30` value (seconds) |
| Widget default refresh | `threedmapwidget/Widget.php`, `getDefaultRefreshRate()` |
| Bar height and colours | `assets/js/*.js` (`COLORS`, bar height factors) |
| Page styling | `map3d/assets/css/map3d.css` |

## Repository layout

```
.
├── README.md
├── map3d/                     # page module  (Monitoring → 3D Maps)
│   ├── manifest.json
│   ├── Module.php             # adds the menu entry
│   ├── actions/
│   │   ├── Map3DView.php      # page controller
│   │   └── Map3DData.php      # JSON data endpoint
│   ├── views/
│   │   └── threedmap.view.php
│   └── assets/
│       ├── css/map3d.css
│       └── js/map3d.js
└── threedmapwidget/           # dashboard widget (Zabbix 7.0+)
    ├── manifest.json
    ├── Widget.php
    ├── actions/WidgetView.php
    ├── includes/WidgetForm.php
    ├── views/
    │   ├── widget.view.php
    │   └── widget.edit.php
    └── assets/
        ├── css/widget.css
        └── js/
            ├── scene.js       # the 3D renderer
            └── class.widget.js
```

## Troubleshooting

| Problem | What to check |
|---|---|
| Module does not appear after **Scan directory** | The folder must contain `manifest.json` directly, for example `modules/map3d/manifest.json`, not a nested folder |
| `Invalid view name` error | View and action names may only contain lowercase letters and dots. Do not rename them to include digits |
| Blank page or old behaviour after an update | Hard-refresh (Ctrl+F5) and re-scan the module directory |
| Menu entry missing | The user role needs the **Monitoring → Maps** permission |
| Widget missing from the widget list | The widget needs Zabbix 7.0 or newer, and the module must be enabled |
| Map is empty | The map has no elements, or the user has no access to the hosts on it |
| Files not readable | `chmod -R a+rX` on the module folders |

If something fails, check the PHP error log of your web server and the browser developer console.

## Known limitations

- Link colours are static. They do not change when a link trigger fires.
- Sub-map elements are always drawn as healthy.
- Map labels containing macros fall back to the element's real name.
- Only the first element of a multi-element map selement is used.
- The widget requires Zabbix 7.0 or newer.

## Credits

Developed by **[Syntrix Systems](https://syntrix.ir)**.

Zabbix® is a registered trademark of Zabbix LLC. This project is not affiliated with or endorsed by Zabbix.
