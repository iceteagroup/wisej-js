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

			var desktop = this.getDesktop();
			var windows = desktop.getWindows();

			// z-index for all three window kinds.
			var zIndex = this._minZIndex;
			var zIndexOnTop = zIndex + windows.length * 2;
			var zIndexModal = zIndex + windows.length * 4;

			// window to bring to top.
			var active = null;

			// indicates whether to block and the blocking z-index.
			var blockZIndex = -1;

			// collects the z-indexes to assign to the windows.
			var zIndexes = [];

			for (var i = 0, l = windows.length; i < l; i++) {

				var win = windows[i];

				// ignore invisible windows.
				if (!win.isVisible())
					continue;

				// take the first window as active window
				active = active || win;

				// skip z-indexes already assigned.
				if (zIndexes[i] !== undefined)
					continue;

				// use only every second z index to easily insert a blocker between two windows.
				// alwaysOnTop windows stay on top of modal windows modal windows which stay
				// stay on top of regular windows.
				if (win.isModal()) {

					block = true;
					win.setZIndex(zIndexModal);
					zIndexes[i] = zIndexModal;
					blockZIndex = zIndexModal - 1;
					zIndexModal += 2;

					//just activate it if it's modal
					active = win;

				} else if (win.isAlwaysOnTop() && !win.getOwner()) {

					win.setZIndex(zIndexOnTop);
					zIndexes[i] = zIndexOnTop;
					zIndexOnTop += 2;

				} else {

					// if the form was created after a modal, use the modal z-index as the
					// base z-index - the form must always be above the modal that was active
					// when the form was created.

					var owner = win.getOwner();
					if (owner) {

						var mi = windows.indexOf(owner);
						if (mi > -1 && zIndexes[mi] === undefined) {

							block = true;
							owner.setZIndex(zIndexModal);
							zIndexes[mi] = zIndexModal;
							blockZIndex = zIndexModal - 1;
							zIndexModal += 2;
						}

						win.setZIndex(zIndexModal);
						zIndexes[i] = zIndexModal;
						zIndexModal += 2;
					}
					else {

						win.setZIndex(zIndex);
						zIndexes[i] = zIndex;
						zIndex += 2;
					}
				}

				// update the active window.
				if (win.getZIndex() > active.getZIndex()) {

					if (win.isActive())
						active = win;
					else if (!active.isActive())
						active = win;
				}
			}

			// desktop.getBlocker().setKeepBlockerActive(false);

			// remove the previous blocking and if we are not in modal, restore the previous active widget.
			if (blockZIndex > -1) {
				desktop.forceUnblock(false /*restoreActive*/);
				desktop.blockContent(blockZIndex, true /*keepActive*/);
			}
			else {
				desktop.forceUnblock(true /*restoreActive*/);
			}

			// set the active window or null.
			desktop.setActiveWindow(active);
		}
	},

	defer: function (statics) {

		// replace the default window manager.
		qx.ui.window.Window.DEFAULT_MANAGER_CLASS = wisej.web.WindowManager;
	}
});
