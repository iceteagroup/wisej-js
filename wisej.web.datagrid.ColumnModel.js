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
 * wisej.web.datagrid.ColumnModel
 */
qx.Class.define("wisej.web.datagrid.ColumnModel", {

	extend: qx.ui.table.columnmodel.Basic,

	members: {

		init: function (colCount, table, dataRenderer, editorFactory, headerRenderer) {

			// dispose existing renderers.
			if (dataRenderer)
			{
				if (dataRenderer != this.__dataRenderer && this.__dataRenderer)
					this.__dataRenderer.dispose();
			}

			if (editorFactory) {
				if (editorFactory != this.__editorFactory && this.__editorFactory)
					this.__editorFactory.dispose();
			}

			if (headerRenderer) {
				if (headerRenderer != this.__headerRenderer && this.__headerRenderer)
					this.__headerRenderer.dispose();
			}

			// assign or recreate.
			this.__dataRenderer = dataRenderer || this.__dataRenderer || new wisej.web.datagrid.CellRenderer();
			this.__editorFactory = editorFactory || this.__editorFactory || new wisej.web.datagrid.EditorFactory();
			this.__headerRenderer = headerRenderer || this.__headerRenderer || new wisej.web.datagrid.HeaderRenderer();

			if (!this.hasListener("dataChanged")) {
				this.addListener("dataChanged", table._onColDataChanged, table);
				this.addListener("styleChanged", table._onColStyleChanged, table);
				this.addListener("selectionChanged", table._onColSelectionChanged, table);
			}

			this.base(arguments, colCount, table);
		},

		/**
		 * Sets the style shared by all the cells in a column. 
		 *
		 * Note: The style is applied to all the cells in the column, not the column header.
		 *
		 * @param col {Integer} The model index of the column.
		 * @param style {Map} The style map.
		 */
		setColumnStyle: function (col, style) {

			if (qx.core.Environment.get("qx.debug")) {
				this.assertInteger(col, "Invalid argument 'col'.");
				this.assertNotUndefined(this.__columnDataArr[col], "Column not found in table model");
			}

			var oldStyle = this.__columnDataArr[col].style;
			this.__columnDataArr[col].style = style;

			if (!this.__internalChange) {
				this.fireDataEvent("styleChanged", {
					col: col,
					newStyle: style,
					oldStyle: oldStyle
				});
			}
		},

		/**
		 * Returns the style shared by all the cells in a column. 
		 *
		 * @param col {Integer} the model index of the column.
		 * @return {Map} the style map..
		 */
		getColumnStyle: function (col) {

			if (qx.core.Environment.get("qx.debug")) {
				this.assertInteger(col, "Invalid argument 'col'.");
				this.assertNotUndefined(this.__columnDataArr[col], "Column not found in table model");
			}

			return this.__columnDataArr[col].style;
		},

		/**
		 * Sets the data shared by all the cells in a column. 
		 *
		 * @param col {Integer} The model index of the column.
		 * @param data {Map} The data map.
		 */
		setColumnData: function (col, data) {

			if (qx.core.Environment.get("qx.debug")) {
				this.assertInteger(col, "Invalid argument 'col'.");
				this.assertNotUndefined(this.__columnDataArr[col], "Column not found in table model");
			}

			var oldData = this.__columnDataArr[col].data;
			this.__columnDataArr[col].data = data;

			if (!this.__internalChange) {
				this.fireDataEvent("dataChanged", {
					col: col,
					newData: data,
					oldData: oldData
				});
			}
		},

		/**
		 * Returns the data shared with all the cells of a column.
		 *
		 * @param col {Integer} the model index of the column.
		 * @return {Map} the data map.
		 */
		getColumnData: function (col) {

			if (qx.core.Environment.get("qx.debug")) {
				this.assertInteger(col, "Invalid argument 'col'.");
				this.assertNotUndefined(this.__columnDataArr[col], "Column not found in table model");
			}

			return this.__columnDataArr[col].data;
		},

		/**
		 * Sets the selected state of a column. 
		 *
		 * @param col {Integer} The model index of the column.
		 * @param selected {Boolean} The selected flag.
		 */
		setColumnSelected: function (col, selected) {

			if (qx.core.Environment.get("qx.debug")) {
				this.assertInteger(col, "Invalid argument 'col'.");
				this.assertNotUndefined(this.__columnDataArr[col], "Column not found in table model");
			}

			var oldSelected = this.__columnDataArr[col].selected || false;
			this.__columnDataArr[col].selected = selected || false;

			if (!this.__internalChange) {
				this.fireDataEvent("selectionChanged", {
					col: col,
					newSelected: selected,
					oldSelected: oldSelected
				});
			}
		},

		/**
		 * Returns the selected state of a column.
		 *
		 * @param col {Integer} the model index of the column.
		 * @return {Boolean} the selected state.
		 */
		getColumnSelected: function (col) {

			if (qx.core.Environment.get("qx.debug")) {
				this.assertInteger(col, "Invalid argument 'col'.");
				this.assertNotUndefined(this.__columnDataArr[col], "Column not found in table model");
			}

			return this.__columnDataArr[col].selected || false;
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

			// ensures that the new positions don't exceed the number of columns.
			if (newPositions) {
				var positions = [];
				var count = this.getOverallColumnCount();

				// assign valid positions.
				for (var i = 0; i < count; i++) {
					var pos = newPositions[i];
					if (pos > -1 && pos < count && !qx.lang.Array.contains(positions, pos))
						positions.push(pos);
					else
						positions.push(-1);
				}

				// fill in the voids.
				for (var i = 0; i < count; i++) {
					if (positions[i] === -1) {
						// find next available position.
						for (var pos = 0; pos < count; pos++) {
							if (!qx.lang.Array.contains(positions, pos)) {
								positions[i] = pos;
								break;
							}
						}
					}
				}
			}

			this.base(arguments, positions);
		}
	}
});