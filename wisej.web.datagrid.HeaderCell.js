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
 * wisej.web.datagrid.HeaderCell
 */
qx.Class.define("wisej.web.datagrid.HeaderCell", {

	extend: qx.ui.table.headerrenderer.HeaderCell,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejComponent,
		wisej.mixin.MBackgroundImage],

	construct: function () {

		this.base(arguments);

		this.initTextAlign();

		// set the layout to have the label fill the cell
		// and leave available rows and columns for a docked child widget.
		var layout = this._getLayout();

		layout.setRowFlex(0, 0); // widget docked top
		layout.setRowFlex(1, 1);
		layout.setRowFlex(2, 0); // widget docked bottom

		layout.setColumnFlex(0, 0); // widget docked left
		layout.setColumnFlex(1, 0); // icon
		layout.setColumnFlex(2, 1); // label
		layout.setColumnFlex(3, 0); // sort-icon
		layout.setColumnFlex(4, 0); // widget docked right
	},

	properties: {

		/**
		 * AutoEllipsis property.
		 *
		 * Sets the auto-ellipsis style.
		 */
		autoEllipsis: { init: false, check: "Boolean", apply: "_applyAutoEllipsis" },

		/**
		 * IconSize property.
		 *
		 * Gets or sets the size of the icon.
		 */
		iconSize: { init: null, nullable: true, check: "Map", apply: "_applyIconSize", themeable: true },

		/**
		 * Wrap property.
		 *
		 * Sets the wrap property on the inner label.
		 */
		wrap: { init: false, check: "Boolean", apply: "_applyWrap" },

		/**
		 * TextAlign property.
		 *
		 * Gets or sets the alignment of the text.
		 */
		textAlign: {
			init: "middleLeft",
			apply: "_applyTextAlign",
			check: ["topRight", "middleRight", "bottomRight", "topLeft", "topCenter", "middleLeft", "middleCenter", "bottomLeft", "bottomCenter"]
		},

		/**
		 * Resizable property.
		 */
		resizable: { init: true, check: "Boolean" },

		/**
		 * Movable property.
		 */
		movable: { init: false, check: "Boolean" },

		/**
		 * The sort order for the header cell.
		 */
		sortOrder: { init: "none", check: ["none", "ascending", "descending"], apply: "_applySortOrder" },
	},

	members: {

		/** reference to a custom widget hosted in the header cell. */
		__widget: null,

		// overridden.
		_applyLabel: function (value, old) {

			if (value != null) {
				this._showChildControl("label").setValue(value);
			} else {
				this._excludeChildControl("label");
			}
		},

		/**
		 * Applies the textAlign property.
		 */
		_applyTextAlign: function (value, old) {

			this.getChildControl("label").setTextAlign(value);

		},

		/**
		 * Applies the autoEllipsis property.
		 */
		_applyAutoEllipsis: function (value, old) {

			this.getChildControl("label").setAutoEllipsis(value);

		},

		/**
		 * Applies the wrap property.
		 */
		_applyWrap: function (value, old) {

			this.getChildControl("label").setWrap(value);

		},

		/**
		 * Applies the sortOrder property.
		 */
		_applySortOrder: function (value, old) {

			var DefaultHeaderCellRenderer = qx.ui.table.headerrenderer.Default;

			switch (value) {
				case "none":
					this.removeState(DefaultHeaderCellRenderer.STATE_SORTED);
					this.removeState(DefaultHeaderCellRenderer.STATE_SORTED_ASCENDING);
					break;

				case "ascending":
					this.addState(DefaultHeaderCellRenderer.STATE_SORTED);
					this.addState(DefaultHeaderCellRenderer.STATE_SORTED_ASCENDING);
					break;

				case "descending":
					this.addState(DefaultHeaderCellRenderer.STATE_SORTED);
					this.removeState(DefaultHeaderCellRenderer.STATE_SORTED_ASCENDING);
					break;
			}
		},

		/**
		 * Applies the IconSize property.
		 *
		 * Sets the size of the icon child widget.
		 */
		_applyIconSize: function (value, old) {

			var size = value;
			var icon = this.getChildControl("icon");

			icon.resetMaxWidth();
			icon.resetMaxHeight();

			if (size) {
				icon.setWidth(size.width);
				icon.setHeight(size.height);
				icon.getContentElement().setStyle("backgroundSize", size.width + "px " + size.height + "px");
			}
			else {
				icon.resetWidth();
				icon.resetHeight();
				icon.getContentElement().setStyle("backgroundSize", "contain");
			}
		},

		/**
		 * Returns the child widget hosted in the header cell.
		 */
		getCellWidget: function () {
			return this.__widget;
		},

		/**
		 * Adds the widget to the header cell.
		 *
		 * @param widget {Widget} the widget to add to the cell.
		 * @param dock {String} the dock style to use for the layout of the child widget.
		 */
		setCellWidget: function (widget, dock) {

			// remove the previous widget.
			if (this.__widget) {
				if (this.__widget.getLayoutParent() == this)
					this.remove(this.__widget);

				this.__widget = null;
			}

			if (widget) {

				this.__widget = widget;

				// always reset the dock layout for the widget.
				var layout = this.getLayout();
				layout.setRowFlex(0, 0); // widget docked top
				layout.setRowFlex(2, 0); // widget docked bottom

				// retrieve the label widget, we'll have to show it when the
				// dock != fill.
				var label = this.getChildControl("label");

				// let the widget shrink regardless of the content
				// to fit in the column header.
				widget.setMinWidth(0);
				widget.setMinHeight(0);

				switch (dock) {
					default:
					case "none":
						widget.setUserBounds(widget.getX(), widget.getY(), widget.getWidth(), widget.getHeight());
						this.add(widget);
						label.show();
						break;

					case "top":
						layout.setRowFlex(0, 1); // widget docked top
						widget.resetUserBounds();
						this.add(widget, { row: 0, column: 2, left: null, top: null });
						label.show();
						break;

					case "left":
						widget.resetUserBounds();
						this.add(widget, { row: 1, column: 0, left: null, top: null });
						label.show();
						break;

					case "right":
						widget.resetUserBounds();
						this.add(widget, { row: 1, column: 4, left: null, top: null });
						label.show();
						break;

					case "bottom":
						layout.setRowFlex(2, 1); // widget docked bottom
						widget.resetUserBounds();
						this.add(widget, { row: 2, column: 2, left: null, top: null });
						label.show();
						break;

					case "fill":
						label.exclude();
						widget.resetWidth();
						widget.resetHeight();
						widget.resetUserBounds();
						this.add(widget, { row: 1, column: 2, left: null, top: null });
						break;
				}
			}
		},

		// overridden.
		// don't set the padding to the element, use it only for the layout engine
		// to let the column header resize smaller than padding.
		__updateContentPadding: function (style, value) {
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "label":
					control = new wisej.web.Label(this.getLabel()).set({
						rich: true,
						wrap: false,
						allowGrowX: true,
						allowGrowY: true,
						anonymous: true
					});

					this._add(control, { row: 1, column: 2 });
					break;

				case "sort-icon":
					control = new qx.ui.basic.Image(this.getSortIcon());
					control.setAnonymous(true);
					this._add(control, { row: 1, column: 3 });
					break;

				case "icon":
					control = new qx.ui.basic.Image(this.getIcon()).set({
						anonymous: true,
						allowShrinkX: true
					});
					this._add(control, { row: 1, column: 1 });
					break;
			}

			return control || this.base(arguments, id);
		},

		_getBackgroundWidget: function () {

			return this.getChildControl("label");

		},

	},


});