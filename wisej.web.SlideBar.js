///////////////////////////////////////////////////////////////////////////////
//
// (C) 2018 ICE TEA GROUP LLC - ALL RIGHTS RESERVED
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
 * wisej.web.SlideBar
 */
qx.Class.define("wisej.web.SlideBar", {

	extend: qx.ui.container.SlideBar,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	properties: {

		/**
		 * ButtonsBackColor property.
		 *
		 * Changes the scroll buttons background color set in the theme.
		 */
		buttonsBackColor: { init: null, check: "Color", apply: "_applyButtonsBackColor" },

		/**
		 * Spacing property.
		 *
		 * Changes the spacing between the child control.
		 */
		spacing: { init: 0, check: "PositiveInteger", apply: "_applySpacing" },
	},

	construct: function () {

		this.base(arguments);
	},

	members: {

		/**
		 * Wisej marker. Important! Otherwise it cannot scroll because Wisej widgets
		 * all set their user bounds when NOT inside a isWisejContainer - user bounds are not
		 * considered when calculating the size hint.
		 */
		isWisejContainer: true,

		// stored previous scroll position, used in __fireScrollEvent.
		__oldScrollPos: 0,

		/**
		 * Applies the buttonsBackColor property.
		 */
		_applyButtonsBackColor: function (value, old) {

			this.getChildControl("button-forward").setBackgroundColor(value);
			this.getChildControl("button-backward").setBackgroundColor(value);
		},

		/**
		 * Applies the spacing property.
		 */
		_applySpacing: function (value, old) {

			this.getLayout().setSpacing(value);
		},

		// overridden
		_applyOrientation: function (value, old) {

			this.base(arguments, value, old);

			// update the spacing in the new layout.
			this._applySpacing(this.getSpacing());
		},

		/**
		 * Fires the scroll event when scrolling.
		 */
		_onScroll: function (e) {

			this.base(arguments, e);

			this.__fireScrollEvent(e);
		},

		__fireScrollEvent: function (e) {

			this.setDirty(true);

			var position = e.getData() | 0;
			var old = this.__oldScrollPos;
			this.__oldScrollPos = position;

			if (position == old)
				return;

			var pane = e.getTarget();
			var vertical = this.getOrientation() === "vertical";
			var maxPos = vertical ? pane.getScrollMaxY() : pane.getScrollMaxX();

			var data = {};
			data.old = old;
			data[vertical ? "scrollY" : "scrollX"] = position;
			data.type = position == 0 ? "first" : position == maxPos ? "last" : "step";

			this.fireDataEvent("scroll", data);
		},
	},

});
