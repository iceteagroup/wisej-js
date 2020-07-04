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
 * wisej.web.Desktop
 *
 *
 * The desktop component replaces the default root container and
 * provides the following features:
 *
 * - A "workspace" area that contains windows and action icons (shortcuts).
 * - A "taskbar" strip at the bottom that contains action icons (shortcuts), minimized windows, and notification widgets.
 * 
 */
qx.Class.define("wisej.web.Desktop", {

	extend: qx.ui.container.Composite,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MAccelerators,
		qx.ui.core.MRemoteChildrenHandling,
		qx.ui.core.MRightToLeftLayout
	],

	implement: qx.ui.window.IDesktop,

	construct: function () {

		this.base(arguments, new qx.ui.layout.Dock());

		this.__taskbar = this.getChildControl("taskbar");
		this.__workspace = this.getChildControl("workspace");
	},

	events: {

		/**
		 * A wisej.web.DesktopTaskBarItem is click (left or right, or tapped).
		 */
		itemClick: "qx.event.type.Mouse",

		/**
		 * A wisej.web.DesktopTaskBarItem is double clicked.
		 */
		itemDblClick: "qx.event.type.Mouse"
	},

	properties: {

		/**
		 * Appearance key.
		 */
		appearance: { init: "desktop", refine: true },

		/**
		 * Active flag.
		 *
		 * When the desktop control is marked active it will replace the
		 * single active desktop as the root container.
		 */
		active: { init: false, check: "Boolean", apply: "_applyActive" },

		/**
		 * Items property.
		 *
		 * Assigns the list of child items to display in the taskbar.
		 */
		items: { init: [], nullable: true, check: "Array", apply: "_applyItems", transform: "_transformComponents" },

		/**
		 * Wallpaper property.
		 *
		 * The wallpaper to display on the desktop.
		 */
		wallpaper: { init: null, check: "String", apply: "_applyWallpaper", nullable: true, themeable: true },

		/**
		 * AutoHideTaskbar property.
		 *
		 * Returns or sets whether the taskbar is hidden automatically when there are no
		 * opened windows or no windows with the property ShowInTaskbar set to true.
		 */
		autoHideTaskbar: { init: false, check: "Boolean", apply: "_applyAutoHideTaskbar" },

		/**
		 * TaskbarPosition property.
		 *
		 * Returns or sets the docking position of the taskbar.
		 */
		taskbarPosition: { init: "bottom", check: ["left", "top", "right", "bottom"], apply: "_applyTaskbarPosition" },

	},

	members: {

		/**
		 * Desktop marker.
		 */
		isDesktop: true,

		/**
		 * Container marker.
		 */
		isWisejContainer: true,

		// references to the child taskbar and workspace widgets.
		__taskbar: null,
		__workspace: null,

		/**
		 * Whether the configured layout supports a maximized window
		 * e.g. is a Canvas.
		 *
		 * @return {Boolean} Whether the layout supports maximized windows
		 */
		supportsMaximize: function () {
			return true;
		},

		/**
		 * Get a list of all windows added to the desktop (including hidden windows)
		 *
		 * @return {qx.ui.window.Window[]} Array of managed windows
		 */
		getWindows: function () {

			return this.__workspace.getWindows();
		},

		/**
		 * Sets the currently active window.
		 *
		 * @return {qx.ui.window.Window} the active Window.
		 */
		getActiveWindow: function () {

			return this.__workspace.getActiveWindow();
		},

		/**
		 * Sets the currently active window.
		 *
		 * @param $window {qx.ui.window.Window} the Window to activate.
		 */
		setActiveWindow: function ($window) {

			this.__workspace.setActiveWindow($window);
		},

		/**
		 * Returns the container for the child controls when
		 * added to the desktop.
		 */
		getChildrenContainer: function () {

			return this.__workspace;
		},

		/**
		 * Applies the active property.
		 */
		_applyActive: function (value, old) {

			if (wisej.web.DesignMode)
				return;

			if (value) {
				this.activate();
				Wisej.Platform.setDesktop(this);
			}
			else if (Wisej.Platform.getDesktop() === this) {

				Wisej.Platform.setDesktop(null);
			}
		},

		/**
		 * Applies the autoHideTaskbar property.
		 */
		_applyAutoHideTaskbar: function (value, old) {

			if (wisej.web.DesignMode)
				return;

			this.getChildControl("taskbar").setAutoHide(value);
		},
		/**
		 * Applies the taskbarPosition property.
		 */
		_applyTaskbarPosition: function (value, old) {

			var edge = "south";

			switch (value) {
				case "left":
					edge = "west";
					break;

				case "top":
					edge = "north";
					break;

				case "right":
					edge = "east";
					break;

				case "bottom":
				default:
					edge = "south";
					break;
			}

			this.__taskbar.setLayoutProperties({ edge: edge });

			// change the orientation of the task bar and its children.
			this.__taskbar.setOrientation(this.__getOrientation());

			// update the taskbar position in the singleton preview widget.
			wisej.web.desktop.TaskbarPreview.getInstance().setTaskbarPosition(value);

			// update all the existing items.
			var items = this.getItems();
			if (items != null && items.length > 0) {
				var orientation = this.__getOrientation();
				for (var i = 0; i < items.length; i++) {
					items[i].removeState("horizontal");
					items[i].removeState("vertical");
					items[i].addState(orientation);
				}
			}
			var items = this.__taskbar.getChildren();
			if (items != null && items.length > 0) {
				var orientation = this.__getOrientation();
				for (var i = 0; i < items.length; i++) {
					items[i].removeState("horizontal");
					items[i].removeState("vertical");
					items[i].addState(orientation);
				}
			}
		},

		// Returns the orientation according to the
		// taskbarPosition value.
		__getOrientation: function () {

			switch (this.getTaskbarPosition()) {
				case "left":
				case "right":
					return "vertical";

				default:
					return "horizontal";
					break;
			}
		},

		/**
		 * Applies the items property.
		 *
		 * Updates the child items displayed in the taskbar.
		 */
		_applyItems: function (value, old) {

			var newItems = value;
			var shortcuts = this.__taskbar.getChildControl("shortcuts");
			var notifications = this.__taskbar.getChildControl("notifications");

			// remove the existing items.
			if (old && old.length > 0) {
				for (var i = 0; i < old.length; i++) {
					var item = old[i];
					item.removeListener("click", this._onItemClick, this);
					item.removeListener("dblclick", this._onItemDblClick, this);
					item.getLayoutParent().remove(item);
				}
			}

			if (newItems != null && newItems.length > 0) {

				var orientation = this.__getOrientation();

				for (var i = 0; i < newItems.length; i++) {

					var item = newItems[i];
					item.addListener("click", this._onItemClick, this);
					item.addListener("dblclick", this._onItemDblClick, this);

					if (item.getPosition() == "left") {
						shortcuts.add(item);
						item.addState("shortcut");
						item.removeState("notification");
					}
					else {
						notifications.add(item);
						item.removeState("shortcut");
						item.addState("notification");
					}
					item.addState(orientation);
				}
			}

			if (this.isAutoHideTaskbar())
				this.__taskbar.updateVisibility();
		},

		_onItemClick: function (e) {

			var evt = new qx.event.type.Mouse();
			e.clone(evt);
			evt.setBubbles(false);
			evt.setType("itemClick");
			this.dispatchEvent(evt);
		},

		_onItemDblClick: function (e) {

			var evt = new qx.event.type.Mouse();
			e.clone(evt);
			evt.setBubbles(false);
			evt.setType("itemDblClick");
			this.dispatchEvent(evt);
		},

		/**
		 * Applies the wallpaper property.
		 */
		_applyWallpaper: function (value, old) {

			if (!value) {

				this.resetWallpaper();

			}
			else {

				var me = this;
				var imageColor = qx.ui.basic.Image.resolveImage(value);

				qx.io.ImageLoader.load(imageColor.source, function (url, entry) {
					var el = me.getContentElement();
					el.setStyles({
						backgroundImage: "url(\"" + url + "\")",
						backgroundSize: "cover",
						backgroundPosition: "center center"
					});

				});
			}
		},

		/**
		 * Create child components.
		 */
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "workspace":
					// replace the window manager with ours.
					control = new wisej.web.desktop.Workspace(this).set({
						anonymous: true,
						enabled: true
					});
					this._add(control, { edge: "center" });
					break;

				case "taskbar":
					control = new wisej.web.desktop.TaskBar(this).set({
						anonymous: true
					});
					this._add(control, { edge: "south" });
					break;
			}

			return control || this.base(arguments, id);
		},

		/**
		 * getDesignMetrics
		 *
		 * Method used by the designer to retrieve metrics information about a widget in design mode.
		 */
		getDesignMetrics: function () {

			return {
				itemMetrics: this.__getItemMetrics()
			};
		},

		// returns the rectangles of all the children of the ribbon bar, including
		// the groups, separators, and items.
		__getItemMetrics: function () {

			var all = this.getItems();

			// determine the top offset.
			var taskbarRect = this.getChildControl("taskbar").getBounds();

			// return only the relevant components.
			var items = [];

			if (all && all.length > 0) {
				for (var i = 0, l = all.length; i < l; i++) {
					var widget = all[i];
					if (widget.isWisejComponent && widget.isSeeable()) {

						var widgetRect = qx.lang.Object.clone(widget.getBounds());
						var containerRect = widget.getLayoutParent().getBounds();
						widgetRect.top += taskbarRect.top + containerRect.top;
						widgetRect.left += taskbarRect.left + containerRect.left;

						items.push({
							id: widget.getId(),
							rect: widgetRect
						});

						// add the rect for the wrapped control.
						if (widget instanceof wisej.web.DesktopTaskBarItemControl) {
							var control = widget.getControl();
							if (control && control.isWisejComponent) {
								items.push({
									id: control.getId(),
									rect: control.getBounds()
								});
							}
						}
					}
				}
			}

			return items;
		},
	},

	destruct: function () {

		if (!wisej.web.DesignMode) {
			if (Wisej.Platform.getDesktop() == this)
				Wisej.Platform.setDesktop(null);
		}
	}
});


/**
 * wisej.web.DesktopTaskBarItem
 *
 * Represents an item displayed on the TaskBar inside either
 * the "shortcuts" (left) or "notifications" (right) containers.
 *
 */
qx.Class.define("wisej.web.DesktopTaskBarItem", {

	extend: qx.ui.basic.Atom,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejComponent],

	construct: function () {

		this.base(arguments);

		this.setCenter(true);
		this.setRich(true);

		this.addListener("pointerover", this._onPointerOver);
		this.addListener("pointerout", this._onPointerOut);
	},

	properties: {

		// appearance
		appearance: { init: "desktop-taskbar-item", refine: true },

		/**
		 * IconSize property.
		 *
		 * Gets or sets the size of the icon.
		 */
		iconSize: { init: null, nullable: true, check: "Map", apply: "_applyIconSize", themeable: true },

		/**
		 * Position property.
		 *
		 * Values: Left, Right. When "left", item is displayed in the "shortcuts" container, when "right"
		 * the item is displayed in the "notifications" container.
		 */
		position: { init: "left", check: ["left", "right"] },

		/**
		 * Name property.
		 */
		name: { check: "String", apply: "_applyName" }
	},

	members: {

		/**
		 * Event handler for the pointer over event.
		 */
		_onPointerOver: function (e) {

			this.addState("hovered");
		},

		/**
		 * Event handler for the pointer out event.
		 */
		_onPointerOut: function (e) {

			this.removeState("hovered");
		},

		/**
		 * Applies the IconSize property.
		 */
		_applyIconSize: function (value, old) {

			var icon = this.getChildControl("icon");

			if (value && value.width && value.height) {
				icon.setWidth(value.width);
				icon.setHeight(value.height);
				icon.getContentElement().setStyle("background-size", value.width + "px " + value.height + "px");
			}
			else {
				icon.resetWidth();
				icon.resetHeight();
				icon.getContentElement().setStyle("backgroundSize", "contain");
			}
		},

		/**
		 * Applies the name property.
		 */
		_applyName: function (value, old) {

			var el = this.getContentElement();
			if (el) {
				if (value)
					el.setAttribute("name", value, true);
				else
					el.removeAttribute("name", true);
			}
		},
	}

});


/**
 * wisej.web.DesktopTaskBarItemDateTime
 *
 * Represents a date/time widgets displayed on the TaskBar inside either
 * the "shortcuts" (left) or "notifications" (right) containers.
 *
 */
qx.Class.define("wisej.web.DesktopTaskBarItemDateTime", {

	extend: wisej.web.DesktopTaskBarItem,

	construct: function () {

		this.base(arguments);

		// start the timer when it becomes visible.
		this.addListenerOnce("appear", function () {

			this.__updateDateTime();

			if (!wisej.web.DesignMode)
				setInterval(this.__updateDateTime.bind(this), 1000 * 60);

		}, this);
	},
	members: {

		__updateDateTime: function () {

			var now = new Date();

			var time = "";
			var date = now.toLocaleDateString();
			try {
				time = now.toLocaleTimeString(navigator.language, { hour: "2-digit", minute: "2-digit" });
			} catch (er) {
				time = now.toLocaleTimeString();
			}
			this.setLabel("<center>" + time + "<br/>" + date + "</center>");
		}
	}

});


/**
 * wisej.web.DesktopTaskBarItemControl
 *
 * Wraps any widget and displays them in the TaskBar.
 *
 */
qx.Class.define("wisej.web.DesktopTaskBarItemControl", {

	extend: wisej.web.DesktopTaskBarItem,

	construct: function () {

		this.base(arguments);

		// never show the icon.
		this.setShow("label");

		// replace the layout to make the child widget fill this widget.
		this._getLayout().dispose();
		this._setLayout(new qx.ui.layout.Grow());
	},

	properties: {

		/**
		 * Control property.
		 *
		 * Reference to the widget to place inside the taskbar item.
		 */
		control: { init: null, nullable: true, apply: "_applyControl", transform: "_transformComponent" },
	},

	members: {

		/**
		 * Applies the control property.
		 */
		_applyControl: function (value, old) {

			if (old) {
				this._remove(old);
				this.resetPadding();
				old.removeListener("resize", this._onControlResize, this);
			}

			if (value) {
				// the wrapped widget should always fill this item.
				var widget = value;
				widget.resetUserBounds();
				this._add(widget);

				this.setPadding(0);

				widget.addListener("resize", this._onControlResize, this);
			}
		},

		// handles the "resize" even on the wrapped control
		// to fire the event to the wrapper component on the server
		// and update the wrapped control's size.
		_onControlResize: function (e) {

			this.fireDataEvent("controlResize", e.getData());
		},

	}

})


/**
 * wisej.web.desktop.TaskBar
 *
 * Child control of wisej.web.Desktop.
 */
qx.Class.define("wisej.web.desktop.TaskBar", {

	extend: qx.ui.container.Composite,

	include: [
		qx.ui.core.MRemoteChildrenHandling
	],

	properties: {

		/**
		 * Appearance key.
		 */
		appearance: { init: "taskbar", refine: true },

		/**
		 * Height
		 */
		height: { init: 48, refine: true },

		/**
		 * AutoHide property.
		 *
		 * Returns or sets whether the taskbar is hidden automatically when there are no
		 * opened windows or no windows with the property ShowInTaskbar set to true.
		 */
		autoHide: { init: false, check: "Boolean", apply: "_applyAutoHide", themeable: true },

		/**
		 * orientation property.
		 */
		orientation: { init: "horizontal", check: ["horizontal", "vertical"], apply: "_applyOrientation", event: "changeOrientation" },
	},

	/**
	 * @param owner {wisej.web.Desktop}
	 */
	construct: function (owner) {

		this.owner = owner;
		this.base(arguments, new qx.ui.layout.HBox);

		this._createChildControl("items");

		// listen to changes to notify the parent.
		this.addListener("changeVisibility", this.__onChangeVisibility, this);

		// rightToLeft support.
		this.addListener("changeRtl", this._onRtlChange, this);
	},

	members: {

		// the owner wisej.web.Desktop instance.
		owner: null,

		/**
		 * Adds a window to the taskbar.
		 */
		addWindow: function ($window) {

			this.__createWindowItem($window);

			if (this.isAutoHide())
				this.updateVisibility();
		},

		/**
		 * Removes the window from the taskbar.
		 */
		removeWindow: function ($window) {

			var children = this.getChildren();
			for (var i = 0; i < children.length; i++) {
				if (children[i].window == $window) {
					children[i].destroy();
					break;
				}
			}

			if (this.isAutoHide())
				this.updateVisibility();
		},

		/**
		 * Applies the autoHide property.
		 */
		_applyAutoHide: function (value, old) {

			this.updateVisibility();
		},

		/**
		 * Applies the orientation property.
		 */
		_applyOrientation: function (value, old) {

			var items = this.getChildControl("items");
			var shortcuts = this.getChildControl("shortcuts");
			var notifications = this.getChildControl("notifications");

			this.getLayout().dispose();
			shortcuts.getLayout().dispose();
			notifications.getLayout().dispose();

			items.setOrientation(value);

			if (value == "vertical") {
				this.setLayout(new qx.ui.layout.VBox);
				shortcuts.setLayout(new qx.ui.layout.VBox);
				notifications.setLayout(new qx.ui.layout.VBox);
			}
			else {
				this.setLayout(new qx.ui.layout.HBox);
				shortcuts.setLayout(new qx.ui.layout.HBox);
				notifications.setLayout(new qx.ui.layout.HBox);
			}

			this.addState(value);
			this.removeState(old);
			shortcuts.addState(value);
			shortcuts.removeState(old);
			notifications.addState(value);
			notifications.removeState(old);
		},

		// shows or hides the taskbar when there are no visible items.
		updateVisibility: function () {

			qx.ui.core.queue.Widget.add(this, "updateVisibility");
		},

		__updateVisibility: function () {

			if (!this.isAutoHide()) {
				this.show();
				return;
			}

			var items = this.getChildControl("items").getChildren();
			var shortcuts = this.getChildControl("shortcuts").getChildren();
			var notifications = this.getChildControl("notifications").getChildren();

			var anyVisible = false;
			var allItems = items.concat(shortcuts, notifications);
			for (var i = 0; i < allItems.length; i++) {

				var item = allItems[i];
				if (item.isVisible()) {
					anyVisible = true;
					break;
				}
			}

			if (anyVisible)
				this.show();
			else
				this.exclude();
		},

		syncWidget: function (jobs) {

			this.base(arguments, jobs);

			if (!jobs)
				return;

			if (jobs["updateVisibility"]) {
				this.__updateVisibility();
			}
		},

		/**
		 * Creates a taskbar item linked to the window.
		 */
		__createWindowItem: function ($window) {

			var item = new wisej.web.desktop.TaskBarItem(this, $window);
			item.addState(this.getOrientation());
			this.add(item);
		},

		/**
		   * Returns the widget which contains the children and
		   * is relevant for laying them out. This is from the user point of
		   * view and may not be identical to the technical structure.
		   *
		   * @return {qx.ui.core.Widget} Widget which contains the children.
		   */
		getChildrenContainer: function () {

			return this.getChildControl("items");
		},

		/**
		 * Handles visibility changed.
		 */
		__onChangeVisibility: function (e) {

			// notify the parent Desktop widget.
			this.owner.fireEvent(e.getData() == "visible" ? "taskbarShown" : "taskbarHidden");
		},

		// Listens to "changeRtl" to mirror the taskbar items.
		_onRtlChange: function (e) {

			if (e.getData() === e.getOldData())
				return;

			var rtl = e.getData();
			if (rtl != null) {
				this._mirrorChildren(rtl);

				var items = this.getChildControl("items");
				var shortcuts = this.getChildControl("shortcuts");
				var notifications = this.getChildControl("notifications");
				items.setRtlLayout(rtl);
				shortcuts._mirrorChildren(rtl);
				notifications._mirrorChildren(rtl);
			}
		},

		/**
		 * Create child components.
		 */
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "items":
					control = new qx.ui.container.SlideBar();
					this._addAt(control, 1, { flex: 1 });
					break;

				case "shortcuts":
					control = new qx.ui.container.Composite(new qx.ui.layout.HBox());
					this._addAt(control, 0);
					break;

				case "notifications":
					control = new qx.ui.container.Composite(new qx.ui.layout.HBox());
					this._addAt(control, 2);
					break;
			}

			return control || this.base(arguments, id);
		},

	}

});


/**
 * wisej.web.desktop.TaskBarItem
 */
qx.Class.define("wisej.web.desktop.TaskBarItem", {

	extend: qx.ui.form.Button,

	properties: {

		/**
		 * Appearance key.
		 */
		appearance: { init: "desktop-taskbar-item", refine: true },

	},

	construct: function (taskbar, $window) {

		this.window = $window;
		this.taskbar = taskbar;

		this.base(arguments,
			this.window.getCaption(),
			this.window.getLargeIcon() || this.window.getIcon() || "window-icon");

		this.setShow("icon");
		this.setCenter(true);
		this.addListener("execute", this._onExecute);
		this.window.addListener("close", this._onWindowClose, this);
		this.window.addListener("disappear", this._onWindowDisappear, this);
		this.window.addListener("changeIcon", this._onWindowChangeIcon, this);
		this.window.addListener("changeLargeIcon", this._onWindowChangeLargeIcon, this);

		// set the "name" to the name of the related window for QA automation.
		this.getContentElement().setAttribute("name", $window.getName());

		// show in taskbar only when:
		// - minimize, or
		// - showInTaskbar is true, and it's visible
		this.exclude();

		if (this.window.getWindowState() == "minimized") {
			this.show();
		}
		else if (this.window.getShowInTaskbar()) {

			if (this.window.isVisible())
				this.show();
			else
				this.window.addListener("appear", this._onWindowAppear, this);
		}
	},

	members: {

		/**
		 * Shows the corresponding preview window.
		 */
		showPreview: function () {

			this._getPreviewInstance().show(this, this.window);
		},

		/**
		 * Hides the corresponding preview window.
		 */
		hidePreview: function () {

			this._getPreviewInstance().hide();

		},

		/**
		 * Normalize or minimize the attached window.
		 */
		_onExecute: function (e) {

			e.stopPropagation();

			if (this.window.isModal())
				return;

			if (this.window.getWindowState() == "minimized") {
				this.window.restore();
				this.window.setActive(true);
			}
			else {
				this.window.setActive(true);
			}
		},

		/**
		 * Shows the window preview.
		 */
		_onPointerOver: function (e) {

			this.base(arguments, e);

			this.showPreview();

		},

		/**
		 * Hides the window preview.
		 */
		_onPointerOut: function (e) {

			this.base(arguments, e);

			this.hidePreview();
		},

		/**
		 * Removes the taskbar item when the window is closed.
		 */
		_onWindowClose: function (e) {

			this.destroy();

			this.hidePreview();
		},

		/**
		 * Updates the taskbar item when the window is hidden.
		 */
		_onWindowDisappear: function (e) {

			if (this.window.getWindowState() == "minimized") {

				if (this.window.getShowInTaskbar()) {
					this.show();
					this.addState("minimized");
				}
			}
			else {

				this.exclude();

				// listen for the window to reappear to show the taskbar item again.
				this.window.addListener("appear", this._onWindowAppear, this);

				// update the parent taskbar in case it should be hidden.
				this.taskbar.updateVisibility();
			}
		},

		/**
		 * Shows the taskbar item when the bound window re-appears.
		 */
		_onWindowAppear: function (e) {

			this.window.removeListener("appear", this._onWindowAppear, this);

			if (this.window.getShowInTaskbar()) {

				this.show();

				if (this.window.getWindowState() == "minimized")
					this.addState("minimized");
				else
					this.removeState("minimized");

				// update the parent taskbar in case it should be hidden.
				this.taskbar.updateVisibility();
			}

		},

		/**
		 * Updates the desktop item's icon when the related window changes its icon.
		 */
		_onWindowChangeIcon: function (e) {
			this.setIcon(e.getData() || "window-icon");
		},

		/**
		 * Updates the desktop item's icon when the related window changes its large icon.
		 */
		_onWindowChangeLargeIcon: function (e) {
			this.setIcon(e.getData() || "window-icon");
		},

		/**
		 * Returns the singleton preview widget.
		 */
		_getPreviewInstance: function () {

			return wisej.web.desktop.TaskbarPreview.getInstance();

		},
	},

	destruct: function () {

		this.window.removeListener("close", this._onWindowClose, this);
		this.window.removeListener("appear", this._onWindowAppear, this);
		this.window.removeListener("disappear", this._onWindowDisappear, this);
		this.window.removeListener("changeIcon", this._onWindowChangeIcon, this);
		this.window.removeListener("changeLargeIcon", this._onWindowChangeLargeIcon, this);

	},

});


/**
 * wisej.web.desktop.TaskbarPreview
 *
 * Implements the thumbnail preview of the related window.
 *
 * An instance of this widget is created as a singleton: there can only
 * be one visible widget at any given time. When the user moves the mouse over 
 * a difference task bar item, this widget is moved and updated with the
 * preview of the selected window.
 */
qx.Class.define("wisej.web.desktop.TaskbarPreview", {

	type: "singleton",
	extend: qx.ui.container.Composite,

	construct: function () {

		//  prepare the layout.
		var layout = new qx.ui.layout.Grid();
		layout.setRowFlex(1, 1);
		layout.setColumnFlex(0, 1);

		this.base(arguments, layout);

		// force the creation of the child component.
		this._createChildControl("title");
		this._createChildControl("close");
		this._createChildControl("preview");

		// attach events.
		this.addListener("tap", this.__onTap);
		this.addListener("pointerover", this.__onPointerOver);
		this.addListener("pointerout", this.__onPointerOut);

		// start hidden
		this.setVisibility("hidden");

		// save the preview item preferred size.
		this.__preferredSize = this.getSizeHint();

		// the preview widget is added at the root level to overlap other widgets.
		var root = qx.core.Init.getApplication().getRoot();
		root.add(this);

		// make it overlap the workspace.
		this.setZIndex(11);
	},

	properties: {

		/**
		 * Appearance key.
		 */
		appearance: { init: "desktop-taskbar-preview", refine: true },

		/**
		 * The <code>LayoutItem</code>'s preferred width.
		 *
		 * The computed width may differ from the given width due to
		 * stretching. Also take a look at the related properties
		 * {@link #minWidth} and {@link #maxWidth}.
		 */
		width: { init: 240, refine: true },

		/**
		 * The item's preferred height.
		 *
		 * The computed height may differ from the given height due to
		 * stretching. Also take a look at the related properties
		 * {@link #minHeight} and {@link #maxHeight}.
		 */
		height: { init: 200, refine: true },

		/**
		 * The delay before showing the preview window.
		 */
		showDelay: { init: 250, check: "Integer", themeable: true },

		/**
		 * The delay before hiding the preview window.
		 */
		hideDelay: { init: 250, check: "Integer", themeable: true },

		/**
		 * The margin between the preview window and the preview item.
		 */
		margin: { init: 20, check: "Integer", themeable: true },

		/**
		 * TaskbarPosition property.
		 *
		 * Returns or sets the docking position of the taskbar.
		 */
		taskbarPosition: { init: "bottom", check: ["left", "top", "right", "bottom"] },
	},

	members: {

		// window being shown in this thumbnail preview.
		__window: null,

		// taskbar item linked to this thumbnail preview.
		__taskbarItem: null,

		// timer IDs.
		__hideTimerId: 0,
		__showTimerId: 0,

		// mouse state flags.
		__isMouseOver: false,
		__isMouseOverClose: false,

		// preview item preferred size.
		__preferredSize: null,

		/**
		 * Updates the preview window when it is shown.
		 */
		show: function (taskbarItem, window) {

			this.__window = window;
			this.__taskbarItem = taskbarItem;

			// hide/show the close button to match the window.
			window.getShowClose()
				? this._showChildControl("close")
				: this._excludeChildControl("close");

			// start the show timer if the preview is not already
			// visible. otherwise simply update the preview.

			this.__clearTimers();

			if (!this.isVisible()) {
				var me = this;
				this.__showTimerId = setTimeout(function () {
					me.__showPreview();
				},
				this.getShowDelay());
			}
			else {
				this.__showPreview();
			}
		},

		/**
		 * Hides the preview window unless the mouse is over it.
		 */
		hide: function () {

			this.__clearTimers();

			// start the hide timer.
			var me = this;
			this.__hideTimerId = setTimeout(function () {

				// cannot hide if the mouse is over the preview.
				if (me.__isMouseOver || me.__isMouseOverClose)
					return;

				me.setVisibility("hidden");

				var preview = me.getChildControl("preview");
				var previewDom = preview.getContentElement().getDomElement();
				if (previewDom)
					previewDom.innerHTML = "";
			},
			this.getHideDelay());
		},

		__clearTimers: function () {

			if (this.__hideTimerId)
				clearTimeout(this.__hideTimerId);

			if (this.__showTimerId)
				clearTimeout(this.__showTimerId);

			this.__hideTimerId = 0;
			this.__showTimerId = 0;
		},

		/**
		 * Restores the window.
		 */
		__onTap: function (e) {

			var window = this.__window;

			if (window.isModal())
				return;

			if (window.getWindowState() == "minimized") {
				window.restore();
				window.setActive(true);
			}
			else {
				window.setActive(true);
			}
		},

		/**
		 * Shows the window preview.
		 */
		__onPointerOver: function (e) {

			this.addState("hovered");

			if (e.getTarget() == this.getChildControl("close"))
				this.__isMouseOverClose = true;
			else
				this.__isMouseOver = true;
		},

		/**
		 * Hides the window preview.
		 */
		__onPointerOut: function (e) {

			if (e.getTarget() == this.getChildControl("close")) {
				this.__isMouseOverClose = false;
			}
			else {
				this.__isMouseOver = false;

				this.hide();
				this.removeState("hovered");
			}
		},

		/**
		 * Close the associated window when the close button is pressed.
		 */
		__onClose: function (e) {

			this.__isMouseOver = false;
			this.__isMouseOverClose = false;

			if (this.__window) {

				if (!wisej.web.DesignMode) {
					// ensure that the window to close is not under a modal window.
					var activeWindow = Wisej.Platform.getActiveWindow();
					if (activeWindow && activeWindow != this.__window && activeWindow.isModal())
						return;
				}

				this.__window.close();
				this.setVisibility("hidden");
			}

		},

		__showPreview: function () {

			var maxWidth = window.innerWidth;
			var maxHeight = window.innerHeight;

			var $window = this.__window;
			var taskbarItem = this.__taskbarItem;

			if (!$window || !taskbarItem)
				return;

			// update the title bar.
			var title = this.getChildControl("title");
			title.setLabel($window.getCaption());
			title.setIcon($window.getIcon() || "window-icon");

			// update the preview window.
			var preferredSize = this.__preferredSize;
			this.setWidth(preferredSize.width);
			this.setHeight(preferredSize.height);
			qx.ui.core.queue.Manager.flush();

			// retrieve the dom for the preview target widget.
			var preview = this.getChildControl("preview");
			var previewDom = wisej.utils.Widget.ensureDomElement(preview);
			var previewSize = preview.getBounds();

			// retrieve the dom for the source widget.
			var sourceDom = $window.getContentElement().getDomElement();
			if (!sourceDom)
				return;

			this.setVisibility("visible");

			// adjust the size of the window preview host.
			var windowBounds = $window.getBounds();
			if (windowBounds.width > windowBounds.height) {
				ratio = previewSize.width / windowBounds.width;
				var gap = previewSize.height - windowBounds.height * ratio;
				this.setHeight(preferredSize.height - gap);
			}
			else {
				ratio = previewSize.height / windowBounds.height;
				var gap = previewSize.width - windowBounds.width * ratio;
				this.setWidth(preferredSize.width - gap);
			}
			qx.ui.core.queue.Manager.flush();

			// create the thumbnail. reuse the last save thumbnail
			// if the window is hidden (minimized).
			var thumbnail = wisej.utils.Widget.makeThumbnail($window, previewSize, "fit");

			// update the inner dom to show the preview window and add
			// a blocker element on top to prevent clicks inside the thumbnail.
			previewDom.innerHTML = "";
			previewDom.appendChild(thumbnail);
			previewDom.appendChild(qx.dom.Element.create("div", {
				style: "width:100%;height:100%;position:absolute"
			}));

			// set the location of this preview window.
			var pos = { y: 0, x: 0 };
			var myBounds = this.getBounds();
			var itemRect = taskbarItem.getContentLocation();

			switch (this.getTaskbarPosition()) {
				case "top":
					pos.y = itemRect.bottom + this.getMargin();
					pos.x = itemRect.left - Math.round(((myBounds.width - (itemRect.right - itemRect.left)) / 2));
					pos.x = Math.max(0, pos.x);
					if (pos.x + myBounds.width > maxWidth)
						pos.x = maxWidth - myBounds.width;
					break;

				case "left":
					pos.y = itemRect.top;
					pos.x = itemRect.right + this.getMargin();
					if (pos.y + myBounds.height > maxHeight)
						pos.y = maxHeight - myBounds.height;
					break;

				case "right":
					pos.y = itemRect.top;
					pos.x = itemRect.left - this.getMargin() - myBounds.width;
					if (pos.y + myBounds.height > maxHeight)
						pos.y = maxHeight - myBounds.height;
					break;

				case "bottom":
				default:
					pos.y = itemRect.top - myBounds.height - this.getMargin();
					pos.x = itemRect.left - Math.round(((myBounds.width - (itemRect.right - itemRect.left)) / 2));
					pos.x = Math.max(0, pos.x);
					if (pos.x + myBounds.width > maxWidth)
						pos.x = maxWidth - myBounds.width;
					break;
			}
			this.setLayoutProperties({ left: pos.x, top: pos.y });
		},

		/**
		 * Create child components.
		 */
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "title":
					control = new qx.ui.basic.Atom().set({
						iconPosition: "left",
						anonymous: true
					});
					this._add(control, { row: 0, column: 0 });
					break;

				case "close":
					control = new qx.ui.form.Button().set({
						show: "icon"
					});
					control.setThemedIcon("icon-close");

					control.addListener("execute", this.__onClose, this);
					control.addListener("pointerover", this.__onPointerOver, this);
					control.addListener("pointerout", this.__onPointerOut, this);

					this._add(control, { row: 0, column: 1 });
					break;

				case "preview":
					control = new qx.ui.core.Widget().set({
						anonymous: true
					});
					this._add(control, { row: 1, column: 0, colSpan: 2 });
					break;
			}

			return control || this.base(arguments, id);
		},

	}

});


/**
 * wisej.web.desktop.Workspace
 *
 * Child control of wisej.web.Desktop.
 */
qx.Class.define("wisej.web.desktop.Workspace", {

	extend: qx.ui.window.Desktop,

	properties: {

		/**
		 * Appearance key.
		 */
		appearance: { init: "workspace", refine: true }

	},

	construct: function (owner, manager) {

		this.owner = owner;
		this.base(arguments, manager);

	},

	members: {

		/**
		 * Create the taskbar item when a new child window is created.
		 */
		_afterAddChild: function (child) {

			if (child instanceof wisej.web.Form) {
				var taskbar = this.owner.getChildControl("taskbar");
				if (taskbar) {
					taskbar.addWindow(child);
				}
			}

			this.base(arguments, child);
		},

		/**
		 * Remove the taskbar item when a new child window is created.
		 */
		_afterRemoveChild: function (child) {

			this.base(arguments, child);

			if (child instanceof wisej.web.Form) {
				var taskbar = this.owner.getChildControl("taskbar");
				if (taskbar)
					taskbar.removeWindow(child);
			}
		}
	}
});

