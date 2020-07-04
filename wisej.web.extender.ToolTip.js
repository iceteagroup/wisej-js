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
 * wisej.web.extender.ToolTip
 */
qx.Class.define("wisej.web.extender.ToolTip", {

	extend: qx.core.Object,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejComponent],

	construct: function () {

		this.base(arguments);

		var tooltip = this.__getToolTip();
		tooltip.setRich(true);
	},

	properties: {

		/**
		 * Active property.
		 *
		 * Enables/disables the tooltips.
		 */
		active: { init: true, check: "Boolean", apply: "_applyActive" },

		/**
		 * Icon property.
		 *
		 * Indicates the default icon to show in the tooltip.
		 */
		icon: { init: null, check: "String", nullable: true, apply: "_applyIcon" },

		/**
		 * PopDelay property.
		 *
		 * Indicates the delay before the tooltip automatically disappears.
		 */
		popDelay: { init: 5000, check: "Integer", apply: "_applyPopDelay" },

		/**
		 * InitialDelay property.
		 *
		 * Indicates the delay before the tooltip appears.
		 */
		initialDelay: { init: 500, check: "Integer", apply: "_applyInitialDelay" },

		/**
		 * Tooltips collection.
		 *
		 * List of component IDs with the corresponding tooltip text.
		 */
		tooltips: { init: null, check: "Map", nullable: true, apply: "_applyTooltips" },

		/**
		 * Alignment property.
		 *
		 * Determine the position of the tooltip in relation to the opener widget.
		 */
		alignment: {
			init: null,
			check: [
				"topLeft", "topCenter", "topRight",
				"bottomLeft", "bottomCenter", "bottomRight",
				"leftTop", "leftMiddle", "leftBottom",
				"rightTop", "rightMiddle", "rightBottom"],
			nullable: true,
			apply: "_applyAlignment"
		},
	},

	members: {

		/** the tooltip icon name. */
		_tooltipIcon: null,

		_applyIcon: function (value, old) {

			var icon = null;
			switch(value)
			{
				case "none": icon = ""; break;
				case "default": icon: null; break;
				default: icon = "icon-" + value; break;
			}

			this._tooltipIcon = icon;

			// update all tooltips.
			this._applyTooltips(this.getTooltips());
		},

		_applyPopDelay: function (value, old) {
			this.__getToolTip().setHideTimeout(value);
		},

		_applyInitialDelay: function (value, old) {
			this.__getToolTip().setShowTimeout(value);
		},

		_applyActive: function (value, old) {

			var manager = qx.ui.tooltip.Manager.getInstance();
			manager.setShowToolTips(value);
		},

		_applyAlignment: function (value, old) {

			if (value == null)
				this.__getToolTip().resetPosition();
			else
				this.__getToolTip().setPosition(qx.lang.String.hyphenate(value));
		},

		_applyTooltips: function (value, old) {

			var manager = qx.ui.tooltip.Manager.getInstance();

			if (old != null && old.length > 0) {

				for (var i = 0; i < old.length; i++) {
					var target = this.__getToolTipTarget(old[i].id);
					if (target) {
						target.setToolTipText(null);
						target.setToolTipIcon(null);

						// update the live tooltip widget.
						var tooltip = target.getToolTip() || manager.getSharedTooltip();
						tooltip.setLabel(null);
						tooltip.setIcon(null);
					}
				}
			}

			if (value != null && value.length > 0) {
				for (var i = 0; i < value.length; i++) {
					var target = this.__getToolTipTarget(value[i].id);
					if (target) {
						target.setToolTipText(value[i].text);
						target.setToolTipIcon(this._tooltipIcon);

						// update the live tooltip widget.
						var tooltip = target.getToolTip() || manager.getSharedTooltip();
						tooltip.setLabel(value[i].text);
						tooltip.setIcon(this._tooltipIcon);
					}
				}
			}
		},

		
		// returns the current shared tooltip widget instance.
		__getToolTip: function () {

			var manager = qx.ui.tooltip.Manager.getInstance();
			return manager.getSharedTooltip();

		},

		// returns the widget that should be assigned the tooltip.
		__getToolTipTarget: function(id)
		{
			var target = Wisej.Core.getComponent(id);
			if (target && target.getToolTipTarget)
				target = target.getToolTipTarget();

			return target;
		},

		// ===================================================
		// Methods to manage the tooltip directly.
		// ===================================================

		/**
		 * Shows the tooltip at the location.
		 * 
		 * @param {Widget?} opener Optional opener widget.
		 * @param {String} text Text of the tooltip.
		 * @param {Map} location Location in screen (browser) coordinates.
		 */
		showTooltip: function (target, text, location) {

			var tooltip = this.__getToolTip();
			var manager = qx.ui.tooltip.Manager.getInstance();

			manager.setCurrent(null);

			tooltip.setLabel(text);
			tooltip.setIcon(this._tooltipIcon);

			// placement?
			if (target) {

				// retrieve the header widget if the opener is a column header.
				if (target instanceof wisej.web.datagrid.ColumnHeader)
					target = target.getHeaderWidget();
				// retrieve the TabPage button, if the opener is a TabPage.
				if (target instanceof qx.ui.tabview.Page)
					target = target.getButton();

				tooltip.setOpener(target);
				tooltip.resetPlaceMethod();
				tooltip.placeToWidget(target);
				manager.setCurrent(tooltip);
			}
			else {
				tooltip.setOpener(null);
				tooltip.setPlaceMethod("pointer");
				tooltip.placeToPoint({ left: location.x, top: location.y });
				manager.setCurrent(tooltip);
			}
		}

	}

});
