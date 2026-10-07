/* Zabbix 3D Map - dependency-free (Canvas 2D, own perspective projection). */
(function () {
	'use strict';

	const COLORS = ['#59DB8F', '#7499FF', '#FFC859', '#FFA059', '#E97659', '#E45959'];
	const SEV = ['Healthy', 'Information', 'Warning', 'Average', 'High', 'Disaster'];
	const SIZE = 36, BASE_H = 16, STEP_H = 24;

	function shade(hex, f) {
		const n = parseInt(hex.slice(1), 16);
		const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * f))));
		return 'rgb(' + c.join(',') + ')';
	}

	window.Map3D = class {
		constructor(root, cfg) {
			this.root = root;
			this.cfg = cfg;
			this.canvas = root.querySelector('canvas');
			this.ctx = this.canvas.getContext('2d');
			this.tip = root.querySelector('.map3d-tip');
			this.nodes = [];
			this.links = [];
			this.byId = {};
			this.radius = 300;
			this.extent = 300;
			this.resetView();
			this.hover = null;
			this.drag = null;
			this.rotate = false;

			const sel = document.getElementById('map3d-select');
			if (sel) sel.addEventListener('change', () => { window.location.href = cfg.viewUrl + encodeURIComponent(sel.value); });
			document.getElementById('map3d-reset').addEventListener('click', () => this.resetView());
			document.getElementById('map3d-rotate').addEventListener('change', e => { this.rotate = e.target.checked; });

			// Full screen (the whole block: toolbar, legend and map)
			const fsBtn = document.getElementById('map3d-fullscreen');
			const reqFs = root.requestFullscreen || root.webkitRequestFullscreen;
			const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
			const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
			if (!reqFs) {
				fsBtn.style.display = 'none';
			}
			else {
				fsBtn.addEventListener('click', () => {
					if (fsEl() === root) exitFs.call(document);
					else reqFs.call(root);
				});
				const onFs = () => {
					const on = fsEl() === root;
					fsBtn.textContent = on ? 'Exit full screen' : 'Full screen';
					root.style.background = on ? getComputedStyle(document.body).backgroundColor : '';
					this.resize();
					setTimeout(() => this.resize(), 150);
				};
				document.addEventListener('fullscreenchange', onFs);
				document.addEventListener('webkitfullscreenchange', onFs);
			}

			const c = this.canvas;
			c.addEventListener('pointerdown', e => this.onDown(e));
			c.addEventListener('pointermove', e => this.onMove(e));
			c.addEventListener('pointerup', e => this.onUp(e));
			c.addEventListener('pointerleave', () => { this.hover = null; this.tip.style.display = 'none'; });
			c.addEventListener('contextmenu', e => e.preventDefault());
			c.addEventListener('wheel', e => {
				e.preventDefault();
				this.zoom = Math.max(0.25, Math.min(4, this.zoom * (e.deltaY > 0 ? 1.1 : 0.9)));
			}, {passive: false});
			window.addEventListener('resize', () => this.resize());

			this.resize();
			this.load();
			this.timer = setInterval(() => {
				if (!document.hidden && document.body.contains(this.root)) this.load();
			}, cfg.refresh * 1000);
			const loop = () => {
				if (!document.body.contains(this.root)) { clearInterval(this.timer); return; }
				if (this.rotate && !this.drag) this.yaw += 0.004;
				this.draw();
				requestAnimationFrame(loop);
			};
			requestAnimationFrame(loop);
		}

		resetView() { this.yaw = 0; this.pitch = 0.9; this.zoom = 1; this.panX = 0; this.panY = 0; }

		resize() {
			const r = this.canvas.getBoundingClientRect(), d = window.devicePixelRatio || 1;
			this.w = r.width; this.h = r.height;
			this.canvas.width = Math.round(r.width * d);
			this.canvas.height = Math.round(r.height * d);
			this.ctx.setTransform(d, 0, 0, d, 0, 0);
		}

		load() {
			fetch(this.cfg.dataUrl + encodeURIComponent(this.cfg.sysmapid), {credentials: 'same-origin'})
				.then(r => r.json())
				.then(d => this.setData(d))
				.catch(() => {});
		}

		setData(d) {
			if (!d || !d.nodes) return;
			let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
			d.nodes.forEach(n => {
				minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
				minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
			});
			if (!d.nodes.length) { minX = maxX = minY = maxY = 0; }
			const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
			this.nodes = d.nodes.map(n => Object.assign({}, n, {wx: n.x - cx, wz: -(n.y - cy), h: BASE_H + n.sev * STEP_H}));
			this.byId = {};
			this.nodes.forEach(n => this.byId[n.id] = n);
			this.links = d.links.filter(l => this.byId[l.a] && this.byId[l.b]);
			this.extent = Math.max(maxX - minX, maxY - minY, 200) / 2 + 60;
			this.radius = Math.hypot(this.extent, this.extent * 0.3) + 40;
		}

		project(x, y, z) {
			const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
			const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
			const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
			const y1 = y * cp + z1 * sp, depth = z1 * cp - y * sp;
			const d0 = this.radius * 2.2;
			const f = (Math.min(this.w, this.h) / 2) * (d0 / this.radius) * 0.9;
			const k = f / (d0 * this.zoom + depth);
			return [this.w / 2 + this.panX + x1 * k, this.h / 2 + this.panY - y1 * k, depth, k];
		}

// --- near-plane clipping (prevents flipped / giant geometry when the camera is close) ---
	near() { return this.radius * 0.05; }

	dist(x, y, z) {
		const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
		const z1 = x * sy + z * cy;
		const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
		return this.radius * 2.2 * this.zoom + z1 * cp - y * sp;
	}

	clipSeg(a, b) {
		const n = this.near(), wa = this.dist(a[0], a[1], a[2]), wb = this.dist(b[0], b[1], b[2]);
		if (wa <= n && wb <= n) return null;
		if (wa >= n && wb >= n) return [a, b];
		const t = (n - wa) / (wb - wa);
		const m = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
		return wa < n ? [m, b] : [a, m];
	}

	clipPoly(pts) {
		const n = this.near(), out = [];
		for (let i = 0; i < pts.length; i++) {
			const a = pts[i], b = pts[(i + 1) % pts.length];
			const wa = this.dist(a[0], a[1], a[2]), wb = this.dist(b[0], b[1], b[2]);
			if (wa >= n) out.push(a);
			if ((wa >= n) !== (wb >= n)) {
				const t = (n - wa) / (wb - wa);
				out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
			}
		}
		return out;
	}

	draw() {
			const ctx = this.ctx;
			ctx.clearRect(0, 0, this.w, this.h);
			const fg = getComputedStyle(this.root).color || '#888';

			const e = this.extent, step = 50;
			const seg = (a, b) => {
				const c = this.clipSeg(a, b);
				if (!c) return;
				const p = this.project(c[0][0], c[0][1], c[0][2]), q = this.project(c[1][0], c[1][1], c[1][2]);
				ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
			};
			ctx.lineWidth = 1;
			ctx.strokeStyle = 'rgba(128,128,128,0.28)';
			ctx.beginPath();
			for (let g = -Math.ceil(e / step) * step; g <= e + step; g += step) {
				seg([g, 0, -e - step], [g, 0, e + step]);
				seg([-e - step, 0, g], [e + step, 0, g]);
			}
			ctx.stroke();

			this.links.forEach(l => {
				const A = this.byId[l.a], B = this.byId[l.b];
				const c = this.clipSeg([A.wx, 2, A.wz], [B.wx, 2, B.wz]);
			if (!c) return;
			const a = this.project(c[0][0], c[0][1], c[0][2]), b = this.project(c[1][0], c[1][1], c[1][2]);
				ctx.strokeStyle = '#' + l.color;
				ctx.lineWidth = Math.max(1.5, Math.min(6, (a[3] + b[3]) / 2 * 3));
				ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
			});

			const items = this.nodes.map(n => ({n, depth: this.project(n.wx, n.h / 2, n.wz)[2]}))
				.sort((a, b) => b.depth - a.depth);

			const s = SIZE / 2;
			const faces = [
				{v: [[-s,0,-s],[s,0,-s],[s,1,-s],[-s,1,-s]], f: 0.70},
				{v: [[-s,0,s],[s,0,s],[s,1,s],[-s,1,s]], f: 0.85},
				{v: [[-s,0,-s],[-s,0,s],[-s,1,s],[-s,1,-s]], f: 0.60},
				{v: [[s,0,-s],[s,0,s],[s,1,s],[s,1,-s]], f: 0.78},
				{v: [[-s,1,-s],[s,1,-s],[s,1,s],[-s,1,s]], f: 1.12}
			];

			const hits = [];
			items.forEach(it => {
				const n = it.n, col = COLORS[n.sev] || COLORS[0];
				let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
				const fs = faces.map(fc => {
					const world = this.clipPoly(fc.v.map(v => [n.wx + v[0], v[1] * n.h, n.wz + v[2]]));
				if (world.length < 3) return null;
				const pts = world.map(w => this.project(w[0], w[1], w[2]));
					pts.forEach(p => {
						minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]);
						miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]);
					});
					return {pts, f: fc.f, d: pts.reduce((a, p) => a + p[2], 0) / pts.length};
				}).filter(Boolean).sort((a, b) => b.d - a.d);

				const hot = this.hover === n;
				fs.forEach(fc => {
					ctx.beginPath();
					fc.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
					ctx.closePath();
					ctx.fillStyle = shade(col, fc.f * (hot ? 1.2 : 1));
					ctx.fill();
					ctx.strokeStyle = 'rgba(0,0,0,0.35)';
					ctx.lineWidth = 1;
					ctx.stroke();
				});
				if (fs.length) hits.push({n, minx, miny, maxx, maxy, depth: it.depth});
			n._top = this.dist(n.wx, n.h, n.wz) > this.near() ? this.project(n.wx, n.h, n.wz) : null;
			});
			this.hits = hits;

			// Labels: dark pill + white text (readable over any node colour), nearest first,
			// nudged upward when they would overlap an already placed label.
			ctx.font = '11px sans-serif';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			const placed = [];
			this.nodes.filter(n => n.label && n._top)
				.sort((a, b) => a._top[2] - b._top[2])
				.forEach(n => {
					const text = n.label.length > 28 ? n.label.slice(0, 27) + '\u2026' : n.label;
					const w = ctx.measureText(text).width + 10, h = 16;
					const x = n._top[0] - w / 2;
					let y = n._top[1] - 6 - h;
					for (let i = 0; i < 8 && placed.some(r => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y); i++) {
						y -= h + 2;
					}
					placed.push({x, y, w, h});
					ctx.fillStyle = 'rgba(20,20,20,0.78)';
					ctx.beginPath();
					if (ctx.roundRect) ctx.roundRect(x, y, w, h, 3); else ctx.rect(x, y, w, h);
					ctx.fill();
					ctx.fillStyle = '#fff';
					ctx.fillText(text, n._top[0], y + h / 2 + 0.5);
				});
		}

		pick(x, y) {
			let best = null;
			(this.hits || []).forEach(h => {
				if (x >= h.minx && x <= h.maxx && y >= h.miny && y <= h.maxy && (!best || h.depth < best.depth)) best = h;
			});
			return best ? best.n : null;
		}

		pos(e) {
			const r = this.canvas.getBoundingClientRect();
			return [e.clientX - r.left, e.clientY - r.top];
		}

		onDown(e) {
			this.canvas.setPointerCapture(e.pointerId);
			const [x, y] = this.pos(e);
			this.drag = {x, y, sx: x, sy: y, pan: e.shiftKey || e.button === 2, moved: false};
			this.canvas.classList.add('drag');
		}

		onMove(e) {
			const [x, y] = this.pos(e);
			if (this.drag) {
				const dx = x - this.drag.x, dy = y - this.drag.y;
				if (Math.hypot(x - this.drag.sx, y - this.drag.sy) > 4) this.drag.moved = true;
				if (this.drag.pan) { this.panX += dx; this.panY += dy; }
				else {
					this.yaw += dx * 0.008;
					this.pitch = Math.max(0.05, Math.min(1.55, this.pitch + dy * 0.008));
				}
				this.drag.x = x; this.drag.y = y;
				this.tip.style.display = 'none';
				return;
			}
			const n = this.pick(x, y);
			this.hover = n;
			if (n) {
				this.tip.textContent = n.kind + ': ' + (n.label || '-') + '  |  ' + SEV[n.sev];
				this.tip.style.left = (x + 14) + 'px';
				this.tip.style.top = (y + 14) + 'px';
				this.tip.style.display = 'block';
				this.canvas.style.cursor = n.url ? 'pointer' : 'grab';
			}
			else {
				this.tip.style.display = 'none';
				this.canvas.style.cursor = '';
			}
		}

		onUp(e) {
			const d = this.drag;
			this.drag = null;
			this.canvas.classList.remove('drag');
			if (d && !d.moved) {
				const [x, y] = this.pos(e);
				const n = this.pick(x, y);
				if (n && n.url) window.location.href = n.url;
			}
		}
	};
})();
