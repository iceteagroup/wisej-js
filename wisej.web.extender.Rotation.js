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
 * wisej.web.extender.Rotation
 */
qx.Class.define("wisej.web.extender.Rotation", {

	extend: qx.core.Object,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejComponent],

	properties: {

		/**
		 * Rotations collection.
		 *
		 * List of component IDs with corresponding X,Y,Z rotations.
		 */
		rotations: { init: null, check: "Array", nullable: true, apply: "_applyRotations" }
	},

	members: {

		_applyRotations: function (value, old) {

			if (value != null && value.length > 0) {

				for (var i = 0; i < value.length; i++) {

					var component = this._transformComponent(value[i].id);
					if (component) {

						var rotation = value[i].rotation;
						if (rotation == null)
							continue;

						this.__rotate(component, rotation);
					}
				}
			}
			else if (wisej.web.DesignMode) {

				// when in design mode, the value contains the single set of extended
				// properties only for the widget being designed.
				var component = this._transformComponent(value.id)
				if (component)
					this.__rotate(component, value.rotation);
			}

		},

		__rotate: function (widget, rotation) {

			var el = widget.getContentElement();

			if (rotation.enabled === false) {

				el.setStyle("transform", null);
				el.setStyle("perspective", null);
				el.setStyle("transform-style", null);
				el.setStyle("transform-origin", null);
				el.setStyle("backface-visibility", null);
			}
			else {

				el.setStyle("transform-style", "preserve-3d", true);
				el.setStyle("transform-origin", rotation.origin || "", true);
				el.setStyle("perspective", (rotation.perspective | 0) + "px", true);
				el.setStyle("backface-visibility", rotation.hideBackface ? "hidden" : "visible", true);
				el.setStyle("transform",
					"perspective(" + (rotation.perspective | 0) +"px) " +
					"rotateX(" + (rotation.rotateX || 0) + "deg) " +
					"rotateY(" + (rotation.rotateY || 0) + "deg) " +
					"rotateZ(" + (rotation.rotateZ || 0) + "deg) " +
					"scaleX(" + (rotation.scaleX || 1) + ") " +
					"scaleY(" + (rotation.scaleY || 1) + ") " +
					"scaleZ(" + (rotation.scaleZ || 1) + ")", true);
			}
		},
	}

});
