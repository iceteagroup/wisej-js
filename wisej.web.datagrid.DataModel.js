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
 * wisej.web.datagrid.DataModel
 *
 * Remote data model designed to interact with the Wisej
 * IWisejDataStore interface and to support the new
 * additional properties.
 *
 * Each row in the data model is expected to
 * to be a map with these fields:
 *
 *		{
 *			"height": 24,
 *			"minHeight": 2,
 *			"resizable": true|false,
 *			"style": {shared row style map - inherited by the cells},
 *			"data":
 *			{
 *				"0": "row header value",
 *				"1": "first cell value",
 *				...
 *			},
 *			"errors":
 *			{
 *				"0": "row header error text",
 *				"1": "first cell error text",
 *				...
 *			},
 *			"styles":
 *			{
 *				"0": {row header style map},
 *				"1": {first cell style map},
 *				...
 *			}
 *		}
 */
qx.Class.define("wisej.web.datagrid.DataModel", {

	extend: qx.ui.table.model.Remote,

	properties: {

		// increase the blocks in the cache since the list view can
		// display more items when in small icon view mode.
		maxCachedBlockCount: { init: 100, refine: true }

	},

	members: {

		// the table that owns this model.
		__table: null,

		// the data store used to retrieve data from the server component.
		__dataStore: null,

		// set to true if the current request is canceled.
		__canceled: false,

		/**
		 * Initialize the table model <--> table interaction. The table model is
		 * passed to the table constructor, but the table model doesn't otherwise
		 * know anything about the table nor can it operate on table
		 * properties. This function provides the capability for the table model
		 * to specify characteristics of the table. It is called when the table
		 * model is applied to the table.
		 *
		 * @param table {qx.ui.table.Table}
		 *   The table to which this model is attached
		 */
		init: function (table) {

			this.__table = table;
		},

		/**
		 * Removes all the rows from the data model without issuing a reload-data request.
		 */
		clear: function () {

			var rowCount = this._rowCount;
			if (rowCount <= 0)
				return;

			this.clearCache();

			this._rowCount = 0;
			this._clearCache = false;
			this._lastRowToLoad = -1;
			this._firstRowToLoad = -1;

			// Inform the listeners
			if (this.hasListener("dataChanged")) {
				var data =
				{
					firstRow: 0,
					lastRow: rowCount - 1,
					firstColumn: 0,
					lastColumn: this.getColumnCount() - 1
				};

				this.fireDataEvent("dataChanged", data);
			}
		},

		/**
		 * Returns the requested cell value.
		 *
		 * @param columnIndex {Integer} the index of the column
		 * @param rowIndex {Integer} the index of the row
		 */
		getValue: function (columnIndex, rowIndex) {

			var rowData = this.getRowData(rowIndex);
			if (rowData == null || rowData.data == null)
				return "";

			var value = rowData.data[columnIndex];
			return value == null ? "" : value;
		},

		/**
		 * Sets the cell value.
		 *
		 * @param columnIndex {Integer} index of the column
		 * @param rowIndex {Integer} index of the row
		 * @param value {Object} Value to be set.
		 * @param error {String?} Error text associated with the cell.
		 * @param tooltip {String?} Tooltip text associated with the cell.
		 */
		setValue: function (columnIndex, rowIndex, value, error, tooltip) {

			var rowData = this.getRowData(rowIndex);

			// row has not yet been loaded?
			if (rowData == null)
				return;

			// no data yet?
			if (rowData.data == null)
				rowData.data = {};
			if (error != null && rowData.errors == null)
				rowData.errors = {};
			if (tooltip != null && rowData.tooltips == null)
				rowData.tooltips = {};

			if (rowData.data[columnIndex] != value
				|| (error != null && rowData.errors[columnIndex] != error)
				|| (tooltip != null && rowData.tooltips[columnIndex] != tooltip)) {

				rowData.data[columnIndex] = value;

				if (error != null)
					rowData.errors[columnIndex] = error;

				if (tooltip != null)
					rowData.tooltips[columnIndex] = tooltip;

				// inform the listeners.
				if (this.hasListener("dataChanged")) {
					var data =
					{
						firstRow: rowIndex,
						lastRow: rowIndex,
						firstColumn: columnIndex,
						lastColumn: columnIndex
					};

					this.fireDataEvent("dataChanged", data);
				}
			}
		},

		/**
		 * Returns the requested cell style.
		 *
		 * @param columnIndex {Integer} the index of the column
		 * @param rowIndex {Integer} the index of the row
		 */
		getCellStyle: function (columnIndex, rowIndex) {

			var rowData = this.getRowData(rowIndex);
			if (rowData == null)
				return null;

			var cellStyle = rowData.styles ? rowData.styles[columnIndex] : null;
			return cellStyle;
		},

		/**
		 * Sets the cell style.
		 *
		 * @param columnIndex {Integer} index of the column
		 * @param rowIndex {Integer} index of the row
		 * @param style {var} style to apply to the cell.
		 */
		setCellStyle: function (columnIndex, rowIndex, style) {

			var rowData = this.getRowData(rowIndex);

			// row has not yet been loaded?
			if (rowData == null)
				return;

			// no styles yet?
			if (rowData.styles == null)
				rowData.styles = {};

			rowData.styles[columnIndex] = style;

			if (rowData.cachedStyles != null)
				rowData.cachedStyles[columnIndex] = undefined;

			// Inform the listeners
			if (this.hasListener("dataChanged")) {
				var data =
				{
					firstRow: rowIndex,
					lastRow: rowIndex,
					firstColumn: columnIndex,
					lastColumn: columnIndex
				};

				this.fireDataEvent("dataChanged", data);
			}
		},

		/**
		 * Returns the requested row style.
		 *
		 * @param rowIndex {Integer} the index of the row
		 */
		getRowStyle: function (rowIndex) {

			var rowData = this.getRowData(rowIndex);
			if (rowData == null)
				return null;

			return rowData.style;
		},

		/**
		 * Sets the row style.
		 *
		 * @param rowIndex {Integer} index of the row
		 * @param style {var} style to apply to the cell.
		 */
		setRowStyle: function (rowIndex, style) {

			var rowData = this.getRowData(rowIndex);

			// row has not yet been loaded?
			if (rowData == null)
				return;

			rowData.style = style;
			rowData.cachedStyles = null;

			// Inform the listeners
			if (this.hasListener("dataChanged")) {
				var data =
				{
					firstRow: rowIndex,
					lastRow: rowIndex
				};

				this.fireDataEvent("dataChanged", data);
			}
		},

		/**
		 * Removes all cached styles.
		 */
		resetStyles: function () {

			this.iterateCachedRows(function (rowIndex, rowData) {

				rowData.cachedStyles = null;

			}, this);
		},

		/**
		 * Returns the height of the specified row.
		 *
		 * @param rowIndex {Integer} the index of the row
		 */
		getRowHeight: function (rowIndex) {

			if (this.__table.isKeepSameRowHeight())
				return this.__table.getRowHeight();

			var rowData = this.getRowData(rowIndex);
			if (rowData && rowData.height)
				return rowData.height;

			return this.__table.getRowHeight();
		},

		/**
		 * Returns the minimum height of the specified row.
		 *
		 * @param rowIndex {Integer} the index of the row
		 */
		getMinRowHeight: function (rowIndex) {

			if (this.__table.isKeepSameRowHeight())
				return this.__table.getMinRowHeight();

			var rowData = this.getRowData(rowIndex);
			if (rowData && rowData.minHeight)
				return rowData.minHeight;

			return this.__table.getMinRowHeight();
		},

		/**
		 * Returns the maximum height of the specified row.
		 *
		 * @param rowIndex {Integer} the index of the row
		 */
		getMaxRowHeight: function (rowIndex) {

			if (this.__table.isKeepSameRowHeight())
				return this.__table.getMaxRowHeight();

			var rowData = this.getRowData(rowIndex);
			if (rowData && rowData.maxHeight)
				return rowData.maxHeight;

			return this.__table.getMaxRowHeight();
		},

		/**
		 * Returns whether the row is resizable.
		 *
		 * @param rowIndex {Integer} the index of the row
		 */
		getResizable: function (rowIndex) {

			var rowData = this.getRowData(rowIndex);
			if (rowData && rowData.resizable !== undefined)
				return rowData.resizable;

			return this.__table.getAllowRowResize();
		},

		/**
		 * Sets whether the row is resizable.
		 *
		 * @param rowIndex {Integer} the index of the row
		 * @param resizable {Boolean} the resizable flag
		 */
		setResizable: function (rowIndex, resizable) {

			var rowData = this.getRowData(rowIndex);
			if (rowData)
			{
				if (resizable === undefined)
					delete rowData.resizable
				else
					rowData.resizable = resizable;
			}
		},

		/**
		 * Sets the minimum row height of the specified row.
		 *
		 * @param rowIndex {Integer} the index of the row
		 * @param minHeight {Integer} the minimum height of the row
		 */
		setMinRowHeight: function (rowIndex, minHeight) {

			var rowData = this.getRowData(rowIndex);
			if (rowData)
				rowData.minHeight = minHeight;
		},

		/**
		 * Sets the height of a row.
		 *
		 * @param rowIndex {Integer}
		 *   The model index of the row.
		 *
		 * @param height {Integer}
		 *   The new height the row in pixels.
		 *
		 * @param isPointerAction {Boolean}
		 *   true if the row height is being changed as a result of a
		 *   pointer drag in the header; false or undefined otherwise.
		 *
		 */
		setRowHeight: function (rowIndex, height, isPointerAction) {

			if (qx.core.Environment.get("qx.debug")) {
				this.assertInteger(row, "Invalid argument 'col'.");
				this.assertInteger(height, "Invalid argument 'width'.");
			}

			var rowData = this.getRowData(rowIndex);

			// row has not yet been loaded?
			if (rowData == null)
				return;

			var oldHeight = rowData.height;
			if (oldHeight != height) {

				rowData.height = height;

				var data =
				{
					row: rowIndex,
					newHeight: height,
					oldHeight: oldHeight,
					isPointerAction: isPointerAction || false
				};

				this.fireDataEvent("rowHeightChanged", data);
			}
		},

		/**
		 * Changes the name (title) of the column.
		 */
		setColumnName: function (columnIndex, name) {

			this.__columnNameArr[columnIndex] = name;
		},

		/**
		 * Cancels the current request if possible.
		 *
		 * Should be overridden by subclasses if they are able to cancel requests. This
		 * allows sending a new request directly after a call of {@link #reloadData}.
		 *
		 * @return {Boolean} whether the request was canceled.
		 */
		_cancelCurrentRequest: function () {

			this.__canceled = true;
			return true;
		},

		/**
		 * Reads the total number of rows from the server.
		 */
		_loadRowCount: function () {

			if (this.__table && this._getDataStore()) {
				this._getDataStore().getRowCount(
					this._onRowCountLoaded, this);
			}
		},

		/**
		 * Sets row data.
		 *
		 * Has to be called by {@link #_loadRowData}.
		 *
		 * @param rowDataArr {Map[]} the loaded row data or null if there was an error.
		 */
		_onRowDataLoaded: function (rowDataArr) {

			if (this.__canceled) {
				this.__canceled = false;
				return;
			}

			this.base(arguments, rowDataArr);
		},

		/**
		 * Reads the requested row range from the server.
		 */
		_loadRowData: function (firstRow, lastRow) {

			if (this.__table && this._getDataStore()) {
				var args = {
					first: firstRow,
					last: lastRow,
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

			this.__dataStore =
				this.__dataStore
				|| new wisej.DataStore(this.__table.getId());

			return this.__dataStore;
		},


		/**
		 * Set the sort column index
		 *
		 * @param columnIndex {Integer} index of the column
		 */
		_setSortColumnIndex: function (columnIndex) {
			this._sortColumnIndex = columnIndex;
		},

		/**
		 * Set whether to sort in ascending order or not.
		 *
		 * @param ascending {Boolean}
		 *   <i>true</i> for an ascending sort;
		 *   <i> false</i> for a descending sort.
		 */
		_setSortAscending: function (ascending) {
			this._sortAscending = ascending;
		},

	},

	destruct: function () {

		this._disposeObjects("__dataStore");

	}
});
