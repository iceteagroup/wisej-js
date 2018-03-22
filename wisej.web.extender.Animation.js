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
 * wisej.web.extender.Animation
 */
qx.Class.define("wisej.web.extender.Animation", {

	extend: qx.core.Object,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejComponent],

	properties: {

		/**
		 * Animations property.
		 *
		 * List of components and related animations to apply when the specified trigger events fires.
		 */
		animations: { init: null, check: "Array", apply: "_applyAnimations" },

		/**
		 * Custom property.
		 *
		 * List of user-defined animation definitions. These animation descriptions are
		 * registered globally with wiseh.web.Animation. Can override existing included animations
		 * and can be used by other components and/or AnimationProviders.
		 */
		custom: { init: null, check: "Array", apply: "_applyCustom" }

	},

	members: {

		/**
		 * Performs the specified animation immediately.
		 *
		 * @param animation {Map} the animation definition map.
		 * @param component {Widget} the component to animate. If not specified, it's the id member in the data argument.
		 */
		run: function (animation, component) {

			if (!component)
				var component = Wisej.Core.getComponent(animation.id);
			if (!component)
				return;

			var options = {
				duration: undefined,
				repeat: undefined,
				timing: undefined,
				reverse: undefined,
			};
			if (animation.duration > 0)
				options.duration = animation.duration;
			if (animation.repeat == -1 || animation.repeat > 0)
				options.repeat = animation.repeat;
			if (animation.timing != null)
				options.timing = animation.timing;
			if (animation.reverse != null)
				options.reverse = animation.reverse;

			var me = this;
			wisej.web.Animation.animate(component, animation.name, options, {

				// start callback.
				start: function () {
					me.fireDataEvent("start", component);
				},

				// end callback
				end: function () {
					me.fireDataEvent("end", component);
				}

			});
		},

		/**
		 * Applies the animations property.
		 */
		_applyAnimations: function (value, old) {

			if (old != null && old.length > 0) {
				for (var i = 0; i < old.length; i++) {
					this.__unregisterAnimation(value[i]);
				}
			}

			if (value != null && value.length > 0) {
				for (var i = 0; i < value.length; i++) {
					this.__registerAnimation(value[i]);
				}
			}
		},

		// registers the specified animation on the widget in response to
		// to the trigger event.
		__registerAnimation: function (data) {

			var component = Wisej.Core.getComponent(data.id);
			if (!component)
				return;

			// sanity check.
			if (!data.event || !data.name)
				return;

			var me = this;
			var animation = data;
			data.listenerId = component.addListener(data.event, function (e) {

				setTimeout(function () {

					if (!qx.ui.core.Widget.contains(this, e.getRelatedTarget())) {

						me.run(animation, component);

					}
				}, animation.delay | 0);

			});

		},

		// unregisters the specified animation on the widget.
		__unregisterAnimation: function (data) {

			var comp = Wisej.Core.getComponent(data.id);
			if (!comp)
				return;

			if (data.listenerId > 0)
				comp.removeListenerById(data.listenerId);
		},

		/**
		 * Applies the custom property.
		 *
		 * Registers the user-defined animations globally.
		 */
		_applyCustom: function(value, old)
		{
			if (value != null && value.length > 0)
			{
				for (var i = 0 ; i < value.length; i++) {

					// try to parse the JSON string and register with wisej.web.Animation.
					try {

						var animation = JSON.parse(value[i]);
						for (var name in animation)
						{
							if (name != null)
								wisej.web.Animation.register(name, animation[name]);

							break;
						}
					}
					catch (ex) {
						// ignore.
					}
				}
			}
		},
	}

});
