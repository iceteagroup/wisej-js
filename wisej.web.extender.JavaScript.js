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
 * wisej.web.extender.JavaScript
 */
qx.Class.define("wisej.web.extender.JavaScript", {

	extend: qx.core.Object,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejComponent],

	properties: {

		/**
		 * Scripts collection.
		 *
		 * List of component IDs with corresponding javascript code blocks.
		 */
		scripts: { init: null, check: "Map", nullable: true, apply: "_applyScripts" }
	},

	members: {

		_applyScripts: function (value, old) {

			if (old != null && old.length > 0) {
				for (var i = 0; i < old.length; i++) {
					var comp = Wisej.Core.getComponent(value[i].id);
					if (comp) {
						// detach previous handlers.
						var events = old[i].events;
						if (events && events.length > 0) {
							for (var j = 0; j < events.length; j++) {
								var ev = events[j];
								if (ev.event && ev.javaShandlercript) {
									comp.removeListener(ev.event, ev.handler, comp);
								}
							}
						}
					}
				}
			}

			if (value != null && value.length > 0) {
				for (var i = 0; i < value.length; i++) {
					var comp = Wisej.Core.getComponent(value[i].id);
					if (comp) {

						var script = value[i].script;
						if (script > "") {
							// execute the script in a closure with this
							// set to the component.
							var func = new Function(script);
							func.call(comp);
						}

						// attach new handlers.
						var events = value[i].events;
						if (events && events.length > 0) {
							for (var j = 0; j < events.length; j++) {
								var ev = events[j];
								if (ev.event && ev.javaScript) {
									ev.handler = new Function("e",
										"//# sourceURL=" + comp.getName() + "("+comp.getId() + ").on" + qx.lang.String.firstUp(ev.event) +
										"\r\n\r\n" + ev.javaScript);

									comp.addListener(ev.event, ev.handler, comp);
								}
							}
						}
					}
				}
			}
		},
	}

});
