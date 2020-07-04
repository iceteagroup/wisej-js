//#Requires=wisej.web.ToolContainer.js

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
 * wisej.web.ListBox
 */
qx.Class.define("wisej.web.ListBox", {

	extend: qx.ui.form.List,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	implement: [wisej.web.toolContainer.IToolPanelHost],

	construct: function () {

		this.base(arguments);

		// add local state properties.
		this.setStateProperties(this.getStateProperties().concat(["topIndex"]));
		// add local state events.
		this.setStateEvents(this.getStateEvents().concat(["scrollAnimationYEnd"]));

		this.addListener("changeSelection", this.__onChangeSelection);

		// adds the inner target to the drop & drop event object.
		this.addListener("drop", this._onDragEvent, this);
		this.addListener("dragover", this._onDragEvent, this);

		// auto select the item when dragging starts.
		this.addListener("dragstart", this._onDragStart, this);

		this.addState("multiline");
	},

	properties: {

		/**
		 * items property.
		 *
		 * Sets the items in the dropdown list.
		 * Property defined with the setter/getter methods to save memory and not save a copy of the items.
		 */
		// items: { init: null, check: "Map", nullable: true, apply: "_applyItems" },

		/**
		 * selectionMode override.
		 *
		 * Converts Wisej SelectionMode to the correct value for the QX platform.
		 */
		selectionMode: { refine: true, check: ["none", "one", "multiSimple", "multiExtended"], apply: "_applySelectionMode" },

		/**
		 * SelectedIndices property.
		 *
		 * Gets or sets the indices of the selected items.
		 * Property defined with the setter/getter methods.
		 */
		// selectedIndices: { check: "Array", apply: "_applySelectedIndices" },

		/**
		 * TopIndex property.
		 * Property defined with the setter/getter methods.
		 */
		// topIndex: { check: "Integer", apply: "_applyTopIndex" },

		/**
		 * ReadOnly property.
		 */
		readOnly: { check: "Boolean", apply: "_applyReadOnly", init: false },

		/**
		 * Tools property.
		 *
		 * Collection of tool definitions to display on top of the listbox.
		 */
		tools: { check: "Array", apply: "_applyTools" },

		/**
		 * ItemHeight property.
		 *
		 * Sets the height of the items in the drop-down list in pixels.
		 * When set to <code>null</code> or 0 it uses the value in the theme if present otherwise it adapts to the
		 * size of the items. The default is null;
		 *
		 * For the VirtualComboBox, all items must have the same height so when this value is null, it uses the
		 * height of the largest item used also to calculate he maximum width.
		 *
		 */
		itemHeight: { init: 24, check: "Integer", apply: "_applyItemHeight", nullable: true, themeable: true },

		/**
		 * Determines the appearance of child items.
		 */
		itemAppearance: { init: "listitem", themeable: true },

		/**
		 * LazyLoad property.
		 * 
		 * When true, it loads the items when the list becomes visible.
		 */
		lazyLoad: { init: false, check: "Boolean" },

		/**
		 * RightClickSelection property.
		 * 
		 * Determines whether a right click event ("contextmenu") selects the node under the pointer.
		 */
		rightClickSelection: { init: false, check: "Boolean", apply: "_applyRightClickSelection" },

		/**
		 * IncrementalSelection property.
		 * 
		 * Determines whether items are selected incrementally as the user types within a 1 second timeout.
		 */
		incrementalSelection: { init: true, check: "Boolean" }

	},

	members: {

		// suspend event dispatching.
		__suspendEvents: false,

		// delayed selection when lazy loading is on.
		__lazySelectedIndices: null,

		/**
		 * Applies the readOnly property.
		 */
		_applyReadOnly: function (value, old) {

			if (value)
				this.addState("readonly");
			else
				this.removeState("readonly");

			this.setEnableInlineFind(!value);

			// preserve the selection when toggling read-only mode.
			this.__suspendEvents = true;
			var selection = this.getSelection();
			this._applySelectionMode(value ? "none" : this.getSelectionMode());
			this.setSelection(selection);
			this.__suspendEvents = false;
		},

		/**
		 * Applies the selectionMode property.
		 */
		_applySelectionMode: function (value, old) {

			if (this.isReadOnly())
				value = "none";

			switch (value) {
				case "none": value = "none"; break;
				case "one": value = "single"; break;
				case "multiSimple": value = "additive"; break;
				case "multiExtended": value = "multi"; break;
			}

			this.base(arguments, value, old);
		},

		/**
		 * Applies the appearance property.
		 *
		 * Overridden to update the appearance immediately
		 * to receive the correct value of itemAppearance in case
		 * it's defined in the theme.
		 */
		_applyAppearance: function (value, old) {

			this.syncAppearance();
		},

		/**
		 * Applies the items property.
		 */
		setItems: function (value, old) {

			var items = value;

			if (items == null) {

				// schedule lazy loading.
				if (this.isLazyLoad()) {

					qx.event.Timer.once(function () {
						this.fireEvent("load");
					}, this, 0);

					this.setLazyLoad(false);
				}

				return;
			}

			this.__suspendEvents = true;
			try {

				// clear?
				if (items.clear) {
					this.resetSelection();
					this.destroyChildren();
				}

				var index, item;
				var children = this.getChildren();

				// add new items.
				if (items.added && items.added.length > 0) {
					var added = items.added;
					for (var i = 0; i < added.length; i++) {
						index = added[i].index;
						item = this._createListItem(added[i]);
						this.addAt(item, index);
					}

					// re-read the children collection, if it was empty
					// it was a clone and now we'd still have an empty collection.
					children = this.getChildren();
				}

				// apply modified items.
				if (items.modified && items.modified.length > 0) {
					var modified = items.modified;
					for (var i = 0; i < modified.length; i++) {
						index = modified[i].index;

						if (index < 0 || index >= children.length)
							throw new Error("index out of bounds: " + index + " (0.." + children.length + ")");

						children[index].set(modified[i]);
					}
				}

				// remove deleted items.
				if (items.deleted && items.deleted.length > 0) {
					var deleted = items.deleted;
					for (var i = deleted.length - 1; i >= 0; i--) {

						index = deleted[i];

						if (index < 0 || index >= children.length)
							throw new Error("index out of bounds: " + index + " (0.." + children.length + ")");

						children[index].destroy();
					}
				}

				// align the indexes of the items if items have been added or deleted.
				if (!items.clear && (items.added || items.deleted)) {
					for (var i = 0, l = children.length; i < l; i++) {
						children[i].setIndex(i);
					}
				}

				// update the listbox container for the horizontal scrollbar.
				if (!items.clear && (items.added || items.deleted || items.modified)) {
					qx.ui.core.queue.Layout.add(this);
				}

				// apply the deferred selection now that we have the items.
				if (this.__lazySelectedIndices) {
					this.setSelectedIndices(this.__lazySelectedIndices);
				}

			} finally {

				this.__suspendEvents = false;
				this.__lazySelectedIndices = null;
			}
		},

		/**
		 * Applies the ItemHeight property.
		 */
		_applyItemHeight: function (value, old) {

			if (value === null || value < 0) {
				this.resetItemHeight();
				return;
			}

			var items = this.getChildren();
			for (var i = 0; i < items.length; i++) {
				items[i].setHeight(value);
			}
		},

		/**
		 * Applies the RightClickSelection property.
		 */
		_applyRightClickSelection: function (value, old) {

			if (!value && old)
				this.removeListener("contextmenu", this._onRightClick, this);

			if (value && !old)
				this.addListener("contextmenu", this._onRightClick, this);
		},

		/**
		 * Handles right clicks to select the node when rightClickSelection is true.
		 */
		_onRightClick: function (e) {

			if (this.getSelectionMode() !== "none" && !this.isReadOnly()) {
				var item = e.getTarget();
				if (item instanceof wisej.web.listbox.ListItem) {
					this.setSelection([item]);
				}
			}
		},

		/**
		 * TopIndex property.
		 */
		getTopIndex: function () {

			var items = this.getChildren();
			if (items.length < 2)
				return 0;

			var scrollY = this.getScrollY(), item, bounds;
			for (var i = 0; i < items.length; i++) {
				item = items[i];
				bounds = item.getBounds();
				if (!bounds)
					break;

				// include items that are half visible.
				if (bounds.top + bounds.height / 2 >= scrollY)
					return i;
			}

			return 0;
		},
		setTopIndex: function (value) {

			var items = this.getChildren();
			if (items.length < 2)
				return;

			if (value < 0 || value >= items.length)
				return;

			this.scrollChildIntoViewY(items[value], "top");
		},

		/**
		 * SelectedIndices property.
		 */
		getSelectedIndices: function () {

			var indices = [];
			var selection = this.getSelection();
			for (var i = 0; i < selection.length; i++) {
				var index = selection[i].getIndex();
				if (index > -1)
					indices.push(index);
			}
			return indices;
		},
		setSelectedIndices: function (value) {

			if (this.isLazyLoad()) {
				// save the selection for later.
				this.__lazySelectedIndices = value;
				return;
			}

			this.__suspendEvents = true;
			try {

				if (value == null || value.length == 0) {
					this.resetSelection();
				}
				else {
					var items = [];
					var children = this.getChildren();
					for (var i = 0; i < value.length; i++) {
						var index = value[i];
						if (index > -1) {
							items.push(children[index]);
						}
					}

					this.setSelection(items);
				}
			} finally {

				this.__suspendEvents = false;
			}
		},

		/** 
		 * Applies the tools property.
		 */
		_applyTools: function (value, old) {

			var tools = this.getChildControl("tools", true);

			if (value == null || value.length == 0) {
				if (tools)
					tools.exclude();
				return;
			}

			tools = this.getChildControl("tools");
			tools.show();

			wisej.web.ToolContainer.add(this, tools);
			wisej.web.ToolContainer.install(this, tools, value, "left", { row: 0, column: 0 }, null, "listbox");
			wisej.web.ToolContainer.install(this, tools, value, "right", { row: 0, column: 1 }, null, "listbox");
		},

		/**
		 * Implements: wisej.web.toolContainer.IToolPanelHost.updateToolPanelLayout
		 * 
		 * Changes the layout of the tools container according to overlayed scrollbar option in the theme,
		 *
		 * @param toolPanel {wisej.web.toolContainer.ToolPanel} the panel that contains the two wise.web.ToolContainer widgets.
		 */
		updateToolPanelLayout: function (toolPanel) {

			if (toolPanel) {

				var layout = this._getLayout();
				if (layout instanceof qx.ui.layout.Grid) {

					layout.setRowFlex(0, 0);
					toolPanel.setLayoutProperties({ row: 0, column: 0, colSpan: 2 });

					this.getChildControl("pane").resetMargin();
					this.getChildControl("scrollbar-y").resetMargin();

					this._updateScrollAreaLayout();
				}
				// overlayed scrollbars.
				else if (layout instanceof qx.ui.layout.Canvas) {

					toolPanel.setLayoutProperties({ top: 0, left: 0, right: 0 });

					var size = toolPanel.getSizeHint();
					var pane = this.getChildControl("pane");
					var scrollbarY = this.getChildControl("scrollbar-y");
					pane.setMarginTop(size.height);
					scrollbarY.setMarginTop(size.height);
				}
			}
		},

		/**
		 * Process the selectionChange event and fire our "selectionChanged" event.
		 */
		__onChangeSelection: function (e) {

			if (this.__suspendEvents)
				return;

			var indices = this.getSelectedIndices();
			this.fireDataEvent("selectionChanged", indices);
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "pane":
					control = this.base(arguments, id);

					// change the layout to support horizontal scrolling.
					control._getLayout().dispose();
					control._setLayout(new qx.ui.layout.Basic());
					break;

				case "tools":
					control = new wisej.web.toolContainer.ToolPanel();
					break;
			}

			return control || this.base(arguments, id);
		},

		// overridden.
		_updateScrollAreaLayout: function (paneCell, controls) {

			// change the layout of the scroll area when we have a tools container.
			if (this.getChildControl("tools", true)) {
				this.base(arguments, { row: 1, column: 0 }, controls);
			}
			else {
				this.base(arguments, paneCell, controls);
			}
		},

		// overridden.
		getInnerSize: function () {
			var size = this.base(arguments);

			// reduce by the height of the tools container.
			var tools = this.getChildControl("tools", true);
			if (tools && tools.isVisible && tools.getBounds())
				size.height -= tools.getBounds().height;

			return size;
		},

		// overridden
		renderLayout: function (left, top, width, height) {

			this.base(arguments, left, top, width, height);

			this.__updateContainerWidth();

		},

		// Resizes the container to always fit the largest item
		// or the listbox container.
		__updateContainerWidth: function () {

			var children = this.getChildren();
			var width = this.getInnerSize().width;

			var overlayed = qx.core.Environment.get("os.scrollBarOverlayed");
			if (!overlayed) {
				var scrollbarY = this.getChildControl("scrollbar-y");
				if (scrollbarY.isVisible())
					width -= scrollbarY.getWidth();
			}

			if (children != null && children.length > 0) {
				for (var i = 0; i < children.length; i++)
					width = Math.max(width, children[i].getSizeHint().width);
			}

			this.getChildrenContainer().setWidth(width);
		},

		/**
		 * Creates the list item to add to the listbox.
		 */
		_createListItem: function (properties) {
			var item = new wisej.web.listbox.ListItem();
			item.setHeight(this.getItemHeight());
			item.setAppearance(this.getItemAppearance());
			item.set(properties);
			return item;
		},

		// determines the target item (index) for a drag operation
		// and adds it to the event object.
		_onDragEvent: function (e) {

			e.setUserData("eventData", null);
			var target = e.getOriginalTarget();
			if (target instanceof wisej.web.listbox.ListItem) {
				e.setUserData("eventData", target.getIndex());
			}
		},

		// select the item that initiated the drag operation.
		_onDragStart: function (e) {

			var item = e.getOriginalTarget();
			if (item instanceof qx.ui.form.ListItem)
				this.setSelection([item]);
		},

		// overridden.
		// handles the inline find.
		_onKeyInput: function (e) {

			this.base(arguments, e);

			if (!this.getIncrementalSelection()) {

				// reset the key buffer timer.
				this.__lastKeyPress = 0;
			}
		}
	}

});


/**
 * wisej.web.CheckedListBox
 */
qx.Class.define("wisej.web.CheckedListBox", {

	extend: wisej.web.ListBox,

	construct: function () {

		this.base(arguments);
	},

	properties: {

		/**
		 * CheckedItems property.
		 *
		 * Gets or sets the collection of checked items.
		 * Property defined with the setter/getter methods to save memory and not save a copy of the items.
		 */
		// checkedItems: { init: [], check: "Array", apply: "_applyCheckedItems" },

		/**
		 * CheckOnClick property.
		 *
		 * Gets or sets a value indicating whether the check box should be toggled when an item is selected.
		 */
		checkOnClick: { init: false, check: "Boolean" }

	},

	members: {

		// keeps track of the last clicked item
		// to toggle the checked state when checkOnClick is false.
		__lastClickedItem: null,

		/**
		 * Applies the checkedItems property.
		 */
		setCheckedItems: function (value, old) {

			var items = this.getChildren();

			// reset the items check state.
			for (var i = 0; i < items.length; i++) {

				// skip if the item is also in the new list.
				if (value) {
					if (value.findIndex(function (element) { return element.index === i; }) > -1)
						continue;
				}

				this.__setCheckState(items[i], false);
			}

			// change the check state of the specified items.
			if (value && value.length > 0) {
				for (var i = 0; i < value.length; i++) {
					var data = value[i];
					this.__setCheckState(items[data.index], data.state);
				}
			}
		},

		/**
		 * Changes the checked state of the item.
		 */
		__setCheckState: function (item, state) {

			if (item)
				item.setCheckState(state);
		},

		/**
		 * Check/uncheck the selected items when pressing space.
		 */
		_onKeyPress: function (e) {

			if (this.isReadOnly())
				return;

			var key = e.getKeyIdentifier();
			if (key === "Space") {

				var items = this.getSelection();
				for (var i = 0; i < items.length; i++) {
					items[i].toggleCheckState();
				}
			}
		},

		/**
		 * Check/uncheck the selected items.
		 */
		_onItemClick: function (e) {

			if (this.isReadOnly())
				return;

			var item = e.getTarget();

			// ignore the click on the checkbox, when the checkbox is clicked
			// directly the item is checked immediately regardless of the checkOnClick property.
			if (item instanceof wisej.web.listbox.CheckedListItem) {

				if (this.isCheckOnClick()) {
					item.toggleCheckState();
				}
				else {

					if (this.__lastClickedItem === item)
						item.toggleCheckState();
					else
						this.__lastClickedItem = item;
				}
			}
			else if (item instanceof wisej.web.listbox.CheckedListItemCheckBox) {

				// select the item when clicking on the checkbox.
				if (this.getSelectionMode() !== "none")
					this.setSelection([item.getLayoutParent()]);
			}
		},

		_onItemBeforeChangeCheckState: function (e) {

			if (this.isReadOnly())
				e.preventDefault();
		},

		_onItemChangeCheckState: function (e) {

			if (this.core.processingActions)
				return;

			if (this.isReadOnly())
				return;

			var item = e.getTarget();
			if (item) {

				var index = item.getIndex();
				if (index > -1) {
					this.fireDataEvent("itemCheckChanged", {
						index: index,
						state: item.getCheckState()
					});
				}
			}
		},

		/**
		 * Overridden. Creates the checkbox list item to add to the listbox.
		 */
		_createListItem: function (properties) {

			var item = new wisej.web.listbox.CheckedListItem();
			item.setHeight(this.getItemHeight());
			item.setAppearance(this.getItemAppearance());
			item.set(properties);
			item.addListener("click", this._onItemClick, this);
			item.addListener("changeCheckState", this._onItemChangeCheckState, this);
			item.addListener("beforeChangeCheckState", this._onItemBeforeChangeCheckState, this);
			return item;

		}
	}

});


/**
 * wisej.web.listbox.ListItem
 *
 * Represents the items in the wisej.web.ListBox.
 */
qx.Class.define("wisej.web.listbox.ListItem", {

	extend: qx.ui.form.ListItem,

	construct: function (text, icon) {

		this.base(arguments, text, icon);

		// display html and allow the item to extend horizontally.
		this.setRich(true);
		this.getChildControl("icon").setScale(true);
		this.getChildControl("label").setWrap(false);
	},

	properties: {

		/**
		 * The position of the item in the list control.
		 */
		index: { init: -1, check: "Integer" }
	},

	members: {

	}
});


/**
 * wisej.web.listbox.CheckedListItem
 *
 * Represents the items in the wisej.web.CheckedListBox.
 */
qx.Class.define("wisej.web.listbox.CheckedListItem", {

	extend: wisej.web.listbox.ListItem,

	construct: function (text, icon) {

		this.base(arguments, text, icon);

		// create the check box widget.
		this._showChildControl("checkbox");
	},

	properties: {

		/**
		 * CheckState property.
		 */
		checkState: { init: false, check: "Boolean", nullable: true, apply: "_applyCheckState", event: "changeCheckState" }

	},

	members: {

		__inApplyCheckState: false,

		/**
		 * Applies the CheckState property.
		 */
		_applyCheckState: function (value, old) {

			this.__inApplyCheckState = true;
			try {

				var checkbox = this.getChildControl("checkbox", true);
				if (checkbox)
					checkbox.setValue(value);

			} finally {
				this.__inApplyCheckState = false;
			}
		},

		_onCheckBoxChangeValue: function (e) {

			if (!this.__inApplyCheckState) {

				this.setCheckState(e.getData());
			}
		},

		_onBeforeCheckBoxChangeValue: function (e) {

			if (!this.__inApplyCheckState) {
				if (this.fireEvent("beforeChangeCheckState") === false)
					e.preventDefault();
			}
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "checkbox":
					control = new wisej.web.listbox.CheckedListItemCheckBox().set({
						triState: false,
						anonymous: false,
						focusable: false,
						keepFocus: false,
						keepActive: true,
						alignY: "middle"
					});
					this._getLayout().dispose();
					this._setLayout(new qx.ui.layout.HBox());
					this.getChildControl("icon").setAlignY("middle");
					this.getChildControl("label").setAlignY("middle");
					control.addListener("changeValue", this._onCheckBoxChangeValue, this);
					control.addListener("beforeChangeValue", this._onBeforeCheckBoxChangeValue, this);

					this._addAt(control, 0);
					break;
			}

			return control || this.base(arguments, id);
		}
	}
});

/**
 * wisej.web.listbox.CheckedListItemCheckBox
 *
 * Represents the CheckBox in a wisej.web.listbox.CheckedListItem.
 */
qx.Class.define("wisej.web.listbox.CheckedListItemCheckBox", {

	extend: qx.ui.form.CheckBox,

	members: {

		/**
		 * Handler for the execute event. Overridden
		 * to prevent the checkbox from toggling when the
		 * parent CheckedListBox is read-only.
		 *
		* @param e {qx.event.type.Event} The execute event.
		*/
		_onExecute: function (e) {

			if (this.fireNonBubblingEvent("beforeChangeValue") === false)
				return;

			this.base(arguments, e);
		}
	}
});