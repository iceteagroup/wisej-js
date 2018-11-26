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
 * wisej.web.Animation
 */
qx.Class.define("wisej.web.Animation", {

	extend: qx.core.Object,

	statics: {

		/**
		 * Adds a new animation definition.
		 *
		 * @param name {String} the name of the animation. It can replace an existing one.
		 * @param animation {Map} the animation definition. If set to null, the animation is deleted.
		 */
		register: function (name, animation) {
			if (animation == null)
				delete wisej.web.Animation.__animations[name];
			else
				wisej.web.Animation.__animations[name] = animation;
		},

		/**
		 * Performs the animation on the widget.
		 *
		 * @param widget {Widget} the widget to animate.
		 * @param animation {String} one the supported animations or {Map} style values to animate.
		 * @param options {Map} set of animation options:
		 *
		 *		- duration {Integer} the time in milliseconds one animation cycle should take.
		 *		- repeat {Integer} the number of times the animation should be run in sequence. -1 = infinite.
		 *		- timing {String} one of the predefined value: ease | linear | ease-in | ease-out | ease-in-out | cubic-bezier(<number>, <number>, <number>, <number>) (cubic-bezier only available for CSS animations).
		 *		- delay {Integer} the time in milliseconds the animation should wait before start.
		 *		- reverse {Boolean} starts an animation in reversed order.
		 *		- values {Map} values to be replaced in the key frames using the mustache.js definition.
		 *
		 * @param callbacks {Map} callback functions:
		 *
		 *		- end {Function} fired when the animation has terminated.
		 *		- start {Function} fired when the animation has started.
		 */
		animate: function (widget, animation, options, callbacks) {

			var content = widget.getContentElement();
			if (!content)
				return;

			// add in standard values.
			options = options || {};
			options.values = options.values || {};
			try {
				var values = options.values;

				values.x = values.x || (widget.getX ? widget.getX() : 0);
				values.y = values.y || (widget.getY ? widget.getY() : 0);
				values.width = values.width || widget.getWidth();
				values.height = values.height || widget.getHeight();

				values.right = values.x + values.width;
				values.bottom = values.y + values.height;

			} catch (error) {

				this.core.logError(error);
			}

			var dom = content.getDomElement();
			if (!dom) {

				widget.addListenerOnce("appear", function () {

					var dom = content.getDomElement();
					if (dom) {

						wisej.web.Animation.__perform(dom, animation, options, callbacks);
					}
				});
				return;
			}

			return wisej.web.Animation.__perform(dom, animation, options, callbacks);
		},

		/**
		 * Checks if the animation is defined.
		 */
		isDefined: function (name) {
			return wisej.web.Animation.__animations[name] != null;
		},

		/**
		 * Performs the animation on the dom element.
		 */
		__perform: function (dom, animation, options, callbacks) {

			var reverse = options.reverse === true;

			animation = this.__getAnimation(animation, options);
			if (animation) {

				var handle =
					!reverse
						? qx.bom.element.Animation.animate(dom, animation)
						: qx.bom.element.Animation.animateReverse(dom, animation);

				if (callbacks) {
					if (callbacks.end)
						handle.addListenerOnce("end", callbacks.end);
					if (callbacks.start)
						handle.addListenerOnce("start", callbacks.start);
				}

				return handle;
			}
		},

		/**
		 * Retrieves the animation and replaces the template values.
		 */
		__getAnimation: function (animation, options) {

			if (typeof animation === "string") {
				var name = animation;
				animation = wisej.web.Animation.__animations[name];
				// clone it, we don't want to change the original definition.
				animation = qx.lang.Object.clone(animation, true);
			}
			else {
				// adjust the animation map if it doesn't contain keyFrames.
				if (animation.keyFrames == undefined)
					animation = { keyFrames: { 100: animation }, keep: 100 };
				else
					// clone it, we don't want to change the original definition.
					animation = qx.lang.Object.clone(animation, true);
			}

			if (animation) {

				// read and remove the options that must be handled separately.
				if (options) {

					var values = options.values;

					delete options.reverse;
					delete options.values;

					// adjust the animation definition.
					for (var opt in options) {
						var value = options[opt];
						if (value !== undefined)
							animation[opt] = value;
					}
				}

				if (animation.repeat == -1)
					animation.repeat = "infinite";

				// apply the template values.
				if (values && animation.template) {
					var keyFrames = JSON.stringify(animation.keyFrames);
					keyFrames = qx.bom.Template.render(keyFrames, values);
					animation.keyFrames = JSON.parse(keyFrames);
				}
			}
			return animation;
		},

		/**
		 * Animation definitions.
		 *
		 * The values can use the following parameters following parameters in curly brackets, using the
		 * mustache.js syntax:
		 *
		 *	{x}, {y}, {width}, {height}, {right}, {bottom}
		 *
		 * The values are all numeric and you need to add "px" after the argument.
		 *
		 * i.e.: { transform: "translate(0px, -{{bottom}}px)" }; // notice the double curly.
		 *
		 */
		__animations: {

			fadeIn: {
				duration: 850,
				repeat: 1,
				keep: 1,
				keyFrames: {
					0: { opacity: 0 },
					100: { opacity: 1 }
				}
			},

			fadeOut: {
				duration: 850,
				repeat: 1,
				keep: 0,
				keyFrames: {
					0: { opacity: 1 },
					100: { opacity: 0 }
				}
			},

			bounce: {
				duration: 850,
				repeat: 1,
				origin: "50% 50%",
				keep: 100,
				keyFrames: {
					0: { transform: "translate(0px, 0px)" },
					15: { transform: "translate(0px, -25px)" },
					30: { transform: "translate(0px ,0px)" },
					45: { transform: "translate(0px, -15px)" },
					60: { transform: "translate(0px, 0px)" },
					75: { transform: "translate(0px, -5px)" },
					100: { transform: "translate(0px, 0px)" }
				}
			},

			blink: {
				duration: 250,
				repeat: 1,
				keep: 100,
				keyFrames: {
					0: { opacity: 1.0 },
					50: { opacity: 0.0 },
					100: { opacity: 1.0 },
				}
			},

			tada: {
				duration: 1000,
				repeat: 1,
				keep: 100,
				keyFrames: {
					0: { transform: "rotate(0deg) scaleX(1.00) scaleY(1.00)" },
					10: { transform: "rotate(-3deg) scaleX(0.80) scaleY(0.80)" },
					20: { transform: "rotate(-3deg) scaleX(0.80) scaleY(0.80)" },
					30: { transform: "rotate(3deg) scaleX(1.20) scaleY(1.20)" },
					40: { transform: "rotate(-3deg) scaleX(1.20) scaleY(1.20)" },
					50: { transform: "rotate(3deg) scaleX(1.20) scaleY(1.20)" },
					60: { transform: "rotate(-3deg) scaleX(1.20) scaleY(1.20)" },
					70: { transform: "rotate(3deg) scaleX(1.20) scaleY(1.20)" },
					80: { transform: "rotate(-3deg) scaleX(1.20) scaleY(1.20)" },
					90: { transform: "rotate(3deg) scaleX(1.20) scaleY(1.20)" },
					100: { transform: "rotate(0deg) scaleX(1.00) scaleY(1.00)" }
				}
			},

			slideLeftIn: {
				duration: 350,
				timing: "linear",
				origin: "bottom center",
				keep: 100,
				keyFrames: {
					0: { transform: "translateX(-100%)" },
					100: { transform: "translateX(0%)" }
				}
			},

			slideRightIn: {
				duration: 350,
				timing: "linear",
				origin: "bottom center",
				keep: 100,
				keyFrames: {
					0: { transform: "translateX(100%)" },
					100: { transform: "translateX(0%)" }
				}
			},

			slideLeftOut: {
				duration: 350,
				timing: "linear",
				origin: "bottom center",
				keep: 0,
				keyFrames: {
					0: { transform: "translateX(0%)" },
					100: { transform: "translateX(-100%)" }
				}
			},

			slideRightOut: {
				duration: 350,
				timing: "linear",
				origin: "bottom center",
				keep: 0,
				keyFrames: {
					0: { transform: "translateX(0%)" },
					100: { transform: "translateX(100%)" }
				}
			},

			popIn: {
				duration: 350,
				timing: "linear",
				origin: "center",
				keep: 100,
				keyFrames: {
					0: { transform: "scale(.2, .2)" },
					100: { transform: "scale(1, 1)" }
				}
			},

			popOut: {
				duration: 350,
				timing: "linear",
				origin: "center",
				keep: 0,
				keyFrames: {
					0: { transform: "scale(1, 1)" },
					100: { transform: "scale(.2, .2)" }
				}
			},

			shrinkHeight: {
				duration: 400,
				timing: "linear",
				origin: "top center",
				keep: 0,
				keyFrames: {
					0: { transform: "scale(1, 1)",opacity: 1 },
					100: { transform: "scale(1, 0)", opacity: 0 }
				}
			},

			growHeight: {
				duration: 400,
				timing: "linear",
				origin: "top center",
				keep: 100,
				keyFrames: {
					0: { transform: "scale(1, 0)",opacity: 0 },
					100: { transform: "scale(1, 1)", opacity: 1 }
				}
			},

			shrinkWidth: {
				duration: 400,
				timing: "linear",
				origin: "left center",
				keep: 0,
				keyFrames: {
					0: { transform: "scale(1, 1)",opacity: 1 },
					100: { transform: "scale(0, 1)", opacity: 0 }
				}
			},

			growWidth: {
				duration: 400,
				timing: "linear",
				origin: "left center",
				keep: 100,
				keyFrames: {
					0: { transform: "scale(0, 1)",opacity: 0 },
					100: { transform: "scale(1, 1)", opacity: 1 }
				}
			},

			shrink: {
				duration: 400,
				timing: "linear",
				origin: "left top",
				keep: 0,
				keyFrames: {
					0: { transform: "scale(1, 1)",opacity: 1 },
					100: { transform: "scale(0, 0)", opacity: 0 }
				}
			},

			grow: {
				duration: 400,
				timing: "linear",
				origin: "left top",
				keep: 100,
				keyFrames: {
					0: { transform: "scale(0, 0)",opacity: 0 },
					100: { transform: "scale(1, 1)", opacity: 1 }
				}
			},

			slideUpIn: {
				duration: 350,
				timing: "linear",
				origin: "center",
				keep: 100,
				keyFrames: {
					0: { transform: "translateY(100%)" },
					100: { transform: "translateY(0%)" }
				}
			},

			slideUpOut: {
				duration: 350,
				timing: "linear",
				origin: "center",
				keep: 0,
				keyFrames: {
					0: { transform: "translateY(0%)" },
					100: { transform: "translateY(-100%)" }
				}
			},

			slideDownIn: {
				duration: 350,
				timing: "linear",
				origin: "center",
				keep: 100,
				keyFrames: {
					0: { transform: "translateY(-100%)" },
					100: { transform: "translateY(0%)" }
				}
			},

			slideDownOut: {
				duration: 350,
				timing: "linear",
				origin: "center",
				keep: 0,
				keyFrames: {
					0: { transform: "translateY(0%)" },
					100: { transform: "translateY(100%)" }
				}
			},
		}
	}
});
