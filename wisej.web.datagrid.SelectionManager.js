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
 * wisej.web.datagrid.SelectionManager
 */
qx.Class.define("wisej.web.datagrid.SelectionManager", {

	extend: qx.core.Object,

	construct: function (table) {

		this.base(arguments, true /* weakReference */);

		this.table = table;
	},

	properties: {

		/**
		 * The selection model where to set the selection changes.
		 */
		selectionModel: { check: "wisej.web.datagrid.SelectionModel" },

		/**
		 * MultiSelect
		 * 
		 * Enables the multiple selection of cells, rows, and columns.
		 */
		multiSelect: { init: true, check: "Boolean" },

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
	},

	members:
	{
		/** 
		 *  Reference to the wisej.web.DataGrid widget.
		 */
		table: null,

		/**
		 * Applies the SelectionMode property.
		 */
		_applySelectionMode: function (value) {

			var selectionModel = this.getSelectionModel();
			if (selectionModel)
				selectionModel.resetSelection();
		},

		/**
		 * Handles the tap event.
		 *
		 * @param col {Integer} the index the column under the pointer.
		 * @param row {Integer} the index the row under the pointer.
		 * @param e {qx.event.type.Tap} the pointer event.
		 */
		handleTap: function (col, row, e) {

			if (e.isLeftPressed()) {

				this._handleSelectEvent(col, row, e);

			} else if (e.isRightPressed() && e.getModifiers() == 0) {

				var selectionModel = this.getSelectionModel();
				if (!selectionModel.isCellSelected(col, row)) {

					// the cell is not selected -> set the selection to the specified cell.
					selectionModel.setSelectionRange(col, row);
				}
			}
		},

		/**
		   * Handles the key down event that is used as replacement for pointer taps
		   * (Normally space).
		   *
		   * @param col {Integer} the index of the columns that is currently focused.
		   * @param row {Integer} the index of the row that is currently focused.
		   * @param e {Map} the key event.
		   */
		handleSelectKeyDown: function (col, row, e) {

			this._handleSelectEvent(col, row, e);
		},

		/**
		 * Handles a key down event that moved the focus (E.g. up, down, home, end, ...).
		 *
		 * @param col {Integer} the index of the columns that is currently focused.
		 * @param row {Integer} the index of the row that is currently focused.
		 * @param e {Map} the key event.
		 */
		handleMoveKeyDown: function (col, row, e) {

			var selectionModel = this.getSelectionModel();

			col = this.__adjustColIndex(col);
			row = this.__adjustRowIndex(row);
			if (col == null || row == null)
				return;

			switch (e.getModifiers()) {

				case 0:
					selectionModel.setSelectionRange(col, row);
					break;

				case qx.event.type.Dom.SHIFT_MASK:
				case qx.event.type.Dom.SHIFT_MASK | qx.event.type.Dom.CTRL_MASK:

					var anchor = selectionModel.getAnchor();

					if (anchor == null) {
						selectionModel.setSelectionRange(col, row);
					} else {
						selectionModel.setSelectionRange(anchor.col, anchor.row, col, row);
					}

					break;
			}
		},

		// *****************************************************************************
		// Internal implementation.
	    // *****************************************************************************

		/**
		 * Handles a select event.
		 *
		 * @param col {Integer} the index the column under the pointer.
		 * @param row {Integer} the index the row under the pointer.
		 * @param evt {Map} the pointer event.
		 */
		_handleSelectEvent: function (col, row, e) {

			var selectionModel = this.getSelectionModel();

			col = this.__adjustColIndex(col);
			row = this.__adjustRowIndex(row);
			if (col == null || row == null)
				return;

			var multi = this.isMultiSelect();
			var lead = selectionModel.getLead();
			var anchor = selectionModel.getAnchor();

			if (multi && e.isShiftPressed()) {

				if (selectionModel.isSelectionEmpty() || (col != lead.col || row != lead.row)) {

					if (anchor == null) {

						if (e.isCtrlOrCommandPressed()) {
							selectionModel.addSelectionRange(col, row);
						} else {
							selectionModel.setSelectionRange(col, row);
						}
					}
					else {
						if (e.isCtrlOrCommandPressed()) {
							selectionModel.addSelectionRange(anchor.col, anchor.row, col, row);
						} else {
							selectionModel.setSelectionRange(anchor.col, anchor.row, col, row);
						}
					}
				}
			}
			else if (multi && e.isCtrlOrCommandPressed()) {

				if (selectionModel.isCellSelected(col, row)) {
					selectionModel.removeSelectionRange(col, row);
				} else {
					selectionModel.addSelectionRange(col, row);
				}
			}
			else {

				selectionModel.setSelectionRange(col, row);
			}
		},

		__adjustRowIndex: function (row) {

			var isColHeader = row === -1;
			switch (this.getSelectionMode()) {

				case "none":
					row = null;
					break;

				case "cell":
					if (isColHeader)
						row = null;
					break;

				case "rowHeader":
					if (isColHeader)
						row = null;
					break;

				case "columnHeader":
					if (isColHeader)
						row = -1;
					break;

				case "rowColumnHeader":
					if (isColHeader)
						row = -1;
					break;

				case "column":
					row = -1;
					break;

				case "row":
					if (isColHeader)
						return null;
					break;
			}

			return row;
		},

		__adjustColIndex: function (col) {

			var isRowHeader = col === null || col === this.table.getRowHeaderIndex();

			switch (this.getSelectionMode()) {

				case "none":
					col = null;
					breakk;

				case "cell":
					if (isRowHeader)
						col = null;
					break;

				case "rowHeader":
					if (isRowHeader)
						col = -1;
					break;

				case "columnHeader":
					if (isRowHeader)
						col = null;
					break;

				case "rowColumnHeader":
					if (isRowHeader)
						col = -1;
					break;

				case "row":
					col = -1;
					break;

				case "column":
					if (isRowHeader)
						col = null;
					break;
			}

			return col;
		}
	}

});
