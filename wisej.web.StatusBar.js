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
 * wisej.web.StatusBar
 */
qx.Class.define("wisej.web.StatusBar", {

	extend: qx.ui.container.Composite,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejControl],

	/**
	 * Constructor
	 */
	construct: function () {

		this.base(arguments, new qx.ui.layout.Dock());

		this.setAllowGrowY(false);
		this.initShowPanels();

		// rightToLeft support.
		this.addListener("changeRtl", function (e) { this._mirrorChildren(e.getData()); }, this);

	},

	properties: {

		// appearance
		appearance: { init: "statusbar", refine: true },

		/**
		 * ShowPanels property.
		 */
		showPanels: { init: true, check: "Boolean", apply: "_applyShowPanels" },

		/**
		 * ShowSizingGrip property.
		 */
		showSizingGrip: { init: true, check: "Boolean", apply: "_applyShowSizingGrip", themeable: true },

		/**
		 * Text property.
		 */
		text: { init: null, nullable: true, check: "String", apply: "_applyText" },

		/**
		 * TextAlign property.
		 */
		textAlign: { init: "left", check: ["left", "center", "right"], apply: "_applyTextAlign" },

		/**
		 * Panels property.
		 *
		 * Assigns the list of child panels.
		 */
		panels: { init: null, nullable: true, check: "Array", apply: "_applyPanels", transform: "_transformComponents" },

	},

	members: {

		/**
		 * Applies the showPanels property.
		 *
		 * Hides or shows all the child panels.
		 * When the panels are hidden it shows the status bar text.
		 */
		_applyShowPanels: function (value, old) {

			var panels = this.getPanels();
			if (panels) {
				var visibility = value ? "visible" : "excluded";
				for (var i = 0; i < panels.length; i++) {
					panels[i].setVisibility(visibility);
				}
			}

			// hide or show the label.
			var label = this.getChildControl("label", true);
			if (label) {
				value
					? label.exclude()
					: label.show();
			}
		},

		/**
		 * Applies the showSizingGrip property.
		 */
		_applyShowSizingGrip: function (value, old) {

			var grip = this.getChildControl("grip", !value);
			if (grip) {
				value
					? grip.show()
					: grip.exclude();
			}
		},

		/**
		 * Applies the text property.
		 */
		_applyText: function (value, old) {

			this.getChildControl("label").setValue(value);
		},

		/**
		 * Applies the textAlign property.
		 *
		 */
		_applyTextAlign: function (value, old) {

			this.getChildControl("label").setTextAlign(value);
		},

		/**
		 * Applies the panels property.
		 *
		 * Updates the child panels.
		 */
		_applyPanels: function (value, old) {

			var newPanels = value;

			// remove the existing panels.
			if (old && old.length > 0) {
				for (var i = 0; i < old.length; i++) {
					if (newPanels && newPanels.indexOf(old[i]) == -1) {
						old[i].removeListener("click", this._onPanelClick, this);
						this.remove(old[i]);
					}
				}
			}

			var panelsVisibility = this.isShowPanels() ? "visible" : "excluded";

			if (newPanels != null && newPanels.length > 0) {
				for (var i = 0; i < newPanels.length; i++) {

					var panel = newPanels[i];

					this.addAt(panel, i, { edge: "west" });
					panel._setChildAppearance(this);
					panel.setVisibility(panelsVisibility);

					if (!panel.hasListener("click"))
						panel.addListener("click", this._onPanelClick, this);
				}
			}
		},

		_onPanelClick: function (e) {

			this.fireDataEvent("panelClick", e.getTarget());
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "label":
					control = new qx.ui.basic.Label(this.getText()).set({
						rich: true,
						alignY: "middle",
						allowGrowX: true,
						visibility: this.isShowPanels() ? "excluded" : "visible"
					});
					this.add(control, { edge: "center", flex: 1 });
					break;

				case "grip":
					control = new qx.ui.basic.Image().set({
						alignY: "bottom",
						alignX: "right"
					});
					this.add(control, { edge: "east" });
					break;
			}

			return control || this.base(arguments, id);
		},

	},
});


/**
 * wisej.web.statusbar.Panel
 */
qx.Class.define("wisej.web.statusbar.Panel", {

	extend: qx.ui.basic.Atom,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejComponent],

	/**
	 * Constructor
	 */
	construct: function () {

		this.base(arguments);

		this.initAlignment();

	},

	properties: {

		// appearance
		appearance: { init: "$parent/panel", refine: true },

		// overridden
		rich: { init: true, refine: true },

		/**
		 * Alignment property.
		 */
		alignment: { init: "left", check: ["left", "center", "right"], apply: "_applyAlignment" },

		/**
		 * AutoSize property.
		 */
		autoSize: { init: "none", check: ["none", "spring", "contents"], apply: "_applyAutoSize" },

		/**
		 * BorderStyle property.
		 */
		borderStyle: { init: "sunken", check: ["none", "solid", "dashed", "dotted", "double", "raised", "sunken"], apply: "_applyBorderStyle" },

		/**
		 * IconSize property.
		 *
		 * Gets or sets the size of the icon.
		 */
		iconSize: { init: null, nullable: true, check: "Map", apply: "_applyIconSize", themeable: true },

	},

	members: {

		/**
		 * Applies the alignment property.
		 */
		_applyAlignment: function (value, old) {

			var label = this.getChildControl("label");

			label.setWrap(false);
			label.setAllowGrowX(true);
			label.setTextAlign(value);
		},

		/**
		 * Applies the autoSize property.
		 */
		_applyAutoSize: function (value, old) {

			this.setLayoutProperties({ flex: value == "spring" ? 1 : 0 });

			if (value == "contents")
				this.resetWidth();
		},

		/**
		 * Applies the borderStyle property.
		 */
		_applyBorderStyle: function (value, old) {

			this.removeState("borderNone");
			this.removeState("borderSolid");
			this.removeState("borderDashed");
			this.removeState("borderDotted");
			this.removeState("borderDouble");
			this.removeState("borderRaised");
			this.removeState("borderSunken");

			if (value)
				this.addState("border" + qx.lang.String.firstUp(value));

		},

		/**
		 * Applies the IconSize property.
		 *
		 * Sets the size of the icon child widget.
		 */
		_applyIconSize: function (value, old) {

			var icon = this.getChildControl("icon");

			if (value) {
				icon.setWidth(value.width);
				icon.setHeight(value.height);
				icon.getContentElement().setStyle("background-size", value.width + "px " + value.height + "px");
			}
			else {
				icon.resetWidth();
				icon.resetHeight();
				icon.getContentElement().setStyle("backgroundSize", "contain");
			}
		},

	},
});