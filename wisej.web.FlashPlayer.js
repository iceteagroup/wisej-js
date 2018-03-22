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
 * wisej.web.FlashPlayer
 */
qx.Class.define("wisej.web.FlashPlayer", {

	extend: qx.ui.core.Widget,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	properties: {

		appearance: { init: "panel", refine: true },

		/**
		 * The URL of the Flash movie.
		 */
		source: { init: null, check: "String", apply: "_applySource" },

		/**
		 * The icon to show at design time instead of the flash content.
		 */
		designIcon: { init: null, check: "String" },

		/**
		 * Set the quality attribute for the Flash movie.
		 */
		quality: { check: ["low", "autolow", "autohigh", "medium", "high", "best"], init: "best", nullable: true, apply: "_applyProperty" },

		/**
		 * Set the scale attribute for the Flash movie.
		 */
		scale: { check: ["showall", "noborder", "exactfit", "noscale"], nullable: true, apply: "_applyProperty" },

		/**
		 * Set the wmode attribute for the Flash movie.
		 */
		wmode: { check: ["window", "opaque", "transparent"], init: "opaque", nullable: true, apply: "_applyProperty" },

		/**
		 * Set the play attribute for the Flash movie.
		 */
		play: { check: "Boolean", nullable: true, apply: "_applyProperty" },

		/**
		 * Set the loop attribute for the Flash movie.
		 */
		loop: { check: "Boolean", nullable: true, apply: "_applyProperty" },

		/**
		 * Set the menu attribute for the Flash movie.
		 */
		menu: { check: "Boolean", nullable: true, apply: "_applyProperty" },

		/**
		 * Set allow script access
		 **/
		allowScriptAccess: { check: ["sameDomain", "always", "never"], init: "sameDomain", nullable: true, apply: "_applyProperty" },

		/**
		 * Set the 'FlashVars' to pass variables to the Flash movie.
		 */
		variables: { init: {}, check: "Map", apply: "_applyProperty" },

		/**
		 * A timeout when trying to load the flash source.
		 */
		loadTimeout: { check: "Integer", init: 10000, apply: "_applyProperty" },
	},

	members: {

		/**
		 * Applies the source property.
         *
         * When in design mode show the source url instead of 
         * loading the swf application.
		 */
		_applySource: function (value, old) {

			var player = this.getChildControl("player");

			// when in design mode, don't display the document.
			// simply show the name of the file.
			if (wisej.web.DesignMode) {

				player.set({
					label: value,
					icon: this.getDesignIcon()
				});

				return;
			}

			player.setSource(value);

		},

		/**
		 * Applies the specified property on the inner player component.
		 */
		_applyProperty: function (value, old, name) {

			if (wisej.web.DesignMode)
				return;

			var setter = "set" + qx.lang.String.firstUp(name);
			this.getChildControl("player")[setter](value);
		},

		/**
		 * Overridden to set the bgcolor property on the inner flash player.
		 */
		_applyBackgroundColor: function (value, old) {

			this.base(arguments, value, old);

			if (wisej.web.DesignMode)
				return;

			// convert the color to  the hex representation, it's the only one understood by flash.
			var player = this.getChildControl("player");
			var color = qx.util.ColorUtil.rgbToHexString(qx.util.ColorUtil.stringToRgb(value));
			player.getContentElement().setParam("bgcolor", color);
		},

		/**
		 * Overridden to create the inner flash player and the design time label.
		 */
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "player":

					if (wisej.web.DesignMode) {

						this._setLayout(new qx.ui.layout.Grow());
						var control = new qx.ui.basic.Atom().set({
							rich: true,
							padding: 20,
							center: true,
							alignX: "center",
							iconPosition: "left",
							gap: 10
						});
						this._add(control);
					}
					else {

						this._setLayout(new qx.ui.layout.Grow());
						var control = new qx.ui.embed.Flash("");
						this._add(control);
					}
					break;
			}

			return control || this.base(arguments, id);
		},

	},

});