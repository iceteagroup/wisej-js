///////////////////////////////////////////////////////////////////////////////
//
// (C) 2020 ICE TEA GROUP LLC - ALL RIGHTS RESERVED
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
 * wisej.web.manager.Accelerators
 * 
 * Manages all accelerator keys for Wisej widgets.
 */
qx.Class.define("wisej.web.manager.Accelerators", {

	type: "singleton",
	extend: qx.core.Object,

	construct: function () {

		qx.event.Registration.addListener(document.body, "keyup", this._onAcceleratorKey, this, true);
		qx.event.Registration.addListener(document.body, "keydown", this._onAcceleratorKey, this, true);
		qx.event.Registration.addListener(document.body, "keypress", this._onAcceleratorKey, this, true);

	},

	members: {

		__listeners: [],

		/**
		 * Registers the specified callback to the list of registered targets.
		 * 
		 * @param {String} accelerator Accelerator key or null to register all keys.
		 * @param {Function} callback Method to call when the user presses any key.
		 * @param {Object} target Target instance of the callback method.
		 * @param {String?} type Key event to register: "keydown", "keyup", "keypress".
		 */
		register: function (accelerator, callback, target, type) {

			type = type || "keydown";

			// add the listener.
			this.__listeners.push({
				type: type,
				target: target,
				key: accelerator,
				callback: callback
			});
		},

		/**
		 * Unregisters the specified callback from the list of registered targets.
		 * 
		 * @param {String} accelerator Accelerator key or null to register all keys.
		 * @param {Function} callback Method to call when the user presses the key.
		 * @param {Object} target Target instance of the callback method.
		 * @param {String?} type Key event to register: "keydown", "keyup", "keypress".
		 */
		unregister: function (accelerator, callback, target, type) {

			type = type || "keydown";

			// removes the last instance of the listener.
			var index = -1;
			var listener = null;
			for (var i = this.__listeners.length - 1; i > -1; i--) {

				listener = this.__listeners[i];

				if (listener.type === type &&
					listener.key === accelerator &&
					listener.callback === callback &&
					listener.target === target) {

					index = i;
					break;
				}
			}

			if (index > -1)
				this.__listeners.splice(index, 1);
		},

		/**
		 * Handles the event during the capture phase from the document body.
		 */
		_onAcceleratorKey: function (e) {

			var type = e.getType();

			// normalize the key.
			var key = this.__getKeyIdentifier(e);

			// create cloned event with correct target.
			var target = wisej.utils.Widget.findWisejComponent(e.getTarget());
			var widgetEvent = qx.event.Pool.getInstance().getObject(e.constructor);
			try {

				widgetEvent.init(
					e.getNativeEvent(),
					target,
					e.getKeyIdentifier());

				widgetEvent.setType(e.getType());

				// allow the target to pre-process the accelerator without having to register.
				if (target && target.processAccelerator instanceof Function) {
					if (target.processAccelerator(widgetEvent)) {
						return;
					}
				}

				// dispatch the accelerator to the target first.
				if (target) {

					for (var i = this.__listeners.length - 1; i > -1; i--) {

						var listener = this.__listeners[i];
						if (listener.type === type
							&& listener.target === target
							&& (listener.key === null || listener.key === key)) {

							// stop dispatching when an handler returns true.
							if (listener.callback.call(listener.target, widgetEvent) === true) {
								widgetEvent.stop();
								return;
							}
						}
					}
				}

				// dispatch the accelerator to the listeners that registered with target null.
				for (var i = this.__listeners.length - 1; i > -1; i--) {

					var listener = this.__listeners[i];

					if (listener.type === type
						&& listener.target === null
						&& (listener.key === null || listener.key === key)) {

						// stop dispatching when an handler returns true.
						if (listener.callback.call(listener.target, widgetEvent) === true) {
							widgetEvent.stop();
							return;
						}
					}
				}

				// dispatch the accelerator to the remaining listeners.
				for (var i = this.__listeners.length - 1; i > -1; i--) {

					var listener = this.__listeners[i];

					if (listener.type === type
						&& (listener.key === null || listener.key === key)
						&& (listener.target !== target && listener.target != null)) {

						// stop dispatching when an handler returns true.
						if (listener.callback.call(listener.target, widgetEvent) === true) {
							widgetEvent.stop();
							return;
						}
					}
				}
			}
			finally {

				// transfer the defaultPrevented flag.
				if (widgetEvent.getDefaultPrevented())
					e.preventDefault();
				// transfer the defaultPrevented flag.
				if (widgetEvent.getPropagationStopped())
					e.stopPropagation();

				// release the event instance to the event pool.
				qx.event.Pool.getInstance().poolObject(widgetEvent);
			}
		},

		// returns a normalized string representing the accelerator key.
		__getKeyIdentifier: function (e) {

			var parts = [];

			if (e.isCtrlPressed())
				parts.push("Ctrl");
			if (e.isAltPressed())
				parts.push("Alt");
			if (e.isShiftPressed())
				parts.push("Shift");
			if (e.isMetaPressed())
				parts.push("Meta");

			switch (e.getKeyCode()) {
				case 16: // shift key
				case 17: // control key
				case 18: // alt key
					break;

				default:
					parts.push(e.getKeyIdentifier());
					break;
			}

			return parts.join("+");
		}
	}

});