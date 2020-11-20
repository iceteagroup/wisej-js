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
 * wisej.web.listview.GridView
 *
 * Represents the details view - the grid with the column headers -  in 
 * the wisej.web.ListView widget.
 */
qx.Class.define("wisej.web.listview.GridView", {

	extend: wisej.web.DataGrid,

	construct: function (owner) {

		if (!(owner instanceof wisej.web.ListView))
			throw new Error("The owner must be an instance of wisej.web.ListView.");

		this.__owner = owner;

		// use the listview data model.
		var dataModel = !wisej.web.DesignMode
				? new wisej.web.listview.GridDataModel()
				: new wisej.web.datagrid.DataModelDesignMode();

		this.base(arguments, dataModel);

		// use the listview row renderer.
		this.getDataRowRenderer().dispose();
		this.setDataRowRenderer(new wisej.web.listview.RowRenderer());

		// set defaults.
		this._rowHeaderColIndex = -1;
		this.setBorderStyle("none");
		this.setRowHeadersVisible(false);
		this.setShowCellFocusIndicator(false);
		this.setEditMode("editProgrammatically");

		// attach to the events to redirect to the owner ListView.
		this.addListener("gridCellClick", this.__bubbleDataEvent, this);
		this.addListener("gridCellDblClick", this.__bubbleDataEvent, this);
		this.addListener("gridCellMouseUp", this.__bubbleDataEvent, this);
		this.addListener("selectionChanged", this.__bubbleDataEvent, this);
		this.addListener("columnWidthChanged", this.__bubbleDataEvent, this);
		this.addListener("columnPositionChanged", this.__bubbleDataEvent, this);
	},

	properties: {

		// overridden.
		newTableColumnModel: { refine: true, init: function (table) { return new wisej.web.listview.ColumnModel(table); } }

	},

	members: {

		// the owner ListView.
		__owner: null,

		// current number of rows.
		__rowCount: 0,

		/**
		 * Returns the id of the owner listview.
		 * Used by the data model to connect the remote data store.
		 */
		getOwnerId: function () {

			return this.__owner.getId();
		},

		// returns the default color for svg icons.
		getIconColor: function () {

			return this.__owner.getIconColor();
		},

		// returns the item padding value.
		getItemPadding: function () {

			return this.__owner.getItemPadding();
		},

		/**
		 * Returns whether the items should show the checkbox icon.
		 * The check box icon is the same as the state icon.
		 */
		getShowCheckBoxes: function () {

			return this.__owner.isCheckBoxes();
		},

		/**
		 * Returns the header style.
		 */
		getHeaderStyle: function () {

			return this.__owner.getHeaderStyle();
		},

		// returns the value of the property ListView.wrap.
		getLabelWrap: function () {

			return this.__owner.getLabelWrap();
		},

		/**
		 * Changes the header style.
		 */
		setHeaderStyle: function (value) {

			switch (value) {
				case "none":
					this.setHeaderCellsVisible(false);
					break;

				default:
					this.setHeaderCellsVisible(true);
					break;
			}
		},

		/**
		 * Sets the focused item.
		 *
		 * @param index {Integer} index of the item or row to scroll into view.
		 * @param deferred {Boolean ? false} when true, it indicates that the listview is about to load
		 *			the dataset and the cell cannot be focused until after the data count is loaded.
		 */
		setFocusedItem: function (index, deferred) {

			if (index == -1) {
				this.setFocusedCell(null, null);
			}
			else if (this.getTableColumnModel().getVisibleColumnCount() > 0) {

				this.setFocusedCell(0, index, true, deferred);
			}
		},

		/**
		 * Returns the selected items in a collection of ranges.
		 */
		getSelectionRanges: function () {

			var ranges = this.base(arguments);

			if (ranges != null && ranges.length > 0) {
				ranges = ranges.map(function (r) {
					return {
						minIndex: r.minRow,
						maxIndex: r.maxRow
					};
				});
			}
			return ranges;
		},

		/**
		 * Updates the selected items.
		 */
		setSelectionRanges: function (ranges) {

			// convert the incoming selection ranges into
			// the ranges usable by the base wisej.web.DataGrid.

			if (ranges != null && ranges.length > 0) {
				ranges = ranges.map(function (r) {
					return {
						minCol: -1,
						maxCol: -1,
						minRow: r.minIndex,
						maxRow: r.maxIndex
					};
				});
			}

			this.base(arguments, ranges);
		},

		/**
		 * Returns the number of rows currently loaded.
		 */
		_getRowCount: function () {

			return this.getTableModel().getRowCount();
		},

		// redirects the event to the owner.
		__bubbleDataEvent: function (e) {

			switch (e.getType()) {

				case "gridCellClick":
				case "gridCellDblClick":
					if (e.getData().row == -1) {
						if (this.getHeaderStyle() !== "clickable")
							return;
					}
					this.__owner.fireItemEvent(e, e.getType(), e.getData());
					break;

				case "gridCellMouseUp":

					// right click (or middle)?
					if (e.getButton() === "left")
						return;

					this.__owner.fireItemEvent(e, "gridCellRightClick", e.getData());
					break;

				case "selectionChanged":
					this.__owner.fireDataEvent("selectionChanged", this.getSelectionRanges());
					break;

				default:
					this.__owner.fireDataEvent(e.getType(), e.getData());
					break;
			}
		},

		// overridden.
		_onKeyPress: function (e) {
			// if checkboxes are visible, toggle the check state
			// when pressing enter.
			if (this.getShowCheckBoxes()) {

				switch (e.getKeyIdentifier()) {

					case "Space":

						this.getSelectionModel().iterateSelection(function (index) {
							this.__owner.fireDataEvent("itemCheck", index);
						}, this);

						e.stop();
						return;
				}
			}

			this.base(arguments, e);
		},

		// determines the target cell (col, row) for a drag operation
		// and adds it to the event object.
		_onDragEvent: function (e) {

			e.setUserData("eventData", null);

			var pageX = e.getDocumentLeft();
			var pageY = e.getDocumentTop();

			var scrollerArr = this._getPaneScrollerArr();
			for (var i = 0; i < scrollerArr.length; i++) {
				var row = scrollerArr[i]._getRowForPagePos(pageX, pageY);
				if (row != null) {
					e.setUserData("eventData", row);
					break;
				}
			}
		},
	}

});


/**
 * wisej.web.listview.ColumnModel
 *
 * Specialized columnModel for the listview.
 */
qx.Class.define("wisej.web.listview.ColumnModel", {

	extend: wisej.web.datagrid.ColumnModel,

	members: {

		init: function (colCount, table) {

			this.base(arguments, colCount, table, new wisej.web.datagrid.CellRenderer(new wisej.web.listview.CellRenderer()));
		}
	}
});


/**
 * wisej.web.listview.ColumnHeader
 *
 * Represents the column headers to display in details view.
 */
qx.Class.define("wisej.web.listview.ColumnHeader", {

	extend: wisej.web.datagrid.ColumnHeader,

	properties: {

		/**
		 * TextAlign property.
		 *
		 * Gets or sets the alignment of the text.
		 */
		textAlign: {
			init: "left",
			apply: "_applyProperty",
			check: ["left", "right", "center"],
			transform: "_transformTextAlign"
		},
	},

	members: {

		/**
		 * Converts the textAlign property value to
		 * the value expected by wisej.web.datagrid.ColumnHeader. 
		 */
		_transformTextAlign: function (value) {
			switch (value) {
				default:
				case "left": return "middleLeft";
				case "center": return "middleCenter";
				case "right": return "middleRight";
			}
		},
	}

});


/**
 * wisej.web.listview.RowRenderer
 *
 * Specialized row renderer for the details view of the ListView widget.
 */
qx.Class.define("wisej.web.listview.RowRenderer", {

	extend: wisej.web.datagrid.rowRenderer.Row,

	properties: {

		/**
		 * Appearance key for the row renderer.
		 */
		appearance: { init: "listview/grid-row", refine: true },
	},

});


/**
 * wisej.web.listview.CellRenderer
 *
 * Specialized cell renderer for the details view of the ListView widget.
 */
qx.Class.define("wisej.web.listview.CellRenderer", {

	extend: wisej.web.datagrid.cellRenderer.Cell,

	construct: function (appearance) {

		this.base(arguments, appearance);
	},

	properties: {

		/**
		 * Appearance key for the cell renderer.
		 */
		appearance: { init: "listview/grid-cell", refine: true },
	},

	statics: {

		DEFAULT_ICON_CSS: "float:left;height:100%;background-repeat:no-repeat",

	},

	members: {

		// inner elements class names.
		_iconClassName: null,
		_stateIconClassName: null,
		_checkBoxClassName: null,
		_checkBoxCheckedClassName: null,

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

			var cellStyle = this._resolveContentStyle(cellInfo);
			var cellCss = cellStyle ? cellStyle.css : "";
			var cellValue = this._getCellValue(cellInfo, cellStyle);

			var htmlArr =
				[
					"<div role='content' class='", this._contentClassName, "' ",
					"style='white-space:nowrap;", cellCss, "'>"
				];

			if (cellInfo.col == 0 && cellInfo.rowData) {

				var data = cellInfo.rowData.data;

				if (data.checked != null) {

					htmlArr.push(
						"<div role='checkbox' class='",
						data.checked ? this._checkBoxCheckedClassName : this._checkBoxClassName,
						"'></div>");
				}

				if (data.checked == null && data.stateIcon) {

					htmlArr.push(
						"<div role='state' class='",
						this._stateIconClassName,
						"' style='background-image:",
						cellStyle.stateIconUrl || data.stateIcon,
						"'></div>");
				}

				if (data.icon) {

					htmlArr.push(
						"<div role='icon' class='",
						this._iconClassName,
						"' style='background-image:",
						cellStyle.iconUrl || data.icon,
						"'></div>");
				}
			}

			// middle is the default.
			// copy the wrap mode style to the inner div added to align the content.
			var whiteSpace = "";
			if (cellStyle && cellStyle.whiteSpace)
				whiteSpace = "white-space:" + cellStyle.whiteSpace;
			else if (cellInfo.table.getLabelWrap)
				whiteSpace = "white-space:" + (cellInfo.table.getLabelWrap() ? "pre-wrap" : "nowrap");

			if (cellValue) {
				htmlArr.push(
					"<div style='height:100%;overflow:hidden;vertical-align:top;text-overflow:inherit'><div class='",
					this._contentMiddleClassName,
					"' style='", whiteSpace, "'>",
					cellValue,
					"</div></div>");
			}

			htmlArr.push("</div>");

			return htmlArr.join("");
		},

		/**
		 * Returns the value to render inside the cell.
		 *
		 * This method may be overridden by sub classes.
		 *
		 * @param cellInfo {Map} The information about the cell.
		 *          See {@link qx.ui.table.cellrenderer.Abstract#createDataCellHtml}.
		 */
		_getCellValue: function (cellInfo) {

			return cellInfo.value;
		},

		// overridden to add support for data.icon and data.stateIcon.
		// resolves the style and returns a style map with the "css" set to the compiled css string.
		_resolveContentStyle: function (cellInfo) {

			var cachedStyle = this.base(arguments, cellInfo);

			if (cellInfo.rowData) {

				var data = cellInfo.rowData.data;
				if (data && cellInfo.col == 0 && (data.icon || data.stateIcon)) {

					var itemIcon = data.icon;
					var stateIcon = data.stateIcon;

					var colorMgr = qx.theme.manager.Color.getInstance();
					var color = colorMgr.resolve(cellInfo.table.getIconColor());

					var me = this;
					var cell = qx.lang.Object.clone(cellInfo);

					// preload the item icon and the state icon.
					var iconUrl = this._resolveImage(itemIcon, color, function (url) {
						// update the cell element.
						me.updateDataCellHtml(cell);
					});
					var stateIconUrl = this._resolveImage(stateIcon, color, function (url) {
						// update the cell element.
						me.updateDataCellHtml(cell);
					});

					cachedStyle.iconUrl = iconUrl;
					cachedStyle.stateIconUrl = stateIconUrl;
				}
			}

			return cachedStyle;
		},

		/**
		 * Creates the additional css classes needed for this renderer.
		 */
		_registerCssClasses: function () {

			var styleMgr = this._styleMgr;
			var appearance = this.getAppearance();

			// icon, stateIcon and checkbox elements.
			this._iconClassName = styleMgr.getCssClass(appearance + "/icon", {}, wisej.web.listview.CellRenderer.DEFAULT_ICON_CSS);
			this._stateIconClassName = styleMgr.getCssClass(appearance + "/stateIcon", {}, wisej.web.listview.CellRenderer.DEFAULT_ICON_CSS);
			this._checkBoxClassName = styleMgr.getCssClass(appearance + "/checkbox", {}, wisej.web.listview.CellRenderer.DEFAULT_ICON_CSS);
			this._checkBoxCheckedClassName = styleMgr.getCssClass(appearance + "/checkbox", { checked: true }, wisej.web.listview.CellRenderer.DEFAULT_ICON_CSS);

			this.base(arguments);
		},
	}
});


/**
 * wisej.web.listview.ImageCellRenderer
 *
 * Specialized cell renderer for the details view of the ListView widget.
 */
qx.Class.define("wisej.web.listview.ImageCellRenderer", {

	extend: wisej.web.listview.CellRenderer,

	properties: {

		/**
		 * Appearance key for the cell renderer.
		 */
		appearance: { init: "listview/grid-cell", refine: true },
	},

	members: {

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

			var cellStyle = this._resolveContentStyle(cellInfo);
			var cellCss = cellStyle ? cellStyle.css : "";
			var cellValue = this._getCellValue(cellInfo);

			var htmlArr =
				[
					"<div role='content' class='", this._contentClassName, "' ",
					"style='white-space:nowrap;", cellCss, "'>"
				];

			if (cellInfo.col == 0 && cellInfo.rowData) {

				var data = cellInfo.rowData.data;

				if (data.checked != null) {

					htmlArr.push(
						"<div role='checkbox' class='",
						data.checked ? this._checkBoxCheckedClassName : this._checkBoxClassName,
						"'></div>");
				}

				if (data.checked == null && data.stateIcon) {

					htmlArr.push(
						"<div role='state' class='",
						this._stateIconClassName,
						"' style='background-image:",
						cellStyle.stateIconUrl || data.stateIcon,
						"'></div>");
				}

				if (data.icon) {

					htmlArr.push(
						"<div role='icon' class='",
						this._iconClassName,
						"' style='background-image:",
						cellStyle.iconUrl || data.icon,
						"'></div>");
				}
			}

			if (cellValue) {

				// resolve the cell image.
				var me = this;
				var cell = qx.lang.Object.clone(cellInfo);
				var color = cellStyle ? cellStyle.color : null;
				var imageUrl = this._resolveImage(cellValue, color, function (url) {

					me.updateDataCellHtml(cell);

				});

				if (imageUrl) {

					var imageStyle = {
						backgroundImage: imageUrl,
						backgroundSize: "inherit",
						backgroundRepeat: "no-repeat",
						backgroundPosition: "center center"
					};

					var imageCss = qx.bom.element.Style.compile(imageStyle);

					htmlArr.push(
						"<div role='image' style='height:100%;", imageCss, "'></div>"
					);
				}
			}

			htmlArr.push("</div>");

			return htmlArr.join("");
		},
	}

});


/**
 * wisej.web.listview.GridDataModel
 *
 * Extends the datagrid data model to use the owner's id
 * to retrieve the data from the server.
 */
qx.Class.define("wisej.web.listview.GridDataModel", {

	extend: wisej.web.datagrid.DataModel,

	members: {

		// overridden.
		// returns the data store managed by this data model.
		_getDataStore: function () {

			if (!this.__dataStore && this.__table) {
				var ownerId = this.__table.getOwnerId();
				if (ownerId)
					this.__dataStore = new wisej.DataStore(ownerId);
			}

			return this.__dataStore;
		},

	}

});