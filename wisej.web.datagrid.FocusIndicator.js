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
 * wisej.web.datagrid.FocusIndicator
 */
qx.Class.define("wisej.web.datagrid.FocusIndicator",
{
	extend: qx.ui.table.pane.FocusIndicator,

	construct: function (scroller) {

		this.base(arguments, scroller);

		// pass all pointer events through the focus indicator.
		this.getContentElement().setStyles({
			"disabled": "disabled",
			"pointer-events": "none"
		});
	},

	properties: {

		// appearance override.
		appearance: { init: "focus-indicator", refine: true },

	},
	members:
	{
		// Overridden.
		// When the focus indicator gets the "editing" state
		// we disable all the pointer events.
		addState: function (state) {

			if (state === "editing") {
				// capture pointer events.
				this.getContentElement().setStyles({
					"disabled": null,
					"pointer-events": null
				});
			}

			this.base(arguments, state);

		},

		// Overridden.
		// When the focus indicator loses the "editing" state
		// we re-enabled all the pointer events.
		removeState: function (state) {

			if (state === "editing") {
				// pass all pointer events through the focus indicator.
				this.getContentElement().setStyles({
					"pointer-events": "none",
					"disabled": "disabled"
				});
			}

			this.base(arguments, state);
		},

		/**
		 * Move the focus indicator to the given table cell.
		 *
		 * @param col {Integer?null} The table column
		 * @param row {Integer?null} The table row
		 */
		moveToCell: function (col, row) {

			if (col == null || row == null) {
				this.hide();
				this.setRow(null);
				this.setColumn(null);

				return;
			}

			var table = this.__scroller.getTable();
			var tableModel = table.getTableModel();
			var paneModel = this.__scroller.getTablePaneModel();

			// check if the focus indicator is shown and if the column is
			// editable. if not, just exclude the indicator because the pointer events
			// should go to the cell itself [BUG #4250]
			if (!this.__scroller.getShowCellFocusIndicator() && !tableModel.isColumnEditable(col)) {
				this.hide();
				return;
			}
			if (paneModel.getColumnCount() == 0) {
				this.hide();
				return;
			}

			var xPos = paneModel.getX(col);

			if (xPos === -1) {

				this.hide();
				this.setRow(null);
				this.setColumn(null);
			}
			else {

				//var rowData = tableModel.getRowData(row);
				//if (!rowData)
				//	// the row is not loaded yet.
				//	return;

				var columnModel = table.getTableColumnModel();
				var cellRenderer = columnModel.getDataCellRenderer(col);

				// use the row and cell renderer to calculate the inset (borders) of the cell and the row
				// in order to place the focus indicator *exactly* on top of the cell and expanded just enough
				// so that the indicator's border is outside of the cell.
				var cellInfo = {
					row: row,
					col: col,
					table: table,
					focusedCol: true,
					columnModel: columnModel
				};
				var cellInsets = cellRenderer.getInsets(cellInfo);

				// place the focus indicator widget.
				var rowHeight = tableModel.getRowHeight(row);
				var y = this.__scroller.getRowTop(row);
				var w = columnModel.getColumnWidth(col);
				var h = rowHeight;

				if (y == null) {
					this.hide();
					this.setRow(null);
					this.setColumn(null);
					return;
				}

				// hide if behind frozen rows band.
				if (row >= table.getFrozenRows() && y < this.__scroller.getFrozenRowsHeight()) {
					this.hide();
					return;
				}

				var x = (!table.isRtl())
					? paneModel.getColumnLeft(col)
					: paneModel.getTotalWidth() - paneModel.getColumnLeft(col) - w;

				// apply the insets to offset the rect. we need to consider that the rectangle to include
				// is also affected by the row above and the cell to the left.
				x += cellInsets.left;
				y += cellInsets.top;
				w -= cellInsets.left + cellInsets.right;
				h -= cellInsets.top + cellInsets.bottom;

				this.setRow(row);
				this.setColumn(col);
				this.setUserBounds(x, y, w, h);

				if (table._isFocused())
					this.show();
			}
		},

		// overridden.
		_applyDecorator: function (value, old) {

			try {
				this.base(arguments, value, old);
			}
			catch (e) { }
		},

		// overridden to disable the base and let the events pass.
		_onKeyPress: function (e) {
		},

		/**
		 * Returns the widget's border size.
		 *
		 * @return {Map} Contains the keys <code>top</code>, <code>right</code>,
		 *   <code>bottom</code> and <code>left</code>. All values are integers.
		 */
		getInsets: function () {
			var top = 0;
			var right = 0;
			var bottom = 0;
			var left = 0;

			var name = this.getDecorator();
			if (name) {
				var decorator = qx.theme.manager.Decoration.getInstance().resolve(name);
				if (decorator) {
					var inset = decorator.getInsets();
					top += inset.top;
					right += inset.right;
					bottom += inset.bottom;
					left += inset.left;
				}
			}

			return {
				top: top,
				right: right,
				bottom: bottom,
				left: left
			};
		},

	}
});
