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
 * wisej.web.PictureBox
 */
qx.Class.define("wisej.web.PictureBox", {

	extend: qx.ui.basic.Image,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		qx.ui.core.MExecutable,
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	construct: function () {

		this.base(arguments);

		this.addListener("pointerover", this._onPointerOver);
		this.addListener("pointerout", this._onPointerOut);
		this.addListener("loaded", this._onImageLoaded);
		this.addListener("tap", this._onTap);
	},

	properties: {

		// Appearance override
		appearance: { refine: true, init: "picturebox" },

		/**
		 * Filter property.
		 * 
		 * Sets the CSS filter over the image: https://developer.mozilla.org/en-US/docs/Web/CSS/filter.
		 */
		filter: { init: "", check: "String", apply: "_applyFilter" },

		/**
		 * SizeMode property.
		 */
		sizeMode: { init: "normal", check: "String", apply: "_applySizeMode" },
	},

	members: {

		/**
		 * Applies the sizeMode property.
		 */
		_applySizeMode: function (value, old) {

			var position = null, size = null;

			switch (value) {
				case "normal":
					position = "0px 0px";
					break;

				case "stretchImage":
					position = "0px 0px";
					size = "100% 100%";
					break;

				case "autoSize":
					position = "0px 0px";
					this.resetWidth();
					this.resetHeight();
					this.invalidateLayoutCache();
					break;

				case "centerImage":
					position = "center center";
					break;

				case "zoom":
					position = "center center";
					size = "contain";
					break;

				case "cover":
					size = "cover";
					break;
			
			}

			var elem = this.getContentElement();
			elem.setStyles({
				backgroundSize: size,
				backgroundPosition: position,
				backgroundOrigin: "content-box",
			});
		},


		/**
		 * Applies the filter property.
		 */
		_applyFilter: function (value, old) {

			qx.ui.core.queue.Widget.add(this, "filter");
		},

		/**
		 * Event handler for the "loaded" event.
		 */
		_onImageLoaded: function (e) {

			// auto-resize the widget when sizeMode = "autoSize".
			if (this.getSizeMode() === "autoSize") {
				this.resetWidth();
				this.resetHeight();
				this.invalidateLayoutCache();
			}

			// apply filters.
			if (this.getFilter())
				qx.ui.core.queue.Widget.add(this, "filter");
		},

		syncWidget: function (jobs) {

			this.base(arguments, jobs);

			if (jobs && jobs["filter"]) {
				qx.event.Timer.once(function () {
					var el = this.__getContentElement();
					if (el)
						el.setStyle("filter", this.getFilter());
				}, this, 0);
			}
		},

		/**
		 * Event handler for the pointer over event.
		 */
		_onPointerOver: function (e) {

			this.addState("hovered");
		},

		/**
		 * Event handler for the pointer out event.
		 */
		_onPointerOut: function (e) {

			this.removeState("hovered");
		},

        /**
         * Listener method for "tap" event which stops the propagation.
         *
         * @param e {qx.event.type.Pointer} Pointer event
         */
		_onTap: function (e) {
			this.execute();
			e.stopPropagation();
		},

		/**
		 * getDesignMetrics
		 *
		 * Method used by the designer to retrieve metrics information about a widget in design mode.
		 */
		getDesignMetrics: function () {

			return this.getSizeHint();
		},

	},
});
