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
 * wisej.DataStore
 * 
 * Represents a remote data store.
 */
qx.Class.define("wisej.DataStore", {

	extend: qx.core.Object,

	construct: function (providerId) {

		this.base(arguments);

		this.__providerId = providerId;

	},

	members: {

		// the id of the server side data provider.
		__providerId: null,

		/**
		 * getRowCount
		 *
		 * Invokes the "datacount" service on the data provider server component.
		 * The expected response is a positive integer.
		 *
		 * @param callback(count) {Function} Called when the row count is retrieved.
		 * @param context {Object} Context for the callback.
		 * @return {Integer} The total number of rows available from the data source.
		 */
		getRowCount: function (callback, context) {

			// fire the remote request.
			this.__performDataRequest(

				WisejCore.ServiceType.dataCount, null /*args*/,

				// success.
				function (data) {

					if (callback && data != null) {
						callback.call(
							context,
							parseInt(data) || 0);
					}
				}
			);

		},

		/**
		 * getDataRows
		 *
		 * Invokes the "dataread" service on the data provider server component.
		 * The expected response is an array of rows.
		 *
		 * @param args {Map} A map of arguments that are passed to the data provider.
		 * @param callback(rows[]) {Function} Called when the data is received from the server.
		 * @param context {Object} Context for the callback.
		 * @return {[{Map}]} Array of row data. The format of each element depends on the data consumer.
		 */
		getDataRows: function (args, callback, context) {

			// fire the remote request.
			this.__performDataRequest(

				WisejCore.ServiceType.dataRead, args,

				// success.
				function (data) {

					if (callback && data != null) {

						callback.call(
							context,
							data);
					}
				}
			);

		},

		/**
		 * Performs the requested remote request.
		 */
		__performDataRequest: function (type, args, callback, context) {

			args = args || {};
			args.storeId = this.__providerId;

			if (!args.storeId)
				return;

			Wisej.Core.sendHttpRequest(

				// request type.
				type,

				// request arguments.
				args,

				// callback on success.
				function (actions) {

					if (actions && actions.length > 0) {
						for (var i = 0; i < actions.length; i++) {

							var action = actions[i];

							if (action && action.type === WisejCore.ActionType.data) {

								// found the data response!
								if (callback)
									callback.call(context, action.data);

								return;
							}
						}

						// if not found, still callback with en empty data set.
						if (callback)
							callback.call(context, null);
					}
				}
			);
		}
	}

});
