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
 * wisej.web.menu.MenuBar
 * 
 *  Represents a menu bar component. It may be used as the main menu in a form.
 */
qx.Class.define("wisej.web.menu.MenuBar", {

	extend: qx.ui.menubar.MenuBar,

	// All Wisej menu classes must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejMenu],

	properties: {

		// overridden.
		appearance: { init: "menubar", refine: true },

	},

	members: {

		// avoid re-entering the recalculateOverflow method.
		__inRecalculateOverflow: false,

		// creates the overflow item.
		__createOverflowWidget: function () {

			var overflow = new qx.ui.menubar.Button();
			overflow.setAppearance("menubar/overflow");
			overflow.syncAppearance();
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

		// process menu items after they are removed from the menu bar.
		_afterRemoveChild: function (child) {

			// remove the overflow item along with the menu item.
			if (child.__overflowItem) {
				child.__overflowItem.destroy();
				child.__overflowItem = null;
			}
		},

		// ensures that all the menu items have their overflow clone
		// and that their position is reflected in the overflow.
		__updateOverflowItems: function () {

			var overflow = this.getOverflowIndicator();
			if (overflow == null)
				return;

			var menuItems = this.getChildren();
			var overflowMenu = overflow.getMenu();

			for (var i = 0; i < menuItems.length; i++) {

				var menuItem = menuItems[i];
				if (menuItem instanceof wisej.web.menu.MenuBarItem) {

					var overflowItem = menuItem.__overflowItem;

					// create the cloned overflow item if it didn't exist.
					if (overflowItem == null) {

						overflowItem = new wisej.web.menu.MenuItem();
						overflowMenu.add(overflowItem);

						overflowItem.__menuItem = menuItem;
						menuItem.__overflowItem = overflowItem;

						// shadow events.
						overflowItem.addListener("execute", function () { this.__menuItem.fireEvent("execute"); });
						overflowItem.addListener("mouseover", function () { this.__menuItem.fireEvent("mouseover"); });
					}
					else if (overflowMenu.indexOf(overflowItem) == -1) {

						overflowMenu.add(overflowItem);
					}

					// sync the overflow item with the corresponding menu item.
					overflowItem.setIcon(menuItem.getIcon());
					overflowItem.setLabel(menuItem.getLabel());
					overflowItem.setEnabled(menuItem.getEnabled());
					overflowItem.setVisibility((menuItem.isHidden() || menuItem.isVisible()) ? "excluded" : "visible");
				}
				else if (menuItem instanceof wisej.web.menu.MenuSeparator) {
					var overflowItem = menuItem.__overflowItem;

					// create the cloned overflow item if it didn't exist.
					if (overflowItem == null) {

						overflowItem = new wisej.web.menu.MenuSeparator();
						overflowItem.__menuItem = menuItem;
						overflowMenu.add(overflowItem);
						menuItem.__overflowItem = overflowItem;
					}
					else if (overflowMenu.indexOf(overflowItem) == -1) {

						overflowMenu.add(overflowItem);
					}

					// sync the overflow item with the corresponding menu item.
					overflowItem.setVisibility((menuItem.isHidden() || menuItem.isVisible()) ? "excluded" : "visible");
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

			if (old) {
				this.__destroyOverflowWidget();
				this.removeListener("showItem", this.__onShowItem, this);
				this.removeListener("hideItem", this.__onHideItem, this);
			}

			if (value) {
				this.__createOverflowWidget();
				this.addListener("showItem", this.__onShowItem, this);
				this.addListener("hideItem", this.__onHideItem, this);
			}
		},

		// handles overflow items once they become visible again.
		__onShowItem: function (e) {

			var menuItem = e.getData();

			// hide the cloned overflow item since now this menu item is visible.
			var overflowItem = menuItem.__overflowItem;

			if (overflowItem != null)
				overflowItem.exclude();

			// restore the popup menu position: when the menu
			// items are visible on the menu bar, child popups
			// are displayed bottom-left aligned.
			if (menuItem.getMenu) {
				var popupMenu = menuItem.getMenu();
				if (popupMenu) {
					menuItem.setMenu(popupMenu);
					popupMenu.setOpener(menuItem);
					popupMenu.setPosition("bottom-left");
				}
			}
		},

		// handles overflow items once they are hidden.
		__onHideItem: function (e) {

			var menuItem = e.getData();
			var overflowItem = menuItem.__overflowItem;

			if (overflowItem != null) {

				// change the popup menu alignment: when the menu item is
				// hidden, its overflow clone shows its popup menu with the child items
				// right-top aligned.
				if (menuItem.getMenu) {
					var popupMenu = menuItem.getMenu();
					if (popupMenu) {
						overflowItem.setMenu(popupMenu);
						popupMenu.setOpener(overflowItem);
						popupMenu.setPosition("right-top");
					}
				}

				overflowItem.show();
			}
		},

		// when the overflow becomes visible it is added to the menubar
		// together with a spacer to ensure that it's aligned to the right.
		_recalculateOverflow: function (width, requiredWidth) {

			if (this.isDisposed())
				return;
			if (this.__inRecalculateOverflow)
				return;

			// this.invalidateLayoutCache();
			// requiredWidth = this.getSizeHint().width;
			this.base(arguments, width, requiredWidth);

			// our menus are dynamic - items are added/removed live - therefore
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
	},

	destruct: function () {

		var overflow = this.getOverflowIndicator();
		if (overflow && overflow.__spacer) {
			overflow.__spacer.destroy();
			overflow.__spacer = null;
		}
	}
});


/**
 * wisej.web.menu.MainMenu
 * 
 *  Represents the main menu component in a form.
 */
qx.Class.define("wisej.web.menu.MainMenu", {

	extend: wisej.web.menu.MenuBar,

	properties: {

		// overridden.
		appearance: { init: "mainmenu", refine: true },

	},

});


/**
 * wisej.web.menu.ontextMenu
 * 
 *  Represents a context menu component.
 */
qx.Class.define("wisej.web.menu.ContextMenu", {

	extend: qx.ui.menu.Menu,

	// All Wisej menu classes must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejMenu],

	members: {

		/**
		 * Shows the context menu at the position.
		 *
		 * @param opener {Widget} the widget used to position the context menu.
		 * @param offset {Array} shorthand "offsetTop", "offsetRight", "offsetBottom", "offsetLeft",
		 * @param position {String} on of the placement values defined in {@link qx.ui.core.MPlacement.position}.
		 */
		show: function (opener, offset, position) {

			this.setOffset(0);

			if (opener) {

				// retrieve the header widget if the opened is a column header.
				if (opener instanceof wisej.web.datagrid.ColumnHeader)
					opener = opener.getHeaderWidget();
				// retrieve the TabPage button, if the opener is a TabPage.
				if (opener instanceof qx.ui.tabview.Page)
					opener = opener.getButton();

				this.setOpener(opener);

				offset = offset || [0, 0, 0, 0];
				opener = opener.getChildrenContainer ? opener.getChildrenContainer() : opener;

				if (opener && opener.getBounds()) {

					if (position === "rightTop")
						offset[3] -= opener.getBounds().width;
				}

				this.setOffset(offset);

				if (position)
					this.setPosition(qx.lang.String.hyphenate(position));

				this.setPlacementModeX("best-fit");
				this.setPlacementModeY("best-fit");
				this.placeToWidget(opener, true);
			}
			else if (offset != null) {

				this.placeToPoint({ left: offset[3], top: offset[0] });
			}

			this.base(arguments);

			this.fireDataEvent("show", this.getOpener());
		},

		/**
		 * Opens the menu at the pointer position
		 *
		 * @param e {qx.event.type.Pointer} Pointer event to align to
		 */
		openAtPointer: function (e) {

			var opener = e.getTarget();
			opener = wisej.utils.Widget.findWisejComponent(opener, true /* excludeInner */);

			this.setOffset(0);
			this.setOpener(opener);
			this.placeToPointer(e);
			this.__updateSlideBar();
			this.show();

			this._placementTarget = {
				left: e.getDocumentLeft(),
				top: e.getDocumentTop()
			};
		},

		/**
		 * Shorthand to add a separator.
		 */
		addSeparator: function () {
			this.add(new wisej.web.menu.MenuSeparator);
		}

	},
});


/**
 * wisej.web.menu.MenuBarItem
 * 
 *  Represents the menu item in a main menu or menu bar.
 */
qx.Class.define("wisej.web.menu.MenuBarItem", {

	extend: qx.ui.menubar.Button,

	// All Wisej menu classes must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejMenu],

	properties: {

		appearance: { refine: true, init: "menubar/item" },

	},

	construct: function (label, icon, menu) {

		this.base(arguments, label, icon, menu);

		this.setRich(true);
		this.setKeepFocus(true);
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

		/**
		 * Process shortcuts.
		 */
		executeShortcut: function () {

			if (!this.isEnabled() || !this.isVisible())
				return false;

			// a parent menu item should open the child menu popup.
			if (this.getMenuItems().length > 0) {
				this.open();
			}
			else {
				this.execute();
			}

			return true;
		},

		/**
		 * Process mnemonics.
		 */
		executeMnemonic: function () {

			if (!this.isEnabled() || !this.isVisible())
				return false;

			// a parent menu item should open the child menu popup.
			if (this.getMenuItems().length > 0) {
				this.open();
			}
			else {
				this.execute();
			}

			return true;
		},
	},

	destruct: function () {

		var overflowItem = this.__overflowItem;
		if (overflowItem) {
			overflowItem.destroy();
			this.__overflowItem = null;
		}
	},

});


/**
 * wisej.web.menu.MenuItem
 * 
 *  Represents the menu item in a menu popup.
 */
qx.Class.define("wisej.web.menu.MenuItem", {

	extend: qx.ui.menu.AbstractButton,

	// All Wisej menu classes must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejMenu],

	construct: function (label, icon, command, menu) {

		this.base(arguments);

		if (label != null)
			this.setLabel(label);

		if (icon != null)
			this.setIcon(icon);

		if (command != null)
			this.setCommand(command);

		if (menu != null)
			this.setMenu(menu);

		this.setKeepFocus(true);

		// enable html content.
		this.getChildControl("label").setRich(true);

		// update the UI when the shortcut changes.
		this.addListener("changeShortcut", this._onChangeShortcut, this);
	},

	properties: {

		appearance: { refine: true, init: "menu/item" },

		/**
		 * Checked property.
		 *
		 * Shows a check mark next to the menu item.
		 */
		checked: { init: false, check: "Boolean", apply: "_applyChecked" },

		/**
		 * RadioCheck property.
		 *
		 * Indicates whether the menu item, if checked, displays a radio-button instead of a check mark.
		 */
		radioCheck: { init: false, check: "Boolean", apply: "_applyRadioCheck" },
	},

	members: {

		/**
		 * Gets/Sets the visible property.
		 */
		getVisible: function () {

			return this.isVisible();

		},
		setVisible: function (value) {

			this.setVisibility(value ? "visible" : "excluded");
		},

		/**
		  * Positions and shows the attached menu widget.
		  *
		  * @param selectFirst {Boolean?false} Whether the first menu button should be selected
		  */
		open: function (selectFirst) {

			var menu = this.getMenu();

			if (menu) {

				menu.open();

				// select first item.
				if (selectFirst) {
					var first = menu.getSelectables()[0];
					if (first) {
						menu.setSelectedButton(first);
					}
				}
			}
		},

		// overridden
		_onTap: function (e) {

			// if the tap landed on an <a> internal element, don't execute
			// the action, let the system handle the event and close the menu.
			var node = e.getOriginalTarget();
			if (node && node.tagName == "A" && node.href) {
				return;
			}

			// don't close menus if the button is a sub menu button
			if (e.isLeftPressed() && this.getMenu()) {
				this.execute();
				this.open();
				return;
			}

			this.base(arguments, e);
		},

		// update the UI when the shortcut changes.
		_onChangeShortcut: function (e) {

			var shortcut = e.getData();
			var cmdString = shortcut != null ? shortcut.toString() : "";
			this.getChildControl("shortcut").setValue(cmdString);
		},

		/**
		 * Applies the checked property.
		 */
		_applyChecked: function (value, old) {

			// reset the icon to the theme.
			// the app may change the icon after setting the checked property
			// to change the check mark icon.
			this.resetIcon();

			value
				? this.addState("checked")
				: this.removeState("checked");
		},

		/**
		 * Applies the radioCheck property.
		 */
		_applyRadioCheck: function (value, old) {

			value
				? this.addState("radio")
				: this.removeState("radio");
		},

		/**
		 * Process shortcuts.
		 */
		executeShortcut: function () {

			if (!this.isEnabled() || !this.isVisible())
				return false;

			this.execute();
			return true;
		},

		/**
		 * Process mnemonics.
		 */
		executeMnemonic: function () {

			if (!this.isEnabled() || !this.isVisible())
				return false;

			// mnemonics on a parent menu item should open the child menu popup.
			if (this.getMenuItems().length > 0) {
				this.open();
			}
			else {
				this.execute();
			}

			return true;
		},
	},

	destruct: function () {

		this.__menuItem = null;

	},

});


/**
 * wisej.web.menu.MenuSeparator
 * 
 *  Represents a separator item in the menu.
 */
qx.Class.define("wisej.web.menu.MenuSeparator", {

	extend: qx.ui.menu.Separator,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejMenu],

	properties: {

		appearance: { refine: true, init: "menu/separator" },

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
	}
});


/**
 * wisej.web.menu.LinkMenuItem
 * 
 *  Represents a menu item that acts as a regular link.
 */
qx.Class.define("wisej.web.menu.LinkMenuItem", {

	extend: wisej.web.menu.MenuItem,

	properties: {

		/**
		 * HRef property.
		 */
		href: { init: "#", check: "String", apply: "_applyHref" },

		/**
		 * Target property.
		 */
		target: { init: "", check: "String", apply: "_applyTarget" },

	},

	members: {

		/**
		 * Applies the href property.
		 */
		_applyHref: function (value, old) {
			this.getContentElement().setAttribute("href", value || "#");
		},

		/**
		 * Applies the target property.
		 */
		_applyTarget: function (value, old) {
			this.getContentElement().setAttribute("target", value);
		},

		// overridden
		_onTap: function (e) {
			setTimeout(function () {
				qx.ui.menu.Manager.getInstance().hideAll()
			}, 500);
		},

		/**
		 * Creates the content element. The style properties
		 * position and zIndex are modified from the Widget
		 * core.
		 *
		 * This function may be overridden to customize a class
		 * content.
		 *
		 * @return {qx.html.Element} The widget's content element
		 */
		_createContentElement: function () {
			return new qx.html.Element("a", {
				overflowX: "hidden",
				overflowY: "hidden"
			}, {
				href: this.getHref(),
				target: this.getTarget()
			});
		}
	}
});


/**
 * wisej.web.menu.LinkMenuItem
 * 
 *  Represents a menu item that acts as a regular link in a main menu or menu bar.
 */
qx.Class.define("wisej.web.menu.LinkMenuBarItem", {

	extend: wisej.web.menu.MenuBarItem,

	properties: {

		/**
		 * HRef property.
		 */
		href: { init: "#", check: "String", apply: "_applyHref" },

		/**
		 * Target property.
		 */
		target: { init: "", check: "String", apply: "_applyTarget" },

	},

	members: {

		/**
		 * Applies the href property.
		 */
		_applyHref: function (value, old) {
			this.getContentElement().setAttribute("href", value || "#");
		},

		/**
		 * Applies the target property.
		 */
		_applyTarget: function (value, old) {
			this.getContentElement().setAttribute("target", value);
		},

		/**
		 * Creates the content element. The style properties
		 * position and zIndex are modified from the Widget
		 * core.
		 *
		 * This function may be overridden to customize a class
		 * content.
		 *
		 * @return {qx.html.Element} The widget's content element
		 */
		_createContentElement: function () {
			return new qx.html.Element("a", {
				overflowX: "hidden",
				overflowY: "hidden"
			}, {
				href: this.getHref(),
				target: this.getTarget()
			});
		}
	}


});