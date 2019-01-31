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
 * wisej.web.PdfViewer
 */
qx.Class.define("wisej.web.PdfViewer", {

	extend: qx.ui.core.Widget,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	construct: function () {

		this.base(arguments);

		qx.event.Registration.addListener(document.body, "pointerdown", this.block, this, true);
		qx.event.Registration.addListener(document.body, "pointerup", this.release, this, true);
		qx.event.Registration.addListener(document.body, "losecapture", this.release, this, true);

		this.__blockerElement = this._createBlockerElement();
	},

	properties: {

		appearance: { init: "panel", refine: true },

		/**
		 * Source property.
		 */
		source: { init: null, check: "String", apply: "_applyProperty", nullable: true },

		/**
		 * The icon to show at design time instead of the pdf content.
		 */
		designIcon: { init: null, check: "String" },

		/**
		 * ViewerType property.
		 */
		viewerType: { init: "auto", check: ["auto", "google", "mozilla"], apply: "_applyProperty" },

		/**
		 * ViewerURL property.
		 */
		viewerURL: { init: null, check: "String", apply: "_applyProperty", nullable: true },

	},

	statics: {

		// Google's default URL.
		GOOGLE_VIEWER_URL: "//docs.google.com/viewer",

		// Mozilla's default URL.
		MOZILLA_VIEWER_URL: "//mozilla.github.io/pdf.js/web/viewer.html",

	},

	members: {

		__blockerElement: null,

		/**
		 * Applies the viewer's property.
		 */
		_applyProperty: function (value, old) {

			// add this widget to the update queue
			// in order to set the inner html url only once.
			qx.ui.core.queue.Widget.add(this);

		},

		syncWidget: function (jobs) {

			this.base(arguments, jobs);

			// when in design mode, don't display the document.
			// simply show the name of the file.
			if (wisej.web.DesignMode) {

				var viewer = this.getChildControl("design-view");

				viewer.set({
					label: this.getSource(),
					icon: this.getDesignIcon()
				});

				return;
			}

			var url = this.getSource();
			var el = this.getContentElement();

			// build the url depending on the type of viewer to use.
			switch (this.getViewerType()) {
				case "auto":
					break;

				case "google":
					var viewerURL = this.getViewerURL() || wisej.web.PdfViewer.GOOGLE_VIEWER_URL;
					url = viewerURL + "?url=" + encodeURIComponent(this.__toAbsoluteURL(url)) + "&embedded=true";
					break;

				case "mozilla":
					var viewerURL = this.getViewerURL() || wisej.web.PdfViewer.MOZILLA_VIEWER_URL;
					url = viewerURL + "?file=" + encodeURIComponent(this.__toAbsoluteURL(url));
					break;

				case "custom":
					var viewerURL = this.getViewerURL() || "";
					url = viewerURL.replace("[source]", encodeURIComponent(this.__toAbsoluteURL(url)));
					break;
			}

			if (this.__objectEl)
				this.__objectEl.dispose();

			this.__objectEl = new qx.html.Element("object", {
				overflowX: "hidden",
				overflowY: "hidden",
				width: "100%",
				height: "100%"
			}, {
					data: url
				}
			);

			el.add(this.__objectEl);
		},

		/** the inner element that displays the pdf viewer. */
		__objectEl: null,

		/**
		 * Overridden to create the design time label.
		 */
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "design-view":

					this._setLayout(new qx.ui.layout.Grow());
					control = new qx.ui.basic.Atom().set({
						rich: true,
						padding: 20,
						center: true,
						alignX: "center",
						iconPosition: "left",
						gap: 10
					});

					this._add(control);
					break;
			}

			return control || this.base(arguments, id);
		},

		/**
		 * Given a filename for a static resource, returns the resource's absolute
		 * URL. Supports file paths with or without origin/protocol.
		 */
		__toAbsoluteURL: function (url) {

			return qx.util.Uri.getAbsolute(url);
		},

		/**
		 * Creates <div> element which is aligned over object node to avoid losing pointer events.
		 *
		 * @return {Object} Blocker element node
		 */
		_createBlockerElement: function () {
			var el = new qx.html.Blocker();
			el.setStyles({
				"zIndex": 20,
				"display": "none"
			});

			return el;
		},

		/**
		 * Cover the object with a transparent blocker div element. This prevents
		 * pointer or key events to be handled by the iframe. To release the blocker
		 * use {@link #release}.
		 *
		 */
		block: function (e) {

			// don't block when the pointer event is originated by the object element, or we disable embedded content.
			if (e.getTarget().tagName === "OBJECT")
				return;


			this.__blockerElement.setStyle("display", "block");

			// adjust the blocker z-index, otherwise the fixed z-index at 20 blocks all clicks on all overlapping widgets.
			this.__blockerElement.setStyle("z-index", this.getZIndex());
		},

		/**
		 * Release the blocker set by {@link #block}.
		 *
		 */
		release: function () {
			this.__blockerElement.setStyle("display", "none");
		},

		// overridden
		renderLayout: function (left, top, width, height) {
			this.base(arguments, left, top, width, height);

			var pixel = "px";
			var insets = this.getInsets();

			this.__blockerElement.setStyles({
				"left": (left + insets.left) + pixel,
				"top": (top + insets.top) + pixel,
				"width": (width - insets.left - insets.right) + pixel,
				"height": (height - insets.top - insets.bottom) + pixel
			});
		},

		// overridden
		setLayoutParent: function (parent) {
			// remove the blocker element from the layout parent, and avoid adding it twice causing a js error.
			var oldParent = this.getLayoutParent();
			if (oldParent)
				oldParent.getContentElement().remove(this.__blockerElement);

			this.base(arguments, parent);

			if (parent) {
				parent.getContentElement().add(this.__blockerElement);
			}
		},
	},

	destruct: function () {
		if (this.getLayoutParent() && this.__blockerElement.getParent()) {
			this.getLayoutParent().getContentElement().remove(this.__blockerElement);
		}
		this._disposeObjects("__blockerElement");

		qx.event.Registration.removeListener(document.body, "pointerdown", this.block, this, true);
		qx.event.Registration.removeListener(document.body, "pointerup", this.release, this, true);
		qx.event.Registration.removeListener(document.body, "losecapture", this.release, this, true);
	}

});