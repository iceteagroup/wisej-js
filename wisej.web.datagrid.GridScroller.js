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
 * wisej.web.datagrid.GridScroller
 *
 * This class is an extensive reimplementation of the base table Scroller. It has been
 * heavily overridden and enhanced to support variable row heights, resizable rows, row headers
 * and other extended features required by the Wisej DataGrid component.
 */
qx.Class.define("wisej.web.datagrid.GridScroller", {

	extend: qx.ui.table.pane.Scroller,

	construct: function (table) {

		this.base(arguments, table);

		this.setResetSelectionOnHeaderTap(false);
		this.setLiveResize(table.getLiveResize());
		this.setHeaderBackColor(table.getHeaderBackColor());

		this._paneClipper.addListener("pointerup", this._onPointerupPane, this);
		this._paneClipper.addListener("losecapture", this._onPaneLoseCapture, this);
		this._paneClipper.addListener("pointerdown", this._onPanePointerDown, this);
		this._paneClipper.addListener("pointerup", this._onPanePointerUp, this);

		// wire the events to relay to the server component.
		this.__lastPointerCell = { row: null, col: null };
		this._paneClipper.addListener("tap", this.__handleCellEvent, this);
		this._paneClipper.addListener("contextmenu", this.__handleCellEvent, this);
		this._paneClipper.addListener("dbltap", this.__handleCellEvent, this);
		this._paneClipper.addListener("click", this.__handleCellEvent, this);
		this._paneClipper.addListener("dblclick", this.__handleCellEvent, this);
		this._paneClipper.addListener("pointerdown", this.__handleCellEvent, this);
		this._paneClipper.addListener("pointerup", this.__handleCellEvent, this);
		this._paneClipper.addListener("pointermove", this.__handleCellEvent, this);
		this._paneClipper.addListener("pointerout", this.__handleCellEvent, this);
		//
		this._headerClipper.addListener("tap", this.__handleHeaderEvent, this);
		this._headerClipper.addListener("contextmenu", this.__handleHeaderEvent, this);
		this._headerClipper.addListener("dbltap", this.__handleHeaderEvent, this);
		this._headerClipper.addListener("click", this.__handleHeaderEvent, this);
		this._headerClipper.addListener("dblclick", this.__handleHeaderEvent, this);
		this._headerClipper.addListener("pointerdown", this.__handleHeaderEvent, this);
		this._headerClipper.addListener("pointerup", this.__handleHeaderEvent, this);
		this._headerClipper.addListener("pointermove", this.__handleHeaderEvent, this);
		this._headerClipper.addListener("pointerout", this.__handleHeaderEvent, this);
	},

	statics: {

		/**
		 * @type {Integer} The time in milliseconds before resetting the typed character
		 * cached before the cell enters edit mode
		 */
		TEXTRESET_DELAY: 1000
	},

	properties: {

		/**
		 * Sets the background color of the header panel.
		 */
		headerBackColor: { init: null, nullable: true, check: "Color", apply: "_applyHeaderBackColor" }
	},

	members: {

		// indicates whether this scroller handles the row header column.
		__isRowHeader: false,

		// indicates whether this scroller manages frozen columns.
		__isFrozenPane: false,

		// the coordinates (row, col) of the cell under the pointer.
		__lastPointerCell: null,

		// the row being resize.
		__resizeRow: null,

		// whether we are resizing the column headers height
		__resizeHeader: false,

		/**
		 * Returns true if this scroller is in the frozen pane area.
		 */
		isFrozenPane: function () {
			return this.__isFrozenPane;
		},

		/**
		 * Returns true if this scroller is used in the row header pane.
		 */
		isRowHeaderPane: function () {
			return this.__isRowHeader;
		},

		/**
		 * Applies the headerBackColor property.
		 */
		_applyHeaderBackColor: function (value, old) {
			this.__top.setBackgroundColor(value);
			this.getChildControl("header").setBackgroundColor(value);
		},

		/**
		 * Overridden.
		 * Values are updated by the server after processing the edited text.
		 */
		flushEditor: function () {

			if (this.isEditing()) {

				var editor = this._cellEditor;
				if (editor) {
					// update the client data right away - the server may
					// change the cell after processing. but by updating now
					// we can avoid the cell temporarily returning to the original value.
					var value = this.__cellEditorFactory.getCellEditorValue(editor);
					if (value !== undefined) {
						var table = this.getTable();
						var dataModel = table.getTableModel();
						var oldValue = dataModel.getValue(this.__focusedCol, this.__focusedRow);
						if (value !== oldValue) {

							value = qx.bom.String.escape(value);
							dataModel.setValue(this.__focusedCol, this.__focusedRow, value);

							editor.setDirty(true);

							// fire an event containing the value change.
							table.fireDataEvent("dataEdited", {
								row: this.__focusedRow,
								col: this.__focusedCol,
								oldValue: oldValue,
								value: value
							});
						}
					}
				}
			}
		},

		/**
		 * Stops editing without writing the editor's value to the model.
		 */
		cancelEditing: function () {

			// clear any pending editing text.
			this.__popPendingEditorText();

			if (this.isEditing()) {

				var editor = this._cellEditor;

				if (!(editor instanceof qx.ui.window.Window)) {

					// hide the editor and remove it from the
					// indicator, otherwise when the column model is
					// recreated and the focus indication is destroyed the 
					// editor widget is also disposed, causing an error
					// the next time the grid tries to enter edit mode on a column
					// with a disposed editor widget.

					if (this.__focusIndicator._indexOf(editor) > -1)
						this.__focusIndicator._remove(editor);

					this.__focusIndicator.removeState("editing");
					this.__focusIndicator.setKeepActive(true);
				}

				editor.hide();
				editor.updateState("visible");

				this._cellEditor = null;
				this.__cellEditorFactory = null;
			}
		},

		/**
		 * Fires the "beginEdit" event to inform the server
		 * that the grid wants to start editing the current cell.
		 *
		 * The server will invoke beginEdit in response to start
		 * edit mode in the current cell, after it has updated the
		 * current column with the edit widget.
		 *
		 * @param text {String} the text to initialize the editor with.
		 * @param force {Boolean} indicates that edit mode must be started, as opposed to notifying the server when this is false.
		 * @return {Boolean} true if edit mode has started.
		 */
		startEditing: function (text, force) {

			if (wisej.web.DesignMode)
				return;

			var table = this.getTable();
			if (table) {

				text = text || "";

				// start editing mode when this
				// method is called from a server request (force)
				// or the table widget is not wired to the "beginEdit" event.
				//
				// otherwise we simply fire the event on the server and wait for
				// the server code to start editing the cell.

				if (force || !table.isWired("beginEdit")) {

					var pendingEditorText = this.__popPendingEditorText() + text;

					// create the editor and initialize it with the characters
					// that the user may have typed on the cell before it entered edit mode.
					if (this.base(arguments)) {

						if (this._cellEditor) {

							var editor = this._cellEditor;

							// reset the user bounds, we dock to the focus indicator.
							this.__focusIndicator.show();
							editor.resetUserBounds();
							editor.show();

							if (editor.isFocusable())
								editor.focus();

							// assign the pending keystrokes to the editor.
							if (pendingEditorText)
								wisej.web.datagrid.EditorFactory.setCellEditorValue(editor, pendingEditorText);
							else
								wisej.web.datagrid.EditorFactory.selectAllText(editor);

							// inform the editor that it has been initialized in a grid cell.
							editor.fireDataEvent("cellBeginEdit", table);
						}

						return true;
					}

					return false;
				}

				// otherwise, save the editor text and inform the server component that we 
				// have requested to enter edit mode, unless the pending text is coming from a subsequent editing keystroke.
				if (this.__pushPendingEditorText(text) < 2) {

					var row = this.getFocusedRow();
					var col = this.getFocusedColumn();
					if (this.isCellEditable(col, row)) {

						table.fireDataEvent("beginEdit", { col: col, row: row });
						return true;
					}
				}
			}

			return false;
		},

		/**
		 * Checks whether a cell is editable.
		 * @param col {Integer} column index.
		 * @param row {Integer} row index.
		 * @return {Boolean} true if the cell is editable.
		 */
		isCellEditable: function (col, row) {

			return this.getTable().isCellEditable(col, row);
		},

		// Appends the text waiting for the editor to be created.
		__pushPendingEditorText: function (text) {

			if (!text)
				return 0;

			if (this.__pendingEditorTextTimer) {
				clearTimeout(this.__pendingEditorTextTimer);
				this.__pendingEditorTextTimer = 0;
			}

			this.__pendingEditorText = this.__pendingEditorText || "";
			this.__pendingEditorText += text;

			// start the new expiration timer.
			var me = this;
			this.__pendingEditorTextTimer = setTimeout(function () {

				me.__pendingEditorText = null;
				me.__pendingEditorTextTimer = 0;

			}, wisej.web.datagrid.GridScroller.TEXTRESET_DELAY);

			return this.__pendingEditorText.length;
		},

		// Returns the pending characters and reset the cache.
		__popPendingEditorText: function () {

			clearTimeout(this.__pendingEditorTextTimer);

			var text = this.__pendingEditorText || "";
			this.__pendingEditorText = null;
			this.__pendingEditorTextTimer = 0;
			return text;
		},

		// expiration timer for the pending keystrokes buffer.
		__pendingEditorTextTimer: 0,

		// saves the text typed while the grid is starting edit mode and before the edit widget is created and focused.
		__pendingEditorText: null,

		/**
		 * Sets the currently focused cell.
		 *
		 * @param col {Integer} the model index of the focused cell's column.
		 * @param row {Integer} the model index of the focused cell's row.
		 */
		setFocusedCell: function (col, row) {

			// reset any pending editing text.
			this.__popPendingEditorText();

			this.base(arguments, col, row);

		},

		/**
		 * Event handler. Called when the user tapped a pointer button over the header.
		 *
		 * @param e {Map} the event.
		 */
		_onTapHeader: function (e) {

			var table = this.getTable();
			if (!table.isEnabled())
				return;

			// let embedded widgets handle their own events.
			var target = e.getTarget();
			if (target) {
				var parent = target.getLayoutParent();
				if (parent instanceof wisej.web.datagrid.HeaderCell) {
					if (parent.getCellWidget() == target)
						return;
				}
			}

			var pageX = e.getDocumentLeft();
			var col = this._getColumnForPageX(pageX);
			if (col != null) {
				var tableModel = table.getTableModel();
				if (!tableModel.isColumnSortable(col)) {

					switch (table.getSelectionMode()) {
						case "column":
						case "columnHeader":
							if (col != table.getFocusedColumn()) {
								table.setFocusedCell(col, 0, true /*scrollVisible*/, true);
							}
							break;
					}

					table.getSelectionManager().handleTap(col, -1, e);
				}
			}

			this.base(arguments, e);
		},

		/**
		 * Event handler. Called when the user tapped a pointer button over the pane.
		 *
		 * @param e {Map} the event.
		 */
		_onTapPane: function (e) {

			var table = this.getTable();
			if (!table.isEnabled())
				return;

			var pageX = e.getDocumentLeft();
			var pageY = e.getDocumentTop();
			var row = this._getRowForPagePos(pageX, pageY);
			var col = this._getColumnForPageX(pageX);

			if (row != null) {

				var role = wisej.utils.Widget.getTargetRole(e);

				// detect if a tap landed on a checkbox element.
				var isCheckboxTap = (role == "checkbox");

				// detect if the tap landed on the open/close icons
				// of a parent row.
				var isParentRowTap = (role === "open" || role === "close");

				// stop here if it was a tap to open or close the parent row.
				if (isParentRowTap) {
					table.getSelectionManager().handleTap(col, row, e);
					return;
				}

				// detect if the grid should enter edit mode when a cell is selected.
				var startEditing = (table.getEditMode() === "editOnEnter") && !isCheckboxTap;

				// the pointer is over the data -> update the focus cell.
				// notify the server only when the row is unchanged and the column has changed
				// when the row changed we fire "selectionChanged" which will also update
				// the current cell.

				var prevRow = table.getFocusedRow();
				var prevCol = table.getFocusedColumn();

				switch (table.getSelectionMode()) {
					case "cell":
					case "column":
					case "columnHeader":
						if (col <= table.getRowHeaderIndex())
							return;
						break;
				}

				table.setFocusedCell(col, row, true /*scrollVisible*/, false /*notify*/, startEditing);

				// update the selection.
				if (!table.getSelectionManager().handleTap(col, row, e)) {

					// notify the server if the selection has not changed.
					if (prevCol != col || prevRow != row) {
						table.notifyFocusCellChanged(col, row);
					}
				}

				if (this.__focusIndicator.isHidden()
					|| (this.__lastPointerDownCell
						&& !this.__firedTapEvent
						&& !this.isEditing()
						&& row == this.__lastPointerDownCell.row
						&& col == this.__lastPointerDownCell.col)) {

					this.fireEvent("cellTap",
						qx.ui.table.pane.CellEvent,
						[this, e, row, col],
						true);

					this.__firedTapEvent = true;
				}

				if (!this.isEditing()) {

					// start when edit mode is "editOnEnter" and we are not in edit mode - it means
					// that the user ended editing and is still on the same cell, clicking should start editing.
					var cellChanged = prevRow != table.getFocusedRow() || prevCol != table.getFocusedColumn();
					if (!cellChanged && startEditing && !isCheckboxTap)
						table.startEditing();
				}
			}
		},

		/**
		 * Event handler. Called when the user double tapped a pointer button over the pane.
		 *
		 * @param e {Map} the event.
		 */
		_onDbltapPane: function (e) {

			var table = this.getTable();

			if (!table.isEnabled())
				return;

			var pageX = e.getDocumentLeft();
			var pageY = e.getDocumentTop();
			var col = this._getColumnForPageX(pageX);

			if (col != null) {

				var row = this._getRowForPagePos(pageX, pageY);
				if (row != -1 && row != null) {
					this.fireEvent("cellDbltap", qx.ui.table.pane.CellEvent, [this, e, row], true);
				}

				if (!this.isEditing()) {
					// start when edit mode when double clicking on a cell.
					if (table.getEditMode() !== "editOnEnter" && table.getEditMode() !== "editProgrammatically")
						table.startEditing();
				}
			}
		},

		/**
		 * Event listener for the pane clipper's resize event
		 */
		_onResizePane: function () {

			this.base(arguments);

			this.__table.scheduleAutoResize();

			// if the table is in edit mode, make sure the editing cell is visible.
			if (this.__table.isEditing())
				this.scrollCellVisible(this.getFocusedColumn(), this.getFocusedRow());
		},

		/* =======================================================================
		 * Row header logic implementation.
		 * =======================================================================*/

		/**
		 * Detect if this scroller is for the row headers.
		 */
		_applyTablePaneModel: function (value, old) {

			this.base(arguments, value, old);

			this._updateScrollerType();
		},

		/**
		 * Event handler. Called when the row height in the table model has changed.
		 */
		onTableModelRowHeightChanged: function () {

			this._updateContent();
			this.__tablePane.updateContent(true);

		},

		/**
		 * Event handler. Called when the table model meta data has changed.
		 */
		onTableModelMetaDataChanged: function () {

			this._updateScrollerType();
			this.updateHorScrollBarMaximum();
			this._updateFocusIndicator();
			this.__header.onTableModelMetaDataChanged();
			this.__tablePane.onTableModelMetaDataChanged();
		},

		// determines whether this scroller is the row header and or a frozen pane.
		_updateScrollerType: function () {

			var table = this.getTable();
			var model = this.getTablePaneModel();
			var wasRowHeader = this.__isRowHeader;
			var wasFrozenPane = this.__isFrozenPane;

			this.__isRowHeader = model
				? model.getMaxColumnCount() > -1 && model.getFirstColumnX() == table.getRowHeaderIndex() && table.getRowHeadersVisible()
				: false;

			this.__isFrozenPane = model
				? model.getMaxColumnCount() > -1
				: false;

			if (wasRowHeader != this.__isRowHeader || wasFrozenPane != this.__isFrozenPane) {

				this.__showHorizontalScrollbarFiller(this.__isFrozenPane || this.__isRowHeader);

				// hide the focus indicator on row header panels and show it on the regular panels.
				// but preserve the table's showCellFocusIndicator property value.
				this.setShowCellFocusIndicator(!this.__isRowHeader && table.getShowCellFocusIndicator());
			}
		},

		// overridden.
		_applyHorizontalScrollBarVisible: function (value, old) {

			this.base(arguments, value, old);

			var filler = this.getChildControl("filler", true);
			if (filler)
				filler.setVisibility(value ? "visible" : "excluded");
		},

		// overridden.
		_applyVerticalScrollBarVisible: function (value, old) {

			this.base(arguments, value, old);

			var widget = this.getTopRightWidget();
			var vscrollVisible = this.getVerticalScrollBarVisible();
			var headerVisible = this.getTable().getHeaderCellsVisible();
			if (widget && !widget.isVisible()) {


				if (headerVisible) {
					if (vscrollVisible && qx.bom.element.Scroll.getScrollbarWidth() > 0)
						// keep the widget space above the scrollbar.
						widget.hide();
					else
						// hide and remove from the layout since we don't have the scrollbar.
						widget.exclude();
				}
				else {
					// hide and remove from the layout since we don't have a header.
					widget.exclude();
				}
			}
		},

		// show a filler instead of the horizontal scrollbar
		// for the frozen or row-header panes.
		__showHorizontalScrollbarFiller: function (show) {

			var filler = this.getChildControl("filler", true);
			if (show) {

				if (this._indexOf(this.__horScrollBar) > -1)
					this._remove(this.__horScrollBar);

				filler = filler || this.getChildControl("filler");
				filler.addState("horizontal");

				var layoutProps = this.__horScrollBar.getLayoutProperties();
				if (this.__clipperContainer != null) {
					this.__clipperContainer.add(filler, layoutProps);
				}
				else {
					this._add(filler, { row: layoutProps.row, column: layoutProps.column, colSpan: 2 });
				}
			}
			else if (filler != null) {

				this._remove(filler);
				this._add(this.__horScrollBar);
			}
		},

		/* =======================================================================
		 * Row resizing implementation.
		 * =======================================================================*/

		/**
		 * Event handler. Called when the user moved the pointer over the pane.
		 *
		 * @param e {Map} the event.
		 */
		_onPointermovePane: function (e) {

			var table = this.getTable();

			if (!table.isEnabled()) {
				return;
			}

			var useResizeCursor = false;
			var pageX = e.getDocumentLeft();
			var pageY = e.getDocumentTop();

			// workaround: In onpointerwheel the event has wrong coordinates for pageX
			//       and pageY. So we remember the last move event.
			this.__lastPointerPageX = pageX;
			this.__lastPointerPageY = pageY;

			if (this.__resizeRow != null && this.__resizeRow >= 0) {

				// we are currently resizing -> update the position.
				this.__handleResizeRow(pageY);
				useResizeCursor = true;
				e.stopPropagation();
			}
			else if (this.__resizeHeader) {

				// we are currently resizing the column header height.
				this.__handleResizeColHeader(pageY);
				useResizeCursor = true;
				e.stopPropagation();
			}
			else if (this.__canResizeColHeader(pageY)) {

				// the pointer is over a resize region -> show the right cursor.
				useResizeCursor = true;

				this.__header.setPointerOverColumn(null);
			}
			else {

				var col = this._getColumnForPageX(pageX);
				var row = this._getRowForPagePos(pageX, pageY);

				if (row != null && col != null && col >= 0 && row >= 0) {

					if (col == 0) {
						var resizeRow = this._getResizeRowForPageX(pageX, pageY, row);
						if (resizeRow != null && resizeRow > -1) {

							// the pointer is over a resize region -> show the right cursor.
							useResizeCursor = true;
						}
					}
					else {

						// the pointer is over the data -> update the focus.
						if (this.getFocusCellOnPointerMove()) {
							this._focusCellAtPagePos(pageX, pageY);
						}
					}
				}

				this.__header.setPointerOverColumn(null);
			}

			var cursor = useResizeCursor ? "row-resize" : table.getCursor();
			this.getApplicationRoot().setGlobalCursor(cursor);
			this.setCursor(cursor);

			// if we haven't detected a row resize position, and
			// the column headers are hidden, try to detect
			// a column resize position.
			if (!cursor && !table.getHeaderCellsVisible()) {
				this._onPointermoveHeader(e);
			}
		},

		/**
		 * Event handler. Called when the user pressed a pointer button over the pane.
		 *
		 * @param e {Map} the event.
		 */
		_onPointerdownPane: function (e) {

			var table = this.getTable();
			if (!table.isEnabled()) {
				return;
			}

			var pageX = e.getDocumentLeft();
			var pageY = e.getDocumentTop();

			if (this.__canResizeColHeader(pageY)) {

				// the pointer is over a resize region -> start resizing the column header.
				this.__startResizingColHeader(pageY);
				e.stopPropagation();
				return;
			}

			// pointer is over the resize area between rows?
			var col = this._getColumnForPageX(pageX)
			var row = this._getRowForPagePos(pageX, pageY);

			if (row != null && col != null && col >= 0 && row >= 0) {

				if (col == 0) {
					var resizeRow = this._getResizeRowForPageX(pageX, pageY, row);
					if (resizeRow != null) {

						// the pointer is over a resize region -> start resizing the row.
						this._startResizeRow(resizeRow, pageY);
						e.stopPropagation();
						return;
					}
				}
			}

			if (table.isEditing()) {
				// notify the server if the user tapped
				// outside of a valid cell, otherwise
				// we don't process the "endEdit" event waiting
				// for the "focusCellChanged" event instead.
				var notify = (row == null || col == null);

				table.stopEditing(notify);
			}

			this.base(arguments, e);
		},

		/**
		 * Event handler. Called when the user released a pointer button over the pane.
		 *
		 * @param e {Map} the event.
		 */
		_onPointerupPane: function (e) {

			var table = this.getTable();

			if (!table.getEnabled()) {
				return;
			}

			if (this.__resizeRow != null && this.__resizeRow >= 0) {

				this._stopResizeRow();
				e.stop();
			}
			else if (this.__resizeHeader) {

				this.__stopResizeColHeader();
				e.stop();
			}
		},

		/**
		 * Shows the column resize line.
		 *
		 * @param x {Integer} the position where to show the line (in pixels, relative to
		 *      the left side of the pane).
		 */
		_showResizeLine: function (x) {
			var resizeLine = this._showChildControl("resize-line");

			var scrollX = this.getScrollX();
			var width = resizeLine.getWidth();
			var bounds = this.getTable().getBounds();
			var paneBounds = this.getBounds();
			var containerBounds = this.getLayoutParent().getBounds();

			resizeLine.setUserBounds(
				x + paneBounds.left + containerBounds.left - Math.round(width / 2) - scrollX,
				0, width, bounds.height
			);
		},

		/**
		 * Start a resize session of a row.
		 *
		 * @param resizeRow {Integer} the row index
		 * @param pageY {Integer} x coordinate of the pointer event
		 */
		_startResizeRow: function (resizeRow, pageY) {

			var table = this.getTable();
			var dataModel = table.getTableModel();
			var rowHeight = dataModel.getRowHeight(resizeRow);

			// The pointer is over a resize region -> Start resizing
			this.__resizeRow = resizeRow;
			this.__lastResizePointerPageY = pageY;
			this.__lastResizeRowHeight = rowHeight;
			this._paneClipper.capture();

			// show the resize line immediately on pointer down.
			this.__handleResizeRow(pageY);
		},

		/**
		 * Common row resize logic.
		 *
		 * @param pageY {Integer} the current pointer y position.
		 */
		__handleResizeRow: function (pageY) {

			var table = this.getTable();
			var rowIndex = this.__resizeRow;
			var dataModel = table.getTableModel();
			var newHeight = this.__lastResizeRowHeight + pageY - this.__lastResizePointerPageY;

			// limit the row height.
			var minRowHeight = dataModel.getMinRowHeight(rowIndex) || 10;
			if (newHeight < minRowHeight) {
				pageY += (minRowHeight - newHeight);
				newHeight = minRowHeight;
			}
			var maxRowHeight = dataModel.getMaxRowHeight(rowIndex) || 32000;
			if (newHeight > maxRowHeight) {
				pageY += (maxRowHeight - newHeight);
				newHeight = maxRowHeight;
			}

			if (this.isLiveResize()) {

				// resize all rows?
				if (table.isKeepSameRowHeight()) {
					table.setRowHeight(newHeight);
					table.fireDataEvent("rowHeightChanged", { height: table.getRowHeight() });
				}
				else {
					dataModel.setRowHeight(rowIndex, newHeight, true);
				}

			}
			else {
				var y = pageY - table.getContentLocation().top;
				this._showResizeRowLine(y);
			}

			this.__lastResizePointerPageY = pageY;
			this.__lastResizeRowHeight = newHeight;
		},

		/**
		 * Stop a resize session of a row.
		 */
		_stopResizeRow: function () {

			// we are currently resizing -> finish resizing

			if (!this.isLiveResize()) {

				this._hideResizeRowLine();
				var table = this.getTable();
				var rowIndex = this.__resizeRow;

				// resize all rows?
				if (table.isKeepSameRowHeight() && rowIndex > -1) {
					table.setRowHeight(this.__lastResizeRowHeight);
					table.fireDataEvent("rowHeightChanged", { height: table.getRowHeight() });
				}
				else {
					// resized a data row.
					var dataModel = table.getTableModel();
					dataModel.setRowHeight(rowIndex, this.__lastResizeRowHeight, true);
				}
			}

			this.__resizeRow = null;
			this._paneClipper.releaseCapture();

			this.getApplicationRoot().setGlobalCursor(null);
			this.setCursor(null);
		},

		/**
		 * Shows the resize line.
		 *
		 * @param y {Integer} the position where to show the line (in pixels, relative to
		 *      the top side of the pane).
		 */
		_showResizeRowLine: function (y) {

			var table = this.getTable();
			var bounds = table.getBounds();
			var resizeLine = table._showChildControl("resize-line");

			var height = resizeLine.getHeight();

			resizeLine.setUserBounds(
				0, y - Math.round(height / 2), bounds.width, height);
		},

		/**
		 * Hides the resize line.
		 */
		_hideResizeRowLine: function () {
			var table = this.getTable();
			table._excludeChildControl("resize-line");
		},

		/**
		 * Returns the model index of the row that should be resized when dragging
		 * starts here. Returns -1 if the pointer is in no resize region of any row.
		 *
		 * @param pageX {Integer} the x position of the pointer in the page (in pixels).
		 * @param pageY {Integer} the y position of the pointer in the page (in pixels).
		 * @param row {Integer?} the row index at pageX, pageY.
		 * @return {Integer} the row index.
		 */
		_getResizeRowForPageX: function (pageX, pageY, row) {

			// find the row below the pointer and detect the resizable bottom edge.
			row = row === undefined ? this._getRowForPagePos(pageX, pageY) : row;

			if (row != null && row > -1) {

				// check the row is resizable.
				var table = this.getTable();
				switch (table.getAutoSizeRowsMode()) {
					case "none":
					case "doubleClick":
						var dataModel = table.getTableModel();
						if (!dataModel.getResizable(row))
							return null;
						break;

					default:
						return null;
				}

				var rowHeight = dataModel.getRowHeight(row);
				var panePos = this.__tablePane.getContentLocation();

				// calculate the bottom edge of the resizable row.
				var rowTop = this.getRowTop(row);
				if (rowTop != null) {
					var rowBottom = rowTop + rowHeight + panePos.top - qx.ui.table.pane.Scroller.RESIZE_REGION_RADIUS;
					if (pageY >= rowBottom) {
						return row;
					}
				}
			}

			return null;
		},

		/**
		 * Returns the model index of the column that should be resized when dragging
		 * starts here. Returns -1 if the pointer is in no resize region of any column.
		 *
		 * @param pageX {Integer} the x position of the pointer in the page (in pixels).
		 * @return {Integer} the column index.
		 */
		_getResizeColumnForPageX: function (pageX) {

			var colIndex = -1;
			var paneModel = this.getTablePaneModel();
			var colCount = paneModel.getColumnCount();
			var columnModel = this.getTable().getTableColumnModel();
			var regionRadius = qx.ui.table.pane.Scroller.RESIZE_REGION_RADIUS;
			var currX = this.__tablePane.getContentLocation().left;

			var rtl = this.isRtl();

			for (var x =
				rtl ? (colCount - 1) : (0);
				rtl ? (x > -1) : (x < colCount);
				rtl ? (x--) : (x++)) {

				var col = paneModel.getColumnAtX(x);
				var colWidth = columnModel.getColumnWidth(col);
				currX += colWidth;

				if (pageX >= (currX - regionRadius) && pageX <= (currX + regionRadius)) {
					colIndex = col;
					break;
				}
			}

			if (colIndex > -1) {
				// check if the column is resizable.
				var colHeader = this.getTable().getColumns()[colIndex];
				if (!colHeader.canResize())
					colIndex = -1;
			}

			return colIndex;
		},

		/**
		 * =======================================================================
		 * Columns header resizing.
		 * =======================================================================*/

		/**
		 * Determines whether we can resize the column header height.
		 *
		 * @param pageY {Integer} y coordinate of the pointer event
		 */
		__canResizeColHeader: function (pageY) {

			var table = this.getTable();
			if (table.getHeaderCellsVisible() &&  table.getHeaderSizeMode() == "enableResizing") {
				var panePos = this.__tablePane.getContentLocation();
				return panePos && ((pageY - panePos.top) < (qx.ui.table.pane.Scroller.RESIZE_REGION_RADIUS / 2));
			}

			return false;
		},

		/**
		 * Handles the resizing of the column header height.
		 *
		 * @param pageY {Integer} y coordinate of the pointer event
		 */
		__handleResizeColHeader: function (pageY) {

			var table = this.getTable();
			var minHeight = 24;
			var maxHeight = table.getBounds().height / 2;
			var distance = pageY - this.__lastResizePointerPageY;
			var newHeight = table.getHeaderCellHeight() + distance;

			if (newHeight < minHeight) {
				pageY += (minHeight - newHeight);
				newHeight = minHeight;
			}
			if (newHeight > maxHeight) {
				pageY += (maxHeight - newHeight);
				newHeight = maxHeight;
			}

			this.__lastResizeRowHeight = newHeight;

			if (this.isLiveResize()) {
				table.setHeaderCellHeight(newHeight);
				this.__lastResizePointerPageY = pageY;
			}
			else {
				var y = pageY - table.getContentLocation().top;
				this._showResizeRowLine(y);
			}
		},

		/**
		 * Start a resize session of the column header height.
		 *
		 * @param pageY {Integer} y coordinate of the pointer event
		 */
		__startResizingColHeader: function (pageY) {

			this.__resizeHeader = true;
			this.__lastResizePointerPageY = pageY;

			// show the resize line immediately on pointer down.
			this._paneClipper.capture();
			this.__handleResizeColHeader(pageY);
		},

		/**
		 * Stops the resize session of the column header height.
		 */
		__stopResizeColHeader: function () {

			this.__resizeHeader = false;
			this._hideResizeRowLine();

			var table = this.getTable();
			table.setHeaderCellHeight(this.__lastResizeRowHeight);
		},

		/**
		 * =======================================================================
		 * Row header resizing.
		 * =======================================================================*/

		/**
		 * Start a resize session of the row header column.
		 *
		 * @param resizeCol {Integer} the column index
		 * @param pageX {Integer} x coordinate of the pointer event
		 */
		_startResizeHeader: function (resizeCol, pageX) {

			this.base(arguments, resizeCol, pageX);

			// show the resize line immediately on pointer down.
			this.__handleResizeColumn(pageX);
		},

		/* =======================================================================
		 * Column moving and resizing implementation.
		 * =======================================================================*/

		/**
		 * Event handler. Called when the user pressed a pointer button over the header.
		 *
		 * @param e {Map} the event.
		 */
		_onPointerdownHeader: function (e) {

			var table = this.getTable();
			if (!table.getEnabled()) {
				return;
			}

			var pageX = e.getDocumentLeft();

			// pointer is in header.
			var resizeCol = this._getResizeColumnForPageX(pageX);
			if (resizeCol != -1) {

				// the pointer is over a resize region -> Start resizing.
				this._startResizeHeader(resizeCol, pageX);
				e.stopPropagation();
			}
			else {
				// the pointer is not in a resize region.
				var moveCol = this._getColumnForPageX(pageX);
				if (moveCol != null) {
					if (this._startMoveHeader(moveCol, pageX))
						e.stopPropagation();
				}
			}
		},

		/**
		 * Start a move session of the header.
		 * Overridden to prevent frozen columns from getting moved.
		 *
		 * @param moveCol {Integer} the column index
		 * @param pageX {Integer} x coordinate of the pointer event
		 */
		_startMoveHeader: function (moveCol, pageX) {

			if (moveCol != null && moveCol > -1) {
				// check if the column is movable.
				var colHeader = this.getTable().getColumns()[moveCol];
				if (colHeader.isMovable()) {
					this.base(arguments, moveCol, pageX);
					return true;
				}
			}
		},

		/**
		 * Column move logic.
		 * Overridden to prevent columns from changing scroll panes.
		 *
		 * @param pageX {Integer} the current pointer x position.
		 */
		__handleMoveColumn: function (pageX) {

			// check whether we moved outside the tap tolerance so we can start
			// showing the column move feedback (showing the column move feedback prevents the ontap event)

			var tapTolerance = qx.ui.table.pane.Scroller.TAP_TOLERANCE;
			if (this.__header.isShowingColumnMoveFeedback()
				|| pageX > this.__lastMovePointerPageX + tapTolerance
				|| pageX < this.__lastMovePointerPageX - tapTolerance) {

				this.__lastMoveColPos += pageX - this.__lastMovePointerPageX;
				this.__header.showColumnMoveFeedback(this._moveColumn, this.__lastMoveColPos);

				// get the responsible scroller pane.
				var targetScroller = this.__table.getTablePaneScrollerAtPageX(pageX);

				// don't let the column jump scroll panes.
				if (this._lastMoveTargetScroller && this._lastMoveTargetScroller != targetScroller) {
					this.__lastMovePointerPageX = pageX;
					return false;
				}

				if (targetScroller != null) {
					this._lastMoveTargetX = targetScroller.showColumnMoveFeedback(pageX);
				} else {
					this._lastMoveTargetX = null;
				}

				this._lastMoveTargetScroller = targetScroller;
				this.__lastMovePointerPageX = pageX;
			}
		},

		/* ======================================================================= */

		/**
		  * Updates the content. Sets the right section the table pane should show and
		  * does the scrolling.
		  */
		_updateContent: function () {

			var paneSize = this.__getPaneClipperSize();
			if (!paneSize) {
				// will be called on the next resize event.
				return;
			}

			var scrollX = this.getScrollX();

			// calculate the first row.
			var firstRow = this.getFirstVisibleRow();
			var visibleRowCount = this.getVisibleRowCount(true);

			// update the pane and the focus indicator.
			this.__tablePane.setFirstVisibleRow(firstRow);
			this.__tablePane.setVisibleRowCount(visibleRowCount);

			// maintain the horizontal position.
			this._paneClipper.scrollToX(scrollX);

			// need to update the scrollbar max on each update in case the 
			// new rows being rendered have a different height,
			this.updateVerScrollBarMaximum();

			this._updateFocusIndicator();
		},

		/**
		 * Event handler. Called when the table model has changed.
		 *
		 * @param firstRow {Integer} The index of the first row that has changed.
		 * @param lastRow {Integer} The index of the last row that has changed.
		 * @param firstColumn {Integer} The model index of the first column that has changed.
		 * @param lastColumn {Integer} The model index of the last column that has changed.
		 */
		onTableModelDataChanged: function (firstRow, lastRow, firstColumn, lastColumn) {

			this.__tablePane.onTableModelDataChanged(firstRow, lastRow, firstColumn, lastColumn);

			var rowCount = this.getTable().getTableModel().getRowCount();

			this._updateContent();

			if (this.getFocusedRow() >= rowCount) {
				if (rowCount == 0) {
					this.setFocusedCell(null, null);
				} else {
					this.setFocusedCell(this.getFocusedColumn(), rowCount - 1);
				}
			}
			this.__lastRowCount = rowCount;
		},

		/* =======================================================================
		 * Variable row height scrolling implementation.
		 * =======================================================================*/

		/**
		 * Updates the maximum of the vertical scroll bar, so it corresponds to the
		 * number of rows in the table.
		 * 
		 * @param firstRow {visibleRowCount?} Total number of visible rows.
		 */
		updateVerScrollBarMaximum: function (visibleRowCount) {

			var paneSize = this.__getPaneClipperSize();
			if (!paneSize)
				// will be called on the next resize event.
				return;

			var table = this.getTable();
			var tableModel = table.getTableModel();

			// get the full size of the scroller.
			var rowCount = tableModel.getRowCount();
			if (!rowCount)
				// will be called on the next resize event.
				return;

			// update the scroller (vertical scroll bar).
			var scrollBar = this.__verScrollBar;

			if (visibleRowCount === undefined)
				visibleRowCount = this.getVisibleRowCount(false);

			if (visibleRowCount < rowCount) {

				var max = Math.max(0, rowCount - visibleRowCount);
				scrollBar.setMaximum(max);
				scrollBar.setKnobFactor(visibleRowCount / rowCount);

				// scroll 1 row as a single step.
				scrollBar.setSingleStep(1);

				// scroll the number of visible rows as a page step.
				scrollBar.setPageStep(visibleRowCount);

				var pos = scrollBar.getPosition();
				scrollBar.setPosition(Math.min(pos, max));
			}
			else {
				scrollBar.setMaximum(0);
				scrollBar.setKnobFactor(1);
				scrollBar.setPosition(0);
			}
		},

		/**
		 * Returns which scrollbars are needed.
		 *
		 * @param forceHorizontal {Boolean ? false} Whether to show the horizontal
		 *      scrollbar always.
		 * @param preventVertical {Boolean ? false} Whether to show the vertical scrollbar
		 *      never.
		 * @return {Integer} which scrollbars are needed. This may be any combination of
		 *      {@link #HORIZONTAL_SCROLLBAR} or {@link #VERTICAL_SCROLLBAR}
		 *      (combined by OR).
		 */
		getNeededScrollBars: function (forceHorizontal, preventVertical) {

			var horNeeded = false;
			var verNeeded = false;
			var table = this.getTable();
			var scrollBars = table.getScrollBars();
			var verBarMask = qx.ui.table.pane.Scroller.VERTICAL_SCROLLBAR;
			var horBarMask = qx.ui.table.pane.Scroller.HORIZONTAL_SCROLLBAR;

			//
			// determine if the horizontal scrollbar is needed.
			// 

			if (!this.__isRowHeader && !this.__isFrozenPane && scrollBars > 0) {

				var clipperSize = this.__getPaneClipperSize();
				if (clipperSize) {

					var viewWidth = clipperSize.width;

					//
					// determine if the horizontal scrollbar is needed.
					// 
					if ((scrollBars & horBarMask) != 0) {

						// get the required width of the pane.
						var paneWidth = this.getTablePaneModel().getTotalWidth();

						// the horizontal scrollbar is needed when the pane width is bigger than the view width in pixels.
						horNeeded = paneWidth > viewWidth;
					}

					//
					// determine if the vertical scrollbar is needed.
					// 
					if ((scrollBars & verBarMask) != 0) {

						// get the visible row count.
						var rowCount = table.getTableModel().getRowCount();
						var visibleRows = this.getVisibleRowCount(false);

						// the vertical scrollbar is needed when the visible rows are less than the total rows.
						verNeeded = rowCount > visibleRows;
					}
				}
			}

			// return the scrollbar mask.
			return ((forceHorizontal || horNeeded) ? horBarMask : 0) | ((preventVertical || !verNeeded) ? 0 : verBarMask);
		},

		/**
		 * Scrolls a cell visible.
		 *
		 * @param col {Integer} the model index of the column the cell belongs to.
		 * @param row {Integer} the model index of the row the cell belongs to.
		 * @param alignX {String?null} Alignment of the item. Allowed values:
		 *   <code>left</code> or <code>right</code>. Could also be null.
		 *   Without a given alignment the method tries to scroll the widget
		 *   with the minimum effort needed.
		 * @param alignY {String?null} Alignment of the item. Allowed values:
		 *   <code>top</code> or <code>bottom</code>. Could also be null.
		 *   Without a given alignment the method tries to scroll the widget
	     *   with the minimum effort needed.
		 */
		scrollCellVisible: function (col, row, alignX, alignY) {

			var table = this.getTable();
			var paneModel = this.getTablePaneModel();

			var xPos = paneModel.getX(col);
			if (xPos != -1) {

				var clipperSize = this.__getPaneClipperSize();
				if (!clipperSize)
					return;

				var columnModel = table.getTableColumnModel();

				// scroll the cell horizontally to ensure its visibility.
				var scrollX = this.getScrollX();
				var colWidth = columnModel.getColumnWidth(col);
				var colLeft = (!this.isRtl())
					? paneModel.getColumnLeft(col)
					: paneModel.getTotalWidth() - paneModel.getColumnLeft(col) - colWidth;

				var newScrollX = scrollX;
				switch (alignX) {

					case "left":
						newScrollX = colLeft;
						break;

					case "right":
						newScrollX = colLeft - clipperSize.width + colWidth;
						break;

					default:
						var minScrollX = Math.min(colLeft, colLeft + colWidth - clipperSize.width);
						var newScrollX = Math.max(minScrollX, Math.min(colLeft, scrollX));
						break;
				}
				if (newScrollX != scrollX)
					this.setScrollX(newScrollX);
			}


			// don't scroll frozen rows.
			if (row < table.getFrozenRows())
				return;

			// determine the Y scroll. the vertical scrollbar uses the number of rows instead of the pixels.
			var scrollY = this.getScrollY();
			var topRow = this.getFirstVisibleRow();
			var visibleRows = this.getVisibleRowCount();
			var bottomRow = topRow + visibleRows - 1;

			if (topRow != null && topRow >= 0) {

				var newScrollY = scrollY;
				switch (alignY) {
					case "top":
						newScrollY = row;
						break;

					case "bottom":
						visibleRows = this.getVisibleRowCount(false, -row);
						newScrollY = Math.max(0, row - visibleRows + 1);
						break;

					default:
						if (row <= topRow) {
							newScrollY = row;
						}
						else {

							if (row > bottomRow) {
								visibleRows = this.getVisibleRowCount(false, -row);
								newScrollY = Math.max(0, row - visibleRows + 1);
							}
						}
						break;
				}

				if (newScrollY != scrollY) {

					// update the scroll range before scrolling.
					if (alignY !== "top") {
						var scrollerArr = table._getPaneScrollerArr();
						for (var i = 0; i < scrollerArr.length; i++) {
							scrollerArr[i].updateVerScrollBarMaximum(visibleRows);
						}
					}

					this.setScrollY(newScrollY, true);
				}
			}
		},

		/**
		 * Returns the Y position of the row within the pane.
		 *
		 * @param rowIndex {Integer} the index of the row.
		 */
		getRowTop: function (rowIndex) {

			var top = 0;
			var table = this.getTable();
			var tableModel = table.getTableModel();
			var firstRow = this.getFirstVisibleRow();
			var frozenRows = table.getFrozenRows();

			// frozen row?
			if (rowIndex < frozenRows) {
				for (var row = 0; row < rowIndex; row++) {
					top += tableModel.getRowHeight(row);
				}
				return top;
			}

			firstRow += frozenRows;

			if (firstRow != null && firstRow >= 0) {

				if (Math.abs(rowIndex - firstRow) > 5000)
					return null;

				if (firstRow < rowIndex) {
					for (var row = firstRow; row < rowIndex; row++) {
						top += tableModel.getRowHeight(row);
					}
				}
				else if (firstRow > rowIndex) {
					for (var row = rowIndex; row < firstRow; row++) {
						top -= tableModel.getRowHeight(row);
					}
				}
			}

			top += this.getFrozenRowsHeight();

			return top;
		},

		/**
		 * Returns the model index of the row the pointer is currently over. Returns -1 if
		 * the pointer is over the header. Returns null if the pointer is not over any
		 * column.
		 *
		 * @param pageX {Integer} the pointer x position in the page.
		 * @param pageY {Integer} the pointer y position in the page.
		 * @return {Integer} the model index of the row the pointer is currently over.
		 */
		_getRowForPagePos: function (pageX, pageY) {

			var panePos = this.__tablePane.getContentLocation();
			if (!panePos)
				return null

			// there was no cell or header cell hit.
			if (pageX < panePos.left || pageX > panePos.right)
				return null;

			// if this event is in the pane -> get the row.
			if (pageY >= panePos.top && pageY <= panePos.bottom) {

				// find the row index of the row at the Y position.
				return this.getRowAt(pageY - panePos.top);
			}

			var headerPos = this.__header.getContentLocation();

			// this event is in the pane -> return -1 for the header.
			if (headerPos) {
				if (pageY >= headerPos.top &&
					pageY <= headerPos.bottom &&
					pageX <= headerPos.right) {
					return -1;
				}
			}

			return null;
		},

		/** 
		 * keeps track of the pixel remainder when touch scrolling.
		 * our grid scroller can only scroll by whole rows but mobile
		 * devices generate multiple small steps (1px) when touch scrolling.
		 */
		__scrollRemainderY: 0,

		/**
		 * Event handler. Called when the user moved the mouse wheel.
		 *
		 * @param e {qx.event.type.Roll} the event.
		 */
		_onRoll: function (e) {

			var table = this.getTable();
			if (e.getPointerType() === "mouse" || !table.isEnabled())
				return;

			var delta = e.getDelta();
			var rowHeight = table.getRowHeight();

			// calculate the number of rows to scroll.
			// this scroller can only scroll by row, not by pixels because
			// of the support for variable row height.
			var scrollY = delta.y;
			scrollY += this.__scrollRemainderY;
			scrollY = (scrollY / rowHeight) | 0;

			// calculate the number of pixels left after the normalization.
			if (!this.__isAtEdge(this.__verScrollBar, delta.y)) {
				this.__scrollRemainderY = (delta.y + this.__scrollRemainderY) % rowHeight;
				if (this.__scrollRemainderY) {
					var me = this;
					clearTimeout(this.__scrollRemainderTimer);
					this.__scrollRemainderTimer = setTimeout(function () {
						me.__scrollRemainderY = 0;
					}, 250);
				}
			}

			// scroll vertically.
			this.__verScrollBar.scrollBy(scrollY);
			var scrolled =
				this.__scrollRemainderY != 0 ||
				(scrollY != 0 && !this.__isAtEdge(this.__verScrollBar, scrollY));

			// calculate number of pixels to scroll.
			var scrollX = parseInt(delta.x, 10) | 0;

			if (scrollX > 0)
				scrollX = Math.ceil(scrollX);
			else
				scrollX = Math.floor(scrollX);

			// scroll horizontally.
			this.__horScrollBar.scrollBy(scrollX);
			scrolled = scrolled || (scrollX != 0 && !this.__isAtEdge(this.__horScrollBar, scrollX));

			// update the focus indicator.
			if (this.__lastPointerPageX && this.getFocusCellOnPointerMove()) {
				this._focusCellAtPagePos(this.__lastPointerPageX, this.__lastPointerPageY);
			}

			// pass the event to the parent if the scrollbar is at an edge
			if (scrolled) {
				e.stop();
			} else {
				e.stopMomentum();
			}
		},

		/**
		 * Returns the size of the pane clipper including the horizontal scrollbar.
		 */
		__getPaneClipperSize: function (includeScrollBars) {

			var clipperSize = this._paneClipper.getInnerSize();

			if (clipperSize && includeScrollBars > 0) {

				if (!qx.core.Environment.get("os.scrollBarOverlayed")) {

					if ((includeScrollBars & qx.ui.table.pane.Scroller.HORIZONTAL_SCROLLBAR) != 0) {
						var horScrollBar = this.__horScrollBar;
						if (horScrollBar.isVisible()) {
							var horScrollBarHeight =
								horScrollBar.getSizeHint().height
								+ horScrollBar.getMarginTop() + horScrollBar.getMarginBottom();

							clipperSize.height += horScrollBarHeight;
						}
					}

					if ((includeScrollBars & qx.ui.table.pane.Scroller.VERTICAL_SCROLLBAR) != 0) {
						var verScrollBar = this.__verScrollBar;
						if (verScrollBar.isVisible()) {
							var verScrollBarWidth =
								verScrollBar.getSizeHint().width
								+ verScrollBar.getMarginLeft() + verScrollBar.getMarginRight();

							clipperSize.width += verScrollBarWidth;
						}
					}
				}
			}

			return clipperSize;
		},

		/**
		 * Returns the row at the Y coordinate within the table.
		 *
		 * @param y {Integer} the y location of the requested row.
		 */
		getRowAt: function (y) {

			var table = this.getTable();
			var tableModel = table.getTableModel();
			var rowCount = tableModel.getRowCount();
			var firstRow = this.getFirstVisibleRow();

			// is the location on the frozen rows?
			var frozenRows = table.getFrozenRows();
			if (frozenRows > 0) {
				var pointerY = y;
				for (var row = 0; pointerY != null && pointerY >= 0 && row < frozenRows; row++) {

					pointerY -= tableModel.getRowHeight(row);
					if (pointerY <= 0)
						return row;
				}
			}

			// find the row under the mouse but adding the height of the rows
			// starting from the row at the top of the scroll pane.
			firstRow += frozenRows;
			var pointerY = y - this.getFrozenRowsHeight();
			for (var row = firstRow; pointerY != null && pointerY >= 0 && row < rowCount; row++) {

				pointerY -= tableModel.getRowHeight(row);
				if (pointerY <= 0)
					return row;
			}

			return null;
		},

		/**
		 * Returns the row at the top of the visible range.
		 */
		getFirstVisibleRow: function () {

			var scrollY = this.__verScrollBar.getPosition();
			return scrollY | 0;

		},

		/**
		 * Returns the number of visible rows.
		 *
		 * @param partial {Boolean?} count partially visible rows.
		 * @param firstRow {Integer?} starting row to count the visible rows. If negative, it indicates the bottom row to count the rows upward.
		 */
		getVisibleRowCount: function (partial, firstRow) {

			partial = partial === undefined ? false : partial;

			var count = 0;
			var paneSize = this.__getPaneClipperSize(
				partial
					? qx.ui.table.pane.Scroller.HORIZONTAL_SCROLLBAR
					: false);

			if (paneSize) {

				var rowHeight = 0;
				var height = paneSize.height;
				var table = this.getTable();
				var tableModel = table.getTableModel();

				if (firstRow === undefined || firstRow > -1) {

					var rowCount = tableModel.getRowCount();
					firstRow = firstRow === undefined ? this.getFirstVisibleRow() : firstRow;

					for (var row = firstRow; height > 0 && row < rowCount; row++) {

						rowHeight = tableModel.getRowHeight(row);

						if (height >= rowHeight)
							count++;
						else if (height > 0 && partial)
							count++;

						height -= rowHeight;
					}

					// if there are not enough rows to fill the table, count the rows
					// that are scrolled up.
					if (height > 0) {
						for (var row = firstRow - 1; height > 0 && row >= 0; row--) {

							rowHeight = tableModel.getRowHeight(row);

							if (height >= rowHeight)
								count++;
							else if (height > 0 && partial)
								count++;

							height -= rowHeight;
						}
					}
				} else if (firstRow < 0) {

					for (var row = -firstRow; height > 0 && row >= 0; row--) {

						rowHeight = tableModel.getRowHeight(row);

						if (height >= rowHeight)
							count++;
						else if (height > 0 && partial)
							count++;

						height -= rowHeight;
					}

				}
			}

			return count;
		},

		/**
		 * Returns the total number of pixels used by frozen rows at the top.
		 */
		getFrozenRowsHeight: function () {

			var height = 0;
			var table = this.getTable();
			var frozenRows = table.getFrozenRows();

			if (frozenRows > 0) {
				var tableModel = table.getTableModel();
				for (var i = 0; i < frozenRows; i++) {
					height += tableModel.getRowHeight(i);
				}
			}

			return height;
		},

		/* =======================================================================
		 * Wired events handling.
		 *
		 * Process mouse events and generates the appropriate
		 * events for the server side component.
		 * =======================================================================*/

		__handleCellEvent: function (e) {

			var table = this.getTable();

			// let embedded widgets handle their own events.
			var target = e.getTarget();
			if (!(target instanceof qx.ui.root.Inline) &&
				!qx.ui.core.Widget.contains(table, target)) {
				return;
			}

			var role = wisej.utils.Widget.getTargetRole(e);

			switch (e.getType()) {

				case "pointerout":
					this.__handleEvent(e, null, null, null);
					return;

				case "pointermove":

					// avoid processing pointer movements unless the server component
					// subscribed to the relevant events.
					if (!table.isWired("gridCellMouseEnter")
						&& !table.isWired("gridCellMouseLeave")
						&& !table.isWired("gridCellMouseMove"))
						return;

					break;

				case "tap":
				case "dbltap":
				case "click":
				case "pointerup":
				case "pointerdown":
					var pageX = e.getDocumentLeft();
					var pageY = e.getDocumentTop();
					var col = this._getResizeColumnForPageX(pageX);
					var row = this._getResizeRowForPageX(pageX, pageY);
					if (row != null && (row > -1 || col > -1)) {
						role = "resize";

						// detect double clicks right on the resize line
						// to trigger the automatic column or row resize.
						this.__autoSizeRowOnResizerDoubleClick(e, row);
						this.__autoSizeColumnOnResizerDoubleClick(e, col);
					}

					break;

				case "dblclick":
					var pageX = e.getDocumentLeft();
					var pageY = e.getDocumentTop();
					var col = this._getResizeColumnForPageX(pageX);
					var row = this._getResizeRowForPageX(pageX, pageY);
					if (row != null && (row > -1 || col > -1)) {
						role = "resize";
					}

					break;
			}

			if (this.__resizeRow == null && this.__resizeColumn == null) {
				var pageX = e.getDocumentLeft();
				var pageY = e.getDocumentTop();
				var col = this._getColumnForPageX(pageX);
				var row = this._getRowForPagePos(pageX, pageY);
				this.__handleEvent(e, col, row, role);

			}
		},

		__handleHeaderEvent: function (e) {

			// let embedded widgets handle their own events.
			var target = e.getTarget();
			if (target) {
				var parent = target.getLayoutParent();
				if (parent instanceof wisej.web.datagrid.HeaderCell) {
					if (parent.getCellWidget() === target)
						return;
				}
			}

			var role = wisej.utils.Widget.getTargetRole(e);

			switch (e.getType()) {

				case "pointerout":
					this.__handleEvent(e, null, null, null);
					return;

				case "pointermove":
					// avoid processing pointer movements unless the server component
					// subscribed to the relevant events.
					var table = this.getTable();
					if (!table.isWired("gridCellMouseEnter")
						&& !table.isWired("gridCellMouseLeave")
						&& !table.isWired("gridCellMouseMove"))
						return;

					break;

				case "tap":
				case "dbltap":
				case "click":
				case "pointerup":
				case "pointerdown":
					var pageX = e.getDocumentLeft();
					var col = this._getResizeColumnForPageX(pageX);
					if (col > -1) {
						role = "resize";

						// detect double clicks right on the resize line
						// to trigger the automatic column resize.
						this.__autoSizeColumnOnResizerDoubleClick(e, col);
					}

					break;

				case "dblclick":
					var pageX = e.getDocumentLeft();
					var col = this._getResizeColumnForPageX(pageX);
					if (col > -1) {
						role = "resize";
					}

					break;
			}

			if (this.__resizeRow == null && this.__resizeColumn == null) {
				var pageX = e.getDocumentLeft();
				var col = this._getColumnForPageX(pageX);
				this.__handleEvent(e, col, -1, role);
			}
		},

		__autoSizeColumnOnResizerDoubleClick: function (e, col) {

			if (col < 0)
				return;

			if (e.getType() !== "pointerup")
				return;

			var time = Date.now();
			if (time - this.__resizerPointerDownTime < 500 /* standard double-click time */
				&& this.__resizerPointerLastPageX - e.getDocumentLeft() === 0) {

				this.__resizerPointerDownTime = 0;
				this.__resizerPointerLastPageX = -1;

				var table = this.getTable();
				var column = table.getColumns()[col];
				if (!column || column.getSizeMode() !== "doubleClick")
					return;

				table.autoResizeColumns(col, "displayedCells");

			}
			else {
				this.__resizerPointerDownTime = time;
				this.__resizerPointerLastPageX = e.getDocumentLeft();
			}
		},

		__autoSizeRowOnResizerDoubleClick: function (e, row) {
			if (row < 0)
				return;

			if (e.getType() !== "pointerup")
				return;

			var time = Date.now();
			if (time - this.__resizerPointerDownTime < 500 /* standard double-click time */
				&& this.__resizerPointerLastPageY - e.getDocumentTop() === 0) {

				this.__resizerPointerDownTime = 0;
				this.__resizerPointerLastPageY = -1;

				var table = this.getTable();
				if (table.getAutoSizeRowsMode() !== "doubleClick")
					return;

				table.autoResizeRows(row, "allCells");

			}
			else {
				this.__resizerPointerDownTime = time;
				this.__resizerPointerLastPageY = e.getDocumentTop();
			}
		},

		// keeps the last resizer pointer time and position
		// to detect double clicks.
		__resizerPointerDownTime: 0,
		__resizerPointerLastPageX: 0,
		__resizerPointerLastPageY: 0,

		__handleEvent: function (e, column, row, role) {

			// translated the event.
			var type = e.getType();

			switch (type) {

				case "tap":
					this.__fireCellEvent("gridCellTap", e, column, row, role);
					break;

				case "dbltap":
					this.__fireCellEvent("gridCellDblTap", e, column, row, role);
					break;

				case "click":
					this.__fireCellEvent("gridCellClick", e, column, row, role);
					break;

				case "contextmenu":
					this.__fireCellEvent("gridCellClick", e, column, row, role);
					break;

				case "dblclick":
					this.__fireCellEvent("gridCellDblClick", e, column, row, role);
					break;

				case "pointerdown":
					this.__fireCellEvent("gridCellMouseDown", e, column, row, role);
					break;

				case "pointerup":
					this.__fireCellEvent("gridCellMouseUp", e, column, row, role);
					break;

				case "pointerout":
					{
						// leaving the previous cell?
						if (this.__lastPointerCell.row != null && this.__lastPointerCell.col != null) {

							var table = this.getTable();
							if (table.isWired("gridCellMouseLeave"))
								this.__fireCellEvent("gridCellMouseLeave", e, this.__lastPointerCell.col, this.__lastPointerCell.row, role);
						}
					}
					break;

				case "pointermove":
					{
						var table = this.getTable();

						if (this.__lastPointerCell.row != row || this.__lastPointerCell.col != column) {
							// leaving the previous cell?
							if (this.__lastPointerCell.row != null && this.__lastPointerCell.col != null)
								if (table.isWired("gridCellMouseLeave"))
									this.__fireCellEvent("gridCellMouseLeave", e, this.__lastPointerCell.col, this.__lastPointerCell.row, role);

							// entering a new cell?
							if (row != null && column != null)
								if (table.isWired("gridCellMouseEnter"))
									this.__fireCellEvent("gridCellMouseEnter", e, column, row, role);
						}

						if (table.isWired("gridCellMouseMove") && row != null && column != null)
							this.__fireCellEvent("gridCellMouseMove", e, column, row, role);
					}
					break;
			}

			this.__lastPointerCell.row = row;
			this.__lastPointerCell.col = column;
		},

		__fireCellEvent: function (type, e, column, row, role) {

			this.getTable().fireEvent(
				type,
				wisej.web.datagrid.CellEvent,
				[e, column, row, role]);
		},

		/* =======================================================================
		 * Resize columns when the header is hidden
		 * =======================================================================*/

		_onPanePointerDown: function (e) {

			if (!this.getTable().isEnabled())
				return;

			var pageX = e.getDocumentLeft();

			// pointer is in header
			var resizeCol = this._getResizeColumnForPageX(pageX);
			if (resizeCol != -1) {
				// The pointer is over a resize region -> Start resizing
				this._startResizeTablePane(resizeCol, pageX);
				e.stop();
			}

		},

		// start a resize session of the pane.
		_startResizeTablePane: function (resizeCol, pageX) {

			var columnModel = this.getTable().getTableColumnModel();

			// The pointer is over a resize region -> Start resizing
			this.__resizeColumn = resizeCol;
			this.__lastResizePointerPageX = pageX;
			this.__lastResizeWidth = columnModel.getColumnWidth(this.__resizeColumn);
			this._paneClipper.capture();
		},

		_onPanePointerUp: function (e) {

			if (!this.getTable().isEnabled())
				return;

			if (this.__resizeColumn != null) {
				this._stopResizePane();
				e.stop();
			}

		},

		// stop a resize session of the header.
		_stopResizePane: function () {

			var columnModel = this.getTable().getTableColumnModel();

			// We are currently resizing -> Finish resizing
			if (!this.getLiveResize()) {
				this._hideResizeLine();
				columnModel.setColumnWidth(this.__resizeColumn,
					this.__lastResizeWidth,
					true);
			}

			this.__resizeColumn = null;
			this._paneClipper.releaseCapture();

			this.getApplicationRoot().setGlobalCursor(null);
			this.setCursor(null);
		},

		_onPaneLoseCapture: function (e) {

			if (this.__resizeColumn != null) {
				this._stopResizePane();
			}

		},

		/* ======================================================================= */

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "focus-indicator":
					control = new wisej.web.datagrid.FocusIndicator(this);
					control.setUserBounds(0, 0, 0, 0);
					control.setZIndex(1000);
					control.addListener("pointerup", this._onPointerupFocusIndicator, this);
					control.addListener("pointerdown", this._onPointerdownFocusIndicator, this);
					this._paneClipper.add(control);
					break;

				case "filler":
					control = new qx.ui.core.Widget().set({
						alignY: "bottom",
						appearance: "scrollbar"
					});
					if (this.__clipperContainer != null)
						control.setMinHeight(qx.ui.core.scroll.AbstractScrollArea.DEFAULT_SCROLLBAR_WIDTH);

					if (!this.getHorizontalScrollBarVisible())
						control.exclude();

					break;

				case "header-container":
					control = this.base(arguments, id, hash);
					control.addState(this.getTable()._colHeadersBorderStyle);
					break;
			}

			return control || this.base(arguments, id);
		}
	}
});
