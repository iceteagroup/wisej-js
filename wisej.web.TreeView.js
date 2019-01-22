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
 * wisej.web.TreeView
 */
qx.Class.define("wisej.web.TreeView", {

	extend: qx.ui.tree.Tree,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	construct: function () {

		this.base(arguments);

		this.addListener("dragstart", this._onItemDrag, this);

		// add local state properties.
		this.setStateProperties(this.getStateProperties().concat(["topNode"]));

		// reset the cached metrics when scrolling or resizing.
		this.addListener("resize", this.__resetCachedTopNode);
		this.addListener("scrollAnimationYEnd", this.__resetCachedTopNode);
	},

	properties: {

		/**
		 * Root property.
		 *
		 * Sets or gets the root node.
		 */
		rootNode: { init: null, nullable: true, check: "wisej.web.TreeNode", apply: "_applyRootNode", transform: "_transformComponent" },

		/**
		 * TopNode property.
		 *
		 * Property defined with the setter/getter methods.
		 *
		 * Returns or sets the node displayed at the top of the tree view.
		 */
		// topNode: { init: null, nullable: true, check: "wisej.web.TreeNode", apply: "_applyTopNode", transform: "_transformComponent" },

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
		 *  ItemHeight property.
		 *  
		 *  Default item height.
		 */
		itemHeight: { check: "Integer", init: 25, apply: "_applyItemHeight", themeable: true },

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
		 * @param node {wisej.web.TreeNode} node to scroll into view.
		 */
		ensureVisible: function (node) {

			if (node)
				this.scrollChildIntoView(node);
		},

		/**
		 * Edits the label of the specified node.
		 * 
		 * @param {wisej.web.TreeNode} node to edit.
		 */
		editNode: function (node) {

			if (node && this.isLabelEdit()) {
				qx.event.Timer.once(function () {

					this.scrollChildIntoView(node);
					var editor = this.getChildControl("editor");
					editor.editNode(node);

				}, this, 1);
			}
		},

		/**
		 * Applies the root node.
		 *
		 * We simply assign the root node to the base root property.
		 * The rootNode property is needed here only to convert the incoming string id
		 * to a component reference.
		 */
		_applyRootNode: function (value, old) {

			this.setRoot(value);

		},

		/**
		 * Applies the fileAppearance properties.
		 */
		_applyFileAppearance: function (value, old) {

			this.__forEachNode(function (node) {
				node.setFileAppearance(value);
			});
		},

		/**
		 * Applies the folderAppearance properties.
		 */
		_applyFolderAppearance: function (value, old) {

			this.__forEachNode(function (node) {
				node.setFolderAppearance(value);
			});
		},

		/**
		 * Applies the icon property.
		 *
		 * Updates all the nodes and child nodes that don't specify their own icon.
		 */
		_applyIcon: function (value, old) {

			this.__forEachNode(function (node) {
				if (!node.hasState("opened"))
					node._updateIcon();
			});
		},

		/**
		 * Applies the iconSize and iconStateSize properties.
		 *
		 * Updates all the nodes and child nodes.
		 */
		_applyIconSize: function (value, old, name) {

			name = (name == "iconSize") ? "icon" : "iconState";

			this.__forEachNode(function (node) {
				node._updateIconSize(value, name);
			});
		},

		/**
		 * Applies the iconOpened property.
		 *
		 * Updates all the nodes and child nodes that don't specify their own icon.
		 */
		_applyIconOpened: function (value, old) {

			this.__forEachNode(function (node) {
				if (node.hasState("opened"))
					node._updateIcon();
			});
		},

		/**
		 * Applies the checkBoxIcons property.
		 */
		_applyCheckBoxIcons: function (value, old) {

			// works only if the checkbox property is true.
			if (this.isCheckBoxes()) {

				var checkBoxIcons = this.getCheckBoxIcons();
				this.__forEachNode(function (node) {
					node._updateCheckBoxIcons(checkBoxIcons);
				});
			}
		},

		/**
		 * Applies the showNodeToolTips property.
		 */
		_applyShowNodeToolTips: function (value, old) {

			var block = !value;
			this.__forEachNode(function (node) {
				node.setBlockToolTip(block);
			});
		},

		/**
		 * Applies the iconSelected property.
		 *
		 * Updates all the nodes and child nodes that don't specify their own icon.
		 */
		_applyIconSelected: function (value, old) {

			this.__forEachNode(function (node) {
				if (node.hasState("selected"))
					node._updateIcon();
			});

		},

		/**
		 * Applies the hideOpenClose property.
		 */
		_applyHideOpenClose: function (value, old) {

			this.__forEachNode(function (node) {
				node._updateIndent();
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

			this.__forEachNode(function (node) {

				if (value == null || value == -1)
					node.resetIndent();
				else
					node.setIndent(value);
			});
		},

		/**
		 * Applies the itemHeight property.
		 */
		_applyItemHeight: function (value, old) {

			if (value == old)
				return;

			if (value == null || value == -1) {
				this.resetItemHeight();
			}
			else {
				this.__forEachNode(function (node) {
					node.setHeight(value);
				});
			}
		},

		/**
		 * Applies the checkBoxes property.
		 *
		 * The property value is propagated to all child nodes.
		 */
		_applyCheckBoxes: function (value, old) {

			this.__forEachNode(function (node) {
				node._updateCheckBox(value);
			});
		},

		/**
		 * Applies the hideIcons property.
		 *
		 * The property value is propagated to all child nodes.
		 */
		_applyHideIcons: function (value, old) {

			this.__forEachNode(function (node) {
				node._updateHideIcon(value);
			});
		},

		/**
		 * Iterates all nodes and child nodes.
		 */
		__forEachNode: function (callback) {

			if (callback) {
				var root = this.getRoot();
				if (root) {
					var allNodes = root.getItems(true);
					for (var i = 0; i < allNodes.length; i++) {

						if (callback(allNodes[i]) === false)
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

				this.setSelection(value);

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

			if (value.length == 0) {

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
				var pane = this.getChildControl("pane");
				var widget = wisej.utils.Widget.getWidgetFromPoint(pane, 0, 1);

				if (widget instanceof wisej.web.TreeNode)
					this.__topNode = widget;
			}

			return this.__topNode != null ? this.__topNode.getId() : null;
		},
		setTopNode: function (node) {

			node = this._transformComponent(node);
			if (node != this.__topNode) {
				if (node) {
					this.scrollChildIntoViewY(node, "top");
				}
				this.__topNode = undefined;
			}
		},

		// cached top node. avoid searching for the top node every time we need to update the state.
		__topNode: undefined,

		__resetCachedTopNode: function (e) {

			this.__topNode = undefined;
		},

		// updates the properties of the node using the values
		// set in the tree parent.
		_updateNode: function (node) {

			node._updateIconSize(this.getIconSize(), "icon");
			node._updateIconSize(this.getIconStateSize(), "iconState");
			node._updateCheckBox(this.getCheckBoxes());
			node._updateCheckBoxIcons(this.getCheckBoxIcons());
			node.setBlockToolTip(!this.getShowNodeToolTips());
			node.setFileAppearance(this.getFileAppearance());
			node.setFolderAppearance(this.getFolderAppearance());
			node.setHeight(this.getItemHeight());

			if (node.hasChildren()) {
				var nodes = node.getItems(false);
				for (var i = 0; i < nodes.length; i++) {
					this._updateNode(nodes[i]);
				}
			}
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "editor":
					control = new wisej.web.treeview.LabelEditor().set({
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
		_onChangeSelection: function (e) {

			clearTimeout(this.__editNodeTimer);
			this.__editNodeTimer = 0;

			this.base(arguments, e);

			if (!this.__inApplySelectedNodes)
				this.fireDataEvent("selectionChanged", e.getData());
		},

		_onKeyPress: function (e) {

			var node = this._getLeadItem();
			if (node !== null) {
				switch (e.getKeyIdentifier()) {
					case "-":
					case "Left":
						if (node.isOpen()) {
							node.collapse();
						}
						else {
							var parentNode = node.getParent();
							if (parentNode && parentNode.isVisible())
								this.setSelection([parentNode]);
						}
						return;

					case "+":
					case "Right":
						if (!node.isOpen())
							node.expand();
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
							node.isOpen()
								? node.collapse()
								: node.expand();
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

			var node = this.getTreeItem(e.getTarget());
			if (node == null)
				return;

			node.isOpen()
				? node.collapse()
				: node.expand();

			e.stopPropagation();
		},

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
		 * Starts the timer to start editing the node.
		 */
		_beginEditNode: function (node) {

			if (!this.isWired("beginEdit")) {
				this.editNode(node);
			}
			else {

				clearTimeout(this.__editNodeTimer);
				this.__editNodeTimer = 0;

				var me = this;
				this.__editNodeTimer = setTimeout(function () {
					me.fireDataEvent("beginEdit", node);
				}, 100);
			}
		},

		// timer used to start editing the current node.
		__editNodeTimer: 0
	}
});


/**
 * wisej.web.TreeNode
 */
qx.Class.define("wisej.web.TreeNode", {

	extend: qx.ui.tree.TreeFolder,

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
		 * Nodes property.
		 *
		 * Assigns the list of nodes as children of this node.
		 *
		 * This property is defined with the setter/getter methods.
		 */
		// nodes: { init: null, nullable: true, check: "Array", apply: "_applyNodes", transform: "_transformComponents" },

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
		 * Index property.
		 *
		 * The position of this node within the node collection it belongs to.
		 */
		index: { init: 0, check: "Integer", apply: "_applyIndex" },

		/**
		 * ParentNode property.
		 *
		 * The node that owns this node. Root nodes are owned by the root.
		 *
		 * This property is defined with the setter/getter methods.
		 */
		// parentNode: { init: null, nullable: true, apply: "_applyParentNode", transform: "_transformComponent" },

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

			if (this.isOpen() || !this.isOpenable() || !this.isEnabled())
				return;

			var treeView = this.getTree();
			if (treeView == null || !treeView.isEnabled())
				return;

			// fire the event on the server, unless in design mode.
			if (wisej.web.DesignMode) {
				this.setOpen(true);
			}
			else {
				this.__showLoader();
				treeView.fireDataEvent("expand", this);
			}
		},

		/**
		 * Collapses the node. Fires the collapse event and lets
		 * the server handle the expanded state.
		 */
		collapse: function () {

			if (!this.isOpen() || !this.isEnabled())
				return;

			var treeView = this.getTree();
			if (treeView == null || !treeView.isEnabled())
				return;

			// fire the event on the server, unless in design mode.
			if (wisej.web.DesignMode) {
				this.setOpen(false);
			}
			else {
				this.__hideLoader();
				treeView.fireDataEvent("collapse", this);
			}
		},

		/**
		 * Applies the nodes property.
		 *
		 * Loads the node widgets as children of this node.
		 */
		getNodes: function () {

			return this.getChildren();
		},
		setNodes: function (value) {

			value = this._transformComponents(value);

			this.removeAll();

			var treeView = this.getTree();

			var nodes = value;
			if (nodes != null && nodes.length > 0) {
				for (var i = 0; i < nodes.length; i++) {

					this.add(nodes[i]);

					if (treeView)
						treeView._updateNode(nodes[i]);
				}
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
			this.__hideLoader();
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
				this.__hideLoader(true);
		},

		removeState: function (state) {

			this.base(arguments, state);

			if (state == "selected" || state == "opened")
				this._updateIcon();

		},

		addState: function (state) {

			this.base(arguments, state);

			if (state == "selected" || state == "opened")
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

			if (!jobs || !jobs["updateIcon"])
				return;

			var icon = this.getChildControl("icon");
			if (icon == null)
				return;

			var treeView = this.getTree();
			if (treeView == null)
				return;

			if (this.hasState("selected")) {
				var source = this.getIconSelected()
								|| treeView.getIconSelected();

				if (source) {
					icon.setSource(source);
					return;
				}
			}

			if (this.hasState("opened")) {
				var source = this.getIconOpened()
								|| treeView.getIconOpened();

				if (source) {
					icon.setSource(source);
					return;
				}
			}

			var source = this.__getUserIcon()
							|| treeView.getIcon()
							|| this.__getThemeIcon();

			if (source)
				icon.setSource(source);
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
		 * Applies the index property.
		 *
		 * If the node already belongs to a collection, it changes the position accordingly.
		 */
		_applyIndex: function (value, old) {

			var parentNode = this.getParent();
			if (parentNode != null) {

				if (parentNode.getChildren().indexOf(this) == value)
					return;

				parentNode.addAt(this, value);
			}
		},

		/**
		 * Applies the parentNode property.
		 *
		 * If the value is null, the node is removed from the collection.
		 * If the value is a valid TreeNde and this node doesn't already belong to the collection
		 * it adds at the specified index.
		 */
		getParentNode: function () {

			return this.getParent();

		},
		setParentNode: function (value) {

			value = this._transformComponent(value);

			// same owner?
			var old = this.getParent();
			if (old == value)
				return;

			// remove from the previous owner.
			if (old != null)
				old.remove(this);

			if (value != null) {

				var treeView = value.getTree();
				value.addAt(this, this.getIndex());
				if (treeView)
					treeView._updateNode(this);
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

			if (e.getButton() != "left")
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

			if (!this.isEnabled())
				return;

			var treeView = this.getTree();
			if (treeView == null || !treeView.isEnabled())
				return;

			this.addState("hovered");

			this.__fireNodeEvent("nodeMouseOver", e);
		},

		/**
		 * Event handler for the pointer out event.
		 */
		_onPointerOut: function (e) {

			if (!this.isEnabled())
				return;

			var treeView = this.getTree();
			if (treeView == null || !treeView.isEnabled())
				return;

			this.removeState("hovered");

			this.__fireNodeEvent("nodeMouseOut", e);

		},

		__fireNodeEvent: function (type, pointerEvent) {

			var node = this;
			var treeView = this.getTree();

			if (treeView != null) {
				treeView.fireEvent(
					type,
					wisej.web.treeview.NodeEvent,
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
				if (this.getChildren().length == 0) {
					var open = this.getChildControl("open", true);
					if (open) {
						open.setSource(this.getLoader());
					}
				}
			}
		},

		__hideLoader: function (force) {

			if (force || this.getShowLoader()) {
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
				if (selection.indexOf(this) > -1) {

					// save the pointer position, it must be in the same place
					// when the pointer is released.

					var posX = e.getDocumentLeft();
					var posY = e.getDocumentTop();

					e.getTarget().addListenerOnce("pointerup", function (e) {

						if (posX == e.getDocumentLeft() && posY == e.getDocumentTop()) {
							treeView._beginEditNode(this);
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
				treeView.fireDataEvent("nodeCheckClick", this);
		},

		// stop the treeview from selecting the node when checking the node.
		_onNodeCheckBoxTap: function (e) {
			e.stop();
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
			return nodeBounds
		},

		// overridden.
		destroy: function () {

			// remove the node from its parent.
			var parent = this.getParent();
			if (parent)
				parent.remove(this);

			this.base(arguments);
		}
	}

});


/**
 * wisej.web.treeview.LabelEditor
 *
 * Extends the TextField class to edit the treenode label.
 */
qx.Class.define("wisej.web.treeview.LabelEditor", {

	extend: qx.ui.form.TextField,

	construct: function () {

		this.base(arguments);

		// listen to the lost focus to commit editing.
		this.addListener("blur", this._onBlur);

		// list to the keyboard to commit or cancel editing.
		this.addListener("keypress", this._onKeyPress);
	},

	properties: {

		// Appearance override
		appearance: { refine: true, init: "label-editor" }
	},

	members: {

		/**
		 * Begins editing the specified node.
		 */
		editNode: function (node) {

			// find the label, the edit control will replace it.
			var label = node.getChildControl("label");
			var nodeBounds = node.getBounds();
			var labelBounds = label.getBounds();

			label.hide();

			node._add(this);
			node.addState("editing");
			this.setValue(qx.bom.String.unescape(label.getValue()));
			this.setUserBounds(labelBounds.left, 0, nodeBounds.width - labelBounds.left, nodeBounds.height);

			this.show();
			this.focus();
		},

		endEdit: function (cancel) {

			// get the owner node.
			var node = this.getLayoutParent();
			if (node) {

				// restore the label.
				var label = node.getChildControl("label");
				label.show();
				node._remove(this);
				node.removeState("editing");

				this._fireEndEdit(node, cancel === true ? null : this.getValue());
			}
		},

		_fireEndEdit: function (node, text) {

			this.fireDataEvent("endEdit", {
				node: node,
				text: text
			});
		},

		_onBlur: function (e) {

			if (this.isVisible())
				this.endEdit(true);
		},

		_onKeyPress: function (e) {

			switch (e.getKeyIdentifier()) {

				case "Escape":
					this.endEdit(true);
					break;

				case "Enter":
					this.endEdit();
					break;
			}

			e.stopPropagation();
		}

	}
});


/**
 * wisej.web.treeview.OpenButton
 * 
 * Extends the FolderOpenButton to prevent the nodes from
 * expanding and collapsing automatically. We fire the beforeExpand
 * and beforeCollapse event to let the server handle the node's state.
 */
qx.Class.define("wisej.web.treeview.OpenButton", {

	extend: qx.ui.tree.core.FolderOpenButton,

	members: {

		// overridden and disabled.
		_onTap: function (e) {
			e.stopPropagation();
		}
	}

});


/**
 * wisej.web.treeview.NodeEvent
 *
 * Specialized data event holding mouse and node information.
 */
qx.Class.define("wisej.web.treeview.NodeEvent", {

	extend: qx.event.type.Pointer,

	members: {

		__data: null,

		/**
		 * Initializes an event object.
		 *
		 * @param pointerEvent {qx.event.type.Pointer} The original pointer event
		 * @param node {wisej.web.TreeNode} The node target of the event.
		 *
		 * @return {qx.event.type.Data} the initialized instance.
		 */
		init: function (pointerEvent, node) {

			pointerEvent.clone(this);
			this.setBubbles(false);

			// determine the local coordinates.
			var x = null;
			var y = null;

			if (node) {
				var treeView = node.getTree();
				if (treeView) {
					var el = treeView.getContentElement().getDomElement();
					if (el) {
						var clientRect = el.getBoundingClientRect();
						x = Math.max(0, pointerEvent.getDocumentLeft() - clientRect.left) | 0;
						y = Math.max(0, pointerEvent.getDocumentTop() - clientRect.top) | 0;
					}
				}
			}

			this.__data = { node: node, x: x, y: y };

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
		},

	}

});
