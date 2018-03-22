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
 * wisej.web.WebBrowser
 */
qx.Class.define("wisej.web.WebBrowser", {

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
	construct: function () {

		this.base(arguments, new qx.ui.layout.Grow());
	},

	properties: {

		// appearance
		appearance: { refine: true, init: "panel" },

		/**
         * Url property.
         *
         * Assigns the URL to navigate to..
         */
		url: { init: null, nullable: true, check: "String", apply: "_applyUrl" },

		/**
		 * Whether the widget should have scrollbars.
		 */
		scrollbar: { init:"auto", check: ["auto", "no", "yes"], nullable: true, themeable: true, apply: "_applyScrollbar" },
	},

	events:
	{
		/**
		 * The "load" event is fired after the iframe content has successfully been loaded.
		 */
		"load" : "qx.event.type.Event",
	},

	members: {

		/**
		 * Applies the URL property.
		 *
		 * Navigates to the specified URL.
		 */
		_applyUrl: function (value, old) {

			this.getChildControl("iframe").setSource(value);
		},

		/**
		 * Applies the scrollBar property.
		 */
		_applyScrollbar: function (value, old) {

			this.getChildControl("iframe").setScrollbar(value);
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "iframe":
					control = new qx.ui.embed.Iframe();
					control.addListener("load", function (e) {
						this.fireEvent("load");
					}, this);

					this.add(control);
					break;
			}

			return control || this.base(arguments, id);
		},

		// overridden to delay the "render" event 
		// until the load event.
		_onDesignRender: function () {

			if (this.getUrl()) {

				this.addListenerOnce("load", function () {
					this.fireEvent("render");
				});
			}
			else {
				this.fireEvent("render");
			}
		},
	},
});