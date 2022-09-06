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
 * wisej.web.datagrid.ColumnHeader
 *
 * Represents a column header in the DataGrid. Instances of this
 * component are live-wired to update the cell headers in the header panel.
 */
qx.Class.define("wisej.web.datagrid.ColumnHeader", {

	extend: qx.core.Object,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejComponent],

	properties: {

		/**
		 * Label property.
		 */
		label: { init: "", check: "String", apply: "_applyProperty" },

		/**
		 * Width property.
		 */
		width: { init: 100, check: "PositiveInteger", apply: "_applyProperty" },

		/**
		 * MinWidth property.
		 */
		minWidth: { init: 10, check: "PositiveInteger", apply: "_applyProperty" },

		/**
		 * MaxWidth property.
		 */
		maxWidth: { init: null, check: "PositiveInteger", apply: "_applyProperty" },

		/**
		 * AutoEllipsis property.
		 *
		 * Sets the auto-ellipsis style.
		 */
		autoEllipsis: { init: false, check: "Boolean", apply: "_applyProperty" },

		/**
		 * Visible property.
		 */
		visible: { init: true, check: "Boolean", apply: "_applyProperty" },

		/**
		 * Wrap property.
		 */
		wrap: { init: false, check: "Boolean", apply: "_applyProperty" },

		/**
		 * Sortable property.
		 */
		sortable: { init: false, check: "Boolean", apply: "_applyProperty" },

		/**
		 * Resizable property.
		 */
		resizable: { init: true, check: "Boolean", apply: "_applyProperty" },

		/**
		 * Editable property.
		 */
		editable: { init: false, check: "Boolean", apply: "_applyProperty" },

		/**
		 * Movable property.
		 */
		movable: { init: false, check: "Boolean", apply: "_applyProperty" },

		/**
		 * TextColor property.
		 */
		textColor: { init: null, nullable: true, check: "Color", apply: "_applyProperty" },

		/**
		 * BackgroundColor property.
		 */
		backgroundColor: { init: null, nullable: true, check: "Color", apply: "_applyProperty" },

		/**
		 * Font property.
		 */
		font: { init: null, nullable: true, check: "Font", apply: "_applyProperty" },

		/**
		 * Padding property.
		 */
		padding: { init: null, nullable: true, check: "Array", apply: "_applyProperty" },

		/**
		 * TextAlign property.
		 *
		 * Gets or sets the alignment of the text.
		 */
		textAlign: {
			init: "middleCenter",
			apply: "_applyProperty",
			check: ["topRight", "middleRight", "bottomRight", "topLeft", "topCenter", "middleLeft", "middleCenter", "bottomLeft", "bottomCenter"]
		},

		/**
		 * Editor property.
		 *
		 * The widget used to edit the cells in this column.
		 */
		editor: { init: null, nullable: true, transform: "_transformComponent" },

		/**
		 * Icon property.
		 */
		icon: { check: "String", init: null, nullable: true, apply: "_applyProperty" },

		/**
		 * IconSize property.
		 *
		 * Gets or sets the size of the icon.
		 */
		iconSize: { init: null, nullable: true, check: "Map", apply: "_applyProperty" },

		/**
		 * Background images to assign to the widget.
		 *
		 * This property can be an array or a single value. It is a map expecting these fields:
		 *
		 *	- image: image source,
		 *	- layout: "none", "tile", "center", "stretch", "zoom",
		 *	- align: "topRight", "middleRight", "bottomRight", "topLeft", "topCenter", "middleLeft", "middleCenter", "bottomLeft", "bottomCenter"
		 *	- size: {width, height}
		 */
		backgroundImages: {
			init: null,
			nullable: true,
			apply: "_applyProperty"
		},

		/**
		 * Style map to apply to the cells in the column.
		 */
		style: { init: null, check: "Map", apply: "_applyProperty" },

		/**
		 * Data map with the shared values to apply to all the cells in the column.
		 */
		data: { init: null, check: "Map", apply: "_applyProperty" },

		/**
		 * The owner table.
		 */
		table: { init: null, check: "wisej.web.Datagrid" },

		/**
		 * The column index.
		 */
		index: { init: -1, check: "Integer" },

		/**
		 * The frozen property.
		 * Frozen columns go to the left scroller with the row header column.
		 */
		frozen: { init: false, check: "Boolean" },

		/**
		 * The selected property.
		 */
		selected: { init: false, check: "Boolean", apply: "_applyProperty" },

		/**
		 * The column position.
		 */
		position: { init: null, check: "PositiveInteger", apply: "_applyPosition" },

		/**
		 * The sortOrder property.
		 */
		sortOrder: { init: "none", check: ["none", "ascending", "descending"], apply: "_applySortOrder" },

		/**
		 * The autoSize property.
		 */
		sizeMode: {
			init: "none",
			check: ["none", "columnHeader", "allCellsExceptHeader", "allCells", "displayedCellsExceptHeader", "displayedCells", "fill", "doubleClick",
					"autoSizeToAllHeaders", "autoSizeToDisplayedHeaders", "autoSizeToFirstHeader"],
			apply: "_applyProperty"
		},

		/**
		 * The fillWeight property.
		 * Used to auto size columns with sizeMode = "fill".
		 */
		fillWeight: { init: 100, check: "PositiveInteger", apply: "_applyProperty" },

		/**
		 * The cell header widget.
		 */
		headerWidget: { init: null, nullable: true, check: "wisej.web.datagrid.HeaderCell", apply: "_applyHeaderWidget" },

		/**
		 * ShowInMenu flag. When set to false the column is not displayed in the visibility menu.
		 */
		showInMenu: { init: true, check: "Boolean" },

		/**
		 * ToolTipText property.
		 */
		toolTipText: { init: null, check: "String", apply: "_applyProperty" },

		/**
		 * Widget property.
		 *
		 * Assigns a child widget to display inside the column header.
		 */
		widget: { init: null, check: "Widget", apply: "_applyProperty", nullable: true, transform: "_transformComponent" },

		/**
		 * WidgetDock property.
		 *
		 * Determines the layout of the child widget assigned setting widget.
		 */
		widgetDock: { init: "none", check: ["none", "top", "left", "right", "bottom", "fill"], apply: "_applyProperty" },
	},

	statics: {

		// collection of properties defined on wisej.web.gridview.HeaderCellRenderer.
		__cellWidgetProperties: [
			"label",
			"icon", "iconSize",
			"width", "minWidth", "maxWidth",
			"autoEllipsis",
			"wrap",
			"textAlign", "textColor",
			"backgroundColor",
			"font",
			"padding",
			"movable",
			"resizable",
			"toolTipText",
			"backgroundImages"],

		/**
		 * Applies all the supported properties from the column header to the cell widget.
		 */
		__syncCellWidget: function (columnHeader, headerWidget, name) {

			if (name) {

				if (this.__cellWidgetProperties.indexOf(name) > -1)
					headerWidget.set(name, columnHeader.get(name));
			}
			else {

				// sync all the properties.
				for (var i = 0; i < this.__cellWidgetProperties.length; i++) {
					var name = this.__cellWidgetProperties[i];
					var value = columnHeader.get(name);
					if (value != null)
						headerWidget.set(name, value);
				}

				// child widget.
				headerWidget.setCellWidget(columnHeader.getWidget(), columnHeader.getWidgetDock());
			}
		},

	},

	members: {

		/**
		 * Gets or sets the position of the column.
		 */
		_applyPosition: function (value, old) {

			var table = this.getTable();
			if (table)
				table._scheduleUpdateColumnsPosition();
		},

		/**
		 * Applies the sortOrder property.
		 */
		_applySortOrder: function (value, old) {

			var table = this.getTable();
			if (table) {
				var dataModel = table.getTableModel();

				// update the data model only if this
				// column is already the sorted column in the
				// data model, which means the user has already sorted it
				// or the application has sorted this column.

				// setting the sort order of a column by itself
				// should not change the sort order in the data model.

				if (dataModel.getSortColumnIndex() === -1
					|| dataModel.getSortColumnIndex() === this.getIndex()) {

					if (value === "none" && old !== "none") {
						dataModel._setSortColumnIndex(-1);
					}
					else if (value !== "none") {
						dataModel._setSortColumnIndex(this.getIndex());
						dataModel._setSortAscending(value === "ascending");
					}
				}

				var headerWidget = this.getHeaderWidget();
				if (headerWidget)
					headerWidget.setSortOrder(value);
			}
		},

		/**
		 * Binds the cell widget to this object and updates
		 * the cell widget to reflect the properties defined here.
		 */
		_applyHeaderWidget: function (value, old) {

			if (value) {
				this._syncCellWidget();
				this._applySortOrder(this.getSortOrder());

				value.setName(this.getName());
				value.removeState("borderNone");
				value.removeState("borderBoth");
				value.removeState("borderVertical");
				value.removeState("borderHorizontal");
				value.addState(this.getTable()._colHeadersBorderStyle);
			}
		},

		/**
		 * Applies all the supported properties from the column header to the cell widget.
		 */
		_syncCellWidget: function (name) {

			var headerWidget = this.getHeaderWidget();
			if (headerWidget)
				wisej.web.datagrid.ColumnHeader.__syncCellWidget(this, headerWidget, name);
		},

		syncWidget: function (jobs) {

			if (!jobs)
				return;

			if (jobs["setCellWidget"]) {
				var headerWidget = this.getHeaderWidget();
				if (headerWidget)
					headerWidget.setCellWidget(this.getWidget(), this.getWidgetDock());
			}
		},

		/**
		 * Applies the property.
		 */
		_applyProperty: function (value, old, name) {

			var table = this.getTable();
			if (!table)
				return;

			switch (name) {

				case "label":
					var index = table.getColumns().indexOf(this);
					table.getTableModel().setColumnName(index, value);
					this._syncCellWidget(name);
					break;

				case "editable":
					var index = table.getColumns().indexOf(this);
					table.getTableModel().setColumnEditable(index, value);
					break;

				case "sortable":
					var index = table.getColumns().indexOf(this);
					table.getTableModel().setColumnSortable(index, value);
					break;

				case "visible":
					var index = table.getColumns().indexOf(this);
					table.getTableColumnModel().setColumnVisible(index, value);
					break;

				case "selected":
					var index = table.getColumns().indexOf(this);
					if (value)
						table.getSelectionModel().setColumnSelected(index, true);
					else
						table.getSelectionModel().setColumnSelected(index, false);
					break;

				case "width":
					var index = table.getColumns().indexOf(this);
					table.getTableColumnModel().setColumnWidth(index, value);
					break;

				case "style":
					var index = table.getColumns().indexOf(this);
					table.getTableColumnModel().setColumnStyle(index, value);
					break;

				case "data":
					var index = table.getColumns().indexOf(this);
					table.getTableColumnModel().setColumnData(index, value);
					break;

				case "sizeMode":
				case "fillWeight":
					qx.ui.core.queue.Widget.add(table, "autoSizeColumns");
					break;

				case "widget":
				case "widgetDock":
					qx.ui.core.queue.Widget.add(this, "setCellWidget");
					break;

				default:
					this._syncCellWidget(name);
					break;
			}
		},

		/**
		 * Returns the target for the accessibility properties.
		 */
		getAccessibilityTarget: function () {
			return this.getHeaderWidget();
		},

		/**
		 * Returns the target for the automation properties.
		 */
		getAccessibilityTarget: function () {
			return this.getHeaderWidget();
		}

	},

	destruct: function () {

		var headerWidget = this.getHeaderWidget();
		if (headerWidget) {
			headerWidget.destroy();
			this.setHeaderWidget(null);
		}
	}

});
