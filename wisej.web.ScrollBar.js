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
 * wisej.web.HScrollBar
 */
qx.Class.define("wisej.web.HScrollBar", {

	extend: qx.ui.core.scroll.ScrollBar,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejControl],

	construct: function () {

		this.base(arguments, "horizontal");

		// listen to changes of the allowMove property to change the move handle target.
		this.addListener("changeAllowMove", this.__onChangeAllowMove, this);
	},

	members: {

		/**
		 * Handles the changeAllowMove event to change the
		 * move handle target to the slider, otherwise
		 * scrollbar widgets cannot be moved since the buttons
		 * and the slider process all the pointer events.
		 */
		__onChangeAllowMove: function (e) {

			if (e.getData())
				this._activateMoveHandle(this.getChildControl("slider"));
		},

		// overridden.
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "slider":
					control = new wisej.web.scrollBar.Slider();
					control.setPageStep(100);
					control.setFocusable(false);
					control.addListener("changeValue", this._onChangeSliderValue, this);
					control.addListener("slideAnimationEnd", this._onSlideAnimationEnd, this);
					this._add(control, { flex: 1 });
					break;
			}

			return control || this.base(arguments, id);
		},
	}
});


/**
 * wisej.web.VScrollBar
 */
qx.Class.define("wisej.web.VScrollBar", {

	extend: qx.ui.core.scroll.ScrollBar,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejControl],

	construct: function () {

		this.base(arguments, "vertical");

		// listen to changes of the allowMove property to change the move handle target.
		this.addListener("changeAllowMove", this.__onChangeAllowMove, this);
	},

	members: {

		/**
		 * Handles the changeAllowMove event to change the
		 * move handle target to the slider, otherwise
		 * scrollbar widgets cannot be moved since the buttons
		 * and the slider process all the pointer events.
		 */
		__onChangeAllowMove: function (e) {

			if (e.getData())
				this._activateMoveHandle(this.getChildControl("slider"));
		},

		// overridden.
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "slider":
					control = new wisej.web.scrollBar.Slider();
					control.setPageStep(100);
					control.setFocusable(false);
					control.addListener("changeValue", this._onChangeSliderValue, this);
					control.addListener("slideAnimationEnd", this._onSlideAnimationEnd, this);
					this._add(control, { flex: 1 });
					break;
			}

			return control || this.base(arguments, id);
		},
	}
});


/**
 * wisej.web.scrollBar.Slider
 *
 * Replaces the internal "slider" in the scrollbars
 * to prevent the scrollbar from scrolling when it's
 * movable and being dragged.
 */
qx.Class.define("wisej.web.scrollBar.Slider", {

	extend: qx.ui.core.scroll.ScrollSlider,

	members: {

		// overridden.
		_onPointerMove: function (e) {

			if (this.getLayoutParent().hasState("move"))
				return;

			this.base(arguments, e);
		},

		// overridden.
		_onInterval: function (e) {

			if (this.getLayoutParent().hasState("move"))
				return;

			this.base(arguments, e);
		}
	}

});