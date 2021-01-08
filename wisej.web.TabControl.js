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
 * wisej.web.TabControl
 */
qx.Class.define("wisej.web.TabControl", {

	extend: qx.ui.tabview.TabView,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	construct: function (orientation) {

		this.base(arguments, orientation);

		// the tab control needs the controls in the
		// order they are declared to display the tabs in 
		// the correct sequence.
		this.setReverseControls(false);

		this.initBorderStyle();

		// handle key presses to change the active tab using the keyboard.
		this.addListener("keypress", this._onKeyPress);

		// handle focus events to update the "focused" state.
		this.addListener("focus", this._updateFocusedButton);
		this.addListener("blur", this._updateFocusedButton);

		// add local state properties.
		this.setStateProperties(this.getStateProperties().concat(["scrollX", "scrollY"]));

		// handle scroll events to set the state dirty.
		this.__scrollPane = this.getChildControl("bar").getChildControl("scrollpane");
		this.__scrollPane.addListener("scrollX", function () { this.setDirty(true); }, this);
		this.__scrollPane.addListener("scrollY", function () { this.setDirty(true); }, this);

		// enable null selection for when all tabs are hidden.
		this.__radioGroup.setAllowEmptySelection(true);

		// update the tab pages metrics when the dom elements are finally created.
		this.addListenerOnce("appear", this._updateMetrics);
	},

	events: {

		/** 
		 * Fired when the selected tab changes.
		 */
		changeSelectedTab: "qx.event.type.Data",

		/** 
		 * Fired when the user shows a tab using the visibility menu.
		 */
		showTab: "qx.event.type.Data",

		/** 
		 * Fired when the user hides a tab using the visibility menu.
		 */
		hideTab: "qx.event.type.Data",
	},

	properties: {

		/**
		 * Alignment property.
		 */
		alignment: { init: "top", check: "String", apply: "_applyAlignment", themeable: true },

		/**
		 * SelectedTab property.
		 *
		 * Property defined with the setter/getter methods.
		 */
		// selectedTab: { init: null, check: "wisej.web.tabcontrol.TabPage", apply: "_applySelectedTab", event: "changeSelectedTab" },

		/**
		 * Orientation property.
		 *
		 * Sets the orientation of the tabs.
		 */
		orientation: { init: null, check: ["horizontal", "vertical"], apply: "_applyOrientation", themeable: true },

		/**
		 * Standard size of the tab button icons. If left to null, the original image size is used.
		 */
		iconSize: { init: null, nullable: true, apply: "_applyIconSize", themeable: true },

		/** 
		 * Determines whether the button displays the text only, the  icon only, or both.
		 */
		display: { check: ["both", "label", "icon"], init: "both", apply: "_applyDisplay" },

		/**
		 * Enables or disables the tooltips on the tab buttons.
		 */
		showToolTips: { init: true, check: "Boolean", apply: "_applyShowToolTips" },

		/**
		 * Sets the size of the tab buttons when sizeMode is set to "fixed".
		 */
		itemSize: { init: null, check: "Map", nullable: true, apply: "_applyItemSize", themeable: true },

		/**
		 * Specifies how the tab buttons should be sized.
		 */
		sizeMode: { init: "normal", check: ["normal", "fill", "fixed", "center"], apply: "_applySizeMode", themeable: true },

		/**
		 * Allows the use to change the position of the tab buttons by dragging them (chrome style).
		 */
		movableTabs: { init: false, check: "Boolean", apply: "_applyMovableTabs" },

		/**
		 * Shows a the tab pages visibility menu.
		 */
		showVisibilityMenu: { init: false, check: "Boolean", apply: "_applyShowVisibilityMenu" },

		/**
		 * Determines the number of pixels to scroll the tab buttons.
		 */
		scrollStep: { init: 15, check: "PositiveInteger", apply: "_applyScrollStep" }

	},

	members: {

		// overridden: forwarded states.
		_forwardStates: {
			borderNone: true,
			borderSolid: true,
			borderDashed: true,
			borderDotted: true,
			borderDouble: true,
			vertical: true,
			horizontal: true
		},

		// suspends sending some events back to the server.
		__suspendEvents: false,

		// tab buttons scroller.
		__scrollPane: null,

		/**
		 * getTabRects
		 *
		 * Returns an array containing the bounds for all the visible tabs.
		 */
		getTabRects: function () {

			// add the bounds of the tab-buttons container.
			var tabBar = this.getChildControl("bar");
			var tabScroller = tabBar.getChildControl("scrollpane");
			var tabBarBounds = tabBar.getBounds();
			var tabScrollerBounds = tabScroller.getBounds();

			var rects = [], bounds;
			var pages = this.getChildren();
			for (var i = 0; i < pages.length; i++) {

				bounds = pages[i].getButton().getBounds();

				if (!bounds) {

					// hidden tab.
					rects.push(null);
				}
				else {
					rects.push({
						top: bounds.top + tabBarBounds.top + tabScrollerBounds.top,
						left: bounds.left + tabBarBounds.left + tabScrollerBounds.left,
						width: bounds.width,
						height: bounds.height
					});
				}
			}

			return rects;
		},

		/**
		 * getTabRect
		 * 
		 * Returns  the bounding rectangle for the tab button of the tab page at the specified index.
		 * 
		 * @param index {Integer} Index of the tab page.
		 */
		getTabRect: function (index) {

			return this.getTabRects()[index];
		},

		/**
		 * getPageInsets
		 *
		 * Returns the insets for the content display pane.
		 * That is the distance on the four sides from the container.
		 */
		getPageInsets: function () {

			var insets = null;
			var rect = this.getBounds();
			if (rect) {

				var pane = this.getChildControl("pane");
				pane.syncAppearance();
				this.syncAppearance();

				var paneRect = pane.getBounds();
				var paneInsets = pane.getInsets();

				if (paneRect && paneInsets) {
					insets = {
						top: paneRect.top + paneInsets.top,
						left: paneRect.left + paneInsets.left,
						right: rect.width - paneRect.left - paneRect.width + paneInsets.right,
						bottom: rect.height - paneRect.top - paneRect.height + paneInsets.bottom
					};
				}
			}
			return insets;
		},

		/**
		 * getDesignMetrics
		 *
		 * Method used by the designer to retrieve metrics information about a widget in design mode.
		 */
		getDesignMetrics: function () {

			return {
				tabRects: this.getTabRects(),
				pageInsets: this.getPageInsets()
			};
		},

		/**
		 * Returns the horizontal scrolling position of the tab bar.
		 */
		getScrollX: function () {

			return this.__scrollPane.getScrollX();
		},

		/**
		 * Returns the vertical scrolling position of the tab bar.
		 */
		getScrollY: function () {

			return this.__scrollPane.getScrollY();
		},

		/**
		 * Applies the movableTabs property.
		 */
		_applyMovableTabs: function (value, old) {

			var button;
			var pages = this.getChildren();
			for (var i = 0; i < pages.length; i++) {
				button = pages[i].getButton();

				button.setMovable(value);
				if (value)
					button._activateMoveHandle(button);
			}
		},

		/**
		 * Applies the iconSize property.
		 *
		 * Updates all the tab pages.
		 */
		_applyIconSize: function (value, old) {

			var pages = this.getChildren();
			for (var i = 0; i < pages.length; i++)
				pages[i]._updateIconSize(value);
		},

		/**
		 * Applies the itemSize property.
		 * 
		 * When null, or when one of the dimensions is 0, uses the
		 * value from the theme.
		 */
		_applyItemSize: function (value, old) {

			// reset the cached button size hint.
			this.__buttonSizeHint = null;

			// schedule the updateLayout.
			qx.ui.core.queue.Widget.add(this, "updateLayout");
		},

		// returns the effective size of the tab button.
		getButtonSizeHint: function (value) {

			if (this.__buttonSizeHint)
				return this.__buttonSizeHint;

			var itemSize = this.getItemSize() || {};
			var buttonSize = { width: 0, height: 0 };
			var themeItemSize = qx.util.PropertyUtil.getThemeValue(this, "itemSize") || {};

			var sizeMode = this.getSizeMode();
			switch (this.getAlignment()) {
				case "left":
				case "right":
					{
						buttonSize.width = itemSize.height || themeItemSize.height;

						// ignore the height?
						if (sizeMode !== "fixed" && sizeMode !== "center")
							buttonSize.height = null;
						else
							buttonSize.height = itemSize.width || themeItemSize.width;
					}
					break;

				case "top":
				case "bottom":
				default:
					{
						buttonSize.height = itemSize.height || themeItemSize.height;

						// ignore the width?
						if (sizeMode !== "fixed" && sizeMode !== "center")
							buttonSize.width = null;
						else
							buttonSize.width = itemSize.width || themeItemSize.width;
					}
					break;
			}

			return this.__buttonSizeHint = buttonSize;
		},

		// suggested size of the tab button.
		__buttonSizeHint: null,

		/**
		 * Applies the sizeMode property.
		 */
		_applySizeMode: function (value, old) {

			// reset the cached button size hint.
			this.__buttonSizeHint = null;

			if (value == null) {
				this.resetSizeMode();
				return;
			}

			var layout = this.getChildControl("bar").getLayout();

			switch (value) {

				case "center":
					layout.setAlignX("center");
					layout.setAlignY("middle");
					break;

				default:
					layout.resetAlignX();
					layout.resetAlignY();
					break;
			}

			// schedule the updateLayout.
			qx.ui.core.queue.Widget.add(this, "updateLayout");

		},

		/**
		 * Updates the size of the specified button
		 * according to the value of sizeMode and itemSize.
		 */
		_updateTabButtonSize: function (button) {

			if (!button)
				return;

			button.resetWidth();
			button.resetHeight();
			button.invalidateLayoutCache();

			var buttonSize = this.getButtonSizeHint();
			if (buttonSize.height)
				button.setHeight(buttonSize.height);
			if (buttonSize.width)
				button.setWidth(buttonSize.width);

			switch (this.getSizeMode()) {

				case "fill":
					button.setLayoutProperties({ flex: 1 });
					break;

				case "fixed":
				case "center":
					button.setLayoutProperties({ flex: 0 });
					break;

				case "normal":
				default:
					button.setLayoutProperties({ flex: 0 });
					break;
			}
		},

		/**
		 * Gets/Sets the selectedIndex property indicating
		 * the index of the currently selected tab page.
		 */
		getSelectedTab: function () {

			return this.__selectedTab;
		},
		setSelectedTab: function (value) {

			var tab = this._transformComponent(value);
			this.__selectedTab = tab;

			if (tab == null) {
				this.resetSelection();
			}
			else {
				this.setSelection([tab]);
				this.fireDataEvent("changeSelectedTab", tab);
			}
		},

		/** Reference to the currently selected tab. */
		__selectedTab: null,

		/**
		 * Applies the alignment property.
		 */
		_applyAlignment: function (value, old) {

			// reset the cached button size hint.
			this.__buttonSizeHint = null;

			if (value == null) {
				this.resetAlignment();
				return;
			}

			this.setBarPosition(value);
		},

		/**
		 * Overridden to update the metrics.
		 */
		_applyBarPosition: function (value, old) {

			this.base(arguments, value, old);

			var layout = this.getChildControl("bar").getLayout();
			switch (this.getSizeMode()) {

				case "center":
					layout.setAlignX("center");
					layout.setAlignY("middle");
					break;

				default:
					layout.resetAlignX();
					layout.resetAlignY();
					break;
			}

			// schedule the updateLayout.
			qx.ui.core.queue.Widget.add(this, "updateLayout");
		},

		/**
		 * Applies the orientation property.
		 */
		_applyOrientation: function (value, old) {

			// reset the cached button size hint.
			this.__buttonSizeHint = null;

			if (value == null) {
				this.resetOrientation();
				return;
			}

			this.removeState(old);
			this.addState(value);

			// schedule the updateLayout.
			qx.ui.core.queue.Widget.add(this, "updateLayout");
		},

		// returns the orientation value to use. it's either
		// the user value, theme value, or calculated value.
		_getEffectiveOrientation: function () {
			var value = this.getOrientation();
			if (!value) {
				switch (this.getAlignment()) {
					case "top":
					case "bottom":
						value = "horizontal";
						break;

					case "left":
					case "right":
						value = "vertical";
						break;
				}
			}
			return value || "horizontal";
		},

		/**
		 * Applies the display property.
		 */
		_applyDisplay: function (value, old) {

			// set the show property on all child tab pages.
			var pages = this.getChildren();
			for (var i = 0; i < pages.length; i++) {
				this.__applyDisplayToPage(pages[i], value);
			}

			// update the new bounds of all the tabs on the server.
			this._updateMetrics();
		},

		// updates the page to reflect the display property value.
		__applyDisplayToPage: function (page, value) {

			page.getButton().setShow(value);
		},

		/**
		 * Applies the showToolTips property.
		 */
		_applyShowToolTips: function (value, old) {

			// block/unblock tooltips on all child tab pages.
			var block = !value;
			var pages = this.getChildren();
			for (var i = 0; i < pages.length; i++) {
				pages[i].getButton().setBlockToolTip(block);
			}
		},

		/**
		 * Applies the showVisibilityMenu property.
		 */
		_applyShowVisibilityMenu: function (value, old) {

			this.getChildControl("bar").setShowVisibilityMenu(value);
		},

		/**
		 * Applies the scrollStep property.
		 */
		_applyScrollStep: function (value, old) {

			this.getChildControl("bar").setScrollStep(value);

		},

		syncWidget: function (jobs) {

			if (!jobs)
				return;

			if (jobs["updateLayout"]) {
				// update buttons sizes.
				var page, button;
				var pages = this.getChildren();
				var orientation = this._getEffectiveOrientation();
				for (var i = 0; i < pages.length; i++) {
					page = pages[i];
					button = page.getButton();
					page._setOrientation(orientation);
					this._updateTabButtonSize(button);
				}

				this._updateMetrics();
			}

			if (jobs["updateMetrics"]) {

				// update the metrics on the server
				this.__performUpdateMetrics();
			}
		},

		// overridden to propagate the orientation.
		add: function (page) {

			this.base(arguments, page);

			var pane = this.getChildControl("pane");
			pane.isSelected(page) ? page.show() : page.hide();

			this.__applyDisplayToPage(page, this.getDisplay());
			page._setChildAppearance(this);
			page._updateIconSize(this.getIconSize());
			page._setOrientation(this._getEffectiveOrientation());
			page.getButton().setBlockToolTip(!this.getShowToolTips());
			this._updateTabButtonSize(page.getButton());

			this.getChildControl("bar").resetVisibilityMenu();

			if (this.getChildren().length == 1) {
				this.__suspendEvents = true;
				this.setSelection([page]);
				this.__suspendEvents = false;
			}

			this._updateMetrics();
		},

		// overridden to propagate the orientation.
		addAt: function (page, index) {

			this.base(arguments, page, index);

			var pane = this.getChildControl("pane");
			pane.isSelected(page) ? page.show() : page.hide();

			this.__applyDisplayToPage(page, this.getDisplay());
			page._setChildAppearance(this);
			page._updateIconSize(this.getIconSize());
			page._setOrientation(this._getEffectiveOrientation());
			page.getButton().setBlockToolTip(!this.getShowToolTips());
			this._updateTabButtonSize(page.getButton());

			this.getChildControl("bar").resetVisibilityMenu();

			if (this.getChildren().length == 1) {
				this.__suspendEvents = true;
				this.setSelection([page]);
				this.__suspendEvents = false;
			}

			this._updateMetrics();
		},

		// overridden to suppress "beforeChange".
		remove: function (page) {

			this.__suspendEvents = true;
			this.base(arguments, page);
			this.__suspendEvents = false;

			this.getChildControl("bar").resetVisibilityMenu();
			this._updateMetrics();
		},

		/**
		 * Event listener for the "keyPress" event.
		 *
		 * Selects the previous TabPage when pressing "Left" or "Up" or
		 * the next TabPage when pressing "Right" or "Down".
		 */
		_onKeyPress: function (e) {

			if (e.getTarget() !== this)
				return;

			// redirect the event to the active button.
			switch (e.getKeyIdentifier()) {
				case "Left":
				case "Up":
				case "Right":
				case "Down":
					var current = this.getSelection()[0];
					if (current)
						current.getButton()._onKeyPress(e);
					break;
			}
		},

		/**
		 * Event listener for the "changeTabVisibility" event.
		 * Triggered when the user uses the visibility menu to hide or show a tab page.
		 */
		_onChangeTabVisibility: function (e) {

			var data = e.getData();
			var page = this.getChildren()[data.index];
			if (page) {
				page.setHidden(!data.visible);
				this.fireDataEvent(data.visible ? "showTab" : "hideTab", data.index);
			}
		},

		// overridden to prevent the automatic
		// change of the active tab.
		//
		// instead we generate the beforeChange event
		// and let the server change the active tab.
		_onChangeSelection: function (e) {

			if (wisej.web.DesignMode)
				return this.base(arguments, e);

			if (this.__suspendEvents) {
				this.base(arguments, e);
				return;
			}

			// find the new active page.
			var newButton = e.getData()[0];
			if (newButton) {
				var newPage = newButton.getUserData("page");
				if (newPage) {

					// if the selected page is different from the selected index, we restore the
					// selected page - voiding the selection - and fire "beforeChange" to let the
					// server decide whether to change the page or not.
					//
					// however, if the selected page matches the selected index, we let the processing
					// go through and complete the selection. when the server selects the page index this
					// selection occurs at what is effectively a second pass.

					var oldPage = this.getSelectedTab();
					if (newPage != oldPage) {

						// if we have a "beforeChange", void the selection
						// and fire the event, the listener is responsible for changing the
						// selected tab page.
						if (this.hasListener("beforeChange")) {

							// restore the previously selected page to let the
							// server control whether the page should change.
							if (oldPage) {
								this.__suspendEvents = true;
								this.setSelection([oldPage]);
								this.__suspendEvents = false;
							}

							// fire the beforeChange event
							this.fireDataEvent("beforeChange", newPage);
							return;
						}
					}
				}

				this._updateFocusedButton();
				if (oldPage) oldPage._updateButtonLayout();
				if (newPage) newPage._updateButtonLayout();
			}

			this.base(arguments, e);
		},

		// changes the positions of the tab pages.
		_swapTabPages: function (oldIndex, newIndex) {

			this.__suspendEvents = true;
			try {

				var pages = this.getChildren();
				var pageToMove = pages[oldIndex];
				var selected = this.isSelected(pageToMove);

				this.addAt(pageToMove, newIndex);

				if (selected)
					pageToMove.show();

				// update the swapped tab buttons on the server.
				this.fireDataEvent("tabIndexChanged", {
					oldIndex: oldIndex,
					newIndex: newIndex
				});

				// update the new bounds of all the tabs on the server.
				this._updateMetrics();

			}
			finally {
				this.__suspendEvents = false;
			}

			this.getChildControl("bar").resetVisibilityMenu();
		},

		// overridden
		_onPageClose: function (e) {

			// don't call the base, the tabPage
			// will be closed only if the server code doesn't cancel the event.
			// this.base(arguments, e);

			var page = e.getTarget();
			this.fireDataEvent("close", page);
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "bar":
					control = new wisej.web.tabcontrol.SlideBar();
					control.setZIndex(10);
					control.setRtlLayout(true);
					control.setKeepActive(true);
					control.addListener("changeTabVisibility", this._onChangeTabVisibility, this);
					this._add(control);
					break;
			}

			return control || this.base(arguments, id);
		},

		// propagates the "focused" state to the active tab page.
		_updateFocusedButton: function () {

			var pages = this.getChildren();
			for (var i = 0; i < pages.length; i++) {
				pages[i].removeState("focused");
			}

			if (this.hasState("focused")) {
				var current = this.getSelection()[0];
				if (current)
					current.addState("focused");
			}
		},

		// overridden to delay the "render" event to give a chance
		// to the designer to pick the correct rendered control.
		_onDesignRender: function () {

			var me = this;
			setTimeout(function () {
				me.fireEvent("render");
			}, 100);
		},

		/**
		 * Schedules a deferred call to the __updateMetrics method.
		 */
		_updateMetrics: function () {

			qx.ui.core.queue.Widget.add(this, "updateMetrics");
		},

		/**
		 * Updates the metrics on the server.
		 */
		__performUpdateMetrics: function () {

			if (!wisej.web.DesignMode) {

				qx.ui.core.queue.Layout.flush();

				this.fireDataEvent("updateMetrics", {
					tabRects: this.getTabRects(),
					pageInsets: this.getPageInsets()
				});
			}
		}
	}
});


/**
 * wisej.web.tabcontrol.TabPage
 */
qx.Class.define("wisej.web.tabcontrol.TabPage", {

	extend: qx.ui.tabview.Page,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MShortcutTarget,
		qx.ui.core.MRemoteChildrenHandling
	],

	construct: function (text, icon) {

		this.base(arguments, text, icon);

		// configure the internal layout to have the 
		// scroll panel fill this container.
		this.setLayout(new qx.ui.layout.Grow());

		// add local state properties.
		this.setStateProperties(this.getStateProperties().concat(["scrollX", "scrollY"]));

		var tabButton = this.getButton();

		// hook the appear event on the button (page tab) to perform 
		// the initial rotation for left/right tabs.
		tabButton.addListenerOnce("appear", this.__onButtonAppear, this);

		// hook the resize event to inform the server of the tab button size. 
		tabButton.addListenerOnce("resize", this.__onButtonResize, this);

		// update the scroll position properties.
		this.__scroller = this.getChildControl("pane");
	},

	properties: {

		// appearance
		appearance: { init: "$parent/page", refine: true },

		// block tooltips on the page, we show them only for the tab buttons.
		blockToolTip: { init: true, refine: true },

		/**
		 * Caption.
		 *
		 * This property is defined using the getter/setter methods.
		 */

		/**
		 * TabBackgroundColor property.
		 *
		 * Changes the background color of the tab button.
		 */
		tabBackgroundColor: { init: null, check: "Color", apply: "_applyTabBackgroundColor" },

		/**
		 * TabTextColor property.
		 *
		 * Changes the text color of the tab button.
		 */
		tabTextColor: { init: null, check: "Color", apply: "_applyTabTextColor" },

		/**
		 * Enables the automatic scrolling of the content.
		 */
		autoScroll: { init: false, check: "Boolean", apply: "_applyAutoScroll" },

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
		 * ScrollY property.
		 *
		 * This property is defined using the getter/setter methods.
		 */

		/**
		 * Determines which scrollbars should be visible: 0 = None, 1 = Horizontal, 2 = Vertical, 3 = Both, 4 = Hidden.
		 */
		scrollBars: { init: 3, check: "PositiveInteger", apply: "_applyScrollBars" },

		/**
		 * Hidden property.
		 */
		hidden: { init: false, check: "Boolean", apply: "_applyHidden" },

		/**
		 * ShowInVisibilityMenu property.
		 *
		 * Determines whether the tab is listed in the visibility drop down menu.
		 */
		showInVisibilityMenu: { init: true, check: "Boolean", apply: "_applyShowInVisibilityMenu" },

		/**
		 * ToolTipText property.
		 */
		toolTipText: { init: null, check: "String", apply: "_applyToolTipText" },

		/**
		 * The tab button contextual menu.
		 * 
		 * Replaces the built-in contextMenu.
		 */
		tabContextMenu: { init: null, nullable: true, apply: "_applyTabContextMenu", transform: "_transformMenu" }
	},

	members: {

		/**
		 * Wisej marker. Important! Otherwise it cannot autoscroll because Wisej widgets
		 * all set their user bounds when NOT inside a isWisejContainer - user bounds are not
		 * considered when calculating the size hint.
		 */
		isWisejContainer: true,

		// overridden forward states.
		_forwardStates: {
			focused: true,
			checked: true,
			barTop: true,
			barRight: true,
			barBottom: true,
			barLeft: true,
			firstTab: true,
			lastTab: true,
			vertical: true,
			horizontal: true,
		},

		// reference to the inner scroller panel.
		__scroller: null,

		// stored previous scroll positions, used in __fireScrollEvent.
		__oldScrollX: 0,
		__oldScrollY: 0,

		/**
		 * Returns the TabControl that owns this tab page.
		 * 
		 * @returns {wisej.web.TabControl} Tab control that contains this page.
		 */
		getTabControl: function () {

			var tabControl = this.getParent();

			if (!tabControl) {
				for (tabControl = this.getLayoutParent();
					tabControl && !(tabControl instanceof wisej.web.TabControl);
					tabControl = tabControl.getLayoutParent());
			}

			return tabControl;
		},

		/**
		 * Caption property.
		 *
		 * Sets the label property. It is redefined as "caption"
		 * to be compatible with the wisej.web.Panel component.
		 */
		getCaption: function () {

			return this.getLabel() || "";
		},
		setCaption: function (value, old) {

			if (value === "")
				value = null;

			this.setLabel(value);
		},

		/**
		 * Applies the toolTipText property.
		 */
		_applyToolTipText: function (value, old) {

			this.getButton().setToolTipText(value);

		},

		/**
		 * Applies the tabContextMenu property.
		 */
		_applyTabContextMenu: function (value, old) {

			this.getButton().setContextMenu(value);

		},

		/**
		 * Applies the hidden property.
		 *
		 * Hides the tab page button from the bar.
		 */
		_applyHidden: function (value, old) {

			if (value) {

				// if this is the currently visible page, hide it.
				if (this.isVisible())
					this.hide();

				this.getButton().exclude();
			}
			else {

				this.getButton().show();
			}

			var tabControl = this.getTabControl();
			if (tabControl)
				tabControl._updateMetrics();
		},

		/**
		 * Applies the ShowInVisibilityMenu property.
		 */
		_applyShowInVisibilityMenu: function (value, old) {

			var tabControl = this.getTabControl();
			if (!tabControl)
				return;

			tabControl.getChildControl("bar").resetVisibilityMenu();
		},

		// overridden
		_applyEnabled: function (value, old) {

			value === false
				? this.addState("disabled")
				: this.removeState("disabled");

			// add the disabled stat but let t he button be
			// clickable to let the user select the disabled tab page.
			var btn = this.getChildControl("button");
			value === false
				? btn.addState("disabled")
				: btn.removeState("disabled");
		},

		/**
		 * Applies the tabBackgroundColor property.
		 */
		_applyTabBackgroundColor: function (value, old) {

			this.getButton().setBackgroundColor(value);
		},

		/**
		 * Applies the tabTextColor property.
		 */
		_applyTabTextColor: function (value, old) {

			this.getButton().setTextColor(value);
		},

		// overridden to adjust the button
		// layout when the position is left or right.
		_applyLabel: function (value, old) {

			this.base(arguments, value, old);

			// update the layout of the tab-button.
			qx.ui.core.queue.Widget.add(this, "layout");
		},

		// overridden to adjust the button
		// layout when the position is left or right.
		_applyFont: function (value, old) {

			this.base(arguments, value, old);

			// update the layout of the tab-button when
			// the font changes.
			if (value) {
				// for WebFonts, wait for the font to be loaded.
				var font = qx.theme.manager.Font.getInstance().resolve(value);
				if (font instanceof qx.bom.webfonts.WebFont) {
					font.addListenerOnce("changeStatus", function () {
						qx.ui.core.queue.Widget.add(this, "layout");
					}, this);

					return;
				}
			}

			qx.ui.core.queue.Widget.add(this, "layout");
		},

		/**
		 * Applies the icon property.
		 *
		 * Overridden to update the icon size.
		 */
		_applyIcon: function (value, old) {

			this.base(arguments, value, old);

			var tabControl = this.getTabControl();
			if (!tabControl)
				return;

			this._updateIconSize(tabControl.getIconSize());
		},

		_updateIconSize: function (size) {

			if (!size)
				return;

			var button = this.getButton();
			var icon = button.getChildControl("icon", true);

			if (icon) {

				if (size) {

					var width = size.width;
					var height = size.height;

					if (this.__orientation === "vertical") {
						width = size.height;
						height = size.width;
					}

					icon.setWidth(width);
					icon.setHeight(height);
					icon.setMinWidth(width);
					icon.setMinHeight(height);
					icon.getContentElement().setStyle("backgroundSize", width + "px " + height + "px");

					// update the layout of the tab-button.
					qx.ui.core.queue.Widget.add(this, "layout");
				}
			}
		},

		__onButtonAppear: function (e) {

			// update the layout of the tab-button.
			qx.ui.core.queue.Widget.add(this, "layout");

			// initialize the movable state.
			var tabControl = this.getTabControl();
			if (tabControl && tabControl.getMovableTabs()) {
				var button = e.getTarget();
				button.setMovable(true);
				button._activateMoveHandle(button);
			}
		},

		/**
		 * Updates the size of the tab button on the server side.
		 */
		__onButtonResize: function (e) {

			if (!wisej.web.DesignMode) {
				this.fireDataEvent("resizeTabButton", e.getData());
			}
		},

		_setOrientation: function (value) {

			if (this.__orientation)
				this.removeState(this.__orientation);

			this.addState(value);

			this._updateButtonLayout();
		},

		/**
		 * Button Rotation
		 */
		syncWidget: function (jobs) {

			if (!jobs || !jobs["layout"])
				return;

			qx.ui.core.queue.Appearance.flush();

			this._updateButtonLayout();
		},

		// rotates the tab button and updates the layout
		// according to the bar position and the orientation.
		_updateButtonLayout: function () {

			var tabControl = this.getTabControl();
			if (!tabControl)
				return;

			var button = this.getButton();
			var layout = button._getLayout();

			layout.setSpacingX(0);
			layout.setSpacingY(0);

			var icon = button.getChildControl("icon");
			var label = button.getChildControl("label");
			var menu = button.getChildControl("menu", true);
			var close = button.getChildControl("close-button");

			// rearrange the close button or the icon.
			var barPosition = tabControl.getBarPosition();
			var orientation = tabControl._getEffectiveOrientation();
			switch (orientation) {

				case "vertical":

					var labelRow = 1;

					layout.setColumnFlex(0, 1);
					layout.setColumnFlex(1, 0);
					layout.setColumnFlex(2, 0);
					layout.setRowFlex(0, 0);
					layout.setRowFlex(1, 0);
					layout.setRowFlex(2, 0);
					layout.setRowFlex(3, 0);

					if (barPosition === "right" || barPosition === "bottom") {

						icon.setLayoutProperties({ row: labelRow - 1, column: 0 });
						label.setLayoutProperties({ row: labelRow, column: 0 });
						close.setLayoutProperties({ row: labelRow + 1, column: 0 });
						if (menu) menu.setLayoutProperties({ row: labelRow - 2, column: 0 });

						// flex either the label or the icon.
						layout.setRowFlex(label.isVisible() ? labelRow : labelRow - 1, 1);
					}
					else {

						close.setLayoutProperties({ row: labelRow - 1, column: 0 });
						label.setLayoutProperties({ row: labelRow, column: 0 });
						icon.setLayoutProperties({ row: labelRow + 1, column: 0 });
						if (menu) menu.setLayoutProperties({ row: labelRow + 2, column: 0 });

						// flex either the label or the icon.
						layout.setRowFlex(label.isVisible() ? labelRow : labelRow + 1, 1);
					}

					button.addState("vertical");
					button.removeState("horizontal");

					break;

				case "horizontal":

					var labelCol = 2;

					layout.setColumnFlex(0, 0);
					layout.setColumnFlex(1, 0);
					layout.setColumnFlex(2, 0);
					layout.setColumnFlex(3, 0);
					layout.setRowFlex(0, 1);
					layout.setRowFlex(1, 0);
					layout.setRowFlex(2, 0);

					icon.setLayoutProperties({ row: 0, column: labelCol - 1 });
					label.setLayoutProperties({ row: 0, column: labelCol });
					close.setLayoutProperties({ row: 0, column: labelCol + 1 });
					if (menu) menu.setLayoutProperties({ row: 0, column: labelCol - 2 });

					// flex either the label or the icon.
					layout.setColumnFlex(label.isVisible() ? labelCol : labelCol - 1, 1);

					button.addState("horizontal");
					button.removeState("vertical");

					break;
			}

			button.syncAppearance();
			label.syncAppearance();
			label.resetWidth();
			label.resetHeight();

			this.__rotateWidget(icon, barPosition, orientation);
			this.__rotateWidget(label, barPosition, orientation);
			this.__rotateWidget(close, barPosition, orientation);
			if (menu) this.__rotateWidget(menu, barPosition, orientation);
		},

		// rotates the inner tab-button widget 90deg 
		// left or right maintaining its current layout box.
		__rotateWidget: function (widget, barPosition, orientation) {

			widget.resetMaxWidth();
			widget.resetMinWidth();
			widget.resetMaxHeight();
			widget.resetMinHeight();
			widget.invalidateLayoutCache();

			var direction =
				orientation === "horizontal"
					? "none"
					: barPosition === "right" || barPosition === "bottom"
						? "right"
						: "left";

			wisej.utils.Widget.rotate(widget, direction);
		},

		// reference to the inner children container.
		__childrenContainer: null,

		/**
		 * The children container needed by the {@link qx.ui.core.MRemoteChildrenHandling}
		 * mixin.
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
		 */
		_getContentPaddingTarget: function () {
			return this.getChildrenContainer();
		},

		/**
		 * Returns the target for the accessibility properties.
		 */
		getAccessibilityTarget: function () {
			return this.getButton();
		},

		/**
		  * Returns the target for the automation properties.
		 */
		getAutomationTarget: function () {
			return this.getButton();
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

		/**
		 * Overridden to update the X position when scrolling horizontally.
		 */
		_onScrollBarX: function (e) {

			this.__fireScrollEvent(e, false);
		},

		/**
		 * Overridden to updates the Y position when scrolling vertically.
		 */
		_onScrollBarY: function (e) {

			this.__fireScrollEvent(e, true);
		},

		__fireScrollEvent: function (e, vertical) {

			this.setDirty(true);

			var scrollbar = e.getTarget();
			var position = e.getData() | 0;
			var maximum = scrollbar.getMaximum();
			var old = (vertical ? this.__oldScrollY : this.__oldScrollX) | 0;
			vertical ? this.__oldScrollY = position : this.__oldScrollX = position;

			if (position == old)
				return;

			var data = {};
			data.old = old;
			data[vertical ? "scrollY" : "scrollX"] = position;
			data.type = position == 0 ? "first" : position == maximum ? "last" : "step";

			this.fireDataEvent("scroll", data);
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "button":
					control = new wisej.web.tabcontrol.TabButton().set({
						allowGrowX: true,
						allowGrowY: true,
						focusable: false,
						keepInBounds: true,
						rich: true // needed for mnemonics.
					});
					control.setUserData("page", this);
					control.addListener("close", this._onButtonClose, this);
					break;

				case "pane":
					control = new qx.ui.container.Scroll();
					var pane = control.getChildControl("pane");
					pane._getLayout().dispose();
					pane._setLayout(new qx.ui.layout.Basic());

					var clientArea = new qx.ui.container.Composite(new qx.ui.layout.Basic());
					clientArea.getContentElement().setStyles({
						"overflowX": "visible",
						"overflowY": "visible"
					});
					control.add(clientArea);

					this._add(control);

					control.addListener("resize", this._onScrollerResize, this);
					control.getChildControl("scrollbar-x").addListener("scroll", this._onScrollBarX, this);
					control.getChildControl("scrollbar-y").addListener("scroll", this._onScrollBarY, this);
					control.getChildControl("scrollbar-y").addListener("changeVisibility", this._onScrollerResize, this);
					control.getChildControl("scrollbar-x").addListener("changeVisibility", this._onScrollerResize, this);

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
		 * Selects the tabPage when the corresponding mnemonic is pressed.
		 */
		executeMnemonic: function () {

			if (!this.isEnabled() || this.isHidden())
				return false;

			var tabControl = this.getTabControl();
			if (!tabControl)
				return false;

			tabControl.setSelection([this]);
			return true;
		},

		// overridden.
		destroy: function () {

			// remove the tab page from the owner tab control.
			var tabControl = this.getTabControl();
			if (tabControl && tabControl.indexOf(this) > -1)
				tabControl.remove(this);

			this.base(arguments);
		}
	}

});


/**
 * wisej.web.tabcontrol.TabButton
 */
qx.Class.define("wisej.web.tabcontrol.TabButton", {

	extend: qx.ui.tabview.TabButton,

	include: [
		qx.ui.core.MMovable
	],

	construct: function () {

		this.base(arguments);

		if (!wisej.web.DesignMode) {

			// when "automation.mode" is enabled, change the id of the element on creation.
			// TabButton needs to do this here because the widget TabPage is not created until
			// the first time it's made visible.
			if (qx.core.Environment.get("automation.mode") === true) {
				this.addListenerOnce("appear", function (e) {
					wisej.utils.Widget.setAutomationID(this.getUserData("page"));
				});
			}
		}

		this.addListener("endmove", this.__onEndMove);
		this.addListener("startmove", this.__onStartMove);
	},

	properties: {

		/**
		 * ShowClose property.
		 *
		 * Shows or hides the close button - only when the value of showCloseButton is set to true.
		 */
		showClose: { check: "Boolean", init: false, apply: "_applyShowClose", themeable: true }
	},

	members: {

		// overridden
		_forwardStates: {
			focused: true,
			checked: true,
			barTop: true,
			barRight: true,
			barBottom: true,
			barLeft: true,
			horizontal: true,
			vertical: true
		},

		// true when the buttons is being dragged.
		__moving: false,

		// array with the bounds of all the buttons in the bar component while moving.
		__moveButtons: null,

		// new index.
		__moveTargetIndex: -1,

		// old index.
		__moveCurrentIndex: -1,

		// size of the button being moved.
		__moveWidth: 0,
		__moveHeight: 0,

		// whether to drag the tab buttons vertically.
		__moveVertically: false,

		/**
		 * Applies the showClose property.
		 */
		_applyShowClose: function (value, old) {

			if (value && this.isShowCloseButton()) {
				this._showChildControl("close-button");
			} else {
				this._excludeChildControl("close-button");
			}

		},

		/**
		  * Event listener for the "execute" event.
		  *
		  * Sets the property "checked" to true.
		  *
		  * @param e {qx.event.type.Event} execute event
		  */
		_onExecute: function (e) {
			this.setValue(true);
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "menu":
					control = new qx.ui.basic.Image().set({
						focusable: false,
						keepActive: true,
						alignY: "middle",
						alignX: "center",
						visibility: "excluded",
						source: "menu-overflow",
					});
					this._add(control, { row: 0, column: 0 });
					control.addListener("pointerdown", this._onMenuPointerDown, this);
					break;

				case "label":
					control = this.base(arguments, id, hash);
					control.set({
						rich: true,
						wrap: false
					});
					break;
			}

			return control || this.base(arguments, id);
		},

		// Handle clicks on the menu button in the tab page.
		_onMenuPointerDown: function (e) {

			var page = this.getUserData("page");
			if (page) {
				var tabControl = page.getTabControl();

				if (tabControl) {
					tabControl.fireDataEvent("showPageMenu", page);
				}
			}
		},

		// ======================================================
		// moving logic
		// ======================================================

		__onEndMove: function (e) {

			if (this.__moving) {
				var bar = this.getLayoutParent();
				if (bar.indexOf(this) !== this.__moveIndex) {
					var page = this.getUserData("page");
					if (page) {
						var tabControl = page.getTabControl();

						// restore the previous locations if the position
						// of the tab button didn't change.
						if (this.__moveTargetIndex === this.__moveCurrentIndex) {
							var button, bounds;
							var buttons = this.__moveButtons;
							for (var i = 0; i < buttons.length; i++) {
								button = buttons[i].button;
								bounds = buttons[i].bounds;
								if (button.isVisible() && bounds) {
									button.setDomTop(bounds.top);
									button.setDomLeft(bounds.left);
								}
							}
							return;
						}

						if (tabControl) {
							tabControl._swapTabPages(this.__moveCurrentIndex, this.__moveTargetIndex);
						}
					}
				}
			}

			this.__moving = false;
			this.__moveButtons = null;
			this.__moveTargetIndex = this.__moveCurrentIndex = -1;

		},
		__onStartMove: function (e) {

			this.__moving = true;
			this.__moveButtons = [];
			this.__moveVertically = this.hasState("barLeft") || this.hasState("barRight");

			var button;
			var bar = this.getLayoutParent();
			this.__moveTargetIndex = this.__moveCurrentIndex = bar.indexOf(this);

			// populate the list of buttons and their bounds, we'll 
			// move these and update the DOM immediately. the actual
			// position of the tab button is not changed until the moving ends.
			var buttons = bar.getChildren();
			for (var i = 0; i < buttons.length; i++) {
				button = buttons[i];
				this.__moveButtons.push({
					button: button,
					dom: button.getContentElement().getDomElement(),
					bounds: qx.lang.Object.clone(button.getBounds())
				});
			}

			this.__moveWidth = this.__moveButtons[this.__moveCurrentIndex].bounds.width;
			this.__moveHeight = this.__moveButtons[this.__moveCurrentIndex].bounds.height;
		},
		setDomPosition: function (left, top) {

			// moving happens here. the MMovable mixin calls this method in qx.ui.core.Widget
			// when moving the target widget.

			var dom = this.getContentElement().getDomElement();
			if (!dom)
				return;

			this.base(arguments, left, top);

			if (!this.__moving)
				return;

			// adjust the location of all the buttons.
			var buttons = this.__moveButtons;
			var right = left + this.__moveWidth;
			var bottom = top + this.__moveHeight;
			var bounds, button, buttonLeft, buttonTop;

			// find the target index.
			var targetIndex = -1;
			for (var i = 0; i < buttons.length; i++) {
				dom = buttons[i].dom;
				button = buttons[i].button;
				bounds = buttons[i].bounds;
				if (button === this || !button.isVisible() || !bounds)
					continue;

				buttonTop = bounds.top;
				buttonLeft = bounds.left;

				if (this.__moveVertically) {

					// moving down.
					if (bottom < buttonTop + bounds.height && bottom > buttonTop + bounds.height / 2) {
						targetIndex = i;
						break;
					}

					// moving up.
					if (top > buttonTop && top < buttonTop + bounds.height / 2) {
						targetIndex = i;
						break;
					}

				}
				else {
					// moving left.
					if (left > buttonLeft && left < buttonLeft + bounds.width / 2) {
						targetIndex = i;
						break;
					}

					// moving right.
					if (right < buttonLeft + bounds.width && right > buttonLeft + bounds.width / 2) {
						targetIndex = i;
						break;
					}
				}
			}

			if (targetIndex === -1)
				return;

			// make space.
			for (var i = 0; i < buttons.length; i++) {
				dom = buttons[i].dom;
				button = buttons[i].button;
				bounds = buttons[i].bounds;
				if (button === this || !button.isVisible() || !bounds)
					continue;

				buttonTop = bounds.top;
				buttonLeft = bounds.left;

				if (this.__moveVertically) {
					if (i <= targetIndex && i > this.__moveTargetIndex) {
						bounds.top -= this.__moveHeight;
					}
					else if (i >= targetIndex && i < this.__moveTargetIndex) {
						bounds.top += this.__moveHeight;
					}
				}
				else {
					if (i <= targetIndex && i > this.__moveTargetIndex) {
						bounds.left -= this.__moveWidth;
					}
					else if (i >= targetIndex && i < this.__moveTargetIndex) {
						bounds.left += this.__moveWidth;
					}
				}

				button.setDomTop(bounds.top);
				button.setDomLeft(bounds.left);
			}

			var temp = buttons[targetIndex];
			buttons[targetIndex] = buttons[this.__moveTargetIndex];
			buttons[this.__moveTargetIndex] = temp;

			this.__moveTargetIndex = targetIndex;
		}

		// ======================================================
		// end moving logic
		// ======================================================
	}
});


/**
 * wisej.web.tabcontrol.SlideBar
 *
 * Extends the standard qx.ui.container.SlideBar to add the visibility menu
 * button after the button-forward widget used to scroll the tabs that are outside the
 * viewport.
 */
qx.Class.define("wisej.web.tabcontrol.SlideBar", {

	extend: qx.ui.container.SlideBar,

	construct: function (orientation) {

		this.base(arguments, orientation);

	},

	events: {

		/** 
		 * Fired when the user checks or unchecks a tab in the visibility menu.
		 *
		 * The data is a map: {index, visible}.
		 */
		"changeTabVisibility": "qx.event.type.Data"
	},

	properties: {

		/**
		 * Determines whether the viability menu button is visible.
		 */
		showVisibilityMenu: { init: false, check: "Boolean", apply: "_applyShowVisibilityMenu" },

	},

	members: {

		/**
		 * Removes the visibility menu items. They will be recreated on first use.
		 */
		resetVisibilityMenu: function () {

			var visibility = this.getChildControl("visibility", true);
			if (visibility)
			{
				var menu = visibility.getMenu();
				if (menu) {
					var entries = menu.getChildren();
					for (var i = 0, l = entries.length; i < l; i++) {
						entries[0].destroy();
					}
				}
			}
		},

		/**
		 * Applies the showVisibilityMenu property
		 */
		_applyShowVisibilityMenu: function (value, old) {

			value
				? this._showChildControl("visibility")
				: this._excludeChildControl("visibility");
		},

		// Handles the "beforOpen" event from the visibility menu button
		// to populate the drop down menu on first use.
		_onBeforeOpenVisibilityMenu: function (e) {

			var menu = this.getChildControl("visibility").getMenu();
			var children = menu.getChildren();
			if (!children.length) {

				var buttons = this.getChildren(), button, page;
				for (var i = 0; i < buttons.length; i++) {

					button = buttons[i];

					page = button.getUserData("page");
					if (!page || !page.getShowInVisibilityMenu())
						continue;

					var menuItem = new qx.ui.menu.CheckBox().set({
						label: button.getLabel(),
						value: button.isVisible()
					});
					menuItem.setUserData("index", i);
					menuItem.addState("unchecked")
					menuItem.setAppearance("menu/item");
					menuItem.getChildControl("label").setRich(true);
					menuItem.addListener("changeValue", this._onVisibilityMenuItemChangeValue, this);
					menu.add(menuItem);
				}
			}
		},

		// Shows or hides the corresponding TabPage.
		_onVisibilityMenuItemChangeValue: function (e) {

			var index = e.getTarget().getUserData("index");
			this.fireDataEvent("changeTabVisibility", { index: index, visible: e.getData() });
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "visibility":
					control = new wisej.web.tabcontrol.VisibilityButton();
					control.setShow("icon");
					control.setIcon(control.getIcon() || "icon-down");
					control.setFocusable(false);
					control.addListener("beforeOpen", this._onBeforeOpenVisibilityMenu, this);
					this._addAt(control, 3);
					break;
			}

			return control || this.base(arguments, id);
		},
	}
});


/**
 * wisej.web.tabcontrol.VisibilityButton
 *
 * The visibility menu button to the right of the slide bar.
 */
qx.Class.define("wisej.web.tabcontrol.VisibilityButton", {

	extend: qx.ui.form.MenuButton,

	construct: function () {
		this.base(arguments);
		this.setMenu(new qx.ui.menu.Menu());
	},

	events: {

		/** Fired before showing the drop down menu. */
		"beforeOpen": "qx.event.type.Event"
	},

	members: {

		// overridden
		open: function (selectFirst) {

			// let listeners build the menu.
			this.fireEvent("beforeOpen");

			if (this.getMenu().getChildren().length === 0)
				return;

			this.base(arguments, selectFirst);
		}
	}
});

