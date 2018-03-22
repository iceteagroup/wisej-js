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
 * wisej.web.AlertBox
 */
qx.Class.define("wisej.web.AlertBox", {

	extend: qx.ui.container.Composite,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejControl],

	construct: function () {

		this.base(arguments, new qx.ui.layout.Grid());

		this.setAllowGrowX(true);
		this.setAllowGrowY(true);

		var layout = this.getLayout();
		layout.setRowFlex(0, 1);
		layout.setColumnFlex(0, 0);
		layout.setColumnFlex(1, 1);

		// destroy the alert boxes that are hidden.
		this.addListenerOnce("disappear", function () {
			this.destroy();
		});

	},

	properties: {

		appearance: { init: "alertbox", refine: true },

		/**
		 * Message text. Can contain html.
		 */
		message: { init: "", check: "String" },

		/**
		 * Icon to display in the messagebox.
		 *
		 * Known values: None, Error, Question, Warning, Information.
		 */
		icon: { init: "", check: "String" },

		/**
		 * Alert box alignment.
		 */
		alignment: {
			init: "bottomRight",
			check: ["topRight", "middleRight", "bottomRight", "topLeft", "topCenter", "middleLeft", "middleCenter", "bottomLeft", "bottomCenter"]
		},

		/**
		 * Auto close delay in milliseconds.
		 */
		autoCloseDelay: { init: 5000, check: "Integer", themeable: true },

		/**
		 * FadeIn delay in milliseconds.
		 */
		fadeInDelay: { init: 200, check: "Integer", themeable: true },

		/**
		 * Shows or hides the close button.
		 */
		showCloseButton: { init: true, check: "Boolean" },

		/**
		 * Shows a progress bar to match the auto-close timer.
		 */
		showProgressBar: { init: false, check: "Boolean", themeable: true, apply: "_applyShowProgressBar" },

		/**
		 * Proxy component to fire the "close" even on. The AlertBox widget
		 * doesn't have a corresponding component, it's disposed immediately on the server.
		 */
		closeProxy: { init: null, check: "wisej.web.alertbox.CloseProxy", transform: "_transformComponent" },
	},

	members: {

		// Wisej window marker.
		isWindow: true,

		/** auto close timer for the progress bar. */
		__autoCloseTimer: 0,

		// overridden: forwarded states.
		_forwardStates: {
			horizontal: true,
			vertical: true,
			information: true,
			hand: true,
			stop: true,
			error: true,
			warning: true,
			question: true
		},

		show: function () {

			this.__setIcon(this.getIcon());
			this.getChildControl("message").setValue(this.getMessage());
			this.getChildControl("close").setVisibility(this.getShowCloseButton() ? "visible" : "excluded");

			if (!wisej.web.DesignMode) {

				// add to the docking manager.
				wisej.web.alertbox.Manager.getInstance().add(this);

				// show it.
				this.fadeIn(this.getFadeInDelay()).addListenerOnce("end", function (e) {
					this.__startAutoCloseTimer();
				}, this);
			}
		},

		// required implementation: the alert box is never the active window.
		getActive: function () {
			return false;
		},

		__setIcon: function (value) {

			var image = this.getChildControl("icon");
			var iconPane = this.getChildControl("iconPane")

			if (!value || value == "none") {
				iconPane.exclude();
			}
			else {
				iconPane.show();
				this.addState(value);
				image.setSource("messagebox-" + value);
			}
		},

		_createChildControlImpl: function (id, hash) {

			var control;

			switch (id) {

				case "iconPane":
					control = new qx.ui.container.Composite(new qx.ui.layout.HBox());
					this.add(control, { column: 0, row: 0 })
					break;

				case "icon":
					control = new qx.ui.basic.Image();
					this.getChildControl("iconPane").add(control);
					break;

				case "message":
					control = new qx.ui.basic.Label().set({
						rich: true,
						allowGrowX: true,
						allowGrowY: true
					})
					this.add(control, { column: 1, row: 0 })
					break;

				case "close":
					control = new qx.ui.form.Button().set({
						focusable: false,
						allowGrowX: false,
						allowGrowY: false
					});
					control.addListener("execute", this._onCloseButton, this);
					this.add(control, { column: 2, row: 0 })
					break;

				case "progressbar":
					control = new qx.ui.core.Widget();
					control.exclude();
					this.add(control, { column: 0, row: 1, colSpan: 3 });
					break;
			}

			return control || this.base(arguments, id);
		},

		_onCloseButton: function (e) {

			if (wisej.web.DesignMode)
				return;

			this.destroy();
		},

		/**
		 * Applies the showProgressBar property.
		 */
		_applyShowProgressBar: function (value, old) {

			if (value == null)
				this.resetShowProgressBar();
		},

		__startAutoCloseTimer: function () {

			var me = this;
			var delay = this.getAutoCloseDelay();

			if (delay > 100) {

				this.__autoCloseTimer = setTimeout(function () {

					if (!me.isDisposed())
						me.fadeOut(400);

				}, delay);

				if (this.getShowProgressBar()) {

					// show the progressbar and use the transition
					// delay to animate it to 0px.
					var progressBar = this._showChildControl("progressbar");
					progressBar.addListenerOnce("appear", function () {
						progressBar.getContentElement().setStyles({
							"transition": "width " + delay + "ms linear",
							"width": "0px"
						}, true);
					}, this);
				}
			}
		},

		// overridden.
		destroy: function () {

			clearTimeout(this.__autoCloseTimer);
			this.__autoCloseTimer = 0;

			// fire the "close" event on the proxy.
			var proxy = this.getCloseProxy();
			if (proxy)
				proxy.fireEvent("close");

			this.base(arguments);
		}

	},

	destruct: function () {

		clearTimeout(this.__autoCloseTimer);
	}
});


/**
 * wisej.web.alertbox.Manager
 */
qx.Class.define("wisej.web.alertbox.Manager", {

	type: "singleton",
	extend: qx.core.Object,

	construct: function () {

		this.base(arguments);

		this.__dockingPanes = {};
	},

	members: {

		// named collection of docking panes.
		// each pane is created as needed.
		__dockingPanes: null,

		/**
		 * Adds the alert box to it's docking pane.
		 */
		add: function (alertBox) {

			var pane = this.__getDockingPane(alertBox.getAlignment());
			if (pane) {

				var edge = "north";
				var alignX = "left";
				var alignY = null;

				switch (alertBox.getAlignment()) {
					case "topLeft":
						edge = "north";
						alignX = "left";
						break;
					case "topCenter":
						edge = "north";
						alignX = "center";
						break;
					case "topRight":
						edge = "north";
						alignX = "right";
						break;

					case "middleLeft":
						edge = "north";
						alignX = "center";
						break;
					case "middleCenter":
						edge = "north";
						alignX = "center";
						break;
					case "middleRight":
						edge = "north";
						alignX = "center";
						break;

					case "bottomLeft":
						edge = "south";
						break;
					case "bottomCenter":
						edge = "south";
						alignX = "center";
						break;
					case "bottomRight":
						edge = "south";
						alignX = "right";
						break;

				}

				alertBox.setAlignX(alignX);
				alertBox.setAlignY(alignY);
				pane.add(alertBox, { edge: edge });
			}
		},

		/**
		 * Returns all open alert boxes.
		 */
		getAll: function () {
			var list = [];

			if (this.__dockingPanes == null)
				return list;

			for (var name in this.__createDockingPane) {
				var pane = this.__createDockingPane[name];
				if (pane) {
					var children = pane.getChildren();
					if (children && children.length > 0) {
						for (var i = 0; i < children.length; i++) {
							if (children[i] instanceof wisej.web.AlertBox)
								list.push(children[i]);
						}
					}
				}
			}

			return list;
		},

		__getDockingPane: function (alignment) {

			var pane = this.__dockingPanes[alignment];
			if (!pane) {
				pane = this.__createDockingPane(alignment);
				this.__dockingPanes[alignment] = pane;
			}
			return pane;
		},

		__createDockingPane: function (alignment) {

			var root = qx.core.Init.getApplication().getRoot();
			var container = new wisej.web.alertbox.DockingPane();
			this.__dockingPanes[alignment] = container;

			var layout = {};
			switch (alignment) {
				case "topLeft":
					layout = { left: 0, top: 0 };
					break;
				case "topCenter":
					container.setAlignX("center");
					layout = { top: 0 };
					break;
				case "topRight":
					layout = { top: 0, right: 0 };
					break;
				case "middleLeft":
					container.setAlignY("middle");
					layout = { left: 0 };
					break;
				case "middleCenter":
					container.setAlignY("middle");
					container.setAlignX("center");
					break;
				case "middleRight":
					container.setAlignY("middle");
					layout = { right: 0 };
					break;
				case "bottomLeft":
					layout = { left: 0, bottom: 0 };
					break;
				case "bottomCenter":
					container.setAlignX("center");
					layout = { bottom: 0 };
					break;
				case "bottomRight":
					layout = { right: 0, bottom: 0 };
					break;
			}
			root.add(container, layout);

			return container;
		},
	}

});


/**
 * wisej.web.alertbox.DockingPane
 */
qx.Class.define("wisej.web.alertbox.DockingPane", {

	extend: qx.ui.container.Composite,

	construct: function () {

		this.base(arguments, new qx.ui.layout.Dock());

		this.setZIndex(1e8);
	},

	properties: {
		appearance: { init: "alertbox/dockingpane", refine: true },
	},

	members: {

		// overridden
		_createContentElement: function () {
			return new qx.html.Element("div", {
				overflowX: "visible",
				overflowY: "visible"
			});
		},
	}
});


/**
 * wisej.web.alertbox.CloseProxy
 *
 * Provides a proxy that the AlertBox can use to fire events back to the server.
 */
qx.Class.define("wisej.web.alertbox.CloseProxy", {

	extend: qx.core.Object,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejComponent]

});
