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
 * wisej.web.SplitContainer
 * 
 */
qx.Class.define("wisej.web.SplitContainer", {

	extend: qx.ui.splitpane.Pane,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MAccelerators
	],

	construct: function (orientation) {

		this.base(arguments, orientation);

		// the split container needs the controls in the
		// order they are declared:
		// the first to the left and the second to the right.
		this.setReverseControls(false);

		// ensure we have 2 widgets to show the splitter in design mode.
		if (wisej.web.DesignMode) {
			this.add(new qx.ui.core.Widget());
			this.add(new qx.ui.core.Widget());
		}
	},

	properties: {

		/**
		 * SplitterSize property.
		 */
		splitterSize: { init: 6, check: "Integer", apply: "_applySplitterSize" },

		/**
		 * SplitterPosition property.
		 *
		 * Property defined with the setter/getter methods.
		 */
		// splitterPosition: { init: 50, check: "Integer", apply: "_applySplitterPosition" },

		/**
		 * Panel1MinSize property.
		 */
		panel1MinSize: { init: 0, check: "Integer", apply: "_applyPanel1MinSize" },

		/**
		 * Panel2MinSize property.
		 */
		panel2MinSize: { init: 0, check: "Integer", apply: "_applyPanel2MinSize" },

		/**
		 * SplitterEnabled property.
		 *
		 * Enables or disables the splitter bar.
		 */
		splitterEnabled: { init: true, check: "Boolean", apply: "_applySplitterEnabled" }

	},

	members: {

		/**
		 * Wisej marker.
		 */
		isWisejContainer: true,

		// overridden
		add: function (widget, flex) {

			var children = this.getChildren();
			if (children.length >= 2) {
				this.destroyChildren();
			}

			this.base(arguments, widget, flex || 0);
		},

		/**
		 * Applies the splitterSize property.
		 */
		_applySplitterSize: function (value, old) {

			var splitter = this.getChildControl("splitter");

			if (value < 0) {
				splitter.syncAppearance();
				splitter.resetWidth();
				splitter.resetHeight();
			}
			else {
				if (this.__isHorizontal)
					splitter.setWidth(value);
				else
					splitter.setHeight(value);
			}
		},

		/**
		 * Applies the splitterPosition property.
		 */
		getSplitterPosition: function () {
			var first = this.getChildren()[0];
			var second = this.getChildren()[1];
			if (first != null && second != null) {
				if (this.__isHorizontal) {
					return first.getWidth();
				}
				else {
					return first.getHeight();
				}
			}
		},
		setSplitterPosition: function (value) {

			var first = this.getChildren()[0];
			var second = this.getChildren()[1];

			if (first != null && second != null) {

				// don't move the splitter position when either one of the
				// panels is not visible (collapsed without the header).
				if (!first.isVisible() || !second.isVisible())
					return;

				// don't move the splitter position when either one of the
				// panels is collapsed.
				if (first instanceof wisej.web.Panel && first.isCollapsed())
					return;
				if (second instanceof wisej.web.Panel && second.isCollapsed())
					return;

				var splitter = this.getChildControl("splitter");

				if (this.__isHorizontal) {
					first.setWidth(value);
					splitter.syncAppearance();
					second.setWidth(Math.max(0, this.getWidth() - splitter.getWidth() - value));
					if (second.isWisejComponent)
						second.updateState("width");
				}
				else {
					first.setHeight(value);
					splitter.syncAppearance();
					second.setHeight(Math.max(0, this.getHeight() - splitter.getHeight() - value));
					if (second.isWisejComponent)
						second.updateState("height");
				}
			}
		},

		/**
		 * Applies the splitterEnabled property.
		 */
		_applySplitterEnabled: function (value, old) {

			if (value) {
				this.removeState("fixed");
				this.getChildControl("splitter").removeState("fixed");
			}
			else {
				this.addState("fixed");
				this.getChildControl("splitter").addState("fixed");
			}
		},

		/**
		 * Applies the panel1MinSize property.
		 */
		_applyPanel1MinSize: function (value, old) {

			var first = this.getChildren()[0];
			if (first) {
				if (this.__isHorizontal)
					first.setMinWidth(value);
				else
					first.setMinHeight(value);
			}
		},

		/**
		 * Applies the panel2MinSize property.
		 */
		_applyPanel2MinSize: function (value, old) {

			var second = this.getChildren()[1];
			if (second) {
				if (this.__isHorizontal)
					second.setMinWidth(value);
				else
					second.setMinHeight(value);
			}
		},

		// overridden to notify the server of the
		// splitter position change and give the server
		// a chance to cancel or to update the layout.
		_onPointerUp: function (e) {

			this.base(arguments, e);

			// fire splitterMove(Position).
			if (this.__beginSize)
				this.fireDataEvent("splitterMove", this.__beginSize);
		},

		// overridden to stop dragging the splitter when it is disabled or
		// when one of the two panels is collapsed.
		_onPointerDown: function (e) {

			if (!this.isSplitterEnabled())
				return;

			var first = this.getChildren()[0];
			var second = this.getChildren()[1];
			if (first && first.getCollapsed && first.getCollapsed())
				return;
			if (second && second.getCollapsed && second.getCollapsed())
				return;

			this.base(arguments, e);
		}
	}

});
