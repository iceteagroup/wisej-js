///////////////////////////////////////////////////////////////////////////////
//
// (C) 2015 ICE TEA GROUP LLC - ALL RIGHTS RESERVED
//
// 
//
// ALL INFORMATION CONTAINED HEREIN IS, AND REMAINS
// THE PROPERTY OF ICE TEA GROUP LLC AND ITS SUPPLIERS, IF ANY.
// THE INTELLECTUAL PROPERTY AND TECHNICAL CONCEPTS CONTAINED
// HEREIN ARE PROPRIETARY TO ICE TEA GROUP LLC AND ITS SUPPLIERS
// AND MAY BE COVERED BY U.S. AND FOREIGN PATENTS, PATENT IN PROCESS, AND
// ARE PROTECTED BY TRADE SECRET OR COPYRIGHT LAW.
//
// DISSEMINATION OF THIS INFORMATION OR REPRODUCTION OF THIS MATERIAL
// IS STRICTLY FORBIDDEN UNLESS PRIOR WRITTEN PERMISSION IS OBTAINED
// FROM ICE TEA GROUP LLC.
//
///////////////////////////////////////////////////////////////////////////////

/**
 * wisej.web.WindowManager
 * 
 * Replaces the default qooxdoo qx.ui.window.Manager to
 * change the order of modal, modeless and alwaysOnTop windows.
 */
qx.Class.define("wisej.web.WindowManager", {

	extend: qx.ui.window.Manager,

	members: {

		// interface implementation
		updateStack: function () {

			// we use the widget queue to do the sorting one before the queues are
			// flushed. The queue will call "syncWidget"
			qx.ui.core.queue.Widget.add(this);
		},

		/**
		 * This method is called during the flush of the
		 * {@link qx.ui.core.queue.Widget widget queue}.
		 */
		syncWidget: function () {

			this.__desktop.forceUnblock();

			var windows = this.__desktop.getWindows();

			// z-index for all three window kinds.
			var zIndex = this._minZIndex;
			var zIndexOnTop = zIndex + windows.length * 2;
			var zIndexModal = zIndex + windows.length * 4;

			// marker if there is an active window.
			var active = null;

			for (var i = 0, l = windows.length; i < l; i++) {

				var win = windows[i];

				// ignore invisible windows.
				if (!win.isVisible())
					continue;

				// take the first window as the active window.
				active = active || win;

				// use only every second z index to easily insert a blocker between two windows.
				// alwaysOnTop windows stay on top of modal windows modal windows which stay
				// stay on top of regular windows.
				if (win.isModal()) {
					win.setZIndex(zIndexModal);
					this.__desktop.blockContent(zIndexModal - 1);
					zIndexModal += 2;

					//activate it if it's modal.
					active = win;

				} else if (win.isAlwaysOnTop()) {

					win.setZIndex(zIndexOnTop);
					zIndexOnTop += 2;

				} else {

					win.setZIndex(zIndex);
					zIndex += 2;
				}

				// update the active window.
				if (!active.isModal() &&
					win.isActive() ||
					win.getZIndex() > active.getZIndex()) {

					active = win;
				}
			}

			// set the active window or null.
			this.__desktop.setActiveWindow(active);
		},
	},

	defer: function (statics) {

		// replace the default window manager.
		qx.ui.window.Window.DEFAULT_MANAGER_CLASS = wisej.web.WindowManager;
	}
});
