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
					var url = this.getSource();
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
			el.setAttribute("data", url);
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
				return new qx.html.Element("object", {
					overflowX: "hidden",
					overflowY: "hidden"
				});
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

		/**
		 * Given a filename for a static resource, returns the resource's absolute
		 * URL. Supports file paths with or without origin/protocol.
		 */
		__toAbsoluteURL: function (url) {

			// handle absolute URLs (with protocol-relative prefix)
			// example: //domain.com/file.png
			if (url.search(/^\/\//) != -1) {
				return window.location.protocol + url
			}

			// handle absolute URLs (with explicit origin)
			// example: http://domain.com/file.png
			if (url.search(/:\/\//) != -1) {
				return url
			}

			// handle absolute URLs (without explicit origin)
			// example: /file.png
			if (url.search(/^\//) != -1) {
				return window.location.origin + url
			}

			// handle relative URLs
			// example: file.png
			var base = window.location.href.match(/(.*\/)/)[0]
			return base + url
		}
	},

});