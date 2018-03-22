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

		this.addListener("paneUpdated", this._onPaneUpdated, this);
	},

	members: {

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

				widget.resetUserBounds();

				// let the widget shrink regardless of the content
				// to fit in the cell.
				widget.setMinWidth(0);
				widget.setMinHeight(0);

				// add the widget to the root container and set the correct layout
				// according to the dock property.
				var dock = cellElem.getAttribute("qx-widget-dock");
				if (!dock || dock == "none") {
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

					if (edge == "center") {
						widget.resetWidth();
						widget.resetHeight();
					}

					root.add(widget, { edge: edge, left: null, top: null });
				}
				return widget;
			}
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

		// overridden
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
		}
	}
});