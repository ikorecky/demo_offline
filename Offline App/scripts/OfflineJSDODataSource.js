(function () {
    OfflineJSDODataSource = kendo.data.DataSource.extend({
        init: function (opts) {
            var that = this;

            opts = opts || {};
            opts = $.extend(true, that.options, { batch: true }, opts);

            var name = opts.name,
                idField = null,
                jsdo = that._createJSDO(name);

            $.each(progress.data.ServicesManager.getResource(name).schema.properties, function (name, ds) {
                $.each(ds.properties, function (name, tt) {
                    idField = tt.primaryKey[0];
                    return false;
                });
                return false;
            });

            opts = $.extend(true, {
                batch: true,
                transport: {
                    read: function (opts) {
                        return that.jsdo.offlineFill()
                            .done(function (jsdo) {
                                opts.success(jsdo.getData());
                            })
                            .fail(function () {
                                opts.error("jsdo.fill() failed");
                            })
                    },

                    update: function (opts) {
                        $.each(opts.data.models, function (idx, data) {
                            var rec = that.jsdo.findById(data._id);
                            rec.assign(data);
                        });

                        return that.jsdo.offlineSaveChanges()
                            .done(function () {
                                opts.success();
                            })
                            .fail(function () {
                                opts.error("jsdo.saveChanges() failed");
                            });
                    },

                    create: function (opts) {
                        opts.success();
                    },

                    destroy: function (opts) {
                        opts.success();
                    }
                },
                schema: {
                    model: {
                        id: idField
                    }
                }
            }, opts);

            kendo.data.DataSource.fn.init.call(that, opts);

            that.jsdo = jsdo;
            jsdo.dataSource = that;
        },

        _createJSDO: function (name) {
            var that = this,
                jsdo = new progress.data.JSDO({
                    name: name,
                    autoFill: false
                });

            jsdo.localStorageName = app.username + "-" + jsdo.name;

            jsdo.offlineFill = function (opts) {
                var that = this, deferred = $.Deferred();

                if (app.isConnected()) {
                    that.readLocal(that.localStorageName);
                    if (that.hasChanges()) {
                        that.offlineSaveChanges()
                            .done(doFill)
                            .fail(function() {
                                deferred.reject(that, false, null)
                            });
                    }
                    else {
                        doFill();
                    }
                }
                else {
                    that.readLocal(that.localStorageName);
                    deferred.resolve(that, true, null);
                }

                return deferred.promise();

                function doFill() {
                    that.fill(opts)
                        .done(function (jsdo, success, request) {
                            that.saveLocal(that.localStorageName);
                            deferred.resolve(jsdo, success, request);
                        })
                        .fail(function (jsdo, success, request) {
                            deferred.reject(jsdo, success, request);
                        });
                }
            };

            jsdo.offlineSaveChanges = function (submit) {
                var that = this, deferred = $.Deferred();

                that.saveLocal(that.localStorageName);

                if (app.isConnected()) {
                    app.onSync();

                    that.saveChanges()
                        .done(function (jsdo, success, request) {
                            that.saveLocal(that.localStorageName);
                            deferred.resolve(jsdo, success, request);
                            app.onSyncDone();
                        })
                        .fail(function (jsdo, success, request) {
                            deferred.reject(jsdo, success, request);
                            app.onSyncFail();
                        });
                }
                else {
                    deferred.resolve(that, true, null);
                }

                return deferred.promise();
            };

            return jsdo;
        }
    });
})();