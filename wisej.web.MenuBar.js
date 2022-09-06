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
 * wisej.web.MenuBar
 * 
 * Represents a menu bar widget. It can be used in any container like any widget.
 *
 * The actual menu component is an instance if "wisej.web.menu.MenuBar" that has to be
 * created and assigned by the code using this class.
 */
qx.Class.define("wisej.web.MenuBar", {

	extend: wisej.web.Control,

	include: [
			wisej.mixin.MBorderStyle,
	],

	construct: function () {

		this.base(arguments, new qx.ui.layout.Grow());

	},

	properties: {

		/**
		 * MenuBar property.
		 *
		 * Sets the inner menu bar component.
		 */
		menuBar: { init: null, nullable: true, check: "wisej.web.menu.MenuBar", apply: "_applyMenuBar", transform: "_transformComponent" },

	},

	members: {

		/**
		 * Assigns the menu component to the menu bar widget.
		 */
		_applyMenuBar: function (value, old) {

			// remove the previous menu component.
			if (old != null)
				this._remove(old);

			if (value) {

				var menu = value;
				this.add(menu);

				// copy over the non-inheritable properties
				// that are (or could be) set in the theme since
				// this control is wrapping a menu bar.

				if (this.getFont()) menu.setFont(this.getFont());
				if (this.getTextColor()) menu.setTextColor(this.getTextColor());
				if (this.getBackgroundColor()) menu.setBackgroundColor(this.getBackgroundColor());
			}
		}

	}
});
