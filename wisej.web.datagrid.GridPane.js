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
 * wisej.web.datagrid.GridPane
 *
 * Overrides the default table pane. The pane widget is the one that
 * creates and contains the html for the rows. Each wisej.web.datagrid.GridScroller
 * scrolls a wisej.web.datagrid.GridPane.
 */
qx.Class.define("wisej.web.datagrid.GridPane", {

	extend: qx.ui.table.pane.Pane,

	construct: function (paneScroller) {

		this.base(arguments, paneScroller);

		this.__widgetRepository = [];
		this.setTopScrollOffset(paneScroller.getTable().getTopScrollOffset());

		this.addListener("paneUpdated", this._onPaneUpdated, this);
	},

	properties: {

		/** 
		 * The number of rows to keep when scrolling the content up.
		 *
		 * These are rows that have a negative margin and may contain
		 * cells with RowSpan > 1 and have to be rendered when scrolled
		 * outside of the view.
		 */
		topScrollOffset: { check: "PositiveInteger", apply: "_applyTopScrollOffset" },
	},

	members: {

		/* =======================================================================
		 * RowSpan > 1 implementation.
		* =======================================================================*/

		/**
		 * Applies the topScrollOffset property.
		 */
		_applyTopScrollOffset: function (value, old) {
			if (old != null)
				this._updateAllRows();
		},

		/**
		 * Updates the content of the pane.
		 *
		 * @param completeUpdate {Boolean ? false} if true a complete update is performed.
		 *      On a complete update all cell widgets are recreated.
		 * @param scrollOffset {Integer ? null} If set specifies how many rows to scroll.
		 * @param onlyRow {Integer ? null} if set only the specified row will be updated.
		 * @param onlySelectionOrFocusChanged {Boolean ? false} if true, cell values won't
		 *          be updated. Only the row background will.
		 */
		updateContent: function (completeUpdate, scrollOffset, onlyRow, onlySelectionOrFocusChanged) {

			if (completeUpdate) {
				this.__rowCacheClear();
			}

			if (scrollOffset && Math.abs(scrollOffset) <= Math.min(10, this.getVisibleRowCount()) && this.getTopScrollOffset() == 0) {
				this._scrollContent(scrollOffset);
			} else if (onlySelectionOrFocusChanged && !this.getTable().getAlwaysUpdateCells()) {
				this._updateRowStyles(onlyRow);
			} else {
				this._updateAllRows();
			}
		},


		/**
		 * If only focus or selection changes it is sufficient to only update the
		 * row styles. This method updates the row styles of all visible rows or
		 * of just one row.
		 *
		 * @param onlyRow {Integer|null ? null} If this parameter is set only the row
		 *     with this index is updated.
		 */
		_updateRowStyles: function (onlyRow) {
			var elem = this.getContentElement().getDomElement();

			if (!elem || !elem.firstChild) {
				this._updateAllRows();
				return;
			}

			var table = this.getTable();
			var selectionModel = table.getSelectionModel();
			var tableModel = table.getTableModel();
			var rowRenderer = table.getDataRowRenderer();
			var rowNodes = elem.firstChild.childNodes;
			var cellInfo = { table: table };

			// @ITG:Wisej: Added reference to the current scroller, column model and data model to simplify the life of cell renderers.
			cellInfo.tableModel = tableModel;
			cellInfo.scroller = this.getPaneScroller();
			cellInfo.columnModel = table.getTableColumnModel();
			cellInfo.rightToLeft = table.getRtl();

			// We don't want to execute the row loop below more than necessary. If
			// onlyRow is not null, we want to do the loop only for that row.
			// In that case, we start at (set the "row" variable to) that row, and
			// stop at (set the "end" variable to the offset of) the next row.
			var row = this.getFirstVisibleRow();
			var y = 0;

			// adjust for the top offset.
			var spanOffset = this.getTopScrollOffset();
			if (row < spanOffset)
				spanOffset = row;
			row -= spanOffset;

			// How many rows do we need to update?
			var end = rowNodes.length;

			if (onlyRow != null) {
				// How many rows are we skipping?
				var offset = onlyRow - row;
				if (offset >= 0 && offset < end) {
					row = onlyRow;
					y = offset;
					end = offset + 1;
				} else {
					return;
				}
			}

			for (; y < end; y++, row++) {
				cellInfo.row = row;
				cellInfo.selected = selectionModel.isSelectedIndex(row);
				cellInfo.focusedRow = (this.__focusedRow == row);
				cellInfo.rowData = tableModel.getRowData(row);

				rowRenderer.updateDataRowElement(cellInfo, rowNodes[y]);
			};
		},


		/**
		 * Get the HTML table fragment for the given row range.
		 *
		 * @param firstRow {Integer} Index of the first row
		 * @param rowCount {Integer} Number of rows
		 * @return {String} The HTML table fragment for the given row range.
		 */
		_getRowsHtml: function (firstRow, rowCount) {
			var table = this.getTable();
			var selectionModel = table.getSelectionModel();
			var tableModel = table.getTableModel();
			var columnModel = table.getTableColumnModel();
			var paneModel = this.getPaneScroller().getTablePaneModel();
			var rowRenderer = table.getDataRowRenderer();

			tableModel.prefetchRows(firstRow, firstRow + rowCount - 1);

			var rowHeight = table.getRowHeight();
			var colCount = paneModel.getColumnCount();
			var left = 0;
			var cols = [];

			// @ITG:Wisej: RightToLeft support.
			var rtl = table.isRtl();

			// @ITG:Wisej: RightToLeft support.
			// precompute column properties
			for (var x =
			  rtl ? (colCount - 1) : (0) ;
			  rtl ? (x > -1) : (x < colCount) ;
			  rtl ? (x--) : (x++)) {

				var col = paneModel.getColumnAtX(x);
				var cellWidth = columnModel.getColumnWidth(col);

				cols.push({
					col: col,
					xPos: x,
					editable: tableModel.isColumnEditable(col),
					focusedCol: this.__focusedCol == col,
					styleLeft: left,
					styleWidth: cellWidth
				});

				left += cellWidth;
			}

			var rowsArr = [];
			var paneReloadsData = false;

			// adjust for the top offset.
			var topVisibleRow = firstRow;
			var spanOffset = this.getTopScrollOffset();
			if (firstRow < spanOffset)
				spanOffset = firstRow;
			firstRow -= spanOffset;
			rowCount += spanOffset;

			// calculate the total offset for the rows outside of the visible range.
			var marginTop = 0;
			if (spanOffset > 0) {
				for (var row = firstRow, maxRow = firstRow + spanOffset; row < maxRow; row++) {
					var rowData = tableModel.getRowData(row);
					marginTop += (rowData ? rowData.height : null) || rowHeight;
				}
			}

			for (var row = firstRow, maxRow = firstRow + rowCount; row < maxRow; row++) {

				var focusedRow = (this.__focusedRow == row);
				var selected = selectionModel.isSelectedIndex(row);

				// don't retrieve offset rows from the cache.
				if (row >= topVisibleRow) {
					var cachedRow = this.__rowCacheGet(row, selected, focusedRow);
					if (cachedRow) {
						rowsArr.push(cachedRow);
						continue;
					}
				}

				var rowHtml = [];

				var cellInfo = { table: table };
				cellInfo.styleHeight = rowHeight;

				// @ITG:Wisej: Added reference to the current scroller, column model and data model to simplify the life of cell renderers.
				cellInfo.tableModel = tableModel;
				cellInfo.columnModel = columnModel;
				cellInfo.scroller = this.getPaneScroller();
				cellInfo.rightToLeft = rtl;

				cellInfo.row = row;
				cellInfo.selected = selected;
				cellInfo.focusedRow = focusedRow;
				cellInfo.rowData = tableModel.getRowData(row);

				if (!cellInfo.rowData) {
					paneReloadsData = true;
				}

				rowHtml.push('<div ');

				var rowAttributes = rowRenderer.getRowAttributes(cellInfo);
				if (rowAttributes) {
					rowHtml.push(rowAttributes);
				}

				var rowClass = rowRenderer.getRowClass(cellInfo);
				if (rowClass) {
					rowHtml.push('class="', rowClass, '" ');
				}

				var rowStyle = rowRenderer.createRowStyle(cellInfo) || "";

				// if this is the first row of the offset rows, set the negative margin.
				if (spanOffset > 0 && row == firstRow) {
					if (rowStyle && rowStyle[rowStyle.length - 1] != ";")
						rowStyle += ";";

					rowStyle += "margin-top:-" + marginTop + "px";
				}

				// @ITG:Wisej: Removed this line and moved it to the row renderer.
				// rowStyle += ";position:relative;" + rowRenderer.getRowHeightStyle(rowHeight) + "width:100%;";
				if (rowStyle) {
					rowHtml.push('style="', rowStyle, '" ');
				}
				rowHtml.push('>');

				var stopLoop = false;
				for (x = 0; x < colCount && !stopLoop; x++) {
					var col_def = cols[x];
					for (var attr in col_def) {
						cellInfo[attr] = col_def[attr];
					}
					var col = cellInfo.col;

					// Use the "getValue" method of the tableModel to get the cell's
					// value working directly on the "rowData" object
					// (-> cellInfo.rowData[col];) is not a solution because you can't
					// work with the columnIndex -> you have to use the columnId of the
					// columnIndex This is exactly what the method "getValue" does
					cellInfo.value = tableModel.getValue(col, row);
					var cellRenderer = columnModel.getDataCellRenderer(col);

					// Retrieve the current default cell style for this column.
					cellInfo.style = cellRenderer.getDefaultCellStyle();

					// @ITG:Wisej: Added column id to the cellInfo map.
					cellInfo.columnId = tableModel.getColumnId(col);

					// Allow a cell renderer to tell us not to draw any further cells in
					// the row. Older, or traditional cell renderers don't return a
					// value, however, from createDataCellHtml, so assume those are
					// returning false.
					//
					// Tested with http://tinyurl.com/333hyhv
					stopLoop =
					  cellRenderer.createDataCellHtml(cellInfo, rowHtml) || false;
				}
				rowHtml.push('</div>');

				var rowString = rowHtml.join("");

				// don't cache offset rows.
				if (row >= topVisibleRow) {
					this.__rowCacheSet(row, rowString, selected, focusedRow);
				}

				rowsArr.push(rowString);
			}
			this.fireDataEvent("paneReloadsData", paneReloadsData);
			return rowsArr.join("");
		},

		/* =======================================================================
		 * Cell widgets implementation.
		 * =======================================================================*/

		// keeps a reference to all the root containers created by the grid panel
		// to host widgets inside cells.
		__widgetRepository: null,

		/**
		 * Invalidates the cached row.
		 *
		 * @param row {Integer} Row index to invalidate.
		 */
		invalidateCachedRow: function (row) {

			this.__rowCache[row] = undefined;

		},

		/**
		 * Updates the inline root that hosts the
		 * widget associated with the cell.
		 */
		updateHostedWidget: function (cellElem) {

			if (cellElem.hasAttribute("qx-widget-id")) {
				var widget = this.__hostWidgetInCell(cellElem);
				if (widget)
					this.__cleanUpUnboundRoots();
			}
		},

		/**
		 * Invoked after the html content of the pane has been rendered.
		 *
		 * Here we:
		 *
		 * - create new qx.ui.root.Inline containers inside the cells
		 *   that have child widget and destroy all the previous roots.
		 */
		_onPaneUpdated: function (e) {

			var dom = this.getContentElement().getDomElement();
			if (!dom || !dom.firstChild)
				return;

			var rowNodes = dom.firstChild.childNodes;

			// destroy previously created root containers that are 
			// not bound to any valid element anymore.
			this.__cleanUpUnboundRoots();

			// re-bind custom widgets to their cells.
			this.__bindWidgetsToCells(rowNodes);
		},

		// binds the custom widgets associated to cells to the
		// corresponding cell element.
		__bindWidgetsToCells: function (rowNodes) {

			if (!rowNodes || rowNodes.length == 0)
				return;

			var rowElem = null;
			var cellElem = null;
			var cellNodes = null;

			for (var r = 0; r < rowNodes.length; r++) {
				rowElem = rowNodes[r];

				if (rowElem) {

					cellNodes = rowElem.childNodes;
					for (var c = 0; c < cellNodes.length; c++) {

						cellElem = cellNodes[c];

						// move the cell-bound widget into the cell.
						if (cellElem.hasAttribute("qx-widget-id")) {
							this.__hostWidgetInCell(cellElem);
						}
					}
				}
			}
		},

		// retrieves the widget identified by qx-cell-widget and
		// hosts it inside an qx.ui.root.Inline root container.
		__hostWidgetInCell: function (cellElem) {

			if (wisej.web.DesignMode)
				return;

			var widget = Wisej.Core.getComponent(cellElem.getAttribute("qx-widget-id"));
			if (widget) {

				var repository = this.__widgetRepository;

				var root = cellElem.$$root;
				if (!root) {
					cellElem.$$root = root = new wisej.web.datagrid.gridPane.InlineRoot(cellElem);
					repository.push(root);
				}

				// let the layout engine handle the size.
				widget.resetUserBounds();

				// let the widget shrink regardless of the content
				// to fit in the cell.
				widget.setMinWidth(0);
				widget.setMinHeight(0);

				// add "owner" and "opener" QA attributes.
				var table = this.getTable();
				var colIndex = parseInt(cellElem.getAttribute("col"));
				var column = table.getColumns()[colIndex];
				widget.setUserData("owner", table);
				widget.setUserData("opener", column);
				wisej.utils.Widget.setAutomationAttributes(widget, column);

				// add the widget to the root container and set the correct layout
				// according to the dock property.
				var dock = cellElem.getAttribute("qx-widget-dock");
				if (!dock || dock === "none") {
					var layout = root._getLayout();
					if (!(layout instanceof qx.ui.layout.Basic)) {
						if (layout)
							layout.dispose();
						root._setLayout(new qx.ui.layout.Basic());
					}
					root.add(widget);
				}
				else {
					var layout = root._getLayout();
					if (!(layout instanceof qx.ui.layout.Dock)) {
						if (layout)
							layout.dispose();
						root._setLayout(new qx.ui.layout.Dock());
					}

					var edge = "center";
					switch (dock) {
						case "top": edge = "north"; break;
						case "left": edge = "west"; break;
						case "bottom": edge = "south"; break;
						case "right": edge = "east"; break;
					}

					if (edge === "center") {
						widget.resetWidth();
						widget.resetHeight();
					}

					// transfer the cell padding to the hosting root container.
					var rowIndex = parseInt(cellElem.getAttribute("row"));
					root.setPadding(this.__getCellPadding(table, colIndex, rowIndex));

					root.add(widget, { edge: edge, left: null, top: null });

					// notify the server when the layout engine resizes the widget.
					if (!widget.isWired("resize")) {
						widget.removeListener("resize", this.__onCellWidgetResize, this);
						widget.addListener("resize", this.__onCellWidgetResize, this);
					}
				}
				return widget;
			}
		},

		// reads the padding css computed for the cell and converts it to
		// an array of integers (trbl).
		__getCellPadding: function (table, colIndex, rowIndex) {

			var rowData = table.getTableModel().getRowData(rowIndex);
			if (rowData) {
				var cellStyle = rowData.cachedStyles[colIndex];
				if (cellStyle && cellStyle.padding) {
					var px = cellStyle.padding.split(" ");
					var padding = [];
					for (var i = 0; i < px.length; i++) {
						padding.push(parseInt(px[i]));
					}
					return padding;
				}
			}

			return 0;
		},

		// send the "resize" event to the sever to adjust the
		// size of cell widgets when they are docked.
		__onCellWidgetResize: function (e) {
			var target = e.getTarget();
			Wisej.Core.fireEvent(target.getId(), "resize", { Size: e.getData() }, target);
		},

		// dispose of all the root containers that are not being used.
		__cleanUpUnboundRoots: function () {

			var repository = this.__widgetRepository;

			if (repository.length > 0) {
				var anyRemoved = false;
				for (var i = 0; i < repository.length; i++) {
					var root = repository[i];
					if (root == null || root.__elem == null) {
						anyRemoved = true;
					}
					else if (root.__elem.offsetWidth == 0) {
						root.removeAll();
						root.destroy();
						anyRemoved = true;
						repository[i] = null;
					}
				}

				// create a new clean array.
				if (anyRemoved) {
					var newRepository = [];
					for (var i = 0; i < repository.length; i++) {
						var root = repository[i];
						if (root)
							newRepository.push(root);
					}
					this.__widgetRepository = newRepository;
				}
			}
		},
	},

	destruct: function () {

		this._disposeArray("__widgetRepository");
	}
});


/**
 * wisej.web.datagrid.gridPane.InlineRoot
 *
 * Root container for widgets hosted in cells.
 */
qx.Class.define("wisej.web.datagrid.gridPane.InlineRoot", {

	extend: qx.ui.root.Inline,

	construct: function (elem) {

		this.base(arguments, elem, true, true);
	},

	members: {

		// overridden - change the host element.
		_createContentElement: function () {

			var el = this.__elem;
			var rootEl = document.createElement("div");
			el.appendChild(rootEl);

			var root = new qx.html.Root(rootEl);

			// make absolute to start at 0,0 in the cell.
			rootEl.style.position = "absolute";

			// store "weak" reference to the widget in the DOM element.
			root.setAttribute("$$widget", this.toHashCode());

			// fire event asynchronously, otherwise the browser will fire the event
			// too early and no listener will be informed since they're not added
			// at this time.
			qx.event.Timer.once(function (e) {
				this.fireEvent("appear");
			}, this, 0);

			return root;
		},

		// overridden - we need to be able to use cell elements that are not visible.
		__initDynamicMode: function () {
			qx.event.Registration.addListener(this.__elem, "resize", this._onResize, this);
		},

	}
});