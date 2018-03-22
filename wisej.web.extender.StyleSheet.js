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
 * wisej.web.extender.StyleSheet
 */
qx.Class.define("wisej.web.extender.StyleSheet", {

	extend: qx.core.Object,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejComponent],

	properties: {

		/**
		 * StyleSheet property.
		 *
		 * Defines the CSS classes to add to the stylesheet managed by this extender.
		 */
		styleSheet: { init: null, check: "String", nullable: true, apply: "_applyStyleSheet" },

		/**
		 * ClassNames property.
		 *
		 * List of component IDs with the corresponding CSS class name to add to the element.
		 */
		classNames: { init: null, check: "Map", nullable: true, apply: "_applyClassNames" }
	},

	members: {

		// the stylesheet instance managed by this extender.
		__stylesheet: null,

		/**
		 * Creates a new stylesheet using the specified css rules.
		 */
		_applyStyleSheet: function (value, old) {

			// create the local design stylesheet.
			var stylesheet = this.__stylesheet;

			if (stylesheet) {
				qx.bom.Stylesheet.removeSheet(stylesheet);
				this.__stylesheet = null;
			}

			stylesheet = qx.bom.Stylesheet.createElement(value);
			this.__stylesheet = stylesheet;
		},

		/**
		 * Adds the class names to the controls extended by this extender.
		 */
		_applyClassNames: function (value, old) {


			// remove the css class names from the previous list.
			if (old != null && old.length > 0)
			{
				for (var i = 0; i < old.length; i++) {
					var comp = Wisej.Core.getComponent(old[i].id);
					if (comp) {
						var el = comp.getContentElement();
						el.removeClass(old[i].className)
					}
				}
			}

			// add the new css class names.
			if (value != null && value.length > 0) {
				for (var i = 0; i < value.length; i++) {
					var comp = Wisej.Core.getComponent(value[i].id);
					if (comp) {
						var el = comp.getContentElement();
						el.addClass(value[i].className)
					}
				}
			}
			else if (wisej.web.DesignMode) {

				if (value) {
					// when in design mode, the value contains the single set of extended
					// properties only for the widget being designed.
					var comp = window.WisejDesignComponent;
					if (comp) {
						var el = comp.getContentElement();
						el.addClass(value.className)
					}
				}
			}

		},

		dispose: function () {

			if (this.__stylesheet) {
				qx.bom.Stylesheet.removeSheet(this.__stylesheet);
				this.__stylesheet = null;
			}

		},
	}

});
