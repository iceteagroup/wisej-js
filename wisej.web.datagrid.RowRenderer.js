﻿///////////////////////////////////////////////////////////////////////////////
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
 * wisej.web.datagrid.RowRenderer
 *
 * Implements a dynamic row renderer: it selects the row
 * renderer according to the single row's configuration.
 */
qx.Class.define("wisej.web.datagrid.RowRenderer", {

	extend: qx.core.Object,
	implement: qx.ui.table.IRowRenderer,

	/**
	 * Initializes the dynamic row renderer.
	 *
	 * @param defaultCellRenderer {Object} The default cell renderer .
	 * @param defaultRowHeaderRenderer {Object} The default row header renderer .
	 */
	construct: function (defaultRowRenderer) {

		this.base(arguments);

		this.__rowRenderers = {};

		this.__defaultRowRenderer = defaultRowRenderer || new wisej.web.datagrid.rowRenderer.Row();
	},

	statics: {

		// default css rules to add to all table row classes generated by the datagrid's style manager.
		DEFAULT_CSS: "position:relative; overflow:visible; height:100%; box-sizing:border-box",

	},

	members: {

		// map of shared row renderers.
		__rowRenderers: null,

		// the default row renderer instance.
		__defaultRowRenderer: null,

		/**
		 * Returns the css class name for the row.
		 */
		getRowClass: function (rowInfo) {

			return this.__getRowRenderer(rowInfo).getRowClass(rowInfo);
		},

		// overridden interface implementation.
		// returns the css style for the row.
		createRowStyle: function (rowInfo) {

			return this.__getRowRenderer(rowInfo).createRowStyle(rowInfo);
		},

		// update the css class directly on the row element.
		updateDataRowElement: function (rowInfo, rowElem) {

			this.__getRowRenderer(rowInfo).updateDataRowElement(rowInfo, rowElem);
		},

		/**
		 * Returns the row's border size.
		 *
		 * @param rowInfo {Map} The information about the row.
		 *          See {@link qx.ui.table.cellrenderer.Abstract#createDataCellHtml}.
		 * @return {Map} Contains the keys <code>top</code>, <code>right</code>,
		 *   <code>bottom</code> and <code>left</code>. All values are integers.
		 */
		getInsets: function (rowInfo) {

			return this.__getRowRenderer(rowInfo).getInsets(rowInfo);
		},

		/**
		 * Add extra attributes to each row.
		 *
		 * @return {String}
		 *   Any additional attributes and their values that should be added to the
		 *   div tag for the row.
		 */
		getRowAttributes: function (rowInfo) {

			return this.__getRowRenderer(rowInfo).getRowAttributes(rowInfo);
		},

		/**
		 * Get the row's height CSS style taking the box model into account
		 *
		 * @param height {Integer} The row's (border-box) height in pixel
		 * @return {String} CSS rule for the row height
		 */
		getRowHeightStyle: function (height) {

			return "height:" + height + "px;";
		},

		// overridden to disable the qooxdoo table themes
		initThemeValues: function () {
		},

		/**
		 * Returns (creates if it doesn't exist yet) the row renderer
		 * for the specific row according to the row's information.
		 */
		__getRowRenderer: function (rowInfo) {

			var className = null;

			// determine the cell renderer class.
			var rowData = rowInfo.rowData;

			if (rowData) {

				// first see if there is a cached renderer.
				var cachedRenderer = rowData.cachedRowRenderer;
				if (cachedRenderer)
					return cachedRenderer;

				var rowStyle = rowData.style;

				// see if the cell or the column specified a renderer class name.
				className = rowStyle != null ? rowStyle.renderer : null;

				if (className) {
					if (className.indexOf(".") == -1)
						className = "wisej.web.datagrid.rowRenderer." + className;
				}
			}

			// use the default renderer?
			if (!className)
				return this.__defaultRowRenderer;

			// retrieve or create the row renderer.
			var renderer = this.__rowRenderers[className];
			if (!renderer) {
				var clazz = qx.Class.getByName(className);
				this.__rowRenderers[className] = renderer = (clazz ? new clazz : this.__defaultRowRenderer);
			}

			// cache it for quick reuse.
			if (rowData)
				rowData.cachedRowRenderer = renderer;

			// done, return the actual cell renderer.
			return renderer;
		},
	},

	destruct: function () {

		this._disposeMap("__rowRenderers");
		this._disposeObjects("__defaultRowRenderer");
	}

});


/**
 * wisej.web.datagrid.rowrenderer.Row
 *
 * Extends the QX row renderer to support wisej
 * new theme system.
 *
 * This is the base class for all wisej row renderers.
 */
qx.Class.define("wisej.web.datagrid.rowRenderer.Row", {

	extend: qx.ui.table.rowrenderer.Default,

	/**
	 * @param table {qx.ui.table.Table} the table the scroller belongs to.
	 */
	construct: function (appearance) {

		this.base(arguments);

		this._styleMgr = wisej.web.datagrid.StyleManager.getInstance();

		// create the css classes needed to render standard cells.
		this._registerCssClasses();
	},

	properties: {

		/**
		 * Appearance key for the row renderer.
		 */
		appearance: { init: "table-row" },
	},

	members: {

		// style manager singleton reference: a bit faster to keep it here.
		_styleMgr: null,

		/**
		 * Returns the css class name for the row.
		 */
		getRowClass: function (rowInfo) {

			var styleMgr = this._styleMgr;
			var appearance = this.getAppearance();
			var state = this.getRowState(rowInfo);

			return qx.theme.manager.Decoration.CSS_CLASSNAME_PREFIX + "row "
				+ styleMgr.getCssClass(appearance, state, wisej.web.datagrid.RowRenderer.DEFAULT_CSS)
				+ this._getCssClass(rowInfo);
		},

		// builds the state map for the row.
		getRowState: function (rowInfo) {

			var state = {};

			// focused?
			if (rowInfo.focusedRow && this.getHighlightFocusRow()) {

				state.focused = true;
			}

			// selected?
			if (rowInfo.selected) {
				state.selected = true;
			}

			// even or odd...
			if (rowInfo.row % 2 === 0)
				state.even = true;
			else
				state.odd = true;

			// cell border.
			if (rowInfo.table)
				state[rowInfo.table._cellBorderStyle] = true;

			// new row?
			var rowData = rowInfo.rowData;
			if (rowData && rowData.newRow)
				state.new = true;

			// is any cell in the row being edited?
			if (rowInfo.focusedRow && rowInfo.table && rowInfo.table.isEditing())
				state.editing = true;

			return state;
		},

		// overridden interface implementation.
		// returns the css style for the row.
		createRowStyle: function (rowInfo) {

			var style = "";
			var table = rowInfo.table;
			var rowData = rowInfo.rowData;
			var rowHeight = rowInfo.styleHeight;

			if (table && !table.isKeepSameRowHeight()) {

				rowHeight = (rowData ? rowData.height : null) || rowHeight;

				// update the caller's row height using the height specified in the model.
				rowInfo.styleHeight = rowHeight;
			}

			var backColor = null;
			var rowStyle = rowData ? rowData.style : null;
			var defaultStyle = table.getDefaultCellStyle();
			var colorMgr = qx.theme.manager.Color.getInstance();

			// apply the style in this order: default + rowStyle.
			if (defaultStyle)
				backColor = defaultStyle.backgroundColor;
			if (rowStyle && rowStyle.backgroundColor)
				backColor = rowStyle.backgroundColor;

			if (backColor)
				style += "background-color:" + colorMgr.resolve(backColor) + ";";

			// add t a reversed z-index to let a row overlap following rows when rowSpan > 1.
			var rowCount = rowInfo.tableModel.getRowCount();
			style += this.getRowHeightStyle(rowHeight) + "z-index:" + (rowCount - rowInfo.row);

			// add the css style string from the server.
			style += this._getCssStyle(rowInfo);

			return style;
		},

		// update the css class directly on the row element.
		updateDataRowElement: function (rowInfo, rowElem) {

			// update the row element.
			var className = this.getRowClass(rowInfo);
			rowElem.className = className;

			var cellInfo = rowInfo;
			var table = rowInfo.table;
			var tableModel = table.getTableModel();
			var columnModel = table.getTableColumnModel();
			var paneModel = rowInfo.scroller.getTablePaneModel();
			var colCount = paneModel.getColumnCount();

			// propagate the class change to the child cells.
			var rtl = table.getRtl();
			var childNodes = rowElem.childNodes;
			for (var x = 0; x < colCount; x++) {

				// invoke the cell renderer to update the cell element.
				var cellNode = childNodes[rtl ? (colCount - x - 1) : x];

				var col = paneModel.getColumnAtX(x);
				if (col != null && col >= 0 && cellNode) {
					cellInfo.col = col;
					cellInfo.xPos = x;
					cellInfo.editable = tableModel.isColumnEditable(col);
					cellInfo.styleWidth = columnModel.getColumnWidth(col);

					var cellRenderer = columnModel.getDataCellRenderer(col);
					cellRenderer.updateDataCellElement(cellInfo, cellNode);
				}
			}
		},

		/**
		 * Returns the row's border size.
		 *
		 * @param rowInfo {Map} The information about the row.
		 *          See {@link qx.ui.table.cellrenderer.Abstract#createDataCellHtml}.
		 * @return {Map} Contains the keys <code>top</code>, <code>right</code>,
		 *   <code>bottom</code> and <code>left</code>. All values are integers.
		 */
		getInsets: function (rowInfo) {

			return this._styleMgr.getBorder(this.getAppearance(), this.getRowState(rowInfo));
		},

		/**
		 * Get the row's height CSS style taking the box model into account
		 *
		 * @param height {Integer} The row's (border-box) height in pixel
		 * @return {String} CSS rule for the row height
		 */
		getRowHeightStyle: function (height) {

			return "height:" + height + "px;";
		},

		/**
		 * Add extra attributes to each row.
		 *
		 * @return {String}
		 *   Any additional attributes and their values that should be added to the
		 *   div tag for the row.
		 */
		getRowAttributes: function (rowInfo) {

			return "role='row' row='" + rowInfo.row + "' ";

		},

		/**
		 * Returns the combined custom css style assigned to the row.
		 */
		_getCssStyle: function (rowInfo) {

			var rowData = rowInfo.rowData;
			if (rowData) {

				var styles = [];
				var rowStyle = rowData.style ? rowData.style.style : null;

				if (rowStyle)
					styles.push(rowStyle);

				if (styles.length > 0)
					return ";" + styles.join(";");
			}

			return "";
		},

		/**
		 * Returns the combined custom css class name assigned to the table, or row DataGridViewStyle objects.
		 */
		_getCssClass: function (rowInfo) {

			var rowData = rowInfo.rowData;
			if (rowData) {

				var classes = [];
				var rowClass = rowData.style ? rowData.style.class : null;

				if (rowClass)
					classes.push(rowClass);

				if (classes.length > 0)
					return " " + classes.join(" ");
			}

			return "";
		},

		/**
		 * Creates the additional css classes needed for this renderer.
		 */
		_registerCssClasses: function () {

			var styleMgr = this._styleMgr;

			var appearance = this.getAppearance();
			styleMgr.getCssClass(appearance, {}, wisej.web.datagrid.RowRenderer.DEFAULT_CSS);
			styleMgr.getCssClass(appearance, { focused: true, selected: true }, wisej.web.datagrid.RowRenderer.DEFAULT_CSS);
			styleMgr.getCssClass(appearance, { focused: false, selected: true }, wisej.web.datagrid.RowRenderer.DEFAULT_CSS);
		},

	}
});