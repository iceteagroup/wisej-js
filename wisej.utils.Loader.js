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
 * wisej.utils.Loader
 * 
 * Loader singleton. Loads user defined packages.
 */
qx.Class.define("wisej.utils.Loader", {

	type: "static",
	extend: qx.core.Object,

	statics: {

		// loader cache.
		__cache: {},

		/**
		 * load
		 *
		 * Loads the packages synchronously in the order they are defined.
		 *
		 * Each package has a unique name and a url: i.e. {id:"jQuery", url:"..."}.
		 *
		 * The callback method is invoked when all the packages are loaded, the function
		 * takes one result argument that receives the value "complete" or "error".
		 *
		 * @param packages {Array} array of package definitions.
		 * @param callback {Function(result)} callback function.
		 */
		load: function (packages, callback) {

			if (packages == null || packages.length == 0)
				return;

			var index = 0,
				errors = 0,
				list = packages,
				count = list.length;

			var loadClosure = function () {

				if (index >= count)
					return;

				var pkg = list[index];
				if (pkg && pkg.id && pkg.url) {

					wisej.utils.Loader.__load(pkg.id, pkg.url, function (result) {

						index++;
						if (result == "error")
							errors++;

						if (index >= count) {
							// done.
							if (callback)
								callback(errors > 0 ? "error" : "complete");
						}
						else if (errors == 0) {
							// load the next package.
							loadClosure();
						}

					});
				}
				else {
					// if the package is invalid, skip it and re-enter to
					// load the next.
					index++;
					loadClosure();
				}

			}

			// start by loading the first package.
			loadClosure();
		},

		/**
		 * Loads the specified script.
		 */
		__load: function (id, url, callback) {

			if (!id || !url)
				return;

			// retrieve the existing package with the same id.
			var cache = wisej.utils.Loader.__cache;
			var cachedPackage = cache[id];

			if (cachedPackage != null) {

				// if the package is loading: queue the callback call.
				// if the package is loaded: callback right away.
				if (callback) {
					var state = cachedPackage.getReadyState();
					if (state == "loading" || state == "initialized") {

						// async check closure.
						function packageClosure(cachedPackage, callback) {

							var timerId = setInterval(function () {

								var state = cachedPackage.getReadyState();
								if (state == "loading")
									return;

								clearInterval(timerId);

								if (callback)
									callback(state == "error" ? "error" : "cached");

							}, 100);
						}
						packageClosure(cachedPackage, callback);
					}
					else {
						callback(state == "error" ? "error" : "cached");
					}
				}

				return;
			}

			// load a css or a js?
			if (this.__isCss(url)) {

				var pkg = new qx.io.part.Package([url], id);
				cache[id] = pkg;

				qx.bom.Stylesheet.includeFile(url, document,

					// onload
					function () {
						pkg.__readyState = "cached";
						if (callback)
							callback("loaded");
					},

					// onerror
					function () {
						pkg.__readyState = "error";
						if (callback)
							callback("error");
					}
				);
			}
			else {

				var pkg = new qx.io.part.Package([url], id);
				cache[id] = pkg;

				pkg.load(function () {
					if (callback) {
						var state = this.getReadyState();
						callback(state == "error" ? "error" : "complete");
					}
				}, pkg);
			}
		},

		/**
		 * isLoading
		 *
		 * Returns true if the loader is busy loading any package.
		 */
		isLoading: function () {

			var packages = wisej.utils.Loader.__packages;
			if (packages == null)
				return false;

			for (var id in packages) {
				var pkg = packages[i];
				if (pkg.getReadyState() == "loading")
					return true;
			}

			return false;
		},

		/**
		 * Determines whether the URL is a css file.
		 *
		 * @param url {String} URL to check.
		 */
		__isCss: function (url) {

			if (!url)
				return false;

			url = url.toLowerCase();
			return qx.lang.String.endsWith(url, ".css") || url.indexOf(".css?") > -1;
		}
	}

});
