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
                                opts.success();
                                deferred.resolve();
                            })
                            .fail(function (jsdo, success, request) {
                                opts.error();
                                deferred.reject();
                            })

                        return deferred;
                    },

                    update: function (opts) {
                        var deferred = $.Deferred();

                        $.each(opts.data.models, function (idx, data) {
                            var rec = that.jsdo.findById(data._id);
                            rec.assign(data);
                        });

                        that.jsdo.offlineSaveChanges()
                            .done(function (jsdo, success, request) {
                                opts.success();
                                deferred.resolve();
                            })
                            .fail(function (jsdo, success, request) {
                                opts.error();
                                deferred.reject();
                            });

                        return deferred;
                    },

                    create: function (opts) {
                        var deferred = $.Deferred();

                        $.each(opts.data.models, function (idx, data) {
                            that.jsdo.add(data);
                        });

                        that.jsdo.offlineSaveChanges()
                            .done(function (jsdo, success, request) {
                                opts.success();
                                deferred.resolve();
                            })
                            .fail(function (jsdo, success, request) {
                                opts.error();
                                deferred.reject();
                            });

                        return deferred;
                    },

                    destroy: function (opts) {
                        var deferred = $.Deferred();

                        $.each(opts.data.models, function (idx, data) {
                            var rec = that.jsdo.findById(data._id);
                            rec.remove();
                        });

                        that.jsdo.offlineSaveChanges()
                            .done(function (jsdo, success, request) {
                                opts.success();
                                deferred.resolve();
                            })
                            .fail(function (jsdo, success, request) {
                                opts.error();
                                deferred.reject();
                            });

                        return deferred;
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
                            that.dataSource.data(jsdo.getData());
                            deferred.resolve(jsdo, success, request);
                        })
                        .fail(function (jsdo, success, request) {
                            that.displayErrors();
                            that.offlineDeleteLocal();
                            that.dataSource.data([]);

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
                            that.dataSource.data(that.getData());

                            deferred.resolve(jsdo, success, request);
                        })
                        .fail(function (jsdo, success, request) {
                            that.displayErrors();
                            app.onSyncFail();

                            that.offlineRejectChanges();
                            that.dataSource.data(that.getData());
                            that.saveLocal(that.name);

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

            jsdo.displayErrors = function () {
                var that = this, msg = "";

                $.each(that.getErrors(), function (idx, error) {
                    msg += (msg !== "" ? ". " : "") + error.error;
                });

                navigator.notification.alert(msg);
            };

            return jsdo;
        }
    });
})();