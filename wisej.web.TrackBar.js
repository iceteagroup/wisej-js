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
 * wisej.web.TrackBar
 *
 * Added the "begin" and "end" child controls to
 * render the position of the slider in different colors.
 *
 * Added the "bubble" child control to show the value while dragging the knob.
 */
qx.Class.define("wisej.web.TrackBar", {

	extend: qx.ui.form.Slider,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejControl],

	/**
	 * Constructor
	 */
	construct: function (value, maximum) {

		this.base(arguments, value, maximum);

		// add local state properties.
		this.setStateProperties(this.getStateProperties().concat(["value"]));

		// rightToLeft support.
		this.addListener("changeRtl", this._onRtlChange, this);
	},

	properties: {

		/**
		 * Orientation property.
		 */
		orientation: { init: "horizontal", check: ["horizontal", "vertical"], apply: "_applyOrientation" },

		/**
		 * TickStyle property.
		 *
		 * Gets or sets a value indicating how to display the tick marks on the track bar.
		 */
		tickStyle: { init: "both", check: ["none", "topLeft", "bottomRight", "both"], apply: "_applyTickProperty", themeable: true },

		/**
		 * TickFrequency property.
		 *
		 * Gets or sets a value that specifies the delta between ticks drawn on the control.
		 */
		tickFrequency: { init: 10, check: "PositiveInteger", apply: "_applyTickProperty", themeable: true },

		/**
		 * TickLength property.
		 * 
		 * Gets or sets the length of the tick mark.
		 */
		tickLength: { init: 5, check: "PositiveInteger", apply: "_applyTickProperty", themeable: true },

		/**
		 * TickThickness property.
		 * 
		 * Gets or sets the length of the tick mark.
		 */
		tickThickness: { init: 1, check: "PositiveInteger", apply: "_applyTickProperty", themeable: true },

		/**
		 * TickColor property.
		 * 
		 * Gets or sets the color of the tick mark.
		 */
		tickColor: { init: "gray", check: "Color", apply: "_applyTickProperty", themeable: true },

		/**
		 * showValue property.
		 * 
		 * Shows the trackBar value in a bubble like widget next to the knob.
		 */
		showValue: { init: true, check: "Boolean" },

	},

	statics: {

		// the stylesheet used for all instances of the trackbar.
		__stylesheet: null,

	},

	members: {

		// overridden
		_forwardStates: {
			invalid: true,
			horizontal: true,
			vertical: true,
			focused: true,
			disabled: true
		},

		/**
		 * Applies the background color to the "begin" bar.
		 */
		_applyBackgroundColor: function (value, old) {

			var begin = this.getChildControl("begin");
			begin.setBackgroundColor(value);

		},

		/**
		 * Arrange the child controls according to the orientation of the widget.
		 */
		_applyOrientation: function (value, old) {

			var end = this.getChildControl("end");
			var begin = this.getChildControl("begin");
			var knob = this.getChildControl("knob");
			var bubble = this.getChildControl("bubble");

			this.base(arguments, value, old);

			switch (value) {
				case "vertical":
					end.removeState("horizontal");
					begin.removeState("horizontal");
					bubble.removeState("horizontal");
					end.addState("vertical");
					begin.addState("vertical");
					bubble.addState("vertical");
					end.resetWidth();
					begin.resetWidth();
					bubble.resetWidth();

					end.setAlignX("center");
					knob.setAlignX("center");
					begin.setAlignX("center");

					knob.setLayoutProperties({ left: null, right: null, bottom: null });

					if (this.isRtl()) {
						begin.setLayoutProperties({ top: 0, left: null, right: null, bottom: null });
						end.setLayoutProperties({ top: null, left: null, right: null, bottom: 0 });
					}
					else {
						end.setLayoutProperties({ top: 0, left: null, right: null, bottom: null });
						begin.setLayoutProperties({ top: null, left: null, right: null, bottom: 0 });
					}
					break;

				case "horizontal":
					end.removeState("vertical");
					begin.removeState("vertical");
					bubble.removeState("vertical");
					end.addState("horizontal");
					begin.addState("horizontal");
					bubble.addState("horizontal");
					end.resetHeight();
					begin.resetHeight();
					bubble.resetHeight();

					end.setAlignY("middle");
					knob.setAlignY("middle");
					begin.setAlignY("middle");

					knob.setLayoutProperties({ top: null, right: null, bottom: null });

					if (this.isRtl()) {
						begin.setLayoutProperties({ top: null, left: null, right: 0, bottom: null });
						end.setLayoutProperties({ top: null, left: 0, right: null, bottom: null });
					}
					else {
						end.setLayoutProperties({ top: null, left: null, right: 0, bottom: null });
						begin.setLayoutProperties({ top: null, left: 0, right: null, bottom: null });
					}
					break;
			}

			qx.ui.core.queue.Layout.add(this);

		},

		/**
		 * Applies the properties that alter the tick style.
		 */
		_applyTickProperty: function (value, old) {

			qx.ui.core.queue.Layout.add(this);

		},

		/**
		 * Overridden to update width or height of the 
		 * bars (begin and end child controls) underneath the knob.
		 */
		_setKnobPosition: function (position) {

			this.base(arguments, position);

			var size = this.getInnerSize();
			if (size == null)
				return;

			var end = this.getChildControl("end");
			var begin = this.getChildControl("begin");
			var knob = this.getChildControl("knob");
			var bubble = this.getChildControl("bubble");

			switch (this.getOrientation()) {
				case "vertical":
					var gap = Math.floor(knob.getHeight() / 2);

					if (this.isRtl()) {
						begin.setHeight(position + gap);
						end.setHeight(size.height - position - gap);
					} else {
						end.setHeight(position + gap);
						begin.setHeight(size.height - position - gap);
					}
					break;

				case "horizontal":
					var gap = Math.floor(knob.getWidth() / 2);

					if (this.isRtl()) {
						end.setWidth(position + gap);
						begin.setWidth(size.width - position - gap);
					}
					else {
						begin.setWidth(position + gap);
						end.setWidth(size.width - position - gap);
					}
					break;
			}

			// show the value bubble.
			if (this.getShowValue() && this.hasState("focused")) {
				bubble.show();
				bubble.placeToWidget(knob, true);
				bubble.setValue(this.getValue().toString());
			}

		},

		/**
		 * Converts the given position to a value.
		 *
		 * Does not respect single or page step.
		 *
		 * @param position {Integer} Position to use
		 * @return {Integer} Resulting value (rounded)
		 */
		_positionToValue: function (position) {

			if (!this.__isHorizontal)
				position = this.__slidingSpace - position;

			var value = this.base(arguments, position);

			return value;
		},


		/**
		 * Converts the given value to a position to place
		 * the knob to.
		 *
		 * @param value {Integer} Value to use
		 * @return {Integer} Computed position (rounded)
		 */
		_valueToPosition: function (value) {

			var position = this.base(arguments, value);

			if (!this.__isHorizontal)
				position = this.__slidingSpace - position;

			return position;
		},

		// rightToLeft support. 
		// listens to "changeRtl" to mirror the trackbar sides.
		_onRtlChange: function (e) {

			if (e.getData() === e.getOldData())
				return;

			var rtl = e.getData();
			if (rtl != null) {

				this._applyOrientation(this.getOrientation());
			}

		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "begin":
					control = new qx.ui.core.Widget();
					this._add(control);
					break;

				case "end":
					control = new qx.ui.core.Widget();
					this._add(control);
					break;

				case "bubble":
					control = new wisej.web.trackBar.Bubble();
					control.exclude();
					control.setZIndex(900000);
					qx.core.Init.getApplication().getRoot().add(control);
					this.addListener("deactivate", this.__onLostFocus);
					break;
			}

			return control || this.base(arguments, id);
		},

		// hide the bubble when the trackbar loses the focus.
		__onLostFocus: function (e) {

			if (!qx.ui.core.Widget.contains(this, e.getRelatedTarget())) {
				this.getChildControl("bubble").hide();
			}

		},

		// overridden
		renderLayout: function (left, top, width, height) {

			this.base(arguments, left, top, width, height);

			this.__updateTickCssRule(width, height);

		},

		// updates the css rule linked to this component to reflect
		// the tickStyle, tickFrequenct and tickLength and tickThickness properties.
		__updateTickCssRule: function (width, height) {

			var color = this.getTickColor(),
				range = this.getMaximum() - this.getMinimum(),
				length = this.getTickLength(),
				style = this.getTickStyle(),
				frequency = range / this.getTickFrequency(),
				thickness = this.getTickThickness(),
				knobSize = this.getChildControl("knob").getSizeHint();

			var cssRule = this.__getTickCssRule("").style;
			var cssRuleAfter = this.__getTickCssRule("::after").style;
			var cssRuleBefore = this.__getTickCssRule("::before").style;

			// show/hide the tick overlays.
			switch (style) {
				case "none":
					cssRuleAfter.display = cssRuleBefore.display = "none";
					break;
				case "topLeft":
					cssRuleAfter.display = "none";
					cssRuleBefore.display = "block";
					break;
				case "bottomRight":
					cssRuleAfter.display = "block";
					cssRuleBefore.display = "none";
					break;
				case "both":
					cssRuleAfter.display = cssRuleBefore.display = "block";
					break;
			}

			if (this.getOrientation() == "horizontal") {

				var left = Math.floor(knobSize.width / 2);
				cssRuleBefore.top = "0px";
				cssRuleAfter.top = null;
				cssRuleAfter.bottom = "0px";
				cssRuleAfter.right = cssRuleBefore.right = null;
				cssRuleAfter.left = cssRuleBefore.left = left + "px";
				cssRuleAfter.width = cssRuleBefore.width = "100%";
				cssRuleAfter.height = cssRuleBefore.height = length + "px";
				cssRuleAfter.backfaceVisibility = cssRuleBefore.backfaceVisibility = "hidden";

				var gap = Math.round((width - knobSize.width) / frequency);

				cssRuleAfter.background =
				cssRuleBefore.background =
					"repeating-linear-gradient(to right,  "
						+ color + ","
						+ color + " " + thickness + "px,"
						+ "transparent " + thickness + "px,"
						+ "transparent " + gap + "px)";
			}
			else {

				var top = Math.floor(knobSize.height / 2);
				cssRuleBefore.left = "0px";
				cssRuleAfter.left = null;
				cssRuleAfter.right = "0px";
				cssRuleAfter.bottom = cssRuleBefore.bottom = null;
				cssRuleAfter.top = cssRuleBefore.top = top + "px";
				cssRuleAfter.height = cssRuleBefore.height = "100%";
				cssRuleAfter.width = cssRuleBefore.width = length + "px";
				cssRuleAfter.backfaceVisibility = cssRuleBefore.backfaceVisibility = "hidden";

				var gap = Math.round((height - knobSize.height) / frequency);

				cssRuleAfter.background =
				cssRuleBefore.background =
					"repeating-linear-gradient(to bottom,  "
						+ color + ","
						+ color + " " + thickness + "px,"
						+ "transparent " + thickness + "px,"
						+ "transparent " + gap + "px)";

			}
		},

		// return the css rule for this component.
		__getTickCssRule: function (pseudo) {

			// create the shared stylesheet.
			var stylesheet = wisej.web.TrackBar.__stylesheet;
			if (!stylesheet) {
				stylesheet = qx.bom.Stylesheet.createElement("");
				wisej.web.TrackBar.__stylesheet = stylesheet;
			}

			// find the selector that matches this component and the pseudo element, if specified.
			var className = "wisej-trackbar-" + this.$$hash;

			var selector = "." + className + pseudo;

			var rules = stylesheet.cssRules;
			var count = rules.length;
			for (var i = 0; i < count; i++) {

				var rule = rules[i];
				if (rule.selectorText == selector)
					return rule;
			}

			// create it, if it doesn't exist.
			qx.bom.Stylesheet.addRule(stylesheet, selector, "content:\"\"; display:block;position:absolute");

			// assign the class to this element.
			if (!pseudo) {
				var el = this.getContentElement();
				el.addClass(className);
			}

			return this.__getTickCssRule(pseudo);
		}
	},

	destruct: function () {

		var stylesheet = wisej.web.TrackBar.__stylesheet;

		if (stylesheet) {
			var selector = ".wisej-trackbar-" + this.$$hash;
			qx.bom.Stylesheet.removeRule(stylesheet, selector);
			qx.bom.Stylesheet.removeRule(stylesheet, selector + "::after");
			qx.bom.Stylesheet.removeRule(stylesheet, selector + "::before");
		}
	}
});


/**
 * wisej.web.trackBar.Bubble
 *
 * Shows the trackbar value while dragging the knob.
 */
qx.Class.define("wisej.web.trackBar.Bubble", {

	extend: qx.ui.basic.Label,
	include: qx.ui.core.MPlacement,

});