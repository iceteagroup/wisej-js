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
 * wisej.web.ScrollablePage
 */
qx.Class.define("wisej.web.ScrollablePage", {

	extend: wisej.web.ScrollableControl,

	construct: function () {

		this.base(arguments);

		// handles key presses for the cancel and accept default buttons.
		this.addListener("keypress", this._onKeyPress);
	},

	properties: {

		appearance: { init: "page", refine: true },

		/**
		 * Active flag.
		 *
		 * When the ScrollablePage control is marked active it will replace the
		 * single active desktop as the root container.
		 */
		active: { init: false, check: "Boolean", apply: "_applyActive" },

		/**
		 * AcceptButton property.
		 *
		 * The button that is clicked when the user presses Enter.
		 */
		acceptButton: { init: null, nullable: true, transform: "_transformComponent" },

		/**
		 * CancelButton property.
		 *
		 * The button that is clicked when the user presses Esc.
		 */
		cancelButton: { init: null, nullable: true, transform: "_transformComponent" },
	},

	members: {

		/**
		 * Page marker.
		 */
		isPage: true,

		_applyActive: function (value, old) {

			if (wisej.web.DesignMode)
				return;

			if (value) {
				this.activate();
				Wisej.Platform.setMainPage(this);
			}
			else if (Wisej.Platform.getMainPage() == this) {

				Wisej.Platform.setMainPage(null);
			}
		},

		/**
		 * Handler for keypress events.
		 * 
		 * Fires clicks on the accept/cancel default buttons when
		 * the user presses Enter/Esc/
		 */
		_onKeyPress: function (e) {

			var modifiers = e.getModifiers();
			if (modifiers == 0) {
				var identifier = e.getKeyIdentifier();
				switch (identifier) {
					case "Enter":
						var acceptButton = this.getAcceptButton();
						if (acceptButton != null) {
							acceptButton.execute();
							e.stop();
						}
						break;

					case "Escape":
						var cancelButton = this.getCancelButton();
						if (cancelButton != null) {
							cancelButton.execute();
							e.stop();
						}
						break;
				}
			}
		},
	},

	destruct: function () {

		if (!wisej.web.DesignMode) {
			if (Wisej.Platform.getMainPage() == this)
				Wisej.Platform.setMainPage(null);
		}
	}

});
