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
 * wisej.utils.FocusHandlerPatch
 *
 * Replaces the tab index comparer in qx.ui.core.FocusHandler to
 * take in consideration the widget's hierarchy.
 */
qx.Mixin.define("wisej.utils.FocusHandlerPatch", {

	statics: {

		/**
		 * Builds the tab index path array from the widget to the topmost parent.
		 */
		__collectTabIndexPath: function (widget) {
			var path = [];

			for (var parent = widget; parent != null; parent = parent.getLayoutParent()) {

				var tabIndex = parent.getTabIndex();
				if (tabIndex != null && tabIndex > -1)
					path.push(tabIndex);
			}

			path.reverse();
			return path;
		},

		/**
		 * Returns the child widget position in the parent's collection.
		 */
		__getChildIndex: function (widget) {
			var parent = widget.getLayoutParent();
			if (!parent)
				return -1;

			return parent.indexOf ? parent.indexOf(widget) : parent._indexOf(widget);
		}

	},

	members: {

		/**
		 * Compares the tabIndex of two widgets taking on consideration
		 * their position as children widgets.
		 *
		 * @param widget1 {qx.ui.core.Widget} widget to compare.
		 * @param widget1 {qx.ui.core.Widget} widget to compare.
		 */
		__compareTabOrder: function (widget1, widget2) {

			if (widget1 === widget2)
				return 0;

			var tabPath1 = wisej.utils.FocusHandlerPatch.__collectTabIndexPath(widget1);
			var tabPath2 = wisej.utils.FocusHandlerPatch.__collectTabIndexPath(widget2);

			for (var i = 0; i < tabPath1.length && i < tabPath2.length; i++) {
				if (tabPath1[i] !== tabPath2[i]) {
					return tabPath1[i] - tabPath2[i];
				}
			}

			var z1 = wisej.utils.FocusHandlerPatch.__getChildIndex(widget1);
			var z2 = wisej.utils.FocusHandlerPatch.__getChildIndex(widget2);

			return z1 === z2
				? tabPath1.length - tabPath2.length
				: z1 - z2;
		}
	}
});

qx.Class.patch(qx.ui.core.FocusHandler, wisej.utils.FocusHandlerPatch);
