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
 * wisej.web.listview.ItemView
 *
 * Represents the item view - the list, tile and icon views -  in 
 * the wisej.web.ListView widget.
 */
qx.Class.define("wisej.web.listview.ItemView", {

	extend: qx.ui.virtual.core.Scroller,

	implement: [qx.ui.virtual.core.IWidgetCellProvider],

	construct: function (owner) {

		if (!(owner instanceof wisej.web.ListView))
			throw new Error("The owner must be an instance of wisej.web.ListView.");

		this.__owner = owner;

		// initialize the data model.
		this.setDataModel(new wisej.web.listview.ItemDataModel);

		// call the base constructor.
		this.base(arguments);

		// create the inner virtual cell container.
		this.__layer = new wisej.web.listview.ItemCellLayer(this);
		this.getPane().addLayer(this.__layer);

		// create the cell template.
		this.__cellProvider = new wisej.web.listview.ItemCellProvider(this);

		// create the selection manager.
		this.__selectionManager = new qx.ui.virtual.selection.CellRectangle(this.getPane(), this);
		this.__selectionManager.setDrag(true);
		this.__selectionManager.attachPointerEvents();
		this.__selectionManager.attachKeyEvents(this);
		this.__selectionManager.addListener("changeSelection", this._onChangeSelection, this);

		// hook he resize event to adjust the number of columns.
		this.getPane().addListener("resize", this._onPaneResize, this);

		// listen to the keyboard to start editing or toggle the checkboxes.
		this.getPane().addListener("keypress", this._onKeyPress, this);

		// issue the first data load when becoming visible.
		this.addListenerOnce("appear", this.reloadData, this);

		this.addListener("blur", this._onFocusChanged);
		this.addListener("focus", this._onFocusChanged);
	},

	properties: {

		/**
		 * SelectionMode property.
		 */
		selectionMode: { init: "one", check: ["none", "one", "multiSimple", "multiExtended"], apply: "_applySelectionMode" },

		/**
		 * dataModel property.
		 *
		 * Gets or sets the data model that supplies item data to the listview.
		 * The default is wisej.web.listview.DataModel.
		 */
		dataModel: { init: null, apply: "_applyDataModel" },

		/**
		 * ItemSize property.
		 *
		 * Sets the size of the list items.
		 */
		itemSize: { init: { width: 128, height: 96 }, check: "Map" },

		/**
		 * IconSize property.
		 *
		 * Sets the size of the icon in the list item.
		 */
		iconSize: { init: { width: 32, height: 32 }, check: "Map" },

		/**
		 * StateIconSize property.
		 *
		 * Sets the size of the state icon in the listView item. The state icon is displayed before the item's icon.
		 */
		stateIconSize: { init: { width: 16, height: 16 }, check: "Map" },

		/**
		 * PrefetchItems property.
		 * 
		 * Indicates the number of items to prefetch outside of the visible range.
		 */
		prefetchItems: { init: 0, check: "Integer", apply: "_applyPrefetchItems" }

	},

	members: {

		// the owner ListView.
		__owner: null,

		// the virtual cells container.
		__layer: null,

		// the virtual cell renderer.
		__cellProvider: null,

		// the selection manager instance.
		__selectionManager: null,

		// current number of rows and columns.
		__rowCount: 0,
		__colCount: 0,
		__itemCount: 0,

		// when __updateMode is true, changes to the data model are ignored.
		__updateMode: false,

		// selection ranges that couldn't have been applied because the listview didn't 
		// define the internal virtual grid at the time the selection was applied.
		__pendingSelectionArgs: null,

		// scrollIntoView args that couldn't be called because the listview wasn't populated yet.
		__pendingScrollIntoViewArgs: null,

		// suppresses firing server events.
		__internalChange: false,

		/**
		 * Returns all the currently rendered widgets.
		 */
		getItemWidgets: function () {

			return this.__layer.getChildren();
		},

		/**
		 * Clears the list and reloads the data set.
		 */
		reloadData: function () {

			if (wisej.web.DesignMode)
				return;

			this.__itemCount = 0;
			var dataModel = this.getDataModel();
			if (dataModel && dataModel.reloadData) {
				dataModel.reloadData();
			}
		},

		/**
		 * Returns the id of the owner listview.
		 * Used by the data model to connect the remote data store.
		 */
		getOwnerId: function () {

			return this.__owner.getId();
		},

		/**
		 * Returns whether the items should show the checkbox icon.
		 * The check box icon is the same as the state icon.
		 */
		getShowCheckBoxes: function () {

			return this.__owner.isCheckBoxes();
		},

		/**
		 * Returns the view mode.
		 */
		getView: function () {

			return this.__owner.getView();
		},

		// returns the value of the property ListView.showItemTooltips.
		getShowItemTooltips: function () {

			return this.__owner.getShowItemTooltips();
		},

		// returns the value of the property ListView.wrap.
		getLabelWrap: function () {

			return this.__owner.getLabelWrap();
		},

		// returns the default color for svg icons.
		getIconColor: function () {

			return this.__owner.getIconColor();
		},

		// returns the item padding value.
		getItemPadding: function () {

			return this.__owner.getItemPadding();
		},

		// fires a data event on the ListView control.
		fireItemEvent: function (e, type, data) {

			if (this.__owner.isWired(type))
				this.__owner.fireItemEvent(e, type, data);
		},

		/**
		 * Sets the focused item.
		 *
		 * @param index {Integer} index of the item or row to scroll into view.
		 */
		setFocusedItem: function (index) {

			this.scrollIntoView(index);
			this.__selectionManager.setLeadItem(index);
			this.__selectionManager.replaceSelection([index]);
		},

		/**
		 * Updates an array or items, including all values and styles.
		 *
		 * This method is called from the server.
		 *
		 * @param actions {Array} the array of actions and items, each element is a map: {action: 0|1|2, index:, rowData: }
		 */
		updateItems: function (actions) {

			if (actions && actions.length > 0) {
				// enter update mode to trigger the grid update only once.
				this.__updateMode = true;
				try {
					for (var i = 0, length = actions.length; i < length; i++) {
						var action = actions[i];
						switch (action.type) {

							case 0: // Update
								this.updateItem(action.index, action.rowData);
								break;

							case 1: // Delete
								this.deleteItem(action.index);
								break;

							case 2: // Insert
								this.insertItem(action.index, action.rowData);
								break;
						}
					}

					// update the view now.
					this.__itemCount = this.getDataModel().getRowCount();
					this.update();
				}
				finally {
					this.__updateMode = false;
				}
			}
		},

		/**
		 * Updates an item, including values and styles.
		 *
		 * This method is called from the server.
		 *
		 * @param index {Integer} the index of item to update.
		 * @param rowData {Map} the item data, including all values and styles.
		 */
		updateItem: function (index, rowData) {

			var model = this.getDataModel();
			model.setRowData(index, rowData);
		},

		/**
		 * Deletes the item from the data model without issuing a data load request.
		 *
		 * This method is called from the server.
		 *
		 * @param index {Integer} the index of item to delete.
		 */
		deleteItem: function (index) {

			var model = this.getDataModel();
			model.removeRow(index);
		},

		/**
		 * Implements the qx.ui.virtual.selection.Abstract._isSelectable() method.
		 * Returns true if the index is within the range of available items.
		 */
		isItemSelectable: function (index) {

			return this.isEnabled() && index > -1 && index < this.__itemCount;
		},

		/**
		 * Inserts the new item in the data model without issuing a data load request.
		 *
		 * This method is called from the server.
		 *
		 * @param index {Integer} the index of item to insert.
		 * @param rowData {Map} the item data, including all values and styles.
		 */
		insertItem: function (index, rowData) {

			var model = this.getDataModel();
			model.insertRow(index, rowData);
		},

		/**
		 * Scroll the item into view. Issues a data load if necessary.
		 *
		 * @param index {Integer} index of the item or row to scroll into view.
		 */
		scrollIntoView: function (index) {

			// store the for a deferred call, after the data count is loaded.
			if (this.__itemCount == 0) {
				this.__pendingScrollIntoViewArgs = index;
				return;
			}

			this.__selectionManager._scrollItemIntoView(index);
		},

		/**
		 * Returns the number of items currently loaded.
		 */
		_getItemCount: function () {

			return this.__itemCount;
		},

		/**
		 * Applies the PrefetchItems property.
		 * 
		 * @param {Integer} value New value.
		 * @param {Integer?} old Previous value.
		 */
		_applyPrefetchItems: function (value, old) {

			var pixels = this.getItemSize().width * value;
			this.getPane().prefetchX(pixels, pixels, pixels, pixels);

			var pixels = this.getItemSize().height * value;
			this.getPane().prefetchY(pixels, pixels, pixels, pixels);
		},

		/**
		 * Applies the dataMode property.
		 */
		_applyDataModel: function (value, old) {

			if (old != null) {
				old.removeListener("dataChanged", this._onDataChanged, this);
			}

			if (value == null) {
				this.__itemCount = 0;
				this.update();
			}
			else {

				// listen to the dataChanged event to update the view.
				value.addListener("dataChanged", this._onDataChanged, this);

				// link the data model to this listview.
				value.init(this);
			}
		},

		// update the view when handling the "dataChanged" event from the data model.
		_onDataChanged: function (e) {

			// ignore if in update  mode (bulk updates).
			if (this.__updateMode)
				return;

			// ignore if not visible.
			// it will issue a new reload when it becomes visible again.
			if (!this.isVisible())
				return;

			this.__itemCount = this.getDataModel().getRowCount();
			this.update();

			// notify the ListView on the server.
			if (this.__owner.isWired("dataUpdated")) {
				var data = e.getData();
				this.__owner.fireDataEvent("dataUpdated", { firstIndex: data.firstRow, lastIndex: data.lastRow });
			}
		},

		// updates the view when it's resized.
		_onPaneResize: function (e) {

			this.update();

		},

		/**
		 * Event handler. Called when listview gains or loses
		 * the focus to show the focus frame on the
		 * active item
		 */
		_onFocusChanged: function (e) {

			var index = undefined;

			// if this is the first time we gain the focus, automatically
			// select the first selectable item.
			if (this.hasState("focused")) {
				var selection = this.__selectionManager.getSelection();
				if (selection && selection.length === 0) {
					index = this.__selectionManager._getFirstSelectable();
				}
			}

			// show/hide the focus indicator.
			this.__updateFocusedItem(index);
		},

		/**
		 * Schedule a deferred update of all the visible items.
		 */
		update: function () {

			if (this.isVisible())
				qx.ui.core.queue.Widget.add(this, "updateItems");

		},

		syncWidget: function (jobs) {

			if (jobs && jobs["updateItems"]) {

				// process the update asynchronously, otherwise
				// it may skip a beat since this is being process in a syncWidget cycle
				// and the widget cannot add itself back while processing the job.
				var me = this;
				setTimeout(function () {
					me.__updateItems();
				}, 1);
			}

			if (jobs && jobs["scrollIntoView"]) {
				this.scrollIntoView(this.__pendingScrollIntoViewArgs);
				this.__pendingScrollIntoViewArgs = null;
			}
			if (jobs && jobs["setSelectionRanges"]) {
				this.setSelectionRanges(this.__pendingSelectionArgs, true);
				this.__pendingSelectionArgs = null;
			}
			if (jobs && jobs["updateFocusedItem"]) {
				this.__updateFocusedItem();
			}
		},

		// updates all the items in view.
		__updateItems: function () {

			var pane = this.getPane();
			var bounds = pane.getBounds();
			if (!bounds || !bounds.width)
				return;

			var itemSize = this.getItemSize();
			pane.getRowConfig().setDefaultItemSize(itemSize.height);
			pane.getColumnConfig().setDefaultItemSize(itemSize.width);

			var paneWidth = bounds.width;
			var itemCount = this.__itemCount;
			var itemWidth = pane.getColumnConfig().getDefaultItemSize();
			this.__colCount = Math.max(1, Math.floor(paneWidth / itemWidth));
			this.__rowCount = Math.ceil(itemCount / this.__colCount) || 0;

			var innerPane = pane;
			innerPane.getColumnConfig().setItemCount(this.__colCount);
			innerPane.getRowConfig().setItemCount(this.__rowCount);
			innerPane.fullUpdate();

			// schedule pending calls.
			if (itemCount > 0) {
				if (this.__pendingScrollIntoViewArgs)
					qx.ui.core.queue.Widget.add(this, "scrollIntoView");

				if (this.__pendingSelectionArgs)
					qx.ui.core.queue.Widget.add(this, "setSelectionRanges");
			}
		},

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

			this.__selectionManager.setMode(value);
		},

		// fetch the data items as needed.
		beforeFullUpdate: function (firstRow, firstColumn, rowSizes, columnSizes) {

			var dataModel = this.getDataModel();
			var rowCount = rowSizes.length * this.__colCount;
			var startIndex = firstRow * this.__colCount + firstColumn;

			dataModel.prefetchRows(startIndex, startIndex + rowCount - 1);

		},

		// nothing to do here, yet.
		afterFullUpdate: function (firstRow, firstColumn, rowSizes, columnSizes) {

		},

		// overridden from  IWidgetCellProvider.
		// Returns the configured cell for the given cell.
		// The return value may be null to indicate that the cell should be empty.
		getCellWidget: function (row, column) {

			var itemIndex = row * this.__colCount + column;

			// eof?
			if (itemIndex >= this.__itemCount)
				return null;

			// retrieve the data from the store.
			var dataModel = this.getDataModel();
			var rowData = dataModel.getRowData(itemIndex);
			if (rowData == null) {
				dataModel.prefetchRows(itemIndex, itemIndex + 1);
				return null;
			}

			return this._createCellWidget(row, column, rowData);
		},

		// overridden from IWidgetCellProvider.
		// Release the given cell widget. Either pool or destroy the widget.
		poolCellWidget: function (widget) {

			this.__cellProvider.pool(widget);
		},

		/**
		 * Returns a fully initialized cell widget instance
		 * for the specified cell coordinates.
		 */
		_createCellWidget: function (row, column, data) {

			// determine the state of the cell.
			var cell = { row: row, column: column };
			var states = this._getWidgetState(cell);

			// return the widget used to render the cell.
			var widget = this.__cellProvider.getCellWidget(data, states);
			widget.setUserData("cell", cell);

			// update the appearance to be listview/items/item.
			this._setChildAppearance(widget);

			// update the icon size to match the size set in the owner list view.
			widget.setIconSize(this.getIconSize());

			// schedule a focused item update in order to complete the
			// creation of the virtual widget.
			if (this.hasState("focused"))
				qx.ui.core.queue.Widget.add(this, "updateFocusedItem");

			// host a custom widget in the cell widget.
			this.__hostWidgetInCellWidget(widget, data);

			return widget;
		},

		__hostWidgetInCellWidget: function (cellWidget, data)
		{
			if (!data || !data.styles || !data.styles[0]) {
				cellWidget.clearHostedWidget();
				return;
			}

			var widget = Wisej.Core.getComponent(data.styles[0].widgetId);
			if (widget) {
				widget.setUserData("owner", this.__owner);
				cellWidget.setHostedWidget(widget, data.styles[0].widgetDock);
			}
		},

		/**
		 * Makes the child component act as a subcomponent when the 
		 * appearance key is defined as "$parent/[child key]".
		 */
		_setChildAppearance: function (widget) {

			widget.$$subcontrol = "item";
			widget.$$subparent = this.__owner;
		},

		/**
		 * Returns the state for the specified widget located
		 * at the specified cell.
		 */
		_getWidgetState: function (cell) {

			var index = this.__getIndexFromCell(cell);

			// determine the selected state of the cell.
			var states = {};
			if (this.__selectionManager.isItemSelected(index))
				states.selected = true;

			// propagate the view mode state.
			states[this.__owner.getView()] = true;

			return states;
		},

		/**
		 * Keeps track of the item widget with the focus.
		 *
		 * @param index {Integer?} the index of the new focused widget.
		 */
		__updateFocusedItem: function (index) {

			var focused = this.hasState("focused");

			var newFocused = null;
			var oldFocused = this.__focusedItem;

			if (focused) {

				if (index == null)
					index = this.__selectionManager.getLeadItem();

				if (index == null || index == -1) {
					var selection = this.__selectionManager.getSelection();
					if (selection && selection.length > 0)
						index = selection[0];
				}

				if (index != null) {
					var cell = this.__getCellFromIndex(index);
					newFocused = this.__layer.getRenderedCellWidget(cell.row, cell.column);
				}
			}

			if (oldFocused)
				oldFocused.removeState("focused");

			if (newFocused && focused)
				newFocused.addState("focused");

			this.__focusedItem = newFocused;
		},

		/** The widget that currently has the focus. */
		__focusedItem: null,

		/**
		 * Called by CellRectangle selection manager.
		 */
		styleSelectable: function (index, type, wasAdded) {

			// change the selected state of the index.
			var cell = this.__getCellFromIndex(index);
			var widget = this.__layer.getRenderedCellWidget(cell.row, cell.column);
			if (widget) {

				// update the states on the affected widget.
				var states = this._getWidgetState(cell);
				this.__cellProvider.updateStates(widget, states);

				// schedule a focused item update in order to complete the
				// creation of the virtual widget.
				if (this.hasState("focused") && wasAdded && type === "lead")
					this.__updateFocusedItem(index);
			}
		},

		/**
		 * Returns the selected items in a collection of ranges.
		 */
		getSelectionRanges: function (selection) {

			var selectionRanges = [];

			selection = selection || this.__selectionManager.getSelection();

			if (selection != null && selection.length > 0) {

				var range = null;
				var indices = selection.sort(function (a, b) { return a - b; });

				// aggregate the selected indices into ranges.
				for (var i = 0, length = indices.length; i < length; i++) {

					var index = indices[i];

					// either increase the current range, or create a new range
					// when the gap is > 1.
					if (range == null || (index - range.maxIndex) > 1) {

						if (range != null)
							selectionRanges.push(range);

						range = { minIndex: index, maxIndex: index };
					}
					else {
						range.maxIndex = index;
					}
				}
				if (range != null)
					selectionRanges.push(range);
			}

			return selectionRanges;

		},

		/**
		 * Updates the selected items.
		 * 
		 * @param ranges {Array[{minIndex, maxIndex}]} Array of {minIndex, maxIndex} ranges.
		 * @param internal {Boolean?} Optional flag to indicate if the selection should raise the related events. When true, events are not raised.
		 */
		setSelectionRanges: function (ranges, internal) {

			if (!ranges || ranges.length === 0) {
				this.__selectionManager.clearSelection();
			}
			else {

				// if we don't have a column count yet we can't update the selection.
				// save the ranges for a deferred update.
				if (!this.__colCount) {
					this.__pendingSelectionArgs = ranges;
					return;
				}

				// convert the ranges into cells.
				var items = [];
				for (var i = 0, length = ranges.length; i < length; i++) {

					var r = ranges[i];
					for (var index = r.minIndex; index <= r.maxIndex; index++) {
						items.push(index);
					}
				}

				if (internal === true)
					this.__internalChange = true;

				try {
					var leadItem = this.__selectionManager.getLeadItem();

					this.__selectionManager.replaceSelection(items);

					// preserve the focused item.
					if (leadItem != null)
						this.__selectionManager.setLeadItem(leadItem);
				}
				finally {
					if (internal === true)
						this.__internalChange = false;
				}
			}
		},

		// returns true if the grid can fire the server event.
		__canFireServerEvent: function () {

			return !this.__internalChange && !wisej.web.DesignMode && !Wisej.Core.processingActions;

		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "editor":
					control = new wisej.web.listview.LabelEditor().set({
						visibility: "excluded"
					});
					control.addState("inner");
					control.addListener("endEdit", this._onLabelEditorEndEdit, this);
					break;
			}

			return control || this.base(arguments, id);
		},

		/*---------------------------------------------------------------------------
		  Label editing.
		---------------------------------------------------------------------------*/

		/**
		 * Enters edit mode on the specified item.
		 */
		editItem: function (index) {

			var cell = this.__getCellFromIndex(index);
			var widget = this.__layer.getRenderedCellWidget(cell.row, cell.column);
			if (widget) {

				// now that we have found the rendered widget and scrolled it into view, start editing the label.
				var editor = this.getChildControl("editor");
				editor.editLabel(widget);
			}
		},

		_onLabelEditorEndEdit: function (e) {

			var data = e.getData();

			// redirect endEdit events to the parent ListView.
			this.__owner.fireDataEvent("endEdit", {
				index: this.__getItemIndex(data.item),
				text: data.text
			});

			this.activate();
		},

		_onKeyPress: function (e) {

			// let embedded widgets handle their own keystrokes.
			var target = e.getTarget();
			target = target ? target.getFocusTarget() : null;
			if (this !== target && target && target.getLayoutParent().$$subcontrol === "host") {

				e.stopPropagation();
				return;
			}

			// if checkboxes are visible, toggle the check state
			// when pressing enter.
			if (this.getShowCheckBoxes()) {

				switch (e.getKeyIdentifier()) {

					case "Space":
						var selection = this.__selectionManager.getSelection();
						if (selection && selection.length > 0) {
							for (var i = 0; i < selection.length; i++)
								this.__owner.fireDataEvent("itemCheck", selection[i]);
						}
						e.stop();
						break;
				}
			}

			// if label editing is enabled, process F2
			// to start editing the only selected item.
			if (this.__owner.isLabelEdit()) {

				switch (e.getKeyIdentifier()) {

					case "F2":
						var selection = this.__selectionManager.getSelection();
						if (selection && selection.length === 1)
							this.__owner.fireDataEvent("beginEdit", selection[0]);

						e.stop();
						return;
				}
			}
		},

		// fires the "beginEdit" event when the user clicks
		// on a label in a selected item.
		_onItemLabelClick: function (e) {

			if (this.__owner.isLabelEdit()) {

				var item = e.getCurrentTarget();
				var index = this.__getItemIndex(item);
				if (this.__selectionManager.isItemSelected(index))
					this.__owner.fireDataEvent("beginEdit", index);
			}
		},


		/*---------------------------------------------------------------------------
		  Event handlers for events fires by child virtual items. Fire the events
		  back to the server.
		---------------------------------------------------------------------------*/

		_onItemClick: function (e) {

			var item = e.getCurrentTarget();
			var index = this.__getItemIndex(item);
			this.fireItemEvent(e, "itemClick", index);

			// move the focus indicator.
			this.__updateFocusedItem(index);

			// determine if the user clicked the state icon.
			var clickedWidget = qx.ui.core.Widget.getWidgetByElement(e.getOriginalTarget());
			if (clickedWidget != null && clickedWidget != item && clickedWidget === item.getChildControl("state"))
				this.fireItemEvent(e, "itemCheck", index);
		},

		_onItemMouseUp: function (e) {

			// fire ItemClick when the button is not the left.
			if (e.getButton() !== "left") {
				var item = e.getCurrentTarget();
				var index = this.__getItemIndex(item);
				this.fireItemEvent(e, "itemClick", index);
			}
		},

		_onItemDblClick: function (e) {

			var item = e.getCurrentTarget();
			var index = this.__getItemIndex(item);
			this.fireItemEvent(e, "itemDblClick", index);
		},

		_onItemPointerOver: function (e) {

			var item = e.getTarget();
			var index = this.__getItemIndex(item);

			this.fireItemEvent(e, "itemOver", index);
		},

		_onItemPointerOut: function (e) {

			var item = e.getTarget();
			var index = this.__getItemIndex(item);

			if (!qx.ui.core.Widget.contains(item, e.getRelatedTarget()))
				this.fireItemEvent(e, "itemLeave", index);
		},

		// determines the target cell (ListViewItem) for a drag operation
		// and adds it to the event object.
		_onDragEvent: function (e) {

			var item = this.__findItem(e);
			if (item instanceof wisej.web.listview.ItemCellWidget) {
				var index = this.__getItemIndex(item);
				if (index > -1)
					e.setUserData("eventData", index);
			}
		},

		// select the item that initiated the drag operation.
		_onDragStart: function (e) {

			var item = this.__findItem(e);
			if (item instanceof wisej.web.listview.ItemCellWidget) {
				var index = this.__getItemIndex(item);
				if (index > -1) {
					this.__selectionManager.replaceSelection([index]);

					this.fireItemEvent(e, "itemDrag", index);
				}
			}
		},

		__findItem: function (e) {
			var item = e.getOriginalTarget();
			if (item instanceof Element)
				item = qx.ui.core.Widget.getWidgetByElement(item);

			while (item != null && !(item instanceof wisej.web.listview.ItemCellWidget)) {
				item = item.getLayoutParent();
			}
			return item;
		},

		// determines the index of the item from its row, column position.
		__getItemIndex: function (item) {

			return this.__getIndexFromCell(item.getUserData("cell"));
		},

		// returns the index of the specified cell.
		__getIndexFromCell: function (cell) {

			return cell
				? cell.row * this.__colCount + cell.column
				: -1;
		},

		// converts the item index into cell coordinates.
		__getCellFromIndex: function (index) {

			var row = (index / this.__colCount) | 0;
			return {
				row: row,
				column: index - (row * this.__colCount)
			};
		},


		/*---------------------------------------------------------------------------
		  Selection event handler. Fire the events back to the server.
		---------------------------------------------------------------------------*/

		_onChangeSelection: function (e) {

			if (!this.__canFireServerEvent())
				return;

			if (this.hasState("focused"))
				this.__updateFocusedItem();

			// need to convert the selection array into selection ranges.
			// each selected item in the selection array is a map indicting
			// the select row and column.
			var selectionRanges = this.getSelectionRanges(e.getData());
			this.__owner.fireDataEvent("selectionChanged", selectionRanges);
		},
	},

	destruct: function()
	{
		this.getDataModel().dispose();
		this._disposeObjects("__layer", "__cellProvider", "__selectionManager");

	}
});


/**
 * wisej.web.listview.ItemCellProvider
 *
 * Creates, pools and reuses wisej.web.listview.ItemCellWidget instances in the wisej.web.listview.ItemView.
 */
qx.Class.define("wisej.web.listview.ItemCellProvider", {

	extend: qx.ui.virtual.cell.WidgetCell,

	construct: function (itemView) {

		this.base(arguments);

		this.__itemView = itemView;
	},

	members: {

		// the inner container used to show the items in the items views.
		__itemView: null,

		// overridden
		_createWidget: function () {

			var widget = new wisej.web.listview.ItemCellWidget().set({
				wrap: this.__itemView.getLabelWrap(),
				iconSize: this.__itemView.getIconSize(),
				itemSize: this.__itemView.getItemSize(),
				padding: this.__itemView.getItemPadding(),
				iconColor: this.__itemView.getIconColor(),
				stateIconSize: this.__itemView.getStateIconSize(),
				blockToolTip: !this.__itemView.getShowItemTooltips()
			});

			widget.addListener("click", this.__itemView._onItemClick, this.__itemView);
			widget.addListener("mouseup", this.__itemView._onItemMouseUp, this.__itemView);
			widget.addListener("dblclick", this.__itemView._onItemDblClick, this.__itemView);
			widget.addListener("labelclick", this.__itemView._onItemLabelClick, this.__itemView);
			widget.addListener("pointerout", this.__itemView._onItemPointerOut, this.__itemView);
			widget.addListener("pointerover", this.__itemView._onItemPointerOver, this.__itemView);

			return widget;
		},

		// overridden
		updateData: function (widget, rowData) {

			var data = rowData.data || {};

			// resolve the theme image alias.
			var icon = data.icon;
			var stateIcon = data.stateIcon;

			// show the checkbox icon instead of the state icon?
			if (!stateIcon && this.__itemView.getShowCheckBoxes()) {
				stateIcon = data.checked ? "checkbox-checked" : "checkbox";
			}

			// build the text according to the current view.
			var label;
			switch (this.__itemView.getView()) {
				case "tile":

					// in tile view the first 3 subitems are appended.
					for (var i = 0; i < 3; i++) {
						var value = data[i];
						if (value == null)
							break;

						if (i > 0)
							label += "<br/>" + value;
						else
							label = value;
					}
					break;

				default:
					label = data[0];
					break;
			}

			// assign the styles.
			widget.resetBackgroundColor();
			widget.resetTextColor();
			widget.resetFont();

			var styles = rowData.styles;
			if (styles && styles[0]) {
				var color = styles[0].backgroundColor;
				if (color)
					widget.setBackgroundColor(color);

				var color = styles[0].color;
				if (color)
					widget.setTextColor(color);

				var font = styles[0].font;
				if (font)
					widget.setFont(font);
			}

			var tooltip = rowData.tooltips ? rowData.tooltips[0] : null;

			widget.set({
				icon: icon || null,
				label: label || "",
				stateIcon: stateIcon || "",
				toolTipText: tooltip || "",
				wrap: this.__itemView.getLabelWrap()
			});
		}
	}
});


/**
 * wisej.web.listview.ItemCellWidget
 *
 * The widget that is created when rendering an wisej.web.listview.ItemCell.
 */
qx.Class.define("wisej.web.listview.ItemCellWidget", {

	extend: qx.ui.core.Widget,

	properties: {

		/**
		 * Label property.
		 *
		 * Sets the text to display in the listview item.
		 */
		label: { init: null, check: "String", apply: "_applyLabel" },

		/**
		 * Icon property.
		 *
		 * Sets the icon in the list item.
		 */
		icon: { init: null, check: "String", apply: "_applyIcon" },

		/**
		 * iconColor property.
		 *
		 * Determines the default fill color for svg icons.
		 */
		iconColor: { nullable: true, check: "Color", apply: "_applyIconColor" },

		/**
		 * Wrap property.
		 *
		 * Controls whether text wrap is activated or not. But please note, that
		 * this property works only in combination with the property {@link #rich}.
		 * The {@link #wrap} has only an effect if the {@link #rich} property is
		 * set to <code>true</code>, otherwise {@link #wrap} has no effect.
		 */
		wrap: { init: true, check: "Boolean", apply: "_applyWrap" },

		/**
		 * IconSize property.
		 *
		 * Sets the size of the icon in the list item.
		 */
		iconSize: { init: null, check: "Map", apply: "_applyIconSize" },

		/**
		 * ItemSize property.
		 *
		 * Sets the size of the list items.
		 */
		itemSize: { init: null, check: "Map", apply: "_applyItemSize" },

		/**
		 * StateIconSize property.
		 *
		 * Sets the size of the state icon in the list item.
		 */
		stateIconSize: { init: null, check: "Map", apply: "_applyStateIconSize" },

		/**
		 * StateIcon property.
		 *
		 * Sets the state icon displayed before the icon.
		 */
		stateIcon: { init: null, check: "String", apply: "_applyStateIcon" }
	},

	construct: function () {

		this.base(arguments);

		this.__layout = new qx.ui.layout.Grid();
		this._setLayout(this.__layout);
		this.setDroppable(true);

		// use the LargeIcon default - no state icon.
		this.__layout.setRowFlex(0, 1);
		this.__layout.setColumnFlex(0, 1);
		this.__layout.setRowAlign(0, "center", "middle");

		this.addListener("pointerover", this._onPointerOver, this);
		this.addListener("pointerout", this._onPointerOut, this);
	},

	destruct : function() {
		this.removeListener("pointerover", this._onPointerOver, this);
		this.removeListener("pointerout", this._onPointerOut, this);
	},

	members: {

		// the layout engine.
		__layout: null,

		// forwarded states.
		_forwardStates: {

			selected: true,
			focused: true,
			hovered: true,

			// view states.
			largeIcon: true,
			smallIcon: true,
			list: true,
			tile: true,
		},

		_applyLabel: function (value, old) {

			this.getChildControl("label").setValue(value);
		},

		_applyWrap: function (value, old) {

			var label = this.getChildControl("label");
			var el = label.getContentElement();
			label.setWrap(value);
			el.setStyle("textOverflow", !value ? "ellipsis" : null);
		},

		_applyIcon: function (value, old) {

			var icon = this.getChildControl("icon");
			icon.setSource(value);
			icon.setVisibility(value != null ? "visible" : "excluded");

		},

		_applyIconColor: function (value, old) {

			this.getChildControl("icon").setTextColor(value);
			this.getChildControl("state").setTextColor(value);
		},

		_applyIconSize: function (value, old) {

			var icon = this.getChildControl("icon");
			if (value) {
				icon.setWidth(value.width);
				icon.setHeight(value.height);
			}
			else {
				icon.resetWidth();
				icon.resetHeight();
			}
		},

		_applyItemSize: function (value, old) {

			var label = this.getChildControl("label");
			if (value) {
				label.setMaxHeight(value.height);
			}
			else {
				label.resetMaxHeight();
			}
		},

		_applyStateIconSize: function (value, old) {

			if (value) {
				var state = this.getChildControl("state");
				state.setWidth(value.width);
				state.setHeight(value.height);
			}

		},

		_applyStateIcon: function (value, old) {

			var stateIcon = this.getChildControl("state");
			stateIcon.setSource(value);
			stateIcon.setVisibility(value ? "visible" : "excluded");

		},

		// overridden: adapt the layout to the state.
		addState: function (state) {

			this.base(arguments, state);

			this.__updateLayout();
		},

		/**
		 * Event handler for the pointer over event.
		 */
		_onPointerOver : function() {
			this.addState("hovered");
		},


		/**
		 * Event handler for the pointer out event.
		 */
		_onPointerOut : function() {
			this.removeState("hovered");
		},

		// update the internal widget layout to match the state
		// and the ListView.CheckBoxes property value.
		__updateLayout: function () {

			var label = this.getChildControl("label", true);
			var icon = this.getChildControl("icon", true);
			var stateIcon = this.getChildControl("state", true);
			var host = this.getChildControl("host", true);
			if (host && host.isVisible())
				label.exclude();

			// reset the layout flex parameters.
			this.__layout.setRowFlex(0, 0);
			this.__layout.setRowFlex(1, 0);
			this.__layout.setColumnFlex(0, 0);
			this.__layout.setColumnFlex(1, 0);
			this.__layout.setColumnFlex(2, 0);

			if (this.hasState("tile") || this.hasState("smallIcon")) {

				// tile and smallIcon are laid out in a single
				// row (0) on 3 columns.
				//
				//   +-----+----+-------------+
				//   +state|icon|label or host|
				//   +-----+----+-------------+

				this.__layout.setColumnAlign(0, "center", "middle");
				this.__layout.setColumnAlign(1, "center", "middle");
				this.__layout.setColumnAlign(2, "left", "middle");

				// the state icon (checkbox or custom state).
				if (stateIcon && stateIcon.isVisible()) {
					stateIcon.setLayoutProperties({ row: 0, column: 0 });
				}

				// the item's image.
				if (icon && icon.isVisible()){
					icon.setLayoutProperties({ row: 0, column: 1, colSpan: 1 });
				}

				// the item's label, or the hosted widget.
				if (label && label.isVisible()) {
					label.setLayoutProperties({ row: 0, column: 2, colSpan: 1 });
					this.__layout.setColumnFlex(2, 1);
				}
				else if (host && host.isVisible()) {
					host.setLayoutProperties({ row: 0, column: 2, colSpan: 1 });
					this.__layout.setColumnFlex(2, 1);
				}

				this.__layout.setRowFlex(0, 1);
			}
			else {

				// largeIconis laid out in two rows:
				//
				//   +-------+-----+
				//   + state | icon|
				//   +-------+-----+
				//   +label or host|
				//   +-------------+

				this.__layout.setColumnAlign(0, "center", "middle");
				this.__layout.setColumnAlign(1, "center", "middle");
				this.__layout.setRowAlign(0, "center", "middle");
				this.__layout.setRowAlign(1, "left", "middle");

				// the state icon (checkbox or custom state).
				if (stateIcon && stateIcon.isVisible()) {

					stateIcon.setLayoutProperties({ row: 0, column: 0 });

					// the item's image.
					if (icon && icon.isVisible()) {
						icon.setLayoutProperties({ row: 0, column: 1, colSpan: 2 });
						this.__layout.setColumnFlex(1, 1);
					}
					else {
						this.__layout.setColumnFlex(0, 1);
					}
				}
				else {

					// the item's image.
					if (icon && icon.isVisible()) {
						icon.setLayoutProperties({ row: 0, column: 0, colSpan: 2 });
						this.__layout.setColumnFlex(0, 1);
					}
				}

				// the item's label, or the hosted widget.
				if (label && label.isVisible()) {
					label.setLayoutProperties({ row: 1, column: 0, colSpan: 2 });
					this.__layout.setColumnFlex(0, 1);
				}
				else if (host && host.isVisible()) {
					host.setLayoutProperties({ row: 1, column: 0, colSpan: 2 });
					this.__layout.setColumnFlex(0, 1);
				}

				this.__layout.setRowFlex(1, 1);
			}
		},

		/**
		 * Sets the widget to host inside the cell widget.
		 */
		setHostedWidget: function(widget, dock)
		{
			var host = this._showChildControl("host");
			host._removeAll();

			// adapt the cell widget layout, if this is the first time.
			if (!this.$$widget) {
				this._excludeChildControl("label");
			}

			if (!dock || dock === "none") {
				var layout = host._getLayout();
				if (!(layout instanceof qx.ui.layout.Basic)) {
					if (layout)
						layout.dispose();
					host._setLayout(new qx.ui.layout.Basic());
				}
				host._add(widget);
			}
			else {
				var layout = host._getLayout();
				if (!(layout instanceof qx.ui.layout.Dock)) {
					if (layout)
						layout.dispose();
					host._setLayout(new qx.ui.layout.Dock());
				}

				var edge = "center";
				switch (dock) {
					case "top": edge = "north"; break;
					case "left": edge = "west"; break;
					case "bottom": edge = "south"; break;
					case "right": edge = "east"; break;
				}

				if (edge === "center") {
					widget.resetWidth();
					widget.resetHeight();
				}

				host._add(widget, { edge: edge });
			}
		},

		/**
		 * Removes the hosted widget and restores the regular cell widget layout.
		 */
		clearHostedWidget: function()
		{
			if (this.$$widget) {
				var host = this.getChildControl("host");
				host._removeAll();
				this.$$widget = null;
				host.exclude();

				this._showChildControl("label");
			}
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "state":
					control = new qx.ui.basic.Image().set({
						anonymous: true,
						visibility: "excluded"
					});
					// use the LargeIcon default - no state icon.
					this._add(control, { row: 0, column: 0 });
					control.addListener("changeVisibility", this.__updateLayout, this);
					break;

				case "icon":
					control = new qx.ui.basic.Image().set({
						anonymous: true,
						visibility: "excluded"
					});
					// use the LargeIcon default - no state icon.
					this._add(control, { row: 0, column: 1 });
					control.addListener("changeVisibility", this.__updateLayout, this);
					break;

				case "label":
					control = new qx.ui.basic.Label().set({
						rich: true,
						wrap: false,
						allowGrowX: true,
						allowGrowY: false,
						visibility: "visible"
					});
					this._add(control, { row: 1, column: 0, colSpan: 2 });
					control.addListener("changeVisibility", this.__updateLayout, this);
					control.addListener("pointerdown", this.__onLabelPointerDown, this);
					break;


				case "host":
					control = new qx.ui.core.Widget().set({
						allowGrowX: true,
						allowGrowY: true,
						visibility: "excluded"
					});
					this._add(control, { row: 1, column: 0, colSpan: 2 });
					control.addListener("changeVisibility", this.__updateLayout, this);
					break;
			}

			return control || this.base(arguments, id);
		},

		__onLabelPointerDown: function (e) {

			this.fireEvent("labelclick");
		}
	}
});


/**
 * wisej.web.listview.ItemCellLayer
 *
 * Overrides qx.ui.virtual.layer.WidgetCell to 
 * call beforeFullUpdate right before rendering a full update
 * of the visible widgets and afterFullUpdate after the widgets have rendered.
 *
 * It's required to give a chance to the remote data model
 * to fetch the rows that are needed for the visible view.
 */
qx.Class.define("wisej.web.listview.ItemCellLayer", {

	extend: qx.ui.virtual.layer.WidgetCell,

	members: {

		// overridden.
		// Adds a callback to the provider to prefetch the cell range about to be rendered.
		// Needed to let the remote data model fetch the data when not in the cache.
		_fullUpdate: function (firstRow, firstColumn, rowSizes, columnSizes) {

			this._cellProvider.beforeFullUpdate(firstRow, firstColumn, rowSizes, columnSizes);

			this.base(arguments, firstRow, firstColumn, rowSizes, columnSizes);

			this._cellProvider.afterFullUpdate(firstRow, firstColumn, rowSizes, columnSizes);
		}
	}
});


/**
 * wisej.web.listview.LabelEditor
 *
 * Extends the TextField class to edit the label
 * in the wisej.web.listview.ItemCellWidget items.
 */
qx.Class.define("wisej.web.listview.LabelEditor", {

	extend: qx.ui.form.TextField,

	construct: function () {

		this.base(arguments);

		// listen to the lost focus to commit editing.
		this.addListener("blur", this._onBlur);

		// list to the keyboard to commit or cancel editing.
		this.addListener("keypress", this._onKeyPress);
	},

	properties: {

		// Appearance override
		appearance: { refine: true, init: "label-editor" }
	},

	members: {

		/**
		 * Begins editing the specified item widget.
		 */
		editLabel: function (item) {

			// already editing?
			if (this.isVisible())
				return;

			// find the label, the edit control will replace it.
			var label = item.getChildControl("label");
			var labelBounds = label.getBounds();
			var nodeBounds = item.getBounds();
			label.hide();

			item._add(this);
			this.setPaddingLeft(label.getPaddingLeft());
			this.setPaddingRight(label.getPaddingRight());
			this.setValue(qx.bom.String.unescape(label.getValue()));
			this.setUserBounds(labelBounds.left, labelBounds.top, nodeBounds.width - labelBounds.left, labelBounds.height);

			this.show();
			this.focus();
		},

		endEdit: function (cancel) {

			this.exclude();

			// get the owner item.
			var item = this.getLayoutParent();

			// restore the label.
			var label = item.getChildControl("label");
			label.show();

			this.fireDataEvent("endEdit", {
				item: item,
				text: cancel === true ? null : this.getValue()
			});
		},

		_onBlur: function (e) {

			if (this.isVisible())
				this.endEdit(true);
		},

		_onKeyPress: function (e) {

			switch (e.getKeyIdentifier()) {

				case "Escape":
					this.endEdit(true);
					break;

				case "Enter":
					this.endEdit();
					break;
			}

			e.stopPropagation();
		}

	}
});


/**
 * wisej.web.listview.ItemDataModel
 *
 * Remote data model designed to interact with the Wisej
 * IWisejDataStore interface and to support the new
 * additional properties.
 *
 * Each row in the data model is expected to
 * to be a map with these fields:
 *
 *		{
 *			"data":
 *			{
 *				"icon": "the item's icon".
 *				"stateIcon": "the item's state icon".
 *				"0": "item's text",
 *				...
 *			},
 *          "styles": {item's style map}
 *		}
 */
qx.Class.define("wisej.web.listview.ItemDataModel", {

	extend: qx.ui.table.model.Remote,

	properties: {

		// increase the blocks in the cache since the list view can
		// display more items when in small icon view mode.
		blockSize: { init: 500, refine: true },
		maxCachedBlockCount: { init: 100, refine: true }
	},

	members: {

		// the listview that owns this model.
		__listview: null,

		// the data store used to retrieve data from the server component.
		__dataStore: null,

		/**
		 * Initialize the model <--> listview interaction.
		 *
		 * @param listview {wisej.web.listview.ListView}
		 *   The listview to which this model is attached
		 */
		init: function (listview) {

			this.__listview = listview;
		},

		/**
		* Reads the total number of rows from the server.
		*/
		_loadRowCount: function () {

			if (this.__listview && this._getDataStore()) {
				this._getDataStore().getRowCount(
					this._onRowCountLoaded, this);
			}
		},

		/**
		 * Reads the requested row range from the server.
		 */
		_loadRowData: function (firstRow, lastRow) {

			if (this.__listview && this._getDataStore()) {
				var args = {
					first: firstRow,
					last: lastRow,
					itemView: true,
					sortIndex: this.getSortColumnIndex(),
					sortDirection: this.isSortAscending() ? "asc" : "desc"
				};

				this._getDataStore().getDataRows(
					args,
					this._onRowDataLoaded, this);
			}
		},

		// returns the data store managed by this data model.
		_getDataStore: function () {

			if (!this.__dataStore && this.__listview) {
				var ownerId = this.__listview.getOwnerId();
				if (ownerId)
					this.__dataStore = new wisej.DataStore(ownerId);
			}

			return this.__dataStore;
		},
	},

	destruct: function () {

		this._disposeObjects("__dataStore");

	}

});


/**
 * wisej.web.listview.ItemDataModelDesignMode
 *
 * Local data model designed to interact with the Wisej
 * IWisejDataStore interface and to support the new
 * additional properties in design mode.
 *
 * Each row in the data model is expected to
 * to be a map with these fields:
 *
 *		{
 *			"data":
 *			{
 *				"icon": "the item's icon".
 *				"stateIcon": "the item's state icon".
 *				"0": "item's text",
 *				...
 *			},
 *          "styles": {item's style map}
 *		}
 */
qx.Class.define("wisej.web.listview.ItemDataModelDesignMode", {

	extend: qx.ui.table.model.Simple,

	members: {

		// the listview that owns this model.
		__listview: null,

		// the data store used to retrieve data from the server component.
		__dataStore: null,

		/**
		 * Initialize the model <--> listview interaction.
		 *
		 * @param listview {wisej.web.listview.ListView}
		 *   The listview to which this model is attached
		 */
		init: function (listview) {

			this.__listview = listview;
		},
	}
});
