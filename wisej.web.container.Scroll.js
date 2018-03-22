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
 * wisej.web.container.Scroll
 *
 *
 * Enhances the qx.ui.container.Scroll to fire scroll and visibility events.
 */
qx.Class.define("wisej.web.container.Scroll", {

	extend: qx.ui.container.Scroll,

	events:
	{
		/** Fired when the X scrollbar is scrolled. */
		"scrollX": "qx.event.type.Data",

		/** Fired when the Y scrollbar is scrolled. */
		"scrollY": "qx.event.type.Data",

		/** Fired when the X scrollbar is shown or hidden. */
		"changeScrollbarXVisibility": "qx.event.type.Event",

		/** Fired when the Y scrollbar is shown or hidden. */
		"changeScrollbarYVisibility": "qx.event.type.Event",
	},

	members:
	{

		/**
		 * Returns the horizontal scrollbar widget.
		 */
		getScrollBarX: function () {

			return this.getChildControl("scrollbar-x");
		},

		/**
		 * Returns the vertical scrollbar widget.
		 */
		getScrollBarY: function () {

			return this.getChildControl("scrollbar-y");
		},

		// overridden.
		_onScrollPaneX: function (e) {

			this.base(arguments, e);
			this.fireDataEvent("scrollX", e.getData());
		},

		// overridden.
		_onScrollPaneY: function (e) {

			this.base(arguments, e);
			this.fireDataEvent("scrollY", e.getData());
		},

		// overridden.
		_onChangeScrollbarXVisibility: function (e) {

			this.base(arguments, e);
			this.fireEvent("changeScrollbarXVisibility");
		},


		// overridden.
		_onChangeScrollbarYVisibility: function (e) {

			this.base(arguments, e);
			this.fireEvent("changeScrollbarYVisibility");
		},

	}
});
