///////////////////////////////////////////////////////////////////////////////
//
// (C) 2018 ICE TEA GROUP LLC - ALL RIGHTS RESERVED
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
 * wisej.web.VirtualTreeView
 *
 * Alternative virtual implementation of the wisej.web.TreeView class.
 * Uses the virtual rendering system in qooxdoo to allow a TreeView control
 * to render unlimited nodes without any performance drop.
 *
 */
qx.Class.define("wisej.web.VirtualTreeView", {

	extend: qx.ui.tree.VirtualTree,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	construct: function () {

		this.base(arguments, null, "label", "children");

		this.addListener("dragstart", this._onItemDrag, this);

		// add local state properties.
		this.setStateProperties(this.getStateProperties().concat(["topNode"]));

		// reset the cached metrics when scrolling or resizing.
		this.addListener("resize", this.__resetCachedTopNode);
		this.addListener("scrollAnimationYEnd", this.__resetCachedTopNode);

		// set up our binding delegate.
		this.setDelegate(new wisej.web.virtualTreeView.TreeViewDelegate(this));

		// listen to selection changes.
		this.getSelection().addListener("change", this._onSelectionChange, this);

	},

	properties: {

		// overridden
		appearance: { refine: true, init: "tree" },

		/**
		 * Root property.
		 *
		 * Sets or gets the root node.
		 */
		rootNode: { init: null, nullable: true, check: "wisej.web.virtualTreeView.TreeNode", apply: "_applyRootNode", transform: "_transformComponent" },

		/**
		 * TopNode property.
		 *
		 * Property defined with the setter/getter methods.
		 *
		 * Returns or sets the node displayed at the top of the tree view.
		 */
		// topNode: { init: null, nullable: true, check: "wisej.web.virtualTreeView.TreeNode", apply: "_applyTopNode", transform: "_transformComponent" },

		/**
		 * HideOpenClose property.
		 *
		 * Shows or hides the open/close icon next to the tree nodes.
		 */
		hideOpenClose: { init: false, check: "Boolean", apply: "_applyHideOpenClose" },

		/**
		 * HideIcons property.
		 *
		 * Shows or hides node icons.
		 */
		hideIcons: { init: false, check: "Boolean", apply: "_applyHideIcons" },

		/**
		 * Indent property.
		 *
		 * Gets or sets the indentation to add at each level of child nodes.
		 */
		indent: { init: null, check: "PositiveInteger", apply: "_applyIndent", nullable: true },

		/**
		 * Scrollable property.
		 *
		 * Enables or disables the scrollbars when the nodes exceed the size of the tree control.
		 */
		scrollable: { init: true, check: "Boolean", apply: "_applyScrollable" },

		/**
		 * LabelEdit property.
		 *
		 * Enables or disables label editing.
		 */
		labelEdit: { init: true, check: "Boolean" },

		/**
		 * CheckBoxes property.
		 *
		 * Enables or disables checkBoxes next to each tree node..
		 */
		checkBoxes: { init: false, check: "Boolean", apply: "_applyCheckBoxes" },

		/**
		 * selectionMode override.
		 *
		 * Converts Wisej SelectionMode to the correct value for the QX platform.
		 */
		selectionMode: { refine: true, apply: "_applySelectionMode" },

		/**
		 * SelectedNodes property.
		 *
		 * Gets or sets the selected nodes.
		 */
		selectedNodes: { init: [], apply: "_applySelectedNodes", transform: "_transformComponents" },

		// Node Icons.

		/**
		 * Standard size of the node icons. If left to null, the original image size is used.
		 */
		iconSize: { init: null, nullable: true, apply: "_applyIconSize" },

		/**
		 * Standard size of the state icons. If left to null, the original image size is used.
		 */
		iconStateSize: { init: null, nullable: true, apply: "_applyIconSize" },

		/**
		 * Standard icon used by all nodes. Can be overridden in each single node.
		 */
		icon: { init: null, nullable: true, apply: "_applyIcon", themeable: true },

		/**
		 * Standard icon used by all expanded parent nodes. Can be overridden in each single node.
		 */
		iconOpened: { init: null, nullable: true, apply: "_applyIconOpened", themeable: true },

		/**
		 * Standard icon used by all selected nodes. Can be overridden in each single node.
		 */
		iconSelected: { init: null, nullable: true, apply: "_applyIconSelected", themeable: true },

		/**
		 * Icons used by the checkbox.
		 *
		 * The icon at index 0 is the unchecked, 1 is checked and 2 is undetermined.
		 */
		checkBoxIcons: { init: null, nullable: true, Check: "Array", apply: "_applyCheckBoxIcons" },

		/**
		 * Enables or disables the tooltips on the child nodes.
		 */
		showNodeToolTips: { init: false, check: "Boolean", apply: "_applyShowNodeToolTips" },

		/**
		 * Tools property.
		 *
		 * Collection of tool definitions to display on top of the tree control.
		 */
		tools: { check: "Array", apply: "_applyTools" },

		/**
		 * Determines the appearance of child nodes.
		 */
		fileAppearance: { init: "tree-file", apply: "_applyFileAppearance", themeable: true },

		/**
		 * Determines the appearance of child nodes that can be expanded.
		 */
		folderAppearance: { init: "tree-folder", apply: "_applyFolderAppearance", themeable: true },
	},

	members: {

		// keep track if the nodes are being selected from the _applySelectedNodes method.
		__inApplySelectedNodes: false,

		/**
		 * Scrolls the node into view.
		 * 
		 * @param node {wisej.web.virtualTreeView.TreeNode} node to scroll into view.
		 */
		ensureVisible: function (node) {

			if (node) {
				qx.event.Timer.once(function () {

					var lookup = this.getLookupTable();
					var index = lookup.indexOf(node);
					if (index > -1) {
						this.getPane().scrollRowIntoView(index);
						qx.ui.core.queue.Manager.flush();
					}

				}, this, 1);
			}
		},

		/**
		 * Starts the editor on the label of the tree node.
		 * 
		 * @param node {wisej.web.virtualTreeView.TreeNode} node to edit.
		 */
		editNode: function (node) {

			if (node && this.isLabelEdit()) {

				this.ensureVisible(node);

				qx.event.Timer.once(function () {

					var lookup = this.getLookupTable();
					var index = lookup.indexOf(node);
					if (index > -1) {

						var editor = this.getChildControl("editor");
						this.__forEachItem(function (item) {

							if (item.getModel() === node) {
								editor.editNode(item);
								return false; // break;
							}

						});
					}

				}, this, 100);
			}
		},

		// overridden. interface implementation
		hasChildren: function (node) {

			return node.getCanExpand()
				|| qx.ui.tree.core.Util.hasChildren(node, this.getChildProperty(), !this.isShowLeafs());
		},

		// overridden. interface implementation
		isNodeOpen: function (node) {

			return node.isExpanded()
				|| qx.lang.Array.contains(this.__openNodes, node);
		},

		/**
		 * Applies the root node.
		 *
		 * Assigns the model property, in the VirtualTree the model is the root.
		 */
		_applyRootNode: function (value, old) {

			if (old)
				old.setTree(null);
			if (value)
				value.setTree(this);

			this.setModel(value);
		},

		/**
		 * Applies the fileAppearance properties.
		 */
		_applyFileAppearance: function (value, old) {

			this.__forEachItem(function (item) {
				item.setFileAppearance(value);
			});
		},

		/**
		 * Applies the folderAppearance properties.
		 */
		_applyFolderAppearance: function (value, old) {

			this.__forEachItem(function (item) {
				item.setFolderAppearance(value);
			});
		},

		/**
		 * Applies the icon property.
		 *
		 * Updates all the nodes and child nodes that don't specify their own icon.
		 */
		_applyIcon: function (value, old) {

			this.__forEachItem(function (item) {
				if (!item.hasState("opened"))
					item._updateIcon();
			});
		},

		/**
		 * Applies the iconSize and iconStateSize properties.
		 *
		 * Updates all the nodes and child nodes.
		 */
		_applyIconSize: function (value, old, name) {

			name = (name == "iconSize") ? "icon" : "iconState";

			this.__forEachItem(function (item) {
				item._updateIconSize(value, name);
			});
		},

		/**
		 * Applies the iconOpened property.
		 *
		 * Updates all the nodes and child nodes that don't specify their own icon.
		 */
		_applyIconOpened: function (value, old) {

			this.__forEachItem(function (item) {
				if (item.hasState("opened"))
					item._updateIcon();
			});
		},

		/**
		 * Applies the checkBoxIcons property.
		 */
		_applyCheckBoxIcons: function (value, old) {

			// works only if the checkbox property is true.
			if (this.isCheckBoxes()) {

				var checkBoxIcons = this.getCheckBoxIcons();
				this.__forEachItem(function (item) {
					item._updateCheckBoxIcons(checkBoxIcons);
				});
			}
		},

		/**
		 * Applies the showNodeToolTips property.
		 */
		_applyShowNodeToolTips: function (value, old) {

			var block = !value;
			this.__forEachItem(function (item) {
				item.setBlockToolTip(block);
			});
		},

		/**
		 * Applies the iconSelected property.
		 *
		 * Updates all the nodes and child nodes that don't specify their own icon.
		 */
		_applyIconSelected: function (value, old) {

			this.__forEachItem(function (item) {
				if (item.hasState("selected"))
					item._updateIcon();
			});

		},

		/**
		 * Applies the hideOpenClose property.
		 */
		_applyHideOpenClose: function (value, old) {

			this.__forEachItem(function (item) {
				item._updateIndent();
			});
		},

		/**
		 * Applies the indent property.
		 *
		 * The indentation value is propagated to all child nodes.
		 */
		_applyIndent: function (value, old) {

			if (value == old)
				return;

			this.__forEachItem(function (item) {

				if (value == null || value == -1)
					item.resetIndent();
				else
					item.setIndent(value);
			});
		},

		/**
		 * Applies the itemHeight property.
		 */
		_applyRowHeight: function (value, old) {

			if (value == old)
				return;

			if (value == null || value == -1)
				this.resetItemHeight();
			else
				this.getPane().getRowConfig().setDefaultItemSize(value);
		},

		/**
		 * Applies the checkBoxes property.
		 *
		 * The property value is propagated to all child nodes.
		 */
		_applyCheckBoxes: function (value, old) {

			this.__forEachItem(function (item) {
				item._updateCheckBox(value);
			});

		},

		/**
		 * Applies the hideIcons property.
		 *
		 * The property value is propagated to all child nodes.
		 */
		_applyHideIcons: function (value, old) {

			this.__forEachItem(function (item) {
				item._updateHideIcon(value);
			});
		},

		/**
		 * Iterates all rendered items.
		 */
		__forEachItem: function (callback) {

			if (callback) {
				var layers = this.getPane().getLayers();
				for (var i = 0; i < layers.length; i++) {
					var children = layers[i].getChildren();
					for (var j = 0; j < children.length; j++) {
						if (callback(children[j]) === false)
							break;
					}
				}
			}
		},

		/**
		 * Applies the scrollable property.
		 */
		_applyScrollable: function (value, old) {

			if (value)
				this.setScrollbar("auto", "auto");
			else
				this.setScrollbar("off", "off");
		},

		/**
		 * Applies the selectionMode property.
		 */
		_applySelectionMode: function (value, old) {

			switch (value) {
				case "none": value = "none"; break;
				case "one": value = "single"; break;
				case "multiSimple": value = "additive"; break;
				case "multiExtended": value = "multi"; break;
			}

			this.base(arguments, value, old);
		},


		/**
		 * Applies the selectedNodes property.
		 */
		_applySelectedNodes: function (value, old) {

			this.__inApplySelectedNodes = true;
			try {

				this.getSelection().removeAll();
				if (value && value.length > 0)
					this.getSelection().append(value);

			} finally {

				this.__inApplySelectedNodes = false;
			}
		},

		/** 
		 * Applies the tools property.
		 */
		_applyTools: function (value, old) {

			if (value == null)
				return;

			var toolsContainer = this.getChildControl("tools", true);

			if (value.length === 0) {

				if (toolsContainer)
					toolsContainer.exclude();

				return;
			}

			if (!toolsContainer) {
				toolsContainer = this.getChildControl("tools");
				this._getLayout().setRowFlex(0, 0);
				this._add(toolsContainer, { row: 0, column: 0, colSpan: 2 });

				// update the scrollable area layout to make room for the tools container.
				this._updateScrollAreaLayout();
			}

			toolsContainer.show();
			wisej.web.ToolContainer.install(this, toolsContainer, value, "left", { row: 0, column: 0 });
			wisej.web.ToolContainer.install(this, toolsContainer, value, "right", { row: 0, column: 1 });
		},

		/**
		 * TopNode property setter/getter.
		 *
		 * Returns or sets the first node displayed at the top of the tree view.
		 */
		getTopNode: function () {

			if (this.__topNode === undefined) {
				this.buildLookupTable();
				var node = this.getLookupTable().getItem(0);
				if (node instanceof wisej.web.virtualTreeView.TreeNode)
					this.__topNode = node;
			}

			return this.__topNode != null ? this.__topNode.getId() : null;
		},
		setTopNode: function (node) {

			if (this.getBounds() == null) {
				this.addListenerOnce("appear", function () {
					qx.event.Timer.once(function () {
						this.setTopNode(node);
					}, this, 0);
				}, this);
				return;
			}

			node = this._transformComponent(node);
			if (node != this.__topNode) {
				this.buildLookupTable();
				var row = this.getLookupTable().indexOf(node);
				if (row > -1) {
					var pane = this.getPane();
					var itemTop = pane.getRowConfig().getItemPosition(row);
					pane.setScrollY(itemTop);
				}
				this.__topNode = undefined;
			}
		},

		// cached top node. avoid searching for the top node every time we need to update the state.
		__topNode: undefined,

		__resetCachedTopNode: function (e) {

			this.__topNode = undefined;
		},

		/**
		 * Returns the tree item, which contains the given widget.
		 *
		 * @param widget {qx.ui.core.Widget} The widget to get the containing tree item.
		 * @return {qx.ui.tree.core.AbstractItem|null} The tree item containing the widget. If the
		 *     widget is not inside of any tree item <code>null</code> is returned.
		 */
		getTreeItem: function (widget) {

			while (widget) {
				if (widget === this)
					return null;
				if (widget instanceof qx.ui.tree.core.AbstractItem)
					return widget;
				widget = widget.getLayoutParent();
			}

			return null;
		},

		/**
		 * Returns the tree item, which contains the given widget.
		 *
		 * @param widget {qx.ui.core.Widget} The widget to get the data node.
		 * @return {wisej.web.virtualTreeView.TreeNode|null} The tree node containing the data represented by the widget. If the
		 *     widget is not inside of any tree item <code>null</code> is returned.
		 */
		getTreeNode: function (widget) {

			var item = this.getTreeItem(widget);
			if (item)
				return item.getModel();
		},

		// updates the properties of the node using the values
		// set in the tree parent.
		_updateItem: function (item) {

			item._updateIconSize(this.getIconSize(), "icon");
			item._updateIconSize(this.getIconStateSize(), "iconState");
			item._updateCheckBox(this.getCheckBoxes());
			item._updateCheckBoxIcons(this.getCheckBoxIcons());
			item.setBlockToolTip(!this.getShowNodeToolTips());
			item.setFileAppearance(this.getFileAppearance());
			item.setFolderAppearance(this.getFolderAppearance());
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "editor":
					control = new wisej.web.virtualTreeView.LabelEditor().set({
						visibility: "excluded"
					});
					control.addState("inner");
					control.addListener("endEdit", this._onLabelEditorEndEdit, this);
					break;

				case "tools":
					control = new wisej.web.toolContainer.ToolPanel();
					break;

				case "tooltip":
					break;
			}

			return control || this.base(arguments, id);
		},

		// overridden.
		_updateScrollAreaLayout: function (paneCell, controls) {

			// change the layout of the scroll area when we have a tools container.
			if (this.getChildControl("tools", true)) {
				this.base(arguments, { row: 1, column: 0 }, controls);
			}
			else {
				this.base(arguments, paneCell, controls);
			}
		},

		// overridden.
		getInnerSize: function () {

			var size = this.base(arguments);

			// reduce by the height of the tools container.
			var tools = this.getChildControl("tools", true);
			if (tools && tools.isVisible && tools.getBounds())
				size.height -= tools.getBounds().height;

			return size;
		},

		/**
		 * Event handler for endEdit fired by the label editor
		 * when the user has finished editing.
		 *
		 * @param e {qx.event.type.Data} The selection data event.
		 */
		_onLabelEditorEndEdit: function (e) {

			// redirect endEdit events to the TreeView.
			this.fireDataEvent("endEdit", e.getData());

			this.activate();
		},

		/**
		 * Event handler for changeSelection events, which opens all parent folders
		 * of the selected folders.
		 *
		 * @param e {qx.event.type.Data} The selection data event.
		 */
		_onSelectionChange: function (e) {

			clearTimeout(this.__editNodeTimer);
			this.__editNodeTimer = 0;

			if (!this.__inApplySelectedNodes)
				this.fireDataEvent("selectionChanged", e.getData().added);
		},

		_onKeyPress: function (e) {

			var selection = this.getSelection();
			var node = selection.getItem(0);

			if (node !== null) {
				switch (e.getKeyIdentifier()) {
					case "-":
					case "Left":
						if (this.isNodeOpen(node)) {
							this.closeNode(node);
						}
						else {
							var parentNode = node.getParentNode();
							if (parentNode && parentNode.isVisible())
								selection.splice(0, 1, parentNode);
						}
						return;

					case "+":
					case "Right":
						if (!this.isNodeOpen(node))
							this.openNode(node);
						return;

					case "Enter":
						// ignore Enter, it may be an accelerator.
						return;

					case "Space":

						if (node.getCheckBox()
							|| (this.getCheckBoxes() && node.getCheckBox() != false)) {

							this.fireDataEvent("nodeCheckClick", node);
						}
						else {
							this.isNodeOpen(node)
								? this.closeNode(node)
								: this.openNode(node);
						}

						return;
				}

				// if label editing is enabled, process F2
				// to start editing the first selected node.
				if (this.isLabelEdit()) {
					switch (e.getKeyIdentifier()) {
						case "F2":
							if (!this.isWired("beginEdit")) {
								this.editNode(node);
							}
							else {
								this.fireDataEvent("beginEdit", node);
							}
							return;
					}
				}
			}

			this.base(arguments, e);
		},

		/**
		  * Event handler for tap events, which could change a tree item's open state.
		  */
		_onOpen: function (e) {

			var item = this.getTreeItem(e.getTarget());
			if (item == null)
				return;

			item.isOpen()
				? item.collapse()
				: item.expand();

			e.stopPropagation();
		},

		/**
		 * Starts the timer to start editing the node.
		 * 
		 * @param item {wisej.web.VirtualTreeItem} the node widget to edit.
		 */
		_beginEditItem: function (item) {

			if (!this.isWired("beginEdit")) {

				var editor = me.getChildControl("editor");
				if (item)
					editor.editNode(item);
			}
			else {

				clearTimeout(this.__editNodeTimer);
				this.__editNodeTimer = 0;

				var me = this;
				var node = this.getTreeNode(item);
				this.__editNodeTimer = setTimeout(function () {
					me.fireDataEvent("beginEdit", node);
				}, 100);
			}
		},

		// timer used to start editing the current node.
		__editNodeTimer: 0,

		/**
		 * Process dragstart events to fire our "itemDrag" event
		 * when a tree child node is being dragged.
		 */
		_onItemDrag: function (e) {

			clearTimeout(this.__editNodeTimer);
			this.__editNodeTimer = 0;

			var node = this.getTreeItem(e.getOriginalTarget());
			if (node)
				this.fireDataEvent("itemDrag", node);
		},

		/**
		 * Overridden event handler for the changeBubble event. The handler rebuild the lookup
		 * table when the child structure changed.
		 * 
		 * When invoked while processing server actions, suspend the
		 * model changes until we are done.
		 *
		 * @param e {qx.event.type.Data} The data event.
		 */
		_onChangeBubble: function (e) {

			if (this.core.processingActions) {
				qx.ui.core.queue.Widget.add(this, "applyModelChanges");
				return;
			}

			this.base(arguments, e);
		},

		syncWidget: function (jobs) {

			this.base(arguments, jobs);

			if (!jobs || !jobs["applyModelChanges"])
				return;

			this.__applyModelChanges();
		}

	}
});


/**
 * wisej.web.virtualTreeView.TreeViewDelegate
 *
 * Delegate implementation used by the virtual infrastructure
 * to create, initialize, pool the widgets used when rendering the nodes.
 *
 */
qx.Class.define("wisej.web.virtualTreeView.TreeViewDelegate", {

	extend: qx.core.Object,

	implement: [
		qx.ui.tree.core.IVirtualTreeDelegate
	],

	construct: function (tree) {

		this.base(arguments);

		this.__tree = tree;
	},

	members: {

		/** the instance of wisej.web.VirtualTreeView that created this delegate. */
		__tree: null,

		/**
		 * Gives the user the opportunity to set individual styles and properties
		 * on the widget cells created by the controller.
		 *
		 * @param item {qx.ui.core.Widget} Item to modify.
		 */
		configureItem: function (item) { },


		/**
		 * Creates a widget cell which will be used for rendering. Be sure to
		 * implement the {@link #bindItem} function as well to get the needed
		 * properties bound.
		 *
		 * @return {qx.ui.core.Widget} A new created item cell.
		 */
		createItem: function () {

			return new wisej.web.VirtualTreeItem().set({ tree: this.__tree });
		},

		/**
		 * Gives the user the opportunity to reset properties or states.
		 *
		 * @param item {qx.ui.core.Widget} Item to modify.
		 */
		onPool: function (item) {

			var editor = this.__tree.getChildControl("editor", true);
			if (editor && editor.getLayoutParent() === item) {
				editor.endEdit(true);
			}

			item.removeState("opened");
			item.removeState("hovered");
			item.removeState("selected");
			item.removeState("disabled");
			item.removeState("editing");
			item.__hideLoader();
		},

		/**
		 * Sets up the binding for the given widget cell and index.
		 *
		 * For every property you want to bind, use
		 * {@link MWidgetController#bindProperty} like this:
		 * <code>
		 * controller.bindProperty(null, "value", options, item, id);
		 * </code>
		 *
		 * @param controller {MWidgetController} The currently used controller.
		 * @param item {qx.ui.core.Widget} The created and used item.
		 * @param id {Integer} The id for the binding.
		 */
		bindItem: function (controller, item, id) {

			controller.bindProperty("", "model", null, item, id);
			controller.bindProperty("label", "label", null, item, id);
			controller.bindProperty("icon", "icon", null, item, id);
			controller.bindProperty("iconSelected", "iconSelected", null, item, id);
			controller.bindProperty("iconState", "iconState", null, item, id);
			controller.bindProperty("visible", "visible", null, item, id);
			controller.bindProperty("enabled", "enabled", null, item, id);
			controller.bindProperty("toolTipText", "toolTipText", null, item, id);
			controller.bindProperty("contextMenu", "contextMenu", null, item, id);
			controller.bindProperty("checkBox", "checkBox", null, item, id);
			controller.bindProperty("checkState", "checkState", null, item, id);
			controller.bindProperty("hideIcon", "hideIcon", null, item, id);
			controller.bindProperty("showLoader", "showLoader", null, item, id);
			controller.bindProperty("canExpand", "canExpand", null, item, id);
			controller.bindProperty("expanded", "expanded", null, item, id);
			controller.bindProperty("font", "font", this.__bindItemInheritedPropertyFilter, item, id);
			controller.bindProperty("textColor", "textColor", this.__bindItemInheritedPropertyFilter, item, id);
			controller.bindProperty("backgroundColor", "backgroundColor", this.__bindItemInheritedPropertyFilter, item, id);

			controller.bindProperty("canExpand", "openSymbolMode", {
				converter: function (value, model, sourceObject, targetObject) {
					return (value) ? "always" : "auto";
				}
			}, item, id);

			controller.bindPropertyReverse("tree", "tree", null, item, id);
		},

		__bindItemInheritedPropertyFilter: {
			converter: function (value, model, sourceObject, targetObject) {
				return value === null ? undefined : value;
			}
		}
	}
});


/**
 * wisej.web.virtualTreeView.TreeNode
 *
 * TreeNode data in the data model. Instances of this
 * class are bound to the wisej.web.VirtualTreeItem widgets
 * displayed in the wisej.web.VirtualTreeView.
 *
 * This is the main difference with the standard implementation
 * in wisej.web.TreeView. The VirtualTreeView manages the nodes
 * in a data model and renders only the visible nodes in the widget.
 *
 */
qx.Class.define("wisej.web.virtualTreeView.TreeNode", {

	extend: qx.core.Object,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejComponent,
		qx.data.marshal.MEventBubbling],

	construct: function (label) {

		this.base(arguments);

		if (label)
			this.setLabel(label);

		this.setChildren(new qx.data.Array());
	},

	properties: {

		/**
		 * Tree property.
		 *
		 * Reference to the parent wisej.web.VirtualTreeView.
		 */
		tree: { init: null, check: "wisej.web.VirtualTreeView", apply: "_applyTree" },

		/**
		 * The label/caption/text.
		 */
		label: { init: "", check: "String", event: "changeLabel", },

		/**
		 * Node icon.
		 */
		icon: { init: null, check: "String", event: "changeIcon" },

		/**
		 * Node icon when the node is selected.
		 */
		iconSelected: { init: null, check: "String", event: "changeIconSelected" },

		/**
		 * State icon displayed to the left of the node icon.
		 */
		iconState: { init: null, check: "String", event: "changeIconState" },

		/**
		 * The tooltip.
		 */
		toolTipText: { init: "", check: "String", event: "changeToolTipText", },

		/**
		 * The expanded state.
		 */
		expanded: { init: false, check: "Boolean", apply: "_applyExpanded", event: "changeExpanded" },

		/**
		 * The visible property.
		 */
		visible: { init: true, check: "Boolean", event: "changeVisible" },

		/**
		 * The enabled property.
		 */
		enabled: { init: true, check: "Boolean", event: "changeEnabled" },

		/**
		 * The canExpand property.
		 */
		canExpand: { init: true, check: "Boolean", event: "changeCanExpand" },

		/**
		 * The showLoader property.
		 */
		showLoader: { init: true, check: "Boolean", event: "changeShowLoader" },

		/**
		 * The background color.
		 */
		backgroundColor: { init: null, check: "Color", event: "changeBackgroundColor", },

		/**
		 * The text color.
		 */
		textColor: { init: null, check: "Color", event: "changeTextColor", },

		/**
		 * The font.
		 */
		font: { init: null, check: "Font", event: "changeFont", dereference: true },

		/**
		 * The child nodes.
		 */
		nodes: { init: null, check: "Array", apply: "_applyNodes", transform: "_transformComponents" },

		/**
		 * CheckBox property.
		 *
		 * Hides or shows the checkbox in tree node.
		 */
		checkBox: { init: null, nullable: true, check: "Boolean", event: "changeCheckBox" },

		/**
		 * CheckState property.
		 *
		 * Gets or sets the check state of the checkbox.
		 */
		checkState: { init: false, check: "Boolean", nullable: true, event: "changeCheckState" },

		/**
		 * HideIcon property.
		 *
		 * Hides or shows node icons.
		 */
		hideIcon: { init: null, nullable: true, check: "Boolean", event: "changeHideIcon" },

		/**
		 * The data bound children property.
		 *
		 * Altering this collection alters the widget.
		 */
		children: { init: null, check: "qx.data.Array", apply: "_applyEventPropagation", event: "changeChildren" },

		/**
		 * Index property.
		 *
		 * The position of this node within the node collection it belongs to.
		 */
		index: { init: -1, check: "Integer", apply: "_applyIndex" },

		/**
		 * ParentNode property.
		 */
		parentNode: { init: null, check: "wisej.web.virtualTreeView.TreeNode", apply: "_applyParentNode", transform: "_transformComponent" },

		/**
		 * The contextual menu.
		 */
		contextMenu: { init: null, nullable: true, transform: "_transformMenu" }
	},

	members: {
	
		/**
		 * Applies the nodes property.
		 *
		 * Replaces all the nodes in the children collection.
		 */
		_applyNodes: function (value, old) {

			var children = this.getChildren();
			children.removeAll();

			if (value && value.length > 0) {

				children.append(value);

				for (var i = 0, l = value.length; i < l; i++) {
					qx.util.PropertyUtil.setUserValue(value[i], "parentNode", this);
				}
			}
		},

		/**
		 * Applies the tree property.
		 *
		 */
		_applyTree: function (value, old) {

			var tree = value;
			if (tree && this.isExpanded()) {
				tree.openNodeWithoutScrolling(this);
			}
		},

		/**
		 * Applies the expanded property.
		 *
		 * This property cannot be bound to the model since a node cannot be expanded
		 * while it's being updated using the bound model.
		 */
		_applyExpanded: function (value, old) {

			if (value == old)
				return;

			var tree = this.getTree();
			if (tree) {
				value
					? tree.openNodeWithoutScrolling(this)
					: tree.closeNodeWithoutScrolling(this);
			}
		},

		/**
		 * Applies the parentNode property.
		 */
		_applyParentNode: function (value, old) {

			if (value == old)
				return;

			if (old)
				old.getChildren().remove(this);

			if (value) {

				var parentChildren = value.getChildren();

				// different parent?
				if (!parentChildren.contains(this)) {
					var index = this.getIndex();
					if (index > -1)
						parentChildren.insertAt(index, this);
					else
						parentChildren.push(this);
				}
			}
		},

		/**
		 * Applies the index property.
		 */
		_applyIndex: function (value, old) {

			if (value == old)
				return;

			var parentNode = this.getParentNode();
			if (parentNode) {
				var parentChildren = parentNode.getChildren();
				if (parentChildren.contains(this)) {
					var newIndex = value;
					var currentIndex = parentChildren.indexOf(this);

					if (newIndex !== currentIndex) {
						parentChildren.remove(this);
						parentChildren.insertAt(newIndex, this);
					}
				}
			}
		},

		// overridden.
		dispose: function () {

			this.setParentNode(null);

			this.base(arguments);
		}
	}

});


/**
 * wisej.web.VirtualTreeItem
 *
 * This is the widget that renders the nodes in the
 * VirtualTreeView.
 */
qx.Class.define("wisej.web.VirtualTreeItem", {

	extend: qx.ui.tree.VirtualTreeItem,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [wisej.mixin.MWisejComponent],

	construct: function (label) {

		this.base(arguments, label);

		this.addState("inner");

		this.addListener("tap", this._onTap, this);
		this.addListener("dbltap", this._onDblTap, this);
		this.addListener("mouseup", this._onMouseUp, this);
		this.addListener("pointerover", this._onPointerOver, this);
		this.addListener("pointerout", this._onPointerOut, this);
	},

	properties: {

		/**
		 * Tree property.
		 *
		 * Reference to the parent wisej.web.VirtualTreeView.
		 */
		tree: { init: null, check: "wisej.web.VirtualTreeView", apply: "_applyTree", event: "changeTree" },

		/**
		 * CanExpand property.
		 *
		 * Sets the type of node, when true the node is a tree-folder, otherwise it's a tree-file.
		 * When the node is a tree-folder it can expand even if it doesn't have child nodes performing
		 * as a lazy-load node.
		 */
		canExpand: { init: false, check: "Boolean", apply: "_applyCanExpand" },

		/**
		 * Expanded property.
		 *
		 * Replaces the open property which is redirected to the server.
		 *
		 * This property is defined with the setter/getter methods.
		 */
		// expanded: { init: false, check: "Boolean", apply: "setExpanded" },

		/**
		 * CheckBox property.
		 *
		 * Hides or shows the checkbox in tree node.
		 */
		checkBox: { init: null, nullable: true, check: "Boolean", apply: "_applyCheckBox" },

		/**
		 * HideIcon property.
		 *
		 * Hides or shows node icons.
		 */
		hideIcon: { init: null, nullable: true, check: "Boolean", apply: "_applyHideIcon" },

		/**
		 * ShowLoader property.
		 *
		 * Shows the loader icon while the node is expanding but it doesn't have any nodes.
		 */
		showLoader: { init: false, check: "Boolean", apply: "_applyShowLoader" },

		/**
		 * loader property.
		 * 
		 * The image to use when loading an empty parent node.
		 */
		loader: { init: "node-loader", check: "String", themeable: true },

		/**
		 * CheckState property.
		 *
		 * Gets or sets the check state of the checkbox widget: true, false or null.
		 */
		checkState: { init: false, check: "Boolean", nullable: true, apply: "_applyCheckState" },

		/**
		 * The visible property.
		 * 
		 * Property defined with the setter/getter methods.
		 */
		// visible: { init: false, check: "Boolean", apply: "setVisible" },

		/**
		 * Icon used when the node is selected.
		 */
		iconSelected: { init: null, nullable: true, apply: "_applyIconSelected" },

		/**
		 * State icon displayed to the left of the node icon.
		 */
		iconState: { init: null, nullable: true, apply: "_applyIconState" },

		/**
		 * The contextual menu.
		 * 
		 * Replaces the built-in contextMenu.
		 */
		contextMenu: { init: null, nullable: true, apply: "_applyContextMenu", transform: "_transformMenu" },

		/**
		 * Determines the appearance of child nodes.
		 */
		fileAppearance: { init: "tree-file", apply: "_applyFileAppearance" },

		/**
		 * Determines the appearance of child nodes that can be expanded.
		 */
		folderAppearance: { init: "tree-folder", apply: "_applyFolderAppearance" },
	},

	members: {

		/**
		 * Expands the node. Fires the expand event and lets
		 * the server handle the expanded state.
		 */
		expand: function () {

			if (this.isOpen() || !this.isOpenable())
				return;

			var treeView = this.getTree();
			if (treeView == null)
				return;

			var node = treeView.getTreeNode(this);
			if (node == null)
				return;

			// fire the event on the server, unless in design mode.
			if (wisej.web.DesignMode) {
				this.setOpen(true);
			}
			else {
				this.__showLoader();
				treeView.fireDataEvent("expand", node);
			}
		},

		/**
		 * Collapses the node. Fires the collapse event and lets
		 * the server handle the expanded state.
		 */
		collapse: function () {

			if (!this.isOpen())
				return;

			var treeView = this.getTree();
			if (treeView == null)
				return;

			var node = treeView.getTreeNode(this);
			if (node == null)
				return;

			// fire the event on the server, unless in design mode.
			if (wisej.web.DesignMode) {
				this.setOpen(false);
			}
			else {
				this.__hideLoader();
				treeView.fireDataEvent("collapse", node);
			}
		},

		/**
		 * Gets or sets the expanded property.
		 *
		 * Opens/closes the node.
		 */
		getExpanded: function () {
			return this.isOpen();
		},
		setExpanded: function (value) {
			this.setOpen(value);
		},

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
		 * Adds the checkbox widget to the tree item.
		 */
		addCheckBox: function () {

			var checkbox = this.getChildControl("checkbox");
			this._add(checkbox);
		},

		/**
		 * Adds the state image widget to the tree item.
		 */
		addIconState: function () {

			var image = this.getChildControl("state");
			this._add(image);
		},

		/**
		 * Applies the tree property.
		 */
		_applyTree: function (value, old) {

			if (value)
				value._updateItem(this);
		},

		// overridden.
		_applyOpen: function (value, old) {
			this.__hideLoader();
			this.base(arguments, value, old);
		},

		/**
		 * Applies the appearance according to the
		 * @canExpand property value.
		 */
		_applyFileAppearance: function (value, old) {

			if (!this.getCanExpand())
				this.setAppearance(value);
		},

		/**
		 * Applies the appearance according to the
		 * @canExpand property value.
		 */
		_applyFolderAppearance: function (value, old) {

			if (this.getCanExpand())
				this.setAppearance(value);
		},

		/**
		 * Applies the iconSelected property.
		 */
		_applyIconSelected: function (value, old) {

			if (this.hasState("selected"))
				this._updateIcon();
		},

		_applyIcon: function (value, old) {

			if (!value)
				this.resetIcon();
			else
				this.base(arguments, value, old);

			this._updateIcon();
		},

		_applyIconOpened: function (value, old) {

			if (!value)
				this.resetIconOpened();
			else
				this.base(arguments, value, old);

			this._updateIcon();
		},

		_applyShowLoader: function (value, old) {

			if (old && !value)
				this.__hideLoader();
		},

		removeState: function (state) {

			this.base(arguments, state);

			if (state === "selected" || state === "opened")
				this._updateIcon();

		},

		addState: function (state) {

			this.base(arguments, state);

			if (state === "selected" || state === "opened")
				this._updateIcon();
		},

		/**
		 * Updates the current icon.
		 */
		_updateIcon: function () {

			qx.ui.core.queue.Widget.add(this, "updateIcon");
		},

		syncWidget: function (jobs) {

			this.base(arguments, jobs);

			if (!jobs)
				return;

			var treeView = this.getTree();
			if (treeView == null)
				return;

			if (jobs["updateIcon"]) {

				var icon = this.getChildControl("icon");
				if (icon == null)
					return;

				var source = null;
				if (this.hasState("selected")) {
					source = this.getIconSelected()
						|| treeView.getIconSelected();

					if (source) {
						icon.setSource(source);
						return;
					}
				}

				if (this.hasState("opened")) {
					source = this.getIconOpened()
						|| treeView.getIconOpened();

					if (source) {
						icon.setSource(source);
						return;
					}
				}

				source = this.__getUserIcon()
					|| treeView.getIcon()
					|| this.__getThemeIcon();

				if (source)
					icon.setSource(source);
			}
		},

		/**
		 * Get theme-defined value of "icon" property
		 */
		__getThemeIcon: function (owner) {
			owner = owner || this;
			return qx.util.PropertyUtil.getThemeValue(owner, "icon");
		},

		/**
		 * Get theme-defined value of "iconOpened" property
		 */
		__getThemeIconOpened: function (owner) {
			owner = owner || this;
			return qx.util.PropertyUtil.getThemeValue(owner, "iconOpened");
		},

		/**
		 * Get theme-defined value of "iconSelected" property
		 */
		__getThemeIconSelected: function (owner) {
			owner = owner || this;
			return qx.util.PropertyUtil.getThemeValue(owner, "iconSelected");
		},

		/**
		 * Get user-defined value of "icon" property
		 */
		__getUserIcon: function (owner) {
			owner = owner || this;
			return qx.util.PropertyUtil.getUserValue(owner, "icon");
		},

		/**
		 * Get user-defined value of "iconOpened" property
		 */
		__getUserIconOpened: function (owner) {
			owner = owner || this;
			return qx.util.PropertyUtil.getUserValue(owner, "iconOpened");
		},

		/**
		 * Get user-defined value of "iconSelected" property
		 */
		__getUserIconSelected: function (owner) {
			owner = owner || this;
			return qx.util.PropertyUtil.getUserValue(owner, "iconSelected");
		},

		/**
		 * Updates the size of the specified icon.
		 */
		_updateIconSize: function (size, name) {

			var icon = this.getChildControl(name, true);
			if (!icon)
				return;

			icon.resetMaxWidth();
			icon.resetMaxHeight();

			if (size) {
				icon.setWidth(size.width);
				icon.setHeight(size.height);
				icon.getContentElement().setStyle("backgroundSize", size.width + "px " + size.height + "px");
			}
			else {
				icon.resetWidth();
				icon.resetHeight();
				icon.getContentElement().setStyle("backgroundSize", "contain");
			}
		},

		/**
		 * Updates the icons used by the checkbox.
		 */
		_updateCheckBoxIcons: function (checkBoxIcons) {

			checkBoxIcons = checkBoxIcons || [];
			var checkbox = this.getChildControl("checkbox");

			// change or reset the checked icon.
			if (checkbox.hasState("checked")) {

				if (checkBoxIcons[1])
					checkbox.setIcon(checkBoxIcons[1]);
				else
					checkbox.resetIcon();

				return;
			}

			// change or reset the undetermined icon.
			if (checkbox.hasState("undetermined")) {

				if (checkBoxIcons[2])
					checkbox.setIcon(checkBoxIcons[2]);
				else
					checkbox.resetIcon();

				return;
			}

			// change or reset the unchecked icon.
			{
				if (checkBoxIcons[0])
					checkbox.setIcon(checkBoxIcons[0]);
				else
					checkbox.resetIcon();

				return;
			}
		},

		/**
		 * Updates the visibility of the checkbox in the node.
		 */
		_updateCheckBox: function (showCheckBox) {

			var checkbox = this.getChildControl("checkbox");

			var show = this.getCheckBox();

			// if null, use the parent's value.
			show = show != null ? show : showCheckBox;

			if (show) {
				checkbox.show();
			}
			else {
				// if the tree view shows the checkbox for all nodes, we preserve
				// the space to keep the nodes aligned.
				//if (treeCheckBox)
				//	checkbox.hide();
				//else
				checkbox.exclude();
			}
		},

		/**
		 * Updates the visibility of the node icon.
		 */
		_updateHideIcon: function (hideIcon) {

			var icon = this.getChildControl("icon");

			var hide = this.getHideIcon();

			// if null, use the parent's value.
			hide = hide != null ? hide : hideIcon;

			hide
				? icon.exclude()
				: icon.show();
		},

		/**
		 * Applies the iconState property.
		 */
		_applyIconState: function (value, old) {

			var state = this.getChildControl("state");
			state.setSource(value);
			state.setVisibility(value == null ? "excluded" : "visible");
		},

		/**
		 * Applies the checkBox property.
		 *
		 * Shows or hides the checkbox widget in the tree node.
		 */
		_applyCheckBox: function (value, old) {

			var treeView = this.getTree();
			this._updateCheckBox(treeView != null ? treeView.getCheckBoxes() : value);
		},

		/**
		 * Applies the hideIcon property.
		 *
		 * Shows or hides the tree node icon.
		 */
		_applyHideIcon: function (value, old) {

			var treeView = this.getTree();
			this._updateHideIcon(treeView != null ? treeView.getHideIcons() : value);
		},

		/**
		 * Applies the checkState property.
		 *
		 * Checks or unchecks the checkbox widget.
		 */
		_applyCheckState: function (value, old) {

			var checkbox = this.getChildControl("checkbox");
			checkbox.setValue(value);

			var treeView = this.getTree();
			if (treeView != null)
				this._updateCheckBoxIcons(treeView.getCheckBoxIcons());
		},

		/**
		 * Applies the canExpand property.
		 *
		 * Changes the appearance key of the TreeNode class
		 * to look like a tree-folder or a tree-item.
		 */
		_applyCanExpand: function (value, old) {

			if (value) {
				this.setOpenSymbolMode("always");
				this.setAppearance(this.getFolderAppearance());
			}
			else {
				this.setOpenSymbolMode("auto");
				this.setAppearance(this.getFileAppearance());

				// remove the ajax loader, in case the node was loading.
				this.__hideLoader();
			}
		},

		/**
		 * Event handler for the tap event.
		 */
		_onTap: function (e) {

			this.__fireNodeEvent("nodeClick", e);
		},

		/**
		 * Event handler for the mouseup event.
		 * Used to generate a nodeClick when using the right button.
		 */
		_onMouseUp: function (e) {

			if (e.getButton() !== "left")
				this.__fireNodeEvent("nodeClick", e);
		},

		/**
		 * Event handler for the dbltap event.
		 */
		_onDblTap: function (e) {

			this.__fireNodeEvent("nodeDblClick", e);
		},

		/**
		 * Event handler for the pointer over event.
		 */
		_onPointerOver: function (e) {

			this.addState("hovered");

			this.__fireNodeEvent("nodeMouseOver", e);
		},

		/**
		 * Event handler for the pointer out event.
		 */
		_onPointerOut: function (e) {

			this.removeState("hovered");

			this.__fireNodeEvent("nodeMouseOut", e);

		},

		__fireNodeEvent: function (type, pointerEvent) {

			var node = this;
			var treeView = this.getTree();

			if (treeView != null) {
				treeView.fireEvent(
					type,
					wisej.web.virtualTreeView.NodeEvent,
					[pointerEvent, node]);
			}
		},

		// overridden
		_addWidgets: function () {

			this.addSpacer();
			this.addOpenButton();
			this.addCheckBox();
			this.addIconState();
			this.addIcon();
			this.addLabel();
		},

		__showLoader: function () {

			if (this.getShowLoader()) {
				if (this.getModel().getChildren().length === 0) {
					var open = this.getChildControl("open", true);
					if (open) {
						open.setSource(this.getLoader());
					}
				}
			}
		},

		__hideLoader: function () {

			if (this.getShowLoader()) {
				var open = this.getChildControl("open", true);
				if (open) {
					open.resetSource();
				}
			}
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "open":
					control = new wisej.web.treeview.OpenButton().set({
						alignY: "middle"
					});
					control.addListener("tap", this._onOpenCloseTap, this);
					control.addListener("resize", this._updateIndent, this);
					break;

				case "label":
					control = this.base(arguments, id).set({
						rich: true,
						wrap: false,
						anonymous: false
					});
					control.getContentElement().setStyle("overflow", "visible");
					control.addListener("pointerdown", this._onNodeLabelPointerDown, this);
					break;

				case "checkbox":
					control = new qx.ui.form.CheckBox().set({
						show: "icon",
						alignY: "middle",
						focusable: false,
						keepActive: true,
						triState: true,
						visibility: "excluded"
					});
					// override _onExecute to prevent the automatic toggling.
					control.removeListener("execute", control._onExecute, control);
					// prevent tap events to selected the checked node.
					control.addListener("tap", this._onNodeCheckBoxTap, this);
					// check/uncheck the node's checkbox widget,
					control.addListener("execute", this._onNodeCheckBoxExecute, this);
					break;

				case "state":
					control = new qx.ui.basic.Image().set({
						visibility: "excluded",
						alignY: "middle"
					});
					break;
			}

			return control || this.base(arguments, id);
		},

		// handles clicks on the open/close button.
		_onOpenCloseTap: function (e) {

			this.isOpen()
				? this.collapse()
				: this.expand();
		},

		// edits the label when the pointer is released over an already selected node.
		_onNodeLabelPointerDown: function (e) {

			var treeView = this.getTree();
			if (treeView != null && treeView.isLabelEdit()) {

				if (!treeView.hasState("focused"))
					return;

				var selection = treeView.getSelection();
				if (selection.indexOf(this.getModel()) > -1) {

					// save the pointer position, it must be in the same place
					// when the pointer is released.

					var posX = e.getDocumentLeft();
					var posY = e.getDocumentTop();

					e.getTarget().addListenerOnce("pointerup", function (e) {

						if (posX == e.getDocumentLeft() && posY == e.getDocumentTop()) {
							treeView._beginEditItem(this);
						}

					}, this);

				}
			}
		},

		// overridden
		_shouldShowOpenSymbol: function () {

			var treeView = this.getTree();
			if (treeView && treeView.getHideOpenClose())
				return false;

			return this.base(arguments);
		},

		// handle the node's checkbox.
		_onNodeCheckBoxExecute: function (e) {

			var treeView = this.getTree();
			if (treeView)
				treeView.fireDataEvent("nodeCheckClick", this.getModel());
		},

		// stop the treeview from selecting the node when checking the node.
		_onNodeCheckBoxTap: function (e) {
			e.stop();
		},

		// overridden.
		_onChangeChildProperty: function (e) {

			this.base(arguments, e);

		},

		/**
		 * Overridden.
		 * returns the node's visible rectangle clipped
		 * by the owner tree view.
		 *
		 * Note: used by the tooltip manager to place the node's
		 * tooltip in relation to the tree view and the node.
		 */
		getContentLocation: function () {

			var nodeBounds = this.base(arguments);

			var treeView = this.getTree();
			if (treeView) {
				var treeBounds = treeView.getContentLocation();
				nodeBounds.left = treeBounds.left;
				nodeBounds.right = treeBounds.right;
			}
			return nodeBounds;
		}
	}

});


/**
 * wisej.web.virtualTreeView.NodeEvent
 *
 * Specialized data event holding mouse and node information.
 */
qx.Class.define("wisej.web.virtualTreeView.NodeEvent", {

	extend: qx.event.type.Pointer,

	members: {

		__data: null,

		/**
		 * Initializes an event object.
		 *
		 * @param pointerEvent {qx.event.type.Pointer} The original pointer event
		 * @param item {wisej.web.VirtualTreeItem} The node target of the event.
		 *
		 * @return {qx.event.type.Data} the initialized instance.
		 */
		init: function (pointerEvent, item) {

			pointerEvent.clone(this);
			this.setBubbles(false);

			// determine the local coordinates.
			var x = null;
			var y = null;

			if (item) {
				var treeView = item.getTree();
				if (treeView) {
					var el = treeView.getContentElement().getDomElement();
					if (el) {
						var clientRect = el.getBoundingClientRect();
						x = Math.max(0, pointerEvent.getDocumentLeft() - clientRect.left) | 0;
						y = Math.max(0, pointerEvent.getDocumentTop() - clientRect.top) | 0;
					}
				}
			}

			this.__data = { node: item.getModel(), x: x, y: y };

			return this;
		},

		/**
		 * The new data of the event sending this data event.
		 * The return data type is the same as the event data type.
		 *
		 * @return {var} The new data of the event
		 */
		getData: function () {
			return this.__data;
		}

	}

});


/**
 * wisej.web.virtualTreeView.LabelEditor
 *
 */
qx.Class.define("wisej.web.virtualTreeView.LabelEditor", {

	extend: wisej.web.treeview.LabelEditor,

	members: {

		// overridden.
		_fireEndEdit: function (node, text) {
			this.base(arguments, node.getModel(), text);
		}
	}
});
