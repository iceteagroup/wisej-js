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
 * wisej.web.datagrid.SelectionManager
 */
qx.Class.define("wisej.web.datagrid.SelectionManager", {

	extend: qx.ui.table.selection.Manager,

	members:
	{
		/**
		 * Handles a key down event that moved the focus (E.g. up, down, home, end, ...).
		 *
		 * @param index {Integer} the index that is currently focused.
		 * @param evt {Map} the key event.
		 */
		handleMoveKeyDown: function (index, evt) {
			var selectionModel = this.getSelectionModel();

			switch (evt.getModifiers()) {

				case 0:
				case qx.event.type.Dom.CTRL_MASK:
					{
						selectionModel.setSelectionInterval(index, index);
					}
					break;

				case qx.event.type.Dom.SHIFT_MASK:
				case qx.event.type.Dom.SHIFT_MASK | qx.event.type.Dom.CTRL_MASK:
					{
						var anchor = selectionModel.getAnchorSelectionIndex();

						if (anchor == -1) {
							selectionModel.setSelectionInterval(index, index);
						} else {
							selectionModel.setSelectionInterval(anchor, index);
						}
					}
					break;
			}
		},
	}

});
