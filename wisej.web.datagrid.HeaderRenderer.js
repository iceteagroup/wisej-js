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
 * wisej.web.datagrid.HeaderRenderer
 */
qx.Class.define("wisej.web.datagrid.HeaderRenderer", {

	extend: qx.ui.table.headerrenderer.Default,

	members: {

		// overridden
		createHeaderCell: function (cellInfo) {

			var widget = new wisej.web.datagrid.HeaderCell();
			this.updateHeaderCell(cellInfo, widget);

			// bind the header widget to corresponding HeaderCell widget.
			var columnHeader = cellInfo.table.getColumns()[cellInfo.col];
			columnHeader.setIndex(cellInfo.col);
			columnHeader.setHeaderWidget(widget);
			widget.setUserData("columnHeader", columnHeader);

			return widget;
		},

	},

});
