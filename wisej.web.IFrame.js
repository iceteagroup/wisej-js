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
 * wisej.web.IFrame
 */
qx.Class.define("wisej.web.IFrame", {

	extend: qx.ui.embed.Iframe,

	// Cannot use ThemedIframe, it's impossible to use
	// the inner document to measure the size because of
	// newer browses's security.
	// extend: qx.ui.embed.ThemedIframe,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	construct: function () {

		this.base(arguments);

		this.addListener("load", this._onLoad, this);
	},

	statics: {

		FRAME_EVENTS: [
			"click",
			"dblclick",
			"tap",
			"dbltap",
			"mousedown",
			"mouseup",
			"mousemove",
			"mouseout",
			"mouseover",
			"mousewheel",
			"keydown",
			"keyup",
			"keypress",
			"pointerdown",
			"pointermove",
			"pointerup",
		],
	},

	properties: {

		// appearance
		appearance: { refine: true, init: "panel" },

		/**
		 * The icon to show at design time instead of the content.
		 */
		designIcon: { init: null, check: "String" },

		/**
		 * Allows the IFrame to access certain local features when using
		 * a cross-origin source, see https://sites.google.com/a/chromium.org/dev/Home/chromium-security/deprecating-permissions-in-cross-origin-iframes.
		 */
		allow: { init: null, check: "String", apply: "_applyAllow" }
	},

	members: {

		/**
		 * Get the DOM document object of an IFrame.
		 *
		 * @return {Document} The DOM document object of the IFrame.
		 */
		getDocument: function () {

			var el = this._getIframeElement();
			return el.getDocument ? el.getDocument() : null;

		},

		/**
		 * Applies the allow property.
		 */
		_applyAllow: function (value, old) {
			var el = this._getIframeElement();
			el.setAttribute("allow", value);
		},

		// overridden.
		// displays the design icon and url text when in design mode.
		_applySource: function (value, old) {

			// when in design mode, don't display the document.
			// simply show the name of the file.
			if (wisej.web.DesignMode) {

				var viewer = this.getChildControl("design-view");

				viewer.set({
					label: this.getSource(),
					icon: this.getDesignIcon()
				});

			}
			else {
				this.base(arguments, value, old);
			}
		},

		_onLoad: function (e) {

			// attach to pointer events in the IFrame to
			// notify wisej that the user is still alive.
			if (!wisej.web.DesignMode) {

				// if the user moves the mouse, clicks, or presses a key, we know
				// he"s still alive and using the app.
				try {
					var frame_document = this.getDocument();
					if (frame_document) {

						var events = wisej.web.IFrame.FRAME_EVENTS;
						for (var i = 0; i < events.length; i++) {
							qx.bom.Element.addListener(frame_document, events[i], this.__onIframeEvent, this);
						}
					}
				}
				catch (ex) { }
			}
		},

		// handles events on the IFrame document to dispatch the
		// event to the widget that contains the IFrame. otherwise
		// IFrame events do not bubble.
		__onIframeEvent: function (e) {

			var target = this.getContentElement().getDomElement();

			// inform Wisej that we user is still alive
			Wisej.Core.userIsAlive();

			if (e.getType() == "pointerdown") {
				// close all menus and popups when clicking on an IFrame.
				qx.ui.menu.Manager.getInstance().hideAll();
				qx.ui.popup.Manager.getInstance().hideAll();
			}

			var clone = e.clone();
			clone.setBubbles(true);
			clone.setTarget(target);

			// adjust the pointer position.
			if (clone._native && clone._native.pageX !== undefined) {

				var position = qx.bom.element.Location.get(target, "border");
				clone._native.pageY += position.top;
				clone._native.pageX += position.left;
			}

			qx.event.Registration.dispatchEvent(target, clone);
		},

		// overridden to delay the "render" event 
		// until the load event.
		_onDesignRender: function () {

			if (!wisej.web.DesignMode && this.getSource()) {

				this.addListenerOnce("load", function () {
					this.fireEvent("render");
				});
			}
			else {
				this.fireEvent("render");
			}
		},

		/**
		 * Creates the content element. The style properties
		 * position and zIndex are modified from the Widget
		 * core.
		 *
		 * @return {qx.html.Element} The widget's content element
		 */
		_createContentElement: function () {

			if (wisej.web.DesignMode) {
				return new qx.html.Element("div", {
					overflowX: "hidden",
					overflowY: "hidden"
				});
			}
			else {
				var iframe = new qx.html.Iframe(this.__source);
				iframe.setAttribute("allow", this.getAllow());
				iframe.addListener("load", this._onIframeLoad, this);
				return iframe;
			}
		},

		/**
		 * Overridden to create the design time label.
		 */
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "design-view":

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
					break;
			}

			return control || this.base(arguments, id);
		},

	},

	destruct: function () {

		try {
			var frame_document = this.getDocument();
			if (frame_document) {
				var events = wisej.web.IFrame.FRAME_EVENTS;
				for (var i = 0; i < events.length; i++) {
					qx.bom.Element.removeListener(frame_document, events[i], this.__onIframeEvent, this);
				}
			}
		}
		catch (ex) { }

	}
});
