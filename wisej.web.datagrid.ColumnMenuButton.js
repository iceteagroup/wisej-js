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
 * wisej.web.datagrid.ColumnMenuButton
 */
qx.Class.define("wisej.web.datagrid.ColumnMenuButton", {

	extend: qx.ui.table.columnmenu.Button,

	construct: function () {

		this.base(arguments);

		// set the "owner" and "container" attributes for QA automation.
		this.addListener("changeMenuVisibility", function (e) {
			var menu = e.getData();
			if (menu.isVisible())
				wisej.utils.Widget.setAutomationAttributes(menu, this);
		});
	},

	members: {

		// overridden.
		factory: function (item, options) {

			var component;

			switch (item) {

				case "menu-button":

					component = new wisej.web.datagrid.ColumnMenuItem(options.text);
					component.addState("unchecked");
					component.setAppearance("menu/item");
					component.setVisible(options.bVisible);

					this.getMenu().add(component);
					break;
			}

			return component || this.base(arguments, item, options);
		},
	},

});

/**
 * wisej.web.datagrid.ColumnMenuItem
 */
qx.Class.define("wisej.web.datagrid.ColumnMenuItem", {

	extend: qx.ui.table.columnmenu.MenuItem,


	members: {

		/**
		 * Event listener for tap
		 *
 		 * @param e {qx.event.type.Pointer} pointer event
 		 */
		_onTap: function (e) {

			if (e.isLeftPressed()) {

				this.execute();

				// do not hide the menu item when toggling column visibility.
				// qx.ui.menu.Manager.getInstance().hideAll();
				return;
			}

			this.base(e);
		},

		// overridden
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {
				case "label":
					control = this.base(arguments, id);
					control.setRich(true);
					break;
			}

			return control || this.base(arguments, id);
		}

	}
});
