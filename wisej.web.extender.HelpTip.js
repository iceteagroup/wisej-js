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
 * wisej.web.extender.HelpTip
 *
 * Extends wisej widgets by displaying an information popup next
 * to the active widget. It's similar to a tooltip with the difference that it is
 * displayed on active widgets and it doesn't wait to popup.
 *
 * Multiple helptips can be displayed by creating multiple instances of the extender.
 */
qx.Class.define("wisej.web.extender.HelpTip", {

	extend: qx.core.Object,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejComponent],

	construct: function () {

		this.base(arguments);

		this.__helptipByComponentId = {};

	},

	properties: {

		/**
		 * Active property.
		 *
		 * Enables/disables the helptips.
		 */
		active: { init: true, check: "Boolean", apply: "_applyActive" },

		/**
		 * Icon property.
		 *
		 * Indicates the default icon to show in the helptips.
		 */
		icon: { init: null, check: "String", apply: "_applyIcon", nullable: true },

		/**
		 * PopDelay property.
		 *
		 * Indicates the delay before the helptips automatically disappears.
		 */
		popDelay: { init: 0, check: "PositiveInteger" },

		/**
		 * InitialDelay property.
		 *
		 * Indicates the delay before the helptips appears.
		 */
		initialDelay: { init: 0, check: "PositiveInteger" },

		/**
		 * Alignment property.
		 *
		 * Sets the position of the helptip widget in relation to the target widget.
		 */
		alignment: {
			init: "rightMiddle",
			check: [
			"topLeft", "topCenter", "topRight",
			"bottomLeft", "bottomCenter", "bottomRight",
			"leftTop", "leftMiddle", "leftBottom",
			"rightTop", "rightMiddle", "rightBottom"],
			apply: "_applyAlignment",
			themeable: true
		},

		/**
		 * Helptips collection.
		 *
		 * List of component IDs with the corresponding tooltip text.
		 */
		helptips: { init: null, check: "Map", nullable: true, apply: "_applyHelpTips" },

		/**
		 * TextColor property.
		 *
		 * Defines the text color for the helptip.
		 */
		textColor: { init: null, check: "Color", apply: "_applyTextColor", themeable: true },

		/**
		 * BackgroundColor property.
		 *
		 * Defines the text color for the helptip.
		 */
		backgroundColor: { init: null, check: "Color", apply: "_applyBackgroundColor", themeable: true },
	},

	statics: {

		// fadeIn/fadeOut timing.
		FADE_DURATION: 300,

	},

	members: {

		// the single helptip widget managed by this extender.
		__helptip: null,

		// helptip map, connects the component to the text.
		__helptipByComponentId: null,

		// timers.
		__showTimer: 0,
		__closeTimer: 0,

		// loads all the helptips.
		_applyHelpTips: function (value, old) {

			if (old != null && old.length > 0) {
				for (var i = 0; i < old.length; i++) {

					var id = old[i].id;

					// skip if the component is also in the new values.
					if (value != null) {
						var skip = false;
						for (var j = 0; j < value.length; j++) {
							if (value[j].id == id) {
								skip = true;
								break;
							}
						}
						if (skip)
							continue;
					}

					var comp = Wisej.Core.getComponent(id);
					delete this.__helptipByComponentId[id];
					if (comp) {
						comp.removeListener("activate", this.__onComponentActivate, this);
						comp.removeListener("disappear", this.__onComponentDeactivate, this);
						comp.removeListener("deactivate", this.__onComponentDeactivate, this);
						comp.removeListener("changeEnabled", this.__onComponentDeactivate, this);
					}
				}
			}

			if (value != null && value.length > 0) {

				for (var i = 0; i < value.length; i++) {

					var id = value[i].id;

					// make sure the handlers are attached only once.
					if (this.__helptipByComponentId[id])
						continue;

					var comp = Wisej.Core.getComponent(id);
					if (comp) {
						this.__helptipByComponentId[id] = value[i].text;
						comp.addListener("activate", this.__onComponentActivate, this);
						comp.addListener("disappear", this.__onComponentDeactivate, this);
						comp.addListener("deactivate", this.__onComponentDeactivate, this);
						comp.addListener("changeEnabled", this.__onComponentDeactivate, this);
					}
				}
			}
		},

		/**
		 * Applies the Active property.
		 */
		_applyActive: function (value, old) {

			if (!value)
				this.hideHelpTip();
		},

		/**
		 * Applies the Alignment property.
		 */
		_applyAlignment: function (value, old) {

			var helptip = this.__helptip;
			if (!helptip)
				return;

			helptip.setPosition(qx.lang.String.hyphenate(value));
		},

		/**
		 * Applies the Icon property.
		 */
		_applyIcon: function (value, old) {

			var helptip = this.__helptip;
			if (!helptip)
				return;

			var icon = value;
			helptip.setShow(icon == "none" ? "label" : "both");
			if (icon == null || icon == "default")
				helptip.resetIcon();
			else if (icon != "none")
				helptip.setIcon("icon-" + icon);
		},

		/**
		 * Applies the TextColor property.
		 */
		_applyTextColor: function (value, old) {
			var helptip = this.__helptip;
			if (!helptip)
				return;

			helptip.setTextColor(value);
		},

		/**
		 * Applies the BackgroundColor property.
		 */
		_applyBackgroundColor: function (value, old) {
			var helptip = this.__helptip;
			if (!helptip)
				return;

			helptip.setBackgroundColor(value);
		},

		// shows the helptip associated with the component when it gets activated.
		__onComponentActivate: function (e) {

			// hide the shared helptip widget.
			this.hideHelpTip();

			// find the associated helptip.
			var comp = e.getCurrentTarget();
			if (comp && comp.isWisejComponent) {
				var text = this.__helptipByComponentId[comp.getId()];
				if (text)
					this.showHelpTip(comp, text);
			}
		},

		// hides the helptip when the component is deactivated.
		__onComponentDeactivate: function (e) {

			this.hideHelpTip();
		},

		// hides the shared helptip widget.
		hideHelpTip: function () {

			var helptip = this.__helptip;
			if (!helptip)
				return;

			// stop the timers.
			if (this.__showTimer > 0) {
				clearTimeout(this.__showTimer);
				this.__showTimer = 0;
			}
			if (this.__closeTimer > 0) {
				clearTimeout(this.__closeTimer);
				this.__closeTimer = 0;
			}

			helptip.exclude();
		},

		// shows the shared helptip next to the widget.
		showHelpTip: function (widget, text) {

			if (!this.isActive())
				return;

			// stop the close timer.
			if (this.__closeTimer > 0) {
				clearTimeout(this.__closeTimer);
				this.__closeTimer = 0;
			}

			var helptip = this.getHelpTip();

			// update the helptip text and place next to the target widget.
			helptip.setLabel(text);
			helptip.placeToWidget(widget, true);

			// stop the close timer.
			if (this.__closeTimer > 0) {
				clearTimeout(this.__closeTimer);
				this.__closeTimer = 0;
			}

			// already waiting to be shown?
			if (this.__showTimer > 0)
				return;

			if (this.getInitialDelay() <= 0) {

				helptip.show();
				this.__startAutoPop();
			}
			else {
				var me = this;
				this.__showTimer = setTimeout(function () {

					me.__showTimer = 0;
					helptip.show();
					me.__startAutoPop();

				}, this.getInitialDelay());
			}
		},

		// start the close timer.
		__startAutoPop: function () {

			if (this.getPopDelay() > 100) {

				var me = this;
				var helptip = this.getHelpTip();
				this.__closeTimer = setTimeout(function () {

					me.__closeTimer = 0;
					helptip.exclude();

				}, this.getPopDelay());
			}
		},

		getHelpTip: function () {

			if (this.__helptip == null) {

				this.__helptip = new wisej.web.extender.helpTip.Popup().set({
					rich: true,
					visibility: "excluded",
					placementModeX: "best-fit",
					placementModeY: "best-fit",
					textColor: this.getTextColor(),
					backgroundColor: this.getBackgroundColor(),
					position: qx.lang.String.hyphenate(this.getAlignment()),
					zIndex: 900000
				});

				this._applyIcon(this.getIcon());

				qx.core.Init.getApplication().getRoot().add(this.__helptip);
			}

			return this.__helptip;
		}
	},

	destruct: function () {

		// stop the timers.
		if (this.__showTimer > 0) {
			clearTimeout(this.__showTimer);
			this.__showTimer = 0;
		}
		if (this.__closeTimer > 0) {
			clearTimeout(this.__closeTimer);
			this.__closeTimer = 0;
		}

		if (this.__helptip != null)
			this.__helptip.destroy();

		this.__helptip = null;
		this.__helptipByComponentId = {};
	}

});


/**
 * wisej.web.extender.helpTip.Popup
 *
 * Shows the helptip text next to the active widget.
 */
qx.Class.define("wisej.web.extender.helpTip.Popup", {

	extend: qx.ui.basic.Atom,
	include: qx.ui.core.MPlacement,

	properties: {

		appearance: { init: "helptip", refine: true }
	}

});
