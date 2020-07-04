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
 * wisej.web.ToolContainer
 *
 * This is the panel that contains the little
 * tool buttons that can be associated to many Wisej controls.
 * 
 */
qx.Class.define("wisej.web.ToolContainer", {

	extend: qx.ui.container.Composite,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejComponent],

	construct: function (target) {

		this.base(arguments, new qx.ui.layout.HBox());

		this.__tools = {};
		this.__target = target;

		this.addState("horizontal");

		// hook the appear event to perform the initial rotation.
		this.addListenerOnce("appear", this.__onToolsAppear);
	},

	properties: {

		/**
		 * Appearance key.
		 */
		appearance: { init: "toolcontainer", refine: true },

		/*
		 * Tools property.
		 *
		 * Gets or sets the collection of child tool definitions.
		 * This collection is an array of definition configurations, not widgets.
		 */
		tools: { check: "Array", apply: "_applyTools" },

		/**
		 * Position property.
		 *
		 * Sets the position of the tool container.
		 */
		position: { init: "top", check: ["top", "left", "right", "bottom"], apply: "_applyPosition" },

		/**
		 * CustomState property.
		 *
		 * Defines an additional custom state that is assigned by the widget that hosts this
		 * ToolContainer to allow for the theme to customize the appearance of the ToolContainer
		 * depending on the hosting widget.
		 */
		customState: { init: null, check: "String", apply: "_applyCustomState", nullable: true },

	},

	statics: {

		/**
		 * Adds the {wisej.web.toolContainer.ToolPanel} to the host widget and adjusts the
		 * host to make enough room to show the ToolContainer.
		 * 
		 * @param host {wisej.web.toolContainer.IToolPanelHost} Widget that hosts the ToolPanel.
		 * @param toolPanel {wisej.web.toolContainer.ToolPanel} ToolPanel to add to the @host.
		 */
		add: function (host, toolPanel) {

			if (host !== toolPanel.getLayoutParent()) {

				host._add(toolPanel);

				if (!toolPanel.hasListener("resize", this._onToolPanelResize, this))
					toolPanel.addListener("resize", this._onToolPanelResize, this);
			}

			host.updateToolPanelLayout(toolPanel);
		},

		_onToolPanelResize: function (e) {

			var toolPanel = e.getTarget();
			var host = toolPanel.getLayoutParent();
			host.updateToolPanelLayout(toolPanel);
		},

		/**
		 * Creates a new instance of wisej.web.ToolContainer and adds it
		 * to the owner widget at the specified location.
		 *
		 * The container is populated with the tools that match the specified position.
		 *
		 * @param target {Widget} the target for the toolClick event.
		 * @param widget {Widget} the container for the tools container.
		 * @param tools {Array} collection of tool widgets.
		 * @param alignment {String} the alignment to match with the tool's position.
		 * @param layoutProperties {Map} the layout properties to apply to the tool container.
		 * @param position {String} the optional initial position of the tool container.
		 * @param state {String} the optional additional state to add to the tool container.
		 */
		install: function (target, widget, tools, alignment, layoutProperties, position, state) {

			position = position || "top";
			var containerName = "__" + alignment + "ToolsContainer";

			// find the existing container.
			var container = target[containerName];

			// iterate the tool list and select only  the tools
			// with a matching position.
			var toAdd = [];
			for (var i = 0 ; i < tools.length; i++) {

				var tool = tools[i];
				if (tool.position == alignment)
					toAdd.push(tool);
			}

			// if we have something to add, populate the container and add it to the widget.
			if (toAdd.length > 0) {
				// create the container if it didn't exist.
				if (container == null) {
					container = new wisej.web.ToolContainer(target).set({
						allowGrowX: true,
						allowGrowY: true,
						alignX: "center",
						alignY: "middle",
						customState: (state || null)
					});

					container.setTools(toAdd);
					container.setPosition(position);

					// add the "left" or "right" state.
					container.addState(alignment);

					target[containerName] = container;

					if (layoutProperties.index != null) {
						widget._addAt(container, layoutProperties.index);
					}
					else {
						widget._add(container, layoutProperties);
					}

					// subscribe to focus events to auto hide/show autoHide tools.
					target.addListener("focusin", container._onFocusIn, container);
					target.addListener("focusout", container._onFocusOut, container);

				} else {

					container.setTools(toAdd);
					container.setPosition(position);
				}
			}

			return container;
		},
	},

	members: {

		// tools map.
		__tools: null,

		// the toolClick event target.
		__target: null,

		/*
		 * Applies the tools property.
		 *
		 * Refresh the child tools collection.
		 */
		_applyTools: function (value, old) {

			// clear all children first.
			this.removeAll();

			// iterate the tool definition array and:
			//
			//	- retrieve existing tool widgets
			//	- or create new widgets.
			//
			var widgets = [];
			if (value != null && value.length > 0) {

				for (var i = 0; i < value.length; i++) {

					var config = value[i];

					// exists?
					var widget = this.__tools[config.id];

					if (widget == null) {

						// nope, create a new one.
						widget = this._transformComponent(config);
						widget.addListener("execute", this.__onToolWidgetExecute, this);
					}
					else {
						// if it already exists, update the properties.
						delete config.id;
						delete config.className;
						widget.set(config);
					}

					if (widget) {
						widgets.push(widget);
					}
				}
			}

			// destroy the existing widgets that are missing from the new tool list.
			for (var id in this.__tools) {
				var widget = this.__tools[id];
				if (widget && widgets.indexOf(widget) == -1)
					widget.destroy();
			}

			// add the new tool widgets to the container.
			var count = 0;
			this.__tools = {};
			for (var i = 0; i < widgets.length; i++) {
				var widget = widgets[i];

				this.add(widget);
				this.__tools[widget.getId()] = widget;

				// count the visible widgets.
				count += widget.isVisible() ? 1 : 0;
			}

			this.__updateState();

			// hide or show the container when it's empty.
			if (count == 0)
				this.exclude();
			else
				this.show();
		},

		/**
		 * Applies the cutomState property.
		 *
		 * It must be set before any child tool is created.
		 */
		_applyCustomState: function (value, old) {

			if (old) {
				this.removeState(old);

				var widgets = this.getChildren();
				for (var i = 0; i < widgets.length; i++) {
					var w = widgets[i];
					w.removeState(old);
					delete w._forwardStates[old];
				}
			}

			if (value) {
				this.addState(value);

				var widgets = this.getChildren();
				for (var i = 0; i < widgets.length; i++) {
					var w = widgets[i];
					w._forwardStates[value] = true;
					w.addState(value);
				}
			}
		},

		/**
		 * Shows the auto hide tools when the container widget gains the focus.
		 */
		_onFocusIn: function (e) {

			var visible = 0;
			for (var id in this.__tools) {
				var widget = this.__tools[id];
				if (widget && widget.isAutoHide()) {
					widget.show();
				}
				visible += widget.isVisible() ? 1 : 0;
			}
			if (visible > 0)
				this.show();
			else
				this.exclude();
		},

		/**
		 * Hides the auto hide tools when the container widget loses the focus.
		 */
		_onFocusOut: function (e) {

			var visible = 0;
			for (var id in this.__tools) {
				var widget = this.__tools[id];
				if (widget && widget.isAutoHide()) {
					widget.exclude();
				}
				visible += widget.isVisible() ? 1 : 0;
			}
			if (visible > 0)
				this.show();
			else
				this.exclude();
		},

		/**
		 * Fires toolClick on the owner of the wisej.web.ToolContainer.
		 */
		__onToolWidgetExecute: function (e) {

			var target = this.__target;
			if (target != null) {
				if (target.isFocusable() && !target.hasState("focused"))
					target.focus();

				var tool = e.getTarget();
				target.fireDataEvent("toolClick", tool.getId());
			}
		},

		__onToolsAppear: function (e) {

			// schedule the layout update.
			qx.ui.core.queue.Widget.add(this, "layout");

		},

		/**
		 * Button Rotation
		 */
		syncWidget: function (jobs) {

			if (!jobs || !jobs["layout"])
				return;

			this.__updateLayout();

		},

		/**
		 * Applies the position property.
		 *
		 * Change the layout to VBox when vertical and propagate the "vertical" or "horizontal" state.
		 */
		_applyPosition: function (value, old) {

			if (value == old)
				return;

			this.__updateState();

			// schedule the layout update.
			qx.ui.core.queue.Widget.add(this, "layout");
		},

		__updateLayout: function () {

			var position = this.getPosition();

			// update the layout to match the position.
			if (position == "left" || position == "right") {
				this.getLayout().dispose();
				this.setLayout(new qx.ui.layout.VBox());
				this.getLayout().setReversed(position == "left");
			}
			else {
				this.getLayout().dispose();
				this.setLayout(new qx.ui.layout.HBox());
			}
		},

		/**
		 * Updates the state of the container and all child tool widgets.
		 */
		__updateState: function () {

			var add = "horizontal";
			var remove = "vertical";

			switch (this.getPosition()) {
				case "left":
				case "right":
					add = "vertical";
					remove = "horizontal";
					break;
			}

			this.addState(add);
			this.removeState(remove);

			var widgets = this.getChildren();
			var customState = this.getCustomState();
			for (var i = 0; i < widgets.length; i++) {
				var w = widgets[i];
				w.addState(add);
				w.removeState(remove);

				if (customState) {
					w._forwardStates[customState] = true;
					w.addState(customState);
				}
			}
		}
	},

	destruct: function () {

		this.__tools = null;
		this.__target = null;
	}
});


/**
 * wisej.web.toolContainer.ToolButton
 *
 * Represents a button inside a wisej.web.ToolContainer.
 * 
 */
qx.Class.define("wisej.web.toolContainer.ToolButton", {

	extend: qx.ui.form.Button,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejComponent],

	construct: function () {

		this.base(arguments);

		this.setKeepFocus(true);
		this.setKeepActive(true);

		this.addListener("dbltap", this._onDblTap);
	},

	properties: {

		/**
		 * Appearance key.
		 */
		appearance: { init: "toolcontainer/button", refine: true },

		// overridden
		focusable: { init: false, refine: true },

		/**
		 * Position property.
		 *
		 * Values: Left, Right.
		 */
		position: { check: ["left", "right"] },

		/**
		 * AutoHide property.
		 *
		 * When true, this tool button hides itself when the host control
		 * loses the focus.
		 */
		autoHide: { init: false, check: "Boolean" },
	},

	members: {

		/**
		 * Gets/Sets the visible property.
		 */
		getVisible: function () {

			return this.isVisible();

		},
		setVisible: function (value) {

			this.setVisibility(value ? "visible" : "excluded");

		},

		/**
		 * Gets/Sets the pressed property.
		 */
		getPressed: function () {

			return this.hasState("pressed");

		},
		setPressed: function (value) {

			value
				? this.addState("pressed")
				: this.removeState("pressed");

		},

		// property apply
		_applyEnabled: function (value, old) {

			if (value == null)
				this.resetEnabled();
			else
				this.base(arguments, value, old);

		},

		/**
		 * Listener method for "dbltap" event which stops the propagation.
		 *
		 * @param e {qx.event.type.Pointer} Pointer event
		 */
		_onDblTap: function (e) {
			e.stopPropagation();
		}
	}

});


/**
 * wisej.web.toolContainer.ToolPanel
 *
 * Represents a panel that contains two wisej.web.ToolContainer widgets: the
 * left container and right container.
 */
qx.Class.define("wisej.web.toolContainer.ToolPanel", {

	extend: qx.ui.container.Composite,

	construct: function () {

		var layout = new qx.ui.layout.Grid();
		layout.setRowFlex(0, 1);
		layout.setColumnFlex(0, 1);

		this.base(arguments, layout);
	},

	members: {

		// overridden
		_onChangeTheme: function () {

			if (this.isDisposed()) {
				return;
			}

			this.base(arguments);

			var host = this.getLayoutParent();
			if (host)
				host.updateToolPanelLayout(this);
		}
	}

});


/**
 * wisej.web.toolContainer.IToolPanelHost
 * 
 * Widgets that host the {wisej.web.toolContainer.ToolPanel} must implement
 * this interface.
 */
qx.Interface.define("wisej.web.toolContainer.IToolPanelHost", {

	members: {

		/**
		 * Returns the position of the hosted {wisej.web.toolContainer.ToolPanel}.
		 */
		getToolsPosition: function () { return null; },

		/**
		 * Updates the layout of the hosted {wisej.web.toolContainer.ToolPanel}.
		 * 
		 * @param toolPanel {wisej.web.toolContainer.ToolPanel} the ToolPanel to arrange.
		 */
		updateToolPanelLayout: function (toolPanel) { }
	}

});