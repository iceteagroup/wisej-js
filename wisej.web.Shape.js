///////////////////////////////////////////////////////////////////////////////
//
// (C) 2019 ICE TEA GROUP LLC - ALL RIGHTS RESERVED
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
 * wisej.web.Shape
 */
qx.Class.define("wisej.web.Shape", {

	extend: qx.ui.core.Widget,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejControl],

	construct: function () {

		this.base(arguments);

		this._setLayout(new qx.ui.layout.Grow());
	},

	properties: {

		appearance: { init: "shape", refine: true },

		/**
		 * Borders property.
		 */
		borders: { init: [], check: "Array", apply: "_applyStyle" },

		/**
		 * rotation property.
		 */
		rotation: { init: 0, check: "Integer", apply: "_applyStyle" },

		/**
		 * BorderSize themeable property.
		 */
		borderSize: { init: null, check: "PositiveInteger", apply: "_applyStyle", themeable: true },

		/**
		 * BorderColor themeable property.
		 */
		borderColor: { init: null, check: "Color", apply: "_applyStyle", themeable: true },

		/**
		 * BorderStyle themeable property.
		*/
		borderStyle: { init: null, check: ["none", "solid", "dashed", "dotted", "double"], apply: "_applyStyle", themeable: true },

	},

	members: {

		/**
		 * Applies the background color to the inner "shape".
		 */
		_applyBackgroundColor: function (value, old) {

			this.getChildControl("shape").setBackgroundColor(value);
		},

		/**
		 * Returns the widget to use to apply the background style by wisej.mixin.MBackgroundImage.
		 */
		_getBackgroundWidget: function () {

			return this.getChildControl("shape");
		},

		/**
		 * Queues the widget for the style update.
		 */
		_applyStyle: function (value, old, name) {

			// when the value is null, call reset(propertyName) to reload the theme value.
			if (value == null)
				this["reset" + qx.lang.String.firstUp(name)]();

			qx.ui.core.queue.Widget.add(this);
		},

		syncWidget: function () {

			this.syncAppearance();

			var shape = this.getChildControl("shape");
			var borderStyle = this.getBorderStyle();
			var colorMgr = qx.theme.manager.Color.getInstance();

			var style = {
				borderWidth: "",
				borderColor: "",
				borderStyle: "",
				borderRadius: ""
			};

			var borderSize = this.getBorderSize();
			var borderColor = colorMgr.resolve(this.getBorderColor());

			var border;
			var borders = this.getBorders();
			for (var i = 0; i < borders.length; i++) {

				border = borders[i];
				style.borderWidth += (border.size == null ? borderSize : border.size) + "px ";
				style.borderColor += (border.color == null ? borderColor : colorMgr.resolve(border.color)) + " ";
				style.borderStyle += (border.style == null ? borderStyle : border.style) + " ";
				style.borderRadius += (border.radius == null ? 0 : border.radius) + "px ";
			}

			style.transform = "rotate(" + this.getRotation() + "deg)";

			var panelEl = shape.getContentElement();
			panelEl.setStyles(style);
		},

		// overridden
		_onChangeTheme: function () {

			this.base(arguments);

			qx.ui.core.queue.Widget.add(this);
		},

		/**
		 * Overridden to create the inner div with the line style
		 * preserving the inner padding.
		 */
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "shape":
					control = new qx.ui.core.Widget().set({
						alignX: "center",
						alignY: "middle"
					})
					this._add(control);
					break;
			}

			return control || this.base(arguments, id);
		}

	}
});
