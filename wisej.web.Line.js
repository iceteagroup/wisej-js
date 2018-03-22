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
 * wisej.web.Line
 */
qx.Class.define("wisej.web.Line", {

	extend: qx.ui.core.Widget,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejControl],

	construct: function () {

		this.base(arguments);

		this._setLayout(new qx.ui.layout.Canvas());
	},

	properties: {

		appearance: { init: "line", refine: true },

		/**
		 * LineStyle property.
		 */
		lineStyle: { init: "solid", check: ["none", "solid", "dashed", "dotted", "double"], apply: "_applyLineStyles", themeable: true },

		/**
		 * LineSize property.
		 */
		lineSize: { init: 1, check: "PositiveInteger", apply: "_applyLineStyles", themeable: true },

		/**
		 * LineColor property.
		 */
		lineColor: { init: "windowFrame", nullable: true, check: "Color", apply: "_applyLineStyles", themeable: true },

		/**
		 * orientation property.
		 */
		orientation: { init: "horizontal", check: ["horizontal", "vertical"], apply: "_applyLineStyles" },
	},

	members: {

		/**
		 * Queues the widget for the style update.
		 */
		_applyLineStyles: function (value, old, name) {

			// when the value is null, call reset(propertyName) to reload the theme value.
			if (value == null)
				this["reset" + qx.lang.String.firstUp(name)]();

			qx.ui.core.queue.Widget.add(this);
		},

		syncWidget: function () {

			var line = this.getChildControl("line");
			var colorMgr = qx.theme.manager.Color.getInstance();
			var lineColor = colorMgr.resolve(this.getLineColor());
			var lineStyle = this.getLineStyle();
			var lineSize = this.getLineSize();

			var vertical = this.getOrientation() == "vertical";
			if (vertical) {
				line.resetHeight();
				line.setWidth(lineSize);
				line.setLayoutProperties({ top: 0, bottom: 0 });
			}
			else {
				line.resetWidth();
				line.setHeight(lineSize);
				line.setLayoutProperties({ left: 0, right: 0 });
			}

			var style = {
				borderLeftStyle: vertical ? lineStyle : null,
				borderLeftColor: vertical ? lineColor : null,
				borderLeftWidth: vertical ? lineSize + "px" : null,
				borderTopStyle: vertical ? null : lineStyle,
				borderTopColor: vertical ? null : lineColor,
				borderTopWidth: vertical ? null : lineSize + "px"
			};

			var panelEl = line.getContentElement();
			panelEl.setStyles(style);
		},

		/**
		 * Overridden to create the inner div with the line style
		 * preserving the inner padding.
		 */
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "line":
					var control = new qx.ui.core.Widget().set({
						alignX: "center",
						alignY: "middle"
					})
					this._add(control);
					break;
			}

			return control || this.base(arguments, id);
		},

	},
});
