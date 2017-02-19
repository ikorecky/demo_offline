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
                        var deferred = $.Deferred();

                        that.jsdo.offlineFill()
                            .done(function (jsdo, success, request) {
                                opts.success(jsdo.getData());
                                deferred.resolve();
                            })
                            .fail(function (jsdo, success, request) {
                                displayErrors();
                                that.jsdo.offlineDeleteLocal();
                                that.data([]);

                                opts.error(jsdo.getData());
                                deferred.reject();
                            })

                        return deferred;
                    },

                    update: function (opts) {
                        $.each(opts.data.models, function (idx, data) {
                            var rec = that.jsdo.findById(data._id);
                            rec.assign(data);
                        });

                        return saveChanges(opts);
                    },

                    create: function (opts) {
                        $.each(opts.data.models, function (idx, data) {
                            that.jsdo.add(data);
                        });

                        return saveChanges(opts);
                    },

                    destroy: function (opts) {
                        $.each(opts.data.models, function (idx, data) {
                            var rec = that.jsdo.findById(data._id);
                            rec.remove();
                        });

                        return saveChanges(opts);
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

            function saveChanges(opts) {
                var deferred = $.Deferred();

                that.jsdo.offlineSaveChanges()
                    .done(function (jsdo, success, request) {
                        if (request) {
                            jsdo.dataSource.data(jsdo.getData());
                        }
                        opts.success();
                        deferred.resolve();
                    })
                    .fail(function (jsdo, success, request) {
                        displayErrors();
                        that.cancelChanges();
                        that.jsdo.offlineRejectChanges();
                        opts.error();
                        deferred.reject();
                    });

                return deferred;
            }

            function displayErrors() {
                var msg = "";

                $.each(that.jsdo.getErrors(), function (idx, error) {
                    msg = (msg !== "" ? "<br/>" : "") + error.error;
                });

                navigator.notification.alert(msg);
            }
        },

        _createJSDO: function (name) {
            var that = this,
                jsdo = new progress.data.JSDO({
                    name: name,
                    autoFill: false
                });

            jsdo.offlineFill = function (opts) {
                var that = this, deferred = $.Deferred();

                if (app.isConnected()) {
                    that.readLocal(that.name);
                    if (that.hasChanges()) {
                        that.offlineSaveChanges()
                            .done(doFill)
                            .fail(function () {
                                deferred.reject(that, false, null)
                            });
                    }
                    else {
                        doFill();
                    }
                }
                else {
                    that.readLocal(that.name);
                    deferred.resolve(that, true, null);
                }

                return deferred.promise();

                function doFill() {
                    that.fill(opts)
                        .done(function (jsdo, success, request) {
                            that.saveLocal(that.name);
                            deferred.resolve(jsdo, success, request);
                        })
                        .fail(function (jsdo, success, request) {
                            deferred.reject(jsdo, success, request);
                        });
                }
            };

            jsdo.offlineSaveChanges = function (submit) {
                var that = this, deferred = $.Deferred();

                that.saveLocal(that.name);

                if (app.isConnected()) {
                    app.onSync();

                    that.saveChanges()
                        .done(function (jsdo, success, request) {
                            app.onSyncDone();
                            that.saveLocal(that.name);
                            deferred.resolve(jsdo, success, request);
                        })
                        .fail(function (jsdo, success, request) {
                            app.onSyncFail();
                            deferred.reject(jsdo, success, request);
                        });
                }
                else {
                    deferred.resolve(that, true, null);
                }

                return deferred.promise();
            };

            jsdo.offlineRejectChanges = function () {
                var that = this;

                that.rejectChanges();
                that.saveLocal(that.name);
            };

            jsdo.offlineDeleteLocal = function () {
                var that = this;

                that.deleteLocal(that.name);
            };

            return jsdo;
        }
    });
})();