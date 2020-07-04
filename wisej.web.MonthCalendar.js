//#Requires=wisej.web.ToolContainer.js

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
 * wisej.web.MonthCalendar
 */
qx.Class.define("wisej.web.MonthCalendar", {

	extend: qx.ui.container.Composite,

	// All Wisej components must include this mixin
	// to provide services to the Wisej core.
	include: [
		wisej.mixin.MWisejControl,
		wisej.mixin.MBorderStyle
	],

	implement: [wisej.web.toolContainer.IToolPanelHost],

	/**
	 * Constructor.
	 */
	construct: function () {

		this.base(arguments, new qx.ui.layout.Grid());

		// initialize the widget with 1 calendar.
		this.__calendars = [];
		this.initCalendarSize();

		// attach to the deactivate event to release the selection range anchor.
		this.addListener("deactivate", this.__onDeactivate);
	},

	properties: {

		// overridden.
		appearance: { init: "calendar", refine: true },

		/**
		 * CalendarSize property.
		 *
		 * Determines the number of calendars to display vertically (width) and horizontally (height.)
		 */
		calendarSize: { init: { width: 1, height: 1 }, check: "Map", apply: "_applyCalendarSize" },

		/**
		 * Today property.
		 */
		today: { init: new Date(), check: "Date", apply: "_applyToday" },

		/**
		 * MinValue property.
		 */
		minValue: { check: "Date", init: null, nullable: true, apply: "_applyMinMaxValue" },

		/**
		 * MaxValue property.
		 */
		maxValue: { check: "Date", init: null, nullable: true, apply: "_applyMinMaxValue" },

		/**
		 * ShowToday property.
		 *
		 * Show or hide the "today" widget indicating today's date.
		 */
		showToday: { init: true, check: "Boolean", apply: "_applyShowToday" },

		/**
		 * ShowWeekNumbers property.
		 *
		 * Show or hide the week numbers panel.
		 */
		showWeekNumbers: { init: true, check: "Boolean", apply: "_applyShowWeekNumbers" },

		/**
		 * ShowToolTips property.
		 *
		 * Shows or hides the tooltips displayed by the calendar control.
		 */
		showToolTips: { init: true, check: "Boolean", apply: "_applyShowToolTips" },

		/**
		 * TodayText property.
		 *
		 * The text to display in the today widget.
		 */
		todayText: { init: null, check: "String", apply: "_applyTodayText" },

		/**
		 * firstDayOfWeek property.
		 *
		 * The first day of the week displayed in the drop down calendar.
		 */
		firstDayOfWeek: { init: -1, check: "Integer", apply: "_applyFirstDayOfWeek" },

		/**
		 * SelectionRange property.
		 *
		 * The selected date range, it's a map: {begin: Date, end: Date}.
		 */
		selectionRange: { init: null, check: "Map", apply: "_applySelectionRange", nullable: true, event: "selectionChanged" },

		/**
		 * MaxSelectionCount property.
		 *
		 * The maximum number of days that can be selected in the SelectedRange.
		 */
		maxSelectionCount: { init: 7, check: "PositiveInteger" },

		/**
		 * BoldedDates property.
		 *
		 * Array of dates that are displayed "bolded". The actual rendering depends on the theme.
		 */
		boldedDates: { init: [], check: "Array", apply: "_applyBoldedDates" },

		/**
		 * MonthlyBoldedDates property.
		 *
		 * Array of recurring monthly days that are displayed "bolded". The actual rendering depends on the theme.
		 */
		monthlyBoldedDates: { init: [], check: "Array", apply: "_applyBoldedDates" },

		/**
		 * AnuallyBoldedDates property.
		 *
		 * Array of recurring yearly days that are displayed "bolded". The actual rendering depends on the theme.
		 */
		annuallyBoldedDates: { init: [], check: "Array", apply: "_applyBoldedDates" },

		/**
		 * Tools property.
		 *
		 * Collection of tool definitions to display next to the edit field.
		 */
		tools: { check: "Array", apply: "_applyTools" },

		/**
		 * ToolsPosition property.
		 *
		 * Returns or sets the position of the tools container.
		 */
		toolsPosition: { init: "top", check: ["top", "left", "right", "bottom"], apply: "_applyToolsPosition" },

		/**
		 * AutoSize property.
		 *
		 * Enables autosize mode.
		 */
		autoSize: { init: false, check: "Boolean", apply: "_applyAutoSize" },

		/**
		 * ShowOtherMonth property.
		 *
		 * Determines whether the calendar shows grayed-out days from the previous and next month.
		 */
		showOtherMonth: { init: true, check: "Boolean", apply: "_applyShowOtherMonth" },

		/**
		 * ReadOnly property.
		 */
		readOnly: { check: "Boolean", init: false, event: "readOnlyChanged" },
	},

	members: {

		// array of the visible calendars.
		__calendars: [],

		// avoid re-entering __inSyncCalendar.
		__inSyncCalendar: false,

		// prevents re-entering __onCalendarChangeValue.
		__inChangeValue: false,

		/**
		 * Checks whether the specified date should be bolded.
		 *
		 * @param date {Date} the date to check against the bolded date arrays.
		 */
		isBoldedDate: function (date) {

			// check the monthly bolded dates.
			var boldedDates = this.getMonthlyBoldedDates();
			if (boldedDates && boldedDates.length > 0) {
				for (var i = 0, length = boldedDates.length; i < length; i++) {

					var boldedDate = boldedDates[i];
					if (date.getDate() == boldedDate.getDate())
						return true;
				}
			}

			// check the annually bolded dates.
			var boldedDates = this.getAnnuallyBoldedDates();
			if (boldedDates && boldedDates.length > 0) {
				for (var i = 0, length = boldedDates.length; i < length; i++) {
					if (date.getDate() == boldedDates[i].getDate() && date.getMonth() == boldedDates[i].getMonth())
						return true;
				}
			}

			// check the single bolded dates.
			var boldedDates = this.getBoldedDates();
			if (boldedDates && boldedDates.length > 0) {
				for (var i = 0, length = boldedDates.length; i < length; i++) {
					if (date.getDate() == boldedDates[i].getDate() && date.getMonth() == boldedDates[i].getMonth() && date.getFullYear() == boldedDates[i].getFullYear())
						return true;
				}
			}

			// not bolded.
			return false;
		},

		/**
		 * Applies the today property.
		 */
		_applyToday: function (value, old) {

			var master = this.__calendars[0];
			if (master && value) {

				for (var i = 0; i < this.__calendars.length; i++) {
					this.__calendars[i].setToday(value);
				}

				master.showMonth(value.getMonth(), value.getFullYear());
				this.__syncCalendars();
			}
		},

		/**
		 * Applies the showToolTips property.
		 */
		_applyShowToolTips: function (value, old) {

			for (var i = 0, count = this.__calendars.length; i < count; i++) {
				this.__showTooltips(this.__calendars[i], value);
			}

		},

		/**
		 * Applies the firstDayOfWeek property.
		 */
		_applyFirstDayOfWeek: function (value, old) {

			if (value != old) {
				for (var i = 0, length = this.__calendars.length; i < length; i++) {
					this.__calendars[i].setFirstDayOfWeek(value);
				}
			}
		},

		/**
		 * Applies the Min/MaxValue properties.
		 */
		_applyMinMaxValue: function (value, old, name) {

			for (var i = 0, count = this.__calendars.length; i < count; i++) {
				this.__calendars[i].set(name, value);
			}

		},

		/**
		 * Applies the showToday property.
		 */
		_applyShowToday: function (value, old) {

			this.getChildControl("today").setVisibility(
				value ? "visible" : "excluded"
			);

			if (this.isAutoSize()) {
				this.resetHeight();
			}

		},

		/**
		 * Applies the showWeekNumbers property.
		 */
		_applyShowWeekNumbers: function (value, old) {

			for (var i = 0, count = this.__calendars.length; i < count; i++) {
				this.__calendars[i].setShowWeekNumbers(value);
			}

			if (this.isAutoSize()) {
				this.resetWidth();
			}
		},

		/**
		 * Applies the todayText property.
		 */
		_applyTodayText: function (value, old) {

			this.getChildControl("today").setLabel(value);

		},

		/**
		 * Applies the showOtherMonth property.
		 */
		_applyShowOtherMonth: function (value, old) {

			if (value != old) {

				if (this.__calendars.length == 1) {

					this.__calendars[0].setShowOtherMonth(value ? "both" : "none");
				}
				else {

					for (var i = 0, length = this.__calendars.length; i < length; i++) {

						var cal = this.__calendars[i];

						if (i == 0) {
							cal.setShowOtherMonth(value ? "previous" : "none");
						}
						else if (i == length - 1) {
							cal.setShowOtherMonth(value ? "next" : "none");
						}
						else {
							cal.setShowOtherMonth("none");
						}
					}
				}
			}
		},

		/**
		 * Applies the selectionRange property.
		 */
		_applySelectionRange: function (value, old) {

			if (value) {

				// set the "selected" state on for the selected dates.
				var start = new Date(value.start.getFullYear(), value.start.getMonth(), value.start.getDate());
				var end = new Date(value.end.getFullYear(), value.end.getMonth(), value.end.getDate());

				// when the selection range is updated from the server, check if the month is in range, otherwise
				// navigate the first calendar.
				if (wisej.web.DesignMode || this.core.processingActions) {

					var inRange = false;
					var month = start.getMonth();
					var year = start.getFullYear();
					for (var i = 0; i < this.__calendars.length; i++) {
						if (this.__calendars[i].getShownMonth() == month && this.__calendars[i].getShownYear() == year) {
							inRange = true;
							break;
						}
					}

					if (!inRange) {
						var calendar = this.__calendars[0];
						calendar.showMonth(month, year);
					}
				}

				var startTime = start.getTime();
				var endTime = end.getTime();
				for (var i = 0; i < this.__calendars.length; i++) {
					this.__setSelectionRangeInCalendar(this.__calendars[i], startTime, endTime);
				}
			}
			else {

				for (var i = 0; i < this.__calendars.length; i++) {
					this.__setSelectionRangeInCalendar(this.__calendars[i], null, null);
				}
			}

		},

		__setSelectionRangeInCalendar: function (calendar, start, end) {

			for (var i = 0, length = calendar.__dayLabelArr.length; i < length; i++) {

				var dayLabel = calendar.__dayLabelArr[i];

				// remove the selected state from "other month" labels and if the start/end arguments are null.
				if (dayLabel.hasState("otherMonth") || (!start || !end)) {

					if (dayLabel.hasState("selected"))
						dayLabel.removeState("selected");

					continue;
				}

				// select the day labels in range.
				if (dayLabel.dateTime >= start && dayLabel.dateTime <= end) {

					updateShownMonth = true;

					if (!dayLabel.hasState("selected"))
						dayLabel.addState("selected");
				}
				else {

					if (dayLabel.hasState("selected"))
						dayLabel.removeState("selected");
				}
			}
		},

		/**
		 * Applies the bolded date arrays property.
		 */
		_applyBoldedDates: function (value, old) {

			for (var i = 0, length = this.__calendars.length; i < length; i++) {
				this.__calendars[i]._updateDatePane();
			}
		},

		/**
		 * Applies the calendarSize property.
		 */
		_applyCalendarSize: function (value, old) {

			var width = value.width;
			var height = value.height;

			// create the missing calendars.
			var count = width * height;
			if (count > this.__calendars.length) {
				for (var i = this.__calendars.length; i < count; i++) {
					// create the inner calendar.
					this.__calendars[i] = this.getChildControl("datechooser#" + i);
				}
			}

			// destroy the excess calendars.
			if (count < this.__calendars.length) {
				for (var i = count; i < this.__calendars.length; i++)
					this.__calendars[i].destroy();

				this.__calendars.splice(count);
			}

			// propagate the showOtherMonth property.
			this._applyShowOtherMonth(this.getShowOtherMonth());

			this.__syncCalendars();
			this.__layoutCalendars();

		},

		// adjust the calendar layout.
		__layoutCalendars: function () {

			if (this.isAutoSize()) {
				this.resetWidth();
				this.resetHeight();
			}

			var r = 1; // start at row 1 to leave row 0 for the tools.
			var c = 1; // start at col 1 to leave row 0 for the tools.
			var layout = this.getLayout();
			var size = this.getCalendarSize();
			for (var i = 0, count = this.__calendars.length; i < count; i++) {

				var cal = this.__calendars[i];
				this.add(cal, { row: r, column: c });
				this.__hideAllNavigation(cal);
				layout.setRowFlex(r, 1);
				layout.setColumnFlex(c, 1);

				// next col or row.
				c++;
				if (c > size.width) {
					r++;
					c = 1; // start at col 1 to leave row 0 for the tools.
				}
			}

			// show the prev buttons only on the first calendar.
			this.__showPrevNavigation(this.__calendars[0]);

			// show the next buttons only on the last calendar on the first row.
			this.__showNextNavigation(this.__calendars[size.width - 1]);

			// layout the today widget.
			layout.setRowFlex(r, 0);
			this.getChildControl("today").setLayoutProperties({ row: r, column: 1, colSpan: size.width });

			// layout the tools widget.
			this.updateToolPanelLayout(this.getChildControl("tools", true));
		},

		__hideAllNavigation: function (calendar) {

			calendar.getChildControl("last-year-button").hide();
			calendar.getChildControl("last-month-button").hide();
			calendar.getChildControl("next-month-button").hide();
			calendar.getChildControl("next-year-button").hide();
		},

		__showPrevNavigation: function (calendar) {

			calendar.getChildControl("last-year-button").show();
			calendar.getChildControl("last-month-button").show();
		},

		__showNextNavigation: function (calendar) {

			calendar.getChildControl("next-month-button").show();
			calendar.getChildControl("next-year-button").show();

		},

		__showTooltips: function (calendar, show) {

			// show/hide the tooltips in the inner calendar control.
			var hide = !show;
			calendar.getChildControl("last-year-button").setBlockToolTip(hide);
			calendar.getChildControl("next-year-button").setBlockToolTip(hide);
			calendar.getChildControl("last-month-button").setBlockToolTip(hide);
			calendar.getChildControl("next-month-button").setBlockToolTip(hide);
		},

		// updates the inner calendars to show sequential months.
		__syncCalendars: function (master) {

			if (this.__inSyncCalendar)
				return;

			this.__inSyncCalendar = true;
			try {

				if (this.__calendars && this.__calendars.length > 0) {

					// if no master calendar was specified, use the first.
					master = master || this.__calendars[0];

					// read the displayed year.
					var shownYear = master.getShownYear();
					var shownMonth = master.getShownMonth();

					// find the index of the master (that is the calendar that changed).
					var index = this.__calendars.indexOf(master);

					// calculate the first month/year to show.
					var minDate = this.getMinValue();
					var maxDate = this.getMaxValue();
					var shownDate = new Date(shownYear, shownMonth - index, 1);
					if (minDate != null && shownDate < minDate)
						shownDate = new Date(minDate);
					if (maxDate != null && shownDate > maxDate)
						shownDate = new Date(maxDate);

					// update the inner calendars.
					var range = this.getSelectionRange();
					for (var i = 0; i < this.__calendars.length; i++) {

						this.__calendars[i].showMonth(shownDate.getMonth(), shownDate.getFullYear());

						if (range) {
							// update the selected range of days in the calendar.
							this.__setSelectionRangeInCalendar(this.__calendars[i], range.start.getTime(), range.end.getTime());
						}

						// next month.
						shownDate.setMonth(shownDate.getMonth() + 1);
					}

					// notify the server of the new visible range.
					var first = this.__calendars[0];
					this.fireDataEvent("rangeChanged", {
						firstMonth: first.getShownMonth(),
						firstYear: first.getShownYear()
					});

				}

			} finally {

				this.__inSyncCalendar = false;
			}
		},


		/** 
		 * Applies the autoSize property.
		 */
		_applyAutoSize: function (value, old) {

			if (value) {
				this.resetWidth();
				this.resetHeight();
			}

		},

		/** 
		 * Applies the tools property.
		 */
		_applyTools: function (value, old) {

			var tools = this.getChildControl("tools", true);

			if (value == null || value.length == 0) {
				if (tools)
					tools.exclude();
				return;
			}

			tools = this.getChildControl("tools");
			tools.show();

			var position = this.getToolsPosition();
			wisej.web.ToolContainer.add(this, tools);
			var vertical = position == "left" || position == "right";
			wisej.web.ToolContainer.install(this, tools, value, "left", { row: 0, column: 0 }, position, "calendar");
			wisej.web.ToolContainer.install(this, tools, value, "right", vertical ? { row: 1, column: 0 } : { row: 0, column: 1 }, position, "calendar");
		},

		/** 
		 * Applies the toolsPosition property.
		 */
		_applyToolsPosition: function (value, old) {

			this.updateToolPanelLayout(this.getChildControl("tools", true));
		},

		/**
		 * Implements: wisej.web.toolContainer.IToolPanelHost.updateToolPanelLayout
		 *
		 * Changes the layout of the tools container according to the value
		 * of the toolsPosition property.
		 *
		 * @param toolPanel {wisej.web.toolContainer.ToolPanel} the panel that contains the two wise.web.ToolContainer widgets.
		 */
		updateToolPanelLayout: function (toolPanel) {

			if (toolPanel) {

				var rowCol = { row: 0, column: 1 };
				var position = this.getToolsPosition();
				var vertical = position == "left" || position == "right";

				var calendarSize = this.getCalendarSize();

				switch (position) {

					default:
					case "top":
						rowCol.row = 0;
						rowCol.column = 1;
						rowCol.rowSpan = 1;
						rowCol.colSpan = calendarSize.width;
						break;

					case "left":
						rowCol.row = 1;
						rowCol.column = 0;
						rowCol.colSpan = 1;
						rowCol.rowSpan = calendarSize.height + 2;
						break;

					case "right":
						rowCol.row = 1;
						rowCol.colSpan = 1;
						rowCol.column = calendarSize.width + 1;
						rowCol.rowSpan = calendarSize.height + 2;
						break;

					case "bottom":
						rowCol.row = calendarSize.height + 2;
						rowCol.column = 1;
						rowCol.rowSpan = 1;
						rowCol.colSpan = calendarSize.width;
						break;
				}

				toolPanel.removeState("top");
				toolPanel.removeState("left");
				toolPanel.removeState("right");
				toolPanel.removeState("bottom");
				toolPanel.addState(position);

				toolPanel.setLayoutProperties(rowCol);

				// change the position of the tool containers.
				if (this.__leftToolsContainer) {
					this.__leftToolsContainer.setPosition(position);
				}
				if (this.__rightToolsContainer) {
					this.__rightToolsContainer.setPosition(position);
					this.__rightToolsContainer.setLayoutProperties(vertical ? { row: 1, column: 0 } : { row: 0, column: 1 });
				}
			}
		},

		/**
		 * Create the child today widget.
		 */
		_createChildControlImpl: function (id, hash) {
			var control;

			switch (id) {

				case "datechooser":
					control = new wisej.web.monthCalendar.DateChooser(this).set({
						today: this.getToday(),
						minValue: this.getMinValue(),
						maxValue: this.getMaxValue(),
						showWeekNumbers: this.getShowWeekNumbers()
					});
					this.__showTooltips(control, this.getShowToolTips());
					control.addListener("changeValue", this.__onCalendarChangeValue, this);
					control.addListener("changeShownDate", this.__onCalendarChangeShownDate, this);
					break;

				case "today":
					control = new wisej.web.monthCalendar.Today();
					this._add(control, { row: 1, column: 1 });
					control.addListener("tap", this.__onTodayTap, this);
					break;

				case "tools":
					control = new wisej.web.toolContainer.ToolPanel();
					break;

			}

			return control || this.base(arguments, id);
		},

		// temporary storage for the selection range.
		// saves the first date selected by the user when in multiple selection mode.
		__selectionAnchor: null,

		// handle the deactivate event to release the selection anchor when the calendar loses the focus.
		__onDeactivate: function (e) {

			if (!qx.ui.core.Widget.contains(this, e.getRelatedTarget())) {

				// update the selection range if we had a pending anchor date.
				if (this.__selectionAnchor) {

					var range = { start: this.__selectionAnchor, end: this.__selectionAnchor };
					this.setSelectionRange(range);
				}

				this.__selectionAnchor = null;
			}
		},

		// handles the changeValue event on the inner calendars.
		// only one calendar can have a current value.
		__onCalendarChangeValue: function (e) {

			if (this.__inChangeValue == true)
				return;

			this.__inChangeValue = true;
			try {

				var target = e.getTarget();

				// multiple selection is enabled?
				var maxDays = this.getMaxSelectionCount();
				if (maxDays > 1) {

					// if the user has already selected the start date, then
					// this selection is the end date of the range.
					if (this.__selectionAnchor || target.__inKeyPress) {

						var end = target.getValue();
						var start = this.__inKeyPress ? end : this.__selectionAnchor;
						this.__selectionAnchor = null;

						// limit the selection range.
						if (end > start) {
							end = this.__limitDays(end, start, maxDays);
						}
						else if (end < start) {
							end = this.__limitDays(end, start, -maxDays);
							var t = start; start = end; end = t;
						}

						// update the selection range.
						var range = { start: start, end: end };
						this.setSelectionRange(range);

						return;
					}
					else {

						// save the first selection date, waiting for the next.
						this.__selectionAnchor = target.getValue();
					}
				}
				else {

					// update the selection range.
					var range = { start: target.getValue(), end: target.getValue() };
					this.setSelectionRange(range);
				}

				// reset the selected day on all other inner calendars when:
				//	- in single selection mode (maxSelectionCount = 1)
				//	- selecting the anchor in multiple selection mode.

				for (var i = 0; i < this.__calendars.length; i++) {

					if (this.__calendars[i] == target)
						continue;

					this.__calendars[i].setValue(null);
				}

			} finally {

				this.__inChangeValue = false;
			}
		},

		// limits the value to the limit +/- days.
		__limitDays: function (value, limit, days) {

			if (days > 0) {
				var max = new Date(limit.getFullYear(), limit.getMonth(), limit.getDate() + days - 1);
				if (value > max)
					return max;
			}
			else if (days < 0) {
				var min = new Date(limit.getFullYear(), limit.getMonth(), limit.getDate() + days + 1);
				if (value < min)
					return min;
			}

			return value;
		},

		// handles the shown month/year changes in an inner calendar
		// to invoke the synchronization of the shown month of the other calendars.
		__onCalendarChangeShownDate: function (e) {

			this.__syncCalendars(e.getTarget());
		},

		// handles taps on the today label to sync the calendars and show today's date.
		__onTodayTap: function (e) {

			var today = new Date();
			this.__calendars[0].showMonth(today.getMonth(), today.getFullYear());

		},

		/**
		 * getDesignMetrics
		 *
		 * Method used by the designer to retrieve metrics information about a widget in design mode.
		 */
		getDesignMetrics: function () {

			var size = this.getSizeHint();

			return {
				width: size.width,
				height: size.height
			};
		},

	},
});


/**
 * wisej.web.monthCalendar.DateChooser
 *
 * Extends qx.ui.control.DateChooser to be used inside the new wisej.web.MonthCalendar control.
 */
qx.Class.define("wisej.web.monthCalendar.DateChooser", {

	extend: qx.ui.control.DateChooser,

	construct: function (calendar) {

		if (qx.core.Environment.get("qx.debug")) {
			this.assert(calendar != null);
		}

		this.base(arguments);

		// save the calendar that owns this inner DateChooser.
		this.calendar = calendar;

		// listen to changes for the ReadOnly property.
		this.calendar.addListener("readOnlyChanged", this.__onCalendarReadOnlyChanged, this);
		this.getChildControl("navigation-bar").setEnabled(!this.calendar.isReadOnly());

	},

	properties: {

		/**
		 * ShowWeekNumbers property.
		 *
		 * Show or hide the week numbers panel.
		 */
		showWeekNumbers: { init: true, check: "Boolean", apply: "_applyShowWeekNumbers" },

		/**
		 * firstDayOfWeek property.
		 *
		 * The text to display in the today widget.
		 */
		firstDayOfWeek: { init: -1, check: "Integer", apply: "_applyFirstDayOfWeek" },

		/**
		 * ShowOtherMonth property.
		 *
		 * Determines whether the calendar shows grayed-out days from the previous and/or next month.
		 */
		showOtherMonth: { init: "both", check: ["none", "previous", "next", "both"], apply: "_applyShowOtherMonth" }

	},

	members: {

		// the calendar that owns this inner DateChooser.
		calendar: null,

		// flag indicating that the widget is processing a keypress event.
		__inKeyPress: false,

		/**
		 * Event handler. Called when a key was pressed.
		 *
		 * @param e {qx.event.type.Data} The event.
		 */
		_onKeyPress: function (e) {

			this.__inKeyPress = true;
			try {

				this.base(arguments, e);
			} finally {

				this.__inKeyPress = false;
			}
		},

		// Disables navigation and changes when the owner
		// calendar's is ReadOnly.
		__onCalendarReadOnlyChanged: function (e) {

			var readOnly = e.getData();
			this.getChildControl("navigation-bar").setEnabled(!readOnly);
		},

		// overridden.
		_onDayTap: function (e) {

			if (this.calendar.isReadOnly())
				return;

			this.base(arguments, e);
		},

		/**
		 * Applies the showWeekNumbers property.
		 */
		_applyShowWeekNumbers: function (value, old) {

			var visibility = value ? "visible" : "excluded";
			for (var w = 0; w < 7; w++) {
				this.getChildControl("week#" + w).setVisibility(visibility);
			}

		},

		/**
		 * Applies the firstDayOfWeek property.
		 */
		_applyFirstDayOfWeek: function (value, old) {

			if (value != old) {
				this.setWeekStart(value);
				this._updateDatePane();
			}
		},

		/**
		 * Applies the showOtherMonth property.
		 */
		_applyShowOtherMonth: function (value, old) {

			if (value != old)
				this._updateDatePane();
		},

		/**
		 * Overridden. Adds support for bolded dates and hidden other-month days.
		 */
		_updateDatePane: function () {

			// let the base implementation update the date panel.
			this.base(arguments);

			if (this.calendar == null)
				return;

			// go through the day labels and:
			//
			// - add/remove the bolded state 
			// - hide/show other-month days.

			var showOtherMonth = this.getShowOtherMonth();
			var showNextMonth = (showOtherMonth == "next" || showOtherMonth == "both");
			var showPreviousMonth = (showOtherMonth == "previous" || showOtherMonth == "both");

			for (var w = 0; w < 6; w++) {

				for (var i = 0; i < 7; i++) {

					var dayIndex = w * 7 + i;
					var dayLabel = this.__dayLabelArr[dayIndex];
					var date = new Date(dayLabel.dateTime);

					if (this.calendar.isBoldedDate(date))
						dayLabel.addState("bolded");
					else
						dayLabel.removeState("bolded");

					// go to the next day.
					date.setDate(date.getDate() + 1);

					// hide show previous/next month.
					if (dayLabel.hasState("otherMonth")) {

						if (this._checkLimits(date) != 0) {
							dayLabel.hide();
						}
						else {
							if (dayIndex > 25)
								dayLabel.setVisibility(showNextMonth ? "visible" : "hidden");
							else
								dayLabel.setVisibility(showPreviousMonth ? "visible" : "hidden");
						}
					}
				}
			}
		}

	}

});


/**
 * wisej.web.monthCalendar.Today
 *
 * Shows today's date at the bottom of the new wisej.web.MonthCalendar control.
 */
qx.Class.define("wisej.web.monthCalendar.Today", {

	extend: qx.ui.basic.Atom

});