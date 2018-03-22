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
 * wisej.web.UserPopup
 */
qx.Class.define("wisej.web.UserPopup", {

	extend: wisej.web.UserControl,

	construct: function () {

		this.base(arguments);

		// register with the focus handler.
		qx.ui.core.FocusHandler.getInstance().addRoot(this);

		// restrict the state properties.
		this.setStateProperties(["width", "height"]);

		if (!wisej.web.DesignMode) {

			// pre-create the popup wrapper that we'll use to show this widget.
			this.__popup = new wisej.web.userPopup.Popup();
			this.__popup.add(this);
			this.__updatePopupResizableEdges();

			// listen to changes to the resizable edges to shift the property to the container popup.
			this.addListener("changeResizableEdges", this._onChangedResizableEdges);
		}
	},

	properties: {

		/**
		 * AutoHide property.
		 *
		 * Whether to let the system decide when to hide the popup.
		 */
		autoHide: { init: true, check: "Boolean" },

		/**
		 * Offset property.
		 *
		 * Determines the offset from the opener or the cursor location.
		 */
		offset: { init: null, check: "Array" },

		/**
		 * Alignment property.
		 *
		 * Position of the aligned object in relation to the opener.
		 */
		alignment: {
			init: "bottomLeft",
			check: [
			"topLeft", "topCenter", "topRight",
			"bottomLeft", "bottomCenter", "bottomRight",
			"leftTop", "leftMiddle", "leftBottom",
			"rightTop", "rightMiddle", "rightBottom"]
		},

		/**
		 * PlacementModeX property.
		 *
		 * Selects the algorithm to use to calculate the position according the specified alignment.
		 */
		placementModeX: { init: "keepAlign", check: ["direct", "keepAlign", "bestFit"] },

		/**
		 * PlacementModeY property.
		 *
		 * Selects the algorithm to use to calculate the position according the specified alignment.
		 */
		placementModeY: { init: "keepAlign", check: ["direct", "keepAlign", "bestFit"] },

	},

	members: {

		__popup: null,

		/**
		 * Shows the UserPopup widget inside the popup container.
		 *
		 * @param opener {Widget | String} the opener widget reference or id.
		 * @param x {Integer} the x position, used when opener is null.
		 * @param x {Integer} the y position, used when opener is null.
		 */
		showPopup: function (opener, x, y) {

			// retrieve the header widget if the opened is a column header.
			if (opener instanceof wisej.web.datagrid.ColumnHeader)
				opener = opener.getHeaderWidget();

			this.__popup.add(this);
			this.__popup.setOffset(this.getOffset());
			this.__popup.setAutoHide(this.getAutoHide());
			this.__popup.setPosition(qx.lang.String.hyphenate(this.getAlignment()));
			this.__popup.setPlacementModeX(qx.lang.String.hyphenate(this.getPlacementModeX()));
			this.__popup.setPlacementModeY(qx.lang.String.hyphenate(this.getPlacementModeY()));

			this.__popup.setUserData("opener", opener);

			if (opener) {

				this.__popup.placeToWidget(opener, true);
			}
			else {

				var coords = {
					left: x, top: y,
					right: x, bottom: y
				};
				this.__popup._place(coords);
			}

			this.show();
			this.__popup.show();
		},

		/**
		 * Closes the popup.
		 */
		closePopup: function () {

			this.__popup.exclude();
		},

		/**
		 * Process changes to the resizable edges to apply the
		 * same value to the wrapper popup.
		 */
		_onChangedResizableEdges: function (e) {

			this.__updatePopupResizableEdges();

			this.setResizable(false);
		},

		// Transfers the resizable edges to the wrapper popup widget.
		__updatePopupResizableEdges: function () {

			var edges = [
				this.getResizableTop(),
				this.getResizableRight(),
				this.getResizableBottom(),
				this.getResizableLeft()];

			this.__popup.setResizable(edges);
		},

		/**
		 * Overridden.
		 * Transfers min/max width/height to the wrapper popup.
		 */
		_applyDimension: function (value, old, name) {

			this.base(arguments, value, old, name);

			switch (name) {
				case "minWidth":
				case "minHeight":
				case "maxWidth":
				case "maxHeight":
					this.__popup.set(name, value);
					break;
			}
		}
	},

	destruct: function () {

		// remove from the focus handler.
		qx.ui.core.FocusHandler.getInstance().removeRoot(this);

	},

});


/**
 * wisej.web.userPopup.Popup
 *
 * The actual popup control that wraps the UserPopup panel.
 */
qx.Class.define("wisej.web.userPopup.Popup", {

	extend: qx.ui.popup.Popup,

	include: [qx.ui.core.MResizable],

	construct: function () {

		this.base(arguments, new qx.ui.layout.Grow());

		this.setResizable(false);
	},

	members: {

		// overridden.
		canAutoHide: function (target) {

			// don't auto hide when the target of the pointer event is the opener.
			var opener = this.getUserData("opener");
			if (opener && (opener == target || qx.ui.core.Widget.contains(opener, target))) {
				return false;
			}

			return true;
		}
	}
});
