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

	construct: function (dataModel) {

		// use our data model.
		this.base(arguments, dataModel || new wisej.web.datagrid.DataModel());

		// add local state properties.
		this.setStateProperties(this.getStateProperties().concat(["firstVisibleRow", "firstVisibleColumn", "visibleRowCount"]));

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
		for (var i = 0; i < children.length; i++) {
			children[i].setLayoutProperties({ row: i + 1, column: 1 });
		}
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
		columns: { init: null, check: "Array", apply: "_applyColumns", transform: "_transformComponents" },

		/**
		 * SelectionMode
		 */
		selectionMode: { init: "single", check: ["none", "single", "multiSimple", "multiExtended", "multiToggle"], apply: "_applySelectionMode" },

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
		 * LiveResize
		 *
		 * Enables/disables live resizing of rows and columns.
		 */
		liveResize: { init: true, check: "Boolean", apply: "_applyLiveResize" },

		/**
         * GridLines property.
		 *
		 * Sets the type of border to use for the grid's cells.
         */
		gridLines: { init: "single", check: ["none", "vertical", "horizontal", "both"], apply: "_applyGridLines" },

		/**
		 * keepSameRowHeight
		 *
		 * Gets or sets a value indicating that all the rows should resize together.
		 */
		keepSameRowHeight: { init: false, check: "Boolean", apply: "_applyKeepSameRowHeight" },

		/**
		 * The minimum height of the table rows.
		 */
		minRowHeight: { init: 20, check: "PositiveInteger", themeable: true },

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
		 * Determines which scrollbars should be visible: 1 = Horizontal, 2 = Vertical, 3 = Both.
		 */
		scrollBars: { init: 3, check: "PositiveInteger", apply: "_applyScrollBars" },

		/**
		 * Sets the background color of the header panel in the scrollers.
		 */
		headerBackColor: { init: null, nullable: true, check: "Color", apply: "_applyHeaderBackColor", themeable: true },

		/**
		 * Indicating whether the TAB key moves the focus to the next control in the tab order rather than moving focus to the next cell.
		 */
		standardTab: { init: false, check: "Boolean" },

		/**
		 * Array of row data used only at design time.
		 */
		designRows: { init: null, check: "Array" },

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
		toolsPosition: { init: "top", check: ["top", "left", "right", "bottom"], apply: "_applyToolsPosition" },
	},

	members: {

		// index of the row header column. 0 is the default.
		// a derived class may set it to -1 if it doesn't create the header column.
		_rowHeaderColIndex: 0,

		// when __updateMode is true, changes to the data model are ignored.
		__updateMode: false,

		// keep track of internal change mode.
		__internalChange: 0,

		// keep track of requests to focus (and optionally to edit) a cell that is not yet loaded.
		__pendingCellCalls: null,
		__processingPendingCalls: false,

		// timer id to start editing.
		__startEditingTimer: 0,

		/**
		 * Triggers a data reload request for the cached row range.
		 *
		 * This method is called from the server.
		 */
		reloadData: function () {

			if (wisej.web.DesignMode)
				return;

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
				var lastRow = model.getRowCount() - 1, firstRow = lastRow;
				try {
					for (var i = 0, length = actions.length; i < length; i++) {
						var action = actions[i];
						switch (action.type) {

							case 0: // Update
								this.updateRow(action.index, action.rowData);
								firstRow = Math.min(firstRow, action.index);
								break;

							case 1: // Delete
								this.deleteRow(action.index);
								firstRow = Math.min(firstRow, action.index);
								break;

							case 2: // Insert
								this.insertRow(action.index, action.rowData);
								firstRow = Math.min(firstRow, action.index);
								break;
						}
					}

					// update the table now.
					this._updateTableData(
					  firstRow,
					  lastRow,
					  0,
					  model.getColumnCount() - 1);
				}
				finally {

					this.__updateMode = false;
				}
			}
		},

		/**
		 * Updates an entire row, including all the cells data and styles.
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
		 * Deletes the row from the data model without issuing a data load request.
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
		 * Inserts the new row in the data model without issuing a data load request.
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
		 * Event handler. Called when the table model data has changed.
		 * Overridden to ignore the "dataChanged" events when in bulk mode.
		 *
		 * @param e {Map} the event.
		 */
		_onTableModelDataChanged: function (e) {

			if (!this.__updateMode)
				this.base(arguments, e);

			// call the deferred scrollIntoView or setFocusCell that couldn't
			// have been called when the table we not populate yet.
			this.__executePendingCalls();
		},

		// Executes pending calls.
		__executePendingCalls: function () {

			if (this.__pendingCellCalls) {

				if (this.getRowCount() > 0) {

					var me = this;
					var pendingCalls = this.__pendingCellCalls;
					setTimeout(function () {

						try {
							me.__processingPendingCalls = true;
							for (var name in pendingCalls) {
								var call = pendingCalls[name];
								call.func.apply(me, call.args);
							}
						}
						catch (error) {

							me.core.logError(error);
						}
						finally {
							me.__processingPendingCalls = false;
						}

					}, 1);
				}

				this.__pendingCellCalls = null;
			}
		},

		// Defers the call to after the data is loaded.
		__postCall: function (args) {

			this.__pendingCellCalls = this.__pendingCellCalls || {};

			this.__pendingCellCalls[args.callee.displayName] = {
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

			if (!this.__updateMode)
				this.base(arguments, e);
		},

		/**
		 * Handle the "disappear" even to cancel editing.
		 */
		_onDisappear: function (e) {

			this.cancelEditing();

		},

		/**
		 * Event handler. Called when the table gets or loses
		 * the focus to hide or show the focus indicator.
		 *
		 * @param e {Map} the event data.
		 */
		_onFocusChanged: function (e) {

			this.base(arguments, e);

			// when editing always refocus the current cell editor.
			var cellEditor = this.getCellEditor();
			if (cellEditor) {
				cellEditor.focus();
				return;
			}

			var gotFocus = e.getType() == "focus";

			// show/hide the focus indicator.
			if (gotFocus) {

				var row = this.getFocusedRow();
				var col = this.getFocusedColumn();

				// automatically focus the first row/col when entering the grid the first time.
				// after giving it a chance to process the click/tap in case it
				// sets a focused cell before we automatically focus the first one.
				if (row == null && col == null) {
					var focusedRow = this.getFirstVisibleRow();
					var focusedCol = this.getFirstVisibleColumn();
					if (focusedRow != null && focusedCol != null)
						this.setFocusedCell(focusedCol, focusedRow);
				}

				// don't show the focus indicator when the current column is the row header.
				if (col == this._rowHeaderColIndex)
					return;

				// don't show the focus indicator when we don't have a cell to focus.
				if (row == null || col == null)
					return;
			}

			this.__showFocusIndicator(gotFocus);
		},

		/**
		 * Shows or hides the focus indicator.
		 */
		__showFocusIndicator: function (show) {

			var scrollerArr = this._getPaneScrollerArr();
			for (var i = 0; i < scrollerArr.length; i++) {

				var scroller = scrollerArr[i];
				if (scroller.getShowCellFocusIndicator()) {
					var focusIndicator = scroller.__focusIndicator;
					if (focusIndicator) {
						scroller._updateFocusIndicator();

						// show the focus indicator only if it's bound
						// to a valid cell. otherwise hide it.
						if (show
							&& focusIndicator.getRow() != null
							&& focusIndicator.getColumn() != null) {

							focusIndicator.show();
						}
						else {
							focusIndicator.hide();
						}
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
				this.setFocusedCell(null, null);

				// when in design mode, ensure that we are using the
				// design mode data model.
				if (wisej.web.DesignMode) {
					if (!(this.getTableModel() instanceof wisej.web.datagrid.DataModelDesignMode))
						this.setTableModel(new wisej.web.datagrid.DataModelDesignMode());
				}

				// reset the column model.
				this.setMetaColumnCounts([0]);

				// destroy the current column model.
				var isNewColumnModel = false;
				if (old != null && old.length > 0) {

					isNewColumnModel = true;
					this.__columnModel.dispose();
					this.__columnModel = null;

					for (var i = 0; i < old.length; i++)
						old[i].setTable(null);
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

				// populate the column model.
				var dataModel = this.getTableModel();
				dataModel.setColumns(columnTitles, columnIDs);

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

					// reload the data set.
					this.reloadData();
				}

				// prepare the meta columns.
				this._updateMetaColumns();

				// detect if this is the first time the column model is
				// created, in which case we have to attach to the events.
				if (isNewColumnModel) {
					columnModel.addListener("dataChanged", this._onColDataChanged, this);
					columnModel.addListener("styleChanged", this._onColStyleChanged, this);
					columnModel.addListener("selectionChanged", this._onColSelectionChanged, this);
				}
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

				// show/hide the row headers column.
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

			this._updateMetaColumns();
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
				header.setMinHeight(value);
				header.setMaxHeight(value);
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
		 * Applies the gridLines property.
		 *
		 */
		_applyGridLines: function (value, old) {

			this._gridLinesStateName = "border" + qx.lang.String.firstUp(value);
			qx.ui.core.queue.Widget.add(this, "updateContent");
		},

		/**
		 * The full name of the state to add to the inner cells.
		 * Cached here to speed up cell rendering. It is used in wisej.web.datagrid.cellRenderer.Cell._getCellState.
		 */
		_gridLinesStateName: "borderSingle",

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
		 * Applies the KeepSameRowHeight property.
		 */
		_applyKeepSameRowHeight: function (value, old) {

			this._onTableModelRowHeightChanged();
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
			wisej.web.ToolContainer.install(this, toolsContainer, value, "right", { row: 0, column: 1 });
			wisej.web.ToolContainer.install(this, toolsContainer, value, "left", { row: 0, column: 0 });
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
		 * Returns the selected items in a collection of ranges.
		 */
		getSelectionRanges: function () {

			var selectionModel = this.getSelectionModel();
			return selectionModel.getSelectedRanges();
		},

		/**
		 * Updates the selected rows.
		 */
		setSelectionRanges: function (ranges) {

			var selectionModel = this.getSelectionModel();
			selectionModel.resetSelection();

			if (ranges) {

				selectionModel.setBatchMode(true);
				try {

					for (var i = 0; i < ranges.length; i++) {
						var range = ranges[i];
						selectionModel._addSelectionInterval(range.minIndex, range.maxIndex);
					}
				}
				catch (ex) { }

				selectionModel._fireChangeSelection();
				selectionModel.setBatchMode(false);
			}
		},

		/**
		 * Applies the selectionMode property.
		 */
		_applySelectionMode: function (value, old) {

			var selectionModel = this.getSelectionModel();

			switch (value) {
				case "none":
					selectionModel.setSelectionMode(qx.ui.table.selection.Model.NO_SELECTION);
					break;
				case "single":
					selectionModel.setSelectionMode(qx.ui.table.selection.Model.SINGLE_SELECTION);
					break;
				case "multiSimple":
					selectionModel.setSelectionMode(qx.ui.table.selection.Model.SINGLE_INTERVAL_SELECTION);
					break;
				case "multiExtended":
					selectionModel.setSelectionMode(qx.ui.table.selection.Model.MULTIPLE_INTERVAL_SELECTION);
					break;
				case "multiToggle":
					selectionModel.setSelectionMode(qx.ui.table.selection.Model.MULTIPLE_INTERVAL_SELECTION_TOGGLE);
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

			this._updateScrollBarVisibility();

			var scrollerArr = this._getPaneScrollerArr();
			for (var i = 0; i < scrollerArr.length; i++) {
				scrollerArr[i].onTableModelRowHeightChanged();
			}

			// fire rowHeightChanged.
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

			if (jobs["autoSizeColumns"])
				this.autoSizeColumns();
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
		 * FirstVisibleColumn property getter.
		 *
		 * This is a read-only property that returns the first visible column.
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
		 * VisibleRows property getter.
		 *
		 * This is a read-only property that returns the number of visible rows.
		 * It is also a state property that is returned to the server with all updates.
		 */
		getVisibleRowCount: function () {

			return this.getPaneScroller(0).getTablePane().getVisibleRowCount();
		},

		/**
		 * Event handler. Called when a key is down.
		 *
		 * @param e {qx.event.type.KeySequence} the event.
		 */
		_onKeyDown: function (e) {

			if (!this.isEnabled())
				return;

			// handle keys that are independent from the modifiers
			var identifier = e.getKeyIdentifier();

			if (!this.isEditing()) {

				switch (identifier) {
					case "C":
					case "Insert":
						if (e.isCtrlPressed()) {

							if (!this.isWired("keydown"))
								this.fireEvent("copy");
						}
						break;
				}
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
			if (this != target &&
				!(target instanceof qx.ui.root.Inline) &&
				!qx.ui.core.Widget.contains(this.__scrollerParent, target)) {
				return;
			}

			var consumed = false;
			var editMode = this.getEditMode();
			var focusedRow = this.getFocusedRow();
			var focusedCol = this.getFocusedColumn();

			// handle keys that are independent from the modifiers.
			var identifier = e.getKeyIdentifier();

			// in editing mode?
			if (this.isEditing()) {

				if (e.getModifiers() == 0 || e.isShiftPressed()) {

					switch (identifier) {

						case "Enter":
							this.stopEditing(true /*notify*/);
							break;

						case "Escape":
							this.cancelEditing();
							break;

						case "Up":
							if (focusedRow > 0) {
								this.moveFocusedCell(0, -1);
							}
							break;

						case "Down":
							var tableModel = this.getTableModel();
							if (focusedRow < tableModel.getRowCount() - 1) {
								this.moveFocusedCell(0, 1);
							}
							break;

						case "Left":
							var editor = e.getTarget();
							if (editor.getTextSelectionStart && editor.getTextSelectionStart() == 0 && editor.getTextSelectionLength() == 0) {
								this.moveFocusedCell(-1, 0);
								consumed = true;
							}
							break;

						case "Right":
							var editor = e.getTarget();
							if (editor.getTextSelectionEnd && editor.getTextSelectionEnd() == editor.getValue().length && editor.getTextSelectionLength() == 0) {
								this.moveFocusedCell(1, 0);
								consumed = true;
							}
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

						if (editMode == "editOnKeystroke" || editMode == "editOnKeystrokeOrF2" || editMode == "editOnEnter") {
							this.startEditing();
						}

						// select/unselect the current row.
						this.getSelectionManager().handleSelectKeyDown(focusedRow, e);
						break;

					case "Enter":

						if (editMode == "editOnKeystroke" || editMode == "editOnKeystrokeOrF2" || editMode == "editOnEnter") {
							this.startEditing();
						}
						break;

					case "F2":

						if (editMode == "editOnF2" || editMode == "editOnKeystrokeOrF2" || editMode == "editOnEnter") {
							this.startEditing();
						}
						break;

					case "Home":

						if (e.isCtrlPressed())
							// go to the very first cell.
							this.setFocusedCell(this.getFirstVisibleColumn(), 0, true);
						else
							// go to the first cell in the current row.
							this.setFocusedCell(this.getFirstVisibleColumn(), this.getFocusedRow(), true);
						break;

					case "End":
						if (e.isCtrlPressed())
							// go to the very last cell.
							this.setFocusedCell(this.getVisibleColumnCount() - 1, this.getRowCount() - 1, true);
						else
							// go to the last cell in the current row.
							this.setFocusedCell(this.getVisibleColumnCount() - 1, this.getFocusedRow(), true);
						break;

					case "Left":
						this.moveFocusedCell(-1, 0);
						break;

					case "Right":
						this.moveFocusedCell(1, 0);
						break;

					case "Up":
						this.moveFocusedCell(0, -1);
						break;

					case "Down":
						this.moveFocusedCell(0, 1);
						break;

					case "PageUp":
					case "PageDown":
						var scroller = this.getPaneScroller(0);
						var direction = (identifier == "PageUp") ? -1 : 1;
						var visibleCount = this.getVisibleRowCount() - 1;
						scroller.setScrollY(scroller.getScrollY() + direction * visibleCount);
						this.moveFocusedCell(0, direction * visibleCount);
						break;

					case "Tab":
						this._handleTabKey(e);
						break;

					case "Delete":
						// fire the event only if we don't have a current cell.
						if (this.getFocusedColumn() <= this._rowHeaderColIndex)
							this.fireDataEvent("deleteRow", this.getFocusedRow());
						break;

					default:
						if (editMode == "editOnKeystroke" || editMode == "editOnKeystrokeOrF2" || editMode == "editOnEnter") {

							if (identifier.length == 1) {
								if ((identifier >= "A" && identifier <= "Z") || (identifier >= "0" && identifier <= "9")) {

									consumed = true;

									// start editing on keystroke.
									var keyCode = e.getKeyCode();
									var keyChar = keyCode > 0 ? String.fromCharCode(keyCode) : "";
									this.startEditing(keyChar);
								}
							}
						}
						break;
				}
			}

			// Update the selection/focused-cell depending on the kayboard key
			// that may have caused the change.
			//
			switch (identifier) {
				case "Up":
				case "Down":
				case "Left":
				case "Right":
				case "PageUp":
				case "PageDown":
					{
						focusedRow = this.getFocusedRow();
						this.getSelectionManager().handleMoveKeyDown(focusedRow, e);
					}
					break;

				case "Home":
				case "End":
					{
						focusedRow = this.getFocusedRow();
						this.getSelectionManager().handleMoveKeyDown(focusedRow, e);
					}
					break;

				case "Tab":
					{
						focusedRow = this.getFocusedRow();
						this.getSelectionModel().setSelectionInterval(focusedRow, focusedRow);
					}
					break;
			}

			if (consumed)
				e.stop();
		},

		// overridden to fire "endEdit" to the server.
		stopEditing: function (notify) {

			if (this.__canFireServerEvent()) {

				if (notify !== false)
					this.fireEvent("endEdit");
			}

			// if we are exiting edit mode because the focused widget changed
			// the table doesn't get a focusout event.
			if (!this.hasState("focused"))
				this.__showFocusIndicator(false);

			this.base(arguments);
		},

		// Overridden: Fire "cancelEdit" to the server
		cancelEditing: function () {

			this.base(arguments);

			if (this.__canFireServerEvent()) {

				this.fireEvent("cancelEdit");

				if (this.isFocusable())
					this.focus();
			}

			// if we are exiting edit mode because the focused widget changed
			// the table doesn't get a focusout event.
			if (!this.hasState("focused"))
				this.__showFocusIndicator(false);

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
						this.fireDataEvent("lastCellTab", this.getFocusedColumn());

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

			// shouldn't fire a server when the change is coming
			// from a server request unless we are processing a deferred call.
			if (!this.__processingPendingCalls && this.core.processingActions)
				return false;

			return true;
		},

		// overridden: fire the selectionChanged event with the new selected rows.
		_onSelectionChanged: function (e) {

			this.base(arguments, e);

			if (this.__canFireServerEvent()) {
				var selectionModel = this.getSelectionModel();
				var selectionRanges = selectionModel.getSelectedRanges();
				this.fireDataEvent("selectionChanged", {
					ranges: selectionRanges,
					focusCell: { col: this.getFocusedColumn(), row: this.getFocusedRow() }
				});
			}
		},

		// overridden: fire the colWidthChanged event when the user resizes a column.
		_onColWidthChanged: function (e) {

			this.base(arguments, e);

			if (this.__canFireServerEvent()) {

				var data = e.getData();
				if (data) {

					// update the column instance.
					var column = this.getColumns()[data.col];
					if (column)
						column.setWidth(data.newWidth);

					this.fireDataEvent("columnWidthChanged", { col: data.col, width: data.newWidth });
				}
			}
		},

		// overridden: fire the colPosChanged event when the user moves a column.
		_onColOrderChanged: function (e) {

			this.base(arguments, e);

			if (this.__canFireServerEvent()) {
				var data = e.getData();
				if (data)
					this.fireDataEvent("columnPositionChanged", { col: data.col, position: data.toOverXPos });
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

			// if the column being hidden/shown is the
			// row header column, we need to change the
			// meta column model as well, or the first visible column
			// will be rendered in the first band.
			if (data.col == this._rowHeaderColIndex) {

				this.setFocusedCell(null, null);
				this.setMetaColumnCounts([0]);
				this._updateMetaColumns();
			}

			// if the column being hidden has a cell in edit mode, cancel editing.
			if (this.getFocusedColumn() == data.col) {

				if (this.isEditing())
					this.cancelEditing();

				this.setFocusedCell(null, null);
			}

			this.base(arguments, e);

			if (this.__canFireServerEvent()) {
				this.fireDataEvent("columnVisibilityChanged", { col: data.col, visible: data.visible });
			}
		},

		/**
		 * Automatically resizes all the columns according to the sizeMode property.
		 */
		autoSizeColumns: function () {

			if (!this.getBounds())
				return;

			var columns = this.getColumns();
			if (columns == null || columns.length == 0)
				return;

			var columnModel = this.getTableColumnModel();
			if (!columnModel)
				return;

			// we auto resize non-frozen columns in the main pane only.
			var scrollerArr = this._getPaneScrollerArr();
			var mainPane = scrollerArr[scrollerArr.length - 1];

			// get the width of the header pane. that's the width we have to fill.
			var mainPaneSize = mainPane._paneClipper.getInnerSize();
			if (mainPaneSize == null)
				return;

			// calculate the total fill weight of the "fill" columns and collect the columns to auto fill and the ones to auto size.
			var autoFillColumns = [];
			var autoSizeColumns = [];
			for (var i = 0, length = columns.length; i < length; i++) {

				var column = columns[i];

				if (!column.isVisible())
					continue;

				switch (column.getSizeMode()) {
					case "fill":
						if (column.isFrozen())
							continue;

						autoFillColumns.push(column);
						break;

					case "none":
						continue;

					default:
						autoSizeColumns.push(column);
						break;
				}
			}

			this.__internalChange++;
			try {

				// auto size columns based on content.
				// TODO: this.__autoSizeColumns(autoSizeColumns, columnModel);

				// adjust the available width deducting all other visible columns.
				var availableWidth = mainPaneSize.width;
				for (var i = 0, length = columns.length; i < length; i++) {

					var column = columns[i];
					var colIndex = column.getIndex();

					if (colIndex < 0 || !column.isVisible())
						continue;

					if (column.isFrozen() || column.getSizeMode() == "fill")
						continue;

					availableWidth -= columnModel.getColumnWidth(colIndex);
				}

				// auto size fill columns based on weight.
				this.__autoSizeFillColumns(autoFillColumns, columnModel, availableWidth);
			}
			finally {

				this.__internalChange--;
			}
		},

		// auto size columns based on content.
		__autoSizeColumns: function (columns, columnModel) {

			var dataModel = this.getTableModel();

			// resize the columns according to the size mode property.
			for (var i = 0, length = columns.length; i < length; i++) {

				var column = columns[i];
				var colIndex = column.getIndex();

				if (colIndex < 0)
					continue;

				var oldWidth = columnModel.getColumnWidth(colIndex);

				var newWidth = oldWidth;
				switch (column.getSizeMode()) {

					case "columnHeader":
						newWidth = this.__getColumnHeaderWidth(column);
						break;

					case "allCells":
						newWidth = Math.max(this.__getMaxCellsWidth(colIndex, columnModel, dataModel), this.__getColumnHeaderWidth(column));
						break;

					case "displayedCells":
						newWidth = Math.max(this.__getMaxDisplayedCellsWidth(colIndex, columnModel, dataModel), this.__getColumnHeaderWidth(column));
						break;

					case "allCellsExceptHeader":
						newWidth = this.__getMaxCellsWidth(colIndex, columnModel, dataModel);
						break;

					case "displayedCellsExceptHeader":
						newWidth = this.__getMaxDisplayedCellsWidth(colIndex, columnModel, dataModel);
						break;
				}

				if (newWidth != oldWidth && newWidth > 0) {
					column.setWidth(newWidth);
				}
			}

		},

		// returns the calculate maximum width of all the cells in the column
		// that are currently displayed.
		__getMaxDisplayedCellsWidth: function (col, columnModel, dataModel) {

			var width = 0;
			var row = this.getFirstVisibleRow();
			var count = this.getVisibleRowCount();
			var renderer = columnModel.getDataCellRenderer(col);

			while (count > 0) {

				var value = dataModel.getValue(col, row);
				if (value) {

					var cellInfo = {
						col: col,
						row: row,
						table: this,
						value: value,
						columnModel: columnModel,
						rowData: dataModel.getRowData(row)
					};

					width = Math.max(width, renderer.getCellSize(cellInfo).width);
				}

				row++;
				count--;
			}

			return width;
		},

		// returns the calculate maximum width of all the cells in the data
		// model cache.
		__getMaxCellsWidth: function (col, columnModel, dataModel) {

			var width = 0;
			var renderer = columnModel.getDataCellRenderer(col);

			dataModel.iterateCachedRows(function (row, rowData) {

				var value = rowData.data[col];
				if (value) {

					var cellInfo = {
						col: col,
						row: row,
						table: this,
						value: value,
						columnModel: columnModel,
						rowData: rowData
					};

					width = Math.max(width, renderer.getCellSize(cellInfo).width);
				}

			}, this);

			return width;
		},

		// returns the recalculated width of the column header.
		__getColumnHeaderWidth: function (column) {
			var header = column.getHeaderWidget();
			header.resetWidth();
			header.invalidateLayoutCache();
			return header.getSizeHint().width;
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
			for (var i = 0, length = columns.length; i < length; i++) {

				var column = columns[i];
				var colIndex = column.getIndex();

				if (colIndex < 0)
					continue;

				var weight = column.getFillWeight() / totalFillWeight;
				var oldWidth = columnModel.getColumnWidth(colIndex);
				var newWidth = (Math.max(availableWidth * weight, column.getMinWidth())) | 0;
				if (newWidth != oldWidth && newWidth > 0) {
					column.setWidth(newWidth);
					this.fireDataEvent("columnWidthChanged", { col: colIndex, width: newWidth });
				}
			}
		},

		// overridden to resize the columns when
		// the scrollbar visibility changes.
		_updateScrollBarVisibility: function () {

			this.base(arguments);

			if (!this.__internalChange) {

				if (!this.getBounds())
					return;

				var me = this;
				setTimeout(function () {
					qx.ui.core.queue.Widget.add(me, "autoSizeColumns");
				}, 1);
			}
		},

		/**
		 * Resize the rows height according to the specified parameters.
		 *
		 * @param rowIndex {Integer} Index of the row to resize. -1 for all rows.
		 * @param autoSizeRowMode {String} Autosize mode: one of "rowHeader", "allCellsExceptHeader", "allCells".
		 */
		autoResizeRows: function (rowIndex, autoSizeRowMode) {
			// TODO: Implement.
		},

		/**
		 * Resize the columns width according to the specified parameters.
		 *
		 * @param columnIndex {Integer} Index of the column to resize. -1 for all columns.
		 * @param autoSizeColumnMode {String} Autosize mode: one of "allCellsExceptHeader","allCells", "displayedCellsExceptHeader", "displayedCells".
		 */
		autoResizeColumns: function (columnIndex, autoSizeColumnMode) {
			// TODO: Implement.
		},

		/**
		 * Resize the row headers height according to the specified parameters.
		 *
		 * @param rowIndex {Integer} Index of the row to resize. -1 for all rows.
		 * @param autoSizeRowMode {String} Autosize mode: one of "autoSizeToAllHeaders", "autoSizeToDisplayedHeaders", "autoSizeToFirstHeader".
		 */
		autoResizeRowHeaders: function (rowIndex, autoSizeRowMode) {
			// TODO: Implement.
		},

		/**
		 * Resize the column headers's height according to the specified parameters.
		 *
		 * @param columnIndex {Integer} Index of the column to resize. -1 for all columns.
		 */
		autoResizeColumnHeaders: function (columnIndex) {
			// TODO: Implement.
		},

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

					for (var i = 0; i < newPositions.length; i++)
						newPositions[i]++;

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

			var row = this.getFocusedRow();
			var col = this.getFocusedColumn();
			var tableModel = this.getTableModel();
			var columnModel = this.getTableColumnModel();

			// if tabbing in when there is no current cell, default to the first cell.
			if (row == null)
				row = 0;
			if (col == null)
				col = 0;

			var x = columnModel.getVisibleX(col);
			var colCount = columnModel.getVisibleColumnCount();
			x = Math.min(x + deltaX, colCount - 1);
			col = columnModel.getVisibleColumnAtX(x);

			row = Math.min(row + deltaY, tableModel.getRowCount() - 1);

			// don't move to or past the row header column (0).
			if (deltaX && (col <= this._rowHeaderColIndex || col == null))
				return;

			// don't move past the first cell
			if (row < 0 || row == null)
				return;

			this.setFocusedCell(col, row, true);
		},

		/**
		 * Scrolls a cell visible.
		 *
		 * @param col {Integer} the model index of the column the cell belongs to.
		 * @param row {Integer} the model index of the row the cell belongs to.
		 */
		scrollCellVisible: function (col, row) {

			// store the for a deferred call, after the data count is loaded.
			if (row != null && col != null && row >= this.getRowCount()) {
				this.__postCall(arguments);
				return;
			}

			this.base(arguments, col, row);
		},

		/**
		 * Sets the currently focused cell. A value of <code>null</code> hides the
		 * focus cell.
		 *
		 * @param col {Integer?null} the model index of the focused cell's column.
		 * @param row {Integer?null} the model index of the focused cell's row.
		 * @param scrollVisible {Boolean ? false} whether to scroll the new focused cell visible.
		 */
		setFocusedCell: function (col, row, scrollVisible) {

			var hasFocus = this.hasFocus();
			var savedRow = this.getFocusedRow();
			var savedCol = this.getFocusedColumn();

			if (col == savedCol && row == savedRow) {

				if (scrollVisible)
					this.scrollCellVisible(col, row);

				return;
			}

			// terminate edit mode if changing the focused cell while editing
			// without notifying the server (the false argument).
			// we'll fire "focusCellChanged" instead.
			if (this.isEditing()) {
				this.stopEditing(false /*notify*/);
			}

			if (row < 0)
				row = null;

			if (col <= this._rowHeaderColIndex)
				col = null;

			// defer the call after the data is loaded.
			if (row != null && col != null && row >= this.getRowCount()) {
				this.__postCall(arguments);
				return;
			}

			// make sure we are within the limits.
			var columnModel = this.getTableColumnModel();
			if (col != null && col >= columnModel.getOverallColumnCount())
				col = null;

			this.base(arguments, col, row, scrollVisible);

			if (this.__canFireServerEvent()) {
				var me = this;
				setTimeout(function () { 
					me.fireDataEvent("focusCellChanged", { col: col, row: row });
				}, 1);
			}

			// start editing on enter, when focused.
			if (hasFocus && this.getEditMode() == "editOnEnter") {

				// if the focus cell is being changed by the server, start editing
				// without delay, unlike when the user is navigating quickly.
				if (!this.__canFireServerEvent()) {
					this.startEditing();
					return;
				}

				// start this after a delay to prevent the widget from
				// generating a train of events when the user rapidly
				// moves from cell to cell.

				var me = this;
				clearTimeout(this.__startEditingTimer);
				this.__startEditingTimer = 0;
				this.__startEditingTimer = setTimeout(function () {

					me.startEditing();
					me.__startEditingTimer = 0;

				}, 150);
			}
		},

		/**
		 * Returns true if the wisej.web.DataGrid has the focus
		 * or if any child widget is focused.
		 */
		hasFocus: function () {

			var focusWidget = qx.ui.core.FocusHandler.getInstance().getFocusedWidget();
			return (focusWidget == this) || (qx.ui.core.Widget.contains(this, focusWidget) == true);
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
		 * @param force {Boolean?null} true when edit mode must be started at the specified cell.
		 * @return {Boolean} whether editing was started or not.
		 */
		startEditing: function (text, col, row, force) {

			if (!this.isVisible())
				return;

			// defer the call after the data is loaded.
			if (row != null && col != null && row >= this.getRowCount()) {
				this.__postCall(arguments);
				return;
			}

			// when editing is started by the server, ensure that the
			// current cell has not changed, otherwise abort - it means
			// the user tabbed out before we could initiate edit mode.
			if (force === false
				&& (col != null && row != null)
				&& (col != this.getFocusedColumn() || row != this.getFocusedRow())
				&& (this.getFocusedColumn() != null && this.getFocusedRow() != null)) {

				this.core.logInfo("Edit mode not started: the current cell doesn't match the cell entering edit mode.");
				return;
			}

			// update the focused cell, if the coordinates have been specified.
			if (col != null && row != null) {
				force = true;
				this.setFocusedCell(col, row, true);
			}

			if (this.getFocusedColumn() > this._rowHeaderColIndex && this.getFocusedRow() > -1) {

				var x = this.getTableColumnModel().getVisibleX(this.getFocusedColumn());
				var metaColumn = this._getMetaColumnAtColumnX(x);
				return this.getPaneScroller(metaColumn).startEditing(text || "", force);
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
			for (var col = 0, l = tableModel.getColumnCount() ; col < l; col++) {

				// skip excluded columns.
				if (columnHeaders[col].getShowInMenu() === false)
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
				if (child.getWidth() == null)
					child.setWidth(child.getSizeHint().width);
				if (child.getHeight() == null)
					child.setHeight(child.getSizeHint().height);
			}
		},

		// remove the "inner" state to child controls removed from the grid.
		_afterRemoveChild: function (child) {
			if (child.isWisejControl) {
				child.removeState("inner");
			}
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
	},

	destruct: function () {

		// destroy the existing instances of ColumnHeader.
		var headers = this.getColumns();
		if (headers) {
			for (var i = 0; i < headers.length; i++)
				headers[i].dispose();
		}

	}

});