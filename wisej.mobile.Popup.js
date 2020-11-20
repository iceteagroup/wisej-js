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
 * wisej.mobile.Popup.js
 *
 * Extends qx.ui.popup.Popup to detect when running in 
 * a mobile browser and show either docked to bottom or
 * in the middle instead of attached to the opener.
 */
qx.Class.define("wisej.mobile.Popup", {

	extend: qx.ui.popup.Popup,

	statics: {

		/** height of the popup */
		DEFAULT_HEIGHT: 230,

		/** duration of the animation on appear */
		ANIMATION_DURATION: 150
	},

	construct: function (layout) {

		if (!layout) {


			if (wisej.web.DesignMode) {
				layout = new qx.ui.layout.VBox();
			}
			else {

				layout = Wisej.Platform.isMobileMode()
					? new qx.ui.layout.Grow()
					: new qx.ui.layout.VBox();
			}
		}

		this.setDomMove(true);

		this.base(arguments, layout);
	},

	members: {

		/**
		 * Shows the popup at the requested location.
		 *
		 * @param target {qx.ui.core.Widget | Point | qx.event.type.Pointer | HTMLElement} The widget to align the popup to or the coordinates as {left, top}.
		 * @param liveupdate {Boolean} Flag indicating if the position of the widget should be checked and corrected automatically.
		 */
		open: function (target, liveupdate) {

			// when running in a non-mobile browser, use the default implementation.
			if (wisej.web.DesignMode || !Wisej.Platform.isMobileMode()) {

				if (target instanceof qx.ui.core.Widget)
					this.placeToWidget(target, liveupdate);
				else if (target instanceof qx.event.type.Pointer)
					this.placeToPointer(target);
				else if (target instanceof HTMLElement)
					this.placeToElement(target, liveupdate);
				else
					this.placeToPoint(target);

				this.show();
			}
			else if (qx.core.Environment.get("os.name") == "android") {

				this.setHeight(wisej.mobile.Popup.DEFAULT_HEIGHT);
				this.setLayoutProperties({ left: "10%", right: "10%", top: (screen.height - wisej.mobile.Popup.DEFAULT_HEIGHT) / 2 });
				wisej.web.Animation.animate(this, "popIn", {
					timing: "ease",
					duration: wisej.mobile.Popup.ANIMATION_DURATION
				});
				this.show();

				Wisej.Platform.blockRoot(true);
				this.addListenerOnce("disappear", function () { Wisej.Platform.blockRoot(false) });
			}
			else {
				this.setHeight(wisej.mobile.Popup.DEFAULT_HEIGHT);
				this.setLayoutProperties({ bottom: 0, left: 0, right: 0 });
				wisej.web.Animation.animate(this, "slideUpIn", {
					timing: "ease",
					duration: wisej.mobile.Popup.ANIMATION_DURATION
				});
				this.show();
			}
		}
	}

});
