﻿///////////////////////////////////////////////////////////////////////////////
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
 * wisej.web.datagrid.HeaderScroller
 */
qx.Class.define("wisej.web.datagrid.HeaderScroller", {

	extend: qx.ui.table.pane.Header,

	members: {

		/**
		 * Cleans up all header cells.
		 *
		 */
		_cleanUpCells: function () {
			var children = this._getChildren();

			for (var x = children.length - 1; x >= 0; x--) {

				var cellWidget = children[x];

				// detach the custom widget in the header
				// or it will be disposed.
				cellWidget.setCellWidget(null);
				cellWidget.destroy();
			}
		}
	}

});
