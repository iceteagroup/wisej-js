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
 * wisej.web.datagrid.EditorFactory
 *
 * This editor factory class reuses the widget linked to the
 * wisej.web.datagrid.ColumnHeader instance.
 */
qx.Class.define("wisej.web.datagrid.EditorFactory",
{
	extend: qx.ui.table.celleditor.AbstractField,

	statics:
	{
		/**
		 * Returns the value from the widget used to edit the cell.
		 */
		getCellEditorValue: function (cellEditor) {

			if (cellEditor) {

				var getValueMethod = cellEditor.getCellValue || cellEditor.getText || cellEditor.getValue;

				if (getValueMethod)
					return getValueMethod.call(cellEditor);
			}
		},

		/**
		 * Sets the value to the widget editing the cell.
		 */
		setCellEditorValue: function (cellEditor, value) {

			if (cellEditor) {

				var setValueMethod = cellEditor.setCellValue || cellEditor.setText || cellEditor.setValue;

				if (setValueMethod) {

					value = value || "";
					setValueMethod.call(cellEditor, value);

					if (cellEditor.setTextSelection)
						cellEditor.setTextSelection(value.length);
				}
			}
		},

		/**
		 * Selects the text in the editor, if possible.
		 */
		selectAllText: function (cellEditor) {

			if (cellEditor && cellEditor.selectAllText) {
				cellEditor.selectAllText();
			}
		},
	},

	members:
	{
		// interface implementation
		getCellEditorValue: function (cellEditor) {

			wisej.web.datagrid.EditorFactory.getCellEditorValue(cellEditor);

		},

		// interface implementation
		setCellEditorValue: function (cellEditor, value) {

			wisej.web.datagrid.EditorFactory.setCellEditorValue(cellEditor, value);
		},

		// interface implementation
		createCellEditor: function (cellInfo) {

			var table = cellInfo.table;
			var column = table.getColumns()[cellInfo.col];

			if (column) {

				var editor = column.getEditor();
				if (editor && !editor.isDisposed()) {

					editor.addState("celleditor");
					editor.setAllowGrowX(true);
					editor.setAllowGrowY(true);
					editor.setAllowShrinkX(true);
					editor.setAllowShrinkY(true);
					editor.resetUserBounds();
					editor.setRtl(table.isRtl());
					editor.setUserData("owner", table);
					editor.setUserData("opener", column);

					// set the "owner" and "container" attributes for QA automation.
					wisej.utils.Widget.setAutomationAttributes(editor, column);

					// if the "beginEdit" event is not wired, initialize the
					// editor with the value from the cell.
					if (!cellInfo.table.isWired("beginEdit")) {

						editor.show();
						this.setCellEditorValue(editor, cellInfo.value + "");
					}
				}

				return editor;
			}

		},

	}
});
