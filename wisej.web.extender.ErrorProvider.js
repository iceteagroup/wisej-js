﻿///////////////////////////////////////////////////////////////////////////////
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
 * wisej.web.extender.ErrorProvider
 */
qx.Class.define("wisej.web.extender.ErrorProvider", {

	extend: qx.core.Object,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejComponent],

	construct: function () {

		this.base(arguments);

		this.__errorWidgets = {};

	},

	properties: {

		/**
		 * Icon property.
		 *
		 *  Gets or sets the image that is displayed next to a control when an error description string has been set for the control.
		 */
		icon: { init: null, check: "String" },

		/**
		 * BlinkRate property.
		 *
		 * Gets or sets the duration for each animation cycle.
		 */
		blinkRate: { init: 250, check: "PositiveInteger" },

		/**
		 * BlinRepeat property.
		 *
		 * Gets or sets the number of times to repeat the blink animation when blinkStyle is set to "blinkIfDifferentError".
		 */
		blinkRepeat: { init: 8, check: "PositiveInteger" },

		/**
		 * BlinkStyle property.
		 *
		 * Gets or sets a value indicating when the error icon is animated.
		 */
		blinkStyle: { init: "blinkIfDifferentError", check: ["blinkIfDifferentError", "alwaysBlink", "neverBlink"], apply: "_applyBlinkStyle" },

		/**
		 * BlinkAnimation property.
		 *
		 * Gets or sets the type of animation to perform.
		 */
		blinkAnimation: { init: "blink", check: ["none", "blink", "bounce", "tada"], apply: "_applyBlinkStyle" },

		/**
		 * Alignment property.
		 *
		 * Gets or sets the default alignment of the error icon.
		 */
		alignment: { init: "middleRight", check: ["topLeft", "topRight", "middleLeft", "middleRight", "bottomLeft", "bottomRight"] },

		/**
		 * Distance property.
		 *
		 * Gets or sets the default distance between the error icon and the widget.
		 */
		distance: { init: 0, check: "Integer" },

		/**
		 * Errors collection.
		 *
		 * List of component IDs with the corresponding error data.
		 */
		errors: { init: null, check: "Map", nullable: true, apply: "_applyErrors" }
	},

	members: {

		// the error widgets managed by this provider.
		__errorWidgets: null,

		/**
		 * Updates the type of animation to apply to the error widgets.
		 */
		_applyBlinkStyle: function (value, old, name) {

			switch (value) {
				case "none":
				case "neverBlink":
				case "blinkIfDifferentError":
					this.__stopAnimation();
					break;

				default:
					this.__startAnimation();
					break;
			}
		},

		/**
		 * Creates or updates all the error icons managed by this error provider.
		 */
		_applyErrors: function (value, old) {

			if (old != null && old.length > 0) {
				for (var i = 0; i < old.length; i++) {

					// remove only the data entries that are
					// not in the new value being applied.
					var exists = false;
					if (value != null) {
						for (var j = 0; j < value.length; j++) {
							if (value[j].id == old[i].id) {
								exists = true;
								break;
							}
						}
					}

					if (!exists) {
						var comp = Wisej.Core.getComponent(old[i].id);
						if (comp)
							this.__removeError(comp, old[i]);
					}
				}
			}

			// create or update the error icons.
			if (value != null && value.length > 0) {
				for (var i = 0; i < value.length; i++) {
					var comp = Wisej.Core.getComponent(value[i].id);
					if (comp)
						this.__showError(comp, value[i]);
				}
			}

			// start the blinker procedure, if blinkStyle is set to "blinkIfDifferentError"
			// the animation will kick in only if error.isErrorChanged() is true.
			this.__startAnimation();
		},

		__removeError: function (component, data) {

			// find if we have already created an error widget for this component.
			var error = this.__errorWidgets[data.id];

			if (error != null) {
				error.destroy();
				delete this.__errorWidgets[data.id];

			}
		},

		__showError: function (component, data) {

			// find if we have already created an error widget for this component.
			var error = this.__errorWidgets[data.id];

			// nothing to do.
			if (error == null && !data.error)
				return;

			// create the error widget.
			if (error == null) {
				error = new wisej.web.extender.errorprovider.Icon(this, component);
				this.__errorWidgets[data.id] = error;
			}

			if (data.distance == null)
				data.distance = this.getDistance();
			if (data.alignment == null)
				data.alignment = this.getAlignment();

			// update the error widget.
			error.set({
				error: data.error,
				distance: data.distance,
				alignment: data.alignment
			});
		},


		/**
		 * Starts the animation on the error icons that are visible.
		 */
		__startAnimation: function () {

			if (!wisej.web.Animation.isDefined(this.getBlinkAnimation()))
				return;

			if (this.getBlinkStyle() === "neverBlink")
				return;

			var errors = this.__errorWidgets;
			if (errors != null) {

				var blinkIfDifferent = (this.getBlinkStyle() === "blinkIfDifferentError");

				for (var id in this.__errorWidgets) {

					var error = this.__errorWidgets[id];
					if (error && error.getComponent()) {

						if (error.getComponent().isVisible()) {

							if (!blinkIfDifferent || (error.isErrorChanged() && error.getError())) {

								if (!wisej.utils.Widget.ensureDomElement(error))
									continue;

								var handle = wisej.web.Animation.animate(
									error,
									this.getBlinkAnimation(),
									{
										duration: this.getBlinkRate(),
										repeat: blinkIfDifferent ? this.getBlinkRepeat() : -1
									});

								if (handle)
									error.setAnimationHandle(handle);
							}
						}
					}
				}
			}
		},

		/**
		 * Stops the animation on the error icons that are visible.
		 */
		__stopAnimation: function () {

			var errors = this.__errorWidgets;
			if (errors != null) {

				for (var id in this.__errorWidgets) {

					var error = this.__errorWidgets[id];
					if (error.getAnimationHandle()) {
						error.getAnimationHandle().stop();
						error.setAnimationHandle(null);
					}
				}
			}
		}
	},

	destruct: function () {

		this.__errorWidgets = null;
	}

});

/**
 * wisej.web.extender.errorprovider.Icon
 */
qx.Class.define("wisej.web.extender.errorprovider.Icon", {

	extend: qx.ui.basic.Image,

	// implement IForm to handle the invalid message tooltip.
	implement: [qx.ui.form.IForm],

	construct: function (provider, component) {

		this.base(arguments);

		if (!provider) {
			this.core.logError("Cannot create the error icon without a valid provider");
			return;
		}

		if (!component) {
			this.core.logError("Cannot create the error icon without a valid component");
			return;
		}

		// save a reference to the error provider and the component connected to this error icon.
		this.setComponent(component);
		this.setErrorProvider(provider);

		if (!component.getLayoutParent()) {
			// defer if the widget doesn't have a parent yet.
			component.addListenerOnce("appear", function () {

				// add this widget to the same layout parent.
				component.getLayoutParent()._add(this);
			}, this);
		}
		else {

			// add this widget to the same layout parent.
			component.getLayoutParent()._add(this);
		}

		// initialize the icon, if specified.
		if (provider.getIcon())
			this.setSource(provider.getIcon());
		else
			this.resetSource();

		// change the error tooltip to handle html.
		this.__getTooltip().setRich(true);

		// if the appearance doesn't define an icon source, default to "icon-error".
		if (!this.getSource())
			this.setSource("icon-error");

		// start hidden.
		this.exclude();

		this.addListenerOnce("appear", this.__updatePosition);

		// hook our handlers to follow the owner component.
		component.addListener("move", this.__onComponentMove, this);
		component.addListener("resize", this.__onComponentResize, this);
		component.addListener("changeVisibility", this.__onComponentChangeVisibility, this);
	},

	properties: {

		appearance: { init: "errorprovider", refine: true },

		// the widget associated with this error icon.
		component: {check:"qx.core.Widget"},

		// the wisej.web.extender.ErrorProvider that manages this error icon.
		errorProvider: { check: "wisej.web.extender.ErrorProvider" },

		// the error message.
		error: { init: null, check: "String", apply: "_applyError" },

		// handle for the current animation applied to the icon.
		animationHandle: { check: "Object" },

		// the icon alignment in relation to the component.
		alignment: { init: "middleRight", check: ["topLeft", "topRight", "middleLeft", "middleRight", "bottomLeft", "bottomRight"], apply: "_applyAlignment" },

		// the distance between the icon and the component.
		distance: { init: 0, check: "Integer", apply: "_applyDistance" },

		// invalidMessage implementation from IForm.
		valid: { check: "Boolean", init: false },

		// invalidMessage implementation from IForm.
		invalidMessage: { check: "String", init: "" },

		// indicates the error has changed.
		errorChanged: { check: "Boolean", init: false }
	},

	members: {

		/**
		 * Applies the error property.
		 * 
		 * Sets the tooltip text on this icon widget.
		 */
		_applyError: function (value, old) {

			this.setErrorChanged(true);
			this.setInvalidMessage(value);

			if (value && this.getComponent().isVisible())
				this.show();
			else
				this.exclude();
		},

		_applyAlignment: function (value, old) {

			this.__updatePosition();
		},

		_applyDistance: function (value, old) {

			this.__updatePosition();
		},

		// follow the component position.
		__onComponentMove: function (e) {

			this.__updatePosition();

		},

		// adjust to the component size.
		__onComponentResize: function (e) {

			this.__updatePosition();

		},

		// hide/show with the component.
		__onComponentChangeVisibility: function (e) {

			if (this.getError()) {

				this.getComponent().isVisible()
					? show()
					: exclude();

			}
		},

		// updates this error image position.
		__updatePosition: function () {

			var bounds = this.getComponent().getBounds();
			if (bounds) {

				var mySize = this.getSizeHint();
				if (mySize) {

					var y = bounds.top;
					var x = bounds.left;
					var distance = this.getDistance();
					var alignment = this.getAlignment();

					switch (alignment) {
						case "topLeft":
							x -= mySize.width + distance;
							break;

						default:
						case "topRight":
							x += bounds.width + distance;
							break;

						case "middleLeft":
							x -= mySize.width + distance;
							y += Math.round((bounds.height - mySize.height) / 2);
							break;

						case "middleRight":
							x += bounds.width + distance;
							y += Math.round((bounds.height - mySize.height) / 2);
							break;

						case "bottomLeft":
							x -= mySize.width + distance;
							y += bounds.height - mySize.height;
							break;

						case "bottomRight":
							x += bounds.width + distance;
							y += bounds.height - mySize.height;
							break;
					}

					this.setLayoutProperties({ left: x, top: y });
				}
			}
		},

		/**
		 * Returns the current tooltip widget.
		 */
		__getTooltip: function () {

			var manager = qx.ui.tooltip.Manager.getInstance();
			return manager.getSharedErrorTooltip();

		},
	},

	destruct: function () {

		// unhook our handlers to follow the owner component.
		var component = this.getComponent();
		if (component) {
			component.removeListener("move", this.__onComponentMove, this);
			component.removeListener("resize", this.__onComponentResize, this);
			component.removeListener("changeVisibility", this.__onComponentChangeVisibility, this);
		}
	}

});
