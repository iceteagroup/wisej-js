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
 * wisej.web.ProgressBar
 *
 * New progress bar widget.
 *
 * Couldn't use the QX ProgressBar because it doesn't
 * declare standard QX properties.
 */
qx.Class.define("wisej.web.ProgressBar", {

	extend: qx.ui.container.Composite,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	/**
	 * Constructor
	 */
	construct: function (value, maximum) {

		this.base(arguments, value, maximum);

		this.setLayout(new qx.ui.layout.Canvas());
		this._createChildControl("progress");
		this._createChildControl("label");

		// rightToLeft support.
		this.addListener("changeRtl", this._onRtlChange, this);

	},

	properties: {

		// overridden
		appearance: { refine: true, init: "progressbar" },

		/**
		 * Minimum property.
		 */
		minimum: { init: 0, check: "Integer" },

		/**
		 * Maximum property.
		 */
		maximum: { init: 100, check: "Integer" },

		/**
		 * Value property.
		 */
		value: { init: 0, check: "Integer", apply: "_applyValue" },

		/**
		 * Label property.
		 */
		label: { init: null, check: "String", apply: "_applyLabel", nullable: true },

		/**
		 * BarColor property.
		 */
		barColor: { init: null, check: "Color", apply: "_applyBarColor", nullable: true },

	},

	members: {

		/**
		 * Applies the value property.
		 */
		_applyValue: function (value, old) {

			var bar = this.getChildControl("progress");
			var to = Math.floor(value / this.getMaximum() * 100);
			bar.setLayoutProperties({ width: to + "%" });
		},

		/**
		 * Applies the label property.
		 */
		_applyLabel: function (value, old) {

			var label = this.getChildControl("label");
			label.setValue(value);

		},

		// Overridden
		_applyTextColor: function (value, old) {

			var label = this.getChildControl("label");
			label.setTextColor(value);

		},

		/**
		 * Applies the barColor property.
		 */
		_applyBarColor: function (value, old) {

			var progress = this.getChildControl("progress");
			progress.setBackgroundColor(value);

		},

		// rightToLeft support. 
		// listens to "changeRtl" to mirror the location of the progress bar.
		_onRtlChange: function (e) {

			if (e.getData() === e.getOldData())
				return;

			var bar = this.getChildControl("progress");
			if (e.getData())
				bar.setLayoutProperties({ left: null, top: 0, bottom: 0, right: 0 });
			else
				bar.setLayoutProperties({ left: 0, top: 0, bottom: 0, right: null });
		},

		// Overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "progress":
					control = new qx.ui.container.Composite();
					this._add(control, { width: "0%", left: 0, top: 0, bottom: 0 });
					break;

				case "label":
					var container = new qx.ui.container.Composite(new qx.ui.layout.HBox());
					this._add(container, { left: 0, right: 0, top: 0, bottom: 0 });
					control = new qx.ui.basic.Label("");
					control.setRich(true);
					control.setAllowGrowX(true);
					control.setAlignY("middle");
					container.add(control, { flex: 1 });
					break;
			}
			return control || this.base(arguments, id);
		},
	},
});