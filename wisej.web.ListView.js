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
 * wisej.web.ListView
 *
 * Implementation of the list view control, which displays a collection of items that can be displayed using one of four different views.
 *
 */
qx.Class.define("wisej.web.ListView", {

	extend: qx.ui.container.Composite,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	/**
	 * Constructor.
	 */
	construct: function () {

		var layout = new qx.ui.layout.Grid();
		layout.setRowFlex(1, 1);
		layout.setColumnFlex(1, 1);

		this.base(arguments, layout);

		// create the views.
		this.gridView = this.getChildControl("grid-view");
		this.itemView = this.getChildControl("item-view");

		// forward the focusin and focusout events to the current view.
		this.addListener("focusin", this.__onFocusIn, this);
		this.addListener("focusout", this.__onFocusOut, this);

		// adds the inner target to the drop & drop event object.
		this.addListener("drop", this._onDragEvent, this);
		this.addListener("dragover", this._onDragEvent, this);
	},

	properties: {

		// appearance key.
		appearance: { refine: true, init: "listview" },

		/**
		 * View property
		 */
		view: { init: "largeIcon", check: ["largeIcon", "details", "smallIcon", "tile"], apply: "_applyView", event: "changeView" },

		/**
		 * ItemSize property.
		 *
		 * Sets the size of the list items when the view is: "largeIcon", "smallIcon", "tile".
		 * This is the overall size of the item widget, including the label and the icon.
		 * 
		 */
		itemSize: { init: { width: 0, height: 0 }, check: "Map", apply: "_applyItemSize", themeable: true },

		/**
		 * IconSize property.
		 *
		 * Sets the size of the icon in the listView item. This is only the size of the icon inside
		 * the item. If the ItemSize is not large enough to display the icon and the label, the content
		 * will get truncated.
		 */
		iconSize: { init: { width: 32, height: 32 }, check: "Map", apply: "_applyIconSize", themeable: true },

		/**
		 * StateIconSize property.
		 *
		 * Sets the size of the state icon in the listView item. The state icon is displayed before the item's icon.
		 */
		stateIconSize: { init: { width: 16, height: 16 }, check: "Map", apply: "_applyStateIconSize", themeable: true },

		/**
		 * iconColor property.
		 *
		 * Determines the default fill color for svg icons.
		 */
		iconColor: { nullable: true, check: "Color", themeable: true },

		/**
		 * selectionMode override.
		 *
		 * Determines the selection mode in the current view.
		 */
		selectionMode: { init: "one", check: ["none", "one", "multiSimple", "multiExtended"], apply: "_applySelectionMode" },

		/**
		 * CheckBoxes property.
		 *
		 * Indicates whether a check box appears next to each item.
		 */
		checkBoxes: { init: false, check: "Boolean", apply: "_applyCheckBoxes" },

		/**
		 * ShowItemTooltips property.
		 *
		 * Enables or disables item tooltips.
		 */
		showItemTooltips: { init: false, check: "Boolean", apply: "_applyShowItemTooltips" },

		/**
		 * Columns
		 *
		 * Array of column descriptors: wisej.web.listview.ColumnHeader.
		 */
		columns: { init: null, check: "Array", apply: "_applyColumns" },

		/**
		* LabelEdit property.
		 *
		 * Enables or disables label editing.
		*/
		labelEdit: { init: true, check: "Boolean" },

		/**
		 * LabelWrap property.
		 *
		 * Enables or disables label wrapping. When false, the ellipsis is shown when the label text exceeded the item width.
		 */
		labelWrap: { init: false, check: "Boolean", apply: "_applyLabelWrap" },

		/**
		 * HeaderStyle property.
		 *
		 * Returns or sets the column header style.
		 */
		headerStyle: { init: "clickable", check: ["none", "clickable", "nonClickable"], apply: "_applyHeaderStyle" },

		/**
		 * LiveResize property.
		 *
		 * Returns or sets the datagrid view's liveResize property.
		 */
		liveResize: { init: "true", check: "Boolean", apply: "_applyLiveResize" },

		/**
		 * GridLines property.
		 *
		 * Shows or hides the cell lines in the datagrid view.
		 */
		gridLines: { init: "true", check: "Boolean", apply: "_applyGridLines" },

		/**
		 * GridLineStyle property.
		 *
		 * Sets the type of border to use for the grid's cells of the datagrid view.
		 */
		gridLineStyle: { init: "single", check: ["none", "both", "vertical", "horizontal"], apply: "_applyGridLineStyle" },

		/**
		 * ItemPadding property.
		 * 
		 * Determines the padding to add to the items when in item-view and to the
		 * cells when in details view.
		 */
		itemPadding: { init: null, check: "Array", apply: "_applyItemPadding" },

		/**
		 * Tools property.
		 *
		 * Collection of tool definitions to display on top, left, bottom, right of the list view.
		 */
		tools: { check: "Array", apply: "_applyTools" },

		/**
		 * ToolsPosition property.
		 *
		 * Returns or sets the position of the tools container.
		 */
		toolsPosition: { init: "top", check: ["top", "left", "right", "bottom"], apply: "_applyToolsPosition" },
	},

	members: {

		// forwarded states.
		_forwardStates: {

			focused: true,
			hovered: true,

			// view states.
			largeIcon: true,
			smallIcon: true,
			list: true,
			tile: true,
		},

		// the inner grid used to show the items in detail view.
		gridView: null,

		// the inner container used to show the items in the items views.
		itemView: null,

		/**
		 * Initiates editing the specified item.
		 */
		editItem: function (index) {

			if (!this.isLabelEdit())
				return;

			if (!this.itemView.isVisible())
				return;

			this.itemView.editItem(index);
		},

		/**
		 * Applies the view property.
		 */
		_applyView: function (value, old) {

			switch (value) {

				default:
					// set the state that corresponds to the view mode.
					this.removeState("largeIcon");
					this.removeState("smallIcon");
					this.removeState("tile");
					this.addState(value);

					this.gridView.exclude();
					this.itemView.show();
					this.itemView.scrollToY(0);
					this.itemView.reloadData();

					// transfer the selection ranges.
					if (old == "details")
						this.itemView.setSelectionRanges(this.gridView.getSelectionRanges());

					break;

				case "details":

					this.itemView.exclude();
					this.gridView.show();
					this.gridView.scrollCellVisible(0, 0);
					this.gridView.reloadData();

					// transfer the selection ranges.
					this.gridView.setSelectionRanges(this.itemView.getSelectionRanges());

					break;
			}
		},

		/**
		 * Applies the iconSize property.
		 */
		_applyIconSize: function (value, old) {

			this.itemView.setIconSize(value);

		},

		/**
		 * Applies the stateIconSize property.
		 */
		_applyStateIconSize: function (value, old) {

			this.itemView.setStateIconSize(value);

		},

		/**
		 * Applies the itemSize property.
		 */
		_applyItemSize: function (value, old) {

			if (value == null || (value.width == 0 && value.height == 0)) {
				this.resetItemSize();
			}
			else {
				this.itemView.setItemSize(value);
				this.itemView.update();
			}
		},

		/**
		 * Applies the selectionMode property.
		 */
		_applySelectionMode: function (value, old) {

			this.itemView.setSelectionMode(value);
			this.gridView.setSelectionMode(value);
		},

		/**
		 * Applies the checkBoxes property.
		 */
		_applyCheckBoxes: function (value, old) {

			this.reloadData();
		},

		/**
		 * Applies the showItemTooltips property.
		 */
		_applyShowItemTooltips: function (value, old) {

			var block = !value;
			var widgets = this.itemView.getItemWidgets();
			if (widgets && widgets.length > 0) {
				for (var i = 0, length = widget.length; i < length; i++) {
					var w = widgets[i];
					if (w) w.setBlockToolTip(block);
				}
			}
		},

		// overridden.
		_applyBackgroundColor: function (value, old) {

			this.base(arguments, value, old);

			// propagate to the views.
			this.itemView.setBackgroundColor(value);
			this.gridView.setBackgroundColor(value);

		},

		// overridden.
		_applyTextColor: function (value, old) {

			this.base(arguments, value, old);

			// propagate to the views.
			this.itemView.setTextColor(value);
			this.gridView.setTextColor(value);

		},

		/**
		 * Applies the columns property.
		 */
		_applyColumns: function (value, old) {

			this.gridView.setColumns(value);
		},

		/**
		 * Applies the labelWrap property.
		 */
		_applyLabelWrap: function (value, old) {

			this.reloadData();

		},

		/**
		 * Applies the headerStyle property.
		 */
		_applyHeaderStyle: function (value, old) {

			this.gridView.setHeaderStyle(value);
		},

		/**
		 * Applies the liveResize property.
		 */
		_applyLiveResize: function (value, old) {

			this.gridView.setLiveResize(value);
		},

		/**
		 * Applies the gridLines property.
		 */
		_applyGridLines: function (value, old) {

			this.gridView.setGridLines(value ? this.getGridLineStyle() : "none");
		},

		/**
		 * Applies the gridLineStyle property.
		 */
		_applyGridLineStyle: function (value, old) {

			this.gridView.setGridLines(value);
		},

		/**
		 * Applies the itemPadding property.
		 */
		_applyItemPadding: function (value, old) {

			this.gridView.setDefaultCellStyle({ padding: value });
			this.reloadData();

		},

		/** 
		 * Applies the tools property.
		 */
		_applyTools: function (value, old) {

			if (value == null)
				return;

			var toolsContainer = this.getChildControl("tools", true);

			if (value.length == 0) {
				if (toolsContainer)
					toolsContainer.exclude();

				return;
			}

			if (!toolsContainer) {
				toolsContainer = this.getChildControl("tools");
				this._add(toolsContainer, { row: 0, column: 1 });
			}

			toolsContainer.show();

			var position = this.getToolsPosition();
			var vertical = position == "left" || position == "right";
			wisej.web.ToolContainer.install(this, toolsContainer, value, "left", { row: 0, column: 0 }, position);
			wisej.web.ToolContainer.install(this, toolsContainer, value, "right", vertical ? { row: 1, column: 0 } : { row: 0, column: 1 }, position);
		},

		/** 
		 * Applies the toolsPosition property.
		 */
		_applyToolsPosition: function (value, old) {

			this.__updateToolsLayout(this.getChildControl("tools", true));
		},

		/**
		 * Changes the layout of the tools container according to the value
		 * of the toolsPosition property.
		 *
		 * @param tools {wisej.web.toolContainer.ToolPanel} the panel that contains the two wise.web.ToolContainer widgets.
		 */
		__updateToolsLayout: function (tools) {

			if (tools) {

				var rowCol = { row: 0, column: 1 };
				var position = this.getToolsPosition();
				var vertical = position == "left" || position == "right";

				switch (position) {

					default:
					case "top":
						rowCol.row = 0;
						rowCol.column = 1;
						break;

					case "left":
						rowCol.row = 1;
						rowCol.column = 0;
						break;

					case "right":
						rowCol.row = 1;
						rowCol.column = 2;
						break;

					case "bottom":
						rowCol.row = 2;
						rowCol.column = 1;
						break;
				}

				tools.removeState("top");
				tools.removeState("left");
				tools.removeState("right");
				tools.removeState("bottom");
				tools.addState(position);

				tools.setLayoutProperties(rowCol);

				// change the position of the tool containers.
				if (this.__leftToolsContainer) {
					this.__leftToolsContainer.setPosition(position);
				}
				if (this.__rightToolsContainer) {
					this.__rightToolsContainer.setPosition(position);
					this.__rightToolsContainer.setLayoutProperties(vertical ? { row: 1, column: 0 } : { row: 0, column: 1 });
				}
			}
		},

		/**
		 * Reloads the data set in the current view.
		 */
		reloadData: function () {

			if (this.itemView.isVisible())
				this.itemView.reloadData();
			else if (this.gridView.isVisible())
				this.gridView.reloadData();

		},

		/**
		 * Updates an array or items, including all values and styles.
		 *
		 * This method is called from the server.
		 *
		 * @param actions {Array} the array of actions and items, each element is a map: {action: 0|1|2, index:, rowData: }
		 */
		updateItems: function (actions) {

			if (this.itemView.isVisible())
				this.itemView.updateItems(actions);
			else if (this.gridView.isVisible())
				this.gridView.updateRows(actions);
		},

		/**
		 * Sets the focused item in the active view.
		 *
		 * @param index {Integer} index of the item or row to scroll into view.
		 * @param deferred {Boolean ? false} when true, it indicates that the listview is about to load
		 *			the dataset and the cell cannot be focused until after the data count is loaded.
		 */
		setFocusedItem: function (index, deferred) {

			if (this.itemView.isVisible())
				this.itemView.setFocusedItem(index, deferred);
			else if (this.gridView.isVisible())
				this.gridView.setFocusedItem(index, deferred);
		},

		/**
		 * Updates the selection.
		 *
		 * @param ranges {Array} array of range objects: {minIndex, maxIndex}.
		 */
		setSelectionRanges: function (ranges) {

			if (this.itemView.isVisible())
				this.itemView.setSelectionRanges(ranges);
			else if (this.gridView.isVisible())
				this.gridView.setSelectionRanges(ranges);
		},

		/**
		 * Fires the specified item event.
		 *
		 * @param e {qx.event.type.Pointer} original pointer event.
		 * @param type {String} name of the event.
		 * @param index {Integer} item's index.
		 */
		fireItemEvent: function (e, type, index) {

			// prevent events in hosted widgets.
			var target = e.getTarget();
			var item = e.getCurrentTarget();
			if (item) {
				var host = item.getChildControl("host", true);
				if (host) {
					if (qx.ui.core.Widget.contains(host, target))
						return;
				}
			}

			this.fireEvent(type, wisej.web.listview.ItemEvent, [e, index]);
		},

		/**
		 * Ensures that the specified item is visible within the control, scrolling the contents of the control if necessary.
		 *
		 * @param index {Integer} index of the item or row to scroll into view.
		 */
		ensureVisible: function (index) {

			if (this.itemView.isVisible())
				this.itemView.scrollIntoView(index);
			else if (this.gridView.isVisible())
				this.gridView.scrollCellVisible(0, index);

		},

		/**
		 * Scrolls a column into visibility.
		 *
		 * @param col {Integer} the model index of the column to scroll.
		 */
		scrollColVisible: function (col) {

			if (this.gridView.isVisible())
				this.gridView.scrollCellVisible(col, -1);
		},

		/**
		 * Automatically resizes the specified column.
		 * 
		 * @param index {Integer} index of the column to resize; -1 for all.
		 * @param sizeMode {String} one of "headerSize", "columnContent".
		 */
		autoResizeColumns: function (index, sizeMode) {

			switch (sizeMode) {
				case "headerSize":
					this.gridView.autoResizeColumns(index, "columnHeader");
					break;

				case "columnContent":
					this.gridView.autoResizeColumns(index, "allCells");
					break;
			}
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "tools":
					control = new wisej.web.toolContainer.ToolPanel();
					break;

				case "item-view":
					control = new wisej.web.listview.ItemView(this).set({
						focusable: false,
						visibility: "excluded",
					});
					control.addState("inner");
					this.add(control, { row: 1, column: 1 });
					break;

				case "grid-view":
					control = new wisej.web.listview.GridView(this).set({
						focusable: false,
						visibility: "excluded",
						columnVisibilityButtonVisible: false,
					});
					control.addState("inner");
					this.add(control, { row: 1, column: 1 });
					break;
			}

			return control || this.base(arguments, id);
		},

		// focus the inner view when gaining the focus.
		__onFocusIn: function (e) {

			var currentView =
				this.itemView.isVisible()
					? this.itemView
					: this.gridView;

			if (currentView != qx.ui.core.Widget.getWidgetByElement(e.getOriginalTarget())) {
				currentView.fireNonBubblingEvent("focusin", qx.event.type.Focus);
				currentView.getFocusElement().focus();
				currentView.fireNonBubblingEvent("focus", qx.event.type.Focus);
			}
		},

		__onFocusOut: function (e) {

			var currentView =
				this.itemView.isVisible()
					? this.itemView
					: this.gridView;

			currentView.fireNonBubblingEvent("blur", qx.event.type.Focus);
			currentView.fireNonBubblingEvent("focusout", qx.event.type.Focus);
		},

		// Adds the index of the item under the pointer
		// to let the server know which ListViewItem is the target.
		_onDragEvent: function (e) {

			var target = e.getOriginalTarget();

			if (this.itemView.isVisible()) {
				if (target instanceof wisej.web.listview.ItemCellWidget) {
					this.itemView._onDragEvent(e);
				}
			}
			else if (this.gridView.isVisible()) {
				this.gridView._onDragEvent(e);
			}
		},

	}
});


/**
 * wisej.web.listview.ItemEvent
 *
 * Specialized data event holding mouse and item information.
 */
qx.Class.define("wisej.web.listview.ItemEvent", {

	extend: qx.event.type.Pointer,

	members: {

		__data: null,

		/**
		 * Initializes an event object.
		 *
		 * @param pointerEvent {qx.event.type.Pointer} The original pointer event
		 * @param data {var} The event's data.
		 *
		 * @return {qx.event.type.Data} the initialized instance.
		 */
		init: function (pointerEvent, data) {

			pointerEvent.clone(this);
			this.setBubbles(false);

			this.__data = data;

			return this;
		},

		/**
		 * The new data of the event sending this data event.
		 * The return data type is the same as the event data type.
		 *
		 * @return {var} The new data of the event
		 */
		getData: function () {
			return this.__data;
		},
	}

});
