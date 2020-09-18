﻿///////////////////////////////////////////////////////////////////////////////
//
// (C) 2019 ICE TEA GROUP LLC - ALL RIGHTS RESERVED
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
 * wisej.web.VirtualComboBox
 * 
 * Extends the default wisej.web.ComboBox to replace the drop down
 * list with a virtual list that can handle an unlimited number of
 * items using the qooxdoo virtual infrastructure.
 * 
 * The main difference with the "regular" widgets and the widgets using the
 * virtual infrastructure is that the "regular" widgets operate on child widgets, while
 * the virtual ones (like this) operate on a data model (usually an instance of qx.data.Array)
 * and render only the visible part using actual widgets.
 */
qx.Class.define("wisej.web.VirtualComboBox", {

	extend: wisej.web.ComboBox,

	implement: qx.ui.list.core.IListDelegate,

	construct: function () {

		this.base(arguments);

		this.getDropDownList().syncAppearance();
	},

	properties: {

		/**
		 * PrefetchItems property.
		 * 
		 * Indicates the number of items to prefetch outside of the visible range.
		 */
		prefetchItems: { init: 0, check: "Integer", apply: "_applyPrefetchItems" }

	},

	members: {

		/**
		 * Adds, removes, updates the items in the data model.
		 *
		 * @param {Map} items Items to add, remove or updates. The map contains:
		 *	<code>clear:true</code> Clears the data model.
		 *	<code>added:[{}]</code> Adds the specified data items to the model.
		 *	<code>modified:[{}]</code> Updates the specified data items in the model.
		 *	<code>deleted:[1, 2, 3]</code> Indexes of the items to delete from the model.
		 */
		setItems: function (items) {

			this.__hideLoader();

			if (items == null)
				return;

			var list = this.getDropDownList();
			var selectedIndex = this.getSelectedIndex();

			this._suspendEvents = true;
			try {

				this.setSelectedIndex(-1);

				list.setItems(items);

			} finally {

				// update the displayed text in the textfield.
				if (selectedIndex > -1) {
					if (selectedIndex >= list.getModel().getLength()
						|| !list.getModel().getItem(selectedIndex).isEnabled()) {

						selectedIndex = -1;
					}
				}

				this.setSelectedIndex(selectedIndex);

				this._suspendEvents = false;
			}

			this.fireEvent("changeItems");
		},

		/**
		 * Applies the PrefetchItems property.
		 * 
		 * @param {Integer} value New value.
		 * @param {Integer?} old Previous value.
		 */
		_applyPrefetchItems: function (value, old) {

			this.getDropDownList().setPrefetchItems(value);

		},

		// overridden
		_applySelectedIndex: function (value, old) {

			if (value === old)
				return;

			this._suspendEvents = true;
			try {

				var list = this.getDropDownList();

				if (value == null || value === -1) {
					this.setListSelectedItem(null);
				}
				else {
					var model = list.getModel();
					var item = model.getItem(value);
					if (item)
						this.setListSelectedItem(item);
				}
			} finally {

				this._suspendEvents = false;
			}
		},

		// overridden
		_applyItemHeight: function (value, old) {

			if (value === null || value < 0) {
				this.resetItemHeight();
				return;
			}

			this.getDropDownList().setItemHeight(value);
		},

		// overridden
		_applyAutoCompleteMode: function (value, old) {

			this.base(arguments, value, old);

			this.__filterText = null;
		},

		/** defers calls to _scrollSelectedItemsIntoView, need to run after _updateDimensionsAndSize. */
		__deferredCall: null,

		// overridden
		_scrollSelectedItemsIntoView: function () {

			if (this.__deferredCall == null) {
				this.__deferredCall = new qx.util.DeferredCall(function () {

					var list = this.getDropDownList();
					var items = list.getSelection();
					if (items && items.getLength() > 0) {
						list.scrollItemIntoView(items.getItem(items.getLength() - 1));
					}

				}, this);
			}
			this.__deferredCall.schedule();
		},

		// overridden
		_adjustListSize: function () {

			this.base(arguments);

			this.getDropDownList()._updateDimensionsAndSize();
		},

		// overridden.
		getChildrenContainer: function () {
			return this;
		},

		/**
		 * Returns the currently selected item in the drop-down list.
		 *
		 * @returns {qx.ui.form.ListItem} Currently selected item.
		 */
		getListSelectedItem: function () {

			var selection = this.getDropDownList().getSelection();
			if (selection && selection.getLength() > 0)
				return selection.getItem(0);

			return null;
		},

		/**
		 * Selects the item in the drop-down list.
		 * 
		 * @param {qx.ui.form.ListItem} item The item to select, null to reset the selection.
		 */
		setListSelectedItem: function (item) {

			var selection = this.getDropDownList().getSelection();
			if (item) {
				selection.setItem(0, item);
			}
			else {
				selection.removeAll();
			}
		},

		// overridden
		// shows or hides the list items that match the text.
		// should be used with the "filter" auto complete mode.
		_filterListItems: function (text) {

			this.__filterText = text;
			this.getDropDownList().refresh();
		},

		// filter text used by the data model's filter.
		__filterText: null,

		/**
		 * Creates the list item to add to the listbox.
		 */
		_createListItem: function () {

			var item = new wisej.web.combobox.ListItem();
			item.setAppearance(this.getItemAppearance());
			return item;
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "list":
					control = new wisej.web.combobox.VirtualDropDownList().set({
						focusable: false,
						keepFocus: true,
						height: null,
						width: null,
						maxHeight: this.getMaxListWidth(),
						maxHeight: this.getMaxListHeight(),
						selectionMode: "single",
						scrollbarX: "off",
						quickSelection: false,
						delegate: this
					});
					control.getSelection().addListener("change", this._onListChangeSelection, this);
					control.addListener("pointerdown", this._onListPointerDown, this);
					control.getChildControl("pane").addListener("tap", this.close, this);
					break;
			}

			return control || this.base(arguments, id);
		},

		// overridden
		_onListChangeSelection: function (e) {

			// replace the data with the selected items array
			// from the virtual combobox to let wisej.web.ComboBox process this event.
			e.setData(e.getData().added);

			this.base(arguments, e);
		},

		//---------------------------------------------------------
		// qx.ui.list.core.IListDelegate implementation.
		//---------------------------------------------------------

		/**
		 * Creates an item cell which will be used for rendering. Be sure to
		 * implement the {@link #bindItem} function as well to get the needed
		 * properties bound.
		 *
		 * @return {qx.ui.core.Widget} A new created item cell.
		 */
		createItem: function () {
			return this._createListItem();
		},

		/**
		 * Gives the user the opportunity to reset properties or states.
		 *
		 * @param {qx.ui.core.Widget} item Item to modify.
		 */
		onPool: function (item) {
			item.removeState("hovered");
		},

		/**
		 * Sets up the binding for the given item and index.
		 *
		 * For every property you want to bind, use
		 * {@link MWidgetController#bindProperty} like this:
		 * <code>
		 * controller.bindProperty("path.in.the.model", "label", options, item, id);
		 * </code>
		 *
		 * @param {MWidgetController} controller The currently used controller.
		 * @param {qx.ui.core.Widget} item The created and used item.
		 * @param {Integer} index The id for the binding.
		 */
		bindItem: function (controller, item, index) {

			// bind model first
			controller.bindProperty("", "model", null, item, index);
			controller.bindProperty("icon", "icon", null, item, index);
			controller.bindProperty("label", "label", null, item, index);
			controller.bindProperty("index", "index", null, item, index);
			controller.bindProperty("enabled", "enabled", null, item, index);
			controller.bindProperty("toolTipText", "toolTipText", null, item, index);
			controller.bindProperty("font", "font", this.__bindItemInheritedPropertyFilter, item, index);
			controller.bindProperty("textColor", "textColor", this.__bindItemInheritedPropertyFilter, item, index);
			controller.bindProperty("backgroundColor", "backgroundColor", this.__bindItemInheritedPropertyFilter, item, index);
		},

		__bindItemInheritedPropertyFilter: {
			converter: function (value, model, sourceObject, targetObject) {
				return value === null ? undefined : value;
			}
		},

		/**
		 * Gives the user the opportunity to filter the model. The filter
		 * method has to return <code>true</code> if the given data should be
		 * shown and <code>false</code> if the given data should be ignored.
		 *
		 * @param {wisej.web.combobox.DataItem} data The data to be checked.
		 * @return {Boolean} <code>true</code> if the data passes the filter,
		 *   <code>false</code> otherwise.
		 */
		filter: function (data) {

			if (this.__filterText) {
				return this.onFilterListItem(this._getItemText(data), this.__filterText);
			}

			return true;
		}

		//---------------------------------------------------------
		// END: qx.ui.list.core.IListDelegate implementation.
		//---------------------------------------------------------
	},

	destruct: function () {
		if (this.__deferredCall != null) {
			this.__deferredCall.cancel();
			this.__deferredCall.dispose();
		}

		this.__deferredCall = null;
	}
});


/**
 * wisej.web.combobox.VirtualDropDownList
 *
 * Replaces the default qx.ui.form.List with the virtual list widget.
 */
qx.Class.define("wisej.web.combobox.VirtualDropDownList", {

	extend: qx.ui.list.List,

	construct: function (model) {

		this.base(arguments, model);

		this.setIconPath("icon");
		this.setLabelPath("label");
		this.setModel(new qx.data.Array());

		// process the rendered cell widgets.
		this._layer.addListener("updated", this._onUpdated, this);

		// initialize the search string
		this.__pressedString = "";
	},

	properties:
	{
		// overridden
		appearance: { init: "list", refine: true },

		/** 
		 *  EnableInlineFind property.
		 *  
		 *  Controls whether the inline-find feature is activated or not.
		 */
		enableInlineFind: { init: true, check: "Boolean" },

		/**
		 * ItemHeight property.
		 * 
		 * Sets the default height for the items in the list. When set to null or -1 it uses the
		 * value in the theme or calculates it from the widest item. The default is null.
		 */
		itemHeight: { init: 24, refine: true },

		/**
		 * PrefetchItems property.
		 * 
		 * Indicates the number of items to prefetch outside of the visible range.
		 */
		prefetchItems: { init: 0, check: "Integer", apply: "_applyPrefetchItems" }

	},

	members: {

		// deferred call handler.
		__deferredCall: null,

		// keeps the largest width calculated.
		__maxItemWidth: 0,

		/**
		 * Adds, removes, updates the items in the data model.
		 * 
		 * @param {Map} items Items to add, remove or updates. The map contains:
		 *	<code>clear:true</code> Clears the data model.
		 *	<code>added:[{}]</code> Adds the specified data items to the model.
		 *	<code>modified:[{}]</code> Updates the specified data items in the model.
		 *	<code>deleted:[1, 2, 3]</code> Indexes of the items to delete from the model.
		 */
		setItems: function (items) {

			if (items == null)
				return;

			try {

				var index;
				var model = this.getModel();
				this.setModel(null);

				// clear?
				if (items.clear && model.getLength() > 0) {
					selectedIndex = -1;
					model.setAutoDisposeItems(true);
					model.dispose();
					model = new qx.data.Array();
				}

				// add new items.
				if (items.added && items.added.length > 0) {
					var added = items.added;
					for (var i = 0; i < added.length; i++) {
						model.insertAt(added[i].index, this._createDataItem(added[i]));
					}
				}

				// apply modified items.
				if (items.modified && items.modified.length > 0) {
					var modified = items.modified;
					for (var i = 0; i < modified.length; i++) {
						index = modified[i].index;

						if (index < 0 || index >= model.getLength())
							throw new Error("index out of bounds: " + index + " (0.." + model.getLength() + ")");

						model.getItem(index).set(modified[i]);
					}
				}

				// remove deleted items.
				if (items.deleted && items.deleted.length > 0) {

					// remove in contiguous chunks.
					var start = -1;
					var amount = 0;

					var deleted = items.deleted, removed;
					for (var i = deleted.length - 1; i >= 0; i--) {

						index = deleted[i];
						if (index < 0 || index >= model.getLength())
							throw new Error("index out of bounds: " + index + " (0.." + model.getLength() + ")");

						// remove the "accumulated" section.
						if (amount > 0 && start > -1 && index !== start - 1) {
							removed = model.splice(start, amount);
							removed.setAutoDisposeItems(true);
							removed.dispose();

							amount = 0;
						}

						amount++;
						start = index;
					}

					// remove the last "accumulated" section.
					if (amount > 0 && start > -1 && index !== start - 1) {
						var removed = model.splice(start, amount);
						removed.setAutoDisposeItems(true);
						removed.dispose();

						amount = 0;
					}
				}

				// align the indexes of the items if items have been added or deleted.
				if (!items.clear && (items.added || items.deleted)) {
					for (var i = 0, l = model.getLength(); i < l; i++) {
						model.getItem(i).setIndex(i);
					}
				}

				// invalidate the max width, will be recalculated in syncWidget.
				this.__maxItemWidth = -1;

				this.setModel(model);
				this.refresh();

			} finally {

				this._suspendEvents = false;
			}
		},

		/**
		 * Applies the PrefetchItems property.
		 * 
		 * @param {Integer} value New value.
		 * @param {Integer?} old Previous value.
		 */
		_applyPrefetchItems: function (value, old) {

			var pixels = this.getItemHeight() * value;
			this.getPane().prefetchY(pixels, pixels, pixels, pixels);
		},

		/**
		 * Creates the data item to add to the list model.
		 * 
		 * @param {Map} data Map of properties for each list item.
		 * @returns {wisej.web.combobox.DataItem} Instance created from the incoming data.
		 */
		_createDataItem: function (data) {
			var item = new wisej.web.combobox.DataItem();
			item.set(data);
			return item;
		},

		// overridden.
		_applyRowHeight: function (value, old) {

			if (value === old)
				return;

			if (value === null || value === -1)
				this.resetItemHeight();
			else
				this.getPane().getRowConfig().setDefaultItemSize(value);
		},

		// calculates the maximum width by measuring only the item
		// with the longest text instead of measuring all the items.
		//
		// the result may be inaccurate when the item is made of HTML
		// text that increases the size beyond the length of the text.
		_calcMaxWidth: function (model) {

			if (!model || model.getLength() === 0)
				return 0;

			var maxTextLength = 0;
			var currentText = "";
			var currentTextLength = 0;
			var itemToMeasure = null, item;

			for (var i = 0, l = model.getLength(); i < l; i++) {

				item = model.getItem(i);
				currentText = this._getItemText(item);
				currentTextLength = currentText.length;

				if (currentTextLength > maxTextLength) {
					maxTextLength = currentTextLength;
					itemToMeasure = item;
				}
			}

			if (itemToMeasure) {
				var listItem = this.getDelegate()._createListItem();
				listItem.setFont(this.getFont());
				listItem.setLabel(itemToMeasure.getLabel());
				listItem.setIcon("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
				listItem.syncAppearance();

				var size = listItem.getSizeHint();
				listItem.destroy();

				return size.width;
			}

			return 0;
		},

		// overridden.
		_onResize: function (e) {

			// ignore or it keeps updating the widgets.

		},

		/**
		 * Scrolls the specified DataItem to the top of the list, or to the
		 * closest position.
		 * 
		 * @param {wisej.web.combobox.DataItem} item DataItem to scroll.
		 */
		scrollItemIntoView: function (item) {

			this.getPane().scrollRowIntoView(item ? item.getIndex() : 0, null);
		},

		/**
		 * Used to route external <code>keypress</code> events to the list
		 * handling (in fact the manager of the list)
		 *
		 * @param e {qx.event.type.KeySequence} KeyPress event
		 */
		handleKeyPress: function (e) {

			this._manager.handleKeyPress(e);
		},

		/**
		 * Handles the inline find - if enabled
		 *
		 * @param e {qx.event.type.KeyInput} key input event
		 */
		_onKeyInput: function (e) {

			// do nothing if the find is disabled.
			if (!this.getEnableInlineFind()) {
				return;
			}

			// only useful in single or one selection mode.
			var mode = this.getSelectionMode();
			if (!(mode === "single" || mode === "one")) {
				return;
			}

			// reset string after a second of non pressed key.
			if (((new Date).valueOf() - this.__lastKeyPress) > 1000) {
				this.__pressedString = "";
			}

			// combine keys the user pressed to a string.
			this.__pressedString += e.getChar();

			// use the currently selected item to start the search.
			var startIndex = -1;
			var selection = this.getSelection();
			if (selection && selection.getLength() > 0)
				startIndex = selection.getItem(0).getIndex();

			// find matching item.
			var matchedItem = this.findItemByLabelFuzzy(this.__pressedString, startIndex);

			// if an item was found, select it.
			if (matchedItem) {
				selection.setItem(0, matchedItem);

				// stop default processing of the key input char when an item has been found 
				// or we may get the char appended to the input text.
				e.stop();
			}

			// Store timestamp
			this.__lastKeyPress = (new Date).valueOf();
		},

		// accrues typed characters.
		__pressedString: null,
		// timestamp of the last key press.
		__lastKeyPress: null,

		/**
		 * Find an item by its {@link wisej.web.combobox.DataItem#getLabel}.
		 * 
		 * Overridden to skip items that are not visible or disabled.
		 *
		 * @param {String} search A label or any item.
		 * @param {Boolean} ignoreCase Whether to use case insensitive comparison.
		 * @return {wisej.web.combobox.DataItem} The found DataItem or null.
		 */
		findItem: function (search, ignoreCase) {

			// lowercase search
			if (ignoreCase !== false) {
				search = search.toLowerCase();
			}

			// get all items of the list
			var model = this.getModel();
			var item;

			// go through all items
			for (var i = 0, l = model.getLength(); i < l; i++) {

				item = model.getItem(i);

				// skip not visible or disabled items.
				if (!item.isEnabled())
					continue;

				// search the label text, whether it's html or not.
				var label = this._getItemText(item);

				if (label != null) {
					if (label.translate) {
						label = label.translate();
					}
					if (ignoreCase !== false) {
						label = label.toLowerCase();
					}

					if (label.toString() === search.toString()) {
						return item;
					}
				}
			}

			return null;
		},

		/**
		 * Takes the given string and tries to find a DataItem
		 * which starts with this string. The search is not case sensitive and the
		 * first found DataItem will be returned. If there could not be found any
		 * qualifying DataItem, null will be returned.
		 *
		 *
		 * @param {String} search The text with which the label of the ListItem should start with.
		 * @param {Integer} startIndex The index to start the search from.
		 * @return {wisej.web.combobox.DataItem} The found DataItem or null
		 */
		findItemByLabelFuzzy: function (search, startIndex) {

			// lower case search text
			search = search.toLowerCase();

			// get all items of the list
			var model = this.getModel();
			var item;

			// go through all items
			startIndex = Math.max(0, Math.min(startIndex + 1 || 0, model.getLength()));
			for (var i = startIndex, l = model.getLength(); i < l; i++) {

				item = model.getItem(i);

				// skip not visible or disabled items.
				if (!item.isEnabled())
					continue;

				// get the label of the current item
				var currentLabel = this._getItemText(item);

				// if the label fits with the search text (ignore case, begins with)
				if (currentLabel && currentLabel.toLowerCase().indexOf(search) === 0) {
					// just return the first found element
					return item;
				}
			}

			// wrap?
			if (startIndex > 0) {
				for (var i = 0, l = startIndex; i < l; i++) {

					item = model.getItem(i);

					// skip not visible or disabled items.
					if (!item.isEnabled())
						continue;

					// get the label of the current item
					var currentLabel = this._getItemText(item);

					// if the label fits with the search text (ignore case, begins with)
					if (currentLabel && currentLabel.toLowerCase().indexOf(search) === 0) {
						// just return the first found element
						return item;
					}
				}
			}

			// if no element was found, return null
			return null;
		},

		/**
		 * Overridable method to return the text of an item for one
		 * of the search methods: findItem and findItemByLabelFuzzy.
		 *
		 * @param {Widget} item the widget item for which to return plain text.
		 * @returns {String} The clean text of the item.
		 */
		_getItemText: function (item) {

			var text = null;

			if (item) {
				text = item.getLabel() || "";
				text = qx.bom.String.toText(text);
			}

			return text;
		},

		/**
		 * Overridden event handler for the modelChange event. The handler rebuilds the lookup
		 * table when the child structure changed.
		 * 
		 * When invoked while processing server actions, suspend the
		 * model changes until we are done.
		 *
		 * @param e {qx.event.type.Data} The data event.
		 */
		_onModelChange: function (e) {

			// don't do anything.

			// the mode is changed only by setItems(), which
			// is where we update the virtual list after all changes
			// have been applied.

		},

		/**
		 * Calculates the best size for the drop down list
		 * and updates the size of the cells and the inner virtual panel.
		 */
		_updateDimensionsAndSize: function () {

			if (this.__maxItemWidth === -1)
				this.__maxItemWidth = this._calcMaxWidth(this.getModel());

			var sizeHint = null;
			var pane = this.getPane();
			var insets = this.getInsets();
			var maxWidth = this.__maxItemWidth;
			var maxHeight = this.getItemHeight() || 0;
			var firstRow = this._layer.getFirstRow();
			var rowSize = this._layer.getRowSizes().length;
			var rowConfig = pane.getRowConfig();
			var colConfig = pane.getColumnConfig();

			for (var row = firstRow; row < firstRow + rowSize; row++) {
				var widget = this._layer.getRenderedCellWidget(row, 0);
				if (widget !== null) {
					sizeHint = widget.getSizeHint();
					maxHeight = Math.max(maxHeight, sizeHint.height);
					maxWidth = Math.max(maxWidth, sizeHint.width);
				}
			}

			this.__maxItemWidth = maxWidth;

			// update the dropdown width.
			var comboBox = this.getDelegate();
			var dropDownWidth = Math.max(comboBox.getBounds().width, maxWidth);
			pane.setWidth(dropDownWidth + insets.left + insets.right);

			// update the dropdown height.
			var dropDownHeight = rowConfig.getTotalSize();
			dropDownHeight = Math.max(rowConfig.getDefaultItemSize(), dropDownHeight);
			dropDownHeight = Math.min(dropDownHeight, this.getMaxHeight());
			this.setHeight(dropDownHeight + insets.top + insets.bottom);

			// update the cell sizes.
			if (maxHeight && rowConfig.getDefaultItemSize() !== maxHeight) {
				rowConfig.setDefaultItemSize(maxHeight);
				pane.fullUpdate();
			}

			maxWidth = Math.max(maxWidth, pane.getWidth());
			if (maxWidth && colConfig.getItemSize(0) !== maxWidth) {
				colConfig.setItemSize(0, maxWidth);
				pane.fullUpdate();
			}
		},

		/**
		 * Event handler for the update event.
		 *
		 * @param event {qx.event.type.Event} The event.
		 */
		_onUpdated: function (event) {

			if (this.__deferredCall == null) {
				this.__deferredCall = new qx.util.DeferredCall(function () {
					this._updateDimensionsAndSize();
				}, this);
			}
			this.__deferredCall.schedule();
		}
	},

	destruct: function () {

		var model = this.getModel();
		if (model) {
			this.setModel(null);
			model.setAutoDisposeItems(true);
			model.dispose();
		}

		this._layer.removeListener("updated", this._onUpdated, this);

		if (this.__deferredCall != null) {
			this.__deferredCall.cancel();
			this.__deferredCall.dispose();
		}

		this.__deferredCall = null;

	}

});


/**
 * wisej.web.combobox.DataItem
 *
 * Data item in the data model. Instances of this
 * class are bound to the wisej.web.combobox.VirtualListItem widgets
 * displayed in the wisej.web.combobox.VirtualDropDownList.
 */
qx.Class.define("wisej.web.combobox.DataItem", {

	extend: qx.core.Object,

	construct: function () {

		this.base(arguments, true /* weak */);
	},

	properties: {

		// index in the list.
		index: { init: -1, check: "Integer", event: "changeIndex" },

		// icon url or name.
		icon: { init: null, check: "String", event: "changeIcon" },

		// text to display.
		label: { init: null, check: "String", event: "changeLabel" },

		// background color.
		backgroundColor: { init: null, check: "Color", event: "changeBackgroundColor" },

		// text color.
		textColor: { init: null, check: "Color", event: "changeTextColor" },

		// tooltip.
		toolTipText: { init: null, check: "String", event: "changeToolTipText" },

		// font.
		font: { init: null, check: "Font", event: "changeFont", dereference: true },

		// enabled.
		enabled: { init: true, check: "Boolean", event: "changeEnabled" }
	}
});