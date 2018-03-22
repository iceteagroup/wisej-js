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
 * wisej.web.datagrid.CellEvent
 *
 * Specialized data event holding mouse and cell information.
 */
qx.Class.define("wisej.web.datagrid.CellEvent", {

	extend: qx.event.type.Pointer,

	members: {

		__data: null,

		/**
		 * Initializes an event object.
		 *
		 * @param e {qx.event.type.Pointer} The original pointer event
		 * @param column {Integer} The cell's column index
		 * @param row {Integer} The cell's row index
		 * @param role {String} The clicked element role
		 *
		 * @return {qx.event.type.Data} the initialized instance.
		 */
		init: function (e, column, row, role) {

			e.clone(this);
			this.setBubbles(false);

			// determine the local coordinates.
			var x = null;
			var y = null;
			var targetEl = e.getOriginalTarget();

			if (targetEl) {

				// find cell's outer element to determine the correct pointer location
				// since the event may come from an inner element.
				var cellEl = targetEl;
				for (; cellEl != null; cellEl = cellEl.parentNode) {
					if (!cellEl.getAttribute) {
						cellEl = null;
						break;
					}
					else if (cellEl.getAttribute("role") == "cell") {
						break;
					}
				}
				var clientRect = (cellEl || targetEl).getBoundingClientRect();

				x = Math.max(0, e.getDocumentLeft() - clientRect.left) | 0;
				y = Math.max(0, e.getDocumentTop() - clientRect.top) | 0;
			}

			this.__data = { col: column, row: row, x: x, y: y, role: role };

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
