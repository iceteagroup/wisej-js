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

        qx.event.Registration.addListener(document.body, "keydown", this._onKeyDown, this, true);

    },

    members: {

        __listeners: [],

        /**
         * Registers the specified callback to the list of registered targets.
         * 
         * @param {String} accelerator Accelerator key or null to register all keys.
         * @param {Function} callback Method to call when the user presses any key.
         * @param {Object} target Target instance of the callback method.
         */
        register: function (accelerator, callback, target) {

            // add the listener.
            this.__listeners.push({
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
         */
        unregister: function (accelerator, callback, target) {

            // removes the last instance of the listener.
            var index = -1;
            var listener = null;
            for (var i = this.__listeners.length - 1; i > -1; i--) {

                listener = this.__listeners[i];

                if (listener.key === accelerator &&
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
         * Handles the "keydown" event during the capture phase
         * from the document body.
         */
        _onKeyDown: function (e) {

            // normalize the key.
            var key = this.__getKeyIdentifier(e);

            var index = -1;
            var component = wisej.utils.Widget.findWisejComponent(e.getTarget());

            // start from the component that had the focus.
            if (component) {
                index = this.__listeners.findIndex(function (item) {
                    return item.target == component;
                });
            }

            var listener = null;

            if (index > 0) {
                index--;
                for (var i = index; i > -1; i--) {

                    listener = this.__listeners[i];

                    if (listener.key == null || listener.key === key) {

                        // stop dispatching when an handler returns true.
                        if (listener.callback.call(listener.target, e) === true)
                            return;
                    }
                }
            }

            for (var i = this.__listeners.length - 1; i > index; i--) {

                listener = this.__listeners[i];

                if (listener.key === null || listener.key === key) {

                    // stop dispatching when an handler returns true.
                    if (listener.callback.call(listener.target, e) === true)
                        return;
                }
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
            }

            return parts.join("+");
        }
    }

});