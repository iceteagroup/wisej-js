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
 *
 * Extends the virtual list widget to provide an unlimited ListBox control.
 *
 * NOTE: This class is not used and not added to the qx.js bundle. It's here only as a reference
 * in case we'll need to switch the wisej.web.ListBox back to the virtual list. It couldn't
 * be used because it's hard to set the height of the list items.

 */
qx.Class.define("wisej.web.VirtualListBox", {

	extend: qx.ui.list.List,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	construct: function () {

		this.base(arguments, new qx.data.Array());

		// initialize data binding.
		this.setIconPath("icon");
		this.setLabelPath("label");

		// initialize the delegate to create list items.
		this.setDelegate({ createItem: this._createListItem });

		// handle selection changes to notify the server component.
		this.getSelection().addListener("change", this.__onChangeSelection, this);
	},

	properties: {

		// refined to the standard list appearance key.
		appearance: { refine: true, init: "list" },

		/**
		 * items property.
		 *
		 * Sets the items in the list.
		 */
		items: { init: null, check: "Map", nullable: true, apply: "_applyItems" },

		/**
		 * selectionMode override.
		 *
		 * Converts Wisej SelectionMode to the correct value for the QX platform.
		 */
		selectionMode: { refine: true, apply: "_applySelectionMode" },

		/**
		 * SelectedIndices property.
		 *
		 * Gets or sets the indices of the selected items.
		 */
		selectedIndices: { check: "Array", apply: "_applySelectedIndices" },
	},

	members: {

		// suspend event dispatching.
		__suspendEvents: false,

		/**
		 * Applies the selectionMode property.
		 */
		_applySelectionMode: function (value, old) {

			switch (value) {
				case "none": value = "none"; break;
				case "one": value = "single"; break;
				case "multiSimple": value = "additive"; break;
				case "multiExtended": value = "multi"; break;
			}

			this.base(arguments, value, old);
		},

		/**
		 * Applies the items property.
		 */
		_applyItems: function (value, old) {

			var items = value;

			if (items == null)
				return;

			// reset the max width cache.
			this.__cachedMaxWidth = -1;

			this.__suspendEvents = true;
			try {

				var model = this.getModel();

				// clear?
				if (items.clear)
					model.removeAll();

				var modelSize = model.getLength();

				// add new items.
				if (items.added && items.added.length > 0) {
					var list = items.added;
					for (var i = 0; i < list.length; i++) {

						var index = list[i].index;
						var item = this._createListItem(list[i]);

						if (index == -1 || index >= modelSize)
							model.push(item);
						else
							model.insertAt(index, item);

						modelSize++;
					}
				}

				// apply modified items.
				if (items.modified && items.modified.length > 0) {
					var list = items.modified;
					for (var i = 0; i < list.length; i++) {

						var index = list[i].index;

						if (index < 0 || index >= modelSize)
							throw new Error("index out of bounds: " + index + " (0.." + modelSize + ")");

						model.getItem(index).setLabel(list[i].text);
					}
				}

				// remove deleted items.
				if (items.deleted && items.deleted.length > 0) {
					var list = items.deleted;
					for (var i = list.length - 1; i >= 0; i--) {

						var item = list[i];

						if (index < 0 || index >= modelSize)
							throw new Error("index out of bounds: " + index + " (0.." + modelSize + ")");

						model.removeAt(index);
						modelSize--;
					}
				}
			} finally {

				this.__suspendEvents = false;
			}
		},

		/**
		 * Applies the selectedIndices property.
		 */
		_applySelectedIndices: function (value, old) {

			this.__suspendEvents = true;
			try {

				var model = this.getModel();
				var selection = this.getSelection();

				selection.removeAll();

				if (value != null && value.length > 0) {

					for (var i = 0; i < value.length; i++) {
						var index = value[i];
						if (index > -1) {
							selection.push(model.getItem(index));
						}
					}
				}
			} finally {

				this.__suspendEvents = false;
			}
		},

		/**
		 * Process the selectionChange event and fire our "selectionChanged" event.
		 */
		__onChangeSelection: function (e) {

			if (this.__suspendEvents)
				return;

			var model = this.getModel();
			var selection = this.getSelection();

			var indices = [];
			for (var i = 0, length = selection.getLength() ; i < length; i++) {

				var index = selection.getItem(i).getIndex();
				if (index > -1)
					indices.push(index);
			}

			this.fireDataEvent("selectionChanged", indices);
		},

		_onResize: function (e) {

			this.getPane().getColumnConfig().setItemSize(0, this.__calcMaxWidth());

		},

		_onChangeScrollbarXVisibility: function (e) {

			// reset the max width cache when the X scrollbar changes visibility.
			this.__cachedMaxWidth = -1;

			this.base(arguments, e);
		},


		// Calculate the largest width of the items in the listbox
		// in order to show the horizontal scrollbar.
		__calcMaxWidth: function () {

			if (this.__cachedMaxWidth < 0) {

				// get the initial max width to fill the inner pane.
				var maxWidth = this.getInnerSize().width;
				var scrollbarY = this.getChildControl("scrollbar-y");
				if (scrollbarY.isVisible())
					maxWidth -= scrollbarY.getWidth();

				// enlarge the max width to fit the largest item.
				if (this.getScrollbarX() != "off") {
					var model = this.getModel();
					for (var i = 0, length = model.getLength() ; i < length; i++) {
						var item = model.getItem(i);
						maxWidth = Math.max(maxWidth, item.getSizeHint().width);
					}
				}

				this.__cachedMaxWidth = maxWidth;
			}

			return this.__cachedMaxWidth;
		},

		// cached max width, avoids the recalculation on every resize.
		__cachedMaxWidth: -1,

		/**
		 * Creates the list item to add to the listbox.
		 */
		_createListItem: function (data) {

			return new wisej.web.virtual.list.ListItem(data, this.getPane ? this.getPane() : null);

		},

	}

});


/**
 * wisej.web.CheckedListBox
 */
qx.Class.define("wisej.web.VirtualCheckedListBox", {

	extend: wisej.web.ListBox,

	construct: function () {

		this.base(arguments);

		// initialize the delegate to create list items.
		this.setDelegate({ createItem: this._createListItem, bindItem: this._bindItem.bind(this) });

		this.addListener("keypress", this.__onKeyPress);
	},

	properties: {

		/**
		 * CheckedItems property.
		 *
		 * Gets or sets the collection of checked items.
		 */
		checkedItems: { init: [], check: "Array", apply: "_applyCheckedItems" },

	},

	members: {

		/**
		 * Applies the checkedItems property.
		 */
		_applyCheckedItems: function (value, old) {

			var model = this.getModel();

			if (old) {
				for (var i = 0; i < old.length; i++) {
					var data = old[i];
					model.getItem(data.index).setCheckState(false);
				}
			}

			if (value) {
				for (var i = 0; i < value.length; i++) {
					var data = value[i];
					model.getItem(data.index).setCheckState(data.state);
				}
			}
		},

		/**
		 * Checks/unchecks the selected item when pressing space.
		 */
		__onKeyPress: function (e) {

			var key = e.getKeyIdentifier();
			if (key == "Space") {

				var selection = this.getSelection();
				for (var i = 0, length = selection.getLength() ; i < length; i++) {

					var item = selection.getItem(i);
					item.toggleCheckState();

					this.fireDataEvent("itemChecked", {
						index: item.getIndex(),
						state: item.getCheckState()
					});
				}
			}
		},

		/**
		 * Handles "checkBoxValueChanged" events from the checkbox inside the list item.
		 */
		_onCheckBoxChangeValue: function (e) {

			var item = e.getTarget();

			this.fireDataEvent("itemChecked", {
				index: item.getIndex(),
				state: item.getCheckState()
			});

		},

		/**
		 * bindItem delegate.
		 *
		 * Binds the checkState property in addition to the default properties: label and icon.
		 */
		_bindItem: function (controller, item, index) {

			controller.bindDefaultProperties(item, index);
			controller.bindProperty("index", "index", null, item, index);
			controller.bindProperty("checkState", "checkState", null, item, index);
			controller.bindPropertyReverse("checkState", "checkState", null, item, index);

			item.removeListener("checkBoxChangeValue", this._onCheckBoxChangeValue, this);
			item.addListener("checkBoxChangeValue", this._onCheckBoxChangeValue, this);

		},

		/**
		 * Overridden. Creates the checkbox list item to add to the listbox.
		 */
		_createListItem: function (data) {

			return new wisej.web.virtual.list.CheckedListItem(data, this.getPane ? this.getPane() : null);

		},

	}

});


/**
 * wisej.web.list.ListItem
 *
 * Represents the items in the wisej.web.VirtualListBox.
 */
qx.Class.define("wisej.web.virtual.list.ListItem", {

	extend: qx.ui.form.ListItem,

	construct: function (data, pane) {

		this.base(arguments);

		// display html and allow the item to extend horizontally.
		this.setRich(true);
		this.getChildControl("label").setWrap(false);

		// save the hosting pane.
		this.__pane = pane;

		// initialize from the data map.
		if (data) {

			this.setIndex(data.index);

			if (data.text != null)
				this.setLabel(data.text);

			if (data.icon != null)
				this.setLabel(data.icon);
		}
	},

	properties: {

		/**
		 * The position of the item in the list control.
		 */
		index: { init: -1, check: "Integer", event: "changeIndex" }
	},

	members: {

		// the pane that hosts this item.
		__pane: null,

		// overridden
		// when the label changes we recalculate the height of the item.
		_applyLabel: function (value, old) {

			this.base(arguments, value, old);

			if (this.__pane) {
				var size = this.getSizeHint();
				this.__pane.getRowConfig().setItemSize(this.getIndex(), size.height);
			}
		},
	}
});


/**
 * wisej.web.list.CheckedListItem
 *
 * Represents the items in the wisej.web.VirtualCheckedListBox.
 */
qx.Class.define("wisej.web.virtual.list.CheckedListItem", {

	extend: wisej.web.list.ListItem,

	construct: function (data) {

		this.base(arguments, data);

		if (data == null) {
			this._showChildControl("checkbox");
		}

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
				this.fireDataEvent("checkBoxChangeValue", e.getData());
			}

		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "checkbox":
					control = new qx.ui.form.CheckBox().set({
						triState: false,
						anonymous: false,
						focusable: false,
						keepFocus: true,
						keepActive: true,
						alignY: "middle"
					});
					this._getLayout().dispose();
					this._setLayout(new qx.ui.layout.HBox());
					this.getChildControl("icon").setAlignY("middle");
					this.getChildControl("label").setAlignY("middle");
					control.addListener("changeValue", this._onCheckBoxChangeValue, this);

					this._addAt(control, 0);
					break;
			}

			return control || this.base(arguments, id);
		},

	}

});
