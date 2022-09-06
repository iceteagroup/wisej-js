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
 * wisej.web.Panel
 */
qx.Class.define("wisej.web.Panel", {

	extend: wisej.web.ScrollableControl,

	construct: function () {

		this.base(arguments);

		this.initShowCaption();
		this.initShowCloseButton();
		this.addState("horizontal");
		this.addState("barTop");

		this.addListener("pointerout", this.__onPointerOutPanel);
		this.addListener("pointerover", this.__onPointerOverPanel);

		// rightToLeft support.
		this.addListener("changeRtl", this._onRtlChange, this);
	},

	statics: {

		// animation settings.
		ANIMATE_AUTOSHOW: true,
		AUTOSHOW_DURATION: 100,
		AUTOHIDE_DURATION: 150,
		DBLCLICK_DELAY: 150,
		AUTOSHOW_DELAY: 250,
	},

	properties: {

		// overridden.
		appearance: { init: "panel", refine: true },

		/**
		 * Caption property
		 *
		 * Sets the text to show in the caption of the panel.
		 */
		caption: { init: null, check: "String", apply: "_applyCaption", nullable: true },

		/**
		 * CaptionPosition property.
		 *
		 * Sets the alignment of the caption bar.
		 */
		captionPosition: { init: "top", check: ["top", "left", "right", "bottom"], apply: "_applyCaptionPosition" },

		/**
		 * CaptionAlignment property.
		 *
		 * Sets the alignment of the caption bar.
		 */
		captionAlignment: { init: "left", check: ["left", "center", "right"], apply: "_applyCaptionAlignment" },

		/**
		 * Collapsed property.
		 *
		 * Collapses or expands the panel. When the panel is collapsed only the caption is visible.
		 * If the panel is collapsed and the caption is not visible, then the panel is set to be
		 * the height of the border, if any.
		 */
		collapsed: { init: false, check: "Boolean", apply: "_applyCollapsed" },

		/**
		 * CollapseSide property.
		 *
		 * Indicates to which side should the panel header collapse to.
		 */
		collapseSide: { init: "top", check: ["top", "left", "right", "bottom"] },

		/**
		 * AutoShow property.
		 *
		 * Allows the panel to automatically expand as an overlay when clicking the title.
		 */
		autoShow: { init: "never", check: ["never", "onClick", "onPointerOver"] },

		/**
		 * AutoHideDelay property.
		 *
		 * Sets the delay in milliseconds for the panel to automatically collapse
		 * when it was auto-expanded and is shown as an overlay and the mouse moves out of the panel.
		 */
		autoHideDelay: { init: 350, check: "PositiveInteger", themeable: true },

		/**
		 * ShowCaption property.
		 *
		 * Shows or hides the caption.
		 */
		showCaption: { init: false, check: "Boolean", apply: "_applyShowCaption" },

		/**
		 * ShowCloseButton property.
		 *
		 * Shows or hides the close button in the caption.
		 */
		showCloseButton: { init: true, check: "Boolean", apply: "_applyShowCloseButton" },

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
		iconSize: { init: null, nullable: true, apply: "_applyIconSize", nullable: true },

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
		 * HeaderSize property.
		 *
		 * Changes the size of the caption bar.
		 */
		headerSize: { init: null, check: "Map", apply: "_applyHeaderSize", nullable: true },

		/**
		 * RestoreBounds property.
		 *
		 * Sets the expanded size and location of the collapsed panel.
		 */
		restoreBounds: { init: null, check: "Map" },

		/**
		 * Tools property.
		 *
		 * Collection of tool definitions to display on the caption bar.
		 */
		tools: { check: "Array", apply: "_applyTools" }

	},

	members: {

		// overridden: forwarded states.
		_forwardStates: {
			vertical: true,
			horizontal: true,
			collapsed: true,
			floating: true,
			barTop: true,
			barLeft: true,
			barRight: true,
			barBottom: true
		},

		// timer to hide the panel that was auto shown.
		__hideTimer: 0,

		// caption single/double click differentiator timer
		__captionTapTimer: 0,

		// timer to auto show the collapsed panel when the pointer is over the header.
		__captionOverTimer: 0,

		// layout manager for the caption bar.
		__captionLayout: null,

		// saved caption position for the expanded panel state.
		__restoreCaptionPosition: null,

		// the handler for the current floating/unfloating animation.
		__animationHandle: null,

		// floating flag, set when the inner content is shown while the panel is collapsed.
		__floating: false,

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

			var title = this.getChildControl("title");

			if (this.__isVertical()) {

				var alignX = "center";
				var alignY = "middle";
				switch (value) {

					case "left":
						alignY = "bottom";
						break;

					case "right":
						alignY = "top";
						break;

					case "center":
						alignY = "middle";
						break;
				}

				title.setAlignX(alignX);
				title.setAlignY(alignY);
				title.setTextAlign("left");
			}
			else {
				title.setAlignX("left");
				title.setAlignY("middle");
				title.setTextAlign(value);
			}
		},

		/**
		 * Applies the captionPosition property.
		 */
		_applyCaptionPosition: function (value, old) {

			if (value == old)
				return;

			this.removeState("barTop");
			this.removeState("barLeft");
			this.removeState("barRight");
			this.removeState("barBottom");

			var caption = this.getChildControl("captionbar");

			switch (value) {
				case "top":
					this.addState("barTop");
					this.addState("horizontal");
					this.removeState("vertical");
					caption.setLayoutProperties({ edge: "north" });
					break;

				case "left":
					this.addState("barLeft");
					this.addState("vertical");
					this.removeState("horizontal");
					caption.setLayoutProperties({ edge: "west" });
					break;

				case "right":
					this.addState("barRight");
					this.addState("vertical");
					this.removeState("horizontal");
					caption.setLayoutProperties({ edge: "east" });
					break;

				case "bottom":
					this.addState("barBottom");
					this.addState("horizontal");
					this.removeState("vertical");
					caption.setLayoutProperties({ edge: "south" });
					break;
			}

			this.syncAppearance();

			if (this.getContentElement().getDomElement()) {
				this.__layoutCaptionBar();
				this.__rotateCaptionBar();
			}
			else {

				this.addListenerOnce("appear", function () {
					this.__layoutCaptionBar();
					this.__rotateCaptionBar();
				});
			}
		},

		__rotateCaptionBar: function () {

			var title = this.getChildControl("title");
			var closeButton = this.getChildControl("close-button");

			var dockSide = this.__getDockSide();

			// rotate the internal widgets.
			title.resetWidth();
			title.resetHeight();
			title.resetMaxWidth();
			title.resetMinWidth();
			title.resetMaxHeight();
			title.resetMinHeight();
			title.invalidateLayoutCache();
			closeButton.resetMaxWidth();
			closeButton.resetMinWidth();
			closeButton.resetMaxHeight();
			closeButton.resetMinHeight();

			wisej.utils.Widget.rotate(closeButton, dockSide);
			wisej.utils.Widget.rotate(title, dockSide === "bottom" ? "none" : dockSide);

			// change the position of the tool containers.
			if (this.__leftToolsContainer)
				this.__leftToolsContainer.setPosition(dockSide);
			if (this.__rightToolsContainer)
				this.__rightToolsContainer.setPosition(dockSide);

			// re-apply the header size when changing orientation.
			this._applyHeaderSize(this.getHeaderSize());
		},

		__layoutCaptionBar: function () {

			var icon = this.getChildControl("icon");
			var title = this.getChildControl("title");
			var closeButton = this.getChildControl("close-button");

			if (this.__isVertical()) {

				//       0
				//  0: close
				//  1: tools
				//  2: title
				//  3: tools
				//  4: icon

				icon.setLayoutProperties({ row: 4, column: 0 });
				title.setLayoutProperties({ row: 2, column: 0 });
				closeButton.setLayoutProperties({ row: 0, column: 0 });

				if (this.__leftToolsContainer)
					this.__leftToolsContainer.setLayoutProperties({ row: 3, column: 0 });
				if (this.__rightToolsContainer)
					this.__rightToolsContainer.setLayoutProperties({ row: 1, column: 0 });

				this.__captionLayout.setRowFlex(0, 0);
				this.__captionLayout.setRowFlex(1, 0);
				this.__captionLayout.setRowFlex(2, 1);
				this.__captionLayout.setColumnFlex(0, 1);

			}
			else {

				//      0      1       2       3       4
				// 0: icon | tools | title | tools | close

				icon.setLayoutProperties({ row: 0, column: 0 });
				title.setLayoutProperties({ row: 0, column: 2 });
				closeButton.setLayoutProperties({ row: 0, column: 4 });

				if (this.__leftToolsContainer) {
					this.__leftToolsContainer.setLayoutProperties({ row: 0, column: 1 });
				}
				if (this.__rightToolsContainer) {
					this.__rightToolsContainer.setLayoutProperties({ row: 0, column: 3 });
				}

				this.__captionLayout.setRowFlex(0, 1);
				this.__captionLayout.setColumnFlex(0, 0);
				this.__captionLayout.setColumnFlex(2, 1);
				this.__captionLayout.setColumnFlex(3, 0);
			}

			this._applyCaptionAlignment(this.getCaptionAlignment());
		},

		/**
		 * Applies the collapsed property.
		 *
		 * When the panel is collapsed it applies the height (or the width if vertical) directly
		 * to the element and preserves the width/height properties.
		 */
		_applyCollapsed: function (value, old) {

			if (value == old)
				return;

			this.__stopCurrentAnimation();

			// restore the z-index, or the splitter will go behind the panel.
			if (this.__floating) {
				this.__unfloat(true);
			}

			var pane = this.getChildControl("pane");

			if (value) {

				if (!wisej.web.DesignMode)
					pane.hide();

				// save and reset the minimum size when collapsed.
				this.setUserData("minWidth", this.getMinWidth());
				this.setUserData("minHeight", this.getMinHeight());
				this.resetMinWidth();
				this.resetMinHeight();

				// save the caption position before the panel is collapsed.
				// we need it to compare it with the collapse side when auto showing.
				this.__restoreCaptionPosition = this.getCaptionPosition();

				this.addState("collapsed");
				this.fireEvent("collapse");
			}
			else {

				// restore the minimum size when expanded.
				this.setMinWidth(this.getUserData("minWidth") | 0);
				this.setMinHeight(this.getUserData("minHeight") | 0);

				pane.show();
				this.removeState("collapsed");
				this.fireEvent("expand");
			}

			this.__updateResizableEdges();
		},

		// disables the resizable edge that could modify the collapsed side.
		__updateResizableEdges: function () {

			if (this.isCollapsed()) {

				// limit the resizable edges.
				if (this.__isVertical()) {
					this.setResizableLeft(false);
					this.setResizableRight(false);
				}
				else {
					this.setResizableTop(false);
					this.setResizableBottom(false);
				}
			}
			else {

				// restore the configured resizable edges if the panel is not collapsed.
				this._applyResizableEdges(this.getResizableEdges());
			}
		},

		/**
		 * Applies the showCaption property.
		 */
		_applyShowCaption: function (value, old) {

			var captionbar = this.getChildControl("captionbar");

			value
				? captionbar.show()
				: captionbar.exclude();

			if (value && old !== false)
				caption._mirrorChildren(this.getRtl());
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


		/** 
		 * Applies the tools property.
		 */
		_applyTools: function (value, old) {

			if (value == null)
				return;

			if (value.length == 0 && (old == null || old.length == 0))
				return;

			var position = this.__getDockSide();
			var vertical = position === "left" || position === "right";
			var captionBar = this.getChildControl("captionbar");
			wisej.web.ToolContainer.install(this, captionBar, value, "left", vertical ? { row: 3, column: 0 } : { row: 0, column: 1 }, position, "panel");
			wisej.web.ToolContainer.install(this, captionBar, value, "right", vertical ? { row: 1, column: 0 } : { row: 0, column: 3 }, position, "panel");
		},

		/**
		 * Applies the headerBackgroundColor property.
		 */
		_applyHeaderBackgroundColor: function (value, old) {

			var captionBar = this.getChildControl("captionbar");

			if (value) {
				captionBar.setBackgroundColor(value);
				var colorMgr = qx.theme.manager.Color.getInstance();
				this.getContentElement().setStyle("borderColor", colorMgr.resolve(value));
			}
			else {
				captionBar.resetBackgroundColor();
				this.getContentElement().setStyle("borderColor", null);
			}
		},

		/**
		 * Applies the headerTextColor property.
		 */
		_applyHeaderTextColor: function (value, old) {

			this.getChildControl("captionbar").setTextColor(value);
		},

		/**
		 * Applies the headerSize property.
		 */
		_applyHeaderSize: function (value, old) {

			var captionBar = this.getChildControl("captionbar");

			if (value && value > -1) {
				if (this.__isVertical()) {
					captionBar.resetHeight();
					captionBar.resetMaxHeight();
					captionBar.setWidth(value);
					captionBar.setMaxWidth(value);
				}
				else {
					captionBar.resetWidth();
					captionBar.resetMaxWidth();
					captionBar.setHeight(value);
					captionBar.setMaxHeight(value);
				}
			}
			else {
				captionBar.resetHeight();
				captionBar.resetMaxHeight();
				captionBar.resetWidth();
				captionBar.resetMaxWidth();
			}
		},

		// floats the collapsed panel.
		__float: function (force) {

			this.__floating = true;

			var el = this.getContentElement();
			var dockSide = this.__getDockSide();
			var pane = this.getChildControl("pane");
			var expandedBounds = this.getRestoreBounds();
			var captionbar = this.getChildControl("captionbar");

			// make sure the floating panel is above the other widgets.
			el.setStyle("z-index", 9999);

			// update the inner pane's layout to show inner controls without
			// changing the container's layout. the inner pane is still invisible since
			// the container is collapsed and overflow = hidden.
			// make the inner container visible immediately (the pane is still collapsed anyway)
			pane.show();

			// calculate the pane bounds within the panel, it may be different
			// from the original bounds since the panel may be collapsed on a different side.
			var insets = this.getInsets();

			if (this.isShowCaption() && dockSide == this.__restoreCaptionPosition) {

				switch (dockSide) {
					case "top":
						insets.top += captionbar.getHeight();
						break;
					case "left":
						insets.left += captionbar.getWidth();
						break;
					case "right":
						insets.right += captionbar.getWidth();
						break;
					case "bottom":
						insets.bottom += captionbar.getHeight();
						break;
				}
			}

			pane.float(
				expandedBounds.width - insets.left - insets.right,
				expandedBounds.height - insets.top - insets.bottom);

			// when floating a panel collapsed to the right or to the bottom, "dock" the
			// captionbar to the right or to the bottom to keep the relative position of the inner floating pane.
			//
			// when floating from top or left, anchor the panel to the bottom/right to achieve
			// the sliding effect.
			var paneEl = pane.getContentElement();
			var captionEl = captionbar.getContentElement();
			switch (dockSide) {

				case "right":
					captionEl.__leftPosPx = captionEl.getStyle("left");
					captionEl.setStyles({ right: "0px", left: null }, true);
					break;

				case "bottom":
					captionEl.__topPosPx = captionEl.getStyle("top");
					captionEl.setStyles({ bottom: "0px", top: null }, true);
					break;

				case "top":
					paneEl.setStyles({ bottom: "0px", top: null }, true);
					break;

				case "left":
					paneEl.setStyles({ right: "0px", left: null }, true);
					break;
			}

			var top = expandedBounds.y;
			var left = expandedBounds.x;
			var width = expandedBounds.width;
			var height = expandedBounds.height;

			// change the expandedBounds to include the docked header (captionbar).
			if (this.isShowCaption() && dockSide != this.__restoreCaptionPosition) {

				switch (dockSide) {
					case "top":
						height += captionbar.getHeight();
						break;
					case "left":
						width += captionbar.getWidth();
						break;
					case "right":
						width += captionbar.getWidth();
						left -= captionbar.getWidth();
						break;
				}
			}

			// animate?
			if (wisej.web.Panel.ANIMATE_AUTOSHOW && force !== true) {

				this.__stopCurrentAnimation();

				// resize the panel.
				var me = this;
				this.__animationHandle = wisej.web.Animation.animate(

					this,

					// style
					{
						left: left + "px", width: width + "px",
						top: top + "px", height: height + "px"
					},

					// options
					{ duration: wisej.web.Panel.AUTOSHOW_DURATION }
				);
			}
			else {

				// otherwise resize the panel immediately.
				el.setStyles({
					left: left + "px", width: width + "px",
					top: top + "px", height: height + "px"
				});
			}
		},

		// hides the floating panel.
		__unfloat: function (force) {

			this.__floating = false;

			var el = this.getContentElement();
			var dockSide = this.__getDockSide();
			var pane = this.getChildControl("pane");
			var collapsedBounds = this.getBounds();
			var captionbar = this.getChildControl("captionbar");

			var top = collapsedBounds.top;
			var left = collapsedBounds.left;
			var width = collapsedBounds.width;
			var height = collapsedBounds.height;

			// animate?
			if (wisej.web.Panel.ANIMATE_AUTOSHOW && force !== true) {

				this.__stopCurrentAnimation();

				// resize the panel.
				var me = this;
				this.__animationHandle = wisej.web.Animation.animate(

					this,

					// style
					{
						left: left + "px", width: width + "px",
						top: top + "px", height: height + "px"
					},

					// options
					{ duration: wisej.web.Panel.AUTOHIDE_DURATION },

					// callbacks
					{
						end: function () {

							pane.hide();
							pane.unfloat();

							el.setStyle("z-index", me.getZIndex());

							// when unfloating a panel collapsed to the right or to the bottom, reset the
							// captionbar location since it was changed in __float.
							var captionEl = captionbar.getContentElement();
							if (dockSide === "right") {
								captionEl.setStyles({ right: null, left: captionEl.__leftPosPx });
							}
							else if (dockSide === "bottom") {
								captionEl.setStyles({ bottom: null, top: captionEl.__topPosPx });
							}
						}
					}
				);
			}
			else {

				// otherwise, unfloat the pane immediately.

				pane.hide();
				pane.unfloat();

				el.setStyle("z-index", this.getZIndex());
				el.setStyles({
					left: left + "px", width: width + "px",
					top: top + "px", height: height + "px"
				});

				// when unfloating a panel collapsed to the right or to the bottom, reset the
				// captionbar location since it was changed in __float.
				var captionEl = captionbar.getContentElement();
				if (dockSide === "right") {
					captionEl.setStyles({ right: null, left: captionEl.__leftPosPx });
				}
				else if (dockSide === "bottom") {
					captionEl.setStyles({ bottom: null, top: captionEl.__topPosPx });
				}
			}
		},

		// Stops the current floating or unfloating animation.
		__stopCurrentAnimation: function () {

			if (this.__animationHandle) {
				this.__animationHandle.stop();
				this.__animationHandle = null;
			}
		},

		// Handles the pointer out of the panel.
		// Collapses the panel that was auto-shown.
		__onPointerOutPanel: function (e) {

			// kill the single/double tap timer.
			if (this.__captionTapTimer > 0) {
				clearTimeout(this.__captionTapTimer);
				this.__captionTapTimer = 0;
			}

			if (!this.isCollapsed())
				return;

			// not expanded?
			if (!this.__floating)
				return;

			// already hiding?
			if (this.__hideTimer)
				return;

			var target = e.getRelatedTarget();
			if (!qx.ui.core.Widget.contains(this, target)) {

				// if the target is a popup, don't unfloat the floating panel, the user
				// may be hovering over a combo drop down or any other popup in the panel.
				for (var parent = target; parent != null; parent = parent.getLayoutParent()) {

					if (parent instanceof qx.ui.popup.Popup)
						return;
				}

				// restore the size directly on the element
				// without triggering a layout and a resize.
				var me = this;
				this.__hideTimer = setTimeout(function () {

					me.__unfloat();
					me.__hideTimer = 0;

				}, this.getAutoHideDelay());
			}

		},

		/**
		 * Handles the pointer over the panel.
		 *
		 * Terminates the autoHide timer.
		 */
		__onPointerOverPanel: function (e) {

			if (!this.isCollapsed())
				return;

			// kill the auto hide timer.
			if (this.__hideTimer > 0) {
				clearTimeout(this.__hideTimer);
				this.__hideTimer = 0;
			}
		},

		/**
		 * Handles clicks on the close button.
		 */
		__onCloseButtonClick: function (e) {

			this.toggleCollapsed();

		},

		/**
		 * Floats or unfloats the collapsed panel when the user taps/clicks on the caption bar.
		 */
		__onPointerTapCaptionBar: function (e) {

			if (!this.isCollapsed())
				return;

			if (this.getAutoShow() !== "onClick")
				return;

			if (this.__captionTapTimer > 0) {
				clearTimeout(this.__captionTapTimer);
				this.__captionTapTimer = 0;
			}

			var me = this;
			this.__captionTapTimer = setTimeout(function () {
				if (me.__floating)
					me.__unfloat();
				else if (me.isCollapsed())
					me.__float();
			}, wisej.web.Panel.DBLCLICK_DELAY);
		},

		/**
		 * Floats or unfloats the collapsed panel when the user moves the pointer over on the caption bar.
		 */
		__onPointerOverCaptionBar: function (e) {

			if (!this.isCollapsed())
				return;

			if (this.getAutoShow() !== "onPointerOver")
				return;

			if (this.__floating)
				return;

			if (!qx.ui.core.Widget.contains(this, e.getRelatedTarget())) {

				var me = this;
				this.__captionOverTimer = setTimeout(function () {

					if (!me.__floating)
						me.__float();

				}, wisej.web.Panel.AUTOSHOW_DELAY);
			}
		},

		/**
		 * Collapse or expands the panel when the user double clicks on the caption bar.
		 * This function is enabled only when showCloseButton is true.
		 */
		__onPointerDblTapCaptionBar: function (e) {

			if (!this.getShowCloseButton())
				return;

			if (this.__captionTapTimer > 0) {
				clearTimeout(this.__captionTapTimer);
				this.__captionTapTimer = 0;
			}
			if (this.__captionOverTimer > 0) {
				clearTimeout(this.__captionOverTimer);
				this.__captionOverTimer = 0;
			}

			this.toggleCollapsed();
		},

		/**
		 * Returns true if the caption is vertical.
		 */
		__isVertical: function () {

			switch (this.__getDockSide()) {

				case "left":
				case "right":
					return true;

				default:
					return false;
			}
		},

		/**
		 * Returns the side that the collapsed panel docks to.
		 */
		__getDockSide: function () {

			var dockSide =
				this.isCollapsed() && !wisej.web.DesignMode
					? this.getCollapseSide()
					: this.getCaptionPosition();

			return dockSide;
		},

		// rightToLeft support. 
		// listens to "changeRtl" to mirror the captionbar.
		_onRtlChange: function (e) {

			if (e.getData() === e.getOldData())
				return;

			var rtl = e.getData();
			if (rtl != null) {
				var caption = this.getChildControl("captionbar", true);
				if (caption != null)
					caption._mirrorChildren(rtl);
			}

		},

		/**
		 * Overridden to create the caption bar.
		 */
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "pane":
					control = new wisej.web.panel.FloatableScroll();
					var pane = control.getChildControl("pane");
					pane._getLayout().dispose();
					pane._setLayout(new qx.ui.layout.Basic());

					var clientArea = new qx.ui.container.Composite(new qx.ui.layout.Basic());
					clientArea.getContentElement().setStyles({
						"overflowX": "visible",
						"overflowY": "visible"
					});

					control.add(clientArea);
					this._add(control, { edge: "center" });

					control.addListener("resize", this._onScrollerResize, this);
					control.addListener("scrollX", this._onScrollBarX, this);
					control.addListener("scrollY", this._onScrollBarY, this);
					control.addListener("changeScrollbarXVisibility", this._onScrollerResize, this);
					control.addListener("changeScrollbarXVisibility", this._onScrollerResize, this);

					break;

				case "icon":
					control = new qx.ui.basic.Image(this.getIcon()).set({
						anonymous: true,
						alignY: "middle",
						alignX: "center",
						scale: true,
					});
					if (!this.getIcon()) {
						control.exclude();
					}
					this.getChildControl("captionbar").add(control, { row: 0, column: 0 });
					break;

				case "captionbar":
					this.__captionLayout = new qx.ui.layout.Grid();
					this.__captionLayout.setRowFlex(0, 1);
					this.__captionLayout.setColumnFlex(2, 1);
					control = new qx.ui.container.Composite(this.__captionLayout);
					control.addListener("tap", this.__onPointerTapCaptionBar, this);
					control.addListener("dbltap", this.__onPointerDblTapCaptionBar, this);
					control.addListener("pointerover", this.__onPointerOverCaptionBar, this);
					control.exclude();
					this._add(control, { edge: "north" });
					break;

				case "title":
					control = new qx.ui.basic.Label(this.getCaption()).set({
						anonymous: true,
						alignY: "middle",
						allowGrowX: true
					});
					this.getChildControl("captionbar").add(control, { row: 0, column: 2 });
					break;

				case "close-button":
					control = new qx.ui.form.Button().set({
						focusable: false,
						allowGrowX: false,
						allowGrowY: false
					});
					control.addListener("execute", this.__onCloseButtonClick, this);
					this.getChildControl("captionbar").add(control, { row: 0, column: 4 });
					break;
			}

			return control || this.base(arguments, id);
		},
	},

});


/**
 * wisej.web.panel.FloatableScroll
 *
 * Extends wisej.web.container.Scroll to create a 
 * scroll area that can be rendered also when the container
 * is collapsed.
 */
qx.Class.define("wisej.web.panel.FloatableScroll", {

	extend: wisej.web.container.Scroll,

	members: {

		// saves the dimensions for the floating mode.
		__floating: false,
		__floatingWidth: 0,
		__floatingHeight: 0,

		float: function (width, height) {
			this.__floating = true;
			this.__floatingWidth = width;
			this.__floatingHeight = height;
			this.scheduleLayoutUpdate();
		},

		unfloat: function () {
			this.__floating = false;
			this.scheduleLayoutUpdate();
		},

		// overridden
		renderLayout: function (left, top, width, height) {

			if (this.__floating) {
				width = this.__floatingWidth;
				height = this.__floatingHeight;
			}

			return this.base(arguments, left, top, width, height);
		}
	}

});
