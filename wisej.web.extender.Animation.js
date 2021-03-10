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

	construct: function(){
	
		this.base(arguments);

		this._handles = {};

	},

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

		/** Keeps a map between a running animation handle and a widget. */
		_handles: null,

		/**
		 * Performs the specified animation immediately.
		 *
		 * @param animation {Map} the animation definition map.
		 */
		run: function (animation) {

			var component = this.__getAnimationTarget(animation.id);
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
			if (animation.delay != null)
				options.delay = animation.delay;
			if (animation.keep > -1)
				options.keep = animation.keep;

			var me = this;
			var handle = wisej.web.Animation.animate(component, animation.name, options, {

				// start callback.
				start: function () {
					me.fireDataEvent("start", { name: animation.name, target: component });
				},

				// end callback
				end: function () {

					switch (animation.event)
					{
						case "close":
							animation.destroyComponent.call(component);
							break;

						case "disappear":
							animation.hideElement.call(component.getContentElement());
							break;
					}

					me.fireDataEvent("end", { name: animation.name, target: component });
				}
			});

			// save the handle in relation to the component.
			this._handles[component.$$hash] = handle;

		},

		/**
		 * Stops the currently running animation on the component.
		 */
		stop: function (component) {

			if (component && component.isWisejComponent) {
				var handle = this._handles[component.$$hash];
				if (handle) {
					delete this._handles[component.$$hash];

					if (handle.jsAnimation) {
						qx.bom.element.AnimationJs.stop(handle);
					}
					else {
						var el = component.getContentElement().getDomElement();
						if (el)
							el.style[qx.core.Environment.get("css.animation")["name"]] = "";
					}
				}
			}
		},

		/**
		 * Applies the animations property.
		 */
		_applyAnimations: function (value, old) {

			if (old != null && old.length > 0) {
				for (var i = 0; i < old.length; i++) {
					this.__unregisterAnimation(old[i]);
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
		__registerAnimation: function (animation) {

			var component = this.__getAnimationTarget(animation.id);
			if (!component)
				return;

			// sanity check.
			if (!animation.event || !animation.name)
				return;

			// animations bound to the "disappear" event must run
			// before the element has actually disappeared.
			if (animation.event === "disappear") {

				this.__registerDisappearAnimation(animation, component);
				return;
			}

			// animations bound to the "close" event must run
			// before the component is destroyed.
			if (animation.event === "close")
			{
				this.__registerCloseAnimation(animation, component);
				return;
			}

			// attach to the specified event to run the automation automatically.
			var me = this;
			animation.listenerId = component.addListener(animation.event, function (e) {

				if (e.getCurrentTarget() != this)
					return;

				me.run(animation);

			});
		},

		__registerCloseAnimation: function (animation, component) {

			var me = this;

			// override the qx.ui.core.Widget.destroy() method to
			// run the animation before the component is destroyed.
			if (!animation.destroyComponent) {

				// override and restore the hide method as soon as it's called.
				animation.destroyComponent = component.destroy;
				component.destroy = function () {
					me.run(animation, component);
				};
			}
		},

		__registerDisappearAnimation: function (animation, component) {

			var me = this;

			// override the qx.html.Element.hide() method to
			// run the animation before the DOM element is hidden.
			var el = component.getContentElement();
			if (el && !animation.hideElement) {

				// override and restore the hide method as soon as it's called.
				animation.hideElement = el.hide;
				el.hide = function () {
					me.run(animation, component);
				};
			}
		},

		// unregisters the specified animation on the widget.
		__unregisterAnimation: function (animation) {

			var component = this.__getAnimationTarget(animation.id);
			if (!component)
				return;

			var el = component.getContentElement();

			if (animation.listenerId) {
				component.removeListenerById(animation.listenerId);
				delete animation.listenerId;
			}

			if (animation.hideElement)
			{
				el.hide = animation.hideElement;
				delete animation.hideElement;
			}

			if (animation.destroyComponent) {
				component.destroy = animation.destroyComponent;
				delete animation.destroyComponent;
			}

			// try to stop the animation.
			this.stop(component);
		},

		// Returns the component that corresponds to the specified id.
		__getAnimationTarget: function (id) {

			var component = Wisej.Core.getComponent(id);

			// special case for components that need to
			// animate another related widget, i.e. the wisej.web.UserPopup 
			// has to animate its popup container.
			if (component && component.getAnimationTarget)
				component = component.getAnimationTarget();

			return component;
		},

		/**
		 * Applies the custom property.
		 *
		 * Registers the user-defined animations globally.
		 */
		_applyCustom: function (value, old) {
			if (value != null && value.length > 0) {
				for (var i = 0; i < value.length; i++) {

					// try to parse the JSON string and register with wisej.web.Animation.
					try {

						var animation = JSON.parse(value[i]);
						for (var name in animation) {
							if (name)
								wisej.web.Animation.register(name, animation[name]);

							break;
						}
					}
					catch (ex) {
						// ignore.
					}
				}
			}
		}
	}

});
