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
		buttonsBackColor: { init: null, check: "Color", apply: "_applyButtonsBackColor" }
	},

	construct: function () {

		this._createChildControl("content");

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
		 * Applies the orientation property.
		 */
		_applyOrientation: function (value, old) {

			// overridden to prevent changing the layout engines.

			var buttonForward = this.getChildControl("button-forward");
			var buttonBackward = this.getChildControl("button-backward");

			// old can also be null, so we have to check both explicitly to set
			// the states correctly.
			if (old === "vertical" && value === "horizontal") {
				buttonForward.removeState("vertical");
				buttonBackward.removeState("vertical");
				buttonForward.addState("horizontal");
				buttonBackward.addState("horizontal");
			}
			else if (old === "horizontal" && value === "vertical") {
				buttonForward.removeState("horizontal");
				buttonBackward.removeState("horizontal");
				buttonForward.addState("vertical");
				buttonBackward.addState("vertical");
			}

			var oldLayout = this._getLayout();
			this._setLayout(value === "horizontal" ? new qx.ui.layout.HBox() : new qx.ui.layout.VBox());
			if (oldLayout)
				oldLayout.dispose();
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "content":
					control = new qx.ui.container.Composite(new qx.ui.layout.Canvas());
					control.setAllowShrinkX(false);
					control.setAllowShrinkY(false);
					this.getChildControl("scrollpane").add(control);
					break;
			}

			return control || this.base(arguments, id);
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
		}
	}

});
