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
		acceptButton: { init: null, nullable: true, apply: "_applyAcceptButton", transform: "_transformComponent" },

		/**
		 * CancelButton property.
		 *
		 * The button that is clicked when the user presses Esc.
		 */
		cancelButton: { init: null, nullable: true, apply: "_applyCancelButton", transform: "_transformComponent" },
	},

	members: {

		/**
		 * Page marker.
		 */
		isPage: true,

		/**
		 * Applies the active property.
		 */
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
		 * Applies the acceptButton property.
		 *
		 * Registers a capturing shortcut to process the keyDown
		 * event before any target widget and execute the acceptButton.
		 */
		_applyAcceptButton: function (value, old) {

			if (!value && old)
				this._disposeObjects("__acceptButtonAccel");

			if (value && !this.__acceptButtonAccel) {
				this.__acceptButtonAccel = new qx.bom.Shortcut("Enter", true, false, document.body);
				this.__acceptButtonAccel.addListener("execute", function (e) {

					var acceptButton = this.getAcceptButton();
					if (acceptButton != null && acceptButton.isSeeable()) {

						// ignore accelerators on widgets that are not
						// in an active top-level container: page, form, or desktop.
						if (!wisej.utils.Widget.canExecute(acceptButton))
							return;

						e.stop();
						acceptButton.execute();
					}

				}, this);
			}
		},
		__acceptButtonAccel: null,

		/**
		 * Applies the cancelButton property.
		 *
		 * Registers a capturing shortcut to process the keyDown
		 * event before any target widget and execute the cancelButton.
		 */
		_applyCancelButton: function (value, old) {

			if (!value)
				this._disposeObjects("__cancelButtonAccel");

			if (value && !this.__cancelButtonAccel) {
				this.__cancelButtonAccel = new qx.bom.Shortcut("Escape", true, false, document.body);
				this.__cancelButtonAccel.addListener("execute", function (e) {

					var cancelButton = this.getCancelButton();
					if (cancelButton != null && cancelButton.isSeeable()) {

						// ignore accelerators on widgets that are not
						// in an active top-level container: page, form, or desktop.
						if (!wisej.utils.Widget.canExecute(cancelButton))
							return;

						e.stop();
						cancelButton.execute();
					}

				}, this);
			}
		},
		__cancelButtonAccel: null
	},

	destruct: function () {

		if (!wisej.web.DesignMode) {
			if (Wisej.Platform.getMainPage() == this)
				Wisej.Platform.setMainPage(null);
		}

		this._disposeObjects("__acceptButtonAccel");
		this._disposeObjects("__cancelButtonAccel");
	}

});
