///////////////////////////////////////////////////////////////////////////////
//
// (C) 2015 ICE TEA GROUP LLC - ALL RIGHTS RESERVED
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
 * wisej.web.Accordion
 *
 * Displays collapsible set of wisej.web.accordion.Panel widgets 
 * for presenting information in a limited amount of space.
 */
qx.Class.define("wisej.web.Accordion", {

	extend: wisej.web.Control,

	include: [
		wisej.mixin.MBorderStyle,
	],

	construct: function () {

		this.base(arguments);
	},

	properties: {

		// overridden.
		appearance: { init: "accordion", refine: true },

		/**
		 * SelectedPanel property.
		 *
		 * Keeps track of the selected panel. It cannot change the selected panel.
		 */
		selectedPanel: { check: "wisej.web.accordion.Panel", transform: "_transformComponent" },

		/**
		 * IconSize Property.
		 *
		 * Standard size of the title bar icons. If left to null, the original image size is used.
		 */
		iconSize: { init: null, nullable: true, apply: "_applyIconSize", themeable: true },

		/**
		 * Enables or disables the tooltips on the title bars.
		 */
		showToolTips: { init: true, check: "Boolean", apply: "_applyShowToolTips" },

	},

	members: {

		/**
		 * Applies the iconSize property.
		 *
		 * Updates all the panels.
		 */
		_applyIconSize: function (value, old) {

			var panels = this.getChildren();
			for (var i = 0 ; i < panels.length; i++)
				panels[i].setIconSize(value);
		},

		/**
		 * Applies the showToolTips property.
		 */
		_applyShowToolTips: function (value, old) {

			// block/unblock tooltips on all child panels.
			var block = !value;
			var panels = this.getChildren();
			for (var i = 0 ; i < panels.length; i++)
				panels[i].getChildControl("captionbar").setBlockToolTip(block);
		},

		// overridden.
		_afterAddChild: function (child) {

			if (qx.core.Environment.get("qx.debug")) {
				if (!(child instanceof wisej.web.accordion.Panel)) {
					throw new Error("Incompatible child for Accordion: " + child);
				}
			}

			child.setIconSize(this.getIconSize());

			this.base(arguments, child);
		},

	}
});


/**
 * wisej.web.accordion.Panel
 *
 * Displays a collapsible panel inside the wisej.web.Accordion widget.
 */
qx.Class.define("wisej.web.accordion.Panel", {

	extend: wisej.web.ScrollableControl,

	construct: function () {

		this.base(arguments);

		this.initCaption();

		// restrict the state properties and state events.
		this.setStateProperties(["visible", "enabled"]);
		this.setStateEvents(["changeVisibility", "changeEnabled"]);

		// add the horizontal state since the theme appearance will inherit from "panel".
		this.addState("horizontal");
	},

	properties: {

		// overridden.
		appearance: { init: "$parent/panel", refine: true },

		/**
		 * Caption property
		 *
		 * Sets the text to show in the caption of the panel.
		 */
		caption: { init: "", check: "String", apply: "_applyCaption", nullable: true },

		/** 
		 * Icon property.
		 *
		 * Any URI String supported by qx.ui.basic.Image to display an icon in Panel's title bar.
		 */
		icon: { init: "", check: "String", apply: "_applyIcon", nullable: true },

		/**
		 * IconSize Property.
		 *
		 * Standard size of the title bar icons. If left to null, the original image size is used.
		 */
		iconSize: { init: null, nullable: true, apply: "_applyIconSize", themeable: true },

		/**
		 * CaptionAlignment property.
		 *
		 * Sets the alignment of the caption bar.
		 */
		captionAlignment: { init: "left", check: ["left", "center", "right"], apply: "_applyCaptionAlignment" },

		/**
		 * ShowExpandButton property.
		 *
		 * Shows or hides the expand button in the caption.
		 */
		ShowExpandButton: { init: true, check: "Boolean", apply: "_applyShowExpandButton" },

		/**
		 * HeaderBackgroundColor property.
		 *
		 * Changes the background color of the caption bar.
		 */
		headerBackgroundColor: { init: null, check: "Color", apply: "_applyHeaderBackgroundColor" },

		/**
		 * HeaderTextColor property.
		 *
		 * Changes the text color of the caption bar.
		 */
		headerTextColor: { init: null, check: "Color", apply: "_applyHeaderTextColor" },

		/**
		 * Collapsed property.
		 *
		 * Adds or removes the collapsed state.
		 */
		collapsed: { init: false, check: "Boolean", apply: "_applyCollapsed" },

		/**
		 * Tools property.
		 *
		 * Collection of tool definitions to display on the caption bar.
		 */
		tools: { check: "Array", apply: "_applyTools" },

	},

	members: {

		// overridden: forwarded states.
		_forwardStates: {
			horizontal: true,
			collapsed: true,
		},

		// overridden. applies the tooltip text to  the caption.
		_applyToolTipText: function (value, old) {

			this.getChildControl("captionbar").setToolTipText(value);

		},

		/**
		 * Applies the icon property.
		 */
		_applyIcon: function (value, old) {

			this.getChildControl("icon").setSource(value);
			this._handleIcon();
		},

		/**
		 * Applies the iconSize property.
		 */
		_applyIconSize: function (value, old) {

			var size = value;
			var icon = this.getChildControl("icon", true);
			if (!icon)
				return;

			if (!size) {
				icon.resetWidth();
				icon.resetHeight();
				icon.resetMinWidth();
				icon.resetMinHeight();
				return;
			}

			var width = size.width;
			var height = size.height;
			icon.setWidth(width);
			icon.setHeight(height);
			icon.setMinWidth(width);
			icon.setMinHeight(height);
		},

		/**
		 * Updates the visibility of the icon
		 */
		_handleIcon: function () {

			if (!this.getIcon()) {
				this._excludeChildControl("icon");
			} else {
				this._showChildControl("icon");
				this._applyIconSize(this.getIconSize());
			}
		},

		/**
		 * Applies the caption property.
		 */
		_applyCaption: function (value, old) {

			this.getChildControl("title").setValue(value);
			this._handleCaption();
		},

		/**
		 * Updates the visibility of the caption.
		 */
		_handleCaption: function () {

			if (!this.getCaption()) {
				this._excludeChildControl("title");
			} else {
				this._showChildControl("title");
			}
		},

		/**
		 * Applies the captionAlignment property.
		 */
		_applyCaptionAlignment: function (value, old) {

			this.getChildControl("title").setAlignX(value);
		},

		/**
		 * Applies the showExpandButton property.
		 */
		_applyShowExpandButton: function (value, old) {

			var button = this.getChildControl("open-button");

			value
				? button.show()
				: button.exclude();
		},

		/**
		 * Applies the collapsed property.
		 */
		_applyCollapsed: function (value, old) {

			value
				? this.addState("collapsed")
				: this.removeState("collapsed");
		},

		/** 
		 * Applies the tools property.
		 */
		_applyTools: function (value, old) {

			if (value == null)
				return;

			if (value.length == 0 && (old == null || old.length == 0))
				return;

			var captionBar = this.getChildControl("captionbar");
			wisej.web.ToolContainer.install(this, captionBar, value, "left", { row: 0, column: 1 });
			wisej.web.ToolContainer.install(this, captionBar, value, "right", { row: 0, column: 3 });
		},

		/**
		 * Applies the headerBackgroundColor property.
		 */
		_applyHeaderBackgroundColor: function (value, old) {

			this.getChildControl("captionbar").setBackgroundColor(value);
		},

		/**
		 * Applies the headerTextColor property.
		 */
		_applyHeaderTextColor: function (value, old) {

			this.getChildControl("captionbar").setTextColor(value);
		},

		/**
		 * Overridden to create the caption bar.
		 */
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "icon":
					control = new qx.ui.basic.Image(this.getIcon()).set({
						anonymous: true,
						alignY: "middle",
						scale: true,
					});
					if (!this.getIcon()) {
						control.exclude();
					}
					this.getChildControl("captionbar").add(control, { row: 0, column: 0 });
					break;

				case "captionbar":
					var layout = new qx.ui.layout.Grid();
					layout.setRowFlex(0, 1);
					layout.setColumnFlex(2, 1);
					control = new qx.ui.container.Composite(layout);
					control.addListener("tap", this.__expandPanel, this);
					// hovered event handlers.
					control.addListener("pointerover", this.__onPointerOver);
					control.addListener("pointerout", this.__onPointerOut);

					this._add(control, { edge: "north" });
					break;

				case "title":
					control = new qx.ui.basic.Label(this.getCaption()).set({
						anonymous: true,
						alignY: "middle",
						allowGrowX: true
					});
					this.getChildControl("captionbar").add(control, { row: 0, column: 2 });
					if (!this.getCaption()) {
						control.exclude();
					}
					break;

				case "open-button":
					control = new qx.ui.form.Button().set({
						focusable: false,
						allowGrowX: false,
						allowGrowY: false
					});
					control.addListener("execute", this.__expandPanel, this);
					this.getChildControl("captionbar").add(control, { row: 0, column: 4 });
					break;
			}

			return control || this.base(arguments, id);
		},

		__expandPanel: function (e) {

			if (this.isCollapsed())
				this.fireEvent("expand");
			else
				this.fireEvent("collapse");
		},

		/**
		 * Event handler for the pointer over event.
		 */
		__onPointerOver: function (e) {

			this.addState("hovered");
		},

		/**
		 * Event handler for the pointer out event.
		 */
		__onPointerOut: function (e) {

			this.removeState("hovered");
		},

	}
});