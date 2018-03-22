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
	}
});