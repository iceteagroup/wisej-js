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
 * wisej.web.PropertyGrid
 *
 * PropertyGrid implementation.
 * Uses an inner wisej.web.DataGrid widget in a vertical layout
 * with a top tools container and a bottom description panel.
 *
 */
qx.Class.define("wisej.web.PropertyGrid", {

	extend: qx.ui.container.Composite,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	/**
	 * Constructor
	 */
	construct: function () {

		this.base(arguments, new qx.ui.layout.Basic());

		this.addListenerOnce("appear", this.__onLoad);
	},

	properties: {

		// overridden.
		appearance: { init: "propertygrid", refine: true },

		/**
		 * Indent property.
		 *
		 * Defines how many pixels to indent expandable properties.
		 */
		indent: { init: 20, check: "PositiveInteger", themeable: true, apply: "__updateView" },

		/**
		 * Determines the height of the rows.
		 */
		rowHeight: { init: 24, check: "PositiveInteger", themeable: true, apply: "__updateView" },

		/**
		 * Determines the width of the row header.
		 */
		headerWidth: { init: 24, check: "PositiveInteger", themeable: true, apply: "__updateView" },

		/**
		 * Reference to the internal DataGrid view.
		 */
		gridView: { init: null, check: "wisej.web.propertygrid.GridView", apply: "__updateView", transform: "_transformComponent" },
	},

	members: {

		// updates the inner DataGrid.
		__updateView: function () {

			qx.ui.core.queue.Widget.add(this, "updateView");
		},

		__onLoad: function () {

			// update the grid properties that cannot be set as direct properties.
			var gridView = this.getGridView();
			if (gridView) {
				var header = gridView.getColumns()[0];
				if (header) {
					header.setWidth(this.getHeaderWidth());
				}
			}
		},

		/**
		 * Tools property.
		 *
		 * Collection of tool definitions to display next to the edit field.
		 */
		getTools: function () {

			var gridView = this.getGridView();
			return gridView != null
				? gridView.getToolsPosition()
				: null;
		},
		setTools: function (value) {

			var gridView = this.getGridView();
			if (gridView != null)
				gridView.setTools(value);
		},

		/**
		 * ToolsPosition property.
		 *
		 * Returns or sets the position of the tools container.
		 */
		getToolsPosition: function () {

			var gridView = this.getGridView();
			return gridView != null
				? gridView.getToolsPosition()
				: "top";

		},
		setToolsPosition: function (value) {

			var gridView = this.getGridView();
			if (gridView != null)
				gridView.setToolsPosition(value);
		},

		syncWidget: function (jobs) {

			this.base(arguments, jobs);

			if (!jobs)
				return;

			if (jobs["updateView"]) {

				var gridView = this.getGridView();
				if (gridView) {
					gridView.setIndent(this.getIndent());
					gridView.setRowHeight(this.getRowHeight());
				}
			}
		},


		/*---------------------------------------------------------------------------
		  focus redirection overrides
		---------------------------------------------------------------------------*/

		tabFocus: function () {

			var gridView = this.getGridView();
			if (gridView)
				gridView.focus();
		},

		focus: function () {

			var gridView = this.getGridView();
			if (gridView)
				gridView.focus();
		},
	}

});


/**
 * wisej.web.propertygrid.GridView
 *
 * Represents the view in the PropertyGrid.
 */
qx.Class.define("wisej.web.propertygrid.GridView", {

	extend: wisej.web.DataGrid,

	construct: function () {

		this.base(arguments);

		// use the PropertyGrid row renderer.
		this.getDataRowRenderer().dispose();
		this.setDataRowRenderer(new wisej.web.propertygrid.RowRenderer());

		// set defaults.
		this.setBorderStyle("none");
	},

	properties: {

		/**
		 * Appearance key for the grid view of the property grid.
		 */
		appearance: { init: "propertygrid/grid", refine: true },
	},

	members: {

		/**
		 * Event handler. Called when a key is was pressed.
		 *
		 * @param e {qx.event.type.KeySequence} the event.
		 */
		_onKeyPress: function (e) {
			
			if (!this.isEnabled())
				return;

			// start editing on F4.
			var identifier = e.getKeyIdentifier();
			if (!this.isEditing()) {

				switch (identifier) {


					case "F4":
						if (this.getFocusedColumn() == 1)
							this.setFocusedCell(2, this.getFocusedRow());
						else
							this.startEditing();

						e.stop();
						break;
				}
			}

			this.base(arguments, e);
		},
	}
});


/**
 * wisej.web.propertygrid.CellRenderer
 *
 * Specialized cell renderer for the PropertyGrid.
 */
qx.Class.define("wisej.web.propertygrid.CellRenderer", {

	extend: wisej.web.datagrid.cellRenderer.Cell,

	statics: {

		DEFAULT_OPEN_CSS: "float:left;height:100%;background-repeat:no-repeat;position:relative",
		DEFAULT_SPACER_CSS: "float:left;height:100%;background-repeat:no-repeat;position:relative;background-image:none",
		DEFAULT_CONTENT_CSS: "display:inline-block;height:100%;position:relative;box-sizing:border-box;background-repeat:no-repeat;overflow:hidden;white-space:pre"
	},

	properties: {

		/**
		 * Appearance key for the row renderer.
		 */
		appearance: { init: "propertygrid/grid-cell", refine: true }
	},

	members: {

		// open/close icon element classes.
		_contentSpacerClassName: null,
		_contentCollapsedClassName: null,

		// builds the state map for the cell.
		_getCellState: function (cellInfo) {

			var state = this.base(arguments, cellInfo);

			// expanded or collapsed?
			var data = cellInfo.rowData;
			if (cellInfo.col == 1 && data.level > 0) {
				if (data && data.expanded === true) {
					state.expanded = true;
				}
				else if (data && data.expanded === false) {
					state.collapsed = true;
				}
			}

			return state;
		},

		/**
		 * Returns the HTML that should be used inside the main div of this cell.
		 *
		 * This method may be overridden by sub classes.
		 *
		 * @param cellInfo {Map} The information about the cell.
		 *          See {@link qx.ui.table.cellrenderer.Abstract#createDataCellHtml}.
		 * @return {String} the inner HTML of the cell.
		 */
		_getContentHtml: function (cellInfo) {

			var html = "";
			var htmlArr = [];

			var data = cellInfo.rowData;
			var cellValue = this._getCellValue(cellInfo);
			var cellStyle = this._resolveContentStyle(cellInfo);
			var cellCss = cellStyle ? cellStyle.css : "";

			// add the open/close/spacer div before the content for the name column.
			if (data && cellInfo.col < 2) {

				// add the open/close button when:
				//
				//  - rendering the header cell for a category with children (col = 0 and level is undefined).
				//  - rendering the header cell for a first level row with children (col = 0 and level is 0).
				//  - rendering the name call for a second level or above row with children (col = 1 and level > 0).
				var addOpenClose = (cellInfo.col === 0 && !data.level) || (cellInfo.col === 1 && data.level > 0);

				var paddingLeft = 0;
				if (cellInfo.col === 1)
					paddingLeft = data.level * cellInfo.table.getIndent();

				if (data.expanded === true && addOpenClose) {
					if (paddingLeft > 0)
						paddingLeft -= cellInfo.table.getIndent();
					htmlArr.push("<div role='close' class='", this._contentExpandedClassName);
					htmlArr.push("' style='padding-left: ", paddingLeft, "px'></div>");
				}
				else if (data.expanded === false && addOpenClose) {
					if (paddingLeft > 0)
						paddingLeft -= cellInfo.table.getIndent();
					htmlArr.push("<div role='open' class='", this._contentCollapsedClassName);
					htmlArr.push("' style='padding-left: ", paddingLeft, "px'></div>");
				}
				else if (data.level > 0) {
					htmlArr.push("<div role='spacer' class='", this._contentSpacerClassName);
					htmlArr.push("' style='padding-left: ", paddingLeft, "px'></div>");
				}
			}

			// make room for the cell icon.
			if (cellStyle.backgroundImage) {
				if (cellCss) cellCss += ";";
				cellCss += "padding-left:" + cellInfo.table.getRowHeight() + "px";
			}

			htmlArr.push(
				"<div role='content' class='", this._contentClassName, "' style='", cellCss, "'>",
				"<div class='", this._contentMiddleClassName, "'>",
				cellValue,
				"</div></div>");

			html = htmlArr.join("");
			return html;
		},

		/**
		 * Creates the additional css classes needed for this renderer.
		 */
		_registerCssClasses: function () {
			var styleMgr = this._styleMgr;
			var appearanceKey = this.getAppearance();

			this._contentClassName = styleMgr.getCssClass(appearanceKey + "/content", {}, wisej.web.propertygrid.CellRenderer.DEFAULT_CONTENT_CSS);
			this._contentSpacerClassName = styleMgr.getCssClass(appearanceKey + "/open", {}, wisej.web.propertygrid.CellRenderer.DEFAULT_SPACER_CSS);
			this._contentExpandedClassName = styleMgr.getCssClass(appearanceKey + "/open", { expanded: true }, wisej.web.propertygrid.CellRenderer.DEFAULT_OPEN_CSS);
			this._contentCollapsedClassName = styleMgr.getCssClass(appearanceKey + "/open", { collapsed: true }, wisej.web.propertygrid.CellRenderer.DEFAULT_OPEN_CSS);

			this.base(arguments);
		},
	}
});


/**
 * wisej.web.propertygrid.PasswordCellRenderer
 *
 * Specialized cell renderer for the PropertyGrid.
 */
qx.Class.define("wisej.web.propertygrid.PasswordCellRenderer", {

	extend: wisej.web.propertygrid.CellRenderer,

	members:
	{
		/**
		 * Returns the value to render inside the cell.
		 *
		 * This method may be overridden by sub classes.
		 *
		 * @param cellInfo {Map} The information about the cell.
		 *          See {@link qx.ui.table.cellrenderer.Abstract#createDataCellHtml}.
		 */
		_getCellValue: function (cellInfo) {

			return cellInfo.value ? cellInfo.value.replace(/./g, "•") : "";
		}
	}
});


/**
 * wisej.web.propertygrid.CategoryCellRenderer
 *
 * Specialized cell renderer for the category cells in the PropertyGrid.
 */
qx.Class.define("wisej.web.propertygrid.CategoryCellRenderer", {

	extend: wisej.web.propertygrid.CellRenderer,

	properties: {

		/**
		 * Appearance key for the category cells.
		 */
		appearance: { init: "propertygrid/grid-category-cell", refine: true },
	}
});


/**
 * wisej.web.propertygrid.RowHeaderRenderer
 *
 * Specialized cell renderer for the row headers in the PropertyGrid.
 */
qx.Class.define("wisej.web.propertygrid.RowHeaderRenderer", {

	extend: wisej.web.propertygrid.CellRenderer,

	properties: {

		/**
		 * Appearance key for the row header renderer.
		 */
		appearance: { init: "propertygrid/grid-header", refine: true },
	},

});


/**
 * wisej.web.propertygrid.RowRenderer
 *
 * Specialized row renderer for the PropertyGrid.
 */
qx.Class.define("wisej.web.propertygrid.RowRenderer", {

	extend: wisej.web.datagrid.rowRenderer.Row,

	properties: {

		/**
		 * Appearance key for the row renderer.
		 */
		appearance: { init: "propertygrid/grid-row", refine: true },
	},

	members: {

	}

});
