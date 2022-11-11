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
 * wisej.web.DataGrid
 *
 * Enhanced implementation of the QX table widget.
 *
 * The Wisej DataGrid component adds: variable row height support, resizable rows (live and deferred), theme integration
 * for cell and row renderers, extended data model including row height and cell styles, dynamic 
 * configuration of the columns and column headers, support for extended styles in column headers, addition 
 * of row headers, various edit modes.
 *
 * In addition to the enhanced features, this class includes all the necessary events and properties required
 * to interact with Wisej server side model.
 */
qx.Class.define("wisej.web.DataGrid", {

	extend: qx.ui.table.Table,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	implement: [wisej.web.toolContainer.IToolPanelHost],

	construct: function (dataModel) {

		// use the design-mode data model?

		// when in design mode, ensure that we are using the
		// design mode data model.
		dataModel = dataModel ||
			(!wisej.web.DesignMode
				? new wisej.web.datagrid.DataModel()
				: new wisej.web.datagrid.DataModelDesignMode());

		// use our data model.
		this.base(arguments, dataModel);

		// add local state properties.
		this.setStateProperties(this.getStateProperties().concat(["firstVisibleRow", "scrollX", "visibleRowCount", "vScroll", "hScroll"]));

		// add local state events.
		this.setStateEvents(this.getStateEvents().concat(["verticalScrollBarChanged", "horizontalScrollBarChanged"]));

		// use our row renderer.
		this.getDataRowRenderer().dispose();
		this.setDataRowRenderer(new wisej.web.datagrid.RowRenderer());

		// force creation of the resize line.
		this._createChildControl("resize-line");

		// attach the "rowHeightChanged" event to resize the rows when the height changes.
		this.getTableModel().addListener("rowHeightChanged", this._onTableModelRowHeightChanged, this);

		// attach our keyboard processing.
		this.addListener("keydown", this._onKeyDown);

		// detect when the grid is hidden.
		this.addListener("disappear", this._onDisappear);

		// change the layout to Grid to host the tools container in any of the 4 sides.
		this._getLayout().dispose();
		var layout = new qx.ui.layout.Grid();
		layout.setRowFlex(1, 1);
		layout.setColumnFlex(1, 1);
		this._setLayout(layout);
		var children = this._getChildren();
		for (var i = 0, r = 0; i < children.length; i++) {
			if (!children[i].hasUserBounds())
				children[i].setLayoutProperties({ row: ++r, column: 1 });
		}

		// adds the inner target to the drop & drop event object.
		this.addListener("drop", this._onDragEvent, this);
		this.addListener("dragover", this._onDragEvent, this);

		// handles focus changes between the datagrid, and inner editors or controls.
		this.addListener("focusin", this._onFocusIn, this);
		this.addListener("focusout", this._onFocusOut, this);

		// remove the focus/blur handlers, we don't need to refresh the rows on focus changes.
		this.removeListener("focus", this._onFocusChanged);
		this.removeListener("blur", this._onFocusChanged);

		// rightToLeft support.
		this.addListener("changeRtl", this.reloadData);

		// register for the Enter or Esc keys accelerators.
		this.__onEnterHandler = this.__onEnter.bind(this);
		this.__onEscapeHandler = this.__onEscape.bind(this);
		wisej.web.manager.Accelerators.getInstance().register("Enter", this.__onEnterHandler, null, "keypress");
		wisej.web.manager.Accelerators.getInstance().register("Escape", this.__onEscapeHandler, null, "keypress");
	},

	statics: {

		/**
		 * @type {Integer} The time in milliseconds before a focused cell enters edit mode.
		 */
		STARTEDITING_DELAY: 25
	},

	events: {

		/**
		 * Fired when the table data changed (the stuff shown in the table body).
		 * The data property of the event will be a map having the following
		 * attributes:
		 * <ul>
		 *   <li>firstRow: The index of the first row that has changed.</li>
		 *   <li>lastRow: The index of the last row that has changed.</li>
		 * </ul>
		 */
		dataUpdated: "qx.event.type.Data",
	},

	properties: {

		// overridden.
		newColumnMenu: { refine: true, init: function (table) { return new wisej.web.datagrid.ColumnMenuButton(); } },

		// overridden.
		newTableColumnModel: { refine: true, init: function (table) { return new wisej.web.datagrid.ColumnModel(table); } },

		// overridden.
		newTablePaneScroller: { refine: true, init: function (table) { return new wisej.web.datagrid.GridScroller(table); } },

		// overridden.
		newTablePane: { refine: true, init: function (paneScroller) { return new wisej.web.datagrid.GridPane(paneScroller); } },

		// overridden.
		newTablePaneModel: { refine: true, init: function (columnModel) { return new wisej.web.datagrid.PaneModel(columnModel); } },

		// overridden.
		newTablePaneHeader: { refine: true, init: function (paneScroller) { return new wisej.web.datagrid.HeaderScroller(paneScroller); } },

		// overridden.
		newSelectionManager: { refine: true, init: function (table) { return new wisej.web.datagrid.SelectionManager(table); } },

		// overridden.
		newSelectionModel: { refine: true, init: function (table) { return new wisej.web.datagrid.SelectionModel(table); } },

		// overridden.
		forceLineHeight: { init: false, refine: true },

		// overridden.
		statusBarVisible: { init: false, refine: true },

		/**
		 * Columns
		 *
		 * Array of column descriptors: wisej.web.datagrid.ColumnHeader.
		 */
		columns: { init: [], check: "Array", apply: "_applyColumns", transform: "_transformComponents" },

		/**
		 * SelectionMode
		 * 
		 * "none" disables selection of cells, rows and columns.
		 * "row" is the only selection currently supported: tapping a cell or a row header always selects the row.
		 * "rowHeader" is a mix between "cell" and "row": the row is selected by tapping the row header otherwise the selection is "cell".
		 * "cell" only selects a cell, tapping a row header is ignored.
		 * "column" always selects the column, never selects a cell or a row.
		 * "columnHeader" is a mix between "column" and "cell": tapping a column header selects the column, otherwise selects the cell.
		 * "rowColumnHeader" is a mix between "rowHeader" and "columnHeader": tapping a column or a row header selects the column or the row, otherwise selects the cell.
		 *
		 */
		selectionMode: { init: "row", check: ["none", "cell", "row", "column", "rowHeader", "columnHeader", "rowColumnHeader"], apply: "_applySelectionMode" },

		/**
		 * MultiSelect
		 * 
		 * Enables the multiple selection of cells, rows, and columns.
		 */
		multiSelect: { init: true, check: "Boolean", apply: "_applyMultiSelect" },

		/**
		 * RightClickSelection property.
		 * 
		 * Determines whether a right click event ("contextmenu") selects the row under the pointer.
		 */
		rightClickSelection: { init: false, check: "Boolean" },

		/**
		 * AllowRowResize
		 */
		allowRowResize: { init: false, check: "Boolean" },

		/**
		 * EditMode
		 *
		 * Gets or sets a value indicating how to begin editing a cell.
		 */
		editMode: { init: "editOnKeystrokeOrF2", check: ["editOnEnter", "editOnKeystroke", "editOnKeystrokeOrF2", "editOnF2", "editProgrammatically"] },

		/**
		 * FrozenColumns
		 *
		 * Gets or sets the number of frozen columns.
		 */
		frozenColumns: { init: 0, check: "PositiveInteger", apply: "_applyFrozenColumns" },

		/**
		 * frozenRows
		 *
		 * Gets or sets the number of frozen rows.
		 */
		frozenRows: { init: 0, check: "PositiveInteger", apply: "_applyFrozenRows" },

		/**
		 * TreeColumn
		 * 
		 * Determines on which column to display the open/close icons when showing nested rows.
		 * The default value (null) uses the first visible non-frozen column.
		 */
		treeColumn: { init: null, check: "PositiveInteger", nullable: true },

		/**
		 * LiveResize
		 *
		 * Enables/disables live resizing of rows and columns.
		 */
		liveResize: { init: true, check: "Boolean", apply: "_applyLiveResize" },

		/**
		 * CellBorder property.
		 *
		 * Sets the type of border to use for the grid's cells.
		 */
		cellBorder: { init: "both", check: ["none", "vertical", "horizontal", "both"], apply: "_applyCellBorder" },

		/**
		 * ColHeadersBorder property.
		 *
		 * Sets the type of border to use for the grid's column headers.
		 */
		colHeadersBorder: { init: "both", check: ["none", "vertical", "horizontal", "both"], apply: "_applyColHeadersBorder" },

		/**
		 * TopScrollOffset property.
		 *
		 * The number of rows to keep when scrolling the content up.
		 *
		 * These are rows that have a negative margin and may contain
		 * cells with RowSpan > 1 and have to be rendered when scrolled
		 * outside of the view.
		 */
		topScrollOffset: { init: 0, check: "PositiveInteger", apply: "_applyTopScrollOffset" },

		/**
		 * AutoSizeRowsMode
		 * 
		 * Sets the auto sizing of the rows.
		 */
		autoSizeRowsMode: {
			init: "none",
			check: ["none", "rowHeader", "allCellsExceptHeaders", "allCells", "doubleClick"],
			apply: "_applyAutoSizeRowsMode"
		},

		/**
		 * KeepSameRowHeight
		 *
		 * Gets or sets a value indicating that all the rows should resize together.
		 */
		keepSameRowHeight: { init: false, check: "Boolean", apply: "_applyKeepSameRowHeight" },

		/**
		 * The minimum height of the table rows.
		 */
		minRowHeight: { init: 20, check: "PositiveInteger", themeable: true },

		/**
		 * The minimum height of the table rows.
		 */
		maxRowHeight: { init: 32000, check: "PositiveInteger", themeable: true },

		/**
		 * The indent in pixels to increase the indentation of child rows.
		 */
		indent: { init: 10, check: "PositiveInteger", apply: "_applyIndent", themeable: true },

		/**
		 * Default cell style to apply to all cells and override the theme.
		 */
		defaultCellStyle: { init: null, check: "Map" },

		/**
		 * Default row header style to apply to all row header cells and override the theme.
		 */
		defaultRowHeaderStyle: { init: null, check: "Map" },

		/**
		 * Shows or hides the row header column.
		 */
		rowHeadersVisible: { init: true, check: "Boolean", apply: "_applyRowHeadersVisible" },

		/**
		 * Determines which scrollbars should be visible: 0 = None, 1 = Horizontal, 2 = Vertical, 3 = Both, 4 = Hidden.
		 */
		scrollBars: { init: 3, check: "PositiveInteger", apply: "_applyScrollBars" },

		/**
		 * Sets the background color of the header panel in the scrollers.
		 */
		headerBackColor: { init: null, nullable: true, check: "Color", apply: "_applyHeaderBackColor", themeable: true },

		/**
		 * Sets the column headers size mode.
		 */
		headerSizeMode: { init: "disableResizing", check: ["disableResizing", "enableResizing", "autoSize"], apply: "_applyHeaderSizeMode" },

		/**
		 * Indicates whether the TAB key moves the focus to the next control in the tab order rather than moving focus to the next cell.
		 */
		standardTab: { init: false, check: "Boolean" },

		/**
		 * Design row used only at design time to fill the data grid.
		 */
		designRow: { init: null, check: "Map" },

		/**
		 * Index of the column active in the designer.
		 * Used to make sure it is scrolled into view.
		 */
		designActiveColumn: { init: -1, check: "Integer" },

		/**
		 * Milliseconds to wait before sending selection events to the server when the selection
		 * using the keyboard.
		 */
		selectionDelay: { init: 150, check: "PositiveInteger" },

		/**
		 * Enables automatic cell tooltips when the text overflows.
		 */
		showTooltips: { init: false, check: "Boolean" },

		/**
		 * HTML text to display when the grid is empty.
		 */
		noDataMessage: { init: "", check: "String", apply: "_applyNoDataMessage" },

		/**
		 * Sets the number or rows kept in the each cache block.
		 */
		blockSize: { init: 50, check: "PositiveInteger", apply: "_applyBlockSize" },

		/**
		 * Sets the maximum number of blocks kept in the cache.
		 */
		maxCachedBlocks: { init: 100, check: "PositiveInteger", apply: "_applyMaxCachedBlocks" },

		/**
		 * Tools property.
		 *
		 * Collection of tool definitions to display on top, left, bottom, right of the grid.
		 */
		tools: { check: "Array", apply: "_applyTools" },

		/**
		 * ToolsPosition property.
		 *
		 * Returns or sets the position of the tools container.
		 */
		toolsPosition: { init: "top", check: ["top", "left", "right", "bottom"], apply: "_applyToolsPosition" }
	},

	members: {

		// index of the row header column. 0 is the default.
		// a derived class may set it to -1 if it doesn't create the header column.
		_rowHeaderColIndex: 0,

		// when __updateMode is true, changes to the data model are ignored.
		__updateMode: false,

		// keep track of internal change mode.
		__internalChange: 0,

		// keep track of requests that depend on the data being loaded.
		__pendingCalls: null,
		__processingPendingCalls: 0,

		// timer id to start editing.
		__startEditingTimer: 0,

		// accelerator handlers.
		__onEnterHandler: null,
		__onEscapeHandler: null,

		/**
		 * Triggers a data reload request for the cached row range.
		 *
		 * This method is called from the server.
		 */
		reloadData: function () {

			var dataModel = this.getTableModel();
			if (dataModel && dataModel.reloadData) {

				dataModel.reloadData();
			}
		},

		/**
		 * Sets the value of the specified cell.
		 *
		 * This method is called from the server.
		 *
		 * @param colIndex {Integer} the index of the column.
		 * @param rowIndex {Integer} the index of the row.
		 * @param value {Object} the value to display in the cell.
		 * @param error {String?} the error text to display in the cell.
		 * @param tooltip {String?} the tooltip text associated with the cell.
		 */
		setCellValue: function (colIndex, rowIndex, value, error, tooltip) {

			var model = this.getTableModel();
			model.setValue(colIndex, rowIndex, value, error, tooltip);
		},

		/**
		 * Sets the value of a list of cells.
		 *
		 * This method is called from the server.
		 *
		 * @param cells {Array} the array of cells, each element is a map: {row: , col:, value:, error:, tooltip: }
		 */
		setCellValues: function (cells) {

			var model = this.getTableModel();
			for (var i = 0; i < cells.length; i++) {
				var cell = cells[i];
				model.setValue(cell.col, cell.row, cell.value, cell.error, cell.tooltip);
			}

		},

		/**
		 * Returns the value of the specified cell.
		 *
		 * @param colIndex {Integer} the index of the column.
		 * @param rowIndex {Integer} the index of the row.
		 */
		getCellValue: function (colIndex, rowIndex) {

			var model = this.getTableModel();
			return model.getValue(colIndex, rowIndex);

		},

		/**
		 * Sets the style of the specified cell.
		 *
		 * This method is called from the server.
		 *
		 * @param colIndex {Integer} the index of the column.
		 * @param rowIndex {Integer} the index of the row.
		 * @param style {Object} the style to apply to the cell.
		 */
		setCellStyle: function (colIndex, rowIndex, style) {

			var model = this.getTableModel();
			model.setCellStyle(colIndex, rowIndex, style);
		},

		/**
		 * Sets the style of a list of cells.
		 *
		 * This method is called from the server.
		 *
		 * @param cells {Array} the array of cells, each element is a map: {row: , col:, style: }
		 */
		setCellStyles: function (cells) {

			var model = this.getTableModel();
			for (var i = 0; i < cells.length; i++) {
				model.setCellStyle(cells[i].col, cells[i].row, cells[i].style);
			}
		},

		/**
		 * Gets the style used by the specified cell.
		 *
		 * @param colIndex {Integer} the index of the column.
		 * @param rowIndex {Integer} the index of the row.
		 */
		getCellStyle: function (colIndex, rowIndex) {

			var model = this.getTableModel();
			return model.getCellStyle(colIndex, rowIndex);

		},

		/**
		 * Sets the style in the specified row.
		 *
		 * @param rowIndex {Integer} the index of the row.
		 * @param style {Object} the style to apply to the cell.
		 */
		setRowStyle: function (rowIndex, style) {

			var model = this.getTableModel();
			model.setRowStyle(rowIndex, style);

		},

		/**
		 * Gets the style used by the specified row.
		 *
		 * @param rowIndex {Integer} the index of the row.
		 */
		getRowStyle: function (rowIndex) {

			var model = this.getTableModel();
			return model.getRowStyle(rowIndex);

		},

		/**
		 * Starts update mode. Any change to the data model
		 * are not reflected in the grid.
		 **/
		beginUpdate: function () {

			this.__updateMode = true;
			this.__internalChange = 1;

		},

		/**
		 * Ends update mode and updated the grid with the data in the model.
		 */
		endUpdate: function () {

			if (this.__updateMode) {
				this.__updateMode = false;
				this.__internalChange = 0;

				var model = this.getTableModel();
				model.fireDataEvent(
					"dataChanged",
					{
						firstRow: 0,
						lastRow: model.getRowCount() - 1,
						firstColumn: 0,
						lastColumn: model.getColumnCount() - 1
					});
			}
		},

		/**
		 * Updates an array or rows, including all the cells and styles.
		 *
		 * This method is called from the server.
		 *
		 * @param actions {Array} the array of actions and rows, each element is a map: {action: 0|1|2, index:, rowData: }
		 */
		updateRows: function (actions) {

			if (actions && actions.length > 0) {

				// enter update mode to trigger the grid update only once.
				this.__updateMode = true;

				var model = this.getTableModel();
				var lastRow = -1; var firstRow = Number.MAX_VALUE;
				try {
					for (var i = 0, length = actions.length; i < length; i++) {

						var action = actions[i];

						if (!action)
							break;

						switch (action.type) {

							case 0: // Update
								this.updateRow(action.index, action.rowData);
								firstRow = Math.min(firstRow, action.index);
								lastRow = Math.max(lastRow, action.index);
								break;

							case 1: // Delete
								this.deleteRow(action.index);
								firstRow = Math.min(firstRow, action.index);
								lastRow = Math.max(lastRow, action.index);
								break;

							case 2: // Insert
								this.insertRow(action.index, action.rowData);
								firstRow = Math.min(firstRow, action.index);
								lastRow = Math.max(lastRow, action.index);
								break;

							case 3: // Clear
								this.clearRows();
								break;
						}
					}

					// update the table now.
					if (firstRow > -1 && lastRow < Number.MAX_VALUE) {
						this._updateTableData(
							firstRow,
							lastRow,
							0,
							model.getColumnCount() - 1);
					}
				}
				finally {

					this.__updateMode = false;
				}
			}
		},

		/**
		 * Updates an entire row, including all the cells data and styles without issuing a data-load request.
		 *
		 * This method is called from the server.
		 *
		 * @param rowIndex {Integer} the index of the row to update.
		 * @param rowData {Map} the row data, including all cells and styles, to be added. this is the same map defined in the data model.
		 */
		updateRow: function (rowIndex, rowData) {

			var model = this.getTableModel();
			model.setRowData(rowIndex, rowData);
		},

		/**
		 * Deletes the row from the data model without issuing a data-load request.
		 *
		 * This method is called from the server.
		 *
		 * @param rowIndex {Integer} the index of the row to delete.
		 */
		deleteRow: function (rowIndex) {

			var model = this.getTableModel();
			model.removeRow(rowIndex);
		},

		/**
		 * Inserts the new row in the data model without issuing a data-load request.
		 *
		 * This method is called from the server.
		 *
		 * @param rowIndex {Integer} the index of the row to insert.
		 * @param rowData {Map} the row data, including all cells and styles, to be added. this is the same map defined in the data model.
		 */
		insertRow: function (rowIndex, rowData) {

			var model = this.getTableModel();
			model.insertRow(rowIndex, rowData);
		},

		/**
		 * Removes all the rows from the data model without issuing a data-load request.
		 */
		clearRows: function () {

			var model = this.getTableModel();
			model.clear();
		},

		/**
		 * Update the table content of every attached table pane.
		 *
		 * @param rowIndex {Integer ? null} the index of the row to update.
		 */
		updateContent: function (rowIndex) {

			var scrollerArr = this._getPaneScrollerArr();

			if (rowIndex == null) {
				for (var i = 0; i < scrollerArr.length; i++) {
					scrollerArr[i].getTablePane().updateContent(true);
				}
			}
			else {
				for (var i = 0; i < scrollerArr.length; i++) {
					scrollerArr[i].getTablePane().updateContent(false, null, rowIndex, true);
				}
			}
		},

		/**
		 * To update the table if the table model has changed and remove selection.
		 *
		 * @param firstRow {Integer} The index of the first row that has changed.
		 * @param lastRow {Integer} The index of the last row that has changed.
		 * @param firstColumn {Integer} The model index of the first column that has changed.
		 * @param lastColumn {Integer} The model index of the last column that has changed.
		 * @param removeStart {Integer ? null} The first index of the interval (including), to remove selection.
		 * @param removeCount {Integer ? null} The count of the interval, to remove selection.
		 */
		_updateTableData: function (firstRow, lastRow, firstColumn, lastColumn, removeStart, removeCount) {

			// trigger autoresize.
			this.scheduleAutoResize();

			// update the panels.
			this.base(arguments, firstRow, lastRow, firstColumn, lastColumn, removeStart, removeCount);

			// notify the server that the grid rows have been updated.
			this.fireDataEvent("dataUpdated", { firstRow: firstRow, lastRow: lastRow });
		},

		// overridden.
		_applyBackgroundColor: function (value, old) {

			this.base(arguments, value, old);

			// ignore if not created yet.
			if (!this.getBounds())
				return;

			qx.ui.core.queue.Widget.add(this, "updateContent");
		},

		// overridden.
		_applyTextColor: function (value, old) {

			this.base(arguments, value, old);

			// ignore if not created yet.
			if (!this.getBounds())
				return;

			qx.ui.core.queue.Widget.add(this, "updateContent");
		},

		/**
		 * Event handler. Called when a TablePaneScroller has been scrolled vertically.
		 *
		 * @param e {Map} the event.
		 */
		_onScrollY: function (e) {

			if (!this.__internalChange) {

				this.__internalChange++;
				try {

					// set the same scroll position to all meta columns
					var scrollerArr = this._getPaneScrollerArr();
					for (var i = 0; i < scrollerArr.length; i++) {
						scrollerArr[i].setScrollY(e.getData());
					}
				}
				finally {
					this.__internalChange--;
				}
			}
		},

		/**
		 * Event handler. Called when the table model data has changed.
		 * Overridden to ignore the "dataChanged" events when in bulk mode.
		 *
		 * @param e {Map} the event.
		 */
		_onTableModelDataChanged: function (e) {

			if (!this.__updateMode)
				this.base(arguments, e);

			// call the deferred functions that couldn't
			// have been called when the table was not populated yet.
			var data = e.getData();
			var model = this.getTableModel();
			if (model.getRowData(data.firstRow))
				this.__executePendingCalls();

			// show the no-data message if set.
			var message = this.getChildControl("no-data", true);
			if (message) {
				model.getRowCount() == 0
					? message.show()
					: message.hide();
			}
		},

		// Executes pending calls.
		__executePendingCalls: function () {

			if (this.__pendingCalls) {

				if (this.getRowCount() > 0) {

					var pendingCalls = this.__pendingCalls;
					qx.event.Timer.once(function () {

						this.__processingPendingCalls++;
						try {
							for (var name in pendingCalls) {
								var call = pendingCalls[name];
								call.func.apply(this, call.args);
							}
						}
						catch (error) {

							this.core.logError(error);
						}
						finally {
							this.__processingPendingCalls--;
						}

					}, this, 1);
				}

				this.__pendingCalls = null;
			}
		},

		// Defers the call to after the data is loaded.
		__postCall: function (args) {

			this.__pendingCalls = this.__pendingCalls || {};

			this.__pendingCalls[args.callee.displayName] = {
				func: args.callee,
				args: Array.prototype.slice.call(args)
			};
		},

		/**
		 * Event handler. Called when the table model meta data has changed.
		 *
		 * @param e {Map} the event data.
		 */
		_onTableModelMetaDataChanged: function (e) {

			if (e) {
				if (!this.__updateMode) {
					qx.ui.core.queue.Widget.add(this, "metaDataChanged");
				}
			}
			else {

				var scrollerArr = this._getPaneScrollerArr();

				for (var i = 0; i < scrollerArr.length; i++) {
					scrollerArr[i].onTableModelMetaDataChanged();
				}

				this._updateStatusBar();
			}
		},

		/**
		 * Handle the "disappear" even to cancel editing.
		 */
		_onDisappear: function (e) {

			this.cancelEditing();

		},

		/**
		 * Handles when the focus is gained by the grid or a child control or child editor.
		 */
		_onFocusIn: function (e) {

			var target = e.getTarget();
			var related = e.getRelatedTarget();

			if (target === this || related === this || related && qx.ui.core.Widget.contains(this, related)) {
				this.visualizeFocus();
				this._onFocusChanged(e);
				this.__showFocusIndicator(true);
			}
		},

		/**
		 * Handles when the focus is lost by the grid or a child control or child editor.
		 */
		_onFocusOut: function (e) {

			var target = e.getTarget();
			var related = e.getRelatedTarget();
			var cellEditor = this.getCellEditor();

			if (!related && target !== this) {

				if (target === cellEditor || (target != null && target.hasState("celleditor"))) {
					this.focus();
				}
				else {
					this.visualizeBlur();
					this._onFocusChanged(e);
					this.__showFocusIndicator(false);
				}
				return;
			}

			if (cellEditor && qx.ui.core.Widget.contains(cellEditor, related))
				return;

			if (related && wisej.utils.Widget.isInsidePopup(related))
				return;

			if (related !== cellEditor && related != this && !qx.ui.core.Widget.contains(this, related)) {
				this.stopEditing(true);
				this.visualizeBlur();
				this._onFocusChanged(e);
				this.__showFocusIndicator(false);
				return;
			}
		},

		/**
		 * Focus this widget when using the keyboard. This is
		 * mainly thought for the advanced qooxdoo keyboard handling
		 * and should not be used by the application developer.
		 *
		 * @internal
		 */
		tabFocus: function () {

			this.getFocusElement().focus();

			var row = this.getFocusedRow();
			var col = this.getFocusedColumn();

			// automatically focus the first row/col when entering the grid 
			// by tabbing into it and there is no focused row or col.
			if (row == null && col == null) {
				if (row == null && col == null) {
					var firstRow = this.getFirstVisibleRow();
					var firstCol = this.getFirstVisibleColumn();
					if (firstRow != null && firstCol != null)
						this.setFocusedCell(firstCol, firstRow, true);
				}
			}
		},

		/**
		 * Shows or hides the focus indicator.
		 */
		__showFocusIndicator: function (show) {

			var col = this.getFocusedColumn();
			var scrollerArr = this._getPaneScrollerArr();
			for (var i = 0; i < scrollerArr.length; i++) {

				var scroller = scrollerArr[i];
				if (scroller.getShowCellFocusIndicator()) {
					var focusIndicator = scroller.__focusIndicator;
					if (focusIndicator) {

						scroller._updateFocusIndicator();

						// make sure the focus indicator is shown only on the correct scroller.
						if (show && col != null && col >= -1 && focusIndicator.getColumn() === col)
							focusIndicator.show();
						else
							focusIndicator.hide();
					}
				}
			}
		},

		/**
		 * Applies the columns property.
		 *
		 * Replaces all the columns in the grid using the new columns defined in the
		 * array of column descriptors.
		 *
		 * Existing rows are not lost, the data is bound using the column ids.
		 */
		_applyColumns: function (value, old) {

			// detect if the collection changed.
			if (value == old)
				return;

			if (value != null && old != null && value.length == old.length) {
				var changed = false;
				for (var i = 0; i < value.length; i++) {
					if (value[i] != old[i]) {
						changed = true;
						break;
					}
				}
				if (!changed)
					return;
			}

			this.__updateMode = true;

			try {

				var columns = value;

				// reset the current focused cell.
				this.cancelEditing();
				this.setFocusedCell(null, this.getFocusedRow());

				// reset the scroll panes.
				this.setMetaColumnCounts([0]);

				// detach existing columns from the table.
				if (old != null && old.length > 0) {
					for (var i = 0; i < old.length; i++) {
						old[i].setTable(null);
					}
				}

				// build the grid columns in the table column model
				// from the ColumnHeader widget collection.

				var columnIDs = [];
				var columnTitles = [];
				var columnPositions = [];

				// create the columns from the column header instances.
				if (columns != null && columns.length > 0) {
					for (var i = 0; i < columns.length; i++) {

						var col = columns[i];

						// bind the column header object to this table.
						col.setTable(this);

						columnIDs.push(col.getName() || "");
						columnTitles.push(col.getLabel() || "");
						columnPositions[col.getPosition() || i] = i;
					}
				}

				// update the columns in the data model.
				var dataModel = this.getTableModel();
				dataModel.setColumns(columnTitles, columnIDs);

				// reset the old column model if columns have changed.
				if (old != null && old.length > 0) {
					this.__columnModel = null;
				}

				// initialize the column model with the new column count.
				var columnModel = this.getTableColumnModel();
				columnModel.init(columnIDs.length, this);

				if (columnIDs.length > 0) {

					columnModel.__internalChange = true;
					try {

						// apply the editable and sortable attributes.
						for (var i = 0; i < columnIDs.length; i++) {
							var col = columns[i];
							dataModel.setColumnEditable(i, col.isEditable());
							dataModel.setColumnSortable(i, col.isSortable());
						}

						// update the column positions.
						columnModel.setColumnsOrder(columnPositions);

						// apply column attributes.
						for (var i = 0; i < columnIDs.length; i++) {
							var col = columns[i];
							columnModel.setColumnWidth(i, col.getWidth());
							columnModel.setColumnVisible(i, col.isVisible());
							columnModel.setColumnStyle(i, col.getStyle());
							columnModel.setColumnData(i, col.getData());
						}

					} finally {

						columnModel.__internalChange = false;
					}
				}

				// prepare the meta columns.
				this._updateMetaColumns();
			}
			finally {
				this.__updateMode = false;
				this._onTableModelMetaDataChanged();
			}
		},

		/**
		 * Applies the rowHeadersVisible property.
		 */
		_applyRowHeadersVisible: function (value, old) {

			var columnModel = this.getTableColumnModel();
			if (columnModel && this._rowHeaderColIndex > -1) {

				// show/hide the row header column.
				if (columnModel.getOverallColumnCount() > 0)
					columnModel.setColumnVisible(this._rowHeaderColIndex, value);
			}

			// update the first scroller type: when the row
			// headers are hidden the first scroller is not the
			// rowheader anymore.
			var scrollerArr = this._getPaneScrollerArr();
			for (var i = 0; i < scrollerArr.length; i++) {
				scrollerArr[i]._updateScrollerType();
			}
		},

		/**
		 * Applies the frozenColumns property.
		 */
		_applyFrozenColumns: function (value, old) {

			if (value == null || value == old)
				return;

			// reset the current focused cell.
			this.cancelEditing();
			this.setFocusedCell(null, null);

			this._updateMetaColumns();
			qx.ui.core.queue.Widget.add(this, "updateContent");
		},

		/**
		 * Applies the frozenRows property.
		 */
		_applyFrozenRows: function (value, old) {

			if (value == null || value == old)
				return;

			qx.ui.core.queue.Widget.add(this, "updateContent");
		},

		/**
		 * Sets the meta column model.
		 */
		_updateMetaColumns: function () {

			var columnModel = this.getTableColumnModel();
			if (columnModel) {

				// ignore if the grid doesn't have any column.
				if (columnModel.getOverallColumnCount() == 0)
					return;

				var metaColumns = [];

				// the first band is the row header column.
				if (this._rowHeaderColIndex > -1 && columnModel.isColumnVisible(this._rowHeaderColIndex)) {
					metaColumns.push(1);
				}

				// the second band is the left-frozen columns.
				var frozenCount = this.getFrozenColumns();
				if (frozenCount > 0)
					metaColumns.push(frozenCount);

				// next, everything else.
				metaColumns.push(-1);

				// avoid redundant changes.
				var old = this.getMetaColumnCounts();
				if (old && old.length == metaColumns.length) {
					for (var i = 0; i < old.length; i++) {
						if (old[i] != metaColumns[i]) {

							this.setMetaColumnCounts(metaColumns);
							break;
						}
					}
				}
				else {
					this.setMetaColumnCounts(metaColumns);
				}

				var scrollerArr = this._getPaneScrollerArr();
				for (var i = 0; i < scrollerArr.length; i++) {
					scrollerArr[i]._updateScrollerType();

					// redirect vertical and horizontal scrolling.
					scrollerArr[i].removeListener("changeScrollY", this.__onChangeScrollY, this);
					scrollerArr[i].removeListener("changeScrollX", this.__onChangeScrollX, this);
					scrollerArr[i].addListener("changeScrollY", this.__onChangeScrollY, this);
					scrollerArr[i].addListener("changeScrollX", this.__onChangeScrollX, this);
				}

				this._updateScrollerWidths();
				this._applyHeaderCellsVisible(this.getHeaderCellsVisible());
			}
		},

		/**
		 * Fires the scroll event when scrolling.
		 */
		__onChangeScrollX: function (e) {

			this.__fireScrollEvent(e, false);
		},

		/**
		 * Fires the scroll event when scrolling.
		 */
		__onChangeScrollY: function (e) {

			this.__fireScrollEvent(e, true);
		},

		__fireScrollEvent: function (e, vertical) {

			this.setDirty(true);

			var position = e.getData() | 0;
			var old = (vertical ? this.__oldScrollY : this.__oldScrollX) | 0;
			vertical ? this.__oldScrollY = position : this.__oldScrollX = position;

			if (position == old)
				return;

			var scrollContainer = e.getTarget();
			var scrollbar = vertical
				? scrollContainer.getChildControl("scrollbar-y")
				: scrollContainer.getChildControl("scrollbar-x");

			var data = {};
			data.old = old;
			data[vertical ? "scrollY" : "scrollX"] = position;
			data.type = position == 0 ? "first" : position == scrollbar.getMaximum() ? "last" : "step";

			this.fireDataEvent("scroll", data);
		},

		// property modifier
		_applyHeaderCellHeight: function (value, old) {

			var scrollerArr = this._getPaneScrollerArr();

			for (var i = 0; i < scrollerArr.length; i++) {

				var header = scrollerArr[i].getHeader();
				header.setHeight(value);
				header.setMaxHeight(value);
			}

			if (this.__canFireServerEvent()) {
				this.fireDataEvent("rowHeightChanged", { row: -1, height: value });
			}
		},

		/**
		 * Applies the liveResize property.
		 *
		 * Updates the property on all scroller panes.
		 */
		_applyLiveResize: function (value, old) {

			var scrollerArr = this._getPaneScrollerArr();
			for (var i = 0; i < scrollerArr.length; i++) {
				scrollerArr[i].setLiveResize(value);
			}
		},

		/**
		 * Applies the topScrollOffset property.
		 *
		 * Updates the property on all scroller panes.
		 */
		_applyTopScrollOffset: function (value, old) {

			var scrollerArr = this._getPaneScrollerArr();
			for (var i = 0; i < scrollerArr.length; i++) {
				scrollerArr[i].getTablePane().setTopScrollOffset(value);
			}
		},

		/**
		 * Applies the cellBorder property.
		 *
		 */
		_applyCellBorder: function (value, old) {

			this._cellBorderStyle = "border" + qx.lang.String.firstUp(value);
			qx.ui.core.queue.Widget.add(this, "updateContent");
		},

		/**
		 * Applies the colHeadersBorder property.
		 *
		 */
		_applyColHeadersBorder: function (value, old) {

			this._colHeadersBorderStyle = "border" + qx.lang.String.firstUp(value);

			var scrollerArr = this._getPaneScrollerArr();
			for (var i = 0; i < scrollerArr.length; i++) {
				var header = scrollerArr[i].getChildControl("header-container", true);
				if (header) {
					header.removeState("borderNone");
					header.removeState("borderBoth");
					header.removeState("borderVertical");
					header.removeState("borderHorizontal");
					header.addState(this._colHeadersBorderStyle);
				}
			}

			var columns = this.getColumns();
			for (var i = 0; i < columns.length; i++) {
				var header = columns[i].getHeaderWidget();
				if (header) {
					header.removeState("borderNone");
					header.removeState("borderBoth");
					header.removeState("borderVertical");
					header.removeState("borderHorizontal");
					header.addState(this._colHeadersBorderStyle);
				}
			}

			qx.ui.core.queue.Widget.add(this, "updateContent");
		},

		/**
		 * The full name of the state to add to the inner cells.
		 * Cached here to speed up cell rendering. It is used in wisej.web.datagrid.cellRenderer.Cell._getCellState.
		 */
		_cellBorderStyle: "borderBoth",

		/**
		 * The full name of the state to add to the inner cells.
		 * Cached here to speed up cell rendering. It is used in wisej.web.datagrid.ColumnHeader._applyHeaderWidget.
		 */
		_colHeadersBorderStyle: "borderBoth",

		/**
		 * Applies the scrollBar property.
		 */
		_applyScrollBars: function (value, old) {

			this._updateScrollBarVisibility();
		},

		/**
		 * Applies the headerBackColor property.
		 */
		_applyHeaderBackColor: function (value, old) {

			if (value == null) {
				this.resetHeaderBackColor();
				return;
			}

			var scrollerArr = this._getPaneScrollerArr();
			for (var i = 0; i < scrollerArr.length; i++) {
				scrollerArr[i].setHeaderBackColor(value);
			}
		},

		/**
		 * Applies the headerSizeMode property.
		 */
		_applyHeaderSizeMode: function (value, old) {

			if (value == "autoSize")
				this.scheduleAutoResizeColumnHeaders();
		},

		/**
		 * Applies the KeepSameRowHeight property.
		 */
		_applyKeepSameRowHeight: function (value, old) {

			this._onTableModelRowHeightChanged();
		},

		/**
		 * Applies the AutoSizeRowsMode property.
		 */
		_applyAutoSizeRowsMode: function (value, old) {

			if (value !== "none" && value !== "doubleClick")
				this.scheduleAutoResize();
		},

		/**
		 * Applies the Indent property.
		 */
		_applyIndent: function (value, old) {

			if (value == -1) {
				this.resetIndent();
				return;
			}

			// ignore if not created yet.
			if (!this.getBounds())
				return;

			qx.ui.core.queue.Widget.add(this, "updateContent");
		},

		/**
		 * Applies the rowHeight property.
		 */
		_applyRowHeight: function (value, old) {

			this._onTableModelRowHeightChanged();
		},

		/**
		 * Applies the noDataMessage property.
		 */
		_applyNoDataMessage: function (value, old) {

			var message = this.getChildControl("no-data", true);

			if (!value) {
				if (message) {
					message.hide();
					message.setLabel("");
				}
			}
			else {
				message = message || this.getChildControl("no-data");
				message.setLabel(value);
			}
		},

		/**
		 * Applies the BlockSize property.
		 */
		_applyBlockSize: function (value, old) {

			if (wisej.web.DesignMode)
				return;

			this.getTableModel().setBlockSize(value);
		},

		/**
		 * Applies the MaxCachedBlocks property.
		 */
		_applyMaxCachedBlocks: function (value, old) {

			if (wisej.web.DesignMode)
				return;

			this.getTableModel().setMaxCachedBlockCount(value);
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
			wisej.web.ToolContainer.install(this, tools, value, "right", { row: 0, column: 1 }, null, "datagrid");
			wisej.web.ToolContainer.install(this, tools, value, "left", { row: 0, column: 0 }, null, "datagrid");
		},

		/** 
		 * Applies the toolsPosition property.
		 */
		_applyToolsPosition: function (value, old) {

			this.updateToolPanelLayout(this.getChildControl("tools", true));
		},

		/**
		 * Implements: wisej.web.toolContainer.IToolPanelHost.updateToolPanelLayout
		 * 
		 * Changes the layout of the tools container according to the value
		 * of the toolsPosition property.
		 *
		 * @param toolPanel {wisej.web.toolContainer.ToolPanel} the panel that contains the two wise.web.ToolContainer widgets.
		 */
		updateToolPanelLayout: function (toolPanel) {

			if (toolPanel) {

				var rowCol = {
					row: 0, column: 1
				};

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
						rowCol.row = 3;
						rowCol.column = 1;
						break;
				}

				toolPanel.removeState("top");
				toolPanel.removeState("left");
				toolPanel.removeState("right");
				toolPanel.removeState("bottom");
				toolPanel.addState(position);

				toolPanel.setLayoutProperties(rowCol);

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
		 * Returns the selected items in a collection of ranges.
		 */
		getSelectionRanges: function () {

			return this.getSelectionModel().getSelectionRanges();
		},

		/**
		 * Updates the selected rows.
		 */
		setSelectionRanges: function (ranges) {

			var selectionModel = this.getSelectionModel();

			selectionModel.setBatchMode(true);
			selectionModel.resetSelection();

			if (ranges) {

				try {

					for (var i = 0; i < ranges.length; i++) {
						var range = ranges[i];
						selectionModel.addSelectionRange(range.minCol, range.minRow, range.maxCol, range.maxRow);
					}
				}
				catch (ex) { }
			}

			selectionModel.setBatchMode(false);
		},

		/**
		 * Applies the multiSelect property.
		 */
		_applyMultiSelect: function (value, old) {

			this.getSelectionManager().setMultiSelect(value);
		},

		/**
		 * Applies the selectionMode property.
		 */
		_applySelectionMode: function (value, old) {

			this.getSelectionManager().setSelectionMode(value);
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "tools":
					control = new wisej.web.toolContainer.ToolPanel();
					control.addListener("resize", this.__onToolsResize, this);
					break;

				case "no-data":
					control = new qx.ui.basic.Atom().set({
						rich: true,
						center: true,
						anonymous: true,
						visibility: "hidden"
					});
					control.getContentElement().setAttribute("role", "no-data");
					control.setUserBounds(0, 0, 0, 0);
					this._add(control);
					break;

				case "resize-line":
					control = new qx.ui.core.Widget();
					control.setUserBounds(0, 0, 0, 0);
					control.setZIndex(1000);
					control.exclude();
					this._add(control);
					break;
			}

			return control || this.base(arguments, id);
		},

		/**
		 * Handles the heightChanged event from the data model and causes the
		 * table to redraw the rows.
		 */
		_onTableModelRowHeightChanged: function (e) {

			if (!this.__updateMode) {

				this._updateScrollBarVisibility();

				var scrollerArr = this._getPaneScrollerArr();
				for (var i = 0; i < scrollerArr.length; i++) {
					scrollerArr[i].onTableModelRowHeightChanged();
				}
			}

			// fire rowHeightChanged for a single row.
			if (e != null) {
				var data = e.getData();
				this.fireDataEvent("rowHeightChanged", { row: data.row, height: data.newHeight });
			}
		},

		/**
		 * Schedules a full update when the column style has changed.
		 *
		 * The column style is applied to all the cells in the column and 
		 * since multiple columns can get updates at once, we start the update only
		 * once using the widget queue.
		 */
		_onColStyleChanged: function (e) {

			// ignore if not created yet.
			if (!this.getBounds())
				return;

			// clear all the cached styles when a 
			// a column styles is changed. need to redraw all cells.
			var dataModel = this.getTableModel();
			if (dataModel.resetStyles)
				dataModel.resetStyles();

			this.scheduleAutoResize();

			qx.ui.core.queue.Widget.add(this, "updateContent");
		},

		/**
		 * Schedules a full update when a column is selected or deselected.
		 */
		_onColSelectionChanged: function (e) {

			// ignore if not created yet.
			if (!this.getBounds())
				return;

			qx.ui.core.queue.Widget.add(this, "updateContent");
		},

		/**
		 * Schedules a full update when the column shared data (data shared among all cells in the column) has changed.
		 *
		 * The column style is applied to all the cells in the column and 
		 * since multiple columns can get updates at once, we start the update only
		 * once using the widget queue.
		 */
		_onColDataChanged: function (e) {

			// ignore if not created yet.
			if (!this.getBounds())
				return;

			qx.ui.core.queue.Widget.add(this, "updateContent");
		},

		/**
		 * Schedules a full content update.
		 */
		update: function () {

			qx.ui.core.queue.Widget.add(this, "updateContent");
		},

		/**
		 * Schedules a full update of the columns position.
		 */
		scheduleUpdateColumnsPosition: function () {

			qx.ui.core.queue.Widget.add(this, "updateColumnsPosition");
		},

		/**
		 * This method is called during the flush of the
		 * {@link qx.ui.core.queue.Widget widget queue}.
		 *
		 * @param jobs {Map} A map of jobs.
		 */
		syncWidget: function (jobs) {

			this.base(arguments, jobs);

			if (!jobs)
				return;

			if (jobs["updateContent"])
				this.updateContent();

			if (jobs["updateColumnsPosition"])
				this.updateColumnsPosition();

			if (jobs["updateColumnHeaders"])
				this.scheduleAutoResize();

			if (jobs["syncVerticalScrollBars"])
				this.syncVerticalScrollBars();

			if (jobs["metaDataChanged"])
				this._onTableModelMetaDataChanged();
		},

		/**
		* Returns the index of the last visible column.
		 */
		getLastVisibleColumn: function () {

			var visible = this.getTableColumnModel().getVisibleColumns();
			return visible[visible.length - 1];
		},

		/**
		* Returns the number of visible columns.
		 */
		getVisibleColumnCount: function () {

			return this.getTableColumnModel().getVisibleColumnCount();
		},

		/**
		 * Returns the total number of rows.
		 */
		getRowCount: function () {

			return this.getTableModel().getRowCount();
		},

		/**
		 * FirstVisibleRow property getter.
		 *
		 * This is a read-only property that returns the first visible row at the top of the grid.
		 * This is also a state property that is returned to the server with all updates.
		 */
		getFirstVisibleRow: function () {

			if (this.getRowCount() == 0)
				return null;

			return this.getPaneScroller(0).getTablePane().getFirstVisibleRow();
		},

		/**
		 * VScroll property getter.
		 *
		 * Returns whether the vertical scrollbar is visible.
		 * This is a read-only property used by the state properties list to update the server.
		 */
		getVScroll: function () {
			var scroller = null;
			var scrollers = this._getPaneScrollerArr();
			for (var i = 0; i < scrollers.length; i++) {
				scroller = scrollers[i];
				if (!scroller.isFrozenPane() && !scroller.isRowHeaderPane()) {
					return scroller.getVerticalScrollBarVisible();
				}
			}

			return false;
		},

		/**
		 * HScroll property getter.
		 * 
		 * Returns whether the horizontal scrollbar is visible.
		 * This is a read-only property used by the state properties list to update the server.
		 */
		getHScroll: function () {
			var scroller = null;
			var scrollers = this._getPaneScrollerArr();
			for (var i = 0; i < scrollers.length; i++) {
				scroller = scrollers[i];
				if (!scroller.isFrozenPane() && !scroller.isRowHeaderPane()) {
					return scroller.getHorizontalScrollBarVisible();
				}
			}

			return false;
		},

		/**
		 * FirstVisibleColumn property getter.
		 *
		 * Returns the first visible column.
		 * This is also a state property that is returned to the server with all updates.
		 */
		getFirstVisibleColumn: function () {

			var columnModel = this.getTableColumnModel();
			if (columnModel.getVisibleColumnCount() == 0)
				return null;

			var rowHeaderVisible = this._rowHeaderColIndex > -1 && columnModel.isColumnVisible(this._rowHeaderColIndex);

			// if the row header is visible, we read the first visible column
			// from the second scroller since the first is used by the row header column.
			// NOTE: if there are frozen columns, the first frozen visible column is returned.

			return this.getPaneScroller(rowHeaderVisible ? 1 : 0)._getColumnForPageX(0);
		},

		/**
		 * FirstVisibleColumn property setter.
		 * 
		 * @param col {Integer} Index of the column to scroll into view to the left-most position.
		 */
		setFirstVisibleColumn: function (col) {

			var scroller = null;
			var scrollers = this._getPaneScrollerArr();
			for (var i = 0; i < scrollers.length; i++) {
				scroller = scrollers[i];
				if (!scroller.isFrozenPane() && !scroller.isRowHeaderPane()) {
					var paneModel = scroller.getTablePaneModel();
					var columnLeft = paneModel.getColumnLeft(col);
					if (columnLeft >= 0) {
						scroller.setScrollX(columnLeft);
						break;
					}
				}
			}
		},

		/**
		 * VisibleRows property getter.
		 *
		 * This is a read-only property that returns the number of visible rows.
		 * It is also a state property that is returned to the server with all updates.
		 */
		getVisibleRowCount: function () {

			return this.getPaneScroller(0).getTablePane().getVisibleRowCount();
		},

		/**
		 * ScrollX property getter.
		 * 
		 * Returns the scroll X position of the first scrollable panel.
		 */
		getScrollX: function () {

			var scroller = null;
			var scrollers = this._getPaneScrollerArr();
			for (var i = 0; i < scrollers.length; i++) {
				scroller = scrollers[i];
				if (!scroller.isFrozenPane() && !scroller.isRowHeaderPane()) {
					return scroller.getScrollX();
				}
			}

			return 0;
		},

		/**
		 * Returns the index of the row header column.
		 * It's either 0 or -1 if the row header column is not created.
		 */
		getRowHeaderIndex: function () {
			return this._rowHeaderColIndex;
		},

		/**
		 * Event handler. Called when a key is down.
		 *
		 * @param e {qx.event.type.KeySequence} the event.
		 */
		_onKeyDown: function (e) {

			if (!this.isEnabled())
				return;

			var identifier = e.getKeyIdentifier();

			switch (identifier) {
				case "C":
				case "Insert":
					if (!this.isEditing() && e.getModifiers() == qx.event.type.Dom.CTRL_MASK) {
						if (!this.isWired("keydown"))
							this.fireEvent("copy");
					}
					break;

				case "A": // select all
					if (!this.isEditing() && e.getModifiers() == qx.event.type.Dom.CTRL_MASK)
						if (!this.isWired("keydown"))
							this.fireEvent("gridCellKeyPress");
					break;
			}
		},

		/**
		 * Event handler. Called when a key is was pressed.
		 *
		 * @param e {qx.event.type.KeySequence} the event.
		 */
		_onKeyPress: function (e) {

			if (!this.isEnabled())
				return;

			// let embedded widgets handle their own keystrokes.
			var target = e.getTarget();
			if (this !== target &&
				!(target instanceof qx.ui.root.Inline) &&
				!qx.ui.core.Widget.contains(this.__scrollerParent, target)) {

				return;
			}

			var consumed = false;
			var editMode = this.getEditMode();
			var identifier = e.getKeyIdentifier();
			var focusedRow = this.getFocusedRow();
			var focusedCol = this.getFocusedColumn();

			// in editing mode?
			if (this.isEditing()) {

				if (e.getModifiers() == 0 || e.isShiftPressed()) {

					switch (identifier) {

						case "Enter":
							this.stopEditing(true /*notify*/);
							consumed = true;
							break;

						case "Escape":
							this.cancelEditing();
							consumed = true;
							break;

						case "Up":
							if (this._canMoveEditingCell(target, identifier)) {
								if (focusedRow > 0) {
									this.moveFocusedCell(0, -1);
									consumed = true;
								}
							}
							break;

						case "Down":
							if (this._canMoveEditingCell(target, identifier)) {
								var tableModel = this.getTableModel();
								if (focusedRow < tableModel.getRowCount() - 1) {
									this.moveFocusedCell(0, 1);
									consumed = true;
								}
							}
							break;

						case "Left":
							if (this._canMoveEditingCell(target, identifier)) {
								this.moveFocusedCell(-1, 0);
								consumed = true;
							}
							break;

						case "Right":
							if (this._canMoveEditingCell(target, identifier)) {
								this.moveFocusedCell(1, 0);
								consumed = true;
							}
							break;

						case "PageUp":
						case "PageDown":
							var scroller = this.getPaneScroller(0);
							var direction = (identifier === "PageUp") ? -1 : 1;
							var visibleCount = this.getVisibleRowCount() - 1;
							scroller.setScrollY(scroller.getScrollY() + direction * visibleCount);
							this.moveFocusedCell(0, direction * visibleCount);
							consumed = true;
							break;

						case "Tab":
							this._handleTabKey(e);
							break;
					}
				}
			}
			else {

				// we are not in editing mode.

				switch (identifier) {

					case "Space":

						if (editMode === "editOnKeystroke" || editMode === "editOnKeystrokeOrF2" || editMode === "editOnEnter") {
							this.startEditing();
							consumed = true;
						}

						// select/unselect the current row.
						this.getSelectionManager().handleSelectKeyDown(focusedCol, focusedRow, e);
						break;

					case "Enter":

						if (editMode === "editOnKeystroke" || editMode === "editOnKeystrokeOrF2" || editMode === "editOnEnter") {
							this.startEditing();
							consumed = true;
						}
						break;

					case "Escape":

						switch (this.getSelectionMode()) {
							case "row":
							case "rowHeader":
								// pressing Esc when a cell is focused and not in edit mode selects the row.
								if (focusedCol > this._rowHeaderColIndex && focusedRow >= 0) {
									this.setFocusedCell(-1, focusedRow);
									consumed = true;
								}
						}
						break;

					case "F2":

						if (editMode === "editOnF2" || editMode === "editOnKeystrokeOrF2" || editMode === "editOnEnter") {
							this.startEditing();
							consumed = true;
						}
						break;

					case "Home":

						if (e.isCtrlPressed())
							// go to the very first cell.
							this.setFocusedCell(this.getFirstVisibleColumn(), 0, true, false);
						else
							// go to the first cell in the current row.
							this.setFocusedCell(this.getFirstVisibleColumn(), focusedRow, true, false);

						consumed = true;
						break;

					case "End":
						if (e.isCtrlPressed())
							// go to the very last cell.
							this.setFocusedCell(this.getLastVisibleColumn(), this.getRowCount() - 1, true, false);
						else
							// go to the last cell in the current row.
							this.setFocusedCell(this.getLastVisibleColumn(), focusedRow, true, false);

						consumed = true;
						break;

					case "Left":
						this.moveFocusedCell(-1, 0);
						consumed = true;
						break;

					case "Right":
						this.moveFocusedCell(1, 0);
						consumed = true;
						break;

					case "Up":
						this.moveFocusedCell(0, -1);
						consumed = true;
						break;

					case "Down":
						this.moveFocusedCell(0, 1);
						consumed = true;
						break;

					case "PageUp":
					case "PageDown":
						var scroller = this.getPaneScroller(0);
						var direction = (identifier === "PageUp") ? -1 : 1;
						var visibleCount = this.getVisibleRowCount() - 1;
						scroller.setScrollY(scroller.getScrollY() + direction * visibleCount);
						this.moveFocusedCell(0, direction * visibleCount);
						consumed = true;
						break;

					case "Tab":
						this._handleTabKey(e);
						break;

					case "Delete":
						// fire the event only if we don't have a current cell.
						if (focusedCol <= this._rowHeaderColIndex) {
							this.fireDataEvent("deleteRow", focusedRow);
							consumed = true;
						}
						break;

					default:
						if (editMode === "editOnKeystroke" || editMode === "editOnKeystrokeOrF2" || editMode === "editOnEnter") {

							// start editing on valid keystroke.
							if (identifier.length === 1
								&& e.isPrintable()
								&& !e.getDefaultPrevented()
								&& !e.isCtrlPressed()
								&& !e.isMetaPressed()
								&& !e.isAltPressed()) {

								consumed = true;

								var keyCode = e.getKeyCode();
								var keyChar = keyCode > 0 ? String.fromCharCode(keyCode) : "";
								this.startEditing(keyChar);
							}
						}
						break;
				}

				// fire "gridCellKeyPress" when the "keypress" event is not wired
				// to let special cells handle the space and enter and to allow the
				// grid to expand collapse hierarchical rows.
				switch (identifier) {

					case "Space":
					case "Enter":
						if (!this.isWired("keypress"))
							this.fireEvent("gridCellKeyPress");
				}
			}

			// update the selection/focused-cell depending on the keyboard key
			// that may have caused the change.
			//
			if (!this.isEditing()) {
				var notify = false;
				var newFocusedRow, newFocusedCol;
				switch (identifier) {
					case "Left":
					case "Right":
						newFocusedRow = this.getFocusedRow();
						newFocusedCol = this.getFocusedColumn();
						notify = !this.getSelectionManager().handleMoveKeyDown(newFocusedCol, newFocusedRow, e);
						break;

					case "Up":
					case "Down":
					case "PageUp":
					case "PageDown":
						{
							newFocusedRow = this.getFocusedRow();
							newFocusedCol = this.getFocusedColumn();
							notify = !this.getSelectionManager().handleMoveKeyDown(newFocusedCol, newFocusedRow, e);
						}
						break;

					case "Home":
					case "End":
						{
							newFocusedRow = this.getFocusedRow();
							newFocusedCol = this.getFocusedColumn();
							notify = !this.getSelectionManager().handleMoveKeyDown(newFocusedCol, newFocusedRow, e);
						}
						break;

					case "Tab":
						{
							if (!this.isStandardTab()) {
								newFocusedRow = this.getFocusedRow();
								newFocusedCol = this.getFocusedColumn();
								notify = !this.getSelectionManager().handleSelectKeyDown(newFocusedCol, newFocusedRow, e);
							}
						}
						break;
				}
				if (notify && (newFocusedCol != focusedCol || newFocusedRow != focusedRow))
					this.notifyFocusCellChanged(newFocusedCol, newFocusedRow);
			}

			if (consumed)
				e.stop();
		},

		// Determines whether the editor wants the Left or Right keys
		// or the datagrid can move the current cell.
		_canMoveEditingCell: function (editor, key) {

			// verify that the editor allows for text selection methods.
			if (!(editor.getValue
				&& editor.getTextSelectionEnd
				&& editor.getTextSelectionStart
				&& editor.getTextSelectionLength)) {
				return true;
			}

			var text = editor.getValue() || "";

			switch (key) {
				case "Up":
					if (editor.getTextSelectionStart() === null)
						return true;

					if (text.lastIndexOf("\n", editor.getTextSelectionStart() - 1) == -1)
						return true;

					break;

				case "Down":
					if (editor.getTextSelectionStart() === null)
						return true;

					if (text.indexOf("\n", editor.getTextSelectionStart()) == -1)
						return true;

					break;

				case "Left":
					if (editor.getTextSelectionStart() === null)
						return true;

					if (editor.getTextSelectionStart() === 0 && editor.getTextSelectionLength() === 0)
						return true;

					break;

				case "Right":
					if (editor.getTextSelectionStart() === null)
						return true;

					if (editor.getTextSelectionLength() === 0 && editor.getTextSelectionEnd() === text.length)
						return true;

					break;
			}

			return false;
		},

		/**
		 * Stops editing and writes the editor's value to the model.
		 *
		 * @param notify {Boolean ? true} false to suppress sending "endEdit" to the server.
		 */
		stopEditing: function (notify) {

			if (!this.isEditing())
				return;

			this.base(arguments);

			if (this.__canFireServerEvent()) {

				if (notify !== false)
					this.fireEvent("endEdit");
			}

			// update the row to remove the editing state.
			this.updateContent(this.getFocusedRow());
		},

		// Overridden: Fire "cancelEdit" to the server
		cancelEditing: function () {

			if (!this.isEditing())
				return;

			this.base(arguments);

			if (this.__canFireServerEvent()) {
				this.fireEvent("cancelEdit");
			}

			// update the row to remove the editing state.
			this.updateContent(this.getFocusedRow());
		},

		/**
		 * Handles the Tab key.
		 *
		 * Moves the focus to the next cell and then wraps down to the next row.
		 */
		_handleTabKey: function (e) {

			// if the grid is using standardTab mode, let the
			// focus handler handle the tab and move the focus to the next/previous control.
			if (this.isStandardTab()) {

				e.stop();
				this.stopEditing(true /*notify*/);

				var focusMgr = qx.ui.core.FocusHandler.getInstance();
				if (e.isShiftPressed())
					focusMgr.focusPrev(this);
				else
					focusMgr.focusNext(this);

				return;
			}

			var forward = !e.isShiftPressed();
			var row = this.getFocusedRow();
			var col = this.getFocusedColumn();

			// move to the next/previous cell.
			this.moveFocusedCell(forward ? 1 : -1, 0);

			// if the focused cell hasn't changed, we are at the beginning or the ending of the row.
			if (this.getFocusedRow() == row && this.getFocusedColumn() == col) {
				var row = this.getFocusedRow();
				var col = this.getFocusedColumn();
				var tableModel = this.getTableModel();
				var columnModel = this.getTableColumnModel();

				// try to wrap to the next row.
				if (forward && row < tableModel.getRowCount() - 1) {

					// try to wrap to the next row.
					var firstCol = columnModel.getVisibleColumnAtX(this.getRowHeadersVisible() ? 1 : 0);
					if (firstCol != null)
						this.setFocusedCell(firstCol, row + 1, true);
				}
				else if (!forward && row > 0) {

					// try to wrap to the previous row.
					var lastCol = columnModel.getVisibleColumnAtX(columnModel.getVisibleColumnCount() - 1);
					if (lastCol != null)
						this.setFocusedCell(lastCol, row - 1, true);
				}

				// if the focused cell still hasn't changed, we are at the very first or last cell.
				if (this.getFocusedRow() == row && this.getFocusedColumn() == col) {

					if (forward)
						this.fireDataEvent("lastCellTab", col);

					// let the event bubble.
					return;
				}
			}

			e.stop();
		},

		// returns true if the grid can fire the server event.
		__canFireServerEvent: function () {

			// shouldn't fire a server when the change is internal or in design mode.
			if (this.__internalChange || wisej.web.DesignMode)
				return false;

			// shouldn't fire a server event when the change is coming
			// from a server request unless we are processing a deferred call.
			if (!this.__processingPendingCalls && this.core.processingActions)
				return false;

			return true;
		},

		// timer id for the delayed "selectionChanged" event.
		__selectionDelayTimer: 0,

		// timer id for the delayed "focusCellChanged" event.
		__focusChangedDelayTimer: 0,

		/**
		 * Fires the "focusCellChanged" event to the server.
		 * 
		 * @param {Integer} col Column index.
		 * @param {Integer} row Row index.
		 */
		notifyFocusCellChanged: function (col, row) {

			// cancel a previous delayed selection or using the mouse while scrolling
			// with the keyboard may override the mouse selection.
			clearTimeout(this.__selectionDelayTimer);

			var data = { col: col, row: row };

			// use the selection delay only when the selection changed
			// in a keyboard event, otherwise it changes the pointer, selection sequence.
			if (this.getSelectionDelay() > 0 && window.event instanceof KeyboardEvent) {

				var me = this;
				this.__focusChangedDelayTimer = setTimeout(function () {

					if (!me.isDisposed())
						me.fireDataEvent("focusCellChanged", data);

				}, this.getSelectionDelay());
			}
			else {
				this.fireDataEvent("focusCellChanged", data);
			}
		},

		/**
		 * Fires the "selectionChanged" event to the server.
		 * 
		 * @param {Integer} col Column index.
		 * @param {Integer} row Row index.
		 * @param {Array} ranges Selection ranges.
		 */
		notifySelectionChanged: function (col, row, ranges) {

			// cancel a previous delayed selection or using the mouse while scrolling
			// with the keyboard may override the mouse selection.
			clearTimeout(this.__selectionDelayTimer);

			var data = { ranges: ranges, focusCell: { col: col, row: row } };

			if (this.getSelectionDelay() > 0 && window.event instanceof KeyboardEvent) {

				var me = this;
				this.__selectionDelayTimer = setTimeout(function () {

					if (!me.isDisposed())
						me.fireDataEvent("selectionChanged", data);

				}, this.getSelectionDelay());

			}
			else {
				this.fireDataEvent("selectionChanged", data);
			}
		},

		// overridden: fire the selectionChanged event with the new selected rows.
		_onSelectionChanged: function (e) {

			this.base(arguments, e);

			if (this.__canFireServerEvent()) {

				this.notifySelectionChanged(
					this.getFocusedColumn(), this.getFocusedRow(),
					this.getSelectionModel().getSelectionRanges());
			}
		},

		// overridden: fire the colWidthChanged event when the user resizes a column.
		_onColWidthChanged: function (e) {

			this.base(arguments, e);

			if (this.__canFireServerEvent()) {

				var data = e.getData();
				if (data) {

					var column = this.getColumns()[data.col];
					if (column) {

						column.setWidth(data.newWidth);

						// if the column was resized by the user, update the
						// relative fillWeight of the column being resized and
						// then next column in case they are both auto fill columns.

						if (data.isPointerAction) {

							var model = this.getTableColumnModel();

							var col = data.col;
							var newWidth = data.newWidth;
							var oldWidth = data.oldWidth;

							if (column.getSizeMode() === "fill") {
								column.setFillWeight(newWidth / oldWidth * column.getFillWeight());
							}

							// adjust the next fill column, if this is the first iteration of this function.
							if (!this.__resizingSecondFillColumn) {
								var col2 = model.getVisibleColumnAtX(model.getVisibleX(col) + 1);
								if (col2 != null) {

									var column2 = this.getColumns()[col2];
									if (column2.getSizeMode() === "fill") {

										this.__resizingSecondFillColumn = true;
										try {
											// update the width of the related fill column.
											// the fillWeight will be updated on the server
											// when re-entering this method when calling model.setColumnWidth()
											// below with the last argument set to true (pointer event).
											newWidth = model.getColumnWidth(col2) - (newWidth - oldWidth);
											newWidth = Math.max(column2.getMinWidth(), newWidth, 2);
											model.setColumnWidth(col2, newWidth, true);

										} finally {

											this.__resizingSecondFillColumn = false;
										}

									}
								}
							}
						}

						this.fireDataEvent("columnWidthChanged", {
							col: data.col,
							width: data.newWidth,
							isPointerAction: data.isPointerAction
						});

						this.scheduleAutoResize();

						if (this.getHeaderSizeMode() == "autoSize")
							this.scheduleAutoResizeColumnHeaders();
					}
				}
			}
		},

		/** re-entrant flag used by _onColWidthChanged */
		__resizingSecondFillColumn: false,

		// overridden: fire the colPosChanged event when the user moves a column.
		_onColOrderChanged: function (e) {

			this.base(arguments, e);

			if (this.__canFireServerEvent()) {
				var data = e.getData();
				if (data)
					this.fireDataEvent("columnPositionChanged", {
						col: data.col,
						position: data.toOverXPos,
						oldPosition: data.fromOverXPos
					});
			}
			else {
				// update the focus indicator when the column position change
				// is triggered by the app.
				this.updateFocusedCell();
			}
		},

		// overridden: fire the colVisibleChanged event when the user hides/shows a column.
		_onColVisibilityChanged: function (e) {

			if (this.__updateMode)
				return;

			var data = e.getData();
			if (!data)
				return;

			// update the column component.
			var column = this.getColumns()[data.col];
			if (column)
				column.setVisible(data.visible);

			// if the column being hidden/shown is the
			// row header column, we need to change the
			// meta column model as well, or the first visible column
			// will be rendered in the first band.
			if (data.col === this._rowHeaderColIndex) {

				this.setFocusedCell(null, null);
				this.setMetaColumnCounts([0]);
				this._updateMetaColumns();
			}

			// if the column being hidden has a cell in edit mode, cancel editing.
			if (this.getFocusedColumn() === data.col) {

				if (this.isEditing())
					this.cancelEditing();

				this.setFocusedCell(null, null);
			}

			this.base(arguments, e);

			this.scheduleAutoResize();

			if (this.__canFireServerEvent()) {
				this.fireDataEvent("columnVisibilityChanged", { col: data.col, visible: data.visible });
			}
		},

		/**
		 * Synchronizes the position of the columns in the column model with the
		 * value of the position property of each ColumnHeader child.
		 */
		updateColumnsPosition: function () {

			var columns = this.getColumns();
			if (columns == null || columns.length === 0)
				return;

			var columnModel = this.getTableColumnModel();
			if (!columnModel)
				return;

			this.__internalChange++;
			try {

				var newPositions = new Array(columns.length);
				for (var i = 0; i < columns.length; i++) {
					newPositions[columns[i].getPosition()] = i;
				}

				// update all the positions.
				columnModel.setColumnsOrder(newPositions);

			} finally {
				this.__internalChange--;
			}

		},

		// overridden to resize the columns when
		// the scrollbar visibility changes.
		_updateScrollBarVisibility: function () {

			var changed = this.base(arguments);

			if (changed)
				this.scheduleAutoResize();

			return changed;
		},

		/* =======================================================================
		 * AutoSize implementation
		 * =======================================================================*/

		// deferred autoResize methods.
		__autoResizeCall: null,
		__autoResizeColumnHeadersCall: null,

		/**
		 * Schedules the autoresize procedures for the columns and rows.
		 */
		scheduleAutoResize: function () {

			// console.trace("scheduleAutoResize");
			// qx.ui.core.queue.Widget.add(this, "autoResize");

			if (this.__autoResizeCall == null) {
				this.__autoResizeCall = new qx.util.DeferredCall(function () {

					this.autoSizeColumns();
					this.autoSizeRows();

				}, this);
			}
			this.__autoResizeCall.cancel();
			this.__autoResizeCall.schedule();
		},

		/**
		 * Scheduled the autoresize procedure to the column headers height.
		 */
		scheduleAutoResizeColumnHeaders: function () {

			// console.trace("scheduleAutoResizeColumnHeaders");
			// qx.ui.core.queue.Widget.add(this, "autoResizeColumnHeaders");

			if (this.__autoResizeColumnHeadersCall == null) {
				this.__autoResizeColumnHeadersCall = new qx.util.DeferredCall(function () {

					this.autoResizeColumnHeaders();

				}, this);
			}
			this.__autoResizeColumnHeadersCall.cancel();
			this.__autoResizeColumnHeadersCall.schedule();
		},

		/**
		 * Resize the columns width according to the specified parameters.
		 *
		 * @param columnIndex {Integer} Index of the column to resize. -1 for all columns.
		 * @param autoSizeMode {String?} Autosize mode: one of "columnHeader", "allCellsExceptHeader", "allCells", "displayedCellsExceptHeader", "displayedCells".
		 * @param extraSpace {Integer?} Extra space to add in pixels.
		 * @param deferred {Boolean?} Indicates that the call should be deferred until the next data update.
		 */
		autoResizeColumns: function (columnIndex, autoSizeMode, extraSpace, deferred) {

			var columns = this.getColumns();
			if (columns == null || columns.length === 0)
				return;

			if (deferred && !this.__processingPendingCalls) {
				this.__postCall(arguments);
				return;
			}

			extraSpace |= 0;

			var resizeData = [];

			for (var i = 0, l = columns.length; i < l; i++) {


				var column = columns[i];
				var sizeMode = autoSizeMode || column.getSizeMode();

				switch (sizeMode) {

					case "fill":
					case "allCells":
					case "columnHeader":
					case "displayedCells":
					case "allCellsExceptHeader":
					case "displayedCellsExceptHeader":
					case "autoSizeToAllHeaders":
					case "autoSizeToFirstHeader":
					case "autoSizeToDisplayedHeaders":

						if (columnIndex > -1 && columnIndex !== i)
							continue;

						if (!column.isVisible())
							continue;

						if (column.getMinWidth() === column.getMaxWidth())
							continue;

						resizeData.push({
							column: column,
							sizeMode: sizeMode,
							extraSpace: extraSpace,
							colIndex: column.getIndex()
						});

						break;
				}
			}

			if (resizeData.length > 0) {
				//qx.event.Timer.once(function () {

					this.__internalChange++;
					try {
						this.__autoSizeColumns(resizeData);

					} finally {
						this.__internalChange--;
					}

				//}, this, 0);
			}
		},

		/**
		 * Resize the rows height according to the specified parameters.
		 *
		 * @param rowIndex {Integer} Index of the row to resize. -1 for all rows.
		 * @param autoSizeMode {String} Autosize mode: one of "rowHeader", "allCellsExceptHeader", "allCells".
		 * @param extraSpace {Integer} Extra space to add in pixels.
		 * @param deferred {Boolean} Indicates that the call should be deferred until the next data update.
		 */
		autoResizeRows: function (rowIndex, autoSizeMode, extraSpace, deferred) {

			var columns = this.getColumns();
			if (columns == null || columns.length === 0)
				return;

			if (deferred && !this.__processingPendingCalls) {
				this.__postCall(arguments);
				return;
			}

			extraSpace |= 0;

			var resizeData = null;
			var sizeMode = autoSizeMode;
			var rowHeaderColIndex = this._rowHeaderColIndex;

			switch (sizeMode) {

				case "allCells":
					resizeData = {
						sizeMode: sizeMode,
						rowIndex: rowIndex,
						extraSpace: extraSpace,
						colIndex: rowHeaderColIndex
					};
					break;

				case "rowHeader":
					resizeData = {
						sizeMode: sizeMode,
						rowIndex: rowIndex,
						extraSpace: extraSpace,
						colIndex: rowHeaderColIndex,
						maxColumns: 1
					};
					break;

				case "allCellsExceptHeader":
					resizeData = {
						sizeMode: sizeMode,
						rowIndex: rowIndex,
						extraSpace: extraSpace,
						colIndex: rowHeaderColIndex + 1
					};
					break;

				default:
					return;
			}

			if (resizeData) {
				//qx.event.Timer.once(function () {
					this.__autoSizeRows(resizeData);
				//}, this, 0);
			}
		},

		/**
		 * Resize the row headers width according to the specified parameters.
		 *
		 * @param rowIndex {Integer} Index of the row to resize. -1 for all rows.
		 * @param autoSizeMode {String} Autosize mode: one of "autoSizeToAllHeaders", "autoSizeToDisplayedHeaders", "autoSizeToFirstHeader".
		 * @param extraSpace {Integer} Extra space to add in pixels.
		 * @param deferred {Boolean} Indicates that the call should be deferred until the next data update.
		 */
		autoResizeRowHeaders: function (rowIndex, autoSizeMode, extraSpace, deferred) {

			if (this._rowHeaderColIndex !== 0)
				return;

			var columns = this.getColumns();
			if (columns == null || columns.length === 0)
				return;

			if (deferred && !this.__processingPendingCalls) {
				this.__postCall(arguments);
				return;
			}

			this.__internalChange++;
			try {
				var resizeData = [];
				var column = columns[0];
				var sizeMode = autoSizeMode;

				switch (sizeMode) {
					case "autoSizeToAllHeaders":
					case "autoSizeToFirstHeader":
					case "autoSizeToDisplayedHeaders":
						resizeData.push({
							column: column,
							sizeMode: sizeMode,
							rowIndex: rowIndex,
							extraSpace: extraSpace,
							colIndex: column.getIndex()
						});
						break;

					default:
						return;
				}

				this.__autoSizeColumns(resizeData);
			}
			finally {
				this.__internalChange--;
			}
		},

		/**
		 * Resize the column headers's height according to the specified parameters.
		 *
		 * @param columnIndex {Integer} Index of the column to resize. -1 for all columns.
		 * @param deferred {Boolean} Indicates that the call should be deferred until the next data update.
		 */
		autoResizeColumnHeaders: function (columnIndex, deferred) {

			var columns = this.getColumns();
			if (columns == null || columns.length === 0)
				return;

			if (deferred && !this.__processingPendingCalls) {
				this.__postCall(arguments);
				return;
			}

			if (!this.getHeaderCellsVisible())
				return;

			//qx.event.Timer.once(function () {

				this.syncAppearance();
				var oldHeight = this.getHeaderCellHeight();
				var newHeight = qx.util.PropertyUtil.getThemeValue(this, "headerCellHeight") || 0;

				for (var i = 0; i < columns.length; i++) {

					if (columnIndex > -1 && columnIndex !== i)
						continue;
					if (!columns[i].isVisible())
						continue;

					newHeight = Math.max(newHeight, this.__getColumnHeaderSizeHint(columns[i]).height || 0);
				}

				if (newHeight > 0 && newHeight !== oldHeight) {
					this.setHeaderCellHeight(newHeight);
				}

			//}, this, 1);
		},

		/**
		 * Automatically resizes the columns according to the sizeMode property on each column.
		 */
		autoSizeColumns: function () {

			if (!this.getBounds())
				return;

			var columns = this.getColumns();
			if (columns == null || columns.length === 0)
				return;

			var columnModel = this.getTableColumnModel();
			if (!columnModel)
				return;

			this.autoResizeColumns(-1);
		},

		/**
		 * Automatically resizes all the "fill" columns.
		 */
		autoSizeFillColumns: function () {

			if (!this.getBounds())
				return;

			var columns = this.getColumns();
			if (columns == null || columns.length === 0)
				return;

			var columnModel = this.getTableColumnModel();
			if (!columnModel)
				return;

			// we auto resize non-frozen columns in the main pane only.
			var scrollerArr = this._getPaneScrollerArr();
			var mainPane = scrollerArr[scrollerArr.length - 1];
			var firstColX = mainPane.getTablePaneModel().getFirstColumnX();

			// get the width of the header pane. that's the width we have to fill.
			var mainPaneSize = mainPane._paneClipper.getInnerSize();
			if (mainPaneSize == null)
				return;

			// calculate the total fill weight of the "fill" columns and collect the columns to auto fill and the ones to auto size.
			var otherColumns = [];
			var autoFillColumns = [];
			for (var x = firstColX; x < columns.length; x++) {

				var column = columns[columnModel.getVisibleColumnAtX(x)];

				if (column && column.isVisible()) {

					switch (column.getSizeMode()) {
						case "fill":
							autoFillColumns.push(column);
							break;

						default:
							otherColumns.push(column);
							break;
					}
				}
			}

			this.__internalChange++;
			try {

				var availableWidth = mainPaneSize.width;

				// adjust the available width deducting all visible columns.
				for (var i = 0, l = otherColumns.length; i < l; i++) {
					var colIndex = otherColumns[i].getIndex();
					availableWidth -= columnModel.getColumnWidth(colIndex);
				}

				// auto size fill columns based on weight.
				this.__autoSizeFillColumns(autoFillColumns, columnModel, availableWidth);
			}
			finally {

				this.__internalChange--;
			}
		},

		/**
		 * Automatically resizes all displayed rows according to the autoSizeRowsMode property.
		 */
		autoSizeRows: function () {

			var sizeMode = this.getAutoSizeRowsMode();
			if (sizeMode !== "none" && sizeMode !== "doubleClick") {

				this.autoResizeRows(-1, sizeMode);
			}
		},

		// auto size columns with based on content.
		__autoSizeColumns: function (resizeData) {

			var columns = this.getColumns();
			var dataModel = this.getTableModel();
			var columnModel = this.getTableColumnModel();
			var columnHeadersVisible = this.getHeaderCellsVisible();

			// don't autoresize if there is a pending data request
			// when the data comes in it will trigger another auto resize.
			if (dataModel.isLoading())
				return;

			// resize the columns according to the size mode property.
			for (var i = 0, length = resizeData.length; i < length; i++) {

				var resizeItem = resizeData[i];
				if (resizeItem.colIndex < 0)
					continue;

				var hasAutofillColumns = false;
				var newWidth = 0, measuredWidth = 0, hintWidth = 0;
				var oldWidth = columnModel.getColumnWidth(resizeItem.colIndex);

				switch (resizeItem.sizeMode) {

					case "fill":
						hasAutofillColumns = true;
						break;

					case "columnHeader":
						measuredWidth = hintWidth = columnHeadersVisible ? this.__getColumnHeaderSizeHint(resizeItem.column).width : 0;
						break;

					case "allCells":
						measuredWidth = this.__getMaxCellSize(resizeItem.colIndex, -1, columnModel, dataModel).width;
						hintWidth = columnHeadersVisible ? this.__getColumnHeaderSizeHint(resizeItem.column).width : measuredWidth;
						break;

					case "displayedCells":
						measuredWidth = this.__getMaxDisplayedCellSize(resizeItem.colIndex, -1, columnModel, dataModel).width;
						hintWidth = columnHeadersVisible ? this.__getColumnHeaderSizeHint(resizeItem.column).width : measuredWidth;
						break;

					case "allCellsExceptHeader":
						measuredWidth = this.__getMaxCellSize(resizeItem.colIndex, -1, columnModel, dataModel).width;
						break;

					case "displayedCellsExceptHeader":
						measuredWidth = this.__getMaxDisplayedCellSize(resizeItem.colIndex, -1, columnModel, dataModel).width;
						break;

					case "autoSizeToAllHeaders":
						measuredWidth = this.__getMaxCellSize(resizeItem.colIndex, resizeItem.rowIndex, columnModel, dataModel).width;
						break;

					case "autoSizeToFirstHeader":
						measuredWidth = this.__getMaxDisplayedCellSize(resizeItem.colIndex, 0, columnModel, dataModel, 1).width;
						break;

					case "autoSizeToDisplayedHeaders":
						measuredWidth = this.__getMaxDisplayedCellSize(resizeItem.colIndex, resizeItem.rowIndex, columnModel, dataModel).width;
						break;
				}

				newWidth = Math.max(measuredWidth, hintWidth);
				newWidth += (resizeItem.extraSpace | 0);

				if (resizeItem.column.getMinWidth())
					newWidth = Math.max(newWidth, resizeItem.column.getMinWidth());
				if (resizeItem.column.getMaxWidth())
					newWidth = Math.min(newWidth, resizeItem.column.getMaxWidth());

				if (newWidth !== oldWidth && newWidth > 0) {

					resizeItem.column.setWidth(newWidth);

					// columnModel.setColumnWidth(resizeItem.colIndex, newWidth, false);

					this.fireDataEvent("columnWidthChanged", {
						col: resizeItem.colIndex,
						width: newWidth,
						isPointerAction: false
					});
				}
			}

			// after resizing the non-fill columns, do the fill columns.
			if (hasAutofillColumns)
				this.autoSizeFillColumns();
		},

		// auto size rows height based on content.
		__autoSizeRows: function (resizeData) {

			// resizeData: {sizeMode, rowIndex, colIndex, maxColumns}

			var changed = false;
			var dataModel = this.getTableModel();
			var rowRenderer = this.getDataRowRenderer();
			var columnModel = this.getTableColumnModel();

			var colIndex = resizeData.colIndex;
			var rowIndex = resizeData.rowIndex;

			if (rowIndex > -1) {

				var newHeight = 0;
				var oldHeight = dataModel.getRowHeight(rowIndex);
				var minRowHeight = dataModel.getMinRowHeight(rowIndex);
				var maxRowHeight = dataModel.getMaxRowHeight(rowIndex);

				if (minRowHeight === maxRowHeight)
					return;

				var rowData = dataModel.getRowData(rowIndex);
				if (rowData == null && !this.__processingPendingCalls) {
					this.__postCall(arguments);
					dataModel.prefetchRows(rowIndex, rowIndex);
					return;
				}

				var count = resizeData.maxColumns > 0
					? resizeData.maxColumns
					: columnModel.getOverallColumnCount();

				var rowInsets = rowRenderer.getInsets({ table: this, row: rowIndex, rowData: rowData });

				for (var i = colIndex; i < count; i++) {

					if (!columnModel.isColumnVisible(i))
						continue;

					newHeight = Math.max(newHeight, this.__getMaxCellSize(i, rowIndex, columnModel, dataModel).height);
					if (newHeight)
						newHeight += rowInsets.top + rowInsets.bottom + resizeData.extraSpace;
				}

				if (minRowHeight)
					newHeight = Math.max(newHeight, minRowHeight);
				if (maxRowHeight)
					newHeight = Math.min(newHeight, maxRowHeight);

				if (newHeight > 0 && newHeight !== oldHeight) {
					changed = true;
					dataModel.setRowHeight(rowIndex, newHeight, false);
				}
			}
			else {
				this.__updateMode = true;
				try {
					dataModel.iterateCachedRows(function (rowIndex, rowData) {

						if (rowData.newRow)
							return;

						var newHeight = 0;
						var oldHeight = dataModel.getRowHeight(rowIndex);
						var minRowHeight = dataModel.getMinRowHeight(rowIndex);
						var maxRowHeight = dataModel.getMaxRowHeight(rowIndex);

						if (minRowHeight === maxRowHeight)
							return;

						var count = resizeData.maxColumns > 0
							? resizeData.maxColumns
							: columnModel.getOverallColumnCount();

						var rowInsets = rowRenderer.getInsets({ table: this, row: rowIndex, rowData: rowData });

						for (var i = colIndex; i < count; i++) {

							if (!columnModel.isColumnVisible(i))
								continue;

							newHeight = Math.max(newHeight, this.__getMaxCellSize(i, rowIndex, columnModel, dataModel).height);
							if (newHeight)
								newHeight += rowInsets.top + rowInsets.bottom + resizeData.extraSpace;
						}

						if (minRowHeight)
							newHeight = Math.max(newHeight, minRowHeight);
						if (maxRowHeight)
							newHeight = Math.min(newHeight, maxRowHeight);

						if (newHeight > 0 && newHeight !== oldHeight) {
							changed = true;
							dataModel.setRowHeight(rowIndex, newHeight, false);
						}

					}, this);
				}
				finally {
					this.__updateMode = false;

					if (changed)
						this._onTableModelRowHeightChanged();
				}
			}
		},

		// returns the calculate maximum size (width, height) of all the rendered cells in the column.
		__getMaxDisplayedCellSize: function (col, row, columnModel, dataModel, maxRows) {

			var maxSize = { width: 0, height: 0 };
			var renderer = columnModel.getDataCellRenderer(col);

			var colIndex = col;
			var rowIndex = (row > -1) ? row : this.getFirstVisibleRow();
			var count = (maxRows > 0) ? maxRows : this.getVisibleRowCount();

			while (count > 0) {

				var value = dataModel.getValue(colIndex, rowIndex);
				if (value !== null && value !== undefined) {

					var cellInfo = {
						col: colIndex,
						row: rowIndex,
						table: this,
						value: value,
						columnModel: columnModel,
						rowData: dataModel.getRowData(rowIndex)
					};

					var cellSize = renderer.getCellSize(cellInfo);
					if (cellSize) {
						maxSize.width = Math.max(maxSize.width, cellSize.width);
						maxSize.height = Math.max(maxSize.height, cellSize.height);
					}
				}

				count--;
				rowIndex++;
			}

			return maxSize;
		},

		// returns the calculate maximum size (width, height) of all the cells in the data model cache for the column.
		__getMaxCellSize: function (col, row, columnModel, dataModel) {

			var maxSize = { width: 0, height: 0 };
			var renderer = columnModel.getDataCellRenderer(col);

			var colIndex = col;
			var rowIndex = row;

			if (rowIndex > -1) {

				// auto-resize a row.

				var value = dataModel.getValue(colIndex, rowIndex);
				if (value !== null && value !== undefined) {

					var scroller = this.getPaneScroller(this._getMetaColumnAtColumnX(col));

					var cellInfo = {
						col: colIndex,
						row: rowIndex,
						table: this,
						value: value,
						scroller: scroller,
						columnModel: columnModel,
						xPos: columnModel.getVisibleX(colIndex),
						rowData: dataModel.getRowData(rowIndex),
						columnWidth: columnModel.getColumnWidth(colIndex)
					};

					var cellSize = renderer.getCellSize(cellInfo);
					if (cellSize)
						maxSize = cellSize;
				}
			}
			else if (colIndex > -1) {

				// auto-resize a column.

				dataModel.iterateCachedRows(function (rowIndex, rowData) {

					var value = rowData.data ? rowData.data[colIndex] : null;
					if (value !== null && value !== undefined) {

						var cellInfo = {
							col: colIndex,
							row: rowIndex,
							table: this,
							value: value,
							columnModel: columnModel,
							rowData: rowData
						};

						var cellSize = renderer.getCellSize(cellInfo);
						if (cellSize) {
							maxSize.width = Math.max(maxSize.width, cellSize.width);
							maxSize.height = Math.max(maxSize.height, cellSize.height);
						}
					}

				}, this);
			}

			return maxSize;
		},

		// returns the recalculated size of the column header.
		__getColumnHeaderSizeHint: function (column) {

			var headerCell = column.getHeaderWidget();
			headerCell.syncAppearance();

			headerCell.invalidateLayoutChildren();
			var contentHint = headerCell._getContentHint();

			var insets = headerCell.getInsets();
			contentHint.width += insets.left + insets.right;
			contentHint.height += insets.top + insets.bottom;

			return contentHint;
		},

		// auto size columns based on fill weight.
		__autoSizeFillColumns: function (columns, columnModel, availableWidth) {

			// calculate the total fill weight.
			var totalFillWeight = 0;
			for (var i = 0, length = columns.length; i < length; i++) {
				totalFillWeight += columns[i].getFillWeight();
			}
			if (totalFillWeight <= 0)
				return;

			// resize the columns according to their weight and minimum size.
			var usedWidth = 0;
			for (var i = 0, length = columns.length; i < length; i++) {

				var column = columns[i];
				var colIndex = column.getIndex();

				if (colIndex < 0)
					continue;

				var weight = column.getFillWeight() / totalFillWeight;
				var oldWidth = columnModel.getColumnWidth(colIndex);
				var newWidth = Math.min(Math.max(availableWidth * weight, column.getMinWidth()), column.getMaxWidth()) | 0;

				usedWidth += newWidth;

				// use the remainder.
				if (i === length - 1) {
					newWidth = Math.min(Math.max(newWidth + (availableWidth - usedWidth), column.getMinWidth()), column.getMaxWidth());
				}

				if (newWidth !== oldWidth && newWidth > 0) {

					column.setWidth(newWidth);

					this.fireDataEvent("columnWidthChanged", {
						col: colIndex,
						width: newWidth,
						isPointerAction: false
					});
				}
			}
		},

		// Returns a style string that represents the current font.
		_getFontStyle: function () {

			var font = this.getFont();
			if (font !== this.__cachedFont) {
				this.__cachedFont = font;

				var styles;
				if (font)
					styles = qx.theme.manager.Font.getInstance().resolve(font).getStyles();
				else
					styles = qx.bom.Font.getDefaultStyles();

				this.__cachedFontStyle = qx.bom.element.Style.compile(styles);
			}

			return this.__cachedFontStyle;
		},
		__cachedFont: null,
		__cachedFontStyle: null,

		/* =======================================================================
		 * End AutoSize implementation
		 * =======================================================================*/

		/**
		 * Reorders all columns to new overall positions. Will fire one "orderChanged" event
		 * without data afterwards
		 *
		 * @param newPositions {Integer[]} Array mapping the index of a column in table model to its wanted overall
		 *                            position on screen (both zero based). If the table models holds
		 *                            col0, col1, col2 and col3 and you give [1,3,2,0], the new column order
		 *                            will be col3, col0, col2, col1
		 */
		setColumnsOrder: function (newPositions) {

			if (newPositions) {

				// update the position of the columns accounting for the row header at position 0.
				if (this.getRowheadersVisible()) {

					for (var i = 0; i < newPositions.length; i++) {
						newPositions[i]++;
					}

					// insert the position of the row header, which is always 0.
					newPositions.splice(0, 0, 0);
				}

				// update the position of the columns.
				this.getTableColumnModel().setColumnsOrder(newPositions);
			}

		},

		/**
		  * Moves the focus cell.
		  *
		  * @param deltaX {Integer} The delta by which the focus should be moved on the x axis.
		  * @param deltaY {Integer} The delta by which the focus should be moved on the y axis.
		  */
		moveFocusedCell: function (deltaX, deltaY) {

			if (!deltaX && !deltaY)
				return;

			var prevRow = this.getFocusedRow();
			var prevCol = this.getFocusedColumn();
			var tableModel = this.getTableModel();
			var columnModel = this.getTableColumnModel();
			var colCount = columnModel.getVisibleColumnCount();

			// if tabbing in when there is no current cell, default to the first cell.
			var row = prevRow;
			if (row == null) {
				row = 0;
				deltaX = 0;
				deltaY = 0;
			}
			var col = prevCol;
			if (col == null) {
				col = 0;
			}

			var x = columnModel.getVisibleX(col);
			if (x < 0 || x >= colCount)
				return;

			// rtl?
			if (this.isRtl())
				deltaX = deltaX * -1;

			x = Math.min(x + deltaX, colCount - 1);
			col = columnModel.getVisibleColumnAtX(x);
			row = Math.min(row + deltaY, tableModel.getRowCount() - 1);

			// don't move to or past the row header column (0).
			if (deltaX && (col <= this._rowHeaderColIndex || col == null))
				return;

			// don't move past the first cell
			if (row < 0 || row == null)
				return;

			this.setFocusedCell(col, row, true /*scrollVisible*/, false);
		},

		/**
		 * Scrolls a cell visible.
		 *
		 * @param col {Integer} the model index of the column the cell belongs to.
		 * @param row {Integer} the model index of the row the cell belongs to.
		 * @param alignX {String?null} Alignment of the item. Allowed values:
		 *   <code>left</code> or <code>right</code>. Could also be null.
		 *   Without a given alignment the method tries to scroll the widget
		 *   with the minimum effort needed.
		 * @param alignY {String?null} Alignment of the item. Allowed values:
		 *   <code>top</code> or <code>bottom</code>. Could also be null.
		 *   Without a given alignment the method tries to scroll the widget
	     *   with the minimum effort needed.
		 */
		scrollCellVisible: function (col, row, alignX, alignY) {

			// store the call for a deferred call, after the data is loaded.
			if (row != null && col != null && row >= this.getRowCount()) {
				this.__postCall(arguments);
				return;
			}

			if (row < 0)
				row = this.getFocusedRow();
			if (col === null || col < 0)
				return;

			// get the dom element
			var elem = this.getContentElement().getDomElement();
			// if the dom element is not available, the table hasn't been rendered
			if (!elem) {
				// postpone the scroll until the table has appeared
				this.addListenerOnce("appear", function () {
					this.scrollCellVisible(col, row);
				}, this);
			}

			qx.event.Timer.once(function () {

				var columnModel = this.getTableColumnModel();
				if (col >= columnModel.getOverallColumnCount())
					return;

				var x = columnModel.getVisibleX(col);
				var metaColumn = this._getMetaColumnAtColumnX(x);
				if (metaColumn != -1) {
					this.getPaneScroller(metaColumn).scrollCellVisible(col, row, alignX, alignY);
				}
			}, this, 1);
		},

		/**
		 * Sets the currently focused cell. A value of <code>null</code> hides the
		 * focus cell.
		 *
		 * @param col {Integer?null} the model index of the focused cell's column.
		 * @param row {Integer?null} the model index of the focused cell's row.
		 * @param scrollVisible {Boolean?false} whether to scroll the new focused cell visible.
		 * @param notify {Boolean?true} false to suppress sending the "focusCellChanged" event to the server.
		 * @param startEditing {Boolean?} true to start editing the cell being focused, otherwise checks editMode.
		 */
		setFocusedCell: function (col, row, scrollVisible, notify, startEditing) {

			// defaults.
			notify = notify === false ? false : true;
			scrollVisible = scrollVisible === true ? true : false;
			startEditing = startEditing === undefined ? this.getEditMode() === "editOnEnter" : startEditing;

			var focusedRow = this.getFocusedRow();
			var focusedColumn = this.getFocusedColumn();

			if (row < 0)
				row = null;

			if (col <= this._rowHeaderColIndex)
				col = null;

			if (col === focusedColumn && row === focusedRow) {
				if (scrollVisible && row != null) {
					this.scrollCellVisible(col || 0, row);
				}
				return;
			}

			// terminate edit mode if changing the focused cell while editing
			// without notifying the server (the false argument).
			// we'll fire "focusCellChanged" instead.
			if (this.isEditing()) {
				this.stopEditing(false /*notify*/);
			}

			// defer the call after the data is loaded.
			if (row != null && col != null && row >= this.getRowCount()) {
				this.__postCall(arguments);
				return;
			}

			// make sure we are within the limits.
			var columnModel = this.getTableColumnModel();
			if (col != null && col >= columnModel.getOverallColumnCount())
				col = null;

			this.base(arguments, col, row, false /* scrollVisible */);

			if (scrollVisible && row != null) {
				this.scrollCellVisible(col || 0, row);
			}

			if (this.__canFireServerEvent() && notify) {
				this.notifyFocusCellChanged(col, row);
			}

			// start editing on enter, when focused.
			if (!this.__internalChange && col != null && row != null && startEditing) {

				// start this after a delay to prevent the widget from
				// generating a train of events when the user rapidly
				// moves from cell to cell.

				var me = this;
				clearTimeout(this.__startEditingTimer);
				this.__startEditingTimer = setTimeout(function () {

					me.__startEditingTimer = 0;

					if (!me.isDisposed() && me._isFocused()) {
						me.startEditing();
					}

				}, wisej.web.DataGrid.STARTEDITING_DELAY);
			}
		},

		/**
		 * Updates the position of the focus indicator.
		 */
		updateFocusedCell: function () {

			var scrollerArr = this._getPaneScrollerArr();
			for (var i = 0; i < scrollerArr.length; i++) {
				scrollerArr[i]._updateFocusIndicator();
			}
		},

		/**
		 * Starts editing the currently focused cell. Does nothing if already editing
		 * or if the column is not editable.
		 *
		 * @param text {String} the text to initialize the editor with.
		 * @param col {Integer?null} the model index of the focused cell's column.
		 * @param row {Integer?null} the model index of the focused cell's row.
		 * @param force {Boolean?null} true when edit mode must be started instead of requested.
		 * @return {Boolean} whether editing was started or not.
		 */
		startEditing: function (text, col, row, force) {

			if (!this.isVisible())
				return false;

			// defer the call after the data is loaded.
			if (row != null && col != null && row >= this.getRowCount()) {
				this.__postCall(arguments);
				return false;
			}

			// update the focused cell, if the coordinates have been specified.
			if (force == true && col != null && row != null) {
				this.__internalChange++;
				this.setFocusedCell(col, row, true);
				this.__internalChange--;
			}

			var focusedRow = this.getFocusedRow();
			var focusedColumn = this.getFocusedColumn();

			// ensure that the current cell has not changed, otherwise abort - it means
			// the user tabbed out before we could initiate edit mode.
			if ((force != true) &&
				(col != null && row != null) &&
				(col != focusedColumn || row != focusedRow) &&
				(focusedColumn != null && focusedRow != null)) {

				this.core.logInfo("Edit mode not started: the current cell doesn't match the cell entering edit mode.");
				return false;
			}

			if (focusedColumn > this._rowHeaderColIndex && focusedRow > -1) {

				if (this.isCellEditable(focusedColumn, focusedRow)) {

					var x = this.getTableColumnModel().getVisibleX(focusedColumn);
					var metaColumn = this._getMetaColumnAtColumnX(x);
					var force = (col != null && row != null);

					// pre-empt any pending request to start editing or the edit cell may jump back.
					if (force)
						clearTimeout(this.__startEditingTimer);

					return this.getPaneScroller(metaColumn).startEditing(text || "", force);
				}
			}

			return false;
		},

		/**
		 * Returns the current cell editor, if the table is in edit mode.
		 *
		 * @return {qx.ui.core.Widget} the widget being used to edit the current cell.
		 */
		getCellEditor: function () {

			var col = this.getFocusedColumn();
			if (col != null) {

				// may have zero columns.
				if (this.getTableColumnModel().getVisibleColumnCount() == 0)
					return null;

				var x = this.getTableColumnModel().getVisibleX(col);

				// the column may be hidden.
				if (x == null)
					return null;

				var metaColumn = this._getMetaColumnAtColumnX(x);
				return this.getPaneScroller(metaColumn)._cellEditor;
			}

			return null;
		},

		/**
		 * Checks whether a cell is editable.
		 * @param col {Integer} column index.
		 * @param row {Integer} row index.
		 * @return {Boolean} true if the cell is editable.
		 */
		isCellEditable: function (col, row) {

			var editable = false;
			if (col > -1 && row > -1) {
				var tableModel = this.getTableModel();

				editable = tableModel.isColumnEditable(col);

				// check if the cell has the editable override.
				var cellStyle = tableModel.getCellStyle(col, row);
				if (cellStyle && cellStyle.editable != null) {
					editable = editable || cellStyle.editable;
				}
			}

			return editable;
		},

		// checks whether the datagrid has the focus.
		_isFocused: function () {
			return this.isEditing()
				|| this.hasState("focused")
				|| qx.ui.core.FocusHandler.getInstance().getFocusedWidget() === this;
		},

		/**
		 * Initialize the column menu
		 *
		 * Overridden to omit columns with showInMenu = false.
		 */
		_initColumnMenu: function () {

			var tableModel = this.getTableModel();
			var columnModel = this.getTableColumnModel();
			var columnButton = this.getChildControl("column-button");

			// remove all items from the menu. We'll rebuild it here.
			columnButton.empty();

			// inform listeners who may want to insert menu items at the beginning
			var menu = columnButton.getMenu();
			var data =
			{
				table: this,
				menu: menu,
				columnButton: columnButton
			};
			this.fireDataEvent("columnVisibilityMenuCreateStart", data);

			this.__columnMenuButtons = {
			};

			var columnHeaders = this.getColumns();
			for (var col = 0, l = tableModel.getColumnCount(); col < l; col++) {

				// skip excluded columns.
				if (columnHeaders[col].getShowInMenu() === false || col == this._rowHeaderColIndex)
					continue;

				var menuButton =
					columnButton.factory(
						"menu-button", {
							text: tableModel.getColumnName(col),
							column: col,
							bVisible: columnModel.isColumnVisible(col)
						});

				qx.core.Assert.assertInterface(menuButton, qx.ui.table.IColumnMenuItem);

				menuButton.addListener(
					"changeVisible",
					this._createColumnVisibilityCheckBoxHandler(col), this);

				this.__columnMenuButtons[col] = menuButton;
			}

			// Inform listeners who may want to insert menu items at the end
			data =
				{
					table: this,
					menu: menu,
					columnButton: columnButton
				};
			this.fireDataEvent("columnVisibilityMenuCreateEnd", data);
		},

		// add the "inner" state to child controls added to the grid.
		_afterAddChild: function (child) {
			if (child.isWisejControl) {
				child.addState("inner");
			}
		},

		// remove the "inner" state to child controls removed from the grid.
		_afterRemoveChild: function (child) {
			if (child.isWisejControl) {
				child.removeState("inner");
			}
		},

		// overridden
		renderLayout: function (left, top, width, height) {

			this.base(arguments, left, top, width, height);

			// if the no-data message is visible, locate exactly
			// under the column headers to fill the row area.
			var message = this.getChildControl("no-data", true);
			if (message) {

				top = 0;
				left = 0;

				if (this.isHeaderCellsVisible()) {
					var headerHeight = this.getHeaderCellHeight();
					top += headerHeight;
					height -= headerHeight;
				}
				message.setUserBounds(left, top, width, height);
			}
		},

		/**
		 * Handles the "Enter" accelerator to terminate edit mode.
		 */
		__onEnter: function (e) {

			if (!this.isEditing() || !this._isFocused())
				return;

			this.stopEditing(true /*notify*/);
			return true;
		},

		/**
		 * Handles the "Enter" accelerator to cancel edit mode.
		 */
		__onEscape: function (e) {

			if (!this.isEditing() || !this._isFocused())
				return;

			this.cancelEditing();
			return true;
		},

		// overridden: display the grid's context menu
		// all the times, on any right-click or long-tap.
		_onContextMenuOpen: function (e) {

			// only allow long tap context menu on touch interactions
			if (e.getType() == "longtap") {
				if (e.getPointerType() !== "touch") {
					return;
				}
			}

			// don't open empty context menus.
			if (!this.getContextMenu().hasChildren()) {
				e.stop();
				return;
			}

			this.getContextMenu().openAtPointer(e);

			// do not show native menu
			// don't open any other context menu.
			e.stop();
		},

		// determines the target cell (col, row) for a drag operation
		// and adds it to the event object.
		_onDragEvent: function (e) {

			e.setUserData("eventData", null);

			var pageX = e.getDocumentLeft();
			var pageY = e.getDocumentTop();

			var scrollerArr = this._getPaneScrollerArr();
			for (var i = 0; i < scrollerArr.length; i++) {
				var col = scrollerArr[i]._getColumnForPageX(pageX);
				var row = scrollerArr[i]._getRowForPagePos(pageX, pageY);
				if (col != null && row != null) {
					e.setUserData("eventData", { col: col, row: row });
					break;
				}
			}
		},

		// overridden to delay the "render" event to give a chance
		// to the designer to pick the correct rendered control.
		_onDesignRender: function () {

			this.autoSizeColumns();
			this.fireEvent("render");

		},

		/**
		 * getDesignMetrics
		 *
		 * Method used by the designer to retrieve metrics information about a widget in design mode.
		 */
		getDesignMetrics: function () {

			return {
				scrollX: this.getScrollX()
			};
		},

		/**
		 * Updates the metrics on the server.
		 */
		__onToolsResize: function (e) {

			if (!wisej.web.DesignMode) {

				// need to get the exact bounds of the tools container
				// in order to correctly apply the HitTest method.
				var tools = this.getChildControl("tools", true);
				if (tools) {
					this.fireDataEvent("updateMetrics", {
						toolsBounds: tools.getBounds()
					});
				}
			}
		},

		// ----------------------------------------------------------------
		// Binding of two related grids.
		// ----------------------------------------------------------------

		/**
		 * Binds the grid to another to keep the columns and scrolling in sync.
		 */
		bindToGrid: function (mainGrid, syncVerticalScrollbar) {

			mainGrid = this._transformComponent(mainGrid);
			if (!mainGrid)
				return;

			var updating = false;
			var childGrid = this;

			mainGrid.setUserData("otherGrid", this);

			// horizontal scrolling.
			mainGrid.addListener("scroll", function (e) {

				try {
					var data = e.getData();
					if (childGrid && !childGrid.isDisposed() && data.scrollX !== undefined) {
						var scrollers = childGrid._getPaneScrollerArr();
						for (var i = 0; i < scrollers.length; i++) {
							scrollers[i].setScrollX(data.scrollX);
						}
					}
				}
				catch (err) { }

			});
			childGrid.addListener("scroll", function (e) {

				try {
					var data = e.getData();
					if (mainGrid && !mainGrid.isDisposed() && data.scrollX !== undefined) {
						var scrollers = mainGrid._getPaneScrollerArr();
						for (var i = 0; i < scrollers.length; i++) {
							scrollers[i].setScrollX(data.scrollX);
						}
					}
				}
				catch (err) { }

			});

			// moving columns.
			mainGrid.addListener("columnPositionChanged", function (e) {

				if (updating)
					return;

				updating = true;
				try {
					var data = e.getData();
					if (childGrid && !childGrid.isDisposed()) {
						childGrid.getTableColumnModel().moveColumn(data.oldPosition, data.position);
					}
				}
				catch (err) { }
				updating = false;
			});
			childGrid.addListener("columnPositionChanged", function (e) {

				if (updating)
					return;

				updating = true;
				try {
					var data = e.getData();
					if (!mainGrid.isDisposed()) {
						mainGrid.getTableColumnModel().moveColumn(data.oldPosition, data.position);
					}
				}
				catch (err) { }
				updating = false;
			});

			// resizing columns.
			mainGrid.addListener("columnWidthChanged", function (e) {

				try {
					var data = e.getData();
					if (childGrid && !childGrid.isDisposed()) {
						childGrid.getTableColumnModel().setColumnWidth(data.col, data.width);
					}
				}
				catch (err) { }

			});
			childGrid.addListener("columnWidthChanged", function (e) {

				try {
					var data = e.getData();
					if (!mainGrid.isDisposed()) {
						mainGrid.getTableColumnModel().setColumnWidth(data.col, data.width);
					}
				}
				catch (err) { }

			}, this);

			// hiding/showing columns.
			mainGrid.addListener("columnVisibilityChanged", function (e) {

				if (updating)
					return;

				updating = true;
				try {
					var data = e.getData();
					if (childGrid && !childGrid.isDisposed()) {
						childGrid.getTableColumnModel().setColumnVisible(data.col, data.visible);
					}
				}
				catch (err) { }
				updating = false;
			});
			childGrid.addListener("columnVisibilityChanged", function (e) {

				if (updating)
					return;

				updating = true;
				try {
					var data = e.getData();
					if (!mainGrid.isDisposed()) {
						mainGrid.getTableColumnModel().setColumnVisible(data.col, data.visible);
					}
				}
				catch (err) { }
				updating = false;
			});

			// selection and current cell.
			mainGrid.addListener("selectionChanged", function (e) {

				if (updating)
					return;

				updating = true;
				try {
					if (childGrid && !childGrid.isDisposed()) {
						childGrid.setFocusedCell(null, null);
						childGrid.setSelectionRanges(null);
					}
				}
				catch (err) { }
				updating = false;
			});
			childGrid.addListener("selectionChanged", function (e) {

				if (updating)
					return;

				updating = true;
				try {
					if (!mainGrid.isDisposed()) {
						mainGrid.setFocusedCell(null, null);
						mainGrid.setSelectionRanges(null);
					}
				}
				catch (err) { }
				updating = false;
			});

			// vertical scrollbar visibility.
			if (syncVerticalScrollbar) {
				childGrid.addListener("verticalScrollBarChanged", function (e) {
					mainGrid.setUserData("verNeeded", e.getData());
					qx.ui.core.queue.Widget.add(mainGrid, "syncVerticalScrollBars");
				});
				mainGrid.addListener("verticalScrollBarChanged", function (e) {
					childGrid.setUserData("verNeeded", e.getData());
					qx.ui.core.queue.Widget.add(mainGrid, "syncVerticalScrollBars");
				});
				childGrid.addListener("horizontalScrollBarChanged", function (e) {
					qx.ui.core.queue.Widget.add(mainGrid, "syncVerticalScrollBars");
				});
				mainGrid.addListener("horizontalScrollBarChanged", function (e) {
					qx.ui.core.queue.Widget.add(mainGrid, "syncVerticalScrollBars");
				});
			}
		},

		/**
		 * Shows the vertical scrollbar when the other grid also shows the vertical scrollbar.
		 */
		syncVerticalScrollBars: function () {

			var otherGrid = this.getUserData("otherGrid");

			if (otherGrid && !otherGrid.isDisposed()) {
				var visible =
					this.getUserData("verNeeded") === true ||
					otherGrid.getUserData("verNeeded") === true;

				this.setVerticalScrollBarVisible(visible);
				otherGrid.setVerticalScrollBarVisible(visible);
			}
		},

		/**
		 * Returns whether the vertical scrollbar is visible.
		 */
		isVerticalScrollBarVisible: function () {

			var scrollerArr = this._getPaneScrollerArr();
			if (scrollerArr.length > 0)
				return scrollerArr[scrollerArr.length - 1].getVerticalScrollBarVisible();

			return false;
		},

		/**
		 * Sets the visibility of the vertical scrollbar.
		 */
		setVerticalScrollBarVisible: function (visible) {

			// the vertical scrollbar is shown only on the last pane.
			var scrollerArr = this._getPaneScrollerArr();
			if (scrollerArr.length > 0) {
				scrollerArr[scrollerArr.length - 1].setVerticalScrollBarVisible(visible);
			}
		}
	},

	destruct: function () {

		// destroy the existing instances of ColumnHeader.
		var headers = this.getColumns();
		if (headers) {
			for (var i = 0; i < headers.length; i++) {
				headers[i].dispose();
			}
		}

		clearTimeout(this.__selectionDelayTimer);
		clearTimeout(this.__focusChangedDelayTimer);

		// clear deferred calls.
		if (this.__autoResizeCall)
			this.__autoResizeCall.cancel();
		if (this.__autoResizeColumnHeadersCall)
			this.__autoResizeColumnHeadersCall.cancel();

		// un-register the Enter or Esc accelerators.
		wisej.web.manager.Accelerators.getInstance().unregister("Enter", this.__onEnterHandler, null, "keypress");
		wisej.web.manager.Accelerators.getInstance().unregister("Escape", this.__onEscapeHandler, null, "keypress");
	}

});