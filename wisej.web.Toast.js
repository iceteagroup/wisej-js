///////////////////////////////////////////////////////////////////////////////
//
// (C) 2020 ICE TEA GROUP LLC - ALL RIGHTS RESERVED
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
 * wisej.web.Toast
 */
qx.Class.define("wisej.web.Toast", {

	extend: qx.ui.basic.Atom,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejControl],

	construct: function () {

		this.base(arguments);

		// block "contextmenu" from bubbling up to the Page or Desktop.
		this.addListener("longtap", function (e) { e.stopPropagation(); }, this);
		this.addListener("contextmenu", function (e) { e.stopPropagation(); }, this);
	},

	properties: {

		appearance: { init: "toast", refine: true },

		/**
		 * Alert box alignment.
		 */
		alignment: {
			init: "bottomRight",
			check: ["topRight", "middleRight", "bottomRight", "topLeft", "topCenter", "middleLeft", "middleCenter", "bottomLeft", "bottomCenter"]
		},

		/**
		 * Auto dispose flag.
		 */
		autoDispose: { init: false, check: "Boolean" },

		/**
		 * Auto close flag.
		 */
		autoClose: { init: false, check: "Boolean" },

		/**
		 * Auto close delay in milliseconds.
		 */
		autoCloseDelay: { init: 5000, check: "Integer" },

		/**
		 * Animation for the appear event.
		 */
		animation: { init: null, check: "String", themeable: true }
	},

	members: {

		/** auto close timer for the progress bar. */
		__autoCloseTimer: 0,

		show: function () {

			this.setRich(true);
			this.setAllowGrowX(false);

			// use the alignment as a state.
			this.addState(this.getAlignment());
			this.syncWidget();

			// add to the docking manager.
			wisej.web.toast.Manager.getInstance().add(this);

			this.base(arguments);

			this.__startAutoCloseTimer();
		},

		close: function () {

			this.exclude();
			this.fireEvent("close");

			if (this.isAutoDispose())
				this.destroy();
		},

		__startAutoCloseTimer: function () {

			var me = this;
			var delay = this.getAutoCloseDelay();

			if (delay > 0) {

				this.__autoCloseTimer = setTimeout(function () {

					me.close();

				}, delay);
			}
		}
	},

	destruct: function () {

		if (this.__autoCloseTimer)
			clearTimeout(this.__autoCloseTimer);
	}
});



/**
 * wisej.web.toast.Manager
 */
qx.Class.define("wisej.web.toast.Manager", {

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
		 * Adds the toast to it's docking pane.
		 */
		add: function (toast) {

			var pane = this.__getDockingPane(toast.getAlignment());
			if (pane) {

				var edge = "north";
				var alignX = "left";
				var alignY = null;
				var animation = toast.getAnimation();

				switch (toast.getAlignment()) {
					case "topLeft":
						edge = "north";
						alignX = "left";
						animation = animation || "slideLeftIn";
						break;
					case "topCenter":
						edge = "north";
						alignX = "center";
						animation = animation || "slideDownIn";
						break;
					case "topRight":
						edge = "north";
						alignX = "right";
						animation = animation || "slideRightIn";
						break;

					case "middleLeft":
						edge = "north";
						alignX = "center";
						animation = animation || "slideLeftIn";
						break;
					case "middleCenter":
						edge = "north";
						alignX = "center";
						animation = animation || "popIn";
						break;
					case "middleRight":
						edge = "north";
						alignX = "center";
						animation = animation || "slideRightIn";
						break;

					case "bottomLeft":
						edge = "south";
						animation = animation || "slideLeftIn";
						break;
					case "bottomCenter":
						edge = "south";
						alignX = "center";
						animation = animation || "slideUpIn";
						break;
					case "bottomRight":
						edge = "south";
						alignX = "right";
						animation = animation || "slideRightIn";
						break;
				}

				toast.setAlignX(alignX);
				toast.setAlignY(alignY);
				pane.add(toast, { edge: edge });

				if (animation) {
					toast.addListenerOnce("appear", function (e) {
						wisej.web.Animation.animate(toast, animation);
					});
				}
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
			var container = new wisej.web.toast.DockingPane();
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
 * wisej.web.toast.DockingPane
 */
qx.Class.define("wisej.web.toast.DockingPane", {

	extend: qx.ui.container.Composite,

	construct: function () {

		this.base(arguments, new qx.ui.layout.Dock());

		// 1 + the AlertBox.
		this.setZIndex(1e8 + 1);
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

