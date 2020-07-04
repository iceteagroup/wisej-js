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
 * wisej.web.ToolBar
 */
qx.Class.define("wisej.web.ToolBar", {

	extend: qx.ui.toolbar.ToolBar,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	/**
	 * Constructor
	 */
	construct: function () {

		this.base(arguments);

		this.addState("horizontal");

	},

	properties: {

		/**
		 * Orientation property.
		 */
		orientation: { init: "horizontal", check: ["horizontal", "vertical"], apply: "_applyOrientation" },

		/**
		 * Buttons property.
		 *
		 * Assigns the list of child buttons.
		 */
		buttons: { init: [], nullable: true, check: "Array", apply: "_applyButtons", transform: "_transformComponents" },
	},

	members: {

		// overridden: forwarded states.
		_forwardStates: {
			vertical: true,
			horizontal: true
		},

		/**
		 * Arrange the child controls according to the orientation of the widget.
		 */
		_applyOrientation: function (value, old) {

			this.addState(value);
			this.removeState(old);

			switch (value) {

				case "vertical":
					this._getLayout().dispose();
					this._setLayout(new qx.ui.layout.VBox());
					break;

				case "horizontal":
					this._getLayout().dispose();
					this._setLayout(new qx.ui.layout.HBox());
					break;
			}

			// schedule the updateMetrics callback.
			if (this.getBounds() != null)
				qx.ui.core.queue.Widget.add(this, "updateMetrics");
		},

		/**
		 * Applies the buttons property.
		 *
		 * Updates the child buttons.
		 */
		_applyButtons: function (value, old) {

			var newItems = value;

			// remove the existing buttons.
			if (old && old.length > 0) {
				for (var i = 0; i < old.length; i++) {

					if (newItems && newItems.indexOf(old[i]) > -1)
						continue;

					old[i].removeListener("open", this._onButtonOpen, this);
					old[i].removeListener("execute", this._onButtonExecute, this);
					this.remove(old[i]);
				}
			}

			if (newItems != null && newItems.length > 0) {
				for (var i = 0; i < newItems.length; i++) {

					var item = newItems[i];

					if (item.getSizeMode() == "fill")
						this.add(item, { flex: 1 });
					else
						this.add(item);

					item._setChildAppearance(this);

					if (!(item instanceof wisej.web.toolbar.Separator)) {

						if (!item.hasListener("execute"))
							item.addListener("execute", this._onButtonExecute, this);

						if (item instanceof wisej.web.toolbar.SplitButton && !item.hasListener("open"))
							item.addListener("open", this._onButtonOpen, this);
					}
				}
			}
		},

		_onButtonOpen: function (e) {

			this.fireDataEvent("open", e.getCurrentTarget());
		},

		_onButtonExecute: function (e) {

			this.fireDataEvent("execute", e.getCurrentTarget());
		},

		syncWidget: function (jobs) {

			if (!jobs || !jobs["updateMetrics"])
				return;

			// update the metrics on the server
			this.__updateMetrics();
		},

		// overridden.
		_onChangeTheme: function(){

			this.base(arguments);

			var me = this;
			setTimeout(function () {
				// schedule the updateMetrics callback.
				qx.ui.core.queue.Widget.add(me, "updateMetrics");
			}, 1);
		},

		/**
		 * Updates the metrics on the server.
		 */
		__updateMetrics: function () {

			if (!wisej.web.DesignMode) {

				this.getOrientation() == "vertical"
					? this.resetWidth()
					: this.resetHeight();

				this.invalidateLayoutCache();
				var size = this.getSizeHint();

				this.fireDataEvent("updateMetrics", {
					width: size.width,
					height: size.height
				});
			}
		},

		/**
		 * getDesignMetrics
		 *
		 * Method used by the designer to retrieve metrics information about a widget in design mode.
		 */
		getDesignMetrics: function () {

			this.getOrientation() == "vertical"
				? this.resetWidth()
				: this.resetHeight();

			this.invalidateLayoutCache();
			var size = this.getSizeHint();

			return {
				width: size.width,
				height: size.height,
				itemMetrics: this.__getItemMetrics()
			};
		},

		// returns the rectangles of all the children of the ribbon bar, including
		// the groups, separators, and items.
		__getItemMetrics: function () {

			var all = this.getButtons();

			// return only the relevant components.
			var items = [];

			if (all != null && all.length > 0) {
				for (var i = 0, l = all.length; i < l; i++) {
					var widget = all[i];
					if (widget.isWisejComponent && widget.isSeeable()) {

						var widgetRect = widget.getBounds();

						items.push({
							id: widget.getId(),
							rect: widgetRect
						});

						//// add the rect for the wrapped control.
						//if (widget instanceof wisej.web.toolbar.ButtonControl) {
						//	var control = widget.getControl();
						//	if (control && control.isWisejComponent) {
						//		items.push({
						//			id: control.getId(),
						//			rect: control.getBounds()
						//		});
						//	}
						//}
					}
				}
			}

			return items;
		},


		// avoid re-entering the recalculateOverflow method.
		__inRecalculateOverflow: false,

		// creates the overflow item.
		__createOverflowWidget: function () {

			var overflow = new qx.ui.menubar.Button();
			overflow.setAppearance("menubar/overflow");
			overflow.__spacer = new qx.ui.core.Spacer();

			var overflowMenu = new qx.ui.menu.Menu().set({
				position: "bottom-right"
			});
			overflow.setMenu(overflowMenu);

			this.add(overflow);
			this.setOverflowIndicator(overflow);

			// create the cloned overflow items.
			this.__updateOverflowItems();

			// update the overflow items when the overflow button or the overflow menu become visible.
			overflow.addListener("changeVisibility", this.__onOverflowChangeVisibility, this);
			overflowMenu.addListener("changeVisibility", this.__onOverflowChangeVisibility, this);
		},

		__onOverflowChangeVisibility: function (e) {

			if (e.getData() == "visible") {
				this.__updateOverflowItems();
			}
		},


		// destroys the overflow item.
		__destroyOverflowWidget: function () {

			var overflow = this.getOverflowIndicator();
			if (overflow) {
				this.setOverflowIndicator(null);
				overflow.destroy();
			}
		},

		// process menu items after they are removed from the tool bar.
		_afterRemoveChild: function (child) {

			// remove the overflow item along with the menu item.
			if (child.__overflowItem) {
				child.__overflowItem.destroy();
				child.__overflowItem = null;
			}
		},

		// ensures that all the tool items have their overflow clone
		// and that their position is reflected in the overflow.
		__updateOverflowItems: function () {

			var overflow = this.getOverflowIndicator();
			if (overflow == null)
				return;

			var toolItems = this.getChildren();
			var overflowMenu = overflow.getMenu();

			for (var i = 0; i < toolItems.length; i++) {

				var toolItem = toolItems[i];
				if (toolItem instanceof wisej.web.toolbar.Button
					|| toolItem instanceof wisej.web.toolbar.SplitButton) {

					var overflowItem = toolItem.__overflowItem;

					// create the cloned overflow item if it didn't exist.
					if (overflowItem == null) {

						overflowItem = new wisej.web.menu.MenuItem();
						overflowMenu.add(overflowItem);

						overflowItem.__toolItem = toolItem;
						toolItem.__overflowItem = overflowItem;

						// shadow events.
						overflowItem.addListener("execute", function () { this.__toolItem.fireEvent("execute"); });
					}
					else if (overflowMenu.indexOf(overflowItem) == -1) {

						overflowMenu.add(overflowItem);
					}

					// sync the overflow item with the corresponding toolbar item.
					overflowItem.setLabel(toolItem.getLabel());
					overflowItem.setEnabled(toolItem.getEnabled());
					overflowItem.setChecked(toolItem.getChecked());
					overflowItem.setVisibility((toolItem.isHidden() || toolItem.isVisible()) ? "excluded" : "visible");

					if (toolItem.getIcon())
						overflowItem.setIcon(toolItem.getIcon());
					else
						overflowItem.resetIcon();
				}
				else if (toolItem instanceof wisej.web.toolbar.Separator)
				{
					var overflowItem = toolItem.__overflowItem;

					// create the cloned overflow item if it didn't exist.
					if (overflowItem == null) {

						overflowItem = new wisej.web.menu.MenuSeparator();
						overflowItem.__toolItem = toolItem;
						overflowMenu.add(overflowItem);

						toolItem.__overflowItem = overflowItem;
					}
					else if (overflowMenu.indexOf(overflowItem) == -1) {

						overflowMenu.add(overflowItem);
					}

					// sync the overflow item with the corresponding toolbar item.
					overflowItem.setVisibility((toolItem.isHidden() || toolItem.isVisible()) ? "excluded" : "visible");
				}
			}
		},

		// overridden to eliminate the minimum width.
		_computeSizeHint: function () {

			var hint = this.base(arguments);
			hint.minWidth = 0;
			return hint;

		},

		// overridden
		_applyOverflowHandling: function (value, old) {

			this.base(arguments, value, old);

			if (value) {
				this.__createOverflowWidget();
				this.addListener("showItem", this.__onShowItem, this);
				this.addListener("hideItem", this.__onHideItem, this);
			}
			else {
				this.__destroyOverflowWidget();
				this.removeListener("showItem", this.__onShowItem, this);
				this.removeListener("hideItem", this.__onHideItem, this);
			}
		},

		// handles overflow items once they become visible again.
		__onShowItem: function (e) {

			var toolItem = e.getData();

			// hide the cloned overflow item since now this menu item is visible.
			var overflowItem = toolItem.__overflowItem;

			if (overflowItem != null)
				overflowItem.exclude();

			// restore the popup menu position: when the menu
			// items are visible on the menu bar, child popups
			// are displayed bottom-left aligned.
			if (toolItem.getMenu) {
				var popupMenu = toolItem.getMenu();
				if (popupMenu) {
					toolItem.setMenu(popupMenu);
					popupMenu.setOpener(toolItem);
					popupMenu.setPosition("bottom-left");
				}
			}
		},

		// handles overflow items once they are hidden.
		__onHideItem: function (e) {

			var toolItem = e.getData();
			var overflowItem = toolItem.__overflowItem;

			if (overflowItem != null) {

				// change the popup menu alignment: when the menu item is
				// hidden, its overflow clone shows its popup menu with the child items
				// right-top aligned.
				if (toolItem.getMenu) {
					var popupMenu = toolItem.getMenu();
					if (popupMenu) {
						overflowItem.setMenu(popupMenu);
						popupMenu.setOpener(overflowItem);
						popupMenu.setPosition("right-top");
					}

					// share the popup menu and show the overflow clone.
					overflowItem.setMenu(popupMenu);
				}

				overflowItem.show();
			}
		},

		// when the overflow becomes visible it is added to the toolbar
		// together with a spacer to ensure that it's aligned to the right.
		_recalculateOverflow: function (width, requiredWidth) {

			if (this.isDisposed())
				return;
			if (this.__inRecalculateOverflow)
				return;

			this.invalidateLayoutCache();
			requiredWidth = this._getContentHint().width;
			this.base(arguments, width, requiredWidth);

			// our toolbars are dynamic - items are added/removed live - therefore
			// we need to add/remove the spacer together with the overflow indicator otherwise
			// newly added items will dock to the right.
			this.__inRecalculateOverflow = true;
			try {
				var overflow = this.getOverflowIndicator();
				if (overflow) {

					if (overflow.isVisible()) {
						this.add(overflow);
						this.addBefore(overflow.__spacer, overflow, { flex: 1 });
					}
					else {
						if (this.indexOf(overflow.__spacer) > -1)
							this.remove(overflow.__spacer);
					}
				}
			} finally {

				this.__inRecalculateOverflow = false;

			}

		},

		// overridden to dispose the overflow indicator space.
		dispose: function () {

			this.base(arguments);

			var overflow = this.getOverflowIndicator();
			if (overflow && overflow.__spacer) {
				overflow.__spacer.destroy();
				overflow.__spacer = null;
			}
		},
	},
});


/**
 * wisej.web.toolbar.Button
 */
qx.Class.define("wisej.web.toolbar.Button", {

	extend: qx.ui.toolbar.Button,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejComponent],

	construct: function () {

		this.base(arguments);

		this.setRich(true);
		this.setCenter(true);
		this.setKeepFocus(true);

	},

	properties: {

		// appearance
		appearance: { init: "$parent/button", refine: true },

		/**
		 * IconSize property.
		 *
		 * Gets or sets the size of the icon.
		 */
		iconSize: { init: null, nullable: true, check: "Map", apply: "_applyIconSize", themeable: true },

		/**
		 * SizeMode property.
		 *
		 * Determines how the toolbar item is resized.
		 */
		sizeMode: { init: "auto", check: ["auto", "fill"], apply: "_applySizeMode" },

	},

	members: {

		/**
		 * @lint ignoreReferenceField(_forwardStates)
		 */
		_forwardStates:
		{
			focused: true,
			hovered: true,
			pressed: true,
			disabled: true,
			checked: true
		},

		// cloned overflow item.
		__overflowItem: null,

		// shadowed hidden flag. used to preserve visibility in the overflow menu.
		__hidden: false,

		/**
		 * Gets/Sets the visible property.
		 */
		getVisible: function () {

			return this.isVisible();

		},
		setVisible: function (value) {

			this.__hidden = !value;
			this.setVisibility(value ? "visible" : "excluded");

			if (this.__overflowItem)
				this.__overflowItem.setVisibility(value ? "visible" : "excluded");

		},
		isHidden: function () {
			return this.__hidden;
		},

		/**
		 * Gets/Sets the checked property.
		 */
		getChecked: function () {

			return this.hasState("checked");

		},
		setChecked: function (value) {

			value
				? this.addState("checked")
				: this.removeState("checked");

		},

		// overridden.
		_applyAppearance: function (value, old) {

			if (value == null) {
				this.resetAppearance();
				return;
			}

			this.base(arguments, value, old);
		},

		/**
		 * Applies the sizeMode property.
		 */
		_applySizeMode: function (value, old) {

			this.setLayoutProperties({ flex: value == "fill" ? 1 : 0 });
		},

		/**
		 * Applies the IconSize property.
		 *
		 * Sets the size of the icon child widget.
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
	},

	destruct: function () {

		var overflowItem = this.__overflowItem;
		if (overflowItem) {
			overflowItem.destroy();
			this.__overflowItem = null;
		}
	}

});


/**
 * wisej.web.toolbar.SplitButton
 */
qx.Class.define("wisej.web.toolbar.SplitButton", {

	extend: qx.ui.toolbar.SplitButton,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejComponent],

	construct: function () {

		this.base(arguments);

		this.setKeepFocus(true);

		this.getChildControl("button").set({
			rich: true,
			center: true,
			keepFocus: true
		});

		this.addListener("pointerdown", this._onPointerDown, this);
		this.addListener("pointerup", this._onPointerUp, this);

	},

	properties: {

		// appearance
		appearance: { init: "$parent/splitbutton", refine: true },

		/**
		 * ButtonMenu property.
		 *
		 * Assigns the menu to the button and changes the button to a menu-button component.
		 */
		buttonMenu: { init: null, nullable: true, apply: "_applyButtonMenu", transform: "_transformMenu" },

		/**
		 * Configure the visibility of the sub elements/widgets.
		 * Possible values: both, label, icon
		 */
		show: { init: "both", check: ["both", "label", "icon"], apply: "_applyShow" },

		/**
		 * The position of the icon in relation to the text.
		 * Only useful/needed if text and icon is configured and 'show' is configured as 'both' (default)
		 */
		iconPosition: { init: "left", check: ["top", "right", "bottom", "left"], apply: "_applyIconPosition" },

		/**
		 * IconSize property.
		 *
		 * Gets or sets the size of the icon.
		 */
		iconSize: { init: null, nullable: true, check: "Map", apply: "_applyIconSize", themeable: true },

		/**
		 * SizeMode property.
		 *
		 * Determines how the toolbar item is resized.
		 */
		sizeMode: { init: "auto", check: ["auto", "fill"], apply: "_applySizeMode" },
	},

	members: {

		/**
		 * @lint ignoreReferenceField(_forwardStates)
		 */
		_forwardStates:
		{
			focused: true,
			hovered: true,
			pressed: true,
			disabled: true,
			checked: true
		},

		// cloned overflow item.
		__overflowItem: null,

		// shadowed hidden flag. used to preserve visibility in the overflow menu.
		__hidden: false,

		/**
		 * Gets/Sets the visible property.
		 */
		getVisible: function () {

			return this.isVisible();

		},
		setVisible: function (value) {

			this.__hidden = !value;
			this.setVisibility(value ? "visible" : "excluded");

			if (this.__overflowItem)
				this.__overflowItem.setVisibility(value ? "visible" : "excluded");
		},
		isHidden: function () {
			return this.__hidden;
		},

		/**
		 * Gets/Sets the checked property.
		 */
		getChecked: function () {

			return this.hasState("checked");

		},
		setChecked: function (value) {

			value
				? this.addState("checked")
				: this.removeState("checked");

		},

		// overridden.
		_applyAppearance: function (value, old) {

			if (value == null) {
				this.resetAppearance();
				return;
			}

			this.base(arguments, value, old);
		},

		/**
		 * Applies the sizeMode property.
		 */
		_applySizeMode: function (value, old) {

			this.setLayoutProperties({ flex: value == "fill" ? 1 : 0 });
		},

		/**
		 * Applies the buttonMenu property.
		 */
		_applyButtonMenu: function (value, old) {

			this.setMenu(value);

			if (value)
				value.setPosition("bottom-left");
		},

		/**
		 * Applies the show property.
		 */
		_applyShow: function (value, old) {

			this.getChildControl("button").setShow(value);

		},

		/**
		 * Applies the iconPosition property.
		 */
		_applyIconPosition: function (value, old) {

			this.getChildControl("button").setIconPosition(value);

		},

		/**
		 * Applies the IconSize property.
		 *
		 * Sets the size of the icon child widget.
		 */
		_applyIconSize: function (value, old) {

			var icon = this.getChildControl("button").getChildControl("icon");

			if (value) {
				icon.setWidth(value.width);
				icon.setHeight(value.height);
				icon.getContentElement().setStyle("background-size", value.width + "px " + value.height + "px");
			}
			else {
				icon.resetWidth();
				icon.resetHeight();
			}
		},

		/**
		 * Returns the widget to use to apply the background style by wisej.mixin.MBackgroundImage.
		 */
		_getBackgroundWidget: function () {

			return this.getChildControl("button");

		},

		/**
		 * Event listener for visibility changes of the menu.
		 * Overridden to fire the "open" event when the menu is opened.
		 *
		 * @param e {qx.event.type.Data} property change event
		 */
		_onChangeMenuVisibility: function (e) {

			this.base(arguments, e);

			if (this.getMenu().isVisible())
				this.fireEvent("open");
		},

		/**
		 * Listener method for "pointerup" just to
		 * add/remove the pressed state.
		 */
		_onPointerDown: function (e) {

			if (!e.isLeftPressed())
				return;

			this.addState("pressed");
		},

		/**
		 * Listener method for "pointerup" just to
		 * add/remove the pressed state.
		 */
		_onPointerUp: function (e) {
			this.removeState("pressed");
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "button":
					control = this.base(arguments, id, hash);
					control._forwardStates.checked = true;
					control._forwardStates.pressed = true;
					control.addListener("pointerdown", this._onPointerDown, this);
					control.addListener("pointerup", this._onPointerUp, this);
					break;

				case "arrow":
					control = this.base(arguments, id, hash);
					control._forwardStates.checked = true;
					control._forwardStates.pressed = true;
					break;
			}

			return control || this.base(arguments, id);
		},
	},

	destruct: function () {

		var overflowItem = this.__overflowItem;
		if (overflowItem) {
			overflowItem.destroy();
			this.__overflowItem = null;
		}
	}

});


/**
 * wisej.web.toolbar.Separator
 */
qx.Class.define("wisej.web.toolbar.Separator", {

	extend: qx.ui.toolbar.Separator,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejComponent],

	properties: {

		// appearance
		appearance: { init: "$parent/separator", refine: true },

		/**
		 * SizeMode property.
		 *
		 * Determines how the toolbar item is resized.
		 */
		sizeMode: { init: "auto", check: ["auto", "fill"], apply: "_applySizeMode" },
	},

	members: {

		// cloned overflow item.
		__overflowItem: null,

		// shadowed hidden flag. used to preserve visibility in the overflow menu.
		__hidden: false,

		/**
		 * Gets/Sets the visible property.
		 */
		getVisible: function () {

			return this.isVisible();

		},
		setVisible: function (value) {

			this.__hidden = !value;
			this.setVisibility(value ? "visible" : "excluded");

			if (this.__overflowItem)
				this.__overflowItem.setVisibility(value ? "visible" : "excluded");
		},
		isHidden: function () {
			return this.__hidden;
		},

		// overridden.
		_applyAppearance: function (value, old) {

			if (value == null) {
				this.resetAppearance();
				return;
			}

			this.base(arguments, value, old);
		},

		/**
		 * Applies the sizeMode property.
		 */
		_applySizeMode: function (value, old) {

			this.setLayoutProperties({ flex: value == "fill" ? 1 : 0 });
		},
	}

});