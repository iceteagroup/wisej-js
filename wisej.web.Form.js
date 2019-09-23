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
 * wisej.web.Form
 */
qx.Class.define("wisej.web.Form", {

	extend: qx.ui.window.Window,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MAccelerators
	],

	construct: function (title) {

		this.base(arguments, title);

		// add local state properties.
		this.setStateProperties(this.getStateProperties().concat(["scrollX", "scrollY"]));

		// prevent the form from closing automatically, it must be processed by the server
		// to be able to cancel closing.
		this.addListener("beforeClose", this.__onBeforeClose);

		// listen to change of window states.
		this.addListener("restore", this._onRestore);
		this.addListener("minimize", this._onMinimize);
		this.addListener("maximize", this._onMaximize);

		// update the scroll position properties.
		this.__scroller = this.getChildControl("pane");

		// listen to changes of the allowMove property to disable the move cursor.
		this.addListener("changeAllowMove", this.__onChangeAllowMove, this);

		// block "contextmenu" from bubbling up to the Page or Desktop.
		this.addListener("longtap", function (e) { e.stopPropagation(); }, this);
		this.addListener("contextmenu", function (e) { e.stopPropagation(); }, this);
	},

	events: {

		/** 
		 * Fired on scrollbar movements.
		 *
		 * The event data object is: {x, y, type, old}.
		 */
		scroll: "qx.event.type.Data",

		/**
		 * Fired when the windowState property changes.
		 *
		 * The event data object is the new windowState value.
		 */
		windowStateChanged: "qx.event.type.Data"
	},

	properties: {

		/**
		 * ShowCaption flag.
		 *
		 * The header (title bar) is removed when this property is set to false.
		 */
		showCaption: { init: true, check: "Boolean", apply: "_applyShowCaption" },

		/**
		  * Enables the automatic scrolling of the content.
		  */
		autoScroll: { init: false, check: "Boolean", apply: "_applyAutoScroll" },

		/**
		  * Shows the window as a taskbar item.
		  */
		showInTaskbar: { init: true, check: "Boolean" },

		/**
		  * The alternative large icon to the caption icon.
		  * It's mainly used by the taskbar items.
		  */
		largeIcon: { init: null, check: "String", nullable: true, themeable: true },

		/**
		 * Sets the margin for the autoscroll area.
		 */
		autoScrollMargin: { init: null, check: "Map", apply: "_applyAutoScrollMargin" },

		/**
		 * Sets the minimum size for the autoscroll area.
		 */
		autoScrollMinSize: { init: null, check: "Map", apply: "_applyAutoScrollMinSize" },

		/**
		 * ScrollX property.
		 *
		 * This property is defined using the getter/setter methods.
		 */

		/**
		 * ScrollPositionY property.
		 *
		 * This property is defined using the getter/setter methods.
		 */

		/**
		 * Determines which scrollbars should be visible: 0 = None, 1 = Horizontal, 2 = Vertical, 3 = Both, 4 = Hidden.
		 */
		scrollBars: { init: 3, check: "PositiveInteger", apply: "_applyScrollBars" },

		/**
		 * borderStyle property.
		 */
		borderStyle: { init: "sizable", check: ["none", "fixed", "sizable", "fixedToolWindow", "sizableToolWindow"], apply: "_applyBorderStyle", nullable: true },

		/**
		 * The state of the window.
		 *
		 *	Values: normal, minimized, maximized
		 *
		 * Property defined with the setter/getter methods.
		 */
		// windowState: { init: null, check: "String", apply: "_applyWindowState" },

		/**
		 * Initial location of the window.
		 *
		 *	Values: manual, defaultLocation, centerScreen, centerParent.
		 */
		startLocation: { init: null, check: ["manual", "defaultLocation", "centerScreen", "centerParent"], apply: "_applyStartLocation" },

		/**
		 * Animation style.
		 *
		 * Values: "None", "Jelly", "Splat", "Swoosh", "Smack", "Fold", "RoadRunner", "Bounce".
		 */
		animation: { init: null, check: "String", themeable: true, nullable: true, apply: "_applyAnimation" },

		/**
		 * MainMenu property.
		 *
		 * Assigns the main menu bar.
		 */
		mainMenu: { init: null, nullable: true, apply: "_applyMainMenu", transform: "_transformComponent" },

		/**
		 * AcceptButton property.
		 *
		 * The button that is clicked when the user presses Enter.
		 */
		acceptButton: { init: null, nullable: true, apply: "_applyAcceptButton", transform: "_transformComponent" },

		/**
		 * CancelButton property.
		 *
		 * The button that is clicked when the user presses Esc.
		 */
		cancelButton: { init: null, nullable: true, apply: "_applyCancelButton", transform: "_transformComponent" },

		/**
		 * HeaderBackgroundColor property.
		 *
		 * Changes the background color of the caption bar.
		 */
		headerBackgroundColor: { init: null, check: "Color", apply: "_applyHeaderBackgroundColor" },

		/**
		 * HeaderTextColor property.
		 *
		 * Changes the text color of the caption bar.
		 */
		headerTextColor: { init: null, check: "Color", apply: "_applyHeaderTextColor" },

		/**
		 * Tools property.
		 *
		 * Collection of tool definitions to display on the caption bar.
		 */
		tools: { check: "Array", apply: "_applyTools" },

		/**
		 * ContentEnabled property.
		 *
		 * Enables or disables the content of the window. Otherwise a disabled
		 * window cannot be moved, activated or resized.
		 */
		contentEnabled: { init: true, check: "Boolean", apply: "_applyContentEnabled" },

		/**
		 * mdiChild property.
		 *
		 * Indicates whether the form is an mdi child.
		 */
		mdiChild: { init: false, check: "Boolean" },

		/**
		 * mdiClient property.
		 *
		 * Represents the internal container for the mdi children.
		 */
		mdiClient: { init: null, nullable: true, check: "wisej.web.MdiClient", transform: "_transformComponent" }
	},

	members: {

		/**
		 * Window marker.
		 */
		isWindow: true,

		/**
		 * Container marker.
		 */
		isWisejContainer: true,

		// reference to the inner scroller panel.
		__scroller: null,

		// stored previous scroll positions, used in __fireScrollEvent.
		__oldScrollX: 0,
		__oldScrollY: 0,

		/**
		 * Closes the current window instance.
		 * Overridden to close hidden windows.
		 */
		close: function () {

			this.fireNonBubblingEvent("beforeClose", qx.event.type.Event, [false, true]);

		},

		/**
		 * Overridden to fire the "close" event when the
		 * form is destroyed.
		 */
		destroy: function () {

			if (this.fireEvent("close")) {
				this.base(arguments);
			}

		},

		/**
		 * Applies the background color to the client area.
		 */
		_applyBackgroundColor: function (value, old) {

			this.__scroller.setBackgroundColor(value);
		},

		/**
		 * Applies the headerBackgroundColor property.
		 */
		_applyHeaderBackgroundColor: function (value, old) {

			var captionBar = this.getChildControl("captionbar");

			if (value) {
				captionBar.setBackgroundColor(value);
				var colorMgr = qx.theme.manager.Color.getInstance();
				this.getContentElement().setStyle("borderColor", colorMgr.resolve(value));
			}
			else {
				captionBar.resetBackgroundColor();
				this.getContentElement().setStyle("borderColor", null);
			}

		},

		/**
		 * Applies the headerTextColor property.
		 */
		_applyHeaderTextColor: function (value, old) {

			var title = this.getChildControl("title");
			var captionBar = this.getChildControl("captionbar");

			if (value) {
				title.setTextColor(value);
				captionBar.setTextColor(value);
			}
			else {
				title.resetTextColor();
				captionBar.resetTextColor();
			}
		},

		/**
		 * Applies the animation property.
		 */
		_applyAnimation: function (value, old) {

			if (wisej.web.DesignMode)
				return;

			if (value != null && value.toLowerCase() != "none")
				wisej.web.Animations.register(this);
			else
				wisej.web.Animations.unregister(this);

		},

		/** 
		 * Applies the tools property.
		 */
		_applyTools: function (value, old) {

			if (value == null)
				return;

			if (value.length == 0 && (old == null || old.length == 0))
				return;

			var captionBar = this.getChildControl("captionbar");

			// make room for the tool container the first time this property is set.
			if (old == null) {
				var layout = captionBar.getLayout();
				layout.setColumnFlex(1, 0);
				layout.setColumnFlex(2, 1);

				this.getChildControl("close-button").setLayoutProperties({ row: 0, column: 7 });
				this.getChildControl("maximize-button").setLayoutProperties({ row: 0, column: 6 });
				this.getChildControl("restore-button").setLayoutProperties({ row: 0, column: 5 });
				this.getChildControl("minimize-button").setLayoutProperties({ row: 0, column: 4 });
				this.getChildControl("title").setLayoutProperties({ row: 0, column: 2 });
				this._updateCaptionBar();
			}

			wisej.web.ToolContainer.install(this, captionBar, value, "left", { row: 0, column: 1 }, undefined, "caption");
			wisej.web.ToolContainer.install(this, captionBar, value, "right", { row: 0, column: 3 }, undefined, "caption");
		},

		/**
		 * Applies the showCaption property.
		 * 
		 * Shows/hides the caption bar widget.
		 */
		_applyShowCaption: function (value, old) {

			this.getChildControl("captionbar").setVisibility(value ? "visible" : "excluded");

		},

		/**
		 * Getter/setter for the windowState property.
		 */
		getWindowState: function () {

			return this.__windowState;
		},
		setWindowState: function (value) {

			if (value != this.__windowState) {

				this.__windowState =
					this.__restoreWindowState = value;

				// window state works only for top level windows.
				if (!this.isTopLevel())
					return;

				switch (value) {
					case "normal":
						this.show();
						break;

					case "minimized":
						this.exclude();
						break;

					case "maximized":
						this.maximize();
						break;
				}
				this.fireDataEvent("windowStateChanged", this.__windowState);
			}
		},
		__windowState: "normal",
		__restoreWindowState: "normal",

		_onRestore: function (e) {
			this.__windowState = "normal";
			this.__restoreWindowState = null;
			this.fireDataEvent("windowStateChanged", this.__windowState);
		},
		_onMinimize: function (e) {
			this.__restoreWindowState = this.__windowState;
			this.__windowState = "minimized";
			this.fireDataEvent("windowStateChanged", this.__windowState);
		},
		_onMaximize: function (e) {
			this.__windowState = "maximized";
			this.__restoreWindowState = null;
			this.fireDataEvent("windowStateChanged", this.__windowState);
		},

		// overridden.
		// restores the window to the previous state, either maximized or normal.
		restore: function () {

			switch (this.__restoreWindowState) {
				case "maximized":
					this.maximize();
					break;

				case "normal":
					this.base(arguments);
					break;

				default:
					this.base(arguments);
					break;
			}
		},

		/**
		 * Applies the startLocation property.
		 */
		_applyStartLocation: function (value, old) {

			switch (value) {

				case "manual":
					break;

				case "defaultLocation":

					if (this.getContentElement().getDomElement() == null) {
						// update the default location when the window is
						// actually shown, otherwise we can't get the correct
						// caption height since the theme has not been applied yet.
						this.addListenerOnce("appear", function (e) {

							this._applyStartLocation(this.getStartLocation());

						}, this);
					}
					else {

						var defaultLoc = this._getDefaultLocation();
						if (this.isMaximized()) {
							this.__restoredLeft = defaultLoc.x;
							this.__restoredTop = defaultLoc.y;
						}
						else {
							this.setX(defaultLoc.x);
							this.setY(defaultLoc.y);
						}
					}
					break;

				case "centerScreen":
				case "centerParent":
					this.center();
					break;
			}
		},

		/**
		 * Applies the autoScroll property.
		 */
		_applyAutoScroll: function (value, old) {

			var scroller = this.__scroller;

			if (value) {
				var scrollBars = this.getScrollBars();
				if (scrollBars === 4 /*hide*/) {
					scroller.setScrollbarY("hide");
					scroller.setScrollbarX("hide");
				}
				else {
					scroller.setScrollbarY((scrollBars & wisej.web.ScrollableControl.VERTICAL_SCROLLBAR) ? "auto" : "off");
					scroller.setScrollbarX((scrollBars & wisej.web.ScrollableControl.HORIZONTAL_SCROLLBAR) ? "auto" : "off");
				}
			}
			else {
				scroller.setScrollbarX("off");
				scroller.setScrollbarY("off");
			}
		},

		// overridden to return true when
		// the mdi child is selected and the
		// mdi parent is active.
		isActive: function () {

			if (this.isMdiChild()) {
				var mdiParent = this.getMdiParent();
				if (mdiParent)
					return mdiParent.getActive() && mdiParent.getActiveMdiChild() === this;
			}

			return this.getActive();
		},

		/**
		 * Returns the MdiParent.
		 */
		getMdiParent: function () {

			if (this.isMdiChild()) {
				return this.getTopLevelContainer();
			}

			return null;
		},

		/**
		 * Returns the active MdiChild form.
		 */
		getActiveMdiChild: function () {
			var mdiClient = this.getMdiClient();
			return mdiClient ? mdiClient.getActiveMdiChild() : null;
		},

		/**
		 * Returns the list of all the MdiChild forms.
		 */
		getMdiChildren: function () {
			var mdiClient = this.getMdiClient();
			return mdiClient ? mdiClient.getMdiChildren() : [];
		},

		// overridden to fire the new qualified
		// events: activated and deactivated.
		_applyActive: function (value, old) {

			this.base(arguments, value, old);

			if (this.isTopLevel())
				this.fireEvent(value ? "activated" : "deactivated");
		},

		/**
		 * Applies the autoScrollMargin property.
		 *
		 * @param {Size} value. It's a Size enum defines as {width, height}.
		 */
		_applyAutoScrollMargin: function (value, old) {

			var container = this.getChildrenContainer();
			container.setPadding([0, value.width, value.height, 0]);
		},

		/**
		 * Applies the autoScrollMinSize property.
		 *
		 * @param {Size} value. It's a Size enum defines as {width, height}.
		 */
		_applyAutoScrollMinSize: function (value, old) {

			if (value == null)
				return;

			var container = this.getChildrenContainer();
			container.setMinWidth(value.width);
			container.setMinHeight(value.height);
		},

		/**
		 * Applies the scrollX property.
		 */
		getScrollX: function () {

			return this.__scroller.getChildControl("scrollbar-x").getPosition();
		},
		setScrollX: function (value) {

			var me = this;
			setTimeout(function () {
				me.__scroller.getChildControl("scrollbar-x").setPosition(value);
			}, 1);
		},

		/**
		 * Applies the scrollY property.
		 */
		getScrollY: function () {

			return this.__scroller.getChildControl("scrollbar-y").getPosition();
		},
		setScrollY: function (value) {

			var me = this;
			setTimeout(function () {
				me.__scroller.getChildControl("scrollbar-y").setPosition(value);
			}, 1);
		},

		/**
		 * Applies the scrollBar property.
		 */
		_applyScrollBars: function (value, old) {

			if (this.isAutoScroll()) {
				var scroller = this.__scroller;
				if (value === 4 /*hide*/) {
					scroller.setScrollbarY("hide");
					scroller.setScrollbarX("hide");
				}
				else {
					scroller.setScrollbarY((value & wisej.web.ScrollableControl.VERTICAL_SCROLLBAR) ? "auto" : "off");
					scroller.setScrollbarX((value & wisej.web.ScrollableControl.HORIZONTAL_SCROLLBAR) ? "auto" : "off");
				}
			}
		},

		// overridden
		_applyContentEnabled: function (value, old) {

			this.getChildrenContainer().setEnabled(value);
		},

		/**
		 * Fires the scroll event when scrolling.
		 */
		_onScrollBarX: function (e) {

			this.__fireScrollEvent(e, false);
		},

		/**
		 * Fires the scroll event when scrolling.
		 */
		_onScrollBarY: function (e) {

			this.__fireScrollEvent(e, true);
		},

		__fireScrollEvent: function (e, vertical) {

			this.setDirty(true);

			var position = e.getData() | 0;
			var old = (vertical ? this.__oldScrollY : this.__oldScrollX) | 0;
			vertical ? this.__oldScrollY = position : this.__oldScrollX = position;

			if (position == old)
				return;

			var scrollContainer = e.getTarget();
			var scrollbar = vertical ? scrollContainer.getVerticalScrollbar() : scrollContainer.getHorizontalScrollbar();

			var data = {};
			data.old = old;
			data[vertical ? "scrollY" : "scrollX"] = position;
			data.type = position == 0 ? "first" : position == scrollbar.getMaximum() ? "last" : "step";

			this.fireDataEvent("scroll", data);
		},

		/**
		 * Applies the acceptButton property.
		 *
		 * Registers a capturing shortcut to process the keyDown
		 * event before any target widget and execute the acceptButton.
		 */
		_applyAcceptButton: function (value, old) {

			if (!value && old)
				this._disposeObjects("__acceptButtonAccel");

			if (value && !this.__acceptButtonAccel) {
				this.__acceptButtonAccel = new qx.bom.Shortcut("Enter", false, false, document.body);
				this.__acceptButtonAccel.addListener("execute", function (e) {

					var acceptButton = this.getAcceptButton();
					if (acceptButton != null && acceptButton.isSeeable()) {

						// ignore accelerators on widgets that are not
						// in an active top-level container: page, form, or desktop.
						if (!wisej.utils.Widget.canExecute(acceptButton))
							return;

						e.stop();
						acceptButton.execute();
					}

				}, this);
			}
		},
		__acceptButtonAccel: null,

		/**
		 * Applies the cancelButton property.
		 *
		 * Registers a capturing shortcut to process the keyDown
		 * event before any target widget and execute the cancelButton.
		 */
		_applyCancelButton: function (value, old) {

			if (!value && old) {
				this._disposeObjects("__cancelButtonAccel");
			}

			if (value && !this.__cancelButtonAccel) {
				this.__cancelButtonAccel = new qx.bom.Shortcut("Escape", false, false, document.body);
				this.__cancelButtonAccel.addListener("execute", function (e) {

					var cancelButton = this.getCancelButton();
					if (cancelButton != null && cancelButton.isSeeable()) {

						// ignore accelerators on widgets that are not
						// in an active top-level container: page, form, or desktop.
						if (!wisej.utils.Widget.canExecute(cancelButton))
							return;

						e.stop();
						cancelButton.execute();
					}

				}, this);
			}
		},
		__cancelButtonAccel: null,

		/**
		 * Applies the borderStyle property.
		 *
		 * The borderStyles is applied as a state to be able to
		 * theme the styles.
		 */
		_applyBorderStyle: function (value, old) {

			this.removeState("borderNone");
			this.removeState("borderFixed");
			this.removeState("borderSizable");
			this.removeState("borderFixedToolWindow");
			this.removeState("borderSizableToolWindow");

			if (value)
				this.addState("border" + qx.lang.String.firstUp(value));
		},

		// reference to the inner children container.
		__childrenContainer: null,

		/**
		 * The children container needed by the {@link qx.ui.core.MRemoteChildrenHandling}
		 * mixin
		 *
		 * @return {qx.ui.container.Composite} pane sub widget
		 */
		getChildrenContainer: function () {
			if (this.__childrenContainer == null)
				this.__childrenContainer = this.__scroller.getChildren()[0];

			return this.__childrenContainer;
		},

		/**
 		 * Returns the element, to which the content padding should be applied.
 		 *
 		 * @return {qx.ui.core.Widget} The content padding target.
		 */
		_getContentPaddingTarget: function () {
			return this.getChildrenContainer();
		},

		/**
		 * Overridden to create an inner scrollable pane.
		 */
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "captionbar":
					control = this.base(arguments, id, hash);
					// allow the captionbar to be used from dragging on android touch devices.
					control.getContentElement().setStyles({ "touch-action": "none", "-ms-touch-action": "none" });
					break;

				case "pane":
					control = new wisej.web.container.Scroll();
					var pane = control.getChildControl("pane");
					pane._getLayout().dispose();
					pane._setLayout(new qx.ui.layout.Basic());

					var clientArea = new qx.ui.container.Composite(new qx.ui.layout.Basic());
					clientArea.getContentElement().setStyles({
						"overflowX": "visible",
						"overflowY": "visible"
					});

					control.add(clientArea);
					this._add(control, { flex: 1 });

					control.addListener("resize", this._onScrollerResize, this);
					control.addListener("scrollX", this._onScrollBarX, this);
					control.addListener("scrollY", this._onScrollBarY, this);
					control.addListener("changeScrollbarXVisibility", this._onScrollerResize, this);
					control.addListener("changeScrollbarXVisibility", this._onScrollerResize, this);

					break;
			}

			return control || this.base(arguments, id);
		},

		_onScrollerResize: function (e) {

			// ensure that the client area always fills the container.
			// it's needed in case child controls are resizable or draggable.
			var pane = this.__scroller;
			var clientArea = this.getChildrenContainer();
			var minSize = this.getAutoScrollMinSize() || {};
			var size = wisej.utils.Widget.getClientSize(pane);
			clientArea.setMinWidth(Math.max(size.width, minSize.width || 0));
			clientArea.setMinHeight(Math.max(size.height, minSize.height || 0));

		},

		/**
		 * Handles the beforeClose event.
		 *
		 *	Prevents the form from closing automatically.
		 */
		__onBeforeClose: function (e) {
			e.preventDefault();
		},

		/**
		 * Handles the changeAllowMove event.
		 *
		 *	Turns off the move cursor on the captionbar.
		 */
		__onChangeAllowMove: function (e) {

			var captionBar = this.getChildControl("captionbar");
			if (e.getData())
				captionBar.resetCursor();
			else
				captionBar.setCursor("default");
		},

		/**
		 * _getDefaultLocation
		 *
		 *	Returns the default location for the form.
		 */
		_getDefaultLocation: function () {

			var captionBar = this.getChildControl("captionbar");
			var captionHeight = captionBar.getSizeHint().height || 32;

			var location = wisej.web.Form.$$defaultLocation;
			if (location == null)
				location = wisej.web.Form.$$defaultLocation = { x: 0, y: 0 };

			location.x += captionHeight;
			location.y += captionHeight;

			// reset to top if out of bounds.
			var formSize = this.getSizeHint();
			var screen = { width: window.innerWidth, height: window.innerHeight };
			if ((location.y + formSize.height) >= screen.height)
				location.y = 0;
			if ((location.x + formSize.width) >= screen.width)
				location.x = 0;

			return location;
		},

		/**
		 * Assigns the main menu bar to the form.
		 */
		_applyMainMenu: function (value, old) {

			// remove the previous main menu.
			if (old != null && this._indexOf(old) > -1)
				this._remove(old);

			if (value) {
				// insert the main menu before the content pane.
				var pane = this.__scroller;
				var index = this._indexOf(pane);
				this._addAt(value, index);
			}
		},
	},

	destruct: function () {

		this._disposeObjects("__acceptButtonAccel", "__cancelButtonAccel");
	}
});

/**
 * wisej.web.MdiClient
 */
qx.Class.define("wisej.web.MdiClient", {

	extend: wisej.web.Control,

	members: {
		/**
		 * Returns the active MdiChild form.
		 */
		getActiveMdiChild: function () {
			var tabs = this.__getTabContainer();
			if (tabs != null) {
				var active = tabs.getSelection()[0];
				if (active) {
					var form = active.getChildren()[0];
					if (form instanceof wisej.web.Form)
						return form;
				}
			}
			return null;
		},

		/**
		 * Returns the list of all the MdiChild forms.
		 */
		getMdiChildren: function () {
			var tabs = this.__getTabContainer();
			if (tabs != null) {
				var forms = [];
				var children = tabs.getChildren();
				for (var i = 0; i < children.length; i++) {
					var f = children[i].getChildren()[0];
					if (f instanceof wisej.web.Form)
						forms.push(f);
				}
				return forms;
			}
			return [];
		},

		// return the tab control that contains mdi children.
		__getTabContainer: function () {
			var children = this.getChildren();
			for (var i = 0; i < children.length; i++) {
				if (children[i] instanceof wisej.web.TabMdiView)
					return children[i];
			}
			return null;
		},
	}

});
