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

                        that.jsdo._offlineFill()
                            .done(function (jsdo, success, request) {
                                opts.success(jsdo.getData());
                                deferred.resolve();
                            })
                            .fail(function (jsdo, success, request) {
                                that.data([]);
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

                        that.jsdo._offlineSaveChanges()
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

                        that.jsdo._offlineSaveChanges()
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

                        that.jsdo._offlineSaveChanges()
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

        sync: function() {
            var that = this, deferred = $.Deferred();

            if (that.hasChanges()) {
                kendo.data.DataSource.fn.sync.call(that)
                    .done(function () {
                        deferred.resolve();
                        if (app.isConnected()) {
                            that.data(that.jsdo.getData());
                        }
                    })
                    .fail(function () {
                        deferred.reject();
                        that.data(that.jsdo.getData());
                    });
            }

            else
            if (that.jsdo.hasChanges()) {
                that.jsdo._offlineSaveChanges()
                    .done(function () {
                        deferred.resolve();
                        if (app.isConnected()) {
                            that.data(that.jsdo.getData());
                        }
                    })
                    .fail(function () {
                        deferred.reject();
                        that.data(that.jsdo.getData());
                    });
            }

            return deferred;
        },

        deleteOfflineData: function() {
            var that = this;

            that.jsdo._offlineDeleteLocal();
        },

        _createJSDO: function (name) {
            var that = this,
                jsdo = new progress.data.JSDO({
                    name: name,
                    autoFill: false
                });

            jsdo._offlineFill = function (opts) {
                var that = this, deferred = $.Deferred();

                if (app.isConnected()) {
                    that.readLocal(that.name);
                    if (that.hasChanges()) {
                        that._offlineSaveChanges()
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
                            that.displayErrors();
                            that._offlineDeleteLocal();
                            deferred.reject(jsdo, success, request);
                        });
                }
            };

            jsdo._offlineSaveChanges = function (submit) {
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
                            that.displayErrors();
                            app.onSyncFail();

                            that._offlineRejectChanges();
                            that.saveLocal(that.name);

                            deferred.reject(jsdo, success, request);
                        });
                }
                else {
                    deferred.resolve(that, true, null);
                }

                return deferred.promise();
            };

            jsdo._offlineRejectChanges = function () {
                var that = this;

                that.rejectChanges();
                that.saveLocal(that.name);
            };

            jsdo._offlineDeleteLocal = function () {
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