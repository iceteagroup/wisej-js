///////////////////////////////////////////////////////////////////////////////
//
// (C) 2020 ICE TEA GROUP LLC - ALL RIGHTS RESERVED
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
 * wisej.web.datagrid.SelectionModel
 * 
 * Handles the selection data for the wisej.web.DataGrid widget.
 * It is capable of managing row selections, column selections and cell selections
 * in an optimized array of ranges. Each range is a map with a min an max members
 * defined as:
 * 
 *		range = {minCol, minRow, maxCol, maxRow}
 *		
 *	When col is -1 it means that all the columns in the row are selected, hence the row is selected.
 *	When row is -1 it means that the rows in the col are selected, hence the column is selected.
 *	When col and row are both -1 it means that all the columns and all the rows are selected.
 *	Otherwise a specific cell at col,row is selected.
 *	
 *	When either col or row are -1 in min or max, the other min or max also must be -1.
 *	A range can select a range of cells, a range of rows, or a range of columns and cannot
 *	mix a min selection with col = -1 (all columns) with a max selection where col != -1.
 *	
 *	For example, when rows from 3 to 5 are selected we have:
 *	
 *		ranges = [{minCol:-1,minRow:3, maxCol:-1,maxRow:5}]
 *		
 *	When columns 3 to 5 are selected:
 *	
 *		ranges = [{minCol:3,minRow:-1, maxCol:5,maxRow:-1}]
 *		
 *	When cells from 1,3 to 3,5 are selected (in a square):
 *
 *		ranges = [{minCol:1,minRow:3, maxCol:3,maxRow:5}]
 *		
 *	Adding or removing ranges always triggers a consolidation (merging) all of the ranges
 *	to optimize the array.
 *
 */
qx.Class.define("wisej.web.datagrid.SelectionModel", {

	extend: qx.core.Object,

	construct: function (table) {

		this.base(arguments, true /* weakReference */);

		this.__selectionRanges = [];
	},

	events: {

		/** Fired when the selection has changed. */
		"changeSelection": "qx.event.type.Event"
	},

	members: {

		/** Batch mode fields. */
		__batchModeCount: 0,
		__hadBatchModeEvent: false,

		/**
		 * Array of selection ranges. Each entry is a map containing
		 * the min and max cell for each range:
		 * 
		 *		[{
		 *		  minCol,
		 *		  minRow,
		 *		  maxCol,
		 *		  maxRow
		 *		}]
		 *	
		 * Either col or row can be -1 to indicate that the entire row or entire column is selected.
		 * 
		 */
		__selectionRanges: null,

		/**
		 * Lead selection item {col?, row?}.
		 */
		__leadSelection: null,

		/**
		 * Anchor selection item {col?, row?}..
		 */
		__anchorSelection: null,

		/**
		 * Returns the selected ranges as an array.
		 *
		 * @return {Map[]} the selected ranges as an array of:
		 * 
		 *		{
		 *		  minCol,
		 *		  minRow,
		 *		  maxCol,
		 *		  maxRow
		 *		}
		 *
		 * Either col or row can be -1 to indicate that the entire row or entire column is selected.
		 */
		getSelectionRanges: function () {

			var retval = [];
			var range = null;

			for (var i = 0, l = this.__selectionRanges.length; i < l; i++) {

				range = this.__selectionRanges[i];

				retval.push({
					minCol: range.minCol,
					minRow: range.minRow,
					maxCol: range.maxCol,
					maxRow: range.maxRow
				});
			}

			return retval;
		},

		/**
		  * Returns the starting {col, row} arguments of the last call to {@link #setSelectionRange()},
		  * {@link #addSelectionRange()} or {@link #removeSelectionRange()}.
		  *
		  * @return {Map} the anchor selection.
		  */
		getAnchor: function () {
			return this.__anchorSelection;
		},

		/**
		 * Returns the ending {col, row} arguments of the last call to {@link #setSelectionRange()},
		 * {@link #addSelectionRange()} or {@link #removeSelectionRange()}.
		 *
		 * @return {Map} the lead selection index.
		 */
		getLead: function () {
			return this.__leadSelection;
		},

		/**
		 * Resets (clears) the selection.
		 */
		resetSelection: function () {

			if (!this.isSelectionEmpty()) {
				this._resetSelection();
				this.fireChangeSelection();
			}
		},

		/**
		 * Returns whether the selection is empty.
		 *
		 * @return {Boolean} whether the selection is empty.
		 */
		isSelectionEmpty: function () {
			return this.__selectionRanges.length == 0;
		},

		/**
		 * Returns whether more than 1 element (row, col or cell) is currently selected.
		 */
		isMultipleSelection: function () {

			if (this.__selectionRanges.length == 0)
				return false;

			if (this.__selectionRanges.length > 1)
				return true;

			var range = this.__selectionRanges[0];

			return range.maxCol - range.minCol > 1 || range.maxRow - range.minRow > 1;
		},

		/**
		 *
		 * Activates / Deactivates batch mode. In batch mode, no change events will be thrown but
		 * will be collected instead. When batch mode is turned off again and any events have
		 * been collected, one event is thrown to inform the listeners.
		 *
		 * This method supports nested calling, i. e. batch mode can be turned more than once.
		 * In this case, batch mode will not end until it has been turned off once for each
		 * turning on.
		 *
		 * @param batchMode {Boolean} true to activate batch mode, false to deactivate
		 * @return {Boolean} true if batch mode is active, false otherwise
		 * @throws {Error} if batch mode is turned off once more than it has been turned on
		 */
		setBatchMode: function (batchMode) {
			if (batchMode) {
				this.__batchModeCount++;
			}
			else if (this.__batchModeCount === 0) {
				throw new Error("Try to turn off batch mode although it was not turned on.");
			}
			else {

				this.__batchModeCount--;
				if (this.__hadBatchModeEvent) {
					this.__hadBatchModeEvent = false;
					this.fireChangeSelection();
				}
			}
		},

		/**
		 * Returns whether the SelectionModel is in batch mode.
		 */
		isBatchMode: function () {
			return this.__batchModeCount > 0;
		},

		/**
		 * Sets the selected range. This will clear the former selection.
		 *
		 * @param fromCol {Integer} the first column of the selection (including); -1 = all columns.
		 * @param fromRow {Integer} the last row of the selection (including); -1 = all rows.
		 * @param toCol {Integer?} the last column of the selection (including); optional.
		 * @param toRow {Integer?} the last row of the selection (including); optional.
		 * @returns {Boolean} True if the selection has changed.
		 */
		setSelectionRange: function (fromCol, fromRow, toCol, toRow) {

			if (toCol == undefined)
				toCol = fromCol;
			if (toRow == undefined)
				toRow = fromRow;

			if (this.__selectionRanges.length == 1) {
				var current = this.__selectionRanges[0];
				if (current.minCol == fromCol && current.minRow == fromRow &&
					current.maxCol == toCol && current.maxRow == toRow)
					return false;
			}

			this._resetSelection();
			this.addSelectionRange(fromCol, fromRow, toCol, toRow);
			return true;
		},

		/**
		 * Adds the selection range to the current selected ranges.
		 *
		 * @param fromCol {Integer} the first column of the selection (including); -1 = all columns.
		 * @param fromRow {Integer} the last row of the selection (including); -1 = all rows.
		 * @param toCol {Integer?} the last column of the selection (including); optional.
		 * @param toRow {Integer?} the last row of the selection (including); optional.
		 * @returns {Boolean} Always true.
		 */
		addSelectionRange: function (fromCol, fromRow, toCol, toRow) {

			if (toCol == undefined)
				toCol = fromCol;
			if (toRow == undefined)
				toRow = fromRow;

			this.__leadSelection = { col: toCol, row: toRow };
			this.__anchorSelection = { col: fromCol, row: fromRow };

			var minCol = Math.min(fromCol, toCol);
			var minRow = Math.min(fromRow, toRow);
			var maxCol = Math.max(fromCol, toCol);
			var maxRow = Math.max(fromRow, toRow);

			// insert the new range.
			var i = 0;
			for (var l = this.__selectionRanges.length; i < l; i++) {

				var range = this.__selectionRanges[i];

				if (range.maxCol === minCol && range.maxRow > minRow)
					break
				if (range.maxRow === minRow && range.maxCol > minCol)
					break
			}
			this.__selectionRanges.splice(i, 0, {
				minCol: minCol, minRow: minRow,
				maxCol: maxCol, maxRow: maxRow
			});

			// merge overlapping ranges.
			var lastRange = this.__selectionRanges[0];
			for (var i = 1; i < this.__selectionRanges.length; i++) {

				var range = this.__selectionRanges[i];

				// extend rows?
				if (lastRange.minCol === range.minCol && lastRange.maxCol === range.maxCol) {
					if (lastRange.maxRow + 1 >= range.minRow) {

						lastRange.minRow = Math.min(lastRange.minRow, range.minRow);
						lastRange.maxRow = Math.max(lastRange.maxRow, range.maxRow);
						this.__selectionRanges.splice(i, 1);
						i--;
						continue;
					}
				}
				// extend columns?
				else if (lastRange.minRow === range.minRow && lastRange.maxRow === range.maxRow) {
					if (lastRange.maxCol + 1 >= range.minCol) {

						lastRange.minCol = Math.min(lastRange.minCol, range.minCol);
						lastRange.maxCol = Math.max(lastRange.maxCol, range.maxCol);
						this.__selectionRanges.splice(i, 1);
						i--;
						continue;
					}
				}
				// extend columns and rows?
				else if (lastRange.minCol <= range.minCol && lastRange.maxCol >= range.maxCol
					&& lastRange.minRow <= range.minRow && lastRange.maxRow >= range.maxRow) {

					lastRange.minRow = Math.min(lastRange.minRow, range.minRow);
					lastRange.maxRow = Math.max(lastRange.maxRow, range.maxRow);
					lastRange.minCol = Math.min(lastRange.minCol, range.minCol);
					lastRange.maxCol = Math.max(lastRange.maxCol, range.maxCol);
					this.__selectionRanges.splice(i, 1);
					i--;
					continue;
				}

				lastRange = range;
			}

			this.fireChangeSelection();
			return true;
		},

		/**
		 * Removes the selection range to the current selected ranges.
		 *
		 * @param fromCol {Integer} the first column of the selection (including); -1 = all columns.
		 * @param fromRow {Integer} the last row of the selection (including); -1 = all rows.
		 * @param toCol {Integer?} the last column of the selection (including); optional.
		 * @param toRow {Integer?} the last row of the selection (including); optional.
		 * @returns {Boolean} True if the selection has changed.
		 */
		removeSelectionRange: function (fromCol, fromRow, toCol, toRow) {

			if (toCol == undefined)
				toCol = fromCol;
			if (toRow == undefined)
				toRow = fromRow;

			this.__leadSelection = { col: toCol, row: toRow };
			this.__anchorSelection = { col: fromCol, row: fromRow };

			var minCol = Math.min(fromCol, toCol);
			var minRow = Math.min(fromRow, toRow);
			var maxCol = Math.max(fromCol, toCol);
			var maxRow = Math.max(fromRow, toRow);

			var changed = false;

			for (var i = 0; i < this.__selectionRanges.length; i++) {

				var range = this.__selectionRanges[i];

				// range included in the removal?
				if (minCol <= range.minCol && maxCol >= range.maxCol &&
					minRow <= range.minRow && maxRow >= range.maxRow) {

					this.__selectionRanges.splice(i, 1);
					i--;
					changed = true;
					continue;
				}

				// reduce rows?
				if (range.minCol === minCol && range.maxCol === maxCol) {
					// crop bottom.
					if (minRow <= range.maxRow && maxRow >= range.maxRow) {
						range.maxRow = minRow - 1;
						changed = true;
					}
					// crop top.
					if (minRow <= range.minRow && maxRow >= range.minRow) {
						range.minRow = maxRow + 1;
						changed = true;
					}
					// split
					if (minRow > range.minRow && maxRow < range.maxRow) {

						var newRange = {
							minCol: range.minCol,
							minRow: maxRow + 1,
							maxCol: range.maxCol,
							maxRow: range.maxRow
						};

						range.maxRow = minRow - 1;

						this.__selectionRanges.splice(i + 1, 0, newRange);
						changed = true;
						break;
					}
				}

				// reduce columns?
				if (range.minRow === minRow && range.maxRow === maxRow) {
					// crop right.
					if (minCol <= range.maxCol && maxCol >= range.maxCol) {
						range.maxCol = minCol - 1;
						changed = true;
					}
					// crop left.
					if (minCol <= range.minCol && maxCol >= range.minCol) {
						range.minCol = maxCol + 1;
						changed = true;
					}
					// split
					if (minCol > range.minCol && maxCol < range.maxCol) {

						var newRange = {
							minCol: maxCol + 1,
							minRow: range.minRow,
							maxCol: range.maxCol,
							maxRow: range.maxRow
						};

						range.maxCol = minCol - 1;

						this.__selectionRanges.splice(i + 1, 0, newRange);
						changed = true;
						break;
					}
				}
			}

			if (changed)
				this.fireChangeSelection();

			return changed;
		},

		/**
		 * Changes the selection state of the specified column.
		 * 
		 * @param col {Integer} column to select or deselect.
		 * @param selected {Boolean} True to select and False to deselect the column.
		 */
		setColumnSelected: function (col, selected) {

			// preserve the lead and anchor.
			var leadCol, anchorCol;
			if (this.__leadSelection)
				leadCol = this.__leadSelection.col;
			if (this.__anchorSelection)
				anchorCol = this.__anchorSelection.col;

			try {

				if (selected)
					this.addSelectionRange(col, -1);
				else
					this.removeSelectionRange(col, -1);

			} finally {
				if (this.__leadSelection)
					this.__leadSelection.col = leadCol;
				if (this.__anchorSelection)
					this.__anchorSelection.col = anchorCol;
			}
		},

		/**
		 * Fires the "changeSelection" event to all registered listeners. If the selection model
		 * currently is in batch mode, only one event will be thrown when batch mode is ended.
		 */
		fireChangeSelection: function () {

			if (this.isBatchMode()) {
				this.__hadBatchModeEvent = true;
			} else {
				this.fireEvent("changeSelection");
			}
		},

		/**
		 * Returns whether a row is selected.
		 *
		 * @param row {Integer} the index of the row to check.
		 * @return {Boolean} whether the row is selected.
		 */
		isRowSelected: function (row) {

			if (this.isSelectionEmpty())
				return false;

			var cell = { col: -1, row: row };
			return this._any(function (r) {
				return this._includesCell(r, cell);
			});
		},

		/**
		 * Returns whether a column is selected.
		 *
		 * @param col {Integer} the index of the column to check.
		 * @return {Boolean} whether the column is selected.
		 */
		isColumnSelected: function (col) {

			if (this.isSelectionEmpty())
				return false;

			var cell = { col: col, row: -1 };
			return this._any(function (r) {
				return this._includesCell(r, cell);
			});
		},

		/**
		 * Returns whether a cell is selected.
		 *
		 * @param col {Integer} the index of the column to check.
		 * @param row {Integer} the index of the row to check.
		 * @return {Boolean} whether the cell is selected.
		 */
		isCellSelected: function (col, row) {

			if (this.isSelectionEmpty())
				return false;

			var cell = { col: col, row: row };
			return this._any(function (r) {
				return this._includesCell(r, cell);
			});
		},

		/**
		 * Returns whether any cell in the row is selected.
		 * @param row {Integer} the index of the row to check.
		 * @return {Boolean} whether the row contains any selected cell.
		 */
		isAnyCellSelected: function (row) {

			if (this.isSelectionEmpty())
				return false;

			return this._any(function (r) {
				return r.minCol === -1 || r.maxCol === -1 || r.minRow <= row || r.maxRow >= row;
			});
		},

		// *****************************************************************************
		// Internal implementation.
	    // *****************************************************************************

		_any: function (callback) {

			for (var i = 0, l = this.__selectionRanges.length; i < l; i++) {

				if (callback.call(this, this.__selectionRanges[i]))
					return true;
			}
			return false;
		},

		_resetSelection: function () {

			this.__selectionRanges = [];
			this.__leadSelection = null;
			this.__anchorSelection = null;
		},

		_includesCell: function (range1, cell) {

			// col === -1 means all cols are selected.
			// row === -1 means all rows are selected.

			return (range1.minRow === -1 || cell.row >= range1.minRow)
				&& (range1.minCol === -1 || cell.col >= range1.minCol)
				&& (range1.maxRow === -1 || cell.row <= range1.maxRow)
				&& (range1.maxCol === -1 || cell.col <= range1.maxCol);
		}

	}
});