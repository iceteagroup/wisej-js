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
 * wisej.web.GroupBox
 */
qx.Class.define("wisej.web.GroupBox", {

	extend: qx.ui.groupbox.CheckGroupBox,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejControl, wisej.mixin.MShortcutTarget],

	properties: {

		/**
		 * Appearance key.
		 */
		appearance: { init: "groupbox", refine: true },

		/**
		 * Checked state.
		 */
		checked: { init: true, check: "Boolean", apply: "_applyChecked" },

		/**
		 * ShowCheckBox property.
		 */
		showCheckBox: { init: false, check: "Boolean", apply: "_applyShowCheckBox" },

		/**
		 * label property.
		 *
		 * Substitutes the label.
		 */
		label: { init: "", check: "String", apply: "_applyLabel" },

		/**
		 * labelBackgroundColor property.
		 * 
		 * Sets the background color of the label.
		 */
		labelBackgroundColor: { init: null, check: "Color", apply: "_applylabelBackgroundColor", themeable: true },

		/**
		 * labelTextColor property.
		 * 
		 * Sets the text color of the label.
		 */
		labelTextColor: { init: null, check: "Color", apply: "_applylabelTextColor", themeable: true },

		/**
		 * Collapsed property.
		 *
		 * Collapses or expands the groupbox. When the groupbox is collapsed only the label is visible.
		 */
		collapsed: { init: false, check: "Boolean", apply: "_applyCollapsed" },

		/**
		 * ShowCloseButton property.
		 *
		 * Shows or hides the close button next to the label.
		 */
		showCloseButton: { init: false, check: "Boolean", apply: "_applyShowCloseButton" },

	},

	construct: function () {

		this.base(arguments);

		this.initShowCheckBox();
		this.setPadding(0, 0, 0, 0);
		this.setBackgroundColor(null);
		this.setLayout(new qx.ui.layout.Canvas());
	},

	members: {

		// overridden.
		_forwardStates: {
			invalid: true,
			collapsed: true
		},

		/**
		 * Sets the focus to the first child control in the groupbox.
		 */
		executeMnemonic: function () {

			if (!this.isEnabled() || !this.isVisible())
				return false;

			// skip if it already contains the focus.
			var handler = qx.ui.core.FocusHandler.getInstance();
			var focused = handler.getFocusedWidget();
			if (focused && qx.ui.core.Widget.contains(this, focused))
				return false;

			// find the first focusable child.
			var target = this.__findFocusableChild(this);
			if (target) {
				target.focus();
				return true;
			}

			return false;
		},

		/**
		 * Returns the widget to use as a target for the
		 * wisej.web.extender.ToolTip extender.
		 */
		getToolTipTarget: function () {
			return this.getChildControl("legend");
		},

		// return the first focusable child in the container.
		__findFocusableChild: function (container) {

			if (!container || !container.getChildren)
				return null;

			var target = null;
			var children = container.getChildren();
			if (children && children.length > 0) {
				for (var i = 0; i < children.length; i++) {

					var child = children[i];
					if (!child || child.isAnonymous())
						continue;

					// go deep.
					target = this.__findFocusableChild(child);
					if (target)
						break;

					if (!child.isFocusable())
						continue;

					target = child;
					break;
				}
			}

			return target;
		},

		/**
		 * Applies the checked property.
		 */
		_applyChecked: function (value, old) {

			if (value == old)
				return;

			var legend = this.getChildControl("legend");
			legend.setValue(value);

			this._enableChildren(value);
		},

		/**
		 * Applies the collapsed property.
		 */
		_applyCollapsed: function (value, old) {

			if (value == old)
				return;

			var container = this.getChildControl("container");

			if (value) {

				if (!wisej.web.DesignMode)
					container.exclude();

				this.addState("collapsed");
				this.fireEvent("collapse");
			}
			else {
				container.show();
				this.removeState("collapsed");
				this.fireEvent("expand");
			}
		},

		/**
		 * Applies the showCloseButton property.
		 */
		_applyShowCloseButton: function (value, old) {

			var button = this.getChildControl("close-button");

			value
				? button.show()
				: button.exclude();

		},

		// overridden.
		_applyBackgroundColor: function (value, old) {

			this.base(arguments, value, old);

			if (value && value.toLowerCase() === "transparent")
				value = null;

			this.getChildControl("legend").setBackgroundColor(value);
		},

		/**
		 * Applies the label property.
		 */
		_applyLabel: function (value, old) {

			this.setLegend(value);

		},

		/**
		 * Applies the labelBackgroundColor property.
		 */
		_applylabelBackgroundColor: function (value, old) {

			this.getChildControl("legend").setBackgroundColor(value);
		},

		/**
		 * Applies the labelTextColor property.
		 */
		_applylabelTextColor: function (value, old) {

			this.getChildControl("legend").setTextColor(value);
		},

		/**
		  * Sets the label of the legend sub widget if the given string is
		  * valid. Otherwise the legend sub widget get not displayed.
		  *
		  * @param legend {String} new label of the legend sub widget
		  */
		setLegend: function (legend) {
			var control = this.getChildControl("legend");

			if (legend) {
				control.setLabel(legend);
				control.show();
			}
			else {
				control.exclude();
			}
		},

		/**
		 * Applies the showCheckBox property.
		 *
		 * Shows/hides the icon in the legend widget.
		 */
		_applyShowCheckBox: function (value, old) {

			var legend = this.getChildControl("legend");
			legend.setShow(value ? "both" : "label");

			legend.removeListener("changeValue", this._onRadioChangeValue, this);
			legend.removeListener("execute", this._onExecute, this);

			if (value) {
				legend.addListener("changeValue", this._onRadioChangeValue, this);
				legend.addListener("execute", this._onExecute, this);
			}
		},

		/**
		 * Handles clicks on the close button.
		 */
		__onCloseButtonClick: function (e) {

			this.toggleCollapsed();

		},

		/**
		 * Enables/Disabled the child control of the group box.
		 */
		_enableChildren: function (value) {

			var enabled = (value === true);
			var container = this.getChildrenContainer();

			if (container) {
				container.setEnabled(enabled);

				var children = container.getChildren();
				if (children != null && children.length > 0) {
					for (var i = 0; i < children.length; i++) {

						var child = children[i];
						if (child.isWisejControl)
							child.setEnabled(enabled);
					}
				}
			}
		},

		// overridden
		_onRadioChangeValue: function (e) {

			if (!this.getShowCheckBox())
				return;

			var checked = e.getData() ? true : false;

			// enable/disable children
			this._enableChildren(checked);

			this.fireDataEvent("changeValue", checked, e.getOldData());
		},

		// overridden
		_repositionFrame: function () {

			var legend = this.getChildControl("legend");
			var frame = this.getChildControl("frame");

			// get the current height of the legend.
			var bounds = legend.getBounds();
			var height = bounds ? bounds.height : 0;

			// position the frame to overlap the legend in the middle.
			frame.setLayoutProperties({ "top": Math.round((height / 2)) });
		},

		/**
		   * The children container needed by the {@link qx.ui.core.MRemoteChildrenHandling}
		   * mixin
		   *
		   * @return {qx.ui.container.Composite} pane sub widget
		   */
		getChildrenContainer: function () {

			return this.getChildControl("container");

		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "container":
					control = new qx.ui.container.Composite();
					this._add(control, { left: 0, top: 0, right: 0, bottom: 0 });
					break;

				case "frame":
					control = new qx.ui.container.Composite();
					this._add(control, { left: 0, top: 0, right: 0, bottom: 0 });
					this._createChildControl("container");
					break;

				case "legend":
					control = new qx.ui.form.CheckBox().set({
						rich: true,
						value: true,
						focusable: false,
						show: this.getShowCheckBox() ? "both" : "label"
					});
					control.addListener("resize", this._repositionFrame, this);
					control.addListener("changeVisibility", this._repositionFrame, this);
					this._add(control);
					break;

				case "close-button":
					control = new qx.ui.form.Button().set({
						focusable: false,
						allowGrowX: false,
						allowGrowY: false
					});
					control.addListener("execute", this.__onCloseButtonClick, this);
					this._add(control, { top: 0, right: 0 });
					break;

			}

			return control || this.base(arguments, id);
		}

	}

});
