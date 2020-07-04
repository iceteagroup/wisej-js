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
 * wisej.web.datagrid.DataModelDesignMode
 *
 * Local data model designed to interact with Wisej
 * data provider interface and to support the new
 * additional properties in design mode.
 *
 * Each row in the data model is expected to
 * to be a map with these fields:
 *
 *		{
 *			"height": 24,
 *			"minHeight": 2,
 *			"visible": true,
 *			"style": {shared row style map - inherited by the cells},
 *			"data":
 *			{
 *				"0": "row header value",
 *				"1": "first cell value",
 *				...
 *			},
 *          "styles":
 *			{
 *				"0": {row header style map},
 *				"1": {first cell style map},
				...
 *			},
 *		}
 */
qx.Class.define("wisej.web.datagrid.DataModelDesignMode", {

	extend: qx.ui.table.model.Simple,

	members: {

		// the table that owns this model.
		__table: null,

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
		 * Returns the requested cell value.
		 *
		 * @param columnIndex {Integer} the index of the column
		 * @param rowIndex {Integer} the index of the row
		 */
		getValue: function (columnIndex, rowIndex) {

			var rowData = this.getRowData(rowIndex);
			if (rowData == null)
				return "";

			var value = rowData.data[columnIndex];
			return value == null ? "" : value;
		},

		/**
		 * Sets the cell value.
		 *
		 * @param columnIndex {Integer} index of the column
		 * @param rowIndex {Integer} index of the row
		 * @param value {var} Value to be set
		 */
		setValue: function (columnIndex, rowIndex, value) {

			var rowData = this.getRowData(rowIndex);

			// row has not yet been loaded?
			if (rowData == null)
				return;

			if (rowData.data[columnIndex] != value) {

				rowData.data[columnIndex] = value;

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
		 * Returns the minimum height of the specified row.
		 *
		 * @param rowIndex {Integer} the index of the row
		 */
		getMinRowHeight: function (rowIndex) {

			if (this.__table.isKeepSameRowHeight())
				return this.__table.getMinRowHeight();

			var rowData = this.getRowData(rowIndex);
			return rowData && rowData.minHeight ? rowData.minHeight : this.__table.getMinRowHeight();
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
			return rowData && rowData.maxHeight ? rowData.maxHeight : this.__table.getMaxRowHeight();
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
			return rowData && rowData.height ? rowData.height : this.__table.getRowHeight();

		},

		/**
		 * Sets the width of a column.
		 *
		 * @param rowIndex {Integer}
		 *   The model index of the row.
		 *
		 * @param height {Integer}
		 *   The new height the row in pixels.
		 *
		 * @param isPointerAction {Boolean}
		 *   true if the column width is being changed as a result of a
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

				this.fireEvent("metaDataChanged");
				this.fireDataEvent("rowHeightChanged", data);
			}
		},

		/**
			 * Returns whether the row is resizable.
			 *
			 * @param rowIndex {Integer} the index of the row
			 */
		getResizable: function (rowIndex) {

			return true;
		},

		// overridden
		sortByColumn: function (columnIndex, ascending) {

			// comparator closure.
			function createComparator(columnIndex, ascending, caseSensitive) {

				// the actual comparator method.
				return function (row1, row2) {

					var result = 0;
					var value1 = row1.data[columnIndex];
					var value2 = row2.data[columnIndex];

					if (qx.lang.Type.isNumber(value1) && qx.lang.Type.isNumber(value2)) {

						result = isNaN(value1)
							? isNaN(value2)
								? 0
								: 1
							: isNaN(value2) ? -1
								: (value1 < value2) ? 1 : ((value1 == value2) ? 0 : -1);
					}
					else {

						if (!caseSensitive) {
							value1 = value1.toLowerCase();
							value2 = value2.toLowerCase();
						}

						result = (value1 < value2) ? 1 : ((value1 == value2) ? 0 : -1);
					}

					if (ascending)
						result = -result;

					return result;
				};
			}

			// create the comparator function.
			var comparator = createComparator(columnIndex, ascending, this.isCaseSensitiveSorting());

			// sort the data.
			this.__rowArr.sort(comparator);

			// update the table.
			this.__sortColumnIndex = columnIndex;
			this.__sortAscending = ascending;

			var data = {
				columnIndex: columnIndex,
				ascending: ascending
			};
			this.fireDataEvent("sorted", data);
			this.fireEvent("metaDataChanged");
		},

		/**
		 * Generates empty rows to fill the table in design mode.
		 */
		reloadData: function () {

			if (this.getRowCount() === 0) {

				var table = this.__table;
				if (table) {

					var row = table.getDesignRow();
					if (row) {
						var rows = [];
						for (var i = 0; i < 100; i++) {
							rows.push(row);
						}
						this.setData(rows, true);
					}
				}
			}
		},

		/**
		 * Iterates through all cached rows.
		 *
		 * Empty iterator for design mode data set.
		 *
		 * @param iterator {Function} The iterator function to call.
		 * @param object {Object} context of the iterator
		 */
		iterateCachedRows: function (iterator, object) {

		}

	}

});