//#Requires=wisej.web.ScrollableControl.js

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
 * wisej.web.DataRepeater
 * 
 * Implements a virtual scroller container that displays child items
 * either vertically or horizontally using the virtual framework in qooxdoo.
 *
 * It can display an unlimited number of items. It renders only what is in the
 * viewable area and reuses widgets as they "fall out" of the view port.
 */
qx.Class.define("wisej.web.DataRepeater", {

	extend: qx.ui.virtual.core.Scroller,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle,
		wisej.mixin.MAccelerators,
		qx.ui.core.MRemoteChildrenHandling,
		qx.ui.core.MRightToLeftLayout
	],

	implement: [
		qx.data.controller.ISelection,
		qx.ui.virtual.core.IWidgetCellProvider],

	construct: function () {

		// call the base constructor.
		this.base(arguments);

		this.addState("vertical");

		// add local state properties.
		this.setStateProperties(this.getStateProperties().concat(["firstVisibleIndex"]));

		// create the virtual cell provider.
		this.__cellProvider = new wisej.web.dataRepeater.ItemCellProvider(this);

		// create the inner virtual cell container.
		this.__layer = new qx.ui.virtual.layer.WidgetCell(this);
		this.getPane().addLayer(this.__layer);

		// initializes the Orientation property to create the correct selection manager.
		this.initOrientation();

		// handle the keyboard for navigation keys.
		this.addListener("keypress", this._onKeyPress, this);
	},

	properties: {

		// overridden.
		appearance: { init: "dataRepeater", refine: true },

		/**
		 * ItemCount property.
		 * 
		 * Sets the number of items to display.
		 * 
		 * Property implemented through a getter/setter.
		 */
		// itemCount: { init: 0, check: "PositiveInteger", apply: "_applyItemCount" },

		/**
		 * ItemSize property.
		 * 
		 * Defines the size of the items.
		 */
		itemSize: { init: { width: 0, height: 0 }, check: "Map", apply: "_applyItemSize" },

		/**
		 * SelectedBackgroundColor property.
		 * 
		 * Determines the background color for the selected item panel.
		 */
		selectedBackgroundColor: { init: null, check: "Color", themeable: true },

		/**
		 * SelectedIndex property.
		 * 
		 * Sets or gets the index of the currently selected item.
		 */
		selectedIndex: { init: -1, check: "Integer", apply: "_applySelectedIndex", event: "changeSelectedIndex" },

		/**
		 * Orientation property.
		 * 
		 * Sets the scrolling direction of the child items.
		 */
		orientation: { init: "vertical", check: ["vertical", "horizontal"], apply: "_applyOrientation", event: "changeOrientation" },

		/**
		 * ScrollbarVisible property.
		 * 
		 * Hides or shows the scrollbar (which one depends on the orientation). When
		 * the scrollbar is hidden, the user can still scroll using touch events or the mouse wheel
		 * or the keyboard or calling @scrollIntoView.
		 */
		scrollbarVisible: { init: true, check: "Boolean", apply: "_applyScrollbarVisible" },

		/**
		 * PrefetchItems property.
		 * 
		 * Indicates the number of items to prefetch outside of the visible range.
		 */
		prefetchItems: { init: 0, check: "Integer", apply: "_applyPrefetchItems" }
	},

	members: {

		// the virtual cell provider.
		__cellProvider: null,

		// the virtual cells container.
		__layer: null,

		// the selection manager instance.
		__selectionManager: null,

		// current number of rows and columns.
		__rowCount: 0,
		__colCount: 0,

		// when __updateMode is true, changes to the data model are ignored.
		__updateMode: false,

		// suppresses firing server events.
		__internalChange: false,

		// overridden
		_forwardStates: {
			focused: true,
			hovered: true,
			disabled: true,
			horizontal: true,
			vertical: true
		},

		/**
		 * Returns all the currently rendered widgets.
		 * 
		 * @returns {Array} Array of the rendered cell widgets.
		 */
		getItemWidgets: function () {

			return this.__layer.getChildren();
		},

		/**
		 * FirstVisibleIndex property getter.
		 *
		 * This is a read-only property that returns the index of the first
		 * visible item in the data repeater.
		 */
		getFirstVisibleIndex: function () {

			return this.__layer.getFirstRow();
		},

		/**
		 * Binds the content items to the cell corresponding to their data index.
		 * 
		 * @param {Array} items Array of items to bind to their corresponding cells.
		 */
		bindItems: function (items) {

			if (!items)
				return;

			items = this._transformComponents(items);

			var widgets = this.getItemWidgets();
			for (var i = 0; i < items.length; i++) {

				var item = items[i];

				if (!item) {
					this.core.logError("Content item at position " + i + " is null.");
					continue;
				}

				var index = item.getIndex();

				this.core.logInfo("Binding index ", index);

				var w = null;
				for (var j = 0; j < widgets.length; j++) {
					if (this.__getWidgetIndex(widgets[j]) === index) {
						w = widgets[j];
						break;
					}
				}

				if (!w) {
					this.core.logInfo("Cell widget at position " + i + " is null.");
					continue;
				}

				w.setItem(item);
			}
		},

		/**
		 * Applies the ItemCount property.
		 */
		getItemCount: function () {
			return this.__itemCount;
		},
		setItemCount: function (value) {
			this.__itemCount = value;
			this.update();
		},
		__itemCount: 0,

		/**
		 * Applies the ItemSize property.
		 * 
		 * @param {{width, height}} value New value.
		 * @param {{width, height}?} old Previous value.
		 */
		_applyItemSize: function (value, old) {

			this.update();
		},

		/**
		 * Applies the SelectedIndex property.
		 * @param {Integer} value New value.
		 * @param {Integer} old Previous value.
		 */
		_applySelectedIndex: function (value, old) {

			var selection = this.__selectionManager.getSelection();
			if (selection && selection.length == 1 && selection[0] == value)
				return;

			if (value > -1) {

				qx.ui.core.queue.Widget.flush();

				this.scrollIntoView(value);
				this.__selectionManager.replaceSelection([value]);
			}
			else {
				this.__selectionManager.clearSelection();
			}
		},

		/**
		 * Applies the Orientation property.
		 * 
		 * @param {String} value New value.
		 * @param {String?} old Previous value.
		 */
		_applyOrientation: function (value, old) {

			if (old)
				this.removeState(old);
			if (value)
				this.addState(value);

			if (this.__selectionManager) {
				this.__selectionManager.detatchPointerEvents();
				this.__selectionManager.removeListener("changeSelection", this._onChangeSelection, this);
				this.__selectionManager.dispose();
			}

			if (value === "horizontal")
				this.__selectionManager = new qx.ui.virtual.selection.Column(this.getPane(), this);
			else
				this.__selectionManager = new qx.ui.virtual.selection.Row(this.getPane(), this);

			this.__selectionManager.attachPointerEvents();
			this.__selectionManager.addListener("changeSelection", this._onChangeSelection, this);

			this.update();
		},

		/**
		 * Applies the ScrollbarVisible property.
		 * 
		 * @param {String} value New value.
		 * @param {String?} old Previous value.
		 */
		_applyScrollbarVisible: function (value, old) {
			this.update();
		},

		/**
		 * Applies the PrefetchItems property.
		 * 
		 * @param {Integer} value New value.
		 * @param {Integer?} old Previous value.
		 */
		_applyPrefetchItems: function (value, old) {

			if (this.getOrientation() === "horizontal") {
				var pixels = this.getItemSize().width * value;
				this.getPane().prefetchX(pixels, pixels, pixels, pixels);
			}
			else {
				var pixels = this.getItemSize().height * value;
				this.getPane().prefetchY(pixels, pixels, pixels, pixels);
			}
		},

		/**
		 * Returns the number of items that fit the visible area.
		 */
		getItemsPerPage: function () {

			return Math.floor(
				this.getOrientation() === "horizontal"
					? this.getWidth() / this.getItemSize()
					: this.getHeight() / this.getItemSize());
		},

		/**
		 * Scheduled the update of the virtual scroller
		 * when there is a change that affects the number of items
		 * displayed and the scrolling orientation.
		 */
		update: function () {
			qx.ui.core.queue.Widget.add(this, "update");
		},

		syncWidget: function (jobs) {
			if (jobs && jobs["update"]) {
				this.__update();
			}
		},

		__update: function () {

			var pane = this.getPane();

			var itemSize = this.getItemSize();
			pane.getRowConfig().setDefaultItemSize(itemSize.height);
			pane.getColumnConfig().setDefaultItemSize(itemSize.width);

			var itemCount = this.getItemCount();
			var scrollBarVisibility = this.isScrollbarVisible() ? "auto" : "hide";

			switch (this.getOrientation()) {
				case "horizontal":
					this.__rowCount = 1;
					this.__colCount = itemCount;
					this.setScrollbar([scrollBarVisibility, "off"]);

					// update the scrollbar's page step size.
					var barX = this.getChildControl("scrollbar-x");
					barX.setPageStep(this.getWidth());

					break;

				default:
					this.__colCount = 1;
					this.__rowCount = itemCount;
					this.setScrollbar(["off", scrollBarVisibility]);

					// update the scrollbar's page step size.
					var barY = this.getChildControl("scrollbar-y");
					barY.setPageStep(this.getHeight());

					break;
			}

			pane.getColumnConfig().setItemCount(this.__colCount);
			pane.getRowConfig().setItemCount(this.__rowCount);
			pane.fullUpdate();

			// update the prefetch manager.
			if (this.getPrefetchItems())
				this._applyPrefetchItems(this.getPrefetchItems());
		},

		/**
		 * Scroll the item into view. Issues a data load if necessary.
		 *
		 * @param {Integer} index Index of the item or row to scroll into view.
		 * @param {Boolean} alignTop When true it tries to move the item to the top.
		 */
		scrollIntoView: function (index, alignTop) {

			if (this.getOrientation() === "vertical")
				this.getPane().scrollRowIntoView(index, alignTop === true ? "top" : null);
			else
				this.getPane().scrollColumnIntoView(index, alignTop === true ? "top" : null);
		},

		// overridden
		/**
		 * Process the selectionChange event and fire our "selectionChanged" event.
		 */
		_onChangeSelection: function (e) {

			var index = -1;
			var selection = this.__selectionManager.getSelection();
			if (selection.length > 0)
				index = selection[0];

			this.setSelectedIndex(index);

			this.fireDataEvent("selectionChanged", index);
		},

		/*
		---------------------------------------------------------------------------
		qx.ui.virtual.core.IWidgetCellProvider
		---------------------------------------------------------------------------
		*/

		// overridden from  IWidgetCellProvider.
		// Returns the configured cell for the given cell.
		// The return value may be null to indicate that the cell should be empty.
		getCellWidget: function (row, column) {

			var cell = { row: row, column: column };
			var itemIndex = this.__getIndexFromCell(cell);

			// eof?
			if (itemIndex >= this.getItemCount())
				return null;

			// NOTE: this is the most important part of this widget. 
			// Every time the framework requests a widget to render, we
			// restart the update timer.

			// After the timeout expires, presumably when the user is done
			// frantically scrolling for no reason, we can ask the server
			// to update the content of the items hosted inside the
			// widgets used in the virtual view.

			var me = this;
			clearTimeout(this.__updateTimeoutId);
			this.__updateTimeoutId = setTimeout(function () {
				me.__updateVisibleWidgets();

			}, 10);

			// retrieve or create the cell widgets for the specified cell.
			return this.__createCellWidget(cell);
		},

		// overridden from IWidgetCellProvider.
		// Release the given cell widget. Either pool or destroy the widget.
		poolCellWidget: function (widget) {

			this.__cellProvider.pool(widget);
		},

		/**
		 * Implements the qx.ui.virtual.selection.Abstract._isSelectable() method.
		 * Returns true if the index is within the range of available items.
		 */
		isItemSelectable: function (index) {

			return this.isEnabled() && index > -1 && index < this.getItemCount();
		},

		/**
		 * Implements the qx.ui.virtual.selection.Abstract._styleSelectable() method.
		 */
		styleSelectable: function (index, type, wasAdded) {

			// change the selected state of the index.
			var cell = this.__getCellFromIndex(index);
			var widget = this.__layer.getRenderedCellWidget(cell.row, cell.column);
			if (widget) {

				// update the states on the affected widget.
				var states = this._getWidgetState(cell);
				this.__cellProvider.updateStates(widget, states);
			}
		},

		/* update timer. */
		__updateTimeoutId: 0,

		__updateVisibleWidgets: function () {

			this.setDirty(true);

			// collect the indexes to bind to panel items.
			var indexes = [], widget, item, index;
			var widgets = this.getItemWidgets();
			for (var i = 0; i < widgets.length; i++) {

				widget = widgets[i];
				item = widget.getItem();
				index = this.__getWidgetIndex(widget);

				indexes.push(index);
			}

			// ask the server to update the content items with the
			// corresponding data record index.

			// the items array may contain null entries, which means that
			// the cell widget was never bound to a content item.

			// the server will determine if to create a new content item.

			if (indexes.length > 0) {
				this.core.logInfo("Requesting indexes ", JSON.stringify(indexes));
				this.fireDataEvent("update", indexes);
			}
		},

		/**
		 * Returns a fully initialized cell widget instance
		 * for the specified cell coordinates.
		 * 
		 * @param {{row, column}} cell Coordinates of the widget to create.
		 * @returns {qx.ui.base.Widget} The widget used to represent the item at the specified coordinates.
		 */
		__createCellWidget: function (cell) {

			// determine the state of the cell.
			var states = this._getWidgetState(cell);

			// return the widget used to render the cell.
			var widget = this.__cellProvider.getCellWidget(null, states);
			widget.setUserData("cell", cell);

			return widget;
		},

		/**
		 * Returns the state for the specified widget located
		 * at the specified cell.
		 * 
		 * @param {{row, column}} cell Coordinates of the widget for which to retrieve the state.
		 * @returns {Map} States of the widget.
		 */
		_getWidgetState: function (cell) {

			var index = this.__getIndexFromCell(cell);

			// determine the selected state of the cell.
			var states = {};
			if (this.__selectionManager.isItemSelected(index))
				states.selected = true;

			// orientation.
			states[this.getOrientation()] = true;

			return states;
		},

		// determines the index of the item from its row, column position.
		__getWidgetIndex: function (widget) {

			return this.__getIndexFromCell(widget.getUserData("cell"));
		},

		// returns the index of the specified cell.
		__getIndexFromCell: function (cell) {

			if (!cell)
				return -1;

			return this.getOrientation() === "horizontal"
				? cell.column
				: cell.row;
		},

		// converts the item index into cell coordinates.
		__getCellFromIndex: function (index) {

			return this.getOrientation() === "horizontal"
				? { row: 0, column: index }
				: { row: index, column: 0 };
		},

		/**
		 * Performs a lookup from model index to row.
		 *
		 * @param index {Number} The index to look at.
		 * @return {Number} The row or <code>-1</code>
		 *  if the index is not a model index.
		 */
		_reverseLookup: function (index) {

			// the index is the selected item in this case.
			return index;
		},

		/**
		 * Returns the selectable model items.
		 *
		 * @return {qx.data.Array | null} The selectable items.
		 */
		_getSelectables: function () {

			// the index is the selectable item in this case.
			return null;
		},

		/*
		---------------------------------------------------------------------------
		*/

		/**
		 * Handles the keyboard to navigating to the next/prev item and
		 * user add/remove keyboard actions.
		 */
		_onKeyPress: function (e) {

			if (!this.isEnabled())
				return;

			if (e.getModifiers())
				return;

			// ignore keystrokes coming from child widgets.
			var target = wisej.utils.Widget.findWisejComponent(e.getTarget());
			if (target !== this && !(target instanceof wisej.web.dataRepeater.ItemContent))
				return;

			var identifier = e.getKeyIdentifier();
			switch (identifier) {

				case "Up":
				case "Down":
				case "Left":
				case "Right":
				case "PageUp":
				case "PageDown":
				case "Home":
				case "End":
					this.__selectionManager.handleKeyPress(e);
					break;

				case "Insert":
					this.fireDataEvent("addItem");
					break;

				case "Delete":
					this.fireDataEvent("deleteItem", target.getIndex());
					break;

				case "Tab":
					this._focusCurrentItem();
					e.stop();
					break;
			}
		},

		_focusCurrentItem: function () {

			var index = this.getSelectedIndex();

			// find the current item.
			var widgets = this.getItemWidgets();
			for (var i = 0; i < widgets.length; i++) {
				var item = widgets[i].getItem();
				if (item && item.getIndex() == index) {
					var next = qx.ui.core.FocusHandler.getInstance().getNextWidget(item);
					if (next) {
						next.focus();
						break;
					}
				}
			}
		}
	},

	destruct: function () {
		this._disposeObjects("__layer", "__cellProvider", "__selectionManager");

	}
});


/**
 * wisej.web.dataRepeater.ItemCellProvider
 *
 * Creates, pools and reuses wisej.web.dataRepeater.ItemCellWidget instances 
 * in the wisej.web.DataRepeater widget.
 */
qx.Class.define("wisej.web.dataRepeater.ItemCellProvider", {

	extend: qx.ui.virtual.cell.WidgetCell,

	implement: qx.ui.list.provider.IListProvider,

	construct: function (dataRepeater) {

		this.base(arguments);

		this.__dataRepeater = dataRepeater;
	},

	members: {

		// the DataRepeater container.
		__dataRepeater: null,

		// overridden
		_createWidget: function () {

			var cell = new wisej.web.dataRepeater.ItemCell();

			// update the appearance to be dataRepeate/item.
			cell.$$subcontrol = "cell";
			cell.$$subparent = this.__dataRepeater;
			cell.setSelectedBackgroundColor(this.__dataRepeater.getSelectedBackgroundColor());

			return cell;
		},

		// overridden
		updateStates: function (cell, states) {

			this.base(arguments, cell, states);

			if (states.selected) {
				cell.setBackgroundColor(cell.getSelectedBackgroundColor());
			}
			else {
				cell.resetBackgroundColor();
			}
		}
	}
});


/**
 * wisej.web.dataRepeater.ItemCell
 *
 * The widget that is created when rendering a cell in the virtual scroller. Hosts
 * an single instance of the wisej.web.dataRepeater.ItemContent widget.
 * 
 */
qx.Class.define("wisej.web.dataRepeater.ItemCell", {

	extend: qx.ui.container.Composite,

	construct: function () {

		this.base(arguments, new qx.ui.layout.Grow());

		this.getContentElement().setStyle("overflow", "visible");
	},

	properties: {

		/**
		 * SelectedBackgroundColor property.
		 * 
		 * Determines the background color for the selected item panel.
		 */
		selectedBackgroundColor: { init: null, check: "Color" },
	},

	members: {

		/* reference to the {wisej.web.dataRepeater.ItemContent} displayed in this cell. */
		__item: null,

		/**
		 * Returns the content item displayed in this cell.
		 * 
		 * @returns {wisej.web.dataRepeater.ItemContent} The item displayed in this cell.
		 */
		getItem: function () {

			return this.__item;
		},

		/**
		 * Sets the content item to display in this cell.
		 * 
		 * @param {wisej.web.dataRepeater.ItemContent} item The content item to display inside the cell widget.
		 */
		setItem: function (item) {

			if (this.__item && this.__item !== item && this.__item.getLayoutParent() === this) {
				this._remove(this.__item);
			}

			if (item && item.getLayoutParent() !== this) {
				this._add(item);
			}

			this.__item = item;
			this.removeState("loading");
			item.getChildControl("pane").show();

			if (this.hasState("selected")) {
				item.addState("selected");
				this.setBackgroundColor(this.getSelectedBackgroundColor());
			}
			else {
				item.removeState("selected");
				this.resetBackgroundColor();
			}
		},

		// overridden to forward the states to the item.
		addState: function (state) {
			this.base(arguments, state);

			if (this.__item)
				this.__item.addState(state);
		},

		// overridden to forward the states to the item.
		removeState: function (state) {
			this.base(arguments, state);

			if (this.__item)
				this.__item.removeState(state);

		},

		// overridden
		setLayoutParent: function (parent) {

			this.base(arguments, parent);

			if (!parent) {
				this.addState("loading");
			}
		}
	}
});


/**
 * wisej.web.dataRepeater.ItemContent
 *
 * Represents the content items displayed inside the ItemCell widgets.
 */
qx.Class.define("wisej.web.dataRepeater.ItemContent", {

	extend: wisej.web.ScrollableControl,

	construct: function () {

		this.base(arguments);

		this._createChildControl("header");

		this.initOrientation();
		this.initItemBorderStyle();
		this.addListener("keypress", this._onKeyPress, this);
		this.addListener("pointerdown", this._onPointerDown, this);

		// RightToLeft support.
		this.addListener("changeRtl", this._onRtlChange, this);
	},

	properties: {

		// overridden.
		appearance: { init: "dataRepeaterItem", refine: true },

		/**
		 * Index property.
		 * 
		 * Indicates the index in the data source of the data record represented in this widget
		 */
		index: { init: null, check: "PositiveInteger" },

		/**
		 * HeaderVisible property.
		 * 
		 * Shows or hides a button header that can be used to select the current item
		 * and may change appearance for the current item.
		 */
		headerVisible: { init: true, check: "Boolean", apply: "_applyHeaderVisible", themeable: true },

		/**
		 * HeaderSize property.
		 * 
		 * Determines the width or height of the header widget.
		 */
		headerSize: { init: 20, check: "PositiveInteger", apply: "_applyHeaderSize", themeable: true },

		/**
		 * HeaderPosition property.
		 * 
		 * Sets the position of the header widget.
		 */
		headerPosition: { init: "left", check: ["top", "left", "right", "bottom"], apply: "_applyHeaderPosition", themeable: true },

		/**
		 * Orientation property.
		 * 
		 * Sets the orientation of the item.
		 */
		orientation: { init: "vertical", check: ["vertical", "horizontal"], apply: "_applyOrientation" },

		/**
		 * ItemSize property.
		 * 
		 * Sets the custom height or width for this item. Setting null resets the size to the default.
		 */
		itemSize: { init: null, check: "Integer", apply: "_applyItemSize", nullable: true },

		/**
		 * ItemBorderStyle property.
		 * 
		 * Defines the border style between items.
		 */
		itemBorderStyle: { init: "solid", check: ["none", "solid", "dashed", "dotted", "double"], apply: "_applyItemBorderStyle", nullable:true, themeable: true },
	},

	members: {

		// overridden
		_forwardStates: {
			hovered: true,
			selected: true,
			horizontal: true,
			vertical: true,
			active: true
		},

		/**
		 * Applies the Orientation property.
		 */
		_applyOrientation: function (value, old) {

			if (old)
				this.removeState(old);
			if (value)
				this.addState(value);
		},

		/**
		 * Applies the HeaderVisible property.
		 */
		_applyHeaderVisible: function (value, old) {

			if (value == null) {
				this.resetHeaderVisible();
				return;
			}

			this._updateLayout(this.getChildControl("header"));
		},

		/**
		 * Applies the HeaderSize property.
		 */
		_applyHeaderSize: function (value, old) {

			if (value == null) {
				this.resetHeaderSize();
				return;
			}

			this._updateLayout(this.getChildControl("header"));
		},

		/**
		 * Applies the ItemSize property.
		 */
		_applyItemSize: function (value, old) {

			var repeater = this._getDataRepeater();
			if (repeater) {
				var pane = repeater.getPane();
				var itemSize = repeater.getItemSize();
				if (repeater.getOrientation() === "horizontal") {
					var config = pane.getColumnConfig();
					if (itemSize && itemSize.width === value) {
						// reset the size.
						config.setItemSize(this.getIndex(), null);
					}
					else {
						config.setItemSize(this.getIndex(), value);
					}
				}
				else {
					var config = pane.getRowConfig();
					if (itemSize && itemSize.height === value) {
						// reset the size.
						config.setItemSize(this.getIndex(), null);
					}
					else {
						config.setItemSize(this.getIndex(), value);
					}
				}
			}
		},

		/**
		 * Applies the ItemBorderStyle property.
		 */
		_applyItemBorderStyle: function (value, old) {

			if (value == null) {
				this.resetItemBorderStyle();
				return;
			}

			if (old)
				this.removeState("border" + qx.lang.String.firstUp(old));

			if (value)
				this.addState("border" + qx.lang.String.firstUp(value));
		},

		// overridden
		setLayoutParent: function (parent) {

			this.base(arguments, parent);

			if (parent) {
				this._applyItemSize(this.getItemSize());
			}
		},

		/**
		 * Applies the HeaderPosition property.
		 */
		_applyHeaderPosition: function (value, old) {

			this._updateLayout(this.getChildControl("header"));
		},

		// RightToLeft support. 
		// Listens to "changeRtl" to mirror child controls and the "list".
		_onRtlChange: function (e) {

			if (e.getData() === e.getOldData())
				return;

			var rtl = e.getData();
			if (rtl != null) {
				this._mirrorChildren(rtl);
			}
		},

		// handles UI changes from the dataRepeater owner.
		_updateLayout: function (header) {

			if (this.isHeaderVisible()) {
				header.show();

				switch (this.getHeaderPosition()) {
					case "top":
						header.resetWidth();
						header.setAllowGrowY(false);
						header.setAllowGrowX(true);
						header.setHeight(this.getHeaderSize());
						this._add(header, { edge: "north" });
						break;
					case "right":
						header.resetHeight();
						header.setAllowGrowY(true);
						header.setAllowGrowX(false);
						header.setWidth(this.getHeaderSize());
						this._add(header, { edge: "est" });
						break;
					case "bottom":
						header.resetWidth();
						header.setAllowGrowY(false);
						header.setAllowGrowX(true);
						header.setHeight(this.getHeaderSize());
						this._add(header, { edge: "south" });
						break;
					default:
						header.resetHeight();
						header.setAllowGrowY(true);
						header.setAllowGrowX(false);
						header.setWidth(this.getHeaderSize());
						this._add(header, { edge: "west" });
						break;
				}

			}
			else {
				header.exclude();
			}
		},

		// handles taps anywhere in the panel item to change the selected index.
		_onPointerDown: function (e) {

			var index = this.getIndex();
			var repeater = this._getDataRepeater();
			if (repeater && index > -1)
				repeater.setSelectedIndex(index);
		},

		// handles clicks on the panel header button.
		_onHeaderPointerDown: function (e) {

			var index = this.getIndex();
			var repeater = this._getDataRepeater();
			if (repeater && index > -1) {
				repeater.focus();
				repeater.setSelectedIndex(index);
			}
		},

		// handles tabs that bubble up before the
		// FocusHandler can handle it to determine if the
		// next panel is already loaded.
		_onKeyPress: function (e) {

			if (e.getKeyIdentifier() === "Tab") {

				var repeater = this._getDataRepeater();
				if (!repeater)
					return;

				var index = this.getIndex();
				var focusHandler = qx.ui.core.FocusHandler.getInstance();
				var focusedWidget = focusHandler.getFocusedWidget();

				if (e.isShiftPressed()) {
					var prev = focusHandler.getPrevWidget(focusedWidget);
					var container = this._findContainer(prev);

					// reached the first visible item but not the first record?
					if (!container && this.getIndex() > 0) {
						index--;
						e.stop();
						repeater.setSelectedIndex(index);
					}
				}
				else {
					var next = focusHandler.getNextWidget(focusedWidget);
					var container = this._findContainer(next);

					// reached the last visible item but not the end of the records?
					if (!container && this.getIndex() < repeater.getItemCount() - 1) {
						index++;
						e.stop();
						repeater.setSelectedIndex(index);
					}
				}
			}
		},

		/**
		 * Finds the wisej.web.dataRepeater.ItemContent panel that contains the widget.
		 */
		_findContainer: function (widget) {

			while (widget && !(widget instanceof wisej.web.dataRepeater.ItemContent)) {
				widget = widget.getLayoutParent();
			}

			return widget;
		},

		/**
		 * Finds the wisej.web.DataRepeater panel that contains the wisej.web.dataRepeater.ItemContent.
		 */
		_getDataRepeater: function () {

			var widget = this.getLayoutParent();
			while (widget && !(widget instanceof wisej.web.DataRepeater)) {
				widget = widget.getLayoutParent();
			}

			return widget;
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "header":
					control = new qx.ui.form.Button().set({
						focusable: false,
						keepActive: true
					});
					this._add(control);
					control._forwardStates.selected = true;
					control._forwardStates.focused = true;
					control._forwardStates.vertical = true;
					control._forwardStates.horizontal = true;

					control.addState("inner");
					this._updateLayout(control);
					control.addListener("pointerdown", this._onHeaderPointerDown, this);
					break;
			}

			return control || this.base(arguments, id);
		}
	}
});

