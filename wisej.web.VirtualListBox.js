//#Requires=wisej.web.ToolContainer.js

///////////////////////////////////////////////////////////////////////////////
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
 * wisej.web.VirtualListBox
 * 
 * Extends the default wisej.web.ListBox to use the qooxdoo virtual infrastructure
 * able to handle an unlimited number of items without degrading the performance
 * of the browser.
 * 
 * The main difference with the "regular" widgets and the widgets using the
 * virtual infrastructure is that the "regular" widgets operate on child widgets, while
 * the virtual ones (like this) operate on a data model (usually an instance of qx.data.Array)
 * and render only the visible part using actual widgets.
 */
qx.Class.define("wisej.web.VirtualListBox", {

	extend: qx.ui.list.List,

	implement: [qx.ui.list.core.IListDelegate,
				wisej.web.toolContainer.IToolPanelHost],

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	construct: function () {

		this.base(arguments);

		this.setDelegate(this);
		this.setIconPath("icon");
		this.setLabelPath("label");
		this.setModel(new qx.data.Array());

		// add local state properties.
		this.setStateProperties(this.getStateProperties().concat(["topIndex"]));

		this.addListener("keyinput", this._onKeyInput);

		this.getSelection().addListener("change", this._onListChangeSelection, this);

		// update the size of the cells.
		this.addListener("changeFont", this._onUpdated);
		this._layer.addListener("updated", this._onUpdated, this);

		// adds the inner target to the drop & drop event object.
		this.addListener("drop", this._onDragEvent, this);
		this.addListener("dragover", this._onDragEvent, this);

		// initialize the search string
		this.__pressedString = "";

		this.addState("multiline");
	},

	events:
	{
		/**
		 * Fired when LazyLoading is true and the control needs load
		 * the items from the server.
		 */
		"load": "qx.event.type.Event",

		/**
		 * Fired when the items collection changes.
		 */
		"changeItems": "qx.event.type.Event"
	},

	properties: {

		// overridden
		appearance: { init: "list", refine: true },

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
		 *  EnableInlineFind property.
		 *  
		 *  Controls whether the inline-find feature is activated or not.
		 */
		enableInlineFind: { init: true, check: "Boolean" },

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
		itemHeight: { init: 24, refine: true },

		/**
		 * PrefetchItems property.
		 * 
		 * Indicates the number of items to prefetch outside of the visible range.
		 */
		prefetchItems: { init: 0, check: "Integer", apply: "_applyPrefetchItems" },

		/**
		 * Tools property.
		 *
		 * Collection of tool definitions to display on top of the listbox.
		 */
		tools: { check: "Array", apply: "_applyTools" },

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

		// deferred call handler.
		__deferredCall: null,

		// keeps the largest width calculated.
		__maxItemWidth: 0,

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

					var index = item.getIndex();
					var model = this.getModel();
					var selection = this.getSelection();

					this.__suspendEvents = true;
					try {
						selection.removeAll();
					}
					finally {
						this.__suspendEvents = false;
					}
					selection.setItem(0, model.getItem(item.getIndex()));
				}
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

				var index;
				var model = this.getModel();
				this.setModel(null);

				// clear?
				if (items.clear && model.getLength() > 0) {
					this.setModel(null);
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
						removed = model.splice(start, amount);
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

				this.__suspendEvents = false;
			}

			this.fireEvent("changeItems");
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
			var itemToMeasure = null;

			for (var i = 0, l = model.getLength(); i < l; i++) {

				currentText = this._getItemText(model.getItem(i));
				currentTextLength = currentText.length;

				if (currentTextLength > maxTextLength) {
					maxTextLength = currentTextLength;
					itemToMeasure = model.getItem(i);
				}
			}

			if (itemToMeasure) {
				var listItem = this._createListItem();
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
		 * Updates the size of the cells in the virtual pane.
		 */
		syncWidget: function (jobs) {

			var pane = this.getPane();
			if (!pane.getInnerSize())
				return;

			if (this.__maxItemWidth === -1)
				this.__maxItemWidth = this._calcMaxWidth(this.getModel());

			var sizeHint = null;
			var paneWidth = pane.getInnerSize().width;
			var maxWidth = this.__maxItemWidth;
			var maxHeight = this.getItemHeight() || 0;
			var firstRow = this._layer.getFirstRow();
			var rowSize = this._layer.getRowSizes().length;

			for (var row = firstRow; row < firstRow + rowSize; row++) {
				var widget = this._layer.getRenderedCellWidget(row, 0);
				if (widget !== null) {
					sizeHint = widget.getSizeHint();
					maxHeight = Math.max(maxHeight, sizeHint.height);
					maxWidth = Math.max(paneWidth, maxWidth, sizeHint.width);
				}
			}

			this.__maxItemWidth = maxWidth;

			if (maxHeight && pane.getRowConfig().getDefaultItemSize() !== maxHeight)
				pane.getRowConfig().setDefaultItemSize(maxHeight);

			if (maxWidth && pane.getColumnConfig().getItemSize(0) !== maxWidth)
				pane.getColumnConfig().setItemSize(0, maxWidth);
		},

		/**
		 * Event handler for the update event.
		 *
		 * @param event {qx.event.type.Event} The event.
		 */
		_onUpdated: function (event) {

			if (this.__deferredCall == null) {
				this.__deferredCall = new qx.util.DeferredCall(function () {
					qx.ui.core.queue.Widget.add(this);
				}, this);
			}
			this.__deferredCall.schedule();
		},

		/**
		 * Creates the data item to add to the list model.
		 * 
		 * @param {Map} data Map of properties for each list item.
		 * @returns {wisej.web.listbox.DataItem} Instance created from the incoming data.
		 */
		_createDataItem: function (data) {
			var item = new wisej.web.listbox.DataItem();
			item.set(data);
			return item;
		},

		/**
		 * Creates the list item to add to the listbox.
		 */
		_createListItem: function () {
			var item = new wisej.web.listbox.ListItem();
			item.setAppearance(this.getItemAppearance());
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
			if (item instanceof qx.ui.form.ListItem) {

				var model = this.getModel();
				var selection = this.getSelection();

				this.__suspendEvents = true;
				try {
					selection.removeAll();
				}
				finally {
					this.__suspendEvents = false;
				}
				selection.setItem(0, model.getItem(item.getIndex()));
			}
		},

		// overridden
		_onScrollPaneY: function (e) {

			this.base(arguments, e);

			// set it dirty when scrolling to update the topIndex state property.
			this.setDirty(true);
		},

		/**
		 * TopIndex property.
		 */
		getTopIndex: function () {

			return this._layer.getFirstRow();

		},
		setTopIndex: function (value) {

			this.getPane().scrollRowIntoView(value, "top");
		},

		/**
		 * SelectedIndices property.
		 */
		getSelectedIndices: function () {

			var indices = [];
			var selection = this.getSelection();
			for (var i = 0; i < selection.getLength(); i++) {
				var index = selection.getItem(i).getIndex();
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

			var model = this.getModel();
			var selection = this.getSelection();

			this.__suspendEvents = true;
			try {

				if (value == null || value.length == 0) {
					selection.removeAll();
				}
				else {
					var items = [];
					for (var i = 0; i < value.length; i++) {
						var index = value[i];
						if (index > -1) {
							items.push(model.getItem(index));
						}
					}

					selection.removeAll();
					selection.append(items);
				}
			} finally {

				this.__suspendEvents = false;
			}
		},

		/**
		 * Process the selectionChange event and fire our "selectionChanged" event.
		 */
		_onListChangeSelection: function (e) {

			if (this.__suspendEvents)
				return;

			var indices = this.getSelectedIndices();
			this.fireDataEvent("selectionChanged", indices);
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

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "tools":
					control = new wisej.web.toolContainer.ToolPanel();
					break;
			}

			return control || this.base(arguments, id);
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

			// change behavior in multi selection by setting
			// the lead item instead of selecting the item.
			var multi = false;
			var mode = this.getSelectionMode();
			if (mode !== "single" && mode !== "one")
				multi = true;

			// reset string after a second of non pressed key.
			if (((new Date).valueOf() - this.__lastKeyPress) > 1000) {
				this.__pressedString = "";
			}

			// combine keys the user pressed to a string.
			this.__pressedString += e.getChar();

			// use the currently selected item to start the search.
			var startIndex = -1;
			var selection = this.getSelection();
			if (multi) {
				startIndex = this._manager.getLeadItem();
			}
			else {
				var model = this.getModel();
				if (selection && selection.getLength() > 0)
					startIndex = model.indexOf(selection.getItem(0));
			}

			// find matching item.
			var matchedItem = this.findItemByLabelFuzzy(this.__pressedString, startIndex);

			// if an item was found, select it or scroll it into view.
			if (matchedItem) {

				if (multi) {
					this._manager._setLeadItem(matchedItem.getIndex());
					this._manager._scrollItemIntoView(matchedItem.getIndex());
				}
				else {
					selection.setItem(0, matchedItem);
				}

				// stop default processing of the key input char when an item has been found 
				// or we may get the char appended to the input text.
				e.stop();
			}

			// Store timestamp
			if (this.getIncrementalSelection())
				this.__lastKeyPress = (new Date).valueOf();
			else
				this.__lastKeyPress = 0;
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
			var item, currentLabel;

			// go through all items
			startIndex = Math.max(0, Math.min(startIndex + 1 || 0, model.getLength()));
			for (var i = startIndex, l = model.getLength(); i < l; i++) {

				item = model.getItem(i);

				// skip not visible or disabled items.
				if (!item.isEnabled())
					continue;

				// get the label of the current item
				currentLabel = this._getItemText(item);

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
					currentLabel = this._getItemText(item);

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
		 * Overridden event handler for the modelChange event. The handler rebuils the lookup
		 * table when the child structure changed.
		 * 
		 * When invoked while processing server actions, suspend the
		 * model changes until we are done.
		 *
		 * @param e {qx.event.type.Data} The data event.
		 */
		_onModelChange: function (e) {

			// don't do anything.

			// the mode is changed only by _applyItems, which
			// is where we update the virtual list after all changes
			// have been applied.

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
		}

		//---------------------------------------------------------
		// END: qx.ui.list.core.IListDelegate implementation.
		//---------------------------------------------------------
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
 * wisej.web.VirtualCheckedListBox
 */
qx.Class.define("wisej.web.VirtualCheckedListBox", {

	extend: wisej.web.VirtualListBox,

	construct: function () {

		this.base(arguments);

		this.addListener("keypress", this._onKeyPress);
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

		// keeps track of the datab inding in process to suppress 
		// property change events fired by the cell widgets.
		__binding: false,

		/**
		 * Applies the checkedItems property.
		 */
		setCheckedItems: function (value, old) {

			var model = this.getModel();

			// reset the items check state.
			for (var i = 0, l = model.getLength(); i < l; i++) {

				// skip if the item is also in the new list.
				if (value) {
					if (value.findIndex(function (element) { return element.index === i; }) > -1)
						continue;
				}

				this.__setCheckState(model.getItem(i), false);
			}

			// change the check state of the specified items.
			if (value && value.length > 0) {
				for (var i = 0; i < value.length; i++) {
					var data = value[i];
					this.__setCheckState(model.getItem(data.index), data.state);
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

				var selection = this.getSelection();
				for (var i = 0; i < selection.getLength(); i++) {
					selection.getItem(i).toggleCheckState();
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
				if (this.getSelectionMode() !== "none") {

					var index = item.getLayoutParent().getIndex();
					if (index > -1) {
						var model = this.getModel();
						this.getSelection().setItem(model.getItem(index));
					}
				}
			}
		},

		_onItemBeforeChangeCheckState: function (e) {

			if (this.__binding)
				return;

			if (this.isReadOnly())
				e.preventDefault();
		},

		_onItemChangeCheckState: function (e) {

			if (this.__binding)
				return;

			if (this.core.processingActions)
				return;

			if (this.isReadOnly())
				return;

			var item = e.getTarget();
			if (item) {

				var index = item.getIndex();
				if (index > -1) {
					// update the data model.
					var model = this.getModel();
					model.getItem(index).setCheckState(item.getCheckState());

					// update the server.
					this.fireDataEvent("itemCheckChanged", {
						index: index,
						state: item.getCheckState()
					});
				}
			}
		},

		/**
		 * Creates the data item to add to the list model.
		 * 
		 * @param {Map} data Map of properties for each list item.
		 * @returns {wisej.web.listbox.CheckedDataItem} Instance created from the incoming data.
		 */
		_createDataItem: function (data) {
			var item = new wisej.web.listbox.CheckedDataItem();
			item.set(data);
			return item;
		},

		/**
		 * Creates the checkbox list item to add to the listbox.
		 */
		_createListItem: function () {

			var item = new wisej.web.listbox.CheckedListItem();
			item.setAppearance(this.getItemAppearance());
			item.addListener("click", this._onItemClick, this);
			item.addListener("changeCheckState", this._onItemChangeCheckState, this);
			item.addListener("beforeChangeCheckState", this._onItemBeforeChangeCheckState, this);
			return item;
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

			this.__binding = true;
			try {

				this.base(arguments, controller, item, index);
				controller.bindProperty("checkState", "checkState", null, item, index);

			} finally {

				this.__binding = false;
			}
		}
	}

});


/**
 * wisej.web.listbox.DataItem
 *
 * Data item in the data model.
 */
qx.Class.define("wisej.web.listbox.DataItem", {

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


/**
 * wisej.web.listbox.CheckedDataItem
 *
 * Data item in the data model for the VirtualCheckedListBox.
 */
qx.Class.define("wisej.web.listbox.CheckedDataItem", {

	extend: wisej.web.listbox.DataItem,

	properties: {
		/**
		 * CheckState property.
		 */
		checkState: { init: false, check: "Boolean", nullable: true, event: "changeCheckState" }
	}
});
