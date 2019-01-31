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

		if (wisej.web.DesignMode)
			this.addListenerOnce("controlsChanged", this.__initSelectedIndex);
		else
			this.addListenerOnce("appear", this.__initSelectedIndex);

		// handle key presses to change the active tab using the keyboard.
		this.addListener("keypress", this._onKeyPress);

		// handle focus events to update the "focused" state.
		this.addListener("focus", this._updateFocusedButton);
		this.addListener("blur", this._updateFocusedButton);
	},

	events: {

		/** 
		 * Fired when the selected index changes.
		 */
		changeSelectedIndex: "qx.event.type.Data",

	},

	properties: {

		/**
		 * Alignment property.
		 */
		alignment: { init: "top", check: "String", apply: "_applyAlignment", themeable: true },

		/**
		 * SelectedIndex property.
		 *
		 * Property defined with the setter/getter methods.
		 */
		// selectedIndex: { init: -1, check: "Integer", apply: "_applySelectedIndex", event: "changeSelectedIndex" },

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
		itemSize: { init: { width: 0, height: 0 }, check: "Map", nullable: true, apply: "_applyItemSize", themeable: true },

		/**
		 * Specifies how the tab buttons should be sized.
		 */
		sizeMode: { init: "normal", check: ["normal", "fill", "fixed", "center"], apply: "_applySizeMode", themeable: true },

	},

	members: {

		// overridden: forwarded states.
		_forwardStates: {
			borderNone: true,
			borderSolid: true,
			borderDashed: true,
			borderDotted: true,
			borderDouble: true
		},

		// suspends sending some events back to the server.
		__suspendEvents: false,

		/**
		 * getTabRects
		 *
		 * Returns an array containing the bounds for all the visible tabs.
		 */
		getTabRects: function () {

			// add the bounds of the tab-buttons container.
			var barBounds = this.getChildControl("bar").getBounds();

			var rects = [];
			var pages = this.getChildren();
			for (var i = 0; i < pages.length; i++) {

				var bounds = pages[i].getButton().getBounds();
				bounds.top += barBounds.top;
				bounds.left += barBounds.left;

				rects.push(bounds);
			}

			return rects;
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
		 * Applies the iconSize property.
		 *
		 * Updates all the tab pages.
		 */
		_applyIconSize: function (value, old) {

			var pages = this.getChildren();
			for (var i = 0 ; i < pages.length; i++)
				pages[i]._updateIconSize(value);
		},

		/**
		 * Applies the itemSize property.
		 * When null, it resets to the theme's value.
		 */
		_applyItemSize: function (value, old) {

			if (value == null) {
				this.resetItemSize();
				return;
			}

			var pages = this.getChildren();
			for (var i = 0 ; i < pages.length; i++) {
				this._updateTabButtonSizeMode(pages[i].getButton());
			}
		},

		/**
		 * Applies the sizeMode property.
		 */
		_applySizeMode: function (value, old) {

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

			var pages = this.getChildren();
			for (var i = 0 ; i < pages.length; i++) {
				this._updateTabButtonSizeMode(pages[i].getButton());
			}
		},

		/**
		 * Updates the size of the specified button
		 * according to the value of sizeMode and itemSize.
		 */
		_updateTabButtonSizeMode: function (button) {
			if (!button)
				return;

			button.resetWidth();
			button.resetHeight();
			button.invalidateLayoutCache();

			var sizeMode = this.getSizeMode();
			switch (sizeMode) {

				case "fill":
					button.setLayoutProperties({ flex: 1 });
					break;

				case "fixed":
				case "center":
					{
						button.setLayoutProperties({ flex: 0 });

						var itemSize = this.getItemSize();
						if (itemSize) {
							if (this._getEffectiveOrientation() == "vertical") {
								if (itemSize.height > 0)
									button.setHeight(itemSize.height);
							}
							else {
								if (itemSize.width > 0)
									button.setWidth(itemSize.width);
							}
						}
					}
					break;

				default:
					button.setLayoutProperties({ flex: 0 });
					break;
			}
		},

		/**
		 * Gets/Sets the selectedIndex property indicating
		 * the index of the currently selected tab page.
		 */
		getSelectedIndex: function () {

			return this.__selectedIndex;
		},
		setSelectedIndex: function (value) {

			this.__selectedIndex = value;

			if (value == -1) {
				this.resetSelection();
			}
			else {

				var index = value;
				var pages = this.getChildren();
				if (index < pages.length) {
					this.setSelection([pages[index]]);
					this.fireDataEvent("changeSelectedIndex", index);
				}
			}
		},
		/** keeps the currently selected index. */
		__selectedIndex: -1,

		/**
		 * Applies the alignment property.
		 */
		_applyAlignment: function (value, old) {

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

			// schedule the updateMetrics callback.
			qx.ui.core.queue.Widget.add(this, "updateMetrics");
		},

		/**
		 * Applies the orientation property.
		 */
		_applyOrientation: function (value, old) {

			if (value == null) {
				this.resetOrientation();
				return;
			}

			this.removeState(old);
			this.addState(value);

			var pages = this.getChildren();
			var orientation = this._getEffectiveOrientation();
			for (var i = 0 ; i < pages.length; i++) {
				pages[i]._setOrientation(value);
				this._updateTabButtonSizeMode(pages[i].getButton());
			}

			// schedule the updateMetrics callback.
			qx.ui.core.queue.Widget.add(this, "updateMetrics");
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
			for (var i = 0 ; i < pages.length; i++)
				this.__applyDisplayToPage(pages[i], value);

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
			for (var i = 0 ; i < pages.length; i++)
				pages[i].getButton().setBlockToolTip(block);
		},

		syncWidget: function (jobs) {

			if (!jobs || !jobs["updateMetrics"])
				return;

			// update the metrics on the server
			this.__updateMetrics();
		},

		// overridden to propagate the orientation.
		add: function (page) {

			this.base(arguments, page);

			this.__applyDisplayToPage(page, this.getDisplay());
			page._setChildAppearance(this);
			page._updateIconSize(this.getIconSize());
			page._setOrientation(this._getEffectiveOrientation());
			page.getButton().setBlockToolTip(!this.getShowToolTips());
			this._updateTabButtonSizeMode(page.getButton());
		},

		// overridden to propagate the orientation.
		addAt: function (page, index) {

			this.base(arguments, page, index);

			this.__applyDisplayToPage(page, this.getDisplay());
			page._setChildAppearance(this);
			page._updateIconSize(this.getIconSize());
			page._setOrientation(this._getEffectiveOrientation());
			page.getButton().setBlockToolTip(!this.getShowToolTips());
			this._updateTabButtonSizeMode(page.getButton());
		},

		// overridden to suppress "beforeChange".
		remove: function (page) {

			this.__suspendEvents = true;
			this.base(arguments, page);
			this.__suspendEvents = false;

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
			var button = e.getData()[0];
			if (button) {
				var newPage = button.getUserData("page");
				if (newPage) {

					// if the selected page is different from the selected index, we restore the
					// selected page - voiding the selection - and fire "beforeChange" to let the
					// server decide whether to change the page or not.
					//
					// however, if the selected page matches the selected index, we let the processing
					// go through and complete the selection. when the server selects the page index this
					// selection occurs at what is effectively a second pass.

					var newIndex = this.indexOf(newPage);
					var oldIndex = this.getSelectedIndex();
					if (newIndex != oldIndex) {

						// if we have a "beforeChange", void the selection
						// and fire the event, the listener is responsible for changing the
						// selected tab page.
						if (this.hasListener("beforeChange")) {

							// restore the previously selected page to let the
							// server control whether the page should change.
							var pages = this.getChildren();
							if (oldIndex > -1 && oldIndex < pages.length) {

								var oldPage = pages[oldIndex];
								this.setSelection([oldPage]);

								// fire the beforeChange event
								this.fireDataEvent("beforeChange", newPage);
								return;
							}
						}
					}
				}

				this._updateFocusedButton();
			}

			this.base(arguments, e);
		},

		// overridden
		_onPageClose: function (e) {

			// don't call the base, the tabPage
			// will be close only if the server code doesn't cancel the event.
			// this.base(arguments, e);

			var page = e.getTarget();
			this.fireDataEvent("close", page);
		},

		// change the selected tab after the initial child controls (pages) have been added.
		__initSelectedIndex: function (e) {

			var pages = this.getChildren();
			var index = this.getSelectedIndex();
			if (index > -1 && index < pages.length) {

				var current = this.getSelection()[0];
				if (current != pages[index]) {
					current = pages[index];
					this.setSelection([current]);
				}
			}
		},

		// overridden to update the page metrics on the server.
		renderLayout: function (left, top, width, height) {
			var changes = this.base(arguments, left, top, width, height);

			if (changes)
				// schedule the updateMetrics callback.
				qx.ui.core.queue.Widget.add(this, "updateMetrics");
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "bar":
					control = this.base(arguments, id, hash);
					control.setKeepActive(true);
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
		 * Updates the metrics on the server.
		 */
		__updateMetrics: function () {

			if (!wisej.web.DesignMode) {

				var insets = this.getPageInsets();
				if (insets) {
					this.fireDataEvent("updateMetrics", {
						pageInsets: insets
					});
				}
			}
		},

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

		// detect changes to the childIndex property to rearrange the
		// tabs in the tab strip.
		this.addListener("changeChildIndex", this.__onChangeChildIndex);

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
		 * ToolTipText property.
		 */
		toolTipText: { init: null, check: "String", apply: "_applyToolTipText" },

		/**
		 * The tab button contextual menu.
		 * 
		 * Replaces the built-in contextMenu.
		 */
		tabContextMenu: { init: null, nullable: true, apply: "_applyTabContextMenu", transform: "_transformMenu" },
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

		// saved position and orientation.
		__barPosition: "top",
		__orientation: "horizontal",

		// stored previous scroll positions, used in __fireScrollEvent.
		__oldScrollX: 0,
		__oldScrollY: 0,

		// overridden.
		addState: function (state) {

			this.base(arguments, state);

			var position = this.__barPosition;
			var orientation = this.__orientation;

			switch (state) {

				case "barLeft":
					position = "left";
					break;

				case "barRight":
					position = "right";
					break;

				case "barTop":
					position = "top";
					break;

				case "barBottom":
					position = "bottom";
					break;

				case "vertical":
					orientation = "vertical";
					break;

				case "horizontal":
					orientation = "horizontal";
					break;
			}

			// check if the position or orientation have changed.
			if (position != this.__barPosition || orientation != this.__orientation) {

				// update the save position and orientation for quick reuse and comparison.
				this.__barPosition = position;
				this.__orientation = orientation;

				// schedule the layout of the button.
				qx.ui.core.queue.Widget.add(this, "layout");
			}
		},

		/**
		 * Caption property.
		 *
		 * Sets the label property. It is redefined as "caption"
		 * to be compatible with the wisej.web.Panel component.
		 */
		getCaption: function () {
			return this.getLabel();
		},
		setCaption: function (value, old) {
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

				this.getButton().exclude()
			}
			else {

				this.getButton().show();
			}
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

		/**
		 * Applies the icon property.
		 *
		 * Overridden to update the icon size.
		 */
		_applyIcon: function (value, old) {

			this.base(arguments, value, old);

			var tabControl = this.getParent();
			if (tabControl != null) {
				this._updateIconSize(tabControl.getIconSize());
			}
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

					if (this.__orientation == "vertical") {
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
		},

		/**
		 * Button Rotation
		 */
		syncWidget: function (jobs) {

			if (!jobs || !jobs["layout"])
				return;

			qx.ui.core.queue.Appearance.flush();

			this.__updateButtonLayout();
		},

		// update the tab position when the child index changes.
		__onChangeChildIndex: function (e) {

			var tabControl = this.getParent();
			if (tabControl) {

				var newIndex = e.getData();
				var oldIndex = e.getOldData();

				// moving a selected tab?
				var selected = tabControl.getSelectedIndex() == oldIndex;

				// preserve the selection.
				if (selected) {
					this.setVisible(true);
					tabControl.setSelectedIndex(newIndex);
				}
			}
		},

		// rotates the tab button and updates the layout
		// according to the bar position and the orientation.
		__updateButtonLayout: function () {

			var button = this.getButton();
			var layout = button._getLayout();

			layout.setSpacingX(0);
			layout.setSpacingY(0);

			var icon = button.getChildControl("icon");
			var label = button.getChildControl("label");
			var close = button.getChildControl("close-button");

			// rearrange the close button or the icon.
			switch (this.__orientation) {

				case "vertical":

					layout.setColumnFlex(0, 1);
					layout.setColumnFlex(1, 0);
					layout.setColumnFlex(2, 0);
					layout.setRowFlex(0, 0);
					layout.setRowFlex(1, 1);
					layout.setRowFlex(2, 0);

					if (this.__barPosition == "right" || this.__barPosition == "bottom") {
						icon.setLayoutProperties({ row: 0, column: 0 });
						label.setLayoutProperties({ row: 1, column: 0 });
						close.setLayoutProperties({ row: 2, column: 0 });
					}
					else {
						close.setLayoutProperties({ row: 0, column: 0 });
						label.setLayoutProperties({ row: 1, column: 0 });
						icon.setLayoutProperties({ row: 2, column: 0 });
					}
					break;

				case "horizontal":

					layout.setColumnFlex(0, 0);
					layout.setColumnFlex(1, 1);
					layout.setColumnFlex(2, 0);
					layout.setRowFlex(0, 1);
					layout.setRowFlex(1, 0);
					layout.setRowFlex(2, 0);
					icon.setLayoutProperties({ row: 0, column: 0 });
					label.setLayoutProperties({ row: 0, column: 1 });
					close.setLayoutProperties({ row: 0, column: 2 });

					break;
			}

			label.resetWidth();
			label.resetHeight();

			this.__rotateWidget(icon);
			this.__rotateWidget(label);
			this.__rotateWidget(close);
		},

		// rotates the inner tab-button widget 90deg 
		// left or right maintaining its current layout box.
		__rotateWidget: function (widget) {

			widget.resetMaxWidth();
			widget.resetMinWidth();
			widget.resetMaxHeight();
			widget.resetMinHeight();
			widget.invalidateLayoutCache();

			var direction = this.__orientation == "horizontal"
					  ? "none"
					  : (this.__barPosition == "right" || this.__barPosition == "bottom"
						  ? "right"
						  : "left");

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

			var tabControl = this.getParent();
			if (tabControl) {
				tabControl.setSelection([this]);
				return true;
			}

			return false;
		},

		// overridden.
		destroy: function () {

			// remove the tab page from the owner tab control.
			var tabView = this.getParent();
			if (tabView && tabView.indexOf(this) > -1)
				tabView.remove(this);

			this.base(arguments);
		},
	}

});


/**
 * wisej.web.tabcontrol.TabButton
 */
qx.Class.define("wisej.web.tabcontrol.TabButton", {

	extend: qx.ui.tabview.TabButton,

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
	},

	properties: {

		/**
		 * ShowClose property.
		 *
		 * Shows or hides the close button - only when the value of showCloseButton is set to true.
		 */
		showClose: { check: "Boolean", init: false, apply: "_applyShowClose", themeable: true },
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
				vertical: true,
		},

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

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
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

	}
});
